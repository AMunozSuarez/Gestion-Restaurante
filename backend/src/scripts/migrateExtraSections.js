/**
 * Script de migración: extras embebidos en productos → documentos ExtraSection referenciados
 *
 * Ejecución:
 *   node backend/src/scripts/migrateExtraSections.js
 *
 * Qué hace:
 * 1. Lee todos los productos que tienen extraSections embebidas
 * 2. Por restaurante, agrupa secciones por nombre (normalizado a lowercase)
 * 3. Dentro de cada sección, deduplica extras por nombre (mismo nombre = mismo extra)
 * 4. Crea documentos ExtraSection en la base de datos
 * 5. Actualiza cada producto para que extraSections sea [ObjectId, ...]
 * 6. Es idempotente: si un producto ya tiene ObjectIds en extraSections, lo omite
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const foodModel = require('../models/foodModel');
const ExtraSection = require('../models/extraSectionModel');

const normalize = (str) => (str || '').toLowerCase().trim();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Obtener todos los productos que tienen extraSections no vacías
        const foods = await foodModel.find({
            'extraSections.0': { $exists: true }
        }).lean();

        if (foods.length === 0) {
            console.log('ℹ️  No se encontraron productos con extraSections. Nada que migrar.');
            process.exit(0);
        }

        console.log(`📦 Productos encontrados con extraSections: ${foods.length}`);

        // Separar productos ya migrados de los que tienen datos embebidos
        // Migrado: tiene { section: ObjectId, maxSelectionOverride, visibleExtraIds }
        // Embebido: tiene { sectionName, maxSelection, extras: [...] }
        const toMigrate = foods.filter(f => {
            const first = f.extraSections[0];
            if (!first || typeof first !== 'object') return false;
            // Si ya tiene el campo 'section' (nuevo formato), ya está migrado
            if (first.section) return false;
            // Si tiene 'sectionName', es el formato embebido antiguo
            return Boolean(first.sectionName);
        });

        console.log(`🔄 Productos a migrar: ${toMigrate.length}`);

        if (toMigrate.length === 0) {
            console.log('ℹ️  Todos los productos ya parecen estar migrados.');
            process.exit(0);
        }

        // Agrupar por restaurante
        const byRestaurant = {};
        for (const food of toMigrate) {
            const rid = food.restaurant.toString();
            if (!byRestaurant[rid]) byRestaurant[rid] = [];
            byRestaurant[rid].push(food);
        }

        for (const [restaurantId, restaurantFoods] of Object.entries(byRestaurant)) {
            console.log(`\n🏪 Restaurante: ${restaurantId}`);

            // Mapa: normalizedSectionName → { sectionName, maxSelection, extras: Map<normalizedName, extra> }
            const sectionMap = {};

            for (const food of restaurantFoods) {
                for (const section of food.extraSections) {
                    if (!section.sectionName) continue;
                    const key = normalize(section.sectionName);

                    if (!sectionMap[key]) {
                        sectionMap[key] = {
                            sectionName: section.sectionName.trim(),
                            extrasMap: new Map()
                        };
                    }

                    // Deduplicar extras por nombre normalizado
                    for (const extra of (section.extras || [])) {
                        if (!extra.name) continue;
                        const extraKey = normalize(extra.name);
                        if (!sectionMap[key].extrasMap.has(extraKey)) {
                            sectionMap[key].extrasMap.set(extraKey, {
                                name: extra.name.trim(),
                                price: extra.price ?? 0,
                                isAvailable: extra.isAvailable !== false
                            });
                        } else {
                            // Si hay conflicto de precios, registrar en consola
                            const existing = sectionMap[key].extrasMap.get(extraKey);
                            if (existing.price !== (extra.price ?? 0)) {
                                console.log(`  ⚠️  Conflicto de precio en "${section.sectionName}" → "${extra.name}": ` +
                                    `precio existente $${existing.price}, encontrado $${extra.price ?? 0}. Se mantiene $${existing.price}.`);
                            }
                        }
                    }
                }
            }

            // Crear documentos ExtraSection para este restaurante
            // Guardamos el doc completo (no solo el _id) para calcular visibleExtraIds por producto
            const createdSections = {};    // key → _id
            const createdSectionDocs = {}; // key → documento completo (con extras y sus _id)
            for (const [key, data] of Object.entries(sectionMap)) {
                // Verificar si ya existe una sección con ese nombre en este restaurante
                let existing = await ExtraSection.findOne({
                    restaurant: restaurantId,
                    sectionName: { $regex: new RegExp(`^${data.sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                });

                if (!existing) {
                    existing = await ExtraSection.create({
                        restaurant: restaurantId,
                        sectionName: data.sectionName,
                        extras: Array.from(data.extrasMap.values())
                    });
                    console.log(`  ✅ Sección creada: "${data.sectionName}" (${data.extrasMap.size} extras)`);
                } else {
                    console.log(`  ♻️  Sección ya existente: "${data.sectionName}" → usando ID existente`);
                }

                createdSections[key] = existing._id;
                createdSectionDocs[key] = existing;
            }

            // Actualizar cada producto: reemplazar extraSections embebidas por asignaciones con overrides
            for (const food of restaurantFoods) {
                const assignments = food.extraSections
                    .filter(s => s.sectionName)
                    .map(s => {
                        const key = normalize(s.sectionName);
                        const sectionId = createdSections[key];
                        const sectionDoc = createdSectionDocs[key];
                        if (!sectionId || !sectionDoc) return null;

                        // Calcular qué extras del producto original pertenecen a esta sección centralizada
                        const originalNames = new Set((s.extras || []).map(e => normalize(e.name)));
                        const visibleExtraIds = sectionDoc.extras
                            .filter(e => originalNames.has(normalize(e.name)))
                            .map(e => e._id);

                        // Si el producto tenía TODOS los extras de la sección, visibleExtraIds = [] (mostrar todos)
                        const showAll = visibleExtraIds.length >= sectionDoc.extras.length;

                        return {
                            section: sectionId,
                            maxSelection: s.maxSelection ?? null, // conservar límite original del producto
                            visibleExtraIds: showAll ? [] : visibleExtraIds,
                        };
                    })
                    .filter(Boolean);

                await foodModel.updateOne(
                    { _id: food._id },
                    { $set: { extraSections: assignments } }
                );

                // Log informativo con detalle de visibilidad
                const detail = assignments.map(a => {
                    const doc = Object.values(createdSectionDocs).find(d => d._id.equals(a.section));
                    const visible = a.visibleExtraIds.length === 0
                        ? 'todos'
                        : `${a.visibleExtraIds.length}/${doc?.extras?.length || '?'} extras`;
                    return `${doc?.sectionName || a.section} (${visible})`;
                }).join(', ');
                console.log(`  📝 "${food.title}": ${detail}`);
            }
        }

        console.log('\n✅ Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

migrate();
