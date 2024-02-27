#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

iwctlAP() {
	wlanDisable # on-board wlan - force rmmod for ap to start
	wlandev=$( < $dirshm/wlan )
	if ! rfkill | grep -q wlan; then
		modprobe brcmfmac
	else
		ip link set $wlandev down
	fi
	ip link set $wlandev up
	systemctl restart iwd
	sleep 1
	hostname=$( hostname )
	iwctl device $wlandev set-property Mode ap
	iwctl ap $wlandev start-profile $hostname
	if iwctl ap list | grep -q "$wlandev.*yes"; then
		. <( grep -E '^Pass|^Add' /var/lib/iwd/ap/$hostname.ap )
		echo '{
  "ip"         : "'$Address'"
, "passphrase" : "'$Passphrase'"
, "qr"         : "WIFI:S:'$hostname';T:WPA;P:'$Passphrase';"
, "ssid"       : "'$hostname'"
}' > $dirsystem/ap.conf
		touch $dirsystem/ap
		iw $wlandev set power_save off
	else
		rm -f $dirsystem/{ap,ap.conf}
		systemctl stop iwd
	fi
}
localbrowserDisable() {
	ply-image /srv/http/assets/img/splash.png
	systemctl disable --now bootsplash localbrowser
	systemctl enable --now getty@tty1
	sed -i -E 's/(console=).*/\1tty1/' /boot/cmdline.txt
	[[ -e $dirshm/btreceiver ]] && systemctl start bluetoothbutton
}
localbrowserXset() {
	local off
	. $dirsystem/localbrowser.conf
	export DISPLAY=:0
	off=$(( $screenoff * 60 ))
	xset s off
	xset dpms $off $off $off
	if [[ $off == 0 ]]; then
		xset -dpms
	elif [[ $onwhileplay ]]; then
		statePlay && xset -dpms || xset +dpms
	else
		xset +dpms
	fi
}
pushRestartMpd() {
	$dirsettings/player-conf.sh
	pushSubmenu $1 $2
	$dirsettings/features-data.sh pushrefresh
}
pushSubmenu() {
	pushData display '{ "submenu": "'$1'", "value": '$2' }'
}
wlanDisable() {
	lsmod | grep -q brcmfmac && $dirsettings/system.sh wlan$'\n'OFF
}

case $CMD in

ap )
	wlandev=$( < $dirshm/wlan )
	if [[ $ON ]]; then
		sed -i -E -e 's/(Passphrase=).*/\1'$PASSPHRASE'/
' -e 's/(Address=).*/\1'$IP'/
' /var/lib/iwd/ap/$( hostname ).ap
		iwctlAP
	else
		systemctl stop iwd
		rm -f $dirsystem/{ap,ap.conf}
		wlanDisable
	fi
	pushRefresh
	pushData refresh '{ "page": "system", "iwd": '$TF' }'
	pushRefresh networks
	;;
autoplay | lyrics | scrobble )
	[[ $CMD == lyrics ]] && sed -i '/^url/ s|/$||' $dirsystem/lyrics.conf
	enableFlagSet
	pushRefresh
	;;
brightness )
	echo $VAL > /sys/class/backlight/rpi_backlight/brightness
	;;
camilladsp )
	enableFlagSet
	$dirbash/cmd.sh playerstop
	[[ ! $ON ]] && mv -f /etc/default/camilladsp{.backup,}
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
	pushData reload 1
	pushRestartMpd equalizer $TF
	;;
httpd )
	[[ $ON ]] && ln -s $dirmpdconf/{conf/,}httpd.conf || rm -f $dirmpdconf/httpd.conf
	systemctl restart mpd
	pushRefresh
	$dirsettings/player-data.sh pushrefresh
	;;
iwctlap )
	iwctlAP
	;;
lastfmkey )
	grep -m1 apikeylastfm /srv/http/assets/js/main.js | cut -d"'" -f2
	;;
