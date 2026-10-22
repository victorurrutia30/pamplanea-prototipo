// PRUEBA DE ACEPTACIÓN v2.3 (obligatoria). Escenario de Victor con fecha simulada SOLO aquí
// (window.__fechaPrueba = sábado 17-oct-2026, empezó a usar la app hoy), armado por la interfaz como lo
// haría él; y además: migración esquema 1 → 2 con datos tipo v1 (sin perder nada), Carlos con reserva
// sugerida (no automática), un pago repartido entre dos quincenas, editar un pago ya pagado y anotar
// con fecha futura. Uso: node herramientas/aceptacion-v23.mjs [--base=http://…/] [--tema=serena-claro]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const salida = path.join(root, 'capturas', 'aceptacion-v23' + (args.base ? '-servida' : ''), tema);
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9791) });
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
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 240)}»`);
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

try {
    // ================================================================ 1. Victor, por la interfaz
    actual = 'victor';
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
    await foto('victor-como-te-pagan');
    await clic('[data-fk="ob-sig"]');
    check('no pregunta «¿ya te cayó?» (el 17 no es día de pago)', await hay('[data-fk="ob-hoyCayo-si"]'), false);
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
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿Con qué lo pagas?» ya no viene elegido: se elige lo que antes se ponía solo.
        if (id === 'alquiler') await clic('[data-fk="ob-p-paga-efectivo"]');
        else {
            await clic('[data-fk="ob-p-paga-b:banco"]');
            await clic('[data-fk="ob-p-solo-no"]');
        }
        await clic('[data-fk="ob-p-agregar"]');
    }
    await clic('[data-fk="ob-sig"]');
    await foto('victor-primer-numero');
    await clic('[data-fk="pn-listo"]');
    // Lo demás, como lo agregaría él en Pagos.
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="nuevo-ingreso"]');
    // Ajuste 3 (FM-2, APROBADO por Victor 2026-10-22): «+ Ingreso» ofrece solo extras; el salario de la pareja va como «Otro» (los mismos días).
    await clic('[data-fk="op-tipoIng-otro"]');
    await escribir('#f-nombre', 'Salario de mi pareja');
    await escribir('#f-monto', '566');
    await foto('victor-ingreso-pareja');
    check('pareja: los mismos días (14 y 29)', await ev('[P.ui.hoja.frecuencia, P.ui.hoja.qModo, P.ui.hoja.d1, P.ui.hoja.d2]'), ['quincenal', 'otros', '14', '29']);
    await clic('[data-fk="hoja-ok"]');
    await clic('[data-fk="nuevo-pago"]');
    await escribir('#f-nombre', 'Pago de mi mama');
    await escribir('#f-monto', '160');
    await clic('[data-fk="estimado"]');
    await clic('[data-fk="dia-dia-30"]');
    // v2.8 (APROBADO por Victor, 2026-10-22): «¿Con qué lo pagas?» ya no viene elegido: se elige lo que antes se ponía solo.
    await clic('[data-fk="op-medio-efectivo"]');
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
    // Cuchubal quincenal: próxima fecha el 23 (días 8 y 23).
    await clic('[data-fk="nuevo-pago"]');
    // Ajuste 3 (FM-4, APROBADO por Victor 2026-10-22): «¿Cuál?» sale después de elegir el grupo («Otro»).
    await clic('[data-fk="np-otro"]');
    await clic('[data-fk="op-frecuente-cuchubal"]');
    await escribir('#f-monto', '25');
    check('cuchubal: sugiere quincenal', await ev('P.ui.hoja.frecuencia'), 'quincenal');
    await clic('[data-fk="op-medio-efectivo"]');
    await clic('[data-fk="op-qModo-otros"]');
    await escribir('#f-d1', '8');
    await escribir('#f-d2', '23');
    await foto('victor-cuchubal');
    await clic('[data-fk="hoja-ok"]');
    // v2.6.6 (V2-85): el del 8 de octubre ya pasó: al guardar pregunta «¿ya lo pagaste?» («Sí»: el primero es el 23).
    check('cuchubal: pregunta por el del 8', await texto('#antes-t'), 'El del 8 de octubre, ¿ya lo pagaste?');
    await clic('[data-fk="hoja-ok"]');
    check('cuchubal: próxima el 23', await ev('(() => { const M = window.MOTOR; const p = P.st.pagos.find((x) => /cuchubal/i.test(x.nombre)); return M.ocurrenciasPago(P.st, p, P.st.hoy, "2026-11-30").map((o) => o.fecha); })()'), ['2026-10-23', '2026-11-08', '2026-11-23']);
    await clic('[data-fk="nav-hoy"]');
    await foto('victor-hoy');
    const k = await ev('(() => { const k = P.calc(); return { libre: k.libre, porDia: k.porDia, dias: k.hz.dias, prox: k.proxima && { clave: k.proxima.clave, entra: k.proxima.entra, pagos: k.proxima.pagos, quedan: k.proxima.quedan, deficit: k.proxima.deficit }, avisos: k.avisos.map((a) => a.tipo + ":" + a.nivel) }; })()');
    informe.numeros.victor = k;
    check('horizonte', await texto('.portada-h'), 'Hasta tu quincena del 29 · en 12 días');
    check('libre $95.00', await texto('.portada-n'), '$95.00');
    check('~$7.90 por día', await texto('.portada-s'), '~$7.90 por día');
    check('sin avisos rojos', await hay('#pantalla .nota--atencion'), false);
    check('sin avisos en el motor', k.avisos, []);
    // v2.8 (C-8): cómo quedas la próxima quincena ya no está en Hoy: está arriba de Mi plan («gastos», D-2).
    await ev(`P.irTab('pagos'); true`);
    check('proyección', await texto('.proy'), contiene('Próxima quincena (29)', 'ingreso ~$1,163 · gastos ~$713 · te quedarían ~$450', 'incluye ~$566 de tu pareja'));
    await ev(`P.irTab('hoy'); true`);
    check('proyección (números)', k.prox, { clave: '2026-10-29', entra: 116300, pagos: 71300, quedan: 45000, deficit: 0 });
    check('sin llegadas inventadas', await ev('P.st.ingresos.flatMap((i) => Object.keys(i.llegadas))'), []);
    check('inicio = hoy', await ev('P.st.inicio'), '2026-10-17');
    await clic('[data-fk="portada"]');
    await foto('victor-desglose');
    check('desglose', await texto('.hoja'), contiene('Tienes', '$120.00', 'Cuchubal', '$25.00', 'Libre', '$95.00', 'Próxima quincena (29)'));
    await clic('[data-fk="desglose-ok"]');
    await ev(`P.irTab('pagos'); true`);
    await clic('[data-fk="proyeccion"]');
    await foto('victor-pagos-proxima');
    check('la proyección lleva a Pagos → Próxima', await ev('[P.ui.tab, P.ui.pagosVista]'), ['pagos', 'proxima']);
    check('Pagos → Próxima: mismos números', await texto('.per-res'), contiene('Ingreso ~$1,163 · gastos ~$713 · te quedarían ~$450'));
    await clic('[data-fk="tab-actual"]');
    check('esta quincena sin llegadas del 14', await texto('.linea'), (x) => !String(x).includes('Llegó'));
    check('«Más adelante» solo el aguinaldo', await ev('(() => { const g = [...document.querySelectorAll(".grupo")].find((x) => x.querySelector(".grupo-t")?.textContent === "Más adelante"); return g ? [...g.querySelectorAll(".fila-t")].map((x) => x.textContent) : []; })()'), ['Aguinaldo']);
    await foto('victor-pagos-esta');
    // Un estimado se escribe «~$597», nunca «+~$597».
    check('sin «+~»', await ev('document.body.textContent.includes("+~")'), false);
    await ev(`P.abrir("ingreso", "quincena"); true`);
    check('ficha del ingreso sin «+~»', await texto('.cifra'), '~$597');
    await clic('[data-fk="atras"]');

    // ================================================================ 2. Repartir el alquiler entre dos quincenas
    actual = 'repartir';
    const alquiler = await ev('P.st.pagos.find((p) => p.nombre === "Alquiler").id');
    await ev(`P.abrir("pago", ${js(alquiler)}); true`);
    await foto('repartir-ficha');
    check('lo pagas con la del 29', await texto('section[aria-labelledby="f-con"]'), contiene('Con tu quincena del 29', '$200.00'));
    await clic('[data-fk="pagar-con"]');
    await foto('repartir-hoja');
    await clic('[data-fk="pc-repartir"]');
    await clic('[data-fk="pc-parejo"]');
    await foto('repartir-parejo');
    check('parejo: $100 y $100', await ev('Object.values(P.ui.hoja.partes)'), ['100.00', '100.00']);
    await clic('[data-fk="pc-ok"]');
    check('partes guardadas', await ev(`(() => { const M = window.MOTOR; const p = M.pago(P.st, ${js(alquiler)}); return M.asignacion(P.st, p, "2026-10-30", p.monto).map((x) => [x.de, x.monto]); })()`), [['ahora', 10000], ['2026-10-29', 10000]]);
    // v2.8 (C-2): sin «reservar» fuera de «¿De dónde sale?».
    check('ficha: reservando y con la del 29', await texto('section[aria-labelledby="f-con"]'), contiene('Ya contado de lo que tienes ahora', '$100.00', 'Con tu quincena del 29'));
    await clic('[data-fk="atras"]');
    await clic('[data-fk="nav-hoy"]');
    informe.numeros.repartido = { libre: await texto('.portada-n'), linea: await texto('.portada-s') };
    check('libre con $100 reservados', await texto('.portada-n'), '$0.00');
    check('faltante exacto', await texto('.portada-s'), 'Te faltan $5.00 para cubrir lo que viene');
    await ev(`P.irTab('pagos'); true`);
    check('próxima quincena: gastos ~$613 (en Mi plan, C-8)', await texto('.proy'), contiene('gastos ~$613', 'te quedarían ~$550'));
    await ev(`P.irTab('hoy'); true`);
    await foto('repartir-hoy');
    await clic('[data-fk="toast-deshacer"]').catch(() => null);
    await ev('P.deshacerUltimo && P.st.pagos.find((p) => p.nombre === "Alquiler").asignaciones && Object.keys(P.st.pagos.find((p) => p.nombre === "Alquiler").asignaciones).length ? P.deshacerUltimo() : null; true');
    check('deshacer vuelve a $95', await texto('.portada-n'), '$95.00');

    // ================================================================ 3. Editar un pago ya pagado (V2-48)
    actual = 'editar-pagado';
    const cuchubal = await ev('P.st.pagos.find((p) => /cuchubal/i.test(p.nombre)).id');
    await ev(`P.acciones.pagado({ tipo: "pago", id: ${js(cuchubal)}, fecha: "2026-10-23" }); true`);
    await esperar(150);
    // v2.6.5 (V2-80): si todavía no vence, pregunta «¿Ya lo pagaste por adelantado?»: «Sí, ya lo pagué».
    await ev(`(document.querySelector('[data-fk="dlg-si"]') || {}).click?.(); true`);
    await esperar(150);
    check('pagado', await ev(`window.MOTOR.pago(P.st, ${js(cuchubal)}).hechos["2026-10-23"]?.estado`), 'pagado');
    await ev(`P.abrir("pago", ${js(cuchubal)}); true`);
    await clic('[data-fk="hist-2026-10-23"]');
    await foto('editar-pagado');
    await escribir('#f-monto', '20');
    await clic('[data-fk="hoja-ok"]');
    // v2.7 (F12, D-6): corregir $25 a $20 es haber pagado $20 de $25: queda «Parcial · faltan $5» (antes quedaba pagado).
    check('monto corregido', await ev(`(() => { const p = window.MOTOR.pago(P.st, ${js(cuchubal)}); const h = p.hechos["2026-10-23"]; const r = P.st.registros.find((x) => x.id === h.pagos.at(-1).registro); return [h.estado, h.pagado, h.debido, r.monto]; })()`), ['parcial', 2000, 2500, 2000]);
    await clic('[data-fk="hist-2026-10-23"]');
    await clic('[data-fk="desmarcar"]');
    await foto('desmarcar-confirmar');
    check('pide confirmar', await hay('[data-fk="desmarcar-si"]'), true);
    await clic('[data-fk="desmarcar-si"]');
    check('desmarcado', await ev(`!window.MOTOR.pago(P.st, ${js(cuchubal)}).hechos["2026-10-23"]`), true);
    check('sin su gasto', await ev(`!P.st.registros.some((r) => r.pago === ${js(cuchubal)})`), true);
    check('deshacer disponible', await hay('[data-fk="toast-deshacer"]'), true);
    await clic('[data-fk="atras"]');

    // ================================================================ 4. Anotar con fecha futura (V2-44)
    actual = 'fecha-futura';
    const tienesAntes = await ev('P.calc().tienes');
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', 'zapatos 40');
    await clic('[data-fk="ch-fecha"]');
    await foto('futura-calendario');
    check('el chip abre el calendario', await hay('.cal-dias'), true);
    await clic('[data-fk="cal-fecha-2026-10-25"]');
    await foto('futura-nota');
    // v2.8 (D-1, D-2): «Mi plan» y «gasto de una vez».
    check('nota «Es para el 25»', await texto('#anotar-preg'), contiene('Es para el 25 de octubre', 'lo pongo en Mi plan como gasto de una vez'));
    await clic('[data-fk="anotar-guardar"]');
    check('toast', await texto('.toast'), contiene('Lo puse en Mi plan para el 25 oct'));
    check('es un pago de una vez', await ev('(() => { const p = P.st.pagos.find((x) => x.nombre === "Zapatos"); return p && [p.frecuencia, p.fecha, p.monto]; })()'), ['unico', '2026-10-25', 4000]);
    check('no hay gasto', await ev('P.st.registros.some((r) => r.tipo === "gasto" && r.nombre === "Zapatos")'), false);
    check('no baja lo que tienes', await ev('P.calc().tienes'), tienesAntes);
    informe.numeros.futura = await texto('.portada-n');

    // ================================================================ 5. Migración esquema 1 → 2 (datos tipo v1, como los guardaba la v2.2)
    actual = 'migracion';
    await fecha('2026-10-20');
    await limpio();
    const v1 = await ev(`(() => {
        const D = window.DATOS, M = window.MOTOR, c = D.c, ini = '2026-10-17';
        const st = D.crearNueva();
        Object.assign(st, { persona: 'uso', hoy: ini, configurado: true, nombre: 'Victor', espacio: 'Hogar de Victor', seq: 3 });
        st.lugares = [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵', cuadre: { fecha: ini, seq: 1, monto: c('120') } }, { id: 'banco', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦', cuadre: { fecha: ini, seq: 2, monto: 0 } }];
        st.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }, { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'banco', tarjetaDebito: true }];
        st.registros = [{ id: 'r1', seq: 1, tipo: 'cuadre', fecha: ini, lugar: 'efectivo', monto: c('120'), esperado: c('120'), primero: true }, { id: 'r2', seq: 2, tipo: 'cuadre', fecha: ini, lugar: 'banco', monto: 0, esperado: 0, primero: true }];
        const atras = M.sumarDias(ini, -40);
        st.ingresos = [
            { id: 'quincena', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: c('597'), aprox: true, frecuencia: 'quincenal', dias: [14, 29], lugar: 'efectivo', desde: atras, llegadas: { '2026-09-14': { monto: c('597'), previa: true }, '2026-09-29': { monto: c('597'), previa: true }, '2026-10-14': { monto: c('597'), previa: true } }, principal: true },
            { id: 'i9', nombre: 'Salario de mi pareja', emoji: '💼', categoria: 'otro', monto: c('566'), aprox: true, frecuencia: 'quincenal', dias: [14, 29], lugar: 'efectivo', desde: ini, llegadas: {}, principal: false, extra: true },
            { id: 'aguinaldo', nombre: 'Aguinaldo', emoji: '🎁', categoria: 'aguinaldo', monto: c('1000'), aprox: true, frecuencia: 'unico', fecha: '2026-12-12', lugar: 'efectivo', principal: false, extra: true, desde: ini, llegadas: {} },
        ];
        const pago = (id, nombre, monto, x = {}) => ({ id, nombre, emoji: '🧾', categoria: 'otros', monto: c(monto), estimado: false, frecuencia: 'mensual', dia: 30, medio: 'efectivo', avisos: [{ tipo: 'vence', on: true }], desde: ini, hechos: {}, previos: [], nuevo: true, ...x });
        st.pagos = [pago('p3', 'Cuchubal', '25', { frecuencia: 'quincenal', dias: [8, 23] }), pago('p4', 'Alquiler', '200'), pago('p5', 'Luz', '60', { estimado: true }), pago('p6', 'Agua', '3', { estimado: true }), pago('p7', 'Internet', '30'), pago('p8', 'Pago de mi mama', '160', { estimado: true }), pago('p9', 'Préstamo Liss', '156', { tipoDeuda: 'prestamo', deuda: null }), pago('p10', 'Préstamo', '79', { tipoDeuda: 'prestamo', deuda: { debe: c('500') } })];
        st.apartados = [{ id: 'a11', nombre: 'Emergencias', emoji: '🐷', portada: 'general-alcancia', monto: 0, meta: c('300'), metaFecha: null, historial: [] }];
        const uso = { esquema: 1, creado: '2026-10-17T15:00:00.000Z', st, tab: 'hoy', tema: 'serena-claro', introVista: true, nombre: 'Victor', metricas: { dias: ['2026-10-17', '2026-10-18'], anotaciones: 2, cuadres: 1, pagados: 0, reparte: 0, alDia: 0, pantallas: { hoy: 4 }, noEntendio: 0, instalada: true }, feedback: [{ fecha: '2026-10-18', facil: 4, confuso: 'Lo de las reservas', gustaria: '' }], feedbackEnDias: 2, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: ['Efectivo', 'Banco Agrícola'] };
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify(uso));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true }));
        return uso;
    })()`);
    await abrirApp();
    await foto('migracion-hoy');
    const guardado = await ev('JSON.parse(localStorage.getItem("pamplanea-uso:v1"))');
    const respaldo = await ev('JSON.parse(localStorage.getItem("pamplanea-uso:respaldo-esquema-1"))');
    check('esquema 2', guardado.esquema, 2);
    check('respaldo intacto del esquema 1', JSON.stringify(respaldo), JSON.stringify(v1));
    check('reporte de migración', guardado.migracion && [guardado.migracion.inicio, guardado.migracion.llegadasInventadasQuitadas], ['2026-10-17', 3]);
    // Todo lo que escribió la persona sigue igual (salvo las 3 llegadas inventadas y el «desde» del ingreso).
    const limpiarV1 = (u) => {
        const x = structuredClone(u);
        x.st.ingresos[0].llegadas = {};
        x.st.ingresos[0].desde = '2026-10-17';
        return x;
    };
    const a = limpiarV1(v1);
    const g = structuredClone(guardado);
    // v2.8 (C-1): lo único nuevo en tus ahorros es dónde están (`donde`: dentro de tu cuenta); lo demás, igual.
    const sinDonde = (lista) => (lista || []).map(({ donde, ...x }) => x);
    for (const k of ['lugares', 'medios', 'pagos', 'registros', 'apartados', 'ingresos']) check('igual: ' + k, JSON.stringify(k === 'apartados' ? sinDonde(g.st[k]) : g.st[k]), JSON.stringify(a.st[k]));
    check('v2.8 (C-1): tus ahorros quedan dentro de una de tus cuentas', g.st.apartados.every((x) => x.donde && g.st.lugares.some((l) => l.id === x.donde.lugar)), true);
    for (const k of ['nombre', 'metricas', 'feedback', 'feedbackEnDias', 'creado', 'introVista']) check('igual: ' + k, JSON.stringify(k === 'metricas' ? { ...g[k], dias: g[k].dias.slice(0, 2) } : g[k]), JSON.stringify(a[k]));
    check('migrado: libre $95.00 hasta el 29', [await texto('.portada-n'), await texto('.portada-h')], ['$95.00', 'Hasta tu quincena del 29 · en 9 días']);
    check('migrado: sin avisos rojos', await hay('#pantalla .nota--atencion'), false);
    informe.numeros.migracion = { libre: await texto('.portada-n'), porDia: await texto('.portada-s'), proy: await texto('.proy') };
    // Una copia (.json) de esquema 1 también se restaura migrada.
    const copia = await ev(`window.P.modos.validarCopia(JSON.stringify({ app: 'pamplanea-prototipo', tipo: 'copia-uso', esquema: 1, version: 'Prototipo v2.2 · 2026-10-16', fecha: '2026-10-18T00:00:00Z', datos: ${JSON.stringify(v1)} }))`);
    check('copia v1 se valida y migra', copia && copia.datos && [copia.datos.esquema, Object.keys(copia.datos.st.ingresos[0].llegadas).length, copia.resumen], [2, 0, '2 lugares · 8 pagos · 2 movimientos']);

    // ================================================================ 6. Carlos: reserva sugerida, no automática
    actual = 'carlos';
    await abrirApp('caso=C20&tema=' + tema);
    await foto('carlos-hoy');
    check('libre sin reserva automática', await texto('.portada-n'), '$125.00');
    check('sugerencia (ámbar)', await texto('.aviso-hoy'), contiene('El viernes 30 recibes ~$90', 'el alquiler', 'te faltarían ~$70', '¿Dejas algo listo de tu pago del viernes 23?'));
    check('ámbar, no rojo', await ev('document.querySelector(".aviso-hoy")?.classList.contains("nota--ambar")'), true);
    await clic('[data-fk="at-sug-si"]');
    await foto('carlos-reservar');
    check('prellenado $70', await ev('document.getElementById("f-monto").value'), '70.00');
    await clic('[data-fk="op-fuente-ahora"]');
    await clic('[data-fk="reservar-ok"]');
    check('libre baja por lo que eligió', await texto('.portada-n'), '$55.00');
    check('ya no sugiere', await hay('[data-fk="at-sug-si"]'), false);
    await ev('P.abrir("pago", "alquiler"); true');
    // v2.8 (C-2): sin «reservar» fuera de «¿De dónde sale?».
    check('el alquiler lo dice', await texto('section[aria-labelledby="f-con"]'), contiene('Ya contado de lo que tienes ahora', '$70.00', 'Con tu pago del viernes 30', '$80.00'));
    await foto('carlos-alquiler');
    // «No, después veo» la calla.
    await abrirApp('caso=C33&tema=' + tema);
    check('C33: libre $60', await texto('.portada-n'), '$60.00');
    await clic('[data-fk="at-sug-no"]');
    check('después veo: se calla', await hay('[data-fk="at-sug-si"]'), false);
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, numeros: informe.numeros }, null, 1));
b.cerrar();
