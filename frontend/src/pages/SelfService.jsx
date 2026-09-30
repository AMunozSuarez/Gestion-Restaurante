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
import PaymentMethodStep from '../components/selfservice/PaymentMethodStep';
import PaymentInProgress from '../components/selfservice/PaymentInProgress';
import KioskDialog from '../components/selfservice/KioskDialog';
import {
  PAYMENT_POLL_MS,
  PAYMENT_TIMEOUT_MS,
  PAYMENT_RECOVERY_POLL_MS,
  PAYMENT_SESSION_STORAGE_KEY,
} from '../constants/selfService';

/**
 * Kiosco de autoservicio.
 *
 * Se monta sin <Layout> (ver App.js), igual que la pantalla de cocina: sin Header y sin
 * SocketOrderPrinter, porque el kiosco no imprime — el PC de caja recibe order:created por
 * socket e imprime la comanda como con cualquier otro pedido.
 *
 * Máquina de pantallas: attract → menu → configure → cart → name → [payment → paying] → confirm.
 *
 * Con pago remoto activo (POS Haulmer/TUU), el pedido NO se crea hasta que el POS aprueba
 * el cobro: `payment` elige crédito/débito (o "pagar en caja" si está permitido), `paying`
 * consulta el estado y, al aprobarse, se crea el pedido desde la sesión de pago del backend.
 */

const STEPS = {
  ATTRACT: 'attract',
  MENU: 'menu',
  CONFIGURE: 'configure',
  CART: 'cart',
  NAME: 'name',
  PAYMENT: 'payment',
  PAYING: 'paying',
  CONFIRM: 'confirm',
};

const ACTIVE_PAYMENT_STATUSES = ['pending', 'sent', 'processing'];

// Haulmer admite un cobro por minuto por terminal.
const DEVICE_COOLDOWN_MS = 60 * 1000;

