// v2.2: entrada con dos caminos, recorrido de entrenamiento, practicar, uso normal con tres personas
// simuladas (dos semanas cada una, la fecha se adelanta SOLO aquí con window.__fechaPrueba), copia →
// borrar → restaurar, separación de modos y privacidad de «Contarle a Victor» (v2.6: «Cuéntale a Victor o a Pam cómo vas»).
// Uso: node herramientas/recorrer-modos.mjs <ronda> [--base=http://…/] [--tema=serena-claro] [--partes=entrada,a,b,c,datos]
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, '').split('=')));
const ronda = process.argv[2] || '1';
const base = args.base || pathToFileURL(root).href + '/';
const tema = args.tema || 'serena-claro';
const partes = (args.partes || 'entrada,a,b,c,datos').split(',');
const salida = path.join(root, 'capturas', `modos-${ronda}${args.base ? '-servida' : ''}`, tema);
const descargas = path.join(salida, '_descargas');
await mkdir(descargas, { recursive: true });
const b = await abrir({ navegador: args.nav || 'chrome', puerto: Number(args.puerto || 9771) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
await b.enviar('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: descargas }).catch(() => b.enviar('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: descargas }));
const informe = { ronda, base, tema, fallos: [], notas: {}, errores: b.errores, fallidas: b.fallidas };
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
let actual = '';
let n = 0;
const foto = async (nombre) => {
    await esperar(120);
    await b.captura(path.join(salida, `${String(++n).padStart(3, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(90);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(90);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.textContent.replace(/\\s+/g, ' ').trim() ?? null`);
const hay = (sel) => ev(`!!document.querySelector(${js(sel)})`);
const libre = () => texto('.portada-n');
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 200)}»`);
    return ok;
};
const contiene = (s) => (x) => typeof x === 'string' && x.includes(s);
/** Abre la app como el teléfono de alguien nuevo (sin nada guardado) en una fecha dada. */
let scriptFecha = null;
async function fecha(iso) {
    if (scriptFecha) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptFecha });
    scriptFecha = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = ${js(iso)};` })).identifier;
    await ev(`window.__fechaPrueba = ${js(iso)}; P.modos.alVolver(); true`).catch(() => null);
    await esperar(120);
}
async function abrirApp() {
    // Abrir de verdad (recarga completa), no solo cambiar el hash.
    await b.ir("about:blank");
    await b.ir(base + 'telefono.html#tema=' + tema);
    await esperar(400);
}
async function limpio() {
    await b.ir('about:blank');
    await abrirApp();
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await b.ir('about:blank');
    await abrirApp();
}
const anotar = async (frase) => {
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', frase);
    await clic('[data-fk="anotar-guardar"]');
};
/** Onboarding de uso normal con el primer día. */
async function primerDia({ nombre, ingresos, efectivo, banco, credito, pagos }) {
    await escribir('#ob-nombre', nombre);
    await clic('[data-fk="ob-empezar"]');
    for (const ing of ingresos) await ing();
    await foto(actual + '-como-te-pagan');
    await clic('[data-fk="ob-sig"]');
    if (banco) {
        await clic(`[data-fk="ob-banco-${banco.nombre}"]`);
        await escribir('#ob-banco-monto', banco.monto);
    }
    await escribir('#ob-efectivo', efectivo);
    await clic('[data-fk="ob-sig"]');
    // v2.6.2 (V2-68): primero las deudas (aquí, ninguna) y después las tarjetas de crédito, cada una en su paso.
    await clic('[data-fk="ob-sig"]');
    if (credito) {
        await clic('[data-fk="ob-tn"]');
        await clic(`[data-fk="ob-t-banco-${credito.banco}"]`);
        await escribir('#ob-t-corte', credito.corte);
        await escribir('#ob-t-pago', credito.pago);
        await clic('[data-fk="ob-t-guardar"]');
    }
    await clic('[data-fk="ob-sig"]');
    for (const p of pagos) {
        await clic(`[data-fk="ob-p-${p.id}"]`);
        await escribir('#ob-p-monto', p.monto);
        if (p.dia) await clic(`[data-fk="ob-p-dia-${p.dia}"]`);
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿Con qué lo pagas?» ya no viene elegido: se elige lo que antes se ponía solo.
        // (Los servicios, en el banco si hay; lo demás, en efectivo.)
        if (banco && ['luz', 'agua', 'internet', 'cable'].includes(p.id)) {
            await clic('[data-fk="ob-p-paga-b:banco"]');
            await clic('[data-fk="ob-p-solo-no"]');
        } else await clic('[data-fk="ob-p-paga-efectivo"]');
        await clic('[data-fk="ob-p-agregar"]');
    }
    await foto(actual + '-pagos-fijos');
    await clic('[data-fk="ob-sig"]');
    await foto(actual + '-primer-numero');
    await clic('[data-fk="pn-listo"]');
}
async function elegirUso() {
    await clic('[data-fk="elegir-usar"]');
    check('pantalla previa', await texto('.ay'), (x) => x.includes('Tus datos se guardan solo en este teléfono') && x.includes('versión de prueba') && x.includes('Instálala'));
    await foto(actual + '-antes-de-empezar');
    await clic('[data-fk="intro-empezar"]');
    check('aviso de uso', await texto('#aviso-proto'), contiene('Versión de prueba · tus datos solo están en este teléfono'));
}
const textoContar = () => ev('P.modos.textoContar()');
function sinFinanzas(t, nombres) {
    const malos = [];
    if (/\$/.test(t)) malos.push('$');
    if (/\b\d+[.,]\d{2}\b/.test(t)) malos.push('decimales');
    for (const nm of nombres) if (nm && nm.length > 2 && t.toLowerCase().includes(nm.toLowerCase())) malos.push(nm);
    return malos;
}
const nombresFinancieros = () => ev('(() => { const st = P.st; return [...st.lugares, ...st.medios, ...st.tarjetas, ...st.pagos, ...st.apartados, ...st.ingresos, ...st.logros].map((x) => x.nombre); })()');

