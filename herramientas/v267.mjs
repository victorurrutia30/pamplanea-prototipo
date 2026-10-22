// PRUEBA v2.6.7 (V2-87): lo que pagas normalmente de una tarjeta se paga como cualquier otro pago. Con datos propios y la
// fecha del teléfono en cada caso (window.__fechaPrueba):
//  A) El caso EXACTO de la tester 1: Primer día el lunes 19 de octubre, $950 en el banco y $50 en efectivo, quincena el 15 y
//     el 30 ($600), tarjeta con corte 25, pago el 14 y «¿Cuánto pagas normalmente?» $100 → Libre $1,000.00 (era $900.00); el
//     pago del 14 nov lo cubre la quincena del 30: Hoy, «¿De dónde sale?», la ficha («Lo pagas con»), Próximos pagos (bajo
//     «Con tu quincena del 30») y «Próxima quincena (30)».
//  B) Cambiar con qué la pagas («Lo pagas con» en la ficha): a lo que tienes ahora → el libre baja y queda reservado; la
//     próxima quincena ya no la paga; «Deshacer». Con pago el 20 (tres opciones): a la quincena del 30 → la próxima quincena
//     la paga, la del 15 nov ya no, el libre igual. Y lo mismo desde «Editar» («¿Con qué ingreso la pagas?»).
//  C) Sin un ingreso antes de su fecha: sin ingreso fijo (vence este mes → como cualquier pago, sale de lo que tienes; vence
//     el otro mes → «lo que tengas cuando venza») y con la tarjeta antes de la quincena (vence el 25, cobra el 30): igual que
//     un pago cualquiera del mismo monto y día, y Hoy dice por qué («(antes de tu quincena)»).
//  D) Llega el estado de cuenta: reemplaza al estimado sin duplicar (un solo pago el 14 nov), sigue con la quincena del 30;
//     con una compra anotada, esa parte sigue saliendo de lo que tienes (el libre no salta); con «lo que tienes ahora»
//     elegido, el monto real también.
//  E) El caso EXACTO de la tester 2: $50 en Banco Agrícola, quincena el 29 por ~$550, préstamo de $157 el 30 (con la
//     quincena del 29), «Crédito Agrícola» con corte 21, pago 15, $150 normalmente y ~$2,000 que debe → Libre $50.00 sin
//     «Te faltan» (en la v2.6.6: $0.00 y «Te faltan $100.00»); la tarjeta bajo la quincena que la paga; «Debes ~$2,000 ·
//     por confirmar con tu estado de cuenta» en la ficha, Deudas y Mi dinero (agregado v2.6.7 #3). Con quincenas el 14 y el 29, el 15
//     y el 29, y cada mes el 29.
//  F) Actualizar desde la v2.6.6 (sacada de git) con la tarjeta estimada de la tester 2: el libre se recalcula solo ($0.00 →
//     $50.00), sin preguntas, nada se pierde (mismas claves y datos) y «Lo pagas con» que ya eligió en un pago se respeta.
// Uso: node herramientas/v267.mjs [--base=http://…/] [--puerto=9978] [--partes=abcdef] [--tema=ancla-oscuro] [--ref=fc02f7f] [--raiz=<otra copia>]
import { execSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
// --raiz: correr las mismas pruebas sobre otra copia (por ejemplo la v2.6.6, para ver que fallan antes).
const root = args.raiz ? path.resolve(args.raiz) : aqui;
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || 'abcdef').toLowerCase();
const tema = args.tema || 'serena-claro';
const ref = args.ref || 'fc02f7f';
const salida = path.join(aqui, 'capturas', 'v267' + (args.base ? '-servida' : '') + (args.raiz ? '-raiz' : '') + (args.tema ? '-' + args.tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9978) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
const notas = {};
let actual = '';
let checks = 0;
const check = (nombre, real, esperado) => {
    checks++;
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 400)}`);
    return ok;
};
const contiene = (t) => (x) => typeof x === 'string' && x.includes(t);
const noContiene = (t) => (x) => typeof x === 'string' && !x.includes(t);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const clic = async (sel, espera = 250) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(espera);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const escribir = async (sel, v) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(80);
};
const foto = (n) => b.captura(path.join(salida, n + '.png'));
async function esperarA(cond) {
    for (let i = 0; i < 50; i++) {
        if (await ev(cond).catch(() => false)) return true;
        await esperar(100);
    }
    return false;
}
async function entrarAlPrimerDia() {
    await clic('[data-fk="elegir-usar"]');
    await esperarA("(P.ayuda && P.ayuda.abierto && !!document.querySelector('[data-fk=intro-empezar]')) || !!document.querySelector('#ob-nombre')");
    if (await hay('[data-fk="intro-empezar"]')) await clic('[data-fk="intro-empezar"]');
    await esperarA("!!document.querySelector('#ob-nombre')");
}
let fechaId = null;
async function fecha(f) {
    if (fechaId) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: fechaId });
    fechaId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '${f}';` })).identifier;
}
async function abrirApp(url = base + 'telefono.html#tema=' + tema) {
    await b.ir('about:blank');
    await b.ir(url);
    await esperar(600);
}
async function seccion(nombre, fn) {
    actual = nombre;
    try {
        await fn();
    } catch (e) {
        fallos.push(`${actual}: excepción: ${e.message}`);
        await foto('ERROR-' + nombre.slice(0, 14).replace(/[^\w]+/g, '-')).catch(() => null);
    }
}
const $ = (centavos) => (centavos / 100).toFixed(2);
/** Los números de Hoy: libre, lo que tienes, lo de tarjetas y los avisos de «te faltan». */
const numeros = () => ev(`(() => { const k = P.calc(); return { libre: k.libre, tienes: k.tienes, enTarjetas: k.enTarjetas, reservado: k.reservadoPagos + k.reservadoProxima, falta: k.faltaPagos, rojo: k.avisos.some((a) => a.tipo === 'falta') }; })()`);
/** Cada periodo (día de pago): lo que entra, lo que se paga con él (con sus nombres) y lo que queda. */
const periodos = () => ev(`P.calc().periodos.slice(0, 3).map((x) => [x.clave, x.entra, x.pagos, x.partes.map((y) => y.pago.nombre + ' ' + y.parte).join(', '), x.quedan])`);
const ocTarjeta = (nombre) => ev(`MOTOR.ocurrenciasTarjeta(P.st, '2026-09-01', '2027-03-31').filter((o) => o.tarjeta.nombre === ${js(nombre)}).map((o) => o.fecha + ':' + o.estado + ':' + o.monto)`);
/** Las filas de «Próximos pagos» en Hoy: los separadores («Con tu quincena del 30») y los pagos, en orden. */
const proximos = () => ev(`[...document.querySelectorAll('#h-prox li, [aria-label="Próximos pagos"] li, .lista li')].filter((li) => li.closest('#pantalla')).map((li) => li.classList.contains('separador') ? '— ' + li.innerText.trim() : (li.querySelector('.fila-t') || {}).innerText).filter(Boolean)`);
const irHoy = async () => {
    await ev(`P.ui.hoja = null; P.irTab('hoy'); true`);
    await esperar(300);
};

