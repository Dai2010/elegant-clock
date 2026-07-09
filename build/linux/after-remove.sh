#!/bin/sh
set -eu

DESKTOP_FILE="elegant-clock.desktop"

remove_autostart_file() {
  target_home="$1"
  autostart_file="$target_home/.config/autostart/$DESKTOP_FILE"

  if [ -f "$autostart_file" ]; then
    rm -f "$autostart_file"
  fi
}

if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
  target_home=$(getent passwd "$SUDO_USER" 2>/dev/null | awk -F: '{ print $6 }')
  [ -n "$target_home" ] && remove_autostart_file "$target_home"
fi

if [ -d /home ]; then
  for target_home in /home/*; do
    [ -d "$target_home" ] && remove_autostart_file "$target_home"
  done
fi

remove_autostart_file /root

exit 0
