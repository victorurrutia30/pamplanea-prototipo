// Ayudante mínimo de Chrome DevTools Protocol con Node 22 (fetch y WebSocket nativos), sin
// dependencias. Abre Chrome o Edge sin ventana, navega por file:// y toma capturas exactas.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const NAVEGADORES = {
    chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
};
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function abrir({ navegador = 'chrome', puerto = 9655 } = {}) {
    const perfil = await mkdtemp(path.join(os.tmpdir(), 'v2-proto-'));
    const proc = spawn(NAVEGADORES[navegador], ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', `--remote-debugging-port=${puerto}`, `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore', windowsHide: true });
    let target;
    for (let i = 0; i < 150 && !target; i++) {
        try {
            target = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find((t) => t.type === 'page');
        } catch {
            await esperar(100);
        }
    }
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => socket.addEventListener('open', r, { once: true }));
    let id = 0;
    const pendientes = new Map();
    const errores = [];
    const fallidas = [];
    socket.addEventListener('message', (e) => {
        const d = JSON.parse(e.data);
        if (d.id && pendientes.has(d.id)) {
            pendientes.get(d.id)(d);
            pendientes.delete(d.id);
        }
        if (d.method === 'Runtime.exceptionThrown') errores.push('excepción: ' + (d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text));
        if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) errores.push(d.params.type + ': ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
        if (d.method === 'Log.entryAdded' && ['error', 'warning'].includes(d.params.entry.level)) errores.push('log ' + d.params.entry.level + ': ' + d.params.entry.text + ' ' + (d.params.entry.url ?? ''));
        if (d.method === 'Network.loadingFailed') fallidas.push(d.params.errorText + ' ' + (d.params.blockedReason || ''));
    });
    const enviar = (method, params = {}, sesion) =>
        new Promise((resolve, reject) => {
            const clave = ++id;
            const t = setTimeout(() => reject(new Error('timeout ' + method)), 60000);
            pendientes.set(clave, (d) => {
                clearTimeout(t);
                d.error ? reject(new Error(method + ': ' + d.error.message)) : resolve(d.result);
            });
            socket.send(JSON.stringify({ id: clave, method, params, ...(sesion ? { sessionId: sesion } : {}) }));
        });
    const evaluar = async (expression) => {
        const r = await enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
        return r.result.value;
    };
    await enviar('Page.enable');
    await enviar('Runtime.enable');
    await enviar('Log.enable');
    await enviar('Network.enable');
    const api = {
        errores,
        fallidas,
        enviar,
        evaluar,
        async tamano(width, height, { movil = true, toque = true } = {}) {
            await enviar('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: movil });
            await enviar('Emulation.setTouchEmulationEnabled', { enabled: toque });
        },
        async movimientoReducido(si) {
            await enviar('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: si ? 'reduce' : 'no-preference' }] });
        },
        async ir(url, listo = 'document.readyState === "complete"') {
            await enviar('Page.navigate', { url });
            for (let i = 0; i < 200; i++) {
                await esperar(50);
                try {
                    if (await evaluar(listo)) break;
                } catch {
                    /* cargando */
                }
            }
            await evaluar('document.fonts.ready.then(() => true)');
        },
        async captura(archivo, clip = null) {
            await mkdir(path.dirname(archivo), { recursive: true });
            const r = await enviar('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}) });
            await writeFile(archivo, Buffer.from(r.data, 'base64'));
        },
        cerrar() {
            socket.close();
            proc.kill();
        },
    };
    return api;
}
