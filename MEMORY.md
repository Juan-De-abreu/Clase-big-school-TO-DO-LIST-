# MEMORY.md - Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~60 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- App funcionando: registrar sesiones, racha actual, mejor racha, progreso semanal, días del mes, lista con borrado y **mapa de calor de constancia**.
- **Spec 001 completada**: T1–T26. `logic.js` puro + `app.js` de interfaz; 30 tests en verde con `node --test`.
- Verificación de navegador con Edge headless vía CDP: 57 comprobaciones funcionales + 13 extra (rangos, filtro, teclado, touch, responsive, oscuro, reduced motion, 52 semanas).
- Datos en localStorage; el formato de sesión no cambió.
- **Diseño "Fichas de Estudio"**: papel/tinta/subrayador. Syne/DM Sans/JetBrains Mono. Hero asimétrico. Stats semanal y mensual. Sin glassmorphism, blobs, emojis ni animaciones idle.

## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic.
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- **Mejor racha on-demand**: se recalcula desde localStorage (no campo extra), O(n) sobre fechas únicas.
- **Un solo acento (subrayador amarillo)**: el amarillo es "subrayar lo importante"; nada de gradients decorativos.
- **Semana lunes-domingo / Mes 1–último día**: zona local, on-demand.
- **Heat map**: escala log 0–5 con referencia fija 480 min/día (consistente entre rangos y resistente a outliers); 5 presets; filtro por día; touch con doble tap; teclado con roving tabindex.
- **Arquitectura**: `logic.js` con exportación dual navegador/Node + `app.js` para UI; tests con `node --test`; sin build.
- **Persistencia del rango**: `study-diary-heatmap-range`; valor inválido cae en `12w` sin tocar sesiones. El filtro es estado de UI en memoria.
- **Cuadrícula semántica**: tabla de 7 filas × N columnas, etiquetas de día fuera del scroll; relleno `null` no interactivo.
- **Un tooltip fijo** en vez de uno por celda: menos DOM y sin recortes por scroll.
- **Scroll al final** solo al cargar o cambiar de rango; al repintar por datos se conserva la posición.

## Aprendizajes y errores a evitar
- Nunca `toISOString()` ni `new Date("AAAA-MM-DD")`: usar componentes locales y `dayNumber()`.
- El DOM de la cuadrícula está ordenado por filas (lunes...domingo), no por fecha; para mínimos/máximos hay que reducir fechas, no usar el primer/último nodo.
- `Math.max` sobre claves `AAAA-MM-DD` devuelve `NaN`; comparar como texto o reducir.
- Módulos ES rompen `file://`; `logic.js` debe seguir siendo script clásico.
- Glassmorphism/purple gradients y emojis = look genérico, no "estudio".
- Corregido bug preexistente: el botón "Guardar sesión" tenía texto y fondo del mismo color; ahora usa `var(--paper)` sobre `var(--ink)`.

## Entorno
- No hay Chrome instalado; la verificación automatizada de navegador se hizo con Edge headless + CDP.
- No hay `package.json` ni `node_modules`.

## Próximos pasos
- Sin pendientes de la spec 001. Mantener `node --test` en verde y actualizar la spec antes de añadir funciones nuevas.
