// PRUEBA v2.6.4 (V2-79, hotfix): salir a mitad del entrenamiento y volver a TUS datos. Con datos propios («Marta»,
// con un lugar «MiCajita» y algo anotado), desde cada camino de salida la persona vuelve a sus datos con un toque,
// intactos, sin que se mezclen con los de ejemplo y con el avance del entrenamiento guardado:
//  A) «Salir» en un paso de un capítulo;           B) «Salir» en «Hazlo tú»;
//  C) el botón atrás o el gesto (pregunta «¿Salir del entrenamiento?»);
//  D) «Salir» en la pausa («Mira tu libre») y en la pregunta del final, antes y después de responder;
//  E) «Salir» al retomar, en «Ver un ejemplo» y en el repaso; «Ahora no» en «¿Cómo recibes tu dinero?»;
//  F) cerrar y reabrir la app a mitad de un capítulo: abre donde la dejaste y «Mis datos» (arriba) vuelve con un toque;
//  G) en los ejemplos, arriba: «Mis datos» (un toque); «Ayuda» → «Usarla con mis datos»; la letra → «Usarla con mis datos»;
//  H) la prueba guiada: «Mis datos» arriba la pausa y vuelve; atrás → «Pausar» y luego «Mis datos»;
//  I) «Practicar»: «Mis datos» arriba durante el ejercicio; «Salir» → la lista dice «Volver a mis datos»;
//  J) ida y vuelta varias veces seguidas (Ayuda, la letra, la oferta de tarjetas): siempre los mismos datos;
//  K) nada mezcla: con los ejemplos cargados «en uso», no se guardan como tus datos (y al revés); el entrenamiento
//     no sigue vivo debajo de tus datos (si «Hazlo tú» quedó abierto, no reacciona a lo que anotas);
//  L) sin datos propios: «Salir» deja los ejemplos como antes y «Usar mis datos» (arriba) lleva a la bienvenida de
//     «Usarla con mis datos»; en la guía de escritorio nada cambia (sin botón ni salto a tus datos).
// Uso: node herramientas/v264.mjs [--base=http://…/] [--puerto=9971]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9971) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
let actual = '';
let checks = 0;
const check = (nombre, real, esperado) => {
    checks++;
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${JSON.stringify(real)}`);
    return ok;
};
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const clic = async (sel, espera = 260) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(espera);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
/** Lo que identifica los datos de la persona (no los de ejemplo). */
const HUELLA = `((s) => s ? JSON.stringify({ persona: s.persona, nombre: s.nombre, lugares: s.lugares.map((l) => l.nombre), registros: s.registros.length, pagos: s.pagos.map((p) => p.id), ingresos: s.ingresos.map((i) => i.id) }) : null)`;
const huellaApp = () => ev(`${HUELLA}(P.st)`);
const huellaGuardada = () => ev(`${HUELLA}((JSON.parse(localStorage.getItem('pamplanea-uso:v1') || '{}')).st)`);
const estado = () =>
    ev(`({ modo: P.modo, persona: P.st && P.st.persona, tour: P.tour.activo ? P.tour.fase : null, ayuda: P.ayuda.abierto ? P.ayuda.panel : null, dlg: P.dlg && P.dlg.abierto ? P.dlg.abierto.titulo : null, pref: (JSON.parse(localStorage.getItem('pamplanea-modo') || '{}')).modo, tab: P.ui.tab })`);
const progreso = (k = 'fijo:esencial') => ev(`(P.modos.entrenamiento().caps || {})[${js(k)}] || null`);
async function abrirApp(q = '') {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html' + q + '#tema=serena-claro');
    await esperar(600);
}
let ORIGINAL = null;
/** Datos propios ya configurados («Marta»), en Hoy, con algo anotado; el entrenamiento sin empezar. */
async function conDatos({ entrenamiento = {} } = {}) {
    await abrirApp();
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        s.lugares[0].nombre = 'MiCajita';
        s.registros.push({ id: 'r-marta', seq: s.seq++, tipo: 'gasto', fecha: '2026-10-21', nombre: 'Tamales', categoria: 'comida', monto: 450, lugar: s.lugares[0].id });
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-19T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: ['2026-10-19'], anotaciones: 1, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true } }));
        localStorage.setItem('pamplanea-entrenamiento', JSON.stringify(${JSON.stringify(entrenamiento)}));
        return true;
    })()`);
    await abrirApp();
    ORIGINAL = await huellaApp();
}
/** De vuelta en TUS datos: modo uso, los mismos datos (en pantalla y guardados), sin entrenamiento encima. */
async function enMisDatos(donde) {
    const e = await estado();
    check(`${donde}: en tus datos`, e, (x) => x.modo === 'uso' && x.persona === 'uso' && !x.tour && !x.dlg && x.pref === 'uso');
    check(`${donde}: tus datos intactos en pantalla`, await huellaApp(), ORIGINAL);
    await esperar(350);
    check(`${donde}: tus datos intactos guardados`, await huellaGuardada(), ORIGINAL);
    check(`${donde}: Hoy dice «Hola, Marta»`, await texto('.hoy-saludo h1, .hoy-saludo .t, #pantalla h1'), (t) => /Marta/.test(String(t)));
}
/** Desde tus datos: «Ayuda» → «Aprender a usarla» → «Lo esencial» → «Empezar» (queda en el paso 1). */
async function aEsencial() {
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-tour"]');
    await clic('[data-fk="cap-esencial"]', 500);
    if (await hay('[data-fk="tour-version-fijo"]')) await clic('[data-fk="tour-version-fijo"]', 500);
    if (await hay('[data-fk="tour-seguir"]')) await clic('[data-fk="tour-nuevo"]', 500);
    if (await hay('[data-fk="tour-empezar"]')) await clic('[data-fk="tour-empezar"]', 500);
    check('el capítulo empezó con los ejemplos', await estado(), (x) => x.modo === 'entrenamiento' && x.tour === 'paso' && x.persona !== 'uso');
}
const irPaso = async (n) => {
    for (let i = 0; i < 12 && (await ev('P.tour.i')) < n - 1; i++) {
        if (await hay('#capa-tour [data-fk="tour-sig"]')) await clic('#capa-tour [data-fk="tour-sig"]', 450);
        else if (await hay('#capa-tour [data-fk="tour-hazlo"]')) {
            await clic('#capa-tour [data-fk="tour-hazlo"]', 450);
            await clic('#capa-tour [data-fk="tour-saltar-paso"]', 450);
        } else break;
    }
};
const salirTour = async (sel = '#capa-tour [data-fk="tour-salir"]') => {
    check('hay «Salir»', await hay(sel), true);
    await clic(sel, 600);
};
/** El «atrás» del sistema. */
const atras = async () => {
    await ev('setTimeout(() => history.back(), 0); true');
    await esperar(350);
};

