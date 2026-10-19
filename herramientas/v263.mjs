// PRUEBAS v2.6.3 (fase 3: formularios, cuadros y consistencia). A 390×844 y 320×700:
//  A) V2-65 formularios: el botón principal dice la acción (Anotar cambia mientras escribes: «Guardar gasto» →
//     «Guardar ingreso»; «+ Pago» → «Guardar pago»; tarjeta → «Agregar tarjeta»; ingreso → «Guardar ingreso»…); en
//     Anotar, «Tengo __ $» es una pregunta concreta («¿Cuánto tienes ahora en Efectivo?»); los montos se ven con
//     formato al salir del campo («1234.5» → «1,234.50») y se guardan igual; los errores, junto al campo;
//  B) V2-66 «+ Pago»: cuatro cuadros iguales (cuota, suscripción, facturas de servicios y otro); «Facturas de
//     servicios» muestra luz, agua, internet, teléfono y cable; elegir uno lo clasifica de un toque; lo guardado queda
//     con su categoría de siempre;
//  C) a 320 de ancho: nada se sale de la pantalla en los formularios y el botón principal se ve completo.
// Uso: node herramientas/v263.mjs [--base=http://…/] [--puerto=9974] [--partes=a,b,c]
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || 'a,b,c').split(',');
const salida = path.join(root, 'capturas', 'v263-pruebas' + (args.base ? '-servida' : ''));
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9974) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
let actual = '';
let n = 0;
const check = (nombre, real, esperado) => {
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 400)}`);
    return ok;
};
const foto = async (nombre) => {
    await esperar(120);
    await b.captura(path.join(salida, `${String(++n).padStart(2, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(150);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(100);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const boton = () => texto('.hoja-f .btn--prim, .hoja-f .btn--peligro');
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await esperar(500);
}
async function enUso() {
    await abrirApp();
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-15T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 9, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, deudas: true, cuentas: true, ahorros: true } }));
        return true;
    })()`);
    await abrirApp();
}
const cerrar = () => ev('(() => { if (P.ui.hoja) P.cerrarHoja({ sinFoco: true }); return true; })()');

try {
    if (partes.includes('a')) {
        actual = 'A formularios';
        await enUso();
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'súper 25');
        check('Anotar: «Guardar gasto»', await texto('[data-fk="anotar-guardar"]'), 'Guardar gasto');
        await escribir('#anotar-q', 'vendí 45');
        check('mientras escribes cambia: «Guardar ingreso»', await texto('[data-fk="anotar-guardar"]'), 'Guardar ingreso');
        await escribir('#anotar-q', 'tengo 50 efectivo');
        check('un cuadre: «Cuadrar», sin «Tengo (cuadre)»', [await texto('[data-fk="anotar-guardar"]'), await texto('#anotar-chips')], (x) => x[0] === 'Cuadrar' && !/Tengo/.test(x[1] || ''));
        await clic('[data-fk="ch-monto"]');
        check('la pregunta del monto: «¿Cuánto tienes ahora en Efectivo?»', await texto('label[for="f-monto"]'), '¿Cuánto tienes ahora en Efectivo?');
        await foto('A-anotar-cuadre');
        await cerrar();
        await clic('[data-fk="nav-anotar"]');
        check('el atajo dice «Cuadrar» (no «Tengo $___»)', await ev(`[...document.querySelectorAll('.hoja .atajo')].map((c) => c.textContent.trim())`), (x) => x.includes('Cuadrar') && !x.some((t) => /Tengo/.test(t)));
        await cerrar();
        // Los demás formularios: el botón dice la acción.
        const botones = {};
        for (const [nombre, abrirHoja] of [
            ['pago', `P.abrirHoja('nuevoPago')`],
            ['ingreso', `P.abrirHoja('nuevoIngreso')`],
            ['tarjeta', `P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' })`],
            ['prestamo', `P.abrirHoja('nuevaDeuda', { tipoInicial: 'prestamo' })`],
            ['cuadrar', `P.abrirHoja('cuadrar', { lugar: 'efectivo' })`],
            ['ahorrar', `P.abrirHoja('apartar')`],
        ]) {
            await ev(`(() => { ${abrirHoja}; return true; })()`);
            await esperar(200);
            botones[nombre] = await boton();
            await cerrar();
        }
        check('cada botón dice su acción', botones, { pago: 'Guardar pago', ingreso: 'Guardar ingreso', tarjeta: 'Agregar tarjeta', prestamo: 'Agregar deuda', cuadrar: 'Cuadrar', ahorrar: 'Ahorrar' });
        // Formato al salir del campo: se ve «1,234.50» y se guarda igual.
        await ev(`P.abrirHoja('nuevoPago'); true`);
        await esperar(200);
        await escribir('#f-nombre', 'Gimnasio');
        await escribir('#f-monto', '1234.5');
        await ev(`(() => { const el = document.getElementById('f-monto'); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); return true; })()`);
        await esperar(150);
        check('formato al salir del campo', [await ev(`document.getElementById('f-monto').value`), await ev('MOTOR.leerMonto(P.ui.hoja.monto)')], ['1,234.50', 123450]);
        await ev(`(() => { const el = document.getElementById('f-monto'); el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); return true; })()`);
        await esperar(80);
        check('al volver al campo, el número para escribir', await ev(`document.getElementById('f-monto').value`), '1234.50');
        await cerrar();
        // Errores junto al campo.
        await ev(`P.abrirHoja('nuevoPago'); P.acciones.nuevoPagoOk(); true`);
        await esperar(200);
        check('error junto al campo, con texto (no solo color)', await ev(`[...document.querySelectorAll('.hoja .campo-error')].map((e) => e.innerText.trim())`), (x) => x.includes('Ponle un nombre') && x.includes('Escribe el monto'));
        await foto('A-pago-errores');
        await cerrar();
    }
    if (partes.includes('b')) {
        actual = 'B cuadros (V2-66)';
        await enUso();
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="nuevo-pago"]');
        check('cuatro cuadros del mismo estilo', await ev(`[...document.querySelectorAll('.hoja .opciones-grandes .opcion-g .opcion-g-t')].map((e) => e.textContent.trim())`), ['Cuota de un préstamo', 'Suscripción', 'Facturas de servicios', 'Otro pago']);
        await clic('[data-fk="np-servicios"]');
        check('«Facturas de servicios»: sus opciones', await ev(`[...document.querySelectorAll('[data-fk^="op-frecuente-"]')].map((e) => e.textContent.trim())`), ['Luz', 'Agua', 'Internet', 'Teléfono', 'Cable']);
        await foto('B-servicios');
        await clic('[data-fk="op-frecuente-internet"]');
        await escribir('#f-monto', '30');
        await clic('[data-fk="dia-dia-12"]').catch(async () => ev(`P.ui.hoja.dia = 12; true`));
        await ev('P.acciones.nuevoPagoOk(); true');
        await esperar(300);
        check('de un toque: «Internet» con su categoría y su emoji', await ev(`(() => { const p = P.st.pagos.filter((x) => x.nombre === 'Internet').at(-1); return p ? [p.categoria, p.emoji] : null; })()`), ['servicios', '🌐']);
        await clic('[data-fk="nuevo-pago"]');
        await clic('[data-fk="np-otro"]');
        check('«Otro pago»: lo de la casa y el nombre libre', [await ev(`[...document.querySelectorAll('[data-fk^="op-frecuente-"]')].map((e) => e.textContent.trim())`), await ev(`!!document.getElementById('f-nombre')`)], [['Alquiler', 'Colegio', 'Cuchubal'], true]);
        await cerrar();
    }
    if (partes.includes('c')) {
        actual = 'C 320';
        await b.tamano(320, 700);
        await enUso();
        const revisar = async (nombre, abrirHoja) => {
            await ev(`(() => { ${abrirHoja}; return true; })()`);
            await esperar(300);
            const r = await ev(`(() => { const ancho = document.documentElement.clientWidth; const fuera = [...document.querySelectorAll('.hoja *')].filter((e) => { const x = e.getBoundingClientRect(); return x.width && (x.right > ancho + 1 || x.left < -1); }).map((e) => e.className || e.tagName).slice(0, 3); const btn = document.querySelector('.hoja-f .btn--prim'); const r = btn && btn.getBoundingClientRect(); return { fuera, boton: !!btn && r.bottom <= window.innerHeight + 1 && r.top >= 0 && btn.scrollWidth <= btn.clientWidth + 1 }; })()`);
            check(`${nombre}: nada se sale y el botón se ve completo`, r, { fuera: [], boton: true });
            await foto('C-320-' + nombre);
            await cerrar();
        };
        await revisar('anotar', `P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'súper 25'; q.dispatchEvent(new Event('input', { bubbles: true }))`);
        await revisar('pago', `P.abrirHoja('nuevoPago')`);
        await revisar('tarjeta', `P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' })`);
        await revisar('ingreso', `P.abrirHoja('nuevoIngreso')`);
        await b.tamano(390, 844);
    }
} catch (e) {
    fallos.push(`${actual}: ${e.message}`);
    await foto('ERROR').catch(() => null);
}
console.log(JSON.stringify({ fallos, errores: b.errores }, null, 1));
await b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
