// PRUEBAS v2.4.1. Parte 1: V2-56 (tipo de ingreso, «Adelanto» con su descuento en el mismo formulario y en
// Anotar), V2-57 (cambiar el día de corte o de pago de una tarjeta), V2-58 (cuarta pregunta, los ejemplos vuelven
// al inicio, «Muéstrame» en dos toques y los consejos de Anotar y de la ficha de un pago).
// Parte 2: «Practicar» con los ejercicios de Rosa. v2.5: el entrenamiento nuevo se prueba en v25.mjs.
// Uso: node herramientas/v241.mjs [--base=http://…/] [--tema=serena-claro] [--partes=p1,p2]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const partes = (args.partes || 'p1,p2').split(',');
const salida = path.join(root, 'capturas', 'v241' + (args.base ? '-servida' : ''), tema);
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9901) });
await b.tamano(390, 844);
const informe = { base, tema, fallos: [], numeros: {}, errores: b.errores, fallidas: b.fallidas };
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
let actual = '';
let n = 0;
const foto = async (nombre) => {
    await esperar(200);
    await b.captura(path.join(salida, `${String(++n).padStart(2, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(130);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(110);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.textContent.replace(/\\s+/g, ' ').trim() ?? null`);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 300)}»`);
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
const calc = (expr) => ev(`(() => { const M = window.MOTOR; const k = P.calc(); return ${expr}; })()`);
/** Uso normal con una quincena del 14 y del 29 (como la de Victor), $120 en efectivo. */
async function usoQuincena(fechaIso = '2026-10-18') {
    await fecha(fechaIso);
    await limpio();
    await clic('[data-fk="elegir-usar"]');
    await clic('[data-fk="intro-empezar"]');
    await clic('[data-fk="ob-empezar"]');
    await clic('[data-fk="ob-i-quincena"]');
    await escribir('#ob-q-monto', '597');
    await clic('[data-fk="ob-q-dias-otros"]');
    await escribir('#ob-q-d1', '14');
    await escribir('#ob-q-d2', '29');
    await clic('[data-fk="ob-q-lugar-efectivo"]');
    await clic('[data-fk="ob-sig"]');
    await escribir('#ob-efectivo', '120');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]'); // v2.6.2 (V2-68): un paso más (deudas y tarjetas por separado)
    await clic('[data-fk="pn-listo"]');
    // Los consejos de la primera vez: se dejan vistos (se prueban aparte).
    await ev('["hoy", "pagos", "midinero", "cuentas", "ahorros", "deudas", "mes", "anotar", "pago"].forEach((p) => P.modos.tipVisto(p)); P.render(); true');
}
const tour = () => ev(`(() => ({ i: P.tour.i, activo: P.tour.activo, hz: !!document.querySelector('.tour-hz'), t: document.getElementById('tour-t')?.textContent.replace(/\\s+/g, ' ').trim(), paso: document.querySelector('.tour-card .paso, .tour-hz-n')?.textContent.replace(/\\s+/g, ' ').trim(), version: P.tour.version }))()`);
const siguiente = async () => {
    await clic('[data-fk="tour-sig"]');
    await esperar(380);
};

try {
    if (partes.includes('p1')) {
        // ============================================================ V2-56: el tipo de ingreso
        actual = 'V2-56 formulario';
        await usoQuincena();
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="nuevo-ingreso"]');
        check('empieza con «¿Qué es?»', await ev('[...document.querySelectorAll("[data-fk^=op-tipoIng-]")].map((e) => e.textContent.trim())'), ['Salario', 'Adelanto', 'Remesa', 'Aguinaldo', 'Quincena 25', 'Bono o comisión', 'Venta', 'Otro']);
        check('«¿Qué es?» va primero', await ev('document.querySelector(".hoja-c .campo-l")?.textContent'), '¿Qué es?');
        await foto('ingreso-que-es');
        const sugiere = {};
        for (const t of ['salario', 'remesa', 'aguinaldo', 'q25', 'bono', 'venta', 'adelanto']) {
            await clic(`[data-fk="op-tipoIng-${t}"]`);
            sugiere[t] = await ev('[P.ui.hoja.nombre, P.ui.hoja.frecuencia, P.ui.hoja.frecuencia === "quincenal" ? P.ui.hoja.d1 + "/" + P.ui.hoja.d2 : P.ui.hoja.fecha || ""]');
        }
        check('cada tipo trae su frecuencia', sugiere, { salario: ['Salario', 'quincenal', '14/29'], remesa: ['Remesa', 'mensual', ''], aguinaldo: ['Aguinaldo', 'unico', '2026-12-12'], q25: ['Quincena 25', 'unico', '2027-01-25'], bono: ['Bono', 'unico', ''], venta: ['Venta', 'unico', ''], adelanto: ['Adelanto de salario', 'unico', ''] });
        await escribir('#f-monto', '314');
        await ev('P.ui.hoja.fecha = "2026-10-29"; P.render(); true');
        await esperar(150);
        check('«Adelanto»: ¿de qué quincena? (aquí mismo)', [await texto('#l-ad'), await ev('[...document.querySelectorAll("[data-fk^=ad-]")].map((e) => e.dataset.fk)')], ['¿De qué quincena te lo descuentan?', ['ad-2026-11-14', 'ad-2026-11-29', 'ad-2026-12-14', 'ad-2026-12-29']]);
        check('por defecto: la primera, todo el adelanto', await ev('[Object.keys(P.ui.hoja.adPartes), document.getElementById("f-ad-2026-11-14").value]'), [['quincena|2026-11-14'], '314.00']);
        await ev('document.getElementById("l-ad").scrollIntoView({ block: "start" }); true');
        await foto('ingreso-adelanto');
        check('sin «¿Cada cuánto?»: un adelanto es una vez', await hay('#l-frecuencia'), false);
        await clic('[data-fk="hoja-ok"]');
        const g1 = await calc('(() => { const a = P.st.ingresos.find((i) => i.tipoIngreso === "adelanto"); const q = M.ocurrenciasIngreso(P.st, P.st.ingresos.find((i) => i.principal), "2026-11-14", "2026-11-14")[0]; return { desc: a.adelanto.descuentos, q14: q.monto }; })()');
        check('se guarda con su descuento', g1, { desc: [{ ingreso: 'quincena', fecha: '2026-11-14', monto: 31400 }], q14: 59700 - 31400 });
        // Al editar un ingreso que ya existía (como el «Adelanto de Salario» de Victor, sin tipo).
        actual = 'V2-56 editar';
        await ev('P.cambiar((s) => { s.ingresos.push({ id: "viejo", nombre: "Adelanto de Salario", emoji: "💵", categoria: "otro", monto: 31400, aprox: true, frecuencia: "unico", fecha: "2026-10-29", lugar: "efectivo", principal: false, extra: true, desde: s.hoy, llegadas: {} }); }); true');
        await ev('P.abrir("ingreso", "viejo"); true');
        await esperar(200);
        await clic('[data-fk="editar-ingreso"]');
        check('al editar, «¿Qué es?» reconoce el adelanto', await ev('P.ui.hoja.tipoIng'), 'adelanto');
        check('y pregunta de qué quincena', await texto('#l-ad'), '¿De qué quincena te lo descuentan?');
        await clic('[data-fk="ad-2026-11-29"]');
        await clic('[data-fk="ad-2026-11-14"]');
        await clic('[data-fk="hoja-ok"]');
        check('editar: se marca y guarda', await ev('(() => { const i = P.st.ingresos.find((x) => x.id === "viejo"); return [i.tipoIngreso, i.adelanto.descuentos.map((d) => d.fecha + ":" + d.monto)]; })()'), ['adelanto', ['2026-11-29:31400']]);
        // Anotar: «me dieron adelanto 100» (hoy) y «adelanto 150 el 28» (fecha futura).
        actual = 'V2-56 anotar';
        await clic('[data-fk="nav-hoy"]');
        const tienes0 = await calc('k.tienes');
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'me dieron adelanto 100');
        // v2.6.5 (V2-81): ya esperas dos adelantos el 29: pregunta si es uno de ellos; este es otro (nuevo).
        check('entiende el adelanto de hoy y pregunta si es el que esperabas', await ev('[P.ui.hoja.d.tipo, P.ui.hoja.d.adelanto, !!P.ui.hoja.d.ingresoRef, document.getElementById("l-cualIngreso")?.textContent]'), (x) => x[0] === 'ingreso' && x[1] === true && x[2] === true && /¿Es tu adelanto de salario del 29\?/i.test(String(x[3])));
        await clic('[data-fk="cual-extra"]');
        check('«No, es otro ingreso»: un adelanto nuevo', await ev('[P.ui.hoja.d.tipo, P.ui.hoja.d.adelanto, P.ui.hoja.d.nombre]'), ['ingreso', true, 'Adelanto de salario']);
        await foto('anotar-adelanto');
        // v2.7 (P-3): llega a una cuenta que contó hoy: pregunta si fue antes o después de contar; «Después» (suma hoy).
        // v2.8 (pendiente 4): si es el cuadre de su Primer día, ya cuenta como «Después» (sin pregunta).
        await ev(`document.querySelector('[data-fk="orden-despues"]')?.click(); true`);
        await esperar(150);
        await clic('[data-fk="anotar-guardar"]');
        await esperar(300);
        check('suma hoy y pregunta de qué quincena', [await calc('k.tienes') - tienes0, await texto('#hoja-t')], [10000, '¿De qué quincena te lo descuentan?']);
        await clic('[data-fk="ad-ok"]');
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'adelanto 150 el 28');
        check('«el 28»: ingreso esperado tipo Adelanto', [await ev('[P.ui.hoja.d.tipo, P.ui.hoja.d.fecha]'), await texto('#anotar-preg')], (x) => x[0][0] === 'ingreso' && x[0][1] === '2026-10-28' && x[1].includes('lo pongo como ingreso esperado') && x[1].includes('de qué quincena te lo descuentan'));
        await clic('[data-fk="anotar-guardar"]');
        await esperar(300);
        check('no toca lo que tienes y queda esperado', await calc('(() => { const i = P.st.ingresos.find((x) => x.fecha === "2026-10-28"); return [k.tienes, i.tipoIngreso, i.frecuencia, Object.keys(i.llegadas).length]; })()'), [tienes0 + 10000, 'adelanto', 'unico', 0]);
        await ev('P.cerrarHoja(); true');

        // ============================================================ V2-57: el día de corte
        actual = 'V2-57';
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
        const tid = await ev('P.st.tarjetas.find((t) => t.nombre === "Visa Agrícola").id');
        const estadoT = () => calc(`(() => { const t = M.tarjeta(P.st, ${js(tid)}); const i = M.tarjetaInfo(P.st, t); return { corte: i.pendiente && i.pendiente.corte, vence: i.pendiente && i.pendiente.vence, pagos: M.ocurrenciasTarjeta(P.st, "2026-09-01", "2026-12-31").filter((o) => o.tarjeta.id === t.id).map((o) => o.fecha), aviso: k.avisos.some((a) => a.tipo === "estado") }; })()`);
        check('corte 21: corta el 21, paga el 10 nov', await estadoT(), { corte: '2026-10-21', vence: '2026-11-10', pagos: ['2026-11-10'], aviso: false });
        check('Deudas: «corta el 21»', await texto(`[data-fk="t-${tid}"]`), contiene('corta el 21'));
        await clic(`[data-fk="t-${tid}"]`);
        await clic('[data-fk="editar-tarjeta"]');
        await escribir('#f-corte', '5');
        await clic('[data-fk="deuda-ok"]');
        await esperar(200);
        // v2.8 (D-5, F09): el pago sigue el 10 nov (ya pagaste el del 10 oct); con corte el 5, ese pago es del corte del 5 nov
        // (corte y pago el mismo mes), ya no «el corte más un mes».
        check('corte 5: el pago sigue el 10 nov (del corte del 5 nov)', await estadoT(), { corte: '2026-11-05', vence: '2026-11-10', pagos: ['2026-11-10'], aviso: false });
        check('la ficha lo dice', [await texto('#pantalla header, #pantalla .pg-head'), await texto('#pantalla .nota--info')], (x) => x[0].includes('Corte el 5 · pago el 10') && x[1].includes('Corta el 5 de noviembre'));
        await foto('tarjeta-corte-5');
        await clic('[data-fk="editar-tarjeta"]');
        await escribir('#f-pagoDia', '20');
        await clic('[data-fk="deuda-ok"]');
        await esperar(200);
        // v2.8 (D-5, F09): «¿Qué día vence tu próximo pago?» el 20: el 20 de este mes (antes, el corte más un mes: 20 nov).
        check('pago 20: su próximo pago, el 20 oct', await estadoT(), { corte: '2026-10-05', vence: '2026-10-20', pagos: ['2026-10-20'], aviso: false });
        // Un estado de cuenta ya anotado no se modifica.
        await abrirApp('persona=ana');
        const antesBac = await ev('JSON.stringify(P.st.tarjetas.find((t) => t.id === "bac").estados)');
        await ev('P.abrir("tarjeta", "bac"); true');
        await esperar(200);
        await clic('[data-fk="editar-tarjeta"]');
        await escribir('#f-corte', '20');
        await clic('[data-fk="deuda-ok"]');
        await esperar(200);
        check('estado ya anotado: no se toca', await ev('JSON.stringify(P.st.tarjetas.find((t) => t.id === "bac").estados)'), antesBac);
        check('el próximo corte usa el día nuevo', await calc('M.tarjetaInfo(P.st, M.tarjeta(P.st, "bac")).proxCorte'), '2026-11-20');

        // V2-58 #21–#23 (preguntas, ejemplos al inicio, «Muéstrame»): el entrenamiento cambió en la v2.5; se prueba en v25.mjs.

        // ============================================================ V2-58: consejos en Anotar y en la ficha de un pago
        actual = 'V2-58 consejos';
        await usoQuincena();
        await ev('P.modos.guardarPref ? 0 : 0; (() => { const p = JSON.parse(localStorage.getItem("pamplanea-modo") || "{}"); delete (p.tips || {}).anotar; delete (p.tips || {}).pago; localStorage.setItem("pamplanea-modo", JSON.stringify(p)); })(); true');
        await clic('[data-fk="nav-anotar"]');
        check('Anotar: su consejo la primera vez', await texto('.hoja .tip p'), 'Escribe como hablas: «pupusas 6» o «vendí 45». Si algo no es, tócalo y lo cambias.');
        await foto('consejo-anotar');
        await clic('[data-fk="tip-anotar"]');
        check('«Entendido» lo quita y el foco sigue en la hoja', [await hay('.hoja .tip'), await ev('document.activeElement.id')], [false, 'hoja-t']);
        await ev('P.cerrarHoja(); P.cambiar((s) => { P.crearPago(s, { nombre: "Luz", emoji: "💡", categoria: "servicios", monto: 3000, frecuencia: "mensual", dia: 30, medio: "efectivo" }); }); true');
        const pid = await ev('P.st.pagos.find((p) => p.nombre === "Luz").id');
        await ev(`P.abrir("pago", ${js(pid)}); true`);
        await esperar(200);
        // v2.8 (C-4): «Ya lo pagué» lo vuelve gasto.
        check('ficha de un pago: su consejo', await texto('.tip p'), 'Aquí ves cuándo vence y de qué dinero sale. Cuando lo pagues, toca «Ya lo pagué».');
        await clic('[data-fk="tip-pago"]');
        await ev(`P.irTab("hoy"); P.abrir("pago", ${js(pid)}); true`);
        await esperar(200);
        check('una sola vez', await hay('.tip'), false);
    }
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}

// ================================================================================== PARTE 2: dos versiones
const TECLEADOS = ['pupusas 6', 'vendí 45', 'queso 12'];
const revision = { fijo: [], variable: [] };
/** Cuántas líneas ocupa un texto en pantalla (alto ÷ alto de línea). */
const lineas = (sel) => ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return null; const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4; return Math.round((el.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / lh); })()`);
/** Las palabras entre «» que no se ven en la pantalla (sin contar lo que la persona escribe). */
const citasQueNoSeVen = (texto) => ev(`(() => { const vis = document.body.innerText; return [...${js(texto)}.matchAll(/«([^»]+)»/g)].map((m) => m[1]).filter((q) => !${js(TECLEADOS)}.includes(q) && !vis.includes(q)); })()`);
/** El resaltado: sobre el elemento correcto, a la vista en 390×844 y sin que la tarjeta tape lo que explica. */
const resaltado = () => ev(`(() => {
    const T = P.tour; const paso = T.PASOS[T.i];
    if (!paso.sel) return { sin: true };
    const el = typeof paso.sel === 'function' ? paso.sel() : document.querySelector(paso.sel);
    const foco = document.querySelector('.tour-foco'); const card = document.querySelector('.tour-card');
    if (!el || !foco) return { falta: !el ? 'elemento' : 'foco' };
    const r = el.getBoundingClientRect(), f = foco.getBoundingClientRect(), c = card.getBoundingClientRect();
    const t = 10;
    const dentro = f.left <= r.left + t && f.top <= r.top + t && f.right >= r.right - t && f.bottom >= r.bottom - t;
    const clave = el.classList.contains('hoja') ? el.querySelector('.desglose') || el : el;
    const k = clave.getBoundingClientRect();
    // En una hoja (más alta que la pantalla) cuenta que se vea lo que explica.
    const visible = k.top >= -1 && k.bottom <= innerHeight + 1;
    return { dentro, visible, tapa: !(c.bottom <= k.top + 1 || c.top >= k.bottom - 1) };
})()`);
/** Revisa el paso explicado que está a la vista y lo anota para la tabla de LEEME. */
async function revisarPaso(version, nombre) {
    const s = await tour();
    const x = await texto('#tour-x');
    const fallas = [];
    const l = await lineas('#tour-x');
    if (l > 2) fallas.push(`${l} líneas`);
    const faltan = await citasQueNoSeVen(x);
    if (faltan.length) fallas.push('no se ve: ' + faltan.join(', '));
    const r = await resaltado();
    if (r.falta) fallas.push('falta ' + r.falta);
    else if (!r.sin) {
        if (!r.dentro) fallas.push('el marco no rodea lo que explica');
        if (!r.visible) fallas.push('lo resaltado no se ve completo');
        if (r.tapa) fallas.push('la tarjeta tapa lo que explica');
    }
    if (version === 'variable' && (await ev('/quincena/i.test(document.body.innerText)'))) fallas.push('dice «quincena»');
    check(`${version} paso ${s.i + 1} (${s.t})`, fallas, []);
    revision[version].push({ paso: s.i + 1, titulo: s.t, texto: x, lineas: l, resaltado: r.sin ? '—' : 'ok' });
    await foto(`${version}-${String(s.i + 1).padStart(2, '0')}-${nombre}`);
}
/** «Hazlo tú»: la instrucción en 2 líneas o menos y lo que nombra se ve en la pantalla. */
async function revisarHazlo(version) {
    const s = await tour();
    const x = await texto('#tour-x');
    const l = await lineas('#tour-t');
    const faltan = await citasQueNoSeVen(x);
    check(`${version} paso ${s.i + 1}: «Hazlo tú» en ≤ 2 líneas y lo que nombra se ve`, [l <= 2, faltan], [true, []]);
    if (version === 'variable') check(`${version} paso ${s.i + 1}: sin «quincena»`, await ev('/quincena/i.test(document.body.innerText)'), false);
    revision[version].push({ paso: s.i + 1, titulo: await ev('P.tour.PASOS[P.tour.i].titulo'), texto: x, lineas: l, resaltado: 'señal' });
}
/** «Muéstrame» en dos toques: primero señala (sobre lo correcto, con lo que nombra a la vista); luego lo hace. */
async function muestrameDosToques(version, nombre) {
    await clic('[data-fk="tour-muestrame"]');
    await esperar(250);
    const s = await ev(`(() => { const T = P.tour; const sn = T.PASOS[T.i].senal(); const el = document.querySelector(sn.sel); const m = document.querySelector('.tour-senal'); if (!el || !m) return { falta: true }; const a = el.getBoundingClientRect(); const b = m.getBoundingClientRect(); return { texto: document.getElementById('tour-senal-t')?.textContent, centro: Math.abs((a.left + a.width / 2) - (b.left + b.width / 2)) < 3 && Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) < 3, boton: document.querySelector('[data-fk="tour-muestrame"]').textContent.trim() }; })()`);
    check(`${version} ${nombre}: el primer toque señala`, [s.centro, s.boton, (await citasQueNoSeVen(s.texto || '')).length], [true, 'Hazlo por mí', 0]);
    await foto(`${version}-${nombre}-senal`);
    const antes = await ev('P.calc().libre');
    await clic('[data-fk="tour-muestrame"]');
    for (let i = 0; i < 40 && (await ev('!P.tour.hecho')); i++) await esperar(200);
    await esperar(700);
    return antes;
}
/** La celebración: lo que dice cuadra con el motor (antes → después). */
async function revisarCelebracion(version, nombre, antes, quiere) {
    const d = await ev('P.calc().libre');
    const num = await texto('.tour-num');
    const x = await texto('#tour-x');
    check(`${version} ${nombre}: celebra y los números cuadran con el motor`, [await texto('#tour-t'), num === null ? null : num.replace(/\s/g, ''), x], (v) => v[0] === '¡Lo hiciste!' && (antes === d ? v[1] === null : v[1] === `Libre$${(antes / 100).toFixed(2)}$${(d / 100).toFixed(2)}`) && quiere(x, antes, d));
    revision[version].push({ paso: (await tour()).i + 1, titulo: '¡Lo hiciste!', texto: x, lineas: await lineas('#tour-x'), resaltado: '—' });
    await foto(`${version}-${nombre}-hecho`);
}
const dineroTxt = (c) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Los ~$ de un texto dinámico se ven tal cual en la pantalla (los del motor). */
const montosQueNoSeVen = (texto, sel) => ev(`(() => { const vis = document.querySelector(${js(sel)})?.innerText || ''; return (${js(texto)}.match(/~\\$\\d+(?:,\\d{3})*(?:\\.\\d{2})?/g) || []).filter((m) => !vis.includes(m)); })()`);
async function quiz(version, mal) {
    await clic('[data-fk="tour-quiz"]');
    const n = await ev('P.tour.PREGUNTAS.length');
    for (let q = 0; q < n; q++) {
        const bien = await ev(`P.tour.PREGUNTAS[${q}].bien`);
        await clic(`[data-fk="tour-op-${q === mal ? (bien + 1) % 3 : bien}"]`);
        const fb = await texto('.tour-fb');
        check(`${version} pregunta ${q + 1}: ${q === mal ? '«Casi», nunca «incorrecto»' : 'bien'}`, fb, (x) => (q === mal ? x.startsWith('Casi:') && !/incorrect/i.test(x) : !x.startsWith('Casi')));
        if (q === mal) await foto(`${version}-quiz-casi`);
        await clic('[data-fk="tour-quiz"]');
    }
}

