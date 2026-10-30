# Plan técnico — Mapa de Calor (001-heat-map)

**Base:** `docs/constitution.md` y `specs/001-heat-map/spec.md`.
**Estado:** propuesto. No se escribe código de implementación hasta aprobar este plan.

## 1. Restricciones y enfoque

- HTML, CSS y JS puros, sin build ni dependencias; la app debe abrirse con doble clic (`file://`).
- La lógica de cálculo vive separada de la interfaz: funciones puras, sin DOM ni `localStorage`, con "hoy" como parámetro.
- `app.js` captura "hoy" una vez por render y lo pasa a todas las funciones de cálculo.
- El formato de las sesiones no cambia: `{ id, date: "AAAA-MM-DD", topic, minutes }`.
- Solo se añade una clave nueva de preferencia; no se migran ni se borran sesiones.
- Scripts clásicos, no módulos ES: `logic.js` se carga antes que `app.js` y se expone para navegador y para Node.
- Código en inglés; interfaz y documentación en español.
- Cada sección indica entre corchetes los RF que cubre.

## 2. Archivos

| Archivo | Acción | Responsabilidad | RF |
|---|---|---|---|
| `logic.js` | Crear | Funciones puras: fechas locales, rachas, estadísticas existentes, mapa de calor, filtro y navegación. Sin DOM ni almacenamiento. Exportación dual (navegador/Node). | RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-8 |
| `app.js` | Modificar | Almacenamiento, estado de UI, referencias al DOM, renderizado, eventos de rango, tooltip, filtro y teclado. Captura "hoy" y consume `logic.js`. | RF-3, RF-4, RF-5, RF-6, RF-8 |
| `index.html` | Modificar | Sección del mapa entre stats y formulario, selector de rango, tabla/cuadrícula, leyenda, tooltip y botón "Limpiar filtro". Carga `logic.js` antes de `app.js`. | RF-3, RF-5, RF-6, RF-7, RF-8 |
| `styles.css` | Modificar | Tokens de los 6 niveles, layout del mapa, celdas, leyenda, tooltip, responsive, modo oscuro y movimiento reducido. | RF-2, RF-7, RNF-3, RNF-4, RNF-5, RNF-7 |
| `tests/heatmap.test.js` | Crear | Pruebas con `node --test` de rango, escala, agregación, cuadrícula, filtro y navegación. | RF-1, RF-2, RF-3, RF-6, RF-8 |
| `tests/logic.test.js` | Crear | Pruebas de regresión de fechas, rachas, semana y mes tras moverlas a `logic.js`. | Constitución 3 y 4 |
| `AGENTS.md` | Modificar | Actualizar la arquitectura (dos archivos JS), la sección del mapa y el comando de tests. | Documentación |
| `MEMORY.md` | Modificar | Registrar decisiones y estado al terminar la implementación. | Documentación |
| `specs/001-heat-map/plan.md` | Crear | Este documento. | Todos |
| `docs/constitution.md` | Sin cambios | Se respeta tal cual. | Todos |

No se crea `package.json`: `node --test` funciona sin configuración ni instalación.

## 3. Datos y estado [RF-4, RNF-6]

- **Sesiones:** mismo formato y misma clave `study-diary-sessions`. Sin migración ni versión nueva.
- **Preferencia de rango:** clave `study-diary-heatmap-range`, valores `4w`, `12w`, `26w`, `52w`, `year`. Por defecto `12w`. Un valor ausente, inválido o inaccesible cae en `12w` sin tocar las sesiones.
- **Estado de UI (en memoria, no persistido):** rango activo, fecha filtrada, celda con foco, última celda previsualizada en touch y último rango renderizado.
- **Datos corruptos:** una sesión con fecha o minutos inválidos se conserva, pero se ignora en los cálculos y en el mapa. Nunca se elimina automáticamente.

## 4. Funciones puras

Todas viven en `logic.js`, no acceden al DOM ni a `localStorage` y reciben fechas explícitas.

### 4.1 Fechas locales [RF-1, RF-3, RF-5, RF-8]

