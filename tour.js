// Producto v2.4 · prototipo. MODO ENTRENAMIENTO «a prueba de todo»: un recorrido de 15 pasos cortos (una
// idea por paso, con números redondos) sobre los datos de ejemplo de Ana, con cuatro momentos «Hazlo tú»
// (anotar, marcar Pagado, elegir con qué pagas, cuadrar) en los que la persona hace la acción de verdad y ve
// el número cambiar («Muéstrame» si se traba), «¿Lo entendí?» (tres preguntas amables, con repaso) y retomar
// donde se quedó. También «Practicar con ejemplos»: 13 ejercicios ordenados de fácil a difícil.
'use strict';
(() => {
    const P = window.P;
    const M = window.MOTOR;
    const { esc, icon } = P;
    const $ = (s) => document.querySelector(s);
    const dinero = M.dinero;
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

    // ------------------------------------------------------------------ el recorrido
    const cerrarHoja = () => P.ui.hoja && P.cerrarHoja({ sinFoco: true });
    const irA = (tab) => () => {
        cerrarHoja();
        if (P.ui.tab !== tab || P.ui.stack.length) P.irTab(tab);
    };
    /** Ana para el recorrido: su luz de octubre ya está pagada y el teléfono ($15) vence el 25, antes de su quincena. */
    function cargarRecorrido() {
        P.cargarPersona('ana');
        const st = P.st;
        P.marcarPagado(st, 'luz', '2026-10-12', { monto: 3500, medio: 'debito', fecha: '2026-10-12' });
        const tel = P.crearPago(st, { nombre: 'Teléfono', emoji: '📱', categoria: 'telefono', monto: 1500, frecuencia: 'mensual', dia: 25, medio: 'efectivo' });
        Object.assign(tel, { id: 'telefono', desde: '2026-10-01', nuevo: false });
        st.recorrido = true;
        P.render();
    }
    const foto = () => {
        const k = P.calc();
        return { libre: k.libre, tienes: k.tienes, efectivo: M.saldoLugar(P.st, 'efectivo') };
    };
    /** Escribe en un campo como lo haría la persona (para «Muéstrame»). */
    function escribirEn(sel, valor) {
        const el = document.querySelector(sel);
        if (!el) return;
        el.value = valor;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const grupo = (titulo) => [...document.querySelectorAll('.grupo')].find((g) => g.querySelector('.grupo-t')?.textContent === titulo) || null;

    const PASOS = [
        { antes: irA('hoy'), titulo: 'Te enseño la app en 4 minutos', texto: 'Usamos los datos de Ana, de ejemplo: no toca los tuyos.' },
        { antes: irA('hoy'), sel: '.portada', titulo: 'Libre: lo que puedes gastar', texto: 'Tienes $100 y antes de tu quincena pagas $40: te quedan $60 libres.' },
        {
            antes: () => {
                irA('hoy')();
                P.abrirHoja('desglose');
            },
            sel: '.hoja',
            titulo: '¿De dónde sale?',
            texto: 'Lo que tienes, menos tus ahorros, menos lo que pagas antes de tu quincena.',
        },
        {
            antes: irA('hoy'),
            hazlo: true,
            titulo: 'Anota en 5 segundos',
            texto: 'Toca (+) y escribe «pupusas 6», o díctalo con el micrófono.',
            claves: ['guardado:gasto'],
            celebra: (a, d) => `¡Eso! Ya está anotado: tu libre bajó ${dinero(a.libre - d.libre)}.`,
            async muestrame() {
                irA('hoy')();
                P.acciones.anotar();
                await esperar(600);
                escribirEn('#anotar-q', 'pupusas 6');
                await esperar(1000);
                if (P.ui.hoja && P.ui.hoja.tipo === 'anotar') P.acciones.anotarGuardar();
            },
        },
        { antes: irA('hoy'), sel: 'section[aria-labelledby="h-pagos"]', titulo: 'Lo que viene', texto: 'Tus próximos pagos. Lo que vence antes de tu quincena ya está restado.' },
        {
            antes: irA('hoy'),
            hazlo: true,
            titulo: 'Marca un pago',
            texto: 'Ya pagaste el teléfono: toca «Pagado» junto a él.',
            claves: ['guardado:pagado'],
            celebra: (a, d) => (d.libre === a.libre ? `¡Listo! Tu libre no cambió: ya estaba contado. Lo que tienes bajó ${dinero(a.tienes - d.tienes)}.` : `¡Listo! Tu libre pasó de ${dinero(a.libre)} a ${dinero(d.libre)}.`),
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
        { antes: irA('hoy'), sel: '.proy', titulo: 'Tu próxima quincena', texto: 'Entran $600 y pagas $100: te quedarían $500. Si hoy te sobra, pásalo a la próxima.' },
        {
            antes: irA('hoy'),
            hazlo: true,
            titulo: '¿Con qué lo pagas?',
            texto: 'El colegio sale de tu quincena del 30. Ábrelo y págalo con lo que tienes ahora.',
            claves: ['guardado:pagarCon'],
            celebra: (a, d) => (a.libre > d.libre ? `¡Bien! ${dinero(a.libre - d.libre)} ya están apartados para el colegio. Tu quincena del 30 queda con ${dinero(a.libre - d.libre)} más.` : '¡Bien! Así eliges de qué dinero sale cada pago. También puedes repartirlo.'),
            async muestrame() {
                irA('hoy')();
                P.abrir('pago', 'colegio');
                await esperar(800);
                P.abrirHoja('pagarCon', { id: 'colegio', fecha: '2026-11-05' });
                await esperar(800);
                if (!P.ui.hoja || P.ui.hoja.tipo !== 'pagarCon') return;
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
            texto: 'Un pago de enero puede salir de tu aguinaldo. Cuenta cuando te cae.',
        },
        {
            antes: () => {
                P.ui.pagosModo = 'lista';
                irA('pagos')();
            },
            sel: 'section[aria-labelledby="mp-ingresos"]',
            titulo: 'Adelanto de salario',
            texto: '¿Te adelantaron $100? Di de qué quincena te lo descuentan: vendrá con $100 menos.',
            despues: () => (P.ui.pagosModo = 'calendario'),
        },
        { antes: irA('midinero'), sel: '[data-fk="md-ahorros"]', titulo: 'Ahorros', texto: 'Ponle nombre a $50: «Emergencias». Sigue en tu banco; ya no cuenta en tu libre.' },
        {
            antes: () => {
                irA('midinero')();
                // Lo que la app cree y un número redondo un poco menor (se fija al empezar el paso).
                const e = M.saldoLugar(P.st, 'efectivo');
                T.cuadre = { cree: e, di: Math.max(0, Math.floor((e - 1) / 500) * 500) };
            },
            hazlo: true,
            titulo: 'Cuadra tu efectivo',
            texto: () => `Tu número parte de lo que cuadras. La app cree que tienes ${dinero(T.cuadre.cree)} en efectivo: di ${dinero(T.cuadre.di)}.`,
            claves: ['guardado:cuadre'],
            celebra: (a, d) => (d.efectivo !== a.efectivo ? `¡Listo! Tu efectivo ahora es ${dinero(d.efectivo)}. Los ${dinero(Math.abs(a.efectivo - d.efectivo))} de diferencia quedan «sin detalle», sin culpa.` : '¡Listo! Cuadró exacto: tu número ya es el real.'),
            async muestrame() {
                irA('midinero')();
                await esperar(300);
                P.abrir('cuentas');
                await esperar(800);
                P.abrirHoja('cuadrar', { id: 'efectivo' });
                await esperar(700);
                escribirEn('#f-monto', M.montoCampo(T.cuadre.di));
                await esperar(1000);
                if (P.ui.hoja && P.ui.hoja.tipo === 'cuadrar') P.acciones.cuadrarOk();
            },
        },
        { antes: irA('midinero'), sel: '[data-fk="md-deudas"]', titulo: 'Tarjetas y préstamos', texto: 'Comprar con tarjeta baja tu libre ese día. Si no sabes su corte, te lo pido después.' },
        { antes: irA('hoy'), titulo: '¿Volviste después de días?', texto: 'Sin culpa: «Pongámonos al día» te pregunta qué llegó y qué pagaste. Es un minuto.' },
        { antes: irA('hoy'), quiz: true, titulo: '¿Lo entendí?', texto: 'Tres preguntas rápidas. No es examen.' },
    ];
    /** «¿Lo entendí?»: nunca «incorrecto»; si falla una, se ofrece repasar solo ese paso. */
    const PREGUNTAS = [
        { p: 'Tienes $100 y antes de tu quincena pagas $40. ¿Cuánto tienes libre?', ops: ['$100', '$60', '$140'], bien: 1, si: '¡Exacto! $100 menos $40: te quedan $60 para gastar.', casi: 'Casi: a los $100 réstale los $40 que pagas antes de tu quincena: $60.', repaso: 1 },
        { p: 'Te pagan el 29 y el alquiler vence el 30. ¿Con qué se paga?', ops: ['Con lo que tienes hoy', 'Con tu quincena del 29', 'Con tu aguinaldo'], bien: 1, si: '¡Así es! Se paga con lo que te cae antes de que venza. Tú lo puedes cambiar o repartir.', casi: 'Casi: se paga con tu quincena del 29, la que llega antes. Tú lo puedes cambiar.', repaso: 7 },
        { p: 'Pones $50 en tu ahorro «Emergencias». ¿Dónde queda ese dinero?', ops: ['En una cuenta nueva', 'Se gasta', 'En tu banco o efectivo, con nombre'], bien: 2, si: '¡Eso! No se mueve: solo le pones nombre y deja de contar en tu libre.', casi: 'Casi: no se mueve de tu banco o efectivo. Solo le pones nombre.', repaso: 10 },
    ];
    const FIN = { titulo: '¡Listo! Ya sabes lo principal', texto: 'Si dudas, toca «?» o mira «Aprende» en tu letra. ¿Qué quieres hacer ahora?' };
    const T = (P.tour = { activo: false, i: 0, repaso: null, PASOS, PREGUNTAS, FIN });
    const textoDe = (paso) => (typeof paso.texto === 'function' ? paso.texto() : paso.texto);
    /** Todos los textos del recorrido (para la prueba de legibilidad). */
    T.textos = () => {
        T.cuadre = T.cuadre || { cree: 3400, di: 3000 };
        const a = { libre: 29060, tienes: 106460, efectivo: 3400 };
        const d = { libre: 28460, tienes: 104960, efectivo: 3000 };
        return [
            ...PASOS.flatMap((p) => [p.titulo, textoDe(p), ...(p.celebra ? [p.celebra(a, d), p.celebra(a, a)] : [])]),
            ...PREGUNTAS.flatMap((q) => [q.p, ...q.ops, q.si, q.casi]),
            FIN.titulo,
            FIN.texto,
            '¿Sigues donde te quedaste?',
        ];
    };

    function bloquear(si) {
        for (const id of ['vista', 'nav', 'capa-hoja', 'aviso-proto', 'tarea-bar', 'capa-toast']) {
            const el = document.getElementById(id);
            if (el) el.inert = si || (['vista', 'nav'].includes(id) && !!P.ui.hoja);
        }
        document.getElementById('app').classList.toggle('con-tour', si);
    }
    const libreModo = () => {
        const paso = PASOS[T.i];
        return T.activo && !T.preguntaRetomar && !!paso.hazlo && !T.hecho && T.repaso === null;
    };
    const progreso = () => `<div class="tour-prog" aria-hidden="true"><span style="width:${Math.round(((T.i + 1) * 100) / PASOS.length)}%"></span></div>`;
    const btn = (texto, accion, { prim = false, fk = '', v = '', extra = '' } = {}) => `<button type="button" class="btn${prim ? ' btn--prim' : ''}" data-a="${accion}"${v !== '' ? ` data-v="${v}"` : ''} data-fk="${fk}" ${extra}>${texto}</button>`;

    function pintar() {
        const capa = $('#capa-tour');
        document.documentElement.classList.toggle('con-hazlo', libreModo());
        capa.classList.toggle('capa-tour--libre', libreModo());
        if (!T.activo) {
            capa.innerHTML = '';
            return;
        }
        const n = PASOS.length;
        const paso = PASOS[T.i];
        // «Hazlo tú»: una barra arriba que no tapa la app; la persona hace la acción de verdad.
        if (libreModo()) {
            capa.innerHTML = `<section class="tour-hz" role="region" aria-labelledby="tour-t" aria-describedby="tour-x">${progreso()}
                <div class="tour-hz-cab"><p class="tour-hz-n"><span class="sr-only">Paso ${T.i + 1} de ${n}. </span><span aria-hidden="true">Hazlo tú · ${T.i + 1} de ${n} · </span>${esc(paso.titulo)}</p><button type="button" class="link" data-a="tourCerrar" data-v="saltado" data-fk="tour-saltar">Saltar</button></div>
                <p class="tour-hz-t" id="tour-t" tabindex="-1"><span id="tour-x">${esc(textoDe(paso))}</span></p>
                <div class="tour-hz-acc">${btn(`${icon('chevron-left', 'ico-s')}<span class="sr-only">Atrás</span>`, 'tourMover', { v: -1, fk: 'tour-atras', extra: `aria-label="Atrás"${T.mostrando ? ' disabled' : ''}` })}${btn(`${icon('play', 'ico-s')}Muéstrame`, 'tourMuestrame', { prim: true, fk: 'tour-muestrame', extra: T.mostrando ? 'disabled' : '' })}${btn('Siguiente', 'tourMover', { v: 1, fk: 'tour-sig', extra: T.mostrando ? 'disabled' : '' })}</div>
            </section>`;
            // Solo al entrar al paso: después la persona está usando la app (no se le quita el foco).
            if (T.enfocar) capa.querySelector('#tour-t').focus({ preventScroll: true });
            T.enfocar = false;
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
            const q = PREGUNTAS[T.q];
            cab = `<p class="paso"><span class="sr-only">Paso ${T.i + 1} de ${n}. </span><span aria-hidden="true">${T.q < PREGUNTAS.length ? `¿Lo entendí? · pregunta ${T.q + 1} de ${PREGUNTAS.length}` : `Recorrido · ${n} de ${n}`}</span></p>`;
            if (T.q === 0 && !T.empezoQuiz) {
                cuerpo = `<p class="txt" id="tour-x">${esc(paso.texto)}</p>`;
                acciones = pie(`${atras}${btn('Empezar', 'tourQuiz', { prim: true, fk: 'tour-quiz' })}`);
            } else if (q) {
                titulo = q.p;
                const fb = T.fb;
                const ops = q.ops.map((t, j) => `<button type="button" class="opcion-g tour-op${fb ? (j === q.bien ? ' tour-op--bien' : j === fb.elegida ? ' tour-op--casi' : '') : ''}" role="radio" aria-checked="${fb ? j === fb.elegida : false}" data-a="tourResponder" data-v="${j}" data-fk="tour-op-${j}" ${fb ? 'aria-disabled="true"' : ''}><span class="opcion-g-t">${esc(t)}</span>${fb && j === q.bien ? icon('circle-check', 'ico-ok') : ''}</button>`).join('');
                cuerpo = `<div class="opciones-grandes" role="radiogroup" aria-labelledby="tour-t">${ops}</div>${fb ? `<p class="txt tour-fb${fb.ok ? ' tour-fb--bien' : ''}" id="tour-x" role="status" tabindex="-1">${esc(fb.ok ? q.si : q.casi)}</p>` : ''}`;
                acciones = fb ? `<div class="tour-acc"><span></span><div class="tour-btns">${btn(T.q + 1 < PREGUNTAS.length ? 'Siguiente pregunta' : 'Ver cómo te fue', 'tourQuiz', { prim: true, fk: 'tour-quiz' })}</div></div>` : pie(atras);
            } else {
                // Al final: cómo le fue y repasar solo lo que no salió.
                const fallas = PREGUNTAS.map((x, j) => (T.res[j] ? null : j)).filter((j) => j !== null);
                titulo = FIN.titulo;
                cuerpo = `<p class="txt" id="tour-x">${fallas.length ? `Te fue bien: ${PREGUNTAS.length - fallas.length} de ${PREGUNTAS.length}. ¿Repasamos lo que faltó?` : '¡Las tres! Lo entendiste muy bien.'} ${esc(FIN.texto)}</p>${fallas.length ? `<div class="pila">${fallas.map((j) => btn(`${icon('rotate-ccw', 'ico-s')}Repasar «${esc(PASOS[PREGUNTAS[j].repaso].titulo)}»`, 'tourRepasar', { v: j, fk: 'tour-repasar-' + j })).join('')}</div>` : ''}`;
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
    function ir(i) {
        const previo = PASOS[T.i];
        if (previo && previo.despues && i !== T.i) previo.despues();
        T.i = Math.max(0, Math.min(PASOS.length - 1, i));
        T.hecho = false;
        T.mostrando = false;
        T.preguntaRetomar = 0;
        T.enfocar = true;
        const paso = PASOS[T.i];
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
        if (P.modos) P.modos.guardarEntrenamiento({ tourPaso: T.i });
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
        if (guardado > 0 && guardado < PASOS.length) {
            if (!(P.restaurar() && P.st.recorrido)) cargarRecorrido();
            T.i = guardado;
            T.preguntaRetomar = guardado;
            bloquear(true);
            repintar();
            P.emitir('tour:retomar');
            return;
        }
        cargarRecorrido();
        ir(0);
        P.emitir('tour:empezar');
    };
    function terminar(como) {
        T.activo = false;
        T.repaso = null;
        T.preguntaRetomar = 0;
        cerrarHoja();
        bloquear(false);
        pintar();
        if (P.modos) P.modos.guardarEntrenamiento({ tour: como, ...(como === 'hecho' ? { tourPaso: 0 } : {}) });
        P.ui.pagosModo = 'calendario';
        P.irTab('hoy');
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
            cargarRecorrido();
            ir(0);
        }
    };
    acc.tourMuestrame = async () => {
        const paso = PASOS[T.i];
        if (!paso.hazlo || T.mostrando) return;
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
        const q = PREGUNTAS[T.q];
        const j = Number(d.v);
        T.res[T.q] = j === q.bien;
        T.fb = { elegida: j, ok: j === q.bien };
        T.enfocarFb = true;
        pintar();
        P.emitir('tour:respuesta:' + (T.q + 1) + ':' + (T.fb.ok ? 'bien' : 'casi'));
    };
    acc.tourRepasar = (d) => {
        const q = PREGUNTAS[Number(d.v)];
        T.repaso = T.i;
        const destino = PASOS[q.repaso];
        T.i = q.repaso;
        if (destino.antes) destino.antes();
        bloquear(true);
        repintar();
        P.emitir('tour:repaso:' + (q.repaso + 1));
    };
    acc.tourVolverQuiz = () => {
        const previo = PASOS[T.i];
        if (previo && previo.despues) previo.despues();
        T.i = T.repaso;
        T.repaso = null;
        const paso = PASOS[T.i];
        if (paso.antes) paso.antes();
        T.q = PREGUNTAS.length;
        T.fb = null;
        bloquear(true);
        repintar();
    };
    /** En Hoy (entrenamiento): si dejó el recorrido a medias, «Sigue tu recorrido» lo retoma en ese paso. */
    T.tarjetaHoy = () => {
        if (T.activo || P.modo === 'uso' || !P.modos) return '';
        const ent = P.modos.entrenamiento();
        const paso = ent.tour !== 'hecho' ? ent.tourPaso || 0 : 0;
        if (!(paso > 0 && paso < PASOS.length)) return '';
        return `<section class="card card--aviso" aria-labelledby="tour-seguir-t"><div class="aviso-cab">${P.caja('🎓')}<div><h2 class="card-t" id="tour-seguir-t">Sigue tu recorrido</h2><p class="txt">Vas en el paso ${paso + 1} de ${PASOS.length}.</p></div></div><div class="acciones-2"><button type="button" class="btn" data-a="tourOlvidar" data-fk="tour-hoy-no">Ya no</button><button type="button" class="btn btn--prim" data-a="tourSeguirHoy" data-fk="tour-hoy-seguir">Seguir</button></div></section>`;
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
        terminar('hecho');
        P.modos.cambiar('uso');
    };
    // «Hazlo tú»: cuando la persona hace la acción, se celebra y se ve cómo cambió el número.
    window.addEventListener('proto', (e) => {
        if (!T.activo || T.preguntaRetomar || T.repaso !== null) return;
        const paso = PASOS[T.i];
        if (!paso.hazlo || T.hecho) return;
        const clave = String(e.detail.clave);
        if (!paso.claves.some((c) => clave === c || clave.startsWith(c + ':'))) return;
        T.hecho = true;
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
            const paso = PASOS[T.i];
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
    window.addEventListener('resize', () => T.activo && !libreModo() && pintar());

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
