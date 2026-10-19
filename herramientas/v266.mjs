// PRUEBA v2.6.6 (V2-85 y V2-86): lo de antes de que empezaras no se cobra solo, y quienes ya usan la app lo revisan.
// Con datos propios y la fecha del teléfono en cada caso (window.__fechaPrueba):
//  A) «+ Pago» y «Recordarme un pago»: registro antes del día (10 → 14: pendiente el 14, sin pregunta), el mismo día (14 →
//     «El de hoy, ¿ya lo pagaste?»), después (19 → «El de octubre (14 oct), ¿ya lo pagaste?»; «Sí» → el primero es el 14 nov
//     y el libre no baja; «No» → vencido y sí baja), fin de mes (paga el 31: el 30 nov y el 28 feb son «hoy»; el 1 dic no
//     pregunta), quincenal (15 y 30) y semanal.
//  B) Tarjetas (Mi dinero): corte después del registro (25) y antes (10); con su último estado de cuenta; editar el día de
//     pago (V2-57) sin crear pagos vencidos.
//  C) Préstamo (cuota) y cuchubal (aporte y turno).
//  D) Ingreso esperado ya pasado («La del 10 de octubre, ¿ya te llegó?») y la quincena del Primer día.
//  E) El caso EXACTO de la tester: Primer día el lunes 19 de octubre, tarjeta con corte 25, pago el 14 y «¿Cuánto pagas
//     normalmente?» $100: nada dice «venció el 14», todo dice «14 nov».
//  F) V2-86: datos de la v2.6.5 (creados con esa versión, sacada de git) al abrir la v2.6.6: «Revisemos unos pagos de antes
//     de que empezaras» con cada caso (a–d), «Sí» (y el libre que cambia), «No», «Ya pagué todos», «Deshacer», «Ahora no»,
//     quien no tiene problemas no ve nada y lo contestado no se vuelve a preguntar; copia interna y candado V2-79.
//  G) Editar el día de un pago existente sin crear pagos vencidos.
// Uso: node herramientas/v266.mjs [--base=http://…/] [--puerto=9977] [--partes=abcdefg] [--tema=ancla-oscuro] [--ref=078dcc6]
import { execSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || 'abcdefg').toLowerCase();
const tema = args.tema || 'serena-claro';
const ref = args.ref || '078dcc6';
const salida = path.join(root, 'capturas', 'v266' + (args.base ? '-servida' : '') + (args.tema ? '-' + args.tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9977) });
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
/** Espera (hasta 5 s) a que algo esté en pantalla: con la máquina cargada, un tiempo fijo no alcanza. */
async function esperarA(cond) {
    for (let i = 0; i < 50; i++) {
        if (await ev(cond).catch(() => false)) return true;
        await esperar(100);
    }
    return false;
}
/** «Usarla con mis datos» → la bienvenida (si sale) → el Primer día. */
async function entrarAlPrimerDia() {
    await clic('[data-fk="elegir-usar"]');
    await esperarA("(P.ayuda && P.ayuda.abierto && !!document.querySelector('[data-fk=intro-empezar]')) || !!document.querySelector('#ob-nombre')");
    if (await hay('[data-fk="intro-empezar"]')) await clic('[data-fk="intro-empezar"]');
    await esperarA("!!document.querySelector('#ob-nombre')");
}
// La fecha del teléfono en cada caso (la última que se pone es la que vale).
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
/** Los números del caso: libre, lo que tienes, lo que se aparta para tarjetas y lo que se paga antes del ingreso. */
const numeros = () => ev(`(() => { const k = P.calc(); return { libre: k.libre, tienes: k.tienes, enTarjetas: k.enTarjetas, porPagar: k.porPagar }; })()`);
const ocurrencias = (nombre, desde = '2026-09-01', hasta = '2027-03-31') =>
    ev(`(() => { const p = P.st.pagos.find((x) => x.nombre === ${js(nombre)}); return p ? MOTOR.ocurrenciasPago(P.st, p, ${js(desde)}, ${js(hasta)}).slice(0, 3).map((o) => o.fecha + ':' + o.estado) : null; })()`);
const ocTarjeta = (nombre) => ev(`MOTOR.ocurrenciasTarjeta(P.st, '2026-09-01', '2027-03-31').filter((o) => o.tarjeta.nombre === ${js(nombre)}).map((o) => o.fecha + ':' + o.estado + ':' + o.monto)`);
const pregunta = () => texto('#antes-t');
/** Lleva la pregunta a la vista (para la captura), como cuando la persona baja en el formulario. */
const verPregunta = () => ev(`(() => { const q = document.querySelector('#antes-t'); const c = q && (q.closest('.hoja-c') || document.getElementById('vista')); if (c) c.scrollTop += q.getBoundingClientRect().top - c.getBoundingClientRect().top - 300; return !!q; })()`);
async function seccion(nombre, fn) {
    actual = nombre;
    try {
        await fn();
    } catch (e) {
        fallos.push(`${actual}: excepción: ${e.message}`);
        await foto('ERROR-' + nombre.slice(0, 14).replace(/[^\w]+/g, '-')).catch(() => null);
    }
}
/**
 * El Primer día de Marta, con la quincena (15 y 30, $600), $950 en el banco y $50 en efectivo. Opciones: una tarjeta
 * ({ corte, pago, usual, antes }) y la respuesta a la quincena de este periodo (`quincena: 'si' | 'no'`).
 */
