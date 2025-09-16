const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const userModel = require('../models/userModel');
const restaurantModel = require('../models/restaurantModel');
require('dotenv').config();

const createSuperAdmin = async () => {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant-management', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Conectado a MongoDB');

        // Verificar si ya existe un super admin
        const existingSuperAdmin = await userModel.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            console.log('⚠️ Ya existe un super administrador en el sistema');
            console.log(`📧 Email: ${existingSuperAdmin.email}`);
            console.log(`👤 Nombre: ${existingSuperAdmin.userName}`);
            return;
        }

        // Crear o encontrar un restaurante por defecto para el super admin
        let defaultRestaurant = await restaurantModel.findOne({ name: 'Sistema Administración' });
        
        if (!defaultRestaurant) {
            defaultRestaurant = new restaurantModel({
                name: 'Sistema Administración',
                address: 'Oficina Central',
                subscriptionPlan: 'Enterprise',
                isActive: true
            });
            await defaultRestaurant.save();
            console.log('🏢 Restaurante por defecto creado para administración');
        }

        // Datos del super administrador
        const superAdminData = {
            userName: 'Super Administrador',
            email: 'admin@sistema.com',
            password: 'admin123456', // Cambiar en producción
            role: 'super_admin',
            restaurant: defaultRestaurant._id,
            phone: '+1234567890'
        };

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(superAdminData.password, salt);

        // Crear el super administrador
        const superAdmin = new userModel({
            ...superAdminData,
            password: hashedPassword
        });

        await superAdmin.save();

        // Actualizar el restaurante con el propietario
        defaultRestaurant.owner = superAdmin._id;
        await defaultRestaurant.save();

        console.log('🎉 ¡Super Administrador creado exitosamente!');
        console.log('📋 Detalles del super administrador:');
        console.log(`   📧 Email: ${superAdminData.email}`);
        console.log(`   🔒 Contraseña: ${superAdminData.password}`);
        console.log(`   👤 Nombre: ${superAdminData.userName}`);
        console.log(`   🎭 Rol: ${superAdminData.role}`);
        console.log(`   🏢 Restaurante: ${defaultRestaurant.name}`);
        console.log('');
        console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
        console.log('🔗 Accede al panel en: http://localhost:3000/super-admin');

    } catch (error) {
        console.error('❌ Error creando super administrador:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('🔌 Conexión a MongoDB cerrada');
        process.exit(0);
    }
};

// Ejecutar el script
createSuperAdmin();
