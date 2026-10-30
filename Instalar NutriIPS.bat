@echo off
title NutriIPS - Consultorio de Nutricion
chcp 65001 >nul
echo.
echo  ========================================
echo   NutriIPS - Departamento de Nutricion
echo  ========================================
echo.
echo  Abriendo como aplicacion de escritorio...
echo  Si es la primera vez, en Edge o Chrome usa
echo  "Instalar aplicacion" cuando aparezca.
echo.

REM URL de produccion (se actualiza al desplegar en Vercel)
set URL=https://nutriips.vercel.app/

where msedge >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" msedge --app=%URL% --new-window
  goto :eof
)

where chrome >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" chrome --app=%URL% --new-window
  goto :eof
)

start "" "%URL%"
