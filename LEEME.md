# Producto v2 · prototipo de teléfono

**Qué es:** un prototipo clicable, solo de teléfono (390 × 844 px), de la app completa propuesta en Producto v2, para recorrer el flujo y probarlo con 5–8 personas. Es una maqueta de flujo y comprensión, no producción.

**Cómo se abre:** doble clic en `index.html` (Chrome o Edge). No necesita servidor, internet ni parámetros. `telefono.html` también abre solo (sin la guía).

**Estado:** decisiones APROBADAS por Victor en el chat auditor (2026-10-16) y todavía **no documentadas en el repo**: se documentarán después de probar este prototipo con personas. Este prototipo no cambia nada dentro del repo.

---

## 1. Cómo usar la guía (`index.html`)

1. Elige un caso a la izquierda (C01 … EXTRA): el teléfono queda listo en su pantalla de inicio y el panel de la derecha muestra los pasos, el resultado esperado y qué observar.
2. Haz los pasos dentro del teléfono. Los pasos se marcan solos cuando el teléfono los detecta; los que dicen «(márcalo tú)» los marcas tú.
3. Algunos casos traen botones de simulación en el panel («Simular: es 4 de noviembre», «Simular: llega el viernes 23»): mueven la fecha y mandan la notificación.
4. Arriba: «Explorar libre con» Ana o Carlos (sin pasos), el tema (Serena/Ancla × claro/oscuro, cambia la guía y el teléfono), «Ajustar el teléfono a la ventana» (si tu pantalla es baja) y «Reiniciar datos».
5. Al final: «Qué observar en cada caso» y «Mis notas» (se guardan solo en este navegador). «Armar texto» junta todo en un cuadro seleccionable para copiar con Ctrl + A, Ctrl + C (no depende del portapapeles).

Los datos viven solo en la pestaña: recargar vuelve todo al inicio. La fecha simulada es el **miércoles 21 de octubre de 2026** (ver §4).

## 2. Qué contiene el teléfono

- Barra de 5 posiciones: **Hoy · Pagos · (+) Anotar · Mi dinero · Mes**, con safe areas simuladas (barra de estado y barra de inicio).
- **Hoy:** horizonte («Hasta tu quincena del 30 · en 9 días»), número grande «Libre» con «~$ por día» (tocarlo abre el desglose: Tienes − Apartado − Por pagar − Guardando = Libre), avisos («El 20 te faltarían…», «Faltan $X para cubrir tus apartados»), tarjetas de momento («Hoy es tu quincena», «¿Ya te llegó tu estado de cuenta?», «Pongámonos al día»), avisos de hoy (notificaciones simuladas), próximos pagos con [Pagado] y un separador «Desde tu quincena del 30», últimos anotados → Mes. La letra de la persona abre el menú: Tu espacio, Cómo te pagan, Lugares y medios, Avisos, Aprende y Apariencia.
- **Pagos:** «Por confirmar» arriba; pestañas Esta quincena / Próxima / Mes (Carlos: Esta semana); línea de tiempo con los ingresos esperados intercalados; «Más adelante» (aguinaldo, turno del cuchubal); + Pago y + Ingreso esperado. Ficha de pago: monto o «~$35 estimado», Pagado (pide el monto real si varía), Saltar este mes, dos avisos con interruptor (revisar el recibo / vence), historial, Editar, Ya no aplica.
- **(+) Anotar:** «¿Qué pasó?» con ejemplos que rotan y la nota del micrófono del teclado; chips de lo entendido, todos tocables; atajos Gasté · Recibí · Recordarme un pago · Apartar · Mover · Tengo $___; respeta el contexto (abierto desde la ficha de un lugar o de la tarjeta trae ese medio); «✓ Guardado · Deshacer». Intérprete de reglas de demostración, sin IA (ver §5).
- **Mi dinero:** Tienes (Efectivo + Banco), Cuadrar y Mover; Dónde está (cuadrado hace N días); Apartados con portada, meta y barra, «Sin apartar» y Apartar; Tarjetas y deudas (abren la misma ficha que en Pagos); Logros. Ficha de lugar (después del cuadre / marca del cuadre / antes del cuadre). Ficha de apartado (Apartar más, Usar, Liberar, Mover a otro, meta, historial). Ficha de tarjeta (debes en total, por pagar, compras desde el corte, estado de cuenta, pagar tarjeta = mover, intereses del año sin culpa).
- **Mes:** selector de mes, Entró / Salió y comparación con el mes anterior, «¿En qué se te fue?» (pagos fijos, categorías, tarjeta sin detalle, sin detalle), historial con filtros; tocar un registro lo corrige y avisa si es anterior al último cuadre.
- **Recorridos:** Primer día (4 pasos + «Tu primer número»), Reparte (quincena, semana o ingreso extra), Pongámonos al día (ingresos → pagos → cuadre), estado de cuenta de la tarjeta, logro de meta cumplida, Tu espacio e Invitar a alguien (Próximamente).

