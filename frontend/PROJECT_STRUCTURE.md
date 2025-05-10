# Gestión de Restaurante

## Estructura del Proyecto

La estructura del proyecto ha sido reorganizada para mejorar la escalabilidad, mantenibilidad y seguir mejores prácticas de desarrollo.

### Frontend

```
frontend/
├── src/
│   ├── assets/                  # Recursos estáticos (imágenes, iconos)
│   ├── components/
│   │   ├── common/              # Componentes reutilizables (botones, inputs, modales)
│   │   ├── layout/              # Componentes de estructura (Header, SubHeader, Layouts)
│   │   ├── forms/               # Componentes de formularios
│   │   │   ├── base/            # Componentes base de formularios
│   │   │   └── specialized/     # Implementaciones específicas
│   │   ├── lists/               # Componentes de listas
│   │   └── modules/             # Componentes específicos por módulo
│   │       ├── mostrador/       # Componentes específicos de mostrador
│   │       ├── delivery/        # Componentes específicos de delivery
│   │       └── admin/           # Componentes de administración
│   ├── hooks/
│   │   ├── api/                 # Hooks para llamadas a API
│   │   ├── forms/               # Hooks para manejar formularios
│   │   ├── state/               # Hooks para manejar estados complejos
│   │   └── business/            # Hooks para lógica de negocio
│   ├── store/                   # Estado global con Zustand
│   │   ├── useCartStore.js      # Estado del carrito
│   │   ├── useUiStore.js        # Estado de UI
│   │   └── index.js             # Exportaciones centralizadas
│   ├── services/
│   │   ├── api/                 # Servicios de API organizados por entidad
│   │   └── utils/               # Servicios utilitarios
│   ├── styles/
│   │   ├── base/                # Estilos base (variables, reset, tipografía)
│   │   ├── components/          # Estilos de componentes
│   │   └── modules/             # Estilos específicos por módulo
│   ├── utils/                   # Funciones utilitarias
│   ├── config/                  # Configuraciones de la aplicación
│   ├── types/                   # Definiciones de tipos (si usas TypeScript)
│   └── pages/                   # Páginas de la aplicación organizadas por sección
│       ├── mostrador/
│       ├── delivery/
│       └── admin/
```

## Principios de diseño y buenas prácticas

### 1. Patrones de diseño utilizados

- **Patrón Base Component**: Se utilizan componentes base como `BaseOrderForm` para definir la estructura común entre formularios.
- **Custom Hooks**: Se extrajo la lógica compleja a hooks personalizados como `useCartManagement`, `useOrderDetailsLogic`.
- **Component Composition**: Se componen componentes pequeños para crear interfaces más complejas.

### 2. Manejo de estado

- **Local State**: Para estado específico de componente usando React useState/useReducer.
- **Global State**: Usando Zustand para estados que necesitan ser compartidos.
- **Derived State**: Se calcula estado derivado para evitar duplicación.

### 3. Rendimiento

- Se evita re-renders innecesarios usando:
  - React.memo para componentes puros
  - useCallback para funciones estables
  - useMemo para valores computados costosos

## Instrucciones de desarrollo

1. Para añadir nuevos componentes, seguir la estructura de directorios
2. Implementar nuevas características por módulo (mostrador, delivery, admin)
3. Extraer lógica reutilizable a hooks personalizados

## Comandos útiles

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm start

# Construir para producción
npm run build
```
