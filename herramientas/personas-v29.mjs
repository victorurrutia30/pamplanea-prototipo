// AUDITORÍA v2.9 «Números claros»: cuatro personas viven del 21 de octubre al 31 de diciembre, día por día, y un
// CONTADOR independiente (escrito aquí, sin usar motor.js) dice cuánto dinero tienen, su libre y qué cae en cada periodo.
// Cada día se compara con lo que la app MUESTRA: Hoy (Libre), Mi dinero (saldos y ahorros) y, en los días clave, Mi plan en
// cada pestaña (por fecha y por tipo, su resumen y «¿De dónde sale?») y Mes (Entraron · Salieron).
//   1) Pam cobra por QUINCENA (15 y 30) · 2) Majo cobra por MES (el 30) · 3) Toño cobra por SEMANA (viernes)
//   4) Rosa tiene INGRESOS VARIABLES (ventas sin fecha fija).
// Cada una tiene el ejercicio completo: préstamo con cuota y pago parcial, tarjeta sin y con estado de cuenta (Netflix
// dentro y abonos), casa comercial, gastos fijos exactos y aproximados, 3 presupuestos (cumplido, excedido y «Ya terminé»
// reabierto), ahorro dentro y aparte con ahorro programado y «Usé de mi ahorro», adelanto con su descuento (y comisión),
// aguinaldo y Quincena 25, ingreso de la pareja, remesa, cuchubal (aportes y turno), un cuadre con dinero sin detalle,
// mover entre cuentas y la corrección de un gasto.
// Uso: node herramientas/personas-v29.mjs [--solo=pam,majo,tono,rosa] [--puerto=9961] [--salida=<json>] [--detalle] [--fotos]
// Con --fotos guarda en capturas/personas-v29 cada pestaña (por fecha y por tipo) y su «¿De dónde sale?», a 390×844, un día
// por persona (después del estado de cuenta y del adelanto).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || true]; }));
const SOLO = String(args.solo || 'pam,majo,tono,rosa').split(',');

// ------------------------------------------------------------------ fechas (propias del contador)
const pad = (n) => String(n).padStart(2, '0');
const aD = (iso) => new Date(iso + 'T00:00:00Z');
const aIso = (d) => d.toISOString().slice(0, 10);
const mas = (iso, n) => { const d = aD(iso); d.setUTCDate(d.getUTCDate() + n); return aIso(d); };
const diaSem = (iso) => aD(iso).getUTCDay();
const finMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const fecha = (y, m, d) => `${y}-${pad(m)}-${pad(Math.min(d, finMes(y, m)))}`;
const ym = (iso) => iso.slice(0, 7);
const c = (pesos) => Math.round(pesos * 100);
const $ = (cent) => (cent < 0 ? '−' : '') + '$' + (Math.abs(cent) / 100).toFixed(2);

/** Las fechas de una regla entre dos fechas, contadas a mano (mensual, quincenal, semanal, una vez, «con el ingreso»). */
function fechasDe(r, desde, hasta, principal) {
    const out = [];
    if (desde > hasta) return out;
    if (r.frecuencia === 'unico') return r.fecha >= desde && r.fecha <= hasta ? [r.fecha] : [];
    if (r.frecuencia === 'ingreso') return fechasDe(principal, desde, hasta, principal);
    if (r.frecuencia === 'semanal') {
        for (let f = desde; f <= hasta; f = mas(f, 1)) if (diaSem(f) === r.diaSemana) out.push(f);
        return out;
    }
    let [y, m] = desde.split('-').map(Number);
    const [hy, hm] = hasta.split('-').map(Number);
    while (y < hy || (y === hy && m <= hm)) {
        for (const d of r.frecuencia === 'quincenal' ? r.dias : [r.dia]) {
            const f = fecha(y, m, d);
            if (f >= desde && f <= hasta && !out.includes(f)) out.push(f);
        }
        m++;
        if (m > 12) { m = 1; y++; }
    }
    return out.sort();
}

// ------------------------------------------------------------------ las personas
/**
 * Lo mismo para las cuatro, con su forma de cobrar. `per` es el tamaño del periodo: lo que los presupuestos y el ahorro
 * programado usan por periodo. Montos en centavos.
 */
function persona(id, nombre, tipo) {
    const principal =
        tipo === 'quincena' ? { id: 'sueldo', nombre: 'Quincena', monto: c(600), frecuencia: 'quincenal', dias: [15, 30], lugar: 'agricola' }
        : tipo === 'mes' ? { id: 'sueldo', nombre: 'Salario', monto: c(1200), frecuencia: 'mensual', dia: 30, lugar: 'agricola' }
        : tipo === 'semana' ? { id: 'sueldo', nombre: 'Pago de la semana', monto: c(300), frecuencia: 'semanal', diaSemana: 5, lugar: 'efectivo' }
        : null;
    const escala = tipo === 'mes' ? 2 : tipo === 'semana' ? 0.5 : tipo === 'variable' ? 2 : 1;
    const e = (pesos) => c(pesos * escala);
    const p = {
        id, nombre, tipo, principal,
        inicio: '2026-10-21',
        saldos: { efectivo: c(80), agricola: c(900) },
        lugares: [['efectivo', 'efectivo', 'Efectivo', '💵'], ['agricola', 'banco', 'Banco Agrícola', '🏦']],
        tarjeta: { id: 'bac', nombre: 'Crédito BAC', apodo: 'La de la casa', corte: 15, pagoDia: 5, usual: c(100), cupo: c(1000), primerCorte: '2026-10-15', primerVence: '2026-11-05' },
        ingresos: [
            { id: 'pareja', nombre: 'Salario de Luis', monto: c(350), frecuencia: 'mensual', dia: 28, lugar: 'efectivo', categoria: 'otro' },
            { id: 'remesa', nombre: 'Remesa de mamá', monto: c(100), aprox: true, frecuencia: 'mensual', dia: 10, lugar: 'agricola', categoria: 'remesa' },
            { id: 'aguinaldo', nombre: 'Aguinaldo', monto: c(400), aprox: true, frecuencia: 'unico', fecha: '2026-12-12', lugar: 'agricola', categoria: 'aguinaldo' },
            { id: 'q25', nombre: 'Quincena 25', monto: c(300), frecuencia: 'unico', fecha: '2026-12-20', lugar: 'agricola', categoria: 'quincena25' },
            { id: 'turno', nombre: 'Turno del cuchubal', monto: c(160), frecuencia: 'unico', fecha: '2026-12-15', lugar: 'efectivo', categoria: 'cuchubal' },
        ],
        pagos: [
            { id: 'luz', nombre: 'Luz', emoji: '💡', categoria: 'servicios', monto: c(35), estimado: true, frecuencia: 'mensual', dia: 12, medio: 'debito' },
            { id: 'agua', nombre: 'Agua', emoji: '💧', categoria: 'servicios', monto: c(12), frecuencia: 'mensual', dia: 18, medio: 'debito' },
            { id: 'internet', nombre: 'Internet', emoji: '🌐', categoria: 'servicios', monto: c(25), frecuencia: 'mensual', dia: 20, medio: 'debito', automatico: true },
            { id: 'alquiler', nombre: 'Alquiler', emoji: '🏠', categoria: 'casa', monto: c(200), frecuencia: 'mensual', dia: 1, medio: 'transferencia' },
            { id: 'netflix', nombre: 'Netflix', emoji: '🎬', categoria: 'suscripciones', monto: c(10), frecuencia: 'mensual', dia: 24, medio: 'bac', tipoPago: 'suscripcion' },
            { id: 'prestamo', nombre: 'Préstamo cooperativa', emoji: '🏦', categoria: 'cuotas', monto: c(50), frecuencia: 'mensual', dia: 25, medio: 'efectivo', tipoDeuda: 'prestamo', debe: c(500) },
            { id: 'casacom', nombre: 'Casa comercial', emoji: '🛍️', categoria: 'cuotas', monto: c(35), frecuencia: 'mensual', dia: 20, medio: 'transferencia', tipoDeuda: 'casacomercial', debe: c(280) },
            principal
                ? { id: 'cuchubal', nombre: 'Cuchubal', emoji: '🤝', categoria: 'cuchubal', monto: c(20), frecuencia: 'ingreso', medio: 'efectivo' }
                : { id: 'cuchubal', nombre: 'Cuchubal', emoji: '🤝', categoria: 'cuchubal', monto: c(20), frecuencia: 'mensual', dia: 15, medio: 'efectivo' },
        ],
        variables: [
            { id: 'super', nombre: 'Súper', emoji: '🛒', categoria: 'super', tope: e(150), medio: 'debito' },
            { id: 'comida', nombre: 'Comida afuera', emoji: '🍽️', categoria: 'comida', tope: e(40), medio: 'efectivo' },
            { id: 'gasolina', nombre: 'Gasolina', emoji: '⛽', categoria: 'transporte', tope: e(60), medio: 'efectivo' },
        ],
        ahorros: [
            { id: 'emerg', nombre: 'Emergencias', emoji: '🛟', monto: c(200), donde: 'agricola', programado: e(25) },
            { id: 'viaje', nombre: 'Viaje', emoji: '🏖️', monto: c(100), donde: 'aparte' },
        ],
        escala,
    };
    if (tipo === 'variable') p.ingresos.push({ id: 'ventas', nombre: 'Ventas', anotadas: true });
    return p;
}

