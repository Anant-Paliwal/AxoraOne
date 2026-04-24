#!/bin/bash

# AI Knowledge Platform - Setup Script
# This script helps you set up the project quickly

echo "🚀 AI Knowledge Platform - Setup Script"
echo "========================================"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.11+ first."
    exit 1
fi
echo "✅ Python $(python3 --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi
echo "✅ npm $(npm --version)"

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
echo "✅ Frontend dependencies installed"

# Setup backend
echo ""
echo "Setting up backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
echo "✅ Backend dependencies installed"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "✅ Created backend/.env from template"
    echo "⚠️  Please edit backend/.env with your credentials"
fi

cd ..

# Check frontend .env
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  Frontend .env file not found"
    echo "Please create .env file with:"
    echo "  VITE_SUPABASE_URL=your_supabase_url"
    echo "  VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key"
    echo "  VITE_API_URL=http://localhost:8000"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Configure backend/.env with your credentials:"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_KEY"
echo "   - SUPABASE_SERVICE_KEY"
echo "   - OPENAI_API_KEY"
echo ""
echo "2. Configure .env with your Supabase credentials"
echo ""
echo "3. Run database migrations in Supabase (copy data.sql)"
echo ""
echo "4. Start the backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python main.py"
echo ""
echo "5. Start the frontend (in a new terminal):"
echo "   npm run dev"
echo ""
echo "📖 For detailed instructions, see QUICKSTART.md"
echo ""
