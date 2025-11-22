#!/bin/bash

echo "========================================="
echo "🔐 SEAL + WALRUS API TESTS"
echo "========================================="
echo ""

# Test 1: Health Check
echo "📍 Test 1: Health Check"
curl -s http://localhost:3000/api/health | jq
echo ""
echo ""

# Test 2: Encrypt a file
echo "📍 Test 2: Encrypt & Store File"
echo "Creating test file..."
echo "This is a secret message for Seal encryption!" > /tmp/test-seal-file.txt

ENCRYPT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/seal/encrypt \
  -F "file=@/tmp/test-seal-file.txt")

echo "$ENCRYPT_RESPONSE" | jq

# Extract metadata blob ID
METADATA_BLOB_ID=$(echo "$ENCRYPT_RESPONSE" | jq -r '.data.metadataBlobId')
echo ""
echo "✅ Metadata Blob ID: $METADATA_BLOB_ID"
echo ""
echo ""

# Test 3: Get Metadata
echo "📍 Test 3: Get Metadata"
curl -s "http://localhost:3000/api/seal/metadata/$METADATA_BLOB_ID" | jq
echo ""
echo ""

# Test 4: Get Session Message
echo "📍 Test 4: Get Session Message (pour signer avec wallet)"
curl -s -X POST http://localhost:3000/api/seal/session-message \
  -H "Content-Type: application/json" \
  -d '{"address":"0x904f64f755764162a228a7da49b1288160597165ec60ebbf5fb9a94957db76c3"}' | jq
echo ""
echo ""

echo "========================================="
echo "✅ Tests terminés!"
echo "========================================="
echo ""
echo "Pour tester le decrypt, vous aurez besoin de:"
echo "  1. Le metadata blob ID: $METADATA_BLOB_ID"
echo "  2. Votre adresse wallet"
echo "  3. Signer le message avec votre wallet"
echo ""
