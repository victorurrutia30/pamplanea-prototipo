// LOS DATOS SOBREVIVEN A LA ACTUALIZACIÓN (v2.6; desde la v2.6.1 sirve para cualquier versión). Una versión publicada
// (sacada de git con --ref) servida como en GitHub Pages (subruta /pamplanea-prototipo/), con: datos reales en «Usarla
// con mis datos» (y algo anotado), el progreso de «Aprender a usarla» («Lo esencial» a medias, un capítulo hecho y un
// ejercicio), una prueba guiada en pausa en el set B en su última tarea y el nombre de «Cuéntale…». Después el MISMO
// puerto sirve la versión de esta carpeta: «Hay una versión nueva · Actualizar» y todo sigue igual (sin cambio de
// esquema); también sin internet. Las versiones (vieja y nueva) y la caché nueva se leen de casos.js y sw.js.
// v2.7 (DATOS-5): si la versión nueva es la v2.7 o una posterior, además: la copia intacta por versión
// (`pamplanea-uso:respaldo:antes-de-v2.7.0`), cero pérdidas (cada registro, pago, cuenta, ahorro y tarjeta sigue ahí con
// el mismo monto; lo único nuevo es la cuenta de cada gasto, DATOS-3/F04), los saldos de las cuentas iguales, los números
// «de antes» del cuadrito de novedades iguales a los que mostraba la versión vieja (DATOS-4), y lo mismo con Carlos, Rosa
// y un set sintético que reproduce cada F (F01–F04, F10–F17, F21) creado con la versión vieja.
// v2.8 (DATOS-1 a 5, que siguen vigentes; C-1): la copia es `antes-de-v2.8.0`; lo único nuevo en tus datos, además de la
// cuenta de cada gasto, es dónde está cada ahorro (`donde`: dentro de tu cuenta, C-1). Los números «de antes» del
// cuadrito son los de la versión vieja (con sus reglas). Si la regla nueva de la tarjeta (D-4) o los cobros con tarjeta
// (C-7) cambian tu libre, la app muestra el número nuevo y el cuadrito lo dice con antes y después.
// Uso: node herramientas/actualizar.mjs --ref=7c0d06e   (v2.5)   ·   --ref=ca97256   (v2.6)   [--puerto=8767]
import { execSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const ref = args.ref || '7c0d06e';
const puerto = Number(args.puerto || 8767);
const base = `http://127.0.0.1:${puerto}/pamplanea-prototipo/`;
const salida = path.join(root, 'capturas', 'actualizar-' + ref);
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });

// La v2.5 tal como se publicó, con el mismo servidor de prueba.
const v25 = await mkdtemp(path.join(os.tmpdir(), 'pamplanea-v25-'));
await writeFile(path.join(v25, 'v25.tar'), execSync(`git archive --format=tar ${ref}`, { cwd: root, maxBuffer: 1 << 28 }));
execSync('tar -xf v25.tar', { cwd: v25 });
await rm(path.join(v25, 'v25.tar'));
await mkdir(path.join(v25, 'herramientas'), { recursive: true });
await cp(path.join(root, 'herramientas', 'servidor.mjs'), path.join(v25, 'herramientas', 'servidor.mjs'));
const versionDe = async (carpeta) => /VERSION_PROTOTIPO = '([^']+)'/.exec(await readFile(path.join(carpeta, 'casos.js'), 'utf8'))[1];
const VIEJA = await versionDe(v25);
const NUEVA = await versionDe(root);
const CACHE = 'pamplanea-proto-' + /VERSION_SW = '([^']+)'/.exec(await readFile(path.join(root, 'sw.js'), 'utf8'))[1];

let servidor = null;
async function servir(carpeta) {
    if (servidor) servidor.kill();
    servidor = spawn(process.execPath, [path.join(carpeta, 'herramientas', 'servidor.mjs'), String(puerto)], { stdio: 'ignore' });
    for (let i = 0; i < 80; i++) {
        try {
            await fetch(base);
            return;
        } catch {
            await esperar(100);
        }
    }
    throw new Error('el servidor no levantó');
}
const apagar = async () => {
    if (servidor) servidor.kill();
    servidor = null;
    await esperar(300);
};

