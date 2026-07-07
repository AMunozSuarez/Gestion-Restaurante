import React from 'react';
import Modal from '../ui/Modal';
import { resolveMediaUrl, hasRealImage } from '../../utils/mediaUrl';

const formatPrice = (price) => {
  const value = Number(price) || 0;
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
};

const ProductDetailModal = ({ isOpen, onClose, product }) => {
  if (!product) return null;

  const showImage = hasRealImage(product.imageUrl);
  const imageUrl = resolveMediaUrl(product.imageUrl);
  const ingredients = Array.isArray(product.ingredients) ? product.ingredients : [];
  const extraSections = Array.isArray(product.extraSections) ? product.extraSections : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {showImage && (
          <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
            <img src={imageUrl} alt={product.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-[var(--menu-text)]">{product.title}</h2>
          <p className="mt-1 text-lg font-bold text-[var(--menu-button)]">{formatPrice(product.price)}</p>
        </div>

        {product.description && (
          <p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
        )}

        {ingredients.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Ingredientes</h3>
            <ul className="flex flex-wrap gap-2">
              {ingredients.map((ingredient, index) => (
                <li
                  key={`${ingredient}-${index}`}
                  className="px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                >
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>
        )}

        {extraSections.length > 0 && (
          <div className="space-y-3">
            {extraSections.map((section, index) => (
              <div key={`${section.sectionName}-${index}`}>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">{section.sectionName}</h3>
                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {(section.extras || []).map((extra) => (
                    <li key={extra._id} className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-gray-700">{extra.name}</span>
                      <span className="text-gray-500">{formatPrice(extra.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductDetailModal;
