#!/bin/sh
# Builds latent.apk inside an Android SDK container.
#
# Environment:
#   LATENT_APP_URL       web app URL the APK loads (required)
#   LATENT_VERSION_NAME  versionName (default 0.1.0)
#   LATENT_VERSION_CODE  versionCode (default 1)
#   OUT_DIR              where latent.apk is written (default <android>/build)
set -eu

SRC_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
WORK_DIR=${WORK_DIR:-/tmp/latent-apk}
OUT_DIR=${OUT_DIR:-$SRC_DIR/build}
APP_URL=${LATENT_APP_URL:?set LATENT_APP_URL to the web app URL}
VERSION_NAME=${LATENT_VERSION_NAME:-0.1.0}
VERSION_CODE=${LATENT_VERSION_CODE:-1}

MIN_SDK=24
TARGET_SDK=34

SDK=${ANDROID_HOME:-/opt/android-sdk-linux}
BUILD_TOOLS="$SDK/build-tools/34.0.0"
ANDROID_JAR="$SDK/platforms/android-34/android.jar"

if [ ! -f "$ANDROID_JAR" ]; then
  echo "Android platform 34 not found under $SDK" >&2
  exit 1
fi

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/res" "$WORK_DIR/classes" "$WORK_DIR/dex" "$WORK_DIR/flat" "$WORK_DIR/gen" "$OUT_DIR"

# Resources: the checked-in ones plus the build-time app URL.
cp -R "$SRC_DIR/app/res/." "$WORK_DIR/res/"
cat > "$WORK_DIR/res/values/config.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_url" translatable="false">$APP_URL</string>
</resources>
EOF

python3 "$SRC_DIR/tools/make_icons.py" "$WORK_DIR/res"

echo "==> compiling resources"
"$BUILD_TOOLS/aapt2" compile --dir "$WORK_DIR/res" -o "$WORK_DIR/flat"

echo "==> linking resources"
"$BUILD_TOOLS/aapt2" link \
  -o "$WORK_DIR/base.apk" \
  -I "$ANDROID_JAR" \
  --manifest "$SRC_DIR/app/AndroidManifest.xml" \
  --min-sdk-version "$MIN_SDK" \
  --target-sdk-version "$TARGET_SDK" \
  --version-code "$VERSION_CODE" \
  --version-name "$VERSION_NAME" \
  --auto-add-overlay \
  --java "$WORK_DIR/gen" \
  "$WORK_DIR/flat"/*.flat

echo "==> compiling Java"
javac \
  --release 11 \
  -classpath "$ANDROID_JAR" \
  -d "$WORK_DIR/classes" \
  $(find "$SRC_DIR/app/src" "$WORK_DIR/gen" -name '*.java')

echo "==> dexing"
find "$WORK_DIR/classes" -name '*.class' > "$WORK_DIR/classes.txt"
"$BUILD_TOOLS/d8" --release --lib "$ANDROID_JAR" --min-api "$MIN_SDK" \
  --output "$WORK_DIR/dex" $(cat "$WORK_DIR/classes.txt")

echo "==> packaging dex"
(cd "$WORK_DIR/dex" && zip -q -X "$WORK_DIR/base.apk" classes.dex)

echo "==> aligning"
"$BUILD_TOOLS/zipalign" -f -p 4 "$WORK_DIR/base.apk" "$WORK_DIR/aligned.apk"

KEYSTORE="$SRC_DIR/.keystore/debug.jks"
if [ ! -f "$KEYSTORE" ]; then
  echo "==> creating debug keystore"
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair \
    -keystore "$KEYSTORE" \
    -storepass android -keypass android \
    -alias latent -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Latent Debug, O=Latent, C=US" >/dev/null 2>&1
fi

echo "==> signing"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android --key-pass pass:android \
  --ks-key-alias latent \
  --out "$OUT_DIR/latent.apk" \
  "$WORK_DIR/aligned.apk"

"$BUILD_TOOLS/apksigner" verify --print-certs "$OUT_DIR/latent.apk" | head -n 3
echo "APK written to $OUT_DIR/latent.apk"
