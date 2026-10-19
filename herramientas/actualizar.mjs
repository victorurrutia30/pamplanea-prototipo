// LOS DATOS SOBREVIVEN A LA ACTUALIZACIÓN (v2.6; desde la v2.6.1 sirve para cualquier versión). Una versión publicada
// (sacada de git con --ref) servida como en GitHub Pages (subruta /pamplanea-prototipo/), con: datos reales en «Usarla
// con mis datos» (y algo anotado), el progreso de «Aprender a usarla» («Lo esencial» a medias, un capítulo hecho y un
// ejercicio), una prueba guiada en pausa en el set B en su última tarea y el nombre de «Cuéntale…». Después el MISMO
// puerto sirve la versión de esta carpeta: «Hay una versión nueva · Actualizar» y todo sigue igual (sin cambio de
// esquema); también sin internet. Las versiones (vieja y nueva) y la caché nueva se leen de casos.js y sw.js.
// Uso: node herramientas/actualizar.mjs --ref=7c0d06e   (v2.5)   ·   --ref=ca97256   (v2.6)   [--puerto=8767]
import { execSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const ref = args.ref || '7c0d06e';
const puerto = Number(args.puerto || 8767);
const base = `http://127.0.0.1:${puerto}/pamplanea-prototipo/`;
const salida = path.join(root, 'capturas', 'actualizar-' + ref);
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });

// La v2.5 tal como se publicó, con el mismo servidor de prueba.
const v25 = await mkdtemp(path.join(os.tmpdir(), 'pamplanea-v25-'));
await writeFile(path.join(v25, 'v25.tar'), execSync(`git archive --format=tar ${ref}`, { cwd: root, maxBuffer: 1 << 28 }));
execSync('tar -xf v25.tar', { cwd: v25 });
await rm(path.join(v25, 'v25.tar'));
await mkdir(path.join(v25, 'herramientas'), { recursive: true });
await cp(path.join(root, 'herramientas', 'servidor.mjs'), path.join(v25, 'herramientas', 'servidor.mjs'));
const versionDe = async (carpeta) => /VERSION_PROTOTIPO = '([^']+)'/.exec(await readFile(path.join(carpeta, 'casos.js'), 'utf8'))[1];
const VIEJA = await versionDe(v25);
const NUEVA = await versionDe(root);
const CACHE = 'pamplanea-proto-' + /VERSION_SW = '([^']+)'/.exec(await readFile(path.join(root, 'sw.js'), 'utf8'))[1];

let servidor = null;
async function servir(carpeta) {
    if (servidor) servidor.kill();
    servidor = spawn(process.execPath, [path.join(carpeta, 'herramientas', 'servidor.mjs'), String(puerto)], { stdio: 'ignore' });
    for (let i = 0; i < 80; i++) {
        try {
            await fetch(base);
            return;
        } catch {
            await esperar(100);
        }
    }
    throw new Error('el servidor no levantó');
}
const apagar = async () => {
    if (servidor) servidor.kill();
    servidor = null;
    await esperar(300);
};

