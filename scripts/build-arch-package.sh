#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
APP_DIR="$ROOT_DIR/dist/linux-unpacked"
PACKAGE_ROOT="$ROOT_DIR/dist/arch-package-root"
VERSION=$(node -p "require('./package.json').version")
ARTIFACT="$ROOT_DIR/dist/Elegant-Clock-${VERSION}-Arch-x86_64.pkg.tar.zst"

if [ ! -d "$APP_DIR" ]; then
  echo "Missing $APP_DIR. Run npm run dist:linux before package:arch." >&2
  exit 1
fi

command -v bsdtar >/dev/null 2>&1 || {
  echo "bsdtar is required. Install libarchive-tools." >&2
  exit 1
}

command -v zstd >/dev/null 2>&1 || {
  echo "zstd is required." >&2
  exit 1
}

rm -rf "$PACKAGE_ROOT" "$ARTIFACT"
mkdir -p \
  "$PACKAGE_ROOT/opt/elegant-clock" \
  "$PACKAGE_ROOT/usr/share/applications" \
  "$PACKAGE_ROOT/usr/share/icons/hicolor/256x256/apps" \
  "$PACKAGE_ROOT/usr/share/icons/hicolor/512x512/apps"

cp -a "$APP_DIR/." "$PACKAGE_ROOT/opt/elegant-clock/"
cp "$ROOT_DIR/build/icons/256x256.png" "$PACKAGE_ROOT/usr/share/icons/hicolor/256x256/apps/elegant-clock.png"
cp "$ROOT_DIR/build/icons/512x512.png" "$PACKAGE_ROOT/usr/share/icons/hicolor/512x512/apps/elegant-clock.png"

cat > "$PACKAGE_ROOT/usr/share/applications/elegant-clock.desktop" <<'EOF'
[Desktop Entry]
Name=Elegant Clock
Comment=Customizable desktop clock with countdown, stopwatch, pomodoro, and reminders
Exec=/opt/elegant-clock/elegant-clock %U
Terminal=false
Type=Application
Icon=elegant-clock
Categories=Utility;
StartupWMClass=Elegant Clock
EOF

INSTALLED_SIZE=$(du -sb "$PACKAGE_ROOT/opt" "$PACKAGE_ROOT/usr" | awk '{ total += $1 } END { print total }')
BUILD_DATE=$(date +%s)

cat > "$PACKAGE_ROOT/.PKGINFO" <<EOF
pkgname = elegant-clock
pkgbase = elegant-clock
pkgver = ${VERSION}
pkgdesc = Customizable desktop clock with countdown, stopwatch, pomodoro, and reminders
url = https://github.com/Dai2010/elegant-clock
builddate = ${BUILD_DATE}
packager = Dai2010
size = ${INSTALLED_SIZE}
arch = x86_64
license = GPL-3.0-only
depend = gtk3
depend = nss
depend = libxss
depend = libxtst
depend = libnotify
depend = xdg-utils
depend = alsa-lib
depend = libxkbcommon
depend = at-spi2-core
depend = hicolor-icon-theme
EOF

(
  cd "$PACKAGE_ROOT"
  bsdtar -czf .MTREE --format=mtree --options='!all,use-set,type,uid,gid,mode,time,size,md5,sha256,link' .PKGINFO opt usr
  bsdtar --uid 0 --gid 0 --numeric-owner -cf - .PKGINFO .MTREE opt usr | zstd -T0 -19 -o "$ARTIFACT"
)

echo "Created $ARTIFACT"
