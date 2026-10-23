// Producto v2 · prototipo. v2.9.3 «Hoy claro» (APROBADO por Victor, 2026-10-23): Hoy, de arriba hacia abajo: el saludo, la
// portada con tu libre y una línea que lo explica, «Para hoy» (lo que te pide algo hoy, cada cosa con su botón), tus
// presupuestos en un carrusel que no se mueve solo, «Lo que viene» en dos grupos (lo que baja tu libre de hoy y lo que pagas
// con tu próximo ingreso) y un solo «+ Anotar» (el de abajo). Lee los mismos números del motor y usa las acciones de siempre.
// Nada de aquí guarda datos nuevos; lo que la pantalla recuerda (una fila abierta, «Ver las N») vive en P.ui.
'use strict';
(() => {
    const M = window.MOTOR;
    const P = window.P;
    const { dinero } = M;
    const { esc, icon, caja, sr, plural } = P;

    // ------------------------------------------------------------------ el libre, en una línea
    /**
     * Lo que explica el número, en una sola línea: hasta cuándo y cuánto al día; o lo que falta confirmar; o lo que falta
     * para cubrir lo que viene; o desde cuándo no anotas. Lo de la tarjeta y lo ya contado se explican en «¿De dónde sale?».
     */
    function datosLibre(k) {
        const st = P.st;
        const hz = k.hz;
        const porConfirmar = hz.esHoy ? hz.ocurrencia : (hz.atrasadas || []).at(-1) || null;
        const hasta = hastaCorto(hz);
        let linea = hasta;
        let falta = false;
        if (porConfirmar) linea = hz.esHoy ? `Falta confirmar tu ${P.nombreIngreso(hz)} de hoy` : `Falta confirmar tu ${P.nombreIngreso(hz)} del ${M.partes(porConfirmar.fecha)[2]}`;
        else if (k.libre <= 0 && (k.faltaPagos > 0 || k.sinCubrir > 0)) {
            linea = P.textoCero(k);
            falta = true;
        } else if (k.inactivo >= 10) linea = `Con lo último que anotaste, ${M.haceDias(M.ultimaActividad(st), st.hoy)}`;
        else if (k.porDia !== null) linea = `${hasta} · ${dinero(k.porDia, { aprox: true })} al día`;
        return { porConfirmar, etiqueta: porConfirmar ? 'Libre por ahora' : 'Libre', linea, falta, hasta };
    }
    /** «Hasta tu quincena del 30», «Hasta el viernes 23», «Hasta tu salario del 30», «Hasta fin de mes». */
    function hastaCorto(hz) {
        if (!hz.ingreso) return hz.modo === 'quince' ? `Hasta el ${M.fechaCorta(hz.fecha)}` : 'Hasta fin de mes';
        if (hz.esHoy) return `Hoy es tu ${P.nombreIngreso(hz)}`;
        const d = M.partes(hz.fecha)[2];
        if (hz.ingreso.frecuencia === 'semanal' || hz.ingreso.frecuencia === 'catorcenal') return `Hasta el ${M.DIAS[M.diaSemana(hz.fecha)]} ${d}`;
        if (hz.ingreso.frecuencia === 'quincenal') return `Hasta tu quincena del ${d}`;
        return `Hasta tu ${hz.ingreso.nombre.toLowerCase()} del ${d}`;
    }
    P.hoyDatosLibre = datosLibre;

    // ------------------------------------------------------------------ lo que viene, por con qué se paga
    /**
     * «Manda con qué lo pagas» (v2.9.2): cada parte de cada pago va con el dinero que la paga. Lo que sale de lo que tienes
     * ahora baja tu libre de hoy; lo que paga tu próximo ingreso no. Una parte repartida se ve en cada grupo con su monto
     * («$50.19 de $100.38»): cada peso, una vez. Lo vencido y lo que vence hoy van en «Para hoy», no aquí; y de un pago con
     * algo vencido no se ve el del mes siguiente (V2-80). Devuelve los grupos en orden (primero «ahora», después por fecha).
     */
    function loQueViene(k) {
        const st = P.st;
        const hz = k.hz;
        const conVencido = new Set(P.vencidosPlan().map(claveDe));
        const ocurrencias = P.proximosPagos(99).filter((o) => !conVencido.has(claveDe(o)) && !esUrgente(o));
        const grupos = new Map();
        for (const o of ocurrencias) {
            const total = o.parcial && o.estado !== 'arrastrado' ? o.parcial.falta : o.monto;
            for (const x of partesDe(o, hz)) {
                const g = M.esFundado(st, x.de) ? 'ahora' : x.de;
                if (!grupos.has(g)) grupos.set(g, []);
                grupos.get(g).push({ o, monto: x.monto === undefined ? total : x.monto, total, parte: x.monto !== undefined && total !== null && x.monto < total });
            }
        }
        const orden = (f) => (f === 'ahora' ? '0' : f === 'despues' ? '9' : M.esUnico(f) ? M.ingresoDeClave(st, f)?.fecha || '9' : f);
        const lista = [...grupos].map(([f, filas]) => ({ f, filas: filas.sort((a, b) => (a.o.fecha < b.o.fecha ? -1 : a.o.fecha > b.o.fecha ? 1 : 0)) }));
        lista.sort((a, b) => (orden(a.f) < orden(b.f) ? -1 : orden(a.f) > orden(b.f) ? 1 : 0));
        return lista;
    }
    const claveDe = (o) => (o.tarjeta ? 't' + o.tarjeta.id : 'p' + o.pago.id);
    const esUrgente = (o) => o.estado === 'vencido' || (o.estado === 'pendiente' && o.fecha === P.st.hoy);
    /** Las partes de un pago como las cuenta el motor (lo elegido en «¿Con qué lo pagas?», o lo normal). */
    function partesDe(o, hz) {
        const st = P.st;
        if (o.estado !== 'pendiente' || o.fecha < hz.fecha) return [{ de: 'ahora' }];
        if (o.tarjeta) {
            if (!(o.info && o.info.comoPago > 0 && o.fecha === o.info.vence && o.info.partes.length)) return [{ de: 'ahora' }];
            // Lo que pagas normalmente va con su ingreso; lo demás del estado de cuenta (tus compras) ya bajó tu libre.
            const partes = o.info.partes.map((x) => ({ de: x.de, monto: x.monto }));
            const resto = (o.monto || 0) - M.suma(partes, (x) => x.monto);
            if (resto > 0) partes.push({ de: 'ahora', monto: resto });
            return partes.length === 1 && partes[0].monto === o.monto ? [{ de: partes[0].de }] : partes;
        }
        const partes = M.asignacion(st, o.pago, o.fecha, o.monto, hz);
        return partes.length > 1 ? partes.map((x) => ({ de: x.de, monto: x.monto })) : [{ de: partes[0] ? partes[0].de : 'ahora' }];
    }
    /** «Baja tu libre de hoy» o «Con tu quincena del 30 · no baja tu libre de hoy» (el texto sale del periodo real). */
    function tituloGrupo(f, hz) {
        if (f === 'ahora') return { t: 'Baja tu libre de hoy', s: '' };
        const st = P.st;
        let cual;
        if (f === 'despues' || M.esUnico(f) || !hz.ingreso) cual = P.etiquetaFuente(f);
        else {
            const dia = M.partes(f)[2];
            const mes = f.slice(0, 7) === st.hoy.slice(0, 7) ? '' : ` de ${M.MESES[M.partes(f)[1] - 1]}`;
            cual = hz.ingreso.frecuencia === 'semanal' || hz.ingreso.frecuencia === 'catorcenal' ? `tu pago del ${M.DIAS[M.diaSemana(f)]} ${dia}${mes}` : `tu ${P.nombreIngreso(hz)} del ${dia}${mes}`;
        }
        return { t: `Con ${cual}`, s: 'no baja tu libre de hoy' };
    }
    P.hoyLoQueViene = loQueViene;

    /**
     * Una fila de «Lo que viene» en una línea: el día, el nombre y el monto, con el mismo formato que Mi plan. Al tocarla
     * aparecen «Ya pagué la de noviembre» (dice cuál es, para no pagar dos veces el equivocado) y «Ver detalle».
     */
    function filaViene(x) {
        const st = P.st;
        const o = x.o;
        const esTarjeta = !!o.tarjeta;
        const nombre = esTarjeta ? P.nombreTarjeta(o.tarjeta) : o.pago.nombre;
        const emoji = esTarjeta ? o.tarjeta.emoji : o.pago.emoji;
        const tipo = esTarjeta ? 'tarjeta' : 'pago';
        const id = esTarjeta ? o.tarjeta.id : o.pago.id;
        const fk = `${esTarjeta ? 't' : 'p'}-${id}-${o.fecha}`;
        const pagado = o.estado === 'pagado';
        const puedePagar = o.estado === 'pendiente';
        const abierta = P.ui.hoyAbierta === fk;
        // V2-80: solo se marca la que toca; si antes hay otra sin pagar, se dice cuál va primero.
        const sig = !esTarjeta && puedePagar ? M.porPagar(st, o.pago) : null;
        const espera = !!sig && sig.fecha !== o.fecha;
        const pagadoHoy = !esTarjeta && pagado && o.hecho && o.hecho.registro && (st.registros.find((r) => r.id === o.hecho.registro) || {}).fecha === st.hoy;
        const marca = pagado ? `<span class="hv-e">✓${sr(' Pagado')}</span>` : x.parte ? `<span class="hv-e">de ${esc(dinero(x.total, { aprox: o.estimado }))}</span>` : '';
        const monto = o.monto === null ? '<span class="monto monto--pend">Por confirmar</span>' : P.montoPlan(x.monto, 'gasto', { aprox: !!o.estimado && !o.parcial, gris: pagado });
        const dia = `<span class="pl-dia" aria-hidden="true"><span class="pl-dia-n">${M.partes(o.fecha)[2]}</span><span class="pl-dia-m">${M.MESES_CORTOS[M.partes(o.fecha)[1] - 1]}</span></span>`;
        const dentro = `${dia}${sr(`${M.capital(M.fechaCorta(o.fecha))}: `)}${caja(emoji, 'emo--sm')}<span class="pl-n">${esc(nombre)}</span>${marca}<span class="pl-m">${monto}</span>`;
        // Ronda 2 (APROBADO por Victor, 2026-10-23): «Ya pagué la de noviembre», «Ya pagué la del 5 nov».
        const cual = P.cualPago(esTarjeta ? o.tarjeta : o.pago, o.fecha);
        const btnPagar = puedePagar ? `<button type="button" class="btn btn--sm${espera ? ' btn--espera' : ''}" data-a="pagado" data-tipo="${tipo}" data-id="${id}" data-fecha="${o.fecha}" data-fk="pagado-${fk}" aria-label="${espera ? `Marcar ${esc(cual.nombre)} como ${cual.pagado}: primero el del ${esc(P.diaMes(sig.fecha))}` : `Marcar ${esc(cual.nombre)} como ${cual.pagado}`}">${esc(`Ya pagué ${cual.la} ${cual.de}`)}</button>` : '';
        const btnDeshacer = pagadoHoy ? `<button type="button" class="btn btn--sm" data-a="pagoDeshacer" data-id="${o.pago.id}" data-fecha="${o.fecha}" data-fk="deshacer-${fk}" aria-label="Deshacer: ${esc(nombre)} ya no está pagado">Deshacer</button>` : '';
        const btnVer = `<button type="button" class="link" data-a="abrir" data-tipo="${tipo}" data-id="${id}" data-fk="ver-${fk}">Ver detalle${icon('chevron-right', 'ico-xs')}</button>`;
        return `<li class="hv-f${pagado ? ' hv-f--hecha' : ''}${abierta ? ' hv-f--abierta' : ''}"><button type="button" class="pl-b hv-b" data-a="hoyFila" data-id="${fk}" data-fk="${fk}" aria-expanded="${abierta}" aria-controls="acc-${fk}">${dentro}${icon('chevron-down', 'ico-xs hv-chev')}</button><div class="hv-acc" id="acc-${fk}"${abierta ? '' : ' hidden'}>${btnPagar}${btnDeshacer}${btnVer}</div></li>`;
    }
    P.acciones.hoyFila = (d) => {
        P.ui.hoyAbierta = P.ui.hoyAbierta === d.id ? null : d.id;
        P.render({ foco: `[data-fk="${CSS.escape(d.id)}"]` });
    };

    /** «Lo que viene»: dos grupos, máximo 3 filas cada uno; lo demás, en «Ver mi plan». */
    function loQueVieneHtml(k) {
        const grupos = loQueViene(k);
        const total = grupos.reduce((n, g) => n + g.filas.length, 0);
        const verPlan = P.enlaceAccion('Ver mi plan', 'irTab', 'data-tab="pagos" data-fk="ver-pagos"');
        if (!total) return P.tarjetaSeccion('Lo que viene', `<p class="vacio">Nada por delante en tu plan. ${P.enlaceAccion('Agregar un gasto fijo', 'hoja', 'data-hoja="nuevoPago" data-fk="vacio-pago"')}</p>`, { id: 'h-pagos', accion: verPlan });
        // El grupo de hoy (si tiene algo) y el del próximo ingreso.
        const vistos = [grupos.find((g) => g.f === 'ahora'), grupos.find((g) => g.f !== 'ahora')].filter(Boolean);
        let mostradas = 0;
        const cuerpo = vistos
            .map((g) => {
                const t = tituloGrupo(g.f, k.hz);
                const filas = g.filas.slice(0, 3);
                mostradas += filas.length;
                return `<li class="hv-g" role="presentation"><p class="hv-gt"><span>${esc(t.t)}</span>${t.s ? `<span class="hv-gs"> · ${esc(t.s)}</span>` : ''}</p></li>${filas.map(filaViene).join('')}`;
            })
            .join('');
        const resto = total - mostradas;
        const pie = resto > 0 ? `<button type="button" class="hv-mas" data-a="irTab" data-tab="pagos" data-fk="hv-mas">${esc(resto === 1 ? '1 más en Mi plan' : `${resto} más en Mi plan`)}${icon('chevron-right', 'ico-xs')}</button>` : '';
        return P.tarjetaSeccion('Lo que viene', `<ul class="hv-lista">${cuerpo}</ul>${pie}`, { id: 'h-pagos', accion: verPlan });
    }

    // ------------------------------------------------------------------ presupuestos
    /** Los presupuestos de este periodo: primero los que te pasaste y luego los más cerca de su máximo. */
    function presupuestos(k) {
        const peso = (x) => (x.saltado ? -2 : x.listo ? -1 : x.tope ? x.anotado / x.tope : 0);
        return k.variables.slice().sort((a, b) => peso(b) - peso(a));
    }
    /** «quedan $45.00», «te pasaste $15.00», «listo ✓», «saltado». Con palabras: nada depende solo del color. */
    function estadoPresupuesto(x) {
        // `pre` y `monto` por separado: el monto nunca se parte en dos líneas.
        const e = (pre, monto, cls) => ({ t: monto ? `${pre} ${monto}` : pre, pre, monto, cls });
        if (x.saltado) return e('saltado', '', 'hp--quieto');
        if (x.pasado) return e('te pasaste', dinero(x.pasado), 'hp--pasado');
        if (x.listo) return x.sobro ? e('te sobró', `${dinero(x.sobro)} ✓`, 'hp--quieto') : e('listo ✓', '', 'hp--quieto');
        return e('quedan', dinero(x.falta), x.tope && x.anotado / x.tope >= 0.8 ? 'hp--cerca' : '');
    }
    P.hoyPresupuestos = presupuestos;
    /**
     * Ronda 2 (APROBADO por Victor, 2026-10-23): un carrusel que no se mueve solo: todos en una fila que se desliza con el
     * dedo, con el siguiente asomado. Es una lista con etiqueta (se recorre con Tab: el chip con foco se ve). «Ver todos (N)»
     * abre tus presupuestos en Mi plan. Cada chip: el nombre en máximo 2 líneas (completo para el lector de pantalla) y lo que
     * queda en su línea, sin partir el monto; todos de la misma altura.
     */
    function presChipsHtml(k) {
        const pres = presupuestos(k);
        if (!pres.length) return '';
        const chip = (x) => {
            const e = estadoPresupuesto(x);
            return `<li class="hp-li"><button type="button" class="chip hp-chip ${e.cls}" data-a="abrir" data-tipo="variable" data-id="${x.v.id}" data-fk="hp-${x.v.id}" aria-label="${esc(`${x.v.nombre}: ${e.t}`)}"><span class="hp-l1" aria-hidden="true">${P.emo(x.v.emoji, 18)}<span class="hp-n">${esc(x.v.nombre)}</span></span><span class="hp-e" aria-hidden="true">${e.cls === 'hp--pasado' ? icon('triangle-alert', 'ico-xs') : ''}<span>${esc(e.pre)}${e.monto ? ` <span class="hp-m">${esc(e.monto)}</span>` : ''}</span></span></button></li>`;
        };
        const todos = pres.length > 2 ? `<button type="button" class="link hp-todos" data-a="hoyVerPresupuestos" data-fk="hp-todos">Ver todos (${pres.length})</button>` : '';
        return `<section class="hp-sec" aria-labelledby="hp-t"><div class="hp-cab"><h2 class="hp-h" id="hp-t">Presupuestos <span class="hp-h-s">${esc(P.estePlan())}</span></h2>${todos}</div><ul class="hp-chips" aria-label="${esc(`${plural(pres.length, 'presupuesto', 'presupuestos')} ${P.estePlan()}`)}">${pres.map(chip).join('')}</ul></section>`;
    }
    /** «Ver todos (N)»: tus presupuestos de este periodo en Mi plan (la lista que ya existe), por fecha o por tipo. */
    P.acciones.hoyVerPresupuestos = () => {
        P.ui.pagosVista = 'actual';
        const porTipo = P.modoPlan && P.modoPlan() === 'tipo';
        if (porTipo) P.ui.planAbiertas = { ...(P.ui.planAbiertas || {}), variables: true };
        P.irTab('pagos');
        const h = document.getElementById(porTipo ? 'mp-gastos-variables' : 'pl-h-presupuestos');
        if (!h) return;
        h.scrollIntoView({ block: 'start' });
        (h.querySelector('button') || h).focus({ preventScroll: true });
    };

    // ------------------------------------------------------------------ para hoy
    /**
     * Lo que espera una respuesta tuya hoy (además de «¿Ya llegó?» y lo vencido o de hoy, que «Para hoy» arma aparte): los
     * avisos, el cierre de tus presupuestos, «Pongámonos al día» y las tarjetas de una vez. Cada uno con sus botones de
     * siempre (`html`, para la hoja «Para hoy»). `nivel`: rojo, ámbar o info (solo para el ícono: el texto dice lo que pasa).
     */
    function pendientes(k) {
        const st = P.st;
        const items = [];
        const cls = (n) => (n === 'rojo' ? 'nota--atencion' : n === 'ambar' ? 'nota--ambar' : 'nota--info');
        if (k.alDia) items.push({ id: 'aldia', nivel: 'info', corto: 'Pongámonos al día', emoji: '👋', directo: '<button type="button" class="btn btn--sm btn--prim" data-a="abrir" data-tipo="aldia" data-fk="aldia">Empezar</button>' });
        for (const x of P.atencion(k)) {
            // «Te faltan $X para cubrir lo que viene» ya lo dice el libre (con «¿De dónde sale?»): no se repite. Si ya falta
            // para lo que viene, «Faltan $X para cubrir tus ahorros» es lo mismo dicho con otro número. Lo vencido y lo de hoy
            // (y mañana, que está en «Lo que viene») van aparte.
            if (x.id === 'falta' || (x.id === 'ahorros' && k.faltaPagos > 0) || ['vencidos', 'hoy', 'manana'].includes(x.id)) continue;
            // Un título largo se dice corto en la fila («Te faltarían $70.00 aprox. el 30»); completo, al tocar «Ver».
            const largo = x.titulo.length > 60 && x.corto;
            items.push({ id: x.id, nivel: x.nivel, corto: largo ? M.capital(x.corto) : x.titulo, sub: largo ? '' : x.texto, pregunta: x.titulo.includes('?'), html: `<div class="nota ${cls(x.nivel)}">${icon(x.nivel === 'info' ? 'bell' : 'triangle-alert')}<div><p class="nota-t">${esc(x.titulo)}</p>${x.texto ? `<p>${esc(x.texto)}</p>` : ''}<div class="nota-acc">${x.acciones}</div></div></div>`, acciones: x.acciones });
        }
        for (const x of k.variables.filter((y) => M.preguntarVariable(st, y))) {
            items.push({ id: 'vc-' + x.v.id, nivel: 'info', corto: `¿Ya terminaste con ${x.v.nombre}?`, sub: `Ibas a gastar ${dinero(x.tope)} y anotaste ${dinero(x.anotado)}.`, emoji: x.v.emoji, html: cierreHtml(x) });
        }
        // Las tarjetas de una vez (avisos de la app, la oferta de tarjetas, «¿Cómo te ha ido?»); las de tus datos van aparte.
        (P.modos ? P.modos.tarjetasHoy(k) : []).filter((h) => !esCritica(h)).forEach((h, i) => items.push({ id: 'modo-' + i, nivel: 'info', corto: tituloDe(h), html: h }));
        if (P.tour && P.tour.tarjetaHoy) {
            const h = P.tour.tarjetaHoy();
            if (h) items.push({ id: 'tour', nivel: 'info', corto: tituloDe(h), html: h });
        }
        return items;
    }
    /** «No se están guardando tus datos» y «Guarda una copia»: siempre a la vista, nunca dentro de una lista. */
    const esCritica = (h) => /aviso-guardar|id="cf-t"/.test(h);
    /** El título de una tarjeta de aviso: su h2 (o su primer párrafo), sin etiquetas. */
    const tituloDe = (h) => ((/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(h) || /<p[^>]*>([\s\S]*?)<\/p>/.exec(h) || [, 'Un aviso'])[1]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const criticas = (k) => (P.modos ? P.modos.tarjetasHoy(k) : []).filter(esCritica).join('');
    /** El cierre de un presupuesto (v2.8 C-3), igual que siempre: tres respuestas. */
    function cierreHtml(x) {
        return `<section class="card card--aviso" aria-labelledby="vc-${x.v.id}"><div class="aviso-cab">${caja(x.v.emoji)}<div><h3 class="card-t" id="vc-${x.v.id}">Ibas a gastar ${dinero(x.tope)} en ${esc(x.v.nombre)} y anotaste ${dinero(x.anotado)}. ¿Ya terminaste?</h3><p class="txt">Si ya terminaste, los ${dinero(x.falta)} que sobran vuelven a tu libre.</p></div></div><div class="chips"><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="listo" data-fk="vc-listo-${x.v.id}">Sí, ya no gasto más en esto</button><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="falta" data-fk="vc-falta-${x.v.id}">Todavía voy a gastar</button><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="anotar" data-fk="vc-anotar-${x.v.id}">Me falta anotar algo</button></div></section>`;
    }
    P.hoyPendientes = pendientes;
    /** «Responder» o «Ver» de una fila de «Para hoy»: esa sola cosa, completa, con sus botones de siempre. */
    P.hojas.paraHoy = {
        html(h) {
            const x = pendientes(P.calc()).find((y) => y.id === h.id);
            return {
                titulo: 'Para hoy',
                cuerpo: x && x.html ? `<ul class="hr-lista"><li>${x.html}</li></ul>` : '<p class="vacio">Listo, ya quedó.</p>',
                pie: '<button type="button" class="btn btn--prim btn--48" data-a="cerrarHoja" data-fk="hr-listo">Listo</button>',
            };
        },
    };
    /**
     * «Para hoy»: lo que te pide algo hoy, una fila cada uno, con su botón. Primero «¿Ya llegó?» (una sola vez), luego lo
     * vencido y lo que vence hoy («Ya lo pagué») y lo demás: con una sola acción, a la vista; si no, «Responder» (si es una
     * pregunta) o «Ver». Máximo 3 filas y «Ver las N». Sin nada: una sola línea, «✓ Nada pendiente para hoy».
     */
    function paraHoyHtml(k, L) {
        const st = P.st;
        const hz = k.hz;
        const filas = [];
        const pend = pendientes(k);
        const fila = (x) => {
            const unBoton = x.acciones && (x.acciones.match(/<button/g) || []).length === 1 ? x.acciones.replace(/class="btn btn--sm( btn--prim)?"/, 'class="btn btn--sm btn--prim"') : null;
            const boton = x.directo || unBoton || `<button type="button" class="btn btn--sm" data-a="hoja" data-hoja="paraHoy" data-id="${esc(x.id)}" data-fk="pr-${esc(x.id)}">${(x.pregunta !== undefined ? x.pregunta : x.corto.includes('?')) ? 'Responder' : 'Ver'}</button>`;
            return { emoji: x.emoji || null, ico: x.nivel === 'info' ? 'bell' : 'triangle-alert', t: x.corto, s: x.sub && x.sub.length <= 64 ? x.sub : '', boton };
        };
        // «Pongámonos al día» primero: con él se confirma lo demás (y nunca queda detrás de «Ver las N»).
        for (const x of pend.filter((y) => y.id === 'aldia')) filas.push(fila(x));
        if (L.porConfirmar) {
            const ing = L.porConfirmar.ingreso;
            filas.push({ emoji: ing.emoji || '💼', t: hz.esHoy ? `¿Ya llegó tu ${P.nombreIngreso(hz)}?` : `¿Ya llegó tu ${P.nombreIngreso(hz)} del ${M.partes(L.porConfirmar.fecha)[2]}?`, s: `${dinero(L.porConfirmar.monto, { aprox: !!L.porConfirmar.aprox })} a ${M.lugar(st, ing.lugar)?.nombre || 'tu cuenta'}`, boton: `<button type="button" class="btn btn--sm btn--prim" data-a="hoja" data-hoja="ingresoLlego" data-id="${ing.id}" data-fecha="${L.porConfirmar.fecha}" data-fk="ing-si">Sí, ya llegó</button>` });
        }
        const urgentes = [...P.vencidosPlan(), ...P.proximosPagos(99).filter((o) => o.estado === 'pendiente' && o.fecha === st.hoy)];
        for (const o of urgentes) {
            const esT = !!o.tarjeta;
            const nombre = esT ? P.nombreTarjeta(o.tarjeta) : o.pago.nombre;
            const fk = `${esT ? 't' : 'p'}-${esT ? o.tarjeta.id : o.pago.id}-${o.fecha}`;
            const sig = !esT ? M.porPagar(st, o.pago) : null;
            const espera = !!sig && sig.fecha !== o.fecha;
            const monto = o.parcial && o.estado !== 'arrastrado' ? o.parcial.falta : o.monto;
            filas.push({ emoji: esT ? o.tarjeta.emoji : o.pago.emoji, t: nombre, s: `${o.estado === 'vencido' ? `venció el ${M.fechaCorta(o.fecha)}` : 'vence hoy'} · ${monto === null ? 'por confirmar' : dinero(monto, { aprox: !!o.estimado && !o.parcial })}`, venc: o.estado === 'vencido', abrir: `data-a="abrir" data-tipo="${esT ? 'tarjeta' : 'pago'}" data-id="${esT ? o.tarjeta.id : o.pago.id}" data-fk="${fk}"`, boton: `<button type="button" class="btn btn--sm${espera ? ' btn--espera' : ' btn--prim'}" data-a="pagado" data-tipo="${esT ? 'tarjeta' : 'pago'}" data-id="${esT ? o.tarjeta.id : o.pago.id}" data-fecha="${o.fecha}" data-fk="pagado-${fk}" aria-label="${espera ? `Marcar ${esc(nombre)} como pagado: primero el del ${esc(P.diaMes(sig.fecha))}` : `Marcar ${esc(nombre)} como pagado`}">Ya lo pagué</button>` });
        }
        for (const x of pend.filter((y) => y.id !== 'aldia')) filas.push(fila(x));
        // Ronda 2 (APROBADO por Victor, 2026-10-23): sin nada, una sola línea discreta, sin título ni caja (nunca en verde).
        if (!filas.length) return `<p class="hoy-nada">${icon('check', 'ico-s')}Nada pendiente para hoy</p>`;
        const verTodas = !!P.ui.hoyParaHoyTodas;
        const filaHoy = (x) => `<li class="ph-f${x.venc ? ' ph-f--venc' : ''}">${x.abrir ? `<button type="button" class="ph-f-b" ${x.abrir}>` : '<div class="ph-f-b">'}${x.emoji ? caja(x.emoji, 'emo--sm') : `<span class="emo emo--sm emo--ico${x.ico === 'triangle-alert' ? ' emo--aviso' : ''}" aria-hidden="true">${icon(x.ico)}</span>`}<span class="ph-f-txt"><span class="ph-f-t">${esc(x.t)}</span>${x.s ? `<span class="ph-f-s">${x.venc ? icon('clock', 'ico-xs') : ''}${esc(x.s)}</span>` : ''}</span>${x.abrir ? '</button>' : '</div>'}<span class="ph-f-acc">${x.boton}</span></li>`;
        return `<section class="ph-sec" aria-labelledby="ph-t">
                <div class="ph-cab"><h2 class="ph-h" id="ph-t">Para hoy</h2>${filas.length > 3 ? `<button type="button" class="link" data-a="hoyParaHoyTodas" data-fk="ph-todas" aria-expanded="${verTodas}">${verTodas ? 'Ver menos' : `Ver las ${filas.length}`}</button>` : ''}</div>
                <ul class="ph-lista">${(verTodas ? filas : filas.slice(0, 3)).map(filaHoy).join('')}</ul>
            </section>`;
    }
    P.acciones.hoyParaHoyTodas = () => {
        P.ui.hoyParaHoyTodas = !P.ui.hoyParaHoyTodas;
        P.render({ foco: '[data-fk="ph-todas"]' });
    };

    // ------------------------------------------------------------------ Hoy
    /** La portada: Libre, la línea que lo explica, «¿De dónde sale?» y el «?» de siempre («¿Ya llegó?» va en «Para hoy»). */
    function portadaHtml(k, L) {
        return `<div class="portada app-home-pattern hoy-portada">
                <svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${window.ARTE.circles}</svg>
                ${P.qBtn('libre')}
                <button type="button" class="portada-b" data-a="hoja" data-hoja="desglose" data-fk="portada" aria-label="${esc(L.etiqueta)} ${esc(dinero(k.libre))}. ${esc(L.linea)}. Ver de dónde sale">
                    <span class="portada-l">${esc(L.etiqueta)}</span><span class="portada-n">${dinero(k.libre)}</span>
                    <span class="portada-s${L.falta ? ' portada-s--falta' : ''}">${L.falta ? icon('triangle-alert', 'ico-xs') : ''}${esc(L.linea)}</span>
                    <span class="portada-mas">¿De dónde sale? ${icon('chevron-right', 'ico-xs')}</span>
                </button>
            </div>`;
    }
    const cabeza = (st) => `<header class="hoy-head">
                <button type="button" class="avatar" data-a="hoja" data-hoja="menu" data-fk="avatar" aria-label="Menú de ${esc(st.nombre || 'tu cuenta')}: ajustes, tu espacio y aprende">${esc((st.nombre || 'T').charAt(0).toUpperCase())}</button>
                <div class="hoy-saludo"><h1 class="h1" tabindex="-1">${st.nombre && P.modo === 'uso' ? 'Hola, ' + esc(st.nombre) : 'Hola'}</h1><p class="sub">${esc(M.capital(M.conDia(st.hoy)))}</p></div>
            </header>`;
    /** Las preguntas de una vez y la revisión de lo de antes de empezar: siguen como tarjetas (fila V45). */
    const preguntasHtml = () => (P.modos && P.modos.revisionHoy ? P.modos.revisionHoy() : '') + (P.modos && P.modos.preguntasHoy ? P.modos.preguntasHoy() : '');
    P.hoyC = function () {
        const st = P.st;
        const k = P.calc();
        const L = datosLibre(k);
        return `<div class="pg pg--hoy hoyC">
            ${cabeza(st)}
            ${criticas(k)}
            ${portadaHtml(k, L)}
            ${P.qTexto('libre')}
            ${P.tipHtml('hoy')}
            ${paraHoyHtml(k, L)}
            ${preguntasHtml()}
            ${presChipsHtml(k)}
            ${loQueVieneHtml(k)}
        </div>`;
    };
})();
