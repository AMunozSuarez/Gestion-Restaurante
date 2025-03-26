import React, { useState, useEffect } from 'react';
import axios from 'axios';

import '../../styles/admin/categorias.css';

const Categorias = () => {
    const [categorias, setCategorias] = useState([]);
    const [nuevaCategoria, setNuevaCategoria] = useState({ title: '', imageUrl: '' });
    const [editando, setEditando] = useState(null);
    const [categoriaEditada, setCategoriaEditada] = useState({ title: '', imageUrl: '' });

    // Obtener categorías al cargar el componente
    useEffect(() => {
        obtenerCategorias();
    }, []);

    // Función para obtener todas las categorías
    const obtenerCategorias = async () => {
        try {
            const response = await axios.get('/category/getAll'); // Ruta correcta
            console.log('Categorías obtenidas:', response.data); // Depuración
            setCategorias(response.data.categories);
        } catch (error) {
            console.error('Error al obtener las categorías:', error.response?.data || error.message);
        }
    };

    // Función para crear una nueva categoría
    const crearCategoria = async () => {
        if (!nuevaCategoria.title.trim()) {
            alert('El título de la categoría es obligatorio.');
            return;
        }

        // Crea una copia del objeto nuevaCategoria
        const categoriaParaEnviar = { ...nuevaCategoria };

        // Si el campo imageUrl está vacío, elimínalo del objeto
        if (!categoriaParaEnviar.imageUrl.trim()) {
            delete categoriaParaEnviar.imageUrl;
        }

        try {
            const response = await axios.post('/category/create', categoriaParaEnviar); // Ruta correcta
            console.log('Categoría creada:', response.data);
            setCategorias([...categorias, response.data.newCategory]);
            setNuevaCategoria({ title: '', imageUrl: '' });
        } catch (error) {
            console.error('Error al crear la categoría:', error.response?.data || error.message);
        }
    };

    // Función para eliminar una categoría
    const eliminarCategoria = async (id) => {
        try {
            await axios.delete(`/category/delete/${id}`); // Ruta correcta
            console.log('Categoría eliminada:', id);
            setCategorias(categorias.filter((categoria) => categoria._id !== id));
        } catch (error) {
            console.error('Error al eliminar la categoría:', error.response?.data || error.message);
        }
    };

    // Función para editar una categoría
    const editarCategoria = async (id) => {
        if (!categoriaEditada.title.trim()) {
            alert('El título de la categoría es obligatorio.');
            return;
        }
        try {
            const response = await axios.put(`/category/update/${id}`, categoriaEditada); // Ruta correcta
            console.log('Categoría actualizada:', response.data);
            setCategorias(
                categorias.map((categoria) =>
                    categoria._id === id ? { ...categoria, ...response.data.category } : categoria
                )
            );
            setEditando(null);
            setCategoriaEditada({ title: '', imageUrl: '' });
        } catch (error) {
            console.error('Error al editar la categoría:', error.response?.data || error.message);
        }
    };

    return (
        <div className="categorias-container">
            <h2 className="categorias-title">Gestión de Categorías</h2>
            <div className="categorias-crear">
                <input
                    type="text"
                    placeholder="Título de la categoría" // Texto gris para el campo de título
                    value={nuevaCategoria.title}
                    onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, title: e.target.value })}
                    className="categorias-input"
                />
                <input
                    type="text"
                    placeholder="URL de la imagen" // Texto gris para el campo de URL
                    value={nuevaCategoria.imageUrl}
                    onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, imageUrl: e.target.value })}
                    className="categorias-input"
                />
                <button onClick={crearCategoria} className="categorias-boton-crear">
                    Crear
                </button>
            </div>
            <ul className="categorias-lista">
                {categorias.map((categoria) => (
                    <li key={categoria._id} className="categorias-item">
                        {editando === categoria._id ? (
                            <div className="categorias-editar">
                                <input
                                    type="text"
                                    placeholder="Editar título" // Texto gris para el campo de edición de título
                                    value={categoriaEditada.title}
                                    onChange={(e) => setCategoriaEditada({ ...categoriaEditada, title: e.target.value })}
                                    className="categorias-input-editar"
                                />
                                <input
                                    type="text"
                                    placeholder="Editar URL de la imagen" // Texto gris para el campo de edición de URL
                                    value={categoriaEditada.imageUrl}
                                    onChange={(e) => setCategoriaEditada({ ...categoriaEditada, imageUrl: e.target.value })}
                                    className="categorias-input-editar"
                                />
                                <button onClick={() => editarCategoria(categoria._id)} className="categorias-boton-guardar">
                                    Guardar
                                </button>
                                <button onClick={() => setEditando(null)} className="categorias-boton-cancelar">
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <div className="categorias-detalle">
                                <span className="categorias-nombre">{categoria.title}</span>
                                {categoria.imageUrl && (
                                    <img src={categoria.imageUrl} alt={categoria.title} className="categorias-imagen" />
                                )}
                                <button onClick={() => setEditando(categoria._id)} className="categorias-boton-editar">
                                    Editar
                                </button>
                                <button onClick={() => eliminarCategoria(categoria._id)} className="categorias-boton-eliminar">
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Categorias;