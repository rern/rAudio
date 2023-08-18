#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20230818
if [[ ! -e $dircamilladsp/configs-bt ]]; then
	cat << EOF > /etc/default/camilladsp
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
	mkdir -p $dircamilladsp/configs-bt
fi

# 20230630
if ! grep -q sudo /etc/conf.d/devmon; then
	sed -i 's|/srv|/usr/bin/sudo /srv|g' /etc/conf.d/devmon
	systemctl restart devmon@http
fi

file=/etc/systemd/system/spotifyd.service
grep -q CPUAffinity $file && sed -i '/CPUAffinity/ d' $file

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

# 20230623
if [[ -e $dirmpd/album ]]; then
	files=$( ls -1 $dirmpd | grep -Ev 'mpd.db|listing|updating' )
	for f in $files; do
		charlast=$( tail -c 1 $dirmpd/$f )
		[[ $charlast ]] && echo >> $dirmpd/$f
	done
fi

$dirsettings/player-conf.sh
