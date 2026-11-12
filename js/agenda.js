// Agenda de revisiones: 4 pasos (moto, servicio, día y hora, datos) y confirmación por WhatsApp.
// La cita se guarda en los datos compartidos (aparece en el backoffice) y se muestra el mensaje que le llegaría al taller.
import { turnoOcupado, guardarCita, nuevoId, iso, horasDe, alCambiar, HORAS_TALLER } from './datos.js';
const form = document.getElementById('agenda-form');
const pasos = [...form.querySelectorAll('.paso')];
const marcas = [...form.querySelectorAll('.agenda__pasos li')];
const btnSig = document.getElementById('siguiente');
const btnAtras = document.getElementById('atras');
const error = document.getElementById('agenda-error');
const confirmado = document.getElementById('confirmado');
let paso = 1;

const TALLER = 'LEGO Motors Medellín';
const fmtMiles = n => n.toLocaleString('es-CO');
const numero = s => Number(String(s || '').replace(/\D/g, '')) || 0;

// miles con punto mientras se escribe
form.querySelectorAll('[data-miles]').forEach(inp => inp.addEventListener('input', () => {
  const n = numero(inp.value); inp.value = n ? fmtMiles(n) : '';
}));

// servicios elegidos (se puede marcar más de uno)
const serviciosElegidos = () => [...form.querySelectorAll('input[name="servicio"]:checked')].map(i => i.value);

// al cambiar de paso, solo se mueve la página si el inicio del formulario quedó fuera de la vista
function mostrarFormulario() {
  const barra = document.getElementById('barra')?.offsetHeight || 70;
  const r = form.getBoundingClientRect();
  if (r.top < barra + 8 || r.top > innerHeight * 0.6) {
    scrollTo({ top: r.top + scrollY - barra - 16, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

// ---------- calendario ----------
const diasEl = document.getElementById('cal-dias');
const horasEl = document.getElementById('horas');
const mesEl = document.getElementById('cal-mes');
const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
let semana = 0, diaSel = null, horaSel = null;


function lunesDe(n) {
  const d = new Date(hoy); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow + n * 7); return d;
}
function pintarDias() {
  const lunes = lunesDe(semana);
  diasEl.innerHTML = '';
  const meses = new Set();
  for (let i = 0; i < 6; i++) { // lunes a sábado
    const d = new Date(lunes); d.setDate(lunes.getDate() + i);
    meses.add(d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }));
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dia'; b.setAttribute('role', 'radio');
    b.innerHTML = `<small>${d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}</small><b>${d.getDate()}</b>`;
    b.disabled = d <= hoy;
    b.setAttribute('aria-checked', String(diaSel && d.getTime() === diaSel.getTime()));
    b.addEventListener('click', () => { diaSel = d; horaSel = null; pintarDias(); pintarHoras(); });
    diasEl.appendChild(b);
  }
  const m = [...meses].join(' – '); mesEl.textContent = m.charAt(0).toUpperCase() + m.slice(1);
  document.getElementById('cal-antes').disabled = semana === 0;
  document.getElementById('cal-despues').disabled = semana >= 3;
}
function pintarHoras() {
  horasEl.innerHTML = '';
  if (!diaSel) { horasEl.innerHTML = '<p class="agenda__nota">Elige un día para ver los turnos.</p>'; return; }
  const sabado = diaSel.getDay() === 6;
  const horas = sabado ? HORAS_TALLER.sabado : HORAS_TALLER.semana;
  for (const h of horas) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hora'; b.setAttribute('role', 'radio');
    b.textContent = `${h}:00`;
    b.disabled = turnoOcupado(diaSel, h);
    b.setAttribute('aria-checked', String(horaSel === h));
    b.addEventListener('click', () => { horaSel = h; pintarHoras(); });
    horasEl.appendChild(b);
  }
}
document.getElementById('cal-antes').addEventListener('click', () => { semana = Math.max(0, semana - 1); pintarDias(); });
document.getElementById('cal-despues').addEventListener('click', () => { semana = Math.min(3, semana + 1); pintarDias(); });
pintarDias(); pintarHoras();
alCambiar(() => { if (!form.hidden) pintarHoras(); });

