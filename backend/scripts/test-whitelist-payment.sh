#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:8000/api"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing Whitelist Payment System     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Check whitelist price
echo -e "${YELLOW}Test 1: Checking whitelist price...${NC}"
PRICE_RESPONSE=$(curl -s "$API_URL/seal/whitelist-price")
echo "$PRICE_RESPONSE" | jq .

if echo "$PRICE_RESPONSE" | jq -e '.success == true' > /dev/null; then
    PRICE_SUI=$(echo "$PRICE_RESPONSE" | jq -r '.data.price_sui')
    PRICE_MIST=$(echo "$PRICE_RESPONSE" | jq -r '.data.price_mist')
    echo -e "${GREEN}✅ Price endpoint working!${NC}"
    echo -e "   Price: ${GREEN}$PRICE_SUI SUI${NC} (${PRICE_MIST} MIST)"
else
    echo -e "${RED}❌ Price endpoint failed!${NC}"
    exit 1
fi

echo ""

# Test 2: List workflows
echo -e "${YELLOW}Test 2: Listing marketplace workflows...${NC}"
WORKFLOWS_RESPONSE=$(curl -s "$API_URL/workflows/list")
echo "$WORKFLOWS_RESPONSE" | jq .

if echo "$WORKFLOWS_RESPONSE" | jq -e '.success == true' > /dev/null; then
    WORKFLOW_COUNT=$(echo "$WORKFLOWS_RESPONSE" | jq -r '.data | length')
    echo -e "${GREEN}✅ Workflows endpoint working!${NC}"
    echo -e "   Found ${GREEN}$WORKFLOW_COUNT${NC} workflows"
else
    echo -e "${RED}❌ Workflows endpoint failed!${NC}"
fi

echo ""

# Test 3: Check config values
echo -e "${YELLOW}Test 3: Checking configuration...${NC}"
cd "$(dirname "$0")/.."

if [ -f ".env" ]; then
    echo -e "${BLUE}Current .env values:${NC}"
    echo -e "   PACKAGE_ID:   $(grep PACKAGE_ID .env | cut -d= -f2)"
    echo -e "   WHITELIST_ID: $(grep WHITELIST_ID .env | cut -d= -f2)"
    echo -e "   CAP_ID:       $(grep CAP_ID .env | cut -d= -f2)"
    echo -e "${GREEN}✅ .env file exists${NC}"
else
    echo -e "${RED}❌ .env file not found!${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Test Complete                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Open frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "2. Connect wallet"
echo -e "3. Click ${YELLOW}PAY 0.5 SUI FOR WHITELIST${NC} button"
echo -e "4. Purchase and decrypt workflows"
echo ""
