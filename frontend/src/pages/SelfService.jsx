import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurant } from '../hooks/useRestaurant';
import { useAuth } from '../hooks/useAuth';
import useSelfServiceMenu from '../hooks/useSelfServiceMenu';
import useSelfServiceCart from '../hooks/useSelfServiceCart';
import useIdleReset from '../hooks/useIdleReset';
import selfServiceService from '../services/selfServiceService';
import AttractScreen from '../components/selfservice/AttractScreen';
import MenuBrowser from '../components/selfservice/MenuBrowser';
import ProductConfigurator from '../components/selfservice/ProductConfigurator';
import CartReview from '../components/selfservice/CartReview';
import CustomerNameStep from '../components/selfservice/CustomerNameStep';
import OrderConfirmation from '../components/selfservice/OrderConfirmation';
import KioskDialog from '../components/selfservice/KioskDialog';

/**
 * Kiosco de autoservicio.
 *
 * Se monta sin <Layout> (ver App.js), igual que la pantalla de cocina: sin Header y sin
 * SocketOrderPrinter, porque el kiosco no imprime — el PC de caja recibe order:created por
 * socket e imprime la comanda como con cualquier otro pedido.
 *
 * Máquina de pantallas: attract → menu → configure → cart → name → confirm.
 */

const STEPS = {
  ATTRACT: 'attract',
  MENU: 'menu',
  CONFIGURE: 'configure',
  CART: 'cart',
  NAME: 'name',
  CONFIRM: 'confirm',
};