async function primerDia(f, { tarjeta = null, quincena = null, foto: nombreFoto = null } = {}) {
    await fecha(f);
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
    await entrarAlPrimerDia();
    await escribir('#ob-nombre', 'Marta');
    await clic('[data-fk="ob-empezar"]');
    await clic('[data-fk="ob-i-quincena"]');
    await escribir('#ob-q-monto', '600');
    if (quincena) {
        await ev('P.render(); true');
        await esperar(150);
        notas['quincena-' + f] = await texto('#ob-antes-quincena-t');
        if (nombreFoto) await foto(nombreFoto + '-ingreso');
        if (quincena === 'no') await clic('[data-fk="ob-antes-quincena-no"]');
    }
    await clic('[data-fk="ob-sig"]');
    await escribir('#ob-efectivo', '50');
    await clic('[data-fk="ob-banco-Agrícola"]');
    await escribir('#ob-banco-monto', '950');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    if (tarjeta) {
        await clic('[data-fk="ob-tn"]');
        await clic('[data-fk="ob-t-banco-BAC"]');
        if (tarjeta.corte) await escribir('#ob-t-corte', tarjeta.corte);
        await escribir('#ob-t-pago', tarjeta.pago);
        if (tarjeta.usual) await escribir('#ob-t-usual', tarjeta.usual);
        await clic('[data-fk="ob-t-guardar"]');
        notas['tarjeta-pregunta-' + f] = await texto('#ob-antes-t');
        if (nombreFoto) await foto(nombreFoto);
        if (tarjeta.antes === 'no') await clic('[data-fk="ob-antes-no"]');
        if (await hay('[data-fk="ob-t-guardar"]')) await clic('[data-fk="ob-t-guardar"]');
    }
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    await esperar(300);
    await clic('[data-fk="pn-listo"]');
    await esperar(300);
}
/** «+ Pago» → «Otro pago»: nombre, monto, frecuencia y día. Deja la hoja abierta (para mirar la pregunta). */
async function nuevoPago({ nombre = 'Gimnasio', monto = '25', frecuencia = 'mensual', dia = null, qModo = null }) {
    await ev(`P.abrirHoja('nuevoPago', {}); true`);
    await esperar(300);
    await clic('[data-fk="np-otro"]');
    await escribir('#f-nombre', nombre);
    await escribir('#f-monto', monto);
    if (frecuencia !== 'mensual') await clic(`[data-fk="op-frecuencia-${frecuencia}"]`);
    if (qModo) await clic(`[data-fk="op-qModo-${qModo}"]`);
    if (dia) await clic(`[data-fk="dia-dia-${dia}"]`);
}

