import React, { useState, useMemo } from 'react';
import { ShoppingCartIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import KioskButton from './KioskButton';
import { formatChileanCurrency } from '../../utils/dateUtils';

/**
 * Navegación del menú: categorías + grid de productos.
 * El backend ya entrega solo productos publicados y disponibles, así que aquí no hay
 * ningún filtro de disponibilidad: lo que llega, se muestra.
 *
 * Las categorías van en una barra lateral vertical desde 768px: en horizontal con
 * overflow-x las categorías que no caben quedan invisibles (un cliente no adivina que
 * debe deslizar), y además la franja se come alto, que es lo escaso en un kiosco
 * vertical. En pantallas angostas se vuelve a los chips horizontales, donde una barra
 * lateral se comería demasiado ancho.
 */
const MenuBrowser = ({
  products,
  categories,
  itemCount,
  total,
  onSelectProduct,
  onOpenCart,
  onCancel,
}) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const visibleProducts = useMemo(() => {
    if (activeCategory === 'all') return products;
    return products.filter((product) => String(product.category._id) === activeCategory);
  }, [products, activeCategory]);

  const options = [
    { id: 'all', label: 'Todo' },
    ...categories.map((category) => ({ id: String(category._id), label: category.title })),
  ];

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Cabecera */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 py-3">
        <h1 className="text-2xl font-bold text-gray-900">Elige tus productos</h1>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 min-h-[52px] rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 text-base"
        >
          <XMarkIcon className="w-6 h-6" />
          Cancelar
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Categorías en vertical (desde md) */}
        <nav className="hidden md:flex md:flex-col w-52 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto py-3 gap-1">
          {options.map((option) => (
            <CategoryItem
              key={option.id}
              label={option.label}
              isActive={activeCategory === option.id}
              onClick={() => setActiveCategory(option.id)}
            />
          ))}
        </nav>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Categorías en horizontal (bajo md) */}
          <div className="md:hidden flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-gray-200">
            {options.map((option) => (
              <CategoryChip
                key={option.id}
                label={option.label}
                isActive={activeCategory === option.id}
                onClick={() => setActiveCategory(option.id)}
              />
            ))}
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-2">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onClick={() => onSelectProduct(product)}
                />
              ))}
            </div>

            {visibleProducts.length === 0 && (
              <p className="text-center text-xl text-gray-400 py-20">
                No hay productos en esta categoría
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Barra del carrito, siempre accesible */}
      {itemCount > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <KioskButton size="lg" fullWidth onClick={onOpenCart}>
            <ShoppingCartIcon className="w-7 h-7" />
            Ver mi pedido ({itemCount})
            <span className="ml-auto">{formatChileanCurrency(total)}</span>
          </KioskButton>
        </div>
      )}
    </div>
  );
};

const CategoryItem = ({ label, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`mx-2 px-4 min-h-[56px] rounded-xl text-left text-lg font-semibold transition-colors ${
      isActive
        ? 'bg-orange-600 text-white'
        : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
    }`}
  >
    {label}
  </button>
);

const CategoryChip = ({ label, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-shrink-0 min-h-[52px] px-6 rounded-full text-lg font-semibold transition-colors ${
      isActive
        ? 'bg-orange-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
    }`}
  >
    {label}
  </button>
);

const ProductCard = ({ product, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col bg-white rounded-2xl overflow-hidden border border-gray-200 text-left transition-transform duration-150 active:scale-[0.97] hover:border-orange-300 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-400/50"
  >
    <div className="aspect-[3/2] bg-gray-100 flex items-center justify-center overflow-hidden">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-full object-cover"
          // Si la imagen no carga (URL rota o el clipart por defecto caído) se oculta y
          // queda el fondo gris, en vez del icono de imagen partida del navegador.
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <PhotoIcon className="w-10 h-10 text-gray-300" />
      )}
    </div>

    <div className="flex flex-col flex-1 p-3">
      <h3 className="text-lg font-semibold text-gray-900 leading-snug line-clamp-2">
        {product.title}
      </h3>
      {product.description && (
        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
      )}
      <p className="text-xl font-bold text-orange-600 mt-auto pt-2">
        {formatChileanCurrency(product.price || 0)}
      </p>
    </div>
  </button>
);

export default MenuBrowser;
