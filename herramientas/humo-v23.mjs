// Humo v2.3: abre cada caso y persona, recorre las pestañas y las hojas principales, y junta errores
// de consola y lo que dice cada pantalla. Uso: node herramientas/humo-v23.mjs [--base=http://…/]
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = args.base || pathToFileURL(root).href + '/';
const b = await abrir({ puerto: Number(args.puerto || 9781) });
await b.tamano(390, 844);
const ev = (s) => b.evaluar(s);
const salida = {};
const hashes = ['persona=ana', 'persona=carlos', 'caso=C01', 'caso=C05', 'caso=C16', 'caso=C19', 'caso=C20', 'caso=C26', 'caso=C30', 'caso=C33'];
for (const h of hashes) {
    await b.ir('about:blank');
    await b.ir(base + 'telefono.html#' + h);
    await esperar(300);
    const r = {};
    for (const tab of ['hoy', 'pagos', 'midinero', 'mes']) {
        await ev(`P.irTab(${JSON.stringify(tab)}); true`).catch((e) => (r[tab + ':error'] = e.message));
        await esperar(60);
        r[tab] = await ev('document.getElementById("pantalla").textContent.replace(/\\s+/g, " ").trim().slice(0, 260)');
    }
    for (const v of ['proxima', 'mes']) {
        await ev(`P.irTab('pagos'); P.acciones.pagosVista({ v: ${JSON.stringify(v)} }); true`).catch((e) => (r['pagos-' + v + ':error'] = e.message));
        await esperar(40);
    }
    await ev(`P.irTab('hoy'); P.abrirHoja('desglose'); true`).catch((e) => (r['desglose:error'] = e.message));
    await esperar(60);
    r.desglose = await ev('document.querySelector(".hoja")?.textContent.replace(/\\s+/g, " ").trim().slice(0, 400)');
    await ev('P.cerrarHoja(); true');
    for (const hoja of ['nuevoPago', 'nuevoIngreso', 'atencion', 'pasarProxima']) {
        await ev(`P.abrirHoja(${JSON.stringify(hoja)}); true`).catch((e) => (r[hoja + ':error'] = e.message));
        await esperar(40);
        await ev('P.cerrarHoja(); true').catch(() => null);
    }
    const p = await ev('P.st.pagos.find((x) => x.activo !== false)?.id || null');
    if (p) {
        await ev(`P.abrir('pago', ${JSON.stringify(p)}); true`).catch((e) => (r['ficha:error'] = e.message));
        await esperar(40);
        r.ficha = await ev('document.getElementById("pantalla").textContent.replace(/\\s+/g, " ").trim().slice(0, 300)');
        const f = await ev(`(() => { const M = window.MOTOR; const o = M.ocurrenciasPago(P.st, M.pago(P.st, ${JSON.stringify(p)}), P.st.hoy, M.sumarDias(P.st.hoy, 90))[0]; return o ? o.fecha : null; })()`);
        if (f) {
            await ev(`P.abrirHoja('pagarCon', { id: ${JSON.stringify(p)}, fecha: ${JSON.stringify(f)} }); true`).catch((e) => (r['pagarCon:error'] = e.message));
            await esperar(40);
            r.pagarCon = await ev('document.querySelector(".hoja")?.textContent.replace(/\\s+/g, " ").trim().slice(0, 300)');
            await ev('P.cerrarHoja(); true').catch(() => null);
        }
    }
    salida[h] = r;
}
console.log(JSON.stringify({ errores: b.errores, fallidas: b.fallidas, salida }, null, 1));
b.cerrar();
