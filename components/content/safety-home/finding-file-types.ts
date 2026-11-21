const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const IMAGE_EXTENSION = /\.(jpe?g|png|webp)$/i

export function isPdfPath(path: string): boolean {
  return /\.pdf$/i.test(path)
}

export function isFindingImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.has(file.type) && IMAGE_EXTENSION.test(file.name)
}

export function isCompletionEvidenceFile(file: File): boolean {
  return isFindingImageFile(file) || (file.type === "application/pdf" && isPdfPath(file.name))
}
