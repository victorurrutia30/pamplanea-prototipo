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
        if (tipo === 'esperado') return `<span class="monto monto--esperado"><span class="sr-only">Ingreso esperado: </span>+${dinero(c, { aprox })}</span>`;
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
        // v2.8 (ajuste 5): Mi plan abre por fecha, o por tipo si es lo último que elegiste. `window.__pagosModo` solo lo ponen las pruebas.
        return { tab, stack: [], hoja: null, toast: null, banner: null, scroll: {}, pagosVista: 'actual', pagosModo: typeof window.__pagosModo === 'string' ? window.__pagosModo : null, pagosMes: null, mesVista: null, mesFiltro: 'todo', mesCategoria: null, descartados: {}, ob: null };
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
        // v2.8 (D-9, U05): si con esto terminaste de pagar una cuota, el aviso lo dice (y ya no sale en tu plan).
        const fin = P.tomarFinCuota ? P.tomarFinCuota() : null;
        const texto = fin ? `¡Terminaste de pagar ${fin}! Ya no sale en tu plan.` : typeof aviso === 'function' ? aviso(resultado) : aviso;
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
        // v2.7 (F04, DATOS-3): un gasto guarda la cuenta de donde salió; cambiar después la cuenta del medio no lo mueve.
        if (r.tipo === 'gasto' && r.lugar === undefined) r.lugar = M.lugarGasto(st, r);
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

        // v2.7 (DATOS-2): con lo guardado que no se puede leer, solo «Tus datos están a salvo» (nada más se ve ni se guarda).
        const aSalvo = P.modo === 'uso' && !!(P.modos && P.modos.bloqueado && P.modos.bloqueado());
        const enOnboarding = !aSalvo && P.enPrimerDia();
        document.getElementById('pantalla').innerHTML = M.unPunto(aSalvo ? P.pantallas.aSalvo() : enOnboarding ? P.pantallas.onboarding() : pantallaActual());
        const nav = document.getElementById('nav');
        const sinNav = aSalvo || enOnboarding || ['reparte', 'aldia', 'logro', 'primerNumero'].includes(P.ui.stack.at(-1)?.tipo);
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
            zona.innerHTML = M.unPunto(html);
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
        zona.innerHTML = M.unPunto(b
            ? `<div class="banner" role="status"><button type="button" class="banner-b" data-a="abrirAviso" data-id="${esc(b.id)}" data-fk="banner"><span class="banner-app" aria-hidden="true">P</span><span class="banner-txt"><span class="banner-m">PamPlanea · ahora</span><span class="banner-ti">${esc(b.titulo)}</span><span class="banner-te">${esc(b.texto)}</span></span></button><button type="button" class="banner-x" data-a="cerrarBanner" aria-label="Cerrar aviso">${icon('x')}</button></div>`
            : '');
    };

    /**
     * v2.8 ajuste 6 (punto 4, APROBADO por Victor 2026-10-22): un solo formato en Mi plan y Mes. Lo que sale, sin «−» (la lista
     * entera es lo que sale); lo que entra, con «+»; lo aproximado, «~$30.00». Lo que no suma aparte (un cobro que va en una
     * tarjeta, un descuento del salario) se ve «$10.00 · va en Mi BAC», en gris (C-7).
     */
    function montoPlan(c, tipo, { aprox = false, va = null, gris = false } = {}) {
        if (c === null || c === undefined) return '<span class="monto monto--pend">Por confirmar</span>';
        const t = dinero(c, { aprox, centavos: true });
        if (tipo === 'ingreso') return `<span class="monto monto--ingreso">${sr('Ingreso: ')}+${t}</span>`;
        if (va || gris) return `<span class="monto monto--va">${sr('No suma aparte: ')}${t}${va ? ` · ${esc(va)}` : ''}</span>`;
        return `<span class="monto monto--sale">${sr('Gasto: ')}${t}</span>`;
    }
    P.montoPlan = montoPlan;
    /** Lo que no suma aparte en «Sale»: «va en Mi BAC» o «se descuenta de tu salario» (o null). */
    P.vaEn = (st, p) => {
        if (!p) return null;
        const t = M.tarjetaDePago(st, p);
        if (t) return `va en ${P.nombreTarjeta(t)}`;
        return p.descuento ? 'se descuenta de tu salario' : null;
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
        // v2.7 (F11): un estado de cuenta anterior sin pagar: lo que faltó pasó al siguiente (no se inventa un pago).
        if (o.estado === 'arrastrado') return `${M.fechaCorta(o.fecha)} · pasó a tu estado de cuenta del ${M.fechaCorta(o.siguiente.corte)}`;
        const rel = M.relativa(o.fecha, st.hoy);
        if (!hz || hz.esHoy || hz.atrasada || !hz.ingreso) return rel;
        if (o.fecha === hz.fecha) return `${rel}, día de tu ${nombreIngreso(hz)}`;
        return o.fecha > hz.fecha ? `${rel} · después de tu ${nombreIngreso(hz)}` : rel;
    };
    P.fechaPagoTexto = fechaPagoTexto;
    /** v2.6.5 (V2-80/81): «5 de noviembre» (para «Este pago es del 5 de noviembre» y «Primero el del 12 de octubre»). */
    P.diaMes = (f) => {
        const [, m, d] = M.partes(f);
        return `${d} de ${M.MESES[m - 1]}`;
    };
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
        // V2-80: solo se marca la que toca (la primera sin pagar); las de después se ven apagadas y dicen cuál va primero.
        const sig = !esTarjeta && puedePagar ? M.porPagar(st, o.pago) : null;
        const espera = !!sig && sig.fecha !== o.fecha;
        // Recién marcado (hoy): «Pagado ✓» con «Deshacer», sin un segundo «Pagado».
        const pagadoHoy = !esTarjeta && conBoton && o.estado === 'pagado' && o.hecho && o.hecho.registro && (st.registros.find((r) => r.id === o.hecho.registro) || {}).fecha === st.hoy;
        // v2.7 (D-6, F12): pagado en parte: «Parcial · faltan $50.00» (lo que falta sigue pendiente).
        const marca = o.estado === 'pagado' ? `<span class="estado estado--ok">Pagado ✓</span>` : o.estado === 'saltado' ? '<span class="estado">Saltado</span>' : o.estado === 'arrastrado' ? `<span class="estado">${o.parcial ? `Pagaste ${dinero(o.parcial.pagado)} · ` : ''}Sin pagar completo</span>` : o.parcial ? `<span class="estado estado--parcial">Parcial · faltan ${dinero(o.parcial.falta)}</span>` : o.estado === 'vencido' ? `<span class="estado estado--pend">${icon('clock', 'ico-xs')}Por confirmar</span>` : '';
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
        // v2.6.7 (V2-87): lo que pagas normalmente de una tarjeta, igual: si cambiaste con qué lo pagas, se dice.
        if (esTarjeta && o.info && o.info.comoPago > 0 && o.fecha === o.info.vence && o.info.partes.length && (o.estado === 'pendiente' || o.estado === 'vencido') && cambiada(o, o.info.partes, hzRef)) partesTxt = `<span class="fila-s fila-s--res">${icon('hand-coins', 'ico-xs')}${esc(textoPartes(o, o.info.partes, hzRef))}</span>`;
        if (!esTarjeta && o.pago.descuento) sub = `Se descuenta solo de ${M.ingreso(st, o.pago.descuento)?.nombre.toLowerCase() || 'tu salario'}`;
        return `<li class="fila fila--pago${o.estado === 'pagado' || o.estado === 'saltado' ? ' fila--hecha' : ''}">
            <button type="button" class="fila-main" ${abrir} data-fk="${fk}">
                ${caja(emoji)}
                <span class="fila-txt"><span class="fila-t">${esc(nombre)}</span><span class="fila-s">${enLinea ? marcaMov('pago') : ''}<span>${avisoOn}${esc(sub)}</span></span>${marca ? `<span class="fila-s">${marca}</span>` : ''}${partesTxt}</span>
                <span class="fila-m">${montoHtml(o.parcial && o.estado !== 'arrastrado' ? o.parcial.falta : o.monto, 'pago', { aprox: o.estimado && !o.parcial })}${o.estimado && !o.parcial ? '<span class="fila-s">estimado</span>' : ''}</span>
            </button>
            ${puedePagar ? `<button type="button" class="btn btn--sm${espera ? ' btn--espera' : ''}" data-a="pagado" data-tipo="${esTarjeta ? 'tarjeta' : 'pago'}" data-id="${esTarjeta ? o.tarjeta.id : o.pago.id}" data-fecha="${o.fecha}" data-fk="pagado-${fk}" aria-label="${espera ? `Marcar ${esc(nombre)} como pagado: primero el del ${esc(P.diaMes(sig.fecha))}` : `Marcar ${esc(nombre)} como pagado`}">Ya lo pagué</button>` : ''}
            ${pagadoHoy ? `<button type="button" class="btn btn--sm" data-a="pagoDeshacer" data-id="${o.pago.id}" data-fecha="${o.fecha}" data-fk="deshacer-${fk}" aria-label="Deshacer: ${esc(nombre)} ya no está pagado">Deshacer</button>` : ''}
        </li>`;
    }
    P.filaPago = filaPago;

    /** El nombre que se ve de lo anotado (para buscarlo en el historial de Mes). */
    function tituloRegistro(st, r) {
        if (r.tipo === 'mover') return r.nombre || 'Mover dinero';
        if (r.tipo === 'cuadre') return `Cuadraste ${M.lugar(st, r.lugar)?.nombre || ''}`;
        if (r.tipo === 'cargoTarjeta') return `${M.tarjeta(st, r.tarjeta)?.nombre}: sin detalle`;
        return r.nombre || '';
    }
    /**
     * Una fila de lo anotado. `linea` (Mes, v2.8 ajuste 6): una sola línea con el día a la izquierda (solo en la primera de ese
     * día); lo que sale sin «−», lo que entra con «+»; las notas del cuadre se conservan.
     */
    function filaRegistro(r, { conFecha = true, linea = false, primera = true } = {}) {
        const st = P.st;
        let emoji = '🧩';
        let titulo = r.nombre || '';
        let sub = '';
        let monto = '';
        const fecha = conFecha ? M.relativa(r.fecha, st.hoy) : '';
        if (r.tipo === 'gasto') {
            const k = P.cat(r.categoria);
            emoji = r.emoji || D.EMOJI_NOMBRE[M.normalizar(r.nombre || '').split(' ')[0]] || (r.pago && M.pago(st, r.pago)?.emoji) || k.emoji;
            const m = M.medio(st, r.medio);
            sub = [fecha, m ? m.nombre : '', r.pago ? 'de Mi plan' : ''].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'gasto');
        } else if (r.tipo === 'ingreso') {
            emoji = r.emoji || P.cat(r.categoria).emoji;
            sub = [fecha, M.lugar(st, r.lugar)?.nombre].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'ingreso');
        } else if (r.tipo === 'mover') {
            emoji = r.ahorro ? '🐷' : '🔁';
            titulo = r.nombre || 'Mover dinero';
            // v2.8 (C-1): lo que guardaste en (o usaste de) un ahorro aparte: sale de (o llega a) una cuenta.
            const nombreAhorro = r.ahorro ? M.apartado(st, r.ahorro)?.nombre || 'tu ahorro' : null;
            sub = [fecha, r.ahorro ? (r.de ? `${M.lugar(st, r.de)?.nombre} → ${nombreAhorro}` : `${nombreAhorro} → ${M.lugar(st, r.a)?.nombre}`) : `${M.lugar(st, r.de)?.nombre} → ${M.lugar(st, r.a)?.nombre}`].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'neutro');
        } else if (r.tipo === 'pagoTarjeta') {
            emoji = '🔁';
            sub = [fecha, `${M.lugar(st, r.lugar)?.nombre} → ${M.tarjeta(st, r.tarjeta)?.nombre}`].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'neutro');
        } else if (r.tipo === 'cuadre') {
            emoji = '⚖️';
            // v2.7 (D-8): lo que detallaste después ya no cuenta como «sin detalle».
            const dif = M.sinDetalle(st, r);
            titulo = `Cuadraste ${M.lugar(st, r.lugar)?.nombre}`;
            sub = [fecha, dif === 0 ? (r.monto === r.esperado ? 'cuadró exacto' : 'explicado con lo que anotaste') : `${dinero(Math.abs(dif))} sin detalle`].filter(Boolean).join(' · ');
            monto = `<span class="monto monto--neutro">${dinero(r.monto)}</span>`;
        } else if (r.tipo === 'cargoTarjeta') {
            emoji = '💳';
            titulo = `${M.tarjeta(st, r.tarjeta)?.nombre}: sin detalle`;
            sub = [fecha, r.motivo === 'intereses' ? 'intereses o cargos' : r.motivo === 'compras' ? 'compras que no anotaste' : 'diferencia del estado de cuenta'].filter(Boolean).join(' · ');
            monto = montoHtml(r.monto, 'gasto');
        }
        // v2.8 (C-1): lo de un ahorro aparte se corrige desde ese ahorro, no aquí.
        const editable = ['gasto', 'ingreso', 'mover', 'pagoTarjeta'].includes(r.tipo) && !r.ahorro;
        if (linea) {
            const montoL = r.tipo === 'gasto' || r.tipo === 'cargoTarjeta' ? montoPlan(r.monto, 'gasto') : r.tipo === 'ingreso' ? montoPlan(r.monto, 'ingreso') : monto;
            // Una línea que diga mucho con poco: un movimiento es «Banco → Efectivo»; un cuadre, la cuenta y su nota («cuadró
            // exacto», «explicado con lo que anotaste»); un cargo, la tarjeta y su motivo.
            let nota = '';
            if (r.tipo === 'mover' || r.tipo === 'pagoTarjeta') titulo = sub;
            else if (r.tipo === 'cuadre' || r.tipo === 'cargoTarjeta') {
                titulo = r.tipo === 'cuadre' ? M.lugar(st, r.lugar)?.nombre || titulo : M.tarjeta(st, r.tarjeta)?.nombre || titulo;
                nota = sub;
            }
            const dia = primera ? `<span class="pl-dia" aria-hidden="true"><span class="pl-dia-n">${M.partes(r.fecha)[2]}</span><span class="pl-dia-m">${r.fecha === st.hoy ? 'hoy' : M.MESES_CORTOS[M.partes(r.fecha)[1] - 1]}</span></span>` : '<span class="pl-dia" aria-hidden="true"></span>';
            const dentro = `${sr(`${M.fechaCorta(r.fecha)}: `)}${caja(emoji, 'emo--sm')}<span class="pl-n">${esc(titulo)}</span>${nota ? `<span class="pl-e">${esc(nota)}</span>` : ''}<span class="pl-m">${montoL}</span>`;
            return `<li class="pl-fila${primera ? ' pl-fila--dia' : ''}">${dia}${editable ? `<button type="button" class="pl-b" data-a="editarRegistro" data-id="${r.id}" data-fk="reg-${r.id}" aria-label="${esc(titulo)}${nota ? ', ' + esc(nota) : ''}. Corregir">${dentro}</button>` : `<div class="pl-b pl-b--quieta">${dentro}</div>`}</li>`;
        }
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
    /** v2.6.7 (V2-87): con qué ingreso(s) se paga lo que pagas normalmente de una tarjeta: «tu quincena del 14 de noviembre». */
    P.fuentesTarjeta = (info) => P.lista([...new Set(info.partes.filter((x) => !M.esFundado(P.st, x.de)).map((x) => etiquetaFuente(x.de)))]);
    /** Las partes de un pago con texto: «Reservando $100 de lo que tienes ahora · $100 con tu quincena del 29». */
    function textoPartes(o, partes, hz) {
        const st = P.st;
        if (partes.length === 1) {
            const x = partes[0];
            if (!M.esFundado(st, x.de)) return `Con ${etiquetaFuente(x.de)}`;
            return o.fecha >= hz.fecha && o.estado !== 'vencido' ? 'Ya contado de lo que tienes ahora' : 'Con lo que tienes ahora';
        }
        return M.capital(partes.map((x) => (M.esFundado(st, x.de) ? `${dinero(x.monto)} de lo que tienes ahora` : `${dinero(x.monto)} con ${etiquetaFuente(x.de)}`)).join(' · '));
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
        // v2.8 (D-2): «pago» se dice solo para deudas: lo que sale de tu plan son tus gastos.
        return `ingreso ${dinero(x.entra, { aprox: true })} · gastos ${dinero(x.pagos, { aprox: true })} · ${quedan}`;
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
    /** `centavos`: con centavos también lo aproximado (Mi plan, v2.8 ajuste 6, punto 4). */
    function incluyePeriodo(x, { centavos = false } = {}) {
        const partes = x.otros.map((o) => `${dinero(o.monto, { aprox: true, centavos })} ${P.deQuien(o.ingreso)}`);
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
        return `<button type="button" class="proy" data-a="irProxima" data-fk="proyeccion" aria-label="${esc(tituloPeriodo(x, k.hz))}: ${esc(lineaPeriodo(x))}${inc ? '. ' + esc(inc) : ''}. Ver el calendario">
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
                    ? (x.primero ? btn(`Pagarlo con ${a.fuente === 'ahora' ? 'lo que tienes' : etiquetaFuente(a.fuente)}`, `data-a="hoja" data-hoja="pagarCon"${x.primero.tarjeta ? ' data-de-tarjeta="si"' : ''} data-id="${x.primero.pago.id}" data-fecha="${x.primero.fecha}" data-sugerida="${a.fuente}" data-fk="at-sug-pagar"`, true) : '') + btn(`Dejar listos ${dinero(x.deficit)}`, `data-a="hoja" data-hoja="reservar" data-id="${x.clave}" data-fecha="${a.fuente}" data-fk="at-sug-si"`, !x.primero) + no
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
                items.push({ id: `sin-${x.pago.id}-${x.fecha}`, nivel: 'ambar', pago: true, titulo: `${M.capital(art)} ${loLa} ibas a pagar con ${nombreIng}, ${llega}. ¿Con qué ${loLa} pagas?`, texto: `${dinero(x.parte, { aprox: x.estimado })}, ${x.estado === 'vencido' ? 'venció' : 'vence'} el ${M.fechaCorta(x.fecha)}.`, corto: `${art} (con ${nombreIng})`, acciones: btn('Elegir con qué', `data-a="hoja" data-hoja="pagarCon"${x.tarjeta ? ' data-de-tarjeta="si"' : ''} data-id="${x.pago.id}" data-fecha="${x.fecha}" data-fk="at-sin-${x.pago.id}"`, true) });
            } else if (a.tipo === 'apartados') {
                items.push({ id: 'ahorros', nivel: 'ambar', corto: 'tus ahorros', titulo: `Faltan ${dinero(a.faltan)} para cubrir tus ahorros`, texto: 'Después de tus pagos no te alcanza para todo lo que guardaste. Puedes sacar algo de un ahorro.', acciones: btn('Ver ahorros', 'data-a="irAhorros" data-fk="at-ahorros"') });
            } else if (a.tipo === 'estado') {
                const t = a.info.t;
                items.push({ id: 'estado-' + t.id, nivel: 'ambar', corto: `el estado de cuenta de ${t.nombre}`, titulo: '¿Ya te llegó tu estado de cuenta?', texto: a.info.sinCorte ? `${t.nombre} vence el ${M.fechaCorta(a.info.vence)}. Anótalo con tu día de corte; por ahora contamos ${a.info.usual ? dinero(a.info.usual, { aprox: true }) + ', lo que pagas normalmente' : 'nada'}.` : `${t.nombre} ${a.info.pendiente.corte > st.hoy ? 'corta' : 'cortó'} el ${M.partes(a.info.pendiente.corte)[2]}. Dinos cuánto te salió para contarlo en tu libre.`, acciones: btn('Anotar estado de cuenta', `data-a="hoja" data-hoja="estadoCuenta" data-id="${t.id}" data-fk="estado-${t.id}"`, true) });
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
        // v2.6.6 (V2-86): menos los de antes de empezar que se están revisando (se contestan en su tarjeta, sin «Pagado»).
        const enRevision = P.enRevisionAntes();
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) {
            for (const o of M.ocurrenciasPago(st, p, p.desde, m1)) {
                if (o.estado === 'vencido' && !enRevision.has(`pago:${p.id}:${o.fecha}`)) vencidos.push(o);
                // v2.7 (F21): con sus avisos apagados en la ficha, no se avisa (lo vencido sí se pregunta: es «¿ya lo pagaste?»).
                else if (o.estado === 'pendiente' && P.avisoPrendido(p, o.fecha === st.hoy ? 'vence' : 'antes')) (o.fecha === st.hoy ? hoyL : manana).push(o);
            }
        }
        for (const o of M.ocurrenciasTarjeta(st, M.sumarDias(st.hoy, -40), m1)) {
            if (o.estado === 'vencido' && enRevision.has(`tarjeta:${o.tarjeta.id}:${o.fecha}`)) continue;
            if (o.estado === 'vencido') vencidos.push(o);
            else if (o.estado === 'pendiente') (o.fecha === st.hoy ? hoyL : manana).push(o);
        }
        const nombreO = (o) => (o.tarjeta ? o.tarjeta.nombre : o.pago.nombre);
        // v2.8 (C-4): «Ya lo pagué» lo vuelve gasto.
        const pagadoBtn = (o, fk) => btn('Ya lo pagué', `data-a="pagado" data-tipo="${o.tarjeta ? 'tarjeta' : 'pago'}" data-id="${o.tarjeta ? o.tarjeta.id : o.pago.id}" data-fecha="${o.fecha}" data-fk="${fk}" aria-label="Marcar ${esc(nombreO(o))} como pagado"`, true);
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
            const o = M.ocurrenciasIngreso(st, ing, M.sumarDias(st.hoy, -20), st.hoy).filter((x) => (x.estado === 'porConfirmar' || x.estado === 'hoy') && !enRevision.has(`ingreso:${ing.id}:${x.fecha}`)).at(-1);
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
    /** v2.7 (F21): ¿el aviso «antes» (un día antes) o «vence» (el día que vence) de este pago está prendido? */
    P.avisoPrendido = (p, tipo) => {
        const a = Array.isArray(p.avisos) ? p.avisos.find((x) => x.tipo === tipo) : null;
        return !a || !!a.on;
    };
    /**
     * v2.6.6 (V2-86): lo de antes de empezar que se está revisando («Revisemos unos pagos…») no sale en los avisos, en
     * «Pongámonos al día» ni en «Por confirmar»: ahí «Pagado» anotaría otra vez un pago que ya salió. Claves «tipo:id:fecha».
     */
    P.enRevisionAntes = () => new Set((P.modos && P.modos.casosAntes ? P.modos.casosAntes() : []).map((c) => `${c.tipo}:${c.id}:${c.fecha}`));
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
        return { titulo: `${M.capital(cual)} recibes ${caen} y ${quePagas}: te faltarían ${dinero(x.deficit, { aprox: true })}.`, texto: `¿Dejas algo listo ${fuente}?` };
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
        // V2-87: lo de la tarjeta que baja tu libre de hoy; lo que pagas normalmente con un ingreso que todavía no llega va aparte.
        const ultimaTarjeta = k.tarjetas.find((x) => x.porPagarAhora + x.estimadoAhora > 0);
        const tarjetaConIngreso = ultimaTarjeta ? null : k.tarjetas.find((x) => x.conIngreso > 0);
        const lineas = [];
        if (porConfirmar) lineas.push(`<span class="portada-s">${hz.esHoy ? 'Confírmala para ver el número nuevo' : `Falta confirmar tu ${esc(nombreIngreso(hz))} del ${M.partes(porConfirmar.fecha)[2]}`}</span>`);
        else if (k.porDia !== null) lineas.push(`<span class="portada-s">${dinero(k.porDia, { aprox: true })} por día</span>`);
        else if (k.libre <= 0) lineas.push(`<span class="portada-s">${P.textoCero(k)}</span>`);
        if (porConfirmar && k.libre <= 0 && (k.faltaPagos || k.sinCubrir)) lineas.push(`<span class="portada-v">${P.textoCero(k)}</span>`);
        // V2-29 #1: el pago de la tarjeta que vence después del ingreso ya baja el libre; se dice.
        // v2.6.6 (V2-85): la fecha del pago que se cuenta (`vence`), no la del ciclo de antes de agregar la tarjeta.
        // Si vence en otro mes, con el mes («vence el 14 nov»): «el 14» solo se confundía con el 14 que ya pasó.
        // v2.6.7 (V2-87): si lo que pagas normalmente sale de lo que tienes es porque vence antes de tu próximo ingreso: se dice.
        if (ultimaTarjeta) lineas.push(`<span class="portada-v">Incluye tarjeta ${dinero(ultimaTarjeta.porPagarAhora + ultimaTarjeta.estimadoAhora, { aprox: ultimaTarjeta.estimadoAhora > 0 })}, ${ultimaTarjeta.vence < st.hoy ? 'venció' : 'vence'} el ${ultimaTarjeta.dosPagos || ultimaTarjeta.vence.slice(0, 7) === st.hoy.slice(0, 7) ? P.diaPago(ultimaTarjeta, ultimaTarjeta.vence) : M.fechaCorta(ultimaTarjeta.vence)}${ultimaTarjeta.estimadoAhora > 0 && ultimaTarjeta.vence >= st.hoy && hz.ingreso && !hz.esHoy && !hz.atrasada ? ` (antes de tu ${esc(nombreIngreso(hz))})` : ''}</span>`);
        else if (tarjetaConIngreso) lineas.push(`<span class="portada-v">Tarjeta ${dinero(tarjetaConIngreso.conIngreso, { aprox: !!tarjetaConIngreso.ult.inicial })} del ${esc(M.fechaCorta(tarjetaConIngreso.vence))}: se paga con ${esc(P.fuentesTarjeta(tarjetaConIngreso))}</span>`);
        // v2.8 (C-2, C-8): lo que ya tienes contado para lo que viene se explica en «¿De dónde sale?», no aquí.
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

        // v2.8 (C-8): Hoy muestra el número, lo que viene (máximo 3) y Anotar. Los vencidos están en el aviso (V2-55).
        // Cómo quedas la próxima quincena va en Mi plan; lo anotado, en Mes.
        const proximos = proximosPagos(3);
        const pagosHtml = tarjetaSeccion(
            'Lo que viene',
            proximos.length ? `<ul class="lista">${filasProximos(proximos, hz, k)}</ul>` : `<p class="vacio">Nada por delante en tu plan. ${enlaceAccion('Agregar un gasto fijo', 'hoja', 'data-hoja="nuevoPago" data-fk="vacio-pago"')}</p>`,
            { id: 'h-pagos', accion: enlaceAccion('Ver mi plan', 'irTab', 'data-tab="pagos" data-fk="ver-pagos"') },
        );
        const anotarHtml = `<div class="hoy-anotar"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="anotar" data-fk="hoy-anotar">${icon('plus', 'ico-s')}Anotar</button></div>`;

        return `<div class="pg pg--hoy">
            <header class="hoy-head">
                <button type="button" class="avatar" data-a="hoja" data-hoja="menu" data-fk="avatar" aria-label="Menú de ${esc(st.nombre || 'tu cuenta')}: ajustes, tu espacio y aprende">${esc(inicial)}</button>
                <div class="hoy-saludo"><h1 class="h1" tabindex="-1">${st.nombre && P.modo === 'uso' ? 'Hola, ' + esc(st.nombre) : 'Hola'}</h1><p class="sub">${esc(fechaHoy)}</p></div>
            </header>
            ${portada}
            ${P.qTexto('libre')}
            ${P.tipHtml('hoy')}
            ${P.modos && P.modos.revisionHoy ? P.modos.revisionHoy() : ''}
            ${P.modos && P.modos.preguntasHoy ? P.modos.preguntasHoy() : ''}
            ${cierreVariables(k)}
            ${avisoHoy(atencion(k))}
            ${tarjetasAviso.join('')}
            ${pagosHtml}
            ${anotarHtml}
        </div>`;
    };

    /**
     * v2.8 (C-3): antes de tu próximo ingreso, por cada gasto variable que no has cerrado: «Ibas a gastar $X y anotaste $Y.
     * ¿Ya terminaste?» (Sí / Me falta / Se me olvidó anotar). Si te pasaste, se dice sin culpa.
     */
    function cierreVariables(k) {
        const st = P.st;
        const lista = k.variables.filter((x) => M.preguntarVariable(st, x));
        if (!lista.length) return '';
        return lista
            .slice(0, 2)
            .map((x) => `<section class="card card--aviso" aria-labelledby="vc-${x.v.id}"><div class="aviso-cab">${caja(x.v.emoji)}<div><h2 class="card-t" id="vc-${x.v.id}">Ibas a gastar ${dinero(x.tope)} en ${esc(x.v.nombre)} y anotaste ${dinero(x.anotado)}. ¿Ya terminaste?</h2><p class="txt">Si ya terminaste, los ${dinero(x.falta)} que sobran vuelven a tu libre.</p></div></div><div class="chips"><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="listo" data-fk="vc-listo-${x.v.id}">Sí, ya no gasto más en esto</button><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="falta" data-fk="vc-falta-${x.v.id}">Todavía voy a gastar</button><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="anotar" data-fk="vc-anotar-${x.v.id}">Me falta anotar algo</button></div></section>`)
            .join('');
    }
    P.cierreVariables = cierreVariables;
    /**
     * Las filas de Próximos pagos; lo que vence desde el próximo ingreso va tras un separador. v2.4.1: la tarjeta
     * va antes (se paga con lo que ya tienes, V2-07; V2-87: salvo lo que pagas normalmente, que va con su ingreso) y, sin
     * ingreso fijo, lo de después de tu fin de mes (o de tus 15 días) va tras «Con lo que tengas cuando venza».
     */
    function filasProximos(lista, hz) {
        const st = P.st;
        const fila = (o) => filaPago(o, null);
        if (hz.esHoy || hz.atrasada) return lista.map(fila).join('');
        // v2.6.7 (V2-87): cada pago va bajo el ingreso con que se paga (el de la parte más grande, si lo repartiste); la
        // tarjeta también: lo que pagas normalmente va con su quincena. Lo que sale de lo que ya tienes va primero.
        const fuenteDe = (o) => {
            if (o.estado === 'vencido' || o.fecha < hz.fecha) return 'ahora';
            const partes = o.tarjeta ? (o.info && o.info.comoPago > 0 && o.fecha === o.info.vence ? o.info.partes : []) : M.asignacion(st, o.pago, o.fecha, o.monto, hz);
            const grande = partes.slice().sort((a, b) => b.monto - a.monto)[0];
            return grande && !M.esFundado(st, grande.de) ? grande.de : 'ahora';
        };
        const grupos = [];
        for (const o of lista) {
            const f = fuenteDe(o);
            const g = grupos.find((x) => x.f === f) || (grupos.push({ f, filas: [] }), grupos.at(-1));
            g.filas.push(o);
        }
        // Primero lo de ahora; después cada ingreso en el orden en que llega.
        const orden = (f) => (f === 'ahora' ? '0' : f === 'despues' ? '9' : M.esUnico(f) ? M.ingresoDeClave(st, f)?.fecha || '9' : f);
        grupos.sort((a, b) => (orden(a.f) < orden(b.f) ? -1 : orden(a.f) > orden(b.f) ? 1 : 0));
        const cual = (f) => {
            if (f === 'despues' || M.esUnico(f) || !hz.ingreso) return etiquetaFuente(f);
            const dia = M.partes(f)[2];
            const mes = f.slice(0, 7) === st.hoy.slice(0, 7) ? '' : ` de ${M.MESES[M.partes(f)[1] - 1]}`;
            return hz.ingreso.frecuencia === 'semanal' ? `tu pago del ${M.DIAS[M.diaSemana(f)]} ${dia}${mes}` : `tu ${nombreIngreso(hz)} del ${dia}${mes}`;
        };
        return grupos.map((g) => (g.f === 'ahora' ? '' : `<li class="separador" role="presentation"><span>Con ${esc(cual(g.f))}</span></li>`) + g.filas.map(fila).join('')).join('');
    }
    function proximosPagos(n) {
        const st = P.st;
        const hasta = M.sumarDias(st.hoy, 45);
        const lista = [];
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) {
            // V2-80: uno pagado por adelantado (su fecha no ha pasado) sigue aquí como «Pagado ✓», no el del mes siguiente.
            for (const o of M.ocurrenciasPago(st, p, p.desde, hasta)) if (o.estado === 'pendiente' || (o.estado === 'pagado' && o.fecha >= st.hoy)) lista.push(o);
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
        const enRevision = P.enRevisionAntes();
        for (const ing of st.ingresos.filter((x) => x.activo !== false && !x.principal && x.frecuencia !== 'unico')) {
            for (const o of M.ocurrenciasIngreso(st, ing, M.sumarDias(st.hoy, -45), M.sumarDias(st.hoy, -1))) if (o.estado === 'porConfirmar' && !enRevision.has(`ingreso:${ing.id}:${o.fecha}`)) lista.push(o);
        }
        return lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    }
    P.ingresosPorConfirmar = ingresosPorConfirmar;
    function pendientesAlDia() {
        const st = P.st;
        let pagos = 0;
        const enRevision = P.enRevisionAntes();
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) pagos += M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1)).filter((o) => o.estado === 'vencido' && !enRevision.has(`pago:${p.id}:${o.fecha}`)).length;
        pagos += M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1)).filter((o) => o.estado === 'vencido' && !enRevision.has(`tarjeta:${o.tarjeta.id}:${o.fecha}`)).length;
        return { pagos, ingresos: ingresosPorConfirmar().length };
    }
    P.pendientesAlDia = pendientesAlDia;

    // ---- Pagos
    /**
     * v2.9 «Números claros» (R10, DECIDIDO por criterio, autorizado por Victor 2026-10-23): los periodos siguen a tu ingreso
     * principal. Por quincena: Esta quincena · Próxima · Mes. Por semana: Esta semana · Próxima · Mes. Por mes: Este mes ·
     * Próximo mes (con flechas a los siguientes). Sin ingreso fijo: Este mes · Próximo mes (con flechas), o Estos 15 días ·
     * Próximos 15 días · Mes. «Mes» es el del calendario. Nunca «quincena» para quien no cobra por quincena.
     */
    function periodos() {
        const st = P.st;
        const p = M.principal(st);
        if (!p) {
            const [y, m, d] = M.partes(st.hoy);
            if (st.horizonteVariable === 'quince') {
                const ini = d > 15 ? M.fechaDe(y, m, 16) : M.fechaDe(y, m, 1);
                const fin = d > 15 ? M.fechaDe(y, m, 31) : M.fechaDe(y, m, 15);
                const sig = M.sumarDias(fin, 1);
                const [sy, sm, sd] = M.partes(sig);
                return { actual: { desde: ini, hasta: fin, t: 'Estos 15 días', vacio: 'en estos 15 días' }, proxima: { desde: sig, hasta: sd > 15 ? M.fechaDe(sy, sm, 31) : M.fechaDe(sy, sm, 15), t: 'Próximos 15 días', vacio: 'en los próximos 15 días' }, mes: true, porMes: null, semanal: false };
            }
            const [ny, nm] = M.mesMas(y, m, 1);
            return { actual: { desde: `${y}-${M.pad(m)}-01`, hasta: M.fechaDe(y, m, 31), t: 'Este mes', vacio: 'este mes' }, proxima: { desde: `${ny}-${M.pad(nm)}-01`, hasta: M.fechaDe(ny, nm, 31), t: 'Próximo mes', vacio: 'el próximo mes' }, mes: false, porMes: 'calendario', semanal: false };
        }
        const f = p.frecuencia;
        const ini = M.cortes(st, M.sumarDias(st.hoy, -100), st.hoy).at(-1) || st.hoy;
        const sig = M.corteDespues(st, st.hoy) || M.sumarDias(st.hoy, 15);
        const sig2 = M.corteDespues(st, sig) || M.sumarDias(sig, 15);
        const [t, tp, vacio, vacioP] =
            f === 'quincenal' ? ['Esta quincena', 'Próxima', 'esta quincena', 'la próxima quincena']
            : f === 'semanal' ? ['Esta semana', 'Próxima', 'esta semana', 'la próxima semana']
            : f === 'catorcenal' ? ['Estas 2 semanas', 'Próximas 2', 'estas 2 semanas', 'las próximas 2 semanas']
            : f === 'mensual' ? ['Este mes', 'Próximo mes', 'este mes', 'el próximo mes']
            : ['Este periodo', 'Próximo', 'este periodo', 'tu próximo periodo'];
        return { actual: { desde: ini, hasta: M.sumarDias(sig, -1), t, vacio }, proxima: { desde: sig, hasta: M.sumarDias(sig2, -1), t: tp, vacio: vacioP }, mes: f !== 'mensual', porMes: f === 'mensual' ? 'ingreso' : null, semanal: f === 'semanal' || f === 'catorcenal' };
    }
    P.periodos = periodos;
    /** «Del 15 al 29 oct», «Del 30 oct al 14 nov». */
    function rangoCorto(desde, hasta) {
        const [, m1, d1] = M.partes(desde);
        const [, m2, d2] = M.partes(hasta);
        const mc = (m) => M.MESES_CORTOS[m - 1];
        return m1 === m2 ? `Del ${d1} al ${d2} ${mc(m2)}` : `Del ${d1} ${mc(m1)} al ${d2} ${mc(m2)}`;
    }
    /**
     * Las fechas de cada pestaña: el periodo de hoy, el próximo (si te pagan por mes o no tienes ingreso fijo, con flechas a
     * los siguientes: `P.ui.planPaso`) o el mes del calendario (con sus flechas). `tipo`: actual, futuro (por el ingreso que lo
     * paga) o mes (por fecha).
     */
    function rangoPlan(vista, per, k) {
        if (vista === 'actual') return { ...per.actual, tipo: 'actual' };
        if (vista === 'proxima') {
            const paso = per.porMes ? Math.max(0, P.ui.planPaso || 0) : 0;
            if (per.porMes === 'ingreso') {
                const lista = k.periodos.filter((x) => x.inicio >= per.proxima.desde);
                const x = lista[Math.min(paso, lista.length - 1)] || null;
                return x ? { desde: x.inicio, hasta: x.fin, t: per.proxima.t, vacio: per.proxima.vacio, tipo: 'futuro', paso: Math.min(paso, lista.length - 1), maxPaso: lista.length - 1 } : { ...per.proxima, tipo: 'futuro', paso: 0, maxPaso: 0 };
            }
            if (per.porMes === 'calendario') {
                const [y, m] = M.mesMas(...M.partes(per.proxima.desde).slice(0, 2), paso);
                return { desde: `${y}-${M.pad(m)}-01`, hasta: M.fechaDe(y, m, 31), t: per.proxima.t, vacio: `en ${M.MESES[m - 1]}`, tipo: 'mes', paso, maxPaso: 11 };
            }
            return { ...per.proxima, tipo: 'futuro' };
        }
        const [y, m] = (P.ui.pagosMes || P.st.hoy.slice(0, 7)).split('-').map(Number);
        return { desde: `${y}-${M.pad(m)}-01`, hasta: M.fechaDe(y, m, 31), t: `${M.capital(M.MESES[m - 1])} ${y}`, vacio: `en ${M.MESES[m - 1]}`, tipo: 'mes' };
    }
    /** El día a la izquierda de la fila: «29 oct», o «22 hoy». */
    const diaPlan = (f) => `<span class="pl-dia" aria-hidden="true"><span class="pl-dia-n">${M.partes(f)[2]}</span><span class="pl-dia-m">${f === P.st.hoy ? 'hoy' : M.MESES_CORTOS[M.partes(f)[1] - 1]}</span></span>`;
    /**
     * v2.9 (R7): la comisión de un adelanto: si te descuentan más de lo que te dieron, la diferencia (repartida entre sus
     * descuentos). Para «Quincena $600.00 − adelanto $210.00 = $390.00 (incluye $10.00 de comisión)».
     */
    function comisionAdelanto(st, ingresoId, fecha) {
        let c = 0;
        for (const a of st.ingresos) {
            if (a.activo === false || !a.adelanto || !Array.isArray(a.adelanto.descuentos)) continue;
            const total = M.suma(a.adelanto.descuentos, (d) => Math.max(0, d.monto || 0));
            const extra = Math.max(0, total - (a.monto || 0));
            if (!extra || !total) continue;
            for (const d of a.adelanto.descuentos) if (d.ingreso === ingresoId && d.fecha === fecha) c += Math.round((extra * Math.max(0, d.monto || 0)) / total);
        }
        return c;
    }
    /** Cuántos periodos de tu plan empiezan entre dos fechas (desde `desde`): para tus presupuestos y tu ahorro en un mes. */
    function periodosEntre(st, ini, fin, desde = null) {
        const a = desde && desde > ini ? desde : ini;
        if (a > fin) return [];
        if (M.principal(st)) return M.cortes(st, a, fin);
        const out = [];
        const [y, m] = M.partes(ini);
        for (const d of st.horizonteVariable === 'quince' ? [1, 16] : [1]) {
            const f = M.fechaDe(y, m, d);
            if (f >= ini && f <= fin && (!desde || M.sumarDias(f, st.horizonteVariable === 'quince' ? 14 : 27) >= desde)) out.push(f);
        }
        return out;
    }
    /**
     * v2.9 «Números claros» (R1 a R4, DECIDIDO por criterio, autorizado por Victor 2026-10-23): lo que cae en una pestaña.
     * Cada peso está en un solo periodo: en el que lo pagas.
     * - El periodo de hoy: lo de sus fechas (lo ya pagado con ✓), tus presupuestos y tu ahorro programado de este periodo.
     * - El próximo: lo que pagas con ese ingreso. De tu tarjeta, solo lo que no contaste al comprar («$13.00 de $103.00»).
     * - Mes: lo de sus fechas, con tus presupuestos y tu ahorro de cada periodo que empieza ese mes.
     * Las filas en gris no suman: van en una tarjeta, se descuentan de tu salario, ya las pagaste o ya las contaste.
     * Un ingreso de una vez está solo mientras lo esperas (R8): cuando llega ya es parte de lo que tienes y lo ves en Mes.
     * Devuelve las filas y Entra, Sale y lo que queda.
     */
    function planPestana(rango, k) {
        const st = P.st;
        const filas = [];
        const fila = (x) => filas.push({ cuenta: true, aprox: false, hecha: false, marca: '', de: null, fecha: null, sub: '', ...x });
        const lugarDe = (id) => M.lugar(st, id)?.nombre || '—';
        const abrirIng = (ing) => `data-a="abrir" data-tipo="ingreso" data-id="${ing.id}"`;
        const abrirPago = (p) => `data-a="abrir" data-tipo="pago" data-id="${p.id}"`;
        const abrirTarjeta = (t) => `data-a="abrir" data-tipo="tarjeta" data-id="${t.id}"`;
        const grupoPago = (p) => (p.tipoDeuda || p.descuento ? 'deudas' : 'fijos');
        /** Un ingreso esperado o que ya llegó. R7: con el descuento de un adelanto, dice de cuánto era. */
        const filaIngreso = (o, extra = {}) => {
            const ing = o.ingreso;
            const llego = o.estado === 'llego';
            const com = o.descuento ? comisionAdelanto(st, ing.id, o.fecha) : 0;
            fila({ grupo: 'ingresos', tipo: 'ingreso', fecha: o.fecha, fk: `i-${ing.id}-${o.fecha}`, abrir: abrirIng(ing), emoji: ing.emoji, nombre: ing.nombre, monto: o.monto, aprox: !llego && !!o.aprox, hecha: llego, marca: llego ? `✓${sr(' Llegó')}` : o.estado === 'porConfirmar' ? 'por confirmar' : o.estado === 'hoy' ? '¿ya llegó?' : o.descuento ? `− adelanto ${dinero(o.descuento)}` : '', sub: `llega a: ${lugarDe(ing.lugar)}`, descuento: o.descuento || 0, comision: com, bruto: o.monto + (o.descuento || 0), ...extra });
        };
        /** Un gasto fijo o una cuota en una fecha, con su estado. */
        const filaPagoDe = (p, o, { cuenta = true, marca = null, monto = null, de = null } = {}) => {
            const va = P.vaEn(st, p);
            const pagado = o.estado === 'pagado';
            const total = o.parcial ? o.parcial.total : o.monto;
            fila({ grupo: grupoPago(p), tipo: 'pago', fecha: o.fecha, fk: `p-${p.id}-${o.fecha}`, abrir: abrirPago(p), emoji: p.emoji, nombre: p.nombre, monto: monto !== null ? monto : pagado ? (o.hecho && o.hecho.monto) || o.monto : total || 0, de, aprox: !pagado && !!o.estimado, hecha: pagado || o.estado === 'saltado', cuenta: cuenta && !va && o.estado !== 'saltado', va, marca: marca !== null ? (marca === va ? '' : marca) : va ? '' : pagado ? `✓${sr(' Pagado')}` : o.estado === 'saltado' ? 'saltado' : o.parcial ? `faltan ${dinero(o.parcial.falta)}` : o.estado === 'vencido' ? 'venció' : '', sub: va || saleDe(st, p) });
        };
        const tarjetaSub = (t) => `se paga desde: ${lugarDe(M.pagoTarjetaPropuesto(st, t).lugar)}`;
        if (rango.tipo === 'actual') {
            for (const ing of st.ingresos.filter((i) => i.activo !== false)) {
                for (const o of M.ocurrenciasIngreso(st, ing, rango.desde, rango.hasta)) {
                    if (o.estado === 'noLlego' || (ing.frecuencia === 'unico' && (o.estado === 'llego' || o.fecha < st.hoy))) continue;
                    filaIngreso(o);
                }
            }
            for (const p of st.pagos) for (const o of M.ocurrenciasPago(st, p, rango.desde, rango.hasta)) if (!(p.activo === false && !o.hecho) && o.estado !== 'vencido') filaPagoDe(p, o);
            for (const o of M.ocurrenciasTarjeta(st, rango.desde, rango.hasta)) {
                if (o.estado === 'vencido') continue;
                const pagado = o.estado === 'pagado';
                fila({ grupo: 'deudas', tipo: 'tarjeta', fecha: o.fecha, fk: `t-${o.tarjeta.id}-${o.fecha}`, abrir: abrirTarjeta(o.tarjeta), emoji: o.tarjeta.emoji, nombre: P.nombreTarjeta(o.tarjeta), monto: o.monto || 0, cuenta: o.monto !== null && o.estado !== 'arrastrado', aprox: !!o.estimado && !pagado, hecha: pagado || o.estado === 'arrastrado', marca: o.monto === null ? 'por confirmar' : pagado ? `✓${sr(' Pagado')}` : o.estado === 'arrastrado' ? 'pasó al siguiente' : o.parcial ? `faltan ${dinero(o.parcial.falta)}` : '', sub: tarjetaSub(o.tarjeta) });
            }
            for (const x of k.variables) {
                const marca = x.saltado ? `saltado ${P.estePlan()}` : x.listo ? `te sobró ${dinero(x.sobro)} ✓` : x.pasado ? `te pasaste ${dinero(x.pasado)}` : `te quedan ${dinero(x.falta)}`;
                fila({ grupo: 'presupuestos', tipo: 'presupuesto', fk: `pl-v-${x.v.id}`, abrir: `data-a="abrir" data-tipo="variable" data-id="${x.v.id}"`, emoji: x.v.emoji, nombre: x.v.nombre, monto: x.saltado ? 0 : x.tope, cuenta: !x.saltado, hecha: x.listo || x.saltado, marca, sub: marca, falta: x.falta });
            }
            for (const x of k.programado) {
                const marca = x.guardado ? `ya lo guardaste ✓` : x.falta ? `${P.estePlan()}` : 'ya llegaste a tu meta';
                fila({ grupo: 'ahorro', tipo: 'programado', fk: `pl-a-${x.a.id}`, abrir: `data-a="abrir" data-tipo="apartado" data-id="${x.a.id}"`, emoji: x.a.emoji, nombre: x.a.nombre, monto: x.monto, hecha: !!x.guardado, marca, falta: x.falta, sub: M.ahorroAparte(x.a) ? 'va a: aparte' : `va a: dentro de ${M.lugar(st, M.lugarAhorro(st, x.a))?.nombre || 'tu cuenta'}` });
            }
        } else {
            const x = rango.tipo === 'futuro' ? k.periodos.find((y) => y.inicio === rango.desde) : null;
            if (x) {
                // Lo que pagas con ese ingreso (V2-34, V2-35): lo mismo que cuenta el motor para ese periodo, fila por fila.
                for (const o of x.ingresos) filaIngreso(o);
                for (const r of x.adelantos) fila({ grupo: 'ingresos', tipo: 'ingreso', fecha: r.adelanto.fecha, fk: `i-${r.adelanto.ingreso.id}-${r.adelanto.fecha}`, abrir: abrirIng(r.adelanto.ingreso), emoji: r.adelanto.ingreso.emoji, nombre: r.adelanto.ingreso.nombre, monto: r.monto, marca: 'llegó antes', sub: 'llegó antes: es de este periodo' });
                if (x.entraGuardado) fila({ grupo: 'ingresos', tipo: 'reserva', fk: 'res-in', abrir: 'data-a="hoja" data-hoja="pasarProxima"', emoji: '📅', nombre: 'Lo que pasaste de antes', monto: x.entraGuardado, sub: 'lo pasaste de tu periodo anterior' });
                const contadas = new Set();
                for (const y of x.partes) {
                    if (y.tarjeta) {
                        const ti = k.tarjetas.find((z) => z.t.id === y.tarjeta.id);
                        const total = ti ? (ti.ult.inicial ? ti.usual : ti.porPagarEstado) : y.parte;
                        fila({ grupo: 'deudas', tipo: 'tarjeta', fecha: y.fecha, fk: `t-${y.tarjeta.id}-${y.fecha}`, abrir: abrirTarjeta(y.tarjeta), emoji: y.tarjeta.emoji, nombre: P.nombreTarjeta(y.tarjeta), monto: y.parte, de: total > y.parte ? total : null, aprox: !!y.estimado, marca: total > y.parte ? `de ${dinero(total)}` : '', sub: total > y.parte ? `${dinero(total - y.parte)} ya los contaste al comprar` : tarjetaSub(y.tarjeta) });
                        contadas.add(`t:${y.tarjeta.id}:${y.fecha}`);
                    } else {
                        const p = M.pago(st, y.pago.id) || y.pago;
                        filaPagoDe(p, y, { monto: y.parte, de: y.parte < y.monto ? y.monto : null, marca: y.parte < y.monto ? `de ${dinero(y.monto, { aprox: y.estimado })}` : null });
                        contadas.add(`p:${p.id}:${y.fecha}`);
                    }
                }
                // Lo de estas fechas que no paga este ingreso, en gris: va en tu tarjeta, ya lo pagaste o ya lo contaste.
                for (const p of st.pagos.filter((q) => q.activo !== false)) {
                    for (const o of M.ocurrenciasPago(st, p, rango.desde, rango.hasta)) {
                        if (contadas.has(`p:${p.id}:${o.fecha}`) || o.estado === 'vencido') continue;
                        const va = P.vaEn(st, p);
                        filaPagoDe(p, o, { cuenta: false, marca: va || (o.estado === 'pagado' ? `✓${sr(' Pagado')}` : o.estado === 'saltado' ? 'saltado' : 'ya contado') });
                    }
                }
                if (x.saleRes) fila({ grupo: 'ahorro', tipo: 'reserva', fk: 'res-out', abrir: 'data-a="hoja" data-hoja="pasarProxima"', emoji: '📅', nombre: 'Lo que pasas al siguiente', monto: x.saleRes, sub: 'para tu periodo siguiente' });
                for (const v of x.variables) fila({ grupo: 'presupuestos', tipo: 'presupuesto', fk: `pl-v-${v.id}`, abrir: `data-a="abrir" data-tipo="variable" data-id="${v.id}"`, emoji: v.emoji, nombre: v.nombre, monto: v.tope, marca: P.cadaPlan(), sub: `lo máximo ${P.cadaPlan()}` });
                for (const a of x.programados) {
                    const monto = a.meta ? Math.min(a.programado.monto, a.meta - a.monto) : a.programado.monto;
                    fila({ grupo: 'ahorro', tipo: 'programado', fk: `pl-a-${a.id}`, abrir: `data-a="abrir" data-tipo="apartado" data-id="${a.id}"`, emoji: a.emoji, nombre: a.nombre, monto, marca: P.cadaPlan(), sub: M.ahorroAparte(a) ? 'va a: aparte' : `va a: dentro de ${M.lugar(st, M.lugarAhorro(st, a))?.nombre || 'tu cuenta'}` });
                }
            } else {
                // Mes (o un periodo sin proyección): lo de sus fechas.
                for (const ing of st.ingresos.filter((i) => i.activo !== false)) {
                    for (const o of M.ocurrenciasIngreso(st, ing, rango.desde, rango.hasta)) {
                        if (o.estado === 'noLlego' || (ing.frecuencia === 'unico' && (o.estado === 'llego' || o.fecha < st.hoy))) continue;
                        filaIngreso(o);
                    }
                }
                for (const p of st.pagos) for (const o of M.ocurrenciasPago(st, p, rango.desde, rango.hasta)) if (!(p.activo === false && !o.hecho)) filaPagoDe(p, o);
                for (const o of M.ocurrenciasTarjeta(st, rango.desde, rango.hasta)) {
                    const e = o.estadoCuenta || null;
                    // De un estado de cuenta, lo que no contaste al comprar (lo demás bajó tu libre el día de la compra).
                    const contado = e ? Math.min(e.aPagar, (e.anotadoLibre !== undefined ? e.anotadoLibre : e.anotado) || 0) : 0;
                    const monto = o.monto === null ? 0 : e ? e.aPagar - contado : o.monto;
                    const pagado = o.estado === 'pagado';
                    fila({ grupo: 'deudas', tipo: 'tarjeta', fecha: o.fecha, fk: `t-${o.tarjeta.id}-${o.fecha}`, abrir: abrirTarjeta(o.tarjeta), emoji: o.tarjeta.emoji, nombre: P.nombreTarjeta(o.tarjeta), monto, de: contado ? e.aPagar : null, cuenta: o.monto !== null && o.estado !== 'arrastrado', aprox: !!o.estimado && !pagado, hecha: pagado || o.estado === 'arrastrado', marca: o.monto === null ? 'por confirmar' : contado ? `de ${dinero(e.aPagar)}` : pagado ? `✓${sr(' Pagado')}` : o.estado === 'arrastrado' ? 'pasó al siguiente' : '', sub: contado ? `${dinero(contado)} ya los contaste al comprar` : tarjetaSub(o.tarjeta) });
                }
                for (const v of M.variablesActivas(st)) {
                    const veces = periodosEntre(st, rango.desde, rango.hasta, v.desde).filter((f) => !((v.cierres || {})[f] && v.cierres[f].estado === 'saltado'));
                    if (!veces.length) continue;
                    fila({ grupo: 'presupuestos', tipo: 'presupuesto', fk: `pl-v-${v.id}`, abrir: `data-a="abrir" data-tipo="variable" data-id="${v.id}"`, emoji: v.emoji, nombre: v.nombre, monto: v.tope * veces.length, marca: veces.length > 1 ? `${dinero(v.tope)} × ${veces.length}` : P.cadaPlan(), sub: `lo máximo ${P.cadaPlan()}` });
                }
                for (const a of M.programados(st)) {
                    const veces = periodosEntre(st, rango.desde, rango.hasta, a.programado.desde);
                    if (!veces.length) continue;
                    const monto = M.suma(veces, (f) => ((a.guardados || {})[f] ? a.guardados[f].monto : a.programado.monto));
                    fila({ grupo: 'ahorro', tipo: 'programado', fk: `pl-a-${a.id}`, abrir: `data-a="abrir" data-tipo="apartado" data-id="${a.id}"`, emoji: a.emoji, nombre: a.nombre, monto, marca: veces.length > 1 ? `${dinero(a.programado.monto)} × ${veces.length}` : P.cadaPlan(), sub: M.ahorroAparte(a) ? 'va a: aparte' : `va a: dentro de ${M.lugar(st, M.lugarAhorro(st, a))?.nombre || 'tu cuenta'}` });
                }
            }
        }
        // El mismo día: primero lo que te cae y después lo que pagas con eso; lo que no tiene fecha (presupuestos y ahorro), al final.
        const orden = (x) => (x.grupo === 'ingresos' ? 0 : 1);
        filas.sort((a, b) => (a.fecha && b.fecha ? (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : orden(a) - orden(b)) : a.fecha ? -1 : b.fecha ? 1 : 0));
        const cuentan = filas.filter((x) => x.cuenta);
        const entra = M.suma(cuentan.filter((x) => x.grupo === 'ingresos'), (x) => x.monto);
        const sale = M.suma(cuentan.filter((x) => x.grupo !== 'ingresos'), (x) => x.monto);
        const aproxE = cuentan.some((x) => x.grupo === 'ingresos' && x.aprox);
        const aproxS = cuentan.some((x) => x.grupo !== 'ingresos' && x.aprox);
        const x = rango.tipo === 'futuro' ? k.periodos.find((y) => y.inicio === rango.desde) || null : null;
        return { rango, filas, entra, sale, quedan: entra - sale, aproxE, aproxS, aprox: aproxE || aproxS, periodo: x };
    }
    P.planPestana = planPestana;
    /** El rango de una pestaña de Mi plan (para su «¿De dónde sale?»). */
    P.rangoPlan = (vista) => rangoPlan(!periodos().mes && vista === 'mes' ? 'proxima' : vista, periodos(), P.calc());
    /**
     * Una fila del plan: el día (solo en la primera de ese día), emoji, nombre y monto. «aprox.» solo si es un estimado, «+» si
     * entra, ✓ y en gris si ya está, en gris si no suma aquí. `data-monto` y `data-cuenta`: lo que suma (para las pruebas).
     */
    function filaPlan(x, { primera = true } = {}) {
        const st = P.st;
        const f = x.fecha;
        const monto = x.grupo === 'ingresos' ? montoPlan(x.monto, 'ingreso', { aprox: x.aprox }) : montoPlan(x.monto, 'gasto', { aprox: x.aprox, va: x.va || null, gris: !x.cuenta || x.hecha });
        const cls = `pl-fila${f ? (primera ? ' pl-fila--dia' : '') : ' pl-fila--corta'}${f === st.hoy ? ' pl-fila--hoy' : ''}${x.hecha ? ' pl-fila--hecha' : ''}${!x.cuenta ? ' pl-fila--va' : ''}`;
        const dia = f ? (primera ? diaPlan(f) : '<span class="pl-dia" aria-hidden="true"></span>') : '';
        return `<li class="${cls}">${dia}<button type="button" class="pl-b" ${x.abrir} data-fk="${x.fk}" data-monto="${x.cuenta ? x.monto : 0}" data-cuenta="${x.cuenta ? 1 : 0}"${x.falta !== undefined ? ` data-falta="${x.falta}"` : ''}>${f ? sr(`${f === st.hoy ? 'Hoy, ' : ''}${M.fechaCorta(f)}: `) : ''}${caja(x.emoji, 'emo--sm')}<span class="pl-n">${esc(x.nombre)}</span>${x.marca ? `<span class="pl-e">${x.marca}</span>` : ''}<span class="pl-m">${monto}</span></button></li>`;
    }
    /**
     * La lista por fecha (R1): solo lo de este periodo. Hoy se marca aunque ese día no haya nada. Tus presupuestos y tu ahorro
     * programado van después, una línea cada uno. Sin nada, un mensaje amable.
     */
    function lineaPlan(modelo) {
        const st = P.st;
        const rango = modelo.rango;
        const conFecha = modelo.filas.filter((x) => x.fecha);
        const sinFecha = (g) => modelo.filas.filter((x) => !x.fecha && x.grupo === g);
        const hoyVacio = () => `<li class="pl-fila pl-fila--dia pl-fila--hoy">${diaPlan(st.hoy)}<p class="pl-nada">${sr('Hoy: ')}Nada que pagar hoy</p></li>`;
        let lista = '';
        if (conFecha.length) {
            let hoyPuesto = st.hoy < rango.desde || st.hoy > rango.hasta || conFecha.some((x) => x.fecha === st.hoy);
            let ultimo = null;
            const filas = [];
            for (const x of conFecha) {
                if (!hoyPuesto && x.fecha > st.hoy) {
                    filas.push(hoyVacio());
                    hoyPuesto = true;
                }
                filas.push(filaPlan(x, { primera: x.fecha !== ultimo }));
                ultimo = x.fecha;
            }
            if (!hoyPuesto) filas.push(hoyVacio());
            lista = `<ul class="pl-lista card">${filas.join('')}</ul>`;
        } else lista = `<p class="vacio plan-vacio">Nada que pagar ${esc(rango.vacio)}.</p>`;
        const bloque = (g, titulo) => {
            const xs = sinFecha(g);
            return xs.length ? `<div class="pl-bloque"><h2 class="pl-h">${titulo}</h2><ul class="pl-lista card">${xs.map((x) => filaPlan(x)).join('')}</ul></div>` : '';
        };
        return `${lista}${bloque('presupuestos', 'Presupuestos')}${bloque('ahorro', 'Ahorro programado')}`;
    }
    /**
     * Punto 4 y v2.9 (R4, R7, R11): UN resumen por pestaña. En el periodo de hoy, tu libre (el mismo número de Hoy): «Tienes −
     * Ahorros − Sale». En las demás, «Entra − Sale = Te quedarían», con «aprox.» solo si hay un estimado, el adelanto en una
     * línea y qué incluye ese número. Al tocarlo se abre su «¿De dónde sale?».
     */
    function resumenPlan(modelo, k, vista) {
        const st = P.st;
        const rango = modelo.rango;
        const notas = [];
        let linea;
        let etiqueta;
        let numero;
        let falta = false;
        if (rango.tipo === 'actual') {
            const hz = k.hz;
            const porConfirmar = hz.esHoy ? hz.ocurrencia : (hz.atrasadas || []).at(-1) || null;
            // Decisión 43 (APROBADO por Victor, 2026-10-22): Tienes − Ahorros − Sale = Tu libre. Sin ahorros dentro de tus cuentas, sin «Ahorros».
            linea = `Tienes ${dinero(k.tienes)}${k.apartado ? ` · Ahorros ${dinero(k.apartado)}` : ''} · Sale ${dinero(k.obligaciones)}`;
            etiqueta = porConfirmar ? 'Tu libre por ahora' : 'Tu libre';
            numero = dinero(k.libre);
            if (k.libre <= 0 && (k.faltaPagos > 0 || k.sinCubrir > 0)) {
                falta = true;
                notas.push(P.textoCero(k));
            }
        } else {
            const x = modelo.periodo;
            if (P.variable() && !modelo.entra) {
                // V2-59 (#27): sin ingreso fijo y sin nada esperado, no se dice «entra $0»: las ventas cuentan cuando las anotas.
                linea = 'Tus ventas cuentan cuando las anotas';
                etiqueta = 'Sale';
                numero = dinero(modelo.sale, { aprox: modelo.aproxS });
            } else {
                linea = `Entra ${dinero(modelo.entra, { aprox: modelo.aproxE })} · Sale ${dinero(modelo.sale, { aprox: modelo.aproxS })}`;
                etiqueta = modelo.quedan >= 0 ? 'Te quedarían' : 'Te faltarían';
                numero = dinero(Math.abs(modelo.quedan), { aprox: modelo.aprox });
                falta = modelo.quedan < 0 || (!!x && P.faltaPeriodo(x));
            }
            // R7: el adelanto, en una sola línea («Quincena $600.00 − adelanto $210.00 = $390.00»), con su comisión si la hay.
            for (const y of modelo.filas.filter((z) => z.cuenta && z.descuento)) notas.push(`${y.nombre} ${dinero(y.bruto)} − adelanto ${dinero(y.descuento)} = ${dinero(y.monto)}${y.comision ? ` (incluye ${dinero(y.comision)} de comisión)` : ''}`);
            if (x && x.soloFechas) notas.push(`Ojo: ${P.textoFaltaFechas(x).replace(/^El /, 'el ')}`);
            const ventas = P.variable() ? ventasPeriodo(x || { entra: modelo.entra }) : '';
            if (ventas) notas.push(ventas);
            // R4 / R11: qué incluye «Te quedarían», en palabras simples (y lo mismo en Hoy y en «¿De dónde sale?»).
            notas.push(TE_QUEDARIAN);
        }
        const q = rango.tipo === 'actual' ? 'libre' : vista === 'proxima' ? 'proxima' : 'planMes';
        return `<div class="plan-res-w"><button type="button" class="plan-res${falta ? ' plan-res--falta' : ''}" data-a="hoja" data-hoja="desglose" data-vista="${vista}" data-fk="plan-resumen">
            <span class="plan-res-r">${esc(rangoCorto(rango.desde, rango.hasta))}</span>
            <span class="plan-res-l">${esc(linea)}</span>
            <span class="plan-res-e">${falta ? icon('triangle-alert', 'ico-xs') : ''}${esc(etiqueta)}</span>
            <span class="plan-res-n">${numero}</span>
            ${notas.map((n) => `<span class="plan-res-s">${esc(M.capital(n))}</span>`).join('')}
            <span class="plan-res-mas">¿De dónde sale? ${icon('chevron-right', 'ico-xs')}</span>
        </button>${P.qBtn(q)}</div>${P.qTexto(q)}`;
    }
    /** v2.9 (R4, DECIDIDO por criterio): «Te quedarían» es lo que entra menos tu plan de ese periodo; lo que te sobre hoy no se suma. */
    const TE_QUEDARIAN = 'Lo que entra menos tu plan. No suma lo que te sobre hoy.';
    P.TE_QUEDARIAN = TE_QUEDARIAN;
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
    /** v2.8 (C-9): de dónde sale cada cosa de tu plan: «sale de: Agrícola», «se cobra en: Visa», «se descuenta de: tu salario». */
    function saleDe(st, x) {
        const t = M.tarjetaDePago(st, x);
        if (t) return `se cobra en: ${P.nombreTarjeta(t)}`;
        if (x.descuento) return `se descuenta de: ${(M.ingreso(st, x.descuento)?.nombre || 'tu salario').toLowerCase()}`;
        const m = M.medio(st, x.medio);
        const l = m && m.lugar ? M.lugar(st, m.lugar) : null;
        return l ? `sale de: ${l.nombre}` : m ? `sale de: ${m.nombre}` : 'sale de: elige con qué pagas';
    }
    P.saleDe = saleDe;
    /** v2.8 (C-10): una tarjeta se puede llamar por su apodo. */
    P.nombreTarjeta = (t) => (t && t.apodo ? t.apodo : t ? t.nombre : '');
    /** v2.8 (C-3): «por quincena», «por semana» o «por mes» (cómo te pagan). */
    P.cadaPlan = (st = P.st) => ({ quincena: 'por quincena', semana: 'por semana', catorcena: 'cada 2 semanas', mes: 'por mes', quince: 'cada 15 días' })[M.periodoPlan(st).cada] || 'cada vez que te pagan';
    /** v2.8 (C-1, C-3): «cada quincena», «cada semana», «cada mes»… (quien no cobra por quincena nunca lee «quincena»). */
    P.cadaVez = (st = P.st) => ({ quincena: 'cada quincena', semana: 'cada semana', catorcena: 'cada 2 semanas', mes: 'cada mes', quince: 'cada 15 días' })[M.periodoPlan(st).cada] || 'cada vez que te pagan';
    /** v2.8 (C-1, C-3): «esta quincena», «esta semana», «este mes»… */
    P.estePlan = (st = P.st) => ({ quincena: 'esta quincena', semana: 'esta semana', catorcena: 'estas 2 semanas', mes: 'este mes', quince: 'estos 15 días' })[M.periodoPlan(st).cada] || 'hasta tu próximo ingreso';
    /** «Cada quincena» con mayúscula (para títulos y botones). */
    P.cadaVezT = (st = P.st) => { const t = P.cadaVez(st); return t.charAt(0).toUpperCase() + t.slice(1); };
    /**
     * v2.9 (R1, R2): «Por tipo»: Ingresos · Gastos fijos · Presupuestos · Ahorro programado · Deudas, plegadas, con solo lo
     * de este periodo. El total de cada una es la suma de sus filas que suman; una sección sin nada no se muestra. Cada fila,
     * dos líneas: nombre y monto; cuándo y de dónde sale (C-9 ajustada).
     */
    function planPorTipo(modelo) {
        const rango = modelo.rango;
        const fila = (x) => {
            const monto = x.grupo === 'ingresos' ? montoPlan(x.monto, 'ingreso', { aprox: x.aprox }) : montoPlan(x.monto, 'gasto', { aprox: x.aprox, gris: !x.cuenta || x.hecha });
            const cuando = x.fecha ? M.fechaCorta(x.fecha) : '';
            const linea = [cuando, x.marca && x.grupo !== 'presupuestos' && x.grupo !== 'ahorro' ? x.marca.replace(/<[^>]+>/g, '') : '', x.sub].filter(Boolean).join(' · ');
            return `<li class="fila pt-fila${!x.cuenta ? ' pt-fila--va' : ''}"><button type="button" class="fila-main" ${x.abrir} data-fk="mp-${x.fk}" data-monto="${x.cuenta ? x.monto : 0}" data-cuenta="${x.cuenta ? 1 : 0}">${caja(x.emoji)}<span class="fila-txt"><span class="pt-l1"><span class="fila-t">${esc(x.nombre)}</span><span class="fila-m">${monto}</span></span>${linea ? `<span class="fila-s pt-s">${esc(linea)}</span>` : ''}</span></button></li>`;
        };
        const abiertas = P.ui.planAbiertas || {};
        const seccion = (clave, titulo, id, grupo) => {
            const xs = modelo.filas.filter((x) => x.grupo === grupo);
            if (!xs.length) return '';
            const cuentan = xs.filter((x) => x.cuenta);
            const total = M.suma(cuentan, (x) => x.monto);
            const aprox = cuentan.some((x) => x.aprox);
            const abierta = !!abiertas[clave];
            return `<section class="card pt-sec" aria-labelledby="${id}">
                <h2 class="pt-h" id="${id}"><button type="button" class="pt-b" aria-expanded="${abierta}" aria-controls="pt-${clave}" data-a="planSeccion" data-v="${clave}" data-fk="sec-${clave}">${icon(abierta ? 'chevron-down' : 'chevron-right', 'ico-s')}<span class="pt-t">${titulo}</span><span class="contador">(${xs.length})</span><span class="pt-total">${sr(`Total ${rango.t}: `)}${dinero(total, { aprox })}</span></button></h2>
                <div class="pt-c" id="pt-${clave}"${abierta ? '' : ' hidden'}><ul class="lista">${xs.map(fila).join('')}</ul></div>
            </section>`;
        };
        const html = `${seccion('ingresos', 'Ingresos', 'mp-ingresos', 'ingresos')}${seccion('fijos', 'Gastos fijos', 'mp-gastos-fijos', 'fijos')}${seccion('variables', 'Presupuestos', 'mp-gastos-variables', 'presupuestos')}${seccion('ahorro', 'Ahorro programado', 'mp-ahorro-programado', 'ahorro')}${seccion('deudas', 'Deudas', 'mp-pagos-de-deudas', 'deudas')}`;
        return html || `<p class="vacio plan-vacio">Nada que pagar ${esc(rango.vacio)}.</p>`;
    }
    /** V2-39 (antes de la v2.8): la lista completa de lo que pagas y te pagan. */
    function misPagosV27() {
        const st = P.st;
        const hz = M.horizonte(st);
        const activos = st.pagos.filter((p) => p.activo !== false);
        const filaPagoLista = (p) => {
            const medio = M.medio(st, p.medio);
            const prox = M.ocurrenciasPago(st, p, M.sumarDias(st.hoy, -62), M.sumarDias(st.hoy, 400)).find((o) => o.estado === 'pendiente' || o.estado === 'vencido');
            const cambiada = prox && !p.descuento ? M.asignacion(st, p, prox.fecha, prox.monto, hz) : [];
            const conQue = p.descuento ? `Se descuenta solo de ${(M.ingreso(st, p.descuento)?.nombre || 'tu salario').toLowerCase()}` : p.automatico && medio ? `Se cobra solo en ${medio.nombre} · ${textoRegla(p)}` : `${medio ? medio.nombre : 'Sin medio'} · ${textoRegla(p)}`;
            const proxTxt = prox ? `${prox.estado === 'vencido' ? 'Venció' : 'Próximo'}: ${M.fechaCorta(prox.fecha)}${cambiada.length > 1 || (cambiada[0] && cambiada[0].de !== M.periodoDe(st, prox.fecha, hz)) ? ' · ' + P.textoPartes(prox, cambiada, hz).toLowerCase() : ''}` : 'Sin fechas por delante';
            return `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="pago" data-id="${p.id}" data-fk="mp-${p.id}">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">${esc(textoFrecuencia(p, { corto: true }))}</span><span class="fila-s">${esc(conQue)}</span><span class="fila-s">${esc(proxTxt)}</span></span><span class="fila-m">${montoHtml(p.monto, 'pago', { aprox: p.estimado })}${p.frecuencia !== 'mensual' && alMes(p) ? `<span class="fila-s">${esc(dinero(alMes(p), { aprox: true }))} al mes</span>` : ''}</span></button></li>`;
        };
        const grupos = [
            ['Gastos fijos', activos.filter((p) => !p.tipoDeuda && p.tipoPago !== 'suscripcion' && !p.descuento)],
            ['Cuotas y préstamos', activos.filter((p) => p.tipoDeuda && !p.descuento)],
            ['Suscripciones', activos.filter((p) => p.tipoPago === 'suscripcion')],
            ['Descuentos del salario', activos.filter((p) => p.descuento)],
        ].filter(([, l]) => l.length);
        const tarjetas = st.tarjetas.map((t) => {
            const info = M.tarjetaInfo(st, t);
            // V2-54: sin estado de cuenta todavía, lo que paga normalmente (estimado).
            const cuanto = info.porPagarEstado ? montoHtml(info.porPagarEstado, 'pago') : info.estimado ? `${montoHtml(info.estimado, null, { aprox: true })}<span class="fila-s">estimado</span>` : '<span class="monto monto--pend">Por confirmar</span>';
            return `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="tarjeta" data-id="${t.id}" data-fk="mp-t-${t.id}">${caja(t.emoji)}<span class="fila-txt"><span class="fila-t">${esc(t.nombre)}</span><span class="fila-s">Cada mes, el ${t.pagoDia} · ${info.usual ? 'lo que pagas normalmente, hasta tu estado de cuenta' : 'según tu estado de cuenta'}</span><span class="fila-s">${esc(info.conIngreso > 0 ? `Lo que pagas normalmente: con ${P.fuentesTarjeta(info)}, como tus otros pagos` : 'Sale de lo que ya tienes: tus compras con tarjeta bajan tu libre el día que las haces')}</span></span><span class="fila-m">${cuanto}</span></button></li>`;
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
    /** Lo que ya pasó su fecha y falta confirmar (sin lo que se revisa al ponerte al día). */
    function vencidosPlan() {
        const st = P.st;
        const vencidos = [];
        const enRevision = P.enRevisionAntes();
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) for (const o of M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido' && !enRevision.has(`pago:${p.id}:${o.fecha}`)) vencidos.push(o);
        for (const o of M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido' && !enRevision.has(`tarjeta:${o.tarjeta.id}:${o.fecha}`)) vencidos.push(o);
        return vencidos;
    }
    /** Punto 2: por fecha (lo principal) o por tipo. Se recuerda la última que elegiste en este teléfono. */
    function modoPlan() {
        const m = P.ui.pagosModo || (P.modos && P.modos.vistaPlan ? P.modos.vistaPlan() : null);
        return m === 'tipo' || m === 'lista' ? 'tipo' : 'fecha';
    }
    P.modoPlan = modoPlan;
    S.pagos = function () {
        const k = P.calc();
        const per = periodos();
        // R10: quien cobra por mes (o no tiene ingreso fijo) tiene dos pestañas; «Mes» pasa a «Próximo mes».
        const vista = !per.mes && P.ui.pagosVista === 'mes' ? 'proxima' : P.ui.pagosVista;
        const rango = rangoPlan(vista, per, k);
        const modelo = planPestana(rango, k);
        const modo = modoPlan();
        // Punto 3 y R10: las pestañas del periodo.
        const tabs = [['actual', per.actual.t], ['proxima', per.proxima.t], ...(per.mes ? [['mes', 'Mes']] : [])]
            .map(([v, t]) => `<button type="button" class="app-tab" role="tab" id="pt-tab-${v}" aria-selected="${vista === v}" aria-controls="plan-panel" data-a="pagosVista" data-v="${v}" data-fk="tab-${v}">${esc(t)}</button>`)
            .join('');
        // R6: «Por fecha | Por tipo», arriba, junto a las pestañas.
        const verComo = `<div class="plan-modo" role="group" aria-label="Ver">${[['fecha', 'Por fecha'], ['tipo', 'Por tipo']].map(([v, t]) => `<button type="button" class="plan-modo-b" aria-pressed="${modo === v}" data-a="pagosModo" data-v="${v}" data-fk="ver-${v}">${t}</button>`).join('')}</div>`;
        // Mes (y el próximo mes de quien cobra por mes o no tiene ingreso fijo): flechas para ver otros meses.
        const conFlechas = vista === 'mes' || (vista === 'proxima' && per.porMes);
        const navTexto = vista === 'mes' ? rango.t : rango.tipo === 'mes' ? `${M.capital(M.MESES[M.partes(rango.desde)[1] - 1])} ${M.partes(rango.desde)[0]}` : rangoCorto(rango.desde, rango.hasta);
        const antes = vista === 'mes' ? 'pagosMes' : 'planPaso';
        const puedeAntes = vista === 'mes' || (rango.paso || 0) > 0;
        const puedeDespues = vista === 'mes' || (rango.paso || 0) < (rango.maxPaso ?? 0);
        const mesNav = conFlechas
            ? `<div class="mes-nav"><button type="button" class="icon-btn" data-a="${antes}" data-d="-1" aria-label="${vista === 'mes' ? 'Mes anterior' : 'Anterior'}" data-fk="pm-ant"${puedeAntes ? '' : ' disabled'}>${icon('chevron-left')}</button><p class="mes-nav-t" aria-live="polite">${esc(navTexto)}</p><button type="button" class="icon-btn" data-a="${antes}" data-d="1" aria-label="${vista === 'mes' ? 'Mes siguiente' : 'Siguiente'}" data-fk="pm-sig"${puedeDespues ? '' : ' disabled'}>${icon('chevron-right')}</button></div>`
            : '';
        // Punto 5: «Por confirmar» en UNA línea, solo en el periodo de hoy (es de ahora). Sin nada, no sale.
        const vencidos = vista === 'actual' ? vencidosPlan() : [];
        const porConfirmar = vencidos.length ? `<button type="button" class="plan-conf" data-a="abrir" data-tipo="porConfirmar" data-fk="plan-por-confirmar">${icon('triangle-alert', 'ico-s')}<span>${vencidos.length} por confirmar</span>${icon('chevron-right', 'ico-xs')}</button>` : '';
        // R3: sin «Más adelante»: lo que viene después se ve en su periodo (con las flechas de Mes).
        const cuerpo = modo === 'fecha' ? lineaPlan(modelo) : planPorTipo(modelo);
        // Punto 1: UN botón «+ Agregar» (los mismos formularios de siempre).
        const agregar = `<button type="button" class="btn btn--prim plan-agregar" data-a="hoja" data-hoja="agregar" data-fk="plan-agregar">${icon('plus', 'ico-s')}Agregar</button>`;
        return `<div class="pg">
            ${encabezado('Mi plan', '', { derecha: agregar })}
            ${P.tipHtml('pagos')}
            <div class="app-tabs ${per.mes ? 'tabs-3' : 'tabs-2'}" role="tablist" aria-label="Periodo">${tabs}</div>
            ${verComo}
            <div class="plan-panel" id="plan-panel" role="tabpanel" aria-labelledby="pt-tab-${vista}">
                ${mesNav}
                ${resumenPlan(modelo, k, vista)}
                ${porConfirmar}
                ${cuerpo}
            </div>
        </div>`;
    };
    /** Punto 5: «Por confirmar», con sus botones de siempre: ya pasó su fecha, ¿lo pagaste? */
    S.porConfirmar = function () {
        const hz = M.horizonte(P.st);
        const vencidos = vencidosPlan();
        return `<div class="pg">
            ${encabezado('Por confirmar', vencidos.length ? 'Ya pasó su fecha. ¿Los pagaste?' : '', { atras: P.atrasDe('Mi plan') })}
            ${vencidos.length ? `<section class="card card--venc" aria-label="Por confirmar"><ul class="lista">${vencidos.map((o) => filaPago(o, hz)).join('')}</ul></section>` : '<p class="vacio plan-vacio">Nada por confirmar. Vas al día.</p>'}
        </div>`;
    };

    // ---- Mi dinero (V2-49): un resumen corto, «Así se reparte» y tres puertas: Cuentas, Ahorros y Deudas
    /** «Atrás» dice a dónde vuelve: la pantalla anterior o la pestaña. */
    P.atrasDe = (defecto) => {
        const previo = P.ui.stack.at(-2);
        const nombres = { cuentas: 'Cuentas', ahorros: 'Ahorros', deudas: 'Deudas', pago: 'Atrás', tarjeta: 'Atrás', ingreso: 'Atrás', lugar: 'Atrás', apartado: 'Atrás', variable: 'Atrás', misPagos: 'Mi plan', porConfirmar: 'Por confirmar' };
        if (previo) return nombres[previo.tipo] || 'Atrás';
        // v2.8 (D-1): la pestaña se llama «Mi plan».
        return { hoy: 'Hoy', pagos: 'Mi plan', midinero: 'Mi dinero', mes: 'Mes' }[P.ui.tab] || defecto;
    };
    /** v2.6.7 (agregado v2.6.7 #3): la misma frase en Deudas, la ficha de la tarjeta y Mi dinero. */
    P.POR_CONFIRMAR = 'por confirmar con tu estado de cuenta';
    /** Lo que dijiste que debes de una tarjeta sin su primer estado de cuenta (más lo que anotaste con ella), o null. */
    P.debeTarjeta = (info) => info.debeHoy;
    /** Lo que debes: tarjetas (lo que dice su estado más las compras) y préstamos con «cuánto debes» anotado. */
    function deudaTotal(st) {
        const infos = st.tarjetas.map((t) => M.tarjetaInfo(st, t));
        const tarjetas = M.suma(infos, (x) => (P.debeTarjeta(x) !== null ? P.debeTarjeta(x) : x.debeTotal));
        // V2-54: una tarjeta sin su primer estado de cuenta: no se sabe cuánto debe; cuenta como cuota sin saldo (lo que paga
        // normalmente). agregado v2.6.7 #3: si dijiste cuánto debes hoy, cuenta eso, «por confirmar con tu estado de cuenta».
        const sinEstado = infos.filter((x) => x.usual > 0 && P.debeTarjeta(x) === null);
        const porConfirmar = M.suma(infos, (x) => P.debeTarjeta(x) || 0);
        const conSaldo = st.pagos.filter((p) => p.activo !== false && p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined);
        const sinSaldo = st.pagos.filter((p) => p.activo !== false && p.tipoDeuda && !(p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined));
        return { total: tarjetas + M.suma(conSaldo, (p) => p.deuda.debe), cuantas: st.tarjetas.length + conSaldo.length + sinSaldo.length, sinSaldo: sinSaldo.length + sinEstado.length, cuotasSinSaldo: M.suma(sinSaldo, (p) => alMes(p)) + M.suma(sinEstado, (x) => x.usual), aprox: conSaldo.length > 0 || porConfirmar > 0, porConfirmar };
    }
    /** «Debes ~$710», o «Cuotas $285.00 al mes» si todavía no anotó cuánto debe (nunca un «$0.00» que no es cierto). */
    const textoDebes = (deuda) =>
        !deuda.cuantas
            ? 'Debes $0.00'
            : deuda.total > 0
              ? `Debes ${dinero(deuda.total, { aprox: deuda.aprox })}${deuda.porConfirmar ? ` · ${deuda.porConfirmar === deuda.total ? '' : dinero(deuda.porConfirmar, { aprox: true }) + ' '}${P.POR_CONFIRMAR}` : ''}${deuda.sinSaldo ? (deuda.porConfirmar ? ' · y cuotas' : ' + cuotas') : ''}`
              : `Cuotas ${dinero(deuda.cuotasSinSaldo)} al mes`;
    P.deudaTotal = deudaTotal;
    S.midinero = function () {
        const st = P.st;
        const k = P.calc();
        const deuda = deudaTotal(st);
        const resumen = `<section class="total" aria-labelledby="md-total">
                <div class="total-cab"><div><h2 class="total-l" id="md-total">Tienes</h2><p class="total-n">${dinero(k.tienes)}</p><p class="total-s">Ahorros ${dinero(k.apartado + k.aparte)} · ${textoDebes(deuda)}</p></div><svg class="total-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.cuentas}</svg></div>
            </section>`;
        const lugaresTxt = st.lugares.length > 2 ? plural(st.lugares.length, 'lugar', 'lugares') : st.lugares.map((l) => `${l.nombre} ${dinero(M.saldoLugar(st, l.id))}`).join(' · ');
        const listos = st.apartados.filter((a) => a.meta && a.monto >= a.meta).length;
        const ahorrosTxt = st.apartados.length ? `${plural(st.apartados.length, 'ahorro', 'ahorros')}${listos ? ` · ${plural(listos, 'lista para usar', 'listos para usar')}` : ''}${k.aparte ? ` · ${dinero(k.aparte)} aparte` : ''}` : 'Lo que ya tienes guardado';
        const proxDeuda = (() => {
            const lista = [];
            for (const t of st.tarjetas) {
                const info = M.tarjetaInfo(st, t);
                if (info.porPagarEstado + info.estimado > 0) lista.push({ f: info.vence, t: `${t.nombre}: ${dinero(info.porPagarEstado + info.estimado, { aprox: info.estimado > 0 })} el ${M.fechaCorta(info.vence)}` });
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
                ${puerta('ahorros', 'circle-plus', 'Ahorros', dinero(k.apartado + k.aparte), ahorrosTxt, 'md-ahorros')}
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
        // v2.8 (C-1): cada ahorro dice dónde está: dentro de una cuenta (se resta de tu libre) o aparte (solo se registra).
        const donde = (a) => (M.ahorroAparte(a) ? 'Aparte' : `Dentro de ${M.lugar(st, M.lugarAhorro(st, a))?.nombre || 'tu cuenta'}`);
        const apHtml = st.apartados
            .map((a) => {
                const lista = a.meta && a.monto >= a.meta;
                const vencido = a.metaFecha && a.metaFecha < st.hoy && a.monto > 0;
                const meta = vencido ? `Era para el ${M.partes(a.metaFecha)[2]} · ¿ya lo usaste?` : a.meta ? (lista ? `<span>${emo('🎉', 14)} ¡Lista para usar!</span>` : `${Math.floor((a.monto * 100) / a.meta)} % de ${dinero(a.meta)}`) : 'Sin meta';
                return `<li class="fila fila--ap"><button type="button" class="fila-main" data-a="abrir" data-tipo="apartado" data-id="${a.id}" data-fk="a-${a.id}">${recorte(a)}<span class="fila-txt"><span class="fila-t">${emo(a.emoji, 16)} ${esc(a.nombre)}</span><span class="fila-s">${esc(donde(a))} · ${meta}</span>${a.meta ? barra(a.monto, a.meta, 'Avance de ' + a.nombre) : ''}</span><span class="fila-m">${montoHtml(a.monto)}</span></button></li>`;
            })
            .join('');
        const logros = st.logros.length
            ? tarjetaSeccion('Logros', `<ul class="lista">${st.logros.map((l) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja('🎉')}<span class="fila-txt"><span class="fila-t">${esc(l.nombre)}</span><span class="fila-s">Meta cumplida el ${esc(M.fechaLarga(l.fecha))}</span>${textoUsoLogro(l) ? `<span class="fila-s">${esc(textoUsoLogro(l))}</span>` : ''}</span><span class="fila-m">${montoHtml(l.monto)}</span></div></li>`).join('')}</ul>`, { id: 'md-logros' })
            : '';
        const cerrados = (st.cerrados || []).length
            ? tarjetaSeccion('Cerrados', `<ul class="lista">${st.cerrados.map((l) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja('🔒')}<span class="fila-txt"><span class="fila-t">${esc(l.nombre)}</span><span class="fila-s">Cerrado sin usar el ${esc(M.fechaLarga(l.fecha))} · ${dinero(l.monto)} volvieron a tu libre</span></span></div></li>`).join('')}</ul>`, { id: 'md-cerrados' })
            : '';
        return `<div class="pg">
            ${encabezado('Ahorros', 'Lo que ya tienes guardado', { atras: P.atrasDe('Mi dinero') })}
            ${P.tipHtml('ahorros')}
            <section class="total" aria-labelledby="ah-total">
                <div class="total-cab"><div><div class="total-l-w"><h2 class="total-l" id="ah-total">En ahorros</h2>${P.qBtn('ahorros')}</div><p class="total-n">${dinero(k.apartado + k.aparte)}</p><p class="total-s">Dentro de tus cuentas ${dinero(k.apartado)}${k.aparte ? ` · aparte ${dinero(k.aparte)}` : ''} · fuera de ahorros ${dinero(fuera)}</p></div><svg class="total-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.ahorros}</svg></div>
                ${P.qTexto('ahorros')}
                <div class="acciones-2"><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="apartar" data-fk="md-apartar">${icon('plus', 'ico-s')}Guardé en un ahorro</button><button type="button" class="btn btn--48" data-a="hoja" data-hoja="programar" data-fk="md-programar">${icon('calendar-days', 'ico-s')}${P.cadaVezT()}</button></div>
            </section>
            <div class="nota nota--info" role="note">${icon('info')}<p>Dentro de una cuenta, tu ahorro no cuenta en tu libre. Aparte, solo lo registramos.</p></div>
            ${k.sinCubrir > 0 ? `<div class="nota nota--ambar" role="note">${icon('triangle-alert')}<p><strong>Faltan ${dinero(k.sinCubrir)} para cubrir tus ahorros.</strong> Después de tus pagos no te alcanza para todo lo que guardaste.</p></div>` : ''}
            ${tarjetaSeccion(`Tus ahorros <span class="contador">${dinero(k.apartado + k.aparte)}</span>`, st.apartados.length ? `<ul class="lista">${apHtml}</ul>` : `<div class="vacio vacio--ilus"><svg class="app-illustration vacio-art" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.ahorros}</svg><p>Todavía no tienes ahorros. Puede estar dentro de tu banco o efectivo, o aparte.</p></div>`, { id: 'md-ap' })}
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
            const linea = info.pendiente && info.sinCorte ? `${info.estimado ? `Pagas ${dinero(info.estimado, { aprox: true })} el ${M.partes(info.vence)[2]} · ` : ''}estado de cuenta por anotar` : info.pendiente ? `Estado de cuenta por anotar · ${info.pendiente.corte > st.hoy ? 'corta' : 'cortó'} el ${M.partes(info.pendiente.corte)[2]}` : info.porPagarEstado > 0 ? `Por pagar ${dinero(info.porPagarEstado)} el ${M.partes(info.ult.vence)[2]}` : 'Al día con tu último estado';
            // v2.6.7 (agregado v2.6.7 #3): lo que dijiste que debes hoy, con la misma frase que la ficha y Mi dinero.
            const debeAprox = P.debeTarjeta(info);
            const extra = [info.comprasNetas ? `+ ${dinero(info.comprasNetas)} en compras nuevas` : '', info.resto ? `debes ${dinero(info.resto)} aparte` : ''].filter(Boolean).join(' · ');
            // V2-25: el cupo disponible se ve aquí y en la ficha, pero nunca suma al libre.
            // V2-75: «Disponible» y «Límite de crédito» en vez de «cupo».
            const cupo = info.cupoLibre !== null ? `Disponible ${dinero(info.cupoLibre)} de ${dinero(t.cupo)}` : '';
            filas.push(`<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="tarjeta" data-id="${t.id}" data-fk="t-${t.id}">${caja(t.emoji)}<span class="fila-txt"><span class="fila-t">${esc(t.nombre)}</span>${debeAprox !== null ? `<span class="fila-s">Debes ${esc(dinero(debeAprox, { aprox: true }))} · ${P.POR_CONFIRMAR}</span>` : ''}<span class="fila-s">${esc(linea)}</span>${extra ? `<span class="fila-s">${esc(extra)}</span>` : ''}${cupo ? `<span class="fila-s">${esc(cupo)}</span>` : ''}</span><span class="fila-m">${debeAprox !== null ? `${montoHtml(debeAprox, null, { aprox: true })}<span class="fila-s">debes</span>` : info.usual ? '<span class="monto monto--pend">Por confirmar</span><span class="fila-s">lo que debes</span>' : `${montoHtml(info.debeTotal)}<span class="fila-s">debes</span>`}</span></button></li>`);
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
            <section class="card ficha-cifra ficha-cifra--q" aria-label="Lo que debes">${P.qBtn('deudas')}<p class="fila-s">${deuda.total > 0 || !deuda.sinSaldo ? `Debes en total${deuda.sinSaldo ? ' (lo que tienes anotado)' : ''}` : 'Pagas en cuotas'}</p><p class="cifra">${deuda.total > 0 || !deuda.sinSaldo ? dinero(deuda.total, { aprox: deuda.aprox }) : `${dinero(deuda.cuotasSinSaldo)} al mes`}</p><p class="fila-s">${deuda.sinSaldo ? `${plural(deuda.sinSaldo, 'cuota no tiene', 'cuotas no tienen')} «cuánto debes» anotado. ` : ''}Su pago aparece solo en Mi plan. El disponible de una tarjeta nunca suma a tu libre: es dinero prestado.</p>${P.qTexto('deudas')}</section>
            ${tarjetaSeccion('Tus deudas', `${filas.length ? `<ul class="lista">${filas.join('')}</ul>` : '<p class="vacio">Si tienes una tarjeta, una cuota o un préstamo, agrégalo aquí y su pago aparece solo en Mi plan.</p>'}<div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="nuevaDeuda" data-fk="md-deuda">${icon('plus', 'ico-s')}${filas.length ? 'Agregar otra deuda o tarjeta' : 'Agregar una deuda o tarjeta'}</button></div>`, { id: 'md-deudas-lista' })}
            ${P.modo === 'uso' ? `<button type="button" class="link link--start" data-a="obCompletar" data-fk="md-completar">${icon('list-checks', 'ico-s')}Completar tu Primer día</button>` : ''}
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
        if (res && info && info.reservado > 0) return `Usado con ${m.nombre} · ${dinero(Math.min(res.monto, info.reservado))} listos para tu pago del ${P.diaPago(info, info.venceCompras)}`;
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
            ['gu', 'ya contado para pagos', gu],
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
    // ---- Mes (v2.8 ajuste 6, punto 3, APROBADO por Victor 2026-10-22): «¿qué pasó y qué aprendo?», la única pantalla que mira
    // hacia atrás. Una columna: resumen, «¿En qué se te fue?», «Tus presupuestos», «Lo que encontramos» e «Historial».
    /** Lo que salió entre dos fechas, contado igual que el mes (`M.resumenMes`): cada centavo una vez, con los cuadres explicados. */
    function salioEntre(st, desde, hasta) {
        const regs = st.registros.filter((r) => r.fecha >= desde && r.fecha <= hasta);
        return M.suma(regs.filter((r) => r.tipo === 'gasto' || r.tipo === 'cargoTarjeta'), (r) => r.monto) + M.suma(regs.filter((r) => r.tipo === 'cuadre'), (r) => Math.max(0, -M.sinDetalle(st, r)));
    }
    P.salioEntre = salioEntre;
    /** «¿En qué se te fue?»: cada fila (gastos fijos, cada categoría, sin detalle, tarjeta sin detalle). Suman lo que salió. */
    function filasEnQue(r) {
        const filas = [];
        if (r.totalFijos) filas.push({ filtro: 'fijos', emoji: '🧾', nombre: 'Gastos fijos', total: r.totalFijos });
        for (const c of r.porCategoria) {
            const k = P.cat(c.id);
            filas.push({ filtro: c.id, emoji: k.emoji, nombre: k.nombre, total: c.total, otros: c.id === 'otros' });
        }
        if (r.tarjetaSinDetalle) filas.push({ filtro: 'tarjeta', emoji: '💳', nombre: 'Tarjeta sin detalle', total: r.tarjetaSinDetalle });
        if (r.sinDetalleSalio) filas.push({ filtro: 'cuadre', emoji: '⚖️', nombre: 'Sin detalle', total: r.sinDetalleSalio });
        return filas.sort((a, b) => b.total - a.total);
    }
    P.filasEnQue = filasEnQue;
    /** «Tus presupuestos» del mes: el máximo del mes es la suma de sus quincenas (los días de pago del mes desde que existe). */
    function presupuestosMes(st, y, m) {
        const ini = `${y}-${M.pad(m)}-01`;
        const fin = M.fechaDe(y, m, 31);
        const cada = M.periodoPlan(st).cada;
        return (st.variables || [])
            .filter((v) => (!v.desde || v.desde <= fin) && (v.activo !== false || (v.hasta && v.hasta >= ini)))
            .map((v) => {
                const desde = v.desde && v.desde > ini ? v.desde : ini;
                const veces = M.principal(st) ? M.cortes(st, desde, fin).length || 1 : cada === 'quince' ? (desde <= M.fechaDe(y, m, 15) ? 2 : 1) : 1;
                const gastado = M.suma(st.registros.filter((r) => r.fecha >= desde && r.fecha <= fin && M.variableDe(st, r)?.id === v.id), (r) => r.monto);
                return { v, tope: v.tope * veces, gastado };
            });
    }
    P.presupuestosMes = presupuestosMes;
    /** «Lo que encontramos»: hasta 3, una a la vez. Gastos hormiga, planeado contra real y avance. */
    function encontramos(st, r) {
        const out = [];
        // Gastos hormiga: de $5 o menos, con el mismo nombre (o categoría), 5 o más veces en el mes.
        const chicos = r.anotados.filter((x) => x.monto <= 500);
        const grupos = {};
        for (const x of chicos) {
            const g = (grupos['n:' + M.normalizar(x.nombre || '')] = grupos['n:' + M.normalizar(x.nombre || '')] || { nombre: x.nombre, n: 0, total: 0 });
            g.n++;
            g.total += x.monto;
        }
        let hormiga = Object.values(grupos).filter((g) => g.nombre && g.n >= 5).sort((a, b) => b.total - a.total)[0];
        if (!hormiga) {
            const porCat = {};
            for (const x of chicos) {
                const g = (porCat[x.categoria] = porCat[x.categoria] || { nombre: P.cat(x.categoria).nombre, n: 0, total: 0 });
                g.n++;
                g.total += x.monto;
            }
            hormiga = Object.values(porCat).filter((g) => g.n >= 5).sort((a, b) => b.total - a.total)[0];
        }
        if (hormiga) out.push({ id: 'hormiga', emoji: '🐜', t: 'Gastos hormiga', l: `${hormiga.nombre}: ${hormiga.n} veces, ${dinero(hormiga.total)}` });
        // Planeado contra real: un gasto fijo con «~» que pagaste distinto ($1 o más).
        const dif = r.fijos
            .map((x) => ({ x, p: M.pago(st, x.pago) }))
            .filter(({ x, p }) => p && p.estimado && Math.abs(x.monto - p.monto) >= 100)
            .sort((a, b) => Math.abs(b.x.monto - b.p.monto) - Math.abs(a.x.monto - a.p.monto))[0];
        if (dif) out.push({ id: 'plan', emoji: dif.p.emoji, t: 'Planeado contra real', l: `${dif.p.nombre}: calculaste ${dinero(dif.p.monto, { aprox: true })}, pagaste ${dinero(dif.x.monto)}` });
        // Ajuste 7 (punto 4, APROBADO por Victor 2026-10-22): tus suscripciones activas, al mes, con sus nombres (antes, una línea suelta).
        // Una suscripción: la que se creó como suscripción, la de esa categoría o la que se llama como una de la lista
        // (Netflix escrito a mano).
        const nombresSusc = new Set([...(P.catSuscripciones ? P.catSuscripciones(st) : []).filter((x) => x.id !== 'otra'), ...(P.categoriasDe ? P.categoriasDe(st, 'suscripcion', { archivadas: true }) : [])].map((x) => M.normalizar(x.nombre)));
        const susc = st.pagos.filter((p) => p.activo !== false && !p.tipoDeuda && (p.tipoPago === 'suscripcion' || p.categoria === 'suscripciones' || nombresSusc.has(M.normalizar(p.nombre))));
        if (susc.length) {
            const aprox = susc.some((p) => p.estimado || p.frecuencia !== 'mensual');
            const nombres = `${susc.slice(0, 3).map((p) => p.nombre).join(', ')}${susc.length > 3 ? ` y ${susc.length - 3} más` : ''}`;
            out.push({ id: 'suscripciones', emoji: '📺', t: 'Tus suscripciones', l: `${dinero(M.suma(susc, (p) => alMes(p)), { aprox })} al mes (${nombres})`, ir: 'irSuscripciones' });
        }
        // Avance: cuánto bajaron tus deudas y cuánto guardaste.
        const deudas = M.suma(r.regs.filter((x) => x.tipo === 'pagoTarjeta' || (x.tipo === 'gasto' && x.pago && M.pago(st, x.pago)?.tipoDeuda)), (x) => x.monto);
        const guardaste = M.suma(st.apartados.flatMap((a) => a.historial || []).filter((h) => h.tipo === 'apartar' && h.fecha >= r.ini && h.fecha <= r.fin), (h) => h.monto);
        if (deudas || guardaste) out.push({ id: 'avance', emoji: '📈', t: 'Tu avance', l: [deudas ? `Tus deudas bajaron ${dinero(deudas)}` : '', guardaste ? `guardaste ${dinero(guardaste)}` : ''].filter(Boolean).join(' · ').replace(/^g/, 'G') });
        return out.slice(0, 3);
    }
    P.encontramos = encontramos;
    /** El historial del mes con el buscador y los filtros (tipo, categoría, cuenta), agrupado por día, una línea por fila. */
    function historialMes(st, r) {
        const filtro = P.ui.mesFiltro;
        const cat = P.ui.mesCategoria;
        const cuenta = P.ui.mesCuenta || null;
        const q = M.normalizar(P.ui.mesBuscar || '');
        let regs = r.regs.filter((x) => x.tipo !== 'cuadre' || filtro === 'todo' || filtro === 'movimientos');
        if (filtro === 'gastos') regs = regs.filter((x) => x.tipo === 'gasto' || x.tipo === 'cargoTarjeta');
        if (filtro === 'ingresos') regs = regs.filter((x) => x.tipo === 'ingreso');
        if (filtro === 'movimientos') regs = regs.filter((x) => ['mover', 'pagoTarjeta', 'cuadre'].includes(x.tipo));
        if (cat === 'fijos') regs = regs.filter((x) => x.tipo === 'gasto' && x.pago);
        else if (cat === 'tarjeta') regs = regs.filter((x) => x.tipo === 'cargoTarjeta');
        else if (cat === 'cuadre') regs = regs.filter((x) => x.tipo === 'cuadre');
        else if (cat) regs = regs.filter((x) => x.tipo === 'gasto' && !x.pago && x.categoria === cat);
        if (cuenta) regs = regs.filter((x) => x.lugar === cuenta || x.de === cuenta || x.a === cuenta || M.medio(st, x.medio)?.lugar === cuenta);
        if (q) regs = regs.filter((x) => M.normalizar(tituloRegistro(st, x)).includes(q));
        regs = regs.sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1));
        if (!regs.length) return `<p class="vacio plan-vacio">${q || cat || cuenta || filtro !== 'todo' ? 'Nada con esa búsqueda.' : 'Nada anotado este mes.'}</p>`;
        let ultimo = null;
        const filas = regs.map((x) => {
            const fila = filaRegistro(x, { conFecha: false, linea: true, primera: x.fecha !== ultimo });
            ultimo = x.fecha;
            return fila;
        });
        return `<ul class="pl-lista card">${filas.join('')}</ul>`;
    }
    P.mesHistorial = () => {
        const lista = document.getElementById('mes-hist-lista');
        if (!lista || !P.st) return;
        const [y, m] = (P.ui.mesVista || P.st.hoy.slice(0, 7)).split('-').map(Number);
        lista.innerHTML = M.unPunto(historialMes(P.st, M.resumenMes(P.st, y, m)));
    };
    S.mes = function () {
        const st = P.st;
        const base = P.ui.mesVista || st.hoy.slice(0, 7);
        const [y, m] = base.split('-').map(Number);
        const r = M.resumenMes(st, y, m);
        const [py, pm] = M.mesMas(y, m, -1);
        const prev = M.resumenMes(st, py, pm);
        const esActual = base === st.hoy.slice(0, 7);
        const mesNombre = M.MESES[m - 1];
        const nav = `<div class="mes-nav"><button type="button" class="icon-btn" data-a="mesNav" data-d="-1" aria-label="Mes anterior" data-fk="mes-ant">${icon('chevron-left')}</button><p class="mes-nav-t" aria-live="polite">${esc(M.capital(mesNombre))} ${y}${esActual ? '<span class="mes-hasta">hasta hoy</span>' : ''}</p><button type="button" class="icon-btn" data-a="mesNav" data-d="1" aria-label="Mes siguiente" data-fk="mes-sig" ${esActual ? 'disabled' : ''}>${icon('chevron-right')}</button></div>`;
        const cabeza = `${encabezado('Mes', '')}${P.tipHtml('mes')}${nav}`;
        // Con pocos datos: una frase amable, nunca un gráfico vacío.
        if (!r.regs.length) {
            const primero = st.inicio && st.inicio.slice(0, 7) === base;
            return `<div class="pg">${cabeza}<p class="vacio plan-vacio">${primero || base > (st.inicio || '').slice(0, 7) ? 'Cuando completes tu primer mes, aquí verás en qué se te fue.' : `No hay nada anotado en ${esc(mesNombre)}.`}</p></div>`;
        }
        // b) Resumen: lo que entró y salió, «Te sobraron» (o «Te faltaron», sin culpa) y una línea contra el mes anterior.
        const queda = r.entro - r.salio;
        let contra = '';
        if (prev.regs.length) {
            const dia = M.partes(st.hoy)[2];
            const antes = esActual ? salioEntre(st, prev.ini, M.fechaDe(py, pm, dia)) : prev.salio;
            const dif = r.salio - antes;
            const cuando = esActual ? `a esta altura de ${M.MESES[pm - 1]}` : `en ${M.MESES[pm - 1]}`;
            contra = dif === 0 ? `Igual que ${cuando}` : `${dif > 0 ? '↑' : '↓'} ${dinero(Math.abs(dif))} ${dif > 0 ? 'más' : 'menos'} que ${cuando}`;
        }
        const resumen = `<section class="card mes-res" aria-label="Resumen del mes">
                <p class="mes-res-l">Entraron ${dinero(r.entro)} · Salieron ${dinero(r.salio)}</p>
                <p class="mes-res-e">${queda >= 0 ? 'Te sobraron' : 'Te faltaron'}</p>
                <p class="mes-res-n">${dinero(Math.abs(queda))}</p>
                ${contra ? `<p class="mes-res-c">${esc(contra)}</p>` : ''}
                ${r.totalPrestamos ? `<p class="fila-s" data-fk="mes-prestamos">Te prestaron ${dinero(r.totalPrestamos)}: es una deuda, no cuenta como ingreso.</p>` : ''}
            </section>`;
        // c) «¿En qué se te fue?»: las 5 más grandes con su barra y su monto; el resto en «Otros (n)».
        const todas = filasEnQue(r);
        const verTodas = !!P.ui.mesTodas;
        const grandes = todas.filter((x) => !x.otros).slice(0, 5);
        const resto = todas.filter((x) => !grandes.includes(x));
        const filaCat = (x) => `<li><button type="button" class="mes-cat" data-a="mesCategoria" data-id="${x.filtro}" data-fk="cat-${x.filtro}" aria-pressed="${P.ui.mesCategoria === x.filtro}">${caja(x.emoji, 'emo--sm')}<span class="mes-cat-t"><span class="mes-cat-n">${esc(x.nombre)}</span><span class="mes-barra" aria-hidden="true"><span style="width:${Math.max(2, Math.round((x.total / Math.max(r.salio, 1)) * 100))}%"></span></span></span><span class="mes-cat-m">${dinero(x.total)}</span></button></li>`;
        const otros = resto.length && !verTodas ? `<li><button type="button" class="mes-cat" data-a="mesTodas" data-fk="mes-otros" aria-expanded="false">${caja('🧩', 'emo--sm')}<span class="mes-cat-t"><span class="mes-cat-n">Otros (${resto.length})</span><span class="mes-barra" aria-hidden="true"><span style="width:${Math.max(2, Math.round((M.suma(resto, (x) => x.total) / Math.max(r.salio, 1)) * 100))}%"></span></span></span><span class="mes-cat-m">${dinero(M.suma(resto, (x) => x.total))}</span></button></li>` : '';
        const enque = todas.length
            ? `<section class="card mes-sec" aria-labelledby="mes-enque"><div class="card-h"><h2 class="card-t" id="mes-enque">¿En qué se te fue?</h2>${resto.length ? `<button type="button" class="link" data-a="mesTodas" data-fk="mes-ver-todas" aria-expanded="${verTodas}">${verTodas ? 'Ver menos' : 'Ver todas'}</button>` : ''}</div>
                <ul class="mes-cats">${(verTodas ? todas : grandes).map(filaCat).join('')}${otros}</ul>
            </section>`
            : '';
        // d) «Tus presupuestos»: cuántos cumpliste y una línea por presupuesto. Sin regaños.
        const pres = presupuestosMes(st, y, m);
        const cumplidos = pres.filter((x) => x.gastado <= x.tope).length;
        const presupuestos = pres.length
            ? `<section class="card mes-sec" aria-labelledby="mes-pres"><div class="card-h"><h2 class="card-t" id="mes-pres">Tus presupuestos</h2><p class="mes-cumple">${esActual ? `Vas bien en ${cumplidos} de ${pres.length}` : `Cumpliste ${cumplidos} de ${pres.length}`}${cumplidos === pres.length ? ' ✓' : ''}</p></div>
                <ul class="pl-lista">${pres.map((x) => `<li class="pl-fila pl-fila--corta"><button type="button" class="pl-b" data-a="abrir" data-tipo="variable" data-id="${x.v.id}" data-fk="mes-pres-${x.v.id}">${caja(x.v.emoji, 'emo--sm')}<span class="pl-n">${esc(x.v.nombre)}</span><span class="pl-t">${dinero(x.gastado)} de ${dinero(x.tope)}${x.gastado <= x.tope ? ` ✓${sr(' dentro de lo máximo')}` : ` · +${dinero(x.gastado - x.tope)}`}</span></button></li>`).join('')}</ul>
            </section>`
            : '';
        // e) «Lo que encontramos»: una a la vez, con ‹ ›.
        const hallazgos = encontramos(st, r);
        const i = Math.min(P.ui.mesEnc || 0, Math.max(0, hallazgos.length - 1));
        const h = hallazgos[i];
        const lo = hallazgos.length
            ? `<section class="card mes-sec mes-enc" aria-labelledby="mes-enc-t"><div class="card-h"><h2 class="card-t" id="mes-enc-t">Lo que encontramos</h2>${hallazgos.length > 1 ? `<div class="mes-enc-nav"><button type="button" class="icon-btn" data-a="mesEnc" data-d="-1" aria-label="Anterior" data-fk="mes-enc-ant" ${i === 0 ? 'disabled' : ''}>${icon('chevron-left')}</button><span class="fila-s">${i + 1} de ${hallazgos.length}</span><button type="button" class="icon-btn" data-a="mesEnc" data-d="1" aria-label="Siguiente" data-fk="mes-enc-sig" ${i === hallazgos.length - 1 ? 'disabled' : ''}>${icon('chevron-right')}</button></div>` : ''}</div>
                ${h.ir ? `<button type="button" class="mes-enc-c mes-enc-b" aria-live="polite" data-a="${h.ir}" data-fk="mes-enc-${h.id}">${caja(h.emoji, 'emo--sm')}<span><span class="fila-t">${esc(h.t)}</span><span class="txt">${esc(h.l)}</span></span>${icon('chevron-right', 'ico-xs')}</button>` : `<div class="mes-enc-c" aria-live="polite" data-fk="mes-enc-${h.id}">${caja(h.emoji, 'emo--sm')}<div><p class="fila-t">${esc(h.t)}</p><p class="txt">${esc(h.l)}</p></div></div>`}
            </section>`
            : '';
        // f) «Historial»: 🔎 por nombre y «Filtros» (tipo, categoría, cuenta). Se corrige tocando la fila.
        const filtro = P.ui.mesFiltro;
        const cat = P.ui.mesCategoria;
        const cuenta = P.ui.mesCuenta || null;
        const activos = (filtro !== 'todo' ? 1 : 0) + (cat ? 1 : 0) + (cuenta ? 1 : 0);
        const chip = (a, v, t, sel, fk) => `<button type="button" class="chip" aria-pressed="${sel}" data-a="${a}" data-v="${v}" data-id="${v}" data-fk="${fk}">${sel ? icon('check', 'ico-xs') : ''}${esc(t)}</button>`;
        const nombreCat = (c) => (c === 'fijos' ? 'Gastos fijos' : c === 'tarjeta' ? 'Tarjeta sin detalle' : c === 'cuadre' ? 'Sin detalle' : P.cat(c).nombre);
        const panel = P.ui.mesFiltros
            ? `<div class="mes-filtros" id="mes-filtros">
                <p class="campo-l">Tipo</p><div class="chips" role="group" aria-label="Tipo">${[['todo', 'Todo'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos'], ['movimientos', 'Movimientos']].map(([v, t]) => chip('mesFiltro', v, t, filtro === v, 'mf-' + v)).join('')}</div>
                ${todas.length ? `<p class="campo-l">Categoría</p><div class="chips" role="group" aria-label="Categoría">${todas.map((x) => chip('mesCategoria', x.filtro, x.nombre, cat === x.filtro, 'mfc-' + x.filtro)).join('')}</div>` : ''}
                <p class="campo-l">Cuenta</p><div class="chips" role="group" aria-label="Cuenta">${st.lugares.map((l) => chip('mesCuenta', l.id, l.nombre, cuenta === l.id, 'mfl-' + l.id)).join('')}</div>
            </div>`
            : '';
        const quitar = (a, t, fk) => `<button type="button" class="chip chip--quitar" aria-pressed="true" data-a="${a}" data-fk="${fk}">${esc(t)} ${icon('x', 'ico-xs')}${sr('Quitar filtro')}</button>`;
        const activosHtml = [filtro !== 'todo' ? quitar('mesFiltroQuitar', { gastos: 'Gastos', ingresos: 'Ingresos', movimientos: 'Movimientos' }[filtro] || filtro, 'mf-tipo') : '', cat ? quitar('mesCategoriaQuitar', nombreCat(cat), 'mf-cat') : '', cuenta ? quitar('mesCuentaQuitar', M.lugar(st, cuenta)?.nombre || '', 'mf-cuenta') : ''].filter(Boolean).join('');
        const historial = `<section class="historial" aria-labelledby="mes-hist"><div class="hist-cab"><h2 class="card-t" id="mes-hist" tabindex="-1">Historial</h2><button type="button" class="link" data-a="mesFiltros" data-fk="mes-filtros" aria-expanded="${!!P.ui.mesFiltros}" aria-controls="mes-filtros">${icon('list-checks', 'ico-s')}Filtros${activos ? ` (${activos})` : ''}</button></div>
                <label class="mes-buscar"><span class="sr-only">Buscar por nombre</span><span aria-hidden="true">🔎</span><input type="search" id="mes-buscar" data-campo="mesBuscar" placeholder="Buscar por nombre" value="${esc(P.ui.mesBuscar || '')}" autocomplete="off"></label>
                ${panel}
                ${activosHtml ? `<div class="chips">${activosHtml}</div>` : ''}
                <div id="mes-hist-lista">${historialMes(st, r)}</div>
            </section>`;
        return `<div class="pg">
            ${cabeza}
            ${resumen}
            ${enque}
            ${presupuestos}
            ${lo}
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
        // V2-80: la que toca marcar (la primera sin pagar; una vencida, primero).
        const prox = M.porPagar(st, p);
        const hechas = M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, 400)).filter((o) => o.hecho);
        // Recién pagada (su día todavía no pasa, o se marcó hoy): «Pagado ✓» con «Deshacer», sin un segundo «Pagado».
        const ultimaPagada = hechas.filter((o) => o.estado === 'pagado' && (!prox || o.fecha < prox.fecha)).at(-1);
        const regUltima = ultimaPagada && ultimaPagada.hecho.registro ? st.registros.find((r) => r.id === ultimaPagada.hecho.registro) : null;
        const recien = ultimaPagada && regUltima && (ultimaPagada.fecha >= st.hoy || regUltima.fecha === st.hoy) ? ultimaPagada : null;
        // v2.7 (D-6): lo pagado en parte también está en el historial (y se corrige como los demás).
        const parciales = M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, 400)).filter((o) => o.parcial).map((o) => ({ fecha: o.fecha, monto: o.parcial.pagado, estado: 'parcial', falta: o.parcial.falta, hecho: { registro: o.parcial.hecho.pagos.at(-1).registro } }));
        const historia = [...hechas.map((o) => ({ fecha: o.fecha, monto: o.monto, estado: o.estado, hecho: o.hecho })), ...parciales, ...(p.previos || []).map((x) => ({ ...x, estado: 'pagado' }))].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
        const medio = M.medio(st, p.medio);
        const ing = p.descuento ? M.ingreso(st, p.descuento) : null;
        // v2.7 (F21): esta versión no manda notificaciones ni correos ni avisa a una hora: avisa al abrir la app.
        const avisoTexto = (a) => (a.tipo === 'recibo' ? `Revisar el recibo · el ${a.dia}` : a.tipo === 'antes' ? 'Un día antes' : 'El día que vence');
        const atrasTexto = P.atrasDe('Mi plan');
        const estadoProx = ing
            ? `<p class="fila-s">Se descuenta solo de ${esc(ing.nombre.toLowerCase())}: al confirmar que llegó, queda pagado. No baja tu libre otra vez.</p>`
            : recien
              ? `<div class="ficha-prox"><p class="estado estado--ok ficha-pagado-ok">Pagado ✓ · ${esc(M.capital(M.fechaLarga(recien.fecha)))}</p>${prox ? `<p class="fila-s">Después: ${esc(M.capital(M.fechaLarga(prox.fecha)))}</p>` : ''}
                <div class="acciones-2"><button type="button" class="btn btn--48" data-a="pagoDeshacer" data-id="${p.id}" data-fecha="${recien.fecha}" data-fk="ficha-deshacer">Deshacer</button></div></div>`
              : prox
                ? `<div class="ficha-prox"><p class="fila-s">${prox.estado === 'vencido' ? 'Venció' : 'Próximo'}: ${esc(M.capital(M.fechaLarga(prox.fecha)))}${prox.parcial ? ` · pagaste ${dinero(prox.parcial.pagado)}, faltan ${dinero(prox.parcial.falta)}` : prox.estado === 'vencido' ? ' · por confirmar' : ''}</p>
                <div class="acciones-2"><button type="button" class="btn btn--48" data-a="saltar" data-id="${p.id}" data-fecha="${prox.fecha}" data-fk="saltar">${p.frecuencia === 'unico' ? 'Saltar' : 'Saltar esta vez'}</button><button type="button" class="btn btn--prim btn--48" data-a="pagado" data-tipo="pago" data-id="${p.id}" data-fecha="${prox.fecha}" data-fk="ficha-pagado">Ya lo pagué</button></div></div>`
                : '<p class="fila-s">No hay pagos por delante.</p>';
        // V2-34: con qué ingreso lo pagas (cada ocurrencia).
        let pagasCon = '';
        if (prox && !ing) {
            const partes = M.asignacion(st, p, prox.fecha, prox.monto, hz);
            const filas = partes.map((x) => `<li><span>${M.esFundado(st, x.de) ? (prox.fecha >= hz.fecha && prox.estado !== 'vencido' ? 'Ya contado de lo que tienes ahora' : 'Con lo que tienes ahora') : `Con ${esc(etiquetaFuente(x.de))}`}</span><span>${dinero(x.monto, { aprox: prox.estimado })}</span></li>`).join('');
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
            const inner = `${caja(h.estado === 'saltado' ? '⏭️' : p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(M.capital(M.fechaLarga(h.fecha)))}</span><span class="fila-s">${h.estado === 'saltado' ? 'Saltado' : h.estado === 'parcial' ? `Parcial · faltan ${dinero(h.falta)}` : h.hecho && h.hecho.descuento ? 'Descontado de tu salario' : 'Pagado'}${h.hecho && h.hecho.registro ? ' · toca para corregir' : ''}</span></span><span class="fila-m">${h.estado === 'saltado' ? '' : montoHtml(h.monto)}</span>`;
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
            ${ing ? '' : tarjetaSeccion('Avísame', `<ul class="lista">${(p.avisos || []).map((a, i) => `<li class="fila fila--switch"><span class="fila-txt"><span class="fila-t">${esc(avisoTexto(a))}</span><span class="fila-s">Te avisamos al abrir la app</span></span><button type="button" class="switch" role="switch" aria-checked="${!!(a.on)}" data-a="avisoSwitch" data-id="${p.id}" data-i="${i}" data-fk="sw-${i}" aria-label="${esc(avisoTexto(a))}"><span></span></button></li>`).join('')}</ul>`, { id: 'f-avisos' })}
            ${tarjetaSeccion('Historial', historia.length ? `<ul class="lista">${historia.map(filaHist).join('')}</ul>` : '<p class="vacio">Todavía no hay pagos.</p>', { id: 'f-hist' })}
            <div class="pie-acciones"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="${tipoDeuda && !ing && p.frecuencia === 'mensual' ? 'nuevaDeuda' : 'editarPago'}" data-id="${p.id}" data-fk="editar-pago">${icon('pencil', 'ico-s')}Editar</button><button type="button" class="btn btn--full btn--peligro-txt" data-a="hoja" data-hoja="yaNoAplica" data-id="${p.id}" data-fk="ya-no">${icon('ban', 'ico-s')}Ya no aplica</button></div>
        </div>`;
    };

    /**
     * v2.8 (C-3): la ficha de un gasto variable: su tope por quincena, lo que llevas, lo que te queda (o cuánto te pasaste),
     * los gastos que lo consumieron y «¿Ya terminaste?» (Sí / Me falta / Se me olvidó anotar).
     */
    S.variable = function ({ id }) {
        const st = P.st;
        const k = P.calc();
        const x = k.variables.find((y) => y.v.id === id);
        if (!x) return S.pagos();
        const v = x.v;
        const m = M.medio(st, v.medio);
        const l = m && m.lugar ? M.lugar(st, m.lugar) : null;
        const per = x.periodo;
        // v2.9 (R5, DECIDIDO por criterio, autorizado por Victor 2026-10-23): «Ya terminé» y «Saltar» se pueden deshacer con «Reabrir»
        // hasta tu próximo ingreso (son de este periodo).
        const reabrir = `<button type="button" class="link link--start" data-a="variableCierre" data-id="${v.id}" data-v="reabrir" data-fk="var-reabrir">${icon('rotate-ccw', 'ico-s')}Reabrir</button>`;
        const estado = x.saltado ? `<p class="estado">Saltaste ${P.estePlan()}: no cuenta en tu plan.</p>${reabrir}` : x.listo ? `<p class="estado estado--ok">Ya terminaste ${P.estePlan()} ✓</p><p class="fila-s">Te sobraron ${dinero(x.sobro)}: volvieron a tu libre.</p>${reabrir}` : x.pasado ? `<p class="txt"><strong>Te pasaste ${dinero(x.pasado)}.</strong> Pasa; la próxima quincena empieza de nuevo.</p>` : `<p class="txt">Te quedan <strong>${dinero(x.falta)}</strong>. Ya están contados en tu plan: gastarlos no baja tu libre.</p>`;
        const cierre = !x.listo && !x.saltado && x.falta > 0 ? `<div class="pregunta" role="group" aria-labelledby="var-q"><p class="campo-l" id="var-q">Ibas a gastar ${dinero(x.tope)} y anotaste ${dinero(x.anotado)}. ¿Ya terminaste?</p><div class="chips"><button type="button" class="chip" data-a="variableCierre" data-id="${v.id}" data-v="listo" data-fk="var-listo">Sí, ya no gasto más en esto</button><button type="button" class="chip" data-a="variableCierre" data-id="${v.id}" data-v="falta" data-fk="var-falta">Todavía voy a gastar</button><button type="button" class="chip" data-a="variableCierre" data-id="${v.id}" data-v="anotar" data-fk="var-anotar">Me falta anotar algo</button></div></div>` : '';
        return `<div class="pg">
            ${encabezado(`${emo(v.emoji, 28)} ${esc(v.nombre)}`, `Presupuesto · ${esc(P.cadaPlan())} · sale de: ${esc(l ? l.nombre : m ? m.nombre : '—')}`, { atras: P.atrasDe('Mi plan') })}
            <section class="card ficha-cifra" aria-label="Lo máximo">
                <p class="fila-s">Lo máximo ${esc(P.cadaPlan())}</p>
                <p class="cifra">${dinero(x.tope)}</p>
                <p class="fila-s">Del ${esc(M.fechaLarga(per.inicio))} al ${esc(M.fechaLarga(per.fin))} llevas ${dinero(x.anotado)}.</p>
                ${barra(Math.min(x.anotado, x.tope), x.tope, 'Lo que llevas de ' + v.nombre)}
                ${estado}
            </section>
            ${cierre}
            ${tarjetaSeccion(P.estePlan().charAt(0).toUpperCase() + P.estePlan().slice(1), x.gastos.length ? `<ul class="lista">${x.gastos.slice().reverse().map((r) => filaRegistro(r)).join('')}</ul>` : '<p class="vacio">Todavía no anotas nada de esto en esta quincena.</p>', { id: 'var-gastos' })}
            <div class="pie-acciones"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="editarVariable" data-id="${v.id}" data-fk="editar-variable">${icon('pencil', 'ico-s')}Editar</button>${!x.listo && !x.saltado ? `<button type="button" class="btn btn--full" data-a="variableCierre" data-id="${v.id}" data-v="saltar" data-fk="var-saltar">${icon('skip-forward', 'ico-s')}Saltar ${esc(P.estePlan())}</button>` : ''}<button type="button" class="btn btn--full btn--peligro-txt" data-a="variableQuitar" data-id="${v.id}" data-fk="variable-quitar">${icon('ban', 'ico-s')}Ya no lo uso</button></div>
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
            ${ult.antes === 'pagado' ? `<p class="txt">${icon('check', 'ico-s')} Lo pagaste antes de agregar la tarjeta: no se cuenta en tu libre.</p>` : `<div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="decidirPago" data-id="${t.id}" data-fk="t-decidir">Cambiar cuánto voy a pagar</button></div>`}`;
        const historial = st.registros.filter((r) => (r.tipo === 'gasto' && M.medio(st, r.medio)?.tarjeta === t.id) || (r.tipo === 'pagoTarjeta' && r.tarjeta === t.id) || (r.tipo === 'cargoTarjeta' && r.tarjeta === t.id)).sort((a, b) => (a.fecha === b.fecha ? b.seq - a.seq : a.fecha < b.fecha ? 1 : -1)).slice(0, 8);
        // v2.6.7 (agregado v2.6.7 #3): lo que dijiste que debes hoy, igual que en Deudas y en Mi dinero.
        const debeAprox = P.debeTarjeta(info);
        // v2.6.7 (V2-87): con qué ingreso pagas lo que pagas normalmente (o el estado de cuenta que lo reemplazó).
        let pagasCon = '';
        if (info.comoPago > 0) {
            const hz = M.horizonte(st);
            const filas = info.partes.map((x) => `<li><span>${M.esFundado(st, x.de) ? (info.reservadoComo ? 'Ya contado de lo que tienes ahora' : 'Con lo que tienes ahora') : `Con ${esc(etiquetaFuente(x.de))}`}</span><span>${dinero(x.monto, { aprox: !!ult.inicial })}</span></li>`).join('');
            const compras = info.deCompras > 0 ? `<li><span>Con lo que tienes ahora (tus compras de este ciclo)</span><span>${dinero(info.deCompras)}</span></li>` : '';
            const opciones = M.fuentesPara(st, info.vence, hz).length > 1;
            // v2.8 (C-7): si dos quincenas llegan antes de que venza, se sugiere repartirlo (sin hacerlo sola).
            const quincenas = M.fuentesPara(st, info.vence, hz).filter((f) => f !== 'ahora' && !M.esFundado(st, f) && !M.esUnico(f));
            const mitad = Math.floor(info.comoPago / 2);
            const sugerencia = quincenas.length >= 2 && info.partes.length === 1 ? `<div class="nota nota--consejo" role="note">${icon('lightbulb')}<p>Puedes repartir este pago entre dos ${M.periodoPlan(st).cada === 'quincena' ? 'quincenas' : 'ingresos'}: ${dinero(mitad)} y ${dinero(info.comoPago - mitad)}. Tú decides.</p></div>` : '';
            pagasCon = tarjetaSeccion('Lo pagas con', `${P.qTexto('pagasCon')}<div class="dato"><p class="fila-s">${esc(M.capital(M.fechaLarga(info.vence)))} · ${ult.inicial ? 'lo que pagas normalmente' : 'tu estado de cuenta'}</p><ul class="mini-desglose">${filas}${compras}</ul></div>${sugerencia}${opciones ? `<div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="pagarCon" data-de-tarjeta="si" data-id="${t.id}" data-fecha="${info.vence}" data-fk="t-pagar-con">Cambiar o repartir</button></div>` : '<p class="fila-s">Vence antes de tu próximo ingreso: sale de lo que ya tienes.</p>'}`, { id: 't-con', accion: P.qBtn('pagasCon') });
        }
        // v2.8 (C-10, C-7): sus cobros recurrentes («Netflix $10, se cobra el 5»): van dentro del pago de la tarjeta.
        const cobros = st.pagos.filter((p) => p.activo !== false && M.tarjetaDePago(st, p)?.id === t.id);
        const cobrosHtml = tarjetaSeccion(`Se cobra en esta tarjeta <span class="contador">${cobros.length}</span>`, `${cobros.length ? `<ul class="lista">${cobros.map((p) => `<li class="fila"><button type="button" class="fila-main" data-a="abrir" data-tipo="pago" data-id="${p.id}" data-fk="t-cobro-${p.id}">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)} ${dinero(p.monto, { aprox: p.estimado })}, se cobra ${esc(p.frecuencia === 'mensual' ? 'el ' + p.dia : textoFrecuencia(p).toLowerCase())}</span><span class="fila-s">Va dentro del pago de la tarjeta: no resta aparte.</span></span></button></li>`).join('')}</ul>` : '<p class="vacio">Nada se cobra solo en esta tarjeta. Una suscripción con esta tarjeta aparece aquí.</p>'}`, { id: 't-cobros' });
        return `<div class="pg">
            ${encabezado(`${emo(t.emoji, 28)} ${esc(P.nombreTarjeta(t))}`, `${t.apodo ? esc(t.nombre) + ' · ' : ''}${t.corte ? `Corte el ${t.corte} · pago el ${t.pagoDia}` : `Pago el ${t.pagoDia} · día de corte por anotar`}`, { atras: atrasTexto })}
            <section class="card ficha-cifra" aria-label="Lo que debes">
                <p class="fila-s">Debes en total</p>
                <p class="cifra">${debeAprox !== null ? dinero(debeAprox, { aprox: true }) : info.usual ? 'Por confirmar' : dinero(info.debeTotal)}</p>
                ${debeAprox !== null ? `<p class="fila-s">${esc(M.capital(P.POR_CONFIRMAR))}.</p>` : info.usual ? '<p class="fila-s">Lo sabremos con tu primer estado de cuenta.</p>' : ''}
                <ul class="mini-desglose">
                    ${info.porPagarEstado ? `<li><span>Por pagar el ${esc(M.fechaCorta(ult.vence))}</span><span>${dinero(info.porPagarEstado)}</span></li>` : ''}
                    ${info.estimado ? `<li><span>Lo que pagas normalmente · ${info.vence < st.hoy ? 'venció' : 'vence'} el ${esc(M.fechaCorta(info.vence))}</span><span>${dinero(info.estimado, { aprox: true })}</span></li>` : ''}
                    ${info.comprasNetas ? `<li><span>Compras desde el corte · se pagan el ${esc(M.fechaCorta(info.venceCompras))}</span><span>${dinero(info.comprasNetas)}</span></li>` : ''}
                    ${info.resto ? `<li><span>Sigue como deuda</span><span>${dinero(info.resto)}</span></li>` : ''}
                </ul>
                ${info.cupoLibre !== null ? `<p class="cupo"><strong>Disponible ${dinero(info.cupoLibre)}</strong> <span class="fila-s">de tu límite de crédito de ${dinero(t.cupo)}. El disponible nunca suma a tu libre: es dinero prestado.</span></p>` : ''}
                <p class="fila-s">Las compras con tarjeta bajan tu libre el día que las haces; lo que se cobra solo va dentro de su pago.</p>
                ${info.reservado ? `<div class="nota nota--ok" role="note">${icon('check')}<p><strong>${dinero(info.reservado)} de tu ahorro ${esc(info.reservas.map((r) => r.de).join(', '))} ya están para tu pago del ${esc(P.diaPago(info, info.venceCompras))}.</strong> No cuentan en tu libre.</p></div>` : ''}
                ${info.porPagarEstado || info.estimado || info.reservado ? `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="pagado" data-tipo="tarjeta" data-id="${t.id}" data-fecha="${info.vence}" data-fk="t-pagar">${icon('arrow-left-right', 'ico-s')}Pagar tarjeta</button>` : ''}
                ${pendiente}
            </section>
            ${pagasCon}
            ${cobrosHtml}
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
        const dif = cuadre ? M.sinDetalle(st, cuadre) : 0;
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
            ${cuadre ? `<div class="cuadre-marca">${caja('⚖️')}<p><strong>Cuadre del ${esc(M.fechaCorta(cuadre.fecha))}: dijiste ${dinero(cuadre.monto)}.</strong> ${dif === 0 ? (cuadre.monto === cuadre.esperado ? 'Cuadró exacto con lo anotado.' : 'Lo que anotaste después explica la diferencia.') : `Según lo anotado tenías ${dinero(cuadre.esperado)}: ${dinero(Math.abs(dif))} quedaron sin detalle.`}</p></div>` : ''}
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
        // v2.8 (C-1): «¿Dónde está?» y su ahorro programado («Ya lo guardé»).
        const aparte = M.ahorroAparte(a);
        const dondeTxt = aparte ? 'Aparte: solo lo registramos.' : `Dentro de ${esc(M.lugar(st, M.lugarAhorro(st, a))?.nombre || 'tu cuenta')}: no cuenta en tu libre.`;
        const prog = M.programadoInfo(st).find((y) => y.a.id === a.id);
        const progHtml = tarjetaSeccion(P.cadaVezT(), a.programado ? `<div class="dato"><p class="dato-n">${dinero(a.programado.monto)} ${esc(P.cadaPlan())}</p><p class="fila-s">${prog && prog.guardado ? `Ya lo guardaste ${P.estePlan()} ✓` : prog && prog.falta ? 'Está en tu plan hasta que lo guardes.' : 'Ya llegaste a tu meta.'}</p></div>${prog && prog.falta ? `<div class="card-pie"><button type="button" class="btn btn--prim btn--full" data-a="programadoGuardado" data-id="${a.id}" data-fk="ap-ya-guarde">${icon('check', 'ico-s')}Ya lo guardé</button></div>` : ''}<div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="programar" data-id="${a.id}" data-fk="ap-programar">Cambiar cuánto guardo</button></div>` : `<p class="txt txt--card">¿Guardas algo ${P.cadaVez()}? Así queda en tu plan.</p><div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="programar" data-id="${a.id}" data-fk="ap-programar">Guardar ${P.cadaVez()}</button></div>`, { id: 'ap-prog' });
        const avisoVencido = vencido ? `<div class="nota nota--atencion" role="note">${icon('clock')}<div><p><strong>Era para el ${esc(M.fechaLarga(a.metaFecha))}. ¿Ya lo usaste?</strong> Si ya lo gastaste, lo cerramos sin anotar otro gasto.</p><button type="button" class="btn btn--sm" data-a="hoja" data-hoja="yaLoUse" data-id="${a.id}" data-fk="ap-yalouse">Sí, ya lo gasté</button></div></div>` : '';
        return `<div class="pg">
            ${encabezado(`${emo(a.emoji, 28)} ${esc(a.nombre)}`, 'Ahorro', { atras: atrasTexto })}
            ${avisoVencido}
            <section class="card ficha-ap" aria-label="Lo ahorrado">
                <div class="app-cover ficha-ap-portada"><svg class="app-cover-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.covers[a.portada] || ART.covers['general-amanecer']}</svg><p class="ficha-ap-l">Ahorro</p><p class="ficha-ap-n">${dinero(a.monto)}</p></div>
                <div class="ficha-ap-cuerpo">
                    <p class="txt">${metaTxt}</p>
                    ${a.meta ? barra(a.monto, a.meta, 'Avance de ' + a.nombre) : ''}
                    <div class="acciones-2"><button type="button" class="btn btn--48" data-a="hoja" data-hoja="apartar" data-id="${a.id}" data-fk="ap-mas">${icon('plus', 'ico-s')}Guardé más</button><button type="button" class="btn btn--prim btn--48" data-a="hoja" data-hoja="liberar" data-id="${a.id}" data-fk="ap-liberar" ${a.monto ? '' : 'disabled'}>Usé de mi ahorro</button></div>
                    <div class="acciones-2"><button type="button" class="btn" data-a="hoja" data-hoja="usar" data-id="${a.id}" data-fk="ap-usar" ${a.monto && !aparte ? '' : 'disabled'}>Pagué algo con él</button><button type="button" class="btn" data-a="hoja" data-hoja="moverApartado" data-id="${a.id}" data-fk="ap-mover" ${a.monto && st.apartados.filter((x) => M.ahorroAparte(x) === aparte).length > 1 ? '' : 'disabled'}>Mover a otro</button></div>
                </div>
            </section>
            <div class="nota nota--info" role="note">${icon('info')}<div><p><strong>¿Dónde está?</strong> ${dondeTxt}</p><button type="button" class="link" data-a="hoja" data-hoja="dondeAhorro" data-id="${a.id}" data-fk="ap-donde">Cambiar</button></div></div>
            ${progHtml}
            ${tarjetaSeccion('Meta', `<div class="dato"><p class="dato-n">${a.meta ? dinero(a.meta) : 'Sin meta'}</p><p class="fila-s">${a.metaFecha ? 'Para el ' + esc(M.fechaLarga(a.metaFecha)) : 'Sin fecha'}</p></div><div class="card-pie"><button type="button" class="link" data-a="hoja" data-hoja="meta" data-id="${a.id}" data-fk="ap-meta">${a.meta ? 'Editar nombre y meta' : 'Editar nombre o ponerle meta'}</button></div>`, { id: 'ap-meta-t' })}
            ${tarjetaSeccion('Historial', a.historial.length ? `<ul class="lista">${a.historial.map((h) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(h.tipo === 'usar' ? '🎉' : h.tipo === 'liberar' ? '🔓' : h.tipo === 'donde' ? '📍' : '🐷')}<span class="fila-txt"><span class="fila-t">${h.tipo === 'apartar' ? 'Guardaste' : h.tipo === 'liberar' ? 'Usaste (volvió a tu libre)' : h.tipo === 'usar' ? 'Pagaste algo con él' : h.tipo === 'inicial' ? 'Ya tenías' : h.tipo === 'donde' ? (h.donde === 'aparte' ? 'Lo pasaste a aparte' : 'Lo pasaste dentro de ' + esc(M.lugar(st, h.donde && h.donde.lugar)?.nombre || 'tu cuenta')) : h.tipo === 'devuelto' ? 'Volvió de un gasto que eliminaste' : h.tipo === 'corregido' ? (h.monto >= 0 ? 'Corregiste un gasto: usaste más' : 'Corregiste un gasto: volvió al ahorro') : h.tipo === 'entra' ? 'Llegó de ' + esc(h.de) : 'Pasaste a ' + esc(h.a)}</span><span class="fila-s">${esc(M.capital(M.fechaLarga(h.fecha)))}</span></span><span class="fila-m">${montoHtml(Math.abs(h.monto), 'neutro')}</span></div></li>`).join('')}</ul>` : '<p class="vacio">Todavía nada.</p>', { id: 'ap-hist' })}
        </div>`;
    };

    S.ingreso = function ({ id }) {
        const st = P.st;
        const ing = M.ingreso(st, id);
        if (!ing) return S.pagos();
        const atrasTexto = P.atrasDe('Mi plan');
        // V2-81: el que toca marcar (el primero que todavía no llegó).
        const prox = M.porRecibir(st, ing);
        // Recién recibido (su día todavía no pasa, o se marcó hoy): «Recibido ✓» con «Deshacer», sin otro «Ya llegó».
        const ultimaLlegada = M.ocurrenciasIngreso(st, ing, ing.desde || st.hoy, M.sumarDias(st.hoy, 400)).filter((o) => o.estado === 'llego' && (!prox || o.fecha < prox.fecha)).at(-1);
        const regLlegada = ultimaLlegada ? st.registros.find((r) => r.tipo === 'ingreso' && r.ingreso === ing.id && r.ocurrencia === ultimaLlegada.fecha) : null;
        const recibido = ultimaLlegada && regLlegada && (ultimaLlegada.fecha >= st.hoy || regLlegada.fecha === st.hoy) ? ultimaLlegada : null;
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
                ${recibido ? `<p class="estado estado--ok">Recibido ✓ · ${esc(M.capital(M.fechaLarga(recibido.fecha)))}</p><div class="acciones-2"><button type="button" class="btn btn--48" data-a="llegadaDeshacer" data-id="${ing.id}" data-fecha="${recibido.fecha}" data-fk="ing-deshacer">Deshacer</button></div>${prox ? `<p class="fila-s">Después: ${esc(M.capital(M.fechaLarga(prox.fecha)))}</p>` : ''}` : prox ? `<p class="fila-s">Próximo: ${esc(M.capital(M.fechaLarga(prox.fecha)))}${prox.descuento ? ` · ${esc(dinero(prox.monto, { aprox: true }))}, te descuentan ${esc(dinero(prox.descuento))} del adelanto` : ''}</p><button type="button" class="btn btn--prim btn--48 btn--full" data-a="llego" data-id="${ing.id}" data-fecha="${prox.fecha}" data-fk="ing-llego">Ya llegó</button>` : ''}
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
            <p class="txt">Por ahora, el salario de tu pareja entra como ingreso esperado en Mi plan.</p>
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
            ${tarjetaSeccion('Cuándo', `<p class="txt txt--card">Por ahora te avisamos al abrir la app: lo que vence hoy y mañana, y lo que ya venció. Cada pago tiene sus avisos en su ficha.</p>`, { id: 'av-donde' })}
            ${tarjetaSeccion('Recientes', st.avisos.length ? `<ul class="lista">${st.avisos.map((a) => `<li class="fila"><button type="button" class="fila-main" data-a="abrirAviso" data-id="${a.id}" data-fk="av-${a.id}">${caja(a.emoji || '🔔')}<span class="fila-txt"><span class="fila-t">${esc(a.titulo)}</span><span class="fila-s">${esc(a.texto)}</span><span class="fila-s">${esc(M.capital(M.fechaCorta(a.fecha)))}</span></span></button></li>`).join('')}</ul>` : '<p class="vacio">Sin avisos todavía.</p>', { id: 'av-rec' })}
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
        /** v2.8 (ajuste 5, punto 2): «Ver por tipo ›» / «Ver por fecha ›»; se recuerda en este teléfono. */
        /** v2.8 ajuste 6 (punto 3): «Ver todas» / «Otros (n)» en «¿En qué se te fue?». */
        mesTodas: () => {
            P.ui.mesTodas = !P.ui.mesTodas;
            render({ foco: '[data-fk="mes-ver-todas"]' });
        },
        /** Ajuste 7: «Tus suscripciones» → Mi plan → Ver por tipo → Gastos fijos. */
        irSuscripciones: () => {
            P.ui.pagosModo = 'tipo';
            P.ui.planAbiertas = { ...(P.ui.planAbiertas || {}), fijos: true };
            P.irTab('pagos');
            render({ foco: '[data-fk="sec-fijos"]' });
        },
        /** «Lo que encontramos»: una a la vez, con ‹ ›. */
        mesEnc: (d) => {
            P.ui.mesEnc = Math.max(0, (P.ui.mesEnc || 0) + Number(d.d));
            render({ foco: `[data-fk="mes-enc-${Number(d.d) < 0 ? 'ant' : 'sig'}"]` });
        },
        mesFiltros: () => {
            P.ui.mesFiltros = !P.ui.mesFiltros;
            render({ foco: '[data-fk="mes-filtros"]' });
        },
        mesCuenta: (d) => {
            P.ui.mesCuenta = P.ui.mesCuenta === d.v ? null : d.v;
            render({ foco: `[data-fk="mfl-${d.v}"]` });
        },
        mesFiltroQuitar: () => {
            P.ui.mesFiltro = 'todo';
            render({ foco: '[data-fk="mes-filtros"]' });
        },
        mesCategoriaQuitar: () => {
            P.ui.mesCategoria = null;
            render({ foco: '[data-fk="mes-filtros"]' });
        },
        mesCuentaQuitar: () => {
            P.ui.mesCuenta = null;
            render({ foco: '[data-fk="mes-filtros"]' });
        },
        pagosModo: (d) => {
            const v = d.v === 'tipo' || d.v === 'lista' ? 'tipo' : 'fecha';
            P.ui.pagosModo = v;
            if (P.modos && P.modos.guardarVistaPlan) P.modos.guardarVistaPlan(v);
            render({ foco: `[data-fk="ver-${v === 'tipo' ? 'fecha' : 'tipo'}"]` });
            P.emitir('pagos:modo:' + v);
        },
        /** v2.8 (ajuste 5, punto 9): abre o pliega una sección de «Ver por tipo». */
        planSeccion: (d) => {
            P.ui.planAbiertas = { ...(P.ui.planAbiertas || {}), [d.v]: !(P.ui.planAbiertas || {})[d.v] };
            render({ foco: `[data-fk="sec-${d.v}"]` });
        },
        pagosVista: (d) => {
            P.ui.pagosVista = d.v;
            P.ui.planPaso = 0;
            render();
            P.emitir('pagos:' + d.v);
        },
        irMisPagos: () => {
            P.ui.pagosModo = 'tipo';
            P.irTab('pagos');
        },
        /** V2-35: la proyección de Hoy lleva a Pagos → Próxima. */
        irProxima: () => {
            P.ui.pagosVista = 'proxima';
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
        /** v2.9 (R10): las flechas de «Próximo mes» (quien cobra por mes o no tiene ingreso fijo). */
        planPaso: (d) => {
            P.ui.planPaso = Math.max(0, (P.ui.planPaso || 0) + Number(d.d));
            render();
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
            P.ui.mesEnc = 0;
            P.ui.mesTodas = false;
            render();
        },
        mesFiltro: (d) => {
            P.ui.mesFiltro = d.v;
            render({ foco: `[data-fk="mf-${d.v}"]` });
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
