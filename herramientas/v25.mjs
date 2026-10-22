// PRUEBAS v2.5 «Entrenamiento sencillo y a fondo». A 390×844, como una persona nueva:
//  A) la entrada (sin «4 minutos») y «¿Cómo recibes tu dinero?»;
//  B) «Lo esencial» en las dos versiones: cada paso (qué ves · para qué · ejemplo, los mismos textos del glosario;
//     ≤ 2 líneas; resaltado correcto; sin «quincena» en la variable), NADA avanza solo (paso, «Hazlo tú», pausa y
//     pregunta se quedan quietos), «Hazlo tú» a mano y con «Hazlo por mí» (un solo toque a la vez), lo oscuro no se toca,
//     la pausa con antes → después del motor y solo «Entendido», la pregunta con un error, «Repasar este paso», el final
//     y la marca de «hecho»; al terminar, los ejemplos vuelven al inicio;
//  C) retomar (Salir → «Sigue donde te quedaste» en Hoy y en «Aprende más»);
//  D) cada capítulo de «Aprende más» en las dos versiones (sus pasos, su «Hazlo tú», su pregunta y su marca);
//  E) V2-59: #27 «Tus ventas cuentan cuando las anotas», #28 «Cómo recibes tu dinero», #29 «Ver un ejemplo»;
//  F) la oferta de tarjetas con tus datos (y «Volver a mis datos» sin perder nada);
//  G) «Practicar»: 18 ejercicios, cada uno con el capítulo de antes; H) «?» y «Aprende» con los mismos textos;
//  I) legibilidad; J) reducir movimiento y 44 px; K) contraste en los 4 temas.
// Uso: node herramientas/v25.mjs [--base=http://…/] [--tema=serena-claro] [--partes=a,b,c,d,e,f,g,h,i,j,k]
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

