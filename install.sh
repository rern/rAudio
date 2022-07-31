#!/bin/bash

alias=r1

# 20220805
[[ $( pacman -Q dab-scanner 2> /dev/null ) == 'dab-scanner 0.8-1' ]] && pacman -Sy --noconfirm dab-scanner
if [[ -e /srv/http/bash/dab ]]; then
	rm -rf /srv/http/bash/dab
	rm -f /srv/http/data/webradiosimg/{dablogo*,rtsp*8554*}
	stations=$( sed '1,/^paths:/ d' /etc/rtsp-simple-server/rtsp-simple-server.yml )
	[[ $stations ]] && echo "$stations" | sed 's|dab/dabstart|dab-start|' >> /etc/rtsp-simple-server.yml
	mv /srv/http/data/{webradios/DAB,dabradio}
	count=$( ls -1 /srv/http/data/dabradio | wc -l )
	sed -i '/"webradio":/ i\  "dabradio": '$count',' /srv/http/data/mpd/counts
	mkdir /srv/http/data/dabradio/img
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

# 20220805
udevadm control --reload-rules
udevadm trigger

installfinish
