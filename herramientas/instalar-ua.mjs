// Captura la guía de instalación como la vería cada teléfono (emulando el navegador).
// Uso: node herramientas/instalar-ua.mjs [base]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] || pathToFileURL(root).href + '/';
const UAS = {
    'iphone-safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    'iphone-chrome': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.0.0 Mobile/15E148 Safari/604.1',
    'android-chrome': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
};
const b = await abrir({ puerto: 9741 });
await b.tamano(390, 844);
const res = {};
for (const [nombre, ua] of Object.entries(UAS)) {
    await b.enviar('Emulation.setUserAgentOverride', { userAgent: ua });
    await b.ir('about:blank');
    // v2.6.1: con el enlace de tester (?set=A) un teléfono nuevo abre la bienvenida de la prueba.
    await b.ir(base + 'telefono.html?set=A');
    await b.evaluar('P.sinGuardar = true; localStorage.clear(); true');
    await b.ir('about:blank');
    // v2.6.1: con el enlace de tester (?set=A) un teléfono nuevo abre la bienvenida de la prueba.
    await b.ir(base + 'telefono.html?set=A');
    await esperar(400);
    await b.evaluar('document.querySelector("[data-fk=ay-empezar-prueba]").click(); true');
    await esperar(300);
    res[nombre] = await b.evaluar('document.querySelector(".ay-c")?.textContent.replace(/\\s+/g, " ").slice(0, 400)');
    await b.captura(path.join(root, 'capturas', 'instalar', nombre + '.png'));
}
console.log(JSON.stringify({ res, errores: b.errores }, null, 1));
b.cerrar();
