// v2.6.1 · QA PROFUNDO (V2-64, V2-70). Recorre crear, editar, eliminar y deshacer de cada cosa con el código real de la
// app (las mismas hojas y acciones que toca la persona) y, después de cada acción, revisa invariantes: nada huérfano
// (pagos que salen de un lugar o medio que ya no existe, ingresos que caen en un lugar borrado, «pagado» sin su gasto),
// nada contado dos veces (tarjetas, pagos de tarjeta, suscripciones, cuotas, Anotar) y los números como dicen los
// acuerdos. Cada caso lleva el ID de la matriz del LEEME (A = CRUD, B = cascadas, C = duplicados, D = números,
// E = fechas, F = validaciones, H = persistencia, L = rendimiento).
// Uso: node herramientas/qa-v261.mjs [--base=http://…/] [--solo=A04,C03] [--puerto=9965]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const solo = args.solo ? args.solo.split(',') : null;
const salida = path.join(root, 'capturas', 'qa-v261' + (args.base ? '-servida' : ''));
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9965) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const ev = (s) => b.evaluar(s);
const js = (x) => JSON.stringify(x);
const informe = { base, casos: [], errores: b.errores, fallidas: b.fallidas };

/** Herramientas dentro de la página: invariantes, fotos del dinero y atajos a las hojas reales. */
const AYUDA = `(() => {
    const QA = (window.QA = {});
    QA.k = () => MOTOR.calcular(P.st);
    QA.dinero = () => {
        const k = QA.k();
        const st = P.st;
        const mes = MOTOR.resumenMes(st, ...MOTOR.partes(st.hoy).slice(0, 2));
        return { libre: k.libre, tienes: k.tienes, apartado: k.apartado, porPagar: k.porPagar, enTarjetas: k.enTarjetas, reservado: k.reservadoPagos + k.reservadoProxima + k.reservadoTarjetas,
            lugares: Object.fromEntries(st.lugares.map((l) => [l.id, MOTOR.saldoLugar(st, l.id)])),
            tarjetas: Object.fromEntries(k.tarjetas.map((t) => [t.t.id, { debe: t.debeTotal, enLibre: t.enLibre, compras: t.comprasTotal }])),
            salio: mes.salio, entro: mes.entro, gastos: st.registros.filter((r) => r.tipo === 'gasto').length };
    };
    /** Lo que nunca debe pasar, en cualquier estado. */
    QA.revisar = () => {
        const st = P.st;
        const f = [];
        const medio = (id) => st.medios.find((m) => m.id === id);
        const lugar = (id) => st.lugares.find((l) => l.id === id);
        const tarjeta = (id) => st.tarjetas.find((t) => t.id === id);
        for (const p of st.pagos.filter((x) => x.activo !== false && !x.descuento)) {
            const m = medio(p.medio);
            if (!m) f.push('pago «' + p.nombre + '»: sin medio');
            else if (m.oculto) f.push('pago «' + p.nombre + '»: sale de un medio eliminado (' + m.nombre + ')');
            else if (m.tarjeta ? !tarjeta(m.tarjeta) : !lugar(m.lugar)) f.push('pago «' + p.nombre + '»: su medio no lleva a ningún lugar ni tarjeta');
        }
        for (const p of st.pagos) for (const [fe, h] of Object.entries(p.hechos || {})) if (h.registro && !st.registros.some((r) => r.id === h.registro)) f.push('pago «' + p.nombre + '» ' + fe + ': marcado pagado sin su gasto');
        for (const r of st.registros.filter((x) => x.pago && x.nuevo)) {
            const p = st.pagos.find((x) => x.id === r.pago);
            if (p && !Object.values(p.hechos || {}).some((h) => h.registro === r.id)) f.push('gasto «' + r.nombre + '»: dice que es de Pagos y su pago no lo tiene');
        }
        for (const i of st.ingresos.filter((x) => x.activo !== false)) if (!lugar(i.lugar)) f.push('ingreso «' + i.nombre + '»: llega a un lugar que no existe');
        for (const t of st.tarjetas) if (!st.medios.some((m) => m.tarjeta === t.id && !m.oculto)) f.push('tarjeta «' + t.nombre + '»: no se puede elegir para pagar');
        for (const x of st.reservasTarjeta || []) if (!tarjeta(x.tarjeta)) f.push('reserva para una tarjeta que no existe');
        for (const p of st.pagos) if (p.deuda && p.deuda.debe !== null && p.deuda.debe !== undefined && !(Number.isInteger(p.deuda.debe) && p.deuda.debe >= 0)) f.push('deuda «' + p.nombre + '»: lo que debes no es un monto');
        for (const a of st.apartados) if (!(Number.isInteger(a.monto) && a.monto >= 0)) f.push('ahorro «' + a.nombre + '»: monto inválido');
        const k = QA.k();
        for (const v of ['libre', 'tienes', 'porPagar', 'enTarjetas']) if (!Number.isInteger(k[v])) f.push(v + ' no es un número entero de centavos');
        if (k.libre < 0) f.push('libre negativo');
        return f;
    };
    /** Una hoja real: se abre, se llenan sus campos (como al escribir) y se toca su botón. */
    QA.hoja = (tipo, datos = {}, campos = {}, accion = null) => {
        P.abrirHoja(tipo, datos);
        const h = P.ui.hoja;
        Object.assign(h, campos);
        if (accion) {
            P.acciones[accion]({});
            // v2.6.6 (V2-85): si al guardar apareció «¿ya lo pagaste?» (su fecha de este periodo ya pasó), se guarda con «Sí».
            if (P.ui.hoja === h && document.querySelector("#antes-t")) P.acciones[accion]({});
        }
        return h;
    };
    QA.anotar = (frase, extra = {}) => {
        P.acciones.anotar();
        const q = document.getElementById('anotar-q');
        q.value = frase;
        q.dispatchEvent(new Event('input', { bubbles: true }));
        Object.assign(P.ui.hoja.d || {}, extra);
        const d = P.ui.hoja.d ? { ...P.ui.hoja.d } : null;
        P.acciones.anotarGuardar();
        return d;
    };
    QA.pago = (nombre) => P.st.pagos.find((p) => p.nombre === nombre);
    QA.ocurrencia = (p) => MOTOR.ocurrenciasPago(P.st, p, MOTOR.sumarDias(P.st.hoy, -40), MOTOR.sumarDias(P.st.hoy, 40)).find((o) => o.estado === 'pendiente' || o.estado === 'vencido');
    QA.copia = () => JSON.stringify(P.st);
    /** v2.6.5 (V2-80): si la fecha todavía no llega, la app pregunta «¿Ya lo pagaste por adelantado?»: «Sí, ya lo pagué». */
    QA.confirmar = () => {
        const si = document.querySelector('[data-fk="dlg-si"]');
        if (si) si.click();
    };
    return true;
})()`;

