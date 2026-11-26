AGENTS.md
Guía operativa para agentes de código (Claude Code, Cursor, Copilot, etc.) que trabajen en el proyecto ViñoPlastic. Léela completa antes de generar o modificar código. El documento de referencia visual completo vive en design.md.

Importante leer las skill de .agents / .claude / .codex , segun aplique al modelo de IA en uso.

1. Contexto del proyecto
ViñoPlastic es una aplicación web construida sobre el sistema de diseño Ubuntu / Vercel-like documentado en design.md. Se compone de dos superficies:

Marketing (home, pricing, customers, AI Gateway): hero con mesh gradient, grids de cards con hairline, bandas CTA.

App autenticada (workspace): panel elevado con sidebar, header sticky, data grids, formularios y evaluaciones.

Marketing conserva la estética ink-on-white: casi todo es neutro, un solo gradiente decorativo, tipografía apretada y bordes de 1px. El workspace ofrece las paletas clara y oscura definidas abajo; conserva sus colores semánticos para acciones y estados.

Override aplicado en ViñoPlastic: la aplicación tiene paletas de tema claro y oscuro. El --primary es azul: #0070f3 en claro y #3d9bff en oscuro; acciones y estados seleccionados usan el token del tema. Los botones de marketing tipo pill conservan el color de tinta neutra del tema.
La preferencia de tema admite claro, oscuro y sistema. Sistema sigue la preferencia de color del dispositivo y se aplica antes de hidratar; si cambia mientras está seleccionado, la interfaz se actualiza sin reemplazar esa preferencia.

2. Stack esperado
Asume y respeta lo siguiente (verifica en package.json antes de introducir algo distinto):

Next.js (App Router) + React + TypeScript

Tailwind CSS con tokens mapeados en tailwind.config.ts / globals.css vía CSS variables

Ubuntu (Ubuntu Font Licence) — se carga con next/font/google en lib/fonts.ts, que la descarga al compilar y la sirve desde la app

Pesos: texto normal 400, labels 500 y encabezados 700 (Ubuntu no tiene 600).

Inter autohospedada (SIL Open Font License) se reserva para formatos imprimibles y PDF; la interfaz conserva Ubuntu.

Componentes UI tipo shadcn/ui permitidos, pero re-estilizados con los tokens de este archivo

Iconografía: lucide-react (línea fina, coherente con el trazo "ink-on-white")

Si el proyecto difiere de esto, pregunta antes de añadir dependencias nuevas.

3. Tokens (valores canónicos)
3.1 Color
css
/* Tema claro */
--background:        #f4f5f7;
--foreground:        #14171c;
--card:              #ffffff;
--popover:           #ffffff;
--primary:           #0070f3;
--primary-foreground:#ffffff;
--secondary:         #e4e7ec;
--muted:             #eceef1;
--muted-foreground:  #3a4250;
--accent:            #e4e7ec;
--accent-foreground: #14171c;
--destructive:       #8f1d1d;
--border:            #c9ced6;
--input:             #7a8494;
--ring:              var(--muted-foreground);
--sidebar:           var(--background);
--chart-1:           #2a9d90;
--chart-2:           #0070f3;
--chart-3:           #f5a524;
--chart-4:           #7c51c8;
--chart-5:           #d4356a;
--sidebar-foreground:var(--foreground);
--sidebar-primary:   #0070f3;
--sidebar-primary-foreground: #ffffff;
--sidebar-accent:    #e4e7ec;
--sidebar-accent-foreground: #14171c;
--sidebar-border:    #c9ced6;
--sidebar-ring:      var(--ring);
--success:           #0070f3;
--warning:           #f5a623;

