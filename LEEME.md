# Producto v2 · prototipo de teléfono — versión 2.3

**Qué es:** un prototipo clicable de la app completa propuesta en Producto v2. Desde la v2.2 tiene **dos modos**: **entrenamiento** (datos inventados de Ana, recorrido guiado, 13 ejercicios y la prueba A/B para testers) y **uso normal** (la familia cercana de Victor la usa 1–2 semanas con su dinero real, guardado solo en su teléfono). Es una maqueta de flujo y comprensión, no producción.

**Dónde:** repo público `victorurrutia30/pamplanea-prototipo`, publicado con GitHub Pages en <https://victorurrutia30.github.io/pamplanea-prototipo/>. La versión 1 queda como historial en `pamplanea-capturas/v2-prototipo/` (no se tocó).

**Cómo se abre:**

- **Computadora:** doble clic en `index.html` (Chrome o Edge) o el enlace de Pages. Muestra la guía con el teléfono enmarcado (390 × 844), los 13 casos y los dos sets de la prueba guiada.
- **Teléfono:** el mismo enlace. En pantalla angosta (< 768 px) `index.html` abre la app **a pantalla completa**: la primera vez pregunta «Aprender a usarla» o «Usarla con mis datos». Se puede **instalar** (PWA) y abre **sin internet** después de la primera visita.

Sin servidor propio, sin dependencias, sin CDN, sin analítica ni rastreadores. Fuentes, emoji, íconos y los íconos de la app instalable son locales, con sus licencias (`recursos/licencias`).

**Estado:** brief y acuerdos V2-01…V2-22 APROBADOS por Victor (2026-10-16); **V2-23 a V2-30** y **V2-31 (respuestas v2.1)** APROBADOS por Victor (2026-10-16); **V2-34 a V2-49** APROBADOS por Victor (2026-10-17) — V2-15 y V2-31 #7 quedan REEMPLAZADAS por V2-34. Nada de esto está documentado todavía en el repo de la app: se documentará después de las pruebas con personas. Este prototipo no cambia nada del repo de la app.

Versión visible en la app y en la guía: **«Prototipo v2.3 · 2026-10-17»**.

---

## Prototipo v2.3 (2026-10-17): el número correcto + feedback de Victor y Pam + revisión integral

