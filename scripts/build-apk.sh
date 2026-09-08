#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
export ANDROID_HOME="$ANDROID_SDK_ROOT"

if [ ! -f android/local.properties ]; then
  sh scripts/setup-android-sdk.sh
fi

if [ ! -f android/app/debug.keystore ]; then
  keytool -genkeypair \
    -keystore android/app/debug.keystore \
    -alias androiddebugkey \
    -storepass android \
    -keypass android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Respotify, OU=Debug, O=Respotify, L=Local, ST=NA, C=NA"
fi

cd android
./gradlew assembleDebug --no-daemon

mkdir -p "$ROOT/releases"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/releases/respotify-debug.apk"
ls -lh "$ROOT/releases/respotify-debug.apk"
