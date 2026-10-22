// PRUEBA v2.7 (A07): las invariantes del dinero, con el código real de la app (las mismas hojas y acciones que usa la
// persona). Montos en centavos enteros, nunca float. Cada fila es una prueba con su nombre; si una fila falla, las demás
// siguen. Las filas del brief:
//  I01 cuadrar y luego detallar: el saldo no cambia y Mes no se duplica (D-8, F01)
//  I02 corregir un ingreso: el mismo monto en saldo, movimiento y calendario (F15)
//  I03 abonar a una deuda inicial: baja la deuda (D-7, F02) · I03b una compra de antes de «lo que debo hoy» no lo sube (F03)
//  I04 cambiar el banco de un medio: no traslada compras viejas (F04, DATOS-3)
//  I05 pagar $50 de $100: quedan $50 pendientes (D-6, F12), por el formulario, por Anotar y corrigiendo en Mes
//  I06 segundo estado de cuenta: no inventa pagos (F11)
//  I07 abono el día del corte: se aplica a la deuda correcta (F10)
//  I08 la misma operación por Anotar, formulario, Mes o Pongámonos al día: el mismo resultado
//  I09 copia dañada o de versión futura: no toca los datos (DATOS-2, A04, F20)
//  I10 corregir un gasto pagado con ahorro: cambian juntos el gasto y el ahorro (F16)
//  I11 mover entre cuentas: el total se conserva
//  I12 sin espacio para la copia por versión: quedan la original y las 2 más recientes, y se avisa (DATOS-1)
// Y una fila por cada arreglo de la Parte B que no está arriba: F13, F14, F17, F21, F22, F23.
// Y P3: la nota del cuadre en Anotar (P-3): antes, el mismo día (con cada respuesta) y después.
// v2.8 «Más claro», una fila por cada parte 2 a 9 de E1 (y la de los datos):
//  V2 el ejemplo de Libre de 01 §23.2 (D-3): $385, pupusas → $365, súper → sigue en $385
//  V3 ahorros (C-1): dentro / aparte, «Ya lo guardé», «Usé de mi ahorro»; usar parte deja el resto (D-9, U16)
//  V4 gastos variables (C-3): tope por quincena, consumo sin restar dos veces, «¿Ya terminaste?», «Te pasaste»
//  V5 tarjeta con una sola regla (D-4, U01) y cobros con tarjeta dentro de su pago (C-7)
//  V6 «¿Qué día vence tu próximo pago?» (D-5, F09)
//  V7 la cuota termina sola en $0 con aviso y «Me prestaron» en un paso (D-9)
//  V8 «¿Es tu quincena?» a ±10 % y ±3 días (C-5) y «recibí 50 en efectivo» → Efectivo
//  V9 anotar un pago se conecta con tu plan (C-4, P-1)
//  V10 tus datos de la v2.7 en la v2.8 (DATOS-1 a 5, C-1)
//  V11 «no asumir» (APROBADO por Victor, 2026-10-22): cada ahorro de antes pregunta en qué cuenta está; «Aparte» sube tu libre
//  V12 «¿Con qué lo pagas?» (APROBADO por Victor, 2026-10-22): un gasto fijo nunca recibe una cuenta que la persona no eligió
// Ajuste 2 (APROBADO por Victor, 2026-10-22):
//  V13 un salario anotado por «Me llegó dinero» nunca se cuenta dos veces (C-5 reforzado)
//  V14 mover en Anotar: nunca a la misma cuenta
//  V15 D-2 corregida (fijo o variable no se decide por el monto), decisión 24 y «¿Cómo es?»
//  V16 «Pagué una deuda»: primero y solo «¿Cuál deuda pagaste?»
// Ajuste 3 «Formularios claros» (APROBADO por Victor, 2026-10-22):
//  V17 FM-1 nada duplicado · V18 FM-2 «+ Ingreso» nunca ofrece Salario · V19 FM-3 «Es mi quincena → Ya llegó» no duplica
//  V20 FM-5 archivar una categoría no cambia montos ni historial · V21 FM-7 «Gasté» en un gasto variable lo consume
// Ajuste 4 (APROBADO por Victor, 2026-10-22): V22 «¿En qué?» sin nombres repetidos · V23 «Gasté» sin texto no trae nada elegido
// Ajuste 5 «Mi plan más ligero» (APROBADO por Victor, 2026-10-22): V24 «Tu libre» de Mi plan = Hoy · V25 nada se pierde
//  frente al Mi plan de 509aef4 (y recuerda la vista) · V26 «+ Agregar» abre los 6 formularios
// Uso: node herramientas/invariantes.mjs [--base=http://…/] [--puerto=9961] [--solo=I01,F13] [--raiz=<otra copia>]
//      (--raiz: las mismas filas sobre otra copia, por ejemplo la v2.6.7 sacada de git, para ver cuáles fallaban antes)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const root = args.raiz ? path.resolve(args.raiz) : aqui;
const base = args.base || pathToFileURL(root).href + '/';
const solo = args.solo ? new Set(args.solo.split(',')) : null;
const salida = path.join(aqui, 'capturas', 'invariantes' + (args.base ? '-servida' : '') + (args.raiz ? '-raiz' : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9961) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const filas = [];
const fallos = [];
let fila = null;
const check = (nombre, real, esperado) => {
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    fila.checks.push({ nombre, ok, ...(ok ? {} : { real: typeof real === 'string' ? real.slice(0, 300) : JSON.stringify(real).slice(0, 300), esperado: typeof esperado === 'function' ? '(condición)' : JSON.stringify(esperado) }) });
    if (!ok) fallos.push(`${fila.id} · ${nombre}: ${typeof real === 'string' ? real.slice(0, 300) : JSON.stringify(real).slice(0, 300)}`);
    return ok;
};
const entero = (x) => Number.isInteger(x);
const contiene = (t) => (x) => typeof x === 'string' && x.includes(t);
const clic = async (sel, espera = 200) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(espera);
};
const escribir = async (sel, v) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(60);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const foto = (n) => b.captura(path.join(salida, n + '.png'));

// La app por file://, con la fecha del teléfono fija (21 oct 2026). Las filas cargan su estado con P.cargar (sin guardar).
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html');
    await esperar(500);
    await ev(PRELUDIO);
}
/** En la página: un estado propio («Marta», 21 oct) y cómo anotar como la persona. */
const PRELUDIO = `(() => {
    window.__armar = (mod) => {
        const st = { persona: 'uso', nombre: 'Marta', espacio: 'Mi casa', hoy: '2026-10-21', inicio: '2026-10-01', configurado: true, horizonteVariable: null,
            lugares: [
                { id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵', cuadre: { fecha: '2026-10-01', seq: 1, monto: 10000 } },
                { id: 'banco', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦', cuadre: { fecha: '2026-10-01', seq: 2, monto: 100000 } },
                { id: 'banco2', tipo: 'banco', nombre: 'Banco Hipotecario', emoji: '🏦', cuadre: { fecha: '2026-10-01', seq: 3, monto: 50000 } },
            ],
            medios: [
                { id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' },
                { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'banco', tarjetaDebito: true },
                { id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: 'banco' },
            ],
            tarjetas: [], apartados: [], logros: [], pagos: [],
            ingresos: [{ id: 'quincena', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: 60000, aprox: true, frecuencia: 'quincenal', dias: [15, 30], lugar: 'banco', principal: true, desde: '2026-10-01', llegadas: { '2026-10-15': { monto: 60000 } } }],
            registros: [
                { id: 'r1', seq: 1, tipo: 'cuadre', fecha: '2026-10-01', lugar: 'efectivo', monto: 10000, esperado: 10000, primero: true },
                { id: 'r2', seq: 2, tipo: 'cuadre', fecha: '2026-10-01', lugar: 'banco', monto: 100000, esperado: 100000, primero: true },
                { id: 'r3', seq: 3, tipo: 'cuadre', fecha: '2026-10-01', lugar: 'banco2', monto: 50000, esperado: 50000, primero: true },
                { id: 'r4', seq: 4, tipo: 'ingreso', fecha: '2026-10-15', monto: 60000, nombre: 'Quincena', categoria: 'salario', emoji: '💼', lugar: 'banco', ingreso: 'quincena', ocurrencia: '2026-10-15' },
            ],
            avisos: [], reservasTarjeta: [], cerrados: [], reservas: [], seq: 10, interesInvitar: false };
        if (mod) mod(st);
        P.ui && P.ui.hoja && P.cerrarHoja({ sinFoco: true });
        P.cargar(st, { tab: 'hoy' });
        P.deshacer = [];
        return true;
    };
    window.__internet = (st, extra = {}) => st.pagos.push({ id: 'internet', nombre: 'Internet', emoji: '🌐', categoria: 'servicios', monto: 10000, estimado: false, frecuencia: 'mensual', dia: 20, medio: 'debito', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-01', creado: '2026-10-01', hechos: {}, previos: [], ...extra });
    window.__tarjeta = (st, extra = {}) => {
        st.tarjetas.push({ id: 't50', nombre: 'Crédito Cuscatlán', emoji: '💳', tipo: 'tarjeta', corte: 5, pagoDia: 25, cupo: null, interesesAnio: 0, desde: '2026-10-21', medio: 'debito', estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-11-25', inicial: true, esperarCorte: true }], ...extra });
        st.medios.push({ id: 'mt50', nombre: 'Crédito Cuscatlán', emoji: '💳', tarjeta: 't50' });
    };
    window.__anotar = (frase, ajustes = {}) => {
        P.acciones.anotar();
        const q = document.getElementById('anotar-q');
        q.value = frase;
        q.dispatchEvent(new Event('input', { bubbles: true }));
        for (const [campo, v] of Object.entries(ajustes)) P.acciones.anotarValor({ campo, v });
        P.acciones.anotarGuardar();
        return P.ui.hoja ? { abierta: true, errores: P.ui.hoja.errores, d: P.ui.hoja.d && P.ui.hoja.d.tipo } : { abierta: false };
    };
    window.__saldo = (id) => MOTOR.saldoLugar(P.st, id);
    window.__mes = () => { const r = MOTOR.resumenMes(P.st, 2026, 10); return { salio: r.salio, entro: r.entro, sinDetalleSalio: r.sinDetalleSalio, sinDetalleEntro: r.sinDetalleEntro }; };
    return true;
})()`;

async function filaDe(id, nombre, fn) {
    if (solo && !solo.has(id)) return;
    fila = { id, nombre, checks: [] };
    filas.push(fila);
    try {
        await fn();
    } catch (e) {
        fila.checks.push({ nombre: 'excepción', ok: false, real: e.message });
        fallos.push(`${id} · excepción: ${e.message}`);
        await foto('ERROR-' + id).catch(() => null);
    }
    fila.ok = fila.checks.every((c) => c.ok);
}

await abrirApp();

// ------------------------------------------------------------------ I01 (D-8, F01)
await filaDe('I01', 'Cuadrar a $80 y después detallar un gasto anterior de $20: saldo $80 y Mes con $20 de salidas, no $40', async () => {
    await ev(`__armar()`);
    await ev(`P.cambiar((s) => P.cuadrar(s, 'efectivo', 8000), { aviso: null }); true`);
    const tras = await ev(`({ saldo: __saldo('efectivo'), mes: __mes() })`);
    check('al cuadrar: $80 y $20 sin detalle', [tras.saldo, tras.mes.salio, tras.mes.sinDetalleSalio], [8000, 2000, 2000]);
    const r = await ev(`__anotar('ayer pupusas 20 efectivo')`);
    check('Anotar lo guardó', r.abierta, false);
    const fin = await ev(`({ saldo: __saldo('efectivo'), mes: __mes(), gasto: P.st.registros.filter((r) => r.tipo === 'gasto').map((r) => [r.fecha, r.monto]) })`);
    check('el gasto de ayer, $20', fin.gasto, [['2026-10-20', 2000]]);
    check('el saldo no cambia: $80', fin.saldo, 8000);
    check('Mes: $20 de salidas (no $40)', fin.mes.salio, 2000);
    check('ya no queda «sin detalle» (lo explicó el gasto)', [fin.mes.sinDetalleSalio, fin.mes.sinDetalleEntro], [0, 0]);
    check('montos en centavos enteros', [fin.saldo, fin.mes.salio].every(entero), true);
    await ev(`P.irTab('mes'); true`);
    check('Mes lo dice: el cuadre quedó explicado', await texto('#pantalla'), (t) => typeof t === 'string' && t.includes('explicado con lo que anotaste') && !t.includes('$20.00 sin detalle'));
});

// ------------------------------------------------------------------ I02 (F15)
await filaDe('I02', 'Corregir un ingreso de $600 a $500: el mismo monto en el saldo, el movimiento y el calendario', async () => {
    await ev(`__armar()`);
    const antes = await ev(`__saldo('banco')`);
    await ev(`P.abrirHoja('editarRegistro', { id: 'r4' }); true`);
    await escribir('#f-monto', '500');
    await ev(`P.acciones.editarRegistroOk(); true`);
    const r = await ev(`({ reg: P.st.registros.find((x) => x.id === 'r4').monto, llegada: P.st.ingresos[0].llegadas['2026-10-15'].monto, cal: MOTOR.ocurrenciasIngreso(P.st, P.st.ingresos[0], '2026-10-15', '2026-10-15')[0].monto, saldo: __saldo('banco') })`);
    check('movimiento $500', r.reg, 50000);
    check('su llegada (Pagos y la ficha del ingreso) $500', r.llegada, 50000);
    check('el calendario $500', r.cal, 50000);
    check('el saldo baja $100', antes - r.saldo, 10000);
});

// ------------------------------------------------------------------ I03 (D-7, F02) y I03b (F03)
await filaDe('I03', '«Debo hoy $2,000» y un abono de $100: la deuda queda en $1,900 (y el banco baja $100)', async () => {
    await ev(`__armar((st) => __tarjeta(st, { pagoUsual: 10000, debeInicial: 200000, debeDesde: { fecha: '2026-10-21', seq: 9 } }))`);
    const banco = await ev(`__saldo('banco')`);
    check('antes: debes $2,000', await ev(`MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).debeHoy`), 200000);
    await ev(`P.abrirHoja('pagado', { tipoPago: 'tarjeta', id: 't50' }); true`);
    await escribir('#f-monto', '100');
    await ev(`P.acciones.pagadoGuardar(); true`);
    const r = await ev(`({ debe: MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).debeHoy, banco: __saldo('banco'), estimado: MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).estimado })`);
    check('la deuda: $1,900', r.debe, 190000);
    check('el banco baja $100', banco - r.banco, 10000);
    check('y lo que pagas normalmente ya está pagado', r.estimado, 0);
    await ev(`P.abrir('tarjeta', 't50'); true`);
    check('la ficha lo dice', await texto('#pantalla'), contiene('$1,900'));
});
await filaDe('I03b', 'Una compra del 18, anterior a «debo hoy $2,000» (21 oct), no lo sube ni baja el libre', async () => {
    await ev(`__armar((st) => __tarjeta(st, { pagoUsual: 10000, debeInicial: 200000, debeDesde: { fecha: '2026-10-21', seq: 9 } }))`);
    const libre = await ev(`P.calc().libre`);
    const r0 = await ev(`__anotar('zapatos 50 crédito cuscatlán', { fecha: '2026-10-18' })`);
    check('Anotar lo guardó', r0.abierta, false);
    const r = await ev(`({ compra: P.st.registros.filter((r) => r.tipo === 'gasto').map((r) => [r.fecha, r.monto, r.medio]), debe: MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).debeHoy, libre: P.calc().libre })`);
    check('la compra quedó con la tarjeta', r.compra, [['2026-10-18', 5000, 'mt50']]);
    check('lo que debes sigue en $2,000', r.debe, 200000);
    check('el libre no cambia', r.libre, libre);
    await ev(`__anotar('pupusas 10 crédito cuscatlán')`);
    check('una compra de hoy (después) sí lo sube: $2,010', await ev(`MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).debeHoy`), 201000);
});

// ------------------------------------------------------------------ I04 (F04, DATOS-3)
await filaDe('I04', 'Cambiar la cuenta de un medio no mueve las compras viejas', async () => {
    await ev(`__armar()`);
    await ev(`__anotar('súper 20 débito')`);
    const antes = await ev(`({ a: __saldo('banco'), b: __saldo('banco2') })`);
    await ev(`P.abrirHoja('medio', { id: 'debito' }); true`);
    await clic('[data-fk="op-lugar-banco2"]');
    await ev(`P.acciones.medioOk(); true`);
    const r = await ev(`({ a: __saldo('banco'), b: __saldo('banco2'), lugarMedio: P.st.medios.find((m) => m.id === 'debito').lugar })`);
    check('el medio ahora sale del otro banco', r.lugarMedio, 'banco2');
    check('los saldos no cambian', [r.a, r.b], [antes.a, antes.b]);
    await ev(`__anotar('farmacia 5 débito')`);
    check('lo nuevo sí sale del otro banco', await ev(`({ a: __saldo('banco'), b: __saldo('banco2') })`), { a: antes.a, b: antes.b - 500 });
});

