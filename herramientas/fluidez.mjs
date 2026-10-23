// FLUIDEZ (cierre de la v2.8, APROBADO por Victor 2026-10-22: «hagamos pruebas de fluidez también» y «que mida la fluidez
// bonita»). Chrome a 390×844 con la CPU 4 veces más lenta (un teléfono de gama media) y dos juegos de datos:
//   a) los de Victor en el guion (un archivo con lo guardado: --datos=<archivo.json>; sin archivo, se salta);
//   b) uno sintético de un año: ~1,500 movimientos, 25 gastos fijos, 6 presupuestos, 3 tarjetas, 4 ahorros, 24 quincenas.
// Mide la mediana de 5 repeticiones de: abrir la app hasta ver el Libre; cambiar de pestaña; Esta quincena / Próxima /
// Mes; Ver por tipo; abrir Anotar; guardar un gasto hasta ver el Libre nuevo; lista → ficha; el buscador del Historial.
// Metas: abrir ≤ 2 s; cada interacción ≤ 200 ms; guardar ≤ 300 ms. Y la fluidez visual: sin saltos de contenido (CLS ≈ 0)
// al cambiar de pestaña, abrir hojas o cambiar de periodo; animaciones cortas; con «reducir movimiento», nada se mueve.
// Uso: node herramientas/fluidez.mjs [--datos=<lo guardado de Victor, json>] [--solo=a|b] [--reps=5] [--puerto=9971]
// Sale con 1 si los datos a) pasan de alguna meta (los de b) solo se informan: no bloquean).
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const REPS = Number(args.reps || 5);
const FECHA = args.fecha || '2026-10-22';
const URL_APP = pathToFileURL(path.join(aqui, 'telefono.html')).href;
const META = { abrir: 2000, interaccion: 200, guardar: 300, cls: 0.01, animacion: 400 };
const mediana = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? Math.round(s[Math.floor(s.length / 2)]) : null;
};