// ================================================================ A) «+ Pago» y «Recordarme un pago»
if (partes.includes('a')) {
    await seccion('A1 antes del día (registro el 10, paga el 14)', async () => {
        await primerDia('2026-10-10');
        const n0 = await numeros();
        await nuevoPago({ dia: 14 });
        check('sin pregunta (todavía no llega el 14)', await hay('#antes-t'), false);
        await clic('[data-fk="hoja-ok"]', 400);
        check('pendiente el 14 de este mes', await ocurrencias('Gimnasio'), (x) => x[0] === '2026-10-14:pendiente');
        const n1 = await numeros();
        notas.A1 = { antes: n0, despues: n1 };
        // El 14 vence antes de la quincena del 15: se paga con lo que tienes.
        check('el libre baja $25 (vence el 14, antes de tu quincena del 15)', n0.libre - n1.libre, 2500);
    });
    await seccion('A2 el mismo día (registro el 14, paga el 14)', async () => {
        await primerDia('2026-10-14');
        const n0 = await numeros();
        await nuevoPago({ dia: 14 });
        check('pregunta por el de hoy', await pregunta(), 'El de hoy, ¿ya lo pagaste?');
        check('«Sí, ya lo pagué» viene elegido', await ev(`document.querySelector('[data-fk="antes-si"]').getAttribute('aria-pressed')`), 'true');
        check('dice cuál es el próximo', await texto('#antes-nota'), 'No se cuenta en tu libre. Tu próximo pago: 14 de noviembre.');
        await verPregunta();
        await foto('A2-mismo-dia');
        await clic('[data-fk="hoja-ok"]', 400);
        check('«Sí»: el primero es el 14 nov', await ocurrencias('Gimnasio'), (x) => x[0] === '2026-11-14:pendiente');
        const n1 = await numeros();
        notas.A2 = { antes: n0, despues: n1 };
        check('el libre no baja', n1.libre, n0.libre);
    });
    await seccion('A3 después (registro el 19, paga el 14): «Sí»', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await nuevoPago({ dia: 14 });
        check('la pregunta', await pregunta(), 'El de octubre (14 oct), ¿ya lo pagaste?');
        check('las dos respuestas (44 px)', await ev(`[...document.querySelectorAll('.pregunta--antes .chip')].map((e) => [e.textContent.trim(), e.getBoundingClientRect().height >= 44])`), [['Sí, ya lo pagué', true], ['No, todavía lo debo', true]]);
        await verPregunta();
        await foto('A3-pregunta');
        await clic('[data-fk="hoja-ok"]', 400);
        check('el primero es el 14 nov', await ocurrencias('Gimnasio'), (x) => x[0] === '2026-11-14:pendiente');
        const n1 = await numeros();
        notas.A3si = { antes: n0, despues: n1 };
        check('el libre no baja', n1.libre, n0.libre);
        check('Mes: octubre no lo cuenta', await ev(`MOTOR.pagosDelMes(P.st, 2026, 10).pagos`), 0);
    });
    await seccion('A3 después (registro el 19, paga el 14): «No, todavía lo debo»', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await nuevoPago({ dia: 14 });
        await clic('[data-fk="antes-no"]');
        check('la respuesta se ve marcada', await ev(`[document.querySelector('[data-fk="antes-no"]').getAttribute('aria-pressed'), !!document.querySelector('[data-fk="antes-no"] .ico-xs')]`), ['true', true]);
        check('dice que queda pendiente', await texto('#antes-nota'), 'Queda pendiente desde el 14 de octubre y se cuenta en tu libre.');
        await verPregunta();
        await foto('A3-no');
        await clic('[data-fk="hoja-ok"]', 400);
        check('vencido el 14 oct', await ocurrencias('Gimnasio'), (x) => x[0] === '2026-10-14:vencido' && x[1] === '2026-11-14:pendiente');
        const n1 = await numeros();
        notas.A3no = { antes: n0, despues: n1 };
        check('el libre baja $25', n0.libre - n1.libre, 2500);
        check('no se vuelve a preguntar al abrir (V2-86)', await ev('P.modos.casosAntes().length'), 0);
    });
    await seccion('A4 fin de mes (paga el 31)', async () => {
        for (const [f, esperado] of [['2026-11-30', 'El de hoy, ¿ya lo pagaste?'], ['2027-02-28', 'El de hoy, ¿ya lo pagaste?'], ['2026-12-01', null]]) {
            await primerDia(f);
            const n0 = await numeros();
            await nuevoPago({ dia: 31 });
            check(`${f}: la pregunta`, await pregunta(), esperado);
            await clic('[data-fk="hoja-ok"]', 400);
            const oc = await ocurrencias('Gimnasio');
            const n1 = await numeros();
            notas['A4-' + f] = { oc, antes: n0.libre, despues: n1.libre };
            if (f === '2026-11-30') check('30 nov: el primero es el 31 dic', oc[0], '2026-12-31:pendiente');
            if (f === '2027-02-28') check('28 feb: el primero es el 31 mar', oc[0], '2027-03-31:pendiente');
            if (f === '2026-12-01') check('1 dic: el primero es el 31 dic (el 30 nov no se crea)', oc[0], '2026-12-31:pendiente');
            check(`${f}: el libre no baja`, n1.libre, n0.libre);
        }
    });
    await seccion('A5 quincenal (15 y 30) y semanal', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await nuevoPago({ nombre: 'Ahorro con mi mamá', frecuencia: 'quincenal', qModo: '15-30' });
        check('quincenal: el del 15', await pregunta(), 'El del 15 de octubre, ¿ya lo pagaste?');
        await clic('[data-fk="hoja-ok"]', 400);
        check('quincenal: el primero es el 30 oct', await ocurrencias('Ahorro con mi mamá'), (x) => x[0] === '2026-10-30:pendiente');
        await nuevoPago({ nombre: 'Cuota semanal', frecuencia: 'semanal' });
        check('semanal (viernes): el del 16', await pregunta(), 'El del 16 de octubre, ¿ya lo pagaste?');
        await clic('[data-fk="antes-no"]');
        await clic('[data-fk="hoja-ok"]', 400);
        check('semanal «No»: el 16 vencido; los de antes, no', await ocurrencias('Cuota semanal'), (x) => x[0] === '2026-10-16:vencido' && x[1] === '2026-10-23:pendiente');
        const n1 = await numeros();
        notas.A5 = { antes: n0, despues: n1 };
        check('el libre baja $50: el del 16 (lo debes) y el del 23 (antes de tu quincena del 30); nada de antes', n0.libre - n1.libre, 5000);
    });
    await seccion('A6 «Recordarme un pago» (Anotar)', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await ev(`(() => { P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'recuérdame pagar el gimnasio 25 el 14'; q.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
        await esperar(500);
        if (await hay('[data-fk="op-frecuencia-mensual"]')) await clic('[data-fk="op-frecuencia-mensual"]', 400);
        check('la pregunta en Anotar', await pregunta(), 'El de octubre (14 oct), ¿ya lo pagaste?');
        await verPregunta();
        await foto('A6-anotar');
        await ev('P.acciones.anotarGuardar(); true');
        await esperar(400);
        check('guardado: el primero es el 14 nov', await ocurrencias('Gimnasio'), (x) => x && x[0] === '2026-11-14:pendiente');
        check('el libre no baja', (await numeros()).libre, n0.libre);
    });
}

// ================================================================ B) Tarjetas en Mi dinero
if (partes.includes('b')) {
    const tarjetaMiDinero = async ({ nombre = 'Crédito Agrícola', corte, pago = '14', usual = '', ec = '' }) => {
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
        await esperar(300);
        await escribir('#f-nombre', nombre);
        await escribir('#f-corte', corte);
        await escribir('#f-pagoDia', pago);
        if (ec) await escribir('#f-ecTotal', ec);
        if (usual) await escribir('#f-usualNueva', usual);
        await clic('[data-fk="deuda-ok"]', 300);
    };
    await seccion('B1 corte después del registro (25), pago el 14, lo que pagas normalmente', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await tarjetaMiDinero({ corte: '25', usual: '100' });
        check('pregunta al guardar', await pregunta(), 'El de octubre (14 oct), ¿ya lo pagaste?');
        await foto('B1-tarjeta-pregunta');
        await clic('[data-fk="deuda-ok"]', 400);
        check('su pago: el 14 nov (estimado)', await ocTarjeta('Crédito Agrícola'), ['2026-11-14:pendiente:10000']);
        const n1 = await numeros();
        notas.B1 = { antes: n0, despues: n1 };
        check('se aparta lo que pagas normalmente para el 14 nov (V2-54/V2-78), una sola vez', n0.libre - n1.libre, 10000);
        await ev(`P.irTab('hoy'); true`);
        await esperar(300);
        check('Hoy: «vence el 14 nov»', await texto('.portada-b'), (t) => t.includes('Incluye tarjeta ~$100, vence el 14 nov') && !t.includes('venció'));
    });
    await seccion('B2 corte antes del registro (10), pago el 14', async () => {
        await primerDia('2026-10-19');
        await tarjetaMiDinero({ corte: '10', usual: '100' });
        check('sin pregunta (vence el 14 nov)', await hay('#antes-t'), false);
        check('guardada', await ocTarjeta('Crédito Agrícola'), ['2026-11-14:pendiente:10000']);
    });
    await seccion('B3 con su último estado de cuenta (corte 25, pago 14, $100)', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await tarjetaMiDinero({ corte: '25', ec: '100' });
        check('pregunta', await pregunta(), 'El de octubre (14 oct), ¿ya lo pagaste?');
        await clic('[data-fk="deuda-ok"]', 400);
        check('«Sí»: el del 14 oct no se ve ni se cuenta', await ocTarjeta('Crédito Agrícola'), []);
        const n1 = await numeros();
        notas.B3si = { antes: n0, despues: n1 };
        check('el libre no baja', n1.libre, n0.libre);
        check('lo que debes baja lo que pagaste', await ev(`MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).debeTotal`), 0);
        await primerDia('2026-10-19');
        await tarjetaMiDinero({ corte: '25', ec: '100' });
        await clic('[data-fk="antes-no"]');
        await clic('[data-fk="deuda-ok"]', 400);
        check('«No»: vencido el 14 oct', await ocTarjeta('Crédito Agrícola'), ['2026-10-14:vencido:10000']);
        const n2 = await numeros();
        notas.B3no = { antes: n0, despues: n2 };
        check('«No»: el libre baja $100', n0.libre - n2.libre, 10000);
        check('«No»: no se vuelve a preguntar al abrir', await ev('P.modos.casosAntes().length'), 0);
    });
    await seccion('B4 editar el corte y el pago (V2-57) sin crear un pago vencido', async () => {
        await primerDia('2026-10-19');
        await tarjetaMiDinero({ corte: '10', pago: '20', usual: '100' });
        check('antes: vence el 20 nov', await ocTarjeta('Crédito Agrícola'), ['2026-11-20:pendiente:10000']);
        const n0 = await numeros();
        await ev(`P.abrirHoja('nuevaDeuda', { tarjetaId: P.st.tarjetas[0].id }); true`);
        await esperar(300);
        await escribir('#f-corte', '25');
        await escribir('#f-pagoDia', '14');
        await clic('[data-fk="deuda-ok"]', 300);
        check('pregunta por el del 14 oct', await pregunta(), 'El de octubre (14 oct), ¿ya lo pagaste?');
        await clic('[data-fk="deuda-ok"]', 400);
        check('después: vence el 14 nov (ningún vencido)', await ocTarjeta('Crédito Agrícola'), ['2026-11-14:pendiente:10000']);
        check('el libre igual', (await numeros()).libre, n0.libre);
    });
}

// ================================================================ C) Préstamo y cuchubal
if (partes.includes('c')) {
    await seccion('C1 préstamo (cuota el 14)', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'prestamo' }); true`);
        await esperar(300);
        await escribir('#f-nombre', 'Préstamo cooperativa');
        await escribir('#f-cuota', '80');
        await escribir('#f-dia', '14');
        await clic('[data-fk="deuda-ok"]', 300);
        check('pregunta', await pregunta(), 'El de octubre (14 oct), ¿ya lo pagaste?');
        await clic('[data-fk="deuda-ok"]', 400);
        check('el primero es el 14 nov', await ocurrencias('Préstamo cooperativa'), (x) => x[0] === '2026-11-14:pendiente');
        check('el libre no baja', (await numeros()).libre, n0.libre);
    });
    await seccion('C2 cuchubal: aporte cada viernes y turno', async () => {
        await primerDia('2026-10-19');
        const n0 = await numeros();
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        await clic('[data-fk="np-otro"]');
        await clic('[data-fk="op-frecuente-cuchubal"]');
        await escribir('#f-monto', '10');
        await clic('[data-fk="op-frecuencia-semanal"]');
        check('aporte: el del viernes 16', await pregunta(), 'El del 16 de octubre, ¿ya lo pagaste?');
        check('turno: no se puede elegir un día que ya pasó', await ev(`(() => { const d = document.querySelector('[data-fk="cal-turno-2026-10-16"]'); return d ? d.disabled : 'sin día'; })()`), true);
        await clic('[data-fk="cal-turno-2026-10-30"]');
        await escribir('#f-turnoMonto', '200');
        await clic('[data-fk="hoja-ok"]', 400);
        check('aporte: el primero es el viernes 23', await ocurrencias('Cuchubal'), (x) => x[0] === '2026-10-23:pendiente');
        check('turno: ingreso esperado el 30 oct', await ev(`P.st.ingresos.filter((i) => i.nombre === 'Tu turno del cuchubal').map((i) => [i.fecha, i.monto])`), [['2026-10-30', 20000]]);
        check('el libre: solo los aportes que vienen antes del 30 ($10 del 23)', n0.libre - (await numeros()).libre, 1000);
    });
}

