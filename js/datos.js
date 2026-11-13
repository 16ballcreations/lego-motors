// Datos compartidos entre la web pública y el backoffice: motos en venta, citas del taller y artículos del blog.
// En la demo viven en el navegador (localStorage) para que el flujo se pueda probar completo:
// lo que se agenda en la web aparece en el calendario del taller y lo que se carga en el backoffice
// sale en el catálogo. En la versión final esto pasa a una base de datos (p. ej. Cloudflare D1).

const CLAVE_MOTOS = 'lego.motos.v1';
const CLAVE_CITAS = 'lego.citas.v1';
const CLAVE_BLOG = 'lego.blog.v1';
const memoria = {}; // por si el navegador no deja guardar (modo privado, almacenamiento bloqueado)

function leer(clave) {
  try { const s = localStorage.getItem(clave); return s ? JSON.parse(s) : null; } catch { return memoria[clave] ?? null; }
}
function guardar(clave, valor) {
  memoria[clave] = valor;
  try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch { return false; }
}

export const ESTADOS_MOTO = { publicada: 'Publicada', reservada: 'Reservada', vendida: 'Vendida', borrador: 'Borrador' };
export const ESTADOS_CITA = { pendiente: 'Por confirmar', confirmada: 'Confirmada', 'en-taller': 'En el taller', lista: 'Lista para entregar', cancelada: 'Cancelada' };
export const SERVICIOS = [
  { nombre: 'Revisión por kilometraje', horas: 3 }, { nombre: 'Cambio de aceite', horas: 1 },
  { nombre: 'Diagnóstico con scanner', horas: 1 }, { nombre: 'Mecánica y reparación', horas: 4 },
  { nombre: 'Suspensión y frenos', horas: 2 }, { nombre: 'Revisión de viaje', horas: 2 },
  { nombre: 'Ver moto en venta', horas: 1 },
];
export const horasDe = servicio => SERVICIOS.find(s => s.nombre === servicio)?.horas || 2;
export const HORAS_TALLER = { semana: [8, 9, 10, 11, 13, 14, 15, 16], sabado: [8, 9, 10, 11] };

// ---------- motos en venta ----------
const MOTOS_BASE = [
  { id: 'r1200gs', marca: 'BMW', modelo: 'R 1200 GS', anio: 2016, km: 41200, precio: 62, estilo: 'Aventura', cc: 1170, hp: 125, foto: 'media/motos/r1200gs.webp', dueno: 'Segundo dueño', recibida: 3,
    revision: ['Revisión de los 40.000 km hecha', 'Válvulas ajustadas y bujías nuevas', 'Aceite de cardán cambiado', 'Llantas al 70 %'] },
  { id: 'r1250gsa', marca: 'BMW', modelo: 'R 1250 GS Adventure', anio: 2021, km: 21300, precio: 98, estilo: 'Aventura', cc: 1254, hp: 136, foto: 'media/motos/r1250gsa.webp', dueno: 'Único dueño', recibida: 1,
    revision: ['Diagnóstico sin fallas guardadas', 'Frenos con 80 % de pastilla', 'Suspensión ESA revisada', 'Tanque de 30 litros sin golpes'] },
  { id: 'rninet', marca: 'BMW', modelo: 'R nineT', anio: 2019, km: 17800, precio: 69, estilo: 'Naked', cc: 1170, hp: 110, foto: 'media/motos/rninet.webp', dueno: 'Único dueño', recibida: 5,
    revision: ['Cambio de aceite y filtros', 'Batería nueva', 'Escape original guardado'] },
  { id: 'ktm1190', marca: 'KTM', modelo: '1190 Adventure R', anio: 2015, km: 46200, precio: 48, estilo: 'Trail', cc: 1195, hp: 150, foto: 'media/motos/ktm1290.webp', dueno: 'Segundo dueño', recibida: 9,
    revision: ['Kit de arrastre nuevo', 'Embrague revisado', 'Refrigerante cambiado', 'Escáner sin fallas'] },
  { id: 'africatwin', marca: 'Honda', modelo: 'CRF1000L Africa Twin Adventure Sports', anio: 2018, km: 33900, precio: 54, estilo: 'Trail', cc: 998, hp: 95, foto: 'media/motos/africatwin.webp', dueno: 'Segundo dueño', recibida: 7,
    revision: ['Revisión de los 32.000 km', 'Válvulas medidas, en tolerancia', 'Llantas nuevas'] },
  { id: 'tenere700', marca: 'Yamaha', modelo: 'Ténéré 700', anio: 2022, km: 12400, precio: 46, estilo: 'Trail', cc: 689, hp: 73, foto: 'media/motos/tenere700.webp', dueno: 'Único dueño', recibida: 2,
    revision: ['Cambio de aceite', 'Cadena tensionada y lubricada', 'Protector de motor instalado'] },
  { id: 'multistrada', marca: 'Ducati', modelo: 'Multistrada 1200 S', anio: 2017, km: 29700, precio: 57, estilo: 'Aventura', cc: 1198, hp: 160, foto: 'media/motos/multistrada.webp', dueno: 'Segundo dueño', recibida: 12,
    revision: ['Cambio de correas de distribución', 'Desmo service hecho', 'Suspensión Skyhook revisada'] },
  { id: 'tiger800', marca: 'Triumph', modelo: 'Tiger 800 XC', anio: 2014, km: 52300, precio: 34, estilo: 'Trail', cc: 800, hp: 95, foto: 'media/motos/tiger900.webp', dueno: 'Tercer dueño', recibida: 15,
    revision: ['Rodamientos de rueda nuevos', 'Frenos nuevos adelante y atrás', 'Revisión de los 50.000 km'] },
];

