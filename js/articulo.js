// Página de un artículo del blog: lee su Markdown y lo pinta. Con ?vista=1 (desde el backoffice) muestra también borradores.
import { listarArticulos } from './datos.js';
import { parsear, articuloHtml, tituloPlano } from './blog-md.js';

const caja = document.getElementById('articulo');
const params = new URLSearchParams(location.search);

async function pintar() {
  const a = (await listarArticulos()).find(x => x.id === params.get('a'));
  const art = a && parsear(a.md);
  if (!art || (art.meta.estado !== 'publicado' && !params.has('vista'))) {
    caja.innerHTML = `<header class="articulo__cabeza"><a class="articulo__volver" href="../index.html#blog">← Blog del taller</a>
      <h1>Este artículo <em>no está publicado.</em></h1><p class="articulo__meta">Puede que lo hayan quitado o que aún sea un borrador.</p></header>`;
  } else {
    caja.innerHTML = articuloHtml(art);
    document.title = `${tituloPlano(art.meta.titulo)} · Blog LEGO Motors Medellín`;
    document.querySelector('meta[name="description"]').content = art.meta.resumen;
  }
  caja.removeAttribute('aria-busy');
}
if (caja) pintar();
