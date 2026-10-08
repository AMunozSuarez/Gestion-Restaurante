# Frontend (React + Vite)

## Comandos

- `npm start` (o `npm run dev`): servidor de desarrollo en http://localhost:3000, accesible desde la red local.
- `npm run build`: genera el build de producción en `dist/`.
- `npm run preview`: sirve el build de producción localmente.

## Variables de entorno

Se definen en `frontend/.env` y deben empezar con `VITE_`:

- `VITE_API_URL`: URL de la API (por defecto `http://localhost:3001/api`).
- `VITE_PRINTING_SERVICE_URL`: URL del servicio de impresión (por defecto `http://localhost:8088`).

Se leen en el código con `import.meta.env.VITE_*`. Al cambiarlas hay que reiniciar el servidor de desarrollo o volver a hacer el build.
