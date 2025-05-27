# Sistema de Gestión de Restaurante

Un sistema completo para la gestión integral de restaurantes, con módulos para mostrador, delivery y administración.

![Restaurante](frontend/fondo.jpg)

## 📋 Descripción

Este sistema de gestión de restaurante es una solución completa que permite administrar todas las operaciones necesarias para un restaurante moderno, incluyendo:

- **Gestión de pedidos** en mostrador y delivery
- **Administración de productos y categorías**
- **Control de clientes y sus direcciones**
- **Sistema de caja y reportes financieros**
- **Panel de administración** con estadísticas y configuraciones

El sistema está dividido en tres módulos principales:
- **Mostrador**: Para gestión de pedidos presenciales
- **Delivery**: Para gestión de pedidos a domicilio
- **Admin**: Para administración del negocio (productos, categorías, reportes, caja)

## 🚀 Tecnologías

### Frontend
- React 19
- React Router 7
- Zustand (manejo de estado global)
- React Query (TanStack Query)
- Axios
- React Toastify
- FontAwesome

### Backend
- Node.js
- Express
- MongoDB (con Mongoose)
- JWT para autenticación
- bcrypt para encriptación
- Morgan para logging

## 🔧 Instalación

### Prerrequisitos
- Node.js (v14 o superior)
- MongoDB (local o Atlas)
- npm o yarn

### Configuración del Backend

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tuusuario/gestion-restaurante.git
   cd gestion-restaurante
   ```

2. Instalar las dependencias del backend:
   ```bash
   cd backend
   npm install
   ```

3. Crear un archivo `.env` en la carpeta `backend` con las siguientes variables:
   ```
   PORT=3001
   MONGODB_URI=tu_cadena_de_conexion_mongodb
   JWT_SECRET=tu_clave_secreta_jwt
   ```

4. Iniciar el servidor:
   ```bash
   npm start
   ```

### Configuración del Frontend

1. En otra terminal, instalar las dependencias del frontend:
   ```bash
   cd frontend
   npm install
   ```

2. Crear un archivo `.env` en la carpeta `frontend` con las siguientes variables:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   ```

3. Iniciar la aplicación:
   ```bash
   npm start
   ```

## 🏗️ Arquitectura

### Estructura del Backend
- **Models**: Definición de esquemas MongoDB para las entidades del sistema
- **Controllers**: Lógica de negocio para cada entidad
- **Routes**: Definición de endpoints API
- **Middlewares**: Funciones intermedias para autenticación, autorización y filtrado
- **Utils**: Funciones utilitarias
- **BDD**: Configuración de la base de datos

### Estructura del Frontend
- **Components**: Componentes de React organizados por módulos
  - **Common**: Componentes reutilizables
  - **Layout**: Componentes de estructura
  - **Forms**: Componentes de formularios
  - **Lists**: Componentes de listas
  - **Modules**: Componentes específicos por módulo (mostrador, delivery, admin)
- **Hooks**: Hooks personalizados para lógica reutilizable
- **Store**: Estado global con Zustand
- **Services**: Servicios de API y utilidades
- **Styles**: Estilos CSS organizados por componentes y módulos

## 📱 Módulos del Sistema

### Módulo de Mostrador
Gestiona pedidos presenciales en el restaurante:
- Creación de pedidos
- Listado de pedidos en preparación
- Registro de pagos
- Visualización de estado de pedidos

### Módulo de Delivery
Maneja pedidos a domicilio:
- Registro de datos del cliente
- Gestión de direcciones
- Seguimiento de estado del pedido
- Asignación de repartidores

### Módulo de Administración
Proporciona herramientas para la gestión del negocio:
- CRUD de productos y categorías
- Reportes de ventas
- Control de caja
- Estadísticas del negocio

## 🔐 Seguridad

El sistema implementa varios niveles de seguridad:
- Autenticación basada en JWT
- Validación de roles (admin, empleado, etc.)
- Filtrado de datos por restaurante
- Encriptación de contraseñas

## 📊 API

La API REST del backend proporciona los siguientes endpoints principales:

- `/api/auth`: Autenticación y registro
- `/api/user`: Gestión de usuarios
- `/api/restaurant`: Configuración de restaurantes
- `/api/category`: Administración de categorías
- `/api/food`: Gestión de productos
- `/api/order`: Gestión de pedidos
- `/api/customer`: Administración de clientes
- `/api/cash`: Control de caja
- `/api/report`: Generación de reportes

## 📝 Guía de Contribución

Si deseas contribuir a este proyecto, sigue estos pasos:

1. Realiza un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios y haz commit (`git commit -m 'Añade nueva funcionalidad'`)
4. Sube tus cambios a tu fork (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Estándares de código
- Utiliza ESLint para mantener un estilo consistente
- Escribe pruebas para nuevas funcionalidades
- Documenta las funciones y componentes

## 📄 Licencia

Este proyecto está licenciado bajo [MIT License](LICENSE)

## 👨‍💻 Autores

- Alejandro Muñoz | https://github.com/AMunozSuarez

## 🔗 Enlaces

- [Documentación de la API](enlace_a_documentacion)
- [Manual de Usuario](enlace_a_manual)