/* Tema oscuro */
--background:        #121418;
--foreground:        #eceff3;
--card:              #1a1d23;
--popover:           #1a1d23;
--primary:           #3d9bff;
--primary-foreground:#131313;
--secondary:         #262b33;
--muted:             #20242b;
--muted-foreground:  #b8c0cc;
--accent:            #262b33;
--accent-foreground: #eceff3;
--destructive:       #ff9b9b;
--border:            #363c46;
--input:             #7d8798;
--ring:              var(--muted-foreground);
--sidebar:           var(--background);
--chart-1:           #39c6b3;
--chart-2:           #3d9bff;
--chart-3:           #f6ae31;
--chart-4:           #ac86ea;
--chart-5:           #eb7099;
--sidebar-foreground:var(--foreground);
--sidebar-primary:   #3d9bff;
--sidebar-primary-foreground: #131313;
--sidebar-accent:    #262b33;
--sidebar-accent-foreground: #eceff3;
--sidebar-border:    #363c46;
--sidebar-ring:      var(--ring);

/* Links / acento */
--link:              #0070f3;
--link-deep:         #0761d1;
--link-soft:         #d3e5ff;

/* Acentos de ilustración (uso mínimo, nunca como chrome) */
--violet:            #7928ca;
--cyan:              #50e3c2;
--pink:              #ff0080;
--magenta:           #eb367f;

/* Semánticos */
--error:             #ee0000;
--error-deep:        #c50000;
--warning:           #f5a623;
--success:           #0070f3;   /* el azul dobla como positivo */

/* Gradiente de marca (solo hero / ilustraciones) */
--gradient-develop-start:  #007cf0;
--gradient-develop-end:    #00dfd8;
--gradient-preview-start:  #7928ca;
--gradient-preview-end:    #ff0080;
--gradient-ship-start:     #ff4d4d;
--gradient-ship-end:       #f9cb28;
3.2 Tipografía
Token	Size	Weight	Line Height	Letter Spacing	Uso
display-2xl	56px	700	56px	-1.4px	Titular del login en pantallas grandes
display-xl	48px	700	48px	-0.96px	Hero H1
heading-xl	32px	700	40px	-0.48px	Secciones mayores
heading-lg	24px	700	32px	-0.24px	Titular del login en móvil, títulos grandes
heading-md	20px	700	28px	0	Subsecciones / card headings
label-sm	15px	500	22px	0	Labels fuertes, nav emphasis
eyebrow	13px	500	18px	0	Eyebrows uppercase en Ubuntu
body-lg	17px	400	26px	0	Párrafos lead
body-md	15px	400	22px	0	Body default, nav, tablas
body-sm	13px	400	18px	0	Captions, metadata
button-lg	17px	500	22px	0	Pills de marketing
button-md	15px	500	22px	0	Botones nav/app
code	15px	400	22px	0	Código en Ubuntu
Reglas tipográficas no negociables:

Display y headings en 700. Tracking negativo leve solo desde 24px (más negativo cuanto más grande); de 20px hacia abajo, 0. Usa solo los tokens de la escala: nada de text-xs/sm/base/lg/xl, text-[Npx] ni tamaños en línea, y nada por debajo de 13px. Body y labels van 1px arriba de 12/14/16 porque Ubuntu tiene una altura x pequeña.

Body siempre 400, sin tracking.

No existe peso 300 ni 800/900, ni itálicas. No los uses.

Ubuntu es la familia tipográfica de la interfaz, incluido el código. Los formatos imprimibles y PDF usan Inter.

3.3 Espaciado
Base 4px. Escala: 4 · 8 · 12 · 16 · 24 · 32 · 40 · 64 · 96 · 128.

Interiores de card: 24–32px.

Bandas de sección: 96–128px vertical.

Botones: solo padding horizontal, altura por line-height (nunca vertical padding).

3.4 Radios
Token	Valor	Uso
none	0	Bandas full-bleed, divisores
sm	6px	Botones nav/app, inputs
md	12px	Feature cards, code blocks
lg	16px	Pricing cards, paneles
pill-category	64px	Tabs de categoría
pill	100px	CTAs de marketing
full	9999px	Solo avatares circulares
Bimodal: 6px cuadrado para chrome funcional, pill para marketing y tabs, 12–16px para contenido. No uses full en botones, badges ni navegación; avatares son la única excepción. No inventes radios intermedios.

