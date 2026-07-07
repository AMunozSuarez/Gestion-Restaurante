import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  PaintBrushIcon,
  QrCodeIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import menuDigitalService from '../services/menuDigitalService';
import { categoriesService } from '../services/categoriesService';
import { resolveMediaUrl } from '../utils/mediaUrl';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const DAYS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const DEFAULT_SCHEDULE = DAYS.map((day) => ({ day: day.key, open: '09:00', close: '18:00', closed: false }));

const TABS = ['configuracion', 'apariencia', 'qr', 'publico', 'estadisticas'];

const MenuDigital = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getValidTab = (tabValue) => (TABS.includes(tabValue) ? tabValue : null);
  const getTabFromSearch = (search) => getValidTab(new URLSearchParams(search).get('tab'));

  const [activeTab, setActiveTab] = useState(() => getTabFromSearch(location.search) || 'configuracion');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [publicMenuSlug, setPublicMenuSlug] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [digitalMenu, setDigitalMenu] = useState({
    enabled: false,
    description: '',
    logoUrl: '',
    bannerUrl: '',
    showLogo: true,
    whatsapp: '',
    socialLinks: { instagram: '', facebook: '', whatsapp: '' },
    schedule: DEFAULT_SCHEDULE,
    appearance: { primaryColor: '#78350f', secondaryColor: '#f59e0b', buttonColor: '#16a34a', textColor: '#1f2937' },
    seo: { title: '', description: '' },
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [qrData, setQrData] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isOwnerOrAdmin = user && (user.role === 'owner' || user.role === 'super_admin');

  useEffect(() => {
    const requestedTab = getTabFromSearch(location.search);
    if (!requestedTab) return;
    setActiveTab((prev) => (prev === requestedTab ? prev : requestedTab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    if (!isOwnerOrAdmin) return;

    if (activeTab === 'configuracion' || activeTab === 'apariencia') {
      loadSettings();
    } else if (activeTab === 'qr') {
      loadQr();
    } else if (activeTab === 'publico') {
      loadSettings();
      loadCategories();
    } else if (activeTab === 'estadisticas') {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isOwnerOrAdmin]);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/menu-digital?tab=${tab}`, { replace: true });
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await menuDigitalService.getSettings();
      if (response.success) {
        const data = response.data;
        setPublicMenuSlug(data.publicMenuSlug || '');
        setRestaurantName(data.name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setDigitalMenu((prev) => ({
          ...prev,
          ...data.digitalMenu,
          socialLinks: { ...prev.socialLinks, ...(data.digitalMenu?.socialLinks || {}) },
          appearance: { ...prev.appearance, ...(data.digitalMenu?.appearance || {}) },
          seo: { ...prev.seo, ...(data.digitalMenu?.seo || {}) },
          schedule: data.digitalMenu?.schedule?.length ? data.digitalMenu.schedule : DEFAULT_SCHEDULE,
        }));
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al cargar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const persistSettings = async (partial) => {
    setSaving(true);
    try {
      const response = await menuDigitalService.updateSettings(partial);
      if (response.success) {
        const data = response.data?.settings?.digitalMenu || response.data?.digitalMenu;
        if (data) {
          setDigitalMenu((prev) => ({
            ...prev,
            ...data,
            socialLinks: { ...prev.socialLinks, ...(data.socialLinks || {}) },
            appearance: { ...prev.appearance, ...(data.appearance || {}) },
            seo: { ...prev.seo, ...(data.seo || {}) },
          }));
        }
        if (response.data?.publicMenuSlug) {
          setPublicMenuSlug(response.data.publicMenuSlug);
        }
        setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfiguracion = async () => {
    await persistSettings({
      enabled: digitalMenu.enabled,
      description: digitalMenu.description,
      whatsapp: digitalMenu.whatsapp,
      socialLinks: digitalMenu.socialLinks,
      schedule: digitalMenu.schedule,
    });
  };

  const handleSaveApariencia = async () => {
    await persistSettings({
      showLogo: digitalMenu.showLogo,
      logoUrl: digitalMenu.logoUrl,
      bannerUrl: digitalMenu.bannerUrl,
      appearance: digitalMenu.appearance,
    });
  };

  const handleScheduleChange = (dayKey, field, value) => {
    setDigitalMenu((prev) => ({
      ...prev,
      schedule: prev.schedule.map((entry) =>
        entry.day === dayKey ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const response = await menuDigitalService.uploadLogo(file);
      if (response.success) {
        setDigitalMenu((prev) => ({ ...prev, logoUrl: response.data.logoUrl }));
        setMessage({ type: 'success', text: 'Logo subido correctamente. No olvides guardar.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al subir el logo' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const response = await menuDigitalService.uploadBanner(file);
      if (response.success) {
        setDigitalMenu((prev) => ({ ...prev, bannerUrl: response.data.bannerUrl }));
        setMessage({ type: 'success', text: 'Banner subido correctamente. No olvides guardar.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al subir el banner' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const loadQr = async () => {
    setLoadingQr(true);
    try {
      const response = await menuDigitalService.getQrPngUrl();
      if (response.success) {
        setQrData(response.data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al generar el QR. Activa el menú digital primero.' });
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDownloadPng = () => {
    if (!qrData?.dataUrl) return;
    const a = document.createElement('a');
    a.href = qrData.dataUrl;
    a.download = 'menu-qr.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSvg = async () => {
    try {
      const svgString = await menuDigitalService.getQrSvg();
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'menu-qr.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al descargar el SVG' });
    }
  };

  const handlePrintQr = () => {
    if (!qrData?.dataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Imprimir QR</title></head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <img src="${qrData.dataUrl}" style="max-width:80%;" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await categoriesService.getCategories();
      if (response.success && response.categories) {
        const sorted = [...response.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(sorted);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al cargar categorías' });
    } finally {
      setLoadingCategories(false);
    }
  };

  const moveCategory = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= categories.length) return;
    const updated = [...categories];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setCategories(updated);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const items = categories.map((category, index) => ({ id: category._id, order: index }));
      await categoriesService.reorderCategories(items);
      setMessage({ type: 'success', text: 'Orden de categorías guardado' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar el orden' });
    } finally {
      setSavingOrder(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await menuDigitalService.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Error al cargar estadísticas' });
    } finally {
      setLoadingStats(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin visitas registradas';
    return new Date(dateString).toLocaleString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOwnerOrAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-cream-50">
        <div className="text-center p-6">
          <ExclamationTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-brown-700 font-medium">No tienes permiso para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-cream-50 flex flex-col gap-4 md:gap-6 p-3 md:p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex-1 overflow-y-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-brown-900 mb-2">Menú Digital</h1>
          <p className="text-brown-600">Configura y comparte la carta digital de tu restaurante</p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto">
            <button
              onClick={() => handleTabChange('configuracion')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'configuracion' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center"><Cog6ToothIcon className="w-5 h-5 mr-2" />Configuración</div>
            </button>
            <button
              onClick={() => handleTabChange('apariencia')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'apariencia' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center"><PaintBrushIcon className="w-5 h-5 mr-2" />Apariencia</div>
            </button>
            <button
              onClick={() => handleTabChange('qr')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'qr' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center"><QrCodeIcon className="w-5 h-5 mr-2" />QR</div>
            </button>
            <button
              onClick={() => handleTabChange('publico')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'publico' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center"><GlobeAltIcon className="w-5 h-5 mr-2" />Menú Público</div>
            </button>
            <button
              onClick={() => handleTabChange('estadisticas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${activeTab === 'estadisticas' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              <div className="flex items-center"><ChartBarIcon className="w-5 h-5 mr-2" />Estadísticas</div>
            </button>
          </nav>
        </div>

        {message.text && (
          <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            <div className="flex items-center">
              {message.type === 'success' && <CheckCircleIcon className="w-5 h-5 mr-2" />}
              {message.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5 mr-2" />}
              {message.type === 'info' && <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {activeTab === 'configuracion' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {loading ? (
              <p className="text-gray-500">Cargando configuración...</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brown-900">Activar Menú Digital</p>
                    <p className="text-sm text-gray-500">Habilita el acceso público a tu carta mediante QR o enlace.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(digitalMenu.enabled)}
                      onChange={(e) => setDigitalMenu((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Nombre del restaurante" value={restaurantName} disabled className="bg-gray-50" />
                  <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Input label="WhatsApp" value={digitalMenu.whatsapp} onChange={(e) => setDigitalMenu((prev) => ({ ...prev, whatsapp: e.target.value }))} placeholder="+56912345678" />
                  <Input label="Dirección" value={address} disabled className="bg-gray-50" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brown-700 mb-1">Descripción</label>
                  <textarea
                    value={digitalMenu.description}
                    onChange={(e) => setDigitalMenu((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Describe brevemente tu restaurante"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Instagram"
                    value={digitalMenu.socialLinks?.instagram || ''}
                    onChange={(e) => setDigitalMenu((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, instagram: e.target.value } }))}
                    placeholder="https://instagram.com/tu_restaurante"
                  />
                  <Input
                    label="Facebook"
                    value={digitalMenu.socialLinks?.facebook || ''}
                    onChange={(e) => setDigitalMenu((prev) => ({ ...prev, socialLinks: { ...prev.socialLinks, facebook: e.target.value } }))}
                    placeholder="https://facebook.com/tu_restaurante"
                  />
                </div>

                <div>
                  <h3 className="font-medium text-brown-900 mb-3">Horario de atención</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-2 pr-4">Día</th>
                          <th className="py-2 pr-4">Cerrado</th>
                          <th className="py-2 pr-4">Apertura</th>
                          <th className="py-2 pr-4">Cierre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAYS.map(({ key, label }) => {
                          const entry = digitalMenu.schedule.find((s) => s.day === key) || { open: '09:00', close: '18:00', closed: false };
                          return (
                            <tr key={key} className="border-t border-gray-100">
                              <td className="py-2 pr-4 font-medium text-gray-700">{label}</td>
                              <td className="py-2 pr-4">
                                <input
                                  type="checkbox"
                                  checked={Boolean(entry.closed)}
                                  onChange={(e) => handleScheduleChange(key, 'closed', e.target.checked)}
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <input
                                  type="time"
                                  value={entry.open}
                                  disabled={entry.closed}
                                  onChange={(e) => handleScheduleChange(key, 'open', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded-md disabled:bg-gray-100"
                                />
                              </td>
                              <td className="py-2 pr-4">
                                <input
                                  type="time"
                                  value={entry.close}
                                  disabled={entry.closed}
                                  onChange={(e) => handleScheduleChange(key, 'close', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 rounded-md disabled:bg-gray-100"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveConfiguracion} loading={saving}>Guardar</Button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'apariencia' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {loading ? (
              <p className="text-gray-500">Cargando configuración...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'primaryColor', label: 'Color primario' },
                    { key: 'secondaryColor', label: 'Color secundario' },
                    { key: 'buttonColor', label: 'Color de botones' },
                    { key: 'textColor', label: 'Color de texto' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-brown-700 mb-1">{label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={digitalMenu.appearance?.[key] || '#000000'}
                          onChange={(e) => setDigitalMenu((prev) => ({ ...prev, appearance: { ...prev.appearance, [key]: e.target.value } }))}
                          className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={digitalMenu.appearance?.[key] || ''}
                          onChange={(e) => setDigitalMenu((prev) => ({ ...prev, appearance: { ...prev.appearance, [key]: e.target.value } }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-brown-900">Mostrar logo</p>
                    <p className="text-sm text-gray-500">Muestra el logo circular sobre el banner en el menú público.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(digitalMenu.showLogo)}
                      onChange={(e) => setDigitalMenu((prev) => ({ ...prev, showLogo: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">Logo</label>
                    {digitalMenu.logoUrl && (
                      <img src={resolveMediaUrl(digitalMenu.logoUrl)} alt="Logo" className="w-24 h-24 rounded-full object-cover border border-gray-200 mb-2" />
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoChange} disabled={uploadingLogo} />
                    {uploadingLogo && <p className="text-sm text-gray-500 mt-1">Subiendo logo...</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brown-700 mb-2">Banner</label>
                    {digitalMenu.bannerUrl && (
                      <img src={resolveMediaUrl(digitalMenu.bannerUrl)} alt="Banner" className="w-full h-24 object-cover rounded-lg border border-gray-200 mb-2" />
                    )}
                    <input type="file" accept="image/*" onChange={handleBannerChange} disabled={uploadingBanner} />
                    {uploadingBanner && <p className="text-sm text-gray-500 mt-1">Subiendo banner...</p>}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveApariencia} loading={saving}>Guardar</Button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {loadingQr ? (
              <p className="text-gray-500">Generando código QR...</p>
            ) : qrData ? (
              <div className="flex flex-col items-center gap-4">
                <img src={qrData.dataUrl} alt="QR del menú" className="w-56 h-56 border border-gray-200 rounded-lg" />
                <a href={qrData.publicUrl} target="_blank" rel="noreferrer" className="text-sm text-green-600 underline break-all">
                  {qrData.publicUrl}
                </a>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button variant="outline" onClick={handleDownloadPng}>
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />Descargar PNG
                  </Button>
                  <Button variant="outline" onClick={handleDownloadSvg}>
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />Descargar SVG
                  </Button>
                  <Button variant="outline" onClick={handlePrintQr}>
                    <PrinterIcon className="w-4 h-4 mr-2" />Imprimir
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No se pudo generar el QR. Activa el menú digital en la pestaña Configuración primero.
              </p>
            )}
          </div>
        )}

        {activeTab === 'publico' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-medium text-brown-900">Orden de categorías en el menú público</h3>
              <Button onClick={handleSaveOrder} loading={savingOrder} size="sm">Guardar orden</Button>
            </div>

            {loadingCategories ? (
              <p className="text-gray-500">Cargando categorías...</p>
            ) : categories.length === 0 ? (
              <p className="text-gray-500">No hay categorías disponibles.</p>
            ) : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                {categories.map((category, index) => (
                  <li key={category._id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-800">{category.title}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveCategory(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                        aria-label="Subir"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveCategory(index, 1)}
                        disabled={index === categories.length - 1}
                        className="p-1.5 rounded-md border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                        aria-label="Bajar"
                      >
                        <ArrowDownIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2">
              {publicMenuSlug ? (
                <a
                  href={`${window.location.origin}/menu/${publicMenuSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 font-medium text-sm"
                >
                  <GlobeAltIcon className="w-4 h-4 mr-2" />
                  Ver menú público
                </a>
              ) : (
                <span title="Activa el menú digital primero para generar el enlace público">
                  <button disabled className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-400 font-medium text-sm cursor-not-allowed">
                    <GlobeAltIcon className="w-4 h-4 mr-2" />
                    Ver menú público
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'estadisticas' && (
          <div className="space-y-6">
            {loadingStats ? (
              <p className="text-gray-500">Cargando estadísticas...</p>
            ) : stats ? (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <p className="text-sm text-gray-500">Visitas totales</p>
                  <p className="text-3xl font-bold text-brown-900">{stats.totalVisits || 0}</p>
                  <p className="text-sm text-gray-400 mt-1">Última visita: {formatDate(stats.lastVisitAt)}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-medium text-brown-900 mb-3">Productos más vistos</h3>
                    {(stats.topProducts || []).length === 0 ? (
                      <p className="text-sm text-gray-500">Sin datos aún.</p>
                    ) : (
                      <ul className="space-y-2">
                        {stats.topProducts.map((item, index) => (
                          <li key={item.foodId || item.food || index} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.title || 'Producto eliminado'}</span>
                            <span className="text-gray-400">{item.views ?? item.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-medium text-brown-900 mb-3">Categorías más vistas</h3>
                    {(stats.topCategories || []).length === 0 ? (
                      <p className="text-sm text-gray-500">Sin datos aún.</p>
                    ) : (
                      <ul className="space-y-2">
                        {stats.topCategories.map((item, index) => (
                          <li key={item.categoryId || item.category || index} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.title || 'Categoría eliminada'}</span>
                            <span className="text-gray-400">{item.views ?? item.count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">No hay estadísticas disponibles.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuDigital;
