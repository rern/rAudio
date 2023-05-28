#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

pushRestartMpd() {
	$dirsettings/player-conf.sh
	pushSubmenu $1 $2
	$dirsettings/features-data.sh pushrefresh
}
pushSubmenu() {
	pushstream display '{ "submenu": "'$1'", "value": '$2' }'
}
localbrowserDisable() {
	ply-image /srv/http/assets/img/splash.png
	systemctl disable --now bootsplash localbrowser
	systemctl enable --now getty@tty1
	sed -i -E 's/(console=).*/\1tty1/' /boot/cmdline.txt
	rm -f $dirsystem/onwhileplay
	rm -rf /root/.mozilla
	[[ -e $dirshm/btreceiver ]] && systemctl start bluetoothbutton
}
localbrowserXset() {
	local off
	. $dirsystem/localbrowser.conf
	export DISPLAY=:0
	off=$(( $SCREENOFF * 60 ))
	xset s off
	xset dpms $off $off $off
	if [[ $off == 0 ]]; then
		xset -dpms
	elif [[ -e $dirsystem/onwhileplay ]]; then
		statePlay && xset -dpms || xset +dpms
	else
		xset +dpms
	fi
}
spotifyReset() {
	notify -blink spotify 'Spotify Client' "$1"
	rm -f $dirsystem/spotifykey $dirshm/spotify/*
	systemctl disable --now spotifyd
	pushRefresh
}

case $CMD in

autoplay | lyrics | scrobble )
	[[ $CMD == lyrics ]] && sed -i '/^url/ s|/$||' $dirsystem/lyrics.conf
	enableFlagSet
	pushRefresh
	;;
brightness )
	echo $VAL > /sys/class/backlight/rpi_backlight/brightness
	;;
camilladspasound )
	camilladspyml=$dircamilladsp/configs/camilladsp.yml
	new+=( $( sed -n '/capture:/,/channels:/ {/channels:/ {s/^.* //; p}}' $camilladspyml ) )
	new+=( $( sed -n '/capture:/,/format:/ {/format:/ {s/^.* //; p}}' $camilladspyml ) )
	new+=( $( awk '/^\s*samplerate:/ {print $NF}' $camilladspyml ) )
	old=( $( awk '/channels|format|rate/ {print $NF}' /etc/asound.conf ) )
	[[ "${new[@]}" == "${old[@]}" ]] && exit
	
	list=( channels format rate )
	for (( i=0; i < 3; i++ )); do
		[[ ${new[i]} != ${old[i]} ]] && sed -i -E 's/^(\s*'${list[i]}'\s*).*/\1'${new[i]}'/' /etc/asound.conf
	done
	alsactl nrestore &> /dev/null
	;;
camilladsp )
	enableFlagSet
	if [[ $ON ]]; then
		sed -i -E 's/(interval: ).*/\1'$REFRESH'/' /srv/http/settings/camillagui/config/gui-config.yml
		$dirbash/cmd.sh playerstop
		systemctl restart camillagui
	else
		camilladsp-gain.py
		systemctl stop camilladsp
		rmmod snd-aloop &> /dev/null
	fi
	pushRestartMpd camilladsp $TF
	;;
dabradio )
	if [[ $ON ]]; then
		if timeout 1 rtl_test -t &> /dev/null; then
			systemctl enable --now mediamtx
			[[ ! -e $dirmpdconf/ffmpeg.conf ]] && $dirsettings/player.sh ffmpeg
		else
			notify dabradio 'DAB Radio' 'No DAB devices found.' 5000
		fi
		
	else
		killProcess dabscan
		systemctl disable --now mediamtx
	fi
	pushRefresh
	;;
equalizer )
	enableFlagSet
	pushstream reload 1
	pushRestartMpd equalizer $TF
	;;
