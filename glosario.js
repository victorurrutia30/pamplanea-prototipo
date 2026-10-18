// Producto v2.4 · prototipo. Glosario sencillo: los mismos textos en los «?» de la app y en «Aprende».
// Dos o tres líneas, de tú, con un ejemplo de números redondos y sin palabras técnicas. También los
// consejos de la primera vez en cada pantalla (uso normal, una sola vez por pantalla).
'use strict';
window.GLOSARIO = [
    { id: 'libre', t: 'Libre', texto: 'Lo que puedes gastar hasta tu próxima quincena. Si tienes $100 y antes pagas $40, te quedan $60 libres.' },
    { id: 'pagasCon', t: 'Lo pagas con', texto: 'De qué dinero sale cada pago. El alquiler del 30 sale de tu quincena del 29. Puedes cambiarlo o repartirlo: $100 de cada una.' },
    { id: 'proxima', t: 'Próxima quincena', texto: 'Cómo quedas cuando te paguen: entran $600, pagas $100 con eso y te quedarían $500. Si hoy te sobra, pásalo a la próxima.' },
    { id: 'ahorros', t: 'Ahorros', texto: 'Le pones nombre a una parte de tu dinero: $50 para «Emergencias». No se mueve de tu banco o efectivo; solo deja de contar en tu libre.' },
    { id: 'cuadrar', t: 'Cuadrar', texto: 'Decirle a la app cuánto tienes de verdad. Si cree que tienes $34 y tienes $30, los $4 quedan «sin detalle». Desde ahí sigue la cuenta.' },
    { id: 'deudas', t: 'Deudas', texto: 'Tus tarjetas, préstamos y cuotas. Lo que compras con tarjeta baja tu libre ese día. Una cuota de $25 al mes aparece sola en Pagos.' },
    { id: 'tarjeta', t: 'Tarjeta de crédito', texto: 'Lo que compras con ella baja tu libre ese mismo día. Su pago sale de lo que ya tienes. Si no sabes su corte, te lo pido después.' },
    { id: 'adelanto', t: 'Adelanto de salario', texto: 'Si te adelantan $100, di de qué quincena te lo descuentan. Esa quincena vendrá con $100 menos: nunca se cuenta dos veces.' },
    { id: 'aguinaldo', t: 'Aguinaldo y bonos', texto: 'Suman a tu libre cuando te caen. Puedes decir que un pago de enero sale de tu aguinaldo.' },
    { id: 'alDia', t: 'Pongámonos al día', texto: 'Si pasas días sin abrir la app, te pregunta qué te cayó y qué pagaste. Sin culpa, en un minuto.' },
    { id: 'sinDetalle', t: 'Sin detalle', texto: 'Lo que no cuadró cuando dijiste cuánto tienes. No tienes que explicarlo: la app sigue desde ahí.' },
];
window.TIPS = {
    hoy: 'Tu número dice cuánto puedes gastar hasta tu quincena. Tócalo para ver de dónde sale.',
    pagos: 'Aquí ves qué pagas en cada quincena. Toca un pago para elegir con qué lo pagas.',
    midinero: 'Cuánto tienes, tus ahorros y lo que debes. Toca una puerta para ver el detalle.',
    cuentas: 'Si tu efectivo no coincide, toca «Cuadrar» y di cuánto tienes. Sin culpa.',
    ahorros: 'Tus ahorros siguen en tu banco o efectivo: solo les pones nombre.',
    deudas: 'Tus tarjetas, préstamos y cuotas. Su pago aparece solo en Pagos.',
    mes: 'En qué se te fue el dinero este mes. Toca algo para corregirlo.',
};