async function cargar(persona = 'ana') {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#persona=' + persona + '&tema=serena-claro');
    await esperar(250);
    await ev(AYUDA);
}
const casos = [];
const caso = (id, area, titulo, prioridad, fn) => casos.push({ id, area, titulo, prioridad, fn });
/** El resultado de un caso: lo que se esperaba (según el acuerdo o el motor) y lo que pasó. */
function revisarCaso(c, fallas, detalle = null) {
    informe.casos.push({ id: c.id, area: c.area, titulo: c.titulo, prioridad: c.prioridad, ok: !fallas.length, fallas, detalle });
}
const dif = (a, d) => Object.fromEntries(Object.keys(d).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(d[k])).map((k) => [k, [a[k], d[k]]]));

// ============================================================ A · CRUD y B · cascadas
caso('A-L1', 'A', 'Crear un lugar (banco con débito): su primer cuadre y su débito', 'P2', async () => {
    await cargar();
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('lugar', {}, { clase: 'banco', nombre: 'Banco Cuscatlán', monto: '250', debito: true }, 'lugarOk'); true`);
    const d = await ev('QA.dinero()');
    const x = await ev(`(() => { const l = P.st.lugares.find((l) => l.nombre === 'Banco Cuscatlán'); return l && { cuadre: !!l.cuadre, debito: P.st.medios.some((m) => m.lugar === l.id && m.tarjetaDebito) }; })()`);
    return [...(d.tienes - a.tienes === 25000 ? [] : [`Tienes subió ${d.tienes - a.tienes}, no 25000`]), ...(x && x.cuadre && x.debito ? [] : ['sin cuadre o sin débito']), ...(await ev('QA.revisar()'))];
});
caso('B-L1', 'B', 'Eliminar un lugar con pagos que salen de él y un ingreso que cae ahí (Banco Agrícola de Ana)', 'P1', async () => {
    await cargar();
    await ev(`QA.hoja('lugar', { id: 'agricola' }, { confirmarEliminar: true }); P.acciones.lugarEliminar(); true`);
    return ev('QA.revisar()');
});
caso('B-L2', 'B', 'Después de eliminar un lugar, «Pagado» de un pago que salía de ahí resta el dinero (no desaparece)', 'P1', async () => {
    await cargar();
    await ev(`QA.hoja('lugar', { id: 'agricola' }, { confirmarEliminar: true }); P.acciones.lugarEliminar(); true`);
    const a = await ev('QA.dinero()');
    const r = await ev(`(() => { const p = QA.pago('Internet'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) { P.acciones.pagadoGuardar(); } return { monto: o.monto }; })()`);
    const d = await ev('QA.dinero()');
    return d.tienes === a.tienes - r.monto ? [] : [`Tienes ${a.tienes} → ${d.tienes}: el pago de ${r.monto} no salió de ningún lugar`];
});
caso('B-L3', 'B', 'Después de eliminar un lugar, «¿Ya llegó?» de un ingreso que caía ahí suma a un lugar que existe', 'P1', async () => {
    await cargar();
    await ev(`P.st.hoy = '2026-10-30'; P.render(); QA.hoja('lugar', { id: 'agricola' }, { confirmarEliminar: true }); P.acciones.lugarEliminar(); true`);
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('ingresoLlego', { id: 'quincena', fecha: '2026-10-30' }, { monto: '600' }, 'ingresoLlegoOk'); true`);
    const d = await ev('QA.dinero()');
    return d.tienes === a.tienes + 60000 ? [] : [`Tienes ${a.tienes} → ${d.tienes}: los $600 no entraron a ningún lugar`];
});
caso('B-M1', 'B', 'Eliminar un medio que usan pagos (Transferencia: Colegio y Casa comercial)', 'P2', async () => {
    await cargar();
    await ev(`QA.hoja('medio', { id: 'transferencia' }, { confirmarEliminar: true }); P.acciones.medioEliminar(); true`);
    return ev('QA.revisar()');
});
caso('B-T1', 'B', 'Eliminar una tarjeta con una suscripción que se cobra en ella', 'P1', async () => {
    await cargar();
    await ev(`(() => { const p = P.crearPago(P.st, { nombre: 'Netflix', emoji: '🎬', categoria: 'suscripciones', monto: 1099, frecuencia: 'mensual', dia: 28, medio: 'bac', tipoPago: 'suscripcion' }); P.render(); return true; })()`);
    await ev(`QA.hoja('nuevaDeuda', { tarjetaId: 'bac' }, { confirmarEliminar: true }); P.acciones.tarjetaEliminar(); true`);
    const f = await ev('QA.revisar()');
    const a = await ev('QA.dinero()');
    await ev(`(() => { const p = QA.pago('Netflix'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); return true; })()`);
    const d = await ev('QA.dinero()');
    const sumaTarjetas = (x) => Object.values(x.tarjetas).reduce((s, t) => s + t.enLibre, 0);
    if (d.tienes === a.tienes && sumaTarjetas(d) === sumaTarjetas(a)) f.push('al marcar Netflix como pagado, sus $10.99 no salieron de ningún lugar ni quedaron en ninguna tarjeta');
    return f;
});
caso('B-T2', 'B', 'Eliminar una tarjeta con compras: las compras quedan en el historial y en Mes', 'P2', async () => {
    await cargar();
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('nuevaDeuda', { tarjetaId: 'bac' }, { confirmarEliminar: true }); P.acciones.tarjetaEliminar(); true`);
    const d = await ev('QA.dinero()');
    return d.salio === a.salio && d.gastos === a.gastos ? [] : ['Mes cambió al eliminar la tarjeta'];
});
caso('A-D1', 'A', 'Agregar tres deudas seguidas (préstamo, casa comercial, otro préstamo)', 'P2', async () => {
    await cargar('nueva');
    await ev(`(() => { const s = DATOS.crearAna(); P.cargar(s, { tab: 'hoy' }); return true; })()`);
    for (const [tipo, nombre, cuota, dia] of [['prestamo', 'Préstamo de la cooperativa', '45', '15'], ['casacomercial', 'Almacén La Esquina', '25', '28'], ['prestamo', 'Préstamo del carro', '120', '5']]) {
        await ev(`QA.hoja('nuevaDeuda', {}, { tipoDeuda: ${js(tipo)}, nombre: ${js(nombre)}, cuota: ${js(cuota)}, dia: ${js(dia)} }, 'nuevaDeudaOk'); true`);
    }
    const n = await ev(`P.st.pagos.filter((p) => ['Préstamo de la cooperativa', 'Almacén La Esquina', 'Préstamo del carro'].includes(p.nombre) && p.tipoDeuda).length`);
    return [...(n === 3 ? [] : [`quedaron ${n} de 3`]), ...(await ev('QA.revisar()'))];
});
caso('A-D2', 'A', 'Una deuda sin «¿cuánto debes?»: «Anotar cuánto debo» abre y guarda', 'P2', async () => {
    await cargar();
    await ev(`QA.hoja('nuevaDeuda', {}, { tipoDeuda: 'prestamo', nombre: 'Préstamo de mi tía', cuota: '20', dia: '10' }, 'nuevaDeudaOk'); true`);
    const id = await ev(`QA.pago('Préstamo de mi tía').id`);
    let f = [];
    try {
        await ev(`QA.hoja('deuda', { id: ${js(id)} }, { monto: '300' }, 'deudaOk'); true`);
        const debe = await ev(`QA.pago('Préstamo de mi tía').deuda && QA.pago('Préstamo de mi tía').deuda.debe`);
        if (debe !== 30000) f.push(`quedó ${debe}, no 30000`);
    } catch (e) {
        f.push('se rompe: ' + String(e.message).slice(0, 120));
    }
    return f;
});
caso('A-D3', 'A', '«Pagado» de una cuota baja lo que debes; «Desmarcar» lo devuelve exacto (aunque se pase de lo que debías)', 'P2', async () => {
    await cargar();
    await ev(`QA.hoja('nuevaDeuda', {}, { tipoDeuda: 'prestamo', nombre: 'Préstamo chico', cuota: '35', dia: '25', debe: '20' }, 'nuevaDeudaOk'); true`);
    const r = await ev(`(() => { const p = QA.pago('Préstamo chico'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); const reg = P.st.registros.find((x) => x.pago === p.id); const despues = QA.pago('Préstamo chico').deuda.debe; QA.hoja('editarRegistro', { id: reg.id }); P.acciones.desmarcarPagado(); return { despues, final: QA.pago('Préstamo chico').deuda.debe }; })()`);
    return [...(r.despues === 0 ? [] : [`después de pagar: ${r.despues}`]), ...(r.final === 2000 ? [] : [`al desmarcar volvió a ${r.final}, no a 2000`]), ...(await ev('QA.revisar()'))];
});
caso('A-D4', 'A', 'Editar una cuota ya pagada (monto) mantiene lo que debes coherente', 'P2', async () => {
    await cargar();
    await ev(`QA.hoja('nuevaDeuda', {}, { tipoDeuda: 'prestamo', nombre: 'Préstamo P', cuota: '50', dia: '25', debe: '500' }, 'nuevaDeudaOk'); true`);
    const r = await ev(`(() => { const p = QA.pago('Préstamo P'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); const reg = P.st.registros.find((x) => x.pago === p.id); QA.hoja('editarRegistro', { id: reg.id }, { monto: '60' }, 'editarRegistroOk'); return QA.pago('Préstamo P').deuda.debe; })()`);
    return r === 44000 ? [] : [`debe ${r}, no 44000`];
});
caso('A-P1', 'A', 'Pago mensual: crear, editar monto, Pagado, corregir el pagado, desmarcar y «Ya no aplica»', 'P2', async () => {
    await cargar();
    const f = [];
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('nuevoPago', {}, { nombre: 'Gimnasio', monto: '20', frecuencia: 'mensual', dia: '27', medio: 'efectivo' }, 'nuevoPagoOk'); true`);
    const d1 = await ev('QA.dinero()');
    if (a.libre - d1.libre !== 2000) f.push(`crear: libre bajó ${a.libre - d1.libre}, no 2000`);
    const id = await ev(`QA.pago('Gimnasio').id`);
    await ev(`QA.hoja('editarPago', { id: ${js(id)} }, { monto: '25' }, 'nuevoPagoOk'); true`);
    const d2 = await ev('QA.dinero()');
    if (a.libre - d2.libre !== 2500) f.push(`editar: libre bajó ${a.libre - d2.libre}, no 2500`);
    await ev(`(() => { const p = QA.pago('Gimnasio'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); return true; })()`);
    const d3 = await ev('QA.dinero()');
    if (d3.libre !== d2.libre) f.push(`Pagado: el libre cambió ${d2.libre} → ${d3.libre} (ya estaba contado)`);
    if (d3.lugares.efectivo !== a.lugares.efectivo - 2500) f.push('Pagado: el efectivo no bajó $25');
    const reg = await ev(`P.st.registros.find((r) => r.pago === ${js(id)}).id`);
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }, { monto: '30' }, 'editarRegistroOk'); true`);
    const hecho = await ev(`Object.values(QA.pago('Gimnasio').hechos)[0].monto`);
    if (hecho !== 3000) f.push(`corregir: el pago dice ${hecho}, el gasto 3000`);
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }); P.acciones.desmarcarPagado(); true`);
    const d4 = await ev('QA.dinero()');
    if (d4.lugares.efectivo !== a.lugares.efectivo || d4.libre !== d2.libre) f.push('desmarcar: no volvió a como estaba');
    await ev(`P.abrir('pago', ${js(id)}); QA.hoja('yaNoAplica', { id: ${js(id)} }, {}, 'yaNoAplicaOk'); true`);
    const d5 = await ev('QA.dinero()');
    if (d5.libre !== a.libre) f.push(`«Ya no aplica»: el libre no volvió (${a.libre} → ${d5.libre})`);
    return [...f, ...(await ev('QA.revisar()'))];
});
caso('A-I1', 'A', 'Ingreso esperado: crear, editar monto y eliminar (sin llegadas se borra; con llegadas queda en el historial)', 'P2', async () => {
    await cargar();
    const f = [];
    await ev(`QA.hoja('nuevoIngreso', {}, { tipoIng: 'remesa', nombre: 'Remesa de mi hermano', monto: '150', frecuencia: 'mensual', dia: '10', lugar: 'efectivo' }, 'nuevoIngresoOk'); true`);
    const id = await ev(`P.st.ingresos.find((i) => i.nombre === 'Remesa de mi hermano')?.id`);
    if (!id) return ['no se creó'];
    await ev(`QA.hoja('nuevoIngreso', { id: ${js(id)} }, { monto: '175' }, 'nuevoIngresoOk'); true`);
    if ((await ev(`MOTOR.ingreso(P.st, ${js(id)}).monto`)) !== 17500) f.push('no se editó el monto');
    await ev(`QA.hoja('nuevoIngreso', { id: ${js(id)} }); P.acciones.ingresoEliminar(); true`);
    if (await ev(`!!MOTOR.ingreso(P.st, ${js(id)})`)) f.push('sin llegadas, sigue en la lista');
    return [...f, ...(await ev('QA.revisar()'))];
});
caso('B-I1', 'B', 'Eliminar el ingreso principal: lo que pagabas con «la del 30» sigue contando', 'P1', async () => {
    await cargar();
    const r = await ev(`(() => {
        const st = P.st;
        const p = QA.pago('Colegio');
        const o = MOTOR.ocurrenciasPago(st, p, '2026-11-01', '2026-11-30')[0];
        p.asignaciones = { [o.fecha]: [{ de: '2026-10-30', monto: o.monto }] };
        const total = (k) => k.items.concat(k.reservados).reduce((s, x) => s + x.parte, 0) + Object.values(k.futuro).flat().reduce((s, x) => s + x.parte, 0);
        const cuenta = (k) => k.items.concat(k.reservados, Object.values(k.futuro).flat()).filter((x) => x.pago.id === p.id && x.fecha === o.fecha).reduce((s, x) => s + x.parte, 0) + (k.periodos || []).flatMap((x) => x.partes).filter((x) => x.pago.id === p.id && x.fecha === o.fecha).reduce((s, x) => s + x.parte, 0);
        const antes = cuenta(MOTOR.calcular(st));
        QA.hoja('nuevoIngreso', { id: 'quincena' }); P.acciones.ingresoEliminar();
        const k = MOTOR.calcular(P.st);
        const visto = k.items.concat(k.reservados).some((x) => x.pago.id === p.id && x.fecha === o.fecha) || (k.periodos || []).some((x) => x.partes.some((y) => y.pago.id === p.id && y.fecha === o.fecha));
        return { antes: antes > 0, visto };
    })()`);
    return r.visto ? [] : ['el colegio de noviembre (asignado a la quincena del 30) dejó de contar en todo: ni en tu libre ni en lo que viene'];
});
caso('A-AP1', 'A', 'Ahorro: apartar, liberar, usar y eliminar (con dinero: vuelve a tu libre)', 'P2', async () => {
    await cargar();
    const f = [];
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('apartar', { id: 'emergencias' }, { monto: '50' }, 'apartarOk'); true`);
    const d1 = await ev('QA.dinero()');
    if (a.libre - d1.libre !== 5000) f.push('apartar no bajó el libre $50');
    await ev(`QA.hoja('meta', { id: 'vacaciones' }, { confirmarEliminar: true }); P.acciones.apartadoEliminar(); true`);
    const d2 = await ev('QA.dinero()');
    if (d2.libre - d1.libre !== 10000) f.push(`eliminar Vacaciones ($100) subió el libre ${d2.libre - d1.libre}`);
    return [...f, ...(await ev('QA.revisar()'))];
});
caso('B-AP1', 'B', 'Eliminar en Mes un gasto que salió de un ahorro devuelve el dinero al ahorro', 'P2', async () => {
    await cargar();
    const a = await ev(`MOTOR.apartado(P.st, 'emergencias').monto`);
    await ev(`QA.anotar('medicina 40', { usarApartado: 'emergencias' }); true`);
    const medio = await ev(`MOTOR.apartado(P.st, 'emergencias').monto`);
    const reg = await ev(`P.st.registros.filter((r) => r.tipo === 'gasto' && r.apartado === 'emergencias').at(-1)?.id`);
    if (!reg) return ['no se anotó desde el ahorro'];
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }); P.acciones.eliminarRegistro(); true`);
    const d = await ev(`MOTOR.apartado(P.st, 'emergencias').monto`);
    return [...(medio === a - 4000 ? [] : [`al usar quedó ${medio}`]), ...(d === a ? [] : [`al eliminar el gasto, Emergencias quedó en ${d}, no en ${a}`])];
});
caso('B-AP2', 'B', 'Eliminar un gasto con crédito que salió de un ahorro (V2-27) suelta lo reservado para la tarjeta', 'P2', async () => {
    await cargar();
    await ev(`QA.hoja('usar', { id: 'laptop' }, { medio: 'bac' }, 'usarOk'); true`);
    const r1 = await ev(`(P.st.reservasTarjeta || []).length`);
    const reg = await ev(`P.st.registros.filter((r) => r.tipo === 'gasto' && r.apartado === 'laptop').at(-1)?.id`);
    if (!reg) return ['no se usó el ahorro'];
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }); P.acciones.eliminarRegistro(); true`);
    const r2 = await ev(`(P.st.reservasTarjeta || []).length`);
    return r1 > 0 && r2 === 0 ? [] : [`reservas para la tarjeta: ${r1} → ${r2} (la compra ya no existe)`];
});
caso('A-R1', 'A', 'Anotación: gasto, cambiar monto, cambiar a tarjeta, eliminar y deshacer: sin restos', 'P2', async () => {
    await cargar();
    const f = [];
    const a = await ev('QA.copia()');
    const d0 = await ev('QA.dinero()');
    await ev(`QA.anotar('súper 25'); true`);
    const reg = await ev(`P.st.registros.at(-1).id`);
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }, { monto: '30' }, 'editarRegistroOk'); true`);
    const d1 = await ev('QA.dinero()');
    if (d0.libre - d1.libre !== 3000) f.push(`monto 30: libre bajó ${d0.libre - d1.libre}`);
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }, { medio: 'bac' }, 'editarRegistroOk'); true`);
    const d2 = await ev('QA.dinero()');
    if (d2.lugares.agricola !== d0.lugares.agricola || d2.tarjetas.bac.compras - d0.tarjetas.bac.compras !== 3000) f.push('cambiarlo a la tarjeta no movió bien el dinero');
    if (d2.libre !== d1.libre) f.push('cambiar de medio cambió el libre');
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }); P.acciones.eliminarRegistro(); true`);
    const d3 = await ev('QA.dinero()');
    if (JSON.stringify(d3) !== JSON.stringify(d0)) f.push('eliminar no dejó todo como antes: ' + JSON.stringify(dif(d0, d3)));
    for (let i = 0; i < 4; i++) await ev('P.deshacerUltimo(); true');
    if ((await ev('QA.copia()')) !== a) f.push('deshacer 4 veces no volvió al estado inicial');
    return [...f, ...(await ev('QA.revisar()'))];
});
caso('A-C1', 'A', 'Cuadrar en $0 (te quedaste sin efectivo) se acepta', 'P2', async () => {
    await cargar();
    await ev(`QA.hoja('cuadrar', { lugar: 'efectivo' }, { lugar: 'efectivo', monto: '0' }, 'cuadrarOk'); true`);
    const e = await ev(`MOTOR.saldoLugar(P.st, 'efectivo')`);
    return e === 0 ? [] : [`efectivo quedó en ${e}`];
});
caso('A-MV1', 'A', 'Mover del banco al efectivo: Tienes igual, sin ingreso ni gasto en Mes; editar y eliminar', 'P2', async () => {
    await cargar();
    const f = [];
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('mover', {}, { de: 'agricola', a: 'efectivo', monto: '100' }, 'moverOk'); true`);
    const d = await ev('QA.dinero()');
    if (d.tienes !== a.tienes || d.salio !== a.salio || d.entro !== a.entro) f.push('mover cambió Tienes o Mes');
    const reg = await ev(`P.st.registros.at(-1).id`);
    await ev(`QA.hoja('editarRegistro', { id: ${js(reg)} }); P.acciones.eliminarRegistro(); true`);
    const d2 = await ev('QA.dinero()');
    if (JSON.stringify(d2.lugares) !== JSON.stringify(a.lugares)) f.push('eliminar el movimiento no devolvió los saldos');
    return [...f, ...(await ev('QA.revisar()'))];
});

caso('B-P2', 'B', 'Cambiar el día de un pago ya pagado este mes no lo vuelve a pedir (no se cuenta dos veces)', 'P1', async () => {
    await cargar();
    const a = await ev('QA.dinero()');
    const id = await ev(`(() => { const p = QA.pago('Internet'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); return p.id; })()`);
    const d1 = await ev('QA.dinero()');
    await ev(`QA.hoja('editarPago', { id: ${js(id)} }, { dia: '22' }, 'nuevoPagoOk'); true`);
    const d2 = await ev('QA.dinero()');
    const pend = await ev(`MOTOR.ocurrenciasPago(P.st, QA.pago('Internet'), '2026-10-01', '2026-10-31').filter((o) => !o.hecho).map((o) => o.fecha)`);
    return [...(d2.libre === d1.libre ? [] : [`el libre bajó ${d1.libre - d2.libre} al cambiar el día (el internet de octubre ya estaba pagado)`]), ...(pend.length ? ['octubre vuelve a pedirse: ' + pend.join(', ')] : [])];
});
caso('B-I2', 'B', 'Cambiar los días de la quincena después de que llegó no pide confirmar otra vez la de este mes', 'P1', async () => {
    await cargar();
    await ev(`(() => { P.st.hoy = '2026-10-16'; P.st.ingresos.find((i) => i.id === 'quincena').llegadas['2026-10-15'] = { monto: 60000 }; P.registrar(P.st, { tipo: 'ingreso', fecha: '2026-10-15', monto: 60000, nombre: 'Quincena', categoria: 'salario', lugar: 'agricola', ingreso: 'quincena', ocurrencia: '2026-10-15', nuevo: true }); P.render(); return true; })()`);
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('nuevoIngreso', { id: 'quincena' }, { frecuencia: 'quincenal', dias: [14, 29] }, 'nuevoIngresoOk'); true`);
    const hz = await ev(`(() => { const h = MOTOR.horizonte(P.st); return { atrasadas: (h.atrasadas || []).map((o) => o.fecha), fecha: h.fecha }; })()`);
    return hz.atrasadas.length ? ['pide confirmar otra vez la quincena de octubre (' + hz.atrasadas.join(', ') + '): contaría dos veces los $600'] : [];
});
caso('B-P3', 'B', 'Saltar esta vez y luego cambiar el día: el salto se respeta', 'P2', async () => {
    await cargar();
    await ev(`(() => { const p = QA.pago('Internet'); const o = QA.ocurrencia(p); P.acciones.saltar({ id: p.id, fecha: o.fecha }); return true; })()`);
    await ev(`QA.hoja('editarPago', { id: QA.pago('Internet').id }, { dia: '23' }, 'nuevoPagoOk'); true`);
    const pend = await ev(`MOTOR.ocurrenciasPago(P.st, QA.pago('Internet'), '2026-10-01', '2026-10-31').filter((o) => !o.hecho).map((o) => o.fecha)`);
    return pend.length ? ['el mes saltado vuelve a pedirse: ' + pend.join(', ')] : [];
});

