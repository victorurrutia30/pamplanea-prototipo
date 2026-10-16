// Producto v2 · prototipo. Para probar en el teléfono de otras personas: pantalla completa con
// safe areas y teclado reales, aviso fijo de prototipo, «Casos y ayuda» (casos, notas por persona,
// texto para mandar por WhatsApp, tema, reiniciar) y la «Prueba guiada»: una tarea a la vez, en
// lenguaje sencillo y sin decir dónde tocar. Todo se guarda en este navegador (o en memoria).
'use strict';
(() => {
    const P = window.P;
    const { esc, icon } = P;
    const CASOS = window.CASOS;
    const VERSION = window.VERSION_PROTOTIPO;
    const CLAVE = 'pamplanea-proto-v2:notas';
    const root = document.documentElement;
    const vacio = () => ({ nombre: '', notas: {}, guiada: { activa: false, i: 0, resp: {}, terminada: false } });
    const datos = () => {
        const d = P.almacen.leer(CLAVE, null) || vacio();
        d.notas = d.notas || {};
        d.guiada = d.guiada || vacio().guiada;
        d.guiada.resp = d.guiada.resp || {};
        return d;
    };
    const guardar = (d) => P.almacen.escribir(CLAVE, d);
    const $ = (s) => document.querySelector(s);

    const A = (P.ayuda = { abierto: false, panel: null, listo: false, confirmarBorrar: false, texto: '', disparador: null });

    // ------------------------------------------------------------------ pantalla completa, safe areas y teclado
    function prepararModo() {
        root.classList.add(P.enGuia ? 'modo-marco' : 'modo-real');
        if (P.enGuia) return;
        const vv = window.visualViewport;
        const ajustar = () => {
            const alto = vv ? vv.height : window.innerHeight;
            root.style.setProperty('--vv-h', Math.round(alto) + 'px');
            root.style.setProperty('--vv-top', Math.round(vv ? vv.offsetTop : 0) + 'px');
            // Con el teclado abierto la barra de inicio queda tapada: sin margen inferior extra.
            root.classList.toggle('teclado', window.innerHeight - alto > 120);
        };
        ajustar();
        if (vv) {
            vv.addEventListener('resize', ajustar);
            vv.addEventListener('scroll', ajustar);
        }
        window.addEventListener('resize', ajustar);
        // Que el campo enfocado (Anotar, montos) no quede debajo del teclado.
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (!el.matches || !el.matches('input, textarea')) return;
            root.classList.add('escribiendo');
            setTimeout(() => {
                ajustar();
                el.scrollIntoView({ block: 'nearest' });
            }, 320);
        });
        document.addEventListener('focusout', (e) => {
            if (e.target.matches && e.target.matches('input, textarea')) setTimeout(() => !document.activeElement?.matches?.('input, textarea') && root.classList.remove('escribiendo'), 50);
        });
    }

    // ------------------------------------------------------------------ prueba guiada
    const fin = (caso) => {
        const conClave = caso.pasos.filter((p) => p.clave);
        const ultimo = conClave.at(-1);
        return ultimo ? [].concat(ultimo.clave) : [];
    };
    const tareaActual = (d = datos()) => CASOS[d.guiada.i] || null;
    let detectado = false;
    function empezarTarea(i) {
        const d = datos();
        d.guiada.activa = true;
        d.guiada.terminada = false;
        d.guiada.i = Math.max(0, Math.min(CASOS.length - 1, i));
        guardar(d);
        detectado = false;
        P.cargarCaso(CASOS[d.guiada.i].id);
        pintarBarra();
    }
    function pintarBarra() {
        const barra = $('#tarea-bar');
        if (!barra) return;
        const d = datos();
        const caso = d.guiada.activa ? tareaActual(d) : null;
        root.classList.toggle('con-tarea', !!caso && !P.enGuia);
        if (!caso || P.enGuia) {
            barra.hidden = true;
            barra.innerHTML = '';
            return;
        }
        barra.hidden = false;
        barra.innerHTML = detectado
            ? `<button type="button" class="tarea-b tarea-b--ok" data-a="ayTarea" data-v="respuesta" data-fk="tarea-bar">${icon('circle-check', 'ico-s')}<span class="tarea-t"><strong>¡Listo!</strong> Cuéntanos cómo te fue</span><span class="tarea-ver">Responder</span></button>`
            : `<button type="button" class="tarea-b" data-a="ayTarea" data-v="instruccion" data-fk="tarea-bar"><span class="tarea-n">Tarea ${d.guiada.i + 1} de ${CASOS.length}</span><span class="tarea-t">${esc(caso.tarea)}</span><span class="tarea-ver">Ver</span></button>`;
    }
    window.addEventListener('proto', (e) => {
        const d = datos();
        if (!d.guiada.activa || detectado) return;
        const caso = tareaActual(d);
        if (caso && fin(caso).includes(e.detail.clave)) {
            detectado = true;
            pintarBarra();
        }
    });

    // ------------------------------------------------------------------ texto para mandar
    function armarTexto() {
        const d = datos();
        const ahora = new Date();
        let fecha;
        try {
            fecha = ahora.toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            fecha = ahora.toISOString().slice(0, 16).replace('T', ' ');
        }
        const lineas = [`PamPlanea · ${VERSION}`, `Nombre: ${d.nombre.trim() || '(sin nombre)'}`, `Fecha: ${fecha}`, ''];
        let algo = false;
        for (const c of CASOS) {
            const r = d.guiada.resp[c.id];
            const n = (d.notas[c.id] || '').trim();
            if (!r && !n) continue;
            algo = true;
            lineas.push(`${c.id} · ${c.titulo}`);
            if (r && r.saltada) lineas.push('Prueba guiada: la saltó');
            if (r && r.facil) lineas.push(`Qué tan fácil: ${r.facil} de 5`);
            if (r && r.confuso && r.confuso.trim()) lineas.push(`Me confundió: ${r.confuso.trim()}`);
            if (n) lineas.push(`Notas: ${n}`);
            lineas.push('');
        }
        const g = (d.notas.general || '').trim();
        if (g) {
            algo = true;
            lineas.push(`Notas generales: ${g}`, '');
        }
        if (!algo) lineas.push('(Todavía no hay notas ni respuestas)');
        return lineas.join('\n').trim();
    }

    // ------------------------------------------------------------------ panel «Casos y ayuda»
    const notaDe = () => (P.caso ? P.caso.id : 'general');
    function vistaInicio() {
        const d = datos();
        const caso = P.caso;
        const g = d.guiada;
        const enGuiada = g.activa;
        const actual = enGuiada ? tareaActual(d) : null;
        const resp = caso ? g.resp[caso.id] : null;
        const sims = (caso && caso.sims) || [];
        const guiada = enGuiada
            ? `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t"><h3 class="ay-h3" id="ay-g-t">${icon('list-checks', 'ico-s')}Prueba guiada · tarea ${g.i + 1} de ${CASOS.length}</h3>
                <p class="ay-tarea">${esc(actual.tarea)}</p>
                <div class="ay-acc"><button type="button" class="btn btn--prim btn--48" data-a="ayTarea" data-v="instruccion" data-fk="ay-g-ver">Ver la tarea</button><button type="button" class="btn btn--48" data-a="ayTarea" data-v="respuesta" data-fk="ay-g-ya">Ya terminé</button></div>
                <button type="button" class="link" data-a="ayGuiada" data-v="salir" data-fk="ay-g-salir">Salir de la prueba guiada</button></section>`
            : `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t"><h3 class="ay-h3" id="ay-g-t">${icon('list-checks', 'ico-s')}Prueba guiada</h3>
                <p class="txt">Te damos ${CASOS.length} tareas cortas, una a la vez. No hay respuestas malas: si algo te confunde, eso es justo lo que buscamos.</p>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayGuiada" data-v="${g.terminada || Object.keys(g.resp).length ? 'seguir' : 'empezar'}" data-fk="ay-g-empezar">${Object.keys(g.resp).length && !g.terminada ? `Seguir con la tarea ${g.i + 1}` : 'Empezar la prueba guiada'}</button></section>`;
        const pasos = caso && !enGuiada
            ? `<details class="ay-pasos"><summary>Pasos de este caso</summary><ol>${caso.pasos.map((p) => `<li>${esc(p.t)}</li>`).join('')}</ol><p class="fila-s"><strong>Resultado esperado:</strong> ${esc(caso.esperado)}</p></details>`
            : '';
        const actualHtml = `<section class="ay-card" aria-labelledby="ay-c-t"><h3 class="ay-h3" id="ay-c-t">${caso ? `${esc(caso.id)} · ${esc(caso.titulo)}` : `Explorando con ${esc(P.st.nombre || 'Ana')}`}</h3>
            <p class="txt">${caso ? esc(caso.para) : 'Sin pasos: toca lo que quieras. Todo cambia los números de verdad.'}</p>
            ${pasos}
            ${sims.length ? `<div class="ay-sims">${sims.map((s) => `<button type="button" class="btn btn--48 btn--full ay-sim" data-a="aySimular" data-v="${s.id}" data-fk="ay-sim-${s.id}">${icon('fast-forward', 'ico-s')}${esc(s.t)}</button>`).join('')}</div>` : ''}
            </section>`;
        const resumen = resp ? `<p class="ay-resp">${icon('circle-check', 'ico-xs')}Tu respuesta: ${resp.saltada ? 'la saltaste' : `fácil ${resp.facil} de 5`}${resp.confuso ? ` · «${esc(resp.confuso)}»` : ''}</p>` : '';
        const notas = `<section class="ay-card" aria-labelledby="ay-n-t"><h3 class="ay-h3" id="ay-n-t">${icon('square-pen', 'ico-s')}Mis notas</h3>
            <div class="campo-g"><label class="campo-l" for="ay-nombre">Tu nombre</label><div class="campo"><input id="ay-nombre" data-ay="nombre" type="text" autocomplete="off" autocapitalize="words" value="${esc(d.nombre)}" placeholder="Ej. Sofía"></div></div>
            <div class="campo-g"><label class="campo-l" for="ay-nota">${caso ? `Notas de ${esc(caso.id)}` : 'Notas generales'}</label>${resumen}<textarea id="ay-nota" class="ay-textarea" data-ay="nota" rows="4" placeholder="Qué entendiste, dónde dudaste, qué te gustó…">${esc(d.notas[notaDe()] || '')}</textarea></div>
            <button type="button" class="btn btn--48 btn--full" data-a="ayArmar" data-fk="ay-armar">${icon('receipt-text', 'ico-s')}Armar texto para enviar</button>
            ${A.texto ? `<div class="campo-g"><label class="campo-l" for="ay-texto">Mantén presionado el texto para copiarlo y pégalo en WhatsApp</label><textarea id="ay-texto" class="ay-textarea ay-texto" readonly rows="8">${esc(A.texto)}</textarea>
                <div class="ay-acc">${navigator.clipboard && window.isSecureContext ? `<button type="button" class="btn btn--48" data-a="ayCopiar" data-fk="ay-copiar">Copiar</button>` : ''}${navigator.share ? `<button type="button" class="btn btn--48" data-a="ayCompartir" data-fk="ay-compartir">Compartir</button>` : ''}<button type="button" class="btn btn--48" data-a="aySeleccionar" data-fk="ay-sel">Seleccionar todo</button></div><p class="fila-s" id="ay-copiado" aria-live="polite"></p></div>` : ''}
            </section>`;
        const lista = `<section class="ay-card" aria-labelledby="ay-l-t"><h3 class="ay-h3" id="ay-l-t">Elegir un caso</h3>
            <ul class="ay-casos">${CASOS.map((c) => `<li><button type="button" class="ay-caso" data-a="ayCaso" data-v="${c.id}" aria-current="${caso && caso.id === c.id ? 'true' : 'false'}" data-fk="ay-caso-${c.id}"><span class="ay-caso-cod">${c.id}</span><span class="ay-caso-t">${esc(c.titulo)}</span>${d.guiada.resp[c.id] || (d.notas[c.id] || '').trim() ? `<span class="ay-caso-ok">${icon('check', 'ico-xs')}<span class="sr-only">con notas</span></span>` : ''}</button></li>`).join('')}</ul>
            <p class="campo-l">Explorar libre</p><div class="ay-acc"><button type="button" class="btn btn--48" data-a="ayPersona" data-v="ana" data-fk="ay-ana">Ana · quincenal</button><button type="button" class="btn btn--48" data-a="ayPersona" data-v="carlos" data-fk="ay-carlos">Carlos · semanal</button></div></section>`;
        const temas = [['serena-claro', 'Serena claro'], ['serena-oscuro', 'Serena oscuro'], ['ancla-claro', 'Ancla claro'], ['ancla-oscuro', 'Ancla oscuro']];
        const apariencia = `<section class="ay-card" aria-labelledby="ay-t-t"><h3 class="ay-h3" id="ay-t-t">${icon('palette', 'ico-s')}Apariencia</h3><div class="chips" role="group" aria-labelledby="ay-t-t">${temas.map(([v, t]) => `<button type="button" class="chip" aria-pressed="${P.tema === v}" data-a="ayTema" data-v="${v}" data-fk="ay-tema-${v}">${P.tema === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('')}</div></section>`;
        const datosHtml = `<section class="ay-card" aria-labelledby="ay-d-t"><h3 class="ay-h3" id="ay-d-t">${icon('rotate-ccw', 'ico-s')}Datos</h3>
            <button type="button" class="btn btn--48 btn--full btn--reiniciar" data-a="ayReiniciar" data-fk="ay-reiniciar">${icon('rotate-ccw', 'ico-s')}Reiniciar datos</button>
            <p class="fila-s">Vuelve ${caso ? 'este caso' : 'la app'} al inicio. Tus notas no se borran.</p>
            ${A.confirmarBorrar ? `<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<div><p><strong>¿Borrar todo?</strong> Se borran tus notas, tus respuestas y lo que hiciste en la app.</p><div class="ay-acc"><button type="button" class="btn" data-a="ayBorrar" data-v="no" data-fk="ay-borrar-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="ayBorrar" data-v="si" data-fk="ay-borrar-si">Sí, borrar todo</button></div></div></div>` : `<button type="button" class="link link--peligro" data-a="ayBorrar" data-v="pregunta" data-fk="ay-borrar">${icon('trash-2', 'ico-s')}Borrar todo, también mis notas</button>`}
            ${P.almacen.disponible ? '' : '<p class="fila-s">Este navegador no deja guardar: lo que hagas se pierde al cerrar.</p>'}
            <a class="link" href="index.html?guia=1">${icon('eye', 'ico-s')}Ver la guía completa (para computadora)</a></section>`;
        const bienvenida = A.bienvenida
            ? `<div class="ay-bienvenida"><p class="ay-bien-t">¡Hola! Gracias por probar PamPlanea.</p><p class="txt">Es una maqueta para ver si se entiende. <strong>Todo es inventado: no pongas tus datos reales.</strong> Lo que hagas se guarda solo en este teléfono.</p></div>`
            : '';
        return `${bienvenida}${guiada}${actualHtml}${notas}${lista}${apariencia}${datosHtml}<p class="ay-version">${esc(VERSION)} · Datos inventados: no pongas tus datos reales · Sin rastreadores</p>`;
    }
    function vistaTarea(paso) {
        const d = datos();
        const caso = tareaActual(d);
        if (!caso) return vistaInicio();
        if (paso === 'gracias') {
            return `<div class="ay-gracias"><p class="ay-bien-t">¡Gracias! Terminaste la prueba.</p><p class="txt">Arma el texto con tus respuestas y mándalo a quien te pidió probar la app.</p></div>${vistaInicio()}`;
        }
        if (paso === 'respuesta') {
            const r = A.borrador || {};
            const op = (n, t) => `<button type="button" class="ay-nota-n" role="radio" aria-checked="${r.facil === n}" data-a="ayFacil" data-v="${n}" data-fk="ay-facil-${n}"><span class="ay-nota-num">${n}</span><span class="ay-nota-l">${t}</span></button>`;
            return `<section class="ay-card ay-card--prim" aria-labelledby="ay-r-t"><p class="paso">Tarea ${d.guiada.i + 1} de ${CASOS.length}</p><h3 class="ay-h3" id="ay-r-t">¿Qué tan fácil fue?</h3>
                <div class="ay-notas-n" role="radiogroup" aria-labelledby="ay-r-t">${op(1, 'Muy difícil')}${op(2, 'Difícil')}${op(3, 'Más o menos')}${op(4, 'Fácil')}${op(5, 'Muy fácil')}</div>
                ${A.errorFacil ? `<p class="campo-error">${icon('triangle-alert')}<span>Elige un número del 1 al 5</span></p>` : ''}
                <div class="campo-g"><label class="campo-l" for="ay-confuso">¿Qué te confundió? <span class="opcional">(opcional)</span></label><textarea id="ay-confuso" class="ay-textarea" data-ay="confuso" rows="4" placeholder="Lo que sea: una palabra, un número, dónde tocar…">${esc(r.confuso || '')}</textarea></div>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayResponder" data-fk="ay-responder">${d.guiada.i + 1 < CASOS.length ? 'Guardar y seguir' : 'Guardar y terminar'}</button>
                <button type="button" class="link" data-a="ayTarea" data-v="instruccion" data-fk="ay-r-volver">Volver a la tarea</button></section>`;
        }
        const sims = caso.sims || [];
        return `<section class="ay-card ay-card--prim" aria-labelledby="ay-i-t"><p class="paso" id="ay-i-t">Tarea ${d.guiada.i + 1} de ${CASOS.length}</p>
            <p class="ay-tarea ay-tarea--grande">${esc(caso.tarea)}</p>
            <p class="fila-s">Hazlo como lo harías tú. Cuando termines, toca «Ya terminé».</p>
            ${sims.length ? `<div class="ay-sims"><p class="campo-l">Para esta tarea puedes adelantar el tiempo:</p>${sims.map((s) => `<button type="button" class="btn btn--48 btn--full ay-sim" data-a="aySimular" data-v="${s.id}" data-fk="ay-sim-${s.id}">${icon('fast-forward', 'ico-s')}${esc(s.t.replace('Simular: ', 'Adelantar: '))}</button>`).join('')}</div>` : ''}
            <div class="ay-acc"><button type="button" class="btn btn--48" data-a="ayTarea" data-v="respuesta" data-fk="ay-ya">Ya terminé</button><button type="button" class="btn btn--prim btn--48" data-a="ayCerrar" data-fk="ay-empezar">Empezar</button></div>
            <div class="ay-acc ay-acc--sec"><button type="button" class="link" data-a="aySaltar" data-fk="ay-saltar">${icon('skip-forward', 'ico-s')}Saltar esta tarea</button><button type="button" class="link" data-a="ayGuiada" data-v="salir" data-fk="ay-salir">Salir de la prueba</button></div></section>
            <p class="ay-version">${esc(VERSION)} · Datos inventados: no pongas tus datos reales</p>`;
    }
    function pintar({ foco = null } = {}) {
        const capa = $('#capa-ayuda');
        if (!A.abierto) {
            capa.innerHTML = '';
            return;
        }
        const titulo = A.panel === 'respuesta' ? 'Cuéntanos' : A.panel === 'instruccion' ? 'Prueba guiada' : 'Casos y ayuda';
        const cuerpo = A.panel === 'instruccion' || A.panel === 'respuesta' || A.panel === 'gracias' ? vistaTarea(A.panel) : vistaInicio();
        const scroll = capa.querySelector('.ay-c') ? capa.querySelector('.ay-c').scrollTop : 0;
        const nueva = capa.dataset.panel !== A.panel;
        capa.innerHTML = `<section class="ay" role="dialog" aria-modal="true" aria-labelledby="ay-t"><header class="ay-h"><h2 class="ay-t" id="ay-t" tabindex="-1">${titulo}</h2><button type="button" class="hoja-x" data-a="ayCerrar" aria-label="Cerrar" data-fk="ay-x">${icon('x')}</button></header><div class="ay-c">${cuerpo}</div></section>`;
        capa.dataset.panel = A.panel;
        if (!nueva) capa.querySelector('.ay-c').scrollTop = scroll;
        const el = foco ? capa.querySelector(foco) : nueva ? capa.querySelector('#ay-t') : null;
        if (el) el.focus({ preventScroll: true });
    }
    function bloquear(si) {
        for (const id of ['vista', 'nav', 'capa-hoja', 'capa-banner', 'capa-toast', 'aviso-proto', 'tarea-bar']) {
            const el = document.getElementById(id);
            if (el) el.inert = si || (['vista', 'nav'].includes(id) && !!P.ui.hoja);
        }
        document.getElementById('app').classList.toggle('con-ayuda', si);
    }
    function abrir(panel = 'inicio', { bienvenida = false } = {}) {
        A.disparador = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk || null : null;
        A.abierto = true;
        A.panel = panel;
        A.bienvenida = bienvenida;
        A.texto = A.texto || '';
        A.confirmarBorrar = false;
        $('#capa-ayuda').dataset.panel = '';
        bloquear(true);
        pintar();
        P.emitir('ayuda:' + panel);
    }
    function cerrar({ foco = true } = {}) {
        if (!A.abierto) return;
        A.abierto = false;
        A.bienvenida = false;
        pintar();
        bloquear(false);
        if (foco) {
            const el = (A.disparador && document.querySelector(`[data-fk="${CSS.escape(A.disparador)}"]`)) || $('#btn-ayuda') || document.querySelector('#pantalla h1');
            if (el) el.focus({ preventScroll: true });
        }
    }
    A.abrir = abrir;
    A.pintarBarra = pintarBarra;
    A.cerrar = cerrar;

    // ------------------------------------------------------------------ acciones
    const acc = P.acciones;
    acc.abrirAyuda = () => abrir('inicio');
    acc.ayCerrar = () => cerrar();
    acc.ayTarea = (d) => {
        if (d.v === 'respuesta') {
            const caso = tareaActual();
            const r = caso ? datos().guiada.resp[caso.id] : null;
            A.borrador = r && !r.saltada ? { ...r } : {};
            A.errorFacil = false;
        }
        if (!A.abierto) abrir(d.v);
        else {
            A.panel = d.v;
            pintar();
        }
    };
    acc.ayGuiada = (d) => {
        const g = datos();
        if (d.v === 'salir') {
            g.guiada.activa = false;
            guardar(g);
            detectado = false;
            pintarBarra();
            A.panel = 'inicio';
            pintar({ foco: '#ay-t' });
            P.emitir('guiada:salir');
            return;
        }
        const i = d.v === 'empezar' || g.guiada.terminada ? 0 : g.guiada.i;
        if (d.v === 'empezar' || g.guiada.terminada) {
            g.guiada.resp = {};
            guardar(g);
        }
        empezarTarea(i);
        A.panel = 'instruccion';
        A.bienvenida = false;
        pintar();
        P.emitir('guiada:empezar');
    };
    acc.ayFacil = (d) => {
        A.borrador = { ...(A.borrador || {}), facil: Number(d.v) };
        A.errorFacil = false;
        pintar({ foco: `[data-fk="ay-facil-${d.v}"]` });
    };
    function avanzar() {
        const g = datos();
        if (g.guiada.i + 1 >= CASOS.length) {
            g.guiada.activa = false;
            g.guiada.terminada = true;
            guardar(g);
            detectado = false;
            pintarBarra();
            A.texto = armarTexto();
            A.panel = 'gracias';
            pintar();
            P.emitir('guiada:fin');
            return;
        }
        empezarTarea(g.guiada.i + 1);
        A.panel = 'instruccion';
        pintar();
    }
    acc.ayResponder = () => {
        const r = A.borrador || {};
        if (!r.facil) {
            A.errorFacil = true;
            pintar({ foco: '[data-fk="ay-facil-1"]' });
            return;
        }
        const g = datos();
        const caso = tareaActual(g);
        g.guiada.resp[caso.id] = { facil: r.facil, confuso: (r.confuso || '').trim(), fecha: new Date().toISOString() };
        guardar(g);
        A.borrador = null;
        P.emitir('guiada:respuesta:' + caso.id);
        avanzar();
    };
    acc.aySaltar = () => {
        const g = datos();
        const caso = tareaActual(g);
        g.guiada.resp[caso.id] = { saltada: true, fecha: new Date().toISOString() };
        guardar(g);
        avanzar();
    };
    acc.aySimular = (d) => {
        cerrar({ foco: false });
        P.simular(d.v);
    };
    acc.ayCaso = (d) => {
        cerrar({ foco: false });
        P.cargarCaso(d.v);
    };
    acc.ayPersona = (d) => {
        cerrar({ foco: false });
        P.cargarPersona(d.v);
    };
    acc.ayTema = (d) => {
        P.aplicarTema(d.v);
        P.render();
        pintar({ foco: `[data-fk="ay-tema-${d.v}"]` });
    };
    acc.ayReiniciar = () => {
        cerrar({ foco: false });
        P.reiniciar();
        P.avisar('Datos reiniciados', { check: false });
    };
    acc.ayBorrar = (d) => {
        if (d.v === 'pregunta' || d.v === 'no') {
            A.confirmarBorrar = d.v === 'pregunta';
            pintar({ foco: d.v === 'pregunta' ? '[data-fk="ay-borrar-no"]' : '[data-fk="ay-borrar"]' });
            return;
        }
        P.almacen.borrar(CLAVE);
        P.borrarGuardado();
        A.texto = '';
        detectado = false;
        cerrar({ foco: false });
        pintarBarra();
        P.cargarPersona('ana');
        P.avisar('Borramos todo', { check: false });
    };
    acc.ayArmar = () => {
        A.texto = armarTexto();
        pintar({ foco: '#ay-texto' });
        const t = $('#ay-texto');
        if (t) t.select();
    };
    acc.aySeleccionar = () => {
        const t = $('#ay-texto');
        if (!t) return;
        t.focus();
        t.select();
        t.setSelectionRange(0, t.value.length);
    };
    acc.ayCopiar = () => {
        const aviso = $('#ay-copiado');
        navigator.clipboard.writeText(A.texto).then(
            () => aviso && (aviso.textContent = '✓ Copiado. Pégalo en WhatsApp.'),
            () => aviso && (aviso.textContent = 'No se pudo copiar: mantén presionado el texto y elige «Copiar».'),
        );
    };
    acc.ayCompartir = () => {
        navigator.share({ title: 'PamPlanea · mis notas del prototipo', text: A.texto }).catch(() => {
            /* la persona canceló */
        });
    };

    // Campos del panel: nombre, notas y «¿qué te confundió?» se guardan al escribir.
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (!el.dataset || !el.dataset.ay) return;
        if (el.dataset.ay === 'confuso') {
            A.borrador = { ...(A.borrador || {}), confuso: el.value };
            return;
        }
        const d = datos();
        if (el.dataset.ay === 'nombre') d.nombre = el.value;
        if (el.dataset.ay === 'nota') d.notas[notaDe()] = el.value;
        guardar(d);
    });
    // Foco atrapado en el panel y Escape para cerrarlo.
    document.addEventListener(
        'keydown',
        (e) => {
            if (!A.abierto) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cerrar();
                return;
            }
            if (e.key !== 'Tab') return;
            const panel = document.querySelector('.ay');
            const lista = [...panel.querySelectorAll('button:not([disabled]), input, textarea, a[href], summary')].filter((x) => x.getClientRects().length);
            if (!lista.length) return;
            const [primero, ultimo] = [lista[0], lista.at(-1)];
            if (!panel.contains(document.activeElement) || (!e.shiftKey && document.activeElement === ultimo)) {
                e.preventDefault();
                (e.shiftKey ? ultimo : primero).focus();
            } else if (e.shiftKey && document.activeElement === primero) {
                e.preventDefault();
                ultimo.focus();
            }
        },
        true,
    );

    // El modo se fija antes del primer dibujo para no ver el marco simulado un instante.
    prepararModo();
    A.iniciar = function () {
        const aviso = $('#aviso-proto');
        if (aviso) {
            aviso.innerHTML = `<span class="aviso-proto-t">${icon('info', 'ico-xs')}<span><span class="nw">Prototipo de prueba ·</span> <span class="nw">no pongas tus datos reales</span></span></span>${P.enGuia ? '' : `<button type="button" class="aviso-proto-b" id="btn-ayuda" data-a="abrirAyuda" data-fk="btn-ayuda" aria-haspopup="dialog">Casos y ayuda</button>`}`;
        }
        pintarBarra();
        if (P.primeraVez && !P.enGuia) abrir('inicio', { bienvenida: true });
        A.listo = true;
    };
    // Al cargar otro caso desde fuera de la prueba (guía o lista), la barra se mantiene al día.
    window.addEventListener('proto', (e) => {
        if (String(e.detail.clave).startsWith('caso:') || String(e.detail.clave).startsWith('persona:')) pintarBarra();
    });
})();
