#!/bin/bash

alias=r1

# 20220606
sed -i '/Flat/ d' /srv/http/data/system/equalizer.presets &> /dev/null

file=/srv/http/data/camilladsp/configs/default_config.yml
if grep -q 'format: *$' $file; then
	format=$( grep 'format: .\+$' /srv/http/data/camilladsp/configs/camilladsp.yml \
				| tail -1 \
				| awk '{print $NF}' )
	sed -i "s/format: *$/format: $format/" $file
fi

# 20220527
if [[ $( pacman -Q camilladsp 2> /dev/null ) == 'camilladsp 0.6.3-1' ]]; then
	systemctl stop camilladsp camillagui
	pacman -R --noconfirm camillagui
	pacman -Sy --noconfirm camilladsp camillagui-backend python-pycamilladsp python-pycamilladsp-plot
	rm -rf /srv/http/settings/camillagui/build
	mkdir /srv/http/settings/camillagui/build
	ln -sf /srv/http/assets/fonts /srv/http/settings/camillagui/build
fi
if grep -q 'force user = mpd' /etc/samba/smb.conf; then
	sed -i 's/\(force user = \).*/\1http/' /etc/samba/smb.conf
	systemctl try-restart smb
fi

# 20220505
[[ ! -e /srv/http/data/system/asoundcard && ! -e /srv/http/data/shm/nosound ]] && cp /srv/http/data/{shm,system}/asoundcard

dir=/srv/http/shareddata
if [[ -e $dir ]]; then
	chown -h http:http $dir/*/
	chown -h mpd:audio $dir $dir/{mpd,playlist} $dir/mpd/mpd.db $dir/playlists/* 2> /dev/null
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

# 20220522
if [[ -e /srv/http/bash/features.sh ]]; then
	echo 'PATH+=:/srv/http/bash:/srv/http/bash/settings:/opt/vc/bin' > /root/.profile
	rm -f /srv/http/bash/{features*,networks*,player*,relays.*,relays-data*,system*}
fi

# 20220528
chmod +x /srv/http/bash/cmd.sh
/srv/http/bash/cmd.sh dirpermissions

udevadm control --reload-rules
udevadm trigger

systemctl daemon-reload
systemctl try-restart bluetooth
systemctl restart mpd

installfinish
