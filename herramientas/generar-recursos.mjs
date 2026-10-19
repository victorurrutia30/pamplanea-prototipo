// Producto v2 · prototipo de teléfono. Copia la PIEL REAL de PamPlanea a la carpeta del
// prototipo, sin escribir nada dentro del repo: tokens de los cuatro temas, fuente Instrument
// Sans (incrustada en base64 para que funcione con doble clic, file://), emoji Fluent «Color»
// con su licencia, íconos Lucide, patrón «Círculos» de Inicio, portadas e ilustraciones.
// Uso: node --experimental-strip-types --no-warnings herramientas/generar-recursos.mjs
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = 'C:/laragon/www/pamplanea';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REC = path.join(OUT, 'recursos');
const repo = (p) => path.join(REPO, p);
const imp = (p) => import(pathToFileURL(repo(p)).href);

await mkdir(path.join(REC, 'emoji'), { recursive: true });
await mkdir(path.join(REC, 'fuentes'), { recursive: true });
await mkdir(path.join(REC, 'licencias'), { recursive: true });

// 1. Tokens: el bloque @theme y los bloques :root de app.css hasta `html {`, tal cual.
const css = await readFile(repo('resources/css/app.css'), 'utf8');
const themeBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)[1];
const rootBlocks = css.slice(css.indexOf(':root {'), css.indexOf('\nhtml {'));

// Reglas de componentes reales que el prototipo reutiliza (portada de Inicio y de ahorro,
// ilustraciones, botones, tarjetas, pestañas). Se extraen por llaves, sin tocar valores.
function topLevelRules(text) {
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') depth++;
        else if (text[i] === '}') {
            depth--;
            if (depth === 0) {
                rules.push(text.slice(start, i + 1).trim());
                start = i + 1;
            }
        }
    }
    return rules;
}
const KEEP = ['app-home-pattern', 'app-cover', 'app-illustration', 'app-card', 'app-ghost-button', 'app-tab', 'app-main-action', 'app-goal-bar', 'app-enter', 'app-goal-grow', 'app-save-check'];
const rest = css.slice(css.indexOf('\nhtml {'));
const componentRules = topLevelRules(rest).filter((r) => KEEP.some((k) => r.includes(k)) && !r.includes('@import') && !r.includes('@apply'));
const tokensCss =
    '/* Copiado de resources/css/app.css (solo lectura) por herramientas/generar-recursos.mjs. */\n' +
    ':root {' + themeBlock.replace(/--text-3xl[^;]*;|--text-3xl--line-height[^;]*;/g, '') + '\n}\n' +
    rootBlocks + '\n' +
    '/* Reglas de componentes reales de la app que este prototipo reutiliza. */\n' +
    componentRules.join('\n\n') + '\n';
await writeFile(path.join(REC, 'tokens.css'), tokensCss);

// 2. Fuente: Instrument Sans 400/500/600 del build local, copiada y también incrustada.
const assets = await readdir(repo('public/build/assets'));
let fontsCss = '/* Instrument Sans (SIL OFL 1.1). Incrustada en base64 para abrir con doble clic. */\n';
for (const weight of [400, 500, 600]) {
    const file = assets.find((f) => f.startsWith(`instrument-sans-${weight}-normal-`) && f.endsWith('.woff2'));
    if (!file) throw new Error('Falta la fuente ' + weight);
    const bytes = await readFile(repo('public/build/assets/' + file));
    await writeFile(path.join(REC, 'fuentes', `instrument-sans-${weight}.woff2`), bytes);
    fontsCss += `@font-face{font-family:'Instrument Sans';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2')}\n`;
}
await writeFile(path.join(REC, 'fuentes.css'), fontsCss);
await copyFile(repo('resources/js/lib/instrument-sans-ofl.txt'), path.join(REC, 'licencias', 'instrument-sans-OFL.txt'));

// 3. Emoji Fluent «Color» (MIT), los 112 del catálogo de la app, sin modificar.
const manifest = JSON.parse(await readFile(repo('resources/images/emoji/fluent-color/manifest.json'), 'utf8'));
const emojiMap = {};
for (const entry of manifest.files) {
    await copyFile(repo('resources/images/emoji/fluent-color/' + entry.file), path.join(REC, 'emoji', entry.file));
    emojiMap[entry.emoji] = entry.file;
}
await copyFile(repo('resources/images/emoji/fluent-color/LICENSE'), path.join(REC, 'licencias', 'fluent-emoji-LICENSE.txt'));

