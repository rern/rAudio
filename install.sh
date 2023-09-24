#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20230924
[[ -e /boot/kernel.img && pythonver=python3.10 || pythonver=$( ls /usr/lib | grep ^python | tail -1 )
! pacman -Q python-upnpp &> /dev/null && pacman -Sy --noconfirm python-upnpp

if grep -q ownqueue /etc/upmpdcli.conf; then
	sed -i -e '/^ownqueue/ d
' -e 's|^onstart.*|onstart = /usr/bin/sudo /srv/http/bash/cmd.sh upnpstart|
' /etc/upmpdcli.conf
	systemctl try-restart upmpdcli
fi

file=$dirsystem/display.json
if ! grep -q plclear $file; then
	sed -i '1 a\
    "plclear": true,\
    "plsimilar": true,\
    "audiocdplclear": false,
' $file
fi

# 20230909
if [[ -e /usr/bin/chromium && ! -e /usr/bin/firefox ]]; then
	pacman -Sy --noconfirm firefox
	systemctl try-restart localbrowser
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

# 20230916
file=/etc/systemd/system/websocket.service
if [[ ! -e $file ]]; then
	systemctl disable --now cmd-websocket &> /dev/null
	rm /etc/systemd/system/cmd-websocket.service
	! pacman -Q python-websockets &> /dev/null && pacman -Sy --noconfirm python-websockets
	echo "\
[Unit]
Description=Websocket server
Before=startup.service

[Service]
ExecStart=/srv/http/bash/websocket-server.py

[Install]
WantedBy=multi-user.target" > $file
	systemctl daemon-reload
	systemctl enable --now websocket
fi

if [[ -e /usr/bin/camilladsp && ! -e /etc/default/camilladsp ]]; then
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
