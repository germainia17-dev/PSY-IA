#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
OUT="/Users/MacBook/Desktop/companion/companion-ia/build_preview_V5.apk"
npx eas build --platform android --profile preview --local --non-interactive --output "$OUT"
echo "DONE -> $OUT"; ls -la "$OUT"
