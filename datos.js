// Producto v2 · prototipo. Datos simulados: catálogo, Ana, Carlos, Rosa y la persona nueva.
// Montos en centavos enteros (nunca float). Fechas ISO (AAAA-MM-DD). Todo vive en memoria.
'use strict';

const CATEGORIAS = [
    { id: 'super', nombre: 'Súper', emoji: '🛒', medio: 'debito', palabras: ['super', 'supermercado', 'despensa', 'compras'] },
    { id: 'comida', nombre: 'Comida', emoji: '🍽️', medio: 'efectivo', palabras: ['pupusa', 'pupusas', 'almuerzo', 'comida', 'cena', 'desayuno', 'pollo', 'tacos', 'pizza', 'hamburguesa', 'cafe', 'pan', 'panes', 'licuado', 'refresco', 'yuca', 'tamales', 'sopa', 'antojo'] },
    { id: 'mercado', nombre: 'Mercado', emoji: '🧺', medio: 'efectivo', palabras: ['mercado', 'verdura', 'verduras', 'fruta', 'frutas', 'tortillas', 'huevos', 'queso'] },
    { id: 'transporte', nombre: 'Transporte', emoji: '🚌', medio: 'efectivo', palabras: ['bus', 'buses', 'micro', 'taxi', 'pasaje', 'pasajes', 'gasolina', 'moto'] },
    { id: 'ropa', nombre: 'Ropa y zapatos', emoji: '👟', medio: 'bac', palabras: ['zapatos', 'zapato', 'ropa', 'camisa', 'blusa', 'pantalon', 'uniforme', 'tenis', 'vestido'] },
    { id: 'salud', nombre: 'Salud', emoji: '💊', medio: 'debito', emergencia: true, palabras: ['medicina', 'medicinas', 'farmacia', 'pastillas', 'doctor', 'consulta', 'clinica', 'dentista', 'vitaminas'] },
    { id: 'telefono', nombre: 'Teléfono', emoji: '📱', medio: 'efectivo', palabras: ['recarga', 'saldo', 'celular', 'telefono'] },
    { id: 'casa', nombre: 'Casa', emoji: '🏠', medio: 'efectivo', palabras: ['gas', 'chimbo', 'limpieza', 'jabon', 'detergente', 'escoba'] },
    { id: 'salidas', nombre: 'Salidas', emoji: '🎉', medio: 'bac', palabras: ['salida', 'cine', 'fiesta', 'cumple', 'cumpleanos', 'cerveza', 'amigas', 'amigos'] },
    { id: 'regalos', nombre: 'Regalos', emoji: '🎁', medio: 'efectivo', palabras: ['regalo', 'regalos', 'detalle'] },
    { id: 'educacion', nombre: 'Educación', emoji: '🎓', medio: 'transferencia', palabras: ['colegio', 'escuela', 'universidad', 'utiles', 'cuaderno', 'libros', 'matricula'] },
    { id: 'tecnologia', nombre: 'Tecnología', emoji: '💻', medio: 'debito', palabras: ['laptop', 'computadora', 'audifonos', 'cargador'] },
    { id: 'servicios', nombre: 'Facturas de servicios', emoji: '💡', medio: 'debito', palabras: ['luz', 'agua', 'internet', 'cable'] },
    { id: 'cuotas', nombre: 'Cuotas y deudas', emoji: '🛍️', medio: 'transferencia', palabras: ['cuota', 'prestamo'] },
    { id: 'suscripciones', nombre: 'Suscripciones', emoji: '📺', medio: 'bac', palabras: ['netflix', 'spotify', 'disney', 'youtube', 'icloud', 'suscripcion', 'gimnasio', 'gym', 'hbo', 'prime'] },
    { id: 'otros', nombre: 'Otros', emoji: '🧩', medio: 'efectivo', palabras: [] },
];