/**
 * Lo que hace cada persona un día. Devuelve una lista de eventos (los mismos para la app y para el contador).
 * `ctx` trae lo que la persona sabe de su plan (sus días de pago y periodos), calculado por el contador.
 */
function eventosDel(p, f, cont) {
    const ev = [];
    const [y, m, d] = f.split('-').map(Number);
    const e = (pesos) => c(pesos * p.escala);
    const per = cont.periodoDe(f);
    const esPago = p.principal && fechasDe(p.principal, f, f).length > 0;
    // Su ingreso principal llega el día que toca (con el descuento del adelanto, si ese día tiene).
    if (esPago) ev.push({ t: 'llega', ing: 'sueldo', ocu: f, monto: p.principal.monto - cont.descuentoDe(f), lugar: p.principal.lugar });
    // Los aportes del cuchubal, el mismo día que le pagan (o el 15, sin ingreso fijo).
    const cuchu = p.pagos.find((x) => x.id === 'cuchubal');
    if (fechasDe(cuchu, f, f, p.principal).length && f >= p.inicio) ev.push({ t: 'pagar', pago: 'cuchubal', ocu: f, monto: cuchu.monto, medio: 'efectivo' });
    // La pareja (el 28) y la remesa (el 10, un poco menos de lo esperado).
    if (d === 28) ev.push({ t: 'llega', ing: 'pareja', ocu: f, monto: c(350), lugar: 'efectivo' });
    if (d === 10 && f > p.inicio) ev.push({ t: 'llega', ing: 'remesa', ocu: f, monto: c(98), lugar: 'agricola' });
    if (f === '2026-12-12') ev.push({ t: 'llega', ing: 'aguinaldo', ocu: f, monto: c(400), lugar: 'agricola' });
    if (f === '2026-12-20') ev.push({ t: 'llega', ing: 'q25', ocu: f, monto: c(300), lugar: 'agricola' });
    if (f === '2026-12-15') ev.push({ t: 'llega', ing: 'turno', ocu: f, monto: c(160), lugar: 'efectivo' });
    // Ventas (solo quien vende): lunes, miércoles y viernes.
    if (p.tipo === 'variable' && [1, 3, 5].includes(diaSem(f)) && f > p.inicio) ev.push({ t: 'venta', monto: c(40 + (d % 5) * 5), lugar: 'efectivo' });
    // Gastos fijos y cuotas, el día que vencen.
    const montoReal = { luz: { '2026-11-12': c(33.8), '2026-12-12': c(36.1) } };
    for (const x of p.pagos) {
        if (x.id === 'cuchubal') continue;
        if (!fechasDe(x, f, f).length || f <= p.inicio) continue;
        if (x.id === 'prestamo' && f === '2026-11-25') ev.push({ t: 'pagar', pago: x.id, ocu: f, monto: c(30), medio: 'efectivo' });
        else ev.push({ t: 'pagar', pago: x.id, ocu: f, monto: (montoReal[x.id] || {})[f] || x.monto, medio: x.medio });
    }
    // Lo que faltó del préstamo, dos días después.
    if (f === '2026-11-27') ev.push({ t: 'pagar', pago: 'prestamo', ocu: '2026-11-25', monto: c(20), medio: 'efectivo' });
    // La tarjeta: el estado de cuenta del corte del 15 oct (deuda de antes de empezar), una compra, sus pagos y abonos.
    if (f === '2026-10-22') ev.push({ t: 'estado', mas: c(120), minimo: c(10), motivo: 'compras' });
    if (f === '2026-10-24') ev.push({ t: 'gasto', nombre: 'Ropa', categoria: 'ropa', monto: c(45), medio: 'bac' });
    if (f === '2026-11-05') ev.push({ t: 'abono', monto: c(120), lugar: 'agricola' });
    if (f === '2026-11-16') ev.push({ t: 'estado', mas: c(3), minimo: c(10), motivo: 'intereses' });
    if (f === '2026-12-05') ev.push({ t: 'abono', monto: c(50), lugar: 'agricola' });
    if (f === '2026-12-10') ev.push({ t: 'abono', monto: cont.tarjetaInfo().porPagarEstado, lugar: 'agricola' });
    if (f === '2026-12-03') ev.push({ t: 'gasto', nombre: 'Farmacia', categoria: 'salud', monto: c(20), medio: 'bac' });
    if (f === '2026-12-16') ev.push({ t: 'estado', mas: 0, minimo: c(10), motivo: null });
    // Presupuestos: el súper se cumple, la comida afuera se pasa y la gasolina se cierra con «Ya terminé» y se reabre.
    if (per) {
        const dia = cont.diaDelPeriodo(f);
        if (dia === 1) ev.push({ t: 'gasto', nombre: 'Súper', categoria: 'super', monto: e(60), medio: 'debito' });
        if (dia === 4) ev.push({ t: 'gasto', nombre: 'Súper', categoria: 'super', monto: e(45), medio: f === '2026-11-02' ? 'bac' : 'debito' });
        if (dia === 8) ev.push({ t: 'gasto', nombre: 'Súper', categoria: 'super', monto: e(35), medio: 'debito' });
        if (dia === 2) ev.push({ t: 'gasto', nombre: 'Pupusas', categoria: 'comida', monto: e(30), medio: 'efectivo' });
        if (dia === 6) ev.push({ t: 'gasto', nombre: 'Pizza', categoria: 'comida', monto: e(25), medio: 'efectivo' });
        if (dia === 3) ev.push({ t: 'gasto', nombre: 'Gasolina', categoria: 'transporte', monto: e(20), medio: 'efectivo' });
        // Ahorro programado: «Ya lo guardé» al día siguiente de que le pagan (o el 2 de cada mes, sin ingreso fijo).
        if (dia === 2) ev.push({ t: 'guardarProgramado', ahorro: 'emerg' });
    }
    if (f === '2026-10-26') ev.push({ t: 'terminar', variable: 'gasolina' });
    if (f === '2026-10-27') ev.push({ t: 'reabrir', variable: 'gasolina' });
    if (f === '2026-10-27') ev.push({ t: 'gasto', nombre: 'Gasolina', categoria: 'transporte', monto: e(15), medio: 'efectivo' });
    // Un gasto mal anotado y su corrección; mover; guardar aparte; usar de un ahorro; un cuadre con $5 sin detalle.
    if (f === '2026-10-23') ev.push({ t: 'gasto', nombre: 'Tortillas', categoria: 'mercado', monto: c(12), medio: 'efectivo', ref: 'tortillas' });
    if (f === '2026-10-24') ev.push({ t: 'corregir', ref: 'tortillas', monto: c(15) });
    if (f === '2026-11-01') ev.push({ t: 'mover', de: 'agricola', a: 'efectivo', monto: c(50) });
    if (f === '2026-11-16') ev.push({ t: 'apartar', ahorro: 'viaje', monto: c(50), lugar: 'agricola' });
    if (f === '2026-11-21') ev.push({ t: 'usar', ahorro: 'emerg', monto: c(50) });
    if (f === '2026-11-10') ev.push({ t: 'cuadre', lugar: 'efectivo', menos: c(5) });
    // El adelanto: llega a efectivo y se descuenta (con $10 de comisión) del primer pago que viene después.
    if (p.principal && f === cont.adelanto.fecha) ev.push({ t: 'adelanto', monto: cont.adelanto.monto, descuento: cont.adelanto.descuento, de: cont.adelanto.de, lugar: 'efectivo' });
    return ev;
}

// ------------------------------------------------------------------ el contador
/**
 * Lleva el dinero de la persona como lo llevaría ella en un cuaderno: cuánto hay en cada cuenta, en cada ahorro, lo que
 * debe y lo que ya pagó de su plan. Con eso dice su libre de hoy (D-3, D-4, C-1, C-3, C-7 tal como están escritas en el
 * LEEME) y qué cae en cada periodo de Mi plan (R1 a R4 de la v2.9). No usa nada de motor.js.
 */
