#!/bin/bash

. /srv/http/bash/common.sh

CMD=$1
PKG=$1
SERVICE=$1
skip='register IPv6'

configText() {
	local config l lines linesL next
	config="<code>$( pacman -Q $PKG )</code>"
	readarray -t lines <<< $( grep -Ev '^#|=$|^$' $1 | awk NF )
	[[ ! $lines ]] && echo $config && return
	
	config+=$'\n'"<bll># cat $1</bll>"
	linesL=${#lines[@]}
	for (( i=0; i < $linesL; i++ )); do # remove empty sections
		l=${lines[i]}
		next=${lines[i + 1]}
		if [[ ${l:0:1} == [ ]]; then
			[[ $next && ${next:0:1} != [ ]] && config+=$'\n'$l
		else
			config+=$'\n'$l
		fi
	done
	echo "$config"
}

case $CMD in
	ap )
		PKG=iwd
		SERVICE=$PKG
		conf=$( configText /var/lib/iwd/ap/$( hostname ).ap )
		systemctl -q is-active iwd && conf+="
<bll># iwctl ap list</bll>
$( iwctl ap list | perl -pe 's/\e\[[0-9;]*m//g' )" # remove stdout colors
		[[ $2 ]] && echo "$conf" && exit
# --------------------------------------------------------------------
		;;
	bluealsa )
		conf="\
<bll># bluealsa-aplay -L</bll>
$( bluealsa-aplay -L )"
		;;
	bluez )
		SERVICE=bluetooth
		conf=$( configText /etc/bluetooth/main.conf )
		;;
	camilladsp )
		conf=$( configText /etc/default/camilladsp )
		;;
	dabradio )
		PKG=mediamtx
		SERVICE=$PKG
		conf="\
<bll># rtl_test -t</bll>
$( tty2std 'timeout 0.1 rtl_test -t' )"
		;;
	localbrowser )
		PKG=firefox
		conf=$( configText $dirsystem/localbrowser.conf )
		skip+='|FATAL: Module g2d_23 not found|XKEYBOARD keymap|Could not resolve keysym|Errors from xkbcomp|Failed to connect to session manager'
		;;
	mpd )
		conf=$( grep -Ev '^i|^#' $mpdconf )
		for file in autoupdate buffer normalization outputbuffer pllength replaygain custom; do
			fileconf=$dirmpdconf/$file.conf
			[[ -e $fileconf ]] && conf+=$'\n'$( < $fileconf )
		done
		conf=$( sort <<< $conf | sed 's/  *"/^"/' | column -t -s^ )
		for file in curl cdio ffmpeg bluetooth camilladsp fifo httpd snapserver output soxr soxr-custom; do
			fileconf=$dirmpdconf/$file.conf
			[[ -e $fileconf ]] && conf+=$'\n'$( < $fileconf )
		done
		conf="\
<bll># $mpdconf</bll>
$conf"
		skip+='|configuration file does not exist|wildmidi'
		;;
	nfsserver )
		PKG=nfs-utils
		SERVICE=nfs-server
		sharedip=$( grep -v $( ipAddress ) $filesharedip )
		[[ ! $sharedip ]] && sharedip='(none)'
		conf=$( configText /etc/exports )
		systemctl -q is-active nfs-server && conf+="

<bll># Active clients:</bll>
$sharedip"
		skip+='|Protocol not supported'
		;;
	shairportsync )
		PKG=shairport-sync
		SERVICE=$PKG
		;;
	smb )
		PKG=samba
		conf=$( configText /etc/samba/smb.conf )
		;;
	snapclient )
		PKG=snapcast
		conf="\
$( configText /etc/default/snapclient )

<bll># avahi-browse -kprt _snapcast._tcp</bll> <gr>(SnapServer list)</gr>
"
		if [[ -e $dirsystem/snapclientserver ]]; then
			conf+='(SnapClient + SnapServer)'
		else
			name_ip=$( snapserverList | jq -r .[] )
			[[ $name_ip ]] && conf+=$name_ip || conf+='<gr>(Not available)</gr>'
		fi
		;;
	snapserver )
		PKG=snapcast
		conf=$( configText /etc/snapserver.conf )
		;;
	spotifyd )
		skip+='|No.*specified|no usable credentials'
		;;
	upmpdcli )
		skip+='|not creating entry for'
		;;
esac
[[ ! $conf ]] && conf=$( configText /etc/$PKG.conf )
status=$( systemctl status $SERVICE \
			| grep -E -v "$skip" \
			| statusColor )

echo "\
$conf

<bll># systemctl status $SERVICE</bll>
$status"
