#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260808
! grep -q ^UDP_PORT $dirbash/websocket.py && ws_restart=1
[[ -e /boot/kernel.img ]] && sed -i 's|/+R||' /etc/pacman.conf
[[ $( pacman -Q audiocd-meta 2> /dev/null ) < 'audiocd-meta 1.0.1-1' ]] && packages+=' audiocd-meta'

# 20260801
[[ $( pacman -Q mpd_oled ) < 'mpd_oled 0.03-3' ]] && packages+=' mpd_oled'
file=/lib/systemd/system/mpd_oled.service
if grep -q ^ExecStop $file; then
	sed -i '/^ExecStartPost\|^ExecStop/ d' $file
	systemctl daemon-reload
	systemctl try-restart mpd_oled
fi

# 20260719
. $dirshm/output
if [[ $mixertype == hardware ]]; then
	touch $dirshm/mixerhardware
	$dirsettings/player-conf.sh
elif [[ $mixertype == none ]]; then
	touch $dirsystem/mixernone
fi

# 20260709
[[ ! -e /bin/gcc && ! -e /boot/kernel.img ]] && packages+=' gcc'

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

#-------------------------------------------------------------------------------
[[ $packages ]] && pacman -Sy --noconfirm $packages

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
[[ -e /bin/vapoursynth ]] && pacman -Rdd --noconfirm vapoursynth # fix: armv7h terminal error on open
[[ -e $dirwebradio/img ]] && $dirbash/webradio-convert.sh

installfinish

# 20260808
[[ $ws_restart ]] && systemctl restart websocket

# 20260729
systemctl try-restart rotaryencoder

# 20260717
file=$dirmpdconf/bluetooth.conf
[[ -e $file && ! -L $file ]] && $dirsettings/player-conf.sh
