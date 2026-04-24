@echo off
echo Clearing Vite cache and node_modules cache...

REM Clear Vite cache
if exist "node_modules\.vite" (
    echo Removing node_modules\.vite...
    rmdir /s /q "node_modules\.vite"
)

REM Clear dist folder
if exist "dist" (
    echo Removing dist...
    rmdir /s /q "dist"
)

echo Cache cleared successfully!
echo.
echo Please restart your dev server with: npm run dev
echo And do a hard refresh in your browser (Ctrl+Shift+R or Ctrl+F5)
pause
