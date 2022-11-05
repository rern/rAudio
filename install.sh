#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

# 20221106
sed -E -i 's/(state=)"(.*)"/\1\2/' $dirshm/status

sed -i '/interfaces/ d' /etc/samba/smb.conf
systemctl try-restart smb 

file=/etc/systemd/system/bluetooth.service.d/override.conf
if grep -q bluetooth$ $file; then
	sed -i 's/bluetooth$/&start/' $file
	systemctl daemon-reload
fi

[[ ! -e /lib/libFLAC.so.8 ]] && ln -s /lib/libFLAC.so{,.8} # for upgraded snapcast

if [[ -L $dirmpd  && ! -e /mnt/MPD/.mpdignore ]]; then
	echo "\
SD
USB" > /mnt/MPD/.mpdignore
fi

# 20221007
grep -q hard,intr /etc/fstab && sed -i '/hard,intr/soft/' /etc/fstab

[[ -e $dirsystem/hddspindown ]] && mv $dirsystem/{hddspindown,apm}

if [[ ! -e /boot/kernel.img ]]; then
	dir=/etc/systemd/system
	for file in $dir/spotifyd.service $dir/upmpdcli.service; do
		! grep -q CPUAffinity $file && sed -i -e '/Service/ a\CPUAffinity=3' -e '/ExecStartPost/ d' -e 's|/usr/bin/taskset -c 3 ||' $file
	done
	for file in $dir/mpd.service.d/override.conf $dir/shairport-sync.service.d/override.conf; do
		! grep -q CPUAffinity $file && sed -i -e '/Service/ a\CPUAffinity=3' -e '/ExecStart/ d' $file
	done
	for file in $dir/bluealsa.service.d/override.conf $dir/bluetooth.service.d/override.conf; do
		! grep -q CPUAffinity $file && sed -i -e '/Service/ a\CPUAffinity=3' $file
	done
fi

dir=/srv/http/assets/img/guide
if [[ ! -e $dir/1.jpg ]]; then
	mkdir -p $dir
	if [[ -e /srv/http/assets/img/1.jpg ]]; then
		find /srv/http/assets/img -maxdepth 1 -type f -name '[0-9]*' -exec mv {} $dir \;
	else
		curl -skL https://github.com/rern/_assets/raw/master/guide/guide.tar.xz | bsdtar xf - -C $dir
	fi
fi

file=/etc/systemd/system/dab.service
if [[ -e /usr/bin/rtl_sdr && ! -e $file ]]; then
	echo "\
[Unit]
Description=DAB Radio metadata

[Service]
Type=simple
ExecStart=/srv/http/bash/status-dab.sh
" > $file
	systemctl daemon-reload
fi


# 20220916
if (( $( wc -l < $dirmpd/counts ) == 1 )); then
	echo '{
  "playlists" : '$( ls -1 $dirplaylists | wc -l )'
, "webradio"  : '$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )'
}' > $dirmpd/counts
fi

# 20220907
[[ $( pacman -Q bluez ) < 'bluez 5.65-3' ]] && pacman -Sy --noconfirm bluez bluez-utils

#-------------------------------------------------------------------------------
installstart "$1"

getinstallzip

chmod +x $dirsettings/system.sh
$dirsettings/system.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

#installfinish
#-------------------------------------------------------------------------------

# 20221010
[[ -e /srv/http/shareddata ]] && echo -e "$info Shared Data must be disabled and setup again."

# 20221021
file=/etc/systemd/system/mpd.service.d/override.conf
grep -q ExecStart $file && installfinish && exit

echo -e "\n$bar Rearrange MPD Configuration...\n"

dirmpdconf=$dirdata/mpdconf
linkConf() {
	ln -s $dirmpdconf/{conf/,}$1.conf
}
[[ -e $dirsystem/custom-global ]] && mv $dirsystem/custom-global $dirmpdconf/conf/custom.conf
if [[ -e $dirsystem/soxr.conf ]]; then
	echo "\
resampler {
	plugin          \"soxr\"
$( < $dirsystem/soxr.conf )" > $dirmpdconf/conf/soxr-custom.conf
fi
grep -q 'mixer_type.*none' /etc/mpd.conf \
    && grep -q 'replaygain.*off' /etc/mpd.conf \
    && ! grep -q normalization /etc/mpd.conf \
    && novolume=1
if [[ ! $novolume ]]; then
	if grep -q quality.*custom /etc/mpd.conf; then
		linkConf soxr-custom
		echo custom > $dirsystem/soxr
	else
		linkConf soxr
		echo 'very high' > $dirsystem/soxr
	fi
fi

grep -q auto_update /etc/mpd.conf && linkConf autoupdate
if grep -q audio_buffer /etc/mpd.conf; then
	echo 'audio_buffer_size  "'$( < $dirsystem/buffer.conf )'"' > $dirmpdconf/conf/buffer.conf
	linkConf buffer
fi
if grep -q output_buffer /etc/mpd.conf; then
	echo 'max_output_buffer_size  "'$( < $dirsystem/bufferoutput.conf )'"' > $dirmpdconf/conf/outputbuffer.conf
	linkConf outputbuffer
fi
grep -q volume_normalization /etc/mpd.conf && linkConf normalization
if ! grep -q replaygain.*off /etc/mpd.conf; then
	echo 'replaygain  "'$( < $dirsystem/replaygain.conf )'"' > $dirmpdconf/conf/replaygain.conf
	linkConf replaygain
fi

[[ -e $dirshm/audiocd ]] && linkConf cdio
[[ -e $dirsystem/custom && -e $dirmpdconf/conf/custom.conf ]] && linkConf custom
grep -q plugin.*ffmpeg /etc/mpd.conf && linkConf ffmpeg
grep -q type.*httpd /etc/mpd.conf && linkConf httpd
systemctl -q is-active snapserver && linkConf snapserver

rm -f $dirsystem/{buffer,bufferoutput,replaygain,soxr}.conf $dirsystem/{crossfade,streaming}

echo "\
ExecStart=
ExecStart=/usr/bin/mpd --systemd /srv/http/data/mpdconf/mpd.conf" >> $file
systemctl daemon-reload

$dirsettings/player-conf.sh

installfinish

lcolor -
echo -e "$info Backup of Data and Settings:"
echo If there is one, backup again to include this configuration.
lcolor -
