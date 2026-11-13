// Backoffice · Blog: lista de artículos y editor Markdown con vista previa.
// Un artículo se escribe aquí, se pega o se sube como .md (uno o varios, también arrastrándolos).
import { listarArticulos, guardarArticulo, borrarArticulo } from './datos.js';
import { parsear, ponerCampo, revisar, slugDe, minutos, tituloPlano, fechaLarga, articuloHtml, PLANTILLA, ESTADOS_ARTICULO } from './blog-md.js';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function iniciarBlog({ avisar }) {
  const editor = $('editor'), md = $('ed-md');
  let actual = null; // artículo abierto ({ id, md }) o null si es nuevo

  // id estable: el slug de la ficha o el del título, sin chocar con otro artículo
  async function idPara(texto, propio) {
    const { meta } = parsear(texto);
    const base = slugDe(meta.slug || tituloPlano(meta.titulo));
    const usados = new Set((await listarArticulos()).map(a => a.id).filter(id => id !== propio));
    let id = base, n = 2;
    while (usados.has(id)) id = `${base}-${n++}`;
    return id;
  }

  // ---------- lista ----------
  async function pintar() {
    const lista = (await listarArticulos()).map(a => ({ ...a, ...parsear(a.md) }))
      .sort((a, b) => b.meta.fecha.localeCompare(a.meta.fecha));
    const pub = lista.filter(a => a.meta.estado === 'publicado').length;
    $('resumen-blog').innerHTML = `<span><b>${pub}</b> publicados</span><span><b>${lista.length - pub}</b> borradores</span>`;
    $('lista-articulos').innerHTML = lista.map(({ id, meta, cuerpo }) => `
      <article class="ad-articulo ${meta.estado}" data-id="${esc(id)}">
        <div class="ad-articulo__cifra" aria-hidden="true">${esc(meta.cifra || meta.categoria)}</div>
        <div>
          <h3>${esc(tituloPlano(meta.titulo) || 'Sin título')}</h3>
          <p>${esc(meta.categoria)} · ${fechaLarga(meta.fecha)} · ${minutos(cuerpo)} min${meta.video ? ' · con video' : ''}</p>
        </div>
        <span class="etiqueta etiqueta--${meta.estado === 'publicado' ? 'publicada' : 'borrador'}">${ESTADOS_ARTICULO[meta.estado]}</span>
        <div class="ad-moto__acciones">
          <button type="button" class="ad-chip" data-alternar>${meta.estado === 'publicado' ? 'Pasar a borrador' : 'Publicar'}</button>
          <button type="button" class="ad-chip" data-editar>Editar</button>
        </div>
      </article>`).join('') || '<p class="ad-vacio">Todavía no hay artículos. Crea uno o arrastra un .md aquí.</p>';
  }

  $('lista-articulos').addEventListener('click', async e => {
    const fila = e.target.closest('.ad-articulo'); if (!fila) return;
    const a = (await listarArticulos()).find(x => x.id === fila.dataset.id);
    if (e.target.closest('[data-editar]')) return abrir(a);
    if (e.target.closest('[data-alternar]')) {
      const publicar = parsear(a.md).meta.estado !== 'publicado';
      const faltas = revisar(a.md);
      if (publicar && faltas.length) { abrir(a); return; } // que vea lo que falta
      await guardarArticulo({ ...a, md: ponerCampo(a.md, 'estado', publicar ? 'publicado' : 'borrador'), actualizado: new Date().toISOString() });
      pintar(); avisar(publicar ? 'Artículo publicado en la web' : 'Artículo pasado a borrador');
    }
  });
  $('nuevo-articulo').addEventListener('click', () => abrir(null));

  // ---------- subir .md (botón o arrastrando a la página) ----------
  async function subir(archivos) {
    const mds = [...archivos].filter(f => /\.(md|markdown|txt)$/i.test(f.name) || f.type.startsWith('text/'));
    if (!mds.length) return avisar('Solo se pueden subir archivos .md');
    let nuevos = 0, cambiados = 0, ultimo = null;
    for (const f of mds) {
      const texto = await f.text();
      const { meta } = parsear(texto);
      const existente = (await listarArticulos()).find(a => a.id === slugDe(meta.slug || tituloPlano(meta.titulo)));
      const art = { id: existente?.id || await idPara(texto), md: texto, actualizado: new Date().toISOString() };
      // un .md con problemas no sale publicado: queda en borrador hasta que se corrija
      if (meta.estado === 'publicado' && revisar(texto).length) art.md = ponerCampo(texto, 'estado', 'borrador');
      await guardarArticulo(art); existente ? cambiados++ : nuevos++; ultimo = art;
    }
    await pintar();
    if (mds.length === 1) abrir(ultimo);
    avisar([nuevos && `${nuevos} nuevo${nuevos > 1 ? 's' : ''}`, cambiados && `${cambiados} actualizado${cambiados > 1 ? 's' : ''}`].filter(Boolean).join(' · '));
  }
  $('subir-md').addEventListener('change', e => { subir(e.target.files); e.target.value = ''; });
  const vista = $('vista-blog'), soltar = $('soltar-md');
  vista.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); soltar.hidden = false; } });
  soltar.addEventListener('dragleave', () => { soltar.hidden = true; });
  soltar.addEventListener('drop', e => { e.preventDefault(); soltar.hidden = true; subir(e.dataTransfer.files); });

  // ---------- editor ----------
  function estadoEditor() { return parsear(md.value).meta.estado; }
  function pintarEstados() {
    const est = estadoEditor();
    $('ed-estados').innerHTML = Object.entries(ESTADOS_ARTICULO).map(([k, v]) =>
      `<button type="button" role="radio" data-estado="${k}" aria-checked="${k === est}">${v}</button>`).join('');
  }
  function refrescar() {
    const art = parsear(md.value);
    $('ed-vista').innerHTML = articuloHtml(art, { enlaces: false });
    const faltas = revisar(md.value);
    $('ed-faltas').innerHTML = faltas.length ? `<b>Antes de publicar:</b> ${faltas.map(esc).join(' ')}` : '';
    $('ed-faltas').classList.toggle('bien', !faltas.length);
    if (!faltas.length) $('ed-faltas').textContent = 'Listo para publicar.';
    pintarEstados();
  }
  let espera;
  md.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(refrescar, 120); });
  $('ed-estados').addEventListener('click', e => {
    const b = e.target.closest('[data-estado]'); if (!b) return;
    md.value = ponerCampo(md.value, 'estado', b.dataset.estado); refrescar();
  });

  function abrir(a) {
    actual = a;
    md.value = a ? a.md : PLANTILLA;
    $('ed-titulo').textContent = a ? 'Editar artículo' : 'Nuevo artículo';
    $('ed-borrar').hidden = !a;
    $('ed-ver').hidden = !a;
    if (a) $('ed-ver').href = `blog/articulo.html?a=${encodeURIComponent(a.id)}&vista=1`;
    refrescar();
    editor.showModal();
    md.focus(); md.setSelectionRange(0, 0); md.scrollTop = 0;
  }

  editor.querySelector('.ad-editor__modo').addEventListener('click', e => {
    const b = e.target.closest('[data-ver]'); if (!b) return;
    editor.querySelectorAll('.ad-editor__modo button').forEach(x => x.classList.toggle('activo', x === b));
    editor.querySelector('.ad-editor__cuerpo').dataset.ver = b.dataset.ver;
  });

  // barra de formato: envuelve la selección o pone el bloque al inicio de la línea
  function envolver(antes, despues = antes, relleno = 'texto') {
    const { selectionStart: i, selectionEnd: f, value } = md;
    const sel = value.slice(i, f) || relleno;
    md.setRangeText(antes + sel + despues, i, f, 'end');
    md.setSelectionRange(i + antes.length, i + antes.length + sel.length);
  }
  function bloque(prefijo, relleno) {
    const { selectionStart: i, selectionEnd: f, value } = md;
    const ini = value.lastIndexOf('\n', i - 1) + 1;
    const lineas = (value.slice(ini, f) || relleno).split('\n').map(l => prefijo + l.replace(/^(#+ |- |> )/, ''));
    md.setRangeText(lineas.join('\n'), ini, Math.max(f, ini), 'end');
  }
  const FORMATOS = {
    h2: () => bloque('## ', 'Subtítulo'),
    b: () => envolver('**'), i: () => envolver('*'),
    ul: () => bloque('- ', 'Punto'),
    check: () => bloque('- ', '**Pieza.** Qué le revisamos y por qué.'),
    nota: () => bloque('> ', '**Sin sorpresas.** Lo que el taller quiere que recuerdes.'),
    a: () => envolver('[', '](https://)', 'texto del enlace'),
  };
  editor.querySelector('.ad-editor__barra').addEventListener('click', e => {
    const b = e.target.closest('[data-md]'); if (!b) return;
    md.focus(); FORMATOS[b.dataset.md](); refrescar();
  });
  md.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'i') { e.preventDefault(); FORMATOS[k](); refrescar(); }
    if (k === 's') { e.preventDefault(); $('form-articulo').requestSubmit(); }
  });

  $('form-articulo').addEventListener('submit', async e => {
    e.preventDefault();
    let texto = md.value;
    const faltas = revisar(texto);
    if (!parsear(texto).meta.titulo) return avisar('Ponle un título en la ficha (titulo: …)');
    let nota = '';
    if (estadoEditor() === 'publicado' && faltas.length) {
      texto = ponerCampo(texto, 'estado', 'borrador'); md.value = texto; refrescar();
      nota = ' como borrador: revisa lo que falta';
    }
    const art = { id: actual?.id || await idPara(texto), md: texto, actualizado: new Date().toISOString() };
    if (!(await guardarArticulo(art))) return avisar('El navegador no tiene espacio para guardar');
    const nuevo = !actual; actual = art;
    await pintar();
    if (nota) return avisar('Guardado' + nota);
    editor.close();
    avisar(parsear(texto).meta.estado === 'publicado' ? (nuevo ? 'Artículo publicado en la web' : 'Artículo actualizado') : 'Borrador guardado');
  });

  $('ed-borrar').addEventListener('click', async () => {
    if (!actual || !confirm(`¿Borrar «${tituloPlano(parsear(actual.md).meta.titulo)}»? Si solo quieres quitarlo de la web, pásalo a borrador.`)) return;
    await borrarArticulo(actual.id); editor.close(); pintar(); avisar('Artículo borrado');
  });
  $('ed-descargar').addEventListener('click', async () => {
    const id = actual?.id || await idPara(md.value);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md.value], { type: 'text/markdown;charset=utf-8' }));
    a.download = `${id}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const sinGuardar = () => md.value !== (actual ? actual.md : PLANTILLA) && !confirm('Hay cambios sin guardar. ¿Cerrar igual?');
  editor.addEventListener('cancel', e => { if (sinGuardar()) e.preventDefault(); });
  $('ed-cerrar').addEventListener('click', () => { if (!sinGuardar()) editor.close(); });

  pintar();
  return pintar;
}
