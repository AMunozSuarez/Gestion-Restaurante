import { useState, useEffect, useCallback } from 'react';
import tablesService from '../services/tablesService';

export const useTables = () => {
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTables = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await tablesService.getTables();
            setTables(data);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching tables:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const createTable = useCallback(async (tableData) => {
        try {
            const newTable = await tablesService.createTable(tableData);
            setTables(prev => [...prev, newTable].sort((a, b) => a.tableNumber - b.tableNumber));
            return newTable;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateTable = useCallback(async (id, tableData) => {
        try {
            const updatedTable = await tablesService.updateTable(id, tableData);
            setTables(prev => prev.map(table => 
                table._id === id ? updatedTable : table
            ));
            return updatedTable;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteTable = useCallback(async (id) => {
        try {
            await tablesService.deleteTable(id);
            setTables(prev => prev.filter(table => table._id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const openTable = useCallback(async (id, data) => {
        try {
            const openedTable = await tablesService.openTable(id, data);
            setTables(prev => prev.map(table => 
                table._id === id ? openedTable : table
            ));
            return openedTable;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const closeTable = useCallback(async (id) => {
        try {
            const closedTable = await tablesService.closeTable(id);
            setTables(prev => prev.map(table => 
                table._id === id ? closedTable : table
            ));
            return closedTable;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const assignOrderToTable = useCallback(async (id, orderId) => {
        try {
            const updatedTable = await tablesService.assignOrderToTable(id, orderId);
            setTables(prev => prev.map(table => 
                table._id === id ? updatedTable : table
            ));
            return updatedTable;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateTablePositions = useCallback(async (tablePositions) => {
        try {
            const updatedTables = await tablesService.updateTablePositions(tablePositions);
            setTables(updatedTables);
            return updatedTables;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const assignWaiterToTable = useCallback(async (id, waiterId) => {
        try {
            const updatedTable = await tablesService.assignWaiterToTable(id, waiterId);
            setTables(prev => prev.map(table => 
                table._id === id ? updatedTable : table
            ));
            return updatedTable;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    return {
        tables,
        isLoading,
        error,
        refetch: fetchTables,
        createTable,
        updateTable,
        deleteTable,
        openTable,
        closeTable,
        assignOrderToTable,
        updateTablePositions,
        assignWaiterToTable,
    };
};

export const useTable = (tableId) => {
    const [table, setTable] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTable = useCallback(async () => {
        if (!tableId) return;
        
        try {
            setIsLoading(true);
            const data = await tablesService.getTableById(tableId);
            setTable(data);
            setError(null);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching table:', err);
        } finally {
            setIsLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        fetchTable();
    }, [fetchTable]);

    return {
        table,
        isLoading,
        error,
        refetch: fetchTable,
    };
};
