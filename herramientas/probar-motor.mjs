// Prueba rápida del motor en Node (sin navegador): números de Ana, Carlos, el planeador y el escenario
// de Victor (V2-34, V2-35, V2-43), reparto entre quincenas y frases del intérprete.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {}, console, structuredClone };
vm.createContext(ctx);
for (const f of ['datos.js', 'motor.js']) vm.runInContext(await readFile(path.join(root, f), 'utf8'), ctx, { filename: f });
const { DATOS: D, MOTOR: M } = ctx.window;
const fallos = [];
const igual = (nombre, real, esperado) => {
    if (JSON.stringify(real) !== JSON.stringify(esperado)) fallos.push(`${nombre}: ${JSON.stringify(real)} ≠ ${JSON.stringify(esperado)}`);
};

const ana = D.crearAna();
const a = M.calcular(ana);
igual('Ana tienes', a.tienes, 149560);
igual('Ana apartado', a.apartado, 90000);
igual('Ana por pagar (luz vencida)', a.porPagar, 3500);
// v2.8 (D-4, U01): el estado de cuenta de BAC ($245, vence el 5 nov) se paga como cualquier pago: los $230 que anotaste en
// compras siguen saliendo de lo que tienes y los $15 de intereses van con tu quincena del 30 (antes: $290 y $270.60).
igual('Ana tarjeta', a.enTarjetas, 27500);
igual('Ana libre (sin reserva automática)', a.libre, 28560);
igual('Ana días', a.hz.dias, 9);
igual('Ana por día', a.porDia, 3100);
igual('Ana próxima quincena (v2.8 D-4: con los $15 de la tarjeta)', [a.proxima.clave, a.proxima.entra, a.proxima.pagos, a.proxima.quedan], ['2026-10-30', 60000, 7000, 53000]);
igual('Ana efectivo', M.saldoLugar(ana, 'efectivo'), 4000);
igual('Ana banco', M.saldoLugar(ana, 'agricola'), 145560);
igual('Ana sin avisos', a.avisos.map((x) => x.tipo), []);

const carlos = D.crearCarlos();
const k = M.calcular(carlos);
igual('Carlos libre (nada automático)', k.libre, 12500);
igual('Carlos días', k.hz.dias, 2);
igual('Carlos: sugerencia para el viernes 30', k.avisos.map((x) => [x.tipo, x.nivel, x.periodo && x.periodo.clave, x.periodo && x.periodo.deficit, x.fuente]), [['sugerencia', 'ambar', '2026-10-30', 7000, '2026-10-23']]);
// «Repartirlo parejo» como regla: lo que tienes ahora, viernes 23 y viernes 30.
carlos.pagos[0].pagarCon = { modo: 'parejo', desde: '2026-10-16' };
igual('Carlos parejo', M.asignacion(carlos, carlos.pagos[0], '2026-11-01', 15000).map((x) => [x.de, x.monto]), [['2026-10-16', 5000], ['2026-10-23', 5000], ['2026-10-30', 5000]]);
igual('Carlos parejo: libre', M.calcular(carlos).libre, 7500);

const planea = D.crearAna('planea');
const p = M.calcular(planea);
igual('Planea libre', p.libre, 56060);
igual('Planea estado pendiente', !!p.tarjetas[0].pendiente, true);