| Función | Entrada → salida | Responsabilidad |
|---|---|---|
| `parseLocalDate` | clave `AAAA-MM-DD` → fecha local o `null` | Validar y construir una fecha local; rechaza días inexistentes. |
| `formatDateForInput` | fecha → clave `AAAA-MM-DD` | Serializar con componentes locales, nunca UTC. |
| `formatDateForDisplay` | fecha → texto corto | Formato español existente (día, mes, día de semana). |
| `formatDateForAccessibleLabel` | fecha → texto largo | Fecha completa con año para `aria-label`. |
| `addDays` | fecha, entero → fecha | Sumar días de calendario preservando la hora local. |
| `startOfWeek` | fecha → fecha | Lunes de la semana que contiene la fecha. |
| `dayNumber` | fecha → entero | Ordinal de calendario calculado con componentes locales; evita errores de DST. |
| `daysBetween` | fecha, fecha → entero | Diferencia en días de calendario. |

### 4.2 Lógica existente refactorizada [Constitución 3]

| Función | Entrada → salida | Responsabilidad |
|---|---|---|
| `getWeekRange` | `today` → `{ monday, sunday }` | Semana lunes-domingo. |
| `getMonthRange` | `today` → `{ firstDay, lastDay }` | Mes natural completo. |
| `calculateStreak` | sesiones, `today` → entero | Racha actual; hoy o ayer como ancla. |
| `calculateBestStreak` | sesiones → entero | Mejor racha histórica sobre fechas únicas. |
| `calculateWeeklyMinutes` | sesiones, `today` → entero | Minutos de la semana actual. |
| `calculateMonthlyStudyDays` | sesiones, `today` → entero | Días únicos del mes actual. |
| `sortSessionsByDateDesc` | sesiones → sesiones | Orden por fecha descendente e id descendente, sin mutar. |
| `formatHoursMinutes` | minutos → texto | Formato "Xh Ymin" de la tarjeta semanal. |

Las tarjetas semanal y mensual conservan su alcance actual (semana y mes completos); solo el mapa termina en "hoy". El refactor no cambia esa regla.

### 4.3 Mapa, filtro y navegación [RF-1, RF-2, RF-3, RF-6, RF-8]

| Función | Entrada → salida | Responsabilidad |
|---|---|---|
| `normalizeHeatmapPreset` | valor → preset | Devuelve un preset válido o `12w`. |
| `weeksForPreset` | preset → entero | 4, 12, 26 o 52; `year` no usa este valor. |
| `getHeatmapRange` | preset, `today` → `{ start, end }` | Rango de calendario; fin siempre hoy. |
| `getHeatmapLevel` | minutos → 0..5 | Escala logarítmica con referencia fija 480. |
| `aggregateMinutesByDay` | sesiones, inicio, fin → mapa fecha→minutos | Suma por día, ignora fechas futuras, fuera de rango o inválidas. |
| `buildHeatmapWeeks` | inicio, fin, mapa → semanas | Columnas de 7 días con relleno `null` antes/después del rango. |
| `calculateHeatmap` | sesiones, `today`, preset → datos completos | Orquesta rango, agregación y cuadrícula. |
| `filterSessionsByDate` | sesiones, clave → sesiones | Filtro puro por día, sin mutar. |
| `hasSessionsOnDate` | sesiones, clave → booleano | Saber si queda alguna sesión ese día. |
| `nextFilterAfterDelete` | filtro, sesiones restantes → filtro o `null` | Desactiva el filtro si se borró la última sesión del día. |
| `shouldClearFilterAfterSave` | filtro, fecha guardada → booleano | Conserva el filtro solo si la sesión guardada es del mismo día. |
| `getAdjacentHeatmapCell` | semanas, fila, columna, dirección → celda o `null` | Navegación por flechas saltando relleno. |

## 5. Algoritmo del mapa (pseudocódigo)

### 5.1 Rango [RF-3]

```text
ALGORITMO getHeatmapRange(preset, hoy)
  SI preset = "year" ENTONCES
    inicio ← fechaLocal(año(hoy), 1, 1)
  SI NO
    n ← weeksForPreset(preset)            // 4, 12, 26 o 52
    lunesActual ← addDays(hoy, -((diaSemana(hoy) + 6) mod 7))
    inicio ← addDays(lunesActual, -(n - 1) * 7)
  fin ← hoy
  DEVOLVER { inicio, fin }
```

`diaSemana` usa 0 = domingo. Para los presets de semanas, el inicio es lunes y se obtienen exactamente N columnas: la semana actual parcial más N−1 semanas completas.

### 5.2 Agregación por día [RF-1]

