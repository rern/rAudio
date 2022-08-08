#!/bin/bash

alias=r1

# 20220805
dirdata=/srv/http/data

dab=$( pacman -Q dab-scanner 2> /dev/null )
if [[ $dab && $dab != 'dab-scanner 0.8-3' ]]; then
	rm -f /etc/rtsp-simple-server.yml $dirdata/webradiosimg/{dablogo*,rtsp*8554*}
	rm -rf /srv/http/bash/dab $dirdata/webradios/DAB
	pacman -Sy --noconfirm dab-scanner
fi

if [[ -e $dirdata/webradios ]]; then
	mv $dirdata/webradio{s,}
	mv $dirdata/{webradiosimg,webradio/img}
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

if [[ ! -e $dirdata/dabradio ]]; then
	echo -e "\
$info DAB Radio:
    • Rescan for stations again.
"
fi
