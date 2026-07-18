import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { resolveMediaUrl, hasRealImage } from '../../utils/mediaUrl';

const formatPrice = (price) => {
  const value = Number(price) || 0;
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
};

const ProductCard = ({ product, onClick }) => {
  const showImage = hasRealImage(product.imageUrl);
  const imageUrl = resolveMediaUrl(product.imageUrl);

  return (
    <button
      onClick={() => onClick(product)}
      className="flex flex-col text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden active:scale-[0.99]"
    >
      <div className="w-full h-24 sm:h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
        {showImage ? (
          <img
            src={imageUrl}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-contain"
          />
        ) : (
          <PhotoIcon className="w-8 h-8 text-gray-300" />
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <h3 className="font-semibold text-[var(--menu-text)] text-sm sm:text-base">
          {product.title}
        </h3>
        <p className="mt-auto pt-1 font-bold text-[var(--menu-button)]">{formatPrice(product.price)}</p>
      </div>
    </button>
  );
};

export default ProductCard;
