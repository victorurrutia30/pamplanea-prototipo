// CAPTURAS v2.9.2 (reporte de Victor, 2026-10-23) a 390×844: con datos como los de Victor (Tarjeta Liss de $100.38 que
// vence el 14 nov; «Mi Quincena» el 14 y el 29, con un adelanto que se descuenta el 29 oct y el 14 nov), hoy 23 oct:
//  1) Editar → «¿Con qué ingreso la pagas?»: primero lo que tienes ahora, después por fecha; sin el adelanto que ya llegó
//  2) eligió «Con tu quincena del 29»: Próxima la cuenta bajo el 29 oct («vence el 14 nov»)
//  3) Mes de octubre la incluye (bajo el 29 oct) y 4) Mes de noviembre la muestra en gris, sin sumar
//  5) «Cambiar o repartir», repartida entre las dos quincenas, y Mes de noviembre con la fila gris que dice cómo quedó
// Uso: node herramientas/capturas-v292.mjs [--puerto=9978] [--tema=ancla-oscuro]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const salida = path.join(aqui, 'capturas', 'v292' + (args.tema ? '-' + args.tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9978) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-23';` });
await b.ir(pathToFileURL(aqui).href + '/telefono.html');
await esperar(600);
const ev = (s) => b.evaluar(s);
const foto = async (n) => {
    await esperar(250);
    // El aviso «Cambios guardados» no tapa lo que se mira.
    await ev(`(() => { const z = document.getElementById('capa-toast'); if (z) z.innerHTML = ''; return true; })()`);
    await b.captura(path.join(salida, n + '.png'));
};
const fallos = [];
const arriba = `window.scrollTo(0, 0); document.querySelectorAll('*').forEach((x) => { if (x.scrollTop) x.scrollTop = 0; });`;
await ev(`(() => {
    const st = { persona: 'uso', nombre: 'Victor', espacio: 'Mi casa', hoy: '2026-10-23', inicio: '2026-10-01', configurado: true, horizonteVariable: null,
        lugares: [{ id: 'banco', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦', cuadre: { fecha: '2026-10-01', seq: 1, monto: 120000 } }, { id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵', cuadre: { fecha: '2026-10-01', seq: 2, monto: 8000 } }],
        medios: [{ id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: 'banco' }, { id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }, { id: 'mt1', nombre: 'Crédito Liss', emoji: '💳', tarjeta: 't1' }],
        tarjetas: [{ id: 't1', nombre: 'Crédito Liss', apodo: 'Tarjeta Liss', emoji: '💳', tipo: 'tarjeta', corte: 21, pagoDia: 14, cupo: 100000, interesesAnio: 0, desde: '2026-10-01', medio: 'transferencia', estados: [{ corte: '2026-10-21', total: 10038, minimo: 2500, aPagar: 10038, opcion: 'total', vence: '2026-11-14', anotado: 0, seq: 9 }] }],
        apartados: [], logros: [], variables: [],
        pagos: [{ id: 'luz', nombre: 'Luz', emoji: '💡', categoria: 'servicios', monto: 3500, estimado: true, frecuencia: 'mensual', dia: 5, medio: 'transferencia', avisos: [], desde: '2026-10-13', creado: '2026-10-13', hechos: {}, previos: [] }],
        ingresos: [
            { id: 'q', nombre: 'Mi Quincena', emoji: '💼', categoria: 'salario', monto: 59700, aprox: false, frecuencia: 'quincenal', dias: [14, 29], lugar: 'banco', principal: true, desde: '2026-10-01', llegadas: { '2026-10-14': { monto: 59700 } } },
            { id: 'ad', nombre: 'Adelanto', emoji: '💵', categoria: 'otro', tipoIngreso: 'adelanto', monto: 62800, aprox: false, frecuencia: 'unico', fecha: '2026-10-14', lugar: 'efectivo', principal: false, extra: true, desde: '2026-10-16', creado: '2026-10-16', llegadas: {}, adelanto: { descuentos: [{ ingreso: 'q', fecha: '2026-10-29', monto: 32800 }, { ingreso: 'q', fecha: '2026-11-14', monto: 32800 }] } },
        ],
        registros: [
            { id: 'r1', seq: 1, tipo: 'cuadre', fecha: '2026-10-01', lugar: 'banco', monto: 120000, esperado: 120000, primero: true },
            { id: 'r2', seq: 2, tipo: 'cuadre', fecha: '2026-10-01', lugar: 'efectivo', monto: 8000, esperado: 8000, primero: true },
            { id: 'r3', seq: 3, tipo: 'ingreso', fecha: '2026-10-14', monto: 59700, nombre: 'Mi Quincena', categoria: 'salario', emoji: '💼', lugar: 'banco', ingreso: 'q', ocurrencia: '2026-10-14' },
        ],
        avisos: [], reservasTarjeta: [], cerrados: [], reservas: [], seq: 20, interesInvitar: false };
    P.ui.hoja && P.cerrarHoja({ sinFoco: true });
    if (P.ayuda && P.ayuda.abierto) P.ayuda.cerrar();
    P.cargar(st, { tab: 'hoy' });
    ${args.tema ? `P.aplicarTema && P.aplicarTema(${JSON.stringify(args.tema)});` : ''}
    return true;
})()`);
const texto = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})?.textContent || '').replace(/\\s+/g, ' ')`);
const plan = (vista, mes) => ev(`P.ui.stack = []; P.ui.pagosVista = ${JSON.stringify(vista)}; P.ui.pagosModo = 'fecha'; ${mes ? `P.ui.pagosMes = ${JSON.stringify(mes)};` : ''} P.irTab('pagos'); ${arriba} true`);
try {
    // 1) Como Victor: la ficha → Editar → «¿Con qué ingreso la pagas?».
    await ev(`P.ui.stack = []; P.abrir('tarjeta', 't1'); true`);
    await ev(`document.querySelector('[data-fk="editar-tarjeta"]').click(); true`);
    await esperar(200);
    await ev(`document.getElementById('fuente-t').scrollIntoView({ block: 'center' }); true`);
    await foto('1-con-que-ingreso');
    const ops = await ev(`[...document.querySelectorAll('#fuente-t .chip')].map((x) => x.textContent.trim())`);
    if (JSON.stringify(ops) !== JSON.stringify(['Con lo que tienes ahora', 'Con tu quincena del 29', 'Con tu quincena del 14 de noviembre (lo normal)'])) fallos.push('opciones: ' + JSON.stringify(ops));
    // 2) «Con tu quincena del 29» → Guardar cambios → Próxima.
    await ev(`document.querySelector('[data-fk="op-fuenteT-2026-10-29"]').click(); true`);
    await esperar(150);
    await ev(`document.querySelector('[data-fk="deuda-ok"]').click(); true`);
    await esperar(300);
    await plan('proxima');
    await foto('2-proxima');
    const prox = await texto('#plan-panel');
    if (!/29 oct: Tarjeta Liss\s*vence el 14 nov/.test(prox)) fallos.push('próxima: ' + prox.slice(0, 400));
    // 3) y 4) Mes de octubre y de noviembre.
    await plan('mes', '2026-10');
    await foto('3-mes-octubre');
    await ev(`document.querySelector('[data-fk^="t-t1-2026-11-14-de-"]')?.scrollIntoView({ block: 'center' }); true`);
    await foto('3b-mes-octubre-tarjeta');
    const oct = await texto('#plan-panel');
    if (!/Tarjeta Liss\s*vence el 14 nov/.test(oct)) fallos.push('octubre: ' + oct.slice(0, 400));
    await plan('mes', '2026-11');
    await foto('4-mes-noviembre');
    await ev(`document.querySelector('[data-fk="t-t1-2026-11-14"]')?.scrollIntoView({ block: 'center' }); true`);
    await foto('4b-mes-noviembre-tarjeta');
    const nov = await texto('#plan-panel');
    if (!nov.includes('ya cubierta con tu quincena del 29 oct')) fallos.push('noviembre: ' + nov.slice(0, 400));
    // 5) «Cambiar o repartir»: repartida entre las dos quincenas.
    await ev(`P.ui.stack = []; P.abrir('tarjeta', 't1'); true`);
    await ev(`document.querySelector('[data-fk="t-pagar-con"]').click(); true`);
    await esperar(200);
    await foto('5-cambiar-o-repartir');
    await ev(`document.querySelector('[data-fk="pc-repartir"]').click(); true`);
    await esperar(150);
    await ev(`(() => { const h = P.ui.hoja; for (const f of h.fuentes) h.partes[f] = '0.00'; h.partes['2026-10-29'] = '50.19'; h.partes['2026-11-14'] = '50.19'; P.render(); return true; })()`);
    await esperar(150);
    await ev(`document.getElementById('pc-suma')?.scrollIntoView({ block: 'center' }); true`);
    await foto('5b-repartir');
    await ev(`document.querySelector('[data-fk="pc-ok"]').click(); true`);
    await esperar(300);
    await plan('mes', '2026-11');
    await ev(`document.querySelector('[data-fk="t-t1-2026-11-14"]')?.scrollIntoView({ block: 'center' }); true`);
    await foto('5c-mes-noviembre-repartida');
    const rep = await texto('#plan-panel');
    if (!rep.includes('$50.19 con el 29 oct · $50.19 con el 14 nov')) fallos.push('repartida: ' + rep.slice(0, 400));
    await ev(`P.irTab('hoy'); ${arriba} true`);
    await foto('6-hoy');
} catch (e) {
    fallos.push('excepción: ' + e.message);
}
console.log(JSON.stringify({ salida, fallos, errores: b.errores }, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
