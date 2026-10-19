// Verifica la app instalable servida como en GitHub Pages (subruta /pamplanea-prototipo/): manifest,
// criterios de instalación de Chrome, service worker que controla la página, apertura sin internet
// y «Hay una versión nueva · Actualizar» sin perder lo guardado. Levanta y apaga su servidor.
// Uso: node herramientas/probar-pwa.mjs
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// La versión de la caché sale de sw.js (la escribe herramientas/generar-sw.mjs).
const CACHE = 'pamplanea-proto-' + /const VERSION_SW = '([^']+)'/.exec(await readFile(path.join(root, 'sw.js'), 'utf8'))[1];
const puerto = 8766;
const base = `http://127.0.0.1:${puerto}/pamplanea-prototipo/`;
let servidor = null;
async function levantar(sufijo = '') {
    if (servidor) servidor.kill();
    servidor = spawn(process.execPath, [path.join(root, 'herramientas', 'servidor.mjs'), String(puerto)], { env: { ...process.env, SW_SUFIJO: sufijo }, stdio: 'ignore' });
    for (let i = 0; i < 50; i++) {
        try {
            await fetch(base);
            return;
        } catch {
            await esperar(100);
        }
    }
}
const informe = { fallos: [], datos: {} };
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${nombre}: «${JSON.stringify(real).slice(0, 300)}»`);
    informe.datos[nombre] = real;
};
await levantar();
const b = await abrir({ puerto: 9721 });
await b.tamano(390, 844);
try {
    await b.ir(base);
    await esperar(800);
    check('redirige a telefono.html', await b.evaluar('location.pathname'), '/pamplanea-prototipo/telefono.html');
    const manifest = await b.enviar('Page.getAppManifest');
    check('manifest sin errores', manifest.errors, (e) => Array.isArray(e) && e.length === 0);
    check('manifest url', manifest.url, base + 'manifest.webmanifest');
    const datosM = JSON.parse(manifest.data || '{}');
    check('manifest start_url/scope', [datosM.start_url, datosM.scope, datosM.display], ['./', './', 'standalone']);
    await b.evaluar('navigator.serviceWorker.ready.then(() => true)');
    await b.ir(base + 'telefono.html');
    await esperar(800);
    check('service worker controla', await b.evaluar('!!navigator.serviceWorker.controller'), true);
    const inst = await b.enviar('Page.getInstallabilityErrors');
    check('instalable (sin errores de Chrome)', inst.installabilityErrors, (e) => Array.isArray(e) && e.length === 0);
    check('caché versionada', await b.evaluar('caches.keys()'), (k) => k.includes(CACHE));
    check('todo precargado', await b.evaluar(`caches.open(${JSON.stringify(CACHE)}).then((c) => c.keys()).then((k) => k.length)`), (n) => n >= 130);
    // v2.2: entrenamiento (ejemplos) con algo anotado…
    const anotarPupusas = '{ P.acciones.anotar(); const q = document.getElementById("anotar-q"); q.value = "pupusas 6"; q.dispatchEvent(new Event("input", { bubbles: true })); P.acciones.anotarGuardar(); } true';
    await b.evaluar('document.querySelector("[data-fk=elegir-aprender]").click(); true');
    await esperar(300);
    await b.evaluar('document.querySelector("[data-fk=tour-saltar]").click(); true');
    await b.evaluar(anotarPupusas);
    await esperar(500);
    check('entrenamiento anotado', await b.evaluar('document.querySelector(".portada-n").textContent'), '$264.60');
    // …y «Usarla con mis datos» con sus propios datos (se arman directo: el primer día se prueba en recorrer-modos).
    await b.evaluar('{ P.modos.cambiar("uso"); P.ayuda.cerrar(); const s = DATOS.crearAna(); Object.assign(s, { persona: "uso", hoy: P.modos.hoy(), nombre: "Prueba" }); P.cargar(s, { tab: "hoy" }); P.modos.guardarUso(); } true');
    await b.evaluar(anotarPupusas.replace('"pupusas 6"', '"pupusas 9"'));
    await esperar(500);
    const libre = await b.evaluar('document.querySelector(".portada-n").textContent');
    check('uso anotado', [await b.evaluar('P.modo'), await b.evaluar('JSON.parse(localStorage.getItem("pamplanea-uso:v1")).st.registros.some((r) => r.monto === 900)')], ['uso', true]);
    // Sin internet: se apaga el servidor y se vuelve a abrir.
    servidor.kill();
    servidor = null;
    await esperar(300);
    await b.ir(base);
    await esperar(800);
    check('abre sin internet', [await b.evaluar('P.modo'), await b.evaluar('document.querySelector(".portada-n")?.textContent')], ['uso', libre]);
    check('sin internet: iconos y fuentes', await b.evaluar('document.fonts.check("16px Instrument Sans")'), true);
    // Versión nueva: el servidor vuelve con otra versión del service worker.
    await levantar('-prueba');
    await b.evaluar('navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => true)');
    let aviso = false;
    for (let i = 0; i < 60 && !aviso; i++) {
        await esperar(200);
        aviso = await b.evaluar('!!document.getElementById("actualizar")');
    }
    check('aviso de versión nueva', await b.evaluar('document.getElementById("actualizar")?.textContent.trim()'), (t) => typeof t === 'string' && t.includes('Hay una versión nueva') && t.includes('Actualizar'));
    await b.captura(path.join(root, 'capturas', 'pwa', 'version-nueva.png'));
    await b.evaluar('document.querySelector("[data-fk=actualizar]").click(); true');
    await esperar(2500);
    check('caché nueva activa', await b.evaluar('caches.keys()'), (k) => k.includes(CACHE + '-prueba') && !k.includes(CACHE));
    check('datos reales tras actualizar', [await b.evaluar('P.modo'), await b.evaluar('document.querySelector(".portada-n")?.textContent'), await b.evaluar('JSON.parse(localStorage.getItem("pamplanea-uso:v1")).esquema')], ['uso', libre, 2]);
    await b.evaluar('P.modos.cambiar("entrenamiento"); true');
    await esperar(500);
    check('ejemplos intactos tras actualizar', await b.evaluar('document.querySelector(".portada-n")?.textContent'), '$264.60');
} catch (e) {
    informe.fallos.push('excepción: ' + e.message);
}
informe.errores = b.errores;
informe.fallidas = b.fallidas;
await writeFile(path.join(root, 'capturas', 'pwa', 'informe.json'), JSON.stringify(informe, null, 1)).catch(() => null);
console.log(JSON.stringify(informe, null, 1));
b.cerrar();
if (servidor) servidor.kill();
