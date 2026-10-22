// PRUEBA v2.8 (C-2, APROBADO por Victor 2026-10-21: «Las apruebo»): ninguna pantalla, ayuda, glosario ni entrenamiento
// dice «apartar», «apartado», «reservar» ni «Pagos» como pestaña. La reserva se explica solo en «¿De dónde sale?» (el
// desglose del libre). El intérprete puede seguir aceptando «aparté» (lo que escribe la persona no se revisa).
// Y (APROBADO por Victor, 2026-10-22: «Ese "no, lo pago yo" es vago…» y «como se llama, como le dices?…») tampoco
// «lo pago yo» ni «¿Cómo le dices?»: ahora «¿Con qué lo pagas?» y «Alias (opcional)». Por eso también recorre
// «Completar tu Primer día» (con sus editores abiertos), «Nuevo lugar», «Editar» de una cuenta de banco y «+ Gasto fijo»
// con un banco elegido («¿Se cobra solo?»).
// Recorre, con tus datos (una persona con tarjeta, ahorros dentro y aparte, gastos variables, ahorro programado, un
// préstamo y un cobro con tarjeta) y con los tres ejemplos (Ana, Carlos y Rosa): las 4 pestañas, Mi plan en sus dos vistas,
// cada ficha, cada hoja, los paneles de Ayuda, el glosario, los consejos y todos los textos del entrenamiento.
// Uso: node herramientas/palabras-v28.mjs [--base=http://…/] [--puerto=9966] [--raiz=<otra copia>]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const aqui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const root = args.raiz ? path.resolve(args.raiz) : aqui;
const base = args.base || pathToFileURL(root).href + '/';
const b = await abrir({ puerto: Number(args.puerto || 9966) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const ev = (s) => b.evaluar(s);
await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = '2026-10-21';` });
await b.ir(base + 'telefono.html');
await esperar(700);

/** En la página: recorre todo y junta {donde, texto} de lo que se ve. */
const RECORRER = `(async () => {
    const out = [];
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const tomar = (donde, el) => { const t = (el || document.getElementById('app')).innerText || ''; out.push({ donde, texto: t.replace(/\\s+/g, ' ').trim() }); };
    const ver = (donde) => tomar(donde, document.getElementById('app'));
    const cerrar = () => { if (P.ui.hoja) P.cerrarHoja({ sinFoco: true }); if (P.ayuda && P.ayuda.abierto) P.ayuda.cerrar({ foco: false }); const n = document.getElementById('capa-novedades'); if (n) P.acciones.novedadesOk(); };
    const pantallas = async (quien) => {
        const st = P.st;
        for (const tab of ['hoy', 'pagos', 'midinero', 'mes']) {
            cerrar(); P.irTab(tab); await espera(30); ver(quien + ' · ' + tab);
        }
        for (const [modo, vista] of [['calendario', 'actual'], ['calendario', 'proxima'], ['calendario', 'mes'], ['lista', 'actual']]) {
            // Ajuste 5 (punto 9): «Ver por tipo» con sus secciones abiertas (plegadas no se leen).
            P.ui.pagosModo = modo; P.ui.pagosVista = vista; P.ui.planAbiertas = { ingresos: true, fijos: true, variables: true, ahorro: true, deudas: true }; P.irTab('pagos'); await espera(30); ver(quien + ' · Mi plan ' + modo + ' ' + vista);
        }
        // Ajuste 5 (punto 5): «Por confirmar» es su propia pantalla.
        const fichas = [['cuentas'], ['ahorros'], ['deudas'], ['avisos'], ['espacio'], ['aprende'], ['porConfirmar'],
            ...st.pagos.map((p) => ['pago', p.id]), ...st.tarjetas.map((t) => ['tarjeta', t.id]), ...st.ingresos.map((i) => ['ingreso', i.id]),
            ...st.lugares.map((l) => ['lugar', l.id]), ...st.apartados.map((a) => ['apartado', a.id]), ...(st.variables || []).map((v) => ['variable', v.id])];
        for (const [tipo, id] of fichas) {
            cerrar(); P.irTab('midinero'); P.abrir(tipo, id); await espera(20); ver(quien + ' · ficha ' + tipo + (id ? ' ' + id : ''));
        }
        const a0 = st.apartados[0] && st.apartados[0].id;
        const p0 = st.pagos.find((p) => p.activo !== false && MOTOR.porPagar(st, p));
        const t0 = st.tarjetas[0];
        const v0 = (st.variables || [])[0];
        const g0 = st.registros.find((r) => r.tipo === 'gasto');
        const hojas = [['anotar', {}], ['nuevoPago', {}], ['nuevoPago', { fecha: 'variable' }], ['nuevaDeuda', { tipoInicial: 'tarjeta' }], ['nuevaDeuda', { tipoInicial: 'prestamo' }], ['nuevoIngreso', {}], ['apartar', {}], ['programar', {}], ['menu', {}], ['atencion', {}], ['cuadrar', {}], ['mover', {}], ['lugar', {}],
            ...(a0 ? [['apartar', { id: a0 }], ['liberar', { id: a0 }], ['meta', { id: a0 }], ['usar', { id: a0 }], ['dondeAhorro', { id: a0 }], ['programar', { id: a0 }], ['moverApartado', { id: a0 }]] : []),
            ...(p0 ? [['pagado', { tipoPago: 'pago', id: p0.id, fecha: MOTOR.porPagar(st, p0).fecha }], ['editarPago', { id: p0.id }], ['pagarCon', { id: p0.id, fecha: MOTOR.porPagar(st, p0).fecha }], ['yaNoAplica', { id: p0.id }]] : []),
            ...(t0 ? [['estadoCuenta', { id: t0.id }], ['nuevaDeuda', { id: t0.id }], ['pagado', { tipoPago: 'tarjeta', id: t0.id, fecha: MOTOR.tarjetaInfo(st, t0).vence }]] : []),
            ...(v0 ? [['editarVariable', { id: v0.id }]] : []), ...(g0 ? [['editarRegistro', { id: g0.id }]] : [])];
        for (const [tipo, datos] of hojas) {
            cerrar();
            try { P.abrirHoja(tipo, { ...datos }); await espera(20); tomar(quien + ' · hoja ' + tipo, document.getElementById('capa-hoja')); } catch (e) { out.push({ donde: quien + ' · hoja ' + tipo, error: e.message }); }
        }
        // v2.8 (Victor, 2026-10-22): las cuentas de banco, «+ Gasto fijo» con un banco o una tarjeta y «Completar tu Primer día».
        const banco0 = st.lugares.find((l) => l.tipo === 'banco');
        for (const [tipo, datos] of [['lugar', {}], ...(banco0 ? [['lugar', { id: banco0.id }]] : [])]) {
            cerrar();
            try { P.abrirHoja(tipo, { ...datos }); await espera(20); tomar(quien + ' · hoja ' + tipo + (datos.id ? ' ' + datos.id : ''), document.getElementById('capa-hoja')); } catch (e) { out.push({ donde: quien + ' · hoja ' + tipo, error: e.message }); }
        }
        const cobraSolo = MOTOR.puedeCobrarSolo || ((s, id) => !!(MOTOR.medio(s, id) || {}).tarjeta);
        const mb = st.medios.find((m) => !m.oculto && cobraSolo(st, m.id));
        if (mb) {
            cerrar(); P.abrirHoja('nuevoPago', {}); P.ui.hoja.medio = mb.id; P.render(); await espera(20);
            tomar(quien + ' · hoja nuevoPago con ' + mb.nombre, document.getElementById('capa-hoja'));
        }
        try {
            cerrar(); P.acciones.obCompletar(); await espera(20);
            for (const paso of [3, 4, 5]) { P.ui.ob.paso = paso; P.ui.ob.editando = null; P.render(); await espera(20); ver(quien + ' · Primer día paso ' + paso); }
            P.ui.ob.paso = 4; P.acciones.obTarjetaNueva(); P.acciones.obValor({ campo: 't-banco', v: 'Otro' }); await espera(20); ver(quien + ' · Primer día tarjeta');
            P.ui.ob.editando = null; P.ui.ob.paso = 5; P.acciones.obPago({ v: 'luz' }); await espera(20);
            const conBanco = [...document.querySelectorAll('[data-campo="p-paga"], [data-campo="p-cobro"]')].map((x) => x.dataset.v).find((v) => /^[TtLb]:/.test(v) && v !== 'L:efectivo');
            if (conBanco) { P.acciones.obValor({ campo: document.querySelector('[data-campo="p-paga"]') ? 'p-paga' : 'p-cobro', v: conBanco }); await espera(20); }
            ver(quien + ' · Primer día gasto fijo');
            P.ui.ob.editando = null; P.acciones.obSuscripcion(); await espera(20); ver(quien + ' · Primer día suscripción');
            P.acciones.obCerrar(); await espera(20);
        } catch (e) { out.push({ donde: quien + ' · Primer día', error: e.message }); }
        // Anotar con cada atajo y con frases.
        for (const atajo of ['gasto', 'ingreso', 'pagoDeuda', 'apartar', 'mover', 'cuadre']) {
            cerrar(); P.acciones.anotar(); P.acciones.anotarAtajo({ v: atajo }); await espera(20); tomar(quien + ' · Anotar ' + atajo, document.getElementById('capa-hoja'));
        }
        for (const frase of ['aparté 50 emergencias', 'ahorré 20 emergencias', 'saqué 20 de emergencias', 'súper 20', 'pagué 35', 'me prestaron 200', 'luz 35']) {
            cerrar(); P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = frase; q.dispatchEvent(new Event('input', { bubbles: true })); await espera(20);
            // Lo que escribió la persona no se revisa (el intérprete acepta «aparté»): solo lo que la app responde.
            q.value = ''; tomar(quien + ' · Anotar «' + frase + '»', document.getElementById('anotar-cuerpo'));
        }
        cerrar();
        // El desglose del libre («¿De dónde sale?»): ahí sí se puede explicar la reserva.
        P.abrirHoja('desglose', {}); await espera(20); out.push({ donde: quien + ' · ¿De dónde sale?', texto: (document.getElementById('capa-hoja').innerText || '').replace(/\\s+/g, ' '), desglose: true });
        cerrar();
        // Los paneles de Ayuda.
        for (const panel of ['inicio', 'bienvenida', 'instalar', 'datos', 'contar', 'introUso', 'elegir', 'aprendeMas', 'practica', 'comoSeHace']) {
            try { P.ayuda.abrir(panel); await espera(20); tomar(quien + ' · Ayuda ' + panel, document.getElementById('capa-ayuda')); } catch (e) { out.push({ donde: quien + ' · Ayuda ' + panel, error: e.message }); }
            cerrar();
        }
        out.push({ donde: quien + ' · barra de abajo', texto: [...document.querySelectorAll('#nav .nav-t')].map((x) => x.textContent).join(' · '), nav: true });
    };
    // 1) Con tus datos.
    const s = DATOS.crearAna();
    Object.assign(s, { persona: 'uso', nombre: 'Marta', hoy: '2026-10-21', inicio: '2026-10-01' });
    s.apartados.push({ id: 'alc', nombre: 'Alcancía', emoji: '🏺', portada: 'general-alcancia', monto: 5000, meta: null, metaFecha: null, historial: [{ fecha: '2026-10-20', tipo: 'inicial', monto: 5000 }], donde: 'aparte', programado: { monto: 1000, desde: '2026-10-15' } });
    s.variables = [{ id: 'v1', nombre: 'Súper', emoji: '🛒', categoria: 'super', tope: 15000, medio: 'debito', desde: '2026-10-15', creado: '2026-10-15', cierres: {}, activo: true }];
    s.pagos.push({ id: 'netflix', nombre: 'Netflix', emoji: '🎬', categoria: 'suscripciones', monto: 1000, estimado: false, frecuencia: 'mensual', dia: 24, medio: 'bac', tipoPago: 'suscripcion', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [] });
    s.pagos.push({ id: 'prest', nombre: 'Préstamo de Mamá', emoji: '🤝', categoria: 'cuotas', monto: 0, estimado: false, frecuencia: 'fechas', fechas: [], medio: 'efectivo', avisos: [], desde: '2026-10-21', creado: '2026-10-21', hechos: {}, previos: [], tipoDeuda: 'prestamo', deuda: { debe: 20000 }, sinCuota: true });
    P.modos.cambiar && P.modos.cambiar('uso');
    await espera(100);
    cerrar();
    P.sinGuardar = true;
    P.cargar(s, { tab: 'hoy' });
    await pantallas('tus datos');
    // 2) Los ejemplos.
    for (const persona of ['ana', 'carlos', 'rosa']) {
        P.cargarPersona(persona);
        await espera(60);
        cerrar();
        await pantallas(persona);
    }
    // 3) El glosario, los consejos y el entrenamiento (todo su texto).
    for (const g of window.GLOSARIO) for (const v of [false, true]) { const x = window.terminoGlosario(g.id, v); if (x) out.push({ donde: 'glosario ' + g.id, texto: [x.t, x.para, x.ejemplo].join(' ') }); }
    for (const [k, t] of Object.entries(window.TIPS || {})) out.push({ donde: 'consejo ' + k, texto: String(t) });
    const vistos = new Set();
    const caminar = (x, donde) => {
        if (!x || vistos.has(x)) return;
        if (typeof x === 'string') { out.push({ donde, texto: x }); return; }
        if (typeof x === 'function') { if (x.length === 0) { try { const r = x(); if (typeof r === 'string') out.push({ donde, texto: r }); } catch {} } return; }
        if (typeof x !== 'object') return;
        vistos.add(x);
        for (const [k, v] of Object.entries(x)) if (!['sel', 'clave', 'claves', 'id', 'g', 'persona', 'variante', 'fk'].includes(k)) caminar(v, donde);
    };
    for (const v of Object.values(P.tour.VERSIONES)) for (const cap of v.caps) caminar(cap, 'entrenamiento ' + v.id + ':' + (cap.id || ''));
    return out;
})()`;

const textos = await ev(RECORRER);
// Las palabras que no se dicen (C-2). «Pagos» como pestaña: en la barra de abajo y como nombre de pantalla.
// («aparte» sí se dice: es el ahorro que está fuera de tus cuentas, C-1.)
const PROHIBIDAS = /\b(apart(ar|ado|ados|ada|adas|é|aste|amos|aron)|reserv(ar|ado|ada|ados|adas|ando|é|aste|a|as|amos|aron|e|o|ación|aciones))\b/i;
// v2.8 (Victor, 2026-10-22): «No, lo pago yo» y «¿Cómo le dices?» ya no se dicen (también en «¿De dónde sale?»). Y (ajuste 2,
// D-2 corregida, APROBADO por Victor 2026-10-22) tampoco «¿Siempre es el mismo monto?»: fijo o variable no se decide por el monto.
// Ajuste 3 (FM-8, APROBADO por Victor 2026-10-22): «pago» como sustantivo solo para deudas: tampoco «Otro pago», «¿Cuál pago?» ni
// «¿Qué pago?».
// Ajuste 4 (APROBADO por Victor 2026-10-22): tampoco «¿Qué pasó?» ni «Tasas municipales».
const YA_NO = /\blo pago yo\b|¿\s*c[oó]mo le dices\s*\?|siempre es el mismo monto|\botro pago\b|¿\s*cu[aá]l pago\s*\?|¿\s*qu[eé] pago\s*\?|¿\s*qu[eé] pas[oó]\s*\?|tasas municipales/i;
const malas = [];
const errores = [];
for (const x of textos) {
    if (x.error) errores.push(`${x.donde}: ${x.error}`);
    if (!x.texto) continue;
    if (x.nav && /\bPagos\b/.test(x.texto)) malas.push(`${x.donde}: «${x.texto}»`);
    // «¿De dónde sale?» puede explicar la reserva (C-2); ahí solo se revisan «apartar» y «apartado».
    const re = x.desglose ? /\bapart(ar|ado|ados|ada|adas|é|aste|amos|aron)\b/i : PROHIBIDAS;
    const m = re.exec(x.texto);
    if (m) malas.push(`${x.donde}: «…${x.texto.slice(Math.max(0, m.index - 50), m.index + 50)}…»`);
    const y = YA_NO.exec(x.texto);
    if (y) malas.push(`${x.donde}: «…${x.texto.slice(Math.max(0, y.index - 50), y.index + 50)}…»`);
    // «Pagos» como nombre de la pestaña (en una frase como «en Pagos», «Ver en Pagos», «Toca «Pagos»»).
    const tab = /\b(en|a|de|Toca|Ve a|Abre|Ver en)\s+«?Pagos\b/.exec(x.texto);
    if (tab) malas.push(`${x.donde}: «…${x.texto.slice(Math.max(0, tab.index - 40), tab.index + 40)}…»`);
}
const unicas = [...new Set(malas)];
const resultado = { version: await ev('window.VERSION_PROTOTIPO').catch(() => null), revisados: textos.length, fallos: unicas, errores: [...errores, ...b.errores] };
console.log(JSON.stringify(resultado, null, 1));
b.cerrar();
process.exit(unicas.length || errores.length || b.errores.length ? 1 : 0);
