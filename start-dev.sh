#!/bin/bash

# Development startup script for Tally Native
# Sets up Android port forwarding and starts Metro bundler

# Set up Android SDK paths
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Set up port forwarding for Android device
echo "Setting up port forwarding..."
adb reverse tcp:8081 tcp:8081

# Start Metro bundler with dev client
echo "Starting Metro bundler..."
npx expo start --dev-client

 expo start --clear