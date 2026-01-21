/**
 * Script para probar el webhook de MercadoPago manualmente
 * Ejecutar: node test-webhook.js
 */

const axios = require('axios');

// Configuración
const BACKEND_URL = 'http://localhost:3001';
const RESTAURANT_ID = 'COLOCA_TU_RESTAURANT_ID_AQUI'; // ⚠️ CAMBIAR ESTO
const PAYMENT_ID = '1234567890'; // ID de pago de prueba

async function testPaymentWebhook() {
    console.log('🧪 Probando webhook de pago...\n');

    try {
        // Simular notificación de MercadoPago
        const response = await axios.get(
            `${BACKEND_URL}/api/webhooks/mercadopago`,
            {
                params: {
                    type: 'payment',
                    'data.id': PAYMENT_ID,
                },
            }
        );

        console.log('✅ Webhook procesado:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function createTestSubscription() {
    console.log('🧪 Creando suscripción de prueba directamente...\n');

    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/subscriptions`,
            {
                restaurantId: RESTAURANT_ID,
                plan: 'monthly',
                paymentData: {
                    provider: 'mercadopago',
                    paymentId: 'test_payment_' + Date.now(),
                    autoRenew: false,
                },
            }
        );

        console.log('✅ Suscripción creada:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function checkSubscriptionStatus() {
    console.log('🔍 Verificando estado de suscripción...\n');

    try {
        const response = await axios.get(
            `${BACKEND_URL}/api/subscriptions/${RESTAURANT_ID}/current`
        );

        console.log('📊 Estado actual:');
        console.log('   Plan:', response.data.data.subscription.plan);
        console.log('   Estado:', response.data.data.subscription.status);
        console.log('   Días restantes:', response.data.data.daysRemaining);
        console.log('   Activa:', response.data.data.isActive);
        console.log('   Puede acceder:', response.data.data.canAccess);
        console.log('   Inicio:', response.data.data.subscription.startDate);
        console.log('   Fin:', response.data.data.subscription.endDate);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Menú de pruebas
async function main() {
    const option = process.argv[2];

    switch (option) {
        case 'webhook':
            await testPaymentWebhook();
            break;
        case 'create':
            await createTestSubscription();
            break;
        case 'check':
            await checkSubscriptionStatus();
            break;
        default:
            console.log(`
📋 Opciones disponibles:

1. Probar webhook (simulado):
   node test-webhook.js webhook

2. Crear suscripción directamente:
   node test-webhook.js create

3. Verificar estado:
   node test-webhook.js check

⚠️  Recuerda cambiar RESTAURANT_ID en el archivo
            `);
    }
}

main();
