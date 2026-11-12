// Motos en venta: catálogo con filtros y ficha. Las motos salen de los datos compartidos (se cargan en el backoffice).
import { motosVisibles, alCambiar } from './datos.js';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const catalogo = $('catalogo');
const precioEl = $('precio');
const pesos = m => '$' + (m * 1e6).toLocaleString('es-CO');
const millones = m => `$${m} millones`;
let estilo = '';
let motos = motosVisibles();

function pintar() {
  motos = motosVisibles();
  const tope = Number(precioEl.value);
  $('precio-tope').textContent = tope >= 110 ? 'cualquier precio' : millones(tope);
  const orden = $('orden').value;
  const lista = motos.filter(m => (!estilo || m.estilo === estilo) && m.precio <= tope)
    .sort((a, b) => orden === 'precio' ? a.precio - b.precio : orden === 'km' ? a.km - b.km : (b.ingreso || '').localeCompare(a.ingreso || ''));
  catalogo.innerHTML = lista.map(m => `
    <button type="button" class="moto" data-id="${esc(m.id)}">
      <div class="moto__foto"><img src="${esc(m.foto)}" alt="${esc(m.marca)} ${esc(m.modelo)}" loading="lazy" width="1200" height="900"><span class="moto__sello">Revisada en taller</span>${m.estado === 'reservada' ? '<span class="moto__reservada">Reservada</span>' : ''}</div>
      <div class="moto__cuerpo">
        <h3>${esc(m.marca)} ${esc(m.modelo)}</h3>
        <p class="moto__datos">${esc(m.anio)} · ${Number(m.km).toLocaleString('es-CO')} km${m.cc ? ` · ${esc(m.cc)} cc` : ''}</p>
        <p class="moto__precio">${pesos(m.precio)}</p>
      </div>
    </button>`).join('');
  $('catalogo-vacio').hidden = lista.length > 0;
}

$('filtros').addEventListener('click', e => {
  const b = e.target.closest('[data-estilo]'); if (!b) return;
  estilo = b.dataset.estilo;
  document.querySelectorAll('[data-estilo]').forEach(x => x.classList.toggle('activa', x === b));
  pintar();
});
precioEl.addEventListener('input', pintar);
$('orden').addEventListener('change', pintar);
pintar();
alCambiar(pintar); // si el taller cambia algo en el backoffice, el catálogo se actualiza solo

// ficha
const dlg = $('ficha-moto');
let actual = null;
catalogo.addEventListener('click', e => {
  const b = e.target.closest('.moto'); if (!b) return;
  const m = motos.find(x => x.id === b.dataset.id); if (!m) return; actual = m;
  $('fm-foto').src = m.foto; $('fm-foto').alt = `${m.marca} ${m.modelo}`;
  $('fm-estilo').textContent = m.estilo + (m.estado === 'reservada' ? ' · Reservada' : '');
  $('fm-titulo').textContent = `${m.marca} ${m.modelo}`;
  $('fm-precio').textContent = pesos(m.precio);
  $('fm-datos').innerHTML = [['Año', m.anio], ['Kilometraje', Number(m.km).toLocaleString('es-CO') + ' km'], ['Motor', m.cc && m.cc + ' cc'], ['Potencia', m.hp && m.hp + ' hp'], ['Historial', m.dueno], ['Papeles', 'Al día, SOAT vigente']]
    .filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('fm-revision').innerHTML = (m.revision || []).map(r => `<li>${esc(r)}</li>`).join('');
  dlg.showModal();
});
$('fm-cerrar').addEventListener('click', () => dlg.close());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
$('fm-agendar').addEventListener('click', () => {
  dlg.close();
  dispatchEvent(new CustomEvent('agendar-moto', { detail: actual }));
});

// créditos de las fotos (Wikimedia Commons)
fetch('media/motos/creditos.json').then(r => r.json()).then(lista => {
  $('creditos').innerHTML = 'Fotos de motos en Wikimedia Commons: ' + lista.map(c =>
    `<a href="${c.fuente}" target="_blank" rel="noopener">${c.moto}</a> · ${c.autor} · <a href="${c.licenciaUrl}" target="_blank" rel="noopener">${c.licencia}</a>`).join('; ') + '.';
}).catch(() => {});
