// Producto v2.5 · prototipo. MODO ENTRENAMIENTO «sencillo y a fondo». Una sola pregunta al entrar («¿Cómo te entra el
// dinero?») elige la versión: fecha fija (Ana, que cobra por quincena) o ingresos que varían (Rosa, que vende pupusas y
// recibe una remesa). Cada versión tiene «Lo esencial» (6 pasos que bastan para empezar con tus datos) y «Aprende más»
// (capítulos cortos y opcionales, en cualquier orden y otro día, con su marca de «hecho»).
// Cada paso sigue el mismo orden: qué estás viendo (el título) → para qué te sirve → un ejemplo con números redondos.
// Esos textos salen del glosario: son los mismos de los «?» y de «Aprende».
// NADA avanza solo: siempre es la persona quien toca. El resaltado entra despacio, late dos veces y se queda; la
// tarjeta aparece después. «Hazlo tú»: una instrucción concreta con una flecha (solo se puede tocar lo que señala),
// «Hazlo por mí» hace un solo toque a la vez y, al terminar, una pausa con antes → después y el porqué, con
// «Entendido». Una pregunta al final de cada capítulo («Casi: …» y «Repasar este paso»). Al terminar o salir, los
// ejemplos vuelven a como estaban; se retoma donde se quedó. También «Practicar con ejemplos», de fácil a difícil, con
// el capítulo que conviene hacer antes.
'use strict';
(() => {
    const P = window.P;
    const M = window.MOTOR;
    const { esc, icon } = P;
    const $ = (s) => document.querySelector(s);
    const dinero = M.dinero;
    /** «$400» sin centavos si no los tiene, «$290.60» si los tiene: para las frases de la pausa. */
    const corto = (c) => dinero(Math.abs(c)).replace(/\.00$/, '');
    const glosario = (id, variable) => window.terminoGlosario(id, variable);

    // ------------------------------------------------------------------ ayudas para los pasos
    const cerrarHoja = () => P.ui.hoja && P.cerrarHoja({ sinFoco: true });
    const irA = (tab) => () => {
        cerrarHoja();
        if (P.ui.tab !== tab || P.ui.stack.length) P.irTab(tab);
    };
    /** Abre una pantalla dentro de una pestaña («‹ Mi dinero» dice de dónde viene). */
    const abrirEn = (tab, tipo, id) => () => {
        irA(tab)();
        P.abrir(tipo, id);
    };
    const abrirDesglose = () => {
        irA('hoy')();
        P.abrirHoja('desglose');
    };
    const abrirPagos = () => {
        P.ui.pagosModo = 'calendario';
        P.ui.pagosVista = 'actual';
        cerrarHoja();
        P.irTab('pagos');
    };
    const grupo = (titulo) => [...document.querySelectorAll('.grupo')].find((g) => g.querySelector('.grupo-t')?.textContent === titulo) || null;
    /** Una tarjeta de la pantalla por su título («Lo pagas con», «Tus ahorros»…). */
    const seccion = (titulo) => () => [...document.querySelectorAll('#pantalla section.card')].find((s) => (s.querySelector('.card-t')?.textContent || '').trim().startsWith(titulo)) || null;
    const enPantalla = (tab) => P.ui.tab === tab && !P.ui.stack.length;
    const arriba = () => P.ui.stack.at(-1) || null;
    const hoja = (tipo) => P.ui.hoja && P.ui.hoja.tipo === tipo;
    const foto = () => {
        const k = P.calc();
        return { libre: k.libre, tienes: k.tienes, efectivo: M.saldoLugar(P.st, 'efectivo'), quedan: k.proxima ? k.proxima.quedan : null, apartado: k.apartado, porDia: k.porDia, hasta: k.hz.fecha || null };
    };
    /** Señales de «Hazlo tú»: dónde tocar, qué decir y qué hace «Hazlo por mí» (un solo toque). */
    const tocar = (sel, texto) => ({ sel, texto, hacer: 'tocar' });
    const escribir = (sel, valor, texto) => ({ sel, texto, hacer: { escribir: valor } });
    const senalAnotar = (frase) => () => {
        if (!hoja('anotar')) return tocar('[data-fk="nav-anotar"]', 'Toca el botón + de abajo.');
        const q = document.getElementById('anotar-q');
        if (q && M.normalizar(q.value.trim()) !== M.normalizar(frase)) return escribir('#anotar-q', frase, `Escribe «${frase}» en «¿Qué pasó?».`);
        return tocar('[data-fk="anotar-guardar"]', 'Revisa lo que entendí y toca «Guardar».');
    };
    /** Cuadrar el efectivo: Cuentas → Cuadrar → Efectivo → cuánto → Cuadrar. */
    const senalCuadrar = () => {
        if (hoja('cuadrar')) {
            const h = P.ui.hoja;
            if (h.lugar !== 'efectivo') return tocar('[data-fk="op-lugar-efectivo"]', 'Elige «Efectivo».');
            if (M.leerMonto(h.monto) !== T.cuadre.di) return escribir('#f-monto', M.montoCampo(T.cuadre.di), `Escribe ${corto(T.cuadre.di)} en «¿Cuánto tienes ahora?».`);
            return tocar('[data-fk="hoja-ok"]', 'Toca «Cuadrar».');
        }
        const top = arriba();
        if (top && top.tipo === 'cuentas') return tocar('[data-fk="md-cuadrar"]', 'Toca «Cuadrar».');
        if (!enPantalla('midinero')) return tocar('[data-fk="nav-midinero"]', 'Toca «Mi dinero» abajo.');
        return tocar('[data-fk="md-cuentas"]', 'Toca «Cuentas».');
    };
    /** Lo que la app cree que hay en efectivo y un número redondo un poco menor (se fija al empezar el paso). */
    const prepararCuadre = () => {
        const e = M.saldoLugar(P.st, 'efectivo');
        T.cuadre = { cree: e, di: Math.max(0, Math.floor((e - 1) / 500) * 500) };
    };
    const abrirCuentas = () => {
        prepararCuadre();
        abrirEn('midinero', 'cuentas')();
    };
    /** «Pongámonos al día», paso a paso. `efectivo`: lo que la persona contó (quien vende y no anotó sus ventas). */
    const senalAlDia = (efectivo = null) => () => {
        const top = arriba();
        if (!top || top.tipo !== 'aldia') return enPantalla('hoy') ? tocar('[data-fk="aldia"]', 'Toca «Empezar» en «Pongámonos al día».') : tocar('[data-fk="nav-hoy"]', 'Toca «Hoy» abajo.');
        if (top.paso === 1) {
            const si = document.querySelector('[data-fk^="adi-si-"][aria-pressed="false"]');
            return si ? tocar(`[data-fk="${si.dataset.fk}"]`, 'Sí te llegó: toca «Sí, me cayó».') : tocar('[data-fk="ad-sig"]', 'Toca «Siguiente».');
        }
        if (top.paso === 2) {
            const falta = document.querySelector('[data-fk^="adp-pagado-"][aria-pressed="false"]');
            if (falta && document.querySelector('[data-fk="ad-todos"]')) return tocar('[data-fk="ad-todos"]', 'Ya pagaste todo: toca «Marcar todos como pagados».');
            if (falta) return tocar(`[data-fk="${falta.dataset.fk}"]`, 'Ya lo pagaste: toca «Pagado».');
            return tocar('[data-fk="ad-sig"]', 'Toca «Siguiente».');
        }
        if (top.paso === 3) {
            const campo = document.getElementById('adc-efectivo');
            if (efectivo !== null && campo && M.leerMonto(campo.value) !== efectivo * 100) return escribir('#adc-efectivo', String(efectivo), `Contaste tu efectivo: escribe ${efectivo} en «Efectivo».`);
            return tocar('[data-fk="ad-sig"]', efectivo !== null ? 'Toca «Listo».' : 'Deja lo que dice y toca «Listo».');
        }
        return null;
    };
    /** «Tu libre bajó de $400 a $394 porque anotaste $6 de pupusas». */
    const cambioLibre = (a, d, porque) => `${d.libre === a.libre ? `Tu libre no cambió: sigue en ${corto(d.libre)}` : `Tu libre ${d.libre < a.libre ? 'bajó' : 'subió'} de ${corto(a.libre)} a ${corto(d.libre)}`}${porque ? ` porque ${porque}` : ''}.`;
    const filaLibre = (a, d) => ({ l: 'Libre', a: a.libre, d: d.libre });
    const pausaLibre = (titulo, porque) => (a, d) => ({ titulo, filas: [filaLibre(a, d)], texto: cambioLibre(a, d, porque(a, d)) });

    // ------------------------------------------------------------------ v2.6.1 (V2-76): ejemplos con los números de la pantalla
    // «que lo que vaya mostrando de ejemplo en entrenamiento haga sentido»: cada ejemplo sale de los datos que se ven en
    // ese momento (el mismo cálculo de la app). Si no aplica a lo que hay, queda el del glosario, que no lleva montos.
    // `montos` de un paso: lo que ese paso pide escribir o hacer (lo revisa herramientas/numeros-entrenamiento.mjs).
    const hasta = (k) => (k.hz.ingreso ? `hasta tu quincena del ${M.partes(k.hz.fecha)[2]}` : k.hz.modo === 'quince' ? 'en los próximos 15 días' : 'hasta fin de mes');
    const antesDe = (k) => (k.hz.ingreso ? `antes del ${M.partes(k.hz.fecha)[2]}` : 'antes de fin de mes');
    const libreHoy = () => corto(P.calc().libre);
    /** El primer pago que vence antes de que termine tu libre (el primero de «Próximos pagos»). */
    function primerPago() {
        const st = P.st;
        const k = P.calc();
        const hastaF = M.sumarDias(k.hz.fecha, -1);
        const os = st.pagos.filter((p) => p.activo !== false).flatMap((p) => M.ocurrenciasPago(st, p, st.hoy, hastaF)).filter((o) => o.estado === 'pendiente');
        return os.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0))[0] || null;
    }
    const ej = {
        libre: () => {
            const k = P.calc();
            return k.porDia !== null ? `Tu libre es ${corto(k.libre)} ${hasta(k)}: son ~${corto(k.porDia)} por día.` : null;
        },
        deDondeSale: () => {
            const k = P.calc();
            if (k.tienes - k.apartado - k.porPagar !== k.libre) return null;
            return `Tienes ${corto(k.tienes)}, ${corto(k.apartado)} están en ahorros y pagas ${corto(k.porPagar)} ${antesDe(k)}: te quedan ${corto(k.libre)}.`;
        },
        anotar: (cosa, frase, monto, vende = false) => () => `${vende ? 'Vendiste' : 'Compraste'} ${cosa} por $${monto}: escribes «${frase}» y tu libre de ${libreHoy()} ${vende ? 'sube' : 'baja'} $${monto}.`,
        pagado: () => {
            const p = M.pago(P.st, 'telefono');
            return p ? `Pagas el teléfono de ${corto(p.monto)}: tu libre sigue en ${libreHoy()} y lo que tienes baja ${corto(p.monto)}.` : null;
        },
        loQueViene: () => {
            const o = primerPago();
            return o ? `El ${M.partes(o.fecha)[2]} vence «${o.pago.nombre}», de ${corto(o.monto)}: ya está restado de tu libre.` : null;
        },
        cuadrar: () => (T.cuadre ? `La app cree que tienes ${corto(T.cuadre.cree)} en efectivo. Si cuentas ${corto(T.cuadre.di)}, ${corto(T.cuadre.cree - T.cuadre.di)} quedan «sin detalle».` : null),
        proxima: () => {
            const p = P.calc().proxima;
            if (!p) return null;
            if (!p.principal) return `El próximo mes pagas ~${corto(p.pagos)}: lo vas juntando con lo que vendes.`;
            return `En tu quincena del ${M.partes(p.principal.fecha)[2]} recibes ~${corto(p.entra)} y pagas ~${corto(p.pagos)}: te quedarían ~${corto(p.quedan)}.`;
        },
        aproxQue: () => {
            const p = P.calc().proxima;
            return p && p.principal ? `Mira el signo ~ en «~${corto(p.entra)}»` : 'Mira el signo ~';
        },
        aprox: () => {
            const p = P.calc().proxima;
            return p && p.principal ? `Esperas ~${corto(p.entra)}. Si el ${M.partes(p.principal.fecha)[2]} llega otra cantidad, la app usa la que llegó.` : null;
        },
        pasar: (monto) => () => `Si pasas $${monto}, tu libre de ${libreHoy()} baja $${monto} y tu próxima quincena tiene $${monto} más.`,
        ahorros: () => {
            const a = M.apartado(P.st, 'emergencias');
            return a ? `Tienes ${corto(a.monto)} en «${a.nombre}»: siguen en tu banco o efectivo, pero no cuentan en tu libre.` : null;
        },
        ahorrar: (monto) => () => `Ahorras $${monto} en «Emergencias»: tu libre baja $${monto}.`,
        usar: () => {
            const a = M.apartado(P.st, 'laptop');
            return a ? `Juntaste ${corto(a.monto)} para la laptop. Si la compras y tocas «Usar», tu libre no cambia.` : null;
        },
        tarjeta: () => {
            const k = P.calc();
            const t = k.tarjetas.find((x) => x.porPagarEstado + x.estimado > 0);
            return t ? `Tu libre de ${corto(k.libre)} ya tiene restados ${corto(t.porPagarEstado + t.estimado)} de tu tarjeta, que vence el ${P.diaPago(t, t.ult.vence)}.` : null;
        },
        compraTarjeta: (cosa, frase) => () => `Escribes «${frase}»: tu libre de ${libreHoy()} baja $30 hoy.`,
        deudas: () => {
            const p = P.st.pagos.find((x) => x.activo !== false && x.deuda && x.frecuencia === 'mensual');
            return p ? `«${p.nombre}»: ${corto(p.monto)} al mes. La ves aquí y en Pagos cada mes.` : null;
        },
        estadoCuenta: () => {
            const t = P.st.tarjetas[0];
            const e = t && t.estados && t.estados.at(-1);
            return e ? `Tu estado de cuenta dice pago de contado ${corto(e.total)} y mínimo ${corto(e.minimo)}: tú eliges cuánto pagas.` : null;
        },
        aguinaldo: () => {
            const i = P.st.ingresos.find((x) => x.categoria === 'aguinaldo' && x.activo !== false);
            return i ? `Tu aguinaldo de ~${corto(i.monto)} llega el ${M.fechaLarga(i.fecha)}: ese día suma a tu libre.` : null;
        },
        matricula: () => {
            const p = M.pago(P.st, 'matricula');
            return p ? `La matrícula de enero, ${corto(p.monto)}, sale de tu aguinaldo de diciembre.` : null;
        },
        guardar: (monto) => () => {
            const p = M.pago(P.st, 'alquiler');
            return p ? `Guardas $${monto} para el alquiler de ${corto(p.monto)}: tu libre de ${libreHoy()} baja $${monto} y el alquiler ya los tiene.` : null;
        },
        quince: () => `Hoy es ${M.partes(P.st.hoy)[2]}: con 15 días ves hasta el ${M.fechaCorta(M.sumarDias(P.st.hoy, 15))}.`,
        remesa: () => {
            const i = P.st.ingresos.find((x) => x.categoria === 'remesa' && x.activo !== false);
            return i ? `Esperas ${corto(i.monto)} de remesa: el día que llega tocas «Ya llegó» y suma.` : null;
        },
        remesaLlega: () => {
            const i = P.st.ingresos.find((x) => x.categoria === 'remesa' && x.activo !== false);
            return i ? `Si llegan ${corto(i.monto)}, ese día tu libre sube ${corto(i.monto)}.` : null;
        },
        semanaMala: () => {
            const k = P.calc();
            return `Tu libre está en ${corto(k.libre)}. ${P.textoCero(k)}. Puedes sacar de un ahorro. Sin culpa.`;
        },
    };

    // ------------------------------------------------------------------ los ejemplos de cada capítulo
    /** Deja el libre en un número redondo moviendo el último cuadre de un lugar (solo en los ejemplos del entrenamiento). */
    function redondear(st, meta, lugarId) {
        const delta = meta - M.calcular(st).libre;
        const l = M.lugar(st, lugarId);
        if (!delta || !l || !l.cuadre) return;
        const r = st.registros.find((x) => x.tipo === 'cuadre' && x.seq === l.cuadre.seq);
        if (r) r.monto += delta;
        l.cuadre = { ...l.cuadre, monto: l.cuadre.monto + delta };
    }
    /** Sin tarjeta de crédito: la tarjeta tiene su capítulo y no debe aparecer antes en el número. */
    function sinTarjetas(st) {
        const tarjetas = new Set(st.tarjetas.map((t) => t.id));
        const medios = new Set(st.medios.filter((m) => m.tarjeta).map((m) => m.id));
        st.tarjetas = [];
        st.medios = st.medios.filter((m) => !m.tarjeta);
        st.registros = st.registros.filter((r) => !medios.has(r.medio) && !tarjetas.has(r.tarjeta));
        st.reservasTarjeta = [];
        st.avisos = st.avisos.filter((x) => !(x.accion && x.accion.tipo === 'tarjeta'));
    }
    /** Ana del entrenamiento: su luz de octubre ya está pagada y el teléfono ($15) vence el 25, antes de su quincena. */
    function ana({ tarjeta = false, libre = 40000, cambio = null } = {}) {
        P.cargarPersona('ana');
        const st = P.st;
        P.marcarPagado(st, 'luz', '2026-10-12', { monto: 3500, medio: 'debito', fecha: '2026-10-12' });
        const tel = P.crearPago(st, { nombre: 'Teléfono', emoji: '📱', categoria: 'telefono', monto: 1500, frecuencia: 'mensual', dia: 25, medio: 'efectivo' });
        Object.assign(tel, { id: 'telefono', desde: '2026-10-01', nuevo: false });
        if (!tarjeta) sinTarjetas(st);
        if (cambio) cambio(st);
        if (libre !== null) redondear(st, libre, 'agricola');
        return st;
    }
    function rosa({ libre = null, cambio = null } = {}) {
        P.cargarPersona('rosa');
        const st = P.st;
        if (cambio) cambio(st);
        if (libre !== null) redondear(st, libre, 'efectivo');
        return st;
    }
    const preparar = (fn, marca) => () => {
        const st = fn();
        st.recorrido = marca;
        P.ui.descartados = {};
        P.render();
    };
    // Una semana mala, solo para verla: el efectivo baja a $20 y «Volver a mis números» lo deja como estaba (V2-59 #29).
    const SEMANA_MALA = 'semana-mala';
    function simularSemanaMala() {
        const st = P.st;
        if (st.registros.some((r) => r.ref === SEMANA_MALA)) return;
        const l = M.lugar(st, 'efectivo');
        const r = P.registrar(st, { tipo: 'cuadre', fecha: st.hoy, lugar: 'efectivo', monto: 2000, esperado: M.saldoLugar(st, 'efectivo'), ref: SEMANA_MALA, antes: l.cuadre });
        l.cuadre = { fecha: r.fecha, seq: r.seq, monto: r.monto };
        P.render();
    }
    function quitarSemanaMala() {
        const st = P.st;
        const r = st && st.registros.find((x) => x.ref === SEMANA_MALA);
        if (!r) return;
        st.registros = st.registros.filter((x) => x !== r);
        M.lugar(st, r.lugar).cuadre = r.antes;
        P.render();
    }

    // ------------------------------------------------------------------ versión 1 · fecha fija (Ana)
    const pasoLibre = { que: 'Este número es tu libre', g: 'libre', ejemplo: ej.libre, antes: irA('hoy'), sel: '.portada' };
    const pasoAnotar = (frase, porque, ejemplo, montos) => ({
        que: 'Este botón + es para anotar',
        g: 'anotar',
        ejemplo,
        montos,
        antes: irA('hoy'),
        sel: '[data-fk="nav-anotar"]',
        hazlo: { claves: ['guardado:gasto', 'guardado:ingreso'], senal: senalAnotar(frase), foco: '.portada', pausa: pausaLibre('Mira tu libre', () => porque) },
    });
    const pasoCuadrar = {
        que: 'Aquí cuadras tu efectivo',
        g: 'cuadrar',
        ejemplo: ej.cuadrar,
        montos: () => (T.cuadre ? [T.cuadre.di, T.cuadre.cree - T.cuadre.di].map((c) => c / 100) : []),
        antes: abrirCuentas,
        sel: '#pantalla section.total',
        hazlo: { claves: ['guardado:cuadre'], senal: senalCuadrar, foco: '#pantalla section.total', pausa: pausaLibre('Cuadraste tu efectivo', (a, d) => (d.efectivo < a.efectivo ? `tenías ${corto(a.efectivo - d.efectivo)} menos de lo que creía la app` : 'ahora la app tiene lo que tienes de verdad')) },
    };
    const ESENCIAL_FIJO = {
        id: 'esencial',
        titulo: 'Lo esencial',
        sub: 'Lo que basta para empezar',
        persona: 'ana',
        // v2.6 (V2-63): los ejemplos se presentan como «datos de ejemplo», sin el nombre de la persona.
        intro: 'Con datos de ejemplo de alguien que cobra por quincena. Si cobras por mes o semana, es igual.',
        cargar: preparar(() => ana(), 'fijo:esencial'),
        pasos: [
            pasoLibre,
            { que: 'Aquí ves de dónde sale', g: 'deDondeSale', ejemplo: ej.deDondeSale, antes: abrirDesglose, sel: '.hoja .desglose' },
            pasoAnotar('pupusas 6', 'anotaste $6 de pupusas', ej.anotar('pupusas', 'pupusas 6', 6), [6]),
            {
                que: 'Estos son tus próximos pagos',
                g: 'pagado',
                ejemplo: ej.pagado,
                antes: irA('hoy'),
                sel: 'section[aria-labelledby="h-pagos"]',
                hazlo: {
                    claves: ['guardado:pagado'],
                    senal: () => (enPantalla('hoy') ? tocar('[data-fk^="pagado-p-telefono-"]', 'Ya pagaste el teléfono: toca «Pagado» junto a él.') : tocar('[data-fk="nav-hoy"]', 'Toca «Hoy» abajo.')),
                    foco: '.portada',
                    pausa: (a, d) => ({ titulo: 'Mira tu libre', filas: [filaLibre(a, d), { l: 'Tienes', a: a.tienes, d: d.tienes }], texto: d.libre === a.libre ? `Tu libre no cambió: el teléfono ya estaba restado. Lo que tienes bajó ${corto(a.tienes - d.tienes)}.` : cambioLibre(a, d, 'marcaste el teléfono') }),
                },
            },
            { que: 'Aquí ves con qué pagas el colegio', g: 'pagasCon', ejemplo: 'El colegio vence el 5: sale de tu quincena del 30, no de tu libre de hoy.', antes: abrirEn('pagos', 'pago', 'colegio'), sel: seccion('Lo pagas con') },
            pasoCuadrar,
        ],
        // V2-76: la pregunta no inventa montos: no están en la pantalla.
        pregunta: { p: '¿Qué es tu libre?', ops: ['Todo lo que tienes', 'Lo que tienes, menos ahorros y lo que pagas antes de tu quincena', 'Lo que te pagan en tu quincena'], bien: 1, si: '¡Exacto! Es lo que puedes gastar sin tocar lo que debes pagar.', casi: 'Casi: es lo que tienes, menos tus ahorros y lo que pagas antes de tu quincena.', repaso: 0 },
    };
    const PROXIMA = {
        id: 'proxima',
        titulo: 'Próxima quincena y pasar lo que sobra',
        sub: 'Cómo quedas cuando te paguen',
        persona: 'ana',
        cargar: preparar(() => ana(), 'fijo:proxima'),
        pasos: [
            { que: 'Esta es tu próxima quincena', g: 'proxima', ejemplo: ej.proxima, antes: irA('hoy'), sel: '.proy-w' },
            { que: ej.aproxQue, g: 'aprox', ejemplo: ej.aprox, antes: irA('hoy'), sel: '.proy-w' },
            {
                que: 'Aquí pasas lo que te sobra',
                g: 'pasar',
                ejemplo: ej.pasar(50),
                montos: [50],
                antes: abrirDesglose,
                sel: '[data-fk="d-pasar"]',
                hazlo: {
                    claves: ['guardado:pasarProxima'],
                    senal: () => {
                        if (hoja('pasarProxima')) return M.leerMonto(P.ui.hoja.monto) === 5000 ? tocar('[data-fk="pasar-ok"]', 'Toca «Guardar».') : escribir('#f-monto', '50', 'Escribe 50 en «¿Cuánto pasas?».');
                        if (hoja('desglose')) return tocar('[data-fk="d-pasar"]', 'Toca «¿Pasas algo de lo que te sobra a la próxima?».');
                        return enPantalla('hoy') ? tocar('[data-fk="portada"]', 'Toca tu número.') : tocar('[data-fk="nav-hoy"]', 'Toca «Hoy» abajo.');
                    },
                    foco: '.proy-w',
                    pausa: (a, d) => ({ titulo: 'Mira tu próxima quincena', filas: [filaLibre(a, d), ...(a.quedan !== null ? [{ l: 'Te quedarían', a: a.quedan, d: d.quedan, aprox: true }] : [])], texto: cambioLibre(a, d, `pasaste ${corto(a.libre - d.libre)} a tu próxima quincena`) }),
                },
            },
            { que: 'Aquí cambias o repartes un pago', g: 'repartir', ejemplo: 'El colegio puede salir una parte de esta quincena y otra de la próxima.', antes: abrirEn('pagos', 'pago', 'colegio'), sel: seccion('Lo pagas con') },
        ],
        pregunta: { p: 'Ves «~» antes de un monto. ¿Qué quiere decir?', ops: ['Que es exacto', 'Que es más o menos', 'Que ya llegó'], bien: 1, si: '¡Así es! ~ es «más o menos». Cuenta de verdad cuando llega.', casi: 'Casi: ~ quiere decir «más o menos». Cuenta de verdad cuando llega.', repaso: 1 },
    };
    const pasoAhorros = { que: 'Aquí están tus ahorros', g: 'ahorros', ejemplo: ej.ahorros, antes: abrirEn('midinero', 'ahorros'), sel: seccion('Tus ahorros') };
    const pasoAhorrar = (monto) => ({
        que: 'Así guardas en un ahorro',
        g: 'ahorrar',
        ejemplo: ej.ahorrar(monto),
        montos: [monto],
        antes: abrirEn('midinero', 'ahorros'),
        sel: '[data-fk="md-apartar"]',
        hazlo: {
            claves: ['guardado:apartar'],
            senal: () => {
                if (hoja('apartar')) {
                    const h = P.ui.hoja;
                    if (M.leerMonto(h.monto) !== monto * 100) return escribir('#f-monto', String(monto), `Escribe ${monto} en «¿Cuánto quieres ahorrar?».`);
                    if (h.apartado !== 'emergencias') return tocar('[data-fk="op-apartado-emergencias"]', 'Elige «Emergencias».');
                    return tocar('[data-fk="hoja-ok"]', 'Toca «Ahorrar».');
                }
                const top = arriba();
                if (top && top.tipo === 'ahorros') return tocar('[data-fk="md-apartar"]', 'Toca «Ahorrar».');
                return enPantalla('midinero') ? tocar('[data-fk="md-ahorros"]', 'Toca «Ahorros».') : tocar('[data-fk="nav-midinero"]', 'Toca «Mi dinero» abajo.');
            },
            foco: '#pantalla section.total',
            pausa: (a, d) => ({ titulo: 'Mira tu libre', filas: [filaLibre(a, d), { l: 'En ahorros', a: a.apartado, d: d.apartado }], texto: cambioLibre(a, d, `guardaste ${corto(d.apartado - a.apartado)} en Emergencias`) }),
        },
    });
    const AHORROS_FIJO = {
        id: 'ahorros',
        titulo: 'Ahorros',
        sub: 'Ponle nombre a una parte de tu dinero',
        persona: 'ana',
        cargar: preparar(() => ana(), 'fijo:ahorros'),
        pasos: [pasoAhorros, pasoAhorrar(50), { que: 'Este es tu ahorro para la laptop', g: 'usar', ejemplo: ej.usar, antes: abrirEn('midinero', 'apartado', 'laptop'), sel: '[data-fk="ap-usar"]' }],
        pregunta: { p: 'Pones dinero en tu ahorro «Emergencias». ¿Dónde queda ese dinero?', ops: ['En una cuenta nueva', 'Se gasta', 'En tu banco o efectivo, con nombre'], bien: 2, si: '¡Eso! No se mueve: solo le pones nombre y deja de contar en tu libre.', casi: 'Casi: sigue en tu banco o efectivo. Solo le pones nombre.', repaso: 0 },
    };
    const pasosTarjeta = (frase, cosa) => [
        { que: 'Tu número incluye la tarjeta', g: 'tarjeta', ejemplo: ej.tarjeta, antes: irA('hoy'), sel: '.portada' },
        {
            que: 'Anota una compra con tarjeta',
            para: `Escribe «tarjeta» al final: así la app sabe que no salió de tu efectivo.`,
            ejemplo: ej.compraTarjeta(cosa, frase),
            montos: [30],
            antes: irA('hoy'),
            sel: '[data-fk="nav-anotar"]',
            hazlo: { claves: ['guardado:gasto'], senal: senalAnotar(frase), foco: '.portada', pausa: pausaLibre('Mira tu libre', (a, d) => `compraste ${corto(a.libre - d.libre)} con tarjeta, aunque la pagues después`) },
        },
        { que: 'Esto es «Deudas»', g: 'deudas', ejemplo: ej.deudas, antes: abrirEn('midinero', 'deudas'), sel: seccion('Tus deudas') },
        { que: 'Este es tu estado de cuenta', g: 'estadoCuenta', ejemplo: ej.estadoCuenta, antes: () => abrirEn('midinero', 'tarjeta', P.st.tarjetas[0].id)(), sel: () => document.querySelector('#pantalla .dato-grid')?.closest('section') || null },
    ];
    const PREGUNTA_TARJETA = { p: 'Compras algo con tu tarjeta de crédito. ¿Cuándo baja tu libre?', ops: ['Hoy, el día que compras', 'Cuando pagas la tarjeta', 'Nunca'], bien: 0, si: '¡Así es! Baja hoy, aunque la pagues después. Así no te llevas sorpresas.', casi: 'Casi: baja hoy, el día que compras. Así no te llevas sorpresas.', repaso: 0 };
    const TARJETAS_FIJO = {
        id: 'tarjetas',
        titulo: 'Tarjetas y estado de cuenta',
        sub: 'Comprar con tarjeta y su estado de cuenta',
        persona: 'ana',
        cargar: preparar(() => ana({ tarjeta: true, libre: 30000 }), 'fijo:tarjetas'),
        pasos: pasosTarjeta('zapatos 30 tarjeta', 'zapatos'),
        pregunta: PREGUNTA_TARJETA,
    };
    const EXTRAS = {
        id: 'extras',
        titulo: 'Aguinaldo y adelanto',
        sub: 'Lo que te cae una vez',
        persona: 'ana',
        cargar: preparar(
            () =>
                ana({
                    cambio: (st) => {
                        // La matrícula de enero ya va con el aguinaldo (V2-52).
                        st.pagos.push({ id: 'matricula', nombre: 'Matrícula', emoji: '🎒', categoria: 'educacion', monto: 10000, estimado: false, frecuencia: 'unico', fecha: '2027-01-15', medio: 'transferencia', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-21', hechos: {}, previos: [], asignaciones: { '2027-01-15': [{ de: 'unico:aguinaldo', monto: 10000 }] } });
                    },
                }),
            'fijo:extras',
        ),
        pasos: [
            { que: 'Aquí ves tu aguinaldo', g: 'aguinaldo', ejemplo: ej.aguinaldo, antes: abrirPagos, sel: () => grupo('Más adelante') },
            { que: 'Aquí ves la matrícula de enero', g: 'pagarConExtra', ejemplo: ej.matricula, antes: abrirEn('pagos', 'pago', 'matricula'), sel: seccion('Lo pagas con') },
            { que: 'Aquí anotas un adelanto de salario', g: 'adelanto', antes: abrirPagos, sel: '[data-fk="nuevo-ingreso"]' },
        ],
        pregunta: { p: 'Tu aguinaldo llega el 12 de diciembre. ¿Cuándo suma a tu libre?', ops: ['Desde hoy', 'El día que llega', 'En enero'], bien: 1, si: '¡Así es! Suma el día que llega, no antes.', casi: 'Casi: suma el día que llega. Antes no cuenta.', repaso: 0 },
    };
    const pasosVolver = ({ efectivo = null, ejemplo, porque }) => [
        { que: 'Si pasas días sin abrirla', g: 'alDia', antes: irA('hoy'), sel: 'section[aria-labelledby="av-dia"]' },
        {
            que: 'Ponte al día en un minuto',
            para: 'Te pregunta tres cosas: qué te llegó, qué pagaste y cuánto tienes.',
            ejemplo,
            antes: irA('hoy'),
            sel: 'section[aria-labelledby="av-dia"]',
            hazlo: { claves: ['aldia:fin'], senal: senalAlDia(efectivo), foco: null, pausa: pausaLibre('¡Listo, estás al día!', () => porque) },
        },
    ];
    const PREGUNTA_VOLVER = { p: 'Volviste después de dos semanas sin anotar. ¿Qué haces?', ops: ['Borras todo y empiezas', 'Tocas «Pongámonos al día»', 'Anotas todo lo que gastaste'], bien: 1, si: '¡Eso! En un minuto quedas al día, sin culpa.', casi: 'Casi: no tienes que anotar todo. «Pongámonos al día» te pregunta lo importante.', repaso: 0 };
    const VOLVER_FIJO = {
        id: 'volver',
        titulo: 'Volver después de días',
        sub: 'Ponte al día sin culpa',
        persona: 'ana',
        cargar: preparar(
            () =>
                ana({
                    cambio: (st) => {
                        st.hoy = '2026-11-06';
                        st.avisos = [];
                    },
                }),
            'fijo:volver',
        ),
        pasos: pasosVolver({ ejemplo: 'Te llegó la quincena y pagaste lo que vencía: lo marcas y listo.', porque: 'confirmaste lo que te llegó y lo que pagaste' }),
        pregunta: PREGUNTA_VOLVER,
    };

    // ------------------------------------------------------------------ versión 2 · ingresos que varían (Rosa)
    const ESENCIAL_VAR = {
        id: 'esencial',
        titulo: 'Lo esencial',
        sub: 'Lo que basta para empezar',
        persona: 'rosa',
        intro: 'Con datos de ejemplo de alguien que vende pupusas y recibe una remesa de su hijo.',
        cargar: preparar(() => rosa(), 'variable:esencial'),
        pasos: [
            pasoLibre,
            pasoAnotar('vendí 45', 'anotaste $45 de ventas', ej.anotar('pupusas', 'vendí 45', 45, true), [45]),
            {
                que: 'Con el mismo botón anotas un gasto',
                para: 'Lo del negocio y lo de la casa se anotan igual.',
                ejemplo: ej.anotar('queso', 'queso 12', 12),
                montos: [12],
                antes: irA('hoy'),
                sel: '[data-fk="nav-anotar"]',
                hazlo: { claves: ['guardado:gasto'], senal: senalAnotar('queso 12'), foco: '.portada', pausa: pausaLibre('Mira tu libre', () => 'anotaste $12 de queso') },
            },
            { que: 'Estos son tus próximos pagos', g: 'loQueViene', ejemplo: ej.loQueViene, antes: irA('hoy'), sel: 'section[aria-labelledby="h-pagos"]' },
            {
                que: 'Este aviso te ayuda con el alquiler',
                g: 'guardar',
                ejemplo: ej.guardar(40),
                montos: [40],
                antes: irA('hoy'),
                sel: '.aviso-hoy',
                hazlo: {
                    claves: ['guardado:reservar'],
                    senal: () => {
                        if (hoja('reservar')) return M.leerMonto(P.ui.hoja.monto) === 4000 ? tocar('[data-fk="reservar-ok"]', 'Toca «Reservar».') : escribir('#f-monto', '40', 'Borra el número y escribe 40 en «¿Cuánto?».');
                        if (!enPantalla('hoy')) return tocar('[data-fk="nav-hoy"]', 'Toca «Hoy» abajo.');
                        const b = document.querySelector('[data-fk="at-sug-si"]');
                        return tocar('[data-fk="at-sug-si"]', `Toca «${b ? b.textContent.trim() : 'Sí'}».`);
                    },
                    foco: '.portada',
                    pausa: pausaLibre('Mira tu libre', (a, d) => `guardaste ${corto(a.libre - d.libre)} para el alquiler`),
                },
            },
            { ...pasoCuadrar, que: 'Aquí cuadras al final del día' },
        ],
        pregunta: { p: '¿Qué es tu libre?', ops: ['Todo lo que tienes', 'Lo que tienes, menos ahorros y lo que pagas antes de fin de mes', 'Lo que vas a vender este mes'], bien: 1, si: '¡Exacto! Es lo que puedes gastar sin tocar lo que debes pagar.', casi: 'Casi: es lo que tienes, menos tus ahorros y lo que pagas antes de fin de mes.', repaso: 0 },
    };
    const HORIZONTE = {
        id: 'horizonte',
        titulo: '¿Hasta cuándo ves tu libre?',
        sub: 'Hasta fin de mes o 15 días',
        persona: 'rosa',
        cargar: preparar(() => rosa(), 'variable:horizonte'),
        pasos: [
            { que: 'Tu libre llega hasta fin de mes', g: 'hastaCuando', antes: irA('hoy'), sel: '.portada' },
            {
                que: 'Cámbialo a 15 días',
                para: 'Toca tu número y, abajo, elige «Los próximos 15 días».',
                ejemplo: ej.quince,
                antes: irA('hoy'),
                sel: '.portada',
                hazlo: {
                    claves: ['guardado:horizonte'],
                    senal: () => (hoja('desglose') ? tocar('[data-fk="hz-quince"]', 'Toca «Los próximos 15 días».') : enPantalla('hoy') ? tocar('[data-fk="portada"]', 'Toca tu número.') : tocar('[data-fk="nav-hoy"]', 'Toca «Hoy» abajo.')),
                    foco: '.portada',
                    pausa: (a, d) => ({ titulo: 'Ahora ves 15 días', filas: [filaLibre(a, d), { l: 'Por día', a: a.porDia, d: d.porDia, aprox: true }], texto: `Tu libre ahora llega hasta el ${d.hasta ? M.fechaCorta(d.hasta) : 'día 15'}${d.porDia !== null ? `: son ${dinero(d.porDia, { aprox: true })} por día` : ''}.` }),
                },
            },
            { que: 'También lo cambias en tu cuenta', para: 'Toca tu letra, arriba, y luego «Cómo te entra el dinero».', ejemplo: 'Ahí eliges: hasta fin de mes o los próximos 15 días.', antes: () => (irA('hoy')(), P.abrirHoja('menu')), sel: '[data-fk="menu-calendar-clock"]' },
        ],
        pregunta: { p: 'Tu libre dice «Hasta fin de mes». ¿Lo puedes cambiar?', ops: ['No, es fijo', 'Sí, a los próximos 15 días', 'Solo el primer día'], bien: 1, si: '¡Así es! Lo cambias cuando quieras.', casi: 'Casi: lo cambias cuando quieras, desde tu número o desde tu cuenta.', repaso: 0 },
    };
    const PROXIMO_MES = {
        id: 'proximoMes',
        titulo: 'El próximo mes y la remesa',
        sub: 'Lo que viene y lo que esperas',
        persona: 'rosa',
        cargar: preparar(() => rosa(), 'variable:proximoMes'),
        pasos: [
            { que: 'Así quedas el próximo mes', g: 'proxima', ejemplo: ej.proxima, antes: irA('hoy'), sel: '.proy-w' },
            { que: 'Esta es la remesa que esperas', g: 'remesa', ejemplo: ej.remesa, antes: abrirPagos, sel: '[data-fk^="i-remesa-"]' },
            {
                que: 'Cuando llegue, dilo aquí',
                para: 'El día que te llega, abre la remesa y toca «Ya llegó».',
                ejemplo: ej.remesaLlega,
                antes: abrirPagos,
                sel: '[data-fk^="i-remesa-"]',
                hazlo: {
                    claves: ['reparte:fin'],
                    senal: () => {
                        const top = arriba();
                        if (top && top.tipo === 'reparte') return tocar('[data-fk="rep-listo"]', 'Toca «Listo».');
                        if (hoja('ingresoLlego')) return tocar('[data-fk="ing-ok"]', 'Deja lo que dice y toca «Siguiente».');
                        if (top && top.tipo === 'ingreso') return tocar('[data-fk="ing-llego"]', 'Toca «Ya llegó».');
                        return enPantalla('pagos') ? tocar('[data-fk^="i-remesa-"]', 'Toca «Remesa de Josué».') : tocar('[data-fk="nav-pagos"]', 'Toca «Pagos» abajo.');
                    },
                    foco: '.portada',
                    pausa: pausaLibre('Llegó la remesa', (a, d) => `llegó la remesa de ${corto(d.libre - a.libre)}`),
                },
            },
        ],
        pregunta: { p: 'Esperas una remesa que no ha llegado. ¿Cuenta en tu libre?', ops: ['Sí, ya cuenta', 'No, cuenta cuando llega', 'Solo la mitad'], bien: 1, si: '¡Así es! Suma el día que llega y tocas «Ya llegó».', casi: 'Casi: la remesa suma cuando llega, no antes.', repaso: 1 },
    };
    const AHORROS_VAR = {
        id: 'ahorros',
        titulo: 'Ahorros y semanas malas',
        sub: 'Ponle nombre a tu dinero; si vendes poco, sin culpa',
        persona: 'rosa',
        cargar: preparar(() => rosa(), 'variable:ahorros'),
        pasos: [
            pasoAhorros,
            pasoAhorrar(20),
            // V2-59 (#29): la semana mala ya no aparece sola: la persona la abre y la cierra.
            { que: 'Si vendes poco, tu libre puede llegar a cero', g: 'libreCero', antes: irA('hoy'), sel: '.portada', ejemploVer: { boton: 'Ver un ejemplo', que: 'Así se vería una semana mala', texto: ej.semanaMala, volver: 'Volver a mis números' } },
        ],
        pregunta: { p: 'Tuviste una semana mala y tu libre quedó en cero. ¿Qué significa?', ops: ['Que hiciste algo mal', 'Que no te sobra', 'Que la app falló'], bien: 1, si: '¡Así es! No te sobra, y te digo cuánto falta. Sin culpa.', casi: 'Casi: cero quiere decir que no te sobra. Te digo cuánto falta, sin culpa.', repaso: 2 },
    };
    const TARJETAS_VAR = {
        id: 'tarjetas',
        titulo: 'Tarjetas y estado de cuenta',
        sub: 'Comprar con tarjeta y su estado de cuenta',
        persona: 'rosa',
        cargar: preparar(
            () =>
                rosa({
                    libre: 10000,
                    cambio: (st) => {
                        st.tarjetas.push({ id: 'credito', nombre: 'Crédito Agrícola', emoji: '💳', tipo: 'tarjeta', corte: 10, pagoDia: 5, cupo: 50000, interesesAnio: 0, estados: [{ corte: '2026-10-10', total: 2000, minimo: 500, aPagar: 2000, opcion: 'total', vence: '2026-11-05' }] });
                        st.medios.push({ id: 'credito', nombre: 'Crédito Agrícola', emoji: '💳', tarjeta: 'credito' });
                    },
                }),
            'variable:tarjetas',
        ),
        pasos: pasosTarjeta('harina 30 tarjeta', 'harina'),
        pregunta: PREGUNTA_TARJETA,
    };
    const VOLVER_VAR = {
        id: 'volver',
        titulo: 'Volver después de días',
        sub: 'Ponte al día sin culpa',
        persona: 'rosa',
        cargar: preparar(
            () =>
                rosa({
                    cambio: (st) => {
                        st.hoy = '2026-11-02';
                        st.avisos = [];
                    },
                }),
            'variable:volver',
        ),
        // Quien vende y no anotó sus ventas: al contar su efectivo, lo vendido ya cuenta.
        pasos: pasosVolver({ efectivo: 250, ejemplo: 'No anotaste tus ventas: cuentas tu efectivo y lo vendido ya cuenta.', porque: 'contaste tu efectivo: lo que vendiste estos días ya cuenta' }),
        pregunta: PREGUNTA_VOLVER,
    };

    const VERSIONES = {
        fijo: { id: 'fijo', emoji: '💼', etiqueta: 'Me pagan en fecha fija', sub: 'Quincena, mes o semana', corto: 'fecha fija', persona: 'ana', caps: [ESENCIAL_FIJO, PROXIMA, AHORROS_FIJO, TARJETAS_FIJO, EXTRAS, VOLVER_FIJO] },
        variable: { id: 'variable', emoji: '🏪', etiqueta: 'Me entra cuando vendo o trabajo', sub: 'Varía', corto: 'ingresos que varían', persona: 'rosa', caps: [ESENCIAL_VAR, HORIZONTE, PROXIMO_MES, AHORROS_VAR, TARJETAS_VAR, VOLVER_VAR] },
    };
    for (const v of Object.values(VERSIONES)) for (const c of v.caps) c.version = v.id;
    const capDe = (version, id) => (VERSIONES[version] || VERSIONES.fijo).caps.find((c) => c.id === id) || null;
    const clave = (cap) => `${cap.version}:${cap.id}`;
    const esVariable = (cap) => cap.version === 'variable';
    /** Los textos de un paso: el título dice qué estás viendo; el glosario, para qué te sirve y un ejemplo. */
    const valor = (x) => (typeof x === 'function' ? x() : x);
    const textosPaso = (cap, paso) => {
        const g = paso.g ? glosario(paso.g, esVariable(cap)) : null;
        return { que: valor(paso.que), para: paso.para || (g ? g.para : ''), ejemplo: valor(paso.ejemplo) || (g ? g.ejemplo : '') };
    };
    const TEXTO_ELEGIR = 'Hay dos versiones. Elige la que se parece a ti; después puedes hacer la otra.';
    const TEXTO_OSCURO = 'Te muestro una cosa a la vez. Lo que queda oscuro lo verás después.';

    // ------------------------------------------------------------------ progreso (pamplanea-entrenamiento)
    const T = (P.tour = { activo: false, fase: null, cap: null, i: 0, VERSIONES, capDe, esperaPausa: 900 });
    const ent = () => (P.modos ? P.modos.entrenamiento() : {});
    /** Dónde va cada capítulo. Lo «hecho» de la v2.4.1 (el recorrido de 15 pasos) cuenta como «Lo esencial» hecho. */
    function progreso() {
        const e = ent();
        const caps = { ...(e.caps || {}) };
        for (const [v, estado] of Object.entries(e.tours || (e.tour ? { fijo: e.tour } : {}))) {
            if (estado === 'hecho' && !caps[v + ':esencial']) caps[v + ':esencial'] = { paso: 0, hecho: true };
        }
        return { caps, version: VERSIONES[e.tourVersion] ? e.tourVersion : null, ultimo: e.tourUltimo || null };
    }
    T.progreso = progreso;
    /** V2-76 (para las pruebas): los montos que el paso actual pide escribir o hacer. */
    T.montosPaso = () => {
        const p = T.cap && T.cap.pasos[T.i];
        return (p && valor(p.montos)) || [];
    };
    const estadoCap = (cap) => progreso().caps[clave(cap)] || { paso: 0, hecho: false };
    function guardarCap(cap, cambios) {
        if (!P.modos) return;
        const pr = progreso();
        const k = clave(cap);
        P.modos.guardarEntrenamiento({ caps: { ...pr.caps, [k]: { ...(pr.caps[k] || { paso: 0, hecho: false }), ...cambios } }, tourVersion: cap.version, tourUltimo: k });
    }
    /** Para «Cuéntale a Victor o a Pam cómo vas»: qué hizo del entrenamiento. */
    T.resumen = () => {
        const pr = progreso();
        const partes = [];
        for (const v of Object.values(VERSIONES)) {
            const esencial = pr.caps[v.id + ':esencial'];
            const mas = v.caps.filter((c) => c.id !== 'esencial' && (pr.caps[clave(c)] || {}).hecho).length;
            if (esencial && esencial.hecho) partes.push(`hice «Lo esencial» (${v.corto})${mas ? ` y ${mas} ${mas === 1 ? 'capítulo' : 'capítulos'} de «Aprende más»` : ''}`);
            else if (esencial && esencial.paso > 0) partes.push(`dejé «Lo esencial» (${v.corto}) en el paso ${Math.min(esencial.paso, 6) + 1}`);
            else if (mas) partes.push(`hice ${mas} ${mas === 1 ? 'capítulo' : 'capítulos'} de «Aprende más» (${v.corto})`);
        }
        return partes.length ? partes.join(' y ') : 'no lo hice';
    };
    /** Todos los textos de una versión (para las pruebas de legibilidad), con números de ejemplo donde son dinámicos. */
    T.textos = (version) => {
        const v = VERSIONES[version];
        const a = { libre: 40000, tienes: 131500, efectivo: 1900, quedan: 54500, apartado: 90000, porDia: 4400, hasta: '2026-10-30' };
        const d = { libre: 39400, tienes: 130000, efectivo: 1500, quedan: 59500, apartado: 95000, porDia: 4300, hasta: '2026-11-05' };
        T.cuadre = T.cuadre || { cree: 1900, di: 1500 };
        const out = [v.etiqueta, v.sub, TEXTO_ELEGIR, TEXTO_OSCURO, '¿Cómo te entra el dinero?', '¿Sigues donde te quedaste?'];
        // V2-76: los ejemplos se calculan con los datos de cada capítulo, como en la pantalla (solo con los ejemplos;
        // al terminar, lo que estaba cargado vuelve como estaba).
        const antes = P.modo !== 'uso' && P.st ? structuredClone(P.st) : null;
        for (const cap of v.caps) {
            if (antes) cap.cargar();
            out.push(cap.titulo, cap.sub);
            if (cap.intro) out.push(cap.intro);
            for (const paso of cap.pasos) {
                const x = textosPaso(cap, paso);
                out.push(x.que, x.para, x.ejemplo);
                if (paso.ejemploVer) out.push(paso.ejemploVer.boton, paso.ejemploVer.que, valor(paso.ejemploVer.texto), paso.ejemploVer.volver);
                if (paso.hazlo) {
                    const p = paso.hazlo.pausa(a, d);
                    out.push(p.titulo, p.texto);
                }
            }
            const q = cap.pregunta;
            out.push(q.p, ...q.ops, q.si, q.casi);
            out.push(...finTextos(cap));
        }
        if (antes) {
            P.st = antes;
            P.render();
        }
        return out.filter(Boolean);
    };

    // ------------------------------------------------------------------ dibujar
    function bloquear(si) {
        for (const id of ['vista', 'nav', 'capa-hoja', 'aviso-proto', 'tarea-bar', 'capa-toast']) {
            const el = document.getElementById(id);
            if (el) el.inert = si || (['vista', 'nav'].includes(id) && !!P.ui.hoja);
        }
        document.getElementById('app').classList.toggle('con-tour', si);
    }
    const enHazlo = () => T.activo && T.fase === 'hazlo' && !!(T.cap && T.cap.pasos[T.i] && T.cap.pasos[T.i].hazlo);
    const btn = (texto, accion, { prim = false, fk = '', v = '', extra = '', cls = '' } = {}) => `<button type="button" class="btn${prim ? ' btn--prim' : ''}${cls ? ' ' + cls : ''}" data-a="${accion}"${v !== '' ? ` data-v="${v}"` : ''} data-fk="${fk}" ${extra}>${texto}</button>`;
    const enlace = (texto, accion, fk, v = '') => `<button type="button" class="link" data-a="${accion}"${v ? ` data-v="${v}"` : ''} data-fk="${fk}">${texto}</button>`;
    const barra = (n, de) => `<div class="tour-prog" aria-hidden="true"><span style="width:${Math.round((n * 100) / de)}%"></span></div>`;
    const rectEn = (el) => {
        const app = document.getElementById('app').getBoundingClientRect();
        const r = el.getBoundingClientRect();
        return { top: r.top - app.top, left: r.left - app.left, width: r.width, height: r.height, appW: app.width, appH: app.height };
    };
    /** Lo oscuro alrededor de lo que se explica (o se toca): cuatro piezas y, en medio, el hueco. */
    function oscuro(caja, appW, appH, cls = '') {
        if (!caja) return `<div class="tour-dim tour-dim--todo${cls}" aria-hidden="true"></div>`;
        const t = Math.max(0, caja.top);
        const b = Math.min(appH, caja.top + caja.height);
        const l = Math.max(0, caja.left);
        const r = Math.min(appW, caja.left + caja.width);
        const pieza = (top, left, width, height) => (width > 0 && height > 0 ? `<div class="tour-dim${cls}" style="top:${top}px;left:${left}px;width:${width}px;height:${height}px" aria-hidden="true"></div>` : '');
        return pieza(0, 0, appW, t) + pieza(b, 0, appW, appH - b) + pieza(t, 0, l, b - t) + pieza(t, r, appW - r, b - t);
    }
    const resolver = (sel) => (typeof sel === 'function' ? sel() : sel ? document.querySelector(sel) : null);
    const visible = (el) => !!el && el.getClientRects().length > 0;
    /**
     * Pone a la vista lo que se resalta moviendo solo su lista (la hoja o la pantalla). Nunca `scrollIntoView`: movía
     * la página entera y la barra de «Hazlo tú» se salía de la pantalla.
     */
    function alaVista(el) {
        const cont = el.closest('.hoja-c') || el.closest('#vista');
        if (cont) {
            const r = el.getBoundingClientRect();
            const c = cont.getBoundingClientRect();
            const fuera = r.top < c.top + 8 || r.bottom > c.bottom - 8;
            if (fuera) cont.scrollTop += r.top + r.height / 2 - (c.top + c.height / 2);
        }
        // El marco de la app nunca se desplaza (el teclado del teléfono lo maneja el navegador).
        const app = document.getElementById('app');
        if (app && app.scrollTop) app.scrollTop = 0;
    }
    /** Lo que se mueve en la app (una hoja que sube, una pantalla que entra) termina antes de medir. */
    function quieto() {
        const capa = document.getElementById('capa-tour');
        const corriendo = (document.getAnimations ? document.getAnimations() : []).filter((a) => a.playState === 'running' && a.effect && a.effect.target && !capa.contains(a.effect.target) && Number.isFinite(a.effect.getComputedTiming().endTime));
        return corriendo.length ? Promise.all(corriendo.map((a) => a.finished.catch(() => null))) : null;
    }
    /** El hueco (con un margen) de lo que se resalta. */
    function cajaDe(el, m = 6) {
        const r = rectEn(el);
        return { top: Math.max(0, r.top - m), left: Math.max(4, r.left - m), width: Math.min(r.appW - 8, r.width + m * 2), height: Math.min(r.appH, r.height + m * 2), appW: r.appW, appH: r.appH };
    }

    /** La tarjeta del paso: arriba o abajo de lo resaltado (donde haya más espacio), al pie o al centro. */
    function pintarTarjeta(capa, { el, cab, titulo, cuerpo, acciones, rol = 'dialog' }) {
        const app = document.getElementById('app').getBoundingClientRect();
        let caja = null;
        let lado = 'centro';
        let top = 0;
        if (el) {
            alaVista(el);
            caja = cajaDe(el);
            const abajo = app.height - (caja.top + caja.height);
            lado = abajo >= caja.top ? 'abajo' : 'arriba';
            top = lado === 'abajo' ? caja.top + caja.height + 12 : caja.top - 12;
            if (Math.max(abajo, caja.top) < 200) lado = 'pie';
        }
        const anillo = caja ? `<div class="tour-foco" style="top:${caja.top}px;left:${caja.left}px;width:${caja.width}px;height:${caja.height}px" aria-hidden="true"></div>` : '';
        capa.innerHTML = `${oscuro(caja, app.width, app.height)}${anillo}<section class="tour-card tour-card--${lado}" role="${rol}" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x" style="${lado === 'abajo' ? `top:${top}px` : lado === 'arriba' ? `bottom:${app.height - top}px` : ''}">${cab}<h2 class="tour-t" id="tour-t" tabindex="-1">${titulo}</h2><div id="tour-x">${cuerpo}</div>${acciones}</section>`;
        // Si la tarjeta no cabe completa arriba o abajo, va al pie de la pantalla (nunca cortada).
        const card = capa.querySelector('.tour-card');
        const r = card.getBoundingClientRect();
        if ((lado === 'arriba' || lado === 'abajo') && (r.top < app.top + 8 || r.bottom > app.top + app.height - 8)) {
            card.classList.replace('tour-card--' + lado, 'tour-card--pie');
            card.style.top = '';
            card.style.bottom = '';
        }
    }
    const cabecera = (texto, extra = '') => `<div class="tour-cab"><p class="paso">${texto}</p>${extra}</div>`;
    const indicador = (cap, i) => `${esc(cap.titulo === 'Lo esencial' ? 'Lo esencial' : cap.titulo)} · paso ${i + 1} de ${cap.pasos.length}`;
    const cuerpoPaso = (x) => `${x.para ? `<p class="txt tour-para">${esc(x.para)}</p>` : ''}${x.ejemplo ? `<p class="tour-ej"><span class="tour-ej-l">Ejemplo</span><span class="tour-ej-x">${esc(x.ejemplo)}</span></p>` : ''}`;
    const salir = enlace('Salir', 'tourSalir', 'tour-salir');
    const pie = (izq, der) => `<div class="tour-acc">${izq}<div class="tour-btns">${der}</div></div>`;

    function pintar() {
        const capa = $('#capa-tour');
        const libre = enHazlo();
        document.documentElement.classList.toggle('con-hazlo', libre);
        capa.classList.toggle('capa-tour--libre', libre);
        capa.classList.toggle('tour-entra', !!T.animar);
        if (!T.activo) {
            capa.innerHTML = '';
            T.pintado = null;
            return;
        }
        if (T.fase === 'elegir') pintarElegir(capa);
        else if (T.fase === 'hazlo') pintarHazlo(capa);
        else pintarFase(capa);
        if (T.enfocar !== false) {
            const f = (T.enfocarFb && capa.querySelector('.tour-fb')) || capa.querySelector('#tour-t');
            if (f) f.focus({ preventScroll: true });
        }
        T.enfocarFb = false;
        T.enfocar = true;
        T.animar = false;
        // Para las pruebas: qué está dibujado (la fase y el paso).
        T.pintado = `${T.fase}:${T.i}`;
    }
    function repintar() {
        // Esperar a que la pantalla se dibuje (y a que termine de entrar una hoja) para medir lo que se resalta.
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                const espera = quieto();
                if (espera) espera.then(() => requestAnimationFrame(pintar));
                else pintar();
            }),
        );
    }

    /** «¿Cómo te entra el dinero?» — elige la versión (recuerda lo hecho y dónde ibas). */
    function pintarElegir(capa) {
        const pr = progreso();
        const op = (v) => {
            const e = pr.caps[v.id + ':esencial'] || {};
            const esencial = v.caps[0];
            const estado = e.hecho ? `${icon('circle-check', 'ico-xs')}Ya hiciste «Lo esencial»` : e.paso > 0 ? `Ibas en el paso ${Math.min(e.paso, esencial.pasos.length) + 1} de ${esencial.pasos.length}` : '';
            return `<button type="button" class="opcion-g elegir-op tour-version" data-a="tourVersion" data-v="${v.id}" data-fk="tour-version-${v.id}">${P.caja(v.emoji)}<span class="opcion-g-txt"><span class="opcion-g-t">${esc(v.etiqueta)}</span><span class="fila-s">${esc(v.sub)}</span>${estado ? `<span class="fila-s tour-version-e">${estado}</span>` : ''}</span>${icon('chevron-right', 'ico-xs')}</button>`;
        };
        capa.innerHTML = `<div class="tour-dim tour-dim--todo" aria-hidden="true"></div><section class="tour-card tour-card--centro" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x"><p class="paso">Aprender a usarla</p><h2 class="tour-t" id="tour-t" tabindex="-1">¿Cómo te entra el dinero?</h2><p class="txt" id="tour-x">${esc(TEXTO_ELEGIR)}</p><div class="opciones-grandes">${op(VERSIONES.fijo)}${op(VERSIONES.variable)}</div><div class="tour-acc">${enlace('Ahora no', 'tourCerrar', 'tour-saltar')}</div></section>`;
    }

    function pintarFase(capa) {
        const cap = T.cap;
        const n = cap.pasos.length;
        const paso = cap.pasos[T.i];
        const atras = btn('Atrás', 'tourAtras', { fk: 'tour-atras', extra: T.i === 0 && T.fase === 'paso' && !cap.intro ? 'disabled' : '' });
        if (T.fase === 'intro') {
            return pintarTarjeta(capa, {
                cab: cabecera(`${esc(cap.titulo)} · ${n} pasos`, enlace('Cambiar de versión', 'tourElegir', 'tour-cambiar')),
                titulo: 'Te enseño lo esencial',
                cuerpo: `<p class="txt tour-para">${esc(cap.intro)}</p><p class="txt tour-para">${esc(TEXTO_OSCURO)}</p>`,
                acciones: pie(enlace('Ahora no', 'tourSalir', 'tour-salir'), btn('Empezar', 'tourEmpezarCap', { prim: true, fk: 'tour-empezar' })),
            });
        }
        if (T.fase === 'retomar') {
            const donde = T.retomarEn >= n ? 'Ibas en la pregunta del final.' : `Ibas en el paso ${T.retomarEn + 1} de ${n}.`;
            return pintarTarjeta(capa, {
                cab: cabecera(esc(cap.titulo)),
                titulo: '¿Sigues donde te quedaste?',
                cuerpo: `<p class="txt tour-para">${esc(donde)}</p>`,
                acciones: `<div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="tourRetomar" data-v="si" data-fk="tour-seguir">Seguir</button><button type="button" class="btn btn--48 btn--full" data-a="tourRetomar" data-v="no" data-fk="tour-nuevo">Empezar de nuevo</button></div>`,
            });
        }
        if (T.fase === 'paso') {
            const x = textosPaso(cap, paso);
            const ver = paso.ejemploVer;
            if (ver && T.ejemplo) {
                return pintarTarjeta(capa, { el: resolver(paso.sel), cab: cabecera(indicador(cap, T.i)), titulo: esc(ver.que), cuerpo: `<p class="txt tour-para">${esc(valor(ver.texto))}</p>`, acciones: pie('', btn(esc(ver.volver), 'tourEjemplo', { prim: true, v: 'no', fk: 'tour-ejemplo-volver' })) });
            }
            let acciones;
            if (T.repaso) acciones = pie('', btn('Volver a la pregunta', 'tourVolverPregunta', { prim: true, fk: 'tour-volver-pregunta' }));
            else if (paso.hazlo) acciones = pie(salir, `${atras}${btn('Hazlo tú', 'tourHazlo', { prim: true, fk: 'tour-hazlo' })}`);
            else acciones = `${ver ? `<button type="button" class="btn btn--48 btn--full tour-ver" data-a="tourEjemplo" data-v="si" data-fk="tour-ejemplo">${icon('eye', 'ico-s')}${esc(ver.boton)}</button>` : ''}${pie(salir, `${atras}${btn('Siguiente', 'tourSig', { prim: true, fk: 'tour-sig' })}`)}`;
            return pintarTarjeta(capa, { el: resolver(paso.sel), cab: `${barra(T.i + 1, n)}${cabecera(T.repaso ? 'Repaso' : indicador(cap, T.i))}`, titulo: esc(x.que), cuerpo: cuerpoPaso(x), acciones });
        }
        if (T.fase === 'pausa') {
            const p = paso.hazlo.pausa(T.antes, T.despues);
            const filas = p.filas
                .filter((f) => f.a !== null && f.a !== undefined)
                .map((f) => `<p class="tour-num"><span>${esc(f.l)}</span> ${f.a === f.d ? `<strong>${dinero(f.d, { aprox: f.aprox })}</strong> <span class="tour-igual">sin cambio</span>` : `${dinero(f.a, { aprox: f.aprox })} ${icon('arrow-right', 'ico-xs')} <strong>${dinero(f.d, { aprox: f.aprox })}</strong>`}</p>`)
                .join('');
            const foco = paso.hazlo.foco ? resolver(paso.hazlo.foco) : null;
            return pintarTarjeta(capa, { el: visible(foco) ? foco : null, cab: `${barra(T.i + 1, n)}${cabecera(indicador(cap, T.i))}`, titulo: esc(p.titulo), cuerpo: `${filas}<p class="txt tour-para tour-porque">${esc(p.texto)}</p>`, acciones: `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="tourEntendido" data-fk="tour-entendido">Entendido</button>` });
        }
        if (T.fase === 'pregunta') {
            const q = cap.pregunta;
            const fb = T.fb;
            const ops = q.ops.map((t, j) => `<button type="button" class="opcion-g tour-op${fb ? (j === q.bien ? ' tour-op--bien' : j === fb.elegida ? ' tour-op--casi' : '') : ''}" role="radio" aria-checked="${fb ? j === fb.elegida : false}" data-a="tourResponder" data-v="${j}" data-fk="tour-op-${j}" ${fb ? 'aria-disabled="true"' : ''}><span class="opcion-g-t">${esc(t)}</span>${fb && j === q.bien ? icon('circle-check', 'ico-ok') : ''}</button>`).join('');
            const acciones = !fb ? pie(salir, atras) : fb.ok ? pie('', btn('Terminar', 'tourTerminar', { prim: true, fk: 'tour-terminar' })) : `<div class="pila"><button type="button" class="btn btn--48 btn--full" data-a="tourRepasar" data-fk="tour-repasar">${icon('rotate-ccw', 'ico-s')}Repasar este paso</button><button type="button" class="btn btn--prim btn--48 btn--full" data-a="tourTerminar" data-fk="tour-terminar">Seguir</button></div>`;
            return pintarTarjeta(capa, { cab: cabecera(`${esc(cap.titulo)} · ¿Lo entendí?`), titulo: esc(q.p), cuerpo: `<div class="opciones-grandes" role="radiogroup" aria-labelledby="tour-t">${ops}</div>${fb ? `<p class="txt tour-fb${fb.ok ? ' tour-fb--bien' : ''}" role="status" tabindex="-1">${esc(fb.ok ? q.si : q.casi)}</p>` : ''}`, acciones });
        }
        if (T.fase === 'fin') {
            const [titulo, texto] = finTextos(cap);
            const usar = T.volverAUso ? btn(`${icon('smartphone', 'ico-s')}Volver a mis datos`, 'tourFin', { prim: true, v: 'uso', fk: 'tour-volver-uso', cls: 'btn--48 btn--full' }) : btn(`${icon('smartphone', 'ico-s')}Empezar con mis datos`, 'tourFin', { prim: cap.id === 'esencial', v: 'uso', fk: 'tour-usar', cls: 'btn--48 btn--full' });
            const mas = btn(`${icon('book-open', 'ico-s')}Aprender más`, 'tourFin', { prim: cap.id !== 'esencial' && !T.volverAUso, v: 'mas', fk: 'tour-mas', cls: 'btn--48 btn--full' });
            return pintarTarjeta(capa, { cab: `${barra(1, 1)}${cabecera(esc(cap.titulo))}`, titulo: esc(titulo), cuerpo: `<p class="txt tour-para">${esc(texto)}</p>`, acciones: `<div class="pila">${cap.id === 'esencial' || T.volverAUso ? usar + mas : mas + usar}</div>${enlace('Seguir mirando los ejemplos', 'tourFin', 'tour-mirar', 'mirar')}` });
        }
    }
    function finTextos(cap) {
        if (cap.id === 'esencial') return ['¡Listo! Ya sabes lo esencial', 'Con esto ya puedes empezar con tus datos. Lo demás, cuando quieras.'];
        return [`¡Listo! Terminaste «${cap.titulo}»`, 'En «Aprender más» están los otros capítulos. Hazlos cuando quieras.'];
    }

    // «Hazlo tú»: una barra arriba con la instrucción; lo demás queda oscuro y solo se toca lo que señala la flecha.
    function pintarHazlo(capa) {
        const cap = T.cap;
        const n = cap.pasos.length;
        capa.innerHTML = `<div class="tour-hueco" aria-hidden="true"></div><section class="tour-hz" role="region" aria-labelledby="tour-t">${barra(T.i + 1, n)}
            <div class="tour-hz-cab"><p class="tour-hz-n">${indicador(cap, T.i)} · Hazlo tú</p>${salir}</div>
            <p class="tour-hz-t" id="tour-t" tabindex="-1"><span id="tour-instr" aria-live="polite"></span><span class="tour-pista" id="tour-pista" aria-live="polite"></span></p>
            <div class="tour-hz-acc">${btn(`${icon('chevron-left', 'ico-s')}<span class="sr-only">Atrás</span>`, 'tourAtras', { fk: 'tour-atras', extra: 'aria-label="Atrás"' })}${btn(`${icon('sparkles', 'ico-s')}Hazlo por mí`, 'tourPorMi', { prim: true, fk: 'tour-por-mi' })}${btn('Saltar este paso', 'tourSaltarPaso', { fk: 'tour-saltar-paso', cls: 'tour-saltar-paso' })}</div>
        </section>`;
        T.senalSel = null;
        dibujarSenal();
        // Solo al entrar al paso: después la persona está usando la app (no se le quita el foco).
        if (T.enfocar === false) return;
        const t = capa.querySelector('#tour-t');
        if (t) t.focus({ preventScroll: true });
        T.enfocar = false;
    }
    /** Coloca lo oscuro, el hueco, el anillo y la flecha sobre lo que hay que tocar, y la instrucción en la barra. */
    function dibujarSenal() {
        const capa = $('#capa-tour');
        const hueco = capa.querySelector('.tour-hueco');
        if (!enHazlo() || !hueco) return;
        const paso = T.cap.pasos[T.i];
        const s = T.hecho ? null : paso.hazlo.senal();
        const instr = capa.querySelector('#tour-instr');
        if (instr && s && instr.textContent !== s.texto) instr.textContent = s.texto;
        const pista = capa.querySelector('#tour-pista');
        if (pista) pista.textContent = T.pista && !T.hecho ? 'Toca donde señala la flecha.' : '';
        const el = s && s.sel ? document.querySelector(s.sel) : null;
        if (s && el && s.sel !== T.senalSel) {
            T.senalSel = s.sel;
            T.pista = false;
            if (pista) pista.textContent = '';
            alaVista(el);
        }
        const app = document.getElementById('app').getBoundingClientRect();
        const hojaAbierta = document.querySelector('#capa-hoja .hoja');
        // En una hoja abierta, el hueco es toda la hoja (se ve lo que la app entendió); si no, solo lo que se toca.
        const agujero = !s || !visible(el) ? null : hojaAbierta && hojaAbierta.contains(el) ? cajaDe(hojaAbierta, 0) : cajaDe(el, 6);
        const firma = JSON.stringify([agujero && [agujero.top, agujero.left, agujero.width, agujero.height].map(Math.round), s && s.sel, app.width, app.height]);
        if (hueco.dataset.firma !== firma) {
            hueco.dataset.firma = firma;
            hueco.innerHTML = oscuro(agujero, app.width, app.height, ' tour-dim--suave');
            if (s && visible(el)) {
                const r = cajaDe(el, 4);
                const barraHz = capa.querySelector('.tour-hz').getBoundingClientRect();
                const tope = barraHz.bottom - app.top + 6;
                const arriba = r.top - 50 >= tope;
                const fl = { top: arriba ? r.top - 48 : r.top + r.height + 6, left: r.left + r.width / 2 - 20 };
                hueco.insertAdjacentHTML('beforeend', `<div class="tour-senal" style="top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px" aria-hidden="true"></div><div class="tour-flecha tour-flecha--${arriba ? 'abajo' : 'arriba'}" style="top:${fl.top}px;left:${Math.max(4, Math.min(app.width - 44, fl.left))}px" aria-hidden="true">${icon(arriba ? 'arrow-down' : 'arrow-up')}</div>`);
            }
        }
    }
    let senalRaf = 0;
    const seguirSenal = () => {
        if (!enHazlo()) return;
        cancelAnimationFrame(senalRaf);
        senalRaf = requestAnimationFrame(() => {
            // Si una hoja está subiendo, se mide cuando termine (si no, el hueco y la flecha quedan corridos).
            const espera = quieto();
            if (espera) espera.then(seguirSenal);
            else dibujarSenal();
        });
    };
    const capaTour = () => document.getElementById('capa-tour');
    new MutationObserver((lista) => {
        if (lista.some((m) => !capaTour().contains(m.target))) seguirSenal();
    }).observe(document.getElementById('app'), { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'class'] });
    document.addEventListener('scroll', seguirSenal, true);
    document.addEventListener('input', seguirSenal, true);
    // Tocar lo oscuro durante «Hazlo tú»: no pasa nada, solo se recuerda dónde tocar.
    document.addEventListener('click', (e) => {
        if (!enHazlo() || !e.target.closest || !e.target.closest('.tour-hueco .tour-dim')) return;
        T.pista = true;
        dibujarSenal();
        P.emitir('tour:pista');
    });

    // ------------------------------------------------------------------ moverse
    function nuevaFase(fase, { bloqueo = true } = {}) {
        T.fase = fase;
        T.animar = true;
        T.enfocar = true;
        bloquear(bloqueo && fase !== 'hazlo');
        repintar();
    }
    function limpiarToast() {
        if (P.ui.toast) {
            P.ui.toast = null;
            P.renderToast();
        }
    }
    function guardarPaso() {
        if (T.cap && !T.repaso) guardarCap(T.cap, { paso: T.fase === 'pregunta' ? T.cap.pasos.length : T.i });
    }
    function ir(i) {
        const cap = T.cap;
        // Desde ya deja de ser «Hazlo tú» (lo que pase al cambiar de pantalla no cuenta como la acción del paso).
        T.fase = 'paso';
        quitarSemanaMala();
        T.ejemplo = false;
        limpiarToast();
        T.hecho = false;
        T.pista = false;
        T.repaso = false;
        if (i >= cap.pasos.length) return irPregunta();
        T.i = Math.max(0, i);
        prepararPaso(cap.pasos[T.i]);
        nuevaFase('paso');
        guardarPaso();
        P.emitir(`tour:${cap.id}:paso${T.i + 1}`);
    }
    /**
     * Deja la pantalla del paso. Si lo que el paso explica ya no está (por ejemplo, ya te pusiste al día y la tarjeta se
     * fue), los ejemplos del capítulo vuelven a como empezaron.
     */
    function prepararPaso(paso) {
        cerrarHoja();
        if (paso.antes) paso.antes();
        if (paso.sel && !visible(resolver(paso.sel))) {
            T.cap.cargar();
            if (paso.antes) paso.antes();
        }
    }
    function irPregunta() {
        quitarSemanaMala();
        cerrarHoja();
        T.fb = null;
        T.repaso = false;
        T.fase = 'pregunta';
        guardarPaso();
        nuevaFase('pregunta');
        P.emitir(`tour:${T.cap.id}:pregunta`);
    }
    /** Empieza un capítulo: si lo dejó a medias, primero pregunta si sigue. */
    function empezarCap(cap, { retomar = true } = {}) {
        if (P.ayuda) P.ayuda.cerrar({ foco: false });
        if (P.practica) P.practica.salir();
        T.activo = true;
        T.cap = cap;
        T.i = 0;
        T.repaso = false;
        T.ejemplo = false;
        T.hecho = false;
        if (P.modos) P.modos.guardarEntrenamiento({ tourVersion: cap.version });
        cap.cargar();
        const e = estadoCap(cap);
        if (retomar && e.paso > 0 && !e.hecho) {
            T.retomarEn = Math.min(e.paso, cap.pasos.length);
            irA('hoy')();
            nuevaFase('retomar');
            P.emitir('tour:retomar');
            return;
        }
        if (cap.intro) {
            irA('hoy')();
            nuevaFase('intro');
            P.emitir(`tour:${cap.version}:${cap.id}:intro`);
            return;
        }
        ir(0);
        P.emitir(`tour:${cap.version}:${cap.id}:empezar`);
    }
    T.empezarCap = (version, id, opciones = {}) => {
        const cap = capDe(version, id);
        if (!cap) return;
        T.volverAUso = !!opciones.desdeUso;
        empezarCap(cap, opciones);
    };
    function mostrarElegir() {
        quitarSemanaMala();
        cerrarHoja();
        if (P.ayuda) P.ayuda.cerrar({ foco: false });
        T.activo = true;
        T.cap = T.cap || null;
        nuevaFase('elegir');
        P.emitir('tour:elegir');
    }
    function elegirVersion(id) {
        const v = VERSIONES[id] || VERSIONES.fijo;
        if (P.modos) P.modos.guardarEntrenamiento({ tourVersion: v.id });
        const esencial = v.caps[0];
        if (estadoCap(esencial).hecho) {
            // Ya hizo «Lo esencial» de esa versión: los capítulos de «Aprende más».
            terminar({ avisar: false, reiniciar: false });
            P.cargarPersona(v.persona);
            P.ayuda.abrir('aprendeMas');
            P.emitir('tour:version:' + v.id);
            return;
        }
        empezarCap(esencial);
        P.emitir('tour:version:' + v.id);
    }
    /**
     * Al entrar a «Aprender a usarla»: la primera vez, «¿Cómo te entra el dinero?»; después, «Lo esencial» de su versión
     * si no lo ha terminado; si ya lo hizo, «Aprende más». `cap` abre un capítulo directo.
     */
    T.empezar = function ({ version = null, cap = null, desdeUso = false } = {}) {
        if (P.ayuda) P.ayuda.cerrar({ foco: false });
        if (P.practica) P.practica.salir();
        T.volverAUso = desdeUso;
        const v = version || progreso().version;
        if (!v) return mostrarElegir();
        if (cap) return T.empezarCap(v, cap, { desdeUso });
        if (!estadoCap(VERSIONES[v].caps[0]).hecho) return T.empezarCap(v, 'esencial', { desdeUso });
        P.ayuda.abrir('aprendeMas');
    };
    T.elegir = mostrarElegir;
    /** Al terminar o salir: los ejemplos vuelven a como estaban al inicio (V2-58 #22). */
    function terminar({ avisar = true, reiniciar = true } = {}) {
        quitarSemanaMala();
        const cap = T.cap;
        T.activo = false;
        T.fase = null;
        T.repaso = false;
        T.ejemplo = false;
        cerrarHoja();
        bloquear(false);
        pintar();
        P.ui.pagosModo = 'calendario';
        if (reiniciar && cap) P.cargarPersona(VERSIONES[cap.version].persona);
        if (avisar && reiniciar) P.avisar('Listo, dejé los ejemplos como al inicio para que practiques');
    }
    T.terminar = terminar;

    // ------------------------------------------------------------------ acciones
    const acc = P.acciones;
    acc.tourVersion = (d) => elegirVersion(d.v);
    acc.tourElegir = () => {
        if (T.activo && T.cap && T.fase !== 'elegir') guardarPaso();
        mostrarElegir();
    };
    acc.tourCerrar = () => {
        terminar({ avisar: false, reiniciar: !!T.cap });
        P.render({ foco: '#pantalla h1' });
        P.emitir('tour:elegir:no');
    };
    acc.tourEmpezarCap = () => {
        ir(0);
        P.emitir(`tour:${T.cap.version}:${T.cap.id}:empezar`);
    };
    acc.tourRetomar = (d) => {
        if (d.v === 'si') {
            if (T.retomarEn >= T.cap.pasos.length) irPregunta();
            else ir(T.retomarEn);
            return;
        }
        guardarCap(T.cap, { paso: 0 });
        T.cap.cargar();
        if (T.cap.intro) nuevaFase('intro');
        else ir(0);
    };
    acc.tourSig = () => ir(T.i + 1);
    acc.tourAtras = () => {
        if (T.fase === 'hazlo') {
            // Desde «Hazlo tú», vuelve a la explicación del mismo paso.
            prepararPaso(T.cap.pasos[T.i]);
            nuevaFase('paso');
            return;
        }
        if (T.fase === 'pregunta') return ir(T.cap.pasos.length - 1);
        if (T.i === 0 && T.cap.intro) {
            nuevaFase('intro');
            return;
        }
        ir(T.i - 1);
    };
    acc.tourHazlo = () => {
        const paso = T.cap.pasos[T.i];
        if (!paso.hazlo) return;
        if (paso.antes) paso.antes();
        T.antes = foto();
        T.hecho = false;
        T.pista = false;
        nuevaFase('hazlo');
        P.emitir(`tour:${T.cap.id}:hazlo${T.i + 1}`);
    };
    /** «Hazlo por mí»: un solo toque (o escribir en un campo); la flecha pasa a lo siguiente. */
    acc.tourPorMi = () => {
        if (!enHazlo() || T.hecho) return;
        const s = T.cap.pasos[T.i].hazlo.senal();
        const el = s && document.querySelector(s.sel);
        if (!el) return;
        P.emitir(`tour:${T.cap.id}:pormi${T.i + 1}`);
        if (s.hacer === 'tocar') {
            alaVista(el);
            el.click();
        } else if (s.hacer && s.hacer.escribir !== undefined) {
            el.value = s.hacer.escribir;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        seguirSenal();
    };
    acc.tourSaltarPaso = () => {
        cerrarHoja();
        ir(T.i + 1);
    };
    acc.tourEntendido = () => ir(T.i + 1);
    acc.tourEjemplo = (d) => {
        if (d.v === 'si') {
            simularSemanaMala();
            T.ejemplo = true;
            P.emitir('tour:ejemplo:ver');
        } else {
            quitarSemanaMala();
            T.ejemplo = false;
            P.emitir('tour:ejemplo:volver');
        }
        nuevaFase('paso');
    };
    acc.tourResponder = (d) => {
        if (T.fb) return;
        const q = T.cap.pregunta;
        const j = Number(d.v);
        T.fb = { elegida: j, ok: j === q.bien };
        T.enfocarFb = true;
        T.animar = false;
        pintar();
        P.emitir(`tour:${T.cap.id}:respuesta:${T.fb.ok ? 'bien' : 'casi'}`);
    };
    acc.tourRepasar = () => {
        const q = T.cap.pregunta;
        T.i = q.repaso;
        T.repaso = true;
        prepararPaso(T.cap.pasos[T.i]);
        nuevaFase('paso');
        P.emitir(`tour:${T.cap.id}:repaso`);
    };
    acc.tourVolverPregunta = () => {
        T.repaso = false;
        irPregunta();
    };
    acc.tourTerminar = () => {
        cerrarHoja();
        irA('hoy')();
        guardarCap(T.cap, { paso: 0, hecho: true });
        nuevaFase('fin');
        P.emitir(`tour:${T.cap.version}:${T.cap.id}:hecho`);
    };
    acc.tourFin = (d) => {
        const desdeUso = T.volverAUso;
        const version = T.cap.version;
        T.volverAUso = false;
        if (d.v === 'uso') {
            terminar({ avisar: false });
            P.modos.cambiar('uso');
        } else if (d.v === 'mas') {
            terminar({ avisar: false });
            P.ayuda.abrir('aprendeMas');
            if (desdeUso) T.volverAUso = true;
        } else terminar();
        P.emitir('tour:fin:' + d.v + ':' + version);
    };
    acc.tourSalir = () => {
        guardarPaso();
        terminar();
        P.render({ foco: '#pantalla h1' });
        P.emitir('tour:salir');
    };
    acc.tourCap = (d) => {
        const [version, id] = String(d.v).split(':');
        const desdeUso = P.modo === 'uso' || T.volverAUso;
        if (P.modo === 'uso') P.modos.cambiar('entrenamiento');
        T.empezarCap(version, id, { desdeUso });
    };
    // «Hazlo tú»: cuando la persona hace la acción, se ve primero el cambio en la app y después la pausa.
    window.addEventListener('proto', (e) => {
        if (!enHazlo() || T.hecho) return;
        const paso = T.cap.pasos[T.i];
        const c = String(e.detail.clave);
        if (!paso.hazlo.claves.some((x) => c === x || c.startsWith(x + ':'))) return;
        T.hecho = true;
        T.pista = false;
        dibujarSenal();
        setTimeout(() => {
            if (!enHazlo()) return;
            T.despues = foto();
            limpiarToast();
            cerrarHoja();
            nuevaFase('pausa');
            P.emitir(`tour:${T.cap.id}:hecho${T.i + 1}`);
        }, T.esperaPausa);
    });
    // Tab no sale de la tarjeta.
    function atraparTab(e) {
        const lista = [...document.querySelectorAll('.tour-card button:not([disabled]):not([aria-disabled="true"])')];
        if (!lista.length) return;
        const [a, z] = [lista[0], lista.at(-1)];
        if (!lista.includes(document.activeElement) || (!e.shiftKey && document.activeElement === z)) {
            e.preventDefault();
            (e.shiftKey ? z : a).focus();
        } else if (e.shiftKey && document.activeElement === a) {
            e.preventDefault();
            z.focus();
        }
    }
    document.addEventListener(
        'keydown',
        (e) => {
            if (!T.activo) return;
            // En «Hazlo tú» la app manda: Escape cierra lo que esté abierto, no el entrenamiento.
            if (enHazlo()) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (T.fase === 'elegir') acc.tourCerrar();
                else acc.tourSalir();
                return;
            }
            if (e.key === 'Tab') atraparTab(e);
        },
        true,
    );
    window.addEventListener('resize', () => {
        if (!T.activo) return;
        if (enHazlo()) seguirSenal();
        else {
            T.enfocar = false;
            pintar();
        }
    });

    // ------------------------------------------------------------------ en Hoy: «Sigue donde te quedaste»
    function aMedias() {
        const pr = progreso();
        const k = pr.ultimo;
        if (!k) return null;
        const [version, id] = k.split(':');
        const cap = capDe(version, id);
        const e = pr.caps[k];
        if (!cap || !e || e.hecho || !(e.paso > 0)) return null;
        return { cap, e };
    }
    T.tarjetaHoy = () => {
        if (T.activo || P.modo === 'uso' || !P.modos) return '';
        const x = aMedias();
        if (!x) return '';
        const donde = x.e.paso >= x.cap.pasos.length ? 'te falta la pregunta del final' : `vas en el paso ${x.e.paso + 1} de ${x.cap.pasos.length}`;
        return `<section class="card card--aviso" aria-labelledby="tour-seguir-t"><div class="aviso-cab">${P.caja('🎓')}<div><h2 class="card-t" id="tour-seguir-t">Sigue donde te quedaste</h2><p class="txt">«${esc(x.cap.titulo)}» (${esc(VERSIONES[x.cap.version].corto)}): ${donde}.</p></div></div><div class="acciones-2"><button type="button" class="btn" data-a="tourOlvidar" data-fk="tour-hoy-no">Ya no</button><button type="button" class="btn btn--prim" data-a="tourSeguirHoy" data-fk="tour-hoy-seguir">Seguir</button></div></section>`;
    };
    acc.tourSeguirHoy = () => {
        const x = aMedias();
        if (!x) return;
        T.empezarCap(x.cap.version, x.cap.id);
        if (T.fase === 'retomar') acc.tourRetomar({ v: 'si' });
    };
    acc.tourOlvidar = () => {
        const x = aMedias();
        if (x) guardarCap(x.cap, { paso: 0 });
        P.render({ foco: '#pantalla h1' });
    };

    // ------------------------------------------------------------------ «Aprende más»: los capítulos y su marca de «hecho»
    function vistaAprendeMas() {
        const pr = progreso();
        const v = VERSIONES[pr.version] || VERSIONES[P.st && !M.principal(P.st) ? 'variable' : 'fijo'];
        const fila = (cap) => {
            const e = pr.caps[clave(cap)] || {};
            const estado = e.hecho ? `<span class="ay-caso-ok">${icon('circle-check', 'ico-s')}<span class="sr-only">hecho</span></span>` : '';
            const nota = e.hecho ? 'Hecho' : e.paso > 0 ? (e.paso >= cap.pasos.length ? 'Te falta la pregunta' : `Ibas en el paso ${e.paso + 1} de ${cap.pasos.length}`) : `${cap.pasos.length} pasos y una pregunta`;
            return `<li><button type="button" class="ay-caso ay-caso--ej" data-a="tourCap" data-v="${clave(cap)}" data-fk="cap-${cap.id}"><span class="ay-caso-t">${esc(cap.titulo)}<span class="fila-s">${esc(cap.sub)}</span><span class="fila-s cap-estado">${esc(nota)}</span></span>${estado}</button></li>`;
        };
        const [esencial, ...resto] = v.caps;
        const hechos = resto.filter((c) => (pr.caps[clave(c)] || {}).hecho).length;
        return `<p class="txt">Capítulos cortos con datos de ejemplo. Hazlos en el orden que quieras, hoy u otro día. Nada toca tus datos.</p>
            <div class="ay-version-elegida"><p class="fila-s">Tu versión: <strong>${esc(v.corto)}</strong></p><button type="button" class="link" data-a="tourElegir" data-fk="am-cambiar">Cambiar</button></div>
            <ul class="ay-casos" aria-label="Lo esencial">${fila(esencial)}</ul>
            <h3 class="campo-l" id="am-mas">Aprende más <span class="opcional">· ${hechos} de ${resto.length} hechos</span></h3>
            <ul class="ay-casos" aria-labelledby="am-mas">${resto.map(fila).join('')}</ul>
            <div class="pila">${P.modo === 'uso' ? '' : `<button type="button" class="btn btn--48 btn--full" data-a="ayIr" data-v="practica" data-fk="am-practica">${icon('list-checks', 'ico-s')}Practicar con ejemplos</button>`}<button type="button" class="btn btn--48 btn--full" data-a="${P.modo === 'uso' ? 'ayCerrar' : T.volverAUso ? 'amVolverUso' : 'modoCambiar'}" data-v="uso" data-fk="am-usar">${icon('smartphone', 'ico-s')}${P.modo === 'uso' || T.volverAUso ? 'Volver a mis datos' : 'Empezar con mis datos'}</button></div>`;
    }
    acc.amVolverUso = () => {
        T.volverAUso = false;
        P.ayuda.cerrar({ foco: false });
        P.modos.cambiar('uso');
    };

    // ------------------------------------------------------------------ practicar con ejemplos (de fácil a difícil)
    const buscarCaso = (id) => [...window.CASOS, ...(window.CASOS_PRACTICA || [])].find((c) => c.id === id);
    const finDe = (caso) => {
        const ultimo = caso.pasos.filter((p) => p.clave).at(-1);
        return ultimo ? [].concat(ultimo.clave) : [];
    };
    const PR = (P.practica = { caso: null, logrado: false });
    PR.activa = () => !!PR.caso && P.modo !== 'uso';
    PR.salir = () => {
        PR.caso = null;
        PR.logrado = false;
        P.ayuda && P.ayuda.pintarBarra();
    };
    PR.empezar = (id) => {
        PR.caso = buscarCaso(id);
        PR.logrado = false;
        if (P.ayuda) {
            P.ayuda.salirDePrueba();
            P.ayuda.cerrar({ foco: false });
        }
        P.cargarCaso(id);
        P.ayuda.pintarBarra();
        P.emitir('practica:empezar:' + id);
    };
    PR.pintar = (barraEl) => {
        const c = PR.caso;
        document.documentElement.classList.add('con-tarea');
        barraEl.hidden = false;
        barraEl.innerHTML = PR.logrado
            ? `<div class="tarea-txt tarea-txt--ok">${icon('circle-check', 'ico-s')}<span class="tarea-t"><strong>¡Lo lograste!</strong> ${esc(c.titulo)}</span></div><div class="tarea-acc"><button type="button" class="tarea-btn tarea-btn--prim" data-a="prSiguiente" data-fk="pr-siguiente">Otro</button></div>`
            : `<button type="button" class="tarea-txt" data-a="ayIr" data-v="comoSeHace" data-fk="pr-ver" aria-label="Ejercicio: ${esc(c.tarea)}. Ver cómo se hace"><span class="tarea-n">Ejercicio · ${esc(c.titulo)}</span><span class="tarea-t">${esc(c.tarea)}</span></button><div class="tarea-acc"><button type="button" class="tarea-btn" data-a="ayIr" data-v="comoSeHace" data-fk="pr-como">¿Cómo?</button><button type="button" class="tarea-btn" data-a="prSalir" data-fk="pr-salir">Salir</button></div>`;
    };
    window.addEventListener('proto', (e) => {
        if (!PR.activa() || PR.logrado) return;
        if (finDe(PR.caso).includes(String(e.detail.clave))) {
            PR.logrado = true;
            const en = P.modos.entrenamiento();
            P.modos.guardarEntrenamiento({ practicas: { ...(en.practicas || {}), [PR.caso.id]: true } });
            P.ayuda.pintarBarra();
            P.emitir('practica:lograda:' + PR.caso.id);
        }
    });
    acc.prSalir = () => {
        PR.salir();
        P.ayuda.abrir('practica');
    };
    acc.prSiguiente = () => {
        PR.salir();
        P.ayuda.abrir('practica');
    };
    acc.prEmpezar = (d) => PR.empezar(d.v);
    // Cada ejercicio dice a qué versión aplica y (v2.5) qué capítulo conviene hacer antes; primero van los de tu versión.
    const NOMBRE_VERSION = { fijo: 'Fecha fija', variable: 'Varía', ambos: 'Para todos' };
    function capituloAntes(x, mia) {
        const id = typeof x.capitulo === 'string' ? x.capitulo : x.capitulo && (x.capitulo[mia] || x.capitulo[x.version]);
        const version = x.version === 'ambos' ? mia : x.version;
        return id ? capDe(version, id) : null;
    }
    function vistaPractica() {
        const pr = progreso();
        const hechas = (P.modos ? P.modos.entrenamiento().practicas : {}) || {};
        const mia = pr.version || 'fijo';
        const lista = (window.PRACTICA || []).map((x) => ({ ...x, caso: buscarCaso(x.id) })).filter((x) => x.caso);
        const aplica = (x) => x.version === 'ambos' || x.version === mia;
        const fila = (x) => {
            const { caso: c, nivel, version } = x;
            const cap = capituloAntes(x, mia);
            const capHecho = cap && (pr.caps[clave(cap)] || {}).hecho;
            return `<li><button type="button" class="ay-caso ay-caso--ej" data-a="prEmpezar" data-v="${c.id}" data-fk="pr-${c.id}"><span class="ay-caso-t">${esc(c.titulo)} <span class="niveles"><span class="nivel nivel--${nivel === 'Fácil' ? 'facil' : nivel === 'Media' ? 'media' : 'dificil'}">${esc(nivel)}</span><span class="nivel nivel--version">${esc(NOMBRE_VERSION[version] || '')}</span></span><span class="fila-s">${esc(c.tarea)}</span>${cap ? `<span class="fila-s pr-antes">${capHecho ? icon('circle-check', 'ico-xs') : icon('book-open', 'ico-xs')}Antes: «${esc(cap.titulo)}»${capHecho ? ' (hecho)' : ''}</span>` : ''}</span>${hechas[c.id] ? `<span class="ay-caso-ok">${icon('circle-check', 'ico-s')}<span class="sr-only">hecho</span></span>` : ''}</button></li>`;
        };
        const tuyos = lista.filter(aplica);
        const otros = lista.filter((x) => !aplica(x));
        const otra = mia === 'variable' ? VERSIONES.fijo : VERSIONES.variable;
        return `<p class="txt">Ejercicios cortos con datos de ejemplo, de fácil a difícil. Cada uno dice qué capítulo conviene hacer antes. Si te trabas, toca «¿Cómo?».</p>
            <h3 class="campo-l" id="pr-tuyos">Para ti: ${esc(VERSIONES[mia].corto)}</h3>
            <ul class="ay-casos" aria-labelledby="pr-tuyos">${tuyos.map(fila).join('')}</ul>
            ${otros.length ? `<h3 class="campo-l" id="pr-otros">De ${esc(otra.corto)}</h3><ul class="ay-casos" aria-labelledby="pr-otros">${otros.map(fila).join('')}</ul>` : ''}
            <button type="button" class="btn btn--48 btn--full" data-a="ayIr" data-v="aprendeMas" data-fk="pr-capitulos">${icon('book-open', 'ico-s')}Ver los capítulos</button>
            <button type="button" class="btn btn--48 btn--full" data-a="modoCambiar" data-v="uso" data-fk="pr-usar">${icon('smartphone', 'ico-s')}Empezar con mis datos</button>`;
    }
    T.capituloAntes = capituloAntes;
    function vistaComoSeHace() {
        const c = PR.caso;
        if (!c) return vistaPractica();
        const sims = c.sims || [];
        return `<p class="campo-l">${esc(c.tarea)}</p>
            <ol class="ay-como">${c.pasos.map((p) => `<li>${esc(p.t)}</li>`).join('')}</ol>
            ${sims.length ? `<div class="ay-sims"><p class="campo-l">Para este ejercicio puedes adelantar el tiempo:</p>${sims.map((s) => `<button type="button" class="btn btn--48 btn--full ay-sim" data-a="aySimular" data-v="${s.id}" data-fk="pr-sim-${s.id}">${icon('fast-forward', 'ico-s')}${esc(s.t.replace('Simular: ', 'Adelantar: '))}</button>`).join('')}</div>` : ''}
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayCerrar" data-fk="pr-volver">Volver al ejercicio</button>`;
    }
    PR.iniciar = () => {
        P.ayuda.registrar('practica', 'Practicar con ejemplos', vistaPractica);
        P.ayuda.registrar('comoSeHace', 'Cómo se hace', vistaComoSeHace);
        P.ayuda.registrar('aprendeMas', 'Aprender a usarla', vistaAprendeMas);
        // Si la app se cerró a mitad de un capítulo, los ejemplos vuelven a como estaban (se retoma desde Hoy).
        if (P.modo !== 'uso' && P.st && P.st.recorrido && !T.activo) {
            const persona = String(P.st.recorrido).startsWith('variable') ? 'rosa' : 'ana';
            if (!P.enGuia) P.cargarPersona(persona);
        }
    };
})();
