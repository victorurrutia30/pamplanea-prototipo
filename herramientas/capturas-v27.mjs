// CAPTURAS v2.7 «Tus números bien», a 390×844 (teléfono) y 1440×900 (computadora), con datos propios («Marta», 21 oct):
// el teclado de montos, Anotar (1,200 · mañana · la tarjeta Cuscatlán · dos montos), la tarjeta (lo que debes tras un abono
// y un pago parcial), Mes (cuadrar y luego detallar), el cuadrito de novedades y «Tus datos están a salvo».
// En 1440×900 el teclado de montos se fuerza (como en una tableta): en una computadora con mouse no sale.
// Uso: node herramientas/capturas-v27.mjs [--base=http://…/] [--puerto=9964] [--tema=serena-claro]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(aqui).href + '/';
const tema = args.tema || 'serena-claro';
const salida = path.join(aqui, 'capturas', 'v27' + (tema !== 'serena-claro' ? '-' + tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9964) });
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const errores = [];
let scriptId = null;
async function abrirApp({ teclado = false, ancho = 390 } = {}) {
    if (scriptId) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
    scriptId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21'; window.__tecladoMontos = ${teclado};` })).identifier;
    if (ancho === 390) await b.tamano(390, 844);
    else await b.tamano(1440, 900, { movil: false, toque: false });
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(600);
    await ev(`P.ayuda.abierto && P.ayuda.cerrar({ foco: false }); true`);
}
/** Sus datos («Marta», con la tarjeta Cuscatlán y una cuota que vence hoy), guardados como suyos: la app abre con ellos. */
async function armar(opc) {
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const st = DATOS.crearAna();
        Object.assign(st, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        st.tarjetas.push({ id: 'cus', nombre: 'Crédito Cuscatlán', emoji: '💳', tipo: 'tarjeta', corte: 5, pagoDia: 25, cupo: null, interesesAnio: 0, desde: '2026-10-21', medio: 'debito', pagoUsual: 10000, debeInicial: 200000, debeDesde: { fecha: '2026-10-21', seq: st.seq++ }, estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-11-25', inicial: true, esperarCorte: true }] });
        st.medios.push({ id: 'mcus', nombre: 'Crédito Cuscatlán', emoji: '💳', tarjeta: 'cus' });
        st.pagos.push({ id: 'cuota', nombre: 'Cuota de la moto', emoji: '🏍️', categoria: 'cuotas', monto: 10000, estimado: false, frecuencia: 'mensual', dia: 21, medio: 'debito', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-01', creado: '2026-10-01', hechos: {}, previos: [] });
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, mes: true, midinero: true, anotar: true, tarjeta: true, pago: true, cuentas: true } }));
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, version: window.VERSION_PROTOTIPO, creado: '2026-10-10T10:00:00.000Z', st, introVista: true, nombre: 'Marta', metricas: {}, feedback: [] }));
        return true;
    })()`);
    await abrirApp(opc);
}
const foto = async (n, ancho) => {
    await esperar(250);
    await b.captura(path.join(salida, `${n}-${ancho}.png`));
};
const anotar = async (frase) => {
    await ev(`(() => { P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = ${js(frase)}; q.dispatchEvent(new Event('input', { bubbles: true })); q.blur(); return true; })()`);
    await esperar(150);
};
for (const ancho of [390, 1440]) {
    try {
        // 1. El teclado de montos.
        await abrirApp({ ancho });
        await armar({ teclado: true, ancho });
        await ev(`P.abrirHoja('cuadrar', { id: 'efectivo' }); document.getElementById('f-monto').click(); true`);
        for (const t of '1200') await ev(`document.querySelector('[data-tecla="${t}"]').click(); true`);
        await foto('1-teclado-1200', ancho);
        await ev(`P.teclado.cerrar(); P.cerrarHoja({ sinFoco: true }); true`);
        await armar({ teclado: false, ancho });
        // 2. Anotar.
        await anotar('gasté 1,200 en súper');
        await foto('2a-anotar-1200', ancho);
        await anotar('mañana pupusas 10');
        await foto('2b-anotar-manana', ancho);
        await anotar('pagué la tarjeta Cuscatlán 100');
        await foto('2c-anotar-cuscatlan', ancho);
        await ev(`P.acciones.anotarGuardar(); true`);
        await anotar('pupusas 6 y bus 2');
        await foto('2d-anotar-dos-montos', ancho);
        await ev(`P.cerrarHoja({ sinFoco: true }); true`);
        // 3. La tarjeta: lo que debes después del abono de $100 (D-7), y un pago a medias (D-6).
        await ev(`P.abrir('tarjeta', 'cus'); true`);
        await foto('3a-tarjeta-debes', ancho);
        await ev(`P.cambiar((s) => P.marcarPagado(s, 'cuota', '2026-10-21', { monto: 5000, medio: 'debito', fecha: '2026-10-21' }), { aviso: null }); P.irTab('pagos'); true`);
        await ev(`(() => { const f = [...document.querySelectorAll('#pantalla .fila--pago')].find((li) => li.innerText.includes('Parcial')); if (f) f.scrollIntoView({ block: 'center' }); return true; })()`);
        await foto('3b-pagos-parcial', ancho);
        // 4. Mes: cuadrar a $20 menos y después detallar ese gasto.
        await ev(`P.cambiar((s) => P.cuadrar(s, 'efectivo', MOTOR.saldoLugar(s, 'efectivo') - 2000), { aviso: null }); true`);
        await anotar('ayer pupusas 20 efectivo');
        await ev(`P.acciones.anotarGuardar(); P.irTab('mes'); true`);
        await foto('4a-mes', ancho);
        await ev(`document.getElementById('mes-hist')?.scrollIntoView({ block: 'start' }); true`);
        await foto('4b-mes-historial', ancho);
        // 5. El cuadrito de novedades (datos de la v2.6.7: esquema 2, sin versión).
        await ev(`(() => { P.sinGuardar = true; localStorage.clear(); const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' }); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no' })); localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-10T10:00:00.000Z', st: s, introVista: true, nombre: 'Marta', metricas: {}, feedback: [] })); return true; })()`);
        await abrirApp({ ancho });
        await foto('5-novedades', ancho);
        // 6. «Tus datos están a salvo»: dañados y de una versión más nueva.
        await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', '{"esquema":2,"st":{"lugares":['); true`);
        await abrirApp({ ancho });
        await foto('6a-a-salvo-danados', ancho);
        await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, version: 'Prototipo v2.9.0 · 2026-12-01', st: { persona: 'uso', configurado: true } })); true`);
        await abrirApp({ ancho });
        await foto('6b-a-salvo-version-nueva', ancho);
        await ev(`P.sinGuardar = true; localStorage.clear(); true`);
    } catch (e) {
        errores.push(`${ancho}: ${e.message}`);
        await b.captura(path.join(salida, `ERROR-${ancho}.png`)).catch(() => null);
    }
}
console.log(JSON.stringify({ salida, errores: [...errores, ...b.errores] }, null, 1));
b.cerrar();
process.exit(errores.length || b.errores.length ? 1 : 0);
