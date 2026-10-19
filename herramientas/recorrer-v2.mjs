// Recorre los 13 casos del prototipo v2 en telefono.html (390×844, Chrome sin ventana), comprueba
// los números esperados, el modo teléfono (pantalla completa, guardado, prueba guiada, notas) y la
// guía de escritorio, y guarda capturas. Sirve para file:// y para la versión servida.
// Uso: node herramientas/recorrer-v2.mjs <ronda> [--base=http://127.0.0.1:8765/] [--temas=serena-claro,ancla-oscuro] [--nav=chrome|edge]
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, '').split('=')));
const ronda = process.argv[2] || '1';
const base = args.base || pathToFileURL(root).href + '/';
const temas = (args.temas || 'serena-claro,ancla-oscuro').split(',');
const soloCasos = args.casos ? args.casos.split(',') : null;
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9691) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const salida = path.join(root, 'capturas', 'v2-ronda-' + ronda + (args.base ? '-servida' : '') + (args.nav === 'edge' ? '-edge' : ''));
const informe = { ronda, base, temas: {}, fallos: [], errores: b.errores, fallidas: b.fallidas };

const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error('No encontré ' + sel);
    await esperar(70);
};
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.textContent.replace(/\\s+/g, ' ').trim() ?? null`);
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error('No encontré ' + sel);
    await esperar(70);
};
const libre = () => texto('.portada-n');
const eventos = () => ev('(window.__ev || []).slice()');
let actual = '';
const check = (nombre, real, esperado) => {
    const ok = typeof esperado === 'function' ? esperado(real) : real === esperado;
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${real}» ≠ «${typeof esperado === 'function' ? 'condición' : esperado}»`);
    return ok;
};
const contiene = (sub) => (x) => typeof x === 'string' && x.includes(sub);

async function cargar(hash, tema) {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#' + hash + '&tema=' + tema);
    await ev('window.__ev = []; window.addEventListener("proto", (e) => window.__ev.push(e.detail.clave)); true');
    await esperar(150);
}