// ---- Victor (V2-34, V2-35, V2-43): empezó el sábado 17 de octubre.
const c = D.c;
const hoy = '2026-10-17';
const v = D.crearNueva();
Object.assign(v, { persona: 'uso', hoy, inicio: hoy, configurado: true, nombre: 'Victor', seq: 3 });
v.lugares = [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵', cuadre: { fecha: hoy, seq: 1, monto: c('120') } }, { id: 'banco', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦', cuadre: { fecha: hoy, seq: 2, monto: 0 } }];
v.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }];
v.registros = [{ id: 'r1', seq: 1, tipo: 'cuadre', fecha: hoy, lugar: 'efectivo', monto: c('120'), esperado: c('120'), primero: true }, { id: 'r2', seq: 2, tipo: 'cuadre', fecha: hoy, lugar: 'banco', monto: 0, esperado: 0, primero: true }];
v.ingresos = [
    { id: 'q', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: c('597'), aprox: true, frecuencia: 'quincenal', dias: [14, 29], lugar: 'efectivo', desde: hoy, llegadas: {}, principal: true },
    { id: 'pareja', nombre: 'Salario de mi pareja', emoji: '💼', categoria: 'otro', monto: c('566'), aprox: true, frecuencia: 'quincenal', dias: [14, 29], lugar: 'efectivo', desde: hoy, llegadas: {}, principal: false, extra: true },
    { id: 'ag', nombre: 'Aguinaldo', emoji: '🎁', categoria: 'aguinaldo', monto: c('1000'), aprox: true, frecuencia: 'unico', fecha: '2026-12-12', lugar: 'efectivo', principal: false, extra: true, desde: hoy, llegadas: {} },
];
const pago = (id, nombre, monto, x = {}) => ({ id, nombre, emoji: '🧾', categoria: 'otros', monto: c(monto), estimado: false, frecuencia: 'mensual', dia: 30, medio: 'efectivo', avisos: [], desde: hoy, hechos: {}, previos: [], ...x });
v.pagos = [pago('cu', 'Cuchubal', '25', { frecuencia: 'quincenal', dias: [8, 23] }), pago('al', 'Alquiler', '200'), pago('lu', 'Luz', '60', { estimado: true }), pago('ag', 'Agua', '3', { estimado: true }), pago('in', 'Internet', '30'), pago('ma', 'Pago de mi mama', '160', { estimado: true }), pago('li', 'Préstamo Liss', '156'), pago('pr', 'Préstamo', '79')];
const kv = M.calcular(v);
igual('Victor libre', kv.libre, 9500);
igual('Victor ~por día', kv.porDia, 790);
igual('Victor hasta el 29, 12 días', [kv.hz.fecha, kv.hz.dias], ['2026-10-29', 12]);
igual('Victor sin avisos', kv.avisos, []);
igual('Victor próxima quincena', [kv.proxima.entra, kv.proxima.pagos, kv.proxima.quedan, kv.proxima.otros.map((o) => o.monto)], [116300, 71300, 45000, [56600]]);
igual('Victor: el 14 (antes de empezar) ya está en su cuadre', [M.fundado(v, '2026-10-14'), M.fundado(v, '2026-10-29')], [true, false]);
// $100 de esta quincena y $100 de la del 29.
v.pagos[1].asignaciones = { '2026-10-30': [{ de: 'ahora', monto: c('100') }] };
const kr = M.calcular(v);
igual('Victor repartido', [kr.reservadoPagos, kr.faltaPagos, kr.proxima.pagos], [10000, 500, 61300]);
delete v.pagos[1].asignaciones;
// El 29 llega solo la quincena: falta, pero lo cubre la pareja ese día (ámbar, no rojo).
v.hoy = '2026-10-29';
v.ingresos[0].llegadas['2026-10-29'] = { monto: c('597') };
v.registros.push({ id: 'r3', seq: 3, tipo: 'ingreso', fecha: '2026-10-29', monto: c('597'), lugar: 'efectivo', ingreso: 'q', ocurrencia: '2026-10-29' });
igual('Victor el 29 sin la pareja', M.calcular(v).avisos.map((x) => [x.tipo, x.nivel, x.faltan]), [['falta', 'ambar', 2100]]);

// ---- Revisión v2.3: viaje del dinero.
// (1) Lo de la pareja llega un día antes (el 28, para el 29): es de esa quincena, no del libre de hoy.
v.hoy = '2026-10-28';
delete v.ingresos[0].llegadas['2026-10-29'];
v.registros = v.registros.filter((r) => r.id !== 'r3');
v.ingresos[1].llegadas['2026-10-29'] = { monto: c('566') };
v.registros.push({ id: 'r5', seq: 5, tipo: 'ingreso', fecha: '2026-10-28', monto: c('566'), lugar: 'efectivo', ingreso: 'pareja', ocurrencia: '2026-10-29' });
let kx = M.calcular(v);
igual('adelanto: el libre de hoy no cambia', kx.libre, 9500);
igual('adelanto: la próxima quincena lo cuenta', [kx.proxima.entra, kx.proxima.quedan, kx.reservadoProxima], [116300, 45000, 56600]);
v.ingresos[1].llegadas['2026-10-29'].usarYa = true;
igual('«Usarlo desde ya»', M.calcular(v).libre, 9500 + 56600);
delete v.ingresos[1].llegadas['2026-10-29'];
v.registros = v.registros.filter((r) => r.id !== 'r5');
// (2) La quincena del 29 llega adelantada el 28: el periodo ya empezó; el horizonte pasa al 14.
v.ingresos[0].llegadas['2026-10-29'] = { monto: c('597') };
v.registros.push({ id: 'r6', seq: 6, tipo: 'ingreso', fecha: '2026-10-28', monto: c('597'), lugar: 'efectivo', ingreso: 'q', ocurrencia: '2026-10-29' });
kx = M.calcular(v);
igual('adelantada: horizonte al 14', [kx.hz.fecha, kx.hz.inicioPeriodo], ['2026-11-14', '2026-10-29']);
igual('adelantada: falta, pero lo cubre la pareja (ámbar)', kx.avisos.map((x) => [x.tipo, x.nivel, x.faltan]), [['falta', 'ambar', 2100]]);
delete v.ingresos[0].llegadas['2026-10-29'];
v.registros = v.registros.filter((r) => r.id !== 'r6');
v.hoy = '2026-10-17';
// (3) Cambia el ingreso principal: lo elegido con la quincena vieja no se pierde (va al día de pago que toca).
v.pagos[1].asignaciones = { '2026-10-30': [{ de: '2026-10-29', monto: c('200') }] };
v.reservas = [{ id: 'rv1', de: 'ahora', para: '2026-10-29', monto: c('20') }];
v.ingresos[0].dias = [15, 30];
kx = M.calcular(v);
igual('principal nuevo: el alquiler va al 30', M.asignacion(v, v.pagos[1], '2026-10-30', c('200'), kx.hz).map((x) => x.de), ['2026-10-30']);
igual('principal nuevo: lo pasado a la próxima sigue contando', [kx.reservadoProxima, kx.proxima.clave, kx.proxima.entraRes], [2000, '2026-10-30', 2000]);
v.ingresos[0].dias = [14, 29];
delete v.pagos[1].asignaciones;
v.reservas = [];
// (3b) La quincena del 29 no va a caer («No me va a caer»): el periodo sigue con $0 y lo del 30 sale de lo que tiene.
v.hoy = '2026-10-30';
v.ingresos[0].llegadas['2026-10-29'] = { monto: 0, noLlego: true };
kx = M.calcular(v);
igual('no llegó: el periodo sigue', [kx.hz.fecha, kx.hz.atrasadas.length], ['2026-11-14', 0]);
igual('no llegó: falta de verdad (lo de la pareja no alcanza: rojo)', kx.avisos.filter((x) => x.tipo === 'falta').map((x) => [x.nivel, x.faltan]), [['rojo', 61800]]);
delete v.ingresos[0].llegadas['2026-10-29'];
v.hoy = '2026-10-17';
// (4) Cambio de año y febrero corto: la quincena del 30 cae el 28; el pago del 30 se paga con ella.
const ene = { frecuencia: 'quincenal', dias: [15, 30] };
igual('quincenas de febrero', M.fechasRegla(ene, '2027-02-01', '2027-03-01'), ['2027-02-15', '2027-02-28']);
igual('cambio de año', M.fechasRegla({ frecuencia: 'mensual', dia: 31 }, '2026-12-01', '2027-02-28'), ['2026-12-31', '2027-01-31', '2027-02-28']);