// v2.8 (D-4, U01): el libre de Ana al inicio es $285.60 (los $15 de intereses de BAC van con la quincena del 30; antes $270.60).
const LIBRE_ANA = 28560;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const partes = (args.partes || 'a,b,c,d,e,f,g,h,i,j,k').split(',');
const salida = path.join(root, 'capturas', 'v25' + (args.base ? '-servida' : ''), tema);
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9951) });
await b.tamano(390, 844);
const informe = { base, tema, fallos: [], numeros: {}, revision: {}, errores: b.errores, fallidas: b.fallidas };
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
let actual = '';
let n = 0;
/** La captura, cuando el resaltado y la tarjeta ya terminaron de entrar (la tarjeta aparece después, a propósito). */
const foto = async (nombre) => {
    await esperar(150);
    await ev(`Promise.race([Promise.all(document.getAnimations().filter((a) => a.playState === 'running' && Number.isFinite(a.effect.getComputedTiming().endTime)).map((a) => a.finished.catch(() => null))), new Promise((r) => setTimeout(r, 2000))]).then(() => true)`);
    await esperar(80);
    await b.captura(path.join(salida, `${String(++n).padStart(3, '0')}-${nombre}.png`));
};
// Sin `scrollIntoView` (movía el marco de la app): la app pone a la vista lo que hace falta.
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(160);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(120);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 400)}»`);
    return ok;
};
const contiene = (...subs) => (x) => typeof x === 'string' && subs.every((s) => x.includes(s));
let scriptFecha = null;
async function fecha(iso) {
    if (scriptFecha) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptFecha });
    scriptFecha = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = ${js(iso)};` })).identifier;
}
async function abrirApp(hash = '') {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#' + (hash ? hash + '&' : '') + 'tema=' + tema);
    await esperar(450);
}
async function limpio(hash = '') {
    await abrirApp(hash);
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp(hash);
}
/** Espera a que el entrenamiento esté DIBUJADO en una fase (y paso). */
async function pintado(fase, i = null, ms = 8000) {
    const quiere = i === null ? null : `${fase}:${i}`;
    for (let t = 0; t < ms; t += 100) {
        const p = await ev('P.tour.pintado');
        if (quiere ? p === quiere : p && p.startsWith(fase + ':')) {
            await esperar(fase === 'hazlo' ? 250 : 120);
            return true;
        }
        await esperar(100);
    }
    informe.fallos.push(`${actual}: no llegó a ${quiere || fase} (está en ${await ev('P.tour.pintado')})`);
    return false;
}
const estado = () => ev(`(() => ({ fase: P.tour.fase, i: P.tour.i, t: document.getElementById('tour-t')?.innerText.replace(/\\s+/g, ' ').trim(), x: document.getElementById('tour-x')?.innerText.replace(/\\s+/g, ' ').trim() || null, instr: document.getElementById('tour-instr')?.textContent || null, libre: P.calc().libre, hoja: P.ui.hoja && P.ui.hoja.tipo, tab: P.ui.tab, pila: P.ui.stack.length }))()`);
const lineasDe = (sel) => ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return null; if (getComputedStyle(el).display === 'inline') return el.getClientRects().length; const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4; return Math.round((el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh); })()`);
const sinQuincena = () => ev('!/quincena/i.test(document.body.innerText)');
const dinero = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const corto = (c) => dinero(Math.abs(c)).replace(/\.00$/, '');
const prohibidas = ['periodo', 'período', 'saldo inicial', 'ledger', 'ajuste', 'conciliación', 'conciliacion', 'asignación', 'asignacion', 'proyección', 'proyeccion'];

/** Lo que dice el capítulo (sin dibujar): sus pasos, su glosario y su pregunta. */
const infoCap = (version, id) => ev(`(() => { const c = P.tour.capDe(${js(version)}, ${js(id)}); const v = ${js(version)} === 'variable'; return { titulo: c.titulo, n: c.pasos.length, intro: !!c.intro, pasos: c.pasos.map((p) => { const g = p.g ? window.terminoGlosario(p.g, v) : null; const val = (x) => (typeof x === 'function' ? x() : x); return { que: val(p.que), para: p.para || (g && g.para) || '', ejemplo: val(p.ejemplo) || (g && g.ejemplo) || '', g: p.g || null, hazlo: !!p.hazlo, ver: !!p.ejemploVer, sel: !!p.sel }; }), pregunta: c.pregunta }; })()`);

/** Revisa el paso explicado que está a la vista (y lo anota para la tabla de LEEME). */
async function revisarPaso(version, cap, i, { repaso = false } = {}) {
    const p = cap.pasos[i];
    const fallas = [];
    const ind = await texto('.tour-card .paso');
    const quiere = repaso ? 'Repaso' : `${cap.titulo} · paso ${i + 1} de ${cap.n}`;
    if (ind !== quiere) fallas.push(`indicador «${ind}»`);
    // v2.6.1 (V2-76): el título y el ejemplo de un paso pueden calcularse con los números que se ven en ese momento;
    // se comparan con lo que el paso calcula ahí mismo. El «para qué» sigue siendo el del glosario.
    const vivo = await ev(`(() => { const T = P.tour; const paso = T.cap.pasos[T.i]; const v = T.cap.version === 'variable'; const g = paso.g ? window.terminoGlosario(paso.g, v) : null; const val = (x) => (typeof x === 'function' ? x() : x); return { que: val(paso.que), ejemplo: val(paso.ejemplo) || (g && g.ejemplo) || '' }; })()`);
    if ((await texto('#tour-t')) !== vivo.que) fallas.push('título');
    if ((await texto('.tour-card .tour-para')) !== p.para) fallas.push('«para qué» no es el del glosario');
    if ((await texto('.tour-card .tour-ej-x')) !== vivo.ejemplo) fallas.push('el ejemplo no es el que calcula el paso');
    for (const [nombre, sel] of [['título', '#tour-t'], ['para qué', '.tour-card .tour-para'], ['ejemplo', '.tour-card .tour-ej-x']]) {
        const l = await lineasDe(sel);
        if (l > 2) fallas.push(`${nombre}: ${l} líneas`);
    }
    if (p.sel) {
        const r = await ev(`(() => { const T = P.tour; const paso = T.cap.pasos[T.i]; const el = typeof paso.sel === 'function' ? paso.sel() : document.querySelector(paso.sel); const foco = document.querySelector('.tour-foco'); const card = document.querySelector('.tour-card'); if (!el || !foco) return { falta: !el ? 'elemento' : 'foco' }; const r = el.getBoundingClientRect(), f = foco.getBoundingClientRect(), c = card.getBoundingClientRect(); const t = 10; const app = document.getElementById('app').getBoundingClientRect(); return { dentro: f.left <= r.left + t && f.top <= r.top + t && f.right >= r.right - t && f.bottom >= Math.min(r.bottom, app.bottom) - t, visible: r.top >= app.top - 1 && r.top < app.bottom - 20, tapa: !(c.bottom <= r.top + 1 || c.top >= Math.min(r.bottom, app.bottom) - 1) }; })()`);
        if (r.falta) fallas.push('falta ' + r.falta);
        else {
            if (!r.dentro) fallas.push('el marco no rodea lo que explica');
            if (!r.visible) fallas.push('lo resaltado no se ve');
            if (r.tapa) fallas.push('la tarjeta tapa lo que explica');
        }
    }
    if (version === 'variable' && !(await sinQuincena())) fallas.push('dice «quincena»');
    if ((await ev('document.activeElement && document.activeElement.id')) !== 'tour-t') fallas.push('el foco no está en el título');
    if (!(await ev('[...document.querySelectorAll(".tour-card .btn")].every((e) => e.getBoundingClientRect().height >= 44)'))) fallas.push('botones de menos de 44 px');
    check(`${version} «${cap.titulo}» paso ${i + 1} (${p.que})`, fallas, []);
    (informe.revision[`${version}:${cap.titulo}`] ||= []).push({ paso: i + 1, que: p.que, glosario: p.g, hazlo: p.hazlo, lineas: [await lineasDe('.tour-card .tour-para'), await lineasDe('.tour-card .tour-ej-x')] });
}
/** «Nada avanza solo»: después de 3 segundos sin tocar nada, todo sigue igual. */
async function quieto(nombre, ms = 3000) {
    const a = await estado();
    await esperar(ms);
    const d = await estado();
    check(`${nombre}: nada avanza solo (${ms / 1000} s)`, [d.fase, d.i, d.t, d.x, d.instr, d.libre], [a.fase, a.i, a.t, a.x, a.instr, a.libre]);
}
/** «Hazlo tú»: la barra, la flecha y el anillo sobre lo que hay que tocar; lo oscuro no se toca. */
async function revisarHazlo(version, cap, i, { probarOscuro = false } = {}) {
    const s = await ev(`(() => { const T = P.tour; const sn = T.cap.pasos[T.i].hazlo.senal(); const el = document.querySelector(sn.sel); const anillo = document.querySelector('.tour-senal'); const flecha = document.querySelector('.tour-flecha'); if (!el || !anillo || !flecha) return { falta: !el ? 'elemento' : !anillo ? 'anillo' : 'flecha' }; const a = el.getBoundingClientRect(); const r = anillo.getBoundingClientRect(); const f = flecha.getBoundingClientRect(); return { texto: document.getElementById('tour-instr').textContent, n: document.querySelector('.tour-hz-n').innerText.replace(/\\s+/g, ' ').trim(), centrado: Math.abs((a.left + a.width / 2) - (r.left + r.width / 2)) < 3 && Math.abs((a.top + a.height / 2) - (r.top + r.height / 2)) < 3, flecha: Math.abs((a.left + a.width / 2) - (f.left + f.width / 2)) < 24 && (f.bottom <= a.top + 2 || f.top >= a.bottom - 2) }; })()`);
    if (s.falta) return check(`${version} «${cap.titulo}» paso ${i + 1}: «Hazlo tú» señala`, s.falta, 'ok');
    check(`${version} «${cap.titulo}» paso ${i + 1}: «Hazlo tú» (barra, flecha y anillo)`, [s.n, s.centrado, s.flecha, (await lineasDe('#tour-instr')) <= 2], [`${cap.titulo} · paso ${i + 1} de ${cap.n} · Hazlo tú`, true, true, true]);
    if (version === 'variable') check(`${version} «${cap.titulo}» paso ${i + 1}: «Hazlo tú» sin «quincena»`, await sinQuincena(), true);
    if (probarOscuro) {
        // Tocar lo oscuro (aquí, el centro del número) no hace nada: solo recuerda dónde tocar.
        const antes = await estado();
        const r = await ev(`(() => { const p = document.querySelector('.portada').getBoundingClientRect(); const el = document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2); const dim = !!(el && el.classList.contains('tour-dim')); if (el) el.click(); return dim; })()`);
        await esperar(250);
        const d = await estado();
        check('lo oscuro no se toca: solo «Toca donde señala la flecha»', [r, d.hoja, d.tab, d.pila, await texto('#tour-pista')], [true, antes.hoja, antes.tab, antes.pila, 'Toca donde señala la flecha.']);
    }
}
/** La pausa: antes → después con los números del motor, el porqué en ≤ 2 líneas y solo «Entendido». */
async function revisarPausa(version, cap, i, antes) {
    const d = await ev('P.calc().libre');
    const filas = await ev('[...document.querySelectorAll(".tour-card .tour-num")].map((e) => e.innerText.replace(/\\s+/g, " ").trim())');
    const porque = await texto('.tour-card .tour-porque');
    const botones = await ev('[...document.querySelectorAll(".tour-card button")].map((e) => e.innerText.trim())');
    const fila = filas[0] || '';
    const filaOk = antes === d ? fila === `Libre ${dinero(d)} sin cambio` : fila === `Libre ${dinero(antes)} ${dinero(d)}`;
    const porqueOk = antes === d ? /no cambió/.test(porque) || porque.startsWith('Tu libre ahora llega') : porque.startsWith(`Tu libre ${d < antes ? 'bajó' : 'subió'} de ${corto(antes)} a ${corto(d)} porque `);
    // v2.6.4 (V2-79): la pausa sigue esperando «Entendido» para avanzar; además tiene «Salir», como todas las tarjetas.
    check(`${version} «${cap.titulo}» paso ${i + 1}: la pausa (antes → después del motor, el porqué, solo «Entendido» para seguir)`, [filaOk, porqueOk, (await lineasDe('.tour-card .tour-porque')) <= 2, botones], [true, true, true, ['Salir', 'Entendido']]);
    if (version === 'variable') check(`${version} «${cap.titulo}» paso ${i + 1}: la pausa sin «quincena»`, await sinQuincena(), true);
    (informe.revision[`${version}:${cap.titulo}`] ||= []).push({ paso: i + 1, pausa: porque, filas });
}
/**
 * Recorre un capítulo completo. `aMano`: el primer «Hazlo tú» lo hace la persona (tocando y escribiendo de verdad); los
 * demás con «Hazlo por mí» (un solo toque a la vez). `quietud`: prueba que nada avanza solo.
 */
async function recorrerCap(version, id, { aMano = false, quietud = false, fotos = true, error = true } = {}) {
    const cap = await infoCap(version, id);
    actual = `${version}:${id}`;
    if (cap.intro) {
        await pintado('intro');
        check(`${version}: intro de «Lo esencial»`, [await texto('.tour-card .paso'), await texto('#tour-x')], (x) => x[0].startsWith('Lo esencial · 6 pasos') && x[1].includes('Te muestro una cosa a la vez. Lo que queda oscuro lo verás después.'));
        if (quietud) await quieto(`${version} intro`);
        if (fotos) await foto(`${version}-${id}-intro`);
        await clic('[data-fk="tour-empezar"]');
    }
    let aManoHecho = !aMano;
    for (let i = 0; i < cap.n; i++) {
        await pintado('paso', i);
        await revisarPaso(version, cap, i);
        if (fotos) await foto(`${version}-${id}-${i + 1}`);
        if (quietud && i === 0) await quieto(`${version} «${cap.titulo}» paso 1`, quietud === true ? 3000 : 1500);
        const p = cap.pasos[i];
        if (p.ver) await probarEjemplo(version);
        if (!p.hazlo) {
            await clic('[data-fk="tour-sig"]');
            continue;
        }
        check(`${version} «${cap.titulo}» paso ${i + 1}: explica antes de «Hazlo tú»`, await ev('[...document.querySelectorAll(".tour-card .btn")].map((e) => e.innerText.trim())'), ['Atrás', 'Hazlo tú']);
        const antes = await ev('P.calc().libre');
        await clic('[data-fk="tour-hazlo"]');
        await pintado('hazlo', i);
        await revisarHazlo(version, cap, i, { probarOscuro: !aManoHecho });
        if (fotos) await foto(`${version}-${id}-${i + 1}-hazlo`);
        if (quietud && (!aManoHecho || quietud !== true)) await quieto(`${version} «${cap.titulo}» «Hazlo tú»`, quietud === true ? 3000 : 1500);
        for (let k = 0; k < 14 && !(await ev('P.tour.hecho')); k++) {
            const s = await ev('(() => { const s = P.tour.cap.pasos[P.tour.i].hazlo.senal(); return s && { sel: s.sel, texto: s.texto, hacer: s.hacer }; })()');
            if (!s) break;
            if (!aManoHecho) {
                // A mano: tocar o escribir de verdad.
                if (s.hacer === 'tocar') await clic(s.sel);
                else await escribir(s.sel, s.hacer.escribir);
            } else {
                await clic('[data-fk="tour-por-mi"]');
                await esperar(450);
                // «Hazlo por mí» hizo UN solo toque: o terminó, o la instrucción pasó a la siguiente.
                const d = await ev('(() => ({ hecho: P.tour.hecho, texto: (P.tour.cap.pasos[P.tour.i].hazlo.senal() || {}).texto }))()');
                check(`${version} «${cap.titulo}» paso ${i + 1}: «Hazlo por mí» hace un solo toque («${s.texto}»)`, d.hecho || d.texto !== s.texto, true);
            }
            await esperar(350);
            if (fotos && k === 0) await foto(`${version}-${id}-${i + 1}-hazlo-2`);
        }
        aManoHecho = true;
        await pintado('pausa', i);
        await revisarPausa(version, cap, i, antes);
        if (fotos) await foto(`${version}-${id}-${i + 1}-pausa`);
        if (quietud && i === cap.pasos.findIndex((x) => x.hazlo)) await quieto(`${version} «${cap.titulo}» pausa`, quietud === true ? 3000 : 1500);
        await clic('[data-fk="tour-entendido"]');
    }
    // La pregunta del capítulo: una vez mal («Casi», nunca «incorrecto»), repasar ese paso y volver.
    await pintado('pregunta');
    const q = cap.pregunta;
    check(`${version} «${cap.titulo}»: una sola pregunta`, [await texto('.tour-card .paso'), await texto('#tour-t'), await ev('document.querySelectorAll(".tour-op").length')], [`${cap.titulo} · ¿Lo entendí?`, q.p, 3]);
    if (quietud) await quieto(`${version} «${cap.titulo}» pregunta`, quietud === true ? 3000 : 1500);
    if (error) {
        await clic(`[data-fk="tour-op-${(q.bien + 1) % 3}"]`);
        await esperar(200);
        check(`${version} «${cap.titulo}»: «Casi», con «Repasar este paso»`, [await texto('.tour-fb'), await ev('[...document.querySelectorAll(".tour-card .btn")].map((e) => e.innerText.trim())')], (x) => x[0] === q.casi && x[0].startsWith('Casi:') && !/incorrect/i.test(x[0]) && JSON.stringify(x[1]) === JSON.stringify(['Repasar este paso', 'Seguir']));
        if (fotos) await foto(`${version}-${id}-casi`);
        await clic('[data-fk="tour-repasar"]');
        await pintado('paso', q.repaso);
        await revisarPaso(version, cap, q.repaso, { repaso: true });
        check(`${version} «${cap.titulo}»: el repaso solo tiene «Volver a la pregunta»`, await ev('[...document.querySelectorAll(".tour-card .btn")].map((e) => e.innerText.trim())'), ['Volver a la pregunta']);
        await clic('[data-fk="tour-volver-pregunta"]');
        await pintado('pregunta');
    }
    await clic(`[data-fk="tour-op-${q.bien}"]`);
    await esperar(200);
    check(`${version} «${cap.titulo}»: bien`, await texto('.tour-fb'), q.si);
    await clic('[data-fk="tour-terminar"]');
    await pintado('fin');
    check(`${version} «${cap.titulo}»: hecho`, await ev(`(P.modos.entrenamiento().caps || {})[${js(version + ':' + id)}]`), { paso: 0, hecho: true });
    if (fotos) await foto(`${version}-${id}-fin`);
    return cap;
}
/** V2-59 (#29): la semana mala solo se ve si la persona la abre, y vuelve con «Volver a mis números». */
async function probarEjemplo(version) {
    const antes = await ev('[P.calc().libre, P.st.registros.some((r) => r.ref === "semana-mala")]');
    check(`${version}: la semana mala no aparece sola`, antes[1], false);
    await clic('[data-fk="tour-ejemplo"]');
    await pintado('paso');
    check(`${version}: «Ver un ejemplo» la muestra (libre $0 y cuánto falta)`, [await texto('#tour-t'), await texto('.portada-n'), await texto('.portada'), await ev('[...document.querySelectorAll(".tour-card .btn")].map((e) => e.innerText.trim())')], (x) => x[0] === 'Así se vería una semana mala' && x[1] === '$0.00' && /Faltan \$[\d.]+ para cubrir/.test(x[2]) && JSON.stringify(x[3]) === JSON.stringify(['Volver a mis números']));
    await quieto(`${version} semana mala`);
    await foto(`${version}-semana-mala`);
    await clic('[data-fk="tour-ejemplo-volver"]');
    await pintado('paso');
    check(`${version}: «Volver a mis números» la quita`, await ev('[P.calc().libre, P.st.registros.some((r) => r.ref === "semana-mala")]'), antes);
}

try {
    // ============================================================ A) entrada
    if (partes.includes('a')) {
        actual = 'A entrada';
        await fecha('2026-10-18');
        await limpio();
        check('bienvenida sin «4 minutos»', await texto('.ay'), (x) => x.includes('Te la enseño paso a paso, con datos de ejemplo. Vas a tu ritmo.') && !x.includes('minutos'));
        await foto('A-bienvenida');
        await clic('[data-fk="elegir-aprender"]');
        await pintado('elegir');
        check('una sola pregunta al entrar', [await texto('#tour-t'), await ev('[...document.querySelectorAll(".tour-version .opcion-g-t")].map((e) => e.textContent)')], ['¿Cómo recibes tu dinero?', ['Me pagan en fecha fija', 'Lo recibo cuando vendo o trabajo']]);
        await foto('A-pregunta');
        await clic('[data-fk="tour-saltar"]');
        await esperar(300);
        check('«Ahora no»: cierra sin tocar los ejemplos', [await ev('P.tour.activo'), await ev('P.calc().libre')], [false, LIBRE_ANA]);
        check('menú: «Aprender a usarla», sin «4 minutos»', await ev('(() => { P.abrirHoja("menu"); const t = document.querySelector(".hoja").innerText; P.cerrarHoja(); return t; })()'), (x) => x.includes('Aprender a usarla') && x.includes('Lo esencial y capítulos cortos') && !x.includes('minutos'));
    }

    // ============================================================ B) «Lo esencial», versión fija (Ana): a mano + quietud
    if (partes.includes('b')) {
        actual = 'B fijo';
        await fecha('2026-10-18');
        await limpio();
        await clic('[data-fk="elegir-aprender"]');
        await pintado('elegir');
        await clic('[data-fk="tour-version-fijo"]');
        check('fijo: Ana sin tarjeta y con números redondos', await ev('[P.st.persona, P.st.tarjetas.length, P.calc().libre]'), ['ana', 0, 40000]);
        await recorrerCap('fijo', 'esencial', { aMano: true, quietud: true });
        check('fijo: al final, «Empezar con mis datos» y «Aprender más»', [await texto('#tour-t'), await ev('[...document.querySelectorAll(".tour-card .btn")].map((e) => e.innerText.trim())'), await texto('[data-fk="tour-mirar"]')], ['¡Listo! Ya sabes lo esencial', ['Empezar con mis datos', 'Aprender más'], null]); // V2-69 #36: sin «Seguir mirando los ejemplos»
        await ev('P.acciones.tourFin({ v: "mirar" }); true');
        await esperar(400);
        check('fijo: al terminar, los ejemplos como al inicio', [await ev('P.calc().libre'), await ev('!!P.st.recorrido'), await texto('.toast')], (x) => x[0] === LIBRE_ANA && x[1] === false && x[2].includes('Listo, dejé los ejemplos como al inicio'));
        // «Aprende más»: la marca de hecho.
        await ev('P.ayuda.abrir("aprendeMas"); true');
        await esperar(300);
        check('«Aprende más»: Lo esencial hecho y 5 capítulos', [await texto('[data-fk="cap-esencial"] .cap-estado'), await ev('document.querySelectorAll("[data-fk^=cap-]").length'), await texto('#am-mas')], ['Hecho', 6, 'Aprende más · 0 de 5 hechos']);
        await foto('B-aprende-mas');
        await ev('P.ayuda.cerrar({ foco: false }); true');

        // ======================================================== «Lo esencial», versión variable (Rosa)
        actual = 'B variable';
        await ev('P.tour.elegir(); true');
        await pintado('elegir');
        check('la pregunta recuerda lo hecho', await ev('[...document.querySelectorAll(".tour-version-e")].map((e) => e.textContent)'), ['Ya hiciste «Lo esencial»']);
        await clic('[data-fk="tour-version-variable"]');
        check('variable: con Rosa', await ev('[P.st.persona, P.calc().libre]'), ['rosa', 8000]);
        await recorrerCap('variable', 'esencial', { aMano: true, quietud: true });
        await ev('P.acciones.tourFin({ v: "mirar" }); true');
        await esperar(400);
        check('variable: al terminar, Rosa como al inicio', [await ev('P.st.persona'), await ev('P.calc().libre'), await ev('!!P.st.recorrido')], ['rosa', 8000, false]);
    }

    // ============================================================ C) retomar donde se quedó
    if (partes.includes('c')) {
        actual = 'C retomar';
        await fecha('2026-10-18');
        await limpio();
        await clic('[data-fk="elegir-aprender"]');
        await pintado('elegir');
        await clic('[data-fk="tour-version-fijo"]');
        await pintado('intro');
        await clic('[data-fk="tour-empezar"]');
        await pintado('paso', 0);
        await clic('[data-fk="tour-sig"]');
        await pintado('paso', 1);
        await clic('[data-fk="tour-sig"]');
        await pintado('paso', 2);
        await clic('[data-fk="tour-salir"]');
        await esperar(400);
        check('Salir: guarda el paso y los ejemplos vuelven', [await ev('P.tour.activo'), await ev('P.modos.entrenamiento().caps["fijo:esencial"]'), await ev('P.calc().libre'), await texto('.toast')], (x) => x[0] === false && x[1].paso === 2 && !x[1].hecho && x[2] === LIBRE_ANA && x[3].includes('como al inicio'));
        check('Hoy: «Sigue donde te quedaste»', await texto('section[aria-labelledby="tour-seguir-t"]'), contiene('Sigue donde te quedaste', '«Lo esencial» (fecha fija): vas en el paso 3 de 6'));
        await foto('C-hoy-seguir');
        await clic('[data-fk="tour-hoy-seguir"]');
        await pintado('paso', 2);
        check('retoma en el paso 3 con sus ejemplos', [await ev('P.tour.i'), await texto('.tour-card .paso'), await ev('P.calc().libre')], [2, 'Lo esencial · paso 3 de 6', 40000]);
        await clic('[data-fk="tour-salir"]');
        await esperar(300);
        // Desde «Aprende más»: primero pregunta.
        await ev('P.ayuda.abrir("aprendeMas"); true');
        await esperar(300);
        check('«Aprende más» dice dónde ibas', await texto('[data-fk="cap-esencial"] .cap-estado'), 'Ibas en el paso 3 de 6');
        await clic('[data-fk="cap-esencial"]');
        await pintado('retomar');
        check('«¿Sigues donde te quedaste?»', [await texto('#tour-t'), await texto('#tour-x')], ['¿Sigues donde te quedaste?', 'Ibas en el paso 3 de 6.']);
        await foto('C-retomar');
        await clic('[data-fk="tour-nuevo"]');
        await pintado('intro');
        check('«Empezar de nuevo»: desde la intro', await ev('P.modos.entrenamiento().caps["fijo:esencial"].paso'), 0);
        // En «Hazlo tú», Atrás vuelve a la explicación del mismo paso.
        await clic('[data-fk="tour-empezar"]');
        for (let i = 0; i < 2; i++) {
            await pintado('paso', i);
            await clic('[data-fk="tour-sig"]');
        }
        await pintado('paso', 2);
        await clic('[data-fk="tour-hazlo"]');
        await pintado('hazlo', 2);
        await clic('[data-fk="tour-atras"]');
        await pintado('paso', 2);
        check('Atrás desde «Hazlo tú»: la explicación del mismo paso', await texto('#tour-t'), 'Este botón + es para anotar');
        await clic('[data-fk="tour-hazlo"]');
        await pintado('hazlo', 2);
        await clic('[data-fk="tour-saltar-paso"]');
        await pintado('paso', 3);
        // v2.8 (C-8): Hoy enseña «Lo que viene» (ya no «tus próximos pagos»).
        check('«Saltar este paso»: al siguiente', await texto('#tour-t'), 'Esto es lo que viene');
        await clic('[data-fk="tour-salir"]');
        await esperar(300);
        // Retomar un capítulo de «Aprende más» (versión variable).
        await ev('P.modos.guardarEntrenamiento({ tourVersion: "variable" }); P.cargarPersona("rosa"); P.ayuda.abrir("aprendeMas"); true');
        await esperar(300);
        await clic('[data-fk="cap-proximoMes"]');
        await pintado('paso', 0);
        await clic('[data-fk="tour-sig"]');
        await pintado('paso', 1);
        await clic('[data-fk="tour-salir"]');
        await esperar(400);
        check('variable: Salir guarda el capítulo y los ejemplos vuelven', [await ev('P.modos.entrenamiento().caps["variable:proximoMes"]'), await ev('P.st.persona'), await ev('P.calc().libre')], (x) => x[0].paso === 1 && !x[0].hecho && x[1] === 'rosa' && x[2] === 8000);
        check('Hoy: «Sigue donde te quedaste» (el último)', await texto('section[aria-labelledby="tour-seguir-t"] .txt'), '«El próximo mes y la remesa» (ingresos que varían): vas en el paso 2 de 3.');
        await clic('[data-fk="tour-hoy-seguir"]');
        await pintado('paso', 1);
        check('variable: retoma en el paso 2', [await ev('P.tour.cap.id'), await texto('.tour-card .paso')], ['proximoMes', 'El próximo mes y la remesa · paso 2 de 3']);
        await clic('[data-fk="tour-salir"]');
        await esperar(300);
    }

    // ============================================================ D) «Aprende más»: cada capítulo, en las dos versiones
    if (partes.includes('d')) {
        for (const [version, ids] of [['fijo', ['proxima', 'ahorros', 'tarjetas', 'extras', 'volver']], ['variable', ['horizonte', 'proximoMes', 'ahorros', 'tarjetas', 'volver']]]) {
            actual = 'D ' + version;
            await fecha('2026-10-18');
            await limpio();
            await ev(`P.modos.guardarEntrenamiento({ tourVersion: ${js(version)} }); P.cargarPersona(${js(version === 'fijo' ? 'ana' : 'rosa')}); P.ayuda.abrir("aprendeMas"); true`);
            await esperar(300);
            check(`${version}: los capítulos de «Aprende más»`, await ev('[...document.querySelectorAll("[data-fk^=cap-]")].map((e) => e.dataset.fk)'), ['cap-esencial', ...ids.map((x) => 'cap-' + x)]);
            for (const id of ids) {
                await ev('P.ayuda.abrir("aprendeMas"); true');
                await esperar(250);
                await clic(`[data-fk="cap-${id}"]`);
                await recorrerCap(version, id, { quietud: 'corta' });
                await clic('[data-fk="tour-mas"]');
                await esperar(400);
                check(`${version} ${id}: al terminar, los ejemplos como al inicio`, [await ev('!!P.st.recorrido'), await ev('P.calc().libre')], [false, version === 'fijo' ? LIBRE_ANA : 8000]);
                check(`${version} ${id}: «Aprender más» vuelve a los capítulos con su marca`, [await ev('P.tour.activo'), await texto(`[data-fk="cap-${id}"] .cap-estado`)], [false, 'Hecho']);
            }
            check(`${version}: los 5 capítulos hechos`, await texto('#am-mas'), 'Aprende más · 5 de 5 hechos');
            await foto(`D-${version}-todos-hechos`);
            await ev('P.ayuda.cerrar({ foco: false }); true');
        }
    }

    // ============================================================ E) V2-59: respuestas 27, 28 y 29
    if (partes.includes('e')) {
        actual = 'E V2-59 #27';
        await fecha('2026-10-18');
        await limpio('persona=rosa');
        // v2.8 (C-8): cómo quedas la próxima quincena está en Mi plan, no en Hoy («gastos»: D-2).
        await ev(`P.irTab('pagos'); true`);
        check('#27 Mi plan: «Tus ventas cuentan cuando las anotas», sin «ingreso ~$0» ni rojo', [await texto('.proy-l'), await texto('.proy-s'), await ev('document.querySelector(".proy-l").classList.contains("proy-l--falta")'), await ev('/entra ~\\$0/.test(document.body.innerText)')], ['pagas ~$191 · tus ventas cuentan cuando las anotas', 'este mes llevas $316.00 en ventas', false, false]);
        await ev(`P.irTab('hoy'); true`);
        check('#27 el aviso del próximo mes tampoco dice «te faltarían»', await texto('.aviso-hoy'), (x) => x.includes('Del 1 nov al 30 nov pagas ~$191.') && x.includes('Tus ventas cuentan cuando las anotas.') && !x.includes('faltarían'));
        await foto('E-27-hoy');
        await clic('[data-fk="portada"]');
        check('#27 en «¿De dónde sale?»', await texto('.d-prox'), (x) => x.includes('Pagas ~$191 · tus ventas cuentan cuando las anotas') && x.includes('Este mes llevas $316.00 en ventas'));
        await ev('P.cerrarHoja(); true');
        await clic('[data-fk="at-sug-si"]');
        check('#27 en «¿Cuánto reservas?»', await texto('.hoja-c .txt'), 'El próximo mes pagas ~$191: el alquiler, la luz, el agua y más. Tus ventas cuentan cuando las anotas.');
        await ev('P.cerrarHoja(); true');
        await ev(`P.irTab('pagos'); true`);
        await clic('[data-fk="proyeccion"]');
        await esperar(250);
        check('#27 en Pagos → Próxima', await texto('.per-res'), (x) => x.includes('Pagas ~$191 · tus ventas cuentan cuando las anotas') && !x.includes('~$0'));
        // Con ingreso fijo, igual que antes.
        await abrirApp('persona=ana');
        await ev(`P.irTab('pagos'); true`);
        check('#27 con quincena, sin cambio (v2.8, D-4: con los $15 de BAC)', await texto('.proy-l'), 'ingreso ~$600 · gastos ~$70 · te quedarían ~$530');

        actual = 'E V2-59 #28';
        await abrirApp('persona=rosa');
        await clic('[data-fk="avatar"]');
        check('#28 Tu cuenta → «Cómo recibes tu dinero»', await texto('[data-fk="menu-calendar-clock"]'), 'Cómo recibes tu dinero Varía · ves tu libre hasta fin de mes');
        await clic('[data-fk="menu-calendar-clock"]');
        await esperar(250);
        check('#28 elige hasta cuándo', [await texto('#hoja-t'), await ev('[...document.querySelectorAll(".hoja [data-fk^=hz-]")].map((e) => e.textContent.trim())')], ['Cómo recibes tu dinero', ['Hasta fin de mes', 'Los próximos 15 días']]);
        await foto('E-28-como-te-entra');
        await clic('[data-fk="hz-quince"]');
        await clic('[data-fk="cte-listo"]');
        check('#28 el número cambia a 15 días', [await ev('P.st.horizonteVariable'), await texto('.portada-h')], ['quince', 'Próximos 15 días · hasta el 5 nov']);
        await abrirApp('persona=ana');
        await clic('[data-fk="avatar"]');
        await clic('[data-fk="menu-calendar-clock"]');
        await esperar(250);
        check('#28 con ingreso fijo abre su ingreso', await ev('[P.ui.stack.at(-1)?.tipo, P.ui.stack.at(-1)?.id]'), ['ingreso', 'quincena']);

        actual = 'E V2-59 #29';
        await limpio();
        await ev('P.modos.guardarEntrenamiento({ tourVersion: "variable" }); P.tour.empezarCap("variable", "ahorros"); true');
        await pintado('paso', 0);
        await clic('[data-fk="tour-sig"]');
        await pintado('paso', 1);
        await clic('[data-fk="tour-hazlo"]');
        await pintado('hazlo', 1);
        await clic('[data-fk="tour-saltar-paso"]');
        await pintado('paso', 2);
        check('#29 «¿Semana mala?» espera a que la abras', [await hay('[data-fk="tour-ejemplo"]'), await ev('P.st.registros.some((r) => r.ref === "semana-mala")')], [true, false]);
        await probarEjemplo('variable');
        // Salir con el ejemplo abierto también lo quita.
        await clic('[data-fk="tour-ejemplo"]');
        await pintado('paso', 2);
        await ev('P.acciones.tourSalir(); true');
        await esperar(300);
        check('#29 al salir no queda la semana mala', await ev('[P.st.registros.some((r) => r.ref === "semana-mala"), P.calc().libre]'), [false, 8000]);
    }

    // ============================================================ F) oferta de tarjetas, con tus datos
    if (partes.includes('f')) {
        actual = 'F oferta';
        await fecha('2026-10-18');
        await limpio();
        await clic('[data-fk="elegir-usar"]');
        await clic('[data-fk="intro-empezar"]');
        await clic('[data-fk="ob-empezar"]');
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', '600');
        await clic('[data-fk="ob-sig"]');
        await escribir('#ob-efectivo', '300');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-sig"]'); // v2.6.2 (V2-68): un paso más (deudas y tarjetas por separado)
        await clic('[data-fk="pn-listo"]');
        await ev('["hoy", "pagos", "midinero", "cuentas", "ahorros", "deudas", "mes", "anotar", "pago"].forEach((p) => P.modos.tipVisto(p)); P.render(); true');
        check('sin tarjeta, no hay oferta', await hay('[data-fk="oferta-hoy-si"]'), false);
        const tienes = await ev('P.calc().tienes');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        await clic('[data-fk="md-deuda"]');
        await clic('[data-fk="td-tarjeta"]');
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?»; «Otro» pide el nombre.
        await clic('[data-fk="op-banco-Otro"]');
        await escribir('#f-otroNombre', 'Visa Agrícola');
        await escribir('#f-corte', '21');
        await escribir('#f-pagoDia', '10');
        await clic('[data-fk="deuda-ok"]');
        // v2.6.6 (V2-85): su pago de octubre (el 10) ya pasó: al guardar pregunta; «Sí» espera el siguiente (10 nov).
        check('pregunta por el del 10 oct', await texto('#antes-t'), 'El de octubre (10 oct), ¿ya lo pagaste?');
        await clic('[data-fk="deuda-ok"]');
        await esperar(900);
        check('al guardar la primera tarjeta: la oferta, en el momento', await texto('#hoja-t'), '¿Quieres ver cómo funcionan las tarjetas? (1 min)');
        await foto('F-oferta');
        await clic('[data-fk="oferta-si"]');
        await pintado('paso', 0);
        check('«Ver ahora»: el capítulo de tarjetas, con datos de ejemplo', [await ev('P.modo'), await ev('P.tour.cap.id'), await ev('P.tour.cap.version'), await ev('P.st.persona')], ['entrenamiento', 'tarjetas', 'fijo', 'ana']);
        await recorrerCap('fijo', 'tarjetas', { fotos: false, error: false });
        check('al final: «Volver a mis datos»', await ev('[...document.querySelectorAll(".tour-card .btn")].map((e) => e.innerText.trim())'), ['Volver a mis datos', 'Aprender más']);
        await foto('F-volver-a-mis-datos');
        await clic('[data-fk="tour-volver-uso"]');
        await esperar(500);
        check('vuelve a tus datos sin perder nada', [await ev('P.modo'), await ev('P.st.tarjetas.map((t) => t.nombre)'), await ev('P.calc().tienes')], ['uso', ['Visa Agrícola'], tienes]);
        check('la oferta no se repite', [await ev('JSON.parse(localStorage.getItem("pamplanea-modo")).ofertaTarjetas'), await hay('[data-fk="oferta-hoy-si"]')], ['vista', false]);
        // La primera tarjeta del primer día: la oferta en Hoy (una vez).
        await ev('(() => { const p = JSON.parse(localStorage.getItem("pamplanea-modo")); delete p.ofertaTarjetas; localStorage.setItem("pamplanea-modo", JSON.stringify(p)); P.irTab("hoy"); })(); true');
        await esperar(300);
        check('tarjeta del primer día: la oferta en Hoy', await texto('#of-t'), '¿Quieres ver cómo funcionan las tarjetas? (1 min)');
        await foto('F-oferta-hoy');
        await clic('[data-fk="oferta-hoy-no"]');
        check('«Ahora no»: no vuelve', [await hay('#of-t'), await ev('JSON.parse(localStorage.getItem("pamplanea-modo")).ofertaTarjetas')], [false, 'no']);
    }

    // ============================================================ G) Practicar: cada ejercicio con su capítulo de antes
    if (partes.includes('g')) {
        actual = 'G practicar';
        await fecha('2026-10-18');
        await limpio();
        await ev('P.modos.guardarEntrenamiento({ tourVersion: "fijo", caps: { "fijo:esencial": { paso: 0, hecho: true } } }); P.ayuda.abrir("practica"); true');
        await esperar(300);
        const filas = await ev('[...document.querySelectorAll(".ay-caso--ej")].map((e) => [e.dataset.v, e.querySelector(".pr-antes")?.textContent.trim()])');
        check('16 ejercicios (V2-69 #37: sin los de Carlos), cada uno con el capítulo de antes', [filas.length, filas.filter((f) => !f[1]).length], [16, 0]);
        check('ejemplos: Lo esencial (hecho), Ahorros, Tarjetas', Object.fromEntries(filas), (x) => x.C05 === 'Antes: «Lo esencial» (hecho)' && x.C23 === 'Antes: «Ahorros»' && x.C16 === 'Antes: «Tarjetas y estado de cuenta»' && x['P-AGUINALDO'] === 'Antes: «Aguinaldo y adelanto»' && x.C19 === 'Antes: «Próxima quincena y pasar lo que sobra»');
        await foto('G-practicar-fijo');
        await ev('P.modos.guardarEntrenamiento({ tourVersion: "variable" }); P.ayuda.abrir("practica"); true');
        await esperar(300);
        const filasV = Object.fromEntries(await ev('[...document.querySelectorAll(".ay-caso--ej")].map((e) => [e.dataset.v, e.querySelector(".pr-antes")?.textContent.trim()])'));
        check('variable: sus capítulos', filasV, (x) => x['P-HORIZONTE'] === 'Antes: «¿Hasta cuándo ves tu libre?»' && x['P-REMESA'] === 'Antes: «El próximo mes y la remesa»' && x['P-SEMANA'] === 'Antes: «Ahorros y semanas malas»' && x.C05 === 'Antes: «Lo esencial»');
        // Los ejercicios siguen funcionando (uno de cada versión).
        await clic('[data-fk="pr-P-VENTA"]');
        await esperar(400);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'vendí 45');
        await clic('[data-fk="anotar-guardar"]');
        await esperar(400);
        check('P-VENTA: ¡Lo lograste!', await texto('.tarea-bar'), contiene('¡Lo lograste!'));
        await clic('[data-fk="pr-siguiente"]');
        await clic('[data-fk="pr-C05"]');
        await esperar(400);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'pupusas 6');
        await clic('[data-fk="anotar-guardar"]');
        await esperar(400);
        check('C05: ¡Lo lograste!', await texto('.tarea-bar'), contiene('¡Lo lograste!'));
        await ev('P.practica.salir(); true');
    }

    // ============================================================ H) «?» y «Aprende»: los mismos textos del entrenamiento
    if (partes.includes('h')) {
        actual = 'H ayuda';
        for (const persona of ['ana', 'rosa']) {
            await abrirApp('persona=' + persona);
            const variable = persona === 'rosa';
            const glos = await ev(`Object.fromEntries(window.GLOSARIO.map((g) => { const x = window.terminoGlosario(g.id, ${variable}); return [g.id, x.t + ': ' + x.para + ' Ejemplo: ' + x.ejemplo]; }))`);
            for (const [id, abrirJs] of [['libre', 'P.irTab("hoy")'], ['proxima', 'P.irTab("pagos")' /* v2.8 (C-8): la próxima quincena está en Mi plan */], ['pagasCon', `P.abrir("pago", ${js(persona === 'ana' ? 'colegio' : 'alquiler')})`], ['ahorros', 'P.irTab("midinero"); P.abrir("ahorros")'], ['deudas', 'P.irTab("midinero"); P.abrir("deudas")'], ['cuadrar', 'P.irTab("midinero"); P.abrir("cuentas"); P.abrirHoja("cuadrar")']]) {
                await ev(abrirJs + '; true');
                await esperar(250);
                if (!(await hay(`[data-fk="q-${id}"]`))) {
                    if (!(persona === 'rosa' && (id === 'deudas' || id === 'pagasCon'))) check(`${persona}: «?» de ${id}`, 'falta', 'ok');
                    await ev('P.ui.hoja && P.cerrarHoja(); true');
                    continue;
                }
                check(`${persona}: «?» de ${id}: 44 px`, await ev(`(() => { const r = document.querySelector('[data-fk="q-${id}"]').getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })()`), true);
                await clic(`[data-fk="q-${id}"]`);
                check(`${persona}: «?» de ${id}: el mismo texto del entrenamiento`, await texto(`#q-${id}`), glos[id]);
                if (variable) check(`${persona}: «?» de ${id} sin «quincena»`, /quincena/i.test(await texto(`#q-${id}`)), false);
                if (id === 'libre' || id === 'proxima') await foto(`H-${persona}-q-${id}`);
                await ev('P.ui.hoja && P.cerrarHoja(); true');
            }
            await ev('P.irTab("hoy"); P.abrir("aprende"); true');
            await esperar(250);
            const esperado = await ev(`window.GLOSARIO.filter((g) => !g.solo || g.solo === ${js(variable ? 'variable' : 'fijo')}).map((g) => { const x = window.terminoGlosario(g.id, ${variable}); return x.t + ': ' + x.para + 'Ejemplo: ' + x.ejemplo; })`);
            check(`${persona}: «Aprende» = el glosario del entrenamiento`, await ev('[...document.querySelectorAll(".glosario-i")].map((e) => e.querySelector("dt").textContent + ": " + e.querySelector("dd").textContent)'), esperado);
            if (variable) check('rosa: «Aprende» sin «quincena»', /quincena/i.test(await texto('#pantalla')), false);
            await foto(`H-${persona}-aprende`);
        }
        // Cada paso del entrenamiento que explica un término lo dice con el texto del glosario (comprobado en B y D).
        check('cada paso explicado lleva su término del glosario (o un texto propio de «Hazlo tú»)', await ev('Object.values(P.tour.VERSIONES).flatMap((v) => v.caps.flatMap((c) => c.pasos.filter((p) => !p.g && !p.hazlo && !p.para).map((p) => v.id + ":" + c.id + ":" + p.que)))'), (x) => x.length === 0);
    }

    // ============================================================ I) legibilidad de todo el entrenamiento
    if (partes.includes('i')) {
        actual = 'I legibilidad';
        await abrirApp('persona=ana');
        for (const v of ['fijo', 'variable']) {
            const textos = await ev(`[...P.tour.textos(${js(v)}), ...window.GLOSARIO.filter((g) => !g.solo || g.solo === ${js(v)}).flatMap((g) => { const x = window.terminoGlosario(g.id, ${v === 'variable'}); return [x.t, x.para, x.ejemplo]; })]`);
            check(`${v}: sin palabras prohibidas`, textos.filter((t) => prohibidas.some((p) => t.toLowerCase().includes(p))), []);
            const frases = textos.flatMap((t) => t.split(/(?<=[.!?:;])\s+(?=[¿¡«A-ZÁÉÍÓÚÑ$~])/));
            check(`${v}: frases de 20 palabras o menos`, frases.filter((f) => f.split(/\s+/).filter((w) => /[\p{L}\p{N}$]/u.test(w)).length > 20), []);
            if (v === 'variable') check('variable: nunca «quincena»', textos.filter((t) => /quincena/i.test(t)), []);
            informe.numeros[v] = await ev(`(() => { const V = P.tour.VERSIONES[${js(v)}]; return { esencial: V.caps[0].pasos.length, esencialHazlo: V.caps[0].pasos.filter((p) => p.hazlo).length, capitulos: V.caps.length - 1, pasosCapitulos: V.caps.slice(1).map((c) => c.pasos.length) }; })()`);
            check(`${v}: «Lo esencial» de 5–6 pasos y capítulos de 2–4`, informe.numeros[v], (x) => x.esencial >= 5 && x.esencial <= 6 && x.pasosCapitulos.every((p) => p >= 2 && p <= 4));
        }
        const tips = await ev('Object.values(window.TIPS)');
        check('consejos: sin palabras prohibidas', tips.filter((t) => prohibidas.some((p) => t.toLowerCase().includes(p))), []);
    }

    // ============================================================ J) reducir movimiento, calma y 44 px
    if (partes.includes('j')) {
        actual = 'J movimiento';
        await fecha('2026-10-18');
        await limpio();
        await clic('[data-fk="elegir-aprender"]');
        await pintado('elegir');
        check('la pregunta: opciones de 44 px o más', await ev('[...document.querySelectorAll(".tour-card button")].every((e) => e.getBoundingClientRect().height >= 44)'), true);
        await clic('[data-fk="tour-version-fijo"]');
        await pintado('intro');
        await clic('[data-fk="tour-empezar"]');
        await pintado('paso', 0);
        // Sin «reducir movimiento»: el resaltado entra despacio (≥ 400 ms), late 2 veces y se queda; la tarjeta, después.
        const anim = await ev(`(() => { const f = getComputedStyle(document.querySelector('.tour-foco')); const a = getComputedStyle(document.querySelector('.tour-foco'), '::after'); const c = getComputedStyle(document.querySelector('.tour-card')); const ms = (s) => s.split(',').map((x) => parseFloat(x) * (x.includes('ms') ? 1 : 1000)); return { entra: ms(f.animationDuration)[0], latidos: a.animationIterationCount, tarjetaDespues: ms(c.animationDelay)[0], foco: f.animationName }; })()`);
        check('el resaltado entra en ≥ 400 ms, late 2 veces; la tarjeta aparece después', anim, (x) => x.entra >= 400 && x.latidos === '2' && x.tarjetaDespues >= x.entra && x.foco === 'tour-aparece');
        await clic('[data-fk="tour-sig"]');
        await pintado('paso', 1);
        await clic('[data-fk="tour-sig"]');
        await pintado('paso', 2);
        await clic('[data-fk="tour-hazlo"]');
        await pintado('hazlo', 2);
        check('barra «Hazlo tú»: botones de 44 px', await ev('[...document.querySelectorAll(".tour-hz button:not(.link)")].every((e) => e.getBoundingClientRect().height >= 44)'), true);
        check('la flecha baja 2 veces y se queda; el anillo late 2 veces', await ev('[getComputedStyle(document.querySelector(".tour-flecha")).animationIterationCount, getComputedStyle(document.querySelector(".tour-senal"), "::after").animationIterationCount]'), (x) => x[0].includes('2') && !x[0].includes('infinite') && x[1] === '2');
        await b.movimientoReducido(true);
        await clic('[data-fk="tour-atras"]');
        await pintado('paso', 2);
        check('con «reducir movimiento»: nada se mueve (resaltado, tarjeta)', await ev('[getComputedStyle(document.querySelector(".tour-foco")).animationName, getComputedStyle(document.querySelector(".tour-card")).animationName, getComputedStyle(document.querySelector(".tour-foco"), "::after").animationName]'), ['none', 'none', 'none']);
        await clic('[data-fk="tour-hazlo"]');
        await pintado('hazlo', 2);
        check('con «reducir movimiento»: la flecha y el anillo quietos', await ev('[getComputedStyle(document.querySelector(".tour-flecha")).animationName, getComputedStyle(document.querySelector(".tour-senal"), "::after").animationName, getComputedStyle(document.querySelector(".tour-hz")).animationName]'), ['none', 'none', 'none']);
        await foto('J-reducir-movimiento');
        await b.movimientoReducido(false);
        // Escape: en «Hazlo tú» no sale (la app manda); en una explicación, sale y guarda.
        await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
        await esperar(200);
        check('Escape en «Hazlo tú» no sale', await ev('P.tour.activo'), true);
        await clic('[data-fk="tour-atras"]');
        await pintado('paso', 2);
        await ev("document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
        await esperar(300);
        check('Escape en una explicación sale y guarda dónde iba', [await ev('P.tour.activo'), await ev('P.modos.entrenamiento().caps["fijo:esencial"].paso')], [false, 2]);
    }
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}