/**
 * Un Primer día completo con sus datos: ingreso (quincena con días o cada mes), lo que tiene, deudas y tarjetas.
 * quincena: { monto, dias: '15-30' | [d1, d2] } o mes: { monto, dia }.
 */
async function primerDia(f, { nombre = 'Marta', quincena = null, mes = null, efectivo = '50', banco = '950', deudas = [], tarjetas = [], foto: nombreFoto = null }) {
    await fecha(f);
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
    await entrarAlPrimerDia();
    await escribir('#ob-nombre', nombre);
    await clic('[data-fk="ob-empezar"]');
    if (quincena) {
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', quincena.monto);
        if (Array.isArray(quincena.dias)) {
            await clic('[data-fk="ob-q-dias-otros"]');
            await escribir('#ob-q-d1', String(quincena.dias[0]));
            await escribir('#ob-q-d2', String(quincena.dias[1]));
        }
    }
    if (mes) {
        await clic('[data-fk="ob-i-mes"]');
        await escribir('#ob-m-monto', mes.monto);
        await clic(`[data-fk="ob-m-dia-${mes.dia}"]`);
    }
    if (!quincena && !mes) await clic('[data-fk="ob-i-varia"]');
    await ev('P.render(); true');
    await esperar(150);
    await clic('[data-fk="ob-sig"]');
    await escribir('#ob-efectivo', efectivo);
    await clic('[data-fk="ob-banco-Agrícola"]');
    await escribir('#ob-banco-monto', banco);
    await clic('[data-fk="ob-sig"]');
    for (const d of deudas) {
        await clic(`[data-fk="ob-dn-${d.tipo || 'prestamo'}"]`);
        await escribir('#ob-d-nombre', d.nombre);
        await escribir('#ob-d-monto', d.monto);
        await clic(`[data-fk="ob-d-dia-${d.dia}"]`);
        if (d.debe) await escribir('#ob-d-debe', d.debe);
        await clic('[data-fk="ob-d-guardar"]');
        if (await hay('#ob-antes-t')) await clic('[data-fk="ob-d-guardar"]');
    }
    await clic('[data-fk="ob-sig"]');
    for (const t of tarjetas) {
        await clic('[data-fk="ob-tn"]');
        await clic(`[data-fk="ob-t-banco-${t.banco}"]`);
        if (t.debe) await escribir('#ob-t-debe', t.debe);
        if (t.corte) await escribir('#ob-t-corte', t.corte);
        await escribir('#ob-t-pago', t.pago);
        if (t.usual) await escribir('#ob-t-usual', t.usual);
        // v2.8 (D-5): «Tu próximo pago»: si la persona dice que es el del mes siguiente, lo elige.
        if (t.otroMes) await clic('[data-fk="vence-otro"]');
        await clic('[data-fk="ob-t-guardar"]');
        if (await hay('#ob-antes-t')) {
            notas['pregunta-' + t.banco + '-' + f] = await texto('#ob-antes-t');
            if (t.antes === 'no') await clic('[data-fk="ob-antes-no"]');
            await clic('[data-fk="ob-t-guardar"]');
        }
    }
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    await esperar(300);
    if (nombreFoto) await foto(nombreFoto + '-tu-numero');
    await clic('[data-fk="pn-listo"]');
    await esperar(300);
}
/** La tarjeta (por nombre) con la información del motor. */
const infoTarjeta = (nombre) => ev(`(() => { const t = P.st.tarjetas.find((x) => x.nombre === ${js(nombre)}); const i = MOTOR.tarjetaInfo(P.st, t); return { id: t.id, vence: i.vence, estimado: i.estimado, comoPago: i.comoPago, conIngreso: i.conIngreso, partes: i.partes, enLibre: i.enLibre }; })()`);
const abrirTarjeta = async (nombre) => {
    const id = await ev(`P.st.tarjetas.find((x) => x.nombre === ${js(nombre)}).id`);
    await ev(`P.ui.hoja = null; P.irTab('midinero'); P.abrir('deudas'); P.abrir('tarjeta', ${js(id)}); true`);
    await esperar(300);
    return id;
};
const seccionCon = (titulo) => ev(`(() => { const h = [...document.querySelectorAll('#pantalla h2, #pantalla h3')].find((x) => x.textContent.trim().startsWith(${js(titulo)})); const s = h && h.closest('section'); return s ? s.innerText.replace(/\\s+/g, ' ').trim() : null; })()`);

