# Tareas — Mapa de Calor (001-heat-map)

Orden de dependencia. Cada tarea es ≤ 30 min. No se avanza con la puerta de tests en rojo.
Base: `spec.md` y `plan.md`. [RF] indica los requisitos cubiertos.

---

## Fase 1 — Lógica pura (test-first)

- [x] **T1. Esqueleto de `logic.js` con exportación dual** [Constitución 1, 3]
  Crear `logic.js` con el patrón UMD (global en navegador, `module.exports` en Node) y cargarlo antes de `app.js` en `index.html`.
  **Hecho cuando:** abrir `index.html` no da error en consola y `require('logic.js')` en Node devuelve un objeto.

- [x] **T2. Tests y funciones de fechas locales** [RF-1, RF-3]
  `parseLocalDate` (devuelve `null` si inválida), `formatDateForInput`, `addDays`, `startOfWeek`, `dayNumber`, `daysBetween`. Tests en `tests/heatmap.test.js`.
  **Hecho cuando:** `node --test tests/heatmap.test.js` pasa para ida/vuelta de clave, 29 feb válido e inválido, y cambio de mes/año sin desplazamiento UTC.

- [x] **T3. Formateo de fechas para mostrar** [RF-5, RF-8]
  `formatDateForDisplay` (corto, es-ES) y `formatDateForAccessibleLabel` (largo con año).
  **Hecho cuando:** los tests de T2 siguen verdes y cubren que el texto accesible incluye el año.

- [x] **T4. Regresión: rachas y estadísticas existentes** [Constitución 3]
  Mover a `logic.js` `getWeekRange`, `getMonthRange`, `calculateStreak(sessions, today)`, `calculateBestStreak`, `calculateWeeklyMinutes(sessions, today)`, `calculateMonthlyStudyDays(sessions, today)`, `sortSessionsByDateDesc`, `formatHoursMinutes`. Tests en `tests/logic.test.js` con `today` explícito (hoy = miércoles 7 oct 2026).
  **Hecho cuando:** `node --test tests/logic.test.js` pasa con racha 3 para hoy/ayer/anteayer, semana lunes-domingo y mes natural.

- [x] **T5. Escala logarítmica** [RF-2]
  `getHeatmapLevel` con referencia fija 480.
  **Hecho cuando:** tests de límites (0, 1, 4, 60, 120, 479, 480, 5000, negativo, `NaN`) devuelven (0, 1, 2, 3, 4, 4, 5, 5, 0, 0).

- [x] **T6. Normalización de preset** [RF-4]
  `normalizeHeatmapPreset` y `weeksForPreset`.
  **Hecho cuando:** los 5 valores válidos se conservan y `8w`/vacío/nulo/número caen en `12w`.

- [x] **T7. Rango del mapa** [RF-3]
  `getHeatmapRange(preset, today)`.
  **Hecho cuando:** con hoy 7 oct 2026, los inicios son 14 sep, 20 jul, 13 abr, 13 oct 2025 y 1 ene 2026; fin siempre hoy; 4 sem da exactamente 4 columnas.

- [x] **T8. Agregación por día** [RF-1]
  `aggregateMinutesByDay(sessions, start, end)`.
  **Hecho cuando:** 3 sesiones de 30+45+60 en un día suman 135; fechas futuras, fuera de rango, inválidas o minutos no finitos/≤0 se ignoran; las sesiones no se mutan.

- [x] **T9. Cuadrícula de semanas** [RF-1, RF-3]
  `buildHeatmapWeeks(start, end, minutesByDay)`.
  **Hecho cuando:** cada columna tiene 7 posiciones, empieza en lunes, el relleno es `null`, hoy está en la última columna y no hay fechas posteriores a hoy.

- [x] **T10. Orquestación del mapa** [RF-1, RF-2, RF-3]
  `calculateHeatmap(sessions, today, preset)`.
  **Hecho cuando:** los tests de T7+T8+T9 pasan a través de esta función y año bisiesto (29 feb 2024) ocupa su celda.

- [x] **T11. Filtro: funciones puras** [RF-6]
  `filterSessionsByDate`, `hasSessionsOnDate`, `nextFilterAfterDelete`, `shouldClearFilterAfterSave`.
  **Hecho cuando:** borrar la última sesión del día limpia el filtro, borrar otra lo conserva, guardar la misma fecha lo conserva y guardar otra lo limpia.

- [x] **T12. Navegación por teclado: función pura** [RF-8]
  `getAdjacentHeatmapCell(weeks, row, col, direction)`.
  **Hecho cuando:** los tests cubren flechas desde hoy, salto de relleno y que en el borde devuelve `null`.

- [x] **T13. Refactor de `app.js` para consumir `logic.js`** [Constitución 3]
  Eliminar las funciones movidas, usar `StudyLogic.*` y pasar `today` a todas. Repetir regresión.
  **Hecho cuando:** `node --test` completo pasa y la app sigue registrando/borrando sesiones igual que antes.

## Fase 2 — Interfaz

