// Producto v2.5 · prototipo. Glosario sencillo: UN SOLO LUGAR para los textos que explican la app. Los usan el
// entrenamiento (cada paso: para qué te sirve + un ejemplo con números redondos), los «?» y «Aprende», así dicen
// exactamente lo mismo. Cada texto cabe en dos líneas a 390 px, de tú, sin palabras técnicas y con frases de 20
// palabras o menos. `…Variable`: para quien no tiene un ingreso fijo (nunca se le habla de «quincena»); `solo`: el
// término es solo de una versión. También los consejos de la primera vez en cada pantalla (uso normal, una sola vez).
'use strict';
window.GLOSARIO = [
    { id: 'libre', t: 'Libre', para: 'Es lo que puedes gastar hasta tu quincena, sin tocar lo que debes pagar.', ejemplo: 'Tienes $100 y antes de tu quincena pagas $40: te quedan $60.', paraVariable: 'Es lo que puedes gastar hasta fin de mes (o en 15 días), sin tocar lo que debes pagar.', ejemploVariable: 'Tienes $100 y antes de fin de mes pagas $40: te quedan $60.' },
    { id: 'deDondeSale', t: '¿De dónde sale?', para: 'Sale de lo que tienes, menos tus ahorros y lo que pagas antes de tu quincena.', ejemplo: 'Tienes $1,000, $600 en ahorros y pagas $100: te quedan $300.', paraVariable: 'Sale de lo que tienes, menos tus ahorros y lo que pagas antes de fin de mes.' },
    { id: 'anotar', t: 'Anotar (el botón +)', para: 'Apunta lo que gastas o lo que te entra, como lo dirías en voz alta.', ejemplo: 'Compraste pupusas por $6: escribes «pupusas 6» y tu libre baja $6.', paraVariable: 'Apunta lo que vendes y lo que gastas, como lo dirías en voz alta.', ejemploVariable: 'Vendiste $45 de pupusas: escribes «vendí 45» y tu libre sube $45.' },
    { id: 'pagado', t: 'Pagado', para: 'Cuando pagues algo, tócale «Pagado». Tu libre no cambia: ya estaba restado.', ejemplo: 'Pagas el teléfono de $15: tu libre sigue igual y lo que tienes baja $15.' },
    { id: 'loQueViene', t: 'Próximos pagos', para: 'Lo que vence antes de tu quincena ya está restado de tu libre.', ejemplo: 'El teléfono de $15 vence el 25: ya está restado.', paraVariable: 'Lo que vence antes de fin de mes ya está restado de tu libre.', ejemploVariable: 'La cuota de $45 vence el 25: ya está restada.' },
    { id: 'pagasCon', t: 'Lo pagas con', para: 'Cada pago dice de qué dinero sale: de lo que tienes o de tu próxima quincena.', ejemplo: 'El colegio vence el 5: sale de tu quincena del 30, no de tu libre de hoy.', paraVariable: 'Cada pago dice de qué dinero sale: de lo que tienes o de lo que tengas cuando venza.', ejemploVariable: 'El alquiler vence el 5 del otro mes: sale de lo que tengas ese día.' },
    { id: 'repartir', t: 'Cambiar o repartir', solo: 'fijo', para: 'En cada pago puedes cambiar con qué dinero lo pagas, o pagarlo en partes.', ejemplo: 'Alquiler de $200: $100 de esta quincena y $100 de la próxima.' },
    { id: 'proxima', t: 'Próxima quincena', tVariable: 'El próximo mes', para: 'Te dice cómo quedas cuando te paguen: lo que entra, lo que pagas y lo que te queda.', ejemplo: 'Entran $600 y con eso pagas $100: te quedarían $500.', paraVariable: 'Lo que pagas el mes que viene. Tus ventas cuentan cuando las anotas.', ejemploVariable: 'El próximo mes pagas $190: lo vas juntando con lo que vendes.' },
    { id: 'aprox', t: 'El signo ~', para: '~ quiere decir «más o menos»: es lo que esperas. Cuenta de verdad cuando llega.', ejemplo: 'Esperas ~$600 y te caen $590: la app usa los $590.', ejemploVariable: 'La luz es ~$18 y el recibo dice $17: la app usa los $17.' },
    { id: 'pasar', t: 'Pasar a la próxima', solo: 'fijo', para: 'Si hoy te sobra, guárdalo para tu próxima quincena. Ya no cuenta en tu libre de hoy.', ejemplo: 'Te sobran $50: los pasas y tu próxima quincena tiene $50 más.' },
    { id: 'guardar', t: 'Guardar para un pago', para: 'Te sugiero guardar para lo que viene. Tú decides cuánto: nada se guarda solo.', ejemplo: 'Guardas $40 para el alquiler: tu libre baja $40 y el alquiler ya los tiene.' },
    { id: 'ahorros', t: 'Ahorros', para: 'Le pones nombre a una parte de tu dinero. Sigue en tu banco o efectivo.', ejemplo: '$50 para «Emergencias»: siguen ahí, pero ya no cuentan en tu libre.' },
    { id: 'ahorrar', t: 'Ahorrar', para: 'Toca «Ahorrar», di cuánto y en cuál. Tu libre baja; el dinero no se mueve.', ejemplo: 'Ahorras $50 en «Emergencias»: tu libre baja $50.' },
    { id: 'usar', t: 'Usar un ahorro', para: 'Cuando gastes lo que juntaste, toca «Usar»: anota el gasto y cierra la meta.', ejemplo: 'Juntaste $600 para la laptop y la compras: tu libre no cambia.' },
    { id: 'libreCero', t: 'Libre en $0', para: 'Quiere decir que no te sobra. Te digo cuánto falta, sin culpa.', ejemplo: 'Vendes poco: libre $0 y «faltan $50 para tus ahorros». Puedes sacar de uno.' },
    { id: 'cuadrar', t: 'Cuadrar', para: 'Es decirle a la app cuánto tienes de verdad. Desde ahí sigue la cuenta.', ejemplo: 'La app cree que tienes $34 y tienes $30: los $4 quedan «sin detalle».', paraVariable: 'Al final del día cuentas tu efectivo y lo dices. Desde ahí sigue la cuenta.' },
    { id: 'sinDetalle', t: 'Sin detalle', para: 'Es lo que no cuadró cuando dijiste cuánto tienes. No tienes que explicarlo.', ejemplo: 'Creía $34 y tenías $30: $4 «sin detalle», y sigue desde $30.' },
    { id: 'deudas', t: 'Deudas', para: 'Son tus tarjetas, préstamos y cuotas. Su pago aparece solo en Pagos.', ejemplo: 'Una cuota de $25 al mes: la ves aquí y en Pagos cada mes.' },
    { id: 'tarjeta', t: 'Tarjeta de crédito', para: 'Lo que compras con ella baja tu libre ese mismo día, aunque la pagues después.', ejemplo: 'Compras zapatos de $30 con tarjeta: tu libre baja $30 hoy.' },
    { id: 'estadoCuenta', t: 'Estado de cuenta', para: 'Es el aviso del banco que dice cuánto pagar de tu tarjeta. Cuando llegue, anótalo.', ejemplo: 'Dice pago de contado $245 y mínimo $25: tú eliges cuánto pagas.' },
    { id: 'aguinaldo', t: 'Aguinaldo y bonos', solo: 'fijo', para: 'Lo que te cae una vez suma a tu libre cuando llega, no antes.', ejemplo: 'Aguinaldo de $300 el 12 de diciembre: ese día suma a tu libre.' },
    { id: 'pagarConExtra', t: 'Pagar con el aguinaldo', solo: 'fijo', para: 'En «Lo pagas con» puedes elegir tu aguinaldo. Cuenta cuando llegue.', ejemplo: 'La matrícula de enero, $100, sale de tu aguinaldo de diciembre.' },
    { id: 'adelanto', t: 'Adelanto de salario', solo: 'fijo', para: 'Si te adelantan salario, di de qué quincena te lo descuentan. Nunca cuenta dos veces.', ejemplo: 'Te adelantan $100: esa quincena vendrá con $100 menos.' },
    { id: 'remesa', t: 'Remesa o dinero que esperas', para: 'Lo que esperas no suma a tu libre hasta que llega. Así no gastas lo que no tienes.', ejemplo: 'Esperas $150 de remesa: el día que llega tocas «Ya llegó» y suma.' },
    { id: 'hastaCuando', t: '¿Hasta cuándo ves tu libre?', solo: 'variable', para: 'Como lo que te entra varía, tú eliges: hasta fin de mes o los próximos 15 días.', ejemplo: 'Si planeas de 15 en 15 días, elige «Los próximos 15 días».' },
    { id: 'alDia', t: 'Pongámonos al día', para: 'Te pregunta qué te cayó, qué pagaste y cuánto tienes. Sin culpa, en un minuto.', ejemplo: 'Volviste después de dos semanas: tocas «Empezar» y quedas al día.' },
];
/** El término en la versión que toca (`variable`: sin ingreso fijo). Devuelve { id, t, para, ejemplo, texto }. */
window.terminoGlosario = (id, variable = false) => {
    const g = window.GLOSARIO.find((x) => x.id === id);
    if (!g) return null;
    const t = (variable && g.tVariable) || g.t;
    const para = (variable && g.paraVariable) || g.para;
    const ejemplo = (variable && g.ejemploVariable) || g.ejemplo;
    return { id, t, para, ejemplo, solo: g.solo || null, texto: `${para} Ejemplo: ${ejemplo}` };
};
window.TIPS = {
    hoy: 'Tu número dice cuánto puedes gastar hasta tu quincena. Tócalo para ver de dónde sale.',
    pagos: 'Aquí ves qué pagas en cada quincena. Toca un pago para elegir con qué lo pagas.',
    midinero: 'Cuánto tienes, tus ahorros y lo que debes. Toca una puerta para ver el detalle.',
    cuentas: 'Si tu efectivo no coincide, toca «Cuadrar» y di cuánto tienes. Sin culpa.',
    ahorros: 'Tus ahorros siguen en tu banco o efectivo: solo les pones nombre.',
    deudas: 'Tus tarjetas, préstamos y cuotas. Su pago aparece solo en Pagos.',
    mes: 'En qué se te fue el dinero este mes. Toca algo para corregirlo.',
    // Sin ingreso fijo: Hoy y Pagos no hablan de «quincena».
    hoyVariable: 'Tu número dice cuánto puedes gastar hasta fin de mes (o en 15 días). Tócalo para ver de dónde sale.',
    pagosVariable: 'Aquí ves qué pagas y cuándo. Toca un pago para ver de qué dinero sale.',
    // V2-58 (#24): también en Anotar y en la ficha de un pago.
    anotar: 'Escribe como hablas: «pupusas 6» o «vendí 45». Si algo no es, tócalo y lo cambias.',
    pago: 'Aquí ves cuándo vence y de qué dinero sale. Cuando lo pagues, toca «Pagado».',
};
