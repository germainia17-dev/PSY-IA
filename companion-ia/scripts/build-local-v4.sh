#!/usr/bin/env bash
# Build local de l'APK (ne consomme PAS le quota EAS cloud).
set -euo pipefail
cd "$(dirname "$0")/.."

export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "JAVA: $(java -version 2>&1 | head -1)"
echo "ANDROID_HOME: $ANDROID_HOME"

OUT="/Users/MacBook/Desktop/companion/companion-ia/build_preview_V4.apk"

# --local = build sur cette machine, illimité. Credentials récupérés depuis EAS.
npx eas build --platform android --profile preview --local --non-interactive --output "$OUT"

echo "DONE -> $OUT"
ls -la "$OUT"
