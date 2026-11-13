// Backoffice del taller: agenda en calendario (semana y mes), motos en venta y blog (este último en admin-blog.js).
import {
  listarCitas, guardarCita, borrarCita, listarMotos, guardarMoto, borrarMoto, restablecer, alCambiar,
  ESTADOS_CITA, ESTADOS_MOTO, SERVICIOS, HORAS_TALLER, horasDe, iso, deIso, lunesDe, nuevoId, turnoOcupado, prepararFoto,
} from './datos.js';
import { iniciarBlog } from './admin-blog.js';

const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const pesos = m => '$' + Math.round(m * 1e6).toLocaleString('es-CO');
const numero = s => Number(String(s ?? '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) || 0;

function avisar(texto) {
  const a = $('aviso'); a.textContent = texto; a.classList.add('visible');
  clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.remove('visible'), 2400);
}

// ---------- pestañas ----------
const VISTAS = { agenda: 'Agenda', motos: 'Motos en venta', blog: 'Blog' };
function mostrarVista() {
  const vista = location.hash.slice(1) in VISTAS ? location.hash.slice(1) : 'agenda';
  for (const v in VISTAS) $('vista-' + v).hidden = v !== vista;
  document.querySelectorAll('[data-vista]').forEach(a => { if (a.dataset.vista !== vista) a.removeAttribute('aria-current'); else a.setAttribute('aria-current', 'page'); });
  document.title = VISTAS[vista] + ' · Taller LEGO Motors';
}
addEventListener('hashchange', mostrarVista);

// ======================================================================
// AGENDA
// ======================================================================
const COLORES = {
  'Revisión por kilometraje': '#fe3b00', 'Cambio de aceite': '#f5a524', 'Diagnóstico con scanner': '#4aa8ff',
  'Mecánica y reparación': '#c86bff', 'Suspensión y frenos': '#3fd0a6', 'Revisión de viaje': '#ff6f91', 'Ver moto en venta': '#e8e6e1',
};
const colorDe = s => COLORES[s] || '#9a9a9f';
const serviciosDe = c => c.servicios?.length ? c.servicios : [c.servicio];
const H0 = 8, H1 = 18; // el calendario va de 8:00 a 18:00
let modo = 'semana';
let ancla = hoy();          // día de referencia de la vista
let recienCreada = null;    // para resaltar la cita que se acaba de guardar

$('leyenda').innerHTML = SERVICIOS.map(s => `<span style="--c:${colorDe(s.nombre)}"><i></i>${s.nombre}</span>`).join('');

function resumenAgenda() {
  const citas = listarCitas().filter(c => c.estado !== 'cancelada');
  const deHoy = citas.filter(c => c.fecha === iso(hoy()));
  const porConfirmar = citas.filter(c => c.estado === 'pendiente' && deIso(c.fecha) >= hoy()).length;
  const enTaller = citas.filter(c => c.estado === 'en-taller').length;
  const web = citas.filter(c => c.origen === 'web' && deIso(c.fecha) >= hoy()).length;
  $('resumen-agenda').innerHTML = `<span><b>${deHoy.length}</b> citas hoy</span><span><b>${porConfirmar}</b> por confirmar</span><span><b>${enTaller}</b> motos en el taller</span><span><b>${web}</b> agendadas desde la web</span>`;
}

function pintarAgenda() {
  resumenAgenda();
  document.querySelectorAll('[data-modo]').forEach(b => b.classList.toggle('activo', b.dataset.modo === modo));
  modo === 'semana' ? pintarSemana() : pintarMes();
}

function pintarSemana() {
  const lunes = lunesDe(ancla);
  const dias = Array.from({ length: 6 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });
  const fin = dias[5];
  const f = (d, o) => d.toLocaleDateString('es-CO', o);
  $('cal-rango').textContent = lunes.getMonth() === fin.getMonth()
    ? `${lunes.getDate()} – ${fin.getDate()} de ${f(fin, { month: 'long', year: 'numeric' })}`
    : `${f(lunes, { day: 'numeric', month: 'short' })} – ${f(fin, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const citas = listarCitas();
  const fila = parseFloat(getComputedStyle(document.body).getPropertyValue('--fila')) || 54;
  let html = '<div class="cal-semana"><div class="cal-esquina"></div>';
  for (const d of dias) {
    const n = citas.filter(c => c.fecha === iso(d) && c.estado !== 'cancelada').length;
    html += `<div class="cal-dia-cab${d.getTime() === hoy().getTime() ? ' hoy' : ''}"><small>${f(d, { weekday: 'long' })}</small><b>${d.getDate()}</b><span class="cuenta">${n ? n + (n === 1 ? ' cita' : ' citas') : ''}</span></div>`;
  }
  html += '<div class="cal-horas">' + Array.from({ length: H1 - H0 }, (_, i) => `<span>${H0 + i}:00</span>`).join('') + '</div>';
  for (const d of dias) {
    const sabado = d.getDay() === 6;
    const turnos = sabado ? HORAS_TALLER.sabado : HORAS_TALLER.semana;
    const pasado = d < hoy();
    html += `<div class="cal-col${pasado ? ' pasado' : ''}" style="height:${(H1 - H0) * fila}px">`;
    if (!sabado) html += `<div class="cal-almuerzo" style="top:${(12 - H0) * fila}px" title="Almuerzo"></div>`;
    for (const h of turnos) html += `<button type="button" class="cal-hueco" style="top:${(h - H0) * fila}px" data-fecha="${iso(d)}" data-hora="${h}" aria-label="Nueva cita el ${f(d, { weekday: 'long', day: 'numeric' })} a las ${h}:00"></button>`;
    // carriles para las citas que se cruzan en el tiempo
    const delDia = citas.filter(c => c.fecha === iso(d)).sort((a, b) => a.hora - b.hora || b.horas - a.horas);
    const finCarril = [];
    for (const c of delDia) {
      let carril = finCarril.findIndex(x => x <= c.hora);
      if (carril < 0) { carril = finCarril.length; finCarril.push(0); }
      finCarril[carril] = c.hora + c.horas; c._carril = carril;
    }
    const carriles = Math.max(1, finCarril.length);
    for (const c of delDia) {
      const alto = Math.min(c.horas, H1 - c.hora) * fila - 4;
      const ancho = 100 / carriles;
      html += `<button type="button" class="cita ${c.estado}${c.id === recienCreada ? ' nueva' : ''}" data-id="${esc(c.id)}" style="--c:${colorDe(serviciosDe(c)[0])};top:${(c.hora - H0) * fila + 2}px;height:${alto}px;left:calc(${c._carril * ancho}% + 3px);width:calc(${ancho}% - 6px)">
        <b>${c.hora}:00 · ${esc(c.nombre)}</b><span>${esc(c.servicio)}</span><span>${esc(c.moto)}</span>
        ${alto > 80 ? `<span class="cita__estado">${ESTADOS_CITA[c.estado]}${c.origen === 'web' ? ' · web' : ''}</span>` : ''}</button>`;
    }
    // línea de la hora actual
    const ahora = new Date();
    if (d.getTime() === hoy().getTime() && ahora.getHours() >= H0 && ahora.getHours() < H1) {
      html += `<div class="cal-ahora" style="top:${(ahora.getHours() - H0 + ahora.getMinutes() / 60) * fila}px"></div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  $('calendario').innerHTML = html;
  recienCreada = null;
}

function pintarMes() {
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1);
  const inicio = lunesDe(primero);
  $('cal-rango').textContent = primero.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(/^./, m => m.toUpperCase());
  const citas = listarCitas();
  let html = '<div class="cal-mes">' + ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map(d => `<div class="cal-mes__dow"><span class="largo">${d}</span><span class="corto">${d.slice(0, 3)}</span></div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    if (i >= 35 && d.getMonth() !== primero.getMonth()) break;
    const delDia = citas.filter(c => c.fecha === iso(d)).sort((a, b) => a.hora - b.hora);
    const activas = delDia.filter(c => c.estado !== 'cancelada').length;
    html += `<button type="button" class="cal-mes__dia${d.getMonth() !== primero.getMonth() ? ' fuera' : ''}${d.getTime() === hoy().getTime() ? ' hoy' : ''}" data-dia="${iso(d)}"${activas ? ` data-n="${activas}"` : ''}>
      <span class="cal-mes__num">${d.getDate()}</span>
      ${delDia.slice(0, 3).map(c => `<span class="cal-mes__pild ${c.estado}" style="--c:${colorDe(serviciosDe(c)[0])}">${c.hora}:00 ${esc(c.nombre.split(' ')[0])}</span>`).join('')}
      ${delDia.length > 3 ? `<span class="cal-mes__mas">+${delDia.length - 3} más</span>` : ''}</button>`;
  }
  $('calendario').innerHTML = html + '</div>';
}

$('calendario').addEventListener('click', e => {
  const cita = e.target.closest('.cita');
  if (cita) return abrirCita(listarCitas().find(c => c.id === cita.dataset.id));
  const hueco = e.target.closest('.cal-hueco');
  if (hueco) return abrirCita(null, hueco.dataset.fecha, Number(hueco.dataset.hora));
  const dia = e.target.closest('.cal-mes__dia');
  if (dia) { ancla = deIso(dia.dataset.dia); modo = 'semana'; pintarAgenda(); }
});
document.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => { modo = b.dataset.modo; pintarAgenda(); }));
$('cal-hoy').addEventListener('click', () => { ancla = hoy(); pintarAgenda(); });
$('cal-antes').addEventListener('click', () => { modo === 'semana' ? ancla.setDate(ancla.getDate() - 7) : ancla.setMonth(ancla.getMonth() - 1, 1); pintarAgenda(); });
$('cal-despues').addEventListener('click', () => { modo === 'semana' ? ancla.setDate(ancla.getDate() + 7) : ancla.setMonth(ancla.getMonth() + 1, 1); pintarAgenda(); });
$('nueva-cita').addEventListener('click', () => {
  // primer turno libre desde mañana
  const d = hoy(); d.setDate(d.getDate() + 1);
  for (let i = 0; i < 30; i++, d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue;
    const h = (d.getDay() === 6 ? HORAS_TALLER.sabado : HORAS_TALLER.semana).find(x => !turnoOcupado(d, x));
    if (h) return abrirCita(null, iso(d), h);
  }
  abrirCita(null, iso(hoy()), 8);
});

// ---------- panel de la cita ----------
const panelCita = $('panel-cita'), formCita = $('form-cita');
let citaActual = null, estadoCita = 'confirmada';
$('pc-servicios').innerHTML = SERVICIOS.map(s => `<label class="ad-servicio" style="--c:${colorDe(s.nombre)}"><input type="checkbox" name="servicios" value="${s.nombre}"><span>${s.nombre}</span></label>`).join('');
formCita.hora.innerHTML = HORAS_TALLER.semana.map(h => `<option value="${h}">${h}:00</option>`).join('');

function pintarEstadosCita() {
  $('pc-estados').innerHTML = Object.entries(ESTADOS_CITA).map(([k, v]) =>
    `<button type="button" role="radio" data-estado="${k}" aria-checked="${k === estadoCita}" style="--c:${k === 'cancelada' ? '#ff5a4f' : k === 'lista' ? '#3fd0a6' : 'var(--naranja)'}">${v}</button>`).join('');
}
$('pc-estados').addEventListener('click', e => { const b = e.target.closest('[data-estado]'); if (b) { estadoCita = b.dataset.estado; pintarEstadosCita(); } });

function abrirCita(c, fecha, hora) {
  citaActual = c;
  $('pc-error').textContent = '';
  $('pc-titulo').textContent = c ? `Cita de ${c.nombre.split(' ')[0]}` : 'Nueva cita';
  formCita.fecha.value = c ? c.fecha : fecha;
  formCita.hora.value = String(c ? c.hora : hora);
  const elegidos = c ? serviciosDe(c) : [SERVICIOS[0].nombre];
  formCita.querySelectorAll('[name="servicios"]').forEach(i => (i.checked = elegidos.includes(i.value)));
  for (const k of ['moto', 'km', 'nombre', 'tel', 'nota']) formCita[k].value = c ? c[k] || '' : '';
  formCita.recoger.checked = !!c?.recoger;
  estadoCita = c ? c.estado : 'confirmada';
  pintarEstadosCita();
  $('pc-origen').textContent = c ? `${c.origen === 'web' ? 'Agendada desde la web' : 'Registrada en el taller'} · ${new Date(c.creada).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : 'Para las citas que llegan por teléfono o en persona.';
  $('pc-borrar').hidden = !c;
  const wa = $('pc-whatsapp');
  if (c) {
    const msj = `Hola ${c.nombre.split(' ')[0]}, te escribimos de LEGO Motors para confirmar tu cita del ${deIso(c.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${c.hora}:00 (${c.servicio}). ¡Te esperamos!`;
    wa.href = `https://wa.me/57${String(c.tel).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(msj)}`;
    wa.hidden = false;
  } else wa.hidden = true;
  panelCita.showModal();
}

formCita.addEventListener('submit', e => {
  e.preventDefault();
  const fecha = formCita.fecha.value, hora = Number(formCita.hora.value);
  const falla = m => { $('pc-error').textContent = m; };
  if (!fecha) return falla('Elige el día.');
  if (deIso(fecha).getDay() === 0) return falla('Los domingos el taller está cerrado.');
  if (deIso(fecha).getDay() === 6 && hora > 11) return falla('Los sábados se recibe hasta las 11:00.');
  if (!formCita.moto.value.trim()) return falla('Escribe la moto.');
  if (!formCita.nombre.value.trim()) return falla('Escribe el nombre del cliente.');
  if (estadoCita !== 'cancelada' && turnoOcupado(deIso(fecha), hora, citaActual?.id)) return falla(`Ya hay una moto llegando a las ${hora}:00 ese día.`);
  const servicios = [...formCita.querySelectorAll('[name="servicios"]:checked')].map(i => i.value);
  if (!servicios.length) return falla('Elige al menos un servicio.');
  const servicio = servicios.join(', ');
  const cita = {
    ...(citaActual || { id: nuevoId('taller'), origen: 'taller', creada: new Date().toISOString() }),
    fecha, hora, servicios, servicio, horas: citaActual?.servicio === servicio ? citaActual.horas : Math.max(...servicios.map(horasDe)),
    moto: formCita.moto.value.trim(), km: formCita.km.value.trim(), nombre: formCita.nombre.value.trim(),
    tel: formCita.tel.value.trim(), nota: formCita.nota.value.trim(), recoger: formCita.recoger.checked, estado: estadoCita,
  };
  guardarCita(cita);
  recienCreada = cita.id; ancla = deIso(fecha);
  panelCita.close(); pintarAgenda();
  avisar(citaActual ? 'Cita actualizada' : 'Cita creada');
});
$('pc-borrar').addEventListener('click', () => {
  if (!citaActual || !confirm(`¿Borrar la cita de ${citaActual.nombre}? Si solo no viene, mejor márcala como cancelada.`)) return;
  borrarCita(citaActual.id); panelCita.close(); pintarAgenda(); avisar('Cita borrada');
});

// ======================================================================
// MOTOS EN VENTA
// ======================================================================
let filtroEstado = '', busqueda = '';

function pintarMotos() {
  const todas = listarMotos();
  const cuenta = k => todas.filter(m => m.estado === k).length;
  $('resumen-motos').innerHTML = `<span><b>${cuenta('publicada')}</b> publicadas</span><span><b>${cuenta('reservada')}</b> reservadas</span><span><b>${cuenta('vendida')}</b> vendidas</span><span><b>${cuenta('borrador')}</b> en borrador</span>`;
  const q = busqueda.toLowerCase();
  const lista = todas.filter(m => (!filtroEstado || m.estado === filtroEstado) && (!q || `${m.marca} ${m.modelo}`.toLowerCase().includes(q)));
  $('lista-motos').innerHTML = lista.length ? lista.map(m => `
    <article class="ad-moto ${m.estado}" data-id="${esc(m.id)}">
      <img src="${esc(m.foto || 'media/marca/isotipo-naranja.svg')}" alt="" loading="lazy">
      <div><h3>${esc(m.marca)} ${esc(m.modelo)}</h3><p>${esc(m.anio)} · ${esc(m.estilo)} · ingresó el ${m.ingreso ? deIso(m.ingreso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—'}</p></div>
      <div class="ad-moto__dato"><small>Precio</small><b>${pesos(m.precio)}</b></div>
      <div class="ad-moto__dato"><small>Kilometraje</small><b>${Number(m.km).toLocaleString('es-CO')} km</b></div>
      <div class="ad-moto__dato"><small>Estado</small><span class="etiqueta etiqueta--${m.estado}">${ESTADOS_MOTO[m.estado]}</span></div>
      <div class="ad-moto__acciones">
        <label class="oculto" for="est-${esc(m.id)}">Estado</label>
        <select id="est-${esc(m.id)}" data-cambiar-estado>${Object.entries(ESTADOS_MOTO).map(([k, v]) => `<option value="${k}"${k === m.estado ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <button type="button" class="ad-chip" data-editar>Editar</button>
      </div>
    </article>`).join('') : '<p class="ad-vacio">No hay motos con ese filtro.</p>';
}

$('lista-motos').addEventListener('change', e => {
  if (!e.target.matches('[data-cambiar-estado]')) return;
  const id = e.target.closest('.ad-moto').dataset.id;
  const m = listarMotos().find(x => x.id === id);
  guardarMoto({ ...m, estado: e.target.value }); pintarMotos();
  avisar(`${m.marca} ${m.modelo}: ${ESTADOS_MOTO[e.target.value].toLowerCase()}`);
});
$('lista-motos').addEventListener('click', e => {
  if (!e.target.closest('[data-editar]')) return;
  abrirMoto(listarMotos().find(x => x.id === e.target.closest('.ad-moto').dataset.id));
});
$('filtro-estado').addEventListener('click', e => {
  const b = e.target.closest('[data-estado]'); if (!b) return;
  filtroEstado = b.dataset.estado;
  $('filtro-estado').querySelectorAll('button').forEach(x => x.classList.toggle('activo', x === b));
  pintarMotos();
});
$('buscar-moto').addEventListener('input', e => { busqueda = e.target.value.trim(); pintarMotos(); });
$('nueva-moto').addEventListener('click', () => abrirMoto(null));

// ---------- panel de la moto ----------
const panelMoto = $('panel-moto'), formMoto = $('form-moto');
let motoActual = null, fotoActual = '', estadoMoto = 'publicada';

function pintarEstadosMoto() {
  $('pm-estados').innerHTML = Object.entries(ESTADOS_MOTO).map(([k, v]) =>
    `<button type="button" role="radio" data-estado="${k}" aria-checked="${k === estadoMoto}">${v}</button>`).join('');
}
$('pm-estados').addEventListener('click', e => { const b = e.target.closest('[data-estado]'); if (b) { estadoMoto = b.dataset.estado; pintarEstadosMoto(); } });

function mostrarFoto(src) {
  fotoActual = src || '';
  $('pm-foto-img').hidden = !src; if (src) $('pm-foto-img').src = src;
  $('pm-foto').classList.toggle('con-foto', !!src);
  $('pm-foto-vacio').querySelector('b').textContent = src ? 'Cambiar foto' : 'Subir foto';
}
function abrirMoto(m) {
  motoActual = m;
  $('pm-error').textContent = '';
  $('pm-titulo').textContent = m ? `${m.marca} ${m.modelo}` : 'Cargar moto';
  formMoto.reset();
  if (m) {
    for (const k of ['marca', 'modelo', 'anio', 'cc', 'hp', 'precio', 'estilo', 'dueno']) formMoto[k].value = m[k] ?? '';
    formMoto.km.value = Number(m.km).toLocaleString('es-CO');
    formMoto.revision.value = (m.revision || []).join('\n');
  }
  estadoMoto = m ? m.estado : 'publicada';
  pintarEstadosMoto(); mostrarFoto(m?.foto);
  $('pm-borrar').hidden = !m;
  panelMoto.showModal();
}

async function cargarFoto(archivo) {
  if (!archivo || !archivo.type.startsWith('image/')) return;
  try { mostrarFoto(await prepararFoto(archivo)); } catch { $('pm-error').textContent = 'No se pudo leer esa imagen.'; }
}
formMoto.archivo.addEventListener('change', e => cargarFoto(e.target.files[0]));
const zona = $('pm-foto');
zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('arrastrando'); });
zona.addEventListener('dragleave', () => zona.classList.remove('arrastrando'));
zona.addEventListener('drop', e => { e.preventDefault(); zona.classList.remove('arrastrando'); cargarFoto(e.dataTransfer.files[0]); });
formMoto.km.addEventListener('input', () => { const n = numero(formMoto.km.value); formMoto.km.value = n ? n.toLocaleString('es-CO') : ''; });

formMoto.addEventListener('submit', e => {
  e.preventDefault();
  const falla = m => { $('pm-error').textContent = m; };
  const marca = formMoto.marca.value.trim(), modelo = formMoto.modelo.value.trim();
  const anio = Number(formMoto.anio.value), km = numero(formMoto.km.value), precio = Number(String(formMoto.precio.value).replace(',', '.'));
  if (!marca || !modelo) return falla('Escribe la marca y el modelo.');
  if (!(anio >= 1980 && anio <= new Date().getFullYear() + 1)) return falla('Revisa el año.');
  if (!(precio > 0)) return falla('Escribe el precio en millones (por ejemplo 62 o 48,5).');
  if (estadoMoto !== 'borrador' && !fotoActual) return falla('Sube una foto para publicarla (o guárdala como borrador).');
  const moto = {
    ...(motoActual || { id: nuevoId('moto'), ingreso: iso(hoy()) }),
    marca, modelo, anio, km, precio, cc: Number(formMoto.cc.value) || null, hp: Number(formMoto.hp.value) || null,
    estilo: formMoto.estilo.value, dueno: formMoto.dueno.value, foto: fotoActual, estado: estadoMoto,
    revision: formMoto.revision.value.split('\n').map(s => s.trim()).filter(Boolean),
  };
  if (!guardarMoto(moto)) return falla('El navegador no tiene espacio para otra foto. En la versión final las fotos van a un almacenamiento propio.');
  panelMoto.close(); pintarMotos();
  avisar(motoActual ? 'Moto actualizada' : moto.estado === 'publicada' ? 'Moto publicada en la web' : 'Moto guardada');
});
$('pm-borrar').addEventListener('click', () => {
  if (!motoActual || !confirm(`¿Borrar ${motoActual.marca} ${motoActual.modelo}? Si ya se vendió, mejor márcala como vendida.`)) return;
  borrarMoto(motoActual.id); panelMoto.close(); pintarMotos(); avisar('Moto borrada');
});

// ---------- comunes ----------
document.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
document.querySelectorAll('.ad-panel').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
$('restablecer').addEventListener('click', () => {
  if (!confirm('¿Volver a los datos de ejemplo? Se pierden las citas, motos y artículos que hayas creado en esta demo.')) return;
  restablecer(); ancla = hoy(); pintarAgenda(); pintarMotos(); pintarArticulos(); avisar('Datos de ejemplo restablecidos');
});
alCambiar(() => { pintarAgenda(); pintarMotos(); pintarArticulos(); }); // una cita nueva desde la web aparece sola

const pintarArticulos = iniciarBlog({ avisar });
mostrarVista();
pintarAgenda();
pintarMotos();