// ================================================================ A) la tester 1
const tester1 = { quincena: { monto: '600' }, efectivo: '50', banco: '950', tarjetas: [{ banco: 'BAC', corte: '25', pago: '14', usual: '100' }] };
if (partes.includes('a')) {
    await seccion('A tester 1 (19 oct, corte 25, pago 14, ~$100, quincena 15 y 30)', async () => {
        await primerDia('2026-10-19', tester1);
        const n = await numeros();
        notas.A = { numeros: n, periodos: await periodos(), tarjeta: await infoTarjeta('Crédito BAC') };
        check('Libre $1,000.00 (era $900.00 en la v2.6.6)', n.libre, 100000);
        check('lo de la tarjeta no se aparta de lo que tienes', n.enTarjetas, 0);
        check('sin «Te faltan»', n.rojo, false);
        check('el pago del 14 nov lo cubre la quincena del 30', notas.A.tarjeta.partes, [{ de: '2026-10-30', monto: 10000 }]);
        check('la próxima quincena (30) lo paga: ~$600 · pagos ~$100 · te quedarían ~$500', notas.A.periodos[0], ['2026-10-30', 60000, 10000, 'Crédito BAC 10000', 50000]);
        check('un solo pago de la tarjeta, el 14 nov (estimado)', await ocTarjeta('Crédito BAC'), ['2026-11-14:pendiente:10000']);
        await irHoy();
        const portada = await texto('.portada-b');
        notas.A.portada = portada;
        check('Hoy: «Libre $1,000.00»', await texto('.portada-n'), '$1,000.00');
        check('Hoy dice con qué se paga la tarjeta', portada, contiene('Tarjeta ~$100 del 14 nov: se paga con tu quincena del 30'));
        check('Hoy ya no dice «Incluye tarjeta»', portada, noContiene('Incluye tarjeta'));
        // v2.8 (C-8): «Próxima quincena» está en Mi plan (ya no en Hoy).
        await ev(`P.irTab('pagos'); true`);
        check('Mi plan: «Próxima quincena (30)» con la tarjeta', await ev(`document.querySelector('#pantalla').innerText.replace(/\\s+/g, ' ')`), contiene('ingreso ~$600 · gastos ~$100 · te quedarían ~$500'));
        await ev(`P.irTab('hoy'); true`);
        const prox = await proximos();
        notas.A.proximos = prox;
        check('Próximos pagos: la tarjeta bajo «Con tu quincena del 30»', prox, (x) => x.indexOf('— Con tu quincena del 30') >= 0 && x.indexOf('Crédito BAC') > x.indexOf('— Con tu quincena del 30'));
        await foto('A-hoy');
        await clic('[data-fk="portada"]', 400);
        const desglose = await texto('.hoja');
        notas.A.desglose = desglose;
        check('«¿De dónde sale?»: por pagar $0.00, libre $1,000.00', desglose, (t) => t.includes('Por pagar antes del 30') && t.includes('$1,000.00'));
        check('«¿De dónde sale?»: la tarjeta, con la quincena del 30', desglose, contiene('Crédito BAC (~$100, vence el 14 nov): se paga con tu quincena del 30, no con lo que tienes hoy.'));
        await foto('A-desglose');
        await abrirTarjeta('Crédito BAC');
        const con = await seccionCon('Lo pagas con');
        notas.A.ficha = con;
        check('ficha: «Lo pagas con: Con tu quincena del 30 ~$100»', con, (t) => !!t && t.includes('Con tu quincena del 30') && t.includes('~$100') && t.includes('lo que pagas normalmente'));
        await ev(`(() => { const s = [...document.querySelectorAll('#pantalla h2')].find((x) => x.textContent.trim().startsWith('Lo pagas con')); if (s) s.scrollIntoView({ block: 'center' }); return true; })()`);
        await foto('A-ficha-tarjeta');
    });
}

