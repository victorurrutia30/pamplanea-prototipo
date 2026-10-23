// LOS DATOS SOBREVIVEN A LA ACTUALIZACIÓN (v2.6; desde la v2.6.1 sirve para cualquier versión). Una versión publicada
// (sacada de git con --ref) servida como en GitHub Pages (subruta /pamplanea-prototipo/), con: datos reales en «Usarla
// con mis datos» (y algo anotado), el progreso de «Aprender a usarla» («Lo esencial» a medias, un capítulo hecho y un
// ejercicio), una prueba guiada en pausa en el set B en su última tarea y el nombre de «Cuéntale…». Después el MISMO
// puerto sirve la versión de esta carpeta: «Hay una versión nueva · Actualizar» y todo sigue igual (sin cambio de
// esquema); también sin internet. Las versiones (vieja y nueva) y la caché nueva se leen de casos.js y sw.js.
// v2.7 (DATOS-5): si la versión nueva es la v2.7 o una posterior, además: la copia intacta por versión
// (`pamplanea-uso:respaldo:antes-de-v2.7.0`), cero pérdidas (cada registro, pago, cuenta, ahorro y tarjeta sigue ahí con
// el mismo monto; lo único nuevo es la cuenta de cada gasto, DATOS-3/F04), los saldos de las cuentas iguales, los números
// «de antes» del cuadrito de novedades iguales a los que mostraba la versión vieja (DATOS-4), y lo mismo con Carlos, Rosa
// y un set sintético que reproduce cada F (F01–F04, F10–F17, F21) creado con la versión vieja.
// v2.8 (DATOS-1 a 5, que siguen vigentes; C-1): la copia es `antes-de-v2.8.0`; lo único nuevo en tus datos, además de la
// cuenta de cada gasto, es dónde está cada ahorro (`donde`: dentro de tu cuenta, C-1). Los números «de antes» del
// cuadrito son los de la versión vieja (con sus reglas). Si la regla nueva de la tarjeta (D-4) o los cobros con tarjeta
// (C-7) cambian tu libre, la app muestra el número nuevo y el cuadrito lo dice con antes y después.
// v2.9 «Números claros» (Fase E, DECIDIDO por criterio, autorizado por Victor 2026-10-23): la copia es `antes-de-v2.9.0`, el
// cuadrito es el de la v2.9 (de 2 a 4 líneas) y, además de Carlos, Rosa y el sintético, dos juegos como los de Pam y Majo
// (adelanto con su descuento, aguinaldo, la pareja, la tarjeta y, desde la v2.8, presupuestos y ahorro programado) creados
// con la versión vieja: cero pérdidas, sus saldos iguales y, si su libre cambió (H1, «Comida afuera»), el cuadrito lo dice.
// v2.9.1 (reporte de Victor, 2026-10-23): la copia es `antes-de-v2.9.1`. De la v2.9 a la v2.9.1 el cuadrito sale solo a quien
// le cambió algo: «Victor P» (una tarjeta con su estado de cuenta pendiente cuyo día se cambió en Editar con la v2.9.0) ve
// «¿Cuál es?»; sin respuesta, cero pérdidas; con ella, solo cambia esa fecha. A los demás no les sale y su libre es el mismo.
// v2.9.2 (reporte de Victor, 2026-10-23): la copia es `antes-de-v2.9.2`. «Cambiada P» (una tarjeta y la luz que paga con su
// próximo día de pago, de otro periodo) ve el cuadrito de la v2.9.2 con su mes antes y después; cero pérdidas y el mismo libre.
// Desde la v2.9.1, «Victor P» ya no ve el cuadrito de la fecha (ya lo tuvo): la pregunta sigue en Hoy.
// Uso: node herramientas/actualizar.mjs --ref=7c0d06e   (v2.5)   ·   --ref=ca97256   (v2.6)   [--puerto=8767]
import { execSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const ref = args.ref || '7c0d06e';
const puerto = Number(args.puerto || 8767);
const base = `http://127.0.0.1:${puerto}/pamplanea-prototipo/`;
const salida = path.join(root, 'capturas', 'actualizar-' + ref);
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });

// La v2.5 tal como se publicó, con el mismo servidor de prueba.
const v25 = await mkdtemp(path.join(os.tmpdir(), 'pamplanea-v25-'));
await writeFile(path.join(v25, 'v25.tar'), execSync(`git archive --format=tar ${ref}`, { cwd: root, maxBuffer: 1 << 28 }));
execSync('tar -xf v25.tar', { cwd: v25 });
await rm(path.join(v25, 'v25.tar'));
await mkdir(path.join(v25, 'herramientas'), { recursive: true });
await cp(path.join(root, 'herramientas', 'servidor.mjs'), path.join(v25, 'herramientas', 'servidor.mjs'));
const versionDe = async (carpeta) => /VERSION_PROTOTIPO = '([^']+)'/.exec(await readFile(path.join(carpeta, 'casos.js'), 'utf8'))[1];
const VIEJA = await versionDe(v25);
const NUEVA = await versionDe(root);
const CACHE = 'pamplanea-proto-' + /VERSION_SW = '([^']+)'/.exec(await readFile(path.join(root, 'sw.js'), 'utf8'))[1];

let servidor = null;
async function servir(carpeta) {
    if (servidor) servidor.kill();
    servidor = spawn(process.execPath, [path.join(carpeta, 'herramientas', 'servidor.mjs'), String(puerto)], { stdio: 'ignore' });
    for (let i = 0; i < 80; i++) {
        try {
            await fetch(base);
            return;
        } catch {
            await esperar(100);
        }
    }
    throw new Error('el servidor no levantó');
}
const apagar = async () => {
    if (servidor) servidor.kill();
    servidor = null;
    await esperar(300);
};

