// Prepara la R 1200 GS Adventure (OUTPISTON, CC BY-NC-SA 4.0) para la demo de LEGO Motors:
// 1. corrige las llantas: la mitad exterior viene con caras y normales hacia adentro;
// 2. cambia la pintura azul por el naranja de la marca, con barniz;
// 3. optimiza para la web (WebP, cuantizado, meshopt).
// Uso: node preparar-r1200gsa.mjs <entrada.glb> <salida.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsClearcoat } from '@gltf-transform/extensions';
import { dedup, prune, weld, reorder, quantize, meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'node:fs';

const [ent, sal] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(ent);

// 1. llantas al derecho: la malla trae media llanta volteada. Cada cara y cada normal
//    se orientan hacia afuera del tubo de la llanta (eje de giro = Y local).
for (const malla of doc.getRoot().listMeshes()) for (const p of malla.listPrimitives()) {
  if (!/Tyre/i.test(p.getMaterial()?.getName() || '')) continue;
  const pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'), idx = p.getIndices();
  const a = [], b = [], c = [], n = [];
  let rmin = Infinity, rmax = 0;
  for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, a); const r = Math.hypot(a[0], a[2]); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
  const R = (rmin + rmax) / 2;
  const afuera = q => { const r = Math.hypot(q[0], q[2]) || 1; return [q[0] - q[0] / r * R, q[1], q[2] - q[2] / r * R]; };
  let caras = 0, normales = 0;
  for (let t = 0; t < idx.getCount(); t += 3) {
    const i0 = idx.getScalar(t), i1 = idx.getScalar(t + 1), i2 = idx.getScalar(t + 2);
    pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
    const m = [0, 1, 2].map(k => (a[k] + b[k] + c[k]) / 3), d = afuera(m);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const f = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (f[0] * d[0] + f[1] * d[1] + f[2] * d[2] < 0) { idx.setScalar(t + 1, i2); idx.setScalar(t + 2, i1); caras++; }
  }
  for (let i = 0; i < nor.getCount(); i++) {
    pos.getElement(i, a); nor.getElement(i, n); const d = afuera(a);
    if (n[0] * d[0] + n[1] * d[1] + n[2] * d[2] < 0) { nor.setElement(i, n.map(x => -x)); normales++; }
  }
  console.log('llanta corregida:', malla.getName(), caras, 'caras y', normales, 'normales volteadas');
}

// 2. pintura naranja de la marca (#FE3B00 en sRGB → lineal), con barniz
const lineal = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const naranja = [0xfe, 0x46, 0x08].map(v => lineal(v / 255));
const barniz = doc.createExtension(KHRMaterialsClearcoat);
for (const m of doc.getRoot().listMaterials()) {
  if (!/CarPaint|R1200GS_Base$/i.test(m.getName())) continue;
  m.setBaseColorTexture(null).setBaseColorFactor([...naranja, 1]).setMetallicFactor(0.25).setRoughnessFactor(0.32);
  m.setExtension('KHR_materials_clearcoat', barniz.createClearcoat().setClearcoatFactor(1).setClearcoatRoughnessFactor(0.08));
  console.log('pintura cambiada:', m.getName());
}

// 2b. el asiento azul pasa a grafito (se conserva la textura de la tela)
for (const m of doc.getRoot().listMaterials()) {
  const tex = m.getBaseColorTexture();
  if (!/Seat/i.test(m.getName()) || !tex) continue;
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (b > r + 25 && b > g + 10) { const l = Math.round((r + g + b) / 3 * 0.55); data[i] = l + 2; data[i + 1] = l + 2; data[i + 2] = l + 4; }
  }
  tex.setImage(await sharp(data, { raw: info }).png().toBuffer()).setMimeType('image/png');
  console.log('asiento a grafito:', m.getName());
}

// 3. optimizar
await doc.transform(
  dedup(), prune(), weld(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 82 }),
  reorder({ encoder: MeshoptEncoder }),
  quantize({ quantizePosition: 14, quantizeTexcoord: 12, quantizeNormal: 10 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
await io.write(sal, doc);
console.log(`${sal} (${(statSync(sal).size / 1024).toFixed(0)} KB)`);
