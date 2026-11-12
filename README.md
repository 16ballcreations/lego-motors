# LEGO Motors Medellín — propuesta de web y backoffice

**Estado: propuesta v1 (12 nov 2026), lista para mostrar al cliente. Con `noindex`.**

Sitio web propuesto para **LEGO Motors Medellín** (@legomotorsmed), taller de motos de alto cilindraje: una
R 1200 GS Adventure en 3D como protagonista, agenda de revisiones en línea, motos usadas en venta y un
backoffice para que el taller maneje las citas en calendario y cargue sus motos. Hecho por **16 Ball Creations**
a partir de sus publicaciones de Instagram.

- Web: `index.html` · Backoffice: [`admin.html`](admin.html)
- Lema: «Cuidamos tu moto más allá de una revisión».

## Qué trae

| # | Sección | Qué hace |
|---|---|---|
| 1 | Portada | La moto flota en el vacío, con anillos de neón, un haz de luz suave y tornillería que gira y se aparta del cursor. Botón grande para agendar |
| 2 | Pieza por pieza | Al llegar, la moto ya está desarmada; cada etiqueta dice qué se le hace a esa pieza en el taller y al tocarla la cámara se acerca |
| 3 | Servicios | La foto de Luis como cara del taller y los seis servicios apilados |
| 4 | Agenda | Cuatro pasos (moto, servicio, día y hora, datos), aviso de la próxima revisión por kilometraje, mensaje para WhatsApp y archivo de calendario |
| 5 | Motos en venta | Catálogo con filtros, ficha de cada moto con lo que se le hizo en el taller y botón para agendar la visita |
| — | Siempre | Botón fijo «Agendar revisión» y botón «Siguiente» en cada sección |

**Backoffice** (`admin.html`): agenda en calendario por semana y por mes (colores por servicio, estados de la cita,
crear citas desde un hueco, WhatsApp al cliente) y motos en venta (cargar con foto, editar, publicada / reservada /
vendida / borrador).

> **Demo.** Las citas y las motos se guardan en el navegador de quien abre la página (`js/datos.js`), así el flujo
> completo se puede probar sin servidor: lo que se agenda en la web aparece en el backoffice y lo que se carga en el
> backoffice sale en el catálogo. En la versión final van a una base de datos con su almacenamiento de fotos y el
> backoffice con inicio de sesión. Motos, precios y citas de ejemplo.

## Marca

Naranja de carreras `#FE3B00`, negro de taller y aluminio; bandera a cuadros como recurso. **El isotipo y el logotipo
van siempre separados.** Ambos están redibujados para la demo a partir de sus publicaciones; en la versión final se
usan los vectores originales. Valores, tono y decisiones en [MARCA.md](MARCA.md).

## Archivos

- `js/motor3d.js`: escena 3D (three.js): moto, anillos de neón, despiece, zoom por pieza y tornillería.
- `js/datos.js`: datos compartidos (motos y citas). `js/agenda.js`, `js/catalogo.js`, `js/navegacion.js`: la web.
- `js/admin.js`, `css/admin.css`: el backoffice.
- `media/3d/r1200gsa.glb`: la moto ya preparada (1,4 MB). `herramientas/preparar-r1200gsa.mjs` la genera desde el
  original: corrige las llantas, la pinta del naranja de la marca, pasa el asiento a grafito y la optimiza.
- Para verla en local: `node herramientas/servir.mjs 4393`.

Créditos de la moto 3D y de las fotos en [CREDITOS.md](CREDITOS.md).