3.5 Elevación
Nivel	Tratamiento	Uso
0 — Flat	1px solid var(--hairline), sin sombra	Default en cards, inputs, divisores
1 — Whisper	Hairline + 0 1px 1px rgba(0,0,0,0.04)	Cards ligeramente elevadas
2 — Floating	0 2px 2px rgba(0,0,0,0.04), 0 8px 16px -4px rgba(0,0,0,0.06) + inset hairline	Menús, modales, tooltips
Flat es el default. Una sombra pesada es un bug de diseño.

3.6 Layout
Contenedor centrado ~1200px con gutters.

Workspace autenticado: max-width: 1536px.

Resumen de evaluación pendiente: max-width: 960px, centrado dentro del workspace.

Gutters del workspace: 16px móvil → 24px tablet → 32px laptop+.

Frame del workspace: en login, panel canvas-elevated con hairline de 1px y radio 12px. En el workspace autenticado, sidebar y header van directo sobre el lienzo (canvas-elevated), sin divisor entre ellos; el main es un panel hundido a su derecha y bajo el header, con el fondo del tema (canvas), hairline de 1px y radio 12px, y es el que hace scroll. Margen exterior de 16px en tablet y 24px en laptop/desktop, sin sombra. En móvil todo es full-bleed sin borde ni radio y el header conserva su línea inferior.

Sidebar: 44px mínimo de hit area; ruta activa con fondo blanco y borde visible. Sin divisores. Orden fijo definido en lib/navigation.ts: rutas sueltas arriba (Inicio, Kanban) y después grupos colapsables (Desempeño, Capacitación, Motivacional) con título en eyebrow uppercase y chevron, y rutas en orden alfabético dentro de cada grupo; cada grupo recuerda si quedó abierto o cerrado, el de la ruta activa se abre al entrar y un grupo sin rutas visibles para el rol no se muestra. En desktop, viewport-bound con scroll en el main; se oculta por completo con un botón de ícono en el header, antes del título, y la preferencia persiste entre rutas; las vistas sin header en escritorio (evaluador) siempre la muestran. Arriba muestra el ícono del sistema y el espacio de trabajo actual (Capacitación, Seguridad e Higiene o, para el evaluador, Desempeño); los nombres largos pasan a dos renglones, no se recortan. El drawer móvil conserva su marca y permanece expandido. Usa radio de 6px en links y controles; no uses rounded-full.

Header: altura de 48px; comparte grid y gutters con el main; título a la izquierda, cuenta a la derecha. Controles con 44px mínimo.

Notices flotantes: bottom-right en desktop, top-center en móvil, respetando safe areas.

3.7 Breakpoints
Nombre	Ancho	Cambios
Mobile	≤ 640px	Stacks 1 col; nav → menú; hero type scaling down; pills full-width
Tablet	768px	Grids 2-up; nav condensada
Laptop	1024px	Grids 3–4-up; nav completa
Desktop	1200px+	Contenedor centrado max-width, grids completos
4. Componentes — API canónica
Al crear o modificar componentes, usa estos nombres y variantes. No inventes variantes nuevas sin justificarlas.

Botones
Componente	Apariencia	Cuándo
ButtonPrimary (pill)	Fondo var(--ink), texto blanco, radius: 100px, padding 0 14px, button-lg	CTAs de marketing ("Start Deploying", "Deploy")
ButtonSecondary (pill)	Fondo canvas-elevated, texto ink, hairline, radius: 100px, button-lg	CTA secundaria de marketing ("Get a Demo")
ButtonPrimarySm	Fondo --primary (grafito del tema), texto de alto contraste, radius: 6px, button-md	CTA compacto de nav/app ("Sign Up")
ButtonGhostSm	Fondo canvas-elevated, texto ink, hairline, radius: 6px, button-md	Secundario en nav/app ("Log In", "Ask AI")
ButtonCategoryPill	Fondo canvas-elevated, texto ink, radius: 64px, button-md	Tabs de categoría
ButtonIcon	Fondo canvas-elevated, texto ink, hairline, radius: 6px	Controles de icono funcionales
Regla dura: marketing = pill neutro de tinta. Nav/app = cuadrado 6px grafito (--primary). No mezcles las dos formas en el mismo contexto.

