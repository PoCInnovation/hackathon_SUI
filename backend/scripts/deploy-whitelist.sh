#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Whitelist Contract Deployment        ║${NC}"
echo -e "${BLUE}║  With 0.5 SUI Payment Support          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Get the script directory and navigate to move folder
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOVE_DIR="$SCRIPT_DIR/../move"
ENV_FILE="$SCRIPT_DIR/../.env"

echo -e "${YELLOW}📂 Moving to contract directory...${NC}"
cd "$MOVE_DIR"

echo -e "${YELLOW}🔨 Building Move contract...${NC}"
sui move build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build successful!${NC}"
echo ""
echo -e "${YELLOW}🚀 Deploying contract to Sui testnet...${NC}"
echo -e "${BLUE}⚠️  Make sure you have enough SUI in your wallet!${NC}"
echo ""

# Deploy and capture output
DEPLOY_OUTPUT=$(sui client publish --gas-budget 100000000 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "$DEPLOY_OUTPUT"
echo ""

# Parse deployment output
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | grep -A 1 "Published Objects:" | grep "PackageID:" | awk '{print $2}')
WHITELIST_ID=$(echo "$DEPLOY_OUTPUT" | grep -B 1 "Whitelist" | grep "ObjectID:" | awk '{print $2}' | head -1)
CAP_ID=$(echo "$DEPLOY_OUTPUT" | grep -B 1 "Cap" | grep "ObjectID:" | awk '{print $2}' | head -1)

if [ -z "$PACKAGE_ID" ] || [ -z "$WHITELIST_ID" ] || [ -z "$CAP_ID" ]; then
    echo -e "${RED}❌ Failed to parse deployment output!${NC}"
    echo -e "${YELLOW}Please manually extract IDs from the output above${NC}"
    exit 1
fi

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Deployment Successful!          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📝 Deployment Details:${NC}"
echo -e "   Package ID:   ${GREEN}$PACKAGE_ID${NC}"
echo -e "   Whitelist ID: ${GREEN}$WHITELIST_ID${NC}"
echo -e "   Cap ID:       ${GREEN}$CAP_ID${NC}"
echo ""

# Update .env file
echo -e "${YELLOW}📝 Updating .env file...${NC}"

if [ -f "$ENV_FILE" ]; then
    # Backup existing .env
    cp "$ENV_FILE" "$ENV_FILE.backup"
    echo -e "${BLUE}   Backed up existing .env to .env.backup${NC}"
    
    # Update or add values
    if grep -q "^PACKAGE_ID=" "$ENV_FILE"; then
        sed -i '' "s|^PACKAGE_ID=.*|PACKAGE_ID=$PACKAGE_ID|" "$ENV_FILE"
    else
        echo "PACKAGE_ID=$PACKAGE_ID" >> "$ENV_FILE"
    fi
    
    if grep -q "^WHITELIST_ID=" "$ENV_FILE"; then
        sed -i '' "s|^WHITELIST_ID=.*|WHITELIST_ID=$WHITELIST_ID|" "$ENV_FILE"
    else
        echo "WHITELIST_ID=$WHITELIST_ID" >> "$ENV_FILE"
    fi
    
    if grep -q "^CAP_ID=" "$ENV_FILE"; then
        sed -i '' "s|^CAP_ID=.*|CAP_ID=$CAP_ID|" "$ENV_FILE"
    else
        echo "CAP_ID=$CAP_ID" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✅ .env file updated!${NC}"
else
    echo -e "${RED}⚠️  .env file not found at $ENV_FILE${NC}"
    echo -e "${YELLOW}   Please create it with these values:${NC}"
    echo ""
    echo "PACKAGE_ID=$PACKAGE_ID"
    echo "WHITELIST_ID=$WHITELIST_ID"
    echo "CAP_ID=$CAP_ID"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Next Steps                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}1.${NC} Restart backend server to load new config:"
echo -e "   ${YELLOW}cd backend && docker-compose restart${NC}"
echo ""
echo -e "${BLUE}2.${NC} Test whitelist price endpoint:"
echo -e "   ${YELLOW}curl http://localhost:8000/api/seal/whitelist-price${NC}"
echo ""
echo -e "${BLUE}3.${NC} Test payment flow from frontend:"
echo -e "   ${YELLOW}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}4.${NC} Admin can withdraw collected funds:"
echo -e "   ${YELLOW}sui client call --package $PACKAGE_ID \\${NC}"
echo -e "   ${YELLOW}  --module whitelist --function withdraw_all \\${NC}"
echo -e "   ${YELLOW}  --args $WHITELIST_ID $CAP_ID \\${NC}"
echo -e "   ${YELLOW}  --gas-budget 10000000${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
