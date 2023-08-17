#!/bin/bash

. /srv/http/bash/common.sh

CMD=$1
PKG=$1
SERVICE=$1
skip='register IPv6'

case $CMD in
	bluetooth )
		PKG=bluez
		;;
	camilladsp )
		fileconf=$( getVar CONFIG /etc/default/camilladsp )
		;;
	dabradio )
		PKG=mediamtx
		SERVICE=mediamtx
		conf="\
<bll># rtl_test -t</bll>
$( script -c "timeout 1 rtl_test -t" | grep -v ^Script )"
		;;
	hostapd )
		conf="\
<bll># cat /etc/hostapd/hostapd.conf</bll>
$( < /etc/hostapd/hostapd.conf )

<bll># cat /etc/dnsmasq.conf</bll>
$( < /etc/dnsmasq.conf )"
		;;
	localbrowser )
		fileconf=$dirsystem/localbrowser.conf
		if [[ -e /usr/bin/firefox ]]; then
			PKG=firefox
		else
			PKG=chromium
			skip+='|Could not resolve keysym|ERROR:chrome_browser_main_extra_parts_metrics'
		fi
		;;
	mpd )
		conf=$( grep -v ^i $mpdconf )
		for file in autoupdate buffer outputbuffer replaygain normalization custom; do
			fileconf=$dirmpdconf/$file.conf
			[[ -e $fileconf ]] && conf+=$'\n'$( < $fileconf )
		done
		conf=$( sort <<< $conf | sed 's/  *"/^"/' | column -t -s^ )
		for file in cdio curl ffmpeg fifo httpd snapserver soxr-custom soxr bluetooth output; do
			fileconf=$dirmpdconf/$file.conf
			[[ -e $fileconf ]] && conf+=$'\n'$( < $fileconf )
		done
		conf="\
<bll># $mpdconf</bll>
$( awk NF <<< $conf )"
		skip+='|configuration file does not exist|wildmidi'
		;;
	nfsserver )
		PKG=nfs-utils
		SERVICE=nfs-server
		sharedip=$( grep -v $( ipAddress ) $filesharedip )
		[[ ! $sharedip ]] && sharedip='(none)'
		systemctl -q is-active nfs-server && conf="\
<bll># cat /etc/exports</bll>
$( cat /etc/exports )

<bll># Active clients:</bll>
$sharedip"
		skip+='|Protocol not supported'
		;;
	smb )
		PKG=samba
		fileconf=/etc/samba/smb.conf
		;;
	snapclient )
		PKG=snapcast
		fileconf=/etc/default/snapclient
		;;
	snapserver )
		PKG=snapcast
		;;
	upmpdcli )
		skip+='|not creating entry for'
		fileconf=/etc/upmpdcli.conf
		;;
	* )
		fileconf=/etc/$PKG.conf
		;;
esac
status=$( systemctl status $SERVICE \
				| grep -E -v "$skip" \
				| sed -E -e '1 s|^.* (.*service) |<code>\1</code>|
						' -e '/^\s*Active:/ {s|( active \(.*\))|<grn>\1</grn>|
											 s|( inactive \(.*\))|<red>\1</red>|
											 s|(failed)|<red>\1</red>|ig}' )
config="<code>$( pacman -Q $PKG )</code>"
if [[ $conf ]]; then
	config+="
$conf"
elif [[ -e $fileconf ]]; then
	config+="
<bll># cat $fileconf</bll>
$( grep -v ^# $fileconf )"
fi

echo "\
$config

$status"