hostapd )
	if [[ $ON ]]; then
		! lsmod | grep -q -m1 brcmfmac && $dirsettings/system.sh wlan
		ipsub=${IP%.*}
		ipnext=$ipsub.$(( ${IP/*.} + 1 ))
		iplast=$ipsub.254
		iprange=$ipnext,$iplast,24h
		sed -i -E -e 's/^(dhcp-range=).*/\1'$iprange'/
' -e 's/^(.*option:router,).*/\1'$IP'/
' -e 's/^(.*option:dns-server,).*/\1'$IP'/
' /etc/dnsmasq.conf
		sed -i -E 's/(wpa_passphrase=).*/\1'$PASSPHRASE'/' /etc/hostapd/hostapd.conf
		netctl stop-all
		wlandev=$( < $dirshm/wlan )
		if [[ $wlandev == wlan0 ]] && ! lsmod | grep -q -m1 brcmfmac; then
			modprobe brcmfmac
			iw wlan0 set power_save off
		fi
		ifconfig $wlandev $router
		serviceRestartEnable
	else
		systemctl disable --now hostapd
		$dirsettings/system.sh wlan$'\n'OFF
	fi
	pushRefresh
	pushstream refresh '{ "page": "system", "hostapd": '$TF' }'
	pushRefresh networks
	;;
httpd )
	[[ $ON ]] && ln -s $dirmpdconf/{conf/,}httpd.conf || rm -f $dirmpdconf/httpd.conf
	systemctl restart mpd
	pushRefresh
	$dirsettings/player-data.sh pushrefresh
	;;
lastfmkey )
	grep -m1 apikeylastfm /srv/http/assets/js/main.js | cut -d"\'" -f2
	;;
localbrowser )
	if [[ $ON ]]; then
		file=$dirsystem/localbrowser.conf
		diff=$( grep -Fxvf $file /tmp/localbrowser.conf )
		if [[ $diff ]]; then
			for k in cursor rotate screenoff zoom; do
				grep -q -m1 ^$k <<< $diff && printf -v diff$k '%s' 1
			done
			[[ $diffcursor || $diffzoom ]] && restart=1
		fi
		if ! grep -q console=tty3 /boot/cmdline.txt; then
			sed -i -E 's/(console=).*/\1tty3 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt
			systemctl disable --now getty@tty1
		fi
		if [[ $HDMI ]]; then
			if ! grep -q hdmi_force_hotplug=1 /boot/config.txt; then
				echo hdmi_force_hotplug=1 >> /boot/config.txt
				if ! grep -q hdmi_force_hotplug=1 /tmp/config.txt; then
					echo HDMI Hotplug >> $dirshm/reboot
					notify hdmi 'HDMI Hotplug' 'Reboot required.' 5000
				fi
			fi
			pushstream refresh '{ "page": "system", "hdmi": true }'
		else
			sed -i '/hdmi_force_hotplug=1/ d' /boot/config.txt
			pushstream refresh '{ "page": "system", "hdmi": false }'
		fi
		if [[ $diffrotate ]]; then
			case $ROTATE in
				NORMAL ) degree=0;;
				CCW )    degree=270 && matrix='0 1 0 -1 0 1 0 0 1';;
				CW )     degree=90  && matrix='0 -1 1 1 0 0 0 0 1';;
				UD )     degree=180 && matrix='-1 0 1 0 -1 1 0 0 1';;
			esac
			$dirbash/cmd.sh rotatesplash
			if grep -E -q 'waveshare|tft35a' /boot/config.txt; then
				sed -i -E '/waveshare|tft35a/ s/(rotate=).*/\1'$degree'/' /boot/config.txt
				cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
				pushRefresh
				if ! grep -q rotate=$ROTATE /tmp/localbrowser.conf; then
					echo Rotate GPIO LCD screen >> $dirshm/reboot
					notify lcd 'Rotate GPIO LCD screen' 'Reboot required.' 5000
					exit
				fi
			fi
			
			restart=1
			rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
			if [[ $matrix ]]; then
				sed 's/ROTATION_SETTING/'$ROTATE'/; s/MATRIX_SETTING/'$matrix'/' /etc/X11/xinit/rotateconf > $rotateconf
			else 
				rm -f $rotateconf
			fi
		fi
		if [[ $diffscreenoff ]]; then
			localbrowserXset
			[[ $SCREENOFF == 0 ]] && pushSubmenu screenoff false || pushSubmenu screenoff true
		fi
		if [[ $restart ]] || ! systemctl -q is-active localbrowser; then
			restartlocalbrowser=1
			systemctl restart bootsplash localbrowser
		fi
	else
		localbrowserDisable
	fi
	pushRefresh
	if [[ $restartlocalbrowser ]]; then
		if systemctl -q is-active localbrowser; then
			systemctl enable bootsplash localbrowser
			systemctl stop bluetoothbutton
		else
			[[ -e /usr/bin/firefox ]] && icon=firefox || icon=chromium
			! systemctl -q is-active localbrowser && notify $icon 'Browser on RPi' 'Start failed.' 5000
			localbrowserDisable
		fi
	fi
	;;
