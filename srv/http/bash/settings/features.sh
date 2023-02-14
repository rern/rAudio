#!/bin/bash

. /srv/http/bash/common.sh

# convert each line to each args
readarray -t args <<< $1

pushData() {
	$dirsettings/player-conf.sh
	pushSubmenu $1 $2
	$dirsettings/features-data.sh pushrefresh
}
pushSubmenu() {
	pushstream display '{"submenu":"'$1'","value":'$2'}'
}
featureSet() {
	systemctl restart $@
	systemctl -q is-active $@ && systemctl enable $@
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
		grep -q -m1 '^state.*play' $dirshm/status && xset -dpms || xset +dpms
	else
		xset +dpms
	fi
}
nfsShareList() {
	awk NF <<< "\
$dirsd
$( find $dirusb -mindepth 1 -maxdepth 1 -type d )
$dirdata"
}
spotifyReset() {
	notify -blink spotify 'Spotify Client' "$1"
	rm -f $dirsystem/spotify $dirshm/spotify/*
	systemctl disable --now spotifyd
	pushRefresh
}

case ${args[0]} in

autoplay )
	if [[ ${args[1]} == true ]]; then
		[[ ${args[2]} == true ]] && touch $dirsystem/autoplaybt || rm -f $dirsystem/autoplaybt
		[[ ${args[3]} == true ]] && touch $dirsystem/autoplaycd || rm -f $dirsystem/autoplaycd
		[[ ${args[4]} == true ]] && touch $dirsystem/autoplay || rm -f $dirsystem/autoplay
	else
		rm -f $dirsystem/autoplay*
	fi
	pushRefresh
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
	if [[ ${args[1]} == true ]]; then
		refresh=${args[2]}
		applyauto=${args[3]}
		sed -i -E "s/(status_update_interval: ).*/\1$refresh/" /srv/http/settings/camillagui/config/gui-config.yml
		$dirbash/cmd.sh playerstop
		systemctl restart camillagui
		touch $dirsystem/camilladsp
	else
		camilladsp-gain.py
		systemctl stop camilladsp
		rm $dirsystem/camilladsp
		rmmod snd-aloop &> /dev/null
	fi
	pushData camilladsp ${args[1]}
	;;
dabradio )
	if [[ ${args[1]} == true ]]; then
		if timeout 1 rtl_test -t &> /dev/null; then
			systemctl enable --now rtsp-simple-server
			[[ ! -e $dirmpdconf/ffmpeg.conf ]] && $dirsettings/player.sh ffmpeg$'\n'true
		else
			notify dabradio 'DAB Radio' 'No DAB devices found.' 5000
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
	pushData equalizer ${args[1]}
	;;
hostapdget )
	hostapdip=$( grep router /etc/dnsmasq.conf | cut -d, -f2 )
	hostapdpwd=$( sed -E -n '/^wpa_pass/ {s/.*=(.*)/\1/; s/"/\\"/; p}' /etc/hostapd/hostapd.conf )
	echo '[ "'$hostapdip'","'$hostapdpwd'" ]'
	;;
