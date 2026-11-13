# Cómo escribir un artículo del blog

Cada artículo es **un solo archivo Markdown (`.md`)**. Arriba va una ficha entre dos líneas `---` y abajo el texto.
Se carga en el backoffice (`admin.html#blog`) de tres formas: escribiéndolo en el editor, pegándolo ahí, o
subiendo el `.md` (botón «Subir .md» o arrastrándolo a la página; se pueden subir varios a la vez).

El blog explica lo que sale en los videos de Instagram de @legomotorsmed: un video, un artículo.

## Ejemplo completo

```markdown
---
titulo: Cuándo cambiar las pastillas de freno, *antes de que chillen.*
resumen: Las tres señales de que tus pastillas ya no dan más y qué pasa si las dejas.
categoria: Frenos
fecha: 2026-11-20
cifra: 3 señales
video: https://www.instagram.com/reel/ABC123xyz/
estado: publicado
---

Primer párrafo: la idea del video en dos o tres frases. Sale más grande, como entrada.

## Un subtítulo

Texto normal con **negrita** para lo importante.

- **Pastillas.** Si todos los puntos empiezan en negrita, la lista sale como lista de chequeo (con ✓).
- **Discos.** Otro punto con su explicación.

Si notas alguna de estas, tráela:

- Una lista normal (sin negrita al inicio) sale con signos de alerta: sirve para «señales».

> **Sin sorpresas.** Una cita sale como nota destacada del taller, con el isotipo.
```

## La ficha

| Campo | ¿Obligatorio? | Qué va |
|---|---|---|
| `titulo` | Sí | El título. Lo que vaya entre `*asteriscos*` sale en cursiva naranja (la parte emocional, al final). |
| `resumen` | Sí | Una o dos frases para la tarjeta de la portada. |
| `categoria` | No | Una palabra: Mantenimiento, Frenos, Suspensión, Viajes… (si falta: «Taller»). |
| `fecha` | No | `AAAA-MM-DD`. Ordena los artículos, el más nuevo primero (si falta: hoy). |
| `cifra` | No | Lo que sale grande en la tarjeta: «10.000 km», «3 señales», «2 años». Si empieza con número, el número va grande y el resto pequeño. |
| `video` | No | El enlace del reel o la publicación de Instagram (`instagram.com/reel/…` o `/p/…`). Sale embebido al final. Si no hay, sale una invitación al perfil. |
| `estado` | No | `publicado` o `borrador` (si falta: `borrador`). |
| `slug` | No | La dirección del artículo. Si falta, sale del título. |

## Reglas para que se publique

El backoffice no deja publicar (lo guarda como borrador y dice qué falta) si:

- falta la ficha, el `titulo` o el `resumen`;
- el texto tiene menos de 40 palabras;
- el `video` no es un enlace de Instagram.

Si se sube un `.md` con el mismo título (o `slug`) que uno que ya existe, lo reemplaza.

## Tono

- Se escribe en **tú**, cercano y claro, como explica Luis en los videos.
- Corto: entre 300 y 700 palabras. Subtítulos con `##`, sin `#` (el título ya es el `titulo` de la ficha).
- Explica qué es, cada cuánto y qué señales mirar. Datos técnicos generales; si un dato depende de la moto, decir «según el manual de tu moto».
- Nada de precios ni promesas de tiempo de entrega.
- El artículo ya cierra solo con el botón «Agendar revisión»; no hace falta escribirlo.

## Para un agente

1. Lee esta guía y un artículo de ejemplo (`blog/articulos/mantenimiento-preventivo.md`).
2. Escribe el `.md` completo, con la ficha, siguiendo el ejemplo de arriba.
3. Súbelo en `admin.html#blog` con «Subir .md» (o pégalo en «+ Nuevo artículo» y guarda).
4. Revisa la vista previa del editor: abajo dice «Listo para publicar» o qué falta.

En la demo los artículos viven en el navegador. En la versión final el mismo `.md` se guarda en la base de datos
(o en `blog/articulos/` del repositorio) y la página del artículo se genera desde ahí.
