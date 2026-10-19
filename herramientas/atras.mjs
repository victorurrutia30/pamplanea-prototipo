// PRUEBA v2.6.1 (V2-72): el botón «atrás» del teléfono y el gesto de volver. Simula el «atrás» del sistema con
// history.back() (la misma navegación del historial que dispara el botón o el gesto) y revisa:
//  A) en Hoy sin nada abierto NO hay guarda: atrás sale de la app (no atrapa a la persona);
//  B) pestaña → atrás vuelve a Hoy; pantalla dentro de pestaña → atrás vuelve a la pestaña; la guarda se limpia
//     cuando se vuelve a Hoy con los botones de la app;
//  C) hoja sin cambios → atrás la cierra y el foco vuelve a lo que la abrió; hoja con algo escrito → pregunta
//     «¿Descartar los cambios?» («Seguir editando» la deja como estaba; «Descartar» la cierra); tocar fuera con
//     cambios también pregunta; Escape cierra como siempre, con o sin cambios (V2-50); la confirmación de eliminar se cierra;
//  D) Ayuda: atrás vuelve de «Tus datos» a Ayuda y después la cierra;
//  E) entrenamiento: atrás retrocede un paso; en el primero pregunta «¿Salir del entrenamiento?» («Seguir aquí» y
//     «Salir»); con «Hazlo tú» y una hoja abierta, primero cierra la hoja;
//  F) prueba guiada: en Hoy con la tarea en curso pregunta «¿Pausar la prueba?» y «Pausar» la pausa;
//  G) Primer día: atrás vuelve al paso anterior;
//  H) recargar con una pestaña abierta deja la guarda bien y atrás vuelve a Hoy; recargar en Hoy no deja guarda;
//  I) en la guía de escritorio (dentro del marco) no se toca el historial.
// Uso: node herramientas/atras.mjs [--base=http://…/] [--puerto=9969]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9969) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const fallos = [];
let actual = '';
const check = (nombre, real, esperado) => {
    const ok = typeof esperado === 'function' ? esperado(real) : JSON.stringify(real) === JSON.stringify(esperado);
    if (!ok) fallos.push(`${actual} · ${nombre}: ${JSON.stringify(real)}`);
    return ok;
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error(`${actual}: no encontré ${sel}`);
    await esperar(160);
};
/** El «atrás» del sistema. */
const atras = async () => {
    await ev('setTimeout(() => history.back(), 0); true');
    await esperar(260);
};
const estado = () =>
    ev(`({ tab: P.ui.tab, pila: P.ui.stack.map((x) => x.tipo), hoja: P.ui.hoja && P.ui.hoja.tipo, ayuda: P.ayuda.abierto ? P.ayuda.panel : null, tour: P.tour.activo ? P.tour.fase + ':' + P.tour.i : null, dlg: P.dlg && P.dlg.abierto && P.dlg.abierto.titulo, guarda: !!(history.state && history.state.pamplanea), url: location.href.split('/').pop() })`);
async function abrirApp(q = '') {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html' + q + '#tema=serena-claro');
    await esperar(500);
}
/** Datos de uso (Ana) ya configurados, en Hoy. */
async function enUso() {
    await abrirApp();
    await ev(`(() => {
        P.sinGuardar = true;
        localStorage.clear();
        const s = DATOS.crearAna();
        Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21' });
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-19T08:00:00.000Z', st: s, tab: 'hoy', tema: null, introVista: true, nombre: 'Marta', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 3, feedbackPospuesto: null, ultimaCopia: null, nombresVistos: [] }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true, ofertaTarjetas: 'no', tips: { hoy: true, pagos: true, midinero: true, mes: true, anotar: true, pago: true } }));
        return true;
    })()`);
    await abrirApp();
}

