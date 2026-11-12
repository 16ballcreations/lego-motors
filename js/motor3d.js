// Portada y despiece: un bóxer de dos cilindros (tipo R 1200 GS refrigerada por aire y líquido)
// flotando en el vacío, con anillos naranjas, un haz de luz y tornillería que gira y se aparta del cursor.
// El motor está modelado por piezas para que el scroll lo pueda abrir.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const lienzo = document.getElementById('lienzo');
const despiece = document.getElementById('despiece');
const textoDespiece = document.querySelector('.despiece__texto');
const listaPiezas = document.getElementById('piezas');
const barraProgreso = document.getElementById('progreso');
const barra = document.getElementById('barra');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = matchMedia('(pointer: coarse)').matches;

const NARANJA = new THREE.Color('#fe3b00');

// ---------- render ----------
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, tactil ? 1.5 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const escena = new THREE.Scene();
escena.background = new THREE.Color('#0a0a0b');
escena.fog = new THREE.FogExp2('#0a0a0b', 0.06);
const pmrem = new THREE.PMREMGenerator(renderer);
escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
escena.environmentIntensity = 0.5;

const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

// una sola luz manda: el haz que cae desde arriba; los anillos dan el contraluz naranja
const haz = new THREE.SpotLight('#fff3e6', 55, 22, 0.55, 1, 1.3);
haz.position.set(0, 9, 0.6);
haz.target.position.set(0, 0, 0);
escena.add(haz, haz.target);
const rimA = new THREE.PointLight(NARANJA, 7, 9, 1.6); rimA.position.set(-2.4, 1.6, -1.8);
const rimB = new THREE.PointLight(NARANJA, 5, 9, 1.6); rimB.position.set(2.6, -1.4, -1.2);
// luz del motor: se enciende cuando la moto se abre y lo deja como protagonista
const luzMotor = new THREE.PointLight('#fff1e2', 0, 5, 1.5); luzMotor.position.set(0.6, 1.1, 1.6);
escena.add(luzMotor);
escena.add(rimA, rimB, new THREE.HemisphereLight('#ffffff', '#1a0d08', 0.12));

// ---------- materiales ----------
const mat = {
  alu: new THREE.MeshPhysicalMaterial({ color: '#c3c7cc', metalness: 1, roughness: 0.3 }),
  aluMate: new THREE.MeshStandardMaterial({ color: '#a9adb3', metalness: 1, roughness: 0.5 }),
  fundido: new THREE.MeshStandardMaterial({ color: '#5d6168', metalness: 0.85, roughness: 0.55 }),
  negro: new THREE.MeshPhysicalMaterial({ color: '#0d0d0f', metalness: 0.2, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.18 }),
  acero: new THREE.MeshStandardMaterial({ color: '#b89c82', metalness: 1, roughness: 0.26 }),
  cromo: new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.1 }),
  naranja: new THREE.MeshStandardMaterial({ color: NARANJA, metalness: 0.35, roughness: 0.38 }),
  piston: new THREE.MeshStandardMaterial({ color: '#d9dce0', metalness: 1, roughness: 0.22 }),
};

// ---------- utilidades de forma ----------
const caja = (x, y, z, r, m) => new THREE.Mesh(new RoundedBoxGeometry(x, y, z, 4, r), m);
function cilindroX(r, largo, m, seg = 40) { // eje a lo largo de X (como los cilindros del bóxer)
  const g = new THREE.CylinderGeometry(r, r, largo, seg); g.rotateZ(Math.PI / 2); return new THREE.Mesh(g, m);
}
function cilindroZ(r, largo, m, seg = 48) { // eje a lo largo de Z (adelante-atrás de la moto)
  const g = new THREE.CylinderGeometry(r, r, largo, seg); g.rotateX(Math.PI / 2); return new THREE.Mesh(g, m);
}
function hexagono(r, h) { return new THREE.CylinderGeometry(r, r, h, 6); }
function engranajeGeo(dientes, r, h) {
  const s = new THREE.Shape(); const n = dientes * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2; const fase = i % 4;
    const rr = fase === 0 || fase === 1 ? r : r * 0.82;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const hueco = new THREE.Path(); hueco.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true); s.holes.push(hueco);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: h * 0.15, bevelSize: h * 0.15, bevelSegments: 1, curveSegments: 4 });
  g.center(); return g;
}

