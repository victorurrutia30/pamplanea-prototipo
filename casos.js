// Producto v2 · prototipo. Los 13 recorridos: los usa la guía (pasos, resultado, qué observar),
// el teléfono (estado inicial y simulaciones) y la prueba guiada (`tarea`, en lenguaje sencillo y
// sin decir dónde tocar). Un paso con `clave` se marca solo cuando el teléfono avisa ese evento
// (una clave o varias alternativas); sin `clave`, lo marca quien observa.
'use strict';
window.VERSION_PROTOTIPO = 'Prototipo v2.2 · 2026-10-16';
window.CASOS = [
    {
        id: 'C01', titulo: 'Primer día', persona: 'nueva',
        para: 'Una persona nueva configura la app y ve su primer número.',
        tarea: 'Imagina que acabas de bajar la app. Configúrala con datos inventados (por ejemplo: te pagan unos $600 cada quincena) hasta ver cuánto te queda libre.',
        pasos: [
            { t: 'Toca «Empezar» (el nombre es opcional).', clave: 'onboarding:paso1' },
            { t: '¿Cómo te pagan?: elige «Cada quincena», escribe ~600 y «En el banco».', clave: 'onboarding:ingreso:quincena' },
            { t: 'Siguiente. ¿Cuánto tienes?: elige un banco, escribe cuánto hay y algo de efectivo (este paso no se puede saltar).', clave: 'onboarding:paso3' },
            { t: '¿Con qué pagas?: prueba «Tarjeta de crédito» o sáltalo.', clave: 'onboarding:paso4' },
            { t: 'Tus pagos fijos: toca «Luz», pon 35 y el día 12; agrega otro si quieres.', clave: 'onboarding:pago:luz' },
            { t: '«Ver mi número» y luego «Ir a Hoy».', clave: 'onboarding:hoy' },
        ],
        esperado: 'Aparece «Tu primer número»: libre hasta tu quincena del 30, ya sin la luz. En Hoy se ve el mismo número y la luz en Próximos pagos.',
        observar: '¿Entiende qué le preguntamos y para qué? ¿Se siente largo? ¿Entiende que «cuánto tienes» es el punto de partida y no tiene que ser exacto?',
    },
    {
        id: 'C05', titulo: 'Anotar «pupusas 6»', persona: 'ana',
        para: 'Anotar un gasto pequeño en pocos segundos.',
        tarea: 'Acabas de comprar pupusas por $6 con efectivo. Apúntalo.',
        pasos: [
            { t: 'Toca el botón (+) Anotar, abajo al centro.', clave: 'hoja:anotar' },
            { t: 'Escribe «pupusas 6».', clave: 'entendio:gasto:pupusas' },
            { t: 'Revisa lo que entendió (Gasto · $6.00 · Pupusas · Efectivo · Hoy) y toca Guardar.', clave: 'guardado:gasto:pupusas' },
            { t: 'Mira Hoy: el libre bajó $6.00 y «Pupusas» aparece en Últimos anotados. Prueba «Deshacer».' },
        ],
        esperado: 'El libre pasa de $270.60 a $264.60 al instante y sale «✓ Guardado · Deshacer». El número dice «Incluye tarjeta $245.00, vence el 5 de noviembre» y, debajo, «Próxima quincena (30): entra ~$600 · pagos ~$55 · te quedarían ~$545» (V2-35). Ya no hay reserva automática (V2-34).',
        observar: '¿Confía en lo que entendió sin revisarlo todo? ¿Sabe que puede tocar un dato para cambiarlo? ¿Nota que el número cambió?',
    },
    {
        id: 'C11', titulo: 'Recordatorio dictado del colegio', persona: 'ana', variante: 'sinColegio',
        para: 'Crear un recordatorio con una frase y recibir el aviso.',
        tarea: 'Apunta que tienes que pagar el colegio, $20, el 5 de cada mes. Después adelanta el tiempo (en «¿Cómo?») y, cuando la app te avise, márcalo como pagado.',
        pasos: [
            { t: 'Toca (+) Anotar.', clave: 'hoja:anotar' },
            { t: 'Escribe o dicta «acuérdame colegio 20 el 5». (En el teléfono, con el micrófono del teclado.)', clave: 'entendio:pago:colegio' },
            { t: 'En «¿Se repite?» elige «Cada mes» y guarda.', clave: 'guardado:pago:colegio' },
            { t: 'Toca «Simular: es 4 de noviembre».', clave: 'sim:dia4' },
            { t: 'Toca la notificación «Mañana vence Colegio».', clave: 'aviso:abierto:colegio' },
            { t: 'En la ficha, toca «Pagado».', clave: 'guardado:pagado:colegio' },
        ],
        esperado: 'Colegio aparece en Pagos el 5. El día 4 llega el aviso (también queda en Hoy). «Pagado» se guarda sin preguntar: «Pagado con Transferencia · Cambiar · Deshacer». El libre no cambia: ya estaba contado.',
        observar: '¿Le sale natural decirlo así? ¿Entiende que «Cada mes» lo repite solo? ¿Le da confianza el aviso? ¿Usa «Cambiar» si el medio no era el correcto?',
        sims: [{ id: 'dia4', t: 'Simular: es 4 de noviembre, 8:00 a. m.' }],
    },
    {
        id: 'C16', titulo: 'Llega el estado de cuenta (no anota)', persona: 'ana', variante: 'planea',
        para: 'Quien no anota sus compras con tarjeta dice cuánto le salió y cuánto va a pagar.',
        tarea: 'Te llegó el estado de cuenta de tu tarjeta: pago de contado $245 y pago mínimo $25. Anótalo y decide cuánto vas a pagar.',
        pasos: [
            { t: 'En Hoy, toca «Ver» en el aviso («2 avisos para hoy») y lee «¿Ya te llegó tu estado de cuenta?» (o toca la notificación).', clave: ['hoja:atencion', 'aviso:abierto:estado'] },
            { t: 'Toca «Anotar estado de cuenta».', clave: 'hoja:estadoCuenta' },
            { t: 'Escribe pago de contado 245 y mínimo 25. Mira «¿Dónde lo encuentro?».', clave: 'estado:paso3' },
            { t: 'Elige cuánto vas a pagar (Todo, Mínimo u Otro) y lee el consejo. Guarda.', clave: 'guardado:estado' },
            { t: 'Mira el libre en Hoy y la tarjeta en Mi dinero → Deudas.', clave: 'pantalla:deudas' },
        ],
        esperado: 'Hoy muestra un solo aviso agrupado («2 avisos para hoy · Ver», V2-42): el estado de cuenta y la luz vencida. Con «Todo», el libre baja de $560.60 a $315.60 y dice «Incluye tarjeta $245.00, vence el 5». Con «Mínimo» baja $25.00; los $220.00 se ven como deuda y la ficha explica, sin culpa, que los intereses llegarán en el próximo estado de cuenta.',
        observar: '¿Sabe dónde encontrar los dos montos? ¿El consejo se siente como ayuda y no como regaño? ¿Entiende por qué bajó su libre si vence después de su quincena?',
    },
    {
        id: 'C19', titulo: 'Llega la quincena', persona: 'ana', variante: 'quincena',
        para: 'El día de pago: confirmar, ver lo ya contado y repartir.',
        tarea: 'Hoy es día de pago y te cayeron $600 en el banco. Confírmalo y decide si quieres apartar algo.',
        pasos: [
            { t: 'Hoy es 30 de octubre: el número dice «Libre por ahora». Toca «¿Ya te cayó?» (o la notificación).', clave: 'hoja:ingresoLlego' },
            { t: 'Revisa el monto (~$600 en Banco Agrícola) y toca Siguiente.', clave: 'ingreso:llego:quincena' },
            { t: 'En «Reparte tu quincena» mira «Ya está contado».', clave: 'pantalla:reparte:quincena' },
            { t: 'Acepta o no la sugerencia de apartar.', clave: 'reparte:apartar' },
            { t: 'Mira «3. ¿Cuadramos?» (opcional), toca Listo y mira Hoy.', clave: 'reparte:fin' },
        ],
        esperado: 'Antes: «Libre por ahora» $270.60 con «¿Ya te cayó?» y una sola tarjeta (aunque lleva 10 días sin anotar, V2-31 #10). Después: $815.60 «Hasta tu quincena del 15»; «Ya está contado» trae el colegio y la luz de noviembre (se pagan con esta quincena) y la tarjeta. Sugiere $60.00 a Emergencias (10 %), nunca más que tu libre; con eso, $755.60. «3. ¿Cómo quedas la próxima?» muestra la quincena del 15 y ofrece pasar algo a la próxima; luego «4. ¿Cuadramos?».',
        observar: '¿Entiende que los pagos ya estaban restados? ¿Siente la sugerencia como opcional? ¿Le gustaría hacer esto cada quincena?',
    },
    {
        id: 'C20', titulo: 'Carlos: pago semanal y alquiler mensual', persona: 'carlos',
        para: 'Con ingreso semanal, la app avisa a tiempo que al alquiler le faltaría y sugiere reservar; Carlos decide de qué dinero (V2-34).',
        tarea: 'Eres Carlos: te pagan cada viernes y el alquiler de $150 se paga el 1. Averigua cuánto puedes gastar hasta el viernes y qué te sugiere la app para el alquiler. Decide si reservas algo y de qué dinero.',
        pasos: [
            { t: 'Mira Hoy: «Hasta el viernes · en 2 días», libre $125.00 y «Próximo pago (viernes 23)».' },
            { t: 'Lee la sugerencia (ámbar): el viernes 30 te caen ~$90 y ese periodo pagas ~$160; te faltarían ~$70.' },
            { t: 'Toca «Sí, $70.00», elige de cuál dinero (lo que tienes ahora o tu pago del viernes 23) y toca «Reservar».', clave: 'guardado:reservar' },
            { t: 'Abre el alquiler (en Pagos o en Próximos pagos) y mira «Lo pagas con».', clave: 'pantalla:pago:alquiler' },
            { t: 'Toca «Simular: llega el viernes 23» y confirma el pago de la semana.', clave: 'ingreso:llego:semana' },
            { t: 'Toca Listo y mira tu número.', clave: 'reparte:fin' },
        ],
        esperado: 'Antes: libre $125.00 (~$62 por día): nada se reserva solo. La sugerencia es ámbar y no hace nada hasta que eliges. Si reservas $70.00 de lo que tienes ahora, el libre baja a $55.00 y el alquiler dice «Reservado de lo que tienes ahora $70.00 · Con tu pago del viernes 30 $80.00». Si lo reservas de tu pago del viernes 23, hoy sigues en $125.00 y ese viernes queda «entra ~$90 · pagos ~$80». Después del viernes (con lo reservado de ahora): $135.00 hasta el viernes 30.',
        observar: '¿Entiende por qué la app sugiere reservar? ¿Elige de lo que tiene ahora o del próximo viernes? ¿Le da tranquilidad decidir él, o extraña que se guarde solo?',
        sims: [{ id: 'viernes', t: 'Simular: llega el viernes 23' }],
    },
    {
        id: 'C23', titulo: 'Usar el ahorro Laptop (débito)', persona: 'ana', inicio: 'midinero',
        para: 'Gastar lo que se juntó y celebrarlo como logro.',
        tarea: 'Ya juntaste para la laptop y la compraste con tu tarjeta de débito. Anótalo.',
        pasos: [
            { t: 'En Mi dinero toca «Ahorros» y luego «Laptop» (lista para usar).', clave: 'pantalla:apartado:laptop' },
            { t: 'Toca «Usar».', clave: 'hoja:usar' },
            { t: 'Revisa monto ($600.00) y con qué pagaste (Débito Agrícola). Toca «Usar».', clave: 'guardado:usar:laptop' },
            { t: 'Lee la pantalla de logro y vuelve a Mi dinero.', clave: ['pantalla:midinero', 'pantalla:hoy'] },
        ],
        esperado: '«¡Meta cumplida!». Tu libre no cambia ($270.60). La laptop pasa a «Logros» en Ahorros («Usado con Débito Agrícola»); en Cuentas, Banco Agrícola baja $600.00.',
        observar: '¿Entiende que usar no le quita libre? ¿Se siente como un logro y no como «perder» el ahorro?',
    },
    {
        id: 'C26', titulo: 'Volver después de dos semanas', persona: 'ana', variante: 'ausente',
        para: 'Retomar sin culpa: confirmar lo pendiente y cuadrar.',
        tarea: 'Volviste a la app después de dos semanas sin usarla. Ponla al día.',
        pasos: [
            { t: 'Hoy es 6 de noviembre y no has anotado desde el 20 de octubre: «Libre por ahora» y la tarjeta «Pongámonos al día».' },
            { t: 'Toca «Empezar».', clave: 'pantalla:aldia' },
            { t: 'Ingresos: di si te cayó la quincena del 30.', clave: 'aldia:paso2' },
            { t: 'Pagos: marca Pagado, Aún no o Saltar (o «Marcar todos»).', clave: 'aldia:paso3' },
            { t: 'Cuadra Efectivo y Banco con lo que tienes de verdad. Toca Listo.', clave: 'aldia:fin' },
        ],
        esperado: 'Al entrar: «Tu quincena del 30 · falta confirmarla», «Libre por ahora» $270.60 (lo que se paga con la quincena del 30 no se descuenta hasta confirmarla) y «¿Ya te cayó tu quincena del 30?»; en el paso de ingresos: «Sí, me cayó», «Todavía no» o «No me va a caer». Al terminar: «¡Listo, estás al día!» con el número nuevo; lo que no cuadró queda «sin detalle», sin pedir explicaciones.',
        observar: '¿Se siente regañado en algún momento? ¿Entiende «sin detalle»? ¿Cuánto tarda?',
    },
    {
        id: 'C30', titulo: 'Regalo olvidado', persona: 'ana', variante: 'regalo',
        para: 'Ana gastó lo de su ahorro Regalo, lo anota sin vincularlo y la app la ayuda a arreglarlo.',
        tarea: 'Ya compraste el regalo de tu mamá: $20 en efectivo. Apúntalo escribiendo «regalo mamá 20» y, si te pregunta algo, di que no. Después revisa si quedó algo raro y arréglalo.',
        pasos: [
            { t: 'Mira Hoy: el aviso agrupado («2 avisos para hoy») trae «Tu ahorro Regalo era para el 10. ¿Ya lo usaste?». Déjalo por ahora.' },
            { t: 'Toca (+) Anotar y escribe «regalo mamá 20».', clave: 'entendio:gasto:regalo' },
            { t: 'Cuando pregunte «¿Lo tomas de tu ahorro Regalo?», toca «No» (así se olvida) y guarda.', clave: 'guardado:gasto:regalo' },
            { t: 'Arréglalo: en Hoy, «Ver» → «Sí, ya lo gasté» y elige ese gasto; o en Mes, toca el gasto y «Tomarlo de un ahorro».', clave: ['guardado:yaLoUse', 'guardado:correccion:apartado'] },
            { t: 'Mira el libre en Hoy y Mi dinero → Ahorros → Logros.', clave: 'pantalla:ahorros' },
        ],
        esperado: 'Al empezar el libre es $250.60. Al anotar sin vincular baja a $230.60 (el regalo contaba dos veces). Al cerrar el ahorro con ese gasto vuelve a $250.60, sin crear otro gasto, y «Regalo» pasa a Logros. Si eliges «No lo usé», el dinero vuelve a tu libre y queda en «Cerrados», no en Logros.',
        observar: '¿Entiende la pregunta del ahorro al anotar? ¿Nota que el número bajó «de más»? ¿Encuentra cómo arreglarlo? ¿Le da tranquilidad que no se cree otro gasto?',
    },
    {
        id: 'C31', titulo: '+ Tarjeta o préstamo', persona: 'ana', inicio: 'midinero',
        para: 'Agregar una segunda tarjeta y una cuota de casa comercial; sus pagos aparecen solos en Pagos.',
        tarea: 'Sacaste una tarjeta nueva, «Crédito Cuscatlán» (corte el 20, pago el 10, cupo $500), y compraste en «Almacén La Esquina» en cuotas de $25 cada día 28 (debes $300). Agrega las dos y revisa que aparezcan en tus pagos.',
        pasos: [
            { t: 'En Mi dinero → Deudas, toca «+ Tarjeta o préstamo».', clave: 'hoja:nuevaDeuda' },
            { t: 'Elige «Tarjeta de crédito»: Crédito Cuscatlán, corte 20, pago 10, cupo 500. Guarda.', clave: 'guardado:deuda:tarjeta' },
            { t: 'Ve a Pagos, toca «+ Pago» y elige «Cuota de un préstamo».', clave: 'deuda:desdePagos' },
            { t: 'Elige «Casa comercial»: Almacén La Esquina, cuota 25, día 28, debes 300. Guarda.', clave: 'guardado:deuda:casacomercial' },
            { t: 'Revisa «Esta quincena» y «Próxima» en Pagos.', clave: 'pagos:proxima' },
        ],
        esperado: 'Almacén La Esquina aparece en Pagos el 28 (esta quincena) y baja el libre de $270.60 a $245.60. Crédito Cuscatlán aparece el 10 de noviembre «según tu estado de cuenta»; si al agregarla no pusiste tu último estado de cuenta (opcional), Hoy te lo pide después del corte del 20 de noviembre. Las dos están en Mi dinero → Deudas, cada una con una sola ficha; sin «cuánto debes», la cuota dice «$25.00 al mes».',
        observar: '¿Encuentra dónde agregarlas? ¿Entiende que es el mismo formulario desde Pagos y desde Mi dinero? ¿Le sorprende que el pago aparezca solo?',
    },
    {
        id: 'C32', titulo: 'Usar Laptop con Crédito BAC', persona: 'ana', inicio: 'midinero',
        para: 'Usar un ahorro pagando con tarjeta de crédito: el dinero queda reservado para pagarla (V2-27).',
        tarea: 'Compraste la laptop que estabas juntando, pero la pagaste con tu tarjeta de crédito BAC. Anótalo.',
        pasos: [
            { t: 'En Mi dinero toca «Ahorros» y luego «Laptop».', clave: 'pantalla:apartado:laptop' },
            { t: 'Toca «Usar».', clave: 'hoja:usar' },
            { t: 'En «¿Con qué pagaste?» elige «Crédito BAC» y toca «Usar».', clave: 'guardado:usar:credito' },
            { t: 'Lee el mensaje y toca «Entendido» (o «Pagar la tarjeta ya» → «¿Cuánto pagas?»).', clave: ['pantalla:midinero', 'logro:pagarYa'] },
            { t: 'Toca el número: «Reservado para pagos» trae los $600.00 para la tarjeta. Mira también la tarjeta (Mi dinero → Deudas) y Logros (Mi dinero → Ahorros).' },
        ],
        esperado: '«¡Meta cumplida! Pagaste con tu tarjeta, así que tus $600.00 quedan guardados para el pago del 5 de diciembre» (con mes: la tarjeta también tiene el pago del 5 de noviembre). El libre sigue en $270.60, el banco no cambia y la deuda de Crédito BAC sube a $890.00 (cupo: te quedan $610.00). Logros: «Usado con Crédito BAC · $600.00 reservados para tu pago del 5 de diciembre». «Pagar la tarjeta ya» pregunta «¿Cuánto pagas?»: Solo la laptop $600.00 / Todo lo que debes $890.00 / Otro. Con «Solo la laptop» el banco baja $600.00, la reserva desaparece, el pago del 5 de noviembre ($245.00) sigue igual y el libre no cambia.',
        observar: '¿Entiende por qué su libre no cambió? ¿Entiende que el dinero sigue en el banco pero ya tiene dueño? ¿Prefiere pagar la tarjeta ya?',
    },
    {
        id: 'C33', titulo: 'Carlos con poco dinero', persona: 'carlos', variante: 'corto',
        para: 'Con $60 en efectivo, Carlos ve lo que de verdad le queda hasta el viernes y una sugerencia para el alquiler, sin alarmas rojas.',
        tarea: 'Eres Carlos y hoy solo tienes $60. Averigua cuánto puedes gastar hasta el viernes y qué te falta para el alquiler.',
        pasos: [
            { t: 'Mira Hoy: libre $60.00 y la sugerencia ámbar del alquiler.' },
            { t: 'Toca el número para ver el detalle.', clave: 'hoja:desglose' },
            { t: 'Decide: «Sí» (reservar) o «No, después veo».', clave: ['guardado:reservar', 'sugerencia:no'] },
            { t: 'Toca «Simular: llega el viernes 23» y confirma el pago.', clave: 'ingreso:llego:semana' },
        ],
        esperado: 'Libre $60.00 (~$30 por día): el alquiler del 1 se paga con tu pago del viernes 30, así que hoy no se descuenta. La sugerencia es ámbar, nunca roja (con tus viernes sí alcanza): el viernes 30 te faltarían ~$70. «No, después veo» la calla hasta que falte más. Después del viernes 23 (sin reservar): $140.00.',
        observar: '¿Se siente regañado? ¿Entiende que el alquiler sale de sus próximos viernes? ¿Qué decide con la sugerencia?',
        sims: [{ id: 'viernes', t: 'Simular: llega el viernes 23' }],
    },
    {
        id: 'EXTRA', titulo: 'Tu espacio e invitar a alguien', persona: 'ana',
        para: 'Visión futura: compartir el hogar con la pareja (Próximamente).',
        tarea: 'Te gustaría que tu pareja también viera las cuentas desde su teléfono. Averigua si se puede.',
        pasos: [
            { t: 'En Hoy, toca la letra «A» arriba a la izquierda.', clave: 'hoja:menu' },
            { t: 'Toca «Tu espacio».', clave: 'pantalla:espacio' },
            { t: 'Toca «Ver cómo sería» en «Invitar a alguien».', clave: 'pantalla:invitar' },
            { t: 'Lee lo que podrían hacer juntos; toca «Me interesa» si te gustaría.', clave: 'invitar:interes' },
        ],
        esperado: 'Queda claro que hoy una persona lleva el hogar y que invitar viene después (marcado «Próximamente»).',
        observar: '¿Lo usaría con su pareja? ¿Qué le preocuparía compartir? ¿Se entiende que todavía no existe?',
    },
];

