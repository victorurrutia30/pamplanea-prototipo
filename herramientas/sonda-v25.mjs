// Sonda rápida v2.5 (desarrollo): recorre un capítulo con «Hazlo por mí» y guarda capturas de cada momento.
// Uso: node herramientas/sonda-v25.mjs [--version=fijo] [--cap=esencial] [--tema=serena-claro]
import path from 'node:path';
import { rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const version = args.version || 'fijo';
const capId = args.cap || 'esencial';
const tema = args.tema || 'serena-claro';
const salida = path.join(root, 'capturas', 'sonda-v25', `${version}-${capId}-${tema}`);
await rm(salida, { recursive: true, force: true });
const b = await abrir({ puerto: Number(args.puerto || 9941) });
await b.tamano(390, 844);
const ev = (s) => b.evaluar(s);
const js = JSON.stringify;
let n = 0;
const foto = async (x) => { await esperar(1100); await b.captura(path.join(salida, `${String(++n).padStart(2, '0')}-${x}.png`)); };
const clic = async (sel) => { const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`); if (!ok) throw new Error('no ' + sel + ' · ' + JSON.stringify(await estado())); await esperar(250); };
const estado = () => ev(`({ fase: P.tour.fase, i: P.tour.i, t: document.getElementById('tour-t')?.innerText, x: (document.getElementById('tour-x')?.innerText || document.getElementById('tour-instr')?.innerText || '').replace(/\s+/g, ' ') })`);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__fechaPrueba = "2026-10-18";' });
await b.ir(pathToFileURL(root).href + '/telefono.html#tema=' + tema);
await ev('localStorage.clear(); true');
await b.ir(pathToFileURL(root).href + '/telefono.html#tema=' + tema);
await esperar(500);
try {
  await clic('[data-fk="elegir-aprender"]');
  await clic(`[data-fk="tour-version-${version}"]`);
  if (capId !== 'esencial') await ev(`P.tour.empezarCap(${js(version)}, ${js(capId)}); true`);
  await esperar(400);
  for (let guard = 0; guard < 40; guard++) {
    const s = await estado();
    console.log(JSON.stringify(s));
    await foto(`${s.fase}-${s.i + 1}`);
    if (s.fase === 'intro') await clic('[data-fk="tour-empezar"]');
    else if (s.fase === 'paso') {
      if (await ev('!!document.querySelector("[data-fk=tour-ejemplo]")')) { await clic('[data-fk="tour-ejemplo"]'); await foto('ejemplo'); console.log(JSON.stringify(await estado())); await clic('[data-fk="tour-ejemplo-volver"]'); await esperar(300); }
      if (await ev('!!document.querySelector("[data-fk=tour-hazlo]")')) await clic('[data-fk="tour-hazlo"]');
      else if (await ev('!!document.querySelector("[data-fk=tour-volver-pregunta]")')) await clic('[data-fk="tour-volver-pregunta"]');
      else await clic('[data-fk="tour-sig"]');
    } else if (s.fase === 'hazlo') { await clic('[data-fk="tour-por-mi"]'); await esperar(500); }
    else if (s.fase === 'pausa') await clic('[data-fk="tour-entendido"]');
    else if (s.fase === 'pregunta') {
      if (await ev('!!P.tour.fb')) { if (await ev('P.tour.fb.ok')) await clic('[data-fk="tour-terminar"]'); else { await clic('[data-fk="tour-repasar"]'); } }
      else { const bien = await ev('P.tour.cap.pregunta.bien'); const yaRepaso = await ev('!!window.__repaso'); await clic(`[data-fk="tour-op-${yaRepaso ? bien : (bien + 1) % 3}"]`); await ev('window.__repaso = true'); }
    } else if (s.fase === 'fin') { await foto('fin'); break; }
    await esperar(350);
  }
} catch (e) { console.log('ERROR', e.message); await foto('error'); }
console.log('errores', JSON.stringify(b.errores));
b.cerrar();
