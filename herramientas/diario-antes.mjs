// v2.5 · EVALUACIÓN PRIMERO. Recorre el entrenamiento de la v2.4.1 (las dos versiones) como una persona nueva, a
// 390×844, y guarda una captura y el texto visible de CADA momento (pantalla de bienvenida, la pregunta, cada paso,
// la barra de «Hazlo tú» antes de actuar, cada hoja que se abre, la celebración y cada pregunta). Sirve para escribir
// el «diario de fricción» (LEEME) mirando lo mismo que vería Doña Marta, Kevin o Rosa. No cambia nada.
// Uso: node herramientas/diario-antes.mjs [--tema=serena-claro]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const salida = path.join(root, 'capturas', 'diario-antes', tema);
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: 'chrome', puerto: Number(args.puerto || 9931) });
await b.tamano(390, 844);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const momentos = [];
let n = 0;
/** Captura + lo que se lee en ese momento (la tarjeta o la barra del recorrido y lo que hay en la pantalla). */
const momento = async (nombre, nota = '') => {
    await esperar(450);
    const archivo = `${String(++n).padStart(2, '0')}-${nombre}.png`;
    await b.captura(path.join(salida, archivo));
    const leido = await ev(`(() => {
        const t = (s) => document.querySelector(s)?.innerText.replace(/\\s+/g, ' ').trim() || '';
        return { recorrido: t('.tour-card') || t('.tour-hz'), hoja: t('.hoja'), pantalla: t('#pantalla').slice(0, 600), libre: P.calc().libre };
    })()`);
    momentos.push({ archivo, nombre, nota, ...leido });
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(150);
};
const escribir = async (sel, valor) => {
    await ev(`(() => { const el = document.querySelector(${js(sel)}); el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await esperar(150);
};
const sig = async () => {
    await clic('[data-fk="tour-sig"]');
    await esperar(300);
};
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__fechaPrueba = "2026-10-18";' });
async function limpio() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(400);
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(600);
}
const quiz = async (version) => {
    await clic('[data-fk="tour-quiz"]');
    await momento(`${version}-quiz-1`);
    const total = await ev('P.tour.PREGUNTAS.length');
    for (let q = 0; q < total; q++) {
        const bien = await ev(`P.tour.PREGUNTAS[${q}].bien`);
        await clic(`[data-fk="tour-op-${q === 0 ? (bien + 1) % 3 : bien}"]`);
        await momento(`${version}-quiz-${q + 1}-respuesta`, q === 0 ? 'respuesta equivocada a propósito' : '');
        await clic('[data-fk="tour-quiz"]');
        if (q + 1 < total) await momento(`${version}-quiz-${q + 2}`);
    }
    await momento(`${version}-fin`);
};

try {
    // ------------------------------------------------------------------ versión fija (Ana)
    await limpio();
    await momento('bienvenida', 'primera vez que abre la app');
    await clic('[data-fk="elegir-aprender"]');
    await momento('pregunta-version');
    await clic('[data-fk="tour-version-fijo"]');
    await esperar(150);
    await momento('fijo-01');
    await sig();
    await momento('fijo-02');
    await sig();
    await momento('fijo-03');
    await sig();
    await momento('fijo-04-barra', 'Hazlo tú: antes de tocar nada');
    await clic('[data-fk="nav-anotar"]');
    await momento('fijo-04-anotar-abierto');
    await escribir('#anotar-q', 'pupusas 6');
    await momento('fijo-04-escrito');
    await clic('[data-fk="anotar-guardar"]');
    await esperar(100);
    await b.captura(path.join(salida, `${String(++n).padStart(2, '0')}-fijo-04-justo-al-guardar.png`));
    await momento('fijo-04-celebra');
    await sig();
    await momento('fijo-05');
    await sig();
    await momento('fijo-06-barra');
    await clic('[data-fk^="pagado-p-telefono-"]');
    await momento('fijo-06-celebra');
    await sig();
    await momento('fijo-07');
    await sig();
    await momento('fijo-08-barra');
    await clic('[data-fk="p-colegio-2026-11-05"]');
    await momento('fijo-08-ficha-colegio');
    await clic('[data-fk="pagar-con"]');
    await momento('fijo-08-pagar-con');
    await clic('[data-fk="pc-uno:ahora"]');
    await momento('fijo-08-elegido');
    await clic('[data-fk="pc-ok"]');
    await momento('fijo-08-celebra');
    await sig();
    await momento('fijo-09');
    await sig();
    await momento('fijo-10');
    await sig();
    await momento('fijo-11');
    await sig();
    await momento('fijo-12-barra');
    await clic('[data-fk="md-cuentas"]');
    await momento('fijo-12-cuentas');
    await clic('[data-fk="md-cuadrar"]');
    await momento('fijo-12-hoja-cuadrar');
    await clic('[data-fk="op-lugar-efectivo"]');
    const di = await ev('MOTOR.montoCampo(P.tour.cuadre.di)');
    await escribir('#f-monto', di);
    await momento('fijo-12-escrito');
    await clic('[data-fk="hoja-ok"]');
    await momento('fijo-12-celebra');
    await sig();
    await momento('fijo-13');
    await sig();
    await momento('fijo-14');
    await sig();
    await momento('fijo-15');
    await quiz('fijo');

    // ------------------------------------------------------------------ versión variable (Rosa)
    await limpio();
    await clic('[data-fk="elegir-aprender"]');
    await clic('[data-fk="tour-version-variable"]');
    await esperar(150);
    await momento('variable-01');
    await sig();
    await momento('variable-02');
    await sig();
    await momento('variable-03');
    await sig();
    await momento('variable-04');
    await sig();
    await momento('variable-05-barra');
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', 'vendí 45');
    await momento('variable-05-escrito');
    await clic('[data-fk="anotar-guardar"]');
    await momento('variable-05-celebra');
    await sig();
    await momento('variable-06-barra');
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', 'queso 12');
    await momento('variable-06-escrito');
    await clic('[data-fk="anotar-guardar"]');
    await momento('variable-06-celebra');
    await sig();
    await momento('variable-07');
    await sig();
    await momento('variable-08');
    await sig();
    await momento('variable-09');
    await sig();
    await momento('variable-10-barra');
    await clic('[data-fk="at-sug-si"]');
    await momento('variable-10-reservar');
    await escribir('#f-monto', '40');
    await clic('[data-fk="reservar-ok"]');
    await momento('variable-10-celebra');
    await sig();
    await momento('variable-11', 'la semana mala aparece sola');
    await sig();
    await momento('variable-12');
    await sig();
    await momento('variable-13-barra');
    await clic('[data-fk="md-cuentas"]');
    await clic('[data-fk="md-cuadrar"]');
    await clic('[data-fk="op-lugar-efectivo"]');
    await escribir('#f-monto', await ev('MOTOR.montoCampo(P.tour.cuadre.di)'));
    await momento('variable-13-escrito');
    await clic('[data-fk="hoja-ok"]');
    await momento('variable-13-celebra');
    await sig();
    await momento('variable-14');
    await sig();
    await momento('variable-15');
    await quiz('variable');
} catch (e) {
    momentos.push({ error: e.message });
    await b.captura(path.join(salida, 'ERROR.png'));
}
await writeFile(path.join(salida, 'momentos.json'), JSON.stringify({ errores: b.errores, momentos }, null, 1));
console.log(JSON.stringify({ capturas: n, errores: b.errores, error: momentos.find((m) => m.error) }, null, 1));
b.cerrar();
