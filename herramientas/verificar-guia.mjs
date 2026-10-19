// Abre index.html por file:// (como un doble clic) en Chrome y Edge y comprueba: errores de
// consola, que el teléfono carga, que un caso se marca solo con clics reales dentro del
// teléfono, simulaciones, tema y notas. Guarda capturas de la guía.
// Uso: node herramientas/verificar-guia.mjs [ronda]
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ronda = process.argv[2] || 'final';
const url = pathToFileURL(path.join(root, 'index.html')).href;
const informe = {};

for (const [nombre, puerto] of [['chrome', 9691], ['edge', 9692]]) {
    const b = await abrir({ navegador: nombre, puerto });
    await b.tamano(1440, 1000, { movil: false, toque: false });
    await b.movimientoReducido(true);
    await b.ir(url);
    await esperar(1500);
    const dir = path.join(root, 'capturas', 'guia-' + ronda);
    const r = { errores: b.errores, fallidas: b.fallidas };
    r.libre = await b.evaluar('document.getElementById("g-panel").textContent.includes("Exploración libre")');
    if (nombre === 'chrome') await b.captura(path.join(dir, '1-arriba.png'));

    // Un caso, con clics reales dentro del teléfono.
    await b.evaluar('document.querySelector("[data-caso=C05]").click(); true');
    await esperar(700);
    await b.evaluar('scrollTo(0, document.getElementById("telefono").getBoundingClientRect().top + scrollY - 16); true');
    await esperar(300);
    // El foco dentro del teléfono puede desplazar la guía: se mide el marco antes de cada toque.
    const tocar = async (x, y) => {
        const rect = await b.evaluar('JSON.parse(JSON.stringify(document.getElementById("telefono").getBoundingClientRect()))');
        await b.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x + x, y: rect.y + y });
        for (const type of ['mousePressed', 'mouseReleased']) {
            await b.enviar('Input.dispatchMouseEvent', { type, x: rect.x + x, y: rect.y + y, button: 'left', clickCount: 1 });
            await esperar(60);
        }
        await esperar(450);
    };
    await tocar(195, 772); // (+) Anotar
    await b.enviar('Input.insertText', { text: 'pupusas 6' });
    await esperar(400);
    if (nombre === 'chrome') await b.captura(path.join(dir, '2-caso-c05-anotando.png'));
    await tocar(289, 786); // Guardar
    await esperar(500);
    r.c05 = await b.evaluar('({ hechos: document.querySelectorAll(".g-pasos li.hecho").length, pasos: document.querySelectorAll(".g-pasos li").length, progreso: document.querySelector("[data-caso=C05] .g-caso-p").textContent })');
    if (nombre === 'chrome') await b.captura(path.join(dir, '3-caso-c05-hecho.png'));

    // Simulación que avisa si falta un paso.
    await b.evaluar('document.querySelector("[data-caso=C11]").click(); true');
    await esperar(800);
    r.panelC11 = await b.evaluar('document.getElementById("g-panel").textContent.slice(0, 60) + " sims=" + document.querySelectorAll("[data-sim]").length');
    await b.evaluar('document.querySelector("[data-sim=dia4]")?.click(); true');
    await esperar(600);
    r.c11Nota = await b.evaluar('document.querySelector(".g-nota")?.textContent ?? null');

    // Simulación completa de Carlos: el viernes llega el aviso.
    await b.evaluar('document.querySelector("[data-caso=C20]").click(); true');
    await esperar(800);
    await b.evaluar('document.querySelector("[data-sim=viernes]")?.click(); true');
    await esperar(900);
    r.c20 = await b.evaluar('({ hechos: document.querySelectorAll(".g-pasos li.hecho").length, nota: document.querySelector(".g-nota")?.textContent ?? null })');
    if (nombre === 'chrome') await b.captura(path.join(dir, '4-caso-c20-viernes.png'));

    // Tema oscuro para toda la página y el teléfono.
    await b.evaluar('document.querySelector("[data-tema=ancla-oscuro]").click(); true');
    await esperar(600);
    r.tema = await b.evaluar('({ modo: document.documentElement.dataset.mode, paleta: document.documentElement.dataset.palette })');
    if (nombre === 'chrome') await b.captura(path.join(dir, '5-ancla-oscuro.png'));
    await b.evaluar('document.querySelector("[data-tema=serena-claro]").click(); true');

    // Ajustar a la ventana.
    await b.evaluar('document.getElementById("g-ajustar").click(); true');
    await esperar(300);
    r.ajuste = await b.evaluar('document.getElementById("g-pie-tel").textContent');
    await b.evaluar('scrollTo(0, 0); true');
    if (nombre === 'chrome') await b.captura(path.join(dir, '6-ajustado.png'));
    await b.evaluar('document.getElementById("g-ajustar").click(); true');

    // Notas y texto armado sin portapapeles.
    await b.evaluar('const t = document.getElementById("g-n-C05"); t.value = "Entendió los chips a la primera."; t.dispatchEvent(new Event("input", { bubbles: true })); document.getElementById("g-armar").click(); document.getElementById("g-seleccionar").click(); true');
    r.notas = await b.evaluar('({ incluye: document.getElementById("g-texto").value.includes("Entendió los chips"), seleccionado: (() => { const a = document.getElementById("g-texto"); return a.selectionEnd - a.selectionStart === a.value.length && document.activeElement === a; })() })');
    await b.evaluar('document.getElementById("g-obs-t").scrollIntoView(); true');
    await esperar(300);
    if (nombre === 'chrome') await b.captura(path.join(dir, '7-observar.png'));
    await b.evaluar('document.getElementById("g-notas-t").scrollIntoView(); true');
    await esperar(300);
    if (nombre === 'chrome') await b.captura(path.join(dir, '8-notas.png'));
    r.a11y = await b.evaluar('({ h1: document.querySelectorAll("h1").length, botonesPequenos: [...document.querySelectorAll("button")].filter((e) => { const q = e.getBoundingClientRect(); return q.width && q.height < 36; }).map((e) => e.textContent.trim().slice(0, 20)), sinNombre: [...document.querySelectorAll("button")].filter((e) => !e.textContent.trim() && !e.getAttribute("aria-label")).length, desborde: document.documentElement.scrollWidth > innerWidth })');
    informe[nombre] = r;
    b.cerrar();
    await esperar(500);
}
await writeFile(path.join(root, 'capturas', 'verificacion-guia-' + ronda + '.json'), JSON.stringify(informe, null, 1));
console.log(JSON.stringify(informe, null, 1));