// ------------------------------------------------------------------ I05 (D-6, F12)
const parcial = async (como) => {
    const r = await ev(`(() => { const p = P.st.pagos[0]; const o = MOTOR.ocurrenciasPago(P.st, p, '2026-10-20', '2026-10-20')[0]; const k = P.calc(); return { estado: o.estado, monto: o.monto, parcial: o.parcial ? [o.parcial.pagado, o.parcial.falta, o.parcial.total] : null, enLibre: k.items.filter((x) => x.pago && x.pago.id === 'internet').map((x) => x.parte), pagado: P.st.registros.filter((x) => x.pago === 'internet').map((x) => x.monto) }; })()`);
    check(`${como}: quedan $50 pendientes (parcial)`, [r.estado, r.monto, r.parcial], ['vencido', 5000, [5000, 5000, 10000]]);
    check(`${como}: el libre cuenta lo que falta`, r.enLibre, [5000]);
    await ev(`P.irTab('pagos'); true`);
    // Ajuste 5 (punto 5): lo vencido está en «⚠ 1 por confirmar ›», que abre la lista con sus botones de siempre.
    check(`${como}: Mi plan dice «1 por confirmar»`, await texto('[data-fk="plan-por-confirmar"]'), '1 por confirmar');
    await ev(`P.abrir('porConfirmar'); true`);
    check(`${como}: «Por confirmar» dice «Parcial · faltan $50.00»`, await texto('#pantalla'), contiene('Parcial · faltan $50.00'));
    return r;
};
await filaDe('I05', 'Pagar $50 de una cuota de $100 deja $50 pendientes (formulario, Anotar y Mes)', async () => {
    await ev(`__armar((st) => __internet(st))`);
    await ev(`P.abrirHoja('pagado', { tipoPago: 'pago', id: 'internet', fecha: '2026-10-20' }); true`);
    await escribir('#f-monto', '50');
    check('el formulario avisa «Quedan $50.00 pendientes»', await texto('#pagado-vivo'), contiene('Quedan $50.00 pendientes'));
    await ev(`P.acciones.pagadoGuardar(); true`);
    await parcial('formulario');
    await ev(`P.acciones.pagado({ tipo: 'pago', id: 'internet', fecha: '2026-10-20' }); true`);
    await esperar(150);
    if (await ev(`!!P.ui.hoja`)) await ev(`P.acciones.pagadoGuardar(); true`);
    const fin = await ev(`MOTOR.ocurrenciasPago(P.st, P.st.pagos[0], '2026-10-20', '2026-10-20')[0]`);
    check('pagar lo que falta lo completa: pagado $100', [fin.estado, fin.monto], ['pagado', 10000]);
    // Por Anotar.
    await ev(`__armar((st) => __internet(st))`);
    // v2.8 (C-4, P-1): «¿Es tu pago de Internet?» — «Sí, es ese».
    const a = await ev(`__anotar('internet 50', { cualPlan: 'si' })`);
    check('Anotar lo guardó', a.abierta, false);
    await parcial('Anotar');
    // Corregir en Mes: $100 pagados que en realidad fueron $50.
    await ev(`__armar((st) => __internet(st))`);
    await ev(`P.cambiar((s) => P.marcarPagado(s, 'internet', '2026-10-20', { monto: 10000, medio: 'debito', fecha: '2026-10-20' }), { aviso: null }); true`);
    const reg = await ev(`P.st.registros.find((x) => x.pago === 'internet').id`);
    await ev(`P.abrirHoja('editarRegistro', { id: ${js(reg)} }); true`);
    await escribir('#f-monto', '50');
    await ev(`P.acciones.editarRegistroOk(); true`);
    await parcial('Mes');
});

// ------------------------------------------------------------------ I06 (F11)
await filaDe('I06', 'Un segundo estado de cuenta no marca el anterior como «pagado» sin abono', async () => {
    await ev(`__armar((st) => __tarjeta(st, { desde: '2026-09-01', estados: [{ corte: '2026-09-05', total: 19000, minimo: 2500, aPagar: 19000, opcion: 'total', vence: '2026-09-25' }] }))`);
    await ev(`P.abrirHoja('estadoCuenta', { id: 't50' }); true`);
    await escribir('#f-total', '250');
    await escribir('#f-minimo', '30');
    await ev(`P.acciones.ecSiguiente(); true`);
    await ev(`P.acciones.ecGuardar(); true`);
    const r = await ev(`MOTOR.ocurrenciasTarjeta(P.st, '2026-09-01', '2026-12-31').map((o) => [o.fecha, o.estado, o.monto])`);
    check('dos estados de cuenta', await ev(`P.st.tarjetas[0].estados.length`), 2);
    check('el de septiembre: sin pagar (pasó al siguiente), no «pagado»', r.find((x) => x[0] === '2026-09-25'), ['2026-09-25', 'arrastrado', 19000]);
    check('el nuevo: pendiente $250', r.find((x) => x[0] === '2026-11-25'), ['2026-11-25', 'pendiente', 25000]);
    check('ningún abono inventado', await ev(`P.st.registros.filter((x) => x.tipo === 'pagoTarjeta').length`), 0);
    await ev(`P.irTab('pagos'); P.ui.pagosVista = 'mes'; P.ui.pagosMes = '2026-09'; P.render(); true`);
    // Ajuste 5 (punto 6): una línea por fila; lo pagado lleva ✓ (y «Pagado» para el lector de pantalla).
    check('Pagos (septiembre) no lo da por pagado', await ev(`[...document.querySelectorAll('#pantalla .pl-fila')].filter((li) => li.innerText.includes('Crédito Cuscatlán')).map((li) => li.innerText.replace(/\\s+/g, ' '))`), (x) => Array.isArray(x) && x.length > 0 && x.every((t) => !t.includes('✓') && !t.includes('Pagado')));
});

// ------------------------------------------------------------------ I07 (F10)
await filaDe('I07', 'Un abono el mismo día del corte, anotado después del estado de cuenta, baja esa tarjeta', async () => {
    await ev(`__armar((st) => { st.seq = 70; __tarjeta(st, { desde: '2026-09-01', estados: [{ corte: '2026-10-05', total: 30000, minimo: 2500, aPagar: 30000, opcion: 'total', vence: '2026-10-25', seq: 60 }] }); })`);
    const banco = await ev(`__saldo('banco')`);
    await ev(`P.abrirHoja('pagado', { tipoPago: 'tarjeta', id: 't50' }); true`);
    await escribir('#f-monto', '200');
    await ev(`P.ui.hoja.cuando = '2026-10-05'; P.acciones.pagadoGuardar(); true`);
    const r = await ev(`(() => { const i = MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]); return { fecha: P.st.registros.find((x) => x.tipo === 'pagoTarjeta').fecha, pagado: i.pagado, porPagar: i.porPagarEstado, debe: i.debeTotal }; })()`);
    check('el abono es del 5 (día del corte)', r.fecha, '2026-10-05');
    check('el banco baja $200', banco - (await ev(`__saldo('banco')`)), 20000);
    check('y la tarjeta también: quedan $100 por pagar', [r.pagado, r.porPagar, r.debe], [20000, 10000, 10000]);
});

// ------------------------------------------------------------------ I08 (la misma operación por cuatro entradas)
await filaDe('I08', 'Pagar Internet ($100, venció el 20) por Anotar, el formulario, Mes o Pongámonos al día: el mismo resultado', async () => {
    const resultado = () => ev(`(() => { const k = P.calc(); const o = MOTOR.ocurrenciasPago(P.st, P.st.pagos[0], '2026-10-20', '2026-10-20')[0]; return { libre: k.libre, banco: __saldo('banco'), estado: o.estado, pagos: P.st.registros.filter((x) => x.pago === 'internet').map((x) => [x.monto, x.medio, x.lugar]), mes: __mes().salio }; })()`);
    const res = {};
    await ev(`__armar((st) => __internet(st))`);
    // v2.8 (C-4, P-1): Anotar pregunta «¿Es tu pago de Internet?»: la persona contesta «Sí, es ese».
    await ev(`__anotar('internet 100', { cualPlan: 'si' })`);
    res.anotar = await resultado();
    await ev(`__armar((st) => __internet(st))`);
    await ev(`P.abrirHoja('pagado', { tipoPago: 'pago', id: 'internet', fecha: '2026-10-20' }); true`);
    await escribir('#f-monto', '100');
    await ev(`P.ui.hoja.cuando = '2026-10-21'; P.acciones.pagadoGuardar(); true`);
    res.formulario = await resultado();
    await ev(`__armar((st) => __internet(st))`);
    await ev(`P.cambiar((s) => P.marcarPagado(s, 'internet', '2026-10-20', { monto: 12000, medio: 'debito', fecha: '2026-10-21' }), { aviso: null }); true`);
    const reg = await ev(`P.st.registros.find((x) => x.pago === 'internet').id`);
    await ev(`P.abrirHoja('editarRegistro', { id: ${js(reg)} }); true`);
    await escribir('#f-monto', '100');
    await ev(`P.acciones.editarRegistroOk(); true`);
    res.mes = await resultado();
    await ev(`__armar((st) => __internet(st))`);
    await ev(`P.abrir('aldia'); P.acciones.aldiaSiguiente(); P.acciones.aldiaPago({ k: 'p:internet:2026-10-20', v: 'pagado' }); P.acciones.aldiaSiguiente(); true`);
    const aldia = await resultado();
    // Pongámonos al día lo marca con su fecha (como dice la pantalla): el gasto es del 20, lo demás igual.
    res.aldia = aldia;
    check('Anotar: pagado, $100 del banco', [res.anotar.estado, res.anotar.pagos], ['pagado', [[10000, 'debito', 'banco']]]);
    check('el formulario = Anotar', res.formulario, res.anotar);
    check('corregir en Mes = Anotar', res.mes, res.anotar);
    check('Pongámonos al día = Anotar (libre, saldo, estado, pago y Mes)', res.aldia, res.anotar);
});

// ------------------------------------------------------------------ I09 (DATOS-2, A04, F20)
await filaDe('I09', 'Una copia dañada o de una versión futura no toca los datos', async () => {
    await ev(`__armar()`);
    const errores = await ev(`(() => { const st = structuredClone(P.st); const copia = (datos, extra = {}) => JSON.stringify({ app: 'pamplanea-prototipo', tipo: 'copia-uso', esquema: 2, version: 'Prototipo v2.6.7 · 2026-10-19', fecha: '2026-10-20T10:00:00Z', datos, ...extra }); const sinEstados = structuredClone(st); sinEstados.tarjetas = [{ id: 'tx', nombre: 'X', estados: [] }]; const monto = structuredClone(st); monto.registros[3].monto = 12.5; const ref = structuredClone(st); ref.ingresos[0].lugar = 'no-existe';
        return [P.modos.validarCopia('{roto'), P.modos.validarCopia(copia({ esquema: 2, st }, { esquema: 9 })), P.modos.validarCopia(copia({ esquema: 2, st, version: 'Prototipo v2.9.0 · 2026-12-01' })), P.modos.validarCopia(copia({ esquema: 2, st: sinEstados })), P.modos.validarCopia(copia({ esquema: 2, st: monto })), P.modos.validarCopia(copia({ esquema: 2, st: ref })), P.modos.validarCopia(copia({ esquema: 2, st }))].map((r) => r.error || 'ok'); })()`);
    check('JSON roto: se rechaza', errores[0], contiene('no se pudo leer'));
    check('esquema futuro: se rechaza', errores[1], contiene('versión más nueva'));
    check('versión futura: se rechaza', errores[2], contiene('versión más nueva'));
    check('una tarjeta sin estados de cuenta (F20): se rechaza', errores[3], contiene('dañada'));
    check('un monto que no es de centavos enteros: se rechaza', errores[4], contiene('dañada'));
    check('una referencia que no existe: se rechaza', errores[5], contiene('dañada'));
    check('la buena: sí', errores[6], 'ok');
    // Lo guardado dañado o de una versión futura: «Tus datos están a salvo» y nada se escribe.
    for (const [nombre, valor] of [['dañado', '{"esquema":2,"st":{"lugares":['], ['versión futura', JSON.stringify({ esquema: 2, version: 'Prototipo v2.9.0 · 2026-12-01', st: { persona: 'uso', configurado: true } })]]) {
        await ev(`P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true })); localStorage.setItem('pamplanea-uso:v1', ${js(valor)}); true`);
        await abrirApp();
        await esperar(300);
        const r = await ev(`({ h1: document.querySelector('#pantalla h1')?.innerText.trim(), nav: document.getElementById('nav').hidden, guardado: localStorage.getItem('pamplanea-uso:v1') })`);
        check(`${nombre}: «Tus datos están a salvo»`, r.h1, 'Tus datos están a salvo');
        check(`${nombre}: no se escribió nada`, r.guardado, valor);
        await ev(`P.render(); P.guardarYa(); true`);
        await esperar(300);
        check(`${nombre}: ni al volver a dibujar y guardar`, await ev(`localStorage.getItem('pamplanea-uso:v1')`), valor);
        await foto('I09-' + nombre.replace(/\s+/g, '-'));
    }
    await ev(`P.sinGuardar = true; localStorage.clear(); true`);
    await abrirApp();
});

// ------------------------------------------------------------------ I10 (F16)
await filaDe('I10', 'Corregir un gasto que salió de un ahorro: el gasto y el ahorro cambian juntos', async () => {
    await ev(`__armar((st) => st.apartados.push({ id: 'ap1', nombre: 'Útiles', emoji: '🐷', portada: 'general-alcancia', monto: 5000, meta: null, metaFecha: null, historial: [] }))`);
    // Ajuste 4 (punto 6, APROBADO por Victor 2026-10-22): «cuadernos» no dice en qué fue: se elige (Educación).
    const rI10 = await ev(`__anotar('cuadernos 20 efectivo', { usarApartado: 'ap1', enQue: 'educacion' })`);
    check('se guarda (con «¿En qué?» elegido)', rI10, (x) => x && !x.abierta);
    const antes = await ev(`({ ahorro: P.st.apartados[0].monto, libre: P.calc().libre })`);
    check('el ahorro baja a $30', antes.ahorro, 3000);
    const reg = await ev(`P.st.registros.find((x) => x.tipo === 'gasto').id`);
    await ev(`P.abrirHoja('editarRegistro', { id: ${js(reg)} }); true`);
    await escribir('#f-monto', '40');
    await ev(`P.acciones.editarRegistroOk(); true`);
    const r = await ev(`({ gasto: P.st.registros.find((x) => x.tipo === 'gasto').monto, usado: P.st.registros.find((x) => x.tipo === 'gasto').usadoApartado, ahorro: P.st.apartados[0].monto, libre: P.calc().libre })`);
    check('el gasto: $40, todo del ahorro', [r.gasto, r.usado], [4000, 4000]);
    check('el ahorro: $10', r.ahorro, 1000);
    check('el libre no cambia (salió del ahorro)', r.libre, antes.libre);
    // Con crédito: lo reservado para pagar la tarjeta es lo usado.
    await ev(`__armar((st) => { __tarjeta(st, { desde: '2026-09-01', estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-10-25' }] }); st.apartados.push({ id: 'ap1', nombre: 'Útiles', emoji: '🐷', portada: 'general-alcancia', monto: 5000, meta: null, metaFecha: null, historial: [] }); })`);
    // Ajuste 4 (punto 6): «mochila» no dice en qué fue: se elige (Otros).
    await ev(`__anotar('mochila 20 crédito cuscatlán', { usarApartado: 'ap1', enQue: 'otros' })`);
    const reg2 = await ev(`P.st.registros.find((x) => x.tipo === 'gasto').id`);
    await ev(`P.abrirHoja('editarRegistro', { id: ${js(reg2)} }); true`);
    await escribir('#f-monto', '35');
    await ev(`P.acciones.editarRegistroOk(); true`);
    check('con crédito: el ahorro $15 y lo reservado para la tarjeta $35', await ev(`[P.st.apartados[0].monto, (P.st.reservasTarjeta || []).map((x) => x.monto)]`), [1500, [3500]]);
});

// ------------------------------------------------------------------ I11
await filaDe('I11', 'Mover entre cuentas conserva el total (formulario y Anotar)', async () => {
    await ev(`__armar()`);
    const antes = await ev(`({ total: MOTOR.tienes(P.st), banco: __saldo('banco'), efectivo: __saldo('efectivo') })`);
    await ev(`P.abrirHoja('mover', { id: 'banco' }); true`);
    await escribir('#f-monto', '30');
    await clic('[data-fk="op-a-efectivo"]');
    await ev(`P.acciones.moverOk(); true`);
    await ev(`__anotar('pasé 20 de efectivo a banco')`);
    const r = await ev(`({ total: MOTOR.tienes(P.st), banco: __saldo('banco'), efectivo: __saldo('efectivo') })`);
    check('el total no cambia', r.total, antes.total);
    check('el banco: −$30 +$20', r.banco, antes.banco - 1000);
    check('el efectivo: +$30 −$20', r.efectivo, antes.efectivo + 1000);
});

// ------------------------------------------------------------------ F13 (D-6)
await filaDe('F13', '«Otro monto» puede ser menos que el mínimo (con aviso) y el mínimo no puede pasar del total', async () => {
    await ev(`__armar((st) => __tarjeta(st, { desde: '2026-09-01', estados: [{ corte: '2026-09-05', total: 19000, minimo: 2500, aPagar: 19000, opcion: 'total', vence: '2026-09-25' }] }))`);
    await ev(`P.abrirHoja('estadoCuenta', { id: 't50' }); true`);
    await escribir('#f-total', '1000');
    await escribir('#f-minimo', '2000');
    await ev(`P.acciones.ecSiguiente(); true`);
    check('mínimo $2,000 con total $1,000: no avanza', await ev(`P.ui.hoja.paso`), 1);
    check('y lo dice', await texto('#err-minimo'), contiene('El mínimo no puede ser mayor que el total'));
    await escribir('#f-minimo', '50');
    await ev(`P.acciones.ecSiguiente(); true`);
    check('paso 3', await ev(`P.ui.hoja.paso`), 3);
    await clic('[data-fk="ec-otro"]');
    check('«Otro monto» ya no dice «entre el mínimo y el total»', await texto('.hoja'), (t) => !t.includes('Entre el mínimo y el total'));
    await escribir('#f-otro', '1');
    check('$1: «Te faltan $49.00 para el mínimo»', await texto('#ec-otro-nota'), contiene('Te faltan $49.00 para el mínimo'));
    await ev(`P.acciones.ecGuardar(); true`);
    check('se guarda $1', await ev(`[P.ui.hoja === null, P.st.tarjetas[0].estados.at(-1).aPagar, P.st.tarjetas[0].estados.at(-1).opcion]`), [true, 100, 'otro']);
    check('y quedan $999 de deuda que no se apartan', await ev(`MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).resto`), 99900);
    // Pagar la tarjeta con menos del mínimo: se puede, con el aviso.
    await ev(`P.st.tarjetas[0].estados.at(-1).aPagar = 100000; P.st.tarjetas[0].estados.at(-1).opcion = 'total'; P.abrirHoja('pagado', { tipoPago: 'tarjeta', id: 't50' }); true`);
    await escribir('#f-monto', '20');
    check('«Pagar tarjeta» con $20: «Te faltan $30.00 para el mínimo»', await texto('#pagado-vivo'), contiene('Te faltan $30.00 para el mínimo'));
    await ev(`P.acciones.pagadoGuardar(); true`);
    check('y se guarda', await ev(`P.st.registros.filter((x) => x.tipo === 'pagoTarjeta').map((x) => x.monto)`), [2000]);
});

