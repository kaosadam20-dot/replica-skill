#!/bin/sh
# Builds the installable Android APK for the Latent web app.
#
#   ./android/build.sh https://latent.example.com
#   LATENT_APP_URL=https://latent.example.com ./android/build.sh
#
# The URL is baked into the APK at build time: it is the web app the shell
# loads. Rebuild with a new URL when the app moves to another host.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
IMAGE=${ANDROID_BUILD_IMAGE:-ghcr.io/cirruslabs/android-sdk:34}
APP_URL=${LATENT_APP_URL:-${1:-}}

if [ -z "$APP_URL" ]; then
  echo "usage: ./android/build.sh <app-url>" >&2
  echo "   or: LATENT_APP_URL=<app-url> ./android/build.sh" >&2
  exit 2
fi

exec docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e LATENT_APP_URL="$APP_URL" \
  -e LATENT_VERSION_NAME="${LATENT_VERSION_NAME:-0.1.0}" \
  -e LATENT_VERSION_CODE="${LATENT_VERSION_CODE:-1}" \
  -v "$ROOT":/src \
  -w /src/android \
  "$IMAGE" \
  sh /src/android/build-apk.sh
