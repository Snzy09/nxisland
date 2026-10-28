#!/usr/bin/env bash
# Builds release packages for NxIsland across operating systems
# and outputs them to their designated directories:
#   - macOS:   NotchBuddy/release/
#   - Linux:   linux/release/
#   - Windows: windows/release/
#   - Android: android/release/
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="0.5.3"
ANDROID_VERSION="0.3.0"

MAC_RELEASE="$REPO_ROOT/NotchBuddy/release"
LINUX_RELEASE="$REPO_ROOT/linux/release"
WIN_RELEASE="$REPO_ROOT/windows/release"
ANDROID_RELEASE="$REPO_ROOT/android/release"

mkdir -p "$MAC_RELEASE" "$LINUX_RELEASE" "$WIN_RELEASE" "$ANDROID_RELEASE"

echo "=== NxIsland Multi-OS Release Builder ==="
echo "Version: $VERSION (Android: $ANDROID_VERSION)"
echo

# ── 1. Linux (linux/release/) ────────────────────────────────────────────────
echo "[1/4] Checking Linux build..."
if [ "$(uname -s)" = "Linux" ]; then
    if pkg-config --exists javascriptcoregtk-4.1 2>/dev/null; then
        echo "Dependencies found. Building Linux release..."
        (
            cd "$REPO_ROOT/windows"
            [ -d "node_modules" ] || npm install
            npm run pack
        )
        echo "✓ Linux packages built into $LINUX_RELEASE"
    else
        echo "⚠ Missing Linux native dependencies for WebKitGTK 4.1."
        echo "  Install required packages:"
        if [ -f /etc/arch-release ]; then
            echo "    sudo pacman -S webkit2gtk-4.1 gtk-layer-shell gst-plugins-base gst-plugins-good"
        else
            echo "    sudo apt install libwebkit2gtk-4.1-dev libgtk-layer-shell-dev libayatana-appindicator3-dev librsvg2-dev"
        fi
        echo "  Then re-run: cd windows && npm install && npm run pack"
    fi
else
    echo "ℹ Skipping Linux native build on $(uname -s)."
fi
echo

# ── 2. macOS (NotchBuddy/release/) ───────────────────────────────────────────
echo "[2/4] Checking macOS build..."
if [ "$(uname -s)" = "Darwin" ]; then
    if command -v xcodebuild >/dev/null 2>&1; then
        echo "Building macOS release via scripts/release.sh..."
        "$REPO_ROOT/scripts/release.sh" "$VERSION"
    else
        echo "⚠ xcodebuild not found. Install Xcode to build macOS app."
    fi
else
    echo "ℹ macOS builds require Darwin host with Xcode (or GitHub Actions macos-latest runner)."
fi
echo

# ── 3. Windows (windows/release/) ────────────────────────────────────────────
echo "[3/4] Checking Windows build..."
case "$(uname -s)" in
    CYGWIN*|MINGW*|MSYS*)
        (
            cd "$REPO_ROOT/windows"
            [ -d "node_modules" ] || npm install
            npm run pack
        )
        echo "✓ Windows packages built into $WIN_RELEASE"
        ;;
    *)
        echo "ℹ Windows installer builds require Windows host or Windows CI runner."
        ;;
esac
echo

# ── 4. Android (android/release/) ────────────────────────────────────────────
echo "[4/4] Checking Android build..."
if command -v java >/dev/null 2>&1 && [ -n "${ANDROID_HOME:-}" ]; then
    echo "Building Android release APK..."
    (
        cd "$REPO_ROOT/android"
        ./gradlew assembleRelease --console=plain
        cp app/build/outputs/apk/release/app-release.apk "$ANDROID_RELEASE/NxIsland-Android-$ANDROID_VERSION.apk"
        (cd "$ANDROID_RELEASE" && sha256sum "NxIsland-Android-$ANDROID_VERSION.apk" > SHA256SUMS)
    )
    echo "✓ Android APK built into $ANDROID_RELEASE"
else
    echo "ℹ Android build requires JDK 17 and ANDROID_HOME (or GitHub Actions ubuntu runner)."
fi
echo

echo "=== Release Directory Status ==="
for d in "$LINUX_RELEASE" "$MAC_RELEASE" "$WIN_RELEASE" "$ANDROID_RELEASE"; do
    rel="${d#$REPO_ROOT/}"
    count=$(find "$d" -maxdepth 1 -type f 2>/dev/null | wc -l)
    echo "$rel: $count files"
done