// ---------- la moto: BMW R 1200 GS Adventure 2014 (modelo de OUTPISTON, CC BY-NC-SA 4.0) ----------
// Viene en 16 piezas; en «pieza por pieza» el scroll la desarma alrededor del motor y cada etiqueta dice qué se le hace.
const motor = new THREE.Group();   // contenedor de la moto completa (se llama motor por el despiece)
escena.add(motor);
const piezas = []; // { nombre, sub, obj, dir, ancla, orden, etiqueta }

// cómo sale cada pieza (ejes del modelo: x hacia adelante, y arriba, z a la derecha)
const DESPIECE = {
  SM_Engine:    { nombre: 'Motor bóxer', sub: 'Aceite, filtros, válvulas y bujías', dir: [0, 0, 0], orden: 0 },
  SM_Base:      { nombre: 'Tanque', sub: 'Bomba y filtro de gasolina', dir: [0, 0.75, 0], orden: 2 },
  SM_FrontKit:  { nombre: 'Faro y tablero', sub: 'Luces, parte eléctrica y scanner', dir: [0.5, 0.8, 0], orden: 3 },
  SM_Fork:      { nombre: 'Suspensión delantera', sub: 'Retenedores, aceite y rodamientos', dir: [0.8, 0.15, 0], orden: 2 },
  SM_Frame:     { nombre: 'Chasis', sub: 'Torque de toda la tornillería', dir: [0, 0.35, 0], orden: 1 },
  SM_Swingarm:  { nombre: 'Cardán', sub: 'Aceite del cardán y crucetas', dir: [-0.6, -0.22, 0], orden: 2 },
  SM_Exhaust:   { nombre: 'Escape', sub: 'Colector, sensores y fugas', dir: [-0.25, -0.5, 0.55], orden: 1 },
  SM_RearKit:   { nombre: 'Asiento y batería', sub: 'Carga y estado de la batería', dir: [-0.6, 0.65, 0], orden: 3 },
  SM_Hub_F:     { nombre: 'Freno y rueda delantera', sub: 'Pastillas, discos, líquido y llanta', dir: [1.25, -0.15, 0], orden: 4 },
  SM_Hub_R:     { nombre: 'Freno y rueda trasera', sub: 'Pastillas, ABS y presión de llanta', dir: [-1.25, -0.15, 0], orden: 4 },
};
// piezas que viajan pegadas a otra
const SIGUE = { SM_Tire_F: 'SM_Hub_F', SM_Disk_F: 'SM_Hub_F', SM_Fender_F: 'SM_Fork', SM_Tire_R: 'SM_Hub_R', SM_Disk_R: 'SM_Hub_R', SM_Fender_R: 'SM_Hub_R' };
const base = n => n.replace(/_0000.*$/, '');

const ESCALA_MOTO = 2.15;
let motoLista = false;
const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
cargador.load('media/3d/r1200gsa.glb', gltf => {
  const moto = gltf.scene;
  // centrar en el motor para que el despiece abra alrededor de él
  const motorNodo = moto.getObjectByName('SM_Engine_0000.005') || moto.children.find(c => base(c.name) === 'SM_Engine');
  const caja = new THREE.Box3().setFromObject(motorNodo);
  const centro = caja.getCenter(new THREE.Vector3());
  moto.position.sub(centro).add(new THREE.Vector3(0, -0.12, 0));
  motor.add(moto);
  motor.scale.setScalar(ESCALA_MOTO);
  motor.rotation.y = -0.35;

  moto.traverse(o => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      m.envMapIntensity = 1.2;
      if (/Glass/i.test(m.name)) { m.transparent = true; m.opacity = 0.35; m.depthWrite = false; }
    }
  });

  const grupos = {};
  for (const hijo of [...moto.children]) {
    const n = base(hijo.name);
    if (DESPIECE[n]) grupos[n] = hijo;
  }
  for (const hijo of [...moto.children]) {
    const n = base(hijo.name), padre = grupos[SIGUE[n]];
    if (padre) padre.attach(hijo);
  }
  for (const [n, d] of Object.entries(DESPIECE)) {
    const obj = grupos[n]; if (!obj) continue;
    obj.userData.base = obj.position.clone();
    const b = new THREE.Box3().setFromObject(obj);
    const anclaMundo = b.getCenter(new THREE.Vector3());
    const ancla = obj.worldToLocal(anclaMundo.clone());
    // la dirección viene en ejes del modelo; se pasa a los ejes locales del padre (moto)
    piezas.push({ ...d, obj, dir: new THREE.Vector3(...d.dir).multiplyScalar(1.2), ancla, etiqueta: true });
  }
  // recorrido de adelante hacia atrás (x del modelo)
  piezas.sort((a, b) => a.obj.localToWorld(a.ancla.clone()).x < b.obj.localToWorld(b.ancla.clone()).x ? 1 : -1);
  piezas.forEach((p, i) => (p.turno = i));
  crearEtiquetas();
  motoLista = true;
}, undefined, err => console.error('No se pudo cargar la moto', err));

