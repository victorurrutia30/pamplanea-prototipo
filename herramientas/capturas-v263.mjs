// CAPTURAS v2.6.3 (fase 3): las mismas pantallas antes y después del pulido de UI/UX, a 390×844 en Serena claro y Ancla
// oscuro, y a 320×700 las que tienen formularios. Guarda capturas/v263/<antes|despues>/<tema>-<ancho>/NN-nombre.png y,
// con --comparar, arma capturas/v263/index.html (se abre con doble clic) con el antes y el después lado a lado.
// Uso: node herramientas/capturas-v263.mjs --fase=antes|despues [--base=http://…/] [--puerto=9985]
//      node herramientas/capturas-v263.mjs --comparar
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const dirV263 = path.join(root, 'capturas', 'v263');

/** Las pantallas: cómo llegar (código en la página, con datos de uso de Ana) y si es un formulario (también a 320). */
const PANTALLAS = [
    ['hoy', false, `P.irTab('hoy')`],
    ['anotar-vacio', true, `P.irTab('hoy'); P.acciones.anotar()`],
    ['anotar-gasto', true, `P.irTab('hoy'); P.acciones.anotar(); escribir('#anotar-q', 'súper 25')`],
    ['anotar-cuadre', true, `P.irTab('hoy'); P.acciones.anotar(); escribir('#anotar-q', 'tengo 50 efectivo')`],
    ['anotar-error', true, `P.irTab('hoy'); P.acciones.anotar(); escribir('#anotar-q', 'súper'); document.querySelector('[data-fk="anotar-guardar"]').click()`],
    ['nuevo-pago', true, `P.irTab('pagos'); P.abrirHoja('nuevoPago')`],
    ['nuevo-pago-servicios', true, `P.irTab('pagos'); P.abrirHoja('nuevoPago'); (document.querySelector('[data-fk="np-servicios"]') || document.querySelector('[data-fk="op-frecuente-luz"]'))?.click()`],
    ['nuevo-pago-error', true, `P.irTab('pagos'); P.abrirHoja('nuevoPago'); P.acciones.nuevoPagoOk()`],
    ['nueva-tarjeta', true, `P.irTab('midinero'); P.abrir('deudas'); P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' })`],
    ['nuevo-prestamo', true, `P.irTab('midinero'); P.abrir('deudas'); P.abrirHoja('nuevaDeuda', { tipoInicial: 'prestamo' })`],
    ['nuevo-ingreso', true, `P.irTab('pagos'); P.abrirHoja('nuevoIngreso')`],
    ['cuadrar', true, `P.irTab('midinero'); P.abrir('cuentas'); P.abrirHoja('cuadrar', { lugar: 'efectivo' })`],
    ['ahorrar', true, `P.irTab('midinero'); P.abrir('ahorros'); P.abrirHoja('apartar')`],
    ['pagos', false, `P.ui.pagosModo = 'calendario'; P.irTab('pagos')`],
    ['pagos-lista', false, `P.ui.pagosModo = 'lista'; P.irTab('pagos')`],
    ['mi-dinero', false, `P.irTab('midinero')`],
    ['deudas', false, `P.irTab('midinero'); P.abrir('deudas')`],
    ['tarjeta', false, `P.irTab('midinero'); P.abrir('tarjeta', P.st.tarjetas[0].id)`],
    ['mes', false, `P.irTab('mes')`],
    ['ayuda', false, `P.irTab('hoy'); P.ayuda.abrir('inicio')`],
    ['desglose', false, `P.irTab('hoy'); P.abrirHoja('desglose')`],
];