const SelfService = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurant();
  const menuState = useSelfServiceMenu();
  const cart = useSelfServiceCart();

  const [step, setStep] = useState(STEPS.ATTRACT);
  const [configuring, setConfiguring] = useState(null); // { product, line? }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [confirmedName, setConfirmedName] = useState('');

  const { products, categories, settings, refreshMenu } = menuState;
  const { revalidateAgainstProducts } = cart;

  // Solo el dueño puede salir del kiosco; para el usuario `kiosco` la ruta es la única
  // permitida, así que el botón no tendría sentido.
  const canExitKiosk = user?.role !== 'kiosco';

  // El flag del frontend es solo para la experiencia: el backend vuelve a validarlo en cada
  // POST, así que un kiosco con la pestaña abierta no puede seguir pidiendo si se apaga.
  const selfServiceEnabled = Boolean(restaurant?.settings?.selfService?.enabled);

  const resetToAttract = useCallback(() => {
    cart.resetCart();
    setConfiguring(null);
    setConfirmedOrder(null);
    setConfirmedName('');
    setDialog(null);
    setStep(STEPS.ATTRACT);
  }, [cart]);

  // El aviso de inactividad no corre en atracción (no hay nada que perder) ni en la
  // confirmación (esa pantalla tiene su propio temporizador).
  const idleEnabled = ![STEPS.ATTRACT, STEPS.CONFIRM].includes(step) && !isSubmitting;
  const { isWarning, stayActive } = useIdleReset({ enabled: idleEnabled, onTimeout: resetToAttract });

  // Cuando el catálogo se recarga (el dueño apagó algo), se marca en el carrito antes de
  // que el cliente confirme, en vez de esperar al 409.
  const previousMenuVersionRef = useRef(null);
  useEffect(() => {
    if (!menuState.menuVersion) return;
    if (previousMenuVersionRef.current === menuState.menuVersion) return;

    previousMenuVersionRef.current = menuState.menuVersion;
    revalidateAgainstProducts(products);
  }, [menuState.menuVersion, products, revalidateAgainstProducts]);

  const handleStart = () => {
    cart.resetCart();
    setStep(STEPS.MENU);
  };

  const handleSelectProduct = (product) => {
    if (product.extraSections && product.extraSections.length > 0) {
      setConfiguring({ product, line: null });
      setStep(STEPS.CONFIGURE);
      return;
    }
    cart.addLine(product, [], 1);
  };

  const handleEditLine = (line) => {
    const product = products.find((p) => String(p._id) === String(line.productId));
    if (!product) return;
    setConfiguring({ product, line });
    setStep(STEPS.CONFIGURE);
  };

  const handleConfiguratorConfirm = ({ selectedExtras, quantity }) => {
    if (configuring?.line) {
      cart.updateLine(configuring.line.id, { selectedExtras, quantity });
      setConfiguring(null);
      setStep(STEPS.CART);
      return;
    }

    cart.addLine(configuring.product, selectedExtras, quantity);
    setConfiguring(null);
    setStep(STEPS.MENU);
  };

  const submitOrder = useCallback(async ({ customerName, comment }) => {
    setIsSubmitting(true);

    const result = await selfServiceService.createOrder({
      foods: cart.buildOrderFoods(),
      customerName,
      comment,
    });

    setIsSubmitting(false);

    if (result.ok) {
      setConfirmedOrder(result.data.order);
      setConfirmedName(customerName || '');
      cart.resetCart();
      setStep(STEPS.CONFIRM);
      return;
    }

    // Productos retirados mientras el carrito estaba abierto: se nombran y se ofrece
    // quitarlos para continuar, que es lo que el cliente quiere hacer en el 99% de los casos.
    if (result.code === 'ITEMS_UNAVAILABLE') {
      cart.markUnavailable(result.unavailableItems.map((item) => item.foodId));
      refreshMenu({ silent: true });

      const names = result.unavailableItems.map((item) => item.title).filter(Boolean);
      setDialog({
        title: 'Algunos productos ya no están disponibles',
        message: names.length > 0
          ? `Ya no podemos preparar: ${names.join(', ')}.`
          : 'Uno de los productos de tu pedido ya no está disponible.',
        actions: [
          {
            label: 'Quitar y continuar',
            onClick: () => {
              cart.removeUnavailable();
              setDialog(null);
              setStep(STEPS.CART);
            },
          },
          { label: 'Volver al menú', variant: 'secondary', onClick: () => { setDialog(null); setStep(STEPS.MENU); } },
        ],
      });
      return;
    }

    if (result.code === 'NO_CASH_REGISTER') {
      setDialog({
        title: 'No podemos tomar tu pedido ahora',
        message: 'Por favor acércate al mostrador. Tu pedido se guardó por si quieres reintentar.',
        actions: [
          { label: 'Reintentar', onClick: () => { setDialog(null); submitOrder({ customerName, comment }); } },
          { label: 'Cancelar pedido', variant: 'secondary', onClick: resetToAttract },
        ],
      });
      return;
    }

    if (result.code === 'SELF_SERVICE_DISABLED') {
      setDialog({
        title: 'Autoservicio no disponible',
        message: 'Por favor realiza tu pedido en el mostrador.',
        actions: [{ label: 'Entendido', onClick: resetToAttract }],
      });
      return;
    }

    // Un 400 sin código conocido suele venir de la validación de extras: el menú cambió
    // bajo los pies del cliente. Se recarga y se le pide revisar el pedido.
    if (result.status === 400) {
      refreshMenu({ silent: true });
      setDialog({
        title: 'El menú cambió',
        message: 'Revisa tu pedido: alguna opción que elegiste ya no está disponible.',
        actions: [{ label: 'Revisar mi pedido', onClick: () => { setDialog(null); setStep(STEPS.CART); } }],
      });
      return;
    }

    setDialog({
      title: 'No pudimos enviar tu pedido',
      message: 'Por favor acércate al mostrador o inténtalo de nuevo.',
      actions: [
        { label: 'Reintentar', onClick: () => { setDialog(null); submitOrder({ customerName, comment }); } },
        { label: 'Cancelar pedido', variant: 'secondary', onClick: resetToAttract },
      ],
    });
  }, [cart, refreshMenu, resetToAttract]);

  const handleCartConfirm = () => {
    // Si no se pide nombre ni se permiten comentarios, el paso intermedio no aporta nada.
    if (!settings.requireCustomerName && !settings.allowOrderComment) {
      submitOrder({ customerName: '', comment: '' });
      return;
    }
    setStep(STEPS.NAME);
  };

  // Guarda por feature flag, mismo patrón que KitchenDisplay.
  if (!isRestaurantLoading && !selfServiceEnabled) {
    return (
      <div className="h-screen w-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Autoservicio no disponible</h1>
        <p className="text-xl text-gray-600 max-w-xl">
          El módulo de autoservicio no está habilitado para este restaurante.
        </p>
        {canExitKiosk && (
          <button
            type="button"
            onClick={() => navigate('/mostrador')}
            className="mt-8 px-6 py-3 rounded-xl bg-orange-600 text-white text-lg font-semibold"
          >
            Volver al punto de venta
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 select-none">
      {step === STEPS.ATTRACT && (
        <AttractScreen
          restaurantName={menuState.restaurantName}
          selfServiceEnabled={menuState.selfServiceEnabled}
          cashRegisterOpen={menuState.cashRegisterOpen}
          hasProducts={products.length > 0}
          isLoading={menuState.isLoading}
          error={menuState.error}
          onStart={handleStart}
        />
      )}

      {step === STEPS.MENU && (
        <MenuBrowser
          products={products}
          categories={categories}
          itemCount={cart.itemCount}
          total={cart.total}
          onSelectProduct={handleSelectProduct}
          onOpenCart={() => setStep(STEPS.CART)}
          onCancel={resetToAttract}
        />
      )}

      {step === STEPS.CONFIGURE && configuring && (
        <ProductConfigurator
          product={configuring.product}
          initialSelectedExtras={configuring.line?.selectedExtras || []}
          initialQuantity={configuring.line?.quantity || 1}
          isEditing={Boolean(configuring.line)}
          onCancel={() => {
            const target = configuring.line ? STEPS.CART : STEPS.MENU;
            setConfiguring(null);
            setStep(target);
          }}
          onConfirm={handleConfiguratorConfirm}
        />
      )}

      {step === STEPS.CART && (
        <CartReview
          lines={cart.lines}
          total={cart.total}
          isSubmitting={isSubmitting}
          onBack={() => setStep(STEPS.MENU)}
          onEditLine={handleEditLine}
          onChangeQuantity={cart.setLineQuantity}
          onRemoveLine={cart.removeLine}
          onConfirm={handleCartConfirm}
        />
      )}

      {step === STEPS.NAME && (
        <CustomerNameStep
          requireCustomerName={settings.requireCustomerName}
          allowOrderComment={settings.allowOrderComment}
          isSubmitting={isSubmitting}
          onBack={() => setStep(STEPS.CART)}
          onConfirm={submitOrder}
        />
      )}

      {step === STEPS.CONFIRM && (
        <OrderConfirmation
          order={confirmedOrder}
          customerName={confirmedName}
          onDone={resetToAttract}
        />
      )}

      {/* Overlay de envío: bloqueante y no cancelable, para que un doble toque no genere
          dos pedidos. */}
      {isSubmitting && (
        <div className="fixed inset-0 z-40 bg-black/50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-white mb-6" />
          <p className="text-3xl font-semibold text-white">Enviando tu pedido…</p>
        </div>
      )}

      {dialog && (
        <KioskDialog title={dialog.title} message={dialog.message} actions={dialog.actions} />
      )}

      {isWarning && !dialog && (
        <KioskDialog
          title="¿Sigues ahí?"
          message="Tu pedido se borrará en unos segundos."
          actions={[
            { label: 'Sí, continuar', onClick: stayActive },
            { label: 'Cancelar pedido', variant: 'secondary', onClick: resetToAttract },
          ]}
        />
      )}
    </div>
  );
};

export default SelfService;
