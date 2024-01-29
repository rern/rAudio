#!/bin/bash

. /srv/http/bash/common.sh

revision=$( grep ^Revision /proc/cpuinfo )
echo "\
BB=${revision: -3:2}
C=${revision: -4:1}" > $dirshm/cpuinfo

# wifi - on-board or usb
wlandev=$( $dirsettings/networks.sh wlandevice )
[[ $wlandev ]] && readarray -t wlanprofile <<< $( ls -1p /var/lib/iwd | sed -n '/\/$/! {s/.psk$\|.open$//; p}' )

# pre-configure --------------------------------------------------------------
if [[ -e /boot/expand ]]; then # run once
	id0=$( < /etc/machine-id )
	rm /etc/machine-id
	systemd-machine-id-setup
	id1=$( < /etc/machine-id )
	mv /var/log/journal/{$id0,$id1}
	rm /boot/expand
	partition=$( mount | grep ' on / ' | cut -d' ' -f1 )
	[[ ${partition:0:7} == /dev/sd ]] && dev=${partition:0:-1} || dev=${partition:0:-2}
	if (( $( sfdisk -F $dev | awk 'NR==1{print $6}' ) != 0 )); then
		echo -e "d\n\nn\n\n\n\n\nw" | fdisk $dev &>/dev/null
		partprobe $dev
		resize2fs $partition
	fi
fi

