// PRUEBA v2.7 (Parte D): el cuadrito de novedades. Con datos guardados como los guarda la v2.6.7 (esquema 2, sin la
// versión que los guardó) y la fecha del teléfono fija (21 oct 2026):
//  A) sale una vez con datos de la v2.6.7; al cerrarlo no vuelve, ni al recargar (y el cierre queda guardado)
//  B) no sale a quien empieza de cero (ni después de su Primer día) ni en el modo de ejemplos
//  C) las líneas dependen de los datos: con y sin tarjeta, con y sin pagos, con y sin un número corregido (DATOS-4)
//  D) amable y corto: máximo 5 líneas de 20 palabras o menos, sin palabras técnicas; accesible (diálogo con título, foco
//     adentro y de vuelta al cerrar, Escape, nada se mueve con «reducir movimiento»)
// Uso: node herramientas/novedades.mjs [--base=http://…/] [--puerto=9963] [--raiz=<otra copia>]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const root = args.raiz ? path.resolve(args.raiz) : aqui;
const base = args.base || pathToFileURL(root).href + '/';
const salida = path.join(aqui, 'capturas', 'novedades' + (args.base ? '-servida' : '') + (args.raiz ? '-raiz' : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9963) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
let actual = '';
let checks = 0;
const check = (nombre, real, esperado) => {
    checks++;
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 300)}`);
    return ok;
};
const foto = (n) => b.captura(path.join(salida, n + '.png'));
async function seccion(nombre, fn) {
    actual = nombre;
    try {
        await fn();
    } catch (e) {
        fallos.push(`${actual}: excepción: ${e.message}`);
        await foto('ERROR-' + nombre.slice(0, 12).replace(/[^\w]+/g, '-')).catch(() => null);
    }
}
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html');
    await esperar(700);
}
const hay = () => ev(`!!document.getElementById('nov-t')`);
const lineas = () => ev(`[...document.querySelectorAll('.nov-lista li')].map((li) => li.innerText.trim())`);
/** Lo guardado tal como lo deja la v2.6.7: esquema 2, sin `version`; `mod` cambia el estado (Ana con otro nombre). */
async function sembrar(mod = '') {
    await ev(`(() => {
        if (window.P) P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21', inicio: '2026-10-01' });
        ${mod}
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no' }));
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-10T10:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: ['2026-10-20'], anotaciones: 3, cuadres: 1, pagados: 1, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 0, feedbackPospuesto: null, ultimaCopia: null }));
        return true;
    })()`);
}
const TECNICAS = /versi[oó]n|motor|sincroniz|migr|cach[eé]|datos?\s+técnic|esquema|bug|error/i;

// ------------------------------------------------------------------ A) una sola vez
await abrirApp();
await seccion('A una vez', async () => {
    await sembrar();
    await abrirApp();
    check('sale al abrir con los datos de la v2.6.7', await hay(), true);
    check('título amable', await ev(`document.getElementById('nov-t').innerText.trim()`), '¡PamPlanea se puso al día! ✨');
    check('cierre: «Tus datos están completos y a salvo.» y «¡Entendido!»', await ev(`[document.querySelector('.nov-cierre').innerText.trim(), document.querySelector('[data-fk="nov-ok"]').innerText.trim()]`), ['Tus datos están completos y a salvo.', '¡Entendido!']);
    await foto('A-novedades');
    await b.tamano(1440, 900, { movil: false, toque: false });
    await foto('A-novedades-1440');
    await b.tamano(390, 844);
    check('recargar sin cerrarlo: sigue ahí (no se pierde)', (await abrirApp(), await hay()), true);
    await ev(`document.querySelector('[data-fk="nov-ok"]').click(); true`);
    await esperar(300);
    check('al cerrarlo se va', await hay(), false);
    check('y queda guardado con tus datos', await ev(`!!JSON.parse(localStorage.getItem('pamplanea-uso:v1')).novedades['v2.7'].visto`), true);
    await abrirApp();
    check('al recargar no vuelve', await hay(), false);
    await ev(`P.modos.cambiar('entrenamiento'); true`);
    await esperar(300);
    await ev(`P.modos.cambiar('uso'); true`);
    await esperar(300);
    check('ni al ir a los ejemplos y volver', await hay(), false);
});

// ------------------------------------------------------------------ B) no sale a quien empieza ni con los ejemplos
await seccion('B de cero', async () => {
    await ev(`P.sinGuardar = true; localStorage.clear(); true`);
    await abrirApp();
    check('primera vez (sin datos): no sale', await hay(), false);
    await ev(`document.querySelector('[data-fk="elegir-usar"]')?.click(); true`);
    await esperar(400);
    check('al elegir «Usarla con mis datos» (Primer día): no sale', await hay(), false);
    // Su Primer día ya hecho (guardado por esta versión): tampoco.
    await ev(`(() => { P.sinGuardar = true; const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Luz', hoy: '2026-10-21' }); const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1')); u.st = s; u.introVista = true; delete u.ob; localStorage.setItem('pamplanea-uso:v1', JSON.stringify(u)); return true; })()`);
    await abrirApp();
    check('después de su Primer día con esta versión: no sale', [await ev(`P.modo`), await hay()], ['uso', false]);
    // Con los ejemplos, aunque haya datos de antes guardados.
    await sembrar();
    await ev(`localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'entrenamiento' })); true`);
    await abrirApp();
    check('en el modo de ejemplos: no sale', [await ev(`P.modo`), await hay()], ['entrenamiento', false]);
    await ev(`P.modos.cambiar('uso'); true`);
    await esperar(400);
    check('(sale al pasar a sus datos)', await hay(), true);
});

// ------------------------------------------------------------------ C) las líneas dependen de los datos
await seccion('C líneas', async () => {
    // Sin tarjeta, sin pagos y sin números corregidos.
    await sembrar(`s.tarjetas = []; s.medios = s.medios.filter((m) => !m.tarjeta); s.pagos = []; s.registros = s.registros.filter((r) => r.tipo !== 'cargoTarjeta' && r.tipo !== 'pagoTarjeta' && !r.pago);`);
    await abrirApp();
    const sin = await lineas();
    check('sin tarjeta ni pagos: solo lo de los montos', sin, ['Escribir montos es más fácil: escribe 25 y son $25. Y ya puedes anotar 1,200.']);
    await foto('C-sin-tarjeta');
    // Con tarjeta y pagos, sin números corregidos (Ana tal cual, con otro nombre).
    await sembrar();
    await abrirApp();
    const con = await lineas();
    check('con tarjeta y pagos: la de la cuota y la de la tarjeta', con, ['Escribir montos es más fácil: escribe 25 y son $25. Y ya puedes anotar 1,200.', 'Si pagas parte de una cuota, te mostramos cuánto falta.', 'Tus abonos a la tarjeta ahora bajan lo que debes.']);
    check('sin números corregidos: ninguna línea de «Corregimos»', con.some((l) => l.startsWith('Corregimos')), false);
    // Con números que estaban mal en la v2.6.7: F01 (un gasto anotado después de cuadrar) y F02 (un abono a «lo que debo hoy»).
    await sembrar(`
        s.tarjetas.push({ id: 't70', nombre: 'Visa', emoji: '💳', tipo: 'tarjeta', corte: 5, pagoDia: 25, cupo: null, interesesAnio: 0, desde: '2026-10-10', pagoUsual: 10000, debeInicial: 200000, estados: [{ corte: '2026-10-05', total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2026-11-25', inicial: true, esperarCorte: true }] });
        s.medios.push({ id: 'mt70', nombre: 'Visa', emoji: '💳', tarjeta: 't70' });
        const reg = (f) => { s.registros.push({ id: 'r' + s.seq, seq: s.seq, ...f }); s.seq++; };
        reg({ tipo: 'pagoTarjeta', fecha: '2026-10-15', monto: 10000, lugar: 'agricola', tarjeta: 't70', nombre: 'Pago de Visa' });
        const esperado = MOTOR.saldoLugar(s, 'efectivo');
        reg({ tipo: 'cuadre', fecha: '2026-10-20', lugar: 'efectivo', monto: esperado - 2000, esperado });
        s.lugares.find((l) => l.id === 'efectivo').cuadre = { fecha: '2026-10-20', seq: s.seq - 1, monto: esperado - 2000 };
        reg({ tipo: 'gasto', fecha: '2026-10-19', monto: 2000, nombre: 'Pupusas', categoria: 'comida', emoji: '🫓', medio: 'efectivo' });`);
    await abrirApp();
    const corr = await lineas();
    const n = await ev(`JSON.parse(localStorage.getItem('pamplanea-uso:v1')).novedades['v2.7']`);
    check('DATOS-4: el gasto de octubre bajó $20 (ya no cuenta el gasto dos veces)', n.antes.mes.salio - n.despues.mes.salio, 2000);
    check('DATOS-4: lo que debes de Visa: $2,000 → $1,900', [n.antes.tarjetas.find((t) => t.id === 't70').debe, n.despues.tarjetas.find((t) => t.id === 't70').debe], [200000, 190000]);
    check('una sola línea «Corregimos…» con los dos números', corr.filter((l) => l.startsWith('Corregimos')), (x) => x.length === 1 && x[0].startsWith('Corregimos unos números: tu gasto de octubre es $') && x[0].includes('lo que debes de Visa es $1,900.00'));
    await foto('C-con-correccion');
});

// ------------------------------------------------------------------ D) corto, amable y accesible
await seccion('D accesible', async () => {
    const todas = [...(await lineas()), await ev(`document.querySelector('.nov-cierre').innerText.trim()`)];
    check('máximo 5 líneas (con el cierre)', todas.length, (x) => x <= 5);
    check('20 palabras o menos cada una', todas.filter((l) => l.split(/\s+/).length > 20), []);
    check('sin palabras técnicas', todas.filter((l) => TECNICAS.test(l)), []);
    const r = await ev(`(() => { const d = document.querySelector('.nov'); return { rol: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), titulo: document.getElementById(d.getAttribute('aria-labelledby'))?.innerText.trim(), foco: document.activeElement.dataset.fk, atras: document.getElementById('vista').inert, anim: getComputedStyle(d).animationName }; })()`);
    check('diálogo con título', [r.rol, r.modal, r.titulo], ['dialog', 'true', '¡PamPlanea se puso al día! ✨']);
    check('el foco está adentro y lo de atrás no se toca', [r.foco, r.atras], ['nov-ok', true]);
    check('con «reducir movimiento» nada se mueve', r.anim, 'none');
    await b.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    check('Tab no sale del cuadrito', await ev(`document.activeElement.dataset.fk`), 'nov-ok');
    await b.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await esperar(200);
    check('Escape lo cierra', await hay(), false);
    check('el foco vuelve a la pantalla', await ev(`!!document.activeElement.closest('#pantalla') || document.activeElement.tagName === 'H1'`), true);
    check('y lo de atrás se puede usar otra vez', await ev(`document.getElementById('vista').inert`), false);
});

const resultado = { version: await ev('window.VERSION_PROTOTIPO').catch(() => null), checks, fallos, errores: b.errores, fallidas: b.fallidas };
console.log(JSON.stringify(resultado, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
