import React, { useRef, useEffect, useState } from 'react';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import '../../styles/components/customerAutocomplete.css';

const CustomerAutocomplete = ({ onSelect, disabled, initialValue = '', editingOrderId }) => {
  const { searchQuery, setSearchQuery, suggestions, isLoading, clearSuggestions } = useCustomerSearch();
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [manualEdit, setManualEdit] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

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

  useEffect(() => {
    if (initialValue !== undefined) {
      setSearchQuery(initialValue);
      setManualEdit(false);
      // Si se pasa un valor inicial y no está en modo manual, no bloqueamos el input
      if (!manualEdit) {
        setIsLocked(false);
      }
    }
  }, [initialValue, setSearchQuery]);

  const handleSelect = (customer) => {
    setSearchQuery(customer.phone);
    setSelectedCustomer(customer);
    setIsLocked(true);

    // Verificar qué datos se están pasando al padre
    console.log('Cliente seleccionado:', customer);

    // Pasar el cliente completo al componente padre, incluyendo el campo `comment`
    onSelect(customer);
    clearSuggestions();
    setManualEdit(true);
  };

  // Manejar cambios en el input manualmente (solo permitido cuando no está bloqueado)
  const handleInputChange = (e) => {
    if (isLocked) return;
    
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setManualEdit(true);
    
    // Pasar el valor actualizado al componente padre para mantener sincronizado
    // el estado del teléfono, sin seleccionar un cliente completo
    if (onSelect) {
      // Solo envía la actualización del teléfono, sin más datos de cliente
      onSelect({ phone: newValue });
    }
  };

  // Función para limpiar la selección
  const handleClearSelection = () => {
    setSearchQuery('');
    setSelectedCustomer(null);
    setIsLocked(false);
    setManualEdit(false);
    
    // Notificar al componente padre para limpiar todos los campos relacionados
    if (onSelect) {
      onSelect({ phone: '' });
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

export default CustomerAutocomplete;