Inputs
TextInput: fondo canvas-elevated, texto ink, 1px solid var(--hairline), radius: 6px, padding 8px 12px, body-md.

Focus: outline: 2px solid var(--ring) (muted-foreground); outline-offset: 2px; — nunca box-shadow de glow. Es una sola regla en app/globals.css; los componentes no declaran su foco, solo usan .focus-inset cuando su contenedor recorta el contorno.

Cards
FeatureCard: canvas-elevated, hairline, radius: 12px, padding 24px, body-md.

FeatureCardElevated: igual + sombra nivel 2.

PricingCard: canvas-elevated, hairline, radius: 16px, padding 32px.

CodeBlock: canvas-elevated, hairline, radius: 12px, padding 16px, Ubuntu code.

Bands
HeroBand: fondo canvas + mesh gradient (CSS/SVG), texto ink, display-xl, padding 128px 24px.

LogoStrip: fondo canvas, texto mute, padding 32px 24px, wordmarks en greyscale.

CtaBand: fondo canvas, texto ink, display-xl, padding 96px 24px, con ButtonPrimary.

Footer: fondo canvas, top hairline, texto body, padding 64px 24px, columnas de links.

Navegación
NavBar: fondo canvas, bottom hairline, texto body, padding 12px 24px. Wordmark negro + ghost links + ButtonPrimarySm / ButtonGhostSm.

NavLink: body, body-md, radius: 6px, padding 8px 12px, transparente hasta interacción.

