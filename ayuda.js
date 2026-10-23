// Producto v2.1 · prototipo. Para probar en el teléfono de otras personas: pantalla completa con
// safe areas y teclado reales, aviso fijo de prototipo, «Ayuda», la PRUEBA GUIADA PARA TESTERS
// (bienvenida con perfil, set A o B alternado, una tarea a la vez sin decir dónde tocar, registro de
// tiempo, toques y pantallas, comprensión final), el modo moderador, la guía de instalación y el aviso
// de versión nueva (PWA). Todo se guarda en este navegador (o en memoria si no se puede).
// v2.6 (V2-60, V2-61): la persona ve en «Ayuda» solo tres caminos (usarla con sus datos, aprender a usarla y
// la prueba guiada, que nunca dice «set A» ni «set B»), «Cuéntale a Victor o a Pam cómo vas», «Tus datos»,
// la apariencia y la versión. Los casos, explorar, las notas, reiniciar los ejemplos, los sets y el
// moderador quedan para Victor, con el enlace ?victor=1.
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
        // v2.6: el set B tiene una tarea menos (V2-63); quien iba en la última sigue en la última.
        const s = d.prueba.set && SETS[d.prueba.set];
        if (s && d.prueba.i >= s.length) d.prueba.i = s.length - 1;
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
    /** v2.6 (V2-60): las herramientas de Victor (casos, explorar, notas, reiniciar los ejemplos, sets y moderador) solo con ?victor=1. */
    const victor = /[?&]victor=1\b/.test(location.search);
    P.victor = victor;

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
    /**
     * v2.6.1 (V2-74): `navigator.storage.persist()`. Chrome lo decide solo (uso del sitio, instalada); Safari, sobre
     * todo si está instalada en la pantalla de inicio. No muestra nada si no se concede. Firefox sí pregunta.
     */
    A.persistente = null;
    A.pedirPersistencia = async () => {
        try {
            if (!navigator.storage || !navigator.storage.persist) return (A.persistente = null);
            A.persistente = (await navigator.storage.persisted()) || (await navigator.storage.persist());
        } catch {
            A.persistente = null;
        }
        P.emitir('datos:persistente:' + A.persistente);
        return A.persistente;
    };
    A.instalada = () => instalada();
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
        // Que el campo enfocado (Anotar, montos) no quede debajo del teclado. v2.7 (A): con su pregunta y su mensaje
        // («No entendí…», el error), que van justo debajo.
        const aLaVista = (el) => (el.closest('.campo-g') || el).scrollIntoView({ block: 'nearest' });
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (!el.matches || !el.matches('input, textarea')) return;
            root.classList.add('escribiendo');
            setTimeout(() => {
                ajustar();
                aLaVista(el);
            }, 320);
        });
        // v2.7 (A): si al escribir aparece un mensaje debajo del campo, también se ve.
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (el.matches && el.matches('.campo--monto input') && document.activeElement === el) requestAnimationFrame(() => aLaVista(el));
        });
        document.addEventListener('focusout', (e) => {
            if (e.target.matches && e.target.matches('input, textarea')) setTimeout(() => !document.activeElement?.matches?.('input, textarea') && root.classList.remove('escribiendo'), 50);
        });
    }
    /** La barra de estado (Android) toma el color del aviso de arriba, en claro y oscuro. */
    P.colorBarra = function () {
        const aviso = $('#aviso-proto');
        if (!aviso) return;
        // v2.6.1 (V2-74): en hexadecimal (color-mix da «color(srgb …)», que la barra del teléfono puede no entender) y
        // las dos etiquetas (claro y oscuro del teléfono) siguen el tema elegido en la app.
        const c = getComputedStyle(aviso).backgroundColor;
        const m = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(c);
        const v = m ? m.slice(1, 4).map((x) => Number(x) * 255) : (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const hex = v.length === 3 ? '#' + v.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('') : c;
        for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = hex;
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
    /** La prueba usa datos de ejemplo: desde «Usarla con mis datos» primero se pasa al entrenamiento (los datos reales quedan guardados). */
    function aEjemplos() {
        if (P.modo === 'uso' && P.modos) P.modos.aEntrenamiento();
    }
    function empezarPrueba() {
        aEjemplos();
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
        aEjemplos();
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
    const NOMBRES = { hoy: 'Hoy', pagos: 'Mi plan', porConfirmar: 'Por confirmar', variable: 'Ficha de presupuesto', midinero: 'Mi dinero', mes: 'Mes', pago: 'Ficha de pago', tarjeta: 'Ficha de tarjeta', apartado: 'Ficha de ahorro', lugar: 'Ficha de lugar', ingreso: 'Ficha de ingreso', reparte: 'Reparte', aldia: 'Pongámonos al día', logro: 'Meta cumplida', espacio: 'Tu espacio', invitar: 'Invitar', anotar: 'Anotar', desglose: 'Detalle del libre', menu: 'Menú', usar: 'Usar ahorro', pagado: 'Pagado', estadoCuenta: 'Estado de cuenta', ingresoLlego: '¿Cuánto te llegó?', nuevaDeuda: 'Tarjeta o préstamo', nuevoPago: 'Nuevo pago', cuentas: 'Cuentas', ahorros: 'Ahorros', deudas: 'Deudas', atencion: 'Necesitan atención', pagarCon: 'Lo pagas con', reservar: 'Reservar', yaLoUse: '¿Ya lo usaste?', editarRegistro: 'Corregir', pagarYa: '¿Cuánto pagas?', apartar: 'Ahorrar', cuadrar: 'Cuadrar', decidirPago: 'Cuánto voy a pagar' };
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
    const fechaDia = (iso) => {
        try {
            return new Date(iso).toLocaleDateString('es-SV', { dateStyle: 'medium' });
        } catch {
            return String(iso || '').slice(0, 10);
        }
    };
    /**
     * v2.6 (V2-61, V2-62): la prueba guiada dentro de «Cuéntale a Victor o a Pam cómo vas». Sin letra de set (se
     * reconoce por las tareas) y sin notas; lo que la persona escribió pasa por `tapar` (montos y nombres).
     * Cada parte trae la frase de «Esto se manda» que la describe: la lista y el texto salen de aquí mismo.
     */
    A.partesPrueba = (tapar = (t) => t) => {
        const d = datos();
        const p = d.prueba;
        const s = setActual(d);
        if (!s) return [];
        const conResultado = s.some((t) => !t.comprension && p.tareas[t.id] && p.tareas[t.id].resultado);
        if (p.estado !== 'fin' && !conResultado) return [];
        const instalar = { sí: 'la instalé', no: 'no pude', 'no lo intentó': 'no lo intenté' }[p.instalada];
        const lineas = ['', `${p.estado === 'fin' ? `Prueba guiada: la terminé${p.finalizada ? ` el ${fechaDia(p.finalizada)}` : ''}` : `Prueba guiada: la dejé en la tarea ${p.i + 1} de ${s.length}`}${instalar ? ` · instalarla al empezar: ${instalar}` : ''}`];
        s.forEach((t, i) => {
            if (t.comprension) return;
            const r = p.tareas[t.id];
            if (!r || !r.resultado) {
                lineas.push(`${i + 1}. ${t.titulo}: no llegué`);
                return;
            }
            const res = r.resultado === 'rendida' ? 'no pude' : r.detectada ? 'la logré (la app lo detectó)' : 'dije que la terminé (la app no lo detectó)';
            lineas.push(`${i + 1}. ${t.titulo}: ${res} · ${duracion((r.fin || Date.now()) - r.inicio)} · ${r.toques} toques${r.facil ? ` · fácil ${r.facil} de 5` : ''}`);
            if (r.confuso) lineas.push(`   Me confundió: ${tapar(r.confuso)}`);
            if (r.pantallas && r.pantallas.length) lineas.push(`   Pantallas: ${r.pantallas.join(' › ')}`);
        });
        if (p.estado === 'fin') {
            const f = p.final || {};
            const resp = (x) => ((x || '').trim() ? tapar(x.trim()) : '(sin respuesta)');
            lineas.push('Al final, con mis palabras:', `- ¿Qué significa el número grande de Hoy? ${resp(f.numero)}`, `- ¿Para qué sirve esta app? ${resp(f.sirve)}`, `- ¿La usaría? ¿Qué me haría dejarla? ${resp(f.usarias)}`);
        }
        const partes = [{ id: 'prueba', lista: 'De tu prueba guiada: si pudiste instalarla al empezar, cada tarea (si la lograste, el tiempo, los toques, qué tan fácil fue, lo que te confundió y las pantallas que abriste) y tus respuestas del final', lineas }];
        if (PERFIL.some(([c]) => p.perfil[c])) {
            const mio = (campo) => (p.perfil[campo] ? etiquetaPerfil(campo, p.perfil[campo]) : 'no contesté');
            partes.push({ id: 'sobreTi', lista: 'Lo que contestaste en «Sobre ti»: cómo te pagan, dónde tienes tu dinero, si usas tarjeta y cómo llevas tus cuentas', lineas: [`Sobre mí: me pagan ${mio('pago')} · mi dinero: ${mio('dinero')} · tarjeta de crédito: ${mio('tarjeta')} · llevo mis cuentas: ${mio('cuentas')}`] });
        }
        return partes;
    };

    // ------------------------------------------------------------------ paneles
    const chipsPerfil = (perfil) =>
        PERFIL.map(([campo, pregunta, ops]) => `<div class="campo-g" role="group" aria-labelledby="ay-p-${campo}"><p class="campo-l" id="ay-p-${campo}">${pregunta}</p><div class="chips">${ops.map(([v, t]) => `<button type="button" class="chip" aria-pressed="${perfil[campo] === v}" data-a="ayPerfil" data-campo="${campo}" data-v="${v}" data-fk="ay-p-${campo}-${v}">${perfil[campo] === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('')}</div></div>`).join('');
    const pieVersion = () => `<p class="ay-version">${esc(VERSION)} · ${P.modo === 'uso' ? 'Tus datos solo están en este teléfono' : 'Modo entrenamiento: datos de ejemplo'} · Sin rastreadores</p>`;
    const compartirHtml = (texto, id = 'ay-texto') => `<div class="campo-g"><label class="campo-l" for="${id}">Si no se puede compartir, mantén presionado el texto y cópialo</label><textarea id="${id}" class="ay-textarea ay-texto" readonly rows="9">${esc(texto)}</textarea></div>
        <div class="ay-acc">${navigator.share ? `<button type="button" class="btn btn--prim btn--48" data-a="ayCompartir" data-fk="ay-compartir">Compartir</button>` : ''}${navigator.clipboard && window.isSecureContext ? `<button type="button" class="btn btn--48" data-a="ayCopiar" data-fk="ay-copiar">Copiar</button>` : ''}<button type="button" class="btn btn--48" data-a="aySeleccionar" data-fk="ay-sel">Seleccionar todo</button></div><p class="fila-s" id="ay-copiado" aria-live="polite"></p>`;

    /** v2.6 (V2-61): al empezar, dos líneas simples; la app elige el set sola y nunca lo dice. */
    function vistaBienvenida() {
        const perfil = A.perfil || {};
        return `<div class="ay-bienvenida"><p class="ay-bien-l">Te pongo tareas cortas para ver si la app se entiende. <strong>No es un examen para ti: es para la app.</strong></p><p class="txt">Usas datos de ejemplo, no los tuyos. Son unos 15 minutos.</p></div>
            <section class="ay-card" aria-labelledby="ay-quien"><h3 class="ay-h3" id="ay-quien">${icon('users', 'ico-s')}Sobre ti <span class="opcional">(opcional)</span></h3>
                <div class="campo-g"><label class="campo-l" for="ay-nombre-t">Tu nombre o apodo</label><div class="campo"><input id="ay-nombre-t" data-ay="nombreTester" type="text" autocomplete="off" autocapitalize="words" value="${esc(A.nombreTester || '')}" placeholder="Ej. Sofi"></div></div>
                ${chipsPerfil(perfil)}</section>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayEmpezarPrueba" data-fk="ay-empezar-prueba">Empezar</button>
            <button type="button" class="link" data-a="ayExplorar" data-fk="ay-explorar">Ahora no</button>
            ${pieVersion()}`;
    }
    const dibujo = {
        compartir: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><rect x="12" y="18" width="24" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 30V6m-8 8 8-8 8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        agregar: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="7" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 16v16M16 24h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`,
        menu: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="12" r="4" fill="currentColor"/><circle cx="24" cy="24" r="4" fill="currentColor"/><circle cx="24" cy="36" r="4" fill="currentColor"/></svg>`,
        interruptor: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="14" width="36" height="20" rx="10" fill="currentColor"/><circle cx="32" cy="24" r="7" fill="#fff"/></svg>`,
        safari: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="3"/><path d="m31 17-4.5 9.5L17 31l4.5-9.5Z" fill="currentColor"/></svg>`,
        listo: `<svg class="ay-dib" viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="9" fill="#ba1679"/><path d="M18 34V14h7.5c4.2 0 7 2.6 7 6.4S29.7 27 25.5 27H22v7h-4Zm4-10.6h3c1.9 0 3-1 3-2.6s-1.1-2.5-3-2.5h-3v5.1Z" fill="#fff"/></svg>`,
    };
    /**
     * v2.6.1 (V2-74): cómo instalarla, según el teléfono. En iPhone se instala desde Safari: Compartir → «Agregar a
     * pantalla de inicio» (en iOS 26 hay un interruptor «Abrir como app web»: encendido). Desde WhatsApp u otra app,
     * primero se abre en Safari. En iPhone, instalarla es lo que protege los datos: Safari puede borrar los de una página
     * que no se abre en varios días y la app instalada guarda los suyos aparte (no ve lo que se anotó en Safari).
     */
    function pasosInstalar() {
        const conDatos = !!(P.modos && P.modos.tieneDatos && P.modos.tieneDatos());
        let pasos;
        if (instalada()) pasos = `<p class="txt">${icon('circle-check', 'ico-s')} Ya la tienes instalada.</p>`;
        else if (esIOS && !esSafariIOS)
            pasos = `<div class="nota nota--info" role="note">${icon('info')}<p><strong>En iPhone se instala desde Safari.</strong> Ábrela ahí y sigue los pasos.</p></div>
                <ol class="ay-pasos-dib"><li>${dibujo.safari}<span>Si la abriste desde WhatsApp u otra app, busca <strong>«Abrir en Safari»</strong> (a veces está en <strong>⋯</strong>).</span></li><li>${dibujo.compartir}<span>Si no aparece, copia el enlace y pégalo en Safari.</span></li></ol>
                ${navigator.clipboard && window.isSecureContext ? `<button type="button" class="btn btn--48 btn--full" data-a="ayCopiarEnlace" data-fk="ay-copiar-enlace">Copiar el enlace</button><p class="fila-s" id="ay-enlace-ok" aria-live="polite"></p>` : `<p class="txt ay-enlace">${esc(location.href.split('#')[0])}</p>`}`;
        else if (esIOS)
            pasos = `<ol class="ay-pasos-dib"><li>${dibujo.compartir}<span>Toca <strong>Compartir</strong>: el cuadro con la flecha, en la barra de Safari. Si no lo ves, toca <strong>⋯</strong> primero.</span></li><li>${dibujo.agregar}<span>Baja en la lista y toca <strong>«Agregar a pantalla de inicio»</strong>.</span></li><li>${dibujo.interruptor}<span>Si ves <strong>«Abrir como app web»</strong>, déjalo encendido. Toca <strong>«Agregar»</strong>.</span></li><li>${dibujo.listo}<span>Abre PamPlanea desde su ícono en tu pantalla de inicio.</span></li></ol>
                <div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p><strong>Instálala para que tus datos no se borren.</strong> Safari puede borrar los datos de una página que no abres en varios días.</p></div>
                <p class="fila-s">${conDatos ? 'La app instalada guarda tus datos aparte: lo que ya anotaste aquí no pasa solo. Guarda una copia en «Tus datos» y restáurala en la app.' : 'La app instalada guarda tus datos aparte: empieza a usarla desde el ícono, no desde Safari.'}</p>`;
        else if (promptInstalar) pasos = `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayInstalar" data-fk="ay-instalar">${icon('smartphone', 'ico-s')}Instalar</button><p class="fila-s">Aparece en tu pantalla de inicio como cualquier app y abre sin internet.</p>`;
        else if (esAndroid) pasos = `<ol class="ay-pasos-dib"><li>${dibujo.menu}<span>Toca el menú <strong>⋮</strong> de Chrome (arriba a la derecha).</span></li><li>${dibujo.agregar}<span>Elige <strong>«Instalar app»</strong> o <strong>«Agregar a la pantalla principal»</strong>.</span></li><li>${dibujo.listo}<span>Confirma. Aparece el ícono de PamPlanea.</span></li></ol>`;
        else pasos = `<p class="txt">En la computadora no hace falta instalarla. En el teléfono, abre el mismo enlace y aquí verás cómo.</p>`;
        return pasos;
    }
    function vistaInstalar() {
        const enFlujo = A.enFlujo;
        const pasos = pasosInstalar();
        return `<section class="ay-card ay-card--prim" aria-labelledby="ay-inst"><h3 class="ay-h3" id="ay-inst">${icon('smartphone', 'ico-s')}Tenla en tu pantalla de inicio</h3>
                <p class="txt">Así la abres como una app, sin internet y con tus datos más seguros.${enFlujo ? ' Es opcional.' : ''}</p>
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
            ${reiniciarPruebaHtml()}
            ${pieVersion()}`;
    }
    /** v2.6.1 (V2-67): «Empezar de nuevo» la prueba guiada, con confirmación. Solo borra el avance de la prueba. */
    function reiniciarPruebaHtml() {
        if (A.confirmar === 'reiniciarPrueba') {
            return `<div class="nota nota--atencion confirmar" role="alertdialog" aria-labelledby="ay-rp-t">${icon('triangle-alert')}<div><p id="ay-rp-t"><strong>¿Empezar de nuevo?</strong> Se borra tu avance de la prueba. Tus datos no se tocan.</p><div class="ay-acc"><button type="button" class="btn" data-a="ayReiniciarPrueba" data-v="no" data-fk="ay-rp-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="ayReiniciarPrueba" data-v="si" data-fk="ay-rp-si">Sí, empezar de nuevo</button></div></div></div>`;
        }
        return `<button type="button" class="link" data-a="ayReiniciarPrueba" data-v="pregunta" data-fk="ay-rp">${icon('rotate-ccw', 'ico-s')}Empezar de nuevo</button>`;
    }
    function vistaRespuesta() {
        const d = datos();
        const t = tareaActual(d);
        const r = A.borrador || {};
        const op = (n, txt) => `<button type="button" class="ay-nota-n" role="radio" aria-checked="${r.facil === n}" data-a="ayFacil" data-v="${n}" data-fk="ay-facil-${n}"><span class="ay-nota-num">${n}</span><span class="ay-nota-l">${txt}</span>${r.facil === n ? icon('check', 'ico-dia') : ''}</button>`;
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
    /** v2.6 (V2-62): al terminar, la tarjeta «Cuéntale a Victor o a Pam cómo te fue» lleva a esa pantalla (ahí va el resultado). */
    function vistaFin() {
        const tiene = P.modos && P.modos.tieneDatos();
        return `<div class="ay-gracias"><p class="ay-bien-t">¡Gracias! Terminaste la prueba.</p><p class="txt">Lo que hiciste nos ayuda a que la app se entienda mejor.</p></div>
            <section class="ay-card ay-card--prim" aria-labelledby="ay-fin-c"><h3 class="ay-h3" id="ay-fin-c">${icon('receipt-text', 'ico-s')}Cuéntale a Victor o a Pam cómo te fue</h3>
                <p class="txt">Lo que hiciste en la prueba. Tú eliges a quién se lo mandas.</p>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayIr" data-v="contar" data-fk="ay-fin-contar">Ver qué se manda</button></section>
            <button type="button" class="btn btn--48 btn--full" data-a="modoCambiar" data-v="uso" data-fk="ay-fin-usar">${icon('smartphone', 'ico-s')}${tiene ? 'Volver a mis datos' : 'Usarla con mis datos'}</button>
            ${reiniciarPruebaHtml()}
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
            <button type="button" class="link" data-a="ayIr" data-v="inicio" data-fk="ay-m-volver">${icon('chevron-left', 'ico-s')}Volver a Ayuda</button>
            ${pieVersion()}`;
    }
    const notaDe = () => (P.caso ? P.caso.id : 'general');
    /**
     * v2.6 (V2-60): «Ayuda», igual en los dos modos. Tres caminos (el de ahora, marcado), «Cuéntale a Victor o a Pam
     * cómo vas», «Tus datos», la apariencia y la versión. Con ?victor=1, debajo, las herramientas de Victor.
     */
    function vistaInicio() {
        const d = datos();
        const p = d.prueba;
        const enUso = P.modo === 'uso';
        const activa = p.estado === 'activa' && !enUso;
        const s = setActual(d);
        const enCursoCard = activa
            ? `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t"><h3 class="ay-h3" id="ay-g-t">${icon('list-checks', 'ico-s')}Prueba guiada · tarea ${p.i + 1} de ${s.length}</h3><p class="ay-tarea">${esc(tareaActual(d).tarea)}</p>
                   <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayTarea" data-fk="ay-g-ver">Ver la tarea</button><button type="button" class="link" data-a="aySalirPrueba" data-fk="ay-g-salir">Pausar la prueba</button></section>`
            : '';
        const subPrueba = activa ? `Vas en la tarea ${p.i + 1} de ${s.length}` : p.estado === 'fin' ? 'Ya la hiciste: cuéntale a Victor o a Pam cómo te fue' : s && p.estado === 'libre' ? `La dejaste en la tarea ${p.i + 1} de ${s.length}` : 'Tareas cortas para ver si la app se entiende';
        const op = (emoji, titulo, sub, accion, fk, extra = '', actual = false) => `<button type="button" class="opcion-g elegir-op ay-op" data-a="${accion}" data-fk="${fk}" ${extra}${actual ? ' aria-current="true"' : ''}>${P.caja(emoji)}<span class="opcion-g-txt"><span class="opcion-g-t">${titulo}</span><span class="fila-s">${sub}</span></span>${icon(actual ? 'check' : 'chevron-right', 'ico-xs')}</button>`;
        const tres = `<div class="opciones-grandes ay-tres" role="group" aria-label="¿Qué quieres hacer?">
                ${enUso ? op('💰', 'Usarla con mis datos', 'Estás aquí', 'ayCerrar', 'ay-usar', '', true) : op('💰', 'Usarla con mis datos', 'Tu dinero real, solo en este teléfono', 'modoCambiar', 'ay-usar', 'data-v="uso"')}
                ${op('🎓', 'Aprender a usarla', 'Lo esencial y capítulos cortos, con datos de ejemplo', 'ayIr', 'ay-tour', 'data-v="aprendeMas"')}
                ${op('🎯', 'Prueba guiada', subPrueba, 'ayPrueba', 'ay-prueba')}</div>`;
        const fila = (ic, t, sub, v, fk) => `<li class="fila"><button type="button" class="fila-main" data-a="ayIr" data-v="${v}" data-fk="${fk}"><span class="emo emo--ico" aria-hidden="true">${icon(ic)}</span><span class="fila-txt"><span class="fila-t">${t}</span><span class="fila-s">${sub}</span></span>${icon('chevron-right', 'ico-xs')}</button></li>`;
        // V2-69 (#38): «Instalar la app» es su propia fila, solo si todavía no está instalada.
        const completar = enUso && P.st && P.st.configurado ? `<li class="fila"><button type="button" class="fila-main" data-a="obCompletar" data-fk="au-completar"><span class="emo emo--ico" aria-hidden="true">${icon('list-checks')}</span><span class="fila-txt"><span class="fila-t">Completar tu Primer día</span><span class="fila-s">Deudas, tarjetas y gastos fijos</span></span>${icon('chevron-right', 'ico-xs')}</button></li>` : '';
        const mas = `<ul class="lista card ay-lista">${instalada() || P.enGuia ? '' : fila('circle-plus', 'Instalar la app', 'Para que tus datos no se borren', 'instalar', 'au-instalar')}${completar}${fila('receipt-text', 'Cuéntale a Victor o a Pam cómo vas', 'Qué se manda y qué no', 'contar', 'au-contar')}${fila('rotate-ccw', 'Tus datos', 'Guardar una copia o recuperar tus datos', 'datos', 'au-datos')}</ul>`;
        const donde = `<p class="txt">${enUso ? 'Estás usando tus datos: se guardan solo en este teléfono.' : 'Estás en modo entrenamiento: datos de ejemplo.'}</p>`;
        return `${enCursoCard}${donde}${tres}${mas}${vistaApariencia()}${victor ? herramientasVictor() : ''}${pieVersion()}`;
    }
    /** v2.6 (V2-60): las herramientas de Victor (solo con ?victor=1). Usan los ejemplos: con tus datos, primero se pasa a ellos. */
    function herramientasVictor() {
        if (P.modo === 'uso') {
            return `<section class="ay-card ay-victor-h" aria-labelledby="ay-v-t"><h3 class="ay-h3" id="ay-v-t">${icon('users', 'ico-s')}Herramientas de Victor</h3><p class="txt">Los casos, los sets y el moderador usan los ejemplos. Tus datos quedan guardados.</p><button type="button" class="btn btn--48 btn--full" data-a="modoCambiar" data-v="entrenamiento" data-fk="ay-v-ejemplos">Ir a los ejemplos</button></section>`;
        }
        const d = datos();
        const p = d.prueba;
        const caso = P.caso;
        const sims = (caso && caso.sims) || [];
        const prueba =
            p.estado === 'fin'
                ? `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t2"><h3 class="ay-h3" id="ay-g-t2">${icon('circle-check', 'ico-s')}Set ${p.set} · terminó</h3><button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayIr" data-v="fin" data-fk="ay-g-res">Ver el final de la prueba</button></section>`
                : p.estado === 'activa'
                  ? `<p class="fila-s">Set ${p.set} · tarea ${p.i + 1} de ${setActual(d).length}</p>`
                  : `<section class="ay-card ay-card--prim" aria-labelledby="ay-g-t2"><h3 class="ay-h3" id="ay-g-t2">${icon('list-checks', 'ico-s')}Prueba guiada</h3><p class="txt">Tareas cortas, una a la vez, unos 15 minutos.</p><button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayIr" data-v="bienvenida" data-fk="ay-g-empezar">${p.set ? 'Seguir con la prueba' : 'Empezar la prueba'}</button></section>`;
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
        const datosHtml = `<section class="ay-card" aria-labelledby="ay-d-t"><h3 class="ay-h3" id="ay-d-t">${icon('rotate-ccw', 'ico-s')}Datos de los ejemplos</h3>
            <button type="button" class="btn btn--48 btn--full btn--reiniciar" data-a="ayReiniciar" data-fk="ay-reiniciar">${icon('rotate-ccw', 'ico-s')}Reiniciar ejemplos</button>
            <p class="fila-s">Vuelve ${caso ? 'este caso' : 'los ejemplos'} al inicio. Solo el entrenamiento: tus datos reales no se tocan.</p>
            ${A.confirmar === 'borrar' ? `<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<div><p><strong>¿Borrar todo?</strong> Se borran tus notas, tus respuestas y lo que hiciste en la app.</p><div class="ay-acc"><button type="button" class="btn" data-a="ayBorrar" data-v="no" data-fk="ay-borrar-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="ayBorrar" data-v="si" data-fk="ay-borrar-si">Sí, borrar todo</button></div></div></div>` : `<button type="button" class="link link--peligro" data-a="ayBorrar" data-v="pregunta" data-fk="ay-borrar">${icon('trash-2', 'ico-s')}Borrar todo, también mis notas</button>`}
            ${P.almacen.disponible ? '' : '<p class="fila-s">Este navegador no deja guardar: lo que hagas se pierde al cerrar.</p>'}
            <a class="link" href="index.html?guia=1">${icon('eye', 'ico-s')}Ver la guía completa (para computadora)</a></section>`;
        const paraVictor = `<details class="ay-card ay-victor"${p.estado === 'activa' || p.estado === 'fin' ? ' open' : ''}><summary class="ay-h3">${icon('users', 'ico-s')}Prueba guiada: sets A y B</summary>${prueba}<button type="button" class="ay-moderador" data-a="ayIr" data-v="moderador" data-fk="ay-moderador">Modo moderador</button></details>`;
        // v2.8 (D-11, APROBADO por Victor 2026-10-21): la prueba familiar usa preguntas de comprensión, no «terminó el tutorial».
        const comprension = `<details class="ay-card ay-victor" id="ay-d11"><summary class="ay-h3">${icon('circle-question-mark', 'ico-s')}Preguntas de comprensión (prueba familiar)</summary><p class="fila-s">Pregúntalas con la app abierta en Hoy. Lo que esperas oír, en pocas palabras:</p><ol class="mini-lista">${[
            ['Si hoy gastas $20, ¿qué cambia?', 'Mi libre baja $20 (y lo que tengo en esa cuenta).'],
            ['Si pagas $50 de una cuota de $100, ¿cuánto falta?', 'Faltan $50: quedan pendientes en mi plan.'],
            ['Si gastas $20 en el súper, ¿baja tu libre?', 'No: el súper ya estaba en mi plan. A mi presupuesto del súper le quedan $20 menos.'],
        ].map(([q, r]) => `<li><strong>${esc(q)}</strong> <span class="fila-s">${esc(r)}</span></li>`).join('')}</ol></details>`;
        return `<h3 class="campo-l campo-l--sec ay-v-sec" id="ay-v-t">${icon('users', 'ico-xs')}Herramientas de Victor (enlace ?victor=1)</h3>${actual}${comprension}${notas}${lista}${datosHtml}${paraVictor}`;
    }
    function vistaApariencia() {
        const temas = [['serena-claro', 'Serena claro'], ['serena-oscuro', 'Serena oscuro'], ['ancla-claro', 'Ancla claro'], ['ancla-oscuro', 'Ancla oscuro']];
        return `<section class="ay-card" aria-labelledby="ay-t-t"><h3 class="ay-h3" id="ay-t-t">${icon('palette', 'ico-s')}Apariencia</h3><div class="chips" role="group" aria-labelledby="ay-t-t">${temas.map(([v, t]) => `<button type="button" class="chip" aria-pressed="${P.tema === v}" data-a="ayTema" data-v="${v}" data-fk="ay-tema-${v}">${P.tema === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('')}</div></section>`;
    }
    // v2.6: «Casos y ayuda» pasa a «Ayuda» (V2-60); la de «Usarla con mis datos» es la misma.
    const TITULOS = { inicio: 'Ayuda', ayudaUso: 'Ayuda', bienvenida: 'Prueba guiada', instalar: 'Instalar la app', tarea: 'Tu tarea', respuesta: 'Cuéntanos', comprension: '¿Qué entendiste?', fin: '¡Gracias!', moderador: 'Modo moderador' };
    const VISTAS = { inicio: vistaInicio, ayudaUso: vistaInicio, bienvenida: vistaBienvenida, instalar: vistaInstalar, tarea: vistaTarea, respuesta: vistaRespuesta, comprension: vistaComprension, fin: vistaFin, moderador: vistaModerador };
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
        capa.innerHTML = M.unPunto(`<section class="ay${mitad ? ' ay--mitad' : ''}" role="dialog" aria-modal="true" aria-labelledby="ay-t"><header class="ay-h"><h2 class="ay-t" id="ay-t" tabindex="-1">${TITULOS[A.panel]}</h2>${sinCerrar ? '' : `<button type="button" class="hoja-x" data-a="ayCerrar" aria-label="Cerrar" data-fk="ay-x">${icon('x')}</button>`}</header><div class="ay-c">${VISTAS[A.panel]()}</div></section>`);
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
    acc.abrirAyuda = () => abrirPanel('inicio');
    /**
     * v2.6 (V2-61): «Prueba guiada» desde «Ayuda» o desde la letra. En curso: la tarea; terminada: el final (con
     * «Cuéntale…»); en pausa: sigue donde iba; si no, la bienvenida. El set lo elige la app (asignarSet).
     */
    function abrirPrueba() {
        const d = datos();
        if (d.prueba.estado === 'activa' && P.modo !== 'uso' && tareaActual(d)) return abrirPanel('tarea');
        if (d.prueba.estado === 'fin' && d.prueba.set) return abrirPanel('fin');
        if (d.prueba.set && (d.prueba.estado === 'libre' || d.prueba.estado === 'activa')) {
            d.prueba.estado = 'activa';
            guardar(d);
            iniciarTarea(d.prueba.i);
            return;
        }
        A.nombreTester = d.nombre;
        A.enFlujo = false;
        abrirPanel('bienvenida');
    }
    acc.ayPrueba = () => abrirPrueba();
    A.abrirPrueba = abrirPrueba;
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
    /**
     * v2.6.1 (V2-67): «Empezar de nuevo». Se borra el avance de la prueba (tareas, tiempos y respuestas); el nombre y el
     * perfil quedan escritos y la app vuelve a elegir el set sola (sin letras). Los datos reales no se tocan.
     */
    acc.ayReiniciarPrueba = (d) => {
        if (d.v === 'pregunta' || d.v === 'no') {
            A.confirmar = d.v === 'pregunta' ? 'reiniciarPrueba' : null;
            pintar({ foco: d.v === 'pregunta' ? '[data-fk="ay-rp-no"]' : '[data-fk="ay-rp"]' });
            return;
        }
        const x = datos();
        A.nombreTester = x.nombre;
        A.perfil = { ...(x.prueba.perfil || {}) };
        x.prueba = pruebaVacia();
        guardar(x);
        A.texto = '';
        A.armada = false;
        A.confirmar = null;
        pintarBarra();
        P.emitir('prueba:reiniciar');
        A.enFlujo = false;
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
    // v2.6: las herramientas de Victor cargan ejemplos: nunca encima de los datos reales (con tus datos no se ofrecen; esto es por si acaso).
    for (const k of ['ayCaso', 'ayPersona', 'ayReiniciar', 'aySimular', 'ayNueva', 'ayBorrar', 'ayCambiarSet']) {
        const fn = acc[k];
        acc[k] = (d) => (P.modo === 'uso' ? undefined : fn(d));
    }
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
    /** v2.7 (DATOS-2): «Actualizar la app» desde «Tus datos están a salvo»: la versión que espera, o buscar una y recargar. */
    function buscarVersion() {
        const recargar = () => location.reload();
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.getRegistration) return recargar();
        navigator.serviceWorker.getRegistration().then(
            (reg) => {
                if (reg && reg.waiting) {
                    A.quiereActualizar = true;
                    reg.waiting.postMessage({ tipo: 'saltar' });
                    setTimeout(recargar, 3000);
                } else if (reg) reg.update().then(recargar, recargar);
                else recargar();
            },
            recargar,
        );
    }
    A.buscarVersion = buscarVersion;
    function registrarSW() {
        if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
        // VISTA PREVIA v2.9.3: en raw.githack.com, sin service worker (cada push se ve al recargar). QUITAR ANTES DE PUBLICAR.
        if (P.vistaPrevia && P.vistaPrevia.sinServiceWorker()) return P.vistaPrevia.quitarServiceWorker();
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
        if (aviso) aviso.innerHTML = `<span class="aviso-proto-t">${icon('info', 'ico-xs')}<span><span class="nw">Prototipo de prueba ·</span> <span class="nw">no pongas tus datos reales</span></span></span>${P.enGuia ? '' : `<button type="button" class="aviso-proto-b" id="btn-ayuda" data-a="abrirAyuda" data-fk="btn-ayuda" aria-haspopup="dialog">Ayuda</button>`}`;
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