**Por qué:** Victor probó con sus datos reales: $120 en efectivo; hasta el 29 solo paga el cuchubal ($25); el 29 le caen ~$597 + ~$566 de su pareja; sus pagos grandes vencen el 30. Su libre real hasta el 29 es ~$95, pero la v2.2 mostró «Libre $0 · Te faltan $209.50» y seis avisos rojos. Causa (reproducida): la reserva gradual automática (V2-31 #7) suponía que de la quincena del 14 (antes de que empezara a usar la app) ya debía haber guardado la mitad de los pagos del 30, y la configuración inicial marcaba como «llegadas» (`previa: true`) las quincenas de los 40 días anteriores, que él nunca anotó.

### Decisiones V2-34 a V2-49 (APROBADAS por Victor, 2026-10-17)

> **V2-15** (reserva gradual) y **V2-31 #7** (reserva gradual para todos los ingresos) quedan **REEMPLAZADAS por V2-34**.

**Entrega 1 — lógica del dinero**

- **V2-34 La persona decide con qué ingreso paga cada pago. NADA AUTOMÁTICO.**
  - Cada pago (cada ocurrencia, si es recurrente) tiene «Lo pagas con: <ingreso>». Por defecto: el último ingreso esperado que llega en o antes de la fecha de vencimiento (si vence el mismo día que te pagan, se paga con ese ingreso, como en V2-29 #4).
  - La persona puede cambiarlo a un ingreso anterior o REPARTIRLO en montos que ella elige entre varios ingresos («$100 de esta quincena y $100 de la del 29»). Lo asignado a un ingreso ya recibido queda «reservado» hasta la fecha de vencimiento.
  - Libre de hoy = Tienes − Ahorros − pagos asignados al periodo actual (los que se pagan con el dinero que ya tienes) − lo que la persona eligió reservar. Nada más.
  - Sugerir, nunca hacer: si el ingreso asignado no alcanza para lo que se paga con él, UNA sugerencia: «El viernes 30 te caen ~$90 y el alquiler es $150: te faltarían $60. ¿Reservas algo de este viernes? [Sí, $__] [No, después veo]». Para pago semanal + alquiler mensual (Carlos), esta sugerencia reemplaza la reserva automática.
- **V2-35 «¿Cómo quedo la próxima quincena?»**
  - Debajo del número de Hoy: «Próxima quincena (29): entra ~$X · pagos ~$Y · te quedarían ~$Z». Los ingresos secundarios entran como estimados («incluye ~$566 de tu pareja»). Al tocarlo, lleva a Pagos → Próxima.
  - En Reparte y desde el número: «¿Pasas algo de lo que te sobra a la próxima?»: reserva lo que la persona elige del libre actual para el periodo siguiente.
  - Si a la próxima le faltaría dinero: un solo aviso suave: «La próxima quincena te faltarían $X. ¿Guardas algo de esta?».
- **V2-36 Frecuencias para pagos e ingresos:** una vez (con fecha), semanal (día), cada 2 semanas, quincenal (dos días o «el mismo día que me pagan»; incluye «15 y último día»), mensual (día o último día), cada N meses (trimestral, anual), fechas a medida. Cuchubal: cualquier frecuencia (Victor lo paga QUINCENAL), con fecha de fin opcional y fecha de tu turno (= ingreso esperado).
- **V2-37 / V2-44 Fechas específicas, pasadas o futuras:**
  - Todo formulario de pago o ingreso tiene selector de fecha (calendario accesible; si usas el nativo, que sea accesible y legible en los 4 temas).
  - En Anotar, el chip de fecha siempre se toca y abre el calendario. Fecha pasada = gasto o ingreso normal (aplica la regla del cuadre). Fecha FUTURA = «Es para el 25: lo pongo en Pagos como pago de una vez» (o «como ingreso esperado» si es ingreso). Nunca se descuenta dinero que todavía no salió.
- **V2-38 Descuentos del salario:** el ingreso esperado es lo que te cae (neto). En el formulario del ingreso, opcional: «¿Te descuentan algo del salario? (orden de descuento, préstamo por planilla)». Crea una deuda cuya cuota se marca PAGADA SOLA al confirmar ese ingreso: no baja el libre otra vez y sí baja «lo que debes». No preguntar ISSS, AFP ni renta.
- **V2-40 Ingresos recurrentes:** el calendario muestra solo las ocurrencias del periodo elegido. «Más adelante» muestra solo los ingresos extra de una vez (aguinaldo, Quincena 25, bono), no la lista infinita de cada quincena.
- **V2-42 Avisos:** en Hoy, como máximo UNO agrupado («2 pagos necesitan atención · Ver»), que abre la lista. Rojo solo si de verdad no alcanza contando los ingresos esperados; ámbar para sugerencias. Nunca «te faltan» por algo que el ingreso asignado ya cubre.
- **V2-43 Sin historia inventada:** no crear llegadas de ingresos ni pagos antes del día en que la persona empezó a usar la app. En la migración, elimina SOLO las llegadas que la app generó sola antes de esa fecha (si puedes distinguirlas); si no puedes distinguirlas, déjalas y dilo en el reporte.
- **V2-48** Un pago ya marcado como Pagado se puede abrir y corregir: monto, fecha y medio, o «Desmarcar pagado», con confirmación y Deshacer. Si la fecha queda antes del último cuadre, el aviso de siempre.
- **Detalle:** nunca mostrar «+~$597»; un estimado se escribe «~$597».

**Entrega 2 — estructura, nombres y feedback de Pam**

- **V2-39 Pagos con dos vistas:** «Calendario» (lo actual, por periodo: Esta quincena / Próxima / Mes) y «Mis pagos e ingresos» (la lista completa de lo que pagas y te pagan: nombre, monto, frecuencia, con qué se paga y con qué ingreso, editable).
- **V2-41 Nombres:** «Apartados» pasa a llamarse «Ahorros» en toda la app (mismas reglas: etiqueta sobre tu dinero, no se mueve de lugar; una línea: «Tus ahorros siguen en tu banco o efectivo; solo les pones nombre»). Se ELIMINA la sección «Guardado para pagos»: lo reservado se ve dentro de cada pago («Reservando $100 de esta quincena») y como una línea en el desglose de Hoy («Reservado para pagos $X»). El intérprete acepta «aparté», «ahorré» y «guardé».
- **V2-45 «¿Con qué pagas?»** (configuración y ajustes): se pueden agregar VARIOS de cada tipo (varias débito, varias crédito, billeteras), cada uno con su nombre y su lugar, con «+ Agregar otra».
- **V2-46** En «Tus pagos fijos» de la configuración: chips Préstamo, Casa comercial y Tarjeta con «+ Otro» para agregar varios; solo nombre, cuota y día; «¿cuánto debes?» se pide después. Saltable.
- **V2-47 Suscripciones:** tipo de pago con chips (Netflix, Spotify, Disney+, YouTube, iCloud/Google, celular, gimnasio, Otra), mensual o anual, medio por defecto la tarjeta de crédito si tiene (aplica V2-07). En la configuración (paso de pagos fijos) y en «+ Pago». En Mes: «Pagas ~$X al mes en suscripciones».
- **V2-49 Mi dinero como centro con tres puertas:** arriba un resumen corto (Tienes $X · Ahorros $Y · Debes ~$Z) + la barra «Así se reparte»; debajo tres tarjetas que abren pantallas propias: «Cuentas» (lugares y medios de pago, cuadrar, mover), «Ahorros» y «Deudas» (tarjetas, préstamos, casa comercial). Cada pantalla con su volver. La barra inferior no cambia.
- Entrenamiento (13 pasos) y 13 ejercicios actualizados con los nombres y comportamientos nuevos.

**Entrega 3 — revisión integral con criterio propio** (APROBADO por Victor, 2026-10-17: «confío en su judgement para cambios que considere pertinentes»). Ver «Revisión integral v2.3» más abajo.

### Cómo quedó la Entrega 1

| Decisión | Dónde se ve |
| --- | --- |
| V2-34 | **Ficha de cada pago → «Lo pagas con»**: «Con tu quincena del 29 $200.00» y «Cambiar o repartir» abre «¿Con qué pagas el alquiler?»: cada día de pago desde lo que tienes ahora hasta el que va por defecto (con «Ese día te caen ~$1,163 · te quedarían ~$450»), «Repartirlo» con un monto por cada uno y «Repartir parejo», y «Hacerlo así cada vez» (regla: un día de pago antes, o parejo). En la fila del pago (Hoy y Pagos), solo si la persona lo cambió: «Reservando $100 de lo que tienes ahora · $100 con tu quincena del 29». **Sugerencia** (ámbar): «El viernes 30 te caen ~$90 y ese periodo pagas ~$160 (el cuchubal y el alquiler): te faltarían ~$70. ¿Reservas algo de tu pago del viernes 23? [Sí, $70.00] [No, después veo]»; «Sí» abre «¿Cuánto reservas?» con el monto y «¿De cuál dinero?» (lo que tienes ahora o un día de pago anterior). |
| V2-35 | Hoy, debajo del número: «Próxima quincena (29) · entra ~$1,163 · pagos ~$713 · te quedarían ~$450 · incluye ~$566 de tu pareja» → Pagos → Próxima, que arriba repite los mismos números. En el desglose y en Reparte («3. ¿Cómo quedas la próxima?»): «¿Pasas algo de lo que te sobra a la próxima?». Si a la próxima le faltaría: «La próxima quincena te faltarían ~$X. ¿Guardas algo de lo que tienes ahora?». |
| V2-36 | «+ Pago» y «+ Ingreso esperado»: Una vez · Cada semana · Cada 2 semanas · Cada quincena (el mismo día que me pagan / 15 y 30 / 15 y último día / otros días) · Cada mes · Cada 3 meses · Cada año · Otras fechas. Cuchubal: sugiere quincenal, «¿Hasta cuándo aportas?» y «¿Cuándo es tu turno?» (crea el ingreso esperado «Tu turno del cuchubal»). |
| V2-37 / V2-44 | Calendario propio (cuadrícula del mes, botones de 44 px, nombre completo de cada día para el lector de pantalla, «hoy» marcado, flechas del teclado, tokens de la app en los 4 temas) en pagos, ingresos, Pagado, Corregir, catorcena del primer día y Anotar. En Anotar, el chip de fecha (📅) siempre se toca; con fecha futura: «Es para el 25 de octubre: lo pongo en Pagos como pago de una vez» y al guardar «Lo puse en Pagos para el 25 oct» (o «Ingreso esperado el 25 oct»). |
| V2-38 | «+ Ingreso esperado» (o editar uno que se repite): «¿Te descuentan algo del salario?» → qué, cuánto cada vez, ¿cuánto debes? (opcional). Ficha del ingreso: «Te descuentan del salario». Al confirmar el ingreso, la cuota queda «Descontado de tu salario» y baja lo que debes; nunca baja el libre. |
| V2-40 | «Más adelante» = solo ingresos de una vez (aguinaldo, Quincena 25, bono, turno del cuchubal). |
| V2-42 | Hoy muestra un solo aviso: el único que haya, o «2 pagos necesitan atención · Ver» / «3 avisos para hoy · Ver», que abre «Necesitan atención». Rojo solo si lo que tienes no cubre lo que pagas con eso y ningún ingreso esperado antes lo cubre; si lo cubre (por ejemplo, lo de tu pareja ese mismo día), ámbar: «Te alcanza cuando te caiga ~$566 de tu pareja». |
| V2-43 | La configuración inicial ya no inventa llegadas; si hoy es día de pago pregunta «¿Ya está en lo que tienes?». El periodo actual empieza en el último día de pago cuyo dinero ya tienes; los de antes de empezar ya están en el primer cuadre. |
| V2-48 | Ficha del pago → Historial → toca un pago → «Corregir» (monto, medio, fecha con calendario) o «Desmarcar pagado» (confirmación y Deshacer). La nota del cuadre mira la fecha elegida. |
| «~$597» | `dinero()` nunca pone «+» a un estimado. |

### Cómo quedó la Entrega 2

| Decisión | Dónde se ve |
| --- | --- |
| V2-39 | Pagos arriba: **[Calendario] [Mis pagos e ingresos]**. La lista trae «Al mes, más o menos: te entra ~$X · pagas ~$Y», «Lo que te pagan» (frecuencia, dónde cae, «Principal»), «Pagos fijos», «Cuotas y préstamos», «Suscripciones» (con su total al mes), «Descuentos del salario» y «Tarjetas de crédito». Cada fila: nombre, monto, frecuencia, medio, con qué ingreso se paga («Con la quincena de antes de que venza», «…anterior», «Repartido parejo») y el próximo; toca para abrir su ficha y editar. |
| V2-41 | «Ahorros» en toda la app (Mi dinero, fichas, Reparte «2. ¿Quieres ahorrar algo?», desglose, Anotar «Ahorrar», recorrido, ejercicios, «Contarle a Victor»). «Liberar» → «Sacar». «Sin apartar» → «Fuera de ahorros». La línea «Tus ahorros siguen en tu banco o efectivo; solo les pones nombre». Ya no existe «Guardando para pagos»: lo reservado está dentro de cada pago y en «Reservado para pagos» del desglose. «aparté», «ahorré» y «guardé» → Ahorrar. |
| V2-45 | Primer día, paso 2: «+ Agregar otro banco» y «+ Agregar billetera» (nombre y cuánto tiene). Paso 3: una tarjeta de débito por banco, la billetera, «Transferencias» (una por banco) y «+ Agregar otra tarjeta de crédito» (banco, corte, pago). Después: Mi dinero → Cuentas → «Agregar lugar» y «Agregar otra tarjeta o medio». |
| V2-46 | Paso 4: «Cuotas y deudas» con Préstamo, Casa comercial y Tarjeta; cada uno con nombre, cuota y día, y «Otro préstamo» / «Otra casa comercial» / «Otra tarjeta» para agregar más. «¿Cuánto debes?» se pide después, en Deudas. Saltable. |
| V2-47 | «+ Pago» → «Suscripción» (Netflix, Spotify, Disney+, YouTube, iCloud o Google, Plan del celular, Gimnasio, Otra), solo «Cada mes» o «Cada año», medio por defecto la tarjeta de crédito si hay. También en el paso 4 del primer día. Mes: «Pagas ~$X al mes en suscripciones» (lleva a la lista). |
| V2-49 | Mi dinero: «Tienes $X · Ahorros $Y · Debes ~$Z» (si hay cuotas sin «cuánto debes», dice «Cuotas $X al mes», nunca «Debes $0.00»), «Así se reparte» y tres puertas: **Cuentas** (Cuadrar, Mover, lugares con su ficha, «Con qué pagas»), **Ahorros** (ahorrar, cada ahorro, Logros y Cerrados) y **Deudas** (tarjetas, préstamos, casa comercial, descuentos del salario; «+ Tarjeta o préstamo»). Cada pantalla con «‹ Mi dinero». La barra inferior no cambió. |
| Entrenamiento | 13 pasos: el número, «¿De dónde sale?», **tu próxima quincena**, lo que viene, **Pagos: calendario y lista**, Anotar, escribe como hablas, **Mi dinero con tres puertas**, **Ahorros**, Mes, tu letra y fin. Los 13 ejercicios con números nuevos (Ana $270.60; Carlos $125.00 con la sugerencia; C16 y C30 con el aviso agrupado; C23, C31 y C32 por las puertas de Mi dinero). |

### Revisión integral v2.3 (Entrega 3, con criterio propio, APROBADO por Victor 2026-10-17)

Cómo se revisó: el dinero de Victor seguido por la interfaz del 17 de octubre al 2 de noviembre (anota, paga a tiempo, a la pareja le pagan antes, llega la quincena, paga el 30, corrige un pago, cuadra con diferencia, revisa Mes) comprobando cada día que Hoy, el desglose, Pagos y Mi dinero digan lo mismo y que la repartición sume lo que tiene (`herramientas/viaje-v23.mjs`); los tres perfiles (Ana quincena con tarjeta y deuda; Carlos semanal solo efectivo; Rosa variable + remesa) en las pruebas de siempre; casos borde en el motor (cambio de año, febrero, ingreso que no llega, ingreso adelantado, cambio de ingreso principal); 44 capturas por tema (Serena claro y Ancla oscuro) y contraste medido en los 4 temas (mínimo 4.94:1).

**CAMBIO A DECISIÓN APROBADA — REVISAR**

1. **V2-16 («el otro ingreso suma cuando llega») — si llega ANTES de su día de pago, es de esa quincena.** Encontré: a la pareja de Victor le pagan el 28 lo del 29; la v2.3 sumaba esos $566 al libre de hoy («Libre $661 hasta el 29»), aunque son para los pagos del 30: un número que «miente». Cambié: lo que llega antes de su quincena queda para esa quincena (el libre de hoy no sube y la próxima dice «incluye $566.00 de tu pareja, que ya llegó»), con «Usarla desde ya» en Reparte y en el desglose por si la persona lo quiere ahora. Lo que llega en su fecha sigue sumando como siempre.

**decisión técnica — REVISAR**

*Motor*
- **Quincena adelantada:** encontré que si la quincena del 30 llegaba el 28, el horizonte se quedaba en el 30 y el libre se podía gastar antes de tiempo. Ahora, si el próximo día de pago ya llegó, ese periodo empieza y el horizonte pasa al siguiente («Hasta tu quincena del 14»).
- **Cambiar el ingreso principal no pierde nada:** lo elegido en «Lo pagas con» o en «Pasar a la próxima» con un día de pago que ya no existe se lleva al día de pago nuevo más cercano (nunca uno posterior al vencimiento). Antes quedaba restando del libre para siempre.
- **«Debes» nunca $0.00 de mentira:** si hay cuotas sin «cuánto debes», Mi dinero y Deudas dicen «Cuotas $285.00 al mes».

*Viaje del dinero*
- **Borrar un ingreso ya confirmado** también deshace su descuento del salario (y lo que debes vuelve a subir).
- **Pagos → Esta quincena** usa exactamente los mismos montos que el desglose (lo de la tarjeta cubierto por un ahorro va en «reservado»).
- **Proyección:** distingue «~$566 de tu pareja» (estimado), «$566.00 de tu pareja, que ya llegó» y «$X que pasaste de antes».
- **Totales agrupados con estimados** llevan «~» («Mañana vencen 7 pagos · ~$688»).

*Módulos*
- **(+) desde la ficha de un ahorro** respeta el contexto: «ahorrar» o «sacar» van a ese ahorro y un gasto pregunta si sale de él.
- **«Volver» dice a dónde vuelve** (Cuentas, Ahorros, Deudas, Pagos…). El menú «Cuentas y medios de pago» abre la misma pantalla Cuentas (una sola).

*UX/UI*
- «Lo pagas con» con su margen; «¿Con qué pagas…?» con un texto corto («Si lo pagas con lo que ya tienes, queda reservado desde hoy»).
- Solo el primer día de pago que viene se llama «Próximo»; los demás por su fecha («Tu pago del viernes 30»). «¿Cuánto reservas?»: «Con tu pago del viernes 30 te faltarían ~$70 para el cuchubal y el alquiler».
- «¿Ya la pagaste?» concuerda con el pago (la luz, el alquiler).
- «Ahorrar» a lo ancho en Ahorros; calendario con números centrados y la etiqueta arriba de los atajos.
- Sugerencia sin ingreso fijo (ingreso variable): habla de fechas («Del 1 al 30 nov pagas ~$X…»), no de «te caen».

**Calidad (v2.3)**

- **Prueba de aceptación** (`aceptacion-v23.mjs`, por file:// y servida): Victor el sábado 17 de octubre → «Hasta tu quincena del 29 · en 12 días · Libre $95.00 · ~$7.90 por día», sin avisos rojos, «Próxima quincena (29): entra ~$1,163 · pagos ~$713 · te quedarían ~$450 · incluye ~$566 de tu pareja» (Pagos → Próxima repite los mismos números), sin llegadas antes del 17, «Más adelante» solo con el aguinaldo; migración de datos tipo v1 sin perder nada (respaldo idéntico; solo se quitan las 3 llegadas inventadas); Carlos con sugerencia ámbar y reserva solo si la elige ($125 → $55); el alquiler repartido $100 + $100; corregir y desmarcar un pago pagado; «zapatos 40» para el 25 va a Pagos sin tocar lo que tienes.
- **Viaje del dinero** (`viaje-v23.mjs`): del 17 de octubre al 2 de noviembre, Hoy = desglose = Pagos = Mi dinero cada día y la repartición suma lo que tiene.
- **De siempre:** los 13 casos en Serena claro y Ancla oscuro, la prueba guiada A/B, los modos (tres personas de dos semanas, copia → borrar → restaurar, privacidad de «Contarle a Victor»), la app instalable (sin internet y actualizar sin perder datos: esquema 2) y el motor. Contraste de lo nuevo en los 4 temas: mínimo 4.94:1.
- **Autocrítica:** ronda 1 servida y ronda 2 por file://, en Serena claro, Ancla oscuro y Serena oscuro, mirando las capturas (corregí: «Con tu próximo pago te faltarían…», «El próximo mes (noviembre)», «Bueno saber» en el primer número y la fila «= Libre» que quedaba cortada en el detalle del número).

**Lo que no alcancé (por prioridad)**

1. Un pago vencido aparece en el aviso de Hoy y en «Próximos pagos» (con «Pagado» en los dos). ¿Se quita del aviso cuando ya se ve abajo?
2. «Lo pagas con» con un ingreso de una vez (aguinaldo) → PREGUNTA #17.
3. Pagos → «Mes» todavía no trae un resumen del mes (entra / pagas) como «Esta quincena» y «Próxima».
4. Probar con lector de pantalla y en teléfonos reales (Android e iPhone); las pruebas son con Chrome y Edge emulando 390 × 844.
5. Desktop (V2-28).

### Decisiones técnicas v2.3 (cómo interpreté lo aprobado)

- **«Ingreso» en «Lo pagas con» = un día de pago del ingreso principal** («tu quincena del 29», «tu pago del viernes 30»). Lo que cae de otros ingresos que se repiten (la pareja, la remesa) en ese periodo se suma como estimado a ese día de pago. Así Victor no ve «te faltan» por sus pagos del 30: el 29 le caen ~$1,163. Sin ingreso principal, se elige entre «lo que tienes ahora» y «lo que tengas cuando venza».
- **Lo que vence en el periodo actual siempre sale de lo que ya tienes**; solo se puede adelantar (pagar con un ingreso anterior) o repartir, nunca atrasar a un ingreso posterior al vencimiento.
- **La tarjeta de crédito no tiene «Lo pagas con»**: sigue V2-07 / V2-13 / V2-29 #1 (sale de lo que ya tienes, porque la compra ya se hizo).
- **Los ingresos de una vez (aguinaldo, bono) no cuentan por adelantado** en la proyección ni como «Lo pagas con» (PREGUNTA PARA VICTOR #17).
- **Rojo / ámbar:** rojo si lo que tienes no cubre lo que pagas con eso y ningún ingreso esperado antes del próximo día de pago lo cubre; ámbar si sí (por ejemplo, la pareja ese mismo día) y para sugerencias.
- **La sugerencia mira el próximo mes** (días de pago en los próximos 31 días) y, al aceptar, reserva en el pago más grande de ese día de pago (se ve dentro del pago). «No, después veo» la calla hasta que falte más.
- **La proyección revisa el saldo día por día:** si un pago vence antes de que llegue otro ingreso del mismo periodo, también cuenta como faltante (se dice «Ojo: el 30 te faltarían…» en Pagos → Próxima).
- **«~$ por día» por debajo de $10 baja de 10 en 10 centavos** («~$7.90», no «~$7.91»), como pide la prueba de aceptación; desde $10, dólares enteros (V2-29 #12).
- **«No me va a caer»** (en «¿Cuánto te cayó?» y en Pongámonos al día): el periodo sigue con $0 de ese ingreso; «Todavía no» lo deja pendiente.
- **Pongámonos al día y Reparte** también confirman los otros ingresos que ya debían llegar (la pareja): «¿También te cayó…?».
- **Migración esquema 1 → 2:** antes de migrar se guarda una copia intacta en `pamplanea-uso:respaldo-esquema-1`. El día de inicio es el del primer cuadre (el de la configuración). Se quitan SOLO las llegadas marcadas `previa` (las que inventaba la v2.2) anteriores a ese día; la del mismo día queda como «ya estaba en tu primer cuadre». Los ingresos que se repiten empiezan ese día. Nada más cambia: lugares, medios, pagos, ahorros, movimientos, cuadres, respuestas y métricas quedan iguales (probado). Una copia `.json` de esquema 1 se restaura migrada.

---

## Modos v2.2 (pedido por Victor, 2026-10-16)

**Para quién:** familia cercana de Victor, con su dinero real, 1–2 semanas, en su propio teléfono.

**Excepción de privacidad (autorizada):** el doc 06 de la app pide no guardar nada financiero en el navegador. **Este prototipo es una excepción deliberada y autorizada por Victor** para la prueba familiar: el modo uso guarda montos y nombres en `localStorage` del teléfono. Nunca salen de ahí solos: no hay servidor, analítica ni terceros, y no hay nada financiero en la URL. Lo único que sale es lo que la persona decide mandar (una copia `.json` o el texto de «Contarle a Victor», que no lleva montos ni nombres).

### Entrada
- Primera vez: bienvenida cálida con **«Aprender a usarla»** (recomendado) y **«Usarla con mis datos»**. Ya no se piden perfil ni set al entrar.
- Se cambia de modo cuando se quiera desde la letra (menú). **Cada modo tiene sus propios datos.** Al abrir siempre se empieza en Hoy (y al volver a la app en un día nuevo).
- Los enlaces de tester `?set=A` / `?set=B` siguen llevando directo a la prueba guiada (modo entrenamiento).
- Franja fija: uso «Versión de prueba · tus datos solo están en este teléfono»; entrenamiento «Modo entrenamiento · datos de ejemplo».

### Modo entrenamiento
- **«Te enseño la app en 3 minutos»:** 13 pasos sobre los datos de Ana (Hoy y su número, «¿De dónde sale?», Pagos y su calendario, Anotar con texto y dictado, Mi dinero: lugares, apartados, tarjetas y deudas, Mes, la letra). Resalta la zona; Siguiente / Atrás / Saltar; teclado (flechas, Esc, foco atrapado), lector de pantalla (diálogo con título y paso) y movimiento reducido. Si la tarjeta no cabe arriba o abajo de lo resaltado, va al pie.
- Al final: **[Practicar con ejemplos]** **[Empezar con mis datos]** (y «Seguir mirando los ejemplos»).
- **Practicar:** los 13 casos como ejercicios opcionales, con instrucción simple, «¡Lo lograste!» cuando la app detecta el último paso y «¿Cómo?» con los pasos (y las simulaciones de fecha que el caso necesite). Sin reloj.
- La prueba A/B y el Modo moderador quedan dentro de «Casos y ayuda» → «Para Victor: prueba guiada (sets A y B)».
- **«Reiniciar ejemplos»** reinicia solo el entrenamiento.

### Modo uso normal
- Pantalla previa honesta («Tus datos se guardan solo en este teléfono. Nadie más los ve», «Es una versión de prueba: si algo no cuadra, avísale a Victor», «Instálala en tu pantalla de inicio para no perder tus datos» con los pasos; en iPhone: instalar antes de empezar y la nota de Safari) + **[Empezar]**.
- **Fecha y zona horaria reales del teléfono.** No hay fecha simulada ni botones «Simular». (Las pruebas automáticas adelantan la fecha con `window.__fechaPrueba`, que la app publicada nunca pone.)
- Empieza vacío → primer día: cómo te pagan (quincena con días: «15 y 30», «15 y último día» u otros; mes; semana con día; catorcena con próxima fecha; variable con horizonte; remesa con día; si hay dos o más fijos, cuál es el principal; extras aguinaldo y Quincena 25), cuánto tienes y dónde (obligatorio), con qué pagas y pagos fijos.
- **Crear, editar y eliminar** (con confirmación y «Deshacer»): ingresos esperados («Ya no lo espero»), pagos, tarjetas y préstamos, lugares, medios de pago, apartados y movimientos. Mi dinero → «Lugares y medios de pago» es la pantalla para lugares y medios.
- Cuadres, Reparte y Pongámonos al día con fechas reales; Mes con meses y año reales; reserva gradual con fechas reales. **Días 29–31:** en meses más cortos el pago cae el último día y la app lo dice («· último día del mes»).
- Montos en centavos enteros, USD con 2 decimales; se rechazan montos no positivos, de más de $1,000,000.00 o con basura.
- El intérprete reconoce los nombres propios de la persona (sus lugares, medios y pagos: «gasolina 20 con BAC», «pasé 50 de Agrícola a efectivo»).
- **Avisos al abrir la app** («Hoy vence la luz», «Mañana: Colegio», «Luz: venció el … ¿Ya lo pagaste?»), con una nota la primera vez: «En la app final te llegará una notificación».

### Datos seguros
- Claves: `pamplanea-modo` (modo elegido y nota de avisos), `pamplanea-uso:v1` (datos reales; desde la v2.3 `esquema: 2`, con migración desde el 1 y copia intacta en `pamplanea-uso:respaldo-esquema-1`: una actualización nunca borra) y `pamplanea-entrenamiento` (recorrido y ejercicios hechos). El entrenamiento sigue en `pamplanea-proto-v2:*`. Todo con `try/catch`.
- **Guardar copia** descarga `pamplanea-copia-AAAA-MM-DD.json` (`{app, tipo: "copia-uso", esquema, version, fecha, datos}`); **Compartir copia** usa el menú del teléfono cuando existe. **Restaurar** valida el archivo y muestra qué trae antes de reemplazar. **Borrar todos mis datos**: doble confirmación (solo modo uso).
- **Actualizar** (versión nueva del service worker) conserva los datos reales: probado.

### Contarle a Victor
- Cada 3 días de uso, Hoy muestra «¿Cómo te ha ido?» (1–5 · ¿Qué te confundió? · ¿Qué te gustaría que hiciera?), que se puede dejar para después.
- Registro local **sin montos ni nombres**: días que abrió, anotaciones, cuadres, Pagado, Reparte, Pongámonos al día, pantallas usadas (por tipo), veces que el intérprete no entendió (sin el texto), si está instalada y si hizo el entrenamiento.
- Letra → «Contarle a Victor cómo me va»: texto con nombre o apodo, fechas, respuestas y métricas. Lo que la persona escribe se muestra completo; en el texto que se manda, los montos se cambian por «[monto]» y los nombres de sus cuentas, pagos, apartados, ingresos, tarjetas y préstamos (incluso los que ya borró o renombró) por «[nombre]». Compartir + Copiar + texto seleccionable. Una prueba automática revisa que no se cuele ningún monto ni nombre.

### Revisión v2.2
- Dos rondas: recorrido completo como novata (13 pasos, ejercicio con «¡Lo lograste!»), y tres personas simuladas desde cero con más de dos semanas cada una: **(a) Marta** quincena «15 y último día», efectivo + banco, tarjeta; **(b) Beto** pago semanal, solo efectivo, alquiler mensual; **(c) Rosa** ingreso variable + remesa. Anotar, Pagado, quincena con Reparte y cuadre, cambio de mes, editar y eliminar.
- Copia → borrar → restaurar; actualización con datos guardados; separación de modos; `file://` y servido en la subruta de Pages; Chrome y Edge; 390 × 844 en Serena claro y Ancla oscuro.

---

## V2-31 Respuestas v2.1 (APROBADO por Victor, 2026-10-16)

1. Si hay dos pagos próximos de la misma tarjeta, el mensaje dice el mes: «pago del 5 de diciembre».
2. «Pagar la tarjeta ya» NO salda todo en automático: pregunta «¿Cuánto pagas? [Solo la laptop $600] [Todo lo que debes $X] [Otro]».
3. Apartado cerrado después de su fecha: es Logro solo si se usó para su propósito («Sí, ya lo gasté»). Si se libera sin usarlo, queda «Cerrado», no Logro.
4. «No lo anoté»: la fecha se muestra como sugerencia editable (chip con la fecha de la meta).
5. Correcto: [Pagado] sin preguntar solo a tiempo; los vencidos preguntan la fecha.
6. El libre nunca se muestra negativo, pero cuando está en $0 SIEMPRE aparece el faltante exacto: «Te faltan $X para cubrir lo que viene» (tocable, lleva al detalle).
7. ~~Reserva gradual para TODOS los tipos de ingreso~~ — **REEMPLAZADA por V2-34 (2026-10-17)**: cada pago se reparte entre los días de pago que caen antes de su vencimiento (ej. alquiler del 1 con quincenas 15 y 30 = mitad y mitad). Mostrarlo en el desglose de Hoy, en Mi dinero («Guardando para pagos») y en la ficha del pago. Revisar que los resultados esperados de todos los casos sigan cuadrando y actualizarlos.
8. El formulario de tarjeta pregunta OPCIONAL «¿Tienes tu último estado de cuenta? Total / Mínimo». Si no lo pone, se le pide en el siguiente corte.
9. Préstamo sin saldo: en Mi dinero dice «Cuota $35 al mes» (en positivo), no «sin saldo».
10. Si coinciden el día de pago y los 10 días sin anotar: UNA sola tarjeta (el ritual de la quincena incluye el cuadre).
11. Sí: el horizonte se queda hasta confirmar la quincena («Libre por ahora»).
12. La prueba guiada se divide en dos sets.

### Cómo quedó cada respuesta

| # | Dónde se ve |
| --- | --- |
| 1 | Logro con crédito, Logros, «Guardando para pagos», ficha y desglose: «pago del 5 de diciembre» cuando la tarjeta también tiene el del 5 de noviembre. Hoy: «Incluye tarjeta $245.00, vence el 5 de noviembre». Con un solo pago, solo el día. |
| 2 | «Pagar la tarjeta ya» abre «¿Cuánto pagas?»: «Solo la laptop · $600.00» (paga esa compra; el pago del 5 de noviembre sigue igual), «Todo lo que debes · $890.00», «Otro monto». |
| 3 | «¿Ya lo usaste?» → «Sí, ya lo gasté» (eligiendo el gasto o «No lo anoté») pasa a **Logros**; «No lo usé» o liberar todo un apartado vencido lo deja en **Cerrados** («Cerrado sin usar… volvieron a Sin apartar»). |
| 4 | «No lo anoté» → «¿Cuándo? (te sugerimos el 10 oct, la fecha de tu meta; cámbiala si fue otro día)» con chips Hoy / Ayer / Antier / El 10 oct. |
| 5 | Sin cambios (ya era así). |
| 6 | Con libre $0: «Te faltan $30.00 para cubrir lo que viene» en el número (que abre el detalle), en el detalle y en «Así se reparte»; si justo alcanza, «Justo te alcanza: no te queda libre». |
| 7 | Reserva gradual para quincena, semana y cualquier ingreso con más de un día de pago por ciclo. Ana guarda hoy **$27.50** (colegio $10 de $20 y luz $17.50 de $35, mitad con cada quincena): libre **$243.10**. Se ve en Hoy («Ya separa $27.50 para el colegio y la luz»), en el detalle, en Mi dinero y en la ficha del pago. |
| 8 | «+ Tarjeta o préstamo» → Tarjeta: «¿Tienes tu último estado de cuenta? (opcional) Total / Mínimo». Sin él, aparece en Pagos «según tu estado de cuenta» y Hoy lo pide después del siguiente corte. |
| 9 | Tarjetas y deudas: «Cuota $25.00 al mes, el 28» y a la derecha «$25.00 al mes». |
| 10 | El día de pago, solo «Libre por ahora» + «¿Ya te cayó?»; «Pongámonos al día» no aparece. Reparte trae «3. ¿Cuadramos?». |
| 11 | Día de pago pasado sin confirmar: «Tu quincena del 30 · falta confirmarla», «Libre por ahora». Lo vencido sigue contando; Pagos sigue al calendario. |
| 12 | Sets A y B (abajo). |

## Prueba guiada para testers (v2.1)

**Objetivo:** dar el enlace a 5–8 personas, observarlas sin ayudar y recoger datos comparables.

1. **Bienvenida (primera vez en el teléfono):** qué es («Una prueba de una app para organizar tu dinero. Los datos son inventados. No pongas tus datos reales»), cómo funciona (tareas cortas, piensa en voz alta, «si algo no se entiende, es culpa de la app, no tuya», ~15 min), nombre o apodo (opcional) y 4 preguntas de perfil con chips: ¿Cómo te pagan? · ¿Dónde tienes tu dinero? · ¿Usas tarjeta de crédito? · ¿Hoy llevas tus cuentas? Botón «Empezar» (y «Solo quiero mirar la app (sin prueba)»).
2. **Instalar (saltable):** «Tenla en tu pantalla de inicio» con el botón «Instalar» real en Android/Chrome, los pasos con dibujos en iPhone/Safari o «ábrelo en Safari» en otro navegador de iPhone; «Ya la instalé / No pude / Ahora no». Si ya está instalada, no aparece.
3. **Dos sets de 7 tareas (~15 min):**
   - **Set A:** Primer día (C01 corto) · Anotar un gasto (C05) · Recordatorio del colegio (C11) · Llegó la quincena (C19) · Usar lo que juntaste (C23) · El regalo de mamá (C30) · Qué entendiste.
   - **Set B:** Anotar un gasto (C05) · Estado de cuenta (C16) · Usar lo que juntaste, con tarjeta (C32) · Tarjeta y cuotas nuevas (C31) · Volver después de dos semanas (C26) · Carlos sin dinero suficiente (C33, «Ahora eres otra persona: Carlos…») · Qué entendiste.
   - «Anotar un gasto» está en los dos sets para comparar.
   - Cada tarea: instrucción en lenguaje cotidiano sin decir dónde tocar, «Empezar», y arriba una barra con «Listo» y «No pude». La app detecta sola cuando se cumplió («¡Lo lograste! · Seguir»). Después: «¿Qué tan fácil fue? 1–5» y «¿Qué te confundió?» (una línea, opcional).
   - **Registro automático por tarea (solo en el navegador):** tiempo, número de toques dentro de la app, si la app lo detectó, si dijo «Listo» sin que se detectara, si se rindió, y las pantallas visitadas.
   - **Comprensión final:** «Mira la pantalla de Hoy sin tocar nada» y, con Hoy visible arriba, «¿Qué significa el número grande de Hoy?», «¿Para qué crees que sirve esta app?» y «¿La usarías? ¿Qué te haría dejarla?».
4. **Asignación del set:** `?set=A` o `?set=B` en el enlace manda; si no, el moderador lo elige; si no, se alterna en ese teléfono (1.ª persona A, 2.ª B…). Entre teléfonos distintos no hay forma de alternar sin servidor: manda enlaces alternados.
5. **Resultado:** «¡Gracias!» con un resumen en texto (nombre, fecha, set, perfil, instalada sí/no/no lo intentó, por tarea: resultado, tiempo, toques, 1–5, comentario, pantallas; respuestas finales y notas) con «Compartir» (WhatsApp), «Copiar» y el texto seleccionable.
6. **Modo moderador:** «Casos y ayuda» → enlace discreto «Modo moderador» al pie: persona actual, cambiar de set (reinicia el set conservando nombre y perfil), el resumen, y «Nueva persona», que primero pregunta «¿Ya enviaste el resumen de …?» y luego borra estado, respuestas y notas y abre la bienvenida para la siguiente.
7. Fuera de la prueba se conserva todo lo anterior: 13 casos, guía de escritorio, notas, reinicio y temas. Elegir un caso pausa la prueba; «Seguir con la prueba» la retoma.

## App instalable (PWA)

- `manifest.webmanifest`: «PamPlanea (prototipo)» / «PamPlanea», `start_url` y `scope` «./» (funciona en la subruta `/pamplanea-prototipo/`), `display: standalone`, colores de Serena, íconos 192 y 512, uno maskable y `apple-touch-icon` 180, generados localmente desde el ícono (`herramientas/generar-iconos.mjs`).
- `sw.js`: caché **versionada** (hoy `pamplanea-proto-v2.3-2026-10-17`) que precarga los 140 archivos publicados; abre sin internet. Una versión nueva se instala en segundo plano y la app muestra «Hay una versión nueva · Actualizar»; al tocarlo guarda y recarga **sin perder datos** (lo guardado tiene su propio formato, independiente de la versión visible). La primera instalación no recarga la página.
- El service worker y el manifest solo se usan servidos por http(s); por `file://` no se registran y todo funciona igual, sin errores de consola.
- **Para publicar una versión nueva:** cambiar `VERSION_PROTOTIPO` en `casos.js` y correr `node herramientas/generar-sw.mjs v2.2-AAAA-MM-DD` (regenera la lista y el nombre de la caché). Si `sw.js` no cambia, los teléfonos instalados no se enteran.
- En modo instalado: safe areas reales, sin barra de estado simulada; la barra de estado de Android toma el color del aviso de prototipo en cada tema.

---

## Acuerdos V2-23 a V2-30 (APROBADOS por Victor, 2026-10-16)

- **V2-23 APARTADO OLVIDADO: tres redes suaves.**
  (a) Al anotar, si el texto coincide con el nombre de un apartado («regalo»), el chip pregunta «¿Lo tomas de tu apartado Regalo?».
  (b) En Mes, al corregir un gasto: opción «Tomarlo de un apartado» (arregla hacia atrás).
  (c) Apartado con fecha de meta vencida: «Tu apartado Regalo era para el 10. ¿Ya lo usaste?» → [Sí, ya lo gasté] lo cierra sin crear otro gasto (eligiendo el gasto ya anotado si existe).
- **V2-24 TARJETAS Y PRÉSTAMOS:** en Mi dinero → Tarjetas y deudas → «+ Tarjeta o préstamo». Tipos: tarjeta de crédito, casa comercial, préstamo personal, crédito de vivienda. Tarjeta: nombre, día de corte, día de pago, cupo opcional. Préstamo/casa comercial: nombre, cuota, día, «¿cuánto debes?» opcional. Al guardar, su pago aparece solo en Pagos. En Pagos, «+ Pago → Cuota de un préstamo» abre el MISMO formulario. Un objeto = una ficha.
- **V2-25 CUPO:** el disponible de la tarjeta NUNCA suma al libre. Se muestra en la ficha («Te quedan $750 de cupo»). Si el libre está en $0 y se anota una compra con crédito: aviso amable «Esto se paga el 5 y hoy no te alcanzaría», sin culpa.
- **V2-26 GUARDANDO PARA PAGOS (reserva gradual automática):** además de Hoy y la ficha del pago, Mi dinero muestra debajo de Apartados la sección «Guardando para pagos (automático)», por ejemplo «Alquiler $90 de $150». Mi dinero debe explicar toda la repartición («Tienes $125 = para el alquiler $90 + libre $35»). Se vacía sola al marcar el pago como Pagado.
- **V2-27 USAR UN APARTADO CON CRÉDITO:** la persona solo elige con qué pagó. Si es crédito: la deuda de la tarjeta sube; el dinero del apartado queda RESERVADO para el pago de la tarjeta; el libre no cambia; la meta queda cumplida. Mensaje: «✓ ¡Meta cumplida! Pagaste con tu tarjeta, así que tus $600 quedan guardados para el pago del 5. [Entendido] [Pagar la tarjeta ya]». «Pagar la tarjeta ya» = mover del banco a la tarjeta en ese momento y la reserva desaparece. La ficha del apartado/logro dice «Usado con Crédito BAC · $600 reservados para tu pago del 5».
- **V2-28 DESKTOP (solo anotar, no implementar):** en desktop la app es para organizar y analizar; se prototipa después de las pruebas con personas.
- **V2-29 RESPUESTAS A LAS 12 PREGUNTAS** de la sesión anterior (reemplazan las opciones provisionales de la v1):
  1. El pago de la tarjeta que vence después del próximo ingreso SÍ baja el libre hoy; mostrar «incluye tarjeta $245, vence el 5».
  2. Pagado con fecha anterior al último cuadre: el libre sube; mostrar «Como cuadraste el 15, este pago ya estaba en tu saldo: tu libre sube $35».
  3. Día de pago sin confirmar: NO suponer que llegó; «Libre por ahora» + botón «¿Ya te cayó?».
  4. Pago el mismo día del ingreso: cuenta en el periodo siguiente; en Pagos se marca «mismo día de tu quincena».
  5. Reserva que no alcanza: libre en $0, nunca negativo, con aviso «Te faltan $30 para ir al día con el alquiler». La cuota de reserva se recalcula con los días de pago que quedan antes del vencimiento (meses de 4 o 5 viernes).
  6. «Pongámonos al día»: a los 10 días sin anotar ni cuadrar, o si pasó un día de pago sin confirmar.
  7. Sugerencia de apartar: si hay meta con fecha, lo que falta ÷ pagos que quedan; si no, 10 % a Emergencias; siempre editable y nunca más que el libre.
  8. [Pagado] con monto fijo se guarda sin preguntar; el aviso dice «Pagado con Débito Agrícola · Cambiar · Deshacer».
  9. Pago mínimo de tarjeta: así basta para v1; los intereses aparecen en la diferencia del siguiente estado de cuenta; agregar un consejo sin culpa.
  10. «Me pagaron 600» cerca de un ingreso esperado: preguntar con chips «¿Es tu quincena del 30 adelantada o un ingreso extra?».
  11. «Aparté 20 luz» cuando existe el pago «Luz»: «La luz ya está en tus pagos y se descuenta sola. ¿La apartas igual?»; si no existe ese pago, crear el apartado.
  12. «~$ por día» redondeado hacia abajo: dólares enteros desde $10; con centavos por debajo («~$3.50 por día»).
- **V2-30 PUBLICACIÓN:** repo público aparte con GitHub Pages, para probar en el teléfono de cada persona.

### Cómo quedó cada acuerdo en el prototipo

> Tal como quedó en la v2. Con V2-31 cambian algunos textos y números (por ejemplo «pago del 5 de diciembre», «¿Cuánto pagas?» y el libre de Ana, ahora 43.10): ver V2-31 y §3.

| Acuerdo | Dónde se ve |
| --- | --- |
| V2-23 a | (+) Anotar: «regalo mamá 20» → «¿Lo tomas de tu apartado Regalo? (tiene $20.00) [Sí, de Regalo] [No]». Con tarjeta, el aviso dice que queda guardado para pagarla. |
| V2-23 b | Mes → tocar un gasto → «Tomarlo de un apartado» → elegir apartado → «Sale de tu apartado Regalo: tu libre sube $20.00. El apartado se cierra.» |
| V2-23 c | Hoy (tarjeta) y la ficha del apartado: «Tu apartado Regalo era para el 10. ¿Ya lo usaste?» → «¿Cuál de estos gastos fue?» con el gasto parecido ya elegido y «No lo anoté» (lo anota ahora). |
| V2-24 | Mi dinero → Tarjetas y deudas → «+ Tarjeta o préstamo» (cuatro tipos). Pagos → «+ Pago» → «Cuota de un préstamo» (y los frecuentes «Cuota de casa comercial» y «Préstamo») abren el mismo formulario. «Editar» de una cuota abre ese mismo formulario. |
| V2-25 | Ficha de la tarjeta y su fila en Mi dinero: «Te quedan $X de cupo · El cupo no suma a tu libre». Desglose: «El cupo… no es tu dinero, nunca suma». Anotar con crédito sin libre: «Esto se paga el 5 y hoy no te alcanzaría». |
| V2-26 | Mi dinero: «Así se reparte» (frase + barra + leyenda) y, bajo Apartados, «Guardando para pagos (automático)». Ficha del pago: «Guardando para este pago». Hoy: «Ya separa $X para el alquiler». |
| V2-27 | Usar → «¿Con qué pagaste?» → Crédito BAC → pantalla «¡Meta cumplida!» con [Entendido] [Pagar la tarjeta ya]. Logros: «Usado con Crédito BAC · $600.00 reservados para tu pago del 5». La reserva se ve en «Guardando para pagos» y en la ficha de la tarjeta. |
| V2-29 #1 | Hoy: «Incluye tarjeta $245.00, vence el 5». Desglose: «estado de cuenta, vence el 5 nov» y «compras nuevas, se pagan el 5 dic». |
| V2-29 #2 | Pagado de la luz del 12 (Anotar o ficha): «Como cuadraste el 15, este pago ya estaba en tu saldo: tu libre sube $35.00». |
| V2-29 #3 | Hoy: «Libre por ahora» y el botón «¿Ya te cayó?» (o «¿Ya te cayó tu quincena del 30?» si ya pasó). |
| V2-29 #4 | Pagos y Hoy: «Efectivo · mismo día de tu pago» (cuchubal de Carlos). |
| V2-29 #5 | Libre nunca negativo; aviso «Te faltan $30.00 para ir al día con el alquiler. Quedan 2 viernes antes del 1: unos $45.00 cada uno». |
| V2-29 #6 | «Pongámonos al día» a los 10 días o con un día de pago sin confirmar. |
| V2-29 #7 | Reparte: meta con fecha → falta ÷ pagos que quedan; si no, 10 % a Emergencias; tope = libre; «Otro monto» para editar. |
| V2-29 #8 | Pagado de un pago fijo a tiempo: toast «Pagado con Transferencia · Cambiar · Deshacer». «Cambiar» abre la corrección de ese registro. |
| V2-29 #9 | Ficha de la tarjeta con deuda aparte: consejo «no calculamos los intereses; van a aparecer como diferencia en tu próximo estado de cuenta…». |
| V2-29 #10 | Anotar «me pagaron 600»: chips «Mi quincena del 30» / «Un ingreso extra» (obligatorio elegir). |
| V2-29 #11 | Anotar «aparté 20 luz»: «La luz ya está en tus pagos y se descuenta sola. ¿La apartas igual?» [Sí, apartar igual] [No, déjalo]. |
| V2-29 #12 | «~$30 por día», «~$17 por día»; debajo de $10, con centavos. |
| V2-30 | Este repo, README y la ruta de entrada para teléfonos. |

---

## 1. Cómo usarlo

### En la computadora (guía)

1. Elige un caso a la izquierda (C01 … EXTRA): el teléfono queda listo en su pantalla de inicio y el panel de la derecha muestra los pasos, el resultado esperado, qué observar y la tarea de la prueba guiada.
2. Haz los pasos dentro del teléfono. Se marcan solos; los que dicen «(márcalo tú)» los marcas tú.
3. Algunos casos traen botones de simulación en el panel («Simular: es 4 de noviembre», «Simular: llega el viernes 23»).
4. Arriba: «Explorar libre con» Ana o Carlos, el tema (Serena/Ancla × claro/oscuro), «Ajustar el teléfono a la ventana» y «Reiniciar datos».
5. Al final: «Qué observar en cada caso» y «Mis notas» (con tu nombre y las respuestas de la prueba guiada). «Armar texto» junta todo; «Copiar» si el navegador lo permite.

Todo se guarda en este navegador (también al publicarse una versión nueva): al volver sigues en el mismo caso, con el mismo tema, los mismos datos y tus notas. «Reiniciar datos» vuelve el caso al inicio.

### En el teléfono (pantalla completa)

- Arriba, fijo: **«Prototipo de prueba · no pongas tus datos reales»** y el botón **«Casos y ayuda»**.
- La primera vez se abre la **bienvenida para tester** (ver «Prueba guiada para testers»).
- **«Casos y ayuda»:** prueba guiada, el caso actual (sus pasos y simulaciones), **Mis notas** (tu nombre + notas del caso + «Armar texto para enviar», seleccionable, con «Copiar» y «Compartir» si el teléfono los permite), elegir otro caso o explorar con Ana/Carlos, apariencia, **«Reiniciar datos»** (bien visible) y «Borrar todo, también mis notas». Al pie, la versión.
- **Prueba guiada:** ver la sección «Prueba guiada para testers (v2.1)».
- Safe areas reales (muesca y barra de inicio) y teclado: la app se ajusta a la parte visible de la pantalla para que el campo de Anotar no quede tapado.
- Guardado en el navegador (`localStorage`) envuelto en try/catch: si el navegador no deja guardar, todo funciona en memoria y «Casos y ayuda» lo dice.

La fecha simulada es el **miércoles 21 de octubre de 2026** (ver §4).

## 2. Qué contiene el teléfono

- Barra de 5 posiciones: **Hoy · Pagos · (+) Anotar · Mi dinero · Mes**.
- **Hoy:** horizonte, número grande «Libre» (o «Libre por ahora» + «¿Ya te cayó?»), «~$ por día», «Incluye tarjeta $245.00, vence el 5», «Ya separa $X para el alquiler»; tocarlo abre el desglose (Tienes − Apartado − Por pagar − Guardando = Libre, con lo que falta si no alcanza y lo que todavía no cuenta, incluido el cupo). Avisos: «El 20 te faltarían…», «Faltan $X para cubrir tus apartados», «Te faltan $X para ir al día con el alquiler», «Tu apartado Regalo era para el 10. ¿Ya lo usaste?», «¿Ya te llegó tu estado de cuenta?», «Pongámonos al día». Avisos de hoy, próximos pagos con [Pagado] y separador por ingreso, últimos anotados. La letra de la persona abre el menú.
- **Pagos:** «Por confirmar», Esta quincena / Próxima / Mes, ingresos esperados intercalados, «mismo día de tu quincena/pago», «Más adelante»; + Pago (con «Cuota de un préstamo») y + Ingreso esperado. Ficha de pago con «Guardando para este pago» si aplica y «Lo que debes» para cuotas.
- **(+) Anotar:** como la v1 más: apartado por nombre, aviso de crédito sin libre, «¿adelantada o extra?», «¿La apartas igual?», «Pagado con … · Cambiar · Deshacer».
- **Mi dinero:** Tienes, **Así se reparte**, Dónde está, Apartados (con «Era para el 10 · ¿ya lo usaste?»), **Guardando para pagos (automático)**, **Tarjetas y deudas** con cupo y «+ Tarjeta o préstamo», Logros con «Usado con …».
- **Mes:** como la v1; corregir un gasto ofrece «Tomarlo de un apartado».
- **Recorridos:** Primer día, Reparte (sugerencia V2-29 #7), Pongámonos al día, estado de cuenta, logro (también con crédito y «Pagar la tarjeta ya»), «¿Cuál de estos gastos fue?», Tu espacio e Invitar a alguien (Próximamente).

## 3. Los 13 recorridos y su resultado esperado (v2.1)

| Caso | Qué hace | Resultado esperado |
| --- | --- | --- |
| C01 Primer día | Cómo te pagan → cuánto tienes y dónde → con qué pagas → pagos fijos → primer número | «Tu primer número»: libre hasta la quincena del 30, explicado; Hoy igual |
| C05 «pupusas 6» | (+) → escribir → Guardar | Libre $243.10 → $237.10; «Incluye tarjeta $245.00, vence el 5 de noviembre» y «Ya separa $27.50 para el colegio y la luz» |
| C11 Colegio dictado | «acuérdame colegio 20 el 5» → Cada mes → Simular día 4 → notificación → Pagado | «Pagado con Transferencia · Cambiar · Deshacer»; el libre no cambia |
| C16 Estado de cuenta (no anota) | Aviso → total 245 y mínimo 25 → cuánto vas a pagar | Todo: $533.10 → $288.10. Mínimo: $508.10, $220.00 como deuda y consejo sin culpa |
| C19 Llega la quincena | «Libre por ahora» → «¿Ya te cayó?» → $600 → Reparte (contado, apartar, cuadrar) → Listo | Una sola tarjeta el día de pago. Después $779.60 hasta el 15; sugiere $60.00 a Emergencias; con eso $719.60 |
| C20 Carlos | Hoy semanal → desglose → Mi dinero → Simular viernes → Reparte | $35.00 (~$17 por día); «Tienes $125.00 = para el alquiler $90.00 + libre $35.00»; después $85.00 y guardando $120.00 de $150.00 |
| C23 Usar Laptop (débito) | Mi dinero → Laptop → Usar → Débito → Usar | «¡Meta cumplida!»; libre $243.10; banco $855.60; Logros «Usado con Débito Agrícola» |
| C26 Dos semanas después | 6 de noviembre → «Libre por ahora» → Pongámonos al día | «Tu quincena del 30 · falta confirmarla», $233.10; «¡Listo, estás al día!» |
| C30 Regalo olvidado | «regalo mamá 20» diciendo «No» → arregla con (c) o (b) | $223.10 → $203.10 → $223.10 sin otro gasto; Regalo a Logros. «No lo usé» → Cerrados |
| C31 + Tarjeta o préstamo | Crédito Cuscatlán (corte 20, pago 10) + Almacén La Esquina (cuota 25 el 28) | Cuota el 28: libre $218.10; tarjeta el 10 nov «según tu estado de cuenta» (Hoy la pide después del corte del 20 nov); «$25.00 al mes» |
| C32 Laptop con Crédito BAC | Mi dinero → Laptop → Usar → Crédito BAC → «Pagar la tarjeta ya» | Libre $243.10; «pago del 5 de diciembre»; deuda $890.00 (cupo $610.00); «¿Cuánto pagas?» → Solo la laptop: banco $855.60, pago del 5 nov sigue |
| C33 Carlos con $60 | Hoy → desglose → Mi dinero → viernes | Libre $0.00 + «Te faltan $30.00 para cubrir lo que viene»; después del viernes $20.00 |
| EXTRA Tu espacio | Letra «A» → Tu espacio → Invitar a alguien | Visión futura marcada «Próximamente» |

## 4. Ajustes a los datos (para que todo cuadre)

- **Fecha:** el brief dice «martes 21 de octubre de 2026», pero ese día es **miércoles**; los viernes de Carlos son el 2, 9, 16, 23 y 30.
- **Banco Agrícola de Ana: $1,455.60** (el brief decía $560) para cubrir sus $900 de apartados. En v2.1, con la reserva de la quincena, el libre es **$243.10 · ~$27 por día**.
- **Efectivo de Carlos: $125**; el caso **C33** usa **$60**.
- **Crédito BAC:** estado del 15 de octubre $245 (anotado $230 → $15 de intereses), mínimo $25, paga el total el 5 de noviembre; compras desde el corte $45; cupo $1,500.
- **C30:** apartado **Regalo** ($20, meta $20, para el 10 de octubre).
- **C19:** ya no lleva anotaciones extra (en v2 se agregaron para esquivar la doble tarjeta; con V2-31 #10 no hacen falta).
- **Regalos** es una categoría (efectivo de forma usual).

## 5. Decisiones técnicas del prototipo (no son de producto)

- Montos en centavos enteros; nunca float. Fechas sin hora.
- **Saldo de un lugar = último cuadre + lo anotado después.**
- **Libre = Tienes − Apartado − Por pagar − Tarjetas − Guardando**, nunca negativo; el faltante se muestra. Por pagar = todo lo vencido + lo que vence antes del horizonte.
- **Horizonte:** el próximo ingreso; si un día de pago pasó sin confirmar, se queda en ese día («falta confirmarla») y Pagos usa el calendario.
- **Reserva gradual (V2-31 #7):** para cada pago mensual que vence después del próximo ingreso, se reparte entre los días de pago de su ciclo (entre el vencimiento anterior y este); lo ideal es lo de los días de pago que ya llegaron; si no alcanza, se guarda lo que haya y la cuota se recalcula con los que quedan. Ingresos con un solo día de pago por ciclo (mensual) o únicos no reservan.
- **Tarjeta:** lo decidido del último estado (menos lo pagado) + compras desde el corte. Un pago «Solo la compra» se marca para las compras nuevas; los demás pagan primero el estado de cuenta. La reserva de un apartado usado con crédito se muestra como «Guardando para pagos» y nunca supera lo que se debe.
- **Logros y Cerrados:** usar un apartado con fecha lo cierra; «Sí, ya lo gasté» → Logro; «No lo usé» o liberar todo uno vencido → Cerrado.
- **Pongámonos al día:** 10 días sin anotar ni cuadrar, o un día de pago pasado sin confirmar; nunca el mismo día de pago.
- **Prueba guiada:** cada tarea tiene una condición que la app revisa tras cada acción (por ejemplo, «hay un gasto nuevo de $6.00»); los toques se cuentan en la app, no en la barra de la tarea ni en «Casos y ayuda».
- **Guardado (entrenamiento):** `pamplanea-proto-v2:app` (estado, caso, pestaña, tema; con `formato: 2`), `pamplanea-proto-v2:notas` (nombre, notas, prueba), `pamplanea-proto-v2:dispositivo` (personas en este teléfono y set siguiente) y `pamplanea-proto-v2:guia`. La versión visible no invalida lo guardado.
- **Guardado (uso normal, v2.2):** ver «Modos v2.2 → Datos seguros».
- **Service worker:** primero la caché (sin importar `?set=…`), luego la red. Solo por http(s). Caché `pamplanea-proto-v2.3-2026-10-17`.

## 6. PREGUNTAS PARA VICTOR (no las decidí; el prototipo usa lo de §5)

1. **Sets entre teléfonos distintos:** sin servidor, la alternancia solo funciona en un mismo teléfono. Propongo mandar enlaces alternados `…/?set=A` y `…/?set=B`. ¿Te sirve así?
2. **iPhone e instalar al inicio:** en iPhone la app instalada guarda sus datos aparte de Safari; si la persona la instala en el paso 2, en la app instalada empieza de nuevo (lo avisamos). ¿Movemos la instalación al final de la prueba en iPhone?
3. ~~**Reserva gradual con quincena (#7):** hoy le baja a Ana $27.50 por pagos que vencen después del 30 (colegio del 5 y luz del 12). ¿Es lo esperado también para pagos chicos?~~ **Ya no aplica (v2.3):** la reserva gradual se reemplazó por V2-34 («Lo pagas con»).
4. **«Otro monto» en «¿Cuánto pagas?»** se aplica como en el banco: primero al estado de cuenta y lo que sobra a las compras/reserva. ¿Correcto?
5. **Comprensión «sin tocar nada»:** las tres preguntas ocupan la mitad de abajo y se sigue viendo el número grande. ¿Suficiente?
6. **Toques registrados:** cuentan solo dentro de la app (no la barra de tarea ni «Casos y ayuda»). ¿Así?
7. **Tarjeta agregada sin estado de cuenta:** aparece en Pagos en su vencimiento actual «según tu estado de cuenta», aunque Hoy no lo pida hasta el próximo corte. ¿O no mostrar nada hasta el corte?
8. **Préstamo con saldo:** sigue diciendo «~$300 debes» a la derecha y la cuota abajo. ¿Mismo tono positivo («Cuota $25 al mes · debes ~$300»)?
9. **Cuadre en Reparte:** al tocar Listo se guarda lo que diga cada campo (si no lo cambiaste, cuadra exacto y cuenta como actividad). ¿O solo si lo cambia?
10. **«Sí, ya lo gasté» con meta incompleta** (apartado a medias): igual va a Logros. ¿Correcto?

### PREGUNTA PARA VICTOR (v2.2)

11. ~~**Primer número con pago semanal y alquiler mensual:** si alguien empieza a mitad de mes, la reserva gradual supone que ya debió separar lo de los pagos que ya pasaron (Beto: ya van 3 de 5 viernes → $90 de $150 separados desde el primer día, y su libre baja a $30). Ahora «Tu primer número» lo explica. ¿Así, o el primer día debería empezar la reserva en cero?~~ **Ya no aplica (v2.3):** no hay reserva automática; si al pago del viernes no le alcanza, la app lo sugiere (V2-34).
12. **«¿Cómo te ha ido?» cada 3 días de uso:** con uso diario sale unas dos veces por semana. ¿Te parece, o cada 5 días?
13. **iPhone:** la app instalada no ve lo que se puso en Safari. Lo decimos en la pantalla previa («instálala antes de empezar»). ¿Prefieres que en iPhone sin instalar el botón «Empezar» quede detrás de los pasos de instalación?
14. **Al abrir, siempre Hoy:** la app ya no recuerda la última pestaña (ni al volver en un día nuevo), para que se vean los avisos del día. ¿Correcto?
15. **Nombres en «Contarle a Victor»:** también se tapan las palabras que coinciden con nombres de sus cosas aunque las use en otro sentido (por ejemplo, si un pago se llama «Casa», «casa» en un comentario sale como [nombre]). Preferimos tapar de más. ¿De acuerdo?
16. **Cerrar la bienvenida sin elegir** (la X): queda en entrenamiento con Ana y la próxima vez vuelve a preguntar. ¿Así?

### PREGUNTAS PARA VICTOR (v2.3)

17. **Pagar con un ingreso de una vez:** hoy «Lo pagas con» ofrece lo que tienes ahora y tus días de pago (con lo de tu pareja sumado). El aguinaldo, la Quincena 25 o un bono no cuentan por adelantado. ¿Quieres poder decir «la matrícula de enero la pago con el aguinaldo»?
18. **Tu cuchubal «quincenal con próxima fecha 23-oct»:** lo armé como «Cada quincena, el 8 y el 23». Si en realidad es cada dos viernes (23 oct, 6 nov, 20 nov…), elige «Cada 2 semanas» y la fecha del 23. ¿Cuál es?
19. **Anotar con fecha futura:** «zapatos 40» para el 25 queda como pago de una vez: no baja lo que tienes, pero sí tu libre de hoy (vence antes de tu quincena del 29, así que se paga con lo que ya tienes). ¿Correcto?
20. **«Tarjeta» en pagos fijos (V2-46):** la armé como una cuota mensual (nombre, cuánto pagas más o menos y el día), sin corte ni estado de cuenta, porque así se pide «solo nombre, cuota y día». Si la persona quiere anotar compras con ella, la agrega como tarjeta de crédito en el paso 3 o en Deudas. ¿O preferías que «Tarjeta» aquí fuera la tarjeta completa?

## 7. Lo que no hace (límites)

- Es una maqueta: sin servidor, sin cuentas, sin correo ni notificaciones reales (en uso normal los avisos se muestran al abrir la app). El dictado depende del micrófono del teclado.
- Los datos del modo uso viven solo en ese navegador o en la app instalada: si se borran los datos del navegador, se pierden (por eso «Guardar copia»).
- **Desktop (V2-28):** no está diseñado; en la computadora se ve la guía con el teléfono enmarcado.
- Aprende sin contenido.
- Los resúmenes de la prueba viven solo en el teléfono de cada persona hasta que los comparte.
- Revisión: Chrome y Edge sin ventana (390 × 844 y 1440 × 900), por `file://` y servido en la subruta de Pages; teclado simulado; contraste medido; navegador de iPhone y Android emulado para la guía de instalación; instalación, sin internet y actualización verificados en Chrome. **Sin teléfono real ni lector de pantalla:** pendiente de las pruebas de Victor.

## 8. Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html`, `guia.css`, `guia.js` | La guía para la computadora (13 casos y los dos sets); en pantalla angosta redirige a `telefono.html` conservando `?set=` |
| `telefono.html`, `prototipo.css` | La app (enmarcada en la guía o a pantalla completa) |
| `datos.js`, `motor.js` | Datos inventados y cálculos (libre, reservas, tarjeta, intérprete) |
| `app.js`, `hojas.js` | Pantallas, hojas y recorridos |
| `casos.js` | Los 13 casos, los sets A y B de la prueba guiada y la versión visible |
| `arranque.js` | Arranque, guardado en el navegador, casos y simulaciones |
| `ayuda.js` | Pantalla completa, «Casos y ayuda», prueba guiada, moderador, instalación y versión nueva |
| `modos.js` | v2.2: entrada, modo uso (datos reales, fecha real, avisos al abrir), copia/restaurar/borrar, «¿Cómo te ha ido?», registro de uso y «Contarle a Victor» |
| `tour.js` | v2.2: recorrido de 3 minutos y ejercicios de práctica |
| `manifest.webmanifest`, `sw.js`, `recursos/iconos/` | App instalable y sin internet |
| `recursos/` | Piel real (tokens, Instrument Sans, emoji Fluent, íconos Lucide, portadas e ilustraciones) con sus licencias |
| `README.md` | Para quien llega al repo: los dos modos, instalar, copia de datos, contarle a Victor |

Fuera del repo (en `.gitignore`, solo en la copia local): `capturas/` y `herramientas/` (`recorrer-v2.mjs` 13 casos, `recorrer-sets.mjs` sets A y B, `recorrer-modos.mjs` entrada, entrenamiento, tres personas y copia, `probar-pwa.mjs` (también datos reales tras actualizar), `instalar-ua.mjs`, `contraste*.mjs`, `generar-iconos.mjs`, `generar-sw.mjs` + `sw.plantilla.js`, `servidor.mjs`). Nuevos en la v2.3: `aceptacion-v23.mjs` (la prueba de aceptación de Victor, migración, Carlos, reparto, pagado y fecha futura), `entrega2-v23.mjs`, `viaje-v23.mjs` (el viaje del dinero), `probar-motor.mjs` (motor y casos borde), `humo-v23.mjs`, `capturas-ux.mjs` y `contraste-v23.mjs`.

## 9. Qué falta

**v2.3:** lo pedido en las Entregas 1 y 2 quedó hecho; de la Entrega 3 queda lo listado en «Revisión integral v2.3 → Lo que no alcancé». Queda para Victor: probar la v2.3 en su teléfono con sus datos (actualizar sin perder nada) y responder §6 (17–20); después, compartirla con la familia.

**v2.2:** nada de lo pedido quedó pendiente.

---

## BRIEF «PRODUCTO V2» (APROBADO por Victor, 2026-10-16) — íntegro

PROMESA (V2-01): «Saber cuánto me queda libre hasta mi próximo ingreso y que no se me olvide ningún pago», para salvadoreños con distintos hábitos. Más de la mitad no tiene cuenta bancaria (efectivo primero), hay mucha informalidad (ingresos variables) y muchos hogares reciben remesas.

PERFILES (hábitos, no tipos fijos): asalariado quincenal/mensual; pago semanal (obra, maquila, reparto); informal/emprendedor (diario, variable); recibe remesa; hogar con salario unido; con tarjeta o casa comercial; ahorra para una meta; el que se atrasa y vuelve. Una persona puede ser varios.

ACUERDOS
- V2-02 Registrar cada gasto es OPCIONAL. Tres niveles sin castigo: «solo planeo» (saldo, pagos, apartados, cuadres), «anoto lo grande» (marca Pagado), «anoto todo».
- Regla del CUADRE: «tu saldo parte de tu último cuadre». Saldo = lo que la persona dijo tener en su último cuadre + lo anotado DESPUÉS. Lo anotado con fecha ANTERIOR al cuadre no mueve el saldo: solo explica la diferencia («$X sin detalle»). El alta de una cuenta es su primer cuadre (ya no hay «saldo inicial» ni «ajustes»).
- V2-03 APARTADOS (reemplaza Ahorros): son etiquetas sobre tu dinero total, NO un lugar y NO restan de la cuenta. «Tienes $1,000» = Efectivo $200 + Banco $800, y a la vez Emergencias $200 + Laptop $300 + Sin apartar $500. Acciones: apartar, liberar, USAR (registra el gasto y vacía el apartado en un paso; la meta queda «cumplida» como logro, no «retrocede»), mover a otro apartado. Meta opcional (monto y fecha). Si el dinero total no cubre los apartados: aviso «faltan $X para cubrir tus apartados». Lo que es «para un pago» (luz, colegio) NO es apartado: es un pago en Pagos.
- V2-04 Pagos, recordatorios y el número central van primero. Todo puede cambiar.
- V2-06 Ingreso sin fecha fija: la persona elige horizonte «hasta fin de mes» o «próximos 15 días».
- V2-07 Una compra con tarjeta de crédito baja el libre EL DÍA que se hace.
- V2-08 Deudas: la cuota es un pago en Pagos; «cuánto debo» es opcional y baja con cada «Pagado».
- V2-09 En «Reparte tu quincena» la app SUGIERE cuánto apartar; nunca lo hace sola.
- V2-10 Avisos: notificación de la app instalada + correo de respaldo (en la maqueta: simular notificaciones y mostrarlas también dentro de Hoy).
- V2-11 Primer día pregunta dónde está el dinero (efectivo, banco) con opciones.
- V2-12 Navegación del teléfono: Hoy · Pagos · (+) Anotar · Mi dinero · Mes. Ajustes en la foto/menú de la persona en Hoy.
- V2-13 Tarjeta: el libre descuenta lo que la persona DECIDE pagar (total, mínimo u otro); el resto se ve como deuda en Mi dinero. Las compras del ciclo en curso sí bajan el libre (V2-07).
- V2-14 Entrada rápida con REGLAS + dictado del teclado del teléfono (el micrófono del teclado convierte voz a texto). Sin IA. Si no entiende, abre el formulario con lo que sí entendió; nunca falla en silencio.
- V2-15 ~~Reserva gradual: con ingreso semanal y pagos mensuales, el número va guardando por partes («Guardando para el alquiler: $75 de $150»).~~ **REEMPLAZADA por V2-34 (2026-10-17).**
- V2-16 Con dos ingresos (pareja), el horizonte es hasta el INGRESO PRINCIPAL; el otro suma cuando llega.
- V2-17 «Me deben / le debo a alguien»: FUERA de v1.
- V2-18 «Pagado con» muestra MEDIOS con nombre (Efectivo · Débito Agrícola · Crédito BAC · Transferencia); cada medio cuelga de un LUGAR (la débito baja su cuenta). NFC = pagar con una de tus tarjetas desde el celular, no es un medio aparte. Debe sentirse inteligente: recuerda el medio usual por tipo de gasto y solo pregunta si hay duda. Transferencia pregunta «¿desde cuál cuenta?» solo si hay más de un banco.
- V2-20 Educación: consejos en el momento justo (estado de cuenta, pago mínimo), sin culpa; sección «Aprende» en el menú de la foto (contenido después).
- V2-22 El dinero pertenece a un ESPACIO («Hogar de Ana»), hoy de una sola persona. v1 = una persona lleva el hogar y el salario de la pareja entra como ingreso esperado. Mostrar en Ajustes → Tu espacio → «Invitar a alguien» como VISIÓN FUTURA (marcada «Próximamente», con una pantalla que explica qué podría hacer la pareja: ver el mismo número, anotar, avisos para ambos).
- Ingresos extra: aguinaldo (diciembre), Quincena 25 (enero), comisiones, bono, remesa: aparecen como ESPERADOS en Pagos, NO suman al libre hasta que llegan, y al llegar abren «Reparte», el mismo ritual de la quincena. Cuchubal: tu aporte = pago periódico; tu turno = ingreso esperado.
- Tarjeta = un lugar con cuadre; su cuadre es el ESTADO DE CUENTA. Quien anota todo: «Anotaste $230; el estado dice $245. ¿Qué son los $15? [Intereses o cargos] [Compras que no anoté] [No sé]». Quien no anota: «¿Cuánto te salió? Total / Mínimo» → «¿Cuánto vas a pagar?». Pagar la tarjeta = MOVER dinero del banco a la tarjeta (no es gasto nuevo). Intereses: no se calculan; aparecen en la diferencia del estado («Este año pagaste $X en intereses», sin culpa).

LAS 5 PANTALLAS
1) HOY — «¿Cuánto me queda y qué viene?»
   - Encabezado con horizonte («Hasta tu quincena del 30 · en 9 días»; semanal: «Hasta el viernes»; variable: «Hasta fin de mes»).
   - Número grande: «Libre $450 · ~$50 por día». Tocarlo abre el desglose: Tienes (→ Mi dinero) − Apartado (→ Mi dinero/Apartados) − Por pagar antes del ingreso (→ Pagos) [incluye tarjeta: $X] [guardando para alquiler: $X] = Libre.
   - Aviso si aplica: «El 20 te faltarían $35 para la luz» / «Faltan $100 para cubrir tus apartados».
   - Próximos 3 pagos con botón [Pagado]; «Ver todos» → Pagos.
   - Tarjeta «Pongámonos al día» solo si hace días que no anota ni cuadra.
   - Últimos anotados (solo si la persona anota) → «Ver historial» → Mes.
   - Notificaciones simuladas visibles aquí.
2) PAGOS — «¿Qué pago y cuándo me pagan?»
   - Línea de tiempo por periodo (Esta quincena / Próxima / Mes): «Vencidos por confirmar» arriba; luego hoy y próximos; los INGRESOS ESPERADOS intercalados entre los pagos («30 · Quincena ~$600»).
   - Cada pago: nombre, monto (o «~$35 estimado»), fecha, estado, ícono de aviso.
   - Ficha de pago: editar, avisos (dos posibles: «revisar el recibo el 3» y «vence el 12»), historial, [Pagado] (pide monto real si es variable), [Saltar este mes], [Ya no aplica].
   - Tarjetas y cuotas viven aquí como pagos. Botones + Pago y + Ingreso esperado.
3) (+) ANOTAR — hoja inferior desde cualquier pantalla
   - Un campo «¿Qué pasó?» con ejemplos rotando y nota del micrófono del teclado.
   - Mientras escribe, chips de lo entendido, todos tocables: «Gasto · $25 · Súper · Débito Agrícola · hoy».
   - Atajos con campo vacío: Gasté · Recibí · Recordarme un pago · Apartar · Mover · Tengo $___ (cuadre).
   - Respeta el contexto: abierto desde la ficha de una cuenta → ese medio/lugar.
   - Al guardar: «✓ Guardado · Deshacer».
   - Implementa un parser de reglas DE DEMOSTRACIÓN que entienda al menos: «súper 25», «pupusas 6», «zapatos 45 tarjeta», «me pagaron 600», «vendí 45», «acuérdame colegio 20 el 5», «luz 35 el 12», «aparté 50 emergencias», «tengo 300», «retiré 100 del cajero» (Mover + pregunta opcional «¿te cobraron comisión?»), «medicina 40» (ofrece «¿Usar un apartado? Emergencias»). Si no entiende: formulario prellenado.
4) MI DINERO — «¿Dónde está y para qué es?»
   - Arriba: Total, separado por lugares (Efectivo, Banco Agrícola con su «Débito Agrícola» debajo), «cuadrado hace 3 días» y [Cuadrar].
   - Apartados con avance de meta + «Sin apartar: $X» + [Apartar].
   - Tarjetas y deudas: «Crédito BAC: por pagar $230 el 5» · «Casa comercial: debes ~$420». Abren la MISMA ficha que en Pagos.
   - Ficha de lugar: saldo, cuadrar, mover, historial; (+) desde aquí trae ese medio.
   - Ficha de apartado: apartar más, Usar, liberar, mover a otro apartado, meta, historial.
5) MES — «¿En qué se me fue?»
   - Selector de mes. Entró / Salió (fijos de Pagos · anotados por categoría · tarjeta sin detalle · sin detalle) y comparación con el mes anterior.
   - Por categoría → lista. Historial completo con filtros; aquí se CORRIGE (si el registro es anterior al último cuadre, avisar «no cambia tu saldo porque cuadraste después»).

REGLAS DE CONEXIÓN
1. Todo vuelve a Hoy y el número se actualiza a la vista.
2. Un objeto = una sola ficha, se abra desde donde se abra.
3. (+) respeta el contexto.
4. Nada se cuenta dos veces («Pagado» crea el gasto; el cuadre explica, no suma).
5. Mes solo lee y corrige.
