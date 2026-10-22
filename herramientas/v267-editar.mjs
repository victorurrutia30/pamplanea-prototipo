// PRUEBA v2.6.7 (V2-88): editar = los mismos campos que crear, en cada entidad. Por cada una: se crea con todos los campos,
// se compara la lista de preguntas de «agregar» con la de «editar» (lo que falta al editar, con su motivo, va en
// `permitidos`), se edita cada campo y se mira el cambio en Hoy, Pagos, Mi dinero y la ficha.
//  T1 tarjeta (Mi dinero, sin estado de cuenta) · T2 tarjeta del Primer día · T3 tarjeta con su estado de cuenta ·
//  T4 préstamo y casa comercial · T5 cuota desde «+ Pago» · T6 cuchubal (con su turno) · T7 pago fijo («Se cobra solo») ·
//  T8 ingreso esperado · T9 ahorro · T10 cuenta · T11 medio de pago
// Uso: node herramientas/v267-editar.mjs [--base=http://…/] [--puerto=9976] [--partes=1,2,3…] [--tema=ancla-oscuro] [--raiz=<otra copia>]
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
// --raiz: las mismas pruebas sobre otra copia (por ejemplo la v2.6.6, para ver que fallan antes).
const root = args.raiz ? path.resolve(args.raiz) : aqui;
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || '1,2,3,4,5,6,7,8,9,10,11').split(',').map(Number);
const tema = args.tema || 'serena-claro';
const salida = path.join(aqui, 'capturas', 'v267-editar' + (args.base ? '-servida' : '') + (args.raiz ? '-raiz' : '') + (args.tema ? '-' + args.tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9976) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
const notas = {};
let actual = '';
let checks = 0;
const check = (nombre, real, esperado) => {
    checks++;
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 400)}`);
    return ok;
};
const contiene = (t) => (x) => typeof x === 'string' && x.includes(t);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const clic = async (sel, espera = 250) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(espera);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const valor = (sel) => ev(`document.querySelector(${js(sel)})?.value ?? null`);
const pulsado = (fk) => ev(`document.querySelector('[data-fk=${js(fk)}]')?.getAttribute('aria-pressed') || document.querySelector('[data-fk=${js(fk)}]')?.getAttribute('aria-checked') || null`);
const escribir = async (sel, v) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus({ preventScroll: true }); el.value = ${js(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(80);
};
const foto = (n) => b.captura(path.join(salida, n + '.png'));
async function esperarA(cond) {
    for (let i = 0; i < 50; i++) {
        if (await ev(cond).catch(() => false)) return true;
        await esperar(100);
    }
    return false;
}
let fechaId = null;
async function fecha(f) {
    if (fechaId) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: fechaId });
    fechaId = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '${f}';` })).identifier;
}
async function abrirApp(url = base + 'telefono.html#tema=' + tema) {
    await b.ir('about:blank');
    await b.ir(url);
    await esperar(600);
}
async function seccion(nombre, fn) {
    actual = nombre;
    try {
        await fn();
    } catch (e) {
        fallos.push(`${actual}: excepción: ${e.message}`);
        await foto('ERROR-' + nombre.slice(0, 14).replace(/[^\w]+/g, '-')).catch(() => null);
    }
}
/** Las preguntas de la hoja abierta: sus títulos de campo y los chips que son un dato (sí/no). */
const etiquetas = () =>
    ev(`[...document.querySelectorAll('.hoja .campo-l'), ...document.querySelectorAll('.hoja .chip[data-campo="estimado"], .hoja .chip[data-campo="automatico"], .hoja .chip[data-campo="principal"], .hoja .chip[data-campo="descuento"], .hoja .chip[data-campo="debito"]')]
        .filter((e) => !e.closest('.pregunta--antes') && !e.closest('[hidden]'))
        .map((e) => e.innerText.replace(/\\s+/g, ' ').replace(/\\(opcional\\)/g, '').replace(/\\(vence el[^)]*\\)/g, '').replace(/\\(te sugerimos[^)]*\\)/g, '').trim())
        .filter(Boolean)`);
