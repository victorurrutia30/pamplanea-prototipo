// PRUEBA v2.6.4 (V2-79): quien YA cayó en el error de la v2.6.3 y actualiza. La v2.6.3 tal como se publicó (git
// archive de 7f48ead), servida como en Pages: con datos reales («Marta», un gasto suyo y una copia descargada el 18),
// se hacen los 4 pasos de Victor («Aprender a usarla» → «Cambiar» → «Lo recibo cuando vendo o trabajo» → «Ahora no»):
// Rosa queda guardada como sus datos y, al reabrir, la v2.6.3 la deja como persona «uso». Después el MISMO puerto sirve
// esta carpeta: «Actualizar» → la app NO muestra a Rosa como suya, abre «Revisemos tus datos» con la copia descargada,
// aparta a Rosa sin borrarla y, al elegir el archivo de la copia, vuelven sus datos.
// Uso: node herramientas/recuperar-v263.mjs [--ref=7f48ead] [--puerto=8768]
import { execSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const ref = args.ref || '7f48ead';
const puerto = Number(args.puerto || 8768);
const base = `http://127.0.0.1:${puerto}/pamplanea-prototipo/`;
const salida = path.join(root, 'capturas', 'recuperar-' + ref);
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });
const vieja = await mkdtemp(path.join(os.tmpdir(), 'pamplanea-vieja-'));
await writeFile(path.join(vieja, 'v.tar'), execSync(`git archive --format=tar ${ref}`, { cwd: root, maxBuffer: 1 << 28 }));
execSync('tar -xf v.tar', { cwd: vieja });
await rm(path.join(vieja, 'v.tar'));
await mkdir(path.join(vieja, 'herramientas'), { recursive: true });
await cp(path.join(root, 'herramientas', 'servidor.mjs'), path.join(vieja, 'herramientas', 'servidor.mjs'));
const NUEVA = /VERSION_PROTOTIPO = '([^']+)'/.exec(await readFile(path.join(root, 'casos.js'), 'utf8'))[1];

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
const informe = { ref, nueva: NUEVA, fallos: [], datos: {} };
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${nombre}: «${JSON.stringify(real).slice(0, 300)}»`);
    informe.datos[nombre] = real;
};
const b = await abrir({ puerto: 9735 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const ev = (s) => b.evaluar(s);
const clic = async (sel, espera = 400) => {
    const ok = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(espera);
};
const texto = (sel) => ev(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const guardado = () => ev(`(JSON.parse(localStorage.getItem('pamplanea-uso:v1') || '{}').st || {})`);
try {
    // ------------------------------------------------------------ 1. La v2.6.3 con los datos de Marta.
    await servir(vieja);
    await b.ir(base);
    await esperar(800);
    await ev('navigator.serviceWorker.ready.then(() => true)');
    await b.ir(base + 'telefono.html');
    await esperar(800);
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: P.modos.hoy() });
        s.lugares[0].nombre = 'MiCajita';
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-12T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: ['2026-10-12'], anotaciones: 4, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: '2026-10-18T10:00:00.000Z', nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true } }));
        return true;
    })()`);
    await b.ir(base + 'telefono.html');
    await esperar(800);
    check('v2.6.3: con los datos de Marta', [await ev('P.modo'), await ev('P.st.nombre')], ['uso', 'Marta']);
    // ------------------------------------------------------------ 2. Los 4 pasos de Victor en la v2.6.3.
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-tour"]');
    await clic('[data-fk="am-cambiar"]', 600);
    await clic('#capa-tour [data-fk="tour-version-variable"]', 800);
    await clic('#capa-tour [data-fk="tour-salir"]', 800);
    await esperar(500);
    check('v2.6.3: el error — Rosa guardada como tus datos', [(await guardado()).nombre, (await guardado()).persona], ['Rosa', 'rosa']);
    await b.captura(path.join(salida, '1-v263-rosa-como-tus-datos.png'));
    await b.ir(base + 'telefono.html');
    await esperar(900);
    check('v2.6.3 al reabrir: Rosa ya con persona «uso»', [(await guardado()).nombre, (await guardado()).persona, await texto('.hoy-saludo h1')], ['Rosa', 'uso', 'Hola, Rosa']);
    // ------------------------------------------------------------ 3. Se publica la v2.6.4 en el mismo lugar.
    await servir(root);
    await ev('navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => true)');
    let aviso = false;
    for (let i = 0; i < 80 && !aviso; i++) {
        await esperar(200);
        aviso = await ev('!!document.getElementById("actualizar")');
    }
    check('«Hay una versión nueva · Actualizar»', aviso, true);
    await clic('[data-fk="actualizar"]');
    for (let i = 0; i < 40; i++) {
        await esperar(250);
        if ((await ev('window.VERSION_PROTOTIPO').catch(() => null)) === NUEVA) break;
    }
    await esperar(900);
    check('la versión nueva', await ev('window.VERSION_PROTOTIPO'), NUEVA);
    check('Rosa NO se muestra como tuya', [await ev('P.modo'), await ev('P.st.nombre'), await ev('P.st.persona')], (x) => x[0] === 'uso' && x[1] !== 'Rosa' && x[2] === 'uso');
    check('«Revisemos tus datos» con la copia descargada', [await ev('P.ayuda.abierto && P.ayuda.panel'), await texto('#capa-ayuda')], (x) => x[0] === 'recuperar' && /datos de ejemplo/.test(x[1]) && /Guardaste una copia el 18 oct 2026/.test(x[1]) && /pamplanea-copia-2026-10-18/.test(x[1]));
    check('Rosa apartada, sin borrarse', await ev(`(JSON.parse(localStorage.getItem('pamplanea-uso:ejemplo-guardado') || 'null') || {}).st?.nombre || null`), 'Rosa');
    check('lo guardado como tus datos ya no es Rosa', (await guardado()).nombre, (n) => n !== 'Rosa');
    await b.captura(path.join(salida, '2-v264-revisemos-tus-datos.png'));
    // La copia que Marta descargó el 18 (sus datos de verdad).
    await ev(`(() => { const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-18' }); s.lugares[0].nombre = 'MiCajita'; const u = { esquema: 2, creado: '2026-10-12T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [] }; const f = new File([JSON.stringify({ app: 'pamplanea-prototipo', tipo: 'copia-uso', esquema: 2, version: 'Prototipo v2.6.3 · 2026-10-19', fecha: '2026-10-18T10:00:00.000Z', datos: u })], 'pamplanea-copia-2026-10-18.json', { type: 'application/json' }); const dt = new DataTransfer(); dt.items.add(f); const i = document.querySelector('#capa-ayuda input[data-copia]'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await esperar(700);
    await b.captura(path.join(salida, '3-v264-confirmar-copia.png'));
    await clic('[data-fk="dt-r-si"]', 900);
    check('con la copia: tus datos de vuelta', [await ev('P.modo'), await ev('P.st.nombre'), await ev('P.st.lugares[0].nombre'), await ev('P.ayuda.abierto')], ['uso', 'Marta', 'MiCajita', false]);
    await esperar(400);
    check('con la copia: guardados', (await guardado()).nombre, 'Marta');
    await b.captura(path.join(salida, '4-v264-tus-datos-de-vuelta.png'));
    await b.ir(base + 'telefono.html');
    await esperar(900);
    check('al reabrir: tus datos y sin preguntar', [await ev('P.st.nombre'), await ev('P.ayuda.abierto')], ['Marta', false]);
} catch (e) {
    informe.fallos.push('excepción: ' + e.message);
    await b.captura(path.join(salida, 'ERROR.png')).catch(() => null);
}
informe.errores = b.errores;
informe.fallidas = b.fallidas.filter((f) => !/ERR_CONNECTION_REFUSED/.test(f));
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas }, null, 1));
b.cerrar();
if (servidor) servidor.kill();
await rm(vieja, { recursive: true, force: true }).catch(() => null);
process.exit(informe.fallos.length || informe.errores.length ? 1 : 0);
