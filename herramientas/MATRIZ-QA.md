# Matriz de QA · v2.6.1 (V2-64, V2-70)

Plan de pruebas de la revisión total pedida por Victor (V2-64: «me gustaria que hicieramos una revision total, completa y profunda a la experiencia de la app, no solo visual pero de acciones en general, como editar cosas, como eliminar cosas y que se puede o no eliminar o como afecta»). Cada fila dice qué se hace, qué debe pasar (con el acuerdo de origen), su prioridad y en qué quedó.

**Prioridad:** P1 = se pierde o se mezcla dinero o datos, un número sale mal, algo se cuenta dos veces o la app se rompe. P2 = editar o eliminar queda mal, cascadas inconsistentes, datos huérfanos. P3 = falta claridad o aviso, sin daño. P4 = cosmético.

**Estado:** ✅ pasa · 🔧 fallaba en la v2.6 y se corrigió en la v2.6.1 · ⏳ para la fase 2 o 3 · 📝 decisión pendiente para Victor.

**Pruebas:** `qa-v261.mjs` (los casos A–F, H y L con el código real de la app y sus invariantes después de cada acción), `atras.mjs` (G), `v261.mjs` (I, J), `numeros-entrenamiento.mjs` (I), `actualizar.mjs` (H), `contraste*.mjs`, `teclado.mjs`, `v25.mjs`, `v26.mjs` (K) y todas las demás (M: cero errores de consola). Las invariantes que `qa-v261.mjs` revisa después de CADA acción: ningún pago activo sin un medio que exista y lleve a un lugar o tarjeta que exista; cada «Pagado» con su gasto y cada gasto nuevo de un pago con su «Pagado»; ningún ingreso activo que caiga en un lugar borrado; cada tarjeta con su medio y ninguna reserva para una tarjeta que no existe; «lo que debes» siempre un entero válido; libre, tienes, por pagar y en tarjetas enteros, y el libre nunca negativo.

## A. Crear, editar, eliminar y deshacer

