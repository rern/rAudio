#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260719
. $dirshm/output
if [[ $mixertype == hardware ]]; then
	touch $dirshm/mixerhardware
elif [[ $mixertype == none ]]; then
	touch $dirsystem/mixernone
fi

# 20260714
[[ $( pacman -Q vapoursynth 2> /dev/null ) ]] && pacman -Rdd --noconfirm vapoursynth

# 20260709
if [[ ! -e /boot/kernel.img ]]; then
	! pacman -Q gcc &> /dev/null && pacman -Sy --noconfirm gcc
fi

file=$dirmpdconf/conf/bluetooth.conf
if [[ ! -e $file ]]; then
	cat << EOF > $file
audio_output {
	name        "BlueALSA"
	device      "bluealsa"
	type        "alsa"
	format      "44100:16:2"
}
EOF
fi

rm -f $dirbash/status-{bluetooth,coverart,coverartupnp}.sh

file=/etc/upmpdcli.conf
if [[ -e $file ]]; then
	grep -q -m1 status-push $file && sed -i '/status-push/ d' $file
	systemctl try-restart upmpdcli
fi

file=$dirsystem/localbrowser.conf
if [[ -e $file ]]; then
	grep -q -m1 ^ROTATE $file && sed -i 's/.*/\L&/' $file
fi

# 20260529
if [[ $( pacman -Q mpd_oled ) < 'mpd_oled 0.03-2' ]]; then
	pacman -Sy --noconfirm mpd_oled
	file=/etc/default/mpd_oled
	if grep ' -X' $file; then
		sed -i 's/ -X//' $file
	else
		sed -i 's/fifo"/fifo -X"/' $file
	fi
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

if [[ -e /boot/kernel.img ]]; then
	mv $dirbash/{status.armv6h,_status}
	mv $dirbash/status{.sh,}
	[[ ! -d /opt/armv6-new  ]] && curl -sL https://github.com/rern/rAudio-status/raw/main/rpi_zero/lib.tar.xz | bsdtar xpf - -C /
else
	if [[ -e /boot/kernel8.img ]]; then
		mv $dirbash/status{.aarch64,}
	else
		mv $dirbash/status{.armv7h,}
	fi
	rm $dirbash/status.sh
fi
rm $dirbash/status.a*

. $dirbash/common.sh
cacheBust
chmod -R +x $dirbash
if [[ ! -e /bin/camilladsp ]]; then
	rm -rf $dircamilladsp
	find /srv/http -type f -name camilla* -delete
fi
if [[ -e /bin/firefox ]]; then
	splashRotate
else
	rm -f $dirbash/startx.sh $dirsettings/features-localbrowser.sh
fi
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
rm -f $dirshm/system

installfinish

# 20260717
file=$dirmpdconf/bluetooth.conf
[[ -e $file && ! -L $file ]] && $dirsettings/player-conf.sh
