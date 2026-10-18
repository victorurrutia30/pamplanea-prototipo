// Producto v2.4.1 · prototipo. MODO ENTRENAMIENTO «a prueba de todo»: un recorrido de pasos cortos (una idea
// por paso, con números redondos) sobre datos de ejemplo, con momentos «Hazlo tú» en los que la persona hace
// la acción de verdad y ve el número cambiar («Muéstrame» primero señala dónde tocar; «Hazlo por mí» lo hace),
// «¿Lo entendí?» (preguntas amables, con repaso) y retomar donde se quedó. Al terminar o saltar, los ejemplos
// vuelven a como estaban. También «Practicar con ejemplos», de fácil a difícil.
'use strict';
(() => {
    const P = window.P;
    const M = window.MOTOR;
    const { esc, icon } = P;
    const $ = (s) => document.querySelector(s);
    const dinero = M.dinero;
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

    // ------------------------------------------------------------------ ayudas para los pasos
    const cerrarHoja = () => P.ui.hoja && P.cerrarHoja({ sinFoco: true });
    const irA = (tab) => () => {
        cerrarHoja();
        if (P.ui.tab !== tab || P.ui.stack.length) P.irTab(tab);
    };
    const foto = () => {
        const k = P.calc();
        return { libre: k.libre, tienes: k.tienes, efectivo: M.saldoLugar(P.st, 'efectivo'), proxima: k.proxima };
    };
    /** Escribe en un campo como lo haría la persona (para «Hazlo por mí»). */
    function escribirEn(sel, valor) {
        const el = document.querySelector(sel);
        if (!el) return;
        el.value = valor;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const grupo = (titulo) => [...document.querySelectorAll('.grupo')].find((g) => g.querySelector('.grupo-t')?.textContent === titulo) || null;
    const enPantalla = (tab) => P.ui.tab === tab && !P.ui.stack.length;
    const hoja = (tipo) => P.ui.hoja && P.ui.hoja.tipo === tipo;
    /** Dónde tocar para anotar algo (sirve para la venta, el gasto y las pupusas). */
    const senalAnotar = (frase) => () => {
        if (!hoja('anotar')) return { sel: '[data-fk="nav-anotar"]', texto: 'Toca el botón (+) de abajo.' };
        const q = document.getElementById('anotar-q');
        if (q && !q.value.trim()) return { sel: '#anotar-q', texto: `Escribe «${frase}» en «¿Qué pasó?».` };
        return { sel: '[data-fk="anotar-guardar"]', texto: 'Toca «Guardar».' };
    };
    const hacerAnotar = (frase, tab = 'hoy') => async () => {
        irA(tab)();
        P.acciones.anotar();
        await esperar(600);
        escribirEn('#anotar-q', frase);
        await esperar(1000);
        if (hoja('anotar')) P.acciones.anotarGuardar();
    };
    /** Cuadrar el efectivo: Mi dinero → Cuentas → Cuadrar → Efectivo → cuánto → Cuadrar. */
    const senalCuadrar = () => {
        if (hoja('cuadrar')) {
            const h = P.ui.hoja;
            if (h.lugar !== 'efectivo') return { sel: '[data-fk="op-lugar-efectivo"]', texto: 'Elige «Efectivo».' };
            if (M.leerMonto(h.monto) === null) return { sel: '#f-monto', texto: `Escribe ${M.montoCampo(T.cuadre.di)}.` };
            return { sel: '[data-fk="hoja-ok"]', texto: 'Toca «Cuadrar».' };
        }
        const top = P.ui.stack.at(-1);
        if (top && top.tipo === 'cuentas') return { sel: '[data-fk="md-cuadrar"]', texto: 'Toca «Cuadrar».' };
        if (!enPantalla('midinero')) return { sel: '[data-fk="nav-midinero"]', texto: 'Toca «Mi dinero» abajo.' };
        return { sel: '[data-fk="md-cuentas"]', texto: 'Toca «Cuentas».' };
    };
    const hacerCuadrar = async () => {
        irA('midinero')();
        await esperar(300);
        P.abrir('cuentas');
        await esperar(800);
        P.abrirHoja('cuadrar', { id: 'efectivo' });
        await esperar(700);
        escribirEn('#f-monto', M.montoCampo(T.cuadre.di));
        await esperar(1000);
        if (hoja('cuadrar')) P.acciones.cuadrarOk();
    };
    const prepararCuadre = () => {
        irA('midinero')();
        // Lo que la app cree y un número redondo un poco menor (se fija al empezar el paso).
        const e = M.saldoLugar(P.st, 'efectivo');
        T.cuadre = { cree: e, di: Math.max(0, Math.floor((e - 1) / 500) * 500) };
    };

    // ------------------------------------------------------------------ versión 1 · ingreso fijo (Ana, quincena)
    /** Ana para el recorrido: su luz de octubre ya está pagada y el teléfono ($15) vence el 25, antes de su quincena. */
    function cargarAna() {
        P.cargarPersona('ana');
        const st = P.st;
        P.marcarPagado(st, 'luz', '2026-10-12', { monto: 3500, medio: 'debito', fecha: '2026-10-12' });
        const tel = P.crearPago(st, { nombre: 'Teléfono', emoji: '📱', categoria: 'telefono', monto: 1500, frecuencia: 'mensual', dia: 25, medio: 'efectivo' });
        Object.assign(tel, { id: 'telefono', desde: '2026-10-01', nuevo: false });
        st.recorrido = 'fijo';
        P.render();
    }
    const FIJO = {
        id: 'fijo',
        persona: 'ana',
        cargar: cargarAna,
        pasos: [
            { antes: irA('hoy'), titulo: 'Te enseño la app en 4 minutos', texto: 'Usamos los datos de Ana, que cobra por quincena. Si cobras por mes o semana, es igual.' },
            { antes: irA('hoy'), sel: '.portada', titulo: 'Libre: lo que puedes gastar', texto: 'Tienes $100 y antes de tu quincena pagas $40: te quedan $60.' },
            {
                antes: () => {
                    irA('hoy')();
                    P.abrirHoja('desglose');
                },
                sel: '.hoja',
                titulo: '¿De dónde sale?',
                texto: 'Lo que tienes, menos ahorros y lo que pagas antes de tu quincena.',
            },
            {
                antes: irA('hoy'),
                hazlo: true,
                titulo: 'Anota en 5 segundos',
                texto: 'Toca (+) y escribe «pupusas 6», o díctalo con el micrófono.',
                claves: ['guardado:gasto'],
                celebra: (a, d) => `¡Eso! Tu libre bajó ${dinero(a.libre - d.libre)}.`,
                senal: senalAnotar('pupusas 6'),
                muestrame: hacerAnotar('pupusas 6'),
            },
            { antes: irA('hoy'), sel: 'section[aria-labelledby="h-pagos"]', titulo: 'Lo que viene', texto: 'Lo que vence antes de tu quincena ya está restado.' },
            {
                antes: irA('hoy'),
                hazlo: true,
                titulo: 'Marca un pago',
                texto: 'Ya pagaste el teléfono: toca «Pagado» junto a él.',
                claves: ['guardado:pagado'],
                celebra: (a, d) => (d.libre === a.libre ? '¡Listo! Tu libre no cambió: ya estaba contado.' : `¡Listo! Tu libre pasó de ${dinero(a.libre)} a ${dinero(d.libre)}.`),
                senal: () => (enPantalla('hoy') ? { sel: '[data-fk^="pagado-p-telefono-"]', texto: 'Toca «Pagado» junto al teléfono.' } : { sel: '[data-fk="nav-hoy"]', texto: 'Toca «Hoy» abajo.' }),
                async muestrame() {
                    irA('hoy')();
                    await esperar(300);
                    const b = document.querySelector('[data-fk^="pagado-p-telefono-"]');
                    if (b) {
                        b.scrollIntoView({ block: 'center' });
                        await esperar(600);
                        b.click();
                    } else P.acciones.pagado({ tipo: 'pago', id: 'telefono', fecha: '2026-10-25' });
                },
            },
            {
                antes: irA('hoy'),
                sel: '.proy',
                titulo: 'Tu próxima quincena',
                // Con los números que se ven en la pantalla (los del motor).
                texto: () => {
                    const x = P.calc().proxima;
                    return x ? `Entran ${dinero(x.entra, { aprox: true })}, pagas ${dinero(x.pagos, { aprox: true })} y te quedarían ${dinero(x.quedan, { aprox: true })}. Si hoy te sobra, pásalo a la próxima.` : 'Lo que entra, lo que pagas y lo que te quedaría.';
                },
            },
            {
                antes: irA('hoy'),
                hazlo: true,
                titulo: '¿Con qué lo pagas?',
                texto: 'El colegio sale de tu quincena del 30. Ábrelo y págalo con lo que tienes ahora.',
                claves: ['guardado:pagarCon'],
                celebra: (a, d) => (a.libre > d.libre ? `¡Bien! ${dinero(a.libre - d.libre)} apartados para el colegio. También puedes repartirlo entre dos quincenas.` : '¡Bien! Así eliges de qué dinero sale cada pago. También puedes repartirlo.'),
                senal: () => {
                    if (hoja('pagarCon')) return P.ui.hoja.modo === 'uno:ahora' ? { sel: '[data-fk="pc-ok"]', texto: 'Toca «Guardar».' } : { sel: '[data-fk="pc-uno:ahora"]', texto: 'Elige «Con lo que tienes ahora».' };
                    const top = P.ui.stack.at(-1);
                    if (top && top.tipo === 'pago' && top.id === 'colegio') return { sel: '[data-fk="pagar-con"]', texto: 'Toca «Cambiar o repartir».' };
                    if (!enPantalla('hoy')) return { sel: '[data-fk="nav-hoy"]', texto: 'Toca «Hoy» abajo.' };
                    return { sel: '[data-fk="p-colegio-2026-11-05"]', texto: 'Toca el colegio en «Próximos pagos».' };
                },
                async muestrame() {
                    irA('hoy')();
                    P.abrir('pago', 'colegio');
                    await esperar(800);
                    P.abrirHoja('pagarCon', { id: 'colegio', fecha: '2026-11-05' });
                    await esperar(800);
                    if (!hoja('pagarCon')) return;
                    P.ui.hoja.modo = 'uno:ahora';
                    P.render();
                    await esperar(1000);
                    P.acciones.pagarConOk();
                },
            },
            {
                antes: () => {
                    P.ui.pagosModo = 'calendario';
                    P.ui.pagosVista = 'actual';
                    irA('pagos')();
                },
                sel: () => grupo('Más adelante'),
                titulo: 'Con el aguinaldo',
                texto: 'Un pago de enero puede salir del aguinaldo; cuenta cuando te cae.',
            },
            {
                antes: () => {
                    P.ui.pagosModo = 'calendario';
                    irA('pagos')();
                },
                sel: '[data-fk="nuevo-ingreso"]',
                titulo: 'Adelanto de salario',
                texto: '¿Te adelantan $100? En «Ingreso esperado» elige «Adelanto»: tu quincena vendrá con $100 menos.',
            },
            { antes: irA('midinero'), sel: '[data-fk="md-ahorros"]', titulo: 'Ahorros', texto: 'Ponle nombre a $50: «Emergencias». Sigue en tu banco; ya no cuenta en tu libre.' },
            {
                antes: prepararCuadre,
                hazlo: true,
                titulo: 'Cuadra tu efectivo',
                texto: () => `La app cree que tienes ${dinero(T.cuadre.cree)} en efectivo. Di lo que tienes: ${dinero(T.cuadre.di)}.`,
                claves: ['guardado:cuadre'],
                celebra: (a, d) => (d.efectivo !== a.efectivo ? `¡Listo! Los ${dinero(Math.abs(a.efectivo - d.efectivo))} de diferencia quedan «sin detalle», sin culpa.` : '¡Listo! Cuadró exacto: tu número ya es el real.'),
                senal: senalCuadrar,
                muestrame: hacerCuadrar,
            },
            { antes: irA('midinero'), sel: '[data-fk="md-deudas"]', titulo: 'Tarjetas y préstamos', texto: 'Comprar con tarjeta baja tu libre ese día. Cuando llegue tu estado de cuenta, anótalo.' },
            { antes: irA('hoy'), titulo: '¿Volviste después de días?', texto: 'Sin culpa: «Pongámonos al día» te pregunta qué llegó y qué pagaste.' },
            { antes: irA('hoy'), quiz: true, titulo: '¿Lo entendí?', texto: 'Cuatro preguntas rápidas. No es examen.' },
        ],
        /** «¿Lo entendí?»: nunca «incorrecto»; si falla una, se ofrece repasar solo ese paso. */
        preguntas: [
            { p: 'Tienes $100 y antes de tu quincena pagas $40. ¿Cuánto tienes libre?', ops: ['$100', '$60', '$140'], bien: 1, si: '¡Exacto! $100 menos $40: te quedan $60 para gastar.', casi: 'Casi: $100 menos los $40 que pagas antes: te quedan $60.', repaso: 1 },
            // V2-58 (#21): marcar Pagado no cambia el libre.
            { p: 'Cuando marcas un pago como Pagado, ¿qué pasa con tu libre?', ops: ['Baja', 'No cambia, ya estaba contado', 'Sube'], bien: 1, si: '¡Así es! Ya lo tenía restado: solo baja lo que tienes.', casi: 'Casi: ese pago ya estaba restado. Por eso tu libre no cambia.', repaso: 5 },
            { p: 'Te pagan el 29 y el alquiler vence el 30. ¿Con qué se paga?', ops: ['Con lo que tienes hoy', 'Con tu quincena del 29', 'Con tu aguinaldo'], bien: 1, si: '¡Así es! Se paga con lo que te cae antes. Tú lo puedes cambiar o repartir.', casi: 'Casi: se paga con tu quincena del 29, que llega antes.', repaso: 7 },
            { p: 'Pones $50 en tu ahorro «Emergencias». ¿Dónde queda ese dinero?', ops: ['En una cuenta nueva', 'Se gasta', 'En tu banco o efectivo, con nombre'], bien: 2, si: '¡Eso! No se mueve: solo le pones nombre y deja de contar en tu libre.', casi: 'Casi: sigue en tu banco o efectivo; solo le pones nombre.', repaso: 10 },
        ],
        fin: { titulo: '¡Listo! Ya sabes lo principal', texto: 'Si dudas, toca «?» o mira «Aprende». ¿Qué quieres hacer ahora?' },
    };
    const RECORRIDOS = { fijo: FIJO };

    // ------------------------------------------------------------------ el recorrido
    let R = FIJO;
    const T = (P.tour = { activo: false, i: 0, repaso: null, RECORRIDOS });
    Object.defineProperties(T, {
        PASOS: { get: () => R.pasos },
        PREGUNTAS: { get: () => R.preguntas },
        FIN: { get: () => R.fin },
        version: { get: () => R.id },
    });
    const textoDe = (paso) => (typeof paso.texto === 'function' ? paso.texto() : paso.texto);
    /** Todos los textos de una versión (para la prueba de legibilidad), con números de ejemplo donde son dinámicos. */
    T.textos = (version = R.id) => {
        const r = RECORRIDOS[version];
        const previo = R;
        R = r;
        T.cuadre = T.cuadre || { cree: 3400, di: 3000 };
        const a = { libre: 29060, tienes: 106460, efectivo: 3400 };
        const d = { libre: 28460, tienes: 104960, efectivo: 3000 };
        const conMotor = typeof P.calc === 'function' && P.st;
        const out = [
            ...r.pasos.flatMap((p) => [p.titulo, conMotor || typeof p.texto !== 'function' ? textoDe(p) : '', ...(p.celebra ? [p.celebra(a, d), p.celebra(a, a)] : [])]),
            ...r.preguntas.flatMap((q) => [q.p, ...q.ops, q.si, q.casi]),
            r.fin.titulo,
            r.fin.texto,
            '¿Sigues donde te quedaste?',
        ];
        R = previo;
        return out.filter(Boolean);
    };

    function bloquear(si) {
        for (const id of ['vista', 'nav', 'capa-hoja', 'aviso-proto', 'tarea-bar', 'capa-toast']) {
            const el = document.getElementById(id);
            if (el) el.inert = si || (['vista', 'nav'].includes(id) && !!P.ui.hoja);
        }
        document.getElementById('app').classList.toggle('con-tour', si);
    }
    const libreModo = () => {
        const paso = R.pasos[T.i];
        return T.activo && !T.preguntaRetomar && !!paso.hazlo && !T.hecho && T.repaso === null;
    };
    const progreso = () => `<div class="tour-prog" aria-hidden="true"><span style="width:${Math.round(((T.i + 1) * 100) / R.pasos.length)}%"></span></div>`;
    const btn = (texto, accion, { prim = false, fk = '', v = '', extra = '' } = {}) => `<button type="button" class="btn${prim ? ' btn--prim' : ''}" data-a="${accion}"${v !== '' ? ` data-v="${v}"` : ''} data-fk="${fk}" ${extra}>${texto}</button>`;

    // V2-58 (#23): «Muéstrame» primero señala dónde tocar (con una indicación corta) y sigue a la persona
    // paso a paso; un segundo toque («Hazlo por mí») hace la acción.
    function dibujarSenal() {
        const capa = $('#capa-tour');
        let marco = capa.querySelector('.tour-senal');
        const paso = R.pasos[T.i];
        if (!T.activo || !libreModo() || !T.senal || !paso.senal) {
            if (marco) marco.remove();
            return;
        }
        const s = paso.senal();
        const texto = capa.querySelector('#tour-senal-t');
        if (texto && texto.textContent !== s.texto) texto.textContent = s.texto;
        const el = s.sel ? document.querySelector(s.sel) : null;
        if (!el || !el.getClientRects().length) {
            if (marco) marco.remove();
            return;
        }
        const app = document.getElementById('app').getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (!marco) {
            marco = document.createElement('div');
            marco.className = 'tour-senal';
            marco.setAttribute('aria-hidden', 'true');
            capa.appendChild(marco);
        }
        Object.assign(marco.style, { top: `${r.top - app.top - 4}px`, left: `${r.left - app.left - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
    }
    let senalRaf = 0;
    const seguirSenal = () => {
        if (!T.senal) return;
        cancelAnimationFrame(senalRaf);
        senalRaf = requestAnimationFrame(dibujarSenal);
    };
    new MutationObserver(seguirSenal).observe(document.getElementById('app'), { childList: true, subtree: true });
    document.addEventListener('scroll', seguirSenal, true);
    document.addEventListener('input', seguirSenal, true);

    function pintar() {
        const capa = $('#capa-tour');
        document.documentElement.classList.toggle('con-hazlo', libreModo());
        capa.classList.toggle('capa-tour--libre', libreModo());
        if (!T.activo) {
            capa.innerHTML = '';
            return;
        }
        const n = R.pasos.length;
        const paso = R.pasos[T.i];
        // «Hazlo tú»: una barra arriba que no tapa la app; la persona hace la acción de verdad.
        if (libreModo()) {
            const s = T.senal && paso.senal ? paso.senal() : null;
            capa.innerHTML = `<section class="tour-hz" role="region" aria-labelledby="tour-t" aria-describedby="tour-x">${progreso()}
                <div class="tour-hz-cab"><p class="tour-hz-n"><span class="sr-only">Paso ${T.i + 1} de ${n}. </span><span aria-hidden="true">Hazlo tú · ${T.i + 1} de ${n} · </span>${esc(paso.titulo)}</p><button type="button" class="link" data-a="tourCerrar" data-v="saltado" data-fk="tour-saltar">Saltar</button></div>
                <p class="tour-hz-t" id="tour-t" tabindex="-1">${s ? `<span id="tour-senal-t" aria-live="polite">${esc(s.texto)}</span><span id="tour-x" class="sr-only">${esc(textoDe(paso))}</span>` : `<span id="tour-x">${esc(textoDe(paso))}</span>`}</p>
                <div class="tour-hz-acc">${btn(`${icon('chevron-left', 'ico-s')}<span class="sr-only">Atrás</span>`, 'tourMover', { v: -1, fk: 'tour-atras', extra: `aria-label="Atrás"${T.mostrando ? ' disabled' : ''}` })}${btn(T.senal ? `${icon('sparkles', 'ico-s')}Hazlo por mí` : `${icon('play', 'ico-s')}Muéstrame`, 'tourMuestrame', { prim: true, fk: 'tour-muestrame', extra: T.mostrando ? 'disabled' : '' })}${btn('Siguiente', 'tourMover', { v: 1, fk: 'tour-sig', extra: T.mostrando ? 'disabled' : '' })}</div>
            </section>`;
            // Solo al entrar al paso: después la persona está usando la app (no se le quita el foco).
            if (T.enfocar) capa.querySelector('#tour-t').focus({ preventScroll: true });
            T.enfocar = false;
            if (T.senal) dibujarSenal();
            return;
        }
        const app = document.getElementById('app').getBoundingClientRect();
        let el = null;
        if (!T.preguntaRetomar && !paso.quiz && !(paso.hazlo && T.hecho)) el = typeof paso.sel === 'function' ? paso.sel() : paso.sel ? document.querySelector(paso.sel) : null;
        let foco = '';
        let lado = 'centro';
        let top = 0;
        if (el) {
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const r = el.getBoundingClientRect();
            const m = 6;
            const caja = { top: Math.max(0, r.top - app.top - m), left: Math.max(4, r.left - app.left - m), width: Math.min(app.width - 8, r.width + m * 2), height: Math.min(app.height, r.height + m * 2) };
            foco = `<div class="tour-foco" style="top:${caja.top}px;left:${caja.left}px;width:${caja.width}px;height:${caja.height}px" aria-hidden="true"></div>`;
            // La tarjeta va donde haya más espacio: arriba o abajo de lo resaltado.
            const abajo = app.height - (caja.top + caja.height);
            lado = abajo >= caja.top ? 'abajo' : 'arriba';
            top = lado === 'abajo' ? caja.top + caja.height + 10 : caja.top - 10;
            // Si lo resaltado ocupa casi toda la pantalla (una hoja abierta), la tarjeta va abajo, encima.
            if (Math.max(abajo, caja.top) < 200) lado = 'pie';
        }
        const preguntas = R.preguntas;
        const atras = btn('Atrás', 'tourMover', { v: -1, fk: 'tour-atras', extra: T.i === 0 ? 'disabled' : '' });
        const saltar = '<button type="button" class="link" data-a="tourCerrar" data-v="saltado" data-fk="tour-saltar">Saltar</button>';
        const pie = (der) => `<div class="tour-acc">${saltar}<div class="tour-btns">${der}</div></div>`;
        let cab = `<p class="paso"><span class="sr-only">Paso ${T.i + 1} de ${n}. </span><span aria-hidden="true">Recorrido · ${T.i + 1} de ${n}</span></p>`;
        let titulo = paso.titulo;
        let cuerpo = `<p class="txt" id="tour-x">${esc(textoDe(paso))}</p>`;
        let acciones = pie(`${atras}${btn('Siguiente', 'tourMover', { prim: true, v: 1, fk: 'tour-sig' })}`);
        if (T.preguntaRetomar) {
            titulo = '¿Sigues donde te quedaste?';
            cuerpo = `<p class="txt" id="tour-x">Ibas en el paso ${T.preguntaRetomar + 1} de ${n}.</p>`;
            acciones = `<div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="tourRetomar" data-v="si" data-fk="tour-seguir">Seguir</button><button type="button" class="btn btn--48 btn--full" data-a="tourRetomar" data-v="no" data-fk="tour-nuevo">Empezar de nuevo</button></div>`;
        } else if (T.repaso !== null) {
            // Repaso de un paso desde «¿Lo entendí?».
            cab = '<p class="paso">Repaso</p>';
            acciones = `<div class="tour-acc"><span></span><div class="tour-btns">${btn('Volver a las preguntas', 'tourVolverQuiz', { prim: true, fk: 'tour-volver-quiz' })}</div></div>`;
        } else if (paso.hazlo && T.hecho) {
            const a = T.antes;
            const d = T.despues;
            cab = `<p class="paso"><span class="sr-only">Paso ${T.i + 1} de ${n}. </span><span aria-hidden="true">Hazlo tú · ${T.i + 1} de ${n}</span></p>`;
            titulo = '¡Lo hiciste!';
            cuerpo = `<p class="tour-cel" aria-hidden="true">🎉</p>${a.libre !== d.libre ? `<p class="tour-num"><span>Libre</span> ${dinero(a.libre)} ${icon('arrow-right', 'ico-xs')} <strong>${dinero(d.libre)}</strong></p>` : ''}<p class="txt" id="tour-x">${esc(paso.celebra(a, d))}</p>`;
        } else if (paso.quiz) {
            const q = preguntas[T.q];
            cab = `<p class="paso"><span class="sr-only">Paso ${T.i + 1} de ${n}. </span><span aria-hidden="true">${T.q < preguntas.length ? `¿Lo entendí? · pregunta ${T.q + 1} de ${preguntas.length}` : `Recorrido · ${n} de ${n}`}</span></p>`;
            if (T.q === 0 && !T.empezoQuiz) {
                cuerpo = `<p class="txt" id="tour-x">${esc(textoDe(paso))}</p>`;
                acciones = pie(`${atras}${btn('Empezar', 'tourQuiz', { prim: true, fk: 'tour-quiz' })}`);
            } else if (q) {
                titulo = q.p;
                const fb = T.fb;
                const ops = q.ops.map((t, j) => `<button type="button" class="opcion-g tour-op${fb ? (j === q.bien ? ' tour-op--bien' : j === fb.elegida ? ' tour-op--casi' : '') : ''}" role="radio" aria-checked="${fb ? j === fb.elegida : false}" data-a="tourResponder" data-v="${j}" data-fk="tour-op-${j}" ${fb ? 'aria-disabled="true"' : ''}><span class="opcion-g-t">${esc(t)}</span>${fb && j === q.bien ? icon('circle-check', 'ico-ok') : ''}</button>`).join('');
                cuerpo = `<div class="opciones-grandes" role="radiogroup" aria-labelledby="tour-t">${ops}</div>${fb ? `<p class="txt tour-fb${fb.ok ? ' tour-fb--bien' : ''}" id="tour-x" role="status" tabindex="-1">${esc(fb.ok ? q.si : q.casi)}</p>` : ''}`;
                acciones = fb ? `<div class="tour-acc"><span></span><div class="tour-btns">${btn(T.q + 1 < preguntas.length ? 'Siguiente pregunta' : 'Ver cómo te fue', 'tourQuiz', { prim: true, fk: 'tour-quiz' })}</div></div>` : pie(atras);
            } else {
                // Al final: cómo le fue y repasar solo lo que no salió.
                const fallas = preguntas.map((x, j) => (T.res[j] ? null : j)).filter((j) => j !== null);
                titulo = R.fin.titulo;
                cuerpo = `<p class="txt" id="tour-x">${fallas.length ? `Te fue bien: ${preguntas.length - fallas.length} de ${preguntas.length}. ¿Repasamos lo que faltó?` : `¡Todas! Lo entendiste muy bien.`} ${esc(R.fin.texto)}</p>${fallas.length ? `<div class="pila">${fallas.map((j) => btn(`${icon('rotate-ccw', 'ico-s')}Repasar «${esc(R.pasos[preguntas[j].repaso].titulo)}»`, 'tourRepasar', { v: j, fk: 'tour-repasar-' + j })).join('')}</div>` : ''}`;
                acciones = `<div class="pila"><button type="button" class="btn btn--prim btn--48 btn--full" data-a="tourPracticar" data-fk="tour-practicar">${icon('list-checks', 'ico-s')}Practicar con ejemplos</button><button type="button" class="btn btn--48 btn--full" data-a="tourUsar" data-fk="tour-usar">${icon('smartphone', 'ico-s')}Empezar con mis datos</button></div><button type="button" class="link" data-a="tourCerrar" data-v="hecho" data-fk="tour-mirar">Seguir mirando los ejemplos</button>`;
            }
        }
        capa.innerHTML = `${el ? foco : '<div class="tour-velo" aria-hidden="true"></div>'}<section class="tour-card tour-card--${lado}" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x" style="${lado === 'abajo' ? `top:${top}px` : lado === 'arriba' ? `bottom:${app.height - top}px` : ''}">${progreso()}${cab}<h2 class="tour-t" id="tour-t" tabindex="-1">${esc(titulo)}</h2>${cuerpo}${acciones}</section>`;
        // Si la tarjeta no cabe completa arriba o abajo, va al pie de la pantalla (nunca cortada).
        const card = capa.querySelector('.tour-card');
        const r = card.getBoundingClientRect();
        if ((lado === 'arriba' || lado === 'abajo') && (r.top < app.top + 8 || r.bottom > app.top + app.height - 8)) {
            card.classList.replace('tour-card--' + lado, 'tour-card--pie');
            card.style.top = '';
            card.style.bottom = '';
        }
        (capa.querySelector('.tour-fb') && T.enfocarFb ? capa.querySelector('.tour-fb') : capa.querySelector('#tour-t')).focus({ preventScroll: true });
        T.enfocarFb = false;
    }
    function repintar() {
        // Esperar a que la pantalla se dibuje para medir lo que se resalta.
        requestAnimationFrame(() => requestAnimationFrame(pintar));
    }
    function guardarPaso(i) {
        if (P.modos) P.modos.guardarEntrenamiento({ tourPaso: i });
    }
    function ir(i) {
        const previo = R.pasos[T.i];
        if (previo && previo.despues && i !== T.i) previo.despues();
        T.i = Math.max(0, Math.min(R.pasos.length - 1, i));
        T.hecho = false;
        T.mostrando = false;
        T.senal = false;
        T.preguntaRetomar = 0;
        T.enfocar = true;
        const paso = R.pasos[T.i];
        if (paso.quiz) {
            T.q = 0;
            T.res = [];
            T.fb = null;
            T.empezoQuiz = false;
        }
        if (paso.antes) paso.antes();
        T.antes = foto();
        bloquear(!libreModo());
        repintar();
        guardarPaso(T.i);
        P.emitir('tour:paso' + (T.i + 1));
    }
    T.empezar = function () {
        if (P.ayuda) P.ayuda.cerrar({ foco: false });
        P.practica.salir();
        T.activo = true;
        T.repaso = null;
        const ent = P.modos ? P.modos.entrenamiento() : {};
        const guardado = ent.tour !== 'hecho' ? ent.tourPaso || 0 : 0;
        // Retomar donde se quedó: primero se pregunta.
        if (guardado > 0 && guardado < R.pasos.length) {
            if (!(P.restaurar() && P.st.recorrido === R.id)) R.cargar();
            T.i = guardado;
            T.preguntaRetomar = guardado;
            bloquear(true);
            repintar();
            P.emitir('tour:retomar');
            return;
        }
        R.cargar();
        ir(0);
        P.emitir('tour:empezar');
    };
    /** V2-58 (#22): al terminar o saltar el recorrido, los ejemplos vuelven a como estaban al inicio. */
    function terminar(como, { avisar = true } = {}) {
        T.activo = false;
        T.repaso = null;
        T.preguntaRetomar = 0;
        T.senal = false;
        cerrarHoja();
        bloquear(false);
        pintar();
        if (P.modos) P.modos.guardarEntrenamiento({ tour: como, ...(como === 'hecho' ? { tourPaso: 0 } : {}) });
        P.ui.pagosModo = 'calendario';
        P.cargarPersona(R.persona);
        if (avisar) P.avisar('Listo, dejé los ejemplos como al inicio para que practiques');
        P.emitir('tour:' + como);
    }
    const acc = P.acciones;
    acc.tourMover = (d) => {
        T.repaso = null;
        ir(T.i + Number(d.v));
    };
    acc.tourCerrar = (d) => terminar(d.v);
    acc.tourRetomar = (d) => {
        if (d.v === 'si') ir(T.preguntaRetomar);
        else {
            R.cargar();
            ir(0);
        }
    };
    acc.tourMuestrame = async () => {
        const paso = R.pasos[T.i];
        if (!paso.hazlo || T.mostrando) return;
        // Primer toque: señala dónde tocar.
        if (!T.senal && paso.senal) {
            T.senal = true;
            pintar();
            const s = paso.senal();
            const el = s && s.sel && document.querySelector(s.sel);
            if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
            dibujarSenal();
            P.emitir('tour:senal:' + (T.i + 1));
            return;
        }
        // Segundo toque: «Hazlo por mí».
        T.mostrando = true;
        pintar();
        P.emitir('tour:muestrame:' + (T.i + 1));
        try {
            await paso.muestrame();
        } finally {
            T.mostrando = false;
            if (T.activo && !T.hecho) pintar();
        }
    };
    acc.tourQuiz = () => {
        if (!T.empezoQuiz) T.empezoQuiz = true;
        else if (T.fb) {
            T.q++;
            T.fb = null;
        }
        pintar();
    };
    acc.tourResponder = (d) => {
        if (T.fb) return;
        const q = R.preguntas[T.q];
        const j = Number(d.v);
        T.res[T.q] = j === q.bien;
        T.fb = { elegida: j, ok: j === q.bien };
        T.enfocarFb = true;
        pintar();
        P.emitir('tour:respuesta:' + (T.q + 1) + ':' + (T.fb.ok ? 'bien' : 'casi'));
    };
    acc.tourRepasar = (d) => {
        const q = R.preguntas[Number(d.v)];
        T.repaso = T.i;
        const destino = R.pasos[q.repaso];
        T.i = q.repaso;
        if (destino.antes) destino.antes();
        bloquear(true);
        repintar();
        P.emitir('tour:repaso:' + (q.repaso + 1));
    };
    acc.tourVolverQuiz = () => {
        const previo = R.pasos[T.i];
        if (previo && previo.despues) previo.despues();
        T.i = T.repaso;
        T.repaso = null;
        const paso = R.pasos[T.i];
        if (paso.antes) paso.antes();
        T.q = R.preguntas.length;
        T.fb = null;
        bloquear(true);
        repintar();
    };
    /** En Hoy (entrenamiento): si dejó el recorrido a medias, «Sigue tu recorrido» lo retoma en ese paso. */
    T.tarjetaHoy = () => {
        if (T.activo || P.modo === 'uso' || !P.modos) return '';
        const ent = P.modos.entrenamiento();
        const paso = ent.tour !== 'hecho' ? ent.tourPaso || 0 : 0;
        if (!(paso > 0 && paso < R.pasos.length)) return '';
        return `<section class="card card--aviso" aria-labelledby="tour-seguir-t"><div class="aviso-cab">${P.caja('🎓')}<div><h2 class="card-t" id="tour-seguir-t">Sigue tu recorrido</h2><p class="txt">Vas en el paso ${paso + 1} de ${R.pasos.length}.</p></div></div><div class="acciones-2"><button type="button" class="btn" data-a="tourOlvidar" data-fk="tour-hoy-no">Ya no</button><button type="button" class="btn btn--prim" data-a="tourSeguirHoy" data-fk="tour-hoy-seguir">Seguir</button></div></section>`;
    };
    acc.tourSeguirHoy = () => {
        T.empezar();
        if (T.preguntaRetomar) acc.tourRetomar({ v: 'si' });
    };
    acc.tourOlvidar = () => {
        P.modos.guardarEntrenamiento({ tourPaso: 0 });
        P.render({ foco: '#pantalla h1' });
    };
    acc.tourPracticar = () => {
        terminar('hecho');
        P.ayuda.abrir('practica');
    };
    acc.tourUsar = () => {
        terminar('hecho', { avisar: false });
        P.modos.cambiar('uso');
    };
    // «Hazlo tú»: cuando la persona hace la acción, se celebra y se ve cómo cambió el número.
    window.addEventListener('proto', (e) => {
        if (!T.activo || T.preguntaRetomar || T.repaso !== null) return;
        const paso = R.pasos[T.i];
        if (!paso.hazlo || T.hecho) return;
        const clave = String(e.detail.clave);
        if (!paso.claves.some((c) => clave === c || clave.startsWith(c + ':'))) return;
        T.hecho = true;
        T.senal = false;
        setTimeout(() => {
            T.despues = foto();
            cerrarHoja();
            bloquear(true);
            repintar();
            P.emitir('tour:hecho:' + (T.i + 1));
        }, 450);
    });
    document.addEventListener(
        'keydown',
        (e) => {
            if (!T.activo) return;
            // En «Hazlo tú» la app manda: Escape cierra lo que esté abierto, no el recorrido.
            if (libreModo()) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                terminar('saltado');
                return;
            }
            const paso = R.pasos[T.i];
            if (e.key === 'ArrowRight' && !paso.quiz && !T.preguntaRetomar && T.repaso === null) ir(T.i + 1);
            if (e.key === 'ArrowLeft' && T.i > 0 && !T.preguntaRetomar && T.repaso === null) ir(T.i - 1);
            if (e.key !== 'Tab') return;
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
        },
        true,
    );
    // En «Hazlo tú» no se repinta al cambiar el tamaño (al abrir el teclado): la barra no depende de medidas.
    window.addEventListener('resize', () => {
        if (!T.activo) return;
        if (libreModo()) seguirSenal();
        else pintar();
    });

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
    PR.pintar = (barra) => {
        const c = PR.caso;
        document.documentElement.classList.add('con-tarea');
        barra.hidden = false;
        barra.innerHTML = PR.logrado
            ? `<div class="tarea-txt tarea-txt--ok">${icon('circle-check', 'ico-s')}<span class="tarea-t"><strong>¡Lo lograste!</strong> ${esc(c.titulo)}</span></div><div class="tarea-acc"><button type="button" class="tarea-btn tarea-btn--prim" data-a="prSiguiente" data-fk="pr-siguiente">Otro</button></div>`
            : `<button type="button" class="tarea-txt" data-a="ayIr" data-v="comoSeHace" data-fk="pr-ver" aria-label="Ejercicio: ${esc(c.tarea)}. Ver cómo se hace"><span class="tarea-n">Ejercicio · ${esc(c.titulo)}</span><span class="tarea-t">${esc(c.tarea)}</span></button><div class="tarea-acc"><button type="button" class="tarea-btn" data-a="ayIr" data-v="comoSeHace" data-fk="pr-como">¿Cómo?</button><button type="button" class="tarea-btn" data-a="prSalir" data-fk="pr-salir">Salir</button></div>`;
    };
    window.addEventListener('proto', (e) => {
        if (!PR.activa() || PR.logrado) return;
        if (finDe(PR.caso).includes(String(e.detail.clave))) {
            PR.logrado = true;
            const ent = P.modos.entrenamiento();
            P.modos.guardarEntrenamiento({ practicas: { ...(ent.practicas || {}), [PR.caso.id]: true } });
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
    function vistaPractica() {
        const hechas = (P.modos ? P.modos.entrenamiento().practicas : {}) || {};
        const lista = (window.PRACTICA || []).map((x) => ({ ...x, caso: buscarCaso(x.id) })).filter((x) => x.caso);
        return `<p class="txt">Ejercicios cortos con datos de ejemplo, de fácil a difícil. Si te trabas, toca «¿Cómo?».</p>
            <ul class="ay-casos">${lista.map(({ caso: c, nivel }) => `<li><button type="button" class="ay-caso ay-caso--ej" data-a="prEmpezar" data-v="${c.id}" data-fk="pr-${c.id}"><span class="ay-caso-t">${esc(c.titulo)} <span class="nivel nivel--${nivel === 'Fácil' ? 'facil' : nivel === 'Media' ? 'media' : 'dificil'}">${esc(nivel)}</span><span class="fila-s">${esc(c.tarea)}</span></span>${hechas[c.id] ? `<span class="ay-caso-ok">${icon('circle-check', 'ico-s')}<span class="sr-only">hecho</span></span>` : ''}</button></li>`).join('')}</ul>
            <button type="button" class="btn btn--48 btn--full" data-a="modoCambiar" data-v="uso" data-fk="pr-usar">${icon('smartphone', 'ico-s')}Empezar con mis datos</button>`;
    }
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
    };
})();
