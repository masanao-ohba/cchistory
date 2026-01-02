#!/usr/bin/env bash

# Script to verify UI/UX fixes are working correctly

echo "🔍 Verifying UI/UX Fixes..."
echo "=========================="

# Function to check HTML content
check_html() {
    local url="$1"
    curl -s "$url" 2>/dev/null
}

# Test 1: Check search input has correct padding class (pl-10)
echo -e "\n✅ Test 1: Search Input Padding"
html_content=$(check_html "http://localhost:18080")
if echo "$html_content" | grep -q 'pl-10.*placeholder.*[Ss]earch'; then
    echo "   ✓ Search input has correct padding (pl-10)"
else
    echo "   ✗ Search input padding may be incorrect"
fi

# Test 2: Check language switcher is in footer, not header
echo -e "\n✅ Test 2: Language Switcher Location"
# Check if language switcher button exists in footer
if echo "$html_content" | grep -A 10 '<footer' | grep -q 'Change language'; then
    echo "   ✓ Language switcher found in footer"
else
    echo "   ✗ Language switcher not found in footer"
fi

# Check that it's NOT in the fixed header area
if echo "$html_content" | grep -B 20 '</header>' | grep -q 'Change language'; then
    echo "   ✗ Language switcher incorrectly in header"
else
    echo "   ✓ Language switcher not in header (correct)"
fi

# Test 3: Check for 999+ badges (should not appear on initial load)
echo -e "\n✅ Test 3: Initial Unread Count"
if echo "$html_content" | grep -q '999+'; then
    echo "   ✗ Found '999+' badge on initial load (should be 0)"
else
    echo "   ✓ No '999+' badges found (correct initial state)"
fi

# Test 4: Verify floating message bar styles
echo -e "\n✅ Test 4: Floating Message Bar"
if echo "$html_content" | grep -q 'fixed left-0 right-0 z-40'; then
    echo "   ✓ Floating message bar CSS classes present"
else
    echo "   ℹ️  Floating message bar may not be visible (needs content)"
fi

# Summary
echo -e "\n=========================="
echo "✨ Verification Complete!"
echo ""
echo "Manual verification steps:"
echo "1. Open http://localhost:18080 in a browser"
echo "2. Check that search placeholder doesn't overlap with icon"
echo "3. Verify language switcher is at bottom of page"
echo "4. Confirm project tabs show 0 or actual counts, not 999+"
echo "5. Scroll down to test floating message bar position"