// Producto v2.2 · prototipo. Dos modos con datos SEPARADOS:
// - ENTRENAMIENTO: los ejemplos de Ana y Carlos (fecha simulada, casos, recorrido, prueba guiada).
// - USO NORMAL: los datos reales de la persona, con la fecha real del teléfono. Se guardan solo en
//   este navegador con un esquema versionado (pamplanea-uso:v1) y una migración: una versión nueva
//   nunca los borra. Copia en .json, restaurar y borrar. Avisos al abrir (sin servidor no hay
//   notificaciones). Registro de uso SIN montos ni nombres financieros y «Contarle a Victor».
// v2.6 (V2-62): «Cuéntale a Victor o a Pam cómo vas» dice antes del texto qué se manda y qué no (las dos listas
// salen de las mismas partes que arman el texto) y, si la hizo, trae la prueba guiada. Sin recordatorios.
// «Tus datos» y «Cuéntale…» también desde el modo entrenamiento (leen lo guardado; no tocan los ejemplos).
'use strict';
(() => {
    const P = window.P;
    const M = window.MOTOR;
    const D = window.DATOS;
    const { esc, icon } = P;
    const VERSION = window.VERSION_PROTOTIPO;
    const CLAVE_MODO = 'pamplanea-modo';
    const CLAVE_USO = 'pamplanea-uso:v1';
    const CLAVE_ENTRENAMIENTO = 'pamplanea-entrenamiento';
    /** Respaldo intacto de lo guardado antes de migrar (por si acaso: nunca se pierde nada). Se conserva tal cual. */
    const CLAVE_RESPALDO = 'pamplanea-uso:respaldo-esquema-1';
    /**
     * v2.7 (DATOS-1): una copia intacta POR VERSIÓN, antes de que esa versión cambie algo de lo guardado
     * (`pamplanea-uso:respaldo:antes-de-v2.7.0`), y otra antes de reemplazar tus datos con una copia
     * (`…:antes-de-restaurar-<fecha>`). Nunca se escribe encima de una que ya existe.
     */
    const PREFIJO_RESPALDO = 'pamplanea-uso:respaldo:';
    /** v2.6.4 (V2-79): un ejemplo que quedó guardado como tus datos (el error de la v2.6.3), apartado sin borrarlo. */
    const CLAVE_EJEMPLO = 'pamplanea-uso:ejemplo-guardado';
    const PERSONAS_EJEMPLO = new Set(['ana', 'carlos', 'rosa']);
    const ESQUEMA = 2;
    const $ = (s) => document.querySelector(s);
    const dinero = M.dinero;

    // ------------------------------------------------------------------ preferencias y fecha
    const pref = () => ({ modo: null, notaAvisos: false, ...(P.almacen.leer(CLAVE_MODO, null) || {}) });
    const guardarPref = (cambios) => P.almacen.escribir(CLAVE_MODO, { ...pref(), ...cambios });
    const entrenamiento = () => ({ tour: null, practicas: {}, ...(P.almacen.leer(CLAVE_ENTRENAMIENTO, null) || {}) });
    const guardarEntrenamiento = (cambios) => P.almacen.escribir(CLAVE_ENTRENAMIENTO, { ...entrenamiento(), ...cambios });
    /** v2.4: los consejos de la primera vez en cada pantalla (uso normal), una sola vez por pantalla y por teléfono. */
    const tipsVistos = () => pref().tips || {};
    const tipVisto = (pantalla) => guardarPref({ tips: { ...tipsVistos(), [pantalla]: true } });
    /** La fecha REAL del teléfono. `window.__fechaPrueba` solo lo ponen las pruebas automáticas. */
    const hoy = () => (typeof window.__fechaPrueba === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(window.__fechaPrueba) ? window.__fechaPrueba : M.hoyLocal());
    const instalada = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    P.modo = 'entrenamiento';

    // ------------------------------------------------------------------ datos de uso normal (esquema versionado)
    const metricasVacias = () => ({ dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false });
    const usoVacio = () => ({ esquema: ESQUEMA, creado: new Date().toISOString(), st: null, tab: 'hoy', tema: null, introVista: false, nombre: '', metricas: metricasVacias(), feedback: [], feedbackEnDias: 0, feedbackPospuesto: null, ultimaCopia: null });
    /**
     * Migración: recibe lo guardado (o una copia) de cualquier esquema conocido y lo lleva al actual.
     * Cuando cambie la forma de los datos: subir ESQUEMA y agregar aquí el paso «de N a N+1».
     */
    function migrarUso(obj) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
        const x = structuredClone(obj);
        if (!x.esquema) x.esquema = 1;
        if (typeof x.esquema !== 'number' || x.esquema > ESQUEMA) return null;
        if (x.esquema === 1) {
            migrarDe1a2(x);
            x.esquema = 2;
        }
        x.metricas = { ...metricasVacias(), ...(x.metricas || {}) };
        x.feedback = Array.isArray(x.feedback) ? x.feedback : [];
        if (x.st) {
            for (const k of ['lugares', 'medios', 'tarjetas', 'apartados', 'logros', 'pagos', 'ingresos', 'registros', 'avisos', 'reservasTarjeta', 'cerrados', 'reservas']) x.st[k] = Array.isArray(x.st[k]) ? x.st[k] : [];
            // v2.8 (C-3): los gastos variables (solo si ya los tiene: a lo de antes no se le agrega nada vacío).
            if (x.st.variables !== undefined && !Array.isArray(x.st.variables)) x.st.variables = [];
            // V2-79: un ejemplo guardado por error conserva su persona (así se reconoce y no se muestra como tuyo).
            if (!PERSONAS_EJEMPLO.has(x.st.persona)) x.st.persona = 'uso';
            // v2.7 (DATOS-3, F04): lo de antes queda en la cuenta donde aparece hoy.
            congelar(x.st);
        }
        return x;
    }
    /**
     * v2.6.4 (V2-79): ¿es un estado de los ejemplos y no los datos de la persona? Hasta la v2.6.3, cambiar de versión
     * en «Aprender a usarla» podía guardar a Rosa (o a Ana) encima de tus datos, y al reabrir se le ponía persona «uso».
     * Se reconoce por su persona, por la marca del recorrido o porque tiene el nombre Y los movimientos de un ejemplo
     * (una persona llamada Ana, con sus propios movimientos, no lo es).
     */
    function esDeEjemplo(st) {
        if (!st || typeof st !== 'object') return false;
        if (PERSONAS_EJEMPLO.has(st.persona) || st.recorrido) return true;
        const crear = { Ana: D.crearAna, Carlos: D.crearCarlos, Rosa: D.crearRosa }[st.nombre];
        if (!crear) return false;
        const firma = (r) => [r && r.tipo, r && r.fecha, r && r.monto, (r && r.nombre) || ''].join('|');
        const suyos = new Set((st.registros || []).map(firma));
        const base = crear().registros.map(firma);
        return base.length > 0 && base.filter((f) => suyos.has(f)).length >= Math.ceil(base.length * 0.6);
    }
    /**
     * Esquema 1 → 2 (Prototipo v2.3, V2-34 y V2-43). La historia empieza el día en que la persona
     * empezó a usar la app (su primer cuadre). Se quitan SOLO las llegadas que la app inventó sola
     * (las marcó `previa`) antes de ese día; la de ese mismo día queda como «ya estaba en tu primer
     * cuadre». Todo lo que la persona escribió (montos, nombres, pagos, ahorros, movimientos, cuadres,
     * respuestas) queda igual: el modelo nuevo solo agrega campos.
     */
    function migrarDe1a2(x) {
        const st = x.st;
        if (!st) return;
        const primeros = (st.registros || []).filter((r) => r && r.tipo === 'cuadre' && r.primero).map((r) => r.fecha).sort();
        const fechas = (st.registros || []).map((r) => r && r.fecha).filter(Boolean).sort();
        const creado = typeof x.creado === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x.creado) ? M.hoyLocal(new Date(x.creado)) : null;
        const inicio = st.inicio || primeros[0] || fechas[0] || creado || st.hoy || M.hoyLocal();
        st.inicio = inicio;
        let quitadas = 0;
        let delPrimerDia = 0;
        for (const ing of st.ingresos || []) {
            ing.llegadas = ing.llegadas && typeof ing.llegadas === 'object' ? ing.llegadas : {};
            for (const [f, l] of Object.entries(ing.llegadas)) {
                if (!l || !l.previa) continue;
                if (f < inicio) {
                    delete ing.llegadas[f];
                    quitadas++;
                } else {
                    ing.llegadas[f] = { monto: l.monto, enCuadre: true };
                    delPrimerDia++;
                }
            }
            if (ing.frecuencia !== 'unico' && (!ing.desde || ing.desde < inicio)) ing.desde = inicio;
        }
        for (const p of st.pagos || []) p.hechos = p.hechos && typeof p.hechos === 'object' ? p.hechos : {};
        x.migracion = { de: 1, a: 2, fecha: new Date().toISOString(), inicio, llegadasInventadasQuitadas: quitadas, llegadasDelPrimerDia: delPrimerDia };
    }
    /**
     * v2.7 (DATOS-3, F04): lo que la actualización congela. Cada gasto guarda la cuenta donde aparece hoy (la de su medio):
     * cambiar el medio después solo afecta lo nuevo. Solo se AGREGA ese dato a lo que no lo tiene; nada cambia de tipo
     * ni de nombre, y los saldos quedan iguales. Sirve también para lo que anote una pestaña con una versión anterior.
     */
    function congelar(st) {
        if (!st || !Array.isArray(st.registros)) return;
        for (const r of st.registros) if (r && r.tipo === 'gasto' && r.lugar === undefined) r.lugar = M.lugarGasto(st, r);
        // v2.8 (C-1): tus ahorros de antes pasan a «dentro de [tu cuenta]»: ya se restaban de tu libre, así que no cambia.
        // Solo se agrega dónde están (el banco con más dinero; si no hay banco, la cuenta con más). Nada cambia de nombre.
        // «No asumir» (APROBADO por Victor, 2026-10-22): esa cuenta queda como supuesta (`supuesto`) y Hoy pregunta una vez.
        if (Array.isArray(st.apartados) && Array.isArray(st.lugares)) {
            let cuenta;
            for (const a of st.apartados) {
                if (!a || typeof a !== 'object' || a.donde !== undefined) continue;
                if (cuenta === undefined) cuenta = st.lugares.length ? M.cuentaAhorros({ ...st, registros: st.registros }) : null;
                a.donde = { lugar: cuenta, supuesto: true };
            }
        }
    }

    // ------------------------------------------------------------------ v2.7 (DATOS-1, DATOS-2): versiones y copias
    /** «Prototipo v2.6.7 · 2026-10-19» → [2, 6, 7] (null si no dice). */
    const numVersion = (v) => {
        const m = /v(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(v || ''));
        return m ? [+m[1], +m[2], +(m[3] || 0)] : null;
    };
    const cmpVersion = (a, b) => {
        for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
        return 0;
    };
    const VERSION_N = numVersion(VERSION) || [0, 0, 0];
    /** «v2.7.0»: para el nombre de las copias (no se le muestra a la persona). */
    const VERSION_CORTA = 'v' + VERSION_N.join('.');
    /** ¿Lo guardó una versión más nueva que esta? */
    const versionMasNueva = (v) => !!numVersion(v) && cmpVersion(numVersion(v), VERSION_N) > 0;
    /** ¿Lo guardó una versión anterior a la v2.7 (o una que todavía no anotaba su versión)? */
    const anteriorA27 = (v) => !numVersion(v) || cmpVersion(numVersion(v), [2, 7, 0]) < 0;
    /** v2.8: ¿lo guardó una versión anterior a la v2.8? */
    const anteriorA28 = (v) => !numVersion(v) || cmpVersion(numVersion(v), [2, 8, 0]) < 0;
    /**
     * v2.7 (DATOS-2, F20): ¿se puede usar? `estricto` (al restaurar una copia): la forma de cada cosa, sus montos en
     * centavos enteros, sus fechas y que lo que se nombra exista. Siempre: calcular en una copia aparte, antes de escribir
     * nada. Devuelve el problema o null.
     */
    function problemaDatos(st, { estricto = false } = {}) {
        if (!st) return null;
        if (typeof st !== 'object' || Array.isArray(st)) return 'estado';
        const iso = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
        const cent = (x) => Number.isInteger(x);
        const centONulo = (x) => x === null || x === undefined || Number.isInteger(x);
        const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
        if (estricto) {
            for (const k of ['lugares', 'medios', 'tarjetas', 'apartados', 'pagos', 'ingresos', 'registros']) if (!Array.isArray(st[k])) return k;
            const ids = (lista) => new Set(lista.filter(obj).map((x) => x.id));
            const lugares = ids(st.lugares);
            const tarjetas = ids(st.tarjetas);
            if (st.lugares.some((l) => !obj(l) || typeof l.id !== 'string' || (l.cuadre && (!iso(l.cuadre.fecha) || !cent(l.cuadre.monto))))) return 'lugares';
            if (st.medios.some((m) => !obj(m) || typeof m.id !== 'string' || (m.lugar && !lugares.has(m.lugar)) || (m.tarjeta && !tarjetas.has(m.tarjeta)))) return 'medios';
            if (st.tarjetas.some((t) => !obj(t) || typeof t.id !== 'string' || !Array.isArray(t.estados) || !t.estados.length || t.estados.some((e) => !obj(e) || !iso(e.vence) || (e.corte !== null && !iso(e.corte)) || !cent(e.total) || !cent(e.aPagar)))) return 'tarjetas';
            if (st.apartados.some((a) => !obj(a) || typeof a.id !== 'string' || !cent(a.monto))) return 'apartados';
            if (st.pagos.some((p) => !obj(p) || typeof p.id !== 'string' || !centONulo(p.monto) || !obj(p.hechos))) return 'pagos';
            if (st.ingresos.some((i) => !obj(i) || typeof i.id !== 'string' || !centONulo(i.monto) || !obj(i.llegadas) || (i.lugar && !lugares.has(i.lugar)))) return 'ingresos';
            if (st.registros.some((r) => !obj(r) || typeof r.tipo !== 'string' || !iso(r.fecha) || !cent(r.monto))) return 'registros';
            // v2.8 (C-3): los gastos variables, con su tope en centavos enteros.
            if (st.variables !== undefined && (!Array.isArray(st.variables) || st.variables.some((v) => !obj(v) || typeof v.id !== 'string' || !cent(v.tope)))) return 'variables';
        }
        if (!st.configurado) return null;
        try {
            const x = structuredClone(st);
            x.hoy = hoy();
            const [y, m] = M.partes(x.hoy);
            M.calcular(x);
            M.resumenMes(x, y, m);
            M.pagosDelMes(x, y, m);
            M.ocurrenciasTarjeta(x, M.sumarDias(x.hoy, -62), M.sumarDias(x.hoy, 62));
            M.antesDeEmpezar(x);
        } catch {
            return 'calculo';
        }
        return null;
    }
    /**
     * v2.7 (DATOS-2, A04): lo guardado como tus datos, sin confundir tres cosas: no hay nada (`vacio`), no se puede leer
     * (`danado`) o lo guardó una versión más nueva (`nueva`). En los dos últimos no se escribe nada y nunca se empieza de
     * cero: «Tus datos están a salvo». La lectura se recuerda mientras lo guardado no cambie.
     */
    let lecturaPrevia = null;
    function leerGuardado() {
        const texto = P.almacen.leerTexto(CLAVE_USO);
        if (lecturaPrevia && lecturaPrevia.texto === texto) return lecturaPrevia;
        let g;
        if (texto === null) g = { estado: 'vacio', texto };
        else {
            let crudo = null;
            try {
                crudo = JSON.parse(texto);
            } catch {
                crudo = undefined;
            }
            if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) g = { estado: 'danado', texto };
            else if ((typeof crudo.esquema === 'number' && crudo.esquema > ESQUEMA) || versionMasNueva(crudo.version)) g = { estado: 'nueva', texto, crudo };
            else {
                let u = null;
                try {
                    u = migrarUso(crudo);
                } catch {
                    u = null;
                }
                g = !u || problemaDatos(u.st) ? { estado: 'danado', texto, crudo } : { estado: 'ok', texto, crudo, uso: u };
            }
        }
        lecturaPrevia = g;
        return g;
    }
    /** v2.7 (DATOS-2): lo guardado no se puede usar en esta versión: { estado: 'danado' | 'nueva', texto }. Mientras tanto no se escribe nada. */
    let bloqueo = null;
    /**
     * v2.7 (DATOS-1): guarda `valor` en una clave nueva de copias. Si no hay espacio, deja la original (la más vieja) y las
     * 2 más recientes y vuelve a intentar; si aun así no se puede, lo avisa (no falla).
     */
    let copiaFallo = false;
    function guardarCopiaInterna(clave, valor) {
        if (P.almacen.leerTexto(clave) !== null) return true;
        if (P.almacen.escribir(clave, valor)) return true;
        const fecha = (k) => {
            const c = P.almacen.leer(k, null);
            return String((c && (c.fecha || c.actualizado || c.creado)) || '');
        };
        const copias = [...P.almacen.claves(PREFIJO_RESPALDO), ...(P.almacen.leerTexto(CLAVE_RESPALDO) !== null ? [CLAVE_RESPALDO] : [])].filter((k) => k !== clave);
        const orden = copias.map((k) => ({ k, f: k === CLAVE_RESPALDO ? '' : fecha(k) })).sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
        const quedan = new Set([orden[0], ...orden.slice(-2)].filter(Boolean).map((x) => x.k));
        for (const x of orden) if (!quedan.has(x.k)) P.almacen.borrar(x.k);
        if (P.almacen.escribir(clave, valor)) return true;
        copiaFallo = true;
        console.warn('PamPlanea: no hubo espacio para la copia interna ' + clave);
        return false;
    }
    /** v2.7 (DATOS-1): antes de que esta versión cambie algo, la copia intacta de lo guardado por la anterior. */
    function respaldarVersion(crudo) {
        guardarCopiaInterna(PREFIJO_RESPALDO + 'antes-de-' + VERSION_CORTA, { fecha: new Date().toISOString(), de: crudo.version || null, para: VERSION, datos: crudo });
    }
    /** v2.7 (DATOS-2): antes de reemplazar tus datos con una copia, lo que había (aunque no se pudiera leer). */
    function respaldarAntesDeReemplazar() {
        const texto = P.almacen.leerTexto(CLAVE_USO);
        if (texto === null) return;
        let datos = null;
        try {
            datos = JSON.parse(texto);
        } catch {
            datos = null;
        }
        guardarCopiaInterna(PREFIJO_RESPALDO + 'antes-de-restaurar-' + new Date().toISOString(), { fecha: new Date().toISOString(), de: (datos && datos.version) || null, para: VERSION, ...(datos ? { datos } : { texto }) });
    }

    // ------------------------------------------------------------------ v2.7 (DATOS-4): los números antes y después
    /**
     * El Mes actual, lo que debes de cada tarjeta y tu libre, con las reglas de antes o las de ahora. `reglas`: true o
     * '2.6.7' (como la v2.6.7), '2.7' (como la v2.7: la tarjeta y los cobros con tarjeta de antes de la v2.8) o nada (ahora).
     */
    function numerosVisibles(st, reglas) {
        const x = structuredClone(st);
        x.hoy = hoy();
        const [y, m] = M.partes(x.hoy);
        const opts = reglas === '2.7' ? { antes27: true } : reglas ? { comoAntes: true } : {};
        const mes = M.resumenMes(x, y, m, { comoAntes: !!opts.comoAntes });
        return {
            mes: { y, m, salio: mes.salio, entro: mes.entro },
            tarjetas: x.tarjetas.map((t) => {
                const info = M.tarjetaInfo(x, t, null, opts);
                return { id: t.id, nombre: t.nombre, debe: info.debeHoy !== null ? info.debeHoy : info.debeTotal };
            }),
            libre: M.calcular(x, opts).libre,
        };
    }
    /**
     * v2.7 (DATOS-4, Parte D): la primera vez que esta versión abre datos ya configurados de una anterior, se calculan los
     * números antes y después de actualizar. Lo que cambió (porque estaba mal) va en el cuadrito de novedades.
     */
    function prepararNovedades(u, crudo) {
        if (!u.st || !u.st.configurado || u.st.persona !== 'uso' || esDeEjemplo(u.st) || !anteriorA28(crudo.version) || (u.novedades && u.novedades['v2.8'])) return;
        // v2.8: los números de antes son los de la versión que los guardó (la v2.7, o la v2.6.7 y anteriores).
        const de27 = !anteriorA27(crudo.version);
        let antes = null;
        let despues = null;
        try {
            antes = numerosVisibles(u.st, de27 ? '2.7' : '2.6.7');
            despues = numerosVisibles(u.st, null);
        } catch {
            antes = despues = null;
        }
        // Quien viene de antes de la v2.7 ve un solo cuadrito (el de ahora), con lo de la v2.7 que le toque.
        const v27 = u.novedades && u.novedades['v2.7'];
        const pendiente27 = !de27 && !(v27 && v27.visto);
        u.novedades = { ...(u.novedades || {}), 'v2.8': { fecha: new Date().toISOString(), antes, despues, visto: null, de: crudo.version || null, con27: pendiente27 } };
    }

    let uso = null;
    /** v2.6.1 (QA H-01): otra pestaña (o Safari y la app instalada a la vez) guardó tus datos y aquí todavía no se cargan. */
    let deOtra = false;
    function leerUso() {
        const g = leerGuardado();
        if (g.estado === 'vacio') {
            bloqueo = null;
            return usoVacio();
        }
        if (g.estado !== 'ok') {
            // v2.7 (DATOS-2): no se puede usar; se devuelve uno vacío que NUNCA se escribe (guardarUso y los demás lo revisan).
            bloqueo = { estado: g.estado, texto: g.texto };
            return usoVacio();
        }
        bloqueo = null;
        const crudo = g.crudo;
        // Antes de migrar, se guarda una copia intacta (la del esquema 1, una sola vez; se conserva).
        if ((!crudo.esquema || crudo.esquema < ESQUEMA) && P.almacen.leerTexto(CLAVE_RESPALDO) === null) P.almacen.escribir(CLAVE_RESPALDO, crudo);
        // v2.7 (DATOS-1): y una por versión, antes de que esta versión guarde algo encima.
        if (crudo.version !== VERSION) respaldarVersion(crudo);
        // DATOS-4: los números antes y después se calculan una vez por cada cosa guardada.
        if (g.novedades === undefined) {
            const tmp = structuredClone(g.uso);
            prepararNovedades(tmp, crudo);
            g.novedades = tmp.novedades || null;
        }
        const u = structuredClone(g.uso);
        if (g.novedades) u.novedades = structuredClone(g.novedades);
        return u;
    }
    /** v2.6: lo de «Usarla con mis datos»; desde el modo entrenamiento se lee de lo guardado (los ejemplos no se tocan). */
    const usoGuardado = () => (P.modo === 'uso' && uso ? uso : leerUso());
    /** Cambios chicos a lo guardado (el nombre de «Cuéntale…», la fecha de la última copia) desde cualquiera de los dos modos. */
    function cambiarUsoGuardado(cambios) {
        if (P.modo === 'uso' && uso) {
            Object.assign(uso, cambios);
            guardarUso();
            return;
        }
        const u = leerUso();
        // v2.7 (DATOS-2): lo guardado que no se puede leer no se toca.
        if (bloqueo) return;
        Object.assign(u, cambios, { version: VERSION });
        P.almacen.escribir(CLAVE_USO, u);
        if (uso) Object.assign(uso, cambios);
    }
    const tieneDatos = () => {
        const u = usoGuardado();
        return !!(u.st && u.st.configurado);
    };
    /** V2-79: ¿ya usa sus datos? (los configuró o empezó su Primer día). Entonces salir del entrenamiento lleva a ellos. */
    const hayDatos = () => {
        const u = usoGuardado();
        return !!(u.st && !esDeEjemplo(u.st) && (u.st.configurado || u.ob));
    };
    /** V2-79: lo que el candado detuvo (en memoria y en la consola, como error). */
    const errores = [];
    function candado() {
        errores.push({ que: 'ejemplo-en-tus-datos', persona: P.st.persona, fecha: new Date().toISOString() });
        console.error('PamPlanea: candado — se intentó guardar un estado de ejemplo (' + P.st.persona + ') como tus datos; no se guardó.');
        // Lo que está en pantalla son ejemplos: la app lo dice (y arriba, «Mis datos» vuelve a lo tuyo).
        P.modo = 'entrenamiento';
        guardarPref({ modo: 'entrenamiento' });
        pintarAviso();
        P.emitir('error:candado');
    }
    function guardarUso() {
        // Con datos más nuevos de otra pestaña sin cargar, esta no escribe encima (se cargan primero). v2.7 (DATOS-2): con
        // lo guardado que no se puede leer (dañado o de una versión más nueva), tampoco: nunca se empieza de cero.
        if (!uso || deOtra || bloqueo) return;
        if (P.modo === 'uso' && P.st) {
            // V2-79, candado: un estado de ejemplo NUNCA se escribe en tus datos (ni nada más de esta vez).
            if (P.st.persona !== 'uso') return candado();
            uso.st = P.st;
            // Nombres que la persona ha usado (aunque luego los borre): solo sirven para taparlos en «Cuéntale a Victor o a Pam».
            recordarNombres();
        }
        if (P.ui) uso.tab = P.ui.tab;
        // V2-68: el Primer día a medias se retoma donde ibas.
        if (P.modo === 'uso' && P.ui) {
            if (P.ui.ob && P.st && !P.st.configurado) uso.ob = P.ui.ob;
            else delete uso.ob;
        }
        uso.tema = P.tema;
        uso.actualizado = new Date().toISOString();
        // v2.7 (DATOS-1, DATOS-2): qué versión lo guardó (para la copia por versión y para no leerlo con una más vieja).
        uso.version = VERSION;
        P.almacen.escribir(CLAVE_USO, uso);
        // V2-74: con datos reales, una vez por sesión, se pide al navegador que no los borre solo.
        if (!pidioPersistencia && P.modo === 'uso' && P.st && P.st.configurado && P.ayuda && P.ayuda.pedirPersistencia) {
            pidioPersistencia = true;
            P.ayuda.pedirPersistencia();
        }
    }
    let pidioPersistencia = false;
    function estadoNuevo() {
        const st = D.crearNueva();
        Object.assign(st, { persona: 'uso', hoy: hoy(), avisos: [] });
        return st;
    }

    // ------------------------------------------------------------------ v2.6.4 (V2-79): recuperar a quien ya cayó en el error
    /** Aparta (sin borrar) el ejemplo que quedó como tus datos; tus datos quedan vacíos hasta recuperar una copia o empezar. */
    function apartarEjemplo() {
        P.almacen.escribir(CLAVE_EJEMPLO, { fecha: new Date().toISOString(), persona: uso.st.persona, st: uso.st, resuelto: false });
        errores.push({ que: 'ejemplo-guardado-encontrado', persona: uso.st.persona, fecha: new Date().toISOString() });
        uso.st = null;
        delete uso.ob;
    }
    /** ¿Hay que preguntar qué hacer? Hasta que elija (o arme sus datos de nuevo). */
    function infoRecuperar() {
        const e = P.almacen.leer(CLAVE_EJEMPLO, null);
        if (!e || e.resuelto) return null;
        const u = usoGuardado();
        if (u.st && u.st.configurado) return null;
        const r = P.almacen.leer(CLAVE_RESPALDO, null);
        const fechaR = r && r.st && !esDeEjemplo(r.st) ? String(r.actualizado || r.creado || '').slice(0, 10) : '';
        return { de: (e.st && e.st.nombre) || '', respaldo: /^\d{4}-\d{2}-\d{2}$/.test(fechaR) ? fechaR : null, copia: u.ultimaCopia ? String(u.ultimaCopia).slice(0, 10) : null };
    }
    const resolverEjemplo = () => {
        const e = P.almacen.leer(CLAVE_EJEMPLO, null);
        if (e && !e.resuelto) P.almacen.escribir(CLAVE_EJEMPLO, { ...e, resuelto: true });
    };
    let listo = false;

    // ------------------------------------------------------------------ entrar a cada modo
    function entrarUso({ abrirIntro = true } = {}) {
        P.guardarYa && P.modo === 'entrenamiento' && P.guardarYa();
        // V2-79: el entrenamiento no sigue vivo debajo de tus datos (los ejemplos vuelven a como estaban).
        if (P.tour && P.tour.activo) P.tour.terminar({ avisar: false });
        P.modo = 'uso';
        P.caso = null;
        if (P.ayuda && P.ayuda.salirDePrueba) P.ayuda.salirDePrueba();
        if (P.practica) P.practica.salir();
        uso = leerUso();
        // v2.7 (DATOS-2): lo guardado no se puede leer en esta versión: «Tus datos están a salvo», sin escribir nada.
        if (bloqueo) return entrarBloqueado();
        // V2-79: si lo guardado como tus datos es en realidad un ejemplo, no se muestra como tuyo.
        if (uso.st && esDeEjemplo(uso.st)) apartarEjemplo();
        const st = uso.st || estadoNuevo();
        st.hoy = hoy();
        P.guardando = true;
        // Cada vez que se abre, empieza en Hoy: ahí están los avisos del día.
        P.cargar(st, { tab: 'hoy' });
        if (!st.configurado && uso.ob && uso.ob.datos) {
            P.ui.ob = { ...uso.ob, datos: { ...P.obVacio(), ...uso.ob.datos } };
            P.render({ nueva: true });
        }
        if (uso.tema) P.aplicarTema(uso.tema);
        registrarDia();
        pintarAviso();
        guardarPref({ modo: 'uso' });
        guardarUso();
        if (listo && infoRecuperar()) P.ayuda.abrir('recuperar');
        else if (abrirIntro && !uso.introVista) P.ayuda.abrir('introUso');
        else if (listo) abrirNovedades();
    }
    // ------------------------------------------------------------------ v2.7 (Parte D): el cuadrito de novedades
    /**
     * APROBADO por Victor (2026-10-21): «les saldrá un cuadrito de una vez nada más explicando súper friendly el update,
     * solo lo importante que deban saber, nada techy». Sale UNA vez, al abrir con sus datos de antes (no a quien empieza
     * de cero ni con los ejemplos). Hasta 5 líneas de 20 palabras o menos, solo las que le tocan a esa persona; si al
     * actualizar cambió un número porque estaba mal (DATOS-4), una línea lo dice, sin culpa.
     */
    const palabras = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
    /**
     * v2.8: la línea de los números que cambiaron, con antes y después (una sola, sin culpa). Primero tu libre, luego el
     * gasto del mes y luego lo que debes de cada tarjeta; si cambió más de uno, los que quepan en 20 palabras.
     */
    function lineaCorreccion(n, st) {
        if (!n || !n.antes || !n.despues) return null;
        const cambios = [];
        const { antes, despues } = n;
        if (antes.libre !== despues.libre) cambios.push({ que: 'tu libre', antes: antes.libre, monto: despues.libre });
        if (antes.mes.salio !== despues.mes.salio) cambios.push({ que: `tu gasto de ${M.MESES[despues.mes.m - 1]}`, antes: antes.mes.salio, monto: despues.mes.salio });
        for (const t of despues.tarjetas) {
            const a = antes.tarjetas.find((x) => x.id === t.id);
            if (a && a.debe !== t.debe) cambios.push({ que: `lo que debes de ${(st.tarjetas.find((x) => x.id === t.id) || t).nombre}`, antes: a.debe, monto: t.debe });
        }
        if (!cambios.length) return null;
        const uno = (c) => `${M.capital(c.que)} era ${dinero(c.antes)} y ahora es ${dinero(c.monto)}.`;
        if (cambios.length === 1) return uno(cambios[0]);
        for (let i = cambios.length; i > 1; i--) {
            const resto = cambios.slice(1, i).map((c) => `${c.que}, ${dinero(c.monto)}`);
            const t = `${M.capital(cambios[0].que)} era ${dinero(cambios[0].antes)} y ahora es ${dinero(cambios[0].monto)}; ${resto.join('; ')}.`;
            if (palabras(t) <= 20) return t;
        }
        return uno(cambios[0]);
    }
    /**
     * APROBADO por Victor (2026-10-22, brief v2.8): las líneas del cuadrito para esta persona, cada una con 20 palabras o
     * menos y a lo más 5 con el cierre. Quien viene de antes de la v2.7 ve también lo de la v2.7 que le toque, si cabe.
     */
    function lineasNovedades(u) {
        const st = u.st;
        const n = u.novedades && u.novedades['v2.8'];
        const lineas = ['Pagos ahora se llama Mi plan: ahí ves lo que viene.'];
        if (st.apartados.length) lineas.push('Tus ahorros ya no se mezclan con lo que puedes gastar.');
        lineas.push('El súper y la gasolina pueden ser gastos variables.');
        const correccion = lineaCorreccion(n, st);
        if (n && n.con27) {
            const de27 = [];
            if (st.pagos.some((p) => p.activo !== false)) de27.push('Si pagas parte de una cuota, te mostramos cuánto falta.');
            if (st.tarjetas.length) de27.push('Tus abonos a la tarjeta ahora bajan lo que debes.');
            de27.push('Ya puedes anotar montos grandes, como 1,200.');
            for (const l of de27) if (lineas.length < (correccion ? 3 : 4)) lineas.push(l);
        }
        if (correccion) lineas.push(correccion);
        // Con el cierre, 5 líneas como mucho.
        return lineas.slice(0, 4);
    }
    const NOV_TITULO = '¡PamPlanea está más clara! ✨';
    const NOV_CIERRE = 'Tus datos están completos y a salvo.';
    let novPrevio = null;
    function novedadesPendientes() {
        if (P.modo !== 'uso' || bloqueo || !uso || !uso.st || !uso.st.configurado || uso.st.persona !== 'uso') return false;
        const n = uso.novedades && uso.novedades['v2.8'];
        return !!n && !n.visto;
    }
    function abrirNovedades() {
        if (!novedadesPendientes() || document.getElementById('nov-t')) return;
        // Después de lo que ya esté abierto (Ayuda o una hoja), no encima.
        if ((P.ayuda && P.ayuda.abierto) || (P.ui && P.ui.hoja)) return;
        const lineas = lineasNovedades(uso);
        novPrevio = document.activeElement;
        const capa = Object.assign(document.createElement('div'), { id: 'capa-novedades', className: 'capa-novedades' });
        capa.innerHTML = `<div class="nov-fondo"></div><section class="nov" role="dialog" aria-modal="true" aria-labelledby="nov-t" aria-describedby="nov-x">
            <h2 class="nov-t" id="nov-t" tabindex="-1">${esc(NOV_TITULO)}</h2>
            <ul class="nov-lista" id="nov-x">${lineas.map((l) => `<li>${icon('check', 'ico-xs')}<span>${esc(l)}</span></li>`).join('')}</ul>
            <p class="nov-cierre">${esc(NOV_CIERRE)}</p>
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="novedadesOk" data-fk="nov-ok">¡Entendido!</button>
        </section>`;
        document.getElementById('app').appendChild(capa);
        for (const id of ['vista', 'nav', 'aviso-proto', 'capa-hoja', 'capa-banner', 'capa-toast', 'tarea-bar']) {
            const el = document.getElementById(id);
            if (el) el.inert = true;
        }
        document.querySelector('[data-fk="nov-ok"]').focus({ preventScroll: true });
        P.emitir('novedades:abierto');
    }
    function cerrarNovedades() {
        const capa = document.getElementById('capa-novedades');
        if (!capa) return;
        capa.remove();
        for (const id of ['vista', 'nav', 'aviso-proto', 'capa-hoja', 'capa-banner', 'capa-toast', 'tarea-bar']) {
            const el = document.getElementById(id);
            if (el) el.inert = ['vista', 'nav'].includes(id) && !!(P.ui && P.ui.hoja);
        }
        // Una sola vez: queda guardado con tus datos (al recargar no vuelve). Si traía lo de la v2.7, también queda visto.
        if (uso && uso.novedades && uso.novedades['v2.8']) {
            const ahora = new Date().toISOString();
            uso.novedades['v2.8'].visto = ahora;
            if (uso.novedades['v2.8'].con27) uso.novedades['v2.7'] = { ...(uso.novedades['v2.7'] || {}), visto: ahora, enV28: true };
        }
        guardarUso();
        const el = novPrevio && novPrevio.isConnected ? novPrevio : document.querySelector('#pantalla h1');
        if (el) el.focus({ preventScroll: true });
        novPrevio = null;
        P.emitir('novedades:cerrado');
    }
    P.acciones.novedadesOk = () => cerrarNovedades();
    // Con el cuadrito abierto: Escape lo cierra y Tab no sale de él (antes que Ayuda y las hojas).
    window.addEventListener(
        'keydown',
        (e) => {
            if (!document.getElementById('capa-novedades') || (e.key !== 'Escape' && e.key !== 'Tab')) return;
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') return cerrarNovedades();
            document.querySelector('[data-fk="nov-ok"]').focus({ preventScroll: true });
        },
        true,
    );
    /**
     * v2.7 (DATOS-2): con lo guardado dañado o de una versión más nueva, la app muestra «Tus datos están a salvo» con
     * las formas de recuperarlos. `uso` queda vacío y NUNCA se guarda (guardarUso lo revisa); lo de abajo no se ve.
     */
    function entrarBloqueado() {
        uso = null;
        P.modo = 'uso';
        const st = estadoNuevo();
        st.configurado = true;
        P.guardando = true;
        P.cargar(st, { tab: 'hoy' });
        if (P.ayuda && P.ayuda.abierto) P.ayuda.cerrar({ foco: false });
        pintarAviso();
        guardarPref({ modo: 'uso' });
        P.render({ nueva: true });
        P.emitir('datos:aSalvo:' + bloqueo.estado);
    }
    /**
     * V2-79: solo cambia al modo entrenamiento, sin cargar nada (quien llama carga el ejemplo enseguida). Tus datos se
     * guardan antes tal como están.
     */
    function dejarTusDatos() {
        if (P.modo !== 'uso') return;
        guardarUso();
        P.modo = 'entrenamiento';
        guardarPref({ modo: 'entrenamiento' });
        pintarAviso();
    }
    function entrarEntrenamiento({ tour = false } = {}) {
        dejarTusDatos();
        P.modo = 'entrenamiento';
        guardarPref({ modo: 'entrenamiento' });
        // El recorrido decide qué cargar (empezar de cero o retomar donde se quedó).
        if (!tour && !P.restaurar()) P.cargarPersona('ana');
        pintarAviso();
        if (tour && P.tour) P.tour.empezar();
        else if (tour) P.cargarPersona('ana');
    }
    /**
     * Al cargar la página (fuera de la guía): el modo elegido o, la primera vez, la bienvenida. Abre donde la dejaste:
     * en el entrenamiento, arriba, «Mis datos» vuelve a lo tuyo con un toque (V2-79). Si lo guardado como tus datos
     * es un ejemplo (el error de la v2.6.3), abre en tus datos para ayudarte a recuperarlos.
     */
    function arrancar() {
        const p = pref();
        if (p.modo === 'uso' || (p.modo === 'entrenamiento' && (esDeEjemplo(usoGuardado().st) || infoRecuperar()))) return entrarUso({ abrirIntro: false });
        P.modo = 'entrenamiento';
        if (p.modo !== 'entrenamiento') {
            P.cargarPersona('ana');
            A.elegir = true;
            return;
        }
        if (!P.restaurar()) P.cargarPersona('ana');
    }
    /** Si cambió el día con la app abierta (o al volver a ella), la fecha real se pone al día. */
    function alVolver() {
        if (P.modo !== 'uso' || !P.st) return;
        const h = hoy();
        if (P.st.hoy !== h) {
            P.st.hoy = h;
            // Día nuevo: si no está a media acción, vuelve a Hoy (ahí están los avisos del día).
            if (!P.ui.hoja && P.irTab) P.irTab('hoy');
            else P.render({ nueva: true });
        }
        registrarDia();
        guardarUso();
    }
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && alVolver());

    // ------------------------------------------------------------------ v2.6.1 (QA H-01): la app abierta dos veces
    /**
     * Lo que guarda una pestaña se carga en la otra antes de seguir, para que ninguna pise lo de la otra. Con una hoja o
     * «Ayuda» abiertas se espera: se carga al cerrarlas o justo antes de guardar lo siguiente (P.antesDeCambiar).
     */
    window.addEventListener('storage', (e) => {
        if (e.key !== CLAVE_USO) return;
        if (P.modo !== 'uso') {
            uso = null;
            return;
        }
        deOtra = true;
        if (!P.ui.hoja && !(P.ayuda && P.ayuda.abierto)) sincronizar();
    });
    function sincronizar() {
        if (!deOtra || P.modo !== 'uso') return;
        deOtra = false;
        uso = leerUso();
        // v2.7 (DATOS-2): otra pestaña con una versión más nueva guardó tus datos (o quedaron dañados): no se pisa nada.
        if (bloqueo) return entrarBloqueado();
        // V2-79: otra pestaña con una versión vieja pudo guardar un ejemplo como tus datos: tampoco se muestra como tuyo.
        if (uso.st && esDeEjemplo(uso.st)) {
            apartarEjemplo();
            setTimeout(() => listo && infoRecuperar() && P.ayuda.abrir('recuperar'), 0);
        }
        const st = uso.st || estadoNuevo();
        st.hoy = hoy();
        P.cargar(st, { tab: P.ui ? P.ui.tab : 'hoy' });
        P.avisar('Se actualizó con lo que guardaste en otra pestaña', { check: false, deshacer: false });
        P.emitir('datos:deOtraPestana');
    }
    P.antesDeCambiar = () => {
        if (deOtra && P.modo === 'uso') sincronizar();
    };

    // ------------------------------------------------------------------ aviso fijo según el modo
    const textoAviso = () => (P.modo === 'uso' ? ['Versión de prueba ·', 'tus datos solo están en este teléfono'] : ['Modo entrenamiento ·', 'datos de ejemplo']);
    function pintarAviso() {
        const aviso = $('#aviso-proto');
        if (!aviso) return;
        const [a, b] = textoAviso();
        aviso.classList.toggle('aviso-proto--uso', P.modo === 'uso');
        // V2-79: con los ejemplos, a un toque de tus datos (o de empezar con ellos, si todavía no los usas).
        const mios = hayDatos();
        const misDatos = P.modo !== 'uso' && !P.enGuia ? `<button type="button" class="aviso-proto-b aviso-proto-b--datos" data-a="modoMisDatos" data-fk="aviso-mis-datos"${mios ? ' aria-label="Volver a mis datos"' : ''}>${mios ? 'Mis datos' : 'Usar mis datos'}</button>` : '';
        aviso.innerHTML = `<span class="aviso-proto-t">${icon(P.modo === 'uso' ? 'smartphone' : 'book-open', 'ico-xs')}<span><span class="nw">${a}</span> <span class="nw">${b}</span></span></span>${P.enGuia ? '' : `<span class="aviso-proto-bs">${misDatos}<button type="button" class="aviso-proto-b" id="btn-ayuda" data-a="abrirAyuda" data-fk="btn-ayuda" aria-haspopup="dialog">Ayuda</button></span>`}`;
        if (P.colorBarra) P.colorBarra();
    }

    // ------------------------------------------------------------------ avisos al abrir (uso normal)
    let ultimosAvisos = [];
    function avisosAlAbrir() {
        const st = P.st;
        const out = [];
        const manana = M.sumarDias(st.hoy, 1);
        // v2.7 (F21): los interruptores de la ficha mandan: «Un día antes» (lo de mañana) y «El día que vence» (lo de hoy).
        // Apagados, no hay aviso de ese pago. Lo vencido no es un aviso: es «¿ya lo pagaste?» y se pregunta igual.
        const prendido = P.avisoPrendido;
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) {
            for (const o of M.ocurrenciasPago(st, p, M.sumarDias(st.hoy, -31), manana)) {
                if (o.estado !== 'vencido' && o.estado !== 'pendiente') continue;
                if (o.estado === 'pendiente' && !prendido(p, o.fecha === manana ? 'antes' : 'vence')) continue;
                const art = P.conArticulo(p.nombre);
                const base = { id: `auto-${p.id}-${o.fecha}`, emoji: p.emoji, accion: { tipo: 'pago', id: p.id } };
                if (o.estado === 'vencido') out.push({ ...base, hora: 'Venció', titulo: `${p.nombre}: venció el ${M.fechaCorta(o.fecha)}`, texto: '¿Ya lo pagaste? Márcalo como Pagado.' });
                else if (o.fecha === st.hoy) out.push({ ...base, hora: 'Hoy', titulo: `Hoy vence ${art}`, texto: `${dinero(o.monto, { aprox: o.estimado })}.` });
                else out.push({ ...base, hora: 'Mañana', titulo: `Mañana: ${p.nombre}`, texto: `${dinero(o.monto, { aprox: o.estimado })}.` });
            }
        }
        for (const o of M.ocurrenciasTarjeta(st, st.hoy, manana)) {
            if (o.estado !== 'pendiente') continue;
            out.push({ id: `auto-t-${o.tarjeta.id}-${o.fecha}`, emoji: o.tarjeta.emoji, hora: o.fecha === st.hoy ? 'Hoy' : 'Mañana', titulo: `${o.fecha === st.hoy ? 'Hoy' : 'Mañana'} vence ${o.tarjeta.nombre}`, texto: `${dinero(o.monto)}.`, accion: { tipo: 'tarjeta', id: o.tarjeta.id } });
        }
        ultimosAvisos = out;
        return out;
    }
    const avisoPorId = (id) => ultimosAvisos.find((a) => a.id === id) || null;

    // ------------------------------------------------------------------ registro de uso (sin montos ni nombres)
    function registrarDia() {
        if (!uso) return;
        const h = hoy();
        if (!uso.metricas.dias.includes(h)) uso.metricas.dias.push(h);
        if (instalada()) uso.metricas.instalada = true;
    }
    const ANOTA = new Set(['guardado:gasto', 'guardado:ingreso', 'guardado:mover', 'guardado:apartar', 'guardado:liberar', 'guardado:pagoTarjeta', 'guardado:pago']);
    window.addEventListener('proto', (e) => {
        if (P.modo !== 'uso' || !uso) return;
        const clave = String(e.detail.clave);
        const m = uso.metricas;
        if (ANOTA.has(clave)) m.anotaciones++;
        else if (clave === 'guardado:pagado') m.pagados++;
        else if (clave === 'guardado:cuadre' || clave === 'reparte:cuadre') m.cuadres++;
        else if (clave === 'aldia:fin') m.alDia++;
        else if (clave === 'reparte:fin') m.reparte++;
        else if (clave === 'anotar:noEntendio') m.noEntendio++;
        // Pantallas: solo el TIPO (hoy, pagos, ficha de pago…), nunca su nombre ni su id.
        const [tipo, cual] = clave.split(':');
        if ((tipo === 'pantalla' || tipo === 'hoja') && cual) m.pantallas[cual] = (m.pantallas[cual] || 0) + 1;
    });

    // ------------------------------------------------------------------ «¿Cómo te ha ido?» cada 3 días de uso
    const feedbackToca = () => uso && uso.metricas.dias.length >= 3 && uso.metricas.dias.length - (uso.feedbackEnDias || 0) >= 3 && uso.feedbackPospuesto !== hoy();
    let fb = {};
    // ------------------------------------------------------------------ v2.6.6 (V2-86): lo de antes de empezar, al abrir
    /** La copia interna de tus datos antes de corregir lo de antes de empezar (para «Deshacer»; como el respaldo de la migración). */
    const CLAVE_RESPALDO_ANTES = 'pamplanea-uso:respaldo-antes-de-empezar';
    /** En esta apertura: «Ahora no» la oculta hasta la próxima; lo contestado muestra cómo cambió el libre y «Deshacer». */
    const revision = { oculta: false, libreAntes: null, libreDespues: null, contestadas: 0, listo: false, respuestas: [] };
    /** Lo de antes de empezar que todavía no se contestó (solo con tus datos). */
    const casosAntes = () => (P.modo === 'uso' && uso && P.st && P.st.configurado && P.st.persona === 'uso' ? M.antesDeEmpezar(P.st) : []);
    /**
     * V2-86: una sola tarjeta en Hoy, «Revisemos unos pagos de antes de que empezaras», con cada caso (fecha y monto),
     * [Sí, ya lo pagué] / [No, lo debo] (en un ingreso, [Sí, ya me llegó] / [No, todavía no]), «Ya pagué todos» y «Ahora
     * no». Al contestar, el libre se corrige y se dice: «Tu libre pasó de $X a $Y» [Deshacer]. Nada cambia sin respuesta.
     */
    function revisionHoy() {
        if (P.modo !== 'uso' || !uso || !P.st || !P.st.configurado) return '';
        const casos = casosAntes();
        const libreTxt = revision.libreAntes === revision.libreDespues ? `Tu libre sigue en ${M.dinero(revision.libreDespues)}.` : `Tu libre pasó de ${M.dinero(revision.libreAntes)} a ${M.dinero(revision.libreDespues)}.`;
        const cambio = revision.contestadas ? `<div class="nota nota--ok antes-cambio" role="status">${icon('check')}<p><strong>${libreTxt}</strong> ${revision.contestadas === 1 ? 'Guardamos tu respuesta.' : `Guardamos tus ${revision.contestadas} respuestas.`}</p><button type="button" class="btn btn--sm" data-a="antesDeshacer" data-fk="antes-deshacer">Deshacer</button></div>` : '';
        if (!casos.length) {
            if (!revision.contestadas || revision.listo) return '';
            return `<section class="card card--aviso aviso-antes" aria-labelledby="ra-t"><div class="aviso-cab">${P.caja('✅')}<div><h2 class="card-t" id="ra-t" tabindex="-1">Listo, revisamos tus pagos de antes</h2><p class="txt">Lo que ya pagaste dejó de contar en tu libre. Lo que debes sigue en tus pagos.</p></div></div>${cambio}<button type="button" class="btn btn--48 btn--full" data-a="antesListo" data-fk="antes-listo">Entendido</button></section>`;
        }
        if (revision.oculta) return '';
        const hayPagos = casos.some((c) => c.tipo !== 'ingreso');
        const fila = (c) => {
            const ing = c.tipo === 'ingreso';
            const cuando = ing ? `se esperaba el ${M.fechaCorta(c.fecha)}` : `venció el ${M.fechaCorta(c.fecha)}`;
            const si = ing ? 'Sí, ya me llegó' : 'Sí, ya lo pagué';
            const no = ing ? 'No, todavía no' : 'No, lo debo';
            return `<li class="antes-caso"><div class="antes-caso-t">${P.caja(c.emoji || (ing ? '💵' : '🧾'))}<span class="fila-txt"><span class="fila-t">${esc(c.nombre)}</span><span class="fila-s">${esc(cuando)}</span></span><span class="fila-m">${M.dinero(c.monto, { aprox: c.aprox })}</span></div><div class="acciones-2" role="group" aria-label="${esc(c.nombre)}, ${esc(cuando)}"><button type="button" class="btn" data-a="antesResponder" data-v="no" data-id="${esc(c.clave)}" data-fk="antes-no-${esc(c.clave)}">${no}</button><button type="button" class="btn btn--prim" data-a="antesResponder" data-v="si" data-id="${esc(c.clave)}" data-fk="antes-si-${esc(c.clave)}">${si}</button></div></li>`;
        };
        const todos = hayPagos ? 'Ya pagué todos' : 'Ya me llegaron todos';
        return `<section class="card card--aviso aviso-antes" aria-labelledby="ra-t"><div class="aviso-cab">${P.caja('🗓️')}<div><h2 class="card-t" id="ra-t" tabindex="-1">Revisemos unos pagos de antes de que empezaras</h2><p class="txt">${hayPagos ? 'Tienen fecha de antes de que empezaras a usar la app. Si ya los pagaste, dejan de contar en tu libre.' : 'Tienen fecha de antes de que empezaras a usar la app. Si ya te llegaron, ya están en lo que tienes.'}</p></div></div>
            ${cambio}
            <ul class="antes-lista">${casos.map(fila).join('')}</ul>
            <div class="acciones-2"><button type="button" class="btn" data-a="antesAhoraNo" data-fk="antes-ahora-no">Ahora no</button>${casos.length > 1 ? `<button type="button" class="btn btn--prim" data-a="antesTodos" data-fk="antes-todos">${todos}</button>` : ''}</div>
            <p class="fila-s">Nada cambia sin tu respuesta. Antes de corregir guardamos una copia de tus datos.</p></section>`;
    }
    /** V2-86: aplica respuestas (con la copia interna antes de la primera de esta revisión). */
    function responderAntes(claves, si) {
        const casos = casosAntes().filter((c) => claves.includes(c.clave));
        if (!casos.length) return;
        if (!revision.contestadas) {
            P.almacen.escribir(CLAVE_RESPALDO_ANTES, { fecha: new Date().toISOString(), version: VERSION, st: structuredClone(P.st) });
            revision.libreAntes = P.calc().libre;
        }
        P.cambiar((s) => {
            for (const c of casos) P.responderAntes(s, c, si);
        }, { aviso: null, deshacer: false, claves: ['antes:' + (si ? 'si' : 'no'), ...(casos.length > 1 ? ['antes:todos'] : [])] });
        revision.respuestas.push(...casos.map((caso) => ({ caso, si })));
        revision.contestadas += casos.length;
        revision.libreDespues = P.calc().libre;
        revision.listo = false;
        guardarUso();
        P.render({ foco: '#ra-t' });
    }
    P.acciones.antesResponder = (d) => responderAntes([d.id], d.v === 'si');
    /** «Ya pagué todos»: todos los pagos y tarjetas (si solo hay ingresos, «Ya me llegaron todos»). */
    P.acciones.antesTodos = () => {
        const casos = casosAntes();
        const hayPagos = casos.some((c) => c.tipo !== 'ingreso');
        responderAntes(casos.filter((c) => !hayPagos || c.tipo !== 'ingreso').map((c) => c.clave), true);
    };
    P.acciones.antesAhoraNo = () => {
        revision.oculta = true;
        P.emitir('antes:ahoraNo');
        P.render({ foco: '#pantalla h1' });
    };
    P.acciones.antesListo = () => {
        revision.listo = true;
        P.render({ foco: '#pantalla h1' });
    };
    /**
     * V2-86: «Deshacer»: vuelve exactamente lo que cambiaron las respuestas de esta revisión (lo que anotaste después se
     * queda). La copia interna de antes de contestar sigue guardada, con la marca de cuándo se deshizo.
     */
    P.acciones.antesDeshacer = () => {
        if (!revision.respuestas.length) return;
        const respuestas = revision.respuestas.slice();
        P.cambiar((s) => {
            for (const r of respuestas.reverse()) P.deshacerAntes(s, r.caso, r.si);
        }, { aviso: null, deshacer: false });
        const copia = P.almacen.leer(CLAVE_RESPALDO_ANTES, null);
        if (copia) P.almacen.escribir(CLAVE_RESPALDO_ANTES, { ...copia, deshecho: new Date().toISOString() });
        Object.assign(revision, { oculta: false, libreAntes: null, libreDespues: null, contestadas: 0, listo: false, respuestas: [] });
        guardarUso();
        P.avisar('Listo, lo deshicimos: tus datos quedaron como antes de contestar', { deshacer: false, check: false });
        P.emitir('antes:deshacer');
        P.render({ foco: '#ra-t' });
    };

    // ------------------------------------------------------------------ v2.8: las preguntas de una sola vez (E2.7)
    /**
     * v2.8 (D-2, D-5): a quien viene de una versión anterior, una sola vez y con sus datos: por cada gasto fijo que parece
     * variable (súper, gasolina, comida, mercado), «¿«Súper» cambia cada quincena?»; por cada tarjeta, «¿Qué día vence tu
     * próximo pago de [tarjeta]?»; y por cada ahorro de antes, «Tu ahorro [nombre], ¿en qué cuenta está?» («no asumir»,
     * APROBADO por Victor, 2026-10-22). Nada cambia sin respuesta; lo contestado queda en tus datos (`preguntas28`).
     */
    const PALABRAS_VARIABLE = new Set(['super', 'supermercado', 'despensa', 'gasolina', 'comida', 'mercado', 'transporte', 'combustible']);
    const pareceVariable = (p) => ['super', 'comida', 'mercado'].includes(p.categoria) || M.normalizar(p.nombre || '').split(' ').some((w) => PALABRAS_VARIABLE.has(w));
    /** El tope que se propone: lo mismo por quincena (un gasto de cada mes con quincena: la mitad). */
    function topePropuesto(st, p) {
        const cada = M.periodoPlan(st).cada;
        if (p.frecuencia === 'mensual' && cada === 'quincena') return Math.round(p.monto / 2);
        if (p.frecuencia === 'mensual' && cada === 'semana') return Math.round((p.monto * 12) / 52);
        return p.monto;
    }
    const preguntas = { oculta: false, aparte: null };
    function preguntas28() {
        if (P.modo !== 'uso' || !uso || !P.st || !P.st.configurado || P.st.persona !== 'uso' || !(uso.novedades && uso.novedades['v2.8'])) return [];
        const st = P.st;
        const hechas = st.preguntas28 || {};
        const out = [];
        for (const p of st.pagos) {
            if (p.activo === false || p.tipoDeuda || p.descuento || p.frecuencia === 'unico' || !Number.isInteger(p.monto) || !pareceVariable(p) || hechas['variable:' + p.id]) continue;
            out.push({ clave: 'variable:' + p.id, tipo: 'variable', pago: p, tope: topePropuesto(st, p) });
        }
        for (const t of st.tarjetas) {
            if (!t.corte || hechas['vence:' + t.id]) continue;
            const info = M.tarjetaInfo(st, t);
            const actual = info.vence;
            // Si su pago ya venció (lo de antes de empezar, o por confirmar), primero se contesta eso.
            if (actual < st.hoy) continue;
            const [y, m] = M.partes(actual);
            const antes = M.fechaDe(...M.mesMas(y, m, -1), t.pagoDia);
            const despues = M.fechaDe(...M.mesMas(y, m, 1), t.pagoDia);
            const otra = antes >= st.hoy ? antes : despues;
            out.push({ clave: 'vence:' + t.id, tipo: 'vence', tarjeta: t, actual, otra });
        }
        // Mientras no conteste, el ahorro sigue dentro de la cuenta supuesta y su libre no cambia.
        for (const a of st.apartados || []) {
            if (!a || !a.donde || a.donde === 'aparte' || !a.donde.supuesto || hechas['ahorro:' + a.id]) continue;
            out.push({ clave: 'ahorro:' + a.id, tipo: 'ahorro', ahorro: a, actual: M.lugarAhorro(st, a) });
        }
        return out;
    }
    function preguntasHoy() {
        const lista = preguntas28();
        if (!lista.length || preguntas.oculta) return '';
        const fila = (q) => {
            if (q.tipo === 'ahorro') {
                const a = q.ahorro;
                const l = q.actual ? M.lugar(P.st, q.actual) : null;
                // «Aparte» se confirma antes: su libre sube por ese monto (ese dinero no está en sus cuentas).
                const botones = preguntas.aparte === q.clave
                    ? `<p class="txt p28-sube" id="p28-sube-${a.id}" tabindex="-1"><strong>Tu libre sube ${M.dinero(a.monto)} porque ese dinero no está en tus cuentas.</strong></p><div class="acciones-2" role="group" aria-label="${esc(a.nombre)}"><button type="button" class="btn" data-a="pregunta28Aparte" data-id="${esc(q.clave)}" data-v="no" data-fk="p28-ah-volver-${a.id}">No, volver</button><button type="button" class="btn btn--prim" data-a="pregunta28" data-id="${esc(q.clave)}" data-v="aparte" data-fk="p28-ah-aparte-ok-${a.id}">Sí, está aparte</button></div>`
                    : `<div class="p28-cuentas" role="group" aria-label="${esc(a.nombre)}">${P.st.lugares.map((x) => `<button type="button" class="btn${x.id === q.actual ? ' btn--prim' : ''}" data-a="pregunta28" data-id="${esc(q.clave)}" data-v="lugar:${esc(x.id)}" data-fk="p28-ah-${a.id}-${esc(x.id)}">${esc(x.nombre)}</button>`).join('')}<button type="button" class="btn" data-a="pregunta28Aparte" data-id="${esc(q.clave)}" data-v="si" data-fk="p28-ah-${a.id}-aparte">Aparte (no está en una cuenta)</button></div>`;
                return `<li class="p28-caso"><div class="p28-caso-t">${P.caja(a.emoji || '🐷')}<span class="fila-txt"><span class="fila-t">Tu ahorro ${esc(a.nombre)}, ¿en qué cuenta está?</span><span class="fila-s">Tiene ${M.dinero(a.monto)}. ${l ? `Hoy lo contamos dentro de ${esc(l.nombre)}.` : 'Hoy lo contamos dentro de tus cuentas.'}</span></span></div>${botones}</li>`;
            }
            if (q.tipo === 'variable') {
                const p = q.pago;
                return `<li class="p28-caso"><div class="p28-caso-t">${P.caja(p.emoji || '🛒')}<span class="fila-txt"><span class="fila-t">¿«${esc(p.nombre)}» cambia ${esc(P.cadaVez())}?</span><span class="fila-s">Como gasto variable, su tope sería ${M.dinero(q.tope)} ${esc(P.cadaPlan())}.</span></span></div><div class="acciones-2" role="group" aria-label="${esc(p.nombre)}"><button type="button" class="btn" data-a="pregunta28" data-id="${esc(q.clave)}" data-v="no" data-fk="p28-no-${p.id}">No, queda fijo</button><button type="button" class="btn btn--prim" data-a="pregunta28" data-id="${esc(q.clave)}" data-v="si" data-fk="p28-si-${p.id}">Pasarlo a gasto variable</button></div></li>`;
            }
            const t = q.tarjeta;
            const ch = (f, fk) => `<button type="button" class="btn${f === q.actual ? ' btn--prim' : ''}" data-a="pregunta28" data-id="${esc(q.clave)}" data-v="${f}" data-fk="${fk}">${esc(M.capital(M.fechaLarga(f)))}</button>`;
            return `<li class="p28-caso"><div class="p28-caso-t">${P.caja(t.emoji || '💳')}<span class="fila-txt"><span class="fila-t">¿Qué día vence tu próximo pago de ${esc(P.nombreTarjeta(t))}?</span><span class="fila-s">Hoy lo tenemos el ${esc(M.fechaLarga(q.actual))}.</span></span></div><div class="acciones-2" role="group" aria-label="${esc(t.nombre)}">${ch(q.otra, 'p28-otra-' + t.id)}${ch(q.actual, 'p28-actual-' + t.id)}</div><button type="button" class="link" data-a="hoja" data-hoja="nuevaDeuda" data-id="${t.id}" data-fk="p28-otro-${t.id}">Es otro día</button></li>`;
        };
        return `<section class="card card--aviso aviso-p28" aria-labelledby="p28-t"><div class="aviso-cab">${P.caja('🗒️')}<div><h2 class="card-t" id="p28-t" tabindex="-1">${lista.length === 1 ? 'Una pregunta sobre tu plan' : `${lista.length} preguntas sobre tu plan`}</h2><p class="txt">Una sola vez. Nada cambia sin tu respuesta.</p></div></div>
            <ul class="p28-lista">${lista.map(fila).join('')}</ul>
            <div class="acciones-2"><button type="button" class="btn" data-a="pregunta28Luego" data-fk="p28-luego">Ahora no</button></div></section>`;
    }
    P.acciones.pregunta28 = (d) => {
        const q = preguntas28().find((x) => x.clave === d.id);
        if (!q) return;
        let aviso = 'Listo';
        preguntas.aparte = null;
        P.cambiar((s) => {
            s.preguntas28 = { ...(s.preguntas28 || {}), [q.clave]: { respuesta: d.v, fecha: s.hoy } };
            if (q.tipo === 'ahorro') {
                // «Aparte»: el dinero no está en sus cuentas (no se mueve nada): deja de restarse y su libre sube.
                // Una cuenta: queda dentro de esa (la que dijo); su libre no cambia.
                const a = M.apartado(s, q.ahorro.id);
                const antes = JSON.stringify(a.donde);
                if (d.v === 'aparte') a.donde = 'aparte';
                else a.donde = { lugar: String(d.v).replace(/^lugar:/, '') };
                if (JSON.stringify(a.donde) !== antes) a.historial.unshift({ fecha: s.hoy, tipo: 'donde', monto: 0, donde: a.donde });
                const l = a.donde === 'aparte' ? null : M.lugar(s, a.donde.lugar);
                aviso = a.donde === 'aparte' ? `Listo: ${a.nombre} está aparte. Tu libre subió ${M.dinero(a.monto)}` : `Listo: ${a.nombre} está dentro de ${l ? l.nombre : 'tu cuenta'}`;
            }
            if (q.tipo === 'variable' && d.v === 'si') {
                const v = P.fijoAVariable(s, q.pago.id, { tope: q.tope });
                aviso = v ? `${v.nombre} ahora es gasto variable` : aviso;
            } else if (q.tipo === 'variable') aviso = `${q.pago.nombre} queda fijo`;
            if (q.tipo === 'vence') {
                // v2.8 (D-5): la fecha que dijo manda (y cuántos meses hay de su corte a su pago).
                const t = M.tarjeta(s, q.tarjeta.id);
                const ult = t.estados.at(-1);
                if (d.v !== q.actual) {
                    const info = M.tarjetaInfo(s, t);
                    t.desfase = M.desfaseDesde(d.v, t.corte);
                    if (ult.inicial) ult.vence = d.v;
                    else if (!info.pendiente && ult.vence === q.actual) ult.vence = d.v;
                    if (t.asignaciones && t.asignaciones[q.actual]) {
                        t.asignaciones[d.v] = t.asignaciones[q.actual];
                        delete t.asignaciones[q.actual];
                    }
                } else t.desfase = M.desfaseDesde(q.actual, t.corte);
                aviso = `Listo: tu pago de ${P.nombreTarjeta(t)} vence el ${M.fechaCorta(d.v)}`;
            }
        }, { aviso: () => aviso, claves: ['pregunta28:' + q.tipo + ':' + (q.tipo === 'ahorro' ? (d.v === 'aparte' ? 'aparte' : 'cuenta') : d.v === 'si' || d.v === 'no' ? d.v : 'fecha')] });
        guardarUso();
        P.render({ foco: preguntas28().length ? '#p28-t' : '#pantalla h1' });
    };
    /** «Aparte (no está en una cuenta)»: primero dice cuánto sube su libre; «Sí, está aparte» lo confirma. */
    P.acciones.pregunta28Aparte = (d) => {
        const q = preguntas28().find((x) => x.clave === d.id);
        if (!q) return;
        preguntas.aparte = d.v === 'no' ? null : q.clave;
        P.render({ foco: d.v === 'no' ? `[data-fk="p28-ah-${q.ahorro.id}-aparte"]` : `#p28-sube-${q.ahorro.id}` });
    };
    P.acciones.pregunta28Luego = () => {
        preguntas.aparte = null;
        preguntas.oculta = true;
        P.render({ foco: '#pantalla h1' });
    };
    function tarjetasHoy() {
        if (P.modo !== 'uso' || !uso || !P.st.configurado) return [];
        const out = [];
        // v2.7 (DATOS-1): no hubo espacio para la copia interna de antes de actualizar: se avisa (no falla).
        if (copiaFallo && !(P.almacen.fallo || !P.almacen.disponible)) {
            out.push(`<section class="card card--aviso" aria-labelledby="cf-t"><div class="aviso-cab">${P.caja('🛟')}<div><h2 class="card-t" id="cf-t">Guarda una copia de tus datos</h2><p class="txt">Tu teléfono tiene poco espacio y no pudimos guardar la nuestra. Tus datos están bien.</p></div></div><div class="acciones-2"><button type="button" class="btn btn--prim" data-a="ayIr" data-v="datos" data-fk="cf-copia">Guardar una copia</button></div></section>`);
        }
        // v2.6.1 (QA H-02): si el teléfono no deja guardar (sin espacio, modo privado o bloqueado), se dice siempre arriba.
        if (P.almacen.fallo || !P.almacen.disponible) {
            out.push(`<section class="card card--aviso aviso-guardar" role="alert" aria-labelledby="ag-t"><div class="aviso-cab">${P.caja('⚠️')}<div><h2 class="card-t" id="ag-t">No se están guardando tus datos</h2><p class="txt">Este teléfono no deja guardar: puede estar sin espacio o en modo privado. Lo que anotes se pierde al cerrar.</p></div></div><div class="acciones-2"><button type="button" class="btn btn--prim" data-a="ayIr" data-v="datos" data-fk="ag-copia">Guardar una copia</button></div></section>`);
        }
        if (!pref().notaAvisos && avisosAlAbrir().length) {
            out.push(`<div class="nota nota--info" role="note">${icon('bell')}<p>Por ahora los avisos aparecen <strong>al abrir la app</strong>. En la app final te llegará una notificación.</p><button type="button" class="link" data-a="modoNotaAvisos" data-fk="nota-avisos">Entendido</button></div>`);
        }
        // v2.5: si agregó una tarjeta (por ejemplo, el primer día), se ofrece una vez el capítulo de tarjetas.
        if (P.st.tarjetas.length && !pref().ofertaTarjetas) {
            out.push(`<section class="card card--aviso" aria-labelledby="of-t"><div class="aviso-cab">${P.caja('💳')}<div><h2 class="card-t" id="of-t">¿Quieres ver cómo funcionan las tarjetas? (1 min)</h2><p class="txt">Un capítulo corto con datos de ejemplo. No toca tus datos.</p></div></div><div class="acciones-2"><button type="button" class="btn" data-a="ofertaTarjetas" data-v="no" data-fk="oferta-hoy-no">Ahora no</button><button type="button" class="btn btn--prim" data-a="ofertaTarjetas" data-v="si" data-fk="oferta-hoy-si">Ver ahora</button></div></section>`);
        }
        if (feedbackToca()) {
            const op = (n) => `<button type="button" class="ay-nota-n" role="radio" aria-checked="${fb.facil === n}" data-a="fbFacil" data-v="${n}" data-fk="fb-${n}"><span class="ay-nota-num">${n}</span>${fb.facil === n ? icon('check', 'ico-dia') : ''}</button>`;
            out.push(`<section class="card card--aviso" aria-labelledby="fb-t"><div class="aviso-cab">${P.caja('💬')}<div><h2 class="card-t" id="fb-t">¿Cómo te ha ido?</h2><p class="txt">Unos segundos. Solo lo ven Victor o Pam si tú se lo mandas (sin montos).</p></div></div>
                <div role="radiogroup" aria-labelledby="fb-t" class="ay-notas-n fb-notas">${[1, 2, 3, 4, 5].map(op).join('')}</div><p class="fila-s fb-escala"><span>1 · Me costó</span><span>5 · Me encanta</span></p>
                <div class="campo-g"><label class="campo-l" for="fb-confuso">¿Qué te confundió? <span class="opcional">(opcional)</span></label><div class="campo"><input id="fb-confuso" data-fb="confuso" type="text" maxlength="200" value="${esc(fb.confuso || '')}"></div></div>
                <div class="campo-g"><label class="campo-l" for="fb-gustaria">¿Qué te gustaría que hiciera? <span class="opcional">(opcional)</span></label><div class="campo"><input id="fb-gustaria" data-fb="gustaria" type="text" maxlength="200" value="${esc(fb.gustaria || '')}"></div></div>
                ${fb.error ? `<p class="campo-error">${icon('triangle-alert')}<span>Elige un número del 1 al 5</span></p>` : ''}
                <div class="acciones-2"><button type="button" class="btn" data-a="fbPosponer" data-fk="fb-luego">Ahora no</button><button type="button" class="btn btn--prim" data-a="fbGuardar" data-fk="fb-guardar">Guardar</button></div></section>`);
        }
        return out;
    }
    document.addEventListener('input', (e) => {
        if (e.target.dataset && e.target.dataset.fb) fb[e.target.dataset.fb] = e.target.value;
    });
    const acc = P.acciones;
    /** v2.5: «¿Quieres ver cómo funcionan las tarjetas?» — una sola vez; «Ver ahora» abre ese capítulo y al final vuelve aquí. */
    acc.ofertaTarjetas = (d) => {
        guardarPref({ ofertaTarjetas: d.v === 'si' ? 'vista' : 'no' });
        if (P.ui.hoja) P.cerrarHoja({ sinFoco: true });
        P.emitir('oferta:tarjetas:' + d.v);
        if (d.v !== 'si') {
            P.render({ foco: '#pantalla h1' });
            return;
        }
        const version = P.st && M.principal(P.st) ? 'fijo' : 'variable';
        entrarEntrenamiento();
        P.tour.empezar({ version, cap: 'tarjetas', desdeUso: true });
    };
    window.addEventListener('proto', (e) => {
        if (P.modo !== 'uso' || e.detail.clave !== 'guardado:deuda:tarjeta' || pref().ofertaTarjetas) return;
        // Después de guardar la tarjeta (se ve su aviso), en el momento: una sola vez.
        setTimeout(() => {
            if (P.modo === 'uso' && !P.ui.hoja && !pref().ofertaTarjetas) P.abrirHoja('ofertaTarjetas');
        }, 400);
    });
    acc.modoNotaAvisos = () => {
        guardarPref({ notaAvisos: true });
        P.render({ foco: '#pantalla h1' });
    };
    acc.fbFacil = (d) => {
        fb.facil = Number(d.v);
        fb.error = false;
        P.render({ foco: `[data-fk="fb-${d.v}"]` });
    };
    acc.fbPosponer = () => {
        uso.feedbackPospuesto = hoy();
        fb = {};
        guardarUso();
        P.render({ foco: '#pantalla h1' });
    };
    acc.fbGuardar = () => {
        if (!fb.facil) {
            fb.error = true;
            P.render({ foco: '[data-fk="fb-1"]' });
            return;
        }
        uso.feedback.push({ fecha: hoy(), facil: fb.facil, confuso: (fb.confuso || '').trim(), gustaria: (fb.gustaria || '').trim() });
        uso.feedbackEnDias = uso.metricas.dias.length;
        fb = {};
        guardarUso();
        P.render({ foco: '#pantalla h1' });
        P.avisar('¡Gracias! Lo verán Victor o Pam si se lo mandas');
        P.emitir('feedback:guardado');
    };

    // ------------------------------------------------------------------ «Cuéntale a Victor o a Pam cómo vas» (V2-62)
    /** Los nombres que la persona les puso a sus cosas (lugares, medios, pagos, ahorros, ingresos, tarjetas…), de cualquier largo. */
    const nombresDe = (st) =>
        [...(st.lugares || []), ...(st.medios || []), ...(st.tarjetas || []), ...(st.prestamos || []), ...(st.pagos || []), ...(st.apartados || []), ...(st.ingresos || []), ...(st.logros || []), ...(st.cerrados || [])]
            .map((x) => x && x.nombre)
            .filter((n) => n && n.trim())
            .map((n) => n.trim());
    /** Junta los nombres que hay ahora (incluso si luego se cambian o borran antes de guardar). */
    function recordarNombres() {
        if (!uso || P.modo !== 'uso' || !P.st) return;
        const vistos = new Set(uso.nombresVistos || []);
        const antes = vistos.size;
        for (const n of nombresDe(P.st)) vistos.add(n);
        if (vistos.size !== antes) uso.nombresVistos = [...vistos];
    }
    // v2.6: para tapar sin importar mayúsculas ni tildes, cada letra se compara en su forma simple (una por una: mismo largo).
    const SIN_TILDE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };
    const simple = (s) =>
        String(s)
            .split('')
            .map((ch) => {
                const l = ch.toLowerCase();
                return l.length === 1 ? SIN_TILDE[l] || l : ch;
            })
            .join('');
    const SUELTAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'con', 'por', 'para', 'mis', 'tus', 'sus', 'una', 'uno', 'que']);
    /**
     * Tapa con [nombre] cada nombre de sus cosas: completo (los de 1 o 2 letras, solo como palabra suelta) y, si tiene
     * varias palabras, cada palabra de 3 letras o más como palabra suelta («Agrícola» de «Banco Agrícola»). Mejor tapar de más.
     */
    function taparNombres(texto, nombres) {
        const t = String(texto || '');
        const s = simple(t);
        const marcas = [];
        const letra = (i) => i >= 0 && i < s.length && /[a-z0-9]/.test(s[i]);
        const buscar = (q, suelta) => {
            if (!q) return;
            for (let i = s.indexOf(q); i !== -1; i = s.indexOf(q, i + 1)) {
                if (suelta && (letra(i - 1) || letra(i + q.length))) continue;
                marcas.push([i, i + q.length]);
            }
        };
        for (const n of nombres) {
            const q = simple(n.trim());
            buscar(q, q.length <= 2);
            const piezas = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !SUELTAS.has(w));
            if (piezas.length > 1) for (const w of piezas) buscar(w, true);
        }
        marcas.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
        const unidas = [];
        for (const [a, b] of marcas) {
            const u = unidas.at(-1);
            if (u && a <= u[1]) u[1] = Math.max(u[1], b);
            else unidas.push([a, b]);
        }
        let out = t;
        for (const [a, b] of unidas.reverse()) out = out.slice(0, a) + '[nombre]' + out.slice(b);
        return out;
    }
    /** Lo que la persona escribe va sin montos ni nombres de sus cosas. v2.6: cualquier número se tapa («me pagan 600» ya no se cuela). */
    function sinDatosFinancieros(texto) {
        const u = usoGuardado();
        const nombres = [...new Set([...(u.st ? nombresDe(u.st) : []), ...(u.nombresVistos || [])])].sort((a, b) => b.length - a.length);
        return taparNombres(texto, nombres).replace(/\$\s*\d+(?:[.,]\d+)*|\d+(?:[.,]\d+)*/g, '[monto]');
    }
    const fechaCorta = (iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        return `${d} ${M.MESES_CORTOS[m - 1]} ${y}`;
    };
    /** v2.7: el día en el teléfono de un momento guardado (una copia de las 9 p. m. es de ese día, no del siguiente). */
    const diaDe = (iso) => {
        const s = String(iso || '');
        const d = /T/.test(s) ? new Date(s) : null;
        return d && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : s.slice(0, 10);
    };
    const NOMBRE_PANTALLA = { hoy: 'Hoy', pagos: 'Pagos', midinero: 'Mi dinero', mes: 'Mes', anotar: 'Anotar', desglose: 'Detalle del libre', pago: 'Ficha de pago', tarjeta: 'Ficha de tarjeta', apartado: 'Ficha de ahorro', lugar: 'Ficha de lugar', lugares: 'Cuentas', cuentas: 'Cuentas', ahorros: 'Ahorros', deudas: 'Deudas', atencion: 'Necesitan atención', pagarCon: 'Lo pagas con', reservar: 'Reservar', pasarProxima: 'Pasar a la próxima', ingreso: 'Ficha de ingreso', reparte: 'Reparte', aldia: 'Pongámonos al día', menu: 'Menú', cuadrar: 'Cuadrar', pagado: 'Pagado', apartar: 'Ahorrar', pagarYa: 'Pagar ya', mover: 'Mover dinero', moverApartado: 'Mover ahorro', usar: 'Usar ahorro', liberar: 'Sacar de ahorro', meta: 'Editar ahorro', nuevoIngreso: 'Ingreso nuevo o editado', ingresoLlego: 'Ya llegó', nuevoPago: 'Pago nuevo', editarPago: 'Editar pago', decidirPago: 'Decidir pago', nuevaDeuda: 'Tarjeta o préstamo', deuda: 'Abonar deuda', estadoCuenta: 'Estado de cuenta', editarRegistro: 'Editar anotación', yaLoUse: 'Ya lo usé', yaNoAplica: 'Ya no aplica', medio: 'Medio de pago', apariencia: 'Apariencia', avisos: 'Avisos', aprende: 'Aprende', espacio: 'Espacio', invitar: 'Invitar' };
    /** El nombre o apodo que va en el texto: el de «Cuéntale…», si no el de la prueba guiada, si no el del primer día. */
    const nombreContar = (u) => (u.nombre || (P.ayuda && P.ayuda.datos().nombre) || (u.st && u.st.nombre) || '').trim();
    /**
     * Lo que se manda, por partes. Cada parte trae la frase de «Esto se manda» que la describe y sus líneas del texto:
     * la lista y el texto salen de aquí mismo, así nunca dicen cosas distintas. `siEscribes`: solo lleva líneas si la
     * persona escribe algo.
     */
    function partesContar() {
        const u = usoGuardado();
        const m = u.metricas;
        const e = entrenamiento();
        const dias = [...m.dias].sort();
        const top = Object.entries(m.pantallas)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([k, n]) => `${NOMBRE_PANTALLA[k] || 'Otra pantalla'} (${n})`);
        const practicas = Object.keys(e.practicas || {}).length;
        const partes = [
            { id: 'version', lista: 'La versión de la app', lineas: [`PamPlanea · ${VERSION} · cómo me va`] },
            { id: 'nombre', lista: 'Tu nombre o apodo (el que escribas abajo)', lineas: [`Nombre: ${nombreContar(u) || '(sin nombre)'}`] },
            { id: 'fechas', lista: 'Qué días la abriste con tus datos (del primero al último) y cuántos fueron', lineas: [dias.length ? `Fechas: del ${fechaCorta(dias[0])} al ${fechaCorta(dias.at(-1))} · abrí la app ${dias.length} ${dias.length === 1 ? 'día' : 'días'}` : 'Fechas: todavía no la uso con mis datos'] },
            { id: 'aprender', lista: 'Si la instalaste y qué hiciste en «Aprender a usarla»', lineas: [`Instalada: ${m.instalada || instalada() ? 'sí' : 'no'} · Entrenamiento: ${P.tour && P.tour.resumen ? P.tour.resumen() : e.tour === 'hecho' ? 'hice el recorrido' : e.tour === 'saltado' ? 'salté el recorrido' : 'no lo hice'}${practicas ? `, ${practicas} ${practicas === 1 ? 'ejemplo practicado' : 'ejemplos practicados'}` : ''}`] },
            { id: 'uso', lista: 'Cuántas veces anotaste, marcaste «Pagado», cuadraste y usaste «Reparte» y «Pongámonos al día»', lineas: [`Lo que hice: ${m.anotaciones} ${m.anotaciones === 1 ? 'anotación' : 'anotaciones'} · ${m.pagados} ${m.pagados === 1 ? 'pago marcado' : 'pagos marcados'} como Pagado · ${m.cuadres} ${m.cuadres === 1 ? 'cuadre' : 'cuadres'} · Reparte ${m.reparte} ${m.reparte === 1 ? 'vez' : 'veces'} · Pongámonos al día ${m.alDia} ${m.alDia === 1 ? 'vez' : 'veces'}`] },
            { id: 'pantallas', lista: 'Las 5 pantallas que más abriste (solo cuáles, como «Hoy» o «Mi plan»)', lineas: [`Pantallas que más usé: ${top.length ? top.join(' · ') : '—'}`] },
            { id: 'noEntendio', lista: 'Cuántas veces la app no te entendió al anotar (no lo que escribiste)', lineas: [`Veces que la app no me entendió al anotar: ${m.noEntendio}`] },
        ];
        if (u.feedback.length) {
            partes.push({ id: 'comoTeHaIdo', lista: 'Tus respuestas a «¿Cómo te ha ido?»', lineas: ['', 'Cómo me ha ido:', ...u.feedback.map((f) => `- ${fechaCorta(f.fecha)}: ${f.facil} de 5${f.confuso ? ` · Me confundió: ${sinDatosFinancieros(f.confuso)}` : ''}${f.gustaria ? ` · Me gustaría: ${sinDatosFinancieros(f.gustaria)}` : ''}`)] });
        }
        if (P.ayuda && P.ayuda.partesPrueba) partes.push(...P.ayuda.partesPrueba(sinDatosFinancieros));
        const mas = (A.contarMas || '').trim();
        partes.push({ id: 'algoMas', siEscribes: true, lista: 'Lo que escribas en «¿Algo más que quieras contarle?», si escribes algo', lineas: mas ? ['', `Algo más: ${sinDatosFinancieros(mas)}`] : [] });
        return partes;
    }
    const textoContar = () =>
        partesContar()
            .flatMap((p) => p.lineas)
            .join('\n');

    // ------------------------------------------------------------------ copia, restaurar y borrar
    const nombreCopia = () => `pamplanea-copia-${hoy()}.json`;
    function contenidoCopia() {
        if (P.modo === 'uso') guardarUso();
        return JSON.stringify({ app: 'pamplanea-prototipo', tipo: 'copia-uso', esquema: ESQUEMA, version: VERSION, fecha: new Date().toISOString(), datos: usoGuardado() }, null, 1);
    }
    function descargarCopia() {
        const blob = new Blob([contenidoCopia()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: nombreCopia() });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        cambiarUsoGuardado({ ultimaCopia: new Date().toISOString() });
        P.emitir('datos:copia');
    }
    /**
     * Compartir copia (corrección v2.3.1): el mismo contenido, como .txt. Chrome en Android no deja compartir
     * archivos .json (el botón no hacía nada). Si el teléfono no deja compartir, se descarga y se dice.
     */
    const archivoCompartible = (contenido) => new File([contenido], nombreCopia().replace(/\.json$/, '.txt'), { type: 'text/plain' });
    async function compartirCopia() {
        const archivo = archivoCompartible(contenidoCopia());
        try {
            if (navigator.canShare && !navigator.canShare({ files: [archivo] })) throw new Error('no se puede');
            await navigator.share({ files: [archivo] });
            cambiarUsoGuardado({ ultimaCopia: new Date().toISOString() });
            P.emitir('datos:compartir');
        } catch (e) {
            // Cerrar el menú del teléfono no es un error.
            if (e && e.name === 'AbortError') return;
            descargarCopia();
            P.avisar('Tu teléfono no dejó compartirla: la guardé en Descargas', { check: false });
        }
    }
    const puedeCompartirArchivo = () => {
        try {
            return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [archivoCompartible('{}')] }));
        } catch {
            return false;
        }
    };
    /** Valida una copia: que sea de este prototipo, de un esquema conocido y con datos con forma. */
    function validarCopia(texto) {
        let obj;
        try {
            obj = JSON.parse(texto);
        } catch {
            return { error: 'El archivo no es una copia de PamPlanea (no se pudo leer).' };
        }
        if (!obj || obj.app !== 'pamplanea-prototipo' || obj.tipo !== 'copia-uso') return { error: 'Ese archivo no es una copia de PamPlanea.' };
        if (typeof obj.esquema !== 'number' || obj.esquema > ESQUEMA || versionMasNueva(obj.version) || (obj.datos && versionMasNueva(obj.datos.version))) return { error: 'Esa copia es de una versión más nueva de la app. Actualiza la app y vuelve a intentarlo.' };
        return validarDatos(obj.datos, obj.fecha);
    }
    /**
     * v2.7 (DATOS-2, F20): una copia (de un archivo o de las internas) se revisa entera ANTES de escribir nada: su forma,
     * sus montos, sus fechas, que lo que nombra exista y que se pueda calcular.
     */
    function validarDatos(crudo, fecha = null) {
        let datos = null;
        try {
            datos = migrarUso(crudo);
        } catch {
            datos = null;
        }
        if (!datos || !datos.st || problemaDatos(datos.st, { estricto: true })) return { error: 'La copia está incompleta o dañada.' };
        // V2-79: una copia guardada después del error trae los datos de ejemplo, no los tuyos.
        if (esDeEjemplo(datos.st)) return { error: 'Esa copia tiene datos de ejemplo, no los tuyos. Busca una copia de antes.' };
        return { datos, fecha, resumen: `${datos.st.lugares.length} lugares · ${datos.st.pagos.length} pagos · ${datos.st.registros.length} movimientos` };
    }
    function restaurar(datos) {
        // V2-79: nunca se escribe un ejemplo como tus datos. v2.7 (DATOS-2): ni algo que no pase la revisión completa.
        if (!datos || !datos.st || esDeEjemplo(datos.st) || problemaDatos(datos.st, { estricto: true })) return false;
        // v2.7 (DATOS-1): lo que había queda en una copia interna antes de reemplazarlo.
        respaldarAntesDeReemplazar();
        uso = datos;
        uso.introVista = true;
        // v2.7: se guarda con la versión que la hizo; al entrar, esta versión la trata como una actualización (copia por
        // versión y, si es de antes de la v2.7, el cuadrito de novedades).
        bloqueo = null;
        P.almacen.escribir(CLAVE_USO, uso);
        resolverEjemplo();
        entrarUso();
        P.emitir('datos:restaurado');
        return true;
    }
    function borrarTodo() {
        P.almacen.borrar(CLAVE_USO);
        P.almacen.borrar(CLAVE_RESPALDO);
        for (const k of P.almacen.claves(PREFIJO_RESPALDO)) P.almacen.borrar(k);
        P.almacen.borrar(CLAVE_EJEMPLO);
        uso = null;
        // v2.6: «Tus datos» también está en el modo entrenamiento; desde ahí, se queda con los ejemplos.
        if (P.modo !== 'uso') {
            guardarPref({ notaAvisos: false });
            P.emitir('datos:borrado');
            return;
        }
        guardarPref({ modo: 'uso', notaAvisos: false });
        entrarUso();
        P.emitir('datos:borrado');
    }

    // ------------------------------------------------------------------ paneles («Ayuda» los pinta)
    const A = (P.modos = {});
    let restaurando = null;
    let borrar = 0;
    function vistaElegir() {
        return `<div class="ay-bienvenida"><p class="ay-bien-t">¡Hola! Esto es PamPlanea.</p><p class="txt">Te ayuda a saber <strong>cuánto te queda libre hasta tu próximo ingreso</strong> y a que no se te olvide ningún pago. Es una versión de prueba.</p></div>
            <div class="opciones-grandes elegir" role="group" aria-label="¿Cómo quieres empezar?">
                <button type="button" class="opcion-g elegir-op" data-a="modoElegir" data-v="entrenamiento" data-fk="elegir-aprender">${P.caja('🎓')}<span class="opcion-g-txt"><span class="opcion-g-t">Aprender a usarla <span class="pronto">Recomendado</span></span><span class="fila-s">Te la enseño paso a paso, con datos de ejemplo. Vas a tu ritmo.</span></span>${icon('chevron-right', 'ico-xs')}</button>
                <button type="button" class="opcion-g elegir-op" data-a="modoElegir" data-v="uso" data-fk="elegir-usar">${P.caja('💰')}<span class="opcion-g-txt"><span class="opcion-g-t">Usarla con mis datos</span><span class="fila-s">Con tu dinero real. Se guarda solo en este teléfono.</span></span>${icon('chevron-right', 'ico-xs')}</button>
            </div>
            <p class="fila-s centro">Puedes cambiar cuando quieras desde la letra de arriba. Lo de un modo no toca lo del otro.</p>
            <p class="ay-version">${esc(VERSION)}</p>`;
    }
    function vistaIntroUso() {
        return `<section class="ay-card ay-card--prim" aria-labelledby="iu-t"><h3 class="ay-h3" id="iu-t">${icon('smartphone', 'ico-s')}Antes de empezar</h3>
                <ul class="ay-puntos"><li><strong>Tus datos se guardan solo en este teléfono.</strong> Nadie más los ve: ni Victor ni Pam.</li><li><strong>Es una versión de prueba:</strong> si algo no cuadra, avísale a Victor o a Pam.</li><li><strong>Instálala en tu pantalla de inicio</strong> para no perder tus datos.${/iPhone|iPad|iPod/.test(navigator.userAgent) ? ' En iPhone, <strong>instálala antes de empezar</strong>: la app instalada no ve lo que pongas en Safari, y Safari puede borrar los datos de páginas que no abres en varios días.' : ''}</li><li>De vez en cuando, guarda una copia (en tu letra → «Tus datos»).</li></ul></section>
            ${instalada() ? '' : `<section class="ay-card" aria-labelledby="iu-i">${'<h3 class="ay-h3" id="iu-i">' + icon('smartphone', 'ico-s') + 'Cómo instalarla</h3>'}${P.ayuda.pasosInstalar()}</section>`}
            <button type="button" class="btn btn--prim btn--48 btn--full" data-a="modoIntroOk" data-fk="intro-empezar">Empezar</button>
            <button type="button" class="link" data-a="modoCambiar" data-v="tour" data-fk="intro-aprender">Mejor primero aprender a usarla</button>
            <p class="ay-version">${esc(VERSION)}</p>`;
    }
    /** «Tus datos» (v2.6: también desde el modo entrenamiento, sobre lo guardado). */
    function vistaDatos() {
        const u = usoGuardado();
        // v2.7 (DATOS-2): con lo guardado que no se puede leer, aquí solo se recupera (nada se guarda encima ni se borra).
        if (bloqueo) {
            return `<section class="ay-card ay-card--prim" aria-labelledby="dt-c"><h3 class="ay-h3" id="dt-c">${icon('circle-check', 'ico-s')}Tus datos están a salvo</h3><p class="txt">No pudimos abrirlos en esta versión. No borramos ni cambiamos nada. Desde «Usarla con mis datos» puedes recuperarlos.</p><div class="ay-acc"><button type="button" class="btn btn--48" data-a="aSalvoDescargar" data-fk="dt-guardado">Guardar en un archivo</button></div></section>
                <p class="ay-version">${esc(VERSION)} · Tus datos solo están en este teléfono</p>`;
        }
        const hay = !!u.st;
        const copia = u.ultimaCopia ? `Tu última copia: ${fechaCorta(diaDe(u.ultimaCopia))}.` : 'Todavía no has guardado una copia.';
        const r = restaurando;
        const guardarHtml = hay
            ? `<section class="ay-card ay-card--prim" aria-labelledby="dt-c"><h3 class="ay-h3" id="dt-c">${icon('receipt-text', 'ico-s')}Guardar copia de mis datos</h3>
                <p class="txt">Descarga un archivo con todo lo que llevas. Guárdalo o mándatelo por WhatsApp. ${copia}</p>
                <div class="ay-acc"><button type="button" class="btn btn--prim btn--48" data-a="modoCopia" data-fk="dt-copia">Guardar copia</button>${puedeCompartirArchivo() ? '<button type="button" class="btn btn--48" data-a="modoCompartirCopia" data-fk="dt-compartir">Compartir copia</button>' : ''}</div></section>`
            : `<section class="ay-card ay-card--prim" aria-labelledby="dt-c"><h3 class="ay-h3" id="dt-c">${icon('receipt-text', 'ico-s')}Todavía no usas tus datos</h3><p class="txt">Cuando la uses con tus datos, aquí guardas una copia. Si tienes una copia de antes, puedes restaurarla.</p></section>`;
        // V2-69 (#38): «Instalar» ya no está aquí: es su propia fila en «Ayuda» (solo si no está instalada).
        const borrarHtml = hay
            ? `<section class="ay-card" aria-labelledby="dt-b"><h3 class="ay-h3" id="dt-b">${icon('trash-2', 'ico-s')}Borrar todos mis datos</h3>
                ${borrar === 0 ? `<p class="txt">Borra todo lo de «Usarla con mis datos» en este teléfono. Los ejemplos no se tocan.</p><button type="button" class="link link--peligro" data-a="modoBorrar" data-v="1" data-fk="dt-borrar">${icon('trash-2', 'ico-s')}Borrar todos mis datos</button>` : borrar === 1 ? `<div class="nota nota--atencion" role="alertdialog" aria-labelledby="dt-b1">${icon('triangle-alert')}<div><p id="dt-b1"><strong>¿Borrar todos tus datos?</strong> Lugares, pagos, ahorros y todo lo anotado.</p><div class="ay-acc"><button type="button" class="btn" data-a="modoBorrar" data-v="0" data-fk="dt-b-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="modoBorrar" data-v="2" data-fk="dt-b-si">Sí, borrar</button></div></div></div>` : `<div class="nota nota--atencion" role="alertdialog" aria-labelledby="dt-b2">${icon('triangle-alert')}<div><p id="dt-b2"><strong>Última confirmación: esto no se puede deshacer.</strong> ${u.ultimaCopia ? 'Tienes una copia guardada.' : 'No has guardado ninguna copia.'}</p><div class="ay-acc"><button type="button" class="btn" data-a="modoBorrar" data-v="0" data-fk="dt-b2-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="modoBorrarYa" data-fk="dt-b2-si">Borrar para siempre</button></div></div></div>`}</section>`
            : '';
        return `${guardarHtml}
            <section class="ay-card" aria-labelledby="dt-r"><h3 class="ay-h3" id="dt-r">${icon('rotate-ccw', 'ico-s')}Restaurar una copia</h3>
                ${r && r.error ? `<p class="campo-error">${icon('triangle-alert')}<span>${esc(r.error)}</span></p>` : ''}
                ${r && r.datos ? `<div class="nota nota--atencion" role="alertdialog" aria-labelledby="dt-r-c">${icon('triangle-alert')}<div><p id="dt-r-c"><strong>¿Reemplazar tus datos con esta copia?</strong> Copia del ${esc(fechaCorta(diaDe(r.fecha) || hoy()))}: ${esc(r.resumen)}. ${hay ? 'Lo que tienes ahora se reemplaza.' : 'Después verás tus datos.'}</p><div class="ay-acc"><button type="button" class="btn" data-a="modoRestaurarNo" data-fk="dt-r-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="modoRestaurarSi" data-fk="dt-r-si">${hay ? 'Sí, reemplazar' : 'Sí, restaurar'}</button></div></div></div>` : `<p class="txt">Elige el archivo «pamplanea-copia-…» (.json o .txt). Antes de reemplazar te pido confirmar.</p><label class="btn btn--48 btn--full" for="dt-archivo" data-fk="dt-elegir">Elegir archivo</label><input id="dt-archivo" class="sr-only" type="file" accept="application/json,.json,text/plain,.txt" data-copia>`}</section>
            ${borrarHtml}
            <p class="ay-version">${esc(VERSION)} · Tus datos solo están en este teléfono</p>`;
    }
    /**
     * v2.6.4 (V2-79): para quien ya cayó en el error. Lo guardado como sus datos era un ejemplo: no se le muestra como
     * suyo. Si hay una copia (el respaldo de la migración o la última «Guardar copia»), se ofrece recuperarla; si no,
     * empezar su Primer día. El ejemplo queda apartado, sin borrarse.
     */
    function vistaRecuperar() {
        const info = infoRecuperar();
        if (!info) return `<p class="txt">Tus datos están bien.</p><button type="button" class="btn btn--prim btn--48 btn--full" data-a="ayCerrar" data-fk="rec-cerrar">Seguir</button>`;
        const r = restaurando;
        const de = info.de ? ` (los de ${esc(info.de)})` : '';
        const intro = `<p class="txt">Lo que estaba guardado como tus datos eran <strong>datos de ejemplo</strong>${de}, no los tuyos. Pasó por un error de la app al cambiar de versión en «Aprender a usarla». Ya está corregido y no te los mostramos como tuyos.</p>`;
        const deNuevo = (prim = false) => `<button type="button" class="btn btn--48${prim ? ' btn--prim btn--full' : ''}" data-a="modoRecuperar" data-v="nuevo" data-fk="${prim ? 'rec-primer-dia' : 'rec-de-nuevo'}">${prim ? 'Empezar mi Primer día' : 'Empezar de nuevo'}</button>`;
        let cuerpo;
        if (info.respaldo) {
            cuerpo = `<section class="ay-card ay-card--prim" aria-labelledby="rec-t"><h3 class="ay-h3" id="rec-t">${icon('rotate-ccw', 'ico-s')}Encontramos una copia de tus datos del ${esc(fechaCorta(info.respaldo))}. ¿Recuperarla?</h3>
                <p class="txt">Lo que anotaste después de ese día no está en la copia.</p>
                <div class="ay-acc">${deNuevo()}<button type="button" class="btn btn--prim btn--48" data-a="modoRecuperar" data-v="respaldo" data-fk="rec-recuperar">Recuperar</button></div></section>`;
        } else if (info.copia) {
            const elegir = r && r.datos
                ? `<div class="nota nota--atencion" role="alertdialog" aria-labelledby="dt-r-c">${icon('triangle-alert')}<div><p id="dt-r-c"><strong>¿Recuperar tus datos con esta copia?</strong> Copia del ${esc(fechaCorta(diaDe(r.fecha) || hoy()))}: ${esc(r.resumen)}.</p><div class="ay-acc"><button type="button" class="btn" data-a="modoRestaurarNo" data-fk="dt-r-no">Cancelar</button><button type="button" class="btn btn--prim" data-a="modoRestaurarSi" data-fk="dt-r-si">Sí, recuperar</button></div></div></div>`
                : `<div class="ay-acc">${deNuevo()}<label class="btn btn--prim btn--48" for="rec-archivo" data-fk="dt-elegir">Recuperar</label></div><input id="rec-archivo" class="sr-only" type="file" accept="application/json,.json,text/plain,.txt" data-copia>`;
            cuerpo = `<section class="ay-card ay-card--prim" aria-labelledby="rec-t"><h3 class="ay-h3" id="rec-t">${icon('rotate-ccw', 'ico-s')}Guardaste una copia el ${esc(fechaCorta(info.copia))}</h3>
                <p class="txt">Búscala en tu teléfono (en Descargas o en WhatsApp): se llama <span class="nw">«pamplanea-copia-${esc(info.copia)}»</span>. Toca «Recuperar» y elígela.</p>
                ${r && r.error ? `<p class="campo-error">${icon('triangle-alert')}<span>${esc(r.error)}</span></p>` : ''}${elegir}</section>`;
        } else {
            cuerpo = `<section class="ay-card ay-card--prim" aria-labelledby="rec-t"><h3 class="ay-h3" id="rec-t">${icon('list-checks', 'ico-s')}No encontramos una copia de tus datos en este teléfono</h3>
                <p class="txt">Puedes empezar tu Primer día: tu ingreso, lo que tienes, tus deudas y tus pagos. Son unos minutos.</p>${deNuevo(true)}</section>`;
        }
        return `${intro}${cuerpo}<p class="fila-s">Los datos de ejemplo quedaron guardados aparte, por si Victor o Pam los necesitan.</p><p class="ay-version">${esc(VERSION)}</p>`;
    }
    /** v2.7 (DATOS-2): las copias internas que se pueden recuperar (ya revisadas), la más nueva primero. */
    function copiasInternas() {
        const out = [];
        for (const k of [...P.almacen.claves(PREFIJO_RESPALDO), CLAVE_RESPALDO]) {
            const c = P.almacen.leer(k, null);
            if (!c || typeof c !== 'object') continue;
            const crudo = k === CLAVE_RESPALDO ? c : c.datos;
            if (!crudo || versionMasNueva(crudo.version)) continue;
            const v = validarDatos(crudo, (k === CLAVE_RESPALDO ? c.actualizado || c.creado : c.fecha) || null);
            if (v.datos) out.push({ clave: k, fecha: diaDe(v.fecha), resumen: v.resumen });
        }
        return out.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
    }
    const descargarTexto = (texto, nombre) => {
        const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
    /**
     * v2.7 (DATOS-2, A04, F20): «Tus datos están a salvo». Sale cuando lo guardado no se puede leer o lo guardó una versión
     * más nueva. No se escribe nada y nunca se empieza de cero: actualizar, recuperar una copia (revisada antes de escribir),
     * guardar lo guardado en un archivo o ver los ejemplos mientras tanto.
     */
    function vistaASalvo() {
        const nueva = bloqueo && bloqueo.estado === 'nueva';
        const r = restaurando;
        const copias = copiasInternas().slice(0, 3);
        const confirmar = r && r.datos
            ? `<div class="nota nota--atencion" role="alertdialog" aria-labelledby="as-c">${icon('triangle-alert')}<div><p id="as-c"><strong>¿Recuperar tus datos con esta copia?</strong> Copia del ${esc(fechaCorta(diaDe(r.fecha) || hoy()))}: ${esc(r.resumen)}. Lo que está guardado ahora también queda en una copia.</p><div class="ay-acc"><button type="button" class="btn" data-a="aSalvoNo" data-fk="as-no">Cancelar</button><button type="button" class="btn btn--prim" data-a="aSalvoSi" data-fk="as-si">Sí, recuperar</button></div></div></div>`
            : '';
        return `<div class="pg pg--flujo a-salvo">
            <header class="pg-head"><h1 class="h1" tabindex="-1">${icon('circle-check', 'ico-s')}Tus datos están a salvo</h1>
            <p class="sub">${nueva ? 'Se guardaron con una versión más nueva de la app. No borramos ni cambiamos nada.' : 'No pudimos abrirlos en esta versión. No borramos ni cambiamos nada.'}</p></header>
            ${nueva ? `<button type="button" class="btn btn--prim btn--48 btn--full" data-a="aSalvoActualizar" data-fk="as-actualizar">Actualizar la app</button><p class="fila-s">Si no cambia, cierra la app y vuelve a abrirla.</p>` : ''}
            <section class="card a-salvo-card" aria-labelledby="as-rec"><h2 class="card-t" id="as-rec">Recuperar una copia</h2>
                ${copias.length ? `<p class="txt">Guardamos ${copias.length === 1 ? 'una copia' : 'copias'} en este teléfono. Lo que anotaste después de ese día no está en la copia.</p><div class="a-salvo-copias">${copias.map((c) => `<button type="button" class="btn btn--48 btn--full" data-a="aSalvoCopia" data-id="${esc(c.clave)}" data-fk="as-copia-${esc(c.fecha)}">Recuperar la copia del ${esc(fechaCorta(c.fecha || hoy()))}</button>`).join('')}</div>` : '<p class="txt">No encontramos una copia en este teléfono.</p>'}
                ${r && r.error ? `<p class="campo-error">${icon('triangle-alert')}<span>${esc(r.error)}</span></p>` : ''}${confirmar}
                <label class="btn btn--48 btn--full" for="as-archivo" data-fk="as-elegir">Elegir un archivo de copia</label><input id="as-archivo" class="sr-only" type="file" accept="application/json,.json,text/plain,.txt" data-copia>
            </section>
            <section class="card a-salvo-card" aria-labelledby="as-guardar"><h2 class="card-t" id="as-guardar">Guárdalos en un archivo</h2>
                <p class="txt">Así los tienes tal como están. Si algo no se arregla, mándaselo a Victor o a Pam.</p>
                <button type="button" class="btn btn--48 btn--full" data-a="aSalvoDescargar" data-fk="as-descargar">Guardar en un archivo</button>
            </section>
            <button type="button" class="link centro" data-a="aSalvoEjemplos" data-fk="as-ejemplos">Mientras tanto, ver los ejemplos</button>
            <p class="ay-version">${esc(VERSION)}</p>
        </div>`;
    }
    P.pantallas.aSalvo = vistaASalvo;
    acc.aSalvoActualizar = () => {
        P.emitir('datos:aSalvo:actualizar');
        if (P.ayuda && P.ayuda.buscarVersion) P.ayuda.buscarVersion();
        else location.reload();
    };
    acc.aSalvoCopia = (d) => {
        const c = P.almacen.leer(d.id, null);
        const crudo = c && (d.id === CLAVE_RESPALDO ? c : c.datos);
        restaurando = crudo ? validarDatos(crudo, (d.id === CLAVE_RESPALDO ? c.actualizado || c.creado : c.fecha) || null) : { error: 'No pudimos leer esa copia.' };
        P.render({ foco: restaurando.error ? '[data-fk="as-elegir"]' : '[data-fk="as-no"]' });
    };
    acc.aSalvoNo = () => {
        restaurando = null;
        P.render({ foco: '[data-fk="as-elegir"]' });
    };
    acc.aSalvoSi = () => {
        const datos = restaurando && restaurando.datos;
        restaurando = null;
        if (datos && restaurar(datos)) P.avisar('Listo: recuperamos tu copia');
        else {
            restaurando = { error: 'Esa copia está incompleta o dañada. No cambiamos nada.' };
            P.render({ foco: '[data-fk="as-elegir"]' });
        }
    };
    acc.aSalvoDescargar = () => {
        const texto = (bloqueo && bloqueo.texto) || P.almacen.leerTexto(CLAVE_USO) || '';
        descargarTexto(texto, `pamplanea-datos-guardados-${hoy()}.txt`);
        P.avisar('Listo: lo guardé en Descargas');
        P.emitir('datos:aSalvo:descargar');
    };
    acc.aSalvoEjemplos = () => {
        restaurando = null;
        entrarEntrenamiento();
        P.avisar('Modo entrenamiento: datos de ejemplo. Tus datos siguen guardados.', { check: false });
        P.emitir('modo:cambio:entrenamiento');
    };

    /**
     * v2.6 (V2-62): «Cuéntale a Victor o a Pam cómo vas». Antes del texto, las dos listas: «Esto se manda» sale de
     * las mismas partes que arman el texto (partesContar) y «Esto NO se manda» es lo que se tapa siempre.
     */
    function vistaContar() {
        const u = usoGuardado();
        const si = partesContar()
            .map((p) => `<li data-parte="${p.id}">${esc(p.lista)}</li>`)
            .join('');
        return `<p class="txt">Al final de la prueba, mándale esto a Victor o a Pam. Tú eliges a quién: toca «Compartir» y elige su chat, o «Copiar» y pégalo.</p>
            <section class="ay-card ct-lista ct-lista--si" aria-labelledby="ct-si-t"><h3 class="ay-h3" id="ct-si-t">${icon('circle-check', 'ico-s')}Esto se manda</h3><ul class="ay-puntos" id="ct-si">${si}</ul></section>
            <section class="ay-card ct-lista ct-lista--no" aria-labelledby="ct-no-t"><h3 class="ay-h3" id="ct-no-t">${icon('ban', 'ico-s')}Esto NO se manda</h3><ul class="ay-puntos" id="ct-no"><li>Montos</li><li>Nombres de tus cuentas, pagos, ahorros, tarjetas y préstamos</li></ul><p class="fila-s">En lo que escribes, los números salen como [monto] y los nombres de tus cosas como [nombre].</p><p class="fila-s">Un monto escrito con letras, como «dos mil», no se tapa. Revisa el texto antes de mandarlo.</p></section>
            <div class="campo-g"><label class="campo-l" for="ct-nombre">Tu nombre o apodo</label><div class="campo"><input id="ct-nombre" data-ct="nombre" type="text" autocomplete="off" value="${esc(nombreContar(u))}"></div></div>
            <div class="campo-g"><label class="campo-l" for="ct-mas">¿Algo más que quieras contarle? <span class="opcional">(opcional)</span></label><textarea id="ct-mas" class="ay-textarea" data-ct="mas" rows="3">${esc(A.contarMas || '')}</textarea></div>
            <section class="ay-card" aria-labelledby="ct-texto-t"><h3 class="ay-h3" id="ct-texto-t">${icon('receipt-text', 'ico-s')}El texto, tal como se manda</h3>${P.ayuda.compartirHtml(textoContar())}</section>`;
    }

    // ------------------------------------------------------------------ acciones
    acc.modoElegir = (d) => {
        A.elegir = false;
        P.ayuda.cerrar({ foco: false });
        if (d.v === 'uso') entrarUso();
        else entrarEntrenamiento({ tour: true });
        P.emitir('modo:elegido:' + d.v);
    };
    acc.modoIntroOk = () => {
        uso.introVista = true;
        guardarUso();
        P.ayuda.cerrar({ foco: false });
        P.render({ nueva: true });
        P.emitir('modo:introUso');
    };
    acc.modoCambiar = (d) => {
        P.ayuda.cerrar({ foco: false });
        if (d.v === 'uso') entrarUso();
        else entrarEntrenamiento({ tour: d.v === 'tour' });
        P.avisar(d.aviso || (d.v === 'uso' ? 'Estás usando tus datos' : 'Modo entrenamiento: datos de ejemplo'), { check: false });
        P.emitir('modo:cambio:' + (d.v === 'tour' ? 'entrenamiento' : d.v));
    };
    /** V2-79: «Mis datos» (arriba, con los ejemplos): a tus datos con un toque; el avance del entrenamiento queda guardado. */
    acc.modoMisDatos = () => {
        const mios = hayDatos();
        acc.modoCambiar({ v: 'uso', aviso: mios ? 'Volviste a tus datos. Tu avance del entrenamiento quedó guardado.' : null });
    };
    /** V2-79: «Recuperar» la copia encontrada o «Empezar de nuevo» (el ejemplo queda apartado, sin borrarse). */
    acc.modoRecuperar = (d) => {
        resolverEjemplo();
        P.ayuda.cerrar({ foco: false });
        if (d.v === 'respaldo') {
            const v = validarDatos(P.almacen.leer(CLAVE_RESPALDO, null));
            if (v.datos && restaurar(v.datos)) {
                P.avisar('Listo: recuperamos tu copia');
                P.emitir('datos:recuperado');
                return;
            }
        }
        P.render({ nueva: true });
        P.emitir('datos:empezarDeNuevo');
    };
    acc.modoCopia = () => {
        descargarCopia();
        P.ayuda.pintar();
        const el = $('[data-fk="dt-copia"]');
        if (el) el.focus();
        P.avisar('Copia descargada: ' + nombreCopia());
    };
    acc.modoCompartirCopia = () => compartirCopia();
    acc.modoRestaurarNo = () => {
        restaurando = null;
        P.ayuda.pintar({ foco: '[data-fk="dt-elegir"]' });
    };
    acc.modoRestaurarSi = () => {
        const datos = restaurando.datos;
        restaurando = null;
        P.ayuda.cerrar({ foco: false });
        if (restaurar(datos)) P.avisar('Listo: restauramos tu copia');
        else P.avisar('Esa copia está incompleta o dañada. No cambiamos nada.', { check: false });
    };
    acc.modoBorrar = (d) => {
        borrar = Number(d.v);
        P.ayuda.pintar({ foco: borrar === 1 ? '[data-fk="dt-b-no"]' : borrar === 2 ? '[data-fk="dt-b2-no"]' : '[data-fk="dt-borrar"]' });
    };
    acc.modoBorrarYa = () => {
        borrar = 0;
        P.ayuda.cerrar({ foco: false });
        borrarTodo();
        P.avisar('Borramos tus datos', { check: false });
    };
    document.addEventListener('change', (e) => {
        const el = e.target;
        if (!el.matches || !el.matches('input[data-copia]') || !el.files || !el.files[0]) return;
        const lector = new FileReader();
        lector.onload = () => {
            restaurando = validarCopia(String(lector.result));
            // v2.7 (DATOS-2): desde «Tus datos están a salvo» (la pantalla, no un panel de Ayuda).
            if (bloqueo && P.modo === 'uso' && !(P.ayuda && P.ayuda.abierto)) P.render({ foco: restaurando.error ? '[data-fk="as-elegir"]' : '[data-fk="as-no"]' });
            else P.ayuda.pintar({ foco: restaurando.error ? '[data-fk="dt-elegir"]' : '[data-fk="dt-r-no"]' });
        };
        lector.readAsText(el.files[0]);
    });
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (!el.dataset || !el.dataset.ct) return;
        if (el.dataset.ct === 'mas') A.contarMas = el.value;
        if (el.dataset.ct === 'nombre') cambiarUsoGuardado({ nombre: el.value });
        const t = $('#ay-texto');
        if (t) t.value = textoContar();
    });

    /**
     * Filas extra del menú de la letra. v2.6 (V2-60): en los dos modos, lo mismo que «Ayuda»: los tres caminos (el de
     * ahora dice «Estás aquí»), «Cuéntale a Victor o a Pam cómo vas», «Tus datos» y la versión (la apariencia ya está arriba).
     */
    function menuExtra(fila) {
        if (P.enGuia) return '';
        const enUso = P.modo === 'uso';
        const filas = [
            fila('smartphone', 'Usarla con mis datos', enUso ? 'Estás aquí' : 'Tu dinero real, solo en este teléfono', 'menuIr', enUso ? 'data-ir="cerrar" aria-current="true"' : 'data-ir="modoUso"'),
            fila('play', 'Aprender a usarla', 'Lo esencial y capítulos cortos, con datos de ejemplo', 'menuIr', 'data-ir="aprendeMas"'),
            fila('list-checks', 'Prueba guiada', 'Tareas cortas para ver si la app se entiende', 'menuIr', 'data-ir="prueba"'),
            // V2-69 (#38): igual que en «Ayuda», «Instalar la app» solo mientras no esté instalada.
            ...(P.ayuda.instalada() ? [] : [fila('circle-plus', 'Instalar la app', 'Para que tus datos no se borren', 'menuIr', 'data-ir="instalar"')]),
            fila('receipt-text', 'Cuéntale a Victor o a Pam cómo vas', 'Qué se manda y qué no', 'menuIr', 'data-ir="contar"'),
            fila('rotate-ccw', 'Tus datos', 'Guardar copia, restaurar o borrar', 'menuIr', 'data-ir="datos"'),
        ];
        return `<p class="campo-l campo-l--sec menu-sec">${enUso ? 'Estás usando tus datos' : 'Estás en modo entrenamiento'}</p><ul class="lista card">${filas.join('')}</ul><p class="ay-version">${esc(VERSION)}</p>`;
    }
    function irMenu(ir) {
        if (ir === 'cerrar') return true;
        if (ir === 'prueba') {
            P.ayuda.abrirPrueba();
            return true;
        }
        if (ir === 'contar' || ir === 'datos' || ir === 'practica' || ir === 'aprendeMas' || ir === 'instalar') {
            P.ayuda.abrir(ir);
            return true;
        }
        if (ir === 'modoUso' || ir === 'modoEntrenamiento' || ir === 'tour') {
            acc.modoCambiar({ v: ir === 'modoUso' ? 'uso' : ir === 'tour' ? 'tour' : 'entrenamiento' });
            return true;
        }
        return false;
    }

    Object.assign(A, {
        arrancar,
        alVolver,
        guardarUso,
        migrarUso,
        validarCopia,
        textoContar,
        sinDatosFinancieros,
        avisosAlAbrir,
        avisoPorId,
        tarjetasHoy,
        revisionHoy,
        preguntasHoy,
        preguntas28,
        casosAntes,
        CLAVE_RESPALDO_ANTES,
        menuExtra,
        irMenu,
        pintarAviso,
        entrenamiento,
        guardarEntrenamiento,
        tipsVistos,
        tipVisto,
        hoy,
        cambiar: (modo, { aviso = null } = {}) => acc.modoCambiar({ v: modo, aviso }),
        /** v2.6: a los ejemplos sin aviso (la prueba guiada empieza enseguida); tus datos quedan guardados. */
        aEntrenamiento: () => entrarEntrenamiento(),
        dejarTusDatos,
        tieneDatos,
        hayDatos,
        esDeEjemplo,
        errores,
        partesContar,
        CLAVE_USO,
        CLAVE_RESPALDO,
        PREFIJO_RESPALDO,
        ESQUEMA,
        // v2.7 (DATOS-1 a DATOS-4): para la app y para las pruebas.
        bloqueado: () => !!bloqueo,
        estadoGuardado: () => leerGuardado().estado,
        problemaDatos,
        validarDatos,
        copiasInternas,
        numerosVisibles,
        congelar,
        lineasNovedades: () => (uso && uso.st ? lineasNovedades(uso) : []),
        novedadesPendientes,
        abrirNovedades,
        iniciar() {
            const pintarApp = P.render;
            P.render = (...args) => {
                pintarApp(...args);
                recordarNombres();
                if (deOtra && P.modo === 'uso' && !P.ui.hoja && !(P.ayuda && P.ayuda.abierto)) setTimeout(sincronizar, 0);
            };
            P.ayuda.registrar('elegir', 'PamPlanea', vistaElegir);
            P.ayuda.registrar('introUso', 'Usarla con mis datos', vistaIntroUso);
            P.ayuda.registrar('datos', 'Tus datos', vistaDatos);
            P.ayuda.registrar('contar', 'Cuéntale a Victor o a Pam cómo vas', vistaContar);
            P.ayuda.registrar('recuperar', 'Revisemos tus datos', vistaRecuperar);
            listo = true;
            pintarAviso();
            // Enlace de tester (?set=A / ?set=B) la primera vez: directo a la prueba guiada, con los ejemplos.
            if (A.elegir && !P.enGuia && /[?&]set=[ab]/i.test(location.search)) {
                A.elegir = false;
                guardarPref({ modo: 'entrenamiento' });
                P.ayuda.abrir('bienvenida');
            } else if (A.elegir && !P.enGuia) P.ayuda.abrir('elegir');
            else if (P.modo === 'uso' && !P.enGuia && infoRecuperar()) P.ayuda.abrir('recuperar');
            else if (P.modo === 'uso' && uso && !uso.introVista) P.ayuda.abrir('introUso');
            // v2.7 (Parte D): el cuadrito de novedades, una sola vez, con sus datos de antes.
            else if (P.modo === 'uso') abrirNovedades();
        },
    });
})();
