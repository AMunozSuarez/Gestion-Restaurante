import React, { useState, useEffect } from 'react';
import { addCashMovement, getCashMovements } from '../../api/cashApi'; // Importa las funciones de la API
import '../../styles/admin/cashRegister.css'; // Estilos específicos para la página de caja

const CashRegister = () => {
    const [movements, setMovements] = useState([]);
    const [formData, setFormData] = useState({ type: 'Ingreso', amount: '', description: '' });

    // Obtener movimientos de caja
    const fetchMovements = async () => {
        try {
            const response = await getCashMovements({ startDate: '2025-01-01', endDate: '2025-12-31' });
            setMovements(response.data.movements);
        } catch (error) {
            console.error('Error al obtener movimientos de caja:', error);
        }
    };

    // Manejar el envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addCashMovement(formData);
            fetchMovements(); // Actualizar la lista de movimientos
            setFormData({ type: 'Ingreso', amount: '', description: '' }); // Limpiar el formulario
        } catch (error) {
            console.error('Error al registrar movimiento:', error);
        }
    };

    useEffect(() => {
        fetchMovements();
    }, []);

    return (
        <div className="cash-register">
            <h2>Movimientos de Caja</h2>
            <form onSubmit={handleSubmit} className="cash-form">
                <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="Ingreso">Ingreso</option>
                    <option value="Egreso">Egreso</option>
                </select>
                <input
                    type="number"
                    placeholder="Monto"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                />
                <input
                    type="text"
                    placeholder="Descripción"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <button type="submit">Registrar</button>
            </form>
            <ul className="cash-movements">
                {movements.map((movement) => (
                    <li key={movement._id} className={`movement-item ${movement.type.toLowerCase()}`}>
                        <span>{movement.type}</span>
                        <span>${movement.amount}</span>
                        <span>{movement.description}</span>
                        <span>{new Date(movement.date).toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CashRegister;