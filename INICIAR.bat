@echo off
title Sistema de Gestión de Restaurantes
color 0A

cls
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                                                              ║
echo  ║    🍽️  SISTEMA DE GESTIÓN DE RESTAURANTES  🍽️                ║
echo  ║                                                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  🚀 Iniciando sistema...
echo.

REM Verificar si node_modules existe en la raíz
if not exist "node_modules" (
    echo  📦 Instalando dependencias principales...
    call npm install
)

REM Verificar si node_modules existe en backend
if not exist "backend\node_modules" (
    echo  📦 Instalando dependencias del backend...
    cd backend
    call npm install
    cd ..
)

REM Verificar si node_modules existe en frontend
if not exist "frontend\node_modules" (
    echo  📦 Instalando dependencias del frontend...
    cd frontend
    call npm install
    cd ..
)

echo.
echo  ✅ Dependencias verificadas
echo.
echo  🔄 Iniciando servidores...
echo     - Backend: http://localhost:3001
echo     - Frontend: http://localhost:3000
echo     - Panel Admin: http://localhost:3000/super-admin
echo.
echo  💡 Presiona Ctrl+C para detener ambos servidores
echo.

REM Iniciar ambos servidores
call npm run dev

pause
