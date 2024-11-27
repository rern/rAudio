#!/bin/bash

. /srv/http/bash/common.sh

CMD=$1
PKG=$1
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
		conf=$( configText /var/lib/iwd/ap/$( hostname ).ap )
		systemctl -q is-active iwd && conf+="
<bll># iwctl ap list</bll>
$( iwctl ap list | perl -pe 's/\e\[[0-9;]*m//g' )" # remove stdout colors
		;;
	bluealsa )
		conf="\
<bll># bluealsa-aplay -L</bll>
$( bluealsa-aplay -L )"
		;;
	bluez )
		conf=$( configText /etc/bluetooth/main.conf )
		SERVICE=bluetooth
		;;
	camilladsp )
		conf=$( configText /etc/default/camilladsp )
		;;
	dabradio )
		conf="\
<bll># rtl_test -t</bll>
$( script -qc 'timeout 0.1 rtl_test -t' )"
		rm -f /srv/http/typescript # from script command
		PKG=mediamtx
		;;
	localbrowser )
		PKG=firefox
		conf=$( configText $dirsystem/localbrowser.conf )
		skip+='|FATAL: Module g2d_23 not found'
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
		;;
	smb )
		PKG=samba
		conf=$( configText /etc/samba/smb.conf )
		;;
	snapclient )
		PKG=snapcast
		SERVICE=$CMD
		conf="\
$( configText /etc/default/snapclient )

<bll># SnapServer</bll> <gr>(avahi-browse -kprt _snapcast._tcp)</gr>
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
		SERVICE=$CMD
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
[[ ! $SERVICE ]] && SERVICE=$PKG
status=$( systemctl status $SERVICE \
			| grep -E -v "$skip" \
			| sed -E  -e 's|●|<grn>*</grn>|; s|○|*|
					' -e '/^\s*Loaded:/ {s|(disabled)|<yl>\1</yl>|g
										 s|(enabled)|<grn>\1</grn>|g}
					' -e '/^\s*Active:/ {s|( active \(.*\))|<grn>\1</grn>|
										 s|(failed)|<red>\1</red>|ig}' )

echo "\
$conf

<bll># systemctl status $SERVICE</bll>
$status"