try {
    if (partes.includes('p2')) {
        // v2.5: el entrenamiento en dos versiones (A, B, C, E) se prueba en v25.mjs («Lo esencial» y «Aprende más»).
        actual = 'D preparar';
        await fecha('2026-10-18');
        await limpio();
        await ev('P.modos.guardarEntrenamiento({ tourVersion: "variable" }); true');

        // ============================================================ D) Practicar: primero los de tu versión
        actual = 'D practicar';
        await ev('P.cargarPersona("rosa"); P.ayuda.abrir("practica"); true');
        await esperar(300);
        const listas = await ev('[...document.querySelectorAll("#ay .ay-casos, .ay-casos")].map((ul) => [...ul.querySelectorAll(".ay-caso--ej")].map((e) => [e.dataset.v, [...e.querySelectorAll(".nivel")].map((n) => n.textContent).join("/")]))');
        check('variable: primero los suyos (con su versión marcada)', [await ev('[...document.querySelectorAll("h3.campo-l")].map((h) => h.textContent)'), listas[0]], [['Para ti: ingresos que varían', 'De fecha fija'], [['C05', 'Fácil/Para todos'], ['P-VENTA', 'Fácil/Varía'], ['C11', 'Fácil/Para todos'], ['P-HORIZONTE', 'Fácil/Varía'], ['C23', 'Fácil/Para todos'], ['P-REMESA', 'Fácil/Varía'], ['P-RESERVAR', 'Media/Varía'], ['P-SEMANA', 'Difícil/Varía'], ['C16', 'Difícil/Para todos'], ['C31', 'Difícil/Para todos'], ['C30', 'Difícil/Para todos']]]);
        check('y después los de fecha fija (V2-69 #37: sin los de Carlos)', listas[1].map((x) => x[0]), ['C19', 'C26', 'C01', 'P-AGUINALDO', 'P-ADELANTO']);
        await foto('D-practicar-variable');
        const logrado = async (id) => {
            for (let i = 0; i < 10 && !(await ev('P.practica.logrado')); i++) await esperar(150);
            check(`ejercicio ${id}: ¡Lo lograste!`, await texto('.tarea-bar'), contiene('¡Lo lograste!'));
        };
        await clic('[data-fk="pr-P-VENTA"]');
        await esperar(400);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'vendí 45');
        await clic('[data-fk="anotar-guardar"]');
        await logrado('P-VENTA');
        check('P-VENTA: libre $125.00', await ev('P.calc().libre'), 12500);
        await clic('[data-fk="pr-siguiente"]');
        await clic('[data-fk="pr-P-REMESA"]');
        await esperar(400);
        await ev('P.ui.pagosModo = "calendario"; P.ui.pagosVista = "actual"; P.render(); true');
        await clic('[data-fk^="i-remesa-"]');
        await clic('[data-fk="ing-llego"]');
        // v2.6.5 (V2-81): la esperabas para el 28: «¿Ya te llegó por adelantado?» → «Sí, ya llegó».
        await clic('[data-fk="dlg-si"]');
        await clic('[data-fk="ing-ok"]');
        await logrado('P-REMESA');
        await clic('[data-fk="rep-listo"]');
        check('P-REMESA: libre $230.00', await ev('P.calc().libre'), 23000);
        await foto('D-remesa');
        await clic('[data-fk="pr-siguiente"]');
        await clic('[data-fk="pr-P-HORIZONTE"]');
        await esperar(400);
        await clic('[data-fk="portada"]');
        await clic('[data-fk="hz-quince"]');
        await logrado('P-HORIZONTE');
        await ev('P.cerrarHoja(); true');
        check('P-HORIZONTE: «Próximos 15 días»', await texto('.portada-h'), 'Próximos 15 días · hasta el 5 nov');
        await clic('[data-fk="pr-siguiente"]');
        await clic('[data-fk="pr-P-RESERVAR"]');
        await esperar(400);
        check('P-RESERVAR: el botón dice lo del ejercicio', await texto('[data-fk="at-sug-si"]'), 'Sí, $191.00');
        await clic('[data-fk="at-sug-si"]');
        await escribir('#f-monto', '40');
        await clic('[data-fk="reservar-ok"]');
        await logrado('P-RESERVAR');
        // v2.8 (C-2): sin «reservar» fuera de «¿De dónde sale?»: «$40.00 de lo que tienes ahora».
        check('P-RESERVAR: el alquiler lo dice', await texto('[data-fk="p-alquiler-2026-11-05"]'), contiene('$40.00 de lo que tienes ahora'));
        await clic('[data-fk="pr-siguiente"]');
        await clic('[data-fk="pr-P-SEMANA"]');
        await esperar(400);
        check('P-SEMANA: libre $0 y lo que falta', await texto('.portada'), contiene('$0.00', 'Faltan $10.00 para cubrir tus ahorros'));
        await foto('D-semana-mala');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        await clic('[data-fk="a-plancha"]');
        await clic('[data-fk="ap-liberar"]');
        await escribir('#f-monto', '10');
        await clic('[data-fk="hoja-ok"]');
        await logrado('P-SEMANA');
        await clic('[data-fk="nav-hoy"]');
        check('P-SEMANA: ya no falta para tus ahorros', await texto('.portada'), (x) => !x.includes('Faltan'));
        // La versión fija: primero los suyos.
        await ev('P.modos.guardarEntrenamiento({ tourVersion: "fijo" }); P.ayuda.abrir("practica"); true');
        await esperar(300);
        check('fijo: primero los suyos', [await ev('[...document.querySelectorAll("h3.campo-l")].map((h) => h.textContent)'), await ev('[...document.querySelectorAll(".ay-casos")][0].querySelectorAll(".ay-caso--ej").length')], [['Para ti: fecha fija', 'De ingresos que varían'], 11]);
        await ev('P.ayuda.cerrar({ foco: false }); true');

    }
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR-p2');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, numeros: informe.numeros }, null, 1));
b.cerrar();
