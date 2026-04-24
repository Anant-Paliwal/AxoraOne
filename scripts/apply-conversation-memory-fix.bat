@echo off
echo =====================================================
echo Fix Conversation Memory Error
echo =====================================================
echo.
echo This will fix the "column conversation_memory.role does not exist" error
echo.

echo Step 1: Checking if Supabase is configured...
if not exist "backend\.env" (
    echo ERROR: backend\.env not found!
    echo Please ensure your backend is configured.
    pause
    exit /b 1
)

echo.
echo Step 2: Instructions to apply SQL fix
echo =====================================================
echo.
echo Please follow these steps:
echo.
echo 1. Open Supabase Dashboard: https://supabase.com/dashboard
echo 2. Go to SQL Editor
echo 3. Copy and paste the contents of: fix-conversation-memory-role-column.sql
echo 4. Click "Run" to execute
echo.
echo OR use Supabase CLI:
echo    supabase db push --file fix-conversation-memory-role-column.sql
echo.
echo Press any key after you've applied the SQL fix...
pause > nul

echo.
echo Step 3: Restarting backend...
echo =====================================================
echo.
echo Please restart your backend server:
echo 1. Stop the current backend (Ctrl+C in the terminal)
echo 2. Run: cd backend
echo 3. Run: python -m uvicorn app.main:app --reload --port 8000
echo.
echo ✅ Fix applied! Test Ask Anything now.
echo.
pause
