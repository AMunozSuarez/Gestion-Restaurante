import React, { useState } from 'react';
import { MapIcon, XMarkIcon } from '@heroicons/react/24/outline';

const AddressModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  address = null, 
  isLoading = false,
  inputRef = null
}) => {
  const [addressText, setAddressText] = useState(address?.address || '');
  const [deliveryCost, setDeliveryCost] = useState(address?.deliveryCost || 0);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (isOpen) {
      setAddressText(address?.address || '');
      setDeliveryCost(address?.deliveryCost || 0);
      setErrors({});
    }
  }, [isOpen, address]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!addressText.trim()) {
      newErrors.address = 'La dirección es obligatoria';
    }
    
    if (deliveryCost < 0) {
      newErrors.deliveryCost = 'El costo de envío no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    onSave({
      address: addressText.trim(),
      deliveryCost: parseFloat(deliveryCost) || 0,
      _id: address?._id
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapIcon className="w-6 h-6 text-white" />
              <h3 className="text-lg font-medium text-white">
                {address ? 'Editar Dirección' : 'Nueva Dirección'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección de Entrega *
                </label>
                <textarea
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    errors.address ? 'border-red-300' : 'border-gray-300'
                  }`}
                  rows="3"
                  placeholder="Ingrese la dirección completa de entrega..."
                  ref={inputRef}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo de Envío
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.deliveryCost ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.deliveryCost && (
                  <p className="mt-1 text-sm text-red-600">{errors.deliveryCost}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                address ? 'Actualizar' : 'Agregar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;