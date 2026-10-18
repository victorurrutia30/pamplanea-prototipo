// Producto v2 · prototipo de teléfono. Hojas inferiores, mutaciones y recorridos guiados
// (Reparte, Pongámonos al día, primer día, logro). Carga después de app.js.
'use strict';
(() => {
    const D = window.DATOS;
    const M = window.MOTOR;
    const ART = window.ARTE;
    const P = window.P;
    const { esc, icon, emo, caja, montoHtml, sr, plural } = P;
    const { dinero } = M;
    const H = (P.hojas = {});
    const S = P.pantallas;

    // ------------------------------------------------------------------ mutaciones del estado
    P.marcarPagado = function (st, pagoId, ocurrencia, { monto, medio, fecha }) {
        const p = M.pago(st, pagoId);
        const r = P.registrar(st, { tipo: 'gasto', fecha, monto, nombre: p.nombre, categoria: p.categoria, emoji: p.emoji, medio, pago: p.id, nuevo: true });
        p.hechos[ocurrencia] = { estado: 'pagado', monto, registro: r.id };
        if (p.deuda) p.deuda.debe = Math.max(0, p.deuda.debe - monto);
        return r;
    };
    /**
     * Pagar la tarjeta = mover del banco a la tarjeta. La parte que pasa del estado de cuenta paga
     * compras nuevas y gasta primero lo reservado de un apartado (V2-27); `soltarReserva` la quita
     * entera («Pagar la tarjeta ya»).
     */
    P.pagarTarjeta = function (st, tarjetaId, { monto, lugar, fecha, soltarReserva = null, aCompras = false }) {
        const t = M.tarjeta(st, tarjetaId);
        const antes = M.tarjetaInfo(st, t);
        const r = P.registrar(st, { tipo: 'pagoTarjeta', fecha, monto, lugar, tarjeta: tarjetaId, nombre: 'Pago de ' + t.nombre, nuevo: true, ...(aCompras ? { aCompras: true } : {}) });
        st.reservasTarjeta = st.reservasTarjeta || [];
        if (soltarReserva) st.reservasTarjeta = st.reservasTarjeta.filter((x) => x.id !== soltarReserva);
        else {
            let resta = Math.max(0, monto - antes.porPagarEstado);
            for (const x of st.reservasTarjeta.filter((y) => y.tarjeta === tarjetaId)) {
                const usa = Math.min(resta, x.monto);
                x.monto -= usa;
                resta -= usa;
            }
            st.reservasTarjeta = st.reservasTarjeta.filter((x) => x.monto > 0);
        }
        return r;
    };
    /**
     * Usar un apartado para un gasto ya anotado (Usar, Anotar, corregir en Mes o «Ya lo usé»).
     * Un apartado con fecha de meta es para una sola cosa: se cierra (logro si se cumplió) y lo que
     * sobra vuelve a tu libre. Sin fecha (Emergencias), solo baja lo usado. Si se pagó con
     * crédito, ese dinero queda reservado para el pago de la tarjeta (V2-27).
     */
    P.usarApartado = function (st, apartadoId, registro, { cerrar = null, vaciar = false, logro = null } = {}) {
        const a = M.apartado(st, apartadoId);
        if (!a) return null;
        const usado = Math.min(registro.monto, a.monto);
        const sobraAntes = a.monto - usado;
        const cumplida = !!(a.meta && a.monto >= a.meta);
        const cierra = cerrar !== null ? cerrar : !!a.metaFecha || cumplida;
        registro.apartado = a.id;
        registro.apartadoNombre = a.nombre;
        const m = M.medio(st, registro.medio);
        let reserva = null;
        if (m && m.tarjeta && usado > 0) {
            reserva = { id: 'rs' + st.seq++, tarjeta: m.tarjeta, monto: usado, de: a.nombre, apartado: a.id, fecha: st.hoy };
            st.reservasTarjeta = [...(st.reservasTarjeta || []), reserva];
        }
        a.historial.unshift({ fecha: st.hoy, tipo: 'usar', monto: usado, medio: registro.medio });
        if (cierra) {
            if (logro !== null ? logro : cumplida) st.logros.unshift({ nombre: a.nombre, fecha: st.hoy, monto: a.monto, medio: registro.medio, reserva: reserva ? reserva.id : null, emoji: a.emoji });
            st.apartados = st.apartados.filter((y) => y.id !== a.id);
        } else a.monto = vaciar ? 0 : a.monto - usado;
        return { usado, cumplida, cierra, reserva, sobra: cierra || vaciar ? sobraAntes : 0 };
    };
    P.cuadrar = function (st, lugarId, monto) {
        const esperado = M.saldoLugar(st, lugarId);
        const r = P.registrar(st, { tipo: 'cuadre', fecha: st.hoy, lugar: lugarId, monto, esperado, nuevo: true });
        M.lugar(st, lugarId).cuadre = { fecha: st.hoy, seq: r.seq, monto };
        return r;
    };
    /** Cerrar sin usar (V2-31 #3): el dinero vuelve a tu libre y queda en «Cerrados», no en Logros. */
    P.cerrarApartado = function (st, apartadoId) {
        const a = M.apartado(st, apartadoId);
        st.cerrados = [{ nombre: a.nombre, fecha: st.hoy, monto: a.monto, emoji: a.emoji }, ...(st.cerrados || [])];
        st.apartados = st.apartados.filter((y) => y.id !== a.id);
        return a.monto;
    };
    P.apartarEn = function (st, apartadoId, monto, tipo = 'apartar') {
        const a = M.apartado(st, apartadoId);
        const real = tipo === 'apartar' ? monto : Math.min(monto, a.monto);
        a.monto += tipo === 'apartar' ? real : -real;
        a.historial.unshift({ fecha: st.hoy, tipo, monto: real });
        return real;
    };
    P.llegoIngreso = function (st, ingresoId, fechaEsperada, { monto, lugar, fecha }) {
        const ing = M.ingreso(st, ingresoId);
        ing.llegadas[fechaEsperada] = { monto };
        // V2-38: lo que te descuentan del salario queda pagado solo (no baja tu libre otra vez; sí baja lo que debes).
        for (const p of M.descuentosDe(st, ing.id)) {
            if (p.hechos[fechaEsperada]) continue;
            p.hechos[fechaEsperada] = { estado: 'pagado', monto: p.monto, descuento: true };
            if (p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined) p.deuda.debe = Math.max(0, p.deuda.debe - p.monto);
        }
        return P.registrar(st, { tipo: 'ingreso', fecha, monto, nombre: ing.nombre, categoria: ing.categoria, emoji: ing.emoji, lugar, ingreso: ing.id, ocurrencia: fechaEsperada, nuevo: true });
    };
    /** «No me va a caer»: el periodo sigue (con $0 de ese ingreso) y se dice en su ficha. */
    P.noLlego = function (st, ingresoId, fechaEsperada) {
        M.ingreso(st, ingresoId).llegadas[fechaEsperada] = { monto: 0, noLlego: true };
    };
    /** La regla de fechas de un pago o un ingreso, según la frecuencia elegida en el formulario (V2-36). */
    P.reglaDe = function (d) {
        const r = { frecuencia: d.frecuencia };
        if (d.frecuencia === 'unico' || d.frecuencia === 'catorcenal') r.fecha = d.fecha;
        if (d.frecuencia === 'semanal') r.diaSemana = d.diaSemana ?? 5;
        if (d.frecuencia === 'quincenal') r.dias = [...(d.dias || [15, 30])].map(Number).sort((a, b) => a - b);
        if (d.frecuencia === 'mensual') r.dia = Number(d.dia);
        if (d.frecuencia === 'meses') Object.assign(r, { fecha: d.fecha, cadaMeses: Number(d.cadaMeses) || 12 });
        if (d.frecuencia === 'fechas') r.fechas = [...new Set(d.fechas || [])].sort();
        if (d.frecuencia === 'ingreso') r.conIngreso = d.conIngreso;
        return r;
    };
    /** Desde cuándo cuenta: hoy, o la primera fecha elegida si ya venció (un pago atrasado sí se pide). */
    const desdeDe = (st, d) => {
        const primera = d.primera || (d.frecuencia === 'unico' || d.frecuencia === 'catorcenal' || d.frecuencia === 'meses' ? d.fecha : d.frecuencia === 'fechas' ? [...(d.fechas || [])].sort()[0] : null);
        return primera && primera < st.hoy ? primera : st.hoy;
    };
    P.crearPago = function (st, d) {
        const id = 'p' + st.seq++;
        const p = { id, nombre: d.nombre, emoji: d.emoji || '🧾', categoria: d.categoria || 'otros', monto: d.monto, estimado: !!d.estimado, ...P.reglaDe(d), medio: d.medio, avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: desdeDe(st, d), hechos: {}, previos: [], nuevo: true };
        if (p.frecuencia === 'unico' && !p.fecha) p.fecha = M.proximoDia(st.hoy, d.dia || 1);
        if (d.hasta) p.hasta = d.hasta;
        if (d.tipoPago) p.tipoPago = d.tipoPago;
        st.pagos.push(p);
        return p;
    };
    /**
     * V2-34: «¿Reservas algo de antes?». Mueve `monto` de lo que se paga con el día de pago `periodo` a
     * `fuente` (lo que tienes ahora u otro día de pago anterior), empezando por el pago más grande.
     */
    P.reservarDeficit = function (st, periodo, fuente, monto) {
        const k = M.calcular(st);
        const partes = (k.futuro[periodo] || []).slice().sort((a, b) => b.parte - a.parte);
        let resta = monto;
        for (const x of partes) {
            if (resta <= 0) break;
            const p = M.pago(st, x.pago.id);
            const actual = M.asignacion(st, p, x.fecha, x.monto, k.hz);
            const mueve = Math.min(resta, x.parte);
            const nuevo = actual.map((y) => ({ ...y }));
            const de = nuevo.find((y) => y.de === periodo);
            de.monto -= mueve;
            const a = nuevo.find((y) => y.de === fuente);
            if (a) a.monto += mueve;
            else nuevo.unshift({ de: fuente, monto: mueve });
            p.asignaciones = { ...(p.asignaciones || {}), [x.fecha]: nuevo.filter((y) => y.monto > 0) };
            resta -= mueve;
        }
        return monto - resta;
    };
    /** V2-35: «¿Pasas algo de lo que te sobra a la próxima?». El dinero no se mueve: queda reservado hasta ese día de pago. */
    P.pasarProxima = function (st, para, monto) {
        st.reservas = [...(st.reservas || []), { id: 'rv' + st.seq++, de: 'ahora', para, monto, fecha: st.hoy }];
    };
    /** V2-48: desmarcar un pago ya pagado: sale su gasto y vuelve a estar pendiente. */
    P.desmarcarPagado = function (st, registroId) {
        const r = st.registros.find((x) => x.id === registroId);
        if (!r || !r.pago) return null;
        const p = M.pago(st, r.pago);
        if (p) {
            for (const [f, h] of Object.entries(p.hechos)) if (h.registro === r.id) delete p.hechos[f];
            if (p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined) p.deuda.debe += r.monto;
        }
        st.registros = st.registros.filter((x) => x.id !== r.id);
        return r;
    };

    // ------------------------------------------------------------------ hojas: abrir, cerrar, dibujar
    P.abrirHoja = function (tipo, datos = {}) {
        const def = H[tipo];
        if (!def) return;
        const activo = document.activeElement;
        const disparador = activo && activo.dataset ? activo.dataset.fk || null : null;
        P.ui.hoja = { tipo, ...datos, disparador, intento: false, errores: [] };
        P.ui.banner = null;
        P.ui.toast = null;
        if (def.iniciar) def.iniciar(P.ui.hoja);
        P.render();
        const foco = document.querySelector(def.foco ? def.foco(P.ui.hoja) : '#hoja-t') || document.querySelector('#hoja-t');
        if (foco) foco.focus({ preventScroll: true });
        P.emitir('hoja:' + tipo);
    };
    P.cerrarHoja = function ({ sinFoco = false } = {}) {
        const h = P.ui.hoja;
        if (!h) return;
        const fk = h.disparador;
        if (H[h.tipo] && H[h.tipo].alCerrar) H[h.tipo].alCerrar(h);
        P.ui.hoja = null;
        P.render();
        if (!sinFoco) {
            const el = (fk && document.querySelector(`[data-fk="${CSS.escape(fk)}"]`)) || document.querySelector('#pantalla h1');
            if (el) el.focus({ preventScroll: true });
        }
    };
    P.renderHoja = function () {
        const capa = document.getElementById('capa-hoja');
        const app = document.getElementById('app');
        const vista = document.getElementById('vista');
        const nav = document.getElementById('nav');
        const h = P.ui.hoja;
        if (!h) {
            capa.innerHTML = '';
            capa.dataset.clave = '';
            vista.inert = false;
            nav.inert = false;
            app.classList.remove('con-hoja');
            return;
        }
        const c = H[h.tipo].html(h);
        const clave = h.tipo + ':' + (h.paso || '');
        const nueva = capa.dataset.clave !== clave;
        const scroll = capa.querySelector('.hoja-c') ? capa.querySelector('.hoja-c').scrollTop : 0;
        const vieja = capa.dataset.clave && capa.dataset.clave.split(':')[0] === h.tipo;
        capa.innerHTML = `<div class="mask${nueva && !vieja ? ' mask--entra' : ''}"><section class="hoja${nueva && !vieja ? ' hoja--entra' : ''}" role="dialog" aria-modal="true" aria-labelledby="hoja-t">
            <header class="hoja-h"><h2 id="hoja-t" class="hoja-t" tabindex="-1">${c.titulo}</h2>${c.sinCerrar ? '' : `<button type="button" class="hoja-x" data-a="cerrarHoja" aria-label="Cerrar" data-fk="hoja-x">${icon('x')}</button>`}</header>
            <div class="hoja-c">${c.cuerpo}</div>
            ${c.pie ? `<footer class="hoja-f">${c.nota ? `<p class="hoja-nota">${c.nota}</p>` : ''}<div class="hoja-acc">${c.pie}</div></footer>` : ''}
        </section></div>`;
        if (!nueva) capa.querySelector('.hoja-c').scrollTop = scroll;
        capa.dataset.clave = clave;
        vista.inert = true;
        nav.inert = true;
        app.classList.add('con-hoja');
    };
    const region = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    // ------------------------------------------------------------------ piezas de formulario
    const pie2 = (accion, texto, { fk = 'hoja-ok', cancelar = 'Cancelar', peligro = false } = {}) =>
        `<button type="button" class="btn btn--48" data-a="cerrarHoja" data-fk="hoja-cancelar">${cancelar}</button><button type="button" class="btn btn--48 ${peligro ? 'btn--peligro' : 'btn--prim'}" data-a="${accion}" data-fk="${fk}">${texto}</button>`;
    const pie1 = (accion, texto, fk = 'hoja-ok') => `<button type="button" class="btn btn--prim btn--48" data-a="${accion}" data-fk="${fk}">${texto}</button>`;
    /** Confirmación dentro de la hoja: «¿Eliminar…?» [Cancelar] [Sí, eliminar]. */
    function confirmarHtml(titulo, texto, accion, fk, si = 'Sí, eliminar') {
        return `<div class="nota nota--atencion confirmar" role="alertdialog" aria-labelledby="cf-${fk}">${icon('triangle-alert')}<div><p id="cf-${fk}"><strong>${titulo}</strong> ${texto}</p><div class="ay-acc"><button type="button" class="btn" data-a="valor" data-campo="confirmarEliminar" data-v="no" data-fk="${fk}-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="${accion}" data-fk="${fk}-si">${si}</button></div></div></div>`;
    }
    P.confirmarHtml = (...a) => confirmarHtml(...a);
    function error(h, campo, texto) {
        return h.intento && h.errores.includes(campo) ? `<p class="campo-error" id="err-${campo}">${icon('triangle-alert')}<span>${esc(texto)}</span></p>` : '';
    }
    const inv = (h, campo) => (h.intento && h.errores.includes(campo) ? `aria-invalid="true" aria-describedby="err-${campo}"` : '');
    function campoMonto(h, { campo = 'monto', label = '¿Cuánto?', valor = '', ayuda = '', errorTexto = 'Escribe el monto', id = null } = {}) {
        const fid = id || 'f-' + campo;
        return `<div class="campo-g"><label class="campo-l" for="${fid}">${label}</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="${fid}" data-campo="${campo}" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej. 25.00" value="${esc(valor)}" ${inv(h, campo)}></div>${ayuda ? `<p class="campo-ayuda">${ayuda}</p>` : ''}${error(h, campo, errorTexto)}</div>`;
    }
    function campoTexto(h, { campo, label, valor = '', placeholder = '', errorTexto = '' }) {
        return `<div class="campo-g"><label class="campo-l" for="f-${campo}">${label}</label><div class="campo"><input id="f-${campo}" data-campo="${campo}" type="text" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(valor)}" ${inv(h, campo)}></div>${error(h, campo, errorTexto)}</div>`;
    }
    /** Grupo de opciones (botones con aria-pressed): un solo patrón para medios, lugares, días… */
    function opciones(h, { campo, label, lista, valor, errorTexto = '', accion = 'valor', columnas = false }) {
        return `<div class="campo-g" role="group" aria-labelledby="l-${campo}"><p class="campo-l" id="l-${campo}">${label}</p><div class="chips${columnas ? ' chips--col' : ''}">${lista
            .map((o) => `<button type="button" class="chip" aria-pressed="${String(valor) === String(o.v)}" data-a="${accion}" data-campo="${campo}" data-v="${esc(o.v)}" data-fk="op-${campo}-${esc(o.v)}">${String(valor) === String(o.v) ? icon('check', 'ico-xs') : ''}${o.e ? emo(o.e, 18) : ''}<span>${esc(o.t)}</span>${o.s ? `<span class="chip-s">${esc(o.s)}</span>` : ''}</button>`)
            .join('')}</div>${error(h, campo, errorTexto)}</div>`;
    }
    function selectorDia(h, campo, valor, label = '¿Qué día del mes?') {
        return `<div class="campo-g" role="group" aria-labelledby="l-${campo}"><p class="campo-l" id="l-${campo}">${label}</p><div class="dias">${Array.from({ length: 31 }, (_, i) => i + 1)
            .map((n) => `<button type="button" class="dia" aria-pressed="${Number(valor) === n}" data-a="valor" data-campo="${campo}" data-v="${n}" data-fk="dia-${campo}-${n}" aria-label="Día ${n}">${n}</button>`)
            .join('')}</div>${error(h, campo, 'Elige el día')}</div>`;
    }
    /**
     * Calendario accesible (V2-37): la cuadrícula del mes con botones de 44 px, el nombre completo de
     * cada día para el lector de pantalla, «hoy» marcado, meses con flechas y teclado (flechas mueven
     * el foco). Con los tokens de la app: se lee igual en los 4 temas. `min`/`max` en ISO.
     */
    function calendario(h, campo, valor, { label = '¿Qué día?', min = null, max = null, ayuda = '', ver = null, multiple = null, antes = '' } = {}) {
        const st = P.st;
        const vista = ver || h['ver-' + campo] || (valor || (multiple && multiple[0]) || st.hoy).slice(0, 7);
        const [y, m] = vista.split('-').map(Number);
        const primero = `${y}-${M.pad(m)}-01`;
        const hueco = (M.diaSemana(primero) + 6) % 7;
        const celdas = Array.from({ length: hueco }, () => '<span class="cal-v" aria-hidden="true"></span>');
        for (let d = 1; d <= M.diasDelMes(y, m); d++) {
            const f = `${y}-${M.pad(m)}-${M.pad(d)}`;
            const fuera = (min && f < min) || (max && f > max);
            const sel = multiple ? multiple.includes(f) : f === valor;
            celdas.push(`<button type="button" class="cal-d${f === st.hoy ? ' cal-d--hoy' : ''}" aria-pressed="${sel}" ${fuera ? 'disabled' : ''} data-a="calElegir" data-campo="${campo}" data-v="${f}" data-fk="cal-${campo}-${f}" aria-label="${esc(M.capital(M.conDia(f)))}${f === st.hoy ? ', hoy' : ''}">${d}</button>`);
        }
        const [py, pm] = M.mesMas(y, m, -1);
        const [ny, nm] = M.mesMas(y, m, 1);
        const puedeAntes = !min || M.fechaDe(py, pm, 31) >= min;
        const puedeDespues = !max || `${ny}-${M.pad(nm)}-01` <= max;
        const elegido = multiple ? (multiple.length ? `Elegiste ${plural(multiple.length, 'fecha', 'fechas')}: ${multiple.map((f) => M.fechaCorta(f)).join(', ')}` : '') : valor ? `Elegiste: <strong>${esc(M.capital(M.conDia(valor)))}</strong>` : '';
        return `<div class="campo-g cal" role="group" aria-labelledby="l-${campo}"><p class="campo-l" id="l-${campo}">${label}</p>${antes}
            <div class="cal-cab"><button type="button" class="icon-btn" data-a="calMes" data-campo="${campo}" data-ver="${vista}" data-d="-1" aria-label="Mes anterior" data-fk="cal-${campo}-ant" ${puedeAntes ? '' : 'disabled'}>${icon('chevron-left')}</button><p class="cal-mes" aria-live="polite">${esc(M.capital(M.MESES[m - 1]))} ${y}</p><button type="button" class="icon-btn" data-a="calMes" data-campo="${campo}" data-ver="${vista}" data-d="1" aria-label="Mes siguiente" data-fk="cal-${campo}-sig" ${puedeDespues ? '' : 'disabled'}>${icon('chevron-right')}</button></div>
            <div class="cal-sem" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
            <div class="cal-dias">${celdas.join('')}</div>
            ${elegido ? `<p class="fila-s cal-elegido">${elegido}</p>` : ''}${ayuda ? `<p class="campo-ayuda">${ayuda}</p>` : ''}${error(h, campo, 'Elige una fecha')}</div>`;
    }
    P.calendario = calendario;
    P.acciones.calMes = (d) => {
        const dueno = P.ui.hoja || (P.ui.ob && !P.st.configurado ? P.ui.ob : null);
        if (!dueno) return;
        const [y, m] = M.mesMas(...d.ver.split('-').map(Number), Number(d.d));
        dueno['ver-' + d.campo] = `${y}-${M.pad(m)}`;
        P.render({ foco: `[data-fk="cal-${d.campo}-${Number(d.d) < 0 ? 'ant' : 'sig'}"]` });
    };
    P.acciones.calElegir = (d) => {
        if (P.ui.ob && !P.st.configurado && !P.ui.hoja) return P.acciones.obValor(d);
        const h = P.ui.hoja;
        if (!h) return;
        if (h.tipo === 'anotar') return P.acciones.anotarValor({ campo: d.campo, v: d.v });
        P.acciones.valor(d);
        const el = document.querySelector(`[data-fk="cal-${CSS.escape(d.campo)}-${d.v}"]`);
        if (el) el.focus({ preventScroll: true });
    };
    // Flechas dentro del calendario: un día a los lados, una semana arriba o abajo.
    document.addEventListener('keydown', (e) => {
        const el = e.target;
        if (!el.classList || !el.classList.contains('cal-d')) return;
        const paso = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        if (!paso) return;
        const botones = [...el.closest('.cal-dias').querySelectorAll('.cal-d')];
        const i = botones.indexOf(el) + paso;
        if (botones[i]) {
            e.preventDefault();
            botones[i].focus();
        }
    });
    /** Hoy / Ayer / Antier (y la fecha que ya traía) como atajos, más el calendario para cualquier otra. */
    function campoFecha(h, campo, valor, { label = '¿Cuándo?', pasado = true, futuro = false, extra = null, ayuda = '' } = {}) {
        const st = P.st;
        const atajos = [...(pasado ? [{ v: st.hoy, t: 'Hoy' }, { v: M.sumarDias(st.hoy, -1), t: 'Ayer' }, { v: M.sumarDias(st.hoy, -2), t: 'Antier' }] : [{ v: st.hoy, t: 'Hoy' }]), ...(futuro && !pasado ? [{ v: M.sumarDias(st.hoy, 1), t: 'Mañana' }] : [])];
        if (extra && !atajos.some((x) => x.v === extra)) atajos.push({ v: extra, t: 'El ' + M.fechaCorta(extra) });
        const chips = `<div class="chips" role="group" aria-label="Atajos">${atajos.map((o) => `<button type="button" class="chip" aria-pressed="${valor === o.v}" data-a="calElegir" data-campo="${campo}" data-v="${o.v}" data-fk="op-${campo}-${o.v}">${valor === o.v ? icon('check', 'ico-xs') : ''}<span>${esc(o.t)}</span></button>`).join('')}</div>`;
        return `<div class="campo-fecha">${calendario(h, campo, valor, { label, min: pasado ? null : st.hoy, max: futuro ? null : st.hoy, ayuda, antes: chips })}</div>`;
    }
    P.campoFecha = campoFecha;
    const medios = (st) => st.medios.filter((m) => !m.oculto).map((m) => ({ v: m.id, t: m.nombre, e: m.emoji }));
    const lugares = (st) => st.lugares.map((l) => ({ v: l.id, t: l.nombre, e: l.emoji, s: dinero(M.saldoLugar(st, l.id)) }));
    function fechasCortas(st, extra = null) {
        const lista = [{ v: st.hoy, t: 'Hoy' }, { v: M.sumarDias(st.hoy, -1), t: 'Ayer' }, { v: M.sumarDias(st.hoy, -2), t: 'Antier' }];
        if (extra && !lista.some((x) => x.v === extra)) lista.push({ v: extra, t: 'El ' + M.fechaCorta(extra) });
        return lista;
    }
    /** V2-29 #2: un pago con fecha anterior al último cuadre ya estaba en el saldo: el libre sube. */
    function notaCuadre(st, fecha, lugarId, contado = null) {
        const l = M.lugar(st, lugarId);
        if (!l || !l.cuadre) return '';
        if (fecha >= l.cuadre.fecha) return '';
        const dia = M.partes(l.cuadre.fecha)[2];
        return `<div class="nota nota--info" role="note">${icon('info')}<p>Como cuadraste el ${dia}, este pago ya estaba en tu saldo: <strong>${contado ? `tu libre sube ${dinero(contado)}` : 'tu saldo no baja otra vez'}.</strong></p></div>`;
    }
    P.notaCuadre = notaCuadre;
    /** Lo que una ocurrencia de pago tenía contado en el libre (su estimado o su monto fijo). */
    const contadoDe = (st, pagoId, fecha) => {
        const p = M.pago(st, pagoId);
        const o = p && fecha ? M.ocurrenciasPago(st, p, fecha, fecha)[0] : null;
        return o ? o.monto : null;
    };
    // Valor genérico de una hoja: data-campo + data-v.
    P.acciones.valor = (d) => {
        const h = P.ui.hoja;
        const v = /^\d+$/.test(d.v) && ['dia', 'diaSemana'].includes(d.campo) ? Number(d.v) : d.v;
        if (H[h.tipo].alValor) H[h.tipo].alValor(h, d.campo, v);
        else h[d.campo] = v;
        P.render();
    };
    P.alCampo = function (el) {
        const h = P.ui.hoja;
        const campo = el.dataset.campo;
        if (P.ui.ob && !P.st.configurado && el.closest('.ob')) {
            P.obCampo(el);
            return;
        }
        if (P.ui.stack.at(-1) && P.ui.stack.at(-1).tipo === 'aldia' && !h) {
            P.aldiaCampo(el);
            return;
        }
        if (P.ui.stack.at(-1) && P.ui.stack.at(-1).tipo === 'reparte' && !h && campo === 'repCuadre') {
            P.reparteCampo(el);
            return;
        }
        if (!h) return;
        if (H[h.tipo].alCampo) H[h.tipo].alCampo(h, campo, el);
        else h[campo] = el.value;
        if (h.intento && h.errores.includes(campo) && el.value.trim()) {
            h.errores = h.errores.filter((x) => x !== campo);
            el.removeAttribute('aria-invalid');
            const e = document.getElementById('err-' + campo);
            if (e) e.remove();
        }
        if (H[h.tipo].vivo) H[h.tipo].vivo(h);
    };
    P.acciones.cerrarHoja = () => P.cerrarHoja();
    P.acciones.hoja = (d) => P.abrirHoja(d.hoja, { id: d.id, fecha: d.fecha });
    function validar(h, faltan) {
        h.intento = true;
        h.errores = faltan;
        if (faltan.length) {
            P.render();
            const el = document.querySelector(`#f-${faltan[0]}, [data-campo="${faltan[0]}"]`);
            if (el) el.focus();
            return false;
        }
        return true;
    }
    const claveNombre = (n) => M.normalizar(n || '').split(' ')[0];

    // ================================================================== ANOTAR
    const EJEMPLOS = ['Ej. pupusas 6', 'Ej. súper 25', 'Ej. me pagaron 600', 'Ej. acuérdame colegio 20 el 5', 'Ej. ahorré 50 emergencias', 'Ej. retiré 100 del cajero', 'Ej. tengo 300', 'Ej. vendí 45'];
    const ATAJOS = [['gasto', 'Gasté', 'receipt-text'], ['ingreso', 'Recibí', 'hand-coins'], ['pago', 'Recordarme un pago', 'bell'], ['apartar', 'Ahorrar', 'circle-plus'], ['mover', 'Mover', 'arrow-left-right'], ['cuadre', 'Tengo $___', 'scale']];
    const TIPO_NOMBRE = { gasto: 'Gasto', pagado: 'Pagado', ingreso: 'Ingreso', pago: 'Recordatorio de pago', apartar: 'Ahorrar', liberar: 'Sacar de ahorros', cuadre: 'Tengo (cuadre)', mover: 'Mover', pagoTarjeta: 'Pagar tarjeta' };
    let rotador = null;

    function borradorVacio(st, tipo, base = {}) {
        const d = M.entender(st, '');
        d.tipo = tipo;
        d.nombre = base.nombre || null;
        d.monto = base.monto ?? null;
        if (tipo === 'gasto') {
            d.categoria = 'otros';
            d.medio = base.medio || (st.medios[0] && st.medios[0].id);
        }
        if (tipo === 'ingreso') {
            d.categoria = 'otro';
            d.emoji = '💵';
            d.lugar = base.lugar || (M.principal(st) ? M.principal(st).lugar : st.lugares[0] && st.lugares[0].id);
            d.nombre = d.nombre || 'Ingreso';
        }
        if (tipo === 'pago') {
            d.medio = st.medios[0] && st.medios[0].id;
            d.emoji = '🧾';
            d.categoria = 'otros';
        }
        if (tipo === 'cuadre') d.lugar = base.lugar || (st.lugares.length === 1 ? st.lugares[0].id : null);
        if (tipo === 'mover') {
            d.de = base.lugar || null;
            d.nombre = 'Mover dinero';
        }
        return d;
    }
    function aplicarContexto(st, h, d) {
        if (!d || d.medioExplicito) return d;
        if (h.ctxMedio && (d.tipo === 'gasto' || d.tipo === 'pagado')) {
            d.medio = h.ctxMedio;
            d.medioSeguro = true;
        }
        if (h.ctxLugar && d.tipo === 'ingreso') d.lugar = h.ctxLugar;
        if (h.ctxLugar && d.tipo === 'cuadre') d.lugar = h.ctxLugar;
        // Revisión v2.3: desde la ficha de un ahorro, «ahorrar» y «sacar» van a ese ahorro y un gasto pregunta si sale de él.
        if (h.ctxApartado && M.apartado(st, h.ctxApartado)) {
            if ((d.tipo === 'apartar' || d.tipo === 'liberar') && !d.apartado) {
                d.apartado = h.ctxApartado;
                d.nombre = M.apartado(st, h.ctxApartado).nombre;
                d.pagoParecido = null;
            }
            if (d.tipo === 'gasto' && !d.sugerirApartado && M.apartado(st, h.ctxApartado).monto > 0) d.sugerirApartado = h.ctxApartado;
        }
        return d;
    }
    function chip(campo, texto, { falta = false, abierto = false, etiqueta = '' } = {}) {
        return `<button type="button" class="chip chip--dato${falta ? ' chip--falta' : ''}" data-a="anotarEditar" data-campo="${campo}" aria-expanded="${abierto}" data-fk="ch-${campo}">${etiqueta ? sr(etiqueta + ': ') : ''}${texto}${icon(abierto ? 'chevron-up' : 'chevron-down', 'ico-xs')}</button>`;
    }
    function chipsDe(st, h) {
        const d = h.d;
        const out = [chip('tipo', esc(TIPO_NOMBRE[d.tipo]), { abierto: h.editando === 'tipo', etiqueta: 'Qué pasó' })];
        const montoChip = () => chip('monto', d.monto !== null ? dinero(d.monto) : '¿Cuánto?', { falta: d.monto === null, abierto: h.editando === 'monto', etiqueta: 'Monto' });
        const fechaChip = () => chip('fecha', `${icon('calendar-days', 'ico-xs')}${esc(M.capital(M.relativa(d.fecha, st.hoy)))}${d.fecha > st.hoy ? ' <span class="chip-s">futuro</span>' : ''}`, { abierto: h.editando === 'fecha', etiqueta: 'Cuándo' });
        const medioChip = () => {
            const m = M.medio(st, d.medio);
            return chip('medio', m ? `${emo(m.emoji, 16)} ${esc(m.nombre)}` : '¿Con qué pagaste?', { falta: !m, abierto: h.editando === 'medio', etiqueta: 'Pagado con' });
        };
        if (d.tipo === 'gasto') {
            out.push(montoChip());
            out.push(chip('nombre', d.nombre ? `${emo(d.emoji || '🧩', 16)} ${esc(d.nombre)}${d.categoria && d.categoria !== 'otros' && M.categoria(d.categoria).nombre !== d.nombre ? ` <span class="chip-s">${esc(M.categoria(d.categoria).nombre)}</span>` : ''}` : '¿En qué?', { falta: !d.nombre, abierto: h.editando === 'nombre', etiqueta: 'En qué' }));
            out.push(medioChip());
            out.push(fechaChip());
        } else if (d.tipo === 'pagado') {
            out.push(chip('pago', `${emo(d.emoji, 16)} ${esc(d.nombre)} <span class="chip-s">${d.ocurrencia ? (d.ocurrencia < st.hoy ? 'venció el ' + M.partes(d.ocurrencia)[2] : 'vence el ' + M.partes(d.ocurrencia)[2]) : ''}</span>`, { abierto: h.editando === 'pago', etiqueta: 'Pago' }));
            out.push(montoChip());
            out.push(medioChip());
            out.push(fechaChip());
        } else if (d.tipo === 'ingreso') {
            out.push(montoChip());
            const ref = d.ingresoRef ? `${emo(d.emoji, 16)} ${esc(d.nombre)} <span class="chip-s">${d.preguntarIngreso && !d.cualIngreso ? '¿o extra?' : d.ingresoRef.fecha > st.hoy ? 'se adelantó' : 'del ' + M.partes(d.ingresoRef.fecha)[2]}</span>` : `${emo(d.emoji || '💵', 16)} ${esc(d.nombre || 'Ingreso')}`;
            out.push(chip('nombre', ref, { abierto: h.editando === 'nombre', etiqueta: 'De qué' }));
            const l = M.lugar(st, d.lugar);
            out.push(chip('lugar', l ? `${emo(l.emoji, 16)} ${esc(l.nombre)}` : '¿Dónde?', { falta: !l, abierto: h.editando === 'lugar', etiqueta: 'Dónde cayó' }));
            out.push(fechaChip());
        } else if (d.tipo === 'pago') {
            out.push(chip('nombre', d.nombre ? `${emo(d.emoji, 16)} ${esc(d.nombre)}` : '¿Qué pago?', { falta: !d.nombre, abierto: h.editando === 'nombre', etiqueta: 'Pago' }));
            out.push(montoChip());
            const cuando = d.frecuencia === 'semanal' ? `cada ${M.DIAS[d.diaSemana ?? 5]}` : d.frecuencia === 'unico' && d.fechaPago ? `el ${M.fechaCorta(d.fechaPago)}` : d.dia ? `el ${d.dia}` : '¿Qué día?';
            out.push(chip('dia', esc(cuando), { falta: d.frecuencia !== 'semanal' && !d.dia && !d.fechaPago, abierto: h.editando === 'dia', etiqueta: 'Cuándo' }));
            if (d.frecuencia) out.push(chip('frecuencia', d.frecuencia === 'mensual' ? 'Cada mes' : d.frecuencia === 'semanal' ? 'Cada semana' : 'Solo esta vez', { abierto: h.editando === 'frecuencia', etiqueta: 'Se repite' }));
            out.push(medioChip());
        } else if (d.tipo === 'apartar' || d.tipo === 'liberar') {
            out.push(montoChip());
            const a = M.apartado(st, d.apartado);
            out.push(chip('apartado', a ? `${emo(a.emoji, 16)} ${esc(a.nombre)}` : d.nombre ? `${esc(d.nombre)} <span class="chip-s">nuevo</span>` : '¿En cuál?', { falta: !a && !d.nombre, abierto: h.editando === 'apartado', etiqueta: 'Ahorro' }));
        } else if (d.tipo === 'cuadre') {
            out.push(montoChip());
            const l = M.lugar(st, d.lugar);
            out.push(chip('lugar', l ? `${emo(l.emoji, 16)} ${esc(l.nombre)}` : '¿Dónde?', { falta: !l, abierto: h.editando === 'lugar', etiqueta: 'Dónde' }));
        } else if (d.tipo === 'mover') {
            out.push(montoChip());
            const de = M.lugar(st, d.de);
            const a = M.lugar(st, d.a);
            out.push(chip('mover', `${de ? esc(de.nombre) : '¿De dónde?'} → ${a ? esc(a.nombre) : '¿A dónde?'}`, { falta: !de || !a, abierto: h.editando === 'mover', etiqueta: 'De dónde a dónde' }));
            out.push(fechaChip());
        } else if (d.tipo === 'pagoTarjeta') {
            out.push(montoChip());
            out.push(chip('lugar', `${esc(M.lugar(st, d.lugar)?.nombre || '¿Desde dónde?')} → ${esc(M.tarjeta(st, d.tarjeta)?.nombre || 'tarjeta')}`, { abierto: h.editando === 'lugar', etiqueta: 'De dónde' }));
            out.push(fechaChip());
        }
        return out.join('');
    }
    function editorAnotar(st, h, campo) {
        const d = h.d;
        if (campo === 'tipo') return opciones(h, { campo: 'tipo', label: '¿Qué pasó?', accion: 'anotarValor', valor: d.tipo, lista: Object.entries(TIPO_NOMBRE).filter(([k]) => !['pagado', 'liberar', 'pagoTarjeta'].includes(k) || k === d.tipo).map(([v, t]) => ({ v, t })) });
        if (campo === 'monto') return campoMonto(h, { valor: d.monto !== null ? M.montoCampo(d.monto) : '', errorTexto: 'Escribe cuánto fue', id: 'f-monto' });
        if (campo === 'medio') return opciones(h, { campo: 'medio', label: d.tipo === 'pago' ? '¿Con qué lo pagas?' : 'Pagado con', accion: 'anotarValor', valor: d.medio, lista: medios(st), errorTexto: 'Elige con qué pagaste' });
        if (campo === 'fecha') return campoFecha(h, 'fecha', d.fecha, { label: '¿Cuándo?', futuro: d.tipo === 'gasto' || d.tipo === 'ingreso', extra: d.ocurrencia && d.ocurrencia <= st.hoy ? d.ocurrencia : null, ayuda: d.tipo === 'gasto' || d.tipo === 'ingreso' ? 'Si eliges una fecha que todavía no llega, lo pongo en Pagos.' : '' });
        if (campo === 'lugar') return opciones(h, { campo: 'lugar', label: d.tipo === 'ingreso' ? '¿Dónde cayó?' : d.tipo === 'pagoTarjeta' ? '¿Desde dónde?' : '¿Dónde?', accion: 'anotarValor', valor: d.lugar, lista: lugares(st), errorTexto: 'Elige dónde' });
        if (campo === 'frecuencia') return opciones(h, { campo: 'frecuencia', label: '¿Se repite?', accion: 'anotarValor', valor: d.frecuencia, lista: [{ v: 'mensual', t: 'Cada mes' }, { v: 'semanal', t: 'Cada semana' }, { v: 'unico', t: 'Solo esta vez' }], errorTexto: 'Dinos si se repite' });
        if (campo === 'dia') return d.frecuencia === 'semanal' ? opciones(h, { campo: 'diaSemana', label: '¿Qué día de la semana?', accion: 'anotarValor', valor: d.diaSemana ?? 5, lista: [1, 2, 3, 4, 5, 6, 0].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })) }) : d.frecuencia === 'unico' ? calendario(h, 'fechaPago', d.fechaPago || (d.dia ? M.proximoDia(st.hoy, d.dia) : null), { label: '¿Qué día vence?' }) : selectorDia(h, 'dia', d.dia);
        if (campo === 'apartado') return opciones(h, { campo: 'apartado', label: '¿En cuál ahorro?', accion: 'anotarValor', valor: d.apartado, lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), errorTexto: 'Elige un ahorro' }) + (d.tipo === 'apartar' ? campoTexto(h, { campo: 'nuevoApartado', label: 'O crea uno nuevo', valor: d.apartado ? '' : d.nombre || '', placeholder: 'Ej. Regalo de mamá' }) : '');
        if (campo === 'nombre') {
            if (d.tipo === 'ingreso') return opciones(h, { campo: 'categoriaIngreso', label: '¿De qué?', accion: 'anotarValor', valor: d.ingresoRef ? 'esperado' : d.categoria, lista: [...(d.ingresoRef ? [{ v: 'esperado', t: d.nombre, e: d.emoji }] : []), ...D.INGRESO_CATEGORIAS.map((k) => ({ v: k.id, t: k.nombre, e: k.emoji }))] });
            const cats = d.tipo === 'gasto' ? opciones(h, { campo: 'categoria', label: 'Tipo de gasto', accion: 'anotarValor', valor: d.categoria, lista: D.CATEGORIAS.filter((k) => !['servicios', 'cuotas'].includes(k.id)).map((k) => ({ v: k.id, t: k.nombre, e: k.emoji })) }) : d.tipo === 'pago' ? opciones(h, { campo: 'frecuente', label: 'Pagos frecuentes', accion: 'anotarValor', valor: '', lista: D.PAGOS_FRECUENTES.map((f) => ({ v: f.id, t: f.nombre, e: f.emoji })) }) : '';
            return campoTexto(h, { campo: 'nombre', label: d.tipo === 'pago' ? '¿Qué pago?' : '¿En qué?', valor: d.nombre || '', placeholder: d.tipo === 'pago' ? 'Ej. Colegio' : 'Ej. Pupusas', errorTexto: 'Escribe en qué fue' }) + cats;
        }
        if (campo === 'mover') return opciones(h, { campo: 'de', label: '¿De dónde?', accion: 'anotarValor', valor: d.de, lista: lugares(st) }) + opciones(h, { campo: 'a', label: '¿A dónde?', accion: 'anotarValor', valor: d.a, lista: [...lugares(st), ...st.tarjetas.map((t) => ({ v: 'tarjeta:' + t.id, t: 'Pagar ' + t.nombre, e: t.emoji }))] });
        if (campo === 'pago') return `<p class="txt">Este es tu pago de ${esc(d.nombre)} en Pagos. Para cambiarlo, ábrelo desde Pagos.</p>`;
        return '';
    }
    function preguntasAnotar(st, h) {
        const d = h.d;
        const out = [];
        if (d.tipo === 'pago' && !d.frecuencia) out.push(`<div class="pregunta">${opciones(h, { campo: 'frecuencia', label: '¿Se repite?', accion: 'anotarValor', valor: d.frecuencia, lista: [{ v: 'mensual', t: 'Cada mes' }, { v: 'semanal', t: 'Cada semana' }, { v: 'unico', t: 'Solo esta vez' }], errorTexto: 'Dinos si se repite' })}</div>`);
        if (d.tipo === 'pago' && d.duplicado) out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Ya tienes «${esc(M.pago(st, d.duplicado).nombre)}» en Pagos. Si es otro, guárdalo igual.</p></div>`);
        if (d.tipo === 'gasto' && d.sugerirApartado && d.usarApartado === null && M.apartado(st, d.sugerirApartado)) {
            const a = M.apartado(st, d.sugerirApartado);
            const pregunta = d.apartadoPorNombre ? `¿Lo tomas de tu ahorro ${esc(a.nombre)}? <span class="opcional">(tiene ${dinero(a.monto)})</span>` : `¿Lo pagas con tu ahorro ${esc(a.nombre)} (${dinero(a.monto)})?`;
            out.push(`<div class="pregunta"><p class="campo-l">${pregunta}</p><div class="chips"><button type="button" class="chip" data-a="anotarValor" data-campo="usarApartado" data-v="${a.id}" data-fk="usar-si">${emo(a.emoji, 18)}Sí, de ${esc(a.nombre)}</button><button type="button" class="chip" data-a="anotarValor" data-campo="usarApartado" data-v="no" data-fk="usar-no">No</button></div></div>`);
        }
        if (d.tipo === 'gasto' && d.usarApartado && d.usarApartado !== 'no' && M.apartado(st, d.usarApartado)) {
            const a = M.apartado(st, d.usarApartado);
            const m = M.medio(st, d.medio);
            const texto = m && m.tarjeta ? `Sale de tu ahorro <strong>${esc(a.nombre)}</strong> y queda guardado para pagar tu tarjeta: tu libre no baja.` : `Sale de tu ahorro <strong>${esc(a.nombre)}</strong>: tu libre no baja.`;
            out.push(`<div class="nota nota--ok" role="note">${icon('check')}<p>${texto} <button type="button" class="link link--inline" data-a="anotarValor" data-campo="usarApartado" data-v="no" data-fk="usar-quitar">No usar el ahorro</button></p></div>`);
        }
        // V2-25: compra con crédito cuando el libre no alcanza: aviso amable, sin culpa.
        if (d.tipo === 'gasto' && d.monto && (!d.usarApartado || d.usarApartado === 'no')) {
            const m = M.medio(st, d.medio);
            const t = m && m.tarjeta ? M.tarjeta(st, m.tarjeta) : null;
            if (t && P.calc().libre - d.monto < 0) {
                const info = M.tarjetaInfo(st, t);
                out.push(`<div class="nota nota--atencion" role="note">${icon('info')}<p><strong>Esto se paga el ${esc(P.diaPago(info, info.venceCompras))} y hoy no te alcanzaría.</strong> Puedes guardarlo igual; lo verás claro en tu número.</p></div>`);
            }
        }
        // V2-29 #10: «me pagaron 600» cerca de un ingreso esperado.
        const refIngreso = d.ingresoRef || d.refGuardada;
        if (d.tipo === 'ingreso' && refIngreso && d.preguntarIngreso) {
            const ing = M.ingreso(st, refIngreso.id);
            const cual = ing.frecuencia === 'quincenal' ? 'quincena' : ing.frecuencia === 'semanal' ? 'pago de la semana' : ing.nombre.toLowerCase();
            const dia = M.partes(refIngreso.fecha)[2];
            const adelantada = refIngreso.fecha > st.hoy;
            const ch = (v, t) => `<button type="button" class="chip" aria-pressed="${d.cualIngreso === v}" data-a="anotarValor" data-campo="cualIngreso" data-v="${v}" data-fk="cual-${v}">${d.cualIngreso === v ? icon('check', 'ico-xs') : ''}${t}</button>`;
            out.push(`<div class="pregunta" role="group" aria-labelledby="l-cualIngreso"><p class="campo-l" id="l-cualIngreso">¿Es tu ${esc(cual)} del ${dia}${adelantada ? ' adelantada' : ''} o un ingreso extra?</p><div class="chips">${ch('esperado', `Mi ${esc(cual)} del ${dia}`)}${ch('extra', 'Un ingreso extra')}</div>${error(h, 'cualIngreso', 'Elige una opción')}</div>`);
        }
        // V2-29 #11: «aparté 20 luz» cuando la luz ya está en Pagos.
        if (d.tipo === 'apartar' && d.pagoParecido && d.apartarIgual !== 'si') {
            const pg = M.pago(st, d.pagoParecido);
            const art = P.conArticulo(pg.nombre);
            const el = art.startsWith('el ');
            out.push(`<div class="pregunta" role="group" aria-labelledby="l-apartarIgual"><p class="campo-l" id="l-apartarIgual">${esc(M.capital(art))} ya está en tus pagos y se descuenta ${el ? 'solo' : 'sola'}. ¿${el ? 'Lo' : 'La'} ahorras igual?</p><div class="chips"><button type="button" class="chip" data-a="anotarValor" data-campo="apartarIgual" data-v="si" data-fk="ap-igual-si">Sí, ahorrar igual</button><button type="button" class="chip" data-a="anotarValor" data-campo="apartarIgual" data-v="no" data-fk="ap-igual-no">No, déjalo</button></div>${error(h, 'apartarIgual', 'Elige una opción')}</div>`);
        }
        if (d.tipo === 'mover' && d.preguntarComision) {
            out.push(`<div class="pregunta"><p class="campo-l" id="l-comision">¿Te cobraron comisión? <span class="opcional">(opcional)</span></p><div class="chips" role="group" aria-labelledby="l-comision"><button type="button" class="chip" aria-pressed="${d.comision === null}" data-a="anotarValor" data-campo="comisionSi" data-v="no" data-fk="com-no">${d.comision === null ? icon('check', 'ico-xs') : ''}No</button><button type="button" class="chip" aria-pressed="${d.comision !== null}" data-a="anotarValor" data-campo="comisionSi" data-v="si" data-fk="com-si">${d.comision !== null ? icon('check', 'ico-xs') : ''}Sí</button></div>${d.comision !== null ? campoMonto(h, { campo: 'comision', label: '¿Cuánto te cobraron?', valor: M.montoCampo(d.comision), id: 'f-comision' }) : ''}</div>`);
        }
        if (d.tipo === 'cuadre' && !d.lugar && h.editando !== 'lugar' && h.modo !== 'form') out.push(`<div class="pregunta">${opciones(h, { campo: 'lugar', label: d.monto !== null ? `¿Dónde tienes ${dinero(d.monto)}?` : '¿Dónde?', accion: 'anotarValor', valor: d.lugar, lista: lugares(st), errorTexto: 'Elige dónde' })}</div>`);
        if (d.tipo === 'apartar' && !d.apartado && !d.nombre && h.editando !== 'apartado' && h.modo !== 'form') out.push(`<div class="pregunta">${opciones(h, { campo: 'apartado', label: '¿En cuál ahorro?', accion: 'anotarValor', valor: d.apartado, lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), errorTexto: 'Elige un ahorro' })}</div>`);
        if (d.tipo === 'cuadre' && d.lugar && d.monto !== null) {
            const esperado = M.saldoLugar(st, d.lugar);
            const dif = d.monto - esperado;
            out.push(`<div class="nota nota--info" role="note">${icon('scale')}<p>Según lo anotado tienes ${dinero(esperado)} en ${esc(M.lugar(st, d.lugar).nombre)}. ${dif === 0 ? 'Cuadra exacto.' : `Los ${dinero(Math.abs(dif))} de diferencia quedan «sin detalle».`} Desde ahora tu saldo parte de este número.</p></div>`);
        }
        if (d.tipo === 'pagado' && d.medio) {
            const m = M.medio(st, d.medio);
            if (m && m.lugar) out.push(notaCuadre(st, d.fecha, m.lugar, contadoDe(st, d.pago, d.ocurrencia)));
        }
        if (d.tipo === 'ingreso' && d.ingresoRef && (!d.preguntarIngreso || d.cualIngreso === 'esperado')) out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Al guardar te ayudo a repartirla.</p></div>`);
        if (d.tipo === 'pagoTarjeta') out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Pagar la tarjeta mueve dinero de tu banco a la tarjeta: no es un gasto nuevo.</p></div>`);
        if ((d.tipo === 'gasto' || d.tipo === 'ingreso') && d.fecha > st.hoy) out.push(`<div class="nota nota--info" role="note">${icon('calendar-days')}<p><strong>Es para el ${esc(M.fechaLarga(d.fecha))}:</strong> ${d.tipo === 'gasto' ? 'lo pongo en Pagos como pago de una vez. No baja tu dinero hasta que lo pagues.' : 'lo pongo como ingreso esperado. No suma a tu libre hasta que llegue.'}</p></div>`);
        if (d.tipo === 'apartar' && d.monto !== null) {
            const k = P.calc();
            const sin = k.tienes - k.apartado;
            if (d.monto > sin) out.push(`<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p>Solo tienes ${dinero(Math.max(0, sin))} fuera de ahorros. Puedes ahorrarlo igual, pero te faltará para cubrirlo.</p></div>`);
        }
        return out.join('');
    }
    function cuerpoAnotar(st, h) {
        if (!h.d) {
            return `<p class="campo-l campo-l--sec">O empieza por aquí</p><div class="atajos">${ATAJOS.map(([t, txt, ic]) => `<button type="button" class="atajo" data-a="anotarAtajo" data-v="${t}" data-fk="atajo-${t}">${icon(ic)}<span>${txt}</span></button>`).join('')}</div>`;
        }
        if (!h.d.tipo) {
            return `<div class="nota nota--info" role="note">${icon('circle-question-mark')}<p><strong>No entendí del todo.</strong> ¿Qué pasó? Elige y completo lo demás contigo.</p></div><div class="atajos">${ATAJOS.map(([t, txt, ic]) => `<button type="button" class="atajo" data-a="anotarAtajo" data-v="${t}" data-fk="atajo-${t}">${icon(ic)}<span>${txt}</span></button>`).join('')}</div>`;
        }
        const faltan = M.faltan(st, h.d).filter((f) => f !== 'frecuencia');
        const abiertos = h.modo === 'form' ? camposDe(h.d.tipo) : [...new Set([...(h.editando ? [h.editando] : []), ...(h.intento ? faltan : [])])];
        return `<p class="campo-l campo-l--sec" id="anotar-entendi">${h.modo === 'form' ? 'Completa los datos' : 'Entendí esto. Toca cualquier dato para cambiarlo.'}</p>
            ${h.modo === 'form' ? '' : `<div class="chips chips--datos" id="anotar-chips" role="group" aria-labelledby="anotar-entendi">${chipsDe(st, h)}</div>`}
            <div id="anotar-editor">${abiertos.map((c) => `<div class="editor${h.modo === 'form' ? ' editor--form' : ''}">${editorAnotar(st, h, c)}</div>`).join('')}</div>
            <div id="anotar-preg">${preguntasAnotar(st, h)}</div>`;
    }
    function camposDe(tipo) {
        return { gasto: ['monto', 'nombre', 'medio', 'fecha'], pagado: ['monto', 'medio', 'fecha'], ingreso: ['monto', 'nombre', 'lugar', 'fecha'], pago: ['nombre', 'monto', 'frecuencia', 'dia', 'medio'], apartar: ['monto', 'apartado'], liberar: ['monto', 'apartado'], cuadre: ['lugar', 'monto'], mover: ['monto', 'mover'], pagoTarjeta: ['monto', 'lugar'] }[tipo] || [];
    }
    H.anotar = {
        iniciar(h) {
            const st = P.st;
            h.texto = h.texto || '';
            h.d = h.atajo ? aplicarContexto(st, h, borradorVacio(st, h.atajo, { lugar: h.ctxLugar, medio: h.ctxMedio })) : null;
            h.modo = h.atajo ? 'form' : 'chips';
            h.manual = {};
            h.editando = null;
            h.ultimaClave = '';
        },
        foco: () => '#anotar-q',
        html(h) {
            const st = P.st;
            const ctx = h.ctxMedio ? M.medio(st, h.ctxMedio) : h.ctxLugar ? M.lugar(st, h.ctxLugar) : h.ctxApartado ? M.apartado(st, h.ctxApartado) : null;
            return {
                titulo: 'Anotar',
                cuerpo: `${ctx ? `<p class="contexto">${emo(ctx.emoji, 16)} Desde ${esc(ctx.nombre)}</p>` : ''}
                    <label class="campo-l" for="anotar-q">¿Qué pasó?</label>
                    <div class="campo campo--grande"><input id="anotar-q" data-campo="texto" type="text" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" spellcheck="false" placeholder="${esc(EJEMPLOS[0])}" value="${esc(h.texto)}" aria-describedby="anotar-mic"></div>
                    <p class="campo-ayuda" id="anotar-mic">${icon('mic', 'ico-s')}Puedes dictar: toca el micrófono de tu teclado.</p>
                    ${h.intento && h.errores.includes('tipo') ? `<p class="campo-error" id="err-tipo">${icon('triangle-alert')}<span>Escribe qué pasó o elige una opción</span></p>` : ''}
                    <div id="anotar-cuerpo">${cuerpoAnotar(st, h)}</div>`,
                pie: pie2('anotarGuardar', 'Guardar', { fk: 'anotar-guardar' }),
            };
        },
        alCampo(h, campo, el) {
            const st = P.st;
            if (campo === 'texto') {
                h.texto = el.value;
                if (!el.value.trim()) {
                    h.d = h.modo === 'form' && h.d ? h.d : null;
                } else {
                    const nuevo = aplicarContexto(st, h, M.entender(st, el.value));
                    if (h.d && h.modo === 'form' && !nuevo.tipo) {
                        // En el formulario, lo escrito solo completa lo que se entienda.
                    } else {
                        if (h.d) for (const k of Object.keys(h.manual)) if (nuevo.tipo === h.d.tipo) nuevo[k] = h.d[k];
                        h.d = nuevo;
                        if (nuevo.tipo) h.modo = 'chips';
                    }
                }
                h.intento = false;
                h.errores = [];
                region('anotar-cuerpo', cuerpoAnotar(st, h));
                const clave = h.d && h.d.tipo ? `entendio:${h.d.tipo}${h.d.nombre ? ':' + claveNombre(h.d.nombre) : ''}` : '';
                if (clave && clave !== h.ultimaClave) {
                    h.ultimaClave = clave;
                    P.emitir(clave);
                }
                return;
            }
            if (!h.d) return;
            if (campo === 'monto') {
                h.d.monto = M.leerMonto(el.value);
                h.manual.monto = true;
                region('anotar-chips', chipsDe(st, h));
                region('anotar-preg', preguntasAnotar(st, h));
            } else if (campo === 'comision') {
                h.d.comision = M.leerMonto(el.value) ?? 0;
            } else if (campo === 'nombre') {
                h.d.nombre = el.value.trim() || null;
                h.manual.nombre = true;
                if (h.d.tipo === 'gasto') {
                    const w = claveNombre(el.value);
                    const k = D.CATEGORIAS.find((x) => x.palabras.includes(w));
                    if (k && !h.manual.categoria) h.d.categoria = k.id;
                    h.d.emoji = D.EMOJI_NOMBRE[w] || M.categoria(h.d.categoria).emoji;
                }
                region('anotar-chips', chipsDe(st, h));
            } else if (campo === 'nuevoApartado') {
                h.d.apartado = null;
                h.d.nombre = el.value.trim() || null;
                region('anotar-chips', chipsDe(st, h));
            }
        },
        alValor(h, campo, v) {
            P.acciones.anotarValor({ campo, v: String(v) });
        },
        alCerrar() {
            clearInterval(rotador);
        },
    };
    P.acciones.anotar = () => {
        const top = P.ui.stack.at(-1);
        const datos = {};
        if (top && top.tipo === 'lugar') {
            datos.ctxLugar = top.id;
            const m = P.st.medios.find((x) => x.lugar === top.id && (x.id === top.id || x.tarjetaDebito)) || P.st.medios.find((x) => x.lugar === top.id);
            if (m) datos.ctxMedio = m.id;
        }
        if (top && top.tipo === 'tarjeta') datos.ctxMedio = P.st.medios.find((x) => x.tarjeta === top.id)?.id;
        if (top && top.tipo === 'apartado') datos.ctxApartado = top.id;
        P.abrirHoja('anotar', datos);
        let i = 0;
        clearInterval(rotador);
        rotador = setInterval(() => {
            const q = document.getElementById('anotar-q');
            if (!q || !P.ui.hoja || P.ui.hoja.tipo !== 'anotar') return clearInterval(rotador);
            i = (i + 1) % EJEMPLOS.length;
            q.placeholder = EJEMPLOS[i];
        }, 2600);
    };
    P.acciones.anotarAtajo = (d) => {
        const h = P.ui.hoja;
        const st = P.st;
        const previo = h.d;
        // Registro de uso: el intérprete no entendió lo escrito (se cuenta, el texto no se guarda).
        if (previo && !previo.tipo && h.texto && h.texto.trim()) P.emitir('anotar:noEntendio');
        h.d = aplicarContexto(st, h, borradorVacio(st, d.v, { monto: previo ? previo.monto : null, nombre: previo && d.v === 'gasto' ? previo.nombre : null, lugar: h.ctxLugar, medio: h.ctxMedio }));
        h.modo = 'form';
        h.manual = {};
        P.render({ foco: `#f-${camposDe(d.v)[0]}, [data-campo="${camposDe(d.v)[0]}"]` });
        P.emitir('atajo:' + d.v);
    };
    P.acciones.anotarEditar = (d) => {
        const h = P.ui.hoja;
        h.editando = h.editando === d.campo ? null : d.campo;
        P.render();
        if (h.editando) {
            const el = document.querySelector('#anotar-editor input, #anotar-editor [aria-pressed="true"], #anotar-editor button');
            if (el) el.focus();
        }
    };
    P.acciones.anotarValor = (d) => {
        const h = P.ui.hoja;
        const st = P.st;
        const x = h.d;
        const v = d.v;
        h.manual[d.campo] = true;
        if (d.campo === 'tipo') {
            h.d = aplicarContexto(st, h, borradorVacio(st, v, { monto: x.monto, nombre: v === 'gasto' || v === 'pago' ? x.nombre : null, lugar: h.ctxLugar }));
            h.modo = 'form';
            h.manual = {};
        } else if (d.campo === 'categoria') {
            x.categoria = v;
            x.emoji = D.EMOJI_NOMBRE[claveNombre(x.nombre)] || M.categoria(v).emoji;
            if (!x.nombre) x.nombre = M.categoria(v).nombre;
            if (!x.medioExplicito && !h.manual.medio) x.medio = M.medioUsual(st, v).id;
        } else if (d.campo === 'categoriaIngreso') {
            if (v === 'esperado') return P.render();
            x.ingresoRef = null;
            x.categoria = v;
            const k = M.categoria(v);
            x.emoji = k.emoji;
            x.nombre = k.nombre;
        } else if (d.campo === 'frecuente') {
            const f = D.PAGOS_FRECUENTES.find((y) => y.id === v);
            x.nombre = f.nombre;
            x.emoji = f.emoji;
            x.categoria = f.categoria;
            if (f.semanal) x.frecuencia = 'semanal';
        } else if (d.campo === 'usarApartado') {
            x.usarApartado = v === 'no' ? 'no' : v;
        } else if (d.campo === 'cualIngreso') {
            x.cualIngreso = v;
            if (v === 'extra') {
                x.refGuardada = x.ingresoRef || x.refGuardada;
                x.ingresoRef = null;
                Object.assign(x, { nombre: 'Ingreso extra', emoji: '💵', categoria: 'otro' });
            } else if (x.ingresoRef || x.refGuardada) {
                x.ingresoRef = x.ingresoRef || x.refGuardada;
                const ing = M.ingreso(st, x.ingresoRef.id);
                Object.assign(x, { nombre: ing.nombre, emoji: ing.emoji, categoria: ing.categoria, lugar: ing.lugar });
            }
        } else if (d.campo === 'apartarIgual') {
            if (v === 'no') {
                P.cerrarHoja();
                P.avisar('Listo, no ahorramos nada', { check: false });
                P.emitir('anotar:apartarIgual:no');
                return;
            }
            x.apartarIgual = 'si';
        } else if (d.campo === 'comisionSi') {
            x.comision = v === 'si' ? 150 : null;
        } else if (d.campo === 'diaSemana') {
            x.diaSemana = Number(v);
        } else if (d.campo === 'dia') {
            x.dia = Number(v);
        } else if (d.campo === 'a' && String(v).startsWith('tarjeta:')) {
            h.d = { ...x, tipo: 'pagoTarjeta', tarjeta: v.split(':')[1], lugar: x.de || st.lugares.find((l) => l.tipo === 'banco')?.id, nombre: 'Pago de ' + M.tarjeta(st, v.split(':')[1]).nombre };
        } else {
            x[d.campo] = v;
        }
        if ((['medio', 'fecha', 'lugar', 'frecuencia', 'categoria', 'dia', 'diaSemana', 'apartado'].includes(d.campo) && h.editando === d.campo) || (d.campo === 'fechaPago' && h.editando === 'dia')) h.editando = null;
        if (h.intento) h.errores = M.faltan(st, h.d);
        P.render();
        P.emitir('anotar:' + d.campo + ':' + v);
    };
    P.acciones.anotarGuardar = () => {
        const h = P.ui.hoja;
        const st = P.st;
        if (!h.d || !h.d.tipo) {
            if (h.d && h.texto && h.texto.trim()) P.emitir('anotar:noEntendio');
            h.intento = true;
            h.errores = ['tipo'];
            P.render({ foco: '#anotar-q' });
            return;
        }
        const d = h.d;
        if (d.tipo === 'apartar' && !d.apartado && d.nombre) d.nuevoApartado = d.nombre;
        const faltan = M.faltan(st, d).filter((f) => !(f === 'apartado' && d.nuevoApartado));
        if (faltan.length) {
            h.intento = true;
            h.errores = faltan;
            h.editando = null;
            P.render();
            const el = document.querySelector(`#anotar-editor #f-${faltan[0]}, #anotar-editor [data-campo="${faltan[0]}"], #anotar-preg [data-campo="${faltan[0]}"]`) || document.querySelector('#anotar-editor input, #anotar-editor button, #anotar-preg button');
            if (el) el.focus();
            return;
        }
        let siguiente = null;
        const nombreClave = claveNombre(d.nombre);
        const futuro = (d.tipo === 'gasto' || d.tipo === 'ingreso') && d.fecha > st.hoy;
        const claves = futuro ? [d.tipo === 'gasto' ? 'guardado:pago' : 'guardado:ingresoEsperado', 'guardado:futuro'] : ['guardado:' + d.tipo, 'guardado:' + d.tipo + ':' + nombreClave];
        P.ui.hoja = null;
        let texto = 'Guardado';
        let cambiar = null;
        P.cambiar(
            (s) => {
                if ((d.tipo === 'gasto' || d.tipo === 'ingreso') && d.fecha > s.hoy) {
                    // V2-44: nunca se descuenta (ni se suma) dinero que todavía no salió (ni llegó).
                    if (d.tipo === 'gasto') P.crearPago(s, { nombre: d.nombre, emoji: d.emoji, categoria: d.categoria, monto: d.monto, frecuencia: 'unico', fecha: d.fecha, medio: d.medio });
                    else s.ingresos.push({ id: 'i' + s.seq++, nombre: d.nombre || 'Ingreso', emoji: d.emoji || '💵', categoria: d.categoria || 'otro', monto: d.monto, aprox: false, frecuencia: 'unico', fecha: d.fecha, lugar: d.lugar, principal: false, extra: true, desde: s.hoy, llegadas: {} });
                    texto = d.tipo === 'gasto' ? `Lo puse en Pagos para el ${M.fechaCorta(d.fecha)}` : `Ingreso esperado el ${M.fechaCorta(d.fecha)}`;
                } else if (d.tipo === 'gasto') {
                    const r = P.registrar(s, { tipo: 'gasto', fecha: d.fecha, monto: d.monto, nombre: d.nombre, categoria: d.categoria, emoji: d.emoji, medio: d.medio, anotado: true, nuevo: true });
                    if (d.usarApartado && d.usarApartado !== 'no') {
                        const u = P.usarApartado(s, d.usarApartado, r);
                        if (u && u.reserva) texto = `Guardado · ${dinero(u.usado)} quedan para pagar tu tarjeta`;
                        else if (u && u.cierra) texto = `Guardado · cerramos tu ahorro ${r.apartadoNombre}`;
                    }
                } else if (d.tipo === 'pagado') {
                    const r = P.marcarPagado(s, d.pago, d.ocurrencia, { monto: d.monto, medio: d.medio, fecha: d.fecha });
                    texto = `Pagado con ${M.medio(s, d.medio)?.nombre || 'tu medio'}`;
                    cambiar = r.id;
                } else if (d.tipo === 'ingreso') {
                    if (d.ingresoRef) {
                        P.llegoIngreso(s, d.ingresoRef.id, d.ingresoRef.fecha, { monto: d.monto, lugar: d.lugar, fecha: d.fecha });
                        siguiente = { tipo: 'reparte', id: d.ingresoRef.id, fecha: d.ingresoRef.fecha, monto: d.monto };
                    } else P.registrar(s, { tipo: 'ingreso', fecha: d.fecha, monto: d.monto, nombre: d.nombre, categoria: d.categoria, emoji: d.emoji, lugar: d.lugar, anotado: true, nuevo: true });
                } else if (d.tipo === 'pago') {
                    P.crearPago(s, { nombre: d.nombre, emoji: d.emoji, categoria: d.categoria, monto: d.monto, frecuencia: d.frecuencia, dia: d.dia, diaSemana: d.diaSemana, medio: d.medio, fecha: d.frecuencia === 'unico' ? d.fechaPago || M.proximoDia(s.hoy, d.dia || 1) : undefined });
                } else if (d.tipo === 'apartar') {
                    let id = d.apartado;
                    if (!id) {
                        id = 'a' + s.seq++;
                        s.apartados.push({ id, nombre: d.nuevoApartado, emoji: '🐷', portada: 'general-alcancia', monto: 0, meta: null, metaFecha: null, historial: [] });
                    }
                    P.apartarEn(s, id, d.monto, 'apartar');
                } else if (d.tipo === 'liberar') {
                    P.apartarEn(s, d.apartado, d.monto, 'liberar');
                } else if (d.tipo === 'cuadre') {
                    P.cuadrar(s, d.lugar, d.monto);
                } else if (d.tipo === 'mover') {
                    P.registrar(s, { tipo: 'mover', fecha: d.fecha, monto: d.monto, de: d.de, a: d.a, nombre: d.preguntarComision ? 'Retiro del cajero' : 'Mover dinero', nuevo: true });
                    if (d.comision) {
                        const m = s.medios.find((x) => x.lugar === d.de && x.tarjetaDebito) || s.medios.find((x) => x.lugar === d.de);
                        P.registrar(s, { tipo: 'gasto', fecha: d.fecha, monto: d.comision, nombre: 'Comisión del cajero', categoria: 'otros', emoji: '🏦', medio: m ? m.id : null, anotado: true, nuevo: true });
                    }
                } else if (d.tipo === 'pagoTarjeta') {
                    P.pagarTarjeta(s, d.tarjeta, { monto: d.monto, lugar: d.lugar, fecha: d.fecha });
                }
            },
            { aviso: () => texto, cambiar: () => cambiar, claves },
        );
        clearInterval(rotador);
        if (siguiente) P.abrir('reparte', siguiente.id, { fecha: siguiente.fecha, monto: siguiente.monto });
        else {
            const el = document.querySelector('[data-fk="nav-anotar"]');
            if (el) el.focus({ preventScroll: true });
        }
    };

    // ================================================================== DESGLOSE DEL LIBRE
    H.desglose = {
        html() {
            const st = P.st;
            const k = P.calc();
            const hz = k.hz;
            const antes = hz.ingreso ? (hz.esHoy ? 'antes de hoy' : hz.atrasada ? 'ya vencido' : `antes del ${M.partes(hz.fecha)[2]}`) : 'en este periodo';
            const linea = (o, sub) => `<li><span>${emo(o.pago.emoji, 16)} ${esc(o.pago.nombre)} <span class="d-sub">${sub}</span></span><span>${dinero(o.parte, { aprox: o.estimado })}</span></li>`;
            const parteDe = (o) => (o.parte < o.monto ? ` · ${dinero(o.parte)} de ${dinero(o.monto, { aprox: o.estimado })}` : '');
            const items = k.items.map((o) => linea(o, `${o.estado === 'vencido' ? 'venció el ' : 'el '}${M.partes(o.fecha)[2]}${parteDe(o)}`));
            for (const t of k.tarjetas) {
                if (t.pendiente) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">estado de cuenta por anotar</span></span><span>Por confirmar</span></li>`);
                // V2-29 #1: vence después del ingreso, pero ya baja el libre; se dice cuándo vence.
                if (t.porPagarEstado) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">estado de cuenta, ${t.ult.vence < st.hoy ? 'venció' : 'vence'} el ${M.partes(t.ult.vence)[2]} ${M.MESES_CORTOS[M.partes(t.ult.vence)[1] - 1]}</span></span><span>${dinero(t.porPagarEstado)}</span></li>`);
                const compras = t.comprasNetas - t.reservado;
                if (compras > 0) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">compras nuevas, se pagan el ${M.partes(t.venceCompras)[2]} ${M.MESES_CORTOS[M.partes(t.venceCompras)[1] - 1]}</span></span><span>${dinero(compras)}</span></li>`);
            }
            // V2-41: lo reservado se ve en una línea (y dentro de cada pago).
            const reservados = [
                ...k.reservados.map((o) => linea(o, `vence el ${M.fechaCorta(o.fecha)}${parteDe(o)}`)),
                ...k.reservasProxima.map((r) => filaReserva(r)),
                ...k.tarjetas.filter((t) => t.reservado).map((t) => `<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">de tu ahorro ${esc(t.reservas.map((r) => r.de).join(', '))}, para tu pago del ${esc(P.diaPago(t, t.venceCompras))}</span></span><span>${dinero(t.reservado)}</span></li>`),
            ];
            const reservado = k.reservadoPagos + k.reservadoProxima + k.reservadoTarjetas;
            const noCuenta = [];
            if (hz.ingreso && !hz.esHoy && !hz.atrasada) noCuenta.push(`Tu ${esc(P.nombreIngreso(hz))} del ${M.partes(hz.fecha)[2]} (${dinero(hz.ocurrencia.monto, { aprox: true })}): suma cuando llegue.`);
            if (hz.esHoy) noCuenta.push(`Tu ${esc(P.nombreIngreso(hz))} de hoy: suma cuando confirmes que te cayó.`);
            for (const o of hz.atrasadas || []) noCuenta.push(`Tu ${esc(o.ingreso.nombre.toLowerCase())} del ${M.fechaCorta(o.fecha)}: falta confirmar si llegó.`);
            for (const i of st.ingresos.filter((x) => !x.principal && x.activo !== false)) {
                const o = M.ocurrenciasIngreso(st, i, st.hoy, M.sumarDias(st.hoy, 400)).find((x) => x.estado === 'esperado' || x.estado === 'hoy');
                if (o) noCuenta.push(`${esc(i.nombre)} (${dinero(o.monto, { aprox: o.aprox })}, ${M.fechaCorta(o.fecha)}): suma cuando llegue.`);
            }
            for (const t of k.tarjetas.filter((x) => x.cupoLibre !== null)) noCuenta.push(`El cupo de ${esc(t.t.nombre)} (${dinero(t.cupoLibre)} disponibles): no es tu dinero, nunca suma.`);
            const fila = (signo, titulo, monto, ir, sub = '', extra = '', fk = ir) => `<li class="d-fila"><button type="button" class="d-b" data-a="desgloseIr" data-ir="${ir}" data-fk="d-${fk}"><span class="d-signo" aria-hidden="true">${signo}</span><span class="d-t">${titulo}${sub ? `<span class="d-sub">${sub}</span>` : ''}</span><span class="d-m">${monto}</span>${icon('chevron-right', 'ico-xs')}</button>${extra}</li>`;
            const x = k.proxima;
            const proxima = x && (x.entra || x.pagos) ? `<div class="d-prox"><p class="campo-l">${esc(P.tituloPeriodo(x, hz))}</p><p class="txt">${esc(M.capital(P.lineaPeriodo(x)))}.${P.incluyePeriodo(x) ? ` ${esc(M.capital(P.incluyePeriodo(x)))}.` : ''}</p>${k.libre > 0 && hz.ingreso ? `<button type="button" class="link link--start" data-a="hoja" data-hoja="pasarProxima" data-fk="d-pasar">${icon('calendar-days', 'ico-s')}¿Pasas algo de lo que te sobra a la próxima?</button>` : ''}</div>` : '';
            return {
                titulo: '¿De dónde sale tu libre?',
                cuerpo: `<ol class="desglose">
                    ${fila('', 'Tienes', dinero(k.tienes), 'midinero', esc(st.lugares.map((l) => l.nombre).join(' + ')))}
                    ${k.apartado ? fila('−', 'Ahorros', dinero(k.apartado), 'apartados', esc(st.apartados.map((a) => a.nombre).join(', '))) : ''}
                    ${fila('−', `Por pagar ${antes}`, dinero(k.porPagar + k.enTarjetas - k.reservadoTarjetas), 'pagos', items.length ? 'Con lo que ya tienes' : 'Nada vence antes', items.length ? `<ul class="d-items">${items.join('')}</ul>` : '')}
                    ${reservado ? fila('−', 'Reservado para pagos', dinero(reservado), 'pagos', 'Lo que decidiste pagar con lo que tienes, aunque venza después', `<ul class="d-items">${reservados.join('')}</ul>`, 'reservado') : ''}
                    <li class="d-total"><span class="d-signo" aria-hidden="true">=</span><span class="d-t">Libre</span><span class="d-m">${dinero(k.libre)}</span></li>
                </ol>
                ${k.faltaPagos > 0 || k.sinCubrir > 0 ? `<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p><strong>${esc(P.textoCero(k))}.</strong> Tu libre queda en $0.00, nunca en negativo.</p></div>` : ''}
                ${k.porDia !== null ? `<p class="txt">Son unos ${dinero(k.porDia, { aprox: true })} por día durante ${plural(k.hz.dias, 'día', 'días')}.</p>` : ''}
                ${proxima}
                ${noCuenta.length ? `<div class="nota nota--info" role="note">${icon('info')}<div><p><strong>Todavía no cuenta</strong></p><ul class="mini-lista">${noCuenta.map((y) => `<li>${y}</li>`).join('')}</ul></div></div>` : ''}`,
                pie: pie1('cerrarHoja', 'Entendido', 'desglose-ok'),
            };
        },
    };
    P.acciones.desgloseIr = (d) => {
        P.cerrarHoja({ sinFoco: true });
        if (d.ir === 'apartados') P.acciones.irAhorros();
        else P.irTab(d.ir);
    };

    /** Lo guardado para un próximo día de pago: pasado a la próxima (se puede quitar) o lo que llegó antes de su quincena (se puede usar desde ya). */
    function filaReserva(r) {
        if (r.adelanto) {
            const ing = r.adelanto.ingreso;
            return `<li class="d-res"><span>${emo(ing.emoji, 16)} ${esc(ing.nombre)} <span class="d-sub">llegó antes: es de ${esc(P.etiquetaFuente(r.para))}</span><button type="button" class="link link--inline" data-a="usarAdelanto" data-id="${ing.id}" data-fecha="${r.adelanto.fecha}" data-fk="usar-adelanto-${ing.id}">Usarlo desde ya</button></span><span>${dinero(r.monto)}</span></li>`;
        }
        return `<li class="d-res"><span>${icon('calendar-days', 'ico-xs')} Para ${esc(P.etiquetaFuente(r.para))} <span class="d-sub">lo pasaste de lo que tienes</span><button type="button" class="link link--inline" data-a="quitarReserva" data-id="${esc(r.id)}" data-fk="quitar-${esc(r.id)}">Quitar</button></span><span>${dinero(r.monto)}</span></li>`;
    }
    P.filaReserva = filaReserva;
    /** Revisión v2.3: lo que llegó antes de su quincena se puede usar desde ya (la persona decide). */
    P.acciones.usarAdelanto = (d) => {
        const ing = M.ingreso(P.st, d.id);
        P.cambiar((s) => {
            const l = M.ingreso(s, d.id).llegadas[d.fecha];
            if (l) l.usarYa = true;
        }, { aviso: `Listo: lo ${P.deQuien(ing)} ya cuenta en tu libre de hoy`, claves: ['guardado:usarAdelanto'] });
    };

    // ================================================================== MENÚ DE LA PERSONA
    H.menu = {
        html() {
            const st = P.st;
            const p = M.principal(st);
            const fila = (ic, t, s, a, extra = '') => `<li class="fila"><button type="button" class="fila-main" data-a="${a}" ${extra} data-fk="menu-${ic}"><span class="emo emo--ico" aria-hidden="true">${icon(ic)}</span><span class="fila-txt"><span class="fila-t">${t}</span>${s ? `<span class="fila-s">${s}</span>` : ''}</span>${icon('chevron-right', 'ico-xs')}</button></li>`;
            return {
                titulo: 'Tu cuenta',
                cuerpo: `<div class="menu-yo"><span class="avatar" aria-hidden="true">${esc((st.nombre || 'T').charAt(0))}</span><div><p class="fila-t">${esc(st.nombre || 'Tú')}</p><p class="fila-s">${esc(st.espacio)}</p></div></div>
                    <ul class="lista card">
                        ${fila('users', 'Tu espacio', esc(st.espacio), 'menuIr', 'data-ir="espacio"')}
                        ${fila('calendar-clock', 'Cómo te pagan', p ? esc(p.nombre) : 'Varía', 'menuIr', p ? `data-ir="ingreso" data-id="${p.id}"` : 'data-ir="pagos"')}
                        ${fila('wallet', 'Cuentas y medios de pago', esc(st.medios.filter((m) => !m.oculto).map((m) => m.nombre).join(' · ')), 'menuIr', 'data-ir="lugares"')}
                        ${fila('bell', 'Avisos', P.modo === 'uso' ? 'Se muestran al abrir la app' : 'Notificación de la app y correo', 'menuIr', 'data-ir="avisos"')}
                        ${fila('book-open', 'Aprende', 'Consejos cortos', 'menuIr', 'data-ir="aprende"')}
                        ${fila('palette', 'Apariencia', 'Serena o Ancla, claro u oscuro', 'menuIr', 'data-ir="apariencia"')}
                    </ul>
                    ${P.modos ? P.modos.menuExtra(fila) : ''}`,
            };
        },
    };
    P.acciones.menuIr = (d) => {
        if (d.ir === 'apariencia') {
            P.ui.hoja = null;
            P.abrirHoja('apariencia');
            return;
        }
        P.cerrarHoja({ sinFoco: true });
        if (d.ir === 'midinero' || d.ir === 'pagos') P.irTab(d.ir);
        else if (P.modos && P.modos.irMenu(d.ir)) return;
        else P.abrir(d.ir, d.id);
    };
    H.apariencia = {
        html() {
            const temas = [['serena-claro', 'Serena · claro'], ['serena-oscuro', 'Serena · oscuro'], ['ancla-claro', 'Ancla · claro'], ['ancla-oscuro', 'Ancla · oscuro']];
            return { titulo: 'Apariencia', cuerpo: `<div class="chips chips--col" role="group" aria-label="Tema">${temas.map(([v, t]) => `<button type="button" class="chip" aria-pressed="${P.tema === v}" data-a="tema" data-v="${v}" data-fk="tema-${v}">${P.tema === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('')}</div>`, pie: pie1('cerrarHoja', 'Listo') };
        },
    };
    P.acciones.tema = (d) => {
        P.aplicarTema(d.v);
        try {
            window.parent.postMessage({ fuente: 'pamplanea-proto', tipo: 'tema', tema: d.v }, '*');
        } catch {
            /* sin guía */
        }
        P.render();
    };

    // ================================================================== PAGADO (pago fijo, variable o tarjeta)
    P.acciones.pagado = (d) => {
        const st = P.st;
        if (d.tipo === 'pago') {
            const p = M.pago(st, d.id);
            const o = M.ocurrenciasPago(st, p, d.fecha, d.fecha)[0];
            // V2-29 #8: monto fijo y a tiempo se guarda sin preguntar: «Pagado con … · Cambiar · Deshacer».
            if (!p.estimado && o && o.estado === 'pendiente') {
                const m = M.medio(st, p.medio);
                P.cambiar((s) => P.marcarPagado(s, p.id, d.fecha, { monto: p.monto, medio: p.medio, fecha: s.hoy }), { aviso: `Pagado con ${m ? m.nombre : 'tu medio'}`, cambiar: (r) => r.id, claves: ['guardado:pagado', 'guardado:pagado:' + claveNombre(p.nombre)] });
                return;
            }
        }
        P.abrirHoja('pagado', { tipoPago: d.tipo, id: d.id, fecha: d.fecha });
    };
    H.pagado = {
        iniciar(h) {
            const st = P.st;
            if (h.tipoPago === 'tarjeta') {
                const info = M.tarjetaInfo(st, M.tarjeta(st, h.id));
                h.monto = M.montoCampo(info.porPagarEstado + info.reservado);
                h.lugar = (st.lugares.find((l) => l.tipo === 'banco') || st.lugares[0]).id;
                h.cuando = st.hoy;
            } else {
                const p = M.pago(st, h.id);
                const o = M.ocurrenciasPago(st, p, h.fecha, h.fecha)[0];
                h.monto = p.estimado ? '' : M.montoCampo(o.monto);
                h.medio = p.medio;
                h.cuando = o.estado === 'vencido' ? o.fecha : st.hoy;
                h.vencido = o.estado === 'vencido';
            }
        },
        foco: (h) => (h.tipoPago === 'pago' && M.pago(P.st, h.id).estimado ? '#f-monto' : '#hoja-t'),
        html(h) {
            const st = P.st;
            if (h.tipoPago === 'tarjeta') {
                const t = M.tarjeta(st, h.id);
                const bancos = st.lugares.filter((l) => l.tipo === 'banco');
                return {
                    titulo: `Pagar ${esc(t.nombre)}`,
                    cuerpo: `${campoMonto(h, { label: '¿Cuánto vas a pagar?', valor: h.monto })}
                        ${bancos.length > 1 ? opciones(h, { campo: 'lugar', label: '¿Desde cuál cuenta?', lista: lugares(st), valor: h.lugar }) : `<p class="txt">Desde ${esc(M.lugar(st, h.lugar).nombre)}.</p>`}
                        ${campoFecha(h, 'cuando', h.cuando, { label: '¿Cuándo?' })}
                        <div class="nota nota--info" role="note">${icon('info')}<p>Pagar la tarjeta mueve dinero de tu banco a la tarjeta: <strong>no es un gasto nuevo</strong> y tu libre no cambia, porque ya estaba contado.</p></div>`,
                    pie: pie2('pagadoGuardar', 'Guardar'),
                };
            }
            const p = M.pago(st, h.id);
            const m = M.medio(st, h.medio);
            return {
                titulo: `${esc(p.nombre)} · ${h.vencido ? 'venció' : 'vence'} el ${M.partes(h.fecha)[2]} ${M.MESES_CORTOS[M.partes(h.fecha)[1] - 1]}`,
                cuerpo: `${campoMonto(h, { label: '¿Cuánto pagaste?', valor: h.monto, ayuda: p.estimado ? `Era un estimado de ${dinero(p.monto, { aprox: true })}. Escribe lo que dice tu recibo.` : '', errorTexto: 'Escribe cuánto pagaste' })}
                    ${opciones(h, { campo: 'medio', label: 'Pagado con', lista: medios(st).map((x) => ({ ...x, s: x.v === p.medio ? 'el de siempre' : '' })), valor: h.medio })}
                    ${campoFecha(h, 'cuando', h.cuando, { label: h.vencido ? '¿Cuándo lo pagaste?' : '¿Cuándo?', extra: h.vencido ? h.fecha : null })}
                    <div id="pagado-nota">${m && m.lugar ? notaCuadre(st, h.cuando, m.lugar, contadoDe(st, p.id, h.fecha)) : ''}</div>`,
                pie: pie2('pagadoGuardar', 'Guardar'),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.pagadoGuardar = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        const st = P.st;
        P.ui.hoja = null;
        if (h.tipoPago === 'tarjeta') {
            const t = M.tarjeta(st, h.id);
            P.cambiar((s) => P.pagarTarjeta(s, h.id, { monto, lugar: h.lugar, fecha: h.cuando }), { aviso: `${t.nombre}: pago guardado`, claves: ['guardado:pagoTarjeta'] });
        } else {
            const p = M.pago(st, h.id);
            const m = M.medio(st, h.medio);
            const l = m && m.lugar ? M.lugar(st, m.lugar) : null;
            const sube = l && l.cuadre && h.cuando < l.cuadre.fecha ? contadoDe(st, p.id, h.fecha) : null;
            P.cambiar((s) => P.marcarPagado(s, h.id, h.fecha, { monto, medio: h.medio, fecha: h.cuando }), { aviso: sube ? `Pagado. Tu libre sube ${dinero(sube)}` : `Pagado con ${m ? m.nombre : 'tu medio'}`, cambiar: (r) => r.id, claves: ['guardado:pagado', 'guardado:pagado:' + claveNombre(p.nombre)] });
        }
        const el = h.disparador && document.querySelector(`[data-fk="${CSS.escape(h.disparador)}"]`);
        (el || document.querySelector('#pantalla h1'))?.focus({ preventScroll: true });
    };
    P.acciones.saltar = (d) => {
        const p = M.pago(P.st, d.id);
        P.cambiar((s) => {
            M.pago(s, d.id).hechos[d.fecha] = { estado: 'saltado' };
        }, { aviso: `${p.nombre}: saltado este mes`, claves: ['guardado:saltar'] });
    };
    // ================================================================== «LO PAGAS CON» (V2-34)
    /** Lo que te queda de un día de pago (proyección) o de lo que tienes ahora. */
    const quedaEn = (k, f) => {
        if (f === 'ahora') return `Lo reservamos desde hoy · hoy te quedan ${dinero(k.libre)} libres`;
        const x = k.periodos.find((y) => y.clave === f);
        return x ? `Ese día te caen ${dinero(x.entra, { aprox: true })} · ${x.quedan >= 0 ? `te quedarían ${dinero(x.quedan, { aprox: true })}` : `te faltarían ${dinero(-x.quedan, { aprox: true })}`}` : '';
    };
    H.pagarCon = {
        iniciar(h) {
            const st = P.st;
            const k = P.calc();
            const p = M.pago(st, h.id);
            const o = M.ocurrenciasPago(st, p, h.fecha, h.fecha)[0];
            h.total = o ? o.monto : p.monto;
            h.estimado = !!(o && o.estimado);
            h.fuentes = M.fuentesPara(st, h.fecha, k.hz);
            h.def = h.fuentes.at(-1);
            // Lo que ya está fundado (de antes o de hoy) se ve como «lo que tienes ahora».
            const actual = M.asignacion(st, p, h.fecha, h.total, k.hz).map((x) => ({ de: M.esFundado(st, x.de) ? 'ahora' : x.de, monto: x.monto }));
            h.partes = Object.fromEntries(h.fuentes.map((f) => [f, M.montoCampo(M.suma(actual.filter((x) => x.de === f), (x) => x.monto))]));
            const usadas = actual.filter((x) => x.monto > 0);
            h.modo = usadas.length > 1 ? 'repartir' : 'uno:' + (usadas[0] ? usadas[0].de : h.def);
            h.siempre = !!p.pagarCon;
            h.parejo = !!(p.pagarCon && p.pagarCon.modo === 'parejo');
        },
        html(h) {
            const st = P.st;
            const k = P.calc();
            const p = M.pago(st, h.id);
            const repetido = p.frecuencia !== 'unico' && !!M.principal(st);
            const etiqueta = (f) => (f === 'ahora' ? 'Con lo que tienes ahora' : M.capital('con ' + P.etiquetaFuente(f)));
            const op = (v, t, s) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.modo === v}" data-a="valor" data-campo="modo" data-v="${v}" data-fk="pc-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${esc(t)}</span>${s ? `<span class="fila-s">${esc(s)}</span>` : ''}</span></button>`;
            const opciones1 = [...h.fuentes].reverse().map((f) => op('uno:' + f, etiqueta(f) + (f === h.def ? ' (lo normal)' : ''), quedaEn(k, f))).join('');
            const repartir = h.fuentes.length > 1 ? op('repartir', 'Repartirlo', 'Tú eliges cuánto de cada uno') : '';
            const suma = M.suma(h.fuentes, (f) => M.leerMonto(h.partes[f]) || 0);
            const resto = h.total - suma;
            const camposRepartir = h.modo === 'repartir' ? `<div class="pc-rep">${h.fuentes.map((f) => campoMonto(h, { campo: 'parte:' + f, label: etiqueta(f), valor: h.partes[f], id: 'f-parte-' + f })).join('')}
                <div class="chips"><button type="button" class="chip" data-a="valor" data-campo="parejo" data-v="si" data-fk="pc-parejo">Repartir parejo</button></div>
                <p class="fila-s" id="pc-suma" aria-live="polite">${resto === 0 ? `Suma ${dinero(h.total)}: cuadra.` : resto > 0 ? `Faltan ${dinero(resto)}: van ${P.etiquetaFuente(h.def) === 'lo que tienes ahora' ? 'con lo que tienes' : 'con ' + esc(P.etiquetaFuente(h.def))}.` : `Te pasaste ${dinero(-resto)} de ${dinero(h.total)}.`}</p></div>` : '';
            const reglaPosible = repetido && (h.modo === 'repartir' ? h.parejo : h.modo === 'uno:' + h.def || h.modo === 'uno:' + antesDeDef(st, h));
            return {
                titulo: `¿Con qué pagas ${esc(P.conArticulo(p.nombre))}?`,
                cuerpo: `<p class="txt">Vence el ${esc(M.fechaLarga(h.fecha))} · ${dinero(h.total, { aprox: h.estimado })}.</p><p class="fila-s">Si lo pagas con lo que ya tienes, queda reservado desde hoy.</p>
                    <div class="opciones-grandes" role="radiogroup" aria-label="Con qué lo pagas">${opciones1}${repartir}</div>
                    ${camposRepartir}
                    ${reglaPosible ? `<div class="chips"><button type="button" class="chip" aria-pressed="${h.siempre}" data-a="valor" data-campo="siempre" data-v="${!h.siempre}" data-fk="pc-siempre">${h.siempre ? icon('check', 'ico-xs') : ''}Hacerlo así cada vez</button></div>` : ''}
                    ${error(h, 'parte', 'Lo repartido no puede pasar del total')}`,
                pie: pie2('pagarConOk', 'Guardar', { fk: 'pc-ok' }),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'siempre') h.siempre = v === 'true';
            else if (campo === 'parejo') {
                // Partes iguales entre lo que tienes ahora y los días de pago hasta que vence.
                const n = h.fuentes.length;
                const cuota = Math.floor(h.total / n);
                h.fuentes.forEach((f, i) => (h.partes[f] = M.montoCampo(i === n - 1 ? h.total - cuota * (n - 1) : cuota)));
                h.parejo = true;
            } else h[campo] = v;
        },
        alCampo(h, campo, el) {
            if (campo.startsWith('parte:')) {
                h.partes[campo.slice(6)] = el.value;
                h.parejo = false;
            } else h[campo] = el.value;
        },
        vivo(h) {
            const resto = h.total - M.suma(h.fuentes, (f) => M.leerMonto(h.partes[f]) || 0);
            const el = document.getElementById('pc-suma');
            if (el) el.textContent = resto === 0 ? `Suma ${dinero(h.total)}: cuadra.` : resto > 0 ? `Faltan ${dinero(resto)}: van con ${P.etiquetaFuente(h.def)}.` : `Te pasaste ${dinero(-resto)} de ${dinero(h.total)}.`;
        },
    };
    /** El día de pago justo antes del de por defecto, como fuente («la quincena anterior»). */
    function antesDeDef(st, h) {
        if (!h.def || h.def === 'ahora' || h.def === 'despues') return null;
        const antes = M.corteAntes(st, h.def);
        return antes && M.fundado(st, antes) ? 'ahora' : antes;
    }
    P.acciones.pagarConOk = () => {
        const h = P.ui.hoja;
        const st = P.st;
        const repartido = h.fuentes.map((f) => ({ de: f, monto: M.leerMonto(h.partes[f]) || 0 }));
        if (h.modo === 'repartir' && M.suma(repartido, (x) => x.monto) > h.total) {
            validar(h, ['parte']);
            return;
        }
        const p = M.pago(st, h.id);
        const k = P.calc();
        const libreAntes = k.libre;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const x = M.pago(s, h.id);
                const asign = { ...(x.asignaciones || {}) };
                delete asign[h.fecha];
                const elegido = h.modo.startsWith('uno:') ? h.modo.slice(4) : null;
                if (h.siempre && elegido === h.def) delete x.pagarCon;
                else if (h.siempre && elegido && elegido === antesDeDef(s, h)) x.pagarCon = { modo: 'antes' };
                else if (h.siempre && h.modo === 'repartir' && h.parejo) x.pagarCon = { modo: 'parejo', desde: M.horizonte(s).inicioPeriodo || s.hoy };
                else {
                    if (!h.siempre && x.pagarCon && elegido === h.def) asign[h.fecha] = [{ de: h.def, monto: h.total }];
                    else if (elegido && elegido !== h.def) asign[h.fecha] = [{ de: elegido, monto: h.total }];
                    else if (h.modo === 'repartir') asign[h.fecha] = repartido.filter((y) => y.monto > 0);
                }
                x.asignaciones = asign;
            },
            {
                aviso: () => {
                    const dif = P.calc().libre - libreAntes;
                    return dif < 0 ? `Listo. Reservas ${dinero(-dif)} desde hoy` : dif > 0 ? `Listo. Tu libre sube ${dinero(dif)}` : 'Listo';
                },
                claves: ['guardado:pagarCon', 'guardado:pagarCon:' + (h.modo === 'repartir' ? 'repartir' : 'uno')],
            },
        );
        P.emitir('pagarCon:' + p.id);
    };

    // ================================================================== SUGERENCIA: «¿RESERVAS ALGO DE ANTES?» (V2-34)
    H.reservar = {
        iniciar(h) {
            const k = P.calc();
            const per = k.periodos.find((x) => x.clave === h.id);
            h.periodo = h.id;
            h.fuente = h.fecha || 'ahora';
            h.monto = M.montoCampo(per ? per.deficit : 0);
        },
        foco: () => '#f-monto',
        html(h) {
            const k = P.calc();
            const per = k.periodos.find((x) => x.clave === h.periodo);
            if (!per) return { titulo: 'Listo', cuerpo: '<p class="txt">Ya no hace falta reservar nada para ese día de pago.</p>', pie: pie1('cerrarHoja', 'Cerrar') };
            const fuentes = ['ahora', ...k.periodos.filter((x) => x.clave < per.clave).map((x) => x.clave)];
            const lista = fuentes.map((f) => ({ v: f, t: f === 'ahora' ? 'De lo que tienes ahora' : M.capital('de ' + P.etiquetaFuente(f)), s: f === 'ahora' ? `hoy: ${dinero(k.libre)} libres` : `te quedarían ${dinero(k.periodos.find((x) => x.clave === f).quedan, { aprox: true })}` }));
            const monto = M.leerMonto(h.monto);
            const pagos = [...new Set(per.partes.map((x) => x.pago.nombre))];
            return {
                titulo: '¿Cuánto reservas?',
                cuerpo: `<p class="txt">Con ${esc(P.etiquetaFuente(per.clave))} te faltarían ${dinero(per.deficit, { aprox: true })} para ${esc(P.lista(pagos.slice(0, 3).map((n) => P.conArticulo(n))))}${pagos.length > 3 ? ' y más' : ''}.</p>
                    ${campoMonto(h, { label: '¿Cuánto?', valor: h.monto, errorTexto: 'Escribe cuánto reservas' })}
                    ${opciones(h, { campo: 'fuente', label: '¿De cuál dinero?', lista, valor: h.fuente, columnas: true })}
                    ${h.fuente === 'ahora' && monto > k.libre ? `<div class="nota nota--ambar" role="note">${icon('info')}<p>Hoy te quedan ${dinero(k.libre)} libres: si reservas más, te faltaría para lo de estos días.</p></div>` : ''}
                    <p class="fila-s">El dinero no se mueve de lugar: solo queda apartado para ese pago, y lo ves dentro del pago («Reservando…»). Puedes cambiarlo cuando quieras.</p>`,
                pie: pie2('reservarOk', 'Reservar', { fk: 'reservar-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.reservarOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        P.ui.hoja = null;
        P.cambiar((s) => P.reservarDeficit(s, h.periodo, h.fuente, monto), { aviso: (m) => `Reservaste ${dinero(m)} ${h.fuente === 'ahora' ? 'de lo que tienes ahora' : 'de ' + P.etiquetaFuente(h.fuente)}`, claves: ['guardado:reservar', 'guardado:reservar:' + (h.fuente === 'ahora' ? 'ahora' : 'despues')] });
    };

    // ================================================================== V2-35: «¿PASAS ALGO DE LO QUE TE SOBRA A LA PRÓXIMA?»
    H.pasarProxima = {
        iniciar(h) {
            const k = P.calc();
            h.para = k.proxima ? k.proxima.clave : null;
            h.monto = k.proxima && k.proxima.deficit > 0 ? M.montoCampo(Math.min(k.libre, k.proxima.deficit)) : '';
        },
        foco: () => '#f-monto',
        html(h) {
            const k = P.calc();
            const x = k.periodos.find((y) => y.clave === h.para);
            if (!x) return { titulo: 'Listo', cuerpo: '', pie: pie1('cerrarHoja', 'Cerrar') };
            const monto = M.leerMonto(h.monto);
            return {
                titulo: 'Pasar a la próxima',
                cuerpo: `<p class="txt">Lo que guardes queda para ${esc(P.etiquetaFuente(x.clave))}: no se mueve de lugar y ya no cuenta en tu libre de hoy.</p>
                    ${campoMonto(h, { label: '¿Cuánto pasas?', valor: h.monto, ayuda: `Hoy te quedan ${dinero(k.libre)} libres.`, errorTexto: 'Escribe cuánto pasas' })}
                    <div id="pasar-vivo" aria-live="polite">${vivoPasar(h, k, x)}</div>`,
                pie: pie2('pasarProximaOk', 'Guardar', { fk: 'pasar-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
        vivo(h) {
            const k = P.calc();
            const x = k.periodos.find((y) => y.clave === h.para);
            if (x) region('pasar-vivo', vivoPasar(h, k, x));
        },
    };
    function vivoPasar(h, k, x) {
        const monto = M.leerMonto(h.monto) || 0;
        return `<div class="nota nota--info" role="note">${icon('calendar-days')}<p><strong>${esc(P.tituloPeriodo(x, k.hz))}:</strong> ${esc(P.lineaPeriodo({ ...x, entra: x.entra + monto, quedan: x.quedan + monto }))}.</p></div>${monto > k.libre ? `<div class="nota nota--ambar" role="note">${icon('info')}<p>Es más de lo que te queda libre hoy (${dinero(k.libre)}).</p></div>` : ''}`;
    }
    P.acciones.pasarProximaOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        P.ui.hoja = null;
        P.cambiar((s) => P.pasarProxima(s, h.para, monto), { aviso: `Guardaste ${dinero(monto)} para ${P.etiquetaFuente(h.para)}`, claves: ['guardado:pasarProxima'] });
        if (P.ui.stack.at(-1)?.tipo === 'reparte') P.render({ foco: '#rep-prox' });
    };
    P.acciones.quitarReserva = (d) => {
        P.cambiar((s) => {
            s.reservas = (s.reservas || []).filter((r) => r.id !== d.id);
        }, { aviso: 'Quitamos lo que habías pasado a la próxima', claves: ['guardado:quitarReserva'] });
    };

    // ================================================================== V2-42: LO QUE NECESITA ATENCIÓN
    H.atencion = {
        html() {
            const items = P.atencion(P.calc());
            const cls = (n) => (n === 'rojo' ? 'nota--atencion' : n === 'ambar' ? 'nota--ambar' : 'nota--info');
            return {
                titulo: items.length ? (items.every((x) => x.pago) ? `${items.length} pagos necesitan atención` : `${items.length} avisos para hoy`) : 'Todo al día',
                cuerpo: `${P.modos && P.modos.notaAvisos ? P.modos.notaAvisos() : ''}${items.length ? `<ul class="aten-lista">${items.map((x) => `<li class="nota ${cls(x.nivel)}">${icon(x.nivel === 'info' ? 'bell' : 'triangle-alert')}<div><p class="nota-t">${esc(x.titulo)}</p>${x.texto ? `<p>${esc(x.texto)}</p>` : ''}<div class="nota-acc">${x.acciones}</div></div></li>`).join('')}</ul>` : '<p class="vacio">No hay nada pendiente por hoy.</p>'}`,
                pie: pie1('cerrarHoja', 'Listo', 'aten-listo'),
            };
        },
    };

    H.yaNoAplica = {
        html(h) {
            const p = M.pago(P.st, h.id);
            return { titulo: `¿Ya no aplica «${esc(p.nombre)}»?`, cuerpo: `<p class="txt">Deja de aparecer en Pagos y de contar en tu libre. Su historial se queda en Mes.</p>`, pie: pie2('yaNoAplicaOk', 'Ya no aplica', { peligro: true }) };
        },
    };
    P.acciones.yaNoAplicaOk = () => {
        const h = P.ui.hoja;
        const p = M.pago(P.st, h.id);
        P.ui.hoja = null;
        P.cambiar((s) => {
            const x = M.pago(s, h.id);
            x.activo = false;
            x.hasta = s.hoy;
        }, { aviso: `${p.nombre} ya no aplica`, claves: ['guardado:yaNoAplica'] });
        P.atras();
    };
    H.deuda = {
        iniciar(h) {
            h.monto = M.montoCampo(M.pago(P.st, h.id).deuda.debe);
        },
        html(h) {
            return { titulo: 'Lo que debes', cuerpo: `${campoMonto(h, { label: '¿Cuánto debes más o menos?', valor: h.monto, ayuda: 'Es opcional. Lo ves en tu recibo o en la app de la tienda.' })}`, pie: pie2('deudaOk', 'Guardar') };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.deudaOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto !== null ? [] : ['monto'])) return;
        P.ui.hoja = null;
        P.cambiar((s) => {
            M.pago(s, h.id).deuda.debe = monto;
        }, { aviso: 'Guardado' });
    };

    // ================================================================== CUADRAR Y MOVER
    H.cuadrar = {
        iniciar(h) {
            const st = P.st;
            h.lugar = h.id || (st.lugares.length === 1 ? st.lugares[0].id : null);
            h.monto = '';
        },
        foco: (h) => (h.lugar ? '#f-monto' : '#hoja-t'),
        html(h) {
            const st = P.st;
            return {
                titulo: 'Cuadrar',
                cuerpo: `<p class="txt">Dinos cuánto tienes de verdad. Desde ahora tu saldo parte de este número.</p>
                    ${st.lugares.length > 1 ? opciones(h, { campo: 'lugar', label: '¿Dónde?', lista: lugares(st), valor: h.lugar, errorTexto: 'Elige dónde' }) : ''}
                    ${campoMonto(h, { label: '¿Cuánto tienes ahora?', valor: h.monto, errorTexto: 'Escribe cuánto tienes, aunque sea $0' })}
                    <div id="cuadrar-vivo" aria-live="polite">${vivoCuadre(st, h)}</div>`,
                pie: pie2('cuadrarOk', 'Cuadrar'),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
        vivo(h) {
            region('cuadrar-vivo', vivoCuadre(P.st, h));
        },
    };
    function vivoCuadre(st, h) {
        if (!h.lugar) return '';
        const esperado = M.saldoLugar(st, h.lugar);
        const monto = M.leerMonto(h.monto);
        const l = M.lugar(st, h.lugar);
        if (monto === null) return `<p class="fila-s">Según lo anotado tienes ${dinero(esperado)} en ${esc(l.nombre)}.</p>`;
        const dif = monto - esperado;
        return `<div class="nota nota--info" role="note">${icon('scale')}<p>Según lo anotado: ${dinero(esperado)}. ${dif === 0 ? '<strong>Cuadra exacto.</strong>' : `<strong>${dinero(Math.abs(dif))} ${dif < 0 ? 'salieron' : 'entraron'} sin detalle.</strong> No hace falta explicarlos.`}</p></div>`;
    }
    P.acciones.cuadrarOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const faltan = [...(h.lugar ? [] : ['lugar']), ...(monto !== null ? [] : ['monto'])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        P.cambiar((s) => P.cuadrar(s, h.lugar, monto), { aviso: `${M.lugar(P.st, h.lugar).nombre}: cuadrado`, claves: ['guardado:cuadre'] });
    };
    H.mover = {
        iniciar(h) {
            const st = P.st;
            h.de = h.id || (st.lugares.find((l) => l.tipo === 'banco') || st.lugares[0]).id;
            h.a = (st.lugares.find((l) => l.id !== h.de) || {}).id || null;
            h.monto = '';
        },
        foco: () => '#f-monto',
        html(h) {
            const st = P.st;
            const destinos = [...lugares(st), ...st.tarjetas.map((t) => ({ v: 'tarjeta:' + t.id, t: 'Pagar ' + t.nombre, e: t.emoji }))].filter((x) => x.v !== h.de);
            return {
                titulo: 'Mover dinero',
                cuerpo: `${campoMonto(h, { label: '¿Cuánto?', valor: h.monto })}${opciones(h, { campo: 'de', label: '¿De dónde?', lista: lugares(st), valor: h.de })}${opciones(h, { campo: 'a', label: '¿A dónde?', lista: destinos, valor: h.a, errorTexto: 'Elige a dónde' })}
                    <p class="fila-s">Mover no cambia cuánto tienes: solo dónde está.</p>`,
                pie: pie2('moverOk', 'Mover'),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.moverOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const faltan = [...(monto ? [] : ['monto']), ...(h.a && h.a !== h.de ? [] : ['a'])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        if (String(h.a).startsWith('tarjeta:')) P.cambiar((s) => P.pagarTarjeta(s, h.a.split(':')[1], { monto, lugar: h.de, fecha: s.hoy }), { aviso: 'Pago de tarjeta guardado', claves: ['guardado:pagoTarjeta'] });
        else P.cambiar((s) => P.registrar(s, { tipo: 'mover', fecha: s.hoy, monto, de: h.de, a: h.a, nombre: 'Mover dinero', nuevo: true }), { aviso: 'Movido', claves: ['guardado:mover'] });
    };

    // ================================================================== APARTADOS
    H.apartar = {
        iniciar(h) {
            h.apartado = h.id || null;
            h.monto = '';
            h.nuevo = '';
        },
        foco: () => '#f-monto',
        html(h) {
            const st = P.st;
            const k = P.calc();
            return {
                titulo: h.id ? `Ahorrar en ${esc(M.apartado(st, h.id).nombre)}` : 'Ahorrar',
                cuerpo: `${campoMonto(h, { label: '¿Cuánto quieres ahorrar?', valor: h.monto, ayuda: `Fuera de ahorros tienes ${dinero(Math.max(0, k.tienes - k.apartado))}.` })}
                    ${h.id ? '' : opciones(h, { campo: 'apartado', label: '¿En cuál?', lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), valor: h.apartado, errorTexto: 'Elige un ahorro o crea uno' }) + campoTexto(h, { campo: 'nuevo', label: 'O crea uno nuevo', valor: h.nuevo, placeholder: 'Ej. Regalo de mamá' })}
                    <p class="fila-s">Tus ahorros siguen en tu banco o efectivo; solo les pones nombre. Si es para un pago (luz, colegio), agrégalo en Pagos.</p>`,
                pie: pie2('apartarOk', 'Ahorrar'),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
            if (campo === 'nuevo' && el.value.trim()) h.apartado = null;
        },
    };
    P.acciones.apartarOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const faltan = [...(monto ? [] : ['monto']), ...(h.apartado || (h.nuevo && h.nuevo.trim()) ? [] : ['apartado'])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                let id = h.apartado;
                if (!id) {
                    id = 'a' + s.seq++;
                    s.apartados.push({ id, nombre: h.nuevo.trim(), emoji: '🐷', portada: 'general-alcancia', monto: 0, meta: null, metaFecha: null, historial: [] });
                }
                P.apartarEn(s, id, monto, 'apartar');
            },
            { aviso: `Ahorraste ${dinero(monto)}`, claves: ['guardado:apartar'] },
        );
    };
    H.liberar = {
        iniciar(h) {
            h.monto = M.montoCampo(M.apartado(P.st, h.id).monto);
        },
        html(h) {
            const a = M.apartado(P.st, h.id);
            return { titulo: `Sacar de ${esc(a.nombre)}`, cuerpo: `${campoMonto(h, { label: '¿Cuánto quieres sacar?', valor: h.monto, ayuda: `Tiene ${dinero(a.monto)}. Lo que sacas vuelve a tu libre.` })}`, pie: pie2('liberarOk', 'Sacar') };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.liberarOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        P.ui.hoja = null;
        const a = M.apartado(P.st, h.id);
        // Liberar todo un apartado cuya fecha ya pasó lo cierra sin usar (no es logro).
        if (a.metaFecha && a.metaFecha < P.st.hoy && monto >= a.monto) {
            P.cambiar((s) => P.cerrarApartado(s, h.id), { aviso: `Cerramos ${a.nombre}: ${dinero(a.monto)} volvieron a tu libre`, claves: ['guardado:liberar', 'guardado:cerrado'] });
            if (P.ui.stack.at(-1)?.tipo === 'apartado') P.atras();
            return;
        }
        P.cambiar((s) => P.apartarEn(s, h.id, monto, 'liberar'), { aviso: `Sacaste ${dinero(Math.min(monto, a.monto))}`, claves: ['guardado:liberar'] });
    };
    H.moverApartado = {
        iniciar(h) {
            h.monto = '';
            h.a = null;
        },
        foco: () => '#f-monto',
        html(h) {
            const st = P.st;
            const a = M.apartado(st, h.id);
            return {
                titulo: `Mover de ${esc(a.nombre)}`,
                cuerpo: `${campoMonto(h, { label: '¿Cuánto?', valor: h.monto, ayuda: `Tiene ${dinero(a.monto)}.` })}${opciones(h, { campo: 'a', label: '¿A cuál ahorro?', lista: st.apartados.filter((x) => x.id !== h.id).map((x) => ({ v: x.id, t: x.nombre, e: x.emoji, s: dinero(x.monto) })), valor: h.a, errorTexto: 'Elige el ahorro' })}`,
                pie: pie2('moverApartadoOk', 'Mover'),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.moverApartadoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, [...(monto ? [] : ['monto']), ...(h.a ? [] : ['a'])])) return;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const de = M.apartado(s, h.id);
                const a = M.apartado(s, h.a);
                const real = Math.min(monto, de.monto);
                de.monto -= real;
                a.monto += real;
                de.historial.unshift({ fecha: s.hoy, tipo: 'mover', a: a.nombre, monto: real });
                a.historial.unshift({ fecha: s.hoy, tipo: 'entra', de: de.nombre, monto: real });
            },
            { aviso: 'Movido entre ahorros', claves: ['guardado:moverApartado'] },
        );
    };
    H.meta = {
        iniciar(h) {
            const a = M.apartado(P.st, h.id);
            h.nombre = a.nombre;
            h.monto = a.meta ? M.montoCampo(a.meta) : '';
            h.metaFecha = a.metaFecha || '';
            h.confirmarEliminar = false;
        },
        html(h) {
            const a = M.apartado(P.st, h.id);
            return {
                titulo: `Editar ${esc(a.nombre)}`,
                cuerpo: `${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: '¿Cuánto quieres juntar?', valor: h.monto, ayuda: 'Opcional. Déjalo vacío para ahorrar a tu ritmo.' })}
                    <div class="campo-g"><label class="campo-l" for="f-metaFecha">¿Para cuándo? <span class="opcional">(opcional)</span></label><div class="campo"><input id="f-metaFecha" data-campo="metaFecha" type="date" value="${esc(h.metaFecha)}"></div><p class="campo-ayuda">Con fecha, al repartir tu ingreso te sugerimos cuánto ahorrar para llegar.</p></div>
                    ${h.confirmarEliminar ? confirmarHtml(`¿Eliminar ${esc(a.nombre)}?`, a.monto ? `Sus ${dinero(a.monto)} vuelven a tu libre.` : 'No tiene dinero adentro.', 'apartadoEliminar', 'ap-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="ap-eliminar">${icon('trash-2', 'ico-s')}Eliminar ahorro</button>`}`,
                pie: pie2('metaOk', 'Guardar'),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'confirmarEliminar') h.confirmarEliminar = v === 'si';
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.metaOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const faltan = [...((h.nombre || '').trim() ? [] : ['nombre']), ...(String(h.monto || '').trim() && monto === null ? ['monto'] : [])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        P.cambiar((s) => {
            Object.assign(M.apartado(s, h.id), { nombre: h.nombre.trim(), meta: monto || null, metaFecha: /^\d{4}-\d{2}-\d{2}$/.test(h.metaFecha || '') ? h.metaFecha : null });
        }, { aviso: 'Cambios guardados', claves: ['guardado:apartadoEditar'] });
    };
    P.acciones.apartadoEliminar = () => {
        const h = P.ui.hoja;
        const a = M.apartado(P.st, h.id);
        P.ui.hoja = null;
        P.cambiar((s) => {
            s.apartados = s.apartados.filter((x) => x.id !== h.id);
        }, { aviso: `Eliminaste ${a.nombre}`, claves: ['guardado:apartadoEliminar'] });
        if (P.ui.stack.at(-1)?.tipo === 'apartado') P.atras();
    };
    H.usar = {
        iniciar(h) {
            const st = P.st;
            const a = M.apartado(st, h.id);
            h.monto = M.montoCampo(a.monto);
            h.nombre = a.nombre;
            h.medio = (st.medios.find((m) => m.tarjetaDebito) || st.medios[0]).id;
        },
        html(h) {
            const st = P.st;
            const a = M.apartado(st, h.id);
            return {
                titulo: `Usar ${esc(a.nombre)}`,
                cuerpo: `<p class="txt">Anotamos el gasto y vaciamos el ahorro en un solo paso.</p>
                    ${campoMonto(h, { label: '¿Cuánto gastaste?', valor: h.monto })}
                    ${campoTexto(h, { campo: 'nombre', label: '¿En qué?', valor: h.nombre })}
                    ${opciones(h, { campo: 'medio', label: '¿Con qué pagaste?', lista: medios(st), valor: h.medio })}
                    <div id="usar-vivo" aria-live="polite">${vivoUsar(st, h)}</div>`,
                pie: pie2('usarOk', 'Usar', { fk: 'usar-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
        vivo(h) {
            region('usar-vivo', vivoUsar(P.st, h));
        },
    };
    function vivoUsar(st, h) {
        const a = M.apartado(st, h.id);
        const monto = M.leerMonto(h.monto);
        const m = M.medio(st, h.medio);
        const out = [];
        if (monto !== null && monto < a.monto) out.push(`<p class="fila-s">Te sobran ${dinero(a.monto - monto)}: vuelven a tu libre.</p>`);
        if (monto !== null && monto > a.monto) out.push(`<p class="fila-s">Los ${dinero(monto - a.monto)} de más salen de tu libre.</p>`);
        if (m && m.tarjeta) {
            const info = M.tarjetaInfo(st, M.tarjeta(st, m.tarjeta));
            out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Con tarjeta, tu dinero se queda en el banco y <strong>lo guardamos para el pago del ${esc(P.diaPago({ dosPagos: info.porPagarEstado > 0 && info.ult.vence !== info.venceCompras }, info.venceCompras))}</strong>. Tu libre no cambia.</p></div>`);
        }
        return out.join('');
    }
    P.acciones.usarOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        const st = P.st;
        const a = M.apartado(st, h.id);
        const cumplida = !!(a.meta && a.monto >= a.meta);
        const libreAntes = P.calc().libre;
        const juntado = a.monto;
        const credito = !!M.medio(st, h.medio)?.tarjeta;
        P.ui.hoja = null;
        const u = P.cambiar(
            (s) => {
                const x = M.apartado(s, h.id);
                const k = D.CATEGORIAS.find((c) => c.palabras.includes(claveNombre(h.nombre))) || D.CATEGORIAS.find((c) => c.id === 'otros');
                const r = P.registrar(s, { tipo: 'gasto', fecha: s.hoy, monto, nombre: h.nombre || x.nombre, categoria: k.id, emoji: x.emoji, medio: h.medio, anotado: true, nuevo: true });
                // Usar vacía el apartado; con meta cumplida pasa a Logros (V2-03).
                return P.usarApartado(s, x.id, r, { cerrar: cumplida, vaciar: true });
            },
            { aviso: cumplida ? null : `Usaste ${a.nombre}`, claves: ['guardado:usar', 'guardado:usar:' + h.id, ...(credito ? ['guardado:usar:credito'] : [])] },
        );
        if (cumplida) P.abrir('logro', h.id, { nombre: a.nombre, monto, juntado, libreAntes, medio: h.medio, reserva: u && u.reserva ? u.reserva.id : null });
    };

    // ================================================================== APARTADO OLVIDADO (V2-23 c)
    /** Gastos que pudieron salir del apartado: sin pago ni apartado, desde un mes antes de su fecha. */
    function candidatosApartado(st, a) {
        const desde = M.sumarDias(a.metaFecha || st.hoy, -30);
        return st.registros
            .filter((r) => r.tipo === 'gasto' && !r.pago && !r.apartado && r.fecha >= desde && r.fecha <= st.hoy)
            .map((r) => ({ r, nombre: M.coincide(M.normalizar(r.nombre || ''), a.nombre) ? 0 : 1, dif: Math.abs(r.monto - a.monto) }))
            .sort((x, y) => x.nombre - y.nombre || x.dif - y.dif || (x.r.fecha < y.r.fecha ? 1 : -1))
            .slice(0, 4)
            .map((x) => x.r);
    }
    H.yaLoUse = {
        iniciar(h) {
            const st = P.st;
            const a = M.apartado(st, h.id);
            const lista = candidatosApartado(st, a);
            h.elegido = lista[0] && M.coincide(M.normalizar(lista[0].nombre || ''), a.nombre) ? lista[0].id : lista.length ? null : 'nuevo';
            const k = D.CATEGORIAS.find((c) => c.palabras.includes(claveNombre(a.nombre))) || D.CATEGORIAS.find((c) => c.id === 'otros');
            h.categoria = k.id;
            h.medio = M.medioUsual(st, k.id).id;
            h.cuando = a.metaFecha && a.metaFecha <= st.hoy ? a.metaFecha : st.hoy;
        },
        html(h) {
            const st = P.st;
            const a = M.apartado(st, h.id);
            if (!a) return { titulo: 'Listo', cuerpo: '', pie: pie1('cerrarHoja', 'Cerrar') };
            const lista = candidatosApartado(st, a);
            const op = (v, t, sub, monto) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.elegido === v}" data-a="valor" data-campo="elegido" data-v="${v}" data-fk="yl-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${t}</span><span class="fila-s">${sub}</span></span>${monto ? `<span class="monto">${monto}</span>` : ''}</button>`;
            const nuevo = h.elegido === 'nuevo';
            return {
                titulo: lista.length ? '¿Cuál de estos gastos fue?' : `¿Cómo usaste ${esc(a.nombre)}?`,
                cuerpo: `<p class="txt">Tu ahorro ${esc(a.nombre)} tiene ${dinero(a.monto)}. ${lista.length ? 'Si ya lo anotaste, elígelo: lo cerramos sin anotar otro gasto.' : 'No encontramos un gasto parecido.'}</p>
                    <div class="opciones-grandes" role="radiogroup" aria-label="El gasto">
                        ${lista.map((r) => op(r.id, `${emo(r.emoji || M.categoria(r.categoria).emoji, 16)} ${esc(r.nombre)}`, `${esc(M.capital(M.relativa(r.fecha, st.hoy)))} · ${esc(M.medio(st, r.medio)?.nombre || '')}`, dinero(r.monto))).join('')}
                        ${op('nuevo', 'No lo anoté', `Anotarlo ahora: ${dinero(a.monto)} de ${esc(a.nombre)}`, '')}
                        ${op('nolouse', 'No lo usé', `Lo cerramos y los ${dinero(a.monto)} vuelven a tu libre`, '')}
                    </div>
                    ${nuevo ? `${opciones(h, { campo: 'medio', label: '¿Con qué pagaste?', lista: medios(st), valor: h.medio })}${opciones(h, { campo: 'cuando', label: `¿Cuándo? ${a.metaFecha && a.metaFecha <= st.hoy ? `<span class="opcional">(te sugerimos el ${esc(M.fechaCorta(a.metaFecha))}, la fecha de tu meta; cámbiala si fue otro día)</span>` : ''}`, lista: fechasCortas(st, a.metaFecha && a.metaFecha <= st.hoy ? a.metaFecha : null), valor: h.cuando })}` : ''}
                    ${error(h, 'elegido', 'Elige el gasto o «No lo anoté»')}
                    <p class="fila-s">${h.elegido === 'nolouse' ? `Tu libre sube ${dinero(a.monto)}. Queda en «Cerrados», no en tus logros.` : h.elegido && !nuevo ? `Tu libre sube ${dinero(a.monto)}: ese gasto ya había bajado tu libre y el ahorro también lo guardaba. Pasa a tus logros.` : nuevo ? 'Tu libre no cambia: ese dinero ya estaba en tus ahorros. Pasa a tus logros.' : ''}</p>`,
                pie: pie2('yaLoUseOk', 'Cerrar apartado', { fk: 'yl-ok' }),
            };
        },
    };
    P.acciones.yaLoUseOk = () => {
        const h = P.ui.hoja;
        if (!validar(h, h.elegido ? [] : ['elegido'])) return;
        const st = P.st;
        const a = M.apartado(st, h.id);
        const nombre = a.nombre;
        const libreAntes = P.calc().libre;
        P.ui.hoja = null;
        if (h.elegido === 'nolouse') {
            P.cambiar((s) => P.cerrarApartado(s, h.id), { aviso: `Cerramos ${nombre}: ${dinero(a.monto)} volvieron a tu libre`, claves: ['guardado:cerrado'] });
            if (P.ui.stack.at(-1)?.tipo === 'apartado') P.atras();
            return;
        }
        P.cambiar(
            (s) => {
                const x = M.apartado(s, h.id);
                const r = h.elegido === 'nuevo' ? P.registrar(s, { tipo: 'gasto', fecha: h.cuando, monto: x.monto, nombre: x.nombre, categoria: h.categoria, emoji: x.emoji, medio: h.medio, anotado: true, nuevo: true }) : s.registros.find((y) => y.id === h.elegido);
                return P.usarApartado(s, x.id, r, { cerrar: true, logro: true });
            },
            {
                aviso: () => {
                    const sube = P.calc().libre - libreAntes;
                    return `Cerramos ${nombre}${sube > 0 ? `. Tu libre sube ${dinero(sube)}` : ''}`;
                },
                claves: ['guardado:yaLoUse', 'guardado:yaLoUse:' + (h.elegido === 'nuevo' ? 'nuevo' : 'existente')],
            },
        );
        if (P.ui.stack.at(-1)?.tipo === 'apartado') P.atras();
    };

    // ================================================================== TARJETA O PRÉSTAMO (V2-24)
    const EJ_DEUDA = { tarjeta: 'Ej. Crédito Cuscatlán', casacomercial: 'Ej. Almacén La Esquina', prestamo: 'Ej. Préstamo de la cooperativa', vivienda: 'Ej. Crédito de la casa' };
    function campoDia(h, campo, label, ayuda = 'Del 1 al 31') {
        return `<div class="campo-g"><label class="campo-l" for="f-${campo}">${label}</label><div class="campo campo--dia"><input id="f-${campo}" data-campo="${campo}" type="text" inputmode="numeric" maxlength="2" autocomplete="off" value="${esc(h[campo] || '')}" aria-describedby="f-${campo}-a" ${inv(h, campo)}></div><p class="fila-s" id="f-${campo}-a">${ayuda}</p>${error(h, campo, 'Escribe un día del 1 al 31')}</div>`;
    }
    H.nuevaDeuda = {
        iniciar(h) {
            const st = P.st;
            const p = h.id ? M.pago(st, h.id) : null;
            // Desde la ficha de la tarjeta llega su id: el mismo formulario edita la tarjeta.
            const t = h.tarjetaId ? M.tarjeta(st, h.tarjetaId) : !p && h.id ? M.tarjeta(st, h.id) : null;
            if (t) h.tarjetaId = t.id;
            if (p) Object.assign(h, { editar: true, tipoDeuda: p.tipoDeuda || 'prestamo', cuotaTarjeta: !!p.cuotaTarjeta, nombre: p.nombre, cuota: M.montoCampo(p.monto), dia: String(p.dia || ''), debe: p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined ? M.montoCampo(p.deuda.debe) : '', medio: p.medio });
            else if (t) Object.assign(h, { editar: true, tipoDeuda: 'tarjeta', nombre: t.nombre, corte: String(t.corte), pagoDia: String(t.pagoDia), cupo: t.cupo ? M.montoCampo(t.cupo) : '' });
            else Object.assign(h, { tipoDeuda: h.tipoInicial || null, nombre: '', corte: '', pagoDia: '', cupo: '', cuota: '', dia: '', debe: '', medio: (st.medios.find((m) => m.id === 'transferencia') || st.medios.find((m) => m.tarjetaDebito) || st.medios[0]).id });
        },
        foco: (h) => (h.tipoDeuda ? '#f-nombre' : '#hoja-t'),
        html(h) {
            const st = P.st;
            const tipo = D.TIPOS_DEUDA.find((x) => x.id === h.tipoDeuda);
            const tipos = h.editar
                ? ''
                : `<div class="campo-g"><p class="campo-l" id="l-tipoDeuda">¿Qué es?</p><div class="opciones-grandes opciones-grandes--2" role="radiogroup" aria-labelledby="l-tipoDeuda">${D.TIPOS_DEUDA.map((x) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.tipoDeuda === x.id}" data-a="valor" data-campo="tipoDeuda" data-v="${x.id}" data-fk="td-${x.id}">${caja(x.emoji)}<span class="opcion-g-txt"><span class="opcion-g-t">${esc(x.nombre)}</span><span class="fila-s">${esc(x.s)}</span></span></button>`).join('')}</div>${error(h, 'tipoDeuda', 'Elige qué es')}</div>`;
            let campos = '';
            if (h.tipoDeuda === 'tarjeta' && !h.cuotaTarjeta) {
                campos = `${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: EJ_DEUDA.tarjeta, errorTexto: 'Ponle un nombre' })}
                    <div class="ob-2">${campoDia(h, 'corte', 'Día de corte')}${campoDia(h, 'pagoDia', 'Día de pago')}</div>
                    <p class="fila-s">Los dos están en tu estado de cuenta.</p>
                    ${campoMonto(h, { campo: 'cupo', label: 'Cupo <span class="opcional">(opcional)</span>', valor: h.cupo, id: 'f-cupo', ayuda: 'Lo verás en su ficha. El cupo nunca suma a tu libre.' })}
                    ${h.editar ? '' : `<div class="campo-g" role="group" aria-labelledby="l-ec"><p class="campo-l" id="l-ec">¿Tienes tu último estado de cuenta? <span class="opcional">(opcional)</span></p><div class="ob-2">${campoMonto(h, { campo: 'ecTotal', label: 'Total', valor: h.ecTotal, id: 'f-ecTotal', errorTexto: 'Escribe el total' })}${campoMonto(h, { campo: 'ecMinimo', label: 'Mínimo', valor: h.ecMinimo, id: 'f-ecMinimo' })}</div><p class="fila-s">Si no lo tienes a mano, te lo pedimos después del próximo corte.</p></div>`}`;
            } else if (h.tipoDeuda) {
                campos = `${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: EJ_DEUDA[h.tipoDeuda], errorTexto: 'Ponle un nombre' })}
                    <div class="ob-2">${campoMonto(h, { campo: 'cuota', label: 'Cuota', valor: h.cuota, id: 'f-cuota', errorTexto: 'Escribe la cuota' })}${campoDia(h, 'dia', 'Día de pago', 'Cada mes')}</div>
                    ${campoMonto(h, { campo: 'debe', label: '¿Cuánto debes? <span class="opcional">(opcional)</span>', valor: h.debe, id: 'f-debe', ayuda: 'Más o menos. Baja con cada «Pagado».' })}
                    ${opciones(h, { campo: 'medio', label: '¿Con qué la pagas?', lista: medios(st).filter((m) => !M.medio(st, m.v).tarjeta), valor: h.medio })}
                    ${h.cuotaTarjeta ? '<p class="fila-s">Es lo que pagas cada mes a esta tarjeta. Si quieres llevar sus compras y su estado de cuenta, agrégala como tarjeta de crédito en Deudas.</p>' : ''}`;
            }
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Tarjeta o préstamo',
                cuerpo: `${tipos}${campos}${tipo && !h.editar ? `<p class="fila-s">${h.tipoDeuda === 'tarjeta' ? 'Al guardar, su pago aparece solo en Pagos según tu estado de cuenta.' : 'Al guardar, la cuota aparece sola en Pagos.'}</p>` : ''}`,
                pie: pie2('nuevaDeudaOk', h.editar ? 'Guardar cambios' : 'Guardar', { fk: 'deuda-ok' }),
                ...(h.editar && h.tarjetaId ? { cuerpo: `${tipos}${campos}${h.confirmarEliminar ? confirmarHtml(`¿Eliminar ${esc(h.nombre)}?`, 'Deja de aparecer en Pagos y en tu libre. Las compras que anotaste se quedan en tu historial.', 'tarjetaEliminar', 'tarjeta-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="tarjeta-eliminar">${icon('trash-2', 'ico-s')}Eliminar tarjeta</button>`}` } : {}),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'confirmarEliminar') {
                h.confirmarEliminar = v === 'si';
                return;
            }
            h[campo] = v;
            if (campo === 'tipoDeuda') {
                h.intento = false;
                h.errores = [];
            }
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.tarjetaEliminar = () => {
        const h = P.ui.hoja;
        const t = M.tarjeta(P.st, h.tarjetaId);
        P.ui.hoja = null;
        P.cambiar((s) => {
            s.tarjetas = s.tarjetas.filter((x) => x.id !== h.tarjetaId);
            for (const m of s.medios) if (m.tarjeta === h.tarjetaId) Object.assign(m, { oculto: true, tarjeta: null, eraTarjeta: h.tarjetaId });
            s.reservasTarjeta = (s.reservasTarjeta || []).filter((x) => x.tarjeta !== h.tarjetaId);
        }, { aviso: `Eliminaste ${t.nombre}`, claves: ['guardado:tarjetaEliminar'] });
        if (P.ui.stack.at(-1)?.tipo === 'tarjeta') P.atras();
    };
    const diaValido = (v) => /^\d{1,2}$/.test(String(v || '').trim()) && +v >= 1 && +v <= 31;
    P.acciones.nuevaDeudaOk = () => {
        const h = P.ui.hoja;
        const st = P.st;
        const nombre = (h.nombre || '').trim();
        const faltan = [];
        if (!h.tipoDeuda) faltan.push('tipoDeuda');
        else {
            if (!nombre) faltan.push('nombre');
            if (h.tipoDeuda === 'tarjeta' && !h.cuotaTarjeta) {
                if (!diaValido(h.corte)) faltan.push('corte');
                if (!diaValido(h.pagoDia)) faltan.push('pagoDia');
                if (M.leerMonto(h.ecMinimo) && !M.leerMonto(h.ecTotal)) faltan.push('ecTotal');
            } else {
                if (!M.leerMonto(h.cuota)) faltan.push('cuota');
                if (!diaValido(h.dia)) faltan.push('dia');
            }
        }
        if (!validar(h, faltan)) return;
        const tipo = D.TIPOS_DEUDA.find((x) => x.id === h.tipoDeuda);
        P.ui.hoja = null;
        if (h.tipoDeuda === 'tarjeta' && !h.cuotaTarjeta) {
            const corte = +h.corte;
            const pagoDia = +h.pagoDia;
            const cupo = M.leerMonto(h.cupo) || null;
            const ecTotal = M.leerMonto(h.ecTotal);
            const ecMinimo = M.leerMonto(h.ecMinimo);
            if (h.editar) {
                P.cambiar((s) => Object.assign(M.tarjeta(s, h.tarjetaId), { nombre, corte, pagoDia, cupo }), { aviso: 'Cambios guardados', claves: ['guardado:deuda:editar'] });
                return;
            }
            P.cambiar(
                (s) => {
                    const id = 't' + s.seq++;
                    const ultimoCorte = M.ultimoDia(s.hoy, corte);
                    const [y, m] = M.partes(ultimoCorte);
                    const [vy, vm] = M.mesMas(y, m, 1);
                    const vence = M.fechaDe(vy, vm, pagoDia);
                    const estado = ecTotal ? { corte: ultimoCorte, total: ecTotal, minimo: ecMinimo || 0, aPagar: ecTotal, opcion: 'total', vence } : { corte: ultimoCorte, total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence, inicial: true, esperarCorte: true };
                    s.tarjetas.push({ id, nombre, emoji: '💳', tipo: 'tarjeta', corte, pagoDia, cupo, interesesAnio: 0, estados: [estado] });
                    s.medios.push({ id: 'm' + id, nombre, emoji: '💳', tarjeta: id });
                },
                { aviso: `${nombre}: su pago ya está en Pagos`, claves: ['guardado:deuda', 'guardado:deuda:tarjeta'] },
            );
            return;
        }
        const cuota = M.leerMonto(h.cuota);
        const debe = M.leerMonto(h.debe);
        if (h.editar) {
            P.cambiar((s) => Object.assign(M.pago(s, h.id), { nombre, monto: cuota, dia: +h.dia, medio: h.medio, deuda: debe !== null ? { debe } : null }), { aviso: 'Cambios guardados', claves: ['guardado:deuda:editar'] });
            return;
        }
        P.cambiar(
            (s) => {
                const p = P.crearPago(s, { nombre, emoji: tipo.emoji, categoria: 'cuotas', monto: cuota, frecuencia: 'mensual', dia: +h.dia, medio: h.medio });
                p.tipoDeuda = h.tipoDeuda;
                p.deuda = debe !== null ? { debe } : null;
            },
            { aviso: `${nombre}: la cuota ya está en Pagos`, claves: ['guardado:deuda', 'guardado:deuda:' + h.tipoDeuda] },
        );
    };

    // ================================================================== INGRESOS
    H.ingresoLlego = {
        iniciar(h) {
            const st = P.st;
            const ing = M.ingreso(st, h.id);
            h.monto = M.montoCampo(ing.monto);
            h.lugar = ing.lugar;
            h.fechaEsperada = h.fecha;
            h.cuando = h.fecha && h.fecha <= st.hoy ? h.fecha : st.hoy;
        },
        foco: () => '#f-monto',
        html(h) {
            const st = P.st;
            const ing = M.ingreso(st, h.id);
            return {
                titulo: `¿Cuánto te cayó?`,
                cuerpo: `<p class="txt">${emo(ing.emoji, 18)} ${esc(ing.nombre)} ${h.fechaEsperada ? 'del ' + esc(M.fechaLarga(h.fechaEsperada)) : ''}</p>
                    ${campoMonto(h, { label: 'Monto', valor: h.monto, ayuda: 'Si te descontaron algo, escribe lo que llegó de verdad.' })}
                    ${opciones(h, { campo: 'lugar', label: '¿Dónde cayó?', lista: lugares(st), valor: h.lugar })}
                    ${M.descuentosDe(st, ing.id).length ? `<p class="fila-s">Al guardar, queda pagado solo: ${esc(M.descuentosDe(st, ing.id).map((p) => `${p.nombre} ${dinero(p.monto)}`).join(', '))}.</p>` : ''}
                    ${h.fechaEsperada ? (h.noCayo ? `<div class="pregunta" role="group" aria-labelledby="l-nocayo"><p class="campo-l" id="l-nocayo">¿Qué pasó?</p><div class="chips"><button type="button" class="chip" data-a="cerrarHoja" data-fk="nocayo-todavia">Todavía no (se atrasó)</button><button type="button" class="chip" data-a="ingresoNoLlega" data-fk="nocayo-no">No me va a caer</button></div><p class="fila-s">Si no te va a caer, tu número sigue con lo que tienes y lo de esa fecha se paga con eso.</p></div>` : `<button type="button" class="link link--start" data-a="valor" data-campo="noCayo" data-v="si" data-fk="ing-nocayo">No me cayó</button>`) : ''}`,
                pie: pie2('ingresoLlegoOk', 'Siguiente', { fk: 'ing-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.ingresoNoLlega = () => {
        const h = P.ui.hoja;
        const ing = M.ingreso(P.st, h.id);
        P.ui.hoja = null;
        P.cambiar((s) => P.noLlego(s, h.id, h.fechaEsperada), { aviso: `Anotamos que no llegó ${ing.nombre.toLowerCase()}`, claves: ['guardado:noLlego'] });
    };
    P.acciones.ingresoLlegoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        P.ui.hoja = null;
        P.cambiar((s) => P.llegoIngreso(s, h.id, h.fechaEsperada, { monto, lugar: h.lugar, fecha: h.cuando }), { aviso: null, claves: ['guardado:ingreso', 'ingreso:llego:' + h.id] });
        const top = P.ui.stack.at(-1);
        if (top && top.tipo === 'reparte') {
            top.otros = [...(top.otros || []), { nombre: M.ingreso(P.st, h.id).nombre, monto }];
            P.render({ foco: '#rep-contado' });
            P.avisar(`Anotamos ${dinero(monto)} de ${M.ingreso(P.st, h.id).nombre}`);
            return;
        }
        P.abrir('reparte', h.id, { fecha: h.fechaEsperada, monto });
    };
    H.nuevoIngreso = {
        iniciar(h) {
            const st = P.st;
            const ing = h.id ? M.ingreso(st, h.id) : null;
            if (ing) Object.assign(h, { editar: true, nombre: ing.nombre, monto: M.montoCampo(ing.monto), lugar: ing.lugar, principal: !!ing.principal, ...formFrecuencia(ing) });
            else {
                // «Los mismos días que yo» para la pareja: se parte de los días del ingreso principal.
                const p = M.principal(st);
                const base = p && p.frecuencia === 'quincenal' ? { frecuencia: 'quincenal', dias: p.dias } : { frecuencia: 'unico' };
                Object.assign(h, { nombre: '', monto: '', lugar: p ? p.lugar : st.lugares[0] ? st.lugares[0].id : null, principal: false, ...formFrecuencia(base) });
            }
            h.descuento = false;
            h.dNombre = 'Préstamo por planilla';
            h.dCuota = '';
            h.dDebe = '';
            h.confirmarEliminar = false;
        },
        html(h) {
            const st = P.st;
            const sugeridos = [['Salario de mi pareja', '💼'], ['Remesa', '🌎'], ['Comisión', '📈'], ['Bono', '📈'], ['Aguinaldo', '🎁'], ['Quincena 25', '🎁'], ['Turno del cuchubal', '🤝']];
            const f = h.frecuencia;
            const principal = M.principal(st);
            const repetido = f !== 'unico' && f !== 'fechas';
            const descuentos = h.editar ? M.descuentosDe(st, h.id) : [];
            // V2-38: lo que te descuentan del salario (orden de descuento, préstamo por planilla). No ISSS, AFP ni renta.
            const bloqueDescuento = repetido
                ? `<div class="campo-g"><div class="chips"><button type="button" class="chip" aria-pressed="${h.descuento}" data-a="valor" data-campo="descuento" data-v="${!h.descuento}" data-fk="ing-descuento">${h.descuento ? icon('check', 'ico-xs') : ''}¿Te descuentan algo del salario?</button></div><p class="fila-s">Por ejemplo, una orden de descuento o un préstamo por planilla.${descuentos.length ? ` Ya tienes: ${esc(descuentos.map((p) => p.nombre).join(', '))}.` : ''}</p>
                    ${h.descuento ? `<div class="ob-det">${campoTexto(h, { campo: 'dNombre', label: '¿Qué te descuentan?', valor: h.dNombre, errorTexto: 'Ponle un nombre' })}${campoMonto(h, { campo: 'dCuota', label: '¿Cuánto cada vez que te pagan?', valor: h.dCuota, id: 'f-dCuota', errorTexto: 'Escribe cuánto te descuentan' })}${campoMonto(h, { campo: 'dDebe', label: '¿Cuánto debes? <span class="opcional">(opcional)</span>', valor: h.dDebe, id: 'f-dDebe' })}<p class="fila-s">Lo que esperas arriba ya es lo que te cae, sin el descuento. Al confirmar tu ingreso, la cuota queda pagada sola: no baja tu libre otra vez y sí baja lo que debes.</p></div>` : ''}</div>`
                : '';
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Ingreso esperado',
                cuerpo: `${h.editar ? '' : `<p class="txt">No suma a tu libre hasta que llegue. Cuando llegue, te ayudo a repartirlo.</p>${opciones(h, { campo: 'sugerido', label: 'Ideas', lista: sugeridos.map(([t, e]) => ({ v: t, t, e })), valor: h.nombre })}`}
                    ${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: 'Ej. Salario de Luis', errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: '¿Cuánto te cae más o menos?', valor: h.monto, ayuda: 'Lo que te llega de verdad, ya con descuentos.' })}
                    ${bloqueFrecuencia(h, { esIngreso: true })}
                    ${opciones(h, { campo: 'lugar', label: '¿Dónde cae?', lista: lugares(st), valor: h.lugar })}
                    ${repetido ? `<div class="chips"><button type="button" class="chip" aria-pressed="${h.principal}" data-a="valor" data-campo="principal" data-v="${!h.principal}" data-fk="ing-principal">${h.principal ? icon('check', 'ico-xs') : ''}Es mi ingreso principal</button></div><p class="fila-s">${h.principal ? 'Tu libre se calcula hasta que llegue este.' : principal && principal.id !== h.id ? `Tu ingreso principal es «${esc(principal.nombre)}». Este cuenta como estimado para tus próximos pagos.` : 'Sin ingreso principal, ves tu libre hasta fin de mes.'}</p>` : ''}
                    ${bloqueDescuento}
                    ${h.editar ? (h.confirmarEliminar ? confirmarHtml(`¿Ya no esperas «${esc(h.nombre)}»?`, 'Deja de aparecer en Pagos. Lo que ya llegó se queda en tu historial.', 'ingresoEliminar', 'ing-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="ing-eliminar">${icon('trash-2', 'ico-s')}Ya no lo espero</button>`) : ''}`,
                pie: pie2('nuevoIngresoOk', h.editar ? 'Guardar cambios' : 'Guardar'),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'sugerido') {
                h.nombre = v;
                if (v === 'Aguinaldo' || v === 'Quincena 25' || v === 'Turno del cuchubal' || v === 'Bono') h.frecuencia = 'unico';
                // El aguinaldo llega a más tardar el 20 de diciembre; la Quincena 25, en enero. Se sugiere y se cambia en el calendario.
                const y = Number(P.st.hoy.slice(0, 4));
                if (v === 'Aguinaldo' && !h.fecha) h.fecha = `${P.st.hoy <= `${y}-12-12` ? y : y + 1}-12-12`;
                if (v === 'Quincena 25' && !h.fecha) h.fecha = `${P.st.hoy <= `${y}-01-25` ? y : y + 1}-01-25`;
                if (v === 'Remesa') h.frecuencia = 'mensual';
            } else if (campo === 'principal') h.principal = v === 'true';
            else if (campo === 'descuento') h.descuento = v === 'true';
            else if (campo === 'confirmarEliminar') h.confirmarEliminar = v === 'si';
            else if (campo === 'fechas') alternarFecha(h, v);
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.nuevoIngresoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const f = h.frecuencia;
        const dCuota = M.leerMonto(h.dCuota);
        const conDescuento = h.descuento && f !== 'unico' && f !== 'fechas';
        const faltan = [...(h.nombre.trim() ? [] : ['nombre']), ...(monto ? [] : ['monto']), ...faltanFrecuencia(h), ...(conDescuento && !(h.dNombre || '').trim() ? ['dNombre'] : []), ...(conDescuento && !dCuota ? ['dCuota'] : [])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        const n = M.normalizar(h.nombre);
        const { primera, ...regla } = reglaForm(h);
        if (regla.frecuencia === 'ingreso') Object.assign(regla, { frecuencia: 'quincenal', dias: M.principal(P.st).dias });
        const datos = { nombre: h.nombre.trim(), monto, ...P.reglaDe(regla), lugar: h.lugar, principal: f !== 'unico' && f !== 'fechas' && !!h.principal };
        datos.extra = !datos.principal;
        const dDebe = M.leerMonto(h.dDebe);
        P.cambiar(
            (s) => {
                if (datos.principal) for (const x of s.ingresos) if (x.id !== h.id && x.principal) Object.assign(x, { principal: false, extra: true });
                let id = h.id;
                if (h.editar) {
                    const x = M.ingreso(s, h.id);
                    for (const k of ['fecha', 'dias', 'dia', 'diaSemana', 'cadaMeses', 'fechas']) delete x[k];
                    Object.assign(x, datos);
                } else {
                    const emoji = /aguinaldo|quincena 25/.test(n) ? '🎁' : /remesa/.test(n) ? '🌎' : /cuchubal/.test(n) ? '🤝' : /comision|bono/.test(n) ? '📈' : '💼';
                    id = 'i' + s.seq++;
                    s.ingresos.push({ id, emoji, categoria: /remesa/.test(n) ? 'remesa' : /aguinaldo|quincena 25/.test(n) ? 'aguinaldo' : /cuchubal/.test(n) ? 'cuchubal' : 'otro', aprox: true, desde: s.hoy, llegadas: {}, ...datos });
                }
                // V2-38: una deuda que se paga sola cada vez que llega este ingreso.
                if (conDescuento) {
                    const p = P.crearPago(s, { nombre: h.dNombre.trim(), emoji: '🏦', categoria: 'cuotas', monto: dCuota, frecuencia: 'ingreso', conIngreso: id, medio: null });
                    Object.assign(p, { descuento: id, tipoDeuda: 'planilla', deuda: dDebe !== null ? { debe: dDebe } : null, avisos: [] });
                }
            },
            { aviso: h.editar ? 'Cambios guardados' : 'Ingreso esperado guardado', claves: [h.editar ? 'guardado:ingresoEditar' : 'guardado:ingresoEsperado', ...(conDescuento ? ['guardado:descuento'] : [])] },
        );
    };
    P.acciones.ingresoEliminar = () => {
        const h = P.ui.hoja;
        const ing = M.ingreso(P.st, h.id);
        P.ui.hoja = null;
        P.cambiar((s) => {
            Object.assign(M.ingreso(s, h.id), { activo: false, principal: false, extra: true });
            s.ingresos = s.ingresos.filter((x) => x.id !== h.id || Object.keys(x.llegadas).length);
        }, { aviso: `Ya no esperas «${ing.nombre}»`, claves: ['guardado:ingresoEliminar'] });
        if (P.ui.stack.at(-1)?.tipo === 'ingreso') P.atras();
    };

    // ================================================================== LUGARES Y MEDIOS (crear, editar, eliminar)
    const TIPOS_LUGAR = [{ v: 'efectivo', t: 'Efectivo', e: '💵' }, { v: 'banco', t: 'Banco o cooperativa', e: '🏦' }, { v: 'billetera', t: 'Billetera en el celular', e: '📱' }];
    H.lugar = {
        iniciar(h) {
            const l = h.id ? M.lugar(P.st, h.id) : null;
            Object.assign(h, l ? { editar: true, clase: l.tipo, nombre: l.nombre } : { clase: 'banco', nombre: '', monto: '', debito: true });
            h.confirmarEliminar = false;
        },
        html(h) {
            const st = P.st;
            const l = h.editar ? M.lugar(st, h.id) : null;
            return {
                titulo: h.editar ? `Editar ${esc(l.nombre)}` : 'Nuevo lugar',
                cuerpo: `${h.editar ? `<p class="txt">${esc(TIPOS_LUGAR.find((x) => x.v === l.tipo)?.t || '')} · tienes ${dinero(M.saldoLugar(st, l.id))}. Para cambiar el saldo, usa «Cuadrar».</p>` : opciones(h, { campo: 'clase', label: '¿Qué es?', lista: TIPOS_LUGAR, valor: h.clase })}
                    ${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: h.clase === 'banco' ? 'Ej. Banco Cuscatlán' : h.clase === 'billetera' ? 'Ej. Billetera del celular' : 'Ej. Alcancía', errorTexto: 'Ponle un nombre' })}
                    ${h.editar ? '' : campoMonto(h, { label: '¿Cuánto tienes ahí hoy?', valor: h.monto, ayuda: 'Más o menos. Es su primer cuadre.', errorTexto: 'Escribe cuánto tienes, aunque sea $0' })}
                    ${!h.editar && h.clase === 'banco' ? `<div class="chips"><button type="button" class="chip" aria-pressed="${h.debito}" data-a="valor" data-campo="debito" data-v="${!h.debito}" data-fk="lugar-debito">${h.debito ? icon('check', 'ico-xs') : ''}Tengo tarjeta de débito de este banco</button></div>` : ''}
                    ${h.editar ? (st.lugares.length < 2 ? '<p class="fila-s">Es tu único lugar: no se puede eliminar.</p>' : h.confirmarEliminar ? confirmarHtml(`¿Eliminar ${esc(l.nombre)}?`, `Sus ${dinero(M.saldoLugar(st, l.id))} dejan de contar en «Tienes». Lo que anotaste se queda en tu historial.`, 'lugarEliminar', 'lugar-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="lugar-eliminar">${icon('trash-2', 'ico-s')}Eliminar lugar</button>`) : ''}`,
                pie: pie2('lugarOk', h.editar ? 'Guardar cambios' : 'Guardar', { fk: 'lugar-ok' }),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'debito') h.debito = v === 'true';
            else if (campo === 'confirmarEliminar') h.confirmarEliminar = v === 'si';
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.lugarOk = () => {
        const h = P.ui.hoja;
        const nombre = (h.nombre || '').trim();
        const monto = M.leerMonto(h.monto);
        if (!validar(h, [...(nombre ? [] : ['nombre']), ...(h.editar || monto !== null ? [] : ['monto'])])) return;
        P.ui.hoja = null;
        if (h.editar) {
            P.cambiar((s) => {
                M.lugar(s, h.id).nombre = nombre;
            }, { aviso: 'Cambios guardados', claves: ['guardado:lugarEditar'] });
            return;
        }
        P.cambiar(
            (s) => {
                const id = 'l' + s.seq++;
                s.lugares.push({ id, tipo: h.clase, nombre, emoji: TIPOS_LUGAR.find((x) => x.v === h.clase).e });
                const r = P.registrar(s, { tipo: 'cuadre', fecha: s.hoy, lugar: id, monto, esperado: monto, primero: true });
                M.lugar(s, id).cuadre = { fecha: s.hoy, seq: r.seq, monto };
                if (h.clase === 'banco' && h.debito) s.medios.push({ id: 'm' + s.seq++, nombre: 'Débito ' + nombre.replace(/^banco\s+/i, ''), emoji: '🏦', lugar: id, tarjetaDebito: true });
                if (h.clase === 'billetera') s.medios.push({ id: 'm' + s.seq++, nombre, emoji: '📱', lugar: id });
            },
            { aviso: `${nombre}: guardado`, claves: ['guardado:lugar'] },
        );
    };
    P.acciones.lugarEliminar = () => {
        const h = P.ui.hoja;
        const l = M.lugar(P.st, h.id);
        P.ui.hoja = null;
        P.cambiar((s) => {
            s.lugares = s.lugares.filter((x) => x.id !== h.id);
            for (const m of s.medios) if (m.lugar === h.id) m.oculto = true;
        }, { aviso: `Eliminaste ${l.nombre}`, claves: ['guardado:lugarEliminar'] });
        if (P.ui.stack.at(-1)?.tipo === 'lugar') P.atras();
    };
    const TIPOS_MEDIO = [{ v: 'debito', t: 'Tarjeta de débito', e: '🏦' }, { v: 'transferencia', t: 'Transferencia', e: '🔁' }, { v: 'billetera', t: 'App o billetera', e: '📱' }, { v: 'credito', t: 'Tarjeta de crédito', e: '💳' }];
    H.medio = {
        iniciar(h) {
            const st = P.st;
            const m = h.id ? M.medio(st, h.id) : null;
            Object.assign(h, m ? { editar: true, nombre: m.nombre, lugar: m.lugar || null, clase: m.tarjeta ? 'credito' : m.tarjetaDebito ? 'debito' : 'transferencia' } : { clase: 'debito', nombre: '', lugar: (st.lugares.find((l) => l.tipo === 'banco') || st.lugares[0]).id });
            h.confirmarEliminar = false;
        },
        html(h) {
            const st = P.st;
            const m = h.editar ? M.medio(st, h.id) : null;
            const credito = h.clase === 'credito';
            return {
                titulo: h.editar ? `Editar ${esc(m.nombre)}` : 'Nuevo medio de pago',
                cuerpo: `${h.editar ? '' : opciones(h, { campo: 'clase', label: '¿Qué es?', lista: TIPOS_MEDIO, valor: h.clase })}
                    ${credito && !h.editar ? '<p class="txt">Las tarjetas de crédito se agregan con su corte y su día de pago.</p>' : `${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: 'Ej. Débito Cuscatlán', errorTexto: 'Ponle un nombre' })}
                    ${m && m.tarjeta ? '<p class="fila-s">Es una tarjeta de crédito: su corte y pago se editan en su ficha.</p>' : opciones(h, { campo: 'lugar', label: '¿De dónde sale el dinero?', lista: lugares(st), valor: h.lugar, errorTexto: 'Elige de dónde sale' })}`}
                    ${h.editar && !(m.id === 'efectivo') ? (h.confirmarEliminar ? confirmarHtml(`¿Eliminar ${esc(m.nombre)}?`, 'Ya no aparece para elegir. Lo que pagaste con él se queda en tu historial.', 'medioEliminar', 'medio-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="medio-eliminar">${icon('trash-2', 'ico-s')}Eliminar medio</button>`) : ''}`,
                pie: credito && !h.editar ? pie2('medioCredito', 'Seguir', { fk: 'medio-ok' }) : pie2('medioOk', h.editar ? 'Guardar cambios' : 'Guardar', { fk: 'medio-ok' }),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'confirmarEliminar') h.confirmarEliminar = v === 'si';
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.medioCredito = () => {
        P.ui.hoja = null;
        P.abrirHoja('nuevaDeuda', { tipoInicial: 'tarjeta' });
    };
    P.acciones.medioOk = () => {
        const h = P.ui.hoja;
        const nombre = (h.nombre || '').trim();
        const m = h.editar ? M.medio(P.st, h.id) : null;
        if (!validar(h, [...(nombre ? [] : ['nombre']), ...(m && m.tarjeta ? [] : h.lugar ? [] : ['lugar'])])) return;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                if (h.editar) {
                    const x = M.medio(s, h.id);
                    x.nombre = nombre;
                    if (!x.tarjeta) x.lugar = h.lugar;
                    if (x.tarjeta) M.tarjeta(s, x.tarjeta).nombre = nombre;
                } else s.medios.push({ id: 'm' + s.seq++, nombre, emoji: TIPOS_MEDIO.find((x) => x.v === h.clase).e, lugar: h.lugar, ...(h.clase === 'debito' ? { tarjetaDebito: true } : {}) });
            },
            { aviso: h.editar ? 'Cambios guardados' : `${nombre}: guardado`, claves: [h.editar ? 'guardado:medioEditar' : 'guardado:medio'] },
        );
    };
    P.acciones.medioEliminar = () => {
        const h = P.ui.hoja;
        const m = M.medio(P.st, h.id);
        P.ui.hoja = null;
        P.cambiar((s) => {
            M.medio(s, h.id).oculto = true;
        }, { aviso: `Eliminaste ${m.nombre}`, claves: ['guardado:medioEliminar'] });
    };

    // ================================================================== FRECUENCIAS (V2-36) PARA PAGOS E INGRESOS
    const FRECUENCIAS = [['unico', 'Una vez'], ['semanal', 'Cada semana'], ['catorcenal', 'Cada 2 semanas'], ['quincenal', 'Cada quincena'], ['mensual', 'Cada mes'], ['trimestral', 'Cada 3 meses'], ['anual', 'Cada año'], ['fechas', 'Otras fechas']];
    /** De la regla guardada a lo que muestra el formulario. */
    function formFrecuencia(x) {
        const f = x.frecuencia === 'meses' ? (x.cadaMeses === 3 ? 'trimestral' : 'anual') : x.frecuencia === 'ingreso' ? 'quincenal' : x.frecuencia;
        const dias = x.dias || [15, 30];
        const qModo = x.frecuencia === 'ingreso' ? 'ingreso' : dias[0] === 15 && dias[1] === 30 ? '15-30' : dias[0] === 15 && dias[1] === 31 ? '15-31' : 'otros';
        return { frecuencia: f, qModo, d1: String(dias[0]), d2: String(dias[1]), dia: x.dia || null, diaSemana: x.diaSemana ?? 5, fecha: x.fecha || '', fechas: [...(x.fechas || [])] };
    }
    /** Del formulario a la regla que entiende el motor (P.reglaDe). */
    function reglaForm(h) {
        const st = P.st;
        const p = M.principal(st);
        const f = h.frecuencia;
        if (f === 'trimestral' || f === 'anual') return { frecuencia: 'meses', cadaMeses: f === 'trimestral' ? 3 : 12, fecha: h.fecha };
        if (f === 'quincenal' && h.qModo === 'ingreso' && p) return { frecuencia: 'ingreso', conIngreso: p.id };
        if (f === 'quincenal') return { frecuencia: 'quincenal', dias: h.qModo === '15-30' ? [15, 30] : h.qModo === '15-31' ? [15, 31] : [Number(h.d1), Number(h.d2)].sort((a, b) => a - b) };
        if (f === 'mensual') return { frecuencia: 'mensual', dia: Number(h.dia), primera: h.atrasado ? M.ultimoDia(st.hoy, Number(h.dia)) : null };
        if (f === 'semanal') return { frecuencia: 'semanal', diaSemana: Number(h.diaSemana) };
        if (f === 'fechas') return { frecuencia: 'fechas', fechas: h.fechas };
        return { frecuencia: f, fecha: h.fecha };
    }
    /** Lo que falta en la parte de «¿cada cuánto?». */
    function faltanFrecuencia(h) {
        const f = h.frecuencia;
        if ((f === 'unico' || f === 'catorcenal' || f === 'trimestral' || f === 'anual') && !/^\d{4}-\d{2}-\d{2}$/.test(h.fecha || '')) return ['fecha'];
        if (f === 'mensual' && !h.dia) return ['dia'];
        if (f === 'quincenal' && h.qModo === 'otros' && !(diaValido(h.d1) && diaValido(h.d2) && Number(h.d1) !== Number(h.d2))) return ['d1'];
        if (f === 'fechas' && !(h.fechas || []).length) return ['fechas'];
        return [];
    }
    /** El bloque «¿Cada cuánto?» con su detalle: el mismo para pagos e ingresos. */
    function bloqueFrecuencia(h, { esIngreso = false, solo = null } = {}) {
        const st = P.st;
        const p = M.principal(st);
        const f = h.frecuencia;
        const lista = FRECUENCIAS.filter(([v]) => (!esIngreso || v !== 'trimestral') && (!solo || solo.includes(v))).map(([v, t]) => ({ v, t }));
        let detalle = '';
        if (f === 'unico') detalle = calendario(h, 'fecha', h.fecha, { label: esIngreso ? '¿Qué día llega?' : '¿Qué día vence?', ayuda: esIngreso ? '' : 'Si ya venció y no lo has pagado, elige esa fecha.' });
        else if (f === 'semanal') detalle = opciones(h, { campo: 'diaSemana', label: '¿Qué día?', lista: [1, 2, 3, 4, 5, 6, 0].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), valor: h.diaSemana });
        else if (f === 'catorcenal') detalle = calendario(h, 'fecha', h.fecha, { label: esIngreso ? '¿Cuándo te pagan la próxima vez?' : '¿Cuándo toca la próxima vez?', ayuda: 'Después se repite cada 14 días.' });
        else if (f === 'quincenal') {
            const modos = [...(p && p.frecuencia === 'quincenal' && !esIngreso ? [{ v: 'ingreso', t: `El mismo día que me pagan (${(p.dias || [15, 30]).map((d) => (d >= 31 ? 'último' : d)).join(' y ')})` }] : []), { v: '15-30', t: 'El 15 y el 30' }, { v: '15-31', t: 'El 15 y el último día' }, { v: 'otros', t: 'Otros días' }];
            detalle = opciones(h, { campo: 'qModo', label: '¿Qué días?', lista: modos, valor: h.qModo, columnas: true }) + (h.qModo === 'otros' ? `<div class="ob-2">${campoDia(h, 'd1', 'Primer día')}${campoDia(h, 'd2', 'Segundo día', '31 = último día del mes')}</div>` : '');
        } else if (f === 'mensual') {
            const prox = h.dia ? (h.atrasado ? M.ultimoDia(st.hoy, Number(h.dia)) : M.proximoDia(st.hoy, Number(h.dia))) : null;
            const puedeAtrasado = !esIngreso && h.dia && M.ultimoDia(st.hoy, Number(h.dia)) < st.hoy && !h.editar;
            detalle = selectorDia(h, 'dia', h.dia, '¿Qué día del mes? (29, 30 o 31: en meses cortos, el último día)') + (prox ? `<p class="fila-s">${h.atrasado ? 'Ya venció' : 'Próxima vez'}: <strong>${esc(M.capital(M.conDia(prox)))}</strong>${puedeAtrasado ? ` · <button type="button" class="link link--inline" data-a="valor" data-campo="atrasado" data-v="${!h.atrasado}" data-fk="np-atrasado">${h.atrasado ? 'No, ya lo pagué este mes' : '¿Ya venció y no lo has pagado?'}</button>` : ''}</p>` : '');
        } else if (f === 'trimestral' || f === 'anual') detalle = calendario(h, 'fecha', h.fecha, { label: '¿Cuándo toca la próxima vez?', ayuda: f === 'anual' ? 'Se repite cada año ese día.' : 'Se repite cada 3 meses ese día.' });
        else if (f === 'fechas') detalle = calendario(h, 'fechas', null, { label: 'Toca las fechas (puedes elegir varias)', multiple: h.fechas || [] });
        return `${opciones(h, { campo: 'frecuencia', label: '¿Cada cuánto?', lista, valor: f })}${detalle}`;
    }
    /** Elegir fechas a medida: tocar una fecha la agrega o la quita. */
    const alternarFecha = (h, v) => {
        const lista = new Set(h.fechas || []);
        if (lista.has(v)) lista.delete(v);
        else lista.add(v);
        h.fechas = [...lista].sort();
    };

    // ================================================================== NUEVO PAGO Y EDITAR PAGO
    const esCuchubal = (h) => /cuchubal/i.test(h.nombre || '');
    H.nuevoPago = {
        iniciar(h) {
            const st = P.st;
            if (h.id) {
                const p = M.pago(st, h.id);
                Object.assign(h, { nombre: p.nombre, emoji: p.emoji, categoria: p.categoria, monto: M.montoCampo(p.monto), estimado: p.estimado, medio: p.medio, hasta: p.hasta || '', tipoPago: p.tipoPago || null, editar: true, ...formFrecuencia(p) });
            } else Object.assign(h, { nombre: '', emoji: '🧾', categoria: 'otros', monto: '', estimado: false, frecuencia: 'mensual', qModo: '15-30', d1: '', d2: '', dia: null, diaSemana: 5, fecha: '', fechas: [], hasta: '', turno: '', turnoMonto: '', medio: st.medios[0] ? st.medios[0].id : null });
        },
        html(h) {
            const st = P.st;
            const cuchubal = esCuchubal(h);
            const suscripcion = h.tipoPago === 'suscripcion';
            const credito = st.medios.find((m) => m.tarjeta && !m.oculto);
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Nuevo pago',
                cuerpo: `${h.editar ? '' : `<div class="opciones-grandes opciones-grandes--2"><button type="button" class="opcion-g" data-a="valor" data-campo="frecuente" data-v="prestamo" data-fk="np-cuota">${caja('🏦')}<span class="opcion-g-txt"><span class="opcion-g-t">Cuota de un préstamo</span><span class="fila-s">Casa comercial, préstamo o vivienda</span></span></button><button type="button" class="opcion-g" aria-pressed="${suscripcion}" data-a="valor" data-campo="tipoPago" data-v="${suscripcion ? '' : 'suscripcion'}" data-fk="np-suscripcion">${caja('📺')}<span class="opcion-g-txt"><span class="opcion-g-t">Suscripción</span><span class="fila-s">Netflix, Spotify, celular, gimnasio…</span></span>${suscripcion ? icon('circle-check', 'ico-ok') : ''}</button></div>`}
                    ${h.editar ? '' : suscripcion ? opciones(h, { campo: 'servicio', label: '¿Cuál?', lista: D.SUSCRIPCIONES.map((x) => ({ v: x.id, t: x.nombre, e: x.emoji })), valor: h.servicio || '' }) : opciones(h, { campo: 'frecuente', label: 'Frecuentes', lista: D.PAGOS_FRECUENTES.filter((f) => !f.deuda).map((f) => ({ v: f.id, t: f.nombre, e: f.emoji })), valor: '' })}
                    ${campoTexto(h, { campo: 'nombre', label: '¿Qué pagas?', valor: h.nombre, placeholder: 'Ej. Colegio', errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: cuchubal ? '¿Cuánto aportas cada vez?' : '¿Cuánto?', valor: h.monto })}
                    <div class="chips"><button type="button" class="chip" aria-pressed="${h.estimado}" data-a="valor" data-campo="estimado" data-v="${!h.estimado}" data-fk="estimado">${h.estimado ? icon('check', 'ico-xs') : ''}Varía (es un estimado)</button></div>
                    ${bloqueFrecuencia(h, { solo: suscripcion ? ['mensual', 'anual'] : null })}
                    ${suscripcion && credito ? `<p class="fila-s">Con tarjeta de crédito, el cobro baja tu libre el día que se hace (V2-07).</p>` : ''}
                    ${cuchubal ? `${calendario(h, 'hasta', h.hasta || null, { label: '¿Hasta cuándo aportas? <span class="opcional">(opcional)</span>', min: st.hoy })}${h.editar ? '' : `${calendario(h, 'turno', h.turno || null, { label: '¿Cuándo es tu turno? <span class="opcional">(opcional)</span>', min: st.hoy, ayuda: 'Tu turno aparece como ingreso esperado.' })}${h.turno ? campoMonto(h, { campo: 'turnoMonto', label: '¿Cuánto te toca?', valor: h.turnoMonto, id: 'f-turnoMonto' }) : ''}`}` : ''}
                    ${opciones(h, { campo: 'medio', label: '¿Con qué lo pagas?', lista: medios(st), valor: h.medio })}`,
                pie: pie2('nuevoPagoOk', h.editar ? 'Guardar cambios' : 'Guardar'),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'frecuente') {
                const f = D.PAGOS_FRECUENTES.find((y) => y.id === v);
                // V2-24: la cuota de un préstamo abre el MISMO formulario que Mi dinero.
                if (f.deuda) {
                    setTimeout(() => {
                        P.ui.hoja = null;
                        P.abrirHoja('nuevaDeuda', { tipoInicial: f.deuda });
                        P.emitir('deuda:desdePagos');
                    });
                    return;
                }
                // V2-36: el cuchubal puede ser de cualquier frecuencia; se sugiere quincenal.
                Object.assign(h, { nombre: f.nombre, emoji: f.emoji, categoria: f.categoria, estimado: !!f.variable, frecuencia: f.id === 'cuchubal' ? 'quincenal' : f.semanal ? 'semanal' : 'mensual' });
            } else if (campo === 'tipoPago') {
                // V2-47: una suscripción es mensual o anual y se paga, si tienes, con tu tarjeta de crédito.
                h.tipoPago = v || null;
                if (v) {
                    const credito = P.st.medios.find((m) => m.tarjeta && !m.oculto);
                    Object.assign(h, { frecuencia: 'mensual', categoria: 'suscripciones', emoji: '📺', estimado: false, medio: credito ? credito.id : h.medio });
                } else Object.assign(h, { categoria: 'otros', emoji: '🧾' });
            } else if (campo === 'servicio') {
                const x = D.SUSCRIPCIONES.find((y) => y.id === v);
                Object.assign(h, { servicio: v, nombre: v === 'otra' ? '' : x.nombre, emoji: x.emoji });
            } else if (campo === 'estimado') h.estimado = v === 'true';
            else if (campo === 'atrasado') h.atrasado = v === 'true';
            else if (campo === 'fechas') alternarFecha(h, v);
            else if (campo === 'hasta' || campo === 'turno') h[campo] = h[campo] === v ? '' : v;
            else h[campo] = v;
            if (campo === 'dia') h.atrasado = false;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    H.editarPago = { ...H.nuevoPago };
    P.acciones.nuevoPagoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const turnoMonto = M.leerMonto(h.turnoMonto);
        const faltan = [...(h.nombre.trim() ? [] : ['nombre']), ...(monto ? [] : ['monto']), ...faltanFrecuencia(h), ...(h.turno && !turnoMonto ? ['turnoMonto'] : [])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        const regla = reglaForm(h);
        if (h.editar) {
            P.cambiar((s) => {
                const p = M.pago(s, h.id);
                for (const k of ['fecha', 'dias', 'dia', 'diaSemana', 'cadaMeses', 'fechas', 'conIngreso']) delete p[k];
                const { primera, ...r } = regla;
                Object.assign(p, { nombre: h.nombre.trim(), monto, estimado: h.estimado, medio: h.medio, ...P.reglaDe(r) });
                if (esCuchubal(h) && h.hasta) p.hasta = h.hasta;
                else delete p.hasta;
            }, { aviso: 'Cambios guardados', claves: ['guardado:pagoEditar'] });
            return;
        }
        P.cambiar(
            (s) => {
                P.crearPago(s, { nombre: h.nombre.trim(), emoji: h.emoji, categoria: h.categoria, monto, estimado: h.estimado, medio: h.medio, hasta: esCuchubal(h) && h.hasta ? h.hasta : null, tipoPago: h.tipoPago || undefined, ...regla });
                // El turno del cuchubal = un ingreso esperado de una vez.
                if (esCuchubal(h) && h.turno && turnoMonto) s.ingresos.push({ id: 'i' + s.seq++, nombre: 'Tu turno del cuchubal', emoji: '🤝', categoria: 'cuchubal', monto: turnoMonto, aprox: false, frecuencia: 'unico', fecha: h.turno, lugar: (s.lugares.find((l) => l.id === 'efectivo') || s.lugares[0]).id, principal: false, extra: true, desde: s.hoy, llegadas: {} });
            },
            { aviso: `${h.nombre.trim()}: guardado en Pagos`, claves: ['guardado:pago', 'guardado:pago:' + claveNombre(h.nombre)] },
        );
    };

    // ================================================================== ESTADO DE CUENTA DE LA TARJETA
    H.estadoCuenta = {
        iniciar(h) {
            const st = P.st;
            const info = M.tarjetaInfo(st, M.tarjeta(st, h.id));
            h.paso = 1;
            h.total = '';
            h.minimo = '';
            h.anotado = info.pendiente ? info.pendiente.anotado : 0;
            h.motivo = null;
            h.opcion = 'total';
            h.otro = '';
            h.ayuda = false;
        },
        foco: (h) => (h.paso === 1 ? '#f-total' : '#hoja-t'),
        html(h) {
            const st = P.st;
            const t = M.tarjeta(st, h.id);
            const info = M.tarjetaInfo(st, t);
            const pend = info.pendiente || { corte: info.ult.corte, vence: info.ult.vence };
            const total = M.leerMonto(h.total);
            const minimo = M.leerMonto(h.minimo);
            if (h.paso === 1) {
                return {
                    titulo: `Estado de cuenta · ${esc(t.nombre)}`,
                    cuerpo: `<p class="txt">Corte del ${esc(M.fechaLarga(pend.corte))}. Vence el ${esc(M.fechaLarga(pend.vence))}.</p>
                        <p class="campo-l">¿Cuánto te salió?</p>
                        ${campoMonto(h, { campo: 'total', label: 'Pago de contado (total)', valor: h.total, id: 'f-total', errorTexto: 'Escribe el pago de contado' })}
                        ${campoMonto(h, { campo: 'minimo', label: 'Pago mínimo', valor: h.minimo, id: 'f-minimo', errorTexto: 'Escribe el pago mínimo' })}
                        <button type="button" class="link" aria-expanded="${h.ayuda}" aria-controls="ec-ayuda" data-a="valor" data-campo="ayuda" data-v="${!h.ayuda}" data-fk="ec-ayuda-b">¿Dónde lo encuentro?</button>
                        <div id="ec-ayuda" ${h.ayuda ? '' : 'hidden'}><p class="txt">En tu estado de cuenta (te llega por correo o lo ves en la app del banco) busca «Pago de contado» o «Saldo al corte», y «Pago mínimo».</p></div>`,
                    pie: pie2('ecSiguiente', 'Siguiente'),
                };
            }
            if (h.paso === 2) {
                const dif = total - h.anotado;
                return {
                    titulo: `¿Qué son los ${dinero(Math.abs(dif))}?`,
                    cuerpo: `<p class="txt">Anotaste ${dinero(h.anotado)} con esta tarjeta; el estado dice ${dinero(total)}.</p>
                        ${opciones(h, { campo: 'motivo', label: 'Elige lo que creas; no hace falta saberlo exacto.', lista: [{ v: 'intereses', t: 'Intereses o cargos' }, { v: 'compras', t: 'Compras que no anoté' }, { v: 'nose', t: 'No sé' }], valor: h.motivo, columnas: true, errorTexto: 'Elige una opción' })}`,
                    pie: pie2('ecSiguiente', 'Siguiente', { cancelar: 'Cancelar' }),
                };
            }
            const resto = total - minimo;
            return {
                titulo: `¿Cuánto vas a pagar el ${M.partes(pend.vence)[2]} ${M.MESES_CORTOS[M.partes(pend.vence)[1] - 1]}?`,
                cuerpo: `<div class="opciones-grandes" role="radiogroup" aria-label="Cuánto vas a pagar">
                        ${[['total', 'Todo', total, 'No te cobran intereses por estas compras.'], ['minimo', 'El mínimo', minimo, `Los ${dinero(resto)} que quedan siguen como deuda y generan intereses.`], ['otro', 'Otro monto', null, 'Entre el mínimo y el total.']]
                            .map(([v, t, m, s]) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.opcion === v}" data-a="valor" data-campo="opcion" data-v="${v}" data-fk="ec-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${t}${m !== null ? ` · ${dinero(m)}` : ''}</span><span class="fila-s">${s}</span></span></button>`)
                            .join('')}
                    </div>
                    ${h.opcion === 'otro' ? campoMonto(h, { campo: 'otro', label: '¿Cuánto?', valor: h.otro, id: 'f-otro', errorTexto: 'Escribe cuánto vas a pagar' }) : ''}
                    <div class="nota nota--consejo" role="note">${icon('lightbulb')}<p><strong>Un consejo:</strong> pagar el total es lo que menos te cuesta. Si este mes no se puede, pagar más que el mínimo ya ayuda. Tú decides; aquí lo verás claro.</p></div>
                    <p class="fila-s">Lo que decidas pagar baja tu libre desde hoy.</p>`,
                pie: pie2('ecGuardar', 'Guardar'),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'ayuda') h.ayuda = v === 'true';
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.ecSiguiente = () => {
        const h = P.ui.hoja;
        const total = M.leerMonto(h.total);
        const minimo = M.leerMonto(h.minimo);
        if (h.paso === 1) {
            const faltan = [...(total ? [] : ['total']), ...(minimo !== null ? [] : ['minimo'])];
            if (!validar(h, faltan)) return;
            h.intento = false;
            h.paso = h.anotado > 0 && total !== h.anotado ? 2 : 3;
        } else if (h.paso === 2) {
            if (!validar(h, h.motivo ? [] : ['motivo'])) return;
            h.intento = false;
            h.paso = 3;
        }
        P.render({ foco: '#hoja-t' });
        P.emitir('estado:paso' + h.paso);
    };
    P.acciones.ecGuardar = () => {
        const h = P.ui.hoja;
        const total = M.leerMonto(h.total);
        const minimo = M.leerMonto(h.minimo);
        const aPagar = h.opcion === 'total' ? total : h.opcion === 'minimo' ? minimo : M.leerMonto(h.otro);
        if (!validar(h, aPagar ? [] : ['otro'])) return;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const t = M.tarjeta(s, h.id);
                const info = M.tarjetaInfo(s, t);
                const pend = info.pendiente;
                const dif = h.anotado ? total - h.anotado : 0;
                const e = { corte: pend.corte, total, minimo, aPagar, opcion: h.opcion, vence: pend.vence, anotado: h.anotado, diferencia: dif > 0 ? dif : 0, motivo: h.motivo };
                if (t.estados.at(-1).inicial) t.estados.pop();
                t.estados.push(e);
                if (dif > 0) {
                    P.registrar(s, { tipo: 'cargoTarjeta', fecha: pend.corte, monto: dif, tarjeta: t.id, motivo: h.motivo || 'nose', nombre: t.nombre + ' sin detalle' });
                    if (h.motivo === 'intereses') t.interesesAnio = (t.interesesAnio || 0) + dif;
                }
            },
            { aviso: 'Estado de cuenta guardado', claves: ['guardado:estado', 'guardado:estado:' + h.opcion] },
        );
    };
    H.decidirPago = {
        iniciar(h) {
            const ult = M.tarjetaInfo(P.st, M.tarjeta(P.st, h.id)).ult;
            h.paso = 3;
            h.total = M.montoCampo(ult.total);
            h.minimo = M.montoCampo(ult.minimo);
            h.opcion = ult.opcion;
            h.otro = ult.opcion === 'otro' ? M.montoCampo(ult.aPagar) : '';
        },
        html: (h) => H.estadoCuenta.html(h),
        alValor: (h, c, v) => H.estadoCuenta.alValor(h, c, v),
        alCampo: (h, c, el) => H.estadoCuenta.alCampo(h, c, el),
    };
    // decidirPago reutiliza el paso 3 pero guarda sobre el estado existente.
    const ecGuardarOriginal = P.acciones.ecGuardar;
    P.acciones.ecGuardar = () => {
        const h = P.ui.hoja;
        if (h.tipo !== 'decidirPago') return ecGuardarOriginal();
        const aPagar = h.opcion === 'total' ? M.leerMonto(h.total) : h.opcion === 'minimo' ? M.leerMonto(h.minimo) : M.leerMonto(h.otro);
        if (!validar(h, aPagar ? [] : ['otro'])) return;
        P.ui.hoja = null;
        P.cambiar((s) => Object.assign(M.tarjetaInfo(s, M.tarjeta(s, h.id)).ult, { aPagar, opcion: h.opcion }), { aviso: 'Guardado', claves: ['guardado:decision:' + h.opcion] });
    };

    // ================================================================== EDITAR UN REGISTRO (Mes corrige)
    H.editarRegistro = {
        iniciar(h) {
            const r = P.st.registros.find((x) => x.id === h.id);
            h.orig = { monto: M.montoCampo(r.monto), nombre: r.nombre || '', medio: r.medio || null, fecha: r.fecha, categoria: r.categoria || null, lugar: r.lugar || null, apartado: null };
            Object.assign(h, structuredClone(h.orig));
            h.verApartados = false;
        },
        html(h) {
            const st = P.st;
            const r = st.registros.find((x) => x.id === h.id);
            const antes = M.anteriorAlCuadre(st, { ...r, fecha: h.fecha, medio: h.medio || r.medio, lugar: h.lugar || r.lugar });
            const cambios = hayCambiosRegistro(h);
            const pago = r.pago ? M.pago(st, r.pago) : null;
            const conApartados = st.apartados.filter((a) => a.monto > 0);
            const puedeApartado = r.tipo === 'gasto' && !r.pago && !r.apartado && conApartados.length;
            const ap = h.apartado ? M.apartado(st, h.apartado) : null;
            const bloqueApartado = r.apartado
                ? `<div class="nota nota--ok" role="note">${icon('check')}<p>Lo tomaste de tu ahorro <strong>${esc(r.apartadoNombre || '')}</strong>.</p></div>`
                : puedeApartado
                  ? `<div class="campo-g"><button type="button" class="link link--start" aria-expanded="${h.verApartados || !!ap}" aria-controls="ed-apartados" data-a="valor" data-campo="verApartados" data-v="${!(h.verApartados || !!ap)}" data-fk="ed-tomar">${icon('circle-plus', 'ico-s')}Tomarlo de un ahorro</button>
                     <div id="ed-apartados" ${h.verApartados || ap ? '' : 'hidden'}>${opciones(h, { campo: 'apartado', label: '¿De cuál ahorro salió?', lista: [...conApartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), { v: '', t: 'De ninguno' }], valor: h.apartado || '' })}
                     ${ap ? (() => {
                         const cierra = !!ap.metaFecha || !!(ap.meta && ap.monto >= ap.meta);
                         return `<div class="nota nota--ok" role="note">${icon('check')}<p>Sale de tu ahorro <strong>${esc(ap.nombre)}</strong>: tu libre sube ${dinero(cierra ? ap.monto : Math.min(ap.monto, M.leerMonto(h.monto) || 0))}.${cierra ? ' El ahorro se cierra.' : ''}</p></div>`;
                     })() : ''}</div></div>`
                  : '';
            return {
                titulo: 'Corregir',
                cuerpo: `${pago ? `<p class="txt">${emo(pago.emoji, 18)} Tu pago de ${esc(pago.nombre)}, marcado como pagado.</p>` : ''}${antes.length ? `<div class="nota nota--info" role="note">${icon('info')}<p>Es anterior a tu cuadre de ${esc(antes.map((l) => `${l.nombre} (${M.fechaCorta(l.cuadre.fecha)})`).join(' y '))}: <strong>corregirlo no cambia tu saldo porque cuadraste después.</strong> Sí cambia el resumen del mes.</p></div>` : ''}
                    ${campoMonto(h, { label: 'Monto', valor: h.monto })}
                    ${r.tipo === 'gasto' || r.tipo === 'ingreso' ? campoTexto(h, { campo: 'nombre', label: r.tipo === 'gasto' ? '¿En qué?' : '¿De qué?', valor: h.nombre }) : ''}
                    ${r.tipo === 'gasto' && !r.pago ? opciones(h, { campo: 'categoria', label: 'Tipo de gasto', lista: D.CATEGORIAS.filter((k) => !['servicios', 'cuotas'].includes(k.id)).map((k) => ({ v: k.id, t: k.nombre, e: k.emoji })), valor: h.categoria }) : ''}
                    ${r.tipo === 'gasto' ? opciones(h, { campo: 'medio', label: 'Pagado con', lista: medios(st), valor: h.medio }) : ''}
                    ${r.tipo === 'ingreso' ? opciones(h, { campo: 'lugar', label: '¿Dónde cayó?', lista: lugares(st), valor: h.lugar }) : ''}
                    ${campoFecha(h, 'fecha', h.fecha, { label: 'Fecha', extra: h.orig.fecha })}
                    ${bloqueApartado}
                    ${r.pago ? (h.confirmarEliminar ? confirmarHtml('¿Desmarcar este pago?', 'Vuelve a quedar pendiente en Pagos y se quita su gasto. Podrás deshacerlo.', 'desmarcarPagado', 'desmarcar', 'Sí, desmarcar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="desmarcar">${icon('rotate-ccw', 'ico-s')}Desmarcar pagado</button>`) : h.confirmarEliminar ? confirmarHtml('¿Eliminar este movimiento?', 'Sale de tu historial y tus números se recalculan. Podrás deshacerlo.', 'eliminarRegistro', 'eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="eliminar">${icon('trash-2', 'ico-s')}Eliminar</button>`}`,
                nota: cambios ? '' : 'Sin cambios por guardar',
                pie: `<button type="button" class="btn btn--48" data-a="cerrarHoja" data-fk="hoja-cancelar">Cancelar</button><button type="button" class="btn btn--48 btn--prim" data-a="editarRegistroOk" data-fk="hoja-ok" ${cambios ? '' : 'disabled'}>Guardar cambios</button>`,
            };
        },
        alValor(h, campo, v) {
            if (campo === 'confirmarEliminar') h.confirmarEliminar = v === 'si';
            else if (campo === 'verApartados') h.verApartados = v === 'true';
            else if (campo === 'apartado') h.apartado = v || null;
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
            const cambios = hayCambiosRegistro(h);
            const b = document.querySelector('[data-a="editarRegistroOk"]');
            if (b) b.disabled = !cambios;
            const nota = document.querySelector('.hoja-nota');
            if (nota) nota.textContent = cambios ? '' : 'Sin cambios por guardar';
        },
    };
    /** Comparación normalizada de lo original con lo actual: gobierna «Guardar cambios». */
    function hayCambiosRegistro(h) {
        const norm = (x) => JSON.stringify({ monto: M.leerMonto(x.monto), nombre: (x.nombre || '').trim(), medio: x.medio, fecha: x.fecha, categoria: x.categoria, lugar: x.lugar, apartado: x.apartado || null });
        return norm(h) !== norm(h.orig);
    }
    P.acciones.editarRegistro = (d) => {
        if (P.ui.toast) {
            P.ui.toast = null;
            P.renderToast();
        }
        P.abrirHoja('editarRegistro', { id: d.id });
    };
    P.acciones.editarRegistroOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        P.ui.hoja = null;
        const libreAntes = P.calc().libre;
        P.cambiar(
            (s) => {
                const r = s.registros.find((x) => x.id === h.id);
                Object.assign(r, { monto, nombre: h.nombre.trim() || r.nombre, fecha: h.fecha });
                if (r.tipo === 'gasto') Object.assign(r, { medio: h.medio, categoria: h.categoria || r.categoria });
                if (r.tipo === 'ingreso') r.lugar = h.lugar;
                if (r.pago) {
                    const p = M.pago(s, r.pago);
                    const hecho = p && Object.values(p.hechos).find((x) => x.registro === r.id);
                    if (hecho) {
                        if (p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined) p.deuda.debe = Math.max(0, p.deuda.debe + (hecho.monto || 0) - monto);
                        hecho.monto = monto;
                    }
                }
                // V2-23 b: arreglar hacia atrás un gasto que debió salir de un apartado.
                if (h.apartado && r.tipo === 'gasto' && !r.apartado) return P.usarApartado(s, h.apartado, r);
                return null;
            },
            {
                aviso: (u) => {
                    const sube = P.calc().libre - libreAntes;
                    return u ? `Salió de tu ahorro ${M.apartado(P.deshacer.at(-1), h.apartado)?.nombre || ''}${sube > 0 ? `. Tu libre sube ${dinero(sube)}` : ''}` : 'Cambios guardados';
                },
                claves: ['guardado:correccion', ...(h.apartado ? ['guardado:correccion:apartado'] : [])],
            },
        );
    };
    P.acciones.desmarcarPagado = () => {
        const h = P.ui.hoja;
        const r = P.st.registros.find((x) => x.id === h.id);
        const p = r && M.pago(P.st, r.pago);
        P.ui.hoja = null;
        P.cambiar((s) => P.desmarcarPagado(s, h.id), { aviso: `${p ? p.nombre : 'El pago'}: ya no está pagado`, claves: ['guardado:desmarcar'] });
    };
    P.acciones.eliminarRegistro = () => {
        const h = P.ui.hoja;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const r = s.registros.find((x) => x.id === h.id);
                s.registros = s.registros.filter((x) => x.id !== h.id);
                if (r.ingreso && r.ocurrencia && M.ingreso(s, r.ingreso)) {
                    delete M.ingreso(s, r.ingreso).llegadas[r.ocurrencia];
                    // Revisión v2.3: si ese ingreso traía un descuento del salario, el descuento también se deshace.
                    for (const p of M.descuentosDe(s, r.ingreso)) {
                        const hecho = p.hechos[r.ocurrencia];
                        if (!hecho || !hecho.descuento) continue;
                        if (p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined) p.deuda.debe += hecho.monto || 0;
                        delete p.hechos[r.ocurrencia];
                    }
                }
            },
            { aviso: 'Eliminado', claves: ['guardado:eliminar'] },
        );
    };

    // ================================================================== PANTALLA: REPARTE (quincena, semana o ingreso extra)
    /**
     * V2-29 #7: si hay meta con fecha, lo que falta ÷ los pagos que quedan hasta esa fecha; si no,
     * 10 % a Emergencias. Siempre editable («Otro monto») y nunca más que el libre (se limita al pintar).
     */
    function sugerencias(st, monto, top) {
        const p = M.ingreso(st, top.id);
        const conFecha = st.apartados.filter((a) => a.meta && a.metaFecha && a.monto < a.meta && a.metaFecha >= st.hoy);
        if (conFecha.length) {
            return conFecha.map((a) => {
                const pagos = p && p.frecuencia !== 'unico' ? Math.max(1, M.fechasRegla(p, top.fecha || st.hoy, a.metaFecha).length) : 1;
                return { id: a.id, monto: Math.ceil((a.meta - a.monto) / pagos / 100) * 100, regla: `Te faltan ${dinero(a.meta - a.monto)} para el ${M.fechaLarga(a.metaFecha)}: ${pagos === 1 ? 'este pago' : `${pagos} pagos`}` };
            });
        }
        const em = st.apartados.find((a) => M.normalizar(a.nombre).includes('emergencia'));
        const diez = Math.round(monto / 10 / 500) * 500;
        if (!em || diez <= 0) return [];
        return [{ id: em.id, monto: em.meta ? Math.min(diez, Math.max(0, em.meta - em.monto)) : diez, regla: 'El 10 % de lo que te cayó' }].filter((x) => x.monto > 0);
    }
    S.reparte = function (top) {
        const st = P.st;
        const ing = M.ingreso(st, top.id);
        if (!top.sugerencias) top.sugerencias = sugerencias(st, top.monto, top);
        top.hechas = top.hechas || {};
        const k = P.calc();
        const hz = k.hz;
        const quePalabra = ing.principal ? (ing.frecuencia === 'quincenal' ? 'tu quincena' : ing.frecuencia === 'semanal' ? 'tu pago de la semana' : 'tu ' + ing.nombre.toLowerCase()) : 'lo ' + P.deQuien(ing);
        // Revisión v2.3: si llegó antes de su quincena (otro ingreso), se dice y se puede usar desde ya.
        const adelanto = k.reservasProxima.find((r) => r.adelanto && r.adelanto.ingreso.id === ing.id && r.adelanto.fecha === top.fecha);
        // ¿Hoy también esperabas otro ingreso (la pareja, la remesa)? Se confirma aquí mismo.
        const otros = [];
        for (const x of st.ingresos.filter((i) => i.id !== ing.id && i.activo !== false && i.frecuencia !== 'unico')) {
            const o = M.ocurrenciasIngreso(st, x, M.sumarDias(st.hoy, -20), st.hoy).filter((y) => y.estado === 'porConfirmar' || y.estado === 'hoy').at(-1);
            if (o) otros.push(o);
        }
        const otrosHtml = otros.length ? P.tarjetaSeccion('¿También te cayó…?', `<ul class="lista">${otros.map((o) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(o.ingreso.emoji)}<span class="fila-txt"><span class="fila-t">${esc(o.ingreso.nombre)}</span><span class="fila-s">${dinero(o.monto, { aprox: o.aprox })} · ${o.fecha === st.hoy ? 'hoy' : 'del ' + M.fechaCorta(o.fecha)}</span></span></div><button type="button" class="btn btn--sm btn--prim" data-a="hoja" data-hoja="ingresoLlego" data-id="${o.ingreso.id}" data-fecha="${o.fecha}" data-fk="rep-otro-${o.ingreso.id}">Sí, me cayó</button></li>`).join('')}</ul>`, { id: 'rep-otros' }) : '';
        const linea = (o, sub) => `<li><span>${emo(o.pago.emoji, 16)} ${esc(o.pago.nombre)} <span class="d-sub">${sub}</span></span><span>${dinero(o.parte, { aprox: o.estimado })}</span></li>`;
        const contado = [
            ...k.items.map((o) => linea(o, o.estado === 'vencido' ? 'venció el ' + M.partes(o.fecha)[2] : M.fechaCorta(o.fecha))),
            ...k.tarjetas.filter((t) => t.enLibre).map((t) => `<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">ya estaba contado</span></span><span>${dinero(t.enLibre)}</span></li>`),
            ...k.reservados.map((o) => linea(o, `reservado · vence el ${M.fechaCorta(o.fecha)}`)),
            ...k.reservasProxima.map((r) => filaReserva(r)),
        ];
        const totalContado = k.porPagar + k.enTarjetas + k.reservadoPagos + k.reservadoProxima;
        const proximo = hz.ingreso ? (hz.ingreso.frecuencia === 'quincenal' ? 'tu próxima quincena' : hz.ingreso.frecuencia === 'semanal' ? 'tu próximo pago' : 'tu próximo ingreso') + ` (${M.fechaLarga(hz.fecha)})` : 'fin de mes';
        const sug = top.sugerencias
            .map((x) => {
                const a = M.apartado(st, x.id);
                if (!a) return '';
                const hecha = top.hechas[x.id];
                const monto = Math.min(x.monto, k.libre);
                const acciones = hecha
                    ? `<p class="sug-ok">${icon('circle-check', 'ico-xs')}Ahorraste ${dinero(hecha)}</p>`
                    : monto > 0
                      ? `<div class="chips"><button type="button" class="chip chip--prim" data-a="reparteApartar" data-id="${a.id}" data-m="${monto}" data-fk="sug-${a.id}">Ahorrar ${dinero(monto)}</button><button type="button" class="chip" data-a="hoja" data-hoja="apartar" data-id="${a.id}" data-fk="sug-otro-${a.id}">Otro monto</button></div>`
                      : `<p class="fila-s">Hoy no te queda libre para ahorrar.</p>`;
                return `<li class="sug">${P.recorte(a)}<div class="sug-txt"><p class="fila-t">${emo(a.emoji, 16)} ${esc(a.nombre)}</p><p class="fila-s">${a.meta ? `${dinero(a.monto)} de ${dinero(a.meta)}` : `${dinero(a.monto)} · sin meta`}${x.regla ? ` · ${esc(x.regla)}` : ''}</p>
                    ${acciones}</div></li>`;
            })
            .join('');
        // V2-35: cómo quedas el próximo día de pago y, si quieres, pasar algo de lo que te sobra.
        const x = k.proxima;
        const prox = x && hz.ingreso
            ? P.tarjetaSeccion('3. ¿Cómo quedas la próxima?', `<p class="txt txt--card"><strong>${esc(P.tituloPeriodo(x, hz))}:</strong> ${esc(P.lineaPeriodo(x))}.${P.incluyePeriodo(x) ? ` ${esc(M.capital(P.incluyePeriodo(x)))}.` : ''}</p>
                ${x.deficit > 0 ? `<div class="nota nota--ambar" role="note">${icon('triangle-alert')}<p>Te faltarían ${dinero(x.deficit, { aprox: true })}. ¿Guardas algo de esta?</p></div>` : ''}
                <div class="card-pie"><button type="button" class="btn btn--full" data-a="hoja" data-hoja="pasarProxima" data-fk="rep-pasar" ${k.libre > 0 ? '' : 'disabled'}>${icon('calendar-days', 'ico-s')}¿Pasas algo de lo que te sobra a la próxima?</button></div>`, { id: 'rep-prox' })
            : '';
        return `<div class="pg pg--flujo">
            <header class="pg-head"><p class="paso">${emo(ing.emoji, 18)} Llegó ${esc(quePalabra)}</p><h1 class="h1" tabindex="-1">Reparte ${esc(quePalabra)}</h1><p class="sub">Te cayeron <strong>${dinero(top.monto)}</strong> en ${esc(M.lugar(st, ing.lugar).nombre)}.${(top.otros || []).length ? ` Y también ${esc(P.lista(top.otros.map((o) => `${dinero(o.monto)} de ${o.nombre}`)))}.` : ''}</p></header>
            ${adelanto ? `<div class="nota nota--info" role="note">${icon('calendar-days')}<p><strong>Llegó antes de ${esc(P.etiquetaFuente(adelanto.para))}:</strong> la guardamos para esa quincena, así que no suma a tu libre de hoy. <button type="button" class="link link--inline" data-a="usarAdelanto" data-id="${ing.id}" data-fecha="${top.fecha}" data-fk="rep-usar-adelanto">Usarla desde ya</button></p></div>` : ''}
            ${otrosHtml}
            ${P.tarjetaSeccion('1. Ya está contado', `<p class="txt txt--card">Esto vence antes de ${esc(proximo)} o ya lo reservaste, y ya lo separamos de tu libre:</p><ul class="d-items d-items--card">${contado.join('') || '<li><span>Nada por pagar en estas fechas.</span><span></span></li>'}${contado.length ? `<li class="d-total-li"><span>Total contado</span><span>${dinero(totalContado)}</span></li>` : ''}</ul>`, { id: 'rep-contado' })}
            ${top.sugerencias.length ? P.tarjetaSeccion('2. ¿Quieres ahorrar algo?', `<p class="txt txt--card">Te sugerimos; tú decides. Nada se ahorra solo.</p><ul class="sugs">${sug}</ul>`, { id: 'rep-sug' }) : P.tarjetaSeccion('2. ¿Quieres ahorrar algo?', `<p class="txt txt--card">Cuando tengas un ahorro, aquí te sugeriremos cuánto ponerle. Nada se ahorra solo.</p>`, { id: 'rep-sug' })}
            ${prox}
            ${cuadreReparte(st, top, prox ? 4 : 3)}
            <section class="portada portada--quieta app-home-pattern" aria-label="Tu libre"><svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.circles}</svg><div class="portada-b portada-b--quieta"><span class="portada-h">${esc(P.textoHorizonte(hz))}</span><span class="portada-l">Te queda libre</span><span class="portada-n" aria-live="polite">${dinero(k.libre)}</span><span class="portada-s">${k.porDia !== null ? `~${dinero(k.porDia, { aprox: true }).replace('~', '')} por día` : k.libre <= 0 ? esc(P.textoCero(k)) : ''}</span></div></section>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="reparteListo" data-fk="rep-listo">Listo</button>
        </div>`;
    };
    P.acciones.reparteApartar = (d) => {
        const top = P.ui.stack.at(-1);
        const monto = Number(d.m);
        P.cambiar((s) => P.apartarEn(s, d.id, monto, 'apartar'), { aviso: `Ahorraste ${dinero(monto)}`, claves: ['guardado:apartar', 'reparte:apartar'] });
        top.hechas[d.id] = monto;
        P.render({ foco: '#rep-sug' });
    };
    /** «3. ¿Cuadramos?»: cuánto tienes en cada lugar; al tocar Listo queda como cuadre. */
    function cuadreReparte(st, top, n = 3) {
        top.cuadres = top.cuadres || {};
        const filas = st.lugares
            .map((l) => {
                const esperado = M.saldoLugar(st, l.id);
                if (top.cuadres[l.id] === undefined) top.cuadres[l.id] = M.montoCampo(esperado);
                const m = M.leerMonto(top.cuadres[l.id]);
                const dif = m === null ? null : m - esperado;
                return `<li class="ad-item">${caja(l.emoji)}<div class="ad-txt"><p class="fila-t">${esc(l.nombre)}</p><div class="campo-g"><label class="campo-l" for="rc-${l.id}">¿Cuánto tienes ahora?</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="rc-${l.id}" data-campo="repCuadre" data-l="${l.id}" type="text" inputmode="decimal" value="${esc(top.cuadres[l.id])}"></div></div><p class="fila-s" id="rc-dif-${l.id}" aria-live="polite">${textoDif(esperado, dif)}</p></div></li>`;
            })
            .join('');
        return P.tarjetaSeccion(`${n}. ¿Cuadramos?`, `<p class="txt txt--card">Mira tu cartera y la app del banco. No tiene que ser exacto; si no quieres, déjalo como está.</p><ul class="lista-ad">${filas}</ul>`, { id: 'rep-cuadre' });
    }
    const textoDif = (esperado, dif) => (dif === null ? '' : dif === 0 ? `Según lo anotado: ${dinero(esperado)}. Cuadra exacto.` : `Según lo anotado: ${dinero(esperado)}. ${dinero(Math.abs(dif))} ${dif < 0 ? 'salieron' : 'entraron'} sin detalle.`);
    P.reparteCampo = function (el) {
        const top = P.ui.stack.at(-1);
        top.cuadres[el.dataset.l] = el.value;
        const esperado = M.saldoLugar(P.st, el.dataset.l);
        const m = M.leerMonto(el.value);
        const p = document.getElementById('rc-dif-' + el.dataset.l);
        if (p) p.textContent = textoDif(esperado, m === null ? null : m - esperado);
    };
    P.acciones.reparteListo = () => {
        const top = P.ui.stack.at(-1);
        const cuadres = Object.entries(top.cuadres || {}).map(([l, v]) => [l, M.leerMonto(v)]).filter(([, m]) => m !== null);
        if (cuadres.length) P.cambiar((s) => cuadres.forEach(([l, m]) => P.cuadrar(s, l, m)), { aviso: null, claves: ['reparte:cuadre'] });
        P.irTab('hoy');
        P.emitir('reparte:fin');
    };

    // ================================================================== PANTALLA: LOGRO (meta cumplida)
    S.logro = function (top) {
        const st = P.st;
        const k = P.calc();
        const m = M.medio(st, top.medio);
        const res = top.reserva ? (st.reservasTarjeta || []).find((x) => x.id === top.reserva) : null;
        const t = m && m.tarjeta ? M.tarjeta(st, m.tarjeta) : null;
        const info = t ? M.tarjetaInfo(st, t) : null;
        // V2-27: usado con crédito: el dinero del apartado queda reservado para el pago de la tarjeta.
        if (t && (res || top.pagoYa)) {
            const banco = st.lugares.find((l) => l.tipo === 'banco');
            const cuerpo = top.pagoYa
                ? `<p class="txt centro">Pagaste ${dinero(top.pagoYa)} a tu ${esc(t.nombre)} desde ${esc(banco ? banco.nombre : 'tu banco')}.${res ? ` Quedan ${dinero(info.reservado)} guardados para el pago del ${esc(P.diaPago(info, info.venceCompras))}.` : ' La reserva ya no hace falta.'}</p>
                   <div class="nota nota--ok" role="note">${icon('check')}<p>Tu libre sigue en ${dinero(k.libre)}: ese dinero ya estaba en tus ahorros.</p></div>
                   <div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="irTab" data-tab="midinero" data-fk="logro-entendido">Entendido</button></div>`
                : `<p class="txt centro">Pagaste con tu tarjeta, así que tus <strong>${dinero(res.monto)}</strong> quedan guardados para el pago del ${esc(P.diaPago(info, info.venceCompras))}.</p>
                   <div class="nota nota--ok" role="note">${icon('check')}<p>Tu libre no cambió (${dinero(k.libre)}). «${esc(top.nombre)}» queda en tus logros.</p></div>
                   <div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="irTab" data-tab="midinero" data-fk="logro-entendido">Entendido</button><button type="button" class="btn btn--48 btn--full" data-a="logroPagarYa" data-fk="logro-pagar-ya">${icon('arrow-left-right', 'ico-s')}Pagar la tarjeta ya</button></div>`;
            return `<div class="pg pg--flujo pg--logro">
                <div class="ilus-centro"><svg class="app-illustration app-illustration--large" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.meta}</svg></div>
                <h1 class="h1 centro" tabindex="-1">${icon('circle-check', 'ico-ok')}¡Meta cumplida!</h1>
                ${cuerpo}
            </div>`;
        }
        return `<div class="pg pg--flujo pg--logro">
            <div class="ilus-centro"><svg class="app-illustration app-illustration--large" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.meta}</svg></div>
            <h1 class="h1 centro" tabindex="-1">¡Meta cumplida!</h1>
            <p class="txt centro">Juntaste <strong>${dinero(top.juntado)}</strong> para «${esc(top.nombre)}» y ya lo usaste. Queda en tus logros.</p>
            <div class="nota nota--ok" role="note">${icon('check')}<p>Tu libre no cambió (${dinero(k.libre)}): ese dinero ya estaba en tus ahorros.</p></div>
            <div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="irTab" data-tab="hoy" data-fk="logro-hoy">Ir a Hoy</button><button type="button" class="btn btn--48 btn--full" data-a="irTab" data-tab="midinero" data-fk="logro-md">Ver Mi dinero</button></div>
        </div>`;
    };
    /** «Pagar la tarjeta ya»: mover del banco a la tarjeta en ese momento; la reserva desaparece. */
    P.acciones.logroPagarYa = () => {
        const top = P.ui.stack.at(-1);
        const res = (P.st.reservasTarjeta || []).find((x) => x.id === top.reserva);
        if (res) P.abrirHoja('pagarYa', { id: res.id });
    };
    /** «¿Cuánto pagas? [Solo la laptop] [Todo lo que debes] [Otro]»: nada se salda en automático. */
    H.pagarYa = {
        iniciar(h) {
            h.opcion = 'compra';
            h.otro = '';
            const st = P.st;
            h.lugar = (st.lugares.find((l) => l.tipo === 'banco') || st.lugares[0]).id;
        },
        html(h) {
            const st = P.st;
            const res = (st.reservasTarjeta || []).find((x) => x.id === h.id);
            if (!res) return { titulo: 'Listo', cuerpo: '', pie: pie1('cerrarHoja', 'Cerrar') };
            const t = M.tarjeta(st, res.tarjeta);
            const info = M.tarjetaInfo(st, t);
            const op = (v, titulo, sub) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.opcion === v}" data-a="valor" data-campo="opcion" data-v="${v}" data-fk="py-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${titulo}</span><span class="fila-s">${sub}</span></span></button>`;
            return {
                titulo: '¿Cuánto pagas?',
                cuerpo: `<p class="txt">Desde ${esc(M.lugar(st, h.lugar).nombre)} a tu ${esc(t.nombre)}. Pagar la tarjeta mueve tu dinero: no es un gasto nuevo y tu libre no cambia.</p>
                    <div class="opciones-grandes" role="radiogroup" aria-label="Cuánto pagas">
                        ${op('compra', `Solo ${esc(res.de ? P.conArticulo(res.de) : 'la compra')} · ${dinero(res.monto)}`, info.porPagarEstado ? `Tu pago del ${esc(P.diaPago(info, info.ult.vence))} (${dinero(info.porPagarEstado)}) sigue igual.` : 'Lo que usaste de tu ahorro.')}
                        ${op('todo', `Todo lo que debes · ${dinero(info.debeTotal)}`, 'Estado de cuenta y compras nuevas.')}
                        ${op('otro', 'Otro monto', 'Lo que tú quieras.')}
                    </div>
                    ${h.opcion === 'otro' ? campoMonto(h, { campo: 'otro', label: '¿Cuánto?', valor: h.otro, id: 'f-otro', errorTexto: 'Escribe cuánto pagas' }) : ''}`,
                pie: pie2('pagarYaOk', 'Pagar', { fk: 'py-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.pagarYaOk = () => {
        const h = P.ui.hoja;
        const st = P.st;
        const res = (st.reservasTarjeta || []).find((x) => x.id === h.id);
        const info = M.tarjetaInfo(st, M.tarjeta(st, res.tarjeta));
        const monto = h.opcion === 'compra' ? res.monto : h.opcion === 'todo' ? info.debeTotal : M.leerMonto(h.otro);
        if (!validar(h, monto ? [] : ['otro'])) return;
        const top = P.ui.stack.at(-1);
        P.ui.hoja = null;
        top.pagoYa = monto;
        P.cambiar((s) => P.pagarTarjeta(s, res.tarjeta, { monto, lugar: h.lugar, fecha: s.hoy, soltarReserva: h.opcion === 'otro' ? null : res.id, aCompras: h.opcion === 'compra' }), { aviso: 'Pago de tarjeta guardado', claves: ['guardado:pagoTarjeta', 'logro:pagarYa', 'logro:pagarYa:' + h.opcion] });
        P.render({ foco: '#pantalla h1' });
    };

    // ================================================================== PANTALLA: PONGÁMONOS AL DÍA
    S.aldia = function (top) {
        const st = P.st;
        if (!top.paso) {
            top.paso = 1;
            top.inicio = structuredClone(st);
            top.ingresos = {};
            top.pagos = {};
            top.cuadres = {};
        }
        const atrasadas = P.ingresosPorConfirmar();
        const vencidos = [];
        for (const p of st.pagos.filter((x) => x.activo !== false)) for (const o of M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido') vencidos.push(o);
        for (const o of M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido') vencidos.push(o);
        const pasos = 3;
        const cab = (n, t, s) => `<header class="pg-head"><button type="button" class="atras" data-a="${n === 1 ? 'atras' : 'aldiaAtras'}" aria-label="${n === 1 ? 'Salir de Pongámonos al día' : 'Paso anterior'}" data-fk="ad-atras">${icon('chevron-left')}<span>${n === 1 ? 'Hoy' : 'Atrás'}</span></button><p class="paso">Paso ${n} de ${pasos}</p><h1 class="h1" tabindex="-1">${t}</h1><p class="sub">${s}</p></header>`;
        if (top.paso === 1) {
            const filas = atrasadas.length
                ? atrasadas
                      .map((o) => {
                          const clave = o.ingreso.id + ':' + o.fecha;
                          const v = top.ingresos[clave] || { decision: null, monto: M.montoCampo(o.monto) };
                          top.ingresos[clave] = v;
                          return `<li class="ad-item">${caja(o.ingreso.emoji)}<div class="ad-txt"><p class="fila-t">${esc(o.ingreso.nombre)} del ${esc(M.fechaLarga(o.fecha))}</p><p class="fila-s">Normalmente ${dinero(o.monto, { aprox: true })} en ${esc(M.lugar(st, o.ingreso.lugar).nombre)}</p>
                            <div class="chips"><button type="button" class="chip" aria-pressed="${v.decision === 'si'}" data-a="aldiaIngreso" data-f="${clave}" data-v="si" data-fk="adi-si-${o.fecha}${o.ingreso.principal ? '' : '-' + o.ingreso.id}">${v.decision === 'si' ? icon('check', 'ico-xs') : ''}Sí, me cayó</button><button type="button" class="chip" aria-pressed="${v.decision === 'todavia'}" data-a="aldiaIngreso" data-f="${clave}" data-v="todavia" data-fk="adi-todavia-${o.fecha}">${v.decision === 'todavia' ? icon('check', 'ico-xs') : ''}Todavía no</button><button type="button" class="chip" aria-pressed="${v.decision === 'no'}" data-a="aldiaIngreso" data-f="${clave}" data-v="no" data-fk="adi-no-${o.fecha}">${v.decision === 'no' ? icon('check', 'ico-xs') : ''}No me va a caer</button></div>
                            ${v.decision === 'si' ? `<div class="campo-g"><label class="campo-l" for="adi-m-${o.fecha}">¿Cuánto?</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="adi-m-${o.fecha}" data-campo="adIngreso" data-f="${clave}" type="text" inputmode="decimal" value="${esc(v.monto)}"></div></div>` : ''}</div></li>`;
                      })
                      .join('')
                : '<li class="ad-item"><p class="txt">No hay ingresos por confirmar.</p></li>';
            return `<div class="pg pg--flujo">${cab(1, 'Tus ingresos', '¿Llegaron los que esperabas?')}<ul class="lista-ad card">${filas}</ul><button type="button" class="btn btn--prim btn--48 btn--full" data-a="aldiaSiguiente" data-fk="ad-sig">Siguiente</button></div>`;
        }
        if (top.paso === 2) {
            const filas = vencidos.length
                ? vencidos
                      .map((o) => {
                          const clave = (o.tarjeta ? 't:' + o.tarjeta.id : 'p:' + o.pago.id) + ':' + o.fecha;
                          const v = top.pagos[clave] || null;
                          const nombre = o.tarjeta ? o.tarjeta.nombre : o.pago.nombre;
                          const ch = (val, txt) => `<button type="button" class="chip" aria-pressed="${v === val}" data-a="aldiaPago" data-k="${clave}" data-v="${val}" data-fk="adp-${val}-${clave}">${v === val ? icon('check', 'ico-xs') : ''}${txt}</button>`;
                          return `<li class="ad-item">${caja(o.tarjeta ? o.tarjeta.emoji : o.pago.emoji)}<div class="ad-txt"><p class="fila-t">${esc(nombre)} · ${dinero(o.monto, { aprox: o.estimado })}</p><p class="fila-s">Venció el ${esc(M.fechaLarga(o.fecha))}</p><div class="chips">${ch('pagado', 'Pagado')}${ch('aun', 'Aún no')}${o.tarjeta ? '' : ch('saltar', 'Saltar')}</div></div></li>`;
                      })
                      .join('')
                : '<li class="ad-item"><p class="txt">No hay pagos por confirmar.</p></li>';
            return `<div class="pg pg--flujo">${cab(2, 'Tus pagos', 'Ya pasó su fecha. ¿Los pagaste?')}
                ${vencidos.length > 1 ? `<button type="button" class="link" data-a="aldiaTodos" data-fk="ad-todos">Marcar todos como pagados</button>` : ''}
                <ul class="lista-ad card">${filas}</ul>
                <p class="fila-s">Los marcamos con su fecha. Si algo no cuadra, el paso siguiente lo explica.</p>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="aldiaSiguiente" data-fk="ad-sig">Siguiente</button></div>`;
        }
        if (top.paso === 3) {
            const filas = st.lugares
                .map((l) => {
                    const esperado = M.saldoLugar(st, l.id);
                    if (top.cuadres[l.id] === undefined) top.cuadres[l.id] = M.montoCampo(esperado);
                    const m = M.leerMonto(top.cuadres[l.id]);
                    const dif = m === null ? null : m - esperado;
                    return `<li class="ad-item">${caja(l.emoji)}<div class="ad-txt"><p class="fila-t">${esc(l.nombre)}</p><p class="fila-s">Según lo anotado: ${dinero(esperado)}</p><div class="campo-g"><label class="campo-l" for="adc-${l.id}">¿Cuánto tienes de verdad?</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="adc-${l.id}" data-campo="adCuadre" data-l="${l.id}" type="text" inputmode="decimal" value="${esc(top.cuadres[l.id])}"></div></div><p class="fila-s" id="adc-dif-${l.id}" aria-live="polite">${dif === null ? '' : dif === 0 ? 'Cuadra exacto.' : `${dinero(Math.abs(dif))} ${dif < 0 ? 'salieron' : 'entraron'} sin detalle.`}</p></div></li>`;
                })
                .join('');
            return `<div class="pg pg--flujo">${cab(3, 'Cuadra tus lugares', 'Mira tu cartera y la app del banco. No tiene que ser exacto al centavo.')}<ul class="lista-ad card">${filas}</ul><button type="button" class="btn btn--prim btn--48 btn--full" data-a="aldiaSiguiente" data-fk="ad-sig">Listo</button></div>`;
        }
        const k = P.calc();
        return `<div class="pg pg--flujo pg--logro">
            <div class="ilus-centro"><svg class="app-illustration" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.bienvenida}</svg></div>
            <h1 class="h1 centro" tabindex="-1">¡Listo, estás al día!</h1>
            <section class="portada portada--quieta app-home-pattern" aria-label="Tu libre"><svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.circles}</svg><div class="portada-b portada-b--quieta"><span class="portada-h">${esc(P.textoHorizonte(k.hz))}</span><span class="portada-l">Libre</span><span class="portada-n">${dinero(k.libre)}</span><span class="portada-s">${k.porDia !== null ? `~${dinero(k.porDia, { aprox: true }).replace('~', '')} por día` : ''}</span></div></section>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="aldiaFin" data-fk="ad-fin">Ir a Hoy</button>
            <button type="button" class="link centro" data-a="aldiaDeshacer" data-fk="ad-deshacer">Deshacer todo</button>
        </div>`;
    };
    P.aldiaCampo = function (el) {
        const top = P.ui.stack.at(-1);
        if (el.dataset.campo === 'adIngreso') top.ingresos[el.dataset.f].monto = el.value;
        if (el.dataset.campo === 'adCuadre') {
            top.cuadres[el.dataset.l] = el.value;
            const esperado = M.saldoLugar(P.st, el.dataset.l);
            const m = M.leerMonto(el.value);
            const dif = m === null ? null : m - esperado;
            const p = document.getElementById('adc-dif-' + el.dataset.l);
            if (p) p.textContent = dif === null ? '' : dif === 0 ? 'Cuadra exacto.' : `${dinero(Math.abs(dif))} ${dif < 0 ? 'salieron' : 'entraron'} sin detalle.`;
        }
    };
    P.acciones.aldiaIngreso = (d) => {
        const top = P.ui.stack.at(-1);
        top.ingresos[d.f].decision = d.v;
        P.render();
    };
    P.acciones.aldiaPago = (d) => {
        const top = P.ui.stack.at(-1);
        top.pagos[d.k] = d.v;
        P.render();
    };
    P.acciones.aldiaTodos = () => {
        const top = P.ui.stack.at(-1);
        for (const b of document.querySelectorAll('[data-a="aldiaPago"][data-v="pagado"]')) top.pagos[b.dataset.k] = 'pagado';
        P.render();
    };
    P.acciones.aldiaAtras = () => {
        const top = P.ui.stack.at(-1);
        P.st = structuredClone(top.inicio);
        top.paso = 1;
        top.cuadres = {};
        P.render({ nueva: true });
    };
    P.acciones.aldiaSiguiente = () => {
        const top = P.ui.stack.at(-1);
        const st = P.st;
        if (top.paso === 1) {
            const pendientes = P.ingresosPorConfirmar();
            for (const [clave, v] of Object.entries(top.ingresos)) {
                const o = pendientes.find((x) => x.ingreso.id + ':' + x.fecha === clave);
                if (!o) continue;
                if (v.decision === 'si') P.llegoIngreso(st, o.ingreso.id, o.fecha, { monto: M.leerMonto(v.monto) || o.monto, lugar: o.ingreso.lugar, fecha: o.fecha });
                if (v.decision === 'no') P.noLlego(st, o.ingreso.id, o.fecha);
            }
        } else if (top.paso === 2) {
            for (const [clave, v] of Object.entries(top.pagos)) {
                const [tipo, id, fecha] = clave.split(':');
                if (tipo === 'p') {
                    const p = M.pago(st, id);
                    if (v === 'pagado') P.marcarPagado(st, id, fecha, { monto: p.monto, medio: p.medio, fecha });
                    if (v === 'saltar') p.hechos[fecha] = { estado: 'saltado' };
                } else if (v === 'pagado') {
                    const info = M.tarjetaInfo(st, M.tarjeta(st, id));
                    P.pagarTarjeta(st, id, { monto: info.porPagarEstado, lugar: (st.lugares.find((l) => l.tipo === 'banco') || st.lugares[0]).id, fecha });
                }
            }
        } else if (top.paso === 3) {
            for (const [lugar, v] of Object.entries(top.cuadres)) {
                const m = M.leerMonto(v);
                if (m !== null) P.cuadrar(st, lugar, m);
            }
        }
        top.paso++;
        P.render({ nueva: true });
        P.emitir('aldia:paso' + top.paso);
        if (top.paso === 4) P.emitir('aldia:fin');
    };
    P.acciones.aldiaFin = () => {
        const top = P.ui.stack.at(-1);
        P.deshacer.push(top.inicio);
        P.irTab('hoy');
        P.avisar('Al día', { deshacer: true });
    };
    P.acciones.aldiaDeshacer = () => {
        const top = P.ui.stack.at(-1);
        P.st = structuredClone(top.inicio);
        P.ui.stack = [];
        P.irTab('hoy');
        P.avisar('Listo, lo dejamos como estaba', { check: false });
    };

    // ================================================================== PANTALLA: PRIMER DÍA
    const OB_INGRESOS = [['quincena', '💼', 'Cada quincena', 'Dos veces al mes'], ['mes', '🗓️', 'Cada mes', 'Un día fijo'], ['semana', '🧰', 'Cada semana', 'Obra, maquila, reparto…'], ['catorcena', '📅', 'Cada 14 días', 'Catorcena'], ['varia', '🏪', 'Varía', 'Negocio, ventas o trabajos por día'], ['remesa', '🌎', 'Recibo remesa', 'De familia afuera']];
    const OB_REGULARES = { quincena: 'La quincena', mes: 'El pago del mes', semana: 'El pago de la semana', catorcena: 'La catorcena' };
    const lugaresOb = [{ v: 'banco', t: 'En el banco', e: '🏦' }, { v: 'efectivo', t: 'En efectivo', e: '💵' }];
    S.onboarding = function () {
        const ob = P.ui.ob;
        const d = ob.datos;
        const st = P.st;
        const total = 4;
        const cab = (n, t, s) => `<header class="pg-head ob-head">${n > 1 ? `<button type="button" class="atras" data-a="obAtras" aria-label="Paso anterior" data-fk="ob-atras">${icon('chevron-left')}<span>Atrás</span></button>` : ''}<p class="paso">Paso ${n} de ${total}</p><div class="ob-barra" aria-hidden="true"><span style="width:${(n / total) * 100}%"></span></div><h1 class="h1" tabindex="-1">${t}</h1>${s ? `<p class="sub">${s}</p>` : ''}</header>`;
        const err = (campo, t) => (ob.errores && ob.errores.includes(campo) ? `<p class="campo-error" id="ob-err-${campo}">${icon('triangle-alert')}<span>${esc(t)}</span></p>` : '');
        const monto = (campo, label, valor, extra = '') => `<div class="campo-g"><label class="campo-l" for="ob-${campo}">${label}</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="ob-${campo}" data-campo="${campo}" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej. 600.00" value="${esc(valor || '')}" ${extra}></div></div>`;
        const pie = (izq, der) => `<div class="ob-pie">${izq}${der}</div>`;
        if (ob.paso === 0) {
            return `<div class="pg pg--flujo ob">
                <div class="ilus-centro"><svg class="app-illustration app-illustration--large" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.bienvenida}</svg></div>
                <h1 class="h1 centro" tabindex="-1">Te damos la bienvenida</h1>
                <p class="txt centro">Te ayudo a saber <strong>cuánto te queda libre hasta tu próximo ingreso</strong> y a que no se te olvide ningún pago.</p>
                <div class="campo-g"><label class="campo-l" for="ob-nombre">¿Cómo te llamamos? <span class="opcional">(opcional)</span></label><div class="campo"><input id="ob-nombre" data-campo="nombre" type="text" autocomplete="given-name" value="${esc(d.nombre || '')}" placeholder="Ej. Ana"></div></div>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="obSiguiente" data-fk="ob-empezar">Empezar</button>
                <p class="fila-s centro">Toma 2 minutos. Casi todo se puede saltar.</p>
            </div>`;
        }
        if (ob.paso === 1) {
            const sel = d.ingresos;
            const det = (id) => {
                const x = sel[id];
                if (!x) return '';
                if (id === 'quincena') return `<div class="ob-det">${monto('q-monto', '¿Cuánto te cae más o menos cada quincena?', x.monto)}${opcionesOb('q-dias', '¿Qué días?', [{ v: '15-30', t: 'El 15 y el 30' }, { v: '15-31', t: 'El 15 y el último día' }, { v: 'otros', t: 'Otros días' }], x.dias)}${x.dias === 'otros' ? `<div class="ob-2">${obDiaCorto('q-d1', 'Primer pago, el día', x.d1 || '')}${obDiaCorto('q-d2', 'Segundo pago, el día', x.d2 || '')}</div>` : ''}${opcionesOb('q-lugar', '¿Dónde te cae?', lugaresOb, x.lugar)}</div>`;
                if (id === 'mes') return `<div class="ob-det">${monto('m-monto', '¿Cuánto más o menos?', x.monto)}${obDias('m-dia', x.dia)}<p class="fila-s">Si es el 29, 30 o 31, en los meses más cortos cae el último día.</p>${opcionesOb('m-lugar', '¿Dónde te cae?', lugaresOb, x.lugar)}</div>`;
                if (id === 'semana') return `<div class="ob-det">${monto('s-monto', '¿Cuánto más o menos cada semana?', x.monto)}${opcionesOb('s-dia', '¿Qué día te pagan?', [1, 2, 3, 4, 5, 6].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), x.dia)}${opcionesOb('s-lugar', '¿Dónde te cae?', lugaresOb, x.lugar || 'efectivo')}</div>`;
                if (id === 'catorcena') return `<div class="ob-det">${monto('c-monto', '¿Cuánto más o menos cada 14 días?', x.monto)}${calendario(ob, 'c-proximo', x.proximo || null, { label: '¿Cuándo es tu próximo pago?', min: st.hoy })}${opcionesOb('c-lugar', '¿Dónde te cae?', lugaresOb, x.lugar)}</div>`;
                if (id === 'varia') return `<div class="ob-det">${opcionesOb('v-horizonte', '¿Hasta cuándo quieres ver tu libre?', [{ v: 'finDeMes', t: 'Hasta fin de mes' }, { v: 'quince', t: 'Los próximos 15 días' }], x.horizonte)}</div>`;
                if (id === 'remesa') return `<div class="ob-det">${monto('r-monto', '¿Cuánto más o menos?', x.monto)}${opcionesOb('r-cada', '¿Cada cuánto?', [{ v: 'mes', t: 'Cada mes' }, { v: 'llega', t: 'Cuando llega' }], x.cada)}${x.cada === 'mes' ? obDias('r-dia', x.dia) : '<p class="fila-s">Cuando llegue, anótala y te ayudo a repartirla.</p>'}</div>`;
                return '';
            };
            // V2-16: con dos ingresos fijos, el número se calcula hasta el principal.
            const regulares = Object.keys(OB_REGULARES).filter((k) => sel[k]);
            const principal = regulares.includes(d.principal) ? d.principal : regulares[0];
            const extras = d.extras || {};
            const extraHtml = (id, nombre, cuando) => `<div class="ob-op-g"><button type="button" class="opcion-g" aria-pressed="${!!extras[id]}" data-a="obExtra" data-v="${id}" data-fk="ob-x-${id}">${caja('🎁')}<span><span class="opcion-g-t">${nombre}</span><span class="fila-s">${cuando} · no suma a tu libre hasta que llegue</span></span>${extras[id] ? icon('circle-check', 'ico-ok') : ''}</button>${extras[id] ? `<div class="ob-det">${monto('x-' + id, '¿Cuánto más o menos?', extras[id].monto)}</div>` : ''}</div>`;
            const masInfo = `${regulares.length > 1 ? `<div class="card ob-card">${opcionesOb('principal', '¿Con cuál cuentas para tu número? (el que más pesa)', regulares.map((k) => ({ v: k, t: OB_REGULARES[k] })), principal)}<p class="fila-s">Tu libre se calcula hasta que llegue ese; el otro suma cuando llega.</p></div>` : ''}
                <p class="campo-l campo-l--sec">¿También recibes…? <span class="opcional">(opcional)</span></p>
                <div class="ob-ops">${extraHtml('aguinaldo', 'Aguinaldo', 'En diciembre')}${extraHtml('q25', 'Quincena 25', 'En enero')}</div>`;
            return `<div class="pg pg--flujo ob">${cab(1, '¿Cómo te pagan?', 'Elige todas las que te pasen.')}
                <div class="ob-ops">${OB_INGRESOS.map(([id, e, t, s]) => `<div class="ob-op-g"><button type="button" class="opcion-g" aria-pressed="${!!sel[id]}" data-a="obIngreso" data-v="${id}" data-fk="ob-i-${id}">${caja(e)}<span><span class="opcion-g-t">${t}</span><span class="fila-s">${s}</span></span>${sel[id] ? icon('circle-check', 'ico-ok') : ''}</button>${det(id)}</div>`).join('')}</div>
                ${masInfo}
                ${pie(`<button type="button" class="btn btn--48" data-a="obSaltar" data-fk="ob-saltar">Saltar</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Siguiente</button>`)}
            </div>`;
        }
        if (ob.paso === 2) {
            // V2-45: varios bancos y billeteras, cada uno con su nombre y lo que tiene.
            const bancoExtra = (b, i) => `<div class="ob-lugar ob-lugar--banco">${caja('🏦')}<div class="ob-lugar-c">${opcionesOb(`banco${i + 1}`, 'Otro banco o cooperativa', [...D.BANCOS.map((x) => ({ v: x, t: x })), { v: 'Otro', t: 'Otro' }], b.nombre)}${b.nombre ? monto(`banco${i + 1}-monto`, `¿Cuánto en ${b.nombre === 'Otro' ? 'ese banco' : 'Banco ' + b.nombre}?`, b.monto) : ''}<button type="button" class="link link--peligro" data-a="obQuitarLugar" data-v="banco:${i}" data-fk="ob-banco${i + 1}-quitar">${icon('x', 'ico-s')}Quitar</button></div></div>`;
            const billetera = (b, i) => `<div class="ob-lugar">${caja('📱')}<div class="ob-lugar-c"><div class="campo-g"><label class="campo-l" for="ob-bill${i}-nombre">Billetera en el celular</label><div class="campo"><input id="ob-bill${i}-nombre" data-campo="bill${i}-nombre" type="text" autocomplete="off" placeholder="Ej. Tigo Money" value="${esc(b.nombre || '')}"></div></div>${monto(`bill${i}-monto`, '¿Cuánto tienes ahí?', b.monto)}<button type="button" class="link link--peligro" data-a="obQuitarLugar" data-v="billetera:${i}" data-fk="ob-bill${i}-quitar">${icon('x', 'ico-s')}Quitar</button></div></div>`;
            return `<div class="pg pg--flujo ob">${cab(2, '¿Cuánto tienes ahora y dónde?', 'Más o menos. Es tu primer cuadre: desde aquí partimos.')}
                <div class="card ob-card">
                    <div class="ob-lugar">${caja('💵')}${monto('efectivo', 'En efectivo', d.efectivo, ob.errores && ob.errores.includes('dinero') ? 'aria-invalid="true" aria-describedby="ob-err-dinero"' : '')}</div>
                    <div class="ob-lugar ob-lugar--banco">${caja('🏦')}<div class="ob-lugar-c">${opcionesOb('banco', 'En el banco o cooperativa', [...D.BANCOS.map((b) => ({ v: b, t: b })), { v: 'Otro', t: 'Otro' }], d.bancoNombre)}${d.bancoNombre ? monto('banco-monto', `¿Cuánto en ${d.bancoNombre === 'Otro' ? 'tu banco' : 'Banco ' + d.bancoNombre}?`, d.bancoMonto) : ''}</div></div>
                    ${(d.bancosMas || []).map(bancoExtra).join('')}
                    ${(d.billeteras || []).map(billetera).join('')}
                    ${err('dinero', 'Escribe cuánto tienes, aunque sea $0')}
                    <div class="ob-mas">${d.bancoNombre ? `<button type="button" class="btn btn--sm" data-a="obAgregarLugar" data-v="banco" data-fk="ob-banco-mas">${icon('plus', 'ico-s')}Agregar otro banco</button>` : ''}<button type="button" class="btn btn--sm" data-a="obAgregarLugar" data-v="billetera" data-fk="ob-bill-mas">${icon('plus', 'ico-s')}Agregar billetera</button></div>
                </div>
                ${hoyEsDiaDePago(st, d) ? `<div class="card ob-card">${opcionesOb('hoyCayo', 'Hoy es tu día de pago. ¿Ya está en lo que tienes?', [{ v: 'si', t: 'Sí, ya me cayó' }, { v: 'no', t: 'Todavía no' }], d.hoyCayo)}<p class="fila-s">Así no lo contamos dos veces. Si todavía no, te lo pregunto cuando te caiga.</p></div>` : ''}
                <p class="fila-s">No tiene que ser exacto. Cuando quieras, lo cuadras otra vez.</p>
                ${pie(`<button type="button" class="btn btn--48" data-a="obAtras" data-fk="ob-atras2">Atrás</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Siguiente</button>`)}
            </div>`;
        }
        if (ob.paso === 3) {
            const bancos = [d.bancoNombre, ...(d.bancosMas || []).map((b) => b.nombre)].filter(Boolean).map((b) => (b === 'Otro' ? 'tu banco' : b));
            const ch = (id, e, t, s, on, fijo = false) => `<button type="button" class="opcion-g" aria-pressed="${on}" ${fijo ? 'aria-disabled="true"' : `data-a="obMedio" data-v="${id}"`} data-fk="ob-m-${id}">${caja(e)}<span><span class="opcion-g-t">${t}</span><span class="fila-s">${s}</span></span>${on ? icon('circle-check', 'ico-ok') : ''}</button>`;
            const credito = (c, i) => {
                const n = i === 0 ? '' : String(i);
                return `<div class="ob-det">${i ? `<p class="fila-t">Otra tarjeta de crédito</p>` : ''}${opcionesOb(`credito${n}-banco`, '¿De qué banco?', D.BANCOS.slice(0, 5).map((b) => ({ v: b, t: b })), c.banco)}<div class="ob-2">${obDiaCorto(`credito${n}-corte`, 'Corte el día', c.corte)}${obDiaCorto(`credito${n}-pago`, 'Pago el día', c.pago)}</div>${i ? `<button type="button" class="link link--peligro" data-a="obQuitarCredito" data-v="${i - 1}" data-fk="ob-credito${n}-quitar">${icon('x', 'ico-s')}Quitar</button>` : '<p class="fila-s">Están en tu estado de cuenta.</p>'}</div>`;
            };
            return `<div class="pg pg--flujo ob">${cab(3, '¿Con qué pagas?', 'Así, al anotar, ya sé con qué pagaste.')}
                <div class="ob-ops">
                    ${ch('efectivo', '💵', 'Efectivo', 'Siempre está', true, true)}
                    ${bancos.map((b, i) => ch('debito' + (i ? i + 1 : ''), '🏦', `Tarjeta de débito ${esc(b)}`, 'Sale de tu cuenta del banco', true, true)).join('')}
                    ${(d.billeteras || []).filter((b) => (b.nombre || '').trim()).map((b, i) => ch('billetera' + i, '📱', esc(b.nombre.trim()), 'Billetera en el celular', true, true)).join('')}
                    ${bancos.length ? ch('transferencia', '🔁', 'Transferencias', bancos.length > 1 ? 'Desde tus cuentas del banco' : 'Desde tu cuenta del banco', d.medios.transferencia) : ''}
                    <div class="ob-op-g">${ch('credito', '💳', 'Tarjeta de crédito', 'La pagas después', d.medios.credito)}
                    ${d.medios.credito ? [d.credito, ...(d.creditosMas || [])].map(credito).join('') + `<button type="button" class="btn btn--sm" data-a="obAgregarCredito" data-fk="ob-credito-mas">${icon('plus', 'ico-s')}Agregar otra tarjeta de crédito</button>` : ''}</div>
                </div>
                <p class="fila-s">Después puedes agregar más en Mi dinero → Cuentas.</p>
                ${pie(`<button type="button" class="btn btn--48" data-a="obSaltar" data-fk="ob-saltar">Saltar</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Siguiente</button>`)}
            </div>`;
        }
        if (ob.paso === 4) {
            const ed = ob.editando;
            const pagoChip = (x) => {
                const ya = d.pagos.find((p) => p.id === x.id);
                return `<button type="button" class="chip" aria-pressed="${!!ya || (ed && ed.id === x.id)}" data-a="obPago" data-v="${x.id}" data-fk="ob-p-${x.id}">${ya ? icon('check', 'ico-xs') : ''}${emo(x.emoji, 18)}${esc(x.nombre)}</button>`;
            };
            // V2-46: préstamo, casa comercial y tarjeta, varios de cada uno («+ Otro»); solo nombre, cuota y día.
            const deudaChip = (x) => {
                const n = d.pagos.filter((p) => p.deuda === x.id).length;
                return `<button type="button" class="chip" aria-pressed="${!!(ed && ed.deuda === x.id)}" data-a="obDeuda" data-v="${x.id}" data-fk="ob-d-${x.id}">${icon('plus', 'ico-xs')}${emo(x.emoji, 18)}${esc(n ? x.otro : x.nombre)}${n ? `<span class="chip-s">${n}</span>` : ''}</button>`;
            };
            const nSus = d.pagos.filter((p) => p.suscripcion).length;
            let editor = '';
            if (ed && ed.deuda) {
                const x = DEUDAS_OB.find((y) => y.id === ed.deuda);
                editor = `<div class="card ob-card ob-editor"><p class="fila-t">${emo(x.emoji, 18)} ${esc(x.nombre)}</p><div class="campo-g"><label class="campo-l" for="ob-p-nombre">Nombre</label><div class="campo"><input id="ob-p-nombre" data-campo="p-nombre" type="text" autocomplete="off" value="${esc(ed.nombre)}" placeholder="${esc(x.ejemplo)}"></div></div>${monto('p-monto', x.id === 'tarjeta' ? '¿Cuánto pagas más o menos cada mes?' : 'Cuota', ed.monto)}${obDias('p-dia', ed.dia)}<p class="fila-s">«¿Cuánto debes?» te lo pregunto después, en Deudas.</p>${err('pago', 'Escribe la cuota y elige el día')}<div class="acciones-2"><button type="button" class="btn" data-a="obPagoCancelar" data-fk="ob-p-cancelar">Cancelar</button><button type="button" class="btn btn--prim" data-a="obPagoAgregar" data-fk="ob-p-agregar">Agregar</button></div></div>`;
            } else if (ed && ed.suscripcion) {
                editor = `<div class="card ob-card ob-editor"><p class="fila-t">${emo('📺', 18)} Suscripción</p>${opcionesOb('p-servicio', '¿Cuál?', D.SUSCRIPCIONES.map((s) => ({ v: s.id, t: s.nombre, e: s.emoji })), ed.servicio)}${ed.servicio === 'otra' ? `<div class="campo-g"><label class="campo-l" for="ob-p-nombre">Nombre</label><div class="campo"><input id="ob-p-nombre" data-campo="p-nombre" type="text" autocomplete="off" value="${esc(ed.nombre)}" placeholder="Ej. Crunchyroll"></div></div>` : ''}${monto('p-monto', '¿Cuánto?', ed.monto)}${opcionesOb('p-anual', '¿Cada cuánto?', [{ v: 'no', t: 'Cada mes' }, { v: 'si', t: 'Cada año' }], ed.anual ? 'si' : 'no')}${obDias('p-dia', ed.dia)}${err('pago', 'Elige cuál, escribe cuánto y el día')}<div class="acciones-2"><button type="button" class="btn" data-a="obPagoCancelar" data-fk="ob-p-cancelar">Cancelar</button><button type="button" class="btn btn--prim" data-a="obPagoAgregar" data-fk="ob-p-agregar">Agregar</button></div></div>`;
            } else if (ed) {
                const f = D.PAGOS_FRECUENTES.find((x) => x.id === ed.id);
                const cuchubal = f.id === 'cuchubal';
                const cuando = cuchubal && ed.frecuencia === 'quincenal' ? `<div class="ob-2">${obDiaCorto('p-d1', 'Primer día', ed.d1 || '')}${obDiaCorto('p-d2', 'Segundo día', ed.d2 || '')}</div>` : (cuchubal ? ed.frecuencia === 'semanal' : f.semanal) ? opcionesOb('p-dsem', '¿Qué día?', [1, 2, 3, 4, 5, 6].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), ed.diaSemana) : obDias('p-dia', ed.dia);
                editor = `<div class="card ob-card ob-editor"><p class="fila-t">${emo(f.emoji, 18)} ${esc(f.nombre)}</p>${monto('p-monto', f.variable ? '¿Cuánto más o menos?' : cuchubal ? '¿Cuánto aportas cada vez?' : '¿Cuánto?', ed.monto)}${cuchubal ? opcionesOb('p-frec', '¿Cada cuánto?', [{ v: 'semanal', t: 'Cada semana' }, { v: 'quincenal', t: 'Cada quincena' }, { v: 'mensual', t: 'Cada mes' }], ed.frecuencia) : ''}${cuando}${err('pago', 'Escribe el monto y elige el día')}<div class="acciones-2"><button type="button" class="btn" data-a="obPagoCancelar" data-fk="ob-p-cancelar">Cancelar</button><button type="button" class="btn btn--prim" data-a="obPagoAgregar" data-fk="ob-p-agregar">Agregar</button></div></div>`;
            }
            const cuandoLista = (p) => (p.frecuencia === 'semanal' ? 'cada ' + M.DIAS[p.diaSemana] : p.frecuencia === 'quincenal' ? `el ${p.dias[0]} y el ${p.dias[1]}` : p.anual ? `cada año, el ${p.dia}` : 'el ' + p.dia);
            return `<div class="pg pg--flujo ob">${cab(4, 'Tus pagos fijos', 'Toca los que tengas. Te aviso antes de que venzan.')}
                <p class="campo-l campo-l--sec">De la casa</p>
                <div class="chips ob-pagos">${D.PAGOS_FRECUENTES.filter((x) => !x.deuda).map(pagoChip).join('')}</div>
                <p class="campo-l campo-l--sec">Cuotas y deudas</p>
                <div class="chips ob-pagos">${DEUDAS_OB.map(deudaChip).join('')}</div>
                <p class="campo-l campo-l--sec">Suscripciones</p>
                <div class="chips ob-pagos"><button type="button" class="chip" aria-pressed="${!!(ed && ed.suscripcion)}" data-a="obSuscripcion" data-fk="ob-s-nueva">${icon('plus', 'ico-xs')}${emo('📺', 18)}${nSus ? 'Otra suscripción' : 'Netflix, Spotify, celular…'}${nSus ? `<span class="chip-s">${nSus}</span>` : ''}</button></div>
                ${editor}
                ${d.pagos.length ? `<ul class="lista card">${d.pagos.map((p) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">${esc(cuandoLista(p))}</span></span><span class="fila-m">${dinero(p.monto, { aprox: p.variable })}</span></div><button type="button" class="icon-btn" data-a="obPagoQuitar" data-v="${p.clave}" aria-label="Quitar ${esc(p.nombre)}">${icon('x')}</button></li>`).join('')}</ul>` : ''}
                ${pie(`<button type="button" class="btn btn--48" data-a="obSaltar" data-fk="ob-saltar">Saltar</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Ver mi número</button>`)}
            </div>`;
        }
        return '';
    };
    /** V2-46: las cuotas del primer día. «Tarjeta» = lo que pagas cada mes a una tarjeta (sin corte ni estado de cuenta). */
    const DEUDAS_OB = [
        { id: 'prestamo', nombre: 'Préstamo', otro: 'Otro préstamo', emoji: '🏦', ejemplo: 'Ej. Préstamo de la cooperativa' },
        { id: 'casacomercial', nombre: 'Casa comercial', otro: 'Otra casa comercial', emoji: '🛍️', ejemplo: 'Ej. Almacén La Esquina' },
        { id: 'tarjeta', nombre: 'Tarjeta', otro: 'Otra tarjeta', emoji: '💳', ejemplo: 'Ej. Tarjeta Cuscatlán' },
    ];
    /** ¿Hoy cae alguno de los ingresos que eligió? (V2-43: entonces se pregunta si ya está en lo que tiene). */
    function hoyEsDiaDePago(st, d) {
        const x = d.ingresos;
        const [, , dia] = M.partes(st.hoy);
        const ultimo = M.diasDelMes(...M.partes(st.hoy).slice(0, 2));
        const esDia = (n) => Number(n) === dia || (Number(n) >= ultimo && dia === ultimo);
        if (x.quincena) {
            const ds = x.quincena.dias === '15-31' ? [15, 31] : x.quincena.dias === 'otros' ? [x.quincena.d1, x.quincena.d2] : [15, 30];
            if (ds.some(esDia)) return true;
        }
        if (x.mes && esDia(x.mes.dia || 30)) return true;
        if (x.semana && M.diaSemana(st.hoy) === Number(x.semana.dia || 5)) return true;
        if (x.catorcena && x.catorcena.proximo === st.hoy) return true;
        return false;
    }
    function opcionesOb(campo, label, lista, valor) {
        return `<div class="campo-g" role="group" aria-labelledby="ob-l-${campo}"><p class="campo-l" id="ob-l-${campo}">${label}</p><div class="chips">${lista.map((o) => `<button type="button" class="chip" aria-pressed="${String(valor) === String(o.v)}" data-a="obValor" data-campo="${campo}" data-v="${esc(o.v)}" data-fk="ob-${campo}-${esc(o.v)}">${String(valor) === String(o.v) ? icon('check', 'ico-xs') : ''}${o.e ? emo(o.e, 18) : ''}${esc(o.t)}</button>`).join('')}</div></div>`;
    }
    function obDias(campo, valor) {
        return `<div class="campo-g" role="group" aria-labelledby="ob-l-${campo}"><p class="campo-l" id="ob-l-${campo}">¿Qué día del mes?</p><div class="dias">${Array.from({ length: 31 }, (_, i) => i + 1).map((n) => `<button type="button" class="dia" aria-pressed="${Number(valor) === n}" data-a="obValor" data-campo="${campo}" data-v="${n}" data-fk="ob-${campo}-${n}" aria-label="Día ${n}">${n}</button>`).join('')}</div></div>`;
    }
    function obDiaCorto(campo, label, valor) {
        return `<div class="campo-g"><label class="campo-l" for="ob-${campo}">${label}</label><div class="campo campo--dia"><input id="ob-${campo}" data-campo="${campo}" type="text" inputmode="numeric" maxlength="2" value="${esc(valor)}" aria-describedby="ob-${campo}-a"></div><p class="fila-s" id="ob-${campo}-a">Del 1 al 31</p></div>`;
    }
    P.obCampo = function (el) {
        const ob = P.ui.ob;
        const d = ob.datos;
        const c = el.dataset.campo;
        const v = el.value;
        const soloDigitos = (x) => x.replace(/\D/g, '');
        let m;
        if (c === 'nombre') d.nombre = v;
        else if (c === 'efectivo') d.efectivo = v;
        else if (c === 'banco-monto') d.bancoMonto = v;
        else if ((m = /^banco(\d+)-monto$/.exec(c))) d.bancosMas[Number(m[1]) - 1].monto = v;
        else if ((m = /^bill(\d+)-(nombre|monto)$/.exec(c))) d.billeteras[Number(m[1])][m[2]] = v;
        else if ((m = /^credito(\d*)-(corte|pago)$/.exec(c))) (m[1] ? d.creditosMas[Number(m[1]) - 1] : d.credito)[m[2]] = soloDigitos(v);
        else if (/^[qmsrc]-/.test(c)) {
            const g = { q: 'quincena', m: 'mes', s: 'semana', r: 'remesa', c: 'catorcena' }[c[0]];
            if (d.ingresos[g]) d.ingresos[g][c.slice(2)] = /^d[12]$/.test(c.slice(2)) ? soloDigitos(v) : v;
        } else if (c.startsWith('x-') && d.extras && d.extras[c.slice(2)]) d.extras[c.slice(2)].monto = v;
        else if (c === 'p-monto') ob.editando.monto = v;
        else if (c === 'p-nombre') ob.editando.nombre = v;
        else if (c === 'p-d1' || c === 'p-d2') ob.editando[c.slice(2)] = soloDigitos(v);
        if (ob.errores && ob.errores.length && v.trim()) {
            ob.errores = [];
            const e = document.querySelector('.ob .campo-error');
            if (e) e.remove();
            el.removeAttribute('aria-invalid');
        }
    };
    P.acciones.obValor = (d) => {
        const ob = P.ui.ob;
        const x = ob.datos;
        const v = d.v;
        const [grupo, campo] = d.campo.split('-');
        const mapa = { q: 'quincena', m: 'mes', s: 'semana', v: 'varia', r: 'remesa', c: 'catorcena' };
        let m;
        if (d.campo === 'banco') x.bancoNombre = v;
        else if ((m = /^banco(\d+)$/.exec(d.campo))) x.bancosMas[Number(m[1]) - 1].nombre = v;
        else if (d.campo === 'hoyCayo') x.hoyCayo = v;
        else if (d.campo === 'principal') x.principal = v;
        else if ((m = /^credito(\d*)-banco$/.exec(d.campo))) (m[1] ? x.creditosMas[Number(m[1]) - 1] : x.credito).banco = v;
        else if (d.campo === 'p-servicio') {
            const s = D.SUSCRIPCIONES.find((y) => y.id === v);
            Object.assign(ob.editando, { servicio: v, nombre: v === 'otra' ? '' : s.nombre, emoji: s.emoji });
        } else if (d.campo === 'p-anual') ob.editando.anual = v === 'si';
        else if (d.campo === 'p-frec') {
            ob.editando.frecuencia = v;
            // «Cada quincena»: parte de los días de su quincena, si los dijo.
            const q = x.ingresos.quincena;
            if (v === 'quincenal' && !ob.editando.d1 && q) [ob.editando.d1, ob.editando.d2] = q.dias === 'otros' ? [q.d1 || '', q.d2 || ''] : q.dias === '15-31' ? ['15', '31'] : ['15', '30'];
        } else if (grupo === 'p') ob.editando[campo === 'dsem' ? 'diaSemana' : 'dia'] = Number(v);
        else if (mapa[grupo]) x.ingresos[mapa[grupo]][campo] = /^\d+$/.test(v) ? Number(v) : v;
        P.render();
    };
    P.acciones.obIngreso = (d) => {
        const x = P.ui.ob.datos.ingresos;
        if (x[d.v]) delete x[d.v];
        else x[d.v] = { quincena: { monto: '', lugar: 'banco', dias: '15-30' }, mes: { monto: '', dia: 30, lugar: 'banco' }, semana: { monto: '', dia: 5, lugar: 'efectivo' }, catorcena: { monto: '', proximo: '', lugar: 'banco' }, varia: { horizonte: 'finDeMes' }, remesa: { monto: '', cada: 'mes', dia: 10 } }[d.v];
        P.render();
        P.emitir('onboarding:ingreso:' + d.v);
    };
    P.acciones.obExtra = (d) => {
        const x = P.ui.ob.datos;
        x.extras = x.extras || {};
        if (x.extras[d.v]) delete x.extras[d.v];
        else x.extras[d.v] = { monto: '' };
        P.render();
    };
    P.acciones.obAgregarLugar = (d) => {
        const x = P.ui.ob.datos;
        if (d.v === 'banco') x.bancosMas = [...(x.bancosMas || []), { nombre: null, monto: '' }];
        else x.billeteras = [...(x.billeteras || []), { nombre: '', monto: '' }];
        P.render({ foco: d.v === 'banco' ? `[data-fk="ob-banco${x.bancosMas.length}-Agrícola"]` : `#ob-bill${x.billeteras.length - 1}-nombre` });
    };
    P.acciones.obQuitarLugar = (d) => {
        const x = P.ui.ob.datos;
        const [tipo, i] = d.v.split(':');
        if (tipo === 'banco') x.bancosMas.splice(Number(i), 1);
        else x.billeteras.splice(Number(i), 1);
        P.render({ foco: '[data-fk="ob-banco-mas"], [data-fk="ob-bill-mas"]' });
    };
    P.acciones.obMedio = (d) => {
        const m = P.ui.ob.datos.medios;
        m[d.v] = !m[d.v];
        P.render();
    };
    P.acciones.obAgregarCredito = () => {
        const x = P.ui.ob.datos;
        x.creditosMas = [...(x.creditosMas || []), { banco: 'BAC', corte: '', pago: '' }];
        P.render({ foco: `#ob-credito${x.creditosMas.length}-corte` });
    };
    P.acciones.obQuitarCredito = (d) => {
        P.ui.ob.datos.creditosMas.splice(Number(d.v), 1);
        P.render({ foco: '[data-fk="ob-credito-mas"]' });
    };
    let claveOb = 0;
    P.acciones.obPago = (d) => {
        const ob = P.ui.ob;
        const ya = ob.datos.pagos.find((p) => p.id === d.v);
        if (ya) {
            ob.editando = { id: d.v, monto: M.montoCampo(ya.monto), dia: ya.dia, diaSemana: ya.diaSemana, frecuencia: ya.frecuencia, d1: ya.dias ? String(ya.dias[0]) : '', d2: ya.dias ? String(ya.dias[1]) : '' };
            ob.datos.pagos = ob.datos.pagos.filter((p) => p.id !== d.v);
        } else ob.editando = { id: d.v, monto: '', dia: null, diaSemana: 5, frecuencia: d.v === 'cuchubal' ? 'semanal' : null };
        ob.errores = [];
        P.render({ foco: '#ob-p-monto' });
    };
    P.acciones.obDeuda = (d) => {
        const x = DEUDAS_OB.find((y) => y.id === d.v);
        P.ui.ob.editando = { deuda: d.v, nombre: x.nombre, monto: '', dia: null };
        P.ui.ob.errores = [];
        P.render({ foco: '#ob-p-nombre' });
    };
    P.acciones.obSuscripcion = () => {
        P.ui.ob.editando = { suscripcion: true, servicio: null, nombre: '', emoji: '📺', monto: '', dia: null, anual: false };
        P.ui.ob.errores = [];
        P.render({ foco: '[data-fk="ob-p-servicio-netflix"]' });
    };
    P.acciones.obPagoCancelar = () => {
        P.ui.ob.editando = null;
        P.render();
    };
    P.acciones.obPagoQuitar = (d) => {
        P.ui.ob.datos.pagos = P.ui.ob.datos.pagos.filter((p) => p.clave !== d.v);
        P.render();
    };
    P.acciones.obPagoAgregar = () => {
        const ob = P.ui.ob;
        const ed = ob.editando;
        const monto = M.leerMonto(ed.monto);
        const clave = 'ob' + ++claveOb;
        if (ed.deuda) {
            if (!monto || !ed.dia || !(ed.nombre || '').trim()) return obFalta();
            const x = DEUDAS_OB.find((y) => y.id === ed.deuda);
            ob.datos.pagos.push({ clave, id: clave, deuda: ed.deuda, nombre: ed.nombre.trim(), emoji: x.emoji, categoria: 'cuotas', monto, variable: ed.deuda === 'tarjeta', frecuencia: 'mensual', dia: ed.dia });
            P.emitir('onboarding:deuda:' + ed.deuda);
        } else if (ed.suscripcion) {
            if (!monto || !ed.dia || !ed.servicio || !(ed.nombre || '').trim()) return obFalta();
            ob.datos.pagos.push({ clave, id: clave, suscripcion: true, nombre: ed.nombre.trim(), emoji: ed.emoji, categoria: 'suscripciones', monto, frecuencia: 'mensual', anual: ed.anual, dia: ed.dia });
            P.emitir('onboarding:suscripcion');
        } else {
            const f = D.PAGOS_FRECUENTES.find((x) => x.id === ed.id);
            const frecuencia = f.id === 'cuchubal' ? ed.frecuencia || 'semanal' : f.semanal ? 'semanal' : 'mensual';
            const dias = frecuencia === 'quincenal' ? [Number(ed.d1), Number(ed.d2)].sort((a, b) => a - b) : null;
            const okDia = frecuencia === 'semanal' || (frecuencia === 'quincenal' ? dias.every((n) => n >= 1 && n <= 31) && dias[0] !== dias[1] : !!ed.dia);
            if (!monto || !okDia) return obFalta();
            ob.datos.pagos.push({ clave, id: f.id, nombre: f.nombre, emoji: f.emoji, categoria: f.categoria, monto, variable: !!f.variable, frecuencia, dia: ed.dia, diaSemana: ed.diaSemana, dias });
            P.emitir('onboarding:pago:' + f.id);
        }
        const foco = ed.deuda ? `[data-fk="ob-d-${ed.deuda}"]` : ed.suscripcion ? '[data-fk="ob-s-nueva"]' : `[data-fk="ob-p-${ed.id}"]`;
        ob.editando = null;
        ob.errores = [];
        P.render({ foco });
    };
    function obFalta() {
        P.ui.ob.errores = ['pago'];
        P.render({ foco: '#ob-p-monto' });
    }
    P.acciones.obAtras = () => {
        P.ui.ob.paso = Math.max(0, P.ui.ob.paso - 1);
        P.ui.ob.errores = [];
        P.render({ nueva: true });
    };
    P.acciones.obSaltar = () => {
        const ob = P.ui.ob;
        if (ob.paso === 1) ob.datos.ingresos = {};
        if (ob.paso === 3) {
            ob.datos.medios = { transferencia: false, credito: false };
            ob.datos.creditosMas = [];
        }
        if (ob.paso === 4) {
            ob.datos.pagos = [];
            ob.editando = null;
        }
        P.emitir('onboarding:saltar:' + ob.paso);
        P.acciones.obSiguiente({ saltar: true });
    };
    P.acciones.obSiguiente = () => {
        const ob = P.ui.ob;
        const d = ob.datos;
        if (ob.paso === 2) {
            const algo = [d.efectivo, d.bancoNombre ? d.bancoMonto : null, ...(d.bancosMas || []).filter((b) => b.nombre).map((b) => b.monto), ...(d.billeteras || []).filter((b) => (b.nombre || '').trim()).map((b) => b.monto)].some((x) => M.leerMonto(x) !== null);
            if (!algo) {
                ob.errores = ['dinero'];
                P.render({ foco: '#ob-efectivo' });
                return;
            }
        }
        if (ob.paso === 4) {
            terminarOnboarding();
            return;
        }
        ob.paso++;
        ob.errores = [];
        P.render({ nueva: true });
        P.emitir('onboarding:paso' + ob.paso);
    };
    function terminarOnboarding() {
        const st = P.st;
        const d = P.ui.ob.datos;
        st.nombre = (d.nombre || '').trim();
        st.espacio = st.nombre ? 'Hogar de ' + st.nombre : 'Tu hogar';
        const nombreBanco = (b) => (b === 'Otro' ? 'Tu banco' : 'Banco ' + b);
        // V2-45: cada banco y cada billetera es un lugar; cada banco trae su débito; varias tarjetas de crédito.
        const bancos = [...(d.bancoNombre ? [{ nombre: d.bancoNombre, monto: d.bancoMonto }] : []), ...(d.bancosMas || []).filter((b) => b.nombre)].map((b, i) => ({ ...b, id: i ? 'banco' + (i + 1) : 'banco', sufijo: i ? String(i + 1) : '' }));
        const billeteras = (d.billeteras || []).filter((b) => (b.nombre || '').trim()).map((b, i) => ({ ...b, id: 'billetera' + (i + 1) }));
        const bancoId = bancos[0] ? bancos[0].id : null;
        st.lugares = [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵' }];
        st.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }];
        for (const b of bancos) {
            st.lugares.push({ id: b.id, tipo: 'banco', nombre: nombreBanco(b.nombre), emoji: '🏦' });
            st.medios.push({ id: 'debito' + b.sufijo, nombre: 'Débito ' + (b.nombre === 'Otro' ? 'del banco' : b.nombre), emoji: '🏦', lugar: b.id, tarjetaDebito: true });
            if (d.medios.transferencia) st.medios.push({ id: 'transferencia' + b.sufijo, nombre: bancos.length > 1 ? 'Transferencia ' + (b.nombre === 'Otro' ? 'del banco' : b.nombre) : 'Transferencia', emoji: '🔁', lugar: b.id });
        }
        for (const b of billeteras) {
            st.lugares.push({ id: b.id, tipo: 'billetera', nombre: b.nombre.trim(), emoji: '📱' });
            st.medios.push({ id: 'm' + b.id, nombre: b.nombre.trim(), emoji: '📱', lugar: b.id });
        }
        if (d.medios.credito) {
            [d.credito, ...(d.creditosMas || [])].forEach((c, i) => {
                const id = i ? 'credito' + (i + 1) : 'credito';
                const corte = Math.min(31, Math.max(1, Number(c.corte) || 15));
                const pagoDia = Math.min(31, Math.max(1, Number(c.pago) || 5));
                const ultimoCorte = M.ultimoDia(st.hoy, corte);
                const [y, m] = M.partes(ultimoCorte);
                const [vy, vm] = M.mesMas(y, m, 1);
                const nombre = 'Crédito ' + c.banco + ([d.credito, ...(d.creditosMas || [])].filter((z, j) => j < i && z.banco === c.banco).length ? ' ' + (i + 1) : '');
                st.tarjetas.push({ id, nombre, emoji: '💳', corte, pagoDia, interesesAnio: 0, estados: [{ corte: ultimoCorte, total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: M.fechaDe(vy, vm, pagoDia), inicial: true }] });
                st.medios.push({ id, nombre, emoji: '💳', tarjeta: id });
            });
        }
        // Primer cuadre de cada lugar: lo que dijo que tiene.
        const montoDe = (l) => (l.id === 'efectivo' ? d.efectivo : (bancos.find((b) => b.id === l.id) || billeteras.find((b) => b.id === l.id) || {}).monto);
        for (const l of st.lugares) {
            const monto = M.leerMonto(montoDe(l)) || 0;
            const r = P.registrar(st, { tipo: 'cuadre', fecha: st.hoy, lugar: l.id, monto, esperado: monto, primero: true });
            l.cuadre = { fecha: st.hoy, seq: r.seq, monto };
        }
        const lugarDe = (x) => (x === 'efectivo' || !bancoId ? 'efectivo' : bancoId);
        const ing = d.ingresos;
        // V2-43: la historia empieza hoy. No se inventan llegadas: lo de antes ya está en lo que dijo que tiene.
        st.inicio = st.hoy;
        const atras = st.hoy;
        const diaValido = (n, def) => Math.min(31, Math.max(1, Number(n) || def));
        if (ing.quincena) {
            const q = ing.quincena;
            const dias = q.dias === '15-31' ? [15, 31] : q.dias === 'otros' ? [diaValido(q.d1, 15), diaValido(q.d2, 30)].sort((a, b) => a - b) : [15, 30];
            st.ingresos.push({ id: 'quincena', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: M.leerMonto(q.monto) || 0, aprox: true, frecuencia: 'quincenal', dias, lugar: lugarDe(q.lugar), desde: atras, llegadas: {} });
        }
        if (ing.mes) st.ingresos.push({ id: 'mensual', nombre: 'Salario', emoji: '💼', categoria: 'salario', monto: M.leerMonto(ing.mes.monto) || 0, aprox: true, frecuencia: 'mensual', dia: ing.mes.dia || 30, lugar: lugarDe(ing.mes.lugar), desde: atras, llegadas: {} });
        if (ing.semana) st.ingresos.push({ id: 'semanal', nombre: 'Pago de la semana', emoji: '💼', categoria: 'salario', monto: M.leerMonto(ing.semana.monto) || 0, aprox: true, frecuencia: 'semanal', diaSemana: ing.semana.dia || 5, lugar: lugarDe(ing.semana.lugar || 'efectivo'), desde: atras, llegadas: {} });
        if (ing.catorcena) st.ingresos.push({ id: 'catorcena', nombre: 'Catorcena', emoji: '💼', categoria: 'salario', monto: M.leerMonto(ing.catorcena.monto) || 0, aprox: true, frecuencia: 'catorcenal', fecha: /^\d{4}-\d{2}-\d{2}$/.test(ing.catorcena.proximo || '') ? ing.catorcena.proximo : st.hoy, lugar: lugarDe(ing.catorcena.lugar), desde: atras, llegadas: {} });
        // El principal: el que eligió entre sus ingresos fijos, o el primero.
        const ids = { quincena: 'quincena', mes: 'mensual', semana: 'semanal', catorcena: 'catorcena' };
        const regulares = Object.keys(ids).filter((k) => ing[k]);
        const elegido = ids[regulares.includes(d.principal) ? d.principal : regulares[0]];
        for (const i of st.ingresos) i.principal = i.id === elegido;
        for (const i of st.ingresos) if (!i.principal) i.extra = true;
        if (ing.remesa && ing.remesa.cada === 'mes') st.ingresos.push({ id: 'remesa', nombre: 'Remesa', emoji: '🌎', categoria: 'remesa', monto: M.leerMonto(ing.remesa.monto) || 0, aprox: true, frecuencia: 'mensual', dia: ing.remesa.dia || 10, lugar: 'efectivo', principal: false, extra: true, desde: atras, llegadas: {} });
        // Extras de una vez al año: aguinaldo (12 de diciembre) y Quincena 25 (25 de enero), editables después.
        const proximaFecha = (mes, dia) => {
            const [y] = M.partes(st.hoy);
            const f = M.fechaDe(y, mes, dia);
            return f >= st.hoy ? f : M.fechaDe(y + 1, mes, dia);
        };
        const ext = d.extras || {};
        if (ext.aguinaldo) st.ingresos.push({ id: 'aguinaldo', nombre: 'Aguinaldo', emoji: '🎁', categoria: 'aguinaldo', monto: M.leerMonto(ext.aguinaldo.monto) || 0, aprox: true, frecuencia: 'unico', fecha: proximaFecha(12, 12), lugar: lugarDe('banco'), principal: false, extra: true, desde: st.hoy, llegadas: {} });
        if (ext.q25) st.ingresos.push({ id: 'q25', nombre: 'Quincena 25', emoji: '🎁', categoria: 'aguinaldo', monto: M.leerMonto(ext.q25.monto) || 0, aprox: true, frecuencia: 'unico', fecha: proximaFecha(1, 25), lugar: lugarDe('banco'), principal: false, extra: true, desde: st.hoy, llegadas: {} });
        // Si hoy es día de pago, la persona dijo si ya está contado en lo que tiene (nada se supone).
        if (d.hoyCayo === 'si') for (const i of st.ingresos) if (i.frecuencia !== 'unico' && M.fechasRegla(i, st.hoy, st.hoy).length) i.llegadas[st.hoy] = { monto: i.monto, enCuadre: true };
        if (ing.varia && !st.ingresos.some((i) => i.principal)) st.horizonteVariable = ing.varia.horizonte;
        // V2-47 / V2-07: una suscripción se paga, si tienes, con tu tarjeta de crédito.
        const credito = st.medios.find((m) => m.tarjeta);
        for (const p of d.pagos) {
            const medioId = p.suscripcion ? (credito ? credito.id : st.medios.find((m) => m.tarjetaDebito)?.id || 'efectivo') : (p.categoria === 'servicios' || p.deuda) && bancoId ? 'debito' : 'efectivo';
            const fecha = p.anual ? M.proximoDia(st.hoy, p.dia) : null;
            const x = P.crearPago(st, { nombre: p.nombre, emoji: p.emoji, categoria: p.categoria, monto: p.monto, estimado: p.variable, frecuencia: p.anual ? 'meses' : p.frecuencia, cadaMeses: p.anual ? 12 : undefined, fecha, dia: p.dia, diaSemana: p.diaSemana, dias: p.dias, medio: medioId, tipoPago: p.suscripcion ? 'suscripcion' : undefined });
            if (p.deuda) Object.assign(x, { tipoDeuda: p.deuda === 'tarjeta' ? 'tarjeta' : p.deuda, deuda: null, ...(p.deuda === 'tarjeta' ? { cuotaTarjeta: true } : {}) });
        }
        for (const p of st.pagos) p.desde = st.hoy;
        st.configurado = true;
        P.ui.ob = null;
        P.ui.tab = 'hoy';
        P.ui.stack = [{ tipo: 'primerNumero' }];
        P.render({ nueva: true });
        P.emitir('onboarding:fin');
    }
    S.primerNumero = function () {
        const st = P.st;
        const k = P.calc();
        const pend = [];
        for (const t of k.tarjetas) if (t.pendiente) pend.push(`Tu ${esc(t.t.nombre)}: la contamos cuando anotes tu estado de cuenta.`);
        if (!M.principal(st)) pend.push(st.horizonteVariable === 'quince' ? 'Como tu ingreso varía, vemos los próximos 15 días.' : 'Como tu ingreso varía, vemos hasta fin de mes.');
        if (!st.pagos.length) pend.push('Tus pagos fijos: agrégalos en Pagos cuando quieras.');
        else if (k.hz.ingreso && k.proxima && k.proxima.salePagos > 0) pend.push(`Lo que vence desde tu ${P.nombreIngreso(k.hz)} del ${M.partes(k.hz.fecha)[2]} se paga con ese ingreso: no baja tu número de hoy. Si quieres pagar algo con lo que ya tienes, cámbialo en ese pago.`);
        // V2-35: cómo quedas el próximo día de pago.
        if (k.hz.ingreso && k.proxima && (k.proxima.entra || k.proxima.pagos)) pend.push(`${esc(P.tituloPeriodo(k.proxima, k.hz))}: ${esc(P.lineaPeriodo(k.proxima))}${P.incluyePeriodo(k.proxima) ? ` (${esc(P.incluyePeriodo(k.proxima))})` : ''}.`);
        return `<div class="pg pg--flujo">
            <header class="pg-head"><p class="paso">¡Listo!</p><h1 class="h1" tabindex="-1">Tu primer número</h1><p class="sub">Esto es lo que te queda libre, ya sin tus pagos.</p></header>
            <section class="portada portada--quieta app-home-pattern" aria-label="Tu libre"><svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.circles}</svg><div class="portada-b portada-b--quieta"><span class="portada-h">${esc(P.textoHorizonte(k.hz))}</span><span class="portada-l">Libre</span><span class="portada-n">${dinero(k.libre)}</span><span class="portada-s">${k.porDia !== null ? `~${dinero(k.porDia, { aprox: true }).replace('~', '')} por día` : ''}</span></div></section>
            ${P.tarjetaSeccion('Así lo calculamos', `<ul class="d-items d-items--card"><li><span>Tienes</span><span>${dinero(k.tienes)}</span></li><li><span>Por pagar antes de tu ingreso</span><span>${k.porPagar + k.enTarjetas ? dinero(-(k.porPagar + k.enTarjetas)) : dinero(0)}</span></li>${k.reservadoPagos + k.reservadoProxima ? `<li><span>Reservado para pagos</span><span>${dinero(-(k.reservadoPagos + k.reservadoProxima))}</span></li>` : ''}<li class="d-total-li"><span>Libre</span><span>${dinero(k.libre)}</span></li></ul>`, { id: 'pn-calc' })}
            ${pend.length ? `<div class="nota nota--info" role="note">${icon('info')}<div><p><strong>Bueno saber</strong></p><ul class="mini-lista">${pend.map((x) => `<li>${x}</li>`).join('')}</ul></div></div>` : ''}
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="primerNumeroListo" data-fk="pn-listo">Ir a Hoy</button>
        </div>`;
    };
    P.acciones.primerNumeroListo = () => {
        P.irTab('hoy');
        P.emitir('onboarding:hoy');
    };
})();
