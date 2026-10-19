// PRUEBAS v2.6.1 (fase 1 del «QA profundo»). A 390×844:
//  A) V2-67 «Empezar de nuevo» la prueba guiada: está en la tarea y en el final; pide confirmar con «Se borra tu avance
//     de la prueba. Tus datos no se tocan.»; «Cancelar» no borra nada; «Sí, empezar de nuevo» borra solo el avance (el
//     nombre y el perfil quedan escritos), los datos reales quedan idénticos y el set se vuelve a elegir solo, sin letras;
//  B) V2-74 instalar en iPhone: las etiquetas para iPhone (ícono de 180×180 de verdad, «capable», título, barra de
//     estado, theme-color claro y oscuro, viewport-fit=cover) y el manifest; la guía según el teléfono (iPhone con
//     Safari: Compartir → «Agregar a pantalla de inicio» → «Abrir como app web» y «Instálala para que tus datos no se
//     borren»; iPhone desde otra app o navegador: «Abrir en Safari» y copiar el enlace; instalada: «Ya la tienes
//     instalada»); «Instalar la app» es su propia fila en «Ayuda» (V2-69 #38) y ya no está en «Tus datos»;
//     navigator.storage.persist() se pide con datos reales (una vez).
// Uso: node herramientas/v261.mjs [--base=http://…/] [--puerto=9972] [--partes=a,b]
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || 'a,b').split(',');
const salida = path.join(root, 'capturas', 'v261' + (args.base ? '-servida' : ''));
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9972) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
let actual = '';
const check = (nombre, real, esperado) => {
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 400)}`);
    return ok;
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(180);
};
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
let scripts = [];
async function antesDeCargar(fuente) {
    for (const id of scripts) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: id });
    scripts = [(await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';${fuente || ''}` })).identifier];
}
async function abrirApp(q = '') {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html' + q + '#tema=serena-claro');
    await esperar(500);
}
/** Datos reales (Marta) y una prueba guiada a medias o terminada, escritos directo en lo guardado. */
async function preparar({ prueba }) {
    await abrirApp();
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-19T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 3, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'entrenamiento', notaAvisos: true, ofertaTarjetas: 'no', tips: {} }));
        const t0 = Date.parse('2026-10-20T15:00:00Z');
        const tarea = (i) => ({ inicio: t0 + i * 120000, fin: t0 + i * 120000 + 65000, toques: 9, pantallas: ['Hoy'], detectada: true, resultado: 'listo', facil: 4 });
        const prueba = ${js(prueba)} === 'fin'
            ? { estado: 'fin', set: 'A', origen: 'alterno', perfil: { pago: 'quincena', tarjeta: 'si' }, i: 6, tareas: { pupusas: tarea(1), colegio: tarea(2) }, final: { numero: 'Lo que me queda' }, instalada: null, inicio: '2026-10-20T15:00:00.000Z', finalizada: '2026-10-20T15:16:00.000Z', enviado: false }
            : { estado: 'activa', set: 'B', origen: 'alterno', perfil: { pago: 'mes' }, i: 2, tareas: { pupusas: tarea(1) }, final: {}, instalada: null, inicio: '2026-10-20T15:00:00.000Z', enviado: false };
        localStorage.setItem('pamplanea-proto-v2:notas', JSON.stringify({ nombre: 'Sofía', notas: {}, prueba }));
        localStorage.setItem('pamplanea-proto-v2:dispositivo', JSON.stringify({ personas: 1, setSiguiente: null }));
        return true;
    })()`);
    await abrirApp();
}
const notas = () => ev(`JSON.parse(localStorage.getItem('pamplanea-proto-v2:notas'))`);
const usoGuardado = () => ev(`localStorage.getItem('pamplanea-uso:v1')`);

try {
    // ============================================================ A) V2-67 empezar de nuevo la prueba guiada
    if (partes.includes('a')) {
        actual = 'A terminada';
        await antesDeCargar();
        await preparar({ prueba: 'fin' });
        const uso0 = await usoGuardado();
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-prueba"]');
        check('Prueba guiada terminada abre el final', await ev('P.ayuda.panel'), 'fin');
        check('el final tiene «Empezar de nuevo»', await texto('[data-fk="ay-rp"]'), 'Empezar de nuevo');
        await clic('[data-fk="ay-rp"]');
        check('pide confirmar con el texto aprobado', await texto('#ay-rp-t'), '¿Empezar de nuevo? Se borra tu avance de la prueba. Tus datos no se tocan.');
        check('el foco va a «Cancelar»', await ev('document.activeElement && document.activeElement.dataset.fk'), 'ay-rp-no');
        await b.captura(path.join(salida, 'A-01-confirmar-empezar-de-nuevo.png'));
        await clic('[data-fk="ay-rp-no"]');
        check('«Cancelar» no borra nada', (await notas()).prueba.estado, 'fin');
        await clic('[data-fk="ay-rp"]');
        await clic('[data-fk="ay-rp-si"]');
        const n1 = await notas();
        check('se borra el avance', { estado: n1.prueba.estado, set: n1.prueba.set, tareas: Object.keys(n1.prueba.tareas).length, final: Object.keys(n1.prueba.final).length }, { estado: null, set: null, tareas: 0, final: 0 });
        check('el nombre queda', n1.nombre, 'Sofía');
        check('vuelve a la bienvenida con el nombre y el perfil escritos', await ev(`({ panel: P.ayuda.panel, nombre: document.getElementById('ay-nombre-t')?.value, perfil: !!document.querySelector('[data-fk="ay-p-pago-quincena"][aria-pressed="true"]') })`), { panel: 'bienvenida', nombre: 'Sofía', perfil: true });
        check('tus datos reales quedan idénticos', (await usoGuardado()) === uso0, true);
        await clic('[data-fk="ay-empezar-prueba"]');
        if (await hay('[data-fk="ay-inst-saltar"]')) await clic('[data-fk="ay-inst-saltar"]');
        const n2 = await notas();
        check('el set se vuelve a elegir solo', { estado: n2.prueba.estado, set: /^[AB]$/.test(n2.prueba.set || ''), i: n2.prueba.i }, { estado: 'activa', set: true, i: 0 });
        check('sin letras de set a la vista', await ev(`[document.getElementById('capa-ayuda').innerText, document.getElementById('tarea-bar').innerText].join(' ')`), (t) => !/\bset\b/i.test(t));
        check('tus datos reales siguen idénticos', (await usoGuardado()) === uso0, true);

        actual = 'A a medias';
        await preparar({ prueba: 'activa' });
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-prueba"]');
        check('a medias abre la tarea', await ev('P.ayuda.panel'), 'tarea');
        check('la tarea tiene «Empezar de nuevo»', await hay('[data-fk="ay-rp"]'), true);
        await clic('[data-fk="ay-rp"]');
        await clic('[data-fk="ay-rp-si"]');
        check('borra el avance a medias', (await notas()).prueba.estado, null);
        check('sin barra de tarea', await ev(`document.documentElement.classList.contains('con-tarea')`), false);
    }

    // ============================================================ B) V2-74 instalar en iPhone
    if (partes.includes('b')) {
        actual = 'B etiquetas';
        const html = await readFile(path.join(root, 'telefono.html'), 'utf8');
        check('apple-touch-icon 180×180', /<link rel="apple-touch-icon" sizes="180x180" href="recursos\/iconos\/apple-touch-icon-180.png"/.test(html), true);
        const png = await readFile(path.join(root, 'recursos', 'iconos', 'apple-touch-icon-180.png'));
        check('el ícono mide 180×180 de verdad', [png.readUInt32BE(16), png.readUInt32BE(20)], [180, 180]);
        check('apple-mobile-web-app-capable', /<meta name="apple-mobile-web-app-capable" content="yes"/.test(html), true);
        check('título en la pantalla de inicio', /<meta name="apple-mobile-web-app-title" content="PamPlanea"/.test(html), true);
        check('barra de estado', /<meta name="apple-mobile-web-app-status-bar-style" content="default"/.test(html), true);
        check('theme-color claro y oscuro', [/<meta name="theme-color" media="\(prefers-color-scheme: light\)"/.test(html), /<meta name="theme-color" media="\(prefers-color-scheme: dark\)"/.test(html)], [true, true]);
        check('viewport-fit=cover (notch y Dynamic Island)', /viewport-fit=cover/.test(html), true);
        const man = JSON.parse(await readFile(path.join(root, 'manifest.webmanifest'), 'utf8'));
        check('manifest: standalone, inicio y escala', { display: man.display, start: man.start_url, scope: man.scope, iconos: man.icons.length }, { display: 'standalone', start: './', scope: './', iconos: 3 });
        await antesDeCargar();
        await abrirApp();
        check('las dos barras siguen el tema elegido', await ev(`[...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.content)`), (x) => x.length === 2 && x[0] === x[1] && /^#[0-9a-f]{6}$/.test(x[0]));

        const UAS = {
            'iphone-safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
            'iphone-chrome': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.0.0 Mobile/15E148 Safari/604.1',
        };
        for (const [nombre, ua] of Object.entries(UAS)) {
            actual = 'B guía ' + nombre;
            await b.enviar('Emulation.setUserAgentOverride', { userAgent: ua });
            await preparar({ prueba: 'fin' });
            await clic('#btn-ayuda');
            check('«Instalar la app» es su propia fila en Ayuda', await texto('[data-fk="au-instalar"] .fila-t'), 'Instalar la app');
            await clic('[data-fk="au-instalar"]');
            const t = await texto('.ay-c');
            if (nombre === 'iphone-safari') {
                check('pasos de Safari', t, (x) => ['Compartir', '«Agregar a pantalla de inicio»', '«Abrir como app web»', '«Agregar»', 'Instálala para que tus datos no se borren.'].every((s) => x.includes(s)));
                check('con datos: cómo pasarlos a la app instalada', t, (x) => x.includes('Guarda una copia en «Tus datos» y restáurala en la app.'));
            } else check('desde otro navegador: abrir en Safari', t, (x) => x.includes('En iPhone se instala desde Safari.') && x.includes('«Abrir en Safari»'));
            await b.captura(path.join(salida, `B-guia-${nombre}.png`));
            await clic('[data-fk="ay-x"]');
        }
        await b.enviar('Emulation.setUserAgentOverride', { userAgent: '' });

        actual = 'B instalada';
        await antesDeCargar(`Object.defineProperty(navigator, 'standalone', { get: () => true });`);
        await abrirApp();
        await clic('#btn-ayuda');
        check('instalada: sin la fila «Instalar la app»', await hay('[data-fk="au-instalar"]'), false);
        await clic('[data-fk="au-datos"]');
        check('«Tus datos» ya no tiene instalar', await hay('[data-fk="dt-instalar"]'), false);
        await ev(`P.ayuda.abrir('instalar'); true`);
        await esperar(150);
        check('la guía dice que ya está instalada', await texto('.ay-c'), (x) => x.includes('Ya la tienes instalada.'));

        actual = 'B persistencia';
        await antesDeCargar(`window.__persist = 0; if (navigator.storage) { const p = navigator.storage.persist.bind(navigator.storage); navigator.storage.persist = () => { window.__persist++; return p(); }; }`);
        await preparar({ prueba: 'fin' });
        await ev(`P.modos.cambiar('uso'); true`);
        await esperar(500);
        await ev(`P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'café 2'; q.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-fk="anotar-guardar"]').click(); true`);
        await esperar(500);
        check('con datos reales se pide no borrarlos, una vez', await ev('window.__persist'), 1);
        check('queda el resultado', await ev('P.ayuda.persistente'), (x) => x === true || x === false);
        await antesDeCargar();
    }
} catch (e) {
    fallos.push(`${actual}: ${e.message}`);
}
console.log(JSON.stringify({ fallos, errores: b.errores }, null, 1));
await b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