function contador(p) {
    const k = {
        hoy: p.inicio,
        cuentas: { ...p.saldos },
        ahorros: Object.fromEntries(p.ahorros.map((a) => [a.id, { ...a }])),
        deudas: Object.fromEntries(p.pagos.filter((x) => x.debe).map((x) => [x.id, x.debe])),
        pagado: {}, // `${pago}:${ocu}` → { monto, parcial }
        llegado: {}, // `${ing}:${ocu}` → monto
        gastos: [], // { fecha, monto, categoria, medio, variable, pago }
        ingresos: [], // { fecha, monto, categoria }
        cerrado: {}, // `${variable}:${clavePeriodo}`
        guardado: {}, // `${ahorro}:${clavePeriodo}`
        sinDetalle: [], // { fecha, monto } (negativo: salió)
        tarjeta: { estados: [{ corte: p.tarjeta.primerCorte, vence: p.tarjeta.primerVence, inicial: true }], abonos: [], compras: [] },
        cargosTarjeta: [],
        descuentos: {}, // fecha del pago principal → monto
        adelanto: null,
    };
    const pr = p.principal;
    const dias = (desde, hasta) => (pr ? fechasDe(pr, desde, hasta) : []);
    /** El día de pago (o el inicio del mes, sin ingreso fijo) que abre el periodo de una fecha. */
    k.inicioPeriodo = (f) => (pr ? dias(mas(f, -40), f).at(-1) : f.slice(0, 8) + '01');
    k.finPeriodo = (ini) => (pr ? mas(dias(mas(ini, 1), mas(ini, 40))[0], -1) : fecha(+ini.slice(0, 4), +ini.slice(5, 7), 31));
    k.periodoDe = (f) => { const ini = k.inicioPeriodo(f); return ini ? { ini, fin: k.finPeriodo(ini) } : null; };
    k.diaDelPeriodo = (f) => { const x = k.periodoDe(f); return x ? Math.round((aD(f) - aD(x.ini)) / 864e5) : null; };
    k.descuentoDe = (f) => k.descuentos[f] || 0;
    // El adelanto: el primer martes de noviembre (quincena), el 10 (mes) o el miércoles 4 (semana), del pago que sigue.
    if (pr) {
        const fa = p.tipo === 'quincena' ? '2026-11-03' : p.tipo === 'mes' ? '2026-11-10' : '2026-11-04';
        const de = dias(mas(fa, 1), mas(fa, 40))[0];
        k.adelanto = { fecha: fa, monto: c(200), descuento: c(210), de };
    }
    // El periodo que tiene la plata: la quincena empieza el día de pago CUYO dinero ya llegó (o es de antes de empezar).
    const llegoPrincipal = (f) => f < p.inicio || k.llegado[`sueldo:${f}`] !== undefined;
    k.horizonte = () => {
        if (!pr) return { fecha: fecha(+k.hoy.slice(0, 4), +k.hoy.slice(5, 7), 31) > k.hoy ? mas(fecha(+k.hoy.slice(0, 4), +k.hoy.slice(5, 7), 31), 1) : mas(k.hoy, 1) };
        const pend = dias(mas(k.hoy, -40), k.hoy).filter((f) => !llegoPrincipal(f));
        if (pend.length) return { fecha: pend[0], porConfirmar: true };
        return { fecha: dias(mas(k.hoy, 1), mas(k.hoy, 40))[0] };
    };
    k.tienes = () => Object.values(k.cuentas).reduce((a, b) => a + b, 0);
    k.ahorrosDentro = () => Object.values(k.ahorros).filter((a) => a.donde !== 'aparte').reduce((s, a) => s + a.monto, 0);
    k.ahorrosAparte = () => Object.values(k.ahorros).filter((a) => a.donde === 'aparte').reduce((s, a) => s + a.monto, 0);
    const pagoDe = (id) => p.pagos.find((x) => x.id === id);
    const enTarjeta = (x) => x.medio === 'bac';
    /** Lo que falta de una ocurrencia (0 si ya está pagada; lo que falta si fue en parte). */
    const faltaDe = (x, f) => {
        const h = k.pagado[`${x.id}:${f}`];
        if (!h) return x.monto;
        if (x.estimado) return 0;
        return Math.max(0, x.monto - h.monto);
    };
    /** El tope que sigue en el plan de un presupuesto este periodo (0 con «Ya terminé»). */
    const gastadoEn = (v, ini, fin) => k.gastos.filter((g) => g.variable === v.id && g.fecha >= ini && g.fecha <= fin).reduce((s, g) => s + g.monto, 0);
    // ---- la tarjeta (D-4 y C-7, escritas en palabras en el LEEME)
    k.tarjetaInfo = () => {
        const t = k.tarjeta;
        const ult = t.estados.at(-1);
        const abonos = t.abonos.filter((a) => a.fecha > ult.corte || (a.fecha === ult.corte && a.seq > (ult.seq || Infinity)));
        const pagado = abonos.reduce((s, a) => s + a.monto, 0);
        const comprasDespues = t.compras.filter((g) => g.fecha > ult.corte);
        const comprasLibre = comprasDespues.filter((g) => !g.pago).reduce((s, g) => s + g.monto, 0);
        if (ult.inicial) {
            const estimado = Math.max(0, p.tarjeta.usual - pagado);
            return { ult, pagado, estimado, porPagarEstado: 0, deCompras: 0, comoPago: estimado, comprasLibre, vence: ult.vence };
        }
        const porPagarEstado = Math.max(0, ult.aPagar - pagado);
        const deCompras = Math.max(0, Math.min(ult.aPagar, ult.anotadoLibre) - pagado);
        return { ult, pagado, estimado: 0, porPagarEstado, deCompras, comoPago: porPagarEstado - deCompras, comprasLibre, vence: ult.vence };
    };
    /** D-3: Libre = cuentas − ahorros dentro − lo que falta de tu plan hasta tu próximo ingreso. */
    k.libre = () => {
        const hz = k.horizonte();
        const lineas = [];
        for (const x of p.pagos) {
            if (enTarjeta(x)) continue; // C-7: va dentro del pago de la tarjeta
            for (const f of fechasDe(x, p.inicio, mas(hz.fecha, -1), pr)) {
                if (f <= p.inicio && x.id !== 'cuchubal') continue;
                if (x.id === 'cuchubal' && f < p.inicio) continue;
                const falta = faltaDe(x, f);
                if (falta > 0 && !(x.id === 'cuchubal' && f === p.inicio)) lineas.push({ q: 'pago', id: x.id, f, monto: falta });
            }
        }
        const ti = k.tarjetaInfo();
        // Lo que ya compraste con ella (bajó tu libre ese día) y la parte del pago que toca a este periodo.
        if (ti.deCompras) lineas.push({ q: 'tarjeta-compras', monto: ti.deCompras });
        if (ti.comprasLibre) lineas.push({ q: 'tarjeta-nuevas', monto: ti.comprasLibre });
        if (ti.comoPago && ti.vence < hz.fecha) lineas.push({ q: 'tarjeta-pago', monto: ti.comoPago });
        const per = k.periodoDe(k.hoy);
        const clave = per ? per.ini : null;
        const perPlan = k.periodoPlan();
        for (const v of p.variables) {
            if (k.cerrado[`${v.id}:${perPlan.ini}`]) continue;
            const falta = Math.max(0, v.tope - gastadoEn(v, perPlan.ini, perPlan.fin));
            if (falta) lineas.push({ q: 'presupuesto', id: v.id, monto: falta });
        }
        for (const a of p.ahorros.filter((x) => x.programado)) if (!k.guardado[`${a.id}:${perPlan.ini}`]) lineas.push({ q: 'programado', id: a.id, monto: a.programado });
        const sale = lineas.reduce((s, x) => s + x.monto, 0);
        const base = k.tienes() - k.ahorrosDentro() - sale;
        return { libre: Math.max(0, base), base, sale, lineas, hz, clave };
    };
    /** El periodo del plan: del último día de pago cuyo dinero ya tienes al día antes del siguiente (C-3). */
    k.periodoPlan = () => {
        if (!pr) return { ini: k.hoy.slice(0, 8) + '01', fin: fecha(+k.hoy.slice(0, 4), +k.hoy.slice(5, 7), 31) };
        const hz = k.horizonte();
        const ini = dias(mas(k.hoy, -40), k.hoy).filter((f) => llegoPrincipal(f)).at(-1);
        return { ini, fin: hz.fecha > k.hoy ? mas(hz.fecha, -1) : k.hoy };
    };
    // ---- Mi plan por periodo (R1 a R4): lo que cae en cada periodo, una sola vez.
    /** Las pestañas: periodo actual (calendario), el próximo y el mes del calendario. */
    k.pestanas = () => {
        if (!pr) {
            const ini = k.hoy.slice(0, 8) + '01';
            const [y, m] = [+ini.slice(0, 4), +ini.slice(5, 7)];
            const sigIni = m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
            return { actual: { ini, fin: fecha(y, m, 31) }, proxima: { ini: sigIni, fin: fecha(+sigIni.slice(0, 4), +sigIni.slice(5, 7), 31) } };
        }
        const ini = dias(mas(k.hoy, -40), k.hoy).at(-1);
        const sig = dias(mas(k.hoy, 1), mas(k.hoy, 40))[0];
        return { actual: { ini, fin: mas(sig, -1) }, proxima: { ini: sig, fin: k.finPeriodo(sig) } };
    };
    /** Lo que vale para el plan el pago de la tarjeta que vence en un periodo futuro: lo que todavía no contaste. */
    k.tarjetaFutura = (desde, hasta) => {
        const ti = k.tarjetaInfo();
        if (ti.vence >= desde && ti.vence <= hasta && ti.comoPago > 0) return [{ id: 'bac', f: ti.vence, monto: ti.comoPago, total: ti.ult.inicial ? p.tarjeta.usual : ti.ult.aPagar, aprox: !!ti.ult.inicial }];
        return [];
    };
    /** El plan de un periodo que todavía no empieza (Próxima): lo que entra y lo que sale con ese dinero. */
    k.planFuturo = (desde, hasta, cuantos = 1) => {
        const entra = [];
        for (const ing of [pr && { ...pr, id: 'sueldo' }, ...p.ingresos].filter((x) => x && !x.anotadas)) {
            for (const f of fechasDe(ing, desde, hasta)) {
                if (k.llegado[`${ing.id}:${f}`] !== undefined) continue;
                const monto = ing.id === 'sueldo' ? ing.monto - k.descuentoDe(f) : ing.monto;
                entra.push({ id: ing.id, f, monto, aprox: !!ing.aprox });
            }
        }
        const sale = [];
        for (const x of p.pagos) {
            if (enTarjeta(x)) continue;
            for (const f of fechasDe(x, desde, hasta, pr)) {
                const falta = faltaDe(x, f);
                if (falta > 0) sale.push({ q: x.tipoDeuda ? 'deuda' : 'fijo', id: x.id, f, monto: falta, aprox: !!x.estimado && !k.pagado[`${x.id}:${f}`] });
            }
        }
        for (const t of k.tarjetaFutura(desde, hasta)) sale.push({ q: 'tarjeta', ...t });
        for (const v of p.variables) sale.push({ q: 'presupuesto', id: v.id, monto: v.tope * cuantos });
        for (const a of p.ahorros.filter((x) => x.programado)) sale.push({ q: 'programado', id: a.id, monto: a.programado * cuantos });
        const E = entra.reduce((s, x) => s + x.monto, 0);
        const S = sale.reduce((s, x) => s + x.monto, 0);
        return { entra, sale, E, S, quedan: E - S, aprox: entra.some((x) => x.aprox) || sale.some((x) => x.aprox) };
    };
    /**
     * Mes (por fecha): lo que entra y sale ese mes. Lo pagado, por lo que pagaste; lo que falta, por tu plan. De un estado de
     * cuenta, solo lo que no contaste al comprar. Tus presupuestos y tu ahorro, una vez por cada periodo que empieza ese mes.
     * Un ingreso de una vez que ya pasó no está (está en Mes, la pantalla).
     */
    k.planMes = (mes) => {
        const [y, m] = mes.split('-').map(Number);
        const desde = `${mes}-01`;
        const hasta = fecha(y, m, 31);
        const entra = [];
        for (const ing of [pr && { ...pr, id: 'sueldo' }, ...p.ingresos].filter((x) => x && !x.anotadas)) {
            for (const f of fechasDe(ing, desde, hasta)) {
                if (f < p.inicio) continue;
                if (ing.frecuencia === 'unico' && (f < k.hoy || k.llegado[`${ing.id}:${f}`] !== undefined)) continue;
                const llego = k.llegado[`${ing.id}:${f}`];
                const monto = llego !== undefined ? llego : ing.id === 'sueldo' ? ing.monto - k.descuentoDe(f) : ing.monto;
                entra.push({ id: ing.id, f, monto, aprox: llego === undefined && !!ing.aprox });
            }
        }
        const sale = [];
        for (const x of p.pagos) {
            if (enTarjeta(x)) continue;
            for (const f of fechasDe(x, desde, hasta, pr)) {
                if (f <= p.inicio && !(x.id === 'cuchubal' && f >= p.inicio)) continue;
                const h = k.pagado[`${x.id}:${f}`];
                const monto = h && (x.estimado || h.monto >= x.monto) ? h.monto : x.monto;
                sale.push({ q: x.tipoDeuda ? 'deuda' : 'fijo', id: x.id, f, monto, aprox: !h && !!x.estimado });
            }
        }
        for (const e of k.tarjeta.estados) {
            if (e.vence < desde || e.vence > hasta) continue;
            if (e.inicial) sale.push({ q: 'tarjeta', id: 'bac', f: e.vence, monto: p.tarjeta.usual, aprox: true });
            else if (e.aPagar > 0) sale.push({ q: 'tarjeta', id: 'bac', f: e.vence, monto: e.aPagar - Math.min(e.aPagar, e.anotadoLibre), total: e.aPagar });
        }
        const inicioPlan = k.periodoPlan.inicioCreacion;
        const veces = pr ? fechasDe(pr, desde > inicioPlan ? desde : inicioPlan, hasta).length : 1;
        for (const v of p.variables) if (veces) sale.push({ q: 'presupuesto', id: v.id, monto: v.tope * veces });
        for (const a of p.ahorros.filter((x) => x.programado)) if (veces) sale.push({ q: 'programado', id: a.id, monto: a.programado * veces });
        const E = entra.reduce((s2, x) => s2 + x.monto, 0);
        const S = sale.reduce((s2, x) => s2 + x.monto, 0);
        return { entra, sale, E, S, quedan: E - S, aprox: entra.some((x) => x.aprox) || sale.some((x) => x.aprox) };
    };
    // El primer periodo de tu plan (desde cuándo cuentan tus presupuestos y tu ahorro): el que tenías al empezar.
    k.periodoPlan.inicioCreacion = pr ? dias(mas(p.inicio, -40), p.inicio).at(-1) : p.inicio.slice(0, 8) + '01';
    /** R10: las pestañas que debe tener. */
    k.tabs = p.tipo === 'quincena' ? ['Esta quincena', 'Próxima', 'Mes'] : p.tipo === 'semana' ? ['Esta semana', 'Próxima', 'Mes'] : ['Este mes', 'Próximo mes'];
    return k;
}

