@echo off
REM AI Knowledge Platform - Setup Script for Windows
REM This script helps you set up the project quickly

echo.
echo 🚀 AI Knowledge Platform - Setup Script
echo ========================================
echo.

REM Check prerequisites
echo 📋 Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)
node --version
echo ✅ Node.js installed

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python is not installed. Please install Python 3.11+ first.
    exit /b 1
)
python --version
echo ✅ Python installed

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed. Please install npm first.
    exit /b 1
)
npm --version
echo ✅ npm installed

echo.
echo 📦 Installing dependencies...
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install frontend dependencies
    exit /b 1
)
echo ✅ Frontend dependencies installed

REM Setup backend
echo.
echo Setting up backend...
cd backend

REM Create virtual environment
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to create virtual environment
        exit /b 1
    )
    echo ✅ Virtual environment created
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install backend dependencies
echo Installing backend dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install backend dependencies
    exit /b 1
)
echo ✅ Backend dependencies installed

REM Create .env if it doesn't exist
if not exist ".env" (
    echo.
    echo 📝 Creating backend .env file...
    copy .env.example .env
    echo ✅ Created backend\.env from template
    echo ⚠️  Please edit backend\.env with your credentials
)

cd ..

REM Check frontend .env
if not exist ".env" (
    echo.
    echo ⚠️  Frontend .env file not found
    echo Please create .env file with:
    echo   VITE_SUPABASE_URL=your_supabase_url
    echo   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
    echo   VITE_API_URL=http://localhost:8000
)

echo.
echo ✅ Setup complete!
echo.
echo 📚 Next steps:
echo 1. Configure backend\.env with your credentials:
echo    - SUPABASE_URL
echo    - SUPABASE_KEY
echo    - SUPABASE_SERVICE_KEY
echo    - OPENAI_API_KEY
echo.
echo 2. Configure .env with your Supabase credentials
echo.
echo 3. Run database migrations in Supabase (copy data.sql)
echo.
echo 4. Start the backend:
echo    cd backend
echo    venv\Scripts\activate
echo    python main.py
echo.
echo 5. Start the frontend (in a new terminal):
echo    npm run dev
echo.
echo 📖 For detailed instructions, see QUICKSTART.md
echo.
pause
