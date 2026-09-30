import React, { useState } from 'react';
import adminService from '../../services/adminService';

/**
 * Sección "Pago remoto (Haulmer/TUU)" del modal de restaurante del SuperAdmin.
 *
 * La API Key es write-only: el backend la guarda cifrada y solo devuelve los últimos 4
 * caracteres. Un campo vacío al guardar deja la clave actual intacta.
 *
 * El cobro de prueba usa la clave YA GUARDADA: primero se guarda, después se prueba.
 * Guía completa de puesta en marcha: docs/pago-remoto-haulmer.md
 */

const DTE_OPTIONS = [
  { value: 48, label: '48 · Comprobante afecto (boleta)' },
  { value: 0, label: '0 · Comprobante afecto (por defecto del POS)' },
  { value: 33, label: '33 · Factura afecta' },
  { value: 99, label: '99 · Comprobante exento' },
];

const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const RemotePaymentSettings = ({ restaurant, value, onChange }) => {
  const savedLast4 = restaurant?.paymentIntegrations?.haulmer?.apiKeyLast4 || '';
  const willDeleteKey = value.haulmerApiKey === null;

  const [testDevice, setTestDevice] = useState('');
  const [testMethod, setTestMethod] = useState('debito');
  const [testState, setTestState] = useState({ loading: false, message: '', error: false, key: null });

  const sendTest = async () => {
    setTestState({ loading: true, message: '', error: false, key: null });
    try {
      const result = await adminService.testRemotePayment(restaurant._id, { device: testDevice.trim(), paymentMethod: testMethod });
      setTestState({
        loading: false,
        error: false,
        key: result.idempotencyKey,
        message: `${result.message} Estado: ${result.status || 'enviado'}.`,
      });
    } catch (error) {
      setTestState({ loading: false, error: true, key: null, message: error.message });
    }
  };

  const checkTest = async () => {
    if (!testState.key) return;
    setTestState((prev) => ({ ...prev, loading: true }));
    try {
      const result = await adminService.getTestRemotePayment(restaurant._id, testState.key);
      setTestState((prev) => ({ ...prev, loading: false, error: false, message: `Estado del cobro de prueba: ${result.status || 'desconocido'}.` }));
    } catch (error) {
      setTestState((prev) => ({ ...prev, loading: false, error: true, message: error.message }));
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Pago remoto con tarjeta (Haulmer/TUU)</h3>
        <p className="text-xs text-gray-500 mt-1">
          El cliente paga en el POS antes de que se cree el pedido. El POS de cada kiosco se asigna en su usuario (rol Kiosco).
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="remotePaymentEnabled"
          checked={value.remotePaymentEnabled}
          onChange={(e) => onChange({ remotePaymentEnabled: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="remotePaymentEnabled" className="ml-2 text-sm font-medium text-gray-700">
          Cobrar con tarjeta en el kiosco
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API Key (Espacio de Trabajo → Pagos → Configuración → API)</label>
        {savedLast4 && !willDeleteKey && (
          <p className="text-xs text-green-700 mb-1">Configurada: ••••{savedLast4}. Deja el campo vacío para mantenerla.</p>
        )}
        {willDeleteKey && <p className="text-xs text-red-600 mb-1">La API Key se borrará al guardar.</p>}
        <div className="flex gap-2">
          <input
            type="password"
            autoComplete="new-password"
            value={value.haulmerApiKey || ''}
            disabled={willDeleteKey}
            onChange={(e) => onChange({ haulmerApiKey: e.target.value })}
            placeholder={savedLast4 ? 'Nueva API Key (opcional)' : 'Pega aquí la API Key'}
            className={`${inputClass} font-mono`}
          />
          {savedLast4 && (
            <button
              type="button"
              onClick={() => onChange({ haulmerApiKey: willDeleteKey ? '' : null })}
              className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              {willDeleteKey ? 'Deshacer' : 'Borrar'}
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento (DTE)</label>
        <select
          value={value.remotePaymentDteType}
          onChange={(e) => onChange({ remotePaymentDteType: Number(e.target.value) })}
          className={inputClass}
        >
          {DTE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="remotePaymentAllowPayAtCounter"
          checked={value.remotePaymentAllowPayAtCounter}
          onChange={(e) => onChange({ remotePaymentAllowPayAtCounter: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="remotePaymentAllowPayAtCounter" className="ml-2 text-sm font-medium text-gray-700">
          Permitir también "Pagar en caja"
        </label>
      </div>

      <div className="border-t border-gray-200 pt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700">Cobro de prueba ($100)</p>
        {!savedLast4 ? (
          <p className="text-xs text-gray-500">Guarda primero la API Key para poder probar.</p>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              El POS debe estar en Modo Integración. Anula la transacción en el POS después de probar.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={testDevice}
                onChange={(e) => setTestDevice(e.target.value)}
                placeholder="N° de serie del POS"
                className={`${inputClass} font-mono`}
              />
              <select value={testMethod} onChange={(e) => setTestMethod(e.target.value)} className="px-2 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendTest}
                disabled={!testDevice.trim() || testState.loading}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {testState.loading ? 'Enviando…' : 'Enviar cobro de prueba'}
              </button>
              {testState.key && (
                <button
                  type="button"
                  onClick={checkTest}
                  disabled={testState.loading}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Consultar estado
                </button>
              )}
            </div>
            {testState.message && (
              <p className={`text-xs ${testState.error ? 'text-red-600' : 'text-green-700'}`}>{testState.message}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RemotePaymentSettings;