async function capturar(fase) {
    const { abrir, esperar } = await import('./cdp.mjs');
    const base = args.base || pathToFileURL(root).href + '/';
    const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9985) });
    await b.movimientoReducido(true);
    await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
    const ev = (s) => b.evaluar(s);
    const salida = path.join(dirV263, fase);
    await rm(salida, { recursive: true, force: true });
    const ponerUso = async (tema) => {
        await b.ir('about:blank');
        await b.ir(base + 'telefono.html#tema=' + tema);
        await esperar(400);
        await ev(`(() => {
            P.sinGuardar = true;
            localStorage.clear();
            const s = DATOS.crearAna();
            Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
            localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-15T08:00:00.000Z', st: s, tab: 'hoy', tema: ${JSON.stringify(tema)}, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 9, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] }));
            localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, deudas: true, cuentas: true, ahorros: true } }));
            return true;
        })()`);
        await b.ir('about:blank');
        await b.ir(base + 'telefono.html#tema=' + tema);
        await esperar(500);
    };
    for (const tema of ['serena-claro', 'ancla-oscuro']) {
        for (const [ancho, alto] of [[390, 844], [320, 700]]) {
            await b.tamano(ancho, alto);
            await ponerUso(tema);
            const dir = path.join(salida, `${tema}-${ancho}`);
            await mkdir(dir, { recursive: true });
            let n = 0;
            for (const [nombre, form, codigo] of PANTALLAS) {
                n++;
                if (ancho === 320 && !form) continue;
                await ev(`(() => { if (P.ayuda.abierto) P.ayuda.cerrar({ foco: false }); if (P.ui.hoja) P.cerrarHoja({ sinFoco: true }); P.ui.stack = []; P.ui.toast = null; P.renderToast && P.renderToast(); return true; })()`);
                await esperar(120);
                try {
                    await ev(`(async () => { const escribir = (sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }; ${codigo}; return true; })()`);
                } catch (e) {
                    console.log(`${nombre}: ${e.message.split('\n')[0]}`);
                }
                await esperar(450);
                await ev('document.activeElement && document.activeElement.blur && document.activeElement.blur(); true');
                await esperar(80);
                await b.captura(path.join(dir, `${String(n).padStart(2, '0')}-${nombre}.png`));
            }
        }
    }
    console.log(JSON.stringify({ fase, errores: b.errores }));
    await b.cerrar();
}

/** index.html con el antes y el después lado a lado (rutas relativas: se abre con doble clic). */
async function comparar() {
    const grupos = [];
    for (const carpeta of (await readdir(path.join(dirV263, 'despues'))).sort()) {
        const archivos = (await readdir(path.join(dirV263, 'despues', carpeta))).filter((f) => f.endsWith('.png')).sort();
        grupos.push({ carpeta, archivos });
    }
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const filas = grupos
        .map(({ carpeta, archivos }) => `<h2 id="${carpeta}">${esc(carpeta.replace('-390', ' · 390 × 844').replace('-320', ' · 320 de ancho'))}</h2>${archivos.map((f) => `<section><h3>${esc(f.replace(/^\d+-/, '').replace('.png', ''))}</h3><div class="par"><figure><figcaption>Antes (v2.6.2)</figcaption><img loading="lazy" src="antes/${carpeta}/${f}" alt="Antes: ${esc(f)}"></figure><figure><figcaption>Después (v2.6.3)</figcaption><img loading="lazy" src="despues/${carpeta}/${f}" alt="Después: ${esc(f)}"></figure></div></section>`).join('')}`)
        .join('');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PamPlanea · antes y después (v2.6.3)</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f4f1f3;color:#2a1f26}h1{margin:0 0 8px}p{max-width:70ch}nav a{margin-right:12px}h2{margin-top:40px;border-top:2px solid #d9cdd4;padding-top:16px}h3{margin:24px 0 8px;font-size:15px}.par{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}figure{margin:0}figcaption{font-weight:700;margin-bottom:6px}img{max-width:100%;border:1px solid #cdbfc7;border-radius:12px;background:#fff}</style></head>
<body><h1>PamPlanea · antes y después (fase 3)</h1><p>Las mismas pantallas con los mismos datos (Ana, 21 de octubre), antes (v2.6.2) y después (v2.6.3) del pulido de formularios, cuadros y consistencia. A 390 × 844 en Serena claro y Ancla oscuro, y a 320 de ancho las que tienen formularios. Generado por <code>herramientas/capturas-v263.mjs</code>.</p>
<nav>${grupos.map((g) => `<a href="#${g.carpeta}">${esc(g.carpeta)}</a>`).join('')}</nav>${filas}</body></html>`;
    await writeFile(path.join(dirV263, 'index.html'), html);
    console.log('index.html', grupos.reduce((n, g) => n + g.archivos.length, 0), 'pares');
}

if ('comparar' in args) await comparar();
else await capturar(args.fase || 'antes');