// ================================================================ B) cambiar con qué la pagas
if (partes.includes('b')) {
    await seccion('B1 a «lo que tienes ahora» y «Deshacer»', async () => {
        await primerDia('2026-10-19', tester1);
        const n0 = await numeros();
        const p0 = await periodos();
        await abrirTarjeta('Crédito BAC');
        await clic('[data-fk="t-pagar-con"]', 400);
        check('el mismo control de los demás pagos', await texto('#hoja-t'), '¿Con qué pagas tu tarjeta Crédito BAC?');
        check('opciones: la quincena del 30 (lo normal) y lo que tienes', await ev(`[...document.querySelectorAll('.opciones-grandes .opcion-g-t')].map((e) => e.textContent.trim())`), ['Con tu quincena del 30 (lo normal)', 'Con lo que tienes ahora', 'Repartirlo']);
        await foto('B1-lo-pagas-con');
        await clic('[data-fk="pc-uno:ahora"]');
        await clic('[data-fk="pc-ok"]', 400);
        const n1 = await numeros();
        const p1 = await periodos();
        notas.B1 = { antes: n0, despues: n1, periodos: [p0[0], p1[0]] };
        check('el libre baja $100 (queda reservado de lo que tienes)', n0.libre - n1.libre, 10000);
        check('reservado $100', n1.reservado, 10000);
        check('la próxima quincena ya no la paga', p1[0][2], p0[0][2] - 10000);
        check('lo elegido se guarda en la tarjeta', await ev(`P.st.tarjetas.find((x) => x.nombre === 'Crédito BAC').asignaciones`), { '2026-11-14': [{ de: 'ahora', monto: 10000 }] });
        // v2.8 (C-2): sin «reservar» fuera de «¿De dónde sale?».
        check('la ficha lo dice', await seccionCon('Lo pagas con'), contiene('Ya contado de lo que tienes ahora'));
        check('el aviso «Deshacer»', await hay('[data-fk="toast-deshacer"]'), true);
        await clic('[data-fk="toast-deshacer"]', 400);
        const n2 = await numeros();
        check('«Deshacer»: vuelve a $1,000.00', n2.libre, n0.libre);
        check('«Deshacer»: la quincena del 30 la paga otra vez', (await periodos())[0][2], p0[0][2]);
        await irHoy();
        await foto('B1-hoy-despues-de-deshacer');
    });
    await seccion('B2 pago el 20: a la quincena del 30 (y desde «Editar»)', async () => {
        // Corte 5 (ya pasó) y pago el 20: el pago estimado es el del 20 nov. v2.8 (D-5): la persona lo dice («20 de
        // noviembre» en «Tu próximo pago»); sin decirlo sería el 20 de este mes.
        await primerDia('2026-10-19', { ...tester1, tarjetas: [{ banco: 'BAC', corte: '5', pago: '20', usual: '100', otroMes: true }] });
        const n0 = await numeros();
        const p0 = await periodos();
        check('por defecto, la quincena del 15 nov (la de antes del 20)', (await infoTarjeta('Crédito BAC')).partes, [{ de: '2026-11-15', monto: 10000 }]);
        await abrirTarjeta('Crédito BAC');
        await clic('[data-fk="t-pagar-con"]', 400);
        check('tres opciones y repartir', await ev(`[...document.querySelectorAll('.opciones-grandes .opcion-g-t')].map((e) => e.textContent.trim())`), ['Con tu quincena del 15 de noviembre (lo normal)', 'Con tu quincena del 30', 'Con lo que tienes ahora', 'Repartirlo']);
        await clic('[data-fk="pc-uno:2026-10-30"]');
        await clic('[data-fk="pc-ok"]', 400);
        const n1 = await numeros();
        const p1 = await periodos();
        notas.B2 = { periodosAntes: p0, periodosDespues: p1 };
        check('el libre no cambia (las dos quincenas todavía no llegan)', n1.libre, n0.libre);
        check('la del 30 ahora la paga (+$100)', p1[0][2] - p0[0][2], 10000);
        check('la del 15 nov ya no (−$100)', p0[1][2] - p1[1][2], 10000);
        await irHoy();
        check('Próximos pagos: la tarjeta bajo «Con tu quincena del 30»', await proximos(), (x) => x.indexOf('— Con tu quincena del 30') >= 0 && x.indexOf('Crédito BAC') > x.indexOf('— Con tu quincena del 30'));
        // Lo mismo desde «Editar»: «¿Con qué ingreso la pagas?».
        await abrirTarjeta('Crédito BAC');
        await clic('[data-fk="editar-tarjeta"]', 400);
        check('«Editar» trae con qué ingreso la pagas (la elegida)', await ev(`document.querySelector('[data-fk="op-fuenteT-2026-10-30"]')?.getAttribute('aria-pressed')`), 'true');
        await ev(`(() => { const q = document.querySelector('#l-medio'); const c = q && q.closest('.hoja-c'); if (c) c.scrollTop += q.getBoundingClientRect().top - c.getBoundingClientRect().top - 120; return !!q; })()`);
        await foto('B2-editar-con-que-ingreso');
        await clic('[data-fk="op-fuenteT-2026-11-15"]');
        await clic('[data-fk="deuda-ok"]', 400);
        check('desde «Editar»: vuelve a la del 15 nov', (await infoTarjeta('Crédito BAC')).partes, [{ de: '2026-11-15', monto: 10000 }]);
        check('y no queda nada elegido (es lo normal)', await ev(`(P.st.tarjetas.find((x) => x.nombre === 'Crédito BAC').asignaciones || {})['2026-11-20'] || null`), null);
    });
}