## 3. Los 9 recorridos y su resultado esperado

| Caso | Qué hace | Resultado esperado |
| --- | --- | --- |
| C01 Primer día | Cómo te pagan → cuánto tienes y dónde (no se puede saltar) → con qué pagas → pagos fijos con chips → primer número | «Tu primer número»: libre hasta la quincena del 30, explicado; Hoy igual |
| C05 «pupusas 6» | (+) → escribir → Guardar | Libre $270.60 → $264.60 al instante, «✓ Guardado · Deshacer» |
| C11 Colegio dictado | «acuérdame colegio 20 el 5» → Cada mes → Simular día 4 → notificación → Pagado | Colegio en Pagos el 5; aviso el 4; al pagar el libre no cambia ($815.60): ya estaba contado |
| C16 Estado de cuenta (no anota) | Aviso → total 245 y mínimo 25 → cuánto vas a pagar + consejo | Con «Todo» el libre baja de $560.60 a $315.60; con «Mínimo» baja $25 y los $220 se ven como deuda |
| C19 Llega la quincena | «¿Ya te cayó?» → $600 → Reparte (ya contado + sugerencias) → Listo | Libre hasta la quincena del 15; apartar baja el libre al momento; nada se aparta solo |
| C20 Carlos | Hoy semanal → desglose (guardando $90 de $150) → Simular viernes → Reparte | Antes $35.00 (~$17 por día); después guardando $120 de $150 y libre $85 hasta el viernes 30 |
| C23 Usar Laptop | Mi dinero → Laptop → Usar → $600 | «¡Meta cumplida!»; el libre sigue en $270.60; Laptop pasa a Logros; el banco baja $600 |
| C26 Dos semanas después | 6 de noviembre → Pongámonos al día → quincena → pagos → cuadre | «¡Listo, estás al día!» con número nuevo; lo que no cuadró queda «sin detalle» |
| EXTRA Tu espacio | Letra «A» → Tu espacio → Invitar a alguien | Visión futura marcada «Próximamente»: mismo número, anotar desde su teléfono, avisos para ambos |

## 4. Ajustes a los datos del brief (para que todo cuadre)

- **Fecha:** el brief dice «martes 21 de octubre de 2026», pero en el calendario real ese día es **miércoles**. El prototipo usa la fecha real; por eso los viernes de Carlos son el 2, 9, 16, 23 y 30, y el horizonte de Carlos es «Hasta el viernes · en 2 días».
- **Banco Agrícola de Ana: $1,455.60** (el brief decía $560). Con $560 + $40 los $900 de apartados (Emergencias $200, Laptop $600, Vacaciones $100) no estaban cubiertos y el libre salía negativo. Con este saldo: Tienes $1,495.60 − Apartado $900 − Por pagar $325 (luz vencida ~$35 + Crédito BAC $290) = **Libre $270.60 · ~$30 por día durante 9 días**.
- **Efectivo de Carlos: $125** (el brief decía $60). Con $60 no alcanzaba la reserva del alquiler. Ahora: Tienes $125 − Guardando para el alquiler $90 de $150 = **Libre $35.00**.
- **Crédito BAC:** estado del 15 de octubre $245 (anotado $230 → $15 de intereses o cargos), mínimo $25, decide pagar el total el 5 de noviembre; compras desde el corte $45 (zapatos del 17). Intereses del año: $38.50.
- **Internet y Casa comercial** vencían el 20 (ayer) y están pagados; **Agua** (18) pagada; **Luz** (12) vencida sin confirmar. Casa comercial: debe ~$420.
- **Carlos:** cuchubal $10 cada viernes (su turno, $200, el 18 de diciembre, como ingreso esperado).

## 5. Decisiones técnicas del prototipo (no son de producto)

- Montos en centavos enteros; nunca float. Fechas sin hora.
- **Saldo de un lugar = último cuadre + lo anotado después** (fecha posterior o mismo día anotado después del cuadre). Lo anterior no lo mueve y lo dice.
- **Libre = Tienes − Apartado − Por pagar antes del próximo ingreso − Tarjetas − Guardando.** Tarjetas = lo que decidiste pagar del último estado (menos lo ya pagado) + compras desde el corte.
- **Reserva gradual (ingreso semanal):** cada pago mensual que vence después del próximo ingreso se reparte entre los viernes del ciclo (octubre: 5 viernes → $30 cada uno); va guardado lo de los viernes que ya llegaron.
- **Intérprete sin IA:** primera palabra como intención (acuérdame, me pagaron, vendí, aparté, tengo, retiré…), «el N» como día, «ayer», «tarjeta/débito/efectivo/transferencia» como medio, el primer número como monto, palabras clave por categoría, y el medio usual = el más usado en las últimas 5 anotaciones de esa categoría. Si el nombre coincide con un pago existente, es «Pagado» de ese pago. Si no entiende, dice «No entendí del todo» y abre las opciones; nunca falla en silencio.
- **[Pagado]** de un pago con monto fijo y a tiempo se guarda directo con «Deshacer»; si el monto varía, si venció o si es la tarjeta, abre una hoja.
- **Avisos de hoy** muestra solo lo vigente y lo que no tiene ya su propia tarjeta en Hoy.
- «Pongámonos al día» aparece a los 14 días sin anotar ni cuadrar.
- Sugerencia de Reparte: 10 % del ingreso (redondeado a $5), dos tercios para Emergencias y el resto al siguiente apartado; nunca se aparta solo.
- Al usar un apartado con menos de lo juntado, lo que sobra vuelve a «Sin apartar».

