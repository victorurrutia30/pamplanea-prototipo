// PRUEBA v2.7 (C-6, F05–F08, F18, F19): escribir montos y anotar. Con el código real de la app («Marta», 21 oct 2026).
//  A) Un solo lector de montos (MOTOR.leerMonto) para formularios y Anotar: 25, 2.5, 1200, 1,200, 1,234.50, 1.000,50, 0 y
//     9 dígitos; los decimales de más (y las comas mal puestas) se rechazan; en Anotar, se preguntan.
//  B) El teclado de montos en el teléfono: «25» = $25.00, «2.5» = $2.50, «1200» = $1,200.00; hasta 2 decimales y 9
//     dígitos; el monto en vivo y grande; botones de 44 px o más; anuncia el monto; teclado físico y Escape.
//  C) El mismo componente en TODOS los campos de monto (cada hoja, Pongámonos al día, Reparte y el Primer día) y, en la
//     computadora, el teclado de siempre.
//  D) El mismo resultado en un formulario, en el teclado y en Anotar.
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
let teclado = false;
let scriptId = null;
async function abrirApp({ conTeclado = false } = {}) {
    if (scriptId) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
    scriptId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';${conTeclado ? ' window.__tecladoMontos = true;' : ' window.__tecladoMontos = false;'}` })).identifier;
    teclado = conTeclado;
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
const tecla = async (t) => {
    const ok = await ev(`(() => { const b = document.querySelector('[data-tecla="${t}"]'); if (!b) return false; b.click(); return true; })()`);
    if (!ok) throw new Error('el teclado no tiene ' + t);
    await esperar(30);
};
const teclas = async (s) => {
    for (const t of s.split('')) await tecla(t === '⌫' ? 'borrar' : t);
};
const ENTRADAS = [['25', 2500], ['2.5', 250], ['1200', 120000], ['1,200', 120000], ['1,234.50', 123450], ['1.000,50', 100050], ['0', 0], ['999999.99', 99999999], ['1000000', 100000000]];
/** Lo que se teclea en el teclado de montos para escribir lo mismo (sin comas: solo dígitos y punto). */
const enTeclado = (t) => (t === '1.000,50' ? '1000.50' : t.replace(/,/g, ''));

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

// ------------------------------------------------------------------ B) el teclado de montos
if (partes.includes('b')) {
    await abrirApp({ conTeclado: true });
    await armar();
    await seccion('B teclado', async () => {
        await ev(`P.abrirHoja('cuadrar', { id: 'efectivo' }); true`);
        check('en el teléfono, el teclado del sistema no sale', await ev(`document.getElementById('f-monto').getAttribute('inputmode')`), 'none');
        check('no se abre solo al abrir la hoja', await ev(`P.teclado.abierto()`), null);
        await ev(`document.getElementById('f-monto').click(); true`);
        await esperar(100);
        check('al tocar el campo, se abre', await ev(`P.teclado.abierto()`), 'f-monto');
        check('dice qué se pregunta', await texto('.tec-l'), '¿Cuánto tienes ahora?');
        for (const [t, ver] of [['25', '$25.00'], ['2.5', '$2.50'], ['1200', '$1,200.00']]) {
            await ev(`document.getElementById('f-monto').value = ''; true`);
            await teclas(t);
            check(`«${t}» se ve en vivo: ${ver}`, [await texto('#tec-v'), await ev(`MOTOR.leerMonto(document.getElementById('f-monto').value)`)], [ver, await ev(`MOTOR.leerMonto(${js(t)})`)]);
        }
        await foto('B-teclado-1200');
        await ev(`document.getElementById('f-monto').value = ''; true`);
        await teclas('3.456');
        check('3 decimales: el tercero no entra', await ev(`document.getElementById('f-monto').value`), '3.45');
        await teclas('..');
        check('un segundo punto no entra', await ev(`document.getElementById('f-monto').value`), '3.45');
        await ev(`document.getElementById('f-monto').value = ''; true`);
        await teclas('1234567890');
        check('hasta 9 dígitos', [await ev(`document.getElementById('f-monto').value`), await texto('#tec-v')], ['123456789', '$123,456,789.00']);
        await teclas('⌫⌫⌫⌫⌫⌫⌫⌫⌫');
        check('borrar', [await ev(`document.getElementById('f-monto').value`), await texto('#tec-v')], ['', '$0.00']);
        await teclas('.5');
        check('«.5» = $0.50', await texto('#tec-v'), '$0.50');
        check('el foco se queda en el campo (el lector no salta)', await ev(`document.activeElement.id`), 'f-monto');
        check('anuncia el monto (aria-live)', await ev(`document.getElementById('tec-v').getAttribute('aria-live')`), 'polite');
        check('botones de 44 px o más', await ev(`Math.min(...[...document.querySelectorAll('.tec-b, .tec-listo')].map((x) => x.getBoundingClientRect().height))`), (x) => x >= 44);
        check('el campo se ve arriba del teclado', await ev(`document.getElementById('f-monto').getBoundingClientRect().bottom <= document.querySelector('.tec').getBoundingClientRect().top`), true);
        check('cada tecla dice qué es', await ev(`[...document.querySelectorAll('.tec-b')].map((x) => x.getAttribute('aria-label') || x.textContent.trim())`), ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Punto', '0', 'Borrar']);
        await tecla('listo');
        check('«Listo»: se cierra y el campo queda con formato', [await ev(`P.teclado.abierto()`), await ev(`document.getElementById('f-monto').value`), await ev(`P.ui.hoja.monto`)], [null, '0.50', '0.50']);
        // Teclado físico: las mismas reglas; Escape cierra el teclado (no la hoja).
        await ev(`document.getElementById('f-monto').value = ''; document.getElementById('f-monto').focus(); true`);
        for (const k of ['7', '.', '2', '5', '9']) await b.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: k, text: k });
        check('teclado físico: «7.259» queda en $7.25', [await ev(`document.getElementById('f-monto').value`), await texto('#tec-v')], ['7.25', '$7.25']);
        await b.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await esperar(100);
        check('Escape cierra el teclado, la hoja sigue y el foco vuelve al campo', [await ev(`P.teclado.abierto()`), await ev(`!!P.ui.hoja`), await ev(`document.activeElement.id`)], [null, true, 'f-monto']);
        await ev(`document.getElementById('f-monto').click(); true`);
        await teclas('9');
        check('al volver, el primer dígito empieza de nuevo (lo de antes estaba elegido)', await ev(`document.getElementById('f-monto').value`), '9');
        await tecla('listo');
        await ev(`P.acciones.cuadrarOk(); true`);
        check('y se guarda lo que se ve: cuadre de $9', await ev(`P.st.registros.at(-1).tipo + ':' + P.st.registros.at(-1).monto`), 'cuadre:900');
        check('al cerrar la hoja, el teclado se va', [await ev(`P.teclado.abierto()`), await ev(`document.getElementById('capa-teclado')?.innerHTML || ''`)], [null, '']);
    });
}

