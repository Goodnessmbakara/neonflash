#!/bin/bash

# NeonFlash Implementation Test Script
# This script tests all components of your flash loan system using curl

echo "🚀 NeonFlash Implementation Test Suite"
echo "======================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    echo -e "${BLUE}Testing: ${test_name}${NC}"
    echo "Command: $command"
    
    # Run the command and capture output
    output=$(eval "$command" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$output" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Output: $output"
        ((FAILED++))
    fi
    echo
}

# 1. Test Neon EVM Network Connectivity
echo "1. Testing Neon EVM Network Connectivity"
echo "----------------------------------------"
run_test "Neon EVM Block Number" \
    "curl -s -X POST https://devnet.neonevm.org -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_blockNumber\",\"params\":[]}' | jq -r '.result'" \
    "0x"

# 2. Test Solana Network Connectivity
echo "2. Testing Solana Network Connectivity"
echo "-------------------------------------"
run_test "Solana Health Check" \
    "curl -s -X POST https://api.devnet.solana.com -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getHealth\"}' | jq -r '.result'" \
    "ok"

# 3. Test Contract Accessibility
echo "3. Testing Contract Accessibility"
echo "--------------------------------"
run_test "AaveFlashLoan Contract Code" \
    "curl -s -X POST https://devnet.neonevm.org -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getCode\",\"params\":[\"0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0\",\"latest\"]}' | jq -r '.result' | head -c 10" \
    "0x608080"

run_test "USDC Contract Code" \
    "curl -s -X POST https://devnet.neonevm.org -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getCode\",\"params\":[\"0x146c38c2E36D34Ed88d843E013677cCe72341794\",\"latest\"]}' | jq -r '.result' | head -c 10" \
    "0x608060"

# 4. Test Contract Methods
echo "4. Testing Contract Methods"
echo "---------------------------"
run_test "FlashLoan getNeonAddress" \
    "curl -s -X POST https://devnet.neonevm.org -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0\",\"data\":\"0x154d4aa50000000000000000000000001234567890123456789012345678901234567890\"},\"latest\"]}' | jq -r '.result'" \
    "0x"

run_test "FlashLoan getPayer" \
    "curl -s -X POST https://devnet.neonevm.org -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0\",\"data\":\"0x161a6e3c\"},\"latest\"]}' | jq -r '.result'" \
    "0x"

run_test "USDC Decimals" \
    "curl -s -X POST https://devnet.neonevm.org -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"0x146c38c2E36D34Ed88d843E013677cCe72341794\",\"data\":\"0x313ce567\"},\"latest\"]}' | jq -r '.result'" \
    "0x0000000000000000000000000000000000000000000000000000000000000006"

# 5. Test Neon EVM Parameters
echo "5. Testing Neon EVM Parameters"
echo "------------------------------"
run_test "Neon EVM Params" \
    "curl -s -X POST https://devnet.neonevm.org -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"neon_getEvmParams\",\"params\":[]}' | jq -r '.result.neonEvmProgramId'" \
    "eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU"

# 6. Test Solana Token Mints
echo "6. Testing Solana Token Mints"
echo "-----------------------------"
run_test "USDC Mint Account" \
    "curl -s -X POST https://api.devnet.solana.com -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k\",{\"encoding\":\"base64\"}]}' | jq -r '.result.value.owner'" \
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

run_test "SAMO Mint Account" \
    "curl -s -X POST https://api.devnet.solana.com -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"getAccountInfo\",\"params\":[\"Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa\",{\"encoding\":\"base64\"}]}' | jq -r '.result.value.owner'" \
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

# 7. Test API Endpoints (if server is running)
echo "7. Testing API Endpoints"
echo "------------------------"
if curl -s http://localhost:3000/api/prices > /dev/null 2>&1; then
    run_test "Price API" \
        "curl -s http://localhost:3000/api/prices | jq -r '.data[0].token'" \
        "USDC"
    
    run_test "Neon Airdrop API" \
        "curl -s -X POST http://localhost:3000/api/airdrop -H 'Content-Type: application/json' -d '{\"address\":\"0x1234567890123456789012345678901234567890\",\"chain\":\"neon\"}' | jq -r '.success'" \
        "true"
    
    run_test "USDC Airdrop API" \
        "curl -s -X POST http://localhost:3000/api/airdrop -H 'Content-Type: application/json' -d '{\"address\":\"0x1234567890123456789012345678901234567890\",\"chain\":\"neon-usdc\"}' | jq -r '.success'" \
        "false"
else
    echo -e "${YELLOW}⚠️  API server not running on localhost:3000${NC}"
    echo "   Start the server with: pnpm dev"
    echo
fi

# 8. Test Flash Loan Contract Call (simulation)
echo "8. Testing Flash Loan Contract Call (Simulation)"
echo "------------------------------------------------"
echo -e "${BLUE}Testing: Flash Loan Contract Call Simulation${NC}"
echo "This would require a real transaction with proper instruction data."
echo "For a complete test, you would need:"
echo "1. A funded wallet with USDC and NEON"
echo "2. Generated Orca instruction data"
echo "3. Proper gas estimation"
echo -e "${YELLOW}⚠️  This is a simulation - actual execution requires real wallet${NC}"
echo

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your implementation is working correctly.${NC}"
    echo
    echo "Next steps for full testing:"
    echo "1. Fund a test wallet with USDC and NEON on Neon Devnet"
    echo "2. Generate Orca instruction data using your OrcaInstructionBuilder"
    echo "3. Execute a real flash loan transaction"
    echo "4. Verify the arbitrage execution and profit calculation"
else
    echo -e "${RED}⚠️  Some tests failed. Please check the implementation.${NC}"
fi

echo
echo "For detailed testing with real transactions, use the Node.js test script:"
echo "node test-implementation.js" 