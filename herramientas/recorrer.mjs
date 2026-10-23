// Recorre los 9 casos en telefono.html (file://, 390×844, Chrome sin ventana), comprueba los
// números esperados y los eventos que marcan los pasos de la guía, y guarda capturas.
// Uso: node herramientas/recorrer.mjs <ronda> [tema ...]   (por defecto serena-claro ancla-oscuro)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ronda = process.argv[2] || '1';
const temas = process.argv.slice(3).length ? process.argv.slice(3) : ['serena-claro', 'ancla-oscuro'];
const url = pathToFileURL(path.join(root, 'telefono.html')).href;
const b = await abrir({ puerto: 9671 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const informe = { ronda, temas: {}, errores: b.errores, fallidas: b.fallidas };

const js = (s) => JSON.stringify(s);
const clic = async (sel) => {
    const ok = await b.evaluar(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!ok) throw new Error('No encontré ' + sel);
    await esperar(60);
};
const escribir = async (sel, texto) => {
    const ok = await b.evaluar(`(() => { const el = document.querySelector(${js(sel)}); if (!el) return false; el.focus(); el.value = ${js(texto)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    if (!ok) throw new Error('No encontré ' + sel);
    await esperar(60);
};
const ev = (s) => b.evaluar(s);
const libre = () => ev('document.querySelector(".portada-n")?.textContent.trim() ?? null');
const eventos = () => ev('window.__ev.slice()');

async function cargar(hash, tema) {
    await b.ir('about:blank');
    await b.ir(url + '#' + hash + '&tema=' + tema);
    await ev('window.__ev = []; window.addEventListener("proto", (e) => window.__ev.push(e.detail.clave)); true');
    await esperar(120);
}

for (const tema of temas) {
    const dir = path.join(root, 'capturas', 'ronda-' + ronda, tema);
    const res = (informe.temas[tema] = {});
    let n = 0;
    const foto = async (nombre) => {
        await esperar(80);
        await b.captura(path.join(dir, `${String(++n).padStart(3, '0')}-${nombre}.png`));
    };
    /** Para pantallas largas: también el resto del contenido, bajando la vista. */
    const fotoLarga = async (nombre) => {
        await foto(nombre);
        const alto = await ev('document.getElementById("vista").scrollHeight');
        let parte = 2;
        for (let y = 640; y < alto - 700 + 640 && parte <= 4; y += 640, parte++) {
            await ev(`document.getElementById("vista").scrollTop = ${y}; true`);
            await foto(`${nombre}-${parte}`);
        }
        await ev('document.getElementById("vista").scrollTop = 0; true');
    };
    const caso = async (id, fn) => {
        try {
            const r = await fn();
            res[id] = { ok: true, ...r, eventos: await eventos() };
        } catch (e) {
            res[id] = { ok: false, error: String(e.message || e), eventos: await eventos().catch(() => []) };
            await foto(id + '-ERROR');
        }
    };

    // Pantallas base de Ana.
    await caso('base-ana', async () => {
        await cargar('persona=ana', tema);
        await fotoLarga('ana-hoy');
        await clic('[data-fk="portada"]');
        await foto('ana-desglose');
        await clic('[data-fk="desglose-ok"]');
        await clic('[data-fk="nav-pagos"]');
        await fotoLarga('ana-pagos-quincena');
        await clic('[data-fk="tab-proxima"]');
        await fotoLarga('ana-pagos-proxima');
        await clic('[data-fk="tab-mes"]');
        await fotoLarga('ana-pagos-mes');
        // Ajuste 5 (Mi plan más ligero, APROBADO por Victor 2026-10-22): lo vencido está en «N por confirmar».
        await clic('[data-fk="plan-por-confirmar"]');
        await clic('[data-fk="p-luz-2026-10-12"]');
        await fotoLarga('ana-ficha-luz');
        await clic('[data-fk="ficha-pagado"]');
        await foto('ana-pagado-luz-hoja');
        await clic('[data-fk="hoja-cancelar"]');
        await clic('[data-fk="nav-midinero"]');
        await fotoLarga('ana-midinero');
        await clic('[data-fk="l-agricola"]');
        await fotoLarga('ana-ficha-banco');
        await clic('[data-fk="atras"]');
        await clic('[data-fk="t-bac"]');
        await fotoLarga('ana-ficha-tarjeta');
        await clic('[data-fk="nav-mes"]');
        await fotoLarga('ana-mes');
        await clic('[data-fk="reg-r33"]').catch(() => null);
        await foto('ana-corregir');
        return { libre: null };
    });

    // Intérprete: cada frase del brief.
    await caso('frases', async () => {
        await cargar('persona=ana', tema);
        const salida = {};
        await clic('[data-fk="nav-anotar"]');
        await foto('anotar-vacio');
        for (const frase of ['súper 25', 'pupusas 6', 'zapatos 45 tarjeta', 'me pagaron 600', 'vendí 45', 'acuérdame colegio 20 el 5', 'luz 35 el 12', 'aparté 50 emergencias', 'tengo 300', 'retiré 100 del cajero', 'medicina 40', 'hola qué tal']) {
            await escribir('#anotar-q', frase);
            salida[frase] = await ev('[...document.querySelectorAll("#anotar-chips .chip")].map((c) => c.textContent.replace(/\\s+/g, " ").trim()).join(" · ") || document.querySelector("#anotar-cuerpo")?.textContent.replace(/\\s+/g, " ").trim().slice(0, 90)');
            await foto('anotar-' + frase.replace(/[^a-z0-9]+/gi, '-'));
        }
        await escribir('#anotar-q', '');
        await clic('[data-fk="atajo-gasto"]');
        await foto('anotar-atajo-gasto');
        await clic('[data-fk="anotar-guardar"]');
        await foto('anotar-atajo-gasto-errores');
        return { salida };
    });

    await caso('C01', async () => {
        await cargar('caso=C01', tema);
        await foto('c01-bienvenida');
        await escribir('#ob-nombre', 'Sofía');
        await clic('[data-fk="ob-empezar"]');
        await clic('[data-fk="ob-i-quincena"]');
        await escribir('#ob-q-monto', '600');
        await foto('c01-como-te-pagan');
        await clic('[data-fk="ob-i-varia"]');
        await foto('c01-como-te-pagan-varia');
        await clic('[data-fk="ob-i-varia"]');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-sig"]');
        await foto('c01-cuanto-tienes-error');
        await clic('[data-fk="ob-banco-Agrícola"]');
        await escribir('#ob-banco-monto', '820');
        await escribir('#ob-efectivo', '45');
        await foto('c01-cuanto-tienes');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-m-credito"]');
        await foto('c01-con-que-pagas');
        await clic('[data-fk="ob-sig"]');
        await clic('[data-fk="ob-p-luz"]');
        await escribir('#ob-p-monto', '35');
        await clic('[data-fk="ob-p-dia-12"]');
        await foto('c01-pagos-editor');
        await clic('[data-fk="ob-p-agregar"]');
        await clic('[data-fk="ob-p-internet"]');
        await escribir('#ob-p-monto', '25');
        await clic('[data-fk="ob-p-dia-20"]');
        await clic('[data-fk="ob-p-agregar"]');
        await fotoLarga('c01-pagos');
        await clic('[data-fk="ob-sig"]');
        await fotoLarga('c01-primer-numero');
        const numero = await libre();
        await clic('[data-fk="pn-listo"]');
        await fotoLarga('c01-hoy');
        return { numero, hoy: await libre() };
    });

    await caso('C05', async () => {
        await cargar('caso=C05', tema);
        const antes = await libre();
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'pupusas 6');
        await foto('c05-entendi');
        await clic('[data-fk="ch-medio"]');
        await foto('c05-editar-medio');
        await clic('[data-fk="ch-medio"]');
        await clic('[data-fk="anotar-guardar"]');
        await fotoLarga('c05-hoy-guardado');
        return { antes, despues: await libre() };
    });

    await caso('C11', async () => {
        await cargar('caso=C11', tema);
        await clic('[data-fk="nav-anotar"]');
        await escribir('#anotar-q', 'acuérdame colegio 20 el 5');
        await foto('c11-entendi');
        await clic('[data-fk="op-frecuencia-mensual"]');
        await foto('c11-cada-mes');
        // v2.8 (APROBADO por Victor, 2026-10-22): «¿Con qué lo pagas?» ya no se elige solo: se elige el medio de antes.
        await clic('[data-fk="anotar-guardar"]');
        await clic(`[data-fk="op-medio-${await ev("MOTOR.medioUsual(P.st, 'educacion').id")}"]`);
        if (await ev('!!document.querySelector(\'[data-fk="op-solo-no"]\')')) await clic('[data-fk="op-solo-no"]');
        await clic('[data-fk="anotar-guardar"]');
        await clic('[data-fk="nav-pagos"]');
        await clic('[data-fk="tab-proxima"]');
        await fotoLarga('c11-pagos-proxima');
        await ev('P.simular("dia4"); true');
        await esperar(150);
        await foto('c11-notificacion');
        const antes = await libre();
        await clic('[data-fk="banner"]');
        await fotoLarga('c11-ficha-colegio');
        await clic('[data-fk="ficha-pagado"]');
        await foto('c11-pagado');
        await clic('[data-fk="nav-hoy"]');
        await fotoLarga('c11-hoy');
        return { antes, despues: await libre() };
    });

    await caso('C16', async () => {
        await cargar('caso=C16', tema);
        await esperar(1100);
        await foto('c16-hoy-aviso');
        const antes = await libre();
        await clic('[data-fk="estado-bac"]');
        await escribir('#f-total', '245');
        await escribir('#f-minimo', '25');
        await clic('[data-fk="ec-ayuda-b"]');
        await foto('c16-cuanto-salio');
        await clic('[data-fk="hoja-ok"]');
        await foto('c16-cuanto-pagar');
        await clic('[data-fk="ec-minimo"]');
        await foto('c16-minimo');
        await clic('[data-fk="ec-total"]');
        await clic('[data-fk="hoja-ok"]');
        await fotoLarga('c16-hoy-despues');
        const despues = await libre();
        await clic('[data-fk="nav-midinero"]');
        await fotoLarga('c16-midinero');
        // Variante: pagar el mínimo.
        await cargar('caso=C16', tema);
        await clic('[data-fk="estado-bac"]');
        await escribir('#f-total', '245');
        await escribir('#f-minimo', '25');
        await clic('[data-fk="hoja-ok"]');
        await clic('[data-fk="ec-minimo"]');
        await clic('[data-fk="hoja-ok"]');
        const conMinimo = await libre();
        await clic('[data-fk="nav-midinero"]');
        await fotoLarga('c16-midinero-minimo');
        return { antes, despues, conMinimo };
    });

    await caso('C19', async () => {
        await cargar('caso=C19', tema);
        await esperar(1100);
        await fotoLarga('c19-hoy');
        await clic('[data-fk="ing-si"]');
        await foto('c19-cuanto-cayo');
        await clic('[data-fk="ing-ok"]');
        await fotoLarga('c19-reparte');
        const sug = await ev('document.querySelector("[data-a=reparteApartar]")?.dataset.fk');
        if (sug) await clic(`[data-fk="${sug}"]`);
        await fotoLarga('c19-reparte-apartado');
        await clic('[data-fk="rep-listo"]');
        await fotoLarga('c19-hoy-despues');
        return { despues: await libre() };
    });

    await caso('C20', async () => {
        await cargar('caso=C20', tema);
        await fotoLarga('c20-hoy');
        const antes = await libre();
        await clic('[data-fk="portada"]');
        await foto('c20-desglose');
        await clic('[data-fk="desglose-ok"]');
        await clic('[data-fk="nav-pagos"]');
        await fotoLarga('c20-pagos');
        await ev('P.simular("viernes"); true');
        await esperar(150);
        await fotoLarga('c20-viernes');
        await clic('[data-fk="ing-si"]');
        await clic('[data-fk="ing-ok"]');
        await fotoLarga('c20-reparte');
        await clic('[data-fk="rep-listo"]');
        await clic('[data-fk="portada"]');
        await foto('c20-desglose-despues');
        await clic('[data-fk="desglose-ok"]');
        await clic('[data-fk="nav-midinero"]');
        await fotoLarga('c20-midinero');
        return { antes, despues: await libre() };
    });

    await caso('C23', async () => {
        await cargar('caso=C23', tema);
        await fotoLarga('c23-midinero');
        await clic('[data-fk="a-laptop"]');
        await fotoLarga('c23-ficha-laptop');
        await clic('[data-fk="ap-usar"]');
        await foto('c23-usar');
        await clic('[data-fk="usar-ok"]');
        await foto('c23-logro');
        await clic('[data-fk="logro-hoy"]');
        const despues = await libre();
        await clic('[data-fk="nav-midinero"]');
        await fotoLarga('c23-midinero-despues');
        await clic('[data-fk="a-emergencias"]');
        await fotoLarga('c23-ficha-emergencias');
        return { despues };
    });

    await caso('C26', async () => {
        await cargar('caso=C26', tema);
        await esperar(1100);
        await fotoLarga('c26-hoy');
        await clic('[data-fk="aldia"]');
        await foto('c26-paso1');
        await clic('[data-fk="adi-si-2026-10-30"]');
        await foto('c26-paso1-si');
        await clic('[data-fk="ad-sig"]');
        await fotoLarga('c26-paso2');
        await clic('[data-fk="ad-todos"]');
        await foto('c26-paso2-todos');
        await clic('[data-fk="ad-sig"]');
        await foto('c26-paso3');
        await escribir('#adc-efectivo', '22');
        await foto('c26-paso3-dif');
        await clic('[data-fk="ad-sig"]');
        await foto('c26-listo');
        const numero = await libre();
        await clic('[data-fk="ad-fin"]');
        await fotoLarga('c26-hoy-despues');
        return { numero, hoy: await libre() };
    });

    await caso('EXTRA', async () => {
        await cargar('caso=EXTRA', tema);
        await clic('[data-fk="avatar"]');
        await foto('extra-menu');
        await clic('[data-fk="menu-users"]');
        await foto('extra-espacio');
        await clic('[data-fk="esp-invitar"]');
        await fotoLarga('extra-invitar');
        await clic('[data-fk="inv-interes"]');
        await foto('extra-interes');
        return {};
    });
}
await writeFile(path.join(root, 'capturas', 'ronda-' + ronda, 'informe.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify(informe, null, 1).slice(0, 12000));
b.cerrar();