/** Lo que se pregunta al agregar y no al editar (sin los permitidos, que van con su motivo en el LEEME). */
function comparar(crear, editar, permitidos = []) {
    const faltan = crear.filter((x) => !editar.includes(x) && !permitidos.includes(x));
    notas[actual] = { ...(notas[actual] || {}), crear, editar, permitidos };
    check('editar trae todo lo que se pregunta al agregar', faltan, []);
}
const irA = async (tab, pantalla = null, id = null) => {
    await ev(`P.ui.hoja = null; P.irTab(${js(tab)}); ${pantalla ? `P.abrir(${js(pantalla)}${id ? ', ' + js(id) : ''});` : ''} true`);
    await esperar(300);
};
const pantalla = () => ev(`document.querySelector('#pantalla').innerText.replace(/\\s+/g, ' ')`);
const libre = () => ev('P.calc().libre');
/** Guardar la hoja (si pregunta «¿ya lo pagaste?» por una fecha que ya pasó, se contesta con lo elegido y se guarda). */
async function guardar(fk = 'hoja-ok') {
    await clic(`[data-fk="${fk}"]`, 350);
    if (await hay('.hoja .pregunta--antes') && (await hay(`[data-fk="${fk}"]`))) await clic(`[data-fk="${fk}"]`, 350);
}

/** Un Primer día simple: quincena el 15 y el 30 ($600), $950 en el Banco Agrícola y $50 en efectivo. */
async function primerDia(f = '2026-10-19', { tarjeta = null } = {}) {
    await fecha(f);
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
    await clic('[data-fk="elegir-usar"]');
    await esperarA("(P.ayuda && P.ayuda.abierto && !!document.querySelector('[data-fk=intro-empezar]')) || !!document.querySelector('#ob-nombre')");
    if (await hay('[data-fk="intro-empezar"]')) await clic('[data-fk="intro-empezar"]');
    await esperarA("!!document.querySelector('#ob-nombre')");
    await escribir('#ob-nombre', 'Marta');
    await clic('[data-fk="ob-empezar"]');
    await clic('[data-fk="ob-i-quincena"]');
    await escribir('#ob-q-monto', '600');
    await clic('[data-fk="ob-sig"]');
    await escribir('#ob-efectivo', '50');
    await clic('[data-fk="ob-banco-Agrícola"]');
    await escribir('#ob-banco-monto', '950');
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    if (tarjeta) {
        await clic('[data-fk="ob-tn"]');
        await clic(`[data-fk="ob-t-banco-${tarjeta.banco}"]`);
        notas.T2crear = await ev(`[...document.querySelectorAll('.ob-editor .campo-l')].map((e) => e.innerText.replace(/\\(opcional\\)/g, '').trim())`);
        await escribir('#ob-t-debe', tarjeta.debe);
        await escribir('#ob-t-corte', tarjeta.corte);
        await escribir('#ob-t-pago', tarjeta.pago);
        await escribir('#ob-t-usual', tarjeta.usual);
        await clic('[data-fk="ob-t-guardar"]');
        if (await hay('#ob-antes-t')) await clic('[data-fk="ob-t-guardar"]');
    }
    await clic('[data-fk="ob-sig"]');
    await clic('[data-fk="ob-sig"]');
    await esperar(300);
    await clic('[data-fk="pn-listo"]');
    await esperar(300);
}
/** Elige una fecha en el calendario propio (pasa de mes si hace falta). */
async function elegirFecha(campo, f) {
    for (let i = 0; i < 4 && !(await hay(`[data-fk="cal-${campo}-${f}"]`)); i++) await clic(`[data-fk="cal-${campo}-sig"]`, 150);
    await clic(`[data-fk="cal-${campo}-${f}"]`);
}
const medioId = (nombre) => ev(`P.st.medios.find((m) => m.nombre === ${js(nombre)} && !m.oculto)?.id || null`);

