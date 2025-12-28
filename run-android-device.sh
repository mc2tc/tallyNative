#!/bin/bash

# Auto-detect Android physical device and run Expo
# Finds the first physical device (excludes emulators)

# Get list of devices and find physical device (exclude emulators)
DEVICE_ID=$(adb devices | grep -v "emulator-" | grep "device$" | awk '{print $1}' | head -n 1)

if [ -z "$DEVICE_ID" ]; then
  echo "No Android device found. Please connect a device via USB or enable USB debugging."
  exit 1
fi

# Get device model name (Expo uses model name, not device ID)
# Replace spaces with underscores to match Expo's format
DEVICE_MODEL=$(adb -s "$DEVICE_ID" shell getprop ro.product.model | tr -d '\r\n' | tr ' ' '_')

if [ -z "$DEVICE_MODEL" ]; then
  echo "Could not get device model name for device: $DEVICE_ID"
  exit 1
fi

echo "Found device: $DEVICE_MODEL ($DEVICE_ID)"
echo "Running Expo on device..."
npx expo run:android --device "$DEVICE_MODEL"