```text
ALGORITMO aggregateMinutesByDay(sesiones, inicio, fin)
  mapa ← mapa vacío
  PARA CADA sesión EN sesiones
    fecha ← parseLocalDate(sesión.date)
    SI fecha = null ENTONCES CONTINUAR
    SI dayNumber(fecha) < dayNumber(inicio) O dayNumber(fecha) > dayNumber(fin) ENTONCES CONTINUAR
    minutos ← sesión.minutes
    SI minutos no es número finito O minutos ≤ 0 ENTONCES CONTINUAR
    clave ← formatDateForInput(fecha)
    mapa[clave] ← (mapa[clave] O 0) + minutos
  DEVOLVER mapa
```

No se mutan las sesiones. Una fecha futura queda fuera porque `fin = hoy`.

### 5.3 Intensidad [RF-2]

```text
ALGORITMO getHeatmapLevel(m)
  SI m ≤ 0 O m no es finito ENTONCES DEVOLVER 0
  nivel ← 1 + floor(4 × ln(m + 1) / ln(481))
  DEVOLVER min(5, nivel)
```

La referencia fija es 480 min/día. No se usa el máximo del rango, así que un día atípico no comprime el resto y el color de un día no cambia al cambiar de rango.

### 5.4 Cuadrícula de semanas [RF-1, RF-3]

```text
ALGORITMO buildHeatmapWeeks(inicio, fin, minutosPorDia)
  primerLunes ← addDays(inicio, -((diaSemana(inicio) + 6) mod 7))
  totalSemanas ← floor(daysBetween(primerLunes, fin) / 7) + 1
  semanas ← []
  PARA s DESDE 0 HASTA totalSemanas - 1
    semana ← []
    PARA d DESDE 0 HASTA 6
      fecha ← addDays(primerLunes, s * 7 + d)
      SI dayNumber(fecha) < dayNumber(inicio) O dayNumber(fecha) > dayNumber(fin) ENTONCES
        semana.push(null)                 // relleno no interactivo
      SI NO
        clave ← formatDateForInput(fecha)
        minutos ← minutosPorDia[clave] O 0
        semana.push({ clave, fecha, minutos, nivel: getHeatmapLevel(minutos) })
    semanas.push(semana)
  DEVOLVER semanas
```

Cada columna tiene siempre 7 posiciones (lunes a domingo). Los `null` son celdas de relleno y no se renderizan como interactivas.

### 5.5 Orquestación [RF-1, RF-2, RF-3]

```text
ALGORITMO calculateHeatmap(sesiones, hoy, preset)
  presetValido ← normalizeHeatmapPreset(preset)
  { inicio, fin } ← getHeatmapRange(presetValido, hoy)
  minutosPorDia ← aggregateMinutesByDay(sesiones, inicio, fin)
  semanas ← buildHeatmapWeeks(inicio, fin, minutosPorDia)
  DEVOLVER { preset: presetValido, inicio, fin, semanas }
```

### 5.6 Transiciones del filtro [RF-6]

```text
ALGORITMO nextFilterAfterDelete(filtro, sesionesRestantes)
  SI filtro = null ENTONCES DEVOLVER null
  SI hasSessionsOnDate(sesionesRestantes, filtro) ENTONCES DEVOLVER filtro
  DEVOLVER null

ALGORITMO shouldClearFilterAfterSave(filtro, fechaGuardada)
  DEVOLVER filtro ≠ null Y filtro ≠ fechaGuardada
```

El cambio de rango siempre limpia el filtro; se aplica en la capa de UI.

### 5.7 Navegación por teclado [RF-8]

```text
ALGORITMO getAdjacentHeatmapCell(semanas, fila, columna, direccion)
  vector ← vector de la dirección         // arriba/abajo/izquierda/derecha
  f ← fila + vector.fila
  c ← columna + vector.columna
  MIENTRAS f, c dentro de límites
    SI semanas[c][f] ≠ null ENTONCES DEVOLVER { fila: f, columna: c }
    f ← f + vector.fila
    c ← c + vector.columna
  DEVOLVER null
```

Las flechas verticales cambian de día dentro de la misma semana; las horizontales cambian de semana manteniendo el día. El relleno se salta y, si no hay celda válida, el foco no se mueve.

### 5.8 Precisión sobre "Año" en enero [RF-3]