/** Aplica un evento al contador (lo que la persona hizo, en su cuaderno). */
function aplicarContador(p, k, ev) {
    const pagoDe = (id) => p.pagos.find((x) => x.id === id);
    const medioLugar = { efectivo: 'efectivo', debito: 'agricola', transferencia: 'agricola', bac: null };
    const variableDe = (g) => (g.pago ? null : p.variables.find((v) => v.categoria === g.categoria) || null);
    if (ev.t === 'llega') {
        k.cuentas[ev.lugar] += ev.monto;
        k.llegado[`${ev.ing}:${ev.ocu}`] = ev.monto;
        k.ingresos.push({ fecha: k.hoy, monto: ev.monto, categoria: ev.ing });
    } else if (ev.t === 'venta') {
        k.cuentas[ev.lugar] += ev.monto;
        k.ingresos.push({ fecha: k.hoy, monto: ev.monto, categoria: 'venta' });
    } else if (ev.t === 'pagar') {
        const x = pagoDe(ev.pago);
        const l = medioLugar[ev.medio];
        if (l) k.cuentas[l] -= ev.monto;
        const ant = k.pagado[`${x.id}:${ev.ocu}`];
        k.pagado[`${x.id}:${ev.ocu}`] = { monto: (ant ? ant.monto : 0) + ev.monto };
        if (k.deudas[x.id] !== undefined) k.deudas[x.id] = Math.max(0, k.deudas[x.id] - ev.monto);
        const g = { fecha: k.hoy, monto: ev.monto, categoria: x.categoria, medio: ev.medio, pago: x.id, variable: null };
        k.gastos.push(g);
        if (!l) k.tarjeta.compras.push(g);
    } else if (ev.t === 'gasto') {
        const l = medioLugar[ev.medio];
        if (l) k.cuentas[l] -= ev.monto;
        const g = { fecha: k.hoy, monto: ev.monto, categoria: ev.categoria, medio: ev.medio, ref: ev.ref || null };
        g.variable = variableDe(g)?.id || null;
        k.gastos.push(g);
        if (!l) k.tarjeta.compras.push(g);
    } else if (ev.t === 'corregir') {
        const g = k.gastos.find((x) => x.ref === ev.ref);
        const l = medioLugar[g.medio];
        if (l) k.cuentas[l] += g.monto - ev.monto;
        g.monto = ev.monto;
    } else if (ev.t === 'abono') {
        k.cuentas[ev.lugar] -= ev.monto;
        k.tarjeta.abonos.push({ fecha: k.hoy, monto: ev.monto, seq: k.seq = (k.seq || 0) + 1 });
    } else if (ev.t === 'estado') {
        const t = k.tarjeta;
        const ult = t.estados.at(-1);
        const corte = ult.inicial ? ult.corte : fecha(+k.hoy.slice(0, 4), +k.hoy.slice(5, 7), p.tarjeta.corte) <= k.hoy ? fecha(+k.hoy.slice(0, 4), +k.hoy.slice(5, 7), p.tarjeta.corte) : null;
        const vence = ult.inicial ? ult.vence : (() => { const [y, m] = [+corte.slice(0, 4), +corte.slice(5, 7)]; return m === 12 ? fecha(y + 1, 1, p.tarjeta.pagoDia) : fecha(y, m + 1, p.tarjeta.pagoDia); })();
        const comprasCiclo = ult.inicial ? [] : t.compras.filter((g) => g.fecha > ult.corte && g.fecha <= corte);
        const anotado = comprasCiclo.reduce((s, g) => s + g.monto, 0);
        const anotadoLibre = comprasCiclo.filter((g) => !g.pago).reduce((s, g) => s + g.monto, 0);
        if (ult.inicial) t.estados.pop();
        const total = anotado + ev.mas;
        t.estados.push({ corte, vence, total, aPagar: total, anotado, anotadoLibre, seq: (k.seq = (k.seq || 0) + 1) });
        if (total > anotado) k.cargosTarjeta.push({ fecha: corte, monto: total - anotado });
    } else if (ev.t === 'terminar') {
        k.cerrado[`${ev.variable}:${k.periodoPlan().ini}`] = true;
    } else if (ev.t === 'reabrir') {
        delete k.cerrado[`${ev.variable}:${k.periodoPlan().ini}`];
    } else if (ev.t === 'guardarProgramado') {
        const a = k.ahorros[ev.ahorro];
        const clave = k.periodoPlan().ini;
        if (!k.guardado[`${a.id}:${clave}`]) {
            k.guardado[`${a.id}:${clave}`] = true;
            a.monto += a.programado;
        }
    } else if (ev.t === 'apartar') {
        const a = k.ahorros[ev.ahorro];
        a.monto += ev.monto;
        if (a.donde === 'aparte') k.cuentas[ev.lugar] -= ev.monto;
    } else if (ev.t === 'usar') {
        const a = k.ahorros[ev.ahorro];
        a.monto -= ev.monto;
        if (a.donde === 'aparte') k.cuentas.efectivo += ev.monto;
    } else if (ev.t === 'mover') {
        k.cuentas[ev.de] -= ev.monto;
        k.cuentas[ev.a] += ev.monto;
    } else if (ev.t === 'cuadre') {
        k.cuentas[ev.lugar] -= ev.menos;
        k.sinDetalle.push({ fecha: k.hoy, monto: -ev.menos });
    } else if (ev.t === 'adelanto') {
        k.cuentas[ev.lugar] += ev.monto;
        k.llegado[`adelanto:${k.hoy}`] = ev.monto;
        k.ingresos.push({ fecha: k.hoy, monto: ev.monto, categoria: 'adelanto' });
        k.descuentos[ev.de] = ev.descuento;
    }
}

