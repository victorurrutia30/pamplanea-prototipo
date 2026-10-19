// PRUEBAS v2.4 «Entrenamiento a prueba de todo». Recorre el entrenamiento completo como una persona de 55 años
// sin experiencia (390×844), con capturas de cada paso; prueba de legibilidad (sin palabras técnicas, frases de
// 20 palabras o menos, ≤ 4 minutos); «Hazlo tú» a mano y con «Muéstrame»; «¿Lo entendí?» con repaso; retomar
// donde se quedó; «?» y «Aprende» con los mismos textos; consejos de la primera vez; «Practicar» de fácil a
// difícil con los ejercicios nuevos; accesibilidad (foco, 44 px, reducir movimiento) y contraste en los 4 temas.
// v2.5: el entrenamiento cambió («Lo esencial» y «Aprende más»): su recorrido, su legibilidad y su accesibilidad se
// prueban en v25.mjs; aquí siguen «?» y «Aprende» (con el glosario nuevo), los consejos, «Practicar» y su contraste.
// Uso: node herramientas/v24.mjs [--base=http://…/] [--tema=serena-claro]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const salida = path.join(root, 'capturas', 'v24' + (args.base ? '-servida' : ''), tema);
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9881) });
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
    await esperar(120);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(100);
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
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(450);
}
async function limpio() {
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
}
const tour = () => ev(`(() => ({ i: P.tour.i, activo: P.tour.activo, hz: !!document.querySelector('.tour-hz'), t: document.getElementById('tour-t')?.textContent.replace(/\\s+/g, ' ').trim(), paso: document.querySelector('.tour-card .paso, .tour-hz-n')?.textContent.replace(/\\s+/g, ' ').trim(), inerte: document.getElementById('vista').inert, foco: document.activeElement.id }))()`);
const libre = () => ev('P.calc().libre');
const siguiente = async () => {
    await clic('[data-fk="tour-sig"]');
    await esperar(350);
};

