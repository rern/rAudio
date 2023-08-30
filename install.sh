#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20230828
[[ -e /boot/kernel.img ]] && rpi0=1
file=/etc/systemd/system/cmd-websocket.service
if [[ ! -e $file && ! $rpi0 ]]; then
	pacman -S --noconfirm --needed python-websockets
	echo "\
[Unit]
Description=Command websocket server
After=startup.service

[Service]
ExecStart=/srv/http/bash/cmd-websocket.py

[Install]
WantedBy=multi-user.target" > $file
	systemctl daemon-reload
	systemctl enable --now cmd-websocket
fi

if [[ ! -e $dircamilladsp/configs-bt && ! $rpi0 ]]; then
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
	echo "\
filtersmax=10
filtersmin=-10
mixersmax=10
mixersmin=-10" > $dirsystem/camilla.conf
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