// ============================================================ K) contraste (WCAG) de lo nuevo en los 4 temas
const medir = (pares) => `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const fondo = (el) => { const capas = []; for (let e = el; e; e = e.parentElement) { const v = rgba(getComputedStyle(e).backgroundColor); if (v[3] > 0) { capas.push(v); if (v[3] >= 0.999) break; } } let base = [255,255,255]; for (const v of capas.reverse()) base = base.map((x, i) => x * (1 - v[3]) + v[i] * v[3]); return base; };
  const lum = (c) => { const [r,g,bb] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126*r + 0.7152*g + 0.0722*bb; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const out = {};
  for (const [n, sel] of ${JSON.stringify(pares)}) { const el = document.querySelector(sel); if (!el) { out[n] = 'falta'; continue; } out[n] = Math.round(ratio(rgba(getComputedStyle(el).color).slice(0,3), fondo(el)) * 100) / 100; }
  return out;
})()`;
if (partes.includes('k')) {
    try {
        actual = 'K contraste';
        informe.contraste = {};
        await b.movimientoReducido(true);
        for (const t of ['serena-claro', 'serena-oscuro', 'ancla-claro', 'ancla-oscuro']) {
            await b.ir('about:blank');
            await b.ir(base + 'telefono.html#tema=' + t);
            await ev('P.sinGuardar = true; localStorage.clear(); true');
            await b.ir('about:blank');
            await b.ir(base + 'telefono.html#tema=' + t);
            await esperar(350);
            const r = {};
            await ev('P.ayuda.cerrar({ foco: false }); P.tour.empezar({ version: "fijo" }); true');
            await pintado('intro');
            Object.assign(r, await ev(medir([['intro: paso', '.tour-card .paso'], ['intro: título', '.tour-t'], ['intro: texto', '.tour-card .tour-para'], ['Cambiar de versión', '.tour-cab .link']])));
            await ev('P.acciones.tourEmpezarCap(); true');
            await pintado('paso', 0);
            Object.assign(r, await ev(medir([['paso: indicador', '.tour-card .paso'], ['paso: para qué', '.tour-card .tour-para'], ['ejemplo: etiqueta', '.tour-ej-l'], ['ejemplo: texto', '.tour-ej-x'], ['Salir', '[data-fk="tour-salir"]']])));
            await ev('P.acciones.tourSig(); P.acciones.tourSig(); true');
            await pintado('paso', 2);
            await ev('P.acciones.tourHazlo(); true');
            await pintado('hazlo', 2);
            await ev('P.tour.pista = true; document.querySelector(".tour-hueco .tour-dim").click(); true');
            await esperar(150);
            Object.assign(r, await ev(medir([['barra: paso', '.tour-hz-n'], ['barra: instrucción', '#tour-instr'], ['barra: pista', '#tour-pista'], ['barra: Salir', '.tour-hz .link'], ['barra: Saltar este paso', '.tour-saltar-paso']])));
            for (const p of ['tocar', 'escribir', 'tocar']) {
                await ev('P.acciones.tourPorMi(); true');
                await esperar(400);
                void p;
            }
            await pintado('pausa', 2);
            Object.assign(r, await ev(medir([['pausa: fila', '.tour-num span'], ['pausa: número', '.tour-num strong'], ['pausa: porqué', '.tour-porque']])));
            await ev('P.acciones.tourSalir(); P.ayuda.abrir("aprendeMas"); true');
            await esperar(300);
            Object.assign(r, await ev(medir([['Aprende más: estado', '.cap-estado'], ['Aprende más: versión', '.ay-version-elegida .fila-s']])));
            await ev('P.ayuda.abrir("practica"); true');
            await esperar(300);
            Object.assign(r, await ev(medir([['Practicar: capítulo de antes', '.pr-antes']])));
            await ev('P.ayuda.cerrar({ foco: false }); P.abrir("aprende"); true');
            await esperar(250);
            Object.assign(r, await ev(medir([['glosario: ejemplo', '.glosario-ej'], ['glosario: texto', '.glosario dd']])));
            await ev('P.cargarPersona("rosa"); P.irTab("pagos"); true');
            await esperar(250);
            Object.assign(r, await ev(medir([['próximo mes (vende)', '.proy-l'], ['ventas del mes', '.proy-s']])));
            informe.contraste[t] = r;
        }
        await b.movimientoReducido(false);
        const valores = Object.values(informe.contraste).flatMap((x) => Object.values(x)).filter((x) => typeof x === 'number');
        informe.numeros.contrasteMinimo = Math.min(...valores);
        check('contraste ≥ 4.5:1 en los 4 temas', Object.entries(informe.contraste).flatMap(([t, x]) => Object.entries(x).filter(([, v]) => typeof v !== 'number' || v < 4.5).map(([k, v]) => `${t} ${k} ${v}`)), []);
    } catch (e) {
        informe.fallos.push(actual + ': ' + e.message);
    }
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, numeros: informe.numeros }, null, 1));
b.cerrar();
