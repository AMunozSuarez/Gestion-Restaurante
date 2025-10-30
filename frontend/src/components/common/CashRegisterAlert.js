import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/components/cashRegisterAlert.css';

const CashRegisterAlert = ({ onRetry, onClose }) => {
    const navigate = useNavigate();

    const handleGoToCashRegister = () => {
        navigate('/admin/caja');
    };

    const handleOverlayClick = (e) => {
        // Cerrar solo si se hace clic en el overlay, no en el contenedor
        if (e.target === e.currentTarget) {
            onClose?.();
        }
    };

    return (
        <div className="cash-register-alert-overlay" onClick={handleOverlayClick}>
            <div className="cash-register-alert-container">
                <button 
                    className="cash-register-alert-close"
                    onClick={onClose}
                    aria-label="Cerrar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
                
                <div className="cash-register-alert-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                </div>
                
                <h2 className="cash-register-alert-title">
                    No hay caja abierta
                </h2>
                
                <p className="cash-register-alert-message">
                    Para poder crear pedidos, es necesario que haya una caja registradora abierta.
                    Por favor, abre una caja antes de continuar.
                </p>

                <div className="cash-register-alert-actions">
                    <button 
                        className="cash-register-alert-button primary"
                        onClick={handleGoToCashRegister}
                    >
                        Ir a Caja Registradora
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CashRegisterAlert;
