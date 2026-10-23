// Guía del prototipo: casos, pasos que se marcan solos con los eventos del teléfono,
// simulaciones, tema y notas. Habla con telefono.html por postMessage (funciona con file:// y
// servido). Guarda el caso, el tema y las notas en este navegador; las notas son las mismas que
// ve «Casos y ayuda» en el teléfono.
'use strict';
(() => {
    const CASOS = window.CASOS;
    const $ = (s) => document.querySelector(s);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const PERSONAS = { ana: 'Ana', carlos: 'Carlos', rosa: 'Rosa', nueva: 'Persona nueva' };
    /** Exploración libre: quién es cada persona de ejemplo. */
    const LIBRE = {
        ana: ['Ana, pago quincenal', 'Cobra $600.00 aprox. el 15 y el 30 en Banco Agrícola. Tiene $40 en efectivo y $1,455.60 en el banco, tarjeta Crédito BAC (corte 15, pago 5, cupo $1,500), luz vencida sin confirmar y tres ahorros: Emergencias, Laptop (lista para usar) y Vacaciones.'],
        carlos: ['Carlos, pago semanal', 'Cobra $90.00 aprox. cada viernes, en efectivo. Tiene $125 y paga $150 de alquiler el día 1: lo paga con su pago del viernes 30 y la app le sugiere reservar lo que falta (él decide). Aporta $10 al cuchubal cada viernes.'],
        rosa: ['Rosa, ingresos que varían', 'Vende pupusas en su casa (lo que entra cambia cada día) y su hijo le manda una remesa sin fecha fija ($150.00 aprox., más o menos el 28). Tiene $110 en efectivo y $95 en Banco Agrícola, dos ahorros (Emergencias y Plancha nueva) y paga alquiler ($120 el 5), luz, agua y la cuota de la cooperativa ($45 el 25). Ve su libre hasta fin de mes.'],
    };
    const CLAVE_GUIA = 'pamplanea-proto-v2:guia';
    const CLAVE_NOTAS = 'pamplanea-proto-v2:notas';
    const est = { caso: null, persona: 'ana', tema: 'serena-claro', hechos: {}, completos: {}, nota: '', ajustar: false };
    const iframe = $('#telefono');
    let listo = false;

    function leer(clave, defecto) {
        try {
            const v = localStorage.getItem(clave);
            return v === null ? defecto : JSON.parse(v);
        } catch {
            return defecto;
        }
    }
    function escribir(clave, valor) {
        try {
            localStorage.setItem(clave, JSON.stringify(valor));
        } catch {
            /* sin almacenamiento: las notas viven solo en la página */
        }
    }
    const guardado = leer(CLAVE_GUIA, null);
    if (guardado && guardado.formato === 2) Object.assign(est, { caso: guardado.caso, persona: guardado.persona || 'ana', tema: guardado.tema || 'serena-claro', hechos: guardado.hechos || {}, completos: guardado.completos || {} });
    if (est.caso && !CASOS.some((c) => c.id === est.caso)) est.caso = null;
    const guardarGuia = () => escribir(CLAVE_GUIA, { formato: 2, caso: est.caso, persona: est.persona, tema: est.tema, hechos: est.hechos, completos: est.completos });
    const leerNotas = () => {
        const d = leer(CLAVE_NOTAS, null) || {};
        d.notas = d.notas || {};
        d.nombre = d.nombre || '';
        d.guiada = d.guiada || { activa: false, i: 0, resp: {} };
        d.guiada.resp = d.guiada.resp || {};
        return d;
    };

    function enviar(msg) {
        if (!listo) return;
        iframe.contentWindow.postMessage({ fuente: 'pamplanea-guia', ...msg }, '*');
    }
    window.addEventListener('message', (e) => {
        if (e.source !== iframe.contentWindow) return;
        const m = e.data;
        if (!m || m.fuente !== 'pamplanea-proto') return;
        if (m.tipo === 'listo') {
            listo = true;
            arrancar();
        }
        if (m.tipo === 'tema') aplicarTema(m.tema, false);
        if (m.tipo === 'evento') {
            if (m.clave === 'nota') {
                est.nota = m.texto;
                pintarPanel();
            } else marcar(m.clave);
        }
    });

    function marcar(clave) {
        const caso = CASOS.find((c) => c.id === est.caso);
        if (!caso) return;
        const hechos = (est.hechos[caso.id] = est.hechos[caso.id] || {});
        let cambio = false;
        caso.pasos.forEach((p, i) => {
            if (p.clave && [].concat(p.clave).includes(clave) && !hechos[i]) {
                hechos[i] = true;
                cambio = true;
            }
        });
        if (cambio) {
            const automaticos = caso.pasos.map((p, i) => [p, i]).filter(([p]) => p.clave);
            if (automaticos.every(([, i]) => hechos[i])) est.completos[caso.id] = true;
            guardarGuia();
            pintarPanel();
            pintarCasos();
        }
    }

    // ------------------------------------------------------------------ tema
    function aplicarTema(tema, avisarTelefono = true) {
        est.tema = tema;
        const [palette, modo] = tema.split('-');
        document.documentElement.dataset.palette = palette;
        document.documentElement.dataset.mode = modo === 'oscuro' ? 'dark' : 'light';
        for (const b of document.querySelectorAll('[data-tema]')) b.setAttribute('aria-pressed', String(b.dataset.tema === tema));
        if (avisarTelefono) enviar({ tipo: 'tema', tema });
        guardarGuia();
    }

    // ------------------------------------------------------------------ casos y panel
    function pintarCasos() {
        $('#g-lista-casos').innerHTML = CASOS.map((c) => {
            const hechos = est.hechos[c.id] || {};
            const n = c.pasos.filter((p, i) => hechos[i]).length;
            const completo = est.completos[c.id];
            return `<li><button type="button" class="g-caso" data-caso="${c.id}" aria-pressed="${est.caso === c.id}" aria-describedby="g-caso-p-${c.id}">
                <span class="g-caso-cod">${c.id}</span><span class="g-caso-t">${esc(c.titulo)}</span>
                <span class="g-caso-p" id="g-caso-p-${c.id}">${completo ? '✓ Recorrido completo' : n ? `${n} de ${c.pasos.length} pasos` : PERSONAS[c.persona]}</span></button></li>`;
        }).join('');
        const faltan = CASOS.length - Object.keys(est.completos).length;
        $('#g-faltan').textContent = faltan ? `Faltan ${faltan} de ${CASOS.length} recorridos.` : `Hiciste los ${CASOS.length} recorridos.`;
        for (const b of document.querySelectorAll('[data-persona]')) b.setAttribute('aria-pressed', String(!est.caso && b.dataset.persona === est.persona));
    }
    function pintarPanel() {
        const panel = $('#g-panel');
        const caso = CASOS.find((c) => c.id === est.caso);
        if (!caso) {
            const [t, s] = LIBRE[est.persona] || LIBRE.ana;
            panel.innerHTML = `<p class="g-panel-cod">Exploración libre</p><h2 class="g-panel-t">${t}</h2>
                <p>${s}</p>
                <p class="g-tip">Elige un caso a la izquierda para ver sus pasos. Todo lo que hagas cambia los números de verdad; «Reiniciar datos» vuelve al inicio.</p>`;
            return;
        }
        const hechos = est.hechos[caso.id] || {};
        const pasos = caso.pasos
            .map((p, i) =>
                p.clave
                    ? `<li class="${hechos[i] ? 'hecho' : ''}"><span class="g-marca" aria-hidden="true">${hechos[i] ? '✓' : i + 1}</span><span>${esc(p.t)}${hechos[i] ? '<span class="sr-only"> (hecho)</span>' : ''}</span></li>`
                    : `<li class="${hechos[i] ? 'hecho' : ''}"><label class="g-manual"><input type="checkbox" data-paso="${i}" ${hechos[i] ? 'checked' : ''}><span>${esc(p.t)} <span class="g-obs-t">(márcalo tú)</span></span></label></li>`,
            )
            .join('');
        panel.innerHTML = `<p class="g-panel-cod">${caso.id} · ${PERSONAS[caso.persona]}</p>
            <h2 class="g-panel-t">${esc(caso.titulo)}</h2>
            <p>${esc(caso.para)}</p>
            <h3 class="g-h3">Pasos</h3>
            <ol class="g-pasos">${pasos}</ol>
            ${caso.sims ? `<div class="g-sims">${caso.sims.map((s) => `<button type="button" class="g-btn g-btn--sim" data-sim="${s.id}">${esc(s.t)}</button>`).join('')}</div>` : ''}
            ${est.nota ? `<p class="g-nota">${esc(est.nota)}</p>` : ''}
            <h3 class="g-h3">Resultado esperado</h3>
            <p>${esc(caso.esperado)}</p>
            <h3 class="g-h3">Qué observar</h3>
            <p>${esc(caso.observar)}</p>
            <h3 class="g-h3">Tarea para la prueba guiada</h3>
            <p class="g-tip">«${esc(caso.tarea)}»</p>
            <button type="button" class="g-btn" data-reiniciar-caso>Empezar este caso otra vez</button>`;
    }
    /** Al cargar la guía: el teléfono recupera lo guardado si es del mismo caso. */
    function arrancar() {
        enviar({ tipo: 'arrancar', caso: est.caso, persona: est.persona, tema: est.tema });
    }
    function abrirCaso(id) {
        est.caso = id;
        est.nota = '';
        est.hechos[id] = {};
        delete est.completos[id];
        guardarGuia();
        enviar({ tipo: 'caso', id });
        pintarCasos();
        pintarPanel();
    }
    function abrirPersona(persona) {
        est.caso = null;
        est.persona = persona;
        est.nota = '';
        guardarGuia();
        enviar({ tipo: 'persona', persona });
        pintarCasos();
        pintarPanel();
    }

    // ------------------------------------------------------------------ qué observar y notas
    function pintarObservar() {
        $('#g-obs').innerHTML = CASOS.map((c) => `<article class="g-obs-c"><p class="g-panel-cod">${c.id} · ${PERSONAS[c.persona]}</p><h3 class="g-h3">${esc(c.titulo)}</h3><p>${esc(c.observar)}</p><button type="button" class="g-btn g-btn--sm" data-caso="${c.id}" data-subir>Abrir este caso</button></article>`).join('');
    }
    function pintarSets() {
        const sets = window.SETS || {};
        $('#g-sets').innerHTML = Object.entries(sets).map(([id, tareas]) => `<article class="g-obs-c"><p class="g-panel-cod">Set ${id} · ${tareas.length} tareas · unos 15 min</p><ol class="g-set">${tareas.map((t) => `<li><strong>${esc(t.titulo)}</strong>${t.caso ? ` <span class="g-obs-t">(${t.caso})</span>` : ''}<br>«${esc(t.tarea)}»</li>`).join('')}</ol></article>`).join('');
    }
    function pintarNotas() {
        const d = leerNotas();
        const filas = [...CASOS.map((c) => [c.id, `${c.id} · ${c.titulo}`]), ['general', 'Notas generales']];
        const resp = (id) => {
            const r = d.guiada.resp[id];
            return r ? `<p class="g-obs-t">Prueba guiada: ${r.saltada ? 'la saltó' : `fácil ${r.facil} de 5`}${r.confuso ? ` · «${esc(r.confuso)}»` : ''}</p>` : '';
        };
        $('#g-notas').innerHTML = `<div class="g-nota-c"><label class="g-label" for="g-nombre">Tu nombre</label><input id="g-nombre" class="g-input" data-nombre type="text" autocomplete="off" value="${esc(d.nombre)}" placeholder="Ej. Victor"></div>` + filas.map(([id, t]) => `<div class="g-nota-c"><label class="g-label" for="g-n-${id}">${esc(t)}</label>${resp(id)}<textarea id="g-n-${id}" data-nota="${id}" rows="3" placeholder="Qué entendió, dónde dudó, qué dijo…">${esc(d.notas[id] || '')}</textarea></div>`).join('');
    }
    function armarTexto() {
        const d = leerNotas();
        let fecha;
        try {
            fecha = new Date().toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            fecha = new Date().toISOString().slice(0, 16).replace('T', ' ');
        }
        const lineas = [`PamPlanea · ${window.VERSION_PROTOTIPO} · notas del prototipo`, `Nombre: ${d.nombre.trim() || '(sin nombre)'}`, `Fecha: ${fecha}`, `Recorridos completos: ${Object.keys(est.completos).length} de ${CASOS.length}`, ''];
        for (const c of CASOS) {
            const t = (d.notas[c.id] || '').trim();
            const r = d.guiada.resp[c.id];
            lineas.push(`${c.id} · ${c.titulo}${est.completos[c.id] ? ' (recorrido completo)' : ''}`);
            if (r) lineas.push(r.saltada ? 'Prueba guiada: la saltó' : `Qué tan fácil: ${r.facil} de 5${r.confuso ? ` · Me confundió: ${r.confuso}` : ''}`);
            lineas.push(t || '(sin notas)', '');
        }
        lineas.push('Notas generales', (d.notas.general || '').trim() || '(sin notas)');
        $('#g-texto').value = lineas.join('\n');
    }

    // ------------------------------------------------------------------ eventos de la guía
    document.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.caso) {
            abrirCaso(b.dataset.caso);
            if (b.dataset.subir !== undefined) document.querySelector('.g-main').scrollIntoView({ block: 'start' });
        } else if (b.dataset.persona) abrirPersona(b.dataset.persona);
        else if (b.dataset.tema) aplicarTema(b.dataset.tema);
        else if (b.dataset.sim) enviar({ tipo: 'simular', id: b.dataset.sim });
        else if (b.dataset.reiniciarCaso !== undefined) abrirCaso(est.caso);
        else if (b.id === 'g-reiniciar') {
            if (est.caso) abrirCaso(est.caso);
            else enviar({ tipo: 'reiniciar' });
        } else if (b.id === 'g-armar') armarTexto();
        else if (b.id === 'g-copiar') {
            if (!$('#g-texto').value) armarTexto();
            navigator.clipboard.writeText($('#g-texto').value).then(
                () => ($('#g-copiado').textContent = '✓ Copiado'),
                () => ($('#g-copiado').textContent = 'No se pudo copiar: usa Ctrl + A y Ctrl + C.'),
            );
        }
        else if (b.id === 'g-seleccionar') {
            if (!$('#g-texto').value) armarTexto();
            $('#g-texto').focus();
            $('#g-texto').select();
        } else if (b.id === 'g-ajustar') {
            est.ajustar = !est.ajustar;
            b.setAttribute('aria-pressed', String(est.ajustar));
            ajustar();
        }
    });
    document.addEventListener('change', (e) => {
        const c = e.target;
        if (c.dataset && c.dataset.paso !== undefined) {
            const hechos = (est.hechos[est.caso] = est.hechos[est.caso] || {});
            hechos[c.dataset.paso] = c.checked;
            pintarCasos();
        }
    });
    document.addEventListener('input', (e) => {
        const t = e.target;
        if (t.dataset && (t.dataset.nota || t.dataset.nombre !== undefined)) {
            const d = leerNotas();
            if (t.dataset.nota) d.notas[t.dataset.nota] = t.value;
            else d.nombre = t.value;
            escribir(CLAVE_NOTAS, d);
        }
    });
    function ajustar() {
        const cont = $('#g-telefono');
        const marco = cont.querySelector('.marco');
        if (!est.ajustar) {
            marco.style.transform = '';
            cont.style.height = '';
            $('#g-pie-tel').textContent = 'Teléfono a 390 × 844 px reales · fecha simulada: miércoles 21 de octubre de 2026';
            return;
        }
        const escala = Math.min(1, Math.max(0.5, (window.innerHeight - 48) / marco.offsetHeight));
        marco.style.transform = `scale(${escala})`;
        cont.style.height = Math.ceil(marco.offsetHeight * escala + 40) + 'px';
        $('#g-pie-tel').textContent = `Teléfono reducido al ${Math.round(escala * 100)} % para que quepa en la ventana`;
    }
    window.addEventListener('resize', () => est.ajustar && ajustar());
    // Por si el teléfono terminó de cargar antes que esta guía: al cargar el marco, se sincroniza.
    iframe.addEventListener('load', () => {
        if (listo) return;
        listo = true;
        arrancar();
    });
    // Las notas también se escriben desde «Casos y ayuda»: al volver a esta pestaña se refrescan.
    window.addEventListener('focus', () => {
        if (!document.activeElement || !document.activeElement.matches('textarea, input')) pintarNotas();
    });
    if (!(navigator.clipboard && window.isSecureContext)) $('#g-copiar').hidden = true;
    aplicarTema(est.tema, false);

    pintarCasos();
    pintarPanel();
    pintarObservar();
    pintarSets();
    pintarNotas();
})();
