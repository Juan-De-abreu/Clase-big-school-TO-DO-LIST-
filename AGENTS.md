# AGENTS.md - Diario de Estudio

## Visión General
App web vanilla HTML/CSS/JS para registrar sesiones de estudio con contador de racha diaria. Los datos persisten en localStorage.

## Archivos Clave
- `index.html` - Estructura HTML principal (UI en español)
- `app.js` - Toda la lógica de la app (storage, cálculo de racha, renderizado)
- `styles.css` - Estilos con custom properties CSS

## Ejecutar la App
Abre `index.html` directamente en el navegador. Sin build, sin servidor.

## Notas de Arquitectura
- **JS en un solo archivo**: Toda la lógica en `app.js` (~280 líneas). Sin módulos/bundler.
- **Clave localStorage**: `study-diary-sessions`
- **Manejo de fechas**: Usa fechas locales (sin conversión de zona horaria). `parseLocalDate()` / `formatDateForInput()` son los helpers canónicos.
- **Lógica de racha**: Cuenta días consecutivos con ≥1 sesión. Si hoy no hay sesión, revisa ayer; si ninguno, racha = 0.
- **Mejor racha (best streak)**: Máxima secuencia consecutiva histórica. Se recalcula on-demand desde `localStorage` via `calculateBestStreak()` (O(n) sobre fechas únicas). No se persiste aparte.
- **Total semanal**: Progress bar (meta 10h/semana). `calculateWeeklyMinutes()` filtra lunes-domingo. `renderWeekly()` actualiza barra + textos. `renderWeekly()` llamado en `renderAll()`.
- **Total mensual**: Contador días únicos día 1–último día. `calculateMonthlyStudyDays()` + `renderMonthly()` en `renderAll()`.
- **Diseño**: **Sistema "Fichas de Estudio"** — Papel cálido (#FEFEF8), tinta profunda (#1A1A2E), **único acento: subrayador amarillo** (#FFF3B0/#FFE066). Tipografías: Syne (display/números), DM Sans (UI), JetBrains Mono (datos). Layout asimétrico hero (número grande izq, stats der). Tarjetas con borde sutil, sin glassmorphism. Motion solo en acción (guardar → slide-in, barra progreso). Sin blobs, sin emojis, sin personajes animados. Dark mode automático. Fuentes: Syne, DM Sans, JetBrains Mono (Google Fonts).

## Tareas Comunes

### Agregar una funcionalidad
Edita `app.js` directamente. Sigue los patrones existentes:
- Usa `loadSessions()` / `saveSessions()` para storage
- Llama a `renderAll()` tras mutaciones
- Escapa contenido de usuario con `escapeHtml()`

### Modificar el cálculo de racha
Ver `calculateStreak()` (líneas 59-86) y `calculateBestStreak()` (líneas 88-108). Ambas operan solo sobre fechas únicas de sesión (una sesión por día cuenta).

### Cambiar estilos
Edita las custom properties en `:root` (líneas 7-22) para colores/espaciado. Clases estilo BEM.

## Gotchas
- **Sin package.json / node_modules**: No busques scripts npm, linters ni typecheckers.
- **Sin tests**: Verificación manual en navegador únicamente.
- **UI en español**: Todo el texto visible está en español (locale `es-ES` para fechas).
- **Solo localStorage**: Sin backend, sin exportar/importar aún.
## Comandos
- Tests: `node --test`
## Reglas
- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código. 
## Reglas de trabajo (para el agente)
- Siempre: respetar las reglas del proyecto.
- Siempre: actualizar `MEMORY.md` al terminar cada tarea.
- Preguntar antes: crear archivos nuevos o cambiar el formato de los datos.
- **Documentación**: Procesos importantes y reglas permanentes → `AGENTS.md`; contexto temporal, decisiones y errores a evitar → `MEMORY.md` (máx. ~60 líneas, limpiar lo obsoleto).

## Estructura de Archivos (plana)
```
TodoList/
├── index.html
├── app.js
├── styles.css
└── AGENTS.md
```