hostapd )
	if [[ ${args[1]} == true ]]; then
		! lsmod | grep -q -m1 brcmfmac && $dirsettings/system.sh wlan$'\n'true
		ip=${args[2]}
		password=${args[3]}
		ip012=${ip%.*}
		ip3=$(( ${ip/*.} + 1 ))
		iprange=$ip012.$ip3,$ip012.254,24h
		sed -i -E -e "s/^(dhcp-range=).*/\1$iprange/
" -e "s/^(.*option:router,).*/\1$ip/
" -e "s/^(.*option:dns-server,).*/\1$ip/
" /etc/dnsmasq.conf
		sed -i -E "s/(wpa_passphrase=).*/\1$password/" /etc/hostapd/hostapd.conf
		netctl stop-all
		wlandev=$( < $dirshm/wlan )
		if [[ $wlandev == wlan0 ]] && ! lsmod | grep -q -m1 brcmfmac; then
			modprobe brcmfmac
			iw wlan0 set power_save off
		fi
		ifconfig $wlandev $router
		featureSet hostapd
	else
		systemctl disable --now hostapd
		$dirsettings/system.sh wlan$'\n'false
	fi
	pushRefresh
	pushstream refresh '{"page":"system","hostapd":'${args[1]}'}'
	pushRefresh networks
	;;
httpd )
	[[ ${args[1]} == true ]] && ln -s $dirmpdconf/{conf/,}httpd.conf || rm -f $dirmpdconf/httpd.conf
	systemctl restart mpd
	pushRefresh
	$dirsettings/player-data.sh pushrefresh
	;;
localbrowser )
	if [[ ${args[1]} == true ]]; then
		newrotate=${args[2]}
		newzoom=${args[3]}
		newcursor=${args[4]}
		newscreenoff=${args[5]}
		newonwhileplay=${args[6]}
		hdmi=${args[7]}
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
		if [[ $hdmi == true ]]; then
			if ! grep -q hdmi_force_hotplug=1 /boot/config.txt; then
				echo hdmi_force_hotplug=1 >> /boot/config.txt
				if ! grep -q hdmi_force_hotplug=1 /tmp/config.txt; then
					echo HDMI Hotplug >> $dirshm/reboot
					notify hdmi 'HDMI Hotplug' 'Reboot required.' 5000
				fi
			fi
		else
			sed -i '/hdmi_force_hotplug=1/ d' /boot/config.txt
		fi
		pushstream refresh '{"page":"system","hdmi":'$hdmi'}'
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
				if ! grep -q "rotate=$newrotate" /tmp/localbrowser.conf; then
					echo Rotate GPIO LCD screen >> $dirshm/reboot
					notify lcd 'Rotate GPIO LCD screen' 'Reboot required.' 5000
					exit
				fi
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
	else
		ply-image /srv/http/assets/img/splash.png
		systemctl disable --now bootsplash localbrowser
		systemctl enable --now getty@tty1
		sed -i -E 's/(console=).*/\1tty1/' /boot/cmdline.txt
		rm -f $dirsystem/onwhileplay
		[[ -e $dirshm/btreceiver ]] && systemctl start bluetoothbutton
	fi
	pushRefresh
	;;
localbrowserxset )
	localbrowserXset ${args[1]}
	;;
login )
	pushRefresh
	pushSubmenu lock true
	;;
logindisable )
	pushRefresh
	pushSubmenu lock false
	;;
lyricsembedded )
	feature=${args[0]}
	filefeature=$dirsystem/$feature
	[[ ${args[1]} == true ]] && touch $filefeature || rm -f $filefeature
	pushRefresh
	;;
multiraudio )
	if [[ ${args[1]} == true ]]; then
		data=$( printf "%s\n" "${args[@]:2}" | awk NF )
		if [[ $( wc -l <<< $data ) > 2 ]]; then
			touch $dirsystem/multiraudio
			echo "$data" > $dirsystem/multiraudio.conf
			ip=$( ipAddress )
			iplist=$( sed -n 'n; p' <<< $data | grep -v $ip ) # ip at even lines
			for ip in $iplist; do
				sshCommand $ip << EOF
echo "$data" > $dirsystem/multiraudio.conf 
touch $dirsystem/multiraudio
EOF
			done
		else
			rm -f $dirsystem/multiraudio*
		fi
	else
		rm -f $dirsystem/multiraudio
	fi
	pushRefresh
	pushSubmenu multiraudio ${args[1]}
	;;
