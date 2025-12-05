#!/bin/bash

# Run EVALS for both local and anthropic providers
# Generates separate failure reports for easy copy/paste

echo "==================================================================================="
echo "Running EVALS for BOTH providers (local + anthropic)"
echo "==================================================================================="

# Run local provider tests
echo ""
echo "🔵 Testing LOCAL provider..."
echo "==================================================================================="
AI_PROVIDER=local node evals/run-evals.js
LOCAL_EXIT=$?

echo ""
echo ""
echo "==================================================================================="
echo "🟢 Testing ANTHROPIC provider..."
echo "==================================================================================="
AI_PROVIDER=anthropic node evals/run-evals.js
ANTHROPIC_EXIT=$?

echo ""
echo ""
echo "==================================================================================="
echo "RESULTS SUMMARY"
echo "==================================================================================="
echo ""

if [ -f "evals/failures/failures-local.txt" ]; then
  echo "📋 LOCAL PROVIDER FAILURES:"
  cat evals/failures/failures-local.txt
  echo ""
else
  echo "✅ LOCAL PROVIDER: No failures!"
  echo ""
fi

if [ -f "evals/failures/failures-anthropic.txt" ]; then
  echo "📋 ANTHROPIC PROVIDER FAILURES:"
  cat evals/failures/failures-anthropic.txt
  echo ""
else
  echo "✅ ANTHROPIC PROVIDER: No failures!"
  echo ""
fi

echo "==================================================================================="
echo "Failure reports saved to:"
echo "  - evals/failures/failures-local.txt"
echo "  - evals/failures/failures-local.json"
echo "  - evals/failures/failures-anthropic.txt"
echo "  - evals/failures/failures-anthropic.json"
echo "==================================================================================="

# Exit with error if either provider failed
if [ $LOCAL_EXIT -ne 0 ] || [ $ANTHROPIC_EXIT -ne 0 ]; then
  exit 1
fi

exit 0
