import React, { useRef, useEffect, useState } from 'react';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import '../../styles/components/customerAutocomplete.css';

const CustomerAutocomplete = ({ onSelect, disabled, initialValue = '', editingOrderId, selectedCustomerData }) => {
  const { 
    searchQuery, 
    setSearchQuery, 
    suggestions, 
    isLoading, 
    clearSuggestions 
  } = useCustomerSearch();
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [manualEdit, setManualEdit] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Rastrear si ya se ha enviado al componente padre para evitar ciclos
  const hasNotifiedParentRef = useRef(false);

  // Manejar clic fuera del componente para cerrar sugerencias
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) && 
        !inputRef.current.contains(event.target)
      ) {
        clearSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSuggestions]);

  // Sincronizar con el valor inicial o cuando está en modo edición
  useEffect(() => {
    if (initialValue !== undefined) {
      console.log('[DEBUG] CustomerAutocomplete - Actualizando con initialValue:', initialValue);
      setSearchQuery(initialValue);
      setManualEdit(false);

      // Si estamos editando un pedido y hay un valor inicial, bloquear el input
      if (editingOrderId && initialValue) {
        setIsLocked(true);
        setManualEdit(true);
      } 
      // Si se pasa un valor inicial y no está en modo manual, no bloqueamos el input
      else if (!manualEdit) {
        setIsLocked(false);
      }
    }
  }, [initialValue, setSearchQuery, editingOrderId]);

  // Sincronizar con datos de cliente seleccionado desde componente padre
  useEffect(() => {
    if (selectedCustomerData) {
      console.log('[DEBUG] CustomerAutocomplete - Recibiendo datos de cliente del padre:', selectedCustomerData);
      setSelectedCustomer(selectedCustomerData);
      
      if (selectedCustomerData.phone) {
        setIsLocked(true);
        // Actualizar el campo de búsqueda solo si no está siendo editado manualmente
        if (!manualEdit || searchQuery !== selectedCustomerData.phone) {
          setSearchQuery(selectedCustomerData.phone);
        }
      }
    }
  }, [selectedCustomerData, setSearchQuery]);

  const handleSelect = (customer) => {
    console.log('[DEBUG] CustomerAutocomplete - Cliente seleccionado:', customer);
    setSearchQuery(customer.phone);
    setSelectedCustomer(customer);
    setIsLocked(true);
    setManualEdit(true);
    
    // Marcar que ya se ha notificado al padre para evitar ciclos
    hasNotifiedParentRef.current = true;
    
    // Notificar al componente padre del cliente seleccionado
    clearSuggestions();
    onSelect(customer);
    
    // Resetear después de un breve tiempo para permitir nueva notificación
    setTimeout(() => {
      hasNotifiedParentRef.current = false;
    }, 100);
  };

  // Manejar cambios en el input manualmente (solo permitido cuando no está bloqueado)
  const handleInputChange = (e) => {
    if (isLocked) return;
    
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setManualEdit(true);
    
    // Pasar el valor actualizado al componente padre solo si no estamos en un ciclo
    if (onSelect && !hasNotifiedParentRef.current) {
      console.log('[DEBUG] CustomerAutocomplete - Notificando cambio de teléfono:', newValue);
      
      // Marcar que estamos notificando al padre
      hasNotifiedParentRef.current = true;
      
      // Solo envía la actualización del teléfono, sin más datos de cliente
      onSelect({ phone: newValue });
      
      // Resetear después de un breve tiempo
      setTimeout(() => {
        hasNotifiedParentRef.current = false;
      }, 100);
    }
  };

  // Función para limpiar la selección
  const handleClearSelection = () => {
    console.log('[DEBUG] CustomerAutocomplete - Limpiando selección');
    setSearchQuery('');
    setSelectedCustomer(null);
    setIsLocked(false);
    setManualEdit(false);
    
    // Notificar al componente padre para limpiar todos los campos relacionados
    if (onSelect && !hasNotifiedParentRef.current) {
      hasNotifiedParentRef.current = true;
      onSelect({ phone: '' });
      setTimeout(() => {
        hasNotifiedParentRef.current = false;
      }, 100);
    }
    
    // Enfocar el input después de limpiar
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="customer-phone-autocomplete-wrapper">
      <div className="customer-phone-input-container">
        <input
          ref={inputRef}
          type="text"
          id="customerPhone"
          value={searchQuery}
          onChange={handleInputChange}
          disabled={disabled || isLocked}
          className={`form-control ${editingOrderId ? 'editing-input' : ''} ${isLocked ? 'locked-input' : ''}`}
          autoComplete="off"
          required
        />
        
        {isLocked && !disabled && (
          <button 
            type="button" 
            className="clear-selection-btn"
            id='clear-selection-btn'
            onClick={handleClearSelection}
            aria-label="Limpiar selección"
          >
            ×
          </button>
        )}
      </div>
      
      {isLoading && <div className="customer-phone-search-indicator">Buscando...</div>}
      
      {suggestions.length > 0 && !isLocked && (
        <ul ref={suggestionsRef} className="customer-phone-suggestions-list">
          {suggestions.map((customer) => (
            <li 
              key={customer._id} 
              onClick={() => handleSelect(customer)}
              className="customer-phone-suggestion-item"
            >
              <span className="customer-phone-suggestion-number">{customer.phone}</span>
              <span className="customer-phone-suggestion-name">{customer.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Usar React.memo para prevenir renderizados innecesarios
export default React.memo(CustomerAutocomplete, (prevProps, nextProps) => {
  // Solo renderizar si cambian estas props críticas
  return (
    prevProps.initialValue === nextProps.initialValue &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.editingOrderId === nextProps.editingOrderId &&
    JSON.stringify(prevProps.selectedCustomerData) === JSON.stringify(nextProps.selectedCustomerData)
  );
});