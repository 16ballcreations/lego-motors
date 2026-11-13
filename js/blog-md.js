// Blog: un artículo es un solo texto Markdown con una ficha arriba (entre líneas ---) y el cuerpo abajo.
// Lo usan la web (tarjetas y página del artículo) y el editor del backoffice. Formato en blog/FORMATO.md.
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.es.mjs';

export const CAMPOS = ['titulo', 'resumen', 'categoria', 'fecha', 'cifra', 'video', 'estado', 'slug'];
export const ESTADOS_ARTICULO = { publicado: 'Publicado', borrador: 'Borrador' };

export const PLANTILLA = `---
titulo: Título del artículo, con *la parte emocional* en cursiva
resumen: Una o dos frases que salen en la tarjeta del blog.
categoria: Mantenimiento
fecha: ${new Date().toISOString().slice(0, 10)}
cifra: 10.000 km
video: https://www.instagram.com/reel/CODIGO/
estado: borrador
---

Primer párrafo: la idea del video en dos o tres frases. Sale más grande, como entrada.

## Un subtítulo

Texto normal. **Negrita** para lo importante.

- **Punto con negrita al inicio.** Si todos los puntos de una lista empiezan así, salen como lista de chequeo.
- **Otro punto.** Con su explicación.

> **Sin sorpresas.** Una cita sale como nota destacada del taller.
`;

const hoy = () => new Date().toISOString().slice(0, 10);

export function slugDe(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[*_`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'articulo';
}

// separa la ficha del cuerpo; la ficha son líneas «clave: valor»
export function parsear(md) {
  const texto = String(md || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  const meta = {};
  if (m) for (const linea of m[1].split('\n')) {
    const i = linea.indexOf(':'); if (i < 1) continue;
    const clave = slugDe(linea.slice(0, i)).replace(/-/g, '');
    meta[clave] = linea.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  const cuerpo = (m ? texto.slice(m[0].length) : texto).trim();
  meta.titulo ||= ''; meta.resumen ||= ''; meta.categoria ||= 'Taller';
  meta.fecha = /^\d{4}-\d{2}-\d{2}$/.test(meta.fecha || '') ? meta.fecha : hoy();
  meta.estado = meta.estado in ESTADOS_ARTICULO ? meta.estado : 'borrador';
  return { meta, cuerpo, conFicha: !!m };
}

// cambia (o agrega) un campo de la ficha sin tocar el resto del texto
export function ponerCampo(md, clave, valor) {
  const { conFicha } = parsear(md);
  if (!conFicha) return `---\n${clave}: ${valor}\n---\n\n${md}`;
  return md.replace(/^---\n([\s\S]*?)\n---/, (todo, ficha) => {
    const re = new RegExp(`^${clave}\\s*:.*$`, 'm');
    return `---\n${re.test(ficha) ? ficha.replace(re, `${clave}: ${valor}`) : `${ficha}\n${clave}: ${valor}`}\n---`;
  });
}

// lo que falta para poder publicar; vacío = listo
export function revisar(md) {
  const { meta, cuerpo, conFicha } = parsear(md);
  const faltas = [];
  if (!conFicha) faltas.push('Falta la ficha de arriba (entre las líneas ---).');
  if (!meta.titulo) faltas.push('Falta el «titulo».');
  if (!meta.resumen) faltas.push('Falta el «resumen» para la tarjeta.');
  if (cuerpo.split(/\s+/).filter(Boolean).length < 40) faltas.push('El texto es muy corto (menos de 40 palabras).');
  if (meta.video && !idReel(meta.video)) faltas.push('El «video» no parece un enlace de Instagram (instagram.com/reel/… o /p/…).');
  return faltas;
}

export const minutos = cuerpo => Math.max(1, Math.round(cuerpo.split(/\s+/).filter(Boolean).length / 200));
export const tituloPlano = t => String(t || '').replace(/[*_]/g, '');
export const tituloHtml = t => DOMPurify.sanitize(marked.parseInline(String(t || '')), { ALLOWED_TAGS: ['em', 'strong'] });
export function fechaLarga(f) {
  const [a, m, d] = f.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function idReel(url) {
  const m = String(url || '').match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/);
  return m ? { tipo: m[1] === 'reels' ? 'reel' : m[1], id: m[2] } : null;
}

// cuerpo en HTML limpio, con dos toques de marca: la primera línea es la entrada,
// y una lista donde todos los puntos empiezan en negrita sale como lista de chequeo
export function cuerpoHtml(cuerpo) {
  const caja = document.createElement('div');
  caja.innerHTML = DOMPurify.sanitize(marked.parse(cuerpo, { gfm: true, breaks: false }));
  const primero = caja.firstElementChild;
  if (primero?.tagName === 'P') primero.classList.add('articulo__entrada');
  caja.querySelectorAll('ul').forEach(ul => {
    const items = [...ul.children];
    if (items.length && items.every(li => li.firstElementChild?.tagName === 'STRONG' && li.textContent.trim().startsWith(li.firstElementChild.textContent.trim())))
      ul.classList.add('chequeo');
    else ul.classList.add('senales');
  });
  caja.querySelectorAll('blockquote').forEach(b => b.classList.add('nota-taller'));
  caja.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  return caja.innerHTML;
}

// el reel embebido si hay enlace de Instagram; si no, una invitación al perfil
export function videoHtml(url) {
  const r = idReel(url);
  if (r) return `<figure class="reel"><iframe src="https://www.instagram.com/${r.tipo}/${r.id}/embed" loading="lazy" allowtransparency="true" title="Video en Instagram"></iframe>
    <figcaption>El video de este artículo, en <a href="https://www.instagram.com/${r.tipo}/${r.id}/" target="_blank" rel="noopener">@legomotorsmed</a></figcaption></figure>`;
  return `<a class="video-ig" href="https://www.instagram.com/legomotorsmed/" target="_blank" rel="noopener">
    <span class="video-ig__icono" aria-hidden="true">▶</span>
    <span><small>Míralo en video</small>Más consejos de mantenimiento en @legomotorsmed</span>
    <span aria-hidden="true">→</span></a>`;
}

const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// el artículo completo; sin enlaces para la vista previa del backoffice
export function articuloHtml({ meta, cuerpo }, { enlaces = true } = {}) {
  return `
    <header class="articulo__cabeza">
      ${enlaces ? '<a class="articulo__volver" href="../index.html#blog">← Blog del taller</a>' : ''}
      <p class="sobre">${esc(meta.categoria)}</p>
      <h1>${tituloHtml(meta.titulo) || 'Sin título'}</h1>
      <p class="articulo__meta">LEGO Motors Medellín · ${fechaLarga(meta.fecha)} · ${minutos(cuerpo)} min de lectura</p>
    </header>
    <div class="articulo__cuerpo">${cuerpoHtml(cuerpo)}${videoHtml(meta.video)}</div>
    <footer class="articulo__cierre">
      <h2>¿Ya le toca a tu moto?</h2>
      <p>Separa tu turno en línea en un minuto. Te confirmamos por WhatsApp.</p>
      <a class="boton boton--grande" href="${enlaces ? '../index.html#agenda' : '#'}">Agendar revisión <span aria-hidden="true">→</span></a>
    </footer>`;
}