nfsserver )
	active=${args[1]}
	readarray -t paths <<< $( nfsShareList )
	mpc -q clear
	if [[ $active == true ]]; then
		ip=$( ipAddress )
		options="${ip%.*}.0/24(rw,sync,no_subtree_check)"
		for path in "${paths[@]}"; do
			chmod 777 "$path"
			list+="${path// /\\040} $options"$'\n'
			name=$( basename "$path" )
			[[ $path == $dirusb/SD || $path == $dirusb/data ]] && name=usb$name
			ln -s "$path" "$dirnas/$name"
		done
		column -t <<< $list > /etc/exports
		echo $ip > $filesharedip
		cp -f $dirsystem/{display,order} $dirbackup
		touch $dirshareddata/system/order # in case not exist
		chmod 777 $filesharedip $dirshareddata/system/{display,order}
		echo "\
SD
USB" > /mnt/MPD/.mpdignore
		echo data > $dirnas/.mpdignore
		if [[ -e $dirbackup/mpdnfs ]]; then
			mv -f $dirmpd $dirbackup
			mv -f $dirbackup/mpdnfs $dirdata/mpd
			systemctl restart mpd
		else
			rm -f $dirmpd/{listing,updating}
			mkdir -p $dirbackup
			cp -r $dirmpd $dirbackup
			systemctl restart mpd
			$dirbash/cmd.sh mpcupdate$'\n'rescan
		fi
		systemctl enable --now nfs-server
		pushstream display $( sed -E 's/("sd"|"usb").*/\1: false,/' $dirsystem/display )
	else
		systemctl disable --now nfs-server
		rm -f /mnt/MPD/.mpdignore \
			$dirnas/.mpdignore \
			$filesharedip \
			$dirmpd/{listing,updating}
		for path in "${paths[@]}"; do
			chmod 755 "$path"
			name=$( basename "$path" )
			[[ $path == $dirusb/SD || $path == $dirusb/data ]] && name=usb$name
			[[ -L "$dirnas/$name" ]] && rm "$dirnas/$name"
		done
		> /etc/exports
		mkdir -p $dirbackup
		mv -f $dirmpd $dirbackup/mpdnfs
		mv -f $dirbackup/mpd $dirdata
		mv -f $dirbackup/{display,order} $dirsystem
		systemctl restart mpd
		pushstream display $( < $dirsystem/display )
	fi
	pushRefresh
	pushstream refresh '{"page":"system","nfsserver":'$active'}'
	;;
nfssharelist )
	nfsShareList
	;;
screenofftoggle )
#	[[ $( /opt/vc/bin/vcgencmd display_power ) == display_power=1 ]] && toggle=0 || toggle=1
#	/opt/vc/bin/vcgencmd display_power $toggle # hdmi
	export DISPLAY=:0
	xset q | grep -q -m1 'Monitor is Off' && xset dpms force on || xset dpms force off
	;;
scrobble ) # ( airplay bluetooth spotify upnp notify user password )
	if [[ ${args[1]} == true ]]; then
		conf=( ${args[@]:2:5} )
		username=${args[7]}
		password=${args[8]}
		dirscrobble=$dirsystem/scrobble.conf
		mkdir -p $dirscrobble
		keys=( airplay bluetooth spotify upnp notify )
		for(( i=0; i < 5; i++ )); do
			fileconf=$dirscrobble/${keys[ i ]}
			[[ ${conf[ i ]} == true ]] && touch $fileconf || rm -f $fileconf
		done
		if [[ ! $password ]]; then
			if [[ -e $dirscrobble/key && $username == $( < $dirscrobble/user ) ]]; then
				touch $dirsystem/scrobble
				pushRefresh
			fi
			exit
		fi
		
		keys=( $( grep -E 'apikeylastfm|sharedsecret' /srv/http/assets/js/main.js | cut -d"'" -f2 ) )
		apikey=${keys[0]}
		sharedsecret=${keys[1]}
		apisig=$( iconv -t utf8 <<< "api_key${apikey}methodauth.getMobileSessionpassword${password}username${username}$sharedsecret" \
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
		sed 's/.*key":"//; s/".*//' <<< $reponse > $dirscrobble/key
		touch touch $dirsystem/scrobble
	else
		rm -f $dirsystem/scrobble
	fi
	pushRefresh
	;;
shairport-sync|spotifyd )
	pkg=${args[0]}
	if [[ ${args[1]} == true ]]; then
		featureSet $pkg
	else
		[[ $( cat $dirshm ) == airplay ]] && $dirbash/cmd.sh playerstop
		systemctl disable --now $pkg
	fi
	pushRefresh
	;;
