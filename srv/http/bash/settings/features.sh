#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< "$1"

pushRefresh() {
	$dirbash/settings/features-data.sh pushrefresh
}
pushRefreshNetworks() {
	data=$( $dirbash/settings/networks-data.sh )
	pushstream refresh "$data"
}
pushSubmenu() {
	pushstream display '{"submenu":"'$1'","value":'$2'}'
}
featureSet() {
	systemctl restart $@
	systemctl -q is-active $@ && systemctl enable $@
	pushRefresh
}
localbrowserXset() {
	. $dirsystem/localbrowser.conf
	export DISPLAY=:0
	off=$(( $screenoff * 60 ))
	xset s off
	xset dpms $off $off $off
	if [[ $off == 0 ]]; then
		xset -dpms
	elif [[ -e $dirsystem/onwhileplay ]]; then
		grep -q '^state="play"' $dirshm/status && xset -dpms || xset +dpms
	else
		xset +dpms
	fi
}
spotifyReset() {
	pushstreamNotifyBlink 'Spotify Client' "$1" spotify
	rm -f $dirsystem/spotify $dirshm/spotify/*
	systemctl disable --now spotifyd
	pushRefresh
}

case ${args[0]} in

autoplay|autoplaybt|autoplaycd|lyricsembedded|streaming )
	feature=${args[0]}
	filefeature=$dirsystem/$feature
	[[ ${args[1]} == true ]] && touch $filefeature || rm -f $filefeature
	[[ $feature == streaming ]] && $dirbash/settings/player-conf.sh
	pushRefresh
	;;
autoplaydisable )
	rm -f $dirsystem/autoplay*
	pushRefresh
	;;
autoplayset )
	[[ ${args[1]} == true ]] && touch $dirsystem/autoplaybt || rm -f $dirsystem/autoplaybt
	[[ ${args[2]} == true ]] && touch $dirsystem/autoplaycd || rm -f $dirsystem/autoplaycd
	[[ ${args[3]} == true ]] && touch $dirsystem/autoplay || rm -f $dirsystem/autoplay
	pushRefresh
	;;
camilladspdisable )
	$dirbash/settings/camilladsp-gain.py
	systemctl stop camilladsp
	rm $dirsystem/camilladsp
	rmmod snd-aloop &> /dev/null
	$dirbash/settings/player-conf.sh
	pushRefresh
	pushSubmenu camilladsp false
	;;
camilladspasound )
	camilladspyml=$dircamilladsp/configs/camilladsp.yml
	new+=( $( sed -n '/capture:/,/channels:/ p' $camilladspyml | tail -1 | awk '{print $NF}' ) )
	new+=( $( sed -n '/capture:/,/format:/ p' $camilladspyml | tail -1 | awk '{print $NF}' ) )
	new+=( $( grep '^\s*samplerate:' $camilladspyml | awk '{print $NF}' ) )
	old=( $( grep -E 'channels|format|rate' /etc/asound.conf | awk '{print $NF}' ) )
	[[ "${new[@]}" == "${old[@]}" ]] && exit
	
	list=( channels format rate )
	for (( i=0; i < 3; i++ )); do
		[[ ${new[i]} != ${old[i]} ]] && sed -i -E 's/^(\s*'${list[i]}'\s*).*/\1'${new[i]}'/' /etc/asound.conf
	done
	alsactl nrestore &> /dev/null
	;;
camillaguiset )
	refresh=${args[1]}
	applyauto=${args[2]}
	sed -i -E "s/(status_update_interval: ).*/\1$refresh/" /srv/http/settings/camillagui/config/gui-config.yml
	systemctl restart camillagui
	touch $dirsystem/camilladsp
	$dirbash/settings/player-conf.sh
	pushRefresh
	pushSubmenu camilladsp true
	;;
dabradio )
	if [[ ${args[1]} == true ]]; then
		if timeout 1 rtl_test -t &> /dev/null; then
			systemctl enable --now rtsp-simple-server
			! grep -q 'plugin.*ffmpeg' /etc/mpd.conf && $dirbash/settings/player.sh ffmpeg$'\n'true
		else
			pushstreamNotify 'DAB Radio' 'No DAB devices found.' dabradio 5000
		fi
		
	else
		systemctl disable --now rtsp-simple-server
	fi
	pushRefresh
	;;
equalizer )
	enabled=${args[1]}
	if [[ $enabled == true ]]; then
		touch $dirsystem/equalizer
	else
		rm -f $dirsystem/equalizer
	fi
	$dirbash/settings/player-conf.sh
	pushRefresh
	pushSubmenu equalizer $enabled
	;;
