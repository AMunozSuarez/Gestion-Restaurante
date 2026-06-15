const Subscription = require('../models/subscriptionModel');
const Restaurant = require('../models/restaurantModel');

/**
 * Verifica y suspende suscripciones vencidas (sin período de gracia)
 * Esta función debe ejecutarse diariamente
 */
const checkExpiredSubscriptions = async () => {
    console.log('🔍 Verificando suscripciones vencidas...');

    try {
        const now = new Date();

        // Buscar suscripciones activas/trial que ya pasaron su fecha de vencimiento
        const expiredSubscriptions = await Subscription.find({
            status: { $in: ['active', 'trial'] },
            endDate: { $lt: now },
        }).populate('restaurant');

        console.log(`📋 Encontradas ${expiredSubscriptions.length} suscripciones vencidas`);

        for (const subscription of expiredSubscriptions) {
            subscription.status = 'suspended';
            await subscription.save();

            await Restaurant.findByIdAndUpdate(subscription.restaurant._id, {
                subscriptionStatus: 'suspended',
                isSuspended: true,
                suspensionReason: 'Suscripción vencida',
            });

            console.log(`🚫 Suscripción ${subscription._id} SUSPENDIDA (Restaurante: ${subscription.restaurant?.name})`);
        }

        console.log('✅ Verificación completada');

        return { suspendedCount: expiredSubscriptions.length };
    } catch (error) {
        console.error('❌ Error al verificar suscripciones:', error);
        throw error;
    }
};

/**
 * Procesar recordatorios de vencimiento
 * Envía notificaciones a 7, 3 y 1 día antes de vencer
 */
const sendExpirationReminders = async () => {
    console.log('📧 Verificando recordatorios de vencimiento...');
    
    try {
        const now = new Date();
        const reminderDays = [7, 3, 1];
        let totalReminders = 0;

        for (const days of reminderDays) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + days);
            targetDate.setHours(0, 0, 0, 0);
            
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);

            // Buscar suscripciones que vencen en X días
            const subscriptions = await Subscription.find({
                status: { $in: ['active', 'trial'] },
                endDate: { $gte: targetDate, $lt: nextDay },
                autoRenew: false,
            }).populate('restaurant');

            for (const subscription of subscriptions) {
                // Verificar si ya se envió recordatorio hoy
                const alreadySent = subscription.notificationsSent.some(notif => {
                    const notifDate = new Date(notif.date);
                    const today = new Date();
                    return (
                        notifDate.toDateString() === today.toDateString() &&
                        notif.type === 'expiration_reminder'
                    );
                });

                if (!alreadySent) {
                    // Aquí iría el código para enviar email/notificación
                    console.log(`📧 Recordatorio: La suscripción de ${subscription.restaurant?.name} vence en ${days} día(s)`);
                    
                    // Registrar notificación
                    subscription.notificationsSent.push({
                        type: 'expiration_reminder',
                        date: new Date(),
                        channel: 'email',
                    });
                    await subscription.save();
                    totalReminders++;
                }
            }
        }

        console.log(`✅ ${totalReminders} recordatorios enviados`);
        return { remindersCount: totalReminders };
    } catch (error) {
        console.error('❌ Error al enviar recordatorios:', error);
        throw error;
    }
};

module.exports = {
    checkExpiredSubscriptions,
    sendExpirationReminders,
};
