import { supabase } from "@/lib/supabase/client"
import { isoATexto, textoAISO } from "@/lib/fechas"
import type { FindingPreview } from "./finding-card"
import {
  FINDING_DEADLINES,
  isoWeek,
  MAX_FINDING_DESCRIPTION_LENGTH,
  MAX_FINDING_IMAGES,
  MAX_FINDING_TITLE_LENGTH,
  type FindingDeadline,
  type FindingStatus,
} from "./finding-constraints"
import { isCompletionEvidenceFile, isFindingImageFile } from "./finding-file-types"

const BUCKET = "safety-findings"

type FindingRow = {
  id: string
  title: string
  description: string
  department: string
  responsible: string
  status: FindingStatus
  deadline: FindingDeadline | null
  finding_date: string
  evidence_paths: string[]
  completion_evidence_paths: string[]
}

function toIsoDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return textoAISO(value) ?? value
}

/** Lo necesario para contar hallazgos (indicadores): sin imágenes ni URLs firmadas. */
export type FindingSummary = Pick<FindingPreview, "area" | "status" | "deadline" | "date">

export async function loadFindingSummaries(): Promise<FindingSummary[]> {
  const { data, error } = await supabase.from("safety_findings").select("department,status,deadline,finding_date")
  if (error) throw error
  return (data ?? []).map(row => ({
    area: row.department as string,
    status: row.status as FindingPreview["status"],
    deadline: row.deadline as FindingPreview["deadline"],
    date: isoATexto(row.finding_date as string),
  }))
}

export async function loadFindings(): Promise<FindingPreview[]> {
  const { data, error } = await supabase.from("safety_findings")
    .select("id,title,description,department,responsible,status,deadline,finding_date,evidence_paths,completion_evidence_paths")
    .order("finding_date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw error

  return Promise.all(((data ?? []) as FindingRow[]).map(async (row) => {
    const signPath = async (path: string) => {
      const { data: signed, error: signError } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
      if (signError || !signed?.signedUrl) {
        console.warn("No se pudo firmar evidencia de Safe Walk:", path, signError)
        return ""
      }
      return signed.signedUrl
    }
    const [rawUrls, completionUrls] = await Promise.all([
      Promise.all(row.evidence_paths.map(signPath)),
      Promise.all(row.completion_evidence_paths.map(signPath)),
    ])
    const urls = rawUrls.filter(Boolean)
    const [year] = row.finding_date.split("-")
    return {
      id: row.id,
      week: isoWeek(row.finding_date),
      year: Number(year),
      title: row.title,
      description: row.description,
      area: row.department,
      responsible: row.responsible,
      date: isoATexto(row.finding_date),
      status: row.status,
      deadline: row.deadline,
      src: urls[0] ?? "",
      evidences: urls,
      alt: row.title,
      evidencePaths: row.evidence_paths,
      completionEvidencePaths: row.completion_evidence_paths,
      completionEvidences: completionUrls,
    }
  }))
}

export async function updateFinding(finding: FindingPreview): Promise<void> {
  if (finding.title.trim().length > MAX_FINDING_TITLE_LENGTH) throw new Error("Título demasiado largo")
  if (finding.description.length > MAX_FINDING_DESCRIPTION_LENGTH) throw new Error("Descripción demasiado larga")
  if (finding.deadline && !FINDING_DEADLINES.includes(finding.deadline)) throw new Error("Plazo no válido")
  const { data, error } = await supabase.from("safety_findings").update({
    title: finding.title,
    description: finding.description,
    department: finding.area,
    responsible: finding.responsible,
    status: finding.status,
    deadline: finding.deadline,
    finding_date: toIsoDate(finding.date),
  }).eq("id", finding.id).select("id").single()
  if (error || !data) throw error ?? new Error("No se pudo actualizar el hallazgo.")
}

export async function addCompletionEvidence(finding: FindingPreview, files: File[]): Promise<void> {
  if (!files.length || files.length > MAX_FINDING_IMAGES) throw new Error("Cantidad de imágenes no válida")
  if (!files.every(isCompletionEvidenceFile)) throw new Error("Solo se permiten imágenes o PDF")
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError ?? new Error("Inicia sesión para agregar evidencia.")
  const paths: string[] = []
  try {
    const { data: current, error: readError } = await supabase.from("safety_findings")
      .select("completion_evidence_paths").eq("id", finding.id).single()
    if (readError) throw readError
    const existingPaths = current.completion_evidence_paths
    if (existingPaths.length + files.length > MAX_FINDING_IMAGES) throw new Error("Demasiadas evidencias de cumplimiento")
    for (const file of files) {
      const path = `${userData.user.id}/${finding.id}/completion/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
      if (error) throw error
      paths.push(path)
    }
    const { data, error } = await supabase.from("safety_findings")
      .update({ completion_evidence_paths: [...existingPaths, ...paths] })
      .eq("id", finding.id).select("id").single()
    if (error || !data) throw error ?? new Error("No se pudo actualizar el hallazgo.")
  } catch (error) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    throw error
  }
}

export async function deleteFinding(finding: FindingPreview): Promise<void> {
  const { data, error } = await supabase.from("safety_findings")
    .delete().eq("id", finding.id).select("id").single()
  if (error || !data) throw error ?? new Error("No se pudo borrar el hallazgo.")
  const allPaths = [...finding.evidencePaths, ...finding.completionEvidencePaths]
  if (allPaths.length) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(allPaths)
    if (storageError) console.error("No se pudieron borrar las evidencias del hallazgo.", storageError)
  }
}

export async function createFinding(input: Omit<FindingPreview, "id" | "src" | "evidences" | "evidencePaths" | "completionEvidencePaths" | "completionEvidences" | "alt" | "week" | "year">, files: File[]): Promise<void> {
  if (input.title.trim().length > MAX_FINDING_TITLE_LENGTH) throw new Error("Título demasiado largo")
  if (input.description.length > MAX_FINDING_DESCRIPTION_LENGTH) throw new Error("Descripción demasiado larga")
  if (!input.deadline || !FINDING_DEADLINES.includes(input.deadline)) throw new Error("Plazo no válido")
  if (files.length < 1 || files.length > MAX_FINDING_IMAGES) throw new Error("Cantidad de imágenes no válida")
  if (!files.every(isFindingImageFile)) throw new Error("Solo se permiten imágenes del hallazgo")
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) throw userError ?? new Error("Inicia sesión para crear hallazgos.")
  const findingId = crypto.randomUUID()
  const paths: string[] = []
  try {
    for (const file of files) {
      const path = `${userData.user.id}/${findingId}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
      if (error) throw error
      paths.push(path)
    }
    const { error } = await supabase.from("safety_findings").insert({
      id: findingId,
      title: input.title,
      description: input.description,
      department: input.area,
      responsible: input.responsible,
      status: input.status,
      deadline: input.deadline,
      finding_date: toIsoDate(input.date),
      evidence_paths: paths,
      created_by: userData.user.id,
    })
    if (error) throw error
  } catch (error) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    throw error
  }
}
