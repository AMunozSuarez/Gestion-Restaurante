import React, { useState } from 'react';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { formatChileanCurrency } from '../../utils/dateUtils';
import { resolveMediaUrl, hasRealImage } from '../../utils/mediaUrl';

const ProductModal = ({ isOpen, onClose, products, onAddToCart, isLoading, cartItems = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!isOpen) return null;

  // Agrupar productos por categoría
  const categorizedProducts = products.reduce((acc, product) => {
    const categoryKey = product.category?.title || product.category?.name || 'Sin categoría';
    if (!acc[categoryKey]) {
      acc[categoryKey] = [];
    }
    acc[categoryKey].push(product);
    return acc;
  }, {});

  const categories = ['all', ...Object.keys(categorizedProducts)];
  
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : categorizedProducts[selectedCategory] || [];

  const getEntityId = (entity) => {
    return entity?.id ?? entity?._id ?? entity?.food?._id ?? entity?.food;
  };

  const productQuantities = (Array.isArray(cartItems) ? cartItems : []).reduce((acc, item) => {
    if (item?.deleted) {
      return acc;
    }

    const itemId = getEntityId(item);
    if (itemId === undefined || itemId === null) {
      return acc;
    }

    const key = String(itemId);
    const itemQuantity = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
    acc[key] = (acc[key] || 0) + itemQuantity;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-end sm:items-center justify-center min-h-full sm:p-4">
        {/* Overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative bg-white w-full rounded-t-2xl sm:rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:max-w-6xl flex flex-col" style={{maxHeight: '95vh'}}>
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Productos Disponibles
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            {/* Filtros por categoría */}
            <div className="mt-3">
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                      selectedCategory === category
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category === 'all' ? 'Todas' : category}
                    {category !== 'all' && (
                      <span className="ml-1 text-xs">
                        ({categorizedProducts[category]?.length || 0})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 sm:px-6 py-4 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {selectedCategory === 'all' 
                    ? 'No hay productos disponibles' 
                    : `No hay productos en la categoría "${selectedCategory}"`
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => onAddToCart(product)}
                    className="relative flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-full h-20 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {hasRealImage(product.imageUrl) ? (
                        <img
                          src={resolveMediaUrl(product.imageUrl)}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <PhotoIcon className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                    {(() => {
                      const productId = getEntityId(product);
                      const quantity = productId !== undefined && productId !== null
                        ? (productQuantities[String(productId)] || 0)
                        : 0;

                      if (quantity <= 0) {
                        return null;
                      }

                      return (
                        <span className="absolute top-2 right-2 inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-600 px-2 text-xs font-bold text-white shadow-sm">
                          {quantity}
                        </span>
                      );
                    })()}

                    <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                      {product.category?.title || product.category?.name || 'Sin categoría'}
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                      {product.name}
                    </h4>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-lg font-semibold text-orange-600">
                        {formatChileanCurrency(product.price || 0)}
                      </span>
                    </div>
                    {product.foodTags && product.foodTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {product.foodTags.slice(0, 2).map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {product.foodTags.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{product.foodTags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Mostrando {filteredProducts.length} de {products.length} productos
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;