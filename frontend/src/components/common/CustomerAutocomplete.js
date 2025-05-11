import React, { useRef, useEffect, useState, use } from 'react';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import '../../styles/components/customerAutocomplete.css';

const CustomerAutocomplete = ({ onSelect, disabled, initialValue = '', editingOrderId }) => {
  const { searchQuery, setSearchQuery, suggestions, isLoading, clearSuggestions } = useCustomerSearch();
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [manualEdit, setManualEdit] = useState(false);



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
    }
  }, [initialValue, setSearchQuery]);

  const handleSelect = (customer) => {
    setSearchQuery(customer.phone);



    // Verificar qué datos se están pasando al padre
    console.log('Cliente seleccionado:', customer);

    // Pasar el cliente completo al componente padre, incluyendo el campo `comment`
    onSelect(customer);
    clearSuggestions();
    setManualEdit(true);
  };

  // Manejar cambios en el input manualmente
  const handleInputChange = (e) => {
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

  return (
    <div className="customer-phone-autocomplete-wrapper">
      <input
        ref={inputRef}
        type="text"
        id="customerPhone"
        value={searchQuery}
        onChange={handleInputChange}
        disabled={disabled}
        // Mantener las mismas clases que los demás campos
        className={`form-control ${editingOrderId ? 'editing-input' : ''}`}
        autoComplete="off"
        required
      />
      
      {isLoading && <div className="customer-phone-search-indicator">Buscando...</div>}
      
      {suggestions.length > 0 && (
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