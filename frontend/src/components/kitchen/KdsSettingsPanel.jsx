import React, { useMemo, useRef, useState } from 'react';
import {
  KDS_LIMITS,
  KDS_MODES,
  KDS_MODE_DESCRIPTIONS,
  KDS_MODE_LABELS,
  buildKdsScreenUrl,
} from '../../services/kdsScreenConfig';
import { SECTION_FILTERS, SECTION_LABELS } from '../../utils/kdsShared';

// La red del local suele ser HTTP en LAN, donde navigator.clipboard ni siquiera
// existe (solo vive en contextos seguros). Sin este respaldo, "copiar URL" sería
// un botón muerto justo en el ambiente donde más se necesita.
const copyText = async (text, inputRef) => {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permiso denegado o API no disponible: se intenta con el método antiguo.
  }

  const input = inputRef.current;
  if (!input) return false;
  try {
    input.select();
    input.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  }
};

const Field = ({ label, hint, children }) => (
  <div className="space-y-2">
    <div>
      <span className="block text-sm font-semibold text-gray-200 uppercase tracking-wide">{label}</span>
      {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
    </div>
    {children}
  </div>
);

// Deslizador con el valor actual destacado y los dos extremos rotulados. El
// rango nativo, a secas, se pierde sobre el panel oscuro: no se distingue cuánto
// llevas recorrido ni hasta dónde llega. El aspecto de la barra está en
// index.css (.kds-range); aquí solo se calcula hasta dónde va el relleno.
const RangeField = ({ label, hint, value, min, max, step, format, onChange }) => {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-200 uppercase tracking-wide">{label}</span>
        <span className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 text-amber-400 font-bold tabular-nums whitespace-nowrap">
          {format(value)}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="kds-range"
        style={{ '--kds-range-fill': `${fill}%` }}
      />

      <div className="flex items-center justify-between text-xs text-gray-500 tabular-nums">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>

      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
};

const KdsSettingsPanel = ({ config, categories, onChange, onReset, onClose }) => {
  const urlInputRef = useRef(null);
  const [copyState, setCopyState] = useState('');

  const isTvMode = config.mode === KDS_MODES.TV;
  const selectedIds = useMemo(() => new Set(config.categoryIds.map(String)), [config.categoryIds]);
  const shareUrl = useMemo(() => buildKdsScreenUrl(config), [config]);

  const toggleCategory = (categoryId) => {
    const next = new Set(selectedIds);
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    onChange({ categoryIds: [...next] });
  };

  const handleCopy = async () => {
    const copied = await copyText(shareUrl, urlInputRef);
    setCopyState(copied ? 'ok' : 'error');
    setTimeout(() => setCopyState(''), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-4 overflow-y-auto"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Configuración de esta pantalla</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Se guarda solo en este dispositivo y se mantiene aunque se reinicie o se cierre sesión.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-gray-300 hover:bg-gray-800 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <Field label="Nombre de la pantalla" hint="Para reconocerla de un vistazo. Ej: TV Cocina, Parrilla, Fríos.">
            <input
              type="text"
              value={config.screenName}
              onChange={(event) => onChange({ screenName: event.target.value })}
              placeholder="Sin nombre"
              maxLength={40}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </Field>

          <Field label="Cómo se muestran los pedidos" hint="Cambiar esto no altera ningún otro ajuste de la pantalla.">
            <div className="grid grid-cols-2 gap-2">
              {Object.values(KDS_MODES).map((mode) => {
                const isSelected = config.mode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => onChange({ mode })}
                    className={`px-4 py-3 rounded-lg text-left transition-colors ${
                      isSelected ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="block font-bold">{KDS_MODE_LABELS[mode]}</span>
                    <span className={`block text-xs mt-0.5 ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                      {KDS_MODE_DESCRIPTIONS[mode]}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Sección de venta">
            <div className="flex flex-wrap gap-2">
              {SECTION_FILTERS.map((section) => (
                <button
                  key={section}
                  onClick={() => onChange({ section })}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    config.section === section
                      ? 'bg-amber-500 text-gray-900'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {section === 'all' ? 'Todas' : SECTION_LABELS[section]}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Categorías de esta estación"
            hint={
              selectedIds.size === 0
                ? 'Sin selección = se muestran todas. Elige categorías para convertir esta pantalla en una estación.'
                : 'Solo se ven estos productos, y el pedido lo cierra la última estación en terminar.'
            }
          >
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">No hay categorías disponibles.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {categories.map((category) => {
                    const categoryId = String(category._id);
                    const isSelected = selectedIds.has(categoryId);
                    return (
                      <button
                        key={categoryId}
                        onClick={() => toggleCategory(categoryId)}
                        className={`flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-sm transition-colors ${
                          isSelected ? 'bg-amber-500/15 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
                            isSelected ? 'bg-amber-500 border-amber-500 text-gray-900' : 'border-gray-500 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="truncate">{category.title}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => onChange({ categoryIds: [] })}
                    className="text-sm font-medium text-amber-400 hover:text-amber-300"
                  >
                    Limpiar selección ({selectedIds.size})
                  </button>
                )}
              </>
            )}
          </Field>

          <RangeField
            label="Ancho de tarjeta"
            hint="Más angosto = más pedidos por pantalla."
            value={config.columnWidth}
            min={KDS_LIMITS.columnWidth.min}
            max={KDS_LIMITS.columnWidth.max}
            step={10}
            format={(value) => `${value} px`}
            onChange={(columnWidth) => onChange({ columnWidth })}
          />

          <RangeField
            label="Tamaño de letra"
            hint="Súbelo si la pantalla se mira de lejos."
            value={config.scale}
            min={KDS_LIMITS.scale.min}
            max={KDS_LIMITS.scale.max}
            step={0.05}
            format={(value) => `${Math.round(value * 100)} %`}
            onChange={(scale) => onChange({ scale })}
          />

          {isTvMode && (
            <>
              <Field
                label="Cambio de página"
                hint="Cuando hay más pedidos de los que caben en pantalla, se reparten en páginas."
              >
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onChange({ autoRotate: true })}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                      config.autoRotate ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Automático
                  </button>
                  <button
                    onClick={() => onChange({ autoRotate: false })}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                      !config.autoRotate ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    Manual
                  </button>
                </div>

                {!config.autoRotate && (
                  <p className="mt-2 p-3 rounded-lg bg-amber-950/60 border border-amber-800/70 text-amber-200 text-xs">
                    Las páginas se pasan a mano con las flechas <strong>‹ ›</strong> de la esquina inferior.
                    No dejes esta opción en una pantalla que nadie pueda tocar: los pedidos de las páginas
                    siguientes no se verían nunca.
                  </p>
                )}
              </Field>

              {config.autoRotate && (
                <RangeField
                  label="Cada cuánto cambia"
                  hint="Tiempo que se queda mostrando cada página antes de pasar a la siguiente."
                  value={config.rotateSeconds}
                  min={KDS_LIMITS.rotateSeconds.min}
                  max={KDS_LIMITS.rotateSeconds.max}
                  step={1}
                  format={(value) => `${value} s`}
                  onChange={(rotateSeconds) => onChange({ rotateSeconds })}
                />
              )}
            </>
          )}

          <Field
            label="Marcar productos desde aquí"
            hint={
              config.interactive
                ? 'Se pueden tocar los productos y confirmar pedidos. En modo Páginas, tocar la pantalla pausa el cambio automático 20 segundos.'
                : 'Solo muestra. Sin botones ni casillas, así entra más información en pantalla.'
            }
          >
            <button
              onClick={() => onChange({ interactive: !config.interactive })}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-colors ${
                config.interactive ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {config.interactive ? '👆 Se puede tocar' : '👁 Solo mostrar'}
            </button>
          </Field>

          <Field label="Sonido de pedido nuevo" hint="Solo suena por pedidos que esta pantalla realmente muestra.">
            <button
              onClick={() => onChange({ sound: !config.sound })}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-colors ${
                config.sound ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {config.sound ? '🔔 Activado' : '🔕 Silenciado'}
            </button>
          </Field>

          <Field
            label="Replicar en otro dispositivo"
            hint="Abre esta URL una vez en la otra pantalla: queda configurada igual y así se mantiene."
          >
            <div className="flex gap-2">
              <input
                ref={urlInputRef}
                type="text"
                value={shareUrl}
                readOnly
                onFocus={(event) => event.target.select()}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-gray-950 border border-gray-700 text-gray-300 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  copyState === 'ok'
                    ? 'bg-green-600 text-white'
                    : copyState === 'error'
                      ? 'bg-red-700 text-white'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                }`}
              >
                {copyState === 'ok' ? '✓ Copiada' : copyState === 'error' ? 'Copia manual' : 'Copiar'}
              </button>
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/40 transition-colors"
          >
            Restablecer esta pantalla
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-amber-500 text-gray-900 font-bold hover:bg-amber-400 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

export default KdsSettingsPanel;
