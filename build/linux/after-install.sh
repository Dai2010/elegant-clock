#!/bin/sh
set -eu

APP_NAME="Elegant Clock"
DESKTOP_FILE="elegant-clock.desktop"
APP_EXEC="/opt/Elegant Clock/elegant-clock"

detect_target_user() {
  if [ -n "${ELEGANT_CLOCK_AUTOSTART_USER:-}" ]; then
    printf '%s\n' "$ELEGANT_CLOCK_AUTOSTART_USER"
    return
  fi

  if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
    printf '%s\n' "$SUDO_USER"
    return
  fi

  logname 2>/dev/null || true
}

user_home() {
  getent passwd "$1" 2>/dev/null | awk -F: '{ print $6 }'
}

write_autostart_file() {
  target_user="$1"
  target_home=$(user_home "$target_user")

  if [ -z "$target_home" ] || [ ! -d "$target_home" ]; then
    echo "Elegant Clock: cannot find a home directory for '$target_user'; skip autostart." >&2
    return 0
  fi

  autostart_dir="$target_home/.config/autostart"
  autostart_file="$autostart_dir/$DESKTOP_FILE"
  mkdir -p "$autostart_dir"
  cat > "$autostart_file" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Launch Elegant Clock on login
Exec="$APP_EXEC" --autostart
Icon=elegant-clock
Terminal=false
Categories=Utility;
X-GNOME-Autostart-enabled=true
StartupWMClass=$APP_NAME
EOF
  chmod 644 "$autostart_file"
  chown "$target_user:$target_user" "$autostart_file" 2>/dev/null || chown "$target_user" "$autostart_file" 2>/dev/null || true
  echo "Elegant Clock: autostart enabled for '$target_user' via XDG Autostart."
}

should_enable_autostart() {
  case "${ELEGANT_CLOCK_AUTOSTART:-}" in
    1|yes|YES|true|TRUE|on|ON)
      return 0
      ;;
    0|no|NO|false|FALSE|off|OFF)
      return 1
      ;;
  esac

  if [ "${DEBIAN_FRONTEND:-}" = "noninteractive" ] || [ ! -r /dev/tty ] || [ ! -w /dev/tty ]; then
    echo "Elegant Clock: non-interactive install detected; skip autostart prompt. Enable it later in Settings."
    return 1
  fi

  target_user=$(detect_target_user)
  if [ -z "$target_user" ]; then
    printf 'Enter the Linux username to configure Elegant Clock autostart for (leave empty to skip): ' > /dev/tty
    read -r target_user < /dev/tty || target_user=""
    [ -n "$target_user" ] || return 1
    ELEGANT_CLOCK_AUTOSTART_USER="$target_user"
    export ELEGANT_CLOCK_AUTOSTART_USER
  fi

  printf 'Enable Elegant Clock autostart for user %s? [y/N] ' "$target_user" > /dev/tty
  read -r reply < /dev/tty || reply=""
  case "$reply" in
    y|Y|yes|YES)
      ELEGANT_CLOCK_AUTOSTART_USER="$target_user"
      export ELEGANT_CLOCK_AUTOSTART_USER
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

target_user=$(detect_target_user)
if should_enable_autostart; then
  target_user=$(detect_target_user)
  if [ -n "$target_user" ]; then
    write_autostart_file "$target_user"
  fi
fi

exit 0
