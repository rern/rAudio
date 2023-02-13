#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

# 20230217
if [[ -e /boot/kernel7.img && ! -e /usr/bin/firefox ]]; then
	echo -e "$bar Switch Browser on RPi to Firefox ..."
	pacman -R --noconfirm chromium
	pacman -Sy --noconfirm firefox
	timeout 1 firefox --headless &> /dev/null
fi

# 20230212
if [[ -e /boot/kernel8.img && ! $( ls /etc/systemd/network/et* 2> /dev/null ) ]]; then
	sed 's/=en/=eth/' /etc/systemd/network/en.network > /etc/systemd/network/eth.network
fi

# 20230130
if ! grep -q onevent /etc/spotifyd.conf; then
	echo '[global]
bitrate = 320
onevent = "/srv/http/bash/spotifyd.sh"
use_mpris = false
backend = "alsa"
volume_controller = "alsa"' > /etc/spotifyd.conf
	$dirsettings/player-conf.sh
fi

# 20130129
file=/srv/http/settings/camillagui/backend/views.py
if [[ -e $file ]] && ! grep -q 'name == "mute"' $file; then
	sed -i -e '/cdsp.get_volume/ a\
    elif name == "mute":\
        config = cdsp.get_config()\
        mute = True if cdsp.get_mute() else False\
        volume = cdsp.get_volume()\
        result = {"config": config, "mute": mute, "volume": volume}\
        return web.json_response(result)\
        
' -e '/cdsp.set_volume/ a\
    elif name == "mute":\
        cdsp.set_mute(value == "true")
' $file
	file=$dircamilladsp/configs/camilladsp.yml
	! grep -q '\- Volume' $file && sed -i '/names:/ a\  - Volume' $file
fi

# 20130123
if [[ -e $dircamilladsp/configs/default_config.yml ]]; then
	file=$dircamilladsp/configs/camilladsp.yml
	! grep -q '\- Volume' $file && sed -i '/names:/ a\  - Volume' $file
	mv $dircamilladsp/{configs/,}default_config.yml
	rm $dircamilladsp/configs/active_config.yml
	ln -s $dircamilladsp/{configs/camilladsp,active_config}.yml
fi

# 20230117
file=/etc/systemd/system/spotifyd.service
! grep -q ^User $file && sed -i '/CPUAffinity/ a\User=root' $file
systemctl daemon-reload
systemctl try-restart spotifyd

# 20221229
files=$( ls /etc/systemd/network/e* )
for file in $files; do
	! grep -q RequiredForOnline=no $file && echo '
[Link]
RequiredForOnline=no' >> $file
done

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,fonts,js}

getinstallzip

[[ ! -e /usr/bin/camilladsp ]] && rm -rf /srv/http/settings/camillagui

chmod +x $dirsettings/system.sh
$dirsettings/system.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
#-------------------------------------------------------------------------------