// ------------------------------------------------------------------ F14
await filaDe('F14', 'Se puede confirmar un estado de cuenta de $0', async () => {
    await ev(`__armar((st) => __tarjeta(st, { desde: '2026-09-01', estados: [{ corte: '2026-09-05', total: 19000, minimo: 2500, aPagar: 19000, opcion: 'total', vence: '2026-09-25' }] }))`);
    await ev(`P.abrirHoja('estadoCuenta', { id: 't50' }); true`);
    await escribir('#f-total', '0');
    await escribir('#f-minimo', '0');
    await ev(`P.acciones.ecSiguiente(); true`);
    const r = await ev(`(() => { const t = P.st.tarjetas[0]; const e = t.estados.at(-1); const i = MOTOR.tarjetaInfo(P.st, t); return { hoja: !!P.ui.hoja, n: t.estados.length, e: [e.corte, e.total, e.aPagar, !!e.inicial], porPagar: i.porPagarEstado, pedir: i.pedir, oc: MOTOR.ocurrenciasTarjeta(P.st, '2026-10-01', '2026-12-31').map((o) => o.fecha) }; })()`);
    check('se guardó (la hoja se cerró)', r.hoja, false);
    check('un estado de $0 del corte del 5 de octubre', [r.n, r.e], [2, ['2026-10-05', 0, 0, false]]);
    check('no hay nada que pagar ni se vuelve a pedir', [r.porPagar, r.pedir, r.oc], [0, false, []]);
    // Al agregar una tarjeta: «0» es un estado de cuenta (vacío no).
    await ev(`__armar()`);
    await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
    // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?»; «Otro» pide el nombre.
    await clic('[data-fk="op-banco-Otro"]');
    await escribir('#f-otroNombre', 'Visa');
    await escribir('#f-corte', '5');
    await escribir('#f-pagoDia', '25');
    await escribir('#f-ecTotal', '0');
    await escribir('#f-ecMinimo', '0');
    await ev(`P.acciones.nuevaDeudaOk(); true`);
    if (await ev(`!!P.ui.hoja`)) await ev(`P.acciones.nuevaDeudaOk(); true`);
    check('al agregar la tarjeta con $0: su estado de cuenta, no «sin estado»', await ev(`P.st.tarjetas.map((t) => [t.nombre, t.estados.length, !!t.estados[0].inicial, t.estados[0].total])`), [['Visa', 1, false, 0]]);
});

// ------------------------------------------------------------------ F17
await filaDe('F17', 'Pongámonos al día con una tarjeta sin estado de cuenta: nunca un abono de $0', async () => {
    const armar = `__armar((st) => __tarjeta(st, { desde: '2026-09-01', corte: 5, pagoDia: 15, pagoUsual: 10000, estados: [{ corte: '2026-09-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-10-15', inicial: true }] }))`;
    await ev(armar);
    const banco = await ev(`__saldo('banco')`);
    await ev(`P.abrir('aldia'); P.acciones.aldiaSiguiente(); true`);
    const clave = await ev(`document.querySelector('[data-a="aldiaPago"][data-v="pagado"]')?.dataset.k`);
    check('la tarjeta vencida está en «Tus pagos»', clave, 't:t50:2026-10-15');
    await ev(`P.acciones.aldiaPago({ k: ${js(clave)}, v: 'pagado' }); true`);
    check('propone lo mismo que «Pagar tarjeta»: $100.00', await ev(`document.getElementById('adt-t-t50-2026-10-15').value`), '100.00');
    await ev(`P.acciones.aldiaSiguiente(); true`);
    const r = await ev(`({ abonos: P.st.registros.filter((x) => x.tipo === 'pagoTarjeta').map((x) => [x.monto, x.lugar]), estimado: MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).estimado })`);
    check('un abono de $100 (no de $0), del banco', r.abonos, [[10000, 'banco']]);
    check('lo que pagas normalmente quedó pagado', r.estimado, 0);
    check('el banco baja $100', banco - (await ev(`__saldo('banco')`)), 10000);
    // Sin monto: se pregunta, no se guarda nada.
    await ev(armar);
    await ev(`P.abrir('aldia'); P.acciones.aldiaSiguiente(); P.acciones.aldiaPago({ k: ${js(clave)}, v: 'pagado' }); true`);
    await escribir('#adt-t-t50-2026-10-15', '');
    await ev(`P.acciones.aldiaSiguiente(); true`);
    check('sin monto: sigue en «Tus pagos» y lo pregunta', [await ev(`P.ui.stack.at(-1).paso`), await texto('.campo-error')], [2, 'Escribe cuánto pagaste']);
    check('y no hay abono', await ev(`P.st.registros.filter((x) => x.tipo === 'pagoTarjeta').length`), 0);
    check('P.pagarTarjeta con $0 no crea nada', await ev(`[P.pagarTarjeta(P.st, 't50', { monto: 0, lugar: 'banco', fecha: '2026-10-21' }), P.st.registros.filter((x) => x.tipo === 'pagoTarjeta').length]`), [null, 0]);
});

// ------------------------------------------------------------------ F21
await filaDe('F21', 'Sin hora ni «Notificación y correo»; apagar los avisos los apaga de verdad', async () => {
    await ev(`__armar((st) => __internet(st, { dia: 22 }))`);
    await ev(`P.abrir('pago', 'internet'); true`);
    const ficha = await texto('#pantalla');
    check('la ficha no promete hora ni notificación ni correo', ficha, (t) => !/8:00|Notificación y correo/.test(t) && t.includes('Te avisamos al abrir la app'));
    await ev(`P.irTab('hoy'); true`);
    check('prendidos: «Mañana: Internet»', await ev(`P.atencion(P.calc()).map((x) => x.titulo)`), (x) => x.some((t) => t.includes('Mañana')));
    await ev(`P.abrir('pago', 'internet'); true`);
    await clic('[data-a="avisoSwitch"][data-i="0"]');
    await clic('[data-a="avisoSwitch"][data-i="1"]');
    check('apagados en la ficha', await ev(`P.st.pagos[0].avisos.map((a) => a.on)`), [false, false]);
    check('Hoy ya no avisa', await ev(`P.atencion(P.calc()).map((x) => x.titulo)`), (x) => !x.some((t) => t.includes('Internet')));
    check('ni la lista de avisos al abrir', await ev(`P.modos.avisosAlAbrir().map((a) => a.titulo)`), []);
    await ev(`P.irTab('hoy'); P.abrir('avisos'); true`);
    check('«Avisos» no promete notificaciones ni correo', await texto('#pantalla'), (t) => !/Correo de respaldo|Notificación de la app|8:00/.test(t));
});

// ------------------------------------------------------------------ F22
await filaDe('F22', 'El texto de privacidad dice exactamente qué se tapa', async () => {
    await ev(`__armar(); P.ayuda.abrir('contar'); true`);
    await esperar(200);
    const t = await texto('.ay');
    check('dice que tapa los números y los nombres', t, contiene('los números salen como [monto] y los nombres de tus cosas como [nombre]'));
    check('y que un monto con letras no se tapa', t, contiene('Un monto escrito con letras, como «dos mil», no se tapa'));
    check('ya no promete tapar «alguno» de cualquier forma', t, (x) => !x.includes('Si escribes alguno en lo que cuentas, lo tapo'));
    check('así se comporta: cifras tapadas, letras no', await ev(`P.modos.sinDatosFinancieros('Debo 2,000 y pago ciento cincuenta')`), 'Debo [monto] y pago ciento cincuenta');
    await ev(`P.ayuda.cerrar(); true`);
});

// ------------------------------------------------------------------ F23
await filaDe('F23', 'aria-pressed siempre "true" o "false" (Primer día, gastos fijos sin elegir, y los formularios)', async () => {
    await ev(`(() => { const st = DATOS.crearNueva(); Object.assign(st, { persona: 'uso', hoy: '2026-10-21' }); P.cargar(st, { tab: 'hoy' }); P.ui.ob.paso = 5; P.render({ nueva: true }); return true; })()`);
    const malos = () => ev(`[...document.querySelectorAll('[aria-pressed], [aria-checked], [aria-expanded]')].map((e) => [e.getAttribute('aria-pressed'), e.getAttribute('aria-checked'), e.getAttribute('aria-expanded')]).flat().filter((v) => v !== null && v !== 'true' && v !== 'false' && v !== 'mixed')`);
    check('paso 5 del Primer día (gastos fijos, ninguno elegido)', [await ev(`document.querySelectorAll('[data-a="obPago"]').length > 3`), await malos()], [true, []]);
    await ev(`__armar((st) => { __internet(st); __tarjeta(st); })`);
    const hojas = [['nuevoPago', {}], ['nuevoIngreso', {}], ['nuevaDeuda', { tipoInicial: 'tarjeta' }], ['medio', {}], ['lugar', {}], ['pagado', { tipoPago: 'pago', id: 'internet', fecha: '2026-10-20' }], ['editarRegistro', { id: 'r4' }], ['cuadrar', {}], ['mover', {}]];
    const out = {};
    for (const [h, d] of hojas) {
        await ev(`P.abrirHoja(${js(h)}, ${js(d)}); true`);
        out[h] = await malos();
        await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    }
    check('ningún formulario con aria «null» o «undefined»', Object.entries(out).filter(([, v]) => v.length), []);
});

// ------------------------------------------------------------------ I12 (DATOS-1: sin espacio)
await filaDe('I12', 'Sin espacio para la copia por versión: quedan la original y las 2 más recientes, y se avisa (no falla)', async () => {
    // Un límite de espacio de mentira (como un teléfono lleno): setItem falla si lo guardado pasaría de `__cuota` caracteres.
    const LIMITE = `(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (typeof window.__cuota === 'number') { let total = 0; for (let i = 0; i < this.length; i++) { const kk = this.key(i); if (kk !== k) total += kk.length + (this.getItem(kk) || '').length; } if (total + k.length + String(v).length > window.__cuota) throw new DOMException('lleno', 'QuotaExceededError'); } return orig.call(this, k, v); }; })();`;
    const limiteId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: LIMITE })).identifier;
    const sembrar = (cuotaEnCopias) => ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        const u = { esquema: 2, creado: '2026-10-10T10:00:00.000Z', st: s, introVista: true, nombre: 'Marta', metricas: {}, feedback: [] };
        const texto = JSON.stringify(u);
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no' }));
        localStorage.setItem('pamplanea-uso:v1', texto);
        for (const [v, f] of [['v2.4.0', '2026-09-01'], ['v2.5.0', '2026-09-10'], ['v2.6.0', '2026-10-01'], ['v2.6.5', '2026-10-15']]) localStorage.setItem('pamplanea-uso:respaldo:antes-de-' + v, JSON.stringify({ fecha: f + 'T10:00:00.000Z', de: null, para: v, datos: u }));
        // Lo que ocupa hoy, más ${cuotaEnCopias} copias de tus datos.
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) total += localStorage.key(i).length + localStorage.getItem(localStorage.key(i)).length;
        localStorage.setItem('__cuota', String(total + Math.round(texto.length * ${cuotaEnCopias})));
        return true;
    })()`);
    const leerCuota = `window.__cuota = Number(localStorage.getItem('__cuota')); true`;
    const cuotaId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `try { if (localStorage.getItem('__cuota')) window.__cuota = Number(localStorage.getItem('__cuota')); } catch {}` })).identifier;
    // Cabe una copia nueva solo si se borra una vieja: queda la original (la más vieja) y las 2 más recientes.
    await sembrar(0.5);
    await abrirApp();
    await ev(leerCuota);
    await esperar(300);
    const r = await ev(`({ modo: P.modo, bloq: P.modos.bloqueado(), nombre: P.st.nombre, copias: Object.keys(localStorage).filter((k) => k.startsWith('pamplanea-uso:respaldo:')).sort(), aviso: !!document.getElementById('cf-t') })`);
    check('abre con tus datos (no falla)', [r.modo, r.bloq, r.nombre], ['uso', false, 'Marta']);
    // (La nueva es la de la versión que abre: desde la v2.8, «antes-de-v2.8.0».)
    const nueva = 'pamplanea-uso:respaldo:antes-de-v' + (/v(\d+\.\d+\.\d+)/.exec(await ev('window.VERSION_PROTOTIPO')) || [])[1];
    check('quedan la original, las 2 más recientes y la nueva', r.copias, ['pamplanea-uso:respaldo:antes-de-v2.4.0', 'pamplanea-uso:respaldo:antes-de-v2.6.0', 'pamplanea-uso:respaldo:antes-de-v2.6.5', nueva]);
    check('(con espacio después de limpiar, no hace falta avisar)', r.aviso, false);
    // Ni así cabe: se avisa en Hoy y la app sigue con tus datos.
    await sembrar(-0.6);
    await abrirApp();
    await ev(leerCuota);
    await esperar(300);
    const r2 = await ev(`({ modo: P.modo, bloq: P.modos.bloqueado(), nombre: P.st.nombre, copias: Object.keys(localStorage).filter((k) => k.startsWith('pamplanea-uso:respaldo:')).sort(), aviso: document.getElementById('cf-t')?.innerText.trim() || null })`);
    check('sin espacio ni limpiando: abre con tus datos', [r2.modo, r2.bloq, r2.nombre], ['uso', false, 'Marta']);
    check('y lo avisa en Hoy', r2.aviso, 'Guarda una copia de tus datos');
    check('la original sigue', r2.copias.includes('pamplanea-uso:respaldo:antes-de-v2.4.0'), true);
    // (Aquí el aviso en la consola es lo esperado: no cuenta como error de la página.)
    for (let i = b.errores.length - 1; i >= 0; i--) if (/no hubo espacio para la copia interna/.test(String(b.errores[i]))) b.errores.splice(i, 1);
    await foto('I12-sin-espacio');
    await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: limiteId });
    await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: cuotaId });
    await ev(`P.sinGuardar = true; window.__cuota = undefined; localStorage.clear(); true`);
    await abrirApp();
});

// ------------------------------------------------------------------ P3 (la nota del cuadre, antes de guardar)
await filaDe('P3', 'La nota del cuadre en Anotar (P-3): antes del cuadre no cambia; el mismo día pregunta; después baja', async () => {
    const abrirAnotar = async (frase) => {
        await ev(`(() => { P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = ${js(frase)}; q.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
        await esperar(100);
    };
    const guardar = async () => {
        await ev(`P.acciones.anotarGuardar(); true`);
        await esperar(150);
        return ev(`!!(P.ui.hoja && P.ui.hoja.tipo === 'anotar')`);
    };
    const palabras = (t) => String(t || '').split(/(?<=[.?!])\s+/).filter(Boolean).every((f) => f.split(/\s+/).length <= 20);
    await ev(`__armar(); true`);
    // Como la prueba de Victor: cuadrar el Efectivo hoy a $20 menos de lo anotado ($100 → $80).
    await ev(`P.cambiar((s) => P.cuadrar(s, 'efectivo', MOTOR.saldoLugar(s, 'efectivo') - 2000), { aviso: null }); true`);
    const e0 = await ev(`__saldo('efectivo')`);
    check('(el cuadre: Efectivo en $80.00)', e0, 8000);
    const m0 = await ev(`__mes()`);

    // 1) De ANTES del cuadre: la nota, antes de guardar; tu Efectivo no cambia y Mes cuenta los $20 una vez.
    await abrirAnotar('ayer pupusas 20 efectivo');
    check('antes: la nota', await texto('#nota-cuadre p'), 'Esto fue antes de que contaras tu Efectivo hoy. Ya está dentro de lo que contaste: tu Efectivo no cambia.');
    check('antes: con «Fue después de contar»', [await texto('[data-fk="tras-cuadre"]'), await ev(`document.querySelector('[data-fk="tras-cuadre"]').getAttribute('aria-pressed')`)], ['Fue después de contar', 'false']);
    check('antes: cada frase con 20 palabras o menos', palabras(await texto('#nota-cuadre p')), true);
    check('antes: no pregunta nada más', await ev(`!!document.getElementById('l-orden')`), false);
    await foto('P3-antes');
    check('antes: se guarda', await guardar(), false);
    check('antes: tu Efectivo no cambia ($80.00)', await ev(`__saldo('efectivo')`), e0);
    const m1 = await ev(`__mes()`);
    check('antes: Mes cuenta los $20 una sola vez (explican el cuadre)', [m1.salio - m0.salio, m0.sinDetalleSalio - m1.sinDetalleSalio], [0, 2000]);

    // 2) De antes, pero «Fue después de contar»: cuenta después del cuadre y sí baja.
    await abrirAnotar('ayer bus 5 efectivo');
    await ev(`document.querySelector('[data-fk="tras-cuadre"]').click(); true`);
    await esperar(100);
    check('«Fue después de contar»: la nota lo dice', [await texto('#nota-cuadre p'), await ev(`document.querySelector('[data-fk="tras-cuadre"]').getAttribute('aria-pressed')`)], ['Cuenta como después de contar: tu Efectivo baja.', 'true']);
    check('«Fue después de contar»: se guarda', await guardar(), false);
    check('«Fue después de contar»: tu Efectivo baja $5 ($75.00)', await ev(`__saldo('efectivo')`), e0 - 500);
    check('(queda con la anotación)', await ev(`P.st.registros.at(-1).trasCuadre && P.st.registros.at(-1).trasCuadre.lugar`), 'efectivo');

    // 3) Del MISMO día: pregunta; sin respuesta no se guarda (no se asume).
    await abrirAnotar('pupusas 6 efectivo');
    check('mismo día: pregunta', await texto('#l-orden'), '¿Fue antes o después de contar tu dinero?');
    check('mismo día: con «Antes» y «Después»', await ev(`[...document.querySelectorAll('[data-campo="ordenCuadre"]')].map((x) => x.textContent.trim())`), ['Antes', 'Después']);
    await foto('P3-mismo-dia');
    check('mismo día: sin respuesta, no se guarda', [await guardar(), await ev(`P.ui.hoja.errores.includes('ordenCuadre')`), await texto('#anotar-preg .campo-error')], [true, true, 'Elige una opción']);
    await ev(`document.querySelector('[data-fk="orden-antes"]').click(); true`);
    await esperar(100);
    check('mismo día «Antes»: lo dice', await texto('#orden-nota'), 'Ya está dentro de lo que contaste: tu Efectivo no cambia.');
    check('mismo día «Antes»: se guarda', await guardar(), false);
    check('mismo día «Antes»: tu Efectivo no cambia ($75.00)', await ev(`__saldo('efectivo')`), e0 - 500);
    await abrirAnotar('pan 3 efectivo');
    await ev(`document.querySelector('[data-fk="orden-despues"]').click(); true`);
    await esperar(100);
    check('mismo día «Después»: lo dice', await texto('#orden-nota'), 'Tu Efectivo baja con esto.');
    check('mismo día «Después»: se guarda', await guardar(), false);
    check('mismo día «Después»: tu Efectivo baja $3 ($72.00)', await ev(`__saldo('efectivo')`), e0 - 800);
    // Un ingreso del mismo día también pregunta (y «Después» lo suma).
    // (v2.8: «recibí 50 en efectivo» ya llega a Efectivo; elegirlo otra vez no cambia nada.)
    await abrirAnotar('recibí 50 en efectivo');
    await ev(`P.acciones.anotarValor({ campo: 'lugar', v: 'efectivo' }); true`);
    await esperar(100);
    check('ingreso del mismo día: también pregunta', await texto('#l-orden'), '¿Fue antes o después de contar tu dinero?');
    await ev(`document.querySelector('[data-fk="orden-despues"]').click(); true`);
    await esperar(100);
    check('ingreso «Después»: tu Efectivo sube $50 ($122.00)', [await guardar(), await ev(`__saldo('efectivo')`)], [false, e0 - 800 + 5000]);

    // 4) DESPUÉS del último cuadre (el Banco Agrícola se cuadró el 1 de octubre): ni nota ni pregunta, y baja.
    const b0 = await ev(`__saldo('banco')`);
    await abrirAnotar('súper 10');
    await ev(`P.acciones.anotarValor({ campo: 'medio', v: 'debito' }); true`);
    await esperar(100);
    check('después: ni nota ni pregunta', [await ev(`!!document.getElementById('nota-cuadre')`), await ev(`!!document.getElementById('l-orden')`)], [false, false]);
    check('después: se guarda y tu Banco Agrícola baja $10', [await guardar(), await ev(`__saldo('banco')`)], [false, b0 - 1000]);
    check('centavos enteros', [await ev(`__saldo('efectivo')`), await ev(`__saldo('banco')`)].every(entero), true);
});