const informe = { ref, vieja: VIEJA, nueva: NUEVA, cache: CACHE, fallos: [], datos: {} };
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${nombre}: «${String(JSON.stringify(real)).slice(0, 400)}»`);
    informe.datos[nombre] = real;
};
const b = await abrir({ puerto: 9731 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const ev = (s) => b.evaluar(s);
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(200);
};
const texto = (sel) => ev(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const guardado = () => ev('Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, JSON.parse(localStorage.getItem(k))]))');
const sinHoy = (u) => ({ ...u, st: { ...u.st, hoy: null }, actualizado: null, metricas: { ...u.metricas, dias: null } });
// v2.7 (DATOS-5): desde la v2.7 cada actualización guarda una copia por versión y agrega la cuenta de cada gasto.
const numV = (v) => (/v(\d+)\.(\d+)(?:\.(\d+))?/.exec(v) || []).slice(1).map((x) => +(x || 0));
const desde27 = (v) => {
    const [a, b2] = numV(v);
    return a > 2 || (a === 2 && b2 >= 7);
};
const NUEVA27 = desde27(NUEVA);
const desde28 = (v) => {
    const [a, b2] = numV(v);
    return a > 2 || (a === 2 && b2 >= 8);
};
const NUEVA28 = desde28(NUEVA);
const desde29 = (v) => {
    const [a, b2] = numV(v);
    return a > 2 || (a === 2 && b2 >= 9);
};
const NUEVA29 = desde29(NUEVA);
/** v2.9.1: ¿la versión nueva es la v2.9.1 o posterior? ¿Y la vieja ya era la v2.9 (una actualización de arreglos)? */
const desde291 = (v) => {
    const [a, b2, c] = numV(v);
    return a > 2 || (a === 2 && (b2 > 9 || (b2 === 9 && c >= 1)));
};
const NUEVA291 = desde291(NUEVA);
const PARCHE = NUEVA291 && desde29(VIEJA);
/** v2.9.2: ¿la versión nueva es la v2.9.2 o posterior? ¿La vieja ya era la v2.9.1 (ya hizo la pregunta de la fecha)? */
const desde292 = (v) => {
    const [a, b2, c] = numV(v);
    return a > 2 || (a === 2 && (b2 > 9 || (b2 === 9 && c >= 2)));
};
const NUEVA292 = desde292(NUEVA);
const VIEJA291 = desde291(VIEJA);
/** v2.8: la clave del cuadrito de la versión nueva. v2.9.1: de la v2.9 a la v2.9.1, solo sale a quien le cambió algo. */
const NOV = PARCHE ? 'v2.9.1' : NUEVA29 ? 'v2.9' : NUEVA28 ? 'v2.8' : 'v2.7';
/** v2.8: ¿esta línea del cuadrito dice que un número cambió? (v2.7: «Corregimos…»; v2.8: con antes y después). */
const lineaCambio = (l) => (NUEVA28 ? /^(Tu libre era|Tu gasto de \S+ era|Lo que debes de .+ era)/.test(l) : l.startsWith('Corregimos'));
const CLAVE_COPIA = 'pamplanea-uso:respaldo:antes-de-v' + numV(NUEVA).join('.');
/** Lo que ve la persona (en la versión que esté abierta): saldos, libre, Mes y lo que debe de cada tarjeta. */
const NUMEROS = `(() => { const s = P.st; const k = P.calc(); const [y, m] = MOTOR.partes(s.hoy); const mes = MOTOR.resumenMes(s, y, m); return { saldos: Object.fromEntries(s.lugares.map((l) => [l.id, MOTOR.saldoLugar(s, l.id)])), tienes: MOTOR.tienes(s), libre: k.libre, mes: [mes.salio, mes.entro], tarjetas: Object.fromEntries(s.tarjetas.map((t) => { const i = MOTOR.tarjetaInfo(s, t); const debe = i.debeHoy !== undefined ? i.debeHoy : i.ult.inicial && t.debeInicial !== null && t.debeInicial !== undefined ? t.debeInicial + i.debeTotal : null; return [t.id, debe !== null ? debe : i.debeTotal]; })) }; })()`;
/**
 * DATOS-5: cero pérdidas. Cada cosa de antes sigue ahí con TODO lo que tenía (mismo id, mismos montos, mismas fechas); lo
 * único que puede aparecer es la cuenta de un gasto (`lugar`, DATOS-3/F04). Devuelve la lista de diferencias.
 */
function perdidas(viejo, nuevo) {
    const out = [];
    for (const k of ['lugares', 'medios', 'tarjetas', 'apartados', 'logros', 'pagos', 'ingresos', 'registros', 'reservasTarjeta', 'cerrados', 'reservas']) {
        const a = viejo[k] || [];
        const b2 = nuevo[k] || [];
        if (a.length !== b2.length) out.push(`${k}: ${a.length} → ${b2.length}`);
        for (const x of a) {
            const y = b2.find((z) => (x.id !== undefined ? z.id === x.id : JSON.stringify(z) === JSON.stringify(x)));
            if (!y) {
                out.push(`${k}: falta ${x.id || JSON.stringify(x).slice(0, 60)}`);
                continue;
            }
            for (const c of Object.keys(x)) if (JSON.stringify(x[c]) !== JSON.stringify(y[c])) out.push(`${k} ${x.id}.${c}: ${String(JSON.stringify(x[c])).slice(0, 60)} → ${String(JSON.stringify(y[c])).slice(0, 60)}`);
            // DATOS-3: la cuenta de cada gasto; v2.8 (C-1): dónde está cada ahorro (dentro de tu cuenta).
            for (const c of Object.keys(y)) if (!(c in x) && !(k === 'registros' && x.tipo === 'gasto' && c === 'lugar') && !(NUEVA28 && k === 'apartados' && c === 'donde')) out.push(`${k} ${x.id}: campo nuevo ${c}`);
        }
    }
    for (const c of ['nombre', 'inicio', 'configurado', 'persona', 'seq']) if (JSON.stringify(viejo[c]) !== JSON.stringify(nuevo[c])) out.push(`${c}: ${JSON.stringify(viejo[c])} → ${JSON.stringify(nuevo[c])}`);
    return out;
}
/**
 * v2.9: datos como los de Pam (quincena) y Majo (mes), creados en la página de la versión VIEJA: un adelanto que ya llegó
 * y se descuenta (con $10 de comisión) del próximo pago, el aguinaldo, la pareja, la tarjeta BAC con su estado de cuenta y,
 * si la versión vieja ya los tiene (v2.8), presupuestos («Súper» y «Comida afuera», con pupusas anotadas) y ahorro programado.
 */
const comoPamMajo = (tipo) => `(() => {
    const s = DATOS.crearAna();
    const hoy = P.modos.hoy();
    const d = (n) => { const x = new Date(hoy + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
    Object.assign(s, { persona: 'uso', hoy, inicio: d(-25) });
    const q = s.ingresos.find((i) => i.principal);
    if (${JSON.stringify(tipo)} === 'mes') {
        Object.assign(q, { nombre: 'Salario', frecuencia: 'mensual', dia: 30, monto: 120000, dias: undefined, desde: d(-35) });
        const ultimo = MOTOR.ocurrenciasIngreso(s, q, d(-40), hoy).at(-1).fecha;
        q.llegadas = { ...q.llegadas, [ultimo]: { monto: 120000 } };
    }
    const proximo = MOTOR.ocurrenciasIngreso(s, q, d(1), d(40))[0].fecha;
    const reg = (f) => { s.registros.push({ id: 'r' + s.seq, seq: s.seq, ...f }); s.seq++; };
    s.ingresos.push({ id: 'pareja', nombre: 'Salario de Luis', emoji: '💵', categoria: 'otro', monto: 35000, aprox: false, frecuencia: 'mensual', dia: 28, lugar: 'efectivo', principal: false, extra: true, desde: d(-25), llegadas: {} });
    s.ingresos.push({ id: 'adel', nombre: 'Adelanto de salario', emoji: '💵', categoria: 'otro', tipoIngreso: 'adelanto', monto: 20000, aprox: false, frecuencia: 'unico', fecha: d(-2), lugar: 'efectivo', principal: false, extra: true, desde: d(-2), llegadas: { [d(-2)]: { monto: 20000 } }, adelanto: { descuentos: [{ ingreso: q.id, fecha: proximo, monto: 21000 }] } });
    reg({ tipo: 'ingreso', fecha: d(-2), monto: 20000, nombre: 'Adelanto de salario', categoria: 'otro', emoji: '💵', lugar: 'efectivo', ingreso: 'adel', ocurrencia: d(-2) });
    reg({ tipo: 'gasto', fecha: d(-1), monto: 1200, nombre: 'Pupusas', categoria: 'comida', emoji: '🫓', medio: 'efectivo', anotado: true });
    if (${JSON.stringify(desde28(VIEJA))}) {
        const per = MOTOR.periodoPlan(s);
        s.variables = [
            { id: 'super', nombre: 'Súper', emoji: '🛒', categoria: 'super', tope: 15000, medio: 'debito', desde: per.inicio, creado: d(-10), cierres: {}, activo: true },
            { id: 'cafuera', nombre: 'Comida afuera', emoji: '🍔', categoria: 'comida', tope: 4000, medio: 'efectivo', desde: per.inicio, creado: d(-10), cierres: {}, activo: true },
        ];
        const em = s.apartados.find((a) => a.id === 'emergencias');
        em.programado = { monto: 2500, desde: per.inicio };
        em.donde = { lugar: 'agricola' };
    }
    return s;
})()`;
/**
 * v2.9.1 (reporte de Victor, 2026-10-23): datos como los de Victor, creados en la página de la versión VIEJA: una tarjeta con
 * su estado de cuenta pendiente (corte hace 2 días, vence en 22) cuyo día de pago se cambió en Editar a un día antes, como
 * lo dejaba la v2.9.0: la tarjeta dice un día y su estado de cuenta, otro.
 */
const COMO_VICTOR = `(() => {
    const s = DATOS.crearAna();
    const hoy = P.modos.hoy();
    const d = (n) => MOTOR.sumarDias(hoy, n);
    Object.assign(s, { persona: 'uso', hoy, inicio: d(-25) });
    const vence = d(22);
    const dia = Number(vence.slice(8));
    s.tarjetas.push({ id: 't1', nombre: 'Crédito Liss', apodo: 'Tarjeta Liss', emoji: '💳', tipo: 'tarjeta', corte: Number(d(-2).slice(8)), pagoDia: dia === 1 ? 2 : dia - 1, cupo: null, interesesAnio: 0, desde: d(-20), medio: 'transferencia', estados: [{ corte: d(-2), total: 30000, minimo: 5000, aPagar: 30000, opcion: 'total', vence, anotado: 0, seq: s.seq++ }] });
    s.medios.push({ id: 'mt1', nombre: 'Crédito Liss', emoji: '💳', tarjeta: 't1' });
    return s;
})()`;
/**
 * DATOS-5: el set sintético, creado en la página de la versión VIEJA con sus propias funciones de datos: lo que en la
 * v2.6.7 quedaba mal en cada F (los datos tal como los dejaba).
 */
/**
 * v2.9.2 (reporte de Victor, 2026-10-23): datos con pagos cambiados de quincena, creados en la página de la versión VIEJA: la
 * Tarjeta Liss (vence el 20 del mes que viene) y la luz (el 5 del otro), las dos «Con tu» próximo día de pago (otro periodo).
 */
const COMO_CAMBIADO = `(() => {
    const s = DATOS.crearAna();
    const hoy = P.modos.hoy();
    const d = (n) => MOTOR.sumarDias(hoy, n);
    Object.assign(s, { persona: 'uso', hoy, inicio: d(-25) });
    const [y, m] = MOTOR.partes(hoy);
    const prox = MOTOR.corteDespues(s, hoy);
    const vence = MOTOR.fechaDe(...MOTOR.mesMas(y, m, 1), 20);
    const luz = MOTOR.fechaDe(...MOTOR.mesMas(y, m, 2), 5);
    s.tarjetas.push({ id: 't1', nombre: 'Crédito Liss', apodo: 'Tarjeta Liss', emoji: '💳', tipo: 'tarjeta', corte: Number(d(-2).slice(8)), pagoDia: 20, cupo: null, interesesAnio: 0, desde: d(-20), medio: 'transferencia', estados: [{ corte: d(-2), total: 10038, minimo: 2500, aPagar: 10038, opcion: 'total', vence, anotado: 0, seq: s.seq++ }], asignaciones: { [vence]: [{ de: prox, monto: 10038 }] } });
    s.medios.push({ id: 'mt1', nombre: 'Crédito Liss', emoji: '💳', tarjeta: 't1' });
    s.pagos.push({ id: 'luz9', nombre: 'Luz de la casa', emoji: '💡', categoria: 'servicios', monto: 3500, estimado: false, frecuencia: 'mensual', dia: 5, medio: 'debito', avisos: [], desde: d(-25), creado: d(-25), hechos: {}, previos: [], asignaciones: { [luz]: [{ de: prox, monto: 3500 }] } });
    return s;
})()`;
const SINTETICO = `(() => {
    const s = DATOS.crearAna();
    const hoy = P.modos.hoy();
    const d = (n) => MOTOR.sumarDias(hoy, n);
    Object.assign(s, { persona: 'uso', nombre: 'Sintética', hoy, inicio: d(-25) });
    const reg = (f) => { const r = { id: 'r' + s.seq, seq: s.seq, ...f }; s.registros.push(r); s.seq++; return r; };
    // F02 y F03: «debo hoy $2,000», un abono de $100 y una compra de antes de decirlo.
    s.tarjetas.push({ id: 't900', nombre: 'Visa Sintética', emoji: '💳', tipo: 'tarjeta', corte: Number(d(-12).slice(8)), pagoDia: Number(d(10).slice(8)), cupo: null, interesesAnio: 0, desde: d(-5), pagoUsual: 10000, debeInicial: 200000, estados: [{ corte: d(-12), total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: d(18), inicial: true, esperarCorte: true }] });
    s.medios.push({ id: 'mt900', nombre: 'Visa Sintética', emoji: '💳', tarjeta: 't900' });
    reg({ tipo: 'gasto', fecha: d(-8), monto: 5000, nombre: 'Zapatos', categoria: 'ropa', emoji: '👟', medio: 'mt900', anotado: true });
    reg({ tipo: 'pagoTarjeta', fecha: d(-2), monto: 10000, lugar: 'agricola', tarjeta: 't900', nombre: 'Pago de Visa Sintética' });
    // F10, F11 y F13: dos estados de cuenta sin abono para el primero, un abono del día del corte y «Otro monto» < mínimo.
    // (Todo con fechas de después de los cuadres que ya traen los datos de Ana: el único gasto «tardío» es el de F01.)
    s.tarjetas.push({ id: 't901', nombre: 'Master Sintética', emoji: '💳', tipo: 'tarjeta', corte: Number(d(-3).slice(8)), pagoDia: Number(d(17).slice(8)), cupo: null, interesesAnio: 0, desde: d(-90), estados: [{ corte: d(-33), total: 19000, minimo: 2500, aPagar: 19000, opcion: 'total', vence: d(-13) }, { corte: d(-3), total: 40000, minimo: 4000, aPagar: 1000, opcion: 'otro', vence: d(17) }] });
    s.medios.push({ id: 'mt901', nombre: 'Master Sintética', emoji: '💳', tarjeta: 't901' });
    reg({ tipo: 'pagoTarjeta', fecha: d(-3), monto: 3000, lugar: 'agricola', tarjeta: 't901', nombre: 'Pago de Master Sintética' });
    // F12: $50 de los $100 de una cuota, marcado «pagado» (así lo dejaba la v2.6.7).
    s.pagos.push({ id: 'p900', nombre: 'Gimnasio', emoji: '💪', categoria: 'suscripciones', monto: 10000, estimado: false, frecuencia: 'mensual', dia: Number(d(-3).slice(8)), medio: 'debito', avisos: [{ tipo: 'antes', dias: 1, on: false }, { tipo: 'vence', on: false }], desde: d(-40), creado: d(-40), hechos: {}, previos: [] });
    const g = reg({ tipo: 'gasto', fecha: d(-3), monto: 5000, nombre: 'Gimnasio', categoria: 'suscripciones', emoji: '💪', medio: 'debito', pago: 'p900' });
    s.pagos.find((p) => p.id === 'p900').hechos[d(-3)] = { estado: 'pagado', monto: 5000, registro: g.id };
    // F15: un ingreso recibido corregido a $500 cuya llegada seguía en $600.
    s.ingresos.push({ id: 'i900', nombre: 'Venta de ropa', emoji: '🏪', categoria: 'venta', monto: 60000, aprox: false, frecuencia: 'unico', fecha: d(-2), lugar: 'efectivo', principal: false, extra: true, desde: d(-2), llegadas: { [d(-2)]: { monto: 60000 } } });
    reg({ tipo: 'ingreso', fecha: d(-2), monto: 50000, nombre: 'Venta de ropa', categoria: 'venta', emoji: '🏪', lugar: 'efectivo', ingreso: 'i900', ocurrencia: d(-2) });
    // F16: un gasto de un ahorro corregido a $40 con el ahorro todavía en lo de $20.
    const ap = s.apartados.find((a) => a.id === 'emergencias');
    reg({ tipo: 'gasto', fecha: d(-2), monto: 4000, nombre: 'Farmacia', categoria: 'salud', emoji: '💊', medio: 'efectivo', anotado: true, apartado: ap.id, apartadoNombre: ap.nombre, usadoApartado: 2000 });
    ap.monto -= 2000;
    // F17: el abono de $0 que dejaba Pongámonos al día.
    reg({ tipo: 'pagoTarjeta', fecha: d(-1), monto: 0, lugar: 'agricola', tarjeta: 't900', nombre: 'Pago de Visa Sintética' });
    // F01: cuadrar a $20 menos y después anotar ese gasto (con fecha de antes del cuadre). Al final: lo demás ya estaba anotado al cuadrar.
    const esperado = MOTOR.saldoLugar(s, 'efectivo');
    const c = reg({ tipo: 'cuadre', fecha: d(-1), lugar: 'efectivo', monto: esperado - 2000, esperado });
    s.lugares.find((l) => l.id === 'efectivo').cuadre = { fecha: d(-1), seq: c.seq, monto: esperado - 2000 };
    reg({ tipo: 'gasto', fecha: d(-2), monto: 2000, nombre: 'Pupusas', categoria: 'comida', emoji: '🫓', medio: 'efectivo', anotado: true });
    return s;
})()`;

let libreNuevo = null;
try {
    // ------------------------------------------------------------ 1. La v2.5, con todo lo de una persona de la familia.
    await servir(v25);
    await b.ir(base);
    await esperar(800);
    await ev('navigator.serviceWorker.ready.then(() => true)');
    await b.ir(base + 'telefono.html');
    await esperar(800);
    check('la versión vieja: servida y con service worker', [await ev('window.VERSION_PROTOTIPO'), await ev('!!navigator.serviceWorker.controller')], [VIEJA, true]);
    const anotar = (frase) => `{ P.acciones.anotar(); const q = document.getElementById("anotar-q"); q.value = ${JSON.stringify(frase)}; q.dispatchEvent(new Event("input", { bubbles: true })); P.acciones.anotarGuardar(); } true`;
    await clic('[data-fk="elegir-usar"]');
    await clic('[data-fk="intro-empezar"]');
    await ev('{ P.ayuda.cerrar(); const s = DATOS.crearAna(); Object.assign(s, { persona: "uso", hoy: P.modos.hoy(), nombre: "Prueba" }); P.cargar(s, { tab: "hoy" }); P.modos.guardarUso(); } true');
    await ev(anotar('pupusas 9'));
    await esperar(400);
    // Lo de abajo se escribe a mano: que la página no lo pise al salir con lo que tiene en memoria.
    await ev(`(() => {
        P.sinGuardar = true;
        P.modos.guardarEntrenamiento({ caps: { 'fijo:esencial': { paso: 3, hecho: false }, 'fijo:ahorros': { paso: 0, hecho: true } }, tourVersion: 'fijo', tourUltimo: 'fijo:esencial', practicas: { C05: true } });
        const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1'));
        u.nombre = 'Prueba';
        u.feedback = [{ fecha: '2026-10-19', facil: 4, confuso: 'Lo de cuadrar', gustaria: '' }];
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify(u));
        const t = (i) => ({ inicio: 1760000000000 + i * 60000, fin: 1760000000000 + i * 60000 + 30000, toques: 5, pantallas: ['Hoy'], detectada: true, resultado: 'listo', facil: 4 });
        localStorage.setItem('pamplanea-proto-v2:notas', JSON.stringify({ nombre: 'Prueba', notas: {}, prueba: { estado: 'libre', set: 'B', origen: 'alterno', perfil: { pago: 'quincena' }, i: 5, tareas: { pupusas: t(0), 'estado-cuenta': t(1), 'laptop-credito': t(2), 'tarjeta-prestamo': t(3), 'dos-semanas': t(4) }, final: {}, instalada: 'no lo intentó', inicio: '2026-10-19T15:00:00.000Z', enviado: false } }));
        localStorage.setItem('pamplanea-proto-v2:dispositivo', JSON.stringify({ personas: 2, setSiguiente: null }));
        return true;
    })()`);
    await b.ir(base + 'telefono.html');
    await esperar(800);
    const libreAntes = await texto('.portada-n');
    check('v2.5: con sus datos', [await ev('P.modo'), libreAntes, await ev('P.st.registros.some((r) => r.monto === 900)')], (x) => x[0] === 'uso' && /^\$/.test(x[1]) && x[2] === true);
    await b.captura(path.join(salida, '1-v25-con-datos.png'));
    const antes = await guardado();
    // v2.7 (DATOS-5): lo que mostraba la versión vieja con estos datos, y Carlos, Rosa y el set sintético (creados y
    // guardados por la versión vieja, cada uno con su nombre para que no parezcan los ejemplos).
    const viejos = { Prueba: await ev(NUMEROS) };
    const crudos = {};
    if (NUEVA27) {
        for (const [nombre, crear] of [['Carlos P', 'DATOS.crearCarlos()'], ['Rosa P', 'DATOS.crearRosa()'], ['Sintética', SINTETICO], ...(NUEVA29 ? [['Pam P', comoPamMajo('quincena')], ['Majo P', comoPamMajo('mes')]] : []), ...(NUEVA291 ? [['Victor P', COMO_VICTOR]] : []), ...(NUEVA292 ? [['Cambiada P', COMO_CAMBIADO]] : [])]) {
            await ev(`(() => { const s = ${crear}; Object.assign(s, { persona: 'uso', nombre: ${JSON.stringify(nombre)}, hoy: P.modos.hoy() }); P.cargar(s, { tab: 'hoy' }); P.modos.guardarUso(); return true; })()`);
            await esperar(200);
            viejos[nombre] = await ev(NUMEROS);
            crudos[nombre] = await ev(`localStorage.getItem('pamplanea-uso:v1')`);
        }
        // De vuelta a «Prueba», tal como estaba (sin que la página guarde lo que tiene en memoria al salir).
        await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', ${JSON.stringify(JSON.stringify(antes['pamplanea-uso:v1']))}); true`);
        await b.ir(base + 'telefono.html');
        await esperar(800);
        check('(la versión vieja, otra vez con «Prueba»)', await texto('.portada-n'), libreAntes);
    }
    // ------------------------------------------------------------ 2. Se publica la v2.6 en el mismo lugar.
    await servir(root);
    await ev('navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => true)');
    let aviso = false;
    for (let i = 0; i < 80 && !aviso; i++) {
        await esperar(200);
        aviso = await ev('!!document.getElementById("actualizar")');
    }
    check('«Hay una versión nueva · Actualizar»', await texto('#actualizar'), (t) => typeof t === 'string' && t.includes('Hay una versión nueva') && t.includes('Actualizar'));
    await b.captura(path.join(salida, '2-hay-version-nueva.png'));
    await clic('[data-fk="actualizar"]');
    for (let i = 0; i < 40; i++) {
        await esperar(250);
        if ((await ev('window.VERSION_PROTOTIPO').catch(() => null)) === NUEVA) break;
    }
    await esperar(800);
    check('la versión nueva y solo su caché', [await ev('window.VERSION_PROTOTIPO'), await ev('caches.keys()')], (x) => x[0] === NUEVA && x[1].includes(CACHE) && x[1].length === 1);
    if (PARCHE) {
        // v2.9.1: de la v2.9 a la v2.9.1, a «Prueba» no le cambió nada: no sale ningún cuadrito.
        check(`${NOV}: sin nada que le cambie, no sale el cuadrito`, await texto('#nov-t'), null);
    } else if (NUEVA27) {
        // v2.7 (Parte D): el cuadrito de novedades sale una vez; se cierra para seguir. v2.8: el de la v2.8.
        check(`${NOV}: el cuadrito de novedades`, await texto('#nov-t'), NUEVA29 ? '¡Tus números, más claros! ✨' : NUEVA28 ? '¡PamPlanea está más clara! ✨' : '¡PamPlanea se puso al día! ✨');
        informe.datos.lineasNovedades = await ev(`[...document.querySelectorAll('.nov-lista li')].map((li) => li.innerText.trim())`);
        // Cierre v2.8: 5 líneas como mucho, «Tus datos están completos y a salvo.» y el enlace para recuperar.
        if (NUEVA28) check(`${NOV}: el cuadrito, con su cierre y «¿Algo se ve raro? Recupera tus datos»`, [NUEVA29 ? informe.datos.lineasNovedades.length >= 2 && informe.datos.lineasNovedades.length <= 4 : informe.datos.lineasNovedades.length <= 5, await texto('.nov-cierre'), await texto('[data-fk="nov-recuperar"]')], [true, 'Tus datos están completos y a salvo.', '¿Algo se ve raro? Recupera tus datos']);
        await b.captura(path.join(salida, '3a-novedades.png'));
        await clic('[data-fk="nov-ok"]');
    }
    const despues = await guardado();
    if (!NUEVA27) {
        check('mismas claves guardadas (sin respaldo de migración: no hubo cambio de esquema)', Object.keys(despues), Object.keys(antes));
        check('tus datos: iguales (esquema 2)', [despues['pamplanea-uso:v1'].esquema, JSON.stringify(sinHoy(despues['pamplanea-uso:v1'])) === JSON.stringify(sinHoy(antes['pamplanea-uso:v1']))], [2, true]);
    } else {
        // v2.7 (DATOS-1): las mismas claves más UNA copia intacta de lo guardado por la versión vieja.
        check('mismas claves guardadas, más la copia de antes de actualizar (DATOS-1)', Object.keys(despues).filter((k) => k !== CLAVE_COPIA), Object.keys(antes));
        // (La versión vieja vuelve a guardar al abrirse: su fecha de guardado y los días de uso pueden ser otros.)
        check('la copia: intacta (lo que guardó la versión vieja, tal cual)', despues[CLAVE_COPIA] && JSON.stringify(sinHoy(despues[CLAVE_COPIA].datos)) === JSON.stringify(sinHoy(antes['pamplanea-uso:v1'])), true);
        // v2.7 (DATOS-3, DATOS-5): cero pérdidas; lo único nuevo es la cuenta de cada gasto, igual a la de su medio hoy.
        const u0 = antes['pamplanea-uso:v1'];
        const u1 = despues['pamplanea-uso:v1'];
        check('cero pérdidas: cada registro, pago, cuenta, ahorro y tarjeta sigue igual (DATOS-5)', perdidas(u0.st, u1.st), []);
        check('cada gasto guarda la cuenta donde aparece hoy (DATOS-3, F04)', u1.st.registros.filter((r) => r.tipo === 'gasto').every((r) => r.lugar === (r.lugar !== undefined && u0.st.registros.find((x) => x.id === r.id)?.lugar !== undefined ? u0.st.registros.find((x) => x.id === r.id).lugar : (u0.st.medios.find((m) => m.id === r.medio) || {}).lugar || null)), true);
        // v2.8 (C-1): tus ahorros de antes quedan «dentro de» una de tus cuentas (ya se restaban de tu libre).
        if (NUEVA28) check('v2.8: cada ahorro queda dentro de una de tus cuentas (C-1)', u1.st.apartados.every((a) => a.donde && u1.st.lugares.some((l) => l.id === a.donde.lugar)), true);
        const resto = (u) => ({ ...sinHoy(u), st: null, version: null, novedades: null });
        check('lo demás de tus datos (nombre, métricas, respuestas): igual', Object.keys({ ...resto(u0), ...resto(u1) }).filter((k) => JSON.stringify(resto(u0)[k]) !== JSON.stringify(resto(u1)[k])).map((k) => `${k}: ${JSON.stringify(resto(u0)[k])} → ${JSON.stringify(resto(u1)[k])}`), []);
        const nuevos = await ev(NUMEROS);
        check('los saldos de tus cuentas: iguales', nuevos.saldos, viejos.Prueba.saldos);
        const n = u1.novedades && u1.novedades[NOV];
        // v2.9.1: de la v2.9 a la v2.9.1 no hay números «de antes» (no cambia ningún número; solo se pregunta una fecha).
        if (!PARCHE) check('DATOS-4: los números «de antes» son los que mostraba la versión vieja', n && n.antes && [n.antes.mes.salio, n.antes.mes.entro, n.antes.libre, Object.fromEntries(n.antes.tarjetas.map((t) => [t.id, t.debe]))], [viejos.Prueba.mes[0], viejos.Prueba.mes[1], viejos.Prueba.libre, viejos.Prueba.tarjetas]);
        else check('v2.9.1 y después: tu libre, igual que en la versión vieja', nuevos.libre, viejos.Prueba.libre);
        // v2.8: si tu libre cambió con las reglas nuevas, se ve el número nuevo y el cuadrito lo dijo con antes y después.
        if (NUEVA28 && n && n.despues) {
            libreNuevo = await ev(`MOTOR.dinero(${n.despues.libre})`);
            check('v2.8: tu libre es el de ahora (el del cuadrito)', nuevos.libre, n.despues.libre);
            check('v2.8: si un número cambió, el cuadrito lo dice con antes y después (y si no, no)', (informe.datos.lineasNovedades || []).some(lineaCambio), n.antes.mes.salio !== n.despues.mes.salio || n.antes.libre !== n.despues.libre || n.antes.tarjetas.some((t) => t.debe !== n.despues.tarjetas.find((x) => x.id === t.id).debe));
        }
    }
    check('el progreso de «Aprender a usarla»: igual', despues['pamplanea-entrenamiento'], antes['pamplanea-entrenamiento']);
    check('la prueba guiada y el teléfono: iguales', [despues['pamplanea-proto-v2:notas'], despues['pamplanea-proto-v2:dispositivo']], [antes['pamplanea-proto-v2:notas'], antes['pamplanea-proto-v2:dispositivo']]);
    check('se abre con tus datos y el mismo libre (v2.8: el de ahora, si cambió con D-4 o C-7)', [await ev('P.modo'), await texto('.portada-n'), await texto('#btn-ayuda')], ['uso', libreNuevo || libreAntes, 'Ayuda']);
    await b.captura(path.join(salida, '3-v26-con-datos.png'));
    // Lo que se ve con lo guardado.
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-tour"]');
    check('«Aprender a usarla»: «Lo esencial» a medias y «Ahorros» hecho', await texto('.ay'), (t) => t.includes('Ibas en el paso 4 de 6') && t.includes('1 de 5 hechos'));
    await b.captura(path.join(salida, '4-aprender-a-usarla.png'));
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    check('«Prueba guiada»: sigue donde iba (la tarea de Carlos ya no está)', await texto('[data-fk="ay-prueba"]'), 'Prueba guiada La dejaste en la tarea 6 de 6');
    await clic('[data-fk="au-contar"]');
    const t = await ev('document.getElementById("ay-texto").value');
    check('«Cuéntale…»: su nombre, sus respuestas y la prueba (sin Carlos ni letra)', t, (x) => x.includes('Nombre: Prueba') && x.includes('Cómo me ha ido:') && x.includes('Prueba guiada: la dejé en la tarea 6 de 6') && x.includes('5. Volver después de dos semanas: la logré') && !/Carlos|\bset\b/i.test(x));
    await b.captura(path.join(salida, '5-cuentale.png'));
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-prueba"]');
    check('retomar: la última tarea, con los ejemplos', [await ev('P.modo'), await texto('.ay .paso')], ['entrenamiento', 'Tarea 6 de 6 · la última']);
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-g-salir"]');
    await clic('[data-fk="ay-usar"]');
    check('de vuelta a tus datos, igual', [await ev('P.modo'), await texto('.portada-n')], ['uso', libreNuevo || libreAntes]);
    // ------------------------------------------------------------ v2.7 (DATOS-5): Carlos, Rosa y el set sintético.
    if (NUEVA27) {
        const principal = await ev(`localStorage.getItem('pamplanea-uso:v1')`);
        for (const nombre of Object.keys(crudos)) {
            // Lo que guardó la versión vieja, como si esa persona abriera ahora la nueva (sin la copia de «Prueba»).
            await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', ${JSON.stringify(crudos[nombre])}); localStorage.removeItem(${JSON.stringify(CLAVE_COPIA)}); true`);
            await b.ir(base + 'telefono.html');
            await esperar(900);
            const r = await ev(`({ modo: P.modo, nombre: P.st && P.st.nombre, bloqueo: P.modos.bloqueado(), nov: !!document.getElementById('nov-t'), titulo: document.getElementById('nov-t')?.innerText.trim() || null, lineas: [...document.querySelectorAll('.nov-lista li')].map((li) => li.innerText.trim()) })`);
            // v2.9.1: de la v2.9 a la v2.9.1, el cuadrito solo sale a quien le cambió algo (la fecha de su tarjeta).
            // v2.9.2: «Cambiada P» ve el de la v2.9.2; «Victor P», el de la fecha solo si viene de antes de la v2.9.1.
            const conCuadrito = !PARCHE || (nombre === 'Victor P' && !VIEJA291) || (nombre === 'Cambiada P' && !desde292(VIEJA));
            check(`${nombre}: abre con sus datos${conCuadrito ? ' y el cuadrito' : ' (sin cuadrito: no le cambió nada)'}`, [r.modo, r.nombre, r.bloqueo, r.nov], ['uso', nombre, false, conCuadrito]);
            if (nombre === 'Sintética') await b.captura(path.join(salida, '7-sintetica-novedades.png'));
            const viejo = JSON.parse(crudos[nombre]);
            let fechaElegida = null;
            if (nombre === 'Victor P') {
                // Con su estado de cuenta pendiente: sin respuesta no cambia nada; la pregunta está en Hoy (y en el cuadrito de la v2.9.1).
                check('Victor P: sin respuesta, cero pérdidas (su estado de cuenta pendiente, intacto)', perdidas(viejo.st, (await guardado())['pamplanea-uso:v1'].st), []);
                if (PARCHE && !VIEJA291) {
                    check('Victor P: el cuadrito pregunta cuál es', await texto('.nov-q span'), (t) => typeof t === 'string' && t.startsWith('Tu estado de cuenta de Tarjeta Liss vence el') && t.endsWith('¿Cuál es?'));
                    fechaElegida = await ev(`document.querySelector('[data-fk="nov-dia-t1-tarjeta"]').dataset.v`);
                    await clic('[data-fk="nov-dia-t1-tarjeta"]');
                    check('Victor P: con la respuesta, una línea con el antes y el después', await ev(`[...document.querySelectorAll('.nov-lista li')].map((li) => li.innerText.trim())`), (x) => x.length === 1 && /^Listo: Tarjeta Liss vence el .+ \(antes, .+\)\.$/.test(x[0]));
                    await b.captura(path.join(salida, '8-victor-fecha.png'));
                }
            }
            if (nombre === 'Cambiada P' && PARCHE) {
                check('Cambiada P: el cuadrito de la v2.9.2, con su mes antes y después', [r.titulo, r.lineas.some((l) => /^Tu mes de \S+: te (quedarían|faltarían) \$[\d,.]+; antes decía \$[\d,.]+ porque .+ se contaban? dos veces\.$/.test(l))], ['Tu mes, bien contado ✨', true]);
                await b.captura(path.join(salida, '9-cambiada-v292.png'));
            }
            if (conCuadrito) await clic('[data-fk="nov-ok"]');
            if (nombre === 'Victor P' && (!PARCHE || VIEJA291)) check('Victor P: la pregunta sigue en Hoy', await ev(`document.getElementById('pantalla').textContent.includes('¿Cuál es?')`), true);
            const g = await guardado();
            check(`${nombre}: la copia por versión, intacta`, g[CLAVE_COPIA] && JSON.stringify(g[CLAVE_COPIA].datos) === crudos[nombre], true);
            // (Victor P, al contestar: solo cambia la fecha de su estado de cuenta pendiente.)
            check(`${nombre}: cero pérdidas`, perdidas(viejo.st, g['pamplanea-uso:v1'].st).filter((x) => !(fechaElegida && x.startsWith('tarjetas t1.estados:'))), []);
            if (fechaElegida) {
                const e0 = viejo.st.tarjetas.find((t) => t.id === 't1').estados;
                const e1 = g['pamplanea-uso:v1'].st.tarjetas.find((t) => t.id === 't1').estados;
                check('Victor P: su estado de cuenta, igual salvo la fecha que eligió', [e1.length, JSON.stringify({ ...e1.at(-1), vence: null }) === JSON.stringify({ ...e0.at(-1), vence: null }), e1.at(-1).vence], [e0.length, true, fechaElegida]);
            }
            const nuevos = await ev(NUMEROS);
            check(`${nombre}: los saldos de sus cuentas, iguales`, nuevos.saldos, viejos[nombre].saldos);
            const n = (g['pamplanea-uso:v1'].novedades || {})[NOV];
            // v2.9.2: de antes de la v2.9, el de la v2.9.2 queda listo para la siguiente vez que abra.
            if (nombre === 'Cambiada P' && !PARCHE) check('Cambiada P: el cuadrito de la v2.9.2 queda para la siguiente vez', ((g['pamplanea-uso:v1'].novedades || {})['v2.9.2'] || {}).lineas, (x) => Array.isArray(x) && x.some((l) => l.includes('se contaba')));
            if (PARCHE) {
                // (Victor P eligió una fecha: con qué ingreso se paga puede cambiar con ella, D-4.)
                if (!fechaElegida) check(`${nombre}: tu libre, igual que en la versión vieja`, nuevos.libre, viejos[nombre].libre);
                continue;
            }
            check(`${nombre}: los números «de antes» son los que mostraba la versión vieja (DATOS-4)`, [n.antes.mes.salio, n.antes.mes.entro, n.antes.libre, Object.fromEntries(n.antes.tarjetas.map((t) => [t.id, t.debe]))], [viejos[nombre].mes[0], viejos[nombre].mes[1], viejos[nombre].libre, viejos[nombre].tarjetas]);
            const cambio = n.antes.mes.salio !== n.despues.mes.salio || n.antes.libre !== n.despues.libre || n.antes.tarjetas.some((t) => t.debe !== n.despues.tarjetas.find((x) => x.id === t.id).debe);
            check(`${nombre}: si un número cambió, el cuadrito lo dice (y si no, no)`, r.lineas.some(lineaCambio), cambio);
            if (nombre === 'Sintética' && !desde27(VIEJA)) {
                check('Sintética: F01 — el gasto del mes ya no cuenta $20 dos veces', n.antes.mes.salio - n.despues.mes.salio, 2000);
                check('Sintética: F02/F03 — lo que debe de Visa: $2,050 → $1,900', [n.antes.tarjetas.find((t) => t.id === 't900').debe, n.despues.tarjetas.find((t) => t.id === 't900').debe], [205000, 190000]);
                // F04: cambiar después la cuenta del débito no mueve lo de antes.
                const antesF04 = await ev(`MOTOR.saldoLugar(P.st, 'agricola')`);
                await ev(`P.cambiar((s) => { s.medios.find((m) => m.id === 'debito').lugar = 'efectivo'; }, { aviso: null }); true`);
                check('Sintética: F04 — cambiar la cuenta del débito después no mueve lo de antes', await ev(`MOTOR.saldoLugar(P.st, 'agricola')`), antesF04);
            }
            if (nombre === 'Sintética') {
                check('Sintética: F12 — lo de $50 de $100 marcado «pagado» en la v2.6.7 sigue igual (no se cambia solo)', await ev(`MOTOR.ocurrenciasPago(P.st, MOTOR.pago(P.st, 'p900'), '2026-01-01', P.st.hoy).map((o) => o.estado + ' ' + o.monto).slice(-1)`), ['pagado 5000']);
            }
        }
        // De vuelta a «Prueba», ya actualizada.
        await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', ${JSON.stringify(principal)}); true`);
        await b.ir(base + 'telefono.html');
        await esperar(800);
    }
    // ------------------------------------------------------------ Cierre v2.8 (adenda A, APROBADO por Victor 2026-10-22):
    // «que se les haga fácil recuperar datos también». Recuperar la copia «antes de la actualización» devuelve los datos de
    // la versión vieja, y lo de ahora queda como otra copia («Antes de recuperar»): cero pérdidas en los dos sentidos.
    if (NUEVA28) {
        // (Carlos, Rosa y la sintética dejaron su propia copia: se vuelve a poner la de «Prueba», la de esta actualización.)
        await ev(`localStorage.setItem(${JSON.stringify(CLAVE_COPIA)}, ${JSON.stringify(JSON.stringify(despues[CLAVE_COPIA]))}); true`);
        const ahora = (await guardado())['pamplanea-uso:v1'];
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        check('«Tus datos»: «Guardar una copia en mi teléfono» y «Antes de la actualización · fecha»', [await texto('[data-fk="dt-copia"]'), await texto('.ay-copias')], (x) => x[0] === 'Guardar una copia en mi teléfono' && /Antes de la actualización · \d+ \S+/.test(x[1] || ''));
        await b.captura(path.join(salida, '7-tus-datos.png'));
        await clic(`[data-a="modoCopiaInterna"][data-id="${CLAVE_COPIA}"]`);
        check('al tocar «Recuperar»: «Tus datos de ahora se guardan primero, por si te arrepientes»', await texto('#dt-r-c'), (t) => typeof t === 'string' && t.includes('Tus datos de ahora se guardan primero, por si te arrepientes'));
        await clic('[data-fk="dt-r-si"]');
        await esperar(900);
        const tras = await guardado();
        check('recuperar «antes de la actualización»: los datos de la versión vieja, sin perder nada', perdidas(antes['pamplanea-uso:v1'].st, tras['pamplanea-uso:v1'].st), []);
        const claveAntes = Object.keys(tras).find((k) => k.startsWith('pamplanea-uso:respaldo:antes-de-restaurar-'));
        check('lo de ahora quedó como copia, tal cual («Antes de recuperar»)', claveAntes && JSON.stringify(tras[claveAntes].datos.st) === JSON.stringify(ahora.st), true);
        check('la copia de antes de la actualización sigue intacta', JSON.stringify(tras[CLAVE_COPIA]) === JSON.stringify(despues[CLAVE_COPIA]), true);
        // Y de vuelta: recuperar «Antes de recuperar» devuelve lo de ahora.
        await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); document.querySelector('[data-fk="nov-ok"]')?.click(); true`);
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        check('«Antes de recuperar» arriba (la más nueva)', await texto('.ay-copias .fila'), (t) => typeof t === 'string' && t.startsWith('Antes de recuperar'));
        await clic(`[data-a="modoCopiaInterna"][data-id="${claveAntes}"]`);
        await clic('[data-fk="dt-r-si"]');
        await esperar(900);
        const vuelta = (await guardado())['pamplanea-uso:v1'];
        check('recuperar «Antes de recuperar»: lo de ahora otra vez, sin perder nada', [perdidas(ahora.st, vuelta.st), JSON.stringify(vuelta.st.registros) === JSON.stringify(ahora.st.registros)], [[], true]);
        await ev(`document.querySelector('[data-fk="nov-ok"]')?.click(); true`);
        check('y el mismo libre de antes de recuperar', await texto('.portada-n'), libreNuevo || libreAntes);
    }
    // ------------------------------------------------------------ 3. Sin internet: abre la v2.6 con todo.
    await apagar();
    await b.ir(base);
    await esperar(900);
    check('sin internet: la versión nueva con tus datos', [await ev('window.VERSION_PROTOTIPO'), await ev('P.modo'), await texto('.portada-n'), await ev('document.fonts.check("16px Instrument Sans")')], [NUEVA, 'uso', libreNuevo || libreAntes, true]);
    await b.captura(path.join(salida, '6-sin-internet.png'));
} catch (e) {
    informe.fallos.push('excepción: ' + e.message);
    await b.captura(path.join(salida, 'ERROR.png')).catch(() => null);
}
informe.errores = b.errores;
informe.fallidas = b.fallidas.filter((f) => !/ERR_CONNECTION_REFUSED/.test(f));
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas }, null, 1));
b.cerrar();
await apagar();
await rm(v25, { recursive: true, force: true }).catch(() => null);
