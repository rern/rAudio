#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20240129
sed -i -E 's/^(EnableNetworkConfiguration=)true/\1false/' /etc/iwd/main.conf

readarray -t profiles <<< $( ls -p /etc/netctl | grep -v / )
if [[ $profiles ]]; then
	for p in "${profiles[@]}"; do
		data=
		. <( grep = "/etc/netctl/$p" )
		if [[ $Key ]]; then
			data+='
[Security]
Passphrase="'$Key'"'
			file="/var/lib/iwd/$ESSID.psk"
		else
			file="/var/lib/iwd/$ESSID.open"
		fi
		[[ $Hidden ]] && data+='
[Settings]
Hidden=true'
		[[ $Address ]] && data+='
[IPv4]
Address='${Address:0:-3}'
Gateway='$Gateway
		awk NF <<< "$data" > "$file"
		if [[ $( netctl is-enabled "$p" ) == enabled ]]; then
			netctl disable "$ESSID" &> /dev/null
			mv "$file" /boot
		fi
	done
	rm -f /etc/netctl/* /boot/wifi0 &> /dev/null
fi

# 20240122
file=$dirshm/avahihostname
[[ ! -e $file ]] && avahi-resolve -a4 $( ipAddress ) | awk '{print $NF}' > $file

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
	passphrase=$( getVar wpa_passphrase /etc/hostapd/hostapd.conf )
	address=$( grep router /etc/dnsmasq.conf | cut -d, -f2 )
	echo "\
[Security]
Passphrase=$passphrase

[IPv4]
Address=$address
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

[[ -e /boot/kernel.img ]] && echo 'Server = http://alaa.ad24.cz/repos/2022/02/06/$arch/$repo' > /etc/pacman.d/mirrorlist

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

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish

# 20240129
systemctl enable iwd
