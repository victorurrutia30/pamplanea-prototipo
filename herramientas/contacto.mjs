// Junta capturas de 390×844 en hojas de contacto (4 por imagen, tamaño real) para revisarlas.
// Uso: node herramientas/contacto.mjs <carpeta-de-capturas> [por-hoja]
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const carpeta = path.resolve(process.argv[2]);
const porHoja = Number(process.argv[3] || 4);
const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.png')).sort();
const salida = path.join(carpeta, '_hojas');
await mkdir(salida, { recursive: true });
const b = await abrir({ puerto: 9681 });
await b.tamano(porHoja * 400, 880, { movil: false, toque: false });
for (let i = 0; i < archivos.length; i += porHoja) {
    const grupo = archivos.slice(i, i + porHoja);
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#777;display:flex;gap:10px;padding:4px;font:12px sans-serif">${grupo.map((f) => `<figure style="margin:0;width:390px"><figcaption style="color:#fff;height:22px">${f}</figcaption><img src="${pathToFileURL(path.join(carpeta, f)).href}" width="390" height="844"></figure>`).join('')}</body>`;
    const pagina = path.join(salida, `hoja-${String(i / porHoja + 1).padStart(2, '0')}.html`);
    await writeFile(pagina, html);
    await b.ir(pathToFileURL(pagina).href, '[...document.images].every((i) => i.complete)');
    await esperar(100);
    await b.captura(pagina.replace(/\.html$/, '.png'));
}
console.log(JSON.stringify({ hojas: Math.ceil(archivos.length / porHoja), errores: b.errores }));
b.cerrar();
