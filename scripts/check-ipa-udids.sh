#!/bin/bash

# Script to check UDIDs in an iOS IPA file's provisioning profile
# Usage: ./scripts/check-ipa-udids.sh [path-to-ipa] [udid-to-check]

set -e

IPA_PATH=${1}
UDID_TO_CHECK=${2}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$IPA_PATH" ]; then
    echo -e "${RED}Error: IPA path is required${NC}"
    echo "Usage: $0 [path-to-ipa] [udid-to-check (optional)]"
    echo ""
    echo "Examples:"
    echo "  $0 ./builds/app.ipa"
    echo "  $0 ./builds/app.ipa 00008030-001A4D1234567890"
    exit 1
fi

if [ ! -f "$IPA_PATH" ]; then
    echo -e "${RED}Error: IPA file not found: $IPA_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}Checking provisioning profile in IPA: $IPA_PATH${NC}"
echo ""

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract IPA
echo "Extracting IPA..."
unzip -q "$IPA_PATH" -d "$TEMP_DIR"

# Find the .app bundle
APP_BUNDLE=$(find "$TEMP_DIR" -name "*.app" -type d | head -1)

if [ -z "$APP_BUNDLE" ]; then
    echo -e "${RED}Error: Could not find .app bundle in IPA${NC}"
    exit 1
fi

# Find the embedded provisioning profile
PROVISIONING_PROFILE="$APP_BUNDLE/embedded.mobileprovision"

if [ ! -f "$PROVISIONING_PROFILE" ]; then
    echo -e "${RED}Error: Could not find embedded.mobileprovision${NC}"
    exit 1
fi

echo -e "${GREEN}Found provisioning profile${NC}"
echo ""

# Extract and decode the provisioning profile
echo -e "${BLUE}=== Provisioning Profile Information ===${NC}"
DECODED_PROFILE=$(security cms -D -i "$PROVISIONING_PROFILE" 2>/dev/null || openssl smime -inform der -verify -noverify -in "$PROVISIONING_PROFILE" 2>/dev/null | plutil -convert xml1 -o - -)

if [ -z "$DECODED_PROFILE" ]; then
    echo -e "${RED}Error: Could not decode provisioning profile${NC}"
    exit 1
fi

# Extract UDIDs from the provisioning profile
UDIDS=$(echo "$DECODED_PROFILE" | grep -oE '<string>[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}</string>' | sed 's/<string>//g' | sed 's/<\/string>//g' | sort -u)

# Extract profile name
PROFILE_NAME=$(echo "$DECODED_PROFILE" | grep -A 1 "Name" | grep -oE '<string>.*</string>' | head -1 | sed 's/<string>//g' | sed 's/<\/string>//g')

# Extract bundle ID
BUNDLE_ID=$(echo "$DECODED_PROFILE" | grep -A 1 "application-identifier" | grep -oE '<string>.*</string>' | head -1 | sed 's/<string>//g' | sed 's/<\/string>//g' | sed 's/.*\.//')

# Extract expiration date
EXPIRATION_DATE=$(echo "$DECODED_PROFILE" | grep -A 1 "ExpirationDate" | grep -oE '<date>.*</date>' | sed 's/<date>//g' | sed 's/<\/date>//g')

echo "Profile Name: ${PROFILE_NAME:-N/A}"
echo "Bundle ID: ${BUNDLE_ID:-N/A}"
if [ -n "$EXPIRATION_DATE" ]; then
    EXPIRATION_FORMATTED=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$EXPIRATION_DATE" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$EXPIRATION_DATE")
    echo "Expiration Date: $EXPIRATION_FORMATTED"
fi
echo ""

# Count UDIDs
UDID_COUNT=$(echo "$UDIDS" | grep -c . || echo "0")

echo -e "${BLUE}=== Device UDIDs in Provisioning Profile ===${NC}"
echo "Total devices: $UDID_COUNT"
echo ""

if [ -z "$UDIDS" ] || [ "$UDID_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No UDIDs found in provisioning profile${NC}"
    echo "This might be a wildcard/development profile, or the profile format is different."
else
    echo "$UDIDS" | nl -w2 -s'. '
    echo ""
fi

# Check specific UDID if provided
if [ -n "$UDID_TO_CHECK" ]; then
    echo -e "${BLUE}=== Checking for UDID: $UDID_TO_CHECK ===${NC}"
    
    # Normalize the UDID (remove dashes, convert to uppercase for comparison)
    NORMALIZED_CHECK=$(echo "$UDID_TO_CHECK" | tr -d '-' | tr '[:lower:]' '[:upper:]')
    
    FOUND=false
    while IFS= read -r UDID; do
        NORMALIZED_UDID=$(echo "$UDID" | tr -d '-' | tr '[:lower:]' '[:upper:]')
        if [ "$NORMALIZED_UDID" = "$NORMALIZED_CHECK" ]; then
            FOUND=true
            break
        fi
    done <<< "$UDIDS"
    
    if [ "$FOUND" = true ]; then
        echo -e "${GREEN}✓ UDID FOUND in provisioning profile${NC}"
        echo -e "${GREEN}  This device CAN install this build${NC}"
    else
        echo -e "${RED}✗ UDID NOT FOUND in provisioning profile${NC}"
        echo -e "${YELLOW}  This device CANNOT install this build${NC}"
        echo ""
        echo "To fix this:"
        echo "1. Ensure the UDID is added to your Apple Developer account Devices"
        echo "2. Update your provisioning profile to include this device"
        echo "3. Rebuild the app with the updated provisioning profile"
        echo "4. Redistribute the new build via Firebase"
    fi
fi

echo ""
echo -e "${BLUE}Note:${NC} This checks the provisioning profile in the IPA file."
echo "If the UDID is not found, you need to rebuild with an updated profile."

