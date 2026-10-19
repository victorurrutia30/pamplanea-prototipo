// PRUEBA v2.6.5 (V2-83): TODOS los formularios, uno por uno, en los 4 temas (con datos propios, «Marta», 21 oct).
// En cada uno se elige una opción y se revisa:
//  · selección visible: aria-pressed/aria-checked, borde del acento (--color-primary) con ≥ 3:1 contra lo de alrededor
//    (WCAG 1.4.11), fondo sutil distinto del de las demás opciones y un ✓ (nunca solo el color); el MISMO estilo en
//    todas las opciones de la app;
//  · foco visible (con el teclado); las etiquetas son preguntas; el error sale junto al campo; el botón dice la acción;
//    los montos abren el teclado numérico; todo lo que se toca mide ≥ 44 px; con el teclado abierto el botón principal
//    sigue a la vista.
// Uso: node herramientas/formularios-v265.mjs [--base=http://…/] [--puerto=9976] [--temas=serena-claro,ancla-oscuro]
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const temas = (args.temas || 'serena-claro,serena-oscuro,ancla-claro,ancla-oscuro').split(',');
const salida = path.join(root, 'capturas', 'formularios-v265' + (args.base ? '-servida' : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9976) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
const revisados = [];
let actual = '';
const check = (nombre, real, esperado) => {
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${JSON.stringify(real)}`);
    return ok;
};
const clic = async (sel, espera = 250) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`no encontré ${sel}`);
    await esperar(espera);
};
async function conDatos(tema) {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(500);
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-01T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, cuentas: true, ahorros: true, deudas: true } }));
        return true;
    })()`);
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(600);
}
const abrirHoja = (tipo, datos = {}) => `P.ui.hoja = null; P.abrirHoja(${js(tipo)}, ${js(datos)}); true`;
const anotar = (atajo, editor) => `(() => { P.ui.hoja = null; P.acciones.anotar(); P.acciones.anotarAtajo({ v: ${js(atajo)} }); ${editor ? `P.acciones.anotarEditar({ campo: ${js(editor)} });` : ''} return true; })()`;
/**
 * Los formularios. `elegir`: lo que se toca (en orden); se revisa que lo último quede elegido. Sin `elegir`, se toca
 * la primera opción sin elegir que no lleve a otra pantalla.
 */
