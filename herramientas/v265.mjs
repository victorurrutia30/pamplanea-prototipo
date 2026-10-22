// PRUEBA v2.6.5 (V2-80 a V2-82): «Pagado» y «Recibí» sin duplicar ni pagar el futuro por error, y pagos sin repetir.
// Con datos propios («Marta», los de Ana el miércoles 21 de octubre: la luz del 12 de octubre sin pagar; el colegio
// del 5 de octubre pagado y el del 5 de noviembre por pagar; la quincena del 15 llegó y la del 30 no):
//  A) V2-80 «Pagado»: cada ocurrencia UNA vez («Pagado ✓» + «Deshacer», sin un segundo «Pagado»); por adelantado solo
//     la próxima, con «Este pago es del 5 de noviembre. ¿Ya lo pagaste por adelantado?» [Sí, ya lo pagué] [Cancelar];
//     una más lejana: «Primero el del …»; la vencida primero; los números de Hoy, Pagos y Mes sin contar doble.
//  B) V2-81 «Recibí»: el ingreso esperado UNA vez por ocurrencia («Recibido ✓» + «Deshacer»); por adelantado solo el
//     próximo, con confirmación; anotar «Recibí» de tipo Salario cerca de la quincena pregunta «¿Es tu quincena del 30?»
//     [Sí, marcarla como recibida] [No, es otro ingreso] (con «Sí» no se crea un ingreso nuevo); si ya estaba recibida,
//     lo dice. Los números del libre y del próximo periodo (para el reporte).
//  C) V2-82 sin repetir pagos: «+ Pago» con un nombre igual o parecido, o con la misma categoría, día y monto,
//     pregunta «Ya tienes «Luz» el 12 por ~$35.00. ¿Es otro pago?» [Ver el que tengo] [Sí, es otro]; lo mismo al
//     editar y en Anotar («Recordarme un pago»); anotar «luz» marca el pago (la conexión de siempre) y, si ya estaba
//     pagado, ofrece el siguiente; «Completar tu Primer día» no repite lo que ya tienes («Ya está en Pagos»).
// Uso: node herramientas/v265.mjs [--base=http://…/] [--puerto=9975] [--partes=abc] [--tema=ancla-oscuro]
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const partes = (args.partes || 'abc').toLowerCase();
const tema = args.tema || 'serena-claro';
const salida = path.join(root, 'capturas', 'v265' + (args.base ? '-servida' : '') + (args.tema ? '-' + args.tema : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9975) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
const notas = {};
let actual = '';
let checks = 0;
const check = (nombre, real, esperado) => {
    checks++;
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${JSON.stringify(real)}`);
    return ok;
};
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const clic = async (sel, espera = 300) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(espera);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.innerText.replace(/\\s+/g, ' ').trim() ?? null`);
const escribir = async (sel, v) => {
    await ev(`(() => { const el = document.querySelector(${js(sel)}); el.focus(); el.value = ${js(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await esperar(200);
};
const foto = (n) => b.captura(path.join(salida, n + '.png'));
const dlg = () => ev(`P.dlg && P.dlg.abierto ? document.getElementById('capa-dlg').innerText.replace(/\\s+/g, ' ').trim() : null`);
const toast = () => texto('.toast');
async function abrirApp() {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(600);
}
async function conDatos() {
    await abrirApp();
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-01T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: ['2026-10-19'], anotaciones: 1, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true, cuentas: true, ahorros: true, deudas: true } }));
        return true;
    })()`);
    await abrirApp();
}
/** Los números que se miran después de cada paso (los del motor y lo que dice la pantalla). */
const numeros = () =>
    ev(`(() => { const k = P.calc(); const prox = k.periodos && k.periodos[0]; const mes = P.st.registros.filter((r) => r.tipo === 'gasto' && r.fecha.slice(0, 7) === '2026-10').reduce((t, r) => t + r.monto, 0); return { libre: k.libre, tienes: k.tienes, horizonte: MOTOR.horizonte(P.st).fecha, proxQuedan: prox ? prox.quedan : null, gastosOct: mes, registros: P.st.registros.length }; })()`);
const estadoPago = (id, f) => ev(`(MOTOR.ocurrenciasPago(P.st, MOTOR.pago(P.st, ${js(id)}), ${js(f)}, ${js(f)})[0] || {}).estado || null`);
const estadoIngreso = (id, f) => ev(`(MOTOR.ocurrenciasIngreso(P.st, MOTOR.ingreso(P.st, ${js(id)}), ${js(f)}, ${js(f)})[0] || {}).estado || null`);
const abrirFicha = async (tipo, id) => {
    await ev(`P.abrir(${js(tipo)}, ${js(id)}); true`);
    await esperar(400);
};
/** Cada parte por separado: si una se rompe, las demás igual se prueban. */
async function seccion(nombre, fn) {
    actual = nombre;
    try {
        await fn();
    } catch (e) {
        fallos.push(`${actual}: excepción: ${e.message}`);
        await foto('ERROR-' + nombre.slice(0, 12).replace(/[^\w]+/g, '-')).catch(() => null);
    }
}

// ================================================================ A) V2-80 «Pagado»
if (partes.includes('a')) {
    await seccion('A1 por adelantado (colegio del 5 nov)', async () => {
        await conDatos();
        const n0 = await numeros();
        notas.inicio = n0;
        await abrirFicha('pago', 'colegio');
        check('la ficha ofrece el del 5 de noviembre', await texto('.ficha-prox'), (t) => /5 de noviembre/.test(String(t)));
        await clic('[data-fk="ficha-pagado"]');
        check('pregunta antes de pagar el futuro', await dlg(), (t) => /Este pago es del 5 de noviembre\./.test(String(t)) && /¿Ya lo pagaste por adelantado\?/.test(String(t)) && /Sí, ya lo pagué/.test(String(t)) && /Cancelar/.test(String(t)));
        await foto('A1-confirmar-adelanto');
        await clic('[data-fk="dlg-no"]');
        check('«Cancelar» no cambia nada', [await estadoPago('colegio', '2026-11-05'), (await numeros()).registros], ['pendiente', n0.registros]);
        await clic('[data-fk="ficha-pagado"]');
        await clic('[data-fk="dlg-si"]', 500);
        const n1 = await numeros();
        notas.colegioAdelantado = n1;
        check('pagado: el del 5 de noviembre', await estadoPago('colegio', '2026-11-05'), 'pagado');
        check('un solo gasto nuevo de $20 hoy', [n1.registros - n0.registros, await ev(`P.st.registros.filter((r) => r.pago === 'colegio' && r.fecha === '2026-10-21').map((r) => r.monto)`)], [1, [2000]]);
        check('el libre de hoy baja $20 (sale hoy de tu banco)', n0.libre - n1.libre, 2000);
        check('la próxima quincena ya no lo cuenta: le quedan $20 más (sin contar doble)', n1.proxQuedan - n0.proxQuedan, 2000);
        check('Mes: el gasto en octubre, una vez', n1.gastosOct - n0.gastosOct, 2000);
        check('la ficha: «Pagado ✓» con «Deshacer», sin otro «Pagado»', [await texto('.ficha-prox'), await hay('[data-fk="ficha-pagado"]'), await hay('[data-fk="ficha-deshacer"]')], (x) => /Pagado ✓/.test(String(x[0])) && /5 de noviembre/.test(String(x[0])) && x[1] === false && x[2] === true);
        await foto('A1-ficha-pagado');
        // Hoy: el colegio se ve «Pagado ✓» con «Deshacer», sin el de diciembre con otro «Pagado».
        await clic('[data-fk="nav-hoy"]', 400);
        check('Hoy: «Pagado ✓» y «Deshacer», sin otro «Pagado» del colegio', await ev(`(() => { const f = document.querySelector('[data-fk="p-colegio-2026-11-05"]'); const li = f && f.closest('li'); return { pagado: !!li && /Pagado ✓/.test(li.innerText), deshacer: !!document.querySelector('[data-fk="deshacer-p-colegio-2026-11-05"]'), otro: !!document.querySelector('[data-fk^="pagado-p-colegio-"]') }; })()`), { pagado: true, deshacer: true, otro: false });
        await foto('A1-hoy-pagado');
        await abrirFicha('pago', 'colegio');
        // Un «Pagado» viejo (de una pantalla sin redibujar) no paga dos veces.
        await ev(`P.acciones.pagado({ tipo: 'pago', id: 'colegio', fecha: '2026-11-05' }); true`);
        await esperar(400);
        check('marcar otra vez el mismo: no duplica y lo dice', [(await numeros()).registros, await toast()], (x) => x[0] === n1.registros && /Ya está pagado/.test(String(x[1])));
        // El de diciembre ahora es el próximo: se puede, con confirmación.
        await ev(`P.acciones.pagado({ tipo: 'pago', id: 'colegio', fecha: '2026-12-05' }); true`);
        await esperar(300);
        check('el de diciembre (ahora el próximo) pregunta', await dlg(), (t) => /Este pago es del 5 de diciembre\./.test(String(t)));
        await clic('[data-fk="dlg-no"]');
        // «Deshacer» en la ficha.
        await clic('[data-fk="ficha-deshacer"]', 500);
        const n2 = await numeros();
        check('«Deshacer»: vuelve a estar por pagar, sin restos', [await estadoPago('colegio', '2026-11-05'), n2.registros, n2.libre], ['pendiente', n0.registros, n0.libre]);
    });
    await seccion('A2 la vencida primero (luz del 12 oct)', async () => {
        await conDatos();
        check('la luz del 12 de octubre está vencida', await estadoPago('luz', '2026-10-12'), 'vencido');
        await ev(`P.acciones.pagado({ tipo: 'pago', id: 'luz', fecha: '2026-11-12' }); true`);
        await esperar(400);
        check('la de noviembre no se puede: «Primero el del 12 de octubre.»', [await dlg(), await toast(), await estadoPago('luz', '2026-11-12')], (x) => x[0] === null && /Primero el del 12 de octubre\./.test(String(x[1])) && x[2] === 'pendiente');
        // En Hoy («Próximos pagos»), la de noviembre se ve apagada (la de octubre está en el aviso de arriba).
        await clic('[data-fk="nav-hoy"]', 400);
        const boton = await ev(`(() => { const b = document.querySelector('[data-fk="pagado-p-luz-2026-11-12"]'); return b ? b.classList.contains('btn--espera') : null; })()`);
        check('Hoy: la luz del 12 de noviembre, «Pagado» apagado', boton, true);
        if (boton) {
            await ev(`document.querySelector('[data-fk="pagado-p-luz-2026-11-12"]').scrollIntoView({ block: 'center' }); true`);
            await clic('[data-fk="pagado-p-luz-2026-11-12"]', 400);
            check('tocarlo dice cuál va primero', [await toast(), await estadoPago('luz', '2026-11-12')], (x) => /Primero el del 12 de octubre\./.test(String(x[0])) && x[1] === 'pendiente');
        }
        await foto('A2-hoy-luz-espera');
        await clic('[data-fk="nav-hoy"]', 300);
        await ev(`P.acciones.pagado({ tipo: 'pago', id: 'luz', fecha: '2026-10-12' }); true`);
        await esperar(400);
        check('la vencida no pregunta «por adelantado»: abre su hoja (es un estimado)', [await dlg(), await ev('P.ui.hoja && P.ui.hoja.tipo')], [null, 'pagado']);
        await escribir('#f-monto', '34');
        await clic('[data-fk="hoja-ok"]', 500);
        check('pagada la de octubre', await estadoPago('luz', '2026-10-12'), 'pagado');
        await ev(`P.acciones.pagado({ tipo: 'pago', id: 'luz', fecha: '2026-11-12' }); true`);
        await esperar(300);
        check('ahora la de noviembre: por adelantado, con confirmación', await dlg(), (t) => /Este pago es del 12 de noviembre\./.test(String(t)));
        await clic('[data-fk="dlg-si"]', 500);
        check('y su hoja para escribir cuánto fue', await ev('P.ui.hoja && P.ui.hoja.tipo'), 'pagado');
        await escribir('#f-monto', '36');
        await clic('[data-fk="hoja-ok"]', 500);
        check('pagada la de noviembre', await estadoPago('luz', '2026-11-12'), 'pagado');
    });
    await seccion('A3 Anotar «colegio 20» y «luz 35»', async () => {
        await conDatos();
        const anotar = async (frase) => {
            await clic('[data-fk="nav-anotar"]', 300);
            await escribir('#anotar-q', frase);
            await esperar(300);
        };
        // «luz 35»: la conexión de siempre: marca la vencida (12 oct).
        await anotar('luz 35');
        check('«luz 35» marca la luz del 12 de octubre', await ev(`({ tipo: P.ui.hoja.d.tipo, ocurrencia: P.ui.hoja.d.ocurrencia, boton: document.querySelector('[data-fk="anotar-guardar"]')?.innerText.trim() })`), { tipo: 'pagado', ocurrencia: '2026-10-12', boton: 'Marcar pagado' });
        // v2.8 (C-4, P-1): primero «¿Es tu Luz del 12 de octubre?» — «Sí, es ese». (Ajuste 3 (APROBADO por Victor, 2026-10-22), FM-8: «pago» solo para deudas.)
        check('pregunta «¿Es tu Luz del 12 de octubre?»', await texto('#l-cualPlan'), '¿Es tu Luz del 12 de octubre?');
        await clic('[data-fk="plan-si"]', 300);
        await clic('[data-fk="anotar-guardar"]', 600);
        check('pagada la de octubre', await estadoPago('luz', '2026-10-12'), 'pagado');
        // «colegio 20»: el de octubre ya está pagado; el próximo es el 5 de noviembre: lo ofrece, sin suponer.
        await anotar('colegio 20');
        check('ofrece el pago del 5 de noviembre', await texto('#capa-hoja'), (t) => /¿Es el pago de Colegio del 5 de noviembre\?/.test(String(t)));
        await foto('A3-anotar-colegio');
        await clic('[data-fk="cual-pago-si"]', 300);
        check('con «Sí, ya lo pagué»: marcar pagado ese', await ev(`({ tipo: P.ui.hoja.d.tipo, ocurrencia: P.ui.hoja.d.ocurrencia })`), { tipo: 'pagado', ocurrencia: '2026-11-05' });
        await clic('[data-fk="anotar-guardar"]', 600);
        check('pagado el del 5 de noviembre, sin un gasto suelto', [await estadoPago('colegio', '2026-11-05'), await ev(`P.st.registros.filter((r) => r.nombre === 'Colegio' && r.fecha === '2026-10-21').length`)], ['pagado', 1]);
        // Y si dice que no: un gasto aparte.
        await anotar('colegio 15');
        await clic('[data-fk="cual-pago-no"]', 300);
        check('con «No, es otro gasto»: un gasto aparte', await ev('P.ui.hoja.d.tipo'), 'gasto');
    });
}

// ================================================================ B) V2-81 «Recibí»
if (partes.includes('b')) {
    await seccion('B1 la ficha de la quincena', async () => {
        await conDatos();
        const n0 = await numeros();
        await abrirFicha('ingreso', 'quincena');
        check('ofrece la del 30, por adelantado', await hay('[data-fk="ing-llego"]'), true);
        await clic('[data-fk="ing-llego"]');
        check('pregunta antes de recibir el futuro', await dlg(), (t) => /Este ingreso es del 30 de octubre\./.test(String(t)) && /¿Ya te llegó por adelantado\?/.test(String(t)) && /Sí, ya llegó/.test(String(t)));
        await clic('[data-fk="dlg-si"]', 500);
        check('abre «¿Cuánto te llegó?»', await ev('P.ui.hoja && P.ui.hoja.tipo'), 'ingresoLlego');
        await clic('[data-fk="ing-ok"]', 700);
        if (await hay('[data-fk="rep-listo"]')) await clic('[data-fk="rep-listo"]', 500);
        const n1 = await numeros();
        notas.quincenaAdelantada = { antes: n0, despues: n1 };
        check('recibida la del 30', await estadoIngreso('quincena', '2026-10-30'), 'llego');
        await abrirFicha('ingreso', 'quincena');
        check('la ficha: «Recibido ✓» con «Deshacer», sin otro «Ya llegó»', [await texto('#pantalla'), await hay('[data-fk="ing-llego"]'), await hay('[data-fk="ing-deshacer"]')], (x) => /Recibido ✓/.test(String(x[0])) && x[1] === false && x[2] === true);
        await foto('B1-ficha-recibido');
        await clic('[data-fk="ing-deshacer"]', 500);
        check('«Deshacer»: vuelve a esperarse', [await estadoIngreso('quincena', '2026-10-30'), (await numeros()).libre], ['esperado', n0.libre]);
    });
    await seccion('B2 «Recibí» de tipo Salario', async () => {
        await conDatos();
        // v2.8 (C-5): «¿Es tu quincena?» se pregunta a ±10 % y ±3 días. (ajuste 2, C-5 reforzado, APROBADO por Victor 2026-10-22): con Salario, siempre:
        // también el 21, a 9 días de la del 30. Las respuestas: «Sí, es esa» / «No, es otro dinero».
        // Ajuste 3 (APROBADO por Victor, 2026-10-22), FM-3: «Me llegó dinero» ya no ofrece Salario (tu quincena se marca con «Es mi quincena del 30 →
        // Ya llegó», invariantes V19). Lo escrito como salario («me pagaron 600») sigue preguntando (C-5 y ajuste 2).
        const recibiSalario = async (monto) => {
            await clic('[data-fk="nav-anotar"]', 300);
            await escribir('#anotar-q', 'me pagaron ' + monto);
            await esperar(300);
        };
        await recibiSalario('600');
        check('el 21 (9 días antes), con Salario: también pregunta', await texto('#capa-hoja'), (t) => /¿Es tu quincena del 30\?/.test(String(t)));
        await ev(`P.cerrarHoja({ sinFoco: true }); P.st.hoy = '2026-10-28'; P.render(); true`);
        const n0 = await numeros();
        const ingresosAntes = await ev('P.st.ingresos.length');
        await recibiSalario('580');
        check('pregunta «¿Es tu quincena del 30?»', await texto('#capa-hoja'), (t) => /¿Es tu quincena del 30\?/.test(String(t)) && /Sí, es esa/.test(String(t)) && /No, es otro dinero/.test(String(t)));
        await foto('B2-es-tu-quincena');
        await clic('[data-fk="cual-esperado"]', 300);
        await clic('[data-fk="anotar-guardar"]', 700);
        if (await hay('[data-fk="rep-listo"]')) await clic('[data-fk="rep-listo"]', 500);
        const n1 = await numeros();
        notas.recibiSalario = { antes: n0, despues: n1 };
        check('con «Sí»: la del 30 queda recibida y NO hay un ingreso nuevo', [await estadoIngreso('quincena', '2026-10-30'), await ev('P.st.ingresos.length')], ['llego', ingresosAntes]);
        check('lo que llegó: $580', await ev(`P.st.ingresos.find((i) => i.id === 'quincena').llegadas['2026-10-30'].monto`), 58000);
        // Otra vez «Recibí» Salario: ya estaba recibida: lo dice.
        await recibiSalario('580');
        check('ya recibida: «Ya marcaste tu quincena del 30 como recibida. ¿Es otro ingreso?»', await texto('#capa-hoja'), (t) => /Ya marcaste tu quincena del 30 como recibida\. ¿Es otro ingreso\?/.test(String(t)));
        await foto('B2-ya-recibida');
    });
    await seccion('B3 «me pagaron 600» (V2-29 #10, con las palabras nuevas)', async () => {
        await conDatos();
        // v2.8 (C-5): «¿Es tu quincena?» se pregunta a ±10 % y ±3 días: el 21, a 9 días de la del 30, es un extra; el 28, sí.
        await ev(`P.st.hoy = '2026-10-28'; P.render(); true`);
        await clic('[data-fk="nav-anotar"]', 300);
        await escribir('#anotar-q', 'me pagaron 600');
        await esperar(300);
        check('pregunta «¿Es tu quincena del 30?»', await texto('#capa-hoja'), (t) => /¿Es tu quincena del 30\?/.test(String(t)));
        await clic('[data-fk="cual-extra"]', 300);
        await clic('[data-fk="anotar-guardar"]', 600);
        check('con «No, es otro ingreso»: la del 30 sigue esperada', await estadoIngreso('quincena', '2026-10-30'), 'esperado');
    });
}

// ================================================================ C) V2-82 sin repetir pagos
if (partes.includes('c')) {
    const nuevoPago = async ({ caja, frecuente, nombre, monto, dia }) => {
        await ev(`P.abrirHoja('nuevoPago', {}); true`);
        await esperar(400);
        if (caja) await clic(`[data-fk="np-${caja}"]`);
        if (frecuente) await clic(`[data-fk="op-frecuente-${frecuente}"]`);
        if (nombre !== undefined) await escribir('#f-nombre', nombre);
        if (monto) await escribir('#f-monto', monto);
        if (dia) await clic(`[data-fk="dia-dia-${dia}"]`);
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿Con qué lo pagas?» ya no viene elegido: lo que antes venía (Efectivo).
        await clic('[data-fk="op-medio-efectivo"]');
    };
    const pagos = (n) => ev(`P.st.pagos.filter((p) => MOTOR.normalizar(p.nombre) === MOTOR.normalizar(${js(n)})).length`);
    await seccion('C1 «+ Pago» con la luz que ya tienes', async () => {
        await conDatos();
        // Ajuste 3 (APROBADO por Victor, 2026-10-22), FM-1 (reemplaza V2-82): «Ya tienes «Luz» (el 12, ~$35)» sale al elegirla →
        // «Editar el que tengo» / «Es otro distinto» (con un nombre distinto, obligatorio).
        await nuevoPago({ caja: 'servicios', frecuente: 'luz', monto: '35', dia: 12 });
        check('la luz elegida se ve marcada', await ev(`(() => { const b = document.querySelector('[data-fk="op-frecuente-luz"]'); return b && b.getAttribute('aria-pressed'); })()`), 'true');
        check('lo dice al elegirla', await texto('#dup-t'), 'Ya tienes «Luz» (el 12, ~$35).');
        await clic('[data-fk="hoja-ok"]', 400);
        check('sin contestar no se crea', await pagos('Luz'), 1);
        await foto('C1-ya-tienes-luz');
        await clic('[data-fk="dup-editar"]', 500);
        check('«Editar el que tengo»: su formulario, sin crear otro', [await texto('#hoja-t'), await pagos('Luz')], ['Editar Luz', 1]);
        await ev('P.cerrarHoja && P.cerrarHoja({ sinFoco: true }); true');
        await nuevoPago({ caja: 'servicios', frecuente: 'luz', monto: '35', dia: 12 });
        await clic('[data-fk="dup-otro"]', 500);
        await escribir('#f-alias', 'Luz de la casa de mamá');
        await clic('[data-fk="hoja-ok"]', 400);
        if (await hay('.hoja .pregunta--antes')) await clic('[data-fk="hoja-ok"]', 400);
        check('«Es otro distinto»: se guarda con su nombre distinto', [await pagos('Luz'), await pagos('Luz de la casa de mamá')], [1, 1]);
    });
    await seccion('C2 parecido y misma categoría, día y monto', async () => {
        await conDatos();
        await nuevoPago({ caja: 'servicios', nombre: 'Luz eléctrica', monto: '35', dia: 12 });
        await clic('[data-fk="hoja-ok"]', 400);
        check('«Luz eléctrica» pregunta por «Luz»', await texto('#capa-hoja'), (t) => /Ya tienes «Luz»/.test(String(t)));
        await clic('[data-fk="hoja-x"], [data-fk="hoja-cancelar"]', 300).catch(() => null);
        await ev('P.cerrarHoja && P.cerrarHoja({ sinFoco: true }); true');
        await nuevoPago({ caja: 'servicios', nombre: 'Energía', monto: '35', dia: 12 });
        await clic('[data-fk="hoja-ok"]', 400);
        check('misma categoría, día y monto: pregunta', await texto('#capa-hoja'), (t) => /Ya tienes «Luz»/.test(String(t)));
        await ev('P.cerrarHoja && P.cerrarHoja({ sinFoco: true }); true');
        await nuevoPago({ caja: 'otro', nombre: 'Gimnasio', monto: '30', dia: 3 });
        await clic('[data-fk="hoja-ok"]', 400);
        check('uno distinto: se guarda sin preguntar', [await pagos('Gimnasio'), await ev('!!P.ui.hoja')], [1, false]);
    });
    await seccion('C3 al editar', async () => {
        await conDatos();
        await ev(`P.abrirHoja('editarPago', { id: 'agua' }); true`);
        await esperar(400);
        await escribir('#f-nombre', 'Internet');
        await clic('[data-fk="hoja-ok"]', 400);
        // Ajuste 3 (APROBADO por Victor, 2026-10-22), FM-1: al editar no se puede llamar como otro (nunca dos con el mismo nombre).
        check('cambiar Agua a «Internet» no se guarda', [await texto('#err-nombreDup'), await pagos('Internet'), await pagos('Agua')], ['Ya tienes uno con ese nombre. Ponle otro.', 1, 1]);
    });
    await seccion('C4 Anotar «Recordarme un pago»', async () => {
        await conDatos();
        await clic('[data-fk="nav-anotar"]', 300);
        await escribir('#anotar-q', 'recordarme luz el 12 35');
        await esperar(300);
        await clic('[data-fk="anotar-guardar"]', 400);
        // Ajuste 3 (APROBADO por Victor, 2026-10-22), FM-1: «Ya tienes «Luz» (el 12, ~$35)» → «Es otro distinto» pide un nombre distinto.
        check('pregunta antes de crear', await texto('#capa-hoja'), (t) => /Ya tienes «Luz» \(el 12, ~\$35\)\./.test(String(t)));
        check('todavía una sola luz', await pagos('Luz'), 1);
        await clic('[data-fk="dup-otro"]', 300);
        check('«Es otro distinto»: ya no pregunta y pide su nombre', [await ev(`!!document.querySelector('.pregunta--dup')`), await texto('label[for="f-nombre"]')], [false, '¿Cómo le llamas a este?']);
        await escribir('#f-nombre', 'Luz de mamá');
        await clic('[data-fk="op-frecuencia-mensual"]', 300);
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿Con qué lo pagas?» ya no se elige solo (antes, por el tipo de gasto): se
        // elige el mismo de antes y se contesta «¿Se cobra solo?».
        await clic('[data-fk="anotar-guardar"]', 400);
        await clic(`[data-fk="op-medio-${await ev("MOTOR.medioUsual(P.st, 'servicios').id")}"]`, 300);
        if (await hay('[data-fk="op-solo-no"]')) await clic('[data-fk="op-solo-no"]', 300);
        await clic('[data-fk="anotar-guardar"]', 500);
        check('«Es otro distinto»: se guarda con su nombre', [await pagos('Luz'), await pagos('Luz de mamá')], [1, 1]);
    });
    await seccion('C5 «Completar tu Primer día» no repite', async () => {
        await conDatos();
        await ev(`P.acciones.obCompletar(); true`);
        await esperar(500);
        for (let i = 0; i < 6 && (await ev('P.ui.ob && P.ui.ob.paso')) < 5; i++) {
            if (await hay('[data-fk="ob-siguiente"]')) await clic('[data-fk="ob-siguiente"]', 400);
            else if (await hay('[data-fk="ob-saltar"]')) await clic('[data-fk="ob-saltar"]', 400);
            else break;
        }
        const yaTienes = await ev(`(() => { const b = document.querySelector('[data-fk="ob-p-luz"]'); return b ? { texto: b.innerText.replace(/\\s+/g, ' ').trim(), tienes: b.classList.contains('chip--tienes') } : null; })()`);
        check('la luz que ya tienes: «Ya está en Pagos» y no se vuelve a elegir', yaTienes, (x) => !!x && /Ya está en Mi plan/.test(x.texto) && x.tienes);
        await clic('[data-fk="ob-p-luz"]', 300);
        check('tocarla solo dice dónde está', [await ev('!!(P.ui.ob && P.ui.ob.editando)'), await texto('.toast')], (x) => x[0] === false && /Ya tienes «Luz» en Mi plan/.test(String(x[1])));
        await clic('[data-fk="ob-p-luz"]', 300);
        check('tocarla solo dice dónde está', [await ev('!!(P.ui.ob && P.ui.ob.editando)'), await texto('.toast')], (x) => x[0] === false && /Ya tienes «Luz» en Mi plan/.test(String(x[1])));
        await foto('C5-completar-gastos-fijos');
    });
}

const informe = { checks, fallos, errores: b.errores, notas };
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify(informe, null, 1));
b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