export function listarMotos() {
  let m = leer(CLAVE_MOTOS);
  if (!Array.isArray(m)) {
    // fecha de ingreso relativa a hoy para que «más recientes» tenga sentido
    m = MOTOS_BASE.map(x => ({ ...x, estado: 'publicada', ingreso: new Date(Date.now() - x.recibida * 864e5).toISOString().slice(0, 10) }));
    m.forEach(x => delete x.recibida);
    m.find(x => x.id === 'multistrada').estado = 'reservada';
    guardar(CLAVE_MOTOS, m);
  }
  return m;
}
export function guardarMoto(moto) {
  const lista = listarMotos();
  const i = lista.findIndex(x => x.id === moto.id);
  if (i >= 0) lista[i] = moto; else lista.unshift(moto);
  return guardar(CLAVE_MOTOS, lista);
}
export function borrarMoto(id) { return guardar(CLAVE_MOTOS, listarMotos().filter(x => x.id !== id)); }
export const motosVisibles = () => listarMotos().filter(m => m.estado === 'publicada' || m.estado === 'reservada');

// ---------- citas ----------
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const deIso = s => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
export function lunesDe(fecha) { const d = new Date(fecha); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }

// citas de ejemplo alrededor de hoy (semana pasada a tres semanas adelante), siempre las mismas para una fecha dada
function citasDeEjemplo() {
  const nombres = ['Andrés Gómez', 'Carolina Ríos', 'Julián Restrepo', 'Mateo Úsuga', 'Paula Henao', 'Santiago Ochoa', 'Daniela Arango', 'Felipe Correa', 'Camilo Zapata', 'Valentina Mejía', 'Esteban Vélez', 'Sergio Cardona'];
  const motos = ['BMW R 1200 GS 2016', 'BMW R 1250 GS 2020', 'KTM 890 Adventure 2022', 'Honda Africa Twin 2019', 'Triumph Tiger 900 2021', 'Ducati Multistrada V4 2022', 'BMW F 850 GS 2020', 'Yamaha Ténéré 700 2023', 'Suzuki V-Strom 1050 2021', 'Kawasaki Versys 1000 2019'];
  const servicios = ['Revisión por kilometraje', 'Cambio de aceite', 'Diagnóstico con scanner', 'Suspensión y frenos', 'Revisión de viaje', 'Mecánica y reparación'];
  const notas = ['', '', 'Suena un golpeteo al pasar por baches', '', 'Se prende la luz de servicio', 'Sale de viaje a la costa el sábado', '', 'Vibra a 120 km/h'];
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const inicio = lunesDe(hoy); inicio.setDate(inicio.getDate() - 7);
  const citas = []; let n = 0;
  for (let i = 0; i < 35; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i);
    if (d.getDay() === 0) continue;
    const horas = d.getDay() === 6 ? HORAS_TALLER.sabado : HORAS_TALLER.semana;
    for (const h of horas) {
      if (((d.getDate() * 7 + h * 13 + d.getMonth() * 3) % 10) >= 3) continue;
      const servicio = servicios[(d.getDate() + h) % servicios.length];
      const pasado = d < hoy, esHoy = d.getTime() === hoy.getTime();
      citas.push({
        id: `ej-${iso(d)}-${h}`, fecha: iso(d), hora: h, horas: horasDe(servicio), servicio,
        moto: motos[(n * 3 + h) % motos.length], km: `${(12 + ((n * 7) % 50)) * 1000}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
        nombre: nombres[n % nombres.length], tel: `300 555 ${String(1000 + n * 37).slice(-4)}`,
        nota: notas[n % notas.length], recoger: n % 9 === 4, origen: n % 4 === 0 ? 'taller' : 'web',
        estado: pasado ? 'lista' : esHoy ? (h < 12 ? 'en-taller' : 'confirmada') : n % 3 === 0 ? 'pendiente' : 'confirmada',
        creada: new Date(d.getTime() - 3 * 864e5).toISOString(),
      });
      n++;
    }
  }
  return citas;
}
export function listarCitas() {
  let c = leer(CLAVE_CITAS);
  if (!Array.isArray(c)) { c = citasDeEjemplo(); guardar(CLAVE_CITAS, c); }
  return c;
}
export function guardarCita(cita) {
  const lista = listarCitas();
  const i = lista.findIndex(x => x.id === cita.id);
  if (i >= 0) lista[i] = cita; else lista.push(cita);
  return guardar(CLAVE_CITAS, lista);
}
export function borrarCita(id) { return guardar(CLAVE_CITAS, listarCitas().filter(x => x.id !== id)); }
// un turno está tomado si alguna cita activa llega a esa hora ese día
export const turnoOcupado = (fecha, hora, sinId) => listarCitas().some(c => c.fecha === iso(fecha) && c.hora === hora && c.estado !== 'cancelada' && c.id !== sinId);
export const nuevoId = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ---------- blog ----------
// Cada artículo es su texto Markdown completo ({ id, md, actualizado }); la ficha y el HTML salen de js/blog-md.js.
// Los de ejemplo se leen de blog/articulos/ la primera vez.
export async function listarArticulos() {
  let a = leer(CLAVE_BLOG);
  if (Array.isArray(a)) return a;
  const base = new URL('../blog/articulos/', import.meta.url);
  try {
    const nombres = await (await fetch(new URL('index.json', base))).json();
    a = await Promise.all(nombres.map(async n => ({ id: n.replace(/\.md$/, ''), md: await (await fetch(new URL(n, base))).text(), actualizado: null })));
  } catch { a = []; }
  guardar(CLAVE_BLOG, a);
  return a;
}
export async function guardarArticulo(articulo) {
  const lista = await listarArticulos();
  const i = lista.findIndex(x => x.id === articulo.id);
  if (i >= 0) lista[i] = articulo; else lista.unshift(articulo);
  return guardar(CLAVE_BLOG, lista);
}
export async function borrarArticulo(id) { return guardar(CLAVE_BLOG, (await listarArticulos()).filter(x => x.id !== id)); }

export function restablecer() {
  try { for (const k of [CLAVE_MOTOS, CLAVE_CITAS, CLAVE_BLOG]) localStorage.removeItem(k); } catch {}
  delete memoria[CLAVE_MOTOS]; delete memoria[CLAVE_CITAS]; delete memoria[CLAVE_BLOG];
}
// avisa cuando otra pestaña (la web o el backoffice) cambia los datos
export function alCambiar(fn) {
  addEventListener('storage', e => { if ([CLAVE_MOTOS, CLAVE_CITAS, CLAVE_BLOG, null].includes(e.key)) fn(); });
}

// fotos: se reducen a WebP de 1200 px para que quepan en el navegador
export function prepararFoto(archivo, lado = 1200, calidad = 0.8) {
  return new Promise((ok, mal) => {
    const img = new Image(); const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/webp', calidad));
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}