backupfile=$( ls /boot/*.gz 2> /dev/null | head -1 )
if [[ -e $backupfile ]]; then
	mv "$backupfile" $dirshm/backup.gz
	$dirsettings/system-datarestore.sh
	if [[ $? != 0 ]]; then
		notbackupfile=1
		mv $dirshm/backup.gz "${backupfile}X"
	fi
fi

filewifi=$( ls -1 /boot/*.{psk,open} 2> /dev/null | head -1 )
if [[ $filewifi && $wlandev ]]; then
	filename=${filewifi/*\/}
	ssid=${filename%.*}
	hidden=$( getVar Hidden "$filewifi" )
	passphrase=$( getVar Passphrase "$filewifi" ' ' )
	if [[ $passphrase ]] && ! grep -q ^PreSharedKey "$filewifi"; then
		presharedkey=$( wpa_passphrase "$ssid" $passphrase | sed -n '/^\s*psk=/ {s/.*=//; p}' )
		sed -i "/^Passphrase/ i\PreSharedKey=$presharedkey" $filewifi
	fi
	if grep '^[0-9a-zA-Z _-]*$' <<< $ssid; then
		filename=$( echo -n "$ssid" | hexdump -ve '/1 "%02X"' )
		cp "$filewifi" "/var/lib/iwd/=$filename"
	else
		cp "$filewifi" /var/lib/iwd
	fi
	$dirsettings/networks.sh "iwctlconnect
$ssid
$hidden
CMD SSID HIDDEN"
fi
# ----------------------------------------------------------------------------

[[ -e $dirsystem/lcdchar ]] && $dirbash/lcdchar.py logo

[[ -e $dirsystem/mpdoled ]] && $dirsettings/system.sh mpdoledlogo

[[ -e $dirsystem/soundprofile ]] && $dirsettings/system.sh soundprofileset

filebrightness=/sys/class/backlight/rpi_backlight/brightness
if [[ -e $filebrightness ]]; then
	chmod 666 $filebrightness
	[[ -e $dirsystem/brightness ]] && cat $dirsystem/brightness > $filebrightness
fi

mkdir -p $dirshm/{airplay,embedded,spotify,local,online,sampling,webradio}
chmod -R 777 $dirshm
chown -R http:http $dirshm
echo 'state="stop"' > $dirshm/status
echo mpd > $dirshm/player

lsmod | grep -q -m1 brcmfmac && touch $dirshm/onboardwlan # initial status

[[ -e $dirsystem/ap ]] && ap=1

ipaddress=$( ipAddress )
if [[ $wlanprofile && ! $ap ]]; then
	systemctl start iwd
	iwctl station $wlandev scan
	for ssid in "${wlanprofile[@]}"; do
		for i in {0..9}; do
			sleep 1
			iwctl station $wlandev get-networks | sed -e '1,4 d' | grep -q "^.*$ssid" && break
		done
		iwctl station $wlandev connect "$ssid"
		sleep 1
		[[ $( iwgetid -r $wlandev ) ]] && break
		[[ ! $ipaddress ]] && ipaddress=$( ipAddress )
	done
fi

if [[ $ipaddress ]]; then
	readarray -t lines <<< $( grep $dirnas /etc/fstab )
	if [[ $lines ]]; then
		for line in "${lines[@]}"; do # ping target before mount
			[[ ${line:0:2} == // ]] && ip=$( cut -d/ -f3 <<< $line ) || ip=$( cut -d: -f1 <<< $line )
			for i in {1..10}; do
				if ipOnline $ip; then
					mountpoint=$( awk '{print $2}' <<< $line )
					mount "${mountpoint//\\040/ }" && nasonline=1 && break
					sleep 2
				fi
			done
		done
	fi
	if systemctl -q is-active nfs-server; then
		if [[ -s $filesharedip ]]; then
			sharedip=$( < $filesharedip )
			for ip in $sharedip; do
				notify -ip $ip networks 'Server rAudio' Online
			done
		fi
		appendSortUnique $ipaddress $filesharedip
	fi
	[[ -e $filewifi ]] && rm -f $filewifi
else
	if [[ $wlandev && ! $ap ]]; then
		if [[ $wlanprofile ]]; then
			[[ ! -e $dirsystem/wlannoap ]] && ap=1
		else
			ap=1
		fi
		[[ $ap ]] && touch $dirshm/apstartup
		[[ -e $filewifi ]] && mv $filewifi{,X}
	fi
fi
[[ $ap ]] && $dirsettings/features.sh iwctlap

if [[ -e $dirsystem/btconnected ]]; then
	readarray -t devices < $dirsystem/btconnected
	rm $dirsystem/btconnected
	for dev in "${devices[@]}"; do
		mac=$( cut -d' ' -f1 <<< $dev )
		$dirbash/bluetoothcommand.sh connect $mac
	done
fi

if [[ -e $dirshm/btreceiver && -e $dirsystem/camilladsp ]]; then
	$dirsettings/camilla-bluetooth.sh receiver
else # start mpd.service if not started by bluetoothcommand.sh
	$dirsettings/player-conf.sh
fi
if [[ -e $dirsystem/volumeboot ]]; then
	. $dirsystem/volumeboot.conf
	if [[ -e $dirshm/btreceiver ]]; then
		control=$( < $dirshm/btreceiver )
		amixer -MqD bluealsa sset "$control" $volume
	elif [[ -e $dirshm/amixercontrol ]]; then
		card=$( < $dirsystem/asoundcard )
		control=$( < $dirshm/amixercontrol )
		amixer -c $card -Mq sset "$control" ${volume}%
	else
		mpc -q volume $volume
	fi
fi

# after all sources connected ........................................................
if [[ -e $dirsystem/hddsleep && -e $dirsystem/apm ]]; then
	$dirsettings/system.sh "hddsleep
$( < $dirsystem/apm )
CMD APM"
fi

if [[ ! -e $dirmpd/mpd.db ]]; then
	echo rescan > $dirmpd/updating
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/updating ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
fi
# usb wlan || no wlan || not ap + not connected
if (( $( rfkill | grep -c wlan ) > 1 )) || [[ ! $wlanprofile && ! $ap ]]; then
	rmmod brcmfmac_wcc brcmfmac &> /dev/null
fi

touch $dirshm/startup
if [[ -e $dirsystem/autoplay ]] && grep -q startup=true $dirsystem/autoplay.conf; then
	$dirbash/cmd.sh mpcplayback$'\n'play$'\nCMD ACTION'
fi

if [[ -e /boot/startup.sh ]]; then # no shorthand for last if else - startup.service failed
	/boot/startup.sh
fi

if [[ $ipaddress ]]; then
	avahi-resolve -a4 $ipaddress | awk '{print $NF}' > $dirshm/avahihostname
	$dirsettings/addons-data.sh &> /dev/null &
fi

if [[ $notbackupfile ]]; then
	notify restore 'Restore Settings' '<code>'$backupfile'</code> is not rAudio backup.' 10000
fi
if [[ $nas && ! $nasonline ]]; then
	[[ $notbackupfile ]] && sleep 3
	notify nas NAS "NAS @$ip cannot be reached." -1
fi
