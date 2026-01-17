#!/bin/bash

# Firebase App Distribution Helper Script
# Usage: ./scripts/distribute-firebase.sh [ios|android] [path-to-build] [release-notes]

set -e

PLATFORM=${1:-ios}
BUILD_PATH=${2}
RELEASE_NOTES=${3:-"New build distributed via Firebase App Distribution"}
GROUP_NAME=${4:-"trusted-testers"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Firebase App Distribution Script${NC}"
echo "Platform: $PLATFORM"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}Warning: Not logged in to Firebase${NC}"
    echo "Run: firebase login"
    exit 1
fi

# Get App ID from environment or prompt
if [ "$PLATFORM" = "ios" ]; then
    APP_ID=${FIREBASE_APP_ID_IOS}
    FILE_EXT="ipa"
    DEFAULT_EXT=".ipa"
else
    APP_ID=${FIREBASE_APP_ID_ANDROID}
    FILE_EXT="aab"
    DEFAULT_EXT=".aab"
fi

if [ -z "$APP_ID" ]; then
    echo -e "${YELLOW}Warning: FIREBASE_APP_ID_${PLATFORM^^} environment variable not set${NC}"
    echo "Please set it or provide the App ID:"
    read -p "Enter Firebase App ID for $PLATFORM: " APP_ID
fi

if [ -z "$APP_ID" ]; then
    echo -e "${RED}Error: App ID is required${NC}"
    exit 1
fi

# If build path not provided, try to find latest build
if [ -z "$BUILD_PATH" ]; then
    echo -e "${YELLOW}Build path not provided. Looking for recent builds...${NC}"
    
    # Check common EAS build download locations
    if [ -d "./builds" ]; then
        LATEST_BUILD=$(find ./builds -name "*.$FILE_EXT" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        if [ -n "$LATEST_BUILD" ]; then
            BUILD_PATH="$LATEST_BUILD"
            echo "Found build: $BUILD_PATH"
        fi
    fi
    
    if [ -z "$BUILD_PATH" ] || [ ! -f "$BUILD_PATH" ]; then
        echo -e "${RED}Error: Build file not found${NC}"
        echo "Usage: $0 [ios|android] [path-to-build.$FILE_EXT] [release-notes] [group-name]"
        echo ""
        echo "Example:"
        echo "  $0 ios ./builds/app.ipa \"Version 1.0.0\""
        echo "  $0 android ./builds/app.aab \"Testing new features\""
        exit 1
    fi
fi

# Validate build file exists
if [ ! -f "$BUILD_PATH" ]; then
    echo -e "${RED}Error: Build file not found: $BUILD_PATH${NC}"
    exit 1
fi

# Validate file extension
if [[ ! "$BUILD_PATH" == *".$FILE_EXT" ]]; then
    echo -e "${YELLOW}Warning: Build file doesn't have .$FILE_EXT extension${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Distributing to Firebase App Distribution...${NC}"
echo "App ID: $APP_ID"
echo "Group: $GROUP_NAME"
echo "Build: $BUILD_PATH"
echo "Release Notes: $RELEASE_NOTES"
echo ""

# Distribute using Firebase CLI
firebase appdistribution:distribute "$BUILD_PATH" \
    --app "$APP_ID" \
    --groups "$GROUP_NAME" \
    --release-notes "$RELEASE_NOTES"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Successfully distributed to Firebase App Distribution!${NC}"
    echo "Testers in group '$GROUP_NAME' will receive an email invitation."
else
    echo ""
    echo -e "${RED}✗ Distribution failed${NC}"
    exit 1
fi

