// PRUEBAS v2.6 «Simplificar para la prueba familiar» (V2-60 a V2-63). A 390×844:
//  A) menús: «Ayuda» y la letra, en los dos modos, muestran SOLO los tres caminos, «Cuéntale a Victor o a Pam cómo vas»,
//     «Tus datos», la apariencia y la versión; nada de casos, Ana/Carlos, explorar, «Practicar» suelto, sets ni moderador;
//     «Aprende» sin «Practicar»; «Aprender a usarla» con sus datos de ejemplo («datos de ejemplo», sin nombres);
//  B) ?victor=1: las herramientas de Victor (13 casos, explorar, notas, reiniciar los ejemplos, sets y moderador); con
//     tus datos, solo un aviso para ir a los ejemplos; ?set=A y ?set=B siguen funcionando;
//  C) la prueba guiada sin letras y con el set asignado por la app (alterna por teléfono), C33 fuera del set B, retomar
//     desde tus datos, el índice del set B viejo y la tarjeta del final que lleva a «Cuéntale…»;
//  D) «Cuéntale…»: las dos listas salen de las mismas partes que el texto (y lo que escribe la persona aparece al momento);
//  E) privacidad: ni montos ni nombres (también sin tildes, partes de un nombre y nombres cortos), ni notas de Victor;
//  F) sin recordatorios (ni notificaciones, ni calendario, ni tarjetas por fecha);
//  G) «Tus datos» desde el entrenamiento (sin datos y con datos), sin tocar los ejemplos;
//  H) 44 px, contraste ≥ 4.5:1 en los 4 temas, reducir movimiento y capturas.
// Uso: node herramientas/v26.mjs [--base=http://…/] [--tema=serena-claro] [--partes=a,b,c,d,e,f,g,h] [--puerto=9961]
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const partes = (args.partes || 'a,b,c,d,e,f,g,h').split(',');
const salida = path.join(root, 'capturas', 'v26' + (args.base ? '-servida' : ''), tema);
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9961) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const informe = { base, tema, fallos: [], numeros: {}, notas: {}, errores: b.errores, fallidas: b.fallidas };
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
let actual = '';
let n = 0;
const foto = async (nombre) => {
    await esperar(150);
    await ev(`Promise.race([Promise.all(document.getAnimations().filter((a) => a.playState === 'running' && Number.isFinite(a.effect.getComputedTiming().endTime)).map((a) => a.finished.catch(() => null))), new Promise((r) => setTimeout(r, 1500))]).then(() => true)`);
    await esperar(60);
    await b.captura(path.join(salida, `${String(++n).padStart(3, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(170);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(120);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 500)}»`);
    return ok;
};
const contiene = (...subs) => (x) => typeof x === 'string' && subs.every((s) => x.includes(s));
// v2.6.1: la versión se lee de casos.js (no hay que cambiar la prueba en cada versión).
const VERSION = /VERSION_PROTOTIPO = '([^']+)'/.exec(await readFile(path.join(root, 'casos.js'), 'utf8'))[1];
let scriptFecha = null;
async function fecha(iso) {
    if (scriptFecha) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptFecha });
    scriptFecha = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = ${js(iso)};` })).identifier;
}
/** Abre la app de verdad (recarga completa). `q`: lo que va en el enlace (?victor=1, ?set=B). */
async function abrirApp(q = '') {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html' + q + '#tema=' + tema);
    await esperar(450);
}
async function limpio(q = '') {
    await abrirApp(q);
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp(q);
}
/** Teléfono nuevo → «Aprender a usarla» → «Ahora no»: modo entrenamiento, sin nada abierto. */
async function enEntrenamiento(q = '') {
    await limpio(q);
    await clic('[data-fk="elegir-aprender"]');
    await esperar(400);
    await clic('[data-fk="tour-saltar"]');
    await esperar(250);
}
/** Lo que se puede tocar dentro de un contenedor, por su nombre corto (título de la opción, de la fila o su texto). */
const tocables = (sel) =>
    ev(`[...document.querySelectorAll(${js(sel)})].filter((e) => e.getClientRects().length).map((e) => (e.getAttribute('aria-label') || e.querySelector('.opcion-g-t, .fila-t')?.textContent || e.textContent).replace(/\\s+/g, ' ').trim())`);
// v2.6.1 (V2-69 #38): «Instalar la app» es su propia fila en «Ayuda» mientras la app no esté instalada (en estas pruebas no lo está).
const SOLO = ['Usarla con mis datos', 'Aprender a usarla', 'Prueba guiada', 'Instalar la app', 'Cuéntale a Victor o a Pam cómo vas', 'Tus datos'];
const TEMAS = ['Serena claro', 'Serena oscuro', 'Ancla claro', 'Ancla oscuro'];
/** Palabras que la persona no debe ver en los menús (V2-60, V2-63). */
const PROHIBIDO = [/\bC\d\d\b/, /\bcasos?\b/i, /\bAna\b/, /\bCarlos\b/, /\bRosa\b/, /explorar/i, /moderador/i, /\bset\b/i, /practicar/i, /Ir al modo entrenamiento/i, /reiniciar/i, /Mis notas/i, /\bgu[ií]a\b/i];
const prohibidoEn = (t) => PROHIBIDO.filter((r) => r.test(t || '')).map(String);
/** La persona nunca ve la letra del set (V2-61): ni en «Ayuda», ni en la barra de la tarea. */
const sinLetras = async (donde) => check(`${donde}: sin «set A/B»`, await ev(`[document.getElementById('capa-ayuda').innerText, document.getElementById('tarea-bar').innerText, document.getElementById('ay-texto')?.value || ''].join(' | ')`), (t) => !/\bset\b/i.test(t) && !/\bSet [AB]\b/.test(t));
/** Datos de uso armados directo en lo guardado (el primer día se prueba en recorrer-modos). */
async function ponerUso({ nombre = 'Marta', conFeedback = true } = {}) {
    await ev(`(() => {
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: ${js(nombre)}, espacio: 'Mi casa', hoy: '2026-10-23' });
        s.lugares.push({ id: 'ba', tipo: 'banco', nombre: 'BA', emoji: '🏦' });
        s.medios.push({ id: 'tigo', nombre: 'Tigo Money', emoji: '📱', lugar: 'efectivo' });
        s.apartados.find((a) => a.id === 'vacaciones').nombre = 'Viaje a la playa';
        s.ingresos.push({ id: 'remesa', nombre: 'Remesa de Josué', emoji: '🌎', categoria: 'remesa', monto: 15000, aprox: true, frecuencia: 'mensual', dia: 10, lugar: 'agricola', principal: false, desde: '2026-10-01', llegadas: {} });
        const uso = { esquema: 2, creado: '2026-10-19T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: ${js(nombre)},
            metricas: { dias: ['2026-10-19', '2026-10-20', '2026-10-23'], anotaciones: 7, cuadres: 1, pagados: 2, reparte: 0, alDia: 0, pantallas: { hoy: 9, pagos: 3, anotar: 7, midinero: 2 }, noEntendio: 1, instalada: false },
            feedback: ${conFeedback} ? [{ fecha: '2026-10-21', facil: 4, confuso: 'No sabía qué era cuadrar con $35.50 en Banco Agrícola, ni lo del agricola', gustaria: 'Que me avise del BA y de la tigo money: me pagan 600 y debo 1,200.50' }] : [],
            feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: ['Cuchubal de la cuadra'] };
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify(uso));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true } }));
        return true;
    })()`);
}
/** Una prueba guiada ya terminada (set A), con lo que la persona escribió (montos y nombres de sus cosas adentro). */
async function ponerPruebaHecha() {
    await ev(`(() => {
        const t0 = Date.parse('2026-10-20T15:00:00Z');
        const tarea = (i, extra) => ({ inicio: t0 + i * 120000, fin: t0 + i * 120000 + 65000, toques: 10 + i, pantallas: ['Hoy', 'Anotar'], detectada: true, resultado: 'listo', facil: 4, ...extra });
        const d = { nombre: 'Marta', notas: { C05: 'nota de caso que NO debe ir', general: 'nota general que NO debe ir' }, prueba: { estado: 'fin', set: 'A', origen: 'alterno', perfil: { pago: 'quincena', dinero: 'ambos', tarjeta: 'si', cuentas: 'cuaderno' }, i: 6,
            tareas: { 'primer-dia': tarea(0, { confuso: 'Puse 1,000 en Banco Agrícola y no sé' }), pupusas: tarea(1, { resultado: 'rendida', detectada: false, facil: 2, confuso: 'No vi el + de abajo, gasté $6' }), colegio: tarea(2, {}), quincena: tarea(3, {}), laptop: tarea(4, { resultado: 'listo', detectada: false }), regalo: tarea(5, {}), comprension: { toques: 0, pantallas: [], inicio: t0 + 900000, fin: t0 + 960000 } },
            final: { numero: 'Lo que me queda: $270.60 hasta el 30', sirve: 'Para no gastar de más con mi Tigo Money', usarias: 'Sí, si no me pide anotar todo' }, instalada: null, inicio: '2026-10-20T15:00:00.000Z', finalizada: '2026-10-20T15:16:00.000Z', enviado: false } };
        localStorage.setItem('pamplanea-proto-v2:notas', JSON.stringify(d));
        localStorage.setItem('pamplanea-proto-v2:dispositivo', JSON.stringify({ personas: 1, setSiguiente: null }));
        return true;
    })()`);
}
/** Las letras sin tilde ni mayúsculas (para buscar nombres como lo hace la app). */
const simple = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const palabras = (s) => simple(s).split(/[^a-z0-9]+/).filter(Boolean);

try {
    // ============================================================ A) menús: solo lo permitido (V2-60, V2-63)
    if (partes.includes('a')) {
        actual = 'A menús';
        await fecha('2026-10-19');
        await enEntrenamiento();
        check('botón de arriba: «Ayuda»', await texto('#btn-ayuda'), 'Ayuda');
        await clic('#btn-ayuda');
        await foto('A-ayuda-entrenamiento');
        check('Ayuda (entrenamiento): solo lo permitido', await tocables('.ay button, .ay a, .ay summary'), ['Cerrar', ...SOLO, ...TEMAS]);
        check('Ayuda (entrenamiento): título', await texto('#ay-t'), 'Ayuda');
        check('Ayuda (entrenamiento): la versión', await texto('.ay-version'), contiene(VERSION));
        check('Ayuda (entrenamiento): nada prohibido', prohibidoEn(await texto('.ay')), []);
        check('Ayuda (entrenamiento): ninguno marcado «Estás aquí»', await ev('document.querySelectorAll(".ay [aria-current=true]").length'), 0);
        await clic('[data-fk="ay-x"]');
        await clic('[data-fk="avatar"]');
        await esperar(250);
        await ev('document.querySelector(".hoja-c").scrollTop = 9999; true');
        await foto('A-letra-entrenamiento');
        const filasLetra = () => ev(`[...document.querySelectorAll('.menu-sec + .lista .fila-t')].map((e) => e.textContent.trim())`);
        check('letra (entrenamiento): los mismos cinco', await filasLetra(), SOLO);
        check('letra (entrenamiento): la versión', await texto('.hoja .ay-version'), VERSION);
        check('letra (entrenamiento): nada prohibido', prohibidoEn(await ev(`[...document.querySelectorAll('.menu-sec, .menu-sec + .lista, .hoja .ay-version')].map((e) => e.innerText).join(' ')`)), []);
        // «Aprende» (tu letra): sin «Practicar» suelto.
        await clic('[data-fk="menu-book-open"]');
        await esperar(250);
        check('«Aprende»: solo «Aprender a usarla»', await tocables('#pantalla .pg > .btn, #pantalla .acciones-2 .btn'), ['Aprender a usarla']);
        check('«Aprende»: sin «Practicar»', await texto('#pantalla'), (t) => !/practicar/i.test(t));
        await foto('A-aprende');
        // «Aprender a usarla»: «Practicar» sigue adentro; los ejemplos se presentan como «datos de ejemplo» (V2-63).
        await clic('[data-fk="apr-tour"]');
        await esperar(250);
        check('«Aprender a usarla»: el panel con «Practicar» adentro', [await ev('P.ayuda.panel'), await hay('[data-fk="am-practica"]')], ['aprendeMas', true]);
        check('«Aprender a usarla»: sin nombres de ejemplo', await texto('.ay'), (t) => !/\bAna\b|\bRosa\b|\bCarlos\b/.test(t) && t.includes('datos de ejemplo'));
        await foto('A-aprender-a-usarla');
        // La intro de «Lo esencial» dice «datos de ejemplo», sin el nombre (en las dos versiones).
        for (const v of ['fijo', 'variable']) {
            await ev(`P.ayuda.cerrar(); P.tour.empezarCap(${js(v)}, 'esencial', { retomar: false }); true`);
            await esperar(700);
            const intro = await texto('#tour-x');
            check(`intro de «Lo esencial» (${v}): «datos de ejemplo», sin nombre`, intro, (t) => t.startsWith('Con datos de ejemplo de alguien que') && !/\bAna\b|\bRosa\b/.test(t));
            await foto(`A-intro-${v}`);
            await ev('P.acciones.tourSalir(); true');
            await esperar(300);
        }
        // Con tus datos: la misma «Ayuda», con «Usarla con mis datos» marcado.
        await limpio();
        await ponerUso({ conFeedback: false });
        await abrirApp();
        check('con tus datos: en uso', await ev('P.modo'), 'uso');
        check('con tus datos: botón «Ayuda»', await texto('#btn-ayuda'), 'Ayuda');
        await clic('#btn-ayuda');
        await foto('A-ayuda-uso');
        // v2.6.2 (V2-68): con tus datos, también «Completar tu Primer día» (después de «Instalar la app»).
        check('Ayuda (uso): solo lo permitido', await tocables('.ay button, .ay a, .ay summary'), ['Cerrar', ...SOLO.slice(0, 4), 'Completar tu Primer día', ...SOLO.slice(4), ...TEMAS]);
        check('Ayuda (uso): «Usarla con mis datos» · Estás aquí', await ev('[...document.querySelectorAll(".ay [aria-current=true]")].map((e) => e.innerText.replace(/\\s+/g, " ").trim())'), ['Usarla con mis datos Estás aquí']);
        check('Ayuda (uso): nada prohibido', prohibidoEn(await texto('.ay')), []);
        check('Ayuda (uso): sin «Ir al modo entrenamiento» ni «Instalar» suelto', await texto('.ay'), (t) => !/Ir al modo entrenamiento/i.test(t) && !/Instalar en tu teléfono/.test(t));
        await clic('[data-fk="ay-usar"]');
        check('«Estás aquí»: solo cierra', [await ev('P.ayuda.abierto'), await ev('P.modo')], [false, 'uso']);
        await clic('[data-fk="avatar"]');
        await esperar(250);
        await ev('document.querySelector(".hoja-c").scrollTop = 9999; true');
        await foto('A-letra-uso');
        check('letra (uso): los mismos cinco', await filasLetra(), SOLO);
        check('letra (uso): «Usarla con mis datos» · Estás aquí', await texto('[data-fk="menu-smartphone"]'), 'Usarla con mis datos Estás aquí');
        // «Aprender a usarla» desde tus datos: el panel de capítulos (ya no la exploración libre de los ejemplos).
        await clic('[data-fk="menu-play"]');
        await esperar(250);
        check('letra (uso) → «Aprender a usarla»: el panel, sin salir de tus datos', [await ev('P.ayuda.panel'), await ev('P.modo')], ['aprendeMas', 'uso']);
        await ev('P.ayuda.cerrar(); true');
        // «Antes de empezar» → «Mejor primero aprender a usarla»: el entrenamiento (no la exploración libre).
        await fecha('2026-10-19');
        await limpio();
        await clic('[data-fk="elegir-usar"]');
        await clic('[data-fk="intro-aprender"]');
        await esperar(500);
        check('«Mejor primero aprender a usarla»: empieza el entrenamiento', [await ev('P.modo'), await ev('P.tour.activo'), await ev('P.tour.fase')], ['entrenamiento', true, 'elegir']);
    }

    // ============================================================ B) ?victor=1: las herramientas de Victor
    if (partes.includes('b')) {
        actual = 'B victor';
        await fecha('2026-10-19');
        await enEntrenamiento('?victor=1');
        await clic('#btn-ayuda');
        check('?victor=1: lo de la persona, igual', (await tocables('.ay-c > .ay-tres button, .ay-c > .ay-lista button')), SOLO);
        check('?victor=1: «Herramientas de Victor»', await texto('.ay-v-sec'), contiene('Herramientas de Victor'));
        check('?victor=1: los 13 casos', await ev('document.querySelectorAll(".ay-caso").length'), 13);
        check('?victor=1: explorar con Ana, Carlos y Rosa', [await hay('[data-fk="ay-ana"]'), await hay('[data-fk="ay-carlos"]'), await hay('[data-fk="ay-rosa"]')], [true, true, true]);
        check('?victor=1: reiniciar los ejemplos, notas y moderador', [await hay('[data-fk="ay-reiniciar"]'), await hay('#ay-nota'), await hay('[data-fk="ay-moderador"]')], [true, true, true]);
        // v2.8 (D-11): las preguntas de comprensión de la prueba familiar, solo en las herramientas de Victor.
        check('?victor=1: preguntas de comprensión (D-11)', await ev(`document.querySelector('#ay-d11')?.textContent.replace(/\\s+/g, ' ') ?? null`), contiene('Preguntas de comprensión (prueba familiar)', 'Si hoy gastas $20, ¿qué cambia?', 'Si pagas $50 de una cuota de $100, ¿cuánto falta?', 'Si gastas $20 en el súper, ¿baja tu libre?'));
        await ev('document.querySelector(".ay-c").scrollTop = 99999; true');
        await foto('B-victor-herramientas');
        await clic('[data-fk="ay-moderador"]');
        check('moderador: elegir el set', [await hay('[data-fk="ay-set-A"]'), await hay('[data-fk="ay-set-B"]')], [true, true]);
        await foto('B-victor-moderador');
        await clic('[data-fk="ay-set-B"]');
        check('moderador: la próxima persona hará el set B', await texto('.ay'), contiene('La próxima persona en este teléfono hará el set B'));
        await clic('[data-fk="ay-m-volver"]');
        await clic('[data-fk="ay-caso-C05"]');
        check('un caso se abre', await ev('P.caso && P.caso.id'), 'C05');
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-reiniciar"]');
        // v2.8 (D-4, U01): los $15 de intereses de BAC van con la quincena del 30 (antes: $270.60).
        check('reiniciar los ejemplos', await texto('.portada-n'), '$285.60');
        // Con tus datos: las herramientas no se ofrecen (cargarían ejemplos encima); solo «Ir a los ejemplos».
        await limpio('?victor=1');
        await ponerUso({ conFeedback: false });
        await abrirApp('?victor=1');
        const antes = await ev('localStorage.getItem("pamplanea-uso:v1")');
        await clic('#btn-ayuda');
        check('?victor=1 con tus datos: sin casos', [await ev('document.querySelectorAll(".ay-caso").length'), await hay('[data-fk="ay-v-ejemplos"]')], [0, true]);
        await ev('["ayCaso", "ayPersona", "ayReiniciar", "aySimular"].forEach((k) => P.acciones[k]({ v: k === "ayCaso" ? "C05" : k === "aySimular" ? "viernes" : "ana" })); true');
        await esperar(200);
        check('las herramientas no tocan tus datos', [await ev('P.modo'), await ev('P.st.persona'), await ev('localStorage.getItem("pamplanea-uso:v1")') === antes], ['uso', 'uso', true]);
        await foto('B-victor-uso');
        await clic('[data-fk="ay-v-ejemplos"]');
        check('«Ir a los ejemplos»', await ev('P.modo'), 'entrenamiento');
        // Sin ?victor=1 no hay nada de esto (también la parte A).
        await abrirApp();
        await clic('#btn-ayuda');
        check('sin ?victor=1: sin herramientas', [await hay('.ay-v-sec'), await ev('document.querySelectorAll(".ay-caso").length'), await hay('[data-fk="ay-moderador"]')], [false, 0, false]);
        // En la pantalla angosta, index.html?victor=1 abre la app con el enlace intacto.
        await b.ir('about:blank');
        await b.ir(base + 'index.html?victor=1');
        await esperar(500);
        check('index.html?victor=1 → telefono.html?victor=1', await ev('location.pathname.endsWith("telefono.html") && location.search'), '?victor=1');
        // ?set=A y ?set=B siguen funcionando (la persona no ve la letra).
        for (const s of ['A', 'B']) {
            await limpio(`?set=${s}`);
            check(`?set=${s}: abre la prueba guiada`, await hay('.ay-bienvenida'), true);
            await clic('[data-fk="ay-empezar-prueba"]');
            await clic('[data-fk="ay-inst-saltar"]');
            const guardado = await ev('JSON.parse(localStorage.getItem("pamplanea-proto-v2:notas")).prueba');
            check(`?set=${s}: set y origen`, [guardado.set, guardado.origen], [s, 'enlace']);
            check(`?set=${s}: primera tarea`, await texto('.ay-tarea--grande'), contiene(s === 'A' ? 'Configúrala' : 'pupusas'));
            await sinLetras(`?set=${s}`);
        }
    }

    // ============================================================ C) la prueba guiada sin letras (V2-61) y C33 fuera (V2-63)
    if (partes.includes('c')) {
        actual = 'C prueba';
        const sets = await (async () => {
            await abrirApp();
            return ev('({ A: SETS.A.map((t) => [t.id, t.caso || null, t.titulo, t.tarea]), B: SETS.B.map((t) => [t.id, t.caso || null, t.titulo, t.tarea]) })');
        })();
        check('C33 fuera del set B', sets.B.map((t) => t[1]), ['C05', 'C16', 'C32', 'C31', 'C26', null]);
        check('set B: 6 tareas; set A: 7', [sets.B.length, sets.A.length], [6, 7]);
        check('ninguna tarea dice «Carlos» ni «otra persona»', [...sets.A, ...sets.B].filter((t) => /Carlos|otra persona/i.test(t[2] + ' ' + t[3])).map((t) => t[0]), []);
        // Persona 1 en este teléfono: la app le da el set A, sin decirlo.
        await fecha('2026-10-19');
        await enEntrenamiento();
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-prueba"]');
        check('bienvenida: dos líneas simples', await texto('.ay-bienvenida'), 'Te pongo tareas cortas para ver si la app se entiende. No es un examen para ti: es para la app. Usas datos de ejemplo, no los tuyos. Son unos 15 minutos.');
        check('bienvenida: «Prueba guiada»', await texto('#ay-t'), 'Prueba guiada');
        await sinLetras('bienvenida');
        await foto('C-bienvenida');
        await escribir('#ay-nombre-t', 'Sofi');
        await clic('[data-fk="ay-p-pago-quincena"]');
        await clic('[data-fk="ay-empezar-prueba"]');
        await clic('[data-fk="ay-inst-saltar"]');
        check('persona 1: set A, alternado', await ev('(({ set, origen }) => [set, origen])(JSON.parse(localStorage.getItem("pamplanea-proto-v2:notas")).prueba)'), ['A', 'alterno']);
        const total = await ev('SETS.A.length');
        for (let i = 0; i < total; i++) {
            check(`tarea ${i + 1}: «Tarea ${i + 1} de ${total}»`, await texto('.ay .paso'), contiene(`Tarea ${i + 1} de ${total}`));
            await sinLetras(`tarea ${i + 1}`);
            if (i === 1) await foto('C-tarea');
            await clic('[data-fk="ay-comenzar"]');
            await sinLetras(`barra ${i + 1}`);
            if (i === 1) {
                await clic('#btn-ayuda');
                check('Ayuda con la prueba en curso: sin letra', await texto('.ay'), (t) => t.includes(`Prueba guiada · tarea 2 de ${total}`) && t.includes('Vas en la tarea 2 de 7'));
                check('Ayuda con la prueba en curso: lo permitido + ver y pausar', await tocables('.ay button, .ay a, .ay summary'), ['Cerrar', 'Ver la tarea', 'Pausar la prueba', ...SOLO, ...TEMAS]);
                await sinLetras('Ayuda en curso');
                await foto('C-ayuda-en-curso');
                await clic('[data-fk="ay-x"]');
            }
            if (i < total - 1) {
                await clic('[data-fk="tarea-rendir"]');
                await sinLetras(`respuesta ${i + 1}`);
                await clic('[data-fk="ay-facil-3"]');
                if (i === 0) await escribir('#ay-confuso', 'Me pidió el banco y puse $1,000');
                await clic('[data-fk="ay-responder"]');
            } else {
                await clic('[data-fk="tarea-responder"]');
                await escribir('#ay-f-numero', 'Lo que me queda hasta la quincena');
                await escribir('#ay-f-sirve', 'Para no gastar de más');
                await escribir('#ay-f-usarias', 'Sí');
                await sinLetras('comprensión');
                await clic('[data-fk="ay-final"]');
            }
        }
        // El final: la tarjeta «Cuéntale a Victor o a Pam cómo te fue» (V2-62) lleva a esa pantalla.
        actual = 'C final';
        check('final: la tarjeta', [await texto('#ay-fin-c'), await texto('[data-fk="ay-fin-contar"]'), await texto('.ay-gracias')], ['Cuéntale a Victor o a Pam cómo te fue', 'Ver qué se manda', '¡Gracias! Terminaste la prueba. Lo que hiciste nos ayuda a que la app se entienda mejor.']);
        check('final: sin el texto viejo para WhatsApp', await hay('.ay #ay-texto'), false);
        check('final: «Usarla con mis datos» (no tiene datos)', await texto('[data-fk="ay-fin-usar"]'), 'Usarla con mis datos');
        await sinLetras('final');
        await foto('C-final');
        await clic('[data-fk="ay-fin-contar"]');
        check('la tarjeta abre «Cuéntale…»', [await ev('P.ayuda.panel'), await texto('#ay-t')], ['contar', 'Cuéntale a Victor o a Pam cómo vas']);
        const t = await ev('document.getElementById("ay-texto").value');
        check('«Cuéntale…» trae la prueba, sin letra', t, (x) => x.includes('Prueba guiada: la terminé') && x.includes('1. Primer día: no pude') && x.includes('Al final, con mis palabras:') && x.includes('Sobre mí: me pagan cada quincena') && x.includes('Nombre: Sofi') && !/\bset\b/i.test(x));
        check('«Cuéntale…»: lo escrito, tapado', t, (x) => x.includes('Me confundió: Me pidió el banco y puse [monto]'));
        await sinLetras('«Cuéntale…» de la prueba');
        informe.notas.textoPrueba = t;
        // En «Ayuda», «Prueba guiada» ya hecha lleva al final.
        await clic('[data-fk="ay-x"]');
        await clic('#btn-ayuda');
        check('«Prueba guiada» ya hecha', await texto('[data-fk="ay-prueba"]'), 'Prueba guiada Ya la hiciste: cuéntale a Victor o a Pam cómo te fue');
        await clic('[data-fk="ay-prueba"]');
        check('… abre el final', await ev('P.ayuda.panel'), 'fin');
        // Persona 2 en el mismo teléfono (Victor: «Nueva persona»): la app le da el set B, sin decirlo.
        actual = 'C persona 2';
        await abrirApp('?victor=1');
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-moderador"]');
        await clic('[data-fk="ay-nueva"]');
        await clic('[data-fk="ay-nueva-si"]');
        await clic('[data-fk="ay-empezar-prueba"]');
        await clic('[data-fk="ay-inst-saltar"]');
        check('persona 2: set B, alternado', await ev('(({ set, origen }) => [set, origen])(JSON.parse(localStorage.getItem("pamplanea-proto-v2:notas")).prueba)'), ['B', 'alterno']);
        check('persona 2: «Tarea 1 de 6» (sin Carlos)', [await texto('.ay .paso'), await texto('.ay-tarea--grande')], (x) => x[0] === 'Tarea 1 de 6' && x[1].includes('pupusas'));
        await sinLetras('persona 2');
        // Pausar, pasar a tus datos y retomar desde «Ayuda».
        actual = 'C retomar';
        await clic('[data-fk="ay-comenzar"]');
        await clic('[data-fk="tarea-rendir"]');
        await clic('[data-fk="ay-facil-2"]');
        await clic('[data-fk="ay-responder"]');
        await clic('[data-fk="ay-x"]').catch(() => null);
        await ev('P.acciones.ayComenzar && P.acciones.ayComenzar(); true');
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-usar"]');
        check('a tus datos: la prueba queda en pausa', [await ev('P.modo'), await ev('JSON.parse(localStorage.getItem("pamplanea-proto-v2:notas")).prueba.estado')], ['uso', 'libre']);
        await clic('[data-fk="intro-empezar"]').catch(() => null);
        await clic('#btn-ayuda');
        check('«Prueba guiada» en pausa', await texto('[data-fk="ay-prueba"]'), 'Prueba guiada La dejaste en la tarea 2 de 6');
        await clic('[data-fk="ay-prueba"]');
        check('retoma en los ejemplos, en la tarea 2', [await ev('P.modo'), await texto('.ay .paso'), await ev('JSON.parse(localStorage.getItem("pamplanea-proto-v2:notas")).prueba.estado')], ['entrenamiento', 'Tarea 2 de 6', 'activa']);
        await sinLetras('retomar');
        // Quien iba en la tarea 7 del set B viejo (ya no existe) sigue en la última (V2-63).
        actual = 'C índice viejo';
        await limpio();
        await ev(`localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'entrenamiento' })); localStorage.setItem('pamplanea-proto-v2:notas', JSON.stringify({ nombre: 'Beto', notas: {}, prueba: { estado: 'activa', set: 'B', origen: 'alterno', perfil: {}, i: 6, tareas: { carlos: { toques: 3, pantallas: [], inicio: 1, fin: 2, resultado: 'rendida', facil: 2 } }, final: {}, instalada: null, inicio: '2026-10-19T10:00:00.000Z', enviado: false } })); true`);
        await abrirApp();
        check('índice viejo: la última tarea', [await texto('.ay .paso'), await texto('.ay-tarea--grande')], (x) => x[0] === 'Tarea 6 de 6 · la última' && x[1].includes('Mira la pantalla de Hoy'));
    }

    // ============================================================ D) «Cuéntale…»: las listas salen de lo que se arma (V2-62)
    if (partes.includes('d')) {
        actual = 'D listas';
        await fecha('2026-10-23');
        await limpio();
        await ponerUso();
        await ponerPruebaHecha();
        await abrirApp();
        await clic('#btn-ayuda');
        await clic('[data-fk="au-contar"]');
        await escribir('#ct-mas', 'Lo de BA y los $25 de la luz no lo entendí');
        await foto('D-contar');
        await ev('document.querySelector(".ay-c").scrollTop = 99999; true');
        await foto('D-contar-texto');
        const vista = await ev(`({ si: [...document.querySelectorAll('#ct-si li')].map((e) => [e.dataset.parte, e.textContent.trim()]), no: [...document.querySelectorAll('#ct-no li')].map((e) => e.textContent.trim()), texto: document.getElementById('ay-texto').value, partes: P.modos.partesContar(), armado: P.modos.textoContar(), antes: document.querySelector('#ct-si').compareDocumentPosition(document.getElementById('ay-texto')) & Node.DOCUMENT_POSITION_FOLLOWING })`);
        check('«Esto se manda» = las partes del texto, en orden', vista.si, vista.partes.map((p) => [p.id, p.lista]));
        check('«Esto NO se manda»', vista.no, ['Montos', 'Nombres de tus cuentas, pagos, ahorros, tarjetas y préstamos']);
        check('las listas van antes del texto', !!vista.antes, true);
        check('el texto que se ve = el que se arma = sus partes', [vista.texto === vista.armado, vista.armado === vista.partes.flatMap((p) => p.lineas).join('\n')], [true, true]);
        check('cada parte de la lista trae líneas en el texto', vista.partes.filter((p) => !p.lineas.some((l) => l.trim()) || !p.lineas.every((l) => vista.texto.includes(l))).map((p) => p.id), []);
        check('con prueba y «¿Cómo te ha ido?»: todas las partes', vista.partes.map((p) => p.id), ['version', 'nombre', 'fechas', 'aprender', 'uso', 'pantallas', 'noEntendio', 'comoTeHaIdo', 'prueba', 'sobreTi', 'algoMas']);
        check('«Algo más» aparece al escribir', vista.texto, contiene('Algo más: Lo de [nombre] y los [monto] de la [nombre] no lo entendí'));
        check('las notas de Victor no van', vista.texto, (x) => !x.includes('NO debe ir'));
        informe.notas.contar = vista.texto;
        // Lo que no hay, no se lista (sin prueba ni «¿Cómo te ha ido?», y «Algo más» vacío).
        await limpio();
        await ponerUso({ conFeedback: false });
        await abrirApp();
        await clic('#btn-ayuda');
        await clic('[data-fk="au-contar"]');
        const vista2 = await ev(`({ si: [...document.querySelectorAll('#ct-si li')].map((e) => e.dataset.parte), partes: P.modos.partesContar(), texto: document.getElementById('ay-texto').value })`);
        check('sin prueba ni respuestas: no se listan', vista2.si, ['version', 'nombre', 'fechas', 'aprender', 'uso', 'pantallas', 'noEntendio', 'algoMas']);
        check('«Algo más» vacío: sin líneas', [vista2.partes.find((p) => p.id === 'algoMas').lineas.length, vista2.texto.includes('Algo más')], [0, false]);
        // El nombre que escribes se guarda y va en el texto.
        await escribir('#ct-nombre', 'Martita');
        check('el nombre va en el texto y se guarda', [await ev('document.getElementById("ay-texto").value.split("\\n")[1]'), await ev('JSON.parse(localStorage.getItem("pamplanea-uso:v1")).nombre')], ['Nombre: Martita', 'Martita']);
        // También desde el modo entrenamiento (lee lo guardado; los ejemplos no se tocan).
        await ev('P.ayuda.cerrar(); P.modos.cambiar("entrenamiento"); true');
        await esperar(300);
        const ejemplos = await ev('localStorage.getItem("pamplanea-proto-v2:app")');
        await clic('#btn-ayuda');
        await clic('[data-fk="au-contar"]');
        check('desde el entrenamiento: tus datos (nombre y días)', await ev('document.getElementById("ay-texto").value'), contiene('Nombre: Martita', 'abrí la app 3 días'));
        await escribir('#ct-nombre', 'Marta');
        check('desde el entrenamiento: el nombre se guarda sin tocar tus datos ni los ejemplos', [await ev('JSON.parse(localStorage.getItem("pamplanea-uso:v1")).nombre'), await ev('JSON.parse(localStorage.getItem("pamplanea-uso:v1")).st.persona'), await ev('localStorage.getItem("pamplanea-proto-v2:app")') === ejemplos], ['Marta', 'uso', true]);
    }

    // ============================================================ E) privacidad: ni montos ni nombres (la de siempre, más estricta)
    if (partes.includes('e')) {
        actual = 'E privacidad';
        await fecha('2026-10-23');
        await limpio();
        await ponerUso();
        await ponerPruebaHecha();
        await abrirApp();
        await ev('P.modos.textoContar && true');
        await clic('#btn-ayuda');
        await clic('[data-fk="au-contar"]');
        await escribir('#ct-mas', 'El remesa de josue de 150, mi banco agricola, el BA, la Tigo, el Cuchubal de la cuadra y un ahorro VIAJE A LA PLAYA');
        const t = await ev('document.getElementById("ay-texto").value');
        const nombres = await ev(`(() => { const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1')); const st = u.st; return [...new Set([...st.lugares, ...st.medios, ...st.tarjetas, ...st.pagos, ...st.apartados, ...st.ingresos, ...st.logros, ...(st.cerrados || [])].map((x) => x.nombre).concat(u.nombresVistos || []))]; })()`);
        // Lo que la persona escribió (comentarios, respuestas, «Algo más»): sin números ni nombres de sus cosas.
        const libres = t.split('\n').flatMap((l) => {
            const m = /(Me confundió: |Me gustaría: |Algo más: |\? )(.*)$/.exec(l);
            return m ? m[2].split(' · Me gustaría: ') : [];
        });
        check('hay texto libre que revisar', libres.length >= 8, true);
        check('texto libre: sin números', libres.filter((x) => /\d/.test(x)), []);
        const fugas = [];
        for (const x of libres) {
            const sx = simple(x);
            const ps = new Set(palabras(x));
            for (const nm of nombres) {
                const q = simple(nm);
                if (q.length > 2 && sx.includes(q)) fugas.push(`${nm} en «${x}»`);
                if (q.length <= 2 && ps.has(q)) fugas.push(`${nm} en «${x}»`);
                const piezas = palabras(nm).filter((w) => w.length >= 3 && !['del', 'las', 'los', 'con', 'por', 'para', 'mis', 'tus', 'sus', 'una', 'uno', 'que'].includes(w));
                if (piezas.length > 1) for (const w of piezas) if (ps.has(w)) fugas.push(`${w} (de ${nm}) en «${x}»`);
            }
        }
        check('texto libre: sin nombres (con o sin tildes, partes y cortos)', fugas, []);
        check('en todo el texto: sin «$» con número ni centavos', [/\$\s*\d/.test(t), /\b\d+[.,]\d{2}\b/.test(t)], [false, false]);
        // La de siempre (recorrer-modos): sin «$», sin centavos y sin nombres de más de 2 letras en todo el texto.
        const deSiempre = [];
        if (/\$/.test(t)) deSiempre.push('$');
        if (/\b\d+[.,]\d{2}\b/.test(t)) deSiempre.push('decimales');
        for (const nm of nombres) if (nm && nm.length > 2 && !['Quincena', 'Colegio'].includes(nm) && t.toLowerCase().includes(nm.toLowerCase())) deSiempre.push(nm);
        check('la prueba de siempre sigue verde', deSiempre, []);
        check('lo que es de la app sí va (títulos de tareas, conteos, fechas)', t, contiene('1. Primer día: la logré (la app lo detectó) · 1 min 5 s · 10 toques · fácil 4 de 5', 'Lo que hice: 7 anotaciones', 'Fechas: del 19 oct 2026 al 23 oct 2026 · abrí la app 3 días'));
        informe.notas.privacidad = t;
    }

    // ============================================================ F) sin recordatorios (V2-62)
    if (partes.includes('f')) {
        actual = 'F sin recordatorios';
        const publicados = (await readdir(root)).filter((f) => /\.(js|html|webmanifest)$/.test(f));
        const codigo = (await Promise.all(publicados.map((f) => readFile(path.join(root, f), 'utf8')))).join('\n');
        check('el código no usa notificaciones ni calendario', ['new Notification', 'Notification.requestPermission', 'showNotification', 'BEGIN:VCALENDAR', '.ics', 'PushManager', 'periodicSync'].filter((x) => codigo.includes(x)), []);
        for (const dia of ['2026-10-19', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-30']) {
            await fecha(dia);
            await limpio();
            await ponerUso({ conFeedback: false });
            await ponerPruebaHecha();
            await abrirApp();
            const hoy = await ev(`({ texto: document.getElementById('pantalla').innerText, enlaces: document.querySelectorAll('#pantalla [data-v="contar"], #pantalla [data-ir="contar"], #pantalla [data-fk*="contar"]').length })`);
            check(`Hoy ${dia}: ninguna tarjeta para contarle a Victor o a Pam`, [hoy.enlaces, /Cuéntale|cuéntale|comparte|mándale/i.test(hoy.texto)], [0, false]);
            if (dia === '2026-10-23') await foto('F-hoy-viernes');
        }
    }

    // ============================================================ G) «Tus datos» desde el entrenamiento
    if (partes.includes('g')) {
        actual = 'G tus datos';
        await fecha('2026-10-19');
        await enEntrenamiento();
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        check('sin datos: lo dice y deja restaurar', [await texto('#dt-c'), await hay('[data-fk="dt-copia"]'), await hay('[data-fk="dt-elegir"]'), await hay('[data-fk="dt-borrar"]')], ['Todavía no usas tus datos', false, true, false]);
        // v2.6.1 (V2-69 #38): instalar ya no vive en «Tus datos», sino en su propia fila de «Ayuda».
        check('instalar ya no está aquí', await hay('[data-fk="dt-instalar"]'), false);
        await foto('G-tus-datos-sin-datos');
        await clic('[data-fk="ay-x"]');
        await clic('#btn-ayuda');
        await clic('[data-fk="au-instalar"]');
        check('«Instalar la app» abre los pasos', await ev('P.ayuda.panel'), 'instalar');
        await clic('[data-fk="ay-x"]');
        check('sin datos: no se crean datos de uso', await ev('localStorage.getItem("pamplanea-uso:v1")'), null);
        // Con datos, desde el entrenamiento: copia (descarga) y borrar (se queda en los ejemplos).
        await limpio();
        await ponerUso({ conFeedback: false });
        await abrirApp();
        await ev('P.modos.cambiar("entrenamiento"); P.ayuda.cerrar(); true');
        await esperar(300);
        const ejemplos = await ev('P.calc().libre');
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        check('con datos: guardar, restaurar y borrar', [await hay('[data-fk="dt-copia"]'), await hay('[data-fk="dt-elegir"]'), await hay('[data-fk="dt-borrar"]')], [true, true, true]);
        await foto('G-tus-datos-entrenamiento');
        const copia = await ev(`(() => { let txt = null; const orig = URL.createObjectURL; URL.createObjectURL = (blob) => { blob.text().then((t) => (window.__copia = t)); return orig(blob); }; return true; })()`);
        await clic('[data-fk="dt-copia"]');
        await esperar(300);
        const c = await ev('window.__copia && JSON.parse(window.__copia)');
        check('la copia lleva tus datos (no los ejemplos)', c && [c.tipo, c.esquema, c.datos.st.persona, c.datos.nombre], ['copia-uso', 2, 'uso', 'Marta']);
        check('la copia queda anotada', await ev('!!JSON.parse(localStorage.getItem("pamplanea-uso:v1")).ultimaCopia'), true);
        await clic('[data-fk="dt-borrar"]');
        await clic('[data-fk="dt-b-si"]');
        await clic('[data-fk="dt-b2-si"]');
        check('borrar desde el entrenamiento: se queda en los ejemplos, sin tus datos', [await ev('P.modo'), await ev('P.calc().libre') === ejemplos, await ev('localStorage.getItem("pamplanea-uso:v1")')], ['entrenamiento', true, null]);
        void copia;
        // Instalar: «Ayuda» → «Instalar la app» (V2-69 #38), con los pasos de cada teléfono.
        const UAS = {
            'iPhone (Safari)': ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1', 'Agregar a pantalla de inicio'],
            'iPhone (Chrome)': ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.0.0 Mobile/15E148 Safari/604.1', 'En iPhone se instala desde Safari'],
            'Android (Chrome)': ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', 'Instalar app'],
        };
        const uaOriginal = await ev('navigator.userAgent');
        for (const [nombre, [ua, dice]] of Object.entries(UAS)) {
            await b.enviar('Emulation.setUserAgentOverride', { userAgent: ua });
            await enEntrenamiento();
            await clic('#btn-ayuda');
            await clic('[data-fk="au-instalar"]');
            // Servida por http, Chrome en Android ofrece su botón «Instalar» (mejor que los pasos a mano).
            const conBoton = nombre.startsWith('Android') && (await hay('[data-fk="ay-instalar"]'));
            check(`instalar en ${nombre}`, await texto('.ay'), contiene('Tenla en tu pantalla de inicio', conBoton ? 'Aparece en tu pantalla de inicio' : dice));
            await foto(`G-instalar-${nombre.replace(/\W+/g, '-')}`);
        }
        await b.enviar('Emulation.setUserAgentOverride', { userAgent: uaOriginal });
    }

    // ============================================================ H) 44 px, contraste y reducir movimiento
    if (partes.includes('h')) {
        actual = 'H accesibilidad';
        await b.movimientoReducido(false);
        await fecha('2026-10-19');
        /** Lo que se toca en un panel abierto (con el área táctil del ::after del botón de arriba). */
        const pequenos = (sel) =>
            ev(`[...document.querySelectorAll(${js(sel)})].filter((e) => e.getClientRects().length && !e.closest('.sr-only')).map((e) => { const r = e.getBoundingClientRect(); const a = getComputedStyle(e, '::after'); const extra = a.content !== 'none' && a.position === 'absolute' ? -parseFloat(a.top) - parseFloat(a.bottom) : 0; return [(e.dataset.fk || e.id || e.textContent.trim()).slice(0, 40), Math.round(r.width), Math.round(r.height + Math.max(0, extra))]; }).filter(([, w, h]) => h < 44 || w < 44)`);
        const pantallas = [];
        await enEntrenamiento('?victor=1');
        pantallas.push(['botón Ayuda', await pequenos('#btn-ayuda')]);
        await clic('#btn-ayuda');
        check('«Ayuda» entra con movimiento (sin «reducir»)', await ev('getComputedStyle(document.querySelector(".ay")).animationName'), (x) => x !== 'none');
        pantallas.push(['Ayuda (con Victor)', await pequenos('.ay button, .ay a, .ay summary, .ay label.btn')]);
        await clic('[data-fk="ay-prueba"]');
        pantallas.push(['bienvenida', await pequenos('.ay button, .ay a, .ay input')]);
        await clic('[data-fk="ay-x"]');
        await clic('[data-fk="avatar"]');
        await esperar(300);
        pantallas.push(['letra', await pequenos('.hoja button')]);
        await ev('P.cerrarHoja(); true');
        await clic('#btn-ayuda');
        await clic('[data-fk="au-contar"]');
        pantallas.push(['Cuéntale', await pequenos('.ay button, .ay a, .ay input, .ay textarea')]);
        await clic('[data-fk="ay-x"]');
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        pantallas.push(['Tus datos', await pequenos('.ay button, .ay a, .ay label.btn')]);
        check('44 px en todo lo nuevo', pantallas.filter(([, x]) => x.length), []);
        await b.movimientoReducido(true);
        await abrirApp('?victor=1');
        await clic('#btn-ayuda');
        check('con «reducir movimiento»: «Ayuda» no se mueve', await ev('[getComputedStyle(document.querySelector(".ay")).animationName, getComputedStyle(document.querySelector(".ay")).animationDuration]'), (x) => x[0] === 'none' || parseFloat(x[1]) <= 0.01);
        // Contraste (WCAG) de lo nuevo en los 4 temas.
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
        informe.contraste = {};
        for (const tm of ['serena-claro', 'serena-oscuro', 'ancla-claro', 'ancla-oscuro']) {
            const r = {};
            await b.ir('about:blank');
            await b.ir(base + 'telefono.html?victor=1#tema=' + tm);
            await ev('P.sinGuardar = true; localStorage.clear(); true');
            await b.ir('about:blank');
            await b.ir(base + 'telefono.html?victor=1#tema=' + tm);
            await esperar(350);
            await ponerUso({ conFeedback: false });
            await b.ir('about:blank');
            await b.ir(base + 'telefono.html?victor=1#tema=' + tm);
            await esperar(400);
            await clic('[data-fk="avatar"]');
            await esperar(300);
            Object.assign(r, await ev(medir([['letra: «Estás aquí» título', '[data-fk="menu-smartphone"] .fila-t'], ['letra: «Estás aquí»', '[data-fk="menu-smartphone"] .fila-s']])));
            await ev('P.cerrarHoja(); true');
            await esperar(250);
            await clic('#btn-ayuda');
            Object.assign(r, await ev(medir([['botón Ayuda', '#btn-ayuda'], ['dónde estás', '.ay-c > .txt'], ['opción: título', '.ay-op .opcion-g-t'], ['opción: detalle', '.ay-op .fila-s'], ['opción actual: detalle', '.ay-op[aria-current] .fila-s'], ['fila: título', '.ay-lista .fila-t'], ['fila: detalle', '.ay-lista .fila-s'], ['versión', '.ay-version'], ['Victor: aviso', '.ay-victor-h .txt']])));
            await clic('[data-fk="au-contar"]');
            Object.assign(r, await ev(medir([['Cuéntale: título', '#ay-t'], ['Cuéntale: intro', '.ay-c > .txt'], ['se manda: título', '#ct-si-t'], ['se manda: punto', '#ct-si li'], ['no se manda: punto', '#ct-no li'], ['no se manda: nota', '.ct-lista--no .fila-s'], ['texto: título', '#ct-texto-t']])));
            await clic('[data-fk="ay-x"]');
            await clic('#btn-ayuda');
            await clic('[data-fk="au-datos"]');
            Object.assign(r, await ev(medir([['Tus datos: texto', '.ay-card .txt']])));
            await clic('[data-fk="ay-x"]');
            // v2.6.1 (V2-69 #38): «Instalar la app» es su propia fila en «Ayuda».
            await clic('#btn-ayuda');
            await clic('[data-fk="au-instalar"]');
            Object.assign(r, await ev(medir([['Instalar: título', '#ay-inst'], ['Instalar: pasos', '.ay-card .txt']])));
            await clic('[data-fk="ay-x"]');
            await clic('#btn-ayuda');
            await clic('[data-fk="ay-usar"]');
            await clic('#btn-ayuda');
            await clic('[data-fk="ay-v-ejemplos"]');
            await clic('#btn-ayuda');
            Object.assign(r, await ev(medir([['Victor: sección', '.ay-v-sec']])));
            await clic('[data-fk="ay-x"]');
            await clic('[data-fk="avatar"]');
            await esperar(300);
            Object.assign(r, await ev(medir([['letra: sección', '.menu-sec'], ['letra: fila', '.menu-sec + .lista .fila-t'], ['letra: detalle', '.menu-sec + .lista .fila-s'], ['letra: versión', '.hoja .ay-version']])));
            await ev('P.cerrarHoja(); true');
            await esperar(250);
            await clic('#btn-ayuda');
            await clic('[data-fk="ay-prueba"]');
            Object.assign(r, await ev(medir([['prueba: primera línea', '.ay-bien-l'], ['prueba: segunda línea', '.ay-bienvenida .txt'], ['prueba: Ahora no', '[data-fk="ay-explorar"]']])));
            await clic('[data-fk="ay-empezar-prueba"]');
            await clic('[data-fk="ay-inst-saltar"]');
            await ev(`(() => { const d = JSON.parse(localStorage.getItem('pamplanea-proto-v2:notas')); d.prueba.estado = 'fin'; localStorage.setItem('pamplanea-proto-v2:notas', JSON.stringify(d)); P.ayuda.abrir('fin'); return true; })()`);
            await esperar(200);
            Object.assign(r, await ev(medir([['final: gracias', '.ay-gracias .txt'], ['final: tarjeta', '#ay-fin-c'], ['final: tarjeta texto', '.ay-card--prim .txt']])));
            informe.contraste[tm] = r;
        }
        const valores = Object.values(informe.contraste).flatMap((x) => Object.values(x)).filter((x) => typeof x === 'number');
        informe.numeros.contrasteMinimo = Math.min(...valores);
        check('contraste ≥ 4.5:1 en los 4 temas', Object.entries(informe.contraste).flatMap(([tm, x]) => Object.entries(x).filter(([, v]) => typeof v !== 'number' || v < 4.5).map(([k, v]) => `${tm} ${k} ${v}`)), []);
    }
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, numeros: informe.numeros }, null, 1));
b.cerrar();
