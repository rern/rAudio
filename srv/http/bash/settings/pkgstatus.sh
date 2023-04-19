#!/bin/bash

. /srv/http/bash/common.sh

pkg=$1

case $pkg in
	camilladsp )
		fileconf=$dircamilladsp/configs/camilladsp.yml
		;;
	dabradio )
		pkg=mediamtx
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
			browser=firefox
		else
			browser=chromium
			skip='Could not resolve keysym|Address family not supported by protocol|ERROR:chrome_browser_main_extra_parts_metrics'
		fi
		config="<code>$( pacman -Q $browser )</code>"
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
		skip='configuration file does not exist'
		;;
	nfsserver )
		pkg=nfs-utils
		systemctl -q is-active nfs-server && fileconf=/etc/exports
		skip='Protocol not supported'
		;;
	smb )
		pkg=smb
		fileconf=/etc/samba/smb.conf
		;;
	snapclient )
		pkg=snapcast
		fileconf=/etc/default/snapclient
		;;
	upmpdcli )
		skip='not creating entry for'
		fileconf=/etc/upmpdcli.conf
		;;
	* )
		fileconf=/etc/$pkg.conf
		;;
esac
[[ ! $config ]] && config="<code>$( pacman -Q $pkg )</code>"
if [[ $conf ]]; then
	config+="
$conf"
elif [[ -e $fileconf ]]; then
	config+="
<bll># cat $fileconf</bll>
$( grep -v ^# $fileconf )"
fi
status=$( systemctl status $pkg \
				| sed -E  -e '1 s|^.* (.*service) |<code>\1</code>|
						' -e '/^\s*Active:/ {s|( active \(.*\))|<grn>\1</grn>|
											 s|( inactive \(.*\))|<red>\1</red>|
											 s|(failed)|<red>\1</red>|ig}' )
[[ $skip ]] && status=$( grep -E -v "$skip" <<< $status )
echo "\
$config

$status"
