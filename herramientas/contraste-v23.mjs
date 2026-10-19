// Contraste (WCAG) de lo nuevo de la v2.3 en los cuatro temas: proyección de la próxima quincena, aviso
// ámbar, «Lo pagas con», calendario, puertas de Mi dinero, resumen del periodo y la lista de pagos.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'telefono.html')).href;
const b = await abrir({ puerto: 9761 });
await b.tamano(390, 844);
const medir = (pares) => `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const fondo = (el) => { const capas = []; for (let e = el; e; e = e.parentElement) { const v = rgba(getComputedStyle(e).backgroundColor); if (v[3] > 0) { capas.push(v); if (v[3] >= 0.999) break; } } let base = [255,255,255]; for (const v of capas.reverse()) base = base.map((x, i) => x * (1 - v[3]) + v[i] * v[3]); return base; };
  const lum = (c) => { const [r,g,bb] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126*r + 0.7152*g + 0.0722*bb; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const out = {};
  for (const [n, sel] of ${JSON.stringify(pares)}) { const el = document.querySelector(sel); if (!el) { out[n] = 'falta'; continue; } out[n] = Math.round(ratio(rgba(getComputedStyle(el).color).slice(0,3), fondo(el)) * 100) / 100; }
  return out;
})()`;
const informe = {};
for (const tema of ['serena-claro', 'serena-oscuro', 'ancla-claro', 'ancla-oscuro']) {
    const r = {};
    await b.ir('about:blank');
    await b.ir(url + '#caso=C20&tema=' + tema);
    await esperar(300);
    Object.assign(r, await b.evaluar(medir([['proyección título', '.proy-t'], ['proyección línea', '.proy-l'], ['aviso ámbar título', '.aviso-hoy .nota-t'], ['aviso ámbar texto', '.aviso-hoy p:not(.nota-t)']])));
    await b.evaluar('P.acciones.reservarOk && P.abrirHoja("reservar", { id: "2026-10-30", fecha: "2026-10-23" }); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['reservar texto', '.hoja .txt'], ['reservar ayuda', '.hoja .fila-s']])));
    await b.evaluar('P.cerrarHoja(); P.abrir("pago", "alquiler"); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['lo pagas con', '#f-con ~ .mini-desglose li span, section[aria-labelledby=f-con] .mini-desglose li span'], ['cambiar o repartir', '[data-fk=pagar-con]']])));
    await b.evaluar('P.irTab("pagos"); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['resumen del periodo', '.per-res-l'], ['pestaña elegida', '.pagos-modo .app-tab[aria-selected=true]'], ['pestaña sin elegir', '.pagos-modo .app-tab[aria-selected=false]']])));
    await b.evaluar('P.ui.pagosModo = "lista"; P.render(); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['lista: detalle', 'section[aria-labelledby=mp-ingresos] .fila-s'], ['lista: principal', '.pronto']])));
    await b.evaluar('P.irTab("midinero"); true');
    await esperar(150);
    Object.assign(r, await b.evaluar(medir([['puerta título', '.puerta-t'], ['puerta cifra', '.puerta-n'], ['puerta detalle', '.puerta .fila-s']])));
    await b.evaluar('P.irTab("hoy"); P.acciones.anotar(); const q = document.getElementById("anotar-q"); q.value = "pupusas 6"; q.dispatchEvent(new Event("input", { bubbles: true })); P.acciones.anotarEditar({ campo: "fecha" }); true');
    await esperar(200);
    Object.assign(r, await b.evaluar(medir([['calendario día', '.cal-d:not(.cal-d--hoy):not([aria-pressed=true]):not(:disabled)'], ['calendario elegido', '.cal-d[aria-pressed=true]'], ['calendario semana', '.cal-sem span'], ['calendario mes', '.cal-mes']])));
    informe[tema] = r;
}
const valores = Object.values(informe).flatMap((r) => Object.values(r)).filter((x) => typeof x === 'number');
console.log(JSON.stringify({ minimo: Math.min(...valores), informe, errores: b.errores }, null, 1));
b.cerrar();
