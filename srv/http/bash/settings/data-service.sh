#!/bin/bash

. /srv/http/bash/common.sh

CMD=$1
PKG=$1
SERVICE=$1
skip='register IPv6'

configText() {
	local l lines linesL next
	conf="\
<c>$( pacman -Q $PKG )</c>"
	readarray -t lines < <( grep -Ev '^#|=$|^$' $1 | awk NF )
	[[ ! $lines ]] && echo $conf && return
	
	conf+="
<bll># cat $1</bll>"
	linesL=${#lines[@]}
	for (( i=0; i < $linesL; i++ )); do # remove empty sections
		l=${lines[i]}
		next=${lines[i + 1]}
		if [[ ${l:0:1} == [ ]]; then
			[[ $next && ${next:0:1} != [ ]] && conf+="
$l"
		else
			conf+="
$l"
		fi
	done
}

case $CMD in

ap )
	PKG=iwd
	SERVICE=$PKG
	configText /var/lib/iwd/ap/$( hostname ).ap
	if systemctl -q is-active iwd; then
		cmd='iwctl ap list'
		conf+="
<bll># $cmd</bll>
$( eval $cmd | perl -pe 's/\e\[[0-9;]*m//g' )" # remove stdout colors
	fi
	[[ $2 ]] && echo "$conf" && exit
# --------------------------------------------------------------------
	;;
bluealsa )
	cmd='bluealsa-aplay -L'
	conf="\
<bll># $cmd</bll>
$( eval $cmd )"
	;;
bluez )
	SERVICE=bluetooth
	configText /etc/bluetooth/main.conf
	;;
camilladsp )
	configText /etc/default/camilladsp
	;;
dabradio )
	PKG=mediamtx
	SERVICE=$PKG
	conf="\
<bll># rtl_test -t</bll>
$( dabDevice )"
	;;
localbrowser )
	PKG=firefox
	configText $dirsystem/localbrowser.conf
	skip+='|FATAL: Module g2d_23 not found|XKEYBOARD keymap|Could not resolve keysym|Errors from xkbcomp|Failed to connect to session manager'
	;;
mpd )
	conf="\
$( grep -Ev '^i|^#' $dirmpdconf/mpd.conf )"
	for file in autoupdate buffer normalization outputbuffer pllength replaygain custom; do
		fileconf=$dirmpdconf/$file.conf
		[[ -e $fileconf ]] && conf+="
$( < $fileconf )"
	done
	conf="\
$( sort <<< $conf | sed 's/  *"/^"/' | column -t -s^ )"
	for file in curl cdio ffmpeg bluetooth camilladsp fifo httpd snapserver output soxr soxr-custom; do
		fileconf=$dirmpdconf/$file.conf
		[[ -e $fileconf ]] && conf+="
$( < $fileconf )"
	done
	conf="\
<bll># $dirmpdconf/mpd.conf</bll>
$conf"
	skip+='|configuration file does not exist|wildmidi'
	;;
mpdoled )
	PKG=mpd_oled
	SERVICE=mpd_oled
	configText /etc/default/mpd_oled
	;;
nfsserver )
	SERVICE=nfs-server
	ip_client=$( ipSharedData )
	[[ ! $ip_client ]] && ip_client='(none)'
	ver=$( sed -E 's/-[0-9.]* |\+//g; s/ /, /g' /proc/fs/nfsd/versions )
	conf="\
<c>$( nfsdctl -V )</c> supports NFS: $ver"
	if nfsServerActive; then
		conf+="
<bll># cat /etc/exports</bll>
$( < /etc/exports )
<bll># Active clients:</bll>
$ip_client"
	fi
	;;
shairportsync )
	PKG=shairport-sync
	SERVICE=$PKG
	;;
smb )
	PKG=samba
	configText /etc/samba/smb.conf
	;;
snapclient )
	PKG=snapcast
	configText /etc/default/snapclient
	conf+='

<bll># avahi-browse -kprt _snapcast._tcp</bll> <gr>(SnapServer list)</gr>'
	if [[ -e $dirsystem/snapclientserver ]]; then
		conf+='
(SnapClient + SnapServer)'
	else
		name_ip=$( snapserverList | jq -r .[] )
		if [[ $name_ip ]]; then
			conf+="
$name_ip"
		else
			conf+='
<gr>(Not available)</gr>'
		fi
	fi
	;;
snapserver )
	PKG=snapcast
	configText /etc/snapserver.conf
	;;
spotifyd )
	skip+='|No.*specified|no usable credentials'
	;;
upmpdcli )
	skip+='|not creating entry for'
	;;
vuled )
	PKG=cava
	SERVICE=$PKG
	;;

esac

[[ ! $conf ]] && configText /etc/$PKG.conf
status="\
$( systemctl status $SERVICE \
		| grep -E -v "$skip" \
		| statusColor )"

echo "\
$conf

<bll># systemctl status $SERVICE</bll>
$status"
