import React from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';

const MenuFooter = ({ address }) => {
  if (!address) return null;

  return (
    <div className="px-4 sm:px-8 py-6 border-t border-gray-100 mt-6">
      <div className="flex items-center justify-center gap-1.5 text-sm text-gray-500">
        <MapPinIcon className="w-4 h-4 shrink-0" />
        <span>{address}</span>
      </div>
    </div>
  );
};

export default MenuFooter;