El rango de datos empieza el 1 de enero. La cuadrícula empieza en el lunes anterior o igual a esa fecha. Si hoy cae en la primera semana del año, se muestra una sola columna con relleno antes del 1 de enero. Si hoy cae en la segunda semana, se muestran dos columnas: la primera con relleno antes del 1 de enero y datos desde el 1, y la segunda con datos hasta hoy. Nunca se generan columnas futuras. Se interpreta así el caso límite de la spec: la intención es no mostrar semanas futuras, no ocultar la primera semana cuando ya tiene días de enero.

## 6. Pintado e interacción

### 6.1 Estructura de la sección [RF-3, RF-5, RF-6, RF-7, RF-8]

La sección se inserta entre `.stats-grid` y `.form-section`, con la misma estética de ficha que las demás tarjetas:

- Encabezado: título "Constancia" y selector de rango.
- Cuerpo: columna fija con etiquetas de día (lun, mié, vie) y contenedor con scroll horizontal para la cuadrícula.
- Cuadrícula: tabla con 7 filas (días de la semana) y N columnas (semanas). La columna de etiquetas queda fuera de la tabla para que no cuente como semana y permanezca fija al hacer scroll.
- Leyenda: 6 muestras (niveles 0–5) con etiquetas solo en los extremos, "0 min" y "8 h+".
- Tooltip: un único elemento oculto, reutilizado para todas las celdas.
- En la cabecera de sesiones: contador y botón "Limpiar filtro", inicialmente oculto.

### 6.2 Selector de rango [RF-3, RF-4]

- Cinco botones: "4 sem", "12 sem", "26 sem", "52 sem", "Año".
- El activo lleva `aria-pressed="true"` y una clase visual; los demás `false`.
- Al cambiar: se actualiza el estado, se guarda la preferencia, se limpia el filtro, se recalcula la cuadrícula y se conserva el foco en el botón pulsado.
- La preferencia se lee al arrancar y se normaliza; si el almacenamiento falla, se usa `12w` en memoria.

### 6.3 Cuadrícula y celdas [RF-1, RF-2, RF-3, RF-8]

- La tabla se marca como cuadrícula con 7 filas y N columnas (`aria-rowcount=7`, `aria-colcount=N`); las etiquetas de día son decorativas y cada celda tiene su etiqueta accesible completa (fecha con año y minutos).
- Cada celda de datos es enfocable y lleva atributos de fila, columna, fecha, minutos y nivel.
- Las celdas de relleno no tienen foco, no tienen acción y quedan fuera del árbol accesible.
- La celda de hoy recibe el foco inicial (único `tabindex=0`); el resto usa `tabindex=-1` (roving tabindex). En un re-render por datos se conserva el foco si la celda sigue existiendo; si no, vuelve a hoy.
- La celda filtrada se marca como seleccionada y con contorno visible.
- Los niveles 0–5 se aplican como clases o atributos; el color nunca es la única información, porque el tooltip y `aria-label` dan los minutos.

### 6.4 Tooltip [RF-5]

- Un solo tooltip fijo, con texto "fecha corta — N min"; se posiciona sobre la celda y, si no cabe, debajo; se limita al viewport.
- Ratón: aparece al pasar por encima y se oculta al salir.
- Teclado: aparece al enfocar una celda.
- Touch: el primer toque muestra el tooltip; un segundo toque en la misma celda filtra. Tocar otra celda mueve el tooltip; tocar fuera lo oculta.
- Se oculta al hacer scroll, al cambiar el tamaño de la ventana y con `Escape`.

### 6.5 Filtro de sesiones [RF-6]

- Activar una celda con minutos > 0 fija `activeFilterDate`, filtra la lista, actualiza el contador y muestra "Limpiar filtro".
- Una celda con 0 minutos no filtra.
- El filtro se limpia al cambiar de rango, al pulsar "Limpiar filtro", al guardar una sesión de otra fecha o al borrar la última sesión del día filtrado.
- Si se guarda una sesión de la misma fecha, el filtro se mantiene y la lista se actualiza.
- Al limpiar el filtro, el foco pasa al encabezado de sesiones (con `tabindex=-1`) para no perderlo.

### 6.6 Teclado [RF-8]

- `Tab` entra una sola vez en la cuadrícula; las flechas mueven el foco entre celdas válidas.
- `Enter` y `Espacio` ejecutan la misma acción que el click.
- `Escape` limpia el filtro y oculta el tooltip.
- El foco y el tooltip se actualizan juntos; el relleno nunca recibe foco.

