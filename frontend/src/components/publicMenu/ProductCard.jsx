import React from 'react';
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
      {showImage && (
        <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden">
          <img
            src={imageUrl}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <h3 className="font-semibold text-[var(--menu-text)] text-sm sm:text-base line-clamp-1">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{product.description}</p>
        )}
        <p className="mt-auto pt-1 font-bold text-[var(--menu-button)]">{formatPrice(product.price)}</p>
      </div>
    </button>
  );
};

export default ProductCard;
