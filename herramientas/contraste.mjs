// Mide en Chrome el contraste real (WCAG) de los pares de color nuevos del prototipo en los
// cuatro temas: lee los colores calculados de elementos reales de telefono.html.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'telefono.html')).href;
const b = await abrir({ puerto: 9672 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
// Convierte cualquier color CSS a sRGB con un canvas y mezcla el alfa sobre el fondo opaco.
const medir = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const fondo = (el) => { const capas = []; for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const v = rgba(c); if (v[3] > 0) { capas.push(v); if (v[3] >= 0.999) break; } } let base = [255,255,255]; for (const v of capas.reverse()) base = base.map((x, i) => x * (1 - v[3]) + v[i] * v[3]); return base; };
  const lum = (c) => { const [r,g,bb] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126*r + 0.7152*g + 0.0722*bb; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const pares = {};
  const casos = [['chip elegido', '.chip[aria-pressed=true]'], ['separador', '.separador'], ['próximamente', '.pronto'], ['monto ingreso', '.monto--ingreso'], ['monto esperado', '.monto--esperado'], ['texto secundario', '.fila-s'], ['enlace', '.link'], ['estado pagado', '.estado--ok'], ['aviso hora', '.aviso-hora'], ['nota', '.nota p'], ['nota atención', '.nota--atencion p'], ['paso', '.paso'], ['contador', '.contador'], ['toast', '.toast-t'], ['contexto', '.contexto'], ['chip secundario', '.chip-s'], ['día elegido', '.dia[aria-pressed=true]'], ['campo ayuda', '.campo-ayuda'], ['error', '.campo-error'], ['banner meta', '.banner-m'], ['tab elegido', '.app-tab[aria-selected=true]'], ['nav activo', '.nav-l[aria-current=page] .nav-t'], ['aviso prototipo', '.aviso-proto-t'], ['botón casos y ayuda', '.aviso-proto-b'], ['tarea número', '.tarea-n'], ['tarea texto', '.tarea-t'], ['tarea ver', '.tarea-ver'], ['reparto frase', '.reparto-frase'], ['reparto leyenda', '.reparto-ley li'], ['cupo', '.cupo .fila-s'], ['ayuda respuesta', '.ay-resp'], ['ayuda nota 1-5', '.ay-nota-l'], ['ayuda versión', '.ay-version'], ['reiniciar', '.btn--reiniciar'], ['ya te cayó', '.portada-pie .btn'], ['nota ok', '.nota--ok p'], ['tarea lista', '.tarea-b--ok .tarea-t']];
  for (const [n, sel] of casos) { const el = document.querySelector(sel); if (!el) continue; const c = rgba(getComputedStyle(el).color); pares[n] = Math.round(ratio(c.slice(0,3), fondo(el)) * 100) / 100; }
  return pares;
})()`;
const informe = {};
for (const tema of ['serena-claro', 'serena-oscuro', 'ancla-claro', 'ancla-oscuro']) {
    const r = {};
    const recoger = async () => Object.assign(r, await b.evaluar(medir));
    await b.ir('about:blank');
    await b.ir(url + '#persona=ana&tema=' + tema);
    await esperar(200);
    await recoger();
    await b.evaluar('P.irTab("pagos"); true');
    await recoger();
    await b.evaluar('P.irTab("midinero"); true');
    await recoger();
    await b.evaluar('P.irTab("mes"); true');
    await recoger();
    await b.evaluar('P.irTab("hoy"); P.abrir("tarjeta", "bac"); true');
    await recoger();
    await b.evaluar('P.irTab("hoy"); P.abrir("lugar", "agricola"); true');
    await recoger();
    await b.evaluar('P.irTab("hoy"); P.abrir("invitar"); true');
    await recoger();
    await b.evaluar('P.irTab("hoy"); P.acciones.anotar(); true');
    await esperar(100);
    await b.evaluar('const q = document.getElementById("anotar-q"); q.value = "tengo 300"; q.dispatchEvent(new Event("input", { bubbles: true })); true');
    await recoger();
    await b.evaluar('document.querySelector("[data-fk=\\"op-lugar-efectivo\\"]").click(); P.acciones.anotarGuardar(); true');
    await recoger();
    await b.evaluar('P.cargarCaso("C01"); P.acciones.obSiguiente(); P.acciones.obIngreso({ v: "mes" }); true');
    await recoger();
    await b.evaluar('P.cargarCaso("C16"); P.notificar({ titulo: "x", texto: "y" }); true');
    await recoger();
    await b.evaluar('P.cargarCaso("C26"); true');
    await recoger();
    await b.evaluar('P.cargarCaso("C33"); P.irTab("midinero"); true');
    await recoger();
    await b.evaluar('P.cargarCaso("C32"); P.abrir("tarjeta", "bac"); true');
    await recoger();
    await b.evaluar('localStorage.setItem("pamplanea-proto-v2:notas", JSON.stringify({ nombre: "", notas: {}, guiada: { activa: true, i: 1, resp: { C01: { facil: 4, confuso: "x" } } } })); P.cargarCaso("C01"); P.ayuda.pintarBarra(); true');
    await recoger();
    await b.evaluar('P.ayuda.abrir("inicio"); true');
    await recoger();
    await b.evaluar('P.ayuda.cerrar(); P.acciones.ayTarea({ v: "respuesta" }); P.acciones.ayFacil({ v: "3" }); true');
    await recoger();
    await b.evaluar('P.ayuda.cerrar(); P.cargarCaso("C05"); window.dispatchEvent(new CustomEvent("proto", { detail: { clave: "guardado:gasto:pupusas" } })); true');
    await recoger();
    await b.evaluar('localStorage.clear(); P.ayuda.pintarBarra(); P.cargarCaso("C19"); true');
    await recoger();
    informe[tema] = r;
}
const minimo = Math.min(...Object.values(informe).flatMap((r) => Object.values(r)));
await writeFile(path.join(root, 'capturas', 'contraste.json'), JSON.stringify({ minimo, informe }, null, 1));
console.log(JSON.stringify({ minimo, porTema: Object.fromEntries(Object.entries(informe).map(([t, r]) => [t, Object.entries(r).sort((a, b) => a[1] - b[1]).slice(0, 4)])), medidos: Object.keys(informe['serena-claro']).length, errores: b.errores }));
b.cerrar();
