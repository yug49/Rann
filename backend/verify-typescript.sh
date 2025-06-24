#!/bin/bash

# TypeScript Files Verification Script
# Ensures all TypeScript files are properly accessible

echo "🔍 VERIFYING TYPESCRIPT FILES IN BACKEND"
echo "========================================"

cd "/Users/apple/Desktop/Genesis hackathon/Rann/backend"

echo ""
echo "📁 Checking src/ directory structure:"
find src -name "*.ts" -type f | sort

echo ""
echo "🔧 Checking TypeScript compilation:"
npx tsc --noEmit 2>&1 | head -20

echo ""
echo "📋 TypeScript file summary:"
echo "- Total .ts files: $(find src -name "*.ts" -type f | wc -l)"
echo "- Middleware files: $(find src/middleware -name "*.ts" -type f 2>/dev/null | wc -l)"
echo "- Route files: $(find src/routes -name "*.ts" -type f 2>/dev/null | wc -l)"
echo "- Service files: $(find src/services -name "*.ts" -type f 2>/dev/null | wc -l)"
echo "- Type files: $(find src/types -name "*.ts" -type f 2>/dev/null | wc -l)"

echo ""
echo "✅ TypeScript files verification complete!"
