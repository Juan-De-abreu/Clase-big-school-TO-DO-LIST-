# Spec: Mapa de Calor (Heat Map) — Diario de Estudio

## Contexto y objetivo

El Diario de Estudio muestra racha actual, mejor racha, progreso semanal y días mensuales. Falta una visión de **patrón temporal largo**: qué semanas fueron productivas y qué meses se estudiaron menos. Un mapa de calor tipo GitHub (cuadrícula semanas × días) permite ver de un vistazo la constancia y los huecos, usando intensidad de color según minutos estudiados.

Objetivo: añadir una sección visual entre las tarjetas de stats y el formulario, con selector de rango, leyenda y celdas clicables que filtran la lista de sesiones.

---

## Usuarios

- **Estudiante autodidacta**: quiere ver su constancia a lo largo de meses, detectar rachas y vacíos.
- **Usuario ocasional**: abre la app semanalmente, quiere feedback visual inmediato sin leer números.

---

## Historias de usuario

| ID | Historia |
|----|----------|
| HU-1 | Como usuario, veo un mapa de calor con las últimas N semanas para identificar patrones de estudio. |
| HU-2 | Como usuario, cambio el rango (4/12/26/52 semanas o Año natural) y el mapa se actualiza al instante. |
| HU-3 | Como usuario, paso el ratón o enfoco una celda y veo un tooltip con fecha y minutos exactos. |
| HU-4 | Como usuario, hago click en una celda y la lista de sesiones se filtra a ese día. |
| HU-5 | Como usuario, la preferencia de rango se guarda y persiste entre recargas. |

---

## Requisitos funcionales

### RF-1: Cálculo de datos del mapa
**CUANDO** se solicitan los datos para el mapa **DADO** un rango y una fecha "hoy" **ENTONCES** el sistema devuelve un conjunto de días desde el inicio del rango hasta "hoy" inclusive, donde cada día incluye su fecha y la suma de minutos de sus sesiones (0 si no hay). Los días posteriores a "hoy" no forman parte del resultado. El cálculo no accede a la interfaz ni al almacenamiento y recibe "hoy" como parámetro.

**Criterio de aceptación:** con 3 sesiones de 30, 45 y 60 min en un mismo día, ese día devuelve 135 min; con dos sesiones en días distintos, cada día devuelve sus propios minutos.

### RF-2: Escalado logarítmico de intensidad
**CUANDO** se calcula la intensidad de una celda **DADO** sus minutos `m` **ENTONCES** se aplica una escala logarítmica de 6 estados (0–5) con referencia fija de 480 min/día:
- `i = 0` si `m = 0`
- `i = min(5, 1 + floor(4 × ln(m + 1) / ln(481)))` si `m > 0`

La referencia es fija para que un mismo día tenga el mismo color en cualquier rango y para que un día atípico no aplaste el resto de la escala. El nivel 5 se alcanza a partir de 480 min (8 h) en un día.

**Criterio de aceptación:** `m=0 → 0`; `m=1 → 1`; `m=60 → 3`; `m=120 → 4`; `m=480 → 5`; `m=5000 → 5` (sin desbordar).

### RF-3: Selector de rango con presets
**CUANDO** el usuario interactúa con el selector **ENTONCES** ve exactamente 5 opciones: "4 sem", "12 sem", "26 sem", "52 sem", "Año". La opción activa se marca visualmente. El cambio recalcula y repinta el mapa sin recargar la página.

- Los presets de semanas producen exactamente N columnas: la columna actual (parcial hasta hoy) más las N−1 semanas anteriores completas. La primera columna empieza en lunes.
- "Año" cubre del 1 de enero del año en curso hasta hoy. Las celdas anteriores al 1 de enero que completen la primera columna son relleno visual, no datos.

**Criterio de aceptación:** con "4 sem" el mapa muestra 4 columnas y la última termina en hoy; con "Año" en enero solo se muestra la columna de la semana actual.

### RF-4: Persistencia de preferencia
**CUANDO** el usuario cambia el rango **ENTONCES** la preferencia se guarda con el identificador `4w`, `12w`, `26w`, `52w` o `year` en el almacenamiento local, y se restaura al cargar la app.