/** V2-56: «¿Qué es?» al agregar un ingreso esperado. Cada tipo trae su frecuencia sugerida (adelanto, aguinaldo y Quincena 25: una vez). */
// v2.8 ajuste 3 (FM-2, APROBADO por Victor 2026-10-22): «+ Ingreso» ofrece solo extras; «Salario» queda para el ingreso
// principal («Mi ingreso principal») y para leer lo que ya tienes guardado.
const TIPOS_INGRESO = [
    { id: 'salario', nombre: 'Salario', emoji: '💼', categoria: 'salario', frecuencia: 'quincenal', sugerido: 'Salario', principal: true },
    { id: 'remesa', nombre: 'Remesa', emoji: '🌎', categoria: 'remesa', frecuencia: 'mensual', sugerido: 'Remesa' },
    { id: 'aguinaldo', nombre: 'Aguinaldo', emoji: '🎁', categoria: 'aguinaldo', frecuencia: 'unico', sugerido: 'Aguinaldo', mes: 12, dia: 12 },
    { id: 'q25', nombre: 'Quincena 25', emoji: '🎁', categoria: 'aguinaldo', frecuencia: 'unico', sugerido: 'Quincena 25', mes: 1, dia: 25 },
    { id: 'bono', nombre: 'Bono o comisión', emoji: '📈', categoria: 'extra', frecuencia: 'unico', sugerido: 'Bono' },
    { id: 'venta', nombre: 'Venta', emoji: '🏪', categoria: 'venta', frecuencia: 'unico', sugerido: 'Venta' },
    { id: 'adelanto', nombre: 'Adelanto de salario', emoji: '💵', categoria: 'otro', frecuencia: 'unico', sugerido: 'Adelanto de salario' },
    { id: 'otro', nombre: 'Otro', emoji: '💵', categoria: 'otro', frecuencia: null, sugerido: '' },
];
const INGRESO_CATEGORIAS = [
    { id: 'salario', nombre: 'Salario', emoji: '💼' },
    { id: 'venta', nombre: 'Ventas', emoji: '🏪' },
    { id: 'remesa', nombre: 'Remesa', emoji: '🌎' },
    { id: 'extra', nombre: 'Comisión o bono', emoji: '📈' },
    { id: 'aguinaldo', nombre: 'Aguinaldo', emoji: '🎁' },
    { id: 'cuchubal', nombre: 'Cuchubal', emoji: '🤝' },
    { id: 'otro', nombre: 'Otro ingreso', emoji: '💵' },
];

/** Emoji propio para algunos nombres frecuentes; si no, el de su categoría. */
const EMOJI_NOMBRE = {
    pupusas: '🫓', pupusa: '🫓', cafe: '☕', pan: '🍞', panes: '🍞', pollo: '🍗', tacos: '🌮', pizza: '🍕', hamburguesa: '🍔',
    luz: '💡', agua: '💧', internet: '🌐', cable: '📺', alquiler: '🏠', colegio: '🎓', medicina: '💊', zapatos: '👟', ropa: '👕',
    laptop: '💻', regalo: '🎁', gas: '🔥', recarga: '📱', telefono: '📱', cuchubal: '🤝', remesa: '🌎', gasolina: '⛽', bus: '🚌',
    taxi: '🚕', mercado: '🧺', uniforme: '👕', farmacia: '💊', prestamo: '🏦', cuota: '🛍️', tarjeta: '💳', doctor: '🩺', dentista: '🦷',
    netflix: '🎬', spotify: '🎵', disney: '📺', youtube: '🎬', gimnasio: '💪', gym: '💪',
};

/** V2-47: suscripciones frecuentes (sin logos: solo el nombre). Se pagan, si tienes, con tarjeta de crédito (V2-07). */
// v2.8 ajuste 3 (FM-4): el plan de celular pasa a «Facturas y servicios»; YouTube, iCloud y Apple TV+ van en «Otra».
const SUSCRIPCIONES = [
    { id: 'netflix', nombre: 'Netflix', emoji: '🎬' },
    { id: 'disney', nombre: 'Disney+', emoji: '📺' },
    { id: 'max', nombre: 'Max', emoji: '🎬' },
    { id: 'prime', nombre: 'Prime Video', emoji: '🎬' },
    { id: 'spotify', nombre: 'Spotify', emoji: '🎵' },
    { id: 'gimnasio', nombre: 'Gimnasio', emoji: '💪' },
    { id: 'otra', nombre: 'Otra', emoji: '🧾' },
];

