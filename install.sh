#!/bin/bash

alias=rre6

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

if [[ ! -e /etc/systemd/system/bluezdbus.service ]]; then
	mv /etc/systemd/system/bluez{-authorize,dbus}.service &> /dev/null
	sed -i 's/-authorize/dbus/' /etc/systemd/system/bluezdbus.service
	sed -i 's/-authorize/dbus/' /etc/systemd/system/bluetooth.service.d/override.conf
	systemctl daemon-reload
	systemctl try-restart bluetooth

	dirsystem=/srv/http/data/system

	ln -sf /srv/http/bash/motd.sh /etc/profile.d
	ln -sf /srv/http/bash/xinitrc /etc/X11/xinit

	dirset=/srv/http/data/shm/set

	mv $dirsystem/{gpio,relays} &> /dev/null
	mv $dirsystem/{gpio.json,relaysset} &> /dev/null

	mkdir -p $dirset
	cp $dirsystem/{audio*,display,hostname,onboard-wlan,order,relays*,version} $dirset 2> /dev/null
	cp $dirsystem/{bufferset,bufferoutputset,crossfadeset,custom*,lcdcharset,localbrowserset,replaygainset,soundprofile*,soxr*} $dirset 2> /dev/null
	rm -f $dirsystem/*
	cp $dirset/* $dirsystem
	chown http:http $dirsystem/*
	rm -rf $dirset

	if [[ -e $dirsystem/lcdcharset ]]; then
		val=( $( cat $dirsystem/lcdcharset ) )
		echo -n "\
[var]
cols=${val[0]}
charmap=${val[1]}
address=${val[2]}
chip=${val[3]}
" > /etc/lcdchar.conf
		rm $dirsystem/lcdcharset
	fi
	if [[ -e $dirsystem/localbrowserset ]]; then
		val=( $( cat $dirsystem/localbrowserset ) )
		echo -n "\
rotate=${val[0]}
screenoff=${val[1]}
cursor=${val[2]}
zoom=${val[3]}
" > /etc/localbrowser.conf
		rm $dirsystem/localbrowserset
	fi
	if [[ -e $dirsystem/soundprofileset ]]; then
		val=( $( cat $dirsystem/soundprofileset ) )
		echo -n "\
latency=${val[0]}
swappiness=${val[1]}
mtu=${val[2]}
txqueuelen=${val[3]}
" > /etc/soundprofile.conf
		rm $dirsystem/soundprofileset
	fi

	if [[ ! -e $dirsystem/bufferset ]]; then
		val=$( grep '^audio_buffer_size' /etc/mpd.conf | cut -d'"' -f2 )
		[[ -n $val ]] && echo $val > $dirsystem/bufferset
	fi
	if [[ ! -e $dirsystem/bufferoutputset ]]; then
		val=$( grep '^max_output_buffer_size' /etc/mpd.conf | cut -d'"' -f2 )
		[[ -n $val ]] && echo $val > $dirsystem/bufferoutputset
	fi
	if [[ ! -e $dirsystem/replaygainset ]]; then
		val=$( grep '^replaygain' /etc/mpd.conf | cut -d'"' -f2 )
		[[ $val != off ]] && echo $val > $dirsystem/replaygainset
	fi
	if [[ ! -e $dirsystem/crossfadeset ]]; then
		val=$( mpc crossfade | cut -d' ' -f2 )
		(( $val > 0 )) && echo $val > $dirsystem/crossfadeset
	fi

fi

file=/etc/systemd/system/bluetooth.service.d/override.conf
if grep -q network.sh $file; then
	sed -i 's/network.sh/networks.sh/' $file
	systemctl try-restart bluetooth
fi

sed -i '/IgnorePkg.*linux-raspberrypi/ d' /etc/pacman.conf

file=/etc/systemd/system/dnsmasq.service.d/override.conf
if [[ ! -e $file ]]; then
	mkdir -p /etc/systemd/system/{dnsmasq,hostapd}.service.d
	echo "[Unit]
Requires=hostapd.service
After=hostapd.service" > $file
	echo "[Unit]
BindsTo=dnsmasq.service" > /etc/systemd/system/hostapd.service.d/override.conf
	systemctl try-restart hostapd
fi

file=/etc/systemd/system/smb.service.d/override.conf
if [[ ! -e $file ]]; then
	mkdir -p /etc/systemd/system/smb.service.d
	echo "[Unit]
BindsTo=wsdd.service" > $file
	sed -i -e '/After=/ s/$/ smb.service/
' -e '/Wants=/ a\Requires=smb.service
' /etc/systemd/system/wsdd.service
	systemctl try-restart smb
fi

if [[ $( upmpdcli -v 2> /dev/null | cut -d' ' -f2 ) == 1.4.14 ]]; then
	pacman -R --noconfirm libnpupnp libupnpp upmpdcli
	pacman -Sy --noconfirm libnpupnp libupnpp upmpdcli
	systemctl try-restart upmpdcli
fi
grep -q upnpicon.png /etc/upmpdcli.conf.pacsave 2> /dev/null && mv -f /etc/upmpdcli.conf{.pacsave,}

installfinish
