#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

# 20130123
if [[ ! -e $dirdata/camilladsp ]]; then
	dircamilladsp=/srv/http/data/camilladsp
	mkdir -p $dircamilladsp/{coeffs,configs}
	echo 'devices:
  adjust_period: 10
  capture:
    channels: 2
    device: hw:Loopback,0
    format: S32LE
    type: Alsa
  capture_samplerate: 0
  chunksize: 2048
  enable_rate_adjust: false
  enable_resampling: false
  playback:
    channels: 2
    device: hw:0,0
    format: S16LE
    type: Alsa
  queuelimit: 4
  rate_measure_interval: 1
  resampler_type: Synchronous
  samplerate: 44100
  silence_threshold: -60
  silence_timeout: 3
  stop_on_rate_change: false
  target_level: 0
filters:
  Volume:
    parameters:
      ramp_time: 200
    type: Volume
mixers: {}
pipeline:
- channel: 0
  names:
  - Volume
  type: Filter
- channel: 1
  names:
  - Volume
  type: Filter' > $dircamilladsp/configs/camilladsp.yml
  ln -s $dircamilladsp/configs/{camilladsp,active_config}.yml
fi

# 20230117
file=/etc/systemd/system/spotifyd.service
! grep -q ^User $file && sed -i '/CPUAffinity/ a\User=root' $file
systemctl daemon-reload
systemctl try-restart spotifyd

# 20221229
files=$( ls /etc/systemd/network/e* )
for file in $files; do
	! grep -q RequiredForOnline=no $file && echo '
[Link]
RequiredForOnline=no' >> $file
done

# 20221218
[[ -L $dirdata/playlists ]] && chown -h mpd:audio $dirdata/playlists

# 20221208
if [[ -e /srv/http/assets/css/desktop.css ]]; then
	rm -f /srv/http/main.php
	rm -f /srv/http/assets/css/{desktop,keyboard,roundslider,selectric,simple-}*
	rm -f /srv/http/assets/js/keyboard.js
	rm -f /srv/http/assets/js/plugin/{jquery.selectric,simple-}*
fi

readarray -t bookmarks <<< $( ls -1 /srv/http/data/bookmarks/* 2> /dev/null )
if [[ $bookmarks ]]; then
	for file in "${bookmarks[@]}"; do
		if [[ $( sed -n 2p "$file" ) ]]; then
			path=$( head -1 "$file" )
			echo $path > "$file"
		fi
 	done
fi

rm -rf /srv/http/data/tmp

sed -i 's/5000/5005/' /srv/http/settings/camillagui/config/camillagui.yml

if [[ -e "$dirwebradio/https:||stream.radioparadise.com|world-etc-flac" ]]; then
	echo -e "$bar Update Radio Paradise station arts ..."
	rm $dirwebradio/*world-etc-flac $dirwebradio/img/*world-etc-flac*
	curl -L https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xf - -C $dirwebradio
fi

if grep -q shairport.sh /etc/shairport-sync.conf; then
	sed -i 's/shairport.sh/cmd.sh shairport/; s/ stop/stop/' /etc/shairport-sync.conf
	mv /etc/systemd/system/shairport{-meta,}.service
	sed -i 's/-meta\|redis.target //' /etc/systemd/system/shairport.service
	systemctl daemon-reload
	systemctl try-restart shairport-sync
fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,fonts,js}

getinstallzip

chmod +x $dirsettings/system.sh
$dirsettings/system.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
#-------------------------------------------------------------------------------
