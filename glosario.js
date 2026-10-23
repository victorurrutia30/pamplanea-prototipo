// Producto v2.5 · prototipo. Glosario sencillo: UN SOLO LUGAR para los textos que explican la app. Los usan el
// entrenamiento, los «?» y «Aprende», así dicen exactamente lo mismo. v2.6.1 (V2-76): los ejemplos del glosario NO
// llevan montos (los «?» salen con los datos de cualquiera); los del entrenamiento salen de los números que se ven
// en ese momento (tour.js). Cada texto cabe en dos líneas a 390 px, de tú, sin palabras técnicas y con frases de 20
// palabras o menos. `…Variable`: para quien no tiene un ingreso fijo (nunca se le habla de «quincena»); `solo`: el
// término es solo de una versión. También los consejos de la primera vez en cada pantalla (uso normal, una sola vez).
'use strict';
window.GLOSARIO = [
    { id: 'libre', t: 'Libre', para: 'Es lo que puedes gastar hasta tu quincena: tu dinero, menos tus ahorros y lo que falta de tu plan.', ejemplo: 'La app resta de lo que tienes tus ahorros y lo que falta de tu plan. Lo que queda es tu libre.', paraVariable: 'Es lo que puedes gastar hasta fin de mes (o en 15 días), sin tocar tu plan.', ejemploVariable: 'La app resta de lo que tienes tus ahorros y lo que pagas antes de fin de mes. Lo que queda es tu libre.' },
    { id: 'deDondeSale', t: '¿De dónde sale?', para: 'Sale de lo que tienes, menos tus ahorros y lo que falta de tu plan antes de tu quincena.', ejemplo: 'Toca tu número y ves la cuenta: lo que tienes, menos ahorros, menos lo que falta de tu plan.', paraVariable: 'Sale de lo que tienes, menos tus ahorros y lo que pagas antes de fin de mes.' },
    { id: 'anotar', t: 'Anotar (el botón +)', para: 'Anota lo que gastas o lo que recibes, como lo dirías en voz alta.', ejemplo: 'Escribe «pupusas 6», o toca «Gasté» y llena lo que falta. Tu libre baja en ese monto.', paraVariable: 'Anota lo que vendes y lo que gastas, como lo dirías en voz alta.', ejemploVariable: 'Si vendiste, escribes «vendí» y cuánto. Tu libre sube en ese monto.' },
    { id: 'pagado', t: 'Ya lo pagué', para: 'Cuando pagues algo de tu plan, toca «Ya lo pagué». Tu libre no cambia: ya estaba contado.', ejemplo: 'Marcas el teléfono como pagado: tu libre sigue igual y lo que tienes baja.' },
    { id: 'loQueViene', t: 'Lo que viene', para: 'Lo que vence antes de tu quincena ya está contado en tu libre.', ejemplo: 'Si el teléfono vence antes de tu quincena, ya está contado en tu libre.', paraVariable: 'Lo que vence antes de fin de mes ya está contado en tu libre.', ejemploVariable: 'Si una cuota vence antes de fin de mes, ya está contada en tu libre.' },
    { id: 'pagasCon', t: 'Lo pagas con', para: 'Cada cosa de tu plan dice de qué dinero sale: de lo que tienes o de tu próxima quincena.', ejemplo: 'Si el colegio vence después de tu quincena, sale de esa quincena y no de tu libre de hoy.', paraVariable: 'Cada cosa de tu plan dice de qué dinero sale: lo que tienes o lo que tengas cuando venza.', ejemploVariable: 'Si el alquiler vence el otro mes, sale de lo que tengas ese día.' },
    { id: 'repartir', t: 'Cambiar o repartir', solo: 'fijo', para: 'En cada cosa de tu plan puedes cambiar con qué dinero la pagas, o pagarla en partes.', ejemplo: 'El alquiler puede salir una parte de esta quincena y otra de la próxima.' },
    { id: 'proxima', t: 'Próxima quincena', tVariable: 'El próximo mes', para: 'Te dice cómo quedas cuando te paguen: lo que entra menos tu plan. No suma lo que te sobre hoy.', ejemplo: 'En Mi plan, toca «Próxima»: ves cuánto entra, cuánto sale y cuánto te quedaría.', paraVariable: 'Lo que pagas el mes que viene. Tus ventas cuentan cuando las anotas.', ejemploVariable: 'En Mi plan, toca «Próximo mes»: ves cuánto pagas y lo juntas con lo que vendes.' },
    { id: 'aprox', t: '«aprox.»', para: '«aprox.» quiere decir «más o menos»: es lo que esperas. Cuenta de verdad cuando llega.', ejemplo: 'Si esperas «más o menos» una cantidad y llega otra, la app usa la que llegó.', ejemploVariable: 'Si la luz es «más o menos» una cantidad y el recibo dice otra, la app usa la del recibo.' },
    { id: 'pasar', t: 'Pasar a la próxima', solo: 'fijo', para: 'Si hoy te sobra, déjalo para tu próxima quincena. Ya no cuenta en tu libre de hoy.', ejemplo: 'Lo que pasas a tu próxima quincena baja tu libre de hoy y suma a esa quincena.' },
    { id: 'guardar', t: 'Dejar listo para un gasto', para: 'Te sugiero dejar algo listo para lo que viene. Tú decides cuánto: nada se hace solo.', ejemplo: 'Lo que dejas listo para el alquiler baja tu libre y queda para ese pago.' },
    { id: 'ahorros', t: 'Ahorros', para: 'Lo que ya tienes guardado. Dentro de una cuenta no cuenta en tu libre; aparte, solo se registra.', ejemplo: 'Tu ahorro «Emergencias» dentro de tu banco ya no cuenta en tu libre.' },
    { id: 'programado', t: 'Ahorro programado', para: 'Lo que guardas cada quincena. Cuenta en tu plan hasta que tocas «Ya lo guardé».', ejemplo: 'Si guardas cada quincena para Emergencias, eso ya no cuenta en tu libre.', paraVariable: 'Lo que guardas cada mes. Cuenta en tu plan hasta que tocas «Ya lo guardé».', ejemploVariable: 'Si guardas cada mes para Emergencias, eso ya no cuenta en tu libre.' },
    { id: 'variables', t: 'Presupuestos', para: 'Lo máximo que quieres gastar en algo cada quincena, como el súper. Cada gasto lo va consumiendo.', ejemplo: 'Si gastas en el súper, tu libre no baja: ya estaba en tu plan.', paraVariable: 'Lo máximo que quieres gastar en algo cada mes, como el súper. Cada gasto lo va consumiendo.' },
    { id: 'plan', t: 'Mi plan', para: 'Es lo que viene: ingresos, gastos fijos, presupuestos, ahorro programado y deudas. Cada pestaña muestra solo lo suyo.', ejemplo: 'Arriba eliges «Por fecha» o «Por tipo». Con «+ Agregar» sumas algo nuevo.' },
    { id: 'vaEn', t: '«va en» tu tarjeta', para: 'Lo que se cobra en tu tarjeta se ve en gris: ya va dentro del pago de la tarjeta.', ejemplo: 'Netflix en tu tarjeta dice «va en» y el nombre de la tarjeta: no suma aparte.' },
    { id: 'categorias', t: 'Mis categorías', para: 'Las del día a día, tus presupuestos y tus gastos fijos. Puedes crear, renombrar u ocultar.', ejemplo: 'Si no usas «Tecnología», ocúltala: lo que ya anotaste no cambia.' },
    { id: 'planMes', t: 'Mes en Mi plan', para: 'Lo que entra y sale de tu plan en un mes. Con las flechas ves otros meses.', ejemplo: 'En diciembre ves tu aguinaldo y todo lo que pagas ese mes.' },
    { id: 'mes', t: 'Mes', para: 'Te cuenta qué pasó: lo que entró, en qué se te fue y cómo vas con tus presupuestos.', ejemplo: 'Toca «Súper» en «¿En qué se te fue?» y ves solo esos gastos.' },
    { id: 'ahorrar', t: 'Guardé en un ahorro', para: 'Toca «Guardé en un ahorro», di cuánto y en cuál. Tu libre baja; el dinero no se mueve.', ejemplo: 'Lo que pones en un ahorro baja tu libre en ese mismo monto.' },
    { id: 'usar', t: 'Usé de mi ahorro', para: 'Si sacas de tu ahorro, toca «Usé de mi ahorro»: ese dinero vuelve a tu libre.', ejemplo: 'Si juntaste para la laptop y la compras, tocas «Pagué algo con él» y tu libre no cambia.' },
    { id: 'libreCero', t: 'Libre en $0', para: 'Quiere decir que no te sobra. Te digo cuánto falta, sin culpa.', ejemplo: 'Si vendes poco, tu libre queda en cero y puedes sacar de un ahorro.' },
    { id: 'cuadrar', t: 'Cuadrar', para: 'Es decirle a la app cuánto tienes de verdad. Desde ahí sigue la cuenta.', ejemplo: 'Si cuentas menos de lo que la app creía, la diferencia queda «sin detalle».', paraVariable: 'Al final del día cuentas tu efectivo y lo dices. Desde ahí sigue la cuenta.' },
    { id: 'sinDetalle', t: 'Sin detalle', para: 'Es lo que no cuadró cuando dijiste cuánto tienes. No tienes que explicarlo.', ejemplo: 'Si contaste menos de lo que la app creía, esa diferencia queda «sin detalle» y la cuenta sigue.' },
    { id: 'deudas', t: 'Deudas', para: 'Son tus tarjetas, préstamos y cuotas. Su pago aparece solo en Mi plan.', ejemplo: 'Una cuota mensual aparece aquí y también en Mi plan, cada mes.' },
    { id: 'tarjeta', t: 'Tarjeta de crédito', para: 'Lo que compras con ella baja tu libre ese mismo día. Lo que se cobra solo va en su pago.', ejemplo: 'Si compras zapatos con tarjeta, tu libre baja ese día, no cuando pagas la tarjeta.' },
    { id: 'estadoCuenta', t: 'Estado de cuenta', para: 'Es el aviso del banco que dice cuánto pagar de tu tarjeta. Cuando llegue, anótalo.', ejemplo: 'Trae el pago de contado y el pago mínimo. Tú eliges cuánto pagas.' },
    { id: 'aguinaldo', t: 'Aguinaldo y bonos', solo: 'fijo', para: 'Lo que recibes una sola vez suma a tu libre cuando llega, no antes.', ejemplo: 'Tu aguinaldo de diciembre suma a tu libre el día que llega.' },
    { id: 'pagarConExtra', t: 'Pagar con el aguinaldo', solo: 'fijo', para: 'En «Lo pagas con» puedes elegir tu aguinaldo. Cuenta cuando llegue.', ejemplo: 'La matrícula de enero puede salir de tu aguinaldo de diciembre.' },
    { id: 'adelanto', t: 'Adelanto de salario', solo: 'fijo', para: 'Si te adelantan salario, di de qué quincena te lo descuentan. Nunca cuenta dos veces.', ejemplo: 'Si te adelantan salario, la quincena que elijas vendrá con ese monto menos.' },
    { id: 'remesa', t: 'Remesa o dinero que esperas', para: 'Lo que esperas no suma a tu libre hasta que llega. Así no gastas lo que no tienes.', ejemplo: 'El día que llega tu remesa, tocas «Ya llegó» y suma a tu libre.' },
    { id: 'hastaCuando', t: '¿Hasta cuándo ves tu libre?', solo: 'variable', para: 'Como tus ingresos varían, tú eliges: hasta fin de mes o los próximos 15 días.', ejemplo: 'Si planeas de 15 en 15 días, elige «Los próximos 15 días».' },
    { id: 'alDia', t: 'Pongámonos al día', para: 'Te pregunta qué recibiste, qué pagaste y cuánto tienes. Sin culpa, en un minuto.', ejemplo: 'Volviste después de dos semanas: tocas «Empezar» y quedas al día.' },
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
    pagos: 'Cada pestaña muestra solo lo suyo. Con «+ Agregar» sumas algo; toca una fila para verla.',
    midinero: 'Cuánto tienes, tus ahorros y lo que debes. Toca una puerta para ver el detalle.',
    cuentas: 'Si tu efectivo no coincide, toca «Cuadrar» y di cuánto tienes. Sin culpa.',
    ahorros: 'Tus ahorros pueden estar dentro de una cuenta o aparte. Dentro, no cuentan en tu libre.',
    deudas: 'Tus tarjetas, préstamos y cuotas. Su pago aparece solo en Mi plan.',
    mes: 'Aquí ves qué pasó este mes y en qué se te fue. Toca una fila del historial para corregirla.',
    // Sin ingreso fijo: Hoy y Mi plan no hablan de «quincena».
    hoyVariable: 'Tu número dice cuánto puedes gastar hasta fin de mes (o en 15 días). Tócalo para ver de dónde sale.',
    pagosVariable: 'Cada pestaña muestra solo lo de su mes. Con «+ Agregar» sumas algo nuevo.',
    // V2-58 (#24): también en Anotar y en la ficha de un pago.
    anotar: 'Escribe como hablas («pupusas 6») o toca «Gasté», «Me llegó dinero»… y llena lo que falta.',
    pago: 'Aquí ves cuándo vence y de qué dinero sale. Cuando lo pagues, toca «Ya lo pagué».',
};