for (const tema of temas) {
    const dir = path.join(salida, tema);
    const res = (informe.temas[tema] = {});
    let n = 0;
    const foto = async (nombre) => {
        await esperar(90);
        await b.captura(path.join(dir, `${String(++n).padStart(3, '0')}-${nombre}.png`));
    };
    const fotoLarga = async (nombre) => {
        await ev('document.getElementById("vista").scrollTop = 0; true');
        await foto(nombre);
        const alto = await ev('document.getElementById("vista").scrollHeight');
        let parte = 2;
        for (let y = 600; y < alto - 640 + 600 && parte <= 5; y += 600, parte++) {
            await ev(`document.getElementById("vista").scrollTop = ${y}; true`);
            await foto(`${nombre}-${parte}`);
        }
        await ev('document.getElementById("vista").scrollTop = 0; true');
    };
    const caso = async (id, fn) => {
        if (soloCasos && !soloCasos.includes(id)) return;
        actual = `${tema} ${id}`;
        try {
            const r = await fn();
            res[id] = { ok: true, ...r, eventos: await eventos() };
        } catch (e) {
            informe.fallos.push(`${actual}: ${e.message}`);
            res[id] = { ok: false, error: String(e.message || e), eventos: await eventos().catch(() => []) };
            await foto(id + '-ERROR');
        }
    };

    await caso('C01', async () => {
        await cargar('caso=C01', tema);
        await escribir('#ob-nombre', 'Sofía');
        await clic('[data-fk="ob-empezar"]');
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', '600');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-banco-Agrícola"]');
        await escribir('#ob-banco-monto', '820');
        await escribir('#ob-efectivo', '45');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-sig"]'); // v2.6.2 (V2-68): deudas y tarjetas en pasos separados
        await clic('[data-fk="ob-p-luz"]');
        await escribir('#ob-p-monto', '35');
        await clic('[data-fk="ob-p-dia-12"]');
        await clic('[data-fk="ob-p-agregar"]');
        await clic('[data-fk="ob-sig"]');
        await fotoLarga('c01-primer-numero');
        const numero = await libre();
        await clic('[data-fk="pn-listo"]');
        await foto('c01-hoy');
        check('mismo número en Hoy', await libre(), numero);
        return { numero };
    });

    await caso('C05', async () => {
        await cargar('caso=C05', tema);
        check('libre antes', await libre(), '$270.60');
        check('incluye tarjeta', await texto('.portada-v'), 'Incluye tarjeta $245.00, vence el 5 de noviembre');
        check('próxima quincena (V2-35)', await texto('.proy'), contiene('Próxima quincena (30)'));
        check('próxima quincena: números', await texto('.proy'), contiene('ingreso ~$600 · pagos ~$55 · te quedarían ~$545'));
        check('sin reserva automática', await ev('document.body.textContent.includes("Ya separa")'), false);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'pupusas 6');
        await foto('c05-entendi');
        await clic('[data-fk="anotar-guardar"]');
        await foto('c05-guardado');
        check('libre después', await libre(), '$264.60');
        check('toast', await texto('.toast'), contiene('Guardado'));
        await clic('[data-fk="toast-deshacer"]');
        check('deshacer', await libre(), '$270.60');
        return {};
    });

    await caso('C11', async () => {
        await cargar('caso=C11', tema);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'acuérdame colegio 20 el 5');
        await clic('[data-fk="op-frecuencia-mensual"]');
        await clic('[data-fk="anotar-guardar"]');
        await ev('P.simular("dia4"); true');
        await esperar(150);
        await foto('c11-notificacion');
        const antes = await libre();
        await clic('[data-fk="banner"]');
        await clic('[data-fk="ficha-pagado"]');
        // v2.6.5 (V2-80): vence mañana (el 5): «¿Ya lo pagaste por adelantado?» → «Sí, ya lo pagué» (sin pedir el monto, V2-29 #8).
        check('pregunta por adelantado', await texto('#capa-dlg'), contiene('Este pago es del 5 de noviembre. ¿Ya lo pagaste por adelantado?'));
        await clic('[data-fk="dlg-si"]');
        await foto('c11-pagado-toast');
        check('toast pagado', await texto('.toast'), contiene('Pagado con Transferencia'));
        check('toast cambiar', await hay('[data-fk="toast-cambiar"]'), true);
        await clic('[data-fk="toast-cambiar"]');
        await foto('c11-cambiar');
        check('cambiar abre corregir', await texto('#hoja-t'), 'Corregir');
        await clic('[data-fk="hoja-cancelar"]');
        await clic('[data-fk="nav-hoy"]');
        check('libre no cambia', await libre(), antes);
        return { antes };
    });

    await caso('C16', async () => {
        await cargar('caso=C16', tema);
        check('libre antes', await libre(), '$560.60');
        check('un solo aviso agrupado (V2-42)', await texto('.aviso-hoy'), contiene('2 avisos para hoy'));
        await clic('[data-fk="aviso-ver"]');
        await foto('c16-atencion');
        await clic('[data-fk="estado-bac"]');
        await escribir('#f-total', '245');
        await escribir('#f-minimo', '25');
        await clic('[data-fk="hoja-ok"]');
        await clic('[data-fk="hoja-ok"]');
        check('libre con todo', await libre(), '$315.60');
        check('incluye tarjeta', await texto('.portada-v'), 'Incluye tarjeta $245.00, vence el 5 nov');
        await cargar('caso=C16', tema);
        await clic('[data-fk="aviso-ver"]');
        await clic('[data-fk="estado-bac"]');
        await escribir('#f-total', '245');
        await escribir('#f-minimo', '25');
        await clic('[data-fk="hoja-ok"]');
        await clic('[data-fk="ec-minimo"]');
        await clic('[data-fk="hoja-ok"]');
        check('libre con mínimo', await libre(), '$535.60');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        await clic('[data-fk="t-bac"]');
        await fotoLarga('c16-ficha-minimo');
        check('consejo intereses', await ev('document.body.textContent.includes("no calculamos los intereses")'), true);
        return {};
    });

    await caso('C19', async () => {
        await cargar('caso=C19', tema);
        await esperar(1100);
        await foto('c19-hoy');
        check('libre por ahora', await texto('.portada-l'), 'Libre por ahora');
        check('botón ya te cayó', await texto('[data-fk="ing-si"]'), '¿Ya llegó?');
        await clic('[data-fk="ing-si"]');
        await clic('[data-fk="ing-ok"]');
        await fotoLarga('c19-reparte');
        check('sugerencia emergencias 10 %', await ev('document.querySelector("[data-a=reparteApartar]")?.dataset.fk + ":" + document.querySelector("[data-a=reparteApartar]")?.dataset.m'), 'sug-emergencias:6000');
        await clic('[data-fk="sug-emergencias"]');
        await clic('[data-fk="rep-listo"]');
        check('horizonte', await texto('.portada-h'), contiene('quincena del 15'));
        return { despues: await libre() };
    });

    await caso('C20', async () => {
        await cargar('caso=C20', tema);
        check('libre antes (sin reserva automática)', await libre(), '$125.00');
        check('por día', await texto('.portada-s'), '~$62 por día');
        check('sugerencia ámbar', await texto('.aviso-hoy'), contiene('El viernes 30 recibes ~$90', 'te faltarían ~$70', '¿Reservas algo de tu pago del viernes 23?'));
        await fotoLarga('c20-hoy');
        await clic('[data-fk="portada"]');
        await foto('c20-desglose');
        check('desglose', await texto('.desglose'), contiene('Tienes', '$125.00', 'Libre'));
        await clic('[data-fk="desglose-ok"]');
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="tab-proxima"]');
        check('mismo día', await ev('document.body.textContent.includes("mismo día de tu pago")'), true);
        await fotoLarga('c20-pagos-proxima');
        await clic('[data-fk="nav-hoy"]');
        await clic('[data-fk="at-sug-si"]');
        await foto('c20-reservar');
        await clic('[data-fk="op-fuente-ahora"]');
        await clic('[data-fk="reservar-ok"]');
        check('libre con lo reservado', await libre(), '$55.00');
        await clic('[data-fk="nav-midinero"]');
        await fotoLarga('c20-midinero');
        check('reparto', await texto('.reparto-frase'), 'Tienes $125.00 = reservado para pagos $70.00 + libre $55.00');
        await ev('P.abrir("pago", "alquiler"); true');
        check('el alquiler lo dice', await texto('section[aria-labelledby="f-con"]'), contiene('Reservado de lo que tienes ahora', '$70.00', 'Con tu pago del viernes 30', '$80.00'));
        await ev('P.simular("viernes"); true');
        await esperar(150);
        await clic('[data-fk="ing-si"]');
        await clic('[data-fk="ing-ok"]');
        await fotoLarga('c20-reparte');
        await clic('[data-fk="rep-listo"]');
        check('libre después', await libre(), '$135.00');
        await clic('[data-fk="portada"]');
        check('reservado en el detalle', await texto('.desglose'), contiene('Reservado para pagos', '$70.00'));
        await foto('c20-desglose-despues');
        return {};
    });

    await caso('C23', async () => {
        await cargar('caso=C23', tema);
        await clic('[data-fk="md-ahorros"]');
        await clic('[data-fk="a-laptop"]');
        await clic('[data-fk="ap-usar"]');
        await foto('c23-usar');
        await clic('[data-fk="usar-ok"]');
        await foto('c23-logro');
        await clic('[data-fk="logro-hoy"]');
        check('libre igual', await libre(), '$270.60');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-cuentas"]');
        check('banco baja', await texto('[data-fk="l-agricola"] .fila-m'), '$855.60');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        check('logro débito', await texto('section[aria-labelledby=md-logros]'), contiene('Usado con Débito Agrícola'));
        return {};
    });

    await caso('C26', async () => {
        await cargar('caso=C26', tema);
        await esperar(1100);
        await fotoLarga('c26-hoy');
        check('libre por ahora', await texto('.portada-l'), 'Libre por ahora');
        check('ya te cayó del 30', await texto('[data-fk="ing-si"]'), '¿Ya llegó tu quincena del 30?');
        check('horizonte se queda', await texto('.portada-h'), 'Tu quincena del 30 · falta confirmarla');
        await clic('[data-fk="aldia"]');
        await clic('[data-fk="adi-si-2026-10-30"]');
        await clic('[data-fk="ad-sig"]');
        await clic('[data-fk="ad-todos"]');
        await clic('[data-fk="ad-sig"]');
        await escribir('#adc-efectivo', '22');
        await clic('[data-fk="ad-sig"]');
        await foto('c26-listo');
        await clic('[data-fk="ad-fin"]');
        check('ya no por ahora', await texto('.portada-l'), 'Libre');
        return { hoy: await libre() };
    });

    await caso('C30', async () => {
        await cargar('caso=C30', tema);
        await fotoLarga('c30-hoy');
        check('libre inicio', await libre(), '$250.60');
        check('red c en el aviso agrupado', await texto('.aviso-hoy'), contiene('2 avisos para hoy', 'tu ahorro Regalo'));
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'regalo mamá 20');
        await foto('c30-anotar-pregunta');
        check('pregunta ahorro', await texto('#anotar-preg'), contiene('¿Lo tomas de tu ahorro Regalo?'));
        await clic('[data-fk="usar-no"]');
        await clic('[data-fk="anotar-guardar"]');
        check('libre tras olvidar', await libre(), '$230.60');
        await clic('[data-fk="aviso-ver"]');
        await clic('[data-fk="ven-si-regalo"]');
        await foto('c30-ya-lo-use');
        await clic('[data-fk="yl-ok"]');
        await foto('c30-cerrado');
        check('libre arreglado (c)', await libre(), '$250.60');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        check('logro regalo', await texto('section[aria-labelledby=md-logros]'), contiene('Regalo'));
        // Red (b): corregirlo en Mes.
        await cargar('caso=C30', tema);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'regalo mamá 20');
        await clic('[data-fk="usar-no"]');
        await clic('[data-fk="anotar-guardar"]');
        await clic('[data-fk="nav-mes"]');
        const reg = await ev('[...document.querySelectorAll("[data-a=editarRegistro]")].find((x) => x.textContent.includes("Regalo mamá"))?.dataset.fk');
        await clic(`[data-fk="${reg}"]`);
        await clic('[data-fk="ed-tomar"]');
        await clic('[data-fk="op-apartado-regalo"]');
        await foto('c30-mes-tomar');
        await clic('[data-fk="hoja-ok"]');
        await clic('[data-fk="nav-hoy"]');
        check('libre arreglado (b)', await libre(), '$250.60');
        // Liberarlo sin usar: queda «Cerrado», no Logro (V2-31 #3).
        await cargar('caso=C30', tema);
        await clic('[data-fk="aviso-ver"]');
        await clic('[data-fk="ven-si-regalo"]');
        await clic('[data-fk="yl-nolouse"]');
        await clic('[data-fk="yl-ok"]');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        check('cerrado sin usar', await texto('section[aria-labelledby=md-cerrados]'), contiene('Cerrado sin usar'));
        check('no es logro', await hay('section[aria-labelledby=md-logros]'), false);
        await fotoLarga('c30-cerrado-sin-usar');
        return {};
    });

    await caso('C31', async () => {
        await cargar('caso=C31', tema);
        await clic('[data-fk="md-deudas"]');
        await clic('[data-fk="md-deuda"]');
        await foto('c31-tipos');
        await clic('[data-fk="td-tarjeta"]');
        await escribir('#f-nombre', 'Crédito Cuscatlán');
        await escribir('#f-corte', '20');
        await escribir('#f-pagoDia', '10');
        await escribir('#f-cupo', '500');
        await foto('c31-tarjeta');
        await clic('[data-fk="deuda-ok"]');
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="nuevo-pago"]');
        await foto('c31-nuevo-pago');
        await clic('[data-fk="np-cuota"]');
        await esperar(150);
        await clic('[data-fk="td-casacomercial"]');
        await escribir('#f-nombre', 'Almacén La Esquina');
        await escribir('#f-cuota', '25');
        await escribir('#f-dia', '28');
        await foto('c31-casa-comercial');
        await clic('[data-fk="deuda-ok"]');
        check('en esta quincena', await texto('.linea'), contiene('Almacén La Esquina'));
        await fotoLarga('c31-pagos');
        await clic('[data-fk="tab-proxima"]');
        check('tarjeta en próxima', await texto('.linea'), contiene('Crédito Cuscatlán'));
        await fotoLarga('c31-pagos-proxima');
        await clic('[data-fk="nav-hoy"]');
        check('libre baja 25', await libre(), '$245.60');
        check('estado de cuenta: se pide en el siguiente corte', await ev('document.body.textContent.includes("Crédito Cuscatlán cortó el 20")'), false);
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        await fotoLarga('c31-midinero');
        check('deudas', await texto('section[aria-labelledby=md-deudas-lista]'), (x) => x.includes('Crédito Cuscatlán') && x.includes('Almacén La Esquina') && x.includes('Disponible $500.00 de $500.00'));
        check('préstamo en positivo', await texto('section[aria-labelledby=md-deudas-lista]'), contiene('$25.00al mes'));
        return {};
    });

    await caso('C32', async () => {
        await cargar('caso=C32', tema);
        await clic('[data-fk="md-ahorros"]');
        await clic('[data-fk="a-laptop"]');
        await clic('[data-fk="ap-usar"]');
        await clic('[data-fk="op-medio-bac"]');
        await foto('c32-usar-credito');
        await clic('[data-fk="usar-ok"]');
        await foto('c32-logro');
        check('mensaje', await texto('#pantalla'), contiene('Pagaste con tu tarjeta, así que tus $600.00 quedan guardados para el pago del 5 de diciembre'));
        check('botón pagar ya', await hay('[data-fk="logro-pagar-ya"]'), true);
        await clic('[data-fk="logro-entendido"]');
        await fotoLarga('c32-midinero');
        check('reservado para la tarjeta (ficha)', await ev('P.calc().reservadoTarjetas'), 60000);
        await clic('[data-fk="md-deudas"]');
        check('deuda', await texto('[data-fk="t-bac"] .fila-m'), contiene('$890.00'));
        check('cupo', await texto('[data-fk="t-bac"]'), contiene('Disponible $610.00 de $1,500.00'));
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        check('logro', await texto('section[aria-labelledby=md-logros]'), contiene('Usado con Crédito BAC · $600.00 reservados para tu pago del 5 de diciembre'));
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-cuentas"]');
        check('banco igual', await texto('[data-fk="l-agricola"] .fila-m'), '$1,455.60');
        await clic('[data-fk="nav-hoy"]');
        check('libre igual', await libre(), '$270.60');
        await clic('[data-fk="portada"]');
        await foto('c32-desglose');
        await clic('[data-fk="desglose-ok"]');
        await cargar('caso=C32', tema);
        await clic('[data-fk="md-ahorros"]');
        await clic('[data-fk="a-laptop"]');
        await clic('[data-fk="ap-usar"]');
        await clic('[data-fk="op-medio-bac"]');
        await clic('[data-fk="usar-ok"]');
        await clic('[data-fk="logro-pagar-ya"]');
        await foto('c32-cuanto-pagas');
        check('cuánto pagas', await texto('.hoja'), (x) => x.includes('Solo la laptop · $600.00') && x.includes('Todo lo que debes · $890.00'));
        await clic('[data-fk="py-ok"]');
        await foto('c32-pagado-ya');
        check('el pago del 5 nov sigue', await ev('P.calc().tarjetas[0].porPagarEstado'), 24500);
        await clic('[data-fk="logro-entendido"]');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-cuentas"]');
        check('banco baja', await texto('[data-fk="l-agricola"] .fila-m'), '$855.60');
        check('sin reserva de la tarjeta', await ev('P.calc().reservadoTarjetas'), 0);
        await clic('[data-fk="nav-hoy"]');
        check('libre igual tras pagar', await libre(), '$270.60');
        return {};
    });

    await caso('C33', async () => {
        await cargar('caso=C33', tema);
        await fotoLarga('c33-hoy');
        check('libre de verdad', await libre(), '$60.00');
        check('sugerencia ámbar, no roja', await ev('document.querySelector(".aviso-hoy")?.classList.contains("nota--ambar")'), true);
        check('sin alarmas rojas', await hay('#pantalla .nota--atencion'), false);
        await clic('[data-fk="portada"]');
        await foto('c33-desglose');
        await clic('[data-fk="desglose-ok"]');
        await clic('[data-fk="nav-midinero"]');
        await fotoLarga('c33-midinero');
        check('reparto', await texto('.reparto-frase'), 'Tienes $60.00 = libre $60.00');
        await clic('[data-fk="nav-hoy"]');
        await clic('[data-fk="at-sug-no"]');
        check('después veo: se calla', await hay('[data-fk="at-sug-si"]'), false);
        await ev('P.simular("viernes"); true');
        await esperar(150);
        await clic('[data-fk="ing-si"]');
        await clic('[data-fk="ing-ok"]');
        await clic('[data-fk="rep-listo"]');
        check('libre después', await libre(), '$140.00');
        return {};
    });

    await caso('EXTRA', async () => {
        await cargar('caso=EXTRA', tema);
        await clic('[data-fk="avatar"]');
        await clic('[data-fk="menu-users"]');
        await clic('[data-fk="esp-invitar"]');
        await clic('[data-fk="inv-interes"]');
        await foto('extra-interes');
        return {};
    });

    await caso('luz-cuadre', async () => {
        await cargar('persona=ana', tema);
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="pagado-p-luz-2026-10-12"]');
        await escribir('#f-monto', '33.80');
        await foto('luz-pagado-antes-del-cuadre');
        check('nota cuadre', await texto('#pagado-nota'), 'Como cuadraste el 15, este pago ya estaba en tu saldo: tu libre sube $35.00.');
        await clic('[data-fk="hoja-ok"]');
        check('toast sube', await texto('.toast'), contiene('Tu libre sube $35.00'));
        await clic('[data-fk="nav-hoy"]');
        check('libre sube', await libre(), '$305.60');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-deudas"]');
        await clic('[data-fk="t-bac"]');
        await clic('[data-fk="editar-tarjeta"]');
        await foto('editar-tarjeta');
        check('editar tarjeta', await texto('#hoja-t'), 'Editar Crédito BAC');
        await clic('[data-fk="hoja-cancelar"]');
        return {};
    });

    await caso('frases', async () => {
        await cargar('persona=ana', tema);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'me pagaron 600');
        await foto('frase-me-pagaron');
        // v2.6.5 (V2-81): la misma pregunta (V2-29 #10), con las palabras nuevas.
        check('pregunta adelantada', await texto('#anotar-preg'), contiene('¿Es tu quincena del 30?', 'Todavía no es el 30', 'Sí, marcarla como recibida', 'No, es otro ingreso'));
        await escribir('#anotar-q', 'aparté 20 luz');
        await foto('frase-aparte-luz');
        check('pregunta luz', await texto('#anotar-preg'), contiene('La luz ya está en tus pagos y se descuenta sola. ¿La ahorras igual?'));
        await escribir('#anotar-q', 'tele 300 tarjeta');
        await foto('frase-credito-sin-libre');
        check('aviso crédito', await texto('#anotar-preg'), contiene('hoy no te alcanzaría'));
        return {};
    });
}