### 6.7 Scroll y responsive [RF-1, RF-3, RF-8, RNF-1, RNF-3]

- Celdas de 10 × 10 px y separación de 2 px; 52 semanas caben en el ancho de escritorio y en móvil la cuadrícula tiene scroll horizontal propio, sin desbordar la página.
- Las etiquetas de día quedan fuera del contenedor con scroll y permanecen visibles.
- En la carga inicial y al cambiar de rango, el scroll se coloca al final (hoy). En un re-render por datos o filtro se conserva la posición actual para no interrumpir la exploración.
- El render construye la cuadrícula en un solo fragmento y usa delegación de eventos; no hay un listener por celda.

### 6.8 Colores y leyenda [RF-2, RF-7, RNF-4, RNF-7]

La escala usa solo la familia del subrayador amarillo. Los valores son tokens de diseño y se ajustan para mantener contraste entre niveles:

| Nivel | Claro | Oscuro | Significado |
|---|---|---|---|
| 0 | `#F0F0E6` | `#2A2A44` | Sin sesión |
| 1 | `#FFFBE6` | `#3D3510` | Muy poco |
| 2 | `#FFF3B0` | `#5A4A10` | Poco |
| 3 | `#FFE066` | `#7A6414` | Medio |
| 4 | `#F2C230` | `#A8861A` | Mucho |
| 5 | `#C99A00` | `#D4AF37` | 8 h o más |

La leyenda usa exactamente las mismas variables que las celdas. No se introduce un segundo acento. No hay animaciones de entrada en la cuadrícula; con `prefers-reduced-motion` se desactivan las transiciones.

### 6.9 Flujo de render [RF-1, RF-3, RF-4, RF-6]

1. `renderAll` carga las sesiones una vez y captura "hoy" una vez.
2. Calcula racha, semana, mes y datos del mapa con ese mismo "hoy".
3. Renderiza la cuadrícula, el estado del selector, la lista filtrada y el contador.
4. Las interacciones de rango, filtro y tooltip actualizan solo las partes necesarias; no recargan la página.

## 7. Decisiones técnicas [Transversales a RF-1–RF-8]

| Decisión | Justificación | Alternativa descartada |
|---|---|---|
| `logic.js` como script clásico con exportación dual navegador/Node | Permite abrir con doble clic y probar con `node --test` sin build. | Módulos ES: `file://` los bloquea por CORS y exigiría servidor. |
| Tabla HTML con rol de cuadrícula | Filas = días y columnas = semanas de forma nativa, con estructura y foco estables. | Cuadrícula de `div` con `display: contents`: semántica frágil en algunos lectores de pantalla. |
| Aritmética por componentes locales y ordinal de calendario | Evita desplazamientos UTC y errores de 23/25 h en cambios de horario. | `toISOString` o diferencias de milisegundos: pueden mover la fecha o romper rachas. |
| Referencia fija de 480 min/día | Consistencia entre rangos y resistencia a outliers; sin división por cero. | Máximo dinámico del rango: cambia colores al cambiar de vista y se aplasta con un outlier. |
| Cuadrícula construida en lógica pura | Layout testeable, render simple y exactamente N columnas. | Calcular la cuadrícula en el DOM: difícil de probar y duplica reglas. |
| Botones segmentados para el rango | Las 5 opciones quedan visibles y el estado activo se lee de un vistazo. | `<select>`: compacto, pero oculta opciones y dificulta mostrar el activo. |
| Un solo tooltip fijo | Un nodo para 364 celdas, sin recortes por el scroll y con posicionamiento controlado. | Tooltip por celda: más DOM, más listeners y recortes dentro del contenedor. |
| Filtro en memoria | Es un estado efímero; la spec solo pide persistir el rango. | Persistir el filtro: estado obsoleto y confuso tras recargar. |
| Reconstruir la cuadrícula al cambiar de rango | 364–371 celdas se renderizan en un fragmento; simple y dentro del presupuesto. | Actualización incremental: complejidad innecesaria para este tamaño. |
| Roving tabindex | Evita 364 paradas de tabulación y hace usable el teclado. | Todas las celdas tabulables: recorrido inviable. |
| Pruebas con `require` sobre `logic.js` | Se prueba el código real, sin duplicarlo ni evaluar `app.js` con DOM. | Duplicar fórmulas en tests o usar `jsdom`: deriva o dependencia externa. |
| Scroll al final solo al entrar o cambiar de rango | Muestra primero lo reciente sin interrumpir cuando solo cambian los datos. | Scroll al final en cada render: molesto al explorar semanas antiguas. |
| Variables CSS para los niveles | Una sola fuente de verdad para celdas, leyenda, dark mode y reduced motion. | Colores inline: duplicación y difícil adaptación al tema oscuro. |