const informe = { ref, vieja: VIEJA, nueva: NUEVA, cache: CACHE, fallos: [], datos: {} };
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${nombre}: «${JSON.stringify(real).slice(0, 400)}»`);
    informe.datos[nombre] = real;
};
const b = await abrir({ puerto: 9731 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const ev = (s) => b.evaluar(s);
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error('no encontré ' + sel);
    await esperar(200);
};
const texto = (sel) => ev(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const guardado = () => ev('Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, JSON.parse(localStorage.getItem(k))]))');
const sinHoy = (u) => ({ ...u, st: { ...u.st, hoy: null }, actualizado: null, metricas: { ...u.metricas, dias: null } });
// v2.7 (DATOS-5): desde la v2.7 cada actualización guarda una copia por versión y agrega la cuenta de cada gasto.
const numV = (v) => (/v(\d+)\.(\d+)(?:\.(\d+))?/.exec(v) || []).slice(1).map((x) => +(x || 0));
const desde27 = (v) => {
    const [a, b2] = numV(v);
    return a > 2 || (a === 2 && b2 >= 7);
};
const NUEVA27 = desde27(NUEVA);
const desde28 = (v) => {
    const [a, b2] = numV(v);
    return a > 2 || (a === 2 && b2 >= 8);
};
const NUEVA28 = desde28(NUEVA);
/** v2.8: la clave del cuadrito de la versión nueva. */
const NOV = NUEVA28 ? 'v2.8' : 'v2.7';
/** v2.8: ¿esta línea del cuadrito dice que un número cambió? (v2.7: «Corregimos…»; v2.8: con antes y después). */
const lineaCambio = (l) => (NUEVA28 ? /^(Tu libre era|Tu gasto de \S+ era|Lo que debes de .+ era)/.test(l) : l.startsWith('Corregimos'));
const CLAVE_COPIA = 'pamplanea-uso:respaldo:antes-de-v' + numV(NUEVA).join('.');
/** Lo que ve la persona (en la versión que esté abierta): saldos, libre, Mes y lo que debe de cada tarjeta. */
const NUMEROS = `(() => { const s = P.st; const k = P.calc(); const [y, m] = MOTOR.partes(s.hoy); const mes = MOTOR.resumenMes(s, y, m); return { saldos: Object.fromEntries(s.lugares.map((l) => [l.id, MOTOR.saldoLugar(s, l.id)])), tienes: MOTOR.tienes(s), libre: k.libre, mes: [mes.salio, mes.entro], tarjetas: Object.fromEntries(s.tarjetas.map((t) => { const i = MOTOR.tarjetaInfo(s, t); const debe = i.debeHoy !== undefined ? i.debeHoy : i.ult.inicial && t.debeInicial !== null && t.debeInicial !== undefined ? t.debeInicial + i.debeTotal : null; return [t.id, debe !== null ? debe : i.debeTotal]; })) }; })()`;
/**
 * DATOS-5: cero pérdidas. Cada cosa de antes sigue ahí con TODO lo que tenía (mismo id, mismos montos, mismas fechas); lo
 * único que puede aparecer es la cuenta de un gasto (`lugar`, DATOS-3/F04). Devuelve la lista de diferencias.
 */
function perdidas(viejo, nuevo) {
    const out = [];
    for (const k of ['lugares', 'medios', 'tarjetas', 'apartados', 'logros', 'pagos', 'ingresos', 'registros', 'reservasTarjeta', 'cerrados', 'reservas']) {
        const a = viejo[k] || [];
        const b2 = nuevo[k] || [];
        if (a.length !== b2.length) out.push(`${k}: ${a.length} → ${b2.length}`);
        for (const x of a) {
            const y = b2.find((z) => (x.id !== undefined ? z.id === x.id : JSON.stringify(z) === JSON.stringify(x)));
            if (!y) {
                out.push(`${k}: falta ${x.id || JSON.stringify(x).slice(0, 60)}`);
                continue;
            }
            for (const c of Object.keys(x)) if (JSON.stringify(x[c]) !== JSON.stringify(y[c])) out.push(`${k} ${x.id}.${c}: ${JSON.stringify(x[c]).slice(0, 60)} → ${JSON.stringify(y[c]).slice(0, 60)}`);
            // DATOS-3: la cuenta de cada gasto; v2.8 (C-1): dónde está cada ahorro (dentro de tu cuenta).
            for (const c of Object.keys(y)) if (!(c in x) && !(k === 'registros' && x.tipo === 'gasto' && c === 'lugar') && !(NUEVA28 && k === 'apartados' && c === 'donde')) out.push(`${k} ${x.id}: campo nuevo ${c}`);
        }
    }
    for (const c of ['nombre', 'inicio', 'configurado', 'persona', 'seq']) if (JSON.stringify(viejo[c]) !== JSON.stringify(nuevo[c])) out.push(`${c}: ${JSON.stringify(viejo[c])} → ${JSON.stringify(nuevo[c])}`);
    return out;
}
/**
 * DATOS-5: el set sintético, creado en la página de la versión VIEJA con sus propias funciones de datos: lo que en la
 * v2.6.7 quedaba mal en cada F (los datos tal como los dejaba).
 */
const SINTETICO = `(() => {
    const s = DATOS.crearAna();
    const hoy = P.modos.hoy();
    const d = (n) => MOTOR.sumarDias(hoy, n);
    Object.assign(s, { persona: 'uso', nombre: 'Sintética', hoy, inicio: d(-25) });
    const reg = (f) => { const r = { id: 'r' + s.seq, seq: s.seq, ...f }; s.registros.push(r); s.seq++; return r; };
    // F02 y F03: «debo hoy $2,000», un abono de $100 y una compra de antes de decirlo.
    s.tarjetas.push({ id: 't900', nombre: 'Visa Sintética', emoji: '💳', tipo: 'tarjeta', corte: Number(d(-12).slice(8)), pagoDia: Number(d(10).slice(8)), cupo: null, interesesAnio: 0, desde: d(-5), pagoUsual: 10000, debeInicial: 200000, estados: [{ corte: d(-12), total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: d(18), inicial: true, esperarCorte: true }] });
    s.medios.push({ id: 'mt900', nombre: 'Visa Sintética', emoji: '💳', tarjeta: 't900' });
    reg({ tipo: 'gasto', fecha: d(-8), monto: 5000, nombre: 'Zapatos', categoria: 'ropa', emoji: '👟', medio: 'mt900', anotado: true });
    reg({ tipo: 'pagoTarjeta', fecha: d(-2), monto: 10000, lugar: 'agricola', tarjeta: 't900', nombre: 'Pago de Visa Sintética' });
    // F10, F11 y F13: dos estados de cuenta sin abono para el primero, un abono del día del corte y «Otro monto» < mínimo.
    // (Todo con fechas de después de los cuadres que ya traen los datos de Ana: el único gasto «tardío» es el de F01.)
    s.tarjetas.push({ id: 't901', nombre: 'Master Sintética', emoji: '💳', tipo: 'tarjeta', corte: Number(d(-3).slice(8)), pagoDia: Number(d(17).slice(8)), cupo: null, interesesAnio: 0, desde: d(-90), estados: [{ corte: d(-33), total: 19000, minimo: 2500, aPagar: 19000, opcion: 'total', vence: d(-13) }, { corte: d(-3), total: 40000, minimo: 4000, aPagar: 1000, opcion: 'otro', vence: d(17) }] });
    s.medios.push({ id: 'mt901', nombre: 'Master Sintética', emoji: '💳', tarjeta: 't901' });
    reg({ tipo: 'pagoTarjeta', fecha: d(-3), monto: 3000, lugar: 'agricola', tarjeta: 't901', nombre: 'Pago de Master Sintética' });
    // F12: $50 de los $100 de una cuota, marcado «pagado» (así lo dejaba la v2.6.7).
    s.pagos.push({ id: 'p900', nombre: 'Gimnasio', emoji: '💪', categoria: 'suscripciones', monto: 10000, estimado: false, frecuencia: 'mensual', dia: Number(d(-3).slice(8)), medio: 'debito', avisos: [{ tipo: 'antes', dias: 1, on: false }, { tipo: 'vence', on: false }], desde: d(-40), creado: d(-40), hechos: {}, previos: [] });
    const g = reg({ tipo: 'gasto', fecha: d(-3), monto: 5000, nombre: 'Gimnasio', categoria: 'suscripciones', emoji: '💪', medio: 'debito', pago: 'p900' });
    s.pagos.find((p) => p.id === 'p900').hechos[d(-3)] = { estado: 'pagado', monto: 5000, registro: g.id };
    // F15: un ingreso recibido corregido a $500 cuya llegada seguía en $600.
    s.ingresos.push({ id: 'i900', nombre: 'Venta de ropa', emoji: '🏪', categoria: 'venta', monto: 60000, aprox: false, frecuencia: 'unico', fecha: d(-2), lugar: 'efectivo', principal: false, extra: true, desde: d(-2), llegadas: { [d(-2)]: { monto: 60000 } } });
    reg({ tipo: 'ingreso', fecha: d(-2), monto: 50000, nombre: 'Venta de ropa', categoria: 'venta', emoji: '🏪', lugar: 'efectivo', ingreso: 'i900', ocurrencia: d(-2) });
    // F16: un gasto de un ahorro corregido a $40 con el ahorro todavía en lo de $20.
    const ap = s.apartados.find((a) => a.id === 'emergencias');
    reg({ tipo: 'gasto', fecha: d(-2), monto: 4000, nombre: 'Farmacia', categoria: 'salud', emoji: '💊', medio: 'efectivo', anotado: true, apartado: ap.id, apartadoNombre: ap.nombre, usadoApartado: 2000 });
    ap.monto -= 2000;
    // F17: el abono de $0 que dejaba Pongámonos al día.
    reg({ tipo: 'pagoTarjeta', fecha: d(-1), monto: 0, lugar: 'agricola', tarjeta: 't900', nombre: 'Pago de Visa Sintética' });
    // F01: cuadrar a $20 menos y después anotar ese gasto (con fecha de antes del cuadre). Al final: lo demás ya estaba anotado al cuadrar.
    const esperado = MOTOR.saldoLugar(s, 'efectivo');
    const c = reg({ tipo: 'cuadre', fecha: d(-1), lugar: 'efectivo', monto: esperado - 2000, esperado });
    s.lugares.find((l) => l.id === 'efectivo').cuadre = { fecha: d(-1), seq: c.seq, monto: esperado - 2000 };
    reg({ tipo: 'gasto', fecha: d(-2), monto: 2000, nombre: 'Pupusas', categoria: 'comida', emoji: '🫓', medio: 'efectivo', anotado: true });
    return s;
})()`;

let libreNuevo = null;
try {
    // ------------------------------------------------------------ 1. La v2.5, con todo lo de una persona de la familia.
    await servir(v25);
    await b.ir(base);
    await esperar(800);
    await ev('navigator.serviceWorker.ready.then(() => true)');
    await b.ir(base + 'telefono.html');
    await esperar(800);
    check('la versión vieja: servida y con service worker', [await ev('window.VERSION_PROTOTIPO'), await ev('!!navigator.serviceWorker.controller')], [VIEJA, true]);
    const anotar = (frase) => `{ P.acciones.anotar(); const q = document.getElementById("anotar-q"); q.value = ${JSON.stringify(frase)}; q.dispatchEvent(new Event("input", { bubbles: true })); P.acciones.anotarGuardar(); } true`;
    await clic('[data-fk="elegir-usar"]');
    await clic('[data-fk="intro-empezar"]');
    await ev('{ P.ayuda.cerrar(); const s = DATOS.crearAna(); Object.assign(s, { persona: "uso", hoy: P.modos.hoy(), nombre: "Prueba" }); P.cargar(s, { tab: "hoy" }); P.modos.guardarUso(); } true');
    await ev(anotar('pupusas 9'));
    await esperar(400);
    // Lo de abajo se escribe a mano: que la página no lo pise al salir con lo que tiene en memoria.
    await ev(`(() => {
        P.sinGuardar = true;
        P.modos.guardarEntrenamiento({ caps: { 'fijo:esencial': { paso: 3, hecho: false }, 'fijo:ahorros': { paso: 0, hecho: true } }, tourVersion: 'fijo', tourUltimo: 'fijo:esencial', practicas: { C05: true } });
        const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1'));
        u.nombre = 'Prueba';
        u.feedback = [{ fecha: '2026-10-19', facil: 4, confuso: 'Lo de cuadrar', gustaria: '' }];
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify(u));
        const t = (i) => ({ inicio: 1760000000000 + i * 60000, fin: 1760000000000 + i * 60000 + 30000, toques: 5, pantallas: ['Hoy'], detectada: true, resultado: 'listo', facil: 4 });
        localStorage.setItem('pamplanea-proto-v2:notas', JSON.stringify({ nombre: 'Prueba', notas: {}, prueba: { estado: 'libre', set: 'B', origen: 'alterno', perfil: { pago: 'quincena' }, i: 5, tareas: { pupusas: t(0), 'estado-cuenta': t(1), 'laptop-credito': t(2), 'tarjeta-prestamo': t(3), 'dos-semanas': t(4) }, final: {}, instalada: 'no lo intentó', inicio: '2026-10-19T15:00:00.000Z', enviado: false } }));
        localStorage.setItem('pamplanea-proto-v2:dispositivo', JSON.stringify({ personas: 2, setSiguiente: null }));
        return true;
    })()`);
    await b.ir(base + 'telefono.html');
    await esperar(800);
    const libreAntes = await texto('.portada-n');
    check('v2.5: con sus datos', [await ev('P.modo'), libreAntes, await ev('P.st.registros.some((r) => r.monto === 900)')], (x) => x[0] === 'uso' && /^\$/.test(x[1]) && x[2] === true);
    await b.captura(path.join(salida, '1-v25-con-datos.png'));
    const antes = await guardado();
    // v2.7 (DATOS-5): lo que mostraba la versión vieja con estos datos, y Carlos, Rosa y el set sintético (creados y
    // guardados por la versión vieja, cada uno con su nombre para que no parezcan los ejemplos).
    const viejos = { Prueba: await ev(NUMEROS) };
    const crudos = {};
    if (NUEVA27) {
        for (const [nombre, crear] of [['Carlos P', 'DATOS.crearCarlos()'], ['Rosa P', 'DATOS.crearRosa()'], ['Sintética', SINTETICO]]) {
            await ev(`(() => { const s = ${crear}; Object.assign(s, { persona: 'uso', nombre: ${JSON.stringify(nombre)}, hoy: P.modos.hoy() }); P.cargar(s, { tab: 'hoy' }); P.modos.guardarUso(); return true; })()`);
            await esperar(200);
            viejos[nombre] = await ev(NUMEROS);
            crudos[nombre] = await ev(`localStorage.getItem('pamplanea-uso:v1')`);
        }
        // De vuelta a «Prueba», tal como estaba (sin que la página guarde lo que tiene en memoria al salir).
        await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', ${JSON.stringify(JSON.stringify(antes['pamplanea-uso:v1']))}); true`);
        await b.ir(base + 'telefono.html');
        await esperar(800);
        check('(la versión vieja, otra vez con «Prueba»)', await texto('.portada-n'), libreAntes);
    }
    // ------------------------------------------------------------ 2. Se publica la v2.6 en el mismo lugar.
    await servir(root);
    await ev('navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => true)');
    let aviso = false;
    for (let i = 0; i < 80 && !aviso; i++) {
        await esperar(200);
        aviso = await ev('!!document.getElementById("actualizar")');
    }
    check('«Hay una versión nueva · Actualizar»', await texto('#actualizar'), (t) => typeof t === 'string' && t.includes('Hay una versión nueva') && t.includes('Actualizar'));
    await b.captura(path.join(salida, '2-hay-version-nueva.png'));
    await clic('[data-fk="actualizar"]');
    for (let i = 0; i < 40; i++) {
        await esperar(250);
        if ((await ev('window.VERSION_PROTOTIPO').catch(() => null)) === NUEVA) break;
    }
    await esperar(800);
    check('la versión nueva y solo su caché', [await ev('window.VERSION_PROTOTIPO'), await ev('caches.keys()')], (x) => x[0] === NUEVA && x[1].includes(CACHE) && x[1].length === 1);
    if (NUEVA27) {
        // v2.7 (Parte D): el cuadrito de novedades sale una vez; se cierra para seguir. v2.8: el de la v2.8.
        check(NUEVA28 ? 'v2.8: el cuadrito de novedades' : 'v2.7: el cuadrito de novedades', await texto('#nov-t'), NUEVA28 ? '¡PamPlanea está más clara! ✨' : '¡PamPlanea se puso al día! ✨');
        informe.datos.lineasNovedades = await ev(`[...document.querySelectorAll('.nov-lista li')].map((li) => li.innerText.trim())`);
        await b.captura(path.join(salida, '3a-novedades.png'));
        await clic('[data-fk="nov-ok"]');
    }
    const despues = await guardado();
    if (!NUEVA27) {
        check('mismas claves guardadas (sin respaldo de migración: no hubo cambio de esquema)', Object.keys(despues), Object.keys(antes));
        check('tus datos: iguales (esquema 2)', [despues['pamplanea-uso:v1'].esquema, JSON.stringify(sinHoy(despues['pamplanea-uso:v1'])) === JSON.stringify(sinHoy(antes['pamplanea-uso:v1']))], [2, true]);
    } else {
        // v2.7 (DATOS-1): las mismas claves más UNA copia intacta de lo guardado por la versión vieja.
        check('mismas claves guardadas, más la copia de antes de actualizar (DATOS-1)', Object.keys(despues).filter((k) => k !== CLAVE_COPIA), Object.keys(antes));
        // (La versión vieja vuelve a guardar al abrirse: su fecha de guardado y los días de uso pueden ser otros.)
        check('la copia: intacta (lo que guardó la versión vieja, tal cual)', despues[CLAVE_COPIA] && JSON.stringify(sinHoy(despues[CLAVE_COPIA].datos)) === JSON.stringify(sinHoy(antes['pamplanea-uso:v1'])), true);
        // v2.7 (DATOS-3, DATOS-5): cero pérdidas; lo único nuevo es la cuenta de cada gasto, igual a la de su medio hoy.
        const u0 = antes['pamplanea-uso:v1'];
        const u1 = despues['pamplanea-uso:v1'];
        check('cero pérdidas: cada registro, pago, cuenta, ahorro y tarjeta sigue igual (DATOS-5)', perdidas(u0.st, u1.st), []);
        check('cada gasto guarda la cuenta donde aparece hoy (DATOS-3, F04)', u1.st.registros.filter((r) => r.tipo === 'gasto').every((r) => r.lugar === (r.lugar !== undefined && u0.st.registros.find((x) => x.id === r.id)?.lugar !== undefined ? u0.st.registros.find((x) => x.id === r.id).lugar : (u0.st.medios.find((m) => m.id === r.medio) || {}).lugar || null)), true);
        // v2.8 (C-1): tus ahorros de antes quedan «dentro de» una de tus cuentas (ya se restaban de tu libre).
        if (NUEVA28) check('v2.8: cada ahorro queda dentro de una de tus cuentas (C-1)', u1.st.apartados.every((a) => a.donde && u1.st.lugares.some((l) => l.id === a.donde.lugar)), true);
        const resto = (u) => ({ ...sinHoy(u), st: null, version: null, novedades: null });
        check('lo demás de tus datos (nombre, métricas, respuestas): igual', Object.keys({ ...resto(u0), ...resto(u1) }).filter((k) => JSON.stringify(resto(u0)[k]) !== JSON.stringify(resto(u1)[k])).map((k) => `${k}: ${JSON.stringify(resto(u0)[k])} → ${JSON.stringify(resto(u1)[k])}`), []);
        const nuevos = await ev(NUMEROS);
        check('los saldos de tus cuentas: iguales', nuevos.saldos, viejos.Prueba.saldos);
        const n = u1.novedades && u1.novedades[NOV];
        check('DATOS-4: los números «de antes» son los que mostraba la versión vieja', n && n.antes && [n.antes.mes.salio, n.antes.mes.entro, n.antes.libre, Object.fromEntries(n.antes.tarjetas.map((t) => [t.id, t.debe]))], [viejos.Prueba.mes[0], viejos.Prueba.mes[1], viejos.Prueba.libre, viejos.Prueba.tarjetas]);
        // v2.8: si tu libre cambió con las reglas nuevas, se ve el número nuevo y el cuadrito lo dijo con antes y después.
        if (NUEVA28 && n && n.despues) {
            libreNuevo = await ev(`MOTOR.dinero(${n.despues.libre})`);
            check('v2.8: tu libre es el de ahora (el del cuadrito)', nuevos.libre, n.despues.libre);
            check('v2.8: si un número cambió, el cuadrito lo dice con antes y después (y si no, no)', (informe.datos.lineasNovedades || []).some(lineaCambio), n.antes.mes.salio !== n.despues.mes.salio || n.antes.libre !== n.despues.libre || n.antes.tarjetas.some((t) => t.debe !== n.despues.tarjetas.find((x) => x.id === t.id).debe));
        }
    }
    check('el progreso de «Aprender a usarla»: igual', despues['pamplanea-entrenamiento'], antes['pamplanea-entrenamiento']);
    check('la prueba guiada y el teléfono: iguales', [despues['pamplanea-proto-v2:notas'], despues['pamplanea-proto-v2:dispositivo']], [antes['pamplanea-proto-v2:notas'], antes['pamplanea-proto-v2:dispositivo']]);
    check('se abre con tus datos y el mismo libre (v2.8: el de ahora, si cambió con D-4 o C-7)', [await ev('P.modo'), await texto('.portada-n'), await texto('#btn-ayuda')], ['uso', libreNuevo || libreAntes, 'Ayuda']);
    await b.captura(path.join(salida, '3-v26-con-datos.png'));
    // Lo que se ve con lo guardado.
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-tour"]');
    check('«Aprender a usarla»: «Lo esencial» a medias y «Ahorros» hecho', await texto('.ay'), (t) => t.includes('Ibas en el paso 4 de 6') && t.includes('1 de 5 hechos'));
    await b.captura(path.join(salida, '4-aprender-a-usarla.png'));
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    check('«Prueba guiada»: sigue donde iba (la tarea de Carlos ya no está)', await texto('[data-fk="ay-prueba"]'), 'Prueba guiada La dejaste en la tarea 6 de 6');
    await clic('[data-fk="au-contar"]');
    const t = await ev('document.getElementById("ay-texto").value');
    check('«Cuéntale…»: su nombre, sus respuestas y la prueba (sin Carlos ni letra)', t, (x) => x.includes('Nombre: Prueba') && x.includes('Cómo me ha ido:') && x.includes('Prueba guiada: la dejé en la tarea 6 de 6') && x.includes('5. Volver después de dos semanas: la logré') && !/Carlos|\bset\b/i.test(x));
    await b.captura(path.join(salida, '5-cuentale.png'));
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-prueba"]');
    check('retomar: la última tarea, con los ejemplos', [await ev('P.modo'), await texto('.ay .paso')], ['entrenamiento', 'Tarea 6 de 6 · la última']);
    await clic('[data-fk="ay-x"]');
    await clic('#btn-ayuda');
    await clic('[data-fk="ay-g-salir"]');
    await clic('[data-fk="ay-usar"]');
    check('de vuelta a tus datos, igual', [await ev('P.modo'), await texto('.portada-n')], ['uso', libreNuevo || libreAntes]);
    // ------------------------------------------------------------ v2.7 (DATOS-5): Carlos, Rosa y el set sintético.
    if (NUEVA27) {
        const principal = await ev(`localStorage.getItem('pamplanea-uso:v1')`);
        for (const nombre of Object.keys(crudos)) {
            // Lo que guardó la versión vieja, como si esa persona abriera ahora la nueva (sin la copia de «Prueba»).
            await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', ${JSON.stringify(crudos[nombre])}); localStorage.removeItem(${JSON.stringify(CLAVE_COPIA)}); true`);
            await b.ir(base + 'telefono.html');
            await esperar(900);
            const r = await ev(`({ modo: P.modo, nombre: P.st && P.st.nombre, bloqueo: P.modos.bloqueado(), nov: !!document.getElementById('nov-t'), lineas: [...document.querySelectorAll('.nov-lista li')].map((li) => li.innerText.trim()) })`);
            check(`${nombre}: abre con sus datos y el cuadrito`, [r.modo, r.nombre, r.bloqueo, r.nov], ['uso', nombre, false, true]);
            if (nombre === 'Sintética') await b.captura(path.join(salida, '7-sintetica-novedades.png'));
            await clic('[data-fk="nov-ok"]');
            const g = await guardado();
            const viejo = JSON.parse(crudos[nombre]);
            check(`${nombre}: la copia por versión, intacta`, g[CLAVE_COPIA] && JSON.stringify(g[CLAVE_COPIA].datos) === crudos[nombre], true);
            check(`${nombre}: cero pérdidas`, perdidas(viejo.st, g['pamplanea-uso:v1'].st), []);
            const nuevos = await ev(NUMEROS);
            check(`${nombre}: los saldos de sus cuentas, iguales`, nuevos.saldos, viejos[nombre].saldos);
            const n = g['pamplanea-uso:v1'].novedades[NOV];
            check(`${nombre}: los números «de antes» son los que mostraba la versión vieja (DATOS-4)`, [n.antes.mes.salio, n.antes.mes.entro, n.antes.libre, Object.fromEntries(n.antes.tarjetas.map((t) => [t.id, t.debe]))], [viejos[nombre].mes[0], viejos[nombre].mes[1], viejos[nombre].libre, viejos[nombre].tarjetas]);
            const cambio = n.antes.mes.salio !== n.despues.mes.salio || n.antes.libre !== n.despues.libre || n.antes.tarjetas.some((t) => t.debe !== n.despues.tarjetas.find((x) => x.id === t.id).debe);
            check(`${nombre}: si un número cambió, el cuadrito lo dice (y si no, no)`, r.lineas.some(lineaCambio), cambio);
            if (nombre === 'Sintética' && !desde27(VIEJA)) {
                check('Sintética: F01 — el gasto del mes ya no cuenta $20 dos veces', n.antes.mes.salio - n.despues.mes.salio, 2000);
                check('Sintética: F02/F03 — lo que debe de Visa: $2,050 → $1,900', [n.antes.tarjetas.find((t) => t.id === 't900').debe, n.despues.tarjetas.find((t) => t.id === 't900').debe], [205000, 190000]);
                // F04: cambiar después la cuenta del débito no mueve lo de antes.
                const antesF04 = await ev(`MOTOR.saldoLugar(P.st, 'agricola')`);
                await ev(`P.cambiar((s) => { s.medios.find((m) => m.id === 'debito').lugar = 'efectivo'; }, { aviso: null }); true`);
                check('Sintética: F04 — cambiar la cuenta del débito después no mueve lo de antes', await ev(`MOTOR.saldoLugar(P.st, 'agricola')`), antesF04);
            }
            if (nombre === 'Sintética') {
                check('Sintética: F12 — lo de $50 de $100 marcado «pagado» en la v2.6.7 sigue igual (no se cambia solo)', await ev(`MOTOR.ocurrenciasPago(P.st, MOTOR.pago(P.st, 'p900'), '2026-01-01', P.st.hoy).map((o) => o.estado + ' ' + o.monto).slice(-1)`), ['pagado 5000']);
            }
        }
        // De vuelta a «Prueba», ya actualizada.
        await ev(`P.sinGuardar = true; localStorage.setItem('pamplanea-uso:v1', ${JSON.stringify(principal)}); true`);
        await b.ir(base + 'telefono.html');
        await esperar(800);
    }
    // ------------------------------------------------------------ 3. Sin internet: abre la v2.6 con todo.
    await apagar();
    await b.ir(base);
    await esperar(900);
    check('sin internet: la versión nueva con tus datos', [await ev('window.VERSION_PROTOTIPO'), await ev('P.modo'), await texto('.portada-n'), await ev('document.fonts.check("16px Instrument Sans")')], [NUEVA, 'uso', libreNuevo || libreAntes, true]);
    await b.captura(path.join(salida, '6-sin-internet.png'));
} catch (e) {
    informe.fallos.push('excepción: ' + e.message);
    await b.captura(path.join(salida, 'ERROR.png')).catch(() => null);
}
informe.errores = b.errores;
informe.fallidas = b.fallidas.filter((f) => !/ERR_CONNECTION_REFUSED/.test(f));
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas }, null, 1));
b.cerrar();
await apagar();
await rm(v25, { recursive: true, force: true }).catch(() => null);