smb )
	if [[ ${args[1]} == true ]]; then
		smbconf=/etc/samba/smb.conf
		sed -i '/read only = no/ d' $smbconf
		[[ ${args[2]} == true ]] && sed -i '/path = .*SD/ a\	read only = no' $smbconf
		[[ ${args[3]} == true ]] && sed -i '/path = .*USB/ a\	read only = no' $smbconf
		featureSet smb
	else
		systemctl disable --now smb
	fi
	pushRefresh
	;;
snapclient )
	[[ -e $dirmpdconf/snapserver.conf ]] && snapserver=1
	if [[ ${args[1]} == true ]]; then
		echo 'SNAPCLIENT_OPTS="--latency='${args[2]}'"' > /etc/default/snapclient
		[[ -e $dirsystem/snapclient ]] && systemctl try-restart snapclient
		
		touch $dirsystem/snapclient
		if [[ $snapserver ]]; then
			touch $dirsystem/snapclientserver
			grep -q state.*play $dirshm/status && systemctl start snapclient
		fi
	else
		rm $dirsystem/snapclient
		systemctl stop snapclient
		[[ $snapserver ]] && rm $dirsystem/snapclientserver
	fi
	pushRefresh
	;;
snapserver )
	[[ ${args[1]} == true ]] && enable=1
	if [[ $enable ]]; then
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
	pushRefresh
	;;
spotifytoken )
	code=${args[1]}
	[[ ! $code ]] && rm -f $dirsystem/spotify && exit
	
	. $dirsystem/spotify
	spotifyredirect=$( grep ^spotifyredirect $dirsettings/features-data.sh | cut -d= -f2 )
	tokens=$( curl -X POST https://accounts.spotify.com/api/token \
				-H "Authorization: Basic $base64client" \
				-H 'Content-Type: application/x-www-form-urlencoded' \
				-d "code=$code" \
				-d grant_type=authorization_code \
				--data-urlencode "redirect_uri=$spotifyredirect" )
	if grep -q -m1 error <<< $tokens; then
		spotifyReset "Error: $( jq -r .error <<< $tokens )"
		exit
	fi
	
	tokens=( $( jq -r .refresh_token,.access_token <<< $tokens ) )
	echo "refreshtoken=${tokens[0]}" >> $dirsystem/spotify
	echo ${tokens[1]} > $dirshm/spotify/token
	echo $(( $( date +%s ) + 3550 )) > $dirshm/spotify/expire
	featureSet spotifyd
	pushRefresh
	;;
spotifytokenreset )
	spotifyReset 'Reset ...'
	;;
stoptimer )
	if [[ ${args[1]} == true ]]; then
		min=${args[2]}
		poweroff=${args[3]}
		[[ $poweroff == true ]] && off=poweroff
		killall features-stoptimer.sh &> /dev/null
		rm -f $dirshm/stoptimer
		if [[ $min != false ]]; then
			$dirsettings/features-stoptimer.sh $min $off &> /dev/null &
			echo "[ $min, $poweroff ]" > $dirshm/stoptimer
		fi
	else
		killall features-stoptimer.sh &> /dev/null
		rm -f $dirshm/stoptimer
		if [[ -e $dirshm/relayson ]]; then
			. $dirsystem/relays.conf
			echo $timer > $timerfile
			$dirsettings/relays-timer.sh &> /dev/null &
	fi
	fi
	pushRefresh
	;;
upmpdcli )
	if [[ ${args[1]} == true ]]; then
		[[ ${args[2]} == true ]] && val=1 || val=0
		sed -i -E "s/(ownqueue = )./\1$val/" /etc/upmpdcli.conf
		featureSet upmpdcli
	else
		systemctl disable --now upmpdcli
	fi
	pushRefresh
	;;
	
esac