// ---- Frecuencias (V2-36).
igual('cada 2 semanas', M.fechasRegla({ frecuencia: 'catorcenal', fecha: '2026-10-23' }, '2026-10-01', '2026-11-30'), ['2026-10-09', '2026-10-23', '2026-11-06', '2026-11-20']);
igual('15 y último día', M.fechasRegla({ frecuencia: 'quincenal', dias: [15, 31] }, '2026-11-01', '2026-12-31'), ['2026-11-15', '2026-11-30', '2026-12-15', '2026-12-31']);
igual('cada 3 meses', M.fechasRegla({ frecuencia: 'meses', cadaMeses: 3, fecha: '2026-11-30' }, '2026-10-01', '2027-06-30'), ['2026-11-30', '2027-02-28', '2027-05-30']);
igual('cada año', M.fechasRegla({ frecuencia: 'meses', cadaMeses: 12, fecha: '2026-12-12' }, '2026-10-01', '2028-01-01'), ['2026-12-12', '2027-12-12']);
igual('fechas a medida', M.fechasRegla({ frecuencia: 'fechas', fechas: ['2026-11-03', '2026-10-25', '2026-10-25'] }, '2026-10-01', '2026-12-01'), ['2026-10-25', '2026-11-03']);
// Ajuste 7 y cierre (APROBADO por Victor 2026-10-22): «aprox.» después del monto, con centavos; lo que entra con «+».
igual('«+$597.00 aprox.»', M.dinero(c('597'), { signo: true, aprox: true }), '+$597.00 aprox.');

const frases = ['súper 25', 'pupusas 6', 'zapatos 45 tarjeta', 'me pagaron 600', 'vendí 45', 'acuérdame colegio 20 el 5', 'luz 35 el 12', 'aparté 50 emergencias', 'ahorré 20 emergencias', 'guardé 30 emergencias', 'tengo 300', 'retiré 100 del cajero', 'medicina 40', 'hola', 'gasté 12 en bus ayer', 'pagué la tarjeta 245'];
const salida = {};
for (const f of frases) {
    const d = M.entender(ana, f);
    salida[f] = [d.tipo, d.monto, d.nombre, d.categoria, d.medio, d.fecha, d.dia, d.pago, d.ocurrencia, d.ingresoRef && d.ingresoRef.fecha, d.apartado, d.lugar, d.de, d.a, d.sugerirApartado, M.faltan(ana, d).join('+')].map((x) => (x === null || x === undefined ? '·' : x)).join(' | ');
}
igual('«ahorré» y «guardé» son ahorrar', [M.entender(ana, 'ahorré 20 emergencias').tipo, M.entender(ana, 'guardé 30 emergencias').tipo], ['apartar', 'apartar']);
console.log(JSON.stringify({ fallos, frases: salida }, null, 1));
process.exitCode = fallos.length ? 1 : 0;