## 8. Estrategia de tests con `node --test`

- Runner nativo: `node --test`, con `node:test` y `node:assert/strict`. Sin paquetes ni `package.json`.
- Archivos: `tests/heatmap.test.js` para lo nuevo y `tests/logic.test.js` para la regresión de lo movido.
- Se importa `logic.js` con `require`; la exportación dual permite probar el código real que usa el navegador.
- "Hoy" siempre se pasa explícito. Las fechas de prueba se construyen con componentes locales (año, mes, día), nunca con cadenas ISO.
- No se comparan textos localizados exactos, para no depender de la versión de ICU de Node; se comparan claves, ordinales y resultados numéricos.
- Se trabaja test-first: primero el test en rojo, luego la implementación, luego verde. No se avanza con tests rojos.

### 8.1 Casos automatizados

| Grupo | Casos | Resultado esperado | RF |
|---|---|---|---|
| Rango 4/12/26/52 | Hoy miércoles 7 oct 2026 | Inicios 14 sep, 20 jul, 13 abr y 13 oct 2025; exactamente 4/12/26/52 columnas; fin = hoy | RF-3 |
| Rango año | 1 ene 2026; 10 ene 2026; 1 mar 2024 | 1 columna con relleno antes del 1 ene; 2 columnas el 10 ene; el 29 feb 2024 cuenta | RF-1, RF-3 |
| Escala | 0, 1, 4, 60, 120, 479, 480, 5000, negativo, `NaN` | 0, 1, 2, 3, 4, 4, 5, 5, 0, 0 | RF-2 |
| Agregación | Tres sesiones de 30+45+60 el mismo día; fechas fuera de rango; fecha futura; fecha inválida; minutos inválidos | 135 min y nivel 4; el resto se ignora; las sesiones no se mutan | RF-1 |
| Cuadrícula | 4 semanas; año en enero; semana actual | 7 posiciones por columna; primer lunes; `null` en relleno; hoy en la última columna; ninguna fecha posterior a hoy | RF-1, RF-3 |
| Normalización | `4w`, `12w`, `26w`, `52w`, `year`, `8w`, vacío, nulo, número | Los válidos se conservan; el resto cae en `12w` | RF-4 |
| Filtro | Filtrar por día; borrar la última sesión; borrar otra; guardar misma fecha; guardar otra fecha | Lista correcta; filtro se conserva o se limpia según las reglas | RF-6 |
| Navegación | Flechas desde hoy; saltar relleno; bordes del mapa | Solo celdas válidas; en el borde no se mueve | RF-8 |
| Fechas | Ida y vuelta; 29 feb válido; 29 feb inexistente; cambio de mes/año | Clave correcta; fecha inválida devuelve `null`; sin desplazamiento UTC | RF-1, RF-3 |
| Regresión | Rachas, mejor racha, semana lunes-domingo, mes natural, orden de sesiones | Mismos resultados que la app actual, con `today` explícito | Constitución 3 |

### 8.2 Verificación manual (no automatizable con `node --test`)

- Registrar tres sesiones (hoy, ayer, anteayer) y comprobar que la racha y la mejor racha no cambian por el mapa.
- Cambiar entre los 5 rangos y recargar: la preferencia se conserva y un valor corrupto cae en `12w`.
- Tooltip con ratón, foco y touch; primer toque previsualiza y segundo filtra.
- Filtro, "Limpiar filtro", borrado de la última sesión del día, guardado en la misma fecha y en otra.
- Teclado: `Tab`, flechas, `Enter`, `Espacio`, `Escape`; el relleno no recibe foco.
- Móvil 375 px: scroll horizontal solo dentro del mapa, etiquetas y leyenda legibles.
- Modo oscuro, movimiento reducido y consola sin errores.
- Rendimiento: rango 52 semanas en el panel Performance; el algoritmo es lineal y el DOM se construye en un fragmento. No se añade un test de tiempo porque es inestable entre máquinas.

## 9. Matriz de cobertura