**CUANDO** el valor guardado falta, no es uno de los identificadores válidos o el almacenamiento no está disponible **ENTONCES** se usa `12w` como valor por defecto, sin borrar ni modificar las sesiones.

**Criterio de aceptación:** tras recargar, se mantiene el último rango válido; un valor corrupto cae en `12w` y la app sigue funcionando.

### RF-5: Tooltip en hover, focus y touch
**CUANDO** el usuario pasa el ratón o enfoca una celda **ENTONCES** aparece un tooltip con la fecha en formato corto español ya usado en la app y los minutos totales (ej. "mié 15 oct — 90 min").

- En ratón: hover muestra el tooltip; click filtra directamente (RF-6).
- En touch: el primer toque sobre una celda muestra el tooltip; un segundo toque sobre la misma celda filtra. Tocar otra celda mueve el tooltip; tocar fuera lo oculta.
- El tooltip no debe tapar la celda ni salir del viewport; se oculta al hacer scroll.

**Criterio de aceptación:** una celda con 90 min muestra "… — 90 min"; una celda sin sesiones muestra "… — 0 min".

### RF-6: Click filtra la lista de sesiones
**CUANDO** el usuario activa una celda con `minutes > 0` **ENTONCES** la lista de sesiones muestra solo las de ese día, el contador refleja el número filtrado y aparece un botón "Limpiar filtro" junto al contador. La celda activa se distingue con un contorno visible.

**CUANDO** la celda activada tiene `minutes = 0` **ENTONCES** no se aplica filtro alguno (no hay sesiones que mostrar).

**CUANDO** se activa "Limpiar filtro", se cambia de rango, se guarda una sesión con fecha distinta a la filtrada o se elimina la última sesión del día filtrado **ENTONCES** el filtro se desactiva y la lista vuelve a mostrar todas las sesiones. Si la sesión guardada coincide con el día filtrado, el filtro se mantiene.

**Criterio de aceptación:** filtro activo + borrar la última sesión de ese día → lista completa y botón oculto; filtro activo + cambiar de rango → lista completa.

### RF-7: Leyenda visual
**CUANDO** se renderiza el mapa **ENTONCES** se muestra una leyenda con 6 muestras de color (niveles 0–5) y etiquetas solo en los extremos: "0 min" a la izquierda y "8 h+" a la derecha. La muestra del nivel 0 es el fondo de celda vacía. La leyenda usa los mismos colores y la misma escala que las celdas.

**Criterio de aceptación:** la leyenda tiene 6 muestras y sus colores coinciden exactamente con los de las celdas de cada nivel.

### RF-8: Accesibilidad
**CUANDO** el usuario navega con teclado **ENTONCES**:
- El mapa se expone como una cuadrícula con filas = días de la semana y columnas = semanas.
- Solo una celda es tabulable a la vez (tabindex móvil); las flechas mueven el foco entre celdas adyacentes y saltan el relleno visual.
- `Enter` y `Espacio` ejecutan la misma acción que el click (filtrar si hay minutos).
- `Escape` limpia el filtro activo y oculta el tooltip.
- Cada celda tiene una etiqueta accesible con fecha completa y minutos.
- Las celdas de relleno no son focusables ni anunciadas.

**Criterio de aceptación:** se puede llegar a cualquier día con flechas desde la celda inicial, activar el filtro con Enter y limpiarlo con Escape sin usar el ratón.

---

## Requisitos no funcionales

| ID | Requisito |
|----|-----------|
| RNF-1 | **Rendimiento**: render ≤ 50 ms para 52 semanas (364 celdas) en un móvil medio; sin bloqueos perceptibles al cambiar de rango. |
| RNF-2 | **Sin dependencias**: HTML, CSS y JS puros, sin librerías externas ni build. |
| RNF-3 | **Responsive**: en ≤ 560 px la cuadrícula vive en un contenedor con scroll horizontal propio (la página no scrollea en horizontal); celdas de al menos 10 px y separación mínima de 2 px; la leyenda se mantiene legible en una o dos líneas. |
| RNF-4 | **Dark mode**: los 6 niveles tienen equivalente oscuro automático, con contraste suficiente entre niveles adyacentes. |
| RNF-5 | **Reduced motion**: sin animaciones de entrada ni transiciones de color si el usuario prefiere movimiento reducido. |
| RNF-6 | **Datos del usuario**: no se modifica el formato de las sesiones ni se borra ninguna; la única clave nueva es la preferencia de rango, tolerante a valores inválidos (RF-4). |
| RNF-7 | **Un solo acento**: la escala usa exclusivamente variaciones del subrayador amarillo del sistema de diseño; no se introduce un segundo color de acento. |

