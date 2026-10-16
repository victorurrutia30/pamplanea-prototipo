// Producto v2 · prototipo de teléfono. Núcleo: estado en memoria, navegación, pantallas.
// Las hojas inferiores y los recorridos guiados viven en hojas.js. Sin dependencias.
'use strict';
(() => {
    const D = window.DATOS;
    const M = window.MOTOR;
    const ART = window.ARTE;
    const { dinero } = M;

    // ------------------------------------------------------------------ utilidades de plantilla
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const EMOJI = Object.fromEntries(Object.entries(ART.emoji).map(([k, v]) => [M.sinVS(k), v]));
    function icon(name, cls = '') {
        return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ART.icons[name] || ''}</svg>`;
    }
    function emo(ch, size = 24) {
        const file = EMOJI[M.sinVS(ch || '')];
        return file ? `<img class="emo-img" src="recursos/emoji/${file}" width="${size}" height="${size}" alt="" decoding="async">` : `<span class="emo-txt" aria-hidden="true">${esc(ch)}</span>`;
    }
    const caja = (ch, cls = '') => `<span class="emo ${cls}" aria-hidden="true">${emo(ch)}</span>`;
    function montoHtml(c, tipo, { aprox = false } = {}) {
        if (c === null || c === undefined) return '<span class="monto monto--pend">Por confirmar</span>';
        if (tipo === 'ingreso') return `<span class="monto monto--ingreso"><span class="sr-only">Ingreso: </span>${dinero(c, { signo: true, aprox })}</span>`;
        if (tipo === 'gasto') return `<span class="monto"><span class="sr-only">Gasto: </span>${dinero(-c, { aprox })}</span>`;
        if (tipo === 'neutro') return `<span class="monto monto--neutro">${icon('arrow-left-right', 'ico-xs')}${dinero(c, { aprox })}</span>`;
        return `<span class="monto">${dinero(c, { aprox })}</span>`;
    }
    const sr = (t) => `<span class="sr-only">${esc(t)}</span>`;
    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

    // ------------------------------------------------------------------ estado
    const P = (window.P = {
        st: null,
        ui: null,
        deshacer: [],
        caso: null,
        esc, icon, emo, caja, montoHtml, sr, plural,
    });
    function uiInicial(tab = 'hoy') {
        return { tab, stack: [], hoja: null, toast: null, banner: null, scroll: {}, pagosVista: 'actual', pagosMes: null, mesVista: null, mesFiltro: 'todo', mesCategoria: null, descartados: {}, ob: null };
    }
    P.cargar = function (st, { tab = 'hoy', pantalla = null } = {}) {
        P.st = st;
        P.ui = uiInicial(tab);
        P.deshacer = [];
        if (pantalla) P.ui.stack.push(pantalla);
        if (!st.configurado) P.ui.ob = { paso: 0, datos: { ingresos: {}, bancos: [], efectivo: '', banco: {}, medios: { transferencia: false, credito: false }, credito: { banco: 'BAC', corte: '15', pago: '5' }, pagos: [] } };
        render({ nueva: true });
    };
    P.calc = () => M.calcular(P.st);

    // ------------------------------------------------------------------ comunicación con la guía (index.html)
    P.emitir = function (clave, datos = {}) {
        const msg = { fuente: 'pamplanea-proto', tipo: 'evento', clave, ...datos };
        try {
            if (window.parent !== window) window.parent.postMessage(msg, '*');
        } catch {
            /* sin guía */
        }
        window.dispatchEvent(new CustomEvent('proto', { detail: msg }));
    };

    // ------------------------------------------------------------------ guardar con deshacer
    /** `aviso` y `cambiar` pueden depender de lo que devolvió el cambio. */
    P.cambiar = function (fn, { aviso = 'Guardado', deshacer = true, claves = [], cambiar = null } = {}) {
        const antes = structuredClone(P.st);
        const resultado = fn(P.st);
        P.deshacer.push(antes);
        const texto = typeof aviso === 'function' ? aviso(resultado) : aviso;
        if (texto) P.avisar(texto, { deshacer, cambiar: typeof cambiar === 'function' ? cambiar(resultado) : cambiar });
        render();
        for (const c of claves) P.emitir(c);
        return resultado;
    };
    P.deshacerUltimo = function () {
        const antes = P.deshacer.pop();
        if (!antes) return;
        P.st = antes;
        P.ui.toast = null;
        render();
        P.avisar('Listo, lo deshicimos', { deshacer: false, check: false });
        P.emitir('deshacer');
    };
    P.nuevoId = (prefijo) => prefijo + (P.st.seq++);
    P.registrar = function (st, fila) {
        const r = { id: 'r' + st.seq, seq: st.seq, ...fila };
        st.seq++;
        st.registros.push(r);
        return r;
    };

    // ------------------------------------------------------------------ navegación
    P.irTab = function (tab) {
        if (P.ui.hoja) P.cerrarHoja({ sinFoco: true });
        P.ui.banner = null;
        P.ui.tab = tab;
        P.ui.stack = [];
        render({ nueva: true });
        P.emitir('pantalla:' + tab);
    };
    P.abrir = function (tipo, id, extra = {}) {
        if (P.ui.hoja) P.cerrarHoja({ sinFoco: true });
        P.ui.banner = null;
        P.guardarScroll();
        P.ui.stack.push({ tipo, id, ...extra });
        render({ nueva: true });
        P.emitir('pantalla:' + tipo + (id ? ':' + id : ''));
    };
    P.atras = function () {
        P.ui.stack.pop();
        render({ nueva: true, volver: true });
    };
    const claveVista = () => {
        const top = P.ui.stack.at(-1);
        return top ? `${top.tipo}:${top.id || ''}` : P.ui.tab;
    };
    P.guardarScroll = () => {
        const v = document.getElementById('vista');
        if (v && P._clave) P.ui.scroll[P._clave] = v.scrollTop;
    };

    // ------------------------------------------------------------------ render
    function render({ nueva = false, volver = false, foco = null } = {}) {
        const vista = document.getElementById('vista');
        const clave = claveVista();
        if (P._clave && !nueva) P.ui.scroll[P._clave] = vista.scrollTop;
        else if (P._clave && nueva) P.ui.scroll[P._clave] = vista.scrollTop;
        const activo = document.activeElement;
        const fk = activo && activo.dataset ? activo.dataset.fk : null;
        const enHoja = activo && activo.closest && activo.closest('.hoja');

        const enOnboarding = P.ui.ob && !P.st.configurado;
        document.getElementById('pantalla').innerHTML = enOnboarding ? P.pantallas.onboarding() : pantallaActual();
        const nav = document.getElementById('nav');
        const sinNav = enOnboarding || ['reparte', 'aldia', 'logro', 'primerNumero'].includes(P.ui.stack.at(-1)?.tipo);
        nav.hidden = sinNav;
        document.getElementById('app').classList.toggle('sin-nav', sinNav);
        for (const b of nav.querySelectorAll('[data-tab]')) {
            if (b.dataset.tab === P.ui.tab) b.setAttribute('aria-current', 'page');
            else b.removeAttribute('aria-current');
        }
        P.renderHoja();
        P.renderToast();
        P.renderBanner();

        if (nueva) vista.scrollTop = volver ? P.ui.scroll[clave] || 0 : 0;
        else if (clave === P._clave) vista.scrollTop = P.ui.scroll[clave] || 0;
        P._clave = clave;

        if (foco) {
            const el = document.querySelector(foco);
            if (el) el.focus({ preventScroll: true });
        } else if (nueva && !P.ui.hoja && !(P.ayuda && P.ayuda.abierto)) {
            const h = document.querySelector('#pantalla h1');
            if (h) h.focus({ preventScroll: true });
        } else if (fk && (!enHoja || P.ui.hoja)) {
            const el = document.querySelector(`[data-fk="${CSS.escape(fk)}"]`);
            if (el) el.focus({ preventScroll: true });
        }
        if (P.alRender) P.alRender();
    }
    P.render = render;

    function pantallaActual() {
        const top = P.ui.stack.at(-1);
        if (top) {
            const f = P.pantallas[top.tipo];
            return f ? f(top) : P.pantallas.hoy();
        }
        return P.pantallas[P.ui.tab]();
    }

    // ------------------------------------------------------------------ toast y banner
    let toastTimer = null;
    /** `cambiar`: id del registro recién guardado; el toast ofrece «Cambiar» (V2-29 #8). */
    P.avisar = function (texto, { deshacer = false, check = true, cambiar = null } = {}) {
        P.ui.toast = { texto, deshacer, check, cambiar, id: Date.now() };
        P.renderToast();
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            P.ui.toast = null;
            P.renderToast();
        }, deshacer ? 8000 : 4000);
    };
    P.renderToast = function () {
        const zona = document.getElementById('capa-toast');
        const t = P.ui.toast;
        const html = t ? `<div class="toast">${t.check ? icon('check', 'toast-check') : ''}<span class="toast-t">${esc(t.texto)}</span>${t.cambiar ? `<button type="button" class="toast-b" data-a="editarRegistro" data-id="${esc(t.cambiar)}" data-fk="toast-cambiar">Cambiar</button>` : ''}${t.deshacer ? '<button type="button" class="toast-b" data-a="deshacer" data-fk="toast-deshacer">Deshacer</button>' : ''}</div>` : '';
        if (zona.dataset.id !== String(t ? t.id : '')) {
            zona.innerHTML = html;
            zona.dataset.id = t ? t.id : '';
        }
    };
    let bannerTimer = null;
    P.notificar = function (aviso, { mostrar = true } = {}) {
        const a = { id: 'av' + Date.now(), fecha: P.st.hoy, hora: '8:00 a. m.', ...aviso };
        P.st.avisos.unshift(a);
        if (mostrar) {
            P.ui.banner = a;
            clearTimeout(bannerTimer);
            bannerTimer = setTimeout(() => {
                P.ui.banner = null;
                P.renderBanner();
            }, 7000);
        }
        render();
        P.emitir('notificacion:' + (aviso.clave || 'aviso'));
    };
    P.renderBanner = function () {
        const zona = document.getElementById('capa-banner');
        const b = P.ui.banner;
        const id = b ? b.id : '';
        if (zona.dataset.id === id) return;
        zona.dataset.id = id;
        zona.innerHTML = b
            ? `<div class="banner" role="status"><button type="button" class="banner-b" data-a="abrirAviso" data-id="${esc(b.id)}" data-fk="banner"><span class="banner-app" aria-hidden="true">P</span><span class="banner-txt"><span class="banner-m">PamPlanea · ahora</span><span class="banner-ti">${esc(b.titulo)}</span><span class="banner-te">${esc(b.texto)}</span></span></button><button type="button" class="banner-x" data-a="cerrarBanner" aria-label="Cerrar aviso">${icon('x')}</button></div>`
            : '';
    };

    // ------------------------------------------------------------------ piezas compartidas
    const encabezado = (titulo, sub, { atras = null, derecha = '' } = {}) => `
        <header class="pg-head${atras ? ' pg-head--ficha' : ''}">
            ${atras ? `<button type="button" class="atras" data-a="atras" aria-label="Volver a ${esc(atras)}" data-fk="atras">${icon('chevron-left')}<span>${esc(atras)}</span></button>` : ''}
            <div class="pg-head-row"><h1 class="h1" tabindex="-1">${titulo}</h1>${derecha}</div>
            ${sub ? `<p class="sub">${sub}</p>` : ''}
        </header>`;
    P.encabezado = encabezado;
    const tarjetaSeccion = (titulo, cuerpo, { accion = '', id = '', cls = '' } = {}) => `
        <section class="card ${cls}"${id ? ` aria-labelledby="${id}"` : ''}>
            ${titulo ? `<div class="card-h"><h2 class="card-t"${id ? ` id="${id}"` : ''}>${titulo}</h2>${accion}</div>` : ''}
            ${cuerpo}
        </section>`;
    P.tarjetaSeccion = tarjetaSeccion;
    const enlaceAccion = (texto, a, extra = '') => `<button type="button" class="link" data-a="${a}" ${extra}>${esc(texto)}</button>`;
    P.enlaceAccion = enlaceAccion;
    function barra(valor, total, etiqueta) {
        const pct = total ? Math.min(100, Math.floor((valor * 100) / total)) : 0;
        return `<div class="barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(etiqueta)}"><span style="width:${pct}%"></span></div>`;
    }
    P.barra = barra;
    const fechaPagoTexto = (o, hz) => {
        const st = P.st;
        if (o.estado === 'vencido') return `venció el ${M.fechaCorta(o.fecha)}`;
        if (o.estado === 'pagado') return `pagado · ${M.fechaCorta(o.fecha)}`;
        if (o.estado === 'saltado') return `saltado · ${M.fechaCorta(o.fecha)}`;
        if (o.estado === 'porConfirmar') return `${M.fechaCorta(o.fecha)} · según tu estado de cuenta`;
        const rel = M.relativa(o.fecha, st.hoy);
        if (!hz || hz.esHoy || !hz.ingreso) return rel;
        if (o.fecha === hz.fecha) return `${rel}, día de tu ${nombreIngreso(hz)}`;
        return o.fecha > hz.fecha ? `${rel} · después de tu ${nombreIngreso(hz)}` : rel;
    };
    P.fechaPagoTexto = fechaPagoTexto;
    function nombreIngreso(hz) {
        if (!hz.ingreso) return 'ingreso';
        return hz.ingreso.frecuencia === 'quincenal' ? 'quincena' : hz.ingreso.frecuencia === 'semanal' ? 'pago' : hz.ingreso.nombre.toLowerCase();
    }
    P.nombreIngreso = nombreIngreso;
    /** «Hasta tu quincena del 30 · en 9 días», «Hasta el viernes · en 2 días», «Hasta fin de mes». */
    function textoHorizonte(hz) {
        if (!hz.ingreso) return hz.modo === 'quince' ? `Próximos 15 días · hasta el ${M.fechaCorta(hz.fecha)}` : `Hasta fin de mes · ${plural(hz.dias, 'día', 'días')}`;
        if (hz.esHoy) return `Hoy es tu ${nombreIngreso(hz)}`;
        const en = hz.dias === 1 ? 'mañana' : `en ${hz.dias} días`;
        if (hz.ingreso.frecuencia === 'semanal') return `Hasta el ${M.DIAS[M.diaSemana(hz.fecha)]} · ${en}`;
        if (hz.ingreso.frecuencia === 'quincenal') return `Hasta tu quincena del ${M.partes(hz.fecha)[2]} · ${en}`;
        return `Hasta tu ${hz.ingreso.nombre.toLowerCase()} del ${M.fechaCorta(hz.fecha)} · ${en}`;
    }
    P.textoHorizonte = textoHorizonte;

    /**
     * Fila de un pago. En Hoy dice cuándo vence respecto al ingreso; en la línea de tiempo de
     * Pagos la fecha ya es el grupo, así que dice con qué se paga. `reserva` muestra lo que el
     * número ya va guardando para ese pago (ingreso semanal, V2-15).
     */
    function filaPago(o, hz, { conBoton = true, enLinea = false, reserva = null } = {}) {
        const st = P.st;
        const esTarjeta = !!o.tarjeta;
        const nombre = esTarjeta ? o.tarjeta.nombre : o.pago.nombre;
        const emoji = esTarjeta ? o.tarjeta.emoji : o.pago.emoji;
        const abrir = esTarjeta ? `data-a="abrir" data-tipo="tarjeta" data-id="${o.tarjeta.id}"` : `data-a="abrir" data-tipo="pago" data-id="${o.pago.id}"`;
        const fk = (esTarjeta ? 't-' + o.tarjeta.id : 'p-' + o.pago.id) + '-' + o.fecha;
        const puedePagar = conBoton && (o.estado === 'pendiente' || o.estado === 'vencido');
        const marca = o.estado === 'pagado' ? `<span class="estado estado--ok">${icon('circle-check', 'ico-xs')}Pagado</span>` : o.estado === 'saltado' ? '<span class="estado">Saltado</span>' : o.estado === 'vencido' ? `<span class="estado estado--pend">${icon('clock', 'ico-xs')}Por confirmar</span>` : '';
        const avisoOn = !esTarjeta && o.pago.avisos && o.pago.avisos.some((a) => a.on) && o.estado === 'pendiente' ? `<span class="campana">${icon('bell', 'ico-xs')}${sr('Con aviso. ')}</span>` : '';
        let sub;
        if (enLinea) {
            const hecho = !esTarjeta && o.hecho && o.hecho.registro ? st.registros.find((r) => r.id === o.hecho.registro) : null;
            const medio = esTarjeta ? null : M.medio(st, hecho ? hecho.medio : o.pago.medio);
            sub = o.estado === 'porConfirmar' ? 'Según tu estado de cuenta' : esTarjeta ? 'Pago de tarjeta' : medio ? medio.nombre : '';
        } else sub = fechaPagoTexto(o, hz);
        // V2-29 #4: el pago del mismo día del ingreso cuenta en el periodo siguiente; se marca.
        const hzRef = hz || M.horizonte(st);
        if (!esTarjeta && hzRef.ingreso && M.esDiaDeIngreso(st, o.fecha) && o.estado !== 'pagado' && !sub.includes('día de tu')) sub += ` · mismo día de tu ${nombreIngreso(hzRef)}`;
        const guardando = reserva ? `<span class="fila-s">Guardando ${dinero(reserva.guardado)} de ${dinero(reserva.total)}</span>${barra(reserva.guardado, reserva.total, 'Guardado para ' + nombre)}` : '';
        return `<li class="fila fila--pago${o.estado === 'pagado' || o.estado === 'saltado' ? ' fila--hecha' : ''}">
            <button type="button" class="fila-main" ${abrir} data-fk="${fk}">
                ${caja(emoji)}
                <span class="fila-txt"><span class="fila-t">${esc(nombre)}</span><span class="fila-s"><span>${avisoOn}${esc(sub)}</span></span>${marca ? `<span class="fila-s">${marca}</span>` : ''}${guardando}</span>
                <span class="fila-m">${montoHtml(o.monto, null, { aprox: o.estimado })}${o.estimado ? '<span class="fila-s">estimado</span>' : ''}</span>
            </button>
            ${puedePagar ? `<button type="button" class="btn btn--sm" data-a="pagado" data-tipo="${esTarjeta ? 'tarjeta' : 'pago'}" data-id="${esTarjeta ? o.tarjeta.id : o.pago.id}" data-fecha="${o.fecha}" data-fk="pagado-${fk}" aria-label="Marcar ${esc(nombre)} como pagado">Pagado</button>` : ''}
        </li>`;
    }
    P.filaPago = filaPago;

    function filaRegistro(r, { conFecha = true } = {}) {
        const st = P.st;
        let emoji = '🧩';
        let titulo = r.nombre || '';
        let sub = '';
        let monto = '';
        const fecha = conFecha ? M.relativa(r.fecha, st.hoy) : '';
        if (r.tipo === 'gasto') {
            const k = M.categoria(r.categoria);
            emoji = r.emoji || D.EMOJI_NOMBRE[M.normalizar(r.nombre || '').split(' ')[0]] || (r.pago && M.pago(st, r.pago)?.emoji) || k.emoji;
            const m = M.medio(st, r.medio);
            sub = [fecha, m ? m.nombre : '', r.pago ? 'de Pagos' : ''].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'gasto');
        } else if (r.tipo === 'ingreso') {
            emoji = r.emoji || M.categoria(r.categoria).emoji;
            sub = [fecha, M.lugar(st, r.lugar)?.nombre].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'ingreso');
        } else if (r.tipo === 'mover') {
            emoji = '🔁';
            titulo = r.nombre || 'Mover dinero';
            sub = [fecha, `${M.lugar(st, r.de)?.nombre} → ${M.lugar(st, r.a)?.nombre}`].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'neutro');
        } else if (r.tipo === 'pagoTarjeta') {
            emoji = '🔁';
            sub = [fecha, `${M.lugar(st, r.lugar)?.nombre} → ${M.tarjeta(st, r.tarjeta)?.nombre}`].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'neutro');
        } else if (r.tipo === 'cuadre') {
            emoji = '⚖️';
            const dif = r.monto - r.esperado;
            titulo = `Cuadraste ${M.lugar(st, r.lugar)?.nombre}`;
            sub = [fecha, dif === 0 ? 'cuadró exacto' : `${dinero(Math.abs(dif))} sin detalle`].filter(Boolean).join(' · ');
            monto = `<span class="monto monto--neutro">${dinero(r.monto)}</span>`;
        } else if (r.tipo === 'cargoTarjeta') {
            emoji = '💳';
            titulo = `${M.tarjeta(st, r.tarjeta)?.nombre}: sin detalle`;
            sub = [fecha, r.motivo === 'intereses' ? 'intereses o cargos' : r.motivo === 'compras' ? 'compras que no anotaste' : 'diferencia del estado de cuenta'].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'gasto');
        }
        const editable = ['gasto', 'ingreso', 'mover', 'pagoTarjeta'].includes(r.tipo);
        const inner = `${caja(emoji)}<span class="fila-txt"><span class="fila-t">${esc(titulo)}</span><span class="fila-s">${esc(sub)}</span></span><span class="fila-m">${monto}</span>`;
        return `<li class="fila">${editable ? `<button type="button" class="fila-main" data-a="editarRegistro" data-id="${r.id}" data-fk="reg-${r.id}" aria-label="${esc(titulo)}, ${esc(sub)}. Corregir">${inner}</button>` : `<div class="fila-main fila-main--quieta">${inner}</div>`}</li>`;
    }
    P.filaRegistro = filaRegistro;

    // ------------------------------------------------------------------ pantallas
    P.pantallas = {};
    const S = P.pantallas;

    /** Un aviso se queda en Hoy mientras sirva: lo que ya tiene su tarjeta en Hoy o ya se resolvió, se va. */
    function avisoVigente(a) {
        const st = P.st;
        const x = a.accion || {};
        if (x.tipo === 'aldia' || (x.tipo === 'hoja' && ['ingresoLlego', 'estadoCuenta'].includes(x.hoja))) return false;
        if (x.tipo === 'pago') {
            const p = M.pago(st, x.id);
            if (!p || p.activo === false) return false;
            return M.ocurrenciasPago(st, p, M.sumarDias(st.hoy, -62), M.sumarDias(st.hoy, 2)).some((o) => o.estado === 'vencido' || o.estado === 'pendiente');
        }
        if (x.tipo === 'tarjeta') return M.tarjetaInfo(st, M.tarjeta(st, x.id)).porPagarEstado > 0;
        return true;
    }
    P.avisoVigente = avisoVigente;
    /** «2 viernes», «1 sábado», «3 sábados»: los días de pago semanales que quedan. */
    P.diasDePago = (n) => {
        const p = M.principal(P.st);
        const d = p && p.frecuencia === 'semanal' ? M.DIAS[p.diaSemana] : 'pago';
        return `${n} ${n === 1 || d.endsWith('s') ? d : d + 's'}`;
    };
    /** «Quedan 2 viernes: unos $45.00 cada uno» o «Queda 1 viernes: $30.00». */
    P.quedan = (r) => (r.restantes === 1 ? `Queda ${P.diasDePago(1)}: ${dinero(r.siguiente)}` : `Quedan ${P.diasDePago(r.restantes)}: unos ${dinero(r.siguiente)} cada uno`);
    const ARTICULOS = { alquiler: 'el alquiler', luz: 'la luz', agua: 'el agua', internet: 'el internet', colegio: 'el colegio', telefono: 'el teléfono', cable: 'el cable', prestamo: 'el préstamo', cuchubal: 'el cuchubal' };
    P.conArticulo = (nombre) => ARTICULOS[M.normalizar(nombre)] || `«${nombre}»`;

    S.hoy = function () {
        const st = P.st;
        const k = P.calc();
        const hz = k.hz;
        const inicial = (st.nombre || 'T').charAt(0).toUpperCase();
        const fechaHoy = M.capital(M.conDia(st.hoy));
        // V2-29 #3: un día de pago sin confirmar no se supone llegado: «Libre por ahora» + «¿Ya te cayó?».
        const porConfirmar = hz.esHoy ? hz.ocurrencia : (hz.atrasadas || []).at(-1) || null;
        const ultimaTarjeta = k.tarjetas.find((x) => x.porPagarEstado > 0);
        const lineas = [];
        if (porConfirmar) lineas.push(`<span class="portada-s">${hz.esHoy ? 'Confírmala para ver el número nuevo' : `Falta confirmar tu ${esc(nombreIngreso(hz))} del ${M.partes(porConfirmar.fecha)[2]}`}</span>`);
        else if (k.porDia !== null) lineas.push(`<span class="portada-s">~${dinero(k.porDia, { aprox: true }).replace('~', '')} por día</span>`);
        else if (k.libre <= 0) lineas.push('<span class="portada-s">Hoy no te queda libre: mira el detalle</span>');
        // V2-29 #1: el pago de la tarjeta que vence después del ingreso ya baja el libre; se dice.
        if (ultimaTarjeta) lineas.push(`<span class="portada-v">Incluye tarjeta ${dinero(ultimaTarjeta.porPagarEstado)}, ${ultimaTarjeta.ult.vence < st.hoy ? 'venció' : 'vence'} el ${M.partes(ultimaTarjeta.ult.vence)[2]}</span>`);
        if (k.reservas.length && k.guardando) lineas.push(`<span class="portada-v">Ya separa ${dinero(k.guardando)} para ${esc(k.reservas.map((r) => P.conArticulo(r.pago.nombre)).join(' y '))}</span>`);
        if (k.inactivo >= 10) lineas.push(`<span class="portada-v">Con lo último que anotaste, ${esc(M.haceDias(M.ultimaActividad(st), st.hoy))}</span>`);
        const portada = `<div class="portada app-home-pattern">
                <svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.circles}</svg>
                <button type="button" class="portada-b" data-a="hoja" data-hoja="desglose" data-fk="portada" aria-label="${porConfirmar ? 'Libre por ahora' : 'Libre'} ${esc(dinero(k.libre))}. ${esc(textoHorizonte(hz))}. Ver de dónde sale">
                    <span class="portada-h">${esc(textoHorizonte(hz))}</span><span class="portada-l">${porConfirmar ? 'Libre por ahora' : 'Libre'}</span><span class="portada-n">${dinero(k.libre)}</span>${lineas.join('')}
                    <span class="portada-mas">¿De dónde sale? ${icon('chevron-right', 'ico-xs')}</span>
                </button>
                ${porConfirmar ? `<div class="portada-pie"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="ingresoLlego" data-id="${porConfirmar.ingreso.id}" data-fecha="${porConfirmar.fecha}" data-fk="ing-si">${hz.esHoy ? '¿Ya te cayó?' : `¿Ya te cayó tu ${esc(nombreIngreso(hz))} del ${M.partes(porConfirmar.fecha)[2]}?`}</button></div>` : ''}
            </div>`;

        const tarjetasAviso = [];
        // Pongámonos al día.
        if (k.alDia) {
            const pend = pendientesAlDia();
            tarjetasAviso.push(`<section class="card card--aviso" aria-labelledby="av-dia"><div class="aviso-cab">${caja('👋')}<div><h2 class="card-t" id="av-dia">Pongámonos al día</h2><p class="txt">¡Qué bueno verte! En un minuto dejamos todo como está hoy:</p></div></div>
                <ul class="mini-lista">${pend.ingresos ? `<li>${plural(pend.ingresos, 'ingreso', 'ingresos')} por confirmar</li>` : ''}${pend.pagos ? `<li>${plural(pend.pagos, 'pago', 'pagos')} por confirmar</li>` : ''}<li>${plural(st.lugares.length, 'lugar', 'lugares')} por cuadrar</li></ul>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="abrir" data-tipo="aldia" data-fk="aldia">Empezar</button></section>`);
        }
        for (const a of k.avisos) {
            if (a.tipo === 'estado') {
                const t = a.info.t;
                tarjetasAviso.push(`<section class="card card--aviso" aria-labelledby="av-est-${t.id}"><div class="aviso-cab">${caja(t.emoji)}<div><h2 class="card-t" id="av-est-${t.id}">¿Ya te llegó tu estado de cuenta?</h2><p class="txt">${esc(t.nombre)} cortó el ${M.partes(a.info.pendiente.corte)[2]}. Dinos cuánto te salió para contarlo en tu libre.</p></div></div>
                    <button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="estadoCuenta" data-id="${t.id}" data-fk="estado-${t.id}">Anotar estado de cuenta</button></section>`);
            } else if (a.tipo === 'faltaria') {
                const o = a.ocurrencia;
                const cuando = o.estado === 'vencido' ? 'Te faltarían' : `El ${M.partes(o.fecha)[2]} te faltarían`;
                tarjetasAviso.push(`<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p><strong>${cuando} ${dinero(a.faltan)} para ${esc(P.conArticulo(o.pago.nombre))}.</strong> Mira qué puedes mover o liberar.</p><button type="button" class="link" data-a="hoja" data-hoja="desglose" data-fk="nota-faltaria">Ver detalle</button></div>`);
            } else if (a.tipo === 'apartados') {
                tarjetasAviso.push(`<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p><strong>Faltan ${dinero(a.faltan)} para cubrir tus apartados.</strong> Tu dinero total es menor que lo que apartaste.</p><button type="button" class="link" data-a="irTab" data-tab="midinero" data-fk="nota-apartados">Ver apartados</button></div>`);
            } else if (a.tipo === 'reserva') {
                const r = a.reserva;
                tarjetasAviso.push(`<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p><strong>Te faltan ${dinero(a.faltan)} para ir al día con ${esc(P.conArticulo(r.pago.nombre))}.</strong> ${r.restantes ? `${P.quedan(r)} antes del ${M.partes(r.fecha)[2]}.` : ''}</p><button type="button" class="link" data-a="hoja" data-hoja="desglose" data-fk="nota-reserva">Ver detalle</button></div>`);
            } else if (a.tipo === 'apartadoVencido' && !P.ui.descartados['vencido-' + a.apartado.id]) {
                const ap = a.apartado;
                tarjetasAviso.push(`<section class="card card--aviso" aria-labelledby="av-ven-${ap.id}"><div class="aviso-cab">${caja(ap.emoji)}<div><h2 class="card-t" id="av-ven-${ap.id}">Tu apartado ${esc(ap.nombre)} era para el ${M.partes(ap.metaFecha)[2]}. ¿Ya lo usaste?</h2><p class="txt">Tiene ${dinero(ap.monto)}. Si ya lo gastaste, lo cerramos sin anotar otro gasto.</p></div></div>
                    <div class="acciones-2"><button type="button" class="btn" data-a="descartar" data-id="vencido-${ap.id}" data-fk="ven-no-${ap.id}">Todavía no</button><button type="button" class="btn btn--prim" data-a="hoja" data-hoja="yaLoUse" data-id="${ap.id}" data-fk="ven-si-${ap.id}">Sí, ya lo gasté</button></div></section>`);
            }
        }

        // Avisos (notificaciones simuladas) de hoy.
        const avisos = st.avisos.filter((a) => a.fecha === st.hoy && !P.ui.descartados[a.id] && avisoVigente(a)).slice(0, 3);
        const avisosHtml = avisos.length
            ? tarjetaSeccion(
                  `${icon('bell', 'ico-s')} Avisos de hoy <span class="contador">notificación y correo</span>`,
                  `<ul class="lista">${avisos
                      .map(
                          (a) => `<li class="fila fila--aviso"><button type="button" class="fila-main fila-main--aviso" data-a="abrirAviso" data-id="${a.id}" data-fk="aviso-${a.id}"><span class="aviso-hora">${esc(a.hora.replace(' a. m.', '').replace(' p. m.', ''))}</span><span class="fila-txt"><span class="aviso-l"><strong>${esc(a.titulo)}.</strong> ${esc(a.texto)}</span></span></button><button type="button" class="icon-btn" data-a="descartar" data-id="${a.id}" aria-label="Quitar aviso ${esc(a.titulo)}">${icon('x')}</button></li>`,
                      )
                      .join('')}</ul>`,
                  { id: 'h-avisos' },
              )
            : '';

        // Próximos pagos: vencidos primero, luego los que vienen.
        const proximos = proximosPagos(3);
        const pagosHtml = tarjetaSeccion(
            'Próximos pagos',
            proximos.length ? `<ul class="lista">${filasProximos(proximos, hz, k)}</ul>` : `<p class="vacio">No tienes pagos por delante. ${enlaceAccion('Agregar un pago', 'hoja', 'data-hoja="nuevoPago" data-fk="vacio-pago"')}</p>`,
            { id: 'h-pagos', accion: enlaceAccion('Ver todos', 'irTab', 'data-tab="pagos" data-fk="ver-pagos"') },
        );

        // Últimos anotados: solo si la persona anota.
        const anotados = st.registros.filter((r) => ['gasto', 'ingreso', 'mover', 'pagoTarjeta'].includes(r.tipo) && r.fecha <= st.hoy).sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1)).slice(0, 3);
        const anotaAlgo = st.registros.some((r) => r.anotado || r.nuevo);
        const ultimosHtml = anotaAlgo && anotados.length ? tarjetaSeccion('Últimos anotados', `<ul class="lista">${anotados.map((r) => filaRegistro(r)).join('')}</ul>`, { id: 'h-ult', accion: enlaceAccion('Ver historial', 'irTab', 'data-tab="mes" data-fk="ver-historial"') }) : '';

        return `<div class="pg pg--hoy">
            <header class="hoy-head">
                <button type="button" class="avatar" data-a="hoja" data-hoja="menu" data-fk="avatar" aria-label="Menú de ${esc(st.nombre || 'tu cuenta')}: ajustes, tu espacio y aprende">${esc(inicial)}</button>
                <div class="hoy-saludo"><h1 class="h1" tabindex="-1">${st.nombre ? 'Hola, ' + esc(st.nombre) : 'Hola'}</h1><p class="sub">${esc(fechaHoy)}</p></div>
            </header>
            ${portada}
            ${tarjetasAviso.join('')}
            ${avisosHtml}
            ${pagosHtml}
            ${ultimosHtml}
        </div>`;
    };

    /** Las filas de Próximos pagos; lo que vence desde el próximo ingreso va tras un separador. */
    function filasProximos(lista, hz, k) {
        const fila = (o) => filaPago(o, null, { reserva: !o.tarjeta && k.reservas.find((r) => r.pago.id === o.pago.id) });
        if (!hz.ingreso || hz.esHoy) return lista.map(fila).join('');
        const antes = lista.filter((o) => o.estado === 'vencido' || o.fecha < hz.fecha);
        const despues = lista.filter((o) => !antes.includes(o));
        const dia = M.partes(hz.fecha)[2];
        const cual = hz.ingreso.frecuencia === 'semanal' ? `tu pago del ${M.DIAS[M.diaSemana(hz.fecha)]} ${dia}` : `tu ${nombreIngreso(hz)} del ${dia}`;
        return antes.map(fila).join('') + (despues.length ? `<li class="separador" role="presentation"><span>Desde ${esc(cual)}</span></li>${despues.map(fila).join('')}` : '');
    }
    function proximosPagos(n) {
        const st = P.st;
        const hasta = M.sumarDias(st.hoy, 45);
        const lista = [];
        for (const p of st.pagos.filter((x) => x.activo !== false)) {
            for (const o of M.ocurrenciasPago(st, p, p.desde, hasta)) if (o.estado === 'pendiente' || o.estado === 'vencido') lista.push(o);
        }
        for (const o of M.ocurrenciasTarjeta(st, M.sumarDias(st.hoy, -40), hasta)) if (o.estado === 'pendiente' || o.estado === 'vencido' || o.estado === 'porConfirmar') lista.push(o);
        lista.sort((a, b) => (a.estado === 'vencido') !== (b.estado === 'vencido') ? (a.estado === 'vencido' ? -1 : 1) : a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
        const vistos = new Set();
        return lista.filter((o) => {
            const clave = o.tarjeta ? 't' + o.tarjeta.id : 'p' + o.pago.id;
            if (vistos.has(clave)) return false;
            vistos.add(clave);
            return true;
        }).slice(0, n);
    }
    P.proximosPagos = proximosPagos;
    function pendientesAlDia() {
        const st = P.st;
        const hz = M.horizonte(st);
        let pagos = 0;
        for (const p of st.pagos.filter((x) => x.activo !== false)) pagos += M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1)).filter((o) => o.estado === 'vencido').length;
        pagos += M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1)).filter((o) => o.estado === 'vencido').length;
        return { pagos, ingresos: (hz.atrasadas || []).length };
    }
    P.pendientesAlDia = pendientesAlDia;

    // ---- Pagos
    function periodos() {
        const st = P.st;
        const p = M.principal(st);
        const hz = M.horizonte(st);
        if (!p) {
            const [y, m] = M.partes(st.hoy);
            return { actual: { desde: `${y}-${M.pad(m)}-01`, hasta: M.fechaDe(y, m, 31), t: 'Este mes' }, proxima: (() => { const [ny, nm] = M.mesMas(y, m, 1); return { desde: `${ny}-${M.pad(nm)}-01`, hasta: M.fechaDe(ny, nm, 31), t: 'Próximo mes' }; })(), semanal: false };
        }
        const pasadas = M.ocurrenciasIngreso(st, p, M.sumarDias(st.hoy, -40), st.hoy);
        const ultima = pasadas.filter((o) => o.fecha < hz.fecha).at(-1);
        const sig = M.ocurrenciasIngreso(st, p, M.sumarDias(hz.fecha, 1), M.sumarDias(hz.fecha, 40))[0];
        const semanal = p.frecuencia === 'semanal';
        return {
            actual: { desde: ultima ? M.sumarDias(ultima.fecha, 1) : M.sumarDias(st.hoy, -14), hasta: hz.fecha, t: semanal ? 'Esta semana' : p.frecuencia === 'quincenal' ? 'Esta quincena' : 'Este periodo' },
            proxima: { desde: M.sumarDias(hz.fecha, 1), hasta: sig ? sig.fecha : M.sumarDias(hz.fecha, 15), t: semanal ? 'Próxima' : 'Próxima' },
            semanal,
        };
    }
    function lineaTiempo(desde, hasta, { conHoy = true } = {}) {
        const st = P.st;
        const hz = M.horizonte(st);
        const items = [];
        for (const p of st.pagos) {
            for (const o of M.ocurrenciasPago(st, p, desde, hasta)) {
                if (p.activo === false && !o.hecho) continue;
                if (o.estado === 'vencido') continue;
                items.push({ fecha: o.fecha, html: filaPago(o, hz, { conBoton: false, enLinea: true }) });
            }
        }
        for (const o of M.ocurrenciasTarjeta(st, desde, hasta)) {
            if (o.estado === 'vencido') continue;
            items.push({ fecha: o.fecha, html: filaPago(o, hz, { conBoton: false, enLinea: true }) });
        }
        for (const ing of st.ingresos.filter((i) => i.activo !== false)) {
            for (const o of M.ocurrenciasIngreso(st, ing, desde, hasta)) {
                const estado = o.estado === 'llego' ? `${icon('circle-check', 'ico-xs')}Llegó` : o.estado === 'porConfirmar' ? `${icon('clock', 'ico-xs')}Por confirmar` : o.estado === 'hoy' ? 'Hoy · ¿ya te cayó?' : ing.extra ? 'Esperado · suma cuando llegue' : 'Esperado';
                items.push({
                    fecha: o.fecha,
                    ingreso: true,
                    html: `<li class="fila fila--ingreso"><button type="button" class="fila-main" data-a="abrir" data-tipo="ingreso" data-id="${ing.id}" data-fk="i-${ing.id}-${o.fecha}">${caja(ing.emoji)}<span class="fila-txt"><span class="fila-t">${esc(ing.nombre)}</span><span class="fila-s">${estado}</span></span><span class="fila-m">${o.estado === 'llego' ? montoHtml(o.monto, 'ingreso') : `<span class="monto monto--esperado">${dinero(o.monto, { aprox: o.aprox })}</span>`}</span></button></li>`,
                });
            }
        }
        if (conHoy && st.hoy >= desde && st.hoy <= hasta) items.push({ fecha: st.hoy, hoy: true });
        items.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.hoy ? -1 : b.hoy ? 1 : a.ingreso ? 1 : -1));
        const grupos = [];
        for (const it of items) {
            let g = grupos.at(-1);
            if (!g || g.fecha !== it.fecha) grupos.push((g = { fecha: it.fecha, filas: [], hoy: false }));
            if (it.hoy) g.hoy = true;
            else g.filas.push(it.html);
        }
        if (!grupos.length) return '<p class="vacio">Nada en estas fechas.</p>';
        return grupos
            .map((g) => {
                const conMes = `${M.diaCorto(g.fecha)} ${M.MESES_CORTOS[M.partes(g.fecha)[1] - 1]}`;
                const etiqueta = g.fecha === st.hoy ? `Hoy · ${conMes}` : M.capital(conMes);
                const cuerpo = g.filas.length ? `<ul class="lista card">${g.filas.join('')}</ul>` : g.hoy ? '<p class="hoy-marca-t">Nada que pagar hoy.</p>' : '';
                return `<div class="grupo${g.fecha === st.hoy ? ' grupo--hoy' : ''}"><h3 class="grupo-t">${esc(etiqueta)}</h3>${cuerpo}</div>`;
            })
            .join('');
    }

    function rangoTexto(desde, hasta) {
        const [, m1, d1] = M.partes(desde);
        const [, m2, d2] = M.partes(hasta);
        return m1 === m2 ? `Del ${d1} al ${d2} de ${M.MESES[m2 - 1]}` : `Del ${d1} de ${M.MESES[m1 - 1]} al ${d2} de ${M.MESES[m2 - 1]}`;
    }
    S.pagos = function () {
        const st = P.st;
        const hz = M.horizonte(st);
        const per = periodos();
        const vista = P.ui.pagosVista;
        const vencidos = [];
        for (const p of st.pagos.filter((x) => x.activo !== false)) for (const o of M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido') vencidos.push(o);
        for (const o of M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido') vencidos.push(o);
        let rango;
        if (vista === 'actual') rango = per.actual;
        else if (vista === 'proxima') rango = per.proxima;
        else {
            const base = P.ui.pagosMes || st.hoy.slice(0, 7);
            const [y, m] = base.split('-').map(Number);
            rango = { desde: `${y}-${M.pad(m)}-01`, hasta: M.fechaDe(y, m, 31), t: `${M.capital(M.MESES[m - 1])} ${y}` };
        }
        const tabs = [['actual', per.actual.t], ['proxima', per.proxima.t], ['mes', 'Mes']]
            .map(([v, t]) => `<button type="button" class="app-tab" role="tab" aria-selected="${vista === v}" data-a="pagosVista" data-v="${v}" data-fk="tab-${v}">${esc(t)}</button>`)
            .join('');
        const mesNav =
            vista === 'mes'
                ? `<div class="mes-nav"><button type="button" class="icon-btn" data-a="pagosMes" data-d="-1" aria-label="Mes anterior" data-fk="pm-ant">${icon('chevron-left')}</button><p class="mes-nav-t" aria-live="polite">${esc(rango.t)}</p><button type="button" class="icon-btn" data-a="pagosMes" data-d="1" aria-label="Mes siguiente" data-fk="pm-sig">${icon('chevron-right')}</button></div>`
                : `<p class="rango">${esc(rangoTexto(rango.desde, rango.hasta))}</p>`;
        const extras = st.ingresos.filter((i) => i.extra && i.activo !== false).flatMap((i) => M.ocurrenciasIngreso(st, i, M.sumarDias(rango.hasta, 1), M.sumarDias(st.hoy, 400)).filter((o) => o.estado !== 'llego'));
        return `<div class="pg">
            ${encabezado('Pagos', 'Qué pagas y cuándo te pagan')}
            <div class="acciones-2 acciones-2--top"><button type="button" class="btn btn--prim" data-a="hoja" data-hoja="nuevoPago" data-fk="nuevo-pago">${icon('plus', 'ico-s')}Pago</button><button type="button" class="btn" data-a="hoja" data-hoja="nuevoIngreso" data-fk="nuevo-ingreso">${icon('plus', 'ico-s')}Ingreso esperado</button></div>
            ${vencidos.length ? tarjetaSeccion(`Por confirmar <span class="contador">${vencidos.length}</span>`, `<p class="txt txt--card">Ya pasó su fecha. ¿Los pagaste?</p><ul class="lista">${vencidos.map((o) => filaPago(o, hz)).join('')}</ul>`, { id: 'p-venc', cls: 'card--venc' }) : ''}
            <div class="app-tabs tabs-3" role="tablist" aria-label="Periodo">${tabs}</div>
            ${mesNav}
            <div class="linea">${lineaTiempo(rango.desde, rango.hasta)}</div>
            ${extras.length ? `<div class="grupo"><h3 class="grupo-t">Más adelante</h3><ul class="lista card">${extras.map((o) => `<li class="fila fila--ingreso"><button type="button" class="fila-main" data-a="abrir" data-tipo="ingreso" data-id="${o.ingreso.id}" data-fk="x-${o.ingreso.id}">${caja(o.ingreso.emoji)}<span class="fila-txt"><span class="fila-t">${esc(o.ingreso.nombre)}</span><span class="fila-s">${esc(M.fechaLarga(o.fecha))} · no suma a tu libre hasta que llegue</span></span><span class="fila-m"><span class="monto monto--esperado">${dinero(o.monto, { aprox: o.aprox })}</span></span></button></li>`).join('')}</ul></div>` : ''}
        </div>`;
    };

    // ---- Mi dinero
    S.midinero = function () {
        const st = P.st;
        const k = P.calc();
        const sinApartar = k.tienes - k.apartado;
        const lugares = st.lugares
            .map((l) => {
                const medios = st.medios.filter((m) => m.lugar === l.id && m.id !== l.id && m.tarjetaDebito);
                return `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="lugar" data-id="${l.id}" data-fk="l-${l.id}">${caja(l.emoji)}<span class="fila-txt"><span class="fila-t">${esc(l.nombre)}</span>${medios.map((m) => `<span class="fila-s">${emo(m.emoji, 14)} ${esc(m.nombre)}</span>`).join('')}<span class="fila-s">Cuadrado ${esc(M.haceDias(l.cuadre.fecha, st.hoy))}</span></span><span class="fila-m">${montoHtml(M.saldoLugar(st, l.id))}</span></button></li>`;
            })
            .join('');
        const total = `<section class="total" aria-labelledby="md-total">
                <div class="total-cab"><div><h2 class="total-l" id="md-total">Tienes</h2><p class="total-n">${dinero(k.tienes)}</p><p class="total-s">En ${esc(st.lugares.map((l) => l.nombre).join(' y '))}</p></div><svg class="total-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.cuentas}</svg></div>
                <div class="acciones-2"><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="cuadrar" data-fk="md-cuadrar">${icon('scale', 'ico-s')}Cuadrar</button><button type="button" class="btn btn--48" data-a="hoja" data-hoja="mover" data-fk="md-mover">${icon('arrow-left-right', 'ico-s')}Mover</button></div>
            </section>
            ${reparticion(k)}
            ${tarjetaSeccion('Dónde está', `<ul class="lista">${lugares}</ul>`, { id: 'md-lugares' })}`;
        const apartadosActivos = st.apartados;
        const apHtml = apartadosActivos
            .map((a) => {
                const lista = a.meta && a.monto >= a.meta;
                const vencido = a.metaFecha && a.metaFecha < st.hoy && a.monto > 0;
                const meta = vencido ? `Era para el ${M.partes(a.metaFecha)[2]} · ¿ya lo usaste?` : a.meta ? (lista ? `<span>${emo('🎉', 14)} ¡Lista para usar!</span>` : `${Math.floor((a.monto * 100) / a.meta)} % de ${dinero(a.meta)}`) : 'Sin meta';
                return `<li class="fila fila--ap"><button type="button" class="fila-main" data-a="abrir" data-tipo="apartado" data-id="${a.id}" data-fk="a-${a.id}">${recorte(a)}<span class="fila-txt"><span class="fila-t">${emo(a.emoji, 16)} ${esc(a.nombre)}</span><span class="fila-s">${meta}</span>${a.meta ? barra(a.monto, a.meta, 'Avance de ' + a.nombre) : ''}</span><span class="fila-m">${montoHtml(a.monto)}</span></button></li>`;
            })
            .join('');
        const apartados = tarjetaSeccion(
            `Apartados <span class="contador">${dinero(k.apartado)}</span>`,
            `${apartadosActivos.length ? `<ul class="lista">${apHtml}</ul>` : `<div class="vacio vacio--ilus"><svg class="app-illustration vacio-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.ahorros}</svg><p>Todavía no tienes apartados. Apartar es ponerle nombre a una parte de tu dinero, sin moverlo de lugar.</p></div>`}
             <div class="sin-apartar"><p><span class="fila-t">Sin apartar</span><span class="fila-s">Tu dinero que no tiene etiqueta</span></p><p class="monto">${dinero(sinApartar)}</p></div>
             ${k.tienes < k.apartado ? `<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p><strong>Faltan ${dinero(k.apartado - k.tienes)} para cubrir tus apartados.</strong></p></div>` : ''}
             <div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="apartar" data-fk="md-apartar">${icon('plus', 'ico-s')}Apartar</button></div>`,
            { id: 'md-ap' },
        );
        const deudas = [];
        for (const t of st.tarjetas) {
            const info = M.tarjetaInfo(st, t);
            const linea = info.pendiente ? `Estado de cuenta por anotar · cortó el ${M.partes(info.pendiente.corte)[2]}` : info.porPagarEstado > 0 ? `Por pagar ${dinero(info.porPagarEstado)} el ${M.partes(info.ult.vence)[2]}` : 'Al día con tu último estado';
            const extra = [info.comprasNetas ? `+ ${dinero(info.comprasNetas)} en compras nuevas` : '', info.resto ? `debes ${dinero(info.resto)} aparte` : ''].filter(Boolean).join(' · ');
            // V2-25: el cupo disponible se ve aquí y en la ficha, pero nunca suma al libre.
            const cupo = info.cupoLibre !== null ? `Te quedan ${dinero(info.cupoLibre)} de cupo` : '';
            deudas.push(`<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="tarjeta" data-id="${t.id}" data-fk="t-${t.id}">${caja(t.emoji)}<span class="fila-txt"><span class="fila-t">${esc(t.nombre)}</span><span class="fila-s">${esc(linea)}</span>${extra ? `<span class="fila-s">${esc(extra)}</span>` : ''}${cupo ? `<span class="fila-s">${esc(cupo)}</span>` : ''}</span><span class="fila-m">${montoHtml(info.debeTotal)}<span class="fila-s">debes</span></span></button></li>`);
        }
        for (const p of st.pagos.filter((x) => (x.deuda || x.tipoDeuda) && x.activo !== false)) {
            const tipo = D.TIPOS_DEUDA.find((x) => x.id === p.tipoDeuda);
            const debe = p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined;
            deudas.push(`<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="pago" data-id="${p.id}" data-fk="d-${p.id}">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">${tipo ? esc(tipo.nombre) + ' · ' : ''}Cuota ${dinero(p.monto)} el ${p.dia}</span></span><span class="fila-m">${debe ? `${montoHtml(p.deuda.debe, null, { aprox: true })}<span class="fila-s">debes</span>` : '<span class="fila-s">sin saldo</span>'}</span></button></li>`);
        }
        const deudasHtml = tarjetaSeccion(
            'Tarjetas y deudas',
            `${deudas.length ? `<ul class="lista">${deudas.join('')}</ul>` : '<p class="vacio">Si tienes una tarjeta, una cuota o un préstamo, agrégalo aquí y su pago aparece solo en Pagos.</p>'}
            <div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="nuevaDeuda" data-fk="md-deuda">${icon('plus', 'ico-s')}Tarjeta o préstamo</button></div>`,
            { id: 'md-deudas' },
        );
        const logros = st.logros.length
            ? tarjetaSeccion('Logros', `<ul class="lista">${st.logros.map((l) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja('🎉')}<span class="fila-txt"><span class="fila-t">${esc(l.nombre)}</span><span class="fila-s">Meta cumplida el ${esc(M.fechaLarga(l.fecha))}</span>${textoUsoLogro(l) ? `<span class="fila-s">${esc(textoUsoLogro(l))}</span>` : ''}</span><span class="fila-m">${montoHtml(l.monto)}</span></div></li>`).join('')}</ul>`, { id: 'md-logros' })
            : '';
        return `<div class="pg">${encabezado('Mi dinero', 'Dónde está y para qué es')}${total}${apartados}${guardandoParaPagos(k)}${deudasHtml}${logros}</div>`;
    };

    /** V2-27: «Usado con Crédito BAC · $600 reservados para tu pago del 5» mientras siga la reserva. */
    function textoUsoLogro(l) {
        const st = P.st;
        if (!l.medio) return '';
        const m = M.medio(st, l.medio);
        if (!m) return '';
        if (!m.tarjeta) return `Usado con ${m.nombre}`;
        const res = (st.reservasTarjeta || []).find((x) => x.id === l.reserva);
        const t = M.tarjeta(st, m.tarjeta);
        const info = t ? M.tarjetaInfo(st, t) : null;
        if (res && info && info.reservado > 0) return `Usado con ${m.nombre} · ${dinero(Math.min(res.monto, info.reservado))} reservados para tu pago del ${M.partes(info.venceCompras)[2]}`;
        return `Usado con ${m.nombre} · ya pagaste la tarjeta`;
    }
    P.textoUsoLogro = textoUsoLogro;

    /** V2-26: toda la repartición de lo que tienes, en una línea y una barra. */
    function reparticion(k) {
        const st = P.st;
        const paraPagos = k.porPagar + k.enTarjetas - k.reservadoTarjetas;
        const guardado = k.guardando + k.reservadoTarjetas;
        const unico = k.reservas.length === 1 && !k.reservadoTarjetas ? `para ${P.conArticulo(k.reservas[0].pago.nombre)}` : 'guardando para pagos';
        const partes = [
            ['ap', 'apartado', Math.min(k.apartado, k.tienes)],
            ['pg', 'por pagar', Math.max(0, Math.min(paraPagos, k.tienes - k.apartado))],
            ['gu', unico, guardado],
            ['li', 'libre', k.libre],
        ].filter(([, , m]) => m > 0);
        if (!k.tienes) return '';
        const frase = `Tienes ${dinero(k.tienes)} = ${partes.length ? partes.map(([, t, m]) => `${t} ${dinero(m)}`).join(' + ') : 'libre $0.00'}`;
        const falta = k.deficit + M.suma(k.reservas, (r) => r.falta);
        return `<section class="card reparto" aria-labelledby="md-reparto">
            <div class="card-h"><h2 class="card-t" id="md-reparto">Así se reparte</h2></div>
            <p class="reparto-frase">${esc(frase)}</p>
            <div class="reparto-barra" aria-hidden="true">${partes.map(([c, , m]) => `<span class="rb rb--${c}" style="flex-grow:${m}"></span>`).join('')}</div>
            <ul class="reparto-ley">${partes.map(([c, t, m]) => `<li><span class="rb-pt rb--${c}" aria-hidden="true"></span><span>${esc(M.capital(t))}</span><span class="monto">${dinero(m)}</span></li>`).join('')}</ul>
            ${falta > 0 ? `<p class="txt txt--card reparto-falta">${icon('triangle-alert', 'ico-s')}${k.deficit ? `Lo que tienes no cubre tus apartados y pagos: te faltan ${dinero(falta)}.` : `Te faltan ${dinero(falta)} para ir al día con ${esc(k.reservas.filter((r) => r.falta > 0).map((r) => P.conArticulo(r.pago.nombre)).join(' y '))}.`}</p>` : ''}
        </section>`;
    }
    /** V2-26 / V2-27: lo que el número va guardando solo (alquiler por partes, reserva de la tarjeta). */
    function guardandoParaPagos(k) {
        const st = P.st;
        const filas = [];
        for (const r of k.reservas) {
            const sub = r.falta > 0 ? `Te faltan ${dinero(r.falta)} para ir al día` : r.restantes ? `${dinero(r.siguiente)} cada ${M.DIAS[M.principal(st).diaSemana]} · vence el ${M.partes(r.fecha)[2]}` : `Vence el ${M.partes(r.fecha)[2]}`;
            filas.push(`<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="pago" data-id="${r.pago.id}" data-fk="g-${r.pago.id}">${caja(r.pago.emoji)}<span class="fila-txt"><span class="fila-t">${esc(r.pago.nombre)} · ${dinero(r.guardado)} de ${dinero(r.total)}</span><span class="fila-s">${esc(sub)}</span>${barra(r.guardado, r.total, 'Guardado para ' + r.pago.nombre)}</span><span class="fila-m">${montoHtml(r.guardado)}</span></button></li>`);
        }
        for (const x of k.tarjetas.filter((t) => t.reservado > 0)) {
            const de = x.reservas.map((r) => r.de).filter(Boolean).join(', ');
            filas.push(`<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="tarjeta" data-id="${x.t.id}" data-fk="g-t-${x.t.id}">${caja(x.t.emoji)}<span class="fila-txt"><span class="fila-t">${esc(x.t.nombre)} · ${dinero(x.reservado)} reservados</span><span class="fila-s">${de ? `De tu apartado ${esc(de)} · ` : ''}para tu pago del ${M.partes(x.venceCompras)[2]}</span></span><span class="fila-m">${montoHtml(x.reservado)}</span></button></li>`);
        }
        if (!filas.length) return '';
        return tarjetaSeccion(`Guardando para pagos <span class="contador">automático</span>`, `<p class="txt txt--card">Lo separa el número solo y se vacía cuando marcas el pago como Pagado.</p><ul class="lista">${filas.join('')}</ul>`, { id: 'md-guardando' });
    }
    function recorte(a) {
        const key = a.portada || 'general-amanecer';
        return `<span class="recorte app-cover" aria-hidden="true"><svg class="app-cover-art" viewBox="140 0 180 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${ART.covers[key] || ART.covers['general-amanecer']}</svg></span>`;
    }
    P.recorte = recorte;

    // ---- Mes
    S.mes = function () {
        const st = P.st;
        const base = P.ui.mesVista || st.hoy.slice(0, 7);
        const [y, m] = base.split('-').map(Number);
        const r = M.resumenMes(st, y, m);
        const [py, pm] = M.mesMas(y, m, -1);
        const prev = M.resumenMes(st, py, pm);
        const esActual = base === st.hoy.slice(0, 7);
        let comparacion = '';
        if (prev.salio > 0) {
            if (esActual) comparacion = `En ${M.MESES[pm - 1]} saliste ${dinero(prev.salio)} en todo el mes. Este mes llevas ${dinero(r.salio)}.`;
            else {
                const dif = r.salio - prev.salio;
                comparacion = dif === 0 ? `Igual que en ${M.MESES[pm - 1]}.` : `${dinero(Math.abs(dif))} ${dif < 0 ? 'menos' : 'más'} que en ${M.MESES[pm - 1]}.`;
            }
        }
        const filas = [];
        const maximo = Math.max(r.totalFijos, ...r.porCategoria.map((x) => x.total), r.tarjetaSinDetalle, r.sinDetalleSalio, 1);
        const filaCat = (id, emoji, nombre, total, nota, filtro) =>
            `<li class="fila fila--cat"><button type="button" class="fila-main" data-a="mesCategoria" data-id="${filtro}" data-fk="cat-${filtro}" aria-pressed="${P.ui.mesCategoria === filtro}">${caja(emoji)}<span class="fila-txt"><span class="fila-t">${esc(nombre)}</span>${nota ? `<span class="fila-s">${esc(nota)}</span>` : ''}<span class="cat-barra" aria-hidden="true"><span style="width:${Math.max(4, Math.round((total * 100) / maximo))}%"></span></span></span><span class="fila-m">${montoHtml(total)}</span></button></li>`;
        if (r.totalFijos) filas.push(filaCat('fijos', '🧾', 'Pagos fijos', r.totalFijos, `${plural(r.fijos.length, 'pago', 'pagos')} de Pagos`, 'fijos'));
        for (const c of r.porCategoria) {
            const k = M.categoria(c.id);
            filas.push(filaCat(c.id, k.emoji, k.nombre, c.total, plural(c.n, 'anotado', 'anotados'), c.id));
        }
        if (r.tarjetaSinDetalle) filas.push(filaCat('tsd', '💳', 'Tarjeta sin detalle', r.tarjetaSinDetalle, 'Intereses o cargos del estado de cuenta', 'tarjeta'));
        if (r.sinDetalleSalio) filas.push(filaCat('sd', '⚖️', 'Sin detalle', r.sinDetalleSalio, 'Lo que explicaron tus cuadres', 'cuadre'));
        const enque = tarjetaSeccion('¿En qué se te fue?', filas.length ? `<ul class="lista">${filas.join('')}</ul>` : '<p class="vacio">Nada anotado este mes.</p>', { id: 'mes-enque' });

        // Historial con filtros.
        const filtro = P.ui.mesFiltro;
        const cat = P.ui.mesCategoria;
        let regs = r.regs.filter((x) => x.tipo !== 'cuadre' || filtro === 'todo' || filtro === 'movimientos');
        if (filtro === 'gastos') regs = regs.filter((x) => x.tipo === 'gasto' || x.tipo === 'cargoTarjeta');
        if (filtro === 'ingresos') regs = regs.filter((x) => x.tipo === 'ingreso');
        if (filtro === 'movimientos') regs = regs.filter((x) => ['mover', 'pagoTarjeta', 'cuadre'].includes(x.tipo));
        if (cat === 'fijos') regs = regs.filter((x) => x.tipo === 'gasto' && x.pago);
        else if (cat === 'tarjeta') regs = regs.filter((x) => x.tipo === 'cargoTarjeta');
        else if (cat === 'cuadre') regs = regs.filter((x) => x.tipo === 'cuadre');
        else if (cat) regs = regs.filter((x) => x.tipo === 'gasto' && !x.pago && x.categoria === cat);
        regs = regs.sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1));
        const grupos = [];
        for (const x of regs) {
            let g = grupos.at(-1);
            if (!g || g.fecha !== x.fecha) grupos.push((g = { fecha: x.fecha, filas: [] }));
            g.filas.push(filaRegistro(x, { conFecha: false }));
        }
        const chips = [['todo', 'Todo'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos'], ['movimientos', 'Movimientos']]
            .map(([v, t]) => `<button type="button" class="chip" aria-pressed="${filtro === v}" data-a="mesFiltro" data-v="${v}" data-fk="mf-${v}">${filtro === v ? icon('check', 'ico-xs') : ''}${t}</button>`)
            .join('');
        const catChip = cat ? `<button type="button" class="chip chip--quitar" aria-pressed="true" data-a="mesCategoria" data-id="${cat}" data-fk="mf-cat">${esc(cat === 'fijos' ? 'Pagos fijos' : cat === 'tarjeta' ? 'Tarjeta sin detalle' : cat === 'cuadre' ? 'Sin detalle' : M.categoria(cat).nombre)} ${icon('x', 'ico-xs')}${sr('Quitar filtro')}</button>` : '';
        const historial = `<section class="historial" aria-labelledby="mes-hist"><div class="hist-cab"><h2 class="card-t" id="mes-hist">Historial</h2><p class="fila-s">Toca uno para corregirlo</p></div>
            <div class="chips chips--scroll" role="group" aria-label="Filtrar historial">${chips}${catChip}</div>
            ${grupos.length ? grupos.map((g) => `<div class="grupo"><h3 class="grupo-t">${esc(M.capital(M.diaCorto(g.fecha)))}</h3><ul class="lista card">${g.filas.join('')}</ul></div>`).join('') : '<p class="vacio">Nada con este filtro.</p>'}</section>`;
        return `<div class="pg">
            ${encabezado('Mes', '¿En qué se te fue?')}
            <div class="mes-nav"><button type="button" class="icon-btn" data-a="mesNav" data-d="-1" aria-label="Mes anterior" data-fk="mes-ant">${icon('chevron-left')}</button><p class="mes-nav-t" aria-live="polite">${esc(M.capital(M.MESES[m - 1]))} ${y}</p><button type="button" class="icon-btn" data-a="mesNav" data-d="1" aria-label="Mes siguiente" data-fk="mes-sig" ${esActual ? 'disabled' : ''}>${icon('chevron-right')}</button></div>
            <section class="card resumen" aria-label="Resumen del mes">
                <div class="resumen-dos"><div><p class="fila-s">Entró</p><p class="resumen-n">${montoHtml(r.entro, 'ingreso')}</p></div><div><p class="fila-s">Salió</p><p class="resumen-n resumen-n--salio">${dinero(-r.salio)}</p></div></div>
                ${comparacion ? `<p class="txt">${esc(comparacion)}</p>` : ''}
            </section>
            ${enque}
            ${historial}
        </div>`;
    };

    // ---- Fichas (una sola ficha por objeto, se abra desde donde se abra)
    S.pago = function ({ id }) {
        const st = P.st;
        const p = M.pago(st, id);
        if (!p) return S.hoy();
        const hz = M.horizonte(st);
        const abiertas = M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, 70)).filter((o) => o.estado === 'pendiente' || o.estado === 'vencido');
        const prox = abiertas[0];
        const hechas = M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, 70)).filter((o) => o.hecho);
        const historia = [...hechas.map((o) => ({ fecha: o.fecha, monto: o.monto, estado: o.estado })), ...(p.previos || []).map((x) => ({ ...x, estado: 'pagado' }))].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
        const medio = M.medio(st, p.medio);
        const frecuencia = p.frecuencia === 'semanal' ? `Cada ${M.DIAS[p.diaSemana]}` : p.frecuencia === 'unico' ? `Una vez, el ${M.fechaLarga(p.fecha)}` : `Cada mes, el ${p.dia}`;
        const avisoTexto = (a) => (a.tipo === 'recibo' ? `Revisar el recibo · el ${a.dia}` : a.tipo === 'antes' ? `Un día antes · 8:00 a. m.` : 'El día que vence · 8:00 a. m.');
        const atrasTexto = P.ui.stack.length > 1 ? 'Atrás' : P.ui.tab === 'midinero' ? 'Mi dinero' : P.ui.tab === 'hoy' ? 'Hoy' : P.ui.tab === 'mes' ? 'Mes' : 'Pagos';
        const estadoProx = prox
            ? `<div class="ficha-prox"><p class="fila-s">${prox.estado === 'vencido' ? 'Venció' : 'Próximo'}: ${esc(M.capital(M.fechaLarga(prox.fecha)))}${prox.estado === 'vencido' ? ' · por confirmar' : ''}</p>
                <div class="acciones-2"><button type="button" class="btn btn--48" data-a="saltar" data-id="${p.id}" data-fecha="${prox.fecha}" data-fk="saltar">Saltar este mes</button><button type="button" class="btn btn--prim btn--48" data-a="pagado" data-tipo="pago" data-id="${p.id}" data-fecha="${prox.fecha}" data-fk="ficha-pagado">Pagado</button></div></div>`
            : '<p class="fila-s">No hay pagos por delante.</p>';
        const reserva = P.calc().reservas.find((r) => r.pago.id === p.id);
        const tipoDeuda = D.TIPOS_DEUDA.find((x) => x.id === p.tipoDeuda);
        const debe = p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined;
        return `<div class="pg">
            ${encabezado(`${emo(p.emoji, 28)} ${esc(p.nombre)}`, `${tipoDeuda ? esc(tipoDeuda.nombre) + ' · ' : ''}${esc(frecuencia)} · ${esc(medio ? medio.nombre : 'sin medio')}`, { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Monto">
                <p class="cifra">${p.estimado ? dinero(p.monto, { aprox: true }) : dinero(p.monto)}</p>
                <p class="fila-s">${p.estimado ? 'Estimado: cambia cada mes. Al marcarlo Pagado te pido el monto real.' : tipoDeuda ? 'Cuota fija' : 'Monto fijo'}</p>
                ${estadoProx}
            </section>
            ${reserva ? tarjetaSeccion(`Guardando para este pago <span class="contador">automático</span>`, `<div class="dato"><p class="cifra cifra--s">${dinero(reserva.guardado)} <span class="fila-s">de ${dinero(reserva.total)}</span></p>${barra(reserva.guardado, reserva.total, 'Guardado para ' + p.nombre)}<p class="fila-s">${reserva.falta > 0 ? `Te faltan ${dinero(reserva.falta)} para ir al día. ` : ''}${reserva.restantes ? `${P.quedan(reserva)}.` : ''} Se vacía sola al marcarlo Pagado.</p></div>`, { id: 'f-guarda' }) : ''}
            ${p.deuda || tipoDeuda ? tarjetaSeccion('Lo que debes', `<div class="dato"><p class="cifra cifra--s">${debe ? dinero(p.deuda.debe, { aprox: true }) : 'Sin anotar'}</p><p class="fila-s">Opcional. Baja con cada «Pagado».</p></div><div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="deuda" data-id="${p.id}" data-fk="deuda">${debe ? 'Actualizar lo que debo' : 'Anotar cuánto debo'}</button></div>`, { id: 'f-deuda' }) : ''}
            ${tarjetaSeccion('Avisos', `<ul class="lista">${(p.avisos || []).map((a, i) => `<li class="fila fila--switch"><span class="fila-txt"><span class="fila-t">${esc(avisoTexto(a))}</span><span class="fila-s">Notificación y correo</span></span><button type="button" class="switch" role="switch" aria-checked="${a.on}" data-a="avisoSwitch" data-id="${p.id}" data-i="${i}" data-fk="sw-${i}" aria-label="${esc(avisoTexto(a))}"><span></span></button></li>`).join('')}</ul>${p.estimado && !(p.avisos || []).some((a) => a.tipo === 'recibo') ? '' : ''}`, { id: 'f-avisos' })}
            ${tarjetaSeccion('Historial', historia.length ? `<ul class="lista">${historia.map((h) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(h.estado === 'saltado' ? '⏭️' : p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(M.capital(M.fechaLarga(h.fecha)))}</span><span class="fila-s">${h.estado === 'saltado' ? 'Saltado' : 'Pagado'}</span></span><span class="fila-m">${h.estado === 'saltado' ? '' : montoHtml(h.monto)}</span></div></li>`).join('')}</ul>` : '<p class="vacio">Todavía no hay pagos.</p>', { id: 'f-hist' })}
            <div class="pie-acciones"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="${tipoDeuda ? 'nuevaDeuda' : 'editarPago'}" data-id="${p.id}" data-fk="editar-pago">${icon('pencil', 'ico-s')}Editar</button><button type="button" class="btn btn--full btn--peligro-txt" data-a="hoja" data-hoja="yaNoAplica" data-id="${p.id}" data-fk="ya-no">${icon('ban', 'ico-s')}Ya no aplica</button></div>
        </div>`;
    };

    S.tarjeta = function ({ id }) {
        const st = P.st;
        const t = M.tarjeta(st, id);
        const info = M.tarjetaInfo(st, t);
        const ult = info.ult;
        const atrasTexto = P.ui.stack.length > 1 ? 'Atrás' : P.ui.tab === 'midinero' ? 'Mi dinero' : P.ui.tab === 'hoy' ? 'Hoy' : 'Pagos';
        const pendiente = info.pendiente
            ? `<div class="nota nota--info" role="note">${icon('info')}<p><strong>Cortó el ${M.partes(info.pendiente.corte)[2]} de ${M.MESES[M.partes(info.pendiente.corte)[1] - 1]}.</strong> Cuando te llegue el estado de cuenta, dinos cuánto te salió.</p></div><button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="estadoCuenta" data-id="${t.id}" data-fk="t-estado">Llegó mi estado de cuenta</button>`
            : '';
        const estadoTxt = ult.inicial ? '' : `<div class="dato-grid"><div><p class="fila-s">Pago de contado</p><p class="dato-n">${dinero(ult.total)}</p></div><div><p class="fila-s">Pago mínimo</p><p class="dato-n">${dinero(ult.minimo)}</p></div><div><p class="fila-s">Vas a pagar</p><p class="dato-n">${dinero(ult.aPagar)}</p></div><div><p class="fila-s">Vence</p><p class="dato-n">${esc(M.fechaCorta(ult.vence))}</p></div></div>
            ${ult.diferencia ? `<p class="txt">Anotaste ${dinero(ult.anotado)}; el estado dijo ${dinero(ult.total)}: ${dinero(ult.diferencia)} de ${ult.motivo === 'intereses' ? 'intereses o cargos' : ult.motivo === 'compras' ? 'compras que no anotaste' : 'algo sin detalle'}.</p>` : ''}
            <div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="decidirPago" data-id="${t.id}" data-fk="t-decidir">Cambiar cuánto voy a pagar</button></div>`;
        const historial = st.registros.filter((r) => (r.tipo === 'gasto' && M.medio(st, r.medio)?.tarjeta === t.id) || (r.tipo === 'pagoTarjeta' && r.tarjeta === t.id) || (r.tipo === 'cargoTarjeta' && r.tarjeta === t.id)).sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1)).slice(0, 8);
        return `<div class="pg">
            ${encabezado(`${emo(t.emoji, 28)} ${esc(t.nombre)}`, `Corte el ${t.corte} · pago el ${t.pagoDia}`, { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Lo que debes">
                <p class="fila-s">Debes en total</p>
                <p class="cifra">${dinero(info.debeTotal)}</p>
                <ul class="mini-desglose">
                    ${info.porPagarEstado ? `<li><span>Por pagar el ${esc(M.fechaCorta(ult.vence))}</span><span>${dinero(info.porPagarEstado)}</span></li>` : ''}
                    ${info.comprasNetas ? `<li><span>Compras desde el corte · se pagan el ${esc(M.fechaCorta(info.venceCompras))}</span><span>${dinero(info.comprasNetas)}</span></li>` : ''}
                    ${info.resto ? `<li><span>Sigue como deuda</span><span>${dinero(info.resto)}</span></li>` : ''}
                </ul>
                ${info.cupoLibre !== null ? `<p class="cupo"><strong>Te quedan ${dinero(info.cupoLibre)} de cupo</strong> <span class="fila-s">de ${dinero(t.cupo)}. El cupo no suma a tu libre.</span></p>` : ''}
                <p class="fila-s">Las compras con tarjeta bajan tu libre el día que las haces.</p>
                ${info.reservado ? `<div class="nota nota--ok" role="note">${icon('check')}<p><strong>${dinero(info.reservado)} reservados para tu pago del ${M.partes(info.venceCompras)[2]}</strong>${info.reservas.length ? ` (de tu apartado ${esc(info.reservas.map((r) => r.de).join(', '))})` : ''}. Ya no cuentan en tu libre.</p></div>` : ''}
                ${info.porPagarEstado || info.reservado ? `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="pagado" data-tipo="tarjeta" data-id="${t.id}" data-fecha="${ult.vence}" data-fk="t-pagar">${icon('arrow-left-right', 'ico-s')}Pagar tarjeta</button>` : ''}
                ${pendiente}
            </section>
            ${ult.inicial ? '' : tarjetaSeccion(`Estado de cuenta del ${M.partes(ult.corte)[2]} ${M.MESES_CORTOS[M.partes(ult.corte)[1] - 1]}`, estadoTxt, { id: 't-est' })}
            ${info.resto ? `<div class="nota nota--consejo" role="note">${icon('lightbulb')}<p><strong>Sobre lo que sigue como deuda:</strong> no calculamos los intereses. Van a aparecer como diferencia en tu próximo estado de cuenta y ahí te diremos cuánto fue. Abonar un poco más que el mínimo ya ayuda.</p></div>` : ''}
            <div class="nota nota--info" role="note">${icon('lightbulb')}<p>Este año pagaste ${dinero(t.interesesAnio || 0)} en intereses. Pagar el total cada mes es lo que menos te cuesta.</p></div>
            ${tarjetaSeccion('Historial', historial.length ? `<ul class="lista">${historial.map((r) => filaRegistro(r)).join('')}</ul>` : '<p class="vacio">Sin compras anotadas con esta tarjeta.</p>', { id: 't-hist' })}
            <div class="pie-acciones"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="nuevaDeuda" data-id="${t.id}" data-fk="editar-tarjeta">${icon('pencil', 'ico-s')}Editar</button></div>
        </div>`;
    };

    S.lugar = function ({ id }) {
        const st = P.st;
        const l = M.lugar(st, id);
        const saldo = M.saldoLugar(st, id);
        const medios = st.medios.filter((m) => m.lugar === id);
        const regs = st.registros.filter((r) => M.lugaresDe(st, r).includes(id) || (r.tipo === 'cuadre' && r.lugar === id)).sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1));
        const despues = regs.filter((r) => r.tipo !== 'cuadre' && M.despues(r, l.cuadre));
        const cuadre = regs.find((r) => r.tipo === 'cuadre' && r.seq === l.cuadre.seq);
        const antes = regs.filter((r) => r.tipo !== 'cuadre' && !M.despues(r, l.cuadre)).slice(0, 6);
        const dif = cuadre ? cuadre.monto - cuadre.esperado : 0;
        const atrasTexto = P.ui.stack.length > 1 ? 'Atrás' : 'Mi dinero';
        return `<div class="pg">
            ${encabezado(`${emo(l.emoji, 28)} ${esc(l.nombre)}`, medios.length ? 'Con ' + medios.map((m) => esc(m.nombre)).join(' y ') : '', { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Saldo">
                <p class="fila-s">Tienes</p><p class="cifra">${dinero(saldo)}</p>
                <p class="fila-s">Cuadrado el ${esc(M.fechaLarga(l.cuadre.fecha))} (${esc(M.haceDias(l.cuadre.fecha, st.hoy))}). Tu saldo parte de ese cuadre.</p>
                <div class="acciones-2"><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="cuadrar" data-id="${id}" data-fk="l-cuadrar">${icon('scale', 'ico-s')}Cuadrar</button><button type="button" class="btn btn--48" data-a="hoja" data-hoja="mover" data-id="${id}" data-fk="l-mover">${icon('arrow-left-right', 'ico-s')}Mover</button></div>
            </section>
            ${tarjetaSeccion('Después de tu último cuadre', despues.length ? `<ul class="lista">${despues.map((r) => filaRegistro(r)).join('')}</ul>` : '<p class="vacio">Nada anotado desde el cuadre.</p>', { id: 'l-desp' })}
            ${cuadre ? `<div class="cuadre-marca">${caja('⚖️')}<p><strong>Cuadre del ${esc(M.fechaCorta(cuadre.fecha))}: dijiste ${dinero(cuadre.monto)}.</strong> ${dif === 0 ? 'Cuadró exacto con lo anotado.' : `Según lo anotado tenías ${dinero(cuadre.esperado)}: ${dinero(Math.abs(dif))} quedaron sin detalle.`}</p></div>` : ''}
            ${antes.length ? tarjetaSeccion('Antes del cuadre', `<p class="txt txt--card">Ya están incluidos en el cuadre: corregirlos no cambia tu saldo.</p><ul class="lista lista--apagada">${antes.map((r) => filaRegistro(r)).join('')}</ul>`, { id: 'l-antes' }) : ''}
        </div>`;
    };

    S.apartado = function ({ id }) {
        const st = P.st;
        const a = M.apartado(st, id);
        if (!a) return S.midinero();
        const lista = a.meta && a.monto >= a.meta;
        const atrasTexto = P.ui.stack.length > 1 ? 'Atrás' : P.ui.tab === 'hoy' ? 'Hoy' : 'Mi dinero';
        const vencido = a.metaFecha && a.metaFecha < st.hoy && a.monto > 0;
        const metaTxt = a.meta ? (lista ? `${emo('🎉', 16)} ¡Lista para usar! Juntaste ${dinero(a.monto)} de ${dinero(a.meta)}.` : `${Math.floor((a.monto * 100) / a.meta)} % de ${dinero(a.meta)} · faltan ${dinero(a.meta - a.monto)}${a.metaFecha ? ` para el ${M.fechaLarga(a.metaFecha)}` : ''}`) : 'Sin meta: apartas a tu ritmo.';
        const avisoVencido = vencido ? `<div class="nota nota--atencion" role="note">${icon('clock')}<div><p><strong>Era para el ${esc(M.fechaLarga(a.metaFecha))}. ¿Ya lo usaste?</strong> Si ya lo gastaste, lo cerramos sin anotar otro gasto.</p><button type="button" class="btn btn--sm" data-a="hoja" data-hoja="yaLoUse" data-id="${a.id}" data-fk="ap-yalouse">Sí, ya lo gasté</button></div></div>` : '';
        return `<div class="pg">
            ${encabezado(`${emo(a.emoji, 28)} ${esc(a.nombre)}`, 'Apartado', { atras: atrasTexto })}
            ${avisoVencido}
            <section class="card ficha-ap" aria-label="Lo apartado">
                <div class="app-cover ficha-ap-portada"><svg class="app-cover-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.covers[a.portada] || ART.covers['general-amanecer']}</svg><p class="ficha-ap-l">Apartado</p><p class="ficha-ap-n">${dinero(a.monto)}</p></div>
                <div class="ficha-ap-cuerpo">
                    <p class="txt">${metaTxt}</p>
                    ${a.meta ? barra(a.monto, a.meta, 'Avance de ' + a.nombre) : ''}
                    <div class="acciones-2"><button type="button" class="btn btn--48" data-a="hoja" data-hoja="apartar" data-id="${a.id}" data-fk="ap-mas">${icon('plus', 'ico-s')}Apartar más</button><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="usar" data-id="${a.id}" data-fk="ap-usar" ${a.monto ? '' : 'disabled'}>Usar</button></div>
                    <div class="acciones-2"><button type="button" class="btn" data-a="hoja" data-hoja="liberar" data-id="${a.id}" data-fk="ap-liberar" ${a.monto ? '' : 'disabled'}>Liberar</button><button type="button" class="btn" data-a="hoja" data-hoja="moverApartado" data-id="${a.id}" data-fk="ap-mover" ${a.monto && st.apartados.length > 1 ? '' : 'disabled'}>Mover a otro</button></div>
                </div>
            </section>
            <div class="nota nota--info" role="note">${icon('info')}<p>Apartar no mueve tu dinero de lugar: es una etiqueta. Sigue en ${esc(st.lugares.map((l) => l.nombre).join(' y '))}.</p></div>
            ${tarjetaSeccion('Meta', `<div class="dato"><p class="dato-n">${a.meta ? dinero(a.meta) : 'Sin meta'}</p><p class="fila-s">${a.metaFecha ? 'Para el ' + esc(M.fechaLarga(a.metaFecha)) : 'Sin fecha'}</p></div><div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="meta" data-id="${a.id}" data-fk="ap-meta">${a.meta ? 'Cambiar meta' : 'Ponerle meta'}</button></div>`, { id: 'ap-meta-t' })}
            ${tarjetaSeccion('Historial', a.historial.length ? `<ul class="lista">${a.historial.map((h) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(h.tipo === 'usar' ? '🎉' : h.tipo === 'liberar' ? '🔓' : '🐷')}<span class="fila-txt"><span class="fila-t">${h.tipo === 'apartar' ? 'Apartaste' : h.tipo === 'liberar' ? 'Liberaste' : h.tipo === 'usar' ? 'Lo usaste' : h.tipo === 'entra' ? 'Llegó de ' + esc(h.de) : 'Pasaste a ' + esc(h.a)}</span><span class="fila-s">${esc(M.capital(M.fechaLarga(h.fecha)))}</span></span><span class="fila-m">${montoHtml(h.monto, 'neutro')}</span></div></li>`).join('')}</ul>` : '<p class="vacio">Todavía nada.</p>', { id: 'ap-hist' })}
        </div>`;
    };

    S.ingreso = function ({ id }) {
        const st = P.st;
        const ing = M.ingreso(st, id);
        const atrasTexto = P.ui.stack.length > 1 ? 'Atrás' : P.ui.tab === 'hoy' ? 'Hoy' : 'Pagos';
        const frecuencia = ing.frecuencia === 'quincenal' ? 'Cada quincena, el 15 y el 30' : ing.frecuencia === 'semanal' ? `Cada ${M.DIAS[ing.diaSemana]}` : ing.frecuencia === 'unico' ? `Una vez, el ${M.fechaLarga(ing.fecha)}` : `Cada mes, el ${ing.dia}`;
        const pendientes = M.ocurrenciasIngreso(st, ing, ing.desde, M.sumarDias(st.hoy, 400)).filter((o) => o.estado !== 'llego');
        const prox = pendientes[0];
        const llegadas = Object.entries(ing.llegadas).sort((a, b) => (a[0] < b[0] ? 1 : -1));
        return `<div class="pg">
            ${encabezado(`${emo(ing.emoji, 28)} ${esc(ing.nombre)}`, `${esc(frecuencia)} · cae en ${esc(M.lugar(st, ing.lugar)?.nombre || '—')}`, { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Ingreso esperado">
                <p class="cifra cifra--ingreso">${dinero(ing.monto, { signo: true, aprox: ing.aprox })}</p>
                <p class="fila-s">${ing.principal ? 'Tu ingreso principal: tu libre se calcula hasta que llegue.' : 'No suma a tu libre hasta que llegue. Cuando llegue, te ayudo a repartirlo.'}</p>
                ${prox ? `<p class="fila-s">Próximo: ${esc(M.capital(M.fechaLarga(prox.fecha)))}</p>${prox.fecha <= st.hoy || ing.extra ? `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="ingresoLlego" data-id="${ing.id}" data-fecha="${prox.fecha}" data-fk="ing-llego">Ya llegó</button>` : ''}` : ''}
            </section>
            ${tarjetaSeccion('Llegadas', llegadas.length ? `<ul class="lista">${llegadas.map(([f, l]) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(ing.emoji)}<span class="fila-txt"><span class="fila-t">${esc(M.capital(M.fechaLarga(f)))}</span><span class="fila-s">Llegó</span></span><span class="fila-m">${montoHtml(l.monto, 'ingreso')}</span></div></li>`).join('')}</ul>` : '<p class="vacio">Todavía no ha llegado.</p>', { id: 'i-hist' })}
        </div>`;
    };

    // ---- Tu espacio, invitar y aprende
    S.espacio = function () {
        const st = P.st;
        return `<div class="pg">
            ${encabezado('Tu espacio', esc(st.espacio), { atras: 'Hoy' })}
            <section class="card" aria-labelledby="esp-quien"><div class="card-h"><h2 class="card-t" id="esp-quien">Quién lo lleva</h2></div>
                <ul class="lista"><li class="fila"><div class="fila-main fila-main--quieta"><span class="avatar avatar--s" aria-hidden="true">${esc((st.nombre || 'T').charAt(0))}</span><span class="fila-txt"><span class="fila-t">${esc(st.nombre || 'Tú')} (tú)</span><span class="fila-s">Lleva el dinero, los pagos y los apartados</span></span></div></li></ul>
                <p class="txt txt--card">Hoy una persona lleva el hogar. Si tu pareja aporta su salario, agrégalo como ingreso esperado.</p>
                <div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="nuevoIngreso" data-fk="esp-ingreso">${icon('plus', 'ico-s')}Ingreso esperado</button></div>
            </section>
            <section class="card card--futuro" aria-labelledby="esp-inv"><div class="card-h"><h2 class="card-t" id="esp-inv">Invitar a alguien</h2><span class="pronto">Próximamente</span></div>
                <p class="txt txt--card">Pronto podrás compartir este espacio con tu pareja o alguien de tu casa.</p>
                <div class="card-pie"><button type="button" class="btn btn--full" data-a="abrir" data-tipo="invitar" data-fk="esp-invitar">${icon('user-plus', 'ico-s')}Ver cómo sería</button></div>
            </section>
        </div>`;
    };
    S.invitar = function () {
        const st = P.st;
        return `<div class="pg">
            ${encabezado('Invitar a alguien', '<span class="pronto">Próximamente</span> · todavía no está disponible', { atras: 'Tu espacio' })}
            <div class="ilus-centro"><svg class="app-illustration" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.bienvenida}</svg></div>
            <section class="card" aria-labelledby="inv-que"><div class="card-h"><h2 class="card-t" id="inv-que">Lo que podrían hacer juntos en «${esc(st.espacio)}»</h2></div>
                <ul class="lista">
                    <li class="fila"><div class="fila-main fila-main--quieta">${caja('👀')}<span class="fila-txt"><span class="fila-t">Ver el mismo número</span><span class="fila-s">Los dos ven cuánto queda libre hasta el próximo ingreso.</span></span></div></li>
                    <li class="fila"><div class="fila-main fila-main--quieta">${caja('✍️')}<span class="fila-txt"><span class="fila-t">Anotar desde su teléfono</span><span class="fila-s">Lo que anota uno, lo ve el otro.</span></span></div></li>
                    <li class="fila"><div class="fila-main fila-main--quieta">${caja('🔔')}<span class="fila-txt"><span class="fila-t">Avisos para ambos</span><span class="fila-s">Nadie se queda sin saber que vence la luz.</span></span></div></li>
                </ul>
            </section>
            <p class="txt">Por ahora, el salario de tu pareja entra como ingreso esperado en Pagos.</p>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="interesInvitar" data-fk="inv-interes" ${st.interesInvitar ? 'disabled' : ''}>${st.interesInvitar ? `${icon('check', 'ico-s')}Te avisaremos` : 'Me interesa'}</button>
        </div>`;
    };
    S.aprende = function () {
        const temas = [['💳', 'Cómo leer tu estado de cuenta', 'Pago de contado, pago mínimo y fecha de corte.'], ['⚖️', 'Pago mínimo o pago total', 'Qué pasa con lo que no pagas.'], ['🛟', 'Para qué sirve un fondo de emergencia', 'Cuánto juntar y dónde tenerlo.'], ['🎁', 'Aguinaldo y Quincena 25', 'Cómo repartir lo que llega una vez al año.'], ['🤝', 'El cuchubal en tus cuentas', 'Tu aporte es un pago; tu turno, un ingreso.']];
        return `<div class="pg">
            ${encabezado('Aprende', 'Consejos cortos, sin sermones', { atras: 'Hoy' })}
            <p class="txt">Mientras usas PamPlanea te damos consejos en el momento justo, como al anotar tu estado de cuenta. Aquí vivirán los temas completos.</p>
            ${tarjetaSeccion(`Temas <span class="pronto">Próximamente</span>`, `<ul class="lista">${temas.map(([e, t, s]) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(e)}<span class="fila-txt"><span class="fila-t">${esc(t)}</span><span class="fila-s">${esc(s)}</span></span></div></li>`).join('')}</ul>`, { id: 'apr-temas' })}
        </div>`;
    };
    S.avisos = function () {
        const st = P.st;
        return `<div class="pg">
            ${encabezado('Avisos', 'Cómo y cuándo te avisamos', { atras: 'Hoy' })}
            ${tarjetaSeccion('Por dónde', `<ul class="lista"><li class="fila fila--switch"><span class="fila-txt"><span class="fila-t">Notificación de la app</span><span class="fila-s">En tu teléfono, con la app instalada</span></span><button type="button" class="switch" role="switch" aria-checked="true" data-a="switchSimple" data-fk="sw-app" aria-label="Notificación de la app"><span></span></button></li><li class="fila fila--switch"><span class="fila-txt"><span class="fila-t">Correo de respaldo</span><span class="fila-s">Por si no viste la notificación</span></span><button type="button" class="switch" role="switch" aria-checked="true" data-a="switchSimple" data-fk="sw-correo" aria-label="Correo de respaldo"><span></span></button></li></ul>`, { id: 'av-donde' })}
            ${tarjetaSeccion('Recientes', st.avisos.length ? `<ul class="lista">${st.avisos.map((a) => `<li class="fila"><button type="button" class="fila-main" data-a="abrirAviso" data-id="${a.id}" data-fk="av-${a.id}">${caja(a.emoji || '🔔')}<span class="fila-txt"><span class="fila-t">${esc(a.titulo)}</span><span class="fila-s">${esc(a.texto)}</span><span class="fila-s">${esc(M.capital(M.fechaCorta(a.fecha)))} · ${esc(a.hora)}</span></span></button></li>`).join('')}</ul>` : '<p class="vacio">Sin avisos todavía.</p>', { id: 'av-rec' })}
        </div>`;
    };

    // ------------------------------------------------------------------ acciones de pantalla
    P.acciones = {
        tab: (d) => P.irTab(d.tab),
        irTab: (d) => P.irTab(d.tab),
        abrir: (d) => P.abrir(d.tipo, d.id),
        atras: () => P.atras(),
        deshacer: () => P.deshacerUltimo(),
        descartar: (d) => {
            P.ui.descartados[d.id] = true;
            render({ foco: '#pantalla h1' });
        },
        cerrarBanner: () => {
            P.ui.banner = null;
            P.renderBanner();
        },
        abrirAviso: (d) => {
            const a = P.st.avisos.find((x) => x.id === d.id);
            P.ui.banner = null;
            P.renderBanner();
            P.emitir('aviso:abierto' + (a && a.clave ? ':' + a.clave : ''));
            if (!a || !a.accion) return;
            const x = a.accion;
            if (x.tipo === 'pago') P.abrir('pago', x.id);
            else if (x.tipo === 'tarjeta') P.abrir('tarjeta', x.id);
            else if (x.tipo === 'hoja') P.abrirHoja(x.hoja, x.datos || {});
            else if (x.tipo === 'aldia') P.abrir('aldia');
            else if (x.tipo === 'tab') P.irTab(x.tab);
        },
        pagosVista: (d) => {
            P.ui.pagosVista = d.v;
            render();
            P.emitir('pagos:' + d.v);
        },
        pagosMes: (d) => {
            const base = P.ui.pagosMes || P.st.hoy.slice(0, 7);
            const [y, m] = M.mesMas(...base.split('-').map(Number), Number(d.d));
            P.ui.pagosMes = `${y}-${M.pad(m)}`;
            render();
        },
        mesNav: (d) => {
            const base = P.ui.mesVista || P.st.hoy.slice(0, 7);
            const [y, m] = M.mesMas(...base.split('-').map(Number), Number(d.d));
            P.ui.mesVista = `${y}-${M.pad(m)}`;
            P.ui.mesCategoria = null;
            render();
        },
        mesFiltro: (d) => {
            P.ui.mesFiltro = d.v;
            render();
        },
        mesCategoria: (d) => {
            P.ui.mesCategoria = P.ui.mesCategoria === d.id ? null : d.id;
            if (P.ui.mesCategoria) P.ui.mesFiltro = 'todo';
            render({ foco: P.ui.mesCategoria ? '#mes-hist' : null });
            if (P.ui.mesCategoria) document.getElementById('mes-hist')?.scrollIntoView({ block: 'start' });
            P.emitir('mes:categoria');
        },
        avisoSwitch: (d) => {
            const p = M.pago(P.st, d.id);
            const a = p.avisos[Number(d.i)];
            a.on = !a.on;
            render();
        },
        switchSimple: (d, el) => {
            el.setAttribute('aria-checked', el.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
        },
        interesInvitar: () => {
            P.st.interesInvitar = true;
            render({ foco: '[data-fk="inv-interes"]' });
            P.avisar('Gracias, te avisaremos cuando esté listo');
            P.emitir('invitar:interes');
        },
    };
    P.textoHorizonte = textoHorizonte;

    // ------------------------------------------------------------------ eventos
    function alClic(e) {
        const mask = e.target.classList && e.target.classList.contains('mask');
        if (mask) {
            P.cerrarHoja();
            return;
        }
        const el = e.target.closest('[data-a]');
        if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        const accion = P.acciones[el.dataset.a];
        if (accion) {
            e.preventDefault();
            accion(el.dataset, el);
        }
    }
    function alTeclear(e) {
        // Foco atrapado en la hoja abierta: Tab da la vuelta dentro de ella.
        if (e.key === 'Tab' && P.ui.hoja) {
            const hoja = document.querySelector('.hoja');
            const enfocables = hoja ? [...hoja.querySelectorAll('button:not([disabled]), input, textarea')].filter((x) => x.getClientRects().length) : [];
            if (enfocables.length) {
                const primero = enfocables[0];
                const ultimo = enfocables[enfocables.length - 1];
                if (!hoja.contains(document.activeElement) || (!e.shiftKey && document.activeElement === ultimo)) {
                    e.preventDefault();
                    (e.shiftKey ? ultimo : primero).focus();
                } else if (e.shiftKey && document.activeElement === primero) {
                    e.preventDefault();
                    ultimo.focus();
                }
            }
        }
        if (e.key === 'Escape') {
            if (P.ui.hoja) {
                e.preventDefault();
                P.cerrarHoja();
            } else if (P.ui.banner) {
                P.ui.banner = null;
                P.renderBanner();
            }
        }
    }
    function alEscribir(e) {
        const el = e.target;
        if (el.dataset && el.dataset.campo && P.alCampo) P.alCampo(el, e);
    }

    // ------------------------------------------------------------------ tema
    P.aplicarTema = function (tema) {
        const [palette, mode] = String(tema || 'serena-claro').split('-');
        const root = document.documentElement;
        root.dataset.palette = palette === 'ancla' ? 'ancla' : 'serena';
        root.dataset.mode = mode === 'oscuro' ? 'dark' : 'light';
        P.tema = tema;
    };

    window.addEventListener('DOMContentLoaded', () => {
        const app = document.getElementById('app');
        app.addEventListener('click', alClic);
        app.addEventListener('input', alEscribir);
        app.addEventListener('change', alEscribir);
        document.addEventListener('keydown', alTeclear);
    });
})();
