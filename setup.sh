#!/bin/bash
# Quick setup script for Internship Agent

echo "🚀 Internship Agent - Quick Setup"
echo "=================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null
then
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null
then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm found: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"

# Create .env if not exists
echo ""
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env with your API keys:"
    echo "   - GROQ_API_KEY: Get from https://console.groq.com/keys"
    echo "   - GOOGLE_CLIENT_ID: Get from Google Cloud Console"
    echo "   - GOOGLE_CLIENT_SECRET: Get from Google Cloud Console"
    echo ""
else
    echo "✅ .env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Edit .env with your API keys"
echo "  2. Run: npm start"
echo "  3. Open: http://localhost:3000"
echo ""
echo "📚 For detailed setup: https://github.com/internship-agent/README.md"