// 4. Íconos Lucide (ISC), solo los nodos de los que se usan.
const ICONS = ['house', 'calendar-clock', 'plus', 'wallet', 'chart-pie', 'x', 'chevron-left', 'chevron-right', 'chevron-down', 'chevron-up', 'bell', 'bell-ring', 'mic', 'check', 'circle-check', 'pencil', 'arrow-left-right', 'rotate-ccw', 'info', 'triangle-alert', 'settings', 'user-plus', 'users', 'book-open', 'palette', 'circle-question-mark', 'ellipsis', 'skip-forward', 'ban', 'lightbulb', 'sparkles', 'play', 'clock', 'calendar-days', 'list-checks', 'fast-forward', 'paintbrush', 'log-out', 'scale', 'receipt-text', 'arrow-right', 'trash-2', 'eye', 'refresh-cw', 'hand-coins', 'circle-plus', 'square-pen', 'mail', 'smartphone', 'bell-off', 'chart-column', 'arrow-up', 'arrow-down', 'circle-dashed', 'keyboard'];
const icons = {};
for (const name of ICONS) {
    const m = await import(pathToFileURL(repo('node_modules/@lucide/vue/dist/esm/icons/' + name + '.mjs')).href);
    icons[name] = m.__iconNode.map(([tag, attrs]) => '<' + tag + ' ' + Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ') + '/>').join('');
}
await copyFile(repo('node_modules/@lucide/vue/LICENSE'), path.join(REC, 'licencias', 'lucide-LICENSE.txt'));

// 5. Dibujos propios de la app: patrón Círculos, portadas de ahorro e ilustraciones.
const { HOME_CIRCLES } = await imp('resources/js/lib/home-patterns.ts');
const { SAVINGS_COVER_ART } = await imp('resources/js/lib/savings-cover-art.ts');
const { ILLUSTRATION_ART } = await imp('resources/js/lib/illustration-art.ts');

function shapes(items, prefix) {
    let out = '';
    for (const [tag, props, children] of items) {
        const attrs = [];
        for (const [k, v] of Object.entries(props)) {
            if (k === 'motion' || k === 'principal') continue;
            const value = (k === 'fill' || k === 'stroke') && v !== 'none' && /^[a-z0-9]+$/.test(String(v)) ? `var(--${prefix}-${v})` : v;
            attrs.push(`${k}="${value}"`);
        }
        out += `<${tag} ${attrs.join(' ')}>` + (children ? shapes(children, prefix) : '') + `</${tag}>`;
    }
    return out;
}
const COVERS = ['emergencia-paraguas', 'tecnologia-laptop', 'viaje-playa', 'general-amanecer', 'general-alcancia', 'casa-colina', 'estudios-birrete', 'celebracion-navidad', 'vehiculo-carro'];
const covers = Object.fromEntries(COVERS.map((k) => [k, shapes(SAVINGS_COVER_ART[k], 'cover')]));
const illus = Object.fromEntries(['bienvenida', 'meta', 'cuentas', 'ahorros', 'movimientos', 'error'].map((k) => [k, shapes(ILLUSTRATION_ART[k], 'art')]));
const circles = HOME_CIRCLES.map(([cx, cy, r, tone]) => `<circle cx="${cx}" cy="${cy}" r="${r}" data-home-tone="${tone}"/>`).join('');

const arte =
    '// Generado por herramientas/generar-recursos.mjs desde el repo (solo lectura). No editar.\n' +
    'window.ARTE = ' + JSON.stringify({ icons, covers, illus, circles, emoji: emojiMap }) + ';\n';
await writeFile(path.join(REC, 'arte.js'), arte);

console.log(JSON.stringify({ tokens: tokensCss.length, reglas: componentRules.length, fuentes: fontsCss.length, emoji: Object.keys(emojiMap).length, iconos: Object.keys(icons).length, portadas: COVERS.length, ilustraciones: Object.keys(illus).length, arte: arte.length }));
