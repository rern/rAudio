#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

iwctlAP() {
	wlanDisable # on-board wlan - force rmmod for ap to start
	wlandev=$( netDevice w )
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
		avahi-daemon --kill
		[[ ! -e $dirshm/apstartup ]] && touch $dirsystem/ap
		iw $wlandev set power_save off
	else
		rm -f $dirsystem/{ap,ap.conf}
		systemctl stop iwd
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
	if [[ $ON ]]; then
		sed -i -E -e 's/(Passphrase=).*/\1'$PASSPHRASE'/
' -e 's/(Address=).*/\1'$IP'/
' /var/lib/iwd/ap/$SSID.ap
		iwctlAP
	else
		systemctl stop iwd
		rm -f $dirsystem/{ap,ap.conf}
	fi
	pushRefresh
	pushRefresh networks
	;;
audiocd | autoplay | lyrics | scrobble )
	enableFlagSet
	pushRefresh
	;;
brightness )
	echo $VAL > /sys/class/backlight/rpi_backlight/brightness
	;;
camilladsp )
	if [[ $ON ]]; then
		fileconf=$( getVar CONFIG /etc/default/camilladsp )
		error=$( camilladsp -c "$fileconf" 2>&1 | grep ^error )
		if [[ $error ]]; then
			notify 'warning yl blink' CamillaDSP "$( sed 's/$/<br>/' <<< $error )"
			exit
# --------------------------------------------------------------------
		fi
	fi
	enableFlagSet
	pushRestartMpd camilladsp $TF &> /dev/null &
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
, "preset" : { "Flat": [ 62, 62, 62, 62, 62, 62, 62, 62, 62, 62 ] }
}' > $dirsystem/equalizer.json
	pushRestartMpd equalizer $TF &> /dev/null & # send to bg - suppress stdout
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
localbrowser | nfsserver )
	. $dirsettings/features-$CMD.sh
	;;
login )
	pushRefresh
	pushSubmenu lock $( [[ -e $dirsystem/login ]] && echo true || echo false )
	;;
mouse )
	file_last=$dirshm/mouse
	now=$( date +%s%3N )
	[[ -e $file_last ]] && last=$( < $file_last ) || last=0
	if (( $(( now - last )) > 1000 )); then # 1s throttle udev.rules events
		echo $now > $file_last
		systemctl is-enabled localbrowser && systemctl restart bootsplash localbrowser
	fi
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
screentoggle )
#	[[ $( vcgencmd display_power ) == display_power=1 ]] && toggle=0 || toggle=1
#	vcgencmd display_power $toggle # hdmi
	export DISPLAY=:0
	sudo xset q | grep -q 'Monitor is On' && onoff=off || onoff=on
	sudo xset dpms force $onoff
	echo Screen $onoff
	;;
scrobblekey )
	. <( grep -E -m2 'apikeylastfm|sharedsecret' /srv/http/assets/js/main.js | sed 's/.*, //; s/ *: /=/' )
	apisig=$( echo -n "api_key${apikeylastfm}methodauth.getSessiontoken${TOKEN}${sharedsecret}" \
				| md5sum \
				| cut -c1-32 )
	response=$( curl -sX POST \
		--data "method=auth.getSession" \
		--data "api_key=$apikeylastfm" \
		--data "token=$TOKEN" \
		--data "api_sig=$apisig" \
		--data "format=json" \
		http://ws.audioscrobbler.com/2.0 )
	[[ $response =~ error ]] && jq -r .message <<< $response && exit
# --------------------------------------------------------------------
	echo "\
apikey=$apikeylastfm
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
	chmod -f 755 /mnt/MPD /mnt/MPD/{NVME,SATA,SD,USB}
	if [[ $ON ]]; then
		smbconf=/etc/samba/smb.conf
		sed -i '/read only = no/ d' $smbconf
		for dir in NVME SATA SD USB; do
			[[ ! ${!dir} ]] && continue

			sed -i '/path = .*'$dir'/ a\
	read only = no
' $smbconf
			chmod 777 /mnt/MPD/$dir /mnt/MPD
		done
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
startx )
	. $dirsystem/localbrowser.conf
	export DISPLAY=:0
	off=$(( screenoff * 60 ))
	sudo xset s off
	sudo xset dpms $off $off $off
	[[ $off == 0 ]] && sudo xset -dpms || sudo xset +dpms
	if [[ $onwhileplay ]]; then
		grep -q ^state=.*play $dirshm/status && sudo xset -dpms || sudo xset +dpms
	fi
	! grep -q "Handlers=.*mouse" /proc/bus/input/devices && cursor='-use_cursor no'
	matchbox-window-manager $cursor &
	export $( dbus-launch )
	export MOZ_USE_XINPUT2=1
	firefox --kiosk --private-window http://localhost
	;;
stoptimer )
	enableFlagSet
	killProcess stoptimer
	if [[ $ON ]]; then
		$dirbash/status-push.sh
	else
		if [[ -e $dirshm/relayson ]] && grep -q timeron=true $dirsystem/relays.conf; then
			$dirbash/relays-timer.sh &> /dev/null &
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