hostapddisable )
	systemctl disable --now hostapd
	ifconfig wlan0 0.0.0.0
	pushRefresh
	pushRefreshNetworks
	;;
hostapdget )
	hostapdip=$( awk -F',' '/router/ {print $2}' /etc/dnsmasq.conf )
	hostapdpwd=$( awk -F'=' '/^#*wpa_passphrase/ {print $2}' /etc/hostapd/hostapd.conf | sed 's/"/\\"/g' )
	echo '[ "'$hostapdip'","'$hostapdpwd'" ]'
	;;
hostapdset )
	if [[ ${#args[@]} > 1 ]]; then
		iprange=${args[1]}
		router=${args[2]}
		password=${args[3]}
		sed -i -e -E "s/^(dhcp-range=).*/\1$iprange/
" -e -E "s/^(.*option:router,).*/\1$router/
" -e -E "s/^(.*option:dns-server,).*/\1$router/
" /etc/dnsmasq.conf
		sed -i -E '/^#*wpa|^#*rsn/ s/^#*//
' -e -E "s/(wpa_passphrase=).*/\1$password/
" /etc/hostapd/hostapd.conf
	else
		router=$( grep router /etc/dnsmasq.conf | cut -d, -f2 )
		sed -i -E '/^wpa|^rsn/ s/^/#/' /etc/hostapd/hostapd.conf
	fi
	netctl stop-all
	wlandev=$( cat $dirshm/wlan )
	if [[ $wlandev == wlan0 ]] && ! lsmod | grep -q brcmfmac; then
		modprobe brcmfmac
		iw wlan0 set power_save off
	fi
	ifconfig $wlandev $router
	featureSet hostapd
	pushRefreshNetworks
	;;
localbrowserdisable )
	ply-image /srv/http/assets/img/splash.png
	systemctl disable --now bootsplash localbrowser
	systemctl enable --now getty@tty1
	sed -i -E 's/(console=).*/\1tty1/' /boot/cmdline.txt
	rm -f $dirsystem/onwhileplay
	[[ -e $dirshm/btreceiver ]] && systemctl start bluetoothbutton
	pushRefresh
	;;
localbrowserset )
	newrotate=${args[1]}
	newzoom=${args[2]}
	newcursor=${args[3]}
	newscreenoff=${args[4]}
	newonwhileplay=${args[5]}
	if [[ -e $dirsystem/localbrowser.conf ]]; then
		. $dirsystem/localbrowser.conf
		[[ $rotate != $newrotate ]] && changedrotate=1          # [reboot] / [restart]
		[[ $zoom != $newzoom ]] && restart=1                    # [restart]
		[[ $cursor != $newcursor ]] && restart=1                # [restart]
		[[ $screenoff != $newscreenoff ]] && changedscreenoff=1 # xset dpms
		# onwhileplay                                           # flag file
	fi
	[[ $newonwhileplay == true ]] && touch $dirsystem/onwhileplay || rm -f $dirsystem/onwhileplay
	echo -n "\
rotate=$newrotate
zoom=$newzoom
screenoff=$newscreenoff
onwhileplay=$newonwhileplay
cursor=$newcursor
" > $dirsystem/localbrowser.conf
	if ! grep -q console=tty3 /boot/cmdline.txt; then
		sed -i -E 's/(console=).*/\1tty3 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt
		systemctl disable --now getty@tty1
	fi

	if [[ $changedrotate ]]; then
		$dirbash/cmd.sh rotatesplash$'\n'$newrotate # after set new data in conf file
		if grep -E -q 'waveshare|tft35a' /boot/config.txt; then
			case $newrotate in
				NORMAL ) degree=0;;
				CCW )    degree=270;;
				CW )     degree=90;;
				UD )     degree=180;;
			esac
			sed -i -E "/waveshare|tft35a/ s/(rotate=).*/\1$degree/" /boot/config.txt
			cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
			pushRefresh
			echo Rotate GPIO LCD screen >> $dirshm/reboot
			pushstreamNotify 'Rotate GPIO LCD screen' 'Reboot required.' chromium 5000
			exit
		fi
		
		restart=1
		rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
		case $newrotate in
			NORMAL ) rm -f $rotateconf;;
			CW )  matrix='0 1 0 -1 0 1 0 0 1';;
			CCW ) matrix='0 -1 1 1 0 0 0 0 1';;
			UD )  matrix='-1 0 1 0 -1 1 0 0 1';;
		esac
		[[ matrix ]] && sed "s/ROTATION_SETTING/$newrotate/; s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf > $rotateconf
	fi
	if [[ $restart ]] || ! systemctl -q is-active localbrowser; then
		systemctl restart bootsplash localbrowser
		if systemctl -q is-active localbrowser; then
			systemctl enable bootsplash localbrowser
			systemctl stop bluetoothbutton
		fi
	elif [[ $changedscreenoff ]]; then
		localbrowserXset $newscreenoff
		if [[ $screenoff == 0 || $newscreenoff == 0 ]]; then
			[[ $off == 0 ]] && tf=false || tf=true
			pushSubmenu screenoff $tf
		fi
	fi
	pushRefresh
	;;
