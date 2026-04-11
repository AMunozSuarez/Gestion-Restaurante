import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Input, Modal } from '../ui';

const CategoryFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  category = null, 
  isLoading = false 
}) => {
  const titleInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    isAvailable: true
  });

  const [errors, setErrors] = useState({});

  // Llenar formulario cuando se edita una categoría
  useEffect(() => {
    if (category) {
      setFormData({
        title: category.title || '',
        isAvailable: category.isAvailable !== undefined ? category.isAvailable : true
      });
    } else {
      setFormData({
        title: '',
        isAvailable: true
      });
    }
    setErrors({});
  }, [category, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpiar error del campo modificado
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El nombre de la categoría es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const categoryData = {
      ...formData,
      title: formData.title.trim()
    };

    await onSubmit(categoryData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={category ? 'Editar Categoría' : 'Crear Categoría'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            ref={titleInputRef}
            label="Nombre de la Categoría"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="Ej: Hamburguesas, Bebidas, Postres..."
            required
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isAvailable"
              checked={formData.isAvailable}
              onChange={handleChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-brown-700">
              Categoría disponible
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            {category ? 'Actualizar' : 'Crear'} Categoría
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CategoryFormModal;