import { useState, useCallback } from 'react';
import { useCustomers } from './useCustomers';

export const useCustomerSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchCustomers } = useCustomers();

  const searchCustomersDebounced = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchCustomers(searchTerm);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchCustomers]);

  const clearResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  return {
    searchResults,
    isSearching,
    searchCustomers: searchCustomersDebounced,
    clearResults
  };
};