// Producto v2 · prototipo. v2.9.3 «Rediseño de Hoy» (APROBADO por Victor, 2026-10-23, para probar en la vista previa): dos
// propuestas para comparar. A «Hoy claro», consistente con Mi plan y Mes, y B «Sin límites». Las dos leen los mismos números
// del motor (el libre, lo que viene, los presupuestos) y usan las mismas acciones de siempre: solo cambia cómo se ven.
// Nada de aquí guarda datos nuevos; lo que la pantalla recuerda (una fila abierta, «Ver todos») vive en P.ui.
'use strict';
(() => {
    const M = window.MOTOR;
    const P = window.P;
    const { dinero } = M;
    const { esc, icon, caja, sr, plural } = P;

    // ------------------------------------------------------------------ el libre, en una línea
    /**
     * Lo que explica el número, en una sola línea (la del brief): hasta cuándo y cuánto al día; o lo que falta confirmar;
     * o lo que falta para cubrir lo que viene; o desde cuándo no anotas. Lo de la tarjeta y lo ya contado se explican en
     * «¿De dónde sale?» (ahí ya estaban).
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
     * («$50.19 de $100.38»): cada peso, una vez. Devuelve los grupos en orden (primero «ahora», después por fecha).
     * `conUrgentes`: lo vencido y lo que vence hoy va arriba, con «Ya lo pagué» (A); sin eso, va en «Para hoy» (B).
     */
    function loQueViene(k, { conUrgentes = true } = {}) {
        const st = P.st;
        const hz = k.hz;
        const ocurrencias = [];
        // V2-80: de un pago con algo vencido solo se ve lo vencido (arriba, o en «Para hoy»), no el del mes siguiente.
        const conVencido = new Set();
        for (const o of P.vencidosPlan()) {
            if (conUrgentes) ocurrencias.push(o);
            conVencido.add(claveDe(o));
        }
        for (const o of P.proximosPagos(99)) {
            if (conVencido.has(claveDe(o))) continue;
            if (!conUrgentes && esUrgente(o)) continue;
            ocurrencias.push(o);
        }
        const grupos = new Map();
        const poner = (g, fila) => {
            if (!grupos.has(g)) grupos.set(g, []);
            grupos.get(g).push(fila);
        };
        for (const o of ocurrencias) {
            const total = o.parcial && o.estado !== 'arrastrado' ? o.parcial.falta : o.monto;
            for (const x of partesDe(o, hz)) {
                const g = M.esFundado(st, x.de) ? 'ahora' : x.de;
                poner(g, { o, monto: x.monto === undefined ? total : x.monto, total, parte: x.monto !== undefined && total !== null && x.monto < total });
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
     * Una fila de «Lo que viene» en una línea: el día, el nombre y el monto, con el mismo formato que Mi plan. «Ya lo pagué»
     * se ve solo si vence hoy o ya venció; en las demás aparece al tocar la fila (con «Ver detalle»).
     */
    function filaViene(x, { urgentes = true } = {}) {
        const st = P.st;
        const o = x.o;
        const esTarjeta = !!o.tarjeta;
        const nombre = esTarjeta ? P.nombreTarjeta(o.tarjeta) : o.pago.nombre;
        const emoji = esTarjeta ? o.tarjeta.emoji : o.pago.emoji;
        const tipo = esTarjeta ? 'tarjeta' : 'pago';
        const id = esTarjeta ? o.tarjeta.id : o.pago.id;
        const fk = `${esTarjeta ? 't' : 'p'}-${id}-${o.fecha}`;
        const pagado = o.estado === 'pagado';
        const puedePagar = o.estado === 'pendiente' || o.estado === 'vencido';
        const urgente = urgentes && esUrgente(o);
        const abierta = P.ui.hoyAbierta === fk;
        // V2-80: solo se marca la que toca; si antes hay otra sin pagar, se dice cuál va primero.
        const sig = !esTarjeta && puedePagar ? M.porPagar(st, o.pago) : null;
        const espera = !!sig && sig.fecha !== o.fecha;
        const pagadoHoy = !esTarjeta && pagado && o.hecho && o.hecho.registro && (st.registros.find((r) => r.id === o.hecho.registro) || {}).fecha === st.hoy;
        const marca = o.estado === 'vencido' ? `<span class="hv-e hv-e--venc">${icon('clock', 'ico-xs')}venció</span>` : pagado ? `<span class="hv-e">✓${sr(' Pagado')}</span>` : x.parte ? `<span class="hv-e">de ${esc(dinero(x.total, { aprox: o.estimado }))}</span>` : o.fecha === st.hoy ? '<span class="hv-e hv-e--hoy">vence hoy</span>' : '';
        const monto = o.monto === null ? '<span class="monto monto--pend">Por confirmar</span>' : P.montoPlan(x.monto, 'gasto', { aprox: !!o.estimado && !o.parcial, gris: pagado });
        const dia = `<span class="pl-dia" aria-hidden="true"><span class="pl-dia-n">${M.partes(o.fecha)[2]}</span><span class="pl-dia-m">${o.fecha === st.hoy ? 'hoy' : M.MESES_CORTOS[M.partes(o.fecha)[1] - 1]}</span></span>`;
        const cuando = o.estado === 'vencido' ? `Venció el ${M.fechaCorta(o.fecha)}` : o.fecha === st.hoy ? 'Vence hoy' : M.capital(M.fechaCorta(o.fecha));
        const dentro = `${dia}${sr(`${cuando}: `)}${caja(emoji, 'emo--sm')}<span class="pl-n">${esc(nombre)}</span>${marca}<span class="pl-m">${monto}</span>`;
        const btnPagar = puedePagar ? `<button type="button" class="btn btn--sm${urgente ? ' btn--prim' : ''}${espera ? ' btn--espera' : ''}" data-a="pagado" data-tipo="${tipo}" data-id="${id}" data-fecha="${o.fecha}" data-fk="pagado-${fk}" aria-label="${espera ? `Marcar ${esc(nombre)} como pagado: primero el del ${esc(P.diaMes(sig.fecha))}` : `Marcar ${esc(nombre)} como pagado`}">Ya lo pagué</button>` : '';
        const btnDeshacer = pagadoHoy ? `<button type="button" class="btn btn--sm" data-a="pagoDeshacer" data-id="${o.pago.id}" data-fecha="${o.fecha}" data-fk="deshacer-${fk}" aria-label="Deshacer: ${esc(nombre)} ya no está pagado">Deshacer</button>` : '';
        const btnVer = `<button type="button" class="link" data-a="abrir" data-tipo="${tipo}" data-id="${id}" data-fk="ver-${fk}">Ver detalle${icon('chevron-right', 'ico-xs')}</button>`;
        // Lo urgente: la fila abre su ficha y «Ya lo pagué» está a la vista. Lo demás: la fila abre sus acciones.
        if (urgente) {
            return `<li class="hv-f hv-f--urg${o.estado === 'vencido' ? ' hv-f--venc' : ''}"><button type="button" class="pl-b hv-b" data-a="abrir" data-tipo="${tipo}" data-id="${id}" data-fk="${fk}" aria-label="${esc(nombre)}, ${esc(cuando.toLowerCase())}, ${esc(o.monto === null ? 'por confirmar' : dinero(x.monto, { aprox: !!o.estimado }))}. Ver detalle">${dentro}</button><div class="hv-acc">${btnPagar}</div></li>`;
        }
        return `<li class="hv-f${pagado ? ' hv-f--hecha' : ''}${abierta ? ' hv-f--abierta' : ''}"><button type="button" class="pl-b hv-b" data-a="hoyFila" data-id="${fk}" data-fk="${fk}" aria-expanded="${abierta}" aria-controls="acc-${fk}">${dentro}${icon('chevron-down', 'ico-xs hv-chev')}</button><div class="hv-acc" id="acc-${fk}"${abierta ? '' : ' hidden'}>${btnPagar}${btnDeshacer}${btnVer}</div></li>`;
    }
    P.acciones.hoyFila = (d) => {
        P.ui.hoyAbierta = P.ui.hoyAbierta === d.id ? null : d.id;
        P.render({ foco: `[data-fk="${CSS.escape(d.id)}"]` });
    };

    /** «Lo que viene»: dos grupos, máximo 3 filas cada uno; lo demás, en «Ver mi plan». */
    function loQueVieneHtml(k, { urgentes = true, cls = '' } = {}) {
        const grupos = loQueViene(k, { conUrgentes: urgentes });
        const total = grupos.reduce((n, g) => n + g.filas.length, 0);
        const verPlan = P.enlaceAccion('Ver mi plan', 'irTab', 'data-tab="pagos" data-fk="ver-pagos"');
        if (!total) return P.tarjetaSeccion('Lo que viene', `<p class="vacio">Nada por delante en tu plan. ${P.enlaceAccion('Agregar un gasto fijo', 'hoja', 'data-hoja="nuevoPago" data-fk="vacio-pago"')}</p>`, { id: 'h-pagos', accion: verPlan, cls });
        // El grupo de hoy (si tiene algo) y el del próximo ingreso.
        const vistos = [grupos.find((g) => g.f === 'ahora'), grupos.find((g) => g.f !== 'ahora')].filter(Boolean);
        let mostradas = 0;
        const cuerpo = vistos
            .map((g) => {
                const t = tituloGrupo(g.f, k.hz);
                const filas = g.filas.slice(0, 3);
                mostradas += filas.length;
                return `<li class="hv-g" role="presentation"><p class="hv-gt"><span>${esc(t.t)}</span>${t.s ? `<span class="hv-gs"> · ${esc(t.s)}</span>` : ''}</p></li>${filas.map((x) => filaViene(x, { urgentes })).join('')}`;
            })
            .join('');
        const resto = total - mostradas;
        const pie = resto > 0 ? `<button type="button" class="hv-mas" data-a="irTab" data-tab="pagos" data-fk="hv-mas">${esc(resto === 1 ? '1 más en Mi plan' : `${resto} más en Mi plan`)}${icon('chevron-right', 'ico-xs')}</button>` : '';
        return P.tarjetaSeccion('Lo que viene', `<ul class="hv-lista">${cuerpo}</ul>${pie}`, { id: 'h-pagos', accion: verPlan, cls });
    }

    // ------------------------------------------------------------------ presupuestos
    /** Los presupuestos de este periodo, primero los más cerca de su máximo (los que te pasaste, arriba). */
    function presupuestos(k) {
        const peso = (x) => (x.saltado ? -2 : x.listo ? -1 : x.tope ? x.anotado / x.tope : 0);
        return k.variables.slice().sort((a, b) => peso(b) - peso(a));
    }
    /** «te quedan $45.00», «te pasaste $15.00», «listo ✓», «saltado». Con palabras: nada depende solo del color. */
    function estadoPresupuesto(x, { corto = false } = {}) {
        // `pre` y `monto` por separado: el monto nunca se parte en dos líneas.
        const e = (pre, monto, cls) => ({ t: monto ? `${pre} ${monto}` : pre, pre, monto, cls });
        if (x.saltado) return e(corto ? 'saltado' : `saltado ${P.estePlan()}`, '', 'hp--quieto');
        if (x.pasado) return e('te pasaste', dinero(x.pasado), 'hp--pasado');
        if (x.listo) return x.sobro ? e('te sobró', `${dinero(x.sobro)} ✓`, 'hp--quieto') : e('listo ✓', '', 'hp--quieto');
        return e(corto ? 'quedan' : 'te quedan', dinero(x.falta), x.tope && x.anotado / x.tope >= 0.8 ? 'hp--cerca' : '');
    }
    P.hoyPresupuestos = presupuestos;

    // ------------------------------------------------------------------ lo pendiente
    /**
     * Todo lo que espera una respuesta tuya, en una lista: los avisos (sin los pagos vencidos o de hoy, que ya están en
     * «Lo que viene» con su «Ya lo pagué»), el cierre de tus presupuestos, «Pongámonos al día» y las tarjetas de una vez.
     * Cada uno con sus botones de siempre. `nivel`: rojo, ámbar o info (solo para el ícono: el texto dice lo que pasa).
     */
    function pendientes(k, { conPagos = false } = {}) {
        const st = P.st;
        const items = [];
        const cls = (n) => (n === 'rojo' ? 'nota--atencion' : n === 'ambar' ? 'nota--ambar' : 'nota--info');
        if (k.alDia) {
            const pend = P.pendientesAlDia();
            items.push({ id: 'aldia', nivel: 'info', corto: 'Pongámonos al día', html: `<section class="card card--aviso" aria-labelledby="av-dia"><div class="aviso-cab">${caja('👋')}<div><h3 class="card-t" id="av-dia">Pongámonos al día</h3><p class="txt">¡Qué bueno verte! En un minuto dejamos todo como está hoy:</p></div></div>
                <ul class="mini-lista">${pend.ingresos ? `<li>${plural(pend.ingresos, 'ingreso', 'ingresos')} por confirmar</li>` : ''}${pend.pagos ? `<li>${plural(pend.pagos, 'pago', 'pagos')} por confirmar</li>` : ''}<li>${plural(st.lugares.length, 'lugar', 'lugares')} por cuadrar</li></ul>
                <button type="button" class="btn btn--prim btn--48 btn--full" data-a="abrir" data-tipo="aldia" data-fk="aldia">Empezar</button></section>`, accion: { t: 'Empezar', attrs: 'data-a="abrir" data-tipo="aldia" data-fk="aldia"' } });
        }
        for (const x of P.atencion(k)) {
            // «Te faltan $X para cubrir lo que viene» ya lo dice el libre (con «¿De dónde sale?»): no se repite.
            // Y si ya falta para lo que viene, «Faltan $X para cubrir tus ahorros» es lo mismo dicho con otro número.
            if (x.id === 'falta' || (x.id === 'ahorros' && k.faltaPagos > 0) || (!conPagos && ['vencidos', 'hoy', 'manana'].includes(x.id))) continue;
            items.push({ id: x.id, nivel: x.nivel, corto: x.titulo, sub: x.texto, html: `<div class="nota ${cls(x.nivel)}">${icon(x.nivel === 'info' ? 'bell' : 'triangle-alert')}<div><p class="nota-t">${esc(x.titulo)}</p>${x.texto ? `<p>${esc(x.texto)}</p>` : ''}<div class="nota-acc">${x.acciones}</div></div></div>`, acciones: x.acciones });
        }
        for (const x of k.variables.filter((y) => M.preguntarVariable(st, y))) {
            items.push({ id: 'vc-' + x.v.id, nivel: 'info', corto: `¿Ya terminaste con ${x.v.nombre}?`, sub: `Ibas a gastar ${dinero(x.tope)} y anotaste ${dinero(x.anotado)}.`, emoji: x.v.emoji, html: cierreHtml(x) });
        }
        // Las tarjetas de una vez (avisos de la app, la oferta de tarjetas, «¿Cómo te ha ido?»); las de tus datos van aparte.
        for (const h of (P.modos ? P.modos.tarjetasHoy(k) : []).filter((h) => !esCritica(h))) items.push({ id: 'modo-' + items.length, nivel: 'info', corto: tituloDe(h), html: h });
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
    function criticas(k) {
        return (P.modos ? P.modos.tarjetasHoy(k) : []).filter(esCritica).join('');
    }
    /** El cierre de un presupuesto (v2.8 C-3), igual que siempre: tres respuestas. */
    function cierreHtml(x) {
        return `<section class="card card--aviso" aria-labelledby="vc-${x.v.id}"><div class="aviso-cab">${caja(x.v.emoji)}<div><h3 class="card-t" id="vc-${x.v.id}">Ibas a gastar ${dinero(x.tope)} en ${esc(x.v.nombre)} y anotaste ${dinero(x.anotado)}. ¿Ya terminaste?</h3><p class="txt">Si ya terminaste, los ${dinero(x.falta)} que sobran vuelven a tu libre.</p></div></div><div class="chips"><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="listo" data-fk="vc-listo-${x.v.id}">Sí, ya no gasto más en esto</button><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="falta" data-fk="vc-falta-${x.v.id}">Todavía voy a gastar</button><button type="button" class="chip" data-a="variableCierre" data-id="${x.v.id}" data-v="anotar" data-fk="vc-anotar-${x.v.id}">Me falta anotar algo</button></div></section>`;
    }
    P.hoyPendientes = pendientes;

    /** «Por revisar»: la lista completa (A), o una sola cosa (B, «Responder»). */
    P.hojas.hoyRevisar = {
        html(h) {
            const k = P.calc();
            const todos = pendientes(k, { conPagos: !!h.conPagos });
            const items = h.solo ? todos.filter((x) => x.id === h.solo) : todos;
            const titulo = h.solo ? 'Para hoy' : items.length ? (items.length === 1 ? '1 cosa por revisar' : `${items.length} cosas por revisar`) : 'Todo al día';
            return {
                titulo,
                cuerpo: items.length ? `<ul class="hr-lista">${items.map((x) => `<li>${x.html}</li>`).join('')}</ul>` : `<p class="vacio">${h.solo ? 'Listo, ya quedó.' : 'No hay nada pendiente por hoy.'}</p>`,
                pie: `<button type="button" class="btn btn--prim btn--48" data-a="cerrarHoja" data-fk="hr-listo">Listo</button>`,
            };
        },
    };

    // ------------------------------------------------------------------ piezas que comparten A, B y C
    /**
     * La portada de color (A y C): Libre, su línea, «¿De dónde sale?» y el «?» de siempre. `conYaLlego`: el botón
     * «¿Ya llegó?» dentro (solo A; en C es la primera fila de «Para hoy»). La línea «Falta confirmar…» se queda en las dos.
     */
    function portadaHtml(k, L, { conYaLlego = true } = {}) {
        return `<div class="portada app-home-pattern hoyA-portada">
                <svg class="app-home-pattern-art" viewBox="0 0 320 180" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">${window.ARTE.circles}</svg>
                ${P.qBtn('libre')}
                <button type="button" class="portada-b" data-a="hoja" data-hoja="desglose" data-fk="portada" aria-label="${esc(L.etiqueta)} ${esc(dinero(k.libre))}. ${esc(L.linea)}. Ver de dónde sale">
                    <span class="portada-l">${esc(L.etiqueta)}</span><span class="portada-n">${dinero(k.libre)}</span>
                    <span class="portada-s${L.falta ? ' portada-s--falta' : ''}">${L.falta ? icon('triangle-alert', 'ico-xs') : ''}${esc(L.linea)}</span>
                    <span class="portada-mas">¿De dónde sale? ${icon('chevron-right', 'ico-xs')}</span>
                </button>
                ${conYaLlego && L.porConfirmar ? `<div class="portada-pie"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="hoja" data-hoja="ingresoLlego" data-id="${L.porConfirmar.ingreso.id}" data-fecha="${L.porConfirmar.fecha}" data-fk="ing-si">${k.hz.esHoy ? '¿Ya llegó?' : `¿Ya llegó tu ${esc(P.nombreIngreso(k.hz))} del ${M.partes(L.porConfirmar.fecha)[2]}?`}</button></div>` : ''}
            </div>`;
    }
    /**
     * Presupuestos en chips (A y C): 3, los más cerca de su máximo; el resto en «Ver todos». El nombre en máximo 2 líneas
     * (completo para el lector de pantalla) y lo que queda en su propia línea, sin partir el monto.
     */
    function presChipsHtml(k) {
        const pres = presupuestos(k);
        if (!pres.length) return '';
        const todos = !!P.ui.hoyPresTodos;
        const chip = (x) => {
            const e = estadoPresupuesto(x, { corto: true });
            return `<button type="button" class="chip hp-chip ${e.cls}" data-a="abrir" data-tipo="variable" data-id="${x.v.id}" data-fk="hp-${x.v.id}" aria-label="${esc(`${x.v.nombre}: ${e.t}`)}"><span class="hp-l1" aria-hidden="true">${P.emo(x.v.emoji, 18)}<span class="hp-n">${esc(x.v.nombre)}</span></span><span class="hp-e" aria-hidden="true">${e.cls === 'hp--pasado' ? icon('triangle-alert', 'ico-xs') : ''}<span>${esc(e.pre)}${e.monto ? ` <span class="hp-m">${esc(e.monto)}</span>` : ''}</span></span></button>`;
        };
        return `<section class="hoyA-pres" aria-labelledby="hp-t"><div class="hoyA-pres-h"><h2 class="hoyA-h" id="hp-t">Presupuestos <span class="hoyA-h-s">${esc(P.estePlan())}</span></h2>${pres.length > 3 ? `<button type="button" class="link" data-a="hoyPresTodos" data-fk="hp-todos" aria-expanded="${todos}">${todos ? 'Ver menos' : `Ver todos (${pres.length})`}</button>` : ''}</div><div class="chips hp-chips">${(todos ? pres : pres.slice(0, 3)).map(chip).join('')}</div></section>`;
    }
    /**
     * «Para hoy» (B y C): lo que te pide algo hoy, una fila cada uno, con su botón. Primero «¿Ya llegó?» (una sola vez), luego
     * lo vencido y lo que vence hoy («Ya lo pagué») y los avisos: con una sola acción, a la vista; si no, «Responder» (si es
     * una pregunta) o «Ver». Máximo 3 filas y «Ver las N». Sin nada: «Nada pendiente para hoy ✓».
     */
    function paraHoyHtml(k, L) {
        const st = P.st;
        const hz = k.hz;
        const filas = [];
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
        for (const x of pendientes(k)) {
            const unBoton = x.acciones && (x.acciones.match(/<button/g) || []).length === 1 ? x.acciones.replace(/class="btn btn--sm( btn--prim)?"/, 'class="btn btn--sm btn--prim"') : null;
            const texto = x.id === 'aldia' ? 'Empezar' : x.corto.includes('?') ? 'Responder' : 'Ver';
            filas.push({ emoji: x.emoji || null, ico: x.nivel === 'info' ? 'bell' : 'triangle-alert', t: x.corto, s: x.sub && x.sub.length <= 64 ? x.sub : '', boton: unBoton || `<button type="button" class="btn btn--sm" data-a="hoja" data-hoja="hoyRevisar" data-id="${esc(x.id)}" data-fk="pr-${esc(x.id)}">${texto}</button>` });
        }
        const verTodas = !!P.ui.hoyParaHoyTodas;
        const filaHoy = (x) => `<li class="hb-f${x.venc ? ' hb-f--venc' : ''}">${x.abrir ? `<button type="button" class="hb-f-b" ${x.abrir}>` : '<div class="hb-f-b hb-f-b--quieta">'}${x.emoji ? caja(x.emoji, 'emo--sm') : `<span class="emo emo--sm emo--ico${x.ico === 'triangle-alert' ? ' emo--aviso' : ''}" aria-hidden="true">${icon(x.ico)}</span>`}<span class="hb-f-txt"><span class="hb-f-t">${esc(x.t)}</span>${x.s ? `<span class="hb-f-s">${x.venc ? icon('clock', 'ico-xs') : ''}${esc(x.s)}</span>` : ''}</span>${x.abrir ? '</button>' : '</div>'}<span class="hb-f-acc">${x.boton}</span></li>`;
        return `<section class="hb-sec" aria-labelledby="hb-hoy-t">
                <div class="hb-sec-h"><h2 class="hb-h" id="hb-hoy-t">Para hoy</h2>${filas.length > 3 ? `<button type="button" class="link" data-a="hoyParaHoyTodas" data-fk="hb-hoy-todas" aria-expanded="${verTodas}">${verTodas ? 'Ver menos' : `Ver las ${filas.length}`}</button>` : ''}</div>
                ${filas.length ? `<ul class="hb-lista">${(verTodas ? filas : filas.slice(0, 3)).map(filaHoy).join('')}</ul>` : `<p class="hb-nada">${icon('check', 'ico-s')}Nada pendiente para hoy</p>`}
            </section>`;
    }
    /** Las preguntas de una vez y la revisión de lo de antes de empezar: siguen como tarjetas (fila V45). */
    const preguntasHtml = () => (P.modos && P.modos.revisionHoy ? P.modos.revisionHoy() : '') + (P.modos && P.modos.preguntasHoy ? P.modos.preguntasHoy() : '');

    // ================================================================== C «Mezcla» (APROBADO por Victor, 2026-10-23)
    /**
     * C, la fusión del auditor: la portada de color de A (sin «¿Ya llegó?» dentro), «Para hoy» de B, los chips de
     * presupuestos de A, «Lo que viene» en dos grupos (sin lo de hoy: ya está en «Para hoy») y un solo «+ Anotar».
     */
    P.hoyC = function () {
        const st = P.st;
        const k = P.calc();
        const L = datosLibre(k);
        return `<div class="pg pg--hoy hoyA hoyC">
            ${P.vistaPrevia ? P.vistaPrevia.barra() : ''}
            ${cabeza(st)}
            ${criticas(k)}
            ${portadaHtml(k, L, { conYaLlego: false })}
            ${P.qTexto('libre')}
            ${P.tipHtml('hoy')}
            ${paraHoyHtml(k, L)}
            ${preguntasHtml()}
            ${presChipsHtml(k)}
            ${loQueVieneHtml(k, { urgentes: false, cls: 'hoyA-viene' })}
        </div>`;
    };

    // ================================================================== A «Hoy claro»
    /**
     * A: el número en su portada de siempre, con UNA línea que lo explica; lo pendiente en una sola línea que abre la lista;
     * tus presupuestos en 3 chips (los más cerca de su máximo); «Lo que viene» en dos grupos (lo que baja tu libre de hoy y
     * lo que paga tu próximo ingreso) con una línea por fila, como Mi plan; un solo «+ Anotar» (el de abajo).
     */
    P.hoyA = function () {
        const st = P.st;
        const k = P.calc();
        const L = datosLibre(k);
        // Lo pendiente: una sola línea. ⚠ solo si algo pide atención de verdad; si no, una campana.
        const pend = pendientes(k);
        const urgente = pend.some((x) => x.nivel === 'rojo' || x.nivel === 'ambar');
        // Con una sola cosa, la línea dice cuál es; con más, cuántas.
        const lineaPend = pend.length ? `<button type="button" class="hoyA-pend${urgente ? ' hoyA-pend--urg' : ''}" data-a="hoja" data-hoja="hoyRevisar" data-fk="hoy-revisar" aria-haspopup="dialog">${icon(urgente ? 'triangle-alert' : 'bell', 'ico-s')}<span>${pend.length === 1 ? esc(pend[0].corto) : `${pend.length} cosas por revisar`}</span>${icon('chevron-right', 'ico-xs')}</button>` : '';
        return `<div class="pg pg--hoy hoyA">
            ${P.vistaPrevia ? P.vistaPrevia.barra() : ''}
            ${cabeza(st)}
            ${criticas(k)}
            ${portadaHtml(k, L, { conYaLlego: true })}
            ${P.qTexto('libre')}
            ${P.tipHtml('hoy')}
            ${lineaPend}
            ${preguntasHtml()}
            ${presChipsHtml(k)}
            ${loQueVieneHtml(k, { urgentes: true, cls: 'hoyA-viene' })}
        </div>`;
    };
    P.acciones.hoyPresTodos = () => {
        P.ui.hoyPresTodos = !P.ui.hoyPresTodos;
        P.render({ foco: '[data-fk="hp-todos"]' });
    };
    const cabeza = (st) => {
        const inicial = (st.nombre || 'T').charAt(0).toUpperCase();
        return `<header class="hoy-head">
                <button type="button" class="avatar" data-a="hoja" data-hoja="menu" data-fk="avatar" aria-label="Menú de ${esc(st.nombre || 'tu cuenta')}: ajustes, tu espacio y aprende">${esc(inicial)}</button>
                <div class="hoy-saludo"><h1 class="h1" tabindex="-1">${st.nombre && P.modo === 'uso' ? 'Hola, ' + esc(st.nombre) : 'Hola'}</h1><p class="sub">${esc(M.capital(M.conDia(st.hoy)))}</p></div>
            </header>`;
    };

    // ================================================================== B «Sin límites»
    /**
     * B: para entender el día en 3 segundos. 1) El libre dicho con su «hasta cuándo» y, debajo, de dónde sale en una barra:
     * Tienes = Libre + Sale + Ahorros (los mismos números de Mi plan, sin tocar nada). 2) «Para hoy»: lo que te pide algo hoy,
     * cada cosa con su botón (o «Nada pendiente para hoy»). 3) «Lo que viene» sin lo de hoy, en los mismos dos grupos.
     * 4) Tus presupuestos con su barra de lo gastado contra lo máximo. Plano: el color solo en el dato y en la acción.
     */
    P.hoyB = function () {
        const st = P.st;
        const k = P.calc();
        const L = datosLibre(k);
        const hz = k.hz;
        // 1) El número y la barra (Tienes − Ahorros − Sale = Libre, como «Esta quincena» de Mi plan).
        // Las partes de la barra (ancho) y de la leyenda (monto): Libre + Sale + Ahorros = Tienes. Si no alcanza, lo que
        // falta va al final con rayas (y la leyenda lo dice con palabras), con el mismo número que la línea de arriba.
        const S = k.obligaciones;
        const A = k.apartado;
        const T = k.tienes;
        const partes = k.faltaPagos > 0
            ? [['sale', T, 'Sale', S], ['falta', k.faltaPagos, 'Te faltan', k.faltaPagos]]
            : k.sinCubrir > 0
              ? [['sale', S, 'Sale', S], ['ahorro', Math.max(0, T - S), 'Ahorros', A], ['falta', k.sinCubrir, 'Faltan para tus ahorros', k.sinCubrir]]
              : [['libre', k.libre, 'Libre', k.libre], ['sale', S, 'Sale', S], ['ahorro', A, 'Ahorros', A]];
        const visibles = partes.filter(([, , , m]) => m > 0 || 0);
        const barra = T > 0 || S > 0
            ? `<p class="hb-de">${k.faltaPagos > 0 ? `Tienes ${dinero(T)}` : `Tus ${dinero(T)} se reparten así:`}</p>
                <div class="hb-barra" aria-hidden="true">${visibles.filter(([, w]) => w > 0).map(([c, w]) => `<span class="hb-seg hb-seg--${c}" style="flex-grow:${w}"></span>`).join('')}</div>
                <ul class="hb-ley hb-ley--${visibles.length}">${visibles.map(([c, , t, m]) => `<li${c === 'falta' ? ' class="hb-ley-falta"' : ''}><span class="hb-ley-t"><span class="hb-pt hb-seg--${c}" aria-hidden="true"></span>${esc(t)}</span><span class="monto">${dinero(m)}</span></li>`).join('')}</ul>`
            : '';
        const titulo = L.porConfirmar ? 'Libre por ahora' : `Libre · ${L.hasta.replace(/^Hasta/, 'hasta').replace(/^Hoy/, 'hoy')}`;
        const sub = L.porConfirmar || L.falta || k.inactivo >= 10 ? L.linea : k.porDia !== null ? `${dinero(k.porDia, { aprox: true })} al día${hz.ingreso && !hz.esHoy && hz.dias ? ` · ${hz.dias === 1 ? 'mañana te pagan' : `en ${hz.dias} días te pagan`}` : ''}` : '';
        const hero = `<section class="hb-hero" aria-labelledby="hb-t">
                <div class="hb-hero-h"><h2 class="hb-l portada-l" id="hb-t">${esc(titulo)}</h2>${P.qBtn('libre')}</div>
                <p class="hb-n portada-n">${dinero(k.libre)}</p>
                ${sub ? `<p class="hb-s${L.falta ? ' hb-s--falta' : ''}">${L.falta ? icon('triangle-alert', 'ico-xs') : ''}${esc(sub)}</p>` : ''}
                ${barra}
                <button type="button" class="hb-mas" data-a="hoja" data-hoja="desglose" data-fk="portada">¿De dónde sale?${icon('chevron-right', 'ico-xs')}</button>
            </section>`;
        // 2) Para hoy (la misma pieza de C).
        const paraHoy = paraHoyHtml(k, L);
        // 4) Presupuestos con su barra (lo gastado contra lo máximo).
        const pres = presupuestos(k);
        const todos = !!P.ui.hoyPresTodos;
        const filaPres = (x) => {
            const e = estadoPresupuesto(x);
            const pct = x.tope ? Math.min(100, Math.round((x.anotado / x.tope) * 100)) : 0;
            return `<li><button type="button" class="hb-p ${e.cls}" data-a="abrir" data-tipo="variable" data-id="${x.v.id}" data-fk="hp-${x.v.id}">${caja(x.v.emoji, 'emo--sm')}<span class="hb-p-txt"><span class="hb-p-l"><span class="hb-p-n">${esc(x.v.nombre)}</span><span class="hb-p-e">${e.cls === 'hp--pasado' ? icon('triangle-alert', 'ico-xs') : ''}${esc(e.t)}</span></span><span class="hb-p-barra" role="img" aria-label="${esc(`Anotaste ${dinero(x.anotado)} de ${dinero(x.tope)}`)}"><span style="width:${x.saltado ? 0 : pct}%"></span></span></span></button></li>`;
        };
        const presHtml = pres.length
            ? `<section class="hb-sec" aria-labelledby="hb-pres-t"><div class="hb-sec-h"><h2 class="hb-h" id="hb-pres-t">Presupuestos <span class="hb-h-s">${esc(P.estePlan())}</span></h2>${pres.length > 3 ? `<button type="button" class="link" data-a="hoyPresTodos" data-fk="hp-todos" aria-expanded="${todos}">${todos ? 'Ver menos' : `Ver todos (${pres.length})`}</button>` : ''}</div><ul class="hb-pres">${(todos ? pres : pres.slice(0, 3)).map(filaPres).join('')}</ul></section>`
            : '';
        return `<div class="pg pg--hoy hoyB">
            ${P.vistaPrevia ? P.vistaPrevia.barra() : ''}
            ${cabeza(st)}
            ${criticas(k)}
            ${hero}
            ${P.qTexto('libre')}
            ${P.tipHtml('hoy')}
            ${paraHoy}
            ${preguntasHtml()}
            ${loQueVieneHtml(k, { urgentes: false, cls: 'hb-viene' })}
            ${presHtml}
        </div>`;
    };
    P.acciones.hoyParaHoyTodas = () => {
        P.ui.hoyParaHoyTodas = !P.ui.hoyParaHoyTodas;
        P.render({ foco: '[data-fk="hb-hoy-todas"]' });
    };
    // «Responder»: la tarjeta completa de una sola cosa (los mismos botones de siempre).
    const abrirHoja = P.acciones.hoja;
    P.acciones.hoja = (d) => (d.hoja === 'hoyRevisar' && d.id ? P.abrirHoja('hoyRevisar', { solo: d.id }) : abrirHoja(d));
})();
