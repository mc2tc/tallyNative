#!/bin/bash

# Auto-detect Android emulator and run Expo
# Finds the first emulator device (device ID starting with "emulator-")

# Get list of devices and find emulator
EMULATOR_ID=$(adb devices | grep "emulator-" | awk '{print $1}' | head -n 1)

if [ -z "$EMULATOR_ID" ]; then
  echo "No Android emulator found. Please start an emulator first."
  exit 1
fi

# Get AVD name from the running emulator using adb (most reliable method)
# Fall back to parsing process command line if adb command fails
AVD_NAME=$(adb -s "$EMULATOR_ID" emu avd name 2>/dev/null | head -n 1 | tr -d '\r\n')

# If adb command didn't work, try parsing the process command line
if [ -z "$AVD_NAME" ] || [ "$AVD_NAME" = "OK" ]; then
  # Try @ format first (older emulator versions)
  AVD_NAME=$(ps aux | grep -i "qemu.*@" | grep -v grep | sed -n 's/.*@\([^ ]*\).*/\1/p' | head -n 1)
  
  # If that didn't work, try -avd format (newer emulator versions)
  if [ -z "$AVD_NAME" ]; then
    AVD_NAME=$(ps aux | grep -i "qemu.*-avd" | grep -v grep | sed -n 's/.*-avd \([^ ]*\).*/\1/p' | head -n 1)
  fi
fi

if [ -z "$AVD_NAME" ] || [ "$AVD_NAME" = "OK" ]; then
  echo "Could not determine AVD name for emulator: $EMULATOR_ID"
  echo "Please ensure the emulator is running."
  exit 1
fi

echo "Found emulator: $AVD_NAME ($EMULATOR_ID)"
echo "Running Expo on emulator..."
npx expo run:android --device "$AVD_NAME"

