import React, { useRef, useEffect, useState } from 'react';
import { useCustomerSearch } from '../../hooks/customer/useCustomerSearch';
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
  // Rastrear la fuente del cambio para distinguir entre actualizaciones
  const changeSourceRef = useRef(null);

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
    // Solo actualizar si el valor viene del exterior (no por edición manual)
    if (initialValue !== undefined && changeSourceRef.current !== 'input') {
      setSearchQuery(initialValue);
      
      // IMPORTANTE: Solo bloquear cuando estamos editando un pedido existente Y tenemos datos completos
      if (editingOrderId && selectedCustomerData && selectedCustomerData.name && initialValue) {
        setIsLocked(true);
      } else {
        // No bloquear mientras el usuario está escribiendo
        setIsLocked(false);
      }
    }
  }, [initialValue, setSearchQuery, editingOrderId, selectedCustomerData]);

  // Sincronizar con datos de cliente seleccionado desde componente padre
  useEffect(() => {
    if (selectedCustomerData && selectedCustomerData._id) {
      setSelectedCustomer(selectedCustomerData);
      
      if (selectedCustomerData.phone) {
        // Solo bloquear si tenemos un cliente completo con ID
        setIsLocked(true);
        // Actualizar el campo de búsqueda
        setSearchQuery(selectedCustomerData.phone);
      }
    }
  }, [selectedCustomerData, setSearchQuery]);

  const handleSelect = (customer) => {
    changeSourceRef.current = 'selection';
    setSearchQuery(customer.phone);
    setSelectedCustomer(customer);
    // IMPORTANTE: Solo bloquear cuando seleccionamos explícitamente
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
      changeSourceRef.current = null;
    }, 100);
  };

  // Manejar cambios en el input manualmente (solo permitido cuando no está bloqueado)
  const handleInputChange = (e) => {
    if (isLocked) return;
    
    const newValue = e.target.value;
    changeSourceRef.current = 'input';
    setSearchQuery(newValue);
    setManualEdit(true);
    
    // IMPORTANTE: Al escribir manualmente, NO bloqueamos el input
    
    // Si borramos todo, limpiar la selección
    if (!newValue) {
        setSelectedCustomer(null);
    }
    
    // Pasar el valor actualizado al componente padre solo si no estamos en un ciclo
    if (onSelect && !hasNotifiedParentRef.current) {
      
      // Marcar que estamos notificando al padre
      hasNotifiedParentRef.current = true;
      
      // Solo envía la actualización del teléfono, sin más datos de cliente
      onSelect({ phone: newValue });
      
      // Resetear después de un breve tiempo
      setTimeout(() => {
          hasNotifiedParentRef.current = false;
          changeSourceRef.current = null;
      }, 100);
    }
  };

  // Función para limpiar la selección
  const handleClearSelection = () => {
    changeSourceRef.current = 'clear';
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
        changeSourceRef.current = null;
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
        
        {searchQuery && !disabled && (
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
              key={customer._id || customer.phone} 
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

export default CustomerAutocomplete;