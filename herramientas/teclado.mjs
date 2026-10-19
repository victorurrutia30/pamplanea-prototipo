// Teclado en el teléfono: Enter abre Anotar con el foco en «¿Qué pasó?», Tab no sale de la
// hoja, Escape la cierra y el foco vuelve al botón (+). También mide áreas táctiles < 44 px.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'telefono.html')).href;
const b = await abrir({ puerto: 9673 });
await b.tamano(390, 844, { movil: false, toque: false });
await b.ir(url + '#persona=ana');
await esperar(300);
const tecla = async (key, code, keyCode, shift = false) => {
    const texto = key === 'Enter' ? { text: String.fromCharCode(13), unmodifiedText: String.fromCharCode(13) } : {};
    for (const type of [key === 'Enter' ? 'keyDown' : 'rawKeyDown', 'keyUp']) await b.enviar('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode, modifiers: shift ? 8 : 0, ...(type === 'keyUp' ? {} : texto) });
    await esperar(120);
};
const activo = () => b.evaluar('(() => { const a = document.activeElement; return (a.id || a.dataset.fk || a.tagName) + (a.closest(".hoja") ? " [en hoja]" : ""); })()');
const r = {};
await b.evaluar('document.querySelector("[data-fk=nav-anotar]").focus(); true');
await tecla('Enter', 'Enter', 13);
await esperar(300);
r.alAbrir = await activo();
const recorrido = [];
for (let i = 0; i < 14; i++) {
    await tecla('Tab', 'Tab', 9);
    recorrido.push(await activo());
}
r.tabFueraDeHoja = recorrido.filter((x) => !x.includes('[en hoja]'));
await tecla('Escape', 'Escape', 27);
await esperar(300);
r.trasEscape = { hoja: await b.evaluar('!!P.ui.hoja'), foco: await activo() };
// Desglose con teclado y vuelta al número.
await b.evaluar('document.querySelector("[data-fk=portada]").focus(); true');
await tecla('Enter', 'Enter', 13);
await esperar(300);
r.desglose = await activo();
await tecla('Escape', 'Escape', 27);
r.vueltaPortada = await activo();
// Áreas táctiles de 44 px en las pantallas principales.
const chicos = [];
for (const accion of ['P.irTab("hoy")', 'P.irTab("pagos")', 'P.irTab("midinero")', 'P.irTab("mes")', 'P.abrir("pago", "luz")', 'P.acciones.anotar()']) {
    await b.evaluar(accion + '; true');
    await esperar(150);
    chicos.push(...(await b.evaluar('[...document.querySelectorAll("button, input, a[href]")].filter((e) => { const q = e.getBoundingClientRect(); return q.width && q.height && !e.closest("[inert]") && (q.height < 44 || q.width < 44) && !e.classList.contains("link--inline"); }).map((e) => (e.dataset.fk || e.className) + " " + Math.round(e.getBoundingClientRect().width) + "x" + Math.round(e.getBoundingClientRect().height))')));
    await b.evaluar('P.ui.hoja && P.cerrarHoja(); true');
}
r.menosDe44 = [...new Set(chicos)];
r.errores = b.errores;
console.log(JSON.stringify(r, null, 1));
b.cerrar();
