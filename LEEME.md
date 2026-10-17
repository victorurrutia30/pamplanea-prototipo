# Producto v2 · prototipo de teléfono — versión 2.1

**Qué es:** un prototipo clicable de la app completa propuesta en Producto v2, para probarlo con 5–8 personas **en su propio teléfono** (algunas sin experiencia en apps de finanzas) y recoger datos comparables. Es una maqueta de flujo y comprensión, no producción. Datos 100 % inventados.

**Dónde:** repo público `victorurrutia30/pamplanea-prototipo`, publicado con GitHub Pages en <https://victorurrutia30.github.io/pamplanea-prototipo/>. La versión 1 queda como historial en `pamplanea-capturas/v2-prototipo/` (no se tocó).

**Cómo se abre:**

- **Computadora:** doble clic en `index.html` (Chrome o Edge) o el enlace de Pages. Muestra la guía con el teléfono enmarcado (390 × 844), los 13 casos y los dos sets de la prueba guiada.
- **Teléfono:** el mismo enlace. En pantalla angosta (< 768 px) `index.html` abre la app **a pantalla completa**, con la bienvenida para tester y «Casos y ayuda». Se puede **instalar** (PWA) y abre **sin internet** después de la primera visita.

Sin servidor propio, sin dependencias, sin CDN, sin analítica ni rastreadores. Fuentes, emoji, íconos y los íconos de la app instalable son locales, con sus licencias (`recursos/licencias`).

**Estado:** brief y acuerdos V2-01…V2-22 APROBADOS por Victor (2026-10-16); **V2-23 a V2-30** y **V2-31 (respuestas v2.1)** APROBADOS por Victor (2026-10-16). Nada de esto está documentado todavía en el repo de la app: se documentará después de las pruebas con personas. Este prototipo no cambia nada del repo de la app.

Versión visible en la app y en la guía: **«Prototipo v2.1 · 2026-10-16»**.

---

## V2-31 Respuestas v2.1 (APROBADO por Victor, 2026-10-16)

1. Si hay dos pagos próximos de la misma tarjeta, el mensaje dice el mes: «pago del 5 de diciembre».
2. «Pagar la tarjeta ya» NO salda todo en automático: pregunta «¿Cuánto pagas? [Solo la laptop $600] [Todo lo que debes $X] [Otro]».
3. Apartado cerrado después de su fecha: es Logro solo si se usó para su propósito («Sí, ya lo gasté»). Si se libera sin usarlo, queda «Cerrado», no Logro.
4. «No lo anoté»: la fecha se muestra como sugerencia editable (chip con la fecha de la meta).
5. Correcto: [Pagado] sin preguntar solo a tiempo; los vencidos preguntan la fecha.
6. El libre nunca se muestra negativo, pero cuando está en $0 SIEMPRE aparece el faltante exacto: «Te faltan $X para cubrir lo que viene» (tocable, lleva al detalle).
7. Reserva gradual para TODOS los tipos de ingreso: cada pago se reparte entre los días de pago que caen antes de su vencimiento (ej. alquiler del 1 con quincenas 15 y 30 = mitad y mitad). Mostrarlo en el desglose de Hoy, en Mi dinero («Guardando para pagos») y en la ficha del pago. Revisar que los resultados esperados de todos los casos sigan cuadrando y actualizarlos.
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
- `sw.js`: caché **versionada** (`pamplanea-proto-v2.1-2026-10-16`) que precarga los 138 archivos publicados; abre sin internet. Una versión nueva se instala en segundo plano y la app muestra «Hay una versión nueva · Actualizar»; al tocarlo guarda y recarga **sin perder datos** (lo guardado tiene su propio formato, independiente de la versión visible). La primera instalación no recarga la página.
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
- **Guardado:** `pamplanea-proto-v2:app` (estado, caso, pestaña, tema; con `formato: 2`), `pamplanea-proto-v2:notas` (nombre, notas, prueba), `pamplanea-proto-v2:dispositivo` (personas en este teléfono y set siguiente) y `pamplanea-proto-v2:guia`. La versión visible no invalida lo guardado.
- **Service worker:** primero la caché (sin importar `?set=…`), luego la red. Solo por http(s).

## 6. PREGUNTAS PARA VICTOR (no las decidí; el prototipo usa lo de §5)

1. **Sets entre teléfonos distintos:** sin servidor, la alternancia solo funciona en un mismo teléfono. Propongo mandar enlaces alternados `…/?set=A` y `…/?set=B`. ¿Te sirve así?
2. **iPhone e instalar al inicio:** en iPhone la app instalada guarda sus datos aparte de Safari; si la persona la instala en el paso 2, en la app instalada empieza de nuevo (lo avisamos). ¿Movemos la instalación al final de la prueba en iPhone?
3. **Reserva gradual con quincena (#7):** hoy le baja a Ana $27.50 por pagos que vencen después del 30 (colegio del 5 y luz del 12). ¿Es lo esperado también para pagos chicos?
4. **«Otro monto» en «¿Cuánto pagas?»** se aplica como en el banco: primero al estado de cuenta y lo que sobra a las compras/reserva. ¿Correcto?
5. **Comprensión «sin tocar nada»:** las tres preguntas ocupan la mitad de abajo y se sigue viendo el número grande. ¿Suficiente?
6. **Toques registrados:** cuentan solo dentro de la app (no la barra de tarea ni «Casos y ayuda»). ¿Así?
7. **Tarjeta agregada sin estado de cuenta:** aparece en Pagos en su vencimiento actual «según tu estado de cuenta», aunque Hoy no lo pida hasta el próximo corte. ¿O no mostrar nada hasta el corte?
8. **Préstamo con saldo:** sigue diciendo «~$300 debes» a la derecha y la cuota abajo. ¿Mismo tono positivo («Cuota $25 al mes · debes ~$300»)?
9. **Cuadre en Reparte:** al tocar Listo se guarda lo que diga cada campo (si no lo cambiaste, cuadra exacto y cuenta como actividad). ¿O solo si lo cambia?
10. **«Sí, ya lo gasté» con meta incompleta** (apartado a medias): igual va a Logros. ¿Correcto?

## 7. Lo que no hace (límites)

- Es una maqueta: sin servidor, sin cuentas, sin correo ni notificaciones reales (se simulan). El dictado depende del micrófono del teclado.
- **Desktop (V2-28):** no está diseñado; en la computadora se ve la guía con el teléfono enmarcado.
- Aprende y Ayuda sin contenido. Lugares y medios solo se configuran en el primer día.
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
| `ayuda.js` | Pantalla completa, aviso, «Casos y ayuda», prueba guiada, moderador, instalación y versión nueva |
| `manifest.webmanifest`, `sw.js`, `recursos/iconos/` | App instalable y sin internet |
| `recursos/` | Piel real (tokens, Instrument Sans, emoji Fluent, íconos Lucide, portadas e ilustraciones) con sus licencias |
| `README.md` | Para quien llega al repo: instalar, hacer la prueba, enviar el resumen |

Fuera del repo (en `.gitignore`, solo en la copia local): `capturas/` y `herramientas/` (`recorrer-v2.mjs` 13 casos, `recorrer-sets.mjs` sets A y B, `probar-pwa.mjs`, `instalar-ua.mjs`, `contraste*.mjs`, `generar-iconos.mjs`, `generar-sw.mjs` + `sw.plantilla.js`, `servidor.mjs`).

## 9. Qué falta

Nada de lo pedido quedó pendiente. Queda para Victor: probar en su teléfono (instalar, sin internet, un set completo, enviar el resumen, «Nueva persona») y correr la prueba con 5–8 personas; responder §6.

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
