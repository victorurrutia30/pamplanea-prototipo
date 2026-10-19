// Producto v2 · prototipo de teléfono. Arranque: barra inferior, casos, simulaciones, guardado en
// el navegador y mensajes con la guía (index.html). Solo (en el teléfono de quien prueba) recupera
// lo último que hizo; dentro de la guía, la guía decide qué caso abrir.
'use strict';
(() => {
    const D = window.DATOS;
    const M = window.MOTOR;
    const P = window.P;
    const c = D.c;
    // El formato de lo guardado es independiente de la versión visible: publicar una versión nueva
    // (v2.1, v2.2…) no borra lo que la persona ya hizo. Solo cambia si cambia la forma de los datos.
    const FORMATO = 2;
    const CLAVE_APP = 'pamplanea-proto-v2:app';

    // ------------------------------------------------------------------ guardado (try/catch: si falla, todo vive en memoria)
    const memoria = {};
    P.almacen = {
        disponible: (() => {
            try {
                localStorage.setItem('pamplanea-proto-v2:prueba', '1');
                localStorage.removeItem('pamplanea-proto-v2:prueba');
                return true;
            } catch {
                return false;
            }
        })(),
        leer(clave, defecto) {
            try {
                const v = localStorage.getItem(clave);
                return v === null ? (clave in memoria ? memoria[clave] : defecto) : JSON.parse(v);
            } catch {
                return clave in memoria ? memoria[clave] : defecto;
            }
        },
        escribir(clave, valor) {
            memoria[clave] = valor;
            try {
                localStorage.setItem(clave, JSON.stringify(valor));
                return true;
            } catch {
                return false;
            }
        },
        borrar(clave) {
            delete memoria[clave];
            try {
                localStorage.removeItem(clave);
            } catch {
                /* sin almacenamiento */
            }
        },
    };
    P.enGuia = (() => {
        try {
            return window.parent !== window;
        } catch {
            return true;
        }
    })();
    /** Mientras el arranque decide qué cargar no se guarda nada (no pisar lo guardado). */
    P.guardando = false;
    let guardarTimer = null;
    function guardarAhora() {
        if (!P.guardando || !P.st || P.sinGuardar) return;
        // Uso normal: sus datos van a su propio lugar (pamplanea-uso:v1), nunca al de los ejemplos.
        if (P.modo === 'uso') {
            if (P.modos) P.modos.guardarUso();
            return;
        }
        P.almacen.escribir(CLAVE_APP, { formato: FORMATO, caso: P.caso ? P.caso.id : null, persona: P.st.persona, tab: P.ui.tab, tema: P.tema, st: P.st });
    }
    P.guardarYa = guardarAhora;
    P.alRender = () => {
        clearTimeout(guardarTimer);
        guardarTimer = setTimeout(guardarAhora, 250);
    };
    window.addEventListener('pagehide', guardarAhora);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && guardarAhora());
    function restaurar(filtro = null) {
        const g = P.almacen.leer(CLAVE_APP, null);
        if (!g || g.formato !== FORMATO || !g.st || (filtro && !filtro(g))) return false;
        // Datos guardados por una versión anterior del prototipo: campos nuevos con su valor inicial.
        g.st.reservasTarjeta = g.st.reservasTarjeta || [];
        g.st.cerrados = g.st.cerrados || [];
        P.caso = g.caso ? P.buscarCaso(g.caso) || null : null;
        P.cargar(g.st, { tab: g.tab || 'hoy' });
        P.guardando = true;
        P.emitir('restaurado');
        return true;
    }
    P.borrarGuardado = () => P.almacen.borrar(CLAVE_APP);

    // ------------------------------------------------------------------ casos
    /** v2.4.1: los ejercicios de ingresos que varían parten de Rosa. */
    function rosaDeCaso(caso) {
        const st = D.crearRosa();
        if (caso.variante === 'semanaMala') {
            // P-SEMANA: vendió poco; al final del día contó $20 en efectivo.
            const r = { id: 'r' + st.seq, seq: st.seq++, tipo: 'cuadre', fecha: st.hoy, lugar: 'efectivo', monto: c('20'), esperado: c('110') };
            st.registros.push(r);
            st.lugares.find((l) => l.id === 'efectivo').cuadre = { fecha: r.fecha, seq: r.seq, monto: r.monto };
        }
        return st;
    }
    function estadoDeCaso(caso) {
        if (caso.persona === 'nueva') return D.crearNueva();
        if (caso.persona === 'carlos') return D.crearCarlos(caso.variante);
        if (caso.persona === 'rosa') return rosaDeCaso(caso);
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
        if (caso.variante === 'matricula') {
            // Ejercicio v2.4: la matrícula de enero, para pagarla con el aguinaldo (V2-52).
            st.pagos.push({ id: 'matricula', nombre: 'Matrícula', emoji: '🎒', categoria: 'educacion', monto: c('100'), estimado: false, frecuencia: 'unico', fecha: '2027-01-15', medio: 'transferencia', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-21', hechos: {}, previos: [] });
        }
        if (caso.variante === 'adelanto') {
            // Ejercicio v2.4: un adelanto de $200 que le descuentan de su quincena del 30.
            st.ingresos.push({ id: 'adelanto', nombre: 'Adelanto de salario', emoji: '💵', categoria: 'otro', monto: c('200'), aprox: false, frecuencia: 'unico', fecha: '2026-10-23', lugar: 'agricola', principal: false, extra: true, desde: '2026-10-21', llegadas: {} });
        }
        if (caso.variante === 'regalo') {
            // C30: un apartado para el regalo de mamá, cuya fecha (el 10) ya pasó.
            st.apartados.push({ id: 'regalo', nombre: 'Regalo', emoji: '🎁', portada: 'general-alcancia', monto: c('20'), meta: c('20'), metaFecha: '2026-10-10', historial: [{ fecha: '2026-09-30', tipo: 'apartar', monto: c('20') }] });
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
    /** Los 13 recorridos y los ejercicios que solo están en «Practicar» (v2.4). */
    P.buscarCaso = (id) => [...window.CASOS, ...(window.CASOS_PRACTICA || [])].find((x) => x.id === id);
    function cargarCaso(id, { tab = null } = {}) {
        const caso = P.buscarCaso(id);
        if (!caso) return;
        P.caso = caso;
        clearTimeout(bannerTimer);
        P.guardando = true;
        P.cargar(estadoDeCaso(caso), { tab: tab || caso.inicio || 'hoy' });
        if (BANNERS[id]) bannerTimer = setTimeout(() => P.notificar(BANNERS[id]), 900);
        P.emitir('caso:' + id);
    }
    function cargarPersona(persona) {
        P.caso = null;
        clearTimeout(bannerTimer);
        P.guardando = true;
        P.cargar(persona === 'carlos' ? D.crearCarlos() : persona === 'rosa' ? D.crearRosa() : D.crearAna(), { tab: 'hoy' });
        P.emitir('persona:' + persona);
    }
    function reiniciar() {
        if (P.caso) cargarCaso(P.caso.id);
        else cargarPersona(P.st && ['carlos', 'rosa'].includes(P.st.persona) ? P.st.persona : 'ana');
    }

    /** Lo que la guía (o las herramientas de Victor en «Ayuda») puede simular: el paso del tiempo y los avisos. */
    function simular(id) {
        const st = P.st;
        if (id === 'dia4') {
            const colegio = st.pagos.find((p) => M.normalizar(p.nombre) === 'colegio' && p.activo !== false);
            if (!colegio) {
                P.emitir('nota', { texto: 'Primero guarda el recordatorio del colegio (pasos 1 a 3).' });
                P.avisar('Primero apunta el pago del colegio', { check: false });
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
            if (st.hoy >= '2026-10-23') {
                P.avisar('Ya es viernes 23', { check: false });
                return;
            }
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
    Object.assign(P, { cargarCaso, cargarPersona, reiniciar, simular, restaurar });

    window.addEventListener('message', (e) => {
        const m = e.data;
        if (!m || m.fuente !== 'pamplanea-guia') return;
        if (m.tipo === 'tema') {
            P.aplicarTema(m.tema);
            if (P.ui && P.ui.hoja && P.ui.hoja.tipo === 'apariencia') P.render();
        }
        // La guía arranca: si lo guardado es del mismo caso (o la misma persona), se recupera.
        if (m.tipo === 'arrancar') {
            if (m.tema) P.aplicarTema(m.tema);
            const ok = restaurar((g) => (m.caso ? g.caso === m.caso : !g.caso && g.persona === m.persona));
            if (!ok) {
                if (m.caso) cargarCaso(m.caso);
                else cargarPersona(m.persona || 'ana');
            }
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
        // Para revisiones automáticas: #caso=C05&tema=ancla-oscuro (no guarda nada).
        const h = new URLSearchParams(location.hash.slice(1));
        const g = P.almacen.leer(CLAVE_APP, null);
        P.aplicarTema(h.get('tema') || (!P.enGuia && g && g.formato === FORMATO && g.tema) || 'serena-claro');
        if (h.get('caso') || h.get('persona')) {
            P.sinGuardar = true;
            if (h.get('caso')) cargarCaso(h.get('caso'));
            else cargarPersona(h.get('persona'));
        } else if (P.enGuia) {
            // Dibuja a Ana mientras la guía responde, sin guardar encima de lo guardado.
            P.caso = null;
            P.cargar(D.crearAna(), { tab: 'hoy' });
        } else if (P.modos) P.modos.arrancar();
        else if (!restaurar()) cargarPersona('ana');
        if (P.ayuda) P.ayuda.iniciar();
        if (P.practica) P.practica.iniciar();
        if (P.modos) P.modos.iniciar();
        try {
            if (P.enGuia) window.parent.postMessage({ fuente: 'pamplanea-proto', tipo: 'listo' }, '*');
        } catch {
            /* sin guía */
        }
    });
})();
