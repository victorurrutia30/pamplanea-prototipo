// CAPTURAS v2.9.1 (reporte de Victor, 2026-10-23) a 390×844: con datos como los de Victor (Tarjeta Liss con corte el 21 y
// su estado de cuenta del 21 oct; «Mi Quincena» el 14 y el 29 con un adelanto que se descuenta el 14 y el 29 nov), hoy 23 oct:
//  1) Editar → «¿Qué día vence tu próximo pago?» 14: la línea con la fecha completa
//  2) la ficha de la tarjeta después de guardar (todo dice el 14 nov)
//  3) Mi plan → Mes → noviembre, por fecha (la fila del adelanto completa y las dos líneas con su fecha), arriba y abajo
//  4) Hoy y 5) la pregunta «¿Cuál es?» con los datos que dejó la v2.9.0 (la tarjeta dice el 14 y su estado de cuenta, el 15)
// Uso: node herramientas/capturas-v291.mjs [--puerto=9979] [--tema=ancla-oscuro]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const salida = path.join(aqui, 'capturas', 'v291' + (args.tema ? '-' + args.tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9979) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-23';` });
await b.ir(pathToFileURL(aqui).href + '/telefono.html');
await esperar(600);
const ev = (s) => b.evaluar(s);
const foto = async (n) => {
    await esperar(250);
    await b.captura(path.join(salida, n + '.png'));
};
const fallos = [];
const armar = (pagoDia) => ev(`(() => {
    const st = { persona: 'uso', nombre: 'Victor', espacio: 'Mi casa', hoy: '2026-10-23', inicio: '2026-10-01', configurado: true, horizonteVariable: null,
        lugares: [{ id: 'banco', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦', cuadre: { fecha: '2026-10-01', seq: 1, monto: 120000 } }, { id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵', cuadre: { fecha: '2026-10-01', seq: 2, monto: 8000 } }],
        medios: [{ id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: 'banco' }, { id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }, { id: 'mt1', nombre: 'Crédito Liss', emoji: '💳', tarjeta: 't1' }],
        tarjetas: [{ id: 't1', nombre: 'Crédito Liss', apodo: 'Tarjeta Liss', emoji: '💳', tipo: 'tarjeta', corte: 21, pagoDia: ${pagoDia}, cupo: 100000, interesesAnio: 0, desde: '2026-10-01', medio: 'transferencia', estados: [{ corte: '2026-10-21', total: 30000, minimo: 5000, aPagar: 30000, opcion: 'total', vence: '2026-11-15', anotado: 0, seq: 9 }] }],
        apartados: [], logros: [], variables: [],
        pagos: [{ id: 'luz', nombre: 'Luz', emoji: '💡', categoria: 'servicios', monto: 3500, estimado: true, frecuencia: 'mensual', dia: 12, medio: 'transferencia', avisos: [], desde: '2026-10-13', creado: '2026-10-13', hechos: {}, previos: [] }],
        ingresos: [
            { id: 'q', nombre: 'Mi Quincena', emoji: '💼', categoria: 'salario', monto: 59700, aprox: false, frecuencia: 'quincenal', dias: [14, 29], lugar: 'banco', principal: true, desde: '2026-10-01', llegadas: { '2026-10-14': { monto: 59700 } } },
            { id: 'ad', nombre: 'Adelanto', emoji: '💵', categoria: 'otro', tipoIngreso: 'adelanto', monto: 62800, aprox: false, frecuencia: 'unico', fecha: '2026-10-20', lugar: 'efectivo', principal: false, extra: true, desde: '2026-10-20', llegadas: { '2026-10-20': { monto: 62800 } }, adelanto: { descuentos: [{ ingreso: 'q', fecha: '2026-11-14', monto: 32800 }, { ingreso: 'q', fecha: '2026-11-29', monto: 32800 }] } },
        ],
        registros: [
            { id: 'r1', seq: 1, tipo: 'cuadre', fecha: '2026-10-01', lugar: 'banco', monto: 120000, esperado: 120000, primero: true },
            { id: 'r2', seq: 2, tipo: 'cuadre', fecha: '2026-10-01', lugar: 'efectivo', monto: 8000, esperado: 8000, primero: true },
            { id: 'r3', seq: 3, tipo: 'ingreso', fecha: '2026-10-14', monto: 59700, nombre: 'Mi Quincena', categoria: 'salario', emoji: '💼', lugar: 'banco', ingreso: 'q', ocurrencia: '2026-10-14' },
            { id: 'r4', seq: 4, tipo: 'ingreso', fecha: '2026-10-20', monto: 62800, nombre: 'Adelanto', categoria: 'otro', emoji: '💵', lugar: 'efectivo', ingreso: 'ad', ocurrencia: '2026-10-20' },
        ],
        avisos: [], reservasTarjeta: [], cerrados: [], reservas: [], seq: 20, interesInvitar: false };
    P.ui.hoja && P.cerrarHoja({ sinFoco: true });
    if (P.ayuda && P.ayuda.abierto) P.ayuda.cerrar();
    P.cargar(st, { tab: 'hoy' });
    ${args.tema ? `P.aplicarTema && P.aplicarTema(${JSON.stringify(args.tema)});` : ''}
    return true;
})()`);
try {
    // 1) y 2) Como Victor: la ficha → Editar → 14 → Guardar cambios.
    await armar(15);
    await ev(`P.ui.stack = []; P.abrir('tarjeta', 't1'); true`);
    await ev(`document.querySelector('[data-fk="editar-tarjeta"]').click(); true`);
    await esperar(200);
    await ev(`(() => { const el = document.getElementById('f-pagoDia'); el.focus({ preventScroll: true }); el.value = '14'; el.dispatchEvent(new Event('input', { bubbles: true })); el.blur(); document.getElementById('vence-linea').scrollIntoView({ block: 'center' }); return true; })()`);
    await foto('1-editar-14');
    await ev(`document.querySelector('[data-fk="deuda-ok"]').click(); true`);
    await esperar(300);
    await ev(`(() => { const s = document.querySelector('.hoja-c, #vista'); window.scrollTo(0, 0); document.querySelectorAll('*').forEach((x) => { if (x.scrollTop) x.scrollTop = 0; }); return true; })()`);
    await foto('2-ficha-tarjeta');
    await ev(`document.getElementById('t-est')?.scrollIntoView({ block: 'center' }); true`);
    await foto('2b-ficha-tarjeta-estado');
    const ficha = await ev(`document.getElementById('pantalla').textContent.replace(/\\s+/g, ' ')`);
    if (/15 (de )?nov/.test(ficha) || !ficha.includes('pago el 14')) fallos.push('ficha: ' + ficha.slice(0, 300));
    // 3) Mi plan → Mes → noviembre.
    await ev(`P.ui.stack = []; P.ui.pagosVista = 'mes'; P.ui.pagosModo = 'fecha'; P.ui.pagosMes = '2026-11'; P.irTab('pagos'); window.scrollTo(0, 0); document.querySelectorAll('*').forEach((x) => { if (x.scrollTop) x.scrollTop = 0; }); true`);
    await foto('3-mi-plan-mes-noviembre');
    await ev(`document.querySelector('[data-fk="i-q-2026-11-29"]')?.scrollIntoView({ block: 'center' }); true`);
    await foto('3b-mi-plan-mes-noviembre-abajo');
    const mes = await ev(`document.getElementById('plan-panel').textContent.replace(/\\s+/g, ' ')`);
    if (/15 nov/.test(mes) || !mes.includes('14 nov · Mi Quincena') || !mes.includes('29 nov · Mi Quincena')) fallos.push('mes: ' + mes.slice(0, 400));
    // 4) Hoy.
    await ev(`P.irTab('hoy'); window.scrollTo(0, 0); true`);
    await foto('4-hoy');
    // 5) Con lo que dejó la v2.9.0: la tarjeta dice el 14 y su estado de cuenta el 15 nov → «¿Cuál es?».
    await armar(14);
    await ev(`P.irTab('hoy'); document.getElementById('p28-t')?.scrollIntoView({ block: 'center' }); true`);
    await foto('5-cual-es-hoy');
    await ev(`P.ui.stack = []; P.abrir('tarjeta', 't1'); window.scrollTo(0, 0); true`);
    await foto('5b-cual-es-ficha');
} catch (e) {
    fallos.push('excepción: ' + e.message);
}
console.log(JSON.stringify({ salida, fallos, errores: b.errores }, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