localbrowser )
	if [[ $ON ]]; then
		if ! grep -q console=tty3 /boot/cmdline.txt; then
			sed -i -E 's/(console=).*/\1tty3 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt
			systemctl disable --now getty@tty1
		fi
		if [[ -e /tmp/localbrowser.conf ]]; then
			diff=$( grep -Fxvf $dirsystem/localbrowser.conf /tmp/localbrowser.conf )
			if [[ $diff ]]; then
				for k in cursor rotate screenoff zoom; do
					grep -q -m1 ^$k <<< $diff && printf -v diff$k '%s' 1
				done
				[[ $diffcursor || $diffzoom ]] && restart=1
			fi
		else
			restart=1
		fi
		scale=$( awk 'BEGIN { printf "%.2f", '$ZOOM/100' }' )
		profile=$( ls /root/.mozilla/firefox | grep release$ )
		echo 'user_pref("layout.css.devPixelsPerPx", "'$scale'");' > /root/.mozilla/firefox/$profile/user.js
		if grep -E -q 'waveshare|tft35a' /boot/config.txt; then # tft
			sed -i -E '/waveshare|tft35a/ s/(rotate=).*/\1'$ROTATE'/' /boot/config.txt
			cp -f /etc/X11/{lcd$ROTATE,xorg.conf.d/99-calibration.conf}
			if [[ ! -e /tmp/localbrowser.conf || $diffrotate ]]; then
				echo Rotate GPIO LCD screen >> $dirshm/reboot
				notify lcd 'Rotate GPIO LCD screen' 'Reboot required.' 5000
				exit
				
			fi
		else # hdmi
			rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
			[[ -e $rotateconf ]] && rotateprev=$( awk '/rotate/ {print $NF}' $rotateconf | tr -d '"' )
			case $ROTATE in
				0 )   rotate=NORMAL;;
				270 ) rotate=CCW && matrix='0 1 0 -1 0 1 0 0 1';;
				90 )  rotate=CW  && matrix='0 -1 1 1 0 0 0 0 1';;
				180 ) rotate=UD  && matrix='-1 0 1 0 -1 1 0 0 1';;
			esac
			if [[ $rotateprev != $rotate ]]; then
				if [[ $ROTATE == 0 ]]; then
					rm -f $rotateconf
				else 
					sed "s/ROTATION_SETTING/$rotate/; s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf > $rotateconf
				fi
				$dirbash/cmd.sh splashrotate
			fi
		fi
		if [[ $diffscreenoff ]]; then
			localbrowserXset
			[[ $SCREENOFF == 0 ]] && tf=false || tf=true
			pushSubmenu screenoff $tf
		fi
		if [[ $restart ]] || ! systemctl -q is-active localbrowser; then
			restartlocalbrowser=1
			systemctl restart bootsplash localbrowser &> /dev/null
		fi
	else
		localbrowserDisable
	fi
	if [[ $restartlocalbrowser ]]; then
		sleep 2
		if systemctl -q is-active localbrowser; then
			systemctl enable bootsplash localbrowser
			systemctl stop bluetoothbutton
		else
			! systemctl -q is-active localbrowser && notify firefox 'Browser on RPi' 'Start failed.' 5000
			localbrowserDisable
		fi
	fi
	pushRefresh
	;;
