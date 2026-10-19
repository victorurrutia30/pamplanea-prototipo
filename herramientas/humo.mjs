// Prueba de humo: abre telefono.html por file:// a 390×844, revisa errores y toma una captura
// de cada pantalla principal. Uso: node herramientas/humo.mjs [tema]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tema = process.argv[2] || 'serena-claro';
const salida = path.join(root, 'capturas', 'humo');
const b = await abrir({ puerto: 9661 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const url = pathToFileURL(path.join(root, 'telefono.html')).href;
const resultado = {};
for (const [nombre, hash, accion] of [
    ['hoy-ana', '#persona=ana', null],
    ['pagos-ana', '#persona=ana', 'P.irTab("pagos")'],
    ['midinero-ana', '#persona=ana', 'P.irTab("midinero")'],
    ['mes-ana', '#persona=ana', 'P.irTab("mes")'],
    ['hoy-carlos', '#persona=carlos', null],
    ['c01', '#caso=C01', null],
]) {
    await b.ir('about:blank');
    await b.ir(url + hash + '&tema=' + tema);
    await esperar(150);
    if (accion) await b.evaluar(accion + '; true');
    await esperar(200);
    resultado[nombre] = await b.evaluar('({ h1: document.querySelector("#pantalla h1")?.textContent.trim(), alto: document.getElementById("pantalla").scrollHeight, desborde: document.getElementById("vista").scrollWidth > 390, fuera: [...document.querySelectorAll("#pantalla *")].filter((e) => e.getBoundingClientRect().right > 391 && !e.closest(".chips--scroll") && !e.closest("svg")).map((e) => e.className && e.className.baseVal === undefined ? e.className : e.tagName).slice(0, 5) })');
    await b.captura(path.join(salida, `${nombre}-${tema}.png`));
}
console.log(JSON.stringify({ errores: b.errores, fallidas: b.fallidas, resultado }, null, 1));
b.cerrar();