// ================================================================ D) Ingresos
if (partes.includes('d')) {
    await seccion('D1 «+ Ingreso esperado»: remesa del 10, registrada el 19', async () => {
        for (const resp of ['si', 'no']) {
            await primerDia('2026-10-19');
            const n0 = await numeros();
            await ev(`P.abrirHoja('nuevoIngreso', {}); true`);
            await esperar(300);
            await clic('[data-fk="op-tipoIng-remesa"]');
            await escribir('#f-monto', '150');
            await clic('[data-fk="dia-dia-10"]');
            check('la pregunta', await pregunta(), 'La del 10 de octubre, ¿ya te llegó?');
            check('las respuestas', await ev(`[...document.querySelectorAll('.pregunta--antes .chip')].map((e) => e.textContent.trim())`), ['Sí, ya me llegó', 'No, todavía no']);
            if (resp === 'si') {
                await verPregunta();
                await foto('D1-ingreso');
            }
            if (resp === 'no') await clic('[data-fk="antes-no"]');
            await clic('[data-fk="hoja-ok"]', 400);
            const porConfirmar = await ev(`(() => { const i = P.st.ingresos.find((x) => x.nombre === 'Remesa'); return MOTOR.ocurrenciasIngreso(P.st, i, '2026-10-01', '2026-11-30').map((o) => o.fecha + ':' + o.estado); })()`);
            const n1 = await numeros();
            notas['D1' + resp] = { porConfirmar, antes: n0.libre, despues: n1.libre };
            if (resp === 'si') check('«Sí»: la siguiente es la del 10 nov', porConfirmar, ['2026-11-10:esperado']);
            else check('«No»: la del 10 oct por confirmar', porConfirmar, ['2026-10-10:porConfirmar', '2026-11-10:esperado']);
            check(`${resp}: el libre no cambia (un ingreso suma cuando llega)`, n1.libre, n0.libre);
            await ev(`P.irTab('hoy'); true`);
            await esperar(300);
            const aviso = await texto('.aviso-hoy');
            if (resp === 'no') check('«No»: Hoy pregunta si ya llegó', aviso, (t) => typeof t === 'string' && t.includes('¿Ya llegó lo de'));
            else check('«Sí»: Hoy no pregunta', aviso === null || !aviso.includes('Remesa'), true);
        }
    });
    await seccion('D2 Primer día: la quincena del 15, registrada el 19', async () => {
        await primerDia('2026-10-19', { quincena: 'si', foto: 'D2' });
        check('la pregunta del ingreso', notas['quincena-2026-10-19'], 'La del 15 de octubre, ¿ya te llegó?');
        const n0 = await numeros();
        check('«Sí»: hasta tu quincena del 30', await texto('.portada-h'), (t) => /quincena del 30/.test(t));
        await primerDia('2026-10-19', { quincena: 'no' });
        check('«No»: falta confirmar la del 15', await texto('.portada-b'), (t) => t.includes('Libre por ahora') && t.includes('Falta confirmar tu quincena del 15'));
        notas.D2 = { si: n0, no: await numeros() };
        check('«No»: no se vuelve a preguntar al abrir', await ev('P.modos.casosAntes().length'), 0);
    });
}