// ================================================================ C) sin un ingreso antes de su fecha
if (partes.includes('c')) {
    await seccion('C1 sin ingreso fijo: como cualquier pago', async () => {
        // Vence el 25 (este mes, antes de fin de mes): sale de lo que tienes, como un pago del mismo monto y día.
        await primerDia('2026-10-19', { efectivo: '50', banco: '950', tarjetas: [{ banco: 'BAC', corte: '28', pago: '25', usual: '100' }] });
        const n = await numeros();
        const t = await infoTarjeta('Crédito BAC');
        notas.C1 = { numeros: n, tarjeta: t };
        check('sin ingreso fijo: vence el 25 → sale de lo que tienes', [t.vence, t.partes, n.libre], ['2026-10-25', [{ de: 'ahora', monto: 10000 }], 90000]);
        // Un pago cualquiera de $100 el 25: lo mismo.
        const otro = await ev(`(() => { const s = structuredClone(P.st); s.tarjetas = []; s.medios = s.medios.filter((m) => !m.tarjeta); P.crearPago(s, { nombre: 'Otro', monto: 10000, frecuencia: 'unico', fecha: '2026-10-25', medio: 'efectivo' }); return MOTOR.calcular(s).libre; })()`);
        check('igual que un pago de $100 el 25', otro, n.libre);
        await irHoy();
        check('Hoy: «Incluye tarjeta ~$100, vence el 25»', await texto('.portada-b'), contiene('Incluye tarjeta ~$100, vence el 25'));
        await foto('C1-sin-ingreso-fijo');
    });
    await seccion('C2 sin ingreso fijo: vence el otro mes', async () => {
        await primerDia('2026-10-19', { efectivo: '50', banco: '950', tarjetas: [{ banco: 'BAC', corte: '25', pago: '14', usual: '100' }] });
        const n = await numeros();
        const t = await infoTarjeta('Crédito BAC');
        notas.C2 = { numeros: n, tarjeta: t };
        check('vence el 14 nov: «lo que tengas cuando venza», no baja el libre', [t.partes, n.libre], [[{ de: 'despues', monto: 10000 }], 100000]);
        const otro = await ev(`(() => { const s = structuredClone(P.st); s.tarjetas = []; s.medios = s.medios.filter((m) => !m.tarjeta); P.crearPago(s, { nombre: 'Otro', monto: 10000, frecuencia: 'unico', fecha: '2026-11-14', medio: 'efectivo' }); return MOTOR.calcular(s).libre; })()`);
        check('igual que un pago de $100 el 14 nov', otro, n.libre);
    });
    await seccion('C3 quincena el 30 y la tarjeta el 25: antes de la quincena', async () => {
        await primerDia('2026-10-19', { ...tester1, tarjetas: [{ banco: 'BAC', corte: '28', pago: '25', usual: '100' }] });
        const n = await numeros();
        notas.C3 = { numeros: n, tarjeta: await infoTarjeta('Crédito BAC') };
        check('vence antes de la quincena: sale de lo que tienes (libre $900.00)', n.libre, 90000);
        await irHoy();
        check('Hoy dice por qué: «(antes de tu quincena)»', await texto('.portada-b'), contiene('Incluye tarjeta ~$100, vence el 25 (antes de tu quincena)'));
        await clic('[data-fk="portada"]', 400);
        check('«¿De dónde sale?»: lo que pagas normalmente, antes de tu quincena', await texto('.hoja'), contiene('lo que pagas normalmente, vence el 25 oct, antes de tu quincena'));
        await foto('C3-antes-de-la-quincena');
    });
}

