// Servidor estático temporal SOLO para verificar la versión «servida» (como GitHub Pages), sin
// dependencias. Sirve la carpeta del prototipo en http://127.0.0.1:<puerto>/. Uso: node herramientas/servidor.mjs [puerto]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const puerto = Number(process.argv[2] || 8765);
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // Como GitHub Pages: también sirve en la subruta /pamplanea-prototipo/.
    if (ruta === '/pamplanea-prototipo') {
        res.writeHead(301, { Location: '/pamplanea-prototipo/' }).end();
        return;
    }
    if (ruta.startsWith('/pamplanea-prototipo/')) ruta = ruta.slice('/pamplanea-prototipo'.length);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const archivo = path.join(root, ruta);
    if (!archivo.startsWith(root) || /[\\/](capturas|herramientas|\.git)[\\/]/.test(archivo)) {
        res.writeHead(404).end();
        return;
    }
    try {
        if (!(await stat(archivo)).isFile()) throw new Error('no');
        res.writeHead(200, { 'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        let cuerpo = await readFile(archivo);
        // Para probar «Hay una versión nueva»: SW_SUFIJO cambia la versión de la caché del service worker.
        if (process.env.SW_SUFIJO && ruta.endsWith('/sw.js')) cuerpo = cuerpo.toString('utf8').replace(/(const VERSION_SW = ')([^']+)'/, '$1$2' + process.env.SW_SUFIJO + "'");
        res.end(cuerpo);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
    }
}).listen(puerto, '127.0.0.1', () => console.log('sirviendo ' + root + ' en http://127.0.0.1:' + puerto + '/'));