// ============================================================ C · sin duplicados ni tipos equivocados (V2-70)
caso('C-01', 'C', 'Compra con tarjeta: no toca efectivo ni banco, sube lo que debes, un solo gasto (V2-07)', 'P1', async () => {
    await cargar();
    const a = await ev('QA.dinero()');
    await ev(`QA.anotar('zapatos 45 tarjeta'); true`);
    const d = await ev('QA.dinero()');
    const f = [];
    if (d.lugares.efectivo !== a.lugares.efectivo || d.lugares.agricola !== a.lugares.agricola) f.push('tocó efectivo o banco');
    if (d.tarjetas.bac.debe - a.tarjetas.bac.debe !== 4500) f.push(`la tarjeta subió ${d.tarjetas.bac.debe - a.tarjetas.bac.debe}`);
    if (d.salio - a.salio !== 4500 || d.gastos - a.gastos !== 1) f.push('Mes no lo cuenta una sola vez');
    if (a.libre - d.libre !== 4500) f.push(`el libre bajó ${a.libre - d.libre}, no 4500 (V2-07)`);
    return f;
});
caso('C-02', 'C', 'Pagar la tarjeta desde el banco: baja el banco y la deuda; no es un gasto nuevo; el libre no cambia', 'P1', async () => {
    await cargar();
    const a = await ev('QA.dinero()');
    await ev(`QA.hoja('pagado', { tipoPago: 'tarjeta', id: 'bac' }, { monto: '100', lugar: 'agricola' }, 'pagadoGuardar'); true`);
    const d = await ev('QA.dinero()');
    const f = [];
    if (a.lugares.agricola - d.lugares.agricola !== 10000) f.push('el banco no bajó $100');
    if (a.tarjetas.bac.debe - d.tarjetas.bac.debe !== 10000) f.push('la deuda de la tarjeta no bajó $100');
    if (d.salio !== a.salio || d.gastos !== a.gastos) f.push('quedó como gasto en Mes');
    if (d.libre !== a.libre) f.push(`el libre cambió ${a.libre} → ${d.libre}`);
    return f;
});
caso('C-03', 'C', 'Suscripción que se cobra en la tarjeta: cuenta una vez; al marcarla queda como compra en la tarjeta, no del banco', 'P1', async () => {
    await cargar();
    await ev(`(() => { P.crearPago(P.st, { nombre: 'Spotify', emoji: '🎵', categoria: 'suscripciones', monto: 599, frecuencia: 'mensual', dia: 25, medio: 'bac', tipoPago: 'suscripcion' }); P.render(); return true; })()`);
    const a = await ev('QA.dinero()');
    const veces = await ev(`(() => { const k = QA.k(); return k.items.filter((x) => x.pago.nombre === 'Spotify').length + k.reservados.filter((x) => x.pago.nombre === 'Spotify').length; })()`);
    await ev(`(() => { const p = QA.pago('Spotify'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); return true; })()`);
    const d = await ev('QA.dinero()');
    const f = [];
    if (veces !== 1) f.push(`antes de pagarla cuenta ${veces} veces`);
    if (d.lugares.agricola !== a.lugares.agricola || d.lugares.efectivo !== a.lugares.efectivo) f.push('salió del banco o del efectivo');
    if (d.tarjetas.bac.compras - a.tarjetas.bac.compras !== 599) f.push('no quedó como compra en la tarjeta');
    if (d.libre !== a.libre) f.push(`el libre cambió al marcarla (${a.libre} → ${d.libre}): contada dos veces o ninguna`);
    const enPagos = await ev(`MOTOR.ocurrenciasPago(P.st, QA.pago('Spotify'), '2026-10-01', '2026-10-31').length`);
    if (enPagos !== 1) f.push(`aparece ${enPagos} veces en Pagos de octubre`);
    return f;
});
caso('C-04', 'C', 'Pago fijo con la débito de una cuenta: sale de esa cuenta y de ninguna otra', 'P1', async () => {
    await cargar();
    const a = await ev('QA.dinero()');
    await ev(`(() => { const p = QA.pago('Internet'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); return true; })()`);
    const d = await ev('QA.dinero()');
    return a.lugares.agricola - d.lugares.agricola === 2500 && d.lugares.efectivo === a.lugares.efectivo ? [] : ['no salió solo de Banco Agrícola: ' + JSON.stringify(dif(a.lugares, d.lugares))];
});
caso('C-05', 'C', 'Cuota de préstamo: sale del medio elegido, baja lo que debes y cuenta una sola vez (V2-08)', 'P1', async () => {
    await cargar();
    await ev(`QA.hoja('nuevaDeuda', {}, { tipoDeuda: 'prestamo', nombre: 'Préstamo C5', cuota: '40', dia: '26', debe: '400', medio: 'efectivo' }, 'nuevaDeudaOk'); true`);
    const a = await ev('QA.dinero()');
    await ev(`(() => { const p = QA.pago('Préstamo C5'); const o = QA.ocurrencia(p); P.acciones.pagado({ tipo: 'pago', id: p.id, fecha: o.fecha }); QA.confirmar(); if (P.ui.hoja) P.acciones.pagadoGuardar(); return true; })()`);
    const d = await ev('QA.dinero()');
    const debe = await ev(`QA.pago('Préstamo C5').deuda.debe`);
    const f = [];
    if (a.lugares.efectivo - d.lugares.efectivo !== 4000) f.push('no salió del efectivo');
    if (debe !== 36000) f.push(`debe ${debe}, no 36000`);
    if (d.salio - a.salio !== 4000 || d.gastos - a.gastos !== 1) f.push('Mes no la cuenta una sola vez');
    if (d.libre !== a.libre) f.push('el libre cambió al marcarla (ya estaba contada)');
    return f;
});
caso('C-07', 'C', 'Anotar algo que ya es un pago de la lista («luz 35»): se marca ese pago, no se duplica', 'P1', async () => {
    await cargar();
    const a = await ev('QA.dinero()');
    const d0 = await ev(`QA.anotar('luz 35')`);
    const d = await ev('QA.dinero()');
    const f = [];
    if (!d0 || d0.tipo !== 'pagado') f.push(`lo entendió como ${d0 && d0.tipo}`);
    if (d.gastos - a.gastos !== 1) f.push('no hay exactamente un gasto nuevo');
    const pendientesLuz = await ev(`MOTOR.ocurrenciasPago(P.st, QA.pago('Luz'), '2026-10-01', '2026-10-31').filter((o) => o.estado !== 'pagado').length`);
    if (pendientesLuz) f.push('la luz de octubre sigue pendiente (se contaría dos veces)');
    return f;
});
caso('C-07b', 'C', 'Anotar otra vez un pago ya pagado del mes avisa que ya está pagado', 'P3', async () => {
    await cargar();
    await ev(`QA.anotar('luz 35'); true`);
    const d0 = await ev(`(() => { P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'luz 35'; q.dispatchEvent(new Event('input', { bubbles: true })); const r = { tipo: P.ui.hoja.d && P.ui.hoja.d.tipo, aviso: document.getElementById('anotar-preg')?.innerText || '' }; P.cerrarHoja(); return r; })()`);
    return /ya (la |lo )?(marcaste|pagaste|está pagad)/i.test(d0.aviso) ? [] : [`lo toma como ${d0.tipo} sin avisar que la luz de octubre ya está pagada`];
});
caso('C-08', 'C', 'Ingresos con su tipo: venta, remesa que llegó, adelanto; una transferencia entre lugares no es ingreso ni gasto', 'P2', async () => {
    await cargar();
    const f = [];
    const v = await ev(`QA.anotar('vendí 45')`);
    const rv = await ev(`P.st.registros.at(-1)`);
    if (rv.tipo !== 'ingreso' || rv.categoria !== 'venta') f.push(`«vendí 45» quedó ${rv.tipo}/${rv.categoria}`);
    const ad = await ev(`(() => { const d = QA.anotar('me dieron adelanto 100'); if (P.ui.hoja) P.cerrarHoja(); return P.st.ingresos.find((i) => i.tipoIngreso === 'adelanto') || null; })()`);
    if (!ad) f.push('el adelanto no quedó como ingreso tipo adelanto');
    const a = await ev('QA.dinero()');
    await ev(`QA.anotar('retiré 100 del cajero'); true`);
    if (await ev('!!P.ui.hoja')) await ev('P.cerrarHoja(); true');
    const d = await ev('QA.dinero()');
    if (d.entro !== a.entro || d.salio !== a.salio) f.push('el retiro del cajero quedó como ingreso o gasto');
    void v;
    return f;
});
caso('C-09', 'C', '«me pagaron 600» pregunta si es la quincena o un extra (V2-29 #10) y cuenta una sola vez', 'P2', async () => {
    await cargar();
    const d0 = await ev(`(() => { P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'me pagaron 600'; q.dispatchEvent(new Event('input', { bubbles: true })); return { tipo: P.ui.hoja.d.tipo, pregunta: document.getElementById('anotar-preg')?.innerText || '' }; })()`);
    // v2.6.5 (V2-81): la misma pregunta, con las palabras nuevas: «¿Es tu quincena del 30?» [Sí, marcarla como recibida] [No, es otro ingreso].
    return /¿Es tu quincena del 30\?/.test(d0.pregunta) && /marcarla como recibida/.test(d0.pregunta) && /otro ingreso/.test(d0.pregunta) ? [] : ['no pregunta si es la quincena o un extra: ' + d0.pregunta.slice(0, 120)];
});