// ================================================================== v2.8 «Más claro»: una fila por cada parte 2 a 9 de E1
/** v2.8: el estado del ejemplo de 01 §23.2 (D-3): $1,000 en tus cuentas con $300 de ahorro dentro y lo que falta del plan. */
const EJEMPLO_385 = `(st) => {
    st.lugares[0].cuadre = { fecha: '2026-10-15', seq: 1, monto: 10000 };
    st.lugares[1].cuadre = { fecha: '2026-10-15', seq: 2, monto: 94000 };
    st.lugares = st.lugares.slice(0, 2);
    st.registros = [
        { id: 'r1', seq: 1, tipo: 'cuadre', fecha: '2026-10-15', lugar: 'efectivo', monto: 10000, esperado: 10000, primero: true },
        { id: 'r2', seq: 2, tipo: 'cuadre', fecha: '2026-10-15', lugar: 'banco', monto: 94000, esperado: 94000, primero: true },
        { id: 'r5', seq: 5, tipo: 'gasto', fecha: '2026-10-18', monto: 4000, nombre: 'Súper', categoria: 'super', emoji: '🛒', medio: 'debito', lugar: 'banco', anotado: true },
    ];
    st.inicio = '2026-10-15';
    st.ingresos[0].llegadas = { '2026-10-15': { monto: 60000, enCuadre: true } };
    const pago = (id, nombre, emoji, monto, dia) => ({ id, nombre, emoji, categoria: 'servicios', monto, estimado: false, frecuencia: 'mensual', dia, medio: 'debito', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-15', creado: '2026-10-15', hechos: {}, previos: [] });
    st.pagos = [pago('luz', 'Luz', '💡', 3000, 25), pago('internet', 'Internet', '🌐', 2500, 28)];
    st.variables = [{ id: 'v1', nombre: 'Súper', emoji: '🛒', categoria: 'super', tope: 15000, medio: 'debito', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }];
    st.apartados = [{ id: 'ap1', nombre: 'Emergencias', emoji: '🛟', portada: 'emergencia-paraguas', monto: 30000, meta: null, metaFecha: null, historial: [], donde: { lugar: 'banco' }, programado: { monto: 5000, desde: '2026-10-15' } }];
    __tarjeta(st, { desde: '2026-10-15', pagoUsual: 10000, estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-10-27', inicial: true, esperarCorte: true }] });
}`;
const libre = () => ev(`P.calc().libre`);

// ------------------------------------------------------------------ V2 (D-3): el ejemplo de 01 §23.2
await filaDe('V2', 'Libre (D-3, 01 §23.2): $1,000 − $300 de ahorro − falta del plan $315 = $385; pupusas $20 → $365; súper $20 → sigue en $385', async () => {
    await ev(`__armar(${EJEMPLO_385})`);
    const k = await ev(`(() => { const k = P.calc(); return { tienes: k.tienes, ahorro: k.apartado, fijos: k.porPagar, variables: k.faltaVariables, programado: k.faltaProgramado, tarjeta: k.enTarjetas, libre: k.libre }; })()`);
    check('dinero en cuentas: $1,000', k.tienes, 100000);
    check('ahorro dentro de una cuenta: $300 (se resta) → $700', k.tienes - k.ahorro, 70000);
    check('falta del plan: luz 30 + internet 25 + súper 110 de 150 + ahorro 50 + tarjeta 100 = $315', [k.fijos, k.variables, k.programado, k.tarjeta], [5500, 11000, 5000, 10000]);
    check('Libre $385', k.libre, 38500);
    check('centavos enteros', Object.values(k).every(entero), true);
    await ev(`P.irTab('hoy'); true`);
    check('Hoy dice $385.00', await texto('.portada-n'), '$385.00');
    // Alternativa A (desde $385): pupusas $20 → $365 (cuentas bajan; no es parte del plan).
    const a = await ev(`__anotar('pupusas 20 efectivo')`);
    check('A: Anotar lo guardó', a.abierta, false);
    check('A: pupusas $20 → Libre $365', await libre(), 36500);
    // Alternativa B (desde $385 otra vez): súper $20 → sigue en $385 (el súper baja de $110 a $90).
    await ev(`__armar(${EJEMPLO_385})`);
    await ev(`{ P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'súper 20'; q.dispatchEvent(new Event('input', { bubbles: true })); P.acciones.anotarValor({ campo: 'medio', v: 'debito' }); } true`);
    await esperar(80);
    check('B: Anotar dice que es de tu gasto variable y que tu libre no baja', await texto('#nota-variable'), (t) => typeof t === 'string' && t.includes('Súper') && t.includes('te quedan $90.00 de $150.00') && t.includes('Tu libre no baja'));
    await foto('V2-super-variable');
    await ev(`P.acciones.anotarGuardar(); true`);
    const b = await ev(`(() => { const k = P.calc(); return { libre: k.libre, falta: k.variables[0].falta, banco: __saldo('banco') }; })()`);
    check('B: súper $20 → sigue en $385', b.libre, 38500);
    check('B: el súper baja de $110 a $90 y el banco $20', [b.falta, b.banco], [9000, 88000]);
    // Un ingreso variable esperado no cuenta hasta que llega.
    await ev(`__armar((st) => { (${EJEMPLO_385})(st); st.ingresos.push({ id: 'venta', nombre: 'Ventas', emoji: '🏪', categoria: 'venta', monto: 20000, aprox: true, frecuencia: 'unico', fecha: '2026-10-24', lugar: 'efectivo', principal: false, extra: true, desde: '2026-10-15', llegadas: {} }); })`);
    check('un ingreso variable esperado no sube tu libre hasta que llega', await libre(), 38500);
});

// ------------------------------------------------------------------ V3 (C-1, D-9 U16)
await filaDe('V3', 'Ahorros (C-1): dentro se resta, aparte solo se registra; «Ya lo guardé»; «Usé de mi ahorro» vuelve a Libre; usar parte deja el resto', async () => {
    await ev(`__armar()`);
    const l0 = await libre();
    await ev(`P.cambiar((s) => P.crearAhorro(s, { nombre: 'Casa', monto: 20000, donde: 'banco' }), { aviso: null }); true`);
    check('«¿Dónde está?» dentro de Banco Agrícola: $200 se restan', l0 - (await libre()), 20000);
    await ev(`P.cambiar((s) => P.crearAhorro(s, { nombre: 'Alcancía', monto: 5000, donde: 'aparte' }), { aviso: null }); true`);
    check('aparte: solo se registra (tu libre no cambia)', l0 - (await libre()), 20000);
    check('aparte: tus cuentas no cambian', await ev(`MOTOR.tienes(P.st)`), 220000);
    // Ahorro programado: cuenta en tu plan hasta «Ya lo guardé»; al guardarlo, tu libre no cambia otra vez.
    await ev(`P.cambiar((s) => { const a = s.apartados.find((x) => x.nombre === 'Casa'); a.programado = { monto: 5000, desde: '2026-10-15' }; }, { aviso: null }); true`);
    const lp = await libre();
    check('ahorro programado $50: baja tu libre (es parte de tu plan)', l0 - 20000 - lp, 5000);
    await ev(`P.cambiar((s) => P.guardarProgramado(s, s.apartados.find((x) => x.nombre === 'Casa').id), { aviso: null }); true`);
    check('«Ya lo guardé»: el ahorro sube $50 y tu libre no cambia', [await ev(`P.st.apartados.find((x) => x.nombre === 'Casa').monto`), await libre()], [25000, lp]);
    check('«Ya lo guardé» una sola vez por quincena', await ev(`MOTOR.programadoInfo(P.st)[0].falta`), 0);
    // Aparte con ahorro programado: el dinero sale de una cuenta y tu libre tampoco cambia otra vez.
    await ev(`P.cambiar((s) => { const a = s.apartados.find((x) => x.nombre === 'Alcancía'); a.programado = { monto: 1000, desde: '2026-10-15' }; }, { aviso: null }); true`);
    const la = await libre();
    const ef = await ev(`__saldo('efectivo')`);
    await ev(`P.cambiar((s) => P.guardarProgramado(s, s.apartados.find((x) => x.nombre === 'Alcancía').id, { lugar: 'efectivo' }), { aviso: null }); true`);
    check('aparte «Ya lo guardé»: sale $10 de tu efectivo y tu libre no cambia', [ef - (await ev(`__saldo('efectivo')`)), await libre(), await ev(`P.st.apartados.find((x) => x.nombre === 'Alcancía').monto`)], [1000, la, 6000]);
    // «Usé de mi ahorro» devuelve el dinero a Libre (dentro: tu cuenta no cambia; aparte: llega a una cuenta).
    const lu = await libre();
    await ev(`P.cambiar((s) => P.apartarEn(s, s.apartados.find((x) => x.nombre === 'Casa').id, 3000, 'liberar'), { aviso: null }); true`);
    check('«Usé de mi ahorro» $30 (dentro): tu libre sube $30', (await libre()) - lu, 3000);
    const lu2 = await libre();
    const ef2 = await ev(`__saldo('efectivo')`);
    await ev(`P.cambiar((s) => P.apartarEn(s, s.apartados.find((x) => x.nombre === 'Alcancía').id, 2000, 'liberar', { lugar: 'efectivo' }), { aviso: null }); true`);
    check('«Usé de mi ahorro» $20 (aparte): llega a tu efectivo y tu libre sube $20', [(await ev(`__saldo('efectivo')`)) - ef2, (await libre()) - lu2], [2000, 2000]);
    // D-9 (U16): usar parte de un ahorro con fecha deja el resto (antes se cerraba y lo demás volvía a tu libre).
    await ev(`__armar((st) => st.apartados.push({ id: 'lap', nombre: 'Laptop', emoji: '💻', portada: 'tecnologia-laptop', monto: 60000, meta: 60000, metaFecha: '2026-11-30', historial: [], donde: { lugar: 'banco' } }))`);
    // Ajuste 4 (punto 6): «mouse» no dice en qué fue: se elige (Tecnología).
    await ev(`__anotar('mouse 100 débito', { usarApartado: 'lap', enQue: 'tecnologia' })`);
    check('usar $100 de $600: quedan $500 en el ahorro (no se cierra)', await ev(`(P.st.apartados.find((x) => x.id === 'lap') || {}).monto ?? null`), 50000);
    check('montos enteros', await ev(`P.st.apartados.every((a) => Number.isInteger(a.monto))`), true);
});

// ------------------------------------------------------------------ V4 (C-3)
await filaDe('V4', 'Gastos variables (C-3): tope por quincena que se renueva; cada gasto lo consume una vez; «¿Ya terminaste?»; «Te pasaste»', async () => {
    const conVariable = `(st) => { st.variables = [{ id: 'v1', nombre: 'Gasolina', emoji: '⛽', categoria: 'transporte', tope: 10000, medio: 'efectivo', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }]; }`;
    await ev(`__armar(${conVariable})`);
    const l0 = await libre();
    check('el tope cuenta en tu plan: $100', await ev(`P.calc().faltaVariables`), 10000);
    await ev(`__anotar('gasolina 30 efectivo')`);
    await ev(`__anotar('bus 1 efectivo')`);
    const x = await ev(`(() => { const v = MOTOR.variablesInfo(P.st)[0]; return { anotado: v.anotado, falta: v.falta }; })()`);
    check('«gasolina 30» lo consume; «bus 1» no (no se llama Gasolina)', [x.anotado, x.falta], [3000, 7000]);
    check('tu libre baja solo $1 (la gasolina ya estaba en tu plan)', l0 - (await libre()), 100);
    // La quincena siguiente se renueva: el 30 (con tu quincena), otra vez $100.
    check('se renueva la quincena siguiente: $100 en la próxima', await ev(`P.calc().proxima.saleVariables`), 10000);
    // «¿Ya terminaste?» se pregunta en los últimos días de la quincena.
    check('el 21 todavía no pregunta', await ev(`MOTOR.preguntarVariable(P.st, MOTOR.variablesInfo(P.st)[0])`), false);
    await ev(`P.st.hoy = '2026-10-28'; true`);
    check('el 28 (antes de tu quincena del 30) pregunta', await ev(`MOTOR.preguntarVariable(P.st, MOTOR.variablesInfo(P.st)[0])`), true);
    const l28 = await libre();
    await ev(`P.cambiar((s) => P.cerrarVariable(s, 'v1', 'listo'), { aviso: null }); true`);
    check('«Sí, ya terminé»: los $70 que sobraron vuelven a tu libre', (await libre()) - l28, 7000);
    await ev(`__armar(${conVariable})`);
    await ev(`P.st.hoy = '2026-10-28'; true`);
    const lf = await libre();
    await ev(`P.cambiar((s) => P.cerrarVariable(s, 'v1', 'falta'), { aviso: null }); true`);
    check('«Me falta»: sigue en tu plan', [await libre(), await ev(`MOTOR.preguntarVariable(P.st, MOTOR.variablesInfo(P.st)[0])`)], [lf, false]);
    // Gastar de más: «Te pasaste $Z», sin culpa (y no resta dos veces).
    await ev(`__armar(${conVariable})`);
    const lp = await libre();
    await ev(`__anotar('gasolina 130 efectivo')`);
    const p = await ev(`(() => { const v = MOTOR.variablesInfo(P.st)[0]; return { pasado: v.pasado, falta: v.falta }; })()`);
    check('te pasaste $30 y ya no falta nada', [p.pasado, p.falta], [3000, 0]);
    check('tu libre baja solo lo que pasaste del tope ($30)', lp - (await libre()), 3000);
});

// ------------------------------------------------------------------ V5 (D-4, C-7)
await filaDe('V5', 'Tarjeta con una sola regla (D-4): lo que pagas normalmente y después el estado, con el ingreso de antes del vencimiento; Netflix no resta aparte (C-7)', async () => {
    // Antes del primer estado de cuenta: lo que pagas normalmente ($100), vence el 25 (antes de tu quincena del 30): con lo que tienes.
    await ev(`__armar((st) => __tarjeta(st, { desde: '2026-10-15', pagoUsual: 10000, estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-10-25', inicial: true, esperarCorte: true }] }))`);
    const sin = await ev(`(() => { const k = P.calc(); return { tarjeta: k.enTarjetas, libre: k.libre }; })()`);
    check('antes del estado de cuenta: cuenta lo que pagas normalmente ($100)', sin.tarjeta, 10000);
    // Si vence después de tu quincena del 30, se cubre con esa quincena: hoy no baja tu libre.
    await ev(`__armar((st) => __tarjeta(st, { desde: '2026-10-15', pagoUsual: 10000, estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-11-05', inicial: true, esperarCorte: true }] }))`);
    check('vence el 5 nov: se paga con tu quincena del 30 (hoy no baja)', await ev(`P.calc().enTarjetas`), 0);
    // Después del estado de cuenta: el monto del estado, también con el ingreso de antes de que venza (no con lo que tienes).
    await ev(`__armar((st) => __tarjeta(st, { desde: '2026-09-01', estados: [{ corte: '2026-10-05', total: 25000, minimo: 2500, aPagar: 25000, opcion: 'total', vence: '2026-11-05', seq: 9 }] }))`);
    const ec = await ev(`(() => { const k = P.calc(); const t = k.tarjetas[0]; return { tarjeta: k.enTarjetas, conIngreso: t.conIngreso, proxima: k.proxima.salePagos }; })()`);
    check('estado de cuenta $250 que vence el 5 nov: con tu quincena del 30', [ec.tarjeta, ec.conIngreso, ec.proxima], [0, 25000, 25000]);
    // Se puede cambiar de quincena (V2-87): pagarlo con lo que tienes ahora.
    await ev(`P.cambiar((s) => { s.tarjetas[0].asignaciones = { '2026-11-05': [{ de: 'ahora', monto: 25000 }] }; }, { aviso: null }); true`);
    check('cambiado a «lo que tienes ahora»: queda reservado hoy', await ev(`(() => { const k = P.calc(); return k.reservadoPagos; })()`), 25000);
    // C-7: Netflix ($10) se cobra en la tarjeta: no resta aparte (va dentro del pago de la tarjeta).
    await ev(`__armar((st) => { __tarjeta(st, { desde: '2026-10-15', pagoUsual: 10000, estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-10-25', inicial: true, esperarCorte: true }] }); __internet(st, { id: 'netflix', nombre: 'Netflix', emoji: '🎬', categoria: 'suscripciones', monto: 1000, dia: 24, medio: 'mt50', tipoPago: 'suscripcion' }); })`);
    const n = await ev(`(() => { const k = P.calc(); return { fijos: k.porPagar, tarjeta: k.enTarjetas }; })()`);
    check('Netflix en la tarjeta no resta aparte (solo la tarjeta, $100)', [n.fijos, n.tarjeta], [0, 10000]);
    check('la ficha de la tarjeta lo tiene como suyo', await ev(`MOTOR.tarjetaDePago(P.st, P.st.pagos[0]).id`), 't50');
    // Al cobrarse en la tarjeta tampoco resta aparte: sube lo que debes, no tu libre (va dentro del pago de la tarjeta).
    const l7 = await ev(`[P.calc().libre, MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).debeTotal]`);
    await ev(`P.cambiar((s) => P.marcarPagado(s, 'netflix', '2026-10-24', { monto: 1000, medio: 'mt50', fecha: '2026-10-21' }), { aviso: null }); true`);
    const l8 = await ev(`[P.calc().libre, MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).debeTotal]`);
    check('cobrado: tu libre igual y lo que debes de la tarjeta sube $10', [l8[0] - l7[0], l8[1] - l7[1]], [0, 1000]);
});

