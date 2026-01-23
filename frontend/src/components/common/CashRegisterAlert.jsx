import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const CashRegisterAlert = ({ isOpen, onClose, onOpenCashRegister }) => {
  const [initialAmount, setInitialAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const navigate = useNavigate();

  // Resetear estado cuando se cierra el modal
  React.useEffect(() => {
    if (!isOpen) {
      setInitialAmount('');
      setError('');
      setRequiresSubscription(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleOpenCash = async () => {
    if (!initialAmount || parseFloat(initialAmount) < 0) {
      setError('Ingrese un monto inicial válido');
      return;
    }

    setIsLoading(true);
    setError('');
    setRequiresSubscription(false);

    const result = await onOpenCashRegister(initialAmount);
    
    setIsLoading(false);
    
    if (result.success) {
      setInitialAmount('');
      setError('');
      setRequiresSubscription(false);
      onClose();
    } else {
      // Si requiere suscripción, mantener el modal abierto y mostrar la alerta
      if (result.requiresSubscription) {
        setError(result.error || 'No tienes una suscripción activa');
        setRequiresSubscription(true);
        // NO cerrar el modal, dejarlo abierto para mostrar la alerta
      } else {
        // Para otros errores, solo mostrar el mensaje
        setError(result.error);
      }
    }
  };

  const handleGoToSubscription = () => {
    onClose();
    navigate('/subscription/plans');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={requiresSubscription ? "Suscripción Requerida" : "Caja Registradora Requerida"}>
      <div className="text-center">
        {requiresSubscription ? (
          <>
            {/* Alerta de suscripción requerida */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 mb-6">
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-900 mb-3">
                ⚠️ Suscripción Requerida
              </h3>
              <p className="text-red-700 mb-4 text-base">
                {error || 'No tienes una suscripción activa para poder abrir caja y realizar operaciones.'}
              </p>
              <div className="bg-white rounded-lg p-4 mb-4 border-2 border-red-200">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>¿Qué significa esto?</strong>
                </p>
                <ul className="text-sm text-gray-600 text-left space-y-1">
                  <li>• No podrás abrir caja registradora</li>
                  <li>• No podrás procesar pedidos</li>
                  <li>• El sistema está en modo solo lectura</li>
                </ul>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              <button
                onClick={handleGoToSubscription}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-lg font-bold text-base transition-all shadow-lg hover:shadow-xl"
              >
                🎯 Ver Planes de Suscripción
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-6 rounded-lg font-medium text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Modal normal de apertura de caja */}
            <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-brown-900 mb-2">
              No hay caja registradora abierta
            </h3>
            <p className="text-gray-600 mb-6">
              Para ver y gestionar pedidos, necesita abrir una caja registradora.
            </p>

            {error && !requiresSubscription && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Monto inicial de caja"
                type="number"
                step="0.01"
                min="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0.00"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleOpenCash}
                  className="flex-1"
                  loading={isLoading}
                >
                  Abrir Caja
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CashRegisterAlert;