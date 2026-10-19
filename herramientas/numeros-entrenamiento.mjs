// PRUEBA v2.6.1 (V2-76): «que lo que vaya mostrando de ejemplo en entrenamiento haga sentido». Recorre TODOS los pasos
// de las dos versiones del entrenamiento (Lo esencial y Aprende más), sus pausas y sus preguntas, y los ejercicios de
// «Practicar», y compara cada monto ($) del texto con los montos que se ven en la pantalla en ese momento.
// Un monto del texto es válido si:
//  · se ve en la app en ese momento (la pantalla y la hoja abierta; en la pausa, también sus filas antes → después);
//  · es lo que el paso pide escribir o hacer (el «pupusas 6» de «Hazlo tú»: `montos` del paso);
//  · en una pausa, es la diferencia entre dos montos que se ven (lo que bajó o subió).
// Los «?» y el glosario de «Aprende» no llevan números (no pueden coincidir con cualquier pantalla).
// Uso: node herramientas/numeros-entrenamiento.mjs [--base=http://…/] [--puerto=9967] [--sonda]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const sonda = 'sonda' in args;
const salida = path.join(root, 'capturas', 'numeros-entrenamiento');
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9967) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
const filas = [];

await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-19';` });
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await esperar(450);
}
await abrirApp();
await ev('P.sinGuardar = true; localStorage.clear(); true');
await abrirApp();
await ev(`document.querySelector('[data-fk="elegir-aprender"]').click(); true`);
await esperar(400);
await ev(`document.querySelector('[data-fk="tour-saltar"]')?.click(); true`);
await esperar(300);
// Sin esperas largas: la pausa sale enseguida.
await ev('P.tour.esperaPausa = 30; true');