| Requisito | Dónde se cubre |
|---|---|
| RF-1 | 4.3, 5.2, 5.4, 5.5, 6.3, 8.1 |
| RF-2 | 4.3, 5.3, 6.3, 6.8, 8.1 |
| RF-3 | 4.3, 5.1, 5.4, 5.8, 6.2, 6.3, 8.1 |
| RF-4 | 3, 6.2, 8.1, 8.2 |
| RF-5 | 4.1, 6.4, 8.2 |
| RF-6 | 4.3, 5.6, 6.5, 8.1 |
| RF-7 | 6.1, 6.8 |
| RF-8 | 4.3, 5.7, 6.3, 6.6, 8.1, 8.2 |
| RNF-1 | 6.7, 8.2 |
| RNF-2 | 1, 2, 7 |
| RNF-3 | 6.7 |
| RNF-4 | 6.8 |
| RNF-5 | 6.8; `styles.css` sin animaciones en el mapa |
| RNF-6 | 3, 7 |
| RNF-7 | 6.8 |

## 10. Orden de implementación

1. Escribir los tests de `logic.js` (heatmap y regresión) y confirmar que fallan.
2. Crear `logic.js` con fechas, lógica existente refactorizada y mapa; poner los tests en verde.
3. Refactorizar `app.js` para consumir `logic.js` y pasar `today`; repetir regresión.
4. Añadir la estructura del mapa y el botón de filtro en `index.html`.
5. Añadir tokens, layout, celdas, leyenda, tooltip y responsive en `styles.css`.
6. Implementar rango, persistencia, cálculo y render de la cuadrícula.
7. Implementar tooltip, filtro, teclado y gestión de foco.
8. Verificación manual completa y actualización de `AGENTS.md` y `MEMORY.md`.

Cada paso se valida antes del siguiente; no se avanza con tests en rojo.

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `file://` bloquea módulos ES | Scripts clásicos con `logic.js` antes de `app.js`; sin `type="module"`. |
| Colisión del global `StudyLogic` | Un único global documentado; las funciones no escriben en `window`. |
| Diferencias de zona horaria o DST | Componentes locales y ordinal de calendario; tests con fechas límite. |
| Tabla con rol de cuadrícula interpretada distinto por navegador | Verificación manual en Chrome/Edge/Brave; fallback semántico de tabla nativa. |
| Doble toque involuntario en móvil | Se distingue pointer type; primer toque previsualiza, segundo filtra. |
| 52 semanas no caben en móvil | Scroll interno, celdas de 10 px y auto-scroll a hoy solo al entrar/cambiar rango. |
| Tooltip recortado | Posición fija, clamp al viewport y ocultación al hacer scroll. |
| Pérdida de foco al limpiar el filtro o borrar | Foco al encabezado de sesiones o a la celda válida más cercana. |
| Sesiones corruptas | Se conservan; se ignoran en cálculos y se evita romper el render. |
| Render lento | Un fragmento, delegación de eventos, sin listeners por celda. |
| Interpretación del caso "Año en enero" | Regla explícita en 5.8: sin columnas futuras y relleno antes del 1 de enero. |

## 12. Cumplimiento de la constitución

| Principio | Cumplimiento |
|---|---|
| 1. Simplicidad primero | Sin dependencias, sin build y sin `package.json`; se abre con doble clic. |
| 2. La spec manda | Cada RF está mapeado; no se añaden funciones fuera de la spec (meses, totales, exportación). |
| 3. Lógica separada de interfaz | `logic.js` es puro, sin DOM ni `localStorage`, y recibe `today`. |
| 4. Tests como puerta | `node --test` con `node:test`; se escribe primero el test y no se avanza en rojo. |
| 5. Datos sagrados | Sesiones intactas, fechas locales, clave nueva aditiva, datos inválidos conservados. |
| 6. Idioma | Identificadores y código en inglés; interfaz, spec, plan y docs en español. |

## 13. Fuera de alcance de este plan

- Etiquetas de mes dentro de la cuadrícula y resumen de totales: no están en la spec.
- Exportar el mapa, comparar periodos, mapa por tema, zoom, animaciones de transición y calendario externo.
- Cambiar la referencia de 480 min o los presets desde la interfaz.
- Cambios en el formato de sesiones, migraciones o versionado de datos.
- Modificar el comportamiento de las tarjetas semanal y mensual más allá de recibir `today`, pasar a `logic.js` y corregir el cálculo de días a través de cambios de horario.