// ------------------------------------------------------------------ C) el mismo componente en todos los campos de monto
if (partes.includes('c')) {
    await abrirApp({ conTeclado: true });
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
                const r = await ev(`(() => { const el = document.getElementById(${js(id)}); el.click(); return { modo: el.getAttribute('inputmode'), abierto: P.teclado.abierto(), etiqueta: document.querySelector('.tec-l')?.textContent || '' }; })()`);
                if (r.modo !== 'none' || r.abierto !== id || !r.etiqueta) malos.push(`${h}#${id}: ${JSON.stringify(r)}`);
                await ev(`P.teclado.cerrar(); true`);
            }
        }
        check(`todos los campos de monto de las hojas usan el teclado (${campos} campos)`, malos, []);
        check('(y son varios)', campos, (n) => n >= 12);
        // Pongámonos al día, Reparte y el Primer día también.
        await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.abrir('aldia'); P.acciones.aldiaSiguiente(); P.acciones.aldiaSiguiente(); true`);
        const aldia = await ev(`[...document.querySelectorAll('.campo--monto input')].map((x) => { x.click(); const r = [x.getAttribute('inputmode'), P.teclado.abierto() === x.id]; P.teclado.cerrar(); return r; })`);
        check('Pongámonos al día (cuadrar tus lugares)', aldia.length && aldia.every((x) => x[0] === 'none' && x[1]), true);
        await ev(`P.irTab('hoy'); P.abrir('reparte', 'quincena', { fecha: '2026-10-15', monto: 60000 }); true`);
        const reparte = await ev(`[...document.querySelectorAll('.campo--monto input')].map((x) => { x.click(); const r = [x.getAttribute('inputmode'), P.teclado.abierto() === x.id]; P.teclado.cerrar(); return r; })`);
        check('Reparte', reparte.length > 0 && reparte.every((x) => x[0] === 'none' && x[1]), true);
        await ev(`(() => { const st = DATOS.crearNueva(); Object.assign(st, { persona: 'uso', hoy: '2026-10-21' }); P.cargar(st); P.ui.ob.paso = 2; P.render({ nueva: true }); return true; })()`);
        const ob = await ev(`[...document.querySelectorAll('.campo--monto input')].map((x) => { x.click(); const r = [x.getAttribute('inputmode'), P.teclado.abierto() === x.id]; P.teclado.cerrar(); return r; })`);
        check('el Primer día', ob.length > 0 && ob.every((x) => x[0] === 'none' && x[1]), true);
        await foto('C-primer-dia');
    });
    await abrirApp({ conTeclado: false });
    await armar();
    await seccion('C computadora', async () => {
        await ev(`P.abrirHoja('cuadrar', { id: 'efectivo' }); document.getElementById('f-monto').click(); true`);
        check('en la computadora: el teclado de siempre, sin el de montos', [await ev(`document.getElementById('f-monto').getAttribute('inputmode')`), await ev(`P.teclado.abierto()`)], ['decimal', null]);
        await escribir('#f-monto', '1,200');
        await ev(`P.acciones.cuadrarOk(); true`);
        check('se escribe normal y se lee con las mismas reglas: «1,200» = $1,200.00', await ev(`P.st.registros.at(-1).monto`), 120000);
    });
}

// ------------------------------------------------------------------ D) el mismo resultado en formulario, teclado y Anotar
if (partes.includes('d')) {
    await abrirApp({ conTeclado: true });
    await armar();
    await seccion('D iguales', async () => {
        for (const [t, c] of ENTRADAS.filter((x) => x[1] > 0 && x[1] <= 100000000)) {
            await anotar(`súper ${t}`);
            const deAnotar = (await borrador()).monto;
            await ev(`P.cerrarHoja({ sinFoco: true }); P.abrirHoja('mover', { id: 'agricola' }); true`);
            await escribir('#f-monto', t);
            const deForm = await ev(`MOTOR.leerMonto(P.ui.hoja.monto)`);
            await ev(`document.getElementById('f-monto').value = ''; document.getElementById('f-monto').click(); true`);
            await teclas(enTeclado(t));
            const deTeclado = await ev(`MOTOR.leerMonto(document.getElementById('f-monto').value)`);
            await ev(`P.teclado.cerrar(); P.cerrarHoja({ sinFoco: true }); true`);
            check(`«${t}»: Anotar = formulario = teclado = ${c}`, [deAnotar, deForm, deTeclado], [c, c, c]);
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
