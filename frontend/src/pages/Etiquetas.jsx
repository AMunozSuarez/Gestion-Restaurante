import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  BookmarkIcon,
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Button, Card, Badge } from '../components/ui';
import TagFormModal from '../components/common/TagFormModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import useTagsManagement from '../hooks/useTagsManagement';

const Etiquetas = () => {
  const navigate = useNavigate();
  const {
    tags,
    isLoading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    createTag,
    updateTag,
    deleteTag,
    toggleTagActive,
    refreshTags
  } = useTagsManagement();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState(null);

  const [showToggleModal, setShowToggleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);

  const filteredTags = useMemo(() => {
    let filtered = tags;

    if (searchTerm) {
      filtered = filtered.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tag =>
        statusFilter === 'active' ? tag.isActive : !tag.isActive
      );
    }

    return filtered;
  }, [tags, searchTerm, statusFilter]);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateTag = () => {
    setEditingTag(null);
    setShowFormModal(true);
  };

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (tagData) => {
    try {
      let result;
      if (editingTag) {
        result = await updateTag(editingTag.id, tagData);
      } else {
        result = await createTag(tagData);
      }

      if (result.success) {
        setShowFormModal(false);
        setEditingTag(null);
        showNotification(
          editingTag
            ? '✅ Etiqueta actualizada exitosamente'
            : '✅ Etiqueta creada exitosamente',
          'success'
        );
      } else {
        showNotification(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    }
  };

  const handleToggleActive = (tag) => {
    setSelectedTag(tag);
    setShowToggleModal(true);
  };

  const confirmToggleActive = async () => {
    if (!selectedTag) return;

    try {
      const result = await toggleTagActive(selectedTag.id, !selectedTag.isActive);
      if (result.success) {
        showNotification(
          selectedTag.isActive
            ? '✅ Etiqueta desactivada exitosamente'
            : '✅ Etiqueta activada exitosamente',
          'success'
        );
      } else {
        showNotification(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
      setShowToggleModal(false);
      setSelectedTag(null);
    }
  };

  const handleDeleteTag = (tag) => {
    setSelectedTag(tag);
    setShowDeleteModal(true);
  };

  const confirmDeleteTag = async () => {
    if (!selectedTag) return;

    try {
      const result = await deleteTag(selectedTag.id);
      if (result.success) {
        showNotification('✅ Etiqueta eliminada exitosamente', 'success');
      } else {
        showNotification(`❌ ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`❌ Error: ${error.message}`, 'error');
    } finally {
      setShowDeleteModal(false);
      setSelectedTag(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Volver a Configuración */}
          <button
            onClick={() => navigate('/configuracion?tab=preferencias')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Volver a Configuración
          </button>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkIcon className="w-8 h-8 text-brown-900" />
              <div>
                <h1 className="text-2xl font-bold text-brown-900">Etiquetas</h1>
                <p className="text-sm text-gray-500">
                  Úsalas para marcar mesas y ventas y llevar el control por separado (empresas, eventos, promociones o cualquier categoría que definas).
                </p>
              </div>
            </div>
            <Button onClick={handleCreateTag}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Nueva Etiqueta
            </Button>
          </div>

          {/* Notificación */}
          {notification && (
            <div className={`p-4 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {notification.message}
            </div>
          )}

          {/* Filtros */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar etiquetas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">Todas las etiquetas</option>
                  <option value="active">Solo activas</option>
                  <option value="inactive">Solo inactivas</option>
                </select>

                <Button
                  variant="outline"
                  onClick={refreshTags}
                  disabled={isLoading}
                >
                  {isLoading ? 'Cargando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Error */}
          {error && (
            <Card className="p-4 bg-red-50 border border-red-200">
              <div className="text-red-800">
                ❌ Error: {error}
              </div>
            </Card>
          )}

          {/* Lista de etiquetas */}
          {isLoading ? (
            <Card className="p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando etiquetas...</p>
              </div>
            </Card>
          ) : filteredTags.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                {searchTerm || statusFilter !== 'all' ? (
                  <>
                    <BookmarkIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">No se encontraron etiquetas</h3>
                    <p className="mb-4">No hay etiquetas que coincidan con los filtros aplicados.</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <BookmarkIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">No hay etiquetas</h3>
                    <p className="mb-4">Crea tu primera etiqueta para poder marcarla al abrir una mesa.</p>
                    <Button onClick={handleCreateTag}>
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Crear Primera Etiqueta
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTags.map((tag) => (
                <Card key={tag.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <h3 className="text-lg font-semibold text-brown-900">
                          {tag.name}
                        </h3>
                        <Badge
                          variant={tag.isActive ? 'success' : 'error'}
                          size="sm"
                        >
                          {tag.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <p>Creada: {formatDate(tag.createdAt)}</p>
                    {tag.updatedAt !== tag.createdAt && (
                      <p>Actualizada: {formatDate(tag.updatedAt)}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTag(tag)}
                      disabled={isUpdating}
                    >
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(tag)}
                      className={tag.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}
                    >
                      {tag.isActive ? (
                        <>
                          <EyeSlashIcon className="w-4 h-4 mr-1" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTag(tag)}
                      disabled={isDeleting}
                      className="text-red-600 hover:bg-red-50"
                      title="Eliminar etiqueta"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal de formulario */}
        <TagFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setEditingTag(null);
          }}
          onSubmit={handleFormSubmit}
          tag={editingTag}
          isLoading={isCreating || isUpdating}
        />

        {/* Modal de confirmación para cambio de estado */}
        <ConfirmationModal
          isOpen={showToggleModal}
          onClose={() => {
            setShowToggleModal(false);
            setSelectedTag(null);
          }}
          onConfirm={confirmToggleActive}
          title={selectedTag?.isActive ? 'Desactivar Etiqueta' : 'Activar Etiqueta'}
          message={
            selectedTag?.isActive
              ? `¿Estás seguro de que quieres desactivar la etiqueta "${selectedTag?.name}"? Dejará de aparecer para elegirla en mesas nuevas, pero las ventas ya etiquetadas conservan el historial.`
              : `¿Estás seguro de que quieres activar la etiqueta "${selectedTag?.name}"?`
          }
          confirmText={selectedTag?.isActive ? 'Desactivar' : 'Activar'}
          type="warning"
          isLoading={isUpdating}
        />

        {/* Modal de confirmación para eliminación */}
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedTag(null);
          }}
          onConfirm={confirmDeleteTag}
          title="Eliminar Etiqueta"
          message={`¿Estás seguro de que quieres eliminar permanentemente la etiqueta "${selectedTag?.name}"?`}
          details={[
            'Esta acción no se puede deshacer',
            'Si la etiqueta ya tiene ventas asociadas no podrá eliminarse: desactívala en su lugar'
          ]}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default Etiquetas;