// ================================================================ D) llega el estado de cuenta
if (partes.includes('d')) {
    /** Anota el estado de cuenta (total y mínimo) con «Todo»; si pregunta qué son los dólares de más, «No sé». */
    async function estadoDeCuenta(nombre, total, minimo) {
        const id = await abrirTarjeta(nombre);
        await ev(`P.abrirHoja('estadoCuenta', { id: ${js(id)} }); true`);
        await esperar(300);
        await escribir('#f-total', total);
        await escribir('#f-minimo', minimo);
        await clic('[data-fk="hoja-ok"]', 300);
        if (await hay('[data-fk="op-motivo-nose"]')) {
            await clic('[data-fk="op-motivo-nose"]');
            await clic('[data-fk="hoja-ok"]', 300);
        }
        notas['ec-paso3-' + nombre + '-' + total] = await texto('.hoja');
        await clic('[data-fk="ec-total"]');
        await clic('[data-fk="hoja-ok"]', 400);
    }
    await seccion('D1 el estado de cuenta reemplaza al estimado y sigue con la quincena', async () => {
        await primerDia('2026-10-19', tester1);
        await fecha('2026-10-26');
        await abrirApp();
        const n0 = await numeros();
        await estadoDeCuenta('Crédito BAC', '130', '25');
        check('el paso 3 dice con qué se paga', notas['ec-paso3-Crédito BAC-130'], contiene('Se paga con tu quincena del 30, como lo que pagas normalmente.'));
        const n1 = await numeros();
        const t = await infoTarjeta('Crédito BAC');
        notas.D1 = { antes: n0, despues: n1, tarjeta: t, ocurrencias: await ocTarjeta('Crédito BAC'), periodos: await periodos() };
        check('un solo pago el 14 nov, ahora de $130 (sin duplicar)', notas.D1.ocurrencias, ['2026-11-14:pendiente:13000']);
        check('sigue con la quincena del 30', t.partes, [{ de: '2026-10-30', monto: 13000 }]);
        check('el libre no salta', n1.libre, n0.libre);
        check('la próxima quincena paga $130 (no $100 + $130)', notas.D1.periodos[0][2], 13000);
        check('noviembre: la tarjeta una sola vez', await ev(`MOTOR.pagosDelMes(P.st, 2026, 11).pagos`), 13000);
        await abrirTarjeta('Crédito BAC');
        check('la ficha: «Lo pagas con … tu estado de cuenta … Con tu quincena del 30 $130.00»', await seccionCon('Lo pagas con'), (x) => !!x && x.includes('tu estado de cuenta') && x.includes('Con tu quincena del 30') && x.includes('$130.00'));
        await foto('D1-ficha-estado');
    });
    await seccion('D2 con una compra anotada: esa parte sigue saliendo de lo que tienes', async () => {
        await primerDia('2026-10-19', tester1);
        await fecha('2026-10-22');
        await abrirApp();
        const credito = await ev(`P.st.medios.find((m) => m.tarjeta).id`);
        await ev(`P.cambiar((s) => { P.registrar(s, { tipo: 'gasto', fecha: s.hoy, monto: 3000, nombre: 'Zapatos', categoria: 'ropa', medio: ${js(credito)}, anotado: true, nuevo: true }); }, { aviso: 'ok' }); true`);
        await esperar(300);
        const n0 = await numeros();
        check('la compra baja el libre el día que se hace (V2-07)', n0.libre, 97000);
        await fecha('2026-10-26');
        await abrirApp();
        await estadoDeCuenta('Crédito BAC', '130', '25');
        const n1 = await numeros();
        const t = await infoTarjeta('Crédito BAC');
        notas.D2 = { antes: n0, despues: n1, tarjeta: t };
        check('el libre no salta ($970.00)', n1.libre, n0.libre);
        check('$100 con la quincena del 30 y $30 de lo que tienes', [t.partes, t.enLibre], [[{ de: '2026-10-30', monto: 10000 }], 3000]);
        await abrirTarjeta('Crédito BAC');
        check('la ficha lo dice', await seccionCon('Lo pagas con'), (x) => !!x && x.includes('Con tu quincena del 30') && x.includes('$100.00') && x.includes('tus compras de este ciclo') && x.includes('$30.00'));
    });
    await seccion('D3 con «lo que tienes ahora» elegido: el monto real también', async () => {
        await primerDia('2026-10-19', tester1);
        await abrirTarjeta('Crédito BAC');
        await clic('[data-fk="t-pagar-con"]', 400);
        await clic('[data-fk="pc-uno:ahora"]');
        await clic('[data-fk="pc-ok"]', 400);
        await fecha('2026-10-26');
        await abrirApp();
        const n0 = await numeros();
        await estadoDeCuenta('Crédito BAC', '130', '25');
        const n1 = await numeros();
        const t = await infoTarjeta('Crédito BAC');
        notas.D3 = { antes: n0, despues: n1, tarjeta: t };
        check('conserva lo elegido: todo con lo que tienes', t.partes, [{ de: 'ahora', monto: 13000 }]);
        check('el libre baja solo lo de más ($30)', n0.libre - n1.libre, 3000);
    });
}

