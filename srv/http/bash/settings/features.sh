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
		[[ ! -e $dirshm/apstartup ]] && touch $dirsystem/ap
		iw $wlandev set power_save off
	else
		rm -f $dirsystem/{ap,ap.conf}
		systemctl stop iwd
	fi
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
		[[ $( mpcState ) == play ]] && xset -dpms || xset +dpms
	else
		xset +dpms
	fi
}
pushRestartMpd() {
	$dirsettings/player-conf.sh
	pushSubmenu $1 $2
	pushRefresh
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
	enableFlagSet
	pushRefresh
	;;
brightness )
	echo $VAL > /sys/class/backlight/rpi_backlight/brightness
	;;
camilladsp )
	enableFlagSet
	pushRestartMpd camilladsp $TF
	;;
dabradio )
	enableFlagSet
	if [[ $ON ]]; then
		systemctl enable --now mediamtx
		[[ ! -e $dirmpdconf/ffmpeg.conf ]] && $dirsettings/player.sh ffmpeg
	else
		killProcess dabscan
		systemctl stop dab
		systemctl disable --now mediamtx
	fi
	pushRefresh
	;;
dabscan )
	$dirbash/dab-scan.sh &> /dev/null &
	notify dabradio 'DAB Radio' 'Scan ...'
	;;
equalizer )
	enableFlagSet
	[[ $ON && ! -e $dirsystem/equalizer.json ]] && echo '{
  "active" : "Flat"
, "preset" : {
		"Flat": [ 62, 62, 62, 62, 62, 62, 62, 62, 62, 62 ]
	}
, "current": "62 62 62 62 62 62 62 62 62 62"

}' | jq > $dirsystem/equalizer.json
	pushData reload 1
	pushRestartMpd equalizer $TF
	;;
httpd )
	[[ $ON ]] && ln -s $dirmpdconf/{conf/,}httpd.conf || rm -f $dirmpdconf/httpd.conf
	systemctl restart mpd
	pushRefresh
	pushRefresh player
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
				appendSortUnique localbrowser $dirshm/reboot
				notify localbrowser 'Rotate Browser on RPi' 'Reboot required.' 5000
				exit
# --------------------------------------------------------------------
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
		[[ $restart ]] && systemctl restart bootsplash localbrowser &> /dev/null
		systemctl enable bootsplash localbrowser
	else
		ply-image /srv/http/assets/img/splash.png
		systemctl disable --now bootsplash localbrowser
		systemctl enable --now getty@tty1
		sed -i -E 's/(console=).*/\1tty1/' /boot/cmdline.txt
		[[ -e $dirshm/btreceiver ]] && systemctl start bluetoothbutton
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
	pushSubmenu lock $( [[ -e $dirsystem/login ]] && echo true || echo false )
	;;
multiraudio )
	enableFlagSet
	display='{ "submenu": "multiraudio", "value": '$TF' }'
	flagset='{ "filesh": [ "rm", "-f", "'$dirsystem'/multiraudio" ] }'
	list=$( tr -d '\n' < $dirsystem/multiraudio.json )
	if [[ $ON ]]; then
		json='{ "json": '$list', "name": "multiraudio" }'
		flagset=${flagset/rm*-f/touch}
	fi
	ip=$( ipAddress )
	iplist=$( jq -r .[] <<< $list | grep -v $ip )
	while read ip; do
		! ipOnline $ip && continue
		
		[[ $json ]] && websocat ws://$ip:8080 <<< $json
		pushWebsocket $ip display $display
		websocat ws://$ip:8080 <<< $flagset
	done <<< $iplist
	pushRefresh
	pushSubmenu multiraudio $TF
	;;