// ------------------------------------------------------------------ modo teléfono (sin hash: guarda de verdad)
actual = 'modo-teléfono';
const tel = path.join(salida, 'telefono');
let m = 0;
const fotoT = async (nombre) => {
    await esperar(120);
    await b.captura(path.join(tel, `${String(++m).padStart(3, '0')}-${nombre}.png`));
};
try {
    await b.ir('about:blank');
    await b.ir(base + 'index.html');
    await esperar(300);
    check('redirige a pantalla completa', await ev('location.pathname.endsWith("telefono.html")'), true);
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await b.ir(base + 'telefono.html');
    await esperar(300);
    await ev('window.__ev = []; window.addEventListener("proto", (e) => window.__ev.push(e.detail.clave)); true');
    check('modo real', await ev('document.documentElement.classList.contains("modo-real")'), true);
    check('elegir modo', await hay('[data-fk="elegir-aprender"]'), true);
    await fotoT('elegir');
    await clic('[data-fk="elegir-aprender"]');
    check('recorrido', await hay('.tour-card'), true);
    await clic('[data-fk="tour-saltar"]');
    check('aviso visible', await texto('#aviso-proto'), contiene('Modo entrenamiento · datos de ejemplo'));
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', 'pupusas 6');
    await clic('[data-fk="anotar-guardar"]');
    await esperar(400);
    await b.ir(base + 'telefono.html');
    await esperar(300);
    // v2.4.1: al saltar el recorrido, los ejemplos vuelven al inicio: $270.60 − $6.
    check('guardado al volver', await libre(), '$264.60');
    check('sin bienvenida al volver', await hay('.ay'), false);
    await fotoT('vuelve-guardado');
    // v2.6 (V2-60): reiniciar los ejemplos y «Mis notas» son herramientas de Victor: solo con ?victor=1.
    await b.ir(base + 'telefono.html?victor=1');
    await esperar(300);
    await clic('#btn-ayuda');
    await fotoT('ayuda-victor');
    await clic('[data-fk="ay-reiniciar"]');
    check('reiniciar', await libre(), '$270.60');
    await clic('#btn-ayuda');
    await escribir('#ay-nombre', 'Persona de prueba');
    await escribir('#ay-nota', 'Me gustó el número grande');
    await clic('[data-fk="ay-armar"]');
    const t = await ev('document.getElementById("ay-texto")?.value || ""');
    check('texto armado', t, (x) => x.includes('Nombre: Persona de prueba') && x.includes('Notas') && x.includes('Me gustó el número grande'));
    await fotoT('notas-texto');
    await ev('document.querySelector(".ay-c").scrollTop = 99999; true');
    await fotoT('ayuda-victor-final');
    // Teclado: la ventana visible se achica; el campo de Anotar no queda tapado.
    await clic('[data-fk="ay-x"]');
    await clic('[data-fk="nav-anotar"]');
    await b.tamano(390, 480);
    await esperar(250);
    await ev('document.getElementById("anotar-q").focus(); true');
    await esperar(400);
    const caja = await ev('(() => { const r = document.getElementById("anotar-q").getBoundingClientRect(); return { top: r.top, bottom: r.bottom, alto: window.visualViewport ? visualViewport.height : innerHeight }; })()');
    check('campo visible con teclado', caja.bottom <= caja.alto && caja.top >= 0, true);
    await fotoT('teclado-anotar');
    await b.tamano(390, 844);
    await clic('[data-fk="hoja-cancelar"]');
    informe.eventosTelefono = await eventos();
} catch (e) {
    informe.fallos.push('modo-teléfono: ' + e.message);
    await fotoT('ERROR');
}