---

## Casos límite

| Caso | Comportamiento |
|------|----------------|
| Rango "Año" en enero | Solo la columna de la semana actual; el resto son celdas de relleno no interactivas. |
| Sin sesiones en el rango | Todas las celdas en nivel 0; leyenda visible; tooltip "0 min". |
| `maxMinutes` no aplica | La escala usa referencia fija (RF-2); no hay división por cero ni dependencia del máximo del rango. |
| Sesión con fecha futura | Se ignora en el mapa (el rango termina en "hoy"). |
| Cambio de mes/año dentro del rango | La cuadrícula no se corta: las columnas siguen el calendario y la primera empieza en lunes. |
| Año bisiesto | El 29 de febrero ocupa su celda y cuenta como día normal; se prueba explícitamente. |
| Outlier (ej. 1000 min en un día) | Ese día alcanza nivel 5 sin comprimir los demás niveles. |
| Filtro activo y el día deja de estar en el rango | El filtro se desactiva al cambiar de rango. |
| Filtro activo y se borra la última sesión del día | El filtro se desactiva y la lista vuelve a mostrarse completa. |
| Usuario borra todas las sesiones | Mapa en nivel 0, sin errores. |
| Preferencia de rango corrupta | Se usa `12w`; las sesiones no se tocan. |
| Almacenamiento local no disponible | La app funciona con `12w` en memoria; no se pierde nada existente. |

---

## Fuera de alcance (esta versión)

- Exportar el mapa como imagen.
- Comparar dos periodos (ej. año actual vs. anterior).
- Mapa de calor por tema o etiqueta.
- Animaciones de transición entre rangos.
- Zoom o pinch en móvil.
- Integración con calendario externo.
- Cambiar la referencia de la escala desde la interfaz.

---

## Criterios de finalización

- [ ] Pruebas automatizadas de la lógica pura, sin instalar paquetes: agregación por día (varias sesiones), límites de la escala (0, 1, 60, 120, 480, valor extremo), rangos (4/12/26/52 semanas y año, incluido enero y 29 de febrero), y validación de la preferencia guardada.
- [ ] Pruebas de comportamiento: filtro por celda, limpieza automática al cambiar de rango o borrar la última sesión del día, y persistencia del rango.
- [ ] Verificación manual: escritorio (1440 px), móvil (375 px), modo oscuro, movimiento reducido y navegación completa por teclado.
- [ ] Sin errores en la consola.
- [ ] Spec aprobada antes de escribir el código de implementación.

---

## Decisiones de diseño resueltas

1. **Escala**: logarítmica con referencia fija de 480 min/día; 6 estados (0–5); sin máximo dinámico.
2. **Colores**: solo variaciones del subrayador amarillo; sin segundo acento.
3. **Rango de semanas**: exactamente N columnas, última parcial hasta hoy, primera empieza en lunes.
4. **"Año"**: 1 de enero a hoy; relleno visual antes del 1 de enero.
5. **Preferencia**: `4w`/`12w`/`26w`/`52w`/`year`; por defecto `12w`; valor inválido no rompe nada.
6. **Touch**: primer toque muestra tooltip, segundo toque en la misma celda filtra; toque fuera oculta.
7. **Filtro**: contorno en la celda activa; "Limpiar filtro" junto al contador; se desactiva al cambiar de rango, al guardar una sesión de otra fecha o al borrar la última sesión del día.
8. **Teclado**: tabindex móvil (roving), flechas para moverse, Enter/Espacio para filtrar, Escape para limpiar.
9. **Leyenda**: 6 muestras, etiquetas solo en extremos ("0 min" y "8 h+").

## Dudas abiertas

Ninguna. Las ambigüedades detectadas en la revisión de QA quedaron resueltas en "Decisiones de diseño resueltas".
