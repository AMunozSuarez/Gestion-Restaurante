import { useState, useEffect, useCallback } from 'react';
import tagsService from '../services/tagsService';

// Catálogo de etiquetas para elegir al abrir/editar una mesa.
export const useTags = () => {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await tagsService.getTags();
      setTags(response.success && response.tags ? response.tags : []);
    } catch (error) {
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const activeTags = tags.filter(tag => tag.isActive);

  return { tags, activeTags, isLoading, refreshTags: fetchTags };
};

export default useTags;