- [x] **T14. Sección HTML del mapa** [RF-3, RF-7]
  Insertar entre `.stats-grid` y `.form-section`: encabezado "Constancia", selector de 5 botones con `aria-pressed`, cuerpo con etiquetas de día, tabla vacía y leyenda de 6 muestras ("0 min" … "8 h+").
  **Hecho cuando:** la sección se ve con selector y leyenda, y la tabla está vacía sin errores en consola.

- [x] **T15. Tooltip y botón "Limpiar filtro" en HTML** [RF-5, RF-6]
  Un único tooltip oculto y el botón junto al contador de sesiones (inicialmente oculto); encabezado de sesiones con `tabindex=-1`.
  **Hecho cuando:** el botón está oculto al cargar y existe un nodo `#heatmapTooltip` con `hidden`.

- [x] **T16. CSS: tokens de nivel, celdas y responsive** [RF-2, RNF-3]
  Variables `--heat-0..5` (claro y oscuro), celdas 10×10 con separación 2 px, contenedor con scroll horizontal propio, etiquetas de día fijas fuera del scroll.
  **Hecho cuando:** a 375 px la página no scrollea en horizontal y el mapa sí tiene scroll interno.

- [x] **T17. CSS: selector, leyenda, tooltip y modo oscuro** [RF-3, RF-5, RF-7, RNF-4, RNF-7]
  Estilos de botones activos, leyenda con mismos tokens, tooltip fijo y adaptación a `prefers-color-scheme: dark`. Sin animaciones de entrada (RNF-5).
  **Hecho cuando:** en modo oscuro los 6 niveles son distinguibles y la leyenda coincide con las celdas.

- [x] **T18. Render de la cuadrícula** [RF-1, RF-3]
  `renderHeatmap(sessions, today)`: construir la tabla en un fragmento, aplicar niveles, marcar `aria-rowcount=7` y `aria-colcount=N`, `aria-label` accesible, `aria-hidden` en relleno y roving tabindex con foco inicial en hoy.
  **Hecho cuando:** con 3 sesiones (hoy/ayer/anteayer) las 3 celdas tienen nivel > 0 y el resto es nivel 0.

- [x] **T19. Persistencia del rango** [RF-4]
  Leer `study-diary-heatmap-range` al arrancar, normalizar, guardar en cada cambio y actualizar `aria-pressed`.
  **Hecho cuando:** cambiar a "26 sem" y recargar mantiene 26; un valor corrupto vuelve a `12w` sin tocar sesiones.

- [x] **T20. Cambio de rango sin recargar** [RF-3, RF-6]
  Al pulsar un preset: recalcular, repintar, limpiar el filtro, conservar el foco en el botón y colocar el scroll al final.
  **Hecho cuando:** cambiar entre los 5 rangos repinta el mapa sin recargar y el botón activo cambia.

- [x] **T21. Tooltip interactivo** [RF-5]
  Posicionado y limitado al viewport; hover (ratón), focus (teclado), doble toque (touch); oculta al tocar fuera, con scroll, con resize y con `Escape`.
  **Hecho cuando:** pasar el ratón muestra "fecha — N min" y tocar otra celda mueve el tooltip.

- [x] **T22. Filtro por celda** [RF-6]
  Click/tap o `Enter`/`Espacio` en celda con minutos > 0 filtra la lista, actualiza el contador, muestra "Limpiar filtro" y marca la celda activa. Celda en 0 minutos no filtra.
  **Hecho cuando:** filtrar muestra solo las sesiones de ese día y borrar la última restaura la lista completa y oculta el botón.

- [x] **T23. Teclado completo** [RF-8]
  Roving tabindex con flechas (saltando relleno), `Enter`/`Espacio` filtran, `Escape` limpia y oculta; el relleno nunca recibe foco.
  **Hecho cuando:** recorrer el mapa entero con teclado, activar y limpiar el filtro sin usar el ratón.

- [x] **T24. Flujo de render unificado** [RF-6, RNF-6]
  `renderAll` carga sesiones y "hoy" una vez; guardar/borrar sesión pasa por `shouldClearFilterAfterSave`/`nextFilterAfterDelete`.
  **Hecho cuando:** guardar una sesión en la fecha filtrada mantiene el filtro y de otra fecha lo limpia, sin perder datos.

## Fase 3 — Cierre

- [x] **T25. Verificación manual** [RNF-1, RNF-2, RNF-3, RNF-4, RNF-5]
  Checklist del plan 8.2: 3 sesiones, 5 rangos + recarga, tooltip en 3 inputs, filtro, teclado, móvil 375 px, oscuro, reduced motion, consola limpia y 52 semanas en Performance.
  **Hecho cuando:** todos los puntos pasan y la consola no tiene errores.

- [x] **T26. Documentación** [Constitución 6]
  Actualizar `AGENTS.md` (arquitectura de dos archivos, sección del mapa, `node --test`) y `MEMORY.md`.
  **Hecho cuando:** `AGENTS.md` describe `logic.js` y el comando de tests; `MEMORY.md` refleja el mapa como implementado.
