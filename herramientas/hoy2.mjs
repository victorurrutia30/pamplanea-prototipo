// Captura la parte de «Próximos pagos» de Hoy para Ana y Carlos (revisión puntual).
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { abrir, esperar } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b = await abrir({ puerto: 9663 });
await b.tamano(390, 844);
await b.movimientoReducido(true);
const url = pathToFileURL(path.join(root, 'telefono.html')).href;
for (const [n, h] of [['ana', 'persona=ana'], ['carlos', 'persona=carlos']]) {
    await b.ir('about:blank');
    await b.ir(url + '#' + h + '&tema=serena-claro');
    await esperar(200);
    await b.evaluar('document.getElementById("vista").scrollTop = 330; true');
    await esperar(100);
    await b.captura(path.join(root, 'capturas', 'humo', 'hoy-proximos-' + n + '.png'));
}
console.log(JSON.stringify(b.errores));
b.cerrar();
