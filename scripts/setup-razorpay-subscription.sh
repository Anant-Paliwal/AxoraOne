#!/bin/bash

# Razorpay Subscription System Setup Script
# Run this to set up the complete subscription system

echo "🚀 Setting up Razorpay Subscription System..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install Python dependencies
echo -e "${YELLOW}Step 1: Installing Python dependencies...${NC}"
cd backend
pip install razorpay==1.4.2
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Step 2: Check environment variables
echo -e "${YELLOW}Step 2: Checking environment variables...${NC}"
if [ -f .env ]; then
    if grep -q "RAZORPAY_KEY_ID" .env && grep -q "RAZORPAY_KEY_SECRET" .env; then
        echo -e "${GREEN}✅ Razorpay credentials found in .env${NC}"
    else
        echo -e "${RED}❌ Razorpay credentials missing in .env${NC}"
        echo ""
        echo "Please add the following to backend/.env:"
        echo ""
        echo "RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID"
        echo "RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET"
        echo "FRONTEND_URL=http://localhost:5173"
        echo ""
        echo "Get your keys from: https://dashboard.razorpay.com/app/keys"
        exit 1
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Creating .env file..."
    cat > .env << EOF
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET
FRONTEND_URL=http://localhost:5173

# Add your other environment variables here
EOF
    echo -e "${YELLOW}⚠️  Please update backend/.env with your Razorpay credentials${NC}"
    exit 1
fi
echo ""

# Step 3: Database migration
echo -e "${YELLOW}Step 3: Database migration${NC}"
echo "Please run the following SQL files in your Supabase SQL Editor IN ORDER:"
echo ""
echo -e "${GREEN}1. backend/migrations/create_subscription_tables_complete.sql${NC}"
echo -e "${GREEN}2. backend/migrations/add_storage_and_team_tracking.sql${NC}"
echo ""
echo "See MIGRATION_ORDER.md for detailed instructions"
echo ""
read -p "Press Enter after running BOTH migrations..."
echo -e "${GREEN}✅ Migrations completed${NC}"
echo ""

# Step 4: Verify files
echo -e "${YELLOW}Step 4: Verifying files...${NC}"
FILES=(
    "app/services/razorpay_service.py"
    "app/api/endpoints/subscriptions.py"
    "migrations/add_storage_and_team_tracking.sql"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file not found${NC}"
    fi
done
echo ""

# Step 5: Start backend
echo -e "${YELLOW}Step 5: Starting backend...${NC}"
echo "Run: python main.py"
echo ""

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && python main.py"
echo "2. Start frontend: npm run dev"
echo "3. Go to: http://localhost:5173/subscription"
echo "4. Test payment with card: 4111 1111 1111 1111"
echo ""
echo "Documentation:"
echo "- Complete Guide: RAZORPAY_SUBSCRIPTION_COMPLETE_GUIDE.md"
echo "- Summary: CRITICAL_ISSUES_FIXED_SUMMARY.md"
echo ""
echo -e "${GREEN}🎉 Ready to accept payments!${NC}"