// ------------------------------------------------------------------ la app (en el navegador)
const EN_PAGINA = String.raw`
window.__p29 = (() => {
    const M = window.MOTOR;
    const c = (x) => x;
    function armar(p) {
        P.sinGuardar = true;
        const st = { persona: 'uso', nombre: p.nombre, espacio: 'Casa de ' + p.nombre, hoy: p.inicio, inicio: p.inicio, configurado: true,
            horizonteVariable: p.principal ? null : 'finDeMes', lugares: [], tarjetas: [], medios: [], apartados: [], logros: [], pagos: [], ingresos: [], registros: [], avisos: [], reservasTarjeta: [], seq: 1, interesInvitar: false };
        for (const [id, tipo, nombre, emoji] of p.lugares) st.lugares.push({ id, tipo, nombre, emoji });
        st.medios = [
            { id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' },
            { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'agricola', tarjetaDebito: true },
            { id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: 'agricola' },
            { id: 'bac', nombre: 'Crédito BAC', emoji: '💳', tarjeta: 'bac' },
        ];
        // Primer día: cuenta lo que tiene en cada cuenta.
        for (const l of st.lugares) {
            const r = { id: 'r' + st.seq, seq: st.seq++, tipo: 'cuadre', fecha: p.inicio, lugar: l.id, monto: p.saldos[l.id], esperado: p.saldos[l.id], primero: true };
            st.registros.push(r);
            l.cuadre = { fecha: p.inicio, seq: r.seq, monto: r.monto };
        }
        const t = p.tarjeta;
        st.tarjetas.push({ id: t.id, nombre: t.nombre, apodo: t.apodo, emoji: '💳', tipo: 'tarjeta', corte: t.corte, pagoDia: t.pagoDia, desfase: 1, cupo: t.cupo, pagoUsual: t.usual, desde: p.inicio, medio: 'debito',
            estados: [{ corte: t.primerCorte, total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: t.primerVence, inicial: true }] });
        if (p.principal) {
            const pr = p.principal;
            st.ingresos.push({ id: 'sueldo', nombre: pr.nombre, emoji: '💼', categoria: 'salario', monto: pr.monto, aprox: false, frecuencia: pr.frecuencia, ...(pr.dias ? { dias: pr.dias } : {}), ...(pr.dia ? { dia: pr.dia } : {}), ...(pr.diaSemana !== undefined ? { diaSemana: pr.diaSemana } : {}), lugar: pr.lugar, principal: true, desde: p.inicio, creado: p.inicio, llegadas: {} });
        }
        for (const i of p.ingresos.filter((x) => !x.anotadas)) st.ingresos.push({ id: i.id, nombre: i.nombre, emoji: '💵', categoria: i.categoria, monto: i.monto, aprox: !!i.aprox, frecuencia: i.frecuencia, ...(i.dia ? { dia: i.dia } : {}), ...(i.fecha ? { fecha: i.fecha } : {}), lugar: i.lugar, principal: false, extra: true, desde: p.inicio, creado: p.inicio, llegadas: {} });
        for (const x of p.pagos) {
            st.pagos.push({ id: x.id, nombre: x.nombre, emoji: x.emoji, categoria: x.categoria, monto: x.monto, estimado: !!x.estimado, frecuencia: x.frecuencia, ...(x.dia ? { dia: x.dia } : {}), ...(x.frecuencia === 'ingreso' ? { conIngreso: 'sueldo' } : {}),
                medio: x.medio, avisos: [], desde: x.frecuencia === 'ingreso' ? p.inicio : M.sumarDias(p.inicio, 1), creado: p.inicio, hechos: {}, previos: [], ...(x.automatico ? { automatico: true } : {}), ...(x.tipoPago ? { tipoPago: x.tipoPago } : {}),
                ...(x.tipoDeuda ? { tipoDeuda: x.tipoDeuda, deuda: { debe: x.debe } } : {}) });
        }
        const per = M.periodoPlan(st);
        st.variables = p.variables.map((v) => ({ id: v.id, nombre: v.nombre, emoji: v.emoji, categoria: v.categoria, tope: v.tope, medio: v.medio, desde: per.inicio, creado: p.inicio, cierres: {}, activo: true }));
        for (const a of p.ahorros) st.apartados.push({ id: a.id, nombre: a.nombre, emoji: a.emoji, portada: 'general-alcancia', monto: a.monto, meta: null, metaFecha: null, historial: [{ fecha: p.inicio, tipo: 'inicial', monto: a.monto }],
            donde: a.donde === 'aparte' ? 'aparte' : { lugar: a.donde }, ...(a.programado ? { programado: { monto: a.programado, desde: per.inicio } } : {}) });
        P.cargar(st, { tab: 'hoy' });
        // Sin cuadritos ni consejos de primera vez: no son parte de la cuenta.
        if (P.modos && P.modos.cerrarNovedades) try { P.modos.cerrarNovedades(); } catch (e) {}
        return true;
    }
    const refs = {};
    function aplicar(ev) {
        const s = P.st;
        if (ev.t === 'llega') P.llegoIngreso(s, ev.ing, ev.ocu, { monto: ev.monto, lugar: ev.lugar, fecha: s.hoy });
        else if (ev.t === 'venta') P.registrar(s, { tipo: 'ingreso', fecha: s.hoy, monto: ev.monto, nombre: 'Venta', categoria: 'venta', emoji: '🫓', lugar: ev.lugar, anotado: true, nuevo: true });
        else if (ev.t === 'pagar') P.marcarPagado(s, ev.pago, ev.ocu, { monto: ev.monto, medio: ev.medio, fecha: s.hoy });
        else if (ev.t === 'gasto') {
            const r = P.registrar(s, { tipo: 'gasto', fecha: s.hoy, monto: ev.monto, nombre: ev.nombre, categoria: ev.categoria, emoji: '🧾', medio: ev.medio, anotado: true, nuevo: true, lugar: M.medio(s, ev.medio).lugar || null });
            if (ev.ref) refs[ev.ref] = r.id;
        } else if (ev.t === 'corregir') {
            const r = s.registros.find((x) => x.id === refs[ev.ref]);
            r.monto = ev.monto;
        } else if (ev.t === 'abono') P.pagarTarjeta(s, 'bac', { monto: ev.monto, lugar: ev.lugar, fecha: s.hoy });
        else if (ev.t === 'estado') {
            P.abrirHoja('estadoCuenta', { id: 'bac' });
            const h = P.ui.hoja;
            const total = h.anotado + ev.mas;
            Object.assign(h, { total: (total / 100).toFixed(2), minimo: (Math.min(ev.minimo, total) / 100).toFixed(2), opcion: 'total', motivo: ev.mas > 0 ? ev.motivo || 'nose' : null });
            P.acciones.ecGuardar();
        } else if (ev.t === 'terminar') P.cerrarVariable(s, ev.variable, 'listo');
        else if (ev.t === 'reabrir') {
            if (P.reabrirVariable) P.reabrirVariable(s, ev.variable);
            else { const x = M.variablesInfo(s).find((y) => y.v.id === ev.variable); if (x) delete x.v.cierres[x.periodo.clave]; }
        } else if (ev.t === 'guardarProgramado') P.guardarProgramado(s, ev.ahorro);
        else if (ev.t === 'apartar') P.apartarEn(s, ev.ahorro, ev.monto, 'apartar', { lugar: ev.lugar });
        else if (ev.t === 'usar') P.apartarEn(s, ev.ahorro, ev.monto, 'liberar');
        else if (ev.t === 'mover') P.registrar(s, { tipo: 'mover', fecha: s.hoy, monto: ev.monto, de: ev.de, a: ev.a, nombre: 'Mover dinero', nuevo: true });
        else if (ev.t === 'cuadre') P.cuadrar(s, ev.lugar, M.saldoLugar(s, ev.lugar) - ev.menos);
        else if (ev.t === 'adelanto') {
            const id = 'adelanto';
            s.ingresos.push({ id, nombre: 'Adelanto de salario', emoji: '💵', categoria: 'otro', tipoIngreso: 'adelanto', monto: ev.monto, aprox: false, frecuencia: 'unico', fecha: s.hoy, lugar: ev.lugar, principal: false, extra: true, desde: s.hoy, llegadas: {} });
            P.llegoIngreso(s, id, s.hoy, { monto: ev.monto, lugar: ev.lugar, fecha: s.hoy });
            M.ingreso(s, id).adelanto = { descuentos: [{ ingreso: 'sueldo', fecha: ev.de, monto: ev.descuento }] };
        }
        P.ui.hoja = null;
    }
    function dia(f, eventos) {
        P.st.hoy = f;
        for (const ev of eventos) aplicar(ev);
        P.ui.hoja = null;
        P.ui.stack = [];
        P.ui.tab = 'hoy';
        P.render({ nueva: true });
        return true;
    }
    const num = (t) => { const m = /(−|-)?\$([\d,]+\.\d{2})/.exec(t || ''); return m ? (m[1] ? -1 : 1) * Math.round(parseFloat(m[2].replace(/,/g, '')) * 100) : null; };
    const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    function leerHoy() {
        P.ui.stack = []; P.ui.hoja = null; P.irTab('hoy');
        return { libre: num(txt(document.querySelector('.portada-n'))), libreTxt: txt(document.querySelector('.portada-n')) };
    }
    function leerDinero() {
        const k = P.calc();
        P.ui.stack = []; P.irTab('midinero'); P.abrir('cuentas');
        const cuentas = {};
        for (const l of P.st.lugares) { const el = document.querySelector('[data-fk="l-' + l.id + '"]'); cuentas[l.id] = num(txt(el)); }
        P.ui.stack = []; P.irTab('midinero'); P.abrir('ahorros');
        const ahorros = {};
        for (const a of P.st.apartados) { const el = document.querySelector('[data-fk="ap-' + a.id + '"]') || [...document.querySelectorAll('#pantalla button, #pantalla a')].find((b) => b.textContent.includes(a.nombre)); ahorros[a.id] = num(txt(el)); }
        const deudas = Object.fromEntries(P.st.pagos.filter((p) => p.deuda && Number.isInteger(p.deuda.debe)).map((p) => [p.id, p.deuda.debe]));
        P.ui.stack = [];
        return { cuentas, ahorros, deudas, tienes: k.tienes, apartado: k.apartado, aparte: k.aparte };
    }
    function leerPlan(vista, modo, mes) {
        P.ui.stack = []; P.ui.hoja = null;
        P.ui.pagosVista = vista; P.ui.pagosModo = modo; if (mes) P.ui.pagosMes = mes;
        P.irTab('pagos');
        const panel = document.getElementById('plan-panel') || document.getElementById('pantalla');
        const filas = [...panel.querySelectorAll('.pl-b, .pt-fila .fila-main')].map((b) => ({ fk: b.dataset.fk, t: txt(b), monto: b.dataset.monto !== undefined ? Number(b.dataset.monto) : num(txt(b.querySelector('.pl-m, .fila-m, .pl-t')) || txt(b)), cuenta: b.dataset.cuenta === undefined ? null : b.dataset.cuenta === '1', bloque: txt(b.closest('.pl-bloque')?.querySelector('.pl-h')) }));
        const secciones = [...panel.querySelectorAll('section.pt-sec')].map((s) => ({ id: s.getAttribute('aria-labelledby'), titulo: txt(s.querySelector('.pt-t')), n: txt(s.querySelector('.contador')), total: num(txt(s.querySelector('.pt-total'))), filas: [...s.querySelectorAll('.fila-main')].map((b) => ({ fk: b.dataset.fk, monto: b.dataset.monto !== undefined ? Number(b.dataset.monto) : num(txt(b.querySelector('.fila-m'))), cuenta: b.dataset.cuenta === undefined ? null : b.dataset.cuenta === '1' })) }));
        const res = { r: txt(panel.querySelector('.plan-res-r')), l: txt(panel.querySelector('.plan-res-l')), e: txt(panel.querySelector('.plan-res-e')), n: num(txt(panel.querySelector('.plan-res-n'))), nTxt: txt(panel.querySelector('.plan-res-n')), s: [...panel.querySelectorAll('.plan-res-s')].map(txt) };
        const bloques = [...panel.querySelectorAll('.pl-bloque .pl-h')].map(txt);
        const tip = txt(document.querySelector('#pantalla .tip p'));
        // «¿De dónde sale?» de esta pestaña.
        let desglose = null;
        const b = panel.querySelector('[data-fk="plan-resumen"]');
        if (b) {
            b.click();
            const h = document.getElementById('capa-hoja');
            desglose = { titulo: txt(h.querySelector('#hoja-t')), lineas: [...h.querySelectorAll('.d-fila')].map((li) => ({ signo: txt(li.querySelector('.d-signo')), t: txt(li.querySelector('.d-t')), m: num(txt(li.querySelector('.d-m'))) })), total: num(txt(h.querySelector('.d-total .d-m'))), totalT: txt(h.querySelector('.d-total .d-t')), texto: txt(h.querySelector('.hoja-c')) };
            P.cerrarHoja({ sinFoco: true });
        }
        const tabs = [...document.querySelectorAll('#pantalla .app-tab')].map(txt);
        const rango = (() => { const per = P.periodos ? P.periodos() : null; return per; })();
        return { vista, modo, filas, secciones, res, bloques, desglose, tabs, tip, texto: txt(panel) };
    }
    function leerMes(mes) {
        P.ui.stack = []; P.ui.hoja = null; if (mes) P.ui.mesVista = mes;
        P.irTab('mes');
        const l = txt(document.querySelector('.mes-res-l')) || '';
        const m = /Entraron\s*(\$[\d,.]+)\s*·\s*Salieron\s*(\$[\d,.]+)/.exec(l);
        return { linea: l, entro: m ? num(m[1]) : null, salio: m ? num(m[2]) : null, texto: txt(document.getElementById('pantalla')) };
    }
    return { armar, dia, leerHoy, leerDinero, leerPlan, leerMes, periodos: () => (P.periodos ? JSON.parse(JSON.stringify(P.periodos())) : null) };
})();
true;
`;

