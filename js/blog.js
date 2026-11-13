// Blog en la portada: una tarjeta por artículo publicado, del más nuevo al más viejo.
import { listarArticulos, alCambiar } from './datos.js';
import { parsear, minutos, tituloPlano } from './blog-md.js';

const lista = document.getElementById('blog-lista');
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// la cifra de la portada: el número grande y lo que va detrás en pequeño («10.000 km»)
function cifraHtml(cifra, categoria) {
  const [, num, resto] = String(cifra || '').match(/^([\d.,]+)\s*(.*)$/) || [];
  return num ? `${esc(num)}${resto ? `<small>${esc(resto)}</small>` : ''}` : `<span class="entrada__palabra">${esc(cifra || categoria)}</span>`;
}

async function pintar() {
  const articulos = (await listarArticulos()).map(a => ({ id: a.id, ...parsear(a.md) }))
    .filter(a => a.meta.estado === 'publicado')
    .sort((a, b) => b.meta.fecha.localeCompare(a.meta.fecha));
  lista.innerHTML = articulos.map(({ id, meta, cuerpo }) => `
    <a class="entrada" href="blog/articulo.html?a=${encodeURIComponent(id)}">
      <div class="entrada__portada" aria-hidden="true">
        <span class="entrada__cifra">${cifraHtml(meta.cifra, meta.categoria)}</span>
        <span class="entrada__bandera"></span>
      </div>
      <div class="entrada__cuerpo">
        <p class="entrada__meta"><span>${esc(meta.categoria)}</span> · ${minutos(cuerpo)} min de lectura</p>
        <h3>${esc(tituloPlano(meta.titulo))}</h3>
        <p>${esc(meta.resumen)}</p>
        <span class="enlace-flecha">Leer el artículo <span aria-hidden="true">→</span></span>
      </div>
    </a>`).join('') || '<p class="catalogo__vacio">Pronto, el primer artículo.</p>';
}

pintar();
alCambiar(pintar);