// ---------- pasos ----------
function validar() {
  form.querySelectorAll('.campo.error').forEach(c => c.classList.remove('error'));
  const falla = (campo, msj) => { campo.closest('.campo')?.classList.add('error'); campo.focus(); error.textContent = msj; return false; };
  if (paso === 1) {
    if (!form.marca.value) return falla(form.marca, 'Elige la marca de tu moto.');
    if (!form.modelo.value.trim()) return falla(form.modelo, 'Escribe el modelo.');
  }
  if (paso === 2 && !serviciosElegidos().length) { error.textContent = 'Elige al menos un servicio.'; return false; }
  if (paso === 3 && (!diaSel || horaSel == null)) { error.textContent = 'Elige el día y la hora.'; return false; }
  if (paso === 4) {
    if (!form.nombre.value.trim()) return falla(form.nombre, 'Escribe tu nombre.');
    if (numero(form.tel.value).toString().length < 10) return falla(form.tel, 'Escribe un WhatsApp de 10 dígitos.');
  }
  error.textContent = ''; return true;
}
function ir(n) {
  paso = n;
  pasos.forEach(p => (p.hidden = Number(p.dataset.paso) !== n));
  marcas.forEach((m, i) => { m.classList.toggle('activo', i === n - 1); m.classList.toggle('hecho', i < n - 1); });
  btnAtras.hidden = n === 1;
  btnSig.textContent = n === 4 ? 'Confirmar turno' : 'Siguiente';
  error.textContent = '';
  if (n === 4) pintarResumen();
}
const fechaLarga = () => diaSel.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
function datos() {
  return {
    moto: `${form.marca.value} ${form.modelo.value.trim()}${form.anio.value ? ' ' + form.anio.value : ''}`,
    km: form.km.value, servicios: serviciosElegidos(), servicio: serviciosElegidos().join(', '), nota: form.nota.value.trim(),
    cuando: `${fechaLarga()} a las ${horaSel}:00`, nombre: form.nombre.value.trim(), tel: form.tel.value.trim(),
    recoger: form.recoger.checked,
  };
}
function pintarResumen() {
  const d = datos();
  document.getElementById('resumen').innerHTML = `<dl>
    <dt>Moto</dt><dd>${esc(d.moto)}${d.km ? ` · ${esc(d.km)} km` : ''}</dd>
    <dt>${d.servicios.length > 1 ? 'Servicios' : 'Servicio'}</dt><dd>${esc(d.servicio)}</dd>
    <dt>Llegada</dt><dd>${esc(d.cuando)}</dd></dl>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

btnSig.addEventListener('click', () => {
  if (!validar()) return;
  if (paso < 4) { ir(paso + 1); mostrarFormulario(); return; }
  confirmar();
});
btnAtras.addEventListener('click', () => { ir(Math.max(1, paso - 1)); mostrarFormulario(); });

function confirmar() {
  const d = datos();
  guardarCita({
    id: nuevoId('web'), fecha: iso(diaSel), hora: horaSel, horas: Math.max(...d.servicios.map(horasDe)), servicios: d.servicios, servicio: d.servicio,
    moto: d.moto, km: d.km, nombre: d.nombre, tel: d.tel, nota: d.nota, recoger: d.recoger,
    origen: 'web', estado: 'pendiente', creada: new Date().toISOString(),
  });
  document.getElementById('confirmado-texto').textContent = `${d.nombre.split(' ')[0]}, te esperamos el ${d.cuando} con tu ${d.moto}. Un día antes te recordamos la cita por WhatsApp.`;
  document.getElementById('whatsapp-msj').textContent =
`Nueva cita desde la web 🏁
Cliente: ${d.nombre} · ${d.tel}
Moto: ${d.moto}${d.km ? ` · ${d.km} km` : ''}
${d.servicios.length > 1 ? 'Servicios' : 'Servicio'}: ${d.servicio}
Llega: ${d.cuando}${d.recoger ? '\nPide recogida en casa' : ''}${d.nota ? `\nNota: ${d.nota}` : ''}`;
  form.hidden = true; confirmado.hidden = false;
  const barra = document.getElementById('barra')?.offsetHeight || 70;
  const top = confirmado.getBoundingClientRect().top;
  if (top < barra + 8 || top > innerHeight * 0.6) scrollTo({ top: top + scrollY - barra - 16, behavior: 'smooth' });
}

document.getElementById('otra').addEventListener('click', () => {
  form.reset(); diaSel = null; horaSel = null; semana = 0;
  document.getElementById('opc-venta').hidden = true;
  pintarDias(); pintarHoras(); ir(1);
  confirmado.hidden = true; form.hidden = false;
});

// archivo de calendario para el cliente
document.getElementById('ics').addEventListener('click', () => {
  const d = datos(); const ini = new Date(diaSel); ini.setHours(horaSel, 0, 0, 0);
  const horas = Math.max(...d.servicios.map(horasDe));
  const fin = new Date(ini.getTime() + horas * 3600e3);
  const f = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LEGO Motors//Agenda//ES', 'BEGIN:VEVENT',
    `UID:${Date.now()}@legomotors`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(ini)}`, `DTEND:${f(fin)}`,
    `SUMMARY:${d.servicio} · ${TALLER}`, `DESCRIPTION:${d.moto}`, 'LOCATION:LEGO Motors\\, Medellín',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Mañana lleva la moto al taller', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'cita-lego-motors.ics'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

// el catálogo puede abrir la agenda con una moto en venta ya elegida
addEventListener('agendar-moto', e => {
  const m = e.detail;
  confirmado.hidden = true; form.hidden = false;
  const opc = document.getElementById('opc-venta'); opc.hidden = false;
  document.getElementById('opc-venta-moto').textContent = `${m.marca} ${m.modelo} ${m.anio}`;
  opc.querySelector('input').checked = true;
  if (!form.marca.value) { form.marca.value = 'Otra'; form.modelo.value = 'Vengo a ver una moto en venta'; }
  ir(3);
  document.getElementById('agenda').scrollIntoView({ behavior: 'smooth' });
  // al llegar desde el catálogo se puede sumar otro servicio en el paso 2
});