// ------------------------------------------------------------------ la comparación
const hallazgos = [];
const resumen = {};
const obs = [];
function hallazgo(per, f, area, que, seVe, deberia, sev = 'P0', dinero = false) {
    hallazgos.push({ persona: per, dia: f, area, que, seVe, deberia, sev, dinero });
}

/** Días clave: los de pago, el día antes, inicio y fin de mes, y los de eventos de la tarjeta, el adelanto y los presupuestos. */
function esDiaClave(p, k, f) {
    const pr = p.principal;
    const pago = pr && fechasDe(pr, f, f).length;
    const antes = pr && fechasDe(pr, mas(f, 1), mas(f, 1)).length;
    return f === p.inicio || pago || antes || f.endsWith('-01') || f.endsWith('-15') || ['2026-10-22', '2026-10-26', '2026-10-27', '2026-11-03', '2026-11-05', '2026-11-16', '2026-11-25', '2026-12-12', '2026-12-31'].includes(f);
}

async function correr(p, b) {
    const ev = (s) => b.evaluar(s);
    const k = contador(p);
    await ev(EN_PAGINA);
    await ev(`__p29.armar(${JSON.stringify(p)})`);
    const fin = '2026-12-31';
    let dias = 0;
    let comparados = 0;
    for (let f = p.inicio; f <= fin; f = mas(f, 1)) {
        k.hoy = f;
        const evs = f === p.inicio ? [] : eventosDel(p, f, k);
        for (const e of evs) aplicarContador(p, k, e);
        await ev(`__p29.dia(${JSON.stringify(f)}, ${JSON.stringify(evs)})`);
        dias++;
        // --- cada día: el dinero
        const L = k.libre();
        if (args.depurar === f) {
            console.log('CONTADOR', f, JSON.stringify({ tienes: k.tienes(), dentro: k.ahorrosDentro(), sale: L.sale, lineas: L.lineas, hz: L.hz, tarjeta: k.tarjetaInfo() }));
            console.log('APP', f, JSON.stringify(await ev(`(() => { const k = P.calc(); return { tienes: k.tienes, apartado: k.apartado, porPagar: k.porPagar, items: k.items.map((x) => [x.pago.nombre || x.pago.id, x.fecha, x.parte]), enTarjetas: k.enTarjetas, reservadoPagos: k.reservadoPagos, reservados: k.reservados.map((x) => [x.pago.nombre, x.fecha, x.parte]), faltaVariables: k.faltaVariables, vars: k.variables.map((x) => [x.v.id, x.falta, x.anotado]), faltaProgramado: k.faltaProgramado, libre: k.libre, hz: k.hz.fecha, t: k.tarjetas.map((t) => ({ enLibre: t.enLibre, porPagarEstado: t.porPagarEstado, comprasNetas: t.comprasNetas, comoPago: t.comoPago, conIngreso: t.conIngreso, estimado: t.estimado, deCompras: t.deCompras, vence: t.vence })) }; })()`)));
        }
        const hoy = await ev('__p29.leerHoy()');
        if (hoy.libre !== L.libre) hallazgo(p.id, f, 'Hoy · Libre', 'El libre no es el del contador', hoy.libreTxt, `${$(L.libre)} (cuentas ${$(k.tienes())} − ahorros ${$(k.ahorrosDentro())} − sale ${$(L.sale)})`, 'P0', true);
        const din = await ev('__p29.leerDinero()');
        for (const [l, s] of Object.entries(k.cuentas)) if (din.cuentas[l] !== s) hallazgo(p.id, f, 'Mi dinero · Cuentas', `Saldo de ${l}`, $(din.cuentas[l] ?? 0), $(s), 'P0', true);
        for (const a of Object.values(k.ahorros)) if (din.ahorros[a.id] !== null && din.ahorros[a.id] !== undefined && din.ahorros[a.id] !== a.monto) hallazgo(p.id, f, 'Mi dinero · Ahorros', `Ahorro ${a.nombre}`, $(din.ahorros[a.id]), $(a.monto), 'P0', true);
        for (const [d, debe] of Object.entries(k.deudas)) if (din.deudas[d] !== debe) hallazgo(p.id, f, 'Mi dinero · Deudas', `Lo que debe de ${d}`, $(din.deudas[d] ?? 0), $(debe), 'P0', true);
        // Observaciones (R5–R10): los nombres de las pestañas, el adelanto en su quincena, la ficha de un presupuesto.
        if (args.observar && (f === p.inicio || (k.adelanto && (f === k.adelanto.fecha || f === mas(k.adelanto.de, -1))) || f === '2026-10-26')) {
            obs.push({ persona: p.id, f, ...(await ev(`(() => {
                const leer = (v) => { P.ui.stack = []; P.ui.pagosVista = v; P.ui.pagosModo = 'fecha'; P.irTab('pagos'); const pn = document.getElementById('plan-panel'); return { tabs: [...document.querySelectorAll('#pantalla .app-tab')].map((t) => t.textContent.trim()), res: pn ? pn.querySelector('.plan-res')?.innerText.replace(/\s+/g, ' ') : null, filas: pn ? [...pn.querySelectorAll('.pl-b')].map((b) => b.innerText.replace(/\s+/g, ' ')) : [], ver: document.querySelector('.plan-ver')?.innerText, tip: document.querySelector('#pantalla .tip p')?.innerText }; };
                const out = { actual: leer('actual'), proxima: leer('proxima'), mes: leer('mes') };
                P.ui.stack = []; P.irTab('pagos'); P.abrir('variable', 'gasolina');
                out.fichaPresupuesto = [...document.querySelectorAll('#pantalla button')].map((b) => b.innerText.trim()).filter(Boolean);
                P.ui.stack = []; P.ui.pagosModo = 'tipo'; P.ui.pagosVista = 'actual'; P.ui.planAbiertas = { ingresos: true }; P.irTab('pagos');
                out.tipoIngresos = [...document.querySelectorAll('#pt-ingresos .fila-main')].map((b) => b.innerText.replace(/\s+/g, ' '));
                P.ui.stack = []; P.ui.pagosModo = 'fecha'; P.ui.planAbiertas = {};
                return out;
            })()`)) });
        }
        if (args.fotos && f === FOTO_DIA[p.id]) await fotos(p, b);
        if (!esDiaClave(p, k, f)) continue;
        comparados++;
        // --- días clave: Mi plan en cada pestaña
        const per = k.pestanas();
        for (const modo of ['fecha', 'tipo']) {
            const a = await ev(`__p29.leerPlan('actual', '${modo}')`);
            revisarActual(p, k, f, a, per.actual, L);
            if (JSON.stringify(a.tabs) !== JSON.stringify(k.tabs)) hallazgo(p.id, f, 'Mi plan · pestañas', 'R10: las pestañas no siguen al ingreso principal', a.tabs.join(' · '), k.tabs.join(' · '));
            const x = await ev(`__p29.leerPlan('proxima', '${modo}')`);
            revisarFuturo(p, k, f, x, per.proxima, k.tabs[1]);
            if (k.tabs.length === 3) {
                for (const mes of [f.slice(0, 7), mas(f.slice(0, 8) + '28', 7).slice(0, 7)]) {
                    const m = await ev(`__p29.leerPlan('mes', '${modo}', '${mes}')`);
                    revisarMes(p, k, f, m, mes);
                }
            }
        }
        // --- Mes (pantalla): lo que entró y salió en el mes de hoy, hasta hoy.
        const mes = await ev(`__p29.leerMes('${f.slice(0, 7)}')`);
        const ini = f.slice(0, 8) + '01';
        const entro = k.ingresos.filter((x) => x.fecha >= ini && x.fecha <= f).reduce((s, x) => s + x.monto, 0) + k.sinDetalle.filter((x) => x.fecha >= ini && x.monto > 0).reduce((s, x) => s + x.monto, 0);
        // Lo de antes de empezar (la deuda que trae el primer estado de cuenta, con fecha de su corte) no es de este mes.
        const salio = k.gastos.filter((x) => x.fecha >= ini && x.fecha <= f).reduce((s, x) => s + x.monto, 0) + k.cargosTarjeta.filter((x) => x.fecha >= ini && x.fecha <= f && x.fecha >= p.inicio).reduce((s, x) => s + x.monto, 0) - k.sinDetalle.filter((x) => x.fecha >= ini && x.monto < 0).reduce((s, x) => s + x.monto, 0);
        if (mes.entro !== entro) hallazgo(p.id, f, 'Mes · Entraron', 'Lo que entró en el mes', $(mes.entro ?? 0), $(entro), 'P0', true);
        if (mes.salio !== salio) hallazgo(p.id, f, 'Mes · Salieron', 'Lo que salió en el mes', $(mes.salio ?? 0), $(salio), 'P0', true);
    }
    resumen[p.id] = { dias, comparados, libreFinal: $(k.libre().libre), cuentas: Object.fromEntries(Object.entries(k.cuentas).map(([a, b]) => [a, $(b)])) };
}

