import { useState, useEffect, useCallback } from 'react';
import extraSectionsService from '../services/extraSectionsService';

const useExtraSectionsManagement = () => {
    const [sections, setSections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchSections = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await extraSectionsService.getAll();
            if (response.success) {
                setSections(response.sections || []);
            }
        } catch (err) {
            setError(err.message);
            setSections([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createSection = async (data) => {
        try {
            setIsSaving(true);
            const response = await extraSectionsService.create(data);
            if (response.success) {
                await fetchSections();
                return { success: true, section: response.section };
            }
            return { success: false, error: response.message };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setIsSaving(false);
        }
    };

    const updateSection = async (id, data) => {
        try {
            setIsSaving(true);
            const response = await extraSectionsService.update(id, data);
            if (response.success) {
                await fetchSections();
                return { success: true, section: response.section };
            }
            return { success: false, error: response.message };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSection = async (id) => {
        try {
            setIsSaving(true);
            const response = await extraSectionsService.delete(id);
            if (response.success) {
                await fetchSections();
                return { success: true };
            }
            return { success: false, error: response.message };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    return {
        sections,
        isLoading,
        error,
        isSaving,
        createSection,
        updateSection,
        deleteSection,
        refreshSections: fetchSections
    };
};

export default useExtraSectionsManagement;
