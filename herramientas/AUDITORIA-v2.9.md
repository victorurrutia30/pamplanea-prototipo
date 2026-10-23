# Auditoría v2.9 «Números claros»: el dinero, como lo vive una persona

**Qué se hizo.** `herramientas/personas-v29.mjs` hace vivir a cuatro personas del 21 de octubre al 31 de diciembre de 2026, día por día, con todo lo que la app sabe hacer (ver la lista en el archivo). Un **contador** escrito en la prueba, sin usar `motor.js`, lleva su dinero como en un cuaderno. Cada día se compara con lo que la app **muestra**: Hoy, Mi dinero y Mes. En los días clave (los de pago, el día antes, inicio y mitad de mes, la tarjeta, el adelanto y los presupuestos) también se compara Mi plan, en cada pestaña, por fecha y por tipo, con su resumen y su «¿De dónde sale?».

| Persona | Cobra | Días vividos | Días clave comparados |
|---|---|---|---|
| Pam | por quincena (15 y 30) | 72 | 22 |
| Majo | por mes (el 30) | 72 | 15 |
| Toño | por semana (viernes) | 72 | 25 |
| Rosa | ventas sin fecha fija | 72 | 14 |

**Sobre la v2.8 publicada (`a0cddba`):**
- 2,890 diferencias en 74 grupos;
- 406 son de dinero, y todas vienen de **una sola causa** (H1);
- los saldos de cada cuenta, los ahorros, lo que se debe y Mes («Entraron · Salieron») coinciden con el contador **al centavo** los 72 días, en las cuatro personas.

## Hallazgos

Severidad: **P0** = dinero o un número que confunde o mezcla periodos; **P1** = ruido o texto.

| # | Hallazgo | Persona · día | Qué se ve (v2.8) | Qué debería verse | Sev. | Arreglo (v2.9) |
|---|---|---|---|---|---|---|
| H1 | **Un gasto de «Comida» no baja el presupuesto «Comida afuera»**: el libre baja dos veces | Pam, desde el 1 nov · Majo, Toño y Rosa | Pam el 1 nov: libre **$890.00** («Comida afuera: te quedan $40.00» aunque ya gastó $30 en pupusas) | **$920.00** (te quedan $10.00) | P0 $ | Un presupuesto consume los gastos de su tipo si es el único presupuesto de ese tipo (además del nombre). |
| H2 | «Ver por tipo» lista **todo** (los 6 ingresos, todos los gastos fijos) y el total es solo del periodo | todas, todos los días clave | «Ingresos (6) · $350.00» con filas que suman $1,910.00 | solo lo del periodo; total = suma de sus filas | P0 | R1 y R2: cada sección con solo lo del periodo, el total sale de sus filas y sin secciones vacías. |
| H3 | **«Más adelante»** dentro de cada pestaña (aguinaldo, turno del cuchubal, Quincena 25) | todas, hasta diciembre | «12 dic: Aguinaldo +$400.00 aprox.» en Esta quincena | nada fuera del periodo | P0 | R3: sale «Más adelante»; lo futuro se ve con las flechas de Mes. |
| H4 | **«¿De dónde sale?» es el mismo en las tres pestañas**: siempre el libre de hoy | todas | en Próxima y Mes: «¿De dónde sale tu libre?» | Próxima/Mes: Entra − Sale = Te quedarían | P0 | R4: un «¿De dónde sale?» por pestaña, que suma exacto. |
| H5 | **«aprox.» siempre** en Próxima | Pam desde el 30 oct, Toño todos los días | «$533.00 aprox.» sin nada estimado | «$533.00» | P1 | R11: «aprox.» solo con un monto estimado de verdad. |
| H6 | Mes (en Mi plan) no suma presupuestos ni ahorro programado y dice «Sin tus gastos del día a día» | todas | «Entra $950.00 · Sale $80.00» en octubre | lo mismo que las otras pestañas (tu plan completo) | P0 | Mes suma tu plan de ese mes; la frase dice qué no incluye. |
| H7 | **Quien cobra por mes lee «Este periodo»** y tiene «Este periodo», «Próxima» y «Mes» | Majo | «Este periodo · Próxima · Mes» | «Este mes · Próximo mes» | P0 | R10. |
| H8 | **Quien vende tiene «Este mes» y «Mes» a la vez** (lo mismo dos veces) | Rosa | «Este mes · Próximo mes · Mes» | «Este mes · Próximo mes», con flechas para los siguientes | P1 | R10. |
| H9 | **El adelanto se dice en dos lugares sin cuadrar**: el periodo lo suma y la próxima dice «te descuentan $210.00 del adelanto» (le dieron $200: $10 de comisión) | Pam 3 nov, Toño 4 nov, Majo 10 nov | Próxima: «Incluye $350.00 aprox. de «Salario de Luis» · te descuentan $210.00 del adelanto» | «Quincena $600.00 − adelanto $210.00 = $390.00 (incluye $10.00 de comisión)» | P0 | R7. |
| H10 | **Ingresos de una vez que ya pasaron siguen en el plan** («próximo: …» de algo que ya llegó) | todas | el adelanto del 3 nov y la remesa en «Ver por tipo» | fuera del plan (están en Mes) | P1 | R8. |
| H11 | **Un presupuesto cerrado con «Ya terminé» no se puede reabrir** y no se puede saltar | todas, 26 oct | ficha: «Editar · Ya no aplica» | «Reabrir», «Saltar esta quincena», «Ya no lo uso» | P0 | R5. |
| H12 | **El consejo de Mi plan → Mes es el de la pantalla Mes** (el «?» del número grande) | todas | «?» de Mes en Mi plan con el texto de la pantalla Mes | el consejo de Mi plan | P1 | R9. |
| H13 | **«Ver por tipo ›» al final**, debajo de toda la lista | todas | abajo | arriba, junto a las pestañas | P1 | R6. |
| H14 | La tarjeta en Próxima se ve por **lo que pagas normalmente o el estado completo**, aunque parte ya bajó tu libre al comprar | Pam 16 nov | «La de la casa $103.00» y el total cuenta $13.00 | «La de la casa $13.00 de $103.00» (lo demás ya lo contaste al comprar) | P0 | Cada periodo muestra la parte de la tarjeta que paga ese periodo. |

## Lo que coincidió desde el principio

- Saldos de Efectivo y Banco Agrícola, los ahorros (dentro y aparte), lo que se debe del préstamo (con el pago parcial) y de la casa comercial: 72 días × 4 personas.
- Mes («Entraron · Salieron»): el cuadre con $5.00 sin detalle, la corrección de un gasto, los cobros con tarjeta (Netflix dentro de su pago) y lo que se movió entre cuentas no se cuentan dos veces.
- «Te quedarían» de Próxima es el del contador (Entra − Sale por fecha), en las cuatro personas.

## Cómo quedó

*(Se completa al terminar los arreglos: ver abajo.)*
