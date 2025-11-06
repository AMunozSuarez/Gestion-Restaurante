import React, { useState, useMemo } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  EyeIcon,
  EyeSlashIcon,
  TagIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { Button, Card, Input, Badge } from '../components/ui';
import ProductFormModal from '../components/common/ProductFormModal';
import useProductsManagement from '../hooks/useProductsManagement';
import { formatChileanCurrency } from '../utils/dateUtils';

const Productos = () => {
  // Estados del hook de gestión de productos
  const {
    products,
    categories,
    isLoading,
    error,
    isCreating,
    isUpdating,
    createProduct,
    updateProduct,
    toggleProductAvailability,
    refreshProducts
  } = useProductsManagement();

  // Estados locales del componente
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [notification, setNotification] = useState(null);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      let matches = true;

      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        matches = matches && (
          product.title?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower)
        );
      }

      // Filtro por categoría
      if (selectedCategory !== 'all') {
        matches = matches && (
          product.category?._id === selectedCategory ||
          product.category === selectedCategory
        );
      }

      // Filtro por disponibilidad
      if (availabilityFilter !== 'all') {
        matches = matches && (
          availabilityFilter === 'available' ? product.isAvailable : !product.isAvailable
        );
      }

      return matches;
    });
  }, [products, searchTerm, selectedCategory, availabilityFilter]);

  // Manejar creación de producto
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowFormModal(true);
  };

  // Manejar edición de producto
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowFormModal(true);
  };

  // Manejar envío del formulario
  const handleFormSubmit = async (productData) => {
    try {
      let result;
      
      if (editingProduct) {
        result = await updateProduct(editingProduct.id, productData);
      } else {
        result = await createProduct(productData);
      }

      if (result.success) {
        setShowFormModal(false);
        setEditingProduct(null);
        showNotification(
          editingProduct 
            ? '✅ Producto actualizado exitosamente' 
            : '✅ Producto creado exitosamente',
          'success'
        );
      } else {
        showNotification(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error al procesar producto:', error);
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  // Manejar cambio de disponibilidad
  const handleToggleAvailability = async (product) => {
    const newAvailability = !product.isAvailable;
    const action = newAvailability ? 'activar' : 'desactivar';
    
    if (window.confirm(`¿Estás seguro de que quieres ${action} "${product.title}"?`)) {
      try {
        const result = await toggleProductAvailability(product.id, newAvailability);
        if (result.success) {
          showNotification(`✅ Producto ${action}do exitosamente`, 'success');
        } else {
          showNotification(`❌ ${result.error}`, 'error');
        }
      } catch (error) {
        showNotification(`❌ Error: ${error.message}`, 'error');
      }
    }
  };

  // Mostrar notificación
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Obtener nombre de categoría
  const getCategoryName = (categoryId) => {
    if (typeof categoryId === 'object' && categoryId?.title) {
      return categoryId.title;
    }
    const category = categories.find(cat => cat._id === categoryId);
    return category?.title || category?.name || 'Sin categoría';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TagIcon className="w-8 h-8 text-orange-600" />
              <h1 className="text-2xl font-bold text-brown-900">Gestión de Productos</h1>
            </div>
            <Button onClick={handleCreateProduct}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Nuevo Producto
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
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.title || category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Todos los productos</option>
              <option value="available">Disponibles</option>
              <option value="unavailable">No disponibles</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      )}


      {/* Products Grid */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden">
              {/* Imagen del producto */}
              <div className="aspect-square bg-gray-200 relative">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://openclipart.org/image/800px/289282';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <TagIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Badge de disponibilidad */}
                <div className="absolute top-1 right-1">
                  <div className={`w-3 h-3 rounded-full ${product.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-3">
                <div className="mb-1">
                  <Badge variant="outline" className="text-xs px-1 py-0.5">
                    {getCategoryName(product.category)}
                  </Badge>
                </div>
                
                <h3 className="font-medium text-brown-900 mb-1 text-sm line-clamp-2">
                  {product.title}
                </h3>
                
                <div className="flex items-center justify-center mb-2">
                  <div className="flex items-center text-orange-600 font-semibold text-sm">
                    <CurrencyDollarIcon className="w-3 h-3 mr-0.5" />
                    {product.price?.toFixed(2) || '0.00'}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditProduct(product)}
                    className="flex-1 text-xs py-1"
                    disabled={isUpdating}
                  >
                    <PencilIcon className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={product.isAvailable ? "danger" : "secondary"}
                    onClick={() => handleToggleAvailability(product)}
                    disabled={isUpdating}
                    className="text-xs py-1"
                    title={product.isAvailable ? "Desactivar producto" : "Activar producto"}
                  >
                    {product.isAvailable ? (
                      <EyeSlashIcon className="w-3 h-3" />
                    ) : (
                      <EyeIcon className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProducts.length === 0 && (
        <Card className="p-12 text-center">
          <TagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' || availabilityFilter !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primer producto'
            }
          </p>
          {(!searchTerm && selectedCategory === 'all' && availabilityFilter === 'all') && (
            <Button onClick={handleCreateProduct}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Crear Primer Producto
            </Button>
          )}
        </Card>
      )}

      {/* Modal de formulario */}
      <ProductFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingProduct(null);
        }}
        onSubmit={handleFormSubmit}
        product={editingProduct}
        categories={categories}
        isLoading={isCreating || isUpdating}
      />
        </div>
      </div>
    </div>
  );
};

export default Productos;