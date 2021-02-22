#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

sed -i -e "/id === 'infoRadio'/ {N;d}" -e "s/chk === ''/\!chk/" /srv/http/assets/js/info.js
sed -i '/^-.*pam_systemd_home/ s/^/#/' /etc/pam.d/system-auth
sed -i '/IgnorePkg   = linux-firmware/ d' /etc/pacman.conf

file=/etc/systemd/system/powerbutton.service
[[ ! -e $file ]] && echo -n "\
[Unit]
Description=Shutdown button
After=startup.service

[Service]
ExecStart=/srv/http/bash/powerbutton.sh

[Install]
WantedBy=getty.target
" > $file

relaysfile=/srv/http/data/system/relays
[[ -e $relaysfile && ! -s $relaysfile ]] && /srv/http/bash/system.sh relays$'\n'true

pacman -Q wiringpi &> /dev/null || pacman -Sy --noconfirm wiringpi

rm -f /addons-list.json

sed -i 's/"//g' /etc/spotifyd.conf &> /dev/null
systemctl -q is-enabled spotifyd && systemctl restart spotifyd

if [[ -e /srv/http/bash/ply-image ]]; then
	mv /srv/http/bash/ply-image /usr/bin
	sed -i 's|srv/http/bash|usr/bin|' /etc/systemd/system/bootsplash.service &> /dev/null
	systemctl daemon-reload
fi

crontab -l | grep -q addonsupdates || ( crontab -l &> /dev/null; echo '00 01 * * * /srv/http/bash/cmd.sh addonsupdates &' ) | crontab -

if ! grep -q usbremove /etc/conf.d/devmon; then
	wget -q https://github.com/rern/rOS/raw/main/etc/conf.d/devmon -O /etc/conf.d/devmon
fi
if grep -q 'default_options_exfat.*umask=0077' /etc/udevil/udevil.conf; then
	wget -q https://github.com/rern/rOS/raw/main/etc/udevil/udevil.conf -O /etc/udevil/udevil.conf
fi

file=/etc/lcdchar.conf
if [[ -e $file ]]; then
	! grep -q backlight $file && echo backlight=False >> $file
fi

i=$( head -1 /etc/asound.conf | cut -d' ' -f2 )
[[ -z $i ]] && echo "\
defaults.pcm.card 0
defaults.ctl.card 0" > /etc/asound.conf

installstart "$1"

getinstallzip

/srv/http/bash/mpd-conf.sh

revision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
revision=${revision: -3:2}
if ! grep -q dtparam=krnbt=on /boot/config.txt && [[ $revision =~ ^(08|0c|0d|0e|11)$ ]]; then
	sed -i '$ a\dtparam=krnbt=on' /boot/config.txt
fi

sed -i '/IgnorePkg   = raspberrypi-bootloader/ d' /etc/pacman.conf

installfinish

systemctl -q is-enabled localbrowser && systemctl restart localbrowser
