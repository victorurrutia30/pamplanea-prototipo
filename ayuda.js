// Producto v2.1 · prototipo. Para probar en el teléfono de otras personas: pantalla completa con
// safe areas y teclado reales, aviso fijo de prototipo, «Casos y ayuda» (casos, notas, tema,
// reiniciar), la PRUEBA GUIADA PARA TESTERS (bienvenida con perfil, set A o B alternado, una tarea a
// la vez sin decir dónde tocar, registro de tiempo, toques y pantallas, comprensión final y resumen
// para WhatsApp), el modo moderador, la guía de instalación y el aviso de versión nueva (PWA).
// Todo se guarda en este navegador (o en memoria si no se puede).
'use strict';
(() => {
    const P = window.P;
    const M = window.MOTOR;
    const { esc, icon } = P;
    const CASOS = window.CASOS;
    const SETS = window.SETS;
    const VERSION = window.VERSION_PROTOTIPO;
    const CLAVE = 'pamplanea-proto-v2:notas';
    const CLAVE_DISP = 'pamplanea-proto-v2:dispositivo';
    const root = document.documentElement;
    const $ = (s) => document.querySelector(s);

    const pruebaVacia = () => ({ estado: null, set: null, origen: null, perfil: {}, i: 0, tareas: {}, final: {}, instalada: null, inicio: null, enviado: false });
    const datos = () => {
        const d = P.almacen.leer(CLAVE, null) || {};
        d.nombre = d.nombre || '';
        d.notas = d.notas || {};
        d.prueba = { ...pruebaVacia(), ...(d.prueba || {}) };
        return d;
    };
    const guardar = (d) => P.almacen.escribir(CLAVE, d);
    const dispositivo = () => ({ personas: 0, setSiguiente: null, ...(P.almacen.leer(CLAVE_DISP, null) || {}) });

    const A = (P.ayuda = { abierto: false, panel: null, confirmar: null, texto: '', disparador: null, borrador: null });
    // ?set=A o ?set=B en el enlace asigna el set (el moderador manda un enlace distinto a cada persona).
    const setEnlace = (() => {
        const m = /[?&]set=([ab])\b/i.exec(location.search);
        return m ? m[1].toUpperCase() : null;
    })();

    // ------------------------------------------------------------------ plataforma e instalación
    const ua = navigator.userAgent || '';
    const esIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const esSafariIOS = esIOS && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Line|WhatsApp/.test(ua);
    const esAndroid = /Android/.test(ua);
    const instalada = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    let promptInstalar = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        promptInstalar = e;
        if (A.abierto && A.panel === 'instalar') pintar();
    });
    window.addEventListener('appinstalled', () => marcarInstalada('sí'));
    function marcarInstalada(valor) {
        const d = datos();
        d.prueba.instalada = valor;
        guardar(d);
    }

    // ------------------------------------------------------------------ pantalla completa, safe areas y teclado
    function prepararModo() {
        root.classList.add(P.enGuia ? 'modo-marco' : 'modo-real');
        if (instalada()) root.classList.add('instalada');
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
    /** La barra de estado (Android) toma el color del aviso de arriba, en claro y oscuro. */
    P.colorBarra = function () {
        const meta = document.querySelector('meta[name="theme-color"]');
        const aviso = $('#aviso-proto');
        if (meta && aviso) meta.content = getComputedStyle(aviso).backgroundColor;
    };

    // ------------------------------------------------------------------ prueba guiada: estado
    const setActual = (d = datos()) => (d.prueba.set ? SETS[d.prueba.set] : null);
    const tareaActual = (d = datos()) => {
        const s = setActual(d);
        return s ? s[d.prueba.i] || null : null;
    };
    const enCurso = (d = datos()) => d.prueba.estado === 'activa';
    /** Registro de la tarea en curso (tiempo, toques, pantallas, resultado). */
    const registro = (d, t) => (d.prueba.tareas[t.id] = d.prueba.tareas[t.id] || { toques: 0, pantallas: [] });

    const PERFIL = [
        ['pago', '¿Cómo te pagan?', [['quincena', 'Cada quincena'], ['mes', 'Cada mes'], ['semana', 'Cada semana'], ['varia', 'Varía'], ['remesa', 'Remesa'], ['otro', 'Otro']]],
        ['dinero', '¿Dónde tienes tu dinero?', [['efectivo', 'Efectivo'], ['banco', 'Banco'], ['ambos', 'Los dos'], ['billetera', 'Billetera en el celular']]],
        ['tarjeta', '¿Usas tarjeta de crédito?', [['si', 'Sí'], ['no', 'No']]],
        ['cuentas', '¿Hoy llevas tus cuentas?', [['no', 'No'], ['cuaderno', 'En un cuaderno'], ['excel', 'En Excel'], ['app', 'En una app']]],
    ];

    function asignarSet() {
        const disp = dispositivo();
        if (setEnlace) return [setEnlace, 'enlace'];
        if (disp.setSiguiente) return [disp.setSiguiente, 'moderador'];
        return [disp.personas % 2 === 0 ? 'A' : 'B', 'alterno'];
    }
    function empezarPrueba() {
        const d = datos();
        const [set, origen] = asignarSet();
        const disp = dispositivo();
        P.almacen.escribir(CLAVE_DISP, { ...disp, personas: disp.personas + 1, setSiguiente: null });
        d.prueba = { ...pruebaVacia(), estado: 'activa', set, origen, perfil: { ...(A.perfil || {}) }, inicio: new Date().toISOString(), instalada: instalada() ? 'sí' : null };
        d.nombre = (A.nombreTester || d.nombre || '').trim();
        guardar(d);
        P.emitir('prueba:empezar:' + set);
        if (!instalada() && !P.enGuia) abrirPanel('instalar', { enFlujo: true });
        else iniciarTarea(0);
    }
    function iniciarTarea(i) {
        const d = datos();
        const s = setActual(d);
        if (!s) return;
        d.prueba.i = i;
        guardar(d);
        const t = s[i];
        if (t.persona) P.cargarPersona(t.persona);
        else P.cargarCaso(t.caso, { tab: t.inicio });
        A.armada = false;
        pintarBarra();
        abrirPanel('tarea');
    }
    /** «Empezar»: corre el tiempo y se cuentan los toques. */
    function comenzarTarea() {
        const d = datos();
        const t = tareaActual(d);
        const r = registro(d, t);
        r.inicio = Date.now();
        r.toques = 0;
        r.pantallas = [];
        r.detectada = false;
        delete r.resultado;
        guardar(d);
        A.armada = true;
        cerrar({ foco: false });
        pintarBarra();
        P.emitir('prueba:tarea:' + t.id);
    }
    function terminarTarea(resultado) {
        const d = datos();
        const t = tareaActual(d);
        const r = registro(d, t);
        if (!r.fin) r.fin = Date.now();
        r.resultado = resultado;
        guardar(d);
        A.armada = false;
        A.borrador = { facil: r.facil || null, confuso: r.confuso || '' };
        A.errorFacil = false;
        pintarBarra();
        abrirPanel('respuesta');
    }
    function siguienteTarea() {
        const d = datos();
        const s = setActual(d);
        if (d.prueba.i + 1 < s.length) iniciarTarea(d.prueba.i + 1);
    }
    function terminarPrueba() {
        const d = datos();
        d.prueba.estado = 'fin';
        d.prueba.finalizada = new Date().toISOString();
        guardar(d);
        A.armada = false;
        pintarBarra();
        A.texto = armarResumen();
        abrirPanel('fin');
        P.emitir('prueba:fin');
    }

    // Detección automática y registro de toques y pantallas.
    const NOMBRES = { hoy: 'Hoy', pagos: 'Pagos', midinero: 'Mi dinero', mes: 'Mes', pago: 'Ficha de pago', tarjeta: 'Ficha de tarjeta', apartado: 'Ficha de ahorro', lugar: 'Ficha de lugar', ingreso: 'Ficha de ingreso', reparte: 'Reparte', aldia: 'Pongámonos al día', logro: 'Meta cumplida', espacio: 'Tu espacio', invitar: 'Invitar', anotar: 'Anotar', desglose: 'Detalle del libre', menu: 'Menú', usar: 'Usar ahorro', pagado: 'Pagado', estadoCuenta: 'Estado de cuenta', ingresoLlego: '¿Cuánto te cayó?', nuevaDeuda: 'Tarjeta o préstamo', nuevoPago: 'Nuevo pago', cuentas: 'Cuentas', ahorros: 'Ahorros', deudas: 'Deudas', atencion: 'Necesitan atención', pagarCon: 'Lo pagas con', reservar: 'Reservar', yaLoUse: '¿Ya lo usaste?', editarRegistro: 'Corregir', pagarYa: '¿Cuánto pagas?', apartar: 'Ahorrar', cuadrar: 'Cuadrar', decidirPago: 'Cuánto voy a pagar' };
    function nombrePantalla(clave) {
        const [tipo, nombre] = clave.split(':');
        if (tipo === 'onboarding' && /^paso\d/.test(nombre)) return 'Primer día ' + nombre.replace('paso', '');
        if (tipo === 'onboarding' && nombre === 'fin') return 'Tu primer número';
        if (tipo !== 'pantalla' && tipo !== 'hoja') return null;
        return NOMBRES[nombre] || nombre;
    }
    window.addEventListener('proto', (e) => {
        const clave = String(e.detail.clave);
        if (clave.startsWith('caso:') || clave.startsWith('persona:')) pintarBarra();
        if (!A.armada) return;
        const d = datos();
        const t = tareaActual(d);
        if (!enCurso(d) || !t || t.comprension) return;
        const r = registro(d, t);
        const n = nombrePantalla(clave);
        if (n && r.pantallas.at(-1) !== n && r.pantallas.length < 30) r.pantallas.push(n);
        if (!r.detectada && ((t.claves && t.claves.includes(clave)) || (t.logrado && t.logrado(P.st, P, M)))) {
            r.detectada = true;
            r.fin = Date.now();
            guardar(d);
            pintarBarra();
            P.emitir('prueba:detectada:' + t.id);
            return;
        }
        guardar(d);
    });
    document.addEventListener(
        'click',
        (e) => {
            if (!A.armada || A.abierto) return;
            const el = e.target;
            if (!el.closest || el.closest('#tarea-bar, #aviso-proto, #actualizar, .ay')) return;
            if (!el.closest('#app')) return;
            const d = datos();
            const t = tareaActual(d);
            if (!enCurso(d) || !t) return;
            registro(d, t).toques++;
            guardar(d);
        },
        true,
    );

    // ------------------------------------------------------------------ barra de la tarea
    function pintarBarra() {
        const barra = $('#tarea-bar');
        if (!barra) return;
        const d = datos();
        if (P.practica && P.practica.activa()) return P.practica.pintar(barra);
        const t = enCurso(d) && P.modo !== 'uso' ? tareaActual(d) : null;
        const ver = !!t && !P.enGuia;
        root.classList.toggle('con-tarea', ver);
        if (!ver) {
            barra.hidden = true;
            barra.innerHTML = '';
            return;
        }
        barra.hidden = false;
        const n = `Tarea ${d.prueba.i + 1} de ${setActual(d).length}`;
        const r = d.prueba.tareas[t.id];
        if (t.comprension) {
            barra.innerHTML = `<button type="button" class="tarea-txt" data-a="ayTarea" data-fk="tarea-ver"><span class="tarea-n">${n}</span><span class="tarea-t">Mira Hoy sin tocar nada</span></button><div class="tarea-acc"><button type="button" class="tarea-btn tarea-btn--prim" data-a="ayResponderFinal" data-fk="tarea-responder">Responder</button></div>`;
        } else if (r && r.detectada) {
            barra.innerHTML = `<div class="tarea-txt tarea-txt--ok">${icon('circle-check', 'ico-s')}<span class="tarea-t"><strong>¡Lo lograste!</strong> Cuéntanos cómo te fue</span></div><div class="tarea-acc"><button type="button" class="tarea-btn tarea-btn--prim" data-a="ayTerminar" data-v="completada" data-fk="tarea-seguir">Seguir</button></div>`;
        } else {
            barra.innerHTML = `<button type="button" class="tarea-txt" data-a="ayTarea" data-fk="tarea-ver" aria-label="${esc(n)}: ${esc(t.tarea)}. Ver la tarea completa"><span class="tarea-n">${n}</span><span class="tarea-t">${esc(t.tarea)}</span></button><div class="tarea-acc"><button type="button" class="tarea-btn tarea-btn--prim" data-a="ayTerminar" data-v="listo" data-fk="tarea-listo">Listo</button><button type="button" class="tarea-btn" data-a="ayTerminar" data-v="rendida" data-fk="tarea-rendir">No pude</button></div>`;
        }
    }

    // ------------------------------------------------------------------ resumen para enviar
    const fechaTexto = (iso) => {
        try {
            return new Date(iso || Date.now()).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            return String(iso || '').slice(0, 16).replace('T', ' ');
        }
    };
    const duracion = (ms) => {
        if (!(ms > 0)) return '—';
        const s = Math.round(ms / 1000);
        return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
    };
    const etiquetaPerfil = (campo, v) => {
        const g = PERFIL.find((x) => x[0] === campo);
        const o = g && g[2].find((x) => x[0] === v);
        return o ? o[1].toLowerCase() : 'no contestó';
    };
    function armarResumen() {
        const d = datos();
        const p = d.prueba;
        const lineas = [`PamPlanea · ${VERSION} · resultado de la prueba`, `Nombre: ${d.nombre.trim() || '(sin nombre)'}`, `Fecha: ${fechaTexto(p.inicio)}`];
        if (p.set) {
            lineas.push(`Set: ${p.set} (${p.origen === 'enlace' ? 'por el enlace' : p.origen === 'moderador' ? 'elegido por el moderador' : 'alternado en este teléfono'})`);
            lineas.push(`Perfil: le pagan ${etiquetaPerfil('pago', p.perfil.pago)} · dinero: ${etiquetaPerfil('dinero', p.perfil.dinero)} · tarjeta de crédito: ${etiquetaPerfil('tarjeta', p.perfil.tarjeta)} · lleva cuentas: ${etiquetaPerfil('cuentas', p.perfil.cuentas)}`);
            lineas.push(`Instalada: ${instalada() ? 'sí' : p.instalada || 'no lo intentó'}`, '');
            SETS[p.set].forEach((t, i) => {
                const r = p.tareas[t.id];
                if (t.comprension) return;
                if (!r || !r.resultado) {
                    lineas.push(`${i + 1}. ${t.titulo}: no llegó`);
                    return;
                }
                const res = r.resultado === 'rendida' ? 'se rindió' : r.detectada ? 'completada (la app lo detectó)' : 'dijo que terminó (la app no lo detectó)';
                lineas.push(`${i + 1}. ${t.titulo}: ${res} · ${duracion((r.fin || Date.now()) - r.inicio)} · ${r.toques} toques${r.facil ? ` · fácil ${r.facil} de 5` : ''}`);
                if (r.confuso) lineas.push(`   Le confundió: ${r.confuso}`);
                if (r.pantallas && r.pantallas.length) lineas.push(`   Pantallas: ${r.pantallas.join(' › ')}`);
            });
            const f = p.final || {};
            lineas.push('', 'Comprensión (sin tocar nada)', `- ¿Qué significa el número grande de Hoy? ${f.numero || '(sin respuesta)'}`, `- ¿Para qué sirve esta app? ${f.sirve || '(sin respuesta)'}`, `- ¿La usarías? ¿Qué te haría dejarla? ${f.usarias || '(sin respuesta)'}`);
        } else lineas.push('(No hizo la prueba guiada)');
        const notas = Object.entries(d.notas).filter(([, v]) => (v || '').trim());
        if (notas.length) {
            lineas.push('', 'Notas');
            for (const [id, v] of notas) lineas.push(`- ${id === 'general' ? 'General' : id}: ${v.trim()}`);
        }
        return lineas.join('\n').trim();
    }
    A.armarResumen = armarResumen;

    // ------------------------------------------------------------------ paneles
    const chipsPerfil = (perfil) =>
        PERFIL.map(([campo, pregunta, ops]) => `<div class="campo-g" role="group" aria-labelledby="ay-p-${campo}"><p class="campo-l" id="ay-p-${campo}">${pregunta}</p><div class="chips">${ops.map(([v, t]) => `<button type="button" class="chip" aria-pressed="${perfil[campo] === v}" data-a="ayPerfil" data-campo="${campo}" data-v="${v}" data-fk="ay-p-${campo}-${v}">${perfil[campo] === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('')}</div></div>`).join('');
    const pieVersion = () => `<p class="ay-version">${esc(VERSION)} · Modo entrenamiento: datos de ejemplo · Sin rastreadores</p>`;
    const compartirHtml = (texto, id = 'ay-texto') => `<div class="campo-g"><label class="campo-l" for="${id}">Si no se puede compartir, mantén presionado el texto y cópialo</label><textarea id="${id}" class="ay-textarea ay-texto" readonly rows="9">${esc(texto)}</textarea></div>
        <div class="ay-acc">${navigator.share ? `<button type="button" class="btn btn--prim btn--48" data-a="ayCompartir" data-fk="ay-compartir">Compartir</button>` : ''}${navigator.clipboard && window.isSecureContext ? `<button type="button" class="btn btn--48" data-a="ayCopiar" data-fk="ay-copiar">Copiar</button>` : ''}<button type="button" class="btn btn--48" data-a="aySeleccionar" data-fk="ay-sel">Seleccionar todo</button></div><p class="fila-s" id="ay-copiado" aria-live="polite"></p>`;

    function vistaBienvenida() {
        const perfil = A.perfil || {};
        return `<div class="ay-bienvenida"><p class="ay-bien-t">¡Hola! Gracias por ayudarnos.</p><p class="txt">Es una prueba de una app para organizar tu dinero. <strong>Los datos son inventados: no pongas tus datos reales.</strong></p></div>
            <section class="ay-card" aria-labelledby="ay-como"><h3 class="ay-h3" id="ay-como">${icon('list-checks', 'ico-s')}Cómo funciona</h3>
                <ul class="ay-puntos"><li>Te damos tareas cortas, una a la vez. Son unos <strong>15 minutos</strong>.</li><li>Mientras usas la app, <strong>di en voz alta lo que piensas</strong>.</li><li>No hay respuestas malas: <strong>si algo no se entiende, es culpa de la app, no tuya</strong>.</li><li>Si te trabas, toca «No pude» y seguimos.</li></ul></section>
            <section class="ay-card" aria-labelledby="ay-quien"><h3 class="ay-h3" id="ay-quien">${icon('users', 'ico-s')}Sobre ti <span class="opcional">(opcional)</span></h3>
                <div class="campo-g"><label class="campo-l" for="ay-nombre-t">Tu nombre o apodo</label><div class="campo"><input id="ay-nombre-t" data-ay="nombreTester" type="text" autocomplete="off" autocapitalize="words" value="${esc(A.nombreTester || '')}" placeholder="Ej. Sofi"></div></div>
                ${chipsPerfil(perfil)}</section>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayEmpezarPrueba" data-fk="ay-empezar-prueba">Empezar</button>
            <button type="button" class="link" data-a="ayExplorar" data-fk="ay-explorar">Solo quiero mirar la app (sin prueba)</button>
            ${pieVersion()}`;
    }
    const dibujo = {
        compartir: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><rect x="12" y="18" width="24" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 30V6m-8 8 8-8 8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        agregar: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 16v16M16 24h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
        menu: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="12" r="4" fill="currentColor"/><circle cx="24" cy="24" r="4" fill="currentColor"/><circle cx="24" cy="36" r="4" fill="currentColor"/></svg>`,
        listo: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="9" fill="#ba1679"/><path d="M18 34V14h7.5c4.2 0 7 2.6 7 6.4S29.7 27 25.5 27H22v7h-4Zm4-10.6h3c1.9 0 3-1 3-2.6s-1.1-2.5-3-2.5h-3v5.1Z" fill="#fff"/></svg>`,
    };
    function pasosInstalar() {
        let pasos;
        if (instalada()) pasos = `<p class="txt">${icon('circle-check', 'ico-s')} Ya la tienes instalada.</p>`;
        else if (esIOS && !esSafariIOS) pasos = `<div class="nota nota--info" role="note">${icon('info')}<p><strong>En iPhone se instala desde Safari.</strong> Copia el enlace y ábrelo en Safari; ahí sigue los pasos.</p></div>${navigator.clipboard && window.isSecureContext ? `<button type="button" class="btn btn--48 btn--full" data-a="ayCopiarEnlace" data-fk="ay-copiar-enlace">Copiar el enlace</button><p class="fila-s" id="ay-enlace-ok" aria-live="polite"></p>` : `<p class="txt ay-enlace">${esc(location.href.split('#')[0])}</p>`}`;
        else if (esIOS) pasos = `<ol class="ay-pasos-dib"><li>${dibujo.compartir}<span>Toca <strong>Compartir</strong> (el cuadro con la flecha), abajo o arriba de Safari.</span></li><li>${dibujo.agregar}<span>Baja y toca <strong>«Agregar a pantalla de inicio»</strong>.</span></li><li>${dibujo.listo}<span>Toca <strong>«Agregar»</strong>. Aparece el ícono de PamPlanea.</span></li></ol><p class="fila-s">En iPhone, la app instalada empieza de nuevo: ábrela desde tu pantalla de inicio y vuelve a escribir tu nombre.</p>`;
        else if (promptInstalar) pasos = `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayInstalar" data-fk="ay-instalar">${icon('smartphone', 'ico-s')}Instalar</button><p class="fila-s">Aparece en tu pantalla de inicio como cualquier app y abre sin internet.</p>`;
        else if (esAndroid) pasos = `<ol class="ay-pasos-dib"><li>${dibujo.menu}<span>Toca el menú <strong>⋮</strong> de Chrome (arriba a la derecha).</span></li><li>${dibujo.agregar}<span>Elige <strong>«Instalar app»</strong> o <strong>«Agregar a la pantalla principal»</strong>.</span></li><li>${dibujo.listo}<span>Confirma. Aparece el ícono de PamPlanea.</span></li></ol>`;
        else pasos = `<p class="txt">En la computadora no hace falta instalarla. En el teléfono, abre el mismo enlace y aquí verás cómo.</p>`;
        return pasos;
    }
    function vistaInstalar() {
        const enFlujo = A.enFlujo;
        const pasos = pasosInstalar();
        return `<section class="ay-card ay-card--prim" aria-labelledby="ay-inst"><h3 class="ay-h3" id="ay-inst">${icon('smartphone', 'ico-s')}Tenla en tu pantalla de inicio</h3>
                <p class="txt">Así la abres como una app, a pantalla completa y sin internet. Es opcional.</p>
                ${pasos}</section>
            ${instalada() ? (enFlujo ? `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayInstalada" data-v="sí" data-fk="ay-inst-seguir">Seguir</button>` : '') : `<div class="ay-acc"><button type="button" class="btn btn--48" data-a="ayInstalada" data-v="sí" data-fk="ay-inst-si">Ya la instalé</button><button type="button" class="btn btn--48" data-a="ayInstalada" data-v="no" data-fk="ay-inst-no">No pude</button></div>
            <button type="button" class="link" data-a="ayInstalada" data-v="no lo intentó" data-fk="ay-inst-saltar">${enFlujo ? 'Ahora no, empezar la prueba' : 'Ahora no'}</button>`}
            ${pieVersion()}`;
    }
    function vistaTarea() {
        const d = datos();
        const t = tareaActual(d);
        if (!t) return vistaInicio();
        const n = setActual(d).length;
        return `<section class="ay-card ay-card--prim" aria-labelledby="ay-i-t"><p class="paso" id="ay-i-t">Tarea ${d.prueba.i + 1} de ${n}${t.comprension ? ' · la última' : ''}</p>
            <p class="ay-tarea ay-tarea--grande">${esc(t.tarea)}</p>
            <p class="fila-s">${t.comprension ? 'Solo mira. Después te hacemos tres preguntas.' : 'Hazlo como lo harías tú y di en voz alta lo que piensas. Arriba tendrás «Listo» y «No pude».'}</p>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayComenzar" data-fk="ay-comenzar">${A.armada ? 'Volver a la tarea' : 'Empezar'}</button></section>
            ${pieVersion()}`;
    }
    function vistaRespuesta() {
        const d = datos();
        const t = tareaActual(d);
        const r = A.borrador || {};
        const op = (n, txt) => `<button type="button" class="ay-nota-n" role="radio" aria-checked="${r.facil === n}" data-a="ayFacil" data-v="${n}" data-fk="ay-facil-${n}"><span class="ay-nota-num">${n}</span><span class="ay-nota-l">${txt}</span></button>`;
        const rr = d.prueba.tareas[t.id] || {};
        return `<section class="ay-card ay-card--prim" aria-labelledby="ay-r-t"><p class="paso">Tarea ${d.prueba.i + 1} de ${setActual(d).length} · ${rr.resultado === 'rendida' ? 'no pasa nada: eso nos ayuda' : '¡gracias!'}</p><h3 class="ay-h3" id="ay-r-t">¿Qué tan fácil fue?</h3>
            <div class="ay-notas-n" role="radiogroup" aria-labelledby="ay-r-t">${op(1, 'Muy difícil')}${op(2, 'Difícil')}${op(3, 'Más o menos')}${op(4, 'Fácil')}${op(5, 'Muy fácil')}</div>
            ${A.errorFacil ? `<p class="campo-error">${icon('triangle-alert')}<span>Elige un número del 1 al 5</span></p>` : ''}
            <div class="campo-g"><label class="campo-l" for="ay-confuso">¿Qué te confundió? <span class="opcional">(opcional, una línea)</span></label><div class="campo"><input id="ay-confuso" data-ay="confuso" type="text" autocomplete="off" maxlength="200" value="${esc(r.confuso || '')}" placeholder="Una palabra, un número, dónde tocar…"></div></div>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayResponder" data-fk="ay-responder">Siguiente</button></section>`;
    }
    function vistaComprension() {
        const f = datos().prueba.final || {};
        const campo = (id, label) => `<div class="campo-g"><label class="campo-l" for="ay-f-${id}">${label}</label><textarea id="ay-f-${id}" class="ay-textarea" data-ay="final-${id}" rows="2">${esc(f[id] || '')}</textarea></div>`;
        return `<p class="paso">La última · con tus palabras</p>
            ${campo('numero', '¿Qué significa el número grande de Hoy?')}
            ${campo('sirve', '¿Para qué crees que sirve esta app?')}
            ${campo('usarias', '¿La usarías? ¿Qué te haría dejarla?')}
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayFinal" data-fk="ay-final">Terminar</button>`;
    }
    function vistaFin() {
        return `<div class="ay-gracias"><p class="ay-bien-t">¡Gracias! Terminaste la prueba.</p><p class="txt">Manda este resumen a quien te invitó a probar la app: toca «Compartir» y elige WhatsApp.</p></div>
            <section class="ay-card" aria-labelledby="ay-res">${'<h3 class="ay-h3" id="ay-res">' + icon('receipt-text', 'ico-s') + 'Tu resumen</h3>'}${compartirHtml(A.texto || armarResumen())}</section>
            <button type="button" class="btn btn--48 btn--full" data-a="ayCerrar" data-fk="ay-fin-cerrar">Seguir mirando la app</button>
            ${pieVersion()}`;
    }
    function vistaModerador() {
        const d = datos();
        const p = d.prueba;
        const disp = dispositivo();
        const s = setActual(d);
        const estado = p.estado === 'activa' ? `Set ${p.set} · tarea ${p.i + 1} de ${s.length}` : p.estado === 'fin' ? `Set ${p.set} · terminó` : 'Sin prueba en curso';
        const base = location.href.split(/[?#]/)[0].replace(/telefono\.html$/, '');
        return `<section class="ay-card ay-card--prim" aria-labelledby="ay-m-t"><h3 class="ay-h3" id="ay-m-t">${icon('users', 'ico-s')}Persona actual</h3>
                <p class="txt"><strong>${esc(d.nombre || '(sin nombre)')}</strong> · ${esc(estado)}${p.origen ? ` · set ${p.origen === 'enlace' ? 'por el enlace' : p.origen === 'moderador' ? 'elegido por ti' : 'alternado'}` : ''}</p>
                <p class="campo-l">Cambiar de set</p>
                <div class="ay-acc">${['A', 'B'].map((x) => `<button type="button" class="btn btn--48${p.set === x ? ' btn--prim' : ''}" data-a="ayCambiarSet" data-v="${x}" data-fk="ay-set-${x}" aria-pressed="${p.set === x}">Set ${x}</button>`).join('')}</div>
                <p class="fila-s">${p.estado === 'activa' ? 'Cambiar de set empieza ese set desde la tarea 1 (se conservan nombre y perfil).' : `La próxima persona en este teléfono hará el set ${disp.setSiguiente || (disp.personas % 2 === 0 ? 'A' : 'B')}.`}</p></section>
            <section class="ay-card" aria-labelledby="ay-m-r"><h3 class="ay-h3" id="ay-m-r">${icon('receipt-text', 'ico-s')}Resumen</h3>${compartirHtml(armarResumen(), 'ay-texto')}</section>
            <section class="ay-card" aria-labelledby="ay-m-n"><h3 class="ay-h3" id="ay-m-n">${icon('rotate-ccw', 'ico-s')}Nueva persona</h3>
                ${A.confirmar === 'nueva' ? `<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<div><p><strong>¿Ya enviaste el resumen de ${esc(d.nombre || 'esta persona')}?</strong> Se borran su estado, sus respuestas y sus notas.</p><div class="ay-acc"><button type="button" class="btn" data-a="ayNueva" data-v="no" data-fk="ay-nueva-no">Todavía no</button><button type="button" class="btn btn--peligro" data-a="ayNueva" data-v="si" data-fk="ay-nueva-si">Sí, ya lo envié</button></div></div></div>` : `<button type="button" class="btn btn--48 btn--full btn--reiniciar" data-a="ayNueva" data-v="pregunta" data-fk="ay-nueva">Nueva persona</button>`}
                <p class="fila-s">Para repartir sets entre teléfonos distintos, manda enlaces alternados: <span class="ay-enlace">${esc(base)}?set=A</span> y <span class="ay-enlace">${esc(base)}?set=B</span>.</p></section>
            <button type="button" class="link" data-a="ayIr" data-v="inicio" data-fk="ay-m-volver">${icon('chevron-left', 'ico-s')}Volver a Casos y ayuda</button>
            ${pieVersion()}`;
    }
    const notaDe = () => (P.caso ? P.caso.id : 'general');
    function vistaInicio() {
        const d = datos();
        const p = d.prueba;
        const caso = P.caso;
        const sims = (caso && caso.sims) || [];
        const prueba =
            p.estado === 'activa'
                ? `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t"><h3 class="ay-h3" id="ay-g-t">${icon('list-checks', 'ico-s')}Prueba · set ${p.set} · tarea ${p.i + 1} de ${setActual(d).length}</h3><p class="ay-tarea">${esc(tareaActual(d).tarea)}</p>
                   <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayTarea" data-fk="ay-g-ver">Ver la tarea</button><button type="button" class="link" data-a="aySalirPrueba" data-fk="ay-g-salir">Pausar la prueba</button></section>`
                : p.estado === 'fin'
                  ? `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t"><h3 class="ay-h3" id="ay-g-t">${icon('circle-check', 'ico-s')}Terminaste la prueba</h3><button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayIr" data-v="fin" data-fk="ay-g-res">Ver y enviar mi resumen</button></section>`
                  : `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t"><h3 class="ay-h3" id="ay-g-t">${icon('list-checks', 'ico-s')}Prueba guiada</h3><p class="txt">Unas 7 tareas cortas, una a la vez, unos 15 minutos.</p><button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayIr" data-v="bienvenida" data-fk="ay-g-empezar">${p.set ? 'Seguir con la prueba' : 'Empezar la prueba'}</button></section>`;
        const instalar = instalada() ? '' : `<section class="ay-card" aria-labelledby="ay-i-t2"><h3 class="ay-h3" id="ay-i-t2">${icon('smartphone', 'ico-s')}Instalar en tu teléfono</h3><p class="txt">Ábrela como una app, a pantalla completa y sin internet.</p><button type="button" class="btn btn--48 btn--full" data-a="ayIr" data-v="instalar" data-fk="ay-i-ver">Ver cómo</button></section>`;
        const pasos = caso && p.estado !== 'activa' ? `<details class="ay-pasos"><summary>Pasos de este caso</summary><ol>${caso.pasos.map((x) => `<li>${esc(x.t)}</li>`).join('')}</ol><p class="fila-s"><strong>Resultado esperado:</strong> ${esc(caso.esperado)}</p></details>` : '';
        const actual = `<section class="ay-card" aria-labelledby="ay-c-t"><h3 class="ay-h3" id="ay-c-t">${caso ? `${esc(caso.id)} · ${esc(caso.titulo)}` : `Explorando con ${esc(P.st.nombre || 'Ana')}`}</h3>
            <p class="txt">${caso ? esc(caso.para) : 'Sin pasos: toca lo que quieras. Todo cambia los números de verdad.'}</p>${pasos}
            ${sims.length ? `<div class="ay-sims">${sims.map((s) => `<button type="button" class="btn btn--48 btn--full ay-sim" data-a="aySimular" data-v="${s.id}" data-fk="ay-sim-${s.id}">${icon('fast-forward', 'ico-s')}${esc(s.t)}</button>`).join('')}</div>` : ''}</section>`;
        const notas = `<section class="ay-card" aria-labelledby="ay-n-t"><h3 class="ay-h3" id="ay-n-t">${icon('square-pen', 'ico-s')}Mis notas</h3>
            <div class="campo-g"><label class="campo-l" for="ay-nombre">Tu nombre</label><div class="campo"><input id="ay-nombre" data-ay="nombre" type="text" autocomplete="off" autocapitalize="words" value="${esc(d.nombre)}" placeholder="Ej. Sofía"></div></div>
            <div class="campo-g"><label class="campo-l" for="ay-nota">${caso ? `Notas de ${esc(caso.id)}` : 'Notas generales'}</label><textarea id="ay-nota" class="ay-textarea" data-ay="nota" rows="3" placeholder="Qué entendiste, dónde dudaste, qué te gustó…">${esc(d.notas[notaDe()] || '')}</textarea></div>
            <button type="button" class="btn btn--48 btn--full" data-a="ayArmar" data-fk="ay-armar">${icon('receipt-text', 'ico-s')}Armar texto para enviar</button>
            ${A.texto && A.panel === 'inicio' ? compartirHtml(A.texto) : ''}</section>`;
        const lista = `<section class="ay-card" aria-labelledby="ay-l-t"><h3 class="ay-h3" id="ay-l-t">Elegir un caso</h3>${p.estado === 'activa' ? '<p class="fila-s">Elegir un caso pausa la prueba.</p>' : ''}
            <ul class="ay-casos">${CASOS.map((c) => `<li><button type="button" class="ay-caso" data-a="ayCaso" data-v="${c.id}" aria-current="${caso && caso.id === c.id ? 'true' : 'false'}" data-fk="ay-caso-${c.id}"><span class="ay-caso-cod">${c.id}</span><span class="ay-caso-t">${esc(c.titulo)}</span>${(d.notas[c.id] || '').trim() ? `<span class="ay-caso-ok">${icon('check', 'ico-xs')}<span class="sr-only">con notas</span></span>` : ''}</button></li>`).join('')}</ul>
            <p class="campo-l">Explorar libre</p><div class="ay-acc"><button type="button" class="btn btn--48" data-a="ayPersona" data-v="ana" data-fk="ay-ana">Ana · quincenal</button><button type="button" class="btn btn--48" data-a="ayPersona" data-v="carlos" data-fk="ay-carlos">Carlos · semanal</button><button type="button" class="btn btn--48" data-a="ayPersona" data-v="rosa" data-fk="ay-rosa">Rosa · ventas</button></div></section>`;
        const apariencia = vistaApariencia();
        const e = P.modos ? P.modos.entrenamiento() : { practicas: {} };
        const aprender = `<section class="ay-card ay-card--prim" aria-labelledby="ay-ap-t"><h3 class="ay-h3" id="ay-ap-t">${icon('book-open', 'ico-s')}Modo entrenamiento</h3><p class="txt">Datos de ejemplo (Ana, Carlos y Rosa): practica sin miedo, nada toca tus datos.</p>
            <div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayIr" data-v="practica" data-fk="ay-practica">${icon('list-checks', 'ico-s')}Practicar con ejemplos${Object.keys(e.practicas || {}).length ? ` · ${(window.PRACTICA || []).filter((x) => (e.practicas || {})[x.id]).length} de ${(window.PRACTICA || []).length}` : ''}</button><button type="button" class="btn btn--48 btn--full" data-a="modoCambiar" data-v="tour" data-fk="ay-tour">${icon('play', 'ico-s')}Ver el recorrido de 4 minutos</button><button type="button" class="btn btn--48 btn--full" data-a="modoCambiar" data-v="uso" data-fk="ay-usar">${icon('smartphone', 'ico-s')}Usarla con mis datos</button></div></section>`;
        const datosHtml = `<section class="ay-card" aria-labelledby="ay-d-t"><h3 class="ay-h3" id="ay-d-t">${icon('rotate-ccw', 'ico-s')}Datos</h3>
            <button type="button" class="btn btn--48 btn--full btn--reiniciar" data-a="ayReiniciar" data-fk="ay-reiniciar">${icon('rotate-ccw', 'ico-s')}Reiniciar ejemplos</button>
            <p class="fila-s">Vuelve ${caso ? 'este caso' : 'los ejemplos'} al inicio. Solo el entrenamiento: tus datos reales no se tocan.</p>
            ${A.confirmar === 'borrar' ? `<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<div><p><strong>¿Borrar todo?</strong> Se borran tus notas, tus respuestas y lo que hiciste en la app.</p><div class="ay-acc"><button type="button" class="btn" data-a="ayBorrar" data-v="no" data-fk="ay-borrar-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="ayBorrar" data-v="si" data-fk="ay-borrar-si">Sí, borrar todo</button></div></div></div>` : `<button type="button" class="link link--peligro" data-a="ayBorrar" data-v="pregunta" data-fk="ay-borrar">${icon('trash-2', 'ico-s')}Borrar todo, también mis notas</button>`}
            ${P.almacen.disponible ? '' : '<p class="fila-s">Este navegador no deja guardar: lo que hagas se pierde al cerrar.</p>'}
            <a class="link" href="index.html?guia=1">${icon('eye', 'ico-s')}Ver la guía completa (para computadora)</a></section>`;
        const paraVictor = `<details class="ay-card ay-victor"${p.estado === 'activa' || p.estado === 'fin' ? ' open' : ''}><summary class="ay-h3">${icon('users', 'ico-s')}Para Victor: prueba guiada (sets A y B)</summary>${prueba}<button type="button" class="ay-moderador" data-a="ayIr" data-v="moderador" data-fk="ay-moderador">Modo moderador</button></details>`;
        return `${p.estado === 'activa' ? prueba : ''}${aprender}${instalar}${actual}${notas}${lista}${apariencia}${datosHtml}${p.estado === 'activa' ? '' : paraVictor}${pieVersion()}`;
    }
    function vistaApariencia() {
        const temas = [['serena-claro', 'Serena claro'], ['serena-oscuro', 'Serena oscuro'], ['ancla-claro', 'Ancla claro'], ['ancla-oscuro', 'Ancla oscuro']];
        return `<section class="ay-card" aria-labelledby="ay-t-t"><h3 class="ay-h3" id="ay-t-t">${icon('palette', 'ico-s')}Apariencia</h3><div class="chips" role="group" aria-labelledby="ay-t-t">${temas.map(([v, t]) => `<button type="button" class="chip" aria-pressed="${P.tema === v}" data-a="ayTema" data-v="${v}" data-fk="ay-tema-${v}">${P.tema === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('')}</div></section>`;
    }
    const TITULOS = { inicio: 'Casos y ayuda', bienvenida: 'Prueba de PamPlanea', instalar: 'Instalar la app', tarea: 'Tu tarea', respuesta: 'Cuéntanos', comprension: '¿Qué entendiste?', fin: '¡Gracias!', moderador: 'Modo moderador' };
    const VISTAS = { inicio: vistaInicio, bienvenida: vistaBienvenida, instalar: vistaInstalar, tarea: vistaTarea, respuesta: vistaRespuesta, comprension: vistaComprension, fin: vistaFin, moderador: vistaModerador };
    function pintar({ foco = null } = {}) {
        const capa = $('#capa-ayuda');
        if (!A.abierto) {
            capa.innerHTML = '';
            capa.dataset.panel = '';
            return;
        }
        const scroll = capa.querySelector('.ay-c') ? capa.querySelector('.ay-c').scrollTop : 0;
        const nueva = capa.dataset.panel !== A.panel;
        // La comprensión deja ver Hoy arriba: la hoja ocupa solo la mitad de abajo.
        const mitad = A.panel === 'comprension';
        const sinCerrar = ['respuesta', 'comprension'].includes(A.panel);
        capa.innerHTML = `<section class="ay${mitad ? ' ay--mitad' : ''}" role="dialog" aria-modal="true" aria-labelledby="ay-t"><header class="ay-h"><h2 class="ay-t" id="ay-t" tabindex="-1">${TITULOS[A.panel]}</h2>${sinCerrar ? '' : `<button type="button" class="hoja-x" data-a="ayCerrar" aria-label="Cerrar" data-fk="ay-x">${icon('x')}</button>`}</header><div class="ay-c">${VISTAS[A.panel]()}</div></section>`;
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
    function abrirPanel(panel = 'inicio', { enFlujo = false } = {}) {
        if (!A.abierto) A.disparador = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk || null : null;
        A.abierto = true;
        A.panel = panel;
        A.enFlujo = enFlujo;
        // El aviso «Guardado · Deshacer» no se queda encima de las preguntas.
        if (P.ui.toast) {
            P.ui.toast = null;
            P.renderToast();
        }
        if (panel !== 'inicio' && panel !== 'moderador') A.confirmar = null;
        bloquear(true);
        pintar();
        P.emitir('ayuda:' + panel);
    }
    function cerrar({ foco = true } = {}) {
        if (!A.abierto) return;
        A.abierto = false;
        A.confirmar = null;
        pintar();
        bloquear(false);
        if (foco) {
            const el = (A.disparador && document.querySelector(`[data-fk="${CSS.escape(A.disparador)}"]`)) || $('#btn-ayuda') || document.querySelector('#pantalla h1');
            if (el) el.focus({ preventScroll: true });
        }
    }
    Object.assign(A, {
        abrir: abrirPanel,
        cerrar,
        pintarBarra,
        datos,
        pintar,
        compartirHtml: (t) => compartirHtml(t),
        pasosInstalar,
        vistaApariencia,
        registrar(id, titulo, vista) {
            TITULOS[id] = titulo;
            VISTAS[id] = vista;
        },
        /** Al pasar a «Usarla con mis datos»: la prueba A/B (si había) queda en pausa. */
        salirDePrueba() {
            const d = datos();
            if (d.prueba.estado === 'activa') {
                d.prueba.estado = 'libre';
                guardar(d);
            }
            A.armada = false;
            pintarBarra();
        },
    });

    // ------------------------------------------------------------------ acciones
    const acc = P.acciones;
    acc.abrirAyuda = () => abrirPanel(P.modo === 'uso' ? 'ayudaUso' : 'inicio');
    // Cerrar la tarea sin tocar «Empezar» también la empieza (si no, no correría el tiempo).
    acc.ayCerrar = () => (A.panel === 'tarea' && !A.armada ? comenzarTarea() : cerrar());
    acc.ayIr = (d) => {
        if (d.v === 'fin') A.texto = armarResumen();
        if (d.v === 'bienvenida') {
            const x = datos();
            // Una prueba pausada sigue donde iba; si no, bienvenida.
            if (x.prueba.set && x.prueba.estado === 'libre') {
                x.prueba.estado = 'activa';
                guardar(x);
                iniciarTarea(x.prueba.i);
                return;
            }
            A.nombreTester = x.nombre;
        }
        A.enFlujo = false;
        abrirPanel(d.v);
    };
    acc.ayPerfil = (d) => {
        A.perfil = { ...(A.perfil || {}), [d.campo]: (A.perfil || {})[d.campo] === d.v ? undefined : d.v };
        pintar({ foco: `[data-fk="ay-p-${d.campo}-${d.v}"]` });
    };
    acc.ayEmpezarPrueba = () => empezarPrueba();
    acc.ayExplorar = () => {
        const d = datos();
        d.prueba.estado = d.prueba.estado || 'libre';
        guardar(d);
        cerrar();
    };
    acc.ayInstalar = async () => {
        if (!promptInstalar) return;
        promptInstalar.prompt();
        const r = await promptInstalar.userChoice.catch(() => ({ outcome: 'dismissed' }));
        promptInstalar = null;
        marcarInstalada(r.outcome === 'accepted' ? 'sí' : 'no');
        if (r.outcome === 'accepted' && A.enFlujo) return seguirTrasInstalar();
        pintar();
    };
    function seguirTrasInstalar() {
        A.enFlujo = false;
        iniciarTarea(0);
    }
    acc.ayInstalada = (d) => {
        marcarInstalada(d.v);
        P.emitir('instalar:' + d.v);
        if (A.enFlujo) return seguirTrasInstalar();
        cerrar();
    };
    acc.ayCopiarEnlace = () => {
        navigator.clipboard.writeText(location.href.split('#')[0]).then(() => {
            const el = $('#ay-enlace-ok');
            if (el) el.textContent = '✓ Copiado. Ábrelo en Safari.';
        });
    };
    acc.ayTarea = () => abrirPanel('tarea');
    acc.ayComenzar = () => {
        if (A.armada) {
            cerrar({ foco: false });
            return;
        }
        comenzarTarea();
    };
    acc.ayTerminar = (d) => terminarTarea(d.v === 'rendida' ? 'rendida' : 'listo');
    acc.ayFacil = (d) => {
        A.borrador = { ...(A.borrador || {}), facil: Number(d.v) };
        A.errorFacil = false;
        pintar({ foco: `[data-fk="ay-facil-${d.v}"]` });
    };
    acc.ayResponder = () => {
        const b = A.borrador || {};
        if (!b.facil) {
            A.errorFacil = true;
            pintar({ foco: '[data-fk="ay-facil-1"]' });
            return;
        }
        const d = datos();
        const t = tareaActual(d);
        Object.assign(registro(d, t), { facil: b.facil, confuso: (b.confuso || '').trim() });
        guardar(d);
        A.borrador = null;
        P.emitir('prueba:respuesta:' + t.id);
        siguienteTarea();
    };
    acc.ayResponderFinal = () => {
        const d = datos();
        const t = tareaActual(d);
        const r = registro(d, t);
        r.fin = Date.now();
        guardar(d);
        abrirPanel('comprension');
    };
    acc.ayFinal = () => terminarPrueba();
    acc.aySalirPrueba = () => {
        const d = datos();
        d.prueba.estado = 'libre';
        guardar(d);
        A.armada = false;
        pintarBarra();
        pintar({ foco: '#ay-t' });
        P.emitir('prueba:pausa');
    };
    acc.ayCambiarSet = (d) => {
        const x = datos();
        if (x.prueba.estado === 'activa' || x.prueba.estado === 'libre') {
            x.prueba = { ...x.prueba, set: d.v, origen: 'moderador', i: 0, tareas: {}, final: {}, estado: 'activa' };
            guardar(x);
            P.emitir('moderador:set:' + d.v);
            iniciarTarea(0);
            return;
        }
        // Sin prueba en curso: el set queda para la próxima persona en este teléfono.
        P.almacen.escribir(CLAVE_DISP, { ...dispositivo(), setSiguiente: d.v });
        pintar({ foco: `[data-fk="ay-set-${d.v}"]` });
    };
    acc.ayNueva = (d) => {
        if (d.v === 'pregunta' || d.v === 'no') {
            A.confirmar = d.v === 'pregunta' ? 'nueva' : null;
            pintar({ foco: d.v === 'pregunta' ? '[data-fk="ay-nueva-no"]' : '[data-fk="ay-nueva"]' });
            return;
        }
        P.almacen.borrar(CLAVE);
        P.borrarGuardado();
        A.texto = '';
        A.perfil = {};
        A.nombreTester = '';
        A.armada = false;
        A.confirmar = null;
        P.cargarPersona('ana');
        pintarBarra();
        P.emitir('moderador:nueva');
        abrirPanel('bienvenida');
    };
    acc.aySimular = (d) => {
        cerrar({ foco: false });
        P.simular(d.v);
    };
    function pausarSiHayPrueba() {
        const d = datos();
        if (d.prueba.estado === 'activa') {
            d.prueba.estado = 'libre';
            guardar(d);
            A.armada = false;
        }
    }
    acc.ayCaso = (d) => {
        pausarSiHayPrueba();
        cerrar({ foco: false });
        P.cargarCaso(d.v);
        pintarBarra();
    };
    acc.ayPersona = (d) => {
        pausarSiHayPrueba();
        cerrar({ foco: false });
        P.cargarPersona(d.v);
        pintarBarra();
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
            A.confirmar = d.v === 'pregunta' ? 'borrar' : null;
            pintar({ foco: d.v === 'pregunta' ? '[data-fk="ay-borrar-no"]' : '[data-fk="ay-borrar"]' });
            return;
        }
        P.almacen.borrar(CLAVE);
        P.borrarGuardado();
        A.texto = '';
        A.armada = false;
        cerrar({ foco: false });
        pintarBarra();
        P.cargarPersona('ana');
        P.avisar('Borramos todo', { check: false });
    };
    acc.ayArmar = () => {
        A.texto = armarResumen();
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
    const textoActual = () => ($('#ay-texto') ? $('#ay-texto').value : A.texto || armarResumen());
    acc.ayCopiar = () => {
        const aviso = $('#ay-copiado');
        navigator.clipboard.writeText(textoActual()).then(
            () => aviso && (aviso.textContent = '✓ Copiado. Pégalo en WhatsApp.'),
            () => aviso && (aviso.textContent = 'No se pudo copiar: mantén presionado el texto y elige «Copiar».'),
        );
    };
    acc.ayCompartir = () => {
        navigator.share({ title: 'PamPlanea · resultado de la prueba', text: textoActual() }).then(
            () => {
                const d = datos();
                d.prueba.enviado = true;
                guardar(d);
            },
            () => {
                /* la persona canceló */
            },
        );
    };

    // Campos del panel: se guardan al escribir.
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (!el.dataset || !el.dataset.ay) return;
        const campo = el.dataset.ay;
        if (campo === 'confuso') {
            A.borrador = { ...(A.borrador || {}), confuso: el.value };
            return;
        }
        if (campo === 'nombreTester') {
            A.nombreTester = el.value;
            return;
        }
        const d = datos();
        if (campo === 'nombre') d.nombre = el.value;
        if (campo === 'nota') d.notas[notaDe()] = el.value;
        if (campo.startsWith('final-')) d.prueba.final = { ...(d.prueba.final || {}), [campo.slice(6)]: el.value };
        guardar(d);
    });
    // Foco atrapado en el panel y Escape para cerrarlo (salvo las preguntas obligatorias).
    document.addEventListener(
        'keydown',
        (e) => {
            if (!A.abierto) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (!['respuesta', 'comprension'].includes(A.panel)) acc.ayCerrar();
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

    // ------------------------------------------------------------------ versión nueva (service worker, solo servido por http/https)
    function avisoVersion(sw) {
        let el = $('#actualizar');
        if (!el) {
            el = document.createElement('div');
            el.id = 'actualizar';
            el.className = 'actualizar';
            el.setAttribute('role', 'status');
            document.getElementById('app').appendChild(el);
        }
        el.innerHTML = `<span>${icon('refresh-cw', 'ico-s')}Hay una versión nueva</span><button type="button" class="actualizar-b" data-fk="actualizar">Actualizar</button>`;
        el.querySelector('button').addEventListener('click', () => {
            if (P.guardarYa) P.guardarYa();
            A.quiereActualizar = true;
            sw.postMessage({ tipo: 'saltar' });
        });
    }
    function registrarSW() {
        if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
        let recargando = false;
        // Solo se recarga cuando la persona tocó «Actualizar» (la primera instalación no recarga nada).
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (recargando || !A.quiereActualizar) return;
            recargando = true;
            location.reload();
        });
        navigator.serviceWorker.register('sw.js').then((reg) => {
            const revisar = () => {
                if (reg.waiting && navigator.serviceWorker.controller) avisoVersion(reg.waiting);
            };
            revisar();
            reg.addEventListener('updatefound', () => {
                const nuevo = reg.installing;
                if (nuevo) nuevo.addEventListener('statechange', () => nuevo.state === 'installed' && revisar());
            });
            document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
            P.swListo = true;
        }, () => {
            /* sin service worker: todo sigue funcionando en línea */
        });
    }

    // El modo se fija antes del primer dibujo para no ver el marco simulado un instante.
    prepararModo();
    A.iniciar = function () {
        // La franja la pinta modos.js según el modo; esto queda solo por si ese módulo faltara.
        const aviso = P.modos ? null : $('#aviso-proto');
        if (aviso) aviso.innerHTML = `<span class="aviso-proto-t">${icon('info', 'ico-xs')}<span><span class="nw">Prototipo de prueba ·</span> <span class="nw">no pongas tus datos reales</span></span></span>${P.enGuia ? '' : `<button type="button" class="aviso-proto-b" id="btn-ayuda" data-a="abrirAyuda" data-fk="btn-ayuda" aria-haspopup="dialog">Casos y ayuda</button>`}`;
        P.colorBarra();
        const d = datos();
        if (instalada() && d.prueba.estado && !d.prueba.instalada) marcarInstalada('sí');
        A.nombreTester = d.nombre;
        pintarBarra();
        if (!P.enGuia) {
            // Si había una tarea de la prueba A/B a medias (modo entrenamiento), se retoma.
            if (d.prueba.estado === 'activa' && P.modo !== 'uso') {
                const t = tareaActual(d);
                const r = t && d.prueba.tareas[t.id];
                if (r && r.resultado && !r.facil) {
                    A.borrador = { facil: null, confuso: '' };
                    abrirPanel('respuesta');
                } else if (r && r.inicio && !r.resultado) A.armada = true;
                else abrirPanel('tarea');
                pintarBarra();
            }
        }
        registrarSW();
        A.listo = true;
    };
})();
