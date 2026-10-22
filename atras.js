// v2.6.1 (V2-72): «se puede activar que sirva con los botones nativos del telefono? es decir los gestos o no se como
// se llaman, boton atras nativo del telefono». El botón «atrás» del teléfono y el gesto de volver usan el historial
// del navegador (pushState/popstate), sin dependencias. Mientras haya algo a qué volver, el historial tiene UNA
// entrada de guarda: al tocar atrás, la app retrocede un paso (cierra el diálogo, la hoja, el menú o Ayuda; vuelve a
// la pantalla o a la pestaña anterior) y, si todavía queda algo, pone la guarda otra vez. En Hoy sin nada abierto no
// hay guarda: atrás hace lo de siempre en el teléfono (no atrapa a la persona). Antes de perder lo escrito en una
// hoja, pregunta; en el entrenamiento retrocede un paso y, en el primero, pregunta antes de salir; en la prueba guiada
// y en «Practicar», pregunta antes de pausar. Escape y el foco siguen igual; al recargar, el historial queda limpio.
'use strict';
(() => {
    const P = window.P;
    const { esc } = P;
    const MARCA = 'pamplanea';
    const raiz = document.documentElement;
    // En la guía de escritorio la app vive dentro de un marco: el historial es el de la página de afuera.
    const activo = !!(window.history && history.pushState) && !P.enGuia;

    // ------------------------------------------------------------------ diálogo de confirmación (un solo patrón)
    const D = (P.dlg = { abierto: null });
    function pintarDlg() {
        const capa = document.getElementById('capa-dlg');
        if (!capa) return;
        const d = D.abierto;
        if (!d) {
            capa.innerHTML = '';
            return;
        }
        capa.innerHTML = `<div class="dlg-fondo" data-dlg="no"></div><section class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-x">
            <h2 class="dlg-t" id="dlg-t">${esc(d.titulo)}</h2><p class="txt" id="dlg-x">${esc(d.texto)}</p>
            <div class="dlg-acc"><button type="button" class="btn btn--48" data-dlg="no" data-fk="dlg-no">${esc(d.no)}</button><button type="button" class="btn btn--48 ${d.peligro ? 'btn--peligro' : 'btn--prim'}" data-dlg="si" data-fk="dlg-si">${esc(d.si)}</button></div></section>`;
        capa.querySelector('[data-fk="dlg-no"]').focus({ preventScroll: true });
    }
    /** «¿Descartar los cambios?», «¿Salir del entrenamiento?»…: el botón seguro tiene el foco y es el de la izquierda. */
    P.confirmarDlg = function ({ titulo, texto, si, no = 'Cancelar', peligro = false, alSi = null }) {
        const previo = document.activeElement;
        D.abierto = { titulo, texto, si, no, peligro, alSi, previo };
        pintarDlg();
        P.emitir('dialogo:' + titulo);
        asegurarLuego();
    };
    function cerrarDlg(si) {
        const d = D.abierto;
        if (!d) return;
        D.abierto = null;
        pintarDlg();
        if (si && d.alSi) d.alSi();
        else if (d.previo && d.previo.isConnected) d.previo.focus({ preventScroll: true });
        P.emitir('dialogo:' + (si ? 'si' : 'no'));
        asegurarLuego();
    }
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('[data-dlg]');
        if (!b || !D.abierto) return;
        e.preventDefault();
        e.stopPropagation();
        cerrarDlg(b.dataset.dlg === 'si');
    });

    // ------------------------------------------------------------------ ¿hay cambios sin guardar en la hoja?
    // La hoja se compara con cómo estaba al abrirse (sin lo que es solo de la pantalla: errores, avisos abiertos…).
    const DE_PANTALLA = new Set(['intento', 'errores', 'disparador', 'editando', 'confirmarEliminar', 'paso', 'abierto', 'verMas', 'ayuda', 'pista']);
    const firma = (h) => {
        try {
            return JSON.stringify(h, (k, v) => (DE_PANTALLA.has(k) || k.startsWith('_') ? undefined : v));
        } catch {
            return null;
        }
    };
    const abrirHoja = P.abrirHoja;
    P.abrirHoja = function (...args) {
        abrirHoja.apply(this, args);
        if (P.ui.hoja) P.ui.hoja._firma = firma(P.ui.hoja);
        asegurarLuego();
    };
    P.hojaConCambios = () => {
        const h = P.ui.hoja;
        return !!h && !!h._firma && firma(h) !== h._firma;
    };
    /** Cerrar la hoja sin guardar: si hay algo escrito, primero pregunta. */
    function cerrarHojaPreguntando() {
        if (!P.hojaConCambios()) return P.cerrarHoja();
        P.confirmarDlg({ titulo: '¿Descartar los cambios?', texto: 'Lo que escribiste en esta hoja no se guarda.', no: 'Seguir editando', si: 'Descartar', peligro: true, alSi: () => P.cerrarHoja() });
    }
    // Tocar fuera de la hoja con cambios sin guardar también pregunta. Escape, «Cancelar» y la X cierran sin preguntar,
    // como siempre (Escape en la computadora no cambia: V2-50).
    document.addEventListener(
        'click',
        (e) => {
            if (!e.target.classList || !e.target.classList.contains('mask') || !P.hojaConCambios()) return;
            e.stopPropagation();
            cerrarHojaPreguntando();
        },
        true,
    );
    // Con el diálogo abierto, Escape lo cierra y Tab no sale de él. En `window` y en captura: antes que el entrenamiento
    // y Ayuda, que también escuchan Escape y Tab.
    window.addEventListener(
        'keydown',
        (e) => {
            if (!D.abierto || (e.key !== 'Escape' && e.key !== 'Tab')) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') return cerrarDlg(false);
            const bs = [...document.querySelectorAll('#capa-dlg button')];
            const i = bs.indexOf(document.activeElement);
            if (bs.length) bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
        },
        true,
    );

    // ------------------------------------------------------------------ un paso atrás dentro de la app
    const conTarea = () => raiz.classList.contains('con-tarea');
    const enPrimerDia = () => !!(P.enPrimerDia && P.enPrimerDia());
    /** Hoy, sin nada abierto y sin entrenamiento, prueba ni ejercicio: atrás es del teléfono. */
    // v2.7 (Parte D): el cuadrito de novedades va encima de todo; atrás lo cierra (como «¡Entendido!»).
    const conNovedades = () => !!document.getElementById('capa-novedades');
    function enRaiz() {
        if (!P.ui || !P.st) return true;
        if (conNovedades()) return false;
        if (D.abierto || (P.tour && P.tour.activo) || (P.ayuda && P.ayuda.abierto) || P.ui.hoja || P.ui.banner) return false;
        // Con una tarea de la prueba (o un ejercicio) en curso, atrás primero pregunta.
        if (conTarea()) return false;
        if (enPrimerDia()) return !(P.ui.ob.paso > 0);
        return !P.ui.stack.length && P.ui.tab === 'hoy';
    }
    // Ayuda: sus páginas de navegación vuelven a la anterior; las de la prueba se cierran como con la X.
    const NAV_AYUDA = new Set(['inicio', 'ayudaUso', 'contar', 'datos', 'aprendeMas', 'practica', 'moderador']);
    const pilaAyuda = [];
    let panelAyuda = null;
    let volviendo = false;
    window.addEventListener('proto', (e) => {
        const c = String(e.detail && e.detail.clave);
        if (!c.startsWith('ayuda:')) return;
        const panel = c.slice(6);
        if (!volviendo && panelAyuda && panelAyuda !== panel && NAV_AYUDA.has(panelAyuda)) pilaAyuda.push(panelAyuda);
        panelAyuda = panel;
    });
    function atrasAyuda() {
        const A = P.ayuda;
        if (A.panel === 'respuesta' || A.panel === 'comprension') return pausarPrueba('Seguir respondiendo');
        const previo = pilaAyuda.pop();
        if (previo) {
            volviendo = true;
            A.abrir(previo);
            volviendo = false;
            return true;
        }
        P.acciones.ayCerrar();
        return true;
    }
    function pausarPrueba(no = 'Seguir en la prueba') {
        P.confirmarDlg({
            titulo: '¿Pausar la prueba?',
            texto: 'Tu avance queda guardado. Puedes seguir después desde Ayuda.',
            no,
            si: 'Pausar',
            alSi: () => {
                P.acciones.aySalirPrueba();
                P.ayuda.cerrar();
            },
        });
        return true;
    }
    function atrasTour() {
        const T = P.tour;
        if (T.fase === 'hazlo' && P.ui.hoja) {
            cerrarHojaPreguntando();
            return true;
        }
        const atras = document.querySelector('#capa-tour [data-fk="tour-atras"]');
        if (['paso', 'hazlo', 'pausa', 'pregunta'].includes(T.fase) && atras && !atras.disabled) {
            P.acciones.tourAtras();
            return true;
        }
        // V2-79: si vienes de tus datos (o ya los usas), salir te lleva a ellos.
        const aTusDatos = T.aTusDatos && T.aTusDatos();
        P.confirmarDlg({ titulo: '¿Salir del entrenamiento?', texto: aTusDatos ? 'Vuelves a tus datos. Tu avance queda guardado para seguir después.' : 'Tu avance queda guardado: puedes seguir después donde te quedaste.', no: 'Seguir aquí', si: 'Salir', alSi: () => (T.fase === 'elegir' ? P.acciones.tourCerrar() : P.acciones.tourSalir()) });
        return true;
    }
    function retroceder() {
        if (conNovedades()) {
            P.acciones.novedadesOk();
            return true;
        }
        if (D.abierto) {
            cerrarDlg(false);
            return true;
        }
        if (P.tour && P.tour.activo) return atrasTour();
        if (P.ayuda && P.ayuda.abierto) return atrasAyuda();
        if (P.ui.hoja) {
            const h = P.ui.hoja;
            if (h.confirmarEliminar) P.acciones.valor({ campo: 'confirmarEliminar', v: 'no' });
            else cerrarHojaPreguntando();
            return true;
        }
        if (P.ui.banner) {
            P.ui.banner = null;
            P.renderBanner();
            return true;
        }
        if (enPrimerDia() && P.ui.ob.paso > 0) {
            P.acciones.obAtras();
            return true;
        }
        const top = !enPrimerDia() && P.ui.stack.at(-1);
        if (top) {
            const pasoAtras = top.tipo === 'aldia' && document.querySelector('[data-fk="ad-atras"]');
            if (pasoAtras) pasoAtras.click();
            else P.atras();
            return true;
        }
        if (!enPrimerDia() && P.ui.tab !== 'hoy') {
            P.irTab('hoy');
            return true;
        }
        if (conTarea()) {
            if (P.practica && P.practica.activa()) {
                P.confirmarDlg({ titulo: '¿Salir del ejercicio?', texto: 'Puedes volver a hacerlo cuando quieras.', no: 'Seguir aquí', si: 'Salir', alSi: () => P.acciones.prSalir() });
                return true;
            }
            return pausarPrueba();
        }
        return false;
    }
    P.retroceder = retroceder;

    // ------------------------------------------------------------------ el historial: una sola guarda
    let limpiando = false;
    const conGuarda = () => !!(history.state && history.state[MARCA]);
    function asegurar() {
        if (!activo || limpiando) return;
        if (P.ayuda && !P.ayuda.abierto && panelAyuda) {
            pilaAyuda.length = 0;
            panelAyuda = null;
        }
        const enLaRaiz = enRaiz();
        if (!enLaRaiz && !conGuarda()) history.pushState({ [MARCA]: 1 }, '');
        else if (enLaRaiz && conGuarda()) {
            // Se volvió a Hoy con los botones de la app: la guarda sobra (si no, el próximo «atrás» no haría nada).
            limpiando = true;
            setTimeout(() => (limpiando = false), 1200);
            history.back();
        }
    }
    let pedido = 0;
    function asegurarLuego() {
        cancelAnimationFrame(pedido);
        pedido = requestAnimationFrame(asegurar);
    }
    P.asegurarHistorial = asegurarLuego;
    if (!activo) return;
    window.addEventListener('popstate', () => {
        if (limpiando) {
            limpiando = false;
            asegurarLuego();
            return;
        }
        retroceder();
        asegurarLuego();
    });
    window.addEventListener('proto', asegurarLuego);
    window.addEventListener('DOMContentLoaded', () => {
        const app = document.getElementById('app');
        if (app) new MutationObserver(asegurarLuego).observe(app, { childList: true, subtree: true });
        asegurarLuego();
    });
    window.addEventListener('pageshow', asegurarLuego);
})();
