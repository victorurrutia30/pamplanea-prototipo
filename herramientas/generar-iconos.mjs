// Genera los íconos de la app instalable (PWA) a partir del ícono SVG local, con Chrome sin ventana:
// 192 y 512 («any», fondo transparente), 512 maskable (zona segura del 80 %) y apple-touch-icon 180.
// Sin servicios externos. Uso: node herramientas/generar-iconos.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(root, 'recursos', 'iconos');
await mkdir(salida, { recursive: true });
const P = 'M22 48V16h12.5c6.9 0 11.5 4.2 11.5 10.4S41.4 37 34.5 37H29v11h-7Zm7-17.4h5c3 0 4.9-1.6 4.9-4.2s-1.9-4.1-4.9-4.1h-5v8.3Z';
// «any»: el cuadro redondeado de siempre. Lleno: fondo completo y la P más chica para que la máscara no la corte.
const svgAny = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#ba1679"/><path d="${P}" fill="#fff"/></svg>`;
const svgLleno = (escala) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ba1679"/><g transform="translate(32 32) scale(${escala}) translate(-34 -32)"><path d="${P}" fill="#fff"/></g></svg>`;
const iconos = [
    ['icono-192.png', 192, svgAny],
    ['icono-512.png', 512, svgAny],
    ['icono-maskable-512.png', 512, svgLleno(0.62)],
    ['apple-touch-icon-180.png', 180, svgLleno(0.78)],
];
const b = await abrir({ puerto: 9701 });
await b.enviar('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
for (const [nombre, lado, svg] of iconos) {
    await b.tamano(lado, lado, { movil: false, toque: false });
    const html = path.join(salida, '_tmp.html');
    await writeFile(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block;width:${lado}px;height:${lado}px}</style>${svg}`);
    await b.ir(pathToFileURL(html).href);
    await esperar(100);
    await b.captura(path.join(salida, nombre), { x: 0, y: 0, width: lado, height: lado });
}
const { unlink } = await import('node:fs/promises');
await unlink(path.join(salida, '_tmp.html'));
console.log(JSON.stringify({ iconos: iconos.map((x) => x[0]), errores: b.errores }));
b.cerrar();
