// Entrega 2 (v2.3): primer día con varios bancos, billetera y dos tarjetas de crédito (V2-45), deudas con
// «+ Otro» y suscripción en pagos fijos (V2-46, V2-47), Mi dinero con tres puertas (V2-49), Pagos con dos
// vistas (V2-39), «Ahorros» en toda la app (V2-41) y suscripciones en Mes. Uso: node herramientas/entrega2-v23.mjs [--base=…] [--tema=…]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const salida = path.join(root, 'capturas', 'entrega2-v23' + (args.base ? '-servida' : ''), tema);
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9801) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const informe = { fallos: [], errores: b.errores, fallidas: b.fallidas };
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
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 240)}»`);
};
const contiene = (...subs) => (x) => typeof x === 'string' && subs.every((s) => x.includes(s));
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(400);
}
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__fechaPrueba = "2026-10-17";' });

try {
    actual = 'primer-dia';
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
    await clic('[data-fk="elegir-usar"]');
    await clic('[data-fk="intro-empezar"]');
    await escribir('#ob-nombre', 'Pam');
    await clic('[data-fk="ob-empezar"]');
    await clic('[data-fk="ob-i-quincena"]');
    await escribir('#ob-q-monto', '600');
    await clic('[data-fk="ob-sig"]');
    // V2-45: dos bancos y una billetera.
    await clic('[data-fk="ob-banco-Agrícola"]');
    await escribir('#ob-banco-monto', '300');
    await clic('[data-fk="ob-banco-mas"]');
    await clic('[data-fk="ob-banco1-Cuscatlán"]');
    await escribir('#ob-banco1-monto', '150');
    await clic('[data-fk="ob-bill-mas"]');
    await escribir('#ob-bill0-nombre', 'Tigo Money');
    await escribir('#ob-bill0-monto', '20');
    await escribir('#ob-efectivo', '40');
    await foto('dos-bancos-billetera');
    await clic('[data-fk="ob-sig"]');
    // Dos tarjetas de crédito y transferencias.
    check('débito por banco', await texto('.ob-ops'), contiene('Tarjeta de débito Agrícola', 'Tarjeta de débito Cuscatlán', 'Tigo Money'));
    await clic('[data-fk="ob-m-transferencia"]');
    await clic('[data-fk="ob-m-credito"]');
    await clic('[data-fk="ob-credito-banco-BAC"]');
    await escribir('#ob-credito-corte', '15');
    await escribir('#ob-credito-pago', '5');
    await clic('[data-fk="ob-credito-mas"]');
    await clic('[data-fk="ob-credito1-banco-Cuscatlán"]');
    await escribir('#ob-credito1-corte', '20');
    await escribir('#ob-credito1-pago', '10');
    await foto('dos-tarjetas');
    await clic('[data-fk="ob-sig"]');
    // V2-46: dos préstamos y una tarjeta (cuota); V2-47: una suscripción.
    for (const [deuda, nombre, cuota, dia] of [['prestamo', 'Préstamo Liss', '156', '30'], ['prestamo', 'Préstamo', '79', '30'], ['tarjeta', 'Tarjeta Cuscatlán', '50', '10']]) {
        await clic(`[data-fk="ob-d-${deuda}"]`);
        await escribir('#ob-p-nombre', nombre);
        await escribir('#ob-p-monto', cuota);
        await clic(`[data-fk="ob-p-dia-${dia}"]`);
        await clic('[data-fk="ob-p-agregar"]');
    }
    check('«+ Otro préstamo»', await texto('[data-fk="ob-d-prestamo"]'), contiene('Otro préstamo', '2'));
    await clic('[data-fk="ob-s-nueva"]');
    await clic('[data-fk="ob-p-servicio-netflix"]');
    await escribir('#ob-p-monto', '9.99');
    await clic('[data-fk="ob-p-dia-12"]');
    await foto('suscripcion');
    await clic('[data-fk="ob-p-agregar"]');
    await foto('pagos-fijos');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="pn-listo"]');
    const st = await ev('({ lugares: P.st.lugares.map((l) => [l.id, l.nombre, window.MOTOR.saldoLugar(P.st, l.id)]), medios: P.st.medios.map((m) => m.nombre), tarjetas: P.st.tarjetas.map((t) => [t.nombre, t.corte, t.pagoDia]), pagos: P.st.pagos.map((p) => [p.nombre, p.monto, p.tipoDeuda || p.tipoPago || "", p.medio]) })');
    check('lugares', st.lugares, [['efectivo', 'Efectivo', 4000], ['banco', 'Banco Agrícola', 30000], ['banco2', 'Banco Cuscatlán', 15000], ['billetera1', 'Tigo Money', 2000]]);
    // v2.3.1 (V2-54): la «Tarjeta» de los pagos fijos es una tarjeta de crédito de verdad (sin corte todavía), no una cuota.
    check('medios', st.medios, ['Efectivo', 'Débito Agrícola', 'Transferencia Agrícola', 'Débito Cuscatlán', 'Transferencia Cuscatlán', 'Tigo Money', 'Crédito BAC', 'Crédito Cuscatlán', 'Tarjeta Cuscatlán']);
    check('tres tarjetas (la del paso 4 sin corte)', st.tarjetas, [['Crédito BAC', 15, 5], ['Crédito Cuscatlán', 20, 10], ['Tarjeta Cuscatlán', null, 10]]);
    check('pagos', st.pagos, [['Préstamo Liss', 15600, 'prestamo', 'debito'], ['Préstamo', 7900, 'prestamo', 'debito'], ['Netflix', 999, 'suscripcion', 'credito']]);

    // V2-49: Mi dinero con tres puertas.
    actual = 'mi-dinero';
    await clic('[data-fk="nav-midinero"]');
    await foto('mi-dinero');
    check('resumen (nunca «Debes $0.00» si hay cuotas sin saldo)', await texto('.total'), contiene('Tienes', '$510.00', 'Ahorros $0.00', 'Cuotas $285.00 al mes'));
    check('tres puertas', await ev('[...document.querySelectorAll(".puerta .puerta-t")].map((x) => x.textContent)'), ['Cuentas', 'Ahorros', 'Deudas']);
    await clic('[data-fk="md-cuentas"]');
    await foto('cuentas');
    check('cuentas: volver', await texto('[data-fk="atras"]'), 'Mi dinero');
    check('cuentas: lugares y medios', await texto('#pantalla'), contiene('Tigo Money', 'Crédito Cuscatlán', 'Cuadrar', 'Mover', 'Agregar otra tarjeta o medio'));
    await clic('[data-fk="atras"]');
    await clic('[data-fk="md-ahorros"]');
    await foto('ahorros');
    check('ahorros: la línea', await texto('#pantalla'), contiene('Tus ahorros siguen en tu banco o efectivo; solo les pones nombre'));
    await clic('[data-fk="atras"]');
    await clic('[data-fk="md-deudas"]');
    await foto('deudas');
    check('deudas', await texto('#pantalla'), contiene('Préstamo Liss', 'Préstamo', 'Tarjeta Cuscatlán', 'Crédito BAC', 'Crédito Cuscatlán'));
    await clic('[data-fk="atras"]');
    check('barra inferior igual', await ev('[...document.querySelectorAll("#nav .nav-t")].map((x) => x.textContent)'), ['Hoy', 'Pagos', 'Anotar', 'Mi dinero', 'Mes']);

    // V2-39: Pagos con dos vistas.
    actual = 'pagos';
    await clic('[data-fk="nav-pagos"]');
    check('dos vistas', await ev('[...document.querySelectorAll(".pagos-modo .app-tab")].map((x) => x.textContent)'), ['Calendario', 'Mis pagos e ingresos']);
    await clic('[data-fk="modo-lista"]');
    await foto('mis-pagos');
    check('lista completa', await texto('#pantalla'), contiene('Lo que te pagan', 'Quincena', 'Cuotas y préstamos', 'Préstamo Liss', 'Suscripciones', 'Netflix', 'Pagas ~$9.99 al mes en suscripciones', 'Con la quincena de antes de que venza'));
    await clic('[data-fk="mp-p6"]').catch(() => null);

    // V2-47: «+ Pago» → Suscripción, con tarjeta de crédito por defecto; Mes lo suma.
    actual = 'suscripcion';
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="nuevo-pago"]');
    await clic('[data-fk="np-suscripcion"]');
    await clic('[data-fk="op-servicio-spotify"]');
    await escribir('#f-monto', '5.99');
    await clic('[data-fk="dia-dia-20"]');
    await foto('nueva-suscripcion');
    check('medio por defecto: crédito', await ev('window.MOTOR.medio(P.st, P.ui.hoja.medio)?.nombre'), 'Crédito BAC');
    check('solo mensual o anual', await ev('[...document.querySelectorAll("[data-campo=frecuencia]")].map((x) => x.dataset.v)'), ['mensual', 'anual']);
    await clic('[data-fk="hoja-ok"]');
    await clic('[data-fk="nav-mes"]');
    await foto('mes-suscripciones');
    check('Mes: suscripciones al mes', await texto('[data-fk="mes-suscripciones"]'), 'Pagas ~$15.98 al mes en suscripciones');

    // V2-41: «Ahorros» en toda la app.
    actual = 'ahorros';
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', 'ahorré 20 viaje');
    check('intérprete: ahorrar', await texto('#anotar-chips'), contiene('Ahorrar', 'Viaje'));
    await clic('[data-fk="anotar-guardar"]');
    await clic('[data-fk="nav-midinero"]');
    check('sin «apartado» en Mi dinero', await ev('/apartad/i.test(document.getElementById("pantalla").textContent)'), false);
    await clic('[data-fk="md-ahorros"]');
    check('sin «apartado» en Ahorros', await ev('/apartad/i.test(document.getElementById("pantalla").textContent)'), false);
    await clic('[data-fk="nav-hoy"]');
    await clic('[data-fk="portada"]');
    check('desglose: Ahorros', await texto('.desglose'), contiene('Ahorros', '$20.00'));
    check('sin «apartado» en el detalle', await ev('/apartad/i.test(document.querySelector(".hoja").textContent)'), false);
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas }, null, 1));
b.cerrar();
