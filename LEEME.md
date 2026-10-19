# Producto v2 · prototipo de teléfono — versión 2.6.4

**Qué es:** un prototipo clicable de la app completa propuesta en Producto v2. Desde la v2.2 tiene **dos modos**: **entrenamiento** (datos inventados de Ana, Carlos y Rosa; entrenamiento en dos versiones —fecha fija o ingresos que varían— con «Lo esencial» y «Aprende más», 18 ejercicios y la prueba A/B para testers) y **uso normal** (la familia cercana de Victor la usa 1–2 semanas con su dinero real, guardado solo en su teléfono). Desde la v2.6, la persona solo ve tres caminos —«Usarla con mis datos», «Aprender a usarla» y «Prueba guiada»— y las herramientas de Victor (casos, sets, moderador) se abren con `?victor=1`. Es una maqueta de flujo y comprensión, no producción.

**Dónde:** repo público `victorurrutia30/pamplanea-prototipo`, publicado con GitHub Pages en <https://victorurrutia30.github.io/pamplanea-prototipo/>. La versión 1 queda como historial en `pamplanea-capturas/v2-prototipo/` (no se tocó).

**Cómo se abre:**

- **Computadora:** doble clic en `index.html` (Chrome o Edge) o el enlace de Pages. Muestra la guía con el teléfono enmarcado (390 × 844), los 13 casos y los dos sets de la prueba guiada.
- **Teléfono:** el mismo enlace. En pantalla angosta (< 768 px) `index.html` abre la app **a pantalla completa**: la primera vez pregunta «Aprender a usarla» o «Usarla con mis datos». Se puede **instalar** (PWA) y abre **sin internet** después de la primera visita.
- **Herramientas de Victor (v2.6):** el mismo enlace con **`?victor=1`** (<https://victorurrutia30.github.io/pamplanea-prototipo/?victor=1>). En «Ayuda», abajo, «Herramientas de Victor»: los 13 casos, explorar con Ana, Carlos o Rosa, «Mis notas», «Reiniciar ejemplos», la prueba guiada con sus sets A y B y el Modo moderador. Sin `?victor=1` no se ven. `?set=A` y `?set=B` siguen igual.

Sin servidor propio, sin dependencias, sin CDN, sin analítica ni rastreadores. Fuentes, emoji, íconos y los íconos de la app instalable son locales, con sus licencias (`recursos/licencias`).

**Estado:** brief y acuerdos V2-01…V2-22 APROBADOS por Victor (2026-10-16); **V2-23 a V2-30** y **V2-31 (respuestas v2.1)** APROBADOS por Victor (2026-10-16); **V2-34 a V2-49** APROBADOS por Victor (2026-10-17) — V2-15 y V2-31 #7 quedan REEMPLAZADAS por V2-34. **V2-50 a V2-55** y la corrección adicional (adelanto de salario) APROBADOS por Victor (2026-10-17). **v2.4 «Entrenamiento a prueba de todo»** y sus tres ajustes previos APROBADOS por Victor (2026-10-17). **V2-56 a V2-58** y el **entrenamiento en dos versiones** (v2.4.1) APROBADOS por Victor (2026-10-18). **v2.5 «Entrenamiento sencillo y a fondo»** (estructura, ritmo y claridad) y **V2-59** (respuestas 26–29) APROBADOS por Victor (2026-10-18). **V2-60 a V2-63** (v2.6 «Simplificar para la prueba familiar») APROBADOS por Victor (2026-10-19). **V2-64 a V2-78** (QA profundo, deudas y tarjetas, Primer día, lenguaje, botón atrás, iPhone y entrenamiento; v2.6.1 a v2.6.3) APROBADOS por Victor (2026-10-19). **V2-79 a V2-84** (salir del entrenamiento sin perder tus datos, duplicados, pagos futuros y formularios; v2.6.4 y v2.6.5) APROBADOS por Victor (2026-10-19). Nada de esto está documentado todavía en el repo de la app: se documentará después de las pruebas con personas. Este prototipo no cambia nada del repo de la app.

Versión visible en la app y en la guía: **«Prototipo v2.6.4 · 2026-10-19»**.

---

## Prototipo v2.6.4 (2026-10-19): hotfix — salir del entrenamiento y volver a tus datos (V2-79)

**Decisión APROBADA por Victor (2026-10-19), frase literal** (vale para V2-79 a V2-84):

> «Revisa prueba guiada y aprender a usarla urgentemente, cuando me salgo mid training no me esta dejando volver a mis datos, puedo pagar 2 veces como marcado un servicio o pago programado es mes? al darle recibi, como afecta o see vita duplicidad si por ejemplo selecciono salario ahi? al parecer a darle pagado puedo ir pagando asi cada fecha futura pero no da como una adbertencia. […] tambien que formulario de recordarme de pag, como nos aseguramos que eso no provoca duplicidad como anotar luz dos vecez? ademas, al seleccionar una categoria pago frecuente no sale como el borde que rodea la categoria que se selecciona, revisa bien los formularios, todos»

**V2-79 (P0):** si la persona sale a mitad de «Aprender a usarla» (o de un capítulo, la prueba guiada o «Practicar»), no puede volver a sus datos. **Reproducción exacta de Victor** (con datos reales, desde «Usarla con mis datos»): 1) «Aprender a usarla»; 2) «Tu versión: fecha fija» → «Cambiar»; 3) «Lo recibo cuando vendo o trabajo»; 4) en «Lo esencial», «Ahora no». Resultado: la app dice «Usarla con mis datos · Estás aquí», pero muestra los datos de **Rosa**, y no hay forma de volver.

### La causa real (verificada con una prueba que falla en la v2.6.3)

1. **Pérdida de datos.** «Cambiar» (`tourElegir` → `mostrarElegir`) y la versión elegida (`elegirVersion` → `empezarCap` → `cargar`) cargaban un ejemplo **sin pasar al modo entrenamiento**: con `P.modo === 'uso'` y `P.st` = Rosa, el guardado de cada pantalla (`guardarUso`) hacía `uso.st = P.st` y **escribía a Rosa encima de los datos reales** (`pamplanea-uso:v1`). Al reabrir, la migración le ponía persona «uso» y Rosa quedaba como «tus datos» para siempre. Los capítulos (`tourCap`) sí cambiaban de modo; «Cambiar» no. Lo mismo con «Me pagan en fecha fija» (Ana) y con «Ahora no» al elegir la versión si ya había un capítulo abierto en esa sesión.
2. **Sin salida.** «Salir» (y el botón atrás → «Salir») dejaba a la persona en los ejemplos, en el modo entrenamiento, sin un botón para volver a lo suyo; al cerrar y reabrir, la app abría otra vez en el entrenamiento; la pausa, «¿Sigues donde te quedaste?», «Ver un ejemplo», el repaso y la pregunta ya respondida no tenían «Salir».

**¿Alguien pudo perder datos?** Sí: cualquiera que, **con sus datos**, haya entrado a «Aprender a usarla» (o «Aprende más») y tocado **«Cambiar»** y luego una versión, desde la **v2.5 (18 oct)** hasta la v2.6.3. Sus datos quedaron reemplazados por los de Rosa (o Ana). Desde la v2.6.4 la app lo reconoce al abrir y ayuda a recuperarlos (abajo).

### Qué se hizo

| | Ahora |
|---|---|
| **La causa** | Todo camino que muestra o carga un ejemplo pasa **antes** al modo entrenamiento, guardando primero tus datos tal como están: «Cambiar», elegir la versión, cada capítulo, la oferta de tarjetas, «Practicar», la prueba guiada y las herramientas de Victor (`?victor=1`). Además, en `arranque.js`, cargar una persona, un caso o lo guardado de los ejemplos cambia de modo solo si hacía falta; «Reiniciar ejemplos» y simular el tiempo no hacen nada sobre tus datos. Al entrar a tus datos, el entrenamiento, el ejercicio o la prueba que estuvieran abiertos se cierran (nada sigue vivo debajo). |
| **Candado** | `guardarUso` **nunca** escribe un estado de ejemplo en tus datos: si lo que hay en pantalla no es de persona «uso», no escribe nada, lo registra como error (en la consola y en `P.modos.errores`) y la app pasa a decir «Modo entrenamiento · datos de ejemplo» (arriba, «Mis datos» vuelve a lo tuyo). Al revés también: tus datos nunca se guardan como los ejemplos. Es la única escritura de tus datos además de restaurar una copia (que rechaza copias con datos de ejemplo) y de borrar. |
| **Recuperar** | Al abrir, si lo guardado como tus datos es en realidad un ejemplo (su persona es Rosa, Ana o Carlos, tiene la marca del recorrido o tiene el nombre **y** los movimientos de un ejemplo), **no se muestra como tuyo**: se aparta, sin borrarlo, en `pamplanea-uso:ejemplo-guardado`, y se abre **«Revisemos tus datos»**: con el respaldo de la migración, «Encontramos una copia de tus datos del [fecha]. ¿Recuperarla?» [Recuperar] [Empezar de nuevo]; con una «Guardar copia» descargada, «Guardaste una copia el [fecha]. Búscala en tu teléfono…» [Recuperar] (elegir el archivo) [Empezar de nuevo]; sin copia, lo explica con calma y ofrece «Empezar mi Primer día». Pregunta hasta que la persona elige (o vuelve a armar sus datos). Una persona de verdad llamada Ana, con sus propios movimientos, no se confunde. |
| **Salir del entrenamiento** | «Salir» está en **todas** las tarjetas del capítulo (también en la pausa, al retomar, en «Ver un ejemplo», en el repaso y con la pregunta ya respondida) y en «Hazlo tú». Si vienes de tus datos (o ya los usas), **te lleva a ellos**: «Volviste a tus datos. Tu avance del entrenamiento quedó guardado.» El botón atrás pregunta «¿Salir del entrenamiento? Vuelves a tus datos. Tu avance queda guardado para seguir después.» Sin datos propios, «Salir» deja los ejemplos como antes. |
| **Un toque desde los ejemplos** | Arriba, junto a «Ayuda», **«Mis datos»** (o **«Usar mis datos»** si todavía no los usas, que lleva a la bienvenida de «Usarla con mis datos»). Se ve con los ejemplos, durante la prueba guiada (la deja en pausa) y durante un ejercicio de «Practicar». En «Practicar» y en «Aprender a usarla», el botón dice «Volver a mis datos». |
| **Cerrar y reabrir** | La app abre donde la dejaste: a mitad del entrenamiento, en los ejemplos con «Sigue donde te quedaste» en Hoy y, arriba, **«Mis datos»** a un toque; tus datos intactos y el capítulo donde ibas («Ibas en el paso 2 de 6» → «¿Sigues donde te quedaste?»). Decisión técnica — REVISAR: no abre directo en tus datos para no sacar de la prueba guiada a quien la hace en un teléfono prestado (vería los datos del dueño). Solo si lo guardado como tus datos es un ejemplo (el error), abre en tus datos para recuperarlos. |
| **La pausa** | Sigue esperando «Entendido» para avanzar (nada avanza solo, v2.5); ahora también tiene «Salir», como todas las tarjetas. |

### Caminos probados (`herramientas/v264.mjs`)

Con datos propios («Marta»), desde cada camino: de vuelta en **tus datos** con un toque, **intactos** (en pantalla y guardados), **sin ejemplos mezclados** y con el **avance guardado**:

- **0)** los 4 pasos exactos de Victor, comprobando después de cada paso que **lo guardado sigue siendo de Marta** (en la v2.6.3, después del paso 3, lo guardado ya era Rosa); también «Cambiar» → «Ahora no» y al reabrir.
- **R)** el candado (Rosa en pantalla «en uso» no se escribe y queda el error) y la recuperación: con respaldo («Recuperar» → tus datos), ya «renombrada» por la v2.6.3 con una copia descargada (elegir el archivo → «Sí, recuperar»), una copia con Rosa no se acepta, sin copia («Empezar mi Primer día») y una Ana de verdad que no se confunde.
- **A)** «Salir» en un paso (y retomar desde «Aprender a usarla»: «Ibas en el paso 2 de 6» → «Seguir»); **B)** «Salir» en «Hazlo tú» con Anotar abierta; **C)** el botón atrás → «Salir» (y el siguiente atrás sale de la app); **D)** la pausa y la pregunta (antes y después de responder); **E)** retomar, «Ver un ejemplo», el repaso y «Ahora no» al elegir la versión; **F)** cerrar y reabrir a mitad de un capítulo y de «Hazlo tú» con algo escrito (abre donde la dejaste; «Mis datos» → tus datos intactos); **G)** «Mis datos» arriba, «Ayuda» → «Usarla con mis datos» y la letra → «Usarla con mis datos»; **H)** la prueba guiada («Mis datos» la pausa; atrás → «Pausar» → «Mis datos»); **I)** «Practicar» («Mis datos» durante el ejercicio; «Salir» → «Volver a mis datos»); **J)** ida y vuelta dos veces por cuatro caminos (Ayuda, la letra con atrás, la oferta de tarjetas, «Mis datos»); **K)** nada se mezcla (ni ejemplos en tus datos ni tus datos en los ejemplos; con «Hazlo tú» abierto y cambio a tus datos, anotar no despierta al entrenamiento); **L)** sin datos propios: «Salir» deja los ejemplos y «Usar mis datos» lleva a la bienvenida; reabrir sigue en el entrenamiento; en la guía de escritorio nada cambia.
- En la v2.6.3 la prueba falla en todos los caminos de salida salvo «Ayuda» y la letra (que ya llevaban a tus datos, pero a dos toques y sin decirlo).
- **`herramientas/recuperar-v263.mjs`:** la v2.6.3 tal como se publicó, servida como en Pages: con los datos de Marta se hacen los 4 pasos y Rosa queda guardada como sus datos (y, al reabrir, con persona «uso»); se publica la v2.6.4 en el mismo lugar, «Actualizar», y la app no muestra a Rosa como suya, abre «Revisemos tus datos» con la copia descargada, aparta a Rosa sin borrarla y, al elegir la copia, vuelven sus datos.

### Calidad

- Toda la batería por file:// (27 pruebas, también `v25.mjs`) y servida en la subruta de Pages (19), sin fallos ni errores de consola. `herramientas/actualizar.mjs --ref=7f48ead`: datos reales, «Lo esencial» a medias, un capítulo hecho, un ejercicio y la prueba guiada en pausa sobreviven al actualizar desde la v2.6.3, también sin internet.
- Al correr la batería, `qa-v261.mjs` mostró 2 fallos (H-01 y H-02) que su código de salida escondía: sus «datos reales» eran los de Ana tal cual y la v2.6.4, con razón, los reconoció como ejemplo. Ahora usan el nombre de una persona («Marta») y la prueba termina con error si un caso falla.
- Capturas de lo nuevo a 390 × 844 (Serena claro y Ancla oscuro) y a 320: «Mis datos» arriba, la pausa con «Salir», de vuelta en tus datos, «Usar mis datos» y los tres casos de «Revisemos tus datos». A 320, el texto de arriba y los dos botones caben sin tocarse.

### Pendientes y límites

- Una «Guardar copia» descargada no se puede abrir sola: la app dice la fecha y el nombre del archivo, y la persona lo elige.
- El respaldo de la migración solo existe en teléfonos que tenían datos antes de la v2.3 (17 oct); lo anotado después no está ahí.
- Si alguien anotó cosas encima de los datos de Rosa antes de esta versión, quedaron en lo apartado (`pamplanea-uso:ejemplo-guardado`): no se pierden, pero recuperarlas es a mano (Victor).

---

## Prototipo v2.6.3 (2026-10-19): QA profundo, fase 3 — formularios, cuadros y consistencia

**Por qué:** V2-65 («que mantenga mucha consistencia y que use los mejores y mas ideales formularios de UX y UI, para que se vea bien bien bonita la app y facil de usar»), V2-66 (los cuadros) y la revisión general del lenguaje de V2-75. Con la libertad de V2-71 y sus tres límites: la lógica del dinero no cambió, nadie pierde datos ni progreso (probado desde la v2.5, la v2.6, la v2.6.1 y la v2.6.2) y las pantallas principales siguen donde estaban.

### Auditoría de diseño: lo que estaba distinto y cómo quedó (un patrón por tipo de elemento)

| Inconsistencia | Dónde | Cómo quedó |
|---|---|---|
| El botón principal decía «Guardar» para todo | Anotar y casi todos los formularios | Dice la acción: «Guardar gasto», «Guardar ingreso», «Marcar pagado», «Guardar recordatorio», «Cuadrar», «Guardar pago», «Agregar deuda», «Agregar tarjeta», «Agregar lugar», «Agregar medio», «Pasar», «Guardar meta», «Guardar descuento», «Guardar estado de cuenta». En Anotar cambia mientras escribes («súper 25» → «Guardar gasto»; «vendí 45» → «Guardar ingreso») |
| «Tengo $___» y «Tengo (cuadre)» no se entendían | Anotar | **«Cuadrar»** (el atajo y el tipo), el dato se llama «Tienes ahora» y la pregunta es concreta: **«¿Cuánto tienes ahora en Efectivo?»** («Más o menos. Desde aquí sigue la cuenta.») |
| «tengo 50 efectivo» igual preguntaba «¿Dónde?» | Anotar (el intérprete) | Lo entiende: Efectivo. Una pregunta menos |
| Etiquetas que no eran pregunta («Nombre») | Tarjeta o préstamo, ingreso esperado, lugar, medio, meta | **«¿Cómo se llama?»** |
| Montos sin formato | Todos los campos de dinero | Al salir del campo: «1234.5» → **«1,234.50»**; al volver, el número simple para seguir escribiendo; se guarda igual |
| «Ej. 25.00» como ejemplo de un límite de crédito | Tarjeta | «Ej. 1,000.00» |
| «+ Pago» con dos cuadros y una lista suelta | Pagos | Cuatro cuadros iguales (V2-66, abajo) |
| «Ej. Colegio» dentro de «Facturas de servicios» | + Pago | «Ej. Luz» |
| El «−» de los pagos solo en el calendario | Pagos → Mis pagos e ingresos y tarjetas | También ahí (V2-73) |
| El enlace «Completar tu Primer día…» se salía por la derecha | Mi dinero → Deudas | «Completar tu Primer día» |
| A 320 de ancho, el botón principal se partía en dos líneas | Pie de todas las hojas | Le toca más espacio que «Cancelar» (2 : 3) a menos de 360 de ancho |
| «Hola, Ana» con los datos de ejemplo | Hoy en el entrenamiento | «Hola» (el nombre de la persona de ejemplo solo donde el entrenamiento lo usa) |
| «¿En qué se te fue?» | Mes | «Lo que entró y lo que gastaste» y «¿En qué gastaste?» (V2-75) |

Lo que ya era un solo patrón y se revisó: errores junto al campo con ícono y texto (nunca solo color), confirmaciones de eliminar dentro de la hoja, «Deshacer» en los avisos, 44 px, foco y Escape, y el mismo diálogo para descartar o salir (v2.6.1).

### Formularios de primer nivel (V2-65)

- **Etiqueta visible en forma de pregunta**, nunca reemplazada por el ejemplo: «¿Qué pagas?», «¿Cuánto pagas?», «¿Cómo se llama?», «¿Cuánto tienes ahora en Efectivo?», «¿Cuánto recibes más o menos?», «¿Qué día la pagas?».
- **Montos:** «$» dentro del campo, `inputmode="decimal"`, coma o punto («1,000.50», «1000,50», «1.000,50», «.5»), formato al salir, tope de $1,000,000.00 con su mensaje (v2.6.1).
- **Errores en línea**, junto al campo, en español simple y sin culpa («Ponle un nombre», «Escribe el monto», «Escribe cuánto tienes, aunque sea $0»).
- **El botón principal** siempre visible en el pie de la hoja (sobre el teclado: la hoja se ajusta al alto visible) y **con la acción**.
- **Cuadros en vez de listas** cuando hay pocas opciones (V2-66), valores por defecto que ya estaban (hoy, el medio de siempre, la suscripción en tu primera tarjeta) y **ninguna pregunta que la app ya sabe** («tengo 50 efectivo»).

### Clasificación en cuadros (V2-66)

- **«+ Pago»:** cuatro cuadros del mismo estilo: **«Cuota de un préstamo»** (abre el mismo formulario de Deudas), **«Suscripción»**, **«Facturas de servicios»** (luz, agua, internet, teléfono, cable: «¿Cuál factura?») y **«Otro pago»** (alquiler, colegio, cuchubal u otro, con nombre libre). Un toque clasifica (categoría y emoji); elegir una factura marca su cuadro.
- **Primer día:** los gastos fijos en los mismos grupos: Facturas de servicios, Casa y familia, Suscripciones (v2.6.2).
- **La categoría «Servicios» se llama «Facturas de servicios»** (en Anotar, Mes y el desglose), igual que su cuadro. Mismo id (`servicios`): lo anotado por la familia se ve igual, con el nombre nuevo; motor y esquema sin cambios.

### Mirada de project manager (una quincena real, desde el Primer día)

- **La promesa en 10 segundos:** al terminar el Primer día, «Tu primer número» lo dice en una frase («Es lo que puedes gastar hasta tu quincena del 30 sin tocar tus pagos, tus deudas ni tus tarjetas»); Hoy abre con ese número, hasta cuándo y cuánto por día.
- **Una acción principal por pantalla:** Hoy → (+) Anotar; Pagos → «+ Pago»; Mi dinero → sus tres puertas; Mes → tocar algo para corregirlo; cada formulario → su botón con la acción.
- **Después de cada acción:** el aviso breve con «Deshacer», el número cambia a la vista y el botón dijo qué iba a pasar.
- Lo que pediría cambios de flujo más grandes queda en las decisiones pendientes.

### Guía de lenguaje (completa)

| Antes | Ahora | Dónde | Por qué |
|---|---|---|---|
| «entra ~$600» / «Entra $X» | «ingreso ~$600» / «Ingresos $X» | Hoy, Pagos | V2-75: «te entra» suena mal |
| «Lo que te pagan» / «te entra» | «Tus ingresos» / «ingresos» | Pagos → Mis pagos e ingresos | V2-75 |
| «¿Ya te cayó?», «Sí, me cayó», «No me cayó», «¿Cuánto te cayó?», «¿Dónde cayó?» | «¿Ya llegó?», «Sí, ya llegó», «No llegó», «¿Cuánto te llegó?», «¿Dónde llegó?» | Hoy, avisos, confirmar un ingreso, Anotar, Reparte, Pongámonos al día | V2-75: sin «te cae» |
| «te caen ~$90», «cuando te caiga», «cae en» | «recibes ~$90», «cuando llegue», «llega a» | Avisos, Hoy, Pagos | V2-75 |
| «Cómo te entra el dinero» / «Me entra cuando vendo o trabajo» | «Cómo recibes tu dinero» / «Lo recibo cuando vendo o trabajo» | Tu cuenta, entrenamiento | V2-75 |
| «Cupo» / «Te quedan $X de cupo» | «Límite de crédito» / «Disponible $X de $Y» | Tarjeta, Deudas, desglose | V2-75 |
| «Total» / «Mínimo» (al agregar tarjeta) | «Pago de contado» / «Pago mínimo» | Tarjeta | Un término por concepto |
| «¿Cuándo es tu turno?» / «¿Cuánto te toca?» | «¿Cuándo te toca recibir?» / «¿Cuánto recibes ese día?» | Cuchubal | V2-75 |
| «$12.00» (un pago) | «−$12.00» con «Pago»; «+$600.00» con «Ingreso» | Pagos, Hoy | V2-73 |
| «Tengo $___» / «Tengo (cuadre)» | «Cuadrar» | Anotar | V2-65 (el ejemplo obligatorio) |
| «¿Cuánto?» (en un cuadre) / «Monto» | «¿Cuánto tienes ahora en Efectivo?» / «Tienes ahora» | Anotar | V2-65 |
| «Nombre» | «¿Cómo se llama?» | Formularios | V2-65: la etiqueta es una pregunta |
| «Guardar» | La acción («Guardar gasto», «Agregar tarjeta», «Marcar pagado»…) | Todos los formularios | V2-65 |
| «Servicios» (categoría) | «Facturas de servicios» | Anotar, Mes, + Pago | V2-66: el mismo nombre que su cuadro |
| «¿En qué se te fue?» | «Lo que entró y lo que gastaste» / «¿En qué gastaste?» | Mes y su consejo | V2-75 |
| «Hola, Ana» (con los ejemplos) | «Hola» | Hoy en el entrenamiento | Nombres de ejemplo solo donde el entrenamiento los necesita |
| «Tienes $100 y antes de tu quincena pagas $40…» | El ejemplo con los números de la pantalla (o sin números) | Entrenamiento, «?», glosario | V2-76 |

