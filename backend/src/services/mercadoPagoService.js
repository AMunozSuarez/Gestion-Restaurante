const { MercadoPagoConfig, Preference, Payment, PreApproval, MerchantOrder } = require('mercadopago');

// Cliente de MercadoPago
let client = null;

/**
 * Configurar MercadoPago con las credenciales
 * Debe llamarse al iniciar la aplicación
 */
const configureMercadoPago = () => {
    try {
        client = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
            options: {
                timeout: 5000,
            }
        });
        console.log('✓ MercadoPago configurado correctamente');
    } catch (error) {
        console.error('Error al configurar MercadoPago:', error);
    }
};

/**
 * Obtener cliente configurado
 */
const getClient = () => {
    if (!client) {
        configureMercadoPago();
    }
    return client;
};

/**
 * Crear preferencia de pago para suscripción
 * @param {Object} data - Datos de la suscripción
 * @returns {Promise<Object>} Preferencia creada con init_point para redirección
 */
const createSubscriptionPreference = async (data) => {
    const { restaurantId, plan, planConfig, userEmail, userName } = data;

    try {
        const preference = new Preference(getClient());
        
        // Asegurar que las URLs no tengan barra final
        const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
        const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:3001';
        const isLocalhost = frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1');
        
        const body = {
            items: [
                {
                    title: `Suscripción ${planConfig.name}`,
                    description: `Plan ${planConfig.name} - ${planConfig.duration}`,
                    quantity: 1,
                    unit_price: planConfig.price,
                    currency_id: 'CLP',
                },
            ],
            external_reference: JSON.stringify({
                restaurantId,
                plan,
                type: 'subscription',
                timestamp: Date.now(),
            }),
            statement_descriptor: 'Suscripcion',
        };

        // Solo agregar notification_url si es HTTPS (no localhost)
        if (!isLocalhost && backendUrl.startsWith('https://')) {
            body.notification_url = `${backendUrl}/api/webhooks/mercadopago`;
        }

        // Agregar back_urls solo en producción
        // En localhost, el usuario debe volver manualmente
        if (!isLocalhost) {
            body.back_urls = {
                success: `${frontendUrl}/subscription/success`,
                failure: `${frontendUrl}/subscription/failure`,
                pending: `${frontendUrl}/subscription/pending`,
            };
            body.auto_return = 'approved';
        }

        console.log('🔍 Creando preferencia con datos:', {
            plan: planConfig.name,
            price: planConfig.price,
            currency: 'CLP',
            reference: body.external_reference,
            back_urls: body.back_urls || 'Manual (localhost)',
            notification_url: body.notification_url || 'Sin notification_url (localhost)',
            frontend_url: frontendUrl,
            isLocalhost,
        });

        const response = await preference.create({ body });
        
        console.log('✅ Preferencia creada exitosamente:', response.id);
        
        return {
            id: response.id,
            init_point: response.init_point, // URL para redirección
            sandbox_init_point: response.sandbox_init_point,
        };
    } catch (error) {
        console.error('❌ Error al crear preferencia de MercadoPago:', {
            message: error.message,
            code: error.code,
            status: error.status,
            cause: error.cause,
        });
        
        // Proporcionar mensaje más específico según el error
        if (error.code === 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES') {
            throw new Error(
                'Error de autorización de MercadoPago. Verifica: ' +
                '1) Access Token válido y con permisos, ' +
                '2) Cuenta verificada en MercadoPago, ' +
                '3) notification_url debe ser HTTPS público (usa ngrok en desarrollo)'
            );
        }
        
        throw new Error(`Error en MercadoPago: ${error.message}`);
    }
};

/**
 * Obtener información de un pago
 * @param {String} paymentId - ID del pago
 * @returns {Promise<Object>} Información del pago
 */
const getPaymentInfo = async (paymentId) => {
    try {
        const payment = new Payment(getClient());
        const response = await payment.get({ id: paymentId });
        return response;
    } catch (error) {
        console.error('Error al obtener información del pago:', error);
        throw new Error(`Error al obtener pago: ${error.message}`);
    }
};

/**
 * Verificar el estado de un pago
 * @param {String} paymentId - ID del pago
 * @returns {Promise<Object>} Estado del pago
 */
const verifyPayment = async (paymentId) => {
    try {
        const payment = await getPaymentInfo(paymentId);
        
        return {
            id: payment.id,
            status: payment.status, // approved, pending, rejected, etc.
            status_detail: payment.status_detail,
            amount: payment.transaction_amount,
            currency: payment.currency_id,
            payer_email: payment.payer?.email,
            payment_method: payment.payment_method_id,
            external_reference: payment.external_reference,
            metadata: payment.metadata,
            date_created: payment.date_created,
            date_approved: payment.date_approved,
        };
    } catch (error) {
        console.error('Error al verificar pago:', error);
        throw new Error(`Error al verificar pago: ${error.message}`);
    }
};

