#!/bin/bash

. /srv/http/bash/common.sh

argsConvert "$1"

pushRestartMpd() {
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
	. $dirsystem/localbrowser.conf
	export DISPLAY=:0
	local off=$(( $screenoff * 60 ))
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

case $cmd in

autoplay|lyricsembedded|scrobble )
	[[ $enable ]] && touch $dirsystem/$cmd || rm -f $dirsystem/$cmd
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
	if [[ $enable ]]; then
		sed -i -E "s/(interval: ).*/\1$refresh/" /srv/http/settings/camillagui/config/gui-config.yml
		$dirbash/cmd.sh playerstop
		systemctl restart camillagui
		touch $dirsystem/camilladsp
	else
		camilladsp-gain.py
		systemctl stop camilladsp
		rm $dirsystem/camilladsp
		rmmod snd-aloop &> /dev/null
	fi
	pushRestartMpd camilladsp $enable
	;;
dabradio )
	if [[ $enable ]]; then
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
	[[ $enable ]] && touch $dirsystem/equalizer || rm -f $dirsystem/equalizer
	pushRestartMpd equalizer $enabled
	;;
hostapd )
	if [[ $enable ]]; then
		! lsmod | grep -q -m1 brcmfmac && $dirsettings/system.sh wlan$'\n'true
		ip012=${ip%.*}
		ip3=$(( ${ip/*.} + 1 ))
		iprange=$ip012.$ip3,$ip012.254,24h
		sed -i -E -e "s/^(dhcp-range=).*/\1$iprange/
" -e "s/^(.*option:router,).*/\1$ip/
" -e "s/^(.*option:dns-server,).*/\1$ip/
" /etc/dnsmasq.conf
		sed -i -E "s/(wpa_passphrase=).*/\1$wpa_passphrase/" /etc/hostapd/hostapd.conf
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
	pushstream refresh '{"page":"system","hostapd":'$enable'}'
	pushRefresh networks
	;;
httpd )
	[[ $enable ]] && ln -s $dirmpdconf/{conf/,}httpd.conf || rm -f $dirmpdconf/httpd.conf
	systemctl restart mpd
	pushRefresh
	$dirsettings/player-data.sh pushrefresh
	;;
localbrowser )
	if [[ $enable ]]; then
		file=$dirsystem/localbrowser.conf
		sed -i '/brightness/ d' $file
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
		if [[ $hdmi ]]; then
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
		if [[ $diffrotate ]]; then
			case $rotate in
				NORMAL ) degree=0;;
				CCW )    degree=270 && matrix='0 1 0 -1 0 1 0 0 1';;
				CW )     degree=90  && matrix='0 -1 1 1 0 0 0 0 1';;
				UD )     degree=180 && matrix='-1 0 1 0 -1 1 0 0 1';;
			esac
			$dirbash/cmd.sh rotatesplash$'\n'$rotate # after set new data in conf file
			if grep -E -q 'waveshare|tft35a' /boot/config.txt; then
				sed -i -E "/waveshare|tft35a/ s/(rotate=).*/\1$degree/" /boot/config.txt
				cp -f /etc/X11/{lcd$degree,xorg.conf.d/99-calibration.conf}
				pushRefresh
				if ! grep -q "rotate=$rotate" /tmp/localbrowser.conf; then
					echo Rotate GPIO LCD screen >> $dirshm/reboot
					notify lcd 'Rotate GPIO LCD screen' 'Reboot required.' 5000
					exit
				fi
			fi
			
			restart=1
			rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
			if [[ $matrix ]]; then
				sed "s/ROTATION_SETTING/$rotate/; s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf > $rotateconf
			else 
				rm -f $rotateconf
			fi
		fi
		if [[ $diffscreenoff ]]; then
			localbrowserXset
			[[ $screenoff == 0 ]] && pushSubmenu screenoff false || pushSubmenu screenoff true
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
	if [[ ${args[1]} ]]; then
		touch $dirsystem/multiraudio
		fileconf=$dirsystem/multiraudio.conf
		conf=$( < $fileconf )
		iplist=$( sed -E 's/^_|=.*//g; s/_/./g' $fileconf | grep -v $( ipAddress ) )
		for ip in $iplist; do
			sshCommand $ip << EOF
echo "$conf" > $fileconf
touch $dirsystem/multiraudio
pushstream display '{"submenu":"multiraudio","value":true}'
EOF
		done
	else
		rm -f $dirsystem/multiraudio
		[[ $data == removeconf ]] && rm -f $dirsystem/multiraudio.conf
	fi
	pushRefresh
	pushSubmenu multiraudio $enable
	;;
nfsserver )
	readarray -t paths <<< $( nfsShareList )
	mpc -q clear
	if [[ $active ]]; then
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
scrobblekeyget )
	token=${token[1]:0:32}
	keys=( $( grep -E 'apikeylastfm|sharedsecret' /srv/http/assets/js/main.js | cut -d"'" -f2 ) )
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
shairport-sync|spotifyd )
	if [[ $enable ]]; then
		featureSet $cmd
	else
		[[ $( < $dirshm/player ) == airplay ]] && $dirbash/cmd.sh playerstop
		systemctl disable --now $cmd
	fi
	pushRefresh
	;;
smb )
	if [[ $enable ]]; then
		smbconf=/etc/samba/smb.conf
		sed -i '/read only = no/ d' $smbconf
		[[ $sd ]] && sed -i '/path = .*SD/ a\	read only = no' $smbconf
		[[ $usb ]] && sed -i '/path = .*USB/ a\	read only = no' $smbconf
		featureSet smb
	else
		systemctl disable --now smb
	fi
	pushRefresh
	;;
snapclient )
	[[ -e $dirmpdconf/snapserver.conf ]] && snapserver=1
	if [[ $enable ]]; then
		echo 'SNAPCLIENT_OPTS="--latency='$latency'"' > /etc/default/snapclient
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
	if [[ $enable ]]; then
		touch $dirshm/stoptimer
		killall features-stoptimer.sh &> /dev/null
		$dirsettings/features-stoptimer.sh &> /dev/null &
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
	if [[ $enable ]]; then
		[[ $ownqueue ]] && line='ownqueue = 1' || line='ownqueue = 0'
		sed -i "s/^ownqueue.*/$line/" /etc/upmpdcli.conf
		featureSet upmpdcli
	else
		systemctl disable --now upmpdcli
	fi
	pushRefresh
	;;
	
esac
