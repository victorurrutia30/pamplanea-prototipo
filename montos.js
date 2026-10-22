// Producto v2 · prototipo. v2.7 (C-6, APROBADO por Victor 2026-10-21: «vamos arreglar todo lo de como ingresar numeros
// tambien»): el teclado de montos. En el teléfono, cada campo de monto usa este teclado grande (dígitos, «.», borrar y
// «Listo») en vez del teclado del sistema: así el punto siempre está, también en iPhone. «25» = $25.00, «2.5» = $2.50,
// «1200» = $1,200.00; hasta 2 decimales y 9 dígitos. El monto se ve en vivo y grande, el lector de pantalla lo anuncia y
// funciona con un teclado físico (Escape lo cierra). En la computadora se escribe normal y se lee con las mismas reglas.
// Es el mismo componente para TODOS los campos de monto (`.campo--monto input`) y el mismo lector que Anotar
// (MOTOR.leerMonto). Sin dependencias.
'use strict';
(() => {
    const P = window.P;
    const M = window.MOTOR;
    const { esc } = P;
    const MAX_DIGITOS = 9;
    const MAX_DECIMALES = 2;
    // Ícono «borrar» (el mismo juego de íconos de la app, licencia en recursos/licencias).
    const BORRAR = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/></svg>';

    /** ¿Teléfono? Una pantalla táctil como puntero principal. Las pruebas lo fijan con `window.__tecladoMontos`. */
    function activo() {
        if (typeof window.__tecladoMontos === 'boolean') return window.__tecladoMontos;
        try {
            return window.matchMedia('(pointer: coarse)').matches;
        } catch {
            return false;
        }
    }
    /** Para las plantillas: en el teléfono el teclado del sistema no sale (sale este). */
    P.montoInputmode = () => (activo() ? 'none' : 'decimal');

    // ------------------------------------------------------------------ las reglas (puras; las usan las pruebas)
    /** El texto de un campo, listo para seguir escribiendo con el teclado: «1,200.00» → «1200.00». */
    function limpio(v) {
        const t = String(v || '').trim();
        if (!t) return '';
        const c = M.leerMonto(t, true);
        return c === null ? t.replace(/[^\d.]/g, '') : M.montoCampo(c);
    }
    /**
     * Una tecla sobre el texto del monto. `reemplazar`: el campo traía un monto y es la primera tecla (como un texto
     * seleccionado): un dígito empieza de nuevo y borrar lo deja vacío. Si la tecla no cabe (3 decimales o más de 9
     * dígitos), el texto queda igual.
     */
    function teclear(valor, tecla, reemplazar = false) {
        const v = reemplazar ? '' : String(valor || '');
        if (tecla === 'borrar') return v.slice(0, -1);
        if (tecla === '.' || tecla === ',') return v.includes('.') ? valor : (v || '0') + '.';
        if (!/^\d$/.test(tecla)) return valor;
        let n = v + tecla;
        if (/^0\d/.test(n)) n = n.slice(1);
        const [ent, dec = ''] = n.split('.');
        if (dec.length > MAX_DECIMALES || (ent + dec).length > MAX_DIGITOS) return valor;
        return n;
    }
    /** Cómo se ve, grande: «» → «$0.00», «2.5» → «$2.50», «1200» → «$1,200.00». */
    function verMonto(v) {
        const t = String(v || '');
        if (!t) return '$0.00';
        const [ent, dec = ''] = t.split('.');
        return '$' + Number(ent || '0').toLocaleString('en-US') + '.' + (dec + '00').slice(0, 2);
    }
    const conFormato = (c) => (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    P.teclado = { activo, teclear, verMonto, limpio, MAX_DIGITOS, MAX_DECIMALES };

    // ------------------------------------------------------------------ el teclado en pantalla
    let abierto = null;
    const esCampo = (el) => !!(el && el.matches && el.matches('.campo--monto input'));
    const capa = () => {
        let c = document.getElementById('capa-teclado');
        if (!c) {
            c = Object.assign(document.createElement('div'), { id: 'capa-teclado', className: 'capa-teclado' });
            document.getElementById('app').appendChild(c);
        }
        return c;
    };
    const objetivo = () => (abierto ? document.getElementById(abierto.id) : null);
    function etiqueta(el) {
        const l = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        return l ? l.textContent.replace(/\s*\(opcional\)\s*/, '').trim() : '¿Cuánto?';
    }
    function pintar() {
        const el = objetivo();
        if (!el) return cerrar();
        const tecla = (t, txt, extra = '') => `<button type="button" class="tec-b" data-tecla="${t}" data-fk="tec-${t === '.' ? 'punto' : t}" ${extra}>${txt}</button>`;
        capa().innerHTML = `<section class="tec" role="group" aria-label="Teclado para escribir el monto">
            <div class="tec-cab"><p class="tec-l">${esc(etiqueta(el))}</p><p class="tec-v${el.value ? '' : ' tec-v--vacio'}" id="tec-v" aria-live="polite" aria-atomic="true">${esc(verMonto(el.value))}</p></div>
            <div class="tec-g">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => tecla(d, d)).join('')}${tecla('.', '.', 'aria-label="Punto"')}${tecla('0', '0')}${tecla('borrar', BORRAR, 'aria-label="Borrar"')}</div>
            <button type="button" class="btn btn--prim btn--48 tec-listo" data-tecla="listo" data-fk="tec-listo">Listo</button>
        </section>`;
        document.getElementById('app').classList.add('con-teclado');
    }
    function pintarValor() {
        const el = objetivo();
        const v = document.getElementById('tec-v');
        if (!el || !v) return;
        v.textContent = verMonto(el.value);
        v.classList.toggle('tec-v--vacio', !el.value);
    }
    /** El campo queda a la vista, arriba del teclado (se mueve la hoja o la pantalla, no el marco). */
    function aLaVista(el) {
        const c = el.closest('.hoja-c') || document.getElementById('vista');
        const t = document.querySelector('.tec');
        if (!c || !t) return;
        const r = el.getBoundingClientRect();
        const limite = t.getBoundingClientRect().top - 16;
        if (r.bottom > limite) c.scrollTop += r.bottom - limite;
        else if (r.top < c.getBoundingClientRect().top + 8) c.scrollTop -= c.getBoundingClientRect().top + 8 - r.top;
    }
    function abrir(el) {
        if (!el.id) return;
        abierto = { id: el.id, reemplazar: !!el.value.trim() };
        const t = limpio(el.value);
        if (t !== el.value) el.value = t;
        pintar();
        aLaVista(el);
        P.emitir('teclado:abierto');
    }
    function cerrar({ formatear = false } = {}) {
        const el = objetivo();
        abierto = null;
        const c = document.getElementById('capa-teclado');
        if (c) c.innerHTML = '';
        document.getElementById('app')?.classList.remove('con-teclado');
        // Al cerrar, el campo se ve con formato («1,200.00»), como al salir de él en la computadora.
        if (formatear && el && el.value.trim()) {
            const c2 = M.leerMonto(el.value);
            if (c2 !== null && el.value !== conFormato(c2)) {
                el.value = conFormato(c2);
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }
    function pulsar(tecla) {
        const el = objetivo();
        if (!el) return cerrar();
        if (tecla === 'listo') {
            cerrar({ formatear: true });
            const otra = document.getElementById(el.id);
            if (otra) otra.focus({ preventScroll: true });
            P.emitir('teclado:listo');
            return;
        }
        const nuevo = teclear(el.value, tecla, abierto.reemplazar);
        abierto.reemplazar = false;
        if (nuevo !== el.value) {
            el.value = nuevo;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        // La hoja pudo volver a dibujarse con lo escrito: el teclado sigue con el campo de siempre (por su id).
        if (!objetivo()) return cerrar();
        pintarValor();
    }
    P.teclado.abrir = (el) => activo() && esCampo(el) && abrir(el);
    P.teclado.cerrar = () => cerrar({ formatear: true });
    P.teclado.pulsar = pulsar;
    P.teclado.abierto = () => (abierto ? abierto.id : null);

    // En el teléfono, tocar el campo de monto abre este teclado (el del sistema no sale). Como el teclado del sistema
    // (V2-50), no se abre solo cuando una hoja pone el foco en el campo: al tocarlo, al llegar con Tab o al escribir.
    let conTab = false;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') conTab = true;
    }, true);
    document.addEventListener('pointerdown', () => {
        conTab = false;
    }, true);
    document.addEventListener('focusin', (e) => {
        if (!activo() || !esCampo(e.target)) return;
        if (e.target.getAttribute('inputmode') !== 'none') e.target.setAttribute('inputmode', 'none');
        if (conTab && (!abierto || abierto.id !== e.target.id)) abrir(e.target);
    });
    document.addEventListener('click', (e) => {
        if (activo() && esCampo(e.target) && (!abierto || abierto.id !== e.target.id)) abrir(e.target);
        const b = e.target.closest && e.target.closest('[data-tecla]');
        if (b && abierto) {
            e.preventDefault();
            e.stopPropagation();
            pulsar(b.dataset.tecla);
        }
    });
    // Tocar una tecla no le quita el foco al campo (el cursor sigue ahí y el lector no salta).
    for (const tipo of ['pointerdown', 'mousedown']) {
        document.addEventListener(tipo, (e) => {
            if (abierto && e.target.closest && e.target.closest('[data-tecla]')) e.preventDefault();
        });
    }
    document.addEventListener('focusout', (e) => {
        if (!abierto || e.target.id !== abierto.id) return;
        const a = e.relatedTarget;
        if (a && (a.closest('#capa-teclado') || esCampo(a))) return;
        setTimeout(() => {
            const act = document.activeElement;
            if (abierto && !(act && (act.closest('#capa-teclado') || (esCampo(act) && act.id === abierto.id)))) cerrar({ formatear: false });
        }, 0);
    });
    // Teclado físico con el teclado abierto: las mismas reglas. Escape lo cierra (no cierra la hoja).
    window.addEventListener(
        'keydown',
        (e) => {
            // Escribir con un teclado físico en el campo también abre el de montos (y sigue sus reglas).
            if (!abierto && activo() && esCampo(e.target) && /^[\d.,]$|^Backspace$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) abrir(e.target);
            if (!abierto) return;
            if (P.dlg && P.dlg.abierto) return;
            const t = e.key;
            if (t === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                const id = abierto.id;
                cerrar({ formatear: true });
                document.getElementById(id)?.focus({ preventScroll: true });
                return;
            }
            const enCampo = esCampo(e.target) && e.target.id === abierto.id;
            if (!enCampo) return;
            if (/^\d$/.test(t) || t === '.' || t === ',' || t === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                pulsar(t === 'Backspace' ? 'borrar' : t);
            } else if (t === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                pulsar('listo');
            } else if (t === 'Tab') cerrar({ formatear: true });
        },
        true,
    );
    // Si el campo ya no está (se cerró la hoja o cambió la pantalla), el teclado se va.
    window.addEventListener('DOMContentLoaded', () => {
        const app = document.getElementById('app');
        if (!app || !window.MutationObserver) return;
        new MutationObserver(() => {
            if (abierto && !objetivo()) cerrar();
            if (activo()) for (const el of app.querySelectorAll('.campo--monto input:not([inputmode="none"])')) el.setAttribute('inputmode', 'none');
        }).observe(app, { childList: true, subtree: true });
    });
})();