/** Cada camino por separado: si uno se rompe, los demás igual se prueban. */
async function seccion(nombre, fn) {
    if (process.env.SOLO && !process.env.SOLO.split(',').includes(nombre.split(')')[0])) return;
    actual = nombre;
    try {
        await fn();
    } catch (e) {
        fallos.push(`${actual}: excepción: ${e.message}`);
    }
}
const nombreGuardado = () => ev(`((JSON.parse(localStorage.getItem('pamplanea-uso:v1') || '{}')).st || {}).nombre || null`);
await seccion('0) el bug exacto: «Aprender a usarla» → «Cambiar» → «Lo recibo cuando vendo o trabajo» → «Ahora no»', async () => {
    await conDatos();
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-tour"]');
    check('1. «Aprender a usarla» dice «Tu versión: fecha fija»', await texto('.ay-version-elegida'), (t) => /fecha fija/.test(String(t)));
    await clic('[data-fk="am-cambiar"]', 600);
    check('2. «Cambiar»: ya en el entrenamiento, con los ejemplos', await estado(), (x) => x.modo === 'entrenamiento' && x.tour === 'elegir' && x.persona !== 'uso');
    check('2. tus datos guardados siguen siendo tuyos', await nombreGuardado(), 'Marta');
    await clic('#capa-tour [data-fk="tour-version-variable"]', 700);
    check('3. «Lo esencial» con los ejemplos que varían, en el entrenamiento', await estado(), (x) => x.modo === 'entrenamiento' && x.persona === 'rosa' && x.tour === 'intro');
    check('3. Rosa NO está en tus datos guardados', await nombreGuardado(), 'Marta');
    check('3. tus datos guardados intactos', await huellaGuardada(), ORIGINAL);
    await clic('#capa-tour [data-fk="tour-salir"]', 700);
    await enMisDatos('4. «Ahora no»');
    check('4. Rosa NO está en tus datos guardados', await nombreGuardado(), 'Marta');
    check('4. «Usarla con mis datos · Estás aquí» con TUS datos', await ev(`(() => { P.ayuda.abrir('inicio'); const t = document.querySelector('[data-fk="ay-usar"]').innerText; P.ayuda.cerrar(); return /Estás aquí/.test(t) && P.st.nombre === 'Marta'; })()`), true);
    await abrirApp();
    await enMisDatos('al reabrir');
    // Lo mismo con «Me pagan en fecha fija» y «Ahora no» al elegir la versión.
    await clic('[data-fk="avatar"]');
    await clic('[data-fk="menu-play"]');
    await clic('[data-fk="am-cambiar"]', 600);
    await clic('#capa-tour [data-fk="tour-saltar"]', 700);
    await enMisDatos('«Cambiar» → «Ahora no»');
    check('nada de los ejemplos en tus datos guardados', await nombreGuardado(), 'Marta');
});
await seccion('R) candado y recuperación de quien ya cayó en el bug', async () => {
    // El candado: con un ejemplo en pantalla «en uso», guardar no escribe nada en tus datos y queda como error.
    await conDatos();
    await ev(`(() => { P.st = DATOS.crearRosa(); P.modos.guardarUso(); P.guardarYa(); return true; })()`);
    await esperar(400);
    check('candado: Rosa no se escribe en tus datos', await huellaGuardada(), ORIGINAL);
    check('candado: queda registrado como error', await ev(`P.modos.errores.map((e) => e.que)`), (x) => Array.isArray(x) && x.includes('ejemplo-en-tus-datos'));
    check('candado: la app ya no dice que son tus datos', await ev('P.modo'), 'entrenamiento');
    // Lo que dejó el bug: Rosa guardada en tus datos (tal cual, y ya «renombrada» por la v2.6.3 al reabrir).
    const victima = async ({ renombrada = false, respaldo = false, copia = false } = {}) => {
        await abrirApp();
        await ev(`(() => {
            P.sinGuardar = true;
            localStorage.clear();
            const s = DATOS.crearRosa();
            ${renombrada ? "s.persona = 'uso';" : ''}
            s.registros.push({ id: 'r-encima', seq: s.seq++, tipo: 'gasto', fecha: '2026-10-19', nombre: 'Pan', categoria: 'comida', monto: 150, lugar: 'efectivo' });
            localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-10T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: ['2026-10-10'], anotaciones: 3, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: ${copia ? "'2026-10-18T10:00:00.000Z'" : 'null'}, nombresVistos: [] }));
            if (${respaldo}) {
                const m = DATOS.crearAna();
                Object.assign(m, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-16' });
                m.lugares[0].nombre = 'MiCajita';
                localStorage.setItem('pamplanea-uso:respaldo-esquema-1', JSON.stringify({ creado: '2026-10-10T08:00:00.000Z', actualizado: '2026-10-16T21:00:00.000Z', st: m, tab: 'hoy' }));
            }
            localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no' }));
            return true;
        })()`);
        await abrirApp();
    };
    await victima({ respaldo: true });
    check('con copia: Rosa NO se muestra como tuya', await ev(`({ modo: P.modo, nombre: P.st.nombre, persona: P.st.persona })`), (x) => x.modo === 'uso' && x.nombre !== 'Rosa' && x.persona === 'uso');
    check('con copia: lo explica y ofrece recuperarla', await texto('#capa-ayuda'), (t) => /datos de ejemplo/.test(String(t)) && /Encontramos una copia de tus datos del 16 oct 2026\. ¿Recuperarla\?/.test(String(t)));
    check('con copia: «Recuperar» y «Empezar de nuevo»', [await texto('[data-fk="rec-recuperar"]'), await texto('[data-fk="rec-de-nuevo"]')], ['Recuperar', 'Empezar de nuevo']);
    await clic('[data-fk="rec-recuperar"]', 700);
    check('«Recuperar»: tus datos de vuelta', await ev(`({ modo: P.modo, nombre: P.st.nombre, lugar: P.st.lugares[0].nombre, ayuda: P.ayuda.abierto })`), { modo: 'uso', nombre: 'Marta', lugar: 'MiCajita', ayuda: false });
    await esperar(400);
    check('«Recuperar»: guardados', await nombreGuardado(), 'Marta');
    check('lo de ejemplo quedó aparte (por si acaso)', await ev(`(JSON.parse(localStorage.getItem('pamplanea-uso:ejemplo-guardado') || 'null') || {}).st?.nombre || null`), 'Rosa');
    await abrirApp();
    check('al reabrir ya no pregunta', [await ev('P.ayuda.abierto'), await ev('P.st.nombre')], [false, 'Marta']);
    // Ya renombrada por la v2.6.3 (persona «uso»), sin respaldo pero con una copia descargada.
    await victima({ renombrada: true, copia: true });
    check('renombrada: también se reconoce', await ev(`({ nombre: P.st.nombre, panel: P.ayuda.abierto && P.ayuda.panel })`), (x) => x.nombre !== 'Rosa' && x.panel === 'recuperar');
    check('copia descargada: dice dónde buscarla', await texto('#capa-ayuda'), (t) => /18 oct 2026/.test(String(t)) && /pamplanea-copia-2026-10-18/.test(String(t)));
    await ev(`(() => { const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-18' }); s.lugares[0].nombre = 'MiCajita'; const u = { esquema: 2, creado: '2026-10-10T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [] }; const archivo = new File([JSON.stringify({ app: 'pamplanea-prototipo', tipo: 'copia-uso', esquema: 2, version: 'x', fecha: '2026-10-18T10:00:00.000Z', datos: u })], 'pamplanea-copia-2026-10-18.json', { type: 'application/json' }); const dt = new DataTransfer(); dt.items.add(archivo); const i = document.querySelector('#capa-ayuda input[data-copia]'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await esperar(600);
    check('la copia elegida pide confirmar', await hay('[data-fk="dt-r-si"]'), true);
    await clic('[data-fk="dt-r-si"]', 700);
    check('copia descargada: tus datos de vuelta', await ev(`({ modo: P.modo, nombre: P.st.nombre })`), { modo: 'uso', nombre: 'Marta' });
    // Una copia con datos de ejemplo no se acepta.
    check('una copia con Rosa no se acepta', await ev(`(() => { const s = DATOS.crearRosa(); const r = P.modos.validarCopia(JSON.stringify({ app: 'pamplanea-prototipo', tipo: 'copia-uso', esquema: 2, datos: { esquema: 2, st: s } })); return r.error || null; })()`), (e) => /ejemplo/.test(String(e)));
    // Sin copia: lo explica con calma y ofrece el Primer día.
    await victima({});
    check('sin copia: lo explica', await texto('#capa-ayuda'), (t) => /datos de ejemplo/.test(String(t)) && /no encontramos una copia/i.test(String(t)));
    check('sin copia: ofrece el Primer día', await texto('[data-fk="rec-primer-dia"]'), 'Empezar mi Primer día');
    await clic('[data-fk="rec-primer-dia"]', 700);
    check('sin copia: Primer día, sin Rosa', await ev(`({ modo: P.modo, configurado: !!P.st.configurado, nombre: P.st.nombre, ob: !!P.ui.ob, ayuda: P.ayuda.abierto })`), (x) => x.modo === 'uso' && !x.configurado && x.nombre !== 'Rosa' && x.ob && !x.ayuda);
    await esperar(400);
    check('sin copia: Rosa ya no está en tus datos', await nombreGuardado(), (n) => n !== 'Rosa');
    // Una persona de verdad llamada Ana (Primer día con su nombre): NO es un ejemplo.
    await abrirApp();
    await ev(`(() => { P.sinGuardar = true; localStorage.clear(); const s = DATOS.crearNueva(); Object.assign(s, { persona: 'uso', nombre: 'Ana', espacio: 'Hogar de Ana', configurado: true, hoy: '2026-10-21' }); s.registros.push({ id: 'r1', seq: 1, tipo: 'gasto', fecha: '2026-10-20', nombre: 'Café', categoria: 'comida', monto: 200, lugar: 'efectivo' }); localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-19T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Ana', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [] })); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no' })); return true; })()`);
    await abrirApp();
    check('Ana de verdad: sus datos, sin preguntar', await ev(`({ nombre: P.st.nombre, ayuda: P.ayuda.abierto, cafe: P.st.registros.some((r) => r.nombre === 'Café') })`), { nombre: 'Ana', ayuda: false, cafe: true });
});
await seccion('A) «Salir» en un paso', async () => {
        actual = 'A Salir en un paso';
        await conDatos();
        check('arranca en tus datos', await estado(), (x) => x.modo === 'uso' && x.persona === 'uso');
        await aEsencial();
        await irPaso(2);
        await salirTour();
        await enMisDatos('tras «Salir»');
        check('el avance quedó guardado (paso 2)', await progreso(), (p) => p && p.paso === 1 && !p.hecho);
        check('el aviso lo dice', await texto('.toast'), (t) => /tus datos/i.test(String(t)) && /avance/i.test(String(t)));
        // Retomar desde tus datos: «Aprender a usarla» dice dónde ibas y sigue ahí.
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        check('«Aprender a usarla» dice dónde ibas', await texto('[data-fk="cap-esencial"]'), (t) => /Ibas en el paso 2 de 6/.test(String(t)));
        await clic('[data-fk="cap-esencial"]', 500);
        check('pregunta si sigues', await hay('[data-fk="tour-seguir"]'), true);
        await clic('[data-fk="tour-seguir"]', 500);
        check('sigue en el paso 2', await ev('[P.tour.fase, P.tour.i]'), ['paso', 1]);
});
await seccion('B) «Salir» en «Hazlo tú» (con la hoja de Anotar abierta)', async () => {
        actual = 'B Salir en Hazlo tú';
        await conDatos();
        await aEsencial();
        await irPaso(3);
        await clic('#capa-tour [data-fk="tour-hazlo"]', 500);
        check('en «Hazlo tú»', await ev('P.tour.fase'), 'hazlo');
        await clic('[data-fk="nav-anotar"]', 400);
        check('Anotar abierta en los ejemplos', await ev('P.ui.hoja && P.ui.hoja.tipo'), 'anotar');
        await salirTour('#capa-tour .tour-hz [data-fk="tour-salir"]');
        await enMisDatos('tras «Salir» en «Hazlo tú»');
        check('sin la hoja de los ejemplos', await ev('!!P.ui.hoja'), false);
        check('el avance quedó guardado (paso 3)', await progreso(), (p) => p && p.paso === 2);
});
await seccion('C) el botón atrás o el gesto', async () => {
        actual = 'C atrás';
        await conDatos();
        await aEsencial();
        for (let i = 0; i < 3 && !(await estado()).dlg; i++) await atras();
        check('atrás al principio pregunta', await estado(), (x) => x.dlg === '¿Salir del entrenamiento?');
        check('la pregunta dice que vuelves a tus datos', await texto('#capa-dlg'), (t) => /tus datos/i.test(String(t)));
        await clic('[data-fk="dlg-si"]', 600);
        await enMisDatos('atrás → «Salir»');
        // Y el siguiente atrás, ya en Hoy de tus datos, es del teléfono (sale de la app, no vuelve al entrenamiento).
        await atras();
        check('el siguiente atrás sale de la app', await ev('location.href'), 'about:blank');
});
await seccion('D) en la pausa y en la pregunta', async () => {
        actual = 'D pausa';
        await conDatos();
        await aEsencial();
        await irPaso(3);
        await clic('#capa-tour [data-fk="tour-hazlo"]', 450);
        for (let k = 0; k < 14 && !(await ev('P.tour.hecho')); k++) await clic('#capa-tour [data-fk="tour-por-mi"]', 500);
        for (let k = 0; k < 20 && (await ev('P.tour.fase')) !== 'pausa'; k++) await esperar(200);
        await esperar(400);
        check('en la pausa', await ev('P.tour.fase'), 'pausa');
        await salirTour();
        await enMisDatos('«Salir» en la pausa');
        actual = 'D pregunta';
        await conDatos({ entrenamiento: { caps: { 'fijo:esencial': { paso: 6, hecho: false } }, tourVersion: 'fijo', tourUltimo: 'fijo:esencial' } });
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        await clic('[data-fk="cap-esencial"]', 500);
        await clic('[data-fk="tour-seguir"]', 500);
        check('en la pregunta', await ev('P.tour.fase'), 'pregunta');
        await salirTour();
        await enMisDatos('«Salir» en la pregunta');
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        await clic('[data-fk="cap-esencial"]', 500);
        await clic('[data-fk="tour-seguir"]', 500);
        await clic('#capa-tour [data-fk="tour-op-0"]', 400);
        check('respondida, con «Salir»', await hay('#capa-tour [data-fk="tour-salir"]'), true);
        await salirTour();
        await enMisDatos('«Salir» después de responder');
});
await seccion('E) retomar, «Ver un ejemplo», repaso y «Ahora no»', async () => {
        actual = 'E otras pantallas del entrenamiento';
        await conDatos({ entrenamiento: { caps: { 'fijo:esencial': { paso: 2, hecho: false } }, tourVersion: 'fijo', tourUltimo: 'fijo:esencial' } });
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        await clic('[data-fk="cap-esencial"]', 500);
        check('«¿Sigues donde te quedaste?»', await ev('P.tour.fase'), 'retomar');
        await salirTour();
        await enMisDatos('«Salir» al retomar');
        check('retomar no borra el avance', await progreso(), (p) => p && p.paso === 2);
        // «Ver un ejemplo» (un paso con ejemplo que se ve en la app).
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        const conEjemplo = await ev(`(() => { const v = P.tour.versiones ? P.tour.versiones : null; return true; })()`);
        if (conEjemplo) {
            await clic('[data-fk="cap-esencial"]', 500);
            await clic('[data-fk="tour-nuevo"]', 500);
            if (await hay('[data-fk="tour-empezar"]')) await clic('[data-fk="tour-empezar"]', 500);
            let visto = false;
            for (let i = 0; i < 8 && !visto; i++) {
                if (await hay('#capa-tour [data-fk="tour-ejemplo"]')) {
                    await clic('#capa-tour [data-fk="tour-ejemplo"]', 450);
                    visto = true;
                } else if (await hay('#capa-tour [data-fk="tour-sig"]')) await clic('#capa-tour [data-fk="tour-sig"]', 450);
                else if (await hay('#capa-tour [data-fk="tour-hazlo"]')) {
                    await clic('#capa-tour [data-fk="tour-hazlo"]', 450);
                    await clic('#capa-tour [data-fk="tour-saltar-paso"]', 450);
                } else break;
            }
            if (visto) {
                await salirTour();
                await enMisDatos('«Salir» viendo un ejemplo');
            }
        }
        // Repaso (respuesta equivocada → «Repasar este paso»).
        await ev(`(() => { P.sinGuardar = false; return true; })()`);
        await ev(`P.modos.guardarEntrenamiento({ caps: { 'fijo:esencial': { paso: 6, hecho: false } }, tourVersion: 'fijo', tourUltimo: 'fijo:esencial' }); true`);
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        await clic('[data-fk="cap-esencial"]', 500);
        await clic('[data-fk="tour-seguir"]', 500);
        const mala = await ev(`(() => { const q = P.tour.cap.pregunta; return q.ops.findIndex((_, j) => j !== q.bien); })()`);
        await clic(`#capa-tour [data-fk="tour-op-${mala}"]`, 400);
        check('respuesta equivocada: hay «Salir»', await hay('#capa-tour [data-fk="tour-salir"]'), true);
        await clic('#capa-tour [data-fk="tour-repasar"]', 500);
        check('en el repaso', await ev('P.tour.repaso'), true);
        await salirTour();
        await enMisDatos('«Salir» en el repaso');
        // «Ahora no» en «¿Cómo recibes tu dinero?» (sin versión elegida).
        await conDatos();
        await clic('[data-fk="avatar"]');
        await clic('[data-fk="menu-play"]');
        await clic('[data-fk="am-cambiar"]', 500);
        check('«¿Cómo recibes tu dinero?»', await ev('P.tour.fase'), 'elegir');
        await clic('#capa-tour [data-fk="tour-saltar"]', 600);
        await enMisDatos('«Ahora no» al elegir la versión');
});
await seccion('F) cerrar y reabrir a mitad', async () => {
        actual = 'F reabrir';
        await conDatos();
        await aEsencial();
        await irPaso(2);
        await ev('P.guardarYa(); true');
        await abrirApp();
        // Abre donde la dejaste (los ejemplos), con «Sigue donde te quedaste» y, arriba, «Mis datos» a un toque.
        check('al reabrir: en los ejemplos, sin el capítulo encima', await estado(), (x) => x.modo === 'entrenamiento' && !x.tour && x.persona !== 'uso');
        check('al reabrir: «Sigue donde te quedaste» en Hoy', await hay('[data-fk="tour-hoy-seguir"]'), true);
        check('al reabrir: tus datos guardados intactos', await huellaGuardada(), ORIGINAL);
        await clic('[data-fk="aviso-mis-datos"]', 600);
        await enMisDatos('al reabrir a mitad del capítulo → «Mis datos»');
        check('el capítulo sigue guardado donde ibas', await progreso(), (p) => p && p.paso === 1);
        // A mitad de «Hazlo tú», con Anotar abierta y algo escrito en los ejemplos.
        await aEsencial();
        await irPaso(3);
        await clic('#capa-tour [data-fk="tour-hazlo"]', 450);
        await clic('[data-fk="nav-anotar"]', 400);
        await ev(`(() => { const q = document.getElementById('anotar-q'); q.value = 'pupusas 6'; q.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
        await esperar(400);
        await abrirApp();
        check('al reabrir a mitad de «Hazlo tú»: tus datos guardados intactos', await huellaGuardada(), ORIGINAL);
        await clic('[data-fk="aviso-mis-datos"]', 600);
        await enMisDatos('al reabrir a mitad de «Hazlo tú» → «Mis datos»');
        check('nada de lo escrito en los ejemplos llegó a tus datos', await ev(`P.st.registros.filter((r) => r.fecha === '2026-10-21' && /pupusas/i.test(r.nombre || '')).length`), 0);
});
await seccion('G) en los ejemplos: arriba, «Ayuda» y la letra', async () => {
        actual = 'G un toque';
        await conDatos();
        await aEsencial();
        await ev('P.tour.terminar({ avisar: false }); P.render(); true');
        await esperar(400);
        check('en los ejemplos', await estado(), (x) => x.modo === 'entrenamiento' && !x.tour);
        check('arriba: «Mis datos»', await texto('[data-fk="aviso-mis-datos"]'), (t) => /Mis datos/.test(String(t)));
        check('arriba: su nombre accesible', await ev(`document.querySelector('[data-fk="aviso-mis-datos"]')?.getAttribute('aria-label')`), 'Volver a mis datos');
        await clic('[data-fk="aviso-mis-datos"]', 600);
        await enMisDatos('«Mis datos» arriba');
        check('en tus datos no está «Mis datos»', await hay('[data-fk="aviso-mis-datos"]'), false);
        await ev('P.modos.aEntrenamiento(); true');
        await esperar(300);
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-usar"]', 600);
        await enMisDatos('«Ayuda» → «Usarla con mis datos»');
        await ev('P.modos.aEntrenamiento(); true');
        await esperar(300);
        await clic('[data-fk="avatar"]');
        await clic('[data-fk="menu-smartphone"]', 600);
        await enMisDatos('la letra → «Usarla con mis datos»');
});
await seccion('H) la prueba guiada', async () => {
        actual = 'H prueba guiada';
        await conDatos();
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-prueba"]');
        await clic('[data-fk="ay-empezar-prueba"]', 500);
        if (await hay('[data-fk="ay-instalada-no"]')) await clic('[data-fk="ay-instalada-no"]', 400);
        else if (await hay('[data-a="ayInstalada"]')) await clic('[data-a="ayInstalada"]', 400);
        if (await hay('[data-fk="ay-comenzar"]')) await clic('[data-fk="ay-comenzar"]', 400);
        check('tarea en curso con los ejemplos', await ev(`({ modo: P.modo, barra: !document.getElementById('tarea-bar').hidden, estado: P.ayuda.datos().prueba.estado })`), { modo: 'entrenamiento', barra: true, estado: 'activa' });
        check('arriba: «Mis datos» con la tarea', await hay('[data-fk="aviso-mis-datos"]'), true);
        await clic('[data-fk="aviso-mis-datos"]', 600);
        await enMisDatos('«Mis datos» en la prueba guiada');
        check('la prueba quedó en pausa', await ev('P.ayuda.datos().prueba.estado'), 'libre');
        check('sin la barra de la tarea', await ev(`document.getElementById('tarea-bar').hidden`), true);
        // Retomar y salir con atrás → «Pausar» → «Mis datos».
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-prueba"]', 500);
        if (await hay('[data-fk="ay-comenzar"]')) await clic('[data-fk="ay-comenzar"]', 400);
        check('la prueba sigue donde iba', await ev('P.ayuda.datos().prueba.estado'), 'activa');
        await atras();
        check('atrás pregunta «¿Pausar la prueba?»', (await estado()).dlg, '¿Pausar la prueba?');
        await clic('[data-fk="dlg-si"]', 500);
        await clic('[data-fk="aviso-mis-datos"]', 600);
        await enMisDatos('atrás → «Pausar» → «Mis datos»');
});
await seccion('I) «Practicar»', async () => {
        actual = 'I Practicar';
        await conDatos();
        await ev('P.modos.aEntrenamiento(); true');
        await esperar(300);
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        await clic('[data-fk="am-practica"]');
        const primero = await ev(`document.querySelector('[data-a="prEmpezar"]').dataset.fk`);
        await clic(`[data-fk="${primero}"]`, 500);
        check('ejercicio en curso', await ev('P.practica.activa()'), true);
        check('arriba: «Mis datos» con el ejercicio', await hay('[data-fk="aviso-mis-datos"]'), true);
        await clic('[data-fk="aviso-mis-datos"]', 600);
        await enMisDatos('«Mis datos» en un ejercicio');
        check('sin ejercicio debajo', await ev('P.practica.activa() || !!P.practica.caso'), false);
        await ev('P.modos.aEntrenamiento(); true');
        await esperar(300);
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-tour"]');
        await clic('[data-fk="am-practica"]');
        await clic(`[data-fk="${primero}"]`, 500);
        await clic('[data-fk="pr-salir"]', 400);
        check('la lista dice «Volver a mis datos»', await texto('[data-fk="pr-usar"]'), 'Volver a mis datos');
        await clic('[data-fk="pr-usar"]', 600);
        await enMisDatos('«Practicar» → «Salir» → «Volver a mis datos»');
});
await seccion('J) ida y vuelta varias veces', async () => {
        actual = 'J ida y vuelta';
        await conDatos();
        const caminos = [
            async () => {
                await aEsencial();
                await irPaso(2);
                await salirTour();
            },
            async () => {
                await clic('[data-fk="avatar"]');
                await clic('[data-fk="menu-play"]');
                await clic('[data-fk="cap-esencial"]', 500);
                // Al retomar, atrás pregunta enseguida (no hay paso anterior) y el avance no se toca.
                await atras();
                if ((await estado()).dlg) await clic('[data-fk="dlg-si"]', 600);
                else await salirTour();
            },
            async () => {
                await ev(`P.acciones.ofertaTarjetas({ v: 'si' }); true`);
                await esperar(600);
                check('la oferta de tarjetas abre su capítulo', await estado(), (x) => x.modo === 'entrenamiento' && !!x.tour);
                await salirTour();
            },
            async () => {
                await ev('P.modos.aEntrenamiento(); true');
                await esperar(300);
                await clic('[data-fk="aviso-mis-datos"]', 600);
            },
        ];
        for (let vuelta = 0; vuelta < 2; vuelta++) {
            for (const [i, camino] of caminos.entries()) {
                await camino();
                await enMisDatos(`vuelta ${vuelta + 1}, camino ${i + 1}`);
            }
        }
        check('el avance de «Lo esencial» sigue guardado', await progreso(), (p) => p && p.paso >= 1 && !p.hecho);
});
await seccion('K) nada se mezcla', async () => {
        actual = 'K sin mezclar';
        await conDatos();
        // Ejemplos cargados por error estando «en uso»: no se guardan como tus datos.
        await ev(`(() => { P.cargar(DATOS.crearAna(), { tab: 'hoy' }); P.modos.guardarUso(); P.guardarYa(); return true; })()`);
        await esperar(400);
        check('los ejemplos no pisan tus datos guardados', await huellaGuardada(), ORIGINAL);
        // Tus datos cargados estando «en entrenamiento»: no se guardan como los ejemplos.
        await conDatos();
        await ev('P.modos.aEntrenamiento(); true');
        await esperar(300);
        const ejemplos = await ev(`${HUELLA}((JSON.parse(localStorage.getItem('pamplanea-proto-v2:app') || '{}')).st)`);
        await ev(`(() => { const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1')); P.cargar(u.st, { tab: 'hoy' }); P.guardarYa(); return true; })()`);
        await esperar(400);
        check('tus datos no se guardan como ejemplos', await ev(`${HUELLA}((JSON.parse(localStorage.getItem('pamplanea-proto-v2:app') || '{}')).st)`), ejemplos);
        // «Hazlo tú» abierto y se cambia a tus datos (por ejemplo, con el teclado): el entrenamiento se cierra.
        await conDatos();
        await aEsencial();
        await irPaso(3);
        await clic('#capa-tour [data-fk="tour-hazlo"]', 450);
        await ev(`P.modos.cambiar('uso'); true`);
        await esperar(600);
        check('el entrenamiento no sigue debajo', await ev('P.tour.activo'), false);
        await ev(`(() => { P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'pan 2'; q.dispatchEvent(new Event('input', { bubbles: true })); P.acciones.anotarGuardar(); return true; })()`);
        await esperar(900);
        check('anotar en tus datos no abre la pausa del entrenamiento', await ev(`({ tour: P.tour.activo, modo: P.modo, persona: P.st.persona })`), { tour: false, modo: 'uso', persona: 'uso' });
        check('tu anotación quedó en tus datos', await ev(`P.st.registros.filter((r) => r.nombre === 'Pan').length`), 1);
        check('y se guardó en tus datos', await ev(`(JSON.parse(localStorage.getItem('pamplanea-uso:v1')).st.registros || []).some((r) => r.nombre === 'Pan')`), true);
});
await seccion('L) sin datos propios, y la guía', async () => {
        actual = 'L sin datos';
        await abrirApp();
        await ev(`(() => { P.sinGuardar = true; localStorage.clear(); return true; })()`);
        await abrirApp();
        check('bienvenida', await hay('[data-fk="elegir-aprender"]'), true);
        await clic('[data-fk="elegir-aprender"]', 600);
        if (await hay('[data-fk="tour-version-fijo"]')) await clic('[data-fk="tour-version-fijo"]', 500);
        if (await hay('[data-fk="tour-empezar"]')) await clic('[data-fk="tour-empezar"]', 500);
        await irPaso(2);
        await salirTour();
        check('sin datos: «Salir» deja los ejemplos', await estado(), (x) => x.modo === 'entrenamiento' && !x.tour && x.persona !== 'uso');
        check('sin datos: el aviso de siempre', await texto('.toast'), (t) => /ejemplos como al inicio/.test(String(t)));
        check('arriba: «Usar mis datos»', await texto('[data-fk="aviso-mis-datos"]'), (t) => /Usar mis datos/.test(String(t)));
        await clic('[data-fk="aviso-mis-datos"]', 600);
        check('lleva a la bienvenida de «Usarla con mis datos»', await estado(), (x) => x.modo === 'uso' && x.ayuda === 'introUso');
        // Reabrir sin datos propios en el entrenamiento: sigue en el entrenamiento.
        await abrirApp();
        await ev(`(() => { P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'entrenamiento' })); return true; })()`);
        await abrirApp();
        check('sin datos propios, reabre en el entrenamiento', await estado(), (x) => x.modo === 'entrenamiento');
        // La guía de escritorio: sin «Mis datos» y «Salir» no salta a tus datos (por file:// el marco no se puede leer).
        await conDatos();
        await b.ir(base + 'index.html');
        await esperar(1500);
        const legible = await ev(`(() => { try { return !!document.getElementById('telefono').contentWindow.P; } catch { return false; } })()`);
        if (legible) {
            const enMarco = (s) => ev(`document.getElementById('telefono').contentWindow.eval(${js(s)})`);
            check('guía: sin «Mis datos»', await enMarco(`!!document.querySelector('[data-fk="aviso-mis-datos"]')`), false);
            await enMarco(`P.tour.empezar({ version: 'fijo', cap: 'esencial' }); true`);
            await esperar(800);
            await enMarco(`(document.querySelector('#capa-tour [data-fk="tour-salir"]') || document.body).click(); true`);
            await esperar(700);
            check('guía: «Salir» se queda en los ejemplos', await enMarco(`({ modo: P.modo, persona: P.st.persona })`), (x) => x.modo === 'entrenamiento' && x.persona !== 'uso');
        }
        await b.ir(base + 'telefono.html');
        await esperar(600);
        check('guía: tus datos siguen intactos', await huellaGuardada(), ORIGINAL);
});

// El candado escribe un error en la consola a propósito (sección R y K): ese sí se espera; cualquier otro no.
const errores = b.errores.filter((e) => !/PamPlanea: candado/.test(e));
const informe = { checks, fallos, errores, candado: b.errores.length - errores.length };
console.log(JSON.stringify(informe, null, 1));
b.cerrar();
process.exit(fallos.length || errores.length ? 1 : 0);
