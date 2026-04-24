@echo off
REM ============================================
REM 3-Plan System Deployment Script (Windows)
REM Deploys DB-driven billing system to production
REM ============================================

echo.
echo ============================================
echo 3-Plan System Deployment
echo ============================================
echo.

REM ============================================
REM STEP 1: Pre-flight Checks
REM ============================================

echo Step 1: Pre-flight Checks
echo ----------------------------

if "%DATABASE_URL%"=="" (
    echo [ERROR] DATABASE_URL environment variable not set
    echo Please set it with: set DATABASE_URL=your-connection-string
    exit /b 1
)

echo [OK] Database connection configured

if not exist "backend\migrations\upgrade_to_3_plan_system.sql" (
    echo [ERROR] Migration file not found
    exit /b 1
)

echo [OK] Migration file found

if not exist "backend\app\services\plan_service.py" (
    echo [ERROR] plan_service.py not found
    exit /b 1
)

echo [OK] Plan service found
echo.

REM ============================================
REM STEP 2: Backup Database
REM ============================================

echo Step 2: Backing Up Database
echo -------------------------------

set BACKUP_FILE=backup_before_3_plan_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
set BACKUP_FILE=%BACKUP_FILE: =0%

echo Creating backup: %BACKUP_FILE%
pg_dump "%DATABASE_URL%" > "%BACKUP_FILE%" 2>nul

if exist "%BACKUP_FILE%" (
    echo [OK] Backup created: %BACKUP_FILE%
) else (
    echo [WARNING] Could not create backup
)
echo.

REM ============================================
REM STEP 3: Run Database Migration
REM ============================================

echo Step 3: Running Database Migration
echo --------------------------------------

echo Applying migration...
psql "%DATABASE_URL%" -f backend\migrations\upgrade_to_3_plan_system.sql

if %ERRORLEVEL% EQU 0 (
    echo [OK] Migration completed successfully
) else (
    echo [ERROR] Migration failed
    echo To restore backup: psql %%DATABASE_URL%% ^< %BACKUP_FILE%
    exit /b 1
)
echo.

REM ============================================
REM STEP 4: Verify Migration
REM ============================================

echo Step 4: Verifying Migration
echo -------------------------------

echo Checking plans...
psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM subscription_plans WHERE is_active = true;"

echo Checking user subscriptions...
psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM user_subscriptions;"

echo Checking helper functions...
psql "%DATABASE_URL%" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_user_plan', 'check_workspace_limit', 'check_collaborator_limit', 'check_ask_anything_limit');"

echo.

REM ============================================
REM STEP 5: Install Backend Dependencies
REM ============================================

echo Step 5: Installing Backend Dependencies
echo ------------------------------------------

cd backend

if exist "requirements.txt" (
    pip install -r requirements.txt
    echo [OK] Backend dependencies installed
) else (
    echo [WARNING] requirements.txt not found
)

cd ..
echo.

REM ============================================
REM STEP 6: Install Frontend Dependencies
REM ============================================

echo Step 6: Installing Frontend Dependencies
echo -------------------------------------------

if exist "package.json" (
    call npm install
    echo [OK] Frontend dependencies installed
) else (
    echo [WARNING] package.json not found
)

echo.

REM ============================================
REM STEP 7: Build Frontend
REM ============================================

echo Step 7: Building Frontend
echo -----------------------------

if exist "package.json" (
    call npm run build
    echo [OK] Frontend built successfully
) else (
    echo [WARNING] Skipping frontend build
)

echo.

REM ============================================
REM STEP 8: Display Plan Summary
REM ============================================

echo Step 8: Plan Summary
echo -----------------------

psql "%DATABASE_URL%" -c "SELECT code, name, price_monthly_inr as monthly_inr, price_yearly_inr as yearly_inr, workspaces_limit as workspaces, collaborators_limit as collaborators, ask_anything_daily_limit as ask_anything_day FROM subscription_plans WHERE is_active = true ORDER BY sort_order;"

echo.

REM ============================================
REM DEPLOYMENT COMPLETE
REM ============================================

echo.
echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo Next Steps:
echo 1. Restart your backend service
echo 2. Deploy frontend to hosting
echo 3. Test subscription page: /subscription
echo 4. Test limit enforcement
echo.
echo Verification Checklist:
echo   [ ] Subscription page shows 3 plans
echo   [ ] Pricing shows INR currency
echo   [ ] Current plan displays correctly
echo   [ ] Workspace creation enforces limit
echo   [ ] Ask Anything enforces daily limit
echo.
echo Documentation:
echo   - Implementation Guide: 3_PLAN_SYSTEM_IMPLEMENTATION_GUIDE.md
echo   - Guard Examples: GUARD_IMPLEMENTATION_EXAMPLES.md
echo   - Summary: 3_PLAN_SYSTEM_COMPLETE_SUMMARY.md
echo.
echo Backup Location: %BACKUP_FILE%
echo.
echo 3-Plan System is ready!
echo.

pause
