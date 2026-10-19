// Contraste (WCAG) de lo nuevo de la v2.1 en los cuatro temas: barra de la tarea, botones Listo/No pude,
// tarea detectada, enlace de moderador, pasos de instalación y aviso de versión nueva.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'telefono.html')).href;
const b = await abrir({ puerto: 9751 });
await b.tamano(390, 844);
const medir = (pares) => `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const fondo = (el) => { const capas = []; for (let e = el; e; e = e.parentElement) { const v = rgba(getComputedStyle(e).backgroundColor); if (v[3] > 0) { capas.push(v); if (v[3] >= 0.999) break; } } let base = [255,255,255]; for (const v of capas.reverse()) base = base.map((x, i) => x * (1 - v[3]) + v[i] * v[3]); return base; };
  const lum = (c) => { const [r,g,bb] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126*r + 0.7152*g + 0.0722*bb; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const out = {};
  for (const [n, sel] of ${JSON.stringify(pares)}) { const el = document.querySelector(sel); if (!el) continue; out[n] = Math.round(ratio(rgba(getComputedStyle(el).color).slice(0,3), fondo(el)) * 100) / 100; }
  return out;
})()`;
const informe = {};
for (const tema of ['serena-claro', 'serena-oscuro', 'ancla-claro', 'ancla-oscuro']) {
    const r = {};
    await b.ir('about:blank');
    // v2.6.1: desde la v2.6 la bienvenida de la prueba se abre sola solo con el enlace de tester (?set=A).
    await b.ir(url + '?set=A#tema=' + tema);
    await b.evaluar('P.sinGuardar = true; localStorage.clear(); true');
    await b.ir('about:blank');
    // v2.6.1: desde la v2.6 la bienvenida de la prueba se abre sola solo con el enlace de tester (?set=A).
    await b.ir(url + '?set=A#tema=' + tema);
    await esperar(300);
    Object.assign(r, await b.evaluar(medir([['bienvenida puntos', '.ay-puntos li'], ['chip perfil', '.ay .chip'], ['solo mirar', '[data-fk=ay-explorar]'], ['versión', '.ay-version']])));
    await b.evaluar('document.querySelector("[data-fk=ay-empezar-prueba]").click(); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['instalar texto', '.ay-pasos-dib span, .ay-card .txt']])));
    await b.evaluar('document.querySelector("[data-fk=ay-inst-saltar]").click(); true');
    await esperar(150);
    await b.evaluar('document.querySelector("[data-fk=ay-comenzar]").click(); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['tarea número', '.tarea-n'], ['tarea texto', '.tarea-txt .tarea-t'], ['Listo', '.tarea-btn--prim'], ['No pude', '.tarea-btn:not(.tarea-btn--prim)']])));
    await b.evaluar('P.acciones.ayTerminar({ v: "listo" }); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['1–5 etiqueta', '.ay-nota-l'], ['paso', '.ay .paso']])));
    await b.evaluar('P.ayuda.cerrar(); P.ayuda.abrir("inicio"); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['modo moderador', '.ay-moderador']])));
    await b.evaluar('P.ayuda.cerrar(); P.cargarCaso("C05"); const d = P.ayuda.datos(); d.prueba.tareas[P.SETS_ID = "pupusas"] = { detectada: true, toques: 0, pantallas: [] }; d.prueba.i = 1; localStorage.setItem("pamplanea-proto-v2:notas", JSON.stringify(d)); P.ayuda.pintarBarra(); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['tarea lograda', '.tarea-txt--ok .tarea-t'], ['Seguir', '.tarea-btn--prim']])));
    informe[tema] = r;
}
const minimo = Math.min(...Object.values(informe).flatMap((r) => Object.values(r)));
console.log(JSON.stringify({ minimo, informe, errores: b.errores }, null, 1));
b.cerrar();
