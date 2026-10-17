// Producto v2 · prototipo. Motor de demostración: fechas, dinero en centavos, saldo por cuadre,
// libre hasta el próximo ingreso, reserva gradual, tarjeta, mes y el intérprete de reglas.
// No es el cálculo de producción: sirve para que la maqueta cambie sus números de verdad.
'use strict';
(() => {
    const D = window.DATOS;
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const VS16 = new RegExp(String.fromCharCode(0xfe0f), 'g');

    // ------------------------------------------------------------------ fechas
    const pad = (n) => String(n).padStart(2, '0');
    const aFecha = (iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    };
    const aIso = (date) => date.toISOString().slice(0, 10);
    const sumarDias = (iso, n) => {
        const d = aFecha(iso);
        d.setUTCDate(d.getUTCDate() + n);
        return aIso(d);
    };
    const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);
    const diaSemana = (iso) => aFecha(iso).getUTCDay();
    const partes = (iso) => iso.split('-').map(Number);
    const diasDelMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
    const fechaDe = (y, m, d) => `${y}-${pad(m)}-${pad(Math.min(d, diasDelMes(y, m)))}`;
    const mesMas = (y, m, n) => {
        const t = y * 12 + (m - 1) + n;
        return [Math.floor(t / 12), (t % 12) + 1];
    };
    const fechaCorta = (iso) => {
        const [, m, d] = partes(iso);
        return `${d} ${MESES_CORTOS[m - 1]}`;
    };
    const fechaLarga = (iso) => {
        const [, m, d] = partes(iso);
        return `${d} de ${MESES[m - 1]}`;
    };
    const conDia = (iso) => `${DIAS[diaSemana(iso)]} ${fechaLarga(iso)}`;
    const diaCorto = (iso) => `${DIAS_CORTOS[diaSemana(iso)]} ${partes(iso)[2]}`;
    function relativa(iso, hoy) {
        const n = diasEntre(hoy, iso);
        if (n === 0) return 'hoy';
        if (n === -1) return 'ayer';
        if (n === 1) return 'mañana';
        if (n < 0 && n > -7) return `hace ${-n} días`;
        if (n > 1 && n < 7) return `el ${DIAS[diaSemana(iso)]} ${partes(iso)[2]}`;
        return `el ${fechaCorta(iso)}`;
    }
    const haceDias = (iso, hoy) => {
        const n = diasEntre(iso, hoy);
        return n <= 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`;
    };
    /** El último día N que ya pasó o es hoy. */
    function ultimoDia(hoy, dia) {
        const [y, m] = partes(hoy);
        let f = fechaDe(y, m, dia);
        if (f > hoy) {
            const [py, pm] = mesMas(y, m, -1);
            f = fechaDe(py, pm, dia);
        }
        return f;
    }
    /** El próximo día N desde hoy (incluido). */
    function proximoDia(hoy, dia) {
        const [y, m] = partes(hoy);
        let f = fechaDe(y, m, dia);
        if (f < hoy) {
            const [ny, nm] = mesMas(y, m, 1);
            f = fechaDe(ny, nm, dia);
        }
        return f;
    }

    // ------------------------------------------------------------------ dinero (centavos)
    function dinero(c, { signo = false, aprox = false } = {}) {
        if (c === null || c === undefined) return '—';
        const neg = c < 0;
        const abs = Math.abs(c);
        const entero = Math.floor(abs / 100).toLocaleString('en-US');
        const cent = abs % 100;
        let s = '$' + entero + (aprox && cent === 0 ? '' : '.' + pad(cent));
        if (aprox) s = '~' + s;
        if (neg) return '−' + s;
        return (signo && c > 0 ? '+' : '') + s;
    }
    function leerMonto(texto) {
        if (texto === null || texto === undefined) return null;
        let t = String(texto).trim().replace(/[$\s]/g, '');
        if (!t) return null;
        if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');
        t = t.replace(/,/g, '');
        if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
        const [w, f = ''] = t.split('.');
        const cents = Number(w) * 100 + Number((f + '00').slice(0, 2));
        return cents > 999999999 ? null : cents;
    }
    const montoCampo = (c) => (c === null || c === undefined ? '' : (c / 100).toFixed(2));
    const suma = (lista, f = (x) => x) => lista.reduce((t, x) => t + f(x), 0);

    // ------------------------------------------------------------------ búsquedas
    const lugar = (st, id) => st.lugares.find((l) => l.id === id);
    const medio = (st, id) => st.medios.find((m) => m.id === id);
    const tarjeta = (st, id) => st.tarjetas.find((t) => t.id === id);
    const pago = (st, id) => st.pagos.find((p) => p.id === id);
    const ingreso = (st, id) => st.ingresos.find((i) => i.id === id);
    const apartado = (st, id) => st.apartados.find((a) => a.id === id);
    const categoria = (id) => D.CATEGORIAS.find((k) => k.id === id) || D.INGRESO_CATEGORIAS.find((k) => k.id === id) || D.CATEGORIAS.at(-1);
    const principal = (st) => st.ingresos.find((i) => i.principal && i.activo !== false);
    const sinVS = (s) => String(s).replace(VS16, '');

    // ------------------------------------------------------------------ saldo con la regla del cuadre
    const despues = (r, cu) => r.fecha > cu.fecha || (r.fecha === cu.fecha && r.seq > cu.seq);
    function efecto(st, r, lugarId) {
        if (r.tipo === 'gasto') {
            const m = medio(st, r.medio);
            return m && m.lugar === lugarId ? -r.monto : 0;
        }
        if (r.tipo === 'ingreso') return r.lugar === lugarId ? r.monto : 0;
        if (r.tipo === 'mover') return (r.de === lugarId ? -r.monto : 0) + (r.a === lugarId ? r.monto : 0);
        if (r.tipo === 'pagoTarjeta') return r.lugar === lugarId ? -r.monto : 0;
        return 0;
    }
    /** «Tu saldo parte de tu último cuadre»: lo anotado antes del cuadre no lo mueve. */
    function saldoLugar(st, lugarId) {
        const l = lugar(st, lugarId);
        if (!l || !l.cuadre) return 0;
        return st.registros.reduce((s, r) => (despues(r, l.cuadre) ? s + efecto(st, r, lugarId) : s), l.cuadre.monto);
    }
    /** Lugares que toca un registro (para avisar si es anterior a su último cuadre). */
    function lugaresDe(st, r) {
        if (r.tipo === 'gasto') {
            const m = medio(st, r.medio);
            return m && m.lugar ? [m.lugar] : [];
        }
        if (r.tipo === 'ingreso' || r.tipo === 'pagoTarjeta') return r.lugar ? [r.lugar] : [];
        if (r.tipo === 'mover') return [r.de, r.a].filter(Boolean);
        return [];
    }
    function anteriorAlCuadre(st, r) {
        return lugaresDe(st, r).map((id) => lugar(st, id)).filter((l) => l && l.cuadre && !despues(r, l.cuadre));
    }
    const tienes = (st) => suma(st.lugares, (l) => saldoLugar(st, l.id));
    const apartadoTotal = (st) => suma(st.apartados, (a) => a.monto);
    /** El último cuadre o anotación: para «Pongámonos al día». */
    function ultimaActividad(st) {
        return st.registros.reduce((f, r) => (r.fecha > f ? r.fecha : f), '2000-01-01');
    }

    // ------------------------------------------------------------------ reglas de fechas
    function fechasRegla(regla, desde, hasta) {
        const out = [];
        if (desde > hasta) return out;
        if (regla.frecuencia === 'unico') {
            if (regla.fecha >= desde && regla.fecha <= hasta) out.push(regla.fecha);
            return out;
        }
        if (regla.frecuencia === 'semanal') {
            let f = desde;
            while (diaSemana(f) !== regla.diaSemana) f = sumarDias(f, 1);
            for (; f <= hasta; f = sumarDias(f, 7)) out.push(f);
            return out;
        }
        let [y, m] = partes(desde);
        const [hy, hm] = partes(hasta);
        while (y < hy || (y === hy && m <= hm)) {
            const dias = regla.frecuencia === 'quincenal' ? [15, 30] : [regla.dia];
            for (const d of dias) {
                const f = fechaDe(y, m, d);
                if (f >= desde && f <= hasta && !out.includes(f)) out.push(f);
            }
            [y, m] = mesMas(y, m, 1);
        }
        return out.sort();
    }

    function ocurrenciasPago(st, p, desde, hasta) {
        const ini = desde > p.desde ? desde : p.desde;
        const fin = p.hasta && p.hasta < hasta ? p.hasta : hasta;
        return fechasRegla(p, ini, fin).map((fecha) => {
            const hecho = p.hechos[fecha];
            return { pago: p, fecha, monto: hecho && hecho.monto !== undefined ? hecho.monto : p.monto, estimado: !hecho && p.estimado, hecho, estado: hecho ? hecho.estado : fecha < st.hoy ? 'vencido' : 'pendiente' };
        });
    }
    function ocurrenciasIngreso(st, ing, desde, hasta) {
        const ini = desde > ing.desde ? desde : ing.desde;
        return fechasRegla(ing, ini, hasta).map((fecha) => {
            const llegada = ing.llegadas[fecha];
            return { ingreso: ing, fecha, monto: llegada ? llegada.monto : ing.monto, aprox: !llegada && ing.aprox, llegada, estado: llegada ? 'llego' : fecha < st.hoy ? 'porConfirmar' : fecha === st.hoy ? 'hoy' : 'esperado' };
        });
    }

    // ------------------------------------------------------------------ tarjeta
    function tarjetaInfo(st, t) {
        const ult = t.estados[t.estados.length - 1];
        const regs = st.registros;
        const pagos = regs.filter((r) => r.tipo === 'pagoTarjeta' && r.tarjeta === t.id && r.fecha > ult.corte);
        // Un pago marcado «aCompras» paga compras nuevas (por ejemplo, solo la laptop) y no el estado de cuenta.
        const pagado = suma(pagos.filter((r) => !r.aCompras), (r) => r.monto);
        const pagadoCompras = suma(pagos.filter((r) => r.aCompras), (r) => r.monto);
        const compras = regs.filter((r) => r.tipo === 'gasto' && medio(st, r.medio)?.tarjeta === t.id && r.fecha > ult.corte);
        const [cy, cm] = partes(ult.corte);
        const [ny, nm] = mesMas(cy, cm, 1);
        const proxCorte = fechaDe(ny, nm, t.corte);
        const [vy, vm] = mesMas(ny, nm, 1);
        // Una tarjeta recién agregada espera su primer estado de cuenta: el del corte que ya pasó.
        const pendiente = ult.inicial
            ? { corte: ult.corte, vence: ult.vence, anotado: 0 }
            : st.hoy > proxCorte
              ? { corte: proxCorte, vence: fechaDe(vy, vm, t.pagoDia), anotado: suma(compras.filter((r) => r.fecha <= proxCorte), (r) => r.monto) }
              : null;
        const porPagarEstado = Math.max(0, ult.aPagar - pagado);
        const comprasTotal = suma(compras, (r) => r.monto);
        // Lo pagado de más primero baja lo que quedó como deuda y luego las compras nuevas.
        const excedente = Math.max(0, pagado - ult.aPagar);
        const restoBruto = Math.max(0, ult.total - ult.aPagar);
        const resto = Math.max(0, restoBruto - excedente);
        const comprasNetas = Math.max(0, comprasTotal - Math.max(0, excedente - restoBruto) - pagadoCompras);
        const enLibre = porPagarEstado + comprasNetas;
        const debeTotal = Math.max(0, ult.total + comprasTotal - pagado - pagadoCompras);
        // Lo apartado que se usó con esta tarjeta queda reservado para pagarla (V2-27).
        const reservas = (st.reservasTarjeta || []).filter((x) => x.tarjeta === t.id);
        const reservado = Math.min(enLibre, suma(reservas, (x) => x.monto));
        const venceCompras = fechaDe(vy, vm, t.pagoDia);
        const cupoLibre = t.cupo ? Math.max(0, t.cupo - debeTotal) : null;
        // Sin estado de cuenta al agregarla, se le pide después del siguiente corte (V2-31 #8).
        const pedir = !!pendiente && !(ult.inicial && ult.esperarCorte && st.hoy <= proxCorte);
        // Dos pagos próximos de la misma tarjeta: el texto dice el mes (V2-31 #1).
        const dosPagos = porPagarEstado > 0 && comprasNetas > 0 && ult.vence !== venceCompras;
        return { t, ult, pagado, pagadoCompras, porPagarEstado, compras, comprasTotal, comprasNetas, pendiente, pedir, proxCorte, resto, enLibre, debeTotal, reservas, reservado, venceCompras, cupoLibre, dosPagos };
    }
    /** Pagos de tarjeta como ocurrencias de Pagos: el estado vigente y, si llegó otro, el pendiente. */
    function ocurrenciasTarjeta(st, desde, hasta) {
        const out = [];
        for (const t of st.tarjetas) {
            const info = tarjetaInfo(st, t);
            t.estados.forEach((e, i) => {
                if (e.inicial || e.vence < desde || e.vence > hasta) return;
                const ultimo = i === t.estados.length - 1;
                const pagadoE = ultimo ? info.pagado : e.aPagar;
                const estado = pagadoE >= e.aPagar ? 'pagado' : e.vence < st.hoy ? 'vencido' : 'pendiente';
                out.push({ tarjeta: t, fecha: e.vence, monto: e.aPagar, estado, estadoCuenta: e, info });
            });
            if (info.pendiente && info.pendiente.vence >= desde && info.pendiente.vence <= hasta) {
                out.push({ tarjeta: t, fecha: info.pendiente.vence, monto: null, estado: 'porConfirmar', info });
            }
        }
        return out;
    }

    // ------------------------------------------------------------------ horizonte, reservas y libre
    function horizonte(st) {
        const p = principal(st);
        if (!p) {
            const [y, m] = partes(st.hoy);
            if (st.horizonteVariable === 'quince') return { fecha: sumarDias(st.hoy, 15), modo: 'quince', dias: 15 };
            const fin = fechaDe(y, m, 31);
            return { fecha: sumarDias(fin, 1), modo: 'finDeMes', dias: diasEntre(st.hoy, fin) + 1, fin };
        }
        const pasadas = ocurrenciasIngreso(st, p, p.desde, st.hoy);
        const hoyPend = pasadas.find((o) => o.fecha === st.hoy && o.estado !== 'llego');
        const atrasadas = pasadas.filter((o) => o.estado === 'porConfirmar');
        const prox = ocurrenciasIngreso(st, p, sumarDias(st.hoy, 1), sumarDias(st.hoy, 70))[0];
        if (hoyPend) return { fecha: st.hoy, ingreso: p, ocurrencia: hoyPend, esHoy: true, atrasadas, dias: 0, siguiente: prox };
        // Un día de pago que ya pasó sin confirmar: el horizonte se queda ahí («Libre por ahora»).
        if (atrasadas.length) return { fecha: atrasadas.at(-1).fecha, ingreso: p, ocurrencia: atrasadas.at(-1), atrasada: true, atrasadas, dias: 0, siguiente: prox };
        return { fecha: prox.fecha, ingreso: p, ocurrencia: prox, atrasadas, dias: diasEntre(st.hoy, prox.fecha), siguiente: prox };
    }

    /**
     * Reserva gradual (V2-15, V2-26, V2-31 #7): para todo tipo de ingreso, cada pago mensual que vence
     * después del próximo ingreso se reparte entre los días de pago que caen antes de su vencimiento
     * (4 o 5 viernes; quincena 15 y 30 = mitad y mitad). `ideal` es lo
     * que debería ir guardado con los pagos que ya llegaron; `calcular` lo limita a lo que alcanza.
     */
    function reservas(st, hz) {
        const p = principal(st);
        if (!p || p.frecuencia === 'unico') return [];
        const out = [];
        for (const pg of st.pagos.filter((x) => x.activo !== false && x.frecuencia === 'mensual')) {
            const prox = ocurrenciasPago(st, pg, hz.fecha, sumarDias(hz.fecha, 40)).find((o) => o.estado === 'pendiente');
            if (!prox) continue;
            const [y, m] = partes(prox.fecha);
            const [py, pm] = mesMas(y, m, -1);
            const previa = fechaDe(py, pm, pg.dia);
            const pagos = fechasRegla(p, sumarDias(previa, 1), sumarDias(prox.fecha, -1));
            if (pagos.length < 2) continue;
            const recibidos = pagos.filter((f) => f <= st.hoy && (p.llegadas[f] || f < p.desde)).length;
            out.push({ pago: pg, fecha: prox.fecha, total: prox.monto, ideal: Math.round((prox.monto * recibidos) / pagos.length), porIngreso: Math.round(prox.monto / pagos.length), recibidos, cuantos: pagos.length, restantes: pagos.length - recibidos });
        }
        return out.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    }

    /** «~$ por día» (V2-29 #12): hacia abajo, dólares enteros desde $10 y centavos por debajo. */
    function porDiaDe(libre, dias) {
        if (!(dias > 0) || libre <= 0) return null;
        const x = libre / dias;
        return x >= 1000 ? Math.floor(x / 100) * 100 : Math.floor(x);
    }

    /** Apartado con fecha de meta vencida y dinero adentro: «¿Ya lo usaste?» (V2-23 c). */
    const apartadosVencidos = (st) => st.apartados.filter((a) => a.metaFecha && a.metaFecha < st.hoy && a.monto > 0);
    /** ¿Ese día cae el ingreso principal? (V2-29 #4: el pago de ese día cuenta en el periodo siguiente). */
    function esDiaDeIngreso(st, fecha) {
        const p = principal(st);
        return !!p && fechasRegla(p, fecha, fecha).length > 0;
    }

    function calcular(st) {
        const hz = horizonte(st);
        const t = tienes(st);
        const ap = apartadoTotal(st);
        const limite = sumarDias(hz.fecha, -1);
        const ayer = sumarDias(st.hoy, -1);
        const items = [];
        for (const p of st.pagos.filter((x) => x.activo !== false)) {
            for (const o of ocurrenciasPago(st, p, p.desde, limite > ayer ? limite : ayer)) {
                if (o.estado === 'pendiente' || o.estado === 'vencido') items.push(o);
            }
        }
        items.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
        const tarjetas = st.tarjetas.map((x) => tarjetaInfo(st, x));
        const porPagar = suma(items, (o) => o.monto);
        const enTarjetas = suma(tarjetas, (x) => x.enLibre);
        const reservadoTarjetas = suma(tarjetas, (x) => x.reservado);
        // Primero apartados, pagos y tarjetas; la reserva gradual toma lo que quede (V2-29 #5).
        const base = t - ap - porPagar - enTarjetas;
        const res = reservas(st, hz);
        let queda = Math.max(0, base);
        for (const r of res) {
            r.guardado = Math.min(r.ideal, queda);
            r.falta = r.ideal - r.guardado;
            queda -= r.guardado;
            // La cuota se recalcula con los días de pago que quedan antes del vencimiento.
            r.siguiente = r.restantes ? Math.ceil((r.total - r.guardado) / r.restantes) : r.total - r.guardado;
        }
        const guardando = suma(res, (r) => r.guardado);
        // Nunca negativo: lo que falta se dice en los avisos.
        const libre = Math.max(0, base - guardando);
        const porDia = porDiaDe(libre, hz.dias);
        const avisos = [];
        if (t < ap) avisos.push({ tipo: 'apartados', faltan: ap - t });
        let b = t - ap - enTarjetas;
        for (const o of items) {
            b -= o.monto;
            if (b < 0) {
                avisos.push({ tipo: 'faltaria', ocurrencia: o, faltan: Math.min(-b, o.monto) });
                break;
            }
        }
        for (const r of res) if (r.falta > 0) avisos.push({ tipo: 'reserva', reserva: r, faltan: r.falta });
        for (const x of tarjetas) if (x.pendiente && x.pedir) avisos.push({ tipo: 'estado', info: x });
        for (const a of apartadosVencidos(st)) avisos.push({ tipo: 'apartadoVencido', apartado: a });
        const inactivo = diasEntre(ultimaActividad(st), st.hoy);
        // «Pongámonos al día» (V2-29 #6): 10 días sin anotar ni cuadrar, o un día de pago sin confirmar.
        const alDia = !hz.esHoy && (inactivo >= 10 || (hz.atrasadas || []).length > 0);
        const falta = Math.max(0, -base) + suma(res, (r) => r.falta);
        return { hz, tienes: t, apartado: ap, items, porPagar, tarjetas, enTarjetas, reservadoTarjetas, reservas: res, guardando, base, deficit: Math.max(0, -base), falta, libre, porDia, avisos, inactivo, alDia };
    }

    // ------------------------------------------------------------------ mes
    function resumenMes(st, y, m) {
        const ini = `${y}-${pad(m)}-01`;
        const fin = fechaDe(y, m, 31);
        const regs = st.registros.filter((r) => r.fecha >= ini && r.fecha <= fin);
        const ingresos = regs.filter((r) => r.tipo === 'ingreso');
        const gastos = regs.filter((r) => r.tipo === 'gasto');
        const fijos = gastos.filter((r) => r.pago);
        const anotados = gastos.filter((r) => !r.pago);
        const porCategoria = {};
        for (const r of anotados) {
            porCategoria[r.categoria] = porCategoria[r.categoria] || { id: r.categoria, total: 0, n: 0 };
            porCategoria[r.categoria].total += r.monto;
            porCategoria[r.categoria].n++;
        }
        const tarjetaSinDetalle = suma(regs.filter((r) => r.tipo === 'cargoTarjeta'), (r) => r.monto);
        const cuadres = regs.filter((r) => r.tipo === 'cuadre');
        const sinDetalleSalio = suma(cuadres.filter((r) => r.monto < r.esperado), (r) => r.esperado - r.monto);
        const sinDetalleEntro = suma(cuadres.filter((r) => r.monto > r.esperado), (r) => r.monto - r.esperado);
        const entro = suma(ingresos, (r) => r.monto) + sinDetalleEntro;
        const salio = suma(gastos, (r) => r.monto) + tarjetaSinDetalle + sinDetalleSalio;
        return { y, m, ini, fin, regs, ingresos, fijos, anotados, porCategoria: Object.values(porCategoria).sort((a, b) => b.total - a.total), tarjetaSinDetalle, sinDetalleSalio, sinDetalleEntro, entro, salio, totalFijos: suma(fijos, (r) => r.monto), totalAnotados: suma(anotados, (r) => r.monto) };
    }

    /** El medio de siempre para un tipo de gasto: el más usado en sus últimas cinco anotaciones. */
    function medioUsual(st, categoriaId) {
        const recientes = st.registros.filter((r) => r.tipo === 'gasto' && r.categoria === categoriaId).slice(-5);
        if (recientes.length) {
            const cuenta = {};
            for (const r of recientes) cuenta[r.medio] = (cuenta[r.medio] || 0) + 1;
            const [id] = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
            if (medio(st, id)) return { id, seguro: true };
        }
        const k = categoria(categoriaId);
        if (k && k.medio && medio(st, k.medio)) return { id: k.medio, seguro: false };
        return { id: st.medios[0] ? st.medios[0].id : null, seguro: false };
    }

    // ------------------------------------------------------------------ intérprete de reglas (sin IA)
    const normalizar = (t) => String(t).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim();
    const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'para', 'por', 'un', 'una', 'que', 'a', 'al', 'y', 'mi', 'me', 'se', 'lo', 'le', 'dolares', 'dolar', 'usd', 'mis', 'su', 'pague', 'pagar', 'pagado', 'dia']);
    const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const INTENTOS = [
        ['pago', /^(acuerdame|recuerdame|recordame|recordarme|recordar|avisame|recordatorio)\b/],
        ['pagoTarjeta', /^(pague|abone|cancele)( a)? (la )?tarjeta\b/],
        ['ingreso', /^(me pagaron|me cayo|me cayeron|me depositaron|cobre|recibi|me mandaron|me enviaron|vendi|gane|me dieron|me llego|me llegaron)\b/],
        ['apartar', /^(aparte|apartar|guarde|ahorre|separe)\b/],
        ['liberar', /^(libere|liberar)\b/],
        ['cuadre', /^(tengo|me quedan|me queda)\b/],
        ['mover', /^(retire|saque|pase|transferi|movi|deposite)\b/],
        ['gasto', /^(gaste|compre|pague|me gaste|di)\b/],
    ];
    const coincide = (texto, nombre) => {
        const n = normalizar(nombre);
        return n && (` ${texto} `.includes(` ${n} `) || n.split(' ').some((w) => w.length > 3 && ` ${texto} `.includes(` ${w} `)));
    };

    function entender(st, original) {
        const d = { texto: original, tipo: null, monto: null, nombre: null, categoria: null, emoji: null, medio: null, medioSeguro: false, medioExplicito: false, lugar: null, de: null, a: null, tarjeta: null, fecha: st.hoy, dia: null, frecuencia: null, apartado: null, pago: null, ocurrencia: null, ingresoRef: null, sugerirApartado: null, usarApartado: null, comision: null, preguntarComision: false, entendido: false };
        let t = normalizar(original);
        if (!t) return d;
        // Intento por la primera palabra.
        for (const [tipo, re] of INTENTOS) {
            if (re.test(t)) {
                d.tipo = tipo;
                d.verbo = t.match(re)[0];
                break;
            }
        }
        if (d.verbo) t = t.slice(d.verbo.length).trim();
        // Fechas: «ayer», «el 12».
        if (/\bayer\b/.test(t)) {
            d.fecha = sumarDias(st.hoy, -1);
            t = t.replace(/\bayer\b/, ' ');
        }
        t = t.replace(/\bhoy\b/, ' ');
        const mDia = t.match(/\b(?:el|los|dia|cada)\s+(\d{1,2})\b/);
        if (mDia && +mDia[1] >= 1 && +mDia[1] <= 31) {
            d.dia = +mDia[1];
            t = t.replace(mDia[0], ' ');
        }
        // Medio dicho en el texto.
        const credito = st.medios.filter((m) => m.tarjeta);
        if (/\b(tarjeta|credito)\b/.test(t) && credito.length) {
            d.medio = credito[0].id;
            d.medioExplicito = true;
            t = t.replace(/\b(con )?(la )?(tarjeta|credito)( de credito)?\b/, ' ');
        } else if (/\bdebito\b/.test(t) && st.medios.some((m) => m.tarjetaDebito)) {
            d.medio = st.medios.find((m) => m.tarjetaDebito).id;
            d.medioExplicito = true;
            t = t.replace(/\b(con )?(la )?debito\b/, ' ');
        } else if (/\befectivo\b/.test(t) && st.medios.some((m) => m.id === 'efectivo')) {
            d.medio = 'efectivo';
            d.medioExplicito = true;
            t = t.replace(/\b(en |con )?efectivo\b/, ' ');
        } else if (/\btransferencia\b/.test(t) && st.medios.some((m) => m.id === 'transferencia')) {
            d.medio = 'transferencia';
            d.medioExplicito = true;
            t = t.replace(/\b(por |con )?transferencia\b/, ' ');
        }
        // Monto: el primer número que no es un día.
        const mMonto = t.match(/\$?\s*(\d{1,7}(?:[.,]\d{1,2})?)/);
        if (mMonto) {
            d.monto = leerMonto(mMonto[1]);
            t = t.replace(mMonto[0], ' ');
        }
        const palabras = t.replace(/[^a-z0-9ñ ]/g, ' ').split(' ').filter((w) => w && !STOP.has(w));
        const resto = palabras.join(' ');
        // El nombre conserva las tildes de lo que la persona escribió («Súper», no «Super»).
        const originales = {};
        for (const w of String(original).split(/\s+/)) {
            const limpio = w.replace(/[^\p{L}\p{N}]/gu, '');
            originales[normalizar(limpio)] = limpio.toLowerCase();
        }
        const nombreDe = (lista) => capital(lista.map((w) => originales[w] || w).join(' '));

        if (!d.tipo) {
            // Sin verbo: ¿es un pago que ya existe? ¿un pago fijo nuevo con día? ¿un gasto?
            const existente = st.pagos.find((p) => p.activo !== false && coincide(resto, p.nombre));
            if (existente && d.monto !== null) d.tipo = 'pagado';
            else if (existente && d.monto === null && d.dia === null) d.tipo = 'pagado';
            else if (d.dia !== null && D.PAGOS_FRECUENTES.some((f) => coincide(resto, f.nombre))) d.tipo = 'pago';
            else if (d.monto !== null) d.tipo = 'gasto';
            else if (resto && D.CATEGORIAS.some((x) => palabras.some((w) => x.palabras.includes(w)))) d.tipo = 'gasto';
            // Sin verbo, sin monto y sin una palabra conocida: no se adivina; se pregunta qué pasó.
            if (!d.tipo) d.nombre = nombreDe(palabras) || null;
        }
        if (d.tipo === 'gasto') {
            const existente = st.pagos.find((p) => p.activo !== false && coincide(resto, p.nombre));
            if (existente) d.tipo = 'pagado';
        }

        if (d.tipo === 'pagado') {
            const p = st.pagos.find((x) => x.activo !== false && coincide(resto, x.nombre));
            d.pago = p.id;
            d.nombre = p.nombre;
            d.emoji = p.emoji;
            d.categoria = p.categoria;
            const abiertas = ocurrenciasPago(st, p, sumarDias(st.hoy, -62), sumarDias(st.hoy, 12)).filter((o) => o.estado !== 'pagado' && o.estado !== 'saltado');
            const o = (d.dia !== null && abiertas.find((x) => partes(x.fecha)[2] === d.dia)) || abiertas[0];
            d.ocurrencia = o ? o.fecha : null;
            if (d.monto === null && o) d.monto = o.monto;
            if (d.dia !== null && o && o.fecha <= st.hoy) d.fecha = o.fecha;
            if (!d.medio) {
                d.medio = p.medio;
                d.medioSeguro = true;
            }
            if (!o) d.tipo = 'gasto';
        }
        if (d.tipo === 'pago') {
            const frecuente = D.PAGOS_FRECUENTES.find((f) => coincide(resto, f.nombre));
            d.nombre = frecuente ? frecuente.nombre : nombreDe(palabras) || null;
            d.emoji = frecuente ? frecuente.emoji : D.EMOJI_NOMBRE[palabras[0]] || '🧾';
            d.categoria = frecuente ? frecuente.categoria : 'otros';
            d.frecuencia = frecuente && frecuente.semanal ? 'semanal' : null;
            if (!d.medio) d.medio = medioUsual(st, d.categoria).id;
            const igual = st.pagos.find((p) => p.activo !== false && d.nombre && normalizar(p.nombre) === normalizar(d.nombre));
            d.duplicado = igual ? igual.id : null;
        }
        if (d.tipo === 'gasto') {
            const k = D.CATEGORIAS.find((x) => palabras.some((w) => x.palabras.includes(w))) || D.CATEGORIAS.find((x) => x.id === 'otros');
            d.categoria = k.id;
            d.nombre = nombreDe(palabras) || (k.id === 'otros' ? null : k.nombre);
            d.emoji = palabras.map((w) => D.EMOJI_NOMBRE[w]).find(Boolean) || k.emoji;
            if (!d.medio) {
                const u = medioUsual(st, k.id);
                d.medio = u.id;
                d.medioSeguro = u.seguro;
            }
            if (d.dia !== null) d.fecha = ultimoDia(st.hoy, d.dia);
            // Red del apartado olvidado (V2-23 a): si el gasto se llama como un apartado, se pregunta.
            const porNombre = st.apartados.find((a) => a.monto > 0 && coincide(resto, a.nombre));
            if (porNombre) {
                d.sugerirApartado = porNombre.id;
                d.apartadoPorNombre = true;
            } else if (k.emergencia) {
                const em = st.apartados.find((a) => normalizar(a.nombre).includes('emergencia') && a.monto > 0);
                if (em) d.sugerirApartado = em.id;
            }
        }
        if (d.tipo === 'ingreso') {
            const v = d.verbo;
            d.categoria = /vendi/.test(v) ? 'venta' : /mandaron|enviaron/.test(v) || /remesa/.test(resto) ? 'remesa' : /pagaron|cayo|cayeron|depositaron|cobre/.test(v) ? 'salario' : 'otro';
            const k = categoria(d.categoria);
            d.emoji = k.emoji;
            // ¿Es un ingreso esperado que llegó (o se adelantó)?
            if (d.monto !== null) {
                const candidatos = [];
                for (const ing of st.ingresos) {
                    for (const o of ocurrenciasIngreso(st, ing, sumarDias(st.hoy, -12), sumarDias(st.hoy, 12))) {
                        if (o.estado !== 'llego' && Math.abs(o.monto - d.monto) <= o.monto * 0.3) candidatos.push(o);
                    }
                }
                const o = candidatos.sort((a, b) => Math.abs(diasEntre(st.hoy, a.fecha)) - Math.abs(diasEntre(st.hoy, b.fecha)))[0];
                if (o && (d.categoria === 'salario' || d.categoria === 'otro' || o.ingreso.categoria === d.categoria)) {
                    d.ingresoRef = { id: o.ingreso.id, fecha: o.fecha };
                    d.nombre = o.ingreso.nombre;
                    d.emoji = o.ingreso.emoji;
                    d.lugar = o.ingreso.lugar;
                    // V2-29 #10: si no es el de hoy, se pregunta si es ese ingreso o uno extra.
                    d.preguntarIngreso = o.fecha !== st.hoy;
                    d.cualIngreso = null;
                }
            }
            if (!d.nombre) d.nombre = d.categoria === 'venta' ? (resto ? 'Venta de ' + nombreDe(palabras).toLowerCase() : 'Venta') : d.categoria === 'remesa' ? 'Remesa' : d.categoria === 'salario' ? 'Pago' : nombreDe(palabras) || 'Ingreso';
            if (!d.lugar) {
                const p = principal(st);
                d.lugar = d.categoria === 'venta' || d.categoria === 'remesa' ? (lugar(st, 'efectivo') ? 'efectivo' : st.lugares[0]?.id) : p ? p.lugar : st.lugares[0]?.id;
            }
        }
        if (d.tipo === 'apartar' || d.tipo === 'liberar') {
            const a = st.apartados.find((x) => coincide(resto, x.nombre));
            d.apartado = a ? a.id : null;
            d.nombre = a ? a.nombre : nombreDe(palabras) || null;
            // V2-29 #11: «aparté 20 luz» con la luz en Pagos: ya se descuenta sola; se pregunta.
            if (d.tipo === 'apartar' && !a) {
                const pg = st.pagos.find((p) => p.activo !== false && coincide(resto, p.nombre));
                if (pg) {
                    d.pagoParecido = pg.id;
                    d.apartarIgual = null;
                }
            }
        }
        if (d.tipo === 'cuadre') {
            const l = st.lugares.find((x) => coincide(resto, x.nombre) || (x.tipo === 'banco' && /\b(banco|cuenta)\b/.test(resto)));
            d.lugar = l ? l.id : st.lugares.length === 1 ? st.lugares[0].id : null;
        }
        if (d.tipo === 'pagoTarjeta') {
            d.tarjeta = st.tarjetas[0] ? st.tarjetas[0].id : null;
            const banco = st.lugares.find((x) => x.tipo === 'banco');
            d.lugar = banco ? banco.id : st.lugares[0]?.id;
            d.nombre = d.tarjeta ? 'Pago de ' + tarjeta(st, d.tarjeta).nombre : 'Pago de tarjeta';
        }
        if (d.tipo === 'mover') {
            const banco = st.lugares.find((x) => x.tipo === 'banco');
            if (/\bcajero\b/.test(resto) || /^(retire|saque)/.test(d.verbo)) {
                d.de = banco ? banco.id : null;
                d.a = lugar(st, 'efectivo') ? 'efectivo' : null;
                d.preguntarComision = true;
            } else {
                const mDeA = resto.match(/(?:de |desde )?(\w+)(?: a | al | para )(\w+)/);
                if (mDeA) {
                    const busca = (w) => st.lugares.find((x) => normalizar(x.nombre).includes(w) || (w === 'banco' && x.tipo === 'banco'));
                    d.de = busca(mDeA[1])?.id || null;
                    d.a = busca(mDeA[2])?.id || null;
                }
            }
            d.nombre = 'Mover dinero';
        }
        d.entendido = d.tipo !== null && d.monto !== null;
        return d;
    }

    /** Lo que todavía falta para guardar un borrador. */
    function faltan(st, d) {
        const f = [];
        if (!d.tipo) return ['tipo'];
        if (d.monto === null || d.monto <= 0) f.push('monto');
        if (d.tipo === 'gasto' && !d.medio) f.push('medio');
        if (d.tipo === 'gasto' && !d.nombre) f.push('nombre');
        if (d.tipo === 'pago') {
            if (!d.nombre) f.push('nombre');
            if (!d.frecuencia) f.push('frecuencia');
            if (d.frecuencia !== 'semanal' && d.dia === null) f.push('dia');
        }
        if (d.tipo === 'ingreso' && !d.lugar) f.push('lugar');
        if (d.tipo === 'ingreso' && d.ingresoRef && d.preguntarIngreso && !d.cualIngreso) f.push('cualIngreso');
        if (d.tipo === 'apartar' && d.pagoParecido && d.apartarIgual !== 'si') f.push('apartarIgual');
        if ((d.tipo === 'apartar' || d.tipo === 'liberar') && !d.apartado) f.push('apartado');
        if (d.tipo === 'cuadre' && !d.lugar) f.push('lugar');
        if (d.tipo === 'mover' && (!d.de || !d.a || d.de === d.a)) f.push('mover');
        return f;
    }

    window.MOTOR = {
        MESES, MESES_CORTOS, DIAS, DIAS_CORTOS, pad, sumarDias, diasEntre, diaSemana, partes, diasDelMes, fechaDe, mesMas, fechaCorta, fechaLarga, conDia, diaCorto, relativa, haceDias, ultimoDia, proximoDia,
        dinero, leerMonto, montoCampo, suma, lugar, medio, tarjeta, pago, ingreso, apartado, categoria, principal, sinVS,
        despues, saldoLugar, anteriorAlCuadre, lugaresDe, tienes, apartadoTotal, ultimaActividad, fechasRegla, ocurrenciasPago, ocurrenciasIngreso, tarjetaInfo, ocurrenciasTarjeta,
        horizonte, reservas, calcular, resumenMes, medioUsual, normalizar, entender, faltan, capital, porDiaDe, apartadosVencidos, esDiaDeIngreso, coincide,
    };
})();
