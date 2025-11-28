#!/bin/bash

# ScurryDB Turso Setup Script
# This script helps you set up Turso for your ScurryDB deployment

set -e

echo "🚀 ScurryDB Turso Setup"
echo "======================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Turso CLI is installed
if ! command -v turso &> /dev/null; then
    echo -e "${YELLOW}Turso CLI not found. Installing...${NC}"
    curl -sSfL https://get.tur.so/install.sh | bash
    export PATH="$HOME/.turso:$PATH"
    echo -e "${GREEN}✓ Turso CLI installed${NC}"
else
    echo -e "${GREEN}✓ Turso CLI found${NC}"
fi

echo ""

# Check if logged in
if ! turso db list &> /dev/null; then
    echo -e "${YELLOW}Please login to Turso:${NC}"
    turso auth login
    echo -e "${GREEN}✓ Logged in to Turso${NC}"
else
    echo -e "${GREEN}✓ Already logged in to Turso${NC}"
fi

echo ""

# Database name
read -p "Enter database name (default: scurrydb): " DB_NAME
DB_NAME=${DB_NAME:-scurrydb}

# Check if database exists
if turso db show "$DB_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠ Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to use the existing database? (y/n): " USE_EXISTING
    if [[ $USE_EXISTING != "y" ]]; then
        read -p "Enter a different database name: " DB_NAME
        turso db create "$DB_NAME"
        echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"
    fi
else
    echo "Creating database '$DB_NAME'..."
    turso db create "$DB_NAME"
    echo -e "${GREEN}✓ Database created${NC}"
fi

echo ""

# Initialize schema
echo "Initializing database schema..."
if [ -f "init-schema.sql" ]; then
    turso db shell "$DB_NAME" < init-schema.sql
    echo -e "${GREEN}✓ Schema initialized${NC}"
else
    echo -e "${RED}✗ init-schema.sql not found${NC}"
    echo "Please make sure init-schema.sql exists in the project root"
    exit 1
fi

echo ""

# Get database URL
echo "Getting database credentials..."
DB_URL=$(turso db show "$DB_NAME" --url)
echo -e "${GREEN}Database URL:${NC} $DB_URL"

# Create auth token
AUTH_TOKEN=$(turso db tokens create "$DB_NAME" --expiration none)
echo -e "${GREEN}Auth Token:${NC} $AUTH_TOKEN"

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Add these environment variables to Vercel:"
echo ""
echo "   ${GREEN}TURSO_DATABASE_URL${NC}=$DB_URL"
echo "   ${GREEN}TURSO_AUTH_TOKEN${NC}=$AUTH_TOKEN"
echo ""
echo "2. Generate an encryption key:"
echo ""
echo "   ${GREEN}ENCRYPTION_KEY${NC}=\$(openssl rand -base64 32)"
echo ""
echo "3. Add to Vercel using one of these methods:"
echo ""
echo "   ${YELLOW}Option A: Vercel Dashboard${NC}"
echo "   - Go to your project → Settings → Environment Variables"
echo "   - Add each variable for Production, Preview, and Development"
echo ""
echo "   ${YELLOW}Option B: Vercel CLI${NC}"
echo "   - Run: vercel env add TURSO_DATABASE_URL production"
echo "   - Run: vercel env add TURSO_AUTH_TOKEN production"
echo "   - Run: vercel env add ENCRYPTION_KEY production"
echo ""
echo "4. Deploy your app:"
echo ""
echo "   git push origin main"
echo "   # or"
echo "   vercel --prod"
echo ""
echo "📚 For detailed instructions, see VERCEL_DEPLOYMENT.md"
echo ""

# Save to .env.example for reference
cat > .env.turso.example << EOF
# Turso Configuration for $DB_NAME
# Copy these to your Vercel project's environment variables

TURSO_DATABASE_URL=$DB_URL
TURSO_AUTH_TOKEN=$AUTH_TOKEN
ENCRYPTION_KEY=\$(openssl rand -base64 32)

# Note: Do NOT commit these values to git
# This file is for reference only
EOF

echo -e "${GREEN}✓ Credentials saved to .env.turso.example${NC}"
echo ""
