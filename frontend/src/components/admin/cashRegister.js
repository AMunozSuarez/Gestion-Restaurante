import React, { useState, useEffect, useRef } from 'react'; // Añadir useRef a los imports
import { createCashRegister, getAllCashRegisters, getCashRegisterById, closeCashRegister } from '../../api/cashApi';
import '../../styles/admin/cashRegister.css';
import AdminSubheader from '../layout/adminSubheader';
import { formatChileanMoney } from '../../services/utils/formatters';

const CashRegister = () => {
    const [allCashRegisters, setAllCashRegisters] = useState([]);
    const [selectedCashRegister, setSelectedCashRegister] = useState(null);
    const [initialBalance, setInitialBalance] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [officialIncome, setOfficialIncome] = useState({});
    
    // Crear una referencia para el input de saldo inicial
    const initialBalanceInputRef = useRef(null);

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
            setInitialBalance('');
            setIsModalOpen(false);
            fetchAllCashRegisters();
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
                        initialIncome[order.paymentMethod] = '';
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
            const totalReal = calculateOfficialTotal();
            await closeCashRegister({ officialIncome });
            alert('Caja cerrada exitosamente.');
            setSelectedCashRegister(null);
            fetchAllCashRegisters();
        } catch (error) {
            console.error('Error al cerrar la caja:', error);
        }
    };

    // Calcular el total de los ingresos oficiales
    const calculateOfficialTotal = () => {
        return Object.values(officialIncome).reduce((sum, value) => sum + parseFloat(value || 0), 0);
    };

    // Cargar las cajas al iniciar el componente
    useEffect(() => {
        fetchAllCashRegisters();
    }, []);
    
    // Efecto para poner el foco en el input cuando se abre el modal
    useEffect(() => {
        if (isModalOpen && initialBalanceInputRef.current) {
            // Pequeño timeout para asegurar que el modal esté completamente renderizado
            setTimeout(() => {
                initialBalanceInputRef.current.focus();
            }, 50);
        }
    }, [isModalOpen]);

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
            
            <AdminSubheader />
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
                                <p>{formatChileanMoney(register.initialBalance)}</p>
                                <p>{formatChileanMoney(register.amountSystem)}</p>
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
                                <p>{formatChileanMoney(selectedCashRegister.initialBalance)}</p>
                            </div>
                        </section>

                        {/* Ingresos */}
                        <section className="detail-section">
                            <h4>Ingresos</h4>
                            <div className="detail-row">
                                <p><strong>Ingresos por Método de Pago:</strong></p>
                            </div>
                            <ul className="method-list">
                                {Object.entries(calculatePaymentMethods(selectedCashRegister.orders)).map(([method, total]) => (
                                    <li key={method}>
                                        <span className="method-name">{method}:</span>
                                        <span className="method-value">{formatChileanMoney(total)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="total-row">
                                <span>Total:</span>
                                <span className="total-value">{formatChileanMoney(
                                    Object.values(calculatePaymentMethods(selectedCashRegister.orders))
                                        .reduce((sum, total) => sum + total, 0)
                                )}</span>
                            </div>
                        </section>

                        {/* Saldo Final */}
                        <section className="detail-section">
                            <h4>Saldo Final</h4>
                            <div className="detail-row">
                                <p><strong>Ingreso Total:</strong></p>
                                <p>{formatChileanMoney(selectedCashRegister.amountSystem)}</p>
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
                                <div className="total-row">
                                    <span>Total Real:</span>
                                    <span className="total-value">{formatChileanMoney(calculateOfficialTotal())}</span>
                                </div>
                            </section>
                        )}

                        {/* Ingresos Oficiales Registrados */}
                        {selectedCashRegister.status === 'Cerrada' && (
                            <section className="detail-section">
                                <h4>Ingresos Oficiales Registrados</h4>
                                <ul className="method-list">
                                    {Object.entries(selectedCashRegister.officialIncome || {}).map(([method, total]) => (
                                        <li key={method}>
                                            <span className="method-name">{method}:</span>
                                            <span className="method-value">{formatChileanMoney(total)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="total-row">
                                    <span>Total Real Registrado:</span>
                                    <span className="total-value">{formatChileanMoney(selectedCashRegister.amountSystem)}</span>
                                </div>
                            </section>
                        )}

                        {/* Botón para cerrar caja */}
                        {!selectedCashRegister.dateClosed && (
                            <section className="detail-section">
                                <button className='button-cashregister' onClick={handleCloseCashRegister}>Cerrar Caja</button>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* Modal para crear una nueva caja */}
            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content-cashregister">
                        <h3>Crear Nueva Caja</h3>
                        <form onSubmit={handleCreateCashRegister}>
                            <input
                                type="number"
                                placeholder="Saldo Inicial"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                required
                                ref={initialBalanceInputRef} // Asignar la referencia al input
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