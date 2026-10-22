// PRUEBAS v2.6.2 (fase 2: deudas, tarjetas y Primer día). A 390×844:
//  A) V2-68 el Primer día en el orden aprobado: ingreso → cuánto tienes → TODAS las deudas («Agregar otra deuda»
//     visible; editar y quitar sin salir del paso) → tarjetas de crédito (cuánto debes hoy, corte y pago, cuánto pagas
//     normalmente) → gastos fijos («¿Se cobra solo en una tarjeta o cuenta?»); «Paso N de 5»; retomable al recargar; el
//     número final con su frase; lo creado: deudas con su saldo, tarjetas con su pago estimado (V2-54/V2-78) y lo que
//     debes «por confirmar», gastos que se cobran solos en la tarjeta o cuenta elegida, nada huérfano;
//  B) «Completar tu Primer día» (ya configurada) desde Mi dinero y Ayuda: solo deudas, tarjetas y gastos fijos, que se
//     SUMAN a lo que hay (lugares e ingresos intactos) y se pueden deshacer;
//  C) V2-78 una tarjeta agregada después en Mi dinero: «¿Cuánto pagas normalmente?» cuenta en el libre y en Pagos hasta
//     su estado de cuenta, que lo reemplaza (no se suma); V2-75: «Límite de crédito» y «Disponible», nunca «cupo».
// Uso: node herramientas/v262.mjs [--base=http://…/] [--puerto=9973] [--partes=a,b,c]
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || 'a,b,c,d,e,f').split(',');
const salida = path.join(root, 'capturas', 'v262' + (args.base ? '-servida' : ''));
await rm(salida, { recursive: true, force: true });
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9973) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-19';` });
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
let actual = '';
let n = 0;
const check = (nombre, real, esperado) => {
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 500)}`);
    return ok;
};
const foto = async (nombre) => {
    await esperar(120);
    await b.captura(path.join(salida, `${String(++n).padStart(2, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(150);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(80);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await esperar(500);
}
async function nuevo() {
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
    await clic('[data-fk="elegir-usar"]');
    await esperar(250);
    if (await ev('P.ayuda.abierto')) await clic('[data-fk="intro-empezar"]');
    await esperar(200);
}
/** Datos de uso ya configurados (Ana) escritos directo en lo guardado. */
async function enUso() {
    await abrirApp();
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-19' });
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-15T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, deudas: true } }));
        return true;
    })()`);
    await abrirApp();
}
const paso = () => texto('.ob-head .paso');
const titulo = () => texto('.ob-head .h1');

try {
    // ============================================================ A) el Primer día nuevo (V2-68)
    if (partes.includes('a')) {
        actual = 'A Primer día';
        await nuevo();
        check('bienvenida: dice los 5 pasos', await texto('.ob'), (t) => t.includes('Son 5 pasos cortos: tu ingreso, lo que tienes, tus deudas, tus tarjetas y tus gastos fijos.'));
        await escribir('#ob-nombre', 'Pam');
        await clic('[data-fk="ob-empezar"]');
        check('paso 1: el ingreso', [await paso(), await titulo()], ['Paso 1 de 5', '¿Cómo te pagan?']);
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', '600');
        await clic('[data-fk="ob-sig"]');
        check('paso 2: cuánto tienes', [await paso(), await titulo()], ['Paso 2 de 5', '¿Cuánto tienes ahora y dónde?']);
        await escribir('#ob-efectivo', '50');
        await clic('[data-fk="ob-banco-Agrícola"]');
        await escribir('#ob-banco-monto', '900');
        await clic('[data-fk="ob-sig"]');
        check('paso 3: TODAS las deudas', [await paso(), await titulo()], ['Paso 3 de 5', 'Tus deudas']);
        await foto('A-paso3-deudas-vacio');
        // Una deuda incompleta: dice qué falta, junto a los campos.
        await clic('[data-fk="ob-dn-prestamo"]');
        await escribir('#ob-d-nombre', 'Préstamo de la cooperativa');
        await clic('[data-fk="ob-d-guardar"]');
        check('deuda sin cuota: lo dice', await texto('#ob-err-deuda'), 'Escribe el nombre y la cuota, y elige el día');
        await escribir('#ob-d-monto', '50');
        await clic('[data-fk="ob-d-dia-20"]');
        await escribir('#ob-d-debe', '600');
        await clic('[data-fk="ob-d-guardar"]');
        check('«Agregar otra deuda» a la vista', await texto('#ob-l-dn'), 'Agregar otra deuda');
        await clic('[data-fk="ob-dn-casacomercial"]');
        await escribir('#ob-d-nombre', 'Almacén La Esquina');
        await escribir('#ob-d-monto', '35');
        await clic('[data-fk="ob-d-dia-28"]');
        await clic('[data-fk="ob-d-guardar"]');
        await clic('[data-fk="ob-dn-otra"]');
        await escribir('#ob-d-nombre', 'Lo de mi tía');
        await escribir('#ob-d-monto', '20');
        await clic('[data-fk="ob-d-dia-5"]');
        await clic('[data-fk="ob-d-guardar"]');
        check('tres deudas seguidas', await ev('P.ui.ob.datos.deudas.map((x) => x.nombre)'), ['Préstamo de la cooperativa', 'Almacén La Esquina', 'Lo de mi tía']);
        // Editar y quitar sin salir del paso.
        const c2 = await ev('P.ui.ob.datos.deudas[1].clave');
        await clic(`[data-fk="obDeudaEditar-${c2}"]`);
        await escribir('#ob-d-monto', '40');
        await clic('[data-fk="ob-d-guardar"]');
        const c3 = await ev('P.ui.ob.datos.deudas[2].clave');
        await clic(`[data-fk="obDeudaQuitar-${c3}"]`);
        check('editar y quitar en el mismo paso', await ev('P.ui.ob.datos.deudas.map((x) => [x.nombre, x.monto, x.debe])'), [['Préstamo de la cooperativa', 5000, 60000], ['Almacén La Esquina', 4000, null]]);
        await foto('A-paso3-deudas');
        // Retomable: recargar a mitad del Primer día vuelve al mismo paso con lo agregado.
        await ev('P.sinGuardar = false; P.guardarYa(); true');
        await abrirApp();
        check('retoma donde iba', [await paso(), await ev('P.ui.ob.datos.deudas.length'), await ev('P.ui.ob.datos.nombre')], ['Paso 3 de 5', 2, 'Pam']);
        await clic('[data-fk="ob-sig"]');
        check('paso 4: tarjetas', [await paso(), await titulo()], ['Paso 4 de 5', 'Tus tarjetas de crédito']);
        await clic('[data-fk="ob-tn"]');
        await clic('[data-fk="ob-t-banco-BAC"]');
        await escribir('#ob-t-debe', '300');
        await escribir('#ob-t-corte', '15');
        await escribir('#ob-t-pago', '5');
        await escribir('#ob-t-usual', '100');
        await clic('[data-fk="ob-t-guardar"]');
        await clic('[data-fk="ob-tn"]');
        await clic('[data-fk="ob-t-banco-Cuscatlán"]');
        await escribir('#ob-t-pago', '40');
        await clic('[data-fk="ob-t-guardar"]');
        check('día de pago inválido: lo dice', await texto('#ob-err-tarjeta'), 'Elige el banco y escribe el día de pago (del 1 al 31)');
        await escribir('#ob-t-pago', '10');
        await clic('[data-fk="ob-t-guardar"]');
        check('«Agregar otra tarjeta» a la vista', await texto('[data-fk="ob-tn"]'), 'Agregar otra tarjeta');
        check('dos tarjetas', await ev('P.ui.ob.datos.tarjetas.map((x) => [x.nombre, x.debe, x.corte, x.pago, x.usual])'), [['Crédito BAC', 30000, 15, 5, 10000], ['Crédito Cuscatlán', null, null, 10, null]]);
        await foto('A-paso4-tarjetas');
        await clic('[data-fk="ob-sig"]');
        check('paso 5: gastos fijos', [await paso(), await titulo()], ['Paso 5 de 5', 'Tus gastos fijos']);
        check('servicios en su cuadro (V2-66)', await ev(`[...document.querySelectorAll('.campo-l--sec')].map((e) => e.textContent.trim())`), ['Facturas de servicios', 'Casa y familia', 'Suscripciones']);
        await clic('[data-fk="ob-p-luz"]');
        await escribir('#ob-p-monto', '35');
        await clic('[data-fk="ob-p-dia-12"]');
        check('¿se cobra solo? con tus tarjetas y tu cuenta', await ev(`[...document.querySelectorAll('[data-fk^="ob-p-cobro-"]')].map((e) => e.textContent.trim())`), ['No, lo pago yo', 'En Crédito BAC', 'En Crédito Cuscatlán', 'En Banco Agrícola']);
        await clic('[data-fk^="ob-p-cobro-b:"]');
        await clic('[data-fk="ob-p-agregar"]');
        await clic('[data-fk="ob-s-nueva"]');
        await clic('[data-fk="ob-p-servicio-netflix"]');
        await escribir('#ob-p-monto', '10');
        await clic('[data-fk="ob-p-dia-3"]');
        check('la suscripción, por defecto en la primera tarjeta (V2-47)', await ev('P.ui.ob.editando.cobro'), (v) => /^t:/.test(v));
        await clic('[data-fk="ob-p-agregar"]');
        await clic('[data-fk="ob-p-cuchubal"]');
        await escribir('#ob-p-monto', '25');
        await clic('[data-fk="ob-p-dsem-5"]');
        await clic('[data-fk="cal-p-turno-sig"]');
        await clic('[data-fk="cal-p-turno-2026-11-20"]');
        await escribir('#ob-p-recibes', '400');
        await clic('[data-fk="ob-p-agregar"]');
        await foto('A-paso5-gastos');
        await clic('[data-fk="ob-sig"]');
        await esperar(300);
        check('el primer número con su frase', await texto('.pg-head .sub'), 'Es lo que puedes gastar hasta tu quincena del 30 sin tocar tus pagos, tus deudas ni tus tarjetas.');
        await foto('A-primer-numero');
        const st = await ev(`(() => { const s = P.st; return {
            deudas: s.pagos.filter((p) => p.tipoDeuda).map((p) => [p.nombre, p.monto, p.dia, p.deuda && p.deuda.debe, p.tipoDeuda, p.medio]),
            tarjetas: s.tarjetas.map((t) => [t.nombre, t.corte, t.pagoDia, t.pagoUsual || null, t.debeInicial ?? null]),
            luz: (() => { const p = s.pagos.find((x) => x.nombre === 'Luz'); return [p.medio, !!p.automatico]; })(),
            netflix: (() => { const p = s.pagos.find((x) => x.nombre === 'Netflix'); return [MOTOR.medio(s, p.medio).tarjeta || null, !!p.automatico]; })(),
            turno: s.ingresos.filter((i) => i.nombre === 'Tu turno del cuchubal').map((i) => [i.monto, i.fecha, i.frecuencia]),
            medios: s.medios.map((m) => m.id),
        }; })()`);
        check('deudas con su saldo y su medio', st.deudas, [['Préstamo de la cooperativa', 5000, 20, 60000, 'prestamo', 'debito'], ['Almacén La Esquina', 4000, 28, null, 'casacomercial', 'debito']]);
        check('tarjetas: corte, pago, lo que pagas normalmente y lo que debes', st.tarjetas, [['Crédito BAC', 15, 5, 10000, 30000], ['Crédito Cuscatlán', null, 10, null, null]]);
        check('la luz se cobra sola en la cuenta', st.luz, ['debito', true]);
        check('Netflix en la tarjeta', st.netflix, ['credito', true]);
        check('el turno del cuchubal es un ingreso esperado (V2-75)', st.turno, [[40000, '2026-11-20', 'unico']]);
        // v2.6.7 (V2-87): cuenta una vez, como cualquier otro pago: con el ingreso de antes de su fecha o con lo que tienes.
        check('cuenta lo que pagas normalmente de la tarjeta (V2-54, V2-78, V2-87)', await ev(`(() => { const k = P.calc(); const t = k.tarjetas.find((x) => x.t.nombre === 'Crédito BAC'); return [t.usual, t.estimado, t.conIngreso + t.estimadoAhora + t.reservadoComo]; })()`), [10000, 10000, 10000]);
        await clic('[data-fk="pn-listo"]');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        check('Deudas: lo que debes de la tarjeta, por confirmar', await texto('[data-fk="t-credito"]'), (t) => t.includes('~$300') && t.includes('por confirmar'));
        check('Deudas: «Agregar otra deuda o tarjeta»', await texto('[data-fk="md-deuda"]'), 'Agregar otra deuda o tarjeta');
        await foto('A-deudas');
    }

    // ============================================================ B) «Completar tu Primer día» (ya configurada)
    if (partes.includes('b')) {
        actual = 'B completar';
        await enUso();
        const antes = await ev('JSON.stringify({ l: P.st.lugares, i: P.st.ingresos })');
        const nPagos = await ev('P.st.pagos.length');
        const nTarjetas = await ev('P.st.tarjetas.length');
        await clic('#btn-ayuda');
        check('Ayuda (con tus datos): «Completar tu Primer día»', await texto('[data-fk="au-completar"] .fila-t'), 'Completar tu Primer día');
        await clic('[data-fk="au-completar"]');
        check('empieza en las deudas: «Paso 1 de 3»', [await paso(), await titulo()], ['Paso 1 de 3', 'Tus deudas']);
        await clic('[data-fk="ob-dn-prestamo"]');
        await escribir('#ob-d-nombre', 'Préstamo nuevo');
        await escribir('#ob-d-monto', '30');
        await clic('[data-fk="ob-d-dia-15"]');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-tn"]');
        await clic('[data-fk="ob-t-banco-BAC"]');
        await escribir('#ob-t-pago', '8');
        await escribir('#ob-t-usual', '50');
        await clic('[data-fk="ob-sig"]');
        check('la tarjeta del mismo banco no se repite de nombre', await ev('P.ui.ob.datos.tarjetas.map((t) => t.nombre)'), ['Crédito BAC 2']);
        await clic('[data-fk="ob-p-cable"]');
        await escribir('#ob-p-monto', '20');
        await clic('[data-fk="ob-p-dia-10"]');
        check('¿se cobra solo? también con lo que ya tienes', await ev(`[...document.querySelectorAll('[data-fk^="ob-p-cobro-"]')].map((e) => e.textContent.trim())`), (x) => x.includes('En Crédito BAC') && x.includes('En Crédito BAC 2') && x.includes('En Banco Agrícola'));
        await clic('[data-fk="ob-p-agregar"]');
        check('el último botón: «Agregar todo»', await texto('[data-fk="ob-sig"]'), 'Agregar todo');
        await clic('[data-fk="ob-sig"]');
        await esperar(300);
        check('suma sin tocar lugares ni ingresos', [await ev('JSON.stringify({ l: P.st.lugares, i: P.st.ingresos })') === antes, await ev('P.st.pagos.length') - nPagos, await ev('P.st.tarjetas.length') - nTarjetas], [true, 2, 1]);
        check('termina en Deudas con «Deshacer»', [await ev('P.ui.stack.at(-1)?.tipo'), await texto('#capa-toast')], (x) => x[0] === 'deudas' && /Agregamos 3 cosas/.test(x[1] || '') && /Deshacer/.test(x[1] || ''));
        await foto('B-completar-fin');
        await clic('[data-a="deshacer"]');
        check('«Deshacer» lo quita todo', [await ev('P.st.pagos.length') - nPagos, await ev('P.st.tarjetas.length') - nTarjetas], [0, 0]);
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        check('Mi dinero → Deudas: «Completar tu Primer día»', await hay('[data-fk="md-completar"]'), true);
    }

    // ============================================================ C) V2-78 una tarjeta después; V2-75 límite y disponible
    if (partes.includes('c')) {
        actual = 'C tarjeta después';
        await enUso();
        const libre0 = await ev('P.calc().libre');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        await clic('[data-fk="md-deuda"]');
        await clic('[data-fk="td-tarjeta"]');
        const formulario = await texto('.hoja');
        check('el formulario: límite de crédito, sin «cupo»', formulario, (t) => /límite de crédito/i.test(t) && !/cupo/i.test(t) && t.includes('¿Cuánto pagas normalmente?') && t.includes('¿Cuánto debes hoy?'));
        await escribir('#f-nombre', 'Crédito Promerica');
        await escribir('#f-corte', '25');
        await escribir('#f-pagoDia', '12');
        await escribir('#f-cupo', '1000');
        await escribir('#f-usualNueva', '80');
        await escribir('#f-debeHoy', '250');
        await foto('C-tarjeta-nueva');
        await clic('[data-fk="deuda-ok"]');
        // v2.6.6 (V2-85): su pago de octubre (el 12) ya pasó: al guardar pregunta; «Sí» cuenta el del 12 nov (una vez).
        check('pregunta por el del 12 oct', await texto('#antes-t'), 'El de octubre (12 oct), ¿ya lo pagaste?');
        await clic('[data-fk="deuda-ok"]');
        await esperar(250);
        const k = await ev(`(() => { const k = P.calc(); const t = k.tarjetas.find((x) => x.t.nombre === 'Crédito Promerica'); return { libre: k.libre, usual: t.usual, estimado: t.estimado, debe: t.t.debeInicial }; })()`);
        // v2.6.7 (V2-87): el del 12 nov lo paga la quincena de antes de esa fecha, como cualquier otro pago: el libre de hoy no baja.
        check('cuenta lo que pagas normalmente (estimado) y guarda lo que debes', { usual: k.usual, estimado: k.estimado, debe: k.debe, baja: libre0 - k.libre }, { usual: 8000, estimado: 8000, debe: 25000, baja: 0 });
        check('Deudas: disponible, nunca «cupo»', await texto('#pantalla'), (t) => t.includes('Disponible') && !/cupo/i.test(t));
        // El estado de cuenta reemplaza al estimado: no se suma.
        await ev(`(() => { const t = P.st.tarjetas.find((x) => x.nombre === 'Crédito Promerica'); P.abrirHoja('estadoCuenta', { id: t.id }); return true; })()`);
        await esperar(200);
        const conEstado = await hay('#f-total');
        if (conEstado) {
            await escribir('#f-total', '260');
            await escribir('#f-minimo', '30');
            await ev('P.acciones.ecSiguiente(); true');
            await esperar(200);
            if (await hay('[data-fk="ec-total"]')) await clic('[data-fk="ec-total"]');
            await ev('P.acciones.ecGuardar(); true');
            await esperar(300);
            const k2 = await ev(`(() => { const k = P.calc(); const t = k.tarjetas.find((x) => x.t.nombre === 'Crédito Promerica'); return { usual: t.usual, estimado: t.estimado, porPagar: t.porPagarEstado }; })()`);
            check('con su estado de cuenta, el estimado se va (no se suma)', [k2.usual, k2.estimado], [0, 0]);
        } else fallos.push(`${actual}: no encontré el formulario del estado de cuenta`);
    }

    // ============================================================ D) V2-73 Pagos: qué suma y qué resta, de un vistazo
    if (partes.includes('d')) {
        actual = 'D ingreso o pago';
        await enUso();
        await clic('[data-fk="nav-pagos"]');
        // v2.8 (C-9): las marcas del día están en el calendario de Mi plan.
        await clic('[data-fk="modo-calendario"]');
        const dia = await ev(`(() => { const g = [...document.querySelectorAll('.grupo')].find((x) => x.querySelector('.fila--ingreso') && x.querySelector('.fila--pago')) || [...document.querySelectorAll('.grupo')].find((x) => x.querySelector('.fila--ingreso')); if (!g) return null; return { cab: g.querySelector('.grupo-cab')?.innerText.replace(/\\s+/g, ' '), filas: [...g.querySelectorAll('.fila')].map((f) => ({ ing: f.classList.contains('fila--ingreso'), marca: f.querySelector('.mov')?.innerText.trim(), monto: f.querySelector('.fila-m .monto')?.innerText.trim() })) }; })()`);
        check('un día con ingreso: su marca «+ Ingreso»', dia && dia.cab, (t) => typeof t === 'string' && t.includes('+ Ingreso'));
        check('el ingreso va primero y dice «Ingreso»', dia && dia.filas[0], (f) => f && f.ing && f.marca === 'Ingreso');
        // Lo visible del monto (sin la etiqueta para el lector de pantalla, «Pago:» o «Ingreso:»).
        const visible = `(m) => (m ? [...m.childNodes].filter((n) => !(n.classList && n.classList.contains('sr-only'))).map((n) => n.textContent).join('').trim() : null)`;
        const pagos = await ev(`[...document.querySelectorAll('.linea .fila--pago')].map((f) => ({ marca: f.querySelector('.mov')?.innerText.trim(), monto: (${visible})(f.querySelector('.fila-m .monto')) }))`);
        check('cada pago dice «Pago» y su monto resta («−»)', pagos, (x) => x.length > 0 && x.every((p) => p.marca === 'Pago' && /^(−|~)/.test(p.monto)) && !x.some((p) => p.monto.includes('−~')));
        const ingresos = await ev(`[...document.querySelectorAll('.linea .fila--ingreso .fila-m .monto')].map(${visible})`);
        check('un ingreso que llegó suma («+») y un estimado no lleva «+~»', ingresos, (x) => x.length > 0 && x.every((m) => /^\+\$|^~\$/.test(m)) && !x.some((m) => m.includes('+~')));
        // v2.8 (D-2): «Pago» solo para deudas y tarjetas; un gasto fijo se marca «− Gasto».
        check('los días con pagos también tienen su marca', await ev(`[...document.querySelectorAll('.dia-marca--pago')].map((e) => e.textContent)`), (x) => x.length > 0 && x.every((t) => /^− (Pago|\d+ pagos|Gasto|\d+ gastos)$/.test(t)));
        await foto('D-pagos-calendario');
        // Contraste de las marcas en los 4 temas (nunca solo color, y cuando hay color, ≥ 4.5:1).
        const minimo = await ev(`(async () => {
            const rgba = (s) => { const m = /color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?: \\/ ([\\d.]+))?\\)/.exec(s); if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]]; const n = (s.match(/[\\d.]+/g) || []).map(Number); return [n[0], n[1], n[2], n[3] === undefined ? 1 : n[3]]; };
            const lum = (c) => { const [r, g, b] = c.slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
            const fondo = (el) => { let capas = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) capas.push(c); if (c[3] >= 1) break; } let base = [255, 255, 255]; for (const c of capas.reverse()) base = base.map((v, i) => c[i] * c[3] + v * (1 - c[3])); return base; };
            const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
            let min = 99;
            for (const tema of ['serena-claro', 'serena-oscuro', 'ancla-claro', 'ancla-oscuro']) {
                P.aplicarTema(tema); P.render();
                await new Promise((r) => setTimeout(r, 60));
                for (const el of document.querySelectorAll('.mov, .dia-marca, .monto--pago, .monto--ingreso')) min = Math.min(min, ratio(rgba(getComputedStyle(el).color), fondo(el)));
            }
            P.aplicarTema('serena-claro'); P.render();
            return Math.round(min * 100) / 100;
        })()`);
        check('contraste de las marcas ≥ 4.5:1 en los 4 temas', minimo, (x) => x >= 4.5);
        await clic('[data-fk="modo-lista"]');
        // v2.8 (C-9): «Mi plan» (antes «Mis pagos e ingresos»): sus secciones, con «Ingresos» y «tu plan».
        check('«Mi plan»: «Ingresos», «ingresos … · tu plan …»', await texto('#pantalla'), (t) => t.includes('Ingresos') && /Al mes, más o menos: ingresos ~\$[\d,.]+ · tu plan ~\$/.test(t) && !/te entra|Lo que te pagan/i.test(t));
        await foto('D-pagos-lista');
    }

    // ============================================================ E) V2-75 cuchubal: tu turno de recibir
    if (partes.includes('e')) {
        actual = 'E cuchubal';
        await enUso();
        // Un cuchubal guardado antes de la v2.6.2, sin turno: la app lo pide después, sin romper.
        await ev(`(() => { P.cambiar((s) => { P.crearPago(s, { nombre: 'Cuchubal', emoji: '🤝', categoria: 'cuotas', monto: 2500, frecuencia: 'semanal', diaSemana: 5, medio: 'efectivo' }); }, { aviso: 'x' }); return true; })()`);
        const id = await ev(`P.st.pagos.find((p) => p.nombre === 'Cuchubal').id`);
        const libre0 = await ev('P.calc().libre');
        await ev(`P.abrir('pago', ${js(id)}); true`);
        await esperar(200);
        check('sin turno: «¿Cuándo te toca recibir?»', await texto('#pantalla'), (t) => t.includes('Aportas $25.00 cada viernes. ¿Cuándo te toca recibir?') && t.includes('Anotar mi turno'));
        await clic('[data-fk="pago-turno"]');
        await clic('[data-fk="cal-turno-sig"]');
        await clic('[data-fk="cal-turno-2026-11-20"]');
        await escribir('#f-monto', '400');
        await clic('[data-fk="turno-ok"]');
        await esperar(200);
        check('«Tu turno de recibir: [fecha] · $[monto]»', await texto('#pantalla'), (t) => t.includes('Tu turno de recibir: 20 de noviembre · $400.00') && t.includes('Aportas $25.00 cada viernes.'));
        check('el turno es un ingreso esperado (no suma antes de llegar)', [await ev(`P.st.ingresos.filter((i) => i.nombre === 'Tu turno del cuchubal').map((i) => [i.fecha, i.monto, i.frecuencia])`), await ev('P.calc().libre') === libre0], [[['2026-11-20', 40000, 'unico']], true]);
        await foto('E-cuchubal-turno');
    }

    // ============================================================ F) V2-75: sin «te entra», «te cae» ni «cupo» en las pantallas
    if (partes.includes('f')) {
        actual = 'F lenguaje';
        await enUso();
        const malas = /te entra|me entra|te cae|te cayó|te caen|te caiga|me cayó|\bcupo\b/i;
        const vistas = [];
        for (const [nombre, accion] of [
            ['Hoy', `P.irTab('hoy')`],
            ['Pagos calendario', `P.ui.pagosModo = 'calendario'; P.irTab('pagos')`],
            ['Pagos lista', `P.ui.pagosModo = 'lista'; P.irTab('pagos')`],
            ['Mi dinero', `P.irTab('midinero')`],
            ['Deudas', `P.irTab('midinero'); P.abrir('deudas')`],
            ['Tarjeta', `P.irTab('midinero'); P.abrir('tarjeta', P.st.tarjetas[0].id)`],
            ['Mes', `P.irTab('mes')`],
            ['Desglose', `P.irTab('hoy'); P.abrirHoja('desglose')`],
            ['Ayuda', `P.cerrarHoja && P.ui.hoja && P.cerrarHoja(); P.ayuda.abrir('inicio')`],
        ]) {
            await ev(`(() => { ${accion}; return true; })()`);
            await esperar(150);
            const t = await ev(`document.getElementById('app').innerText`);
            const m = t.match(malas);
            if (m) vistas.push(`${nombre}: «${t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\\s+/g, ' ')}»`);
            await ev(`(() => { if (P.ayuda.abierto) P.ayuda.cerrar({ foco: false }); if (P.ui.hoja) P.cerrarHoja({ sinFoco: true }); return true; })()`);
        }
        check('ninguna pantalla dice «te entra», «te cae» ni «cupo»', vistas, []);
    }
} catch (e) {
    fallos.push(`${actual}: ${e.message}`);
    await foto('ERROR').catch(() => null);
}
console.log(JSON.stringify({ fallos, errores: b.errores }, null, 1));
await b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
