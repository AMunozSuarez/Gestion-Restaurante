import React from 'react';

// Alerta contextual que aparece flotando sobre un botón (en vez del alert()/toast fijo en la esquina)
const ButtonAlertBubble = ({ alert, onDismiss }) => {
    if (!alert) return null;

    const colorClasses = alert.type === 'error'
        ? 'bg-red-600 border-red-600'
        : 'bg-orange-500 border-orange-500';

    return (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-max max-w-[min(90vw,20rem)] animate-fade-in">
            <div className={`relative text-white text-sm font-medium px-3 py-2 rounded-lg shadow-lg ${colorClasses}`}>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="absolute -top-1.5 -right-1.5 bg-white text-gray-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none shadow"
                    aria-label="Cerrar aviso"
                >
                    ×
                </button>
                {alert.message}
                <div className={`absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${colorClasses}`} />
            </div>
        </div>
    );
};

export default ButtonAlertBubble;
