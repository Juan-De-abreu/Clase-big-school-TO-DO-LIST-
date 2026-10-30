# MEMORY.md - Diario de Estudio

Memoria del proyecto entre sesiones. Máximo ~50 líneas: resume o elimina lo que ya no aporte.

## Estado actual
- v1 funcionando: registrar sesiones (fecha, tema, minutos), racha actual, **mejor racha histórica** y lista de sesiones.
- Datos en localStorage.
- **Diseño "Fichas de Estudio"**: Papel/tinta/subrayador. Syne/DM Sans/JetBrains Mono. Hero asimétrico (racha grande + underline animado). Stats grid: barra progreso semanal (meta 10h) + contador mensual. Form + lista con delete.
- **Eliminado**: glassmorphism, purple palette, blobs, emojis (🔥🏆📝), personaje SVG animado, fade-in-up genérico.
- **Spec 001 (mapa de calor)**: redactada y revisada por QA; decisiones cerradas. Plan técnico en `specs/001-heat-map/plan.md`; pendiente implementación.

## Decisiones (y por qué)
- Sin backend ni dependencias: cualquiera debe poder abrirlo con doble clic.
- Fecha editable en el formulario: permite registrar días pasados y ver la racha crecer.
- **Mejor racha on-demand**: Se recalcula siempre desde localStorage (no campo extra). O(n) sobre fechas únicas.
- **Un solo acento (subrayador amarillo)**: Decisión deliberada — el amarillo es "subrayar lo importante", coherente con estudiar. Nada de purple gradients decorativos.
- **Tipografía Syne para números**: Técnica, distintiva, con personalidad. No Inter por defecto.
- **Layout asimétrico hero**: Número a la izquierda (lo que importa), stats a la derecha. No todo centrado.
- **Motion solo en acción**: Slide-in al guardar, barra progreso al cargar. Sin idle animations (float, blink, pulse).
- **Semana lunes-domingo / Mes 1–último día**: Zona local, on-demand.
- **Delete en lista**: Event delegation, UX directa.
- **Heat map (spec 001)**: escala log 0–5 con referencia fija 480 min/día (consistente entre rangos, resistente a outliers); 5 presets; filtro por día; touch con doble tap; teclado con roving tabindex.
- **Arquitectura 001**: `logic.js` puro con exportación dual navegador/Node + `app.js` para UI; tests con `node --test`; sin build ni dependencias.

## Aprendizajes y errores a evitar
- Glassmorphism/purple gradients = default AI look, no "estudio".
- Emoji icons = genérico, no material.
- Múltiples idle animations = ruido, no señal.
- Todo centrado = pasivo, no jerárquico.

## Próximos pasos
- Implementar `specs/001-heat-map/plan.md`: tests primero, luego `logic.js`, `app.js`, HTML y CSS.