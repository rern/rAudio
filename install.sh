#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 202402226
file=/etc/default/camilladsp
if grep -qs /etc/ $file; then
	sed -i 's|/etc/|/srv/http/data/|' $file
	mv -f /{etc,srv/http/data}/camilladsp/configs/*
fi

file=$dirsystem/autoplay.conf
grep -qs ^cd $file && sed -i '/^cd/ d' $file

# 20240219
readarray -t mixerfiles <<< $( ls $dirsystem/hwmixer-* 2> /dev/null )
if [[ $mixerfiles ]]; then
	for f in "${mixerfiles[@]}"; do
		mv "$f" "${f/hwmixer-/mixer-}"
	done
fi

if [[ ! -e $dirshm/nosound ]]; then
	( [[ ! -e $dirshm/output ]] || grep -q ^hwmixer $dirshm/output ) && restartmpd=1
fi

[[ -e $dirsystem/btoutputall ]] && mv $dirsystem/{btoutputall,devicewithbt}

# 20240212
[[ ! -e /usr/bin/mmc ]] && pkgs+=' mmc-utils'

# 20240121
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
	pkgs+=' libgpiod'
	
	file=$dirsystem/powerbutton.conf
	if [[ -e $file ]]; then
	. $file
	echo "\
on=${j8_bcm[on]}
sw=${j8_bcm[sw]}
led=${j8_bcm[led]}
reserved=${j8_bcm[reserved]}" > $file
		systemctl try-restart powerbutton
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
	if [[ $( camilladsp -V ) != 'CamillaDSP 2.0.3' ]]; then
		systemctl stop camilladsp
		pkgs+=' camilladsp'
		rm -f /etc/default/camilladsp /usr/lib/systemd/system/camilladsp.service
		files=$( grep -rl enable_resampling $dircamilladsp )
		if [[ $files ]]; then
			readarray -t files <<< $files
			for f in "${files[@]}"; do
				sed -i '/enable_resampling\|resampler_type/ d' "$f"
			done
		fi
	fi
fi

# up to 20240226
[[ $pkgs ]] && pacman -Sy --noconfirm $pkgs

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish

# 20240219
[[ $restartmpd ]] && $dirsettings/player-conf.sh