Revisión con `herramientas/v262.mjs` (parte F: ninguna pantalla dice «te entra», «te cae» ni «cupo») y con una sonda de 28 pantallas y hojas que busca, además, «apartado», «periodo», «saldo inicial», «ajuste», «conciliación», «asignación», «proyección» e inglés («ok», «email», «check», «tips», «login»…): sin hallazgos. Las frases del entrenamiento, el glosario y los consejos siguen en 20 palabras o menos y sin «quincena» para quien no tiene un ingreso fijo (`v24.mjs`, `v25.mjs`).

### Verificación visual

- **Antes y después lado a lado:** `capturas/v263/index.html` (se abre con doble clic; ruta completa: `C:\laragon\www\pamplanea-prototipo\capturas\v263\index.html`): 66 pares con los mismos datos (Ana, 21 de octubre): 21 pantallas a 390 × 844 en Serena claro y Ancla oscuro, y las 12 con formularios también a 320 de ancho. Generado por `herramientas/capturas-v263.mjs`.
- **Dos rondas de autocrítica** mirando las capturas: la primera encontró el ejemplo «Ej. Colegio» en las facturas, el botón partido a 320, el enlace que se salía y el «−» que faltaba en la lista de Pagos; la segunda, «¿En qué se te fue?» en Mes. Corregido todo.
- **Contraste ≥ 4.5:1 en los 4 temas** (medido): v2.5 5.27:1, v2.6 5.69:1, las marcas de ingreso y pago de Pagos (v262 D) y `contraste.mjs`.
- `herramientas/v263.mjs`: A) los botones con su acción (también mientras escribes), «¿Cuánto tienes ahora en Efectivo?», el atajo «Cuadrar», formato al salir y al volver, errores junto al campo; B) los cuatro cuadros, las facturas de servicios y «Otro pago», y que un toque clasifica; C) a 320 de ancho, nada se sale de las hojas de formulario y el botón principal se ve completo.

### DECISIONES PENDIENTES PARA VICTOR (fase 3)

1. **Hoy tiene muchas tarjetas** (el número, la próxima quincena, los avisos, los próximos pagos y lo último anotado). *Recomendación:* no reordenar antes de la prueba con la QA; después, con lo que la gente mira de verdad, decidir qué se pliega. *Tradeoff:* hoy se ve todo junto, a cambio de una pantalla larga.
2. **El calendario de Pagos es una línea de tiempo por día**, no una cuadrícula del mes. *Recomendación:* mantenerla (cada día ya separa lo que entra y lo que sale, con marcas). *Tradeoff:* no hay vista del mes de un vistazo.
3. Las de las fases 1 y 2 siguen abiertas (compras a cuotas, cargo automático, gastos que salieron de un ahorro).

### Limitaciones conocidas (fase 3)

- Las capturas son de Chrome sin ventana a 390 y 320 de ancho, no de un teléfono real: el teclado del teléfono y la rotación no se pueden ver ahí.
- El formato al salir del campo usa el formato de Estados Unidos (1,234.50), igual que el resto de la app.

---

## Prototipo v2.6.2 (2026-10-19): QA profundo, fase 2 — deudas, tarjetas y Primer día

**Por qué:** el feedback de Pam (V2-68: «I struggled un poco con agregar otra deuda»), la revisión de deudas, tarjetas y duplicados (V2-70), y lo que Victor vio en Pagos y en el entrenamiento (V2-73, V2-75, V2-77, V2-78). Las decisiones, con su frase literal, están en la sección v2.6.1.

### El Primer día nuevo (V2-68)

Cinco pasos, en el orden aprobado, con «Paso N de 5» y su barra:

1. **¿Cómo te pagan?** (rápido: sin tu ingreso no hay número libre).
2. **¿Cuánto tienes ahora y dónde?** (tu primer cuadre; es el único que no se salta).
3. **Tus deudas:** préstamo, casa comercial, crédito de vivienda u «Otra deuda». Cada una con «¿Cómo se llama?», «¿Cuánto pagas de cuota?», «¿Qué día la pagas?» y «¿Cuánto debes en total? (opcional)». Después de agregar una, **«Agregar otra deuda»** queda a la vista; cada deuda agregada se **edita** (lápiz) o se **quita** (x) sin salir del paso. «No tengo deudas» si no hay.
4. **Tus tarjetas de crédito:** el banco, **«¿Cuánto debes hoy?»** (opcional), el **día de corte** (si no lo sabes, vacío) y el **día de pago**, y **«¿Cuánto pagas normalmente?»** (opcional: se aparta de tu libre hasta tu estado de cuenta, V2-54). **«Agregar otra tarjeta»**, editar y quitar igual que las deudas. «El límite de crédito nunca suma a tu libre: es dinero prestado.»
5. **Tus gastos fijos**, en cuadros: **Facturas de servicios** (luz, agua, internet, teléfono, cable), **Casa y familia** (alquiler, colegio, cuchubal) y **Suscripciones**. En cada uno: **«¿Se cobra solo en una tarjeta o cuenta?»** con «No, lo pago yo» y tus tarjetas y cuentas («En Crédito BAC», «En Banco Agrícola»…). Una suscripción, por defecto, en tu primera tarjeta (V2-47). El cuchubal pregunta «¿Cuándo te toca recibir?» (opcional) y «¿Cuánto recibes ese día?».

Al final, **«Tu primer número»** con su frase: «Es lo que puedes gastar hasta tu quincena del 30 sin tocar tus pagos, tus deudas ni tus tarjetas.» Lo que queda escrito en un formulario abierto se agrega al tocar «Siguiente» (si falta algo, lo dice junto al campo y no avanza).

- **Retomable:** si se cierra la app a mitad, vuelve al mismo paso con lo agregado (se guarda con tus datos).
- **Quien ya lo pasó no lo vuelve a ver a la fuerza:** en «Ayuda» (con tus datos) y en Mi dinero → Deudas está **«Completar tu Primer día»**: solo deudas, tarjetas y gastos fijos («Paso 1 de 3»), que **se suman** a lo que ya tienes (tus lugares e ingresos no se tocan; los nombres de tarjeta no se repiten: «Crédito BAC 2») y se pueden **deshacer** («Agregamos 3 cosas a tu cuenta · Deshacer»).
- Ya no pregunta «¿Con qué pagas?»: el débito sale de cada banco, las tarjetas de su paso y las transferencias se agregan en Mi dinero → Cuentas si hacen falta.
- Lo que se crea, sin duplicados ni huérfanos: cada deuda es UN pago mensual con su saldo opcional (`tipoDeuda`, `deuda.debe`; V2-08); cada tarjeta, una tarjeta de crédito con su medio, su pago estimado (`pagoUsual`) y lo que debes hoy **«por confirmar»** (`debeInicial`: se ve en Deudas y en «Debes en total», nunca toca el libre); cada gasto que se cobra solo queda con ese medio y la marca «Se cobra solo en …» (`automatico`), y cuenta una sola vez al marcarlo «Pagado» (C-03, C-04); el turno del cuchubal es un ingreso esperado de una vez, ligado al cuchubal.

### Deudas y tarjetas en Mi dinero (V2-78, V2-75)

- **Una tarjeta agregada después** (Mi dinero → Deudas → «Agregar otra deuda o tarjeta») también pregunta, si todavía no tienes estado de cuenta, **«¿Cuánto pagas normalmente?»** y **«¿Cuánto debes hoy?»**: su pago estimado aparece en Pagos y se aparta del libre; lo que debes queda «por confirmar». **Cuando anotas el estado de cuenta, el estimado se reemplaza: no se suma** (probado). El corte y el pago siguen las reglas de V2-43 (nada de antes de empezar) y V2-57.
- **«Límite de crédito»** (en el formulario) y **«Disponible $1,210.00 de $1,500.00»** (en Deudas y en la ficha), en vez de «cupo». En el formulario, el estado de cuenta usa los mismos nombres que su hoja: «Pago de contado» y «Pago mínimo».
- El botón de Deudas dice «Agregar una deuda o tarjeta» / **«Agregar otra deuda o tarjeta»**.

### Pagos: qué suma y qué resta (V2-73)

- Cada fila del calendario dice **«Ingreso»** (flecha hacia abajo: entra) o **«Pago»** (flecha hacia arriba: sale), con texto: nunca solo color.
- Los montos: **un ingreso que llegó «+$600.00»**, **un pago «−$12.00»**; un estimado sigue sin signo («~$600», «~$35»), por el acuerdo de la v2.3 («nunca mostrar «+~$597»; un estimado se escribe «~$597»»): lo que dice si suma o resta es la etiqueta. El mismo «−» en los pagos de Hoy.
- **Cada día lleva su marca:** «+ Ingreso», «− Pago» o «− 2 pagos» (o las dos). En un mismo día, lo que entra va primero. Contraste de las marcas ≥ 4.5:1 en los 4 temas (medido).
- El calendario de Pagos es una línea de tiempo por día: todo lo de cada día ya está a la vista, separado (no hace falta tocar un día).
- «Mis pagos e ingresos»: «Al mes, más o menos: ingresos ~$X · pagos ~$Y»; la sección se llama **«Tus ingresos»**; «llega a Banco Agrícola».

### El cuchubal (V2-75)

La ficha del cuchubal dice **«Tu turno de recibir: 20 de noviembre · $400.00»** y «Aportas $25.00 cada viernes. Tu turno suma a tu libre el día que llega.» Si no tiene turno (lo guardado antes), dice «¿Cuándo te toca recibir?» con **«Anotar mi turno»** (fecha y cuánto recibes), sin romper nada. «+ Pago» → Cuchubal pregunta «¿Cuándo te toca recibir?» y lo liga al cuchubal.

### El entrenamiento, coherente (V2-69, V2-77)

- **V2-69 #36:** sin «Seguir mirando los ejemplos» al final de cada capítulo. **#37:** «Practicar» sin los dos ejercicios de Carlos (16 ejercicios).
- **V2-77, capítulo «Tarjetas y estado de cuenta»** (4 pasos, dentro de la estructura aprobada en la v2.5: capítulos de 2 a 4): «Tu número incluye la tarjeta» («Tu libre de $300 ya tiene restados $245 de tu tarjeta, que vence el 5 de noviembre.»), anotar una compra con tarjeta (la pausa dice que baja tu libre aunque la pagues después), **«El disponible no es tu dinero»** («Disponible $1,210 de $1,500: es prestado, nunca suma a tu libre.») y **«Estado de cuenta, corte y pago»** («Estado de cuenta: cuánto pagar. Corte: cierra tus compras. Pago: tu último día.» · «Corta el 15 y se paga el 5: pago de contado $245, mínimo $25.»). El paso «Esto es Deudas» salió de este capítulo (Deudas sigue explicada en su «?»). Todos con los números de la pantalla (`numeros-entrenamiento.mjs`).
- «Practicar» → «Primer día» y la tarea de la prueba guiada siguen el orden nuevo.

### Guía de lenguaje (fase 2: Pagos, calendario, tarjetas y cuchubal)

| Antes | Ahora | Dónde | Por qué |
|---|---|---|---|
| «entra ~$600» / «Entra $X» | «ingreso ~$600» / «Ingresos $X» | Hoy (próxima quincena), Pagos (resúmenes) | V2-75: «te entra» suena mal |
| «te entra» / «Lo que te pagan» | «ingresos» / «Tus ingresos» | Pagos → Mis pagos e ingresos | V2-75 |
| «¿Ya te cayó?», «Sí, me cayó», «No me cayó», «¿Cuánto te cayó?» | «¿Ya llegó?», «Sí, ya llegó», «No llegó», «¿Cuánto te llegó?» | Hoy, avisos, confirmar un ingreso, Reparte, Pongámonos al día | V2-75: sin «te cae» |
| «te caen ~$90», «cuando te caiga» | «recibes ~$90», «cuando llegue» | Avisos de la próxima quincena, Hoy | V2-75 |
| «cae en Banco Agrícola» | «llega a Banco Agrícola» | Pagos → ingresos | V2-75 |
| «Cómo te entra el dinero» / «Me entra cuando vendo o trabajo» | «Cómo recibes tu dinero» / «Lo recibo cuando vendo o trabajo» | Tu cuenta, entrenamiento | V2-75 |
| «Cupo» / «Te quedan $X de cupo» | «Límite de crédito» / «Disponible $X de $Y» | Formulario de tarjeta, Deudas, ficha, desglose | V2-75: «cupo» no se entiende |
| «Total» / «Mínimo» (al agregar tarjeta) | «Pago de contado» / «Pago mínimo» | Formulario de tarjeta | Un término por concepto (como en el estado de cuenta) |
| «¿Cuándo es tu turno?» / «¿Cuánto te toca?» | «¿Cuándo te toca recibir?» / «¿Cuánto recibes ese día?» | Cuchubal (+ Pago, Primer día, su ficha) | V2-75 |
| «$12.00» (pago) | «−$12.00» con «Pago»; «+$600.00» con «Ingreso» | Pagos, Hoy | V2-73 |

La revisión general del lenguaje (el resto de la app, el entrenamiento y el glosario) sigue en la fase 3.

### Calidad (v2.6.2)

- **Nueva:** `herramientas/v262.mjs`: A) el Primer día completo a mano (tres deudas seguidas, editar y quitar, dos tarjetas con validación del día, gastos que se cobran solos, cuchubal con turno), retomar al recargar y lo que se crea; B) «Completar tu Primer día» (suma sin tocar lugares ni ingresos, «Deshacer»); C) una tarjeta después con su pago estimado (baja el libre lo mismo) que su estado de cuenta reemplaza; D) Pagos con «Ingreso»/«Pago», signos, marcas por día y **contraste ≥ 4.5:1 en los 4 temas**; E) el turno del cuchubal; F) ninguna pantalla dice «te entra», «te cae» ni «cupo».
- **Actualizadas** por las decisiones (no por fallos): las pruebas que recorren el Primer día (un paso más: `v24`, `v241`, `v25`, `v231`, `aceptacion-v23`, `recorrer-v2`, `recorrer-sets`, `recorrer-modos`, `entrega2-v23` —que ya no espera las transferencias del Primer día—, `capturas-ux`), las que esperaban «entra»/«te cae»/«cupo» o los ejercicios de Carlos y la de «Seguir mirando los ejemplos».
- **Resultados:** por file://, todas las de `herramientas/` (motor, los 13 casos en los 2 temas, sets, modos, la guía en Chrome y Edge, aceptación, v2.3.1, entrega 2, viaje, humo, v2.4, v2.4.1, v2.5 con contraste mínimo 5.27:1, v2.6 con 5.69:1, qa-v261 44/44, atras, numeros-entrenamiento con 0 montos que no se ven, v261, v262, PWA, contraste y teclado) sin fallos ni errores de consola; **servidas** en la subruta de Pages (v262, qa-v261, atras, v261, numeros-entrenamiento, v26 en Serena oscuro y Ancla oscuro, v25, sets, modos, 13 casos, aceptación, v2.3.1, v2.4.1, v2.4, entrega 2, viaje y humo): sin fallos. **Actualizar** desde la v2.5 (`7c0d06e`), la v2.6 (`ca97256`) y la v2.6.1 (`ddded80`): mismas claves, tus datos idénticos, el progreso y la prueba guiada iguales, y sin internet (`actualizar.mjs`). Para eso, el Primer día a medias se guarda con tus datos solo mientras está a medias (quien ya lo pasó no recibe ningún campo nuevo).

### DECISIONES PENDIENTES PARA VICTOR (fase 2)

1. **Compras a cuotas en una tarjeta (V2-78).** Los acuerdos de cuotas (V2-08) hablan de préstamos, no de tarjetas. *Recomendación:* que «¿Cuánto pagas normalmente?» las incluya hasta el primer estado de cuenta (así ya cuentan) y, después, que cada estado de cuenta las traiga en su total, como hoy. *Tradeoff:* la app no sabe cuándo termina cada compra a cuotas ni avisa la última.
2. **Gasto que se cobra solo (V2-68).** Hoy queda con su medio y la marca «Se cobra solo en …», pero la persona igual toca «Pagado» (V2-43: no se inventa lo que no pasó). *Recomendación:* para los que se cobran en una tarjeta, marcarlos solos como compra de esa tarjeta el día que vencen (se puede desmarcar); para los de una cuenta, seguir preguntando. *Tradeoff:* si el cobro falló (tarjeta rechazada), el número cuenta algo que no pasó hasta que la persona lo corrige.
3. **Corregir el monto de un gasto que salió de un ahorro** (B-AP3) y **eliminar el gasto de un ahorro ya cumplido** (B-AP4): siguen como en la fase 1.

### Limitaciones conocidas (fase 2)

- «Completar tu Primer día» agrega; lo que ya tenías se edita donde siempre (Mi dinero, Pagos).
- Lo que debes hoy de una tarjeta sin estado de cuenta es informativo: no cambia el libre (el libre cuenta lo que pagas normalmente).

---

## Prototipo v2.6.1 (2026-10-19): QA profundo, fase 1 — fallos graves, botón atrás, iPhone y entrenamiento

**Por qué:** mañana prueba la app una project manager y QA senior con experiencia en empresas de Estados Unidos (usa iPhone), como usuaria y como QA. Victor pidió una revisión total en tres fases, cada una publicada antes de seguir: **v2.6.1** (los fallos graves, el botón atrás, la instalación en iPhone y que el entrenamiento diga los números que se ven), **v2.6.2** (deudas, tarjetas, el Primer día nuevo y el lenguaje de Pagos) y **v2.6.3** (pulido de UI/UX y formularios). La prueba familiar sigue: los datos reales y el progreso del entrenamiento sobreviven a cada actualización (probado desde la v2.5 y la v2.6).

### Decisiones V2-64 a V2-78 (APROBADAS por Victor, 2026-10-19)

- **V2-64 — QA profundo.** «me gustaria que hicieramos una revision total, completa y profunda a la experiencia de la app, no solo visual pero de acciones en general, como editar cosas, como eliminar cosas y que se puede o no eliminar o como afecta»
- **V2-65 — UI/UX de primer nivel.** «que a pesar que es prototipo, que mantenga mucha consistencia y que use los mejores y mas ideales formularios de UX y UI, para que se vea bien bien bonita la app y facil de usar»
- **V2-66 — Clasificación en cuadros.** «me encanta los cuadros que clasifican cuota de prestamo y suscripcion, facturas de servicios deberian estar en un cuadro asi y otro cuadro para otros o no se, siento que clasifica mas facil categorias y subcategorias» → cuadro «Facturas de servicios» (luz, agua, internet, teléfono, cable…) con el estilo de «Cuota de préstamo» y «Suscripción», y «Otro» como último recurso. *(Fase 3.)*
- **V2-67 — Reiniciar la prueba guiada.** «tampoco puedo reiniciar la PRUEBA GUIADA» → «Empezar de nuevo» con la confirmación «Se borra tu avance de la prueba. Tus datos no se tocan.»; la app vuelve a elegir el set sola, sin letras. *(Hecho en esta versión.)*
- **V2-68 — Primer día guiado por deudas y tarjetas (feedback de Pam).** «Siento que al momento de set up todo te debe guiar a primero setear todas tus deudas. De ahí, lo que debes al momento de las tarjetas de crédito, junto con sus fechas de corte y próxima fecha de pago. De ahí, gastos fijos y consultar si estos gastos fijos son automáticos en una tarjeta. Porque ahorita I struggled un poco con agregar otra deuda» → orden: 1) el ingreso, rápido; 2) TODAS las deudas, con «Agregar otra deuda» visible; 3) las tarjetas de crédito: cuánto debes hoy, corte y próxima fecha de pago; 4) los gastos fijos, preguntando si se cobran solos en una tarjeta o cuenta y cuál. Todo saltable y retomable; al final, el número libre con una frase que lo explique. *(Fase 2.)*
- **V2-69 — Respuestas a las preguntas 36–39 de la v2.6.** 36) quitar «Seguir mirando los ejemplos» al final de cada capítulo; 37) quitar de «Practicar» los dos ejercicios de Carlos; 38) «Instalar» como fila propia en «Ayuda», visible solo si la app no está instalada, y se quita de «Tus datos»; 39) seguir tapando todo número en «Cuéntale…», por privacidad. *(La 38 se adelantó a esta versión porque es parte de instalar en iPhone; la 39 ya era así; la 36 y la 37, fase 2.)*
- **V2-70 — Deudas, tarjetas y duplicados.** «revisa bien lo de ingresar pagos o cosas asi que afecten tarjetas que no se ingresen pagos o ingreson que dupliquen cosas o que en verdad pertenezcan a otro tipo de ingreso o pago con tarjeta no se, o pagos recurrentes que son hechos con tarjetas o cuentas especificas»
- **V2-71 — Libertad para dejarla al 100 %.** «esta en la libertad de hacer lo cambios necesarios para que ui, ux, qa backend y todo eso, pase al 100%» → cualquier cambio de UI, UX, formularios, textos, navegación y flujos pequeños o medianos, registrado aquí, con tres límites: 1) la lógica del dinero no cambia salvo para corregir un bug contra los acuerdos; 2) nadie pierde datos ni progreso; 3) no se quitan ni se mueven las pantallas principales (Hoy, Pagos, Anotar, Mi dinero, Mes) ni se rehace el entrenamiento completo.
- **V2-72 — Botón atrás y gestos nativos.** «se puede activar que sirva con los botones nativos del telefono? es decir los gestos o no se como se llaman, boton atras nativo del telefono» *(Hecho en esta versión.)*
- **V2-73 — Pagos, calendario: ingreso o pago.** «en la seccion pagos, en la vista calendario, no se diferencia visualmente o cuesta, que es ingreso y que es pago, o sea, que va restar y que va sumar» → signo «+» / «−», ícono y etiqueta («Ingreso» / «Pago», por V2-75), color de los tokens pero nunca solo color, marcas en los días y lo que entra y sale separado al tocar un día. *(Fase 2.)*
- **V2-74 — La mejor instalación en iPhone.** «que investigue muy muy bien las opciones y pasos ideales para instalacion en iphone, para mejor experiencia, que la qa senior usa iphone» *(Hecho en esta versión.)*
- **V2-75 — Lenguaje simple pero profesional.** «"te entra" suena mal, si se trata de usar lenguaje simple, pero tampoco que la app no luzca proefsional […] me gustaria que se revise el lenguaje en general, que no sea tampoco tan basico pero tampoco tan mega profesional» → de tú, cálido, claro y profesional; sin «te entra» ni «te cae»; «Cupo» → «Límite de crédito» / «Disponible»; el turno del cuchubal visible; una tabla «Guía de lenguaje». *(Fase 2 para Pagos, calendario, tarjetas y cuchubal; fase 3 para todo lo demás. Los textos del glosario que se reescribieron en esta versión ya siguen este registro.)*
- **V2-76 — El entrenamiento debe coincidir con lo que se ve.** «el ejemplo que usa visualmente, no hace match con el ejemplo descrito abajo, por ejemplo me muestra 400 libre, 44 por dia, y el ejemplo abajo describe, ejemplo tienes 100 y antes de tu quincena pagas 40, te quedan 60, que lo que vaya mostrando de ejemplo en entrenamiento haga sentido» *(Hecho en esta versión.)*
- **V2-77 — Tarjetas en el entrenamiento.** «no entiendo el ejemplo de tarjeta y estado de cuenta, entonces el disponible en mi tarjeta cuenta?» *(Fase 2; esta versión ya cambia el ejemplo del primer paso del capítulo por el número de la pantalla: «Tu libre de $300 ya tiene restados $245 de tu tarjeta, que vence el 5 de noviembre».)*
- **V2-78 — Pago de la tarjeta antes del primer estado de cuenta.** «tarjeta no me da configurar un pago potencial o algo o cuota hasta que venga el estado de cuenta, antes no lo habilita» *(Fase 2.)*

### Matriz de QA (resumen)

La matriz completa, con ID, caso, pasos, resultado esperado según el acuerdo, prioridad, estado y prueba, está en [`herramientas/MATRIZ-QA.md`](herramientas/MATRIZ-QA.md). `herramientas/qa-v261.mjs` hace cada caso de A a F, H y L **con el código real de la app** (las mismas hojas y acciones que toca la persona) y, después de cada acción, revisa las invariantes: nada huérfano, nada contado dos veces, el libre nunca negativo y los números enteros. Contra la v2.6 publicada fallaban **19 de 44** casos (`capturas/qa-v261/antes-v2.6.txt`); en la v2.6.1 pasan los 44.

