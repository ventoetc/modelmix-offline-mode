#!/bin/bash
set -e

echo "🚀 ModelMix Vercel Deployment Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
fi

echo ""
echo -e "${BLUE}Step 1: Checking environment configuration...${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from example...${NC}"
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env with your Supabase credentials and run again.${NC}"
    exit 1
fi

# Load .env
set -a
source .env
set +a

# Verify required env vars
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables in .env${NC}"
    echo "   Required: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY"
    exit 1
fi

echo -e "${GREEN}✅ Environment configured${NC}"

echo ""
echo -e "${BLUE}Step 2: Deploying Supabase Edge Functions...${NC}"

# Check if linked to Supabase project
if [ ! -f .supabase/config.toml ]; then
    echo -e "${YELLOW}⚠️  Not linked to Supabase. Run: supabase link${NC}"
    echo "   Visit https://supabase.com/dashboard to get your project ref"
    exit 1
fi

# Deploy edge functions
echo "Deploying chat function..."
supabase functions deploy chat --no-verify-jwt

echo "Deploying credits function..."
supabase functions deploy credits --no-verify-jwt

echo "Deploying track-action function..."
supabase functions deploy track-action --no-verify-jwt

echo "Deploying shadow-analyze function..."
supabase functions deploy shadow-analyze --no-verify-jwt

echo -e "${GREEN}✅ Edge functions deployed${NC}"

echo ""
echo -e "${BLUE}Step 3: Setting Supabase Secrets...${NC}"

# Prompt for OpenAI API key if not in env
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}Enter your OpenAI API key (or press Enter to skip):${NC}"
    read -s OPENAI_API_KEY
fi

if [ -n "$OPENAI_API_KEY" ]; then
    echo "Setting OPENAI_API_KEY..."
    supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
    echo -e "${GREEN}✅ OpenAI API key set${NC}"
else
    echo -e "${YELLOW}⚠️  No OpenAI API key provided${NC}"
fi

# Prompt for OpenRouter API key
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo -e "${YELLOW}Enter your OpenRouter API key (optional, press Enter to skip):${NC}"
    read -s OPENROUTER_API_KEY
fi

if [ -n "$OPENROUTER_API_KEY" ]; then
    echo "Setting OPENROUTER_API_KEY..."
    supabase secrets set OPENROUTER_API_KEY="$OPENROUTER_API_KEY"
    echo -e "${GREEN}✅ OpenRouter API key set${NC}"
fi

# Anthropic
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}Enter your Anthropic API key (optional, press Enter to skip):${NC}"
    read -s ANTHROPIC_API_KEY
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "Setting ANTHROPIC_API_KEY..."
    supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
    echo -e "${GREEN}✅ Anthropic API key set${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Running database migrations...${NC}"
supabase db push

echo -e "${GREEN}✅ Database migrations complete${NC}"

echo ""
echo -e "${BLUE}Step 5: Building frontend...${NC}"
npm run build

echo -e "${GREEN}✅ Frontend built${NC}"

echo ""
echo -e "${BLUE}Step 6: Deploying to Vercel...${NC}"

# Check if this is first deployment
if [ ! -f .vercel/project.json ]; then
    echo "First-time deployment. Running vercel setup..."
    vercel --prod
else
    echo "Deploying to production..."
    vercel --prod
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Create your admin user (see QUICKSTART.md)"
echo "2. Test your deployment"
echo "3. Configure custom domain (optional)"
echo ""
echo -e "${YELLOW}⚠️  Important: Set these environment variables in Vercel Dashboard:${NC}"
echo "   VITE_SUPABASE_URL=$VITE_SUPABASE_URL"
echo "   VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY"
echo "   VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID"
echo ""
echo "Visit: https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
