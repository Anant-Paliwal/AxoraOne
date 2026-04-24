#!/bin/bash

# ============================================
# 3-Plan System Deployment Script
# Deploys DB-driven billing system to production
# ============================================

set -e  # Exit on error

echo "🚀 Starting 3-Plan System Deployment"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# STEP 1: Pre-flight Checks
# ============================================

echo "📋 Step 1: Pre-flight Checks"
echo "----------------------------"

# Check if database connection string is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable not set${NC}"
    echo "Please set it with: export DATABASE_URL='your-connection-string'"
    exit 1
fi

echo -e "${GREEN}✅ Database connection configured${NC}"

# Check if migration file exists
if [ ! -f "backend/migrations/upgrade_to_3_plan_system.sql" ]; then
    echo -e "${RED}❌ ERROR: Migration file not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migration file found${NC}"

# Check if plan_service exists
if [ ! -f "backend/app/services/plan_service.py" ]; then
    echo -e "${RED}❌ ERROR: plan_service.py not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Plan service found${NC}"
echo ""

# ============================================
# STEP 2: Backup Database
# ============================================

echo "💾 Step 2: Backing Up Database"
echo "-------------------------------"

BACKUP_FILE="backup_before_3_plan_$(date +%Y%m%d_%H%M%S).sql"

echo "Creating backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Warning: Could not create backup (continuing anyway)${NC}"
}

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No backup created${NC}"
fi
echo ""

# ============================================
# STEP 3: Run Database Migration
# ============================================

echo "🗄️  Step 3: Running Database Migration"
echo "--------------------------------------"

echo "Applying migration..."
psql "$DATABASE_URL" -f backend/migrations/upgrade_to_3_plan_system.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    echo "To restore backup: psql \$DATABASE_URL < $BACKUP_FILE"
    exit 1
fi
echo ""

# ============================================
# STEP 4: Verify Migration
# ============================================

echo "🔍 Step 4: Verifying Migration"
echo "-------------------------------"

# Check if plans exist
PLAN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM subscription_plans WHERE is_active = true;" | xargs)

if [ "$PLAN_COUNT" -eq 3 ]; then
    echo -e "${GREEN}✅ 3 plans found in database${NC}"
else
    echo -e "${RED}❌ Expected 3 plans, found $PLAN_COUNT${NC}"
    exit 1
fi

# Check if users have subscriptions
USER_SUB_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM user_subscriptions;" | xargs)

if [ "$USER_SUB_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ $USER_SUB_COUNT user subscriptions found${NC}"
else
    echo -e "${YELLOW}⚠️  No user subscriptions found (this is OK if no users exist)${NC}"
fi

# Check if helper functions exist
FUNCTION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_user_plan', 'check_workspace_limit', 'check_collaborator_limit', 'check_ask_anything_limit');" | xargs)

if [ "$FUNCTION_COUNT" -eq 4 ]; then
    echo -e "${GREEN}✅ Helper functions created${NC}"
else
    echo -e "${RED}❌ Expected 4 helper functions, found $FUNCTION_COUNT${NC}"
    exit 1
fi

echo ""

# ============================================
# STEP 5: Install Backend Dependencies
# ============================================

echo "📦 Step 5: Installing Backend Dependencies"
echo "------------------------------------------"

cd backend

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  requirements.txt not found${NC}"
fi

cd ..
echo ""

# ============================================
# STEP 6: Install Frontend Dependencies
# ============================================

echo "📦 Step 6: Installing Frontend Dependencies"
echo "-------------------------------------------"

if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  package.json not found${NC}"
fi

echo ""

# ============================================
# STEP 7: Build Frontend
# ============================================

echo "🏗️  Step 7: Building Frontend"
echo "-----------------------------"

if [ -f "package.json" ]; then
    npm run build
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping frontend build${NC}"
fi

echo ""

# ============================================
# STEP 8: Display Plan Summary
# ============================================

echo "📊 Step 8: Plan Summary"
echo "-----------------------"

psql "$DATABASE_URL" -c "
SELECT 
    code,
    name,
    price_monthly_inr as monthly_inr,
    price_yearly_inr as yearly_inr,
    workspaces_limit as workspaces,
    collaborators_limit as collaborators,
    ask_anything_daily_limit as ask_anything_day
FROM subscription_plans
WHERE is_active = true
ORDER BY sort_order;
"

echo ""

# ============================================
# STEP 9: Test API Endpoints
# ============================================

echo "🧪 Step 9: Testing API Endpoints (Optional)"
echo "-------------------------------------------"

if command -v curl &> /dev/null; then
    echo "Testing /subscriptions/plans endpoint..."
    
    # Check if backend is running
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        PLANS_RESPONSE=$(curl -s http://localhost:8000/api/v1/subscriptions/plans)
        PLANS_COUNT=$(echo "$PLANS_RESPONSE" | grep -o '"code"' | wc -l)
        
        if [ "$PLANS_COUNT" -eq 3 ]; then
            echo -e "${GREEN}✅ API endpoint working (3 plans returned)${NC}"
        else
            echo -e "${YELLOW}⚠️  API returned $PLANS_COUNT plans (expected 3)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Backend not running on localhost:8000${NC}"
        echo "Start backend with: cd backend && python main.py"
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping API test${NC}"
fi

echo ""

# ============================================
# DEPLOYMENT COMPLETE
# ============================================

echo "✅ Deployment Complete!"
echo "======================"
echo ""
echo "Next Steps:"
echo "1. Restart your backend service"
echo "2. Deploy frontend to hosting"
echo "3. Test subscription page: /subscription"
echo "4. Test limit enforcement"
echo ""
echo "Verification Checklist:"
echo "  [ ] Subscription page shows 3 plans"
echo "  [ ] Pricing shows INR currency"
echo "  [ ] Current plan displays correctly"
echo "  [ ] Workspace creation enforces limit"
echo "  [ ] Ask Anything enforces daily limit"
echo ""
echo "Documentation:"
echo "  - Implementation Guide: 3_PLAN_SYSTEM_IMPLEMENTATION_GUIDE.md"
echo "  - Guard Examples: GUARD_IMPLEMENTATION_EXAMPLES.md"
echo "  - Summary: 3_PLAN_SYSTEM_COMPLETE_SUMMARY.md"
echo ""
echo "Backup Location: $BACKUP_FILE"
echo ""
echo -e "${GREEN}🎉 3-Plan System is ready!${NC}"