// ============================================================ D · números
caso('C-10', 'C', '«me dieron adelanto 100» reconoce por su nombre el adelanto que esperabas («Vale de la empresa»)', 'P2', async () => {
    await cargar();
    const r = await ev(`(() => {
        const st = P.st;
        st.ingresos.push({ id: 'vale', nombre: 'Vale de la empresa', emoji: '💵', categoria: 'otro', monto: 10000, aprox: false, frecuencia: 'unico', fecha: MOTOR.sumarDias(st.hoy, 2), lugar: 'efectivo', principal: false, extra: true, desde: st.hoy, llegadas: {} });
        const d = MOTOR.entender(st, 'me dieron adelanto 100');
        return { tipo: d.tipo, ref: d.ingresoRef ? d.ingresoRef.id : null };
    })()`);
    return r.ref === 'vale' ? [] : [`no reconoce «Vale de la empresa» como el adelanto que esperabas: ${JSON.stringify(r)}`];
});
caso('D-01', 'D', 'Leer montos: «1,000.50», «1000,50», «.5», espacios, letras, negativos, 9 dígitos', 'P2', async () => {
    await cargar();
    const r = await ev(`(() => { const t = ['1,000.50', '1000,50', '.5', ' 25 ', '25abc', '-5', '123456789', '0', '$ 12.30', '1,5', '1.000,50']; return Object.fromEntries(t.map((x) => [x, MOTOR.leerMonto(x)])); })()`);
    const esperado = { '1,000.50': 100050, '1000,50': 100050, '.5': 50, ' 25 ': 2500, '25abc': null, '-5': null, '123456789': null, 0: 0, '$ 12.30': 1230, '1,5': 150, '1.000,50': 100050 };
    return Object.entries(esperado).filter(([k, v]) => r[k] !== v).map(([k, v]) => `«${k}» → ${r[k]}, se esperaba ${v}`);
});
caso('D-02', 'D', '«~$ por día» hacia abajo (V2-29 #12)', 'P2', async () => {
    await cargar();
    const r = await ev(`[MOTOR.porDiaDe(29999, 10), MOTOR.porDiaDe(799, 1), MOTOR.porDiaDe(0, 5), MOTOR.porDiaDe(100, 0)]`);
    return JSON.stringify(r) === JSON.stringify([2900, 790, null, null]) ? [] : [JSON.stringify(r)];
});
caso('D-03', 'D', 'Libre nunca negativo y con faltante exacto (V2-31 #6)', 'P1', async () => {
    await cargar();
    await ev(`QA.hoja('cuadrar', { lugar: 'efectivo' }, { lugar: 'efectivo', monto: '0' }, 'cuadrarOk'); QA.hoja('cuadrar', { lugar: 'agricola' }, { lugar: 'agricola', monto: '0' }, 'cuadrarOk'); true`);
    const k = await ev(`(() => { const k = QA.k(); return { libre: k.libre, falta: k.falta, base: k.base }; })()`);
    return k.libre === 0 && k.falta === -k.base && k.falta > 0 ? [] : [JSON.stringify(k)];
});