multiraudioreset )
	rm -f $dirsystem/multiraudio*
	pushRefresh
	pushSubmenu multiraudio false
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
		ip=$( ipAddress )
		echo "/mnt/MPD/NAS  ${ip%.*}.0/24(rw,sync,no_subtree_check)" > /etc/exports
		systemctl enable --now nfs-server
		mkdir -p $dirbackup $dirshareddata
		ipAddress > $filesharedip
		if [[ ! -e $dirshareddata/mpd ]]; then
			rescan=1
			sharedDataCopy rserver
			chown -R http:http $dirshareddata
			chown -R mpd:audio $dirshareddata/{mpd,playlists}
		fi
		chmod 777 $dirnas $dirnas/{SD,USB}
		chmod -R 777 $dirshareddata
		sharedDataLink rserver
		systemctl restart mpd
		[[ $rescan ]] && $dirbash/cmd.sh "mpcupdate
rescan

CMD ACTION PATHMPD"
		# prepend path
		files=$( ls $dirbookmarks/* )
		files+=$'\n'$( ls $dirplaylists/* )
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
	pushDirCounts nas
	;;
screentoggle )
#	[[ $( vcgencmd display_power ) == display_power=1 ]] && toggle=0 || toggle=1
#	vcgencmd display_power $toggle # hdmi
	export DISPLAY=:0
	xset q | grep -q 'Monitor is On' && onoff=off || onoff=on
	xset dpms force $onoff
	xset q | grep 'Monitor is'
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
	[[ $response =~ error ]] && jq -r .message <<< $response && exit
# --------------------------------------------------------------------
	echo "\
apikey=$apikey
sharedsecret=$sharedsecret
sk=$( jq -r .session.key <<< $response )
" > $dirsystem/scrobblekey
	pushRefresh
	;;
scrobblekeyremove )
	rm -f $dirsystem/{scrobble,scrobblekey}
	pushRefresh
	;;
shairportsync | spotifyd | upmpdcli )
	[[ $CMD == shairportsync ]] && CMD=shairport-sync
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
	if [[ $ON ]]; then
		card=$( getVar card $dirshm/output )
		pcm=$( aplay -l | grep -m1 "^card $card" | sed -E 's/^card .: | \[.*//g' )
		echo 'SNAPCLIENT_OPTS="--soundcard='$pcm'"' > /etc/default/snapclient
		systemctl -q is-active snapserver && mv $dirsystem/snapclient{,server}
	else
		$dirbash/snapclient.sh stop
		rm -f $dirsystem/snapclient*
	fi
	pushRefresh
	;;
snapserver )
	if [[ $ON ]]; then
		ln -s $dirmpdconf/{conf/,}snapserver.conf
		mv -f $dirsystem/snapclient{,server} &> /dev/null
		serviceRestartEnable
	else
		snapclientIP playerstop
		rm -f $dirmpdconf/snapserver.conf
		mv -f $dirsystem/snapclient{server,} &> /dev/null
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
	file=$dirsystem/spotifyoutput
	[[ $OUTPUT == Default ]] && rm -f "$file" || echo $OUTPUT > "$file"
	sed -i -E 's/(volume_controller = ).*/\1"'$VOLUME'"/' /etc/spotifyd.conf
	touch $dirshm/spotifydrestart
	$dirsettings/player-conf.sh
	pushRefresh
	;;
spotifytoken )
	. $dirsystem/spotifykey
	tokens=$( curl -X POST https://accounts.spotify.com/api/token \
				-H "Authorization: Basic $base64client" \
				-H 'Content-Type: application/x-www-form-urlencoded' \
				-d "code=$CODE" \
				-d grant_type=authorization_code \
				--data-urlencode "redirect_uri=$REDIRECT" )
	if grep -q -m1 error <<< $tokens; then
		notify 'spotify blink' 'Spotify' "Error: $( jq -r .error <<< $tokens )"
		exit
# --------------------------------------------------------------------
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
			grep -q timeron=true $dirsystem/relays.conf && $dirbash/relays-timer.sh &> /dev/null &
		fi
	fi
	pushRefresh
	;;
volumelimit )
	enableFlagSet
	(( $( volumeGet ) > $MAX )) && volumeLimit max
	pushRefresh
	;;
	
esac
