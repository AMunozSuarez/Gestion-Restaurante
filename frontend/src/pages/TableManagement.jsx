import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTables } from '../hooks/useTables';
import { useCashRegister } from '../store/CashRegisterContext';
import { useWaiters } from '../hooks/useUsers';
import CashRegisterAlert from '../components/common/CashRegisterAlert';
import { 
    PlusIcon, 
    PencilIcon, 
    TrashIcon, 
    UserGroupIcon,
    Squares2X2Icon,
    ClockIcon,
    XMarkIcon,
    CheckIcon,
    ExclamationTriangleIcon,
    LinkIcon,
    LinkSlashIcon
} from '@heroicons/react/24/outline';
import { Button } from '../components/ui';
import {
    DndContext,
    useDraggable,
    useDroppable,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const DraggableTable = ({ table, isEditMode, children, className, style }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: table._id,
        disabled: !isEditMode
    });

    return (
        <div
            ref={setNodeRef}
            {...(isEditMode ? listeners : {})}
            {...(isEditMode ? attributes : {})}
            style={{
                ...style,
                transform: transform ? CSS.Translate.toString(transform) : undefined,
                // Sin esto, la clase "transition-all" anima el transform y la mesa queda
                // "persiguiendo" al puntero en vez de moverse junto a él al instante.
                transition: isDragging ? 'none' : style?.transition,
                zIndex: isDragging ? 50 : undefined,
                position: isDragging ? 'relative' : style?.position
            }}
            className={className}
        >
            {children}
        </div>
    );
};

const DroppableCell = ({ position, isEditMode, children, className }) => {
    const { setNodeRef } = useDroppable({
        id: `${position.x}-${position.y}`,
        disabled: !isEditMode
    });

    return (
        <div ref={setNodeRef} className={className}>
            {children}
        </div>
    );
};

