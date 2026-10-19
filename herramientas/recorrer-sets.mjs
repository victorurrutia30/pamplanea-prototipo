// Recorre la prueba guiada para testers: bienvenida con perfil, instalación (saltada), set A completo,
// «Nueva persona» (le toca el set B por alternancia), set B completo con «No pude» en una tarea,
// comprensión final, resumen y modo moderador. Comprueba detección, registro y textos; guarda capturas.
// v2.6: la prueba se abre desde «Ayuda» → «Prueba guiada» (V2-60); la persona no ve la letra del set y el resultado
// va en «Cuéntale a Victor o a Pam cómo vas» (V2-61, V2-62); el moderador, con ?victor=1 (V2-60); sin C33 (V2-63).
// Uso: node herramientas/recorrer-sets.mjs <ronda> [--base=http://127.0.0.1:8765/] [--tema=serena-claro] [--nav=chrome]
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, '').split('=')));
const ronda = process.argv[2] || '1';
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9711) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const salida = path.join(root, 'capturas', `sets-${ronda}${args.base ? '-servida' : ''}`, tema);
const informe = { ronda, base, tema, fallos: [], errores: b.errores, fallidas: b.fallidas };
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
let actual = '';
let n = 0;
const foto = async (nombre) => {
    await esperar(120);
    await b.captura(path.join(salida, `${String(++n).padStart(3, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(80);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(80);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.textContent.replace(/\\s+/g, ' ').trim() ?? null`);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : real === cond;
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(real).slice(0, 160)}»`);
    return ok;
};
const contiene = (s) => (x) => typeof x === 'string' && x.includes(s);

/** Una tarea: lee la instrucción, Empezar, hace lo suyo y comprueba que la app lo detecte. */
async function tarea(nombre, hacer, { rendirse = false, facil = 4, confuso = '' } = {}) {
    actual = nombre;
    await foto(nombre + '-instruccion');
    check('instrucción sin «toca»', await texto('.ay-tarea--grande'), (x) => x && !/\btoca\b|\bbotón\b|\bpestaña\b/i.test(x.replace('toca «Responder»', '')));
    await clic('[data-fk="ay-comenzar"]');
    check('barra con Listo y No pude', (await hay('[data-fk="tarea-listo"]')) && (await hay('[data-fk="tarea-rendir"]')), true);
    await foto(nombre + '-barra');
    if (rendirse) {
        await clic('[data-fk="tarea-rendir"]');
    } else {
        await hacer();
        await esperar(150);
        check('la app lo detecta', await hay('[data-fk="tarea-seguir"]'), true);
        await foto(nombre + '-detectada');
        await clic('[data-fk="tarea-seguir"]');
    }
    await foto(nombre + '-respuesta');
    await clic(`[data-fk="ay-facil-${facil}"]`);
    if (confuso) await escribir('#ay-confuso', confuso);
    await clic('[data-fk="ay-responder"]');
}
async function comprension() {
    actual = 'comprensión';
    await foto('comprension-instruccion');
    await clic('[data-fk="ay-comenzar"]');
    check('barra responder', await hay('[data-fk="tarea-responder"]'), true);
    await foto('comprension-mira-hoy');
    await clic('[data-fk="tarea-responder"]');
    await foto('comprension-preguntas');
    check('hoja a media pantalla', await hay('.ay--mitad'), true);
    await escribir('#ay-f-numero', 'Lo que me queda para gastar hasta la quincena');
    await escribir('#ay-f-sirve', 'Para no quedarme sin dinero');
    await escribir('#ay-f-usarias', 'Sí, si no me pide anotar todo');
    await clic('[data-fk="ay-final"]');
    await foto('fin-resumen');
}
const anotar = async (frase) => {
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', frase);
};

try {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html');
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(400);
    // v2.2: primero se elige el modo. v2.6 (V2-60): la prueba es una de las tres opciones de «Ayuda».
    actual = 'entrada';
    check('elegir modo', await hay('[data-fk="elegir-aprender"]'), true);
    await clic('[data-fk="elegir-aprender"]');
    await clic('[data-fk="tour-saltar"]');
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-prueba"]');
    // Bienvenida para tester. v2.6 (V2-61): dos líneas simples, sin set.
    actual = 'bienvenida';
    check('bienvenida', await texto('.ay-bienvenida'), contiene('Te pongo tareas cortas para ver si la app se entiende.', 'No es un examen para ti: es para la app.', 'Usas datos de ejemplo, no los tuyos.'));
    check('sin letra de set', await texto('.ay'), (x) => !/\bset\b/i.test(x));
    await foto('bienvenida');
    await escribir('#ay-nombre-t', 'Sofi');
    for (const [c, v] of [['pago', 'quincena'], ['dinero', 'ambos'], ['tarjeta', 'si'], ['cuentas', 'cuaderno']]) await clic(`[data-fk="ay-p-${c}-${v}"]`);
    await ev('document.querySelector(".ay-c").scrollTop = 99999; true');
    await foto('bienvenida-perfil');
    await clic('[data-fk="ay-empezar-prueba"]');
    actual = 'instalar';
    check('guía de instalación', await texto('.ay'), contiene('Tenla en tu pantalla de inicio'));
    await foto('instalar');
    await clic('[data-fk="ay-inst-saltar"]');

    // SET A (persona 1).
    await tarea('A1-primer-dia', async () => {
        await clic('[data-fk="ob-empezar"]');
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', '600');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-banco-Agrícola"]');
        await escribir('#ob-banco-monto', '1000');
        await escribir('#ob-efectivo', '40');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-saltar"]');
        await clic('[data-fk="ob-saltar"]');
    });
    await tarea('A2-pupusas', async () => {
        await anotar('pupusas 6');
        await clic('[data-fk="anotar-guardar"]');
    }, { facil: 5 });
    await tarea('A3-colegio', async () => {
        await anotar('acuérdame colegio 20 el 5');
        await clic('[data-fk="op-frecuencia-mensual"]');
        await clic('[data-fk="anotar-guardar"]');
    }, { facil: 3, confuso: 'No sabía qué era «se repite»' });
    await tarea('A4-quincena', async () => {
        await clic('[data-fk="ing-si"]');
        await clic('[data-fk="ing-ok"]');
        await foto('A4-reparte');
        await ev('document.getElementById("vista").scrollTop = 99999; true');
        await foto('A4-reparte-cuadre');
        await clic('[data-fk="rep-listo"]');
    });
    await tarea('A5-laptop', async () => {
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        await clic('[data-fk="a-laptop"]');
        await clic('[data-fk="ap-usar"]');
        await clic('[data-fk="usar-ok"]');
    });
    await tarea('A6-regalo', async () => {
        await anotar('regalo mamá 20');
        await clic('[data-fk="usar-no"]');
        await clic('[data-fk="anotar-guardar"]');
        await clic('[data-fk="aviso-ver"]');
        await clic('[data-fk="ven-si-regalo"]');
        await clic('[data-fk="yl-ok"]');
    });
    await comprension();
    // v2.6 (V2-62): el resultado va en «Cuéntale a Victor o a Pam cómo vas» (la tarjeta del final lleva ahí); sin letra (V2-61).
    actual = 'resumen A';
    await clic('[data-fk="ay-fin-contar"]');
    await foto('fin-cuentale');
    const resA = await ev('document.getElementById("ay-texto")?.value || ""');
    check('resumen A', resA, (x) => x.includes('Nombre: Sofi') && !/\bset\b/i.test(x) && x.includes('me pagan cada quincena') && x.includes('1. Primer día: la logré (la app lo detectó)') && x.includes('toques') && x.includes('Me confundió: No sabía qué era «se repite»') && x.includes('Pantallas:') && x.includes('instalarla al empezar: no lo intenté') && x.includes('¿Qué significa el número grande de Hoy? Lo que me queda'));
    informe.resumenA = resA;

    // Moderador: resumen y nueva persona (le toca el set B). v2.6 (V2-60): solo con ?victor=1.
    actual = 'moderador';
    await clic('[data-fk="ay-x"]');
    await b.ir(base + 'telefono.html?victor=1#tema=' + tema);
    await esperar(400);
    await clic('#btn-ayuda');
    await ev('document.querySelector(".ay-c").scrollTop = 99999; true');
    await foto('ayuda-victor-fin');
    await clic('[data-fk="ay-moderador"]');
    await foto('moderador');
    await clic('[data-fk="ay-nueva"]');
    await foto('moderador-confirmar');
    check('pide confirmar envío', await texto('.ay'), contiene('¿Ya enviaste el resumen de Sofi?'));
    await clic('[data-fk="ay-nueva-si"]');
    check('vuelve la bienvenida', await hay('.ay-bienvenida'), true);
    await escribir('#ay-nombre-t', 'Beto');
    await clic('[data-fk="ay-p-pago-semana"]');
    await clic('[data-fk="ay-empezar-prueba"]');
    await clic('[data-fk="ay-inst-no"]');

    // SET B (persona 2).
    await tarea('B1-pupusas', async () => {
        await anotar('pupusas 6');
        await clic('[data-fk="anotar-guardar"]');
    });
    await tarea('B2-estado-cuenta', async () => {
        await clic('[data-fk="aviso-ver"]');
        await clic('[data-fk="estado-bac"]');
        await escribir('#f-total', '245');
        await escribir('#f-minimo', '25');
        await clic('[data-fk="hoja-ok"]');
        await clic('[data-fk="hoja-ok"]');
    });
    await tarea('B3-laptop-credito', async () => {
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        await clic('[data-fk="a-laptop"]');
        await clic('[data-fk="ap-usar"]');
        await clic('[data-fk="op-medio-bac"]');
        await clic('[data-fk="usar-ok"]');
        await foto('B3-logro-credito');
        check('pago del 5 de diciembre', await texto('#pantalla'), contiene('quedan guardados para el pago del 5 de diciembre'));
        await clic('[data-fk="logro-pagar-ya"]');
        await foto('B3-cuanto-pagas');
        check('cuánto pagas', await texto('.hoja'), (x) => x.includes('Solo la laptop · $600.00') && x.includes('Todo lo que debes · $890.00') && x.includes('Otro monto'));
        await clic('[data-fk="py-ok"]');
        await foto('B3-pagado-laptop');
        check('sigue el pago del 5 nov', await ev('P.calc().tarjetas[0].porPagarEstado'), 24500);
    });
    await tarea('B4-tarjeta-prestamo', async () => {
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        await clic('[data-fk="md-deuda"]');
        await clic('[data-fk="td-tarjeta"]');
        await escribir('#f-nombre', 'Crédito Cuscatlán');
        await escribir('#f-corte', '20');
        await escribir('#f-pagoDia', '10');
        await escribir('#f-ecTotal', '120');
        await escribir('#f-ecMinimo', '15');
        await foto('B4-tarjeta-estado');
        await clic('[data-fk="deuda-ok"]');
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="nuevo-pago"]');
        await clic('[data-fk="np-cuota"]');
        await esperar(150);
        await clic('[data-fk="td-casacomercial"]');
        await escribir('#f-nombre', 'Almacén La Esquina');
        await escribir('#f-cuota', '25');
        await escribir('#f-dia', '28');
        await clic('[data-fk="deuda-ok"]');
    });
    actual = 'B4 Mi dinero';
    await clic('[data-fk="ay-facil-4"]').catch(() => null);
    await tarea('B5-dos-semanas', async () => {
        await clic('[data-fk="aldia"]');
        await clic('[data-fk="adi-si-2026-10-30"]');
        await clic('[data-fk="ad-sig"]');
        await clic('[data-fk="ad-todos"]');
        await clic('[data-fk="ad-sig"]');
        await clic('[data-fk="ad-sig"]');
        await clic('[data-fk="ad-fin"]');
    }, { rendirse: false });
    // v2.6 (V2-63): sin «Carlos sin dinero suficiente» (C33).
    await comprension();
    actual = 'resumen B';
    await clic('[data-fk="ay-fin-contar"]');
    const resB = await ev('document.getElementById("ay-texto")?.value || ""');
    check('resumen B', resB, (x) => x.includes('Nombre: Beto') && !/\bset\b/i.test(x) && x.includes('1. Anotar un gasto:') && x.includes('5. Volver después de dos semanas:') && !/Carlos/.test(x) && x.includes('instalarla al empezar: no pude'));
    informe.resumenB = resB;
    // Una prueba a medias se retoma al volver a abrir.
    actual = 'retomar';
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(400);
    check('al volver, terminado', await hay('.ay-bienvenida'), false);
    await clic('#btn-ayuda');
    check('ver el final al volver', await texto('[data-fk="ay-prueba"]'), contiene('Ya la hiciste: cuéntale a Victor o a Pam cómo te fue'));
    // Set por enlace.
    actual = 'enlace';
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await b.ir('about:blank');
    await b.ir(base + 'index.html?set=B');
    await esperar(500);
    check('redirige con ?set', await ev('location.search'), '?set=B');
    await clic('[data-fk="ay-empezar-prueba"]');
    await clic('[data-fk="ay-inst-saltar"]');
    check('set por enlace', await texto('.ay .paso'), 'Tarea 1 de 6');
    check('primera tarea B', await texto('.ay-tarea--grande'), contiene('pupusas'));
    const origen = await ev('JSON.parse(localStorage.getItem("pamplanea-proto-v2:notas")).prueba.origen');
    check('origen enlace', origen, 'enlace');
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas }, null, 1));
b.cerrar();