| Área | Casos | Pasaban | Corregidos | Para las fases 2–3 o decisión de Victor |
|---|---|---|---|---|
| A · crear, editar, eliminar y deshacer | 11 | 9 | 2 (A-D2, A-D3) | — |
| B · dependencias y cascadas | 14 | 2 | 10 (B-L1, B-L2, B-L3, B-M1, B-T1, B-I1, B-P2, B-P3, B-AP1, B-AP2) | 2 decisiones (B-AP3, B-AP4) |
| C · duplicados y tipos (V2-70) | 12 | 8 | 2 (C-07b, C-10) | 2 decisiones (C-06 cuotas de tarjeta, C-11 cargo automático: fase 2) |
| D · números | 4 | 2 | 2 (D-01, D-04 = V2-76) | — |
| E · fechas | 3 | 3 | — | — |
| F · validaciones | 3 | 1 | 2 (F-02, F-03) | — |
| G · navegación (V2-72) | 11 | 1 | 9 | 1 (G-11 teclado y rotación en un teléfono real) |
| H · persistencia | 6 | 3 | 3 (H-01, H-02, H-06) | — |
| I · modos y entrenamiento | 4 | 3 | 1 (I-04 = V2-76) | — |
| J · prueba guiada y «Cuéntale…» | 3 | 2 | 1 (J-02 = V2-67) | — |
| K · responsive y accesibilidad | 5 | 4 | — | 1 (K-05: 320, 360, 430 y zoom, fase 3) |
| L · rendimiento | 1 | 1 | — | — |
| M · consola | 2 | 2 | — | — |

### Los fallos corregidos (P1 = 7, P2 = 10, P3 = 2)

Cada uno tiene su caso en `herramientas/qa-v261.mjs`, que falla con la v2.6 y pasa con la v2.6.1 (salvo donde se dice otra prueba).

| ID | Prio. | Qué pasaba | Qué se hizo |
|---|---|---|---|
| B-L1 | P1 | Al eliminar un lugar, sus pagos e ingresos quedaban apuntando a un lugar que ya no existía. | Antes de eliminar, la hoja dice qué depende de él («“Luz”, “Agua” e “Internet” se pagan ahora con:» / «… se reciben ahora en:») con la mejor opción ya elegida; al confirmar, todo pasa ahí. |
| B-L2 | P1 | Después, «Pagado» de un pago que salía de ese lugar no restaba el dinero de ningún lado: desaparecía. | Igual que B-L1: el pago ya sale del medio nuevo. |
| B-L3 | P1 | Después, «¿Ya te cayó?» de un ingreso que caía ahí rompía «Reparte». | Igual que B-L1: el ingreso ya cae en el lugar nuevo. |
| B-T1 | P1 | Al eliminar una tarjeta, la suscripción que se cobraba en ella quedaba sin medio. | Pregunta con qué se paga ahora (primero otra tarjeta de crédito, si hay). |
| B-I1 | P1 | Al eliminar el ingreso principal, lo que pagabas «con la del 30» dejaba de contar (bug del motor contra V2-34 y la revisión v2.3). | `claveVigente`: sin ingreso principal, el pago vuelve a contar con lo que tienes. |
| B-P2 | P1 | Cambiar el día de un pago ya pagado este mes lo volvía a pedir y lo contaba dos veces. | Al editar un pago o un préstamo, lo ya marcado (pagado, saltado o asignado) se mueve a la fecha nueva más cercana del mismo mes (`P.reubicarHechos`). |
| H-01 | P1 | Con dos pestañas abiertas, lo que guardabas en una se perdía por la otra. | La otra pestaña se entera (evento `storage`), no escribe encima, carga lo nuevo y avisa «Se actualizó con lo que guardaste en otra pestaña». |
| B-M1 | P2 | Al eliminar un medio (Transferencia), Colegio y Casa comercial quedaban sin medio. | Pregunta con qué se pagan ahora. |
| A-D2 | P2 | «Anotar cuánto debo» en una deuda sin monto se rompía. | Abre vacía y guarda. |
| A-D3 | P2 | Desmarcar «Pagado» de una cuota devolvía a «lo que debes» más de lo que había bajado. | Se guarda cuánto bajó de verdad (`bajaDeuda`) y eso vuelve exacto; también al corregir el monto y con los descuentos del salario (V2-38). |
| B-AP1 | P2 | Eliminar en Mes un gasto que salió de un ahorro no devolvía el dinero al ahorro. | Lo devuelve (si el ahorro existe) y su historial dice «Volvió de un gasto que eliminaste». |
| B-AP2 | P2 | Eliminar un gasto con crédito que salió de un ahorro dejaba reservado el dinero para la tarjeta (V2-27). | Se suelta esa reserva. |
| B-P3 | P2 | «Saltar esta vez» y luego cambiar el día volvía a pedir el pago. | Igual que B-P2. |
| D-01 | P2 | «.5» y «1.000,50» no se leían como montos. | Se leen ($0.50 y $1,000.50). |
| F-03 | P2 | Dos toques seguidos en «Guardar» de Anotar podían romper. | El segundo toque no hace nada. |
| H-02 | P2 | Si el teléfono no dejaba guardar (lleno o modo privado), se perdía todo en silencio. | Tarjeta en Hoy: «No se están guardando tus datos» con «Guardar una copia». |
| C-10 | P2 | Un adelanto que esperabas («Vale de la empresa») no se reconocía por su nombre al anotar «me dieron adelanto 100»: la expresión de la v2.4.1 tenía caracteres de retroceso en vez de `\b`. | Corregida. |
| C-07b | P3 | Anotar «luz 35» con la luz del mes ya pagada lo guardaba como gasto sin decir nada. | Anotar avisa: «Ya marcaste el pago «Luz» del 12 oct. Esto se guarda como un gasto aparte.» |
| F-02 | P3 | Un monto de más de $1,000,000 decía «Escribe el monto». | Dice «Puede ser de hasta $1,000,000.00». |

Además: el historial de «Deshacer» guarda como máximo 30 pasos (antes crecía sin límite) y la barra de estado del teléfono recibía un color en formato `color(srgb …)` que puede no entender: ahora va en hexadecimal (V2-74).

### Reglas de no duplicar que se verificaron (V2-70)

| Regla | Acuerdo de origen | Caso |
|---|---|---|
| Una compra con tarjeta baja el libre el día que se hace, no toca efectivo ni banco, sube lo que debes y es un solo gasto. | V2-07 | C-01 |
| Pagar la tarjeta desde el banco es mover dinero: baja el banco y la deuda; no es un gasto nuevo y el libre no cambia. | Conexión de tarjetas (pagar la tarjeta = mover dinero) | C-02 |
| Una suscripción que se cobra en la tarjeta cuenta una vez y queda como compra en esa tarjeta, no del banco. | V2-13, V2-34 | C-03 |
| Un pago con la débito de una cuenta sale de esa cuenta y de ninguna otra. | V2-18 (los medios cuelgan de los lugares) | C-04 |
| Una cuota es un pago: sale del medio elegido, baja lo que debes y cuenta una vez. | V2-08 | C-05, A-D3 |
| Anotar algo que ya es un pago de la lista lo marca, no lo duplica; si ya estaba pagado, lo dice. | Conexión 4 («Nada se cuenta dos veces») | C-07, C-07b |
| Cada ingreso con su tipo (venta, remesa, adelanto); mover entre lugares no es ingreso ni gasto. | V2-56 | C-08, C-10, A-MV1 |
| «me pagaron 600» pregunta si es la quincena o un extra y cuenta una vez. | V2-29 #10 | C-09 |
| «Pagado» con monto fijo guarda sin preguntar; corregir o desmarcar deshace sin restos. | V2-29 #8, V2-48 | A-P1, A-D4 |
| Eliminar o editar deshace sus efectos: el ahorro, la reserva de la tarjeta y lo que debes. | V2-27, V2-08 | A-R1, B-AP1, B-AP2 |

Lo que los acuerdos no cubren queda en las decisiones pendientes de abajo.

### V2-67: «Empezar de nuevo» la prueba guiada

En «Ayuda» → «Prueba guiada» (en la tarea en curso, en la pausa y en el final) hay un enlace **«Empezar de nuevo»**. Pide confirmar con el texto aprobado («¿Empezar de nuevo? Se borra tu avance de la prueba. Tus datos no se tocan.», con el foco en «Cancelar»). Al confirmar, se borra **solo** el avance de la prueba (tareas, tiempos y respuestas); el nombre y el perfil quedan escritos en la bienvenida y, al tocar «Empezar», la app vuelve a elegir el set sola (sin letras). Los datos reales quedan idénticos, byte por byte (`v261.mjs`, parte A).

### V2-72: el botón atrás del teléfono

`atras.js` (nuevo, sin dependencias) usa el historial del navegador: mientras haya algo a qué volver, deja **una sola** entrada de guarda (`history.pushState`); al tocar atrás (`popstate`), la app retrocede un paso y, si todavía queda algo, la vuelve a poner.

1. Cierra lo que esté abierto, de arriba hacia abajo: el diálogo, la hoja (o su «¿Eliminar…?»), el aviso de arriba, Ayuda (sus páginas vuelven a la anterior: «Tus datos» → «Ayuda» → cerrar).
2. Si no hay nada abierto: la pantalla anterior, después la pestaña Hoy.
3. **En Hoy sin nada abierto no hay guarda:** atrás hace lo de siempre en el teléfono (sale). Si se vuelve a Hoy con los botones de la app, la guarda sobrante se quita sola, para que el siguiente atrás no se quede sin hacer nada.
4. **Con algo escrito en una hoja**, pregunta «¿Descartar los cambios?» («Seguir editando», con el foco, o «Descartar»). Lo mismo al tocar fuera de la hoja. Escape, «Cancelar» y la X cierran sin preguntar, como antes (Escape en la computadora no cambia, V2-50). Un solo patrón de diálogo para la app (abajo, al alcance del pulgar, el botón seguro a la izquierda).
5. **Entrenamiento:** atrás retrocede un paso («Hazlo tú» → su explicación; con una hoja abierta, primero la hoja); en el primer paso, la presentación o el final pregunta «¿Salir del entrenamiento?» (el avance queda guardado). **Prueba guiada** (y «Practicar»): con la tarea en curso pregunta «¿Pausar la prueba?» («¿Salir del ejercicio?»). **Primer día:** el paso anterior.

Escape, Tab y el foco siguen igual en la computadora (el diálogo atrapa el foco y Escape lo cierra). Al recargar, la app arranca en Hoy y quita la guarda que haya quedado. En la guía de escritorio (la app dentro de un marco) no se toca el historial. Prueba: `herramientas/atras.mjs`, que simula el atrás del sistema con `history.back()` (la misma navegación del historial); con la v2.6, atrás desde Pagos sacaba de la app (`capturas/atras/antes-v2.6.txt`).

**Cómo funciona en cada teléfono (sin afirmar lo que no se probó):**
- **Android, en Chrome y con la app instalada:** el botón y el gesto de atrás del sistema navegan el historial de la página, que es justo lo que usa la app. Se comprobó en Chrome de escritorio (el mismo motor) con la prueba automática; **no se probó en un Android real.**
- **iPhone, en Safari:** el gesto de deslizar desde el borde izquierdo y la flecha de Safari usan el mismo historial; **no se probó en un iPhone real.**
- **iPhone, instalada en la pantalla de inicio:** no hay barra del navegador. **No se pudo comprobar** si iOS ofrece ahí el gesto de volver; si no lo hace, la app se usa con sus propios botones como hasta ahora (nada se rompe).

### V2-74: instalar en iPhone