/** El set sintético de un año, armado en la página con la forma de los datos de la app. */
const SINTETICO = `((hoy) => {
    const D = window.DATOS;
    const M = window.MOTOR;
    let seq = 10;
    const st = { persona: 'uso', nombre: 'Prueba', espacio: 'Mi casa', hoy, inicio: '2025-10-15', configurado: true, horizonteVariable: null, logros: [], avisos: [], reservasTarjeta: [], cerrados: [], reservas: [], interesInvitar: false, categoriasPropias: [], registros: [], pagos: [], variables: [], apartados: [], tarjetas: [] };
    st.lugares = [
        { id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵', cuadre: { fecha: '2025-10-15', seq: 1, monto: 20000 } },
        { id: 'banco', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦', cuadre: { fecha: '2025-10-15', seq: 2, monto: 250000 } },
        { id: 'banco2', tipo: 'banco', nombre: 'Banco Cuscatlán', emoji: '🏦', cuadre: { fecha: '2025-10-15', seq: 3, monto: 80000 } },
    ];
    st.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }, { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'banco', tarjetaDebito: true }, { id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: 'banco' }];
    st.registros.push({ id: 'r1', seq: 1, tipo: 'cuadre', fecha: '2025-10-15', lugar: 'efectivo', monto: 20000, esperado: 20000, primero: true }, { id: 'r2', seq: 2, tipo: 'cuadre', fecha: '2025-10-15', lugar: 'banco', monto: 250000, esperado: 250000, primero: true }, { id: 'r3', seq: 3, tipo: 'cuadre', fecha: '2025-10-15', lugar: 'banco2', monto: 80000, esperado: 80000, primero: true });
    const reg = (x) => { const r = { id: 'r' + seq, seq: seq++, ...x }; st.registros.push(r); return r; };
    // 24 quincenas que llegaron.
    const q = { id: 'quincena', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: 90000, aprox: true, frecuencia: 'quincenal', dias: [15, 30], lugar: 'banco', principal: true, desde: '2025-10-15', creado: '2025-10-15', llegadas: {} };
    st.ingresos = [q];
    for (const f of M.ocurrenciasIngreso(st, q, '2025-10-15', M.sumarDias(hoy, -1)).map((o) => o.fecha)) {
        const r = reg({ tipo: 'ingreso', fecha: f, monto: 90000, nombre: 'Quincena', categoria: 'salario', emoji: '💼', lugar: 'banco', ingreso: 'quincena', ocurrencia: f });
        q.llegadas[f] = { monto: 90000, registro: r.id };
    }
    // 3 tarjetas.
    for (const [i, n] of ['Crédito BAC', 'Visa Cuscatlán', 'Mastercard Agrícola'].entries()) {
        const id = 't' + i;
        st.tarjetas.push({ id, nombre: n, emoji: '💳', tipo: 'tarjeta', corte: 5 + i * 5, pagoDia: 25 - i * 3, cupo: 150000, interesesAnio: 0, desde: '2025-10-15', medio: 'debito', pagoUsual: 10000 + i * 5000, estados: [{ corte: '2025-10-' + String(5 + i * 5).padStart(2, '0'), total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: '2025-10-' + String(25 - i * 3).padStart(2, '0'), inicial: true, esperarCorte: true }] });
        st.medios.push({ id: 'm' + id, nombre: n, emoji: '💳', tarjeta: id });
    }
    // 25 gastos fijos, pagados mes a mes hasta ayer.
    const nombres = ['Luz', 'Agua', 'Internet', 'Cable', 'Plan de celular', 'Gas', 'Vigilancia', 'Alquiler', 'Colegio', 'Seguro', 'Ayuda a la familia', 'Netflix', 'Spotify', 'Gimnasio', 'Cuota del carro', 'Préstamo', 'Cuota de casa comercial', 'Clases de inglés', 'Mantenimiento', 'Jardinero', 'Lavandería', 'Escuela de fútbol', 'Seguro médico', 'Donación', 'Ahorro escolar'];
    nombres.forEach((n, i) => {
        st.pagos.push({ id: 'p' + i, nombre: n, emoji: '🧾', categoria: i < 7 ? 'servicios' : i >= 14 && i <= 16 ? 'cuotas' : 'otros', monto: 1500 + i * 700, estimado: i < 2, frecuencia: 'mensual', dia: 1 + ((i * 3) % 28), medio: i === 11 || i === 12 ? 'mt0' : 'debito', avisos: [], desde: '2025-10-15', creado: '2025-10-15', hechos: {}, previos: [], ...(i >= 14 && i <= 16 ? { tipoDeuda: 'prestamo', deuda: { debe: 300000 } } : {}), ...(i === 11 || i === 12 ? { tipoPago: 'suscripcion' } : {}) });
    });
    for (const p of st.pagos) for (const o of M.ocurrenciasPago(st, p, '2025-10-15', M.sumarDias(hoy, -1))) {
        const r = reg({ tipo: 'gasto', fecha: o.fecha, monto: p.monto, nombre: p.nombre, categoria: p.categoria, emoji: p.emoji, medio: p.medio, lugar: 'banco', pago: p.id });
        p.hechos[o.fecha] = { estado: 'pagado', monto: p.monto, registro: r.id };
    }
    // 6 presupuestos.
    [['Súper', '🛒', 'super', 30000], ['Mercado', '🧺', 'mercado', 8000], ['Gasolina', '⛽', 'transporte', 10000], ['Comida afuera', '🍔', 'comida', 6000], ['Farmacia', '💊', 'salud', 4000], ['Salidas', '🎉', 'salidas', 5000]].forEach(([n, e, c, t], i) => st.variables.push({ id: 'v' + i, nombre: n, emoji: e, categoria: c, tope: t, medio: 'efectivo', desde: '2025-10-15', creado: '2025-10-15', cierres: {}, activo: true }));
    // 4 ahorros, con lo que guardaste cada mes.
    ['Emergencias', 'Vacaciones', 'Laptop', 'Navidad'].forEach((n, i) => {
        const a = { id: 'a' + i, nombre: n, emoji: '🐷', portada: 'general-alcancia', monto: 0, meta: null, metaFecha: null, historial: [], donde: { lugar: 'banco2' }, ...(i === 0 ? { programado: { monto: 5000, desde: '2025-10-15' } } : {}) };
        for (let m = 0; m < 12; m++) { const f = M.sumarDias('2025-10-20', m * 30); a.monto += 2000; a.historial.unshift({ fecha: f, tipo: 'apartar', monto: 2000 }); }
        st.apartados.push(a);
    });
    // ~1,100 gastos del día a día y los pagos de las tarjetas.
    const dia = [['Pupusas', 'comida', 600], ['Súper', 'super', 3500], ['Café', 'comida', 250], ['Bus', 'transporte', 50], ['Mercado', 'mercado', 1200], ['Gasolina', 'transporte', 2500], ['Farmacia', 'salud', 900], ['Cine', 'salidas', 800], ['Regalo', 'regalos', 1500], ['Zapatos', 'ropa', 4000]];
    let f = '2025-10-16';
    let k = 0;
    while (f < hoy) {
        for (let j = 0; j < 3; j++) {
            const [n, c, m] = dia[(k * 7 + j * 3) % dia.length];
            const medio = k % 9 === 0 ? 'mt' + (k % 3) : k % 2 ? 'efectivo' : 'debito';
            reg({ tipo: 'gasto', fecha: f, monto: m + (k % 5) * 25, nombre: n, categoria: c, emoji: D.CATEGORIAS.find((x) => x.id === c).emoji, medio, lugar: medio === 'efectivo' ? 'efectivo' : 'banco', anotado: true });
            k++;
        }
        if (M.partes(f)[2] === 20) for (const t of st.tarjetas) reg({ tipo: 'pagoTarjeta', fecha: f, monto: 8000, nombre: 'Pago de tarjeta', tarjeta: t.id, lugar: 'banco' });
        f = M.sumarDias(f, 1);
    }
    st.seq = seq;
    return st;
})`;