## 6. PREGUNTAS PARA VICTOR (no las decidí; el prototipo usa lo de §5)

1. **Tarjeta en el libre:** el pago del estado de cuenta (vence el 5 de noviembre, después de la quincena del 30) ya baja el libre de hoy, porque esas compras bajaron el libre el día que se hicieron (V2-07/V2-13). ¿Es así, o solo debe contar si vence antes del próximo ingreso?
2. **Pagos vencidos sin confirmar** (la luz del 12) cuentan como por pagar hasta que la persona diga algo. Si dice «Pagado el 12», como cuadró el banco el 15, el saldo no baja y **el libre sube $35**. ¿Se entiende o confunde?
3. **Día de pago sin confirmar:** el número dice «Libre por ahora» con el horizonte viejo hasta que confirme «¿Ya te cayó?». ¿O debería suponer que llegó?
4. **Pago el mismo día del ingreso** (cuchubal el viernes): se cuenta en el periodo siguiente. ¿Correcto?
5. **Reserva gradual cuando no alcanza:** con $60 en efectivo Carlos no cubre los $90 que «deberían» ir guardados y el libre sale negativo. ¿Cómo debe verse ese caso? ¿Y la porción cambia en meses de 4 o 5 viernes?
6. **«Pongámonos al día»:** ¿14 días sin anotar ni cuadrar es el umbral correcto?
7. **Sugerencia de apartar:** ¿qué regla prefieres (10 % del ingreso, por fecha de la meta, lo que falta para la meta)?
8. **Pagado sin preguntar:** con monto fijo y a tiempo se guarda directo con Deshacer. ¿O siempre confirmar con qué se pagó?
9. **Pagar el mínimo:** el resto ($220) se ve como deuda pero no baja el libre; el siguiente estado de cuenta lo traerá con intereses y eso no está modelado. ¿Basta para v1?
10. **Ingreso que se adelanta:** «me pagaron 600» el 21 se toma como la quincena del 30 que llegó antes («se adelantó») y el horizonte salta al 15. ¿Correcto?
11. **«Apartar» para un pago:** si alguien escribe «aparté 20 luz», hoy se crea el apartado «Luz». ¿Debería decir «¿Es para un pago? Agrégalo en Pagos»?
12. **«~$30 por día»** redondea hacia abajo a dólares enteros. ¿Bien así?

## 7. Lo que no hace (límites)

- Es una maqueta: sin servidor, sin cuentas, sin correo ni notificaciones reales (se simulan con un banner y en Hoy). El dictado depende del micrófono del teclado del teléfono: en la PC se escribe.
- Solo teléfono. Desktop, laptop y tablet no están diseñados.
- Aprende y Ayuda no tienen contenido. Lugares y medios solo se configuran en el primer día. Editar un ingreso esperado, remesas recurrentes y la Quincena 25 se cubren con «+ Ingreso esperado».
- Revisión hecha con Chrome sin ventana (capturas en `capturas/`), Chrome y Edge para la guía, teclado automatizado y contraste medido. Sin lector de pantalla ni teléfono real.

## 8. Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html`, `guia.css`, `guia.js` | La guía para Victor (casos, pasos, simulaciones, tema, notas) |
| `telefono.html`, `prototipo.css` | El teléfono |
| `datos.js` | Ana, Carlos, la persona nueva y el catálogo |
| `motor.js` | Fechas, centavos, saldo por cuadre, libre, reservas, mes e intérprete |
| `app.js`, `hojas.js`, `arranque.js`, `casos.js` | Pantallas, hojas, recorridos, casos y simulaciones |
| `recursos/` | Piel real copiada del repo (solo lectura): tokens de los 4 temas, Instrument Sans, 110 emoji Fluent, íconos Lucide, patrón Círculos, portadas e ilustraciones, con sus licencias |
| `herramientas/` | Scripts de revisión (generar recursos, recorrer los 9 casos, hojas de contacto, contraste, teclado, verificar la guía) |
| `capturas/` | Evidencia de las dos rondas de autocrítica y de la guía |

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
- V2-15 Reserva gradual: con ingreso semanal y pagos mensuales, el número va guardando por partes («Guardando para el alquiler: $75 de $150»).
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
