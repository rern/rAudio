#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240120
if [[ ! -e /usr/bin/iwctl ]]; then
	pacman -Sy --noconfirm iwd
	mkdir -p /etc/iwd /var/lib/iwd/ap
	echo "\
[General]
EnableNetworkConfiguration=true

[Scan]
DisablePeriodicScan=true

[Network]
EnableIPv6=false
" >/etc/iwd/main.conf
	echo "\
[Security]
Passphrase=raudioap

[IPv4]
Address=192.168.5.1
Gateway=192.168.5.1
Netmask=255.255.255.0
DNSList=8.8.8.8
" > /var/lib/iwd/ap/rAudio.ap
fi

if [[ ! -e /usr/bin/gpioset ]]; then
	pacman -Sy --noconfirm libgpiod
	
	file=$dirsystem/powerbutton.conf
	if [[ -e $file ]]; then
	. $file
	echo "\
on=${j8_bcm[on]}
sw=${j8_bcm[sw]}
led=${j8_bcm[led]}
reserved=${j8_bcm[reserved]}" > $file
		systemctl -q is-enabled powerbutton && powerbuttonrestart=1
	fi
	
	file=$dirsystem/relays.conf
	if [[ -e $file ]]; then
		. $file
		for i in $on; do
			onnew+=" ${j8_bcm[i]}"
		done
		for i in $off; do
			offnew+=" ${j8_bcm[i]}"
		done
		new=$( grep -Ev '^on=|^off=' $file )
		conf="\
on='${onnew:1}'
off='${offnew:1}'
$( grep -Ev '^on=|^off=' $file )"
		echo "$conf" > $file
		
		file=$dirsystem/relays.json
		pins=$( jq keys < $file | tr -d '"[],\n' )
		for p in $pins; do
			json+=', "'${j8_bcm[p]}'": '$( jq '.["'$p'"]' < $file )
		done
		jq <<< "{ ${json:1} }" > $file
	fi
fi

# 20240113
file=/etc/security/pam_env.conf
if [[ -e /usr/bin/firefox ]] && ! grep -q MOZ_USE_XINPUT2 $file; then
	echo MOZ_USE_XINPUT2 DEFAULT=1 >> $file
	systemctl try-restart localbrowser
fi

# 20240109
if [[ -e /usr/bin/camilladsp ]]; then
	rm -f $dirsystem/camilla.conf
	mkdir -p $dircamilladsp/raw
	if [[ $( camilladsp -V ) != 'CamillaDSP 2.0.1' ]]; then
		systemctl stop camilladsp
		rm -f /etc/default/camilladsp /usr/lib/systemd/system/camilladsp.service
		pacman -Sy --noconfirm camilladsp
		files=$( grep -rl enable_resampling $dircamilladsp )
		if [[ $files ]]; then
			readarray -t files <<< $files
			for f in "${files[@]}"; do
				sed -i '/enable_resampling\|resampler_type/ d' "$f"
			done
		fi
		[[ -e $dirsystem/camilladsp ]] && systemctl start camilladsp
	fi
fi

# 20231216
if [[ ! -e /boot/kernel.img && $( pacman -Q python-websockets ) != 'python-websockets 12.0-1' ]]; then
	pacman -Sy --noconfirm python-websockets
	systemctl restart websocket
fi

# 202312010
file=$dirsystem/display.json
for k in albumyear composername conductorname; do
	! grep -q $k $file && sed -i '/"artist"/ i\  "'$k'": false,' $file
done

[[ ! -e /usr/bin/websocat ]] && pacman -Sy --noconfirm websocat

# 20231125
grep -q connect $dirbash/websocket-server.py && websocketrestart=1

file=$dirmpdconf/conf/camilladsp.conf
if [[ -e /usr/bin/camilladsp && ! -e $file ]]; then
	echo 'audio_output {
	name           "CamillaDSP"
	device         "hw:Loopback,1"
	type           "alsa"
	auto_resample  "no"
	mixer_type     "none"
}' > $file
	echo 'include_optional    "camilladsp.conf"' >> $dirmpdconf/mpd.conf
	[[ -e $dirsystem/camilladsp ]] && mpdrestart=1
fi

file=/etc/systemd/system/cava.service
if [[ ! -e $file ]]; then
	echo '[Unit]
Description=VU level for VU LED and VU meter

[Service]
ExecStart=/srv/http/bash/cava.sh
ExecStop=/srv/http/bash/cava.sh stop' > $file
	systemctl daemon-reload
	[[ -e $dirsystem/vuled ]] && killall -9 cava &> /dev/null && rm $dirsystem/vuled
fi

if [[ ! -e /lib/libfdt.so ]]; then
	pacman -Sy --noconfirm dtc
	systemctl try-restart rotaryencoder
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish

# 20231125
[[ $websocketrestart ]] && systemctl restart websocket
[[ $mpdrestart ]] && $dirsettings/player-conf.sh