**Lo que se verificó en fuentes oficiales (Apple y WebKit):**
- Se instala desde Safari: botón **Compartir** → **«Agregar a pantalla de inicio»** ([WebKit, «Web Push for Web Apps on iOS and iPadOS», 16-feb-2023](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). Desde iOS 16.4, **otros navegadores de iPhone pueden ofrecerlo**, si lo implementan (mismo artículo).
- **iOS 26:** todo sitio agregado a la pantalla de inicio **abre como app web por defecto**, con un interruptor **«Open as Web App»** en la hoja de agregar; los íconos SVG funcionan ([WebKit, «News from WWDC25: Safari 26 beta», 9-jun-2025](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)).
- **Safari sí puede borrar los datos:** borra todo lo que una página guardó (LocalStorage incluido, que es donde viven tus datos) **después de 7 días de uso de Safari sin abrir esa página**; las apps de la pantalla de inicio llevan su propia cuenta de días, que se reinicia al usarlas, y «no esperamos que se borren los datos» de la app instalada ([WebKit, «Full Third-Party Cookie Blocking and More», 24-mar-2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)). Desde Safari 17 (iOS 17) los datos son «de mejor esfuerzo» y se pueden borrar por falta de espacio o por no usar el sitio; `navigator.storage.persist()` se concede según señales «como si el sitio está abierto como app de la pantalla de inicio» ([WebKit, «Updates to Storage Policy», 10-ago-2023](https://webkit.org/blog/14403/updates-to-storage-policy/)). **Conclusión: el riesgo es real; instalarla lo evita.**
- La app instalada en iPhone **no comparte lo guardado con Safari** («por diseño», comentario de 2022 en el [bug 181849 de WebKit](https://bugs.webkit.org/show_bug.cgi?id=181849)): lo anotado en Safari no aparece en la app instalada.
- En Chrome (Android) `persist()` se concede solo, sin preguntar, según el uso del sitio y si está instalada ([web.dev, «Persistent storage»](https://web.dev/articles/persistent-storage)).
- Etiquetas para iPhone: `apple-mobile-web-app-capable`, el estilo de la barra de estado y el `apple-touch-icon` de 180 × 180 ([Apple, «Configuring Web Applications», archivo de documentación](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)). La misma página dice que, sin imagen de arranque, iOS muestra la última vista de la app mientras abre.

**No se pudo comprobar en un iPhone real:** el nombre exacto de los botones en español en la versión de iOS que tenga ella (en iOS 26 el interruptor se llama «Open as Web App» en inglés; en español la app dice «Abrir como app web»), dónde queda Compartir en su Safari (en iOS 26 puede estar dentro de **⋯**), si WhatsApp abre el enlace en Safari o en su propio visor, si Chrome de iPhone muestra «Agregar a pantalla de inicio» en su versión, ni si iOS concede `persist()`.

**Lo que cambió:**
- **La guía de instalación** (en «Ayuda» → **«Instalar la app»**, fila propia que solo aparece si no está instalada —V2-69 #38—, y en «Antes de empezar» de «Usarla con mis datos») detecta el teléfono:
  - **iPhone con Safari:** 1) «Toca **Compartir**: el cuadro con la flecha, en la barra de Safari. Si no lo ves, toca **⋯** primero.» 2) «Baja en la lista y toca **«Agregar a pantalla de inicio»**.» 3) «Si ves **«Abrir como app web»**, déjalo encendido. Toca **«Agregar»**.» 4) «Abre PamPlanea desde su ícono en tu pantalla de inicio.» Cada paso con su dibujo. Debajo, en ámbar: **«Instálala para que tus datos no se borren.** Safari puede borrar los datos de una página que no abres en varios días.» y, si ya hay datos, cómo pasarlos (guardar una copia en «Tus datos» y restaurarla en la app instalada).
  - **iPhone desde WhatsApp u otro navegador:** «En iPhone se instala desde Safari», «busca «Abrir en Safari» (a veces está en ⋯)» o copiar el enlace (botón «Copiar el enlace»).
  - **Instalada:** «Ya la tienes instalada.» y la fila de «Ayuda» desaparece. Android y computadora, como antes.
- **Etiquetas:** `apple-touch-icon` con `sizes="180x180"` (el archivo mide 180 × 180 de verdad), `theme-color` para claro y oscuro desde el primer cuadro (después siguen el tema elegido, en hexadecimal), y lo que ya estaba: `apple-mobile-web-app-capable`, título «PamPlanea», barra de estado `default` (el contenido no queda debajo de la hora), `viewport-fit=cover` con los márgenes seguros (`env(safe-area-inset-*)`) para notch y Dynamic Island. **Sin pantallas de arranque:** iOS pide una imagen por cada tamaño de iPhone y, sin ellas, muestra la última vista de la app: no vale la pena en un prototipo.
- **`navigator.storage.persist()`:** con datos reales, una vez por sesión, la app pide al navegador que no los borre solo. No muestra nada si no se concede (Firefox sí pregunta).
- **«Tus datos»** ya no tiene «Instálala en tu teléfono» (V2-69 #38).

Prueba: `herramientas/v261.mjs`, parte B (las etiquetas, el tamaño real del ícono, la guía con el navegador de iPhone emulado —Safari y Chrome—, instalada, la fila de «Ayuda» y `persist()` una vez).

**Los pasos exactos para ella (iPhone):** abrir el enlace en **Safari** (si llega por WhatsApp y no abre en Safari: «Abrir en Safari» o copiar y pegar el enlace) → Compartir (si no está a la vista, **⋯** → Compartir) → «Agregar a pantalla de inicio» → dejar encendido «Abrir como app web» si aparece → «Agregar» → **abrir PamPlanea desde el ícono** y empezar ahí.

### V2-76: los números del entrenamiento son los de la pantalla

Antes, cada paso mostraba el ejemplo fijo del glosario («Tienes $100 y antes de tu quincena pagas $40: te quedan $60») mientras la pantalla decía $400. Ahora:
- **Cada ejemplo de un paso se calcula con el motor** a partir de los datos que se ven en ese momento: «Tu libre es $400 hasta tu quincena del 30: son ~$44 por día.»; «Tienes $1,315, $900 están en ahorros y pagas $15 antes del 30: te quedan $400.»; «Compraste pupusas por $6: escribes «pupusas 6» y tu libre de $400 baja $6.»; «Pagas el teléfono de $15: tu libre sigue en $394 y lo que tienes baja $15.»; «La app cree que tienes $19 en efectivo. Si cuentas $15, $4 quedan «sin detalle».»; «En tu quincena del 30 recibes ~$600 y pagas ~$55: te quedarían ~$545.»; «Tu libre de $300 ya tiene restados $245 de tu tarjeta, que vence el 5 de noviembre.»; «Tu estado de cuenta dice pago de contado $245 y mínimo $25: tú eliges cuánto pagas.»… Lo mismo en la versión de ingresos que varían (Rosa: $80, ~$7.20 por día, la cuota de $45 el 25, el alquiler de $120…). En la semana mala, el texto dice el faltante que se ve («Faltan $30.00 para cubrir tus ahorros»).
- **Las preguntas del final de cada capítulo ya no inventan montos:** «¿Qué es tu libre?» (Todo lo que tienes / **Lo que tienes, menos ahorros y lo que pagas antes de tu quincena** / Lo que te pagan en tu quincena), «Ves «~» antes de un monto. ¿Qué quiere decir?», «Compras algo con tu tarjeta de crédito. ¿Cuándo baja tu libre?»…
- **Los «?» y el glosario de «Aprende» no llevan montos** (sirven para cualquier pantalla y para los datos de cada persona): «La app resta de lo que tienes lo que pagas antes de tu quincena. Lo que queda es tu libre.»
- **«Practicar»:** los montos de cada ejercicio están en los datos del ejercicio o son lo que el ejercicio pide escribir (`montos` en `casos.js`).

Prueba: `herramientas/numeros-entrenamiento.mjs` recorre **cada paso, «Hazlo tú», pausa, pregunta y final de las dos versiones**, los ejemplos de la semana mala, el glosario y los 18 ejercicios de «Practicar» (317 textos) y compara cada monto del texto con los que se ven en la pantalla en ese momento (en la pausa, también sus filas antes → después y la diferencia; en «Hazlo tú», lo que el paso pide escribir). Con la v2.6: **88 textos con montos que no se veían** (`capturas/numeros-entrenamiento/antes-v2.6.txt`); con la v2.6.1: 0.

### `herramientas/` ahora está en el repo

Todas las pruebas, también las de antes, se pueden revisar en GitHub. No se publican en la caché de la app (`generar-sw.mjs` deja fuera `herramientas/` y `capturas/`; `capturas/` sigue fuera de git). Nuevas en esta versión: `qa-v261.mjs` (la matriz A–F, H, L con invariantes), `MATRIZ-QA.md`, `atras.mjs` (V2-72), `numeros-entrenamiento.mjs` (V2-76), `v261.mjs` (V2-67, V2-74) y `actualizar.mjs` (antes `v26-actualizar.mjs`; ahora para cualquier versión: `--ref=7c0d06e` es la v2.5 y `--ref=ca97256` la v2.6). Cómo correrlas, en el README.

### Calidad (v2.6.1)

- **Nuevas:** `qa-v261.mjs` 44/44 (con la v2.6: 25/44), `atras.mjs` sin fallos (con la v2.6: atrás desde Pagos sacaba de la app), `numeros-entrenamiento.mjs` 317 textos y 0 montos que no se ven (con la v2.6: 88), `v261.mjs` sin fallos, `actualizar.mjs --ref=7c0d06e` (v2.5 → v2.6.1) y `--ref=ca97256` (v2.6 → v2.6.1): mismas claves, tus datos iguales (esquema 2), el progreso, la prueba guiada y el teléfono iguales, el mismo libre, solo la caché `pamplanea-proto-v2.6.1-2026-10-19` y **sin internet** también.
- **Las de siempre, por file://:** motor, los 13 casos de la guía, sets A y B, la guía en Chrome y Edge, modos, aceptación, v2.3.1, entrega 2, viaje del dinero, humo (las dos), v2.4, v2.4.1, v2.5 (contraste mínimo 5.27:1), v2.6 (contraste mínimo 5.69:1), PWA, contraste (las tres) y teclado: sin fallos ni errores de consola. Se actualizaron, porque las decisiones nuevas cambian lo que esperaban: `v26.mjs` («Instalar la app» es fila propia en «Ayuda» y en la letra, ya no en «Tus datos», V2-69 #38; la versión se lee de `casos.js`), `v25.mjs` (el ejemplo de cada paso se compara con el que el paso calcula, V2-76), `recorrer-v2.mjs` (la versión de la guía = la de la app) y `contraste-v21.mjs` e `instalar-ua.mjs` (abren con `?set=A`: desde la v2.6 la bienvenida de la prueba solo se abre sola con el enlace de tester; fallaban desde entonces). `recorrer.mjs` (el recorrido de la v1) queda como historia: sus casos esperan cosas que acuerdos posteriores cambiaron.
- **Servidas en la subruta de Pages:** qa-v261 (44/44), atras, v261, numeros-entrenamiento, v26 (Serena oscuro y Ancla oscuro), v25 (Serena oscuro), sets (Serena oscuro), modos (Ancla oscuro), 13 casos (Serena oscuro), aceptación y v2.3.1 (Ancla oscuro), v2.4.1 (Serena oscuro), v2.4 (Ancla oscuro), entrega 2, viaje y humo: sin fallos ni errores de consola.
- La app instalable: caché `pamplanea-proto-v2.6.1-2026-10-19` con 142 archivos (uno más: `atras.js`; `herramientas/` no entra).

### DECISIONES PENDIENTES PARA VICTOR (fase 1)

1. **Cuotas de tarjeta (compras a cuotas, «tasa cero»).** Hoy cada estado de cuenta trae su total y nada más. *Recomendación:* tratarlas en la fase 2 junto con V2-78 como «pago estimado» de la tarjeta (sin modelar cada cuota), porque los acuerdos de cuotas (V2-08) hablan de préstamos, no de tarjetas. *Tradeoff:* sin cuota por cuota, la app no avisa cuándo termina una compra a cuotas.
2. **Gasto fijo que se cobra solo en una tarjeta (cargo automático).** Hoy cuenta una vez cuando se marca «Pagado» con esa tarjeta (C-03). V2-68 pide preguntarlo en el Primer día. *Recomendación:* en la fase 2, preguntar «¿Se cobra solo en una tarjeta o cuenta? ¿Cuál?» y guardarlo como el medio del pago (que ya decide de dónde sale); NO marcarlo pagado solo el día que vence (V2-43: no inventar). *Tradeoff:* la persona sigue tocando «Pagado».
3. **Corregir el monto de un gasto que salió de un ahorro** no ajusta el ahorro (B-AP3). *Recomendación:* que el ahorro devuelva o entregue la diferencia, sin pasar de lo que tiene. *Tradeoff:* un ajuste más que explicar en «Corregir».
4. **Eliminar el gasto de un ahorro ya cumplido (logro)** no reabre el ahorro (B-AP4). *Recomendación:* reabrirlo con el dinero devuelto. *Tradeoff:* el logro desaparece de «Logros».

### Limitaciones conocidas (fase 1)

- El botón atrás se probó con `history.back()` en Chrome sin ventana, no en teléfonos reales (ver arriba lo de iPhone instalada).
- La guía de iPhone se probó con el navegador de iPhone **emulado** (Chrome con su identificador), no en un iPhone.
- `navigator.storage.persist()` se llama, pero en Chrome sin ventana no se puede comprobar si un teléfono lo concede.
- G-11 (teclado del teléfono y rotación) y K-05 (320, 360, 430 y zoom 200 %) quedan para la verificación visual de la fase 3.

---

## Prototipo v2.6 (2026-10-19): simplificar para la prueba familiar

**Por qué:** la familia de Victor prueba la v2.5 (commit `7c0d06e`) del lunes 19 al viernes 23. El prototipo estaba congelado salvo fallos que impidan usarlo; Victor decidió que la confusión de las personas nuevas con los casos de Ana y Carlos entra en esa excepción. Esta versión solo simplifica lo que ve la persona: la guía de la computadora, el motor, los datos y «Aprender a usarla» siguen igual.

### Decisiones V2-60 a V2-63 (APROBADAS por Victor, 2026-10-19)

- **V2-60.** «los nuevos usuarios se estan confundiendo bastanet en la app prototipo con los casos de carlos y ana, quiero que solo este la opcion de "usar con mis datos" y la de aprender a usarla y la prubea guiada»
- **V2-61.** «vamos con opcion 1» → la prueba guiada sin letras; la app asigna el set sola.
- **V2-62.** «lo de contarle a victor como me va, me gusta, que sea un poco mas claro, que les iag que al final de la prueba compartan esto con victor o con pam, que diga cuenta a victor o pam como vas y que exactamente esta recopilando esto» y, sobre el recordatorio del viernes: «nop no me gusta, mejor sin recordatorio». → SIN recordatorio de ningún tipo: ni notificación, ni evento de calendario, ni tarjeta por fecha.
- **V2-63.** «quitemos los modos ana y carlos y esos casos de uso» → en el entrenamiento SÍ se conservan los datos de ejemplo (confirmado por Victor).

### Cómo quedó

| Decisión | Cómo quedó |
| --- | --- |
| **V2-60** · solo tres opciones | «Casos y ayuda» pasa a **«Ayuda»** (el mismo botón arriba a la derecha, en los dos modos). Adentro, y en la sección de modo de tu letra, la persona ve solo: **«Usarla con mis datos»** (con tus datos dice «Estás aquí»), **«Aprender a usarla»**, **«Prueba guiada»**, **«Cuéntale a Victor o a Pam cómo vas»**, **«Tus datos»**, la apariencia y la versión. Se esconden: los 13 casos, explorar con Ana, Carlos o Rosa, «Ir al modo entrenamiento» (y el «Aprender a usarla» de tu letra que llevaba ahí), «Practicar» como opción aparte (sigue dentro de «Aprender a usarla»; también salió de la pantalla «Aprende»), «Mis notas», «Reiniciar ejemplos», «Borrar todo, también mis notas», el enlace a la guía, el selector de sets y el Modo moderador. La bienvenida de la primera vez sigue con «Aprender a usarla» y «Usarla con mis datos». |
| **V2-60** · herramientas de Victor | Solo con el enlace **`?victor=1`** (`…/pamplanea-prototipo/?victor=1`; en pantalla angosta `index.html` lo pasa a `telefono.html`). En «Ayuda», debajo de lo de la persona, **«Herramientas de Victor (enlace ?victor=1)»**: el caso actual con sus pasos y simulaciones, «Mis notas», los 13 casos, explorar con Ana, Carlos o Rosa, «Datos de los ejemplos» («Reiniciar ejemplos», «Borrar todo, también mis notas», la guía completa) y «Prueba guiada: sets A y B» con el **Modo moderador** (elegir el set, el resumen con la letra del set, «Nueva persona»). Con tus datos, solo un aviso con «Ir a los ejemplos». `?set=A` y `?set=B` siguen llevando directo a la prueba con ese set. La guía de la computadora no cambió (solo la versión al pie). |
| **V2-61** · prueba guiada sin letras | Un solo botón, **«Prueba guiada»** (en «Ayuda» y en tu letra). La app asigna el set sola con la lógica de siempre (el enlace `?set=`; si no, el que eligió el moderador; si no, alterna en ese teléfono: 1.ª persona A, 2.ª B…). La persona **nunca ve «Set A» ni «Set B»**: ni en la bienvenida, ni en las tareas, ni en «Ayuda» («Prueba guiada · tarea 2 de 7»), ni en el texto que manda. Al empezar, dos líneas: **«Te pongo tareas cortas para ver si la app se entiende. No es un examen para ti: es para la app.»** y «Usas datos de ejemplo, no los tuyos. Son unos 15 minutos.»; sigue «Sobre ti (opcional)». **El set B ya no tiene C33** («Carlos sin dinero suficiente», «Ahora eres otra persona: Carlos»): son 6 tareas (5 + «Qué entendiste»); el set A sigue con 7. |
| **V2-62** · «Cuéntale a Victor o a Pam cómo vas» | Se llama así en todas partes (botón de «Ayuda», tu letra, el título de la pantalla, «¿Cómo te ha ido?», README). Al abrir: «Al final de la prueba, mándale esto a Victor o a Pam. Tú eliges a quién: toca «Compartir» y elige su chat, o «Copiar» y pégalo.»; luego, **antes del texto, dos listas**: **«Esto se manda»** (sale de las mismas partes que arman el texto: ver abajo) y **«Esto NO se manda»**: «Montos» y «Nombres de tus cuentas, pagos, ahorros, tarjetas y préstamos» («Si escribes alguno en lo que cuentas, lo tapo: sale [monto] o [nombre].»). Después tu nombre, «¿Algo más que quieras contarle?» y el texto completo «tal como se manda», con «Compartir», «Copiar» y «Seleccionar todo». Si hiciste la prueba guiada, **el texto la trae** (sin letra de set). **Al terminar la prueba**, la tarjeta **«Cuéntale a Victor o a Pam cómo te fue»** («Lo que hiciste en la prueba. Tú eliges a quién se lo mandas.») con el botón **«Ver qué se manda»** lleva a esa pantalla. **Sin recordatorios:** ni notificación, ni calendario, ni tarjeta por fecha (comprobado del lunes 19 al viernes 30). |
| **V2-63** · sin Ana ni Carlos como modos | Ninguna pantalla de la persona ofrece elegir ni explorar a Ana o a Carlos. «Aprender a usarla» conserva sus datos de ejemplo internos y los presenta como **datos de ejemplo**: la intro de «Lo esencial» dice «Con datos de ejemplo de alguien que cobra por quincena. Si cobras por mes o semana, es igual.» (variable: «… de alguien que vende pupusas y recibe una remesa de su hijo.») y el panel dice «Tu versión: fecha fija» (sin «con Ana»). Dónde siguen apareciendo nombres de ejemplo: abajo. |

### «Esto se manda»: las partes del texto (lo que el código arma hoy)

Cada parte trae su frase de la lista y sus líneas del texto (`partesContar` en `modos.js`; la prueba guiada, `partesPrueba` en `ayuda.js`). La lista solo muestra las partes que van; las condicionales salen cuando hay algo.

| Parte (frase de la lista) | Línea(s) del texto | ¿Siempre? |
| --- | --- | --- |
| La versión de la app | `PamPlanea · Prototipo v2.6 · 2026-10-19 · cómo me va` | sí |
| Tu nombre o apodo (el que escribas abajo) | `Nombre: …` (el de «Cuéntale…»; si no, el de la prueba; si no, el del primer día) | sí |
| Qué días la abriste con tus datos (del primero al último) y cuántos fueron | `Fechas: del 19 oct 2026 al 23 oct 2026 · abrí la app 3 días` (o «todavía no la uso con mis datos») | sí |
| Si la instalaste y qué hiciste en «Aprender a usarla» | `Instalada: sí/no · Entrenamiento: …, N ejemplos practicados` | sí |
| Cuántas veces anotaste, marcaste «Pagado», cuadraste y usaste «Reparte» y «Pongámonos al día» | `Lo que hice: …` | sí |
| Las 5 pantallas que más abriste (solo cuáles, como «Hoy» o «Pagos») | `Pantallas que más usé: Hoy (9) · …` | sí |
| Cuántas veces la app no te entendió al anotar (no lo que escribiste) | `Veces que la app no me entendió al anotar: N` | sí |
| Tus respuestas a «¿Cómo te ha ido?» | `Cómo me ha ido:` + una línea por respuesta (comentarios tapados) | si respondió |
| De tu prueba guiada: si pudiste instalarla al empezar, cada tarea (si la lograste, el tiempo, los toques, qué tan fácil fue, lo que te confundió y las pantallas que abriste) y tus respuestas del final | `Prueba guiada: la terminé el … · instalarla al empezar: …`, una línea por tarea (+ «Me confundió» tapado y «Pantallas»), `Al final, con mis palabras:` (tapado) | si la hizo (o la dejó a medias con alguna tarea) |
| Lo que contestaste en «Sobre ti»: cómo te pagan, dónde tienes tu dinero, si usas tarjeta y cómo llevas tus cuentas | `Sobre mí: me pagan … · mi dinero: … · tarjeta de crédito: … · llevo mis cuentas: …` | si contestó algo |
| Lo que escribas en «¿Algo más que quieras contarle?», si escribes algo | `Algo más: …` (tapado) | si escribe |

**No van:** montos ni nombres de sus cosas (lo que la persona escribe pasa por el tapado), lo que anota (qué compró, a quién pagó), las notas de Victor ni la letra del set. El set se reconoce por la primera tarea: **«Primer día» = set A**, **«Anotar un gasto» = set B**.

### Dónde siguen apareciendo nombres de ejemplo (V2-63)

Recorrí con una sonda cada momento de los 12 capítulos de «Aprender a usarla» (intro, cada paso, cada «Hazlo tú» con su instrucción y su pausa, la pregunta, el final y «Seguir mirando los ejemplos»), cada tarea de la prueba guiada y cada ejercicio de «Practicar», buscando «Ana», «Rosa», «Carlos» y «Josué» en lo que está a la vista.

| Dónde | ¿Qué nombre se ve? |
| --- | --- |
| **Las tarjetas de «Aprender a usarla»** (lo que se lee: títulos, «para qué», ejemplos, pausas, preguntas, finales) | **Ninguno**, salvo una instrucción: «El próximo mes y la remesa» (ingresos que varían), paso 3, «Hazlo tú»: **«Toca «Remesa de Josué».»** (es el nombre del ingreso en los ejemplos). |
| **La pantalla de atrás en «Aprender a usarla»** (a veces oscurecida) | Arriba de Hoy, **«Hola, Ana»** (fecha fija) o **«Hola, Rosa»** (ingresos que varían) y la letra **A** o **R**, en los pasos que muestran Hoy. Fecha fija: «Lo esencial» intro y pasos 1–4 (con los «Hazlo tú» y pausas de 3 y 4); «Próxima quincena» pasos 1–3; «Tarjetas» pasos 1–2; «Volver después de días» pasos 1–2; y el final de todos. Variable: «Lo esencial» intro y pasos 1–5; «¿Hasta cuándo?» pasos 1–3 y la pregunta; «El próximo mes y la remesa» todos sus pasos (y en Pagos, **«Remesa de Josué»**); «Ahorros y semanas malas» paso 3 y la pregunta; «Tarjetas» pasos 1–2; «Volver después de días» pasos 1–2; y el final de todos. |
| **Después de «Seguir mirando los ejemplos»**, «Ahora no» o «Salir» | Los ejemplos quedan abiertos: **«Hola, Ana»** (o Rosa) en Hoy y, en tu letra, **«Ana» y «Hogar de Ana»** («Tu cuenta», «Tu espacio»). |
| **La prueba guiada** | Ninguna tarea nombra a nadie (C33 salió). Todas menos «Primer día» empiezan en Hoy con los datos de Ana: arriba dice **«Hola, Ana»** (también en «Qué entendiste», que pide mirar Hoy). |
| **«Practicar»** (dentro de «Aprender a usarla») | **«Carlos: pago semanal y alquiler mensual»** (C20) y **«Carlos con poco dinero»** (C33) nombran a Carlos en el título y en el texto («Eres Carlos…») y muestran «Hola, Carlos»; **«Llegó la remesa»** dice «la remesa de Josué». Los demás muestran «Hola, Ana» o «Hola, Rosa» en Hoy. |
| **Herramientas de Victor** (`?victor=1`) | Sí, a propósito: «Explorar libre» con Ana, Carlos y Rosa y los 13 casos. |

### Calidad (v2.6)

- **`herramientas/v26.mjs`** (nueva; por file:// en Serena claro y servida en la subruta de Pages en Serena oscuro y Ancla oscuro, a 390 × 844):
  - **A · menús:** «Ayuda» y tu letra, en los dos modos, muestran exactamente los cinco (el de ahora con «Estás aquí»), los 4 temas y la versión; nada de casos, Ana, Carlos o Rosa, explorar, moderador, «set», «Practicar», «Ir al modo entrenamiento», «Reiniciar», «Mis notas» ni la guía. «Aprende» sin «Practicar»; «Aprender a usarla» con «Practicar» adentro y sin nombres; la intro de «Lo esencial» de las dos versiones con «datos de ejemplo». Con tus datos, «Aprender a usarla» abre sus capítulos y «Mejor primero aprender a usarla» empieza el entrenamiento.
  - **B · `?victor=1`:** lo de la persona igual y, abajo, los 13 casos, explorar (Ana, Carlos, Rosa), notas, «Reiniciar ejemplos» y el moderador (elegir el set: «La próxima persona en este teléfono hará el set B»); abrir un caso y reiniciar. Con tus datos, solo «Ir a los ejemplos», y las acciones de los casos no tocan tus datos. Sin `?victor=1`, nada. `index.html?victor=1` → `telefono.html?victor=1`. `?set=A` y `?set=B`: el set y el origen «enlace», sin letra a la vista.
  - **C · prueba guiada:** C33 fuera (set B: C05, C16, C32, C31, C26 y «Qué entendiste»: 6 tareas; ninguna tarea dice «Carlos»); la bienvenida con las dos líneas; la persona 1 recibe el set A (alternado) y hace las 7 tareas sin ver «set» en ningún momento (bienvenida, tarea, barra, respuesta, comprensión, «Ayuda» en curso, final y texto); la tarjeta del final lleva a «Cuéntale…» con la prueba (lo escrito, tapado); «Prueba guiada» ya hecha abre el final; la persona 2 («Nueva persona» con `?victor=1`) recibe el set B, «Tarea 1 de 6»; al pasar a tus datos la prueba queda en pausa y se retoma desde «Ayuda»; quien iba en la tarea 7 del set B viejo queda en «Tarea 6 de 6 · la última».
  - **D · las listas de «Cuéntale…»:** «Esto se manda» = las partes del texto, en el mismo orden; «Esto NO se manda» exacto; las dos listas antes del texto; el texto visible = el armado = la suma de sus partes; cada parte listada trae sus líneas en el texto; sin prueba ni respuestas, no se listan; «Algo más» aparece al escribir; las notas de Victor no van; el nombre se guarda (también desde el entrenamiento, sin tocar tus datos ni los ejemplos).
  - **E · privacidad:** con un nombre de 2 letras («BA»), sin tilde («agricola»), partes de nombres («Tigo», «Agrícola»), mayúsculas («VIAJE A LA PLAYA»), uno ya borrado («Cuchubal de la cuadra») y montos con y sin $ («600», «1,200.50», «$35.50»): ningún número ni nombre en lo que escribió la persona (comentarios, respuestas de la prueba, «Algo más»); ni «$» con número ni centavos en todo el texto; y la revisión de siempre (`recorrer-modos.mjs`), verde.
  - **F · sin recordatorios:** el código publicado no usa notificaciones, push ni calendario; Hoy del lunes 19 al viernes 30 no trae ninguna tarjeta para contarle a Victor o a Pam.
  - **G · «Tus datos»:** desde el entrenamiento sin datos («Todavía no usas tus datos», restaurar e instalar; no crea datos) y con datos (la copia lleva tus datos, no los ejemplos; borrar te deja en los ejemplos); instalar desde «Tus datos» en iPhone (Safari y Chrome) y Android (servida, con el botón «Instalar» de Chrome).
  - **H · accesibilidad:** 44 px en todo lo nuevo (el botón «Ayuda», por su área táctil); «Ayuda» se mueve sin «reducir movimiento» y queda quieta con él; **contraste ≥ 4.5:1 en los 4 temas (mínimo 5.69:1)** en 31 textos nuevos por tema. Sin errores de consola.
- **`herramientas/v26-actualizar.mjs`** (nueva): la v2.5 sacada de git (`7c0d06e`) servida en la subruta de Pages, con datos reales y algo anotado, el progreso de «Aprender a usarla» («Lo esencial» en el paso 4, «Ahorros» hecho, un ejercicio), una prueba guiada en pausa en el set B **justo en la tarea de Carlos**, una respuesta a «¿Cómo te ha ido?» y su nombre. El mismo puerto pasa a servir la v2.6: «Hay una versión nueva · Actualizar» → la v2.6 con su caché `pamplanea-proto-v2.6-2026-10-19` (y sin la de la v2.5); **las mismas claves guardadas, tus datos iguales (esquema 2, sin migración), el progreso igual, la prueba igual** y el mismo libre; «Aprender a usarla» dice «Ibas en el paso 4 de 6» y «1 de 5 hechos»; «Prueba guiada» sigue en la tarea 6 de 6; «Cuéntale…» trae su nombre, su respuesta y la prueba (sin Carlos ni letra); y **sin internet** abre la v2.6 con todo.
- **Las de siempre** (todas las de `herramientas/`), por file://: motor, los 13 casos de la guía, sets A y B, la guía en Chrome y Edge, modos (con la privacidad de siempre), aceptación (Victor: **Libre $95.00 · ~$7.90 por día**), v2.3.1, entrega 2, viaje del dinero, humo, v2.4, v2.4.1, **v2.5** (mínimo de contraste 5.27:1), PWA (actualizar sin perder datos), contraste (mínimo 4.94:1) y teclado. **Servidas** en la subruta de Pages: v26 (Serena oscuro y Ancla oscuro), v25 (Serena oscuro), sets (Serena oscuro), modos (Ancla oscuro), 13 casos (Serena oscuro), aceptación y v2.3.1 (Ancla oscuro), v2.4.1 (Serena oscuro), v2.4 (Ancla oscuro), entrega 2, viaje y humo. Sin fallos ni errores de consola. La app instalable: caché `pamplanea-proto-v2.6-2026-10-19` con los mismos 141 archivos.
- **Pruebas que cambié (solo lo que verificaba lo que se quitó):**
  - `recorrer-sets.mjs`: entra por «Ayuda» → «Prueba guiada» (V2-60, antes «Para Victor»); revisa la bienvenida nueva y que no diga «set» (V2-61); lee el resultado en «Cuéntale…» (V2-62) sin «Set: A/B» (V2-61) y en primera persona; el moderador con `?victor=1` (V2-60); sin la tarea de Carlos y «Tarea 1 de 6» por el enlace (V2-63).
  - `recorrer-modos.mjs`: la separación de modos ya no entra a explorar los ejemplos desde «Aprender a usarla» de tu letra (V2-60, «Ir al modo entrenamiento» escondido): abre sus capítulos → «Lo esencial» → «Ahora no».
  - `recorrer-v2.mjs`: «Reiniciar ejemplos» y «Mis notas» con `?victor=1` (V2-60). Además, la versión de la guía, que ya estaba vieja en la v2.5 («v2.4.1»), pasa a «Prototipo v2.6 · 2026-10-19» (la versión visible de esta ronda).
- **Ya fallaban en la v2.5, sin cambio** (corrí la v2.5 limpia, sacada de git, para compararlas): `contraste-v21.mjs` e `instalar-ua.mjs` (desde la v2.2) y `recorrer.mjs` (v1). `contraste.mjs` mide 25 colores en vez de 26 porque «Reiniciar ejemplos» ya no está en la «Ayuda» de la persona (mínimo igual, 4.94:1). `teclado.mjs` marca el botón «Ayuda» por su caja de 34 px, como en la v2.5.
- **Revisión visual:** miré las capturas nuevas a 390 × 844 en Serena claro (file://), en Serena oscuro y Ancla oscuro (servidas) y las de la actualización. De ahí salieron cinco arreglos: la lista de «Ayuda» se aplastaba cuando el panel tenía scroll (una tarjeta con overflow oculto dentro de la grilla); el título de «Cuéntale…» dejaba «vas» solo en la segunda línea; el chip «Sí» medía 42 px de ancho; la fila «Estás aquí» de tu letra tenía flecha; y la tarjeta del final repetía la misma frase en el título y el botón.

### Decisiones técnicas v2.6 — REVISAR

1. **«Instalar» ya no es una opción suelta** (la lista de V2-60 no la nombra): está en **«Tus datos» → «Instálala en tu teléfono» → «Ver cómo»** (instalar es para no perder los datos). La pantalla «Antes de empezar» y la prueba guiada la siguen ofreciendo como antes.
2. **La prueba guiada va dentro de «Cuéntale…»:** una sola cosa que mandar. El final de la prueba ya no trae su propio «Tu resumen»; la tarjeta lleva a «Cuéntale…». Las notas por caso (de Victor) no van. El resumen con la letra del set sigue en el Modo moderador (solo `?victor=1`).
3. **Tapado más estricto** (para que «Esto NO se manda» sea verdad): en lo que la persona escribe se tapa **cualquier número** (antes solo con $ o centavos: «me pagan 600» se colaba) y los nombres de sus cosas **sin importar mayúsculas ni tildes** («agricola»), **cada palabra de 3 letras o más de un nombre de varias** («Agrícola» de «Banco Agrícola») y **los nombres de 1 o 2 letras** como palabra suelta («BA»). Efecto: «el paso 3» sale «el paso [monto]»; mejor tapar de más.
4. **«Tú eliges a quién»** es eligiendo el chat al compartir (o dónde pegar): no hay un botón «para Victor / para Pam» (agregaría una línea más al texto).
5. **«¿Cómo te ha ido?»** (cada 3 días de uso, desde la v2.2) se queda: no es un recordatorio para mandar nada ni sale por fecha; solo guarda la respuesta. Ahora dice «Solo lo ven Victor o Pam si tú se lo mandas (sin montos).».
6. **Pam en los textos de privacidad:** «Nadie más los ve: ni Victor ni Pam» y «si algo no cuadra, avísale a Victor o a Pam» (antes de empezar, README).
7. **«Tus datos» y «Cuéntale…» también desde el modo entrenamiento:** leen lo guardado de «Usarla con mis datos» sin tocar los ejemplos. Sin datos: «Todavía no usas tus datos» y solo «Restaurar». Borrar desde ahí te deja en los ejemplos (antes solo existía con tus datos y te pasaba a ellos).
8. **`?victor=1` vale mientras el enlace lo tenga** (no se guarda): la app instalada (abre sin él) es la de la persona. Las herramientas solo en el modo entrenamiento (cargar un caso con tus datos abiertos los pisaría): con tus datos, «Ir a los ejemplos». Por si acaso, esas acciones no hacen nada con tus datos.
9. **La prueba guiada desde tus datos** pasa a los ejemplos al tocar «Empezar» (o al retomar); «Ahora no» te deja donde estabas. Al volver a tus datos, la prueba queda en pausa y «Prueba guiada» dice «La dejaste en la tarea N de M» (antes la retomabas desde «Casos y ayuda»). Ya hecha, abre el final con la tarjeta.
10. **Quien iba en la tarea 7 del set B viejo** (ya no existe) sigue en la última (6 de 6); lo que hizo en la tarea de Carlos queda guardado pero no se muestra ni se manda.
11. **«Aprender a usarla» de tu letra (con tus datos)** abre sus capítulos (antes llevaba a explorar los ejemplos); **«Mejor primero aprender a usarla»** (antes de empezar con tus datos) empieza el entrenamiento (antes: explorar los ejemplos).
12. **«Seguir mirando los ejemplos»** (al final de cada capítulo) se queda: está dentro de «Aprender a usarla» y dice «ejemplos», no Ana ni Carlos (ver pregunta 36).
13. **Si la persona solo hizo la prueba**, el texto igual trae las líneas de uso en cero («Fechas: todavía no la uso con mis datos», «Lo que hice: 0 anotaciones…»): así Victor sabe que todavía no la usa con sus datos.
14. **La bienvenida de la prueba:** las dos líneas reemplazan «Cómo funciona» (pensar en voz alta, «culpa de la app», «No pude»); la tarea sigue diciendo «Arriba tendrás «Listo» y «No pude»». «Sobre ti (opcional)» se queda (va en el texto si contesta). «Solo quiero mirar la app (sin prueba)» pasa a «Ahora no».
15. **La tarjeta del final** dice el título pedido y el botón «Ver qué se manda» (para no repetir la misma frase dos veces).
16. **Detalles visuales:** el título largo de «Cuéntale…» se parte parejo; la lista de «Ayuda» ya no se aplasta cuando el panel tiene scroll (una tarjeta con overflow oculto dentro de la grilla); los chips cortos de «Ayuda» («Sí», «No») miden al menos 44 × 44; en tu letra, la fila de donde estás se marca y no lleva flecha.

### PENDIENTE (lo vi y no lo toqué)

1. **La guía de la computadora** todavía dice «Casos y ayuda» en dos frases («…abre la app a pantalla completa con «Casos y ayuda» y la prueba guiada» y «El moderador puede cambiarlo en «Casos y ayuda» → «Modo moderador»»). No la toqué porque la guía no cambia; ahora es «Ayuda» y, para el moderador, `?victor=1`.
2. **«Practicar»** sigue con los dos ejercicios de Carlos (C20 y C33) y con «Seguir mirando los ejemplos» al final de cada capítulo (preguntas 36 y 37).
3. **`motor.js`** (desde la v2.4.1): en `esAdelantoIng`, la expresión `/(adelanto|anticipo|vale)/` quedó con dos caracteres de retroceso (U+0008) en vez de ``, así que nunca reconoce un ingreso **por su nombre** («Adelanto de salario» sin marcar como adelanto) al anotar «me dieron adelanto…». Los que tienen el tipo «Adelanto» (V2-56) funcionan.
4. **Pruebas viejas que ya fallaban en la v2.5** (las corrí; sin cambio): `contraste-v21.mjs` e `instalar-ua.mjs` se caen desde la v2.2 (la primera vez abre «elegir», no la bienvenida de la prueba); bastaría abrirlas con `?set=A`. `recorrer.mjs` es de la v1 (9 casos) y busca botones que ya no existen. Los pasos de instalar por teléfono quedaron probados en `v26.mjs` (desde «Tus datos»).
5. **El botón «Ayuda» de arriba** mide 34 px de alto a la vista; su área táctil es de 44 px (`::after`), como en la v2.5 (`teclado.mjs` lo marca por su caja).
6. Sigue de antes: **teclado real** en un teléfono durante «Hazlo tú», la **flecha** que a veces queda sobre un texto oscurecido, «¿Cuánto reservas?» que abre con un monto escrito y «Aguinaldo y adelanto» sin «Hazlo tú» (v2.5).

### PREGUNTAS PARA VICTOR (v2.6)

36. **«Seguir mirando los ejemplos»** al final de cada capítulo deja a la persona en los ejemplos (con «Hola, Ana» o «Hola, Rosa» arriba). ¿Lo quitamos también, para que al terminar solo elija «Empezar con mis datos» o «Aprender más»?
37. **«Practicar»** (dentro de «Aprender a usarla») todavía tiene dos ejercicios de Carlos: «Carlos: pago semanal y alquiler mensual» (C20, «Eres Carlos…») y «Carlos con poco dinero» (C33). ¿Los quito como del set B?
38. **Instalar:** ¿te sirve en «Tus datos», o lo quieres como opción visible en «Ayuda» mientras no esté instalada?
39. **El tapado de números:** ahora se tapa cualquier número que la persona escribe. ¿Dejamos pasar los números chicos sin $ (como «paso 3» o «el 15»), aunque alguno pudiera ser un monto?

---

## Prototipo v2.5 (2026-10-18): entrenamiento sencillo y a fondo, evaluado como persona nueva

**Por qué (feedback de Victor):** el entrenamiento todavía se sentía rápido, incluso con las animaciones; 15 pasos en ≤ 4 minutos era demasiado denso para alguien que nunca usó una app de finanzas. **APROBADO por Victor (2026-10-18):** «que sea más sencillo y cabal de entender»; se quita el tope de 4 minutos; «Lo esencial» (5–6 pasos) + «Aprende más» (capítulos cortos, opcionales); nada avanza solo; una pregunta al final de cada capítulo; respuestas 26–29 (V2-59).

### 1. Evaluación primero: diario de fricción de la v2.4.1 (antes de cambiar nada)

**Cómo:** `herramientas/diario-antes.mjs` recorre las dos versiones de la v2.4.1 a 390 × 844 (Serena claro) como lo haría una persona nueva y guarda **71 capturas** con lo que se lee en cada momento (bienvenida, la pregunta, cada paso, la barra de «Hazlo tú» antes de tocar nada, cada hoja que se abre, la celebración y cada pregunta; `capturas/diario-antes/`). Las miré una por una como tres personas:

- **Doña Marta**, 55 años: nunca usó una app de finanzas; usa WhatsApp y Facebook.
- **Kevin**, 22 años: primer trabajo, cobra por quincena; impaciente, quiere ir al grano.
- **Rosa real**: vende comida, cuenta en efectivo, desconfía de las apps.

Leyenda: ✓ entiende · ? duda · 🔤 palabra o número que no le queda claro · ⏩ siente que va rápido · ✗ lo que haría mal. Rosa real no haría la versión fija (no cobra en fecha fija) y Kevin no haría la variable: en esas columnas anoto solo lo que les pasaría si entran por curiosidad («Ver también…»).

#### Versión fija (Ana) — 15 pasos, 4 «Hazlo tú»

| Paso | Doña Marta | Kevin | Rosa real |
| --- | --- | --- | --- |
| Entrada: bienvenida y «¿Cómo te entra el dinero?» | ✓ «Aprender a usarla · Recomendado». ⏩ «en 4 minutos» la apura («¿y si no termino?»). ? «fecha fija» le suena a banco. | ✓ elige en 2 s. | ✓ se reconoce en «Me entra cuando vendo». ? «datos de ejemplo»: ¿guarda lo mío? |
| 1 · Te enseño la app en 4 minutos | ✓ «los datos de Ana». ? detrás, sin explicar: $290.60, «~$32 por día», «Incluye tarjeta $245.00…», tres botones «Pagado». ⏩ «4 minutos». ✗ toca la pantalla de atrás (está bloqueada) y cree que se trabó. | ✓ «Siguiente». | ? «cobra por quincena»: no es lo suyo; «Cambiar de versión» está, pero en letra chica. |
| 2 · Libre: lo que puedes gastar | ✓ «lo que puedes gastar». ? el ejemplo ($100 − $40 = $60) no se parece a los $290.60 de la pantalla. 🔤 «~$32 por día» y «Incluye tarjeta $245.00, vence el 5 de noviembre» están dentro del resaltado y nadie los explica: «¿ya pagué la tarjeta?». | ✓ le sobra. | — |
| 3 · ¿De dónde sale? | ? la hoja abre ya bajada, sin su título; la tarjeta sale dos veces. 🔤 «estado de cuenta», «compras nuevas», «~», «¿Pasas algo de lo que te sobra a la próxima?». ⏩ la fórmula va sin los números de la pantalla. | ✓ entiende la resta. ? la tarjeta doble. | — |
| 4 · Anota en 5 segundos (Hazlo tú) | ? no ubica «(+)»: está abajo, lejos del texto y sin flecha. 🔤 «díctalo con el micrófono». ⏩ «en 5 segundos». ✗ toca «Siguiente» (junto a «Muéstrame») creyendo que así sigue la lección, y se salta el ejercicio. Al guardar, la tarjeta sale sola y tapa el número: no ve el cambio ni sabe por qué cambió. | ✓ en 3 s. ⏩ la celebración tapa el número antes de verlo. | ✓ «pupusas 6» le sale natural. |
| 5 · Lo que viene | ? «ya está restado», ¿de qué? 🔤 Crédito BAC «el 5 nov» va arriba del separador y Colegio «el 5 nov» abajo: el mismo día en dos grupos. | ? la tarjeta antes de «Con tu quincena del 30». | — |
| 6 · Marca un pago (Hazlo tú) | ✓ encuentra «Pagado». ? «¿para qué lo marco si no cambia?»: no se ve que baja lo que tienes. | ✗ puede tocar el «Pagado» de Crédito BAC (abre otra hoja). | ✓ |
| 7 · Tu próxima quincena | 🔤 «~». ? «pásalo a la próxima»: ¿cómo? Todavía no lo necesita. | ✓ le gusta saber cuánto le quedará. | — |
| 8 · ¿Con qué lo pagas? (Hazlo tú) | ✗ «Ábrelo»: el colegio no se ve (hay que bajar); en su ficha toca «Pagado», que es el botón grande, y lo marca pagado. ? ¿por qué pagar hoy algo que vence después? 🔤 «apartados» en la celebración y «Reservas» en el aviso de abajo: dos palabras para lo mismo. | ✓ lo hace. ? para qué sirve. | — |
| 9 · Con el aguinaldo | ? «un pago de enero»: Ana no tiene ninguno a la vista. La pantalla pasó a Pagos sin decirlo. | ? no sabe si le toca aguinaldo. | — |
| 10 · Adelanto de salario | 🔤 «Ingreso esperado» nunca se explicó. Es solo texto: no lo ve ni lo hace. | ✗ le interesa (pide adelantos), quiere hacerlo y no puede. | — |
| 11 · Ahorros | ? arriba, «Así se reparte» con cuatro números y una barra de colores. ? «ya no cuenta en tu libre»: «¿lo pierdo?». | ✓ | ✓ le gusta que siga en el banco. |
| 12 · Cuadra tu efectivo (Hazlo tú) | ✗ no sabe que es Cuentas → Cuadrar → Efectivo (tres toques sin flecha). 🔤 «saldo», «sin detalle». Al escribir, la barra de arriba se corre y deja de ver la instrucción. | ✓ con «Muéstrame». | ✓ cuadrar la caja es lo suyo. 🔤 «sin detalle». |
| 13 · Tarjetas y préstamos | ? «¿por qué baja si no he pagado?». 🔤 «estado de cuenta», «Deudas ~$710». | ⏩ no tiene tarjeta: le sobra. | — |
| 14 · ¿Volviste después de días? | ? habla de «Pongámonos al día», que no está en la pantalla. 🔤 en el número dice «Ya reservas $20.00 para lo que viene» (del paso 8) y nadie lo explica. | ✓ | — |
| 15 · ¿Lo entendí? (4 preguntas) y fin | ✗ ya olvidó el paso 2: falla la primera. ✓ el «Casi» es amable. ? el final tiene cuatro botones grandes y un enlace: no sabe cuál tocar. | ✓ rápido. | — |

#### Versión variable (Rosa) — 15 pasos, 4 «Hazlo tú»

| Paso | Doña Marta | Kevin | Rosa real |
| --- | --- | --- | --- |
| 1 · Te enseño la app en 4 minutos | ? detrás, en naranja, «te faltarían ~$191» y un aviso: se asusta antes de empezar. | ⏩ 15 pasos otra vez, la mitad repetidos (libre, de dónde sale, ahorros, cuadrar). | ✓ se identifica (pupusas, la remesa de su hijo). ✗ el naranja «te faltarían ~$191» le confirma que «las apps asustan». |
| 2 · Libre (hasta fin de mes) | ✓ | ✓ | ? «~$7.20 por día»: «yo gasto más en el mercado». |
| 3 · ¿De dónde sale? | ✓ la resta es corta. 🔤 «El próximo mes (noviembre)» abajo. | ✓ | ✓ |
| 4 · ¿Hasta cuándo? | ? para qué lo cambiaría. ✗ toca un chip (está bloqueado) y cree que no funciona. | ✓ | ? todavía no le ve uso. |
| 5 · Anota una venta (Hazlo tú) | ? «(+)» sin flecha; el aviso naranja la distrae. | ✓ | ✓ ver subir el libre le gusta. |
| 6 · Un gasto del negocio | ✓ «queso 12». | ✓ | ? «¿y lo de la casa?»: se anota igual, pero no se dice. |
| 7 · Lo que viene | 🔤 «Con lo que tengas cuando venza». | ✓ | ? «¿el alquiler no está restado?». |
| 8 · La remesa que esperas | ? la pantalla pasó a Pagos sin decirlo; «Ya llegó» no se ve. | ✓ | ✓ le gusta que no cuente hasta que llega. |
| 9 · El próximo mes | 🔤 «entra ~$0». | ? «~$0». | ✗ «¿Entra $0? ¡Si vendo todos los días!»: siente que la app «no sabe». (→ pregunta 27) |
| 10 · Guarda para el alquiler (Hazlo tú) | ✗ la hoja abre con $191.00 escrito: agrega «40» al final o no sabe borrar. ? tres textos dentro de la hoja. | ✓ | ? «¿$191 si tengo $113?». |
| 11 · ¿Semana mala? | ✗ el número cae a $0 solo: «¿qué borré?». Al seguir, vuelve solo. | ? por qué cambió solo. | ✗ se asusta: «me quitó la plata». (→ pregunta 29) |
| 12 · Ahorros | ? «Así se reparte». | ✓ | ✓ |
| 13 · Cuadra al final del día (Hazlo tú) | ✗ no sabe dónde (Cuentas → Cuadrar). | ✓ con «Muéstrame». | ✓ es lo que hace cada noche. ? «¿cómo sabe la app que tengo $143?». |
| 14 · ¿Volviste después de días? | ? «Pongámonos al día» no se ve. El aviso de arriba ahora dice «Sí, $151.00» (antes $191) y nadie dice por qué. | ✓ | ✓ |
| 15 · ¿Lo entendí? (4 preguntas) | ✓ | ✓ | ✓ la de la semana mala la tranquiliza. |

#### Las 5 fricciones más importantes (antes)

1. **Demasiado de corrido.** 15 pasos con unas 12 ideas y la meta de «4 minutos»: la mitad no hace falta para empezar, y al llegar a «¿Lo entendí?» Marta ya olvidó el paso 2.
2. **La pantalla muestra lo que nadie explica:** la tarjeta dentro del número, «~», «Próxima quincena», «Así se reparte», y para Rosa el naranja «entra ~$0 · te faltarían ~$191» desde el primer paso.
3. **«Hazlo tú» sin saber dónde tocar:** «(+)», «Ábrelo», «Cuentas → Cuadrar» sin flecha, y «Siguiente» al lado de «Muéstrame» (Marta lo toca y se salta el ejercicio).
4. **El cambio pasa demasiado rápido:** la celebración sale sola, tapa el número y no dice por qué cambió.
5. **Lo que se mueve solo asusta:** la semana mala aparece y desaparece sola, la señal late sin parar y la tarjeta aparece al mismo tiempo que se mueve el resaltado.

También: palabras que no se explican («saldo», «sin detalle», «estado de cuenta», «Ingreso esperado», «apartados» y «Reservas» para lo mismo); instrucciones que nombran cosas que no están en la pantalla («Ya llegó», «Pongámonos al día»); la hoja de reservar abre con un monto que hay que borrar; al escribir, la barra de «Hazlo tú» se corre; el final con cuatro opciones.

### 2. Decisiones que salen del diario — decisión técnica — REVISAR

1. **«Lo esencial» = 6 pasos por versión** (fija: tu libre · de dónde sale · anotar · Pagado · con qué pagas cada cosa · cuadrar; variable: tu libre · anotar una venta · anotar un gasto · lo que viene · guardar para el alquiler · cuadrar al final del día) y **«Aprende más» = 5 capítulos por versión**, de 2 a 4 pasos cada uno, con su pregunta. Fija: Próxima quincena y pasar lo que sobra · Ahorros · Tarjetas y estado de cuenta · Aguinaldo y adelanto · Volver después de días. Variable: ¿Hasta cuándo ves tu libre? · El próximo mes y la remesa · Ahorros (con «¿Semana mala?») · Tarjetas y estado de cuenta · Volver después de días. En la variable no hay «Aguinaldo y adelanto» (habla de quincenas) y «Próxima quincena» es «El próximo mes».
2. **Cada capítulo prepara sus propios ejemplos y al terminar o salir vuelven al inicio.** «Lo esencial» de la versión fija usa una Ana **sin tarjeta y con números redondos** (libre $400.00) para que el número no diga «Incluye tarjeta…» antes de tiempo; la tarjeta aparece en su capítulo.
3. **Lo oscuro = «lo verás después».** Se dice una vez al empezar («Te muestro una cosa a la vez. Lo que queda oscuro lo verás después»). Durante «Hazlo tú» también se oscurece lo demás y **solo se puede tocar lo que señala la flecha** (si toca otra cosa: «Toca donde señala la flecha»).
4. **Cada «Hazlo tú» tiene tres momentos:** primero su explicación (qué es, para qué, ejemplo) con un botón «Hazlo tú»; luego la barra con una instrucción concreta y una flecha que sigue a la persona («Toca el botón + de abajo» → «Escribe «pupusas 6»» → «Toca «Guardar»»); al final, la pausa con antes → después y el porqué, y solo «Entendido».
5. **«Hazlo por mí» hace un solo toque a la vez** (la flecha pasa al siguiente). Reemplaza «Muéstrame» en dos toques (V2-58 #23): la flecha ya está siempre. En la barra, «Siguiente» pasa a «Saltar este paso» (más chico), para que no se confunda con seguir.
6. **«Salir» en vez de «Saltar»:** guarda dónde ibas; al volver, «¿Sigues donde te quedaste?».
7. **La pausa aparece casi un segundo después de la acción**, para ver primero el número cambiar en la pantalla.
8. **Respuesta 27, colateral directo:** para quien no tiene ingreso fijo, el aviso ámbar del próximo mes tampoco dice «te faltarían ~$191»: dice cuánto paga y que sus ventas cuentan cuando las anota.
9. **Se quita «4 minutos»** de todos los textos (bienvenida, menú, ayuda, README).
10. **Un solo lugar para los textos:** el entrenamiento, los «?» y «Aprende» leen el mismo glosario (para qué + ejemplo).

### 3. Qué cambió (APROBADO por Victor, 2026-10-18)

| Pedido | Cómo quedó |
| --- | --- |
| **Sin tope de 4 minutos** | Ningún texto habla de minutos: «Te la enseño paso a paso, con datos de ejemplo. Vas a tu ritmo.» (bienvenida), «Aprender a usarla · Lo esencial y capítulos cortos» (menú), «Aprender a usarla: lo esencial y más» (Casos y ayuda). |
| **«Lo esencial»** | «Aprender a usarla» → «¿Cómo te entra el dinero?» → una intro («Lo esencial · 6 pasos»: con quién se practica y «Te muestro una cosa a la vez. Lo que queda oscuro lo verás después», con «Cambiar de versión») → 6 pasos → una pregunta → **[Empezar con mis datos] [Aprender más]** (y «Seguir mirando los ejemplos»). Tablas abajo. |
| **«Aprende más»** | Un panel con la versión elegida («Tu versión: fecha fija (con Ana) · Cambiar»), «Lo esencial» y los 5 capítulos de esa versión, cada uno con su estado: «3 pasos y una pregunta», «Ibas en el paso 2 de 3» o **«Hecho»** (y «2 de 5 hechos»). Se abre al final de «Lo esencial», desde el menú (tu letra → «Aprender a usarla»), desde «Aprende» y desde «Casos y ayuda». Con tus datos también se abre: al tocar un capítulo pasa al modo entrenamiento y al final ofrece «Volver a mis datos». |
| **Sugerido en el momento** | Con tus datos, la primera vez que guardas una tarjeta de crédito (Mi dinero → Deudas → «+ Tarjeta o préstamo»): «¿Quieres ver cómo funcionan las tarjetas? (1 min)» [Ahora no] [Ver ahora]. Si la tarjeta se agregó el primer día, la misma oferta aparece una vez en Hoy. «Ver ahora» abre el capítulo «Tarjetas y estado de cuenta» de tu versión (por tu ingreso: fijo o no) y al final «Volver a mis datos» (tus datos quedan como estaban). |
| **Una pregunta por capítulo** | Al final de «Lo esencial» y de cada capítulo: una pregunta con tres respuestas. Si falla: «Casi: …» (la misma explicación amable), **«Repasar este paso»** (solo ese paso, con «Volver a la pregunta») y «Seguir». Si acierta: «¡Así es! …» y «Terminar». |
| **Nada avanza solo** | Ni pasos, ni resaltados, ni ejemplos: todo espera a que la persona toque. La semana mala ya no aparece sola (V2-59 #29). La pausa después de «Hazlo tú» espera «Entendido». |
| **Cada paso: qué ves → para qué → ejemplo** | El título dice qué estás viendo («Este número es tu libre», «Aquí ves de dónde sale»); debajo, para qué te sirve; y un recuadro «Ejemplo» con números redondos. Una idea por paso, cada parte en ≤ 2 líneas a 390 px, frases ≤ 20 palabras, sin palabras prohibidas. |
| **Animaciones calmadas** | Lo oscuro y el resaltado entran despacio (450 ms), el resaltado late suave **dos veces** y se queda; la tarjeta aparece **después** (450 ms de espera, 320 ms de entrada). En «Hazlo tú», la flecha baja dos veces hacia lo que hay que tocar y se queda quieta. Con «reducir movimiento», nada se mueve. |
| **«Hazlo tú»** | Primero se explica (con su botón «Hazlo tú»). Luego una barra arriba con una instrucción concreta («Toca el botón + de abajo.» → «Escribe «pupusas 6» en «¿Qué pasó?».» → «Revisa lo que entendí y toca «Guardar».»), una **flecha** y un anillo sobre lo que hay que tocar; lo demás queda oscuro y no se puede tocar («Toca donde señala la flecha»). «Hazlo por mí» hace **un solo toque** a la vez. «Saltar este paso» y «Atrás» (vuelve a la explicación). |
| **Pausa con antes → después** | Casi un segundo después de la acción (para ver el número cambiar), una tarjeta sobre lo que cambió: «Libre $400.00 → $394.00» y «Tu libre bajó de $400 a $394 porque anotaste $6 de pupusas.», con un solo botón: **«Entendido»**. Los números son los del motor. |
| **Indicador** | «Lo esencial · paso 2 de 6» (y «Ahorros · paso 1 de 3», «… · Hazlo tú», «… · ¿Lo entendí?», «Repaso») con una barra fina. «Salir» guarda dónde ibas: en Hoy, «Sigue donde te quedaste · «Lo esencial» (fecha fija): vas en el paso 3 de 6», y al volver, «¿Sigues donde te quedaste?» [Seguir] [Empezar de nuevo]. |
| **Nunca un concepto antes de tiempo** | «Lo esencial» de la versión fija usa una Ana sin tarjeta (la tarjeta tiene su capítulo); para quien vende ya no hay «entra ~$0 · te faltarían» en naranja (V2-59 #27). Lo que no se explica queda oscuro, y la intro dice que lo verás después. |
| **«Practicar»** | Los mismos 18 ejercicios; cada uno dice **«Antes: «Lo esencial»»** (o «Ahorros», «Tarjetas y estado de cuenta»…), con «(hecho)» si ya hiciste ese capítulo; abajo, «Ver los capítulos». |
| **«?» y «Aprende»** | Leen el mismo glosario que el entrenamiento: «Libre: Es lo que puedes gastar… Ejemplo: Tienes $100…». «Aprende» muestra los términos de tu versión (sin «quincena» si lo que te entra varía) y «Aprender a usarla». |

### 4. V2-59 · Respuestas 26–29 (APROBADAS por Victor, 2026-10-18)

| # | Respuesta | Cómo quedó |
| --- | --- | --- |
| 26 | Rosa (vende pupusas, remesa sin fecha fija) se queda. | Sin cambio: Rosa sigue siendo el ejemplo de la versión «Me entra cuando vendo o trabajo». |
| 27 | Para quien vende, el próximo mes no dice «entra ~$0», sino «Tus ventas cuentan cuando las anotas» (y lo vendido este mes como referencia, sin sumarlo). | Sin ingreso fijo y sin nada esperado: Hoy dice **«El próximo mes (noviembre) · pagas ~$191 · tus ventas cuentan cuando las anotas · este mes llevas $316.00 en ventas»**, sin el color de «falta». Lo mismo en «¿De dónde sale?», Pagos → Próxima y Reparte. Si sí espera algo (una remesa mensual), sigue «entra ~$150 · pagos… » y abajo «tus ventas cuentan cuando las anotas». **Colateral:** el aviso del próximo mes dice «Del 1 nov al 30 nov pagas ~$191. Tus ventas cuentan cuando las anotas. ¿Guardas algo de lo que tienes ahora?» (ya no «te faltarían ~$191») y «¿Cuánto reservas?» dice «El próximo mes pagas ~$191: el alquiler, la luz, el agua y más. Tus ventas cuentan cuando las anotas.». |
| 28 | «¿Hasta cuándo ves tu libre?» también en Tu cuenta → «Cómo te entra el dinero». | El menú (tu letra) dice **«Cómo te entra el dinero»** (antes «Cómo te pagan»). Sin ingreso fijo: «Varía · ves tu libre hasta fin de mes» y abre una hoja con «¿Hasta cuándo ves tu libre?» (Hasta fin de mes / Los próximos 15 días), su explicación del glosario y «Ver lo que esperas que te llegue». Con ingreso fijo abre su ingreso, como antes. |
| 29 | «¿Semana mala?» deja de aparecer y desaparecer solo: es un ejemplo que se abre con «Ver un ejemplo» y se cierra con «Volver a mis números». | En «Ahorros y semanas malas» (versión variable), el paso «Si vendes poco, tu libre puede llegar a $0» tiene **«Ver un ejemplo»**: el número de Rosa pasa a $0.00 con «Faltan $30.00 para cubrir tus ahorros» y la tarjeta dice «Así se vería una semana mala · Libre en $0 y te digo cuánto falta. Puedes sacar de un ahorro. Sin culpa.» con un solo botón: **«Volver a mis números»**. Salir con el ejemplo abierto también lo quita. |

### 5. Los pasos, uno por uno

Leyenda: ✋ «Hazlo tú» (explicación → barra con flecha → pausa con «Entendido»). Entre comillas, la pausa que se ve con los ejemplos de cada capítulo (números del motor).

#### Versión fija (Ana, cobra por quincena)

| Capítulo | Pasos | Pregunta |
| --- | --- | --- |
| **Lo esencial** (6) · Ana sin tarjeta, libre $400.00 | 1 Este número es tu libre · 2 Aquí ves de dónde sale (la hoja «¿De dónde sale?») · 3 ✋ Este botón + es para anotar («Tu libre bajó de $400 a $394 porque anotaste $6 de pupusas») · 4 ✋ Estos son tus próximos pagos → «Pagado» del teléfono («Tu libre no cambió: el teléfono ya estaba restado. Lo que tienes bajó $15.», con «Tienes $1,309.00 → $1,294.00») · 5 Aquí ves con qué pagas el colegio («Lo pagas con», en su ficha, desde Pagos) · 6 ✋ Aquí cuadras tu efectivo (Cuentas → Cuadrar → Efectivo → $15 → «Tu libre bajó de $394 a $390 porque tenías $4 menos de lo que creía la app») | Tienes $100 y antes de tu quincena pagas $40. ¿Cuánto tienes libre? (repasa el paso 1) |
| **Próxima quincena y pasar lo que sobra** (4) | 1 Esta es tu próxima quincena · 2 Mira el signo ~ en «~$600» · 3 ✋ Aquí pasas lo que te sobra (¿De dónde sale? → «¿Pasas algo…?» → 50 → «Tu libre bajó de $400 a $350 porque pasaste $50 a tu próxima quincena», con «Te quedarían ~$545 → ~$595») · 4 Aquí cambias o repartes un pago («Cambiar o repartir») | ¿Qué quiere decir el signo ~? (repasa el paso 2) |
| **Ahorros** (3) | 1 Aquí están tus ahorros · 2 ✋ Así guardas en un ahorro (Ahorrar → 50 → Emergencias → «Tu libre bajó de $400 a $350 porque guardaste $50 en Emergencias», con «En ahorros $900.00 → $950.00») · 3 Este es tu ahorro para la laptop (su «Usar») | Pones $50 en «Emergencias». ¿Dónde queda ese dinero? (paso 1) |
| **Tarjetas y estado de cuenta** (4) · Ana con su Crédito BAC, libre $300.00 | 1 Tu número incluye la tarjeta · 2 ✋ Anota una compra con tarjeta («zapatos 30 tarjeta» → «Tu libre bajó de $300 a $270 porque compraste $30 con tarjeta, aunque la pagues después») · 3 Esto es «Deudas» · 4 Este es tu estado de cuenta (la ficha de la tarjeta) | Compras $30 con tarjeta. ¿Cuándo baja tu libre? (paso 1) |
| **Aguinaldo y adelanto** (3) | 1 Aquí ves tu aguinaldo («Más adelante») · 2 Aquí ves la matrícula de enero (ya va con el aguinaldo) · 3 Aquí anotas un adelanto de salario («+ Ingreso esperado») | El aguinaldo llega el 12 de diciembre. ¿Cuándo suma? (paso 1) |
| **Volver después de días** (2) · Ana el 6 de noviembre | 1 Si pasas días sin abrirla («Pongámonos al día») · 2 ✋ Ponte al día en un minuto (Empezar → «Sí, me cayó» → Siguiente → «Marcar todos como pagados» → Siguiente → Listo → «Tu libre subió de $400 a $945 porque confirmaste lo que te llegó y lo que pagaste») | Volviste después de dos semanas. ¿Qué haces? (paso 1) |

#### Versión variable (Rosa, vende pupusas; nunca dice «quincena»)

| Capítulo | Pasos | Pregunta |
| --- | --- | --- |
| **Lo esencial** (6) · Rosa, libre $80.00 hasta fin de mes | 1 Este número es tu libre · 2 ✋ Este botón + es para anotar («vendí 45» → «Tu libre subió de $80 a $125 porque anotaste $45 de ventas») · 3 ✋ Con el mismo botón anotas un gasto («queso 12» → «Tu libre bajó de $125 a $113 porque anotaste $12 de queso») · 4 Estos son tus próximos pagos · 5 ✋ Este aviso te ayuda con el alquiler («Sí, $191.00» → «Borra el número y escribe 40» → Reservar → «Tu libre bajó de $113 a $73 porque guardaste $40 para el alquiler») · 6 ✋ Aquí cuadras al final del día ($140 → «Tu libre bajó de $73 a $70 porque tenías $3 menos de lo que creía la app») | Tienes $100 y antes de fin de mes pagas $40. ¿Cuánto tienes libre? (paso 1) |
| **¿Hasta cuándo ves tu libre?** (3) | 1 Tu libre llega hasta fin de mes · 2 ✋ Cámbialo a 15 días (tu número → «Los próximos 15 días» → «Tu libre ahora llega hasta el 5 nov: son ~$5.30 por día», con «Por día ~$7.20 → ~$5.30») · 3 También lo cambias en tu cuenta (tu letra → «Cómo te entra el dinero», V2-59 #28) | Tu libre dice «Hasta fin de mes». ¿Lo puedes cambiar? (paso 1) |
| **El próximo mes y la remesa** (3) | 1 Así quedas el próximo mes (V2-59 #27) · 2 Esta es la remesa que esperas · 3 ✋ Cuando llegue, dilo aquí (Pagos → Remesa de Josué → «Ya llegó» → Siguiente → Listo → «Tu libre subió de $80 a $230 porque llegó la remesa de $150») | Esperas una remesa de $150 que no ha llegado. ¿Cuenta? (paso 2) |
| **Ahorros y semanas malas** (3) | 1 Aquí están tus ahorros · 2 ✋ Así guardas en un ahorro ($20 en Emergencias → «Tu libre bajó de $80 a $60…») · 3 Si vendes poco, tu libre puede llegar a $0 («Ver un ejemplo» / «Volver a mis números», V2-59 #29) | Semana mala y libre en $0. ¿Qué significa? (paso 3) |
| **Tarjetas y estado de cuenta** (4) · Rosa con una tarjeta de ejemplo («Crédito Agrícola», $20 el 5 nov), libre $100.00 | 1 Tu número incluye la tarjeta · 2 ✋ Anota una compra con tarjeta («harina 30 tarjeta» → «Tu libre bajó de $100 a $70 porque compraste $30 con tarjeta, aunque la pagues después») · 3 Esto es «Deudas» · 4 Este es tu estado de cuenta | Compras $30 con tarjeta. ¿Cuándo baja tu libre? (paso 1) |
| **Volver después de días** (2) · Rosa el 2 de noviembre, sin anotar desde el 20 de octubre | 1 Si pasas días sin abrirla · 2 ✋ Ponte al día en un minuto (Empezar → Siguiente → «Pagado» de la cuota → Siguiente → «Contaste tu efectivo: escribe 250» → Listo → «Tu libre subió de $0 a $74 porque contaste tu efectivo: lo que vendiste estos días ya cuenta») | Volviste después de dos semanas. ¿Qué haces? (paso 1) |

### 6. Segunda vuelta: el diario con la versión nueva

Repetí el recorrido como las tres personas con la v2.5 («Lo esencial» de las dos versiones y los 10 capítulos), mirando las capturas de `v25.mjs` (Serena claro por file:// y Serena oscuro servida, 390 × 844). ✓ se resolvió · ⚠ queda.

| Momento | Doña Marta | Kevin | Rosa real |
| --- | --- | --- | --- |
| Entrada e intro | ✓ «Te la enseño paso a paso… Vas a tu ritmo»: sin reloj. ✓ La intro dice cuántos pasos son y que lo oscuro lo verá después. | ✓ | ✓ «Usamos los datos de Rosa: vende pupusas…»: se reconoce. |
| Tu libre | ✓ El número es redondo ($400 / $80) y sin la línea de la tarjeta. ⚠ «~$44 por día» sigue dentro del resaltado sin explicarse (el «~» se explica en «Próxima quincena»). | ✓ | ✓ |
| De dónde sale (fija) | ✓ La hoja abre con su título y el marco rodea solo la cuenta ($1,315 − $900 − $15 = $400). ⚠ El ejemplo usa otros números ($1,000 / $600 / $100) que los de Ana, que están justo arriba. | ✓ | — |
| Anotar | ✓ «Toca el botón + de abajo» con flecha; solo se puede tocar el +; «Saltar este paso» ya no se confunde con seguir. ✓ La pausa: «Tu libre bajó de $400 a $394 porque anotaste $6 de pupusas» y «Entendido». | ✓ «Hazlo por mí» de a un toque. ⚠ Son tres toques más que antes (explicación, «Hazlo tú», «Entendido»). | ✓ «Tu libre subió de $80 a $125 porque anotaste $45 de ventas». |
| Pagado (fija) | ✓ Lo lee antes («Tu libre no cambia: ya estaba restado») y la pausa lo confirma: «Tienes $1,309.00 → $1,294.00». | ✓ Solo puede tocar el «Pagado» del teléfono (ya no el de la tarjeta). | — |
| Con qué pagas (fija) · Lo que viene (variable) | ✓ Una sola idea, en la ficha del colegio («‹ Pagos» dice dónde está). ⚠ «Cambiar o repartir» se ve y se explica hasta su capítulo. | ✓ | ✓ «La cuota de $45 vence el 25: ya está restada». |
| Guardar para el alquiler (variable) | ✓ «Toca «Sí, $191.00»» → «Borra el número y escribe 40». ⚠ Borrar un número en el teléfono le sigue costando. | ✓ | ✓ El aviso ya no dice «te faltarían ~$191»: «Tus ventas cuentan cuando las anotas». ✓ «Tú decides cuánto: nada se guarda solo». |
| Cuadrar | ✓ La flecha la lleva: «Cuadrar» → «Efectivo» → $15 → «Cuadrar»; la hoja ya no dice «saldo». ✓ «Tu libre bajó de $394 a $390 porque tenías $4 menos de lo que creía la app». ⚠ «sin detalle» sigue como palabra (el ejemplo la explica). | ✓ | ✓ «Aquí cuadras al final del día»: lo que hace cada noche. |
| ¿Lo entendí? | ✓ Una sola pregunta, justo después de los pasos: ya no olvida. ✓ «Casi: …» y «Repasar este paso». | ✓ | ✓ |
| Final | ✓ Dos caminos claros: «Empezar con mis datos» o «Aprender más». | ✓ Va directo a sus datos. | ✓ |
| Aprende más | ✓ Ve qué le falta («0 de 5 hechos») y lo hace otro día; si lo deja a medias, «Sigue donde te quedaste». | ✓ Elige solo lo que le sirve (adelanto, tarjetas). ⚠ «Aguinaldo y adelanto» solo explica: hacerlo está en «Practicar». | ✓ «Volver después de días»: contar su efectivo cuenta lo que vendió sin anotar. ✓ La semana mala solo si la abre. |
| Siempre | ✓ Nada se mueve solo; el resaltado entra despacio y se queda; la tarjeta aparece después. ⚠ La flecha a veces queda encima de un texto oscurecido de al lado. | ⚠ Más calma también es más toques: para él están «Saltar este paso» y «Hazlo por mí». | ✓ En la versión variable ninguna pantalla dice «quincena» (comprobado en cada paso). |

#### Las 5 fricciones de antes, cómo quedaron

| # | Antes | Ahora |
| --- | --- | --- |
| 1 | Demasiado de corrido: 15 pasos, unas 12 ideas y «4 minutos». | **Resuelta.** «Lo esencial» son 6 pasos y una pregunta; lo demás son capítulos de 2 a 4 pasos, cuando la persona quiera, con su marca de «hecho». Sin reloj. |
| 2 | La pantalla mostraba lo que nadie explicaba (la tarjeta en el número, «~», el naranja de Rosa). | **Casi resuelta.** Sin tarjeta en «Lo esencial», sin naranja para quien vende y lo no explicado queda oscuro («lo verás después»). Queda «~$44 por día» dentro del número. |
| 3 | «Hazlo tú» sin saber dónde tocar; «Siguiente» al lado de «Muéstrame». | **Resuelta.** Instrucción concreta, flecha que sigue a la persona, solo se toca lo señalado, «Hazlo por mí» de a un toque y «Saltar este paso» aparte. |
| 4 | El cambio pasaba rápido y sin porqué. | **Resuelta.** La pausa espera a que se vea el número cambiar, dice antes → después y el porqué, y solo sigue con «Entendido». |
| 5 | Lo que se movía solo asustaba. | **Resuelta.** Nada avanza solo; la semana mala es un ejemplo que se abre y se cierra; el resaltado y la flecha laten dos veces y se quedan; la tarjeta aparece después. |

### Calidad (v2.5)

- **`herramientas/v25.mjs`** (por file:// en Serena claro y servida en la subruta de Pages en Serena oscuro, a 390 × 844): la entrada sin «4 minutos»; **«Lo esencial» en las dos versiones** como persona nueva: el primer «Hazlo tú» **a mano** (tocando y escribiendo de verdad) y los demás con «Hazlo por mí», comprobando que hace **un solo toque** a la vez; en cada paso, el indicador, el título y el «para qué» y el ejemplo **iguales al glosario**, cada uno en **≤ 2 líneas medidas en la pantalla**, el marco rodea lo que explica sin que la tarjeta lo tape, el foco en el título, botones de 44 px y, en la variable, **ninguna pantalla dice «quincena»**; **nada avanza solo** (3 s sin tocar en la intro, un paso, un «Hazlo tú», una pausa y la pregunta de cada «Lo esencial»; 1.5 s en cada capítulo); lo oscuro no se toca; cada pausa con antes → después **del motor**, el porqué en ≤ 2 líneas y **solo «Entendido»**; la pregunta con un error («Casi», nunca «incorrecto»), «Repasar este paso» y vuelta a la pregunta; el final; la **marca de «hecho»**; **retomar** («Salir» → «Sigue donde te quedaste» en Hoy, «Ibas en el paso 3 de 6» en «Aprende más», «Empezar de nuevo», y un capítulo de la versión variable); **los ejemplos vuelven al inicio** al terminar o salir de cada capítulo; **los 10 capítulos** de «Aprende más» completos; V2-59 #27, #28 y #29; la **oferta de tarjetas** (en el momento y en Hoy, una sola vez) y «Volver a mis datos» sin perder nada; «Practicar» con el capítulo de antes en los 18; «?» y «Aprende» con los mismos textos en las dos versiones; legibilidad (sin palabras prohibidas, frases ≤ 20 palabras, sin «quincena» en la variable); calma (el resaltado entra en 450 ms y late 2 veces, la tarjeta después; la flecha baja 2 veces; con «reducir movimiento», nada se mueve); **contraste ≥ 4.5:1 en los 4 temas (mínimo 5.27:1)**. Sin fallos ni errores de consola, por file:// y servida.
- **Las de siempre** siguen pasando sin errores de consola: motor y casos borde, los 13 casos de la guía, los sets A y B, la guía en la computadora, modos (entrada con «Lo esencial», tres personas de dos semanas, copia → borrar → restaurar, «Contarle a Victor» sin montos ni nombres), **aceptación** (Victor: **Libre $95.00 · ~$7.90 por día**; próxima **~$1,163 · ~$713 · ~$450**), v2.3.1 (la corrección con el adelanto: **~$1,477 · ~$1,196 · ~$281**), entrega 2, viaje del dinero, humo, `v24.mjs` («?», «Aprende», consejos, «Practicar») y `v241.mjs` (V2-56, V2-57, consejos, «Practicar» con Rosa). La app instalable: caché `pamplanea-proto-v2.5-2026-10-18` con los 141 archivos, abre sin internet y **al actualizar no se pierden los datos** (los reales y los ejemplos). Servidas también: aceptación y v2.3.1 en Ancla oscuro, v2.4.1 en Serena oscuro.
- **Revisión visual:** las 71 capturas de antes y unas 270 nuevas (claro y oscuro), mirándolas como las tres personas; de ahí salieron el resaltado corrido al abrir una hoja, la página que se movía con `scrollIntoView`, «Volver después de días» de Rosa que terminaba en «$0.00 sin cambio», la pausa de «¿Hasta cuándo?» sin sentido y los títulos que repetían la frase de abajo.

### Decisiones técnicas v2.5 — REVISAR

- **Progreso nuevo** en `pamplanea-entrenamiento`: `caps` (por capítulo: `{ paso, hecho }`, con clave `fijo:esencial`, `variable:ahorros`…), `tourVersion` y `tourUltimo` (el último capítulo tocado, para «Sigue donde te quedaste»). El recorrido de la v2.4.1 que ya estaba **hecho** cuenta como «Lo esencial» hecho de esa versión; uno a medias no se puede retomar (los pasos cambiaron) y empieza de nuevo. Nada de esto toca los datos de uso: **sin cambio de esquema**. La oferta de tarjetas se recuerda en `pamplanea-modo` (`ofertaTarjetas`: «vista» o «no»).
- **Ejemplos por capítulo:** cada capítulo prepara su Ana o su Rosa al empezar y, al terminar o salir, vuelven las de siempre. Para los **números redondos** (libre $400.00, $300.00, $100.00) se mueve el último cuadre del banco (o del efectivo) **solo en esos ejemplos**; los 13 casos y «Practicar» no cambian. La Ana sin tarjeta es la de siempre sin su Crédito BAC (ni sus compras con ella). Rosa, en «Tarjetas», tiene una tarjeta de ejemplo que en sus datos de siempre no tiene.
- **Si lo que un paso explica ya no está** (por ejemplo, ya te pusiste al día y la tarjeta «Pongámonos al día» se fue) y vuelves a ese paso con «Atrás» o «Repasar», los ejemplos del capítulo vuelven a como empezaron.
- **Lo oscuro de «Hazlo tú»** es más claro que el de las explicaciones (42 % contra 58 %) para que se vea la pantalla en la que se trabaja. Con una hoja abierta, se puede tocar toda la hoja (para ver y cambiar lo que la app entendió); sin hoja, solo lo que señala la flecha. Con teclado, quien usa lector de pantalla sigue pudiendo moverse por toda la app.
- **«Tus ventas cuentan cuando las anotas»** se dice a toda persona sin ingreso fijo (como lo pidió la respuesta 27), también a quien trabaja por día. «Este mes llevas $X en ventas» suma lo anotado este mes como «Venta».
- **Rosa en «Volver después de días»** contó $250 en efectivo al ponerse al día (vendió y no lo anotó): así se ve que cuadrar también cuenta las ventas que no se anotaron.
- **«Ahora no» en la pregunta de la versión** conserva su nombre interno (`tour-saltar`) para que las pruebas de siempre sigan iguales.
- **Medir sin mover la página:** el entrenamiento ya no usa `scrollIntoView` (movía el marco de la app y la barra de «Hazlo tú» se salía de la pantalla, la fricción de Marta en el paso 12); mueve solo la lista de la hoja o de la pantalla, y mide cuando termina de subir una hoja.
- **Pruebas de antes:** lo del recorrido de 15 pasos que había en `v24.mjs` y `v241.mjs` pasó a `v25.mjs`; en esas dos quedan los «?», «Aprende», los consejos, V2-56, V2-57 y «Practicar».

### PENDIENTE (lo vi y no lo toqué)

1. **Teclado real:** en el teléfono, al escribir en un «Hazlo tú», el navegador puede mover la pantalla para mostrar el campo; en las pruebas (sin teclado) la barra queda arriba, pero falta verlo en un teléfono.
2. La flecha a veces queda encima de un texto oscurecido de al lado (por ejemplo, sobre «Ver todos» cuando señala «Pagado»). No tapa lo que hay que tocar.
3. «¿Cuánto reservas?» abre con el monto de la sugerencia ($191.00) ya escrito: el paso dice «Borra el número y escribe 40». Para quien tiene menos libre que eso, quizá convendría abrirla vacía.
4. «Aguinaldo y adelanto» solo explica (no tiene «Hazlo tú»); pagar con el aguinaldo y el adelanto se practican en «Practicar».
5. Sigue de la v2.4.1: con ingreso fijo, una sugerencia de la app todavía dice «ese periodo pagas…» (texto de la app, fuera del entrenamiento).

### PREGUNTAS PARA VICTOR (v2.5)

31. **«Lo esencial» de la versión fija** tiene tres «Hazlo tú» (anotar, Pagado, cuadrar); «con qué pagas cada cosa» solo se explica (cambiarlo está en «Próxima quincena»). ¿Así, o quieres que en lo esencial también lo cambie?
32. **Durante «Hazlo tú» solo se puede tocar lo que señala la flecha** (lo demás queda oscuro). ¿Te parece bien, o prefieres que la persona pueda tocar todo, como antes?
33. **«Tus ventas cuentan cuando las anotas»** aparece a toda persona sin ingreso fijo, también a quien trabaja por día. ¿Usamos «Lo que te entra cuenta cuando lo anotas» para quien no vende?
34. **La oferta de tarjetas** sale una sola vez (si dice «Ahora no», no vuelve; queda en «Aprende»). ¿Así, o la repetimos una vez más después?
35. Sigue abierta la 25/30: ¿le pides a una persona de la familia que haga «Lo esencial» sin ayuda (ya sin reloj) y nos cuentas dónde se detuvo?

---

## Prototipo v2.4.1 (2026-10-18): ajustes puntuales + entrenamiento en dos versiones

### Parte 1 · Decisiones V2-56 a V2-58 (APROBADAS por Victor, 2026-10-18; commit propio)

| # | Qué se pidió | Cómo quedó |
| --- | --- | --- |
| **V2-56** Tipo de ingreso visible | «+ Ingreso esperado» empieza con «¿Qué es?»; cada tipo con su frecuencia; «Adelanto» pregunta directo de qué quincena y cuánto; también al editar; Anotar entiende «me dieron adelanto 314» y «adelanto 314 el 29». | **«¿Qué es?» va primero:** Salario · Adelanto · Remesa · Aguinaldo · Quincena 25 · Bono o comisión · Venta · Otro. Cada tipo propone su nombre y su frecuencia: Salario = cada quincena (con los días de tu ingreso principal); Remesa = cada mes; Adelanto, Aguinaldo (12 de diciembre), Quincena 25 (25 de enero), Bono y Venta = una vez. Si la fecha la puso un tipo (no tú), cambia al cambiar el tipo. **Adelanto** no pregunta «¿Cada cuánto?» (es una vez): pide «¿Qué día te lo dan?» y, en el mismo formulario, **«¿De qué quincena te lo descuentan?»** (por defecto, la primera después de esa fecha, con todo el adelanto) y **«¿Cuánto te descuentan?»**; se puede repartir entre varias («Suman $100.00: todo el adelanto.»). Al quitar una quincena y quedar una sola, esa se lleva todo. No se guarda un adelanto sin decir de cuál (si hay quincenas que esperar). **Al editar** un ingreso que ya tenías, «¿Qué es?» lo reconoce (un «Adelanto de Salario» guardado antes → Adelanto) y hace la misma pregunta; la categoría solo cambia si cambias el tipo (un cuchubal sigue siendo cuchubal). **Anotar:** «me dieron adelanto 314» es un ingreso de hoy (suma ya; la nota dice «Es un adelanto de tu salario: suma hoy. Al guardar te pregunto de qué quincena te lo descuentan.») y al guardar abre esa pregunta; «adelanto 314 el 29» (fecha futura) queda como **ingreso esperado tipo Adelanto**, no suma hasta que llegue y también pregunta de qué quincena. |
| **V2-57** Día de corte | Al editar el día de corte o de pago de una tarjeta: recalcular el ciclo pendiente, los avisos y su pago en Pagos; un estado de cuenta ya anotado no se modifica. | Mientras la tarjeta no tiene estado de cuenta anotado, cambiar el corte o el pago recalcula su ciclo: «Corta el X» / «Cortó el X», «¿Ya te llegó tu estado de cuenta?» y su pago en Pagos. **Prueba automática** (hoy 18 oct): tarjeta con corte 21 y pago 10 → «corta el 21», paga el 10 nov; cambiar a **corte 5** → «Corte el 5 · pago el 10» y «Cortó el 5 de octubre»; pago el 10 nov (un solo pago, sin duplicados); cambiar el pago al 20 → su pago pasa al 20 nov. Con un estado de cuenta ya anotado (BAC de Ana), cambiar el corte no lo toca: el día nuevo vale desde el siguiente corte (20 nov). |
| **V2-58** Respuestas 21–24 | 21 pregunta de «Pagado»; 22 los ejemplos vuelven al inicio; 23 «Muéstrame» en dos toques; 24 consejos en Anotar y en la ficha de un pago. | **21:** «¿Lo entendí?» suma «Cuando marcas un pago como Pagado, ¿qué pasa con tu libre?» (Baja · **No cambia, ya estaba contado** · Sube), sin quitar las otras: 4 preguntas; si falla, «Repasar «Marca un pago»». **22:** al terminar **o** saltar el recorrido, los ejemplos vuelven a como estaban al inicio y se avisa «Listo, dejé los ejemplos como al inicio para que practiques» (si retomas, el recorrido vuelve a preparar sus ejemplos). **23:** «Muéstrame»: el primer toque **resalta dónde tocar** (un marco que late, quieto con «reducir movimiento») con una indicación corta en la barra que sigue a la persona («Toca el botón (+) de abajo.» → «Escribe «pupusas 6» en «¿Qué pasó?».» → «Toca «Guardar».»); el botón cambia a **«Hazlo por mí»** y el segundo toque hace la acción. **24:** consejos de la primera vez también en **Anotar** («Escribe como hablas: «pupusas 6» o «vendí 45». Si algo no es, tócalo y lo cambias.») y en la **ficha de un pago** («Aquí ves cuándo vence y de qué dinero sale. Cuando lo pagues, toca «Pagado».»), una sola vez cada uno. |

**Colaterales directos (Parte 1):** el recorrido fijo bajó de 4 min 11 s a 3 min 58 s estimados (la cuarta pregunta lo pasaba de 4 minutos): textos más cortos, la misma idea por paso. Sin cambio de esquema: `tipoIngreso` es un campo opcional nuevo de cada ingreso (los de antes se reconocen por su nombre y categoría al editarlos).

### Parte 2 · Entrenamiento en dos versiones + revisión detallada (APROBADO por Victor, 2026-10-18; commit propio)

| Pedido | Cómo quedó |
| --- | --- |
| **A) Una sola pregunta al entrar** | «Aprender a usarla» (y «Ver el recorrido», en el menú, en «Aprende» y en «Casos y ayuda») empieza con **«¿Cómo te entra el dinero?»**: «Me pagan en fecha fija» (Quincena, mes o semana) o «Me entra cuando vendo o trabajo» (Varía), y «Ahora no». En cada paso explicado, **«Cambiar de versión»** vuelve a la pregunta; la app **recuerda** dónde ibas en cada versión («Ibas en el paso 2 de 15») y cuál hiciste («Ya lo hiciste»). Al terminar una, «Ver también: ingresos que varían» (o «… fecha fija») hace la otra. |
| **B) Versión 1 · fecha fija (Ana)** | La de la v2.4, revisada paso por paso (tabla abajo). Enseña libre hasta tu quincena y de dónde sale, anotar, Pagado (el libre no cambia), «Lo pagas con» y repartir, próxima quincena y pasar lo que sobra, el aguinaldo, el adelanto con descuento, ahorros, cuadrar, tarjeta y estado de cuenta, volver después de días; el primer paso dice que sirve igual si te pagan cada mes o cada semana. |
| **C) Versión 2 · ingresos que varían (Rosa)** | Persona nueva de ejemplo: **Rosa vende pupusas en su casa y su hijo Josué le manda una remesa sin fecha fija** (más o menos el 28). Efectivo $110 y Banco Agrícola $95; alquiler $120 (el 5), luz ~$18 (el 15), agua $8 (el 18), cuota de la cooperativa $45 (el 25; debe $540); ahorros «Emergencias» $50 y «Plancha nueva» $30; ventas de $38 a $55 casi cada día. Libre **$80.00 hasta fin de mes** (11 días). 15 pasos, sin la palabra «quincena»: el libre hasta fin de mes o 15 días y cómo elegirlo; **anotar una venta** («vendí 45», Hazlo tú) y **un gasto del negocio** («queso 12», Hazlo tú); lo que viene; la remesa no suma hasta que llega («Ya llegó»); el próximo mes («tus ventas no las cuento antes»); **guardar para el alquiler** (la sugerencia; tú decides cuánto; Hazlo tú); **¿semana mala?** (se ve un momento: libre $0 y cuánto falta, sin culpa); ahorros; **cuadrar al final del día** (Hazlo tú); volver después de días. Su «¿Lo entendí?»: libre hasta fin de mes, la remesa, la sugerencia, la semana mala. |
| **D) «Practicar»** | 18 ejercicios (5 nuevos con Rosa: Anotar una venta, Ver tu libre de 15 días, Llegó la remesa, Guardar para el alquiler, Una semana mala). Cada uno dice a qué versión aplica (**Fecha fija**, **Varía** o **Para todos**) junto a su nivel, y la lista empieza con «Para ti: …» (los de tu versión y los de todos) y después «De …» (los de la otra). |
| **E) Revisión detallada** | Cada paso de las dos versiones, con los 6 criterios (sentido y orden; igual a la app; números del motor; una idea, ≤ 2 líneas, frases ≤ 20 palabras, sin palabras prohibidas; resaltado correcto a 390 × 844 sin tapar; nada del perfil equivocado). Tablas abajo. |
| **F) Duración** | Fecha fija **3 min 58 s** y variable **3 min 57 s** estimados (lectura pausada de 160 palabras por minuto, 15 s por «Hazlo tú», 5 s por respuesta), con progreso, Atrás, Saltar y retomar en las dos. |

#### Revisión · versión 1 · fecha fija (Ana): 15 pasos, 4 «Hazlo tú»

| Paso | Qué enseña | Qué revisé | Qué cambié |
| --- | --- | --- | --- |
| 1 · Te enseño la app en 4 minutos | Con quién se practica y que sirve si te pagan cada mes o semana | Va primero; 2 líneas | Texto más corto; arriba, «Cambiar de versión» |
| 2 · Libre: lo que puedes gastar | El número, con $100 − $40 = $60 | Resalta el número sin taparlo | — |
| 3 · ¿De dónde sale? | Tienes − ahorros − lo que pagas antes de tu quincena | El desglose dice lo mismo, en ese orden; la tarjeta no tapa la lista | — |
| 4 · Anota en 5 segundos (Hazlo tú) | Anotar como hablas | La señal sigue a la persona: (+) → «¿Qué pasó?» → «Guardar»; $290.60 → $284.60 (motor) | Celebración: «¡Eso! Tu libre bajó $6.00.» |
| 5 · Lo que viene | Lo que vence antes de tu quincena ya está restado | El pago de la tarjeta (ya incluido en el número) salía bajo «Con tu quincena del 30» | **App:** la tarjeta va antes del separador (siempre se paga con lo que ya tienes); texto más corto |
| 6 · Marca un pago (Hazlo tú) | Pagado no cambia el libre | «Pagado» junto al teléfono; libre igual | «¡Listo! Tu libre no cambió: ya estaba contado.» (una idea) |
| 7 · Tu próxima quincena | Lo que entra, lo que pagas, lo que te quedaría; pasar lo que sobra | ~$600 · ~$55 · ~$545: los mismos de la tarjeta de la pantalla | Texto más corto |
| 8 · ¿Con qué lo pagas? (Hazlo tú) | «Lo pagas con» y repartir | Señal: el colegio → «Cambiar o repartir» → «Con lo que tienes ahora» → «Guardar»; −$20.00 | «También puedes repartirlo entre dos quincenas.» |
| 9 · Con el aguinaldo | Un pago puede salir del aguinaldo | Resalta «Más adelante · Aguinaldo · no suma a tu libre hasta que llegue» | — |
| 10 · Adelanto de salario | El adelanto y su descuento | Igual a V2-56: «Ingreso esperado» → «Adelanto» (comprobado en el formulario) | Texto nuevo, ≤ 2 líneas |
| 11 · Ahorros | Ponerle nombre a una parte; no se mueve | Resalta «Ahorros» en Mi dinero | — |
| 12 · Cuadra tu efectivo (Hazlo tú) | Decir cuánto tienes; lo que falta queda «sin detalle» | «La app cree» = saldo del motor ($19.00 → $15.00); −$4.00 | Texto más corto |
| 13 · Tarjetas y préstamos | Tarjeta baja el libre ese día; anotar el estado de cuenta | Resalta «Deudas»; el botón de la app es «Anotar estado de cuenta» | «… cuando llegue tu estado de cuenta, anótalo.» |
| 14 · ¿Volviste después de días? | «Pongámonos al día», sin culpa | El nombre es el de la tarjeta de la app | Más corto |
| 15 · ¿Lo entendí? | 4 preguntas | Un «Casi» → repaso solo de ese paso → volver | Cuarta pregunta (V2-58) y explicaciones más cortas |

#### Revisión · versión 2 · ingresos que varían (Rosa): 15 pasos, 4 «Hazlo tú»

| Paso | Qué enseña | Qué revisé | Qué cambié |
| --- | --- | --- | --- |
| 1 · Te enseño la app en 4 minutos | Rosa: vende pupusas y recibe remesa | Ninguna pantalla de la versión dice «quincena» (comprobado en cada paso) | Nuevo |
| 2 · Libre: lo que puedes gastar | Libre hasta fin de mes | La portada dice «Hasta fin de mes · 11 días» | Nuevo |
| 3 · ¿De dónde sale? | Tienes − ahorros − lo que pagas antes de fin de mes | El desglose decía «Por pagar en este periodo» | **App:** «Por pagar antes de fin de mes» (o «en estos 15 días») |
| 4 · ¿Hasta cuándo? | Elegir fin de mes o 15 días | Antes solo se elegía el primer día | **App:** «¿Hasta cuándo ves tu libre?» en «¿De dónde sale?» |
| 5 · Anota una venta (Hazlo tú) | «vendí 45» suma, tan fácil como un gasto | «Muéstrame» en dos toques; $80.00 → $125.00 | Nuevo |
| 6 · Un gasto del negocio (Hazlo tú) | «queso 12» | A mano; $125.00 → $113.00 | Nuevo |
| 7 · Lo que viene | Lo de antes de fin de mes ya está restado | La lista de Hoy no separaba lo del mes que viene | **App:** separador «Con lo que tengas cuando venza»; el texto nombra la cuota del 25 |
| 8 · La remesa que esperas | No suma hasta que llega; «Ya llegó» | «Esperado · suma cuando llegue» en Pagos; «Ya llegó» en su ficha; el aviso «Guardado · Deshacer» del paso anterior tapaba la fila | **Recorrido:** al pasar de paso se quita el aviso del «Hazlo tú» (era el PENDIENTE 1 de la v2.4) |
| 9 · El próximo mes | Pagas ~$191; las ventas no se cuentan antes | ~$191 y «entra ~$0» son los de la pantalla | Nuevo |
| 10 · Guarda para el alquiler (Hazlo tú) | La sugerencia; tú decides | «Sí, $191.00» → 40 → «Reservar»; $113.00 → $73.00; el alquiler dice «Reservando $40.00 de lo que tienes ahora» | Nuevo |
| 11 · ¿Semana mala? | Libre en $0, cuánto falta, sin culpa | Se simula solo en ese paso (efectivo $20) y se deshace al salir, al saltar, al retomar y al repasar; «Faltan $50.00 para cubrir tus ahorros» | Nuevo. **App:** el resumen de avisos decía «te faltarían ~$191 el undefined» → «… el próximo mes» |
| 12 · Ahorros | Nombre a una parte; no se mueve | Mi dinero: «Tienes $238.00 = ahorros $80.00 + por pagar $45.00 + reservado $40.00 + libre $73.00» | Nuevo |
| 13 · Cuadra al final del día (Hazlo tú) | Contar el efectivo al final del día | $143.00 → $140.00; −$3.00 «sin detalle» | Nuevo |
| 14 · ¿Volviste después de días? | Qué llegó, qué pagaste y cuánto tienes | Son los 3 pasos de «Pongámonos al día» | Nuevo |
| 15 · ¿Lo entendí? | 4 preguntas | Un «Casi» → «Repasar «La remesa que esperas»» | Nuevo |

**También (colaterales directos de la revisión):** «¿Es tu remesa de Josué del 28 adelantada…?» ya no escribe el nombre en minúsculas; «Contarle a Victor» dice qué recorrido hizo («hice el recorrido de fecha fija y salté el de ingresos que varían»); el menú dice «18 ejercicios»; «Casos y ayuda» → «Explorar libre» suma «Rosa · ventas».

### Decisiones técnicas v2.4.1 — REVISAR

- **Progreso por versión** en `pamplanea-entrenamiento`: `tourVersion` (la última elegida), `tourPasos` (dónde iba en cada una) y `tours` (hecho o saltado). Lo de la v2.4 (`tour`, `tourPaso`) se lee como de la versión fija. Nada de esto toca los datos de uso: **sin cambio de esquema**.
- **La semana mala se simula** con un cuadre marcado (`ref: 'semana-mala'`) que se quita al salir del paso; nunca queda en los ejemplos.
- **Al terminar o saltar la versión variable**, los ejemplos quedan con Rosa como al inicio (para practicar lo de tu versión); «Ana · quincenal» en «Casos y ayuda» vuelve a Ana.
- **«¿Hasta cuándo ves tu libre?»** usa el `horizonteVariable` que ya existía (antes solo se elegía el primer día): sin campo nuevo.

### PENDIENTE (lo vi y no lo toqué)

1. *(Resuelto en la v2.5, V2-59 #27.)* Para quien vende, la tarjeta «El próximo mes» dice «entra ~$0» (la app no cuenta ventas que no han pasado). El recorrido lo explica; el texto de la app no cambió (ver pregunta 27).
2. *(v2.5: «Cambiar de versión» está en la intro de «Lo esencial» y en «Aprende más».)* «Cambiar de versión» está en los pasos explicados; en la barra de «Hazlo tú» no cabe (desde ahí: «Saltar» y volver a entrar).
3. Con ingreso fijo, una sugerencia de la app todavía dice «ese periodo pagas…» (texto de la app, no del recorrido).
4. *(Resuelto en la v2.5: el capítulo «Volver después de días» tiene su «Hazlo tú».)* Sigue de la v2.4: «Pongámonos al día» se explica en el recorrido, pero se practica en «Practicar» («Volver después de dos semanas»).

### Calidad (v2.4.1)

- **`herramientas/v241.mjs`** (por file:// en Serena claro y servida en Serena oscuro, a 390 × 844). **Parte 1:** «¿Qué es?» con sus 8 tipos y frecuencias; «Adelanto» con su descuento en el mismo formulario, al crear y al editar; Anotar «me dieron adelanto 100» (suma hoy y pregunta) y «adelanto 150 el 28» (ingreso esperado); **tarjeta con corte 21 → 5 → pago 20** (textos, avisos y su pago en Pagos) y un estado ya anotado que no se toca; 4 preguntas; al saltar, los ejemplos al inicio con su aviso; «Muéstrame» en dos toques que sigue a la persona; consejos de Anotar y de la ficha de un pago. **Parte 2:** la pregunta, «Ahora no», cambiar de versión y retomar; **cada versión completa** (2 «Hazlo tú» a mano y 2 con «Muéstrame» en dos toques; Atrás; Saltar y «Sigue tu recorrido» desde Hoy; el quiz con un «Casi» y «Repasar»; al terminar, los ejemplos al inicio); la **revisión automática de cada paso** (≤ 2 líneas medidas en pantalla; lo que se nombra entre «» se ve en la pantalla; el resaltado rodea lo que explica, se ve y la tarjeta no lo tapa; los números son los del motor; en la versión variable ninguna pantalla dice «quincena»); «Practicar» con los 5 ejercicios nuevos hechos por la interfaz; legibilidad (sin palabras prohibidas, frases ≤ 20 palabras) y duración: **fecha fija 3 min 58 s, variable 3 min 57 s**.
- `v24.mjs`, `recorrer-modos.mjs`, `v231.mjs` y `aceptacion-v23.mjs`, al día con la pregunta nueva y el formulario nuevo. **Todas las pruebas pasan** por file:// y servidas, sin errores de consola: motor, guía (13 casos), modos, sets A/B, aceptación (Victor: **Libre $95.00 · ~$7.90 por día; la próxima ~$1,477 · ~$1,196 · ~$281**), entrega 2, viaje, PWA (actualizar sin perder datos), v2.3.1, v2.4 y v2.4.1.
- Contraste ≥ 4.5:1 en los 4 temas (mínimo 5.27), incluido lo nuevo: la pregunta, «Cambiar de versión» y las marcas Fecha fija / Varía / Para todos.
- Capturas de las dos versiones mirándolas una por una (Serena claro y Serena oscuro): de ahí salieron el aviso que tapaba la remesa, la tarjeta bajo «Con tu quincena del 30» y el «Por pagar en este periodo».

### PREGUNTAS PARA VICTOR (v2.4.1)

26. **RESPONDIDA (V2-59): Rosa se queda.** **Rosa** (pupusas en su casa, remesa de su hijo, alquiler y cuota de la cooperativa): ¿se parece a las personas de tu familia que tienen ingresos que varían, o usamos otro oficio?
27. **RESPONDIDA (V2-59): «Tus ventas cuentan cuando las anotas».** Para quien vende, «El próximo mes» dice **«entra ~$0»** porque no cuenta ventas futuras. ¿Lo dejamos así o decimos «tus ventas cuentan cuando las anotas»?
28. **RESPONDIDA (V2-59): también en Tu cuenta → «Cómo te entra el dinero».** **«¿Hasta cuándo ves tu libre?»** se cambia en «¿De dónde sale?». ¿Basta ahí, o también en «Tu cuenta → Cómo te pagan»?
29. **RESPONDIDA (V2-59): un ejemplo con «Ver un ejemplo» y «Volver a mis números».** El paso **«¿Semana mala?»** muestra a Rosa un momento con $20 en efectivo y vuelve a como estaba. ¿Se entiende como ejemplo?
30. *(Sigue abierta: ver la 35.)* Sigue abierta la 25: ¿cronometramos a una persona de la familia haciendo cada versión (sin ayudarla)?

---

## Prototipo v2.4 (2026-10-17): entrenamiento a prueba de todo

**Para quién:** la familia de Victor (personas sin experiencia en apps de finanzas), antes de poner sus datos. APROBADO por Victor (2026-10-17): «que el usuario entienda a la perfección cómo funciona, súper amigable».

### Antes de la v2.4 (aprobado por Victor; commit `022c170`)

1. **Faltante solo por fechas:** si en total el periodo alcanza pero un pago vence antes de que llegue otro ingreso, el aviso (ámbar) dice el día y la causa: «El 16 te faltarían ~$51 hasta que llegue el adelanto (el 20)», «En total sí te alcanza, pero el seguro vence antes. ¿Lo pagas con tu quincena del 29 o reservas solo $51.00?», con «Pagarlo con tu quincena del 29» (abre «¿Con qué pagas…?» con esa opción ya elegida), «Reservar $51.00» y «No, después veo». Hoy y Pagos → Próxima dicen lo mismo («Ojo: el 16…»). Nunca «entra más de lo que pagas» y «te faltarían» sin la fecha.
2. **«¿Con qué pagas…?» de un pago lejano:** como mucho tres opciones (la de siempre y las dos más cercanas antes de que venza, más la que ya está elegida) y «Ver más quincenas (5)».
3. **El entrenamiento y los ejercicios incluyen** pagar con el aguinaldo (V2-52), la tarjeta del primer día (V2-54) y el adelanto con descuento (ver abajo).

### Qué cambió

| Pedido | Dónde se ve |
| --- | --- |
| 1. Recorrido nuevo | 15 pasos, una idea por paso y como mucho 2 líneas, con números redondos («Tienes $100 y antes de tu quincena pagas $40: te quedan $60 libres»), de tú y sin culpa: el número · de dónde sale · **anota** · lo que viene · **marca un pago** · tu próxima quincena (y pasar lo que sobra) · **¿con qué lo pagas?** · con el aguinaldo · adelanto de salario · ahorros · **cuadra tu efectivo** · tarjetas y préstamos (y la del primer día) · volver después de días · «¿Lo entendí?». Progreso visible («Recorrido · 3 de 15» y una barra), Atrás, Saltar y retomar donde se quedó («¿Sigues donde te quedaste? · Ibas en el paso 13 de 15» y, en Hoy, «Sigue tu recorrido»). |
| 2. «Hazlo tú» | En los 4 pasos en negrita la persona hace la acción de verdad con los datos de Ana: una barra arriba («Hazlo tú · 4 de 15») que no tapa la app (las hojas abren debajo de ella) con «Muéstrame» (la app lo hace paso a paso) y «Siguiente» (se puede saltar). Al hacerlo: «¡Lo hiciste! 🎉 · Libre $290.60 → $284.60 · ¡Eso! Ya está anotado: tu libre bajó $6.00». Marcar el teléfono Pagado: «Tu libre no cambió: ya estaba contado. Lo que tienes bajó $15.00». |
| 3. «¿Lo entendí?» | Tres preguntas (libre, con qué se paga, dónde queda el ahorro), una a la vez. Nunca «incorrecto»: «Casi: a los $100 réstale los $40…». Al final «Te fue bien: 2 de 3. ¿Repasamos lo que faltó?» con «Repasar «Libre: lo que puedes gastar»» (solo ese paso) y «Volver a las preguntas». |
| 4. Ayuda en el momento | Un «?» discreto (24 px a la vista, 44 px para tocar) junto a **Libre** (en el número), **Próxima quincena**, **Lo pagas con** (ficha del pago), **Ahorros**, **Cuadrar** (en la hoja) y **Deudas**: abre 2–3 líneas con un ejemplo, debajo, sin tapar nada. Con tus datos, la primera vez en Hoy, Pagos, Mi dinero, Cuentas, Ahorros, Deudas y Mes: un consejo corto con «Entendido» (una sola vez por pantalla). |
| 5. «Aprende» | Tu letra → Aprende: el glosario (Libre, Lo pagas con, Próxima quincena, Ahorros, Cuadrar, Deudas, Tarjeta de crédito, Adelanto de salario, Aguinaldo y bonos, Pongámonos al día, Sin detalle) con los mismos textos que los «?» (`glosario.js`), y «Ver el recorrido» / «Practicar». |
| 6. «Practicar» | 13 ejercicios de fácil a difícil, con su nivel: Anotar «pupusas 6», Recordatorio del colegio, Usar el ahorro Laptop, Llega la quincena (Fácil) · Volver después de dos semanas, Primer día (ahora con «Tarjeta»), Carlos con poco dinero, Carlos: semanal y alquiler, **Pagar con el aguinaldo** (Media) · **Adelanto de salario**, Llega el estado de cuenta, + Tarjeta o préstamo, Regalo olvidado (Difícil). Los dos nuevos solo están en «Practicar»; la guía sigue con sus 13 recorridos. |
| 7. Accesibilidad | El foco va al título de cada paso (en «Hazlo tú», a la instrucción, solo al entrar: nunca se le quita el foco a quien está escribiendo); lector de pantalla («Paso 4 de 15»); Escape sale del recorrido, pero en «Hazlo tú» cierra la hoja abierta; botones de 44 px; la celebración no se mueve con «reducir movimiento»; contraste ≥ 4.5:1 en los 4 temas. |

### Decisiones técnicas v2.4 — REVISAR

- **El recorrido usa una Ana preparada:** su luz de octubre ya está pagada y tiene el teléfono ($15) el 25, antes de su quincena, para practicar «Pagado» con un pago que ya está contado (la lección «tu libre no cambia»). Lo que la persona hace en el recorrido se queda en los ejemplos (si lo salta, se queda esa Ana: libre $290.60); «Reiniciar ejemplos» vuelve a la Ana de siempre ($270.60).
- **Duración:** medida con lectura pausada (160 palabras por minuto) de todo lo que se lee (pasos, celebraciones, preguntas con su explicación y el final), 15 s por cada «Hazlo tú» y 5 s por respuesta: ≤ 4 minutos (ver Calidad).
- **El progreso del recorrido** se guarda en el entrenamiento del teléfono (`pamplanea-entrenamiento`, `tourPaso`); los consejos ya vistos, en `pamplanea-modo` (`tips`). Nada de esto toca los datos de uso normal: sin cambio de esquema.
- **El «?» no abre una hoja:** muestra la explicación debajo (así no se pierde lo que estabas haciendo, por ejemplo en «Cuadrar»).

### PENDIENTE (lo vi y no lo toqué)

1. El aviso de un «Hazlo tú» (por ejemplo «Listo. Reservas $20.00 desde hoy») sigue a la vista unos segundos en el paso siguiente.
2. «Pongámonos al día» se explica en el recorrido, pero no se practica ahí (está en «Practicar»: «Volver después de dos semanas»).

### Calidad (v2.4)

- **`herramientas/v24.mjs`** (por file:// en Serena claro y servida en Ancla oscuro): legibilidad (ninguna palabra de la lista prohibida —periodo, saldo inicial, ledger, ajuste, conciliación, asignación, proyección— ni frases de más de 20 palabras en el recorrido, el glosario y los consejos), duración estimada **3 min 59 s** (436 palabras a 160 por minuto, más 4 × 15 s y 3 × 5 s), el recorrido completo a 390 × 844 como una persona sin experiencia (4 «Hazlo tú»: dos a mano y dos con «Muéstrame»; Atrás; Saltar y retomar; Escape), «¿Lo entendí?» con una respuesta «Casi» y repaso, los 6 «?» (44 px, mismos textos que «Aprende»), los consejos (una vez por pantalla, solo con tus datos), «Practicar» (orden, niveles, los ejercicios del aguinaldo y del adelanto completados por la interfaz), reducir movimiento y contraste en los 4 temas.
- Las pruebas de aceptación (Victor: Libre $95.00 · ~$7.90 por día; la próxima ~$1,477 · ~$1,196 · ~$281) y todas las de siempre siguen pasando.

### PREGUNTAS PARA VICTOR (v2.4)

21. **¿Lo entendí?** pregunta por el libre, con qué se paga y dónde queda un ahorro. ¿Cambiamos alguna por «al marcar Pagado, tu libre no cambia» (hoy se aprende haciendo)?
22. **Lo que se hace en el recorrido se queda en los ejemplos** (la persona ve lo que hizo). ¿O prefieres que al terminar vuelva la Ana de siempre?
23. **«Muéstrame»** hace la acción solo, paso a paso (unos 3 segundos). ¿Así, o prefieres que solo señale dónde tocar?
24. **Los consejos de la primera vez** salen en 7 pantallas. ¿Agregamos la ficha de un pago y Anotar, o son suficientes?
25. Para confirmar los 4 minutos: ¿cronometramos a una persona de la familia haciendo el recorrido (sin ayudarla)?

---

## Prototipo v2.3.1 (2026-10-17): ajustes puntuales + corrección adicional

**Alcance:** solo estos cambios y sus efectos directos (sin revisión integral). Sin cambio de esquema: lo nuevo son campos opcionales (`tarjeta.pagoUsual`, `tarjeta.desde`, `ingreso.adelanto`) y claves `unico:<id>` en «Lo pagas con»; los datos de antes se leen igual.

### Decisiones V2-50 a V2-55 (APROBADAS por Victor, 2026-10-17)

- **V2-50 Anotar sin teclado de golpe:** en el teléfono (`pointer: coarse`) el (+) abre la hoja sin enfocar el campo: se ven el campo, la nota del micrófono y los atajos; el teclado sale al tocar el campo o un atajo que pide escribir. En la computadora (`pointer: fine`), foco directo al campo. El lector de pantalla va al título de la hoja. Escape y la vuelta del foco, igual.
- **V2-51** Se **ACEPTA** el cambio de la E3 a V2-16: un ingreso que llega antes de su día queda para su quincena; «Usarla desde ya» disponible. Ver «Revisión integral v2.3» (queda **APROBADO**).
- **V2-52 (#17)** Un pago se puede asignar («Lo pagas con») a un ingreso esperado de una vez (aguinaldo, Quincena 25, bono). No cuenta hasta que llega. Si llega la fecha de vencimiento y el ingreso no ha llegado: un aviso ámbar «La matrícula la ibas a pagar con el aguinaldo, que todavía no llega. ¿Con qué la pagas?».
- **V2-53 (#19)** Confirmado: una compra anotada con fecha futura dentro del periodo actual baja el libre de hoy y no baja «Tienes». Sin cambio de código.
- **V2-54 (#20)** El chip «Tarjeta» de los pagos fijos de la configuración crea una **tarjeta de crédito real** (nombre, día de pago, «¿Cuánto pagas normalmente?») con su pago en Pagos y su ficha en Deudas. El día de corte y el estado de cuenta se piden después, como V2-24.
- **V2-55** Pendientes chicos de la v2.3: **a)** un pago vencido ya no aparece dos veces en Hoy: queda en el aviso agrupado y sale de «Próximos pagos»; **b)** Pagos → Mes trae arriba «Entra ~$X · pagos ~$Y · queda ~$Z», con los números del motor.
- **#18** El cuchubal de Victor se queda «cada quincena, el 8 y el 23». Sin cambio.

### Cómo quedó (v2.3.1)

| Decisión | Dónde se ve |
| --- | --- |
| V2-50 | (+) en el teléfono: hoja «Anotar» con el foco en su título (sin teclado); «Gasté», «Recibí»… sí abren el teclado en su primer campo. En la computadora, el cursor ya está en «¿Qué pasó?». |
| V2-51 | Sin cambio de código (ya estaba en la v2.3). |
| V2-52 | Ficha del pago → «Cambiar o repartir»: «Con tu aguinaldo del 12 dic · Te caen ~$1,000 el 12 dic · no cuenta hasta que llegue» (solo ingresos de una vez que llegan antes de que venza y que todavía no llegan). La ficha dice «Con tu aguinaldo del 12 dic $100.00»; el detalle del número: «Aguinaldo (~$1,000, 12 dic): suma cuando llegue; con eso pagas la matrícula». Cuando llega, lo asignado queda reservado de lo que tienes. Si vence (o la persona dijo «No me va a caer») sin que llegue: aviso ámbar con «Elegir con qué». |
| V2-53 | Documentado (§6 #19). |
| V2-54 | Primer día, paso 4 → «Tarjeta» → «Tarjeta de crédito»: Nombre, «¿Cuánto pagas normalmente?», «¿Qué día la pagas?» y «Tu día de corte y tu estado de cuenta te los pido después». Queda en Deudas («Pagas ~$100 el 5 · estado de cuenta por anotar»), en Pagos (~$100 estimado, con «Pagado») y en Hoy («Incluye tarjeta ~$100, vence el 5»). Desde 10 días antes de que venza: «¿Ya te llegó tu estado de cuenta?», que pide también el día de corte. |
| V2-55 a | Hoy: «Próximos pagos» solo trae lo que viene; los vencidos están en el aviso (todos desde que empezaste, con cada nombre una vez: «Alquiler (3), Luz (3)…»). |
| V2-55 b | Pagos → Mes: «Entra ~$1,163 · pagos ~$713 · queda ~$450 · Lo que te pagan y lo que pagas en octubre. Sin tus gastos del día a día (esos están en la pestaña Mes)». |

### Corrección adicional (pedida por Victor con sus datos reales; adelanto APROBADO por Victor, 2026-10-17)

Victor vio «entra ~$1,163 · te faltarían ~$33» y un aviso ámbar falso: su próxima quincena (29 oct – 13 nov) recibe quincena ~$597 + pareja ~$566 + «Adelanto de Salario» ~$314 = ~$1,477 y paga ~$1,196: le quedan ~$281.

1. **La proyección de un periodo cuenta TODOS los ingresos esperados con fecha en ese periodo**, también los de una vez (adelanto, aguinaldo, bono, Quincena 25), como estimados («incluye ~$566 de tu pareja y ~$314 de adelanto»). «No suma hasta que llegue» sigue solo para el libre de HOY. El aviso de faltante usa la misma cuenta. Lo que pagas con un ingreso de una vez (V2-52) va en el periodo de ese ingreso.
2. **Adelanto de salario:** al crear un ingreso de una vez, «Es un adelanto de mi salario» → «¿De qué quincena te lo descuentan?» (tus próximas quincenas; una o varias, con «¿Cuánto?» de cada una; por defecto todo el adelanto de la primera). Esa quincena baja en la proyección y en el calendario («Quincena ~$283 · Esperado · te descuentan $314.00 del adelanto»), y al confirmarla el monto sugerido ya viene con el descuento. Nunca se cuenta dos veces. Si el periodo queda corto, el aviso normal lo dice con tiempo («El 14 te caen ~$949 (ya sin los $314.00 del adelanto)…») y ofrece reservar de antes. Para los datos que ya existen: la ficha de un ingreso de una vez llamado «Adelanto…» (o «Anticipo», «Vale») pregunta «¿Es un adelanto de tu salario?».
3. **«Más adelante» empieza después del periodo «Próxima»:** un ingreso de una vez se ve solo en el periodo de su fecha.
4. **Tarjeta agregada después de empezar (V2-43):** no muestra un pago con fecha de antes de que empezaras (ni de antes de agregarla): espera su siguiente corte. «Corta el 21» si todavía no llega; «cortó el 21» si ya pasó (y el botón «Llegó mi estado de cuenta» aparece desde el corte).
5. **Revisado:** (a) **el cuchubal en $50 el 30-oct** no es una suma de la app (ninguna pantalla junta dos cuotas en una fila; cada fila muestra el monto guardado). En la v2.2 el cuchubal se guardaba siempre **cada semana (viernes por defecto)**, y el 30-oct es viernes: tus datos tienen ese cuchubal semanal con $50. Arreglo: Pagos → Mis pagos e ingresos → Cuchubal → Editar → «Cada quincena», 8 y 23, $25. (b) **Un «Préstamo» creado como pago normal** ahora ofrece en su ficha «¿Es una deuda? · Anotarla en Deudas» (tipo y «¿Cuánto debes?»): es el mismo pago, no se duplica.

**«Compartir copia» no funcionaba (reportado por Victor):** compartía un archivo `.json`, que Chrome en Android no deja compartir, y el error se tragaba (el botón no hacía nada). Ahora comparte el mismo contenido como `pamplanea-copia-AAAA-MM-DD.txt`; si el teléfono no deja compartir, la descarga y lo dice («Tu teléfono no dejó compartirla: la guardé en Descargas»). «Restaurar» acepta `.json` y `.txt`.

### Decisiones técnicas v2.3.1 (cómo interpreté lo aprobado)

- **V2-52:** si el ingreso de una vez no llega a tiempo, **nada cambia solo**: el pago sigue sin bajar tu libre hasta que elijas con qué pagarlo («Elegir con qué»), o lo marques Pagado. El aviso también sale si dijiste que ese ingreso no va a llegar. Solo se ofrecen ingresos de una vez con fecha en o antes del vencimiento. Si ese ingreso se borra o cambia a una fecha posterior al vencimiento, el pago vuelve a su ingreso de siempre.
- **V2-54:** hasta su primer estado de cuenta, la tarjeta cuenta en tu libre lo que pagas normalmente (estimado, V2-13: lo que decides pagar), con su fecha de pago; lo que debes de verdad queda «Por confirmar» (en Mi dinero cuenta como «Cuotas $X al mes», nunca «Debes $0.00» ni un «Debes» inventado). El estado de cuenta (con el día de corte) se pide desde 10 días antes de que venza. **Las «Tarjeta» creadas como cuota con la v2.3 se dejan como están** (siguen funcionando como cuota, con su historial; Victor y Pam empezaron con la v2.2, que no tenía ese chip). Para llevarla como tarjeta: Deudas → «+ Tarjeta o préstamo» → Tarjeta de crédito, y «Ya no aplica» en la cuota.
- **V2-55 a:** el aviso de vencidos ahora trae todos los vencidos desde que empezaste (antes, los de los últimos 62 días), porque ya no se ven en «Próximos pagos».
- **V2-55 b:** el mes cuenta lo que llegó o pagaste (por lo que fue) y lo demás por lo esperado; también lo vencido de ese mes. No cuenta los descuentos del salario (lo que te cae ya viene sin ellos) ni lo saltado; una tarjeta sin monto todavía se dice aparte («+ tus tarjetas»).
- **Adelanto:** el descuento se guarda en el adelanto (`adelanto.descuentos`: de qué ingreso, qué fecha y cuánto). Si el adelanto no va a llegar, no se descuenta nada. Se ofrecen las próximas quincenas de tus ingresos que se repiten (no las de tu pareja ni la remesa), hasta 75 días después.
- **Editar una deuda que no es mensual** abre el formulario de pago de siempre (el de deudas es solo mensual), así no se pierde su frecuencia.

### PENDIENTE (lo vi y no lo toqué)

1. Cuando a un periodo le falta solo por las fechas (un pago vence antes de que llegue otro ingreso del mismo periodo), el aviso dice «El 14 te caen ~$949 … y ese periodo pagas ~$925: te faltarían ~$51», que suena contradictorio. Debería decir «el 16 te faltarían ~$51 hasta que llegue lo demás» (como ya lo dice Pagos → Próxima).
2. «¿Con qué pagas…?» de un pago lejano (la matrícula de enero) lista todas las quincenas hasta esa fecha (8 opciones). Se podría mostrar las tres más útiles y «Ver más».
3. El recorrido y los ejercicios todavía no enseñan V2-52, V2-54 ni el adelanto (queda para la v2.4 «Entrenamiento a prueba de todo»).

### Calidad (v2.3.1)

- **`herramientas/v231.mjs`** (por file:// y servida, en Serena claro y Ancla oscuro): V2-50 (390 táctil: foco en el título, el atajo sí abre el teclado, Escape devuelve el foco al (+); 1440: foco directo), V2-55 (Ana sin la luz vencida repetida; octubre de Victor «Entra ~$1,163 · pagos ~$713 · queda ~$450»), la corrección con el escenario de Victor (libre $95.00 sin cambio; próxima «entra ~$1,477 · pagos ~$1,196 · te quedarían ~$281», sin aviso; «Más adelante» sin el adelanto), el adelanto (su quincena del 14 en ~$283, «te descuentan $314.00 del adelanto», confirmar sugiere $283.00, repartido $60 + $40, aviso a tiempo), V2-52 (con y sin llegada del aguinaldo), la tarjeta agregada después de empezar («corta» / «cortó el 21»), «¿Es una deuda?», V2-54 (primer día con «Tarjeta»: libre $200.00, «Cuotas $100.00 al mes», estado de cuenta con día de corte) y «Compartir copia» (comparte .txt; si no deja, descarga; restaurar desde .txt).
- La prueba de aceptación v2.3 (Victor: Libre $95.00 · ~$7.90 por día) y las de siempre siguen pasando.
- Una ronda visual a 390 × 844 en Serena claro y Ancla oscuro de lo que cambió (`capturas/v231/`).

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

**CAMBIO A DECISIÓN APROBADA — REVISAR** → **APROBADO por Victor (V2-51, 2026-10-17)**

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

1. *(Hecho en la v2.3.1, V2-55 a.)* Un pago vencido aparece en el aviso de Hoy y en «Próximos pagos» (con «Pagado» en los dos). ¿Se quita del aviso cuando ya se ve abajo?
2. *(Hecho en la v2.3.1, V2-52.)* «Lo pagas con» con un ingreso de una vez (aguinaldo) → PREGUNTA #17.
3. *(Hecho en la v2.3.1, V2-55 b.)* Pagos → «Mes» todavía no trae un resumen del mes (entra / pagas) como «Esta quincena» y «Próxima».
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
- *(v2.2; en la v2.4 el recorrido es otro: ver «Prototipo v2.4».)* **«Te enseño la app en 3 minutos»:** 13 pasos sobre los datos de Ana (Hoy y su número, «¿De dónde sale?», Pagos y su calendario, Anotar con texto y dictado, Mi dinero: lugares, apartados, tarjetas y deudas, Mes, la letra). Resalta la zona; Siguiente / Atrás / Saltar; teclado (flechas, Esc, foco atrapado), lector de pantalla (diálogo con título y paso) y movimiento reducido. Si la tarjeta no cabe arriba o abajo de lo resaltado, va al pie.
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
- **Guardar copia** descarga `pamplanea-copia-AAAA-MM-DD.json` (`{app, tipo: "copia-uso", esquema, version, fecha, datos}`); **Compartir copia** usa el menú del teléfono cuando existe y manda el mismo contenido como `pamplanea-copia-AAAA-MM-DD.txt` (Chrome en Android no deja compartir .json); si el teléfono no deja, la descarga y lo dice. **Restaurar** acepta .json y .txt, valida el archivo y muestra qué trae antes de reemplazar. **Borrar todos mis datos**: doble confirmación (solo modo uso).
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
- `sw.js`: caché **versionada** (hoy `pamplanea-proto-v2.6-2026-10-19`) que precarga los 141 archivos publicados; abre sin internet. Una versión nueva se instala en segundo plano y la app muestra «Hay una versión nueva · Actualizar»; al tocarlo guarda y recarga **sin perder datos** (lo guardado tiene su propio formato, independiente de la versión visible). La primera instalación no recarga la página.
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
- **Service worker:** primero la caché (sin importar `?set=…`), luego la red. Solo por http(s). Caché `pamplanea-proto-v2.6-2026-10-19`.

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

17. **RESPONDIDA (V2-52): sí.** **Pagar con un ingreso de una vez:** hoy «Lo pagas con» ofrece lo que tienes ahora y tus días de pago (con lo de tu pareja sumado). El aguinaldo, la Quincena 25 o un bono no cuentan por adelantado. ¿Quieres poder decir «la matrícula de enero la pago con el aguinaldo»?
18. **RESPONDIDA: se queda «cada quincena, el 8 y el 23».** **Tu cuchubal «quincenal con próxima fecha 23-oct»:** lo armé como «Cada quincena, el 8 y el 23». Si en realidad es cada dos viernes (23 oct, 6 nov, 20 nov…), elige «Cada 2 semanas» y la fecha del 23. ¿Cuál es?
19. **RESPONDIDA (V2-53): correcto.** **Anotar con fecha futura:** «zapatos 40» para el 25 queda como pago de una vez: no baja lo que tienes, pero sí tu libre de hoy (vence antes de tu quincena del 29, así que se paga con lo que ya tienes). ¿Correcto?
20. **RESPONDIDA (V2-54): la tarjeta completa.** **«Tarjeta» en pagos fijos (V2-46):** la armé como una cuota mensual (nombre, cuánto pagas más o menos y el día), sin corte ni estado de cuenta, porque así se pide «solo nombre, cuota y día». Si la persona quiere anotar compras con ella, la agrega como tarjeta de crédito en el paso 3 o en Deudas. ¿O preferías que «Tarjeta» aquí fuera la tarjeta completa?

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
| `datos.js`, `motor.js` | Datos inventados (Ana, Carlos y, desde la v2.4.1, Rosa) y cálculos (libre, reservas, tarjeta, intérprete) |
| `app.js`, `hojas.js` | Pantallas, hojas y recorridos |
| `casos.js` | Los 13 casos, los sets A y B de la prueba guiada, los ejercicios de «Practicar» (orden, versión a la que aplican y siete solo de práctica) y la versión visible |
| `arranque.js` | Arranque, guardado en el navegador, casos y simulaciones |
| `ayuda.js` | Pantalla completa, «Ayuda» (v2.6: los tres caminos, y las herramientas de Victor con `?victor=1`), prueba guiada (sin letras), moderador, instalación y versión nueva |
| `modos.js` | v2.2: entrada, modo uso (datos reales, fecha real, avisos al abrir), copia/restaurar/borrar, «¿Cómo te ha ido?», registro de uso y «Cuéntale a Victor o a Pam cómo vas» (v2.6: las dos listas salen de las mismas partes que el texto) |
| `tour.js` | v2.5: el entrenamiento: «¿Cómo te entra el dinero?», «Lo esencial» y los capítulos de «Aprende más» de cada versión (sus ejemplos, sus pasos, su pregunta), «Hazlo tú» con flecha, la pausa con «Entendido», retomar, «Aprende más» y «Practicar» (con el capítulo de antes) |
| `glosario.js` | v2.5: un solo lugar para los textos que explican la app (para qué + ejemplo, en las dos versiones): el entrenamiento, los «?» y «Aprende»; y los consejos de la primera vez |
| `manifest.webmanifest`, `sw.js`, `recursos/iconos/` | App instalable y sin internet |
| `recursos/` | Piel real (tokens, Instrument Sans, emoji Fluent, íconos Lucide, portadas e ilustraciones) con sus licencias |
| `README.md` | Para quien llega al repo: los dos modos, instalar, copia de datos, contarle a Victor |

Fuera del repo (en `.gitignore`, solo en la copia local): `capturas/`. **Desde la v2.6.1, `herramientas/` está en el repo** (no en la caché de la app; ver «`herramientas/` ahora está en el repo» en la sección v2.6.1). Las pruebas de antes: (`recorrer-v2.mjs` 13 casos, `recorrer-sets.mjs` sets A y B, `recorrer-modos.mjs` entrada, entrenamiento, tres personas y copia, `probar-pwa.mjs` (también datos reales tras actualizar), `instalar-ua.mjs`, `contraste*.mjs`, `generar-iconos.mjs`, `generar-sw.mjs` + `sw.plantilla.js`, `servidor.mjs`). Nuevo en la v2.6: `v26.mjs` (menús con solo lo permitido, `?victor=1`, la prueba guiada sin letras y C33 fuera, las listas de «Cuéntale…» contra el texto, privacidad más estricta, sin recordatorios, «Tus datos» desde el entrenamiento, 44 px, movimiento y contraste) y `v26-actualizar.mjs` (la v2.5 de git → la v2.6 en el mismo lugar, con datos, progreso y una prueba a medias; también sin internet). Nuevo en la v2.5: `v25.mjs` (el entrenamiento nuevo completo en las dos versiones, V2-59, la oferta de tarjetas, «Practicar», «?» y «Aprende», legibilidad, movimiento y contraste), `diario-antes.mjs` (las 71 capturas de la v2.4.1 para el diario de fricción) y `sonda-v25.mjs` (recorre un capítulo con capturas, para revisar). Nuevo en la v2.4.1: `v241.mjs` (V2-56 a V2-58, las dos versiones completas con la revisión automática de cada paso y los ejercicios nuevos). Nuevo en la v2.4: `v24.mjs` (el entrenamiento completo, legibilidad, «?», consejos, «Practicar» y contraste). Nuevo en la v2.3.1: `v231.mjs` (V2-50 a V2-55, la corrección adicional y «Compartir copia»). Nuevos en la v2.3: `aceptacion-v23.mjs` (la prueba de aceptación de Victor, migración, Carlos, reparto, pagado y fecha futura), `entrega2-v23.mjs`, `viaje-v23.mjs` (el viaje del dinero), `probar-motor.mjs` (motor y casos borde), `humo-v23.mjs`, `capturas-ux.mjs` y `contraste-v23.mjs`.

## 9. Qué falta

**v2.6:** hecho lo pedido (V2-60 a V2-63: tres caminos, herramientas de Victor con `?victor=1`, la prueba guiada sin letras y sin C33, «Cuéntale a Victor o a Pam cómo vas» con sus dos listas y la tarjeta del final, sin recordatorios, «datos de ejemplo»). Queda lo de «PENDIENTE» en la sección v2.6 y las preguntas 36–39. Para Victor: actualizar en su teléfono, mirar «Ayuda» como lo vería la familia y probar `?victor=1` en la computadora.

**v2.5:** hecho lo pedido (evaluación con el diario de fricción, «Lo esencial» y «Aprende más» en las dos versiones, ritmo y claridad, V2-59, «Practicar» con su capítulo, los «?» y «Aprende» con los mismos textos). Queda lo de «PENDIENTE» en la sección v2.5 y las preguntas 31–35. Para Victor: actualizar y hacer «Lo esencial» de su versión en el teléfono.

**v2.4:** hecho lo pedido (el recorrido nuevo con «Hazlo tú» y «¿Lo entendí?», los «?», «Aprende», los consejos, «Practicar» de fácil a difícil y los tres ajustes previos). Queda lo de «PENDIENTE» en la sección v2.4 y las preguntas 21–25. Para Victor: actualizar, hacer el recorrido completo y luego compartirlo con la familia.

**v2.3.1:** hecho lo pedido (V2-50 a V2-55, la corrección adicional y «Compartir copia»). Queda lo de «PENDIENTE (lo vi y no lo toqué)» en la sección v2.3.1. Para Victor: actualizar sin perder datos, revisar su cuchubal (§ corrección 5a) y marcar su «Adelanto de Salario» como adelanto.

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