5. Reglas de oro (Do / Don't)
✅ Haz
Canvas near-white + ink near-black. Todo el chrome neutro sale de la ladder ink → body → mute → faint.

Color solo en dos sitios: hero mesh gradient + acentos de ilustración. Nada más.

Reutiliza los dos shapes de botón por contexto (pill marketing / 6px app).

1px hairline antes que cualquier sombra. Flat por defecto.

Display con tracking negativo leve. Ubuntu 700.

Eyebrows en Ubuntu uppercase para introducir secciones.

Respeta la ladder de grises al elegir color de texto.

Usa tokens CSS variables (var(--ink), var(--primary), etc.) — nunca hardcodees hex en el JSX/servidor.

❌ No hagas
En marketing, no rellenes superficies grandes con violeta/cyan/pink/azul — viven en el gradiente y en ilustraciones. En el workspace, usa solo las superficies de la paleta activa y reserva el primario para acciones y estados seleccionados.

No mezcles shapes de botón en un mismo contexto.

No apiles sombras. Hairline + (como máximo) una sombra fina en capas.

En marketing, no uses #000000: la tinta es #171717 y el body es #4d4d4d. En el workspace, usa el foreground de la paleta activa.

No añadas un segundo sistema decorativo. Excepción aprobada: login y selección de workspace comparten Ink Ridges con los colores neutros del tema; no lo extiendas al chrome ni a otras rutas.

No agregues tracking negativo a textos menores de 24px.

No declares ni cargues familias tipográficas distintas de Ubuntu en la interfaz; los formatos imprimibles y PDF usan Inter.

No introduzcas pesos tipográficos nuevos (light/black/italic).

No cargues Ubuntu con <link> ni desde una API en tiempo de ejecución; usa solo lib/fonts.ts (next/font).

No uses --primary para texto largo ni para fills decorativos. Solo acciones primarias y estados seleccionados.

6. Accesibilidad
Hit area mínimo 44×44px en todo control interactivo (botones, nav, icon buttons). En pills y 6px se consigue vía line-height + min-height, nunca con padding vertical que rompa la regla de "padding solo horizontal".

Focus visible siempre: outline: 2px solid var(--ring); outline-offset: 2px; definido una sola vez en app/globals.css. No elimines el outline ni agregues clases de foco por componente.

Contraste: usa los tokens foreground/muted-foreground del tema activo y verifica AA en cada superficie. muted-foreground se reserva para texto secundario.

Iconos decorativos: aria-hidden="true". Iconos con función: aria-label obligatorio.

Botones de solo icono: aria-label no negociable.

7. Convenciones de código
Estructura
text
/app                      → rutas Next.js (App Router)
  /(marketing)            → grupo de marketing
  /(app)                  → grupo autenticado
/components
  /ui                     → componentes base (Button, Input, Card, …)
  /marketing              → NavBar, HeroBand, CtaBand, Footer, …
  /app                    → WorkspaceFrame, Sidebar, Header, …
/lib
  /tokens                 → opcional: exporta constantes TS de los tokens
/styles
  globals.css             → CSS variables + base
Reglas de estilo
No hardcodees hex en componentes. Usa siempre var(--token) o la clase Tailwind mapeada (ej. bg-canvas, text-ink, border-hairline).

No crees clases utilitarias ad-hoc para colores; si falta un token, agrégalo en globals.css y en tailwind.config.ts, no lo inventes inline.

Componentes presentacionales no deben importar lógica de negocio; los datos llegan por props.

Server Components por defecto; "use client" solo cuando haya estado, efectos o handlers.

Tipado estricto: no any implícito. Si el tipo es desconocido, usa unknown y refina.

No introduzcas librerías de UI completas (MUI, Chakra, Ant, etc.) — romperían el sistema.

Naming
Componentes: PascalCase. Archivos de componente: PascalCase.tsx. Utilidades: kebab-case.ts.

Props: camelCase. Booleanos con prefijo is/has/should.

Variantes de componentes: prop variant con union literal ("primary" | "ghost" | …).

8. Antes de dar una tarea por terminada
Checklist rápida — el agente debe verificarla:

□ ¿Las superficies usan los tokens del tema activo (background, card, popover)?
□ ¿Los textos siguen la ladder ink → body → mute → faint?
□ ¿Los botones usan el shape correcto según contexto (pill vs 6px)?
□ ¿Las cards tienen hairline de 1px y, como mucho, sombra whisper/floating?
□ ¿Los headings usan Ubuntu 700 y los tokens de la escala (sin tamaños escritos a mano)?
□ ¿Los textos, etiquetas y código usan Ubuntu?
□ ¿Marketing reserva el color para el hero y las ilustraciones, y el workspace usa solo la paleta activa?
□ ¿Los controles interactivos tienen ≥44px de hit area?
□ ¿El focus es visible y sale de la regla única de globals.css (--ring, sin clases propias)?
□ ¿Los colores salen de var(--token), no de hex hardcodeado?
□ ¿Compila (pnpm build / npm run build) y pasa lint?
9. Cuándo preguntar en vez de asumir
Detente y pregunta al humano si:

El cambio requiere una nueva variante de componente no listada en la sección 4.

El cambio requiere un color, peso tipográfico o radio nuevo no documentado.

El cambio pide una sombra más fuerte que "floating".

El cambio sugiere un segundo sistema decorativo (ilustraciones raster, glows, blur decorativo).

El cambio va a introducir una dependencia de UI (MUI, Chakra, Ant, etc.).

El cambio contradice alguna regla de la sección 5.

En caso de duda: menos es más. El sistema Ubuntu es un ejercicio de resta. El agente debe restar antes que añadir.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
- People: `antislop-human`: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.agents/skills/antislop-code/SKILL.md`
- Copy & text: `antislop-copywriting`: `.agents/skills/antislop-copywriting/SKILL.md`
- UI / visual: `antislop-ui`: `.agents/skills/antislop-ui/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->
