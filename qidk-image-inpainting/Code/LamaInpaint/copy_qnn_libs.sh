#!/bin/bash

# Script to copy QNN HTP native libraries from Qualcomm SDK to app's jniLibs
# Snapdragon 8 Gen 3 uses HTP (Hexagon Tensor Processor), not DSP
# This bundles the required HTP stub libraries with your APK

set -e  # Exit on any error

# CONFIGURE THIS: Path to your Qualcomm QNN SDK installation
# Example: QNN_SDK_PATH="$HOME/qairt/2.29.0.241120"
# Or: QNN_SDK_PATH="$HOME/Qualcomm/QNN/2.29.0"
QNN_SDK_PATH="/home/amay/Desktop/qidk/qairt/2.38.0.250901/lib/aarch64-android"

# Validate SDK path is set
if [ -z "$QNN_SDK_PATH" ]; then
    echo "❌ ERROR: QNN_SDK_PATH is not set!"
    echo ""
    echo "Please edit this script and set QNN_SDK_PATH to your Qualcomm SDK installation."
    echo "Examples:"
    echo "  QNN_SDK_PATH=\"\$HOME/qairt/2.29.0.241120\""
    echo "  QNN_SDK_PATH=\"\$HOME/Qualcomm/QNN/2.29.0\""
    echo ""
    echo "To find it, try:"
    echo "  find ~ -name \"libQnnHtp.so\" -path \"*/aarch64-android/*\" 2>/dev/null"
    exit 1
fi

# Validate SDK path exists
if [ ! -d "$QNN_SDK_PATH" ]; then
    echo "❌ ERROR: SDK path does not exist: $QNN_SDK_PATH"
    exit 1
fi

echo "Using QNN SDK at: $QNN_SDK_PATH"

# Define target directory
TARGET_DIR="app/src/main/jniLibs/arm64-v8a"
mkdir -p "$TARGET_DIR"

# Search for HTP libraries in SDK (aarch64-android directory)
HTP_LIB_DIR=$(find "$QNN_SDK_PATH" -type d -path "*/lib/aarch64-android" 2>/dev/null | head -n 1)

if [ -z "$HTP_LIB_DIR" ]; then
    echo "❌ ERROR: aarch64-android lib directory not found in SDK!"
    echo "Searched in: $QNN_SDK_PATH"
    exit 1
fi

echo "Found HTP libraries in: $HTP_LIB_DIR"
echo "Copying HTP libraries..."

# Copy all HTP-related libraries
# Core HTP runtime
cp "$HTP_LIB_DIR/libQnnHtp.so" "$TARGET_DIR/" 2>/dev/null && echo "  ✓ libQnnHtp.so" || echo "  ✗ libQnnHtp.so (missing)"

# HTP version stubs (V79 for Snapdragon 8 Gen 3)
cp "$HTP_LIB_DIR/libQnnHtpV79Stub.so" "$TARGET_DIR/" 2>/dev/null && echo "  ✓ libQnnHtpV79Stub.so" || echo "  ⚠  libQnnHtpV79Stub.so (missing)"
cp "$HTP_LIB_DIR/libQnnHtpV79CalculatorStub.so" "$TARGET_DIR/" 2>/dev/null && echo "  ✓ libQnnHtpV79CalculatorStub.so" || echo "  ⚠  libQnnHtpV79CalculatorStub.so (missing)"

# Also copy earlier stubs for compatibility
cp "$HTP_LIB_DIR/libQnnHtpV75Stub.so" "$TARGET_DIR/" 2>/dev/null && echo "  ✓ libQnnHtpV75Stub.so" || true
cp "$HTP_LIB_DIR/libQnnHtpV73Stub.so" "$TARGET_DIR/" 2>/dev/null && echo "  ✓ libQnnHtpV73Stub.so" || true

# HTP support libraries
cp "$HTP_LIB_DIR/libQnnHtpPrepare.so" "$TARGET_DIR/" 2>/dev/null && echo "  ✓ libQnnHtpPrepare.so" || true
cp "$HTP_LIB_DIR/libQnnSystem.so" "$TARGET_DIR/" 2>/dev/null && echo "  ✓ libQnnSystem.so" || true

# Count copied files
COPIED_COUNT=$(ls "$TARGET_DIR"/libQnnHtp*.so 2>/dev/null | wc -l)

if [ "$COPIED_COUNT" -lt 2 ]; then
    echo ""
    echo "❌ ERROR: Failed to copy essential HTP libraries!"
    echo "At minimum, we need libQnnHtp.so and libQnnHtpV79Stub.so"
    exit 1
fi

echo ""
echo "✅ Successfully copied $COPIED_COUNT HTP libraries to $TARGET_DIR/"
echo ""
echo "Next steps:"
echo "  1. Rebuild: ./gradlew clean assembleDebug"
echo "  2. Install: adb install -r app/build/outputs/apk/debug/app-debug.apk"
echo "  3. Test NPU backend (should work now with HTP!)"