// ================================================================ E) El caso exacto de la tester
if (partes.includes('e')) {
    await seccion('E el caso de la tester (19 oct, tarjeta, pago estimado, día 14)', async () => {
        await primerDia('2026-10-19', { tarjeta: { corte: '25', pago: '14', usual: '100' }, foto: 'E-tarjeta-pregunta' });
        check('la pregunta en el Primer día', notas['tarjeta-pregunta-2026-10-19'], 'El de octubre (14 oct), ¿ya lo pagaste?');
        const n = await numeros();
        notas.E = n;
        check('libre: $950 + $50 − ~$100 de lo que pagas normalmente (para el 14 nov)', [n.tienes, n.enTarjetas, n.libre], [100000, 10000, 90000]);
        check('Hoy: «vence el 14 nov», nunca «venció el 14»', await texto('.portada-b'), (t) => t.includes('Incluye tarjeta ~$100, vence el 14 nov') && !/venció/.test(t));
        await foto('E-hoy');
        check('Pagos: su pago el 14 nov', await ocTarjeta('Crédito BAC'), ['2026-11-14:pendiente:10000']);
        check('Mes: octubre no cuenta ese pago', await ev(`MOTOR.pagosDelMes(P.st, 2026, 10).pagos`), 0);
        await clic('[data-fk="portada"]', 400);
        check('desglose: «vence el 14 nov»', await texto('.hoja'), (t) => t.includes('lo que pagas normalmente, vence el 14 nov') && !t.includes('14 oct'));
        await ev('P.cerrarHoja(); true');
        await ev(`P.irTab('midinero'); P.abrir('tarjeta', P.st.tarjetas[0].id); true`);
        await esperar(400);
        check('ficha: «vence el 14 nov»', await texto('.pg'), (t) => t.includes('Lo que pagas normalmente · vence el 14 nov') && !t.includes('14 oct'));
        check('sin revisión al abrir (nada de antes se cuenta)', await ev('P.modos.casosAntes().length'), 0);
        // «No, todavía lo debo»: el del 14 oct sí se cuenta (y la app dice que venció).
        await primerDia('2026-10-19', { tarjeta: { corte: '25', pago: '14', usual: '100', antes: 'no' } });
        check('«No»: vencido el 14 oct', await ocTarjeta('Crédito BAC'), ['2026-10-14:vencido:10000']);
        check('«No»: Hoy dice que venció', await texto('.portada-b'), (t) => t.includes('Incluye tarjeta ~$100, venció el 14'));
    });
}