try {
    // v2.5: la legibilidad del entrenamiento, el recorrido y la accesibilidad del entrenamiento se prueban en
    // v25.mjs (el entrenamiento cambió: «Lo esencial» y «Aprende más»). Aquí quedan los consejos y «Practicar».
    actual = 'legibilidad';
    await limpio();
    const prohibidas = ['periodo', 'período', 'saldo inicial', 'ledger', 'ajuste', 'conciliación', 'conciliacion', 'asignación', 'asignacion', 'proyección', 'proyeccion'];
    const textos = await ev('[...Object.values(window.TIPS)]');
    check('consejos sin palabras técnicas', textos.filter((t) => prohibidas.some((p) => t.toLowerCase().includes(p))), []);

    // ================================================================ 3. «?» y «Aprende» (mismos textos)
    actual = 'ayuda';
    const glos = await ev('Object.fromEntries(window.GLOSARIO.map((g) => { const x = window.terminoGlosario(g.id, false); return [g.id, x.t + ": " + x.para + "Ejemplo: " + x.ejemplo]; }))');
    await ev('P.cargarPersona("ana"); true');
    await esperar(300);
    for (const [id, abrirJs] of [['libre', 'P.irTab("hoy")'], ['proxima', 'P.irTab("hoy")'], ['pagasCon', 'P.abrir("pago", "colegio")'], ['ahorros', 'P.irTab("midinero"); P.abrir("ahorros")'], ['deudas', 'P.irTab("midinero"); P.abrir("deudas")'], ['cuadrar', 'P.irTab("midinero"); P.abrir("cuentas"); P.abrirHoja("cuadrar")']]) {
        await ev(abrirJs + '; true');
        await esperar(250);
        check(`«?» de ${id}: se ve y mide 44 px`, await ev(`(() => { const q = document.querySelector('[data-fk="q-${id}"]'); if (!q) return null; const r = q.getBoundingClientRect(); return [r.width >= 44, r.height >= 44, q.getAttribute('aria-expanded'), document.getElementById('q-${id}').hidden]; })()`), [true, true, 'false', true]);
        await clic(`[data-fk="q-${id}"]`);
        check(`«?» de ${id}: abre 2–3 líneas con ejemplo`, [await ev(`document.querySelector('[data-fk="q-${id}"]').getAttribute('aria-expanded')`), await texto(`#q-${id}`)], ['true', glos[id]]);
        if (id === 'libre' || id === 'pagasCon' || id === 'cuadrar') await foto(`q-${id}`);
        await ev('P.cerrarHoja && P.ui.hoja && P.cerrarHoja(); true');
    }
    await ev('P.irTab("hoy"); P.abrir("aprende"); true');
    await esperar(250);
    check('«Aprende»: el glosario con los mismos textos', await ev('[...document.querySelectorAll(".glosario-i")].map((e) => e.querySelector("dt").textContent + ": " + e.querySelector("dd").textContent)'), await ev('window.GLOSARIO.filter((g) => g.solo !== "variable").map((g) => { const x = window.terminoGlosario(g.id, false); return x.t + ": " + x.para + "Ejemplo: " + x.ejemplo; })'));
    await foto('aprende');

    // ================================================================ 4. Consejos de la primera vez (uso normal)
    actual = 'consejos';
    await fecha('2026-10-17');
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
    check('Hoy: un consejo la primera vez', await texto('.tip p'), 'Tu número dice cuánto puedes gastar hasta tu quincena. Tócalo para ver de dónde sale.');
    await foto('tip-hoy');
    await clic('[data-fk="tip-hoy"]');
    check('«Entendido» lo quita', await hay('.tip'), false);
    await abrirApp();
    check('una sola vez por pantalla', await hay('.tip'), false);
    await clic('[data-fk="nav-pagos"]');
    check('Pagos: su consejo', await texto('.tip p'), contiene('Toca un pago para elegir con qué lo pagas'));
    await clic('[data-fk="tip-pagos"]');
    await clic('[data-fk="nav-midinero"]');
    check('Mi dinero: su consejo', await hay('[data-fk="tip-midinero"]'), true);
    await ev('P.modos.cambiar("entrenamiento"); true').catch(() => null);
    await esperar(300);
    check('en el entrenamiento no hay consejos', await ev('P.modo === "entrenamiento" ? document.querySelectorAll(".tip").length : -1'), 0);

    // ================================================================ 5. Practicar: de fácil a difícil, con los nuevos
    actual = 'practicar';
    await limpio();
    await clic('[data-fk="elegir-aprender"]');
    await esperar(500);
    await ev('P.tour.activo && P.acciones.tourCerrar({ v: "saltado" }); true');
    await esperar(300);
    await ev('P.ayuda.abrir("practica"); true');
    await esperar(300);
    const lista = await ev('[...document.querySelectorAll(".ay-caso--ej")].map((e) => [e.dataset.v, e.querySelector(".nivel").textContent])');
    // v2.4.1: 18 ejercicios; sin versión elegida, primero los de fecha fija (y los de todos), luego los de ingresos que varían.
    // v2.6.2 (V2-69 #37): sin los dos ejercicios de Carlos (C33 y C20): 16.
    check('16 ejercicios, de fácil a difícil, primero los de tu versión', lista, [['C05', 'Fácil'], ['C11', 'Fácil'], ['C23', 'Fácil'], ['C19', 'Fácil'], ['C26', 'Media'], ['C01', 'Media'], ['P-AGUINALDO', 'Media'], ['P-ADELANTO', 'Difícil'], ['C16', 'Difícil'], ['C31', 'Difícil'], ['C30', 'Difícil'], ['P-VENTA', 'Fácil'], ['P-HORIZONTE', 'Fácil'], ['P-REMESA', 'Fácil'], ['P-RESERVAR', 'Media'], ['P-SEMANA', 'Difícil']]);
    await foto('practicar');
    // Pagar con el aguinaldo.
    await clic('[data-fk="pr-P-AGUINALDO"]');
    await esperar(400);
    await clic('[data-fk="modo-lista"]');
    await clic('[data-fk="mp-matricula"]');
    await clic('[data-fk="pagar-con"]');
    await clic('[data-fk="pc-ver-mas"]');
    await clic('[data-fk="pc-uno:unico:aguinaldo"]');
    await clic('[data-fk="pc-ok"]');
    await esperar(300);
    check('ejercicio del aguinaldo: ¡Lo lograste!', await texto('.tarea-bar'), contiene('¡Lo lograste!', 'Pagar con el aguinaldo'));
    await foto('practicar-aguinaldo');
    // Adelanto con descuento.
    await clic('[data-fk="pr-siguiente"]');
    await clic('[data-fk="pr-P-ADELANTO"]');
    await esperar(400);
    await clic('[data-fk="modo-lista"]');
    await clic('[data-fk="mp-i-adelanto"]');
    await clic('[data-fk="adelanto-si"]');
    check('propone su quincena del 30 y $200', await ev('[Object.keys(P.ui.hoja.partes), document.getElementById("f-ad-2026-10-30")?.value]'), [['quincena|2026-10-30'], '200.00']);
    await clic('[data-fk="ad-ok"]');
    await esperar(300);
    check('ejercicio del adelanto: ¡Lo lograste!', await texto('.tarea-bar'), contiene('¡Lo lograste!', 'Adelanto de salario'));
    await clic('[data-fk="nav-hoy"]');
    check('su próxima quincena: con el descuento', await texto('.proy'), contiene('te descuentan $200.00 del adelanto'));
    await foto('practicar-adelanto');
    // La tarjeta del primer día está en «Primer día» (C01).
    // v2.6.2 (V2-68): las tarjetas de crédito tienen su propio paso en el Primer día.
    check('«Primer día» enseña la tarjeta', await ev('window.CASOS.find((c) => c.id === "C01").pasos.some((p) => p.t.includes("tarjetas de crédito") && p.t.includes("lo que pagas normalmente"))'), true);

    // 6. La accesibilidad del entrenamiento (44 px, reducir movimiento) se prueba en v25.mjs.
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}