/**
 * Crear plan de suscripción recurrente (preaprobación)
 * @param {Object} data - Datos de la suscripción recurrente
 * @returns {Promise<Object>} Plan de preaprobación creado
 */
const createRecurringSubscription = async (data) => {
    const { restaurantId, plan, planConfig, userEmail, autoReturnUrl } = data;

    try {
        const preApproval = new PreApproval(getClient());
        
        const body = {
            reason: `Suscripción ${planConfig.name} - Gestión Restaurante`,
            payer_email: userEmail,
            back_url: autoReturnUrl || `${process.env.FRONTEND_URL}/subscription/success`,
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months', // months, days
                transaction_amount: planConfig.price,
                currency_id: 'CLP',
                start_date: new Date().toISOString(),
            },
            external_reference: JSON.stringify({
                restaurantId,
                plan,
                type: 'recurring_subscription',
            }),
            status: 'pending',
        };

        const response = await preApproval.create({ body });
        return {
            id: response.id,
            init_point: response.init_point,
            status: response.status,
        };
    } catch (error) {
        console.error('Error al crear suscripción recurrente:', error);
        throw new Error(`Error en suscripción recurrente: ${error.message}`);
    }
};

/**
 * Obtener información de una suscripción recurrente
 * @param {String} preapprovalId - ID de la preaprobación
 * @returns {Promise<Object>} Información de la suscripción
 */
const getRecurringSubscription = async (preapprovalId) => {
    try {
        const preApproval = new PreApproval(getClient());
        const response = await preApproval.get({ id: preapprovalId });
        return response;
    } catch (error) {
        console.error('Error al obtener suscripción recurrente:', error);
        throw new Error(`Error al obtener suscripción: ${error.message}`);
    }
};

/**
 * Cancelar suscripción recurrente
 * @param {String} preapprovalId - ID de la preaprobación
 * @returns {Promise<Object>} Resultado de la cancelación
 */
const cancelRecurringSubscription = async (preapprovalId) => {
    try {
        const preApproval = new PreApproval(getClient());
        const response = await preApproval.update({
            id: preapprovalId,
            body: {
                status: 'cancelled',
            }
        });
        return response;
    } catch (error) {
        console.error('Error al cancelar suscripción recurrente:', error);
        throw new Error(`Error al cancelar suscripción: ${error.message}`);
    }
};

/**
 * Procesar notificación de MercadoPago
 * @param {String} topic - Tipo de notificación (payment, merchant_order)
 * @param {String} id - ID del recurso
 * @returns {Promise<Object>} Datos procesados
 */
const processNotification = async (topic, id) => {
    try {
        let data = null;

        switch (topic) {
            case 'payment':
                data = await getPaymentInfo(id);
                break;

            case 'merchant_order':
                const merchantOrder = new MerchantOrder(getClient());
                data = await merchantOrder.get({ id });
                break;

            case 'preapproval':
                data = await getRecurringSubscription(id);
                break;

            default:
                throw new Error(`Tipo de notificación no soportado: ${topic}`);
        }

        return data;
    } catch (error) {
        console.error('Error al procesar notificación:', error);
        throw error;
    }
};

/**
 * Crear un pago directo (sin redirección)
 * @param {Object} paymentData - Datos del pago
 * @returns {Promise<Object>} Resultado del pago
 */
const createDirectPayment = async (paymentData) => {
    try {
        const payment = new Payment(getClient());
        
        const body = {
            transaction_amount: paymentData.amount,
            token: paymentData.token, // Token de tarjeta generado por frontend
            description: paymentData.description,
            installments: paymentData.installments || 1,
            payment_method_id: paymentData.payment_method_id,
            payer: {
                email: paymentData.payer_email,
                identification: paymentData.payer_identification,
            },
            external_reference: paymentData.external_reference,
            metadata: paymentData.metadata,
        };

        const response = await payment.create({ body });
        return response;
    } catch (error) {
        console.error('Error al crear pago directo:', error);
        throw new Error(`Error en pago directo: ${error.message}`);
    }
};

/**
 * Obtener métodos de pago disponibles
 * @returns {Promise<Array>} Lista de métodos de pago
 */
const getPaymentMethods = async () => {
    try {
        // En SDK v2, los métodos de pago se obtienen vía HTTP request
        // Esta es una implementación simplificada
        console.log('Obtener métodos de pago - implementación pendiente');
        return [];
    } catch (error) {
        console.error('Error al obtener métodos de pago:', error);
        throw new Error(`Error al obtener métodos de pago: ${error.message}`);
    }
};

module.exports = {
    configureMercadoPago,
    createSubscriptionPreference,
    getPaymentInfo,
    verifyPayment,
    createRecurringSubscription,
    getRecurringSubscription,
    cancelRecurringSubscription,
    processNotification,
    createDirectPayment,
    getPaymentMethods,
};
