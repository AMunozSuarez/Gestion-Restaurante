import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Button, Input, Modal } from '../ui';
import ExtraSectionsManager from './ExtraSectionsManager';

const ProductFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  product = null, 
  categories = [], 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '',
    isAvailable: true,
    extraSections: []
  });

  const [errors, setErrors] = useState({});

  // Llenar formulario cuando se edita un producto
  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        description: product.description || '',
        price: product.price || '',
        imageUrl: product.imageUrl || '',
        category: product.category?._id || product.category || '',
        isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
        extraSections: product.extraSections || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        imageUrl: '',
        category: '',
        isAvailable: true,
        extraSections: []
      });
    }
    setErrors({});
  }, [product, isOpen]);

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
    const parsedPrice = parseFloat(formData.price);

    if (!formData.title.trim()) {
      newErrors.title = 'El nombre del producto es requerido';
    }

    if (formData.price === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      newErrors.price = 'El precio no puede ser negativo';
    }

    if (!formData.category) {
      newErrors.category = 'La categoría es requerida';
    }

    // Validar extraSections si existen
    if (formData.extraSections && formData.extraSections.length > 0) {
      formData.extraSections.forEach((section, sectionIndex) => {
        if (!section.sectionName || !section.sectionName.trim()) {
          newErrors.extraSections = `La sección ${sectionIndex + 1} debe tener un nombre`;
        }
        if (section.extras && section.extras.length > 0) {
          section.extras.forEach((extra, extraIndex) => {
            if (!extra.name || !extra.name.trim()) {
              newErrors.extraSections = `Todos los extras deben tener un nombre (Sección: ${section.sectionName || sectionIndex + 1})`;
            }
            if (extra.price < 0) {
              newErrors.extraSections = `Los precios no pueden ser negativos (Sección: ${section.sectionName || sectionIndex + 1})`;
            }
          });
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      extraSections: formData.extraSections || []
    };

    await onSubmit(productData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={product ? 'Editar Producto' : 'Crear Producto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nombre del Producto"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              placeholder="Ej: Hamburguesa Clásica"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Descripción
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Descripción del producto..."
            />
          </div>

          <Input
            label="Precio"
            name="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={handleChange}
            error={errors.price}
            placeholder="0.00"
            required
          />

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-1">
              Categoría
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.title || category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-red-600 mt-1">{errors.category}</p>
            )}
          </div>

          <Input
            label="URL de Imagen (Opcional)"
            name="imageUrl"
            type="url"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://ejemplo.com/imagen.jpg"
          />

          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isAvailable"
                checked={formData.isAvailable}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-brown-700">
                Producto disponible
              </label>
            </div>
          </div>

          {/* Gestor de Extras por Secciones */}
          <div className="md:col-span-2">
            <ExtraSectionsManager
              extraSections={formData.extraSections}
              onChange={(newSections) => setFormData(prev => ({
                ...prev,
                extraSections: newSections
              }))}
            />
            {errors.extraSections && (
              <p className="text-sm text-red-600 mt-2">{errors.extraSections}</p>
            )}
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
            {product ? 'Actualizar' : 'Crear'} Producto
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;