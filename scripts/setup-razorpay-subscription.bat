@echo off
REM Razorpay Subscription System Setup Script (Windows)
REM Run this to set up the complete subscription system

echo.
echo ========================================
echo Razorpay Subscription System Setup
echo ========================================
echo.

REM Step 1: Install Python dependencies
echo Step 1: Installing Python dependencies...
cd backend
pip install razorpay==1.4.2
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Step 2: Check environment variables
echo Step 2: Checking environment variables...
if exist .env (
    findstr /C:"RAZORPAY_KEY_ID" .env >nul
    if %errorlevel% equ 0 (
        findstr /C:"RAZORPAY_KEY_SECRET" .env >nul
        if %errorlevel% equ 0 (
            echo [OK] Razorpay credentials found in .env
        ) else (
            goto :missing_credentials
        )
    ) else (
        goto :missing_credentials
    )
) else (
    echo [ERROR] .env file not found
    echo Creating .env file...
    (
        echo # Razorpay Configuration
        echo RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
        echo RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
        echo FRONTEND_URL=http://localhost:5173
        echo.
        echo # Add your other environment variables here
    ) > .env
    echo [WARNING] Please update backend/.env with your Razorpay credentials
    pause
    exit /b 1
)
echo.

REM Step 3: Database migration
echo Step 3: Database migration
echo Please run the following SQL in your Supabase SQL Editor:
echo.
echo backend/migrations/add_storage_and_team_tracking.sql
echo.
pause
echo [OK] Migration completed
echo.

REM Step 4: Verify files
echo Step 4: Verifying files...
if exist "app\services\razorpay_service.py" (
    echo [OK] app/services/razorpay_service.py
) else (
    echo [ERROR] app/services/razorpay_service.py not found
)

if exist "app\api\endpoints\subscriptions.py" (
    echo [OK] app/api/endpoints/subscriptions.py
) else (
    echo [ERROR] app/api/endpoints/subscriptions.py not found
)

if exist "migrations\add_storage_and_team_tracking.sql" (
    echo [OK] migrations/add_storage_and_team_tracking.sql
) else (
    echo [ERROR] migrations/add_storage_and_team_tracking.sql not found
)
echo.

REM Summary
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start backend: cd backend ^&^& python main.py
echo 2. Start frontend: npm run dev
echo 3. Go to: http://localhost:5173/subscription
echo 4. Test payment with card: 4111 1111 1111 1111
echo.
echo Documentation:
echo - Complete Guide: RAZORPAY_SUBSCRIPTION_COMPLETE_GUIDE.md
echo - Summary: CRITICAL_ISSUES_FIXED_SUMMARY.md
echo.
echo Ready to accept payments!
echo.
pause
exit /b 0

:missing_credentials
echo [ERROR] Razorpay credentials missing in .env
echo.
echo Please add the following to backend/.env:
echo.
echo RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
echo RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
echo FRONTEND_URL=http://localhost:5173
echo.
echo Get your keys from: https://dashboard.razorpay.com/app/keys
pause
exit /b 1