// ------------------------------------------------------------------ V6 (D-5, F09)
await filaDe('V6', 'Vencimiento (D-5, F09): se pregunta «¿Qué día vence tu próximo pago?»; corte el 5 y pago el 25 → el 25 de este mes', async () => {
    await ev(`__armar()`);
    await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
    // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?»; «Otro» pide el nombre.
    await clic('[data-fk="op-banco-Otro"]');
    await escribir('#f-otroNombre', 'Visa');
    check('la pregunta', await ev(`document.querySelector('label[for="f-pagoDia"]').textContent.trim()`), '¿Qué día vence tu próximo pago?');
    await escribir('#f-corte', '5');
    await escribir('#f-pagoDia', '25');
    check('la fecha completa a la vista: el 25 de octubre', await texto('#vence-linea'), (t) => typeof t === 'string' && t.includes('25 de octubre'));
    await foto('V6-vence');
    await ev(`P.acciones.nuevaDeudaOk(); true`);
    const t = await ev(`(() => { const t = P.st.tarjetas.at(-1); const i = MOTOR.tarjetaInfo(P.st, t); return { vence: i.vence, desfase: t.desfase, sig: MOTOR.ocurrenciasTarjeta(P.st, '2026-10-21', '2026-12-31').map((o) => o.fecha) }; })()`);
    check('vence el 25 de octubre (no el 25 de noviembre)', t.vence, '2026-10-25');
    check('corte y pago el mismo mes (desfase 0)', t.desfase, 0);
    // «Es el de noviembre»: la persona lo dice; no se adivina.
    await ev(`__armar()`);
    await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
    // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?»; «Otro» pide el nombre.
    await clic('[data-fk="op-banco-Otro"]');
    await escribir('#f-otroNombre', 'Visa');
    await escribir('#f-corte', '5');
    await escribir('#f-pagoDia', '25');
    await clic('[data-fk="vence-otro"]');
    await ev(`P.acciones.nuevaDeudaOk(); true`);
    check('elegido el de noviembre: vence el 25 de noviembre', await ev(`MOTOR.tarjetaInfo(P.st, P.st.tarjetas.at(-1)).vence`), '2026-11-25');
    // Una tarjeta de antes (sin desfase) conserva su fecha.
    await ev(`__armar((st) => __tarjeta(st))`);
    check('una tarjeta de antes conserva su fecha (25 nov)', await ev(`MOTOR.tarjetaInfo(P.st, P.st.tarjetas[0]).vence`), '2026-11-25');
});

// ------------------------------------------------------------------ V7 (D-9)
await filaDe('V7', 'Deudas (D-9): la cuota termina sola en $0 con aviso; «Me prestaron» registra la deuda y la entrada en un paso', async () => {
    await ev(`__armar((st) => __internet(st, { id: 'coop', nombre: 'Préstamo cooperativa', emoji: '🏦', categoria: 'cuotas', monto: 5000, dia: 20, medio: 'debito', tipoDeuda: 'prestamo', deuda: { debe: 5000 } }))`);
    await ev(`P.cambiar((s) => P.marcarPagado(s, 'coop', '2026-10-20', { monto: 5000, medio: 'debito', fecha: '2026-10-21' }), { aviso: 'Pagado' }); true`);
    const r = await ev(`(() => { const p = P.st.pagos[0]; return { debe: p.deuda.debe, hasta: p.hasta, terminada: !!p.terminada, despues: MOTOR.ocurrenciasPago(P.st, p, '2026-10-21', '2027-03-31').length, toast: P.ui.toast && P.ui.toast.texto }; })()`);
    check('debes $0: la cuota termina sola (ya no sale después)', [r.debe, r.hasta, r.terminada, r.despues], [0, '2026-10-20', true, 0]);
    check('con aviso', r.toast, '¡Terminaste de pagar Préstamo cooperativa! Ya no sale en tu plan.');
    await ev(`P.deshacerUltimo(); true`);
    check('deshacer la vuelve a poner', await ev(`[!!P.st.pagos[0].terminada, P.st.pagos[0].hasta ?? null]`), [false, null]);
    // «Me prestaron 200 mi mamá en efectivo»: la deuda ($200) y la entrada a tu efectivo, en un solo paso.
    await ev(`__armar()`);
    const ef = await ev(`__saldo('efectivo')`);
    const l0 = await libre();
    const a = await ev(`__anotar('me prestaron 200 mi mamá en efectivo')`);
    check('Anotar lo guardó', a.abierta, false);
    const d = await ev(`(() => { const p = P.st.pagos.at(-1); const r = P.st.registros.at(-1); return { tipoDeuda: p.tipoDeuda, debe: p.deuda.debe, nombre: p.nombre, entrada: [r.tipo, r.monto, r.lugar, r.prestamo === p.id], mes: MOTOR.resumenMes(P.st, 2026, 10).totalPrestamos, entro: MOTOR.resumenMes(P.st, 2026, 10).ingresos.some((x) => x.prestamo) }; })()`);
    check('la deuda: «Préstamo de Mamá», debes $200', [d.tipoDeuda, d.debe, d.nombre], ['prestamo', 20000, 'Préstamo de Mamá']);
    check('la entrada: $200 a tu efectivo, ligada a la deuda', d.entrada, ['ingreso', 20000, 'efectivo', true]);
    check('tu efectivo sube $200 y tu libre también', [(await ev(`__saldo('efectivo')`)) - ef, (await libre()) - l0], [20000, 20000]);
    check('en Mes no es un ingreso: va aparte como préstamo', [d.mes, d.entro], [20000, false]);
    // E2: la pantalla Mes lo dice en una línea.
    const mes = await ev(`(() => { P.irTab('mes'); const el = document.querySelector('[data-fk="mes-prestamos"]'); return el ? el.textContent.trim() : null; })()`);
    check('Mes: «Te prestaron $200.00: es una deuda, no cuenta como ingreso.»', mes, 'Te prestaron $200.00: es una deuda, no cuenta como ingreso.');
    await ev(`P.irTab('hoy'); true`);
});

// ------------------------------------------------------------------ V8 (C-5 y «recibí 50 en efectivo»)
await filaDe('V8', '«Me llegó dinero» (C-5): a ±10 % y ±3 días de tu quincena pregunta «¿Es tu quincena?»; si no, es un extra; «recibí 50 en efectivo» llega a Efectivo', async () => {
    await ev(`__armar((st) => { st.ingresos[0].llegadas = {}; st.registros = st.registros.filter((r) => r.tipo !== 'ingreso'); })`);
    await ev(`P.st.hoy = '2026-10-14'; true`);
    const cerca = await ev(`(() => { const d = MOTOR.entender(P.st, 'me pagaron 560'); return { ref: d.ingresoRef && d.ingresoRef.fecha, preguntar: d.preguntarIngreso, faltan: MOTOR.faltan(P.st, d) }; })()`);
    check('$560 (−7 %) un día antes: «¿Es tu quincena?» (no se asume)', [cerca.ref, cerca.preguntar, cerca.faltan.includes('cualIngreso')], ['2026-10-15', true, true]);
    // Ajuste 2 (APROBADO por Victor, 2026-10-22, C-5 reforzado): «me pagaron» es Salario: siempre pregunta, sin importar el
    // monto ni los días. La regla de ±10 % y ±3 días queda para lo demás («recibí»).
    check('«me pagaron 500» (Salario, −17 %): también pregunta', await ev(`MOTOR.entender(P.st, 'me pagaron 500').ingresoRef?.fecha`), '2026-10-15');
    check('«recibí 500» (−17 %): es un extra', await ev(`MOTOR.entender(P.st, 'recibí 500').ingresoRef`), null);
    await ev(`P.st.hoy = '2026-10-10'; true`);
    check('«me pagaron 600» cinco días antes (Salario): también pregunta', await ev(`MOTOR.entender(P.st, 'me pagaron 600').ingresoRef?.fecha`), '2026-10-15');
    check('«recibí 600» cinco días antes: es un extra', await ev(`MOTOR.entender(P.st, 'recibí 600').ingresoRef`), null);
    await ev(`P.st.hoy = '2026-10-14'; true`);
    await ev(`{ P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'me pagaron 600'; q.dispatchEvent(new Event('input', { bubbles: true })); } true`);
    await esperar(80);
    check('la pregunta se ve', await texto('#l-cualIngreso'), (t) => typeof t === 'string' && t.startsWith('¿Es tu quincena'));
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    // «recibí 50 en efectivo» llega a Efectivo (antes iba al banco).
    await ev(`__armar()`);
    check('«recibí 50 en efectivo» → Efectivo', await ev(`MOTOR.entender(P.st, 'recibí 50 en efectivo').lugar`), 'efectivo');
    check('«recibí 50 en agrícola» → Banco Agrícola', await ev(`MOTOR.entender(P.st, 'recibí 50 en agrícola').lugar`), 'banco');
    const ef = await ev(`__saldo('efectivo')`);
    await ev(`__anotar('recibí 50 en efectivo')`);
    check('guardado: tu efectivo sube $50', (await ev(`__saldo('efectivo')`)) - ef, 5000);
});

// ------------------------------------------------------------------ V9 (C-4, P-1)
await filaDe('V9', 'Anotar un pago (C-4, P-1): «¿Es tu pago de Internet?», «¿De cuál de tus préstamos?», «¿Qué pagaste?» y «Es nuevo»; nunca un duplicado en silencio', async () => {
    await ev(`__armar((st) => __internet(st))`);
    const r1 = await ev(`__anotar('internet 100')`);
    check('«internet 100» no se guarda sin contestar', [r1.abierta, r1.errores.includes('cualPlan')], [true, true]);
    check('pregunta «¿Es tu Internet del 20 de octubre?» (FM-8: «pago» solo para deudas, ajuste 3)', await texto('#l-cualPlan'), '¿Es tu Internet del 20 de octubre?');
    await foto('V9-es-tu-pago');
    await clic('[data-fk="plan-si"]');
    await ev(`P.acciones.anotarGuardar(); true`);
    check('«Sí, es ese»: queda pagado (un solo gasto, ligado)', await ev(`[MOTOR.ocurrenciasPago(P.st, P.st.pagos[0], '2026-10-20', '2026-10-20')[0].estado, P.st.registros.filter((r) => r.tipo === 'gasto').map((r) => r.pago)]`), ['pagado', ['internet']]);
    await ev(`__armar((st) => __internet(st))`);
    // Ajuste 2 (D-2 corregida, APROBADO por Victor 2026-10-22): «Es nuevo» pregunta «¿Cómo es?»; aquí, «Solo esta vez».
    await ev(`__anotar('internet 100', { cualPlan: 'nuevo', comoEs: 'unaVez' })`);
    check('«No, es un gasto nuevo»: un gasto sin ligar y tu internet sigue pendiente', await ev(`[MOTOR.ocurrenciasPago(P.st, P.st.pagos[0], '2026-10-20', '2026-10-20')[0].estado, P.st.registros.filter((r) => r.tipo === 'gasto').map((r) => r.pago || null)]`), ['vencido', [null]]);
    // Dos préstamos que se parecen: «¿De cuál de tus préstamos?».
    await ev(`__armar((st) => { __internet(st, { id: 'p1', nombre: 'Préstamo cooperativa', emoji: '🏦', categoria: 'cuotas', monto: 4500, dia: 25, tipoDeuda: 'prestamo', deuda: { debe: 50000 } }); __internet(st, { id: 'p2', nombre: 'Préstamo banco', emoji: '🏦', categoria: 'cuotas', monto: 6000, dia: 28, tipoDeuda: 'prestamo', deuda: { debe: 90000 } }); })`);
    await ev(`{ P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'pagué el préstamo 45'; q.dispatchEvent(new Event('input', { bubbles: true })); } true`);
    await esperar(80);
    check('«¿De cuál de tus préstamos?»', await texto('#l-cualPlan'), '¿De cuál de tus préstamos?');
    await clic('[data-fk="plan-p-p1"]');
    await ev(`P.acciones.anotarGuardar(); true`);
    check('el de la cooperativa: lo que debes baja $45', await ev(`[P.st.pagos[0].deuda.debe, P.st.pagos[1].deuda.debe]`), [45500, 90000]);
    // «pagué 35» sin decir qué: «¿Qué pagaste?» con lo que tienes por pagar.
    await ev(`__armar((st) => __internet(st))`);
    await ev(`{ P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'pagué 35'; q.dispatchEvent(new Event('input', { bubbles: true })); } true`);
    await esperar(80);
    check('«¿Qué pagaste?» con tu internet y «Es nuevo»', [await texto('#l-cualPlan'), await ev(`!!document.querySelector('[data-fk="plan-pago-internet"]') && !!document.querySelector('[data-fk="plan-nuevo"]')`)], ['¿Qué pagaste?', true]);
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    check('«pagué 5 del bus» no pregunta (es una compra)', await ev(`!!MOTOR.entender(P.st, 'pagué 5 del bus').planPreguntar`), false);
});

// ------------------------------------------------------------------ V10 (datos: la actualización a la v2.8)
await filaDe('V10', 'Tus datos de la v2.7 en la v2.8: copia intacta «antes-de-v2.8.0», tus ahorros dentro de tu cuenta y tu libre igual', async () => {
    await ev(`__armar((st) => st.apartados.push({ id: 'ap1', nombre: 'Emergencias', emoji: '🛟', portada: 'emergencia-paraguas', monto: 20000, meta: null, metaFecha: null, historial: [] }))`);
    const st = await ev(`JSON.stringify(P.st)`);
    const libreAntes = await libre();
    const guardado = JSON.stringify({ esquema: 2, creado: '2026-10-01T10:00:00.000Z', st: JSON.parse(st), tab: 'hoy', tema: null, introVista: true, nombre: '', metricas: {}, feedback: [], version: 'Prototipo v2.7.0 · 2026-10-21', novedades: { 'v2.7': { visto: '2026-10-21T10:00:00.000Z' } } });
    await ev(`P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true })); localStorage.setItem('pamplanea-uso:v1', ${js(guardado)}); true`);
    await abrirApp();
    await esperar(400);
    const r = await ev(`(() => { const c = JSON.parse(localStorage.getItem('pamplanea-uso:respaldo:antes-de-v2.8.0') || 'null'); const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1')); return { copia: c && JSON.stringify(c.datos), donde: u.st.apartados[0].donde, version: u.version, libre: P.calc().libre, nov: !!document.getElementById('capa-novedades') }; })()`);
    check('la copia intacta por versión', r.copia, guardado);
    // «No asumir» (2026-10-22): esa cuenta queda como supuesta hasta que la persona conteste (V11).
    check('tus ahorros quedan «dentro de» tu banco (el que tiene más), como supuesto', r.donde, { lugar: 'banco', supuesto: true });
    check('tu libre no cambia', r.libre, libreAntes);
    check('lo guardó la v2.8', r.version, (v) => typeof v === 'string' && v.startsWith('Prototipo v2.8.0'));
    check('sale el cuadrito de novedades', r.nov, true);
    await ev(`P.sinGuardar = true; localStorage.clear(); true`);
    await abrirApp();
});

// ------------------------------------------------------------------ V11 («no asumir» con los ahorros de antes)
await filaDe('V11', '«No asumir»: cada ahorro de antes pregunta «¿en qué cuenta está?»; sin respuesta nada cambia; «Aparte» sube tu libre y lo dice antes', async () => {
    const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
    await ev(`__armar((st) => st.apartados.push({ id: 'ap1', nombre: 'Emergencias', emoji: '🛟', portada: 'emergencia-paraguas', monto: 30000, meta: null, metaFecha: null, historial: [] }, { id: 'ap2', nombre: 'Viaje', emoji: '✈️', portada: 'viaje-avion', monto: 10000, meta: null, metaFecha: null, historial: [] }))`);
    const st = await ev(`JSON.stringify(P.st)`);
    const libreAntes = await libre();
    const guardado = JSON.stringify({ esquema: 2, creado: '2026-10-01T10:00:00.000Z', st: JSON.parse(st), tab: 'hoy', tema: null, introVista: true, nombre: '', metricas: {}, feedback: [], version: 'Prototipo v2.7.0 · 2026-10-21', novedades: { 'v2.7': { visto: '2026-10-21T10:00:00.000Z' } } });
    await ev(`P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true })); localStorage.setItem('pamplanea-uso:v1', ${js(guardado)}); true`);
    await abrirApp();
    await esperar(400);
    await ev(`document.querySelector('[data-fk="nov-ok"]')?.click(); true`);
    await esperar(300);
    check('una pregunta por cada ahorro de antes', await texto('.p28-lista'), (x) => typeof x === 'string' && x.includes('Tu ahorro Emergencias, ¿en qué cuenta está?') && x.includes('Tu ahorro Viaje, ¿en qué cuenta está?'));
    check('con sus cuentas y «Aparte (no está en una cuenta)»', await ev(`[...document.querySelectorAll('[data-fk^="p28-ah-ap1-"]')].map((b) => b.textContent.trim())`), ['Efectivo', 'Banco Agrícola', 'Banco Hipotecario', 'Aparte (no está en una cuenta)']);
    check('sin respuesta: dentro del banco con más dinero y tu libre igual', [await ev(`MOTOR.lugarAhorro(P.st, MOTOR.apartado(P.st, 'ap1'))`), await libre()], ['banco', libreAntes]);
    await abrirApp();
    await esperar(400);
    check('al volver a abrir: la pregunta sigue y nada cambió', [await hay('[data-fk="p28-ah-ap1-aparte"]'), await libre()], [true, libreAntes]);
    // «Aparte»: primero dice cuánto sube tu libre; no cambia nada hasta «Sí, está aparte».
    await clic('[data-fk="p28-ah-ap1-aparte"]');
    check('«Aparte» lo dice antes de confirmar', await texto('#p28-sube-ap1'), 'Tu libre sube $300.00 porque ese dinero no está en tus cuentas.');
    check('antes de confirmar, tu libre igual', await libre(), libreAntes);
    await clic('[data-fk="p28-ah-volver-ap1"]');
    check('«No, volver»: otra vez las cuentas', await hay('[data-fk="p28-ah-ap1-banco"]'), true);
    await clic('[data-fk="p28-ah-ap1-aparte"]');
    const saldos = await ev(`P.st.lugares.map((l) => MOTOR.saldoLugar(P.st, l.id))`);
    await clic('[data-fk="p28-ah-aparte-ok-ap1"]');
    check('«Sí, está aparte»: tu libre sube $300.00', (await libre()) - libreAntes, 30000);
    check('queda aparte y tus cuentas no cambian', [await ev(`MOTOR.apartado(P.st, 'ap1').donde`), await ev(`P.st.lugares.map((l) => MOTOR.saldoLugar(P.st, l.id))`)], ['aparte', saldos]);
    // Una cuenta: queda dentro de esa (la que dijo) y tu libre no cambia.
    const l1 = await libre();
    await clic('[data-fk="p28-ah-ap2-banco2"]');
    check('«Banco Hipotecario»: dentro de esa cuenta y tu libre igual', [await ev(`JSON.stringify(MOTOR.apartado(P.st, 'ap2').donde)`), await libre()], [JSON.stringify({ lugar: 'banco2' }), l1]);
    check('contestadas: ya no hay preguntas', await hay('.p28-lista'), false);
    await abrirApp();
    await esperar(400);
    check('al volver a abrir no vuelven y queda guardado', [await hay('.p28-lista'), await ev(`MOTOR.apartado(P.st, 'ap1').donde`), (await libre()) - libreAntes], [false, 'aparte', 30000]);
    await ev(`P.sinGuardar = true; localStorage.clear(); true`);
    await abrirApp();
});