// ================================================================ T1 tarjeta (Mi dinero, sin estado de cuenta)
if (partes.includes(1)) {
    await seccion('T1 tarjeta de Mi dinero', async () => {
        await primerDia();
        const debito = await ev(`P.st.medios.find((m) => m.tarjetaDebito).id`);
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
        await esperar(300);
        const crear = await etiquetas();
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?» («Otro» pide el nombre) reemplaza «¿Cómo se llama?».
        await clic('[data-fk="op-banco-Otro"]');
        await escribir('#f-otroNombre', 'Visa Cuscatlán');
        await escribir('#f-corte', '25');
        await escribir('#f-pagoDia', '14');
        await escribir('#f-cupo', '1000');
        await escribir('#f-usualNueva', '100');
        await escribir('#f-debeHoy', '800');
        await clic(`[data-fk="op-medio-${debito}"]`);
        await foto('T1-agregar');
        await guardar('deuda-ok');
        const t = await ev(`P.st.tarjetas.find((x) => x.nombre === 'Visa Cuscatlán')`);
        check('se guardó con todo', [t.corte, t.pagoDia, t.cupo, t.pagoUsual, t.debeInicial, t.medio], [25, 14, 100000, 10000, 80000, debito]);
        await irA('midinero', 'tarjeta', t.id);
        await clic('[data-fk="editar-tarjeta"]', 400);
        const editar = await etiquetas();
        // Su estado de cuenta se anota con «Llegó mi estado de cuenta» (en la ficha); lo demás se edita aquí.
        comparar(crear, editar, ['¿Qué es?', '¿Tienes tu último estado de cuenta?', '¿Cuánto es el pago de contado?', '¿Cuánto es el pago mínimo?', '¿Todavía no tienes estado de cuenta?']);
        check('trae lo que tiene', [await valor('#f-otroNombre'), await valor('#f-corte'), await valor('#f-pagoDia'), await valor('#f-cupo'), await valor('#f-usualNueva'), await valor('#f-debeHoy'), await pulsado('op-medio-' + debito), await pulsado('op-fuenteT-2026-10-30')], ['Visa Cuscatlán', '25', '14', '1000.00', '100.00', '800.00', 'true', 'true']);
        await foto('T1-editar');
        // Editar cada campo.
        const l0 = await libre();
        await escribir('#f-otroNombre', 'Visa Oro');
        // Del 14 al 13: el de octubre (13 oct) ya pasó («Sí, ya lo pagué», lo elegido) y el siguiente es el 13 nov.
        await escribir('#f-pagoDia', '13');
        await escribir('#f-cupo', '1500');
        await escribir('#f-usualNueva', '120');
        await escribir('#f-debeHoy', '900');
        await clic('[data-fk="op-medio-efectivo"]');
        await clic('[data-fk="op-fuenteT-ahora"]');
        await guardar('deuda-ok');
        const t2 = await ev(`(() => { const t = P.st.tarjetas.find((x) => x.id === ${js(t.id)}); const i = MOTOR.tarjetaInfo(P.st, t); return { nombre: t.nombre, pagoDia: t.pagoDia, cupo: t.cupo, usual: t.pagoUsual, debe: t.debeInicial, medio: t.medio, vence: i.vence, partes: i.partes, credito: P.st.medios.find((m) => m.tarjeta === t.id).nombre }; })()`);
        notas.T1 = t2;
        check('guardado', [t2.nombre, t2.pagoDia, t2.cupo, t2.usual, t2.debe, t2.medio, t2.credito], ['Visa Oro', 13, 150000, 12000, 90000, 'efectivo', 'Visa Oro']);
        check('con qué ingreso: lo que tienes (sigue a la fecha nueva, el 13 nov)', [t2.vence, t2.partes], ['2026-11-13', [{ de: 'ahora', monto: 12000 }]]);
        check('Hoy: el libre baja $120 (reservado de lo que tienes)', l0 - (await libre()), 12000);
        const ficha = await texto('#pantalla');
        check('ficha: nombre, lo que debe, el límite y la fecha nueva', ficha, (x) => x.includes('Visa Oro') && x.includes('~$900') && x.includes('Por confirmar con tu estado de cuenta') && x.includes('de tu límite de crédito de $1,500.00') && x.includes('13 nov'));
        await irA('midinero', 'deudas');
        check('Deudas: «Debes ~$900 · por confirmar con tu estado de cuenta»', await pantalla(), contiene('Visa Oro Debes ~$900 · por confirmar con tu estado de cuenta'));
        await irA('midinero');
        check('Mi dinero: la misma frase', await texto('#pantalla .total'), contiene('Debes ~$900 · por confirmar con tu estado de cuenta'));
        await irA('pagos');
        check('Pagos: su pago el 13 nov, ~$120', await ev(`MOTOR.ocurrenciasTarjeta(P.st, '2026-10-01', '2026-12-31').map((o) => o.fecha + ':' + o.monto)`), ['2026-11-13:12000']);
        // «Pagar tarjeta» sale de la cuenta con que dijiste que la pagas (efectivo → Efectivo).
        await irA('midinero', 'tarjeta', t.id);
        await clic('[data-fk="t-pagar"]', 400);
        check('«Pagar tarjeta»: desde la cuenta del medio elegido', await ev('P.ui.hoja && P.ui.hoja.lugar'), await ev(`P.st.medios.find((m) => m.id === 'efectivo').lugar`));
        check('y avisa que pagarla hoy sale de lo que tienes (iba con lo que tienes: no)', await texto('.hoja'), contiene('tu libre no cambia'));
    });
}

