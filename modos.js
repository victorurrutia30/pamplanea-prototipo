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
    /** Respaldo intacto de lo guardado antes de migrar (por si acaso: nunca se pierde nada). */
    const CLAVE_RESPALDO = 'pamplanea-uso:respaldo-esquema-1';
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
            // V2-79: un ejemplo guardado por error conserva su persona (así se reconoce y no se muestra como tuyo).
            if (!PERSONAS_EJEMPLO.has(x.st.persona)) x.st.persona = 'uso';
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
    let uso = null;
    /** v2.6.1 (QA H-01): otra pestaña (o Safari y la app instalada a la vez) guardó tus datos y aquí todavía no se cargan. */
    let deOtra = false;
    function leerUso() {
        const crudo = P.almacen.leer(CLAVE_USO, null);
        // Antes de migrar, se guarda una copia intacta (una sola vez).
        if (crudo && typeof crudo === 'object' && (!crudo.esquema || crudo.esquema < ESQUEMA) && !P.almacen.leer(CLAVE_RESPALDO, null)) P.almacen.escribir(CLAVE_RESPALDO, crudo);
        return migrarUso(crudo) || usoVacio();
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
        Object.assign(u, cambios);
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
        // Con datos más nuevos de otra pestaña sin cargar, esta no escribe encima (se cargan primero).
        if (!uso || deOtra) return;
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
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) {
            for (const o of M.ocurrenciasPago(st, p, M.sumarDias(st.hoy, -31), manana)) {
                if (o.estado !== 'vencido' && o.estado !== 'pendiente') continue;
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
    function tarjetasHoy() {
        if (P.modo !== 'uso' || !uso || !P.st.configurado) return [];
        const out = [];
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
            const op = (n) => `<button type="button" class="ay-nota-n" role="radio" aria-checked="${fb.facil === n}" data-a="fbFacil" data-v="${n}" data-fk="fb-${n}"><span class="ay-nota-num">${n}</span></button>`;
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
    const NOMBRE_PANTALLA = { hoy: 'Hoy', pagos: 'Pagos', midinero: 'Mi dinero', mes: 'Mes', anotar: 'Anotar', desglose: 'Detalle del libre', pago: 'Ficha de pago', tarjeta: 'Ficha de tarjeta', apartado: 'Ficha de ahorro', lugar: 'Ficha de lugar', lugares: 'Cuentas', cuentas: 'Cuentas', ahorros: 'Ahorros', deudas: 'Deudas', atencion: 'Necesitan atención', pagarCon: 'Lo pagas con', reservar: 'Reservar', pasarProxima: 'Pasar a la próxima', ingreso: 'Ficha de ingreso', reparte: 'Reparte', aldia: 'Pongámonos al día', menu: 'Menú', cuadrar: 'Cuadrar', pagado: 'Pagado', apartar: 'Ahorrar', pagarYa: 'Pagar ya', mover: 'Mover dinero', moverApartado: 'Mover ahorro', usar: 'Usar ahorro', liberar: 'Sacar de ahorro', meta: 'Editar ahorro', nuevoIngreso: 'Ingreso nuevo o editado', ingresoLlego: 'Me cayó', nuevoPago: 'Pago nuevo', editarPago: 'Editar pago', decidirPago: 'Decidir pago', nuevaDeuda: 'Tarjeta o préstamo', deuda: 'Abonar deuda', estadoCuenta: 'Estado de cuenta', editarRegistro: 'Editar anotación', yaLoUse: 'Ya lo usé', yaNoAplica: 'Ya no aplica', medio: 'Medio de pago', apariencia: 'Apariencia', avisos: 'Avisos', aprende: 'Aprende', espacio: 'Espacio', invitar: 'Invitar' };
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
            { id: 'pantallas', lista: 'Las 5 pantallas que más abriste (solo cuáles, como «Hoy» o «Pagos»)', lineas: [`Pantallas que más usé: ${top.length ? top.join(' · ') : '—'}`] },
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
        if (typeof obj.esquema !== 'number' || obj.esquema > ESQUEMA) return { error: 'Esa copia es de una versión más nueva de la app. Actualiza la app y vuelve a intentarlo.' };
        const datos = migrarUso(obj.datos);
        if (!datos || !datos.st || !Array.isArray(datos.st.lugares) || !Array.isArray(datos.st.registros)) return { error: 'La copia está incompleta o dañada.' };
        // V2-79: una copia guardada después del error trae los datos de ejemplo, no los tuyos.
        if (esDeEjemplo(datos.st)) return { error: 'Esa copia tiene datos de ejemplo, no los tuyos. Busca una copia de antes.' };
        return { datos, fecha: obj.fecha, resumen: `${datos.st.lugares.length} lugares · ${datos.st.pagos.length} pagos · ${datos.st.registros.length} movimientos` };
    }
    function restaurar(datos) {
        // V2-79: nunca se escribe un ejemplo como tus datos (validarCopia ya lo rechaza).
        if (!datos || !datos.st || esDeEjemplo(datos.st)) return;
        uso = datos;
        uso.introVista = true;
        P.almacen.escribir(CLAVE_USO, uso);
        resolverEjemplo();
        entrarUso();
        P.emitir('datos:restaurado');
    }
    function borrarTodo() {
        P.almacen.borrar(CLAVE_USO);
        P.almacen.borrar(CLAVE_RESPALDO);
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
        const hay = !!u.st;
        const copia = u.ultimaCopia ? `Tu última copia: ${fechaCorta(u.ultimaCopia.slice(0, 10))}.` : 'Todavía no has guardado una copia.';
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
                ${r && r.datos ? `<div class="nota nota--atencion" role="alertdialog" aria-labelledby="dt-r-c">${icon('triangle-alert')}<div><p id="dt-r-c"><strong>¿Reemplazar tus datos con esta copia?</strong> Copia del ${esc(fechaCorta((r.fecha || '').slice(0, 10) || hoy()))}: ${esc(r.resumen)}. ${hay ? 'Lo que tienes ahora se reemplaza.' : 'Después verás tus datos.'}</p><div class="ay-acc"><button type="button" class="btn" data-a="modoRestaurarNo" data-fk="dt-r-no">Cancelar</button><button type="button" class="btn btn--peligro" data-a="modoRestaurarSi" data-fk="dt-r-si">${hay ? 'Sí, reemplazar' : 'Sí, restaurar'}</button></div></div></div>` : `<p class="txt">Elige el archivo «pamplanea-copia-…» (.json o .txt). Antes de reemplazar te pido confirmar.</p><label class="btn btn--48 btn--full" for="dt-archivo" data-fk="dt-elegir">Elegir archivo</label><input id="dt-archivo" class="sr-only" type="file" accept="application/json,.json,text/plain,.txt" data-copia>`}</section>
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
                ? `<div class="nota nota--atencion" role="alertdialog" aria-labelledby="dt-r-c">${icon('triangle-alert')}<div><p id="dt-r-c"><strong>¿Recuperar tus datos con esta copia?</strong> Copia del ${esc(fechaCorta((r.fecha || '').slice(0, 10) || hoy()))}: ${esc(r.resumen)}.</p><div class="ay-acc"><button type="button" class="btn" data-a="modoRestaurarNo" data-fk="dt-r-no">Cancelar</button><button type="button" class="btn btn--prim" data-a="modoRestaurarSi" data-fk="dt-r-si">Sí, recuperar</button></div></div></div>`
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
            <section class="ay-card ct-lista ct-lista--no" aria-labelledby="ct-no-t"><h3 class="ay-h3" id="ct-no-t">${icon('ban', 'ico-s')}Esto NO se manda</h3><ul class="ay-puntos" id="ct-no"><li>Montos</li><li>Nombres de tus cuentas, pagos, ahorros, tarjetas y préstamos</li></ul><p class="fila-s">Si escribes alguno en lo que cuentas, lo tapo: sale [monto] o [nombre].</p></section>
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
            const datos = migrarUso(P.almacen.leer(CLAVE_RESPALDO, null));
            if (datos && datos.st && !esDeEjemplo(datos.st)) {
                restaurar(datos);
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
        restaurar(datos);
        P.avisar('Listo: restauramos tu copia');
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
            P.ayuda.pintar({ foco: restaurando.error ? '[data-fk="dt-elegir"]' : '[data-fk="dt-r-no"]' });
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
        ESQUEMA,
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
        },
    });
})();