// ============================================================ E · fechas
caso('E-01', 'E', 'Día 31 en meses cortos, febrero y cambio de año', 'P2', async () => {
    await cargar();
    const r = await ev(`[MOTOR.fechasRegla({ frecuencia: 'mensual', dia: 31 }, '2026-11-01', '2027-03-31'), MOTOR.fechasRegla({ frecuencia: 'quincenal', dias: [15, 31] }, '2027-02-01', '2027-02-28'), MOTOR.fechasRegla({ frecuencia: 'mensual', dia: 30 }, '2026-12-15', '2027-01-31')]`);
    const e = [['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31'], ['2027-02-15', '2027-02-28'], ['2026-12-30', '2027-01-30']];
    return JSON.stringify(r) === JSON.stringify(e) ? [] : [JSON.stringify(r)];
});
caso('E-02', 'E', 'Tarjeta con corte 31 y pago 15: el ciclo cruza el mes sin perder días', 'P2', async () => {
    await cargar();
    await ev(`QA.hoja('nuevaDeuda', {}, { tipoDeuda: 'tarjeta', nombre: 'Tarjeta 31', corte: '31', pagoDia: '15' }, 'nuevaDeudaOk'); true`);
    const t = await ev(`(() => { const t = P.st.tarjetas.find((x) => x.nombre === 'Tarjeta 31'); const i = MOTOR.tarjetaInfo(P.st, t); return { corte: t.estados[0].corte, vence: t.estados[0].vence, prox: i.proxCorte }; })()`);
    return t.corte === '2026-09-30' && t.vence === '2026-10-15' && t.prox === '2026-10-31' ? [] : [JSON.stringify(t)];
});