/**
 * Prueba guiada para testers (V2-31 #12): dos sets de 7 tareas (~15 min), asignados alternadamente.
 * `tarea` va en lenguaje cotidiano y SIN decir dónde tocar. `logrado(st, P, M)` detecta sola cuando
 * se cumplió; `caso` es el estado con que empieza (o `persona`). La última tarea es de comprensión.
 */
window.SETS = {
    A: [
        { id: 'primer-dia', titulo: 'Primer día', caso: 'C01', tarea: 'Imagina que acabas de bajar esta app. Configúrala con estos datos inventados: te pagan unos $600 cada quincena en el banco, tienes $1,000 en el banco y $40 en efectivo. Lo que no sepas, sáltalo. Termina cuando veas cuánto te queda libre.', logrado: (st) => st.configurado === true },
        { id: 'pupusas', titulo: 'Anotar un gasto', caso: 'C05', tarea: 'Hoy compraste pupusas por $6 y pagaste en efectivo. Anótalo en la app.', logrado: (st) => st.registros.some((r) => r.nuevo && r.tipo === 'gasto' && r.monto === 600) },
        { id: 'colegio', titulo: 'Recordatorio del colegio', caso: 'C11', tarea: 'Pídele a la app que te recuerde pagar el colegio: son $20 el día 5 de cada mes. Si tu teclado tiene micrófono, puedes dictarlo.', logrado: (st, P, M) => st.pagos.some((p) => p.nuevo && p.activo !== false && M.normalizar(p.nombre).includes('colegio') && p.monto === 2000 && p.dia === 5 && p.frecuencia === 'mensual') },
        { id: 'quincena', titulo: 'Llegó la quincena', caso: 'C19', tarea: 'Hoy es día de pago y te cayeron $600 en el banco. Díselo a la app y decide si quieres guardar algo para tus metas.', logrado: (st, P) => !!(st.ingresos.find((i) => i.id === 'quincena') || { llegadas: {} }).llegadas['2026-10-30'] && !P.ui.stack.length },
        { id: 'laptop', titulo: 'Usar lo que juntaste', caso: 'C23', inicio: 'hoy', tarea: 'Ya juntaste el dinero para la laptop y hoy la compraste: $600 con tu tarjeta de débito. Anótalo en la app.', logrado: (st) => st.logros.some((l) => l.nombre === 'Laptop') || st.registros.some((r) => r.apartado === 'laptop') },
        { id: 'regalo', titulo: 'El regalo de mamá', caso: 'C30', tarea: 'Ya compraste el regalo de tu mamá: $20 en efectivo. Anótalo. Si después ves algo raro en tus números, arréglalo.', logrado: (st) => !st.apartados.some((a) => a.id === 'regalo') },
        { id: 'comprension', titulo: 'Qué entendiste', persona: 'ana', comprension: true, tarea: 'Mira la pantalla de Hoy sin tocar nada. Cuando quieras, toca «Responder».' },
    ],
    B: [
        { id: 'pupusas', titulo: 'Anotar un gasto', caso: 'C05', tarea: 'Hoy compraste pupusas por $6 y pagaste en efectivo. Anótalo en la app.', logrado: (st) => st.registros.some((r) => r.nuevo && r.tipo === 'gasto' && r.monto === 600) },
        { id: 'estado-cuenta', titulo: 'Estado de cuenta', caso: 'C16', tarea: 'Te llegó el estado de cuenta de tu tarjeta: dice pago de contado $245 y pago mínimo $25. Dile a la app cuánto te salió y cuánto vas a pagar.', logrado: (st) => st.tarjetas.some((t) => t.estados.at(-1).corte === '2026-10-15') },
        { id: 'laptop-credito', titulo: 'Usar lo que juntaste, con tarjeta', caso: 'C32', inicio: 'hoy', tarea: 'Ya juntaste el dinero para la laptop y hoy la compraste: $600, pero la pagaste con tu tarjeta de crédito BAC. Anótalo en la app.', logrado: (st) => st.logros.some((l) => l.nombre === 'Laptop') || st.registros.some((r) => r.apartado === 'laptop') },
        { id: 'tarjeta-prestamo', titulo: 'Tarjeta y cuotas nuevas', caso: 'C31', inicio: 'hoy', tarea: 'Sacaste una tarjeta nueva, «Crédito Cuscatlán»: corta el día 20 y se paga el 10. También compraste en «Almacén La Esquina» en cuotas de $25 cada día 28. Agrega las dos a la app.', logrado: (st) => st.tarjetas.length >= 2 && st.pagos.some((p) => p.nuevo && p.tipoDeuda) },
        { id: 'dos-semanas', titulo: 'Volver después de dos semanas', caso: 'C26', tarea: 'Volviste a la app después de dos semanas sin usarla. Ya te cayó tu quincena del 30 y pagaste lo que vencía. Ponla al día.', logrado: (st, P) => !!(st.ingresos.find((i) => i.id === 'quincena') || { llegadas: {} }).llegadas['2026-10-30'] && st.registros.some((r) => r.tipo === 'cuadre' && r.fecha === st.hoy) && !P.ui.stack.length },
        { id: 'carlos', titulo: 'Carlos sin dinero suficiente', caso: 'C33', tarea: 'Ahora eres otra persona: Carlos. Le pagan cada viernes en efectivo y el alquiler de $150 se paga el día 1. Hoy solo tiene $60. Averigua cuánto puede gastar y qué le falta.', claves: ['hoja:desglose', 'pantalla:midinero'] },
        { id: 'comprension', titulo: 'Qué entendiste', persona: 'ana', comprension: true, tarea: 'Mira la pantalla de Hoy sin tocar nada. Cuando quieras, toca «Responder».' },
    ],
};
