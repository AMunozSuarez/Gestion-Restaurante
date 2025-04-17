import React, { useState, useEffect } from 'react';
import { createCashRegister, getAllCashRegisters, getCashRegisterById, closeCashRegister } from '../../api/cashApi';
import '../../styles/admin/cashRegister.css'; // Estilos específicos para la página de caja
import AdminSubheader from './adminSubheader'; // Subheader para navegación

const CashRegister = () => {
    const [allCashRegisters, setAllCashRegisters] = useState([]);
    const [selectedCashRegister, setSelectedCashRegister] = useState(null);
    const [initialBalance, setInitialBalance] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false); // Estado para controlar la ventana modal
    const [officialIncome, setOfficialIncome] = useState({}); // Estado para los ingresos oficiales por método de pago

    // Obtener todas las cajas
    const fetchAllCashRegisters = async () => {
        try {
            const response = await getAllCashRegisters();
            // Ordenar las cajas de la más nueva a la más antigua
            const sortedRegisters = response.data.cashRegisters.sort((a, b) => new Date(b.dateOpened) - new Date(a.dateOpened));
            setAllCashRegisters(sortedRegisters);
        } catch (error) {
            console.error('Error al obtener todas las cajas:', error);
        }
    };

    // Crear una nueva caja
    const handleCreateCashRegister = async (e) => {
        e.preventDefault();
        try {
            if (!initialBalance) {
                alert('Por favor, ingrese el saldo inicial.');
                return;
            }
            await createCashRegister({ initialBalance });
            setInitialBalance(''); // Limpiar el campo de saldo inicial
            setIsModalOpen(false); // Cerrar la ventana modal
            fetchAllCashRegisters(); // Actualizar la lista de cajas
        } catch (error) {
            console.error('Error al crear la caja:', error);
        }
    };

    // Ver el detalle de una caja específica
    const handleViewCashRegister = async (id) => {
        try {
            const response = await getCashRegisterById(id);
            setSelectedCashRegister(response.data.cashRegister);

            // Inicializar los ingresos oficiales con valores vacíos si la caja está abierta
            if (response.data.cashRegister.status === 'Abierta') {
                const initialIncome = {};
                response.data.cashRegister.orders.forEach((order) => {
                    if (!initialIncome[order.paymentMethod]) {
                        initialIncome[order.paymentMethod] = 0;
                    }
                });
                setOfficialIncome(initialIncome);
            }
        } catch (error) {
            console.error('Error al obtener el detalle de la caja:', error);
        }
    };

    // Cerrar una caja abierta
    const handleCloseCashRegister = async () => {
        try {
            const totalReal = calculateOfficialTotal(); // Calcular el total real
            await closeCashRegister({ officialIncome }); // Enviar los ingresos oficiales al backend
            alert('Caja cerrada exitosamente.');
            setSelectedCashRegister(null); // Limpiar el detalle de la caja seleccionada
            fetchAllCashRegisters(); // Actualizar la lista de cajas
        } catch (error) {
            console.error('Error al cerrar la caja:', error);
        }
    };

    // Calcular el total de los ingresos oficiales
    const calculateOfficialTotal = () => {
        return Object.values(officialIncome).reduce((sum, value) => sum + parseFloat(value || 0), 0);
    };

    useEffect(() => {
        fetchAllCashRegisters();
    }, []);

    // Calcular el total dividido por métodos de pago
    const calculatePaymentMethods = (orders) => {
        const paymentSummary = orders.reduce((acc, order) => {
            acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + order.total;
            return acc;
        }, {});
        return paymentSummary;
    };

    return (
        <div className="cash-register">
            
            <AdminSubheader /> {/* Subheader para cambiar entre páginas */}
            <button className="open-modal-button" onClick={() => setIsModalOpen(true)}>Crear Nueva Caja</button>

            <div className="cash-register-container">
                {/* Lista de cajas en formato de tabla */}
                <div className="cash-registers">
                    <h3>Lista de Cajas</h3>
                    <div className="cash-registers-header">
                        <p>Fecha Apertura</p>
                        <p>Fecha Cierre</p>
                        <p>Estado</p>
                        <p>Saldo Inicial</p>
                        <p>Saldo Final</p>
                    </div>
                    <ul className="cash-registers-list">
                        {allCashRegisters.map((register) => (
                            <li
                                key={register._id}
                                className={`cash-register-item ${selectedCashRegister && selectedCashRegister._id === register._id ? 'active' : ''}`}
                                onClick={() => handleViewCashRegister(register._id)}
                            >
                                <p>{new Date(register.dateOpened).toLocaleString()}</p>
                                <p>{register.dateClosed ? new Date(register.dateClosed).toLocaleString() : ''}</p>
                                <p>{register.status}</p>
                                <p>${register.initialBalance}</p>
                                <p>${register.amountSystem}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Detalle de la caja seleccionada */}
                {selectedCashRegister && (
                    <div className="cash-register-detail">
                        <h3>Detalle de Caja</h3>

                        {/* Información general */}
                        <section className="detail-section">
                            <h4>Información General</h4>
                            <div className="detail-row">
                                <p><strong>Fecha de Apertura:</strong></p>
                                <p>{new Date(selectedCashRegister.dateOpened).toLocaleString()}</p>
                            </div>
                            {selectedCashRegister.dateClosed && (
                                <div className="detail-row">
                                    <p><strong>Fecha de Cierre:</strong></p>
                                    <p>{new Date(selectedCashRegister.dateClosed).toLocaleString()}</p>
                                </div>
                            )}
                            <div className="detail-row">
                                <p><strong>Estado:</strong></p>
                                <p>{selectedCashRegister.status}</p>
                            </div>
                            <div className="detail-row">
                                <p><strong>Saldo Inicial:</strong></p>
                                <p>${selectedCashRegister.initialBalance}</p>
                            </div>
                        </section>

                        {/* Ingresos */}
                        <section className="detail-section">
                            <h4>Ingresos</h4>
                            <div className="detail-row">
                                <p><strong>Ingresos Totales:</strong></p>
                                <p>${Object.values(calculatePaymentMethods(selectedCashRegister.orders)).reduce((sum, total) => sum + total, 0).toFixed(0)}</p>
                            </div>
                            <div className="detail-row">
                                <p><strong>Ingresos por Método de Pago:</strong></p>
                                <ul>
                                    {Object.entries(calculatePaymentMethods(selectedCashRegister.orders)).map(([method, total]) => (
                                        <li key={method}>
                                            <strong>{method}:</strong> ${total.toFixed(0)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        {/* Saldo Final */}
                        <section className="detail-section">
                            <div className="detail-row">
                                <p><h4><strong>Saldo Final:</strong></h4></p>
                                <p>${selectedCashRegister.amountSystem}</p>
                            </div>
                        </section>

                        {/* Ingresos Oficiales */}
                        {selectedCashRegister.status === 'Abierta' && (
                            <section className="detail-section">
                                <h4>Ingresos Oficiales</h4>
                                <form>
                                    {Object.keys(officialIncome).map((method) => (
                                        <div key={method} className="official-income-input">
                                            <label>{method}:</label>
                                            <input
                                                type="number"
                                                value={officialIncome[method]}
                                                onChange={(e) =>
                                                    setOfficialIncome({
                                                        ...officialIncome,
                                                        [method]: e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    ))}
                                </form>
                                <p><strong>Total Real:</strong> ${calculateOfficialTotal().toFixed(2)}</p>
                            </section>
                        )}

                        {/* Ingresos Oficiales Registrados */}
                        {selectedCashRegister.status === 'Cerrada' && (
                            <section className="detail-section">
                                <h4>Ingresos Oficiales Registrados</h4>
                                <ul>
                                    {Object.entries(selectedCashRegister.officialIncome || {}).map(([method, total]) => (
                                        <li key={method}>
                                            <strong>{method}:</strong> ${total.toFixed(2)}
                                        </li>
                                    ))}
                                </ul>
                                <p><strong>Total Real Registrado:</strong> ${selectedCashRegister.amountSystem.toFixed(2)}</p>
                            </section>
                        )}

                        {/* Botón para cerrar caja */}
                        {!selectedCashRegister.dateClosed && (
                            <section className="detail-section">
                                <button onClick={handleCloseCashRegister}>Cerrar Caja</button>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* Modal para crear una nueva caja */}
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Crear Nueva Caja</h3>
                        <form onSubmit={handleCreateCashRegister}>
                            <input
                                type="number"
                                placeholder="Saldo Inicial"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                required
                            />
                            <button type="submit">Crear</button>
                            <button type="button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CashRegister;