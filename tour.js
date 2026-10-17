// Producto v2.2 · prototipo. MODO ENTRENAMIENTO: «Te enseño la app en 3 minutos», un recorrido paso a
// paso sobre los datos de ejemplo de Ana que resalta cada zona con una explicación corta (Siguiente,
// Atrás, Saltar; teclado, lector de pantalla y «reducir movimiento»), y «Practicar con ejemplos»: los
// 13 casos como ejercicios opcionales, con «¡Lo lograste!» y «Ver cómo se hace». Sin cronómetro.
'use strict';
(() => {
    const P = window.P;
    const { esc, icon } = P;
    const CASOS = window.CASOS;
    const $ = (s) => document.querySelector(s);

    // ------------------------------------------------------------------ el recorrido
    const cerrarHoja = () => P.ui.hoja && P.cerrarHoja({ sinFoco: true });
    const irA = (tab) => () => {
        cerrarHoja();
        if (P.ui.tab !== tab || P.ui.stack.length) P.irTab(tab);
    };
    const PASOS = [
        { antes: irA('hoy'), titulo: 'Te enseño la app en 3 minutos', texto: 'Usamos los datos de Ana, que son de ejemplo. Nada de lo que veas aquí toca tus datos. Puedes saltarlo cuando quieras.' },
        { antes: irA('hoy'), sel: '.portada', titulo: 'Tu número: lo que te queda libre', texto: 'Es lo que puedes gastar hasta tu próximo ingreso, ya sin tus pagos ni lo que apartaste. Abajo te dice cuánto te toca por día.' },
        { antes: () => { irA('hoy')(); P.abrirHoja('desglose'); }, sel: '.hoja', titulo: '¿De dónde sale?', texto: 'Si tocas el número, ves la cuenta completa: lo que tienes, menos lo apartado, menos lo que vence antes de tu ingreso.' },
        { antes: irA('hoy'), sel: 'section[aria-labelledby="h-pagos"]', titulo: 'Lo que viene', texto: 'Tus próximos pagos. Cuando pagues uno, tocas «Pagado» y listo: tu número ya lo tenía contado.' },
        { antes: irA('pagos'), sel: '.linea', titulo: 'Pagos: tu calendario', texto: 'Qué pagas y cuándo te pagan, en una línea de tiempo. Con «+ Pago» agregas la luz, el colegio o una cuota.' },
        { antes: irA('hoy'), sel: '.nav-mas', titulo: '(+) Anotar', texto: 'Para anotar un gasto o un ingreso. Anotar todo es opcional: hay quien solo marca sus pagos.' },
        {
            antes: () => {
                irA('hoy')();
                P.acciones.anotar();
                const q = document.getElementById('anotar-q');
                if (q) {
                    q.value = 'pupusas 6';
                    q.dispatchEvent(new Event('input', { bubbles: true }));
                    q.blur();
                }
            },
            sel: '.hoja',
            titulo: 'Escribe como hablas',
            texto: 'Por ejemplo «pupusas 6», o díctalo con el micrófono de tu teclado. Te muestra lo que entendió; si algo no es, lo tocas y lo cambias.',
        },
        { antes: irA('midinero'), sel: '.total', titulo: 'Mi dinero', texto: 'Cuánto tienes y dónde: efectivo, banco… «Cuadrar» es decirle cuánto tienes de verdad cuando no te cuadra.' },
        { antes: irA('midinero'), sel: 'section[aria-labelledby="md-ap"]', titulo: 'Apartados', texto: 'Ponle nombre a una parte de tu dinero: emergencias, un viaje. No lo mueve de lugar; solo lo separa de tu libre.' },
        { antes: irA('midinero'), sel: 'section[aria-labelledby="md-deudas"]', titulo: 'Tarjetas y deudas', texto: 'Tus tarjetas de crédito y cuotas. Su pago aparece solo en Pagos, y el cupo nunca suma a tu libre.' },
        { antes: irA('mes'), sel: '.resumen', titulo: 'Mes', texto: 'En qué se te fue el dinero: lo que entró, lo que salió y por categoría. Aquí también corriges lo que anotaste.' },
        { antes: irA('hoy'), sel: '.avatar', titulo: 'Tu letra', texto: 'Aquí cambias entre aprender y usar tus datos, guardas una copia y le cuentas a Victor cómo te va.' },
        { antes: irA('hoy'), fin: true, titulo: '¡Listo! Ya conoces lo principal', texto: '¿Qué quieres hacer ahora?' },
    ];
    const T = (P.tour = { activo: false, i: 0 });
    function bloquear(si) {
        for (const id of ['vista', 'nav', 'capa-hoja', 'aviso-proto', 'tarea-bar', 'capa-toast']) {
            const el = document.getElementById(id);
            if (el) el.inert = si || (['vista', 'nav'].includes(id) && !!P.ui.hoja);
        }
        document.getElementById('app').classList.toggle('con-tour', si);
    }
    function pintar() {
        const capa = $('#capa-tour');
        if (!T.activo) {
            capa.innerHTML = '';
            return;
        }
        const paso = PASOS[T.i];
        const app = document.getElementById('app').getBoundingClientRect();
        const el = paso.sel ? document.querySelector(paso.sel) : null;
        let foco = '';
        let lado = 'centro';
        let top = 0;
        if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const r = el.getBoundingClientRect();
            const m = 6;
            const caja = { top: Math.max(0, r.top - app.top - m), left: Math.max(4, r.left - app.left - m), width: Math.min(app.width - 8, r.width + m * 2), height: Math.min(app.height, r.height + m * 2) };
            foco = `<div class="tour-foco" style="top:${caja.top}px;left:${caja.left}px;width:${caja.width}px;height:${caja.height}px" aria-hidden="true"></div>`;
            // La tarjeta va donde haya más espacio: arriba o abajo de lo resaltado.
            const abajo = app.height - (caja.top + caja.height);
            lado = abajo >= caja.top ? 'abajo' : 'arriba';
            top = lado === 'abajo' ? caja.top + caja.height + 10 : caja.top - 10;
            // Si lo resaltado ocupa casi toda la pantalla (una hoja abierta), la tarjeta va abajo, encima.
            if (Math.max(abajo, caja.top) < 200) lado = 'pie';
        }
        const n = PASOS.length;
        const acciones = paso.fin
            ? `<div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="tourPracticar" data-fk="tour-practicar">${icon('list-checks', 'ico-s')}Practicar con ejemplos</button><button type="button" class="btn btn--48 btn--full" data-a="tourUsar" data-fk="tour-usar">${icon('smartphone', 'ico-s')}Empezar con mis datos</button></div><button type="button" class="link" data-a="tourCerrar" data-v="hecho" data-fk="tour-mirar">Seguir mirando los ejemplos</button>`
            : `<div class="tour-acc"><button type="button" class="link" data-a="tourCerrar" data-v="saltado" data-fk="tour-saltar">Saltar</button><span class="tour-n" aria-hidden="true">${T.i + 1} de ${n}</span><div class="tour-btns"><button type="button" class="btn" data-a="tourMover" data-v="-1" data-fk="tour-atras" ${T.i === 0 ? 'disabled' : ''}>Atrás</button><button type="button" class="btn btn--prim" data-a="tourMover" data-v="1" data-fk="tour-sig">Siguiente</button></div></div>`;
        capa.innerHTML = `${el ? foco : '<div class="tour-velo" aria-hidden="true"></div>'}<section class="tour-card tour-card--${lado}" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x" style="${lado === 'abajo' ? `top:${top}px` : lado === 'arriba' ? `bottom:${app.height - top}px` : ''}"><p class="paso"><span class="sr-only">Paso ${T.i + 1} de ${n}. </span>Recorrido · ${T.i + 1} de ${n}</p><h2 class="tour-t" id="tour-t" tabindex="-1">${esc(paso.titulo)}</h2><p class="txt" id="tour-x">${esc(paso.texto)}</p>${acciones}</section>`;
        // Si la tarjeta no cabe completa arriba o abajo, va al pie de la pantalla (nunca cortada).
        const card = capa.querySelector('.tour-card');
        const r = card.getBoundingClientRect();
        if ((lado === 'arriba' || lado === 'abajo') && (r.top < app.top + 8 || r.bottom > app.top + app.height - 8)) {
            card.classList.replace('tour-card--' + lado, 'tour-card--pie');
            card.style.top = '';
            card.style.bottom = '';
        }
        capa.querySelector('#tour-t').focus({ preventScroll: true });
    }
    function ir(i) {
        T.i = Math.max(0, Math.min(PASOS.length - 1, i));
        const paso = PASOS[T.i];
        if (paso.antes) paso.antes();
        bloquear(true);
        // Esperar a que la pantalla se dibuje para medir lo que se resalta.
        requestAnimationFrame(() => requestAnimationFrame(pintar));
        P.emitir('tour:paso' + (T.i + 1));
    }
    T.empezar = function () {
        if (P.ayuda) P.ayuda.cerrar({ foco: false });
        P.practica.salir();
        T.activo = true;
        ir(0);
        P.emitir('tour:empezar');
    };
    function terminar(como) {
        T.activo = false;
        cerrarHoja();
        bloquear(false);
        pintar();
        if (P.modos) P.modos.guardarEntrenamiento({ tour: como });
        P.irTab('hoy');
        P.emitir('tour:' + como);
    }
    const acc = P.acciones;
    acc.tourMover = (d) => ir(T.i + Number(d.v));
    acc.tourCerrar = (d) => terminar(d.v);
    acc.tourPracticar = () => {
        terminar('hecho');
        P.ayuda.abrir('practica');
    };
    acc.tourUsar = () => {
        terminar('hecho');
        P.modos.cambiar('uso');
    };
    document.addEventListener(
        'keydown',
        (e) => {
            if (!T.activo) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                terminar('saltado');
                return;
            }
            if (e.key === 'ArrowRight' && !PASOS[T.i].fin) ir(T.i + 1);
            if (e.key === 'ArrowLeft' && T.i > 0) ir(T.i - 1);
            if (e.key !== 'Tab') return;
            const lista = [...document.querySelectorAll('.tour-card button:not([disabled])')];
            if (!lista.length) return;
            const [a, z] = [lista[0], lista.at(-1)];
            if (!lista.includes(document.activeElement) || (!e.shiftKey && document.activeElement === z)) {
                e.preventDefault();
                (e.shiftKey ? z : a).focus();
            } else if (e.shiftKey && document.activeElement === a) {
                e.preventDefault();
                z.focus();
            }
        },
        true,
    );
    window.addEventListener('resize', () => T.activo && pintar());

    // ------------------------------------------------------------------ practicar con ejemplos
    const finDe = (caso) => {
        const ultimo = caso.pasos.filter((p) => p.clave).at(-1);
        return ultimo ? [].concat(ultimo.clave) : [];
    };
    const PR = (P.practica = { caso: null, logrado: false });
    PR.activa = () => !!PR.caso && P.modo !== 'uso';
    PR.salir = () => {
        PR.caso = null;
        PR.logrado = false;
        P.ayuda && P.ayuda.pintarBarra();
    };
    PR.empezar = (id) => {
        PR.caso = CASOS.find((c) => c.id === id);
        PR.logrado = false;
        if (P.ayuda) {
            P.ayuda.salirDePrueba();
            P.ayuda.cerrar({ foco: false });
        }
        P.cargarCaso(id);
        P.ayuda.pintarBarra();
        P.emitir('practica:empezar:' + id);
    };
    PR.pintar = (barra) => {
        const c = PR.caso;
        document.documentElement.classList.add('con-tarea');
        barra.hidden = false;
        barra.innerHTML = PR.logrado
            ? `<div class="tarea-txt tarea-txt--ok">${icon('circle-check', 'ico-s')}<span class="tarea-t"><strong>¡Lo lograste!</strong> ${esc(c.titulo)}</span></div><div class="tarea-acc"><button type="button" class="tarea-btn tarea-btn--prim" data-a="prSiguiente" data-fk="pr-siguiente">Otro</button></div>`
            : `<button type="button" class="tarea-txt" data-a="ayIr" data-v="comoSeHace" data-fk="pr-ver" aria-label="Ejercicio: ${esc(c.tarea)}. Ver cómo se hace"><span class="tarea-n">Ejercicio · ${esc(c.titulo)}</span><span class="tarea-t">${esc(c.tarea)}</span></button><div class="tarea-acc"><button type="button" class="tarea-btn" data-a="ayIr" data-v="comoSeHace" data-fk="pr-como">¿Cómo?</button><button type="button" class="tarea-btn" data-a="prSalir" data-fk="pr-salir">Salir</button></div>`;
    };
    window.addEventListener('proto', (e) => {
        if (!PR.activa() || PR.logrado) return;
        if (finDe(PR.caso).includes(String(e.detail.clave))) {
            PR.logrado = true;
            const ent = P.modos.entrenamiento();
            P.modos.guardarEntrenamiento({ practicas: { ...(ent.practicas || {}), [PR.caso.id]: true } });
            P.ayuda.pintarBarra();
            P.emitir('practica:lograda:' + PR.caso.id);
        }
    });
    acc.prSalir = () => {
        PR.salir();
        P.ayuda.abrir('practica');
    };
    acc.prSiguiente = () => {
        PR.salir();
        P.ayuda.abrir('practica');
    };
    acc.prEmpezar = (d) => PR.empezar(d.v);
    function vistaPractica() {
        const hechas = (P.modos ? P.modos.entrenamiento().practicas : {}) || {};
        return `<p class="txt">Ejercicios cortos con datos de ejemplo. Hazlos en el orden que quieras; si te trabas, toca «¿Cómo?».</p>
            <ul class="ay-casos">${CASOS.map((c) => `<li><button type="button" class="ay-caso ay-caso--ej" data-a="prEmpezar" data-v="${c.id}" data-fk="pr-${c.id}"><span class="ay-caso-t">${esc(c.titulo)}<span class="fila-s">${esc(c.tarea)}</span></span>${hechas[c.id] ? `<span class="ay-caso-ok">${icon('circle-check', 'ico-s')}<span class="sr-only">hecho</span></span>` : ''}</button></li>`).join('')}</ul>
            <button type="button" class="btn btn--48 btn--full" data-a="modoCambiar" data-v="uso" data-fk="pr-usar">${icon('smartphone', 'ico-s')}Empezar con mis datos</button>`;
    }
    function vistaComoSeHace() {
        const c = PR.caso;
        if (!c) return vistaPractica();
        const sims = c.sims || [];
        return `<p class="campo-l">${esc(c.tarea)}</p>
            <ol class="ay-como">${c.pasos.map((p) => `<li>${esc(p.t)}</li>`).join('')}</ol>
            ${sims.length ? `<div class="ay-sims"><p class="campo-l">Para este ejercicio puedes adelantar el tiempo:</p>${sims.map((s) => `<button type="button" class="btn btn--48 btn--full ay-sim" data-a="aySimular" data-v="${s.id}" data-fk="pr-sim-${s.id}">${icon('fast-forward', 'ico-s')}${esc(s.t.replace('Simular: ', 'Adelantar: '))}</button>`).join('')}</div>` : ''}
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayCerrar" data-fk="pr-volver">Volver al ejercicio</button>`;
    }
    PR.iniciar = () => {
        P.ayuda.registrar('practica', 'Practicar con ejemplos', vistaPractica);
        P.ayuda.registrar('comoSeHace', 'Cómo se hace', vistaComoSeHace);
    };
})();