const informe = { ref, vieja: VIEJA, nueva: NUEVA, cache: CACHE, fallos: [], datos: {} };
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${nombre}: «${JSON.stringify(real).slice(0, 400)}»`);
    informe.datos[nombre] = real;
};
const b = await abrir({ puerto: 9731 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const ev = (s) => b.evaluar(s);
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(200);
};
const texto = (sel) => ev(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const guardado = () => ev('Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, JSON.parse(localStorage.getItem(k))]))');
const sinHoy = (u) => ({ ...u, st: { ...u.st, hoy: null }, actualizado: null, metricas: { ...u.metricas, dias: null } });
try {
    // ------------------------------------------------------------ 1. La v2.5, con todo lo de una persona de la familia.
    await servir(v25);
    await b.ir(base);
    await esperar(800);
    await ev('navigator.serviceWorker.ready.then(() => true)');
    await b.ir(base + 'telefono.html');
    await esperar(800);
    check('la versión vieja: servida y con service worker', [await ev('window.VERSION_PROTOTIPO'), await ev('!!navigator.serviceWorker.controller')], [VIEJA, true]);
    const anotar = (frase) => `{ P.acciones.anotar(); const q = document.getElementById("anotar-q"); q.value = ${JSON.stringify(frase)}; q.dispatchEvent(new Event("input", { bubbles: true })); P.acciones.anotarGuardar(); } true`;
    await clic('[data-fk="elegir-usar"]');
    await clic('[data-fk="intro-empezar"]');
    await ev('{ P.ayuda.cerrar(); const s = DATOS.crearAna(); Object.assign(s, { persona: "uso", hoy: P.modos.hoy(), nombre: "Prueba" }); P.cargar(s, { tab: "hoy" }); P.modos.guardarUso(); } true');
    await ev(anotar('pupusas 9'));
    await esperar(400);
    // Lo de abajo se escribe a mano: que la página no lo pise al salir con lo que tiene en memoria.
    await ev(`(() => {
        P.sinGuardar = true;
        P.modos.guardarEntrenamiento({ caps: { 'fijo:esencial': { paso: 3, hecho: false }, 'fijo:ahorros': { paso: 0, hecho: true } }, tourVersion: 'fijo', tourUltimo: 'fijo:esencial', practicas: { C05: true } });
        const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1'));
        u.nombre = 'Prueba';
        u.feedback = [{ fecha: '2026-10-19', facil: 4, confuso: 'Lo de cuadrar', gustaria: '' }];
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify(u));
        const t = (i) => ({ inicio: 1760000000000 + i * 60000, fin: 1760000000000 + i * 60000 + 30000, toques: 5, pantallas: ['Hoy'], detectada: true, resultado: 'listo', facil: 4 });
        localStorage.setItem('pamplanea-proto-v2:notas', JSON.stringify({ nombre: 'Prueba', notas: {}, prueba: { estado: 'libre', set: 'B', origen: 'alterno', perfil: { pago: 'quincena' }, i: 5, tareas: { pupusas: t(0), 'estado-cuenta': t(1), 'laptop-credito': t(2), 'tarjeta-prestamo': t(3), 'dos-semanas': t(4) }, final: {}, instalada: 'no lo intentó', inicio: '2026-10-19T15:00:00.000Z', enviado: false } }));
        localStorage.setItem('pamplanea-proto-v2:dispositivo', JSON.stringify({ personas: 2, setSiguiente: null }));
        return true;
    })()`);
    await b.ir(base + 'telefono.html');
    await esperar(800);
    const libreAntes = await texto('.portada-n');
    check('v2.5: con sus datos', [await ev('P.modo'), libreAntes, await ev('P.st.registros.some((r) => r.monto === 900)')], (x) => x[0] === 'uso' && /^\$/.test(x[1]) && x[2] === true);
    await b.captura(path.join(salida, '1-v25-con-datos.png'));
    const antes = await guardado();
    // ------------------------------------------------------------ 2. Se publica la v2.6 en el mismo lugar.
    await servir(root);
    await ev('navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => true)');
    let aviso = false;
    for (let i = 0; i < 80 && !aviso; i++) {
        await esperar(200);
        aviso = await ev('!!document.getElementById("actualizar")');
    }
    check('«Hay una versión nueva · Actualizar»', await texto('#actualizar'), (t) => typeof t === 'string' && t.includes('Hay una versión nueva') && t.includes('Actualizar'));
    await b.captura(path.join(salida, '2-hay-version-nueva.png'));
    await clic('[data-fk="actualizar"]');
    for (let i = 0; i < 40; i++) {
        await esperar(250);
        if ((await ev('window.VERSION_PROTOTIPO').catch(() => null)) === NUEVA) break;
    }
    await esperar(800);
    check('la versión nueva y solo su caché', [await ev('window.VERSION_PROTOTIPO'), await ev('caches.keys()')], (x) => x[0] === NUEVA && x[1].includes(CACHE) && x[1].length === 1);
    const despues = await guardado();
    check('mismas claves guardadas (sin respaldo de migración: no hubo cambio de esquema)', Object.keys(despues), Object.keys(antes));
    check('tus datos: iguales (esquema 2)', [despues['pamplanea-uso:v1'].esquema, JSON.stringify(sinHoy(despues['pamplanea-uso:v1'])) === JSON.stringify(sinHoy(antes['pamplanea-uso:v1']))], [2, true]);
    check('el progreso de «Aprender a usarla»: igual', despues['pamplanea-entrenamiento'], antes['pamplanea-entrenamiento']);
    check('la prueba guiada y el teléfono: iguales', [despues['pamplanea-proto-v2:notas'], despues['pamplanea-proto-v2:dispositivo']], [antes['pamplanea-proto-v2:notas'], antes['pamplanea-proto-v2:dispositivo']]);
    check('se abre con tus datos y el mismo libre', [await ev('P.modo'), await texto('.portada-n'), await texto('#btn-ayuda')], ['uso', libreAntes, 'Ayuda']);
    await b.captura(path.join(salida, '3-v26-con-datos.png'));
    // Lo que se ve con lo guardado.
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-tour"]');
    check('«Aprender a usarla»: «Lo esencial» a medias y «Ahorros» hecho', await texto('.ay'), (t) => t.includes('Ibas en el paso 4 de 6') && t.includes('1 de 5 hechos'));
    await b.captura(path.join(salida, '4-aprender-a-usarla.png'));
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    check('«Prueba guiada»: sigue donde iba (la tarea de Carlos ya no está)', await texto('[data-fk="ay-prueba"]'), 'Prueba guiada La dejaste en la tarea 6 de 6');
    await clic('[data-fk="au-contar"]');
    const t = await ev('document.getElementById("ay-texto").value');
    check('«Cuéntale…»: su nombre, sus respuestas y la prueba (sin Carlos ni letra)', t, (x) => x.includes('Nombre: Prueba') && x.includes('Cómo me ha ido:') && x.includes('Prueba guiada: la dejé en la tarea 6 de 6') && x.includes('5. Volver después de dos semanas: la logré') && !/Carlos|\bset\b/i.test(x));
    await b.captura(path.join(salida, '5-cuentale.png'));
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-prueba"]');
    check('retomar: la última tarea, con los ejemplos', [await ev('P.modo'), await texto('.ay .paso')], ['entrenamiento', 'Tarea 6 de 6 · la última']);
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-g-salir"]');
    await clic('[data-fk="ay-usar"]');
    check('de vuelta a tus datos, igual', [await ev('P.modo'), await texto('.portada-n')], ['uso', libreAntes]);
    // ------------------------------------------------------------ 3. Sin internet: abre la v2.6 con todo.
    await apagar();
    await b.ir(base);
    await esperar(900);
    check('sin internet: la versión nueva con tus datos', [await ev('window.VERSION_PROTOTIPO'), await ev('P.modo'), await texto('.portada-n'), await ev('document.fonts.check("16px Instrument Sans")')], [NUEVA, 'uso', libreAntes, true]);
    await b.captura(path.join(salida, '6-sin-internet.png'));
} catch (e) {
    informe.fallos.push('excepción: ' + e.message);
    await b.captura(path.join(salida, 'ERROR.png')).catch(() => null);
}
informe.errores = b.errores;
informe.fallidas = b.fallidas.filter((f) => !/ERR_CONNECTION_REFUSED/.test(f));
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas }, null, 1));
b.cerrar();
await apagar();
await rm(v25, { recursive: true, force: true }).catch(() => null);