// Contraste (WCAG) de lo nuevo en los 4 temas.
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
try {
    actual = 'contraste';
    informe.contraste = {};
    for (const t of ['serena-claro', 'serena-oscuro', 'ancla-claro', 'ancla-oscuro']) {
        await b.ir('about:blank');
        await b.ir(base + 'telefono.html#persona=ana&tema=' + t);
        await ev('P.sinGuardar = true; localStorage.clear(); true');
        await b.ir('about:blank');
        await b.ir(base + 'telefono.html#persona=ana&tema=' + t);
        await esperar(350);
        const r = {};
        await ev('P.acciones.qVer({ v: "proxima" }); true');
        Object.assign(r, await ev(medir([['«?» de la próxima', '.proy-w .q'], ['texto del «?»', '#q-proxima p']])));
        // Sobre el número (un degradado) el «?» usa el mismo color que el número grande.
        check(`${t}: el «?» del número, del color del número`, await ev('getComputedStyle(document.querySelector(".portada .q")).color === getComputedStyle(document.querySelector(".portada-n")).color'), true);
        await ev('P.ayuda.abrir("practica"); true');
        await esperar(300);
        Object.assign(r, await ev(medir([['nivel fácil', '.nivel--facil'], ['nivel media', '.nivel--media'], ['nivel difícil', '.nivel--dificil'], ['versión del ejercicio', '.nivel--version'], ['título «Para ti»', '#pr-tuyos']])));
        await ev('P.ayuda.cerrar({ foco: false }); P.abrir("aprende"); true');
        await esperar(250);
        Object.assign(r, await ev(medir([['glosario: término', '.glosario dt'], ['glosario: texto', '.glosario dd']])));
        informe.contraste[t] = r;
    }
    const valores = Object.values(informe.contraste).flatMap((x) => Object.values(x)).filter((x) => typeof x === 'number');
    informe.numeros.contrasteMinimo = Math.min(...valores);
    check('contraste ≥ 4.5:1 en los 4 temas', Object.entries(informe.contraste).flatMap(([t, x]) => Object.entries(x).filter(([, v]) => typeof v !== 'number' || v < 4.5).map(([k, v]) => `${t} ${k} ${v}`)), []);
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, numeros: informe.numeros }, null, 1));
b.cerrar();
