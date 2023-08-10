#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20230808
mkdir -p $dircamilladsp/configs-bt
file=/etc/default/camilladsp
if [[ ! -e $file ]]; then
	cat << EOF > $file
ADDRESS=0.0.0.0
CONFIG=/srv/http/data/camilladsp/configs/camilladsp.yml
LOGFILE=/var/log/camilladsp.log
MUTE=
PORT=1234
GAIN=-g0
EOF
	sed -i -e '/^ExecStart/ d
' -e '/^Type/ a\
EnvironmentFile=-/etc/default/camilladsp\
ExecStartPre=/bin/bash -c "echo 0 > /dev/shm/clipped"\
ExecStart=/usr/bin/camilladsp $CONFIG -p $PORT -a $ADDRESS -o $LOGFILE $GAIN
' /usr/lib/systemd/system/camilladsp.service
	systemctl daemon-reload
	systemctl try-restart camilladsp
	rm -rf /srv/http/settings/camillagui
	rm -f $dircamilladsp/configs/{active,default}_config.yml
fi

# 20230630
if ! grep -q sudo /etc/conf.d/devmon; then
	sed -i 's|/srv|/usr/bin/sudo /srv|g' /etc/conf.d/devmon
	systemctl restart devmon@http
fi

file=/etc/systemd/system/spotifyd.service
grep -q CPUAffinity $file && sed -i '/CPUAffinity/ d' $file

# 20230620
file=/etc/pacman.conf
grep -q community $file && sed -i -e '/community/,/^$/ d' -e '/aur/,/^$/ d' $file

! grep -q scrobblekeyremove $dirsettings/features.sh && rm -f $dirsystem/scrobble

# 20230616
if [[ -e /boot/overlays/i2s-dac.dtbo ]]; then
	grep -q rpi-dac /boot/config.txt && sed -i 's/rpi-dac/i2s-dac/' /boot/config.txt && rebooti2s=1
	grep -q rpi-cirrus /boot/config.txt && sed -i 's/rpi-cirrus/cirrus/' /boot/config.txt && rebooti2s=1
fi

for f in album albumbyartist; do
	file=$dirmpd/$f
	if [[ -e $file ]]; then
		awk 'a[$0]++{exit 1}' $file || awk -i inplace '!seen[$0]++' $file
	fi
done

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
#-------------------------------------------------------------------------------

# 20230616
if [[ $rebooti2s ]]; then
	echo "$info Reboot required for Audio - I²S"
	echo 'Audio - I²S' > $dirshm/reboot
fi

# 20230623
if [[ -e $dirmpd/album ]]; then
	files=$( ls -1 $dirmpd | grep -Ev 'mpd.db|listing|updating' )
	for f in $files; do
		charlast=$( tail -c 1 $dirmpd/$f )
		[[ $charlast ]] && echo >> $dirmpd/$f
	done
fi

$dirsettings/player-conf.sh
