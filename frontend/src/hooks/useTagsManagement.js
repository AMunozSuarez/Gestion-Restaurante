import { useState, useEffect } from 'react';
import tagsService from '../services/tagsService';

export const useTagsManagement = () => {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await tagsService.getTags();

      if (response.success && response.tags) {
        const mappedTags = response.tags.map(tag => ({
          id: tag._id,
          name: tag.name,
          color: tag.color,
          isActive: tag.isActive,
          restaurant: tag.restaurant,
          createdAt: tag.createdAt,
          updatedAt: tag.updatedAt
        }));
        setTags(mappedTags);
      } else {
        setTags([]);
      }
    } catch (error) {
      setError(error.message);
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createTag = async (tagData) => {
    try {
      setIsCreating(true);
      setError(null);
      const response = await tagsService.createTag(tagData);

      if (response.success) {
        await fetchTags();
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsCreating(false);
    }
  };

  const updateTag = async (id, tagData) => {
    try {
      setIsUpdating(true);
      setError(null);
      const response = await tagsService.updateTag(id, tagData);

      if (response.success) {
        await fetchTags();
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTag = async (id) => {
    try {
      setIsDeleting(true);
      setError(null);
      const response = await tagsService.deleteTag(id);

      if (response.success) {
        await fetchTags();
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTagActive = async (id, isActive) => {
    try {
      setError(null);
      const response = await tagsService.updateTag(id, { isActive });

      if (response.success) {
        setTags(prevTags =>
          prevTags.map(tag => (tag.id === id ? { ...tag, isActive } : tag))
        );
        return { success: true, data: response };
      }
      return { success: false, error: response.message };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const refreshTags = () => {
    fetchTags();
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return {
    tags,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    createTag,
    updateTag,
    deleteTag,
    toggleTagActive,
    refreshTags,
    fetchTags
  };
};

export default useTagsManagement;