localbrowserreload )
	pushData reload 1
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
pushData display '{ "submenu": "multiraudio", "value": true }'
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
	[[ -e $dirmpd/listing ]] && killall cmd-list.sh
	mpc | grep -q ^Updating && systemctl restart mpd
	rm -f $dirmpd/{listing,updating}
	if [[ $ON ]]; then
		mv /mnt/MPD/{SD,USB} /mnt/MPD/NAS
		sed -i 's|/mnt/MPD/USB|/mnt/MPD/NAS/USB|' /etc/udevil/udevil.conf
		systemctl restart devmon@http
		echo "/mnt/MPD/NAS  $( ipAddress sub )0/24(rw,sync,no_subtree_check)" > /etc/exports
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
			$dirbash/cmd.sh mpcupdate
		fi
		# prepend path
		files=$( ls -1 $dirbookmarks/* )
		files+=$'\n'$( ls -1 $dirplaylists/* )
		files=$( awk NF <<< $files )
		if [[ $files ]]; then
			while read file; do
				sed -E -i '/^SD|^USB/ s|^|NAS/|' "$file"
			done <<< $files
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
	pushData refresh '{ "page": "system", "nfsserver": '$TF' }'
	;;
screenofftoggle )
#	[[ $( vcgencmd display_power ) == display_power=1 ]] && toggle=0 || toggle=1
#	vcgencmd display_power $toggle # hdmi
	export DISPLAY=:0
	xset q | grep -q -m1 'Monitor is Off' && xset dpms force on || xset dpms force off
	;;
scrobblekey )
	keys=( $( grep -E -m2 'apikeylastfm|sharedsecret' /srv/http/assets/js/main.js | cut -d"'" -f2 ) )
	apikey=${keys[0]}
	sharedsecret=${keys[1]}
	apisig=$( echo -n "api_key${apikey}methodauth.getSessiontoken${TOKEN}${sharedsecret}" \
				| md5sum \
				| cut -c1-32 )
	response=$( curl -sX POST \
		--data "method=auth.getSession" \
		--data "api_key=$apikey" \
		--data "token=$TOKEN" \
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
scrobblekeyremove )
	rm -f $dirsystem/{scrobble,scrobblekey}
	pushRefresh
	;;
shairport-sync | spotifyd | upmpdcli )
	if [[ $ON ]]; then
		serviceRestartEnable
	else
		case $CMD in
			shairport-sync ) player=airplay;;
			spotifyd )       player=spotify;;
			upmpdcli )       player=upnp;;
		esac
		playerActive $player && $dirbash/cmd.sh playerstop
		systemctl disable --now $CMD
	fi
	pushRefresh
	;;
smb )
	chmod 755 /mnt/MPD /mnt/MPD/{SD,USB}
	if [[ $ON ]]; then
		smbconf=/etc/samba/smb.conf
		sed -i '/read only = no/ d' $smbconf
		[[ $SD ]] &&  sed -i '/path = .*SD/ a\	read only = no' $smbconf && chmod 777 /mnt/MPD/SD
		[[ $USB ]] && sed -i '/path = .*USB/ a\	read only = no' $smbconf && chmod 777 /mnt/MPD/USB
		[[ $SD || $USB ]] && chmod 777 /mnt/MPD
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
		[[ $snapserver ]] && rm -f $dirsystem/snapclientserver
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
		serviceRestartEnable
	else
		rm -f $dirmpdconf/snapserver.conf $dirsystem/snapclientserver
		systemctl disable --now snapserver
	fi
	$dirsettings/player-conf.sh
	pushRefresh
	;;
spotifykey )
	echo base64client=$BTOA > $dirsystem/spotifykey
	;;
spotifykeyremove )
	notify 'spotify blink' 'Spotify Client Keys' "Remove ..."
	rm -f $dirsystem/spotifykey $dirshm/spotify/*
	systemctl disable --now spotifyd
	pushRefresh
	;;
spotifyoutput )
	devices='"Default"'
	lines=$( aplay -L | grep ^.*:CARD )
	while read line; do
		devices+=', "'$line'"'
	done <<< $lines
	current=$( sed -E -n '/^device/ {s/.*"(.*)"/\1/; p}' /etc/spotifyd.conf )
	if [[ ${current:0:3} == hw: ]]; then
		current=Default
	else
		current=$( getContent $dirsystem/spotifyoutput )
	fi
	echo '{
  "current" : "'$current'"
, "devices" : [ '$devices' ]
}'
	;;
spotifyoutputset )
	file=$dirsystem/spotifyoutput
	[[ $OUTPUT == Default ]] && rm -f "$file" || echo $OUTPUT > "$file"
	$dirsettings/player-conf.sh
	;;
spotifytoken )
	. $dirsystem/spotifykey
	spotifyredirect=$( grep '^var redirect_uri' /srv/http/assets/js/features.js | cut -d"'" -f2 )
	tokens=$( curl -X POST https://accounts.spotify.com/api/token \
				-H "Authorization: Basic $base64client" \
				-H 'Content-Type: application/x-www-form-urlencoded' \
				-d "code=$CODE" \
				-d grant_type=authorization_code \
				--data-urlencode "redirect_uri=$spotifyredirect" )
	if grep -q -m1 error <<< $tokens; then
		notify 'spotify blink' 'Spotify' "Error: $( jq -r .error <<< $tokens )"
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
stoptimer )
	killProcess stoptimer
	if [[ $ON ]]; then
		$dirbash/stoptimer.sh &> /dev/null &
	else
		rm -f $dirshm/pidstoptimer
		if [[ -e $dirshm/relayson ]]; then
			. $dirsystem/relays.conf
			echo $timer > $timerfile
			$dirbash/relays-timer.sh &> /dev/null &
		fi
	fi
	pushRefresh
	;;
	
esac
