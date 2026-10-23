// ============================================================================================================================
// VISTA PREVIA v2.9.3 — SOLO PARA COMPARAR «Hoy A / Hoy B». QUITAR ANTES DE PUBLICAR (este archivo, su <script> en
// telefono.html y las líneas marcadas «VISTA PREVIA» en arranque.js y ayuda.js).
// - Un selector «Hoy C / Hoy A / Hoy B» arriba de Hoy (C por defecto; se recuerda en este navegador; no es parte de tus datos).
// - «Cargar ejemplo»: 4 personas (quincena, mes, semana, ventas) × 7 casos. Recarga la página con #ejemplo=…: así nunca se
//   cargan tus datos ni se guarda nada (P.sinGuardar, y la persona de ejemplo no es «uso»: el candado tampoco la guardaría).
// - En raw.githack.com no se registra el service worker (y se quita el de esta ruta): así cada push se ve al recargar.
// ============================================================================================================================
'use strict';
(() => {
    const M = window.MOTOR;
    const P = window.P;
    // Clave nueva con Hoy C: así C es la que se ve primero aunque antes hayas elegido A o B.
    const CLAVE = 'pamplanea-vista-previa:hoy-c';
    const hash = () => new URLSearchParams(location.hash.slice(1));
    const leer = () => {
        try {
            return localStorage.getItem(CLAVE);
        } catch {
            return null;
        }
    };
    const PERSONAS = { pam: 'Pam · quincena', majo: 'Majo · mes', tono: 'Toño · semana', rosa: 'Rosa · ventas' };
    const CASOS = { tranquilo: 'Día tranquilo', cobro: 'Día de cobro (¿Ya llegó?)', vencido: 'Algo vencido', cero: 'Libre en cero', pasado: 'Presupuesto pasado', nueva: 'Persona nueva', largos: 'Nombres largos, 6 cifras', muchos: '8 presupuestos' };
    const elegido = { persona: 'pam', caso: 'tranquilo' };
    const ej = hash().get('ejemplo');
    if (ej) [elegido.persona, elegido.caso] = ej.split('-');

    const V = (P.vistaPrevia = {
        PERSONAS,
        CASOS,
        /** C, A o B: lo que pidió la prueba, el enlace (#hoy=B), lo último que eligió esta persona o C (el de por defecto). */
        variante() {
            const v = window.__hoyVariante || hash().get('hoy') || leer() || 'C';
            return ['A', 'B', 'C', 'clasico'].includes(v) ? v : 'C';
        },
        /** #limpio=1: sin esta barra (para las capturas). */
        limpio: () => hash().get('limpio') === '1',
        enEjemplo: () => !!hash().get('ejemplo'),
        sinServiceWorker: () => /(^|\.)githack\.com$/.test(location.hostname),
        quitarServiceWorker() {
            try {
                navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => location.href.startsWith(r.scope) && r.unregister()));
            } catch {
                /* sin service worker */
            }
        },
        barra() {
            if (V.limpio()) return '';
            const v = V.variante();
            const op = (obj, sel) => Object.entries(obj).map(([id, t]) => `<option value="${id}"${id === sel ? ' selected' : ''}>${P.esc(t)}</option>`).join('');
            return `<div class="vp" role="region" aria-label="Vista previa: solo para comparar">
                <div class="vp-fila"><p class="vp-t">Vista previa</p><div class="vp-ab" role="group" aria-label="Diseño de Hoy">${['C', 'A', 'B'].map((x) => `<button type="button" class="vp-b" aria-pressed="${v === x}" data-a="vpHoy" data-v="${x}" data-fk="vp-${x}">Hoy ${x}</button>`).join('')}</div></div>
                <div class="vp-fila vp-ej"><label class="vp-l"><span class="sr-only">Persona</span><select id="vp-persona" data-vp="persona">${op(PERSONAS, elegido.persona)}</select></label><label class="vp-l"><span class="sr-only">Caso</span><select id="vp-caso" data-vp="caso">${op(CASOS, elegido.caso)}</select></label></div>
                <div class="vp-fila"><button type="button" class="btn btn--sm" data-a="vpCargar" data-fk="vp-cargar">Cargar ejemplo</button>${V.enEjemplo() ? '<button type="button" class="link" data-a="vpMisDatos" data-fk="vp-mis-datos">Volver a mis datos</button>' : ''}</div>
            </div>`;
        },
        armar,
    });
    // Su estilo vive aquí: al quitar este archivo no queda nada.
    document.head.appendChild(
        Object.assign(document.createElement('style'), {
            textContent: `.vp{display:grid;gap:8px;padding:10px 12px;border:1.5px dashed var(--color-control-border);border-radius:14px;background:var(--color-surface);font-size:14px;line-height:20px}
.vp-fila{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.vp-t{flex:1;color:var(--color-text-muted);font-weight:700}
.vp-ab{display:inline-flex;padding:2px;border:1px solid var(--color-control-border);border-radius:999px;background:var(--color-surface-2)}
.vp-b{min-width:76px;min-height:44px;padding:0 14px;border-radius:999px;font-weight:600}.vp-b[aria-pressed='true']{background:var(--color-text);color:var(--color-surface)}
.vp-l{display:flex;flex:1 1 140px;min-width:0}.vp-l select{width:100%;min-height:44px;padding:0 8px;border:1px solid var(--color-control-border);border-radius:10px;background:var(--color-surface-2);color:var(--color-text);font:inherit}`,
        }),
    );
    document.addEventListener('change', (e) => {
        const k = e.target && e.target.dataset ? e.target.dataset.vp : null;
        if (k) elegido[k] = e.target.value;
    });
    P.acciones.vpHoy = (d) => {
        try {
            localStorage.setItem(CLAVE, d.v);
        } catch {
            /* sin almacenamiento: solo en esta sesión */
        }
        window.__hoyVariante = d.v;
        P.ui.hoyAbierta = null;
        P.render({ foco: `[data-fk="vp-${d.v}"]` });
    };
    const recargar = (h) => {
        location.hash = h;
        location.reload();
    };
    P.acciones.vpCargar = () => recargar(`ejemplo=${elegido.persona}-${elegido.caso}`);
    P.acciones.vpMisDatos = () => recargar('');
    /** Lo llama arranque.js con #ejemplo=persona-caso: nada se guarda. */
    V.cargar = (id) => {
        const [persona, caso] = String(id).split('-');
        P.sinGuardar = true;
        P.modo = 'uso';
        P.cargar(armar(persona in PERSONAS ? persona : 'pam', caso in CASOS ? caso : 'tranquilo'), { tab: 'hoy' });
    };

    // ------------------------------------------------------------------ los ejemplos (montos en centavos)
    const c = (x) => Math.round(x * 100);
    const HOY = { pam: ['2026-10-21', '2026-10-30'], majo: ['2026-10-21', '2026-10-30'], tono: ['2026-10-21', '2026-10-23'], rosa: ['2026-10-21', '2026-10-21'] };
    /**
     * Arma los datos de una persona en un caso, como si los hubiera anotado día por día desde el 1 de octubre (los pagos de
     * antes de hoy, pagados; sus ingresos, llegados), con las mismas funciones de la app.
     */
    function armar(persona, caso) {
        const tipo = { pam: 'quincena', majo: 'mes', tono: 'semana', rosa: 'variable' }[persona];
        const largo = caso === 'largos';
        const f = largo ? 2000 : 1;
        const m = (x) => c(x * f);
        const escala = tipo === 'mes' ? 2 : tipo === 'semana' ? 0.5 : tipo === 'variable' ? 1.5 : 1;
        const e = (x) => m(x * escala);
        const hoy = HOY[persona][caso === 'cobro' ? 1 : 0];
        const nueva = caso === 'nueva';
        const inicio = nueva ? hoy : '2026-10-01';
        const nombre = largo ? 'María Fernanda de los Ángeles' : { pam: 'Pam', majo: 'Majo', tono: 'Toño', rosa: 'Rosa' }[persona];
        const st = { persona: 'vista-previa', nombre, espacio: 'Casa de ' + nombre, hoy: inicio, inicio, configurado: true, horizonteVariable: tipo === 'variable' ? 'finDeMes' : null,
            lugares: [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵' }, { id: 'agricola', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦' }],
            medios: [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }, { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'agricola', tarjetaDebito: true }, { id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: 'agricola' }],
            tarjetas: [], apartados: [], logros: [], pagos: [], ingresos: [], registros: [], avisos: [], reservasTarjeta: [], variables: [], seq: 1, interesInvitar: false };
        // Primer día: lo que tenía en cada cuenta.
        const saldos = nueva ? { efectivo: m(40), agricola: m(350) } : { efectivo: m(80), agricola: m({ quincena: 500, mes: 1400, semana: 0, variable: 950 }[tipo]) };
        for (const l of st.lugares) {
            const r = { id: 'r' + st.seq, seq: st.seq++, tipo: 'cuadre', fecha: inicio, lugar: l.id, monto: saldos[l.id], esperado: saldos[l.id], primero: true };
            st.registros.push(r);
            l.cuadre = { fecha: inicio, seq: r.seq, monto: r.monto };
        }
        const pr = tipo === 'quincena' ? { nombre: 'Quincena', monto: m(600), frecuencia: 'quincenal', dias: [15, 30], lugar: 'agricola' }
            : tipo === 'mes' ? { nombre: 'Salario', monto: m(1200), frecuencia: 'mensual', dia: 30, lugar: 'agricola' }
            : tipo === 'semana' ? { nombre: 'Pago de la semana', monto: m(300), frecuencia: 'semanal', diaSemana: 5, lugar: 'efectivo' }
            : null;
        if (pr) st.ingresos.push({ id: 'sueldo', emoji: '💼', categoria: 'salario', aprox: false, principal: true, desde: inicio, creado: inicio, llegadas: {}, ...pr });
        if (!nueva) {
            const remesaDia = caso === 'cobro' && tipo === 'variable' ? 21 : 10;
            st.ingresos.push({ id: 'remesa', nombre: 'Remesa de mamá', emoji: '💵', categoria: 'remesa', monto: m(100), aprox: true, frecuencia: 'mensual', dia: remesaDia, lugar: 'agricola', principal: false, extra: true, desde: inicio, creado: inicio, llegadas: {} });
            st.medios.push({ id: 'bac', nombre: 'Crédito BAC', emoji: '💳', tarjeta: 'bac' });
            st.tarjetas.push({ id: 'bac', nombre: 'Crédito BAC', apodo: largo ? 'La tarjeta de crédito de la casa grande' : 'La de la casa', emoji: '💳', tipo: 'tarjeta', corte: 15, pagoDia: 5, desfase: 1, cupo: m(1000), pagoUsual: m(100), desde: inicio, medio: 'debito',
                estados: [{ corte: '2026-10-15', total: m(120), minimo: m(25), aPagar: m(120), opcion: 'total', vence: '2026-11-05', anotado: 0, seq: 3 }] });
            const sem = tipo === 'semana';
            const pagos = [
                ['alquiler', 'Alquiler', '🏠', 'casa', 200, 1, 'transferencia'],
                ['luz', 'Luz', '💡', 'servicios', 35, 12, 'debito', { estimado: true }],
                ['agua', 'Agua', '💧', 'servicios', 12, 18, 'debito'],
                ['casacom', 'Casa comercial', '🛍️', 'cuotas', 35, 20, 'transferencia', { tipoDeuda: 'casacomercial', deuda: { debe: m(280) } }],
                ['internet', largo ? 'Internet y cable de la casa de la abuela Carmen' : 'Internet', '🌐', 'servicios', 25, sem ? 22 : 25, 'debito'],
                ['prestamo', largo ? 'Préstamo de la cooperativa San José de la Montaña' : 'Préstamo cooperativa', '🏦', 'cuotas', 50, sem ? 25 : 27, 'efectivo', { tipoDeuda: 'prestamo', deuda: { debe: m(500) } }],
            ];
            for (const [id, n, emoji, categoria, monto, dia, medio, extra] of pagos) st.pagos.push({ id, nombre: n, emoji, categoria, monto: m(monto), frecuencia: 'mensual', dia, medio, avisos: [], desde: inicio, creado: inicio, hechos: {}, previos: [], ...(extra || {}) });
            st.variables = [
                ['super', 'Súper', '🛒', 'super', 150, 'debito'],
                ['comida', largo ? 'Comida afuera con la familia los domingos' : 'Comida afuera', '🍽️', 'comida', 40, 'efectivo'],
                ['gasolina', 'Gasolina', '⛽', 'transporte', 60, 'efectivo'],
                ['farmacia', 'Farmacia', '💊', 'salud', 30, 'efectivo'],
                // «8 presupuestos» (solo en este ejemplo): para ver el carrusel con muchos.
                ...(caso === 'muchos' ? [['mercado', 'Mercado', '🧺', 'mercado', 80, 'efectivo'], ['salidas', 'Salidas', '🎉', 'salidas', 50, 'efectivo'], ['regalos', 'Regalos', '🎁', 'regalos', 40, 'efectivo'], ['mascota', 'Comida del perro', '🐶', 'mascotas', 30, 'efectivo']] : []),
            ].map(([id, n, emoji, categoria, tope, medio]) => ({ id, nombre: n, emoji, categoria, tope: e(tope), medio, desde: inicio, creado: inicio, cierres: {}, activo: true }));
            st.apartados = [
                { id: 'emerg', nombre: 'Emergencias', emoji: '🛟', portada: 'general-alcancia', monto: m(200), meta: null, metaFecha: null, historial: [{ fecha: inicio, tipo: 'inicial', monto: m(200) }], donde: { lugar: 'agricola' }, programado: { monto: e(25), desde: inicio } },
                { id: 'viaje', nombre: 'Viaje', emoji: '🏖️', portada: 'general-alcancia', monto: m(100), meta: null, metaFecha: null, historial: [{ fecha: inicio, tipo: 'inicial', monto: m(100) }], donde: 'aparte' },
            ];
        }
        P.st = st;
        // Día por día: lo que llegó y lo que pagó (antes de hoy), con las funciones de la app.
        for (let d = inicio; d < hoy; d = M.sumarDias(d, 1)) {
            st.hoy = d;
            for (const ing of st.ingresos) for (const o of M.ocurrenciasIngreso(st, ing, d, d)) if (o.estado !== 'llego') P.llegoIngreso(st, ing.id, d, { monto: o.monto, lugar: ing.lugar, fecha: d });
            for (const p of st.pagos) {
                if (caso === 'vencido' && p.id === 'luz') continue;
                for (const o of M.ocurrenciasPago(st, p, d, d)) if (o.estado === 'pendiente' || o.estado === 'vencido') P.marcarPagado(st, p.id, d, { monto: o.monto, medio: p.medio, fecha: d });
            }
            if (tipo === 'variable' && [1, 3, 5].includes(M.diaSemana(d))) P.registrar(st, { tipo: 'ingreso', fecha: d, monto: m(45), nombre: 'Venta', categoria: 'venta', emoji: '🫓', lugar: 'efectivo', anotado: true, nuevo: true });
        }
        st.hoy = hoy;
        if (!nueva) {
            // Lo que gastó en sus presupuestos en este periodo (los últimos días antes de hoy).
            const per = M.periodoPlan(st);
            const dia = (n) => {
                const x = M.sumarDias(hoy, -n);
                return x < per.inicio ? per.inicio : x > hoy ? hoy : x;
            };
            const gasto = (n, nombreG, categoria, monto, medio) => P.registrar(st, { tipo: 'gasto', fecha: dia(n), monto, nombre: nombreG, categoria, emoji: '🧾', medio, anotado: true, nuevo: true });
            gasto(4, 'Súper', 'super', e(60), 'debito');
            gasto(2, 'Súper', 'super', e(45), 'debito');
            gasto(3, largo ? st.variables[1].nombre : 'Pupusas', 'comida', e(30), 'efectivo');
            gasto(3, 'Gasolina', 'transporte', e(20), 'efectivo');
            gasto(1, 'Farmacia', 'salud', e(5), 'efectivo');
            gasto(2, 'Zapatos', 'ropa', m(45), 'bac');
            if (caso === 'pasado') gasto(1, 'Pizza', 'comida', e(25), 'efectivo');
            if (caso === 'muchos') {
                gasto(2, 'Mercado', 'mercado', e(70), 'efectivo');
                gasto(1, 'Salidas', 'salidas', e(55), 'efectivo');
                gasto(3, 'Regalos', 'regalos', e(10), 'efectivo');
            }
            // Libre en cero: un gasto grande deja lo que tienes $60 por debajo de lo que viene.
            if (caso === 'cero') {
                const k0 = M.calcular(st);
                const g = k0.tienes - k0.obligaciones + m(60);
                if (g > 0) gasto(1, 'Reparación del carro', 'otros', g, 'debito');
            }
        }
        st.registros.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.seq - b.seq));
        return st;
    }
})();
