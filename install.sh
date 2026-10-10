#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20261010
dir_bt=$dircamilladsp/configs/configs-bt
if [[ -e $dirsystem/camilladsp ]]; then # running with bluetooth
	file_current=$( getVar CONFIG /etc/default/camilladsp )
	if [[ $( dirname "$file_current" ) == $dir_bt ]]; then
		systemctl stop camilladsp
		dbuspath=$( bluealsa-cli list-pcms | grep -E '(sink|sourcs)$' )
		mac=$( sed -E 's|.*/dev_([^/]*).*|\1|; s|_|:|g' <<< $dbuspath )
		sed -i "s|/configs-bt/|/configs/$mac/|" /etc/default/camilladsp
		restart+=camilladsp$'\n'
		dir_new=$dircamilladsp/configs/$mac
		if (( $( bluetoothctl devices | wc -l ) == 1 )); then
			mv $dir_bt $dir_new
		else
			mkdir -p $dir
			mv "$file_current" $dir_new
		fi
	fi
fi
if [[ -e /bin/camilladsp ]]; then
	file=/etc/camilladsp/configs/camilladsp.yml
	! grep -q 'format: ~' $file && sed -i -E 's/(format:).*/\1 ~/' $file

	file=/lib/systemd/system/camilladsp.service
	if grep -q 'CONFIG ' $file; then
		sed -i 's/CONFIG/{&}/' $file
		restart+=camilladsp$'\n'
	fi
	
	if [[ $( ls $dir_bt ) ]]; then
		devices=$( bluetoothctl devices | cut -d' ' -f2- )
		if (( $( wc -l <<< $devices ) > 1 )); then
			warning="
$warn CamillaDSP for Bluetooth:
- Configuration files need to be moved manually.
- Create and move files to each directory:

$( sed "s|^|$dircamilladsp/configs/|; s| [^ ]| ---&|" <<< $devices )
"
		else
			dir_new=$dircamilladsp/configs/$( cut -d' ' -f1 <<< $devices )
			mkdir -p $dir_new
			mv $dir_bt $dir_new
		fi
	fi
fi

[[ ! -e $dirsystem/btdisable ]] && touch $dirsystem/bluetooth
[[ -e $dirshm/bluetoothdest ]] && touch $dirshm/btc_sender
[[ ! -e $dirshm/fn_volume ]] && volumeFunction > $dirshm/fn_volume

# 20261003
if [[ -e /bin/camilladsp ]]; then
	systemctl stop camilladsp
	file=/etc/default/camilladsp
	if ! grep -q ^STATE $file; then
		sed -i -e 's/FILE//
' -e '$ a\STATE=/srv/http/data/camilladsp/state.yml
' -e '/^GAIN\|^MUTE/ d
' $file
		sed -i 's/LOGFILE.*/LOG -s $STATE/' /lib/systemd/system/camilladsp.service
		restart+=camilladsp$'\n'
	fi
	file=$dircamilladsp/configs/camilladsp.yml
	! grep -q 'volume_ramp_time: 0.0' $file && sed -i -E 's/(volume_ramp_time:).*/\1 0.0/' $file
fi

if [[ $( pacman -Q mpd_oled ) < 'mpd_oled 0.04-1' ]]; then
	packages+=' mpd_oled'
	file=/lib/systemd/system/mpd_oled.service
	if grep -q ^ExecStop $file; then
		sed -i '/^ExecStartPost\|^ExecStop/ d' $file
		restart+=mpd_oled$'\n'
	fi
fi

# 20260922
file=/etc/spotifyd.conf
if ! grep -q status-spotifyd $file; then
	sed -i 's|spotifyd.sh|status-&|' $file
	restart+=spotifyd$'\n'
	sed -i -E '/^control|^mixer/ d' $file
fi

file=/etc/systemd/system/shairport.service
if ! grep -q status-shairport $file; then
	sed -i 's|shairport.sh|status-&|' $file
	restart+=shairport$'\n'
	
	file=/etc/shairport-sync.conf
	name=$( getVar name $file )
	output=$( getVar output_device $file )
	mixer=$( getVar mixer_control_name $file )
	cat << EOF > $file
general = {
	name = "$name";
	run_this_when_volume_is_set = "/bin/sudo /srv/http/bash/cmd.sh volumepush";
	dbus_service_bus = "system";
	volume_control_profile = "flat";
	volume_range_db = 36;
};
sessioncontrol = {
	run_this_before_play_begins = "/bin/sudo /bin/systemctl start shairport";
	run_this_after_play_ends = "/bin/sudo /srv/http/bash/cmd.sh playerstop";
};
alsa = {
	output_device = "$output";
	mixer_control_name = "$mixer";
}
EOF
fi

# 20260909
touch /root/{.bash,.php,.python}_history

! grep -m1 -q ^UDP_PORT $dirbash/websocket.py && restart+=websocket$'\n'
! grep -m1 -q ^declare $dirbash/rotaryencoder.sh && restart+=rotaryencoder$'\n'

[[ $( < $dirshm/player ) == upnp ]] && touch $dirshm/upnp

chown -R http:http $dirdata/{audiocd,webradio,dabradio} &> /dev/null

[[ -e /boot/kernel.img ]] && sed -i 's|/+R||' /etc/pacman.conf

[[ $( pacman -Q audiocd-meta 2> /dev/null ) < 'audiocd-meta 1.0.4-2' ]] && packages+=' audiocd-meta'

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
	systemctl try-restart $( sort -u <<< $restart )
fi

[[ -e /bin/vapoursynth ]] && pacman -Rdd --noconfirm vapoursynth # fix: armv7h terminal error on open

# 20260909
$dirbash/webradio-convert.sh

installfinish

# 202621010
[[ $warning ]] && echo "$warning"
