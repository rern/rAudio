#!/bin/bash

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
filebootlog=/srv/http/data/shm/bootlog
filereboot=/srv/http/data/shm/reboot

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	curl -s -X POST http://127.0.0.1/pub?id=refresh -d '{ "page": "features" }'
}
featureSet() {
	systemctl restart $1
	systemctl enable $1
	pushRefresh
}

case ${args[0]} in

aria2 | shairport-sync | spotifyd | transmission | upmpdcli )
	service=${args[0]}
	enable=${args[1]}
	[[ $enable == true ]] && enable=enable || enable=disable
	systemctl $enable --now $service
	pushRefresh
	;;
aplaydevices )
	aplay -L | grep -v '^\s\|^null' | head -c -1
	;;
autoplay )
	[[ ${args[1]} == true ]] && touch $dirsystem/autoplay || rm -f $dirsystem/autoplay
	pushRefresh
	;;
hostapddisable )
	systemctl disable --now hostapd
	ifconfig wlan0 0.0.0.0
	pushRefresh
	;;
hostapdset )
	iprange=${args[1]}
	router=${args[2]}
	password=${args[3]}
	sed -i -e "s/^\(dhcp-range=\).*/\1$iprange/
" -e "s/^\(.*option:router,\).*/\1$router/
" -e "s/^\(.*option:dns-server,\).*/\1$router/
" /etc/dnsmasq.conf
	sed -i -e '/wpa\|rsn_pairwise/ s/^#\+//
' -e "s/\(wpa_passphrase=\).*/\1$password/
" /etc/hostapd/hostapd.conf
	netctl stop-all
	ifconfig wlan0 ${args[2]}
	featureSet hostapd
	;;
localbrowserdisable )
	systemctl disable --now localbrowser
	systemctl enable --now getty@tty1
	sed -i 's/tty3/tty1/' /boot/cmdline.txt
	$dirbash/ply-image /srv/http/assets/img/splash.png
	pushRefresh
	;;
localbrowserset )
	rotate=${args[1]}
	screenoff=${args[2]}
	cursor=${args[3]}
	zoom=${args[4]}
	rotateset=${args[5]}
	screenoffset=${args[6]}
	cursorset=${args[7]}
	zoomset=${args[8]}
	if [[ $rotate != $rotateset ]]; then
		if grep -q tft35a /boot/config.txt; then
			case $rotate in
				CW )     degree=0;;
				NORMAL ) degree=90;;
				CCW )    degree=180;;
				UD )     degree=270;;
			esac
			sed -i "s/\(tft35a\).*/\1:rotate=$degree/" /boot/config.txt
			cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
			echo Rotate GPIO LCD screen > /srv/http/data/shm/reboot
			ln -sf /srv/http/assets/img/{NORMAL,splash}.png
		else
			rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
			if [[ $rotate == NORMAL ]]; then
				rm -f $rotateconf
			else
				case $rotate in
					CW )  matrix='0 1 0 -1 0 1 0 0 1';;
					CCW ) matrix='0 -1 1 1 0 0 0 0 1';;
					UD )  matrix='-1 0 1 0 -1 1 0 0 1';;
				esac
				sed -e "s/ROTATION_SETTING/$rotate/
				" -e "s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf > $rotateconf
			fi
			ln -sf /srv/http/assets/img/{$rotate,splash}.png
		fi
	fi
	[[ $screenoff != $screenoffset ]] && DISPLAY=:0 xset dpms $screenoff $screenoff $screenoff
	if ! systemctl is-active localbrowser || [[ $cursor != $cursorset || $zoom != $zoomset ]]; then
		systemctl restart localbrowser
		systemctl enable localbrowser
	fi
	systemctl disable --now getty@tty1
	sed -i 's/tty1/tty3/' /boot/cmdline.txt
	echo -n "\
rotate=$rotate
screenoff=$screenoff
cursor=$cursor
zoom=$zoom
" > /etc/localbrowser.conf
	pushRefresh
	;;
logindisable )
	rm -f $dirsystem/login*
	sed -i '/^bind_to_address/ s/".*"/"0.0.0.0"/' /etc/mpd.conf
	systemctl restart mpd
	pushRefresh
	;;
loginset )
	touch $dirsystem/login
	sed -i '/^bind_to_address/ s/".*"/"127.0.0.1"/' /etc/mpd.conf
	systemctl restart mpd
	pushRefresh
	;;
mpdscribbledisable )
	systemctl disable --now mpdscribble@mpd
	pushRefresh
	;;
mpdscribbleset )
	user=${args[1]}
	pwd=${args[2]}
	sed -i -e "s/^\(username =\).*/\1 $user/
	" -e "s/^\(password =\).*/\1 $pwd/
	" /etc/mpdscribble.conf
	if systemctl restart mpdscribble@mpd; then
		systemctl enable mpdscribble@mpd
	else
		systemctl disable mpdscribble@mpd
		echo -1
	fi
	pushRefresh
	;;
smbdisable )
	systemctl stop smb
	pushRefresh
	;;
smbset )
	smbconf=/etc/samba/smb.conf
	sed -i '/read only = no/ d' $smbconf
	[[ ${args[1]} == true ]] && sed -i '/path = .*SD/ a\	read only = no' $smbconf
	[[ ${args[2]} == true ]] && sed -i '/path = .*USB/ a\	read only = no' $smbconf
	featureSet smb
	;;
snapclientdisable )
	systemctl stop snapclient
	pushRefresh
	;;
snapclientset )
	latency=${args[1]}
	password=${args[2]}
	sed -i '/OPTS=/ s/".*"/"--latency='$latency'"/' /etc/default/snapclient
	[[ -n $password ]] && echo $pwd > $dirsystem/snapclientpw
	featureSet snapclient
	;;
snapserver )
	if [[ ${args[1]} == true ]]; then
		systemctl enable --now snapserver
	else
		systemctl disable --now snapserver
	fi
	$dirbash/mpd-conf.sh
	$dirbash/snapcast.sh serverstop
	pushRefresh
	;;
streaming )
	[[ ${args[1]} == true ]] && touch $dirsystem/streaming || rm -f $dirsystem/streaming
	$dirbash/mpd-conf.sh
	pushRefresh
	;;
	
esac
