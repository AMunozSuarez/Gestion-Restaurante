import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Modal } from '../ui';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // 'warning', 'danger'
  isLoading = false,
  details = null // Array de detalles adicionales
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />;
      case 'warning':
      default:
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'warning':
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
    }
  };

  const colors = getColors();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className={`flex-shrink-0 p-2 rounded-full ${colors.bg}`}>
            {getIcon()}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-brown-900 mb-2">
              {title}
            </h3>
            
            <div className={`p-3 rounded-md ${colors.bg} ${colors.border} border`}>
              <p className={`text-sm ${colors.text}`}>
                {message}
              </p>
              
              {details && details.length > 0 && (
                <div className="mt-3">
                  <ul className={`text-sm ${colors.text} space-y-1`}>
                    {details.map((detail, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
            className={`text-white ${colors.button}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;