// ================================================================ E) la tester 2
const tester2 = (ingreso) => ({ ...ingreso, efectivo: '0', banco: '50', deudas: [{ tipo: 'prestamo', nombre: 'Préstamo', monto: '157', dia: 30 }], tarjetas: [{ banco: 'Agrícola', debe: '2000', corte: '21', pago: '15', usual: '150' }] });
if (partes.includes('e')) {
    const variantes = [
        ['14 y 29', { quincena: { monto: '550', dias: [14, 29] } }, '2026-11-14', 'Con tu quincena del 14 de noviembre'],
        ['15 y 29', { quincena: { monto: '550', dias: [15, 29] } }, '2026-11-15', 'Con tu quincena del 15 de noviembre'],
        ['cada mes el 29', { mes: { monto: '550', dia: 29 } }, '2026-10-29', null],
    ];
    for (const [n, ingreso, fuente, separador] of variantes) {
        await seccion(`E tester 2 (quincena ${n})`, async () => {
            await primerDia('2026-10-19', { ...tester2(ingreso), foto: n === '14 y 29' ? 'E-tester2' : null });
            const k = await numeros();
            const t = await infoTarjeta('Crédito Agrícola');
            const p = await periodos();
            notas['E ' + n] = { numeros: k, tarjeta: t, periodos: p };
            check('Libre $50.00 (en la v2.6.6: $0.00)', k.libre, 5000);
            check('sin «Te faltan»', [k.falta, k.rojo], [0, false]);
            check('el pago del 15 nov lo cubre el ingreso de antes', t.partes, [{ de: fuente, monto: 15000 }]);
            check('el préstamo del 30 con la del 29', p[0].slice(0, 2), ['2026-10-29', 55000]);
            await irHoy();
            const portada = await texto('.portada-b');
            notas['E ' + n].portada = portada;
            check('Hoy: «Libre $50.00»', await texto('.portada-n'), '$50.00');
            check('Hoy: sin «Te faltan»', portada, noContiene('Te faltan'));
            const prox = await proximos();
            notas['E ' + n].proximos = prox;
            if (separador) check(`Próximos pagos: la tarjeta bajo «${separador}»`, prox, (x) => x.indexOf('— ' + separador) >= 0 && x.indexOf('Crédito Agrícola') > x.indexOf('— ' + separador) && x.indexOf('Préstamo') < x.indexOf('— ' + separador));
            else check('Próximos pagos: la tarjeta y el préstamo bajo «Con tu salario del 29» (cada mes se llama «Salario»)', prox, (x) => x.indexOf('— Con tu salario del 29') >= 0 && x.indexOf('Crédito Agrícola') > x.indexOf('— Con tu salario del 29') && x.indexOf('Préstamo') > x.indexOf('— Con tu salario del 29'));
            // v2.8 (C-8): «Próxima quincena» está en Mi plan.
            await ev(`P.irTab('pagos'); true`);
            const pantalla = await ev(`document.querySelector('#pantalla').innerText.replace(/\\s+/g, ' ')`);
            await ev(`P.irTab('hoy'); true`);
            notas['E ' + n].proximaQuincena = (pantalla.match(/Próxim[ao] [^·]*· ingreso[^.]*/) || [''])[0];
            if (n === '14 y 29') {
                check('«Próxima quincena (29)»: ingreso ~$550 · pagos ~$157 · te quedarían ~$393', pantalla, contiene('ingreso ~$550 · gastos ~$157 · te quedarían ~$393'));
                await foto('E-hoy');
                // Pagos → Próxima: el préstamo con la del 29.
                await ev(`P.irTab('pagos'); true`);
                await esperar(300);
                notas['E ' + n].pagos = await texto('#pantalla');
                await foto('E-pagos');
            }
            if (n === 'cada mes el 29') check('«Próximo …»: el préstamo y la tarjeta con el del 29 (~$307)', pantalla, contiene('gastos ~$307'));
            // agregado v2.6.7 #3: lo que debe, igual en la ficha, Deudas y Mi dinero.
            const frase = 'Debes ~$2,000 · por confirmar con tu estado de cuenta';
            await abrirTarjeta('Crédito Agrícola');
            const ficha = await texto('#pantalla .ficha-cifra');
            notas['E ' + n].ficha = ficha;
            check('ficha: «~$2,000 · Por confirmar con tu estado de cuenta»', ficha, (x) => !!x && x.includes('~$2,000') && x.includes('Por confirmar con tu estado de cuenta'));
            if (n === '14 y 29') {
                await foto('E-ficha');
                await ev(`(() => { const s = [...document.querySelectorAll('#pantalla h2')].find((x) => x.textContent.trim().startsWith('Lo pagas con')); if (s) s.scrollIntoView({ block: 'center' }); return true; })()`);
                await foto('E-ficha-lo-pagas-con');
            }
            await ev(`P.ui.hoja = null; P.irTab('midinero'); P.abrir('deudas'); true`);
            await esperar(300);
            check('Deudas: la misma frase', await texto('#pantalla'), contiene(frase));
            await ev(`P.ui.hoja = null; P.irTab('midinero'); true`);
            await esperar(300);
            check('Mi dinero: la misma frase', await texto('#pantalla .total'), contiene(frase));
            if (n === '14 y 29') await foto('E-mi-dinero');
        });
    }
}