/** Pagos fijos frecuentes para el primer día y para entender «acuérdame…». */
// v2.8 ajuste 3 (FM-4, APROBADO por Victor 2026-10-22): cada uno en su grupo (`grupo`), en el orden en que se ve. `etiqueta`: lo
// que dice el botón cuando es más largo que el nombre con que se guarda. Ajuste 4: sale «Tasas municipales» (lo guardado no cambia).
const PAGOS_FRECUENTES = [
    { id: 'luz', nombre: 'Luz', emoji: '💡', categoria: 'servicios', variable: true, grupo: 'servicio' },
    { id: 'agua', nombre: 'Agua', emoji: '💧', categoria: 'servicios', variable: true, grupo: 'servicio' },
    { id: 'internet', nombre: 'Internet', emoji: '🌐', categoria: 'servicios', grupo: 'servicio' },
    { id: 'cable', nombre: 'Cable', emoji: '📺', categoria: 'servicios', grupo: 'servicio' },
    { id: 'telefono', nombre: 'Plan de celular', emoji: '📱', categoria: 'telefono', grupo: 'servicio' },
    { id: 'gas', nombre: 'Gas', etiqueta: 'Gas (cilindro)', emoji: '🔥', categoria: 'casa', grupo: 'servicio' },
    { id: 'vigilancia', nombre: 'Vigilancia', etiqueta: 'Vigilancia o cuota de colonia', emoji: '🛡️', categoria: 'servicios', grupo: 'servicio' },
    { id: 'alquiler', nombre: 'Alquiler', emoji: '🏠', categoria: 'casa', grupo: 'otro' },
    { id: 'colegio', nombre: 'Colegio', etiqueta: 'Colegio o universidad', emoji: '🎓', categoria: 'educacion', grupo: 'otro' },
    { id: 'cuchubal', nombre: 'Cuchubal', emoji: '🤝', categoria: 'cuotas', semanal: true, grupo: 'otro' },
    { id: 'seguro', nombre: 'Seguro', emoji: '🛡️', categoria: 'otros', grupo: 'otro' },
    { id: 'familia', nombre: 'Ayuda a la familia', emoji: '🤝', categoria: 'otros', grupo: 'otro' },
    { id: 'casacomercial', nombre: 'Cuota de casa comercial', emoji: '🛍️', categoria: 'cuotas', deuda: 'casacomercial' },
    { id: 'prestamo', nombre: 'Préstamo', emoji: '🏦', categoria: 'cuotas', deuda: 'prestamo' },
];

/** «+ Tarjeta o préstamo» (V2-24): un solo formulario para los cuatro tipos. */
const TIPOS_DEUDA = [
    { id: 'tarjeta', nombre: 'Tarjeta de crédito', emoji: '💳', s: 'Con corte y fecha de pago' },
    { id: 'casacomercial', nombre: 'Casa comercial', emoji: '🛍️', s: 'Cuota de una tienda' },
    { id: 'prestamo', nombre: 'Préstamo personal', emoji: '🏦', s: 'Del banco, cooperativa o alguien' },
    { id: 'vivienda', nombre: 'Crédito de vivienda', emoji: '🏡', s: 'Cuota de tu casa' },
];

const BANCOS = ['Agrícola', 'Cuscatlán', 'BAC', 'Davivienda', 'Promerica', 'Hipotecaria', 'Fedecrédito'];

const c = (texto) => {
    const [whole, fraction = '0'] = String(texto).split('.');
    return Number(whole) * 100 + Number((fraction + '0').slice(0, 2));
};

function estadoBase(extra) {
    return {
        persona: 'ana', nombre: 'Ana', espacio: 'Hogar de Ana', hoy: '2026-10-21', configurado: true,
        horizonteVariable: null, lugares: [], tarjetas: [], medios: [], apartados: [], logros: [], pagos: [],
        ingresos: [], registros: [], avisos: [], reservasTarjeta: [], seq: 1, interesInvitar: false, ...extra,
    };
}

/** Registros en orden cronológico; cada uno recibe su número de secuencia. */
function sembrar(st, filas) {
    for (const fila of filas) {
        st.registros.push({ id: 'r' + st.seq, seq: st.seq, ...fila });
        st.seq++;
    }
}

function porId(st, id) {
    return st.registros.find((r) => r.ref === id);
}

