// Revisión integral v2.3 (a): el viaje del dinero de Victor por la interfaz, del 17 de octubre al 2 de
// noviembre (fecha simulada SOLO aquí). En cada día se comprueba que Hoy, el desglose, Pagos y Mi dinero
// digan lo mismo (nada contado dos veces, nada que desaparezca). Uso: node herramientas/viaje-v23.mjs [--base=…]
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const salida = path.join(root, 'capturas', 'viaje-v23');
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: Number(args.puerto || 9821) });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const informe = { fallos: [], dias: {}, errores: b.errores, fallidas: b.fallidas };
const js = (s) => JSON.stringify(s);
const ev = (s) => b.evaluar(s);
let actual = '';
let n = 0;
const foto = async (nombre) => {
    await esperar(150);
    await b.captura(path.join(salida, `${String(++n).padStart(2, '0')}-${nombre}.png`));
};
const clic = async (sel) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(90);
};
const escribir = async (sel, valor) => {
    const ok = await ev(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error(actual + ': no encontré ' + sel);
    await esperar(90);
};
const texto = (sel) => ev(`document.querySelector(${js(sel)})?.textContent.replace(/\\s+/g, ' ').trim() ?? null`);
const check = (nombre, real, cond) => {
    const ok = typeof cond === 'function' ? cond(real) : JSON.stringify(real) === JSON.stringify(cond);
    if (!ok) informe.fallos.push(`${actual} · ${nombre}: «${String(typeof real === 'string' ? real : JSON.stringify(real)).slice(0, 240)}»`);
};
let script = null;
async function dia(iso) {
    if (script) await b.enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier: script });
    script = (await b.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `window.__fechaPrueba = ${js(iso)};` })).identifier;
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#tema=serena-claro');
    await esperar(400);
    actual = iso;
}
/** El mismo libre en Hoy, el desglose, Pagos (esta quincena) y Mi dinero; y la repartición suma lo que tienes. */
async function coherente(nota) {
    const hoy = await texto('.portada-n');
    await clic('[data-fk="portada"]');
    const desglose = await ev('document.querySelector(".d-total .d-m")?.textContent');
    await clic('[data-fk="desglose-ok"]');
    await clic('[data-fk="nav-pagos"]');
    await clic('[data-fk="modo-calendario"]');
    await clic('[data-fk="tab-actual"]');
    const pagos = await ev('document.querySelector(".per-res-l strong")?.textContent');
    await clic('[data-fk="nav-midinero"]');
    const md = await ev(`(() => { const ley = [...document.querySelectorAll('.reparto-ley li')].map((li) => [li.children[1].textContent, li.children[2].textContent]); const libre = ley.find((x) => x[0] === 'Libre'); return { libre: libre ? libre[1] : '$0.00', partes: ley, frase: document.querySelector('.reparto-frase')?.textContent }; })()`);
    const k = await ev('(() => { const k = P.calc(); return { tienes: k.tienes, libre: k.libre, faltaPagos: k.faltaPagos, ahorros: k.apartado, oblig: k.obligaciones }; })()');
    await clic('[data-fk="nav-hoy"]');
    check(`${nota}: Hoy = desglose = Pagos = Mi dinero`, [hoy, desglose, pagos, md.libre], [hoy, hoy, hoy, hoy]);
    const suma = md.partes.reduce((t, [, m]) => t + Math.round(Number(m.replace(/[$,]/g, '')) * 100), 0);
    if (!k.faltaPagos) check(`${nota}: la repartición suma lo que tienes`, suma, k.tienes);
    informe.dias[`${actual} ${nota}`] = { hoy, proy: await texto('.proy'), aviso: await texto('.aviso-hoy') };
}