localbrowserreload )
	pushstream reload 1
	;;
localbrowserxset )
	localbrowserXset
	;;
login )
	pushRefresh
	pushSubmenu lock true
	;;
logindisable )
	pushRefresh
	pushSubmenu lock false
	;;
multiraudio )
	enableFlagSet
	if [[ $ON ]]; then
		fileconf=$dirsystem/multiraudio.json
		conf=$( < $fileconf )
		iplist=$( grep -Ev "$( ipAddress )|{|}" <<< $conf | awk '{print $NF}' | tr -d '",' )
		for ip in $iplist; do
			sshCommand $ip << EOF
echo "$conf" > $fileconf
touch $dirsystem/multiraudio
pushstream display '{ "submenu": "multiraudio", "value": true }'
EOF
		done
	fi
	pushRefresh
	pushSubmenu multiraudio $TF
	;;
multiraudioreset )
	rm -f $dirsystem/multiraudio*
	;;
nfsserver )
	mpc -q clear
	if [[ -e $dirmpd/listing || -e $dirmpd/updating ]]; then
		rm -f $dirmpd/{listing,updating}
		systemctl restart mpd
	fi
	if [[ $ON ]]; then
		mv /mnt/MPD/{SD,USB} /mnt/MPD/NAS
		sed -i 's|/mnt/MPD/USB|/mnt/MPD/NAS/USB|' /etc/udevil/udevil.conf
		systemctl restart devmon@http
		echo "/mnt/MPD/NAS  $( ipSub )0/24(rw,sync,no_subtree_check)" > /etc/exports
		systemctl enable --now nfs-server
		mkdir -p $dirbackup $dirshareddata
		ipAddress > $filesharedip
		if [[ ! -e $dirshareddata/mpd ]]; then
			rescan=1
			sharedDataCopy
			chown -R http:http $dirshareddata
			chown -R mpd:audio $dirshareddata/{mpd,playlists}
		fi
		chmod 777 $dirnas $dirnas/{SD,USB}
		chmod -R 777 $dirshareddata
		sharedDataBackupLink
		systemctl restart mpd
		if [[ $rescan ]]; then
			echo rescan > $dirmpd/updating
			mpc -q rescan
			pushstream mpdupdate '{ "type": "mpd" }'
		fi
		# prepend path
		files=$( ls -1 $dirbookmarks/* )
		files+=$'\n'$( ls -1 $dirplaylists/* )
		files=$( awk NF <<< $files )
		if [[ $files ]]; then
			readarray -t files <<< $files
			for file in "${files[@]}"; do
				sed -E -i '/^SD|^USB/ s|^|NAS/|' "$file"
			done
		fi
	else
		mv /mnt/MPD/NAS/{SD,USB} /mnt/MPD
		sed -i 's|/mnt/MPD/NAS/USB|/mnt/MPD/USB|' /etc/udevil/udevil.conf
		systemctl restart devmon@http
		chmod 755 $dirnas $dirnas/{SD,USB}
		systemctl disable --now nfs-server
		> /etc/exports
		rm $filesharedip
		sharedDataReset
		systemctl restart mpd
	fi
	pushRefresh
	pushstream refresh '{ "page": "system", "nfsserver": '$TF' }'
	;;
screenofftoggle )
#	[[ $( /opt/vc/bin/vcgencmd display_power ) == display_power=1 ]] && toggle=0 || toggle=1
#	/opt/vc/bin/vcgencmd display_power $toggle # hdmi
	export DISPLAY=:0
	xset q | grep -q -m1 'Monitor is Off' && xset dpms force on || xset dpms force off
	;;
scrobblekeyget )
	token=${TOKEN[1]:0:32}
	keys=( $( grep -E -m2 'apikeylastfm|sharedsecret' /srv/http/assets/js/main.js | cut -d"'" -f2 ) )
	apikey=${keys[0]:0:32}
	sharedsecret=${keys[1]:0:32}
	apisig=$( echo -n "api_key${apikey}methodauth.getSessiontoken${token}${sharedsecret}" \
				| md5sum \
				| cut -c1-32 )
	response=$( curl -sX POST \
		--data "method=auth.getSession" \
		--data "api_key=$apikey" \
		--data "token=$token" \
		--data "api_sig=$apisig" \
		--data "format=json" \
		http://ws.audioscrobbler.com/2.0 )
	if [[ $response =~ error ]]; then
		jq -r .message <<< $response
	else
		echo "\
apikey=$apikey
sharedsecret=$sharedsecret
sk=$( jq -r .session.key <<< $response )
" > $dirsystem/scrobblekey
	fi
	;;
shairport-sync | spotifyd )
	if [[ $ON ]]; then
		serviceRestartEnable
	else
		[[ $( < $dirshm/player ) == airplay ]] && $dirbash/cmd.sh playerstop
		systemctl disable --now $CMD
	fi
	pushRefresh
	;;
smb )
	if [[ $ON ]]; then
		smbconf=/etc/samba/smb.conf
		sed -i '/read only = no/ d' $smbconf
		[[ $SD ]] &&  sed -i '/path = .*SD/ a\  read only = no' $smbconf
		[[ $USB ]] && sed -i '/path = .*USB/ a\	read only = no' $smbconf
		serviceRestartEnable
	else
		systemctl disable --now smb
	fi
	pushRefresh
	;;
snapclient )
	enableFlagSet
	[[ -e $dirmpdconf/snapserver.conf ]] && snapserver=1
	if [[ $ON ]]; then
		echo 'SNAPCLIENT_OPTS="--latency='$LATENCY'"' > /etc/default/snapclient
		[[ -e $dirsystem/snapclient ]] && systemctl try-restart snapclient
		
		if [[ $snapserver ]]; then
			touch $dirsystem/snapclientserver
			statePlay && systemctl start snapclient
		fi
	else
		systemctl stop snapclient
		[[ $snapserver ]] && rm $dirsystem/snapclientserver
	fi
	pushRefresh
	;;
snapserver )
	if [[ $ON ]]; then
		avahi=$( timeout 0.2 avahi-browse -rp _snapcast._tcp 2> /dev/null | grep snapcast.*1704 )
		if [[ $avahi ]]; then
			echo '{
  "icon"    : "snapcast"
, "title"   : "SnapServer"
, "message" : "Already running on: '$( cut -d';' -f8 <<< $avahi )'"
}'
			exit
		fi
		
		ln -s $dirmpdconf/{conf/,}snapserver.conf
	else
		rm -f $dirmpdconf/snapserver.conf $dirsystem/snapclientserver
	fi
	$dirsettings/player-conf.sh
	mpc -q play
	sleep 1
	mpc -q stop
	pushRefresh
	;;
spotifykey )
	echo base64client=$BTOA > $dirsystem/spotifykey
	;;
spotifytoken )
	. $dirsystem/spotifykey
	spotifyredirect=$( grep ^spotifyredirect $dirsettings/features-data.sh | cut -d= -f2 )
	tokens=$( curl -X POST https://accounts.spotify.com/api/token \
				-H "Authorization: Basic $base64client" \
				-H 'Content-Type: application/x-www-form-urlencoded' \
				-d "code=$CODE" \
				-d grant_type=authorization_code \
				--data-urlencode "redirect_uri=$spotifyredirect" )
	if grep -q -m1 error <<< $tokens; then
		spotifyReset "Error: $( jq -r .error <<< $tokens )"
		exit
	fi
	
	tokens=( $( jq -r .refresh_token,.access_token <<< $tokens ) )
	echo "refreshtoken=${tokens[0]}" >> $dirsystem/spotifykey
	echo ${tokens[1]} > $dirshm/spotify/token
	echo $(( $( date +%s ) + 3550 )) > $dirshm/spotify/expire
	CMD=spotifyd
	serviceRestartEnable
	pushRefresh
	;;
spotifytokenreset )
	spotifyReset 'Reset ...'
	;;
stoptimer )
	if [[ $ON ]]; then
		touch $dirshm/stoptimer
		$dirbash/stoptimer.sh &> /dev/null &
	else
		killProcess stoptimer
		rm -f $dirshm/stoptimer
		if [[ -e $dirshm/relayson ]]; then
			. $dirsystem/relays.conf
			echo $timer > $timerfile
			$dirbash/relays-timer.sh &> /dev/null &
		fi
	fi
	pushRefresh
	;;
upmpdcli )
	if [[ $ON ]]; then
		[[ $OWNQUEUE ]] && ownqueue=1 || ownqueue=0
		sed -i "/^ownqueue/ s/= ./= $ownqueue/" /etc/upmpdcli.conf
		serviceRestartEnable
	else
		systemctl disable --now upmpdcli
	fi
	pushRefresh
	;;
	
esac