function crearAna(variante) {
    const st = estadoBase({ persona: 'ana', nombre: 'Ana', espacio: 'Hogar de Ana' });
    st.lugares = [
        { id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵' },
        { id: 'agricola', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦' },
    ];
    st.medios = [
        { id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' },
        { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'agricola', tarjetaDebito: true },
        { id: 'bac', nombre: 'Crédito BAC', emoji: '💳', tarjeta: 'bac' },
        { id: 'transferencia', nombre: 'Transferencia', emoji: '🔁', lugar: 'agricola' },
    ];
    st.tarjetas = [{
        id: 'bac', nombre: 'Crédito BAC', emoji: '💳', tipo: 'tarjeta', corte: 15, pagoDia: 5, cupo: c('1500'), interesesAnio: c('38.50'),
        estados: [{ corte: '2026-09-15', total: c('190'), minimo: c('25'), aPagar: c('190'), opcion: 'total', vence: '2026-10-05' }],
    }];
    st.apartados = [
        { id: 'emergencias', nombre: 'Emergencias', emoji: '🛟', portada: 'emergencia-paraguas', monto: c('200'), meta: c('500'), metaFecha: null, historial: [{ fecha: '2026-10-15', tipo: 'apartar', monto: c('50') }, { fecha: '2026-09-30', tipo: 'apartar', monto: c('50') }, { fecha: '2026-09-15', tipo: 'apartar', monto: c('100') }] },
        { id: 'laptop', nombre: 'Laptop', emoji: '💻', portada: 'tecnologia-laptop', monto: c('600'), meta: c('600'), metaFecha: '2026-11-30', historial: [{ fecha: '2026-10-15', tipo: 'apartar', monto: c('150') }, { fecha: '2026-09-30', tipo: 'apartar', monto: c('150') }, { fecha: '2026-09-15', tipo: 'apartar', monto: c('300') }] },
        { id: 'vacaciones', nombre: 'Vacaciones', emoji: '🏖️', portada: 'viaje-playa', monto: c('100'), meta: null, metaFecha: null, historial: [{ fecha: '2026-10-15', tipo: 'apartar', monto: c('100') }] },
    ];
    st.ingresos = [
        { id: 'quincena', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: c('600'), aprox: true, frecuencia: 'quincenal', lugar: 'agricola', principal: true, desde: '2026-10-01', llegadas: { '2026-10-15': { monto: c('600') } } },
        { id: 'aguinaldo', nombre: 'Aguinaldo', emoji: '🎁', categoria: 'aguinaldo', monto: c('300'), aprox: true, frecuencia: 'unico', fecha: '2026-12-12', lugar: 'agricola', principal: false, extra: true, desde: '2026-10-01', llegadas: {} },
    ];
    st.pagos = [
        { id: 'colegio', nombre: 'Colegio', emoji: '🎓', categoria: 'educacion', monto: c('20'), estimado: false, frecuencia: 'mensual', dia: 5, medio: 'transferencia', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-05', monto: c('20') }, { fecha: '2026-08-05', monto: c('20') }] },
        { id: 'luz', nombre: 'Luz', emoji: '💡', categoria: 'servicios', monto: c('35'), estimado: true, frecuencia: 'mensual', dia: 12, medio: 'debito', avisos: [{ tipo: 'recibo', dia: 3, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-12', monto: c('33.80') }, { fecha: '2026-08-12', monto: c('36.10') }] },
        { id: 'agua', nombre: 'Agua', emoji: '💧', categoria: 'servicios', monto: c('12'), estimado: false, frecuencia: 'mensual', dia: 18, medio: 'debito', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-18', monto: c('12') }] },
        { id: 'internet', nombre: 'Internet', emoji: '🌐', categoria: 'servicios', monto: c('25'), estimado: false, frecuencia: 'mensual', dia: 20, medio: 'debito', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-20', monto: c('25') }] },
        { id: 'casacomercial', nombre: 'Casa comercial', emoji: '🛍️', categoria: 'cuotas', monto: c('35'), estimado: false, frecuencia: 'mensual', dia: 20, medio: 'transferencia', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], tipoDeuda: 'casacomercial', deuda: { debe: c('420') }, desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-20', monto: c('35') }] },
    ];

    const planea = variante === 'planea';
    const filas = [
        // Septiembre
        { tipo: 'gasto', fecha: '2026-09-01', monto: c('47.80'), nombre: 'Súper', categoria: 'super', medio: 'debito', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-05', monto: c('20'), nombre: 'Colegio', categoria: 'educacion', medio: 'transferencia', pago: 'colegio' },
        { tipo: 'pagoTarjeta', fecha: '2026-09-05', monto: c('160'), lugar: 'agricola', tarjeta: 'bac', nombre: 'Pago de Crédito BAC' },
        { tipo: 'gasto', fecha: '2026-09-06', monto: c('8'), nombre: 'Pupusas', categoria: 'comida', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-09', monto: c('5'), nombre: 'Recarga', categoria: 'telefono', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-12', monto: c('33.80'), nombre: 'Luz', categoria: 'servicios', medio: 'debito', pago: 'luz' },
        { tipo: 'gasto', fecha: '2026-09-13', monto: c('22'), nombre: 'Mercado', categoria: 'mercado', medio: 'efectivo', anotado: true },
        { tipo: 'ingreso', fecha: '2026-09-15', monto: c('600'), nombre: 'Quincena', categoria: 'salario', lugar: 'agricola', ingreso: 'quincena' },
        { tipo: 'gasto', fecha: '2026-09-18', monto: c('12'), nombre: 'Agua', categoria: 'servicios', medio: 'debito', pago: 'agua' },
        { tipo: 'gasto', fecha: '2026-09-20', monto: c('25'), nombre: 'Internet', categoria: 'servicios', medio: 'debito', pago: 'internet' },
        { tipo: 'gasto', fecha: '2026-09-20', monto: c('35'), nombre: 'Casa comercial', categoria: 'cuotas', medio: 'transferencia', pago: 'casacomercial' },
        { tipo: 'gasto', fecha: '2026-09-20', monto: c('40'), nombre: 'Regalo de cumpleaños', categoria: 'salidas', medio: 'bac', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-22', monto: c('15.50'), nombre: 'Gas', categoria: 'casa', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-25', monto: c('56.60'), nombre: 'Súper', categoria: 'super', medio: 'bac', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-26', monto: c('7.50'), nombre: 'Pupusas', categoria: 'comida', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-27', monto: c('12.40'), nombre: 'Farmacia', categoria: 'salud', medio: 'debito', anotado: true },
        { tipo: 'gasto', fecha: '2026-09-28', monto: c('40'), nombre: 'Zapatos de la niña', categoria: 'ropa', medio: 'bac', anotado: true },
        { tipo: 'ingreso', fecha: '2026-09-30', monto: c('600'), nombre: 'Quincena', categoria: 'salario', lugar: 'agricola', ingreso: 'quincena' },
        // Octubre
        { tipo: 'gasto', fecha: '2026-10-01', monto: c('52.30'), nombre: 'Súper', categoria: 'super', medio: 'debito', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-03', monto: c('7.50'), nombre: 'Pupusas', categoria: 'comida', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-05', monto: c('20'), nombre: 'Colegio', categoria: 'educacion', medio: 'transferencia', pago: 'colegio', ref: 'colegio-oct' },
        { tipo: 'pagoTarjeta', fecha: '2026-10-05', monto: c('190'), lugar: 'agricola', tarjeta: 'bac', nombre: 'Pago de Crédito BAC' },
        { tipo: 'gasto', fecha: '2026-10-07', monto: c('9.50'), nombre: 'Farmacia', categoria: 'salud', medio: 'debito', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-09', monto: c('5'), nombre: 'Recarga', categoria: 'telefono', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-10', monto: c('18'), nombre: 'Uniforme', categoria: 'ropa', medio: 'bac', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-11', monto: c('61.40'), nombre: 'Súper', categoria: 'super', medio: 'bac', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-12', monto: c('6'), nombre: 'Pupusas', categoria: 'comida', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-14', monto: c('14'), nombre: 'Salida con amigas', categoria: 'salidas', medio: 'bac', anotado: true },
        { tipo: 'ingreso', fecha: '2026-10-15', monto: c('600'), nombre: 'Quincena', categoria: 'salario', lugar: 'agricola', ingreso: 'quincena', ocurrencia: '2026-10-15' },
        { tipo: 'cuadre', fecha: '2026-10-15', lugar: 'agricola', monto: c('1566'), esperado: c('1570.20'), ref: 'cuadre-agricola' },
        { tipo: 'cargoTarjeta', fecha: '2026-10-15', monto: c('15'), tarjeta: 'bac', motivo: 'intereses', nombre: 'Crédito BAC sin detalle' },
        { tipo: 'gasto', fecha: '2026-10-17', monto: c('45'), nombre: 'Zapatos', categoria: 'ropa', medio: 'bac', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-18', monto: c('12'), nombre: 'Agua', categoria: 'servicios', medio: 'debito', pago: 'agua', ref: 'agua-oct' },
        { tipo: 'cuadre', fecha: '2026-10-18', lugar: 'efectivo', monto: c('52'), esperado: c('60'), ref: 'cuadre-efectivo' },
        { tipo: 'gasto', fecha: '2026-10-19', monto: c('12'), nombre: 'Mercado', categoria: 'mercado', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-19', monto: c('38.40'), nombre: 'Súper', categoria: 'super', medio: 'debito', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-20', monto: c('25'), nombre: 'Internet', categoria: 'servicios', medio: 'debito', pago: 'internet', ref: 'internet-oct' },
        { tipo: 'gasto', fecha: '2026-10-20', monto: c('35'), nombre: 'Casa comercial', categoria: 'cuotas', medio: 'transferencia', pago: 'casacomercial', ref: 'casacomercial-oct' },
    ];
    // «Solo planeo»: no anota compras; solo marca Pagado y cuadra. Su tarjeta espera el estado de cuenta.
    sembrar(st, planea ? filas.filter((f) => !f.anotado && f.tipo !== 'cargoTarjeta' && f.ref !== 'cuadre-agricola' && f.ref !== 'cuadre-efectivo') : filas);
    if (planea) {
        sembrar(st, [
            { tipo: 'cuadre', fecha: '2026-10-20', lugar: 'agricola', monto: c('1455.60'), esperado: c('1461.30'), ref: 'cuadre-agricola' },
            { tipo: 'cuadre', fecha: '2026-10-20', lugar: 'efectivo', monto: c('40'), esperado: c('40'), ref: 'cuadre-efectivo' },
        ]);
    } else {
        st.tarjetas[0].estados.push({ corte: '2026-10-15', total: c('245'), minimo: c('25'), aPagar: c('245'), opcion: 'total', vence: '2026-11-05', anotado: c('230'), diferencia: c('15'), motivo: 'intereses' });
    }
    for (const lugar of st.lugares) {
        const r = porId(st, 'cuadre-' + lugar.id);
        lugar.cuadre = { fecha: r.fecha, seq: r.seq, monto: r.monto };
    }
    for (const [pago, fecha, ref] of [['colegio', '2026-10-05', 'colegio-oct'], ['agua', '2026-10-18', 'agua-oct'], ['internet', '2026-10-20', 'internet-oct'], ['casacomercial', '2026-10-20', 'casacomercial-oct']]) {
        const r = porId(st, ref);
        st.pagos.find((p) => p.id === pago).hechos[fecha] = { estado: 'pagado', monto: r.monto, registro: r.id };
    }
    st.avisos = [{ id: 'av1', fecha: '2026-10-21', hora: '8:00 a. m.', emoji: '💡', titulo: 'Luz', texto: 'Venció el 12 y no la has marcado. ¿Ya la pagaste?', accion: { tipo: 'pago', id: 'luz' } }];
    return st;
}

function crearCarlos(variante) {
    const st = estadoBase({ persona: 'carlos', nombre: 'Carlos', espacio: 'Casa de Carlos' });
    st.lugares = [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵' }];
    st.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }];
    st.ingresos = [
        { id: 'semana', nombre: 'Pago de la semana', emoji: '💼', categoria: 'salario', monto: c('90'), aprox: true, frecuencia: 'semanal', diaSemana: 5, lugar: 'efectivo', principal: true, desde: '2026-10-01', llegadas: { '2026-10-02': { monto: c('90') }, '2026-10-09': { monto: c('85') }, '2026-10-16': { monto: c('90') } } },
        { id: 'turno', nombre: 'Tu turno del cuchubal', emoji: '🤝', categoria: 'cuchubal', monto: c('200'), aprox: false, frecuencia: 'unico', fecha: '2026-12-18', lugar: 'efectivo', principal: false, extra: true, desde: '2026-10-01', llegadas: {} },
    ];
    st.pagos = [
        { id: 'alquiler', nombre: 'Alquiler', emoji: '🏠', categoria: 'casa', monto: c('150'), estimado: false, frecuencia: 'mensual', dia: 1, medio: 'efectivo', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-01', monto: c('150') }] },
        { id: 'cuchubal', nombre: 'Cuchubal (tu aporte)', emoji: '🤝', categoria: 'cuotas', monto: c('10'), estimado: false, frecuencia: 'semanal', diaSemana: 5, medio: 'efectivo', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [] },
    ];
    sembrar(st, [
        { tipo: 'gasto', fecha: '2026-10-01', monto: c('150'), nombre: 'Alquiler', categoria: 'casa', medio: 'efectivo', pago: 'alquiler', ref: 'alquiler-oct' },
        { tipo: 'ingreso', fecha: '2026-10-02', monto: c('90'), nombre: 'Pago de la semana', categoria: 'salario', lugar: 'efectivo', ingreso: 'semana', ocurrencia: '2026-10-02' },
        { tipo: 'gasto', fecha: '2026-10-02', monto: c('10'), nombre: 'Cuchubal (tu aporte)', categoria: 'cuotas', medio: 'efectivo', pago: 'cuchubal', ref: 'cuchubal-02' },
        { tipo: 'ingreso', fecha: '2026-10-09', monto: c('85'), nombre: 'Pago de la semana', categoria: 'salario', lugar: 'efectivo', ingreso: 'semana', ocurrencia: '2026-10-09' },
        { tipo: 'gasto', fecha: '2026-10-09', monto: c('10'), nombre: 'Cuchubal (tu aporte)', categoria: 'cuotas', medio: 'efectivo', pago: 'cuchubal', ref: 'cuchubal-09' },
        { tipo: 'ingreso', fecha: '2026-10-16', monto: c('90'), nombre: 'Pago de la semana', categoria: 'salario', lugar: 'efectivo', ingreso: 'semana', ocurrencia: '2026-10-16' },
        { tipo: 'gasto', fecha: '2026-10-16', monto: c('10'), nombre: 'Cuchubal (tu aporte)', categoria: 'cuotas', medio: 'efectivo', pago: 'cuchubal', ref: 'cuchubal-16' },
        { tipo: 'gasto', fecha: '2026-10-18', monto: c('15'), nombre: 'Mercado', categoria: 'mercado', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-19', monto: c('4'), nombre: 'Pupusas', categoria: 'comida', medio: 'efectivo', anotado: true },
        // «corto» (C33): Carlos cuenta $60 en vez de $125 y no le alcanza la reserva del alquiler.
        { tipo: 'cuadre', fecha: '2026-10-20', lugar: 'efectivo', monto: variante === 'corto' ? c('60') : c('125'), esperado: c('131'), ref: 'cuadre-efectivo' },
    ]);
    const r = porId(st, 'cuadre-efectivo');
    st.lugares[0].cuadre = { fecha: r.fecha, seq: r.seq, monto: r.monto };
    st.pagos[0].hechos['2026-10-01'] = { estado: 'pagado', monto: c('150'), registro: porId(st, 'alquiler-oct').id };
    for (const d of ['02', '09', '16']) {
        st.pagos[1].hechos['2026-10-' + d] = { estado: 'pagado', monto: c('10'), registro: porId(st, 'cuchubal-' + d).id };
    }
    return st;
}

/**
 * v2.4.1: Rosa, para el recorrido de ingresos que varían. Vende pupusas en su casa (lo que entra cambia cada
 * día) y su hijo Josué le manda una remesa sin fecha fija. Sin ingreso principal: ve su libre hasta fin de mes.
 */
function crearRosa() {
    const st = estadoBase({ persona: 'rosa', nombre: 'Rosa', espacio: 'Casa de Rosa', horizonteVariable: 'finDeMes' });
    st.lugares = [
        { id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵' },
        { id: 'agricola', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦' },
    ];
    st.medios = [
        { id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' },
        { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'agricola', tarjetaDebito: true },
    ];
    st.apartados = [
        { id: 'emergencias', nombre: 'Emergencias', emoji: '🛟', portada: 'emergencia-paraguas', monto: c('50'), meta: c('300'), metaFecha: null, historial: [{ fecha: '2026-10-13', tipo: 'apartar', monto: c('20') }, { fecha: '2026-09-28', tipo: 'apartar', monto: c('30') }] },
        { id: 'plancha', nombre: 'Plancha nueva', emoji: '🍳', portada: 'general-alcancia', monto: c('30'), meta: c('120'), metaFecha: null, historial: [{ fecha: '2026-10-06', tipo: 'apartar', monto: c('30') }] },
    ];
    // La remesa no tiene fecha fija: se espera más o menos el 28 y no cuenta hasta que llega.
    st.ingresos = [
        { id: 'remesa', nombre: 'Remesa de Josué', emoji: '🌎', categoria: 'remesa', tipoIngreso: 'remesa', monto: c('150'), aprox: true, frecuencia: 'unico', fecha: '2026-10-28', lugar: 'agricola', principal: false, extra: true, desde: '2026-10-01', llegadas: {} },
    ];
    st.pagos = [
        { id: 'alquiler', nombre: 'Alquiler', emoji: '🏠', categoria: 'casa', monto: c('120'), estimado: false, frecuencia: 'mensual', dia: 5, medio: 'efectivo', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-05', monto: c('120') }] },
        { id: 'luz', nombre: 'Luz', emoji: '💡', categoria: 'servicios', monto: c('18'), estimado: true, frecuencia: 'mensual', dia: 15, medio: 'efectivo', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-15', monto: c('17.40') }] },
        { id: 'agua', nombre: 'Agua', emoji: '💧', categoria: 'servicios', monto: c('8'), estimado: false, frecuencia: 'mensual', dia: 18, medio: 'efectivo', avisos: [{ tipo: 'vence', on: true }], desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-18', monto: c('8') }] },
        { id: 'cooperativa', nombre: 'Cuota de la cooperativa', emoji: '🏦', categoria: 'cuotas', monto: c('45'), estimado: false, frecuencia: 'mensual', dia: 25, medio: 'efectivo', avisos: [{ tipo: 'antes', dias: 1, on: true }, { tipo: 'vence', on: true }], tipoDeuda: 'prestamo', deuda: { debe: c('540') }, desde: '2026-10-01', hechos: {}, previos: [{ fecha: '2026-09-25', monto: c('45') }] },
    ];
    const venta = (fecha, monto) => ({ tipo: 'ingreso', fecha, monto: c(monto), nombre: 'Venta de pupusas', categoria: 'venta', lugar: 'efectivo', anotado: true });
    sembrar(st, [
        // Septiembre
        { tipo: 'ingreso', fecha: '2026-09-26', monto: c('150'), nombre: 'Remesa de Josué', categoria: 'remesa', lugar: 'agricola' },
        // Octubre
        venta('2026-10-01', '42'),
        { tipo: 'gasto', fecha: '2026-10-02', monto: c('18'), nombre: 'Mercado', categoria: 'mercado', medio: 'efectivo', anotado: true },
        venta('2026-10-03', '55'),
        { tipo: 'gasto', fecha: '2026-10-05', monto: c('120'), nombre: 'Alquiler', categoria: 'casa', medio: 'efectivo', pago: 'alquiler', ref: 'alquiler-oct' },
        venta('2026-10-06', '38'),
        { tipo: 'gasto', fecha: '2026-10-08', monto: c('15.50'), nombre: 'Gas', categoria: 'casa', medio: 'efectivo', anotado: true },
        venta('2026-10-09', '47'),
        { tipo: 'gasto', fecha: '2026-10-10', monto: c('14'), nombre: 'Queso', categoria: 'mercado', medio: 'efectivo', anotado: true },
        venta('2026-10-13', '51'),
        { tipo: 'gasto', fecha: '2026-10-15', monto: c('17.40'), nombre: 'Luz', categoria: 'servicios', medio: 'efectivo', pago: 'luz', ref: 'luz-oct' },
        venta('2026-10-16', '44'),
        { tipo: 'gasto', fecha: '2026-10-17', monto: c('21'), nombre: 'Mercado', categoria: 'mercado', medio: 'efectivo', anotado: true },
        { tipo: 'gasto', fecha: '2026-10-18', monto: c('8'), nombre: 'Agua', categoria: 'servicios', medio: 'efectivo', pago: 'agua', ref: 'agua-oct' },
        venta('2026-10-19', '39'),
        { tipo: 'gasto', fecha: '2026-10-20', monto: c('5'), nombre: 'Recarga', categoria: 'telefono', medio: 'efectivo', anotado: true },
        { tipo: 'cuadre', fecha: '2026-10-20', lugar: 'efectivo', monto: c('110'), esperado: c('113.50'), ref: 'cuadre-efectivo' },
        { tipo: 'cuadre', fecha: '2026-10-20', lugar: 'agricola', monto: c('95'), esperado: c('95'), ref: 'cuadre-agricola' },
    ]);
    for (const lugar of st.lugares) {
        const r = porId(st, 'cuadre-' + lugar.id);
        lugar.cuadre = { fecha: r.fecha, seq: r.seq, monto: r.monto };
    }
    for (const [pago, fecha, ref] of [['alquiler', '2026-10-05', 'alquiler-oct'], ['luz', '2026-10-15', 'luz-oct'], ['agua', '2026-10-18', 'agua-oct']]) {
        const r = porId(st, ref);
        st.pagos.find((p) => p.id === pago).hechos[fecha] = { estado: 'pagado', monto: r.monto, registro: r.id };
    }
    return st;
}

/** La persona del primer día: todavía no hay nada; el recorrido lo llena. */
function crearNueva() {
    return estadoBase({ persona: 'nueva', nombre: '', espacio: 'Tu espacio', configurado: false });
}

window.DATOS = { CATEGORIAS, INGRESO_CATEGORIAS, TIPOS_INGRESO, EMOJI_NOMBRE, PAGOS_FRECUENTES, TIPOS_DEUDA, BANCOS, SUSCRIPCIONES, crearAna, crearCarlos, crearRosa, crearNueva, sembrar, c };