// ================================================================ F) V2-86: quienes ya usan la app
if (partes.includes('f')) {
    // La v2.6.5 tal como se publicó (de git), por file://.
    const vieja = await mkdtemp(path.join(os.tmpdir(), 'pamplanea-v265-'));
    await writeFile(path.join(vieja, 'v.tar'), execSync(`git archive --format=tar ${ref}`, { cwd: root, maxBuffer: 1 << 28 }));
    execSync('tar -xf v.tar', { cwd: vieja });
    const urlVieja = pathToFileURL(vieja).href + '/telefono.html#tema=' + tema;
    const guardado = () => ev(`JSON.parse(localStorage.getItem('pamplanea-uso:v1'))`);
    const conDatosDe = async (uso, modo = 'uso') => {
        await abrirApp();
        await ev(`(() => { P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-uso:v1', ${js(JSON.stringify(uso))}); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: ${js(modo)}, notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, cuentas: true, ahorros: true, deudas: true } })); return true; })()`);
        await abrirApp();
    };
    /** En la v2.6.5: el Primer día del 19 de octubre y lo que la tester agregó ese día. Devuelve lo guardado. */
    async function enLaVieja(agregar) {
        await fecha('2026-10-19');
        await abrirApp(urlVieja);
        // Que la página no vuelva a guardar lo que tiene en memoria al salir (como en las demás pruebas).
        await ev('P.sinGuardar = true; localStorage.clear(); true');
        await abrirApp(urlVieja);
        check('la vieja es la v2.6.5', await ev('window.VERSION_PROTOTIPO'), (v) => /2\.6\.5/.test(v));
        await entrarAlPrimerDia();
        await escribir('#ob-nombre', 'Marta');
        await clic('[data-fk="ob-empezar"]');
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', '600');
        await clic('[data-fk="ob-sig"]');
        await escribir('#ob-efectivo', '50');
        await clic('[data-fk="ob-banco-Agrícola"]');
        await escribir('#ob-banco-monto', '950');
        for (let i = 0; i < 4; i++) await clic('[data-fk="ob-sig"]');
        await esperar(300);
        await clic('[data-fk="pn-listo"]');
        await agregar();
        await ev('P.guardarYa(); true');
        await esperar(300);
        return guardado();
    }
    const tarjetaConEstado = async () => {
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
        await esperar(300);
        await escribir('#f-nombre', 'Crédito Agrícola');
        await escribir('#f-corte', '25');
        await escribir('#f-pagoDia', '14');
        await escribir('#f-ecTotal', '100');
        await clic('[data-fk="deuda-ok"]', 400);
    };
    const prestamoVencido = async () => {
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        await clic('[data-fk="np-otro"]');
        await escribir('#f-nombre', 'Préstamo de mi tía');
        await escribir('#f-monto', '40');
        await clic('[data-fk="dia-dia-14"]');
        await clic('[data-fk="np-atrasado"]');
        await clic('[data-fk="hoja-ok"]', 400);
    };
    const tarjetaEstimada = async () => {
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
        await esperar(300);
        await escribir('#f-nombre', 'Crédito BAC');
        await escribir('#f-corte', '25');
        await escribir('#f-pagoDia', '14');
        await escribir('#f-usualNueva', '100');
        await clic('[data-fk="deuda-ok"]', 400);
    };
    const tarjetaCard = () => texto('.aviso-antes');
    let afectada = null;
    await seccion('F0 datos de la v2.6.5 afectados (tarjeta con su estado de cuenta, préstamo «ya venció», tarjeta estimada)', async () => {
        afectada = await enLaVieja(async () => {
            await tarjetaConEstado();
            await prestamoVencido();
            await tarjetaEstimada();
        });
        await abrirApp(urlVieja);
        notas.F0vieja = { libre: await texto('.portada-n'), portada: await texto('.portada-b') };
        check('en la v2.6.5: el del 14 oct como vencido (el error)', notas.F0vieja.portada, (t) => /venció el 14/.test(t));
        await foto('F0-v265-antes');
    });
    await seccion('F1 al abrir la v2.6.6: la revisión (casos a, c y d)', async () => {
        await fecha('2026-10-19');
        await conDatosDe(afectada);
        const n0 = await numeros();
        const casos = await ev('P.modos.casosAntes().map((c) => [c.tipo, c.nombre, c.fecha, c.monto])');
        notas.F1casos = casos;
        check('detecta: la tarjeta con su estado de cuenta (d) y el préstamo (a); la estimada (c) ya cuenta el 14 nov', casos, [['pago', 'Préstamo de mi tía', '2026-10-14', 4000], ['tarjeta', 'Crédito Agrícola', '2026-10-14', 10000]]);
        check('una sola tarjeta en Hoy', await ev(`document.querySelectorAll('.aviso-antes').length`), 1);
        check('el título', await texto('#ra-t'), 'Revisemos unos pagos de antes de que empezaras');
        check('cada caso con su fecha y su monto', await ev(`[...document.querySelectorAll('.antes-caso')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())`), (x) => x.length === 2 && x[1].includes('Crédito Agrícola') && x[1].includes('venció el 14 oct') && x[1].includes('$100.00') && x[1].includes('Sí, ya lo pagué') && x[1].includes('No, lo debo') && x[0].includes('Préstamo de mi tía') && x[0].includes('$40.00'));
        check('«Ya pagué todos» y «Ahora no»', [await hay('[data-fk="antes-todos"]'), await hay('[data-fk="antes-ahora-no"]')], [true, true]);
        check('el aviso de vencidos no los repite (sin «Pagado» para lo de antes)', await texto('.aviso-hoy'), (t) => t === null || !/Crédito Agrícola|Préstamo de mi tía/.test(t));
        check('nada cambió solo (lo guardado sigue igual)', JSON.stringify((await guardado()).st.tarjetas) === JSON.stringify(afectada.st.tarjetas) && JSON.stringify((await guardado()).st.pagos) === JSON.stringify(afectada.st.pagos), true);
        notas.F1 = n0;
        await foto('F1-revision');
        await ev(`document.querySelector('.aviso-antes').scrollIntoView(); true`);
        // «Sí, ya lo pagué» en la tarjeta: el libre se corrige y se dice.
        await clic('[data-fk="antes-si-t:' + (await ev('P.st.tarjetas[0].id')) + ':2026-09-25"]', 400);
        const n1 = await numeros();
        notas.F1si = n1;
        check('«Sí»: el libre sube $100', n1.libre - n0.libre, 10000);
        const [d0, d1] = [await ev(`MOTOR.dinero(${n0.libre})`), await ev(`MOTOR.dinero(${n1.libre})`)];
        notas.F1texto = await texto('.antes-cambio');
        check('«Tu libre pasó de $X a $Y»', notas.F1texto, (t) => typeof t === 'string' && t.includes(`Tu libre pasó de ${d0} a ${d1}`) && t.includes('Deshacer'));
        check('copia interna antes de corregir (con la tarjeta sin contestar)', await ev(`(() => { const c = JSON.parse(localStorage.getItem('pamplanea-uso:respaldo-antes-de-empezar')); return !!c && !c.st.tarjetas[0].estados.at(-1).antes; })()`), true);
        await foto('F1-si');
        // «Deshacer»: las respuestas vuelven atrás, pero lo anotado después de contestar se queda.
        await ev(`(() => { P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'pupusas 5'; q.dispatchEvent(new Event('input', { bubbles: true })); P.acciones.anotarGuardar(); return true; })()`);
        await esperar(400);
        await ev(`P.irTab('hoy'); true`);
        await esperar(300);
        await clic('[data-fk="antes-deshacer"]', 400);
        check('«Deshacer»: el libre de antes (menos las pupusas) y el caso otra vez', [n0.libre - (await numeros()).libre, await ev('P.modos.casosAntes().length')], [500, 2]);
        check('«Deshacer»: las pupusas se quedan', await ev(`P.st.registros.some((r) => r.nombre === 'Pupusas' && r.monto === 500)`), true);
        // «No, lo debo» en el préstamo: queda contado y no se vuelve a preguntar.
        await clic('[data-fk="antes-no-p:' + (await ev(`P.st.pagos.find((p) => p.nombre === 'Préstamo de mi tía').id`)) + ':2026-10-14"]', 400);
        check('«No»: el libre igual (con las pupusas de $5 que se quedaron)', (await numeros()).libre, n0.libre - 500);
        check('«No»: queda solo la tarjeta', await ev('P.modos.casosAntes().map((c) => c.nombre)'), ['Crédito Agrícola']);
        await ev('P.guardarYa(); true');
        // «Ahora no»: se oculta hasta la próxima apertura.
        await clic('[data-fk="antes-ahora-no"]', 300);
        check('«Ahora no»: oculta', await hay('.aviso-antes'), false);
        await ev('P.sinGuardar = false; P.guardarYa(); true');
        await abrirApp();
        check('al volver a abrir: otra vez (sin el préstamo contestado)', [await hay('.aviso-antes'), await ev('P.modos.casosAntes().map((c) => c.nombre)')], [true, ['Crédito Agrícola']]);
        await clic('[data-fk="antes-si-t:' + (await ev('P.st.tarjetas[0].id')) + ':2026-09-25"]', 400);
        check('al contestar todo: «Listo» con el cambio y «Deshacer»', await texto('.aviso-antes'), (t) => t.includes('Listo, revisamos tus pagos de antes') && t.includes('Tu libre pasó de') && t.includes('Deshacer'));
        await foto('F1-listo');
        await ev('P.guardarYa(); true');
        await esperar(300);
        await abrirApp();
        check('lo contestado no se vuelve a preguntar', [await hay('.aviso-antes'), await ev('P.modos.casosAntes().length')], [false, 0]);
        check('la estimada: «vence el 14 nov» y nada de octubre', await ocTarjeta('Crédito BAC'), ['2026-11-14:pendiente:10000']);
    });
    await seccion('F2 «Ya pagué todos»', async () => {
        await fecha('2026-10-19');
        await conDatosDe(afectada);
        const n0 = await numeros();
        await clic('[data-fk="antes-todos"]', 400);
        const n1 = await numeros();
        notas.F2 = { antes: n0, despues: n1 };
        check('los dos: el libre sube $140', n1.libre - n0.libre, 14000);
        check('nada por revisar', await ev('P.modos.casosAntes().length'), 0);
        check('el préstamo: lo de octubre no cuenta, el siguiente el 14 nov', await ocurrencias('Préstamo de mi tía'), (x) => x[0] === '2026-11-14:pendiente');
        check('sin gastos nuevos (no se anotó un pago que ya había salido)', (await ev('P.st.registros.length')) === afectada.st.registros.length, true);
        check('Mes: octubre sin esos pagos', await ev(`MOTOR.pagosDelMes(P.st, 2026, 10).pagos`), 0);
        await clic('[data-fk="antes-deshacer"]', 400);
        check('«Deshacer» los dos', [(await numeros()).libre, await ev('P.modos.casosAntes().length')], [n0.libre, 2]);
    });
    await seccion('F3 ingreso por llegar de antes de empezar (b) y en Ancla oscuro', async () => {
        // Un ingreso que la app contaba «por llegar» desde antes de empezar (datos guardados por una versión anterior).
        const u = structuredClone(afectada);
        u.st.ingresos.push({ id: 'remesaX', nombre: 'Remesa', emoji: '🌎', categoria: 'remesa', monto: 15000, aprox: true, frecuencia: 'mensual', dia: 10, lugar: 'efectivo', principal: false, extra: true, desde: '2026-10-01', llegadas: {} });
        await fecha('2026-10-19');
        await conDatosDe(u);
        check('detecta el ingreso', await ev(`P.modos.casosAntes().filter((c) => c.tipo === 'ingreso').map((c) => [c.nombre, c.fecha])`), [['Remesa', '2026-10-10']]);
        check('sus respuestas', await ev(`[...document.querySelectorAll('[data-fk^="antes-si-i:"], [data-fk^="antes-no-i:"]')].map((e) => e.textContent.trim())`), ['No, todavía no', 'Sí, ya me llegó']);
        await clic('[data-fk="antes-si-i:remesaX:2026-10-10"]', 400);
        check('«Sí, ya me llegó»: ya no está por llegar (y no suma otra vez)', await ev(`MOTOR.ocurrenciasIngreso(P.st, MOTOR.ingreso(P.st, 'remesaX'), '2026-10-01', '2026-11-30').map((o) => o.fecha + ':' + o.estado)`), ['2026-11-10:esperado']);
        check('un ingreso no cambia el libre: «Tu libre sigue en…»', await texto('.antes-cambio'), (t) => typeof t === 'string' && t.includes('Tu libre sigue en'));
        await ev(`P.aplicarTema('ancla-oscuro'); true`);
        await esperar(200);
        await ev(`document.querySelector('.aviso-antes').scrollIntoView(); true`);
        await foto('F3-revision-ancla-oscuro');
    });
    await seccion('F4 sin problemas: no ve nada; candado V2-79', async () => {
        await fecha('2026-10-21');
        const s = await ev(`(() => { const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21', inicio: '2026-10-01' }); return s; })()`);
        await conDatosDe({ esquema: 2, creado: '2026-10-01T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] });
        check('Marta (con la luz del 12 vencida después de empezar): sin revisión', [await hay('.aviso-antes'), await ev('P.modos.casosAntes().length')], [false, 0]);
        check('la luz vencida sigue en su aviso de siempre', await texto('.aviso-hoy'), (t) => typeof t === 'string' && /Luz/.test(t));
        const errores0 = await ev('P.modos.errores.length');
        await ev(`(() => { const r = DATOS.crearRosa(); P.st = r; P.modos.guardarUso(); return true; })()`);
        check('candado: un ejemplo no se guarda como tus datos', [await ev('P.modos.errores.length') - errores0, (await guardado()).st.nombre], [1, 'Marta']);
    });
    await rm(vieja, { recursive: true, force: true }).catch(() => null);
}

// ================================================================ G) Editar el día de un pago existente
if (partes.includes('g')) {
    await seccion('G1 un pago del 25 (agregado el 10) que pasa al 14, el 19', async () => {
        await primerDia('2026-10-10');
        await nuevoPago({ dia: 25 });
        await clic('[data-fk="hoja-ok"]', 400);
        await ev('P.guardarYa(); true');
        await fecha('2026-10-19');
        await ev('P.sinGuardar = false; P.guardarYa(); true');
        await esperar(300);
        await abrirApp();
        const n0 = await numeros();
        const id = await ev(`P.st.pagos.find((p) => p.nombre === 'Gimnasio').id`);
        await ev(`P.abrirHoja('editarPago', { id: ${js(id)} }); true`);
        await esperar(300);
        await clic('[data-fk="dia-dia-14"]');
        check('pregunta por el del 14 oct', await pregunta(), 'El de octubre (14 oct), ¿ya lo pagaste?');
        await clic('[data-fk="hoja-ok"]', 400);
        check('«Sí»: ningún vencido; el siguiente el 14 nov', await ocurrencias('Gimnasio', '2026-10-01'), (x) => x[0] === '2026-11-14:pendiente');
        check('el libre igual', (await numeros()).libre, n0.libre);
    });
    await seccion('G2 un vencido de verdad que cambia de día sigue vencido (sin pregunta)', async () => {
        await fecha('2026-10-21');
        const s = await ev(`(() => { const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21', inicio: '2026-10-01' }); return s; })()`);
        await abrirApp();
        await ev(`(() => { P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-01T08:00:00.000Z', st: ${js(s)}, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] })); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, cuentas: true, ahorros: true, deudas: true } })); return true; })()`);
        await abrirApp();
        const n0 = await numeros();
        await ev(`P.abrirHoja('editarPago', { id: 'luz' }); true`);
        await esperar(300);
        await clic('[data-fk="dia-dia-14"]');
        check('sin pregunta (la de octubre ya se debía)', await hay('#antes-t'), false);
        await clic('[data-fk="hoja-ok"]', 400);
        check('la luz: vencida el 14 oct', await ocurrencias('Luz', '2026-10-01'), (x) => x[0] === '2026-10-14:vencido');
        check('el libre igual', (await numeros()).libre, n0.libre);
    });
}

// El candado (F4) deja su error a propósito en la consola (como en v264.mjs); cualquier otro error cuenta.
const errores = b.errores.filter((e) => !/PamPlanea: candado/.test(e));
const informe = { checks, fallos, notas, errores, candado: b.errores.length - errores.length, fallidas: b.fallidas.filter((f) => !/ERR_FILE_NOT_FOUND.*favicon/.test(f)) };
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ checks, fallan: fallos.length, fallos, errores, candado: informe.candado }, null, 1));
b.cerrar();
process.exit(fallos.length || errores.length ? 1 : 0);
