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
        // V2-73: un pago resta (−) y un ingreso esperado suma (+). Un estimado sigue sin «+~» ni «−~» (acuerdo de la v2.3:
        // «un estimado se escribe «~$597»»): lo que dice que suma es la etiqueta «Ingreso» y la marca del día.
        if (tipo === 'pago') return `<span class="monto monto--pago"><span class="sr-only">Pago: </span>${aprox ? dinero(c, { aprox }) : dinero(-c)}</span>`;
        if (tipo === 'esperado') return `<span class="monto monto--esperado"><span class="sr-only">Ingreso esperado: </span>${aprox ? '' : '+'}${dinero(c, { aprox })}</span>`;
        if (tipo === 'neutro') return `<span class="monto monto--neutro">${icon('arrow-left-right', 'ico-xs')}${dinero(c, { aprox })}</span>`;
        return `<span class="monto">${dinero(c, { aprox })}</span>`;
    }
    const sr = (t) => `<span class="sr-only">${esc(t)}</span>`;
    /** V2-73: «Ingreso» (flecha hacia abajo: entra) o «Pago» (flecha hacia arriba: sale), con texto, nunca solo color. */
    const marcaMov = (tipo) => (tipo === 'ingreso' ? `<span class="mov mov--ingreso">${icon('arrow-down', 'ico-xs')}Ingreso</span>` : `<span class="mov mov--pago">${icon('arrow-up', 'ico-xs')}Pago</span>`);
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
        if (!st.configurado) P.ui.ob = { paso: 0, datos: P.obVacio() };
        render({ nueva: true });
    };
    P.calc = () => M.calcular(P.st);
    P.marcaMov = marcaMov;
    /** El Primer día está a la vista: sin configurar o en «Completar tu Primer día» (V2-68). */
    P.enPrimerDia = () => !!(P.ui && P.ui.ob && P.st && (!P.st.configurado || P.ui.ob.completar));

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
        // v2.6.1 (QA H-01): si otra pestaña guardó tus datos, primero se cargan; el cambio se hace sobre lo más nuevo.
        if (P.antesDeCambiar) P.antesDeCambiar();
        const antes = structuredClone(P.st);
        // Deshacer guarda los últimos 30 pasos (con cientos de anotaciones, más memoria no ayuda).
        if (P.deshacer.length >= 30) P.deshacer.shift();
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

        const enOnboarding = P.enPrimerDia();
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
        if (!hz || hz.esHoy || hz.atrasada || !hz.ingreso) return rel;
        if (o.fecha === hz.fecha) return `${rel}, día de tu ${nombreIngreso(hz)}`;
        return o.fecha > hz.fecha ? `${rel} · después de tu ${nombreIngreso(hz)}` : rel;
    };
    P.fechaPagoTexto = fechaPagoTexto;
    function nombreIngreso(hz) {
        if (!hz.ingreso) return 'ingreso';
        return hz.ingreso.frecuencia === 'quincenal' ? 'quincena' : hz.ingreso.frecuencia === 'semanal' || hz.ingreso.frecuencia === 'catorcenal' ? 'pago' : hz.ingreso.nombre.toLowerCase();
    }
    P.nombreIngreso = nombreIngreso;
    /** «Hasta tu quincena del 30 · en 9 días», «Hasta el viernes · en 2 días», «Hasta fin de mes». */
    function textoHorizonte(hz) {
        if (!hz.ingreso) return hz.modo === 'quince' ? `Próximos 15 días · hasta el ${M.fechaCorta(hz.fecha)}` : `Hasta fin de mes · ${plural(hz.dias, 'día', 'días')}`;
        if (hz.esHoy) return `Hoy es tu ${nombreIngreso(hz)}`;
        if (hz.atrasada) return `Tu ${nombreIngreso(hz)} del ${M.partes(hz.fecha)[2]} · falta confirmarla`;
        const en = hz.dias === 1 ? 'mañana' : `en ${hz.dias} días`;
        if (hz.ingreso.frecuencia === 'semanal') return `Hasta el ${M.DIAS[M.diaSemana(hz.fecha)]} · ${en}`;
        if (hz.ingreso.frecuencia === 'quincenal') return `Hasta tu quincena del ${M.partes(hz.fecha)[2]} · ${en}`;
        return `Hasta tu ${hz.ingreso.nombre.toLowerCase()} del ${M.fechaCorta(hz.fecha)} · ${en}`;
    }
    P.textoHorizonte = textoHorizonte;

    /**
     * Fila de un pago. En Hoy dice cuándo vence respecto al ingreso; en la línea de tiempo de
     * Pagos la fecha ya es el grupo, así que dice con qué se paga. Si la persona cambió con qué lo
     * paga o lo repartió (V2-34), la fila lo dice: «Reservando $100 de lo que tienes ahora».
     */
    function filaPago(o, hz, { conBoton = true, enLinea = false } = {}) {
        const st = P.st;
        const esTarjeta = !!o.tarjeta;
        const hzRef = hz || M.horizonte(st);
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
            // Un día 29, 30 o 31 en un mes más corto: cae el último día, y se dice.
            if (!esTarjeta && o.pago.frecuencia === 'mensual' && o.pago.dia > M.partes(o.fecha)[2]) sub += ' · último día del mes';
        } else sub = fechaPagoTexto(o, hz);
        // V2-29 #4: el pago del mismo día del ingreso se paga con ese ingreso; se marca.
        if (!esTarjeta && hzRef.ingreso && M.esDiaDeIngreso(st, o.fecha) && o.estado !== 'pagado' && !sub.includes('día de tu')) sub += ` · mismo día de tu ${nombreIngreso(hzRef)}`;
        let partesTxt = '';
        if (!esTarjeta && !o.pago.descuento && (o.estado === 'pendiente' || o.estado === 'vencido')) {
            const partes = P.partesDe(o, hzRef);
            if (cambiada(o, partes, hzRef)) partesTxt = `<span class="fila-s fila-s--res">${icon('hand-coins', 'ico-xs')}${esc(textoPartes(o, partes, hzRef))}</span>`;
        }
        if (!esTarjeta && o.pago.descuento) sub = `Se descuenta solo de ${M.ingreso(st, o.pago.descuento)?.nombre.toLowerCase() || 'tu salario'}`;
        return `<li class="fila fila--pago${o.estado === 'pagado' || o.estado === 'saltado' ? ' fila--hecha' : ''}">
            <button type="button" class="fila-main" ${abrir} data-fk="${fk}">
                ${caja(emoji)}
                <span class="fila-txt"><span class="fila-t">${esc(nombre)}</span><span class="fila-s">${enLinea ? marcaMov('pago') : ''}<span>${avisoOn}${esc(sub)}</span></span>${marca ? `<span class="fila-s">${marca}</span>` : ''}${partesTxt}</span>
                <span class="fila-m">${montoHtml(o.monto, 'pago', { aprox: o.estimado })}${o.estimado ? '<span class="fila-s">estimado</span>' : ''}</span>
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
    // ---- v2.4: ayuda en el momento. Un «?» discreto abre 2–3 líneas con un ejemplo (los mismos textos de «Aprende»).
    /** ¿La persona no tiene un ingreso fijo? (ingresos que varían: nunca se le habla de «quincena»). */
    P.variable = () => !!P.st && !M.principal(P.st);
    /** v2.5: el término del glosario (para qué + ejemplo), en la versión de quien no tiene ingreso fijo si hace falta. */
    P.textoTermino = (g) => window.terminoGlosario(g.id, P.variable());
    const termino = (id) => window.terminoGlosario(id, P.variable());
    P.qBtn = (id) => {
        const g = termino(id);
        if (!g) return '';
        return `<button type="button" class="q" data-a="qVer" data-v="${id}" aria-expanded="${!!(P.ui.qAbiertos || {})[id]}" aria-controls="q-${id}" aria-label="¿Qué es «${esc(g.t)}»?" data-fk="q-${id}"><span aria-hidden="true">?</span></button>`;
    };
    P.qTexto = (id) => {
        const g = termino(id);
        return g ? `<div class="q-txt" id="q-${id}" role="note" ${(P.ui.qAbiertos || {})[id] ? '' : 'hidden'}><p><strong>${esc(g.t)}:</strong> ${esc(g.para)}</p><p class="q-ej">Ejemplo: ${esc(g.ejemplo)}</p></div>` : '';
    };
    /** La primera vez que la persona usa cada pantalla con sus datos: un consejo corto, una sola vez. */
    P.tipHtml = (pantalla) => {
        const tips = window.TIPS || {};
        const texto = (P.st && !M.principal(P.st) && tips[pantalla + 'Variable']) || tips[pantalla];
        if (P.modo !== 'uso' || !texto || !P.modos || !P.st || !P.st.configurado || P.modos.tipsVistos()[pantalla]) return '';
        return `<div class="tip" role="note">${icon('lightbulb', 'ico-s')}<p>${esc(texto)}</p><button type="button" class="link" data-a="tipOk" data-v="${pantalla}" data-fk="tip-${pantalla}">Entendido</button></div>`;
    };
    /** «el colegio y la luz», «A, B y C». */
    P.lista = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`);
    /** V2-31 #1: si la tarjeta tiene dos pagos próximos, la fecha lleva el mes («5 de diciembre»). */
    P.diaPago = (info, fecha) => (info && info.dosPagos ? M.fechaLarga(fecha) : String(M.partes(fecha)[2]));

    // ---- «Lo pagas con» (V2-34): de dónde sale el dinero de cada pago
    /** «del 29», o «del 14 de noviembre» si no es de este mes. */
    const delDia = (f) => (f.slice(0, 7) === P.st.hoy.slice(0, 7) ? `del ${M.partes(f)[2]}` : `del ${M.fechaLarga(f)}`);
    /** «tu quincena del 29», «tu pago del viernes 30», «tu salario del 30 nov»; o «lo que tienes ahora». */
    function etiquetaFuente(clave) {
        const st = P.st;
        if (M.esFundado(st, clave)) return 'lo que tienes ahora';
        if (clave === 'despues') return 'lo que tengas cuando venza';
        // V2-52: un ingreso de una vez: «tu aguinaldo del 12 dic».
        if (M.esUnico(clave)) {
            const ing = M.ingresoDeClave(st, clave);
            return ing ? `tu ${ing.nombre.toLowerCase()} del ${M.fechaCorta(ing.fecha)}` : 'un ingreso que ya no está';
        }
        const p = M.principal(st);
        if (p && (p.frecuencia === 'semanal' || p.frecuencia === 'catorcenal')) return `tu pago del ${M.DIAS[M.diaSemana(clave)]} ${M.partes(clave)[2]}${clave.slice(0, 7) === st.hoy.slice(0, 7) ? '' : ' de ' + M.MESES[M.partes(clave)[1] - 1]}`;
        if (p && p.frecuencia === 'quincenal') return `tu quincena ${delDia(clave)}`;
        return `tu ${(p ? p.nombre : 'ingreso').toLowerCase()} ${delDia(clave)}`;
    }
    P.etiquetaFuente = etiquetaFuente;
    /** Las partes de un pago con texto: «Reservando $100 de lo que tienes ahora · $100 con tu quincena del 29». */
    function textoPartes(o, partes, hz) {
        const st = P.st;
        if (partes.length === 1) {
            const x = partes[0];
            if (!M.esFundado(st, x.de)) return `Con ${etiquetaFuente(x.de)}`;
            return o.fecha >= hz.fecha && o.estado !== 'vencido' ? 'Reservado de lo que tienes ahora' : 'Con lo que tienes ahora';
        }
        return M.capital(partes.map((x) => (M.esFundado(st, x.de) ? `reservando ${dinero(x.monto)} de lo que tienes ahora` : `${dinero(x.monto)} con ${etiquetaFuente(x.de)}`)).join(' · '));
    }
    P.textoPartes = textoPartes;
    /** ¿La persona cambió con qué lo paga (o lo repartió)? Entonces se dice en la fila. */
    P.partesDe = (o, hz) => M.asignacion(P.st, o.pago, o.fecha, o.monto, hz);
    const cambiada = (o, partes, hz) => partes.length > 1 || partes[0].de !== M.periodoDe(P.st, o.fecha, hz);
    /** «tu quincena del 14 nov», «Salario de Luis del 30 nov»: un pago de un ingreso que se repite. */
    P.etiquetaPagoIngreso = (ingresoId, fecha) => {
        const ing = M.ingreso(P.st, ingresoId);
        if (!ing) return 'un ingreso que ya no está';
        return ing.principal && ing.frecuencia === 'quincenal' ? `tu quincena del ${M.fechaCorta(fecha)}` : `${ing.principal ? 'tu ' + ing.nombre.toLowerCase() : ing.nombre} del ${M.fechaCorta(fecha)}`;
    };
    /** «de tu pareja», «de la remesa», «de Comisión». */
    P.deQuien = (ing) => (/pareja|espos|marido|novi/i.test(ing.nombre) ? 'de tu pareja' : ing.categoria === 'remesa' || /remesa/i.test(ing.nombre) ? 'de la remesa' : ing.adelanto || ing.tipoIngreso === 'adelanto' || /adelanto|anticipo|vale/i.test(ing.nombre) ? 'de adelanto' : /aguinaldo/i.test(ing.nombre) ? 'de aguinaldo' : /^bono/i.test(ing.nombre) ? 'de bono' : `de «${ing.nombre}»`);
    const ARTICULOS = { alquiler: 'el alquiler', luz: 'la luz', agua: 'el agua', internet: 'el internet', colegio: 'el colegio', telefono: 'el teléfono', cable: 'el cable', prestamo: 'el préstamo', cuchubal: 'el cuchubal', laptop: 'la laptop', regalo: 'el regalo', vacaciones: 'las vacaciones', 'casa comercial': 'la casa comercial', matricula: 'la matrícula', uniformes: 'los uniformes', seguro: 'el seguro' };
    // «Cuchubal (tu aporte)» → «el cuchubal»: basta con que empiece con un nombre conocido.
    P.conArticulo = (nombre) => ARTICULOS[M.normalizar(nombre)] || ARTICULOS[M.normalizar(nombre).replace(/s*(.*)$/, '')] || ARTICULOS[M.normalizar(nombre).split(' ')[0]] || `«${nombre}»`;

    /** Con libre $0: el faltante exacto (V2-31 #6), de los pagos o de los ahorros. */
    P.textoCero = (k) => (k.faltaPagos > 0 ? `Te faltan ${dinero(k.faltaPagos)} para cubrir lo que viene` : k.sinCubrir > 0 ? `Faltan ${dinero(k.sinCubrir)} para cubrir tus ahorros` : 'Justo te alcanza: no te queda libre');
    /** «Próxima quincena (29)», «Próximo pago (viernes 23)», «Tu quincena del 29 (falta confirmarla)». */
    function tituloPeriodo(x, hz) {
        const st = P.st;
        const p = M.principal(st);
        if (!p) return st.horizonteVariable === 'quince' ? `Los 15 días siguientes (hasta el ${M.fechaCorta(x.fin)})` : `El próximo mes (${M.MESES[M.partes(x.inicio)[1] - 1]})`;
        const d = M.partes(x.clave)[2];
        const pendiente = x.clave <= st.hoy;
        // Solo el primero que viene es «el próximo»; los demás se nombran por su fecha.
        const primero = (hz.atrasadas || []).length ? hz.atrasadas[0].fecha : hz.esHoy ? st.hoy : hz.fecha;
        if (!pendiente && x.clave !== primero) return M.capital(etiquetaFuente(x.clave));
        if (p.frecuencia === 'semanal' || p.frecuencia === 'catorcenal') return pendiente ? `Tu pago del ${M.DIAS[M.diaSemana(x.clave)]} ${d} (falta confirmarlo)` : `Próximo pago (${M.DIAS[M.diaSemana(x.clave)]} ${d})`;
        if (p.frecuencia === 'quincenal') return pendiente ? `Tu quincena del ${d} (falta confirmarla)` : `Próxima quincena (${d})`;
        return pendiente ? `Tu ${p.nombre.toLowerCase()} del ${M.fechaCorta(x.clave)} (falta confirmarlo)` : `Próximo ${p.nombre.toLowerCase()} (${M.fechaCorta(x.clave)})`;
    }
    P.tituloPeriodo = tituloPeriodo;
    /** «entra ~$1,163 · pagos ~$713 · te quedarían ~$450» (V2-35): lo que entra es estimado. */
    function lineaPeriodo(x) {
        // V2-59 (#27): sin ingreso fijo y sin nada esperado, no se dice «entra ~$0»: las ventas cuentan cuando se anotan.
        if (P.variable() && !x.entra) return `pagas ${dinero(x.pagos, { aprox: true })} · tus ventas cuentan cuando las anotas`;
        const quedan = x.quedan >= 0 ? `te quedarían ${dinero(x.quedan, { aprox: true })}` : `te faltarían ${dinero(-x.quedan, { aprox: true })}`;
        return `ingreso ${dinero(x.entra, { aprox: true })} · pagos ${dinero(x.pagos, { aprox: true })} · ${quedan}`;
    }
    /** ¿Se marca en color de «falta»? Para quien vende, no tener nada esperado no es un faltante (V2-59 #27). */
    P.faltaPeriodo = (x) => x.deficit > 0 && !(P.variable() && !x.entra);
    /** V2-59 (#27): lo vendido este mes, como referencia (no se suma a lo que entra). */
    function ventasPeriodo(x) {
        if (!P.variable()) return '';
        const st = P.st;
        const mes = st.hoy.slice(0, 7);
        const ventas = M.suma(
            st.registros.filter((r) => r.tipo === 'ingreso' && r.categoria === 'venta' && r.fecha.slice(0, 7) === mes && r.fecha <= st.hoy),
            (r) => r.monto,
        );
        return [x.entra ? 'tus ventas cuentan cuando las anotas' : '', ventas ? `este mes llevas ${dinero(ventas)} en ventas` : ''].filter(Boolean).join(' · ');
    }
    P.lineaPeriodo = lineaPeriodo;
    /** «lo de tu pareja (el 29)», «tu quincena (el 14)», «el adelanto (el 20)»: lo que llega después de un faltante. */
    function queLlega(o) {
        const ing = o.ingreso;
        const quien = ing.principal ? (ing.frecuencia === 'quincenal' ? 'tu quincena' : ing.frecuencia === 'semanal' || ing.frecuencia === 'catorcenal' ? 'tu pago' : `tu ${ing.nombre.toLowerCase()}`) : ing.adelanto || ing.tipoIngreso === 'adelanto' || /adelanto|anticipo|vale/i.test(ing.nombre) ? 'el adelanto' : /aguinaldo/i.test(ing.nombre) ? 'el aguinaldo' : /^bono/i.test(ing.nombre) ? 'el bono' : 'lo ' + P.deQuien(ing);
        return `${quien} (el ${M.partes(o.fecha)[2]})`;
    }
    /** Antes de la v2.4: un faltante solo por fechas dice el día y la causa: «El 16 te faltarían ~$51 hasta que llegue lo de tu pareja (el 29)». */
    P.textoFaltaFechas = (x) => `El ${M.partes(x.cuando)[2]} te faltarían ${dinero(x.deficit, { aprox: true })} hasta que llegue ${x.cubre ? queLlega(x.cubre) : 'lo demás'}`;
    /** «incluye ~$566 de tu pareja y ~$314 de adelanto · te descuentan $314 del adelanto». */
    function incluyePeriodo(x) {
        const partes = x.otros.map((o) => `${dinero(o.monto, { aprox: true })} ${P.deQuien(o.ingreso)}`);
        for (const r of x.adelantos || []) partes.push(`${dinero(r.monto)} ${P.deQuien(r.adelanto.ingreso)}, que ya llegó`);
        if (x.entraGuardado) partes.push(`${dinero(x.entraGuardado)} que pasaste de antes`);
        // Adelanto de salario: lo que te descuentan de lo que te cae en este periodo.
        const descuento = M.suma(x.ingresos || [], (o) => o.descuento || 0);
        const texto = partes.length ? `incluye ${P.lista(partes)}` : '';
        return [texto, descuento ? `te descuentan ${dinero(descuento)} del adelanto` : '', ventasPeriodo(x)].filter(Boolean).join(' · ');
    }
    P.incluyePeriodo = incluyePeriodo;
    /** V2-35: debajo del número, cómo quedas el próximo día de pago. Al tocarlo, Pagos → Próxima. */
    function proyeccionHtml(k) {
        const x = k.proxima;
        if (!x || (!x.entra && !x.pagos)) return '';
        const inc = incluyePeriodo(x);
        return `<button type="button" class="proy" data-a="irProxima" data-fk="proyeccion" aria-label="${esc(tituloPeriodo(x, k.hz))}: ${esc(lineaPeriodo(x))}${inc ? '. ' + esc(inc) : ''}. Ver en Pagos">
            <span class="proy-t">${icon('calendar-days', 'ico-s')}${esc(tituloPeriodo(x, k.hz))}</span>
            <span class="proy-l${P.faltaPeriodo(x) ? ' proy-l--falta' : ''}">${esc(lineaPeriodo(x))}</span>
            ${inc ? `<span class="proy-s">${esc(inc)}</span>` : ''}
            ${x.soloFechas ? `<span class="proy-s">Ojo: ${esc(P.textoFaltaFechas(x).replace(/^El /, 'el '))}.</span>` : ''}
            ${icon('chevron-right', 'ico-xs proy-ir')}
        </button>`;
    }
    P.proyeccionHtml = proyeccionHtml;

    /**
     * V2-42: lo que necesita atención, en una sola lista. Hoy muestra como máximo UN aviso: el único que
     * haya o «3 avisos · Ver». Rojo solo si de verdad no alcanza; ámbar para sugerencias.
     */
    function atencion(k) {
        const st = P.st;
        const hz = k.hz;
        const items = [];
        const btn = (txt, attrs, prim = false) => `<button type="button" class="btn btn--sm${prim ? ' btn--prim' : ''}" ${attrs}>${txt}</button>`;
        for (const a of k.avisos) {
            if (a.tipo === 'falta') {
                const o = a.primero;
                const titulo = o && a.nivel === 'rojo' ? `${o.estado === 'vencido' ? 'Te faltarían' : `El ${M.partes(o.fecha)[2]} te faltarían`} ${dinero(Math.min(a.faltan, o.parte))} para ${P.conArticulo(o.pago.nombre)}` : `Te faltan ${dinero(a.faltan)} para cubrir lo que viene`;
                const texto = a.nivel === 'rojo' ? 'Mira qué puedes mover o sacar de tus ahorros, o cambia con qué pagas algo.' : `Te alcanza cuando llegue ${P.lista(a.esperados.map((x) => `${dinero(x.monto, { aprox: x.aprox })} ${P.deQuien(x.ingreso)}`))}.`;
                items.push({ id: 'falta', nivel: a.nivel, pago: true, titulo, texto, corto: `te faltan ${dinero(a.faltan)}`, acciones: btn('Ver detalle', 'data-a="hoja" data-hoja="desglose" data-fk="at-falta"') });
            } else if (a.tipo === 'sugerencia') {
                const x = a.periodo;
                const no = btn('No, después veo', `data-a="sugerenciaNo" data-id="${x.clave}" data-v="${x.deficit}" data-fk="at-sug-no"`);
                // Faltante solo por fechas: «¿Lo pagas con…?» (el pago que vence antes) o «Reservar $51» (solo lo que falta).
                const acciones = x.soloFechas
                    ? (x.primero ? btn(`Pagarlo con ${a.fuente === 'ahora' ? 'lo que tienes' : etiquetaFuente(a.fuente)}`, `data-a="hoja" data-hoja="pagarCon" data-id="${x.primero.pago.id}" data-fecha="${x.primero.fecha}" data-sugerida="${a.fuente}" data-fk="at-sug-pagar"`, true) : '') + btn(`Reservar ${dinero(x.deficit)}`, `data-a="hoja" data-hoja="reservar" data-id="${x.clave}" data-fecha="${a.fuente}" data-fk="at-sug-si"`, !x.primero) + no
                    : btn(`Sí, ${dinero(x.deficit)}`, `data-a="hoja" data-hoja="reservar" data-id="${x.clave}" data-fecha="${a.fuente}" data-fk="at-sug-si"`, true) + no;
                items.push({ id: 'sug-' + x.clave, nivel: 'ambar', pago: true, ...textoSugerencia(a), corto: x.clave === 'despues' && !x.soloFechas ? `${P.variable() ? 'pagas ' + dinero(x.pagos, { aprox: true }) : 'te faltarían ' + dinero(x.deficit, { aprox: true })} ${hz.modo === 'quince' ? 'en los 15 días siguientes' : 'el próximo mes'}` : `te faltarían ${dinero(x.deficit, { aprox: true })} el ${M.partes(x.soloFechas ? x.cuando : x.clave)[2]}`, acciones });
            } else if (a.tipo === 'sinIngreso') {
                // V2-52: lo ibas a pagar con un ingreso de una vez que todavía no llega. Se pregunta; nada cambia solo.
                const x = a.parte;
                const art = P.conArticulo(x.pago.nombre);
                const loLa = art.startsWith('la ') ? 'la' : art.startsWith('las ') ? 'las' : art.startsWith('los ') ? 'los' : 'lo';
                const ing = x.ingreso;
                const nombreIng = /^(aguinaldo|bono)/i.test(ing.nombre) ? 'el ' + ing.nombre.toLowerCase() : /^quincena/i.test(ing.nombre) ? 'la ' + ing.nombre : `«${ing.nombre}»`;
                const llega = ing.llegadas && ing.llegadas[ing.fecha] && ing.llegadas[ing.fecha].noLlego ? 'que no va a llegar' : 'que todavía no llega';
                items.push({ id: `sin-${x.pago.id}-${x.fecha}`, nivel: 'ambar', pago: true, titulo: `${M.capital(art)} ${loLa} ibas a pagar con ${nombreIng}, ${llega}. ¿Con qué ${loLa} pagas?`, texto: `${dinero(x.parte, { aprox: x.estimado })}, ${x.estado === 'vencido' ? 'venció' : 'vence'} el ${M.fechaCorta(x.fecha)}.`, corto: `${art} (con ${nombreIng})`, acciones: btn('Elegir con qué', `data-a="hoja" data-hoja="pagarCon" data-id="${x.pago.id}" data-fecha="${x.fecha}" data-fk="at-sin-${x.pago.id}"`, true) });
            } else if (a.tipo === 'apartados') {
                items.push({ id: 'ahorros', nivel: 'ambar', corto: 'tus ahorros', titulo: `Faltan ${dinero(a.faltan)} para cubrir tus ahorros`, texto: 'Después de tus pagos no te alcanza para todo lo que guardaste. Puedes sacar algo de un ahorro.', acciones: btn('Ver ahorros', 'data-a="irAhorros" data-fk="at-ahorros"') });
            } else if (a.tipo === 'estado') {
                const t = a.info.t;
                items.push({ id: 'estado-' + t.id, nivel: 'ambar', corto: `el estado de cuenta de ${t.nombre}`, titulo: '¿Ya te llegó tu estado de cuenta?', texto: a.info.sinCorte ? `${t.nombre} vence el ${M.fechaCorta(a.info.ult.vence)}. Anótalo con tu día de corte; por ahora contamos ${a.info.usual ? dinero(a.info.usual, { aprox: true }) + ', lo que pagas normalmente' : 'nada'}.` : `${t.nombre} ${a.info.pendiente.corte > st.hoy ? 'corta' : 'cortó'} el ${M.partes(a.info.pendiente.corte)[2]}. Dinos cuánto te salió para contarlo en tu libre.`, acciones: btn('Anotar estado de cuenta', `data-a="hoja" data-hoja="estadoCuenta" data-id="${t.id}" data-fk="estado-${t.id}"`, true) });
            } else if (a.tipo === 'apartadoVencido' && !P.ui.descartados['vencido-' + a.apartado.id]) {
                const ap = a.apartado;
                items.push({ id: 'vencido-' + ap.id, nivel: 'info', corto: `tu ahorro ${ap.nombre}`, titulo: `Tu ahorro ${ap.nombre} era para el ${M.partes(ap.metaFecha)[2]}. ¿Ya lo usaste?`, texto: `Tiene ${dinero(ap.monto)}. Si ya lo gastaste, lo cerramos sin anotar otro gasto.`, acciones: btn('Todavía no', `data-a="descartar" data-id="vencido-${ap.id}" data-fk="ven-no-${ap.id}"`) + btn('Sí, ya lo gasté', `data-a="hoja" data-hoja="yaLoUse" data-id="${ap.id}" data-fk="ven-si-${ap.id}"`, true) });
            }
        }
        // Pagos vencidos sin marcar, los de hoy y los de mañana (agrupados por día).
        const vencidos = [];
        const hoyL = [];
        const manana = [];
        const m1 = M.sumarDias(st.hoy, 1);
        // V2-55: todos los vencidos van aquí (y ya no se repiten en «Próximos pagos»).
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) {
            for (const o of M.ocurrenciasPago(st, p, p.desde, m1)) {
                if (o.estado === 'vencido') vencidos.push(o);
                else if (o.estado === 'pendiente') (o.fecha === st.hoy ? hoyL : manana).push(o);
            }
        }
        for (const o of M.ocurrenciasTarjeta(st, M.sumarDias(st.hoy, -40), m1)) {
            if (o.estado === 'vencido') vencidos.push(o);
            else if (o.estado === 'pendiente') (o.fecha === st.hoy ? hoyL : manana).push(o);
        }
        const nombreO = (o) => (o.tarjeta ? o.tarjeta.nombre : o.pago.nombre);
        const pagadoBtn = (o, fk) => btn('Pagado', `data-a="pagado" data-tipo="${o.tarjeta ? 'tarjeta' : 'pago'}" data-id="${o.tarjeta ? o.tarjeta.id : o.pago.id}" data-fecha="${o.fecha}" data-fk="${fk}" aria-label="Marcar ${esc(nombreO(o))} como pagado"`, true);
        const grupo = (lista, id, uno, varios, corto) => {
            if (!lista.length) return;
            const total = M.suma(lista, (o) => o.monto || 0);
            if (lista.length === 1) {
                const o = lista[0];
                items.push({ id, nivel: id === 'vencidos' ? 'ambar' : 'info', pago: true, corto: corto(lista), titulo: uno(o), texto: o.monto ? dinero(o.monto, { aprox: o.estimado }) + '.' : '', acciones: pagadoBtn(o, `at-${id}-pagado`) + btn('Ver', `data-a="abrir" data-tipo="${o.tarjeta ? 'tarjeta' : 'pago'}" data-id="${o.tarjeta ? o.tarjeta.id : o.pago.id}" data-fk="at-${id}-ver"`) });
            } else {
                // Cada nombre una vez (si se repite, cuántas veces); si son más de ocho, «y N más».
                const cuenta = new Map();
                for (const o of lista) cuenta.set(nombreO(o), (cuenta.get(nombreO(o)) || 0) + 1);
                const nombres = [...cuenta].map(([nm, c]) => (c > 1 ? `${nm} (${c})` : nm));
                const mostrar = nombres.length > 8 ? [...nombres.slice(0, 7), `${nombres.length - 7} más`] : nombres;
                items.push({ id, nivel: id === 'vencidos' ? 'ambar' : 'info', pago: true, corto: corto(lista), titulo: varios(lista.length), texto: `${P.lista(mostrar)} · ${dinero(total, { aprox: lista.some((o) => o.estimado) })}.`, acciones: btn('Ver en Pagos', `data-a="irTab" data-tab="pagos" data-fk="at-${id}-pagos"`) });
            }
        };
        const loLa = (o) => (P.conArticulo(nombreO(o)).startsWith('la ') ? 'la' : 'lo');
        grupo(vencidos, 'vencidos', (o) => `${nombreO(o)}: venció el ${M.fechaCorta(o.fecha)}. ¿Ya ${loLa(o)} pagaste?`, (n) => `${n} pagos vencieron. ¿Ya los pagaste?`, (l) => (l.length === 1 ? `${P.conArticulo(nombreO(l[0]))} vencido` : `${l.length} pagos vencidos`));
        grupo(hoyL, 'hoy', (o) => `Hoy vence ${P.conArticulo(nombreO(o))}`, (n) => `Hoy vencen ${n} pagos`, (l) => (l.length === 1 ? `hoy vence ${P.conArticulo(nombreO(l[0]))}` : `hoy vencen ${l.length} pagos`));
        grupo(manana, 'manana', (o) => `Mañana: ${nombreO(o)}`, (n) => `Mañana vencen ${n} pagos`, (l) => (l.length === 1 ? `mañana vence ${P.conArticulo(nombreO(l[0]))}` : `mañana vencen ${l.length} pagos`));
        // Otros ingresos que ya debían llegar (el principal se confirma en el número).
        for (const ing of st.ingresos.filter((x) => x.activo !== false && !x.principal && x.frecuencia !== 'unico')) {
            const o = M.ocurrenciasIngreso(st, ing, M.sumarDias(st.hoy, -20), st.hoy).filter((x) => x.estado === 'porConfirmar' || x.estado === 'hoy').at(-1);
            if (o) items.push({ id: 'ing-' + ing.id, nivel: 'info', corto: `lo ${P.deQuien(ing)}`, titulo: `¿Ya llegó lo ${P.deQuien(ing)}?`, texto: `${dinero(o.monto, { aprox: o.aprox })}, ${o.fecha === st.hoy ? 'hoy' : 'del ' + M.fechaCorta(o.fecha)}.`, acciones: btn('Sí, ya llegó', `data-a="hoja" data-hoja="ingresoLlego" data-id="${ing.id}" data-fecha="${o.fecha}" data-fk="at-ing-${ing.id}"`, true) });
        }
        // En el entrenamiento: las notificaciones simuladas de hoy que no estén ya en la lista.
        if (P.modo !== 'uso') {
            for (const a of st.avisos.filter((x) => x.fecha === st.hoy && avisoVigente(x))) {
                if (a.accion && a.accion.tipo === 'pago' && [...vencidos, ...hoyL, ...manana].some((o) => o.pago && o.pago.id === a.accion.id)) continue;
                items.push({ id: a.id, nivel: 'info', titulo: a.titulo, texto: a.texto, acciones: btn('Ver', `data-a="abrirAviso" data-id="${a.id}" data-fk="aviso-${a.id}"`) });
            }
        }
        return items.filter((x) => !P.ui.descartados[x.id]);
    }
    P.atencion = atencion;
    /** V2-34 / V2-35: una sugerencia, nunca algo automático. */
    function textoSugerencia(a) {
        const st = P.st;
        const x = a.periodo;
        const p = M.principal(st);
        const semanal = p && (p.frecuencia === 'semanal' || p.frecuencia === 'catorcenal');
        const cual = !p ? 'después' : semanal ? `el ${M.DIAS[M.diaSemana(x.clave)]} ${M.partes(x.clave)[2]}` : `el ${M.partes(x.clave)[2]}`;
        const pagos = [...new Set(x.partes.map((y) => y.pago.nombre))];
        const grande = x.partes.slice().sort((m, n) => n.parte - m.parte)[0];
        const quePagas = pagos.length === 1 ? `${P.conArticulo(pagos[0])} es ${dinero(x.salePagos, { aprox: grande && grande.estimado })}` : `ese periodo pagas ${dinero(x.pagos, { aprox: true })} (${P.lista(pagos.slice(0, 3).map((n) => P.conArticulo(n)))}${pagos.length > 3 ? ' y más' : ''})`;
        // Adelanto de salario: lo que te cae ya viene sin lo que te descuentan.
        const descuento = M.suma(x.ingresos || [], (o) => o.descuento || 0);
        const caen = `${dinero(x.entra, { aprox: true })}${descuento ? ` (ya sin los ${dinero(descuento)} del adelanto)` : ''}`;
        const fuente = a.fuente === 'ahora' ? 'de lo que tienes ahora' : `de ${etiquetaFuente(a.fuente)}`;
        // Antes de la v2.4: en total alcanza; falta solo por las fechas. Se dice el día, la causa y qué hacer.
        if (x.soloFechas) {
            const art = x.primero ? P.conArticulo(x.primero.pago.nombre) : 'un pago';
            const loLa = art.startsWith('la ') ? 'la' : art.startsWith('las ') ? 'las' : art.startsWith('los ') ? 'los' : 'lo';
            return { titulo: `${P.textoFaltaFechas(x)}.`, texto: `En total sí te alcanza, pero ${art} vence antes. ¿${M.capital(loLa)} pagas con ${a.fuente === 'ahora' ? 'lo que tienes ahora' : etiquetaFuente(a.fuente)} o reservas solo ${dinero(x.deficit)}?` };
        }
        // Sin ingreso fijo (ingreso que varía): se habla de fechas, no de «te caen».
        // V2-59 (#27): para quien vende, no «te faltarían»: lo que paga y que sus ventas cuentan cuando las anota.
        if (!p) return { titulo: `Del ${M.fechaCorta(x.inicio)} al ${M.fechaCorta(x.fin)} pagas ${dinero(x.pagos, { aprox: true })}${x.entra ? ` y esperas ${dinero(x.entra, { aprox: true })}` : ''}.`, texto: 'Tus ventas cuentan cuando las anotas. ¿Guardas algo de lo que tienes ahora?' };
        if (a.siguiente) {
            const nombre = semanal ? 'con tu próximo pago' : p.frecuencia === 'quincenal' ? 'la próxima quincena' : `con tu próximo ${p.nombre.toLowerCase()}`;
            return { titulo: `${M.capital(nombre)} te faltarían ${dinero(x.deficit, { aprox: true })}. ¿Guardas algo ${fuente}?`, texto: `${M.capital(cual)} recibes ${caen} y ${quePagas}.` };
        }
        return { titulo: `${M.capital(cual)} recibes ${caen} y ${quePagas}: te faltarían ${dinero(x.deficit, { aprox: true })}.`, texto: `¿Reservas algo ${fuente}?` };
    }
    P.textoSugerencia = textoSugerencia;
    /** El aviso de Hoy: uno solo (V2-42). */
    function avisoHoy(items) {
        if (!items.length) return '';
        const peor = items.some((x) => x.nivel === 'rojo') ? 'rojo' : items.some((x) => x.nivel === 'ambar') ? 'ambar' : 'info';
        const cls = peor === 'rojo' ? 'nota--atencion' : peor === 'ambar' ? 'nota--ambar' : 'nota--info';
        const ico = peor === 'info' ? 'bell' : 'triangle-alert';
        if (items.length === 1) {
            const x = items[0];
            return `<div class="nota ${cls} aviso-hoy" role="note" aria-labelledby="av-hoy-t">${icon(ico)}<div><p class="nota-t" id="av-hoy-t">${esc(x.titulo)}</p>${x.texto ? `<p>${esc(x.texto)}</p>` : ''}<div class="nota-acc">${x.acciones}</div></div></div>`;
        }
        const todosPagos = items.every((x) => x.pago);
        const titulo = todosPagos ? `${items.length} pagos necesitan atención` : `${items.length} avisos para hoy`;
        return `<div class="nota ${cls} aviso-hoy" role="note" aria-labelledby="av-hoy-t">${icon(ico)}<div><p class="nota-t" id="av-hoy-t">${esc(titulo)}</p><p>${esc(M.capital(P.lista(items.slice(0, 3).map((x) => x.corto || x.titulo))))}${items.length > 3 ? ' y más' : ''}.</p><div class="nota-acc"><button type="button" class="btn btn--sm btn--prim" data-a="hoja" data-hoja="atencion" data-fk="aviso-ver">Ver</button></div></div></div>`;
    }

    S.hoy = function () {
        const st = P.st;
        const k = P.calc();
        const hz = k.hz;
        const inicial = (st.nombre || 'T').charAt(0).toUpperCase();
        const fechaHoy = M.capital(M.conDia(st.hoy));
        // V2-29 #3: un día de pago sin confirmar no se supone llegado: «Libre por ahora» + «¿Ya te cayó?».
        const porConfirmar = hz.esHoy ? hz.ocurrencia : (hz.atrasadas || []).at(-1) || null;
        const ultimaTarjeta = k.tarjetas.find((x) => x.porPagarEstado + x.estimado > 0);
        const lineas = [];
        if (porConfirmar) lineas.push(`<span class="portada-s">${hz.esHoy ? 'Confírmala para ver el número nuevo' : `Falta confirmar tu ${esc(nombreIngreso(hz))} del ${M.partes(porConfirmar.fecha)[2]}`}</span>`);
        else if (k.porDia !== null) lineas.push(`<span class="portada-s">~${dinero(k.porDia, { aprox: true }).replace('~', '')} por día</span>`);
        else if (k.libre <= 0) lineas.push(`<span class="portada-s">${P.textoCero(k)}</span>`);
        if (porConfirmar && k.libre <= 0 && (k.faltaPagos || k.sinCubrir)) lineas.push(`<span class="portada-v">${P.textoCero(k)}</span>`);
        // V2-29 #1: el pago de la tarjeta que vence después del ingreso ya baja el libre; se dice.
        if (ultimaTarjeta) lineas.push(`<span class="portada-v">Incluye tarjeta ${dinero(ultimaTarjeta.porPagarEstado + ultimaTarjeta.estimado, { aprox: ultimaTarjeta.estimado > 0 })}, ${ultimaTarjeta.ult.vence < st.hoy ? 'venció' : 'vence'} el ${P.diaPago(ultimaTarjeta, ultimaTarjeta.ult.vence)}</span>`);
        const reservado = k.reservadoPagos + k.reservadoProxima;
        if (reservado > 0) lineas.push(`<span class="portada-v">Ya reservas ${dinero(reservado)} para lo que viene</span>`);
        if (k.inactivo >= 10) lineas.push(`<span class="portada-v">Con lo último que anotaste, ${esc(M.haceDias(M.ultimaActividad(st), st.hoy))}</span>`);
        const portada = `<div class="portada app-home-pattern">
                <svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.circles}</svg>
                ${P.qBtn('libre')}
                <button type="button" class="portada-b" data-a="hoja" data-hoja="desglose" data-fk="portada" aria-label="${porConfirmar ? 'Libre por ahora' : 'Libre'} ${esc(dinero(k.libre))}. ${esc(textoHorizonte(hz))}. Ver de dónde sale">
                    <span class="portada-h">${esc(textoHorizonte(hz))}</span><span class="portada-l">${porConfirmar ? 'Libre por ahora' : 'Libre'}</span><span class="portada-n">${dinero(k.libre)}</span>${lineas.join('')}
                    <span class="portada-mas">¿De dónde sale? ${icon('chevron-right', 'ico-xs')}</span>
                </button>
                ${porConfirmar ? `<div class="portada-pie"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="ingresoLlego" data-id="${porConfirmar.ingreso.id}" data-fecha="${porConfirmar.fecha}" data-fk="ing-si">${hz.esHoy ? '¿Ya llegó?' : `¿Ya llegó tu ${esc(nombreIngreso(hz))} del ${M.partes(porConfirmar.fecha)[2]}?`}</button></div>` : ''}
            </div>`;

        const tarjetasAviso = [];
        // Pongámonos al día: su propia tarjeta (es un recorrido, no un aviso).
        if (k.alDia) {
            const pend = pendientesAlDia();
            tarjetasAviso.push(`<section class="card card--aviso" aria-labelledby="av-dia"><div class="aviso-cab">${caja('👋')}<div><h2 class="card-t" id="av-dia">Pongámonos al día</h2><p class="txt">¡Qué bueno verte! En un minuto dejamos todo como está hoy:</p></div></div>
                <ul class="mini-lista">${pend.ingresos ? `<li>${plural(pend.ingresos, 'ingreso', 'ingresos')} por confirmar</li>` : ''}${pend.pagos ? `<li>${plural(pend.pagos, 'pago', 'pagos')} por confirmar</li>` : ''}<li>${plural(st.lugares.length, 'lugar', 'lugares')} por cuadrar</li></ul>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="abrir" data-tipo="aldia" data-fk="aldia">Empezar</button></section>`);
        }
        if (P.modos) tarjetasAviso.push(...P.modos.tarjetasHoy(k));
        // v2.4: retomar el recorrido donde se quedó (entrenamiento).
        if (P.tour && P.tour.tarjetaHoy) tarjetasAviso.push(P.tour.tarjetaHoy());

        // Próximos pagos: los que vienen. Los vencidos están en el aviso (V2-55: no se repiten aquí).
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
            ${P.qTexto('libre')}
            ${proyeccionHtml(k) ? `<div class="proy-w">${proyeccionHtml(k)}${P.qBtn('proxima')}</div>${P.qTexto('proxima')}` : ''}
            ${P.tipHtml('hoy')}
            ${avisoHoy(atencion(k))}
            ${tarjetasAviso.join('')}
            ${pagosHtml}
            ${ultimosHtml}
        </div>`;
    };

    /**
     * Las filas de Próximos pagos; lo que vence desde el próximo ingreso va tras un separador. v2.4.1: la tarjeta
     * va antes (siempre se paga con lo que ya tienes, V2-07) y, sin ingreso fijo, lo de después de tu fin de mes
     * (o de tus 15 días) va tras «Con lo que tengas cuando venza».
     */
    function filasProximos(lista, hz) {
        const fila = (o) => filaPago(o, null);
        if (hz.esHoy || hz.atrasada) return lista.map(fila).join('');
        const antes = lista.filter((o) => o.estado === 'vencido' || o.fecha < hz.fecha || o.tarjeta);
        const despues = lista.filter((o) => !antes.includes(o));
        const dia = M.partes(hz.fecha)[2];
        const cual = !hz.ingreso ? etiquetaFuente('despues') : hz.ingreso.frecuencia === 'semanal' ? `tu pago del ${M.DIAS[M.diaSemana(hz.fecha)]} ${dia}` : `tu ${nombreIngreso(hz)} del ${dia}`;
        return antes.map(fila).join('') + (despues.length ? `<li class="separador" role="presentation"><span>Con ${esc(cual)}</span></li>${despues.map(fila).join('')}` : '');
    }
    function proximosPagos(n) {
        const st = P.st;
        const hasta = M.sumarDias(st.hoy, 45);
        const lista = [];
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) {
            for (const o of M.ocurrenciasPago(st, p, p.desde, hasta)) if (o.estado === 'pendiente') lista.push(o);
        }
        for (const o of M.ocurrenciasTarjeta(st, M.sumarDias(st.hoy, -40), hasta)) if (o.estado === 'pendiente' || o.estado === 'porConfirmar') lista.push(o);
        lista.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
        const vistos = new Set();
        return lista.filter((o) => {
            const clave = o.tarjeta ? 't' + o.tarjeta.id : 'p' + o.pago.id;
            if (vistos.has(clave)) return false;
            vistos.add(clave);
            return true;
        }).slice(0, n);
    }
    P.proximosPagos = proximosPagos;
    /** Ingresos que ya debían llegar y nadie confirmó: los días de pago atrasados y lo de otros ingresos (la pareja, la remesa). */
    function ingresosPorConfirmar() {
        const st = P.st;
        const hz = M.horizonte(st);
        const lista = [...(hz.atrasadas || [])];
        for (const ing of st.ingresos.filter((x) => x.activo !== false && !x.principal && x.frecuencia !== 'unico')) {
            for (const o of M.ocurrenciasIngreso(st, ing, M.sumarDias(st.hoy, -45), M.sumarDias(st.hoy, -1))) if (o.estado === 'porConfirmar') lista.push(o);
        }
        return lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    }
    P.ingresosPorConfirmar = ingresosPorConfirmar;
    function pendientesAlDia() {
        const st = P.st;
        let pagos = 0;
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) pagos += M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1)).filter((o) => o.estado === 'vencido').length;
        pagos += M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1)).filter((o) => o.estado === 'vencido').length;
        return { pagos, ingresos: ingresosPorConfirmar().length };
    }
    P.pendientesAlDia = pendientesAlDia;

    // ---- Pagos
    /** Esta quincena / Próxima: del día de pago al día antes del siguiente (el pago del mismo día va con ese ingreso). */
    function periodos() {
        const st = P.st;
        const p = M.principal(st);
        if (!p) {
            const [y, m] = M.partes(st.hoy);
            const [ny, nm] = M.mesMas(y, m, 1);
            return { actual: { desde: `${y}-${M.pad(m)}-01`, hasta: M.fechaDe(y, m, 31), t: 'Este mes' }, proxima: { desde: `${ny}-${M.pad(nm)}-01`, hasta: M.fechaDe(ny, nm, 31), t: 'Próximo mes' }, semanal: false };
        }
        const semanal = p.frecuencia === 'semanal' || p.frecuencia === 'catorcenal';
        const ini = M.cortes(st, M.sumarDias(st.hoy, -100), st.hoy).at(-1) || st.hoy;
        const sig = M.corteDespues(st, st.hoy) || M.sumarDias(st.hoy, 15);
        const sig2 = M.corteDespues(st, sig) || M.sumarDias(sig, 15);
        return {
            actual: { desde: ini, hasta: M.sumarDias(sig, -1), t: semanal ? 'Esta semana' : p.frecuencia === 'quincenal' ? 'Esta quincena' : 'Este periodo' },
            proxima: { desde: sig, hasta: M.sumarDias(sig2, -1), t: 'Próxima' },
            semanal,
        };
    }
    P.periodos = periodos;
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
                const estado = (o.estado === 'llego' ? `${icon('circle-check', 'ico-xs')}Llegó` : o.estado === 'noLlego' ? 'No llegó' : o.estado === 'porConfirmar' ? `${icon('clock', 'ico-xs')}Por confirmar` : o.estado === 'hoy' ? 'Hoy · ¿ya llegó?' : ing.frecuencia === 'unico' ? 'Esperado · suma cuando llegue' : ing.principal ? 'Esperado' : 'Esperado · suma cuando llegue') + (o.descuento ? ` · te descuentan ${dinero(o.descuento)} del adelanto` : '');
                items.push({
                    fecha: o.fecha,
                    ingreso: true,
                    html: `<li class="fila fila--ingreso"><button type="button" class="fila-main" data-a="abrir" data-tipo="ingreso" data-id="${ing.id}" data-fk="i-${ing.id}-${o.fecha}">${caja(ing.emoji)}<span class="fila-txt"><span class="fila-t">${esc(ing.nombre)}</span><span class="fila-s">${marcaMov('ingreso')}<span>${estado}</span></span></span><span class="fila-m">${o.estado === 'llego' ? montoHtml(o.monto, 'ingreso') : montoHtml(o.monto, 'esperado', { aprox: o.aprox })}</span></button></li>`,
                });
            }
        }
        if (conHoy && st.hoy >= desde && st.hoy <= hasta) items.push({ fecha: st.hoy, hoy: true });
        // El mismo día: primero lo que te cae y después lo que pagas con eso.
        items.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.hoy ? -1 : b.hoy ? 1 : a.ingreso ? -1 : b.ingreso ? 1 : 0));
        const grupos = [];
        for (const it of items) {
            let g = grupos.at(-1);
            if (!g || g.fecha !== it.fecha) grupos.push((g = { fecha: it.fecha, filas: [], hoy: false, ing: 0, pag: 0 }));
            if (it.hoy) g.hoy = true;
            else {
                g.filas.push(it.html);
                if (it.ingreso) g.ing++;
                else g.pag++;
            }
        }
        if (!grupos.length) return '<p class="vacio">Nada en estas fechas.</p>';
        return grupos
            .map((g) => {
                const conMes = `${M.diaCorto(g.fecha)} ${M.MESES_CORTOS[M.partes(g.fecha)[1] - 1]}`;
                const etiqueta = g.fecha === st.hoy ? `Hoy · ${conMes}` : M.capital(conMes);
                const cuerpo = g.filas.length ? `<ul class="lista card">${g.filas.join('')}</ul>` : g.hoy ? '<p class="hoy-marca-t">Nada que pagar hoy.</p>' : '';
                const marcas = g.ing || g.pag ? `<span class="dia-marcas" aria-hidden="true">${g.ing ? '<span class="dia-marca dia-marca--ingreso">+ Ingreso</span>' : ''}${g.pag ? `<span class="dia-marca dia-marca--pago">− ${g.pag === 1 ? 'Pago' : g.pag + ' pagos'}</span>` : ''}</span>` : '';
                return `<div class="grupo${g.fecha === st.hoy ? ' grupo--hoy' : ''}"><div class="grupo-cab"><h3 class="grupo-t">${esc(etiqueta)}</h3>${marcas}</div>${cuerpo}</div>`;
            })
            .join('');
    }

    function rangoTexto(desde, hasta) {
        const [, m1, d1] = M.partes(desde);
        const [, m2, d2] = M.partes(hasta);
        return m1 === m2 ? `Del ${d1} al ${d2} de ${M.MESES[m2 - 1]}` : `Del ${d1} de ${M.MESES[m1 - 1]} al ${d2} de ${M.MESES[m2 - 1]}`;
    }
    /** El resumen del periodo arriba de la línea de tiempo: el mismo número de Hoy (V2-35). */
    function resumenPeriodo(vista, rango, k) {
        if (vista === 'actual') {
            // Los mismos montos que el desglose de Hoy: lo de la tarjeta cubierto por un ahorro va en «reservado».
            const res = k.reservadoPagos + k.reservadoProxima + k.reservadoTarjetas;
            return `<div class="per-res"><p class="per-res-l">Con lo que tienes: por pagar ${dinero(k.porPagar + k.enTarjetas - k.reservadoTarjetas)}${res ? ` · reservado ${dinero(res)}` : ''} · libre <strong>${dinero(k.libre)}</strong></p></div>`;
        }
        if (vista === 'mes') {
            // V2-55: el mes completo, con las mismas ocurrencias del motor que se ven abajo (y las vencidas de ese mes).
            const [y, m] = M.partes(rango.desde);
            const r = M.pagosDelMes(P.st, y, m);
            if (!r.entra && !r.pagos && !r.tarjetasSinMonto) return '';
            const ap = { aprox: r.aprox };
            const queda = r.queda >= 0 ? `queda ${dinero(r.queda, ap)}` : `faltan ${dinero(-r.queda, ap)}`;
            return `<div class="per-res${r.queda < 0 ? ' per-res--falta' : ''}"><p class="per-res-l">Ingresos ${dinero(r.entra, ap)} · pagos ${dinero(r.pagos, ap)}${r.tarjetasSinMonto ? ' + tus tarjetas' : ''} · ${queda}</p><p class="fila-s">Tus ingresos y tus pagos de ${esc(M.MESES[m - 1])}. Sin tus gastos del día a día (esos están en la pestaña Mes).</p></div>`;
        }
        if (vista !== 'proxima') return '';
        const x = k.periodos.find((y) => y.clave === rango.desde) || (k.proxima && k.proxima.inicio <= rango.desde && rango.desde <= k.proxima.fin ? k.proxima : null);
        if (!x) return '';
        const inc = incluyePeriodo(x);
        return `<div class="per-res${P.faltaPeriodo(x) ? ' per-res--falta' : ''}"><p class="per-res-l">${esc(M.capital(lineaPeriodo(x)))}</p>${inc ? `<p class="fila-s">${esc(M.capital(inc))}.</p>` : ''}${x.soloFechas ? `<p class="fila-s">Ojo: ${esc(P.textoFaltaFechas(x).replace(/^El /, 'el '))}.</p>` : ''}</div>`;
    }
    /** Cuánto es al mes, más o menos, algo que se repite (para comparar y sumar). */
    function alMes(x, monto = x.monto) {
        const f = x.frecuencia;
        if (f === 'semanal') return Math.round((monto * 52) / 12);
        if (f === 'catorcenal') return Math.round((monto * 26) / 12);
        if (f === 'quincenal') return monto * 2;
        if (f === 'mensual') return monto;
        if (f === 'meses') return Math.round(monto / (x.cadaMeses || 12));
        if (f === 'ingreso') {
            const ing = M.reglaPago(P.st, x);
            return ing && ing.frecuencia !== 'ingreso' ? alMes(ing, monto) : monto;
        }
        return 0;
    }
    P.alMes = alMes;
    /** «Se paga con la quincena de antes de que venza», «…con la quincena anterior», «Repartido parejo…». */
    function textoRegla(p) {
        const pr = M.principal(P.st);
        if (!pr) return 'Con lo que tengas cuando venza';
        const cual = pr.frecuencia === 'quincenal' ? 'la quincena' : pr.frecuencia === 'semanal' || pr.frecuencia === 'catorcenal' ? 'el pago' : `el ${pr.nombre.toLowerCase()}`;
        const cuales = pr.frecuencia === 'quincenal' ? 'tus quincenas' : 'tus días de pago';
        if (p.pagarCon && p.pagarCon.modo === 'antes') return `Con ${cual} anterior (un día de pago antes)`;
        if (p.pagarCon && p.pagarCon.modo === 'parejo') return `Repartido parejo entre ${cuales}`;
        return `Con ${cual} de antes de que venza`;
    }
    P.textoRegla = textoRegla;
    /** V2-39: la lista completa de lo que pagas y te pagan: nombre, monto, frecuencia, con qué se paga y con qué ingreso. */
    function misPagos() {
        const st = P.st;
        const hz = M.horizonte(st);
        const activos = st.pagos.filter((p) => p.activo !== false);
        const filaPagoLista = (p) => {
            const medio = M.medio(st, p.medio);
            const prox = M.ocurrenciasPago(st, p, M.sumarDias(st.hoy, -62), M.sumarDias(st.hoy, 400)).find((o) => o.estado === 'pendiente' || o.estado === 'vencido');
            const cambiada = prox && !p.descuento ? M.asignacion(st, p, prox.fecha, prox.monto, hz) : [];
            const conQue = p.descuento ? `Se descuenta solo de ${(M.ingreso(st, p.descuento)?.nombre || 'tu salario').toLowerCase()}` : p.automatico && medio ? `Se cobra solo en ${medio.nombre} · ${textoRegla(p)}` : `${medio ? medio.nombre : 'Sin medio'} · ${textoRegla(p)}`;
            const proxTxt = prox ? `${prox.estado === 'vencido' ? 'Venció' : 'Próximo'}: ${M.fechaCorta(prox.fecha)}${cambiada.length > 1 || (cambiada[0] && cambiada[0].de !== M.periodoDe(st, prox.fecha, hz)) ? ' · ' + P.textoPartes(prox, cambiada, hz).toLowerCase() : ''}` : 'Sin fechas por delante';
            return `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="pago" data-id="${p.id}" data-fk="mp-${p.id}">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">${esc(textoFrecuencia(p, { corto: true }))}</span><span class="fila-s">${esc(conQue)}</span><span class="fila-s">${esc(proxTxt)}</span></span><span class="fila-m">${montoHtml(p.monto, null, { aprox: p.estimado })}${p.frecuencia !== 'mensual' && alMes(p) ? `<span class="fila-s">${esc(dinero(alMes(p), { aprox: true }))} al mes</span>` : ''}</span></button></li>`;
        };
        const grupos = [
            ['Pagos fijos', activos.filter((p) => !p.tipoDeuda && p.tipoPago !== 'suscripcion' && !p.descuento)],
            ['Cuotas y préstamos', activos.filter((p) => p.tipoDeuda && !p.descuento)],
            ['Suscripciones', activos.filter((p) => p.tipoPago === 'suscripcion')],
            ['Descuentos del salario', activos.filter((p) => p.descuento)],
        ].filter(([, l]) => l.length);
        const tarjetas = st.tarjetas.map((t) => {
            const info = M.tarjetaInfo(st, t);
            // V2-54: sin estado de cuenta todavía, lo que paga normalmente (estimado).
            const cuanto = info.porPagarEstado ? montoHtml(info.porPagarEstado) : info.estimado ? `${montoHtml(info.estimado, null, { aprox: true })}<span class="fila-s">estimado</span>` : '<span class="monto monto--pend">Por confirmar</span>';
            return `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="tarjeta" data-id="${t.id}" data-fk="mp-t-${t.id}">${caja(t.emoji)}<span class="fila-txt"><span class="fila-t">${esc(t.nombre)}</span><span class="fila-s">Cada mes, el ${t.pagoDia} · ${info.usual ? 'lo que pagas normalmente, hasta tu estado de cuenta' : 'según tu estado de cuenta'}</span><span class="fila-s">Sale de lo que ya tienes: tus compras con tarjeta bajan tu libre el día que las haces</span></span><span class="fila-m">${cuanto}</span></button></li>`;
        });
        const ingresos = st.ingresos.filter((i) => i.activo !== false).map((i) => {
            const prox = M.ocurrenciasIngreso(st, i, i.desde, M.sumarDias(st.hoy, 400)).find((o) => o.estado !== 'llego' && o.estado !== 'noLlego');
            return `<li class="fila fila--ingreso"><button type="button" class="fila-main" data-a="abrir" data-tipo="ingreso" data-id="${i.id}" data-fk="mp-i-${i.id}">${caja(i.emoji)}<span class="fila-txt"><span class="fila-t">${esc(i.nombre)}${i.principal ? ' <span class="pronto">Principal</span>' : ''}</span><span class="fila-s">${esc(textoFrecuencia(i))} · llega a ${esc(M.lugar(st, i.lugar)?.nombre || '—')}</span><span class="fila-s">${esc(i.principal ? 'Tu libre se calcula hasta que llegue' : i.frecuencia === 'unico' ? 'No suma hasta que llegue' : 'Cuenta como estimado en tus próximos días de pago')}${prox ? ` · próximo: ${M.fechaCorta(prox.fecha)}` : ''}</span></span><span class="fila-m">${montoHtml(i.monto, 'esperado', { aprox: i.aprox })}</span></button></li>`;
        });
        const entraMes = M.suma(st.ingresos.filter((i) => i.activo !== false), (i) => alMes(i));
        const salesMes = M.suma(activos.filter((p) => !p.descuento), (p) => alMes(p));
        return `<div class="per-res"><p class="per-res-l">Al mes, más o menos: ingresos ${dinero(entraMes, { aprox: true })} · pagos ${dinero(salesMes, { aprox: true })}${st.tarjetas.length ? ' + tus tarjetas' : ''}</p><p class="fila-s">Toca cualquiera para cambiarlo.</p></div>
            ${tarjetaSeccion(`Tus ingresos <span class="contador">${ingresos.length}</span>`, ingresos.length ? `<ul class="lista">${ingresos.join('')}</ul>` : '<p class="vacio">Todavía no tienes ingresos esperados.</p>', { id: 'mp-ingresos' })}
            ${grupos.map(([t, l]) => tarjetaSeccion(`${t} <span class="contador">${l.length}</span>`, `<ul class="lista">${l.map(filaPagoLista).join('')}</ul>${t === 'Suscripciones' ? `<p class="txt txt--card">Pagas ${esc(dinero(M.suma(l, (p) => alMes(p)), { aprox: true }))} al mes en suscripciones.</p>` : ''}`, { id: 'mp-' + M.normalizar(t).replace(/\s+/g, '-') })).join('')}
            ${tarjetas.length ? tarjetaSeccion(`Tarjetas de crédito <span class="contador">${tarjetas.length}</span>`, `<ul class="lista">${tarjetas.join('')}</ul>`, { id: 'mp-tarjetas' }) : ''}
            ${!grupos.length && !tarjetas.length ? '<p class="vacio">Todavía no tienes pagos. Agrega la luz, el alquiler o una cuota con «+ Pago».</p>' : ''}`;
    }
    S.pagos = function () {
        const st = P.st;
        const hz = M.horizonte(st);
        const k = P.calc();
        const per = periodos();
        const vista = P.ui.pagosVista;
        const vencidos = [];
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) for (const o of M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido') vencidos.push(o);
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
        // V2-40: «Más adelante» solo trae los ingresos de una vez (aguinaldo, Quincena 25, bono), no cada quincena.
        // Corrección v2.3.1: «Más adelante» empieza después del periodo «Próxima» (un ingreso de una vez se ve solo en el periodo de su fecha).
        const finMasAdelante = vista === 'mes' && rango.hasta > per.proxima.hasta ? rango.hasta : per.proxima.hasta;
        const extras = st.ingresos.filter((i) => i.frecuencia === 'unico' && i.activo !== false).flatMap((i) => M.ocurrenciasIngreso(st, i, M.sumarDias(finMasAdelante, 1), M.sumarDias(st.hoy, 400)).filter((o) => o.estado === 'esperado'));
        // V2-39: dos vistas: el calendario por periodo y la lista completa.
        const modo = P.ui.pagosModo === 'lista' ? 'lista' : 'calendario';
        const vistas = `<div class="app-tabs tabs-2 pagos-modo" role="tablist" aria-label="Cómo ver tus pagos">${[['calendario', 'Calendario'], ['lista', 'Mis pagos e ingresos']].map(([v, t]) => `<button type="button" class="app-tab" role="tab" aria-selected="${modo === v}" data-a="pagosModo" data-v="${v}" data-fk="modo-${v}">${t}</button>`).join('')}</div>`;
        if (modo === 'lista') {
            return `<div class="pg">
            ${encabezado('Pagos', 'Qué pagas y cuándo te pagan')}
            ${P.tipHtml('pagos')}
            ${vistas}
            <div class="acciones-2 acciones-2--top"><button type="button" class="btn btn--prim" data-a="hoja" data-hoja="nuevoPago" data-fk="nuevo-pago">${icon('plus', 'ico-s')}Pago</button><button type="button" class="btn" data-a="hoja" data-hoja="nuevoIngreso" data-fk="nuevo-ingreso">${icon('plus', 'ico-s')}Ingreso esperado</button></div>
            ${misPagos()}
        </div>`;
        }
        return `<div class="pg">
            ${encabezado('Pagos', 'Qué pagas y cuándo te pagan')}
            ${P.tipHtml('pagos')}
            ${vistas}
            <div class="acciones-2 acciones-2--top"><button type="button" class="btn btn--prim" data-a="hoja" data-hoja="nuevoPago" data-fk="nuevo-pago">${icon('plus', 'ico-s')}Pago</button><button type="button" class="btn" data-a="hoja" data-hoja="nuevoIngreso" data-fk="nuevo-ingreso">${icon('plus', 'ico-s')}Ingreso esperado</button></div>
            ${vencidos.length ? tarjetaSeccion(`Por confirmar <span class="contador">${vencidos.length}</span>`, `<p class="txt txt--card">Ya pasó su fecha. ¿Los pagaste?</p><ul class="lista">${vencidos.map((o) => filaPago(o, hz)).join('')}</ul>`, { id: 'p-venc', cls: 'card--venc' }) : ''}
            <div class="app-tabs tabs-3" role="tablist" aria-label="Periodo">${tabs}</div>
            ${mesNav}
            ${resumenPeriodo(vista, rango, k)}
            <div class="linea">${lineaTiempo(rango.desde, rango.hasta)}</div>
            ${extras.length ? `<div class="grupo"><h3 class="grupo-t">Más adelante</h3><ul class="lista card">${extras.map((o) => `<li class="fila fila--ingreso"><button type="button" class="fila-main" data-a="abrir" data-tipo="ingreso" data-id="${o.ingreso.id}" data-fk="x-${o.ingreso.id}">${caja(o.ingreso.emoji)}<span class="fila-txt"><span class="fila-t">${esc(o.ingreso.nombre)}</span><span class="fila-s">${marcaMov('ingreso')}<span>${esc(M.fechaLarga(o.fecha))} · no suma a tu libre hasta que llegue</span></span></span><span class="fila-m">${montoHtml(o.monto, 'esperado', { aprox: o.aprox })}</span></button></li>`).join('')}</ul></div>` : ''}
        </div>`;
    };

    // ---- Mi dinero (V2-49): un resumen corto, «Así se reparte» y tres puertas: Cuentas, Ahorros y Deudas
    /** «Atrás» dice a dónde vuelve: la pantalla anterior o la pestaña. */
    P.atrasDe = (defecto) => {
        const previo = P.ui.stack.at(-2);
        const nombres = { cuentas: 'Cuentas', ahorros: 'Ahorros', deudas: 'Deudas', pago: 'Atrás', tarjeta: 'Atrás', ingreso: 'Atrás', lugar: 'Atrás', apartado: 'Atrás', misPagos: 'Pagos' };
        if (previo) return nombres[previo.tipo] || 'Atrás';
        return { hoy: 'Hoy', pagos: 'Pagos', midinero: 'Mi dinero', mes: 'Mes' }[P.ui.tab] || defecto;
    };
    /** Lo que debes: tarjetas (lo que dice su estado más las compras) y préstamos con «cuánto debes» anotado. */
    function deudaTotal(st) {
        const infos = st.tarjetas.map((t) => M.tarjetaInfo(st, t));
        const tarjetas = M.suma(infos, (x) => x.debeTotal + (x.ult.inicial && x.t.debeInicial ? x.t.debeInicial : 0));
        // V2-54: una tarjeta sin su primer estado de cuenta: no se sabe cuánto debe; cuenta como cuota sin saldo (lo que paga normalmente).
        const sinEstado = infos.filter((x) => x.usual > 0);
        const conSaldo = st.pagos.filter((p) => p.activo !== false && p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined);
        const sinSaldo = st.pagos.filter((p) => p.activo !== false && p.tipoDeuda && !(p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined));
        return { total: tarjetas + M.suma(conSaldo, (p) => p.deuda.debe), cuantas: st.tarjetas.length + conSaldo.length + sinSaldo.length, sinSaldo: sinSaldo.length + sinEstado.length, cuotasSinSaldo: M.suma(sinSaldo, (p) => alMes(p)) + M.suma(sinEstado, (x) => x.usual), aprox: conSaldo.length > 0 };
    }
    /** «Debes ~$710», o «Cuotas $285.00 al mes» si todavía no anotó cuánto debe (nunca un «$0.00» que no es cierto). */
    const textoDebes = (deuda) => (!deuda.cuantas ? 'Debes $0.00' : deuda.total > 0 ? `Debes ${dinero(deuda.total, { aprox: deuda.aprox })}${deuda.sinSaldo ? ' + cuotas' : ''}` : `Cuotas ${dinero(deuda.cuotasSinSaldo)} al mes`);
    P.deudaTotal = deudaTotal;
    S.midinero = function () {
        const st = P.st;
        const k = P.calc();
        const deuda = deudaTotal(st);
        const resumen = `<section class="total" aria-labelledby="md-total">
                <div class="total-cab"><div><h2 class="total-l" id="md-total">Tienes</h2><p class="total-n">${dinero(k.tienes)}</p><p class="total-s">Ahorros ${dinero(k.apartado)} · ${textoDebes(deuda)}</p></div><svg class="total-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.cuentas}</svg></div>
            </section>`;
        const lugaresTxt = st.lugares.length > 2 ? plural(st.lugares.length, 'lugar', 'lugares') : st.lugares.map((l) => `${l.nombre} ${dinero(M.saldoLugar(st, l.id))}`).join(' · ');
        const listos = st.apartados.filter((a) => a.meta && a.monto >= a.meta).length;
        const ahorrosTxt = st.apartados.length ? `${plural(st.apartados.length, 'ahorro', 'ahorros')}${listos ? ` · ${plural(listos, 'lista para usar', 'listos para usar')}` : ''}` : 'Ponle nombre a una parte de tu dinero';
        const proxDeuda = (() => {
            const lista = [];
            for (const t of st.tarjetas) {
                const info = M.tarjetaInfo(st, t);
                if (info.porPagarEstado + info.estimado > 0) lista.push({ f: info.ult.vence, t: `${t.nombre}: ${dinero(info.porPagarEstado + info.estimado, { aprox: info.estimado > 0 })} el ${M.fechaCorta(info.ult.vence)}` });
            }
            for (const p of st.pagos.filter((x) => x.activo !== false && x.tipoDeuda && !x.descuento)) {
                const o = M.ocurrenciasPago(st, p, st.hoy, M.sumarDias(st.hoy, 62)).find((y) => y.estado === 'pendiente');
                if (o) lista.push({ f: o.fecha, t: `${p.nombre}: ${dinero(o.monto)} el ${M.fechaCorta(o.fecha)}` });
            }
            return lista.sort((a, b) => (a.f < b.f ? -1 : 1))[0];
        })();
        const puerta = (tipo, ic, titulo, cifra, sub, fk) => `<li><button type="button" class="puerta" data-a="abrir" data-tipo="${tipo}" data-fk="${fk}"><span class="emo emo--ico" aria-hidden="true">${icon(ic)}</span><span class="puerta-txt"><span class="puerta-t">${titulo}</span><span class="puerta-n">${cifra}</span><span class="fila-s">${esc(sub)}</span></span>${icon('chevron-right', 'ico-xs')}</button></li>`;
        return `<div class="pg">${encabezado('Mi dinero', 'Dónde está y para qué es')}
            ${P.tipHtml('midinero')}
            ${resumen}
            ${reparticion(k)}
            <ul class="puertas" aria-label="Tu dinero por partes">
                ${puerta('cuentas', 'wallet', 'Cuentas', dinero(k.tienes), lugaresTxt + ' · cuadrar, mover y con qué pagas', 'md-cuentas')}
                ${puerta('ahorros', 'circle-plus', 'Ahorros', dinero(k.apartado), ahorrosTxt, 'md-ahorros')}
                ${puerta('deudas', 'receipt-text', 'Deudas', deuda.total > 0 || !deuda.cuantas ? dinero(deuda.total, { aprox: deuda.aprox }) : `${dinero(deuda.cuotasSinSaldo)} al mes`, deuda.cuantas ? `${deuda.total > 0 ? '' : 'En cuotas; anota cuánto debes en cada una. '}${proxDeuda ? 'Lo próximo: ' + proxDeuda.t : plural(deuda.cuantas, 'deuda', 'deudas')}` : 'Tarjetas, préstamos y casa comercial', 'md-deudas')}
            </ul>
        </div>`;
    };
    /** Cuentas: dónde está tu dinero (lugares) y con qué pagas (medios). Cuadrar y mover. */
    S.cuentas = function () {
        const st = P.st;
        const k = P.calc();
        const tipoLugar = { efectivo: 'Efectivo', banco: 'Banco o cooperativa', billetera: 'Billetera en el celular' };
        const lugares = st.lugares
            .map((l) => {
                const debitos = st.medios.filter((m) => m.lugar === l.id && m.tarjetaDebito && !m.oculto);
                return `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="lugar" data-id="${l.id}" data-fk="l-${l.id}">${caja(l.emoji)}<span class="fila-txt"><span class="fila-t">${esc(l.nombre)}</span><span class="fila-s">${esc(tipoLugar[l.tipo] || '')}${debitos.length ? ' · ' + esc(debitos.map((m) => m.nombre).join(', ')) : ''}</span><span class="fila-s">Cuadrado ${esc(M.haceDias(l.cuadre.fecha, st.hoy))}</span></span><span class="fila-m">${montoHtml(M.saldoLugar(st, l.id))}</span></button></li>`;
            })
            .join('');
        const medios = st.medios
            .filter((m) => !m.oculto)
            .map((m) => {
                const de = m.tarjeta ? 'Tarjeta de crédito: la pagas después' : m.lugar ? 'Sale de ' + (M.lugar(st, m.lugar)?.nombre || '—') : '';
                return `<li class="fila"><button type="button" class="fila-main" data-a="hoja" data-hoja="medio" data-id="${m.id}" data-fk="lm-m-${m.id}">${caja(m.emoji)}<span class="fila-txt"><span class="fila-t">${esc(m.nombre)}</span><span class="fila-s">${esc(de)}</span></span>${icon('pencil', 'ico-xs')}</button></li>`;
            })
            .join('');
        return `<div class="pg">
            ${encabezado('Cuentas', 'Dónde está tu dinero y con qué pagas', { atras: P.atrasDe('Mi dinero') })}
            ${P.tipHtml('cuentas')}
            <section class="total" aria-labelledby="cu-total">
                <div class="total-cab"><div><h2 class="total-l" id="cu-total">Tienes</h2><p class="total-n">${dinero(k.tienes)}</p><p class="total-s">En ${esc(P.lista(st.lugares.map((l) => l.nombre)))}</p></div></div>
                <div class="acciones-2"><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="cuadrar" data-fk="md-cuadrar">${icon('scale', 'ico-s')}Cuadrar</button><button type="button" class="btn btn--48" data-a="hoja" data-hoja="mover" data-fk="md-mover">${icon('arrow-left-right', 'ico-s')}Mover</button></div>
            </section>
            ${tarjetaSeccion('Dónde está', `<ul class="lista">${lugares}</ul><div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="lugar" data-fk="lm-nuevo-lugar">${icon('plus', 'ico-s')}Agregar lugar</button></div>`, { id: 'md-lugares' })}
            ${tarjetaSeccion('Con qué pagas', `<p class="txt txt--card">Al anotar te pregunto con cuál pagaste; puedes escribir su nombre («súper 25 cuscatlán»).</p><ul class="lista">${medios}</ul><div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="medio" data-fk="lm-nuevo-medio">${icon('plus', 'ico-s')}Agregar otra tarjeta o medio</button></div>`, { id: 'lm-medios' })}
        </div>`;
    };
    // El menú («Cuentas y medios de pago») abre la misma pantalla.
    S.lugares = (top) => S.cuentas(top);
    /** Ahorros (V2-41): etiquetas sobre tu dinero; no se mueve de lugar. */
    S.ahorros = function () {
        const st = P.st;
        const k = P.calc();
        const fuera = Math.max(0, k.tienes - k.apartado);
        const apHtml = st.apartados
            .map((a) => {
                const lista = a.meta && a.monto >= a.meta;
                const vencido = a.metaFecha && a.metaFecha < st.hoy && a.monto > 0;
                const meta = vencido ? `Era para el ${M.partes(a.metaFecha)[2]} · ¿ya lo usaste?` : a.meta ? (lista ? `<span>${emo('🎉', 14)} ¡Lista para usar!</span>` : `${Math.floor((a.monto * 100) / a.meta)} % de ${dinero(a.meta)}`) : 'Sin meta';
                return `<li class="fila fila--ap"><button type="button" class="fila-main" data-a="abrir" data-tipo="apartado" data-id="${a.id}" data-fk="a-${a.id}">${recorte(a)}<span class="fila-txt"><span class="fila-t">${emo(a.emoji, 16)} ${esc(a.nombre)}</span><span class="fila-s">${meta}</span>${a.meta ? barra(a.monto, a.meta, 'Avance de ' + a.nombre) : ''}</span><span class="fila-m">${montoHtml(a.monto)}</span></button></li>`;
            })
            .join('');
        const logros = st.logros.length
            ? tarjetaSeccion('Logros', `<ul class="lista">${st.logros.map((l) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja('🎉')}<span class="fila-txt"><span class="fila-t">${esc(l.nombre)}</span><span class="fila-s">Meta cumplida el ${esc(M.fechaLarga(l.fecha))}</span>${textoUsoLogro(l) ? `<span class="fila-s">${esc(textoUsoLogro(l))}</span>` : ''}</span><span class="fila-m">${montoHtml(l.monto)}</span></div></li>`).join('')}</ul>`, { id: 'md-logros' })
            : '';
        const cerrados = (st.cerrados || []).length
            ? tarjetaSeccion('Cerrados', `<ul class="lista">${st.cerrados.map((l) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja('🔒')}<span class="fila-txt"><span class="fila-t">${esc(l.nombre)}</span><span class="fila-s">Cerrado sin usar el ${esc(M.fechaLarga(l.fecha))} · ${dinero(l.monto)} volvieron a tu libre</span></span></div></li>`).join('')}</ul>`, { id: 'md-cerrados' })
            : '';
        return `<div class="pg">
            ${encabezado('Ahorros', 'Le pones nombre a una parte de tu dinero', { atras: P.atrasDe('Mi dinero') })}
            ${P.tipHtml('ahorros')}
            <section class="total" aria-labelledby="ah-total">
                <div class="total-cab"><div><div class="total-l-w"><h2 class="total-l" id="ah-total">En ahorros</h2>${P.qBtn('ahorros')}</div><p class="total-n">${dinero(k.apartado)}</p><p class="total-s">Fuera de ahorros: ${dinero(fuera)}</p></div><svg class="total-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.ahorros}</svg></div>
                ${P.qTexto('ahorros')}
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="apartar" data-fk="md-apartar">${icon('plus', 'ico-s')}Ahorrar</button>
            </section>
            <div class="nota nota--info" role="note">${icon('info')}<p>Tus ahorros siguen en tu banco o efectivo; solo les pones nombre. No cuentan en tu libre.</p></div>
            ${k.sinCubrir > 0 ? `<div class="nota nota--ambar" role="note">${icon('triangle-alert')}<p><strong>Faltan ${dinero(k.sinCubrir)} para cubrir tus ahorros.</strong> Después de tus pagos no te alcanza para todo lo que guardaste.</p></div>` : ''}
            ${tarjetaSeccion(`Tus ahorros <span class="contador">${dinero(k.apartado)}</span>`, st.apartados.length ? `<ul class="lista">${apHtml}</ul>` : `<div class="vacio vacio--ilus"><svg class="app-illustration vacio-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.ahorros}</svg><p>Todavía no tienes ahorros. Ahorrar aquí es ponerle nombre a una parte de tu dinero: sigue en tu banco o efectivo.</p></div>`, { id: 'md-ap' })}
            ${logros}${cerrados}
        </div>`;
    };
    /** Deudas: tarjetas, préstamos y casa comercial. Su pago aparece solo en Pagos (V2-24). */
    S.deudas = function () {
        const st = P.st;
        const deuda = deudaTotal(st);
        const filas = [];
        for (const t of st.tarjetas) {
            const info = M.tarjetaInfo(st, t);
            // V2-54: sin día de corte todavía: lo que paga normalmente y el estado de cuenta por anotar.
            const linea = info.pendiente && info.sinCorte ? `${info.estimado ? `Pagas ${dinero(info.estimado, { aprox: true })} el ${M.partes(info.ult.vence)[2]} · ` : ''}estado de cuenta por anotar` : info.pendiente ? `Estado de cuenta por anotar · ${info.pendiente.corte > st.hoy ? 'corta' : 'cortó'} el ${M.partes(info.pendiente.corte)[2]}` : info.porPagarEstado > 0 ? `Por pagar ${dinero(info.porPagarEstado)} el ${M.partes(info.ult.vence)[2]}` : 'Al día con tu último estado';
            const extra = [info.comprasNetas ? `+ ${dinero(info.comprasNetas)} en compras nuevas` : '', info.resto ? `debes ${dinero(info.resto)} aparte` : ''].filter(Boolean).join(' · ');
            // V2-25: el cupo disponible se ve aquí y en la ficha, pero nunca suma al libre.
            // V2-75: «Disponible» y «Límite de crédito» en vez de «cupo».
            const cupo = info.cupoLibre !== null ? `Disponible ${dinero(info.cupoLibre)} de ${dinero(t.cupo)}` : '';
            filas.push(`<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="tarjeta" data-id="${t.id}" data-fk="t-${t.id}">${caja(t.emoji)}<span class="fila-txt"><span class="fila-t">${esc(t.nombre)}</span><span class="fila-s">${esc(linea)}</span>${extra ? `<span class="fila-s">${esc(extra)}</span>` : ''}${cupo ? `<span class="fila-s">${esc(cupo)}</span>` : ''}</span><span class="fila-m">${info.ult.inicial && t.debeInicial ? `${montoHtml(t.debeInicial + info.debeTotal, null, { aprox: true })}<span class="fila-s">debes · por confirmar</span>` : info.usual ? '<span class="monto monto--pend">Por confirmar</span><span class="fila-s">lo que debes</span>' : `${montoHtml(info.debeTotal)}<span class="fila-s">debes</span>`}</span></button></li>`);
        }
        for (const p of st.pagos.filter((x) => (x.deuda || x.tipoDeuda) && x.activo !== false)) {
            const tipo = D.TIPOS_DEUDA.find((x) => x.id === p.tipoDeuda);
            const debe = p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined;
            const cuando = p.descuento ? `se descuenta de ${(M.ingreso(st, p.descuento)?.nombre || 'tu salario').toLowerCase()}` : p.frecuencia === 'mensual' ? `el ${p.dia}` : textoFrecuencia(p).toLowerCase();
            const cuota = p.descuento ? `${dinero(p.monto)} cada vez que te pagan` : p.frecuencia === 'mensual' ? `Cuota ${dinero(p.monto)} al mes, ${cuando}` : `Cuota ${dinero(p.monto)} · ${cuando}`;
            filas.push(`<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="pago" data-id="${p.id}" data-fk="d-${p.id}">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">${tipo ? esc(tipo.nombre) + ' · ' : p.descuento ? 'Descuento del salario · ' : ''}${esc(cuota)}</span></span><span class="fila-m">${debe ? `${montoHtml(p.deuda.debe, null, { aprox: true })}<span class="fila-s">debes</span>` : `${montoHtml(p.monto)}<span class="fila-s">${p.descuento ? 'cada pago' : 'al mes'}</span>`}</span></button></li>`);
        }
        return `<div class="pg">
            ${encabezado('Deudas', 'Tarjetas, préstamos y casa comercial', { atras: P.atrasDe('Mi dinero') })}
            ${P.tipHtml('deudas')}
            <section class="card ficha-cifra ficha-cifra--q" aria-label="Lo que debes">${P.qBtn('deudas')}<p class="fila-s">${deuda.total > 0 || !deuda.sinSaldo ? `Debes en total${deuda.sinSaldo ? ' (lo que tienes anotado)' : ''}` : 'Pagas en cuotas'}</p><p class="cifra">${deuda.total > 0 || !deuda.sinSaldo ? dinero(deuda.total, { aprox: deuda.aprox }) : `${dinero(deuda.cuotasSinSaldo)} al mes`}</p><p class="fila-s">${deuda.sinSaldo ? `${plural(deuda.sinSaldo, 'cuota no tiene', 'cuotas no tienen')} «cuánto debes» anotado. ` : ''}Su pago aparece solo en Pagos. El disponible de una tarjeta nunca suma a tu libre: es dinero prestado.</p>${P.qTexto('deudas')}</section>
            ${tarjetaSeccion('Tus deudas', `${filas.length ? `<ul class="lista">${filas.join('')}</ul>` : '<p class="vacio">Si tienes una tarjeta, una cuota o un préstamo, agrégalo aquí y su pago aparece solo en Pagos.</p>'}<div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="nuevaDeuda" data-fk="md-deuda">${icon('plus', 'ico-s')}${filas.length ? 'Agregar otra deuda o tarjeta' : 'Agregar una deuda o tarjeta'}</button></div>`, { id: 'md-deudas-lista' })}
            ${P.modo === 'uso' ? `<button type="button" class="link link--start" data-a="obCompletar" data-fk="md-completar">${icon('list-checks', 'ico-s')}Completar tu Primer día: deudas, tarjetas y gastos fijos</button>` : ''}
        </div>`;
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
        if (res && info && info.reservado > 0) return `Usado con ${m.nombre} · ${dinero(Math.min(res.monto, info.reservado))} reservados para tu pago del ${P.diaPago(info, info.venceCompras)}`;
        return `Usado con ${m.nombre} · ya pagaste la tarjeta`;
    }
    P.textoUsoLogro = textoUsoLogro;

    /** V2-26: toda la repartición de lo que tienes, en una línea y una barra. Primero se cubren los pagos, luego lo reservado y los ahorros. */
    function reparticion(k) {
        if (!k.tienes) return '';
        let queda = k.tienes;
        const tomar = (m) => {
            const x = Math.max(0, Math.min(m, queda));
            queda -= x;
            return x;
        };
        const pg = tomar(k.porPagar + k.enTarjetas - k.reservadoTarjetas);
        const gu = tomar(k.reservadoPagos + k.reservadoProxima + k.reservadoTarjetas);
        const ap = tomar(k.apartado);
        const partes = [
            ['ap', 'ahorros', ap],
            ['pg', 'por pagar', pg],
            ['gu', 'reservado para pagos', gu],
            ['li', 'libre', k.libre],
        ].filter(([, , m]) => m > 0);
        const frase = `Tienes ${dinero(k.tienes)} = ${partes.length ? partes.map(([, t, m]) => `${t} ${dinero(m)}`).join(' + ') : 'libre $0.00'}`;
        const falta = k.faltaPagos > 0 ? `Te faltan ${dinero(k.faltaPagos)} para cubrir lo que viene.` : k.sinCubrir > 0 ? `Faltan ${dinero(k.sinCubrir)} para cubrir tus ahorros.` : '';
        return `<section class="card reparto" aria-labelledby="md-reparto">
            <div class="card-h"><h2 class="card-t" id="md-reparto">Así se reparte</h2></div>
            <p class="reparto-frase">${esc(frase)}</p>
            <div class="reparto-barra" aria-hidden="true">${partes.map(([c, , m]) => `<span class="rb rb--${c}" style="flex-grow:${m}"></span>`).join('')}</div>
            <ul class="reparto-ley">${partes.map(([c, t, m]) => `<li><span class="rb-pt rb--${c}" aria-hidden="true"></span><span>${esc(M.capital(t))}</span><span class="monto">${dinero(m)}</span></li>`).join('')}</ul>
            ${falta ? `<p class="txt txt--card reparto-falta">${icon('triangle-alert', 'ico-s')}${falta}</p>` : ''}
        </section>`;
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
        // V2-47: cuánto se va en suscripciones, al mes.
        const suscripciones = st.pagos.filter((p) => p.activo !== false && p.tipoPago === 'suscripcion');
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
            ${P.tipHtml('mes')}
            <div class="mes-nav"><button type="button" class="icon-btn" data-a="mesNav" data-d="-1" aria-label="Mes anterior" data-fk="mes-ant">${icon('chevron-left')}</button><p class="mes-nav-t" aria-live="polite">${esc(M.capital(M.MESES[m - 1]))} ${y}</p><button type="button" class="icon-btn" data-a="mesNav" data-d="1" aria-label="Mes siguiente" data-fk="mes-sig" ${esActual ? 'disabled' : ''}>${icon('chevron-right')}</button></div>
            <section class="card resumen" aria-label="Resumen del mes">
                <div class="resumen-dos"><div><p class="fila-s">Entró</p><p class="resumen-n">${montoHtml(r.entro, 'ingreso')}</p></div><div><p class="fila-s">Salió</p><p class="resumen-n resumen-n--salio">${dinero(-r.salio)}</p></div></div>
                ${comparacion ? `<p class="txt">${esc(comparacion)}</p>` : ''}
                ${suscripciones.length ? `<button type="button" class="link link--start" data-a="irMisPagos" data-fk="mes-suscripciones">${icon('receipt-text', 'ico-s')}Pagas ${esc(dinero(M.suma(suscripciones, (p) => alMes(p)), { aprox: true }))} al mes en suscripciones</button>` : ''}
            </section>
            ${enque}
            ${historial}
        </div>`;
    };

    /** «Cada mes, el 30», «Cada quincena, el 8 y el 23», «Cada 2 semanas (viernes)», «Una vez, el 25 de octubre»… (V2-36). */
    function textoFrecuencia(x, { corto = false } = {}) {
        const f = x.frecuencia;
        if (f === 'unico') return `Una vez, el ${M.fechaLarga(x.fecha)}`;
        if (f === 'semanal') return `Cada ${M.DIAS[x.diaSemana]}`;
        if (f === 'catorcenal') return `Cada 2 semanas${x.fecha ? ` (${M.DIAS[M.diaSemana(x.fecha)]})` : ''}`;
        if (f === 'quincenal') {
            const [d1, d2] = x.dias || [15, 30];
            return `Cada quincena, el ${d1} y el ${d2 >= 31 ? 'último día' : d2}`;
        }
        if (f === 'ingreso') return 'El mismo día que te pagan';
        if (f === 'meses') return x.cadaMeses === 12 ? `Cada año, el ${M.fechaLarga(x.fecha)}` : `Cada ${x.cadaMeses} meses, el ${M.partes(x.fecha)[2]}`;
        if (f === 'fechas') return `En ${plural((x.fechas || []).length, 'fecha', 'fechas')} que elegiste`;
        return `Cada mes, el ${x.dia >= 31 ? 'último día' : x.dia}${x.dia > 28 && x.dia < 31 && !corto ? ' (o el último día, si el mes es más corto)' : ''}`;
    }
    P.textoFrecuencia = textoFrecuencia;

    // ---- Fichas (una sola ficha por objeto, se abra desde donde se abra)
    S.pago = function ({ id }) {
        const st = P.st;
        const p = M.pago(st, id);
        if (!p) return S.hoy();
        const hz = M.horizonte(st);
        const abiertas = M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, 400)).filter((o) => o.estado === 'pendiente' || o.estado === 'vencido');
        const prox = abiertas[0];
        const hechas = M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, 400)).filter((o) => o.hecho);
        const historia = [...hechas.map((o) => ({ fecha: o.fecha, monto: o.monto, estado: o.estado, hecho: o.hecho })), ...(p.previos || []).map((x) => ({ ...x, estado: 'pagado' }))].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
        const medio = M.medio(st, p.medio);
        const ing = p.descuento ? M.ingreso(st, p.descuento) : null;
        const avisoTexto = (a) => (a.tipo === 'recibo' ? `Revisar el recibo · el ${a.dia}` : a.tipo === 'antes' ? `Un día antes · 8:00 a. m.` : 'El día que vence · 8:00 a. m.');
        const atrasTexto = P.atrasDe('Pagos');
        const estadoProx = ing
            ? `<p class="fila-s">Se descuenta solo de ${esc(ing.nombre.toLowerCase())}: al confirmar que llegó, queda pagado. No baja tu libre otra vez.</p>`
            : prox
              ? `<div class="ficha-prox"><p class="fila-s">${prox.estado === 'vencido' ? 'Venció' : 'Próximo'}: ${esc(M.capital(M.fechaLarga(prox.fecha)))}${prox.estado === 'vencido' ? ' · por confirmar' : ''}</p>
                <div class="acciones-2"><button type="button" class="btn btn--48" data-a="saltar" data-id="${p.id}" data-fecha="${prox.fecha}" data-fk="saltar">${p.frecuencia === 'unico' ? 'Saltar' : 'Saltar esta vez'}</button><button type="button" class="btn btn--prim btn--48" data-a="pagado" data-tipo="pago" data-id="${p.id}" data-fecha="${prox.fecha}" data-fk="ficha-pagado">Pagado</button></div></div>`
              : '<p class="fila-s">No hay pagos por delante.</p>';
        // V2-34: con qué ingreso lo pagas (cada ocurrencia).
        let pagasCon = '';
        if (prox && !ing) {
            const partes = M.asignacion(st, p, prox.fecha, prox.monto, hz);
            const filas = partes.map((x) => `<li><span>${M.esFundado(st, x.de) ? (prox.fecha >= hz.fecha && prox.estado !== 'vencido' ? 'Reservado de lo que tienes ahora' : 'Con lo que tienes ahora') : `Con ${esc(etiquetaFuente(x.de))}`}</span><span>${dinero(x.monto, { aprox: prox.estimado })}</span></li>`).join('');
            const regla = p.pagarCon && p.pagarCon.modo === 'antes' ? 'Siempre con el día de pago anterior.' : p.pagarCon && p.pagarCon.modo === 'parejo' ? 'Siempre repartido parejo entre tus días de pago.' : '';
            const opciones = M.fuentesPara(st, prox.fecha, hz).length > 1;
            pagasCon = tarjetaSeccion('Lo pagas con', `${P.qTexto('pagasCon')}<div class="dato"><p class="fila-s">${esc(M.capital(M.fechaLarga(prox.fecha)))}${regla ? ' · ' + esc(regla) : ''}</p><ul class="mini-desglose">${filas}</ul></div>${opciones ? `<div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="pagarCon" data-id="${p.id}" data-fecha="${prox.fecha}" data-fk="pagar-con">Cambiar o repartir</button></div>` : '<p class="fila-s">Vence antes de tu próximo ingreso: sale de lo que ya tienes.</p>'}`, { id: 'f-con', accion: P.qBtn('pagasCon') });
        }
        const tipoDeuda = D.TIPOS_DEUDA.find((x) => x.id === p.tipoDeuda);
        const debe = p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined;
        // V2-75: el cuchubal: tu turno de recibir (un ingreso esperado) y cuánto aportas y cuándo.
        const turno = P.turnoCuchubal(st, p);
        const turnoHtml = P.esCuchubal(p)
            ? tarjetaSeccion('Tu turno', turno ? `<div class="dato"><p class="txt"><strong>Tu turno de recibir: ${esc(M.fechaLarga(turno.fecha))} · ${dinero(turno.monto)}</strong></p><p class="fila-s">Aportas ${dinero(p.monto)} ${esc(textoFrecuencia(p).toLowerCase())}. Tu turno suma a tu libre el día que llega.</p></div>` : `<div class="dato"><p class="txt">Aportas ${dinero(p.monto)} ${esc(textoFrecuencia(p).toLowerCase())}. ¿Cuándo te toca recibir?</p></div><div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="turnoCuchubal" data-id="${p.id}" data-fk="pago-turno">${icon('calendar-days', 'ico-s')}Anotar mi turno</button></div>`, { id: 'p-turno' })
            : '';
        // Corrección v2.3.1: un préstamo o una cuota creados como pago normal se pueden anotar en Deudas (es el mismo pago).
        const esDeuda = !p.tipoDeuda && !p.descuento && !p.deuda && p.tipoPago !== 'suscripcion' && /pr[eé]stamo|cuota|cr[eé]dito|deuda|casa comercial|financ/i.test(p.nombre) ? tarjetaSeccion('¿Es una deuda?', `<p class="txt txt--card">Anótala en Deudas para ver cuánto debes; baja con cada «Pagado». Es este mismo pago: no se duplica.</p><div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="esDeuda" data-id="${p.id}" data-fk="es-deuda">Anotarla en Deudas</button></div>`, { id: 'f-es-deuda' }) : '';
        const filaHist = (h) => {
            const inner = `${caja(h.estado === 'saltado' ? '⏭️' : p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(M.capital(M.fechaLarga(h.fecha)))}</span><span class="fila-s">${h.estado === 'saltado' ? 'Saltado' : h.hecho && h.hecho.descuento ? 'Descontado de tu salario' : 'Pagado'}${h.hecho && h.hecho.registro ? ' · toca para corregir' : ''}</span></span><span class="fila-m">${h.estado === 'saltado' ? '' : montoHtml(h.monto)}</span>`;
            // V2-48: un pago ya marcado se abre y se corrige (o se desmarca).
            if (h.hecho && h.hecho.registro) return `<li class="fila"><button type="button" class="fila-main" data-a="editarRegistro" data-id="${h.hecho.registro}" data-fk="hist-${h.fecha}" aria-label="${esc(M.fechaLarga(h.fecha))}: pagado ${esc(dinero(h.monto))}. Corregir">${inner}</button></li>`;
            if (h.estado === 'saltado') return `<li class="fila"><button type="button" class="fila-main" data-a="desSaltar" data-id="${p.id}" data-fecha="${h.fecha}" data-fk="hist-${h.fecha}" aria-label="${esc(M.fechaLarga(h.fecha))}: saltado. Deshacer el salto">${inner}</button></li>`;
            return `<li class="fila"><div class="fila-main fila-main--quieta">${inner}</div></li>`;
        };
        return `<div class="pg">
            ${encabezado(`${emo(p.emoji, 28)} ${esc(p.nombre)}`, `${tipoDeuda ? esc(tipoDeuda.nombre) + ' · ' : ''}${esc(textoFrecuencia(p))}${ing ? '' : ' · ' + esc(medio ? medio.nombre : 'sin medio')}`, { atras: atrasTexto })}
            ${P.tipHtml('pago')}
            <section class="card ficha-cifra" aria-label="Monto">
                <p class="cifra">${p.estimado ? dinero(p.monto, { aprox: true }) : dinero(p.monto)}</p>
                <p class="fila-s">${p.estimado ? 'Estimado: cambia cada vez. Al marcarlo Pagado te pido el monto real.' : tipoDeuda ? 'Cuota fija' : 'Monto fijo'}</p>
                ${estadoProx}
            </section>
            ${turnoHtml}
            ${pagasCon}
            ${esDeuda}
            ${p.deuda || tipoDeuda ? tarjetaSeccion('Lo que debes', `<div class="dato"><p class="cifra cifra--s">${debe ? dinero(p.deuda.debe, { aprox: true }) : 'Sin anotar'}</p><p class="fila-s">Opcional. Baja con cada «Pagado».</p></div><div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="deuda" data-id="${p.id}" data-fk="deuda">${debe ? 'Actualizar lo que debo' : 'Anotar cuánto debo'}</button></div>`, { id: 'f-deuda' }) : ''}
            ${ing ? '' : tarjetaSeccion('Avisos', `<ul class="lista">${(p.avisos || []).map((a, i) => `<li class="fila fila--switch"><span class="fila-txt"><span class="fila-t">${esc(avisoTexto(a))}</span><span class="fila-s">Notificación y correo</span></span><button type="button" class="switch" role="switch" aria-checked="${a.on}" data-a="avisoSwitch" data-id="${p.id}" data-i="${i}" data-fk="sw-${i}" aria-label="${esc(avisoTexto(a))}"><span></span></button></li>`).join('')}</ul>`, { id: 'f-avisos' })}
            ${tarjetaSeccion('Historial', historia.length ? `<ul class="lista">${historia.map(filaHist).join('')}</ul>` : '<p class="vacio">Todavía no hay pagos.</p>', { id: 'f-hist' })}
            <div class="pie-acciones"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="${tipoDeuda && !ing && p.frecuencia === 'mensual' ? 'nuevaDeuda' : 'editarPago'}" data-id="${p.id}" data-fk="editar-pago">${icon('pencil', 'ico-s')}Editar</button><button type="button" class="btn btn--full btn--peligro-txt" data-a="hoja" data-hoja="yaNoAplica" data-id="${p.id}" data-fk="ya-no">${icon('ban', 'ico-s')}Ya no aplica</button></div>
        </div>`;
    };

    S.tarjeta = function ({ id }) {
        const st = P.st;
        const t = M.tarjeta(st, id);
        if (!t) return S.midinero();
        const info = M.tarjetaInfo(st, t);
        const ult = info.ult;
        const atrasTexto = P.atrasDe('Mi dinero');
        const pendiente = info.pendiente
            ? `<div class="nota nota--info" role="note">${icon('info')}<p>${info.sinCorte ? `<strong>Por ahora contamos lo que pagas normalmente${info.usual ? ` (${dinero(info.usual, { aprox: true })})` : ''}.</strong> Cuando te llegue el estado de cuenta, anótalo con tu día de corte y usamos el número real.` : `<strong>${info.pendiente.corte > st.hoy ? 'Corta' : 'Cortó'} el ${M.partes(info.pendiente.corte)[2]} de ${M.MESES[M.partes(info.pendiente.corte)[1] - 1]}.</strong> Cuando te llegue el estado de cuenta, dinos cuánto te salió.`}</p></div>${info.pendiente.corte && info.pendiente.corte > st.hoy ? '' : `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="estadoCuenta" data-id="${t.id}" data-fk="t-estado">Llegó mi estado de cuenta</button>`}`
            : '';
        const estadoTxt = ult.inicial ? '' : `<div class="dato-grid"><div><p class="fila-s">Pago de contado</p><p class="dato-n">${dinero(ult.total)}</p></div><div><p class="fila-s">Pago mínimo</p><p class="dato-n">${dinero(ult.minimo)}</p></div><div><p class="fila-s">Vas a pagar</p><p class="dato-n">${dinero(ult.aPagar)}</p></div><div><p class="fila-s">Vence</p><p class="dato-n">${esc(M.fechaCorta(ult.vence))}</p></div></div>
            ${ult.diferencia ? `<p class="txt">Anotaste ${dinero(ult.anotado)}; el estado dijo ${dinero(ult.total)}: ${dinero(ult.diferencia)} de ${ult.motivo === 'intereses' ? 'intereses o cargos' : ult.motivo === 'compras' ? 'compras que no anotaste' : 'algo sin detalle'}.</p>` : ''}
            <div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="decidirPago" data-id="${t.id}" data-fk="t-decidir">Cambiar cuánto voy a pagar</button></div>`;
        const historial = st.registros.filter((r) => (r.tipo === 'gasto' && M.medio(st, r.medio)?.tarjeta === t.id) || (r.tipo === 'pagoTarjeta' && r.tarjeta === t.id) || (r.tipo === 'cargoTarjeta' && r.tarjeta === t.id)).sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1)).slice(0, 8);
        return `<div class="pg">
            ${encabezado(`${emo(t.emoji, 28)} ${esc(t.nombre)}`, t.corte ? `Corte el ${t.corte} · pago el ${t.pagoDia}` : `Pago el ${t.pagoDia} · día de corte por anotar`, { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Lo que debes">
                <p class="fila-s">Debes en total</p>
                <p class="cifra">${info.usual ? 'Por confirmar' : dinero(info.debeTotal)}</p>
                ${info.usual ? '<p class="fila-s">Lo sabremos con tu primer estado de cuenta.</p>' : ''}
                <ul class="mini-desglose">
                    ${info.porPagarEstado ? `<li><span>Por pagar el ${esc(M.fechaCorta(ult.vence))}</span><span>${dinero(info.porPagarEstado)}</span></li>` : ''}
                    ${info.estimado ? `<li><span>Lo que pagas normalmente · vence el ${esc(M.fechaCorta(ult.vence))}</span><span>${dinero(info.estimado, { aprox: true })}</span></li>` : ''}
                    ${info.comprasNetas ? `<li><span>Compras desde el corte · se pagan el ${esc(M.fechaCorta(info.venceCompras))}</span><span>${dinero(info.comprasNetas)}</span></li>` : ''}
                    ${info.resto ? `<li><span>Sigue como deuda</span><span>${dinero(info.resto)}</span></li>` : ''}
                </ul>
                ${info.cupoLibre !== null ? `<p class="cupo"><strong>Disponible ${dinero(info.cupoLibre)}</strong> <span class="fila-s">de tu límite de crédito de ${dinero(t.cupo)}. El disponible nunca suma a tu libre: es dinero prestado.</span></p>` : ''}
                <p class="fila-s">Las compras con tarjeta bajan tu libre el día que las haces.</p>
                ${info.reservado ? `<div class="nota nota--ok" role="note">${icon('check')}<p><strong>${dinero(info.reservado)} reservados para tu pago del ${esc(P.diaPago(info, info.venceCompras))}</strong>${info.reservas.length ? ` (de tu ahorro ${esc(info.reservas.map((r) => r.de).join(', '))})` : ''}. Ya no cuentan en tu libre.</p></div>` : ''}
                ${info.porPagarEstado || info.estimado || info.reservado ? `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="pagado" data-tipo="tarjeta" data-id="${t.id}" data-fecha="${ult.vence}" data-fk="t-pagar">${icon('arrow-left-right', 'ico-s')}Pagar tarjeta</button>` : ''}
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
        if (!l) return S.midinero();
        const saldo = M.saldoLugar(st, id);
        const medios = st.medios.filter((m) => m.lugar === id);
        const regs = st.registros.filter((r) => M.lugaresDe(st, r).includes(id) || (r.tipo === 'cuadre' && r.lugar === id)).sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1));
        const despues = regs.filter((r) => r.tipo !== 'cuadre' && M.despues(r, l.cuadre));
        const cuadre = regs.find((r) => r.tipo === 'cuadre' && r.seq === l.cuadre.seq);
        const antes = regs.filter((r) => r.tipo !== 'cuadre' && !M.despues(r, l.cuadre)).slice(0, 6);
        const dif = cuadre ? cuadre.monto - cuadre.esperado : 0;
        const atrasTexto = P.atrasDe('Mi dinero');
        return `<div class="pg">
            ${encabezado(`${emo(l.emoji, 28)} ${esc(l.nombre)}`, medios.length ? 'Con ' + medios.map((m) => esc(m.nombre)).join(' y ') : '', { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Saldo">
                <p class="fila-s">Tienes</p><p class="cifra">${dinero(saldo)}</p>
                <p class="fila-s">Cuadrado el ${esc(M.fechaLarga(l.cuadre.fecha))} (${esc(M.haceDias(l.cuadre.fecha, st.hoy))}). Tu saldo parte de ese cuadre.</p>
                <div class="acciones-2"><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="cuadrar" data-id="${id}" data-fk="l-cuadrar">${icon('scale', 'ico-s')}Cuadrar</button><button type="button" class="btn btn--48" data-a="hoja" data-hoja="mover" data-id="${id}" data-fk="l-mover">${icon('arrow-left-right', 'ico-s')}Mover</button></div>
                <div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="lugar" data-id="${id}" data-fk="l-editar">${icon('pencil', 'ico-s')}Editar o eliminar</button></div>
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
        const atrasTexto = P.atrasDe('Mi dinero');
        const vencido = a.metaFecha && a.metaFecha < st.hoy && a.monto > 0;
        const metaTxt = a.meta ? (lista ? `${emo('🎉', 16)} ¡Lista para usar! Juntaste ${dinero(a.monto)} de ${dinero(a.meta)}.` : `${Math.floor((a.monto * 100) / a.meta)} % de ${dinero(a.meta)} · faltan ${dinero(a.meta - a.monto)}${a.metaFecha ? ` para el ${M.fechaLarga(a.metaFecha)}` : ''}`) : 'Sin meta: ahorras a tu ritmo.';
        const avisoVencido = vencido ? `<div class="nota nota--atencion" role="note">${icon('clock')}<div><p><strong>Era para el ${esc(M.fechaLarga(a.metaFecha))}. ¿Ya lo usaste?</strong> Si ya lo gastaste, lo cerramos sin anotar otro gasto.</p><button type="button" class="btn btn--sm" data-a="hoja" data-hoja="yaLoUse" data-id="${a.id}" data-fk="ap-yalouse">Sí, ya lo gasté</button></div></div>` : '';
        return `<div class="pg">
            ${encabezado(`${emo(a.emoji, 28)} ${esc(a.nombre)}`, 'Ahorro', { atras: atrasTexto })}
            ${avisoVencido}
            <section class="card ficha-ap" aria-label="Lo ahorrado">
                <div class="app-cover ficha-ap-portada"><svg class="app-cover-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.covers[a.portada] || ART.covers['general-amanecer']}</svg><p class="ficha-ap-l">Ahorro</p><p class="ficha-ap-n">${dinero(a.monto)}</p></div>
                <div class="ficha-ap-cuerpo">
                    <p class="txt">${metaTxt}</p>
                    ${a.meta ? barra(a.monto, a.meta, 'Avance de ' + a.nombre) : ''}
                    <div class="acciones-2"><button type="button" class="btn btn--48" data-a="hoja" data-hoja="apartar" data-id="${a.id}" data-fk="ap-mas">${icon('plus', 'ico-s')}Ahorrar más</button><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="usar" data-id="${a.id}" data-fk="ap-usar" ${a.monto ? '' : 'disabled'}>Usar</button></div>
                    <div class="acciones-2"><button type="button" class="btn" data-a="hoja" data-hoja="liberar" data-id="${a.id}" data-fk="ap-liberar" ${a.monto ? '' : 'disabled'}>Liberar</button><button type="button" class="btn" data-a="hoja" data-hoja="moverApartado" data-id="${a.id}" data-fk="ap-mover" ${a.monto && st.apartados.length > 1 ? '' : 'disabled'}>Mover a otro</button></div>
                </div>
            </section>
            <div class="nota nota--info" role="note">${icon('info')}<p>Tus ahorros siguen en tu banco o efectivo (${esc(st.lugares.map((l) => l.nombre).join(' y '))}); solo les pones nombre.</p></div>
            ${tarjetaSeccion('Meta', `<div class="dato"><p class="dato-n">${a.meta ? dinero(a.meta) : 'Sin meta'}</p><p class="fila-s">${a.metaFecha ? 'Para el ' + esc(M.fechaLarga(a.metaFecha)) : 'Sin fecha'}</p></div><div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="meta" data-id="${a.id}" data-fk="ap-meta">${a.meta ? 'Editar nombre y meta' : 'Editar nombre o ponerle meta'}</button></div>`, { id: 'ap-meta-t' })}
            ${tarjetaSeccion('Historial', a.historial.length ? `<ul class="lista">${a.historial.map((h) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(h.tipo === 'usar' ? '🎉' : h.tipo === 'liberar' ? '🔓' : '🐷')}<span class="fila-txt"><span class="fila-t">${h.tipo === 'apartar' ? 'Ahorraste' : h.tipo === 'liberar' ? 'Sacaste' : h.tipo === 'usar' ? 'Lo usaste' : h.tipo === 'devuelto' ? 'Volvió de un gasto que eliminaste' : h.tipo === 'entra' ? 'Llegó de ' + esc(h.de) : 'Pasaste a ' + esc(h.a)}</span><span class="fila-s">${esc(M.capital(M.fechaLarga(h.fecha)))}</span></span><span class="fila-m">${montoHtml(h.monto, 'neutro')}</span></div></li>`).join('')}</ul>` : '<p class="vacio">Todavía nada.</p>', { id: 'ap-hist' })}
        </div>`;
    };

    S.ingreso = function ({ id }) {
        const st = P.st;
        const ing = M.ingreso(st, id);
        if (!ing) return S.pagos();
        const atrasTexto = P.atrasDe('Pagos');
        const pendientes = M.ocurrenciasIngreso(st, ing, ing.desde, M.sumarDias(st.hoy, 400)).filter((o) => o.estado !== 'llego' && o.estado !== 'noLlego');
        const prox = pendientes[0];
        // Solo lo que la persona confirmó (V2-43): nada inventado.
        const llegadas = Object.entries(ing.llegadas).sort((a, b) => (a[0] < b[0] ? 1 : -1));
        const descuentos = M.descuentosDe(st, ing.id);
        const textoLlegada = (l) => (l.noLlego ? 'No llegó' : l.enCuadre ? 'Llegó (ya estaba en tu primer cuadre)' : 'Llegó');
        // Corrección v2.3.1: un adelanto de salario dice de qué quincena te lo descuentan (nunca se cuenta dos veces).
        let adelanto = '';
        if (ing.frecuencia === 'unico' && ing.adelanto && (ing.adelanto.descuentos || []).length) {
            adelanto = tarjetaSeccion('Te lo descuentan', `<ul class="mini-desglose">${ing.adelanto.descuentos.map((d) => `<li><span>De ${esc(P.etiquetaPagoIngreso(d.ingreso, d.fecha))}</span><span>${dinero(d.monto)}</span></li>`).join('')}</ul><p class="fila-s">Esa quincena ya viene con el descuento: no contamos el mismo dinero dos veces.</p><div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="adelanto" data-id="${ing.id}" data-fk="adelanto-cambiar">Cambiar</button></div>`, { id: 'i-adelanto' });
        } else if (ing.frecuencia === 'unico' && ing.activo !== false && (ing.tipoIngreso === 'adelanto' || /adelanto|anticipo|vale/i.test(ing.nombre))) {
            adelanto = tarjetaSeccion('¿Es un adelanto de tu salario?', `<p class="txt txt--card">Si después te lo descuentan de tu quincena, dime de cuál. Así esa quincena ya viene con el descuento y no contamos el mismo dinero dos veces.</p><div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="adelanto" data-id="${ing.id}" data-fk="adelanto-si">Sí, anotar el descuento</button></div>`, { id: 'i-adelanto' });
        }
        return `<div class="pg">
            ${encabezado(`${emo(ing.emoji, 28)} ${esc(ing.nombre)}`, `${esc(textoFrecuencia(ing))} · llega a ${esc(M.lugar(st, ing.lugar)?.nombre || '—')}`, { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Ingreso esperado">
                <p class="cifra cifra--ingreso">${dinero(ing.monto, { signo: true, aprox: ing.aprox })}</p>
                <p class="fila-s">${ing.principal ? 'Tu ingreso principal: tu libre se calcula hasta que llegue.' : ing.frecuencia === 'unico' ? 'No suma a tu libre hasta que llegue. Cuando llegue, te ayudo a repartirlo.' : 'No suma a tu libre hasta que llegue, pero sí cuenta (estimado) para tus próximos pagos.'}</p>
                ${prox ? `<p class="fila-s">Próximo: ${esc(M.capital(M.fechaLarga(prox.fecha)))}${prox.descuento ? ` · ${esc(dinero(prox.monto, { aprox: true }))}, te descuentan ${esc(dinero(prox.descuento))} del adelanto` : ''}</p>${prox.fecha <= st.hoy || ing.frecuencia === 'unico' || !ing.principal ? `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="ingresoLlego" data-id="${ing.id}" data-fecha="${prox.fecha}" data-fk="ing-llego">Ya llegó</button>` : ''}` : ''}
            </section>
            ${adelanto}
            ${descuentos.length ? tarjetaSeccion('Te descuentan del salario', `<ul class="lista">${descuentos.map((p) => `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="pago" data-id="${p.id}" data-fk="desc-${p.id}">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">Se paga solo al confirmar que llegó${p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined ? ` · debes ${dinero(p.deuda.debe, { aprox: true })}` : ''}</span></span><span class="fila-m">${montoHtml(p.monto)}</span></button></li>`).join('')}</ul><p class="fila-s">Lo que esperas (${dinero(ing.monto, { aprox: ing.aprox })}) ya es lo que recibes, sin estos descuentos.</p>`, { id: 'i-desc' }) : ''}
            ${tarjetaSeccion('Llegadas', llegadas.length ? `<ul class="lista">${llegadas.map(([f, l]) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(ing.emoji)}<span class="fila-txt"><span class="fila-t">${esc(M.capital(M.fechaLarga(f)))}</span><span class="fila-s">${textoLlegada(l)}</span></span><span class="fila-m">${l.noLlego ? '' : montoHtml(l.monto, 'ingreso')}</span></div></li>`).join('')}</ul>` : '<p class="vacio">Todavía no ha llegado.</p>', { id: 'i-hist' })}
            ${ing.activo === false ? '' : `<div class="pie-acciones"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="nuevoIngreso" data-id="${ing.id}" data-fk="editar-ingreso">${icon('pencil', 'ico-s')}Editar</button></div>`}
        </div>`;
    };

    // ---- Tu espacio, invitar y aprende
    S.espacio = function () {
        const st = P.st;
        return `<div class="pg">
            ${encabezado('Tu espacio', esc(st.espacio), { atras: 'Hoy' })}
            <section class="card" aria-labelledby="esp-quien"><div class="card-h"><h2 class="card-t" id="esp-quien">Quién lo lleva</h2></div>
                <ul class="lista"><li class="fila"><div class="fila-main fila-main--quieta"><span class="avatar avatar--s" aria-hidden="true">${esc((st.nombre || 'T').charAt(0))}</span><span class="fila-txt"><span class="fila-t">${esc(st.nombre || 'Tú')} (tú)</span><span class="fila-s">Lleva el dinero, los pagos y los ahorros</span></span></div></li></ul>
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
    /**
     * v2.5: «Aprende» = el entrenamiento («Lo esencial» y «Aprende más») y el glosario: los mismos textos que los «?».
     * v2.6 (V2-60): sin «Practicar» suelto; está dentro de «Aprender a usarla».
     */
    S.aprende = function () {
        const variable = P.variable();
        const g = (window.GLOSARIO || []).filter((x) => !x.solo || x.solo === (variable ? 'variable' : 'fijo')).map((x) => P.textoTermino(x));
        const uso = P.modo === 'uso';
        return `<div class="pg">
            ${encabezado('Aprende', 'La app, en sencillo', { atras: 'Hoy' })}
            <button type="button" class="btn btn--48 btn--full" data-a="menuIr" data-ir="aprendeMas" data-fk="apr-tour">${icon('book-open', 'ico-s')}Aprender a usarla</button>
            ${uso ? '<p class="fila-s">Se aprende con datos de ejemplo: no toca tus datos.</p>' : ''}
            ${tarjetaSeccion('Glosario', `<dl class="glosario">${g.map((x) => `<div class="glosario-i" id="glo-${x.id}"><dt>${esc(x.t)}</dt><dd>${esc(x.para)}<span class="glosario-ej">Ejemplo: ${esc(x.ejemplo)}</span></dd></div>`).join('')}</dl>`, { id: 'apr-glosario' })}
            <p class="fila-s">Estos mismos textos salen al tocar «?» y en el entrenamiento.</p>
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
        // v2.4: el «?» abre o cierra su explicación sin volver a dibujar la pantalla (el foco se queda en el botón).
        qVer: (d) => {
            P.ui.qAbiertos = { ...(P.ui.qAbiertos || {}), [d.v]: !(P.ui.qAbiertos || {})[d.v] };
            for (const b of document.querySelectorAll(`[data-a="qVer"][data-v="${d.v}"]`)) b.setAttribute('aria-expanded', String(P.ui.qAbiertos[d.v]));
            for (const t of document.querySelectorAll(`[id="q-${d.v}"]`)) t.hidden = !P.ui.qAbiertos[d.v];
            P.emitir('ayuda:termino:' + d.v);
        },
        tipOk: (d) => {
            P.modos.tipVisto(d.v);
            render({ foco: P.ui.hoja ? '#hoja-t' : '#pantalla h1' });
            P.emitir('tip:visto:' + d.v);
        },
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
            const a = P.st.avisos.find((x) => x.id === d.id) || (P.modos ? P.modos.avisoPorId(d.id) : null);
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
        pagosModo: (d) => {
            P.ui.pagosModo = d.v;
            render({ foco: `[data-fk="modo-${d.v}"]` });
            P.emitir('pagos:modo:' + d.v);
        },
        pagosVista: (d) => {
            P.ui.pagosVista = d.v;
            render();
            P.emitir('pagos:' + d.v);
        },
        irMisPagos: () => {
            P.ui.pagosModo = 'lista';
            P.irTab('pagos');
        },
        /** V2-35: la proyección de Hoy lleva a Pagos → Próxima. */
        irProxima: () => {
            P.ui.pagosVista = 'proxima';
            P.ui.pagosModo = 'calendario';
            P.irTab('pagos');
            P.emitir('pagos:proxima');
        },
        irAhorros: () => {
            if (P.ui.hoja) P.cerrarHoja({ sinFoco: true });
            P.irTab('midinero');
            P.abrir('ahorros');
        },
        /** «No, después veo»: la sugerencia se calla hasta que falte más (V2-34). */
        sugerenciaNo: (d) => {
            if (P.ui.hoja) P.ui.hoja = null;
            P.cambiar((s) => {
                s.sugerenciasVistas = { ...(s.sugerenciasVistas || {}), [d.id]: Number(d.v) };
            }, { aviso: 'Listo, te lo recuerdo si falta más', claves: ['sugerencia:no'] });
        },
        desSaltar: (d) => {
            const p = M.pago(P.st, d.id);
            P.cambiar((s) => {
                delete M.pago(s, d.id).hechos[d.fecha];
            }, { aviso: `${p.nombre}: ya no está saltado`, claves: ['guardado:desSaltar'] });
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
        if (P.colorBarra) P.colorBarra();
    };

    window.addEventListener('DOMContentLoaded', () => {
        const app = document.getElementById('app');
        app.addEventListener('click', alClic);
        app.addEventListener('input', alEscribir);
        app.addEventListener('change', alEscribir);
        document.addEventListener('keydown', alTeclear);
    });
})();
