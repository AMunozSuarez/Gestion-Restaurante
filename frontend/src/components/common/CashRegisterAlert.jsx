import React, { useState } from 'react';
import { Modal, Button, Input } from '../ui';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const CashRegisterAlert = ({ isOpen, onClose, onOpenCashRegister }) => {
  const [initialAmount, setInitialAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenCash = async () => {
    if (!initialAmount || parseFloat(initialAmount) < 0) {
      setError('Ingrese un monto inicial válido');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await onOpenCashRegister(initialAmount);
    
    if (result.success) {
      setInitialAmount('');
      onClose();
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Caja Registradora Requerida">
      <div className="text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-brown-900 mb-2">
          No hay caja registradora abierta
        </h3>
        <p className="text-gray-600 mb-6">
          Para ver y gestionar pedidos, necesita abrir una caja registradora.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <p className="text-sm text-red-600">{error}</p>
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
      </div>
    </Modal>
  );
};

export default CashRegisterAlert;