const fechaDeFk = (fk) => { const m = /(\d{4}-\d{2}-\d{2})$/.exec(fk || ''); return m ? m[1] : null; };
/** R1/R3: nada de otro periodo; R2: total de cada sección = suma de sus filas que cuentan; sin secciones vacías. */
function revisarComun(p, f, v, desde, hasta, nombre) {
    for (const x of v.filas) {
        const fx = fechaDeFk(x.fk);
        if (fx && (fx < desde || fx > hasta)) hallazgo(p.id, f, `Mi plan · ${nombre} (${v.modo})`, 'R1: una fila de otro periodo', `${x.t}`, `solo del ${desde} al ${hasta}`);
        if (/^x-/.test(x.fk || '')) hallazgo(p.id, f, `Mi plan · ${nombre} (${v.modo})`, 'R3: «Más adelante» dentro de un periodo', x.t, 'nada fuera del periodo');
    }
    if (v.bloques.some((t) => /Más adelante/.test(t))) hallazgo(p.id, f, `Mi plan · ${nombre}`, 'R3: bloque «Más adelante»', 'Más adelante', 'sin «Más adelante»', 'P1');
    for (const s of v.secciones) {
        const suma = s.filas.filter((x) => x.cuenta !== false).reduce((a, x) => a + (x.monto || 0), 0);
        if (!s.filas.length) hallazgo(p.id, f, `Mi plan · ${nombre} (por tipo)`, 'R2: sección vacía a la vista', `${s.titulo} ${s.n} ${$(s.total ?? 0)}`, 'no se muestra', 'P1');
        else if (s.total !== suma) hallazgo(p.id, f, `Mi plan · ${nombre} (por tipo)`, 'R2: el total no es la suma de sus filas', `${s.titulo} ${s.n}: total ${$(s.total ?? 0)}`, `suma de filas ${$(suma)}`);
        for (const x of s.filas) {
            const fx = fechaDeFk(x.fk);
            if (fx && (fx < desde || fx > hasta)) hallazgo(p.id, f, `Mi plan · ${nombre} (por tipo)`, 'R1: una fila de otro periodo', x.fk, `solo del ${desde} al ${hasta}`);
        }
    }
    if (v.desglose && v.desglose.lineas.length) {
        let t = 0;
        for (const l of v.desglose.lineas) t += (l.signo === '−' ? -1 : 1) * (l.m || 0);
        // «Te faltarían $X» se muestra en positivo: es lo que falta.
        const signoTotal = /faltar/i.test(v.desglose.totalT || '') ? -1 : 1;
        if (v.desglose.total !== null && t !== signoTotal * v.desglose.total && !(v.desglose.total === 0 && t < 0)) hallazgo(p.id, f, `Mi plan · ${nombre} · ¿De dónde sale?`, 'R4: las líneas no suman el número grande', `${$(t)} ≠ ${$(v.desglose.total)}`, 'suma exacta');
    }
}
/** R1–R2: las filas que suman (por fecha) son las del contador, con su monto. Solo las que tienen fecha. */
function revisarFilas(p, f, v, x, nombre) {
    if (v.modo !== 'fecha' || !v.filas.some((y) => y.cuenta !== null)) return;
    const app = v.filas.filter((y) => y.cuenta && /\d{4}-\d{2}-\d{2}$/.test(y.fk || '')).map((y) => `${(y.fk.match(/\d{4}-\d{2}-\d{2}$/) || [])[0]} ${$(y.monto)}`).sort();
    const esperado = [...x.entra, ...x.sale].filter((y) => y.f).map((y) => `${y.f} ${$(y.monto)}`).sort();
    const sobran = app.filter((y, i) => app.indexOf(y) === i && app.filter((z) => z === y).length > esperado.filter((z) => z === y).length);
    const faltan = esperado.filter((y, i) => esperado.indexOf(y) === i && esperado.filter((z) => z === y).length > app.filter((z) => z === y).length);
    if (sobran.length || faltan.length) hallazgo(p.id, f, `Mi plan · ${nombre} (filas)`, 'Las filas que suman no son las del contador', `de más: ${sobran.join(', ') || '—'}`, `faltan: ${faltan.join(', ') || '—'}`, 'P0', true);
}
function revisarActual(p, k, f, v, rango, L) {
    revisarComun(p, f, v, rango.ini, rango.fin, 'Esta quincena');
    if (v.res.n !== L.libre) hallazgo(p.id, f, 'Mi plan · periodo actual', 'Hoy ≠ Esta quincena', v.res.nTxt, $(L.libre), 'P0', true);
    if (v.desglose && v.desglose.total !== null && v.desglose.total !== L.libre) hallazgo(p.id, f, 'Mi plan · periodo actual · ¿De dónde sale?', 'El número de «¿De dónde sale?» no es el libre', $(v.desglose.total), $(L.libre), 'P0', true);
}
function revisarFuturo(p, k, f, v, rango, nombre) {
    revisarComun(p, f, v, rango.ini, rango.fin, nombre);
    // Sin ingreso fijo, el próximo mes es un mes del calendario (por fecha).
    const x = p.tipo === 'variable' ? k.planMes(rango.ini.slice(0, 7)) : k.planFuturo(rango.ini, rango.fin);
    revisarFilas(p, f, v, x, nombre);
    if (v.res.n !== Math.abs(x.quedan)) hallazgo(p.id, f, `Mi plan · ${nombre}`, '«Te quedarían» no es el del contador', `${v.res.l} → ${v.res.nTxt}`, `Entra ${$(x.E)} · Sale ${$(x.S)} → ${$(x.quedan)}`, 'P0', true);
    if (/aprox/.test(v.res.nTxt || '') !== x.aprox) hallazgo(p.id, f, `Mi plan · ${nombre}`, `R11: «aprox.» ${x.aprox ? 'falta' : 'sin un estimado'}`, v.res.nTxt, x.aprox ? 'con aprox.' : 'sin aprox.', 'P1');
    if (v.desglose && /libre/i.test(v.desglose.titulo || '')) hallazgo(p.id, f, `Mi plan · ${nombre} · ¿De dónde sale?`, 'R4: «¿De dónde sale?» explica el libre de hoy, no esta pestaña', v.desglose.titulo, 'Entra − Sale = Te quedarían', 'P0');
}
function revisarMes(p, k, f, v, mes) {
    const [y, m] = mes.split('-').map(Number);
    revisarComun(p, f, v, `${mes}-01`, fecha(y, m, 31), 'Mes');
    const x = k.planMes(mes);
    if (v.res.n !== Math.abs(x.quedan)) hallazgo(p.id, f, `Mi plan · Mes (${mes})`, '«Te quedarían» de Mes no es el del contador', `${v.res.l} → ${v.res.nTxt}`, `Entra ${$(x.E)} · Sale ${$(x.S)} → ${$(x.quedan)}`, 'P0', true);
    revisarFilas(p, f, v, x, `Mes (${mes})`);
    if (v.desglose && /libre/i.test(v.desglose.titulo || '')) hallazgo(p.id, f, 'Mi plan · Mes · ¿De dónde sale?', 'R4: «¿De dónde sale?» explica el libre de hoy, no el mes', v.desglose.titulo, 'Entra − Sale = Te quedarían', 'P0');
    if (/gastos del día a día/.test(v.texto || '')) hallazgo(p.id, f, 'Mi plan · Mes', 'R11: «Sin tus gastos del día a día» no dice qué no incluye', 'Sin tus gastos del día a día', 'una frase más clara', 'P1');
    if (v.tip && /en qué se te fue/i.test(v.tip)) hallazgo(p.id, f, 'Mi plan · Mes', 'R9: el consejo es el de la pantalla Mes', v.tip, 'el de Mi plan', 'P1');
}