try {
    // ---------------------------------------------------------------- entrada + entrenamiento
    if (partes.includes('entrada')) {
        actual = 'entrada';
        await fecha('2026-10-16');
        await limpio();
        check('elige camino', await texto('.ay'), (x) => x.includes('Aprender a usarla') && x.includes('Usarla con mis datos') && x.includes('Recomendado'));
        check('aviso entrenamiento', await texto('#aviso-proto'), contiene('Modo entrenamiento · datos de ejemplo'));
        await foto('entrada-elegir');
        await clic('[data-fk="elegir-aprender"]');
        // v2.4.1: primero «¿Cómo recibes tu dinero?» (aquí, la versión de fecha fija).
        await esperar(300);
        await foto('entrada-version');
        await clic('[data-fk="tour-version-fijo"]');
        actual = 'recorrido';
        // v2.5: «Lo esencial» (6 pasos; en cada «Hazlo tú», «Saltar este paso») y una pregunta al final.
        await esperar(700);
        check('intro de «Lo esencial»', await texto('.tour-card .paso'), contiene('Lo esencial · 6 pasos'));
        await foto('recorrido-intro');
        await clic('[data-fk="tour-empezar"]');
        for (let i = 1; i <= 6; i++) {
            await esperar(700);
            check('paso ' + i, await texto('.tour-card .paso'), contiene(`paso ${i} de 6`));
            await foto('recorrido-' + String(i).padStart(2, '0'));
            if (await ev('!!document.querySelector("[data-fk=tour-hazlo]")')) {
                await clic('[data-fk="tour-hazlo"]');
                await esperar(500);
                await clic('[data-fk="tour-saltar-paso"]');
            } else await clic('[data-fk="tour-sig"]');
        }
        await esperar(700);
        check('foco en el título', await ev('document.activeElement && document.activeElement.id'), 'tour-t');
        await clic('[data-fk="tour-op-1"]');
        await clic('[data-fk="tour-terminar"]');
        await esperar(700);
        check('¡Listo! Ya sabes lo esencial', await texto('#tour-t'), '¡Listo! Ya sabes lo esencial');
        await clic('[data-fk="tour-mas"]');
        await esperar(400);
        await clic('[data-fk="am-practica"]');
        actual = 'practicar';
        await foto('practicar-lista');
        await clic('[data-fk="pr-C05"]');
        await foto('practicar-ejercicio');
        await clic('[data-fk="pr-como"]');
        await foto('practicar-como');
        await clic('[data-fk="pr-volver"]');
        await anotar('pupusas 6');
        await esperar(150);
        check('lo lograste', await texto('#tarea-bar'), contiene('¡Lo lograste!'));
        await foto('practicar-lograste');
        informe.notas.anaTrasPractica = await libre();
    }

    // ---------------------------------------------------------------- persona (a): quincena 15 y último día, efectivo + banco, tarjeta
    if (partes.includes('a')) {
        actual = 'a';
        await fecha('2026-10-16');
        await limpio();
        await elegirUso();
        await primerDia({
            nombre: 'Marta',
            ingresos: [
                async () => {
                    await clic('[data-fk="ob-i-quincena"]');
                    await escribir('#ob-q-monto', '650');
                    await clic('[data-fk="ob-q-dias-15-31"]');
                },
            ],
            efectivo: '35',
            banco: { nombre: 'Agrícola', monto: '480' },
            credito: { banco: 'BAC', corte: '10', pago: '30' },
            pagos: [{ id: 'luz', monto: '28', dia: 31 }, { id: 'internet', monto: '25', dia: 20 }, { id: 'alquiler', monto: '200', dia: 1 }],
        });
        check('fecha real (simulada en prueba)', await texto('.hoy-saludo .sub'), 'Viernes 16 de octubre');
        check('horizonte último día', await texto('.portada-h'), contiene('quincena del 31'));
        await foto('a-hoy-dia1');
        informe.notas.aDia1 = await libre();
        await anotar('súper 25');
        await anotar('pupusas 4 efectivo');
        await fecha('2026-10-18');
        await abrirApp();
        check('guardado al volver', await hay('.portada-n'), true);
        await anotar('gasolina 10');
        await fecha('2026-10-20');
        await abrirApp();
        check('aviso al abrir (uno solo, V2-42)', await texto('.aviso-hoy'), (x) => /hoy vence el internet/i.test(String(x)));
        check('un solo aviso en Hoy', await ev('document.querySelectorAll(".aviso-hoy").length'), 1);
        check('nota de avisos', await hay('[data-fk="nota-avisos"]'), true);
        await foto('a-avisos-al-abrir');
        await clic('[data-fk="nota-avisos"]');
        await ev(`document.querySelector('[data-a="pagado"][aria-label*="Internet"]').click(); true`);
        await esperar(150);
        check('pagado directo', await texto('.toast'), contiene('Pagado con'));
        await fecha('2026-10-23');
        await abrirApp();
        actual = 'a-feedback';
        check('¿cómo te ha ido? al tercer día', await hay('[data-fk="fb-guardar"]'), true);
        await foto('a-como-te-ha-ido');
        await clic('[data-fk="fb-4"]');
        await escribir('#fb-confuso', 'No sabía qué era cuadrar con $35.50 en Banco Agrícola');
        await escribir('#fb-gustaria', 'Que me avise antes del alquiler');
        await clic('[data-fk="fb-guardar"]');
        check('se fue la tarjeta', await hay('[data-fk="fb-guardar"]'), false);
        actual = 'a';
        // Cuadrar el banco.
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-cuentas"]');
        await clic('[data-fk="md-cuadrar"]');
        await clic('[data-fk="op-lugar-banco"]');
        await escribir('#f-monto', '400');
        await clic('[data-fk="hoja-ok"]');
        // Apartado: crear, editar y eliminar.
        await anotar('aparté 20 viaje');
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-ahorros"]');
        const apId = await ev('P.st.apartados[0]?.id');
        await clic(`[data-fk="a-${apId}"]`);
        await clic('[data-fk="ap-meta"]');
        await escribir('#f-nombre', 'Viaje a la playa');
        await clic('[data-fk="hoja-ok"]');
        check('apartado renombrado', await texto('#pantalla h1'), contiene('Viaje a la playa'));
        await clic('[data-fk="ap-meta"]');
        await clic('[data-fk="ap-eliminar"]');
        await foto('a-eliminar-apartado');
        await clic('[data-fk="ap-eliminar-si"]');
        check('apartado eliminado', await ev('P.st.apartados.length'), 0);
        check('deshacer', await hay('[data-fk="toast-deshacer"]'), true);
        // Lugar: crear, editar y eliminar.
        await clic('[data-fk="nav-midinero"]');
        await clic('[data-fk="md-cuentas"]');
        await clic('[data-fk="lm-nuevo-lugar"]');
        await clic('[data-fk="op-clase-billetera"]');
        await escribir('#f-nombre', 'Tigo Money');
        await escribir('#f-monto', '15');
        await clic('[data-fk="lugar-ok"]');
        await foto('a-lugares-y-medios');
        check('lugar creado', await ev('P.st.lugares.map((l) => l.nombre)'), (x) => x.includes('Tigo Money'));
        const lId = await ev('P.st.lugares.find((l) => l.nombre === "Tigo Money").id');
        await clic(`[data-fk="l-${lId}"]`);
        await clic('[data-fk="l-editar"]');
        await clic('[data-fk="lugar-eliminar"]');
        await clic('[data-fk="lugar-eliminar-si"]');
        check('lugar eliminado', await ev('P.st.lugares.some((l) => l.nombre === "Tigo Money")'), false);
        // Ingreso esperado: crear, editar y eliminar.
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="nuevo-ingreso"]');
        await escribir('#f-nombre', 'Comisión');
        await escribir('#f-monto', '80');
        await clic('[data-fk="op-frecuencia-mensual"]');
        await clic('[data-fk="dia-dia-25"]');
        await clic('[data-fk="hoja-ok"]');
        const iId = await ev('P.st.ingresos.find((i) => i.nombre === "Comisión").id');
        await ev(`P.abrir("ingreso", "${iId}"); true`);
        await clic('[data-fk="editar-ingreso"]');
        await escribir('#f-monto', '90');
        await clic('[data-fk="hoja-ok"]');
        check('ingreso editado', await ev(`P.st.ingresos.find((i) => i.id === "${iId}").monto`), 9000);
        await clic('[data-fk="editar-ingreso"]');
        await clic('[data-fk="ing-eliminar"]');
        await clic('[data-fk="ing-eliminar-si"]');
        check('ingreso eliminado', await ev(`!P.st.ingresos.some((i) => i.id === "${iId}")`), true);
        // Quincena del 31 (último día de octubre): confirmar, Reparte con cuadre.
        await fecha('2026-10-31');
        await abrirApp();
        check('libre por ahora el 31', await texto('.portada-l'), 'Libre por ahora');
        await clic('[data-fk="ing-si"]');
        await clic('[data-fk="ing-ok"]');
        await foto('a-reparte');
        await clic('[data-fk="rep-listo"]');
        check('horizonte al 15', await texto('.portada-h'), contiene('quincena del 15'));
        // Noviembre: alquiler el 1; luz el 30 (último día de noviembre).
        await fecha('2026-11-01');
        await abrirApp();
        await clic('[data-fk="nav-pagos"]');
        // v2.8 (C-9): el calendario es la otra vista de Mi plan.
        await clic('[data-fk="modo-calendario"]');
        await clic('[data-fk="tab-mes"]');
        check('luz último día del mes', await texto('.linea'), contiene('último día del mes'));
        await foto('a-pagos-noviembre');
        // Mes: cambio de mes, corregir y eliminar con confirmación.
        await clic('[data-fk="nav-mes"]');
        await clic('[data-fk="mes-ant"]');
        check('mes anterior', await texto('.mes-nav-t'), 'Octubre 2026');
        const reg = await ev('[...document.querySelectorAll("[data-a=editarRegistro]")].find((x) => x.textContent.includes("Gasolina"))?.dataset.fk');
        await clic(`[data-fk="${reg}"]`);
        await clic('[data-fk="eliminar"]');
        await foto('a-eliminar-movimiento');
        await clic('[data-fk="eliminar-si"]');
        check('movimiento eliminado', await ev('P.st.registros.some((r) => r.nombre === "Gasolina")'), false);
        await clic('[data-fk="mes-sig"]');
        await fecha('2026-11-02');
        await abrirApp();
        informe.notas.aDia18 = await libre();
        await foto('a-hoy-noviembre');
        // «Cuéntale a Victor o a Pam cómo vas» (antes «Contarle a Victor»): sin montos ni nombres financieros.
        actual = 'a-contar';
        await clic('[data-fk="avatar"]');
        await foto('a-menu');
        await clic('[data-fk="menu-receipt-text"]');
        await escribir('#ct-mas', 'Me encantó, pero lo del Viaje a la playa y los $200 del alquiler no los entendí');
        await foto('a-contar');
        const t = await textoContar();
        informe.notas.contarA = t;
        const malos = sinFinanzas(t, [...(await nombresFinancieros()), 'Viaje a la playa', 'Agrícola', 'Tigo Money', 'Comisión']);
        check('sin montos ni nombres', malos, []);
        check('trae métricas', t, (x) => x.includes('Nombre: Marta') && x.includes('anotaciones') && x.includes('4 de 5') && x.includes('Pantallas que más usé'));
        await clic('[data-fk="ay-x"]');
    }

    // ---------------------------------------------------------------- persona (b): semanal, solo efectivo, alquiler mensual
    if (partes.includes('b')) {
        actual = 'b';
        await fecha('2026-10-21');
        await limpio();
        await elegirUso();
        await primerDia({
            nombre: 'Beto',
            ingresos: [
                async () => {
                    await clic('[data-fk="ob-i-semana"]');
                    await escribir('#ob-s-monto', '95');
                },
            ],
            efectivo: '120',
            pagos: [{ id: 'alquiler', monto: '150', dia: 1 }],
        });
        check('hasta el viernes', await texto('.portada-h'), contiene('Hasta el viernes'));
        await foto('b-hoy');
        await anotar('bus 1.50');
        await anotar('almuerzo 3');
        for (const [f, monto] of [['2026-10-23', '95'], ['2026-10-30', '90']]) {
            await fecha(f);
            await abrirApp();
            await clic('[data-fk="ing-si"]');
            await escribir('#f-monto', monto);
            await clic('[data-fk="ing-ok"]');
            await clic('[data-fk="rep-listo"]');
            if (f === '2026-10-23') {
                // El alquiler (1 nov) se paga con el viernes 30: la app sugiere reservar, no lo hace sola (V2-34).
                check('sugerencia para el alquiler', await texto('.aviso-hoy'), contiene('te faltarían', '¿Guardas algo de lo que tienes ahora?'));
                await foto('b-sugerencia');
                await clic('[data-fk="nav-midinero"]');
                await foto('b-midinero');
            }
        }
        // El 30 ya cae antes del próximo viernes: todo el alquiler está por pagar.
        check('alquiler por pagar el 30', await texto('section[aria-labelledby=h-pagos]'), contiene('Alquiler'));
        await fecha('2026-11-01');
        await abrirApp();
        await ev(`document.querySelector('[data-a="pagado"][aria-label*="Alquiler"]').click(); true`);
        await esperar(150);
        check('alquiler pagado', await ev('Object.values(P.st.pagos[0].hechos).some((h) => h.estado === "pagado")'), true);
        await fecha('2026-11-04');
        await abrirApp();
        informe.notas.bLibre = await libre();
        await foto('b-hoy-noviembre');
        const t = await textoContar();
        check('b sin montos ni nombres', sinFinanzas(t, await nombresFinancieros()), []);
    }

    // ---------------------------------------------------------------- persona (c): ingreso variable + remesa
    if (partes.includes('c')) {
        actual = 'c';
        await fecha('2026-10-16');
        await limpio();
        await elegirUso();
        await primerDia({
            nombre: 'Rosa',
            ingresos: [
                async () => {
                    await clic('[data-fk="ob-i-varia"]');
                },
                async () => {
                    await clic('[data-fk="ob-i-remesa"]');
                    await escribir('#ob-r-monto', '200');
                    await clic('[data-fk="ob-r-dia-10"]');
                },
            ],
            efectivo: '60',
            banco: { nombre: 'Cuscatlán', monto: '150' },
            pagos: [{ id: 'agua', monto: '9', dia: 25 }],
        });
        check('hasta fin de mes', await texto('.portada-h'), contiene('fin de mes'));
        await foto('c-hoy');
        await anotar('vendí 30');
        await anotar('tortillas 2');
        await fecha('2026-10-25');
        await abrirApp();
        await ev(`document.querySelector('[data-a="pagado"][aria-label*="Agua"]').click(); true`);
        await esperar(150);
        await fecha('2026-11-01');
        await abrirApp();
        check('nuevo mes', await texto('.portada-h'), contiene('fin de mes'));
        await fecha('2026-11-10');
        await abrirApp();
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'me mandaron 200');
        await foto('c-remesa');
        check('remesa reconocida', await texto('#anotar-chips'), contiene('Remesa'));
        await clic('[data-fk="anotar-guardar"]');
        await esperar(150);
        if (await hay('[data-fk="rep-listo"]')) await clic('[data-fk="rep-listo"]');
        informe.notas.cLibre = await libre();
        await foto('c-hoy-noviembre');
        const t = await textoContar();
        check('c sin montos ni nombres', sinFinanzas(t, await nombresFinancieros()), []);
    }

    // ---------------------------------------------------------------- copia → borrar → restaurar; modos separados
    if (partes.includes('datos')) {
        actual = 'datos';
        await fecha('2026-10-16');
        await limpio();
        await elegirUso();
        await primerDia({ nombre: 'Lupe', ingresos: [async () => { await clic('[data-fk="ob-i-quincena"]'); await escribir('#ob-q-monto', '500'); }], efectivo: '50', banco: { nombre: 'BAC', monto: '300' }, pagos: [{ id: 'luz', monto: '20', dia: 12 }] });
        await anotar('pupusas 5');
        const antes = await ev('JSON.stringify({ libre: document.querySelector(".portada-n").textContent, n: P.st.registros.length })');
        // Separación de modos. v2.6 (V2-60): «Aprender a usarla» (tu letra) ya no lleva a explorar los ejemplos: abre
        // sus capítulos; al empezar «Lo esencial» se pasa a los ejemplos y con «Ahora no» se queda ahí.
        await clic('[data-fk="avatar"]');
        await clic('[data-fk="menu-play"]');
        check('«Aprender a usarla» abre sus capítulos', [await ev('P.ayuda.panel'), await ev('P.modo')], ['aprendeMas', 'uso']);
        await clic('[data-fk="cap-esencial"]');
        await esperar(700);
        await clic('[data-fk="tour-salir"]');
        await esperar(300);
        // v2.6.4 (V2-79): «Ahora no» en un capítulo abierto desde tus datos vuelve a ellos, intactos.
        check('«Ahora no» vuelve a tus datos', [await ev('P.modo'), await ev('JSON.stringify({ libre: document.querySelector(".portada-n").textContent, n: P.st.registros.length })')], ['uso', antes]);
        await ev('P.modos.aEntrenamiento(); true');
        await esperar(300);
        // v2.6.3: con datos de ejemplo, Hoy no saluda a una persona de ejemplo.
        check('entrenamiento con los datos de Ana, sin su nombre', await texto('.hoy-saludo h1'), 'Hola');
        await anotar('pupusas 6');
        await clic('[data-fk="avatar"]');
        await clic('[data-fk="menu-smartphone"]');
        check('vuelve a sus datos', await ev('JSON.stringify({ libre: document.querySelector(".portada-n").textContent, n: P.st.registros.length })'), antes);
        // Copia.
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        await foto('datos-panel');
        await clic('[data-fk="dt-copia"]');
        await esperar(800);
        const archivos = (await readdir(descargas)).filter((f) => f.startsWith('pamplanea-copia-'));
        check('copia descargada', archivos, (x) => x.length > 0);
        // Borrar con doble confirmación.
        await clic('[data-fk="dt-borrar"]');
        await clic('[data-fk="dt-b-si"]');
        await foto('datos-borrar-2');
        await clic('[data-fk="dt-b2-si"]');
        check('vacía', await ev('P.st.configurado'), false);
        // Restaurar.
        await clic('[data-fk="intro-empezar"]').catch(() => null);
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        const { root: doc } = await b.enviar('DOM.getDocument', { depth: -1 });
        const { nodeId } = await b.enviar('DOM.querySelector', { nodeId: doc.nodeId, selector: '#dt-archivo' });
        await b.enviar('DOM.setFileInputFiles', { nodeId, files: [path.join(descargas, archivos.sort().at(-1))] });
        await esperar(500);
        await foto('datos-restaurar-confirmar');
        check('pide confirmar', await hay('[data-fk="dt-r-si"]'), true);
        await clic('[data-fk="dt-r-si"]');
        await esperar(300);
        check('datos restaurados', await ev('JSON.stringify({ libre: document.querySelector(".portada-n").textContent, n: P.st.registros.length })'), antes);
        // Archivo que no es copia.
        await clic('#btn-ayuda');
        await clic('[data-fk="au-datos"]');
        await writeFile(path.join(descargas, 'otro.json'), '{"hola":1}');
        const d2 = await b.enviar('DOM.getDocument', { depth: -1 });
        const q2 = await b.enviar('DOM.querySelector', { nodeId: d2.root.nodeId, selector: '#dt-archivo' });
        await b.enviar('DOM.setFileInputFiles', { nodeId: q2.nodeId, files: [path.join(descargas, 'otro.json')] });
        await esperar(400);
        check('rechaza archivo raro', await texto('.ay .campo-error'), contiene('no es una copia'));
        await clic('[data-fk="ay-x"]');
    }
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, notas: { ...informe.notas, contarA: undefined } }, null, 1));
console.log(informe.notas.contarA || '');
b.cerrar();
