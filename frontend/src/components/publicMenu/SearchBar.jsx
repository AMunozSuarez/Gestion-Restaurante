import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchBar = ({ value, onChange }) => {
  return (
    <div className="relative w-full">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar en el menú..."
        className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-[var(--menu-button)]"
      />
    </div>
  );
};

export default SearchBar;