// ------------------------------------------------------------------ fotos (revisión de diseñador)
const FOTO_DIA = { pam: '2026-11-16', majo: '2026-11-10', tono: '2026-11-04', rosa: '2026-11-16' };
async function fotos(p, b) {
    const dir = path.join(raiz, 'capturas', 'personas-v29');
    await mkdir(dir, { recursive: true });
    const ev = (x) => b.evaluar(x);
    const foto = async (n) => { await esperar(200); await b.captura(path.join(dir, `${p.id}-${n}.png`)); };
    const vistas = (await ev(`P.periodos().mes`)) ? ['actual', 'proxima', 'mes'] : ['actual', 'proxima'];
    for (const v of vistas) {
        for (const modo of ['fecha', 'tipo']) {
            await ev(`P.ui.stack = []; P.ui.hoja = null; P.ui.pagosVista = '${v}'; P.ui.pagosModo = '${modo}'; P.ui.planPaso = 0; P.ui.pagosMes = null; P.ui.planAbiertas = { ingresos: true, fijos: true, variables: true, ahorro: true, deudas: true }; P.irTab('pagos'); document.getElementById('vista').scrollTop = 0; true`);
            await foto(`${v}-${modo}`);
            await ev(`document.getElementById('vista').scrollTop = 600; true`);
            await foto(`${v}-${modo}-abajo`);
        }
        await ev(`P.ui.pagosModo = 'fecha'; P.render(); document.getElementById('vista').scrollTop = 0; document.querySelector('[data-fk="plan-resumen"]').click(); true`);
        await foto(`${v}-de-donde-sale`);
        await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    }
    await ev(`P.ui.stack = []; P.irTab('hoy'); true`);
    await foto('hoy');
    await ev(`P.ui.pagosModo = 'fecha'; P.ui.pagosVista = 'actual'; P.ui.planAbiertas = {}; true`);
}

// ------------------------------------------------------------------ correr
const b = await abrir({ puerto: Number(args.puerto || 9961) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const base = pathToFileURL(raiz).href + '/telefono.html#tema=serena-claro';
const personas = [persona('pam', 'Pam', 'quincena'), persona('majo', 'Majo', 'mes'), persona('tono', 'Toño', 'semana'), persona('rosa', 'Rosa', 'variable')].filter((p) => SOLO.includes(p.id));
try {
    for (const p of personas) {
        await b.ir('about:blank');
        await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '${p.inicio}';` });
        await b.ir(base);
        await esperar(500);
        await b.evaluar('P.ayuda && P.ayuda.abierto && P.ayuda.cerrar({ foco: false }); true');
        await correr(p, b);
    }
} catch (e) {
    hallazgos.push({ error: e.message, stack: e.stack });
}
// Un hallazgo por tipo y persona (con su primer día y cuántas veces), para leerlo fácil.
const agrupados = {};
for (const h of hallazgos) {
    if (h.error) continue;
    const clave = `${h.persona}|${h.area}|${h.que}`;
    if (!agrupados[clave]) agrupados[clave] = { ...h, veces: 0, ultimoDia: h.dia };
    agrupados[clave].veces++;
    agrupados[clave].ultimoDia = h.dia;
}
const lista = Object.values(agrupados);
const salida = { resumen, total: hallazgos.length, dinero: hallazgos.filter((h) => h.dinero).length, grupos: lista.length, hallazgos: lista, errores: [...hallazgos.filter((h) => h.error), ...b.errores.slice(0, 20)] };
if (args.salida) await writeFile(args.salida, JSON.stringify({ ...salida, obs, todos: args.detalle ? hallazgos : undefined }, null, 1));
console.log(JSON.stringify({ resumen, total: salida.total, dinero: salida.dinero, grupos: salida.grupos, errores: salida.errores.slice(0, 5) }, null, 1));
for (const h of lista) console.log(`${h.sev}${h.dinero ? '$' : ' '} ${h.persona} ${h.dia}→${h.ultimoDia} ×${h.veces} · ${h.area} · ${h.que} · se ve: ${String(h.seVe).slice(0, 90)} · debería: ${String(h.deberia).slice(0, 90)}`);
b.cerrar();
process.exit(hallazgos.length ? 1 : 0);
