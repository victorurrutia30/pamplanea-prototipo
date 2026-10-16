// Producto v2 · prototipo de teléfono. Arranque: barra inferior, casos, simulaciones y
// mensajes con la guía (index.html). Abierto solo, carga a Ana en Serena claro.
'use strict';
(() => {
    const D = window.DATOS;
    const M = window.MOTOR;
    const P = window.P;
    const c = D.c;

    function estadoDeCaso(caso) {
        if (caso.persona === 'nueva') return D.crearNueva();
        if (caso.persona === 'carlos') return D.crearCarlos();
        if (caso.variante === 'planea') return D.crearAna('planea');
        const st = D.crearAna();
        if (caso.variante === 'sinColegio') {
            st.pagos = st.pagos.filter((p) => p.id !== 'colegio');
            st.registros = st.registros.filter((r) => r.pago !== 'colegio');
        }
        if (caso.variante === 'quincena') {
            st.hoy = '2026-10-30';
            st.avisos = [];
        }
        if (caso.variante === 'ausente') {
            st.hoy = '2026-11-06';
            st.avisos = [
                { id: 'av-a3', fecha: '2026-11-04', hora: '8:00 a. m.', emoji: '💳', titulo: 'Mañana vence Crédito BAC', texto: 'Por pagar $245.00.', accion: { tipo: 'tarjeta', id: 'bac' } },
                { id: 'av-a2', fecha: '2026-11-04', hora: '8:00 a. m.', emoji: '🎓', titulo: 'Mañana vence Colegio', texto: '$20.00 con Transferencia.', accion: { tipo: 'pago', id: 'colegio' } },
                { id: 'av-a1', fecha: '2026-10-30', hora: '8:00 a. m.', emoji: '💼', titulo: 'Hoy es tu quincena', texto: '¿Ya te cayó?', accion: { tipo: 'aldia' } },
                ...st.avisos,
            ];
        }
        return st;
    }

    const BANNERS = {
        C16: { emoji: '💳', titulo: 'Crédito BAC cortó el 15', texto: '¿Ya te llegó tu estado de cuenta? Dinos cuánto te salió.', accion: { tipo: 'hoja', hoja: 'estadoCuenta', datos: { id: 'bac' } }, clave: 'estado' },
        C19: { emoji: '💼', titulo: 'Hoy es tu quincena', texto: '¿Ya te cayó? Toca para repartirla.', accion: { tipo: 'hoja', hoja: 'ingresoLlego', datos: { id: 'quincena', fecha: '2026-10-30' } }, clave: 'quincena' },
        C26: { emoji: '👋', titulo: '¡Hola de nuevo!', texto: 'Pongámonos al día en un minuto.', accion: { tipo: 'aldia' }, clave: 'aldia' },
    };

    let bannerTimer = null;
    function cargarCaso(id) {
        const caso = window.CASOS.find((x) => x.id === id);
        if (!caso) return;
        P.caso = caso;
        clearTimeout(bannerTimer);
        P.cargar(estadoDeCaso(caso), { tab: caso.inicio || 'hoy' });
        if (BANNERS[id]) bannerTimer = setTimeout(() => P.notificar(BANNERS[id]), 900);
        P.emitir('caso:' + id);
    }
    function cargarPersona(persona) {
        P.caso = null;
        clearTimeout(bannerTimer);
        P.cargar(persona === 'carlos' ? D.crearCarlos() : D.crearAna(), { tab: 'hoy' });
        P.emitir('persona:' + persona);
    }
    function reiniciar() {
        if (P.caso) cargarCaso(P.caso.id);
        else cargarPersona(P.st.persona === 'carlos' ? 'carlos' : 'ana');
    }

    /** Lo que el panel de la guía puede simular: el paso del tiempo y los avisos. */
    function simular(id) {
        const st = P.st;
        if (id === 'dia4') {
            const colegio = st.pagos.find((p) => M.normalizar(p.nombre) === 'colegio' && p.activo !== false);
            if (!colegio) {
                P.emitir('nota', { texto: 'Primero guarda el recordatorio del colegio (pasos 1 a 3).' });
                return;
            }
            st.hoy = '2026-11-04';
            const q = M.ingreso(st, 'quincena');
            if (q && !q.llegadas['2026-10-30']) P.llegoIngreso(st, 'quincena', '2026-10-30', { monto: c('600'), lugar: 'agricola', fecha: '2026-10-30' });
            P.ui.stack = [];
            P.ui.tab = 'hoy';
            P.ui.hoja = null;
            P.render({ nueva: true });
            P.notificar({ emoji: '🎓', titulo: 'Mañana vence Colegio · ' + M.dinero(colegio.monto), texto: 'Toca para verlo y marcarlo Pagado cuando lo pagues.', accion: { tipo: 'pago', id: colegio.id }, clave: 'colegio' });
            P.emitir('sim:dia4');
            P.emitir('nota', { texto: 'Ahora es miércoles 4 de noviembre. Tu quincena del 30 ya llegó.' });
        }
        if (id === 'viernes') {
            st.hoy = '2026-10-23';
            P.ui.stack = [];
            P.ui.tab = 'hoy';
            P.ui.hoja = null;
            P.render({ nueva: true });
            P.notificar({ emoji: '💼', titulo: 'Hoy te pagan', texto: '¿Ya te cayó tu pago de la semana? Toca para repartirlo.', accion: { tipo: 'hoja', hoja: 'ingresoLlego', datos: { id: 'semana', fecha: '2026-10-23' } }, clave: 'semana' });
            P.emitir('sim:viernes');
            P.emitir('nota', { texto: 'Ahora es viernes 23 de octubre.' });
        }
    }
    P.cargarCaso = cargarCaso;
    P.cargarPersona = cargarPersona;
    P.simular = simular;

    window.addEventListener('message', (e) => {
        const m = e.data;
        if (!m || m.fuente !== 'pamplanea-guia') return;
        if (m.tipo === 'tema') {
            P.aplicarTema(m.tema);
            if (P.ui && P.ui.hoja && P.ui.hoja.tipo === 'apariencia') P.render();
        }
        if (m.tipo === 'caso') cargarCaso(m.id);
        if (m.tipo === 'persona') cargarPersona(m.persona);
        if (m.tipo === 'reiniciar') reiniciar();
        if (m.tipo === 'simular') simular(m.id);
    });

    window.addEventListener('DOMContentLoaded', () => {
        const { icon } = P;
        const nav = document.getElementById('nav');
        const enlace = (tab, ic, t) => `<button type="button" class="nav-l" data-a="tab" data-tab="${tab}" data-fk="nav-${tab}"><span class="nav-i">${icon(ic)}</span><span class="nav-t">${t}</span></button>`;
        nav.innerHTML = `${enlace('hoy', 'house', 'Hoy')}${enlace('pagos', 'calendar-clock', 'Pagos')}<button type="button" class="nav-mas" data-a="anotar" data-fk="nav-anotar" aria-label="Anotar" aria-haspopup="dialog"><span class="nav-circ">${icon('plus')}</span><span class="nav-t">Anotar</span></button>${enlace('midinero', 'wallet', 'Mi dinero')}${enlace('mes', 'chart-pie', 'Mes')}`;
        // Para revisiones automáticas: #caso=C05&tema=ancla-oscuro (Victor no lo necesita).
        const h = new URLSearchParams(location.hash.slice(1));
        P.aplicarTema(h.get('tema') || 'serena-claro');
        if (h.get('caso')) cargarCaso(h.get('caso'));
        else cargarPersona(h.get('persona') || 'ana');
        try {
            if (window.parent !== window) window.parent.postMessage({ fuente: 'pamplanea-proto', tipo: 'listo' }, '*');
        } catch {
            /* sin guía */
        }
    });
})();