localbrowserxset )
	localbrowserXset ${args[1]}
	;;
logindisable )
	rm -f $dirsystem/login*
	sed -i '/^bind_to_address/ s/".*"/"0.0.0.0"/' /etc/mpd.conf
	systemctl restart mpd
	pushRefresh
	pushSubmenu lock false
	;;
loginset )
	touch $dirsystem/login
	sed -i '/^bind_to_address/ s/".*"/"127.0.0.1"/' /etc/mpd.conf
	systemctl restart mpd
	pushRefresh
	pushSubmenu lock true
	;;
multiraudiodisable )
	rm -f $dirsystem/multiraudio
	pushRefresh
	pushSubmenu multiraudio false
	;;
multiraudioset )
	data=$( printf "%s\n" "${args[@]:1}" | awk NF )
	if [[ $( echo "$data" | wc -l ) > 2 ]]; then
		touch $dirsystem/multiraudio
		echo "$data" > $dirsystem/multiraudio.conf
		ip=$( ipGet )
		iplist=$( sed -n 'n;p' <<< "$data" | grep -v $ip )
		for ip in $iplist; do
			sshCommand $ip << EOF
echo "$data" > $dirsystem/multiraudio.conf 
touch $dirsystem/multiraudio
EOF
		done
	else
		rm -f $dirsystem/multiraudio*
	fi
	pushRefresh
	pushSubmenu multiraudio true
	;;
nfsserver )
	if [[ ${args[1]} == true ]]; then
		options="$( ipGet subnet )(rw,sync,no_subtree_check)"
		readarray -t dirs <<< $( { ls -d1 /mnt/MPD/SD/*/; ls -d1 /mnt/MPD/USB/*/; } | sed 's|/$||; s| |\\040|g' )
		for dir in "${dirs[@]}"; do
			! grep -q "^$dir" /etc/exports && list+="$dir $options"$'\n'
			[[ -d "$dir" ]] && ln -s "$dir" /mnt/MPD/NAS
		done
		list+="/srv/http/shareddata $options"
		echo "$list" >> /etc/exports
		ipGet > /srv/http/data/iplist
		chmod 777 /srv/http/data
		ln -sf /srv/http/{data,shareddata}
		systemctl -q is-active nfs-server && exportfs -ar || systemctl enable --now nfs-server
	else
		systemctl disable --now nfs-server
		rm -f /srv/http/data/iplist /srv/http/shareddata
		chmod 755 /srv/http/data
		sed -i '/^\// d' /etc/exports
		find /mnt/MPD/NAS -maxdepth 1 -type l -exec rm -f {} \;
	fi
	pushRefresh
	;;
screenofftoggle )
#	[[ $( /opt/vc/bin/vcgencmd display_power ) == display_power=1 ]] && toggle=0 || toggle=1
#	/opt/vc/bin/vcgencmd display_power $toggle # hdmi
	export DISPLAY=:0
	xset q | grep -q 'Monitor is Off' && xset dpms force on || xset dpms force off
	;;
scrobbledisable )
	rm -f $dirsystem/scrobble
	pushRefresh
	;;
