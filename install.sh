#!/bin/bash

alias=r1

# 20220805
if [[ $( pacman -Q dab-scanner 2> /dev/null ) != 'dab-scanner 0.8-3' ]]; then
	rm -f /etc/rtsp-simple-server.yml
	pacman -Sy --noconfirm dab-scanner
fi

if [[ -e /srv/http/data/webradios ]]; then
	mv /srv/http/data/webradio{s,}
	mv /srv/http/data/{webradiosimg,webradio/img}
fi

grep -A1 'plugin.*ffmpeg' /etc/mpd.conf | grep -q no && sed -i '/decoder/,+4 d' /etc/mpd.conf

if [[ $(  uname -m ) == armv6l && $( uname -r ) != 5.10.92-2-rpi-legacy-ARCH ]]; then
	echo Downgrade kernel to 5.10.92 ...
	pkgfile=linux-rpi-legacy-5.10.92-2-armv6h.pkg.tar.xz
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

installfinish

# 20220805
udevadm control --reload-rules
udevadm trigger

if ! grep -q /srv/http/shareddata /etc/fstab; then
	echo -e "\
$info Shared data:
    • Disable
    • On server
      - Rename: $( tcolor webradios 1 ) > $( tcolor webradio 2 )
      - Move:   $( tcolor webradiosimg 1 ) > $( tcolor webradio/img 2 )
    • Re-enable again.
"
fi

if [[ ! -e /srv/http/bash/data/dabradio ]]; then
	rm -rf /srv/http/bash/dab
	rm -f /srv/http/data/webradiosimg/{dablogo*,*8554*}
	echo -e "\
$info DAB Radio:
    • Rescan for stations again.
"
fi