/** Los montos de un texto, en centavos: «$1,315.00», «$400», «~$44», «-$15.00». */
const MONTOS = `(t) => [...String(t).matchAll(/\\$\\s?(\\d{1,3}(?:,\\d{3})*|\\d+)(?:\\.(\\d{2}))?/g)].map((m) => Number(m[1].replace(/,/g, '')) * 100 + Number(m[2] || 0))`;
await ev(`window.__montos = ${MONTOS}; true`);
/** Lo que se ve de la app (sin la capa del entrenamiento): la pantalla, la hoja abierta y el aviso de arriba. */
const pantalla = () => ev(`(() => { const t = ['#pantalla', '#capa-hoja', '#capa-banner'].map((s) => document.querySelector(s)?.innerText || '').join('\\n'); return { texto: t.replace(/\\s+/g, ' ').slice(0, 4000), montos: [...new Set(__montos(t))] }; })()`);
const tarjeta = () => ev(`(() => { const c = document.querySelector('#capa-tour .tour-card, #capa-tour .tour-hz'); return c ? c.innerText.replace(/\\s+/g, ' ').trim() : ''; })()`);
const fase = () => ev('P.tour.activo ? P.tour.fase + ":" + P.tour.i : "fuera"');
/** Lo que el paso pide escribir o hacer (en centavos). */
const montosPaso = async () => (await ev("P.tour.montosPaso ? P.tour.montosPaso() : []")).map((x) => Math.round(x * 100));
async function quieta() {
    for (let i = 0; i < 40; i++) {
        const listo = await ev(`P.tour.pintado === (P.tour.fase + ':' + P.tour.i)`);
        if (listo) break;
        await esperar(50);
    }
    await esperar(80);
}
const pesos = (c) => '$' + (c / 100).toFixed(2);
function revisar(donde, texto, vistos, extra = []) {
    const enTexto = [...String(texto).matchAll(/\$\s?(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?/g)].map((m) => Number(m[1].replace(/,/g, '')) * 100 + Number(m[2] || 0));
    const validos = new Set([...vistos, ...extra]);
    const faltan = enTexto.filter((x) => !validos.has(x));
    filas.push({ donde, texto, enTexto: enTexto.map(pesos), faltan: faltan.map(pesos), vistos: [...vistos].map(pesos) });
    if (faltan.length) fallos.push(`${donde}: ${faltan.map(pesos).join(', ')} no se ve en la pantalla · «${texto.slice(0, 220)}»`);
}

const versiones = await ev(`Object.values(P.tour.VERSIONES).map((v) => ({ id: v.id, caps: v.caps.map((c) => ({ id: c.id, titulo: c.titulo, pasos: c.pasos.length, pregunta: c.pregunta })) }))`);
for (const v of versiones) {
    for (const cap of v.caps) {
        await ev(`P.tour.empezarCap(${js(v.id)}, ${js(cap.id)}, { retomar: false }); true`);
        await quieta();
        if ((await fase()).startsWith('intro')) {
            const t = await tarjeta();
            revisar(`${v.id}/${cap.id} · intro`, t, (await pantalla()).montos);
            await ev(`P.acciones.tourEmpezarCap(); true`);
            await quieta();
        }
        for (let i = 0; i < cap.pasos; i++) {
            const donde = `${v.id}/${cap.id} · paso ${i + 1}`;
            const f = await fase();
            if (f !== 'paso:' + i) fallos.push(`${donde}: esperaba paso:${i} y está en ${f}`);
            const vista = await pantalla();
            revisar(donde, await tarjeta(), vista.montos, await montosPaso());
            // «Ver un ejemplo» (la semana mala): el texto habla de lo que se ve en ese momento.
            if (await ev(`!!document.querySelector('[data-fk="tour-ejemplo"]')`)) {
                await ev(`document.querySelector('[data-fk="tour-ejemplo"]').click(); true`);
                await quieta();
                revisar(`${donde} · ejemplo`, await tarjeta(), (await pantalla()).montos);
                await ev(`document.querySelector('[data-fk="tour-ejemplo-volver"]').click(); true`);
                await quieta();
            }
            if (await ev(`!!document.querySelector('[data-fk="tour-hazlo"]')`)) {
                await ev(`P.acciones.tourHazlo(); true`);
                await quieta();
                revisar(`${donde} · Hazlo tú`, await tarjeta(), (await pantalla()).montos, await montosPaso());
                for (let k = 0; k < 14 && (await fase()).startsWith('hazlo'); k++) {
                    await ev(`P.acciones.tourPorMi(); true`);
                    await esperar(260);
                    const t = await tarjeta();
                    if ((await fase()).startsWith('hazlo')) revisar(`${donde} · Hazlo tú (${k + 1})`, t, (await pantalla()).montos, await montosPaso());
                }
                await esperar(200);
                await quieta();
                const fp = await fase();
                if (!fp.startsWith('pausa')) {
                    fallos.push(`${donde}: «Hazlo por mí» no llegó a la pausa (${fp})`);
                    continue;
                }
                // Las filas de la pausa (antes → después) también se ven; y lo que cambió entre ellas.
                const filasPausa = await ev(`[...document.querySelectorAll('#capa-tour .tour-num')].map((p) => __montos(p.innerText))`);
                const vistos = [...(await pantalla()).montos, ...filasPausa.flat()];
                const difs = filasPausa.filter((x) => x.length === 2).map(([a, d]) => Math.abs(a - d));
                revisar(`${donde} · pausa`, await tarjeta(), vistos, [...difs, ...await montosPaso()]);
                await ev(`P.acciones.tourEntendido(); true`);
                await quieta();
            } else {
                await ev(`P.acciones.tourSig(); true`);
                await quieta();
            }
        }
        const fq = await fase();
        if (!fq.startsWith('pregunta')) fallos.push(`${v.id}/${cap.id}: esperaba la pregunta y está en ${fq}`);
        const vistaQ = (await pantalla()).montos;
        revisar(`${v.id}/${cap.id} · pregunta`, await tarjeta(), vistaQ);
        // La respuesta (bien y «Casi») habla de lo mismo que la pregunta.
        const q = cap.pregunta;
        revisar(`${v.id}/${cap.id} · pregunta (bien)`, q.si, vistaQ);
        revisar(`${v.id}/${cap.id} · pregunta (casi)`, q.casi, vistaQ);
        await ev(`P.acciones.tourResponder({ v: ${q.bien} }); true`);
        await quieta();
        await ev(`P.acciones.tourTerminar(); true`);
        await quieta();
        revisar(`${v.id}/${cap.id} · fin`, await tarjeta(), (await pantalla()).montos);
        await ev(`P.tour.terminar({ avisar: false }); true`);
        await esperar(150);
    }
}

// «?» y el glosario de «Aprende»: sin números (sirven para cualquier pantalla y para los datos de la persona).
const glosario = await ev(`(() => { const out = []; for (const variable of [false, true]) for (const g of window.GLOSARIO) { const t = window.terminoGlosario(g.id, variable); out.push({ id: g.id + (variable ? ' (varía)' : ''), texto: t.para + ' ' + t.ejemplo }); } return out; })()`);
for (const g of glosario) revisar(`glosario · ${g.id}`, g.texto, []);

// «Practicar»: cada ejercicio, con sus datos de ejemplo cargados. Vale lo que se ve en Hoy, Pagos y Mi dinero al
// empezar y lo que el ejercicio pide escribir o cuenta que pasó (`montos` del ejercicio).
const practica = await ev(`window.PRACTICA.map((x) => x.id)`);
for (const id of practica) {
    await ev(`P.practica.empezar(${js(id)}); true`);
    await esperar(250);
    const vistos = new Set();
    for (const tab of ['hoy', 'pagos', 'pagos-lista', 'midinero', 'mes']) {
        await ev(`P.ui.pagosModo = ${js(tab === 'pagos-lista' ? 'lista' : 'calendario')}; P.irTab(${js(tab.replace('-lista', ''))}); true`);
        await esperar(120);
        for (const m of (await pantalla()).montos) vistos.add(m);
    }
    await ev(`P.ui.pagosModo = 'calendario'; true`);
    const c = await ev(`(() => { const c = [...window.CASOS, ...(window.CASOS_PRACTICA || [])].find((x) => x.id === ${js(id)}); const x = window.PRACTICA.find((y) => y.id === ${js(id)}); return { tarea: c.tarea, pasos: c.pasos.map((p) => p.t), montos: x.montos || [] }; })()`);
    revisar(`practicar ${id} · tarea`, c.tarea, [...vistos], c.montos.map((x) => x * 100));
    c.pasos.forEach((t, i) => revisar(`practicar ${id} · paso ${i + 1}`, t, [...vistos], c.montos.map((x) => x * 100)));
    await ev(`P.practica.salir(); true`);
}

await writeFile(path.join(salida, 'informe.json'), JSON.stringify({ base, fallos, filas, errores: b.errores }, null, 1));
if (sonda) for (const f of filas) console.log(`${f.faltan.length ? '✗' : '·'} ${f.donde} | ${f.enTexto.join(' ')} | ${f.faltan.length ? 'FALTAN ' + f.faltan.join(' ') + ' | ' : ''}${f.texto.slice(0, 160)}`);
console.log(`\n${filas.length} textos revisados · ${fallos.length} con montos que no se ven`);
for (const f of fallos) console.log('  ✗ ' + f);
if (b.errores.length) console.log('Errores de la página:', b.errores);
await b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
