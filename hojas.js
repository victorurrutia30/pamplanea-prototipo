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
    /** v2.6.1 (QA A-D3): lo que debes solo baja si se sabe cuánto debes, y se recuerda cuánto bajó para devolverlo exacto. */
    const debeConocido = (p) => !!(p && p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined);
    function bajarDeuda(p, monto) {
        if (!debeConocido(p)) return 0;
        const baja = Math.min(p.deuda.debe, Math.max(0, monto));
        p.deuda.debe -= baja;
        return baja;
    }
    /**
     * v2.7 (D-6, F12): una ocurrencia pagada en partes. Mientras falte algo queda «parcial» (lo que falta sigue pendiente);
     * cuando se completa, «pagado» por lo que pagaste. Cada pago guarda su gasto y lo que bajó de lo que debes.
     */
    function hechoDe(debido, pagos) {
        const pagado = M.suma(pagos, (x) => x.monto);
        if (pagado >= debido) return { estado: 'pagado', monto: pagado, registro: pagos.at(-1).registro, debido, pagos };
        return { estado: 'parcial', debido, pagado, pagos };
    }
    /**
     * v2.7 (D-6): lo que tocaba pagar en una ocurrencia ya marcada: lo que se guardó o, si no, lo que se pagó entonces sin
     * pasar del monto del pago (pagar de más no sube lo que tocaba). Un estimado no tiene.
     */
    const debidoDe = (p, hecho) => (hecho.debido !== undefined ? hecho.debido : p.estimado || !Number.isInteger(hecho.monto) ? null : Number.isInteger(p.monto) ? Math.min(hecho.monto, p.monto) : hecho.monto);
    P.marcarPagado = function (st, pagoId, ocurrencia, { monto, medio, fecha }) {
        const p = M.pago(st, pagoId);
        const previo = p.hechos[ocurrencia] && p.hechos[ocurrencia].estado === 'parcial' ? p.hechos[ocurrencia] : null;
        const o = previo ? null : M.ocurrenciasPago(st, p, ocurrencia, ocurrencia)[0];
        const r = P.registrar(st, { tipo: 'gasto', fecha, monto, nombre: p.nombre, categoria: p.categoria, emoji: p.emoji, medio, pago: p.id, nuevo: true });
        const baja = bajarDeuda(p, monto);
        // v2.7 (D-6, F12): pagar menos de lo que tocaba deja pendiente lo que falta. Un estimado no: lo que pagas es lo que costó.
        const debido = previo ? previo.debido : o && !o.estimado ? o.monto : null;
        if (!previo && (debido === null || monto >= debido)) {
            p.hechos[ocurrencia] = { estado: 'pagado', monto, registro: r.id };
            if (baja) p.hechos[ocurrencia].bajaDeuda = baja;
            return r;
        }
        p.hechos[ocurrencia] = hechoDe(debido, [...(previo ? previo.pagos : []), { registro: r.id, monto, ...(baja ? { bajaDeuda: baja } : {}) }]);
        return r;
    };
    /**
     * Pagar la tarjeta = mover del banco a la tarjeta. La parte que pasa del estado de cuenta paga
     * compras nuevas y gasta primero lo reservado de un apartado (V2-27); `soltarReserva` la quita
     * entera («Pagar la tarjeta ya»).
     */
    P.pagarTarjeta = function (st, tarjetaId, { monto, lugar, fecha, soltarReserva = null, aCompras = false }) {
        const t = M.tarjeta(st, tarjetaId);
        // v2.7 (F17): nunca un abono de $0 (ni a una tarjeta que no existe): quien llama pregunta el monto antes.
        if (!t || !(monto > 0)) return null;
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
        // v2.6.1 (QA B-AP1, B-AP2): se recuerda cuánto salió del ahorro y para qué compra se reservó, para deshacerlo exacto si se elimina.
        registro.usadoApartado = usado;
        const m = M.medio(st, registro.medio);
        let reserva = null;
        if (m && m.tarjeta && usado > 0) {
            reserva = { id: 'rs' + st.seq++, tarjeta: m.tarjeta, monto: usado, de: a.nombre, apartado: a.id, registro: registro.id, fecha: st.hoy };
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
            const baja = bajarDeuda(p, p.monto);
            if (baja) p.hechos[fechaEsperada].bajaDeuda = baja;
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
    /**
     * Desde cuándo cuenta. Una vez u otras fechas: hoy, o la primera fecha elegida si ya venció (un pago atrasado sí se
     * pide). v2.6.6 (V2-85): uno que se repite empieza en el siguiente de su fecha de este periodo que ya pasó, salvo que
     * la persona diga «No, todavía lo debo» (`antes: 'no'`); lo de antes de eso nunca se cuenta (V2-43).
     */
    const desdeDe = (st, d) => {
        if (d.frecuencia !== 'unico' && d.frecuencia !== 'fechas') {
            const pasada = M.pasadaDelPeriodo(st, P.reglaDe(d));
            // `antes: 'no'` (la respuesta del formulario) o `antesDebe` (la fecha que la persona dijo que debe, Primer día).
            return M.desdeSegun(st.hoy, pasada, d.antes === 'no' || (!!pasada && d.antesDebe === pasada));
        }
        const primera = d.frecuencia === 'unico' ? d.fecha : [...(d.fechas || [])].sort()[0];
        return primera && primera < st.hoy ? primera : st.hoy;
    };
    P.crearPago = function (st, d) {
        const id = 'p' + st.seq++;
        const p = { id, nombre: d.nombre, emoji: d.emoji || '🧾', categoria: d.categoria || 'otros', monto: d.monto, estimado: !!d.estimado, ...P.reglaDe(d), medio: d.medio, avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: desdeDe(st, d), creado: st.hoy, hechos: {}, previos: [], nuevo: true };
        if (p.frecuencia === 'unico' && !p.fecha) p.fecha = M.proximoDia(st.hoy, d.dia || 1);
        if (d.hasta) p.hasta = d.hasta;
        if (d.tipoPago) p.tipoPago = d.tipoPago;
        st.pagos.push(p);
        // V2-85: lo vencido que la persona eligió al crearlo («No, todavía lo debo» o una fecha que ya pasó en «Una vez»)
        // ya está contestado: al abrir no se vuelve a preguntar (V2-86).
        if (p.desde < st.hoy) for (const o of M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1))) anotarDebe(st, `p:${id}:${o.fecha}`);
        return p;
    };
    /**
     * v2.6.6 (V2-86): la respuesta a «¿ya lo pagaste?» de algo de antes de empezar. «Sí»: deja de contar (el pago queda
     * «pagado antes de empezar», `{ estado: 'antes' }`, sin gasto nuevo; la tarjeta, su estado de cuenta `antes: 'pagado'`;
     * el ingreso llegó antes de empezar y ya está en lo que tienes). «No»: queda como está y no se vuelve a preguntar.
     */
    P.responderAntes = function (st, caso, si) {
        if (caso.tipo === 'pago') {
            const p = M.pago(st, caso.id);
            if (!p) return;
            if (si) p.hechos[caso.fecha] = { estado: 'antes' };
            else anotarDebe(st, caso.clave);
        } else if (caso.tipo === 'tarjeta') {
            const t = M.tarjeta(st, caso.id);
            const e = t && t.estados.at(-1);
            if (e) e.antes = si ? 'pagado' : 'debe';
        } else if (caso.tipo === 'ingreso') {
            const ing = M.ingreso(st, caso.id);
            if (!ing) return;
            if (si) ing.llegadas[caso.fecha] = { monto: caso.monto, enCuadre: true, antes: true };
            else anotarDebe(st, caso.clave);
        }
    };
    /** V2-86: «Deshacer» una respuesta: vuelve exactamente lo que cambió (nada más; lo anotado después se queda). */
    P.deshacerAntes = function (st, caso, si) {
        if (!si && st.antesDebe) delete st.antesDebe[caso.clave];
        if (caso.tipo === 'pago') {
            const p = M.pago(st, caso.id);
            if (p && si && p.hechos[caso.fecha] && p.hechos[caso.fecha].estado === 'antes') delete p.hechos[caso.fecha];
        } else if (caso.tipo === 'tarjeta') {
            const t = M.tarjeta(st, caso.id);
            const e = t && t.estados.at(-1);
            if (e) delete e.antes;
        } else if (caso.tipo === 'ingreso') {
            const ing = M.ingreso(st, caso.id);
            if (ing && si && ing.llegadas[caso.fecha] && ing.llegadas[caso.fecha].antes) delete ing.llegadas[caso.fecha];
        }
    };
    /**
     * V2-85: al editar el día (o la frecuencia) de un pago, las fechas que ya pasaron y que solo aparecen por el cambio
     * (las de un mes que antes no tenía una sin pagar) no se cuentan: no se crean pagos vencidos. La de este periodo se
     * pregunta en el formulario; con «No, todavía lo debo», esa sí se cuenta.
     */
    function nuevasPasadas(st, p, regla) {
        const abiertas = (q) => M.ocurrenciasPago(st, q, q.desde, st.hoy).filter((o) => o.estado === 'vencido' || (o.estado === 'pendiente' && o.fecha === st.hoy)).map((o) => o.fecha);
        const viejas = {};
        for (const f of abiertas(p)) viejas[f.slice(0, 7)] = (viejas[f.slice(0, 7)] || 0) + 1;
        const q = structuredClone(p);
        for (const k of ['fecha', 'dias', 'dia', 'diaSemana', 'cadaMeses', 'fechas', 'conIngreso']) delete q[k];
        Object.assign(q, P.reglaDe(regla));
        P.reubicarHechos(st, q);
        return abiertas(q).filter((f) => {
            const m = f.slice(0, 7);
            if (viejas[m] > 0) {
                viejas[m]--;
                return false;
            }
            return true;
        });
    }
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
            // v2.6.7 (V2-87): lo que pagas normalmente de una tarjeta se reserva igual; lo elegido se guarda en la tarjeta.
            const p = x.tarjeta ? M.tarjeta(st, x.tarjeta.id) : M.pago(st, x.pago.id);
            const actual = M.asignacion(st, x.tarjeta ? M.pagoDeTarjeta(p, x.fecha, x.monto) : p, x.fecha, x.monto, k.hz);
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
            for (const [f, h] of Object.entries(p.hechos)) {
                // v2.7 (D-6): pagada en partes: sale solo este pago (y vuelve lo que bajó); lo demás sigue.
                const parte = Array.isArray(h.pagos) ? h.pagos.find((x) => x.registro === r.id) : null;
                if (parte) {
                    if (debeConocido(p) && parte.bajaDeuda) p.deuda.debe += parte.bajaDeuda;
                    const resto = h.pagos.filter((x) => x !== parte);
                    if (resto.length) p.hechos[f] = hechoDe(h.debido, resto);
                    else delete p.hechos[f];
                    continue;
                }
                if (h.registro !== r.id) continue;
                // v2.6.1 (QA A-D3): vuelve exactamente lo que bajó (lo marcado antes de la v2.6.1 no lo guardaba: su monto).
                if (debeConocido(p)) p.deuda.debe += h.bajaDeuda !== undefined ? h.bajaDeuda : r.monto;
                delete p.hechos[f];
            }
        }
        st.registros = st.registros.filter((x) => x.id !== r.id);
        return r;
    };
    /**
     * v2.6.1 (QA B-P2, B-P3): al cambiar el día (o la frecuencia) de un pago, lo ya pagado o saltado no se pierde: cada
     * «hecho» (y cada «Lo pagas con» elegido) que ya no cae en una fecha de la regla nueva pasa a la fecha más cercana de
     * la regla nueva (dentro de un mes) que no tenga uno. Así el mes ya pagado no se vuelve a pedir ni se cuenta dos veces.
     */
    P.reubicarHechos = function (st, p) {
        const regla = M.reglaPago(st, p);
        for (const campo of ['hechos', 'asignaciones']) {
            const viejo = p[campo] || {};
            const nuevo = {};
            const sueltos = [];
            for (const [f, h] of Object.entries(viejo)) (M.fechasRegla(regla, f, f).length ? (nuevo[f] = h) : sueltos.push([f, h]));
            for (const [f, h] of sueltos.sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
                // Primero el mismo mes (el pago de octubre sigue siendo el de octubre); dentro de él, la más cercana.
                const mismoMes = (x) => Number(x.slice(0, 7) === f.slice(0, 7));
                const cerca = M.fechasRegla(regla, M.sumarDias(f, -31), M.sumarDias(f, 31))
                    .filter((x) => !(x in nuevo))
                    .sort((a, b) => mismoMes(b) - mismoMes(a) || Math.abs(M.diasEntre(f, a)) - Math.abs(M.diasEntre(f, b)))[0];
                if (cerca) nuevo[cerca] = h;
            }
            if (p[campo]) p[campo] = nuevo;
        }
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
    function campoMonto(h, { campo = 'monto', label = '¿Cuánto?', valor = '', ayuda = '', errorTexto = 'Escribe el monto', id = null, placeholder = 'Ej. 25.00' } = {}) {
        const fid = id || 'f-' + campo;
        return `<div class="campo-g"><label class="campo-l" for="${fid}">${label}</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="${fid}" data-campo="${campo}" type="text" inputmode="decimal" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(valor)}" ${inv(h, campo)}></div>${ayuda ? `<p class="campo-ayuda">${ayuda}</p>` : ''}${error(h, campo, M.montoExcede(valor) ? 'Puede ser de hasta $1,000,000.00' : errorTexto)}</div>`;
    }
    // V2-65 (fase 3): los montos se ven con formato al salir del campo y, al volver, el número para escribir.
    const conFormato = (c) => (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.addEventListener('focusout', (e) => {
        const el = e.target;
        if (!el.matches || !el.matches('.campo--monto input') || !el.value.trim()) return;
        const c = M.leerMonto(el.value);
        if (c === null) return;
        const f = conFormato(c);
        if (el.value === f) return;
        el.value = f;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.addEventListener('focusin', (e) => {
        const el = e.target;
        if (!el.matches || !el.matches('.campo--monto input') || !el.value.includes(',')) return;
        const c = M.leerMonto(el.value);
        if (c !== null) el.value = M.montoCampo(c);
    });
    function campoTexto(h, { campo, label, valor = '', placeholder = '', errorTexto = '' }) {
        return `<div class="campo-g"><label class="campo-l" for="f-${campo}">${label}</label><div class="campo"><input id="f-${campo}" data-campo="${campo}" type="text" autocomplete="off" placeholder="${esc(placeholder)}" value="${esc(valor)}" ${inv(h, campo)}></div>${error(h, campo, errorTexto)}</div>`;
    }
    /** Grupo de opciones (botones con aria-pressed): un solo patrón para medios, lugares, días… */
    function opciones(h, { campo, label, lista, valor, errorTexto = '', accion = 'valor', columnas = false }) {
        return `<div class="campo-g" role="group" aria-labelledby="l-${campo}"><p class="campo-l" id="l-${campo}">${label}</p><div class="chips${columnas ? ' chips--col' : ''}">${lista
            .map((o) => `<button type="button" class="chip" aria-pressed="${String(valor) === String(o.v)}" data-a="${accion}" data-campo="${campo}" data-v="${esc(o.v)}" data-fk="op-${campo}-${esc(o.v)}">${String(valor) === String(o.v) ? icon('check', 'ico-xs') : ''}${o.e ? emo(o.e, 18) : ''}<span>${esc(o.t)}</span>${o.s ? `<span class="chip-s">${esc(o.s)}</span>` : ''}</button>`)
            .join('')}</div>${error(h, campo, errorTexto)}</div>`;
    }
    /**
     * v2.6.5 (V2-82): antes de crear un pago parecido a uno que ya tienes: «Ya tienes «Luz» el 12 por ~$35.00. ¿Es otro
     * pago?» [Ver el que tengo] [Sí, es otro]. La usan Anotar («Recordarme un pago»), «+ Pago» y «Editar».
     */
    function preguntaDuplicado(h, p, accion) {
        const cuando = p.frecuencia === 'mensual' ? `el ${p.dia}` : p.frecuencia === 'semanal' ? `cada ${M.DIAS[p.diaSemana]}` : P.textoFrecuencia(p, { corto: true }).toLowerCase();
        return `<div class="pregunta pregunta--dup" role="group" aria-labelledby="dup-t"><p class="campo-l" id="dup-t" tabindex="-1">Ya tienes «${esc(p.nombre)}» ${esc(cuando)} por ${dinero(p.monto, { aprox: p.estimado })}. ¿Es otro pago?</p><div class="chips"><button type="button" class="chip" aria-pressed="false" data-a="${accion}" data-campo="dup" data-v="ver" data-fk="dup-ver">Ver el que tengo</button><button type="button" class="chip" aria-pressed="false" data-a="${accion}" data-campo="dup" data-v="otro" data-fk="dup-otro">Sí, es otro</button></div>${error(h, 'duplicado', 'Dinos si es otro pago')}</div>`;
    }
    /**
     * v2.6.6 (V2-85): lo de este periodo que ya pasó (o vence hoy) se pregunta una vez, en el mismo formulario: «El de
     * octubre (14 oct), ¿ya lo pagaste?» [Sí, ya lo pagué] [No, todavía lo debo]; en un ingreso, «La del 15 de octubre,
     * ¿ya te llegó?» [Sí, ya me llegó] [No, todavía no]. «Sí» viene elegido: sin respuesta nunca se inventa una deuda.
     * `h.antesDebe` guarda la fecha si la respuesta es «No» (si cambia el día, vuelve a valer «Sí»); `h.antesVisto`, que
     * la pregunta ya se vio (si no, «Guardar» la muestra primero).
     */
    function preguntaAntes(h, fecha, { ingreso = false, fem = false, mensual = false, siguiente = null, accion = 'valor', fk = 'antes', campo = 'antes' } = {}) {
        if (!fecha) return '';
        h.antesVisto = fecha;
        const st = P.st;
        const debe = h.antesDebe === fecha;
        const art = fem ? 'La' : 'El';
        const cual = fecha === st.hoy ? `${art} de hoy` : mensual ? `${art} de ${M.MESES[M.partes(fecha)[1] - 1]} (${M.fechaCorta(fecha)})` : `${art} del ${M.fechaLarga(fecha)}`;
        const pregunta = `${cual}, ¿${ingreso ? 'ya te llegó' : 'ya lo pagaste'}?`;
        const ops = ingreso ? [['si', 'Sí, ya me llegó'], ['no', 'No, todavía no']] : [['si', 'Sí, ya lo pagué'], ['no', 'No, todavía lo debo']];
        const nota = ingreso
            ? debe ? 'Lo esperamos: te preguntamos cuando llegue.' : 'Ya está en lo que tienes: no se suma otra vez.'
            : debe ? (fecha === st.hoy ? 'Queda para hoy y se cuenta en tu libre.' : `Queda pendiente desde el ${M.fechaLarga(fecha)} y se cuenta en tu libre.`) : `No se cuenta en tu libre.${siguiente ? ` Tu próximo pago: ${M.fechaLarga(siguiente)}.` : ''}`;
        const chip = ([v, t]) => {
            const sel = (v === 'no') === debe;
            return `<button type="button" class="chip" aria-pressed="${!!(sel)}" data-a="${accion}" data-campo="${campo}" data-v="${v === 'no' ? 'no:' + fecha : 'si'}" data-fk="${fk}-${v}">${sel ? icon('check', 'ico-xs') : ''}<span>${esc(t)}</span></button>`;
        };
        return `<div class="pregunta pregunta--antes" role="group" aria-labelledby="${fk}-t" aria-describedby="${fk}-nota"><p class="campo-l" id="${fk}-t" tabindex="-1">${esc(pregunta)}</p><div class="chips">${ops.map(chip).join('')}</div><p class="fila-s" id="${fk}-nota">${esc(nota)}</p></div>`;
    }
    P.preguntaAntes = preguntaAntes;
    /** V2-85: la respuesta de un chip de «¿ya lo pagaste?»: «No» guarda la fecha que se debe; «Sí», nada. */
    const respuestaAntes = (v) => (String(v).startsWith('no:') ? String(v).slice(3) : null);
    /**
     * V2-85: si al guardar todavía no se vio la pregunta (el día se escribió sin volver a dibujar el formulario), se muestra
     * y no se guarda todavía. Devuelve true si hubo que mostrarla.
     */
    function mostrarAntes(h, fecha, sel = '#antes-t') {
        if (!fecha || h.antesVisto === fecha) return false;
        P.render({ foco: sel });
        const q = document.querySelector(sel);
        // En una hoja se mueve la hoja; en el Primer día, la pantalla (el marco de la app no se mueve).
        const c = q && (q.closest('.hoja-c') || document.getElementById('vista'));
        if (c) c.scrollTop += q.getBoundingClientRect().top - c.getBoundingClientRect().top - 16;
        P.emitir('antes:pregunta');
        return true;
    }
    /** V2-85: la fecha que sigue a la que ya pasó (para decir «Tu próximo pago: …»). */
    const siguienteDe = (st, regla, fecha) => (fecha ? M.fechasRegla(M.reglaPago(st, regla), M.sumarDias(fecha, 1), M.sumarDias(fecha, 400))[0] || null : null);
    /** V2-85: lo que la persona dijo que todavía debe (o espera) no se vuelve a preguntar al abrir (V2-86). */
    function anotarDebe(st, clave) {
        st.antesDebe = { ...(st.antesDebe || {}), [clave]: st.hoy };
    }
    /** V2-81: cómo se nombra un ingreso esperado en una pregunta («tu quincena del 30», «tu salario del 30»). */
    function cualIngreso(ing, fecha) {
        const cual = ing.frecuencia === 'quincenal' ? 'quincena' : ing.frecuencia === 'semanal' ? 'pago de la semana' : ing.nombre.charAt(0).toLowerCase() + ing.nombre.slice(1);
        return { cual, fem: /^(quincena|catorcena|remesa|venta)/.test(cual), dia: M.partes(fecha)[2] };
    }
    function selectorDia(h, campo, valor, label = '¿Qué día del mes?') {
        return `<div class="campo-g" role="group" aria-labelledby="l-${campo}"><p class="campo-l" id="l-${campo}">${label}</p><div class="dias">${Array.from({ length: 31 }, (_, i) => i + 1)
            .map((n) => `<button type="button" class="dia" aria-pressed="${Number(valor) === n}" data-a="valor" data-campo="${campo}" data-v="${n}" data-fk="dia-${campo}-${n}" aria-label="Día ${n}">${n}${Number(valor) === n ? icon('check', 'ico-dia') : ''}</button>`)
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
            celdas.push(`<button type="button" class="cal-d${f === st.hoy ? ' cal-d--hoy' : ''}" aria-pressed="${!!(sel)}" ${fuera ? 'disabled' : ''} data-a="calElegir" data-campo="${campo}" data-v="${f}" data-fk="cal-${campo}-${f}" aria-label="${esc(M.capital(M.conDia(f)))}${f === st.hoy ? ', hoy' : ''}">${d}${sel ? icon('check', 'ico-dia') : ''}</button>`);
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
        const dueno = P.ui.hoja || (P.enPrimerDia() ? P.ui.ob : null);
        if (!dueno) return;
        const [y, m] = M.mesMas(...d.ver.split('-').map(Number), Number(d.d));
        dueno['ver-' + d.campo] = `${y}-${M.pad(m)}`;
        P.render({ foco: `[data-fk="cal-${d.campo}-${Number(d.d) < 0 ? 'ant' : 'sig'}"]` });
    };
    P.acciones.calElegir = (d) => {
        if (P.enPrimerDia() && !P.ui.hoja) return P.acciones.obValor(d);
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
        // v2.6.6 (V2-85): «¿ya lo pagaste?» de lo que ya pasó de este periodo, igual en todos los formularios.
        if (d.campo === 'antes') {
            h.antesDebe = respuestaAntes(d.v);
            P.render();
            P.emitir('antes:' + (h.antesDebe ? 'no' : 'si'));
            return;
        }
        const v = /^\d+$/.test(d.v) && ['dia', 'diaSemana'].includes(d.campo) ? Number(d.v) : d.v;
        if (H[h.tipo].alValor) H[h.tipo].alValor(h, d.campo, v);
        else h[d.campo] = v;
        P.render();
    };
    P.alCampo = function (el) {
        const h = P.ui.hoja;
        const campo = el.dataset.campo;
        if (P.enPrimerDia() && el.closest('.ob')) {
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
    P.acciones.hoja = (d) => P.abrirHoja(d.hoja, { id: d.id, fecha: d.fecha, ...(d.sugerida ? { sugerida: d.sugerida } : {}), ...(d.deTarjeta ? { deTarjeta: true } : {}) });
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
    const ATAJOS = [['gasto', 'Gasté', 'receipt-text'], ['ingreso', 'Recibí', 'hand-coins'], ['pago', 'Recordarme un pago', 'bell'], ['apartar', 'Ahorrar', 'circle-plus'], ['mover', 'Mover', 'arrow-left-right'], ['cuadre', 'Cuadrar', 'scale']];
    /** V2-65: el botón de Anotar dice la acción (un solo verbo por tipo, igual que en el resto de la app). */
    P.textoGuardarAnotar = (d) => ({ gasto: 'Guardar gasto', pagado: 'Marcar pagado', ingreso: 'Guardar ingreso', pago: 'Guardar recordatorio', apartar: 'Ahorrar', liberar: 'Sacar del ahorro', cuadre: 'Cuadrar', mover: 'Mover', pagoTarjeta: 'Pagar tarjeta' })[d && d.tipo] || 'Guardar';
    const TIPO_NOMBRE = { gasto: 'Gasto', pagado: 'Pagado', ingreso: 'Ingreso', pago: 'Recordatorio de pago', apartar: 'Ahorrar', liberar: 'Sacar de ahorros', cuadre: 'Cuadrar', mover: 'Mover', pagoTarjeta: 'Pagar tarjeta' };
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
        return `<button type="button" class="chip chip--dato${falta ? ' chip--falta' : ''}" data-a="anotarEditar" data-campo="${campo}" aria-expanded="${!!(abierto)}" data-fk="ch-${campo}">${etiqueta ? sr(etiqueta + ': ') : ''}${texto}${icon(abierto ? 'chevron-up' : 'chevron-down', 'ico-xs')}</button>`;
    }
    function chipsDe(st, h) {
        const d = h.d;
        const out = [chip('tipo', esc(TIPO_NOMBRE[d.tipo]), { abierto: h.editando === 'tipo', etiqueta: 'Qué pasó' })];
        const montoChip = () => chip('monto', d.monto !== null ? dinero(d.monto) : '¿Cuánto?', { falta: d.monto === null, abierto: h.editando === 'monto', etiqueta: d.tipo === 'cuadre' ? 'Tienes ahora' : 'Monto' });
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
            out.push(chip('lugar', l ? `${emo(l.emoji, 16)} ${esc(l.nombre)}` : '¿Dónde?', { falta: !l, abierto: h.editando === 'lugar', etiqueta: 'Dónde llegó' }));
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
        if (campo === 'monto') {
            // V2-65: una pregunta concreta según lo que pasó (nunca «Tengo __ $»).
            const l = M.lugar(st, d.lugar);
            const label = d.tipo === 'cuadre' ? (l ? `¿Cuánto tienes ahora en ${esc(l.nombre)}?` : '¿Cuánto tienes ahora?') : d.tipo === 'ingreso' ? '¿Cuánto recibiste?' : d.tipo === 'pago' ? '¿Cuánto pagas?' : d.tipo === 'apartar' ? '¿Cuánto quieres ahorrar?' : d.tipo === 'liberar' ? '¿Cuánto sacas?' : d.tipo === 'mover' ? '¿Cuánto mueves?' : d.tipo === 'pagoTarjeta' ? '¿Cuánto pagas a la tarjeta?' : '¿Cuánto gastaste?';
            return campoMonto(h, { label, valor: d.monto !== null ? M.montoCampo(d.monto) : '', errorTexto: d.tipo === 'cuadre' ? 'Escribe cuánto tienes, aunque sea $0' : 'Escribe cuánto fue', id: 'f-monto', ayuda: d.tipo === 'cuadre' ? 'Más o menos. Desde aquí sigue la cuenta.' : '' });
        }
        if (campo === 'medio') return opciones(h, { campo: 'medio', label: d.tipo === 'pago' ? '¿Con qué lo pagas?' : '¿Con qué pagaste?', accion: 'anotarValor', valor: d.medio, lista: medios(st), errorTexto: 'Elige con qué pagaste' });
        if (campo === 'fecha') return campoFecha(h, 'fecha', d.fecha, { label: '¿Cuándo?', futuro: d.tipo === 'gasto' || d.tipo === 'ingreso', extra: d.ocurrencia && d.ocurrencia <= st.hoy ? d.ocurrencia : null, ayuda: d.tipo === 'gasto' || d.tipo === 'ingreso' ? 'Si eliges una fecha que todavía no llega, lo pongo en Pagos.' : '' });
        if (campo === 'lugar') return opciones(h, { campo: 'lugar', label: d.tipo === 'ingreso' ? '¿Dónde llegó?' : d.tipo === 'pagoTarjeta' ? '¿Desde dónde?' : '¿Dónde?', accion: 'anotarValor', valor: d.lugar, lista: lugares(st), errorTexto: 'Elige dónde' });
        if (campo === 'frecuencia') return opciones(h, { campo: 'frecuencia', label: '¿Se repite?', accion: 'anotarValor', valor: d.frecuencia, lista: [{ v: 'mensual', t: 'Cada mes' }, { v: 'semanal', t: 'Cada semana' }, { v: 'unico', t: 'Solo esta vez' }], errorTexto: 'Dinos si se repite' });
        if (campo === 'dia') return d.frecuencia === 'semanal' ? opciones(h, { campo: 'diaSemana', label: '¿Qué día de la semana?', accion: 'anotarValor', valor: d.diaSemana ?? 5, lista: [1, 2, 3, 4, 5, 6, 0].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })) }) : d.frecuencia === 'unico' ? calendario(h, 'fechaPago', d.fechaPago || (d.dia ? M.proximoDia(st.hoy, d.dia) : null), { label: '¿Qué día vence?' }) : selectorDia(h, 'dia', d.dia);
        if (campo === 'apartado') return opciones(h, { campo: 'apartado', label: '¿En cuál ahorro?', accion: 'anotarValor', valor: d.apartado, lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), errorTexto: 'Elige un ahorro' }) + (d.tipo === 'apartar' ? campoTexto(h, { campo: 'nuevoApartado', label: '¿O es un ahorro nuevo?', valor: d.apartado ? '' : d.nombre || '', placeholder: 'Ej. Regalo de mamá' }) : '');
        if (campo === 'nombre') {
            if (d.tipo === 'ingreso') return opciones(h, { campo: 'categoriaIngreso', label: '¿De qué?', accion: 'anotarValor', valor: d.ingresoRef ? 'esperado' : d.categoria, lista: [...(d.ingresoRef ? [{ v: 'esperado', t: d.nombre, e: d.emoji }] : []), ...D.INGRESO_CATEGORIAS.map((k) => ({ v: k.id, t: k.nombre, e: k.emoji }))] });
            const cats = d.tipo === 'gasto' ? opciones(h, { campo: 'categoria', label: '¿Qué tipo de gasto?', accion: 'anotarValor', valor: d.categoria, lista: D.CATEGORIAS.filter((k) => !['servicios', 'cuotas'].includes(k.id)).map((k) => ({ v: k.id, t: k.nombre, e: k.emoji })) }) : d.tipo === 'pago' ? opciones(h, { campo: 'frecuente', label: '¿Cuál pago?', accion: 'anotarValor', valor: d.frecuente || '', lista: D.PAGOS_FRECUENTES.map((f) => ({ v: f.id, t: f.nombre, e: f.emoji })) }) : '';
            return campoTexto(h, { campo: 'nombre', label: d.tipo === 'pago' ? '¿Qué pago?' : '¿En qué?', valor: d.nombre || '', placeholder: d.tipo === 'pago' ? 'Ej. Colegio' : 'Ej. Pupusas', errorTexto: 'Escribe en qué fue' }) + cats;
        }
        if (campo === 'mover') return opciones(h, { campo: 'de', label: '¿De dónde?', accion: 'anotarValor', valor: d.de, lista: lugares(st) }) + opciones(h, { campo: 'a', label: '¿A dónde?', accion: 'anotarValor', valor: d.a, lista: [...lugares(st), ...st.tarjetas.map((t) => ({ v: 'tarjeta:' + t.id, t: 'Pagar ' + t.nombre, e: t.emoji }))] });
        if (campo === 'pago') return `<p class="txt">Este es tu pago de ${esc(d.nombre)} en Pagos. Para cambiarlo, ábrelo desde Pagos.</p>`;
        return '';
    }
    /** V2-85: en «Recordarme un pago», la fecha de este periodo que ya pasó (cada mes o cada semana; «Solo esta vez» no). */
    function pasadaAnotar(st, d) {
        if (d.tipo !== 'pago' || !d.frecuencia || d.frecuencia === 'unico') return null;
        const regla = d.frecuencia === 'semanal' ? { frecuencia: 'semanal', diaSemana: d.diaSemana ?? 5 } : d.dia ? { frecuencia: 'mensual', dia: d.dia } : null;
        const fecha = regla ? M.pasadaDelPeriodo(st, regla) : null;
        return fecha ? { fecha, regla } : null;
    }
    function preguntasAnotar(st, h) {
        const d = h.d;
        const out = [];
        if (d.tipo === 'pago' && !d.frecuencia) out.push(`<div class="pregunta">${opciones(h, { campo: 'frecuencia', label: '¿Se repite?', accion: 'anotarValor', valor: d.frecuencia, lista: [{ v: 'mensual', t: 'Cada mes' }, { v: 'semanal', t: 'Cada semana' }, { v: 'unico', t: 'Solo esta vez' }], errorTexto: 'Dinos si se repite' })}</div>`);
        // V2-82: el gasto se llama como un pago ya pagado: si hay uno siguiente, se ofrece marcar ese (por adelantado).
        if (d.tipo === 'gasto' && d.pagoSiguiente && !d.cualPago) {
            const pg = M.pago(st, d.pagoSiguiente.pago);
            const ch = (v, t) => `<button type="button" class="chip" aria-pressed="false" data-a="anotarValor" data-campo="cualPago" data-v="${v}" data-fk="cual-pago-${v}">${t}</button>`;
            out.push(`<div class="pregunta" role="group" aria-labelledby="l-cualPago"><p class="campo-l" id="l-cualPago">¿Es el pago de ${esc(pg.nombre)} del ${esc(P.diaMes(d.pagoSiguiente.fecha))}?</p>${d.yaPagado ? `<p class="fila-s">Ya marcaste el del ${esc(P.diaMes(d.yaPagado.fecha))}.${d.pagoSiguiente.fecha > st.hoy ? ' Este todavía no vence: lo marcas pagado por adelantado.' : ''}</p>` : ''}<div class="chips">${ch('si', 'Sí, ya lo pagué')}${ch('no', 'No, es otro gasto')}</div>${error(h, 'cualPago', 'Elige una opción')}</div>`);
        } else if (d.tipo === 'gasto' && d.yaPagado) out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Ya marcaste el pago «${esc(d.yaPagado.nombre)}» del ${esc(M.fechaCorta(d.yaPagado.fecha))}. Esto se guarda como un gasto aparte.</p></div>`);
        // V2-80: marcar pagado un pago que todavía no vence: se dice que es por adelantado.
        if (d.tipo === 'pagado' && d.ocurrencia && d.ocurrencia > st.hoy) out.push(`<div class="nota nota--info" role="note">${icon('calendar-days')}<p>Es el pago del ${esc(P.diaMes(d.ocurrencia))}: lo marcas pagado por adelantado.</p></div>`);
        // V2-82: «Recordarme un pago» parecido a uno que ya tienes: se pregunta antes de crear otro.
        const dup = d.tipo === 'pago' && !d.dupOk ? M.pagoParecido(st, d) : null;
        if (dup) out.push(preguntaDuplicado(h, dup, 'anotarValor'));
        // V2-85: «Recordarme un pago» cuya fecha de este periodo ya pasó (o es hoy): «¿ya lo pagaste?».
        const antes = !dup ? pasadaAnotar(st, d) : null;
        if (antes) out.push(preguntaAntes(d, antes.fecha, { accion: 'anotarValor', mensual: d.frecuencia === 'mensual', siguiente: siguienteDe(st, antes.regla, antes.fecha) }));
        else if (d.tipo === 'pago') d.antesVisto = null;
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
        // V2-29 #10 y V2-81: «me pagaron 600» o «Recibí» de tipo Salario cerca de un ingreso esperado: ¿es ese? (cuenta una vez).
        const refIngreso = d.ingresoRef || d.refGuardada;
        if (d.tipo === 'ingreso' && refIngreso && d.preguntarIngreso) {
            const ing = M.ingreso(st, refIngreso.id);
            const { cual, fem, dia } = cualIngreso(ing, refIngreso.fecha);
            const adelantada = refIngreso.fecha > st.hoy;
            const ch = (v, t) => `<button type="button" class="chip" aria-pressed="${d.cualIngreso === v}" data-a="anotarValor" data-campo="cualIngreso" data-v="${v}" data-fk="cual-${v}">${d.cualIngreso === v ? icon('check', 'ico-xs') : ''}${t}</button>`;
            out.push(`<div class="pregunta" role="group" aria-labelledby="l-cualIngreso"><p class="campo-l" id="l-cualIngreso">¿Es tu ${esc(cual)} del ${dia}?</p>${adelantada ? `<p class="fila-s">Todavía no es el ${dia}: ${fem ? 'la' : 'lo'} marcas ${fem ? 'recibida' : 'recibido'} por adelantado.</p>` : ''}<div class="chips">${ch('esperado', `Sí, ${fem ? 'marcarla como recibida' : 'marcarlo como recibido'}`)}${ch('extra', 'No, es otro ingreso')}</div>${error(h, 'cualIngreso', 'Elige una opción')}</div>`);
        }
        // V2-81: ese ingreso ya estaba recibido: se avisa (lo que guardes es otro ingreso).
        if (d.tipo === 'ingreso' && !refIngreso && d.yaRecibido) {
            const ing = M.ingreso(st, d.yaRecibido.id);
            if (ing) {
                const { cual, fem, dia } = cualIngreso(ing, d.yaRecibido.fecha);
                out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Ya marcaste tu ${esc(cual)} del ${dia} como ${fem ? 'recibida' : 'recibido'}. ¿Es otro ingreso?</p></div>`);
            }
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
            out.push(`<div class="nota nota--info" role="note">${icon('scale')}<p>Según lo anotado tienes ${dinero(esperado)} en ${esc(M.lugar(st, d.lugar).nombre)}. ${dif === 0 ? 'Cuadra exacto.' : `Los ${dinero(Math.abs(dif))} de diferencia quedan «sin detalle».`} Desde ahora la cuenta parte de este número.</p></div>`);
        }
        if (d.tipo === 'pagado' && d.medio) {
            const m = M.medio(st, d.medio);
            if (m && m.lugar) out.push(notaCuadre(st, d.fecha, m.lugar, contadoDe(st, d.pago, d.ocurrencia)));
        }
        if (d.tipo === 'ingreso' && d.ingresoRef && (!d.preguntarIngreso || d.cualIngreso === 'esperado')) out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Al guardar te ayudo a repartirla.</p></div>`);
        if (d.tipo === 'pagoTarjeta') out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Pagar la tarjeta mueve dinero de tu banco a la tarjeta: no es un gasto nuevo.</p></div>`);
        if ((d.tipo === 'gasto' || d.tipo === 'ingreso') && d.fecha > st.hoy) out.push(`<div class="nota nota--info" role="note">${icon('calendar-days')}<p><strong>Es para el ${esc(M.fechaLarga(d.fecha))}:</strong> ${d.tipo === 'gasto' ? 'lo pongo en Pagos como pago de una vez. No baja tu dinero hasta que lo pagues.' : 'lo pongo como ingreso esperado. No suma a tu libre hasta que llegue.'}${d.adelanto ? ' Después te pregunto de qué quincena te lo descuentan.' : ''}</p></div>`);
        else if (d.tipo === 'ingreso' && d.adelanto && !d.ingresoRef) out.push(`<div class="nota nota--info" role="note">${icon('info')}<p>Es un adelanto de tu salario: suma hoy. Al guardar te pregunto de qué quincena te lo descuentan.</p></div>`);
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
    const tactil = () => {
        try {
            return window.matchMedia('(pointer: coarse)').matches;
        } catch {
            return false;
        }
    };
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
        // V2-50: en el teléfono (pantalla táctil) no se abre el teclado de golpe: el foco va al título y el
        // teclado sale al tocar el campo o un atajo que pide escribir. En la computadora, directo al campo.
        foco: () => (tactil() ? '#hoja-t' : '#anotar-q'),
        html(h) {
            const st = P.st;
            const ctx = h.ctxMedio ? M.medio(st, h.ctxMedio) : h.ctxLugar ? M.lugar(st, h.ctxLugar) : h.ctxApartado ? M.apartado(st, h.ctxApartado) : null;
            return {
                titulo: 'Anotar',
                cuerpo: `${P.tipHtml('anotar')}${ctx ? `<p class="contexto">${emo(ctx.emoji, 16)} Desde ${esc(ctx.nombre)}</p>` : ''}
                    <label class="campo-l" for="anotar-q">¿Qué pasó?</label>
                    <div class="campo campo--grande"><input id="anotar-q" data-campo="texto" type="text" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" spellcheck="false" placeholder="${esc(EJEMPLOS[0])}" value="${esc(h.texto)}" aria-describedby="anotar-mic"></div>
                    <p class="campo-ayuda" id="anotar-mic">${icon('mic', 'ico-s')}Puedes dictar: toca el micrófono de tu teclado.</p>
                    ${h.intento && h.errores.includes('tipo') ? `<p class="campo-error" id="err-tipo">${icon('triangle-alert')}<span>Escribe qué pasó o elige una opción</span></p>` : ''}
                    <div id="anotar-cuerpo">${cuerpoAnotar(st, h)}</div>`,
                pie: pie2('anotarGuardar', P.textoGuardarAnotar(h.d), { fk: 'anotar-guardar' }),
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
                const boton = document.querySelector('[data-fk="anotar-guardar"]');
                if (boton) boton.textContent = P.textoGuardarAnotar(h.d);
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
                // V2-81: «Recibí» con un monto parecido al de tu quincena: ¿es esa? (mientras no haya respondido).
                if (h.d.tipo === 'ingreso' && !h.d.cualIngreso && !h.d.adelanto) M.aplicarEsperado(st, h.d);
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
                // V2-83: si escribe otro nombre, el frecuente elegido deja de verse marcado; V2-82: se vuelve a revisar si ya lo tiene.
                if (h.d.tipo === 'pago') {
                    const f = D.PAGOS_FRECUENTES.find((y) => y.id === h.d.frecuente);
                    if (f && M.normalizar(f.nombre) !== M.normalizar(el.value)) h.d.frecuente = null;
                    region('anotar-preg', preguntasAnotar(st, h));
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
            x.refGuardada = null;
            x.categoria = v;
            const k = M.categoria(v);
            x.emoji = k.emoji;
            x.nombre = k.nombre;
            // V2-81: de tipo Salario cerca de tu quincena: ¿es esa? (o ya estaba recibida).
            M.aplicarEsperado(st, x);
            if (!x.ingresoRef) Object.assign(x, { emoji: k.emoji, nombre: k.nombre });
        } else if (d.campo === 'frecuente') {
            const f = D.PAGOS_FRECUENTES.find((y) => y.id === v);
            x.nombre = f.nombre;
            x.emoji = f.emoji;
            x.categoria = f.categoria;
            x.frecuente = v;
            if (f.semanal) x.frecuencia = 'semanal';
        } else if (d.campo === 'dup') {
            // V2-82: «Ver el que tengo» abre su ficha (no se crea nada); «Sí, es otro» deja guardarlo.
            if (v === 'ver') {
                const p = M.pagoParecido(st, x);
                P.cerrarHoja({ sinFoco: true });
                if (p) P.abrir('pago', p.id);
                P.emitir('anotar:duplicado:ver');
                return;
            }
            x.dupOk = true;
        } else if (d.campo === 'cualPago') {
            // V2-82: el gasto era el pago siguiente (por adelantado) o un gasto aparte.
            x.cualPago = v;
            if (v === 'si' && x.pagoSiguiente) {
                const s = x.pagoSiguiente;
                Object.assign(x, { tipo: 'pagado', pago: s.pago, ocurrencia: s.fecha, monto: x.monto !== null ? x.monto : s.monto, medio: x.medioExplicito ? x.medio : s.medio, fecha: st.hoy, yaPagado: null });
            }
        } else if (d.campo === 'usarApartado') {
            x.usarApartado = v === 'no' ? 'no' : v;
        } else if (d.campo === 'cualIngreso') {
            x.cualIngreso = v;
            if (v === 'extra') {
                x.refGuardada = x.ingresoRef || x.refGuardada;
                x.ingresoRef = null;
                // Un adelanto que no es el esperado sigue siendo un adelanto (V2-56: después se pregunta de qué quincena).
                Object.assign(x, x.adelanto ? { nombre: 'Adelanto de salario', emoji: '💵', categoria: 'otro' } : { nombre: 'Ingreso extra', emoji: '💵', categoria: 'otro' });
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
        } else if (d.campo === 'antes') {
            // V2-85: «No, todavía lo debo» guarda la fecha; «Sí, ya lo pagué», nada.
            x.antesDebe = respuestaAntes(v);
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
        // v2.6.1 (QA F-03): un segundo toque cuando la hoja ya se cerró no hace nada.
        if (!h || h.tipo !== 'anotar') return;
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
        // V2-85: «Recordarme un pago» con su fecha de este periodo ya pasada: la pregunta se ve antes de guardar.
        const antes = pasadaAnotar(st, d);
        if (antes && mostrarAntes(d, antes.fecha)) return;
        let siguiente = null;
        const nombreClave = claveNombre(d.nombre);
        const futuro = (d.tipo === 'gasto' || d.tipo === 'ingreso') && d.fecha > st.hoy;
        const claves = futuro ? [d.tipo === 'gasto' ? 'guardado:pago' : 'guardado:ingresoEsperado', 'guardado:futuro'] : ['guardado:' + d.tipo, 'guardado:' + d.tipo + ':' + nombreClave];
        P.ui.hoja = null;
        let texto = 'Guardado';
        let cambiar = null;
        let adelantoId = null;
        P.cambiar(
            (s) => {
                if (d.tipo === 'ingreso' && d.adelanto && !d.ingresoRef) {
                    // V2-56: un adelanto es un ingreso de una vez; si ya te lo dieron, llegó hoy (o el día que dijiste).
                    const id = 'i' + s.seq++;
                    s.ingresos.push({ id, nombre: d.nombre || 'Adelanto de salario', emoji: '💵', categoria: 'otro', tipoIngreso: 'adelanto', monto: d.monto, aprox: false, frecuencia: 'unico', fecha: d.fecha, lugar: d.lugar, principal: false, extra: true, desde: d.fecha < s.hoy ? d.fecha : s.hoy, llegadas: {} });
                    if (d.fecha <= s.hoy) P.llegoIngreso(s, id, d.fecha, { monto: d.monto, lugar: d.lugar, fecha: d.fecha });
                    adelantoId = id;
                    texto = d.fecha > s.hoy ? `Adelanto esperado el ${M.fechaCorta(d.fecha)}` : 'Adelanto anotado';
                } else if ((d.tipo === 'gasto' || d.tipo === 'ingreso') && d.fecha > s.hoy) {
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
                    P.crearPago(s, { nombre: d.nombre, emoji: d.emoji, categoria: d.categoria, monto: d.monto, frecuencia: d.frecuencia, dia: d.dia, diaSemana: d.diaSemana, medio: d.medio, fecha: d.frecuencia === 'unico' ? d.fechaPago || M.proximoDia(s.hoy, d.dia || 1) : undefined, antes: antes && d.antesDebe === antes.fecha ? 'no' : 'si' });
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
        // V2-56: enseguida, de qué quincena te descuentan el adelanto.
        if (adelantoId) P.abrirHoja('adelanto', { id: adelantoId, nuevo: true });
        else if (siguiente) P.abrir('reparte', siguiente.id, { fecha: siguiente.fecha, monto: siguiente.monto });
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
            const antes = hz.ingreso ? (hz.esHoy ? 'antes de hoy' : hz.atrasada ? 'ya vencido' : `antes del ${M.partes(hz.fecha)[2]}`) : hz.modo === 'quince' ? 'en estos 15 días' : 'antes de fin de mes';
            const linea = (o, sub) => `<li><span>${emo(o.pago.emoji, 16)} ${esc(o.pago.nombre)} <span class="d-sub">${sub}</span></span><span>${dinero(o.parte, { aprox: o.estimado })}</span></li>`;
            const parteDe = (o) => (o.parte < o.monto ? ` · ${dinero(o.parte)} de ${dinero(o.monto, { aprox: o.estimado })}` : '');
            const items = k.items.map((o) => linea(o, `${o.estado === 'vencido' ? 'venció el ' : 'el '}${M.partes(o.fecha)[2]}${parteDe(o)}`));
            for (const t of k.tarjetas) {
                if (t.pendiente && !t.usual) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">estado de cuenta por anotar</span></span><span>Por confirmar</span></li>`);
                // V2-54: hasta su primer estado de cuenta, lo que paga normalmente.
                // v2.6.6 (V2-85): la fecha del ciclo que se cuenta (antes decía la del ciclo de antes de agregarla: «venció el 14 oct»).
                // v2.6.7 (V2-87): solo lo que sale de lo que ya tienes (vence antes de tu próximo ingreso); lo que paga un
                // ingreso que todavía no llega va en «Todavía no cuenta», y lo reservado, en «Reservado para pagos».
                if (t.estimadoAhora > 0) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">lo que pagas normalmente, ${t.vence < st.hoy ? 'venció' : 'vence'} el ${M.fechaCorta(t.vence)}${t.vence >= st.hoy && hz.ingreso && !hz.esHoy && !hz.atrasada ? `, antes de tu ${esc(P.nombreIngreso(hz))}` : ''}</span></span><span>${dinero(t.estimadoAhora, { aprox: true })}</span></li>`);
                // V2-29 #1: vence después del ingreso, pero ya baja el libre; se dice cuándo vence.
                if (t.porPagarAhora > 0) items.push(`<li><span>${emo(t.t.emoji, 16)} ${esc(t.t.nombre)} <span class="d-sub">estado de cuenta, ${t.ult.vence < st.hoy ? 'venció' : 'vence'} el ${M.partes(t.ult.vence)[2]} ${M.MESES_CORTOS[M.partes(t.ult.vence)[1] - 1]}${t.porPagarAhora < t.porPagarEstado ? ` · ${dinero(t.porPagarAhora)} de ${dinero(t.porPagarEstado)}` : ''}</span></span><span>${dinero(t.porPagarAhora)}</span></li>`);
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
            if (hz.ingreso && !hz.esHoy && !hz.atrasada) noCuenta.push(`Tu ${esc(P.nombreIngreso(hz))} del ${M.partes(hz.fecha)[2]} (${dinero(hz.ocurrencia.monto, { aprox: true })}${hz.ocurrencia.descuento ? `, ya sin los ${dinero(hz.ocurrencia.descuento)} del adelanto` : ''}): suma cuando llegue.`);
            if (hz.esHoy) noCuenta.push(`Tu ${esc(P.nombreIngreso(hz))} de hoy: suma cuando confirmes que llegó.`);
            for (const o of hz.atrasadas || []) noCuenta.push(`Tu ${esc(o.ingreso.nombre.toLowerCase())} del ${M.fechaCorta(o.fecha)}: falta confirmar si llegó.`);
            for (const i of st.ingresos.filter((x) => !x.principal && x.activo !== false)) {
                const o = M.ocurrenciasIngreso(st, i, st.hoy, M.sumarDias(st.hoy, 400)).find((x) => x.estado === 'esperado' || x.estado === 'hoy');
                // V2-52: lo que pagas con ese ingreso de una vez tampoco cuenta todavía.
                const conEso = i.frecuencia === 'unico' ? [...new Set((k.futuro['unico:' + i.id] || []).map((y) => P.conArticulo(y.pago.nombre)))] : [];
                if (o) noCuenta.push(`${esc(i.nombre)} (${dinero(o.monto, { aprox: o.aprox })}, ${M.fechaCorta(o.fecha)}): suma cuando llegue${conEso.length ? `; con eso pagas ${esc(P.lista(conEso))}` : ''}.`);
            }
            // v2.6.7 (V2-87): lo que pagas normalmente de una tarjeta, con el ingreso que lo paga (como cualquier otro pago).
            for (const t of k.tarjetas.filter((x) => x.conIngreso > 0)) noCuenta.push(`${esc(t.t.nombre)} (${dinero(t.conIngreso, { aprox: !!t.ult.inicial })}, vence el ${M.fechaCorta(t.vence)}): se paga con ${esc(P.fuentesTarjeta(t))}, no con lo que tienes hoy.`);
            for (const t of k.tarjetas.filter((x) => x.cupoLibre !== null)) noCuenta.push(`Lo disponible de ${esc(t.t.nombre)} (${dinero(t.cupoLibre)}): es dinero prestado, nunca suma.`);
            const fila = (signo, titulo, monto, ir, sub = '', extra = '', fk = ir) => `<li class="d-fila"><button type="button" class="d-b" data-a="desgloseIr" data-ir="${ir}" data-fk="d-${fk}"><span class="d-signo" aria-hidden="true">${signo}</span><span class="d-t">${titulo}${sub ? `<span class="d-sub">${sub}</span>` : ''}</span><span class="d-m">${monto}</span>${icon('chevron-right', 'ico-xs')}</button>${extra}</li>`;
            // v2.4.1: sin ingreso fijo, la persona elige hasta cuándo ve su libre (antes solo se podía el primer día).
            const elegirHz = hz.ingreso ? '' : `<div class="campo-g" role="group" aria-labelledby="l-hz"><p class="campo-l" id="l-hz">¿Hasta cuándo ves tu libre?</p><div class="chips">${[['finDeMes', 'Hasta fin de mes'], ['quince', 'Los próximos 15 días']].map(([v, t]) => `<button type="button" class="chip" aria-pressed="${hz.modo === v}" data-a="horizonte" data-v="${v}" data-fk="hz-${v}">${hz.modo === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('')}</div></div>`;
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
                ${elegirHz}
                ${proxima}
                ${noCuenta.length ? `<div class="nota nota--info" role="note">${icon('info')}<div><p><strong>Todavía no cuenta</strong></p><ul class="mini-lista">${noCuenta.map((y) => `<li>${y}</li>`).join('')}</ul></div></div>` : ''}`,
                pie: pie1('cerrarHoja', 'Entendido', 'desglose-ok'),
            };
        },
    };
    P.acciones.horizonte = (d) => {
        if (M.horizonte(P.st).modo === d.v) return;
        P.cambiar((s) => {
            s.horizonteVariable = d.v;
        }, { aviso: d.v === 'quince' ? 'Listo: ves tu libre de los próximos 15 días' : 'Listo: ves tu libre hasta fin de mes', claves: ['guardado:horizonte'] });
        document.querySelector(`[data-fk="hz-${d.v}"]`)?.focus();
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
                        ${fila('calendar-clock', 'Cómo recibes tu dinero', p ? esc(p.nombre) : `Varía · ves tu libre ${M.horizonte(st).modo === 'quince' ? 'de 15 días' : 'hasta fin de mes'}`, 'menuIr', p ? `data-ir="ingreso" data-id="${p.id}"` : 'data-ir="comoTeEntra"')}
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
        if (d.ir === 'apariencia' || d.ir === 'comoTeEntra') {
            P.ui.hoja = null;
            P.abrirHoja(d.ir);
            return;
        }
        P.cerrarHoja({ sinFoco: true });
        if (d.ir === 'midinero' || d.ir === 'pagos') P.irTab(d.ir);
        else if (P.modos && P.modos.irMenu(d.ir)) return;
        else P.abrir(d.ir, d.id);
    };
    /**
     * V2-59 (#28): sin ingreso fijo, «Cómo recibes tu dinero» (Tu cuenta) también elige hasta cuándo ves tu libre
     * (lo mismo que en «¿De dónde sale?»).
     */
    H.comoTeEntra = {
        html() {
            const hz = M.horizonte(P.st);
            const g = window.terminoGlosario('hastaCuando', true);
            const chips = [['finDeMes', 'Hasta fin de mes'], ['quince', 'Los próximos 15 días']].map(([v, t]) => `<button type="button" class="chip" aria-pressed="${hz.modo === v}" data-a="horizonte" data-v="${v}" data-fk="hz-${v}">${hz.modo === v ? icon('check', 'ico-xs') : ''}${t}</button>`).join('');
            return {
                titulo: 'Cómo recibes tu dinero',
                cuerpo: `<p class="txt">Recibes dinero cuando vendes o trabajas: varía. Tus ventas cuentan cuando las anotas.</p>
                    <div class="campo-g" role="group" aria-labelledby="l-hz2"><p class="campo-l" id="l-hz2">¿Hasta cuándo ves tu libre?</p><div class="chips">${chips}</div><p class="fila-s">${esc(g.para)}</p></div>
                    <button type="button" class="link link--start" data-a="menuIr" data-ir="pagos" data-fk="cte-pagos">${icon('calendar-clock', 'ico-s')}Ver lo que esperas que te llegue</button>`,
                pie: pie1('cerrarHoja', 'Listo', 'cte-listo'),
            };
        },
    };
    /** v2.5: la primera vez que agregas una tarjeta con tus datos, un capítulo corto con datos de ejemplo. */
    H.ofertaTarjetas = {
        html() {
            return {
                titulo: '¿Quieres ver cómo funcionan las tarjetas? (1 min)',
                cuerpo: '<p class="txt">Un capítulo corto con datos de ejemplo. No toca tus datos.</p><p class="fila-s">También está después en tu letra → «Aprende».</p>',
                pie: '<button type="button" class="btn btn--48" data-a="ofertaTarjetas" data-v="no" data-fk="oferta-no">Ahora no</button><button type="button" class="btn btn--prim btn--48" data-a="ofertaTarjetas" data-v="si" data-fk="oferta-si">Ver ahora</button>',
            };
        },
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
    /**
     * «Pagado». v2.6.5 (V2-80): cada ocurrencia se marca UNA vez (después: «Pagado ✓» y «Deshacer»); solo la que toca
     * (la primera sin pagar ni saltar; una vencida, primero); si todavía no vence, se pregunta «¿Ya lo pagaste por
     * adelantado?». V2-29 #8 sigue: con monto fijo no se pregunta cuánto ni con qué.
     */
    P.acciones.pagado = (d) => {
        const st = P.st;
        if (d.tipo === 'pago') {
            const p = M.pago(st, d.id);
            const o = M.ocurrenciasPago(st, p, d.fecha, d.fecha)[0];
            if (o && (o.estado === 'pagado' || o.estado === 'saltado')) {
                P.avisar(o.estado === 'pagado' ? `Ya está pagado: ${p.nombre} del ${P.diaMes(o.fecha)}` : `Ya lo saltaste: ${p.nombre} del ${P.diaMes(o.fecha)}`, { check: false });
                P.emitir('pagado:yaEstaba');
                return;
            }
            const sig = M.porPagar(st, p);
            if (sig && sig.fecha !== d.fecha) {
                P.avisar(`Primero el del ${P.diaMes(sig.fecha)}.`, { check: false });
                P.emitir('pagado:primeroOtro');
                return;
            }
            const seguir = () => {
                const s0 = P.st;
                const x = M.ocurrenciasPago(s0, p, d.fecha, d.fecha)[0];
                // V2-29 #8: monto fijo se guarda sin preguntar: «Pagado con … · Cambiar · Deshacer».
                if (!p.estimado && x && x.estado === 'pendiente') {
                    const m = M.medio(s0, p.medio);
                    // v2.7 (D-6): si ya pagaste una parte, se marca lo que falta.
                    P.cambiar((s) => P.marcarPagado(s, p.id, d.fecha, { monto: x.monto, medio: p.medio, fecha: s.hoy }), { aviso: `Pagado con ${m ? m.nombre : 'tu medio'}`, cambiar: (r) => r.id, claves: ['guardado:pagado', 'guardado:pagado:' + claveNombre(p.nombre)] });
                    return;
                }
                P.abrirHoja('pagado', { tipoPago: d.tipo, id: d.id, fecha: d.fecha });
            };
            if (d.fecha > st.hoy) {
                P.confirmarDlg({ titulo: `Este pago es del ${P.diaMes(d.fecha)}. ¿Ya lo pagaste por adelantado?`, texto: `${p.nombre} · ${dinero(o ? o.monto : p.monto, { aprox: o ? o.estimado : p.estimado })}`, si: 'Sí, ya lo pagué', no: 'Cancelar', alSi: seguir });
                P.emitir('pagado:adelanto');
                return;
            }
            seguir();
            return;
        }
        P.abrirHoja('pagado', { tipoPago: d.tipo, id: d.id, fecha: d.fecha });
    };
    /** V2-80: «Deshacer» un «Pagado ✓» (vuelve a estar por pagar y sale su gasto; se puede volver a deshacer). */
    P.acciones.pagoDeshacer = (d) => {
        const st = P.st;
        const p = M.pago(st, d.id);
        const o = p && M.ocurrenciasPago(st, p, d.fecha, d.fecha)[0];
        if (!o || o.estado !== 'pagado' || !o.hecho || !o.hecho.registro) return;
        P.cambiar((s) => P.desmarcarPagado(s, o.hecho.registro), { aviso: `${p.nombre}: ya no está pagado`, deshacer: true, claves: ['guardado:desmarcar'] });
    };
    /**
     * «Ya llegó». v2.6.5 (V2-81): cada ocurrencia de un ingreso esperado se marca UNA vez (después: «Recibido ✓» y
     * «Deshacer»); solo la que toca; si todavía no es su día, se pregunta «¿Ya te llegó por adelantado?».
     */
    P.acciones.llego = (d) => {
        const st = P.st;
        const ing = M.ingreso(st, d.id);
        if (!ing) return;
        const o = M.ocurrenciasIngreso(st, ing, d.fecha, d.fecha)[0];
        if (o && (o.estado === 'llego' || o.estado === 'noLlego')) {
            P.avisar(`Ya está ${o.estado === 'llego' ? 'recibido' : 'marcado'}: ${ing.nombre} del ${P.diaMes(o.fecha)}`, { check: false });
            return;
        }
        const sig = M.porRecibir(st, ing);
        if (sig && sig.fecha !== d.fecha) {
            P.avisar(`Primero el del ${P.diaMes(sig.fecha)}.`, { check: false });
            return;
        }
        const seguir = () => P.abrirHoja('ingresoLlego', { id: d.id, fecha: d.fecha });
        if (d.fecha > st.hoy) {
            P.confirmarDlg({ titulo: `Este ingreso es del ${P.diaMes(d.fecha)}. ¿Ya te llegó por adelantado?`, texto: `${ing.nombre} · ${dinero(o ? o.monto : ing.monto, { aprox: o ? o.aprox : ing.aprox })}`, si: 'Sí, ya llegó', no: 'Cancelar', alSi: seguir });
            P.emitir('llego:adelanto');
            return;
        }
        seguir();
    };
    /** V2-81: «Deshacer» un «Recibido ✓»: sale lo que llegó (y lo que se descontó solo de ese pago) y vuelve a esperarse. */
    P.deshacerLlegada = function (st, ingresoId, fecha) {
        const ing = M.ingreso(st, ingresoId);
        if (!ing || !ing.llegadas[fecha]) return;
        delete ing.llegadas[fecha];
        // «Reparte» → «Listo» confirma lo que tienes en cada lugar (ya con lo que llegó). Esas confirmaciones (sin
        // diferencia) dejan de contarlo; un cuadre con otro monto (lo que contaste de verdad) no se toca.
        const reg = st.registros.find((r) => r.tipo === 'ingreso' && r.ingreso === ingresoId && r.ocurrencia === fecha);
        if (reg && reg.lugar) {
            for (const c of st.registros) {
                if (c.tipo !== 'cuadre' || c.lugar !== reg.lugar || !(c.seq > reg.seq) || c.esperado !== c.monto) continue;
                c.monto -= reg.monto;
                c.esperado -= reg.monto;
                const l = M.lugar(st, c.lugar);
                if (l && l.cuadre && l.cuadre.seq === c.seq) l.cuadre.monto = c.monto;
            }
        }
        st.registros = st.registros.filter((r) => !(r.tipo === 'ingreso' && r.ingreso === ingresoId && r.ocurrencia === fecha));
        for (const p of M.descuentosDe(st, ingresoId)) {
            const hh = p.hechos[fecha];
            if (hh && hh.descuento) {
                if (hh.bajaDeuda && debeConocido(p)) p.deuda.debe += hh.bajaDeuda;
                delete p.hechos[fecha];
            }
        }
    };
    P.acciones.llegadaDeshacer = (d) => {
        const ing = M.ingreso(P.st, d.id);
        if (!ing || !ing.llegadas[d.fecha]) return;
        P.cambiar((s) => P.deshacerLlegada(s, d.id, d.fecha), { aviso: `${ing.nombre}: ya no está recibido`, deshacer: true, claves: ['guardado:llegadaDeshacer'] });
    };
    H.pagado = {
        iniciar(h) {
            const st = P.st;
            if (h.tipoPago === 'tarjeta') {
                // V2-88: desde la cuenta del medio con que dijiste que la pagas. v2.7 (F17): lo mismo en todas las entradas.
                const prop = M.pagoTarjetaPropuesto(st, M.tarjeta(st, h.id));
                h.monto = prop.monto > 0 ? M.montoCampo(prop.monto) : '';
                h.lugar = prop.lugar;
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
                        <div id="pagado-vivo" aria-live="polite">${vivoPagado(st, h)}</div>
                        ${bancos.length > 1 ? opciones(h, { campo: 'lugar', label: '¿Desde cuál cuenta?', lista: lugares(st), valor: h.lugar }) : `<p class="txt">Desde ${esc(M.lugar(st, h.lugar).nombre)}.</p>`}
                        ${campoFecha(h, 'cuando', h.cuando, { label: '¿Cuándo?' })}
                        ${(() => {
                            // v2.6.7 (V2-87): lo que ibas a pagar con una quincena que todavía no llega no estaba contado.
                            const info = M.tarjetaInfo(st, t);
                            return info.conIngreso > 0
                                ? `<div class="nota nota--info" role="note">${icon('info')}<p>Pagar la tarjeta mueve dinero de tu banco a la tarjeta: <strong>no es un gasto nuevo</strong>. Ibas a pagar ${dinero(info.conIngreso, { aprox: !!info.ult.inicial })} con ${esc(P.fuentesTarjeta(info))}: si lo pagas desde ya, sale de lo que tienes hoy y tu libre baja.</p></div>`
                                : `<div class="nota nota--info" role="note">${icon('info')}<p>Pagar la tarjeta mueve dinero de tu banco a la tarjeta: <strong>no es un gasto nuevo</strong> y tu libre no cambia, porque ya estaba contado.</p></div>`;
                        })()}`,
                    pie: pie2('pagadoGuardar', 'Marcar pagado'),
                };
            }
            const p = M.pago(st, h.id);
            const m = M.medio(st, h.medio);
            return {
                titulo: `${esc(p.nombre)} · ${h.vencido ? 'venció' : 'vence'} el ${M.partes(h.fecha)[2]} ${M.MESES_CORTOS[M.partes(h.fecha)[1] - 1]}`,
                cuerpo: `${campoMonto(h, { label: '¿Cuánto pagaste?', valor: h.monto, ayuda: p.estimado ? `Era un estimado de ${dinero(p.monto, { aprox: true })}. Escribe lo que dice tu recibo.` : '', errorTexto: 'Escribe cuánto pagaste' })}
                    <div id="pagado-vivo" aria-live="polite">${vivoPagado(st, h)}</div>
                    ${opciones(h, { campo: 'medio', label: '¿Con qué lo pagaste?', lista: medios(st).map((x) => ({ ...x, s: x.v === p.medio ? 'el de siempre' : '' })), valor: h.medio })}
                    ${campoFecha(h, 'cuando', h.cuando, { label: h.vencido ? '¿Cuándo lo pagaste?' : '¿Cuándo?', extra: h.vencido ? h.fecha : null })}
                    <div id="pagado-nota">${m && m.lugar ? notaCuadre(st, h.cuando, m.lugar, contadoDe(st, p.id, h.fecha)) : ''}</div>`,
                pie: pie2('pagadoGuardar', 'Marcar pagado'),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
        vivo(h) {
            region('pagado-vivo', vivoPagado(P.st, h));
        },
    };
    /**
     * v2.7 (D-6, F12, F13): pagar una parte se puede. En un pago: «Quedan $X pendientes». En una tarjeta con estado de
     * cuenta: «Te faltan $X para el mínimo».
     */
    function vivoPagado(st, h) {
        const monto = M.leerMonto(h.monto);
        if (monto === null) return '';
        if (h.tipoPago === 'tarjeta') {
            const info = M.tarjetaInfo(st, M.tarjeta(st, h.id));
            return info.ult.inicial ? '' : notaMinimo(monto, info.ult.minimo, info.pagado);
        }
        const p = M.pago(st, h.id);
        const o = p && M.ocurrenciasPago(st, p, h.fecha, h.fecha)[0];
        if (!o || o.estimado || !(monto > 0) || monto >= o.monto) return '';
        return `<div class="nota nota--info" role="note">${icon('info')}<p><strong>Quedan ${dinero(o.monto - monto)} pendientes de este pago.</strong> Siguen en Pagos hasta que los pagues.</p></div>`;
    }
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
        // V2-52: un ingreso de una vez no cuenta hasta que llega.
        if (M.esUnico(f)) {
            const ing = M.ingresoDeClave(P.st, f);
            return ing ? `Recibes ${dinero(ing.monto, { aprox: ing.aprox })} el ${M.fechaCorta(ing.fecha)} · no cuenta hasta que llegue` : '';
        }
        const x = k.periodos.find((y) => y.clave === f);
        return x ? `Ese día recibes ${dinero(x.entra, { aprox: true })} · ${x.quedan >= 0 ? `te quedarían ${dinero(x.quedan, { aprox: true })}` : `te faltarían ${dinero(-x.quedan, { aprox: true })}`}` : '';
    };
    /**
     * v2.6.7 (V2-87): «Lo pagas con» también para lo que pagas normalmente de una tarjeta (y el estado de cuenta que lo
     * reemplaza): el mismo control; lo elegido se guarda en la tarjeta (`asignaciones`), por fecha, como en un pago.
     */
    const pagoParaPagarCon = (st, h, total) => (h.deTarjeta ? M.pagoDeTarjeta(M.tarjeta(st, h.id), h.fecha, total) : M.pago(st, h.id));
    H.pagarCon = {
        iniciar(h) {
            const st = P.st;
            const k = P.calc();
            if (h.deTarjeta) {
                const info = M.tarjetaInfo(st, M.tarjeta(st, h.id), k.hz);
                h.total = info.comoPago;
                h.estimado = !!info.ult.inicial;
            } else {
                const p0 = M.pago(st, h.id);
                const o = M.ocurrenciasPago(st, p0, h.fecha, h.fecha)[0];
                h.total = o ? o.monto : p0.monto;
                h.estimado = !!(o && o.estimado);
            }
            const p = pagoParaPagarCon(st, h, h.total);
            h.fuentes = M.fuentesPara(st, h.fecha, k.hz);
            h.def = h.fuentes.at(-1);
            // Lo que ya está fundado (de antes o de hoy) se ve como «lo que tienes ahora».
            const actual = M.asignacion(st, p, h.fecha, h.total, k.hz).map((x) => ({ de: M.esFundado(st, x.de) ? 'ahora' : x.de, monto: x.monto }));
            h.partes = Object.fromEntries(h.fuentes.map((f) => [f, M.montoCampo(M.suma(actual.filter((x) => x.de === f), (x) => x.monto))]));
            const usadas = actual.filter((x) => x.monto > 0);
            h.modo = usadas.length > 1 ? 'repartir' : 'uno:' + (usadas[0] ? usadas[0].de : h.def);
            // Desde un aviso «¿Lo pagas con…?» llega la opción sugerida ya elegida.
            if (h.sugerida && h.fuentes.includes(h.sugerida)) h.modo = 'uno:' + h.sugerida;
            h.siempre = !!p.pagarCon;
            h.parejo = !!(p.pagarCon && p.pagarCon.modo === 'parejo');
        },
        html(h) {
            const st = P.st;
            const k = P.calc();
            const p = pagoParaPagarCon(st, h, h.total);
            const repetido = !h.deTarjeta && p.frecuencia !== 'unico' && !!M.principal(st);
            const etiqueta = (f) => (f === 'ahora' ? 'Con lo que tienes ahora' : M.capital('con ' + P.etiquetaFuente(f)));
            const op = (v, t, s) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.modo === v}" data-a="valor" data-campo="modo" data-v="${v}" data-fk="pc-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${esc(t)}</span>${s ? `<span class="fila-s">${esc(s)}</span>` : ''}</span>${h.modo === v ? icon('circle-check', 'ico-ok') : ''}</button>`;
            const vis = fuentesVisibles(h);
            const ocultas = h.fuentes.length - vis.length;
            const opciones1 = [...vis].reverse().map((f) => op('uno:' + f, etiqueta(f) + (f === h.def ? ' (lo normal)' : ''), quedaEn(k, f))).join('');
            const repartir = h.fuentes.length > 1 ? op('repartir', 'Repartirlo', 'Tú eliges cuánto de cada uno') : '';
            const verMas = ocultas ? `<button type="button" class="link link--start" data-a="valor" data-campo="verTodas" data-v="true" data-fk="pc-ver-mas">${icon('chevron-down', 'ico-s')}Ver más ${M.principal(st) && M.principal(st).frecuencia === 'quincenal' ? 'quincenas' : 'opciones'} (${ocultas})</button>` : '';
            const suma = M.suma(h.fuentes, (f) => M.leerMonto(h.partes[f]) || 0);
            const resto = h.total - suma;
            const camposRepartir = h.modo === 'repartir' ? `<div class="pc-rep">${vis.map((f) => campoMonto(h, { campo: 'parte:' + f, label: etiqueta(f), valor: h.partes[f], id: 'f-parte-' + f })).join('')}
                <div class="chips"><button type="button" class="chip" data-a="valor" data-campo="parejo" data-v="si" data-fk="pc-parejo">Repartir parejo</button></div>
                <p class="fila-s" id="pc-suma" aria-live="polite">${resto === 0 ? `Suma ${dinero(h.total)}: cuadra.` : resto > 0 ? `Faltan ${dinero(resto)}: van ${P.etiquetaFuente(h.def) === 'lo que tienes ahora' ? 'con lo que tienes' : 'con ' + esc(P.etiquetaFuente(h.def))}.` : `Te pasaste ${dinero(-resto)} de ${dinero(h.total)}.`}</p></div>` : '';
            const reglaPosible = repetido && (h.modo === 'repartir' ? h.parejo : h.modo === 'uno:' + h.def || h.modo === 'uno:' + antesDeDef(st, h));
            // V2-87: de la tarjeta, qué es ese monto y qué pasa cuando llega el estado de cuenta.
            const deTarjeta = h.deTarjeta ? `<p class="fila-s">${h.estimado ? 'Es lo que pagas normalmente. Cuando anotes tu estado de cuenta, el monto real se paga con lo que elijas aquí.' : 'Es tu estado de cuenta. Lo que anotaste en compras de este ciclo sigue saliendo de lo que tienes.'}</p>` : '';
            return {
                titulo: h.deTarjeta ? `¿Con qué pagas tu tarjeta ${esc(p.nombre)}?` : `¿Con qué pagas ${esc(P.conArticulo(p.nombre))}?`,
                cuerpo: `<p class="txt">Vence el ${esc(M.fechaLarga(h.fecha))} · ${dinero(h.total, { aprox: h.estimado })}.</p>${deTarjeta}<p class="fila-s">Si lo pagas con lo que ya tienes, queda reservado desde hoy.</p>
                    <div class="opciones-grandes" role="radiogroup" aria-label="Con qué lo pagas">${opciones1}${repartir}</div>
                    ${verMas}
                    ${camposRepartir}
                    ${reglaPosible ? `<div class="chips"><button type="button" class="chip" aria-pressed="${!!(h.siempre)}" data-a="valor" data-campo="siempre" data-v="${!h.siempre}" data-fk="pc-siempre">${h.siempre ? icon('check', 'ico-xs') : ''}Hacerlo así cada vez</button></div>` : ''}
                    ${error(h, 'parte', 'Lo repartido no puede pasar del total')}`,
                pie: pie2('pagarConOk', 'Guardar cambios', { fk: 'pc-ok' }),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'siempre') h.siempre = v === 'true';
            else if (campo === 'verTodas') h.verTodas = v === 'true';
            else if (campo === 'parejo') {
                // Partes iguales entre las opciones que se ven (lo que tienes ahora y los días de pago hasta que vence).
                const vis = fuentesVisibles(h);
                const n = vis.length;
                const cuota = Math.floor(h.total / n);
                for (const f of h.fuentes) if (!vis.includes(f)) h.partes[f] = M.montoCampo(0);
                vis.forEach((f, i) => (h.partes[f] = M.montoCampo(i === n - 1 ? h.total - cuota * (n - 1) : cuota)));
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
    /**
     * Antes de la v2.4: de un pago lejano se ven como mucho tres opciones: la de siempre y las dos más
     * cercanas antes de que venza (y la que ya está elegida). «Ver más quincenas» muestra todas.
     */
    function fuentesVisibles(h) {
        if (h.verTodas || h.fuentes.length <= 3) return h.fuentes;
        const fechaDe = (f) => (f === 'ahora' ? P.st.hoy : f === 'despues' ? h.fecha : M.esUnico(f) ? M.ingresoDeClave(P.st, f)?.fecha || P.st.hoy : f);
        const cerca = h.fuentes.filter((f) => f !== h.def).sort((a, b) => (fechaDe(a) < fechaDe(b) ? 1 : fechaDe(a) > fechaDe(b) ? -1 : 0)).slice(0, 2);
        return h.fuentes.filter((f) => f === h.def || cerca.includes(f) || h.modo === 'uno:' + f || (h.modo === 'repartir' && M.leerMonto(h.partes[f])));
    }
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
        const k = P.calc();
        const libreAntes = k.libre;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                // V2-87: lo de la tarjeta se guarda en la tarjeta.
                const x = h.deTarjeta ? M.tarjeta(s, h.id) : M.pago(s, h.id);
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
                claves: ['guardado:pagarCon', 'guardado:pagarCon:' + (h.modo === 'repartir' ? 'repartir' : h.modo.startsWith('uno:unico:') ? 'unico' : 'uno')],
            },
        );
        P.emitir('pagarCon:' + h.id);
    };

    // ================================================================== ADELANTO DE SALARIO (corrección v2.3.1)
    /** Los próximos pagos de tus ingresos que se repiten (no los de tu pareja ni la remesa), después del adelanto. */
    function opcionesAdelanto(st, a) {
        const out = [];
        const lista = M.recurrentes(st).filter((i) => i.categoria !== 'remesa' && !/pareja|espos|marido|novi|remesa/i.test(i.nombre)).sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0));
        for (const ing of lista) {
            for (const o of M.ocurrenciasIngreso(st, ing, M.sumarDias(a.fecha, 1), M.sumarDias(a.fecha, 75)).filter((x) => x.estado !== 'llego' && x.estado !== 'noLlego').slice(0, 4)) {
                out.push({ clave: ing.id + '|' + o.fecha, ingreso: ing.id, fecha: o.fecha, monto: ing.monto, t: M.capital(P.etiquetaPagoIngreso(ing.id, o.fecha)) });
            }
        }
        return out;
    }
    const textoSumaAdelanto = (partes, total, opciones) => {
        const suma = M.suma(opciones.filter((o) => partes[o.clave] !== undefined), (o) => M.leerMonto(partes[o.clave]) || 0);
        return suma === total ? `Suman ${dinero(suma)}: todo el adelanto.` : `Suman ${dinero(suma)} de ${dinero(total)}.`;
    };
    /** Tocar una quincena la agrega (con lo que falta del adelanto) o la quita; si queda una sola, se lleva todo. */
    function elegirQuincenaAdelanto(partes, clave, total) {
        if (partes[clave] !== undefined) {
            delete partes[clave];
            const quedan = Object.keys(partes);
            if (quedan.length === 1 && total) partes[quedan[0]] = M.montoCampo(total);
            return;
        }
        const usado = M.suma(Object.values(partes), (x) => M.leerMonto(x) || 0);
        partes[clave] = M.montoCampo(Math.max(0, (total || 0) - usado));
    }
    H.adelanto = {
        iniciar(h) {
            const st = P.st;
            const a = M.ingreso(st, h.id);
            h.opciones = opcionesAdelanto(st, a);
            const ya = (a.adelanto && a.adelanto.descuentos) || [];
            h.partes = {};
            for (const d of ya) h.partes[d.ingreso + '|' + d.fecha] = M.montoCampo(d.monto);
            // Por defecto: todo el adelanto, de la primera quincena que viene después.
            if (!ya.length && h.opciones[0]) h.partes[h.opciones[0].clave] = M.montoCampo(a.monto);
            h.yaEra = ya.length > 0;
        },
        html(h) {
            const st = P.st;
            const a = M.ingreso(st, h.id);
            const p = M.principal(st);
            const cual = p && p.frecuencia === 'quincenal' ? 'quincena' : 'pago';
            const elegidas = h.opciones.filter((o) => h.partes[o.clave] !== undefined);
            const lista = h.opciones
                .map((o) => {
                    const on = h.partes[o.clave] !== undefined;
                    return `<button type="button" class="chip" aria-pressed="${!!(on)}" data-a="valor" data-campo="elegir" data-v="${esc(o.clave)}" data-fk="ad-${esc(o.fecha)}">${on ? icon('check', 'ico-xs') : ''}<span>${esc(o.t)}</span><span class="chip-s">${esc(dinero(o.monto, { aprox: true }))}</span></button>`;
                })
                .join('');
            const campos = elegidas.map((o) => campoMonto(h, { campo: 'parte:' + o.clave, label: elegidas.length > 1 ? `¿Cuánto de ${esc(o.t.charAt(0).toLowerCase() + o.t.slice(1))}?` : '¿Cuánto te descuentan?', valor: h.partes[o.clave], id: 'f-ad-' + o.fecha })).join('');
            return {
                titulo: `¿De qué ${cual} te lo descuentan?`,
                cuerpo: `<p class="txt">${emo(a.emoji, 18)} ${esc(a.nombre)} · ${dinero(a.monto, { aprox: a.aprox })}, el ${esc(M.fechaLarga(a.fecha))}.</p>
                    ${h.opciones.length ? `<div class="campo-g" role="group" aria-labelledby="l-ad"><p class="campo-l" id="l-ad">Elige una, o varias si te lo descuentan en partes</p><div class="chips chips--col">${lista}</div>${error(h, 'elegir', 'Elige de cuál te lo descuentan')}</div>` : `<p class="vacio">No tienes ${cual === 'quincena' ? 'quincenas' : 'pagos'} esperados después de esa fecha. Agrega tu salario con «+ Ingreso esperado».</p>`}
                    ${campos}
                    ${elegidas.length > 1 ? `<p class="fila-s" id="ad-suma" aria-live="polite">${esc(textoSumaAdelanto(h.partes, a.monto, h.opciones))}</p>` : ''}
                    ${error(h, 'montos', 'Escribe cuánto te descuentan de cada una')}
                    <p class="fila-s">Esa ${cual} ya vendrá con el descuento: no contamos el mismo dinero dos veces.</p>
                    ${h.yaEra ? `<button type="button" class="link link--peligro" data-a="adelantoQuitar" data-fk="ad-quitar">${icon('x', 'ico-s')}No es un adelanto</button>` : ''}`,
                pie: pie2('adelantoOk', 'Guardar descuento', { fk: 'ad-ok', cancelar: h.nuevo ? 'Ahora no' : 'Cancelar' }),
            };
        },
        alValor(h, campo, v) {
            if (campo !== 'elegir') return;
            elegirQuincenaAdelanto(h.partes, v, M.ingreso(P.st, h.id).monto);
        },
        alCampo(h, campo, el) {
            if (campo.startsWith('parte:')) h.partes[campo.slice(6)] = el.value;
        },
        vivo(h) {
            const el = document.getElementById('ad-suma');
            if (el) el.textContent = textoSumaAdelanto(h.partes, M.ingreso(P.st, h.id).monto, h.opciones);
        },
    };
    P.acciones.adelantoOk = () => {
        const h = P.ui.hoja;
        const elegidas = h.opciones.filter((o) => h.partes[o.clave] !== undefined).map((o) => ({ ingreso: o.ingreso, fecha: o.fecha, monto: M.leerMonto(h.partes[o.clave]) }));
        if (!validar(h, !elegidas.length ? ['elegir'] : elegidas.some((d) => !d.monto) ? ['montos'] : [])) return;
        P.ui.hoja = null;
        const uno = elegidas.length === 1 ? elegidas[0] : null;
        P.cambiar(
            (s) => {
                M.ingreso(s, h.id).adelanto = { descuentos: elegidas };
            },
            { aviso: uno ? `Listo: ${P.etiquetaPagoIngreso(uno.ingreso, uno.fecha)} ya viene con ${dinero(uno.monto)} menos` : 'Listo: esas quincenas ya vienen con el descuento', claves: ['guardado:adelanto'] },
        );
    };
    P.acciones.adelantoQuitar = () => {
        const h = P.ui.hoja;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                delete M.ingreso(s, h.id).adelanto;
            },
            { aviso: 'Listo: ya no lo descontamos', claves: ['guardado:adelantoQuitar'] },
        );
    };

    // ================================================================== ¿ES UNA DEUDA? (corrección v2.3.1)
    /** Un préstamo o una cuota creados como pago normal: se anotan en Deudas (es el mismo pago, no se duplica). */
    H.esDeuda = {
        iniciar(h) {
            const p = M.pago(P.st, h.id);
            h.tipoDeuda = /casa comercial|almac[eé]n|tienda/i.test(p.nombre) ? 'casacomercial' : /vivienda/i.test(p.nombre) ? 'vivienda' : 'prestamo';
            h.debe = '';
        },
        html(h) {
            const p = M.pago(P.st, h.id);
            return {
                titulo: `${esc(p.nombre)} en Deudas`,
                cuerpo: `<p class="txt">Es este mismo pago: no se duplica. En Deudas verás cuánto debes.</p>
                    ${opciones(h, { campo: 'tipoDeuda', label: '¿Qué es?', lista: D.TIPOS_DEUDA.filter((x) => x.id !== 'tarjeta').map((x) => ({ v: x.id, t: x.nombre, e: x.emoji })), valor: h.tipoDeuda })}
                    ${campoMonto(h, { campo: 'debe', label: '¿Cuánto debes? <span class="opcional">(opcional)</span>', valor: h.debe, id: 'f-debe', ayuda: 'Más o menos. Baja con cada «Pagado».' })}`,
                pie: pie2('esDeudaOk', 'Guardar', { fk: 'es-deuda-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.esDeudaOk = () => {
        const h = P.ui.hoja;
        const p = M.pago(P.st, h.id);
        const debe = M.leerMonto(h.debe);
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                Object.assign(M.pago(s, h.id), { tipoDeuda: h.tipoDeuda, deuda: debe !== null ? { debe } : null });
            },
            { aviso: `Listo: ${p.nombre} ya está en Deudas`, claves: ['guardado:esDeuda'] },
        );
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
            const nombres = pagos.slice(0, 3).map((n) => P.conArticulo(n));
            const cuales = pagos.length > 3 ? `${nombres.join(', ')} y más` : P.lista(nombres);
            // V2-59 (#27): para quien vende, no «te faltarían»: lo que paga, y que sus ventas cuentan cuando las anota.
            const intro = P.variable() && !per.entra ? `${k.hz.modo === 'quince' ? 'En los 15 días siguientes' : 'El próximo mes'} pagas ${dinero(per.pagos, { aprox: true })}: ${cuales}. Tus ventas cuentan cuando las anotas.` : `Con ${P.etiquetaFuente(per.clave)} te faltarían ${dinero(per.deficit, { aprox: true })} para ${cuales}.`;
            return {
                titulo: '¿Cuánto reservas?',
                cuerpo: `<p class="txt">${esc(intro)}</p>
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
                pie: pie2('pasarProximaOk', 'Pasar', { fk: 'pasar-ok' }),
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
                titulo: items.length === 1 ? (items[0].pago ? 'Un pago necesita atención' : 'Un aviso para hoy') : items.length ? (items.every((x) => x.pago) ? `${items.length} pagos necesitan atención` : `${items.length} avisos para hoy`) : 'Todo al día',
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
            // v2.6.1 (QA A-D2): una deuda guardada sin «¿cuánto debes?» también se puede anotar aquí.
            const p = M.pago(P.st, h.id);
            h.monto = debeConocido(p) ? M.montoCampo(p.deuda.debe) : '';
        },
        html(h) {
            return { titulo: 'Lo que debes', cuerpo: `${campoMonto(h, { label: '¿Cuánto debes más o menos?', valor: h.monto, ayuda: 'Es opcional. Lo ves en tu recibo o en la app de la tienda.' })}`, pie: pie2('deudaOk', 'Guardar lo que debes') };
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
            const p = M.pago(s, h.id);
            p.deuda = { ...(p.deuda || {}), debe: monto };
        }, { aviso: 'Lo que debes quedó guardado', claves: ['guardado:deuda:debe'] });
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
                cuerpo: `<p class="txt txt--q">Dinos cuánto tienes de verdad. Desde ahora la cuenta parte de este número. ${P.qBtn('cuadrar')}</p>${P.qTexto('cuadrar')}
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
                    ${h.id ? '' : opciones(h, { campo: 'apartado', label: '¿En cuál?', lista: st.apartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), valor: h.apartado, errorTexto: 'Elige un ahorro o crea uno' }) + campoTexto(h, { campo: 'nuevo', label: '¿O es un ahorro nuevo?', valor: h.nuevo, placeholder: 'Ej. Regalo de mamá' })}
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
                cuerpo: `${campoTexto(h, { campo: 'nombre', label: '¿Cómo se llama?', valor: h.nombre, errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: '¿Cuánto quieres juntar?', valor: h.monto, ayuda: 'Opcional. Déjalo vacío para ahorrar a tu ritmo.' })}
                    <div class="campo-g"><label class="campo-l" for="f-metaFecha">¿Para cuándo? <span class="opcional">(opcional)</span></label><div class="campo"><input id="f-metaFecha" data-campo="metaFecha" type="date" value="${esc(h.metaFecha)}"></div><p class="campo-ayuda">Con fecha, al repartir tu ingreso te sugerimos cuánto ahorrar para llegar.</p></div>
                    ${h.confirmarEliminar ? confirmarHtml(`¿Eliminar ${esc(a.nombre)}?`, a.monto ? `Sus ${dinero(a.monto)} vuelven a tu libre.` : 'No tiene dinero adentro.', 'apartadoEliminar', 'ap-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="ap-eliminar">${icon('trash-2', 'ico-s')}Eliminar ahorro</button>`}`,
                pie: pie2('metaOk', 'Guardar meta'),
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
            const op = (v, t, sub, monto) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.elegido === v}" data-a="valor" data-campo="elegido" data-v="${v}" data-fk="yl-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${t}</span><span class="fila-s">${sub}</span></span>${monto ? `<span class="monto">${monto}</span>` : ''}${h.elegido === v ? icon('circle-check', 'ico-ok') : ''}</button>`;
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
            const medioDef = (st.medios.find((m) => m.id === 'transferencia' && !m.oculto) || st.medios.find((m) => m.tarjetaDebito && !m.oculto) || st.medios.find((m) => !m.tarjeta && !m.oculto) || st.medios[0]).id;
            if (p) Object.assign(h, { editar: true, tipoDeuda: p.tipoDeuda || 'prestamo', cuotaTarjeta: !!p.cuotaTarjeta, nombre: p.nombre, cuota: M.montoCampo(p.monto), dia: String(p.dia || ''), debe: p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined ? M.montoCampo(p.deuda.debe) : '', medio: p.medio });
            else if (t) {
                // V2-88: editar trae todo lo que se pide al agregarla: hasta su primer estado de cuenta, lo que pagas
                // normalmente y lo que debes hoy (V2-54, V2-78); con estado de cuenta, su pago de contado y su mínimo. Y con qué
                // la pagas y (V2-87) con qué ingreso.
                const info = M.tarjetaInfo(st, t);
                const ult = info.ult;
                Object.assign(h, { editar: true, tipoDeuda: 'tarjeta', nombre: t.nombre, corte: t.corte ? String(t.corte) : '', sinCorte: !t.corte, pagoDia: String(t.pagoDia), cupo: t.cupo ? M.montoCampo(t.cupo) : '', inicial: !!ult.inicial, usualNueva: ult.inicial && t.pagoUsual ? M.montoCampo(t.pagoUsual) : '', debeHoy: ult.inicial && t.debeInicial !== null && t.debeInicial !== undefined ? M.montoCampo(t.debeInicial) : '', ecTotal: ult.inicial ? '' : M.montoCampo(ult.total), ecMinimo: ult.inicial ? '' : M.montoCampo(ult.minimo), medio: t.medio && M.medio(st, t.medio) ? t.medio : medioDef });
                if (info.comoPago > 0) {
                    h.repartidaT = info.partes.length > 1;
                    h.fuenteT = h.repartidaT ? null : M.esFundado(st, info.partes[0].de) ? 'ahora' : info.partes[0].de;
                    h.fuenteTAntes = h.fuenteT;
                }
            }
            else Object.assign(h, { tipoDeuda: h.tipoInicial || null, nombre: '', corte: '', pagoDia: '', cupo: '', cuota: '', dia: '', debe: '', usualNueva: '', debeHoy: '', medio: medioDef });
        },
        foco: (h) => (h.tipoDeuda ? '#f-nombre' : '#hoja-t'),
        html(h) {
            const st = P.st;
            const tipo = D.TIPOS_DEUDA.find((x) => x.id === h.tipoDeuda);
            // V2-88: al editar un préstamo, «¿Qué es?» también se cambia (entre préstamo, casa comercial y vivienda).
            const tiposLista = h.editar ? D.TIPOS_DEUDA.filter((x) => x.id !== 'tarjeta') : D.TIPOS_DEUDA;
            const tipos = h.editar && (h.tipoDeuda === 'tarjeta' || h.tarjetaId)
                ? ''
                : `<div class="campo-g"><p class="campo-l" id="l-tipoDeuda">¿Qué es?</p><div class="opciones-grandes opciones-grandes--2" role="radiogroup" aria-labelledby="l-tipoDeuda">${tiposLista.map((x) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.tipoDeuda === x.id}" data-a="valor" data-campo="tipoDeuda" data-v="${x.id}" data-fk="td-${x.id}">${caja(x.emoji)}<span class="opcion-g-txt"><span class="opcion-g-t">${esc(x.nombre)}</span><span class="fila-s">${esc(x.s)}</span></span>${h.tipoDeuda === x.id ? icon('circle-check', 'ico-ok') : ''}</button>`).join('')}</div>${error(h, 'tipoDeuda', 'Elige qué es')}</div>`;
            let campos = '';
            if (h.tipoDeuda === 'tarjeta' && !h.cuotaTarjeta) {
                campos = `${campoTexto(h, { campo: 'nombre', label: '¿Cómo se llama?', valor: h.nombre, placeholder: EJ_DEUDA.tarjeta, errorTexto: 'Ponle un nombre' })}
                    <div class="ob-2">${campoDia(h, 'corte', h.sinCorte ? '¿Qué día es el corte? <span class="opcional">(opcional)</span>' : '¿Qué día es el corte?')}${campoDia(h, 'pagoDia', '¿Qué día se paga?')}</div>
                    <p class="fila-s">${h.sinCorte ? 'Si no sabes el día de corte, déjalo vacío: te lo pido con tu estado de cuenta.' : 'Los dos están en tu estado de cuenta.'}</p>
                    ${h.editar ? (h.inicial ? grupoSinEstado(h) : grupoEstado(h)) : grupoEstado(h) + grupoSinEstado(h)}
                    ${campoMonto(h, { campo: 'cupo', label: '¿Cuál es tu límite de crédito? <span class="opcional">(opcional)</span>', valor: h.cupo, id: 'f-cupo', placeholder: 'Ej. 1,000.00', ayuda: 'Verás cuánto tienes disponible. Nunca suma a tu libre: es dinero prestado.' })}
                    ${opciones(h, { campo: 'medio', label: '¿Con qué la pagas?', lista: medios(st).filter((m) => !M.medio(st, m.v).tarjeta), valor: h.medio })}
                    ${h.editar ? fuenteTarjetaForm(st, h) : ''}`;
            } else if (h.tipoDeuda) {
                campos = `${campoTexto(h, { campo: 'nombre', label: '¿Cómo se llama?', valor: h.nombre, placeholder: EJ_DEUDA[h.tipoDeuda], errorTexto: 'Ponle un nombre' })}
                    <div class="ob-2">${campoMonto(h, { campo: 'cuota', label: '¿De cuánto es la cuota?', valor: h.cuota, id: 'f-cuota', errorTexto: 'Escribe la cuota' })}${campoDia(h, 'dia', '¿Qué día se paga?', 'Cada mes')}</div>
                    ${campoMonto(h, { campo: 'debe', label: '¿Cuánto debes? <span class="opcional">(opcional)</span>', valor: h.debe, id: 'f-debe', ayuda: 'Más o menos. Baja con cada «Pagado».' })}
                    ${opciones(h, { campo: 'medio', label: '¿Con qué la pagas?', lista: medios(st).filter((m) => !M.medio(st, m.v).tarjeta), valor: h.medio })}
                    ${h.cuotaTarjeta ? '<p class="fila-s">Es lo que pagas cada mes a esta tarjeta. Si quieres llevar sus compras y su estado de cuenta, agrégala como tarjeta de crédito en Deudas.</p>' : ''}`;
            }
            // V2-85: el pago de este periodo que ya pasó (o vence hoy): «¿ya lo pagaste?».
            const antes = h.tipoDeuda ? antesDeuda(st, h) : null;
            if (!antes) h.antesVisto = null;
            const pregunta = antes ? preguntaAntes(h, antes.fecha, { mensual: true, siguiente: antes.siguiente }) : '';
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Tarjeta o préstamo',
                cuerpo: `${tipos}${campos}${pregunta}${tipo && !h.editar ? `<p class="fila-s">${h.tipoDeuda === 'tarjeta' ? 'Al guardar, su pago aparece solo en Pagos según tu estado de cuenta.' : 'Al guardar, la cuota aparece sola en Pagos.'}</p>` : ''}`,
                pie: pie2('nuevaDeudaOk', h.editar ? 'Guardar cambios' : h.tipoDeuda === 'tarjeta' ? 'Agregar tarjeta' : 'Agregar deuda', { fk: 'deuda-ok' }),
                ...(h.editar && h.tarjetaId ? { cuerpo: `${tipos}${campos}${pregunta}${h.confirmarEliminar ? reasignarHtml(h, st, ligados(st, { medios: mediosDeTarjeta(st, h.tarjetaId) }), { fueraMedios: mediosDeTarjeta(st, h.tarjetaId) }) + confirmarHtml(`¿Eliminar ${esc(h.nombre)}?`, 'Deja de aparecer en Pagos y en tu libre. Las compras que anotaste se quedan en tu historial.', 'tarjetaEliminar', 'tarjeta-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="tarjeta-eliminar">${icon('trash-2', 'ico-s')}Eliminar tarjeta</button>`}` } : {}),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'confirmarEliminar') {
                h.confirmarEliminar = v === 'si';
                if (h.confirmarEliminar && h.tarjetaId) prepararReasignar(h, P.st, ligados(P.st, { medios: mediosDeTarjeta(P.st, h.tarjetaId) }), { fueraMedios: mediosDeTarjeta(P.st, h.tarjetaId), credito: true });
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
        const lig = ligados(P.st, { medios: mediosDeTarjeta(P.st, h.tarjetaId) });
        prepararReasignar(h, P.st, lig, { fueraMedios: mediosDeTarjeta(P.st, h.tarjetaId), credito: true });
        P.ui.hoja = null;
        P.cambiar((s) => {
            aplicarReasignar(s, h, lig);
            s.tarjetas = s.tarjetas.filter((x) => x.id !== h.tarjetaId);
            for (const m of s.medios) if (m.tarjeta === h.tarjetaId) Object.assign(m, { oculto: true, tarjeta: null, eraTarjeta: h.tarjetaId });
            s.reservasTarjeta = (s.reservasTarjeta || []).filter((x) => x.tarjeta !== h.tarjetaId);
        }, { aviso: `Eliminaste ${t.nombre}`, claves: ['guardado:tarjetaEliminar'] });
        if (P.ui.stack.at(-1)?.tipo === 'tarjeta') P.atras();
    };
    /** V2-88: su último estado de cuenta (al agregarla, opcional; al editarla, lo que dice el que ya anotaste). */
    function grupoEstado(h) {
        return `<div class="campo-g" role="group" aria-labelledby="l-ec"><p class="campo-l" id="l-ec">${h.editar ? 'Tu último estado de cuenta' : '¿Tienes tu último estado de cuenta? <span class="opcional">(opcional)</span>'}</p><div class="ob-2">${campoMonto(h, { campo: 'ecTotal', label: '¿Cuánto es el pago de contado?', valor: h.ecTotal, id: 'f-ecTotal', errorTexto: 'Escribe el pago de contado' })}${campoMonto(h, { campo: 'ecMinimo', label: '¿Cuánto es el pago mínimo?', valor: h.ecMinimo, id: 'f-ecMinimo', errorTexto: 'El mínimo no puede ser mayor que el total' })}</div><p class="fila-s">${h.editar ? 'Cuánto vas a pagar (todo, el mínimo u otro monto) se cambia en su ficha.' : 'Si no lo tienes a mano, te lo pedimos después del próximo corte.'}</p></div>`;
    }
    /** V2-88: hasta su primer estado de cuenta, lo que pagas normalmente y lo que debes hoy (los mismos textos al editar). */
    function grupoSinEstado(h) {
        return `<div class="campo-g" role="group" aria-labelledby="l-sinec"><p class="campo-l" id="l-sinec">${h.editar ? 'Hasta tu primer estado de cuenta' : '¿Todavía no tienes estado de cuenta? <span class="opcional">(opcional)</span>'}</p>${campoMonto(h, { campo: 'usualNueva', label: '¿Cuánto pagas normalmente? <span class="opcional">(opcional)</span>', valor: h.usualNueva, id: 'f-usualNueva', ayuda: 'Se paga como tus otros pagos, con tu ingreso de antes de esa fecha. Lo usamos hasta que anotes tu estado de cuenta.' })}${campoMonto(h, { campo: 'debeHoy', label: '¿Cuánto debes hoy? <span class="opcional">(opcional)</span>', valor: h.debeHoy, id: 'f-debeHoy', ayuda: 'Más o menos. Queda «por confirmar» hasta tu estado de cuenta.' })}</div>`;
    }
    /** V2-87 / V2-88: al editar la tarjeta, con qué ingreso pagas lo que pagas normalmente (lo mismo que «Lo pagas con»). */
    function fuenteTarjetaForm(st, h) {
        if (h.fuenteTAntes === undefined) return '';
        const t = M.tarjeta(st, h.tarjetaId);
        const info = M.tarjetaInfo(st, t);
        if (!(info.comoPago > 0)) return '';
        if (h.repartidaT) return `<div class="campo-g"><p class="campo-l">¿Con qué ingreso la pagas?</p><p class="fila-s">La repartiste: ${esc(P.textoPartes({ fecha: info.vence, estado: info.vence < st.hoy ? 'vencido' : 'pendiente' }, info.partes, M.horizonte(st)))}. Se cambia en su ficha, en «Lo pagas con».</p></div>`;
        const fuentes = M.fuentesPara(st, info.vence);
        if (fuentes.length < 2) return '';
        const def = fuentes.at(-1);
        const lista = [...fuentes].reverse().map((f) => ({ v: f, t: (f === 'ahora' ? 'Con lo que tienes ahora' : M.capital('con ' + P.etiquetaFuente(f))) + (f === def ? ' (lo normal)' : '') }));
        return `${opciones(h, { campo: 'fuenteT', label: `¿Con qué ingreso la pagas? <span class="opcional">(vence el ${esc(M.fechaCorta(info.vence))}: ${dinero(info.comoPago, { aprox: !!info.ult.inicial })})</span>`, lista, valor: h.fuenteT, columnas: true })}`;
    }
    const diaValido = (v) => /^\d{1,2}$/.test(String(v || '').trim()) && +v >= 1 && +v <= 31;
    const mediosDeTarjeta = (st, id) => st.medios.filter((m) => m.tarjeta === id).map((m) => m.id);
    /** El primer vencimiento de una tarjeta: el mes siguiente a su último corte; sin corte (V2-54), su próximo día de pago. */
    function venceTarjeta(base, corte, pagoDia) {
        if (!corte) return M.proximoDia(base, pagoDia);
        const [y, m] = M.partes(M.ultimoDia(base, corte));
        const [vy, vm] = M.mesMas(y, m, 1);
        return M.fechaDe(vy, vm, pagoDia);
    }
    /**
     * V2-85: en «Tarjeta o préstamo», el pago de este periodo que ya pasó (o vence hoy): el de la tarjeta (con o sin su
     * último estado de cuenta) o la cuota del mes. Al editar, solo si el cambio de días lo trae (V2-57: un estado de
     * cuenta ya anotado no se toca).
     */
    function antesDeuda(st, h) {
        if (h.tipoDeuda === 'tarjeta' && !h.cuotaTarjeta) {
            if (!diaValido(h.pagoDia)) return null;
            const pagoDia = +h.pagoDia;
            let vence;
            if (h.editar) {
                const t = M.tarjeta(st, h.tarjetaId);
                const ult = t && t.estados.at(-1);
                if (!ult || !ult.inicial) return null;
                const corte = diaValido(h.corte) ? +h.corte : t.corte;
                vence = venceTarjeta(corte && t.desde && t.desde <= st.hoy ? t.desde : st.hoy, corte, pagoDia);
                if (vence === ult.vence) return null;
            } else {
                if (!diaValido(h.corte)) return null;
                vence = venceTarjeta(st.hoy, +h.corte, pagoDia);
            }
            if (vence > st.hoy || vence < st.hoy.slice(0, 8) + '01') return null;
            return { fecha: vence, siguiente: M.fechaDe(...M.mesMas(...M.partes(vence).slice(0, 2), 1), pagoDia) };
        }
        if (!h.tipoDeuda || !diaValido(h.dia)) return null;
        const regla = { frecuencia: 'mensual', dia: +h.dia };
        let fecha = M.pasadaDelPeriodo(st, regla);
        if (fecha && h.editar) {
            const p = M.pago(st, h.id);
            fecha = p && nuevasPasadas(st, p, regla).includes(fecha) ? fecha : null;
        }
        return fecha ? { fecha, siguiente: siguienteDe(st, regla, fecha), regla } : null;
    }
    P.acciones.nuevaDeudaOk = () => {
        const h = P.ui.hoja;
        const st = P.st;
        const nombre = (h.nombre || '').trim();
        const faltan = [];
        if (!h.tipoDeuda) faltan.push('tipoDeuda');
        else {
            if (!nombre) faltan.push('nombre');
            if (h.tipoDeuda === 'tarjeta' && !h.cuotaTarjeta) {
                if (!diaValido(h.corte) && !(h.sinCorte && !String(h.corte || '').trim())) faltan.push('corte');
                if (!diaValido(h.pagoDia)) faltan.push('pagoDia');
                // v2.7 (F14): un pago de contado de $0 vale (vacío no). (F13): el mínimo no puede ser mayor que el total.
                if (M.leerMonto(h.ecMinimo) && M.leerMonto(h.ecTotal) === null) faltan.push('ecTotal');
                if (M.leerMonto(h.ecMinimo) !== null && M.leerMonto(h.ecTotal) !== null && M.leerMonto(h.ecMinimo) > M.leerMonto(h.ecTotal)) faltan.push('ecMinimo');
                // V2-88: al editar un estado de cuenta, su pago de contado no se puede borrar.
                if (h.editar && !h.inicial && M.leerMonto(h.ecTotal) === null) faltan.push('ecTotal');
            } else {
                if (!M.leerMonto(h.cuota)) faltan.push('cuota');
                if (!diaValido(h.dia)) faltan.push('dia');
            }
        }
        if (!validar(h, faltan)) return;
        // V2-85: si el pago de este periodo ya pasó (o vence hoy), «¿ya lo pagaste?» se ve antes de guardar.
        const antes = antesDeuda(st, h);
        if (antes && mostrarAntes(h, antes.fecha)) return;
        const loDebe = !!antes && h.antesDebe === antes.fecha;
        const tipo = D.TIPOS_DEUDA.find((x) => x.id === h.tipoDeuda);
        P.ui.hoja = null;
        if (h.tipoDeuda === 'tarjeta' && !h.cuotaTarjeta) {
            const corte = +h.corte;
            const pagoDia = +h.pagoDia;
            const cupo = M.leerMonto(h.cupo) || null;
            const ecTotal = M.leerMonto(h.ecTotal);
            const ecMinimo = M.leerMonto(h.ecMinimo);
            if (h.editar) {
                P.cambiar(
                    (s) => {
                        const t = M.tarjeta(s, h.tarjetaId);
                        const venceAntes = M.tarjetaInfo(s, t).vence;
                        Object.assign(t, { nombre, corte: corte || t.corte || null, pagoDia, cupo });
                        // V2-88: con qué la pagas; y su medio de crédito se llama como ella.
                        if (h.medio) t.medio = h.medio;
                        for (const m of s.medios) if (m.tarjeta === t.id) m.nombre = nombre;
                        const ult = t.estados.at(-1);
                        if (!ult.inicial) {
                            // V2-88: lo que dice su estado de cuenta (cuánto vas a pagar sigue lo que elegiste: todo, mínimo u otro).
                            const total = M.leerMonto(h.ecTotal);
                            const minimo = M.leerMonto(h.ecMinimo) || 0;
                            // v2.7 (D-6, F13): «Otro monto» puede quedar debajo del mínimo; nunca más que el total.
                            if (total !== null && (total !== ult.total || minimo !== ult.minimo)) Object.assign(ult, { total, minimo, aPagar: ult.opcion === 'minimo' ? minimo : ult.opcion === 'otro' ? Math.min(total, ult.aPagar) : total });
                        }
                        if (ult.inicial) {
                            // V2-54 / V2-88: sin estado de cuenta todavía, lo que paga normalmente y lo que debe hoy (los dos opcionales).
                            t.pagoUsual = M.leerMonto(h.usualNueva) || null;
                            const debeHoy = M.leerMonto(h.debeHoy);
                            // v2.7 (D-7): lo que debes hoy es un saldo con fecha: si cambia, cuenta desde hoy (lo de antes ya está en él).
                            if (debeHoy !== null && debeHoy !== t.debeInicial) t.debeDesde = { fecha: s.hoy, seq: s.seq++ };
                            if (debeHoy !== null) t.debeInicial = debeHoy;
                            else if (t.debeInicial !== undefined) t.debeInicial = null;
                            // V2-57: el ciclo pendiente se recalcula con los días nuevos (corte, vencimiento, avisos y su pago
                            // en Pagos salen de aquí). Un estado de cuenta ya anotado no se toca.
                            const antesVence = ult.vence;
                            if (t.corte) {
                                const base = t.desde && t.desde <= s.hoy ? t.desde : s.hoy;
                                Object.assign(ult, { corte: M.ultimoDia(base, t.corte), vence: venceTarjeta(base, t.corte, t.pagoDia) });
                            } else ult.vence = M.proximoDia(s.hoy, t.pagoDia);
                            // V2-85: la respuesta de antes era para otra fecha; con los días nuevos no se crea un pago vencido
                            // (salvo «No, todavía lo debo»).
                            if (ult.vence !== antesVence) delete ult.antes;
                            if (antes) ult.antes = loDebe ? 'debe' : 'pagado';
                        }
                        // V2-87: con qué ingreso la pagas. Lo elegido sigue a la fecha nueva si cambiaste los días.
                        const info = M.tarjetaInfo(s, t);
                        if (t.asignaciones && t.asignaciones[venceAntes] && info.vence !== venceAntes) {
                            t.asignaciones[info.vence] = t.asignaciones[venceAntes];
                            delete t.asignaciones[venceAntes];
                        }
                        if (h.fuenteT && h.fuenteT !== h.fuenteTAntes && info.comoPago > 0) {
                            const asign = { ...(t.asignaciones || {}) };
                            if (h.fuenteT === M.fuentesPara(s, info.vence).at(-1)) delete asign[info.vence];
                            else asign[info.vence] = [{ de: h.fuenteT, monto: info.comoPago }];
                            t.asignaciones = asign;
                        }
                    },
                    { aviso: 'Cambios guardados', claves: ['guardado:deuda:editar'] },
                );
                return;
            }
            P.cambiar(
                (s) => {
                    const id = 't' + s.seq++;
                    const ultimoCorte = M.ultimoDia(s.hoy, corte);
                    const vence = venceTarjeta(s.hoy, corte, pagoDia);
                    // v2.7 (F14): un estado de cuenta de $0 también es un estado de cuenta. (F10): guarda en qué orden se anotó.
                    const estado = ecTotal !== null ? { corte: ultimoCorte, total: ecTotal, minimo: ecMinimo || 0, aPagar: ecTotal, opcion: 'total', vence, seq: s.seq++ } : { corte: ultimoCorte, total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence, inicial: true, esperarCorte: true };
                    // V2-85: su pago de este periodo ya pasó (o vence hoy): «Sí» no lo cuenta; «No, todavía lo debo», sí.
                    if (antes) estado.antes = loDebe ? 'debe' : 'pagado';
                    // V2-78: sin estado de cuenta, lo que pagas normalmente cuenta (estimado) y lo que debes queda por confirmar.
                    const usual = ecTotal === null ? M.leerMonto(h.usualNueva) : null;
                    const debeHoy = ecTotal === null ? M.leerMonto(h.debeHoy) : null;
                    // v2.7 (D-7): lo que debes hoy, con su fecha: las compras de antes ya están en ese saldo.
                    s.tarjetas.push({ id, nombre, emoji: '💳', tipo: 'tarjeta', corte, pagoDia, cupo, interesesAnio: 0, desde: s.hoy, estados: [estado], ...(usual ? { pagoUsual: usual } : {}), ...(debeHoy !== null ? { debeInicial: debeHoy, debeDesde: { fecha: s.hoy, seq: s.seq++ } } : {}), ...(h.medio ? { medio: h.medio } : {}) });
                    s.medios.push({ id: 'm' + id, nombre, emoji: '💳', tarjeta: id });
                },
                { aviso: `${nombre}: su pago ya está en Pagos`, claves: ['guardado:deuda', 'guardado:deuda:tarjeta'] },
            );
            return;
        }
        const cuota = M.leerMonto(h.cuota);
        const debe = M.leerMonto(h.debe);
        if (h.editar) {
            P.cambiar((s) => {
                const nuevas = nuevasPasadas(s, M.pago(s, h.id), { frecuencia: 'mensual', dia: +h.dia });
                const p = Object.assign(M.pago(s, h.id), { nombre, monto: cuota, dia: +h.dia, medio: h.medio, deuda: debe !== null ? { debe } : null });
                // V2-88: «¿Qué es?» también se cambia (su emoji, si era el del tipo).
                if (tipo && p.tipoDeuda !== tipo.id && !h.cuotaTarjeta) {
                    const antes = D.TIPOS_DEUDA.find((x) => x.id === p.tipoDeuda);
                    if (!antes || p.emoji === antes.emoji) p.emoji = tipo.emoji;
                    p.tipoDeuda = tipo.id;
                }
                P.reubicarHechos(s, p);
                // V2-85: con el día nuevo no aparece una cuota vencida que antes no estaba (salvo «No, todavía lo debo»).
                for (const f of nuevas) {
                    if (loDebe && antes && f === antes.fecha) {
                        if (f < s.hoy) anotarDebe(s, `p:${p.id}:${f}`);
                    } else p.hechos[f] = { estado: 'antes' };
                }
            }, { aviso: 'Cambios guardados', claves: ['guardado:deuda:editar'] });
            return;
        }
        P.cambiar(
            (s) => {
                const p = P.crearPago(s, { nombre, emoji: tipo.emoji, categoria: 'cuotas', monto: cuota, frecuencia: 'mensual', dia: +h.dia, medio: h.medio, antes: loDebe ? 'no' : 'si' });
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
            // Corrección v2.3.1: si te descuentan un adelanto de este pago, lo sugerido ya viene con el descuento.
            const o = h.fecha ? M.ocurrenciasIngreso(st, ing, h.fecha, h.fecha)[0] : null;
            h.descuento = o ? o.descuento || 0 : 0;
            h.monto = M.montoCampo(o && !o.llegada ? o.monto : ing.monto);
            h.lugar = ing.lugar;
            h.fechaEsperada = h.fecha;
            h.cuando = h.fecha && h.fecha <= st.hoy ? h.fecha : st.hoy;
        },
        foco: () => '#f-monto',
        html(h) {
            const st = P.st;
            const ing = M.ingreso(st, h.id);
            return {
                titulo: 'Ya llegó',
                cuerpo: `<p class="txt">${emo(ing.emoji, 18)} ${esc(ing.nombre)} ${h.fechaEsperada ? 'del ' + esc(M.fechaLarga(h.fechaEsperada)) : ''}</p>
                    ${campoMonto(h, { label: '¿Cuánto te llegó?', valor: h.monto, ayuda: h.descuento ? `Ya le restamos ${dinero(h.descuento)} de tu adelanto. Escribe lo que llegó de verdad.` : 'Si te descontaron algo, escribe lo que llegó de verdad.' })}
                    ${opciones(h, { campo: 'lugar', label: '¿Dónde llegó?', lista: lugares(st), valor: h.lugar })}
                    ${M.descuentosDe(st, ing.id).length ? `<p class="fila-s">Al guardar, queda pagado solo: ${esc(M.descuentosDe(st, ing.id).map((p) => `${p.nombre} ${dinero(p.monto)}`).join(', '))}.</p>` : ''}
                    ${h.fechaEsperada ? (h.noCayo ? `<div class="pregunta" role="group" aria-labelledby="l-nocayo"><p class="campo-l" id="l-nocayo">¿Qué pasó?</p><div class="chips"><button type="button" class="chip" data-a="cerrarHoja" data-fk="nocayo-todavia">Todavía no (se atrasó)</button><button type="button" class="chip" data-a="ingresoNoLlega" data-fk="nocayo-no">No me va a caer</button></div><p class="fila-s">Si no te va a caer, tu número sigue con lo que tienes y lo de esa fecha se paga con eso.</p></div>` : `<button type="button" class="link link--start" data-a="valor" data-campo="noCayo" data-v="si" data-fk="ing-nocayo">No llegó</button>`) : ''}`,
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
    /** V2-56: el tipo de un ingreso que ya existe (los de antes no lo tenían guardado). */
    function tipoDeIngreso(ing) {
        if (ing.tipoIngreso) return ing.tipoIngreso;
        const n = M.normalizar(ing.nombre || '');
        if (ing.adelanto || /\b(adelanto|anticipo|vale)\b/.test(n)) return 'adelanto';
        if (/quincena 25/.test(n)) return 'q25';
        if (ing.categoria === 'aguinaldo' || /aguinaldo/.test(n)) return 'aguinaldo';
        if (ing.categoria === 'remesa' || /remesa/.test(n)) return 'remesa';
        if (ing.categoria === 'venta' || /\bventas?\b/.test(n)) return 'venta';
        if (ing.categoria === 'extra' || /\b(bono|comision)\b/.test(n)) return 'bono';
        if (ing.categoria === 'salario' || ing.principal || /\b(salario|sueldo|quincena|pago)\b/.test(n)) return 'salario';
        return 'otro';
    }
    P.tipoDeIngreso = tipoDeIngreso;
    /** V2-56: las quincenas de las que se descuenta el adelanto, dentro del mismo formulario. */
    function sincronizarAdelanto(st, h) {
        const ops = opcionesAdelanto(st, { fecha: h.fecha || st.hoy, monto: M.leerMonto(h.monto) || 0 });
        // Mientras la persona no lo cambie: todo el adelanto, de la primera quincena que viene después.
        if (h.adAuto) h.adPartes = ops[0] ? { [ops[0].clave]: M.leerMonto(h.monto) ? M.montoCampo(M.leerMonto(h.monto)) : '' } : {};
        else h.adPartes = Object.fromEntries(Object.entries(h.adPartes || {}).filter(([k]) => ops.some((o) => o.clave === k)));
        return ops;
    }
    function bloqueAdelantoForm(st, h) {
        const ops = sincronizarAdelanto(st, h);
        const p = M.principal(st);
        const cual = p && p.frecuencia === 'quincenal' ? 'quincena' : 'pago';
        if (!ops.length) return `<div class="campo-g"><p class="campo-l">¿De qué ${cual} te lo descuentan?</p><p class="fila-s">No tienes ${cual === 'quincena' ? 'quincenas' : 'pagos'} esperados después de esa fecha. Agrega tu salario como ingreso esperado y aquí lo eliges.</p></div>`;
        const elegidas = ops.filter((o) => h.adPartes[o.clave] !== undefined);
        const chips = ops.map((o) => {
            const on = h.adPartes[o.clave] !== undefined;
            return `<button type="button" class="chip" aria-pressed="${!!(on)}" data-a="valor" data-campo="adElegir" data-v="${esc(o.clave)}" data-fk="ad-${esc(o.fecha)}">${on ? icon('check', 'ico-xs') : ''}<span>${esc(o.t)}</span><span class="chip-s">${esc(dinero(o.monto, { aprox: true }))}</span></button>`;
        }).join('');
        const campos = elegidas.map((o) => campoMonto(h, { campo: 'adParte:' + o.clave, label: elegidas.length > 1 ? `¿Cuánto de ${esc(o.t.charAt(0).toLowerCase() + o.t.slice(1))}?` : '¿Cuánto te descuentan?', valor: h.adPartes[o.clave], id: 'f-ad-' + o.fecha })).join('');
        const suma = elegidas.length > 1 ? `<p class="fila-s" id="ad-suma" aria-live="polite">${esc(textoSumaAdelanto(h.adPartes, M.leerMonto(h.monto) || 0, ops))}</p>` : '';
        return `<div class="campo-g" role="group" aria-labelledby="l-ad"><p class="campo-l" id="l-ad">¿De qué ${cual} te lo descuentan?</p><div class="chips chips--col">${chips}</div>${error(h, 'adElegir', `Elige de qué ${cual} te lo descuentan`)}</div>${campos}${suma}${error(h, 'adMontos', 'Escribe cuánto te descuentan')}<p class="fila-s">Esa ${cual} vendrá con el descuento: no contamos el mismo dinero dos veces.</p>`;
    }
    H.nuevoIngreso = {
        iniciar(h) {
            const st = P.st;
            const ing = h.id ? M.ingreso(st, h.id) : null;
            if (ing) {
                Object.assign(h, { editar: true, nombre: ing.nombre, monto: M.montoCampo(ing.monto), lugar: ing.lugar, principal: !!ing.principal, tipoIng: tipoDeIngreso(ing), ...formFrecuencia(ing) });
                h.tipoIngAntes = h.tipoIng;
                h.adPartes = Object.fromEntries(((ing.adelanto && ing.adelanto.descuentos) || []).map((d) => [d.ingreso + '|' + d.fecha, M.montoCampo(d.monto)]));
                h.adAuto = !Object.keys(h.adPartes).length;
            } else {
                // «Los mismos días que yo» para la pareja: se parte de los días del ingreso principal.
                const p = M.principal(st);
                const base = p && p.frecuencia === 'quincenal' ? { frecuencia: 'quincenal', dias: p.dias } : { frecuencia: 'unico' };
                Object.assign(h, { nombre: '', monto: '', lugar: p ? p.lugar : st.lugares[0] ? st.lugares[0].id : null, principal: false, tipoIng: null, adPartes: {}, adAuto: true, ...formFrecuencia(base) });
                if (h.tipoInicial) H.nuevoIngreso.alValor(h, 'tipoIng', h.tipoInicial);
            }
            h.descuento = false;
            h.dNombre = 'Préstamo por planilla';
            h.dCuota = '';
            h.dDebe = '';
            h.confirmarEliminar = false;
        },
        html(h) {
            const st = P.st;
            const f = h.frecuencia;
            const principal = M.principal(st);
            const repetido = f !== 'unico' && f !== 'fechas';
            const descuentos = h.editar ? M.descuentosDe(st, h.id) : [];
            // V2-38: lo que te descuentan del salario (orden de descuento, préstamo por planilla). No ISSS, AFP ni renta.
            const bloqueDescuento = repetido
                ? `<div class="campo-g"><div class="chips"><button type="button" class="chip" aria-pressed="${!!(h.descuento)}" data-a="valor" data-campo="descuento" data-v="${!h.descuento}" data-fk="ing-descuento">${h.descuento ? icon('check', 'ico-xs') : ''}¿Te descuentan algo del salario?</button></div><p class="fila-s">Por ejemplo, una orden de descuento o un préstamo por planilla.${descuentos.length ? ` Ya tienes: ${esc(descuentos.map((p) => p.nombre).join(', '))}.` : ''}</p>
                    ${h.descuento ? `<div class="ob-det">${campoTexto(h, { campo: 'dNombre', label: '¿Qué te descuentan?', valor: h.dNombre, errorTexto: 'Ponle un nombre' })}${campoMonto(h, { campo: 'dCuota', label: '¿Cuánto cada vez que te pagan?', valor: h.dCuota, id: 'f-dCuota', errorTexto: 'Escribe cuánto te descuentan' })}${campoMonto(h, { campo: 'dDebe', label: '¿Cuánto debes? <span class="opcional">(opcional)</span>', valor: h.dDebe, id: 'f-dDebe' })}<p class="fila-s">Lo que esperas arriba ya es lo que recibes, sin el descuento. Al confirmar tu ingreso, la cuota queda pagada sola: no baja tu libre otra vez y sí baja lo que debes.</p></div>` : ''}</div>`
                : '';
            // V2-56: primero «¿Qué es?»; cada tipo trae su frecuencia. «Adelanto» pregunta aquí mismo de qué quincena se descuenta.
            const tipos = opciones(h, { campo: 'tipoIng', label: '¿Qué es?', lista: D.TIPOS_INGRESO.map((x) => ({ v: x.id, t: x.nombre, e: x.emoji })), valor: h.tipoIng });
            const adelanto = h.tipoIng === 'adelanto' && f === 'unico' ? bloqueAdelantoForm(st, h) : '';
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Ingreso esperado',
                cuerpo: `${h.editar ? '' : '<p class="txt">No suma a tu libre hasta que llegue. Cuando llegue, te ayudo a repartirlo.</p>'}
                    ${tipos}
                    ${campoTexto(h, { campo: 'nombre', label: '¿Cómo se llama?', valor: h.nombre, placeholder: 'Ej. Salario de Luis', errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: h.tipoIng === 'adelanto' ? '¿Cuánto te adelantan?' : '¿Cuánto recibes más o menos?', valor: h.monto, ayuda: h.tipoIng === 'adelanto' ? '' : 'Lo que te llega de verdad, ya con descuentos.' })}
                    ${adelanto ? calendario(h, 'fecha', h.fecha, { label: '¿Qué día te lo dan?' }) : bloqueFrecuencia(h, { esIngreso: true })}
                    ${adelanto}
                    ${opciones(h, { campo: 'lugar', label: '¿Dónde lo recibes?', lista: lugares(st), valor: h.lugar })}
                    ${repetido ? `<div class="chips"><button type="button" class="chip" aria-pressed="${!!(h.principal)}" data-a="valor" data-campo="principal" data-v="${!h.principal}" data-fk="ing-principal">${h.principal ? icon('check', 'ico-xs') : ''}Es mi ingreso principal</button></div><p class="fila-s">${h.principal ? 'Tu libre se calcula hasta que llegue este.' : principal && principal.id !== h.id ? `Tu ingreso principal es «${esc(principal.nombre)}». Este cuenta como estimado para tus próximos pagos.` : 'Sin ingreso principal, ves tu libre hasta fin de mes.'}</p>` : ''}
                    ${bloqueDescuento}
                    ${h.editar ? (h.confirmarEliminar ? confirmarHtml(`¿Ya no esperas «${esc(h.nombre)}»?`, 'Deja de aparecer en Pagos. Lo que ya llegó se queda en tu historial.', 'ingresoEliminar', 'ing-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="ing-eliminar">${icon('trash-2', 'ico-s')}Ya no lo espero</button>`) : ''}`,
                pie: pie2('nuevoIngresoOk', h.editar ? 'Guardar cambios' : 'Guardar ingreso'),
            };
        },
        alValor(h, campo, v) {
            const st = P.st;
            if (campo === 'tipoIng') {
                const t = D.TIPOS_INGRESO.find((x) => x.id === v);
                if (!t) return;
                h.tipoIng = v;
                // El nombre sugerido (si la persona no escribió otro) y la frecuencia de ese tipo.
                if (!(h.nombre || '').trim() || h.nombreAuto) {
                    h.nombre = t.sugerido;
                    h.nombreAuto = true;
                }
                if (t.frecuencia === 'unico') h.frecuencia = 'unico';
                else if (!h.editar && t.frecuencia === 'quincenal') {
                    const p = M.principal(st);
                    Object.assign(h, formFrecuencia(p && p.id !== h.id ? p : { frecuencia: 'quincenal', dias: [15, 30] }));
                } else if (!h.editar && t.frecuencia) h.frecuencia = t.frecuencia;
                // El aguinaldo llega a más tardar el 20 de diciembre; la Quincena 25, en enero. Se sugiere y se cambia en el calendario.
                // Si la fecha la puso otro tipo (no la persona), cambia con el tipo.
                if (t.mes && (!h.fecha || h.fechaAuto)) {
                    const y = Number(st.hoy.slice(0, 4));
                    const fecha = M.fechaDe(y, t.mes, t.dia);
                    h.fecha = fecha >= st.hoy ? fecha : M.fechaDe(y + 1, t.mes, t.dia);
                    h.fechaAuto = true;
                } else if (!t.mes && h.fechaAuto) Object.assign(h, { fecha: '', fechaAuto: false });
                return;
            }
            if (campo === 'adElegir') {
                elegirQuincenaAdelanto(h.adPartes, v, M.leerMonto(h.monto));
                h.adAuto = false;
                return;
            }
            if (campo === 'principal') h.principal = v === 'true';
            else if (campo === 'descuento') h.descuento = v === 'true';
            else if (campo === 'confirmarEliminar') h.confirmarEliminar = v === 'si';
            else if (campo === 'fechas') alternarFecha(h, v);
            else h[campo] = v;
            if (campo === 'fecha') h.fechaAuto = false;
        },
        alCampo(h, campo, el) {
            if (campo.startsWith('adParte:')) {
                h.adPartes[campo.slice(8)] = el.value;
                h.adAuto = false;
                return;
            }
            h[campo] = el.value;
            if (campo === 'nombre') h.nombreAuto = false;
            // Mientras la persona no toque «¿Cuánto te descuentan?», sigue al monto del adelanto.
            if (campo === 'monto' && h.adAuto) {
                const claves = Object.keys(h.adPartes || {});
                if (claves.length === 1) h.adPartes[claves[0]] = M.leerMonto(el.value) ? M.montoCampo(M.leerMonto(el.value)) : '';
            }
        },
        vivo(h) {
            if (h.tipoIng !== 'adelanto') return;
            const suma = document.getElementById('ad-suma');
            if (suma) suma.textContent = textoSumaAdelanto(h.adPartes, M.leerMonto(h.monto) || 0, opcionesAdelanto(P.st, { fecha: h.fecha || P.st.hoy }));
            if (!h.adAuto) return;
            for (const [k, v] of Object.entries(h.adPartes || {})) {
                const el = document.getElementById('f-ad-' + k.split('|')[1]);
                if (el && el !== document.activeElement) el.value = v;
            }
        },
    };
    P.acciones.nuevoIngresoOk = () => {
        const h = P.ui.hoja;
        const st = P.st;
        const monto = M.leerMonto(h.monto);
        const f = h.frecuencia;
        const dCuota = M.leerMonto(h.dCuota);
        const conDescuento = h.descuento && f !== 'unico' && f !== 'fechas';
        // V2-56: un adelanto se guarda con de qué quincena te lo descuentan (si hay alguna que esperar).
        const opsAd = h.tipoIng === 'adelanto' && f === 'unico' ? sincronizarAdelanto(st, h) : [];
        const adElegidas = opsAd.filter((o) => h.adPartes[o.clave] !== undefined);
        const adVacia = adElegidas.find((o) => !M.leerMonto(h.adPartes[o.clave]));
        const faltan = [...(h.nombre.trim() ? [] : ['nombre']), ...(monto ? [] : ['monto']), ...faltanFrecuencia(h), ...(opsAd.length && !adElegidas.length ? ['adElegir'] : []), ...(adVacia ? ['adMontos'] : []), ...(conDescuento && !(h.dNombre || '').trim() ? ['dNombre'] : []), ...(conDescuento && !dCuota ? ['dCuota'] : [])];
        if (!validar(h, faltan)) {
            if (faltan[0] === 'adMontos') document.getElementById('f-ad-' + adVacia.fecha)?.focus();
            return;
        }
        // V2-85: si su fecha de este periodo ya pasó (o es hoy), «¿ya te llegó?» se ve antes de guardar.
        const pasada = pasadaForm(h, { esIngreso: true });
        if (mostrarAntes(h, pasada)) return;
        const espera = !!pasada && h.antesDebe === pasada;
        P.ui.hoja = null;
        const n = M.normalizar(h.nombre);
        const { primera, ...regla } = reglaForm(h);
        if (regla.frecuencia === 'ingreso') Object.assign(regla, { frecuencia: 'quincenal', dias: M.principal(st).dias });
        const datos = { nombre: h.nombre.trim(), monto, ...P.reglaDe(regla), lugar: h.lugar, principal: f !== 'unico' && f !== 'fechas' && !!h.principal };
        datos.extra = !datos.principal;
        const dDebe = M.leerMonto(h.dDebe);
        // V2-56: el tipo se guarda; el adelanto, con de qué quincena(s) te lo descuentan.
        const tipo = D.TIPOS_INGRESO.find((x) => x.id === h.tipoIng) || null;
        const descuentos = adElegidas.map((o) => ({ ingreso: o.ingreso, fecha: o.fecha, monto: M.leerMonto(h.adPartes[o.clave]) }));
        P.cambiar(
            (s) => {
                if (datos.principal) for (const x of s.ingresos) if (x.id !== h.id && x.principal) Object.assign(x, { principal: false, extra: true });
                let id = h.id;
                let x;
                if (h.editar) {
                    x = M.ingreso(s, h.id);
                    for (const k of ['fecha', 'dias', 'dia', 'diaSemana', 'cadaMeses', 'fechas']) delete x[k];
                    Object.assign(x, datos);
                    // La categoría solo cambia si la persona cambió el tipo (un cuchubal sigue siendo cuchubal).
                    if (tipo) x.tipoIngreso = tipo.id;
                    if (tipo && tipo.id !== 'otro' && tipo.id !== h.tipoIngAntes) x.categoria = tipo.categoria;
                } else {
                    const emoji = tipo && tipo.id !== 'otro' ? tipo.emoji : /aguinaldo|quincena 25/.test(n) ? '🎁' : /remesa/.test(n) ? '🌎' : /cuchubal/.test(n) ? '🤝' : /comision|bono/.test(n) ? '📈' : '💼';
                    const categoria = tipo && tipo.id !== 'otro' ? tipo.categoria : /remesa/.test(n) ? 'remesa' : /aguinaldo|quincena 25/.test(n) ? 'aguinaldo' : /cuchubal/.test(n) ? 'cuchubal' : 'otro';
                    id = 'i' + s.seq++;
                    x = { id, emoji, categoria, aprox: true, desde: s.hoy, creado: s.hoy, llegadas: {}, ...datos, ...(tipo ? { tipoIngreso: tipo.id } : {}) };
                    s.ingresos.push(x);
                    // V2-85: «No, todavía no»: se espera desde esa fecha. «Sí» (o sin respuesta): ya está en lo que tienes.
                    if (espera && pasada < s.hoy) {
                        Object.assign(x, { desde: pasada, desdeAntes: true });
                        anotarDebe(s, `i:${id}:${pasada}`);
                    } else if (pasada === s.hoy && !espera) x.llegadas[pasada] = { monto: x.monto, enCuadre: true, antes: true };
                }
                if (descuentos.length) x.adelanto = { descuentos };
                else if (!tipo || tipo.id !== 'adelanto' || f !== 'unico') delete x.adelanto;
                // V2-38: una deuda que se paga sola cada vez que llega este ingreso.
                if (conDescuento) {
                    const p = P.crearPago(s, { nombre: h.dNombre.trim(), emoji: '🏦', categoria: 'cuotas', monto: dCuota, frecuencia: 'ingreso', conIngreso: id, medio: null });
                    Object.assign(p, { descuento: id, tipoDeuda: 'planilla', deuda: dDebe !== null ? { debe: dDebe } : null, avisos: [] });
                }
            },
            { aviso: descuentos.length === 1 ? `Listo: ${P.etiquetaPagoIngreso(descuentos[0].ingreso, descuentos[0].fecha)} vendrá con ${dinero(descuentos[0].monto)} menos` : h.editar ? 'Cambios guardados' : 'Ingreso esperado guardado', claves: [h.editar ? 'guardado:ingresoEditar' : 'guardado:ingresoEsperado', ...(tipo ? ['guardado:ingreso:tipo:' + tipo.id] : []), ...(descuentos.length ? ['guardado:adelanto'] : []), ...(conDescuento ? ['guardado:descuento'] : [])] },
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

    // ================================================================== ELIMINAR SIN DEJAR NADA HUÉRFANO (v2.6.1, QA B-L1, B-M1, B-T1)
    /** Pagos activos que se pagan con alguno de estos medios e ingresos activos que se reciben en este lugar. */
    function ligados(st, { medios: ids = [], lugar = null }) {
        const set = new Set(ids);
        return {
            pagos: st.pagos.filter((p) => p.activo !== false && !p.descuento && set.has(p.medio)),
            ingresos: lugar ? st.ingresos.filter((i) => i.activo !== false && i.lugar === lugar) : [],
        };
    }
    /** El medio que toma su lugar: uno del mismo tipo si hay (otra tarjeta de crédito, otra débito); si no, el efectivo. */
    function medioSustituto(st, fuera, { credito = false } = {}) {
        const vivos = st.medios.filter((m) => !m.oculto && !fuera.includes(m.id) && (m.tarjeta ? M.tarjeta(st, m.tarjeta) : M.lugar(st, m.lugar)));
        return (credito && vivos.find((m) => m.tarjeta)) || vivos.find((m) => m.tarjetaDebito) || vivos.find((m) => m.lugar && M.lugar(st, m.lugar)?.tipo === 'efectivo') || vivos[0] || null;
    }
    const lugarSustituto = (st, fuera) => st.lugares.find((l) => l.id !== fuera && l.tipo === 'banco') || st.lugares.find((l) => l.id !== fuera) || null;
    /** Dentro de la confirmación: con qué se pagan ahora esos pagos y dónde se reciben esos ingresos (ya viene una opción elegida). */
    function reasignarHtml(h, st, lig, { fueraMedios = [], fueraLugar = null }) {
        const nombres = (xs) => P.lista(xs.map((x) => `«${x.nombre}»`));
        const ms = medios(st).filter((m) => !fueraMedios.includes(m.v));
        const ls = lugares(st).filter((l) => l.v !== fueraLugar);
        return `${lig.pagos.length ? opciones(h, { campo: 'nuevoMedio', label: `${nombres(lig.pagos)} ${lig.pagos.length === 1 ? 'se paga' : 'se pagan'} ahora con:`, lista: ms, valor: h.nuevoMedio, columnas: true }) : ''}${lig.ingresos.length ? opciones(h, { campo: 'nuevoLugar', label: `${nombres(lig.ingresos)} ${lig.ingresos.length === 1 ? 'se recibe' : 'se reciben'} ahora en:`, lista: ls, valor: h.nuevoLugar, columnas: true }) : ''}`;
    }
    function prepararReasignar(h, st, lig, { fueraMedios = [], fueraLugar = null, credito = false }) {
        if (lig.pagos.length && !h.nuevoMedio) h.nuevoMedio = medioSustituto(st, fueraMedios, { credito })?.id || null;
        if (lig.ingresos.length && !h.nuevoLugar) h.nuevoLugar = lugarSustituto(st, fueraLugar)?.id || null;
    }
    function aplicarReasignar(s, h, lig) {
        for (const p of lig.pagos) if (h.nuevoMedio && M.pago(s, p.id)) M.pago(s, p.id).medio = h.nuevoMedio;
        for (const i of lig.ingresos) if (h.nuevoLugar && M.ingreso(s, i.id)) M.ingreso(s, i.id).lugar = h.nuevoLugar;
    }

    // ================================================================== LUGARES Y MEDIOS (crear, editar, eliminar)
    const TIPOS_LUGAR = [{ v: 'efectivo', t: 'Efectivo', e: '💵' }, { v: 'banco', t: 'Banco o cooperativa', e: '🏦' }, { v: 'billetera', t: 'Billetera en el celular', e: '📱' }];
    const mediosDeLugar = (st, id) => st.medios.filter((m) => m.lugar === id).map((m) => m.id);
    const ligLugar = (st, id) => ligados(st, { medios: mediosDeLugar(st, id), lugar: id });
    H.lugar = {
        iniciar(h) {
            const st = P.st;
            const l = h.id ? M.lugar(st, h.id) : null;
            // V2-88: al editar, lo mismo que al agregarla (cuánto tienes hoy queda como un cuadre de hoy si lo cambias).
            const debito = l ? st.medios.some((m) => m.lugar === l.id && m.tarjetaDebito && !m.oculto) : true;
            Object.assign(h, l ? { editar: true, clase: l.tipo, nombre: l.nombre, monto: M.montoCampo(M.saldoLugar(st, l.id)), montoAntes: M.saldoLugar(st, l.id), debito, debitoAntes: debito } : { clase: 'banco', nombre: '', monto: '', debito: true });
            h.confirmarEliminar = false;
        },
        html(h) {
            const st = P.st;
            const l = h.editar ? M.lugar(st, h.id) : null;
            return {
                titulo: h.editar ? `Editar ${esc(l.nombre)}` : 'Nuevo lugar',
                cuerpo: `${opciones(h, { campo: 'clase', label: '¿Qué es?', lista: TIPOS_LUGAR, valor: h.clase })}
                    ${campoTexto(h, { campo: 'nombre', label: '¿Cómo se llama?', valor: h.nombre, placeholder: h.clase === 'banco' ? 'Ej. Banco Cuscatlán' : h.clase === 'billetera' ? 'Ej. Billetera del celular' : 'Ej. Alcancía', errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: '¿Cuánto tienes ahí hoy?', valor: h.monto, ayuda: h.editar ? 'Si lo cambias, queda como un cuadre de hoy (lo de antes no se toca).' : 'Más o menos. Es su primer cuadre.', errorTexto: 'Escribe cuánto tienes, aunque sea $0' })}
                    ${h.clase === 'banco' ? `<div class="chips"><button type="button" class="chip" aria-pressed="${!!(h.debito)}" data-a="valor" data-campo="debito" data-v="${!h.debito}" data-fk="lugar-debito">${h.debito ? icon('check', 'ico-xs') : ''}Tengo tarjeta de débito de este banco</button></div>` : ''}
                    ${h.editar ? (st.lugares.length < 2 ? '<p class="fila-s">Es tu único lugar: no se puede eliminar.</p>' : h.confirmarEliminar ? reasignarHtml(h, st, ligLugar(st, l.id), { fueraMedios: mediosDeLugar(st, l.id), fueraLugar: l.id }) + confirmarHtml(`¿Eliminar ${esc(l.nombre)}?`, `Sus ${dinero(M.saldoLugar(st, l.id))} dejan de contar en «Tienes». Lo que anotaste se queda en tu historial.`, 'lugarEliminar', 'lugar-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="lugar-eliminar">${icon('trash-2', 'ico-s')}Eliminar lugar</button>`) : ''}`,
                pie: pie2('lugarOk', h.editar ? 'Guardar cambios' : 'Agregar lugar', { fk: 'lugar-ok' }),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'debito') h.debito = v === 'true';
            else if (campo === 'confirmarEliminar') {
                h.confirmarEliminar = v === 'si';
                if (h.confirmarEliminar) prepararReasignar(h, P.st, ligLugar(P.st, h.id), { fueraMedios: mediosDeLugar(P.st, h.id), fueraLugar: h.id });
            } else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.lugarOk = () => {
        const h = P.ui.hoja;
        const nombre = (h.nombre || '').trim();
        const monto = M.leerMonto(h.monto);
        if (!validar(h, [...(nombre ? [] : ['nombre']), ...(monto !== null ? [] : ['monto'])])) return;
        P.ui.hoja = null;
        if (h.editar) {
            P.cambiar((s) => {
                const l = M.lugar(s, h.id);
                // V2-88: qué es, cómo se llama, cuánto tienes hoy (un cuadre de hoy) y su tarjeta de débito.
                l.nombre = nombre;
                if (h.clase !== l.tipo) Object.assign(l, { tipo: h.clase, emoji: TIPOS_LUGAR.find((x) => x.v === h.clase).e });
                if (monto !== h.montoAntes) {
                    const r = P.registrar(s, { tipo: 'cuadre', fecha: s.hoy, lugar: l.id, monto, esperado: M.saldoLugar(s, l.id) });
                    l.cuadre = { fecha: s.hoy, seq: r.seq, monto };
                }
                const debitos = s.medios.filter((m) => m.lugar === l.id && m.tarjetaDebito);
                if (h.clase === 'banco' && h.debito && !h.debitoAntes) {
                    if (debitos.length) for (const m of debitos) delete m.oculto;
                    else s.medios.push({ id: 'm' + s.seq++, nombre: 'Débito ' + nombre.replace(/^banco\s+/i, ''), emoji: '🏦', lugar: l.id, tarjetaDebito: true });
                } else if ((!h.debito || h.clase !== 'banco') && h.debitoAntes) {
                    // Si un pago la usa, se queda (se cambia en «Con qué pagas»).
                    for (const m of debitos) if (!s.pagos.some((p) => p.activo !== false && p.medio === m.id)) m.oculto = true;
                }
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
        const lig = ligLugar(P.st, h.id);
        prepararReasignar(h, P.st, lig, { fueraMedios: mediosDeLugar(P.st, h.id), fueraLugar: h.id });
        P.cambiar((s) => {
            aplicarReasignar(s, h, lig);
            s.lugares = s.lugares.filter((x) => x.id !== h.id);
            for (const m of s.medios) if (m.lugar === h.id) m.oculto = true;
        }, { aviso: `Eliminaste ${l.nombre}`, claves: ['guardado:lugarEliminar'] });
        if (P.ui.stack.at(-1)?.tipo === 'lugar') P.atras();
    };
    /** El efectivo no es débito, transferencia ni billetera: al editarlo no se pregunta qué es. */
    const esEfectivoMedio = (m) => m.id === 'efectivo' || m.emoji === '💵';
    const TIPOS_MEDIO = [{ v: 'debito', t: 'Tarjeta de débito', e: '🏦' }, { v: 'transferencia', t: 'Transferencia', e: '🔁' }, { v: 'billetera', t: 'App o billetera', e: '📱' }, { v: 'credito', t: 'Tarjeta de crédito', e: '💳' }];
    H.medio = {
        iniciar(h) {
            const st = P.st;
            const m = h.id ? M.medio(st, h.id) : null;
            const claseDe = (x) => (x.tarjeta ? 'credito' : x.tarjetaDebito ? 'debito' : x.emoji === '📱' ? 'billetera' : 'transferencia');
            Object.assign(h, m ? { editar: true, nombre: m.nombre, lugar: m.lugar || null, clase: claseDe(m), claseAntes: claseDe(m) } : { clase: 'debito', nombre: '', lugar: (st.lugares.find((l) => l.tipo === 'banco') || st.lugares[0]).id });
            h.confirmarEliminar = false;
        },
        html(h) {
            const st = P.st;
            const m = h.editar ? M.medio(st, h.id) : null;
            const credito = h.clase === 'credito';
            return {
                titulo: h.editar ? `Editar ${esc(m.nombre)}` : 'Nuevo medio de pago',
                cuerpo: `${h.editar ? (m && (m.tarjeta || esEfectivoMedio(m)) ? '' : opciones(h, { campo: 'clase', label: '¿Qué es?', lista: TIPOS_MEDIO.filter((x) => x.v !== 'credito'), valor: h.clase })) : opciones(h, { campo: 'clase', label: '¿Qué es?', lista: TIPOS_MEDIO, valor: h.clase })}
                    ${credito && !h.editar ? '<p class="txt">Las tarjetas de crédito se agregan con su corte y su día de pago.</p>' : `${campoTexto(h, { campo: 'nombre', label: '¿Cómo se llama?', valor: h.nombre, placeholder: 'Ej. Débito Cuscatlán', errorTexto: 'Ponle un nombre' })}
                    ${m && m.tarjeta ? '<p class="fila-s">Es una tarjeta de crédito: su corte y pago se editan en su ficha.</p>' : opciones(h, { campo: 'lugar', label: '¿De dónde sale el dinero?', lista: lugares(st), valor: h.lugar, errorTexto: 'Elige de dónde sale' })}`}
                    ${h.editar && !(m.id === 'efectivo') ? (h.confirmarEliminar ? reasignarHtml(h, st, ligados(st, { medios: [m.id] }), { fueraMedios: [m.id] }) + confirmarHtml(`¿Eliminar ${esc(m.nombre)}?`, 'Ya no aparece para elegir. Lo que pagaste con él se queda en tu historial.', 'medioEliminar', 'medio-eliminar') : `<button type="button" class="link link--peligro" data-a="valor" data-campo="confirmarEliminar" data-v="si" data-fk="medio-eliminar">${icon('trash-2', 'ico-s')}Eliminar medio</button>`) : ''}`,
                pie: credito && !h.editar ? pie2('medioCredito', 'Seguir', { fk: 'medio-ok' }) : pie2('medioOk', h.editar ? 'Guardar cambios' : 'Agregar medio', { fk: 'medio-ok' }),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'confirmarEliminar') {
                h.confirmarEliminar = v === 'si';
                if (h.confirmarEliminar) prepararReasignar(h, P.st, ligados(P.st, { medios: [h.id] }), { fueraMedios: [h.id] });
            } else h[campo] = v;
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
                    if (!x.tarjeta && !esEfectivoMedio(x) && h.clase !== h.claseAntes) {
                        // V2-88: qué es (débito, transferencia o billetera). El efectivo es efectivo.
                        x.emoji = TIPOS_MEDIO.find((y) => y.v === h.clase).e;
                        if (h.clase === 'debito') x.tarjetaDebito = true;
                        else delete x.tarjetaDebito;
                    }
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
        const lig = ligados(P.st, { medios: [h.id] });
        prepararReasignar(h, P.st, lig, { fueraMedios: [h.id] });
        P.cambiar((s) => {
            aplicarReasignar(s, h, lig);
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
        if (f === 'mensual') return { frecuencia: 'mensual', dia: Number(h.dia) };
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
            // v2.6.6 (V2-85): si la de este mes ya pasó, en vez de «¿Ya venció y no lo has pagado?» se pregunta abajo.
            const prox = h.dia && M.proximoDia(st.hoy, Number(h.dia)) > st.hoy ? M.proximoDia(st.hoy, Number(h.dia)) : null;
            detalle = selectorDia(h, 'dia', h.dia, '¿Qué día del mes? (29, 30 o 31: en meses cortos, el último día)') + (prox && !pasadaForm(h, { esIngreso }) ? `<p class="fila-s">Próxima vez: <strong>${esc(M.capital(M.conDia(prox)))}</strong></p>` : '');
        } else if (f === 'trimestral' || f === 'anual') detalle = calendario(h, 'fecha', h.fecha, { label: '¿Cuándo toca la próxima vez?', ayuda: f === 'anual' ? 'Se repite cada año ese día.' : 'Se repite cada 3 meses ese día.' });
        else if (f === 'fechas') detalle = calendario(h, 'fechas', null, { label: 'Toca las fechas (puedes elegir varias)', multiple: h.fechas || [] });
        const pasada = pasadaForm(h, { esIngreso });
        if (!pasada) h.antesVisto = null;
        const regla = pasada ? reglaForm(h) : null;
        const fem = esIngreso && (f === 'quincenal' || f === 'catorcenal' || /^(quincena|catorcena|remesa|venta)/i.test(h.nombre || '') || ['remesa', 'venta'].includes(h.tipoIng));
        return `${opciones(h, { campo: 'frecuencia', label: '¿Cada cuánto?', lista, valor: f })}${detalle}${pasada ? preguntaAntes(h, pasada, { ingreso: esIngreso, fem, mensual: !esIngreso && (f === 'mensual' || f === 'trimestral' || f === 'anual'), siguiente: siguienteDe(st, regla, pasada) }) : ''}`;
    }
    /**
     * V2-85: la fecha de este periodo que ya pasó para lo que dice el formulario (se pregunta si ya se pagó o llegó). Un
     * pago de una vez u «Otras fechas» no se pregunta: se eligió esa fecha. Al editar un pago, solo si el cambio la trae
     * (`nuevasPasadas`); al editar un ingreso, no se pregunta.
     */
    function pasadaForm(h, { esIngreso = false } = {}) {
        const st = P.st;
        if (faltanFrecuencia(h).length || h.frecuencia === 'fechas' || (!esIngreso && h.frecuencia === 'unico') || (esIngreso && (h.editar || h.tipoIng === 'adelanto'))) return null;
        const regla = reglaForm(h);
        const pasada = M.pasadaDelPeriodo(st, regla);
        if (!pasada || !h.editar) return pasada;
        const p = M.pago(st, h.id);
        return p && nuevasPasadas(st, p, regla).includes(pasada) ? pasada : null;
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
    /** V2-66: las facturas de servicios (su cuadro en «+ Pago»): luz, agua, internet, teléfono y cable. */
    const esServicio = (f) => f.categoria === 'servicios' || f.categoria === 'telefono';
    P.esCuchubal = (p) => !!p && (esCuchubal(p) || p.categoria === 'cuchubal');
    /** El turno de un cuchubal: el ingreso ligado o, en lo guardado antes de la v2.6.2, el próximo «turno del cuchubal». */
    P.turnoCuchubal = (st, p) => {
        const ligado = p.turno ? M.ingreso(st, p.turno) : null;
        if (ligado && ligado.activo !== false) return ligado;
        return st.ingresos.find((i) => i.activo !== false && i.frecuencia === 'unico' && /cuchubal/i.test(i.nombre) && i.fecha >= st.hoy) || null;
    };
    /**
     * El turno del cuchubal es un ingreso esperado de una vez. V2-88: al editar el cuchubal se cambia, se agrega o se quita
     * (si ya llegó, se deja como está: es historia).
     */
    function guardarTurno(s, p, fecha, monto, turnoId) {
        const ing = turnoId ? M.ingreso(s, turnoId) : null;
        const llego = !!(ing && ing.llegadas && ing.llegadas[ing.fecha]);
        if (ing && !llego) {
            if (fecha && monto) Object.assign(ing, { fecha, monto });
            else {
                ing.activo = false;
                if (p.turno === ing.id) delete p.turno;
            }
            return;
        }
        if (!fecha || !monto || llego) return;
        const id = 'i' + s.seq++;
        s.ingresos.push({ id, nombre: 'Tu turno del cuchubal', emoji: '🤝', categoria: 'cuchubal', monto, aprox: false, frecuencia: 'unico', fecha, lugar: (s.lugares.find((l) => l.id === 'efectivo') || s.lugares[0]).id, principal: false, extra: true, desde: s.hoy, llegadas: {} });
        p.turno = id;
    }
    /** V2-75: «¿Cuándo te toca recibir?» para un cuchubal que no lo tiene (lo guardado antes se completa después). */
    H.turnoCuchubal = {
        iniciar(h) {
            h.turno = null;
            h.monto = '';
        },
        foco: () => '#hoja-t',
        html(h) {
            const p = M.pago(P.st, h.id);
            return {
                titulo: 'Tu turno del cuchubal',
                cuerpo: `<p class="txt">Aportas ${dinero(p.monto)} ${esc(P.textoFrecuencia(p).toLowerCase())}. Tu turno es un ingreso esperado: suma a tu libre el día que llega.</p>
                    ${calendario(h, 'turno', h.turno, { label: '¿Cuándo te toca recibir?', min: P.st.hoy })}
                    ${campoMonto(h, { campo: 'monto', label: '¿Cuánto recibes ese día?', valor: h.monto, errorTexto: 'Escribe cuánto recibes' })}`,
                pie: pie2('turnoCuchubalOk', 'Guardar turno', { fk: 'turno-ok' }),
            };
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
    };
    P.acciones.turnoCuchubalOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        if (!validar(h, [...(h.turno ? [] : ['turno']), ...(monto ? [] : ['monto'])])) return;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const id = 'i' + s.seq++;
                s.ingresos.push({ id, nombre: 'Tu turno del cuchubal', emoji: '🤝', categoria: 'cuchubal', monto, aprox: false, frecuencia: 'unico', fecha: h.turno, lugar: (s.lugares.find((l) => l.id === 'efectivo') || s.lugares[0]).id, principal: false, extra: true, desde: s.hoy, llegadas: {} });
                M.pago(s, h.id).turno = id;
            },
            { aviso: 'Tu turno quedó anotado', claves: ['guardado:turnoCuchubal'] },
        );
    };
    H.nuevoPago = {
        iniciar(h) {
            const st = P.st;
            if (h.id) {
                const p = M.pago(st, h.id);
                // V2-88: lo mismo que al crearlo: también el turno del cuchubal y si se cobra solo.
                const turno = P.esCuchubal(p) ? P.turnoCuchubal(st, p) : null;
                Object.assign(h, { nombre: p.nombre, emoji: p.emoji, categoria: p.categoria, monto: M.montoCampo(p.monto), estimado: p.estimado, medio: p.medio, hasta: p.hasta || '', tipoPago: p.tipoPago || null, automatico: !!p.automatico, turno: turno ? turno.fecha : '', turnoMonto: turno ? M.montoCampo(turno.monto) : '', turnoId: turno ? turno.id : null, editar: true, ...formFrecuencia(p) });
            } else Object.assign(h, { nombre: '', emoji: '🧾', categoria: 'otros', monto: '', estimado: false, frecuencia: 'mensual', qModo: '15-30', d1: '', d2: '', dia: null, diaSemana: 5, fecha: '', fechas: [], hasta: '', turno: '', turnoMonto: '', automatico: false, medio: st.medios[0] ? st.medios[0].id : null });
        },
        html(h) {
            const st = P.st;
            const cuchubal = esCuchubal(h);
            const suscripcion = h.tipoPago === 'suscripcion';
            const credito = st.medios.find((m) => m.tarjeta && !m.oculto);
            return {
                titulo: h.editar ? `Editar ${esc(h.nombre)}` : 'Nuevo pago',
                cuerpo: `${h.editar ? '' : `<div class="opciones-grandes opciones-grandes--2"><button type="button" class="opcion-g" data-a="valor" data-campo="frecuente" data-v="prestamo" data-fk="np-cuota">${caja('🏦')}<span class="opcion-g-txt"><span class="opcion-g-t">Cuota de un préstamo</span><span class="fila-s">Casa comercial, préstamo o vivienda</span></span></button><button type="button" class="opcion-g" aria-pressed="${!!(suscripcion)}" data-a="valor" data-campo="tipoPago" data-v="${suscripcion ? '' : 'suscripcion'}" data-fk="np-suscripcion">${caja('📺')}<span class="opcion-g-txt"><span class="opcion-g-t">Suscripción</span><span class="fila-s">Netflix, Spotify, celular, gimnasio…</span></span>${suscripcion ? icon('circle-check', 'ico-ok') : ''}</button><button type="button" class="opcion-g" aria-pressed="${h.caja === 'servicio'}" data-a="valor" data-campo="caja" data-v="servicio" data-fk="np-servicios">${caja('💡')}<span class="opcion-g-txt"><span class="opcion-g-t">Facturas de servicios</span><span class="fila-s">Luz, agua, internet, teléfono, cable</span></span>${h.caja === 'servicio' ? icon('circle-check', 'ico-ok') : ''}</button><button type="button" class="opcion-g" aria-pressed="${h.caja === 'otro'}" data-a="valor" data-campo="caja" data-v="otro" data-fk="np-otro">${caja('🧾')}<span class="opcion-g-txt"><span class="opcion-g-t">Otro pago</span><span class="fila-s">Alquiler, colegio, cuchubal u otro</span></span>${h.caja === 'otro' ? icon('circle-check', 'ico-ok') : ''}</button></div>`}
                    ${h.editar ? '' : suscripcion ? opciones(h, { campo: 'servicio', label: '¿Cuál?', lista: D.SUSCRIPCIONES.map((x) => ({ v: x.id, t: x.nombre, e: x.emoji })), valor: h.servicio || '' }) : opciones(h, { campo: 'frecuente', label: h.caja === 'servicio' ? '¿Cuál factura?' : '¿Cuál pago?', lista: D.PAGOS_FRECUENTES.filter((f) => !f.deuda && (h.caja === 'servicio' ? esServicio(f) : h.caja === 'otro' ? !esServicio(f) : true)).map((f) => ({ v: f.id, t: f.nombre, e: f.emoji })), valor: h.frecuente || '' })}
                    ${campoTexto(h, { campo: 'nombre', label: '¿Qué pagas?', valor: h.nombre, placeholder: h.caja === 'servicio' ? 'Ej. Luz' : 'Ej. Colegio', errorTexto: 'Ponle un nombre' })}
                    ${campoMonto(h, { label: cuchubal ? '¿Cuánto aportas cada vez?' : '¿Cuánto pagas?', valor: h.monto })}
                    <div class="chips"><button type="button" class="chip" aria-pressed="${!!(h.estimado)}" data-a="valor" data-campo="estimado" data-v="${!h.estimado}" data-fk="estimado">${h.estimado ? icon('check', 'ico-xs') : ''}Varía (es un estimado)</button></div>
                    ${bloqueFrecuencia(h, { solo: suscripcion ? ['mensual', 'anual'] : null })}
                    ${suscripcion && credito ? `<p class="fila-s">Con tarjeta de crédito, el cobro baja tu libre el día que se hace (V2-07).</p>` : ''}
                    ${cuchubal ? `${calendario(h, 'hasta', h.hasta || null, { label: '¿Hasta cuándo aportas? <span class="opcional">(opcional)</span>', min: st.hoy })}${calendario(h, 'turno', h.turno || null, { label: '¿Cuándo te toca recibir? <span class="opcional">(opcional)</span>', min: st.hoy, ayuda: 'Tu turno aparece como ingreso esperado.' })}${h.turno ? campoMonto(h, { campo: 'turnoMonto', label: '¿Cuánto recibes ese día?', valor: h.turnoMonto, id: 'f-turnoMonto' }) : ''}` : ''}
                    ${opciones(h, { campo: 'medio', label: '¿Con qué lo pagas?', lista: medios(st), valor: h.medio })}
                    <div class="chips"><button type="button" class="chip" aria-pressed="${!!h.automatico}" data-a="valor" data-campo="automatico" data-v="${!h.automatico}" data-fk="np-automatico">${h.automatico ? icon('check', 'ico-xs') : ''}Se cobra solo en esa tarjeta o cuenta</button></div>
                    ${h.duplicado && M.pago(st, h.duplicado) ? preguntaDuplicado(h, M.pago(st, h.duplicado), 'nuevoPagoDup') : ''}`,
                pie: pie2('nuevoPagoOk', h.editar ? 'Guardar cambios' : 'Guardar pago'),
            };
        },
        alValor(h, campo, v) {
            // V2-82: si cambia algo, se vuelve a revisar al guardar.
            h.duplicado = null;
            if (campo === 'caja') {
                h.caja = h.caja === v ? null : v;
                if (h.caja) h.tipoPago = null;
                return;
            }
            if (campo === 'frecuente') {
                const f = D.PAGOS_FRECUENTES.find((y) => y.id === v);
                if (f && !f.deuda) h.caja = esServicio(f) ? 'servicio' : 'otro';
                // V2-24: la cuota de un préstamo abre el MISMO formulario que Mi dinero.
                if (f.deuda) {
                    setTimeout(() => {
                        P.ui.hoja = null;
                        P.abrirHoja('nuevaDeuda', { tipoInicial: f.deuda });
                        P.emitir('deuda:desdePagos');
                    });
                    return;
                }
                // V2-36: el cuchubal puede ser de cualquier frecuencia; se sugiere quincenal. V2-83: el elegido se ve marcado.
                Object.assign(h, { frecuente: v, nombre: f.nombre, emoji: f.emoji, categoria: f.categoria, estimado: !!f.variable, frecuencia: f.id === 'cuchubal' ? 'quincenal' : f.semanal ? 'semanal' : 'mensual' });
            } else if (campo === 'tipoPago') {
                // V2-47: una suscripción es mensual o anual y se paga, si tienes, con tu tarjeta de crédito.
                h.tipoPago = v || null;
                if (h.tipoPago) h.caja = null;
                if (v) {
                    const credito = P.st.medios.find((m) => m.tarjeta && !m.oculto);
                    Object.assign(h, { frecuencia: 'mensual', categoria: 'suscripciones', emoji: '📺', estimado: false, medio: credito ? credito.id : h.medio });
                } else Object.assign(h, { categoria: 'otros', emoji: '🧾' });
            } else if (campo === 'servicio') {
                const x = D.SUSCRIPCIONES.find((y) => y.id === v);
                Object.assign(h, { servicio: v, nombre: v === 'otra' ? '' : x.nombre, emoji: x.emoji });
            } else if (campo === 'estimado') h.estimado = v === 'true';
            else if (campo === 'automatico') h.automatico = v === 'true';
            else if (campo === 'fechas') alternarFecha(h, v);
            else if (campo === 'hasta' || campo === 'turno') h[campo] = h[campo] === v ? '' : v;
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
            // V2-82: lo que se escribe se revisa de nuevo al guardar; V2-83: otro nombre deja de marcar el frecuente.
            if (h.duplicado) {
                h.duplicado = null;
                const q = document.querySelector('.pregunta--dup');
                if (q) q.remove();
            }
            if (campo === 'nombre' && h.frecuente) {
                const f = D.PAGOS_FRECUENTES.find((y) => y.id === h.frecuente);
                if (f && M.normalizar(f.nombre) !== M.normalizar(el.value)) {
                    h.frecuente = null;
                    const b = document.querySelector(`[data-fk="op-frecuente-${f.id}"]`);
                    if (b) {
                        b.setAttribute('aria-pressed', 'false');
                        b.querySelector('.ico-xs')?.remove();
                    }
                }
            }
        },
    };
    H.editarPago = { ...H.nuevoPago };
    /** V2-82: «Ver el que tengo» (su ficha, sin crear nada) o «Sí, es otro» (se guarda). */
    P.acciones.nuevoPagoDup = (d) => {
        const h = P.ui.hoja;
        if (!h) return;
        if (d.v === 'ver') {
            const id = h.duplicado;
            P.ui.hoja = null;
            P.render();
            if (id) P.abrir('pago', id);
            P.emitir('pago:duplicado:ver');
            return;
        }
        h.dupOk = true;
        P.acciones.nuevoPagoOk();
    };
    P.acciones.nuevoPagoOk = () => {
        const h = P.ui.hoja;
        const monto = M.leerMonto(h.monto);
        const turnoMonto = M.leerMonto(h.turnoMonto);
        const faltan = [...(h.nombre.trim() ? [] : ['nombre']), ...(monto ? [] : ['monto']), ...faltanFrecuencia(h), ...(h.turno && !turnoMonto ? ['turnoMonto'] : [])];
        if (!validar(h, faltan)) return;
        const regla = reglaForm(h);
        // Una factura con nombre propio dentro de «Facturas de servicios» es de esa categoría.
        if (h.caja === 'servicio' && (!h.categoria || h.categoria === 'otros')) h.categoria = 'servicios';
        // V2-82: antes de crear (o de cambiar) un pago parecido a otro que ya tienes, se pregunta.
        const parecido = h.dupOk ? null : M.pagoParecido(P.st, { nombre: h.nombre.trim(), categoria: h.categoria, dia: regla.dia, monto }, h.editar ? h.id : null);
        if (parecido) {
            h.duplicado = parecido.id;
            P.render({ foco: '#dup-t' });
            // La pregunta se lleva a la vista dentro de la hoja (el marco de la app no se mueve).
            const q = document.querySelector('.pregunta--dup');
            const c = q && q.closest('.hoja-c');
            if (c) c.scrollTop += q.getBoundingClientRect().top - c.getBoundingClientRect().top - 16;
            P.emitir('pago:duplicado');
            return;
        }
        // V2-85: si su fecha de este periodo ya pasó, «¿ya lo pagaste?» se ve antes de guardar.
        const pasada = pasadaForm(h);
        if (mostrarAntes(h, pasada)) return;
        const debe = !!pasada && h.antesDebe === pasada;
        P.ui.hoja = null;
        if (h.editar) {
            P.cambiar((s) => {
                const p = M.pago(s, h.id);
                const nuevas = nuevasPasadas(s, p, regla);
                for (const k of ['fecha', 'dias', 'dia', 'diaSemana', 'cadaMeses', 'fechas', 'conIngreso']) delete p[k];
                Object.assign(p, { nombre: h.nombre.trim(), monto, estimado: h.estimado, medio: h.medio, ...P.reglaDe(regla) });
                if (esCuchubal(h) && h.hasta) p.hasta = h.hasta;
                else delete p.hasta;
                // V2-88: lo mismo que al crearlo.
                if (h.automatico) p.automatico = true;
                else delete p.automatico;
                if (esCuchubal(h)) guardarTurno(s, p, h.turno, turnoMonto, h.turnoId);
                P.reubicarHechos(s, p);
                // V2-85: lo que ya pasó y solo aparece por el cambio no se cuenta (salvo «No, todavía lo debo» en la de este periodo).
                for (const f of nuevas) {
                    if (debe && f === pasada) {
                        if (f < s.hoy) anotarDebe(s, `p:${p.id}:${f}`);
                    } else p.hechos[f] = { estado: 'antes' };
                }
            }, { aviso: 'Cambios guardados', claves: ['guardado:pagoEditar'] });
            return;
        }
        P.cambiar(
            (s) => {
                const pc = P.crearPago(s, { nombre: h.nombre.trim(), emoji: h.emoji, categoria: h.categoria, monto, estimado: h.estimado, medio: h.medio, hasta: esCuchubal(h) && h.hasta ? h.hasta : null, tipoPago: h.tipoPago || undefined, ...regla, antes: debe ? 'no' : 'si' });
                if (h.automatico) pc.automatico = true;
                // El turno del cuchubal = un ingreso esperado de una vez.
                if (esCuchubal(h)) guardarTurno(s, pc, h.turno, turnoMonto, null);
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
            // V2-54: la tarjeta del primer día pide aquí su día de corte.
            h.sinCorte = info.sinCorte;
            h.corte = '';
            h.anotado = info.pendiente ? info.pendiente.anotado : 0;
            h.motivo = null;
            h.opcion = 'total';
            h.otro = '';
            h.ayuda = false;
        },
        foco: (h) => (h.paso === 1 ? (h.sinCorte ? '#f-corte' : '#f-total') : '#hoja-t'),
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
                    cuerpo: `${h.sinCorte ? `<p class="txt">Vence el ${esc(M.fechaLarga(pend.vence))}.</p>${campoDia(h, 'corte', 'Día de corte', 'Está en tu estado de cuenta')}` : `<p class="txt">Corte del ${esc(M.fechaLarga(pend.corte))}. Vence el ${esc(M.fechaLarga(pend.vence))}.</p>`}
                        <p class="campo-l">¿Cuánto te salió?</p>
                        ${campoMonto(h, { campo: 'total', label: '¿Cuánto es el pago de contado (total)?', valor: h.total, id: 'f-total', errorTexto: 'Escribe el pago de contado' })}
                        ${campoMonto(h, { campo: 'minimo', label: '¿Cuánto es el pago mínimo?', valor: h.minimo, id: 'f-minimo', errorTexto: minimo !== null && total !== null && minimo > total ? 'El mínimo no puede ser mayor que el total' : 'Escribe el pago mínimo' })}
                        <button type="button" class="link" aria-expanded="${!!(h.ayuda)}" aria-controls="ec-ayuda" data-a="valor" data-campo="ayuda" data-v="${!h.ayuda}" data-fk="ec-ayuda-b">¿Dónde lo encuentro?</button>
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
                        ${[['total', 'Todo', total, 'No te cobran intereses por estas compras.'], ['minimo', 'El mínimo', minimo, `Los ${dinero(resto)} que quedan siguen como deuda y generan intereses.`], ['otro', 'Otro monto', null, 'El que tú decidas, hasta el total.']]
                            .map(([v, t, m, s]) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.opcion === v}" data-a="valor" data-campo="opcion" data-v="${v}" data-fk="ec-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${t}${m !== null ? ` · ${dinero(m)}` : ''}</span><span class="fila-s">${s}</span></span>${h.opcion === v ? icon('circle-check', 'ico-ok') : ''}</button>`)
                            .join('')}
                    </div>
                    ${h.opcion === 'otro' ? `${campoMonto(h, { campo: 'otro', label: '¿Cuánto?', valor: h.otro, id: 'f-otro', errorTexto: M.leerMonto(h.otro) > total ? `Puede ser hasta el total (${dinero(total)})` : 'Escribe cuánto vas a pagar' })}<div id="ec-otro-nota" aria-live="polite">${notaMinimo(M.leerMonto(h.otro), minimo)}</div>` : ''}
                    <div class="nota nota--consejo" role="note">${icon('lightbulb')}<p><strong>Un consejo:</strong> pagar el total es lo que menos te cuesta. Si este mes no se puede, pagar más que el mínimo ya ayuda. Tú decides; aquí lo verás claro.</p></div>
                    <p class="fila-s">${(() => {
                        // v2.6.7 (V2-87): si reemplaza a lo que pagas normalmente, sigue con el mismo ingreso.
                        const conQue = info.conIngreso > 0 && (info.ult.inicial ? info.usual > 0 : info.ult.deEstimado) ? P.fuentesTarjeta(info) : '';
                        return conQue ? `Se paga con ${esc(conQue)}, como lo que pagas normalmente. Lo que ya anotaste en compras sigue saliendo de lo que tienes.` : 'Lo que decidas pagar baja tu libre desde hoy.';
                    })()}</p>`,
                pie: pie2('ecGuardar', 'Guardar estado de cuenta'),
            };
        },
        alValor(h, campo, v) {
            if (campo === 'ayuda') h.ayuda = v === 'true';
            else h[campo] = v;
        },
        alCampo(h, campo, el) {
            h[campo] = el.value;
        },
        vivo(h) {
            if (h.opcion === 'otro') region('ec-otro-nota', notaMinimo(M.leerMonto(h.otro), M.leerMonto(h.minimo)));
        },
    };
    /** v2.7 (D-6, F13): se puede pagar menos del mínimo; se dice cuánto falta para el mínimo, sin culpa. */
    function notaMinimo(monto, minimo, pagado = 0) {
        if (monto === null || !(minimo > 0) || monto + pagado >= minimo) return '';
        return `<div class="nota nota--atencion" role="note">${icon('info')}<p><strong>Te faltan ${dinero(minimo - pagado - monto)} para el mínimo.</strong> Puedes guardarlo igual.</p></div>`;
    }
    P.notaMinimo = notaMinimo;
    P.acciones.ecSiguiente = () => {
        const h = P.ui.hoja;
        const total = M.leerMonto(h.total);
        const minimo = M.leerMonto(h.minimo);
        if (h.paso === 1) {
            // v2.7 (F14): un estado de cuenta de $0 vale (vacío no). (F13): el mínimo no puede ser mayor que el total.
            const faltan = [...(h.sinCorte && !diaValido(h.corte) ? ['corte'] : []), ...(total !== null ? [] : ['total']), ...(minimo !== null && (total === null || minimo <= total) ? [] : ['minimo'])];
            if (!validar(h, faltan)) return;
            h.intento = false;
            // v2.7 (F14): con $0 no hay nada que decidir: se guarda y la tarjeta espera su siguiente corte.
            if (total === 0) return P.acciones.ecGuardar();
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
        const aPagar = total === 0 ? 0 : h.opcion === 'total' ? total : h.opcion === 'minimo' ? minimo : M.leerMonto(h.otro);
        // v2.7 (F13): «Otro monto» puede ser menos que el mínimo (se avisa), nunca $0 ni más que el total. (F14): con $0, nada.
        if (!validar(h, total === 0 || (h.opcion === 'otro' ? aPagar > 0 && aPagar <= total : aPagar !== null) ? [] : ['otro'])) return;
        P.ui.hoja = null;
        P.cambiar(
            (s) => {
                const t = M.tarjeta(s, h.id);
                const info = M.tarjetaInfo(s, t);
                const pend = info.pendiente;
                // V2-54: con su día de corte, la tarjeta del primer día ya es como cualquier otra.
                if (h.sinCorte && !t.corte) t.corte = +h.corte;
                const corte = pend.corte || M.ultimoDia(s.hoy, t.corte);
                const dif = h.anotado ? total - h.anotado : 0;
                // v2.7 (F10): el estado guarda en qué orden se anotó: un abono del mismo día del corte anotado después es para él.
                const e = { corte, total, minimo, aPagar, opcion: total === 0 ? 'total' : h.opcion, vence: pend.vence, anotado: h.anotado, diferencia: dif > 0 ? dif : 0, motivo: h.motivo, seq: s.seq++ };
                // v2.6.7 (V2-87): reemplaza a lo que pagas normalmente: el monto real sigue con el mismo ingreso («Lo pagas con»).
                if (info.ult.inicial && info.usual > 0) e.deEstimado = true;
                if (t.estados.at(-1).inicial) t.estados.pop();
                t.estados.push(e);
                if (dif > 0) {
                    P.registrar(s, { tipo: 'cargoTarjeta', fecha: corte, monto: dif, tarjeta: t.id, motivo: h.motivo || 'nose', nombre: t.nombre + ' sin detalle' });
                    if (h.motivo === 'intereses') t.interesesAnio = (t.interesesAnio || 0) + dif;
                }
            },
            { aviso: total === 0 ? 'Estado de cuenta guardado: este mes no debes nada' : 'Estado de cuenta guardado', claves: ['guardado:estado', 'guardado:estado:' + (total === 0 ? 'cero' : h.opcion)] },
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
        if (!validar(h, (h.opcion === 'otro' ? aPagar > 0 && aPagar <= M.leerMonto(h.total) : aPagar !== null) ? [] : ['otro'])) return;
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
            const lugarNuevo = r.tipo === 'gasto' ? (h.medio !== h.orig.medio ? M.medio(st, h.medio)?.lugar || null : M.lugarGasto(st, r)) : h.lugar || r.lugar;
            const antes = M.anteriorAlCuadre(st, { ...r, fecha: h.fecha, medio: h.medio || r.medio, lugar: lugarNuevo });
            const cambios = hayCambiosRegistro(h);
            const pago = r.pago ? M.pago(st, r.pago) : null;
            const conApartados = st.apartados.filter((a) => a.monto > 0);
            const puedeApartado = r.tipo === 'gasto' && !r.pago && !r.apartado && conApartados.length;
            const ap = h.apartado ? M.apartado(st, h.apartado) : null;
            const bloqueApartado = r.apartado
                ? `<div class="nota nota--ok" role="note">${icon('check')}<p>Lo tomaste de tu ahorro <strong>${esc(r.apartadoNombre || '')}</strong>.</p></div>`
                : puedeApartado
                  ? `<div class="campo-g"><button type="button" class="link link--start" aria-expanded="${!!(h.verApartados || !!ap)}" aria-controls="ed-apartados" data-a="valor" data-campo="verApartados" data-v="${!(h.verApartados || !!ap)}" data-fk="ed-tomar">${icon('circle-plus', 'ico-s')}Tomarlo de un ahorro</button>
                     <div id="ed-apartados" ${h.verApartados || ap ? '' : 'hidden'}>${opciones(h, { campo: 'apartado', label: '¿De cuál ahorro salió?', lista: [...conApartados.map((a) => ({ v: a.id, t: a.nombre, e: a.emoji, s: dinero(a.monto) })), { v: '', t: 'De ninguno' }], valor: h.apartado || '' })}
                     ${ap ? (() => {
                         const cierra = !!ap.metaFecha || !!(ap.meta && ap.monto >= ap.meta);
                         return `<div class="nota nota--ok" role="note">${icon('check')}<p>Sale de tu ahorro <strong>${esc(ap.nombre)}</strong>: tu libre sube ${dinero(cierra ? ap.monto : Math.min(ap.monto, M.leerMonto(h.monto) || 0))}.${cierra ? ' El ahorro se cierra.' : ''}</p></div>`;
                     })() : ''}</div></div>`
                  : '';
            return {
                titulo: 'Corregir',
                cuerpo: `${pago ? `<p class="txt">${emo(pago.emoji, 18)} Tu pago de ${esc(pago.nombre)}, marcado como pagado.</p>` : ''}${antes.length ? `<div class="nota nota--info" role="note">${icon('info')}<p>Es anterior a tu cuadre de ${esc(antes.map((l) => `${l.nombre} (${M.fechaCorta(l.cuadre.fecha)})`).join(' y '))}: <strong>corregirlo no cambia tu saldo porque cuadraste después.</strong> Sí cambia el resumen del mes.</p></div>` : ''}
                    ${campoMonto(h, { label: '¿Cuánto fue?', valor: h.monto })}
                    ${r.tipo === 'gasto' || r.tipo === 'ingreso' ? campoTexto(h, { campo: 'nombre', label: r.tipo === 'gasto' ? '¿En qué?' : '¿De qué?', valor: h.nombre }) : ''}
                    ${r.tipo === 'gasto' && !r.pago ? opciones(h, { campo: 'categoria', label: '¿Qué tipo de gasto?', lista: D.CATEGORIAS.filter((k) => !['servicios', 'cuotas'].includes(k.id)).map((k) => ({ v: k.id, t: k.nombre, e: k.emoji })), valor: h.categoria }) : ''}
                    ${r.tipo === 'gasto' ? opciones(h, { campo: 'medio', label: '¿Con qué pagaste?', lista: medios(st), valor: h.medio }) : ''}
                    ${r.tipo === 'ingreso' ? opciones(h, { campo: 'lugar', label: '¿Dónde llegó?', lista: lugares(st), valor: h.lugar }) : ''}
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
                const antes = { monto: r.monto, medio: r.medio };
                Object.assign(r, { monto, nombre: h.nombre.trim() || r.nombre, fecha: h.fecha });
                // v2.7 (F15): un ingreso recibido tiene UN monto: su llegada (la de Pagos y la ficha del ingreso) cambia con él.
                if (r.tipo === 'ingreso' && r.ingreso && r.ocurrencia) {
                    const ing = M.ingreso(s, r.ingreso);
                    const l = ing && ing.llegadas && ing.llegadas[r.ocurrencia];
                    if (l && !l.noLlego) l.monto = monto;
                }
                if (r.tipo === 'gasto') Object.assign(r, { medio: h.medio, categoria: h.categoria || r.categoria });
                // v2.7 (F04): corregir con qué pagaste sí cambia de qué cuenta salió (es esta anotación, no el medio).
                if (r.tipo === 'gasto' && h.medio !== h.orig.medio) r.lugar = M.medio(s, h.medio)?.lugar || null;
                if (r.tipo === 'ingreso') r.lugar = h.lugar;
                if (r.pago) {
                    const p = M.pago(s, r.pago);
                    const entrada = p && Object.entries(p.hechos).find(([, x]) => x.registro === r.id || (Array.isArray(x.pagos) && x.pagos.some((y) => y.registro === r.id)));
                    if (entrada) {
                        const [f, hecho] = entrada;
                        const debido = debidoDe(p, hecho);
                        if (Array.isArray(hecho.pagos) || (debido !== null && monto < debido)) {
                            // v2.7 (D-6): corregir el monto es lo mismo que haberlo pagado así: si queda menos de lo que tocaba, lo
                            // que falta sigue pendiente. Primero vuelve lo que bajó de lo que debes; después baja lo nuevo.
                            const pagos = Array.isArray(hecho.pagos) ? hecho.pagos.map((y) => ({ ...y })) : [{ registro: r.id, monto: hecho.monto, ...(hecho.bajaDeuda !== undefined ? { bajaDeuda: hecho.bajaDeuda } : {}) }];
                            const parte = pagos.find((y) => y.registro === r.id);
                            if (debeConocido(p)) {
                                p.deuda.debe += parte.bajaDeuda !== undefined ? parte.bajaDeuda : Array.isArray(hecho.pagos) ? 0 : hecho.monto || 0;
                                const baja = bajarDeuda(p, monto);
                                if (baja) parte.bajaDeuda = baja;
                                else delete parte.bajaDeuda;
                            }
                            parte.monto = monto;
                            p.hechos[f] = hechoDe(debido !== null ? debido : M.suma(pagos, (y) => y.monto), pagos);
                        } else {
                            // v2.6.1 (QA A-D4): primero vuelve lo que había bajado; después baja lo nuevo (sin pasar de lo que debes).
                            if (debeConocido(p)) {
                                p.deuda.debe += hecho.bajaDeuda !== undefined ? hecho.bajaDeuda : hecho.monto || 0;
                                const baja = bajarDeuda(p, monto);
                                if (baja) hecho.bajaDeuda = baja;
                                else delete hecho.bajaDeuda;
                            }
                            hecho.monto = monto;
                        }
                    }
                }
                // v2.7 (F16): un gasto que salió de un ahorro: el gasto y el ahorro cambian juntos (y lo reservado para pagar la
                // tarjeta, si fue con crédito).
                if (r.tipo === 'gasto' && r.apartado && (r.monto !== antes.monto || r.medio !== antes.medio)) reaplicarApartado(s, r, antes);
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
    /**
     * v2.7 (F16): corregir un gasto que salió de un ahorro. Vuelve al ahorro lo que se había usado y se vuelve a usar lo que
     * toca con el monto nuevo (hasta lo que tiene). Si el ahorro ya se cerró, se usa a lo más lo de antes. Lo reservado
     * para la tarjeta (si fue con crédito) queda igual a lo usado; si ya no fue con crédito, se suelta.
     */
    function reaplicarApartado(s, r, antes) {
        const a = M.apartado(s, r.apartado);
        const usadoAntes = r.usadoApartado !== undefined ? r.usadoApartado : antes.monto;
        let usado;
        if (a) {
            a.monto += usadoAntes;
            usado = Math.min(r.monto, a.monto);
            a.monto -= usado;
            if (usado !== usadoAntes) a.historial.unshift({ fecha: s.hoy, tipo: 'corregido', monto: usado - usadoAntes });
        } else usado = Math.min(r.monto, usadoAntes);
        r.usadoApartado = usado;
        // (Las reservas de antes de la v2.6.1 no guardaban su gasto: la del mismo ahorro y monto.)
        const previa = (s.reservasTarjeta || []).find((x) => x.registro === r.id) || (s.reservasTarjeta || []).find((x) => !x.registro && x.apartado === r.apartado && x.monto === usadoAntes);
        s.reservasTarjeta = (s.reservasTarjeta || []).filter((x) => x !== previa);
        const m = M.medio(s, r.medio);
        if (m && m.tarjeta && usado > 0) s.reservasTarjeta.push({ id: previa ? previa.id : 'rs' + s.seq++, tarjeta: m.tarjeta, monto: usado, de: a ? a.nombre : r.apartadoNombre, apartado: r.apartado, registro: r.id, fecha: previa ? previa.fecha : s.hoy });
    }
    P.reaplicarApartado = reaplicarApartado;
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
                        if (debeConocido(p)) p.deuda.debe += hecho.bajaDeuda !== undefined ? hecho.bajaDeuda : hecho.monto || 0;
                        delete p.hechos[r.ocurrencia];
                    }
                }
                // v2.6.1 (QA B-AP1, B-AP2): un gasto que salió de un ahorro devuelve lo usado a ese ahorro (si sigue abierto) y,
                // si fue con tarjeta, suelta lo que quedó reservado para pagarla.
                if (r.apartado) {
                    const a = M.apartado(s, r.apartado);
                    const usado = r.usadoApartado !== undefined ? r.usadoApartado : r.monto;
                    if (a && usado > 0) {
                        a.monto += usado;
                        a.historial.unshift({ fecha: s.hoy, tipo: 'devuelto', monto: usado });
                    }
                    s.reservasTarjeta = (s.reservasTarjeta || []).filter((x) => !(x.registro === r.id || (!x.registro && x.apartado === r.apartado && x.monto === usado)));
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
        return [{ id: em.id, monto: em.meta ? Math.min(diez, Math.max(0, em.meta - em.monto)) : diez, regla: 'El 10 % de lo que te llegó' }].filter((x) => x.monto > 0);
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
        const otrosHtml = otros.length ? P.tarjetaSeccion('¿También te llegó…?', `<ul class="lista">${otros.map((o) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(o.ingreso.emoji)}<span class="fila-txt"><span class="fila-t">${esc(o.ingreso.nombre)}</span><span class="fila-s">${dinero(o.monto, { aprox: o.aprox })} · ${o.fecha === st.hoy ? 'hoy' : 'del ' + M.fechaCorta(o.fecha)}</span></span></div><button type="button" class="btn btn--sm btn--prim" data-a="hoja" data-hoja="ingresoLlego" data-id="${o.ingreso.id}" data-fecha="${o.fecha}" data-fk="rep-otro-${o.ingreso.id}">Sí, ya llegó</button></li>`).join('')}</ul>`, { id: 'rep-otros' }) : '';
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
            const op = (v, titulo, sub) => `<button type="button" class="opcion-g" role="radio" aria-checked="${h.opcion === v}" data-a="valor" data-campo="opcion" data-v="${v}" data-fk="py-${v}"><span class="opcion-g-txt"><span class="opcion-g-t">${titulo}</span><span class="fila-s">${sub}</span></span>${h.opcion === v ? icon('circle-check', 'ico-ok') : ''}</button>`;
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
            top.montosT = {};
        }
        top.montosT = top.montosT || {};
        const atrasadas = P.ingresosPorConfirmar();
        const vencidos = [];
        // v2.6.6 (V2-86): lo de antes de empezar se contesta en su tarjeta de Hoy, no aquí («Pagado» lo anotaría otra vez).
        const enRevision = P.enRevisionAntes();
        for (const p of st.pagos.filter((x) => x.activo !== false)) for (const o of M.ocurrenciasPago(st, p, p.desde, M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido' && !enRevision.has(`pago:${p.id}:${o.fecha}`)) vencidos.push(o);
        for (const o of M.ocurrenciasTarjeta(st, '2000-01-01', M.sumarDias(st.hoy, -1))) if (o.estado === 'vencido' && !enRevision.has(`tarjeta:${o.tarjeta.id}:${o.fecha}`)) vencidos.push(o);
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
                            <div class="chips"><button type="button" class="chip" aria-pressed="${v.decision === 'si'}" data-a="aldiaIngreso" data-f="${clave}" data-v="si" data-fk="adi-si-${o.fecha}${o.ingreso.principal ? '' : '-' + o.ingreso.id}">${v.decision === 'si' ? icon('check', 'ico-xs') : ''}Sí, ya llegó</button><button type="button" class="chip" aria-pressed="${v.decision === 'todavia'}" data-a="aldiaIngreso" data-f="${clave}" data-v="todavia" data-fk="adi-todavia-${o.fecha}">${v.decision === 'todavia' ? icon('check', 'ico-xs') : ''}Todavía no</button><button type="button" class="chip" aria-pressed="${v.decision === 'no'}" data-a="aldiaIngreso" data-f="${clave}" data-v="no" data-fk="adi-no-${o.fecha}">${v.decision === 'no' ? icon('check', 'ico-xs') : ''}No me va a caer</button></div>
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
                          // v2.7 (F17): pagar una tarjeta pide cuánto (con lo mismo que propone «Pagar tarjeta»); nunca un abono de $0.
                          const idT = 'adt-' + clave.replace(/[^\w-]/g, '-');
                          const montoT = o.tarjeta && v === 'pagado' ? `<div class="campo-g"><label class="campo-l" for="${idT}">¿Cuánto pagaste?</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="${idT}" data-campo="adTarjeta" data-k="${esc(clave)}" type="text" inputmode="decimal" autocomplete="off" value="${esc(top.montosT[clave] ?? '')}" ${top.faltaT === clave ? `aria-invalid="true" aria-describedby="${idT}-err"` : ''}></div>${top.faltaT === clave ? `<p class="campo-error" id="${idT}-err">${icon('triangle-alert')}<span>Escribe cuánto pagaste</span></p>` : ''}</div>` : '';
                          return `<li class="ad-item">${caja(o.tarjeta ? o.tarjeta.emoji : o.pago.emoji)}<div class="ad-txt"><p class="fila-t">${esc(nombre)} · ${dinero(o.monto, { aprox: o.estimado })}</p><p class="fila-s">Venció el ${esc(M.fechaLarga(o.fecha))}${o.parcial ? ` · ya pagaste ${dinero(o.parcial.pagado)}` : ''}</p><div class="chips">${ch('pagado', 'Pagado')}${ch('aun', 'Aún no')}${o.tarjeta ? '' : ch('saltar', 'Saltar')}</div>${montoT}</div></li>`;
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
        if (el.dataset.campo === 'adTarjeta') top.montosT[el.dataset.k] = el.value;
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
    /** v2.7 (F17): al elegir «Pagado» en una tarjeta, se propone lo mismo que en «Pagar tarjeta» (y se puede cambiar). */
    function proponerTarjetaAldia(top, clave) {
        if (!clave.startsWith('t:') || top.montosT[clave] !== undefined) return;
        const t = M.tarjeta(P.st, clave.split(':')[1]);
        const prop = t ? M.pagoTarjetaPropuesto(P.st, t) : null;
        top.montosT[clave] = prop && prop.monto > 0 ? M.montoCampo(prop.monto) : '';
    }
    P.acciones.aldiaPago = (d) => {
        const top = P.ui.stack.at(-1);
        top.pagos[d.k] = d.v;
        if (d.v === 'pagado') proponerTarjetaAldia(top, d.k);
        if (top.faltaT === d.k) top.faltaT = null;
        P.render();
    };
    P.acciones.aldiaTodos = () => {
        const top = P.ui.stack.at(-1);
        for (const b of document.querySelectorAll('[data-a="aldiaPago"][data-v="pagado"]')) {
            top.pagos[b.dataset.k] = 'pagado';
            proponerTarjetaAldia(top, b.dataset.k);
        }
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
            // v2.7 (F17): una tarjeta marcada «Pagado» sin monto se pregunta (no se crea un abono de $0).
            const sinMonto = Object.entries(top.pagos).find(([clave, v]) => clave.startsWith('t:') && v === 'pagado' && !(M.leerMonto(top.montosT[clave]) > 0));
            if (sinMonto) {
                top.faltaT = sinMonto[0];
                P.render({ foco: '#adt-' + sinMonto[0].replace(/[^\w-]/g, '-') });
                return;
            }
            top.faltaT = null;
            for (const [clave, v] of Object.entries(top.pagos)) {
                const [tipo, id, fecha] = clave.split(':');
                if (tipo === 'p') {
                    const p = M.pago(st, id);
                    // v2.7 (D-6, F17): lo mismo que «Pagado» en Pagos: lo que toca de esa ocurrencia (si ya pagaste una parte, lo que falta).
                    const o = M.ocurrenciasPago(st, p, fecha, fecha)[0];
                    if (v === 'pagado' && o && o.monto > 0) P.marcarPagado(st, id, fecha, { monto: o.monto, medio: p.medio, fecha });
                    if (v === 'saltar') p.hechos[fecha] = { estado: 'saltado' };
                } else if (v === 'pagado') {
                    // v2.7 (F17): el monto que confirmaste, desde la cuenta con que pagas esa tarjeta (como «Pagar tarjeta»).
                    const t = M.tarjeta(st, id);
                    if (t) P.pagarTarjeta(st, id, { monto: M.leerMonto(top.montosT[clave]), lugar: M.pagoTarjetaPropuesto(st, t).lugar, fecha });
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
    // v2.6.2 (V2-68, feedback de Pam): ingreso → cuánto tienes → TODAS las deudas → tarjetas de crédito (lo que debes
    // hoy, corte y pago) → gastos fijos («¿se cobra solo en una tarjeta o cuenta? ¿cuál?»). «Paso N de 5»; todo se
    // salta menos cuánto tienes; lo agregado se edita o se quita sin salir del paso; si se cierra la app, se retoma
    // donde iba. Ya configurada, «Completar tu Primer día» abre solo deudas, tarjetas y gastos fijos y SUMA a lo que hay.
    const OB_INGRESOS = [['quincena', '💼', 'Cada quincena', 'Dos veces al mes'], ['mes', '🗓️', 'Cada mes', 'Un día fijo'], ['semana', '🧰', 'Cada semana', 'Obra, maquila, reparto…'], ['catorcena', '📅', 'Cada 14 días', 'Catorcena'], ['varia', '🏪', 'Varía', 'Negocio, ventas o trabajos por día'], ['remesa', '🌎', 'Recibo remesa', 'De familia afuera']];
    const OB_REGULARES = { quincena: 'La quincena', mes: 'El pago del mes', semana: 'El pago de la semana', catorcena: 'La catorcena' };
    const lugaresOb = [{ v: 'banco', t: 'En el banco', e: '🏦' }, { v: 'efectivo', t: 'En efectivo', e: '💵' }];
    /** Lo que se va llenando en el Primer día (y en «Completar tu Primer día»). */
    P.obVacio = () => ({ ingresos: {}, bancosMas: [], billeteras: [], efectivo: '', deudas: [], tarjetas: [], pagos: [] });
    /** Los bancos del paso 2, con el id que tendrán como lugar (banco, banco2…). */
    function bancosOb(d) {
        return [...(d.bancoNombre ? [{ nombre: d.bancoNombre, monto: d.bancoMonto }] : []), ...(d.bancosMas || []).filter((b) => b.nombre)].map((b, i) => ({ ...b, id: i ? 'banco' + (i + 1) : 'banco', sufijo: i ? String(i + 1) : '', etiqueta: b.nombre === 'Otro' ? 'tu banco' : 'Banco ' + b.nombre }));
    }
    /** «¿Se cobra solo en una tarjeta o cuenta?»: las tarjetas y las cuentas que hay (o que se acaban de agregar). */
    function fuentesCobro(ob) {
        const st = P.st;
        const d = ob.datos;
        const lista = [{ v: 'no', t: 'No, lo pago yo' }];
        if (ob.completar) {
            for (const t of st.tarjetas) lista.push({ v: 'T:' + t.id, t: 'En ' + t.nombre });
            for (const t of d.tarjetas) lista.push({ v: 't:' + t.clave, t: 'En ' + t.nombre });
            for (const l of st.lugares.filter((x) => x.tipo === 'banco')) lista.push({ v: 'b:' + l.id, t: 'En ' + l.nombre });
        } else {
            for (const t of d.tarjetas) lista.push({ v: 't:' + t.clave, t: 'En ' + t.nombre });
            for (const b of bancosOb(d)) lista.push({ v: 'b:' + b.id, t: 'En ' + (b.nombre === 'Otro' ? 'tu banco' : 'Banco ' + b.nombre) });
        }
        return lista;
    }
    S.onboarding = function () {
        const ob = P.ui.ob;
        const d = ob.datos;
        const st = P.st;
        const primero = ob.completar ? 3 : 1;
        const total = 5 - primero + 1;
        const cab = (n, t, s) => {
            const k = n - primero + 1;
            const atras = n > primero ? `<button type="button" class="atras" data-a="obAtras" aria-label="Paso anterior" data-fk="ob-atras">${icon('chevron-left')}<span>Atrás</span></button>` : ob.completar ? `<button type="button" class="atras" data-a="obCerrar" data-fk="ob-cerrar">${icon('x')}<span>Cerrar</span></button>` : '';
            return `<header class="pg-head ob-head">${atras}<p class="paso">Paso ${k} de ${total}</p><div class="ob-barra" aria-hidden="true"><span style="width:${(k / total) * 100}%"></span></div><h1 class="h1" tabindex="-1">${t}</h1>${s ? `<p class="sub">${s}</p>` : ''}</header>`;
        };
        const err = (campo, t) => (ob.errores && ob.errores.includes(campo) ? `<p class="campo-error" id="ob-err-${campo}">${icon('triangle-alert')}<span>${esc(t)}</span></p>` : '');
        const monto = (campo, label, valor, extra = '') => `<div class="campo-g"><label class="campo-l" for="ob-${campo}">${label}</label><div class="campo campo--monto"><span aria-hidden="true">$</span><input id="ob-${campo}" data-campo="${campo}" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej. 600.00" value="${esc(valor || '')}" ${extra}></div></div>`;
        const pie = (izq, der) => `<div class="ob-pie">${izq}${der}</div>`;
        const sig = (texto = 'Siguiente') => `<button type="button" class="btn btn--prim btn--48" data-a="obSiguiente" data-fk="ob-sig">${texto}</button>`;
        const atrasPie = `<button type="button" class="btn btn--48" data-a="obAtras" data-fk="ob-atras2">Atrás</button>`;
        const noTengo = (texto) => `<button type="button" class="btn btn--48" data-a="obSaltar" data-fk="ob-saltar">${texto}</button>`;
        const botonesEditor = (accion, fk, nuevo, editando) => `<div class="acciones-2"><button type="button" class="btn" data-a="obEditorCancelar" data-fk="ob-ed-cancelar">Cancelar</button><button type="button" class="btn btn--prim" data-a="${accion}" data-fk="${fk}">${editando ? 'Guardar cambios' : nuevo}</button></div>`;
        const filaQuieta = (emoji, t, s, clave, editar, quitar, nombre) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(emoji)}<span class="fila-txt"><span class="fila-t">${esc(t)}</span><span class="fila-s">${esc(s)}</span></span></div><button type="button" class="icon-btn" data-a="${editar}" data-v="${clave}" aria-label="Editar ${esc(nombre)}" data-fk="${editar}-${clave}">${icon('pencil')}</button><button type="button" class="icon-btn" data-a="${quitar}" data-v="${clave}" aria-label="Quitar ${esc(nombre)}" data-fk="${quitar}-${clave}">${icon('x')}</button></li>`;
        if (ob.paso === 0) {
            return `<div class="pg pg--flujo ob">
                <div class="ilus-centro"><svg class="app-illustration app-illustration--large" viewBox="0 0 200 150" aria-hidden="true" focusable="false">${ART.illus.bienvenida}</svg></div>
                <h1 class="h1 centro" tabindex="-1">Te damos la bienvenida</h1>
                <p class="txt centro">Te ayudo a saber <strong>cuánto te queda libre hasta tu próximo ingreso</strong> y a que no se te olvide ningún pago.</p>
                <div class="campo-g"><label class="campo-l" for="ob-nombre">¿Cómo te llamamos? <span class="opcional">(opcional)</span></label><div class="campo"><input id="ob-nombre" data-campo="nombre" type="text" autocomplete="given-name" value="${esc(d.nombre || '')}" placeholder="Ej. Ana"></div></div>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="obSiguiente" data-fk="ob-empezar">Empezar</button>
                <p class="fila-s centro">Son 5 pasos cortos: tu ingreso, lo que tienes, tus deudas, tus tarjetas y tus gastos fijos. Casi todo se puede saltar.</p>
            </div>`;
        }
        if (ob.paso === 1) {
            const sel = d.ingresos;
            // V2-85: si su fecha de este periodo ya pasó: «La del 15 de octubre, ¿ya te llegó?».
            const preguntaIngresoOb = (id) => {
                const fecha = antesIngresoOb(st, id, sel[id]);
                return fecha ? preguntaAntes(sel[id], fecha, { ingreso: true, fem: id !== 'mes' && id !== 'semana', accion: 'obValor', campo: 'antes-' + id, fk: 'ob-antes-' + id }) : '';
            };
            const det = (id) => (sel[id] ? detIngreso(id).replace(/<\/div>$/, `${preguntaIngresoOb(id)}</div>`) : '');
            const detIngreso = (id) => {
                const x = sel[id];
                if (!x) return '';
                if (id === 'quincena') return `<div class="ob-det">${monto('q-monto', '¿Cuánto recibes más o menos cada quincena?', x.monto)}${opcionesOb('q-dias', '¿Qué días?', [{ v: '15-30', t: 'El 15 y el 30' }, { v: '15-31', t: 'El 15 y el último día' }, { v: 'otros', t: 'Otros días' }], x.dias)}${x.dias === 'otros' ? `<div class="ob-2">${obDiaCorto('q-d1', 'Primer pago, el día', x.d1 || '')}${obDiaCorto('q-d2', 'Segundo pago, el día', x.d2 || '')}</div>` : ''}${opcionesOb('q-lugar', '¿Dónde lo recibes?', lugaresOb, x.lugar)}</div>`;
                if (id === 'mes') return `<div class="ob-det">${monto('m-monto', '¿Cuánto más o menos?', x.monto)}${obDias('m-dia', x.dia)}<p class="fila-s">Si es el 29, 30 o 31, en los meses más cortos llega el último día.</p>${opcionesOb('m-lugar', '¿Dónde lo recibes?', lugaresOb, x.lugar)}</div>`;
                if (id === 'semana') return `<div class="ob-det">${monto('s-monto', '¿Cuánto más o menos cada semana?', x.monto)}${opcionesOb('s-dia', '¿Qué día te pagan?', [1, 2, 3, 4, 5, 6].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), x.dia)}${opcionesOb('s-lugar', '¿Dónde lo recibes?', lugaresOb, x.lugar || 'efectivo')}</div>`;
                if (id === 'catorcena') return `<div class="ob-det">${monto('c-monto', '¿Cuánto más o menos cada 14 días?', x.monto)}${calendario(ob, 'c-proximo', x.proximo || null, { label: '¿Cuándo es tu próximo pago?', min: st.hoy })}${opcionesOb('c-lugar', '¿Dónde lo recibes?', lugaresOb, x.lugar)}</div>`;
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
            return `<div class="pg pg--flujo ob">${cab(1, '¿Cómo te pagan?', 'Elige todas las que te pasen. Sin tu ingreso no hay número libre.')}
                <div class="ob-ops">${OB_INGRESOS.map(([id, e, t, s]) => `<div class="ob-op-g"><button type="button" class="opcion-g" aria-pressed="${!!sel[id]}" data-a="obIngreso" data-v="${id}" data-fk="ob-i-${id}">${caja(e)}<span><span class="opcion-g-t">${t}</span><span class="fila-s">${s}</span></span>${sel[id] ? icon('circle-check', 'ico-ok') : ''}</button>${det(id)}</div>`).join('')}</div>
                ${masInfo}
                ${pie(noTengo('Saltar'), sig())}
            </div>`;
        }
        if (ob.paso === 2) {
            // V2-45: varios bancos y billeteras, cada uno con su nombre y lo que tiene.
            const bancoExtra = (b, i) => `<div class="ob-lugar ob-lugar--banco">${caja('🏦')}<div class="ob-lugar-c">${opcionesOb(`banco${i + 1}`, 'Otro banco o cooperativa', [...D.BANCOS.map((x) => ({ v: x, t: x })), { v: 'Otro', t: 'Otro' }], b.nombre)}${b.nombre ? monto(`banco${i + 1}-monto`, `¿Cuánto tienes en ${b.nombre === 'Otro' ? 'ese banco' : 'Banco ' + b.nombre}?`, b.monto) : ''}<button type="button" class="link link--peligro" data-a="obQuitarLugar" data-v="banco:${i}" data-fk="ob-banco${i + 1}-quitar">${icon('x', 'ico-s')}Quitar</button></div></div>`;
            const billetera = (b, i) => `<div class="ob-lugar">${caja('📱')}<div class="ob-lugar-c"><div class="campo-g"><label class="campo-l" for="ob-bill${i}-nombre">Billetera en el celular</label><div class="campo"><input id="ob-bill${i}-nombre" data-campo="bill${i}-nombre" type="text" autocomplete="off" placeholder="Ej. Tigo Money" value="${esc(b.nombre || '')}"></div></div>${monto(`bill${i}-monto`, '¿Cuánto tienes ahí?', b.monto)}<button type="button" class="link link--peligro" data-a="obQuitarLugar" data-v="billetera:${i}" data-fk="ob-bill${i}-quitar">${icon('x', 'ico-s')}Quitar</button></div></div>`;
            return `<div class="pg pg--flujo ob">${cab(2, '¿Cuánto tienes ahora y dónde?', 'Más o menos. Es tu primer cuadre: desde aquí partimos.')}
                <div class="card ob-card">
                    <div class="ob-lugar">${caja('💵')}${monto('efectivo', '¿Cuánto tienes en efectivo?', d.efectivo, ob.errores && ob.errores.includes('dinero') ? 'aria-invalid="true" aria-describedby="ob-err-dinero"' : '')}</div>
                    <div class="ob-lugar ob-lugar--banco">${caja('🏦')}<div class="ob-lugar-c">${opcionesOb('banco', '¿Tienes cuenta en un banco o cooperativa?', [...D.BANCOS.map((b) => ({ v: b, t: b })), { v: 'Otro', t: 'Otro' }], d.bancoNombre)}${d.bancoNombre ? monto('banco-monto', `¿Cuánto tienes en ${d.bancoNombre === 'Otro' ? 'tu banco' : 'Banco ' + d.bancoNombre}?`, d.bancoMonto) : ''}</div></div>
                    ${(d.bancosMas || []).map(bancoExtra).join('')}
                    ${(d.billeteras || []).map(billetera).join('')}
                    ${err('dinero', 'Escribe cuánto tienes, aunque sea $0')}
                    <div class="ob-mas">${d.bancoNombre ? `<button type="button" class="btn btn--sm" data-a="obAgregarLugar" data-v="banco" data-fk="ob-banco-mas">${icon('plus', 'ico-s')}Agregar otro banco</button>` : ''}<button type="button" class="btn btn--sm" data-a="obAgregarLugar" data-v="billetera" data-fk="ob-bill-mas">${icon('plus', 'ico-s')}Agregar billetera</button></div>
                </div>
                ${hoyEsDiaDePago(st, d) ? `<div class="card ob-card">${opcionesOb('hoyCayo', 'Hoy es tu día de pago. ¿Ya está en lo que tienes?', [{ v: 'si', t: 'Sí, ya lo recibí' }, { v: 'no', t: 'Todavía no' }], d.hoyCayo)}<p class="fila-s">Así no lo contamos dos veces. Si todavía no, te lo pregunto cuando llegue.</p></div>` : ''}
                <p class="fila-s">No tiene que ser exacto. Cuando quieras, lo cuadras otra vez.</p>
                ${pie(atrasPie, sig())}
            </div>`;
        }
        if (ob.paso === 3) {
            const ed = ob.editando && ob.editando.tipo === 'deuda' ? ob.editando : null;
            const editor = ed
                ? (() => {
                      const x = DEUDAS_OB.find((y) => y.id === ed.tipoDeuda);
                      return `<div class="card ob-card ob-editor" role="group" aria-labelledby="ob-ed-t"><p class="fila-t" id="ob-ed-t">${emo(x.emoji, 18)} ${esc(ed.clave ? 'Editar deuda' : x.nombre)}</p>
                        <div class="campo-g"><label class="campo-l" for="ob-d-nombre">¿Cómo se llama?</label><div class="campo"><input id="ob-d-nombre" data-campo="d-nombre" type="text" autocomplete="off" value="${esc(ed.nombre)}" placeholder="${esc(x.ejemplo)}"></div></div>
                        ${monto('d-monto', '¿De cuánto es la cuota?', ed.monto)}
                        ${obDias('d-dia', ed.dia, '¿Qué día se paga?')}
                        ${preguntaOb(st, ed)}
                        ${monto('d-debe', '¿Cuánto debes? <span class="opcional">(opcional)</span>', ed.debe)}
                        <p class="fila-s">Más o menos. Baja con cada cuota que marques como pagada.</p>
                        ${err('deuda', 'Escribe el nombre y la cuota, y elige el día')}
                        ${botonesEditor('obDeudaGuardar', 'ob-d-guardar', 'Agregar deuda', !!ed.clave)}</div>`;
                  })()
                : '';
            const agregar = ed ? '' : `<div class="campo-g" role="group" aria-labelledby="ob-l-dn"><p class="campo-l" id="ob-l-dn">${d.deudas.length ? 'Agregar otra deuda' : '¿Qué deuda tienes?'}</p><div class="opciones-grandes opciones-grandes--2">${DEUDAS_OB.map((x) => `<button type="button" class="opcion-g" data-a="obDeudaNueva" data-v="${x.id}" data-fk="ob-dn-${x.id}">${caja(x.emoji)}<span class="opcion-g-txt"><span class="opcion-g-t">${esc(x.nombre)}</span><span class="fila-s">${esc(x.s)}</span></span>${icon('plus', 'ico-xs')}</button>`).join('')}</div></div>`;
            const lista = d.deudas.length ? `<ul class="lista card" aria-label="Tus deudas">${d.deudas.map((x) => filaQuieta(DEUDAS_OB.find((y) => y.id === x.tipoDeuda).emoji, x.nombre, `Cuota ${dinero(x.monto)} el ${x.dia}${x.debe !== null ? ' · debes ' + dinero(x.debe) : ''}`, x.clave, 'obDeudaEditar', 'obDeudaQuitar', x.nombre)).join('')}</ul>` : '';
            return `<div class="pg pg--flujo ob">${cab(3, 'Tus deudas', 'Préstamos, casa comercial o lo que pagas en cuotas. Agrégalas todas: tu número ya las cuenta.')}
                ${lista}${editor}${agregar}
                <p class="fila-s">Tus tarjetas de crédito van en el paso siguiente.</p>
                ${pie(d.deudas.length || ed ? atrasPie : noTengo('No tengo deudas'), sig())}
            </div>`;
        }
        if (ob.paso === 4) {
            const ed = ob.editando && ob.editando.tipo === 'tarjeta' ? ob.editando : null;
            const editor = ed
                ? `<div class="card ob-card ob-editor" role="group" aria-labelledby="ob-ed-t"><p class="fila-t" id="ob-ed-t">${emo('💳', 18)} ${ed.clave ? 'Editar tarjeta' : 'Tarjeta de crédito'}</p>
                    ${opcionesOb('t-banco', '¿De qué banco?', [...D.BANCOS.slice(0, 5).map((b) => ({ v: b, t: b })), { v: 'Otro', t: 'Otro' }], ed.banco)}
                    ${ed.banco === 'Otro' ? `<div class="campo-g"><label class="campo-l" for="ob-t-nombre">¿Cómo se llama?</label><div class="campo"><input id="ob-t-nombre" data-campo="t-nombre" type="text" autocomplete="off" value="${esc(ed.nombre)}" placeholder="Ej. Tarjeta de la tienda"></div></div>` : ''}
                    ${monto('t-debe', '¿Cuánto debes hoy? <span class="opcional">(opcional)</span>', ed.debe)}
                    <div class="ob-2">${obDiaCorto('t-corte', '¿Qué día es el corte?', ed.corte)}${obDiaCorto('t-pago', '¿Qué día se paga?', ed.pago)}</div>
                    <p class="fila-s">Los dos están en tu estado de cuenta. Si no sabes el corte, déjalo vacío.</p>
                    ${monto('t-usual', '¿Cuánto pagas normalmente? <span class="opcional">(opcional)</span>', ed.usual)}
                    <p class="fila-s">Se paga como tus otros pagos, con tu ingreso de antes de esa fecha. Lo usamos hasta que anotes tu estado de cuenta.</p>
                    ${preguntaOb(st, ed)}${err('tarjeta', 'Elige el banco y escribe el día de pago (del 1 al 31)')}
                    ${botonesEditor('obTarjetaGuardar', 'ob-t-guardar', 'Agregar tarjeta', !!ed.clave)}</div>`
                : '';
            const agregar = ed ? '' : `<button type="button" class="btn btn--48 btn--full" data-a="obTarjetaNueva" data-fk="ob-tn">${icon('plus', 'ico-s')}${d.tarjetas.length ? 'Agregar otra tarjeta' : 'Agregar una tarjeta de crédito'}</button>`;
            const lista = d.tarjetas.length ? `<ul class="lista card" aria-label="Tus tarjetas de crédito">${d.tarjetas.map((x) => filaQuieta('💳', x.nombre, [x.debe !== null ? 'Debes ' + dinero(x.debe) : '', x.corte ? 'corte el ' + x.corte : '', 'pagas el ' + x.pago, x.usual ? 'normalmente ' + dinero(x.usual) : ''].filter(Boolean).join(' · '), x.clave, 'obTarjetaEditar', 'obTarjetaQuitar', x.nombre)).join('')}</ul>` : '';
            return `<div class="pg pg--flujo ob">${cab(4, 'Tus tarjetas de crédito', 'Cuánto debes hoy, su día de corte y su día de pago. Están en tu estado de cuenta.')}
                ${lista}${editor}${agregar}
                <p class="fila-s">El límite de crédito nunca suma a tu libre: es dinero prestado.</p>
                ${pie(d.tarjetas.length || ed ? atrasPie : noTengo('No tengo tarjeta'), sig())}
            </div>`;
        }
        if (ob.paso === 5) {
            const ed = ob.editando && ob.editando.tipo !== 'deuda' && ob.editando.tipo !== 'tarjeta' ? ob.editando : null;
            const fuentes = fuentesCobro(ob);
            const cobro = (e) => (fuentes.length > 1 ? `${opcionesOb('p-cobro', '¿Se cobra solo en una tarjeta o cuenta?', fuentes, e.cobro || 'no')}<p class="fila-s">Si se cobra solo, ahí lo verás. Igual lo marcas «Pagado» cuando lo veas en tu estado de cuenta.</p>` : '');
            const pagoChip = (x) => {
                const ya = d.pagos.find((p) => p.id === x.id);
                // V2-82: en «Completar tu Primer día», lo que ya está en Pagos se ve y no se vuelve a agregar.
                if (ob.completar && P.st.pagos.some((p) => p.activo !== false && M.normalizar(p.nombre) === M.normalizar(x.nombre))) {
                    return `<button type="button" class="chip chip--tienes" data-a="obPagoTienes" data-v="${x.id}" data-fk="ob-p-${x.id}" aria-label="${esc(x.nombre)}: ya está en Pagos">${emo(x.emoji, 18)}${esc(x.nombre)}<span class="chip-s">Ya está en Pagos</span></button>`;
                }
                return `<button type="button" class="chip" aria-pressed="${!!(ya || (ed && ed.id === x.id))}" data-a="obPago" data-v="${x.id}" data-fk="ob-p-${x.id}">${ya || (ed && ed.id === x.id) ? icon('check', 'ico-xs') : ''}${emo(x.emoji, 18)}${esc(x.nombre)}</button>`;
            };
            const nSus = d.pagos.filter((p) => p.suscripcion).length;
            let editor = '';
            if (ed && ed.suscripcion) {
                editor = `<div class="card ob-card ob-editor"><p class="fila-t">${emo('📺', 18)} Suscripción</p>${opcionesOb('p-servicio', '¿Cuál?', D.SUSCRIPCIONES.map((s) => ({ v: s.id, t: s.nombre, e: s.emoji })), ed.servicio)}${ed.servicio === 'otra' ? `<div class="campo-g"><label class="campo-l" for="ob-p-nombre">¿Cómo se llama?</label><div class="campo"><input id="ob-p-nombre" data-campo="p-nombre" type="text" autocomplete="off" value="${esc(ed.nombre)}" placeholder="Ej. Crunchyroll"></div></div>` : ''}${monto('p-monto', '¿Cuánto pagas?', ed.monto)}${opcionesOb('p-anual', '¿Cada cuánto?', [{ v: 'no', t: 'Cada mes' }, { v: 'si', t: 'Cada año' }], ed.anual ? 'si' : 'no')}${obDias('p-dia', ed.dia, '¿Qué día se cobra?')}${preguntaOb(st, ed)}${cobro(ed)}${err('pago', 'Elige cuál, escribe cuánto y elige el día')}<div class="acciones-2"><button type="button" class="btn" data-a="obPagoCancelar" data-fk="ob-p-cancelar">Cancelar</button><button type="button" class="btn btn--prim" data-a="obPagoAgregar" data-fk="ob-p-agregar">Agregar</button></div></div>`;
            } else if (ed) {
                const f = D.PAGOS_FRECUENTES.find((x) => x.id === ed.id);
                const cuchubal = f.id === 'cuchubal';
                const cuando = cuchubal && ed.frecuencia === 'quincenal' ? `<div class="ob-2">${obDiaCorto('p-d1', 'Primer día', ed.d1 || '')}${obDiaCorto('p-d2', 'Segundo día', ed.d2 || '')}</div>` : (cuchubal ? ed.frecuencia === 'semanal' : f.semanal) ? opcionesOb('p-dsem', '¿Qué día?', [1, 2, 3, 4, 5, 6].map((n) => ({ v: n, t: M.capital(M.DIAS[n]) })), ed.diaSemana) : obDias('p-dia', ed.dia, '¿Qué día lo pagas?');
                // V2-75: el turno del cuchubal es un ingreso esperado (opcional).
                const turno = cuchubal ? `${calendario(ob, 'p-turno', ed.turno || null, { label: '¿Cuándo te toca recibir? <span class="opcional">(opcional)</span>', min: st.hoy })}${ed.turno ? monto('p-recibes', '¿Cuánto recibes ese día?', ed.recibes) : ''}` : '';
                editor = `<div class="card ob-card ob-editor"><p class="fila-t">${emo(f.emoji, 18)} ${esc(f.nombre)}</p>${monto('p-monto', f.variable ? '¿Cuánto pagas más o menos?' : cuchubal ? '¿Cuánto aportas cada vez?' : '¿Cuánto pagas?', ed.monto)}${cuchubal ? opcionesOb('p-frec', '¿Cada cuánto aportas?', [{ v: 'semanal', t: 'Cada semana' }, { v: 'quincenal', t: 'Cada quincena' }, { v: 'mensual', t: 'Cada mes' }], ed.frecuencia) : ''}${cuando}${preguntaOb(st, ed)}${turno}${cobro(ed)}${err('pago', 'Escribe el monto y elige el día')}<div class="acciones-2"><button type="button" class="btn" data-a="obPagoCancelar" data-fk="ob-p-cancelar">Cancelar</button><button type="button" class="btn btn--prim" data-a="obPagoAgregar" data-fk="ob-p-agregar">Agregar</button></div></div>`;
            }
            const cuandoLista = (p) => (p.frecuencia === 'semanal' ? 'cada ' + M.DIAS[p.diaSemana] : p.frecuencia === 'quincenal' ? `el ${p.dias[0]} y el ${p.dias[1]}` : p.anual ? `cada año, el ${p.dia}` : 'el ' + p.dia);
            const nombreCobro = (p) => (p.cobro && p.cobro !== 'no' ? ' · se cobra en ' + (fuentes.find((x) => x.v === p.cobro)?.t.replace(/^En /, '') || 'tu tarjeta') : '');
            const servicios = D.PAGOS_FRECUENTES.filter((x) => !x.deuda && x.categoria === 'servicios' || x.id === 'telefono');
            const casa = D.PAGOS_FRECUENTES.filter((x) => !x.deuda && !servicios.includes(x));
            return `<div class="pg pg--flujo ob">${cab(5, 'Tus gastos fijos', 'Toca los que tengas. Te aviso antes de que venzan.')}
                <p class="campo-l campo-l--sec">Facturas de servicios</p>
                <div class="chips ob-pagos">${servicios.map(pagoChip).join('')}</div>
                <p class="campo-l campo-l--sec">Casa y familia</p>
                <div class="chips ob-pagos">${casa.map(pagoChip).join('')}</div>
                <p class="campo-l campo-l--sec">Suscripciones</p>
                <div class="chips ob-pagos"><button type="button" class="chip" aria-pressed="${!!(ed && ed.suscripcion)}" data-a="obSuscripcion" data-fk="ob-s-nueva">${icon('plus', 'ico-xs')}${emo('📺', 18)}${nSus ? 'Otra suscripción' : 'Netflix, Spotify, celular…'}${nSus ? `<span class="chip-s">${nSus}</span>` : ''}</button></div>
                ${editor}
                ${d.pagos.length ? `<ul class="lista card" aria-label="Tus gastos fijos">${d.pagos.map((p) => `<li class="fila"><div class="fila-main fila-main--quieta">${caja(p.emoji)}<span class="fila-txt"><span class="fila-t">${esc(p.nombre)}</span><span class="fila-s">${esc(cuandoLista(p) + nombreCobro(p))}</span></span><span class="fila-m">${dinero(p.monto, { aprox: p.variable })}</span></div><button type="button" class="icon-btn" data-a="obPagoQuitar" data-v="${p.clave}" aria-label="Quitar ${esc(p.nombre)}" data-fk="ob-pq-${p.clave}">${icon('x')}</button></li>`).join('')}</ul>` : ''}
                ${pie(d.pagos.length || ed ? atrasPie : noTengo('Saltar'), sig(ob.completar ? 'Agregar todo' : 'Ver mi número'))}
            </div>`;
        }
        return '';
    };
    /** V2-85: la regla de una deuda o un gasto fijo del Primer día (del editor o ya agregado), para su fecha de este periodo. */
    function reglaOb(st, x) {
        if (x.suscripcion) return x.dia ? (x.anual ? { frecuencia: 'meses', cadaMeses: 12, fecha: M.proximoDia(st.hoy, Number(x.dia)) } : { frecuencia: 'mensual', dia: Number(x.dia) }) : null;
        if (x.frecuencia === 'semanal') return { frecuencia: 'semanal', diaSemana: Number(x.diaSemana ?? 5) };
        if (x.frecuencia === 'quincenal') {
            const dias = (x.dias || [x.d1, x.d2]).map(Number).sort((a, b) => a - b);
            return dias.every((n) => n >= 1 && n <= 31) && dias[0] !== dias[1] ? { frecuencia: 'quincenal', dias } : null;
        }
        return x.dia ? { frecuencia: 'mensual', dia: Number(x.dia) } : null;
    }
    /** V2-85: el pago de este periodo de una tarjeta del Primer día que ya pasó (o vence hoy), si lo hay. */
    function antesTarjetaOb(st, t) {
        const pago = Number(t.pago);
        const corte = String(t.corte || '').trim() ? Number(t.corte) : null;
        const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 31;
        if (!ok(pago) || (corte !== null && !ok(corte))) return null;
        const vence = venceTarjeta(st.hoy, corte, pago);
        return vence <= st.hoy && vence >= st.hoy.slice(0, 8) + '01' ? vence : null;
    }
    /** V2-85: la fecha de este periodo que ya pasó de lo que se está editando en el Primer día (deuda, tarjeta o gasto fijo). */
    function antesEditorOb(st, ed) {
        if (!ed) return null;
        if (ed.tipo === 'tarjeta') {
            const fecha = antesTarjetaOb(st, ed);
            return fecha ? { fecha, mensual: true, siguiente: M.fechaDe(...M.mesMas(...M.partes(fecha).slice(0, 2), 1), Number(ed.pago)) } : null;
        }
        const regla = reglaOb(st, ed);
        const fecha = regla ? M.pasadaDelPeriodo(st, regla) : null;
        return fecha ? { fecha, mensual: regla.frecuencia === 'mensual' || regla.frecuencia === 'meses', siguiente: siguienteDe(st, regla, fecha) } : null;
    }
    /** V2-85: «¿ya lo pagaste?» dentro del editor del Primer día. */
    function preguntaOb(st, ed) {
        const a = antesEditorOb(st, ed);
        if (!a) {
            if (ed) ed.antesVisto = null;
            return '';
        }
        return preguntaAntes(ed, a.fecha, { accion: 'obValor', fk: 'ob-antes', mensual: a.mensual, siguiente: a.siguiente });
    }
    /** V2-85: si la pregunta no se vio (el día se escribió sin volver a dibujar), «Agregar» la muestra primero. */
    function faltaVerAntesOb(st, ed) {
        const a = antesEditorOb(st, ed);
        return !!a && mostrarAntes(ed, a.fecha, '#ob-antes-t');
    }
    /** V2-85: los ingresos del Primer día cuya fecha de este periodo ya pasó (la de hoy se pregunta en el paso 2, V2-43). */
    function reglaIngresoOb(st, id, x) {
        if (id === 'quincena') return { frecuencia: 'quincenal', dias: x.dias === '15-31' ? [15, 31] : x.dias === 'otros' ? [Number(x.d1), Number(x.d2)].sort((a, b) => a - b) : [15, 30] };
        if (id === 'mes') return { frecuencia: 'mensual', dia: Number(x.dia) || 30 };
        if (id === 'semana') return { frecuencia: 'semanal', diaSemana: Number(x.dia) || 5 };
        if (id === 'catorcena') return /^\d{4}-\d{2}-\d{2}$/.test(x.proximo || '') ? { frecuencia: 'catorcenal', fecha: x.proximo } : null;
        if (id === 'remesa' && x.cada === 'mes') return { frecuencia: 'mensual', dia: Number(x.dia) || 10 };
        return null;
    }
    function antesIngresoOb(st, id, x) {
        const regla = x ? reglaIngresoOb(st, id, x) : null;
        if (!regla || (regla.dias && !regla.dias.every((n) => n >= 1 && n <= 31))) return null;
        const fecha = M.pasadaDelPeriodo(st, regla);
        return fecha && fecha < st.hoy ? fecha : null;
    }
    /** V2-68: las deudas del Primer día (las tarjetas de crédito tienen su propio paso). */
    const DEUDAS_OB = [
        { id: 'prestamo', nombre: 'Préstamo', s: 'Del banco, cooperativa o alguien', emoji: '🏦', ejemplo: 'Ej. Préstamo de la cooperativa' },
        { id: 'casacomercial', nombre: 'Casa comercial', s: 'Cuotas de una tienda', emoji: '🛍️', ejemplo: 'Ej. Almacén La Esquina' },
        { id: 'vivienda', nombre: 'Crédito de vivienda', s: 'La cuota de tu casa', emoji: '🏡', ejemplo: 'Ej. Fondo Social' },
        { id: 'otra', nombre: 'Otra deuda', s: 'Lo que pagas en cuotas', emoji: '🧾', ejemplo: 'Ej. Lo que le debo a mi tía' },
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
    function obDias(campo, valor, label = '¿Qué día del mes?') {
        return `<div class="campo-g" role="group" aria-labelledby="ob-l-${campo}"><p class="campo-l" id="ob-l-${campo}">${label}</p><div class="dias">${Array.from({ length: 31 }, (_, i) => i + 1).map((n) => `<button type="button" class="dia" aria-pressed="${Number(valor) === n}" data-a="obValor" data-campo="${campo}" data-v="${n}" data-fk="ob-${campo}-${n}" aria-label="Día ${n}">${n}${Number(valor) === n ? icon('check', 'ico-dia') : ''}</button>`).join('')}</div></div>`;
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
        else if (/^[qmsrc]-/.test(c)) {
            const g = { q: 'quincena', m: 'mes', s: 'semana', r: 'remesa', c: 'catorcena' }[c[0]];
            if (d.ingresos[g]) d.ingresos[g][c.slice(2)] = /^d[12]$/.test(c.slice(2)) ? soloDigitos(v) : v;
        } else if (c.startsWith('x-') && d.extras && d.extras[c.slice(2)]) d.extras[c.slice(2)].monto = v;
        else if (/^d-(nombre|monto|debe)$/.test(c) || /^t-(nombre|debe|usual)$/.test(c)) ob.editando[c.slice(2)] = v;
        else if (c === 't-corte' || c === 't-pago') ob.editando[c.slice(2)] = soloDigitos(v);
        else if (c === 'p-recibes') ob.editando.recibes = v;
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
        // V2-85: «¿ya lo pagaste?» del editor y «¿ya te llegó?» de cada ingreso.
        if (d.campo === 'antes') ob.editando.antesDebe = respuestaAntes(v);
        else if (d.campo.startsWith('antes-')) x.ingresos[d.campo.slice(6)].antesDebe = respuestaAntes(v);
        else if (d.campo === 'banco') x.bancoNombre = v;
        else if ((m = /^banco(\d+)$/.exec(d.campo))) x.bancosMas[Number(m[1]) - 1].nombre = v;
        else if (d.campo === 'hoyCayo') x.hoyCayo = v;
        else if (d.campo === 'principal') x.principal = v;
        else if (d.campo === 't-banco') ob.editando.banco = v;
        else if (d.campo === 'd-dia') ob.editando.dia = Number(v);
        else if (d.campo === 'p-cobro') ob.editando.cobro = v;
        else if (d.campo === 'p-turno') ob.editando.turno = v;
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
    let claveOb = 0;
    // v2.6.2 (V2-68): deudas y tarjetas del Primer día: agregar varias seguidas, editar y quitar sin salir del paso.
    P.acciones.obDeudaNueva = (d) => {
        const x = DEUDAS_OB.find((y) => y.id === d.v);
        P.ui.ob.editando = { tipo: 'deuda', clave: null, tipoDeuda: d.v, nombre: x.id === 'otra' ? '' : x.nombre, monto: '', dia: null, debe: '' };
        P.ui.ob.errores = [];
        P.render({ foco: '#ob-d-nombre' });
    };
    P.acciones.obDeudaEditar = (d) => {
        const x = P.ui.ob.datos.deudas.find((y) => y.clave === d.v);
        if (!x) return;
        P.ui.ob.editando = { tipo: 'deuda', clave: x.clave, tipoDeuda: x.tipoDeuda, nombre: x.nombre, monto: M.montoCampo(x.monto), dia: x.dia, debe: x.debe !== null ? M.montoCampo(x.debe) : '', antesDebe: x.antesDebe || null };
        P.ui.ob.errores = [];
        P.render({ foco: '#ob-d-nombre' });
    };
    P.acciones.obDeudaQuitar = (d) => {
        const ob = P.ui.ob;
        ob.datos.deudas = ob.datos.deudas.filter((x) => x.clave !== d.v);
        if (ob.editando && ob.editando.clave === d.v) ob.editando = null;
        P.render({ foco: '[data-fk="ob-dn-prestamo"]' });
        P.emitir('onboarding:deuda:quitar');
    };
    /** Guarda la deuda del editor. Devuelve false si falta algo (y lo dice junto a los campos). */
    function guardarDeudaOb() {
        const ob = P.ui.ob;
        const ed = ob.editando;
        const monto = M.leerMonto(ed.monto);
        const nombre = (ed.nombre || '').trim();
        if (!nombre || !monto || !ed.dia) {
            ob.errores = ['deuda'];
            P.render({ foco: !nombre ? '#ob-d-nombre' : !monto ? '#ob-d-monto' : '[data-fk="ob-d-dia-1"]' });
            return false;
        }
        if (faltaVerAntesOb(P.st, ed)) return false;
        const x = { clave: ed.clave || 'ob' + ++claveOb, tipoDeuda: ed.tipoDeuda, nombre, monto, dia: ed.dia, debe: M.leerMonto(ed.debe), antesDebe: ed.antesDebe || null };
        const i = ob.datos.deudas.findIndex((y) => y.clave === x.clave);
        if (i >= 0) ob.datos.deudas[i] = x;
        else ob.datos.deudas.push(x);
        ob.editando = null;
        ob.errores = [];
        P.emitir('onboarding:deuda:' + x.tipoDeuda);
        return true;
    }
    P.acciones.obDeudaGuardar = () => {
        if (guardarDeudaOb()) P.render({ foco: '[data-fk="ob-dn-prestamo"]' });
    };
    P.acciones.obTarjetaNueva = () => {
        P.ui.ob.editando = { tipo: 'tarjeta', clave: null, banco: null, nombre: '', debe: '', corte: '', pago: '', usual: '' };
        P.ui.ob.errores = [];
        P.render({ foco: '[data-fk="ob-t-banco-BAC"]' });
    };
    P.acciones.obTarjetaEditar = (d) => {
        const x = P.ui.ob.datos.tarjetas.find((y) => y.clave === d.v);
        if (!x) return;
        P.ui.ob.editando = { tipo: 'tarjeta', clave: x.clave, banco: x.banco, nombre: x.nombre, debe: x.debe !== null ? M.montoCampo(x.debe) : '', corte: x.corte ? String(x.corte) : '', pago: String(x.pago), usual: x.usual ? M.montoCampo(x.usual) : '', antesDebe: x.antesDebe || null };
        P.ui.ob.errores = [];
        P.render({ foco: '#ob-t-debe' });
    };
    P.acciones.obTarjetaQuitar = (d) => {
        const ob = P.ui.ob;
        ob.datos.tarjetas = ob.datos.tarjetas.filter((x) => x.clave !== d.v);
        // Un gasto fijo que se cobraba en esa tarjeta vuelve a «lo pago yo» (nada queda apuntando a una tarjeta que no existe).
        for (const p of ob.datos.pagos) if (p.cobro === 't:' + d.v) p.cobro = 'no';
        if (ob.editando && ob.editando.clave === d.v) ob.editando = null;
        P.render({ foco: '[data-fk="ob-tn"]' });
        P.emitir('onboarding:tarjeta:quitar');
    };
    function guardarTarjetaOb() {
        const ob = P.ui.ob;
        const ed = ob.editando;
        const nombre = ed.banco === 'Otro' ? (ed.nombre || '').trim() : ed.banco ? 'Crédito ' + ed.banco : '';
        const pago = Number(ed.pago);
        const corte = String(ed.corte || '').trim() ? Number(ed.corte) : null;
        const okDia = (n) => Number.isInteger(n) && n >= 1 && n <= 31;
        if (!nombre || !okDia(pago) || (corte !== null && !okDia(corte))) {
            ob.errores = ['tarjeta'];
            P.render({ foco: !nombre ? (ed.banco === 'Otro' ? '#ob-t-nombre' : '[data-fk="ob-t-banco-BAC"]') : corte !== null && !okDia(corte) ? '#ob-t-corte' : '#ob-t-pago' });
            return false;
        }
        if (faltaVerAntesOb(P.st, ed)) return false;
        // Dos tarjetas del mismo banco: «Crédito BAC» y «Crédito BAC 2» (también contra las que ya tienes).
        const otros = [...ob.datos.tarjetas.filter((y) => y.clave !== ed.clave).map((y) => y.nombre), ...(ob.completar ? P.st.tarjetas.map((t) => t.nombre) : [])];
        let final = nombre;
        for (let n = 2; otros.includes(final); n++) final = `${nombre} ${n}`;
        const x = { clave: ed.clave || 'ob' + ++claveOb, banco: ed.banco, nombre: final, debe: M.leerMonto(ed.debe), corte, pago, usual: M.leerMonto(ed.usual), antesDebe: ed.antesDebe || null };
        const i = ob.datos.tarjetas.findIndex((y) => y.clave === x.clave);
        if (i >= 0) ob.datos.tarjetas[i] = x;
        else ob.datos.tarjetas.push(x);
        ob.editando = null;
        ob.errores = [];
        P.emitir('onboarding:tarjeta');
        return true;
    }
    P.acciones.obTarjetaGuardar = () => {
        if (guardarTarjetaOb()) P.render({ foco: '[data-fk="ob-tn"]' });
    };
    P.acciones.obEditorCancelar = () => {
        P.ui.ob.editando = null;
        P.ui.ob.errores = [];
        P.render();
    };
    /** «Completar tu Primer día» (ya configurada): deudas, tarjetas y gastos fijos, que se SUMAN a lo que hay. */
    P.acciones.obCompletar = () => {
        if (P.ayuda && P.ayuda.abierto) P.ayuda.cerrar({ foco: false });
        if (P.ui.hoja) P.cerrarHoja({ sinFoco: true });
        P.ui.ob = { paso: 3, completar: true, datos: P.obVacio() };
        P.render({ nueva: true });
        P.emitir('onboarding:completar');
    };
    P.acciones.obCerrar = () => {
        P.ui.ob = null;
        P.render({ nueva: true });
        P.emitir('onboarding:completar:cerrar');
    };
    /** V2-82: un gasto fijo que ya tienes en Pagos: se dice dónde está, sin agregarlo otra vez. */
    P.acciones.obPagoTienes = (d) => {
        const f = D.PAGOS_FRECUENTES.find((x) => x.id === d.v);
        P.avisar(`Ya tienes «${f ? f.nombre : 'ese pago'}» en Pagos`, { check: false });
    };
    P.acciones.obPago = (d) => {
        const ob = P.ui.ob;
        const ya = ob.datos.pagos.find((p) => p.id === d.v);
        if (ya) {
            ob.editando = { id: d.v, monto: M.montoCampo(ya.monto), dia: ya.dia, diaSemana: ya.diaSemana, frecuencia: ya.frecuencia, d1: ya.dias ? String(ya.dias[0]) : '', d2: ya.dias ? String(ya.dias[1]) : '', cobro: ya.cobro || 'no', turno: ya.turno || null, recibes: ya.recibes ? M.montoCampo(ya.recibes) : '', antesDebe: ya.antesDebe || null };
            ob.datos.pagos = ob.datos.pagos.filter((p) => p.id !== d.v);
        } else ob.editando = { id: d.v, monto: '', dia: null, diaSemana: 5, frecuencia: d.v === 'cuchubal' ? 'semanal' : null, cobro: 'no', turno: null, recibes: '' };
        ob.errores = [];
        P.render({ foco: '#ob-p-monto' });
    };
    P.acciones.obSuscripcion = () => {
        const t = P.ui.ob.completar ? null : P.ui.ob.datos.tarjetas[0];
        P.ui.ob.editando = { suscripcion: true, servicio: null, nombre: '', emoji: '📺', monto: '', dia: null, anual: false, cobro: t ? 't:' + t.clave : 'no' };
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
        if (ed.suscripcion) {
            if (!monto || !ed.dia || !ed.servicio || !(ed.nombre || '').trim()) return obFalta();
            if (faltaVerAntesOb(P.st, ed)) return;
            ob.datos.pagos.push({ clave, id: clave, suscripcion: true, nombre: ed.nombre.trim(), emoji: ed.emoji, categoria: 'suscripciones', monto, frecuencia: 'mensual', anual: ed.anual, dia: ed.dia, cobro: ed.cobro || 'no', antesDebe: ed.antesDebe || null });
            P.emitir('onboarding:suscripcion');
        } else {
            const f = D.PAGOS_FRECUENTES.find((x) => x.id === ed.id);
            const frecuencia = f.id === 'cuchubal' ? ed.frecuencia || 'semanal' : f.semanal ? 'semanal' : 'mensual';
            const dias = frecuencia === 'quincenal' ? [Number(ed.d1), Number(ed.d2)].sort((a, b) => a - b) : null;
            const okDia = frecuencia === 'semanal' || (frecuencia === 'quincenal' ? dias.every((n) => n >= 1 && n <= 31) && dias[0] !== dias[1] : !!ed.dia);
            if (!monto || !okDia) return obFalta();
            if (faltaVerAntesOb(P.st, ed)) return;
            ob.datos.pagos.push({ clave, id: f.id, nombre: f.nombre, emoji: f.emoji, categoria: f.categoria, monto, variable: !!f.variable, frecuencia, dia: ed.dia, diaSemana: ed.diaSemana, dias, cobro: ed.cobro || 'no', turno: f.id === 'cuchubal' && ed.turno ? ed.turno : null, recibes: f.id === 'cuchubal' && ed.turno ? M.leerMonto(ed.recibes) : null, antesDebe: ed.antesDebe || null });
            P.emitir('onboarding:pago:' + f.id);
        }
        const foco = ed.suscripcion ? '[data-fk="ob-s-nueva"]' : `[data-fk="ob-p-${ed.id}"]`;
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
        ob.editando = null;
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
        // Lo que quedó escrito en el editor abierto se agrega antes de seguir (si falta algo, se dice y no se avanza).
        const ed = ob.editando;
        if (ed && ed.tipo === 'deuda' && !guardarDeudaOb()) return;
        if (ed && ed.tipo === 'tarjeta' && !guardarTarjetaOb()) return;
        if (ed && ob.paso === 5) ob.editando = null;
        if (ob.paso === 5) {
            terminarOnboarding();
            return;
        }
        ob.paso++;
        ob.errores = [];
        P.render({ nueva: true });
        P.emitir('onboarding:paso' + ob.paso);
    };
    /** Crea las tarjetas, deudas y gastos fijos del Primer día (o de «Completar») en `st`. `bancoDebito(id)`: el débito de ese lugar. */
    function agregarDeudasTarjetasPagos(st, d, { bancoDebito, medioCuota, ob }) {
        // V2-68: cada tarjeta con lo que debes hoy (por confirmar), su corte y su día de pago. V2-54 / V2-78: hasta su
        // primer estado de cuenta cuenta lo que pagas normalmente. Sin corte, se pide con el estado de cuenta.
        const idTarjeta = {};
        for (const t of d.tarjetas) {
            let n = 1;
            let id = 'credito';
            while (st.tarjetas.some((x) => x.id === id) || st.medios.some((x) => x.id === id)) id = 'credito' + ++n;
            const pagoDia = t.pago;
            const estado = { corte: t.corte ? M.ultimoDia(st.hoy, t.corte) : M.sumarDias(st.hoy, -1), total: 0, minimo: 0, aPagar: 0, opcion: 'total', vence: venceTarjeta(st.hoy, t.corte, pagoDia), inicial: true };
            // V2-85: su pago de este periodo ya pasó (o vence hoy): «Sí» (o sin respuesta) espera el siguiente; «No», lo cuenta.
            const antes = antesTarjetaOb(st, t);
            if (antes) estado.antes = t.antesDebe === antes ? 'debe' : 'pagado';
            // v2.7 (D-7): lo que debes hoy, con su fecha (las compras de antes ya están en ese saldo).
            st.tarjetas.push({ id, nombre: t.nombre, emoji: '💳', tipo: 'tarjeta', corte: t.corte || null, pagoDia, cupo: null, pagoUsual: t.usual || null, debeInicial: t.debe, ...(t.debe !== null && t.debe !== undefined ? { debeDesde: { fecha: st.hoy, seq: st.seq++ } } : {}), desde: st.hoy, interesesAnio: 0, estados: [estado] });
            st.medios.push({ id, nombre: t.nombre, emoji: '💳', tarjeta: id });
            idTarjeta[t.clave] = id;
        }
        for (const x of d.deudas) {
            const tipo = DEUDAS_OB.find((y) => y.id === x.tipoDeuda);
            const p = P.crearPago(st, { nombre: x.nombre, emoji: tipo.emoji, categoria: 'cuotas', monto: x.monto, frecuencia: 'mensual', dia: x.dia, medio: medioCuota, antesDebe: x.antesDebe || null });
            Object.assign(p, { tipoDeuda: x.tipoDeuda === 'otra' ? 'prestamo' : x.tipoDeuda, deuda: x.debe !== null ? { debe: x.debe } : null });
        }
        const credito = st.medios.find((m) => m.tarjeta);
        for (const p of d.pagos) {
            // V2-82: «Completar tu Primer día» no repite un pago que ya tienes (mismo nombre).
            if (st.pagos.some((x) => x.activo !== false && M.normalizar(x.nombre) === M.normalizar(p.nombre || ''))) continue;
            // «¿Se cobra solo en una tarjeta o cuenta? ¿Cuál?» decide de dónde sale (V2-68); si no, como siempre.
            const c = p.cobro || 'no';
            let medioId = null;
            if (c.startsWith('t:')) medioId = idTarjeta[c.slice(2)] || null;
            else if (c.startsWith('T:')) medioId = (st.medios.find((m) => m.tarjeta === c.slice(2)) || {}).id || null;
            else if (c.startsWith('b:')) medioId = bancoDebito(c.slice(2));
            const automatico = !!medioId;
            if (!medioId) medioId = p.suscripcion ? (credito && !ob.completar ? credito.id : bancoDebito(null) || 'efectivo') : p.categoria === 'servicios' ? bancoDebito(null) || 'efectivo' : 'efectivo';
            const fecha = p.anual ? M.proximoDia(st.hoy, p.dia) : null;
            const x = P.crearPago(st, { nombre: p.nombre, emoji: p.emoji, categoria: p.categoria, monto: p.monto, estimado: p.variable, frecuencia: p.anual ? 'meses' : p.frecuencia, cadaMeses: p.anual ? 12 : undefined, fecha, dia: p.dia, diaSemana: p.diaSemana, dias: p.dias, medio: medioId, tipoPago: p.suscripcion ? 'suscripcion' : undefined, antesDebe: p.antesDebe || null });
            if (automatico) x.automatico = true;
            // V2-75: el turno del cuchubal es un ingreso esperado de una vez («Tu turno de recibir»).
            if (p.turno && p.recibes) {
                const id = 'turno' + st.seq++;
                st.ingresos.push({ id, nombre: 'Tu turno del cuchubal', emoji: '🤝', categoria: 'cuchubal', monto: p.recibes, aprox: false, frecuencia: 'unico', fecha: p.turno, lugar: 'efectivo', principal: false, extra: true, desde: st.hoy, llegadas: {} });
                x.turno = id;
            }
        }
    }
    function terminarOnboarding() {
        const st = P.st;
        const ob = P.ui.ob;
        const d = ob.datos;
        if (ob.completar) return terminarCompletar();
        st.nombre = (d.nombre || '').trim();
        st.espacio = st.nombre ? 'Hogar de ' + st.nombre : 'Tu hogar';
        // V2-45: cada banco y cada billetera es un lugar; cada banco trae su débito.
        const bancos = bancosOb(d);
        const billeteras = (d.billeteras || []).filter((b) => (b.nombre || '').trim()).map((b, i) => ({ ...b, id: 'billetera' + (i + 1) }));
        const bancoId = bancos[0] ? bancos[0].id : null;
        st.lugares = [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵' }];
        st.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }];
        for (const b of bancos) {
            st.lugares.push({ id: b.id, tipo: 'banco', nombre: b.nombre === 'Otro' ? 'Tu banco' : 'Banco ' + b.nombre, emoji: '🏦' });
            st.medios.push({ id: 'debito' + b.sufijo, nombre: 'Débito ' + (b.nombre === 'Otro' ? 'del banco' : b.nombre), emoji: '🏦', lugar: b.id, tarjetaDebito: true });
        }
        for (const b of billeteras) {
            st.lugares.push({ id: b.id, tipo: 'billetera', nombre: b.nombre.trim(), emoji: '📱' });
            st.medios.push({ id: 'm' + b.id, nombre: b.nombre.trim(), emoji: '📱', lugar: b.id });
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
        // V2-85: «No, todavía no» (la de este periodo no te ha llegado): se espera desde esa fecha; «Sí», ya está en lo que tienes.
        for (const [g, id] of [['quincena', 'quincena'], ['mes', 'mensual'], ['semana', 'semanal'], ['catorcena', 'catorcena'], ['remesa', 'remesa']]) {
            const fecha = antesIngresoOb(st, g, ing[g]);
            const i = st.ingresos.find((y) => y.id === id);
            if (fecha && i && ing[g].antesDebe === fecha) {
                Object.assign(i, { desde: fecha, desdeAntes: true });
                anotarDebe(st, `i:${id}:${fecha}`);
            }
        }
        // Si hoy es día de pago, la persona dijo si ya está contado en lo que tiene (nada se supone).
        if (d.hoyCayo === 'si') for (const i of st.ingresos) if (i.frecuencia !== 'unico' && M.fechasRegla(i, st.hoy, st.hoy).length) i.llegadas[st.hoy] = { monto: i.monto, enCuadre: true };
        if (ing.varia && !st.ingresos.some((i) => i.principal)) st.horizonteVariable = ing.varia.horizonte;
        const bancoDebito = (lugarId) => {
            const b = lugarId ? bancos.find((x) => x.id === lugarId) : bancos[0];
            return b ? 'debito' + b.sufijo : null;
        };
        // V2-85: cada pago empieza en el siguiente de su fecha de este periodo que ya pasó, salvo «No, todavía lo debo».
        agregarDeudasTarjetasPagos(st, d, { bancoDebito, medioCuota: bancoId ? 'debito' : 'efectivo', ob });
        st.configurado = true;
        P.ui.ob = null;
        P.ui.tab = 'hoy';
        P.ui.stack = [{ tipo: 'primerNumero' }];
        P.render({ nueva: true });
        P.emitir('onboarding:fin');
    }
    /** «Completar tu Primer día»: lo nuevo se suma a lo que hay (con «Deshacer»); lugares e ingresos no se tocan. */
    function terminarCompletar() {
        const d = P.ui.ob.datos;
        const n = d.deudas.length + d.tarjetas.length + d.pagos.length;
        const ob = P.ui.ob;
        P.ui.ob = null;
        if (!n) {
            P.render({ nueva: true });
            return;
        }
        P.cambiar(
            (s) => {
                const debito = (lugarId) => {
                    const m = s.medios.find((x) => x.tarjetaDebito && !x.oculto && (!lugarId || x.lugar === lugarId)) || (lugarId ? s.medios.find((x) => x.lugar === lugarId && !x.tarjeta) : null);
                    return m ? m.id : null;
                };
                const cuota = (s.medios.find((m) => m.id === 'transferencia') || s.medios.find((m) => m.tarjetaDebito) || s.medios[0]).id;
                agregarDeudasTarjetasPagos(s, d, { bancoDebito: debito, medioCuota: cuota, ob });
            },
            { aviso: `Agregamos ${n === 1 ? '1 cosa' : n + ' cosas'} a tu cuenta`, claves: ['onboarding:completar:fin'] },
        );
        P.ui.tab = 'midinero';
        P.ui.stack = [{ tipo: 'deudas' }];
        P.render({ nueva: true });
    }
    S.primerNumero = function () {
        const st = P.st;
        const k = P.calc();
        const pend = [];
        // V2-87: lo que pagas normalmente se paga como tus otros pagos (con qué ingreso, si no es con lo que tienes).
        for (const t of k.tarjetas) if (t.pendiente) pend.push(t.usual ? `Tu ${esc(t.t.nombre)}: por ahora contamos lo que pagas normalmente (${dinero(t.usual, { aprox: true })})${t.conIngreso > 0 ? `, con ${esc(P.fuentesTarjeta(t))}` : ''}. Tu día de corte y tu estado de cuenta te los pido antes de que venza.` : `Tu ${esc(t.t.nombre)}: la contamos cuando anotes tu estado de cuenta.`);
        if (!M.principal(st)) pend.push(st.horizonteVariable === 'quince' ? 'Como tu ingreso varía, vemos los próximos 15 días.' : 'Como tu ingreso varía, vemos hasta fin de mes.');
        if (!st.pagos.length) pend.push('Tus pagos fijos: agrégalos en Pagos cuando quieras.');
        else if (k.hz.ingreso && k.proxima && k.proxima.salePagos > 0) pend.push(`Lo que vence desde tu ${P.nombreIngreso(k.hz)} del ${M.partes(k.hz.fecha)[2]} se paga con ese ingreso: no baja tu número de hoy. Si quieres pagar algo con lo que ya tienes, cámbialo en ese pago.`);
        // V2-35: cómo quedas el próximo día de pago.
        if (k.hz.ingreso && k.proxima && (k.proxima.entra || k.proxima.pagos)) pend.push(`${esc(P.tituloPeriodo(k.proxima, k.hz))}: ${esc(P.lineaPeriodo(k.proxima))}${P.incluyePeriodo(k.proxima) ? ` (${esc(P.incluyePeriodo(k.proxima))})` : ''}.`);
        return `<div class="pg pg--flujo">
            <header class="pg-head"><p class="paso">¡Listo!</p><h1 class="h1" tabindex="-1">Tu primer número</h1><p class="sub">Es lo que puedes gastar ${esc(P.textoHorizonte(k.hz).split(" · ")[0].toLowerCase())} sin tocar tus pagos, tus deudas ni tus tarjetas.</p></header>
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
