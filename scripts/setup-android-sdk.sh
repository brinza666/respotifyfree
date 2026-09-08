#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export ANDROID_HOME="$SDK_ROOT"
SM="$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager"

if [ ! -x "$SM" ]; then
  echo "Android cmdline-tools missing at $SM" >&2
  echo "Re-run workspace setup, or unpack commandlinetools into $SDK_ROOT/cmdline-tools/latest" >&2
  exit 1
fi

mkdir -p "$SDK_ROOT"
yes | "$SM" --sdk_root="$SDK_ROOT" --licenses >/dev/null || true
"$SM" --sdk_root="$SDK_ROOT" --install \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0"

printf 'sdk.dir=%s\n' "$SDK_ROOT" > "$ROOT/android/local.properties"
echo "Android SDK ready at $SDK_ROOT"