scrobbleset )
	conf=( ${args[@]:1:5} )
	username=${args[6]}
	password=${args[7]}
	dirscrobble=$dirsystem/scrobble.conf
	mkdir -p $dirscrobble
	keys=( airplay bluetooth spotify upnp notify )
	for(( i=0; i < 5; i++ )); do
		fileconf=$dirscrobble/${keys[ i ]}
		[[ ${conf[ i ]} == true ]] && touch $fileconf || rm -f $fileconf
	done
	if [[ ! $password ]]; then
		if [[ -e $dirscrobble/key && $username == $( cat $dirscrobble/user ) ]]; then
			touch $dirsystem/scrobble
			pushRefresh
		fi
		exit
	fi
	
	keys=( $( grep -E 'apikeylastfm|sharedsecret' /srv/http/assets/js/main.js | cut -d"'" -f2 ) )
	apikey=${keys[0]}
	sharedsecret=${keys[1]}
	apisig=$( echo -n "api_key${apikey}methodauth.getMobileSessionpassword${password}username${username}$sharedsecret" \
				| iconv -t utf8 \
				| md5sum \
				| cut -c1-32 )
	reponse=$( curl -sX POST \
		--data "api_key=$apikey" \
		--data "method=auth.getMobileSession" \
		--data-urlencode "password=$password" \
		--data-urlencode "username=$username" \
		--data "api_sig=$apisig" \
		--data "format=json" \
		http://ws.audioscrobbler.com/2.0 )
	[[ $reponse =~ error ]] && echo $reponse && exit
	
	echo $username > $dirscrobble/user
	echo $reponse | sed 's/.*key":"//; s/".*//' > $dirscrobble/key
	touch touch $dirsystem/scrobble
	pushRefresh
	;;
shairport-sync | spotifyd | upmpdcli )
	service=${args[0]}
	enable=${args[1]}
	if [[ $enable == true ]]; then
		systemctl enable --now $service
	else
		systemctl disable --now $service
	fi
	pushRefresh
	;;
smbdisable )
	systemctl disable --now smb
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
	rm $dirsystem/snapclient
	pushRefresh
	pushSubmenu sanpclient false
	;;
snapclientset )
	echo 'SNAPCLIENT_OPTS="--latency='${args[1]}'"' > /etc/default/snapclient
	touch $dirsystem/snapclient
	systemctl try-restart snapclient
	pushRefresh
	pushSubmenu sanpclient true
	;;
snapserver )
	if [[ ${args[1]} == true ]]; then
		avahi=$( timeout 0.2 avahi-browse -rp _snapcast._tcp 2> /dev/null | grep '.*\;1704\;$' )
		if [[ $avahi ]]; then
			echo '{
  "icon"    : "snapcast"
, "title"   : "SnapServer"
, "message" : "Already running on: '$( echo $avahi | cut -d';' -f8 )'"
}'
			exit
		fi
		
		systemctl enable --now snapserver
	else
		systemctl disable --now snapserver
	fi
	$dirbash/settings/player-conf.sh
	pushRefresh
	;;
spotifyddisable )
	systemctl disable --now spotifyd
	pushRefresh
	;;
spotifytoken )
	code=${args[1]}
	[[ ! $code ]] && rm -f $dirsystem/spotify && exit
	
	. $dirsystem/spotify
	spotifyredirect=$( grep ^spotifyredirect $dirbash/settings/features-data.sh | cut -d= -f2 )
	tokens=$( curl -X POST https://accounts.spotify.com/api/token \
				-H "Authorization: Basic $base64client" \
				-H 'Content-Type: application/x-www-form-urlencoded' \
				-d "code=$code" \
				-d grant_type=authorization_code \
				--data-urlencode "redirect_uri=$spotifyredirect" )
	if grep -q error <<< "$tokens"; then
		spotifyReset "Error: $( echo $tokens | jq -r .error )"
		exit
	fi
	
	tokens=( $( echo $tokens | jq -r .refresh_token,.access_token ) )
	echo "refreshtoken=${tokens[0]}" >> $dirsystem/spotify
	echo ${tokens[1]} > $dirshm/spotify/token
	echo $(( $( date +%s ) + 3550 )) > $dirshm/spotify/expire
	featureSet spotifyd
	;;
spotifytokenreset )
	spotifyReset 'Reset ...'
	;;
stoptimerdisable )
	killall features-stoptimer.sh &> /dev/null
	rm -f $dirshm/stoptimer
	if [[ -e $dirshm/relayson ]]; then
		. $dirsystem/relays.conf
		echo $timer > $timerfile
		$dirbash/settings/relays-timer.sh &> /dev/null &
	fi
	pushRefresh
	;;
stoptimerset )
	min=${args[1]}
	poweroff=${args[2]}
	[[ $poweroff == true ]] && off=poweroff
	killall features-stoptimer.sh &> /dev/null
	rm -f $dirshm/stoptimer
	if [[ $min != false ]]; then
		$dirbash/settings/features-stoptimer.sh $min $off &> /dev/null &
		echo "[ $min, $poweroff ]" > $dirshm/stoptimer
	fi
	pushRefresh
	;;
upmpdclidisable )
	systemctl disable --now upmpdcli
	pushRefresh
	;;
upmpdcliset )
	[[ ${args[1]} == true ]] && val=1 || val=0
	sed -i -E "s/(ownqueue = )./\1$val/" /etc/upmpdcli.conf
	featureSet upmpdcli
	;;
	
esac