| ID | Caso | Pasos | Esperado (acuerdo) | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| A-L1 | Crear un lugar (banco con débito) | Mi dinero → Cuentas → Agregar lugar: banco, con débito y cuánto hay | Queda con su primer cuadre y su débito; Tienes sube lo que hay (Regla del cuadre) | P2 | ✅ | qa-v261 |
| A-D1 | Tres deudas seguidas | Agregar préstamo, casa comercial y otro préstamo sin salir | Las tres en Deudas y su cuota en Pagos, una vez cada una (V2-08) | P2 | ✅ | qa-v261 |
| A-D2 | Deuda sin «¿cuánto debes?» | Deuda sin monto → «Anotar cuánto debo» → guardar | Abre y guarda (en la v2.6 se rompía: leía `.debe` de una deuda vacía) | P2 | 🔧 | qa-v261 |
| A-D3 | «Pagado» de una cuota y desmarcar | Pagado de una cuota mayor que lo que se debe; Desmarcar | Lo que debes baja lo que de verdad bajó y vuelve exacto (V2-08, V2-48) | P2 | 🔧 | qa-v261 |
| A-D4 | Editar una cuota ya pagada | Cambiar el monto del pagado | Lo que debes queda coherente con el monto nuevo (V2-48) | P2 | ✅ | qa-v261 |
| A-P1 | Pago mensual completo | Crear, editar monto, Pagado, corregir el pagado, desmarcar, «Ya no aplica» | Cada paso cuenta una vez y sin restos (V2-29 #8, V2-48) | P2 | ✅ | qa-v261 |
| A-I1 | Ingreso esperado | Crear, editar monto, eliminar (con y sin llegadas) | Sin llegadas se borra; con llegadas queda en el historial (V2-43) | P2 | ✅ | qa-v261 |
| A-AP1 | Ahorro | Apartar, liberar, usar y eliminar uno con dinero | Lo eliminado con dinero vuelve a tu libre (ahorros = etiquetas) | P2 | ✅ | qa-v261 |
| A-R1 | Anotación | Gasto → cambiar monto → cambiar a tarjeta → eliminar → deshacer | Sin restos en Mes, en el libre ni en la tarjeta (V2-07) | P2 | ✅ | qa-v261 |
| A-C1 | Cuadrar en $0 | Cuadrar el efectivo en 0 | Se acepta (te quedaste sin efectivo) | P2 | ✅ | qa-v261 |
| A-MV1 | Mover entre lugares | Del banco al efectivo; editar; eliminar | Tienes igual; ni ingreso ni gasto en Mes | P2 | ✅ | qa-v261 |

## B. Dependencias y cascadas

| ID | Caso | Pasos | Esperado (acuerdo) | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| B-L1 | Eliminar un lugar con pagos e ingresos | Eliminar Banco Agrícola de Ana | Antes de eliminar, la app dice qué pagos e ingresos dependen de él y en qué medio o lugar quedan; nada huérfano (V2-18) | P1 | 🔧 | qa-v261 |
| B-L2 | Pagado después de eliminar el lugar | Marcar Pagado un pago que salía de ahí | Resta el dinero del lugar nuevo (en la v2.6 el dinero desaparecía) | P1 | 🔧 | qa-v261 |
| B-L3 | «¿Ya te cayó?» después de eliminar el lugar | Confirmar un ingreso que caía ahí | Suma a un lugar que existe (en la v2.6 se rompía «Reparte») | P1 | 🔧 | qa-v261 |
| B-M1 | Eliminar un medio que usan pagos | Eliminar Transferencia (Colegio, Casa comercial) | Elige con qué se pagan ahora; nada huérfano (V2-18, V2-34) | P2 | 🔧 | qa-v261 |
| B-T1 | Eliminar una tarjeta con una suscripción | Eliminar la tarjeta con Netflix cobrándose en ella | Elige con qué se paga ahora (otra tarjeta primero, si hay); nada huérfano | P1 | 🔧 | qa-v261 |
| B-T2 | Eliminar una tarjeta con compras | Eliminar la tarjeta | Las compras quedan en el historial y en Mes | P2 | ✅ | qa-v261 |
| B-I1 | Eliminar el ingreso principal | Eliminar la quincena | Lo que pagabas con «la del 30» sigue contando (V2-34, revisión v2.3) | P1 | 🔧 | qa-v261 |
| B-I2 | Cambiar los días de la quincena ya llegada | Cambiar 15/30 por 14/29 | No pide confirmar otra vez la de este mes | P1 | ✅ | qa-v261 |
| B-P2 | Cambiar el día de un pago ya pagado | Luz pagada el 12 → día 20 | No se vuelve a pedir ni se cuenta dos veces (V2-48, V2-57) | P1 | 🔧 | qa-v261 |
| B-P3 | Saltar esta vez y cambiar el día | Saltar → cambiar día | El salto se respeta | P2 | 🔧 | qa-v261 |
| B-AP1 | Eliminar un gasto que salió de un ahorro | Mes → el gasto → Eliminar | El dinero vuelve al ahorro (si existe) y se anota «Volvió de un gasto que eliminaste» | P2 | 🔧 | qa-v261 |
| B-AP2 | Eliminar un gasto con crédito que salió de un ahorro | Igual, con tarjeta | Se suelta lo reservado para la tarjeta (V2-27) | P2 | 🔧 | qa-v261 |
| B-AP3 | Editar el monto de un gasto que usó un ahorro | Cambiar el monto | Hoy no ajusta el ahorro | P3 | 📝 | — |
| B-AP4 | Eliminar el gasto de un ahorro ya cerrado (logro) | Eliminar | El logro no se reabre | P3 | 📝 | — |

## C. Sin duplicados ni tipos equivocados (V2-70)

| ID | Caso | Pasos | Esperado (acuerdo) | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| C-01 | Compra con tarjeta | «zapatos 30 tarjeta» | No toca efectivo ni banco, sube lo que debes, un solo gasto, baja el libre ese día (V2-07) | P1 | ✅ | qa-v261 |
| C-02 | Pagar la tarjeta desde el banco | Pagar la tarjeta | Baja el banco y la deuda; no es un gasto nuevo; el libre no cambia (pagar la tarjeta = mover dinero) | P1 | ✅ | qa-v261 |
| C-03 | Suscripción que se cobra en la tarjeta | Marcar Pagado | Cuenta una vez, como compra en esa tarjeta, no del banco (V2-13, V2-34) | P1 | ✅ | qa-v261 |
| C-04 | Pago fijo con la débito de una cuenta | Marcar Pagado | Sale de esa cuenta y de ninguna otra (V2-18) | P1 | ✅ | qa-v261 |
| C-05 | Cuota de préstamo | Marcar Pagado | Sale del medio elegido, baja lo que debes, una sola vez (V2-08) | P1 | ✅ | qa-v261 |
| C-06 | Cuotas de tarjeta (compras a cuotas) | — | No están modeladas: cada estado de cuenta trae su total | P2 | 📝 | — |
| C-07 | Anotar algo que ya es un pago | «luz 35» | Se marca ese pago, no se duplica (Conexión 4) | P1 | ✅ | qa-v261 |
| C-07b | Anotar otra vez un pago ya pagado | «luz 35» con la de octubre pagada | Avisa «Ya marcaste el pago «Luz» del …: esto se guarda como un gasto aparte» | P3 | 🔧 | qa-v261 |
| C-08 | Ingresos con su tipo | «vendí 45», remesa que llegó, «me dieron adelanto 100»; mover entre lugares | Cada uno con su tipo (V2-56); mover no es ingreso ni gasto | P2 | ✅ | qa-v261 |
| C-09 | «me pagaron 600» | Anotarlo cerca de la quincena | Pregunta si es la quincena o un extra y cuenta una vez (V2-29 #10) | P2 | ✅ | qa-v261 |
| C-10 | Adelanto reconocido por su nombre | «me dieron adelanto 100» con «Vale de la empresa» esperado | Lo reconoce (la expresión de la v2.4.1 tenía caracteres de retroceso en vez de `\b`) | P2 | 🔧 | qa-v261 |
| C-11 | Gasto fijo que se cobra solo en una tarjeta (cargo automático) | — | No existe como tal: cuenta una vez al marcar Pagado con esa tarjeta | P2 | 📝 / ⏳ fase 2 (V2-68) | — |

## D. Números

| ID | Caso | Pasos | Esperado (acuerdo) | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| D-01 | Leer montos | «1,000.50», «1000,50», «1.000,50», «.5», espacios, letras, negativos, 9 dígitos | Se entienden los válidos; el resto se rechaza (en la v2.6 «.5» y «1.000,50» no se leían) | P2 | 🔧 | qa-v261 |
| D-02 | ~$ por día | Libre que no divide exacto | Hacia abajo (V2-29 #12) | P2 | ✅ | qa-v261 |
| D-03 | Libre nunca negativo | Ana con efectivo y banco en $0 | Libre $0 y el faltante exacto (V2-31 #6) | P1 | ✅ | qa-v261 |
| D-04 | Números del entrenamiento = pantalla | Cada paso, pausa y pregunta de las dos versiones y «Practicar» | Cada monto del texto se ve en la pantalla (V2-76; en la v2.6, 88 textos no coincidían) | P1 | 🔧 | numeros-entrenamiento |

## E. Fechas

| ID | Caso | Pasos | Esperado (acuerdo) | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| E-01 | Día 31, febrero, cambio de año | Pagos el 31 en meses cortos | Caen el último día del mes; enero sigue a diciembre | P2 | ✅ | qa-v261, probar-motor |
| E-02 | Tarjeta que cruza el mes | Corte 31, pago 15 | El ciclo no pierde días (V2-57) | P2 | ✅ | qa-v261 |
| E-03 | Fecha real y simulada | Uso: el día del teléfono; entrenamiento: la fecha de los ejemplos | Nunca se mezclan | P2 | ✅ | recorrer-modos |

## F. Validaciones

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| F-01 | Nombres | Vacío, solo espacios, 80+ caracteres, emoji | Vacíos con su mensaje; largos y con emoji se guardan | P2 | ✅ | qa-v261 |
| F-02 | Montos fuera de rango | 1234567 | «Puede ser de hasta $1,000,000.00» (antes: «Escribe el monto») | P3 | 🔧 | qa-v261 |
| F-03 | Doble toque en Guardar | Dos toques reales | Guarda una vez y no se rompe | P2 | 🔧 | qa-v261 |

## G. Navegación (V2-72)

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| G-01 | Atrás en Hoy sin nada abierto | Atrás del teléfono | Sale de la app (no atrapa) | P1 | 🔧 (no había botón atrás) | atras |
| G-02 | Atrás en otra pestaña o pantalla | Pagos → atrás; Mi dinero → Cuentas → atrás → atrás | Vuelve a la anterior y luego a Hoy | P1 | 🔧 | atras |
| G-03 | Atrás con una hoja abierta | Anotar → atrás | Se cierra y el foco vuelve a lo que la abrió | P1 | 🔧 | atras |
| G-04 | Atrás con algo escrito | Anotar «pupusas 6» → atrás | «¿Descartar los cambios?» («Seguir editando» / «Descartar»); igual al tocar fuera o con Escape | P1 | 🔧 | atras |
| G-05 | Atrás en Ayuda | Ayuda → Tus datos → atrás → atrás | Vuelve a Ayuda y la cierra | P2 | 🔧 | atras |
| G-06 | Atrás en el entrenamiento | Paso 3 → atrás… | Retrocede un paso; en el primero pregunta «¿Salir del entrenamiento?» | P2 | 🔧 | atras |
| G-07 | Atrás en la prueba guiada | Tarea en curso → atrás | «¿Pausar la prueba?» | P2 | 🔧 | atras |
| G-08 | Atrás en el Primer día | Paso 3 → atrás | Paso 2 | P2 | 🔧 | atras |
| G-09 | Recargar | Con Pagos abierto o en Hoy | Sin estados raros: guarda solo si hay a qué volver | P2 | 🔧 | atras |
| G-10 | Escape y foco | Escape con y sin cambios | Igual que antes; foco de vuelta | P2 | ✅ | atras, teclado |
| G-11 | Teclado, rotación y safe areas | Teléfono real | Botón principal sobre el teclado; notch y Dynamic Island | P2 | ⏳ fase 3 (no se puede en headless) | — |

## H. Persistencia

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| H-01 | Dos pestañas | Guardar en una y en otra | Nada se pierde: la segunda se pone al día antes de escribir | P1 | 🔧 | qa-v261 |
| H-02 | El teléfono no deja guardar | Almacenamiento lleno o bloqueado | Tarjeta en Hoy «No se están guardando tus datos» con «Guardar una copia» | P2 | 🔧 | qa-v261 |
| H-03 | Actualizar desde la v2.5 | v2.5 con datos, progreso y prueba a medias → v2.6.1 | Todo igual, también sin internet | P1 | ✅ | actualizar --ref=7c0d06e |
| H-04 | Actualizar desde la v2.6 | Igual desde la v2.6 | Todo igual | P1 | ✅ | actualizar --ref=ca97256 |
| H-05 | Copia → borrar → restaurar | Tus datos | Vuelve todo | P1 | ✅ | recorrer-modos, v231 |
| H-06 | Pedir que no se borren | Con datos reales | `navigator.storage.persist()` una vez (V2-74) | P2 | 🔧 (no existía) | v261 |

## I. Modos y entrenamiento

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| I-01 | El entrenamiento no toca tus datos | Ir y volver entre modos | Datos reales idénticos | P1 | ✅ | recorrer-modos, v26 |
| I-02 | Retomar y «Empezar de nuevo» en el entrenamiento | Salir a medias | «Sigue donde te quedaste» | P2 | ✅ | v25 |
| I-03 | `?victor=1` | Con y sin | Sin él, nada de investigador (V2-60) | P2 | ✅ | v26 |
| I-04 | Ejemplos = pantalla | Ver D-04 | (V2-76) | P1 | 🔧 | numeros-entrenamiento |

## J. Prueba guiada y «Cuéntale…»

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| J-01 | Set automático y sin letras | Empezar la prueba | La app elige el set y nunca dice A o B (V2-61) | P2 | ✅ | v26, v261 |
| J-02 | Empezar de nuevo (V2-67) | Ayuda → Prueba guiada → «Empezar de nuevo» | Confirma «Se borra tu avance de la prueba. Tus datos no se tocan.»; set nuevo, sin letras; datos reales idénticos | P2 | 🔧 (no existía) | v261 |
| J-03 | Privacidad de «Cuéntale…» | Texto con montos y nombres | Sin montos ni nombres (V2-62; V2-69 #39) | P1 | ✅ | v26 |

## K. Responsive y accesibilidad

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| K-01 | Contraste en los 4 temas | Medir | ≥ 4.5:1 | P2 | ✅ | contraste, v25, v26 |
| K-02 | 44 px | Medir lo que se toca | ≥ 44 × 44 | P2 | ✅ | v26, teclado |
| K-03 | Reducir movimiento | Activarlo | Nada se mueve | P3 | ✅ | v25, v26 |
| K-04 | Teclado en la computadora | Tab, Escape | Foco visible y atrapado en hojas y diálogos | P2 | ✅ | teclado, atras |
| K-05 | 320, 360 y 430 de ancho; zoom 200 % | Capturas | Sin cortes | P2 | ⏳ fase 3 | — |

## L. Rendimiento

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| L-01 | Mucho dato | 150 anotaciones, 20 pagos, 5 deudas, 3 tarjetas | Cálculo ≈ 2–3 ms; pestañas 4–15 ms; Anotar ≈ 40 ms | P2 | ✅ | qa-v261 |

## M. Consola

| ID | Caso | Pasos | Esperado | Prio. | Estado | Prueba |
|---|---|---|---|---|---|---|
| M-01 | Por file:// | Todas las pruebas | Cero errores | P1 | ✅ | todas |
| M-02 | En la subruta de Pages | Las pruebas servidas | Cero errores | P1 | ✅ | todas (servidas) |

## N. v2.7 · Tus números bien (informe de Codex sobre la v2.6.7)

**Estado** como arriba; 🔧 = fallaba en la v2.6.7 (las pruebas con `--raiz=` sobre la v2.6.7 sacada de git lo muestran) y se corrigió en la v2.7.

| ID | Caso | Esperado (acuerdo) | Prio. | Estado | Prueba |
|---|---|---|---|---|---|
| N-A1 | Actualizar desde la v2.6.7 con Ana, Carlos, Rosa y un set con cada F | Copia por versión intacta, cero pérdidas, mismos saldos (DATOS-1, 3, 5) | P1 | 🔧 | actualizar `--ref=c640e4e` |
| N-A2 | Lo guardado dañado, de una versión más nueva o que no se puede calcular | «Tus datos están a salvo»; no se escribe nada; nunca de cero (DATOS-2, A04, F20) | P1 | 🔧 | invariantes I09 |
| N-A3 | Sin espacio para la copia por versión | Quedan la original y las 2 más recientes; se avisa (DATOS-1) | P1 | 🔧 | invariantes I12 |
| N-A4 | Cambiar la cuenta de un medio | No mueve lo de antes (F04, DATOS-3) | P1 | 🔧 | invariantes I04 |
| N-B1 | Cuadrar y luego detallar | Mes no se duplica (F01, D-8) | P1 | 🔧 | invariantes I01 |
| N-B2 | Abono y compra con «lo que debo hoy» | El abono baja; la compra de antes no sube (F02, F03, D-7) | P1 | 🔧 | invariantes I03, I03b |
| N-B3 | Abono el día del corte; segundo estado de cuenta | Baja esa tarjeta; no inventa pagos (F10, F11) | P1 | 🔧 | invariantes I06, I07 |
| N-B4 | Pagar $50 de $100 (formulario, Anotar, Mes, Pongámonos al día) | «Parcial · faltan $50»; el mismo resultado por cada entrada (F12, D-6) | P1 | 🔧 | invariantes I05, I08 |
| N-B5 | Menos del mínimo; mínimo > total; estado de $0 | Se puede, con aviso; no; se confirma (F13, F14) | P2 | 🔧 | invariantes F13, F14 |
| N-B6 | Corregir un ingreso o un gasto de un ahorro | Un solo monto; el ahorro cambia con el gasto (F15, F16) | P1 | 🔧 | invariantes I02, I10 |
| N-B7 | Tarjeta en Pongámonos al día | Nunca un abono de $0 (F17) | P1 | 🔧 | invariantes F17 |
| N-B8 | Avisos, privacidad y aria | Sin promesas falsas; apagar apaga; «true»/«false» (F21, F22, F23) | P2 | 🔧 | invariantes F21–F23 |
| N-C1 | Montos con el teclado del teléfono en todos los campos (A, reemplaza a C-6) | inputmode «decimal»; nada tapa el campo ni su mensaje; «25», «2.5», «1,200», «25,50» | P1 | 🔧 | montos B, C |
| N-C2 | Un solo lector de montos | El mismo resultado en formularios, teclado y Anotar | P1 | 🔧 | montos A, D |
| N-C3 | Anotar no adivina | Miles, fechas, la tarjeta nombrada, sin tarjeta, «tengo 0», dos montos (F05–F08, F18, F19) | P1 | 🔧 | montos E |
| N-C4 | La nota del cuadre en Anotar (P-3) | Antes del cuadre: no cambia, con «Fue después de contar»; mismo día: pregunta; después: baja | P1 | 🔧 | invariantes P3 |
| N-D1 | El cuadrito de novedades | Una vez, solo con datos de antes, líneas según los datos, accesible; atrás lo cierra | P2 | ✅ | novedades |

## O. v2.8 · Más claro (ajustes 1 a 7 y el cierre)

Pruebas: `invariantes` (las filas V2 a V34), `palabras-v28`, `actualizar`, `fluidez`, `contraste-v23` y las de cada pantalla. Todo lo aprobado por Victor (2026-10-21 y 2026-10-22).

| ID | Caso | Esperado (acuerdo) | Prio. | Estado | Prueba |
|---|---|---|---|---|---|
| O-1 | Tu libre (D-3) | Lo que tienes − tus ahorros dentro − lo que falta de tu plan; el mismo número en Hoy, «¿De dónde sale?» y Mi plan | P1 | ✅ | invariantes V2, V24 |
| O-2 | Ahorros dentro y aparte (C-1, «no asumir») | Dentro se resta; aparte solo se registra; cada ahorro de antes pregunta en qué cuenta está | P1 | ✅ | invariantes V3, V10, V11 |
| O-3 | Presupuestos (C-3, ajuste 6) | Un gasto del presupuesto no baja otra vez tu libre; «te quedan $X de $Y» | P1 | ✅ | invariantes V4, V21, V29 |
| O-4 | Tarjeta y cobros con tarjeta (D-4, C-7) | Una regla; lo que se cobra en la tarjeta va dentro de su pago («va en Mi BAC», sin «−») | P1 | ✅ | invariantes V5, V31 |
| O-5 | Anotar con verbos (C-4, P-1, ajustes 1 a 4) | «¿Es tu …?», «Pagué una deuda», salario sin duplicar, nada asumido en «Gasté» | P1 | ✅ | invariantes V8, V9, V12 a V23 |
| O-6 | Formularios claros (ajuste 3) | Sin duplicados, grupos primero, categorías propias | P2 | ✅ | invariantes V17 a V21 |
| O-7 | Mi plan por fecha y por tipo (ajuste 5) | Nada se pierde frente al Mi plan anterior; «+ Agregar» abre los 6 formularios; se recuerda la vista | P2 | ✅ | invariantes V25, V26 |
| O-8 | Categorías editables (ajustes 6 y 7) | Renombrar u ocultar no cambia montos; las fijas (🔒) no se cambian; «+ Nueva categoría»; «Ponerle un máximo» | P1 | ✅ | invariantes V29, V30, V33, V34 |
| O-9 | Mes nuevo (ajuste 6) | «Salieron» = lo anotado del mes (cada centavo una vez); las filas de «¿En qué se te fue?» suman «Salieron» | P1 | ✅ | invariantes V27, V28 |
| O-10 | «aprox.» en vez de «~» (ajuste 7) | Ninguna pantalla con «~$»; siempre con centavos | P2 | ✅ | invariantes V32, palabras-v28 |
| O-11 | Palabras que ya no se dicen | Ni «apartar», «reservar», «Pagos», «gasto variable», «~$», «tope», «Para anotar»… en pantallas ni textos | P3 | ✅ | palabras-v28 |
| O-12 | Actualizar desde la v2.6.7 y la v2.7 | Cero pérdidas, una copia intacta por versión, el cuadrito una vez | P1 | ✅ | actualizar ×2 |
| O-13 | Recuperar datos, fácil (adenda) | La copia «Antes de la actualización» devuelve los datos de antes; lo de ahora queda como «Antes de recuperar» | P1 | ✅ | actualizar (d702de0) |
| O-14 | Fluidez (CPU 4 veces más lenta) | Abrir ≤ 2 s; cada interacción ≤ 200 ms; guardar ≤ 300 ms; sin saltos (CLS 0); con «reducir movimiento» nada se mueve | P2 | ✅ | fluidez |
| O-15 | Contraste de lo nuevo | ≥ 4.5:1 en los 4 temas («va en», «⚠ por confirmar», Mes, Mis categorías) | P2 | ✅ | contraste-v23 |
| O-16 | «aprox.» al final de una frase (cierre) | Nunca «aprox..»: el punto de «aprox.» cierra la frase | P3 | ✅ | palabras-v28, recorrer-v2 C20, v25 E |
| O-17 | Entrenamiento con Mi plan nuevo (cierre) | «Aquí ves tu aguinaldo» señala «Más adelante»; el ejemplo de la próxima quincena cabe en 2 líneas | P2 | ✅ | v25 (a–f) |
| O-18 | Quien vende, en Mi plan → Próxima (cierre) | «Tus ventas cuentan cuando las anotas», «Sale $191.00 aprox.» y «Este mes llevas $316.00 en ventas» | P2 | ✅ | v25 E |
| O-19 | El «?» del resumen de Mi plan (cierre) | No tapa ninguna línea; 44 px | P3 | ✅ | v24, v25 H, capturas-v28 |

## P. v2.9 · Números claros (auditoría de 4 personas y R1 a R12)

| # | Tema | Qué se comprueba | Prioridad | Estado | Prueba |
|---|---|---|---|---|---|
| P-1 | El contador (4 personas, 21 oct–31 dic) | Libre, saldos, ahorros, deudas, Mes y cada pestaña de Mi plan coinciden al centavo con un contador independiente | P1 | ✅ | personas-v29 (0 diferencias) |
| P-2 | «Comida afuera» (H1) | Un gasto de comida baja el presupuesto «Comida afuera»; el libre no baja dos veces; «bus» no es «Gasolina» | P1 | ✅ | invariantes V35, V4 |
| P-3 | La pestaña manda (R1–R3) | Cada pestaña solo con lo suyo; total de sección = sus filas; sin secciones vacías ni «Más adelante» | P1 | ✅ | invariantes V36, V25, personas-v29 |
| P-4 | «¿De dónde sale?» por pestaña (R4) | Hoy: Tienes − Ahorros − Sale = Libre; Próxima y Mes: Entra − Sale = Te quedarían; suma exacta | P1 | ✅ | invariantes V36, personas-v29 |
| P-5 | «Te quedarían» de hoy = el libre del día de pago (R4) | Si todo sale como en tu plan: libre del día de pago = libre de hoy + «Te quedarían» | P1 | ✅ | invariantes V42 |
| P-6 | Presupuestos (R5) | Editar, «Saltar esta quincena», «Ya no lo uso» (con confirmación, historial intacto), «Ya terminé» y «Reabrir» hasta el próximo ingreso | P1 | ✅ | invariantes V37 |
| P-7 | «Por fecha \| Por tipo» arriba (R6) | El interruptor está junto a las pestañas; nada al final | P2 | ✅ | invariantes V38, entrega2-v23 |
| P-8 | Adelanto (R7) | Una línea «Quincena $600.00 − adelanto $210.00 = $390.00 (incluye $10.00 de comisión)»; nunca dos veces | P1 | ✅ | invariantes V39, v24, personas-v29 |
| P-9 | Ingresos de una vez (R8) | El que ya llegó o ya pasó no queda en Mi plan; el que esperas, solo en su periodo | P2 | ✅ | invariantes V43, v231 |
| P-10 | El «?» de Mi plan → Mes (R9) | Es de Mi plan, no de la pantalla Mes | P3 | ✅ | invariantes V40 |
| P-11 | Pestañas según el ingreso (R10) | Quincena: Esta quincena · Próxima · Mes; semana: Esta semana · Próxima · Mes; mes y sin ingreso fijo: Este mes · Próximo mes (con flechas) | P2 | ✅ | invariantes V41, personas-v29 |
| P-12 | «aprox.» solo si hay un estimado (R11) | Próxima sin estimados: sin «aprox.»; la frase dice qué incluye «Te quedarían» | P2 | ✅ | personas-v29, palabras-v28 |
| P-13 | Actualizar a la v2.9 | Desde c640e4e, d702de0 y a0cddba, con datos como los de Pam y Majo: cero pérdidas, copia «antes de la v2.9» que se recupera, cuadrito una vez | P1 | ✅ | actualizar ×3 |
