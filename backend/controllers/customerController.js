// La función createOrUpdate o similar
const createOrUpdate = async (req, res) => {
    try {
        const { phone, name, comment, addresses } = req.body;
        
        // Buscar si existe el cliente por teléfono
        let customer = await Customer.findOne({ phone });
        
        if (customer) {
            // Cliente existente - actualizar
            customer.name = name || customer.name;
            customer.comment = comment !== undefined ? comment : customer.comment;
            
            // Manejar direcciones
            if (addresses && Array.isArray(addresses)) {
                // Si el cliente no tiene direcciones, inicializamos el array
                if (!customer.addresses) customer.addresses = [];
                
                // Procesar cada dirección del request
                const updatedAddresses = [];
                
                // Registro de IDs que ya hemos procesado para evitar duplicados
                const processedIds = new Set();
                
                for (const newAddr of addresses) {
                    // Si tiene ID, buscar y actualizar
                    if (newAddr._id) {
                        const existingIndex = customer.addresses.findIndex(
                            addr => addr._id.toString() === newAddr._id.toString()
                        );
                        
                        if (existingIndex >= 0) {
                            // Actualizar dirección existente
                            customer.addresses[existingIndex].address = newAddr.address;
                            customer.addresses[existingIndex].deliveryCost = newAddr.deliveryCost;
                            updatedAddresses.push(customer.addresses[existingIndex]);
                            processedIds.add(newAddr._id.toString());
                        } else {
                            // ID no encontrado, agregar como nueva sin el ID antiguo
                            delete newAddr._id;  // Eliminar el ID antiguo que no existe
                            const newAddress = { address: newAddr.address, deliveryCost: newAddr.deliveryCost };
                            updatedAddresses.push(newAddress);
                        }
                    } else {
                        // Si no tiene ID, verificar si existe por texto
                        const existingAddr = customer.addresses.find(addr => addr.address === newAddr.address);
                        
                        if (existingAddr && !processedIds.has(existingAddr._id.toString())) {
                            // Actualizar dirección existente por texto
                            existingAddr.deliveryCost = newAddr.deliveryCost;
                            updatedAddresses.push(existingAddr);
                            processedIds.add(existingAddr._id.toString());
                        } else if (!existingAddr) {
                            // Nueva dirección
                            updatedAddresses.push(newAddr);
                        }
                    }
                }
                
                // Actualizar con las direcciones procesadas
                customer.addresses = updatedAddresses;
            }
            
            await customer.save();
            res.status(200).json({ success: true, customer });
        } else {
            // Cliente nuevo - crear
            customer = new Customer({
                phone,
                name,
                comment,
                addresses: addresses || []
            });
            
            await customer.save();
            res.status(201).json({ success: true, customer });
        }
    } catch (error) {
        console.error('Error al crear/actualizar cliente:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};