import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

// Tablero paginado para el modo TV.
//
// El TV de cocina no tiene teclado ni mouse: cualquier cosa que quede fuera de
// la pantalla es inalcanzable, no solo incómoda. Por eso aquí no hay scroll.
//
// El contenido se reparte con CSS multicolumn y altura fija (`column-fill: auto`
// llena cada columna antes de pasar a la siguiente). Las columnas que no caben
// quedan a la derecha, fuera de la vista, y el tablero rota entre "páginas" solo.
// El navegador hace todo el empaquetado: las tarjetas altas y bajas se acomodan
// sin dejar los huecos que deja una grilla por filas.

const PAGE_EPSILON_PX = 2; // absorbe el redondeo subpíxel al medir
const MAX_PAGE_DOTS = 8;
// Si esta pantalla además se toca, la rotación automática cambiaría de página
// bajo el dedo justo mientras alguien marca productos. Cualquier toque la
// congela este rato; después sigue sola.
const ROTATE_PAUSE_MS = 20 * 1000;

const KdsBoard = ({
  children,
  columnWidth,
  gap = 16,
  rotateSeconds,
  scale = 1,
  revision,
  interactive = false,
  autoRotate = true,
}) => {
  const viewportRef = useRef(null);
  const columnsRef = useRef(null);
  const [page, setPage] = useState(0);
  const [metrics, setMetrics] = useState({ width: 0, pageCount: 1 });
  const [paused, setPaused] = useState(false);
  const pausedUntilRef = useRef(0);
  const pauseTimerRef = useRef(null);

  const measure = useCallback(() => {
    const el = columnsRef.current;
    if (!el) return;

    // clientWidth devuelve un entero redondeado. Con una escala fraccionaria
    // (1920 / 1.4 = 1371,43 → 1371) ese redondeo se acumula página tras página y
    // las columnas se van corriendo hacia un costado. getBoundingClientRect sí
    // da decimales, pero en coordenadas de pantalla: dividir por la escala lo
    // devuelve al sistema local, que es donde se aplica el transform.
    const rect = el.getBoundingClientRect();
    const width = scale > 0 ? rect.width / scale : el.clientWidth;
    if (width <= 0) return;

    // scrollWidth incluye las columnas que desbordan a la derecha, incluso con
    // overflow oculto. Cada página avanza (ancho + gap) porque entre la última
    // columna de una página y la primera de la siguiente hay una separación.
    const step = width + gap;
    const pageCount = Math.max(1, Math.ceil((el.scrollWidth + gap - PAGE_EPSILON_PX) / step));

    setMetrics((prev) =>
      Math.abs(prev.width - width) < 0.01 && prev.pageCount === pageCount ? prev : { width, pageCount }
    );
  }, [gap, scale]);

  // Se remide cuando cambia el contenido: el ancho del contenedor no cambia
  // cuando aparecen columnas de desborde, así que un ResizeObserver sobre él
  // nunca se enteraría de que ahora hacen falta más páginas.
  useLayoutEffect(() => {
    measure();
  }, [measure, revision, columnWidth, scale]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  // Las fuentes web (Inter/Nunito) cambian la altura de las tarjetas al cargar,
  // y con ello cuántas caben por columna.
  useEffect(() => {
    if (!document.fonts?.ready) return undefined;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) measure();
    });
    return () => {
      cancelled = true;
    };
  }, [measure]);

  // Si se cerraron pedidos y ahora sobran páginas, volver al principio en vez de
  // quedar mostrando una página vacía.
  useEffect(() => {
    setPage((prev) => (prev >= metrics.pageCount ? 0 : prev));
  }, [metrics.pageCount]);

  const pauseRotation = useCallback(() => {
    pausedUntilRef.current = Date.now() + ROTATE_PAUSE_MS;
    setPaused(true);
    clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setPaused(false), ROTATE_PAUSE_MS);
  }, []);

  useEffect(() => () => clearTimeout(pauseTimerRef.current), []);

  // La pausa se lee desde una ref para no reiniciar el intervalo en cada toque.
  useEffect(() => {
    if (!autoRotate || metrics.pageCount <= 1) return undefined;
    const interval = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      setPage((prev) => (prev + 1) % metrics.pageCount);
    }, Math.max(4, rotateSeconds) * 1000);
    return () => clearInterval(interval);
  }, [autoRotate, metrics.pageCount, rotateSeconds]);

  const goToPage = useCallback(
    (delta) => {
      pauseRotation();
      setPage((prev) => (prev + delta + metrics.pageCount) % metrics.pageCount);
    },
    [pauseRotation, metrics.pageCount]
  );

  const offset = page * (metrics.width + gap);

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={viewportRef}
        className="h-full overflow-hidden"
        style={{ zoom: scale }}
        onPointerDown={interactive && autoRotate ? pauseRotation : undefined}
      >
        <div
          ref={columnsRef}
          className="h-full transition-transform duration-500 ease-in-out"
          style={{
            columnWidth: `${columnWidth}px`,
            columnGap: `${gap}px`,
            columnFill: 'auto',
            transform: `translateX(-${offset}px)`,
          }}
        >
          {children}
        </div>
      </div>

      {metrics.pageCount > 1 && (
        <div className="absolute bottom-0 right-0 flex items-center gap-3 px-3 py-2 rounded-tl-xl bg-gray-950/85 text-base">
          {paused && autoRotate && (
            <span className="text-amber-400" title="Cambio automático en pausa mientras se usa la pantalla">
              ⏸
            </span>
          )}
          {metrics.pageCount <= MAX_PAGE_DOTS &&
            Array.from({ length: metrics.pageCount }, (_, index) => (
              <span
                key={index}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === page ? 'bg-amber-400' : 'bg-gray-600'
                }`}
              />
            ))}
          <span className="font-bold text-white tabular-nums">
            {page + 1}/{metrics.pageCount}
          </span>
          {/* Con cambio manual las flechas son obligatorias aunque la pantalla
              sea de solo mostrar: sin ellas no habría forma de llegar a las
              páginas siguientes y esos pedidos quedarían invisibles. */}
          {(interactive || !autoRotate) && (
            // 56x56: se aprietan con el dedo, y con las manos ocupadas. Material
            // recomienda 48dp como mínimo y WCAG 24px como piso absoluto; un
            // botón de flecha "de escritorio" quedaba en 27x22 y era inusable.
            // touch-manipulation quita el retardo del doble toque para zoom.
            <div className="flex items-center gap-2 ml-1">
              <button
                onClick={() => goToPage(-1)}
                aria-label="Página anterior"
                className="w-14 h-14 flex items-center justify-center rounded-xl text-gray-200 bg-gray-800 hover:bg-gray-700 active:bg-amber-500 active:text-gray-900 transition-colors touch-manipulation select-none"
              >
                <ChevronLeftIcon className="w-8 h-8" />
              </button>
              <button
                onClick={() => goToPage(1)}
                aria-label="Página siguiente"
                className="w-14 h-14 flex items-center justify-center rounded-xl text-gray-200 bg-gray-800 hover:bg-gray-700 active:bg-amber-500 active:text-gray-900 transition-colors touch-manipulation select-none"
              >
                <ChevronRightIcon className="w-8 h-8" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KdsBoard;