// ------------------------------------------------------------------ V12 («¿Con qué lo pagas?»)
await filaDe('V12', '«¿Con qué lo pagas?»: un gasto fijo nunca recibe una cuenta que la persona no eligió (ni por su tipo)', async () => {
    const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
    const elegidos = (campo) => ev(`[...document.querySelectorAll('[data-campo="${campo}"][aria-pressed="true"]')].map((b) => b.dataset.v)`);
    const pagoDe = (nombre) => ev(`(() => { const p = P.st.pagos.find((x) => x.nombre === ${js(nombre)}); return p ? { medio: p.medio, automatico: !!p.automatico } : null; })()`);
    await ev(`__armar((st) => { __internet(st); __tarjeta(st); })`);
    // «+ Gasto fijo»: nada viene elegido; una suscripción no se va sola a la tarjeta.
    await ev(`P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    check('«+ Gasto fijo»: «¿Con qué lo pagas?» sin nada elegido', await elegidos('medio'), []);
    await clic('[data-fk="np-suscripcion"]');
    await clic('[data-fk="op-servicio-spotify"]');
    check('una suscripción no elige la tarjeta por ti', await elegidos('medio'), []);
    await escribir('#f-monto', '5.99');
    await clic('[data-fk="dia-dia-24"]');
    await clic('[data-fk="hoja-ok"]');
    check('sin contestar no se guarda: «Elige con qué lo pagas»', [await texto('#err-medio'), await pagoDe('Spotify')], ['Elige con qué lo pagas', null]);
    await clic('[data-fk="op-medio-mt50"]');
    check('con una tarjeta: «¿Se cobra solo?» (Sí, se cobra solo / No, yo lo pago)', await ev(`[...document.querySelectorAll('[data-campo="solo"]')].map((b) => b.textContent.trim())`), ['Sí, se cobra solo', 'No, yo lo pago']);
    await clic('[data-fk="hoja-ok"]');
    check('sin «¿Se cobra solo?» tampoco se guarda', [await texto('#err-solo'), await pagoDe('Spotify')], ['Elige si se cobra solo', null]);
    await clic('[data-fk="op-solo-si"]');
    await clic('[data-fk="hoja-ok"]');
    check('se guarda con lo que elegiste: tu tarjeta, se cobra solo', await pagoDe('Spotify'), { medio: 'mt50', automatico: true });
    // En efectivo no se pregunta si se cobra solo.
    await ev(`P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    await escribir('#f-nombre', 'Colegio');
    await escribir('#f-monto', '40');
    await clic('[data-fk="dia-dia-28"]');
    await clic('[data-fk="op-medio-efectivo"]');
    check('con Efectivo no sale «¿Se cobra solo?»', await hay('[data-campo="solo"]'), false);
    await clic('[data-fk="hoja-ok"]');
    check('Colegio: en efectivo, lo pagas tú', await pagoDe('Colegio'), { medio: 'efectivo', automatico: false });
    // Editar: lo ya guardado no cambia (su cuenta sigue elegida; se cambia solo si tú la cambias).
    await ev(`P.abrirHoja('editarPago', { id: 'internet' }); true`);
    await esperar(200);
    check('editar: su cuenta sigue elegida y «No, yo lo pago»', [await elegidos('medio'), await elegidos('solo')], [['debito'], ['no']]);
    await clic('[data-fk="hoja-ok"]');
    check('editar sin cambiar nada: Internet sigue en tu débito', await pagoDe('Internet'), { medio: 'debito', automatico: false });
    // Anotar «acuérdame…»: tampoco elige por el tipo de gasto.
    const r1 = await ev(`__anotar('acuérdame agua 12 el 25', { frecuencia: 'mensual' })`);
    check('Anotar «acuérdame agua…»: falta «¿Con qué lo pagas?»', [r1.abierta, (r1.errores || []).includes('medio'), await ev(`P.ui.hoja.d.medio`)], [true, true, null]);
    await ev(`P.acciones.anotarValor({ campo: 'medio', v: 'debito' }); P.acciones.anotarGuardar(); true`);
    check('con tu débito, falta «¿Se cobra solo?»', await ev(`P.ui.hoja ? P.ui.hoja.errores : null`), ['solo']);
    await ev(`P.acciones.anotarValor({ campo: 'solo', v: 'no' }); P.acciones.anotarGuardar(); true`);
    await esperar(200);
    check('Agua: con tu débito, lo pagas tú', await pagoDe('Agua'), { medio: 'debito', automatico: false });
    // «Completar tu Primer día»: tus cuentas y tus tarjetas, nada elegido; sin respuesta no se agrega.
    await ev(`P.acciones.obCompletar(); true`);
    await esperar(200);
    await clic('[data-fk="ob-sig"]', 300);
    await clic('[data-fk="ob-sig"]', 300);
    await clic('[data-fk="ob-p-luz"]');
    check('«¿Con qué lo pagas?» con tus cuentas y tarjetas, nada elegido', [await ev(`[...document.querySelectorAll('[data-campo="p-paga"]')].map((b) => b.textContent.trim())`), await elegidos('p-paga')], [['Efectivo', 'Banco Agrícola', 'Crédito Cuscatlán'], []]);
    await escribir('#ob-p-monto', '30');
    await clic('[data-fk="ob-p-dia-27"]');
    await clic('[data-fk="ob-p-agregar"]');
    check('sin contestar no se agrega: «Elige con qué lo pagas»', [await texto('.ob-editor .campo-error'), await ev(`P.ui.ob.datos.pagos.length`)], ['Elige con qué lo pagas', 0]);
    await clic('[data-fk="ob-p-paga-L:banco"]');
    check('con un banco: «¿Se cobra solo?»', await ev(`[...document.querySelectorAll('[data-campo="p-solo"]')].map((b) => b.textContent.trim())`), ['Sí, se cobra solo', 'No, yo lo pago']);
    await clic('[data-fk="ob-p-agregar"]');
    check('sin «¿Se cobra solo?» tampoco', [await texto('.ob-editor .campo-error'), await ev(`P.ui.ob.datos.pagos.length`)], ['Elige si se cobra solo', 0]);
    await clic('[data-fk="ob-p-solo-si"]');
    await clic('[data-fk="ob-p-agregar"]');
    await clic('[data-fk="ob-s-nueva"]');
    check('la suscripción ya no trae tu tarjeta elegida', await elegidos('p-paga'), []);
    await clic('[data-fk="ob-p-servicio-netflix"]');
    await escribir('#ob-p-monto', '10.99');
    await clic('[data-fk="ob-p-dia-26"]');
    await clic('[data-fk="ob-p-paga-L:efectivo"]');
    check('con Efectivo no se pregunta si se cobra solo', await hay('[data-campo="p-solo"]'), false);
    await clic('[data-fk="ob-p-agregar"]');
    await clic('[data-fk="ob-sig"]', 400);
    check('Luz: tu débito, se cobra solo · Netflix: Efectivo (no la tarjeta)', [await pagoDe('Luz'), await pagoDe('Netflix')], [{ medio: 'debito', automatico: true }, { medio: 'efectivo', automatico: false }]);
    // Un Primer día empezado antes («No, lo pago yo»): al seguir, pregunta con qué lo pagas.
    await ev(`P.acciones.obCompletar(); P.ui.ob.paso = 5; P.ui.ob.datos.pagos.push({ clave: 'viejo', id: 'cable', nombre: 'Cable', emoji: '📺', categoria: 'servicios', monto: 2000, variable: false, frecuencia: 'mensual', dia: 27, cobro: 'no' }); P.render(); true`);
    await esperar(200);
    await clic('[data-fk="ob-sig"]', 300);
    check('de antes, sin respuesta: no se agrega y lo pregunta', [await ev(`!!P.ui.ob`), await texto('.ob-editor .campo-error'), await pagoDe('Cable')], [true, 'Elige con qué lo pagas', null]);
    await ev(`P.acciones.obCerrar(); true`);
});

// ------------------------------------------------------------------ V13 (un salario por «Me llegó dinero» cuenta una vez)
await filaDe('V13', 'Un salario anotado por «Me llegó dinero» nunca se cuenta dos veces: con Salario, o el nombre de un ingreso de tu plan, siempre «¿Es tu quincena del 30?»', async () => {
    await ev(`__armar()`);
    const tienes0 = await ev('P.calc().tienes');
    const llegadas = () => ev(`Object.entries(P.st.ingresos.find((i) => i.id === 'quincena').llegadas).map(([f, x]) => [f, x.monto])`);
    // Por el nombre: «me llegó la quincena 300» (lejos del monto y de los días) pregunta; «No, es otro dinero» es un extra.
    const r0 = await ev(`__anotar('me llegó la quincena 300')`);
    check('por el nombre: pregunta «¿Es tu quincena del 30?»', [r0.abierta, await texto('#l-cualIngreso')], [true, '¿Es tu quincena del 30?']);
    await ev(`P.acciones.anotarValor({ campo: 'cualIngreso', v: 'extra' }); P.acciones.anotarGuardar(); true`);
    await esperar(300);
    check('«No, es otro dinero»: un extra; la quincena del 30 sigue esperada', [await llegadas(), (await ev('P.calc().tienes')) - tienes0], [[['2026-10-15', 60000]], 30000]);
    await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.ui.stack = []; P.render(); true`);
    // Salario lejos del monto y de los días (antes no preguntaba): $450 el 21; la quincena es de $600 el 30.
    const r = await ev(`(() => { P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'ingreso' }); const m = document.getElementById('f-monto'); m.value = '450'; m.dispatchEvent(new Event('input', { bubbles: true })); P.acciones.anotarValor({ campo: 'categoriaIngreso', v: 'salario' }); P.acciones.anotarGuardar(); return P.ui.hoja ? P.ui.hoja.errores : null; })()`);
    check('Salario: no se guarda sin contestar', r, (x) => Array.isArray(x) && x.includes('cualIngreso'));
    check('«¿Es tu quincena del 30?» (Sí, es esa / No, es otro dinero)', [await texto('#l-cualIngreso'), await ev(`[...document.querySelectorAll('[data-campo="cualIngreso"]')].map((b) => b.textContent.trim())`)], ['¿Es tu quincena del 30?', ['Sí, es esa', 'No, es otro dinero']]);
    await ev(`P.acciones.anotarValor({ campo: 'cualIngreso', v: 'esperado' }); P.acciones.anotarGuardar(); true`);
    await esperar(300);
    check('«Sí, es esa»: la del 30 llegó con $450 (no se crea otro ingreso)', [await llegadas(), await ev('P.st.ingresos.length')], [[['2026-10-15', 60000], ['2026-10-30', 45000]], 1]);
    check('cuenta una vez: tienes +$750 ($300 extra y $450) y en Mes entró $1,350.00', [(await ev('P.calc().tienes')) - tienes0, (await ev('__mes()')).entro], [75000, 135000]);
    // Otra vez Salario: la del 30 ya llegó: lo dice antes de guardar (lo que guardes es otro ingreso, no la quincena).
    await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.ui.stack = []; P.render(); true`);
    await ev(`(() => { P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'ingreso' }); const m = document.getElementById('f-monto'); m.value = '600'; m.dispatchEvent(new Event('input', { bubbles: true })); P.acciones.anotarValor({ campo: 'categoriaIngreso', v: 'salario' }); return true; })()`);
    await esperar(200);
    check('ya llegó: «Ya marcaste tu quincena del 30 como recibida»', await texto('#capa-hoja'), (t) => typeof t === 'string' && t.includes('Ya marcaste tu quincena del 30 como recibida'));
    check('y la del 30 sigue contada una vez', await llegadas(), [['2026-10-15', 60000], ['2026-10-30', 45000]]);
    // Lo demás sigue con ±10 % y ±3 días: «vendí 100» no pregunta.
    await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.ui.stack = []; P.render(); true`);
    const r3 = await ev(`__anotar('vendí 100')`);
    check('«vendí 100»: sin pregunta, un ingreso', [r3.abierta, (await ev('P.calc().tienes')) - tienes0], [false, 85000]);
});

// ------------------------------------------------------------------ V14 (mover: nunca a la misma cuenta)
await filaDe('V14', 'Mover en Anotar: «¿A dónde?» nunca ofrece la cuenta de «¿De dónde?»; si queda igual, se vacía y se pide otra vez', async () => {
    await ev(`__armar()`);
    const total0 = await ev('P.calc().tienes');
    await ev(`(() => { P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'moví 20'; q.dispatchEvent(new Event('input', { bubbles: true })); P.acciones.anotarEditar({ campo: 'mover' }); P.acciones.anotarValor({ campo: 'de', v: 'efectivo' }); if (P.ui.hoja.editando !== 'mover') P.acciones.anotarEditar({ campo: 'mover' }); return true; })()`);
    await esperar(200);
    const destinos = () => ev(`[...document.querySelectorAll('#anotar-editor [data-campo="a"]')].map((b) => b.dataset.v)`);
    check('de Efectivo: «¿A dónde?» sin Efectivo', await destinos(), ['banco', 'banco2']);
    await ev(`(() => { P.acciones.anotarValor({ campo: 'a', v: 'banco' }); if (P.ui.hoja.editando !== 'mover') P.acciones.anotarEditar({ campo: 'mover' }); P.acciones.anotarValor({ campo: 'de', v: 'banco' }); if (P.ui.hoja.editando !== 'mover') P.acciones.anotarEditar({ campo: 'mover' }); return true; })()`);
    await esperar(200);
    check('el origen cambia a Banco Agrícola (el destino): se vacía y se pide', [await ev('P.ui.hoja.d.a'), await ev(`MOTOR.faltan(P.st, P.ui.hoja.d)`)], (x) => x[0] === null && x[1].includes('mover'));
    check('y ya no ofrece Banco Agrícola', await destinos(), ['efectivo', 'banco2']);
    await ev(`P.acciones.anotarValor({ campo: 'a', v: 'efectivo' }); P.acciones.anotarGuardar(); true`);
    await esperar(300);
    check('se movió: Efectivo +$20, Banco Agrícola −$20, el total igual', [await ev(`__saldo('efectivo')`), await ev(`__saldo('banco')`), await ev('P.calc().tienes')], [12000, 158000, total0]);
});

// ------------------------------------------------------------------ V15 (D-2 corregida y decisión 24)
await filaDe('V15', 'D-2 corregida: fijo o variable no se decide por el monto; el gasto variable no trae medio elegido; «Es nuevo» pregunta «¿Cómo es?»', async () => {
    const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
    await ev(`__armar()`);
    await ev(`P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    check('«+ Gasto fijo»: sin «¿Siempre es el mismo monto?»; al final, «Pásalo a gasto variable»', await texto('.hoja'), (x) => typeof x === 'string' && !/mismo monto/i.test(x) && x.includes('¿Lo vas gastando en varias compras? Pásalo a gasto variable') && x.includes('El monto cambia cada mes') && x.includes('Pon un aproximado; cuando llegue, anotas el real.'));
    await clic('[data-fk="np-servicios"]');
    await clic('[data-fk="op-frecuente-luz"]');
    check('la luz: «El monto cambia cada mes» viene marcado', await ev(`document.querySelector('[data-fk="estimado"]').getAttribute('aria-pressed')`), 'true');
    await clic('[data-fk="clase-variable"]');
    check('el enlace lo pasa a gasto variable, con el enlace de vuelta', [await texto('#hoja-t'), await hay('[data-fk="clase-fijo"]')], ['Gasto variable', true]);
    await ev(`P.cerrarHoja({ sinFoco: true }); P.abrirHoja('nuevoPago', { fecha: 'variable' }); true`);
    await esperar(200);
    check('«+ Gasto variable»: «¿Con qué pagas normalmente?» sin nada elegido (decisión 24)', await ev(`document.querySelectorAll('[data-campo="medio"][aria-pressed="true"]').length`), 0);
    await escribir('#f-nombre', 'Súper');
    await escribir('#f-monto', '100');
    await clic('[data-fk="hoja-ok"]');
    check('sin elegir no se guarda: «Elige con qué lo pagas»', [await texto('#err-medio'), await ev('(P.st.variables || []).length')], ['Elige con qué lo pagas', 0]);
    await clic('[data-fk="op-medio-debito"]');
    await clic('[data-fk="hoja-ok"]');
    check('con tu débito: guardado', await ev(`(P.st.variables || []).map((v) => [v.nombre, v.tope, v.medio])`), [['Súper', 10000, 'debito']]);
    // Editar el gasto variable: «Pasar a gasto fijo» (lo guardado no cambia de tipo solo).
    const vid = await ev('P.st.variables[0].id');
    await ev(`P.abrirHoja('editarVariable', { id: ${js(vid)} }); true`);
    await esperar(200);
    await clic('[data-fk="clase-fijo"]');
    check('«Pasar a gasto fijo»: su formulario con lo del variable', [await texto('#hoja-t'), await ev('P.ui.hoja.nombre'), await ev('P.ui.hoja.medio'), await ev('P.ui.hoja.estimado')], ['Pasar a gasto fijo', 'Súper', 'debito', true]);
    await clic('[data-fk="dia-dia-28"]');
    await clic('[data-fk="op-solo-no"]');
    await clic('[data-fk="hoja-ok"]');
    check('ahora es gasto fijo y el variable ya no sale en tu plan', [await ev(`P.st.pagos.some((p) => p.nombre === 'Súper' && p.activo !== false)`), await ev(`MOTOR.variablesInfo(P.st).length`)], [true, 0]);
    // «Es nuevo» en Anotar: «¿Cómo es?».
    await ev(`__armar((st) => __internet(st))`);
    const r = await ev(`__anotar('pagué 30 de internet', { cualPlan: 'nuevo' })`);
    check('«Es nuevo»: falta «¿Cómo es?»', r.errores, (x) => Array.isArray(x) && x.includes('comoEs'));
    check('con sus respuestas', await ev(`[...document.querySelectorAll('[data-campo="comoEs"]')].map((b) => b.textContent.trim())`), ['Llega con fecha (luz, agua, internet)', 'Lo voy gastando (súper, gasolina)', 'Solo esta vez']);
    await ev(`P.acciones.anotarValor({ campo: 'comoEs', v: 'unaVez' }); P.acciones.anotarGuardar(); true`);
    await esperar(300);
    check('«Solo esta vez»: un gasto, sin tocar tu plan', [await ev(`P.st.registros.filter((x) => x.tipo === 'gasto' && x.monto === 3000).length`), await ev('P.st.pagos.length'), await ev('!!P.ui.hoja')], [1, 1, false]);
});