let puerto = Number(args.puerto || 9971);
async function medir(nombre, cargarDatos) {
    const b = await abrir({ puerto: puerto++ });
    const out = { nombre, tiempos: {}, cls: {}, animaciones: {} };
    try {
        await b.tamano(390, 844);
        await b.enviar('Emulation.setCPUThrottlingRate', { rate: 4 });
        await b.enviar('Page.addScriptToEvaluateOnNewDocument', {
            source: `window.__fechaPrueba = '${FECHA}';
                window.__cls = 0; window.__clsLista = [];
                try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__cls += e.value; window.__clsLista.push(Math.round(e.value * 1000) / 1000); } }).observe({ type: 'layout-shift', buffered: true }); } catch {}
                new MutationObserver((ms, o) => { if (!window.__tLibre && document.querySelector('.portada-n')) { window.__tLibre = performance.now(); o.disconnect(); } }).observe(document, { childList: true, subtree: true });`,
        });
        const ev = (s) => b.evaluar(s);
        await b.ir(URL_APP);
        await esperar(600);
        out.datos = await cargarDatos(ev);
        // 1) Abrir la app hasta ver el Libre (cada vez, recargando).
        const abrirMs = [];
        for (let i = 0; i < REPS; i++) {
            await b.ir(URL_APP, 'document.readyState === "complete" && !!window.__tLibre');
            abrirMs.push(await ev('window.__tLibre'));
        }
        out.tiempos.abrir = mediana(abrirMs);
        out.libre = await ev(`document.querySelector('.portada-n')?.textContent`);
        out.pantalla = await ev(`document.querySelector('#pantalla h1')?.textContent || document.querySelector('#pantalla')?.innerText.slice(0, 60)`);
        // Una interacción: del toque al cuadro siguiente ya pintado (rAF + setTimeout).
        const tocar = (sel, antes = '') => ev(`(async () => { ${antes}; const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const t0 = performance.now(); el.click(); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return performance.now() - t0; })()`);
        const clsDe = async (fn) => {
            await ev('window.__cls = 0; window.__clsLista = []; true');
            await fn();
            await esperar(300);
            return Math.round((await ev('window.__cls')) * 1000) / 1000;
        };
        const serie = async (clave, sel, preparar = '') => {
            const xs = [];
            for (let i = 0; i < REPS; i++) {
                const t = await tocar(sel, preparar);
                if (t !== null) xs.push(t);
            }
            out.tiempos[clave] = mediana(xs);
        };
        await ev(`P.ui.hoja && P.cerrarHoja({ sinFoco: true }); P.irTab('hoy'); true`);
        // 2) Pestañas: Hoy → Mi plan → Mes → Mi dinero (y de vuelta a Hoy).
        out.cls.pestanas = await clsDe(async () => {
            const xs = { pagos: [], mes: [], midinero: [], hoy: [] };
            for (let i = 0; i < REPS; i++) for (const t of ['pagos', 'mes', 'midinero', 'hoy']) xs[t].push(await tocar(`[data-fk="nav-${t}"]`));
            for (const t of Object.keys(xs)) out.tiempos['pestaña ' + t] = mediana(xs[t]);
        });
        // 3) Esta quincena / Próxima / Mes.
        await ev(`P.ui.pagosModo = 'fecha'; P.irTab('pagos'); true`);
        out.cls.periodos = await clsDe(async () => {
            for (const v of ['proxima', 'mes', 'actual']) await serie('periodo ' + v, `[data-fk="tab-${v}"]`);
        });
        // 4) Ver por tipo (y de vuelta por fecha).
        out.cls.porTipo = await clsDe(async () => {
            const xs = [];
            const ys = [];
            for (let i = 0; i < REPS; i++) {
                xs.push(await tocar('[data-fk="ver-tipo"]'));
                ys.push(await tocar('[data-fk="ver-fecha"]'));
            }
            out.tiempos['ver por tipo'] = mediana(xs);
            out.tiempos['ver por fecha'] = mediana(ys);
        });
        // 5) Abrir Anotar (y cerrarlo).
        await ev(`P.irTab('hoy'); true`);
        out.cls.hojas = await clsDe(async () => {
            const xs = [];
            for (let i = 0; i < REPS; i++) {
                xs.push(await tocar('[data-fk="nav-anotar"]'));
                await ev('P.cerrarHoja({ sinFoco: true }); true');
                await esperar(80);
            }
            out.tiempos['abrir Anotar'] = mediana(xs);
        });
        // 6) Guardar un gasto hasta ver el Libre nuevo.
        const guardar = [];
        for (let i = 0; i < REPS; i++) {
            await ev(`(() => { P.irTab('hoy'); P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'pupusas ${i + 2} efectivo'; q.dispatchEvent(new Event('input', { bubbles: true })); P.acciones.anotarValor({ campo: 'enQue', v: 'comida' }); return true; })()`);
            await esperar(80);
            const antes = await ev(`P.st.registros.length`);
            let t = await tocar('[data-fk="anotar-guardar"]');
            if (await ev('!!document.querySelector(\'[data-fk="orden-despues"]\')')) {
                await ev(`document.querySelector('[data-fk="orden-despues"]').click(); true`);
                t = await tocar('[data-fk="anotar-guardar"]');
            }
            // Guardado: la hoja se cerró y el gasto está (con Libre en $0 el número no cambia).
            const ok = await ev(`!P.ui.hoja && P.st.registros.length > ${antes}`);
            if (ok && t !== null) guardar.push(t);
        }
        out.tiempos['guardar un gasto'] = mediana(guardar);
        // 7) Lista → ficha (una fila de Mi plan) y atrás.
        await ev(`P.ui.pagosModo = 'fecha'; P.ui.pagosVista = 'mes'; P.irTab('pagos'); true`);
        const ficha = [];
        for (let i = 0; i < REPS; i++) {
            ficha.push(await tocar('#pantalla .pl-b[data-a="abrir"]'));
            await ev('P.atras(); true');
        }
        out.tiempos['lista → ficha'] = mediana(ficha.filter((x) => x !== null));
        // 8) El buscador del Historial (una letra más cada vez).
        await ev(`P.irTab('mes'); true`);
        const buscar = [];
        for (const q of ['p', 'pu', 'pup', 'su', 'ca']) {
            buscar.push(await ev(`(async () => { const el = document.getElementById('mes-buscar'); el.value = ${JSON.stringify(q)}; const t0 = performance.now(); el.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); return performance.now() - t0; })()`));
        }
        out.tiempos['buscar en el Historial'] = mediana(buscar);
        await ev(`(() => { const el = document.getElementById('mes-buscar'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
        // Fluidez visual: las animaciones al abrir una hoja, con y sin «reducir movimiento».
        const animaciones = async () => ev(`(async () => { P.irTab('hoy'); P.acciones.anotar(); await new Promise((r) => requestAnimationFrame(r)); const a = document.getAnimations().map((x) => Number(x.effect && x.effect.getTiming().duration) || 0); P.cerrarHoja({ sinFoco: true }); return { cuantas: a.length, maxMs: a.length ? Math.max(...a) : 0 }; })()`);
        await b.movimientoReducido(false);
        out.animaciones.normal = await animaciones();
        await b.movimientoReducido(true);
        out.animaciones.reducirMovimiento = await animaciones();
        out.errores = b.errores;
    } catch (e) {
        out.error = e.message;
        out.errores = b.errores;
    }
    b.cerrar();
    return out;
}

/** Los datos de Victor: lo que guardó la app (todas las claves), tal cual, y se recarga. */
const conArchivo = (archivo) => async (ev) => {
    const claves = JSON.parse(await readFile(archivo, 'utf8'));
    await ev(`P.sinGuardar = true; localStorage.clear(); ${Object.entries(claves).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join(' ')} true`);
    return { claves: Object.keys(claves).length, movimientos: (JSON.parse(claves['pamplanea-uso:v1'] || '{}').st || {}).registros?.length || null };
};
/** El set sintético: se guarda como «tus datos» (modo uso, la v2.8 ya vista). */
const sintetico = async (ev) =>
    ev(`(() => { const st = (${SINTETICO})(${JSON.stringify(FECHA)}); P.sinGuardar = true; localStorage.clear(); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true })); localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: P.modos.ESQUEMA, version: window.VERSION_PROTOTIPO, st, introVista: true, novedades: { 'v2.8': { visto: '${FECHA}T08:00:00Z' } } })); return { movimientos: st.registros.length, fijos: st.pagos.length, presupuestos: st.variables.length, tarjetas: st.tarjetas.length, ahorros: st.apartados.length, quincenas: Object.keys(st.ingresos[0].llegadas).length }; })()`);

const juegos = [];
if ((!args.solo || args.solo === 'a') && args.datos) juegos.push(['a) los de Victor en el guion', conArchivo(path.resolve(args.datos))]);
if (!args.solo || args.solo === 'b') juegos.push(['b) un año sintético', sintetico]);
const resultados = [];
for (const [nombre, cargar] of juegos) resultados.push(await medir(nombre, cargar));
const pasa = (r) => {
    const malas = [];
    for (const [k, v] of Object.entries(r.tiempos)) {
        const meta = k === 'abrir' ? META.abrir : k === 'guardar un gasto' ? META.guardar : META.interaccion;
        if (v === null || v > meta) malas.push(`${k}: ${v} ms (meta ${meta})`);
    }
    for (const [k, v] of Object.entries(r.cls)) if (v > META.cls) malas.push(`saltos en ${k}: CLS ${v}`);
    if (r.animaciones.normal && r.animaciones.normal.maxMs > META.animacion) malas.push(`animación de ${r.animaciones.normal.maxMs} ms`);
    if (r.animaciones.reducirMovimiento && r.animaciones.reducirMovimiento.maxMs > 0) malas.push(`con «reducir movimiento» algo se mueve (${r.animaciones.reducirMovimiento.maxMs} ms)`);
    if (r.error) malas.push('error: ' + r.error);
    if ((r.errores || []).length) malas.push('errores: ' + r.errores.slice(0, 3).join(' | '));
    return malas;
};
const informe = { cpu: '4× más lenta', pantalla: '390×844', reps: REPS, metas: META, resultados: resultados.map((r) => ({ ...r, fuera: pasa(r) })) };
console.log(JSON.stringify(informe, null, 1));
const a = informe.resultados.find((r) => r.nombre.startsWith('a)'));
process.exit(a && a.fuera.length ? 1 : 0);
