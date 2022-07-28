#!/bin/bash

alias=r1

# 20220729
if [[ $(  uname -m ) == armv6l && $( uname -r | cut -c 1-7 ) != 5.10.90 ]]; then
	echo Downgrade kernel to 5.10.90 ...
	pkgfile=linux-rpi-legacy-5.10.90-1-armv6h.pkg.tar.xz
	curl -skLO https://github.com/rern/_assets/raw/master/$pkgfile
	pacman -U --noconfirm $pkgfile
	rm $pkgfile
fi

grep -q gpio-poweroff /boot/config.txt && sed -i '/gpio-poweroff\|gpio-shutdown/ d' /boot/config.txt

# 20220708
sed -i 's/mpd.service/startup.service/' /etc/systemd/system/upmpdcli.service

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

# 20220729
udevadm control --reload-rules
udevadm trigger

installfinish