// ------------------------------------------------------------------ V16 («Pagué una deuda»)
await filaDe('V16', '«Pagué una deuda»: primero y solo «¿Cuál deuda pagaste?»; después, solo lo de esa deuda; sin deudas, «No tienes deudas anotadas»', async () => {
    const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
    await ev(`__armar()`);
    await ev(`P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'pagoDeuda' }); true`);
    await esperar(200);
    check('sin deudas: «No tienes deudas anotadas» con «Agregar una deuda»', [await texto('#l-cualPlan'), await ev(`[...document.querySelectorAll('[data-campo="cualPlan"]')].map((b) => b.textContent.trim())`)], ['No tienes deudas anotadas.', ['Agregar una deuda']]);
    await ev(`__armar((st) => { __tarjeta(st); st.tarjetas[0].apodo = 'La de la casa'; st.pagos.push({ id: 'prest', nombre: 'Préstamo de mi tía', emoji: '🤝', categoria: 'cuotas', monto: 5000, estimado: false, frecuencia: 'mensual', dia: 28, medio: 'debito', avisos: [], desde: '2026-10-01', hechos: {}, previos: [], tipoDeuda: 'prestamo', deuda: { debe: 30000 } }); })`);
    await ev(`P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'pagoDeuda' }); true`);
    await esperar(200);
    check('primero y solo la pregunta: sin campos ni tipo de gasto', [await ev(`document.querySelectorAll('#anotar-editor .editor').length`), await hay('[data-campo="categoria"]')], [0, false]);
    check('tus deudas por su alias o nombre, y «Es nueva»', await ev(`[...document.querySelectorAll('[data-campo="cualPlan"]')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim())`), (x) => x.some((t) => t.startsWith('La de la casa')) && x.some((t) => t.startsWith('Préstamo de mi tía')) && x.at(-1) === 'Es nueva');
    await clic('[data-fk="plan-pago-prest"]');
    check('al elegir: solo cuánto (su cuota), con qué y cuándo', [await ev('P.ui.hoja.d.tipo'), await ev('P.ui.hoja.d.monto'), await hay('#anotar-editor [data-campo="medio"]'), await hay('#anotar-editor [data-campo="fecha"]'), await hay('#f-nombre'), await hay('[data-campo="categoria"]')], ['pagado', 5000, true, true, false, false]);
    // Pagar menos: D-6 (parcial).
    await escribir('#f-monto', '30');
    await ev(`P.acciones.anotarGuardar(); true`);
    await esperar(300);
    check('pagar $30 de $50: quedan $20 de esa cuota (D-6)', await ev(`(() => { const p = MOTOR.pago(P.st, 'prest'); const o = MOTOR.porPagar(P.st, p); return o ? [o.fecha, o.monto] : null; })()`), ['2026-10-28', 2000]);
});

// ------------------------------------------------------------------ V17 (FM-1: nada duplicado)
await filaDe('V17', 'FM-1: nunca dos con el mismo nombre en tu plan; «Es otro distinto» pide un nombre distinto', async () => {
    const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
    const nombres = () => ev(`[...P.st.pagos, ...(P.st.variables || []), ...P.st.ingresos].filter((x) => x.activo !== false).map((x) => MOTOR.normalizar(x.nombre))`);
    await ev(`__armar((st) => { __internet(st); st.pagos.push({ id: 'luz', nombre: 'Luz', emoji: '💡', categoria: 'servicios', monto: 3000, estimado: true, frecuencia: 'mensual', dia: 28, medio: 'debito', avisos: [], desde: '2026-10-01', hechos: {}, previos: [] }); st.variables = [{ id: 'v1', nombre: 'Súper', emoji: '🛒', categoria: 'super', tope: 15000, medio: 'debito', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }]; })`);
    // «+ Gasto fijo» → Facturas y servicios → Luz: «Ya tienes «Luz» (el 28, ~$30)».
    await ev(`P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    await clic('[data-fk="np-servicios"]');
    await clic('[data-fk="op-frecuente-luz"]');
    check('al elegir Luz: «Ya tienes «Luz» (el 28, ~$30)»', [await texto('#dup-t'), await ev(`[...document.querySelectorAll('#dup-box [data-a="yaTienes"]')].map((b) => b.textContent.trim())`)], ['Ya tienes «Luz» (el 28, ~$30).', ['Editar el que tengo', 'Es otro distinto']]);
    await escribir('#f-monto', '30');
    await clic('[data-fk="dia-dia-28"]');
    await clic('[data-fk="op-medio-efectivo"]');
    await clic('[data-fk="hoja-ok"]');
    check('sin contestar no se guarda', [await ev(`P.st.pagos.filter((p) => p.nombre === 'Luz').length`), await texto('#err-duplicado')], [1, 'Elige una opción']);
    await clic('[data-fk="dup-otro"]');
    await escribir('#f-alias', 'luz');
    await clic('[data-fk="hoja-ok"]');
    check('«Es otro distinto» con el mismo nombre: no se guarda', [await ev(`P.st.pagos.filter((p) => MOTOR.normalizar(p.nombre) === 'luz').length`), await texto('#err-alias')], [1, 'Ponle un nombre distinto']);
    await escribir('#f-alias', 'Luz de la casa de mamá');
    await clic('[data-fk="hoja-ok"]');
    check('con un nombre distinto: se guarda aparte (la de antes no cambia)', await ev(`P.st.pagos.filter((p) => /luz/i.test(p.nombre)).map((p) => [p.nombre, p.monto])`), [['Luz', 3000], ['Luz de la casa de mamá', 3000]]);
    // «Editar el que tengo» abre el que ya tienes (no crea nada).
    await ev(`P.abrirHoja('nuevoPago', { fecha: 'variable' }); true`);
    await esperar(200);
    await clic('[data-fk="op-frecuenteVar-super"]');
    check('gasto variable: «Ya tienes «Súper»»', await texto('#dup-t'), (t) => typeof t === 'string' && t.startsWith('Ya tienes «Súper»'));
    await clic('[data-fk="dup-editar"]');
    check('«Editar el que tengo»: su formulario, sin crear otro', [await texto('#hoja-t'), await ev('(P.st.variables || []).length')], ['Editar Súper', 1]);
    // Al editar: no se puede llamar como otro.
    await ev(`P.cerrarHoja({ sinFoco: true }); P.abrirHoja('editarPago', { id: 'internet' }); true`);
    await esperar(200);
    await escribir('#f-nombre', 'LUZ');
    await clic('[data-fk="hoja-ok"]');
    check('editar Internet a «LUZ»: no se guarda', [await ev(`MOTOR.pago(P.st, 'internet').nombre`), await texto('#err-nombreDup')], ['Internet', 'Ya tienes uno con ese nombre. Ponle otro.']);
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    // El cuchubal: si ya hay uno, pide otro nombre.
    await ev(`P.st.pagos.push({ id: 'cuch', nombre: 'Cuchubal', emoji: '🤝', categoria: 'cuotas', monto: 2500, estimado: false, frecuencia: 'quincenal', dias: [15, 30], medio: 'efectivo', avisos: [], desde: '2026-10-01', hechos: {}, previos: [] }); P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    await clic('[data-fk="np-otro"]');
    await clic('[data-fk="op-frecuente-cuchubal"]');
    check('otro cuchubal: «Ya tienes «Cuchubal»» con «Ej. Cuchubal del trabajo»', [await texto('#dup-t'), await hay('[data-fk="dup-otro"]')], (x) => typeof x[0] === 'string' && x[0].startsWith('Ya tienes «Cuchubal»') && x[1]);
    await clic('[data-fk="dup-otro"]');
    check('su ejemplo', await ev(`document.getElementById('f-alias').placeholder`), 'Ej. Cuchubal del trabajo');
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    const n = await nombres();
    check('nunca dos con el mismo nombre', n.length, new Set(n).size);
});

// ------------------------------------------------------------------ V18 (FM-2: el ingreso principal en un solo lugar)
await filaDe('V18', 'FM-2: «+ Ingreso» nunca ofrece Salario; el ingreso principal se crea y se edita en «Mi ingreso principal»', async () => {
    const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
    const tipos = () => ev(`[...document.querySelectorAll('[data-campo="tipoIng"]')].map((b) => b.textContent.trim())`);
    await ev(`__armar()`);
    await ev(`P.abrirHoja('nuevoIngreso', {}); true`);
    await esperar(200);
    check('con ingreso principal: solo extras, sin Salario', [await tipos(), await hay('[data-fk="ing-configurar-principal"]'), await hay('[data-fk="ing-principal"]')], [['Remesa', 'Aguinaldo', 'Quincena 25', 'Bono o comisión', 'Venta', 'Adelanto de salario', 'Otro'], false, false]);
    await ev(`P.cerrarHoja({ sinFoco: true }); P.abrirHoja('nuevoIngreso', { id: 'quincena' }); true`);
    await esperar(200);
    check('editar la quincena: «Mi ingreso principal», sin «¿Qué es?»', [await texto('#hoja-t'), await tipos()], ['Mi ingreso principal', []]);
    // Sin ingreso principal: primero «Configurar mi ingreso principal».
    await ev(`P.cerrarHoja({ sinFoco: true }); __armar((st) => { st.ingresos = []; st.registros = st.registros.filter((r) => r.tipo !== 'ingreso'); })`);
    await ev(`P.abrirHoja('nuevoIngreso', {}); true`);
    await esperar(200);
    check('sin ingreso principal: primero «Configurar mi ingreso principal»; tampoco Salario', [await hay('[data-fk="ing-configurar-principal"]'), (await tipos()).includes('Salario')], [true, false]);
    await clic('[data-fk="ing-configurar-principal"]');
    check('«Mi ingreso principal»: quincena, el 15 y el 30', [await texto('#hoja-t'), await ev('P.ui.hoja.nombre'), await ev('P.ui.hoja.frecuencia')], ['Mi ingreso principal', 'Quincena', 'quincenal']);
    await escribir('#f-monto', '600');
    await clic('[data-fk="hoja-ok"]');
    if (await hay('.hoja .pregunta--antes')) await clic('[data-fk="hoja-ok"]');
    check('guardado como tu ingreso principal', await ev(`P.st.ingresos.map((i) => [i.nombre, i.monto, !!i.principal, i.categoria])`), [['Quincena', 60000, true, 'salario']]);
});

// ------------------------------------------------------------------ V19 (FM-3: «Es mi quincena → Ya llegó»)
await filaDe('V19', 'FM-3: «Me llegó dinero» → «Es mi quincena del 30 → Ya llegó» la marca con el monto real y nunca la cuenta dos veces', async () => {
    await ev(`__armar()`);
    const tienes0 = await ev('P.calc().tienes');
    await ev(`P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'ingreso' }); true`);
    await esperar(200);
    check('arriba: «Es mi quincena del 30 → Ya llegó»', await texto('[data-fk="ing-ya-llego"]'), 'Es mi quincena del 30 → Ya llegó');
    check('«¿Qué es?» con las mismas opciones que «+ Ingreso» (sin Salario)', await ev(`[...document.querySelectorAll('[data-campo="categoriaIngreso"]')].map((b) => b.textContent.trim())`), ['Remesa', 'Aguinaldo', 'Quincena 25', 'Bono o comisión', 'Venta', 'Adelanto de salario', 'Otro', 'Me prestaron']);
    await clic('[data-fk="ing-ya-llego"]');
    check('trae lo que esperabas ($600)', await ev('P.ui.hoja.d.monto'), 60000);
    await escribir('#f-monto', '580');
    await ev(`P.acciones.anotarGuardar(); true`);
    await esperar(300);
    const q = await ev(`(() => { const i = P.st.ingresos.find((x) => x.id === 'quincena'); return [i.llegadas['2026-10-30'] ? i.llegadas['2026-10-30'].monto : null, P.st.ingresos.length]; })()`);
    check('la del 30 llegó con $580 (sin otro ingreso)', q, [58000, 1]);
    check('cuenta una vez: tienes +$580 y en Mes entró $1,180.00', [(await ev('P.calc().tienes')) - tienes0, (await ev('__mes()')).entro], [58000, 118000]);
    await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.ui.stack = []; P.render(); P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'ingreso' }); true`);
    await esperar(200);
    check('la del 30 ya llegó: el botón ya no sale (no se cuenta otra vez)', await texto('[data-fk="ing-ya-llego"]'), null);
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
});

// ------------------------------------------------------------------ V20 (FM-5: archivar una categoría)
await filaDe('V20', 'FM-5: «Otra» crea una categoría tuya; archivarla o renombrarla no cambia montos ni historial', async () => {
    await ev(`__armar()`);
    await ev(`P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    await clic('[data-fk="np-otro"]');
    await clic('[data-fk="op-frecuente-otra"]');
    await escribir('#f-catNombre', 'Clases de inglés');
    await clic('[data-fk="op-catEmoji-13"]');
    await escribir('#f-monto', '25');
    await clic('[data-fk="dia-dia-28"]');
    await clic('[data-fk="op-medio-efectivo"]');
    await clic('[data-fk="hoja-ok"]');
    const cat = await ev(`(P.st.categoriasPropias || []).map((c) => [c.grupo, c.nombre, c.emoji])`);
    check('la categoría se guarda en «Otro» con su ícono; el gasto fijo se llama así', [cat, await ev(`P.st.pagos.map((p) => [p.nombre, p.monto, !!p.propia])`)], [[['otro', 'Clases de inglés', '📚']], [['Clases de inglés', 2500, true]]]);
    await ev(`P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    await clic('[data-fk="np-otro"]');
    check('la próxima vez sale en «¿Cuál?»', await ev(`[...document.querySelectorAll('[data-campo="frecuente"]')].map((b) => b.textContent.trim())`), (x) => x.includes('Clases de inglés') && x.at(-1) === 'Otra');
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    const antes = await ev(`JSON.stringify({ pagos: P.st.pagos, registros: P.st.registros, libre: P.calc().libre })`);
    const cid = await ev(`P.st.categoriasPropias[0].id`);
    await ev(`P.abrirHoja('categorias', {}); true`);
    await esperar(200);
    await clic(`[data-fk="cat-${cid}"]`);
    await escribir('#f-catNombre', 'Inglés');
    await clic('[data-fk="cat-archivar"]');
    await clic('[data-fk="cat-ok"]');
    check('archivada y renombrada', await ev(`P.st.categoriasPropias.map((c) => [c.nombre, !!c.archivada])`), [['Inglés', true]]);
    check('montos, historial y libre iguales (el gasto fijo sigue igual)', await ev(`JSON.stringify({ pagos: P.st.pagos, registros: P.st.registros, libre: P.calc().libre })`), antes);
    check('«Mis categorías» la muestra archivada', await texto('.hoja'), (t) => typeof t === 'string' && t.includes('Inglés') && t.includes('Archivada'));
    await ev(`P.cerrarHoja({ sinFoco: true }); P.abrirHoja('nuevoPago', {}); true`);
    await esperar(200);
    await clic('[data-fk="np-otro"]');
    check('archivada no sale al crear', await ev(`[...document.querySelectorAll('[data-campo="frecuente"]')].map((b) => b.textContent.trim())`), (x) => !x.includes('Inglés') && !x.includes('Clases de inglés'));
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
});

// ------------------------------------------------------------------ V21 (FM-7: «Gasté» en un gasto variable)
await filaDe('V21', 'FM-7: «Gasté» muestra primero tus gastos variables; elegir uno lo consume y tu libre no baja', async () => {
    await ev(`__armar((st) => { st.variables = [{ id: 'v1', nombre: 'Súper', emoji: '🛒', categoria: 'super', tope: 15000, medio: 'debito', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }]; })`);
    const libre0 = await libre();
    await ev(`P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'gasto' }); true`);
    await esperar(200);
    const primeras = await ev(`[...document.querySelectorAll('[data-campo="enQue"]')].map((b) => b.textContent.replace(/\\s+/g, ' ').trim())`);
    check('«¿En qué?»: primero «Súper · te quedan $150.00»', primeras[0], (t) => typeof t === 'string' && t.startsWith('Súper') && t.endsWith('te quedan $150.00'));
    check('después los tipos de gasto y «Otra»', primeras.at(-1), 'Otra');
    await clic('[data-fk="op-enQue-var:v1"]');
    await escribir('#f-monto', '40');
    await ev(`P.acciones.anotarGuardar(); true`);
    await esperar(300);
    check('lo consume: llevas $40 de $150', await ev(`(() => { const x = MOTOR.variablesInfo(P.st).find((y) => y.v.id === 'v1'); return [x.anotado, x.falta]; })()`), [4000, 11000]);
    check('tu libre no baja', await libre(), libre0);
    check('el gasto dice de qué gasto variable es', await ev(`P.st.registros.filter((r) => r.tipo === 'gasto').map((r) => [r.nombre, r.monto, r.variable])`), [['Súper', 4000, 'v1']]);
});

// ------------------------------------------------------------------ V22 (ajuste 4: «¿En qué?» sin nombres repetidos)
await filaDe('V22', 'Ajuste 4: en «¿En qué?» nunca hay dos opciones con el mismo nombre; tus gastos variables primero, en 4 líneas con «Más…» y «Otra»', async () => {
    await ev(`__armar((st) => { st.variables = [{ id: 'v1', nombre: 'súper', emoji: '🛒', categoria: 'super', tope: 15000, medio: 'debito', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }, { id: 'v2', nombre: 'Comida', emoji: '🍽️', categoria: 'comida', tope: 8000, medio: 'efectivo', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }]; for (let i = 0; i < 3; i++) st.registros.push({ id: 'rs' + i, seq: 20 + i, tipo: 'gasto', fecha: '2026-10-1' + i, monto: 500, nombre: 'Medicina', categoria: 'salud', emoji: '💊', medio: 'efectivo' }); st.seq = 40; })`);
    const ver = () => ev(`(() => { const g = document.querySelector('.chips--enque'); const vis = [...g.children].filter((b) => b.style.display !== 'none'); const nombres = [...g.children].filter((b) => !b.hasAttribute('data-fijo')).map((b) => MOTOR.normalizar(b.querySelector('span').textContent)); return { lineas: new Set(vis.map((b) => b.offsetTop)).size, todos: nombres, unicos: new Set(nombres).size, visibles: vis.map((b) => b.dataset.v), fijos: vis.filter((b) => b.hasAttribute('data-fijo')).map((b) => b.dataset.fk) }; })()`);
    // Gasté
    await ev(`P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'gasto' }); true`);
    await esperar(200);
    let r = await ver();
    check('Gasté: ningún nombre dos veces (súper y Comida solo como gastos variables)', [r.todos.length, r.unicos, r.todos.filter((x) => x === 'super' || x === 'comida').length], [r.unicos, r.unicos, 2]);
    check('primero tus gastos variables y después la que más usaste (Salud)', r.visibles.slice(0, 3), ['var:v1', 'var:v2', 'salud']);
    check('máximo 4 líneas, con «Más…» y «Otra» a la vista', [r.lineas <= 4, r.fijos], [true, ['op-enQue-mas', 'op-enQue-otra']]);
    await clic('[data-fk="op-enQue-mas"]');
    r = await ver();
    check('«Más…» las despliega todas (sin repetir)', [r.visibles.length - 2, r.unicos], [r.unicos, r.unicos]);
    // Anotar con texto
    await ev(`P.cerrarHoja({ sinFoco: true }); P.acciones.anotar(); (() => { const q = document.getElementById('anotar-q'); q.value = 'súper 40'; q.dispatchEvent(new Event('input', { bubbles: true })); })(); P.acciones.anotarEditar({ campo: 'nombre' }); true`);
    await esperar(200);
    r = await ver();
    check('Anotar con texto: tampoco se repite; «súper 40» elige tu gasto variable', [r.todos.length === r.unicos, await ev(`[...document.querySelectorAll('[data-campo="enQue"][aria-pressed="true"]')].map((b) => b.dataset.v)`)], [true, ['var:v1']]);
    // «Corregir» un gasto
    await ev(`P.cerrarHoja({ sinFoco: true }); P.abrirHoja('editarRegistro', { id: 'rs0' }); true`);
    await esperar(200);
    r = await ver();
    check('«Corregir» un gasto: tampoco se repite', r.todos.length, r.unicos);
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
});

// ------------------------------------------------------------------ V23 (ajuste 4: no asumir en «Gasté»)
await filaDe('V23', 'Ajuste 4: «Gasté» sin texto no trae nada elegido en «¿En qué?»; sin elegir no se guarda («Elige en qué»)', async () => {
    const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
    await ev(`__armar()`);
    const n0 = await ev(`P.st.registros.length`);
    await ev(`P.acciones.anotar(); P.acciones.anotarAtajo({ v: 'gasto' }); true`);
    await esperar(200);
    check('nada elegido (antes venía «Otros»)', await ev(`[...document.querySelectorAll('[data-campo="enQue"][aria-pressed="true"]')].length`), 0);
    check('sin el texto ni «¿Qué pasó?»: el título es «Gasté» y está «Atrás»', [await hay('#anotar-q'), await texto('#hoja-t'), await hay('[data-fk="anotar-atras"]'), /¿Qué pasó\?/.test(await texto('.hoja'))], [false, 'Gasté', true, false]);
    await escribir('#f-monto', '12');
    await escribir('#f-nombre', 'Algo');
    await clic('[data-fk="op-medio-efectivo"]');
    await clic('[data-fk="anotar-guardar"]');
    check('sin elegir no se guarda: «Elige en qué»', [await texto('#err-enQue'), await ev(`P.st.registros.length`)], ['Elige en qué', n0]);
    await clic('[data-fk="op-enQue-otros"]');
    await clic('[data-fk="anotar-guardar"]');
    check('al elegir, se guarda', await ev(`P.st.registros.filter((r) => r.tipo === 'gasto').map((r) => [r.nombre, r.monto, r.categoria])`), [['Algo', 1200, 'otros']]);
    // Lo que se entiende del texto sí viene elegido; «Atrás» vuelve al texto.
    await ev(`P.acciones.anotar(); (() => { const q = document.getElementById('anotar-q'); q.value = 'pupusas 6'; q.dispatchEvent(new Event('input', { bubbles: true })); })(); P.acciones.anotarAtajo({ v: 'gasto' }); true`);
    await esperar(200);
    check('«pupusas 6» y luego Gasté: se conserva y viene Comida', [await ev('P.ui.hoja.d.monto'), await ev(`[...document.querySelectorAll('[data-campo="enQue"][aria-pressed="true"]')].map((b) => b.dataset.v)`)], [600, ['comida']]);
    await clic('[data-fk="anotar-atras"]');
    check('«Atrás»: otra vez el texto («¿Qué quieres anotar?»)', [await ev(`document.getElementById('anotar-q')?.value`), await texto('label[for="anotar-q"]')], ['pupusas 6', '¿Qué quieres anotar?']);
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
});

// ================================================================== Ajuste 5 «Mi plan más ligero» (APROBADO por Victor, 2026-10-22)
// ------------------------------------------------------------------ V24 (ajuste 5, punto 4)
await filaDe('V24', 'Ajuste 5: «Tu libre» de Mi plan → Esta quincena es el mismo número de Hoy (D-3); Tienes − Sale = Tu libre', async () => {
    let etiquetaHoy = null;
    const igual = async (como, modo = 'fecha') => {
        await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.irTab('hoy'); true`);
        const hoy = await texto('.portada-n');
        etiquetaHoy = await texto('.portada-l');
        await ev(`P.ui.pagosModo = ${js(modo)}; P.ui.pagosVista = 'actual'; P.irTab('pagos'); true`);
        check(`${como}: Mi plan dice lo mismo que Hoy (${hoy})`, [await texto('.plan-res-n'), await ev(`MOTOR.dinero(P.calc().libre)`)], [hoy, hoy]);
        return hoy;
    };
    await ev(`__armar(${EJEMPLO_385})`);
    check('el ejemplo de $385', await igual('ejemplo de $385'), '$385.00');
    check('«Tienes $1,000.00 · Sale $615.00» ($300 de ahorro + $315 de tu plan)', await texto('.plan-res-l'), 'Tienes $1,000.00 · Sale $615.00');
    check('al tocarlo se abre «¿De dónde sale?»', await (async () => { await clic('[data-fk="plan-resumen"]'); return ev(`P.ui.hoja && P.ui.hoja.tipo`); })(), 'desglose');
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    await igual('ejemplo de $385, por tipo', 'tipo');
    await ev(`__anotar('pupusas 20 efectivo')`);
    check('pupusas $20', await igual('pupusas $20'), '$365.00');
    // Día de pago sin confirmar: Hoy dice «Libre por ahora»; Mi plan, «Tu libre por ahora», con el mismo número.
    await ev(`__armar((st) => { st.hoy = '2026-10-30'; })`);
    await igual('día de tu quincena, sin confirmar');
    check('Hoy: «Libre por ahora»; Mi plan: «Tu libre por ahora»', [etiquetaHoy, await texto('.plan-res-e')], ['Libre por ahora', 'Tu libre por ahora']);
    // Sin libre: $0.00 en los dos, y dice cuánto falta.
    await ev(`__armar((st) => __internet(st, { monto: 500000, dia: 25 }))`);
    check('sin libre', await igual('cuando no alcanza'), '$0.00');
    check('dice cuánto falta, con ⚠ (no solo color)', [await texto('.plan-res-s'), await ev(`!!document.querySelector('.plan-res--falta .plan-res-e svg')`)], (x) => typeof x[0] === 'string' && x[0].startsWith('Te faltan') && x[1] === true);
    await ev(`P.ui.pagosModo = null; true`);
});