try {
    // ============================================================ A) en Hoy, atrás es del teléfono
    actual = 'A raíz';
    await enUso();
    check('arranca en Hoy sin guarda', await estado(), (e) => e.tab === 'hoy' && !e.guarda && !e.hoja);
    await atras();
    check('atrás en Hoy sale de la app', await ev('location.href'), 'about:blank');

    // ============================================================ B) pestañas y pantallas
    actual = 'B pestañas';
    await enUso();
    await clic('[data-fk="nav-pagos"]');
    check('Pagos pone la guarda', await estado(), (e) => e.tab === 'pagos' && e.guarda);
    await atras();
    check('atrás vuelve a Hoy, sin guarda', await estado(), (e) => e.tab === 'hoy' && !e.guarda);
    await clic('[data-fk="nav-midinero"]');
    await clic('[data-fk="md-cuentas"]');
    check('Mi dinero → Cuentas', await estado(), (e) => e.tab === 'midinero' && e.pila.join() === 'cuentas' && e.guarda);
    await atras();
    check('atrás vuelve a Mi dinero', await estado(), (e) => e.tab === 'midinero' && !e.pila.length && e.guarda);
    await atras();
    check('atrás vuelve a Hoy', await estado(), (e) => e.tab === 'hoy' && !e.guarda);
    await clic('[data-fk="nav-mes"]');
    await clic('[data-fk="nav-hoy"]');
    await esperar(300);
    check('volver a Hoy con la barra limpia la guarda', await estado(), (e) => e.tab === 'hoy' && !e.guarda);
    await atras();
    check('y el siguiente atrás sale de la app', await ev('location.href'), 'about:blank');

    // ============================================================ C) hojas
    actual = 'C hojas';
    await enUso();
    await ev(`document.querySelector('[data-fk="nav-anotar"]').focus(); true`);
    await clic('[data-fk="nav-anotar"]');
    check('Anotar abierta con guarda', await estado(), (e) => e.hoja === 'anotar' && e.guarda);
    await atras();
    check('atrás cierra Anotar sin cambios', await estado(), (e) => !e.hoja && !e.dlg);
    check('el foco vuelve al botón +', await ev('document.activeElement && document.activeElement.dataset.fk'), 'nav-anotar');
    await clic('[data-fk="nav-anotar"]');
    await ev(`(() => { const q = document.getElementById('anotar-q'); q.value = 'pupusas 6'; q.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await esperar(200);
    await atras();
    check('con algo escrito, pregunta', await estado(), (e) => e.hoja === 'anotar' && e.dlg === '¿Descartar los cambios?' && e.guarda);
    check('el foco está en «Seguir editando»', await ev('document.activeElement && document.activeElement.textContent'), 'Seguir editando');
    await clic('[data-fk="dlg-no"]');
    check('«Seguir editando» deja la hoja como estaba', await ev(`({ hoja: P.ui.hoja && P.ui.hoja.tipo, texto: document.getElementById('anotar-q')?.value, dlg: !!P.dlg.abierto })`), { hoja: 'anotar', texto: 'pupusas 6', dlg: false });
    await atras();
    await clic('[data-fk="dlg-si"]');
    const n0 = await ev('P.st.registros.length');
    check('«Descartar» la cierra sin guardar', await estado(), (e) => !e.hoja && !e.dlg);
    check('no se guardó nada', await ev('P.st.registros.length'), n0);
    // Tocar fuera y Escape, con cambios.
    await clic('[data-fk="nav-anotar"]');
    await ev(`(() => { const q = document.getElementById('anotar-q'); q.value = 'café 2'; q.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await esperar(150);
    await ev(`document.querySelector('.mask').dispatchEvent(new MouseEvent('click', { bubbles: true })); true`);
    await esperar(150);
    check('tocar fuera con cambios pregunta', await estado(), (e) => e.hoja === 'anotar' && e.dlg === '¿Descartar los cambios?');
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`);
    await esperar(150);
    check('Escape cierra la pregunta y deja la hoja', await estado(), (e) => e.hoja === 'anotar' && !e.dlg);
    // Escape en la computadora no cambia (V2-50): cierra aunque haya algo escrito y el foco vuelve al (+).
    await ev(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`);
    await esperar(150);
    check('Escape con cambios cierra como siempre', await estado(), (e) => !e.hoja && !e.dlg);
    // Escape sin cambios: cierra como siempre.
    await clic('[data-fk="nav-anotar"]');
    await ev(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`);
    await esperar(150);
    check('Escape sin cambios cierra', await estado(), (e) => !e.hoja && !e.dlg);
    // La confirmación de eliminar dentro de una hoja: atrás la cierra, la hoja sigue.
    await ev(`P.abrirHoja('lugar', { id: 'efectivo' }); true`);
    await esperar(150);
    const conEliminar = await ev(`!!document.querySelector('[data-a="valor"][data-campo="confirmarEliminar"][data-v="si"]')`);
    if (conEliminar) {
        await clic('[data-a="valor"][data-campo="confirmarEliminar"][data-v="si"]');
        await atras();
        check('atrás cierra «¿Eliminar…?» y deja la hoja', await ev(`({ hoja: P.ui.hoja && P.ui.hoja.tipo, confirmar: !!(P.ui.hoja && P.ui.hoja.confirmarEliminar) })`), { hoja: 'lugar', confirmar: false });
    }
    await ev('P.cerrarHoja(); true');
    await esperar(300);

    // ============================================================ D) Ayuda
    actual = 'D Ayuda';
    await enUso();
    await clic('#btn-ayuda');
    await clic('[data-fk="au-datos"]');
    check('Ayuda → Tus datos', await estado(), (e) => e.ayuda === 'datos' && e.guarda);
    await atras();
    check('atrás vuelve a Ayuda', await estado(), (e) => e.ayuda === 'inicio' && e.guarda);
    await atras();
    check('atrás cierra Ayuda', await estado(), (e) => !e.ayuda && !e.guarda);

    // ============================================================ E) entrenamiento
    actual = 'E entrenamiento';
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
    await clic('[data-fk="elegir-aprender"]');
    await esperar(300);
    check('«¿Cómo recibes tu dinero?» con guarda', await estado(), (e) => e.tour === 'elegir:0' && e.guarda);
    await clic('[data-fk="tour-version-fijo"]');
    await esperar(300);
    await clic('[data-fk="tour-empezar"]');
    await esperar(300);
    await clic('[data-fk="tour-sig"]');
    await esperar(300);
    await clic('[data-fk="tour-sig"]');
    await esperar(300);
    check('en el paso 3', await estado(), (e) => e.tour === 'paso:2');
    await atras();
    check('atrás → paso 2', await estado(), (e) => e.tour === 'paso:1');
    await atras();
    check('atrás → paso 1', await estado(), (e) => e.tour === 'paso:0');
    await atras();
    check('atrás → la presentación', await estado(), (e) => e.tour === 'intro:0');
    await atras();
    check('atrás en la presentación pregunta', await estado(), (e) => e.dlg === '¿Salir del entrenamiento?' && e.tour === 'intro:0');
    await clic('[data-fk="dlg-no"]');
    check('«Seguir aquí» sigue en el entrenamiento', await estado(), (e) => !e.dlg && e.tour === 'intro:0');
    // «Hazlo tú» con Anotar abierta: primero cierra la hoja.
    await clic('[data-fk="tour-empezar"]');
    await esperar(300);
    await ev('P.acciones.tourSig(); P.acciones.tourSig(); true');
    await esperar(400);
    await clic('[data-fk="tour-hazlo"]');
    await esperar(300);
    await clic('[data-fk="nav-anotar"]');
    await esperar(200);
    check('Hazlo tú con Anotar', await estado(), (e) => e.tour === 'hazlo:2' && e.hoja === 'anotar');
    await atras();
    check('atrás cierra Anotar y sigue en Hazlo tú', await estado(), (e) => e.tour === 'hazlo:2' && !e.hoja);
    await atras();
    check('atrás vuelve a la explicación del paso', await estado(), (e) => e.tour === 'paso:2');
    await ev('P.acciones.tourAtras(); P.acciones.tourAtras(); P.acciones.tourAtras(); true');
    await esperar(400);
    await atras();
    await clic('[data-fk="dlg-si"]');
    await esperar(300);
    check('«Salir» sale del entrenamiento', await estado(), (e) => !e.tour && !e.dlg);
    check('y queda el avance para seguir', await ev(`(() => { const p = P.tour.progreso(); return !!p.caps['fijo:esencial']; })()`), true);

    // ============================================================ F) prueba guiada
    actual = 'F prueba guiada';
    await abrirApp('?set=A');
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp('?set=A');
    // Con ?set=A, un teléfono nuevo abre directo la bienvenida de la prueba.
    if (!(await ev(`!!document.querySelector('[data-fk="ay-empezar-prueba"]')`))) {
        await clic('#btn-ayuda');
        await clic('[data-fk="ay-prueba"]');
    }
    await esperar(300);
    if (await ev(`!!document.querySelector('[data-fk="ay-empezar-prueba"]')`)) await clic('[data-fk="ay-empezar-prueba"]');
    await esperar(300);
    if (await ev(`!!document.querySelector('[data-fk="ay-inst-saltar"]')`)) await clic('[data-fk="ay-inst-saltar"]');
    await esperar(300);
    if (await ev(`!!document.querySelector('[data-fk="ay-comenzar"]')`)) await clic('[data-fk="ay-comenzar"]');
    await esperar(300);
    const conBarra = await ev(`document.documentElement.classList.contains('con-tarea')`);
    check('tarea en curso con su barra', conBarra, true);
    if (conBarra) {
        await ev(`if (P.ui.hoja) P.cerrarHoja(); true`);
        await esperar(300);
        check('con la tarea en curso: hay guarda', await estado(), (e) => e.guarda && !e.ayuda);
        await atras();
        check('atrás pregunta «¿Pausar la prueba?»', await estado(), (e) => e.dlg === '¿Pausar la prueba?');
        await clic('[data-fk="dlg-si"]');
        await esperar(300);
        check('«Pausar» la pausa', await ev(`JSON.parse(localStorage.getItem('pamplanea-proto-v2:notas')).prueba.estado`), 'libre');
        check('sin barra ni guarda', await ev(`({ barra: document.documentElement.classList.contains('con-tarea'), guarda: !!(history.state && history.state.pamplanea) })`), { barra: false, guarda: false });
    }

    // ============================================================ G) Primer día
    actual = 'G Primer día';
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await abrirApp();
    await clic('[data-fk="elegir-usar"]');
    await esperar(300);
    // La presentación de «Usarla con mis datos» va antes del Primer día.
    if (await ev('P.ayuda.abierto')) await ev('P.acciones.modoIntroOk(); true');
    await esperar(200);
    const ob = await ev('P.ui.ob ? P.ui.ob.paso : null');
    if (ob !== null) {
        await ev(`P.ui.ob.paso = 2; P.render({ nueva: true }); true`);
        await esperar(250);
        check('Primer día paso 3 con guarda', await estado(), (e) => e.guarda);
        await atras();
        check('atrás → paso anterior', await ev('P.ui.ob.paso'), 1);
    } else fallos.push(`${actual}: no encontré el Primer día`);

    // ============================================================ H) recargar
    actual = 'H recargar';
    await enUso();
    await clic('[data-fk="nav-pagos"]');
    await ev('setTimeout(() => location.reload(), 0); true');
    await esperar(700);
    const tras = await estado();
    check('tras recargar: si queda en Pagos, con guarda; si en Hoy, sin guarda', tras, (e) => (e.tab === 'hoy' ? !e.guarda : e.guarda));
    if (tras.tab !== 'hoy') {
        await atras();
        check('y atrás vuelve a Hoy', await estado(), (e) => e.tab === 'hoy' && !e.guarda);
    }
    await abrirApp();
    await esperar(300);
    check('recargar en Hoy no deja guarda', await estado(), (e) => e.tab === 'hoy' && !e.guarda);

    // ============================================================ I) guía de escritorio (marco)
    actual = 'I guía';
    await b.tamano(1280, 900);
    await b.ir('about:blank');
    await b.ir(base + 'index.html?guia=1');
    await esperar(900);
    const largo0 = await ev('history.length');
    // El teléfono de la guía es otro origen con file://: se toca su barra desde un mundo aislado (solo el DOM).
    const arbol = await b.enviar('Page.getFrameTree');
    const marco = arbol.frameTree.childFrames && arbol.frameTree.childFrames[0];
    if (!marco) throw new Error('la guía no tiene el teléfono');
    const mundo = await b.enviar('Page.createIsolatedWorld', { frameId: marco.frame.id, worldName: 'prueba-atras' });
    const r = await b.enviar('Runtime.evaluate', { contextId: mundo.executionContextId, expression: `(() => { const el = document.querySelector('[data-fk="nav-pagos"]'); if (!el) return false; el.click(); return true; })()`, returnByValue: true });
    check('tocó «Pagos» en el teléfono de la guía', r.result.value, true);
    await esperar(400);
    check('en la guía no se agregan entradas al historial', await ev('history.length'), largo0);
    await b.tamano(390, 844);
} catch (e) {
    fallos.push(`${actual}: ${e.message}`);
}

console.log(JSON.stringify({ fallos, errores: b.errores }, null, 1));
await b.cerrar();
process.exit(fallos.length || b.errores.length ? 1 : 0);
