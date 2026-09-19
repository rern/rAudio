#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260919
file=/etc/spotifyd.conf
if ! grep -q status-spotifyd $file; then
	sed -i 's|spotifyd.sh|status-&|' $file
	restart+=' spotifyd'
fi

file=/etc/systemd/system/shairport.service
if ! grep -q status-shairport $file; then
	sed -i 's|shairport.sh|status-&|' $file
	restart+=' shairport'
fi

file=/etc/shairport-sync.conf
if ! grep -q dbus $file; then
	name=$( getVar name $file )
	cat << EOF > $file
general = {
	name = "$name";
	run_this_when_volume_is_set = "/bin/sudo /srv/http/bash/cmd.sh volumepush";
	dbus_service_bus = "system";
};
sessioncontrol = {
	run_this_before_play_begins = "/bin/sudo /bin/systemctl start shairport";
	run_this_after_play_ends = "/bin/sudo /srv/http/bash/cmd.sh playerstop";
};
alsa = {
	output_device = "hw:0,0";
	mixer_control_name = "PCM";
}
EOF
fi

sed -i -E '/^control|^mixer/ d' /etc/spotifyd.conf

# 20260909
touch /root/{.bash,.php,.python}_history

! grep -m1 -q ^UDP_PORT $dirbash/websocket.py && restart+=' websocket'
! grep -m1 -q ^declare $dirbash/rotaryencoder.sh && restart+=' rotaryencoder'

[[ $( < $dirshm/player ) == upnp ]] && touch $dirshm/upnp

chown -R http:http $dirdata/{audiocd,webradio,dabradio} &> /dev/null

[[ -e /boot/kernel.img ]] && sed -i 's|/+R||' /etc/pacman.conf

[[ $( pacman -Q audiocd-meta 2> /dev/null ) < 'audiocd-meta 1.0.4-2' ]] && packages+=' audiocd-meta'

# 20260801
[[ $( pacman -Q mpd_oled ) < 'mpd_oled 0.03-3' ]] && packages+=' mpd_oled'
file=/lib/systemd/system/mpd_oled.service
if grep -q ^ExecStop $file; then
	sed -i '/^ExecStartPost\|^ExecStop/ d' $file
	restart+=' mpd_oled'
fi

#-------------------------------------------------------------------------------
[[ $packages ]] && pacman -Sy --noconfirm $packages

installstart "$1"

hash=$( sed -n '/^.hash/ {s/[^0-9]//g; p}' /srv/http/function.php )
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

sed -i -E "s/^(.hash.*v=).*/\1$( date +%s )';/" /srv/http/common.php # static cache bust - css, js
! grep -q -m1 "^\$hash.*$hash" /srv/http/function.php && imageCacheBust $hash
chmod -R +x $dirbash
if [[ ! -e /bin/camilladsp ]]; then
	rm -rf $dircamilladsp
	find /srv/http -type f -name camilla* -delete
fi
[[ ! -e /etc/systemd/system/dab.service ]] && rm $dirbash/dab*
if [[ -e /bin/firefox ]]; then
	splashRotate
else
	rm -f $dirbash/startx.sh $dirsettings/features-localbrowser.sh
fi
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
rm -f $dirshm/system
if [[ $restart ]]; then
	systemctl daemon-reload
	systemctl try-restart $restart
fi

[[ -e /bin/vapoursynth ]] && pacman -Rdd --noconfirm vapoursynth # fix: armv7h terminal error on open
$dirbash/webradio-convert.sh

installfinish