const TableManagement = () => {
    const navigate = useNavigate();
    const { tables, isLoading, createTable, updateTable, deleteTable, openTable, updateTablePositions, mergeTables, splitTable } = useTables();
    const { isOpen: isCashOpen, isLoading: cashLoading, openCashRegister } = useCashRegister();
    const { waiters } = useWaiters();
    
    // Estados
    const [showCashAlert, setShowCashAlert] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showAddTableModal, setShowAddTableModal] = useState(false);
    const [showEditTableModal, setShowEditTableModal] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [newTable, setNewTable] = useState({ tableNumber: '', capacity: 4 });
    const [editTableData, setEditTableData] = useState({ tableNumber: '', capacity: 4 });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [tableToDelete, setTableToDelete] = useState(null);
    const [showOpenTableModal, setShowOpenTableModal] = useState(false);
    const [tableToOpen, setTableToOpen] = useState(null);
    const [guestCount, setGuestCount] = useState(2);
    const [selectedWaiter, setSelectedWaiter] = useState(null);
    const [draggedTable, setDraggedTable] = useState(null);
    const [dragOverPosition, setDragOverPosition] = useState(null);
    // Posiciones movidas durante el modo edición, aún no guardadas en el servidor: { [tableId]: {x, y} }
    const [pendingPositions, setPendingPositions] = useState({});
    const [isSavingPositions, setIsSavingPositions] = useState(false);
    const [currentSection, setCurrentSection] = useState('Salón');
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [editingSectionName, setEditingSectionName] = useState(null);
    const [sectionToEdit, setSectionToEdit] = useState('');
    const [customSections, setCustomSections] = useState(['Salón']);
    const [mergeMode, setMergeMode] = useState(false);
    const [selectedForMerge, setSelectedForMerge] = useState([]);
    const [showMergeConfirmModal, setShowMergeConfirmModal] = useState(false);
    const [showSplitConfirmModal, setShowSplitConfirmModal] = useState(false);
    const [tableToSplit, setTableToSplit] = useState(null);
    const [isMergeSubmitting, setIsMergeSubmitting] = useState(false);

    // Sensores dnd-kit: mouse (con distancia mínima para no romper el click) y touch
    const dndSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    // Cargar secciones personalizadas desde localStorage al montar
    useEffect(() => {
        const savedSections = localStorage.getItem('tableSections');
        if (savedSections) {
            try {
                const parsed = JSON.parse(savedSections);
                setCustomSections(parsed);
            } catch (error) {
                console.error('Error loading sections:', error);
            }
        }
    }, []);

    // Guardar secciones personalizadas en localStorage cuando cambien
    useEffect(() => {
        localStorage.setItem('tableSections', JSON.stringify(customSections));
    }, [customSections]);

    // Obtener secciones únicas combinando las que tienen mesas y las creadas manualmente
    const tableSections = [...new Set(tables.map(t => t.section || 'Salón'))];
    const sections = [...new Set([...customSections, ...tableSections])].sort();
    
    // Filtrar mesas por sección actual
    const filteredTables = tables.filter(t => (t.section || 'Salón') === currentSection);

    // Posición efectiva de una mesa: la pendiente (si se movió durante la edición) o la guardada
    const getEffectivePosition = (table) => pendingPositions[table._id] || table.position || { x: 0, y: 0 };

    // Función para mostrar notificación
    const showNotification = (message, type = 'success', duration = 3000) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), duration);
    };

    // Verificar caja al montar - solo cuando termine de cargar
    useEffect(() => {
        if (!cashLoading && !isCashOpen) {
            setShowCashAlert(true);
        }
    }, [isCashOpen, cashLoading]);

    const handleOpenCash = async (initialAmount) => {
        const result = await openCashRegister(initialAmount);
        if (result.success) {
            setShowCashAlert(false);
        }
        return result;
    };

    // Función para abrir mesa
    const handleOpenTable = async (table) => {
        if (cashLoading || !isCashOpen) {
            setShowCashAlert(true);
            return;
        }
        setTableToOpen(table);
        setGuestCount(table.capacity || 2);
        setShowOpenTableModal(true);
    };

    const confirmOpenTable = async () => {
        try {
            const openTableData = { 
                currentGuests: guestCount
            };
            
            // Agregar mesero solo si se seleccionó uno
            if (selectedWaiter) {
                openTableData.waiter = selectedWaiter;
            }
            
            await openTable(tableToOpen._id, openTableData);
            setShowOpenTableModal(false);
            setTableToOpen(null);
            setGuestCount(2);
            setSelectedWaiter(null);
            showNotification('Mesa abierta exitosamente');
        } catch (error) {
            showNotification('Error al abrir mesa: ' + error.message, 'error');
        }
    };

    // Función para ir al detalle de la mesa
    const handleTableClick = (table) => {
        if (mergeMode) {
            toggleTableForMerge(table);
            return;
        }

        // Las mesas unidas siempre actúan a través de la mesa principal del grupo
        const isMerged = Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0;
        const targetTable = isMerged
            ? tables.find(t => t._id === (table.mergedInto || table._id)) || table
            : table;

        if (targetTable.status === 'occupied') {
            navigate(`/mesas/${targetTable._id}`);
        } else if (!isEditMode) {
            handleOpenTable(targetTable);
        }
    };

    // Funciones para unir/separar mesas
    const handleToggleMergeMode = () => {
        setMergeMode(prev => !prev);
        setSelectedForMerge([]);
    };

    const toggleTableForMerge = (table) => {
        if (Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0) {
            showNotification(`La mesa ${table.tableNumber} ya está unida a otro grupo`, 'warning');
            return;
        }
        setSelectedForMerge(prev =>
            prev.includes(table._id) ? prev.filter(id => id !== table._id) : [...prev, table._id]
        );
    };

    const confirmMergeTables = async () => {
        setIsMergeSubmitting(true);
        try {
            await mergeTables(selectedForMerge);
            showNotification('Mesas unidas exitosamente');
            setShowMergeConfirmModal(false);
            setMergeMode(false);
            setSelectedForMerge([]);
        } catch (error) {
            showNotification('Error al unir mesas: ' + error.message, 'error');
        } finally {
            setIsMergeSubmitting(false);
        }
    };

    const handleUnlinkTable = (table, e) => {
        e.stopPropagation();
        setTableToSplit(table);
        setShowSplitConfirmModal(true);
    };

    const confirmSplitTable = async () => {
        try {
            // Si es una mesa secundaria, se separa solo ella; si es la principal, se separa todo el grupo
            const isSecondary = Boolean(tableToSplit.mergedInto);
            await splitTable(tableToSplit._id, isSecondary ? [tableToSplit._id] : undefined);
            showNotification(isSecondary ? 'Mesa separada exitosamente' : 'Grupo de mesas separado exitosamente');
            setShowSplitConfirmModal(false);
            setTableToSplit(null);
        } catch (error) {
            showNotification('Error al separar mesa: ' + error.message, 'error');
        }
    };

    // Funciones para crear mesa
    const handleAddTable = async () => {
        try {
            const nextNumber = tables.length > 0 
                ? Math.max(...tables.map(t => t.tableNumber)) + 1 
                : 1;
            
            // Encontrar la primera posición disponible en la sección actual
            let availablePosition = { x: 0, y: 0 };
            const cols = 7;
            const rows = 6;
            
            outerLoop:
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const occupied = filteredTables.some(t => {
                        const pos = getEffectivePosition(t);
                        return pos.x === x && pos.y === y;
                    });
                    if (!occupied) {
                        availablePosition = { x, y };
                        break outerLoop;
                    }
                }
            }
            
            await createTable({
                tableNumber: parseInt(newTable.tableNumber) || nextNumber,
                capacity: parseInt(newTable.capacity) || 4,
                position: availablePosition,
                section: currentSection
            });
            setShowAddTableModal(false);
            setNewTable({ tableNumber: '', capacity: 4 });
            showNotification('Mesa creada exitosamente');
        } catch (error) {
            showNotification('Error al crear mesa: ' + error.message, 'error');
        }
    };

    // Funciones para editar mesa
    const handleEditTable = (table, e) => {
        e.stopPropagation();
        setSelectedTable(table);
        setEditTableData({
            tableNumber: table.tableNumber,
            capacity: table.capacity
        });
        setShowEditTableModal(true);
    };

    const handleUpdateTable = async () => {
        try {
            await updateTable(selectedTable._id, {
                tableNumber: parseInt(editTableData.tableNumber),
                capacity: parseInt(editTableData.capacity)
            });
            setShowEditTableModal(false);
            setSelectedTable(null);
            showNotification('Mesa actualizada exitosamente');
        } catch (error) {
            showNotification('Error al actualizar mesa: ' + error.message, 'error');
        }
    };

    // Funciones para eliminar mesa
    const handleDeleteTable = (table, e) => {
        e.stopPropagation();
        if (table.status === 'occupied') {
            showNotification('No se puede eliminar una mesa ocupada', 'warning');
            return;
        }
        setTableToDelete(table);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteTable = async () => {
        try {
            await deleteTable(tableToDelete._id);
            setShowDeleteConfirm(false);
            setTableToDelete(null);
            showNotification('Mesa eliminada exitosamente');
        } catch (error) {
            showNotification('Error al eliminar mesa: ' + error.message, 'error');
        }
    };

    // Funciones para drag and drop (dnd-kit: funciona con mouse y touch)
    // Mientras se edita, el movimiento solo actualiza estado local (instantáneo);
    // recién se guarda en el servidor al terminar la edición (ver handleToggleEditMode).
    const handleDndDragStart = (event) => {
        const table = filteredTables.find(t => t._id === event.active.id);
        setDraggedTable(table || null);
    };

    const handleDndDragOver = (event) => {
        const { over } = event;
        if (!over) {
            setDragOverPosition(null);
            return;
        }
        const [x, y] = over.id.split('-').map(Number);
        setDragOverPosition({ x, y });
    };

    const handleDndDragEnd = (event) => {
        const { active, over } = event;
        setDraggedTable(null);
        setDragOverPosition(null);

        if (!over) return;

        const table = filteredTables.find(t => t._id === active.id);
        if (!table) return;

        const [x, y] = over.id.split('-').map(Number);
        const newPosition = { x, y };
        const currentPosition = getEffectivePosition(table);

        if (currentPosition.x === newPosition.x && currentPosition.y === newPosition.y) return;

        // Si hay otra mesa en la posición destino (solo en la sección actual), se intercambian
        const tableInPosition = filteredTables.find(t => {
            if (t._id === table._id) return false;
            const pos = getEffectivePosition(t);
            return pos.x === newPosition.x && pos.y === newPosition.y;
        });

        setPendingPositions(prev => {
            const next = { ...prev, [table._id]: newPosition };
            if (tableInPosition) {
                next[tableInPosition._id] = currentPosition;
            }
            return next;
        });
    };

    // Guarda en el servidor todas las posiciones movidas durante la edición
    const handleToggleEditMode = async () => {
        if (isEditMode) {
            const changes = Object.entries(pendingPositions).map(([id, position]) => ({ id, position }));
            if (changes.length > 0) {
                setIsSavingPositions(true);
                try {
                    await updateTablePositions(changes);
                } catch (error) {
                    showNotification('Error al guardar posiciones: ' + error.message, 'error');
                    return; // se mantiene en modo edición para poder reintentar
                } finally {
                    setIsSavingPositions(false);
                }

                // Avisar si alguna union quedó separada tras el movimiento. Se valida con
                // las posiciones que se acaban de guardar porque el estado de `tables`
                // todavía no refleja la respuesta del servidor en este punto.
                const savedPositions = pendingPositions;
                setPendingPositions({});

                const disconnected = getDisconnectedMergedGroups(
                    table => savedPositions[table._id] || table.position || { x: 0, y: 0 }
                );
                if (disconnected.length > 0) {
                    const detalle = disconnected.map(numbers => numbers.join(' + ')).join('; ');
                    showNotification(
                        `Mesas unidas que quedaron separadas: ${detalle}.`,
                        'warning',
                        6000
                    );
                }
            }
        }
        setIsEditMode(prev => !prev);
    };

    // Funciones para manejar secciones
    const handleCreateSection = () => {
        if (!newSectionName.trim()) {
            showNotification('Ingresa un nombre para la sección', 'warning');
            return;
        }
        
        if (sections.includes(newSectionName.trim())) {
            showNotification('Ya existe una sección con ese nombre', 'warning');
            return;
        }
        
        setCustomSections(prev => [...prev, newSectionName.trim()]);
        setCurrentSection(newSectionName.trim());
        setNewSectionName('');
        setShowSectionModal(false);
        showNotification('Sección creada exitosamente');
    };

    const handleEditSectionName = async () => {
        if (!sectionToEdit.trim()) {
            showNotification('Ingresa un nombre para la sección', 'warning');
            return;
        }
        
        if (sections.includes(sectionToEdit.trim()) && sectionToEdit.trim() !== editingSectionName) {
            showNotification('Ya existe una sección con ese nombre', 'warning');
            return;
        }
        
        // Verificar si hay mesas ocupadas en esta sección
        const occupiedTablesInSection = tables.filter(
            t => (t.section || 'Salón') === editingSectionName && t.status === 'occupied'
        );
        
        if (occupiedTablesInSection.length > 0) {
            showNotification('No puedes renombrar una sección con mesas ocupadas', 'warning');
            return;
        }
        
        try {
            // Actualizar todas las mesas de esta sección
            const tablesToUpdate = tables.filter(t => (t.section || 'Salón') === editingSectionName);
            await Promise.all(
                tablesToUpdate.map(table => 
                    updateTable(table._id, { section: sectionToEdit.trim() })
                )
            );
            
            // Actualizar customSections
            setCustomSections(prev => 
                prev.map(s => s === editingSectionName ? sectionToEdit.trim() : s)
            );
            
            setCurrentSection(sectionToEdit.trim());
            setEditingSectionName(null);
            setSectionToEdit('');
            showNotification('Sección renombrada exitosamente');
        } catch (error) {
            showNotification('Error al renombrar sección: ' + error.message, 'error');
        }
    };

    const handleDeleteSection = async (sectionName) => {
        // No permitir eliminar si hay mesas
        const tablesInSection = tables.filter(t => (t.section || 'Salón') === sectionName);
        
        if (tablesInSection.length > 0) {
            showNotification('No puedes eliminar una sección con mesas. Elimina primero todas las mesas.', 'warning');
            return;
        }
        
        // Eliminar de customSections
        setCustomSections(prev => prev.filter(s => s !== sectionName));
        
        // Si es la sección actual, cambiar a otra
        if (currentSection === sectionName) {
            const otherSection = sections.find(s => s !== sectionName);
            setCurrentSection(otherSection || 'Salón');
        }
        
        showNotification('Sección eliminada exitosamente');
    };

    // Crear cuadrícula de posiciones
    const createGrid = () => {
        const cols = 7;
        const rows = 6;
        const grid = [];
        
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const position = { x, y };
                const table = filteredTables.find(t => {
                    const pos = getEffectivePosition(t);
                    return pos.x === x && pos.y === y;
                });
                grid.push({ position, table });
            }
        }
        
        return grid;
    };

    // Grilla compacta para mobile: recorta las filas y columnas vacías de los bordes
    // para no desperdiciar pantalla, pero conserva los huecos internos y por lo tanto
    // la disposición real que se armó en modo edición
    const createCompactGrid = () => {
        const byCell = new Map();
        const overflow = [];
        filteredTables.forEach(table => {
            const { x, y } = getEffectivePosition(table);
            const key = `${x}-${y}`;
            // Dos mesas en la misma celda (típicamente mesas sin position guardada,
            // que caen todas en 0-0): las extra se muestran aparte para no ocultarlas
            if (byCell.has(key)) overflow.push(table);
            else byCell.set(key, table);
        });

        if (byCell.size === 0) return { cols: 0, cells: [], overflow };

        const placed = [...byCell.values()].map(getEffectivePosition);
        const minX = Math.min(...placed.map(pos => pos.x));
        const maxX = Math.max(...placed.map(pos => pos.x));
        const minY = Math.min(...placed.map(pos => pos.y));
        const maxY = Math.max(...placed.map(pos => pos.y));

        const cells = [];
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                cells.push({ position: { x, y }, table: byCell.get(`${x}-${y}`) });
            }
        }
        return { cols: maxX - minX + 1, cells, overflow };
    };

    // Determina si una mesa unida tiene compañeras de grupo justo a la derecha/abajo
    // en la grilla, para dibujar un conector visual entre ellas (solo si son adyacentes)
    const getAdjacentMergedDirections = (table) => {
        if (!Array.isArray(table.mergedGroup) || table.mergedGroup.length === 0) {
            return { right: false, bottom: false };
        }
        const pos = getEffectivePosition(table);
        const groupNumbers = new Set(table.mergedGroup.map(t => t.tableNumber));
        let right = false;
        let bottom = false;
        filteredTables.forEach(partner => {
            if (!groupNumbers.has(partner.tableNumber)) return;
            const p = getEffectivePosition(partner);
            if (p.y === pos.y && p.x === pos.x + 1) right = true;
            if (p.x === pos.x && p.y === pos.y + 1) bottom = true;
        });
        return { right, bottom };
    };

    // Tarjeta compacta de mesa (vista mobile). Ocupa toda la celda de la grilla.
    const renderCompactTable = (table) => {
        const isOccupied = table.status === 'occupied';
        const isReserved = table.status === 'reserved';
        const isInactive = table.status === 'inactive';
        const isMerged = Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0;
        const isSelectedForMerge = selectedForMerge.includes(table._id);

        const textColor = isMerged
            ? 'text-indigo-700'
            : isOccupied
            ? 'text-orange-700'
            : isReserved
            ? 'text-blue-700'
            : isInactive
            ? 'text-gray-600'
            : 'text-green-800';

        return (
            <div
                className={`relative w-full h-full rounded-xl border-2 shadow-sm transition-all duration-200 active:scale-[0.98] ${
                    isSelectedForMerge
                        ? 'bg-teal-100 border-teal-600 ring-2 ring-teal-400'
                        : isMerged
                        ? 'bg-indigo-100 border-indigo-600'
                        : isOccupied
                        ? 'bg-orange-100 border-orange-600'
                        : isReserved
                        ? 'bg-blue-100 border-blue-600'
                        : isInactive
                        ? 'bg-gray-300 border-gray-400'
                        : 'bg-green-100 border-green-600'
                }`}
            >
                <button
                    onClick={() => handleTableClick(table)}
                    className="w-full h-full flex flex-col items-center justify-center px-0.5"
                >
                    <UserGroupIcon className={`w-3.5 h-3.5 mb-0.5 ${textColor}`} />
                    <span className={`font-bold leading-none ${textColor}`}>
                        {table.tableNumber}
                    </span>
                    {isOccupied && table.openedAt && (
                        <span className="text-[9px] leading-none mt-1 text-orange-800 whitespace-nowrap">
                            {getCompactTableDuration(table.openedAt)}
                        </span>
                    )}
                </button>

                {/* Conector hacia mesas unidas contiguas, igual que en la grilla de desktop.
                    w-1.5/h-1.5 coincide con el gap-1.5 de la grilla mobile */}
                {isMerged && !mergeMode && (() => {
                    const { right, bottom } = getAdjacentMergedDirections(table);
                    return (
                        <>
                            {right && (
                                <div className="absolute top-1/4 bottom-1/4 -right-1.5 w-1.5 bg-indigo-500 z-10" />
                            )}
                            {bottom && (
                                <div className="absolute left-1/4 right-1/4 -bottom-1.5 h-1.5 bg-indigo-500 z-10" />
                            )}
                        </>
                    );
                })()}

                {isMerged && !mergeMode && (
                    <>
                        <div
                            className="absolute -bottom-1 -right-1 flex items-center gap-0.5 bg-teal-600 text-white text-[9px] px-1 py-0.5 rounded-full shadow"
                            title={`Unida con: ${table.mergedGroup.map(t => t.tableNumber).join(', ')}`}
                        >
                            <LinkIcon className="w-2 h-2" />
                        </div>
                        <button
                            onClick={(e) => handleUnlinkTable(table, e)}
                            className="absolute -top-1 -left-1 p-0.5 bg-white rounded-full shadow"
                            title="Separar mesa"
                        >
                            <LinkSlashIcon className="w-2.5 h-2.5 text-gray-600" />
                        </button>
                    </>
                )}
            </div>
        );
    };

    // Grupos de mesas unidas que quedaron separados en el plano. El conector visual
    // solo se dibuja entre mesas contiguas, asi que si un grupo no forma una region
    // conectada (vecinos arriba/abajo/izq/der) la union no se ve por ningun lado.
    // `positionOf` se inyecta para poder validar con posiciones recien guardadas.
    const getDisconnectedMergedGroups = (positionOf) => {
        const groups = new Map();
        tables.forEach(table => {
            if (!Array.isArray(table.mergedGroup) || table.mergedGroup.length === 0) return;
            const numbers = [table.tableNumber, ...table.mergedGroup.map(t => t.tableNumber)]
                .filter(n => n !== undefined && n !== null)
                .sort((a, b) => a - b);
            if (numbers.length > 1) groups.set(numbers.join('-'), numbers);
        });

        const sectionOf = (table) => table.section || 'Salón';
        const disconnected = [];

        groups.forEach(numbers => {
            const members = numbers
                .map(n => tables.find(t => t.tableNumber === n))
                .filter(Boolean);
            // Si no se resolvieron todos los miembros no opinamos: seria un falso positivo
            if (members.length !== numbers.length) return;

            // BFS sobre vecinos ortogonales dentro del grupo
            const pending = members.slice(1);
            const queue = [members[0]];
            while (queue.length > 0) {
                const current = queue.shift();
                const pos = positionOf(current);
                for (let i = pending.length - 1; i >= 0; i--) {
                    const other = pending[i];
                    if (sectionOf(other) !== sectionOf(current)) continue;
                    const otherPos = positionOf(other);
                    if (Math.abs(otherPos.x - pos.x) + Math.abs(otherPos.y - pos.y) === 1) {
                        pending.splice(i, 1);
                        queue.push(other);
                    }
                }
            }

            if (pending.length > 0) disconnected.push(numbers);
        });

        return disconnected;
    };

    // Obtener color de estado de mesa
    const getTableStatusColor = (table) => {
        if (Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0) {
            return 'bg-indigo-100 border-2 border-indigo-600 text-indigo-800 shadow-sm';
        }
        if (table.status === 'occupied') {
            return 'bg-orange-100 border-2 border-orange-600 text-orange-800 shadow-sm';
        } else if (table.status === 'reserved') {
            return 'bg-blue-100 border-2 border-blue-600 text-blue-800 shadow-sm';
        } else if (table.status === 'inactive') {
            return 'bg-gray-300 border-2 border-gray-400 text-gray-600';
        }
        return 'bg-green-100 border-2 border-green-600 text-green-800 shadow-sm';
    };

    const getTableHoverClasses = (table, isEditModeView) => {
        if (isEditModeView) {
            return 'cursor-move';
        }

        if (Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0) {
            return 'cursor-pointer hover:bg-indigo-200 hover:border-indigo-700 hover:shadow-lg hover:-translate-y-0.5';
        }

        if (table.status === 'occupied') {
            return 'cursor-pointer hover:bg-orange-200 hover:border-orange-700 hover:shadow-lg hover:-translate-y-0.5';
        }

        if (table.status === 'reserved') {
            return 'cursor-pointer hover:bg-blue-200 hover:border-blue-700 hover:shadow-lg hover:-translate-y-0.5';
        }

        if (table.status === 'inactive') {
            return 'cursor-pointer hover:bg-gray-300 hover:border-gray-500 hover:shadow-md';
        }

        return 'cursor-pointer hover:bg-green-200 hover:border-green-700 hover:shadow-lg hover:-translate-y-0.5';
    };

    // Calcular tiempo desde que se abrió la mesa
    const getTableDuration = (openedAt) => {
        if (!openedAt) return null;
        const now = new Date();
        const opened = new Date(openedAt);
        const diffMs = now - opened;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Duracion compacta para tarjetas mobile (ej: 50h53m)
    const getCompactTableDuration = (openedAt) => {
        if (!openedAt) return null;
        const now = new Date();
        const opened = new Date(openedAt);
        const diffMs = now - opened;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return hours > 0 ? `${hours}h${mins}m` : `${mins}m`;
    };

    if (isLoading) {
        return (
            <div className="h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-teal-700">Cargando mesas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 overflow-y-auto">
            {/* Alert de caja */}
            {showCashAlert && (
                <CashRegisterAlert 
                    isOpen={showCashAlert}
                    onClose={() => setShowCashAlert(false)}
                    onOpenCashRegister={handleOpenCash}
                />
            )}

            {/* Overlay de bloqueo mientras se guardan las posiciones */}
            {isSavingPositions && (
                <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl px-6 py-5 flex flex-col items-center gap-3">
                        <span className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-700 font-medium">Guardando posiciones...</p>
                    </div>
                </div>
            )}

            {/* Notificación toast */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg animate-fade-in ${
                    notification.type === 'error' ? 'bg-red-600' : 
                    notification.type === 'warning' ? 'bg-orange-500' : 
                    'bg-teal-600'
                } text-white`}>
                    <div className="flex items-center gap-2">
                        {notification.type === 'error' ? (
                            <XMarkIcon className="w-5 h-5" />
                        ) : notification.type === 'warning' ? (
                            <ExclamationTriangleIcon className="w-5 h-5" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {notification.message}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
                    <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-teal-900">Gestión de Mesas</h1>
                            <p className="text-sm md:text-base text-gray-600 mt-0.5 md:mt-1">
                                {tables.filter(t => t.status === 'occupied').length} de {tables.length} mesas ocupadas
                            </p>
                        </div>
                        {/* En mobile: 3 columnas iguales con etiquetas cortas; en desktop: fila con etiquetas completas */}
                        <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
                            <Button
                                onClick={handleToggleMergeMode}
                                disabled={isEditMode || isSavingPositions}
                                variant={mergeMode ? 'primary' : 'outline'}
                                className={`whitespace-nowrap px-2 md:px-5 ${mergeMode ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                            >
                                <LinkIcon className="w-4 h-4 mr-1.5 md:w-5 md:h-5 md:mr-2 shrink-0" />
                                <span className="md:hidden">{mergeMode ? 'Salir' : 'Unir'}</span>
                                <span className="hidden md:inline">{mergeMode ? 'Cancelar unión' : 'Unir mesas'}</span>
                            </Button>
                            <Button
                                onClick={handleToggleEditMode}
                                disabled={mergeMode || isSavingPositions}
                                variant={isEditMode ? 'primary' : 'outline'}
                                className={`whitespace-nowrap px-2 md:px-5 ${isEditMode ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                            >
                                {isSavingPositions ? (
                                    <span className="w-4 h-4 mr-1.5 md:w-5 md:h-5 md:mr-2 shrink-0 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                                ) : (
                                    <Squares2X2Icon className="w-4 h-4 mr-1.5 md:w-5 md:h-5 md:mr-2 shrink-0" />
                                )}
                                {!isSavingPositions && (
                                    <span className="md:hidden">{isEditMode ? 'Listo' : 'Editar'}</span>
                                )}
                                <span className="hidden md:inline">{isSavingPositions ? 'Guardando...' : isEditMode ? 'Terminar edición' : 'Editar mesas'}</span>
                            </Button>
                            <Button
                                onClick={() => setShowAddTableModal(true)}
                                className="bg-teal-600 hover:bg-teal-700 whitespace-nowrap px-2 md:px-5"
                            >
                                <PlusIcon className="w-4 h-4 mr-1.5 md:w-5 md:h-5 md:mr-2 shrink-0" />
                                <span className="md:hidden">Nueva</span>
                                <span className="hidden md:inline">Nueva Mesa</span>
                            </Button>
                        </div>
                    </div>

                    {/* Tabs de secciones */}
                    <div className="mt-4 md:mt-6 flex items-center gap-3 flex-wrap">
                        <div className="flex gap-2 flex-wrap">
                            {sections.map(section => (
                                <div key={section} className="relative group">
                                    <button
                                        onClick={() => setCurrentSection(section)}
                                        className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-all ${
                                            currentSection === section
                                                ? 'bg-teal-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {section}
                                        {tables.filter(t => (t.section || 'Salón') === section && t.status === 'occupied').length > 0 && (
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                                currentSection === section
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {tables.filter(t => (t.section || 'Salón') === section && t.status === 'occupied').length}
                                            </span>
                                        )}
                                    </button>
                                    {isEditMode && (
                                        <div className="absolute top-0 right-0 -mt-2 -mr-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSectionName(section);
                                                    setSectionToEdit(section);
                                                }}
                                                className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                                                title="Editar nombre"
                                            >
                                                <PencilIcon className="w-3 h-3 text-teal-600" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {isEditMode && (
                            <Button
                                onClick={() => setShowSectionModal(true)}
                                variant="outline"
                                className="border-dashed"
                            >
                                <PlusIcon className="w-4 h-4 mr-1" />
                                Nueva Sección
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid de mesas */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
                {filteredTables.length === 0 ? (
                    <div className="text-center py-12">
                        <Squares2X2Icon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay mesas configuradas</h3>
                        <p className="text-gray-500 mb-4">Comienza agregando tu primera mesa</p>
                        <Button
                            onClick={() => setShowAddTableModal(true)}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Crear Primera Mesa
                        </Button>
                    </div>
                ) : (
                    // Vista responsive: mobile en tarjetas compactas, desktop en grilla
                    <div>
                        {/* Mobile: misma grilla que desktop pero recortada a la zona usada */}
                        <div className={isEditMode ? 'hidden' : 'md:hidden'}>
                            {(() => {
                                const { cols, cells, overflow } = createCompactGrid();
                                return (
                                    <>
                                        {cols > 0 && (
                                            <div
                                                className="grid gap-1.5"
                                                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                                            >
                                                {cells.map(({ position, table }) => (
                                                    <div key={`${position.x}-${position.y}`} className="aspect-[4/5]">
                                                        {table ? renderCompactTable(table) : (
                                                            <div className="w-full h-full rounded-xl border border-dashed border-gray-200" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {overflow.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-xs text-gray-500 mb-1.5">Mesas sin posición asignada</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {overflow.map(table => (
                                                        <div key={table._id} className="w-[56px] h-[70px]">
                                                            {renderCompactTable(table)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        <div className={isEditMode ? 'block' : 'hidden md:block'}>
                            {isEditMode && (
                                <div className="mb-4 text-center">
                                    <p className="text-sm text-gray-600">Arrastra las mesas para cambiar su posición</p>
                                </div>
                            )}
                            {mergeMode && (
                                <div className="mb-4 text-center">
                                    <p className="text-sm text-gray-600">Toca 2 o más mesas para unirlas en una sola cuenta</p>
                                </div>
                            )}
                            <div className={isEditMode ? 'overflow-x-auto -mx-4 px-4' : ''}>
                                <DndContext
                                    sensors={dndSensors}
                                    onDragStart={handleDndDragStart}
                                    onDragOver={handleDndDragOver}
                                    onDragEnd={handleDndDragEnd}
                                >
                                    <div className={`grid grid-cols-7 gap-2 p-4 rounded-xl ${
                                        isEditMode ? 'min-w-[560px]' : ''
                                    } ${
                                        isEditMode
                                            ? 'bg-gray-100'
                                            : 'bg-[#f4f6f2] border border-[#dfe6d8]'
                                    }`}>
                                        {createGrid().map(({ position, table }) => (
                                            <DroppableCell
                                                key={`${position.x}-${position.y}`}
                                                position={position}
                                                isEditMode={isEditMode}
                                                className={`
                                                    aspect-square rounded-lg transition-all
                                                    ${isEditMode ? 'border-2 border-dashed' : !table ? 'border border-gray-200 bg-white/80' : ''}
                                                    ${isEditMode && dragOverPosition?.x === position.x && dragOverPosition?.y === position.y
                                                        ? 'border-green-500 bg-green-50'
                                                        : isEditMode ? 'border-gray-300 bg-white' : ''
                                                    }
                                                    ${isEditMode && table ? '' : isEditMode ? 'hover:border-gray-400' : ''}
                                                `}
                                            >
                                                {table ? (
                                                    <DraggableTable
                                                        table={table}
                                                        isEditMode={isEditMode}
                                                        style={{ touchAction: isEditMode ? 'none' : undefined }}
                                                        className={`
                                                            w-full h-full rounded-lg transition-all relative
                                                            ${selectedForMerge.includes(table._id)
                                                                ? 'bg-teal-100 border-2 border-teal-600 text-teal-800 shadow-sm ring-2 ring-teal-400'
                                                                : getTableStatusColor(table)}
                                                            ${draggedTable?._id === table._id ? 'opacity-50' : 'opacity-100'}
                                                            ${mergeMode ? 'cursor-pointer' : getTableHoverClasses(table, isEditMode)}
                                                        `}
                                                    >
                                                        <div
                                                            onClick={() => !isEditMode && handleTableClick(table)}
                                                            className="absolute inset-0 flex flex-col items-center justify-center p-2"
                                                        >
                                                            <div className={`font-bold ${
                                                                isEditMode ? 'text-xl' : 'text-2xl'
                                                            }`}>
                                                                {table.tableNumber}
                                                            </div>
                                                            <div className={`flex items-center gap-1 ${
                                                                isEditMode ? 'text-xs' : 'text-sm'
                                                            }`}>
                                                                <UserGroupIcon className={isEditMode ? 'w-3 h-3' : 'w-4 h-4'} />
                                                                <span>
                                                                    {!isEditMode && table.status === 'occupied' && table.currentGuests
                                                                        ? `${table.currentGuests}/${table.capacity}`
                                                                        : table.capacity
                                                                    }
                                                                </span>
                                                            </div>

                                                            {/* Tiempo activo - solo en vista normal */}
                                                            {!isEditMode && table.status === 'occupied' && table.openedAt && (
                                                                <div className="flex items-center gap-1 text-xs mt-1 font-semibold text-orange-800">
                                                                    <ClockIcon className="w-3 h-3" />
                                                                    <span>{getTableDuration(table.openedAt)}</span>
                                                                </div>
                                                            )}

                                                            {/* Badge de mesas unidas */}
                                                            {Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0 && !isEditMode && !mergeMode && (
                                                                <div className="flex items-center gap-1 text-[10px] mt-1 font-semibold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">
                                                                    <LinkIcon className="w-2.5 h-2.5" />
                                                                    <span>{table.mergedGroup.map(t => t.tableNumber).join(', ')}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Conector visual hacia mesas unidas adyacentes en la grilla */}
                                                        {!isEditMode && !mergeMode && (() => {
                                                            const { right, bottom } = getAdjacentMergedDirections(table);
                                                            return (
                                                                <>
                                                                    {right && (
                                                                        <div className="absolute top-1/4 bottom-1/4 -right-2 w-2 bg-indigo-500 z-10" />
                                                                    )}
                                                                    {bottom && (
                                                                        <div className="absolute left-1/4 right-1/4 -bottom-2 h-2 bg-indigo-500 z-10" />
                                                                    )}
                                                                </>
                                                            );
                                                        })()}

                                                        {/* Botón de separar - solo si la mesa está unida y no hay otro modo activo */}
                                                        {Array.isArray(table.mergedGroup) && table.mergedGroup.length > 0 && !isEditMode && !mergeMode && (
                                                            <button
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                onClick={(e) => handleUnlinkTable(table, e)}
                                                                className="absolute top-1 left-1 p-1 bg-white bg-opacity-90 hover:bg-opacity-100 rounded transition-all"
                                                                title="Separar mesa"
                                                            >
                                                                <LinkSlashIcon className="w-3 h-3 text-gray-600" />
                                                            </button>
                                                        )}

                                                        {/* Botones de edición - solo en modo edición */}
                                                        {isEditMode && (
                                                            <div className="absolute top-1 right-1 flex gap-1">
                                                                <button
                                                                    onPointerDown={(e) => e.stopPropagation()}
                                                                    onClick={(e) => handleEditTable(table, e)}
                                                                    className="p-1 bg-white bg-opacity-90 hover:bg-opacity-100 rounded transition-all"
                                                                >
                                                                    <PencilIcon className="w-3 h-3 text-teal-600" />
                                                                </button>
                                                                <button
                                                                    onPointerDown={(e) => e.stopPropagation()}
                                                                    onClick={(e) => handleDeleteTable(table, e)}
                                                                    className="p-1 bg-white bg-opacity-90 hover:bg-opacity-100 rounded transition-all"
                                                                >
                                                                    <TrashIcon className="w-3 h-3 text-red-600" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </DraggableTable>
                                                ) : null}
                                            </DroppableCell>
                                        ))}
                                    </div>
                                </DndContext>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Barra flotante de confirmación al unir mesas */}
            {mergeMode && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white rounded-full shadow-xl border border-gray-200 px-5 py-3 flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">
                        {selectedForMerge.length} mesa{selectedForMerge.length !== 1 ? 's' : ''} seleccionada{selectedForMerge.length !== 1 ? 's' : ''}
                    </span>
                    <Button
                        onClick={() => { setMergeMode(false); setSelectedForMerge([]); }}
                        variant="outline"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => setShowMergeConfirmModal(true)}
                        disabled={selectedForMerge.length < 2}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Confirmar
                    </Button>
                </div>
            )}

            {/* Modal: Confirmar unión de mesas */}
            {showMergeConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Unir Mesas</h3>
                        <p className="text-gray-600 mb-6">
                            Se unirán las mesas{' '}
                            <strong>
                                {tables
                                    .filter(t => selectedForMerge.includes(t._id))
                                    .sort((a, b) => a.tableNumber - b.tableNumber)
                                    .map(t => t.tableNumber)
                                    .join(', ')}
                            </strong>
                            {' '}en una sola cuenta. Podrás separarlas en cualquier momento.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowMergeConfirmModal(false)}
                                variant="outline"
                                className="flex-1"
                                disabled={isMergeSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmMergeTables}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                                disabled={isMergeSubmitting}
                            >
                                {isMergeSubmitting ? 'Uniendo...' : 'Unir Mesas'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Confirmar separación de mesas */}
            {showSplitConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Separar Mesas</h3>
                        <p className="text-gray-600 mb-6">
                            {tableToSplit?.mergedInto
                                ? `¿Separar la Mesa ${tableToSplit?.tableNumber} del grupo? Volverá a estar disponible de forma independiente.`
                                : `¿Separar todo el grupo de la Mesa ${tableToSplit?.tableNumber}? Las mesas unidas volverán a estar disponibles de forma independiente y la Mesa ${tableToSplit?.tableNumber} conservará el pedido activo.`}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => { setShowSplitConfirmModal(false); setTableToSplit(null); }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmSplitTable}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Separar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Agregar mesa */}
            {showAddTableModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Nueva Mesa</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Mesa
                                </label>
                                <input
                                    type="number"
                                    value={newTable.tableNumber}
                                    onChange={(e) => setNewTable({...newTable, tableNumber: e.target.value})}
                                    placeholder="Automático"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Capacidad
                                </label>
                                <input
                                    type="number"
                                    value={newTable.capacity}
                                    onChange={(e) => setNewTable({...newTable, capacity: e.target.value})}
                                    min="1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowAddTableModal(false);
                                    setNewTable({ tableNumber: '', capacity: 4 });
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleAddTable}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Crear Mesa
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar mesa */}
            {showEditTableModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Editar Mesa {selectedTable?.tableNumber}</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Mesa
                                </label>
                                <input
                                    type="number"
                                    value={editTableData.tableNumber}
                                    onChange={(e) => setEditTableData({...editTableData, tableNumber: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Capacidad
                                </label>
                                <input
                                    type="number"
                                    value={editTableData.capacity}
                                    onChange={(e) => setEditTableData({...editTableData, capacity: e.target.value})}
                                    min="1"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowEditTableModal(false);
                                    setSelectedTable(null);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleUpdateTable}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Confirmar eliminación */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Confirmar Eliminación</h3>
                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de que deseas eliminar la Mesa {tableToDelete?.tableNumber}?
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setTableToDelete(null);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmDeleteTable}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                            >
                                Eliminar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Abrir mesa */}
            {showOpenTableModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            Abrir Mesa {tableToOpen?.tableNumber}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Comensales
                                </label>
                                <input
                                    type="number"
                                    value={guestCount}
                                    onChange={(e) => setGuestCount(parseInt(e.target.value) || 0)}
                                    min="1"
                                    max={tableToOpen?.capacity || 10}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Capacidad máxima: {tableToOpen?.capacity} personas
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Mesero (Opcional)
                                </label>
                                <select
                                    value={selectedWaiter || ''}
                                    onChange={(e) => setSelectedWaiter(e.target.value || null)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="">Sin mesero asignado</option>
                                    {waiters.map(waiter => (
                                        <option key={waiter._id} value={waiter._id}>
                                            {waiter.userName} 
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowOpenTableModal(false);
                                    setTableToOpen(null);
                                    setGuestCount(2);
                                    setSelectedWaiter(null);
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmOpenTable}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Abrir Mesa
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Nueva sección */}
            {showSectionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Nueva Sección</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre de la Sección
                                </label>
                                <input
                                    type="text"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    placeholder="Ej: Terraza, Salón 2..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    onKeyPress={(e) => e.key === 'Enter' && handleCreateSection()}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setShowSectionModal(false);
                                    setNewSectionName('');
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCreateSection}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Crear Sección
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar nombre de sección */}
            {editingSectionName && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Renombrar Sección</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nuevo Nombre
                                </label>
                                <input
                                    type="text"
                                    value={sectionToEdit}
                                    onChange={(e) => setSectionToEdit(e.target.value)}
                                    placeholder="Nuevo nombre de la sección"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    onKeyPress={(e) => e.key === 'Enter' && handleEditSectionName()}
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    Nombre actual: <strong>{editingSectionName}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    setEditingSectionName(null);
                                    setSectionToEdit('');
                                }}
                                variant="outline"
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleEditSectionName}
                                className="flex-1 bg-teal-600 hover:bg-teal-700"
                            >
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableManagement;