try {
    // 17 oct: el escenario de Victor (ya probado en aceptacion-v23); aquí se arma directo para seguir el dinero.
    await dia('2026-10-17');
    await ev('P.sinGuardar = true; localStorage.clear(); true');
    await dia('2026-10-17');
    await ev(`(() => {
        const D = window.DATOS, c = D.c, ini = '2026-10-17';
        const st = D.crearNueva();
        Object.assign(st, { persona: 'uso', hoy: ini, inicio: ini, configurado: true, nombre: 'Victor', espacio: 'Hogar de Victor', seq: 3 });
        st.lugares = [{ id: 'efectivo', tipo: 'efectivo', nombre: 'Efectivo', emoji: '💵', cuadre: { fecha: ini, seq: 1, monto: c('120') } }, { id: 'banco', tipo: 'banco', nombre: 'Banco Agrícola', emoji: '🏦', cuadre: { fecha: ini, seq: 2, monto: 0 } }];
        st.medios = [{ id: 'efectivo', nombre: 'Efectivo', emoji: '💵', lugar: 'efectivo' }, { id: 'debito', nombre: 'Débito Agrícola', emoji: '🏦', lugar: 'banco', tarjetaDebito: true }];
        st.registros = [{ id: 'r1', seq: 1, tipo: 'cuadre', fecha: ini, lugar: 'efectivo', monto: c('120'), esperado: c('120'), primero: true }, { id: 'r2', seq: 2, tipo: 'cuadre', fecha: ini, lugar: 'banco', monto: 0, esperado: 0, primero: true }];
        st.ingresos = [
            { id: 'quincena', nombre: 'Quincena', emoji: '💼', categoria: 'salario', monto: c('597'), aprox: true, frecuencia: 'quincenal', dias: [14, 29], lugar: 'efectivo', desde: ini, llegadas: {}, principal: true },
            { id: 'i9', nombre: 'Salario de mi pareja', emoji: '💼', categoria: 'otro', monto: c('566'), aprox: true, frecuencia: 'quincenal', dias: [14, 29], lugar: 'efectivo', desde: ini, llegadas: {}, principal: false, extra: true },
            { id: 'aguinaldo', nombre: 'Aguinaldo', emoji: '🎁', categoria: 'aguinaldo', monto: c('1000'), aprox: true, frecuencia: 'unico', fecha: '2026-12-12', lugar: 'efectivo', principal: false, extra: true, desde: ini, llegadas: {} },
        ];
        const pago = (id, nombre, monto, x = {}) => ({ id, nombre, emoji: '🧾', categoria: 'otros', monto: c(monto), estimado: false, frecuencia: 'mensual', dia: 30, medio: 'efectivo', avisos: [{ tipo: 'vence', on: true }], desde: ini, hechos: {}, previos: [], ...x });
        st.pagos = [pago('cuchubal', 'Cuchubal', '25', { frecuencia: 'quincenal', dias: [8, 23] }), pago('alquiler', 'Alquiler', '200'), pago('luz', 'Luz', '60', { estimado: true, categoria: 'servicios' }), pago('agua', 'Agua', '3', { estimado: true, categoria: 'servicios' }), pago('internet', 'Internet', '30'), pago('mama', 'Pago de mi mama', '160', { estimado: true }), pago('liss', 'Préstamo Liss', '156', { tipoDeuda: 'prestamo', deuda: { debe: c('1000') } }), pago('prestamo', 'Préstamo', '79', { tipoDeuda: 'prestamo', deuda: null })];
        localStorage.setItem('pamplanea-uso:v1', JSON.stringify({ esquema: 2, creado: '2026-10-17T15:00:00.000Z', st, tab: 'hoy', tema: 'serena-claro', introVista: true, nombre: 'Victor', metricas: { dias: [], anotaciones: 0, cuadres: 0, pagados: 0, reparte: 0, alDia: 0, pantallas: {}, noEntendio: 0, instalada: false }, feedback: [], feedbackEnDias: 0, ultimaCopia: null }));
        localStorage.setItem('pamplanea-modo', JSON.stringify({ modo: 'uso', notaAvisos: true }));
        return true;
    })()`);
    await dia('2026-10-17');
    check('libre $95.00', await texto('.portada-n'), '$95.00');
    await coherente('día 1');
    // Anota un gasto: baja el libre y lo que tiene, igual.
    await clic('[data-fk="nav-anotar"]');
    await escribir('#anotar-q', 'pupusas 5');
    await clic('[data-fk="anotar-guardar"]');
    check('pupusas: libre $90.00', await texto('.portada-n'), '$90.00');
    await coherente('tras pupusas');

    // 23 oct: paga el cuchubal a tiempo (ya estaba contado: el libre no cambia).
    await dia('2026-10-23');
    const libre23 = await texto('.portada-n');
    await ev(`document.querySelector('[data-a="pagado"][aria-label*="Cuchubal"]').click(); true`);
    await esperar(150);
    check('cuchubal pagado: el libre no cambia', await texto('.portada-n'), libre23);
    await coherente('tras cuchubal');

    // 28 oct: a la pareja le pagan un día antes. Es de la quincena del 29: el libre de hoy no sube.
    await dia('2026-10-28');
    const libre28 = await texto('.portada-n');
    await ev('P.abrir("ingreso", "i9"); true');
    await clic('[data-fk="ing-llego"]');
    // v2.6.5 (V2-81): es del 29 y hoy es 28: «¿Ya te llegó por adelantado?» → «Sí, ya llegó».
    check('pregunta si llegó por adelantado', await ev(`document.getElementById('capa-dlg').innerText`), (x) => /Este ingreso es del 29 de octubre\. ¿Ya te llegó por adelantado\?/.test(x));
    await clic('[data-fk="dlg-si"]');
    await escribir('#f-monto', '566');
    await clic('[data-fk="ing-ok"]');
    await foto('pareja-adelantada-reparte');
    check('Reparte lo dice', await texto('#pantalla'), (x) => x.includes('Llegó antes de tu quincena del 29') && x.includes('Usarla desde ya'));
    await clic('[data-fk="rep-listo"]');
    check('adelantado: el libre no sube', await texto('.portada-n'), libre28);
    check('adelantado: la próxima lo cuenta', await texto('.proy'), (x) => x.includes('ingreso ~$1,163') && x.includes('$566.00 de tu pareja, que ya llegó'));
    await coherente('pareja adelantada');

    // 29 oct: llega la quincena. Se confirma; lo del 30 ya sale de este dinero.
    await dia('2026-10-29');
    check('libre por ahora', await texto('.portada-l'), 'Libre por ahora');
    await clic('[data-fk="ing-si"]');
    await clic('[data-fk="ing-ok"]');
    await foto('quincena-reparte');
    check('Reparte: ya está contado', await texto('#rep-contado, section[aria-labelledby="rep-contado"]'), (x) => x.includes('Alquiler') && x.includes('Total contado'));
    await clic('[data-fk="rep-listo"]');
    const k29 = await ev('(() => { const k = P.calc(); return { libre: k.libre, tienes: k.tienes, items: k.porPagar, hz: k.hz.fecha }; })()');
    informe.dias['29 números'] = k29;
    check('29: horizonte al 14', k29.hz, '2026-11-14');
    // 120 − 5 − 25 + 566 + 597 = 1,253 · por pagar: 688 (día 30) + 25 (cuchubal 8 nov) = 713 → libre 540.
    check('29: libre $540.00', await texto('.portada-n'), '$540.00');
    await coherente('quincena del 29');

    // 30 oct: paga el alquiler y la luz (real $57.30, menos que el estimado).
    await dia('2026-10-30');
    await ev(`document.querySelector('[data-a="pagado"][aria-label*="Alquiler"]').click(); true`);
    await esperar(150);
    check('alquiler pagado: el libre no cambia', await texto('.portada-n'), '$540.00');
    await ev(`P.acciones.pagado({ tipo: 'pago', id: 'luz', fecha: '2026-10-30' }); true`);
    await esperar(150);
    await escribir('#f-monto', '57.30');
    await clic('[data-fk="hoja-ok"]');
    check('luz más barata: el libre sube $2.70', await texto('.portada-n'), '$542.70');
    await coherente('pagos del 30');
    // Préstamo Liss: baja lo que debe.
    await ev(`P.acciones.pagado({ tipo: 'pago', id: 'liss', fecha: '2026-10-30' }); true`);
    await esperar(150);
    check('lo que debe baja', await ev('window.MOTOR.pago(P.st, "liss").deuda.debe'), 84400);
    // Corrige ese pago (V2-48): era $150. Lo que debe se ajusta.
    await ev('P.abrir("pago", "liss"); true');
    await clic('[data-fk="hist-2026-10-30"]');
    await escribir('#f-monto', '150');
    await clic('[data-fk="hoja-ok"]');
    check('corregido: lo que debe se ajusta', await ev('window.MOTOR.pago(P.st, "liss").deuda.debe'), 85000);
    await clic('[data-fk="atras"]');
    await coherente('corrección');

    // 2 nov: cuadra el efectivo con $10 de diferencia (sin detalle) y revisa Mes.
    await dia('2026-11-02');
    const efectivo = await ev('window.MOTOR.saldoLugar(P.st, "efectivo")');
    await clic('[data-fk="nav-midinero"]');
    await clic('[data-fk="md-cuentas"]');
    await clic('[data-fk="md-cuadrar"]');
    await clic('[data-fk="op-lugar-efectivo"]');
    await escribir('#f-monto', String((efectivo - 1000) / 100));
    await clic('[data-fk="hoja-ok"]');
    await clic('[data-fk="nav-hoy"]');
    await coherente('cuadre con diferencia');
    await clic('[data-fk="nav-mes"]');
    await clic('[data-fk="mes-ant"]');
    const mes = await texto('.resumen');
    informe.dias['Mes octubre'] = mes;
    check('Mes de octubre: entró lo que llegó', mes, (x) => x.includes('+$1,163.00'));
    await foto('mes-octubre');
} catch (e) {
    informe.fallos.push(actual + ': ' + e.message);
    await foto('ERROR');
}
await writeFile(path.join(salida, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify({ fallos: informe.fallos, errores: informe.errores, fallidas: informe.fallidas, dias: informe.dias }, null, 1));
b.cerrar();
