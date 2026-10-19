// Producto v2 · prototipo. Motor de demostración: fechas, dinero en centavos, saldo por cuadre,
// libre hasta el próximo ingreso, «Lo pagas con» (cada pago se paga con un día de pago que elige la
// persona, V2-34), proyección de la próxima quincena (V2-35), tarjeta, mes y el intérprete de reglas.
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
        // Un estimado se escribe «~$597», nunca «+~$597».
        return (signo && c > 0 && !aprox ? '+' : '') + s;
    }
    function leerMonto(texto, sinTope = false) {
        if (texto === null || texto === undefined) return null;
        let t = String(texto).trim().replace(/[$\s]/g, '');
        if (!t) return null;
        // v2.6.1 (QA D-01): «1.000,50» (miles con punto y centavos con coma) y «.5» (sin el cero) también se leen bien.
        if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
        if (/^[.,]\d{1,2}$/.test(t)) t = '0.' + t.slice(1);
        if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');
        t = t.replace(/,/g, '');
        if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
        const [w, f = ''] = t.split('.');
        const cents = Number(w) * 100 + Number((f + '00').slice(0, 2));
        return cents > MONTO_MAX && !sinTope ? null : cents;
    }
    /** v2.6.1 (QA F-02): el monto se entiende pero pasa del tope: el campo lo dice con el tope, no «Escribe el monto». */
    const montoExcede = (texto) => (leerMonto(texto, true) ?? 0) > MONTO_MAX;
    /** Tope razonable para cualquier monto que se escribe: $1,000,000.00. */
    const MONTO_MAX = 100000000;
    /** «Hoy» en la zona horaria del teléfono (modo uso normal). */
    function hoyLocal(ahora = new Date()) {
        return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
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

    // ------------------------------------------------------------------ reglas de fechas (V2-36)
    /**
     * Fechas de una regla entre `desde` y `hasta` (incluidas). Frecuencias: una vez (`fecha`),
     * semanal (`diaSemana`), cada 2 semanas (`catorcenal`, `fecha` = una de ellas), quincenal (`dias`),
     * mensual (`dia`), cada N meses (`meses`: `cadaMeses` y `fecha` = una de ellas) y fechas a medida
     * (`fechas`). Un día 29, 30 o 31 en un mes más corto cae el último día del mes (fechaDe lo ajusta).
     */
    function fechasRegla(regla, desde, hasta) {
        const out = [];
        if (desde > hasta) return out;
        const fr = regla.frecuencia;
        if (fr === 'unico') {
            if (regla.fecha >= desde && regla.fecha <= hasta) out.push(regla.fecha);
            return out;
        }
        if (fr === 'fechas') return [...new Set((regla.fechas || []).filter((f) => f >= desde && f <= hasta))].sort();
        if (fr === 'catorcenal') {
            const ancla = regla.fecha || desde;
            const k = Math.ceil(diasEntre(ancla, desde) / 14);
            for (let f = sumarDias(ancla, k * 14); f <= hasta; f = sumarDias(f, 14)) out.push(f);
            return out;
        }
        if (fr === 'semanal') {
            let f = desde;
            while (diaSemana(f) !== regla.diaSemana) f = sumarDias(f, 1);
            for (; f <= hasta; f = sumarDias(f, 7)) out.push(f);
            return out;
        }
        const ancla = fr === 'meses' && regla.fecha ? partes(regla.fecha) : null;
        const cada = fr === 'meses' ? Math.max(1, regla.cadaMeses || 12) : 1;
        let [y, m] = partes(desde);
        const [hy, hm] = partes(hasta);
        while (y < hy || (y === hy && m <= hm)) {
            const salto = ancla ? (y * 12 + m - (ancla[0] * 12 + ancla[1])) % cada : 0;
            if (salto === 0) {
                const dias = fr === 'quincenal' ? regla.dias || [15, 30] : [ancla ? ancla[2] : regla.dia];
                for (const d of dias) {
                    const f = fechaDe(y, m, d);
                    if (f >= desde && f <= hasta && !out.includes(f)) out.push(f);
                }
            }
            [y, m] = mesMas(y, m, 1);
        }
        return out.sort();
    }
    /** Un pago «el mismo día que me pagan» usa las fechas de ese ingreso (V2-36). */
    function reglaPago(st, p) {
        if (p.frecuencia !== 'ingreso') return p;
        return ingreso(st, p.conIngreso) || principal(st) || { frecuencia: 'fechas', fechas: [] };
    }

    function ocurrenciasPago(st, p, desde, hasta) {
        const ini = desde > p.desde ? desde : p.desde;
        const fin = p.hasta && p.hasta < hasta ? p.hasta : hasta;
        return fechasRegla(reglaPago(st, p), ini, fin).map((fecha) => {
            const hecho = p.hechos[fecha];
            return { pago: p, fecha, monto: hecho && hecho.monto !== undefined ? hecho.monto : p.monto, estimado: !hecho && p.estimado, hecho, estado: hecho ? hecho.estado : fecha < st.hoy ? 'vencido' : 'pendiente' };
        });
    }
    function ocurrenciasIngreso(st, ing, desde, hasta) {
        const ini = desde > ing.desde ? desde : ing.desde;
        return fechasRegla(ing, ini, hasta).map((fecha) => {
            const llegada = ing.llegadas[fecha];
            const estado = llegada ? (llegada.noLlego ? 'noLlego' : 'llego') : fecha < st.hoy ? 'porConfirmar' : fecha === st.hoy ? 'hoy' : 'esperado';
            // Adelanto de salario: lo esperado ya viene con el descuento (nunca se cuenta el mismo dinero dos veces).
            const descuento = llegada ? 0 : descuentoAdelanto(st, ing.id, fecha);
            return { ingreso: ing, fecha, monto: llegada ? llegada.monto : Math.max(0, ing.monto - descuento), descuento, aprox: !llegada && ing.aprox, llegada, estado };
        });
    }

    /**
     * Adelanto de salario (corrección v2.3.1): un ingreso de una vez marcado como adelanto dice de qué pago(s)
     * de qué ingreso te lo descuentan (`adelanto.descuentos`: ingreso, fecha, monto). Si el adelanto no va a
     * llegar, no hay descuento.
     */
    function descuentoAdelanto(st, ingresoId, fecha) {
        let total = 0;
        for (const a of st.ingresos) {
            if (a.activo === false || !a.adelanto || !Array.isArray(a.adelanto.descuentos)) continue;
            const l = a.llegadas && a.llegadas[a.fecha];
            if (l && l.noLlego) continue;
            for (const d of a.adelanto.descuentos) if (d.ingreso === ingresoId && d.fecha === fecha) total += Math.max(0, d.monto || 0);
        }
        return total;
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
        // V2-54: la tarjeta del primer día no tiene día de corte hasta su primer estado de cuenta.
        const sinCorte = !t.corte;
        const [cy, cm] = partes(ult.corte);
        const [ny, nm] = mesMas(cy, cm, 1);
        const proxCorte = sinCorte ? null : fechaDe(ny, nm, t.corte);
        const [vy, vm] = sinCorte ? mesMas(...partes(ult.vence).slice(0, 2), 1) : mesMas(ny, nm, 1);
        // Una tarjeta recién agregada espera su primer estado de cuenta: el del corte que ya pasó.
        // V2-43 (corrección v2.3.1): una tarjeta agregada después de empezar no muestra un pago de antes de que
        // empezaras (ni de antes de agregarla): espera su siguiente corte.
        const desdeT = inicioDe(st) > (t.desde || '') ? inicioDe(st) : t.desde;
        const siguiente = ult.inicial && !sinCorte && ult.vence < desdeT;
        const pendiente = siguiente
            ? { corte: proxCorte, vence: fechaDe(vy, vm, t.pagoDia), anotado: suma(compras.filter((r) => r.fecha <= proxCorte), (r) => r.monto), siguiente: true }
            : ult.inicial
            ? { corte: sinCorte ? null : ult.corte, vence: ult.vence, anotado: 0 }
            : !sinCorte && st.hoy > proxCorte
              ? { corte: proxCorte, vence: fechaDe(vy, vm, t.pagoDia), anotado: suma(compras.filter((r) => r.fecha <= proxCorte), (r) => r.monto) }
              : null;
        const porPagarEstado = Math.max(0, ult.aPagar - pagado);
        // V2-54: hasta su primer estado de cuenta cuenta lo que la persona dijo que paga normalmente (estimado).
        const usual = ult.inicial && t.pagoUsual ? t.pagoUsual : 0;
        const estimado = Math.max(0, usual - pagado);
        const comprasTotal = suma(compras, (r) => r.monto);
        // Lo pagado de más primero baja lo que quedó como deuda y luego las compras nuevas.
        const excedente = Math.max(0, pagado - ult.aPagar - usual);
        const restoBruto = Math.max(0, ult.total - ult.aPagar);
        const resto = Math.max(0, restoBruto - excedente);
        const comprasNetas = Math.max(0, comprasTotal - Math.max(0, excedente - restoBruto) - pagadoCompras);
        const enLibre = porPagarEstado + estimado + comprasNetas;
        // Lo que debe de verdad no se sabe hasta su primer estado de cuenta: el estimado no cuenta como deuda.
        const debeTotal = Math.max(0, ult.total + comprasTotal - Math.max(0, pagado - usual) - pagadoCompras);
        // Lo apartado que se usó con esta tarjeta queda reservado para pagarla (V2-27).
        const reservas = (st.reservasTarjeta || []).filter((x) => x.tarjeta === t.id);
        const reservado = Math.min(enLibre, suma(reservas, (x) => x.monto));
        const venceCompras = fechaDe(vy, vm, t.pagoDia);
        const cupoLibre = t.cupo ? Math.max(0, t.cupo - debeTotal) : null;
        // Sin estado de cuenta al agregarla, se le pide después del siguiente corte (V2-31 #8). Sin día de
        // corte (V2-54), se le pide con su estado de cuenta desde 10 días antes de que venza.
        const pedir = !!pendiente && (sinCorte ? st.hoy >= sumarDias(ult.vence, -10) : siguiente ? st.hoy > pendiente.corte : !(ult.inicial && ult.esperarCorte && st.hoy <= proxCorte));
        // Dos pagos próximos de la misma tarjeta: el texto dice el mes (V2-31 #1).
        const dosPagos = porPagarEstado + estimado > 0 && comprasNetas > 0 && ult.vence !== venceCompras;
        return { t, ult, pagado, pagadoCompras, porPagarEstado, usual, estimado, sinCorte, compras, comprasTotal, comprasNetas, pendiente, pedir, proxCorte, resto, enLibre, debeTotal, reservas, reservado, venceCompras, cupoLibre, dosPagos };
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
                // V2-54: con lo que paga normalmente, el pago se ve (estimado) y se puede marcar Pagado.
                if (info.usual) {
                    const pagadoYa = info.pagado >= info.usual;
                    out.push({ tarjeta: t, fecha: info.pendiente.vence, monto: pagadoYa ? info.pagado : info.usual, estimado: !pagadoYa, estado: pagadoYa ? 'pagado' : info.pendiente.vence < st.hoy ? 'vencido' : 'pendiente', info });
                } else out.push({ tarjeta: t, fecha: info.pendiente.vence, monto: null, estado: 'porConfirmar', info });
            }
        }
        return out;
    }

    // ------------------------------------------------------------------ periodos, «Lo pagas con» y libre (V2-34, V2-35)
    /** El día en que la persona empezó a usar la app: antes de eso no hay historia (V2-43). */
    const inicioDe = (st) => st.inicio || '0000-01-01';
    /** Los días de pago (los del ingreso principal) entre dos fechas: es el calendario, sin importar desde cuándo se lleva. */
    function cortes(st, desde, hasta) {
        const p = principal(st);
        return p ? fechasRegla(p, desde, hasta) : [];
    }
    const corteAntes = (st, f) => cortes(st, sumarDias(f, -100), sumarDias(f, -1)).at(-1) || null;
    const corteDespues = (st, f) => cortes(st, sumarDias(f, 1), sumarDias(f, 100))[0] || null;
    /**
     * ¿El dinero de ese día de pago ya está en lo que tienes? Sí si la persona confirmó que llegó (o
     * que no va a llegar: cuenta con $0), o si es de antes de que empezara a llevar ese ingreso: ese
     * dinero ya está en su primer cuadre. Nunca se inventa una llegada (V2-43).
     */
    function fundado(st, fecha) {
        const p = principal(st);
        if (!p) return fecha <= st.hoy;
        const desde = inicioDe(st) > (p.desde || '') ? inicioDe(st) : p.desde;
        return fecha < desde || !!p.llegadas[fecha];
    }
    /**
     * V2-52: un ingreso de una vez (aguinaldo, Quincena 25, bono) también puede ser «Lo pagas con»:
     * su clave es 'unico:<id>'. No cuenta hasta que llega; cuando llega, ya está en lo que tienes.
     */
    const esUnico = (k) => typeof k === 'string' && k.startsWith('unico:');
    const ingresoDeClave = (st, k) => (esUnico(k) ? ingreso(st, k.slice(6)) || null : null);
    function llegoUnico(st, ing) {
        const l = ing && ing.llegadas && ing.llegadas[ing.fecha];
        return !!(l && !l.noLlego);
    }
    /** Los ingresos de una vez que todavía no llegan y caen en o antes de `fecha`. */
    const unicosPara = (st, fecha) =>
        st.ingresos
            .filter((i) => i.activo !== false && i.frecuencia === 'unico' && i.fecha && i.fecha <= fecha && !(i.llegadas && i.llegadas[i.fecha]))
            .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))
            .map((i) => 'unico:' + i.id);
    /** 'ahora' es lo que ya tienes; 'despues', lo que tengas cuando venza (sin ingreso principal). */
    const esFundado = (st, clave) => clave === 'ahora' || (esUnico(clave) ? llegoUnico(st, ingresoDeClave(st, clave)) : clave !== 'despues' && fundado(st, clave));

    function horizonte(st) {
        const p = principal(st);
        if (!p) {
            const [y, m] = partes(st.hoy);
            if (st.horizonteVariable === 'quince') return { fecha: sumarDias(st.hoy, 15), modo: 'quince', dias: 15, atrasadas: [] };
            const fin = fechaDe(y, m, 31);
            return { fecha: sumarDias(fin, 1), modo: 'finDeMes', dias: diasEntre(st.hoy, fin) + 1, fin, atrasadas: [] };
        }
        // El periodo actual empieza en el último día de pago cuyo dinero ya tienes.
        const pasados = cortes(st, sumarDias(st.hoy, -120), st.hoy);
        let inicioPeriodo = pasados.filter((f) => fundado(st, f)).at(-1) || null;
        const ocurrencia = (f) => {
            const descuento = descuentoAdelanto(st, p.id, f);
            return { ingreso: p, fecha: f, monto: Math.max(0, p.monto - descuento), descuento, aprox: p.aprox, estado: f === st.hoy ? 'hoy' : f < st.hoy ? 'porConfirmar' : 'esperado' };
        };
        const pendientes = pasados.filter((f) => (!inicioPeriodo || f > inicioPeriodo) && !fundado(st, f));
        const atrasadas = pendientes.filter((f) => f < st.hoy).map(ocurrencia);
        let sig = corteDespues(st, st.hoy) || sumarDias(st.hoy, 30);
        // Revisión v2.3: si el próximo día de pago ya llegó (adelantado), ese periodo ya empezó y el horizonte pasa al siguiente.
        for (let i = 0; i < 6 && !pendientes.length && fundado(st, sig); i++) {
            inicioPeriodo = sig;
            sig = corteDespues(st, sig) || sumarDias(sig, 30);
        }
        const siguiente = ocurrencia(sig);
        const base = { ingreso: p, inicioPeriodo, atrasadas, siguiente };
        if (pendientes.includes(st.hoy)) return { ...base, fecha: st.hoy, ocurrencia: ocurrencia(st.hoy), esHoy: true, dias: 0 };
        // Un día de pago que ya pasó sin confirmar: el horizonte se queda ahí («Libre por ahora», V2-29 #3).
        if (atrasadas.length) return { ...base, fecha: atrasadas.at(-1).fecha, ocurrencia: atrasadas.at(-1), atrasada: true, dias: 0 };
        return { ...base, fecha: sig, ocurrencia: siguiente, dias: diasEntre(st.hoy, sig) };
    }

    /** El día de pago con que se paga, por defecto, lo que vence en `fecha`: el último que llega en o antes de esa fecha (V2-34; el mismo día cuenta para ese ingreso, V2-29 #4). */
    function periodoDe(st, fecha, hz = null) {
        if (!principal(st)) return fecha < (hz || horizonte(st)).fecha ? 'ahora' : 'despues';
        return cortes(st, sumarDias(fecha, -100), fecha).at(-1) || 'ahora';
    }
    /**
     * Revisión v2.3: una clave guardada (lo elegido en «Lo pagas con» o en «Pasar a la próxima») que ya no
     * es un día de pago (porque cambió el ingreso principal) se lleva al día de pago que le toca. Así nada
     * de lo reservado se pierde.
     */
    function claveVigente(st, k, hz = null) {
        if (!k || k === 'ahora' || k === 'despues' || esUnico(k)) return k;
        // v2.6.1 (QA B-I1, bug contra V2-34 y la revisión v2.3): sin ingreso principal (se eliminó), un día de pago elegido
        // ya no existe: pasa a lo que le toca (lo que tienes o lo que tengas cuando venza), no desaparece del libre.
        if (!principal(st)) return periodoDe(st, k, hz);
        if (cortes(st, k, k).length) return k;
        // El día de pago nuevo más cercano (si empatan, el más tarde).
        const cerca = cortes(st, sumarDias(k, -16), sumarDias(k, 16)).sort((a, b) => Math.abs(diasEntre(k, a)) - Math.abs(diasEntre(k, b)) || (a < b ? 1 : -1))[0];
        return cerca || periodoDe(st, k, hz);
    }
    /**
     * Con qué se puede pagar algo que vence en `fecha`: lo que ya tienes, un día de pago que llega antes
     * o (V2-52) un ingreso de una vez que llega antes. El de por defecto siempre va al final.
     */
    function fuentesPara(st, fecha, hz = null) {
        const def = periodoDe(st, fecha, hz);
        let lista;
        if (!principal(st)) lista = def === 'ahora' ? ['ahora'] : ['ahora', 'despues'];
        else {
            lista = ['ahora'];
            for (const f of cortes(st, sumarDias(st.hoy, -120), def)) if (!fundado(st, f)) lista.push(f);
        }
        lista.splice(lista.length - 1, 0, ...unicosPara(st, fecha));
        return lista;
    }
    /**
     * «Lo pagas con» de una ocurrencia (V2-34): lo que la persona eligió para esa fecha
     * (`asignaciones`); si no, su regla (`pagarCon`: «un día de pago antes» o «repartirlo parejo»);
     * si no, el día de pago por defecto. Lo que no cubren los montos elegidos va al de por defecto.
     */
    function asignacion(st, p, fecha, monto, hz = null) {
        const def = periodoDe(st, fecha, hz);
        const elegido = p.asignaciones && p.asignaciones[fecha];
        const regla = principal(st) ? p.pagarCon : null;
        let lista = [];
        if (Array.isArray(elegido) && elegido.length) {
            let resta = monto;
            for (const x of elegido) {
                const m = Math.min(resta, Math.max(0, x.monto || 0));
                // Nunca con un ingreso que llega después de que vence (ni con uno de una vez que ya no está).
                const de = claveVigente(st, x.de, hz);
                const ing = ingresoDeClave(st, de);
                const vale = esUnico(de) ? !!ing && ing.activo !== false && ing.fecha <= fecha : de === 'ahora' || de === 'despues' || de <= fecha;
                if (m > 0) lista.push({ de: vale ? de : def, monto: m });
                resta -= m;
            }
            if (resta > 0) lista.push({ de: def, monto: resta });
        } else if (regla && regla.modo === 'antes') {
            lista = [{ de: corteAntes(st, def) || def, monto }];
        } else if (regla && regla.modo === 'parejo') {
            // Partes iguales entre los días de pago de su ciclo, desde el periodo en que lo elegiste.
            const previa = fechasRegla(reglaPago(st, p), sumarDias(fecha, -400), sumarDias(fecha, -1)).at(-1);
            const desdeCiclo = previa ? periodoDe(st, previa, hz) : def;
            let claves = cortes(st, sumarDias(desdeCiclo, 1), def).filter((f) => !regla.desde || f >= regla.desde);
            if (!claves.length) claves = [def];
            const cuota = Math.floor(monto / claves.length);
            lista = claves.map((de, i) => ({ de, monto: i === claves.length - 1 ? monto - cuota * (claves.length - 1) : cuota }));
        } else lista = [{ de: def, monto }];
        const junto = [];
        for (const x of lista) {
            const y = junto.find((z) => z.de === x.de);
            if (y) y.monto += x.monto;
            else junto.push({ ...x });
        }
        return junto;
    }

    /** «~$ por día» (V2-29 #12): hacia abajo; dólares enteros desde $10 y, por debajo, de 10 en 10 centavos («~$7.90»). */
    function porDiaDe(libre, dias) {
        if (!(dias > 0) || libre <= 0) return null;
        const x = libre / dias;
        return x >= 1000 ? Math.floor(x / 100) * 100 : Math.floor(x / 10) * 10;
    }

    /** Apartado con fecha de meta vencida y dinero adentro: «¿Ya lo usaste?» (V2-23 c). */
    const apartadosVencidos = (st) => st.apartados.filter((a) => a.metaFecha && a.metaFecha < st.hoy && a.monto > 0);
    /** ¿Ese día cae el ingreso principal? (V2-29 #4: el pago de ese día se paga con ese ingreso). */
    const esDiaDeIngreso = (st, fecha) => cortes(st, fecha, fecha).length > 0;
    /** Ingresos que se repiten (el principal y otros, como el de la pareja). Los de una vez no se cuentan por adelantado. */
    const recurrentes = (st) => st.ingresos.filter((i) => i.activo !== false && i.frecuencia !== 'unico');
    /** Descuentos del salario (V2-38): cuotas que se pagan solas al confirmar ese ingreso. */
    const descuentosDe = (st, ingresoId) => st.pagos.filter((p) => p.activo !== false && p.descuento === ingresoId);

    /**
     * Los próximos días de pago (V2-35): cuánto entra (estimado, también lo de otros ingresos del
     * periodo), cuánto se paga con ese dinero y cuánto quedaría. `deficit` mira el saldo día por día:
     * si algo vence antes de que llegue otro ingreso del periodo, también falta.
     */
    /**
     * Lo reservado para un próximo día de pago (V2-35, «Pasar a la próxima») y, revisión v2.3, lo de otro
     * ingreso (la pareja) que llegó antes de su día de pago: es de ese periodo, salvo que la persona diga
     * «Usarlo desde ya» (`usarYa`).
     */
    function reservasDe(st, hz) {
        const out = (st.reservas || []).map((r) => ({ ...r, de: claveVigente(st, r.de, hz), para: claveVigente(st, r.para, hz) }));
        if (!principal(st)) return out;
        for (const ing of recurrentes(st)) {
            if (ing.principal) continue;
            for (const [f, l] of Object.entries(ing.llegadas || {})) {
                if (!l || l.noLlego || l.usarYa || l.enCuadre || !(l.monto > 0) || f < hz.fecha) continue;
                const para = periodoDe(st, f, hz);
                if (!esFundado(st, para)) out.push({ id: `adelanto:${ing.id}:${f}`, de: 'ahora', para, monto: l.monto, adelanto: { ingreso: ing, fecha: f } });
            }
        }
        return out;
    }
    function proyectar(st, hz, futuro, reservas, cuantos = 6) {
        const armar = (clave, ini, fin) => {
            // Corrección v2.3.1: todos los ingresos esperados del periodo, también los de una vez (adelanto,
            // aguinaldo, bono), como estimados. «No suma hasta que llegue» es solo para el libre de hoy.
            const ingresos = [];
            for (const ing of st.ingresos.filter((i) => i.activo !== false)) for (const o of ocurrenciasIngreso(st, ing, ini, fin)) if (o.estado !== 'llego' && o.estado !== 'noLlego') ingresos.push(o);
            const resIn = reservas.filter((r) => r.para === clave);
            const resOut = reservas.filter((r) => r.de === clave);
            // V2-52: lo que pagas con un ingreso de una vez va en el periodo de ese ingreso.
            const deUnicos = Object.keys(futuro).filter((k) => {
                const ing = ingresoDeClave(st, k);
                return !!ing && ing.fecha >= ini && ing.fecha <= fin;
            });
            const lista = [...(futuro[clave] || []).filter((x) => clave !== 'despues' || x.fecha <= fin), ...deUnicos.flatMap((k) => futuro[k])].sort((a, z) => (a.fecha < z.fecha ? -1 : a.fecha > z.fecha ? 1 : 0));
            const entraIng = suma(ingresos, (o) => o.monto);
            const entraRes = suma(resIn, (r) => r.monto);
            const salePagos = suma(lista, (x) => x.parte);
            const saleRes = suma(resOut, (r) => r.monto);
            const eventos = [...ingresos.map((o) => ({ f: o.fecha, m: o.monto })), { f: ini, m: entraRes }, ...lista.map((x) => ({ f: x.fecha < ini ? ini : x.fecha > fin ? fin : x.fecha, m: -x.parte, x })), { f: fin, m: -saleRes }].sort((a, z) => (a.f < z.f ? -1 : a.f > z.f ? 1 : z.m - a.m));
            let saldo = 0;
            let minimo = 0;
            let cuando = null;
            let primero = null;
            for (const e of eventos) {
                saldo += e.m;
                if (saldo < minimo) {
                    minimo = saldo;
                    cuando = e.f;
                    if (!primero && e.x) primero = e.x;
                }
            }
            const adelantos = resIn.filter((r) => r.adelanto);
            const quedan = entraIng + entraRes - salePagos - saleRes;
            // Antes de la v2.4: si el total alcanza pero un pago vence antes de que llegue otro ingreso del periodo,
            // el faltante es «solo por fechas»: se dice qué llega después y cuándo.
            const cubre = minimo < 0 ? ingresos.filter((o) => o.fecha > cuando).sort((a, z) => (a.fecha < z.fecha ? -1 : a.fecha > z.fecha ? 1 : 0))[0] || null : null;
            return { clave, inicio: ini, fin, ingresos, principal: ingresos.find((o) => o.ingreso.principal) || null, otros: ingresos.filter((o) => !o.ingreso.principal), adelantos, entraGuardado: entraRes - suma(adelantos, (r) => r.monto), entra: entraIng + entraRes, entraIng, entraRes, partes: lista, pagos: salePagos + saleRes, salePagos, saleRes, quedan, deficit: -minimo, cuando, primero, cubre, soloFechas: minimo < 0 && quedan >= 0 };
        };
        if (!principal(st)) {
            const fin = hz.modo === 'quince' ? sumarDias(hz.fecha, 14) : fechaDe(...partes(hz.fecha).slice(0, 2), 31);
            return [armar('despues', hz.fecha, fin)];
        }
        const out = [];
        let b = hz.atrasadas.length ? hz.atrasadas[0].fecha : hz.esHoy ? st.hoy : hz.fecha;
        for (let i = 0; i < cuantos && b; i++) {
            const sig = corteDespues(st, b);
            out.push(armar(b, b, sig ? sumarDias(sig, -1) : sumarDias(b, 30)));
            b = sig;
        }
        return out;
    }

    function calcular(st) {
        const hz = horizonte(st);
        const t = tienes(st);
        const ap = apartadoTotal(st);
        const items = []; // con lo que ya tienes, vence antes de tu próximo ingreso (o ya venció)
        const reservados = []; // con lo que ya tienes, pero vence después: queda reservado (V2-34)
        const futuro = {}; // con un ingreso que todavía no llega, por día de pago (o por ingreso de una vez, V2-52)
        const sinIngreso = []; // V2-52: lo que ibas a pagar con un ingreso de una vez que no llegó a tiempo
        const lejos = sumarDias(st.hoy, 400);
        for (const p of st.pagos) {
            if (p.activo === false || p.descuento) continue;
            for (const o of ocurrenciasPago(st, p, p.desde, lejos)) {
                if (o.estado !== 'pendiente' && o.estado !== 'vencido') continue;
                for (const parte of asignacion(st, p, o.fecha, o.monto, hz)) {
                    const x = { ...o, parte: parte.monto, de: parte.de };
                    if (esFundado(st, parte.de)) (o.estado === 'vencido' || o.fecha < hz.fecha ? items : reservados).push(x);
                    else {
                        (futuro[parte.de] = futuro[parte.de] || []).push(x);
                        // V2-52: ya venció (o no va a llegar) y el ingreso de una vez no llegó: se pregunta, nada se cambia solo.
                        const ing = ingresoDeClave(st, parte.de);
                        const l = ing && ing.llegadas && ing.llegadas[ing.fecha];
                        if (ing && (o.fecha <= st.hoy || (l && l.noLlego))) sinIngreso.push({ ...x, ingreso: ing });
                    }
                }
            }
        }
        const porFecha = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
        items.sort(porFecha);
        reservados.sort(porFecha);
        const tarjetas = st.tarjetas.map((x) => tarjetaInfo(st, x));
        const porPagar = suma(items, (x) => x.parte);
        const reservadoPagos = suma(reservados, (x) => x.parte);
        // V2-07, V2-13, V2-29 #1: la tarjeta siempre se paga con lo que ya tienes.
        const enTarjetas = suma(tarjetas, (x) => x.enLibre);
        const reservadoTarjetas = suma(tarjetas, (x) => x.reservado);
        // V2-35: lo que la persona pasó de lo que tiene a un próximo día de pago (y lo que llegó antes de su quincena).
        const reservas = reservasDe(st, hz);
        const reservasProxima = reservas.filter((r) => esFundado(st, r.de) && !esFundado(st, r.para));
        const reservadoProxima = suma(reservasProxima, (r) => r.monto);
        const obligaciones = porPagar + enTarjetas + reservadoPagos + reservadoProxima;
        // V2-34: Libre = Tienes − Ahorros − lo que pagas con lo que ya tienes − lo que elegiste reservar. Nada más.
        const disponible = t - obligaciones;
        const base = disponible - ap;
        const libre = Math.max(0, base);
        const porDia = porDiaDe(libre, hz.dias);
        const periodos = proyectar(st, hz, futuro, reservas);
        const avisos = [];
        const faltaPagos = Math.max(0, -disponible);
        if (faltaPagos > 0) {
            // Rojo solo si de verdad no alcanza: si lo cubre algo que todavía esperas antes de tu próximo día de pago, es una sugerencia (V2-42).
            const esperados = [];
            for (const ing of st.ingresos) {
                if (ing.activo === false || ing.principal) continue;
                for (const o of ocurrenciasIngreso(st, ing, sumarDias(st.hoy, -45), sumarDias(hz.fecha, -1))) if (o.estado !== 'llego' && o.estado !== 'noLlego') esperados.push(o);
            }
            let b = t - enTarjetas - reservadoProxima;
            let primero = null;
            for (const x of items) {
                b -= x.parte;
                if (b < 0) {
                    primero = x;
                    break;
                }
            }
            avisos.push({ tipo: 'falta', faltan: faltaPagos, nivel: suma(esperados, (o) => o.monto) >= faltaPagos ? 'ambar' : 'rojo', esperados, primero });
        }
        const sinCubrir = Math.max(0, ap - Math.max(0, disponible));
        if (sinCubrir > 0) avisos.push({ tipo: 'apartados', faltan: sinCubrir, nivel: 'ambar' });
        // Una sola sugerencia: el primer día de pago (en el próximo mes) al que le faltaría (V2-34, V2-35).
        // «Después veo» la calla hasta que falte más.
        const vistas = st.sugerenciasVistas || {};
        const i = periodos.findIndex((x) => x.deficit > 0 && diasEntre(st.hoy, x.inicio) <= 31 && !(vistas[x.clave] >= x.deficit));
        if (i >= 0) avisos.push({ tipo: 'sugerencia', periodo: periodos[i], fuente: i === 0 ? 'ahora' : periodos[i - 1].clave, siguiente: i === 0, nivel: 'ambar' });
        for (const x of sinIngreso) avisos.push({ tipo: 'sinIngreso', parte: x, nivel: 'ambar' });
        for (const x of tarjetas) if (x.pendiente && x.pedir) avisos.push({ tipo: 'estado', info: x, nivel: 'ambar' });
        for (const a of apartadosVencidos(st)) avisos.push({ tipo: 'apartadoVencido', apartado: a, nivel: 'info' });
        const inactivo = diasEntre(ultimaActividad(st), st.hoy);
        // «Pongámonos al día» (V2-29 #6): 10 días sin anotar ni cuadrar, o un día de pago sin confirmar.
        const alDia = !hz.esHoy && (inactivo >= 10 || (hz.atrasadas || []).length > 0);
        return { hz, tienes: t, apartado: ap, items, reservados, porPagar, reservadoPagos, reservasProxima, reservadoProxima, tarjetas, enTarjetas, reservadoTarjetas, obligaciones, disponible, base, faltaPagos, falta: Math.max(0, -base), sinCubrir, libre, porDia, periodos, proxima: periodos[0] || null, futuro, avisos, inactivo, alDia };
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

    /**
     * V2-55: Pagos → Mes. Lo que entra y lo que pagas en el mes, con las mismas ocurrencias que se ven en la
     * lista: lo que llegó o pagaste, por lo que fue; lo demás, por lo esperado. Sin los descuentos del salario
     * (lo que te cae ya viene sin ellos) ni lo saltado. Una tarjeta sin monto todavía va aparte.
     */
    function pagosDelMes(st, y, m) {
        const ini = `${y}-${pad(m)}-01`;
        const fin = fechaDe(y, m, 31);
        let entra = 0;
        let pagos = 0;
        let aprox = false;
        let tarjetasSinMonto = 0;
        for (const ing of st.ingresos) {
            for (const o of ocurrenciasIngreso(st, ing, ini, fin)) {
                if (o.estado === 'noLlego' || (ing.activo === false && o.estado !== 'llego')) continue;
                entra += o.monto;
                if (o.estado !== 'llego' && ing.aprox) aprox = true;
            }
        }
        for (const p of st.pagos) {
            if (p.descuento) continue;
            for (const o of ocurrenciasPago(st, p, ini, fin)) {
                if (o.estado === 'saltado' || (p.activo === false && !o.hecho)) continue;
                pagos += o.monto;
                if (o.estimado) aprox = true;
            }
        }
        for (const o of ocurrenciasTarjeta(st, ini, fin)) {
            if (o.monto === null) tarjetasSinMonto++;
            else {
                pagos += o.monto;
                if (o.estimado) aprox = true;
            }
        }
        return { ini, fin, entra, pagos, queda: entra - pagos, aprox, tarjetasSinMonto };
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
        if (k && k.medio && medio(st, k.medio) && !medio(st, k.medio).oculto) return { id: k.medio, seguro: false };
        const tarjetaPropia = st.medios.find((m) => m.tarjeta && !m.oculto);
        if (k && k.medio === 'bac' && tarjetaPropia) return { id: tarjetaPropia.id, seguro: false };
        const debito = st.medios.find((m) => m.tarjetaDebito && !m.oculto);
        if (k && k.medio === 'debito' && debito) return { id: debito.id, seguro: false };
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
        ['apartar', /^(aparte|apartar|guarde|guardar|ahorre|ahorrar|separe)\b/],
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
        // Medio dicho en el texto: primero por el nombre que le puso la persona, luego por tipo.
        const activos = st.medios.filter((m) => !m.oculto);
        const credito = activos.filter((m) => m.tarjeta);
        const GENERICAS = new Set(['credito', 'debito', 'tarjeta', 'banco', 'efectivo', 'transferencia', 'cuenta', 'billetera']);
        const palabraDe = (m) => normalizar(m.nombre).split(' ').find((w) => w.length >= 3 && !GENERICAS.has(w) && ` ${t} `.includes(` ${w} `));
        const porNombre = activos.find((m) => palabraDe(m));
        if (porNombre) {
            d.medio = porNombre.id;
            d.medioExplicito = true;
            // En «tengo 300 en agrícola» o «pasé 50 de agrícola a efectivo» la palabra es del lugar: se queda.
            if (d.tipo !== 'cuadre' && d.tipo !== 'mover') t = ` ${t} `.replace(new RegExp(`\\b(con |la |de )*(tarjeta |credito |debito )?${palabraDe(porNombre)}\\b`), ' ').trim();
        } else if (/\b(tarjeta|credito)\b/.test(t) && credito.length) {
            d.medio = credito[0].id;
            d.medioExplicito = true;
            t = t.replace(/\b(con )?(la )?(tarjeta|credito)( de credito)?\b/, ' ');
        } else if (/\bdebito\b/.test(t) && activos.some((m) => m.tarjetaDebito)) {
            d.medio = activos.find((m) => m.tarjetaDebito).id;
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

        // V2-56: «me dieron adelanto 314», «adelanto 314 el 29»: un adelanto de salario (un ingreso de una vez).
        if ((!d.tipo || d.tipo === 'ingreso') && palabras.some((w) => w === 'adelanto' || w === 'anticipo')) {
            d.tipo = 'ingreso';
            d.adelanto = true;
        }
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
            const ventana = ocurrenciasPago(st, p, sumarDias(st.hoy, -62), sumarDias(st.hoy, 12));
            const abiertas = ventana.filter((o) => o.estado !== 'pagado' && o.estado !== 'saltado');
            const o = (d.dia !== null && abiertas.find((x) => partes(x.fecha)[2] === d.dia)) || abiertas[0];
            d.ocurrencia = o ? o.fecha : null;
            if (d.monto === null && o) d.monto = o.monto;
            if (d.dia !== null && o && o.fecha <= st.hoy) d.fecha = o.fecha;
            if (!d.medio) {
                d.medio = p.medio;
                d.medioSeguro = true;
            }
            if (!o) {
                // v2.6.1 (QA C-07b): ya estaba pagado: queda como gasto aparte, pero Anotar lo dice.
                d.tipo = 'gasto';
                const ultimo = ventana.filter((x) => x.estado === 'pagado').at(-1);
                if (ultimo) d.yaPagado = { pago: p.id, nombre: p.nombre, fecha: ultimo.fecha };
            }
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
            const v = d.verbo || '';
            d.categoria = d.adelanto ? 'otro' : /vendi/.test(v) ? 'venta' : /mandaron|enviaron/.test(v) || /remesa/.test(resto) ? 'remesa' : /pagaron|cayo|cayeron|depositaron|cobre/.test(v) ? 'salario' : 'otro';
            const k = categoria(d.categoria);
            d.emoji = d.adelanto ? '💵' : k.emoji;
            // Un adelanto «el 29»: si ese día no ha llegado, es un ingreso esperado (fecha futura).
            if (d.adelanto && d.dia !== null) d.fecha = d.dia >= partes(st.hoy)[2] ? proximoDia(st.hoy, d.dia) : ultimoDia(st.hoy, d.dia);
            // ¿Es un ingreso esperado que llegó (o se adelantó)? Un adelanto con fecha futura es uno nuevo.
            if (d.monto !== null && !(d.adelanto && d.fecha > st.hoy)) {
                const candidatos = [];
                // Un adelanto solo se reconoce como un adelanto que se esperaba (nunca como la quincena).
                const esAdelantoIng = (ing) => ing.adelanto || ing.tipoIngreso === 'adelanto' || /\b(adelanto|anticipo|vale)\b/.test(normalizar(ing.nombre));
                for (const ing of st.ingresos.filter((x) => !d.adelanto || esAdelantoIng(x))) {
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
            if (!d.nombre && d.adelanto) d.nombre = 'Adelanto de salario';
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
                const mDeA = t.match(/(?:de |desde )?(\w+)(?: a | al | para )(\w+)/);
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
        MONTO_MAX, hoyLocal,
        MESES, MESES_CORTOS, DIAS, DIAS_CORTOS, pad, sumarDias, diasEntre, diaSemana, partes, diasDelMes, fechaDe, mesMas, fechaCorta, fechaLarga, conDia, diaCorto, relativa, haceDias, ultimoDia, proximoDia,
        dinero, leerMonto, montoExcede, montoCampo, suma, lugar, medio, tarjeta, pago, ingreso, apartado, categoria, principal, sinVS,
        despues, saldoLugar, anteriorAlCuadre, lugaresDe, tienes, apartadoTotal, ultimaActividad, fechasRegla, ocurrenciasPago, ocurrenciasIngreso, tarjetaInfo, ocurrenciasTarjeta,
        horizonte, calcular, resumenMes, pagosDelMes, medioUsual, normalizar, entender, faltan, capital, porDiaDe, apartadosVencidos, esDiaDeIngreso, coincide,
        inicioDe, cortes, corteAntes, corteDespues, fundado, esFundado, periodoDe, fuentesPara, asignacion, reglaPago, recurrentes, descuentosDe, proyectar, claveVigente, reservasDe,
        esUnico, ingresoDeClave, llegoUnico, unicosPara,
    };
})();
