const Subscription = require('../models/subscriptionModel');
const Restaurant = require('../models/restaurantModel');
const { calculateGracePeriodEnd } = require('../utils/subscriptionUtils');

/**
 * Verifica y actualiza suscripciones vencidas
 * Esta función debe ejecutarse diariamente
 */
const checkExpiredSubscriptions = async () => {
    console.log('🔍 Verificando suscripciones vencidas...');
    
    try {
        const now = new Date();
        
        // 1. Buscar suscripciones activas que ya pasaron su fecha de vencimiento
        const expiredSubscriptions = await Subscription.find({
            status: { $in: ['active', 'trial'] },
            endDate: { $lt: now },
        }).populate('restaurant');

        console.log(`📋 Encontradas ${expiredSubscriptions.length} suscripciones vencidas`);

        for (const subscription of expiredSubscriptions) {
            // Cambiar estado a expired y establecer período de gracia
            subscription.status = 'expired';
            subscription.gracePeriodEnd = calculateGracePeriodEnd(subscription.endDate, 5); // 5 días de gracia
            
            await subscription.save();

            // Actualizar estado en el restaurante
            await Restaurant.findByIdAndUpdate(subscription.restaurant._id, {
                subscriptionStatus: 'expired',
            });

            console.log(`✅ Suscripción ${subscription._id} marcada como EXPIRED (Restaurante: ${subscription.restaurant?.name})`);
            console.log(`   Período de gracia hasta: ${subscription.gracePeriodEnd.toLocaleDateString('es-CL')}`);
        }

        // 2. Buscar suscripciones que terminaron su período de gracia
        const gracePeriodEnded = await Subscription.find({
            status: 'expired',
            gracePeriodEnd: { $lt: now },
        }).populate('restaurant');

        console.log(`📋 Encontradas ${gracePeriodEnded.length} suscripciones con período de gracia terminado`);

        for (const subscription of gracePeriodEnded) {
            // Cambiar a suspended (no puede acceder al sistema)
            subscription.status = 'suspended';
            await subscription.save();

            // Suspender el restaurante
            await Restaurant.findByIdAndUpdate(subscription.restaurant._id, {
                subscriptionStatus: 'suspended',
                isSuspended: true,
                suspensionReason: 'Suscripción no renovada después del período de gracia',
            });

            console.log(`🚫 Suscripción ${subscription._id} SUSPENDIDA (Restaurante: ${subscription.restaurant?.name})`);
        }

        console.log('✅ Verificación completada');
        
        return {
            expiredCount: expiredSubscriptions.length,
            suspendedCount: gracePeriodEnded.length,
        };
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
