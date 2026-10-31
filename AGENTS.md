# AGENTS.md - Diario de Estudio

## Visión General
App web vanilla HTML/CSS/JS para registrar sesiones de estudio. Muestra racha actual, mejor racha, progreso semanal, días de estudio del mes y un mapa de calor de constancia con filtro por día. Los datos persisten en localStorage.

## Archivos Clave
- `index.html` - Estructura HTML principal (UI en español). Carga `logic.js` antes de `app.js`.
- `logic.js` - Funciones puras: fechas locales, rachas, estadísticas, mapa de calor, filtro y navegación. Sin DOM ni localStorage.
- `app.js` - Almacenamiento, referencias al DOM, renderizado y eventos de la interfaz.
- `styles.css` - Estilos con custom properties CSS, incluidos los 6 niveles del mapa y el modo oscuro.
- `tests/heatmap.test.js` - Tests del mapa, fechas, filtro y navegación.
- `tests/logic.test.js` - Regresión de rachas, semana y mes.
- `specs/001-heat-map/` - Spec, plan y checklist de la funcionalidad implementada.

## Ejecutar la App
Abre `index.html` directamente en el navegador. Sin build y sin servidor.

Tests: `node --test` desde la raíz. No hay `package.json` ni dependencias.

## Notas de Arquitectura
- **JS en dos archivos**: `logic.js` es un script clásico con exportación dual (global `StudyLogic` en navegador, `module.exports` en Node). `app.js` no duplica cálculos: consume `StudyLogic.*`.
- **Funciones puras**: Ninguna función de `logic.js` toca DOM ni almacenamiento. Todas las que dependen del tiempo reciben `today` explícito. `app.js` captura "hoy" una vez por `renderAll()`.
- **Fechas**: Siempre locales. Helpers canónicos: `parseLocalDate()`, `formatDateForInput()`, `addDays()`, `dayNumber()`, `daysBetween()`. Nunca uses `toISOString()` ni `new Date("AAAA-MM-DD")` para parsear.
- **Claves localStorage**: `study-diary-sessions` (array de `{ id, date, topic, minutes }`) y `study-diary-heatmap-range` (`4w`, `12w`, `26w`, `52w`, `year`; por defecto `12w`).
- **Datos corruptos**: Se conservan; se ignoran en cálculos y renderizado del mapa. Nunca se borran automáticamente.
- **Racha**: Días consecutivos con ≥1 sesión. Si hoy no hay sesión, revisa ayer; si tampoco, racha = 0. `calculateStreak(sessions, today)`.
- **Mejor racha**: Máxima secuencia histórica sobre fechas únicas. Se recalcula on-demand; no se persiste.
- **Semana**: Lunes-domingo, semana natural completa. **Mes**: Días únicos del 1 al último día del mes.
- **Mapa de calor**:
  - 5 presets: 4/12/26/52 semanas y año natural. El rango siempre termina hoy; no genera columnas futuras.
  - Escala logarítmica fija de 6 niveles (0–5) con referencia 480 min/día. No depende del máximo del rango.
  - Cuadrícula semántica de 7 filas (lun-dom) × N columnas (semanas). Las etiquetas de día quedan fuera del scroll horizontal.
  - Filtro por día en memoria: se activa con click, tap o Enter/Espacio; se limpia al cambiar de rango, guardar otra fecha o borrar la última sesión del día.
  - Tooltip único para ratón, foco y touch (primer toque previsualiza, segundo filtra).
  - Teclado: roving tabindex, flechas saltando relleno, Enter/Espacio, Escape.
- **Diseño**: **Sistema "Fichas de Estudio"** — Papel cálido (#FEFEF8), tinta profunda (#1A1A2E), **único acento: subrayador amarillo** (#FFF3B0/#FFE066). Tipografías: Syne (display/números), DM Sans (UI), JetBrains Mono (datos). Layout asimétrico; tarjetas con borde sutil; sin glassmorphism, blobs, emojis ni animaciones idle. Dark mode automático.

## Tareas Comunes

### Agregar una funcionalidad
1. Si hay cálculo, añádelo como función pura en `logic.js` y pruébalo primero con `node --test`.
2. En `app.js`, usa `loadSessions()` / `saveSessions()` para storage y llama a `renderAll()` tras mutaciones.
3. Escapa contenido de usuario con `escapeHtml()`.
4. No cambies el formato de las sesiones sin preguntar.

### Modificar rachas o estadísticas
Edita las funciones correspondientes en `logic.js` y actualiza `tests/logic.test.js`. No vuelvas a introducir lógica de fechas en `app.js`.

### Modificar el mapa de calor
La lógica de rango, escala, agregación y cuadrícula está en `logic.js` (`getHeatmapRange`, `getHeatmapLevel`, `aggregateMinutesByDay`, `buildHeatmapWeeks`, `calculateHeatmap`). El render y los eventos están en `app.js` (`renderHeatmap`, `activateCell`, `showTooltip`, `focusCell`). Los colores viven en `--heat-0`…`--heat-5` en `styles.css`, con sus valores de modo oscuro.

### Cambiar estilos
Edita las custom properties en `:root` y en el bloque `@media (prefers-color-scheme: dark)`. Mantén el amarillo como único acento y no añadas animaciones de entrada al mapa.

## Gotchas
- **Sin package.json / node_modules**: No busques scripts npm, linters ni typecheckers.
- **Tests**: `node --test` prueba solo `logic.js`; la interfaz se verifica manualmente en el navegador.
- **UI en español**: Todo el texto visible está en español (locale `es-ES` para fechas).
- **Solo localStorage**: Sin backend, sin exportar/importar.
- **file://**: No uses módulos ES ni `fetch` para cargar datos locales; romperían la apertura con doble clic.

## Comandos
- Tests: `node --test`
- Comprobar sintaxis: `node --check logic.js` y `node --check app.js`

## Reglas
- Lee `docs/constitution.md` y la spec activa (`specs/NNN-*/`) antes de tocar código.
- Tests primero, luego implementación; no se avanza con tests en rojo.
- Código en inglés; interfaz y documentación en español.

## Reglas de trabajo (para el agente)
- Siempre: respetar las reglas del proyecto.
- Siempre: actualizar `MEMORY.md` al terminar cada tarea.
- Preguntar antes: crear archivos nuevos o cambiar el formato de los datos.
- **Documentación**: Procesos importantes y reglas permanentes → `AGENTS.md`; contexto temporal, decisiones y errores a evitar → `MEMORY.md` (máx. ~60 líneas, limpiar lo obsoleto).

## Estructura de Archivos
```
TodoList/
├── index.html
├── logic.js
├── app.js
├── styles.css
├── AGENTS.md
├── MEMORY.md
├── docs/
│   └── constitution.md
├── specs/
│   └── 001-heat-map/
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
└── tests/
    ├── heatmap.test.js
    └── logic.test.js
```