// ============================================================ F · validaciones
caso('F-01', 'F', 'Nombres vacíos o solo espacios se rechazan con su mensaje; nombres muy largos y con emoji se guardan', 'P2', async () => {
    await cargar();
    const f = [];
    const r1 = await ev(`(() => { QA.hoja('lugar', {}, { clase: 'banco', nombre: '   ', monto: '10' }, 'lugarOk'); const ok = !!P.ui.hoja && P.ui.hoja.errores.includes('nombre'); P.cerrarHoja(); return ok; })()`);
    if (!r1) f.push('un lugar con nombre en blanco se guardó');
    const largo = 'Cooperativa de ahorro y crédito de los trabajadores del mercado central 🛒 de San Salvador';
    await ev(`QA.hoja('lugar', {}, { clase: 'banco', nombre: ${js(largo)}, monto: '10' }, 'lugarOk'); true`);
    if (!(await ev(`P.st.lugares.some((l) => l.nombre === ${js(largo)})`))) f.push('no guardó un nombre largo con emoji');
    const desborda = await ev(`(() => { P.irTab('midinero'); P.abrir('cuentas'); return document.getElementById('vista').scrollWidth > document.getElementById('vista').clientWidth + 1; })()`);
    if (desborda) f.push('un nombre largo desborda Cuentas');
    return f;
});
caso('F-02', 'F', 'Montos inválidos se rechazan con un mensaje claro (también más de $1,000,000)', 'P3', async () => {
    await cargar();
    const r = await ev(`(() => { QA.hoja('nuevoPago', {}, { nombre: 'Algo', monto: '1234567', frecuencia: 'mensual', dia: '5', medio: 'efectivo' }, 'nuevoPagoOk'); const h = P.ui.hoja; const t = document.querySelector('.campo-error')?.innerText || ''; P.cerrarHoja(); return { guardo: !h, t }; })()`);
    return !r.guardo && /1,000,000|millón/i.test(r.t) ? [] : [`guardó: ${r.guardo} · mensaje: «${r.t}»`];
});
caso('F-03', 'F', 'Doble toque en Guardar no guarda dos veces ni rompe', 'P2', async () => {
    await cargar();
    const n0 = await ev('P.st.registros.length');
    let roto = '';
    try {
        // Dos toques reales sobre el mismo botón «Guardar» (el segundo llega cuando la hoja ya se cerró) y una segunda llamada directa.
        await ev(`(() => { P.acciones.anotar(); const q = document.getElementById('anotar-q'); q.value = 'café 2'; q.dispatchEvent(new Event('input', { bubbles: true })); const btn = document.querySelector('[data-fk="anotar-guardar"]'); btn.click(); btn.click(); try { P.acciones.anotarGuardar(); } catch (e) { return 'error: ' + e.message; } return true; })()`).then((x) => (roto = x === true ? '' : x));
    } catch (e) {
        roto = e.message;
    }
    const n1 = await ev('P.st.registros.length');
    return [...(n1 - n0 === 1 ? [] : [`guardó ${n1 - n0} veces`]), ...(roto ? ['el segundo toque rompe: ' + roto] : [])];
});

