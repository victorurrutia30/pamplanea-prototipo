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
    P.pagarTarjeta = function (st, tarjetaId, { monto, lugar, fecha, soltarReserva = null }) {
        const t = M.tarjeta(st, tarjetaId);
        const antes = M.tarjetaInfo(st, t);
        const r = P.registrar(st, { tipo: 'pagoTarjeta', fecha, monto, lugar, tarjeta: tarjetaId, nombre: 'Pago de ' + t.nombre, nuevo: true });
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
     * sobra vuelve a «Sin apartar». Sin fecha (Emergencias), solo baja lo usado. Si se pagó con
     * crédito, ese dinero queda reservado para el pago de la tarjeta (V2-27).
     */
    P.usarApartado = function (st, apartadoId, registro, { cerrar = null, vaciar = false } = {}) {
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
            if (cumplida) st.logros.unshift({ nombre: a.nombre, fecha: st.hoy, monto: a.monto, medio: registro.medio, reserva: reserva ? reserva.id : null, emoji: a.emoji });
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
        return P.registrar(st, { tipo: 'ingreso', fecha, monto, nombre: ing.nombre, categoria: ing.categoria, emoji: ing.emoji, lugar, ingreso: ing.id, ocurrencia: fechaEsperada, nuevo: true });
    };
    P.crearPago = function (st, d) {
        const id = 'p' + st.seq++;
        const p = { id, nombre: d.nombre, emoji: d.emoji || '🧾', categoria: d.categoria || 'otros', monto: d.monto, estimado: !!d.estimado, frecuencia: d.frecuencia === 'unico' ? 'unico' : d.frecuencia, dia: d.dia, diaSemana: d.diaSemana, medio: d.medio, avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: st.hoy, hechos: {}, previos: [], nuevo: true };
        if (p.frecuencia === 'unico') p.fecha = M.proximoDia(st.hoy, d.dia || 1);
        if (p.frecuencia === 'semanal' && p.diaSemana === undefined) p.diaSemana = 5;
        st.pagos.push(p);
        return p;
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
    const medios = (st) => st.medios.map((m) => ({ v: m.id, t: m.nombre, e: m.emoji }));
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
    const EJEMPLOS = ['Ej. pupusas 6', 'Ej. súper 25', 'Ej. me pagaron 600', 'Ej. acuérdame colegio 20 el 5', 'Ej. aparté 50 emergencias', 'Ej. retiré 100 del cajero', 'Ej. tengo 300', 'Ej. vendí 45'];
    const ATAJOS = [['gasto', 'Gasté', 'receipt-text'], ['ingreso', 'Recibí', 'hand-coins'], ['pago', 'Recordarme un pago', 'bell'], ['apartar', 'Apartar', 'circle-plus'], ['mover', 'Mover', 'arrow-left-right'], ['cuadre', 'Tengo $___', 'scale']];
    const TIPO_NOMBRE = { gasto: 'Gasto', pagado: 'Pagado', ingreso: 'Ingreso', pago: 'Recordatorio de pago', apartar: 'Apartar', liberar: 'Liberar', cuadre: 'Tengo (cuadre)', mover: 'Mover', pagoTarjeta: 'Pagar tarjeta' };
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
        return d;
    }
    function chip(campo, texto, { falta = false, abierto = false, etiqueta = '' } = {}) {
        return `<button type="button" class="chip chip--dato${falta ? ' chip--falta' : ''}" data-a="anotarEditar" data-campo="${campo}" aria-expanded="${abierto}" data-fk="ch-${campo}">${etiqueta ? sr(etiqueta + ': ') : ''}${texto}${icon(abierto ? 'chevron-up' : 'chevron-down', 'ico-xs')}</button>`;
    }
    function chipsDe(st, h) {
        const d = h.d;
        const out = [chip('tipo', esc(TIPO_NOMBRE[d.tipo]), { abierto: h.editando === 'tipo', etiqueta: 'Qué pasó' })];
        const montoChip = () => chip('monto', d.monto !== null ? dinero(d.monto) : '¿Cuánto?', { falta: d.monto === null, abierto: h.editando === 'monto', etiqueta: 'Monto' });
        const fechaChip = () => chip('fecha', esc(M.capital(M.relativa(d.fecha, st.hoy))), { abierto: h.editando === 'fecha', etiqueta: 'Cuándo' });
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
            const cuando = d.frecuencia === 'semanal' ? `cada ${M.DIAS[d.diaSemana ?? 5]}` : d.dia ? `el ${d.dia}` : '¿Qué día?';
            out.push(chip('dia', esc(cuando), { falta: d.frecuencia !== 'semanal' && !d.dia, abierto: h.editando === 'dia', etiqueta: 'Cuándo' }));
            if (d.frecuencia) out.push(chip('frecuencia', d.frecuencia === 'mensual' ? 'Cada mes' : d.frecuencia === 'semanal' ? 'Cada semana' : 'Solo esta vez', { abierto: h.editando === 'frecuencia', etiqueta: 'Se repite' }));
            out.push(medioChip());
        } else if (d.tipo === 'apartar' || d.tipo === 'liberar') {
            out.push(montoChip());
            const a = M.apartado(st, d.apartado);
            out.push(chip('apartado', a ? `${emo(a.emoji, 16)} ${esc(a.nombre)}` : d.nombre ? `${esc(d.nombre)} <span class="chip-s">nuevo</span>` : '¿En cuál?', { falta: !a && !d.nombre, abierto: h.editando === 'apartado', etiqueta: 'Apartado' }));
        } else if (d.tipo === 'cuadre') {
            out.push(montoChip());
            const l = M.lugar(st, d.lugar);
            out.push(chip('lugar', l ? `${emo(l.emoji, 16)} ${esc(l.nombre)}` : '¿Dónde?', { falta: !l, abierto: h.editando === 'lugar', etiqueta: 'Dónde' }));
        } else if (d.tipo === 'mover') {
            out.push(montoChip());
            const de = M.lugar(st, d.de);
            const a = M.lugar(st, d.a);
            out.push(chip('mover', `${de ? esc(de.nombre) : '¿De dónde?'} → ${a ? esc(a.nombre) : '¿A dónde?'}`, { falta: !de || !a, abierto: h.editando === 'mover', etiqueta: 'De dónde a dónde' }));
        } else if (d.tipo === 'pagoTarjeta') {
            out.push(montoChip());
            out.push(chip('lugar', `${esc(M.lugar(st, d.lugar)?.nombre || '¿Desde dónde?')} → ${esc(M.tarjeta(st, d.tarjeta)?.nombre || 'tarjeta')}`, { abierto: h.editando === 'lugar', etiqueta: 'De dónde' }));
        }
        return out.join('');
    }
    function editorAnotar(st, h, campo) {
        const d = h.d;
        if (campo === 'tipo') return opciones(h, { campo: 'tipo', label: '¿Qué pasó?', accion: 'anotarValor', valor: d.tipo, lista: Object.entries(TIPO_NOMBRE).filter(([k]) => !['pagado', 'liberar', 'pagoTarjeta'].includes(k) || k === d.tipo).map(([v, t]) => ({ v, t })) });
        if (campo === 'monto') return campoMonto(h, { valor: d.monto !== null ? M.montoCampo(d.monto) : '', errorTexto: 'Escribe cuánto fue', id: 'f-monto' });
        if (campo === 'medio') return opciones(h, { campo: 'medio', label: d.tipo === 'pago' ? '¿Con qué lo pagas?' : 'Pagado con', accion: 'anotarValor', valor: d.medio, lista: medios(st), errorTexto: 'Elige con qué pagaste' });
        if (campo === 'fecha') return opciones(h, { campo: 'fecha', label: '¿Cuándo?', accion: 'anotarValor', valor: d.fecha, lista: fechasCortas(st, d.ocurrencia && d.ocurrencia <= st.hoy ? d.ocurrencia : null) });
        if (campo === 'lugar') return opciones(h, { campo: 'lugar', label: d.tipo === 'ingreso' ? '¿Dónde cayó?' : d.tipo === 'pagoTarjeta' ? '¿Desde dónde?' : '¿Dónde?', accion: 'anotarValor', valor: d.lugar, lista: lugares(st), errorTexto: 'Elige dónde' });
        if (campo === 'frecuencia') return opciones(h, { campo: 'frecuencia', label: '¿Se repite?', accion: 'anotarValor', valor: d.frecuencia, lista: [{ v: 'mensual', t: 'Cada mes' }, { v: 'semanal', t: 'Cada semana' }, { v: 'unico', t: 'Solo esta vez' }], errorTexto: 'Dinos si se repite' });
        if (campo === 'dia') return d.frecuencia === 'semanal' ? opciones(h, { campo: 'diaSemana', label: '¿Qué día de la semana?', accion: 'anotarValor', valor: d.diaSemana ?? 5, lista: [1, 2, 3, 4, 5, 6, 0].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })) }) : selectorDia(h, 'dia', d.dia);
        if (campo === 'apartado') return opciones(h, { campo: 'apartado', label: '¿En cuál apartado?', accion: 'anotarValor', valor: d.apartado, lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), errorTexto: 'Elige un apartado' }) + (d.tipo === 'apartar' ? campoTexto(h, { campo: 'nuevoApartado', label: 'O crea uno nuevo', valor: d.apartado ? '' : d.nombre || '', placeholder: 'Ej. Regalo de mamá' }) : '');
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
            const pregunta = d.apartadoPorNombre ? `¿Lo tomas de tu apartado ${esc(a.nombre)}? <span class="opcional">(tiene ${dinero(a.monto)})</span>` : `¿Lo pagas con tu apartado ${esc(a.nombre)} (${dinero(a.monto)})?`;
            out.push(`<div class="pregunta"><p class="campo-l">${pregunta}</p><div class="chips"><button type="button" class="chip" data-a="anotarValor" data-campo="usarApartado" data-v="${a.id}" data-fk="usar-si">${emo(a.emoji, 18)}Sí, de ${esc(a.nombre)}</button><button type="button" class="chip" data-a="anotarValor" data-campo="usarApartado" data-v="no" data-fk="usar-no">No</button></div></div>`);
        }
        if (d.tipo === 'gasto' && d.usarApartado && d.usarApartado !== 'no' && M.apartado(st, d.usarApartado)) {
            const a = M.apartado(st, d.usarApartado);
            const m = M.medio(st, d.medio);
            const texto = m && m.tarjeta ? `Sale de tu apartado <strong>${esc(a.nombre)}</strong> y queda guardado para pagar tu tarjeta: tu libre no baja.` : `Sale de tu apartado <strong>${esc(a.nombre)}</strong>: tu libre no baja.`;
            out.push(`<div class="nota nota--ok" role="note">${icon('check')}<p>${texto} <button type="button" class="link link--inline" data-a="anotarValor" data-campo="usarApartado" data-v="no" data-fk="usar-quitar">No usar el apartado</button></p></div>`);
        }
        // V2-25: compra con crédito cuando el libre no alcanza: aviso amable, sin culpa.
        if (d.tipo === 'gasto' && d.monto && (!d.usarApartado || d.usarApartado === 'no')) {
            const m = M.medio(st, d.medio);
            const t = m && m.tarjeta ? M.tarjeta(st, m.tarjeta) : null;
            if (t && P.calc().libre - d.monto < 0) {
                const vence = M.tarjetaInfo(st, t).venceCompras;
                out.push(`<div class="nota nota--atencion" role="note">${icon('info')}<p><strong>Esto se paga el ${M.partes(vence)[2]} y hoy no te alcanzaría.</strong> Puedes guardarlo igual; lo verás claro en tu número.</p></div>`);
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
            out.push(`<div class="pregunta" role="group" aria-labelledby="l-apartarIgual"><p class="campo-l" id="l-apartarIgual">${esc(M.capital(art))} ya está en tus pagos y se descuenta ${el ? 'solo' : 'sola'}. ¿${el ? 'Lo' : 'La'} apartas igual?</p><div class="chips"><button type="button" class="chip" data-a="anotarValor" data-campo="apartarIgual" data-v="si" data-fk="ap-igual-si">Sí, apartar igual</button><button type="button" class="chip" data-a="anotarValor" data-campo="apartarIgual" data-v="no" data-fk="ap-igual-no">No, déjalo</button></div>${error(h, 'apartarIgual', 'Elige una opción')}</div>`);
        }
        if (d.tipo === 'mover' && d.preguntarComision) {
            out.push(`<div class="pregunta"><p class="campo-l" id="l-comision">¿Te cobraron comisión? <span class="opcional">(opcional)</span></p><div class="chips" role="group" aria-labelledby="l-comision"><button type="button" class="chip" aria-pressed="${d.comision === null}" data-a="anotarValor" data-campo="comisionSi" data-v="no" data-fk="com-no">${d.comision === null ? icon('check', 'ico-xs') : ''}No</button><button type="button" class="chip" aria-pressed="${d.comision !== null}" data-a="anotarValor" data-campo="comisionSi" data-v="si" data-fk="com-si">${d.comision !== null ? icon('check', 'ico-xs') : ''}Sí</button></div>${d.comision !== null ? campoMonto(h, { campo: 'comision', label: '¿Cuánto te cobraron?', valor: M.montoCampo(d.comision), id: 'f-comision' }) : ''}</div>`);
        }
        if (d.tipo === 'cuadre' && !d.lugar && h.editando !== 'lugar' && h.modo !== 'form') out.push(`<div class="pregunta">${opciones(h, { campo: 'lugar', label: d.monto !== null ? `¿Dónde tienes ${dinero(d.monto)}?` : '¿Dónde?', accion: 'anotarValor', valor: d.lugar, lista: lugares(st), errorTexto: 'Elige dónde' })}</div>`);
        if (d.tipo === 'apartar' && !d.apartado && !d.nombre && h.editando !== 'apartado' && h.modo !== 'form') out.push(`<div class="pregunta">${opciones(h, { campo: 'apartado', label: '¿En cuál apartado?', accion: 'anotarValor', valor: d.apartado, lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), errorTexto: 'Elige un apartado' })}</div>`);
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
        if (d.tipo === 'apartar' && d.monto !== null) {
            const k = P.calc();
            const sin = k.tienes - k.apartado;
            if (d.monto > sin) out.push(`<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p>Solo tienes ${dinero(Math.max(0, sin))} sin apartar. Puedes apartarlo igual, pero te faltará para cubrirlo.</p></div>`);
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
            const ctx = h.ctxMedio ? M.medio(st, h.ctxMedio) : h.ctxLugar ? M.lugar(st, h.ctxLugar) : null;
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
                P.avisar('Listo, no apartamos nada', { check: false });
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
        if (['medio', 'fecha', 'lugar', 'frecuencia', 'categoria', 'dia', 'diaSemana', 'apartado'].includes(d.campo) && h.editando === d.campo) h.editando = null;
        if (h.intento) h.errores = M.faltan(st, h.d);
        P.render();
        P.emitir('anotar:' + d.campo + ':' + v);
    };
    P.acciones.anotarGuardar = () => {
        const h = P.ui.hoja;
        const st = P.st;
        if (!h.d || !h.d.tipo) {
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
        const claves = ['guardado:' + d.tipo, 'guardado:' + d.tipo + ':' + nombreClave];
        P.ui.hoja = null;
        let texto = 'Guardado';
        let cambiar = null;
        P.cambiar(
            (s) => {
                if (d.tipo === 'gasto') {
                    const r = P.registrar(s, { tipo: 'gasto', fecha: d.fecha, monto: d.monto, nombre: d.nombre, categoria: d.categoria, emoji: d.emoji, medio: d.medio, anotado: true, nuevo: true });
                    if (d.usarApartado && d.usarApartado !== 'no') {
                        const u = P.usarApartado(s, d.usarApartado, r);
                        if (u && u.reserva) texto = `Guardado · ${dinero(u.usado)} quedan para pagar tu tarjeta`;
                        else if (u && u.cierra) texto = `Guardado · cerramos tu apartado ${r.apartadoNombre}`;
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
                    P.crearPago(s, { nombre: d.nombre, emoji: d.emoji, categoria: d.categoria, monto: d.monto, frecuencia: d.frecuencia, dia: d.dia, diaSemana: d.diaSemana, medio: d.medio });
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
            const antes = hz.ingreso ? (hz.esHoy ? 'antes de hoy' : `antes del ${M.partes(hz.fecha)[2]}`) : 'en este periodo';
            const items = k.items.map((o) => `<li><span>${emo(o.pago.emoji, 16)} ${esc(o.pago.nombre)} <span class="d-sub">${o.estado === 'vencido' ? 'venció el ' + M.partes(o.fecha)[2] : 'el ' + M.partes(o.fecha)[2]}</span></span><span>${dinero(o.monto, { aprox: o.estimado })}</span></li>`);
            for (const t of k.tarjetas) {
                if (t.pendiente) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">estado de cuenta por anotar</span></span><span>Por confirmar</span></li>`);
                // V2-29 #1: vence después del ingreso, pero ya baja el libre; se dice cuándo vence.
                if (t.porPagarEstado) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">estado de cuenta, ${t.ult.vence < st.hoy ? 'venció' : 'vence'} el ${M.partes(t.ult.vence)[2]} ${M.MESES_CORTOS[M.partes(t.ult.vence)[1] - 1]}</span></span><span>${dinero(t.porPagarEstado)}</span></li>`);
                const compras = t.comprasNetas - t.reservado;
                if (compras > 0) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">compras nuevas, se pagan el ${M.partes(t.venceCompras)[2]} ${M.MESES_CORTOS[M.partes(t.venceCompras)[1] - 1]}</span></span><span>${dinero(compras)}</span></li>`);
            }
            const noCuenta = [];
            if (hz.ingreso && !hz.esHoy) noCuenta.push(`Tu ${esc(P.nombreIngreso(hz))} del ${M.partes(hz.fecha)[2]} (${dinero(hz.ocurrencia.monto, { aprox: true })}): suma cuando llegue.`);
            if (hz.esHoy) noCuenta.push(`Tu ${esc(P.nombreIngreso(hz))} de hoy: suma cuando confirmes que te cayó.`);
            for (const o of hz.atrasadas || []) noCuenta.push(`Tu ${esc(o.ingreso.nombre.toLowerCase())} del ${M.fechaCorta(o.fecha)}: falta confirmar si llegó.`);
            for (const i of st.ingresos.filter((x) => x.extra)) {
                const o = M.ocurrenciasIngreso(st, i, st.hoy, M.sumarDias(st.hoy, 400)).find((x) => x.estado !== 'llego');
                if (o) noCuenta.push(`${esc(i.nombre)} (${dinero(o.monto, { aprox: o.aprox })}, ${M.fechaCorta(o.fecha)}): suma cuando llegue.`);
            }
            for (const t of k.tarjetas.filter((x) => x.cupoLibre !== null)) noCuenta.push(`El cupo de ${esc(t.t.nombre)} (${dinero(t.cupoLibre)} disponibles): no es tu dinero, nunca suma.`);
            const fila = (signo, titulo, monto, ir, sub = '', extra = '') => `<li class="d-fila"><button type="button" class="d-b" data-a="desgloseIr" data-ir="${ir}" data-fk="d-${ir}"><span class="d-signo" aria-hidden="true">${signo}</span><span class="d-t">${titulo}${sub ? `<span class="d-sub">${sub}</span>` : ''}</span><span class="d-m">${monto}</span>${icon('chevron-right', 'ico-xs')}</button>${extra}</li>`;
            const dia = M.principal(st) ? M.DIAS[M.principal(st).diaSemana] : '';
            const reservaSub = (r) => `Llevas ${dinero(r.guardado)} de ${dinero(r.total)} para el ${M.partes(r.fecha)[2]}.${r.falta > 0 ? ` Te faltan ${dinero(r.falta)} para ir al día.` : ''}${r.restantes ? ` ${P.quedan(r)}.` : ''}`;
            const falta = k.deficit + M.suma(k.reservas, (r) => r.falta);
            return {
                titulo: '¿De dónde sale tu libre?',
                cuerpo: `<ol class="desglose">
                    ${fila('', 'Tienes', dinero(k.tienes), 'midinero', esc(st.lugares.map((l) => l.nombre).join(' + ')))}
                    ${k.apartado ? fila('−', 'Apartado', dinero(k.apartado), 'apartados', esc(st.apartados.map((a) => a.nombre).join(', '))) : ''}
                    ${fila('−', `Por pagar ${antes}`, dinero(k.porPagar + k.enTarjetas - k.reservadoTarjetas), 'pagos', items.length ? '' : 'Nada vence antes', items.length ? `<ul class="d-items">${items.join('')}</ul>` : '')}
                    ${k.reservas.map((r) => fila('−', `Guardando para ${esc(P.conArticulo(r.pago.nombre))}`, dinero(r.guardado), 'guardando', reservaSub(r))).join('')}
                    ${k.tarjetas.filter((t) => t.reservado).map((t) => fila('−', `Guardado para ${esc(t.t.nombre)}`, dinero(t.reservado), 'guardando', `De tu apartado ${esc(t.reservas.map((r) => r.de).join(', '))}, para tu pago del ${M.partes(t.venceCompras)[2]}`)).join('')}
                    <li class="d-total"><span class="d-signo" aria-hidden="true">=</span><span class="d-t">Libre</span><span class="d-m">${dinero(k.libre)}</span></li>
                </ol>
                ${falta > 0 ? `<div class="nota nota--atencion" role="note">${icon('triangle-alert')}<p><strong>Te faltan ${dinero(falta)}.</strong> Tu libre queda en $0.00, nunca en negativo. ${k.deficit ? 'Lo que tienes no cubre todo lo de arriba.' : 'Con lo que llegue se completa.'}</p></div>` : ''}
                ${k.porDia !== null ? `<p class="txt">Son unos ${dinero(k.porDia, { aprox: true })} por día durante ${plural(k.hz.dias, 'día', 'días')}.</p>` : ''}
                ${noCuenta.length ? `<div class="nota nota--info" role="note">${icon('info')}<div><p><strong>Todavía no cuenta</strong></p><ul class="mini-lista">${noCuenta.map((x) => `<li>${x}</li>`).join('')}</ul></div></div>` : ''}`,
                pie: pie1('cerrarHoja', 'Entendido', 'desglose-ok'),
            };
        },
    };
    P.acciones.desgloseIr = (d) => {
        P.cerrarHoja({ sinFoco: true });
        if (d.ir === 'apartados' || d.ir === 'guardando') {
            P.irTab('midinero');
            document.getElementById(d.ir === 'apartados' ? 'md-ap' : 'md-guardando')?.scrollIntoView({ block: 'start' });
        } else P.irTab(d.ir);
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
                        ${fila('wallet', 'Lugares y medios de pago', esc(st.medios.map((m) => m.nombre).join(' · ')), 'menuIr', 'data-ir="midinero"')}
                        ${fila('bell', 'Avisos', 'Notificación de la app y correo', 'menuIr', 'data-ir="avisos"')}
                        ${fila('book-open', 'Aprende', 'Consejos cortos', 'menuIr', 'data-ir="aprende"')}
                        ${fila('palette', 'Apariencia', 'Serena o Ancla, claro u oscuro', 'menuIr', 'data-ir="apariencia"')}
                    </ul>`,
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
                        ${opciones(h, { campo: 'cuando', label: '¿Cuándo?', lista: fechasCortas(st), valor: h.cuando })}
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
                    ${opciones(h, { campo: 'cuando', label: h.vencido ? '¿Cuándo lo pagaste?' : '¿Cuándo?', lista: fechasCortas(st, h.vencido ? h.fecha : null), valor: h.cuando })}
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
                titulo: h.id ? `Apartar en ${esc(M.apartado(st, h.id).nombre)}` : 'Apartar',
                cuerpo: `${campoMonto(h, { label: '¿Cuánto quieres apartar?', valor: h.monto, ayuda: `Sin apartar tienes ${dinero(k.tienes - k.apartado)}.` })}
                    ${h.id ? '' : opciones(h, { campo: 'apartado', label: '¿En cuál?', lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), valor: h.apartado, errorTexto: 'Elige un apartado o crea uno' }) + campoTexto(h, { campo: 'nuevo', label: 'O crea uno nuevo', valor: h.nuevo, placeholder: 'Ej. Regalo de mamá' })}
                    <p class="fila-s">Apartar no mueve tu dinero: le pone nombre. Si es para un pago (luz, colegio), agrégalo en Pagos.</p>`,
                pie: pie2('apartarOk', 'Apartar'),
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
            { aviso: `Apartaste ${dinero(monto)}`, claves: ['guardado:apartar'] },
        );
    };
    H.liberar = {
        iniciar(h) {
            h.monto = M.montoCampo(M.apartado(P.st, h.id).monto);
        },
        html(h) {
            const a = M.apartado(P.st, h.id);
            return { titulo: `Liberar de ${esc(a.nombre)}`, cuerpo: `${campoMonto(h, { label: '¿Cuánto quieres liberar?', valor: h.monto, ayuda: `Tiene ${dinero(a.monto)}. Lo liberado vuelve a «Sin apartar» y suma a tu libre.` })}`, pie: pie2('liberarOk', 'Liberar') };
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
        P.cambiar((s) => P.apartarEn(s, h.id, monto, 'liberar'), { aviso: `Liberaste ${dinero(Math.min(monto, M.apartado(P.st, h.id).monto))}`, claves: ['guardado:liberar'] });
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
                cuerpo: `${campoMonto(h, { label: '¿Cuánto?', valor: h.monto, ayuda: `Tiene ${dinero(a.monto)}.` })}${opciones(h, { campo: 'a', label: '¿A cuál apartado?', lista: st.apartados.filter((x) => x.id !== h.id).map((x) => ({ v: x.id, t: x.nombre, e: x.emoji, s: dinero(x.monto) })), valor: h.a, errorTexto: 'Elige el apartado' })}`,
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
            { aviso: 'Movido entre apartados', claves: ['guardado:moverApartado'] },
        );
    };
    H.meta = {
        iniciar(h) {
            const a = M.apartado(P.st, h.id);
            h.monto = a.meta ? M.montoCampo(a.meta) : '';
            h.metaFecha = a.metaFecha || '';
        },
        html(h) {
            return {
                titulo: 'Meta del apartado',
                cuerpo: `${campoMonto(h, { label: '¿Cuánto quieres juntar?', valor: h.monto, ayuda: 'Opcional. Déjalo vacío para apartar a tu ritmo.' })}
                    <div class="campo-g"><label class="campo-l" for="f-metaFecha">¿Para cuándo? <span class="opcional">(opcional)</span></label><div class="campo"><input id="f-metaFecha" data-campo="metaFecha" type="date" value="${esc(h.metaFecha)}"></div><p class="campo-ayuda">Con fecha, al repartir tu ingreso te sugerimos cuánto apartar para llegar.</p></div>`,
                pie: pie2('metaOk', 'Guardar'),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.metaOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        P.ui.hoja = null;
        P.cambiar((s) => {
            Object.assign(M.apartado(s, h.id), { meta: monto || null, metaFecha: /^\d{4}-\d{2}-\d{2}$/.test(h.metaFecha || '') ? h.metaFecha : null });
        }, { aviso: 'Meta guardada' });
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
                cuerpo: `<p class="txt">Anotamos el gasto y vaciamos el apartado en un solo paso.</p>
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
        if (monto !== null && monto < a.monto) out.push(`<p class="fila-s">Te sobran ${dinero(a.monto - monto)}: vuelven a «Sin apartar».</p>`);
        if (monto !== null && monto > a.monto) out.push(`<p class="fila-s">Los ${dinero(monto - a.monto)} de más salen de tu libre.</p>`);
        if (m && m.tarjeta) {
            const info = M.tarjetaInfo(st, M.tarjeta(st, m.tarjeta));
            out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Con tarjeta, tu dinero se queda en el banco y <strong>lo guardamos para el pago del ${M.partes(info.venceCompras)[2]}</strong>. Tu libre no cambia.</p></div>`);
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
                cuerpo: `<p class="txt">Tu apartado ${esc(a.nombre)} tiene ${dinero(a.monto)}. ${lista.length ? 'Si ya lo anotaste, elígelo: lo cerramos sin anotar otro gasto.' : 'No encontramos un gasto parecido.'}</p>
                    <div class="opciones-grandes" role="radiogroup" aria-label="El gasto">
                        ${lista.map((r) => op(r.id, `${emo(r.emoji || M.categoria(r.categoria).emoji, 16)} ${esc(r.nombre)}`, `${esc(M.capital(M.relativa(r.fecha, st.hoy)))} · ${esc(M.medio(st, r.medio)?.nombre || '')}`, dinero(r.monto))).join('')}
                        ${op('nuevo', 'No lo anoté', `Anotarlo ahora: ${dinero(a.monto)} de ${esc(a.nombre)}`, '')}
                    </div>
                    ${nuevo ? `${opciones(h, { campo: 'medio', label: '¿Con qué pagaste?', lista: medios(st), valor: h.medio })}${opciones(h, { campo: 'cuando', label: '¿Cuándo?', lista: fechasCortas(st, a.metaFecha && a.metaFecha <= st.hoy ? a.metaFecha : null), valor: h.cuando })}` : ''}
                    ${error(h, 'elegido', 'Elige el gasto o «No lo anoté»')}
                    <p class="fila-s">${h.elegido && !nuevo ? `Tu libre sube ${dinero(a.monto)}: ese gasto ya había bajado tu libre y el apartado también lo guardaba.` : nuevo ? 'Tu libre no cambia: ese dinero ya estaba apartado.' : ''}</p>`,
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
        P.cambiar(
            (s) => {
                const x = M.apartado(s, h.id);
                const r = h.elegido === 'nuevo' ? P.registrar(s, { tipo: 'gasto', fecha: h.cuando, monto: x.monto, nombre: x.nombre, categoria: h.categoria, emoji: x.emoji, medio: h.medio, anotado: true, nuevo: true }) : s.registros.find((y) => y.id === h.elegido);
                return P.usarApartado(s, x.id, r, { cerrar: true });
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
            if (p) Object.assign(h, { editar: true, tipoDeuda: p.tipoDeuda || 'prestamo', nombre: p.nombre, cuota: M.montoCampo(p.monto), dia: String(p.dia || ''), debe: p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined ? M.montoCampo(p.deuda.debe) : '', medio: p.medio });
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
            if (h.tipoDeuda === 'tarjeta') {
                campos = `${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: EJ_DEUDA.tarjeta, errorTexto: 'Ponle un nombre' })}
                    <div class="ob-2">${campoDia(h, 'corte', 'Día de corte')}${campoDia(h, 'pagoDia', 'Día de pago')}</div>
                    <p class="fila-s">Los dos están en tu estado de cuenta.</p>
                    ${campoMonto(h, { campo: 'cupo', label: 'Cupo <span class="opcional">(opcional)</span>', valor: h.cupo, id: 'f-cupo', ayuda: 'Lo verás en su ficha. El cupo nunca suma a tu libre.' })}`;
            } else if (h.tipoDeuda) {
                campos = `${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: EJ_DEUDA[h.tipoDeuda], errorTexto: 'Ponle un nombre' })}
                    <div class="ob-2">${campoMonto(h, { campo: 'cuota', label: 'Cuota', valor: h.cuota, id: 'f-cuota', errorTexto: 'Escribe la cuota' })}${campoDia(h, 'dia', 'Día de pago', 'Cada mes')}</div>
                    ${campoMonto(h, { campo: 'debe', label: '¿Cuánto debes? <span class="opcional">(opcional)</span>', valor: h.debe, id: 'f-debe', ayuda: 'Más o menos. Baja con cada «Pagado».' })}
                    ${opciones(h, { campo: 'medio', label: '¿Con qué la pagas?', lista: medios(st).filter((m) => !M.medio(st, m.v).tarjeta), valor: h.medio })}`;
            }
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Tarjeta o préstamo',
                cuerpo: `${tipos}${campos}${tipo && !h.editar ? `<p class="fila-s">${h.tipoDeuda === 'tarjeta' ? 'Al guardar, su pago aparece solo en Pagos según tu estado de cuenta.' : 'Al guardar, la cuota aparece sola en Pagos.'}</p>` : ''}`,
                pie: pie2('nuevaDeudaOk', h.editar ? 'Guardar cambios' : 'Guardar', { fk: 'deuda-ok' }),
            };
        },
        alValor(h, campo, v) {
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
    const diaValido = (v) => /^\d{1,2}$/.test(String(v || '').trim()) && +v >= 1 && +v <= 31;
    P.acciones.nuevaDeudaOk = () => {
        const h = P.ui.hoja;
        const st = P.st;
        const nombre = (h.nombre || '').trim();
        const faltan = [];
        if (!h.tipoDeuda) faltan.push('tipoDeuda');
        else {
            if (!nombre) faltan.push('nombre');
            if (h.tipoDeuda === 'tarjeta') {
                if (!diaValido(h.corte)) faltan.push('corte');
                if (!diaValido(h.pagoDia)) faltan.push('pagoDia');
            } else {
                if (!M.leerMonto(h.cuota)) faltan.push('cuota');
                if (!diaValido(h.dia)) faltan.push('dia');
            }
        }
        if (!validar(h, faltan)) return;
        const tipo = D.TIPOS_DEUDA.find((x) => x.id === h.tipoDeuda);
        P.ui.hoja = null;
        if (h.tipoDeuda === 'tarjeta') {
            const corte = +h.corte;
            const pagoDia = +h.pagoDia;
            const cupo = M.leerMonto(h.cupo) || null;
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
                    s.tarjetas.push({ id, nombre, emoji: '💳', tipo: 'tarjeta', corte, pagoDia, cupo, interesesAnio: 0, estados: [{ corte: ultimoCorte, total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: M.fechaDe(vy, vm, pagoDia), inicial: true }] });
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
                    ${opciones(h, { campo: 'lugar', label: '¿Dónde cayó?', lista: lugares(st), valor: h.lugar })}`,
                pie: pie2('ingresoLlegoOk', 'Siguiente', { fk: 'ing-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.ingresoLlegoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, monto ? [] : ['monto'])) return;
        P.ui.hoja = null;
        P.cambiar((s) => P.llegoIngreso(s, h.id, h.fechaEsperada, { monto, lugar: h.lugar, fecha: h.cuando }), { aviso: null, claves: ['guardado:ingreso', 'ingreso:llego:' + h.id] });
        P.abrir('reparte', h.id, { fecha: h.fechaEsperada, monto });
    };
    H.nuevoIngreso = {
        iniciar(h) {
            const st = P.st;
            h.nombre = '';
            h.monto = '';
            h.frecuencia = 'unico';
            h.dia = null;
            h.lugar = M.principal(st) ? M.principal(st).lugar : st.lugares[0].id;
        },
        html(h) {
            const st = P.st;
            const sugeridos = [['Salario de mi pareja', '💼'], ['Remesa', '🌎'], ['Comisión', '📈'], ['Bono', '📈'], ['Aguinaldo', '🎁'], ['Quincena 25', '🎁'], ['Turno del cuchubal', '🤝']];
            return {
                titulo: 'Ingreso esperado',
                cuerpo: `<p class="txt">No suma a tu libre hasta que llegue. Cuando llegue, te ayudo a repartirlo.</p>
                    ${opciones(h, { campo: 'sugerido', label: 'Ideas', lista: sugeridos.map(([t, e]) => ({ v: t, t, e })), valor: h.nombre })}
                    ${campoTexto(h, { campo: 'nombre', label: 'Nombre', valor: h.nombre, placeholder: 'Ej. Salario de Luis', errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: '¿Cuánto más o menos?', valor: h.monto })}
                    ${opciones(h, { campo: 'frecuencia', label: '¿Cada cuánto?', lista: [{ v: 'quincenal', t: 'Cada quincena' }, { v: 'mensual', t: 'Cada mes' }, { v: 'semanal', t: 'Cada semana' }, { v: 'unico', t: 'Una vez' }], valor: h.frecuencia })}
                    ${h.frecuencia === 'mensual' || h.frecuencia === 'unico' ? selectorDia(h, 'dia', h.dia, h.frecuencia === 'unico' ? '¿Qué día llega? (el próximo)' : '¿Qué día del mes?') : ''}
                    ${opciones(h, { campo: 'lugar', label: '¿Dónde cae?', lista: lugares(st), valor: h.lugar })}`,
                pie: pie2('nuevoIngresoOk', 'Guardar'),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'sugerido') {
                h.nombre = v;
                if (v === 'Aguinaldo' || v === 'Quincena 25') h.frecuencia = 'unico';
            } else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.nuevoIngresoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const faltan = [...(h.nombre.trim() ? [] : ['nombre']), ...(monto ? [] : ['monto']), ...((h.frecuencia === 'mensual' || h.frecuencia === 'unico') && !h.dia ? ['dia'] : [])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const n = M.normalizar(h.nombre);
                const emoji = /aguinaldo|quincena 25/.test(n) ? '🎁' : /remesa/.test(n) ? '🌎' : /cuchubal/.test(n) ? '🤝' : /comision|bono/.test(n) ? '📈' : '💼';
                s.ingresos.push({ id: 'i' + s.seq++, nombre: h.nombre.trim(), emoji, categoria: 'otro', monto, aprox: true, frecuencia: h.frecuencia, dia: h.dia, diaSemana: 5, fecha: h.frecuencia === 'unico' ? M.proximoDia(s.hoy, h.dia) : undefined, lugar: h.lugar, principal: false, extra: true, desde: s.hoy, llegadas: {} });
            },
            { aviso: 'Ingreso esperado guardado', claves: ['guardado:ingresoEsperado'] },
        );
    };

    // ================================================================== NUEVO PAGO Y EDITAR PAGO
    H.nuevoPago = {
        iniciar(h) {
            const st = P.st;
            if (h.id) {
                const p = M.pago(st, h.id);
                Object.assign(h, { nombre: p.nombre, emoji: p.emoji, categoria: p.categoria, monto: M.montoCampo(p.monto), estimado: p.estimado, frecuencia: p.frecuencia, dia: p.dia, diaSemana: p.diaSemana, medio: p.medio, editar: true });
            } else Object.assign(h, { nombre: '', emoji: '🧾', categoria: 'otros', monto: '', estimado: false, frecuencia: 'mensual', dia: null, diaSemana: 5, medio: st.medios[0].id });
        },
        html(h) {
            const st = P.st;
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Nuevo pago',
                cuerpo: `${h.editar ? '' : `<button type="button" class="opcion-g" data-a="valor" data-campo="frecuente" data-v="prestamo" data-fk="np-cuota">${caja('🏦')}<span class="opcion-g-txt"><span class="opcion-g-t">Cuota de un préstamo</span><span class="fila-s">Casa comercial, préstamo o crédito de vivienda</span></span>${icon('chevron-right', 'ico-xs')}</button>`}
                    ${h.editar ? '' : opciones(h, { campo: 'frecuente', label: 'Frecuentes', lista: D.PAGOS_FRECUENTES.filter((f) => !f.deuda).map((f) => ({ v: f.id, t: f.nombre, e: f.emoji })), valor: '' })}
                    ${campoTexto(h, { campo: 'nombre', label: '¿Qué pagas?', valor: h.nombre, placeholder: 'Ej. Colegio', errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: '¿Cuánto?', valor: h.monto })}
                    <div class="chips"><button type="button" class="chip" aria-pressed="${h.estimado}" data-a="valor" data-campo="estimado" data-v="${!h.estimado}" data-fk="estimado">${h.estimado ? icon('check', 'ico-xs') : ''}Varía cada mes (estimado)</button></div>
                    ${opciones(h, { campo: 'frecuencia', label: '¿Cada cuánto?', lista: [{ v: 'mensual', t: 'Cada mes' }, { v: 'semanal', t: 'Cada semana' }, { v: 'unico', t: 'Solo una vez' }], valor: h.frecuencia })}
                    ${h.frecuencia === 'semanal' ? opciones(h, { campo: 'diaSemana', label: '¿Qué día?', lista: [1, 2, 3, 4, 5, 6, 0].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), valor: h.diaSemana }) : selectorDia(h, 'dia', h.dia)}
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
                Object.assign(h, { nombre: f.nombre, emoji: f.emoji, categoria: f.categoria, estimado: !!f.variable, frecuencia: f.semanal ? 'semanal' : 'mensual' });
            } else if (campo === 'estimado') h.estimado = v === 'true';
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    H.editarPago = { ...H.nuevoPago };
    P.acciones.nuevoPagoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const faltan = [...(h.nombre.trim() ? [] : ['nombre']), ...(monto ? [] : ['monto']), ...(h.frecuencia !== 'semanal' && !h.dia ? ['dia'] : [])];
        if (!validar(h, faltan)) return;
        P.ui.hoja = null;
        if (h.editar) {
            P.cambiar((s) => Object.assign(M.pago(s, h.id), { nombre: h.nombre.trim(), monto, estimado: h.estimado, frecuencia: h.frecuencia, dia: h.dia, diaSemana: h.diaSemana, medio: h.medio }), { aviso: 'Cambios guardados' });
            return;
        }
        P.cambiar((s) => P.crearPago(s, { nombre: h.nombre.trim(), emoji: h.emoji, categoria: h.categoria, monto, estimado: h.estimado, frecuencia: h.frecuencia, dia: h.dia, diaSemana: h.diaSemana, medio: h.medio }), { aviso: `${h.nombre.trim()}: guardado en Pagos`, claves: ['guardado:pago', 'guardado:pago:' + claveNombre(h.nombre)] });
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
            const antes = M.anteriorAlCuadre(st, r);
            const cambios = hayCambiosRegistro(h);
            const conApartados = st.apartados.filter((a) => a.monto > 0);
            const puedeApartado = r.tipo === 'gasto' && !r.pago && !r.apartado && conApartados.length;
            const ap = h.apartado ? M.apartado(st, h.apartado) : null;
            const bloqueApartado = r.apartado
                ? `<div class="nota nota--ok" role="note">${icon('check')}<p>Lo tomaste de tu apartado <strong>${esc(r.apartadoNombre || '')}</strong>.</p></div>`
                : puedeApartado
                  ? `<div class="campo-g"><button type="button" class="link link--start" aria-expanded="${h.verApartados || !!ap}" aria-controls="ed-apartados" data-a="valor" data-campo="verApartados" data-v="${!(h.verApartados || !!ap)}" data-fk="ed-tomar">${icon('circle-plus', 'ico-s')}Tomarlo de un apartado</button>
                     <div id="ed-apartados" ${h.verApartados || ap ? '' : 'hidden'}>${opciones(h, { campo: 'apartado', label: '¿De cuál apartado salió?', lista: [...conApartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), { v: '', t: 'De ninguno' }], valor: h.apartado || '' })}
                     ${ap ? (() => {
                         const cierra = !!ap.metaFecha || !!(ap.meta && ap.monto >= ap.meta);
                         return `<div class="nota nota--ok" role="note">${icon('check')}<p>Sale de tu apartado <strong>${esc(ap.nombre)}</strong>: tu libre sube ${dinero(cierra ? ap.monto : Math.min(ap.monto, M.leerMonto(h.monto) || 0))}.${cierra ? ' El apartado se cierra.' : ''}</p></div>`;
                     })() : ''}</div></div>`
                  : '';
            return {
                titulo: 'Corregir',
                cuerpo: `${antes.length ? `<div class="nota nota--info" role="note">${icon('info')}<p>Es anterior a tu cuadre de ${esc(antes.map((l) => `${l.nombre} (${M.fechaCorta(l.cuadre.fecha)})`).join(' y '))}: <strong>corregirlo no cambia tu saldo porque cuadraste después.</strong> Sí cambia el resumen del mes.</p></div>` : ''}
                    ${campoMonto(h, { label: 'Monto', valor: h.monto })}
                    ${r.tipo === 'gasto' || r.tipo === 'ingreso' ? campoTexto(h, { campo: 'nombre', label: r.tipo === 'gasto' ? '¿En qué?' : '¿De qué?', valor: h.nombre }) : ''}
                    ${r.tipo === 'gasto' && !r.pago ? opciones(h, { campo: 'categoria', label: 'Tipo de gasto', lista: D.CATEGORIAS.filter((k) => !['servicios', 'cuotas'].includes(k.id)).map((k) => ({ v: k.id, t: k.nombre, e: k.emoji })), valor: h.categoria }) : ''}
                    ${r.tipo === 'gasto' ? opciones(h, { campo: 'medio', label: 'Pagado con', lista: medios(st), valor: h.medio }) : ''}
                    ${r.tipo === 'ingreso' ? opciones(h, { campo: 'lugar', label: '¿Dónde cayó?', lista: lugares(st), valor: h.lugar }) : ''}
                    ${opciones(h, { campo: 'fecha', label: 'Fecha', lista: fechasCortas(st, h.orig.fecha), valor: h.fecha })}
                    ${bloqueApartado}
                    ${r.pago ? '' : `<button type="button" class="link link--peligro" data-a="eliminarRegistro" data-fk="eliminar">${icon('trash-2', 'ico-s')}Eliminar</button>`}`,
                nota: cambios ? '' : 'Sin cambios por guardar',
                pie: `<button type="button" class="btn btn--48" data-a="cerrarHoja" data-fk="hoja-cancelar">Cancelar</button><button type="button" class="btn btn--48 btn--prim" data-a="editarRegistroOk" data-fk="hoja-ok" ${cambios ? '' : 'disabled'}>Guardar cambios</button>`,
            };
        },
        alValor(h, campo, v) {
            if (campo === 'verApartados') h.verApartados = v === 'true';
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
                    const hecho = Object.values(p.hechos).find((x) => x.registro === r.id);
                    if (hecho) hecho.monto = monto;
                }
                // V2-23 b: arreglar hacia atrás un gasto que debió salir de un apartado.
                if (h.apartado && r.tipo === 'gasto' && !r.apartado) return P.usarApartado(s, h.apartado, r);
                return null;
            },
            {
                aviso: (u) => {
                    const sube = P.calc().libre - libreAntes;
                    return u ? `Salió de tu apartado ${M.apartado(P.deshacer.at(-1), h.apartado)?.nombre || ''}${sube > 0 ? `. Tu libre sube ${dinero(sube)}` : ''}` : 'Cambios guardados';
                },
                claves: ['guardado:correccion', ...(h.apartado ? ['guardado:correccion:apartado'] : [])],
            },
        );
    };
    P.acciones.eliminarRegistro = () => {
        const h = P.ui.hoja;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const r = s.registros.find((x) => x.id === h.id);
                s.registros = s.registros.filter((x) => x.id !== h.id);
                if (r.ingreso && r.ocurrencia) delete M.ingreso(s, r.ingreso).llegadas[r.ocurrencia];
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
        const quePalabra = ing.frecuencia === 'quincenal' ? 'tu quincena' : ing.frecuencia === 'semanal' ? 'tu pago de la semana' : 'tu ' + ing.nombre.toLowerCase();
        const contado = [
            ...k.items.map((o) => `<li><span>${emo(o.pago.emoji, 16)} ${esc(o.pago.nombre)} <span class="d-sub">${o.estado === 'vencido' ? 'venció el ' + M.partes(o.fecha)[2] : M.fechaCorta(o.fecha)}</span></span><span>${dinero(o.monto, { aprox: o.estimado })}</span></li>`),
            ...k.tarjetas.filter((t) => t.enLibre).map((t) => `<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">ya estaba contado</span></span><span>${dinero(t.enLibre)}</span></li>`),
            ...k.reservas.map((r) => `<li><span>${emo(r.pago.emoji, 16)} Guardando para ${esc(P.conArticulo(r.pago.nombre))} <span class="d-sub">${dinero(r.guardado)} de ${dinero(r.total)} (+${dinero(r.porIngreso)} de esta semana)</span></span><span>${dinero(r.guardado)}</span></li>`),
        ];
        const totalContado = k.porPagar + k.enTarjetas + k.guardando;
        const proximo = hz.ingreso ? (hz.ingreso.frecuencia === 'quincenal' ? 'tu próxima quincena' : hz.ingreso.frecuencia === 'semanal' ? 'tu próximo pago' : 'tu próximo ingreso') + ` (${M.fechaLarga(hz.fecha)})` : 'fin de mes';
        const sug = top.sugerencias
            .map((x) => {
                const a = M.apartado(st, x.id);
                if (!a) return '';
                const hecha = top.hechas[x.id];
                const monto = Math.min(x.monto, k.libre);
                const acciones = hecha
                    ? `<p class="sug-ok">${icon('circle-check', 'ico-xs')}Apartaste ${dinero(hecha)}</p>`
                    : monto > 0
                      ? `<div class="chips"><button type="button" class="chip chip--prim" data-a="reparteApartar" data-id="${a.id}" data-m="${monto}" data-fk="sug-${a.id}">Apartar ${dinero(monto)}</button><button type="button" class="chip" data-a="hoja" data-hoja="apartar" data-id="${a.id}" data-fk="sug-otro-${a.id}">Otro monto</button></div>`
                      : `<p class="fila-s">Hoy no te queda libre para apartar.</p>`;
                return `<li class="sug">${P.recorte(a)}<div class="sug-txt"><p class="fila-t">${emo(a.emoji, 16)} ${esc(a.nombre)}</p><p class="fila-s">${a.meta ? `${dinero(a.monto)} de ${dinero(a.meta)}` : `${dinero(a.monto)} · sin meta`}${x.regla ? ` · ${esc(x.regla)}` : ''}</p>
                    ${acciones}</div></li>`;
            })
            .join('');
        return `<div class="pg pg--flujo">
            <header class="pg-head"><p class="paso">${emo(ing.emoji, 18)} Llegó ${esc(quePalabra)}</p><h1 class="h1" tabindex="-1">Reparte ${esc(quePalabra)}</h1><p class="sub">Te cayeron <strong>${dinero(top.monto)}</strong> en ${esc(M.lugar(st, ing.lugar).nombre)}.</p></header>
            ${P.tarjetaSeccion('1. Ya está contado', `<p class="txt txt--card">Esto vence antes de ${esc(proximo)} y ya lo separamos de tu libre:</p><ul class="d-items d-items--card">${contado.join('') || '<li><span>Nada por pagar en estas fechas.</span><span></span></li>'}${contado.length ? `<li class="d-total-li"><span>Total contado</span><span>${dinero(totalContado)}</span></li>` : ''}</ul>`, { id: 'rep-contado' })}
            ${top.sugerencias.length ? P.tarjetaSeccion('2. ¿Quieres apartar algo?', `<p class="txt txt--card">Te sugerimos; tú decides. Nada se aparta solo.</p><ul class="sugs">${sug}</ul>`, { id: 'rep-sug' }) : P.tarjetaSeccion('2. ¿Quieres apartar algo?', `<p class="txt txt--card">Cuando tengas un apartado, aquí te sugeriremos cuánto ponerle. Nada se aparta solo.</p>`, { id: 'rep-sug' })}
            <section class="portada portada--quieta app-home-pattern" aria-label="Tu libre"><svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.circles}</svg><div class="portada-b portada-b--quieta"><span class="portada-h">${esc(P.textoHorizonte(hz))}</span><span class="portada-l">Te queda libre</span><span class="portada-n" aria-live="polite">${dinero(k.libre)}</span><span class="portada-s">${k.porDia !== null ? `~${dinero(k.porDia, { aprox: true }).replace('~', '')} por día` : ''}</span></div></section>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="reparteListo" data-fk="rep-listo">Listo</button>
        </div>`;
    };
    P.acciones.reparteApartar = (d) => {
        const top = P.ui.stack.at(-1);
        const monto = Number(d.m);
        P.cambiar((s) => P.apartarEn(s, d.id, monto, 'apartar'), { aviso: `Apartaste ${dinero(monto)}`, claves: ['guardado:apartar', 'reparte:apartar'] });
        top.hechas[d.id] = monto;
        P.render({ foco: '#rep-sug' });
    };
    P.acciones.reparteListo = () => {
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
                ? `<p class="txt centro">Pagaste ${dinero(top.pagoYa)} a tu ${esc(t.nombre)} desde ${esc(banco ? banco.nombre : 'tu banco')}. La reserva ya no hace falta.</p>
                   <div class="nota nota--ok" role="note">${icon('check')}<p>Tu libre sigue en ${dinero(k.libre)}: ese dinero ya estaba apartado.</p></div>
                   <div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="irTab" data-tab="midinero" data-fk="logro-entendido">Entendido</button></div>`
                : `<p class="txt centro">Pagaste con tu tarjeta, así que tus <strong>${dinero(res.monto)}</strong> quedan guardados para el pago del ${M.partes(info.venceCompras)[2]}.</p>
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
            <div class="nota nota--ok" role="note">${icon('check')}<p>Tu libre no cambió (${dinero(k.libre)}): ese dinero ya estaba apartado.</p></div>
            <div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="irTab" data-tab="hoy" data-fk="logro-hoy">Ir a Hoy</button><button type="button" class="btn btn--48 btn--full" data-a="irTab" data-tab="midinero" data-fk="logro-md">Ver Mi dinero</button></div>
        </div>`;
    };
    /** «Pagar la tarjeta ya»: mover del banco a la tarjeta en ese momento; la reserva desaparece. */
    P.acciones.logroPagarYa = () => {
        const top = P.ui.stack.at(-1);
        const st = P.st;
        const res = (st.reservasTarjeta || []).find((x) => x.id === top.reserva);
        if (!res) return;
        const banco = st.lugares.find((l) => l.tipo === 'banco') || st.lugares[0];
        top.pagoYa = res.monto;
        P.cambiar((s) => P.pagarTarjeta(s, res.tarjeta, { monto: res.monto, lugar: banco.id, fecha: s.hoy, soltarReserva: res.id }), { aviso: 'Pago de tarjeta guardado', claves: ['guardado:pagoTarjeta', 'logro:pagarYa'] });
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
        const hz = M.horizonte(st);
        const atrasadas = hz.atrasadas || [];
        const vencidos = [];
        for (const p of st.pagos.filter((x) => x.activo !== false)) for (const o of M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido') vencidos.push(o);
        for (const o of M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido') vencidos.push(o);
        const pasos = 3;
        const cab = (n, t, s) => `<header class="pg-head"><button type="button" class="atras" data-a="${n === 1 ? 'atras' : 'aldiaAtras'}" aria-label="${n === 1 ? 'Salir de Pongámonos al día' : 'Paso anterior'}" data-fk="ad-atras">${icon('chevron-left')}<span>${n === 1 ? 'Hoy' : 'Atrás'}</span></button><p class="paso">Paso ${n} de ${pasos}</p><h1 class="h1" tabindex="-1">${t}</h1><p class="sub">${s}</p></header>`;
        if (top.paso === 1) {
            const filas = atrasadas.length
                ? atrasadas
                      .map((o) => {
                          const v = top.ingresos[o.fecha] || { decision: null, monto: M.montoCampo(o.monto) };
                          top.ingresos[o.fecha] = v;
                          return `<li class="ad-item">${caja(o.ingreso.emoji)}<div class="ad-txt"><p class="fila-t">${esc(o.ingreso.nombre)} del ${esc(M.fechaLarga(o.fecha))}</p><p class="fila-s">Normalmente ${dinero(o.monto, { aprox: true })} en ${esc(M.lugar(st, o.ingreso.lugar).nombre)}</p>
                            <div class="chips"><button type="button" class="chip" aria-pressed="${v.decision === 'si'}" data-a="aldiaIngreso" data-f="${o.fecha}" data-v="si" data-fk="adi-si-${o.fecha}">${v.decision === 'si' ? icon('check', 'ico-xs') : ''}Sí, me cayó</button><button type="button" class="chip" aria-pressed="${v.decision === 'no'}" data-a="aldiaIngreso" data-f="${o.fecha}" data-v="no" data-fk="adi-no-${o.fecha}">${v.decision === 'no' ? icon('check', 'ico-xs') : ''}No me cayó</button></div>
                            ${v.decision === 'si' ? `<div class="campo-g"><label class="campo-l" for="adi-m-${o.fecha}">¿Cuánto?</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="adi-m-${o.fecha}" data-campo="adIngreso" data-f="${o.fecha}" type="text" inputmode="decimal" value="${esc(v.monto)}"></div></div>` : ''}</div></li>`;
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
            for (const [fecha, v] of Object.entries(top.ingresos)) {
                if (v.decision !== 'si') continue;
                const o = (M.horizonte(st).atrasadas || []).find((x) => x.fecha === fecha);
                if (o) P.llegoIngreso(st, o.ingreso.id, fecha, { monto: M.leerMonto(v.monto) || o.monto, lugar: o.ingreso.lugar, fecha });
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
    const OB_INGRESOS = [['quincena', '💼', 'Cada quincena', 'El 15 y el 30'], ['mes', '🗓️', 'Cada mes', 'Un día fijo'], ['semana', '🧰', 'Cada semana', 'Obra, maquila, reparto…'], ['varia', '🏪', 'Varía', 'Negocio, ventas o trabajos por día'], ['remesa', '🌎', 'Recibo remesa', 'De familia afuera']];
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
                if (id === 'quincena') return `<div class="ob-det">${monto('q-monto', '¿Cuánto te cae más o menos cada quincena?', x.monto)}${opcionesOb('q-lugar', '¿Dónde te cae?', [{ v: 'banco', t: 'En el banco', e: '🏦' }, { v: 'efectivo', t: 'En efectivo', e: '💵' }], x.lugar)}</div>`;
                if (id === 'mes') return `<div class="ob-det">${monto('m-monto', '¿Cuánto más o menos?', x.monto)}${obDias('m-dia', x.dia)}${opcionesOb('m-lugar', '¿Dónde te cae?', [{ v: 'banco', t: 'En el banco', e: '🏦' }, { v: 'efectivo', t: 'En efectivo', e: '💵' }], x.lugar)}</div>`;
                if (id === 'semana') return `<div class="ob-det">${monto('s-monto', '¿Cuánto más o menos cada semana?', x.monto)}${opcionesOb('s-dia', '¿Qué día te pagan?', [1, 2, 3, 4, 5, 6].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), x.dia)}</div>`;
                if (id === 'varia') return `<div class="ob-det">${opcionesOb('v-horizonte', '¿Hasta cuándo quieres ver tu libre?', [{ v: 'finDeMes', t: 'Hasta fin de mes' }, { v: 'quince', t: 'Los próximos 15 días' }], x.horizonte)}</div>`;
                if (id === 'remesa') return `<div class="ob-det">${monto('r-monto', '¿Cuánto más o menos?', x.monto)}${opcionesOb('r-cada', '¿Cada cuánto?', [{ v: 'mes', t: 'Cada mes' }, { v: 'llega', t: 'Cuando llega' }], x.cada)}</div>`;
                return '';
            };
            return `<div class="pg pg--flujo ob">${cab(1, '¿Cómo te pagan?', 'Elige todas las que te pasen.')}
                <div class="ob-ops">${OB_INGRESOS.map(([id, e, t, s]) => `<div class="ob-op-g"><button type="button" class="opcion-g" aria-pressed="${!!sel[id]}" data-a="obIngreso" data-v="${id}" data-fk="ob-i-${id}">${caja(e)}<span><span class="opcion-g-t">${t}</span><span class="fila-s">${s}</span></span>${sel[id] ? icon('circle-check', 'ico-ok') : ''}</button>${det(id)}</div>`).join('')}</div>
                ${pie(`<button type="button" class="btn btn--48" data-a="obSaltar" data-fk="ob-saltar">Saltar</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Siguiente</button>`)}
            </div>`;
        }
        if (ob.paso === 2) {
            return `<div class="pg pg--flujo ob">${cab(2, '¿Cuánto tienes ahora y dónde?', 'Más o menos. Es tu primer cuadre: desde aquí partimos.')}
                <div class="card ob-card">
                    <div class="ob-lugar">${caja('💵')}${monto('efectivo', 'En efectivo', d.efectivo, ob.errores && ob.errores.includes('dinero') ? 'aria-invalid="true" aria-describedby="ob-err-dinero"' : '')}</div>
                    <div class="ob-lugar ob-lugar--banco">${caja('🏦')}<div class="ob-lugar-c">${opcionesOb('banco', 'En el banco o cooperativa', [...D.BANCOS.map((b) => ({ v: b, t: b })), { v: 'Otro', t: 'Otro' }], d.bancoNombre)}${d.bancoNombre ? monto('banco-monto', `¿Cuánto en ${d.bancoNombre === 'Otro' ? 'tu banco' : 'Banco ' + d.bancoNombre}?`, d.bancoMonto) : ''}</div></div>
                    ${err('dinero', 'Escribe cuánto tienes, aunque sea $0')}
                </div>
                <p class="fila-s">No tiene que ser exacto. Cuando quieras, lo cuadras otra vez.</p>
                ${pie(`<button type="button" class="btn btn--48" data-a="obAtras" data-fk="ob-atras2">Atrás</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Siguiente</button>`)}
            </div>`;
        }
        if (ob.paso === 3) {
            const banco = d.bancoNombre ? (d.bancoNombre === 'Otro' ? 'tu banco' : d.bancoNombre) : null;
            const ch = (id, e, t, s, on, fijo = false) => `<button type="button" class="opcion-g" aria-pressed="${on}" ${fijo ? 'aria-disabled="true"' : `data-a="obMedio" data-v="${id}"`} data-fk="ob-m-${id}">${caja(e)}<span><span class="opcion-g-t">${t}</span><span class="fila-s">${s}</span></span>${on ? icon('circle-check', 'ico-ok') : ''}</button>`;
            return `<div class="pg pg--flujo ob">${cab(3, '¿Con qué pagas?', 'Así, al anotar, ya sé con qué pagaste.')}
                <div class="ob-ops">
                    ${ch('efectivo', '💵', 'Efectivo', 'Siempre está', true, true)}
                    ${banco ? ch('debito', '🏦', `Tarjeta de débito ${esc(banco)}`, 'Sale de tu cuenta del banco', true, true) : ''}
                    ${banco ? ch('transferencia', '🔁', 'Transferencias', 'Desde tu cuenta del banco', d.medios.transferencia) : ''}
                    <div class="ob-op-g">${ch('credito', '💳', 'Tarjeta de crédito', 'La pagas después', d.medios.credito)}
                    ${d.medios.credito ? `<div class="ob-det">${opcionesOb('credito-banco', '¿De qué banco?', D.BANCOS.slice(0, 5).map((b) => ({ v: b, t: b })), d.credito.banco)}<div class="ob-2">${obDiaCorto('credito-corte', 'Corte el día', d.credito.corte)}${obDiaCorto('credito-pago', 'Pago el día', d.credito.pago)}</div><p class="fila-s">Están en tu estado de cuenta.</p></div>` : ''}</div>
                </div>
                ${pie(`<button type="button" class="btn btn--48" data-a="obSaltar" data-fk="ob-saltar">Saltar</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Siguiente</button>`)}
            </div>`;
        }
        if (ob.paso === 4) {
            const ed = ob.editando;
            const f = ed ? D.PAGOS_FRECUENTES.find((x) => x.id === ed.id) : null;
            return `<div class="pg pg--flujo ob">${cab(4, 'Tus pagos fijos', 'Toca los que tengas. Te aviso antes de que venzan.')}
                <div class="chips ob-pagos">${D.PAGOS_FRECUENTES.map((x) => {
                    const ya = d.pagos.find((p) => p.id === x.id);
                    return `<button type="button" class="chip" aria-pressed="${!!ya || (ed && ed.id === x.id)}" data-a="obPago" data-v="${x.id}" data-fk="ob-p-${x.id}">${ya ? icon('check', 'ico-xs') : ''}${emo(x.emoji, 18)}${esc(x.nombre)}</button>`;
                }).join('')}</div>
                ${ed ? `<div class="card ob-card ob-editor"><p class="fila-t">${emo(f.emoji, 18)} ${esc(f.nombre)}</p>${monto('p-monto', f.variable ? '¿Cuánto más o menos?' : '¿Cuánto?', ed.monto)}${f.semanal ? opcionesOb('p-dsem', '¿Qué día?', [1, 2, 3, 4, 5, 6].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), ed.diaSemana) : obDias('p-dia', ed.dia)}${err('pago', 'Escribe el monto y elige el día')}<div class="acciones-2"><button type="button" class="btn" data-a="obPagoCancelar" data-fk="ob-p-cancelar">Cancelar</button><button type="button" class="btn btn--prim" data-a="obPagoAgregar" data-fk="ob-p-agregar">Agregar</button></div></div>` : ''}
                ${d.pagos.length ? `<ul class="lista card">${d.pagos.map((p) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">${p.semanal ? 'cada ' + M.DIAS[p.diaSemana] : 'el ' + p.dia}</span></span><span class="fila-m">${dinero(p.monto, { aprox: p.variable })}</span></div><button type="button" class="icon-btn" data-a="obPagoQuitar" data-v="${p.id}" aria-label="Quitar ${esc(p.nombre)}">${icon('x')}</button></li>`).join('')}</ul>` : ''}
                ${pie(`<button type="button" class="btn btn--48" data-a="obSaltar" data-fk="ob-saltar">Saltar</button>`, `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">Ver mi número</button>`)}
            </div>`;
        }
        return '';
    };
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
        if (c === 'nombre') d.nombre = v;
        else if (c === 'efectivo') d.efectivo = v;
        else if (c === 'banco-monto') d.bancoMonto = v;
        else if (c === 'q-monto') d.ingresos.quincena.monto = v;
        else if (c === 'm-monto') d.ingresos.mes.monto = v;
        else if (c === 's-monto') d.ingresos.semana.monto = v;
        else if (c === 'r-monto') d.ingresos.remesa.monto = v;
        else if (c === 'p-monto') ob.editando.monto = v;
        else if (c === 'credito-corte') d.credito.corte = v.replace(/\D/g, '');
        else if (c === 'credito-pago') d.credito.pago = v.replace(/\D/g, '');
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
        const mapa = { q: 'quincena', m: 'mes', s: 'semana', v: 'varia', r: 'remesa' };
        if (d.campo === 'banco') x.bancoNombre = v;
        else if (d.campo === 'credito-banco') x.credito.banco = v;
        else if (grupo === 'p') ob.editando[campo === 'dsem' ? 'diaSemana' : 'dia'] = Number(v);
        else if (mapa[grupo]) x.ingresos[mapa[grupo]][campo] = /^\d+$/.test(v) ? Number(v) : v;
        P.render();
    };
    P.acciones.obIngreso = (d) => {
        const x = P.ui.ob.datos.ingresos;
        if (x[d.v]) delete x[d.v];
        else x[d.v] = { quincena: { monto: '', lugar: 'banco' }, mes: { monto: '', dia: 30, lugar: 'banco' }, semana: { monto: '', dia: 5 }, varia: { horizonte: 'finDeMes' }, remesa: { monto: '', cada: 'mes' } }[d.v];
        P.render();
        P.emitir('onboarding:ingreso:' + d.v);
    };
    P.acciones.obMedio = (d) => {
        const m = P.ui.ob.datos.medios;
        m[d.v] = !m[d.v];
        P.render();
    };
    P.acciones.obPago = (d) => {
        const ob = P.ui.ob;
        const ya = ob.datos.pagos.find((p) => p.id === d.v);
        if (ya) {
            ob.editando = { id: d.v, monto: M.montoCampo(ya.monto), dia: ya.dia, diaSemana: ya.diaSemana };
            ob.datos.pagos = ob.datos.pagos.filter((p) => p.id !== d.v);
        } else ob.editando = { id: d.v, monto: '', dia: null, diaSemana: 5 };
        ob.errores = [];
        P.render({ foco: '#ob-p-monto' });
    };
    P.acciones.obPagoCancelar = () => {
        P.ui.ob.editando = null;
        P.render();
    };
    P.acciones.obPagoQuitar = (d) => {
        P.ui.ob.datos.pagos = P.ui.ob.datos.pagos.filter((p) => p.id !== d.v);
        P.render();
    };
    P.acciones.obPagoAgregar = () => {
        const ob = P.ui.ob;
        const ed = ob.editando;
        const f = D.PAGOS_FRECUENTES.find((x) => x.id === ed.id);
        const monto = M.leerMonto(ed.monto);
        if (!monto || (!f.semanal && !ed.dia)) {
            ob.errores = ['pago'];
            P.render({ foco: '#ob-p-monto' });
            return;
        }
        ob.datos.pagos.push({ id: f.id, nombre: f.nombre, emoji: f.emoji, categoria: f.categoria, monto, variable: !!f.variable, semanal: !!f.semanal, dia: ed.dia, diaSemana: ed.diaSemana });
        ob.editando = null;
        ob.errores = [];
        P.render({ foco: `[data-fk="ob-p-${f.id}"]` });
        P.emitir('onboarding:pago:' + f.id);
    };
    P.acciones.obAtras = () => {
        P.ui.ob.paso = Math.max(0, P.ui.ob.paso - 1);
        P.ui.ob.errores = [];
        P.render({ nueva: true });
    };
    P.acciones.obSaltar = () => {
        const ob = P.ui.ob;
        if (ob.paso === 1) ob.datos.ingresos = {};
        if (ob.paso === 3) ob.datos.medios = { transferencia: false, credito: false };
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
            const ef = M.leerMonto(d.efectivo);
            const bm = d.bancoNombre ? M.leerMonto(d.bancoMonto) : null;
            if (ef === null && bm === null) {
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
        const bancoId = d.bancoNombre ? 'banco' : null;
        const bancoNombre = d.bancoNombre ? (d.bancoNombre === 'Otro' ? 'Tu banco' : 'Banco ' + d.bancoNombre) : null;
        st.lugares = [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵' }];
        if (bancoId) st.lugares.push({ id: bancoId, tipo: 'banco', nombre: bancoNombre, emoji: '🏦' });
        st.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }];
        if (bancoId) st.medios.push({ id: 'debito', nombre: 'Débito ' + (d.bancoNombre === 'Otro' ? 'del banco' : d.bancoNombre), emoji: '🏦', lugar: bancoId, tarjetaDebito: true });
        if (bancoId && d.medios.transferencia) st.medios.push({ id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: bancoId });
        if (d.medios.credito) {
            const corte = Math.min(31, Math.max(1, Number(d.credito.corte) || 15));
            const pagoDia = Math.min(31, Math.max(1, Number(d.credito.pago) || 5));
            const ultimoCorte = M.ultimoDia(st.hoy, corte);
            const [y, m] = M.partes(ultimoCorte);
            const [vy, vm] = M.mesMas(y, m, 1);
            st.tarjetas.push({ id: 'credito', nombre: 'Crédito ' + d.credito.banco, emoji: '💳', corte, pagoDia, interesesAnio: 0, estados: [{ corte: ultimoCorte, total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: M.fechaDe(vy, vm, pagoDia), inicial: true }] });
            st.medios.push({ id: 'credito', nombre: 'Crédito ' + d.credito.banco, emoji: '💳', tarjeta: 'credito' });
        }
        // Primer cuadre de cada lugar: lo que dijo que tiene.
        for (const l of st.lugares) {
            const monto = l.id === 'efectivo' ? M.leerMonto(d.efectivo) || 0 : M.leerMonto(d.bancoMonto) || 0;
            const r = P.registrar(st, { tipo: 'cuadre', fecha: st.hoy, lugar: l.id, monto, esperado: monto, primero: true });
            l.cuadre = { fecha: st.hoy, seq: r.seq, monto };
        }
        const lugarDe = (x) => (x === 'efectivo' || !bancoId ? 'efectivo' : bancoId);
        const ing = d.ingresos;
        const desde = st.hoy;
        const marcarPasadas = (i) => {
            for (const o of M.ocurrenciasIngreso(st, i, M.sumarDias(st.hoy, -40), M.sumarDias(st.hoy, -1))) i.llegadas[o.fecha] = { monto: i.monto, previa: true };
            const hoyO = M.ocurrenciasIngreso(st, i, st.hoy, st.hoy)[0];
            if (hoyO) i.llegadas[hoyO.fecha] = { monto: i.monto, previa: true };
        };
        if (ing.quincena) st.ingresos.push({ id: 'quincena', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: M.leerMonto(ing.quincena.monto) || 0, aprox: true, frecuencia: 'quincenal', lugar: lugarDe(ing.quincena.lugar), principal: true, desde: M.sumarDias(desde, -40), llegadas: {} });
        if (ing.mes) st.ingresos.push({ id: 'mensual', nombre: 'Salario', emoji: '💼', categoria: 'salario', monto: M.leerMonto(ing.mes.monto) || 0, aprox: true, frecuencia: 'mensual', dia: ing.mes.dia || 30, lugar: lugarDe(ing.mes.lugar), principal: !ing.quincena, desde: M.sumarDias(desde, -40), llegadas: {} });
        if (ing.semana) st.ingresos.push({ id: 'semanal', nombre: 'Pago de la semana', emoji: '💼', categoria: 'salario', monto: M.leerMonto(ing.semana.monto) || 0, aprox: true, frecuencia: 'semanal', diaSemana: ing.semana.dia || 5, lugar: 'efectivo', principal: !ing.quincena && !ing.mes, desde: M.sumarDias(desde, -40), llegadas: {} });
        if (ing.remesa && ing.remesa.cada === 'mes') st.ingresos.push({ id: 'remesa', nombre: 'Remesa', emoji: '🌎', categoria: 'remesa', monto: M.leerMonto(ing.remesa.monto) || 0, aprox: true, frecuencia: 'mensual', dia: 10, lugar: 'efectivo', principal: false, extra: true, desde: M.sumarDias(desde, -40), llegadas: {} });
        for (const i of st.ingresos) marcarPasadas(i);
        if (ing.varia && !st.ingresos.some((i) => i.principal)) st.horizonteVariable = ing.varia.horizonte;
        for (const p of d.pagos) {
            const medioId = p.categoria === 'servicios' && bancoId ? 'debito' : 'efectivo';
            P.crearPago(st, { nombre: p.nombre, emoji: p.emoji, categoria: p.categoria, monto: p.monto, estimado: p.variable, frecuencia: p.semanal ? 'semanal' : 'mensual', dia: p.dia, diaSemana: p.diaSemana, medio: medioId });
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
        else if (!k.items.length && k.hz.ingreso) pend.push(`Tus pagos fijos vencen después de tu ${P.nombreIngreso(k.hz)} del ${M.partes(k.hz.fecha)[2]}: los cubre esa ${k.hz.ingreso.frecuencia === 'semanal' ? 'semana' : P.nombreIngreso(k.hz)}.`);
        return `<div class="pg pg--flujo">
            <header class="pg-head"><p class="paso">¡Listo!</p><h1 class="h1" tabindex="-1">Tu primer número</h1><p class="sub">Esto es lo que te queda libre, ya sin tus pagos.</p></header>
            <section class="portada portada--quieta app-home-pattern" aria-label="Tu libre"><svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${ART.circles}</svg><div class="portada-b portada-b--quieta"><span class="portada-h">${esc(P.textoHorizonte(k.hz))}</span><span class="portada-l">Libre</span><span class="portada-n">${dinero(k.libre)}</span><span class="portada-s">${k.porDia !== null ? `~${dinero(k.porDia, { aprox: true }).replace('~', '')} por día` : ''}</span></div></section>
            ${P.tarjetaSeccion('Así lo calculamos', `<ul class="d-items d-items--card"><li><span>Tienes</span><span>${dinero(k.tienes)}</span></li><li><span>Por pagar antes de tu ingreso</span><span>${k.porPagar + k.enTarjetas ? dinero(-(k.porPagar + k.enTarjetas)) : dinero(0)}</span></li>${k.guardando ? `<li><span>Guardando para pagos del mes</span><span>${dinero(-k.guardando)}</span></li>` : ''}<li class="d-total-li"><span>Libre</span><span>${dinero(k.libre)}</span></li></ul>`, { id: 'pn-calc' })}
            ${pend.length ? `<div class="nota nota--info" role="note">${icon('info')}<div><p><strong>Lo que falta saber</strong></p><ul class="mini-lista">${pend.map((x) => `<li>${x}</li>`).join('')}</ul></div></div>` : ''}
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="primerNumeroListo" data-fk="pn-listo">Ir a Hoy</button>
        </div>`;
    };
    P.acciones.primerNumeroListo = () => {
        P.irTab('hoy');
        P.emitir('onboarding:hoy');
    };
})();
