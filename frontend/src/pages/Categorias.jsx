import React, { useState, useMemo } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  EyeIcon,
  EyeSlashIcon,
  TagIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button, Card, Input, Badge } from '../components/ui';
import CategoryFormModal from '../components/common/CategoryFormModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import useCategoriesManagement from '../hooks/useCategoriesManagement';

const Categorias = () => {
  // Estados del hook de gestión de categorías
  const {
    categories,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryAvailability,
    refreshCategories
  } = useCategoriesManagement();

  // Estados locales del componente
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [notification, setNotification] = useState(null);
  
  // Estados para modales de confirmación
  const [showToggleModal, setShowToggleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filtrar categorías según búsqueda y disponibilidad
  const filteredCategories = useMemo(() => {
    let filtered = categories;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por disponibilidad
    if (availabilityFilter !== 'all') {
      filtered = filtered.filter(category => 
        availabilityFilter === 'available' ? category.isAvailable : !category.isAvailable
      );
    }

    return filtered;
  }, [categories, searchTerm, availabilityFilter]);

  // Manejar creación de categoría
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowFormModal(true);
  };

  // Manejar edición de categoría
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setShowFormModal(true);
  };

  // Manejar envío del formulario
  const handleFormSubmit = async (categoryData) => {
    try {
      let result;
      if (editingCategory) {
        result = await updateCategory(editingCategory.id, categoryData);
      } else {
        result = await createCategory(categoryData);
      }

      if (result.success) {
        setShowFormModal(false);
        setEditingCategory(null);
        showNotification(
          editingCategory 
            ? '✅ Categoría actualizada exitosamente' 
            : '✅ Categoría creada exitosamente',
          'success'
        );
      } else {
        showNotification(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // Manejar cambio de disponibilidad
  const handleToggleAvailability = (category) => {
    setSelectedCategory(category);
    setShowToggleModal(true);
  };

  // Confirmar cambio de disponibilidad
  const confirmToggleAvailability = async () => {
    if (!selectedCategory) return;

    try {
      const result = await toggleCategoryAvailability(selectedCategory.id, !selectedCategory.isAvailable);
      if (result.success) {
        setShowToggleModal(false);
        setSelectedCategory(null);
        
        if (!selectedCategory.isAvailable) {
          // Activando categoría
          showNotification('✅ Categoría activada exitosamente', 'success');
        } else {
          // Desactivando categoría
          if (result.data?.affectedProductsCount > 0) {
            showNotification(
              `✅ Categoría desactivada exitosamente. ${result.data.affectedProductsCount} productos también fueron desactivados.`,
              'success'
            );
          } else {
            showNotification('✅ Categoría desactivada exitosamente', 'success');
          }
        }
      } else {
        showNotification(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
      setShowToggleModal(false);
      setSelectedCategory(null);
    }
  };

  // Manejar eliminación de categoría
  const handleDeleteCategory = (category) => {
    // Verificar si la categoría tiene productos enlazados
    if (category.productCount > 0) {
      showNotification(
        `❌ No se puede eliminar la categoría "${category.title}" porque tiene ${category.productCount} producto(s) enlazado(s). Primero elimine o reasigne los productos a otra categoría.`,
        'error'
      );
      return;
    }

    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  // Confirmar eliminación de categoría
  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      const result = await deleteCategory(selectedCategory.id);
      if (result.success) {
        setShowDeleteModal(false);
        setSelectedCategory(null);
        showNotification('✅ Categoría eliminada exitosamente', 'success');
      } else {
        showNotification(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
      setShowDeleteModal(false);
      setSelectedCategory(null);
    }
  };

  // Mostrar notificación
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TagIcon className="w-8 h-8 text-brown-900" />
              <h1 className="text-2xl font-bold text-brown-900">Gestión de Categorías</h1>
            </div>
            <Button onClick={handleCreateCategory}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Nueva Categoría
            </Button>
          </div>

          {/* Notificación */}
          {notification && (
            <div className={`p-4 rounded-lg ${
              notification.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {notification.message}
            </div>
          )}

          {/* Filtros */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar categorías..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">Todas las categorías</option>
                  <option value="available">Solo disponibles</option>
                  <option value="unavailable">Solo no disponibles</option>
                </select>
                
                <Button 
                  variant="outline" 
                  onClick={refreshCategories}
                  disabled={isLoading}
                >
                  {isLoading ? 'Cargando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Error */}
          {error && (
            <Card className="p-4 bg-red-50 border border-red-200">
              <div className="text-red-800">
                ❌ Error: {error}
              </div>
            </Card>
          )}

          {/* Lista de categorías */}
          {isLoading ? (
            <Card className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando categorías...</p>
              </div>
            </Card>
          ) : filteredCategories.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                {searchTerm || availabilityFilter !== 'all' ? (
                  <>
                    <TagIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron categorías</h3>
                    <p className="mb-4">No hay categorías que coincidan con los filtros aplicados.</p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setAvailabilityFilter('all');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <TagIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">No hay categorías</h3>
                    <p className="mb-4">Comienza creando tu primera categoría para organizar tus productos.</p>
                    <Button onClick={handleCreateCategory}>
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Crear Primera Categoría
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-brown-900">
                          {category.title}
                        </h3>
                        <Badge 
                          variant={category.isAvailable ? 'success' : 'error'}
                          size="sm"
                        >
                          {category.isAvailable ? 'Disponible' : 'No disponible'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Información adicional */}
                  <div className="text-sm text-gray-600 mb-4">
                    <p className="flex items-center gap-1">
                      <span className="font-medium">Productos:</span>
                      <Badge 
                        variant={category.productCount > 0 ? 'default' : 'secondary'} 
                        size="sm"
                      >
                        {category.productCount}
                      </Badge>
                    </p>
                    <p>Creada: {formatDate(category.createdAt)}</p>
                    {category.updatedAt !== category.createdAt && (
                      <p>Actualizada: {formatDate(category.updatedAt)}</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                      disabled={isUpdating}
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAvailability(category)}
                      className={category.isAvailable ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}
                    >
                      {category.isAvailable ? (
                        <>
                          <EyeSlashIcon className="w-4 h-4 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={isDeleting || category.productCount > 0}
                      className={`${category.productCount > 0 
                        ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                        : 'text-red-600 hover:bg-red-50'}`}
                      title={category.productCount > 0 
                        ? `No se puede eliminar: tiene ${category.productCount} producto(s) enlazado(s)` 
                        : 'Eliminar categoría'}
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      {category.productCount > 0 ? 'Bloqueado' : 'Eliminar'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal de formulario */}
        <CategoryFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setEditingCategory(null);
          }}
          onSubmit={handleFormSubmit}
          category={editingCategory}
          isLoading={isCreating || isUpdating}
        />

        {/* Modal de confirmación para cambio de disponibilidad */}
        <ConfirmationModal
          isOpen={showToggleModal}
          onClose={() => {
            setShowToggleModal(false);
            setSelectedCategory(null);
          }}
          onConfirm={confirmToggleAvailability}
          title={selectedCategory?.isAvailable ? 'Desactivar Categoría' : 'Activar Categoría'}
          message={
            selectedCategory?.isAvailable
              ? `¿Estás seguro de que quieres desactivar la categoría "${selectedCategory?.title}"?`
              : `¿Estás seguro de que quieres activar la categoría "${selectedCategory?.title}"?`
          }
          details={
            selectedCategory?.isAvailable && selectedCategory?.productCount > 0
              ? [
                  `Se desactivarán automáticamente ${selectedCategory.productCount} producto(s) de esta categoría`,
                  'Los productos desactivados no aparecerán en el menú',
                  'Puedes reactivar la categoría y productos individualmente después'
                ]
              : null
          }
          confirmText={selectedCategory?.isAvailable ? 'Desactivar' : 'Activar'}
          type={selectedCategory?.isAvailable ? 'warning' : 'warning'}
          isLoading={isUpdating}
        />

        {/* Modal de confirmación para eliminación */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCategory(null);
          }}
          onConfirm={confirmDeleteCategory}
          title="Eliminar Categoría"
          message={`¿Estás seguro de que quieres eliminar permanentemente la categoría "${selectedCategory?.title}"?`}
          details={[
            'Esta acción no se puede deshacer',
            'La categoría será eliminada del sistema',
            'Asegúrate de que no hay productos enlazados a esta categoría'
          ]}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default Categorias;