// ============================================================ H · persistencia
caso('H-01', 'H', 'Dos pestañas con tus datos: lo que guardas en una no se pierde por la otra', 'P1', async () => {
    // Dos «pestañas» = dos páginas del mismo origen; el navegador sin ventana comparte el almacenamiento.
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await ev(`P.sinGuardar = true; localStorage.clear(); true`);
    await ev(`(() => { const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Marta' }); const u = { esquema: 2, creado: new Date().toISOString(), st: s, tab: 'hoy', tema: null, introVista: true, nombre: '', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [] }; localStorage.setItem('pamplanea-uso:v1', JSON.stringify(u)); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true })); return true; })()`);
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await esperar(400);
    await ev(AYUDA);
    // La otra pestaña guarda un gasto (lo simula escribiendo lo que esa pestaña guardaría y avisando con «storage»).
    await ev(`(() => { const u = JSON.parse(localStorage.getItem('pamplanea-uso:v1')); u.st.registros.push({ id: 'rOtra', seq: 99999, tipo: 'gasto', fecha: u.st.hoy, monto: 777, nombre: 'De la otra pestaña', categoria: 'otros', medio: 'efectivo', anotado: true }); const nuevo = JSON.stringify(u); const viejo = localStorage.getItem('pamplanea-uso:v1'); localStorage.setItem('pamplanea-uso:v1', nuevo); window.dispatchEvent(new StorageEvent('storage', { key: 'pamplanea-uso:v1', oldValue: viejo, newValue: nuevo, storageArea: localStorage })); return true; })()`);
    await esperar(200);
    await ev(`QA.anotar('pan 3'); true`);
    await ev('P.guardarYa && P.guardarYa(); true');
    const g = await ev(`JSON.parse(localStorage.getItem('pamplanea-uso:v1')).st.registros.map((r) => r.nombre)`);
    return g.includes('De la otra pestaña') && g.some((x) => /pan/i.test(x)) ? [] : ['al guardar aquí se borró lo que se guardó en la otra pestaña'];
});
caso('H-02', 'H', 'Si el teléfono no deja guardar, la app lo dice (no se pierde en silencio)', 'P2', async () => {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await ev(`P.sinGuardar = true; localStorage.clear(); true`);
    await ev(`(() => { const s = DATOS.crearAna(); Object.assign(s, { persona: 'uso', nombre: 'Marta' }); localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: new Date().toISOString(), st: s, tab: 'hoy', introVista: true, nombre: '', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [] })); localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true })); return true; })()`);
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await esperar(400);
    await ev(AYUDA);
    // El almacenamiento se llena: cualquier escritura falla.
    await ev(`(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('lleno', 'QuotaExceededError'); }; window.__restaurarSetItem = () => (Storage.prototype.setItem = orig); return true; })()`);
    await ev(`QA.anotar('pan 3'); P.guardarYa && P.guardarYa(); P.render(); true`);
    const t = await ev(`document.getElementById('pantalla').innerText + ' ' + (document.querySelector('.toast')?.innerText || '')`);
    await ev('window.__restaurarSetItem(); true');
    return /no (se pudo|pude) guardar|no deja guardar/i.test(t) ? [] : ['no avisa que no pudo guardar'];
});

