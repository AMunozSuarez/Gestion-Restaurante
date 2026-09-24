import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Modal } from '../ui';

const TAG_COLORS = [
  '#0d9488', '#2563eb', '#7c3aed', '#db2777',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
];

const TagFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  tag = null,
  isLoading = false
}) => {
  const nameInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    color: TAG_COLORS[0]
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name || '',
        color: tag.color || TAG_COLORS[0]
      });
    } else {
      setFormData({
        name: '',
        color: TAG_COLORS[0]
      });
    }
    setErrors({});
  }, [tag, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 0);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la etiqueta es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit({
      ...formData,
      name: formData.name.trim()
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tag ? 'Editar Etiqueta' : 'Crear Etiqueta'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <Input
            ref={nameInputRef}
            label="Nombre de la Etiqueta"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Ej: Empresa ABC, Turno Mañana, Evento X..."
            required
          />

          <div>
            <label className="block text-sm font-medium text-brown-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    formData.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Elegir color ${color}`}
                />
              ))}
            </div>
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
            {tag ? 'Actualizar' : 'Crear'} Etiqueta
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TagFormModal;
