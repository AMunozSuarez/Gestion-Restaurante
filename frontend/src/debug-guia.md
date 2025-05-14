# Guía de Depuración para Múltiples Renderizados en OrderFormDelivery

Esta guía explica cómo interpretar los logs de depuración añadidos al componente `OrderFormDelivery.js` para identificar y solucionar el problema de los múltiples renderizados.

## Qué buscar en los logs

### 1. Número de renderizados y su frecuencia

Observa los logs con el formato:
```
[DEBUG] OrderFormDelivery - Renderizado #X
```

Si el número crece rápidamente sin acciones del usuario, hay un problema de renderizado en bucle.

### 2. Cambios de props que desencadenan renderizados

Observa los logs:
```
[DEBUG] OrderFormDelivery - Props cambiados: [...]
[DEBUG] OrderFormDelivery - Prop X cambió de: valorAnterior a: valorNuevo
```

Identifica si hay props que cambian frecuentemente sin razón aparente.

### 3. Ejecución de efectos

Observa los logs:
```
[DEBUG] Effect #1 ejecutado - Reset address mode: {...}
[DEBUG] Effect #2 ejecutado - Datos de cliente para edición: {...}
```

Nota la frecuencia y el momento en que se ejecutan estos efectos.

### 4. Cambios de estado interno

Observa los logs:
```
[DEBUG] Estado selectedCustomer cambió: {...}
[DEBUG] Estado customerAddresses cambió: [...]
[DEBUG] Estado isAddingNewAddress cambió: true/false
[DEBUG] Estado isEditingAddress cambió: true/false
```

Busca cambios de estado que ocurren sin que el usuario realice acciones.

## Posibles problemas y soluciones

### Problema 1: Actualizaciones de estado en cascada

Si ves que un cambio en un estado provoca cambios en otros estados, podría haber efectos en cascada causando múltiples renderizados.

**Solución:** Combina actualizaciones de estado relacionadas o usa `useReducer`.

### Problema 2: Props cambiando constantemente

Si los props cambian en cada renderizado (especialmente objetos o arrays), podrías estar recibiendo nuevas referencias en cada renderizado del componente padre.

**Solución:** Usa `useMemo` o `useCallback` en el componente padre para estabilizar los props.

### Problema 3: Dependencias de useEffect mal configuradas

Si un efecto se ejecuta más veces de lo esperado, revisa sus dependencias.

**Solución:** Asegura que las dependencias de los useEffect solo incluyan valores que realmente necesiten desencadenar el efecto.

### Problema 4: Estado mantenido en múltiples lugares

Si ves actualizaciones circulares de estado entre componentes padre e hijo.

**Solución:** Centraliza el estado en un solo lugar, preferiblemente en el componente de nivel superior o en un contexto/store global.

## Próximos pasos después de la depuración

1. **Memoización:** Envuelve el componente en `React.memo` y usa `useMemo`/`useCallback` para optimizar.
2. **Centralización de estado:** Mueve la lógica de estado compleja a un contexto o a un hook personalizado.
3. **Separación de componentes:** Divide en componentes más pequeños y específicos que se rendericen solo cuando sea necesario.