const FORMULARIOS = [
    { nombre: 'Anotar · gasto (tipo de gasto)', abrir: anotar('gasto', 'nombre'), elegir: ['[data-fk="op-categoria-comida"]'] },
    { nombre: 'Anotar · gasto (con qué)', abrir: anotar('gasto', 'medio'), elegir: ['[data-fk="op-medio-efectivo"]'] },
    { nombre: 'Anotar · Recibí (¿de qué?)', abrir: anotar('ingreso', 'nombre'), elegir: ['[data-fk="op-categoriaIngreso-venta"]'] },
    { nombre: 'Anotar · Recordarme un pago (frecuentes)', abrir: anotar('pago', 'nombre'), elegir: ['[data-fk="op-frecuente-gimnasio"], [data-fk^="op-frecuente-"]:not([data-fk="op-frecuente-luz"])'] },
    { nombre: 'Anotar · Cuadrar (dónde)', abrir: anotar('cuadre', 'lugar'), elegir: ['[data-fk="op-lugar-efectivo"]'] },
    { nombre: 'Anotar · Mover', abrir: anotar('mover', 'mover'), elegir: ['[data-fk="op-de-efectivo"]'] },
    { nombre: '+ Pago (cuadro)', abrir: abrirHoja('nuevoPago'), elegir: ['[data-fk="np-servicios"]'] },
    { nombre: '+ Pago (¿cuál factura?)', abrir: abrirHoja('nuevoPago'), elegir: ['[data-fk="np-servicios"]', '[data-fk="op-frecuente-agua"]'] },
    { nombre: '+ Pago (día)', abrir: abrirHoja('nuevoPago'), elegir: ['[data-fk="dia-dia-12"]'] },
    { nombre: '+ Pago (con qué)', abrir: abrirHoja('nuevoPago'), elegir: ['[data-fk="op-medio-efectivo"]'] },
    { nombre: 'Editar pago', abrir: abrirHoja('editarPago', { id: 'luz' }), elegir: ['[data-fk="op-medio-efectivo"]'] },
    { nombre: 'Ingreso nuevo', abrir: abrirHoja('nuevoIngreso') },
    { nombre: 'Ya llegó (¿dónde?)', abrir: abrirHoja('ingresoLlego', { id: 'quincena', fecha: '2026-10-15' }) },
    { nombre: 'Tarjeta o préstamo', abrir: abrirHoja('nuevaDeuda') },
    { nombre: 'Estado de cuenta (¿cuánto vas a pagar?)', abrir: `(() => { P.ui.hoja = null; P.abrirHoja('estadoCuenta', { id: 'bac' }); const h = P.ui.hoja; h.paso = 3; h.total = '245'; h.minimo = '25'; P.render(); return true; })()`, elegir: ['[data-fk="ec-minimo"]'] },
    { nombre: 'Lo que debes (sin opciones)', abrir: abrirHoja('deuda', { id: 'casacomercial' }), sinOpciones: true },
    { nombre: 'Cuadrar', abrir: abrirHoja('cuadrar', {}) },
    { nombre: 'Mover dinero', abrir: abrirHoja('mover', {}) },
    { nombre: 'Ahorrar', abrir: abrirHoja('apartar', {}) },
    { nombre: 'Pagado (la luz, un estimado)', abrir: abrirHoja('pagado', { tipoPago: 'pago', id: 'luz', fecha: '2026-10-12' }), elegir: ['[data-fk="op-medio-efectivo"]'] },
    { nombre: 'Lo pagas con', abrir: abrirHoja('pagarCon', { id: 'colegio', fecha: '2026-11-05' }) },
    { nombre: 'Medio de pago nuevo', abrir: abrirHoja('medio', {}) },
    { nombre: 'Lugar nuevo', abrir: abrirHoja('lugar', {}) },
    { nombre: 'Primer día · tus deudas (un préstamo y su día)', abrir: `(() => { P.acciones.obCompletar(); P.ui.ob.paso = 3; P.render(); return true; })()`, enOb: true, elegir: ['[data-fk="ob-dn-prestamo"]', '[data-fk="ob-d-dia-15"]'] },
    { nombre: 'Completar tu Primer día · gastos fijos', abrir: `(() => { P.acciones.obCompletar(); P.ui.ob.paso = 5; P.render(); return true; })()`, enOb: true, elegir: ['[data-fk^="ob-p-"]:not(.chip--tienes)'] },
];
/** Revisión dentro de la página: devuelve lo que se mide de lo elegido y del formulario. */
const REVISAR = `(enOb) => {
    const cont = enOb ? document.querySelector('#pantalla') : document.querySelector('#capa-hoja .hoja');
    if (!cont) return { sin: true };
    const rgb = (c) => { const m = String(c).match(/[\\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0]; };
    const lum = (c) => { const [r, g, bl] = rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
    const contraste = (a, b2) => { const [x, y] = [lum(a), lum(b2)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const fondoDe = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return c; } return getComputedStyle(document.body).backgroundColor; };
    const primario = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    const sel = [...cont.querySelectorAll('[aria-pressed="true"], [aria-checked="true"]')].filter((e) => !e.classList.contains('switch') && e.getClientRects().length);
    const elegidos = sel.map((e) => {
        const cs = getComputedStyle(e);
        const afuera = fondoDe(e.parentElement);
        const hermano = [...e.parentElement.children].find((x) => x !== e && x.matches('[aria-pressed="false"], [aria-checked="false"]'));
        return {
            texto: e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 40),
            check: !!e.querySelector('svg'),
            borde: cs.borderTopColor,
            ancho: parseFloat(cs.borderTopWidth) + (/0px 0px 0px 1px inset|inset 0px 0px 0px 1px/.test(cs.boxShadow) ? 1 : 0),
            relleno: e.classList.contains('dia') || e.classList.contains('cal-d'),
            contraste: Math.round(contraste(cs.borderTopColor, afuera) * 100) / 100,
            fondo: cs.backgroundColor,
            fondoOtra: hermano ? getComputedStyle(hermano).backgroundColor : null,
        };
    });
    // Las etiquetas de los campos (no los títulos de sección, .campo-l--sec) son preguntas.
    const etiquetas = [...cont.querySelectorAll('.campo-l')].filter((e) => e.getClientRects().length && !e.classList.contains('campo-l--sec') && !e.closest('.ob-resumen')).map((e) => e.innerText.replace(/\\s+/g, ' ').trim()).filter((t) => t && !/¿[^?]+\\?/.test(t));
    const montos = [...cont.querySelectorAll('.campo--monto input')].filter((i) => i.getAttribute('inputmode') !== 'decimal').map((i) => i.id);
    const chicos = [...cont.querySelectorAll('button, input, label.btn, [role="radio"]')].filter((e) => e.getClientRects().length && !e.classList.contains('sr-only') && !e.closest('.link--inline') && !e.classList.contains('link--inline')).map((e) => ({ e, r: e.getBoundingClientRect() })).filter(({ e, r }) => r.height < 43.5 && !(e.classList.contains('link') && r.height >= 24)).map(({ e, r }) => (e.dataset.fk || e.id || e.className) + ':' + Math.round(r.height));
    const prim = cont.querySelector('.hoja-pie .btn--prim, .ob-pie .btn--prim, [data-fk="hoja-ok"]');
    return { elegidos, etiquetas, montos, chicos: chicos.slice(0, 6), boton: prim ? prim.innerText.trim() : null, primario };
}`;
try {
    for (const tema of temas) {
        await conDatos(tema);
        for (const f of FORMULARIOS) {
            actual = `${tema} · ${f.nombre}`;
            try {
                await ev(`P.ui.hoja = null; P.ui.ob = null; P.cerrarHoja && P.cerrarHoja({ sinFoco: true }); P.render(); true`);
                await ev(f.abrir);
                await esperar(350);
                if (f.elegir) for (const s of f.elegir) await clic(s, 300);
                else {
                    // La primera opción sin elegir que no lleve a otra pantalla.
                    const fk = await ev(`(() => { const c = ${f.enOb ? "document.querySelector('#pantalla')" : "document.querySelector('#capa-hoja .hoja')"}; const o = c && [...c.querySelectorAll('[aria-pressed="false"], [aria-checked="false"]')].find((e) => e.getClientRects().length && e.dataset.fk && !/^np-cuota$/.test(e.dataset.fk)); return o ? o.dataset.fk : null; })()`);
                    if (fk) await clic(`[data-fk="${fk}"]`, 300);
                }
                const r = await ev(`(${REVISAR})(${!!f.enOb})`);
                if (r.sin) {
                    fallos.push(`${actual}: no se abrió`);
                    continue;
                }
                revisados.push({ tema, formulario: f.nombre, ...r, chicos: r.chicos.length });
                if (!f.sinOpciones) check('hay una opción elegida a la vista', r.elegidos.length > 0, true);
                for (const e of r.elegidos) {
                    check(`«${e.texto}» con ✓`, e.check, true);
                    check(`«${e.texto}» con el borde del acento (--color-primary)`, e.borde.replace(/\s/g, ''), (x) => {
                        const p = r.primario.toLowerCase();
                        if (!p.startsWith('#')) return true;
                        const n = [1, 3, 5].map((i) => parseInt(p.slice(i, i + 2), 16));
                        return x === `rgb(${n.join(',')})`;
                    });
                    // Los días van rellenos (el anillo es «hoy»): ahí se mide el relleno del acento.
                    if (e.relleno) check(`«${e.texto}» relleno del acento`, e.fondo.replace(/\s/g, ''), e.borde.replace(/\s/g, ''));
                    else check(`«${e.texto}» borde de 2 px`, e.ancho >= 2, true);
                    check(`«${e.texto}» borde ≥ 3:1 contra lo de alrededor`, e.contraste, (c) => c >= 3);
                    if (e.fondoOtra) check(`«${e.texto}» fondo distinto de las demás`, e.fondo !== e.fondoOtra, true);
                }
                check('etiquetas en forma de pregunta', r.etiquetas, []);
                check('montos con teclado numérico', r.montos, []);
                check('todo lo que se toca ≥ 44 px', r.chicos, []);
                if (r.boton) check('el botón dice la acción', r.boton, (t) => t !== 'Guardar' && t !== 'Aceptar' && t !== 'OK');
                if (tema === 'serena-claro' || tema === 'ancla-oscuro') await b.captura(path.join(salida, `${tema}-${f.nombre.replace(/[^\wáéíóúñ]+/gi, '-').toLowerCase()}.png`));
            } catch (e) {
                fallos.push(`${actual}: excepción: ${e.message}`);
            }
        }
    }
    // Foco visible con el teclado, error junto al campo y el teclado del teléfono, en el primer tema.
    actual = `${temas[0]} · foco, error y teclado`;
    await conDatos(temas[0]);
    await ev(abrirHoja('nuevoPago'));
    await esperar(400);
    await ev(`document.querySelector('[data-fk="np-suscripcion"]').focus(); true`);
    await b.enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await b.enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await esperar(200);
    check('foco visible con el teclado', await ev(`(() => { const e = document.activeElement; const cs = getComputedStyle(e); return e !== document.body && (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 || /rgb/.test(cs.boxShadow)); })()`), true);
    await clic('[data-fk="hoja-ok"]', 300);
    check('el error sale junto al campo', await ev(`(() => { const e = document.querySelector('#capa-hoja .campo-error'); if (!e) return false; const campo = e.closest('.campo-g'); return !!campo && !!campo.querySelector('input, [role="group"], .chips'); })()`), true);
    // El teclado del teléfono ocupa ~330 px: el botón principal sigue a la vista.
    await ev(`document.getElementById('f-monto').focus(); true`);
    await b.tamano(390, 514);
    await esperar(700);
    check('con el teclado, «Guardar pago» a la vista', await ev(`(() => { const r = document.querySelector('[data-fk="hoja-ok"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; })()`), true);
    await b.tamano(390, 844);
} catch (e) {
    fallos.push(`${actual}: excepción: ${e.message}`);
}
const informe = { formularios: FORMULARIOS.length, temas, fallos, errores: b.errores, revisados };
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ formularios: FORMULARIOS.length, temas, fallos: fallos.slice(0, 80), total: fallos.length, errores: b.errores }, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
