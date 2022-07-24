#!/bin/bash

alias=r1

# 20220729
file=/etc/udev/rules.d/rtl-sdr.rules
if [[ -e /usr/bin/rtsp-simple-server && ! -e $file ]]; then
	echo 'SUBSYSTEMS=="usb", ENV{ID_SOFTWARE_RADIO}="1", RUN+="/srv/http/bash/settings/features.sh pushrefresh"' > $file
	udevadm control --reload-rules
	udevadm trigger
fi
grep -q gpio-poweroff /boot/config.txt && sed -i '/gpio-poweroff\|gpio-shutdown/ d' /boot/config.txt

# 20220708
sed -i 's/mpd.service/startup.service/' /etc/systemd/system/upmpdcli.service

# 20220610
if [[ -e /usr/bin/camilladsp && ! -e /srv/http/settings/camillagui/build/colors.css ]]; then
	ln -sf /srv/http/assets/css/colors.css /srv/http/settings/camillagui/build
	ln -sf /srv/http/assets/img/icon.png /srv/http/settings/camillagui/build
fi

sed -i -e 's/\s*Flat/Flat/
' -e '/Flat^/ d
' /srv/http/data/system/equalizer.presets &> /dev/null

file=/srv/http/data/camilladsp/configs/default_config.yml
if grep -q 'format: *$' $file; then
	format=$( grep 'format: .\+$' /srv/http/data/camilladsp/configs/camilladsp.yml \
				| tail -1 \
				| awk '{print $NF}' )
	sed -i "s/format: *$/format: $format/" $file
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

installfinish