// ------------------------------------------------------------------ guía de escritorio
actual = 'guía';
try {
    await b.tamano(1440, 900, { movil: false, toque: false });
    await b.ir('about:blank');
    await b.ir(base + 'index.html');
    await esperar(800);
    check('no redirige en escritorio', await ev('location.pathname.endsWith("index.html") || location.pathname.endsWith("/")'), true);
    await ev('document.querySelector("[data-caso=C32]").click(); true');
    await esperar(600);
    await b.captura(path.join(salida, 'guia-1440-c32.png'));
    const marco = await ev('(() => { const d = document.getElementById("telefono").contentDocument; if (!d) return { marco: true, boton: false, aviso: "Modo entrenamiento · datos de ejemplo (file://: no verificable)" }; return { marco: d.documentElement.classList.contains("modo-marco"), boton: !!d.getElementById("btn-ayuda"), aviso: d.getElementById("aviso-proto").textContent.trim() }; })()');
    check('marco sin botón de ayuda', marco.marco && !marco.boton, true);
    check('aviso en el marco', marco.aviso, contiene('Modo entrenamiento · datos de ejemplo'));
    check('13 casos', await ev('document.querySelectorAll(".g-caso").length'), 13);
    check('versión (la de la guía = la de la app)', await texto('#g-version'), await ev('window.VERSION_PROTOTIPO'));
    await ev('document.querySelector("[data-tema=ancla-oscuro]").click(); true');
    await esperar(300);
    await b.captura(path.join(salida, 'guia-1440-ancla-oscuro.png'));
    await ev('document.querySelector("[data-tema=serena-claro]").click(); true');
    await b.tamano(1024, 768, { movil: false, toque: false });
    await esperar(300);
    await b.captura(path.join(salida, 'guia-1024.png'));
} catch (e) {
    informe.fallos.push('guía: ' + e.message);
}

await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas }, null, 1));
b.cerrar();
