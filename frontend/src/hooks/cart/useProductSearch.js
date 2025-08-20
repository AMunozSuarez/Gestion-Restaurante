import { useState, useEffect } from 'react';

export const useProductSearch = (products) => {
    const [categoryFilter, setCategoryFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        if (!products) return;
        let filtered = products;

        if (categoryFilter) {
            filtered = filtered.filter((product) => product.category?._id === categoryFilter);
        }

        if (searchQuery) {
            filtered = filtered.filter((product) =>
                product.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredProducts(filtered);
    }, [categoryFilter, searchQuery, products]);

    return {
        categoryFilter,
        setCategoryFilter,
        searchQuery,
        setSearchQuery,
        filteredProducts,
    };
};
