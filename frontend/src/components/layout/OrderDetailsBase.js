import React, { useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import CompletedOrdersList from '../lists/completedOrdersList';

const OrderDetailsBase = ({
  // Propiedades comunes
  editingOrder,
  containerClass,
  
  // Componentes específicos a renderizar
  OrderFormComponent,
  OrderListComponent = null,
  
  // Datos para pasar a los componentes
  formProps,
  listProps,
  completedListProps,
  
  // Clasificación de pedidos
  preparationOrders,
  completedOrders
}) => {
  const containerRef = useRef(null);

  return (
    <CSSTransition
      in={!!editingOrder}
      timeout={300}
      classNames="fade"
      unmountOnExit
      nodeRef={containerRef}
    >
      <div ref={containerRef} className={`${containerClass}-container editing-mode`}>
        <div className={`${containerClass}-content`}>
          <div className={`${containerClass}-orders-list`}>
            {OrderListComponent && (
              <OrderListComponent 
                orders={preparationOrders} 
                {...listProps} 
              />
            )}
          </div>
          <div className={`${containerClass}-edit-order`}>
            {editingOrder ? (
              <OrderFormComponent
                {...formProps}
              />
            ) : (
              <p>Selecciona un pedido para ver los detalles.</p>
            )}
          </div>
        </div>
        <div className={`${containerClass}-completed-orders`}>
          <CompletedOrdersList
            orders={completedOrders}
            {...completedListProps}
          />
        </div>
      </div>
    </CSSTransition>
  );
};

export default OrderDetailsBase;