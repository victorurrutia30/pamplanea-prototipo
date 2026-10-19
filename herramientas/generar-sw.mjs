// Escribe sw.js con la lista de TODOS los archivos publicados (los que git sigue, menos los de
// texto para el equipo) para precargarlos y abrir sin internet. La versión va en el nombre de la
// caché: al publicar una versión nueva, cambiar VERSION_SW y volver a correr este script.
// Uso: node herramientas/generar-sw.mjs v2.1-2026-10-16
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];
if (!version) throw new Error('Falta la versión, por ejemplo v2.1-2026-10-16');
const enGit = execSync('git ls-files --cached --others --exclude-standard', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
// v2.6.1: herramientas/ ya está en git (las pruebas viajan con el repo), pero no se publica en la caché.
const fuera = /^(\.|README\.md|LEEME\.md|sw\.js$|herramientas\/|capturas\/)/;
const archivos = ['./', ...enGit.filter((f) => !fuera.test(f)).sort()];
const plantilla = await readFile(path.join(root, 'herramientas', 'sw.plantilla.js'), 'utf8');
const sw = plantilla.replace('__VERSION__', version).replace('__ARCHIVOS__', JSON.stringify(archivos, null, 4).replace(/\n/g, '\n'));
await writeFile(path.join(root, 'sw.js'), sw);
console.log(JSON.stringify({ version, archivos: archivos.length }));
