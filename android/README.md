# Latent for Android

The app stays one web surface. This directory wraps it in a native Android
shell (a single full-screen `WebView` activity) and builds an installable APK
without Gradle: `javac`, `d8`, `aapt2` and `apksigner` from the Android SDK
build-tools do the work.

## What the APK is

- App id `app.latent.mobile`, label **Latent**, portrait, dark status bar.
- Loads the web app from the URL baked in at build time, so sessions,
  cookies and routing behave exactly as in the browser (same origin).
- Camera: the shell grants `getUserMedia` video capture after the Android
  CAMERA permission prompt, so recording uses the real camera and falls back
  to the generated desk scene when it is denied.
- Hardware back navigates the web app history; links to other hosts open in
  the browser; a small retry screen appears if the app cannot be reached.
- HTTPS only. Cleartext is permitted for `localhost` and `10.0.2.2` so the
  APK can be pointed at a local dev server.

Because the web app needs its API and database, the APK points at a running
deployment. Rebuild it whenever that URL changes.

## Build

Requires Docker. The build image is `ghcr.io/cirruslabs/android-sdk:34`
(JDK 21, platform 34, build-tools 34.0.0).

```bash
./android/build.sh https://<your-app-host>
```

or

```bash
LATENT_APP_URL=https://<your-app-host> \
LATENT_VERSION_NAME=0.1.0 \
LATENT_VERSION_CODE=1 \
./android/build.sh
```

Output: `android/build/latent.apk` (debug-signed with the local keystore in
`android/.keystore/`, created on first build and kept out of git).

For a Play Store upload, sign with your own release key instead:
`apksigner sign --ks <release.jks> ...`, and bump `LATENT_VERSION_CODE` for
every upload.

## Install

```bash
adb install -r android/build/latent.apk
```

Or copy the APK to the phone and open it (allow installing from unknown
sources for the file manager/browser you use).

## Layout

```
android/
  build.sh                  host wrapper: runs the container build
  build-apk.sh              in-container compile/dex/link/sign
  app/AndroidManifest.xml
  app/src/app/latent/mobile/MainActivity.java
  app/res/                  theme, colours, network config, adaptive icon
  tools/make_icons.py       renders launcher icons (stdlib only)
```