// localStorage puede fallar (modo privado, almacenamiento bloqueado): la recuperación usa
// además GET /payment/pending, así que perder esta clave no pierde pagos.
const readStoredPaymentId = () => {
  try { return window.localStorage.getItem(PAYMENT_SESSION_STORAGE_KEY); } catch (_) { return null; }
};
const storePaymentId = (id) => {
  try { window.localStorage.setItem(PAYMENT_SESSION_STORAGE_KEY, String(id)); } catch (_) { /* sin almacenamiento */ }
};
const clearStoredPaymentId = () => {
  try { window.localStorage.removeItem(PAYMENT_SESSION_STORAGE_KEY); } catch (_) { /* sin almacenamiento */ }
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
  const [submittingLabel, setSubmittingLabel] = useState('Enviando tu pedido…');
  const [dialog, setDialog] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [confirmedName, setConfirmedName] = useState('');
  const [confirmedPaid, setConfirmedPaid] = useState(false);

  // Pago remoto
  const [pendingCustomer, setPendingCustomer] = useState({ customerName: '', comment: '' });
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentCooldownUntil, setPaymentCooldownUntil] = useState(null);
  const [isPaymentTimedOut, setIsPaymentTimedOut] = useState(false);
  // Sesión que la pantalla sigue ahora: descarta respuestas de polls de una sesión abandonada.
  const activePaymentIdRef = useRef(null);
  const finalizingIdRef = useRef(null);

  const { products, categories, settings, refreshMenu, remotePayment } = menuState;
  const { revalidateAgainstProducts } = cart;

  // Solo el dueño puede salir del kiosco; para el usuario `kiosco` la ruta es la única
  // permitida, así que el botón no tendría sentido.
  const canExitKiosk = user?.role !== 'kiosco';

  // El flag del frontend es solo para la experiencia: el backend vuelve a validarlo en cada
  // POST, así que un kiosco con la pestaña abierta no puede seguir pidiendo si se apaga.
  const selfServiceEnabled = Boolean(restaurant?.settings?.selfService?.enabled);

  // No borra el id del cobro guardado: si el cliente abandona con un cobro vivo en el POS y
  // éste se aprueba después, la recuperación crea el pedido igual (nunca un pago sin pedido).
  const resetToAttract = useCallback(() => {
    cart.resetCart();
    setConfiguring(null);
    setConfirmedOrder(null);
    setConfirmedName('');
    setConfirmedPaid(false);
    setPendingCustomer({ customerName: '', comment: '' });
    setPaymentSession(null);
    activePaymentIdRef.current = null;
    setDialog(null);
    setStep(STEPS.ATTRACT);
  }, [cart]);

  // El aviso de inactividad no corre en atracción (no hay nada que perder), en la
  // confirmación (esa pantalla tiene su propio temporizador) ni mientras se paga en el POS.
  const idleEnabled = ![STEPS.ATTRACT, STEPS.CONFIRM, STEPS.PAYING].includes(step) && !isSubmitting;
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

  /**
   * Errores comunes a crear el pedido y a iniciar el cobro (ambos validan el carrito con
   * las mismas reglas). `retry` repite la operación original.
   */
  const handleOrderError = useCallback((result, retry) => {
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
          { label: 'Reintentar', onClick: () => { setDialog(null); retry(); } },
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
        { label: 'Reintentar', onClick: () => { setDialog(null); retry(); } },
        { label: 'Cancelar pedido', variant: 'secondary', onClick: resetToAttract },
      ],
    });
  }, [cart, refreshMenu, resetToAttract]);

  // Pedido "paga en caja" (sin pago remoto, o si el restaurante lo permite como alternativa).
  const submitOrder = useCallback(async ({ customerName, comment }) => {
    setSubmittingLabel('Enviando tu pedido…');
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
      setConfirmedPaid(false);
      cart.resetCart();
      setStep(STEPS.CONFIRM);
      return;
    }

    if (result.code === 'PAYMENT_REQUIRED') {
      setDialog({
        title: 'Debes pagar con tarjeta',
        message: 'Este kiosco solo acepta pedidos pagados con tarjeta.',
        actions: [{ label: 'Entendido', onClick: () => { setDialog(null); setStep(STEPS.PAYMENT); } }],
      });
      return;
    }

    handleOrderError(result, () => submitOrder({ customerName, comment }));
  }, [cart, handleOrderError]);

  /**
   * Crea el pedido de un cobro aprobado. El backend es idempotente (un segundo intento
   * devuelve el mismo pedido), así que se puede reintentar sin miedo a duplicar.
   * `silent`: recuperación en segundo plano, sin tocar la pantalla del cliente actual.
   */
  const finalizePaidOrder = useCallback(async (session, { silent = false } = {}) => {
    if (!session?._id || finalizingIdRef.current === String(session._id)) return false;
    finalizingIdRef.current = String(session._id);

    const result = await selfServiceService.createPaidOrder(session._id);
    finalizingIdRef.current = null;

    if (result.ok) {
      if (readStoredPaymentId() === String(session._id)) clearStoredPaymentId();
      if (silent) return true;

      activePaymentIdRef.current = null;
      setPaymentSession(null);
      setConfirmedOrder(result.data.order);
      setConfirmedName(session.customerName || '');
      setConfirmedPaid(true);
      cart.resetCart();
      setStep(STEPS.CONFIRM);
      return true;
    }

    if (silent) return false;

    // Otro intento ya está creando el pedido (doble toque / recuperación): se espera y reintenta.
    if (result.code === 'PAYMENT_FINALIZING') {
      setTimeout(() => finalizePaidOrder(session), 2000);
      return false;
    }

    // Pagó pero el pedido no se pudo crear (p. ej. se cerró la caja entre medio). El cobro
    // sigue guardado y se reintenta solo en cada vuelta a la pantalla de inicio.
    setDialog({
      title: 'Tu pago fue aprobado',
      message: `Pero no pudimos registrar tu pedido${result.message ? ` (${result.message})` : ''}. Avisa al personal. No vuelvas a pagar.`,
      actions: [
        { label: 'Reintentar', onClick: () => { setDialog(null); finalizePaidOrder(session); } },
        { label: 'Entendido', variant: 'secondary', onClick: resetToAttract },
      ],
    });
    return false;
  }, [cart, resetToAttract]);

  // Envía el cobro al POS del kiosco. El backend valida el carrito y calcula el total antes.
  const startPayment = useCallback(async (paymentMethod) => {
    setSubmittingLabel('Conectando con el lector de tarjetas…');
    setIsSubmitting(true);

    const result = await selfServiceService.createPayment({
      foods: cart.buildOrderFoods(),
      customerName: pendingCustomer.customerName,
      comment: pendingCustomer.comment,
      paymentMethod,
    });

    setIsSubmitting(false);

    if (result.ok) {
      const session = result.data.session;
      storePaymentId(session._id);
      activePaymentIdRef.current = String(session._id);
      setPaymentSession(session);
      setIsPaymentTimedOut(false);
      setStep(STEPS.PAYING);
      return;
    }

    if (result.status === 429) {
      setPaymentCooldownUntil(Date.now() + (result.retryAfterSeconds || 60) * 1000);
      return;
    }

    if (['REMOTE_PAYMENT_NOT_CONFIGURED', 'REMOTE_PAYMENT_DISABLED'].includes(result.code) || result.status === 502) {
      const actions = [];
      if (result.status === 502) {
        actions.push({ label: 'Intentar de nuevo', onClick: () => setDialog(null) });
      }
      if (remotePayment.allowPayAtCounter) {
        actions.push({ label: 'Pagar en caja', variant: 'secondary', onClick: () => { setDialog(null); submitOrder(pendingCustomer); } });
      }
      actions.push({ label: 'Cancelar pedido', variant: 'secondary', onClick: resetToAttract });

      setDialog({
        title: 'No pudimos iniciar el pago',
        message: result.message || 'El lector de tarjetas no está disponible.',
        actions,
      });
      return;
    }

    handleOrderError(result, () => startPayment(paymentMethod));
  }, [cart, pendingCustomer, remotePayment.allowPayAtCounter, submitOrder, handleOrderError, resetToAttract]);

  // Después del nombre/comentario: al pago (si hay pago remoto) o directo a crear el pedido.
  const proceedAfterCustomer = useCallback((customer) => {
    if (remotePayment.enabled) {
      setPendingCustomer(customer);
      setStep(STEPS.PAYMENT);
      return;
    }
    submitOrder(customer);
  }, [remotePayment.enabled, submitOrder]);

  const skipsCustomerStep = !settings.requireCustomerName && !settings.allowOrderComment;

  const handleCartConfirm = () => {
    // Si no se pide nombre ni se permiten comentarios, el paso intermedio no aporta nada.
    if (skipsCustomerStep) {
      proceedAfterCustomer({ customerName: '', comment: '' });
      return;
    }
    setStep(STEPS.NAME);
  };

  // Polling del cobro mientras el cliente está en el POS.
  const paymentId = paymentSession?._id;
  const paymentStatus = paymentSession?.status;
  useEffect(() => {
    if (step !== STEPS.PAYING || !paymentId || !ACTIVE_PAYMENT_STATUSES.includes(paymentStatus)) return undefined;

    const interval = setInterval(async () => {
      const result = await selfServiceService.getPayment(paymentId);
      if (!result.ok || activePaymentIdRef.current !== String(paymentId)) return;
      setPaymentSession(result.data.session);
    }, PAYMENT_POLL_MS);

    return () => clearInterval(interval);
  }, [step, paymentId, paymentStatus]);

  // `cart` cambia de identidad en cada render, y con él estas callbacks: los efectos las
  // leen de un ref para no re-ejecutarse (y re-llamar al backend) en cada render.
  const finalizePaidOrderRef = useRef(finalizePaidOrder);
  finalizePaidOrderRef.current = finalizePaidOrder;

  // Resultado del cobro: aprobado → crear el pedido; rechazado/cancelado → ya no hay nada
  // que recuperar, y el siguiente intento respeta el minuto de espera del POS. Se reacciona
  // una sola vez por transición (id + estado).
  const handledPaymentStateRef = useRef(null);
  useEffect(() => {
    if (step !== STEPS.PAYING || !paymentSession) return;

    const stateKey = `${paymentSession._id}:${paymentSession.status}`;
    if (handledPaymentStateRef.current === stateKey) return;
    handledPaymentStateRef.current = stateKey;

    if (paymentSession.status === 'completed') {
      finalizePaidOrderRef.current(paymentSession);
      return;
    }
    if (['canceled', 'failed'].includes(paymentSession.status)) {
      if (readStoredPaymentId() === String(paymentSession._id)) clearStoredPaymentId();
      const createdAt = new Date(paymentSession.createdAt).getTime();
      if (createdAt) setPaymentCooldownUntil(createdAt + DEVICE_COOLDOWN_MS);
    }
  }, [step, paymentSession]);

  /**
   * Pasado PAYMENT_TIMEOUT_MS sin resolverse, solo se avisa. El kiosco NO vuelve solo al
   * inicio ni el cliente puede cancelar desde acá: Haulmer no expone una API para cancelar
   * el cobro, así que la única salida real es cancelarlo en el propio lector. La pantalla
   * se queda esperando indefinidamente hasta que el POS resuelva el cobro (aprobado,
   * rechazado o cancelado ahí).
   */
  useEffect(() => {
    if (step !== STEPS.PAYING || !paymentId || !ACTIVE_PAYMENT_STATUSES.includes(paymentStatus)) {
      setIsPaymentTimedOut(false);
      return undefined;
    }
    const warnTimeout = setTimeout(() => setIsPaymentTimedOut(true), PAYMENT_TIMEOUT_MS);
    return () => {
      clearTimeout(warnTimeout);
      setIsPaymentTimedOut(false);
    };
  }, [step, paymentId, paymentStatus]);

  /**
   * Recuperación de cobros: crea el pedido de pagos aprobados que quedaron sin pedido (tablet
   * reiniciada, cliente que se fue, caja cerrada al finalizar). Con `resume`, además retoma en
   * pantalla el cobro que esta tablet tenía abierto.
   */
  const recoverPayments = useCallback(async ({ resume = false } = {}) => {
    const result = await selfServiceService.getPendingPayments();
    if (!result.ok) return;

    const storedId = readStoredPaymentId();
    const sessions = result.data.sessions || [];

    for (const session of sessions) {
      const isStored = String(session._id) === storedId;

      if (['completed', 'finalizing'].includes(session.status)) {
        await finalizePaidOrderRef.current(session, { silent: !(resume && isStored) });
      } else if (resume && isStored && ACTIVE_PAYMENT_STATUSES.includes(session.status)) {
        activePaymentIdRef.current = String(session._id);
        setPaymentSession(session);
        setStep(STEPS.PAYING);
      }
    }

    if (storedId && !sessions.some((session) => String(session._id) === storedId)) {
      clearStoredPaymentId();
    }
  }, []);

  // La primera vez que se sabe que hay pago remoto se retoma lo que la tablet tenía abierto
  // (recién reiniciada, nadie la está usando todavía).
  const hasRecoveredRef = useRef(false);
  useEffect(() => {
    if (!remotePayment.enabled || hasRecoveredRef.current) return;
    hasRecoveredRef.current = true;
    recoverPayments({ resume: true });
  }, [remotePayment.enabled, recoverPayments]);

  /**
   * Mientras el kiosco está en la pantalla de inicio, revisa cada PAYMENT_RECOVERY_POLL_MS si
   * algún cobro que quedó pendiente (por el auto-retorno de arriba, o porque el cliente se
   * fue) ya se aprobó, y crea su pedido en segundo plano. Nunca hace `resume` a la pantalla
   * de pago: un cliente nuevo que llega no debe heredar el cobro de otro.
   */
  useEffect(() => {
    if (!remotePayment.enabled || step !== STEPS.ATTRACT) return undefined;
    recoverPayments();
    const interval = setInterval(recoverPayments, PAYMENT_RECOVERY_POLL_MS);
    return () => clearInterval(interval);
  }, [remotePayment.enabled, step, recoverPayments]);

  const continueLabel = remotePayment.enabled ? 'Continuar al pago' : 'Confirmar pedido';

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
          confirmLabel={skipsCustomerStep ? continueLabel : 'Continuar'}
        />
      )}

      {step === STEPS.NAME && (
        <CustomerNameStep
          requireCustomerName={settings.requireCustomerName}
          allowOrderComment={settings.allowOrderComment}
          isSubmitting={isSubmitting}
          onBack={() => setStep(STEPS.CART)}
          onConfirm={proceedAfterCustomer}
          confirmLabel={continueLabel}
        />
      )}

      {step === STEPS.PAYMENT && (
        <PaymentMethodStep
          total={cart.total}
          cardAvailable={remotePayment.ready}
          allowPayAtCounter={remotePayment.allowPayAtCounter}
          cooldownUntil={paymentCooldownUntil}
          isSubmitting={isSubmitting}
          onSelectCard={startPayment}
          onPayAtCounter={() => submitOrder(pendingCustomer)}
          onBack={() => setStep(skipsCustomerStep ? STEPS.CART : STEPS.NAME)}
        />
      )}

      {step === STEPS.PAYING && (
        <PaymentInProgress
          session={paymentSession}
          isTimedOut={isPaymentTimedOut}
          allowPayAtCounter={remotePayment.allowPayAtCounter}
          onRetry={() => {
            activePaymentIdRef.current = null;
            setPaymentSession(null);
            setStep(STEPS.PAYMENT);
          }}
          onPayAtCounter={() => submitOrder(pendingCustomer)}
          onDismiss={resetToAttract}
        />
      )}

      {step === STEPS.CONFIRM && (
        <OrderConfirmation
          order={confirmedOrder}
          customerName={confirmedName}
          paid={confirmedPaid}
          onDone={resetToAttract}
        />
      )}

      {/* Overlay de envío: bloqueante y no cancelable, para que un doble toque no genere
          dos pedidos (o dos cobros). */}
      {isSubmitting && (
        <div className="fixed inset-0 z-40 bg-black/50 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-white mb-6" />
          <p className="text-3xl font-semibold text-white">{submittingLabel}</p>
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