// ================================================================ F) actualizar desde la v2.6.6
if (partes.includes('f')) {
    const vieja = await mkdtemp(path.join(os.tmpdir(), 'pamplanea-v266-'));
    await writeFile(path.join(vieja, 'v.tar'), execSync(`git archive --format=tar ${ref}`, { cwd: aqui, maxBuffer: 1 << 28 }));
    execSync('tar -xf v.tar', { cwd: vieja });
    const urlVieja = pathToFileURL(vieja).href + '/telefono.html#tema=' + tema;
    const guardado = () => ev(`localStorage.getItem('pamplanea-uso:v1')`);
    let datos = null;
    let progreso = null;
    await seccion('F0 la tester 2 con la v2.6.6', async () => {
        await fecha('2026-10-19');
        const viejaBase = base;
        // El mismo Primer día, en la v2.6.6.
        const abrirVieja = async () => abrirApp(urlVieja);
        await abrirVieja();
        await ev('P.sinGuardar = true; localStorage.clear(); true');
        await abrirVieja();
        check('la vieja es la v2.6.6', await ev('window.VERSION_PROTOTIPO'), (v) => /2\.6\.6/.test(v));
        await entrarAlPrimerDia();
        await escribir('#ob-nombre', 'Marta');
        await clic('[data-fk="ob-empezar"]');
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', '550');
        await clic('[data-fk="ob-q-dias-otros"]');
        await escribir('#ob-q-d1', '14');
        await escribir('#ob-q-d2', '29');
        await clic('[data-fk="ob-sig"]');
        await escribir('#ob-efectivo', '0');
        await clic('[data-fk="ob-banco-Agrícola"]');
        await escribir('#ob-banco-monto', '50');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-dn-prestamo"]');
        await escribir('#ob-d-nombre', 'Préstamo');
        await escribir('#ob-d-monto', '157');
        await clic('[data-fk="ob-d-dia-30"]');
        await clic('[data-fk="ob-d-guardar"]');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-tn"]');
        await clic('[data-fk="ob-t-banco-Agrícola"]');
        await escribir('#ob-t-debe', '2000');
        await escribir('#ob-t-corte', '21');
        await escribir('#ob-t-pago', '15');
        await escribir('#ob-t-usual', '150');
        await clic('[data-fk="ob-t-guardar"]');
        if (await hay('#ob-antes-t')) await clic('[data-fk="ob-t-guardar"]');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-sig"]');
        await esperar(300);
        await clic('[data-fk="pn-listo"]');
        await esperar(300);
        // Un pago con «Lo pagas con» elegido (para ver que se respeta): Internet $25 el 5, con la quincena del 29.
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        await clic('[data-fk="np-otro"]');
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿Con qué lo pagas?» ya no viene elegido: lo de antes (Efectivo).
        await clic('[data-fk="op-medio-efectivo"]');
        await escribir('#f-nombre', 'Internet');
        await escribir('#f-monto', '25');
        await clic('[data-fk="dia-dia-5"]');
        await clic('[data-fk="hoja-ok"]', 400);
        const pid = await ev(`P.st.pagos.find((p) => p.nombre === 'Internet').id`);
        await ev(`P.abrir('pago', ${js(pid)}); true`);
        await esperar(300);
        await clic('[data-fk="pagar-con"]', 400);
        await clic('[data-fk="pc-uno:ahora"]');
        await clic('[data-fk="pc-ok"]', 400);
        // Progreso del entrenamiento (para ver que no se pierde).
        await ev(`P.modos.guardarEntrenamiento({ caps: { 'fijo:esencial': { paso: 4, hecho: false }, 'fijo:tarjetas': { paso: 0, hecho: true } }, tourVersion: 'fijo', tourUltimo: 'fijo:tarjetas' }); true`);
        await ev('P.guardarYa(); true');
        await esperar(300);
        await irHoy();
        notas.F0 = { portada: await texto('.portada-b'), libre: await ev('P.calc().libre') };
        check('en la v2.6.6: «Libre $0.00 · Te faltan $100.00» (sin el Internet)', notas.F0.portada, (t) => t.includes('$0.00') && t.includes('Te faltan'));
        await foto('F0-v266');
        // Como quien ya la había abierto otra vez con la v2.6.6 (al abrir, la app completa sus listas vacías).
        await abrirVieja();
        await ev('P.guardarYa(); true');
        await esperar(300);
        datos = await guardado();
        progreso = await ev(`localStorage.getItem('pamplanea-entrenamiento')`);
        await ev('P.sinGuardar = true; true');
    });
    await seccion('F1 al abrir la v2.6.7: el libre se recalcula solo', async () => {
        await fecha('2026-10-19');
        await abrirApp();
        await ev(`(() => { P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-uso:v1', ${js(datos)}); localStorage.setItem('pamplanea-entrenamiento', ${js(progreso)}); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, cuentas: true, ahorros: true, deudas: true } })); return true; })()`);
        await abrirApp();
        // v2.7: la versión que abre estos datos ya es la v2.7 (la prueba sigue midiendo lo mismo).
        check('es la v2.6.7 o más nueva', await ev('window.VERSION_PROTOTIPO'), (v) => /2\.6\.7|2\.[78]\.\d/.test(v));
        const n = await numeros();
        notas.F1 = { numeros: n, tarjeta: await infoTarjeta('Crédito Agrícola') };
        check('el libre se recalcula: $50.00 − $25.00 del Internet (con lo que tiene) = $25.00', n.libre, 2500);
        check('sin «Te faltan»', n.rojo, false);
        check('sin preguntas: no hay hojas ni revisión abiertas', [await hay('.hoja'), await hay('.aviso-antes')], [false, false]);
        check('la tarjeta con la quincena del 14 nov', notas.F1.tarjeta.partes, [{ de: '2026-11-14', monto: 15000 }]);
        check('«Lo pagas con» del Internet respetado', await ev(`P.st.pagos.find((p) => p.nombre === 'Internet').asignaciones`), (x) => !!x && Object.values(x).some((v) => v[0].de === 'ahora'));
        await ev('P.guardarYa(); true');
        await esperar(300);
        const antes = JSON.parse(datos);
        const despues = JSON.parse(await guardado());
        const claves = (o, pre = '') => Object.entries(o || {}).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? [pre + k, ...claves(v, pre + k + '.')] : [pre + k]));
        // v2.7: lo único nuevo es qué versión los guardó (DATOS-1) y lo del cuadrito de novedades (Parte D).
        const sinLas = (lista) => lista.filter((c) => !/^metricas|^ultimaCopia|^feedback|^novedades|^version$/.test(c));
        check('nada se pierde: las mismas claves guardadas', sinLas(claves(despues)).filter((c) => !sinLas(claves(antes)).includes(c)), []);
        check('ni datos: los mismos pagos, tarjetas, ingresos y registros', ['pagos', 'tarjetas', 'ingresos', 'registros', 'lugares', 'medios'].map((k) => JSON.stringify(despues.st[k]) === JSON.stringify(antes.st[k])), [true, true, true, true, true, true]);
        check('el progreso del entrenamiento sigue', await ev(`localStorage.getItem('pamplanea-entrenamiento')`), progreso);
        check('(y no estaba vacío)', JSON.parse(progreso || '{}').caps, (x) => !!x && !!x['fijo:tarjetas']);
        await irHoy();
        notas.F1.portada = await texto('.portada-b');
        await foto('F1-v267');
    });
}

const resultado = { version: await ev('window.VERSION_PROTOTIPO').catch(() => null), checks, fallos, notas, errores: b.errores, fallidas: b.fallidas };
console.log(JSON.stringify(resultado, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
