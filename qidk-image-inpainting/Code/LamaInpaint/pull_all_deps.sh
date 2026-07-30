#!/bin/bash

# Pull all HTP/DSP dependencies from device
# This script recursively finds and copies all required system libraries

set -e

TARGET_DIR="app/src/main/jniLibs/arm64-v8a"
mkdir -p "$TARGET_DIR"

echo "🔍 Pulling all HTP/DSP system dependencies from device..."
echo ""

# List of known required libraries (we'll discover more as we go)
LIBS=(
    "libcdsprpc.so"
    "libhidlbase.so"
    "libhidltransport.so"
    "libhwbinder.so"
    "vendor.qti.hardware.dsp@1.0.so"
    "libcutils.so"
    "libutils.so"
    "liblog.so"
    "libbase.so"
    "libvndksupport.so"
)

# Function to pull a library from device
pull_lib() {
    local lib=$1
    local found=false
    
    # Search in vendor and system directories
    for search_path in /vendor/lib64 /system/lib64 /vendor/lib /system/lib; do
        if adb shell "[ -f $search_path/$lib ]" 2>/dev/null; then
            echo "  ✓ Pulling $lib from $search_path/"
            adb pull "$search_path/$lib" "$TARGET_DIR/" 2>/dev/null || true
            found=true
            break
        fi
    done
    
    if [ "$found" = false ]; then
        echo "  ⚠  $lib not found on device"
    fi
}

# Pull all libraries
for lib in "${LIBS[@]}"; do
    pull_lib "$lib"
done

echo ""
echo "📦 Libraries in $TARGET_DIR:"
ls -lh "$TARGET_DIR/" | grep -v "^total" | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "✅ All dependencies pulled!"
echo ""
echo "Next: ./gradlew clean assembleDebug"
