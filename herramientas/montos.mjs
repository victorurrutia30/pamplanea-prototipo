// PRUEBA v2.7 (A, F05–F08, F18, F19): escribir montos y anotar. Con el código real de la app («Marta», 21 oct 2026).
//  A) Un solo lector de montos (MOTOR.leerMonto) para formularios y Anotar: 25, 2.5, 1200, 1,200, 1,234.50, 1.000,50,
//     25,50, 0 y 9 dígitos; los decimales de más (y las comas mal puestas) se rechazan; en Anotar, se preguntan.
//  B) v2.7 (A, reemplaza a C-6): en el teléfono, el teclado del teléfono (inputmode «decimal»), sin teclado propio:
//     «25» = $25.00, «2.5» = $2.50, «1,200» = $1,200.00 y «25,50» = $25.50; nada se abre solo ni tapa el formulario; el
//     campo y su mensaje («No entendí…») quedan a la vista al escribir.
//  C) v2.7 (A): TODOS los campos de monto (cada hoja, Pongámonos al día, Reparte y el Primer día) con el teclado del
//     teléfono, y en la computadora el de siempre.
//  D) El mismo resultado en un formulario y en Anotar.
//  E) Anotar no adivina: F05 (miles), F06 (hoy, ayer, mañana, «el 22»), F07 (la tarjeta nombrada), F08 (sin tarjeta),
//     F18 («tengo 0») y F19 (dos montos en una frase).
// Uso: node herramientas/montos.mjs [--base=http://…/] [--puerto=9962] [--partes=abcde] [--raiz=<otra copia>]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const root = args.raiz ? path.resolve(args.raiz) : aqui;
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || 'abcde').toLowerCase();
const salida = path.join(aqui, 'capturas', 'montos' + (args.base ? '-servida' : '') + (args.raiz ? '-raiz' : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9962) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
let actual = '';
let checks = 0;
const check = (nombre, real, esperado) => {
    checks++;
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 300)}`);
    return ok;
};
const contiene = (t) => (x) => typeof x === 'string' && x.includes(t);
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const foto = (n) => b.captura(path.join(salida, n + '.png'));
const escribir = async (sel, v) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(60);
};
async function seccion(nombre, fn) {
    actual = nombre;
    try {
        await fn();
    } catch (e) {
        fallos.push(`${actual}: excepción: ${e.message}`);
        await foto('ERROR-' + nombre.slice(0, 12).replace(/[^\w]+/g, '-')).catch(() => null);
    }
}
let scriptId = null;
async function abrirApp() {
    if (scriptId) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
    scriptId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` })).identifier;
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html');
    await esperar(500);
    await ev(`P.ayuda.abierto && P.ayuda.cerrar({ foco: false }); true`);
}
/** «Marta», con efectivo y banco, la tarjeta de Ana (BAC) y una segunda (Cuscatlán), y su Internet. */
const armar = (opc = {}) =>
    ev(`(() => {
        const st = DATOS.crearAna();
        Object.assign(st, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        ${opc.sinTarjetas ? `st.tarjetas = []; st.medios = st.medios.filter((m) => !m.tarjeta);` : `st.tarjetas.push({ id: 'cus', nombre: 'Crédito Cuscatlán', emoji: '💳', tipo: 'tarjeta', corte: 10, pagoDia: 30, cupo: null, interesesAnio: 0, medio: 'debito', estados: [{ corte: '2026-10-10', total: 30000, minimo: 2500, aPagar: 30000, opcion: 'total', vence: '2026-10-30', seq: 1 }] }); st.medios.push({ id: 'mcus', nombre: 'Crédito Cuscatlán', emoji: '💳', tarjeta: 'cus' });`}
        ${opc.unLugar ? `st.lugares = st.lugares.filter((l) => l.id === 'efectivo');` : ''}
        P.cargar(st, { tab: 'hoy' });
        P.deshacer = [];
        return true;
    })()`);
