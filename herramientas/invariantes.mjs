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
// Y una fila por cada arreglo de la Parte B que no está arriba: F13, F14, F17, F21, F22, F23.
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
    check(`${como}: Pagos dice «Parcial · faltan $50.00»`, await texto('#pantalla'), contiene('Parcial · faltan $50.00'));
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
    const a = await ev(`__anotar('internet 50')`);
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
    check('Pagos (septiembre) no dice «Pagado ✓»', await ev(`[...document.querySelectorAll('#pantalla .fila--pago')].filter((li) => li.innerText.includes('Crédito Cuscatlán')).map((li) => li.innerText.replace(/\\s+/g, ' '))`), (x) => Array.isArray(x) && x.every((t) => !t.includes('Pagado ✓')));
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
    await ev(`__anotar('internet 100')`);
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
    await ev(`__anotar('cuadernos 20 efectivo', { usarApartado: 'ap1' })`);
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
    await ev(`__anotar('mochila 20 crédito cuscatlán', { usarApartado: 'ap1' })`);
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
    await escribir('#f-nombre', 'Visa');
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

const resultado = { version: await ev('window.VERSION_PROTOTIPO').catch(() => null), filas: filas.map((f) => ({ id: f.id, ok: f.ok, nombre: f.nombre, checks: f.checks.length, malas: f.checks.filter((c) => !c.ok) })), resumen: `${filas.filter((f) => f.ok).length} de ${filas.length} filas bien`, fallos, errores: b.errores, fallidas: b.fallidas };
console.log(JSON.stringify(resultado, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
