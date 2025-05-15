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
      in={true}
      timeout={300}
      classNames="fade"
      unmountOnExit
    >
      <div ref={containerRef} className={`${containerClass}-container editing-mode`}>
        <div className={`${containerClass}-content`}>

          {/* Columna derecha - Listas apiladas verticalmente */}
          <div className={`${containerClass}-right-column`}>
            <div className={`${containerClass}-orders-list`}>
              {OrderListComponent && (
                <OrderListComponent 
                  orders={preparationOrders} 
                  {...listProps} 
                />
              )}
            </div>
            
            <div className={`${containerClass}-completed-orders`}>
              <CompletedOrdersList
                orders={completedOrders}
                {...completedListProps}
              />
            </div>
          </div>
          
          {/* Columna izquierda - Formulario */}
          <div className={`${containerClass}-left-column ${containerClass}-edit-order`}>
            <OrderFormComponent
              {...formProps}
            />
          </div>

          
        </div>
      </div>
    </CSSTransition>
  );
};

export default OrderDetailsBase;