// ============================================================ L · rendimiento
caso('L-01', 'L', 'Con 150 anotaciones, 20 pagos, 5 deudas y 3 tarjetas responde sin trabarse', 'P2', async () => {
    await cargar();
    const r = await ev(`(() => {
        const st = P.st;
        for (let i = 0; i < 150; i++) P.registrar(st, { tipo: 'gasto', fecha: MOTOR.sumarDias(st.hoy, -(i % 45)), monto: 100 + i, nombre: 'Gasto ' + i, categoria: 'comida', medio: i % 3 ? 'efectivo' : 'bac', anotado: true });
        for (let i = 0; i < 14; i++) P.crearPago(st, { nombre: 'Pago ' + i, monto: 1000 + i, frecuencia: 'mensual', dia: 1 + i * 2, medio: 'efectivo' });
        for (let i = 0; i < 4; i++) { const p = P.crearPago(st, { nombre: 'Deuda ' + i, monto: 2500, frecuencia: 'mensual', dia: 10 + i, medio: 'transferencia', categoria: 'cuotas' }); p.tipoDeuda = 'prestamo'; p.deuda = { debe: 50000 }; }
        for (let i = 0; i < 2; i++) { const id = 'tq' + i; st.tarjetas.push({ id, nombre: 'Tarjeta ' + i, emoji: '💳', tipo: 'tarjeta', corte: 15, pagoDia: 5, cupo: 100000, interesesAnio: 0, desde: st.hoy, estados: [{ corte: '2026-10-15', total: 20000, minimo: 2000, aPagar: 20000, opcion: 'total', vence: '2026-11-05' }] }); st.medios.push({ id: 'm' + id, nombre: 'Tarjeta ' + i, emoji: '💳', tarjeta: id }); }
        const med = (fn) => { const t = performance.now(); fn(); return Math.round(performance.now() - t); };
        const calc = med(() => { for (let i = 0; i < 10; i++) MOTOR.calcular(st); }) / 10;
        const tabs = {};
        for (const tab of ['hoy', 'pagos', 'midinero', 'mes']) tabs[tab] = med(() => P.irTab(tab));
        const anotar = med(() => QA.anotar('pupusas 6'));
        return { calc, tabs, anotar };
    })()`);
    const lentos = [...(r.calc > 60 ? [`calcular ${r.calc} ms`] : []), ...Object.entries(r.tabs).filter(([, ms]) => ms > 250).map(([t, ms]) => `${t} ${ms} ms`), ...(r.anotar > 300 ? [`anotar ${r.anotar} ms`] : [])];
    informe.rendimiento = r;
    return lentos;
});

// ============================================================ correr
for (const c of casos) {
    if (solo && !solo.some((s) => c.id === s || c.id.startsWith(s + '-') || c.area === s)) continue;
    let fallas;
    try {
        fallas = await c.fn();
    } catch (e) {
        fallas = ['excepción: ' + String(e.message).slice(0, 300)];
    }
    revisarCaso(c, fallas || []);
}
const resumen = Object.entries(informe.casos.reduce((t, c) => ((t[c.area] = t[c.area] || { pasan: 0, fallan: 0 }), t[c.area][c.ok ? 'pasan' : 'fallan']++, t), {}));
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ resumen, fallan: informe.casos.filter((c) => !c.ok).map((c) => `${c.id} [${c.prioridad}] ${c.titulo}: ${c.fallas.join(' | ')}`), errores: informe.errores, rendimiento: informe.rendimiento }, null, 1));
b.cerrar();
// v2.6.4: si un caso falla (o hay errores de consola), la prueba termina con error (antes terminaba bien igual).
process.exit(informe.casos.some((c) => !c.ok) || informe.errores.length ? 1 : 0);