const anotar = async (frase) => {
    await ev(`(() => { P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = ${js(frase)}; q.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await esperar(80);
};
const borrador = () => ev(`(() => { const d = P.ui.hoja && P.ui.hoja.d; return d ? { tipo: d.tipo, monto: d.monto, nombre: d.nombre, fecha: d.fecha, tarjeta: d.tarjeta, dudoso: d.montoDudoso || null } : null; })()`);
const guardar = async () => {
    await ev(`P.acciones.anotarGuardar(); true`);
    await esperar(120);
    return ev(`!!(P.ui.hoja && P.ui.hoja.tipo === 'anotar')`);
};
// v2.7 (A): «25,50» también (por si el teclado del teléfono muestra coma).
const ENTRADAS = [['25', 2500], ['2.5', 250], ['1200', 120000], ['1,200', 120000], ['1,234.50', 123450], ['1.000,50', 100050], ['25,50', 2550], ['0', 0], ['999999.99', 99999999], ['1000000', 100000000]];
/** ¿Se ve? Dentro de la pantalla, del área que se desplaza y sin nada encima (lo de arriba en ese punto es él mismo). */
const seVe = (sel) =>
    ev(`(() => {
        const el = document.querySelector(${js(sel)});
        if (!el) return 'no está';
        const r = el.getBoundingClientRect();
        const c = el.closest('.hoja-c, .vista')?.getBoundingClientRect() || { top: 0, bottom: innerHeight };
        if (r.top < Math.max(0, c.top) - 1 || r.bottom > Math.min(innerHeight, c.bottom) + 1) return 'fuera: ' + Math.round(r.top) + '–' + Math.round(r.bottom);
        const arriba = document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + r.height / 2);
        return arriba && (arriba === el || el.contains(arriba)) ? true : 'tapado por ' + (arriba ? arriba.id || arriba.className : 'nada');
    })()`);

// ------------------------------------------------------------------ A) un solo lector de montos
if (partes.includes('a')) {
    await abrirApp();
    await seccion('A lector', async () => {
        for (const [t, c] of ENTRADAS) check(`«${t}» = ${c} centavos`, await ev(`MOTOR.leerMonto(${js(t)})`), c);
        check('9 dígitos sin decimales: pasa del tope ($1,000,000.00) y se dice', await ev(`[MOTOR.leerMonto('123456789'), MOTOR.montoExcede('123456789')]`), [null, true]);
        check('decimales de más: no', await ev(`[MOTOR.leerMonto('2.555'), MOTOR.leerMonto('1,234.567')]`), [null, null]);
        check('comas mal puestas («1,2345») y «1.200» (¿mil doscientos o uno con veinte?): no se adivinan', await ev(`[MOTOR.leerMonto('1,2345'), MOTOR.leerMonto('1.200')]`), [null, null]);
        check('siempre centavos enteros', await ev(`${js(ENTRADAS.map((x) => x[0]))}.map((t) => MOTOR.leerMonto(t)).every((c) => Number.isInteger(c))`), true);
    });
}

// ------------------------------------------------------------------ B) v2.7 (A): el teclado del teléfono
// (Antes, C-6: el teclado propio. Victor vio que se abría solo, tapaba el formulario y escondía «No entendí…»: se quitó.)
if (partes.includes('b')) {
    await abrirApp();
    await armar();
    await seccion('B teclado del teléfono', async () => {
        check('(la prueba es en modo teléfono: pantalla táctil)', await ev(`matchMedia('(pointer: coarse)').matches`), true);
        await ev(`P.abrirHoja('cuadrar', { id: 'efectivo' }); true`);
        check('el campo pide el teclado del teléfono con punto (inputmode «decimal»)', await ev(`document.getElementById('f-monto').getAttribute('inputmode')`), 'decimal');
        await ev(`document.getElementById('f-monto').click(); document.getElementById('f-monto').focus(); true`);
        await esperar(450);
        check('sin teclado propio: nada se abre encima', await ev(`[!!document.getElementById('capa-teclado'), !!document.querySelector('.tec, [data-tecla]'), typeof P.teclado]`), [false, false, 'undefined']);
        check('el campo se ve, sin nada encima', await seVe('#f-monto'), true);
        for (const [t, c] of [['25', 2500], ['2.5', 250], ['1,200', 120000], ['25,50', 2550]]) {
            await escribir('#f-monto', t);
            check(`«${t}» = ${c} centavos (el lector único)`, await ev(`MOTOR.leerMonto(P.ui.hoja.monto)`), c);
        }
        await escribir('#f-monto', '25,50');
        await ev(`P.acciones.cuadrarOk(); true`);
        check('y se guarda eso: cuadre de $25.50', await ev(`P.st.registros.at(-1).tipo + ':' + P.st.registros.at(-1).monto`), 'cuadre:2550');
    });
    await seccion('B mensaje a la vista', async () => {
        await anotar('súper 1,2345');
        await esperar(150);
        check('el campo del monto se abre en la hoja (no encima)', await ev(`!!document.querySelector('#anotar-editor #f-monto') && !document.getElementById('capa-teclado')`), true);
        check('«No entendí…» va justo debajo del campo', await ev(`(() => { const f = document.getElementById('f-monto').closest('.campo').getBoundingClientRect(); const m = document.querySelector('#anotar-editor .campo-ayuda').getBoundingClientRect(); return m.top >= f.bottom - 1 && m.top - f.bottom < 24; })()`), true);
        check('el texto del mensaje', await texto('#anotar-editor .campo-ayuda'), 'No entendí «1,2345». Escríbelo con números, como 1,200 o 25.50.');
        // Como cuando el teclado del teléfono sale: el campo empieza fuera de la vista y, al enfocarlo, campo y mensaje suben.
        await ev(`(() => { const c = document.querySelector('.hoja-c'); c.style.maxHeight = '260px'; c.scrollTop = 0; document.getElementById('anotar-q').focus(); return true; })()`);
        await esperar(450);
        await ev(`document.getElementById('f-monto').focus(); true`);
        await esperar(450);
        check('al escribir en el campo: el campo se ve', await seVe('#f-monto'), true);
        check('y su mensaje también (no queda tapado)', await seVe('#anotar-editor .campo-ayuda'), true);
        await foto('B-mensaje-a-la-vista');
        await ev(`document.querySelector('.hoja-c').style.maxHeight = ''; true`);
    });
}

// ------------------------------------------------------------------ C) v2.7 (A): todos los campos de monto, con el teclado del teléfono
if (partes.includes('c')) {
    await abrirApp();
    await armar();
    await seccion('C todos', async () => {
        const hojas = [['cuadrar', { id: 'efectivo' }], ['mover', {}], ['apartar', { id: 'emergencias' }], ['nuevoPago', {}], ['nuevoIngreso', {}], ['nuevaDeuda', { tipoInicial: 'tarjeta' }], ['nuevaDeuda', { tipoInicial: 'prestamo' }], ['pagado', { tipoPago: 'tarjeta', id: 'bac' }], ['estadoCuenta', { id: 'cus' }], ['editarRegistro', { id: 'r1' }], ['deuda', { id: 'pr' }], ['liberar', { id: 'emergencias' }]];
        const malos = [];
        let campos = 0;
        for (const [h, d] of hojas) {
            const ok = await ev(`(() => { try { P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.abrirHoja(${js(h)}, ${js(d)}); return !!P.ui.hoja; } catch (e) { return String(e.message); } })()`);
            if (ok !== true) continue;
            const ids = await ev(`[...document.querySelectorAll('.campo--monto input')].map((x) => x.id)`);
            for (const id of ids) {
                campos++;
                const r = await ev(`(() => { const el = document.getElementById(${js(id)}); el.click(); el.focus(); return { modo: el.getAttribute('inputmode'), encima: !!document.getElementById('capa-teclado') }; })()`);
                if (r.modo !== 'decimal' || r.encima) malos.push(`${h}#${id}: ${JSON.stringify(r)}`);
            }
        }
        check(`todos los campos de monto de las hojas: teclado del teléfono, nada encima (${campos} campos)`, malos, []);
        check('(y son varios)', campos, (n) => n >= 12);
        // Pongámonos al día, Reparte y el Primer día también.
        const modos = `[...document.querySelectorAll('.campo--monto input')].map((x) => x.getAttribute('inputmode'))`;
        await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.abrir('aldia'); P.acciones.aldiaSiguiente(); P.acciones.aldiaSiguiente(); true`);
        check('Pongámonos al día (cuadrar tus lugares)', await ev(modos), (x) => x.length > 0 && x.every((m) => m === 'decimal'));
        await ev(`P.irTab('hoy'); P.abrir('reparte', 'quincena', { fecha: '2026-10-15', monto: 60000 }); true`);
        check('Reparte', await ev(modos), (x) => x.length > 0 && x.every((m) => m === 'decimal'));
        await ev(`(() => { const st = DATOS.crearNueva(); Object.assign(st, { persona: 'uso', hoy: '2026-10-21' }); P.cargar(st); P.ui.ob.paso = 2; P.render({ nueva: true }); return true; })()`);
        check('el Primer día', await ev(modos), (x) => x.length > 0 && x.every((m) => m === 'decimal'));
        await foto('C-primer-dia');
    });
    await b.tamano(1440, 900, { movil: false, toque: false });
    await abrirApp();
    await armar();
    await seccion('C computadora', async () => {
        await ev(`P.abrirHoja('cuadrar', { id: 'efectivo' }); document.getElementById('f-monto').click(); true`);
        check('en la computadora: el teclado de siempre', [await ev(`document.getElementById('f-monto').getAttribute('inputmode')`), await ev(`!!document.getElementById('capa-teclado')`)], ['decimal', false]);
        await escribir('#f-monto', '1,200');
        await ev(`P.acciones.cuadrarOk(); true`);
        check('se escribe normal y se lee con las mismas reglas: «1,200» = $1,200.00', await ev(`P.st.registros.at(-1).monto`), 120000);
    });
    await b.tamano(390, 844);
}

// ------------------------------------------------------------------ D) el mismo resultado en formulario y Anotar
if (partes.includes('d')) {
    await abrirApp();
    await armar();
    await seccion('D iguales', async () => {
        for (const [t, c] of ENTRADAS.filter((x) => x[1] > 0 && x[1] <= 100000000)) {
            await anotar(`súper ${t}`);
            const deAnotar = (await borrador()).monto;
            await ev(`P.cerrarHoja({ sinFoco: true }); P.abrirHoja('mover', { id: 'agricola' }); true`);
            await escribir('#f-monto', t);
            const deForm = await ev(`MOTOR.leerMonto(P.ui.hoja.monto)`);
            await ev(`P.cerrarHoja({ sinFoco: true }); true`);
            check(`«${t}»: Anotar = formulario = ${c}`, [deAnotar, deForm], [c, c]);
        }
        await anotar('súper 2.555');
        check('decimales de más en Anotar: se pregunta', [(await borrador()).monto, (await borrador()).dudoso], [null, '2.555']);
    });
}

// ------------------------------------------------------------------ E) Anotar no adivina
if (partes.includes('e')) {
    await abrirApp();
    await armar();
    await seccion('E F05 miles', async () => {
        await anotar('gasté 1,200 en súper');
        check('«gasté 1,200 en súper» = $1,200.00 en Súper', await borrador(), (d) => d.monto === 120000 && d.nombre === 'Súper');
        check('el chip lo dice', await texto('#anotar-chips'), contiene('$1,200.00'));
        await foto('E-anotar-1200');
        check('se guarda', await guardar(), false);
        check('el gasto: $1,200.00', await ev(`P.st.registros.at(-1).monto`), 120000);
        await anotar('gasté 1,234.50 en súper');
        check('«1,234.50» = $1,234.50', (await borrador()).monto, 123450);
        await anotar('súper 1,2345');
        check('«1,2345»: no se adivina, se pregunta', await borrador(), (d) => d.monto === null && d.dudoso === '1,2345');
        check('y dice cuál no entendió', await texto('#anotar-editor'), contiene('No entendí «1,2345»'));
        check('no se guarda así', await guardar(), true);
        await escribir('#f-monto', '12345');
        check('al escribirlo bien, se guarda', [await guardar(), await ev(`P.st.registros.at(-1).monto`)], [false, 1234500]);
    });
    await seccion('E F06 fechas', async () => {
        await armar();
        await anotar('gasté 12 en bus ayer');
        check('«ayer» = 20 oct', (await borrador()).fecha, '2026-10-20');
        await anotar('hoy pupusas 3');
        check('«hoy» = 21 oct', (await borrador()).fecha, '2026-10-21');
        await anotar('mañana pupusas 10');
        check('«mañana pupusas 10» = 22 oct, $10, Pupusas', await borrador(), (d) => d.fecha === '2026-10-22' && d.monto === 1000 && d.nombre === 'Pupusas');
        check('antes de guardar dice que es futuro', [await texto('#anotar-preg'), await texto('[data-fk="anotar-guardar"]')], (x) => x[0].includes('Es para el 22 de octubre') && x[1] === 'Guardar para el 22');
        await foto('E-anotar-manana');
        check('se guarda como pago de una vez para el 22 (no baja tu dinero hoy)', [await guardar(), await ev(`P.st.pagos.filter((p) => p.frecuencia === 'unico' && p.fecha === '2026-10-22').map((p) => p.nombre + ' ' + p.monto)`), await ev(`P.st.registros.some((r) => r.nombre === 'Pupusas' && r.monto === 1000)`)], [false, ['Pupusas 1000'], false]);
        await armar();
        await anotar('pupusas 10 el 22');
        check('«el 22» (hoy es 21) = 22 oct, futuro', (await borrador()).fecha, '2026-10-22');
        await anotar('pupusas 10 el 20');
        check('«el 20» (ya pasó): se pregunta cuál', await texto('#anotar-preg'), (t) => t.includes('¿Qué 20?') && t.includes('20 de octubre') && t.includes('20 de noviembre'));
        check('no se guarda sin elegir', await guardar(), true);
        await ev(`document.querySelector('[data-fk="fecha-d-antes"]').click(); true`);
        check('elegido el 20 de octubre: se guarda ese día', [await guardar(), await ev(`P.st.registros.at(-1).fecha`)], [false, '2026-10-20']);
        await anotar('café 2 en la mañana');
        check('«en la mañana» es la hora: hoy', (await borrador()).fecha, '2026-10-21');
    });
    await seccion('E F07 tarjeta nombrada', async () => {
        await armar();
        const previos = await ev(`P.st.registros.length`);
        await anotar('pagué la tarjeta Cuscatlán 25');
        check('va a Cuscatlán (no a la primera)', await borrador(), (d) => d.tipo === 'pagoTarjeta' && d.tarjeta === 'cus' && d.monto === 2500);
        check('se ve el destino antes de guardar', [await texto('#anotar-chips'), await texto('#anotar-preg')], (x) => x[0].includes('Crédito Cuscatlán') && x[1].includes('Pagas tu tarjeta Crédito Cuscatlán'));
        await foto('E-anotar-cuscatlan');
        check('se guarda en Cuscatlán', [await guardar(), await ev(`P.st.registros.slice(${previos}).filter((r) => r.tipo === 'pagoTarjeta').map((r) => r.tarjeta + ' ' + r.monto)`)], [false, ['cus 2500']]);
        check('y baja lo que se debe de Cuscatlán ($300 → $275)', await ev(`MOTOR.tarjetaInfo(P.st, MOTOR.tarjeta(P.st, 'cus')).porPagarEstado`), 27500);
        await anotar('pagué la tarjeta 25');
        check('«pagué la tarjeta 25» con dos tarjetas: pregunta cuál', [(await borrador()).tarjeta, await texto('#anotar-preg')], (x) => x[0] === null && x[1].includes('¿Qué tarjeta pagaste?'));
        check('no se guarda sin elegir', await guardar(), true);
        await ev(`document.querySelector('#anotar-preg [data-campo="tarjeta"][data-v="bac"]').click(); true`);
        check('elegida BAC: se guarda en BAC', [await guardar(), await ev(`P.st.registros.slice(${previos}).filter((r) => r.tipo === 'pagoTarjeta').map((r) => r.tarjeta)`)], [false, ['cus', 'bac']]);
    });
    await seccion('E F08 sin tarjeta', async () => {
        await armar({ sinTarjetas: true });
        const previos = await ev(`P.st.registros.length`);
        await anotar('pagué la tarjeta 25');
        check('ofrece agregarla o cambiar el tipo', await texto('#anotar-preg'), (t) => t.includes('Todavía no tienes una tarjeta de crédito') && t.includes('Agregar mi tarjeta') && t.includes('Es un gasto'));
        await foto('E-anotar-sin-tarjeta');
        check('guardar no truena ni guarda nada', [await guardar(), await ev(`P.st.registros.length - ${previos}`)], [true, 0]);
        await ev(`document.querySelector('[data-fk="sin-t-gasto"]').click(); true`);
        check('«Es un gasto»: pasa a gasto con su monto', await borrador(), (d) => d.tipo === 'gasto' && d.monto === 2500);
        await anotar('pagué la tarjeta 25');
        await ev(`document.querySelector('[data-fk="sin-t-agregar"]').click(); true`);
        check('«Agregar mi tarjeta» abre el formulario de la tarjeta', await ev(`[P.ui.hoja && P.ui.hoja.tipo, P.ui.hoja && P.ui.hoja.tipoDeuda]`), ['nuevaDeuda', 'tarjeta']);
    });
    await seccion('E F18 tengo 0', async () => {
        await armar({ unLugar: true });
        await anotar('tengo 0');
        check('«tengo 0» se entiende como cuadrar a $0', await borrador(), (d) => d.tipo === 'cuadre' && d.monto === 0);
        check('se guarda (como en Cuadrar)', [await guardar(), await ev(`[P.st.registros.at(-1).tipo, P.st.registros.at(-1).monto, MOTOR.saldoLugar(P.st, 'efectivo')]`)], [false, ['cuadre', 0, 0]]);
        await armar();
        await anotar('tengo 0');
        await ev(`document.querySelector('#anotar-preg [data-campo="lugar"][data-v="efectivo"]').click(); true`);
        check('con dos lugares: dónde, y se guarda $0', [await guardar(), await ev(`MOTOR.saldoLugar(P.st, 'efectivo')`)], [false, 0]);
    });
    await seccion('E F19 dos montos', async () => {
        await armar();
        await anotar('pupusas 6 y bus 2');
        check('ofrece anotar los dos', await texto('#anotar-preg'), (t) => t.includes('Escribiste 2 cosas: Pupusas $6.00 y Bus $2.00') && t.includes('Anotar las 2'));
        await foto('E-anotar-dos');
        check('no se guarda sin decidir', await guardar(), true);
        await ev(`document.querySelector('[data-fk="varios-todos"]').click(); true`);
        check('el botón dice «Anotar las 2»', await texto('[data-fk="anotar-guardar"]'), 'Anotar las 2');
        const antes = await ev(`P.st.registros.length`);
        check('se guardan los dos', [await guardar(), await ev(`P.st.registros.slice(${antes}).map((r) => [r.nombre, r.monto])`)], [false, [['Pupusas', 600], ['Bus', 200]]]);
        await anotar('pupusas 6 y bus 2');
        await ev(`document.querySelector('[data-fk="varios-primero"]').click(); true`);
        const n = await ev(`P.st.registros.length`);
        check('«Solo Pupusas»: solo ese (por decisión, no en silencio)', [await guardar(), await ev(`P.st.registros.slice(${n}).map((r) => [r.nombre, r.monto])`)], [false, [['Pupusas', 600]]]);
        await anotar('me pagaron 600 y gasté 20');
        check('dos cosas distintas: «anota una cosa a la vez»', await texto('#anotar-preg'), contiene('Escribiste más de un monto. Anota una cosa a la vez.'));
        check('no se guarda sin decidir', await guardar(), true);
    });
}

const resultado = { version: await ev('window.VERSION_PROTOTIPO').catch(() => null), checks, fallos, errores: b.errores, fallidas: b.fallidas };
console.log(JSON.stringify(resultado, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
