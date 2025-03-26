import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/productos.css';

const Productos = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        imageUrl: '',
        category: '',
        isAvailable: true
    });
    const [editingId, setEditingId] = useState(null);
    const [filteredProductos, setFilteredProductos] = useState([]); // Productos filtrados
    const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda
    const [selectedCategory, setSelectedCategory] = useState(''); // Categoría seleccionada para filtrar

    useEffect(() => {
        fetchProductos();
        fetchCategorias();
    }, []);

    useEffect(() => {
        filterProductos();
    }, [productos, searchTerm, selectedCategory]);

    // Obtener todos los productos
    const fetchProductos = async () => {
        try {
            const response = await axios.get('/food/getAll'); // Ruta correcta
            setProductos(response.data.foods);
        } catch (error) {
            console.error('Error al obtener los productos:', error.response?.data || error.message);
        }
    };

    // Obtener todas las categorías
    const fetchCategorias = async () => {
        try {
            const response = await axios.get('/category/getAll'); // Ruta correcta
            setCategorias(response.data.categories);
        } catch (error) {
            console.error('Error al obtener las categorías:', error.response?.data || error.message);
        }
    };

    // Manejar cambios en los campos del formulario
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Crear o actualizar un producto
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await axios.put(`/food/update/${editingId}`, formData); // Ruta correcta
                console.log('Producto actualizado:', formData);
            } else {
                await axios.post('/food/create', formData); // Ruta correcta
                console.log('Producto creado:', formData);
            }
            setFormData({
                title: '',
                description: '',
                price: '',
                imageUrl: '',
                category: '',
                isAvailable: true
            });
            setEditingId(null);
            fetchProductos();
        } catch (error) {
            console.error('Error al guardar el producto:', error.response?.data || error.message);
        }
    };

    // Editar un producto
    const handleEdit = (producto) => {
        setFormData({
            title: producto.title,
            description: producto.description,
            price: producto.price,
            imageUrl: producto.imageUrl,
            category: producto.category,
            isAvailable: producto.isAvailable
        });
        setEditingId(producto._id);
    };

    // Cancelar edición
    const handleCancelEdit = () => {
        setFormData({
            title: '',
            description: '',
            price: '',
            imageUrl: '',
            category: '',
            isAvailable: true
        });
        setEditingId(null);
    };

    // Eliminar un producto
    const handleDelete = async (id) => {
        try {
            await axios.delete(`/food/delete/${id}`); // Ruta correcta
            console.log('Producto eliminado:', id);
            fetchProductos();
        } catch (error) {
            console.error('Error al eliminar el producto:', error.response?.data || error.message);
        }
    };

    // Filtrar productos por categoría o búsqueda
    const filterProductos = () => {
        let filtered = productos;

        if (selectedCategory) {
            filtered = filtered.filter(
                (producto) => producto.category?._id === selectedCategory
            );
        }

        if (searchTerm) {
            filtered = filtered.filter((producto) =>
                producto.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredProductos(filtered);
    };

    return (
        <div>
            <h1 className="productos-title">Gestión de Productos</h1>
            <div className="productos-container">
                <div className="productos-sidebar">
                    <h3>Categorías</h3>
                    <ul className="categorias-list">
                        <li
                            className={`categorias-item ${
                                selectedCategory === '' ? 'active' : ''
                            }`}
                            onClick={() => setSelectedCategory('')}
                        >
                            Todas
                        </li>
                        {categorias.map((categoria) => (
                            <li
                                key={categoria._id}
                                className={`categorias-item ${
                                    selectedCategory === categoria._id ? 'active' : ''
                                }`}
                                onClick={() => setSelectedCategory(categoria._id)}
                            >
                                {categoria.title}
                            </li>
                        ))}
                    </ul>
                </div>
    
                {/* Contenedor principal de productos */}
                <div className="productos-main">
                    <input
                        type="text"
                        className="productos-search"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <table className="productos-table">
                        <thead className="productos-table-head">
                            <tr>
                                <th>Título</th>
                                <th>Descripción</th>
                                <th>Precio</th>
                                <th>Categoría</th>
                                <th>Disponible</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="productos-table-body">
                            {filteredProductos.map((producto) => (
                                <tr key={producto._id} className="productos-table-row">
                                    <td className="productos-table-cell">{producto.title}</td>
                                    <td className="productos-table-cell">{producto.description}</td>
                                    <td className="productos-table-cell">${producto.price}</td>
                                    <td className="productos-table-cell">
                                        {producto.category?.title || 'Sin categoría'}
                                    </td>
                                    <td className="productos-table-cell">
                                        {producto.isAvailable ? 'Sí' : 'No'}
                                    </td>
                                    <td className="productos-table-cell">
                                        <button
                                            className="productos-edit-button"
                                            onClick={() => handleEdit(producto)}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            className="productos-delete-button"
                                            onClick={() => handleDelete(producto._id)}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
    
                {/* Contenedor del formulario de creación/edición */}
                <div
                    className={`productos-form-container ${
                        editingId ? 'editing' : 'creating'
                    }`}
                >
                    <form className="productos-form" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            name="title"
                            className="productos-input"
                            placeholder="Título"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                        />
                        <textarea
                            name="description"
                            className="productos-textarea"
                            placeholder="Descripción"
                            value={formData.description}
                            onChange={handleInputChange}
                        ></textarea>
                        <input
                            type="number"
                            name="price"
                            className="productos-input"
                            placeholder="Precio"
                            value={formData.price}
                            onChange={handleInputChange}
                            required
                        />
                        <input
                            type="text"
                            name="imageUrl"
                            className="productos-input"
                            placeholder="URL de la imagen"
                            value={formData.imageUrl}
                            onChange={handleInputChange}
                        />
                        <select
                            name="category"
                            className="productos-select"
                            value={formData.category}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="">Seleccionar categoría</option>
                            {categorias.map((categoria) => (
                                <option key={categoria._id} value={categoria._id}>
                                    {categoria.title}
                                </option>
                            ))}
                        </select>
                        <label>
                            <input
                                type="checkbox"
                                name="isAvailable"
                                checked={formData.isAvailable}
                                onChange={(e) =>
                                    setFormData({ ...formData, isAvailable: e.target.checked })
                                }
                            />
                            Disponible
                        </label>
                        <div className="form-buttons">
                            <button type="submit" className="productos-button">
                                {editingId ? 'Actualizar' : 'Crear'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    className="productos-cancel-button"
                                    onClick={handleCancelEdit}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Productos;