// PRUEBAS v2.3.1 (y su corrección adicional). Escenario de Victor con fecha simulada SOLO aquí
// (window.__fechaPrueba); por la interfaz donde importa. Cubre: V2-50 Anotar sin teclado de golpe, V2-52 pagar
// con un ingreso de una vez (con y sin llegada), V2-54 tarjeta del primer día, V2-55 vencido no duplicado y
// resumen de Pagos → Mes; corrección: proyección con ingresos de una vez (~$1,477 · ~$1,196 · ~$281), adelanto de
// salario con descuento, «Más adelante», tarjeta agregada después de empezar, «¿Es una deuda?»; y «Compartir copia».
// Uso: node herramientas/v231.mjs [--base=http://…/] [--tema=serena-claro]
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const salida = path.join(root, 'capturas', 'v231' + (args.base ? '-servida' : ''), tema);
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9861) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const informe = { base, tema, fallos: [], numeros: {}, errores: b.errores, fallidas: b.fallidas };
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
let actual = '';
let n = 0;
const foto = async (nombre) => {
    await esperar(150);
    await b.captura(path.join(salida, `${String(++n).padStart(2, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(90);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(90);
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
    await b.ir(base + 'telefono.html' + (hash ? '#' + hash : '#tema=' + tema));
    await esperar(400);
}
async function limpio() {
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
}
const calc = (expr) => ev(`(() => { const M = window.MOTOR; const k = P.calc(); return ${expr}; })()`);

/** Victor, por la interfaz (como en la prueba de aceptación v2.3). */
async function victor({ conCuchubal = true } = {}) {
    await fecha('2026-10-17');
    await limpio();
    await clic('[data-fk="elegir-usar"]');
    await clic('[data-fk="intro-empezar"]');
    await escribir('#ob-nombre', 'Victor');
    await clic('[data-fk="ob-empezar"]');
    await clic('[data-fk="ob-i-quincena"]');
    await escribir('#ob-q-monto', '597');
    await clic('[data-fk="ob-q-dias-otros"]');
    await escribir('#ob-q-d1', '14');
    await escribir('#ob-q-d2', '29');
    await clic('[data-fk="ob-q-lugar-efectivo"]');
    await clic('[data-fk="ob-x-aguinaldo"]');
    await escribir('#ob-x-aguinaldo', '1000');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-banco-Agrícola"]');
    await escribir('#ob-banco-monto', '0');
    await escribir('#ob-efectivo', '120');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]'); // v2.6.2 (V2-68): deudas y tarjetas en pasos separados
    for (const [id, monto] of [['alquiler', '200'], ['luz', '60'], ['agua', '3'], ['internet', '30']]) {
        await clic(`[data-fk="ob-p-${id}"]`);
        await escribir('#ob-p-monto', monto);
        await clic('[data-fk="ob-p-dia-30"]');
        await clic('[data-fk="ob-p-agregar"]');
    }
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="pn-listo"]');
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="nuevo-ingreso"]');
    await clic('[data-fk="op-tipoIng-salario"]');
    await escribir('#f-nombre', 'Salario de mi pareja');
    await escribir('#f-monto', '566');
    await clic('[data-fk="hoja-ok"]');
    await clic('[data-fk="nuevo-pago"]');
    await escribir('#f-nombre', 'Pago de mi mama');
    await escribir('#f-monto', '160');
    await clic('[data-fk="estimado"]');
    await clic('[data-fk="dia-dia-30"]');
    await clic('[data-fk="hoja-ok"]');
    for (const [nombre, cuota] of [['Préstamo Liss', '156'], ['Préstamo', '79']]) {
        await clic('[data-fk="nuevo-pago"]');
        await clic('[data-fk="np-cuota"]');
        await esperar(150);
        await clic('[data-fk="td-prestamo"]');
        await escribir('#f-nombre', nombre);
        await escribir('#f-cuota', cuota);
        await escribir('#f-dia', '30');
        await clic('[data-fk="deuda-ok"]');
    }
    if (conCuchubal) {
        await clic('[data-fk="nuevo-pago"]');
        await clic('[data-fk="op-frecuente-cuchubal"]');
        await escribir('#f-monto', '25');
        await clic('[data-fk="op-qModo-otros"]');
        await escribir('#f-d1', '8');
        await escribir('#f-d2', '23');
        await clic('[data-fk="hoja-ok"]');
    }
    await clic('[data-fk="nav-hoy"]');
}
/** Un ingreso de una vez por la interfaz (+ Ingreso esperado → Una vez). */
async function ingresoUnaVez(nombre, monto, iso, { adelanto = false } = {}) {
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="nuevo-ingreso"]');
    await escribir('#f-nombre', nombre);
    await escribir('#f-monto', monto);
    await clic('[data-fk="op-frecuencia-unico"]');
    await ev(`P.ui.hoja.fecha = ${js(iso)}; P.render(); true`);
    // v2.4.1 (V2-56): el adelanto se elige en «¿Qué es?» y su descuento se pregunta en el mismo formulario.
    if (adelanto) await clic('[data-fk="op-tipoIng-adelanto"]');
    else await clic('[data-fk="hoja-ok"]');
}
/** Un pago de una vez (directo al estado: lo que importa aquí es el motor y las fichas). */
const pagoUnaVez = (nombre, centavos, iso) => ev(`(() => { let id; P.cambiar((s) => { id = P.crearPago(s, { nombre: ${js(nombre)}, emoji: '🎒', categoria: 'otro', monto: ${centavos}, frecuencia: 'unico', fecha: ${js(iso)}, medio: 'efectivo' }).id; }); return id; })()`);

try {
    // ================================================================ V2-50: Anotar sin teclado de golpe
    actual = 'v2-50';
    await fecha('2026-10-17');
    await abrirApp('persona=ana&tema=' + tema);
    check('390 táctil: pointer coarse', await ev("matchMedia('(pointer: coarse)').matches"), true);
    await ev('document.querySelector("[data-fk=nav-anotar]").focus(); true');
    await clic('[data-fk="nav-anotar"]');
    await esperar(200);
    check('390: el foco va al título (sin teclado)', await ev('document.activeElement.id'), 'hoja-t');
    check('390: se ve el campo, el micrófono y los atajos', await ev('[!!document.getElementById("anotar-q"), !!document.getElementById("anotar-mic"), document.querySelectorAll(".atajo").length]'), [true, true, 6]);
    await foto('anotar-sin-teclado');
    await clic('[data-fk="atajo-gasto"]');
    check('390: un atajo que pide escribir sí abre el teclado', await ev('document.activeElement.tagName + "#" + document.activeElement.id'), 'INPUT#f-monto');
    await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
    await esperar(200);
    check('390: Escape cierra y el foco vuelve al (+)', await ev('[!!P.ui.hoja, document.activeElement.dataset.fk || document.activeElement.id]'), [false, 'nav-anotar']);
    await b.tamano(1440, 1000, { movil: false, toque: false });
    await abrirApp('persona=ana&tema=' + tema);
    check('1440: pointer fine', await ev("matchMedia('(pointer: coarse)').matches"), false);
    await ev('document.querySelector("[data-fk=nav-anotar]").focus(); true');
    await clic('[data-fk="nav-anotar"]');
    await esperar(200);
    check('1440: foco directo al campo', await ev('document.activeElement.id'), 'anotar-q');
    await ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
    await esperar(200);
    check('1440: Escape y el foco vuelve', await ev('[!!P.ui.hoja, document.activeElement.dataset.fk || document.activeElement.id]'), [false, 'nav-anotar']);
    await b.tamano(390, 844);

    // ================================================================ V2-55: vencido una vez en Hoy · resumen de Pagos → Mes
    actual = 'v2-55';
    await abrirApp('persona=ana&tema=' + tema);
    check('a) la luz vencida no está en Próximos pagos', await hay('section[aria-labelledby="h-pagos"] [data-fk="p-luz-2026-10-12"]'), false);
    check('a) sí está en el aviso', await texto('.aviso-hoy'), contiene('Luz: venció el 12 oct'));
    await foto('ana-hoy-sin-duplicar');
    await victor();
    actual = 'v2-55 victor';
    check('aceptación: libre $95.00', await texto('.portada-n'), '$95.00');
    check('aceptación: ~$7.90 por día', await texto('.portada-s'), '~$7.90 por día');
    const base1 = await calc('({ libre: k.libre, prox: { entra: k.proxima.entra, pagos: k.proxima.pagos, quedan: k.proxima.quedan, deficit: k.proxima.deficit }, avisos: k.avisos.map((a) => a.tipo) })');
    check('aceptación: la próxima (29)', base1.prox, { entra: 116300, pagos: 71300, quedan: 45000, deficit: 0 });
    check('aceptación: sin avisos', base1.avisos, []);
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="tab-mes"]');
    check('b) Pagos → Mes: resumen de octubre', await texto('.per-res .per-res-l'), 'Ingresos ~$1,163 · pagos ~$713 · queda ~$450');
    const mes = await ev('(() => { const r = window.MOTOR.pagosDelMes(P.st, 2026, 10); return [r.entra, r.pagos, r.queda]; })()');
    check('b) los mismos números del motor', mes, [116300, 71300, 45000]);
    await foto('pagos-mes-resumen');

    // ================================================================ Corrección: la próxima con un ingreso de una vez (adelanto)
    actual = 'correccion proyeccion';
    await ingresoUnaVez('Adelanto de Salario', '314', '2026-10-29');
    await pagoUnaVez('Colegiatura', 48300, '2026-11-05');
    await clic('[data-fk="nav-hoy"]');
    const c1 = await calc('({ libre: k.libre, prox: { entra: k.proxima.entra, pagos: k.proxima.pagos, quedan: k.proxima.quedan, deficit: k.proxima.deficit }, avisos: k.avisos.map((a) => a.tipo + ":" + a.nivel) })');
    informe.numeros.correccion = c1;
    check('el libre de HOY no cambia (no suma hasta que llegue)', c1.libre, 9500);
    check('la próxima: ingreso ~$1,477 · pagos ~$1,196 · ~$281', c1.prox, { entra: 147700, pagos: 119600, quedan: 28100, deficit: 0 });
    check('sin aviso de faltante', c1.avisos, []);
    check('texto de la próxima', await texto('.proy-l'), 'ingreso ~$1,477 · pagos ~$1,196 · te quedarían ~$281');
    check('incluye ~$314 de adelanto', await texto('.proy-s'), 'incluye ~$566 de tu pareja y ~$314 de adelanto');
    await foto('proyeccion-con-adelanto');
    // «Más adelante» = después de «Próxima»: el adelanto se ve solo en su periodo.
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="tab-actual"]');
    check('3) «Esta quincena → Más adelante» sin el adelanto', await ev('[...document.querySelectorAll(".grupo .fila-t")].filter((e) => e.closest(".grupo").querySelector(".grupo-t").textContent === "Más adelante").map((e) => e.textContent)'), ['Aguinaldo']);
    await clic('[data-fk="tab-proxima"]');
    const idAd0 = await ev('P.st.ingresos.find((i) => i.nombre === "Adelanto de Salario").id');
    check('3) el adelanto está en la Próxima', await hay(`[data-fk="i-${idAd0}-2026-10-29"]`), true);
    check('3) Próxima: mismo resumen', await texto('.per-res .per-res-l'), 'Ingreso ~$1,477 · pagos ~$1,196 · te quedarían ~$281');

    // ================================================================ Corrección: adelanto de salario con descuento
    actual = 'adelanto';
    const idAd = await ev('P.st.ingresos.find((i) => i.nombre === "Adelanto de Salario").id');
    await ev(`P.abrir("ingreso", ${js(idAd)}); true`);
    check('la ficha ofrece «¿Es un adelanto de tu salario?»', await hay('[data-fk="adelanto-si"]'), true);
    await foto('ficha-adelanto-pregunta');
    await clic('[data-fk="adelanto-si"]');
    check('pregunta de qué quincena', await texto('#hoja-t'), '¿De qué quincena te lo descuentan?');
    check('por defecto: la primera quincena después, todo el monto', await ev('[Object.keys(P.ui.hoja.partes), document.getElementById("f-ad-2026-11-14")?.value]'), [['quincena|2026-11-14'], '314.00']);
    await foto('hoja-adelanto');
    await clic('[data-fk="ad-ok"]');
    const d1 = await calc('(() => { const st = P.st; const q = st.ingresos.find((i) => i.principal); const o = M.ocurrenciasIngreso(st, q, "2026-11-14", "2026-11-14")[0]; const p2 = k.periodos.find((x) => x.clave === "2026-11-14"); return { monto: o.monto, descuento: o.descuento, entra: p2.entra, prox: k.proxima.entra, libre: k.libre }; })()');
    check('la quincena del 14 viene con el descuento ($283)', [d1.monto, d1.descuento], [28300, 31400]);
    check('el periodo del 14: ingreso ~$849 (283 + 566)', d1.entra, 84900);
    check('la próxima (29) no cambia', d1.prox, 147700);
    check('hoy no cambia', d1.libre, 9500);
    check('la ficha del adelanto dice de cuál', await texto('section[aria-labelledby="i-adelanto"]'), contiene('De tu quincena del 14 nov', '$314.00'));
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="tab-mes"]');
    await clic('[data-fk="pm-sig"]');
    check('calendario: «Quincena ~$283 · te descuentan $314 del adelanto»', await texto('[data-fk="i-quincena-2026-11-14"]'), contiene('Quincena', 'te descuentan $314.00 del adelanto', '~$283'));
    await foto('calendario-quincena-con-descuento');
    const nov = await ev('(() => { const r = window.MOTOR.pagosDelMes(P.st, 2026, 11); return r.entra; })()');
    check('nunca dos veces: noviembre entra 283 + 566 + 597 + 566', nov, 28300 + 56600 + 59700 + 56600);
    await ev('P.abrirHoja("ingresoLlego", { id: "quincena", fecha: "2026-11-14" }); true');
    check('al confirmar esa quincena, ya viene con el descuento', await ev('document.getElementById("f-monto").value'), '283.00');
    check('y lo dice', await texto('.hoja .campo-ayuda'), contiene('Ya le restamos $314.00 de tu adelanto'));
    await ev('P.cerrarHoja(); true');
    // Nuevo adelanto desde «+ Ingreso esperado», repartido en dos quincenas.
    await ingresoUnaVez('Vale de la empresa', '100', '2026-11-20', { adelanto: true });
    check('pregunta de qué quincena (en el mismo formulario)', await texto('#l-ad'), '¿De qué quincena te lo descuentan?');
    await clic('[data-fk="ad-2026-12-14"]');
    check('repartir: la segunda propone lo que falta', await ev('JSON.stringify(P.ui.hoja.adPartes)'), JSON.stringify({ 'quincena|2026-11-29': '100.00', 'quincena|2026-12-14': '0.00' }));
    await escribir('#f-ad-2026-11-29', '60');
    await escribir('#f-ad-2026-12-14', '40');
    check('la suma se ve', await texto('#ad-suma'), 'Suman $100.00: todo el adelanto.');
    await foto('hoja-adelanto-repartido');
    await clic('[data-fk="hoja-ok"]');
    const d2 = await calc('(() => { const q = P.st.ingresos.find((i) => i.principal); return M.ocurrenciasIngreso(P.st, q, "2026-11-29", "2026-12-14").map((o) => [o.fecha, o.monto]); })()');
    check('repartido: $537 y $557', d2, [['2026-11-29', 53700], ['2026-12-14', 55700]]);
    // Si el periodo con descuento queda corto, el aviso normal lo dice con tiempo.
    await pagoUnaVez('Seguro', 90000, '2026-11-16');
    const d3 = await calc('k.avisos.filter((a) => a.tipo === "sugerencia").map((a) => [a.periodo.clave, a.periodo.deficit])');
    // Entran 283 + 566 + el vale (100, el 20); el seguro (900) vence el 16: faltan $51 hasta que llega el vale.
    check('aviso a tiempo del periodo del 14 (le faltarían $51 el 16)', d3, [['2026-11-14', 5100]]);
    // Antes de la v2.4: solo por fechas → el día, la causa y dos salidas.
    const sug = await ev('P.atencion(P.calc()).filter((x) => x.id.startsWith("sug-")).map((x) => ({ t: x.titulo, x: x.texto, corto: x.corto }))[0]');
    check('faltante por fechas: el día y la causa', sug.t, 'El 16 te faltarían ~$51 hasta que llegue el adelanto (el 20).');
    check('faltante por fechas: en total alcanza y dos salidas', sug.x, 'En total sí te alcanza, pero el seguro vence antes. ¿Lo pagas con tu quincena del 29 o reservas solo $51.00?');
    check('faltante por fechas: corto con el día', sug.corto, 'te faltarían ~$51 el 16');
    await ev('P.abrirHoja("atencion"); true');
    check('botones: pagarlo antes y reservar', await ev('[...document.querySelectorAll("[data-fk=at-sug-pagar], [data-fk=at-sug-si], [data-fk=at-sug-no]")].map((e) => e.textContent.trim())'), ['Pagarlo con tu quincena del 29', 'Reservar $51.00', 'No, después veo']);
    await foto('aviso-faltante-por-fechas');
    await clic('[data-fk="at-sug-pagar"]');
    check('«Pagarlo con…» abre la hoja con esa quincena elegida', await ev('[document.getElementById("hoja-t").textContent, P.ui.hoja.modo]'), ['¿Con qué pagas el seguro?', 'uno:2026-10-29']);
    await ev('P.cerrarHoja(); true');
    // Pagos → la quincena del 14 dice lo mismo («Ojo: el 16 te faltarían…»).
    await ev('P.irTab("pagos"); P.ui.pagosMes = null; true');
    check('Hoy y Pagos dicen lo mismo', await ev('P.textoFaltaFechas(P.calc().periodos.find((x) => x.clave === "2026-11-14"))'), 'El 16 te faltarían ~$51 hasta que llegue el adelanto (el 20)');
    await clic('[data-fk="nav-hoy"]');
    await foto('hoy-con-adelanto');

    // ================================================================ V2-52: pagar con el aguinaldo
    actual = 'v2-52';
    await victor();
    const idMat = await pagoUnaVez('Matrícula', 10000, '2027-01-15');
    await ev(`P.abrir("pago", ${js(idMat)}); true`);
    await clic('[data-fk="pagar-con"]');
    // Antes de la v2.4: de un pago lejano, como mucho 3 opciones (la de siempre + las 2 más cercanas) y «Ver más quincenas».
    check('pago lejano: 3 opciones a la vista', await ev('[...document.querySelectorAll("[data-fk^=pc-uno]")].map((e) => e.dataset.fk)'), ['pc-uno:2027-01-14', 'pc-uno:2026-12-29', 'pc-uno:2026-12-14']);
    check('pago lejano: «Ver más quincenas»', await texto('[data-fk="pc-ver-mas"]'), 'Ver más quincenas (5)');
    await foto('pagar-con-tres-opciones');
    await clic('[data-fk="pc-ver-mas"]');
    check('ofrece el aguinaldo', await hay('[data-fk="pc-uno:unico:aguinaldo"]'), true);
    check('el aguinaldo no cuenta hasta que llega', await texto('[data-fk="pc-uno:unico:aguinaldo"]'), contiene('Con tu aguinaldo del 12 dic', 'no cuenta hasta que llegue'));
    await foto('pagar-con-aguinaldo');
    await clic('[data-fk="pc-uno:unico:aguinaldo"]');
    await clic('[data-fk="pc-ok"]');
    check('la ficha: con tu aguinaldo', await texto('section[aria-labelledby="f-con"]'), contiene('Con tu aguinaldo del 12 dic', '$100.00'));
    const a1 = await calc('(() => { const p = k.periodos.find((x) => x.ingresos.some((o) => o.ingreso.id === "aguinaldo")); return { libre: k.libre, clave: p.clave, aguinaldo: p.otros.find((o) => o.ingreso.id === "aguinaldo").monto, matricula: p.partes.filter((x) => x.pago.nombre === "Matrícula").map((x) => x.parte) }; })()');
    check('hoy no cambia', a1.libre, 9500);
    check('va en el periodo del aguinaldo (entra y sale ahí)', [a1.clave, a1.aguinaldo, a1.matricula], ['2026-11-29', 100000, [10000]]);
    await clic('[data-fk="nav-hoy"]');
    await clic('[data-fk="portada"]');
    check('desglose: con eso pagas la matrícula', await texto('.hoja .nota--info'), contiene('Aguinaldo', 'con eso pagas la matrícula'));
    await clic('[data-fk="desglose-ok"]');
    // Sin llegada: el día que vence, aviso ámbar (nada cambia solo).
    await fecha('2027-01-15');
    await abrirApp();
    const a2 = await calc('({ aviso: k.avisos.filter((a) => a.tipo === "sinIngreso").map((a) => a.nivel), enItems: k.items.some((x) => x.pago.nombre === "Matrícula") })');
    check('aviso ámbar sin llegada', a2, { aviso: ['ambar'], enItems: false });
    const at = await ev('P.atencion(P.calc()).filter((x) => x.id.startsWith("sin-")).map((x) => x.titulo)');
    check('texto del aviso', at, ['La matrícula la ibas a pagar con el aguinaldo, que todavía no llega. ¿Con qué la pagas?']);
    await ev('P.abrirHoja("atencion"); true');
    await foto('aviso-sin-aguinaldo');
    await clic('[data-fk^="at-sin-"]');
    check('«Elegir con qué» abre «¿Con qué pagas…?»', await texto('#hoja-t'), '¿Con qué pagas la matrícula?');
    await ev('P.cerrarHoja(); true');
    // Con llegada: se reserva de lo que tienes y no hay aviso.
    await fecha('2026-12-12');
    await abrirApp();
    const antes = await calc('k.disponible');
    await ev('P.cambiar((s) => P.llegoIngreso(s, "aguinaldo", "2026-12-12", { monto: 100000, lugar: "efectivo", fecha: "2026-12-12" })); true');
    const a3 = await calc('({ disponible: k.disponible, reservada: k.reservados.filter((x) => x.pago.nombre === "Matrícula").map((x) => x.parte) })');
    check('con el aguinaldo: +$900 disponibles y la matrícula reservada', [a3.disponible - antes, a3.reservada], [90000, [10000]]);
    await fecha('2027-01-15');
    await abrirApp();
    check('ya no hay aviso', await calc('k.avisos.filter((a) => a.tipo === "sinIngreso").length'), 0);

    // ================================================================ Corrección: tarjeta agregada después de empezar · «¿Es una deuda?»
    actual = 'tarjeta despues';
    await victor({ conCuchubal: false });
    await clic('[data-fk="nav-midinero"]');
    await clic('[data-fk="md-deudas"]');
    await clic('[data-fk="md-deuda"]');
    await clic('[data-fk="td-tarjeta"]');
    await escribir('#f-nombre', 'Visa Agrícola');
    await escribir('#f-corte', '21');
    await escribir('#f-pagoDia', '10');
    await clic('[data-fk="deuda-ok"]');
    const t1 = await calc('(() => { const t = P.st.tarjetas.find((x) => x.nombre === "Visa Agrícola"); return { ocurrencias: M.ocurrenciasTarjeta(P.st, "2026-09-01", "2026-12-31").filter((o) => o.tarjeta.id === t.id).map((o) => [o.fecha, o.estado]), avisos: k.avisos.map((a) => a.tipo) }; })()');
    check('4) ningún pago antes de empezar (17 oct): el del 10 nov', t1.ocurrencias, [['2026-11-10', 'porConfirmar']]);
    check('4) todavía no pide el estado de cuenta', t1.avisos, []);
    check('4) Deudas: «corta el 21»', await texto('[data-fk^="t-tarjeta"], [data-fk^="t-t"]'), contiene('corta el 21'));
    await clic('[data-fk^="t-t"]');
    check('4) ficha: «Corta el 21 de octubre» y sin «Llegó mi estado de cuenta»', [await texto('#pantalla .nota--info'), await hay('[data-fk="t-estado"]')], (x) => x[0].includes('Corta el 21 de octubre') && x[1] === false);
    await foto('tarjeta-corta-el-21');
    await fecha('2026-10-22');
    await abrirApp();
    check('4) el 22: «cortó el 21» y pide el estado', await calc('k.avisos.filter((a) => a.tipo === "estado").length'), 1);
    await clic('[data-fk="nav-midinero"]');
    await clic('[data-fk="md-deudas"]');
    check('4) Deudas: «cortó el 21»', await texto('[data-fk^="t-t"]'), contiene('cortó el 21'));
    // «¿Es una deuda?»: un préstamo creado como pago normal.
    actual = 'es deuda';
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="nuevo-pago"]');
    await escribir('#f-nombre', 'Préstamo cooperativa');
    await escribir('#f-monto', '45');
    await clic('[data-fk="dia-dia-15"]');
    await clic('[data-fk="hoja-ok"]');
    const idPc = await ev('P.st.pagos.find((p) => p.nombre === "Préstamo cooperativa").id');
    check('no está en Deudas todavía', await ev(`!!P.st.pagos.find((p) => p.id === ${js(idPc)}).tipoDeuda`), false);
    await ev(`P.abrir("pago", ${js(idPc)}); true`);
    check('la ficha ofrece «¿Es una deuda?»', await hay('[data-fk="es-deuda"]'), true);
    await foto('ficha-es-deuda');
    await clic('[data-fk="es-deuda"]');
    await escribir('#f-debe', '900');
    await clic('[data-fk="es-deuda-ok"]');
    check('ahora está en Deudas, sin duplicar el pago', await ev(`[P.st.pagos.filter((p) => p.nombre === "Préstamo cooperativa").length, P.st.pagos.find((p) => p.id === ${js(idPc)}).tipoDeuda, P.st.pagos.find((p) => p.id === ${js(idPc)}).deuda.debe]`), [1, 'prestamo', 90000]);
    await clic('[data-fk="nav-midinero"]');
    await clic('[data-fk="md-deudas"]');
    check('se ve en Deudas', await hay(`[data-fk="d-${idPc}"]`), true);
    // Compatibilidad: una «Tarjeta» creada como cuota con la v2.3 sigue igual.
    await ev('P.cambiar((s) => { const p = P.crearPago(s, { nombre: "Tarjeta Cuscatlán", emoji: "💳", categoria: "cuotas", monto: 5000, estimado: true, frecuencia: "mensual", dia: 10, medio: "efectivo" }); Object.assign(p, { tipoDeuda: "tarjeta", deuda: null, cuotaTarjeta: true }); }); true');
    const idCt = await ev('P.st.pagos.find((p) => p.cuotaTarjeta).id');
    await ev(`P.abrir("pago", ${js(idCt)}); true`);
    check('v2.3: la cuota «Tarjeta» abre su ficha', await texto('#pantalla h1'), contiene('Tarjeta Cuscatlán'));

    // ================================================================ V2-54: la «Tarjeta» del primer día es una tarjeta de verdad
    actual = 'v2-54';
    await fecha('2026-10-17');
    await limpio();
    await clic('[data-fk="elegir-usar"]');
    await clic('[data-fk="intro-empezar"]');
    await escribir('#ob-nombre', 'Pam');
    await clic('[data-fk="ob-empezar"]');
    await clic('[data-fk="ob-i-quincena"]');
    await escribir('#ob-q-monto', '600');
    await clic('[data-fk="ob-sig"]');
    await escribir('#ob-efectivo', '300');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    // v2.6.2 (V2-68): la tarjeta tiene su propio paso (después de las deudas); sin corte, cuenta lo que pagas normalmente.
    await clic('[data-fk="ob-tn"]');
    check('pregunta «¿Cuánto pagas normalmente?»', await texto('.ob-editor'), contiene('Tarjeta de crédito', '¿Cuánto pagas normalmente?', 'Día de pago', 'Si no sabes el corte, déjalo vacío'));
    await clic('[data-fk="ob-t-banco-Otro"]');
    await escribir('#ob-t-nombre', 'Visa Cuscatlán');
    await escribir('#ob-t-usual', '100');
    await escribir('#ob-t-pago', '5');
    await foto('ob-tarjeta');
    await clic('[data-fk="ob-t-guardar"]');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    check('primer número: la cuenta', await texto('.portada-n'), '$200.00');
    check('«Bueno saber» la explica', await texto('.pg .nota--info'), contiene('Visa Cuscatlán', 'lo que pagas normalmente (~$100)'));
    await foto('primer-numero-tarjeta');
    const t2 = await ev('(() => { const t = P.st.tarjetas[0]; return { n: P.st.tarjetas.length, corte: t.corte, usual: t.pagoUsual, medio: P.st.medios.some((m) => m.tarjeta === t.id), cuota: P.st.pagos.some((p) => p.cuotaTarjeta || p.tipoDeuda === "tarjeta") }; })()');
    check('una tarjeta real, sin corte, con su medio y sin cuota', t2, { n: 1, corte: null, usual: 10000, medio: true, cuota: false });
    await clic('[data-fk="pn-listo"]');
    check('Hoy: «Incluye tarjeta ~$100, vence el 5»', await texto('.portada-b'), contiene('Incluye tarjeta ~$100, vence el 5'));
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="tab-proxima"]');
    check('su pago está en Pagos (~$100 estimado, 5 nov)', await texto('[data-fk^="t-credito-2026-11-05"]'), contiene('Visa Cuscatlán', '~$100'));
    await clic('[data-fk="nav-midinero"]');
    check('Mi dinero: «Cuotas $100.00 al mes» (no «Debes ~$100»)', await texto('.total-s'), contiene('Cuotas $100.00 al mes'));
    await clic('[data-fk="md-deudas"]');
    check('su ficha en Deudas', await texto('[data-fk="t-credito"]'), contiene('Visa Cuscatlán', 'Pagas ~$100 el 5', 'estado de cuenta por anotar', 'Por confirmar'));
    await clic('[data-fk="t-credito"]');
    check('ficha: pago el 5 · corte por anotar', await texto('#pantalla .pg-head, #pantalla header'), contiene('Pago el 5 · día de corte por anotar'));
    await foto('ficha-tarjeta-primer-dia');
    // El estado de cuenta (y el día de corte) se piden 10 días antes de que venza.
    check('todavía no pide el estado', await calc('k.avisos.filter((a) => a.tipo === "estado").length'), 0);
    await fecha('2026-10-26');
    await abrirApp();
    check('el 26 (10 días antes) lo pide', await calc('k.avisos.filter((a) => a.tipo === "estado").length'), 1);
    await ev('P.abrirHoja("estadoCuenta", { id: "credito" }); true');
    check('el estado de cuenta pide el día de corte', await hay('#f-corte'), true);
    await foto('estado-cuenta-con-corte');
    await escribir('#f-corte', '20');
    await escribir('#f-total', '250');
    await escribir('#f-minimo', '25');
    await clic('[data-fk="hoja-ok"]');
    await clic('[data-fk="hoja-ok"]');
    const t3 = await calc('(() => { const t = P.st.tarjetas[0]; const i = M.tarjetaInfo(P.st, t); return { corte: t.corte, inicial: !!i.ult.inicial, corteFecha: i.ult.corte, vence: i.ult.vence, porPagar: i.porPagarEstado, estimado: i.estimado, avisos: k.avisos.filter((a) => a.tipo === "estado").length }; })()');
    check('ya es una tarjeta como cualquier otra', t3, { corte: 20, inicial: false, corteFecha: '2026-10-20', vence: '2026-11-05', porPagar: 25000, estimado: 0, avisos: 0 });

    // ================================================================ «Compartir copia» (no hacía nada en Android)
    actual = 'compartir copia';
    await fecha('2026-10-17');
    await abrirApp();
    // Simula el teléfono: compartir sí deja .txt (como Chrome en Android); se guarda lo que se compartió.
    await ev(`(() => { window.__compartido = []; navigator.canShare = (d) => !!(d && d.files && d.files.every((f) => f.type === 'text/plain' && f.name.endsWith('.txt'))); navigator.share = async (d) => { window.__compartido.push({ nombre: d.files[0].name, tipo: d.files[0].type, texto: await d.files[0].text() }); }; return true; })()`);
    await clic('#btn-ayuda');
    await clic('[data-fk="au-datos"]');
    check('el botón aparece', await hay('[data-fk="dt-compartir"]'), true);
    await clic('[data-fk="dt-compartir"]');
    await esperar(300);
    const comp = await ev('window.__compartido.map((x) => ({ nombre: x.nombre, tipo: x.tipo, copia: JSON.parse(x.texto).tipo }))');
    check('comparte un .txt con la copia', comp, [{ nombre: 'pamplanea-copia-2026-10-17.txt', tipo: 'text/plain', copia: 'copia-uso' }]);
    // Si el teléfono no deja: se descarga y se dice (nunca «no pasa nada»).
    await ev(`(() => { window.__descargas = []; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__descargas.push(this.download); else orig.call(this); }; navigator.share = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }; return true; })()`);
    await clic('[data-fk="dt-compartir"]');
    await esperar(300);
    check('si no deja, la descarga', await ev('window.__descargas'), ['pamplanea-copia-2026-10-17.json']);
    check('y lo dice', await texto('.toast'), contiene('la guardé en Descargas'));
    await ev(`(() => { window.__descargas = []; navigator.share = async () => { throw new DOMException('cancel', 'AbortError'); }; return true; })()`);
    await clic('[data-fk="dt-compartir"]');
    await esperar(300);
    check('cerrar el menú no descarga nada', await ev('window.__descargas'), []);
    // Restaurar desde el .txt compartido.
    const dir = path.join(os.tmpdir(), 'pamplanea-v231');
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const txt = path.join(dir, 'pamplanea-copia-2026-10-17.txt');
    await writeFile(txt, (await ev('window.__compartido[0].texto')));
    const libreAntes = await ev('P.calc().libre');
    await ev('P.cambiar((s) => { P.registrar(s, { tipo: "gasto", fecha: s.hoy, monto: 1000, nombre: "Prueba", categoria: "otro", emoji: "🧪", medio: "efectivo", anotado: true }); }); true');
    const { root: doc } = await b.enviar('DOM.getDocument', { depth: -1 });
    const { nodeId } = await b.enviar('DOM.querySelector', { nodeId: doc.nodeId, selector: '#dt-archivo' });
    check('acepta .txt', await ev('document.getElementById("dt-archivo").accept'), 'application/json,.json,text/plain,.txt');
    await b.enviar('DOM.setFileInputFiles', { nodeId, files: [txt] });
    await esperar(500);
    check('pide confirmar', await hay('[data-fk="dt-r-si"]'), true);
    await clic('[data-fk="dt-r-si"]');
    await esperar(300);
    check('restaurada desde el .txt', await ev('P.calc().libre'), libreAntes);
    await rm(dir, { recursive: true, force: true });
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, numeros: informe.numeros }, null, 1));
b.cerrar();
