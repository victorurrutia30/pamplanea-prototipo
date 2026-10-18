# PamPlanea · prototipo v2.3

Una versión de prueba de **PamPlanea**: saber cuánto te queda libre hasta tu próximo ingreso y que no se te olvide ningún pago.

**Ábrela aquí:** <https://victorurrutia30.github.io/pamplanea-prototipo/>

Al abrirla eliges uno de dos caminos (y puedes cambiar cuando quieras desde tu letra, arriba a la izquierda):

- **Aprender a usarla** (recomendado): un recorrido de 3 minutos con los datos de ejemplo de Ana y, si quieres, 13 ejercicios cortos para practicar. Nada de lo que hagas ahí toca tus datos.
- **Usarla con mis datos:** tu dinero real, con la fecha real de tu teléfono. Empiezas desde cero: cómo te pagan, cuánto tienes y dónde, y tus pagos fijos.

Los dos modos guardan sus datos por separado. Reiniciar los ejemplos no borra tus datos.

## Lo nuevo en la v2.3

- **Tu número dice la verdad:** «Libre» es lo que tienes, menos tus ahorros, menos lo que pagas con ese dinero. Lo que vence después de tu próxima quincena se paga con esa quincena: no baja tu número de hoy. Nada se guarda solo.
- **«Lo pagas con»:** en cada pago eliges con qué quincena lo pagas, o lo repartes («$100 de esta y $100 de la del 29»).
- **Tu próxima quincena,** debajo del número: lo que entra, lo que pagas con eso y lo que te quedaría. Si algo no alcanza, una sugerencia (tú decides).
- **Fechas de verdad:** calendario en pagos e ingresos; en Anotar, una fecha que todavía no llega va a Pagos. Pagos semanales, cada 2 semanas, quincenales, mensuales, cada 3 meses, anuales o en fechas que tú eliges.
- **Mi dinero con tres puertas:** Cuentas, Ahorros (antes «Apartados») y Deudas. **Pagos** con «Calendario» y «Mis pagos e ingresos».
- Varios bancos, billeteras y tarjetas desde el primer día; préstamos y suscripciones; descuentos del salario que se pagan solos.
- Al actualizar, tus datos se pasan solos al formato nuevo; antes se guarda una copia intacta. No se pierde nada de lo que escribiste.

## Tus datos

- **Se guardan solo en tu teléfono.** No hay servidor, cuentas, analítica ni rastreadores. Nadie más los ve, ni Victor.
- **Es una versión de prueba:** si algo no cuadra, avísale a Victor.
- **Guarda una copia de vez en cuando:** tu letra → **«Tus datos»** → **«Guardar copia»** (descarga un archivo `pamplanea-copia-AAAA-MM-DD.json`) o **«Compartir copia»** (para mandártela por WhatsApp o correo). Con **«Restaurar una copia»** la vuelves a cargar (te pide confirmar antes de reemplazar). **«Borrar todos mis datos»** pide confirmar dos veces.
- Cuando hay una versión nueva verás «Hay una versión nueva · Actualizar»: actualizar **no borra** tus datos.

## Instálala en tu pantalla de inicio

Así abre a pantalla completa, funciona sin internet y tus datos están más seguros.

- **Android (Chrome):** menú **⋮** → «Instalar app» o «Agregar a la pantalla principal».
- **iPhone:** ábrela en **Safari** → **Compartir** (el cuadro con la flecha) → **«Agregar a pantalla de inicio»** → «Agregar». **Instálala antes de empezar con tus datos:** en iPhone la app instalada no ve lo que pusiste en Safari, y Safari puede borrar los datos de páginas que no abres en varios días.

En «Ayuda» (arriba a la derecha) están los mismos pasos.

## Contarle a Victor cómo te va

Tu letra → **«Contarle a Victor cómo me va»**. Arma un texto con tu nombre o apodo, las fechas en que la usaste, lo que más hiciste (anotar, Pagado, cuadrar…) y tus respuestas a «¿Cómo te ha ido?». **No lleva montos ni los nombres de tus cuentas, pagos o ahorros**: lo ves completo antes de mandarlo. Toca **«Compartir»** (WhatsApp) o **«Copiar»**.

Cada 3 días de uso, Hoy te pregunta «¿Cómo te ha ido?» (1 a 5 y dos preguntas opcionales). Puedes dejarlo para después.

## Para Victor (prueba guiada A/B)

La prueba guiada de la v2.1 sigue en el modo entrenamiento: «Casos y ayuda» → **«Para Victor: prueba guiada (sets A y B)»**, con el **Modo moderador** adentro. Los enlaces `…/pamplanea-prototipo/?set=A` y `…/?set=B` llevan directo a la prueba.

## Para el equipo

- Abre `index.html` con doble clic (Chrome o Edge): funciona sin servidor ni internet, con la guía de los 13 casos y los dos sets.
- Detalle, decisiones y preguntas abiertas: [`LEEME.md`](LEEME.md) (secciones «Prototipo v2.3» y «Modos v2.2»).
- Licencias de fuentes, emoji e íconos: [`recursos/licencias`](recursos/licencias).

Prototipo v2.3 · 2026-10-17