// ---------- anillos, haz de luz y polvo ----------
// anillos de neón: tubo con el centro caliente y los bordes en su color; el bloom les da un halo suave
function materialNeon(borde, centro, intensidad, opacidad = 1) {
  return new THREE.ShaderMaterial({
    transparent: opacidad < 1, depthWrite: opacidad >= 1,
    uniforms: { uBorde: { value: new THREE.Color(borde) }, uCentro: { value: new THREE.Color(centro) }, uIntensidad: { value: intensidad }, uOpacidad: { value: opacidad } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uBorde; uniform vec3 uCentro; uniform float uIntensidad; uniform float uOpacidad;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
        vec3 c = mix(uBorde, uCentro, pow(f, 2.2)) * (0.7 + uIntensidad * pow(f, 3.0));
        gl_FragColor = vec4(c, uOpacidad * (0.55 + 0.45 * f));
      }`,
  });
}
function anillo(r, grueso, material) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, grueso, 16, 260), material);
  m.rotation.x = Math.PI / 2; escena.add(m); return m;
}
// colores en lineal: naranja de la marca con centro ámbar; rojo profundo con centro coral
const anilloArriba = anillo(3.3, 0.03, materialNeon('#ff3a00', '#ffb27a', 2.6));
anilloArriba.position.y = 2.05; anilloArriba.rotation.set(Math.PI / 2 - 0.22, 0.08, 0);
const anilloAbajo = anillo(2.6, 0.027, materialNeon('#ff3a00', '#ffb27a', 2.4));
anilloAbajo.position.y = -1.7; anilloAbajo.rotation.set(Math.PI / 2 - 0.16, -0.06, 0);
const orbitas = [anillo(4.3, 0.013, materialNeon('#c40d00', '#ff6a4a', 1.8, 0.85)), anillo(5.2, 0.011, materialNeon('#a80800', '#ff5a3a', 1.5, 0.7))];
orbitas[0].rotation.set(Math.PI / 2 - 0.5, 0.3, 0); orbitas[1].rotation.set(Math.PI / 2 + 0.35, -0.2, 0);

const conoGeo = new THREE.CylinderGeometry(0.8, 3.4, 9, 64, 1, true); conoGeo.translate(0, 3.2, 0);
const conoMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uFuerza: { value: 0.035 } },
  vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
    void main(){ vY = position.y; vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float uFuerza; varying float vY; varying vec3 vN; varying vec3 vV;
    void main(){ float borde = pow(abs(dot(vN, vV)), 4.0); float alto = smoothstep(-1.8, 3.0, vY) * (1. - smoothstep(3.5, 7.6, vY));
      gl_FragColor = vec4(vec3(1., .93, .84) * borde * alto * uFuerza, 1.); }`,
});
escena.add(new THREE.Mesh(conoGeo, conoMat));

const nPolvo = tactil ? 260 : 600;
const polvoPos = new Float32Array(nPolvo * 3);
for (let i = 0; i < nPolvo; i++) {
  const r = Math.sqrt(Math.random()) * 2.3, a = Math.random() * Math.PI * 2;
  polvoPos.set([Math.cos(a) * r, -1.5 + Math.random() * 7, Math.sin(a) * r], i * 3);
}
const polvoGeo = new THREE.BufferGeometry(); polvoGeo.setAttribute('position', new THREE.BufferAttribute(polvoPos, 3));
const polvo = new THREE.Points(polvoGeo, new THREE.PointsMaterial({ color: '#ffd9bf', size: 0.016, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
escena.add(polvo);

// ---------- tornillería en espiral ----------
const tuercaGeo = (() => { const g = hexagono(0.07, 0.05); return g; })();
const pernoGeo = (() => {
  const cabeza = hexagono(0.06, 0.045); cabeza.translate(0, 0.11, 0);
  const vastago = new THREE.CylinderGeometry(0.026, 0.026, 0.22, 10);
  return mergeGeometries([cabeza, vastago]);
})();
const arandelaGeo = (() => { const g = new THREE.TorusGeometry(0.06, 0.018, 8, 24); g.scale(1, 1, 0.5); return g; })();
const pinonGeo = engranajeGeo(12, 0.11, 0.035);
const nPorTipo = tactil ? 16 : 34;
const tipos = [
  { geo: tuercaGeo, mat: mat.alu }, { geo: pernoGeo, mat: mat.cromo },
  { geo: arandelaGeo, mat: mat.aluMate }, { geo: pinonGeo, mat: mat.fundido },
];
const restos = [];
const dummy = new THREE.Object3D();
for (const t of tipos) {
  const im = new THREE.InstancedMesh(t.geo, t.mat, nPorTipo);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < nPorTipo; i++) {
    restos.push({
      im, i,
      r: 3.9 + Math.random() * 2.0, a: Math.random() * Math.PI * 2, y: -2 + Math.random() * 4.2,
      vel: (0.05 + Math.random() * 0.09) * (Math.random() < 0.85 ? 1 : -1),
      giro: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(), vGiro: 0.3 + Math.random() * 1.2,
      escala: 0.45 + Math.random() * 0.75, fase: Math.random() * 10,
      empuje: new THREE.Vector3(), q: new THREE.Quaternion().random(),
    });
  }
  escena.add(im);
}
// unas pocas piezas naranja entre la tornillería
const naranjas = new THREE.InstancedMesh(tuercaGeo, mat.naranja, 6);
for (let i = 0; i < 6; i++) restos.push({ im: naranjas, i, r: 2.6 + Math.random() * 2, a: Math.random() * 6.28, y: -1.5 + Math.random() * 3.4, vel: 0.07, giro: new THREE.Vector3(1, 0.3, 0).normalize(), vGiro: 0.8, escala: 1.2, fase: i, empuje: new THREE.Vector3(), q: new THREE.Quaternion().random() });
escena.add(naranjas);

// ---------- posprocesado ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(escena, camara));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.45, 1.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- etiquetas del despiece ----------
let conEtiqueta = [];
function crearEtiquetas() {
  conEtiqueta = piezas.filter(p => p.etiqueta);
  for (const p of conEtiqueta) {
    const li = document.createElement('li'); li.className = 'pieza';
    li.innerHTML = `<button type="button" aria-label="Acercar: ${p.nombre}"><span>${p.nombre}<small>${p.sub}</small></span></button>`;
    li.querySelector('button').addEventListener('click', () => enfocar(foco === p ? null : p));
    listaPiezas.appendChild(li); p.li = li;
  }
}

// ---------- zoom a una pieza ----------
let foco = null, zoom = 0;
const volver = document.getElementById('volver-moto');
const focoMundo = new THREE.Vector3(), mirada = new THREE.Vector3();
function enfocar(p) {
  foco = p;
  document.body.classList.toggle('con-foco', !!p);
  for (const q of conEtiqueta) q.li.classList.toggle('elegida', q === p);
  volver.hidden = !p;
}
volver.addEventListener('click', () => enfocar(null));
addEventListener('keydown', e => { if (e.key === 'Escape' && foco) enfocar(null); });

// ---------- interacción ----------
const raton = new THREE.Vector2(9, 9);       // en coordenadas normalizadas
const ratonSuave = new THREE.Vector2(0, 0);
const plano = new THREE.Plane();
const rayo = new THREE.Raycaster();
const puntoRaton = new THREE.Vector3(999, 999, 999);
addEventListener('pointermove', e => { raton.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); }, { passive: true });
document.addEventListener('pointerleave', () => raton.set(9, 9));

let ancho = 0, alto = 0, angosto = false;
function medir() {
  ancho = innerWidth; alto = innerHeight; angosto = ancho / alto < 0.8;
  renderer.setSize(ancho, alto, false);
  composer.setSize(ancho, alto);
  bloom.resolution.set(ancho / 2, alto / 2);
  camara.aspect = ancho / alto; camara.updateProjectionMatrix();
}
addEventListener('resize', medir);
medir();

// progreso del scroll: 0 portada → 1 motor abierto
let abierto = 0, abiertoSuave = 0, visible = true;
function leerScroll() {
  const r = despiece.getBoundingClientRect();
  // la moto se desarma mientras la sección entra a la pantalla: al llegar ya está separada
  abierto = THREE.MathUtils.clamp((innerHeight - r.top) / innerHeight, 0, 1);
  visible = r.bottom > 0;
  if (foco && (abierto < 0.6 || r.bottom < innerHeight * 0.5)) enfocar(null);
  lienzo.classList.toggle('apagado', r.bottom < innerHeight * 0.35);
  textoDespiece.classList.toggle('visible', r.top < innerHeight * 0.3 && r.bottom > innerHeight * 0.6);
  barraProgreso.style.height = (THREE.MathUtils.clamp(-r.top / (r.height - innerHeight), 0, 1) * 100).toFixed(1) + '%';
  barra.classList.toggle('solida', scrollY > innerHeight * 0.6);
}
addEventListener('scroll', leerScroll, { passive: true });
leerScroll();

const suave = t => t * t * (3 - 2 * t);
const v = new THREE.Vector3();
let angulo = 0.35, ultimo = performance.now(), primero = true;

function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  const dt = Math.min((ahora - ultimo) / 1000, 0.05); ultimo = ahora;
  if (!visible && !primero) return;
  const t = ahora / 1000;

  abiertoSuave += (abierto - abiertoSuave) * Math.min(1, dt * 6);
  const A = abiertoSuave;

  // cámara que nunca deja de girar; se acerca cuando el motor se abre
  if (!quieto) angulo += dt * 0.09 * (1 - Math.min(1, A * 3));
  ratonSuave.lerp(raton.x > 5 ? new THREE.Vector2() : raton, Math.min(1, dt * 2.5));
  const dist = (angosto ? 19 : 13.5) + A * (angosto ? 9 : 3);
  const elev = 0.2 + A * 0.18 + ratonSuave.y * 0.08;
  // al abrirse, la cámara busca la vista de lado (tres cuartos) para que las piezas no se tapen
  const lado = motor.rotation.y + 0.42;
  const dif = THREE.MathUtils.euclideanModulo(lado - angulo + Math.PI, Math.PI * 2) - Math.PI;
  const ang = angulo + dif * suave(Math.min(1, A * 1.8)) + ratonSuave.x * 0.18;
  // zoom: la cámara se acerca a la pieza elegida sin perder el ángulo
  zoom += ((foco ? 1 : 0) - zoom) * Math.min(1, dt * 3.2);
  const Z = suave(zoom);
  const mira = angosto ? 0.9 + A * 0.7 : 0;
  mirada.set(0, -mira, 0);
  if (foco) { focoMundo.copy(foco.ancla); foco.obj.localToWorld(focoMundo); }
  mirada.lerp(focoMundo, Z);
  const d = THREE.MathUtils.lerp(dist, angosto ? 7.5 : 5, Z);
  camara.position.set(Math.sin(ang) * Math.cos(elev) * d, Math.sin(elev) * d, Math.cos(ang) * Math.cos(elev) * d).add(mirada);
  camara.lookAt(mirada);
  // en escritorio la moto abierta se corre a la derecha para dejarle sitio al texto
  if (!angosto) camara.setViewOffset(ancho, alto, -ancho * 0.16 * A * (1 - Z * 0.4), 0, ancho, alto); else camara.clearViewOffset();

  luzMotor.intensity = suave(Math.min(1, A * 1.5)) * 5;
  // motor flotando
  motor.position.y = (quieto ? 0 : Math.sin(t * 0.8) * 0.06) + (angosto ? 0.2 : 0.05);
  motor.rotation.x = Math.sin(t * 0.5) * 0.025;

  // despiece: cada pieza sale en su turno
  for (const p of piezas) {
    const e = suave(THREE.MathUtils.clamp(A * 1.5 - p.orden * 0.08, 0, 1));
    p.obj.position.copy(p.obj.userData.base).addScaledVector(p.dir, e);
    p.e = e;
  }

  // anillos y luz
  anilloArriba.rotation.z = t * 0.05; anilloAbajo.rotation.z = -t * 0.07;
  anilloArriba.position.y = 2.05 + A * 0.4 + Math.sin(t * 0.6) * 0.04;
  anilloAbajo.position.y = -1.7 - A * 0.4 + Math.sin(t * 0.7 + 1) * 0.04;
  orbitas[0].rotation.z = t * 0.03; orbitas[1].rotation.z = -t * 0.02;
  polvo.rotation.y = t * 0.02;
  const pp = polvoGeo.attributes.position;
  for (let i = 0; i < nPolvo; i++) { let y = pp.getY(i) + dt * 0.05; if (y > 5.5) y = -1.5; pp.setY(i, y); }
  pp.needsUpdate = true;

  // tornillería: espiral lenta que se abre alrededor del cursor
  plano.setFromNormalAndCoplanarPoint(camara.getWorldDirection(v).negate(), new THREE.Vector3());
  if (raton.x < 5 && !tactil) { rayo.setFromCamera(raton, camara); rayo.ray.intersectPlane(plano, puntoRaton); }
  else puntoRaton.set(999, 999, 999);
  const qGiro = new THREE.Quaternion();
  for (const r of restos) {
    if (!quieto) r.a += r.vel * dt;
    const rr = r.r + A * 0.8 + Z * 4;
    dummy.position.set(Math.cos(r.a) * rr, r.y + Math.sin(t * 0.4 + r.fase) * 0.15 + Math.sin(r.a * 2) * 0.25, Math.sin(r.a) * rr);
    v.subVectors(dummy.position, puntoRaton);
    const d = v.length();
    const objetivo = d < 1.6 ? v.normalize().multiplyScalar((1.6 - d) * 1.1) : v.set(0, 0, 0);
    r.empuje.lerp(objetivo, Math.min(1, dt * 4));
    dummy.position.add(r.empuje);
    if (!quieto) r.q.multiply(qGiro.setFromAxisAngle(r.giro, r.vGiro * dt));
    dummy.quaternion.copy(r.q);
    dummy.scale.setScalar(r.escala);
    dummy.updateMatrix();
    r.im.setMatrixAt(r.i, dummy.matrix);
  }
  for (const t2 of new Set(restos.map(r => r.im))) t2.instanceMatrix.needsUpdate = true;

  composer.render();

  // etiquetas siguen a sus piezas
  motor.updateMatrixWorld();
  for (const p of conEtiqueta) {
    v.copy(p.ancla); p.obj.localToWorld(v); v.project(camara);
    const x = (v.x * 0.5 + 0.5) * ancho, y = (-v.y * 0.5 + 0.5) * alto;
    const izq = x > ancho * (angosto ? 0.55 : 0.72);
    p.li.classList.toggle('pieza--izq', izq);
    p.li.style.transform = izq ? `translate(calc(${x + 4.5}px - 100%), ${y - 4.5}px)` : `translate(${x - 4.5}px, ${y - 4.5}px)`;
    // van apareciendo de adelante hacia atrás y se quedan
    const paso = (A - 0.3) / 0.6 * conEtiqueta.length;
    const enTurno = A > 0.3 && p.turno <= paso && p.e > 0.5;
    p.li.classList.toggle('visible', enTurno && v.z < 1 && x > 12 && x < ancho - 12 && (!angosto || y < alto * 0.56));
  }

  if (primero && motoLista) { primero = false; document.getElementById('carga').classList.add('listo'); }
}
requestAnimationFrame(cuadro);
setTimeout(() => document.getElementById('carga').classList.add('listo'), 3000);