// ------------------------------------------------------------------ V25 (ajuste 5: nada se pierde)
/**
 * Un plan completo: el ejemplo de $385 más Agua vencida (el 16), un préstamo, una remesa cada mes y un aguinaldo. Lo que
 * mostraba el Mi plan de 509aef4 con este estado (sus secciones, «Por confirmar» y el calendario de cada pestaña), anotado
 * de esa versión: tiene que estar todo en el nuevo. «Mis categorías» se movió a «+ Agregar» (punto 1, V26).
 */
const RICO = `(st) => {
    (${EJEMPLO_385})(st);
    const base = st.pagos[0];
    st.pagos.push({ ...structuredClone(base), id: 'agua', nombre: 'Agua', emoji: '💧', monto: 1200, dia: 16 });
    st.pagos.push({ ...structuredClone(base), id: 'coop', nombre: 'Préstamo cooperativa', emoji: '🏦', categoria: 'cuotas', monto: 4500, dia: 26, tipoDeuda: 'prestamo', deuda: { debe: 54000 } });
    st.ingresos.push({ id: 'remesa', nombre: 'Remesa', emoji: '🌎', categoria: 'remesa', monto: 15000, aprox: true, frecuencia: 'mensual', dia: 28, lugar: 'banco', principal: false, extra: true, desde: '2026-10-15', llegadas: {} });
    st.ingresos.push({ id: 'aguinaldo', nombre: 'Aguinaldo', emoji: '🎁', categoria: 'aguinaldo', monto: 30000, aprox: true, frecuencia: 'unico', fecha: '2026-12-12', lugar: 'banco', principal: false, extra: true, desde: '2026-10-15', llegadas: {} });
}`;
const ANTES_509 = {"tipo": ["mp-i-quincena", "mp-i-remesa", "mp-i-aguinaldo", "mp-luz", "mp-internet", "mp-agua", "mp-v-v1", "mp-a-ap1", "mp-coop", "mp-t-t50"], "venc": ["p-agua-2026-10-16"], "actual": ["i-quincena-2026-10-15", "p-luz-2026-10-25", "p-coop-2026-10-26", "t-t50-2026-10-27", "i-remesa-2026-10-28", "p-internet-2026-10-28", "x-aguinaldo"], "proxima": ["i-quincena-2026-10-30", "x-aguinaldo"], "mes2026-10": ["i-quincena-2026-10-15", "p-luz-2026-10-25", "p-coop-2026-10-26", "t-t50-2026-10-27", "i-remesa-2026-10-28", "p-internet-2026-10-28", "i-quincena-2026-10-30", "x-aguinaldo"], "mes2026-11": ["i-quincena-2026-11-15", "p-agua-2026-11-16", "p-luz-2026-11-25", "p-coop-2026-11-26", "i-remesa-2026-11-28", "p-internet-2026-11-28", "i-quincena-2026-11-30", "x-aguinaldo"]};
await filaDe('V25', 'Ajuste 5: todo lo que mostraba el Mi plan anterior (509aef4) está en el nuevo; secciones plegadas; recuerda la vista', async () => {
    const fks = (sel) => ev(`[...document.querySelectorAll(${js(sel)})].map((x) => x.dataset.fk).filter(Boolean)`);
    const faltan = (antes, ahora) => antes.filter((x) => !ahora.includes(x));
    await ev(`__armar(${RICO})`);
    await ev(`P.ui.pagosModo = 'tipo'; P.ui.planAbiertas = {}; P.irTab('pagos'); true`);
    check('por tipo: 5 secciones plegadas (aria-expanded)', await ev(`[...document.querySelectorAll('.pt-b')].map((b) => [b.querySelector('.pt-t').textContent, b.getAttribute('aria-expanded'), document.getElementById(b.getAttribute('aria-controls')).hidden])`), [['Ingresos', 'false', true], ['Gastos fijos', 'false', true], ['Gastos variables', 'false', true], ['Ahorro programado', 'false', true], ['Deudas', 'false', true]]);
    check('con cuántos y el total de esta quincena: «Gastos fijos (3) $55.00» (Agua venció: está en «Por confirmar»)', await texto('[data-fk="sec-fijos"]'), (t) => typeof t === 'string' && t.includes('Gastos fijos') && t.includes('(3)') && t.endsWith('$55.00'));
    await clic('[data-fk="sec-fijos"]');
    check('al tocarla se abre (aria-expanded) y el foco se queda', [await ev(`document.querySelector('[data-fk="sec-fijos"]').getAttribute('aria-expanded')`), await ev(`document.getElementById('pt-fijos').hidden`), await ev(`document.activeElement.dataset.fk`)], ['true', false, 'sec-fijos']);
    check('cada fila: máximo dos líneas, con «sale de» y el próximo', await ev(`[...document.querySelectorAll('#pt-fijos .fila-main')].map((b) => [b.querySelectorAll('.fila-s').length, b.querySelector('.pt-s').textContent])`), (x) => Array.isArray(x) && x.length === 3 && x.every(([n, t]) => n === 1 && t.startsWith('sale de: ') && /próximo|venció/.test(t)));
    for (const s of ['ingresos', 'variables', 'ahorro', 'deudas']) await clic(`[data-fk="sec-${s}"]`, 80);
    check('por tipo: están todas las filas de las secciones de antes', faltan(ANTES_509.tipo, await fks('#pantalla [data-fk^="mp-"]')), []);
    await ev(`P.abrir('porConfirmar'); true`);
    check('«Por confirmar»: lo mismo de antes, con sus botones', [faltan(ANTES_509.venc, await fks('#pantalla .fila-main')), await fks('#pantalla [data-a="pagado"]')], [[], ['pagado-p-agua-2026-10-16']]);
    await ev(`P.atras(); true`);
    for (const [v, mes] of [['actual'], ['proxima'], ['mes', '2026-10'], ['mes', '2026-11']]) {
        await ev(`P.ui.pagosModo = 'fecha'; P.ui.pagosVista = ${js(v)}; P.ui.pagosMes = ${js(mes || null)}; P.render(); true`);
        check(`por fecha (${mes || v}): está todo lo del calendario de antes`, faltan(ANTES_509[v + (mes || '')], await fks('#pantalla .pl-b')), []);
    }
    await ev(`P.ui.pagosVista = 'actual'; P.render(); true`);
    check('«⚠ 1 por confirmar ›» en una línea', await texto('[data-fk="plan-por-confirmar"]'), '1 por confirmar');
    check('gastos variables y ahorro programado, una línea cada uno', [await texto('[data-fk="pl-v-v1"]'), await texto('[data-fk="pl-a-ap1"]')], ['Súper te quedan $110.00 de $150.00', 'Emergencias $50.00 esta quincena']);
    // Punto 2: se recuerda la última vista que elegiste (en este teléfono, sin tocar tus datos).
    await ev(`P.ui.pagosModo = null; P.render(); true`);
    await clic('[data-fk="ver-tipo"]');
    await ev(`__armar(${RICO})`);
    await ev(`P.irTab('pagos'); true`);
    check('elegiste «Ver por tipo»: al volver, Mi plan abre por tipo', [await ev(`!!document.querySelector('.pt-sec')`), await ev(`!!document.querySelector('[data-fk="ver-fecha"]')`)], [true, true]);
    await clic('[data-fk="ver-fecha"]');
    await ev(`__armar(${RICO})`);
    await ev(`P.irTab('pagos'); true`);
    check('«Ver por fecha»: vuelve a abrir por fecha', [await ev(`!!document.querySelector('.pl-lista')`), await ev(`!!document.querySelector('[data-fk="ver-tipo"]')`)], [true, true]);
});

// ------------------------------------------------------------------ V26 (ajuste 5, punto 1)
await filaDe('V26', 'Ajuste 5: un solo «+ Agregar» abre cada uno de los 6 formularios de siempre; al cerrar, el foco vuelve a él', async () => {
    await ev(`__armar()`);
    await ev(`P.ui.pagosModo = null; P.irTab('pagos'); true`);
    check('un solo botón para agregar (sin los «+» de cada sección ni del calendario)', await ev(`[...document.querySelectorAll('#pantalla [data-fk^="nuevo-"], #pantalla [data-fk="mp-categorias"], #pantalla [data-fk="plan-agregar"]')].map((b) => b.dataset.fk)`), ['plan-agregar']);
    const cuales = [['nuevo-ingreso', 'nuevoIngreso'], ['nuevo-pago', 'nuevoPago'], ['nuevo-variable', 'nuevoPago'], ['nuevo-programado', 'programar'], ['nuevo-deuda', 'nuevaDeuda'], ['mp-categorias', 'categorias']];
    await clic('[data-fk="plan-agregar"]');
    check('«Agregar a tu plan»: Ingreso · Gasto fijo · Gasto variable · Ahorro programado · Deuda o tarjeta · Mis categorías', [await texto('#hoja-t'), await ev(`[...document.querySelectorAll('.hoja [data-a="agregarAbrir"] .fila-t')].map((x) => x.textContent)`)], ['Agregar a tu plan', ['Ingreso', 'Gasto fijo', 'Gasto variable', 'Ahorro programado', 'Deuda o tarjeta', 'Mis categorías']]);
    await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    for (const [fk, tipo] of cuales) {
        await clic('[data-fk="plan-agregar"]');
        await clic(`[data-fk="${fk}"]`);
        const h = await ev(`({ tipo: P.ui.hoja && P.ui.hoja.tipo, fecha: P.ui.hoja && P.ui.hoja.fecha, titulo: document.getElementById('hoja-t')?.innerText.trim() })`);
        check(`«${fk}» abre su formulario`, fk === 'nuevo-variable' ? [h.tipo, h.titulo] : h.tipo, fk === 'nuevo-variable' ? ['nuevoPago', 'Gasto variable'] : tipo);
        await ev(`P.cerrarHoja(); true`);
        await esperar(80);
        check(`«${fk}»: al cerrar, el foco vuelve a «+ Agregar»`, await ev(`document.activeElement && document.activeElement.dataset.fk`), 'plan-agregar');
    }
});

const resultado = { version: await ev('window.VERSION_PROTOTIPO').catch(() => null), filas: filas.map((f) => ({ id: f.id, ok: f.ok, nombre: f.nombre, checks: f.checks.length, malas: f.checks.filter((c) => !c.ok) })), resumen: `${filas.filter((f) => f.ok).length} de ${filas.length} filas bien`, fallos, errores: b.errores, fallidas: b.fallidas };
console.log(JSON.stringify(resultado, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