// ================================================================ T2 tarjeta del Primer día
if (partes.includes(2)) {
    await seccion('T2 tarjeta del Primer día', async () => {
        await primerDia('2026-10-19', { tarjeta: { banco: 'Agrícola', debe: '2000', corte: '21', pago: '15', usual: '150' } });
        const id = await ev(`P.st.tarjetas[0].id`);
        await irA('midinero', 'tarjeta', id);
        await clic('[data-fk="editar-tarjeta"]', 400);
        const editar = await etiquetas();
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?» y «Alias», igual al crear y al editar (antes,
        // al editar era su nombre, «Crédito Agrícola»). Su nombre coincide con un banco de la lista: sale elegido.
        comparar(notas.T2crear, editar);
        check('trae lo del Primer día', [await pulsado('op-banco-Agrícola'), await valor('#f-apodo'), await valor('#f-corte'), await valor('#f-pagoDia'), await valor('#f-usualNueva'), await valor('#f-debeHoy')], ['true', '', '21', '15', '150.00', '2000.00']);
        await escribir('#f-apodo', 'La de la casa');
        await escribir('#f-debeHoy', '1800');
        await guardar('deuda-ok');
        check('el alias se guarda y el nombre no cambia solo', await ev(`[P.st.tarjetas[0].nombre, P.st.tarjetas[0].apodo, P.st.medios.find((m) => m.tarjeta === P.st.tarjetas[0].id).nombre]`), ['Crédito Agrícola', 'La de la casa', 'Crédito Agrícola']);
        check('la ficha se llama como su alias', await texto('#pantalla .pg-head'), contiene('La de la casa'));
        check('ficha: «~$1,800 · Por confirmar con tu estado de cuenta»', await texto('#pantalla .ficha-cifra'), (x) => x.includes('~$1,800') && x.includes('Por confirmar con tu estado de cuenta'));
        await foto('T2-ficha');
    });
}

// ================================================================ T3 tarjeta con su estado de cuenta
if (partes.includes(3)) {
    await seccion('T3 tarjeta con su estado de cuenta', async () => {
        await primerDia();
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' }); true`);
        await esperar(300);
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?»; «Otro» pide el nombre.
        await clic('[data-fk="op-banco-Otro"]');
        await escribir('#f-otroNombre', 'Visa Cuscatlán');
        await escribir('#f-corte', '10');
        await escribir('#f-pagoDia', '5');
        await escribir('#f-ecTotal', '300');
        await escribir('#f-ecMinimo', '25');
        await guardar('deuda-ok');
        const id = await ev(`P.st.tarjetas.find((x) => x.nombre === 'Visa Cuscatlán').id`);
        const l0 = await libre();
        const q0 = await ev(`P.calc().proxima.salePagos`);
        await irA('midinero', 'tarjeta', id);
        await clic('[data-fk="editar-tarjeta"]', 400);
        check('trae su estado de cuenta', [await valor('#f-ecTotal'), await valor('#f-ecMinimo'), await hay('#f-usualNueva')], ['300.00', '25.00', false]);
        await escribir('#f-ecTotal', '320');
        await guardar('deuda-ok');
        check('el pago de contado nuevo (eligió «Todo»): $320', await ev(`P.st.tarjetas.find((x) => x.id === ${js(id)}).estados.at(-1).aPagar`), 32000);
        // v2.8 (D-4, U01): el estado de cuenta (vence el 5 nov) se paga con la quincena del 30: hoy el libre no cambia y
        // esa quincena paga $20 más (antes: el libre bajaba $20).
        check('Hoy: el libre no cambia y la quincena del 30 paga $20 más', [l0 - (await libre()), (await ev(`P.calc().proxima.salePagos`)) - q0], [0, 2000]);
        check('la ficha lo dice', await texto('#pantalla'), contiene('$320.00'));
    });
}

// ================================================================ T4 préstamo y casa comercial
if (partes.includes(4)) {
    await seccion('T4 préstamo → casa comercial', async () => {
        await primerDia();
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'prestamo' }); true`);
        await esperar(300);
        const crear = await etiquetas();
        await escribir('#f-nombre', 'Cooperativa');
        await escribir('#f-cuota', '80');
        await escribir('#f-dia', '22');
        await escribir('#f-debe', '1200');
        const debito4 = await ev(`P.st.medios.find((m) => m.tarjetaDebito).id`);
        await clic(`[data-fk="op-medio-${debito4}"]`);
        await guardar('deuda-ok');
        const id = await ev(`P.st.pagos.find((p) => p.nombre === 'Cooperativa').id`);
        await irA('midinero', 'pago', id);
        await clic('[data-fk="editar-pago"]', 400);
        const editar = await etiquetas();
        comparar(crear, editar);
        check('trae lo que tiene', [await valor('#f-nombre'), await valor('#f-cuota'), await valor('#f-dia'), await valor('#f-debe'), await pulsado('op-medio-' + debito4), await pulsado('td-prestamo')], ['Cooperativa', '80.00', '22', '1200.00', 'true', 'true']);
        await clic('[data-fk="td-casacomercial"]');
        await escribir('#f-nombre', 'Almacén La Esquina');
        await escribir('#f-cuota', '90');
        await escribir('#f-dia', '25');
        await escribir('#f-debe', '1100');
        await clic('[data-fk="op-medio-efectivo"]');
        await guardar('deuda-ok');
        const p = await ev(`P.st.pagos.find((x) => x.id === ${js(id)})`);
        check('guardado (también el tipo y su emoji)', [p.tipoDeuda, p.emoji, p.nombre, p.monto, p.dia, p.deuda.debe, p.medio], ['casacomercial', '🛍️', 'Almacén La Esquina', 9000, 25, 110000, 'efectivo']);
        await irA('midinero', 'deudas');
        check('Deudas: «Casa comercial · Cuota $90.00 al mes, el 25» y ~$1,100', await pantalla(), (x) => x.includes('Casa comercial · Cuota $90.00 al mes, el 25') && x.includes('~$1,100'));
        await irA('pagos');
        check('Pagos: el 25 oct, $90', await ev(`MOTOR.ocurrenciasPago(P.st, P.st.pagos.find((x) => x.id === ${js(id)}), '2026-10-01', '2026-10-31').map((o) => o.fecha + ':' + o.monto)`), ['2026-10-25:9000']);
        await irA('hoy');
        check('Hoy: el nombre nuevo en Próximos pagos', await pantalla(), contiene('Almacén La Esquina'));
    });
}

// ================================================================ T5 cuota desde «+ Pago»
if (partes.includes(5)) {
    await seccion('T5 cuota desde «+ Pago»', async () => {
        await primerDia();
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        await clic('[data-fk="np-cuota"]', 500);
        check('abre el mismo formulario de Mi dinero', await texto('#hoja-t'), 'Tarjeta o préstamo');
        const desdePagos = await etiquetas();
        await ev(`P.abrirHoja('nuevaDeuda', { tipoInicial: 'prestamo' }); true`);
        await esperar(300);
        check('con las mismas preguntas', desdePagos, await etiquetas());
    });
}

// ================================================================ T6 cuchubal (con su turno)
if (partes.includes(6)) {
    await seccion('T6 cuchubal', async () => {
        await primerDia();
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        await clic('[data-fk="np-otro"]');
        await clic('[data-fk="op-frecuente-cuchubal"]');
        await escribir('#f-monto', '25');
        await elegirFecha('turno', '2026-11-30');
        await escribir('#f-turnoMonto', '250');
        // v2.8 (APROBADO por Victor, 2026-10-22): sin «¿Con qué lo pagas?» no se guarda (antes venía elegido el primero).
        await clic('[data-fk="op-medio-efectivo"]');
        const crear = await etiquetas();
        await guardar();
        const id = await ev(`P.st.pagos.find((p) => /cuchubal/i.test(p.nombre)).id`);
        await irA('pagos', 'pago', id);
        await clic('[data-fk="editar-pago"]', 400);
        const editar = await etiquetas();
        // «¿Cuál pago?» elige un pago frecuente (un atajo para llenar el nombre), no es un dato.
        comparar(crear, editar, ['¿Cuál pago?']);
        check('trae su turno', [await pulsado('cal-turno-2026-11-30'), await valor('#f-turnoMonto')], ['true', '250.00']);
        await elegirFecha('turno', '2026-12-15');
        await escribir('#f-turnoMonto', '300');
        await escribir('#f-monto', '30');
        await guardar();
        const turno = await ev(`(() => { const p = P.st.pagos.find((x) => x.id === ${js(id)}); const i = P.st.ingresos.find((x) => x.id === p.turno); return { monto: p.monto, turno: i && [i.fecha, i.monto, i.activo !== false], turnos: P.st.ingresos.filter((x) => /turno/i.test(x.nombre) && x.activo !== false).length }; })()`);
        notas.T6 = turno;
        check('guardado: aporte $30 y el turno el 15 dic por $300 (uno solo)', turno, { monto: 3000, turno: ['2026-12-15', 30000, true], turnos: 1 });
        check('la ficha dice su turno', await texto('#pantalla'), (x) => x.includes('15 de diciembre') && x.includes('$300.00'));
        await ev(`P.ui.hoja = null; P.irTab('pagos'); true`);
        await esperar(300);
        check('Pagos (el mes de diciembre): «Tu turno del cuchubal» $300', await ev(`MOTOR.ocurrenciasIngreso(P.st, P.st.ingresos.find((x) => /turno/i.test(x.nombre) && x.activo !== false), '2026-12-01', '2026-12-31').map((o) => o.fecha + ':' + o.monto)`), ['2026-12-15:30000']);
    });
}

// ================================================================ T7 pago fijo («Se cobra solo»)
if (partes.includes(7)) {
    await seccion('T7 pago fijo', async () => {
        await primerDia();
        const debito = await ev(`P.st.medios.find((m) => m.tarjetaDebito).id`);
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        await clic('[data-fk="np-otro"]');
        await escribir('#f-nombre', 'Gimnasio');
        await escribir('#f-monto', '25');
        await clic('[data-fk="dia-dia-28"]');
        await clic(`[data-fk="op-medio-${debito}"]`);
        // v2.8 (APROBADO por Victor, 2026-10-22): con un banco o una tarjeta, «¿Se cobra solo?» (antes, un chip).
        await clic('[data-fk="op-solo-si"]');
        const crear = await etiquetas();
        await guardar();
        const id = await ev(`P.st.pagos.find((p) => p.nombre === 'Gimnasio').id`);
        check('se cobra solo (guardado)', await ev(`P.st.pagos.find((p) => p.id === ${js(id)}).automatico`), true);
        await irA('pagos', 'pago', id);
        await clic('[data-fk="editar-pago"]', 400);
        const editar = await etiquetas();
        comparar(crear, editar, ['¿Cuál pago?']);
        check('trae lo que tiene', [await valor('#f-nombre'), await valor('#f-monto'), await pulsado('dia-dia-28'), await pulsado('op-medio-' + debito), await pulsado('op-solo-si'), await pulsado('estimado')], ['Gimnasio', '25.00', 'true', 'true', 'true', 'false']);
        await escribir('#f-monto', '30');
        await clic('[data-fk="estimado"]');
        await clic('[data-fk="dia-dia-27"]');
        // En efectivo no se pregunta si se cobra solo (y deja de cobrarse solo).
        await clic('[data-fk="op-medio-efectivo"]');
        check('con Efectivo no sale «¿Se cobra solo?»', await hay('[data-campo="solo"]'), false);
        await guardar();
        const p = await ev(`P.st.pagos.find((x) => x.id === ${js(id)})`);
        check('guardado', [p.monto, p.estimado, p.dia, p.medio, !!p.automatico], [3000, true, 27, 'efectivo', false]);
        await ev(`P.ui.hoja = null; P.irTab('pagos'); P.abrir('misPagos'); true`).catch(() => null);
        await esperar(300);
        check('Pagos: el 27 oct, ~$30 (estimado)', await ev(`MOTOR.ocurrenciasPago(P.st, P.st.pagos.find((x) => x.id === ${js(id)}), '2026-10-01', '2026-10-31').map((o) => o.fecha + ':' + o.monto + ':' + !!o.estimado)`), ['2026-10-27:3000:true']);
        await irA('hoy');
        check('Hoy: en Próximos pagos', await pantalla(), contiene('Gimnasio'));
    });
}

// ================================================================ T8 ingreso esperado
if (partes.includes(8)) {
    await seccion('T8 ingreso esperado', async () => {
        await primerDia();
        await ev(`P.abrirHoja('nuevoIngreso', {}); true`);
        await esperar(300);
        await clic('[data-fk="op-tipoIng-otro"]');
        await escribir('#f-nombre', 'Salario de Luis');
        await escribir('#f-monto', '300');
        await clic('[data-fk="op-frecuencia-quincenal"]');
        await clic('[data-fk="op-lugar-banco"]').catch(async () => clic(`[data-fk^="op-lugar-"]`));
        const crear = await etiquetas();
        await guardar();
        const id = await ev(`P.st.ingresos.find((i) => i.nombre === 'Salario de Luis').id`);
        await ev(`P.ui.hoja = null; P.abrirHoja('nuevoIngreso', { id: ${js(id)} }); true`);
        await esperar(300);
        const editar = await etiquetas();
        comparar(crear, editar);
        check('¿Dónde lo recibes? (como en el Primer día)', editar, (x) => x.includes('¿Dónde lo recibes?'));
        await escribir('#f-monto', '350');
        await clic('[data-fk="op-lugar-efectivo"]');
        await guardar();
        const i = await ev(`P.st.ingresos.find((x) => x.id === ${js(id)})`);
        check('guardado', [i.monto, i.lugar], [35000, 'efectivo']);
        // v2.8 (C-8): la próxima quincena está en Mi plan.
        await irA('pagos');
        check('Mi plan: la próxima quincena incluye lo de Luis (~$350)', await pantalla(), contiene('~$350'));
    });
}

// ================================================================ T9 ahorro
if (partes.includes(9)) {
    await seccion('T9 ahorro', async () => {
        await primerDia();
        const l0 = await libre();
        await ev(`P.abrirHoja('apartar', {}); true`);
        await esperar(300);
        await escribir('#f-monto', '40');
        await escribir('#f-nuevo', 'Regalo');
        await guardar();
        check('Hoy: el libre baja $40', l0 - (await libre()), 4000);
        const id = await ev(`P.st.apartados.find((a) => a.nombre === 'Regalo').id`);
        await ev(`P.ui.hoja = null; P.irTab('midinero'); P.abrir('apartado', ${js(id)}); P.abrirHoja('meta', { id: ${js(id)} }); true`);
        await esperar(300);
        const editar = await etiquetas();
        notas.T9 = { editar };
        check('editar: nombre, meta y fecha', editar, (x) => x.includes('¿Cómo se llama?') && x.includes('¿Cuánto quieres juntar?') && x.includes('¿Para cuándo?'));
        await escribir('#f-nombre', 'Regalo de mamá');
        await escribir('#f-monto', '100');
        await guardar();
        const a = await ev(`P.st.apartados.find((x) => x.id === ${js(id)})`);
        check('guardado', [a.nombre, a.meta, a.monto], ['Regalo de mamá', 10000, 4000]);
        await irA('midinero', 'ahorros');
        check('Ahorros: el nombre nuevo y 40 % de $100.00', await pantalla(), (x) => x.includes('Regalo de mamá') && x.includes('40 % de $100.00'));
    });
}

// ================================================================ T10 cuenta
if (partes.includes(10)) {
    await seccion('T10 cuenta', async () => {
        await primerDia();
        await ev(`P.abrirHoja('lugar', {}); true`);
        await esperar(300);
        const crear = await etiquetas();
        await clic('[data-fk="op-clase-banco"]');
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿De qué banco o cooperativa?» y «Alias (opcional)» reemplazan «¿Cómo se llama?».
        await clic('[data-fk="op-banco-Cuscatlán"]');
        await escribir('#f-monto', '200');
        await guardar('lugar-ok');
        const id = await ev(`P.st.lugares.find((l) => l.nombre === 'Banco Cuscatlán').id`);
        check('con su débito', await ev(`P.st.medios.some((m) => m.lugar === ${js(id)} && m.tarjetaDebito && !m.oculto)`), true);
        const l0 = await libre();
        await ev(`P.ui.hoja = null; P.abrirHoja('lugar', { id: ${js(id)} }); true`);
        await esperar(300);
        const editar = await etiquetas();
        comparar(crear, editar);
        check('trae lo que tiene', [await pulsado('op-banco-Cuscatlán'), await valor('#f-apodo'), await valor('#f-monto'), await pulsado('lugar-debito'), await pulsado('op-clase-banco')], ['true', '', '200.00', 'true', 'true']);
        await escribir('#f-apodo', 'La de la casa');
        await escribir('#f-monto', '250');
        await clic('[data-fk="lugar-debito"]');
        await guardar('lugar-ok');
        check('Hoy: el libre sube $50 (cuadre de hoy)', (await libre()) - l0, 5000);
        check('su débito ya no aparece para elegir', await ev(`P.st.medios.some((m) => m.lugar === ${js(id)} && m.tarjetaDebito && !m.oculto)`), false);
        check('se llama como su alias y guarda su banco', await ev(`(() => { const l = P.st.lugares.find((x) => x.id === ${js(id)}); return [l.nombre, l.banco]; })()`), ['La de la casa', 'Cuscatlán']);
        await irA('midinero', 'cuentas');
        check('Cuentas: el alias con $250.00', await pantalla(), (x) => x.includes('La de la casa') && x.includes('$250.00'));
        await ev(`P.ui.hoja = null; P.abrirHoja('lugar', { id: ${js(id)} }); true`);
        await esperar(300);
        check('al editar otra vez: su banco elegido y su alias', [await pulsado('op-banco-Cuscatlán'), await valor('#f-apodo')], ['true', 'La de la casa']);
        await ev(`P.cerrarHoja({ sinFoco: true }); true`);
    });
}

// ================================================================ T11 medio de pago
if (partes.includes(11)) {
    await seccion('T11 medio de pago', async () => {
        await primerDia();
        await ev(`P.abrirHoja('medio', {}); true`);
        await esperar(300);
        await clic('[data-fk="op-clase-debito"]');
        const crear = await etiquetas();
        await escribir('#f-nombre', 'Débito Cuscatlán');
        await clic('[data-fk="op-lugar-banco"]');
        await guardar('medio-ok');
        const id = await medioId('Débito Cuscatlán');
        await ev(`P.ui.hoja = null; P.abrirHoja('medio', { id: ${js(id)} }); true`);
        await esperar(300);
        const editar = await etiquetas();
        comparar(crear, editar);
        check('trae lo que tiene', [await valor('#f-nombre'), await pulsado('op-clase-debito'), await pulsado('op-lugar-banco')], ['Débito Cuscatlán', 'true', 'true']);
        await clic('[data-fk="op-clase-transferencia"]');
        await escribir('#f-nombre', 'Transferencia Cuscatlán');
        await clic('[data-fk="op-lugar-efectivo"]');
        await guardar('medio-ok');
        const m = await ev(`P.st.medios.find((x) => x.id === ${js(id)})`);
        check('guardado', [m.nombre, m.lugar, !!m.tarjetaDebito, m.emoji], ['Transferencia Cuscatlán', 'efectivo', false, '🔁']);
        await irA('midinero', 'cuentas');
        check('Cuentas: «Con qué pagas» con el nombre nuevo', await pantalla(), contiene('Transferencia Cuscatlán'));
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(300);
        check('para elegir en «+ Pago»', await texto('.hoja'), contiene('Transferencia Cuscatlán'));
    });
}

console.log(JSON.stringify({ version: await ev('window.VERSION_PROTOTIPO').catch(() => null), checks, fallos, notas, errores: b.errores, fallidas: b.fallidas }, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
