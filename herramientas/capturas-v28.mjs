// CAPTURAS v2.8 «Más claro», a 390×844 (teléfono) y 1440×900 (computadora), con datos propios («Marta», 21 oct):
// Hoy (el número, lo que viene y Anotar), Mi plan (sus 5 secciones), Anotar con verbos (y «súper 20» de un gasto
// variable), la ficha de la tarjeta (sus cobros, apodo y la sugerencia de repartir), Ahorros (dentro y aparte), la ficha de
// un ahorro, las preguntas de una vez (a quien viene de la v2.7; con la de cada ahorro de antes, «no asumir») y el cuadrito.
// Y (APROBADO por Victor, 2026-10-22) «¿Con qué lo pagas?» y «¿Se cobra solo?» en «+ Gasto fijo» y en «Completar tu Primer
// día», y «Editar» de la tarjeta BAC con su banco elegido y su alias.
// Uso: node herramientas/capturas-v28.mjs [--base=http://…/] [--puerto=9959] [--tema=serena-claro]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(aqui).href + '/';
const tema = args.tema || 'serena-claro';
const salida = path.join(aqui, 'capturas', 'v28' + (tema !== 'serena-claro' ? '-' + tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9959) });
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const errores = [];
let scriptId = null;
async function abrirApp({ ancho = 390 } = {}) {
    if (scriptId) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
    scriptId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` })).identifier;
    if (ancho === 390) await b.tamano(390, 844);
    else await b.tamano(1440, 900, { movil: false, toque: false });
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(700);
    await ev(`P.ayuda.abierto && P.ayuda.cerrar({ foco: false }); true`);
}
/**
 * Sus datos: los de Ana con otro nombre, más un gasto variable (Súper, $150 por quincena), un ahorro aparte con ahorro
 * programado, Netflix que se cobra en su tarjeta BAC (con apodo) y un préstamo de su mamá. `deV27`: guardados por la v2.7
 * (sale el cuadrito y las preguntas de una vez).
 */
async function armar(opc = {}) {
    if (!(await ev('!!window.P'))) await abrirApp(opc);
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const st = DATOS.crearAna();
        Object.assign(st, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21', inicio: '2026-10-01' });
        if (${!opc.deV27}) {
            st.variables = [{ id: 'v1', nombre: 'Súper', emoji: '🛒', categoria: 'super', tope: 15000, medio: 'debito', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }];
            st.apartados.push({ id: 'alc', nombre: 'Alcancía', emoji: '🏺', portada: 'general-alcancia', monto: 5000, meta: null, metaFecha: null, historial: [{ fecha: '2026-10-20', tipo: 'inicial', monto: 5000 }], donde: 'aparte', programado: { monto: 2000, desde: '2026-10-15' } });
            st.tarjetas[0].apodo = 'La de la casa';
            st.pagos.push({ id: 'prest', nombre: 'Préstamo de Mamá', emoji: '🤝', categoria: 'cuotas', monto: 0, estimado: false, frecuencia: 'fechas', fechas: [], medio: 'efectivo', avisos: [], desde: '2026-10-21', creado: '2026-10-21', hechos: {}, previos: [], tipoDeuda: 'prestamo', deuda: { debe: 20000 }, sinCuota: true });
        } else {
            st.pagos.push({ id: 'super', nombre: 'Súper', emoji: '🛒', categoria: 'super', monto: 30000, estimado: false, frecuencia: 'mensual', dia: 28, medio: 'debito', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [] });
        }
        st.pagos.push({ id: 'netflix', nombre: 'Netflix', emoji: '🎬', categoria: 'suscripciones', monto: 1000, estimado: false, frecuencia: 'mensual', dia: 24, medio: 'bac', tipoPago: 'suscripcion', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [] });
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, mes: true, midinero: true, anotar: true, tarjeta: true, pago: true, cuentas: true, ahorros: true, deudas: true } }));
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, version: ${opc.deV27 ? "'Prototipo v2.7.0 · 2026-10-21'" : 'window.VERSION_PROTOTIPO'}, creado: '2026-10-10T10:00:00.000Z', st, introVista: true, nombre: 'Marta', metricas: {}, feedback: [], novedades: { 'v2.7': { visto: '2026-10-21T10:00:00.000Z' } } }));
        return true;
    })()`);
    await abrirApp(opc);
}
const foto = async (n, ancho) => {
    await esperar(250);
    await b.captura(path.join(salida, `${n}-${ancho}.png`));
};
const subir = (sel) => ev(`(() => { const el = document.querySelector(${js(sel)}); const v = document.getElementById('vista'); if (el && v) v.scrollTop += el.getBoundingClientRect().top - v.getBoundingClientRect().top - 12; return !!el; })()`);
for (const ancho of [390, 1440]) {
    try {
        // 1. El cuadrito de novedades (datos de la v2.7) y, debajo, las preguntas de una vez.
        await armar({ ancho, deV27: true });
        await foto('1-novedades', ancho);
        await ev(`document.querySelector('[data-fk="nov-ok"]')?.click(); true`);
        await esperar(300);
        await subir('#p28-t');
        await foto('2-preguntas-de-una-vez', ancho);
        // «No asumir»: la pregunta de un ahorro de antes y, con «Aparte», lo que sube su libre antes de confirmar.
        await subir('.p28-cuentas');
        await foto('2b-pregunta-ahorro', ancho);
        await ev(`document.querySelector('[data-fk^="p28-ah-"][data-fk$="-aparte"]')?.click(); true`);
        await esperar(300);
        await subir('.p28-sube');
        await foto('2c-ahorro-aparte', ancho);
        // 2. Hoy: el número, lo que viene y Anotar.
        await armar({ ancho });
        await foto('3-hoy', ancho);
        // 3. Mi plan: Ingresos · Gastos fijos · Gastos variables · Ahorro programado · Pagos de deudas.
        await ev(`P.irTab('pagos'); true`);
        await foto('4-mi-plan', ancho);
        await subir('#mp-gastos-variables');
        await foto('4b-mi-plan-variables', ancho);
        // 4. Anotar con verbos y «súper 20» (gasto variable).
        await ev(`P.acciones.anotar(); true`);
        await foto('5-anotar', ancho);
        await ev(`(() => { const q = document.getElementById('anotar-q'); q.value = 'súper 20'; q.dispatchEvent(new Event('input', { bubbles: true })); q.blur(); return true; })()`);
        await foto('5b-anotar-super', ancho);
        await ev(`P.cerrarHoja({ sinFoco: true }); true`);
        // 5. La ficha de la tarjeta: apodo, lo que se cobra en ella y la sugerencia de repartir.
        await ev(`P.irTab('midinero'); P.abrir('tarjeta', 'bac'); true`);
        await foto('6-tarjeta', ancho);
        await subir('[aria-labelledby], #t-cobros');
        await ev(`(() => { const el = [...document.querySelectorAll('.card-t')].find((x) => /Se cobra en esta tarjeta/.test(x.textContent)); const v = document.getElementById('vista'); if (el) v.scrollTop += el.getBoundingClientRect().top - v.getBoundingClientRect().top - 12; return true; })()`);
        await foto('6b-tarjeta-cobros', ancho);
        // 6. Ahorros (dentro y aparte) y la ficha de un ahorro aparte con «Ya lo guardé».
        await ev(`P.irTab('midinero'); P.abrir('ahorros'); true`);
        await foto('7-ahorros', ancho);
        await ev(`P.abrir('apartado', 'alc'); true`);
        await foto('8-ahorro-aparte', ancho);
        await subir('#ap-prog');
        await foto('8b-ahorro-programado', ancho);
        // 7. «+ Gasto fijo»: «¿Con qué lo pagas?» sin nada elegido; con tu débito, «¿Se cobra solo?».
        const subirHoja = (sel) => ev(`(() => { const el = document.querySelector(${js(sel)}); const c = el && el.closest('.hoja-c'); if (c) c.scrollTop += el.getBoundingClientRect().top - c.getBoundingClientRect().top - 120; return !!el; })()`);
        await ev(`P.irTab('pagos'); P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        await ev(`(() => { for (const [id, v] of [['f-nombre', 'Agua'], ['f-monto', '12']]) { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } document.querySelector('[data-fk="dia-dia-25"]').click(); return true; })()`);
        await esperar(200);
        await subirHoja('#l-medio');
        await foto('9-con-que-lo-pagas', ancho);
        await ev(`document.querySelector('[data-fk="op-medio-debito"]').click(); true`);
        await esperar(200);
        await subirHoja('#l-medio');
        await foto('9b-se-cobra-solo', ancho);
        await ev(`P.cerrarHoja({ sinFoco: true }); true`);
        // 8. «Completar tu Primer día»: un gasto fijo con «¿Con qué lo pagas?» y «¿Se cobra solo?».
        await ev(`(() => { P.acciones.obCompletar(); P.ui.ob.paso = 5; P.render(); P.acciones.obPago({ v: 'internet' }); P.acciones.obValor({ campo: 'p-paga', v: 'L:agricola' }); return true; })()`);
        await esperar(300);
        await ev(`(() => { const el = document.getElementById('ob-l-p-paga'); const v = document.getElementById('vista'); if (el && v) v.scrollTop += el.getBoundingClientRect().top - v.getBoundingClientRect().top - 140; return true; })()`);
        await foto('10-primer-dia-con-que', ancho);
        await ev(`P.acciones.obCerrar(); true`);
        await esperar(200);
        // 9. Editar la tarjeta BAC: su banco elegido y su alias.
        await ev(`P.irTab('midinero'); P.abrir('tarjeta', 'bac'); true`);
        await esperar(300);
        await ev(`document.querySelector('[data-fk="editar-tarjeta"]').click(); true`);
        await foto('11-editar-tarjeta', ancho);
    } catch (e) {
        errores.push(`${ancho}: ${e.message}`);
    }
}
console.log(JSON.stringify({ salida, errores: [...errores, ...b.errores] }, null, 1));
b.cerrar();
process.exit(errores.length || b.errores.length ? 1 : 0);
