#!/bin/bash

. /srv/http/bash/common.sh

systemctl stop mpd
rm -f $dirsystem/{relays,soundprofile,updating,listing,buffer,bufferoutput,crossfade,custom,replaygain,soxr}

# lcd
file=/etc/modules-load.d/raspberrypi.conf
[[ -e $file ]] && sed -i '/i2c-bcm2708\|i2c-dev/ d' $file
#file=/usr/share/X11/xorg.conf.d/99-fbturbo.conf
#[[ -e $file ]] && sed -i 's/fb1/fb0/' $file

if [[ $1 ]]; then # from create-ros.sh
	version=$1
	revision=$2
else                 # restore
	mv $diraddons /tmp
	rm -rf $dirdata
	partuuidROOT=$( grep ext4 /etc/fstab | cut -d' ' -f1 )
	cmdline="root=$partuuidROOT rw rootwait selinux=0 plymouth.enable=0 smsc95xx.turbo_mode=N \
dwc_otg.lpm_enable=0 elevator=noop ipv6.disable=1 fsck.repair=yes"
	hwrevision=$( awk '/Revision/ {print $NF}' /proc/cpuinfo )
	BB=${hwrevision: -3:2}
	[[ $BB =~ ^(04|08|0d|0e|11|12)$ ]] && cmdline+=' isolcpus=3'
	if systemctl is-enabled localbrowser &> /dev/null; then
		config+=' console=tty3 quiet loglevel=0 logo.nologo vt.global_cursor_default=0'
	else
		config+=' console=tty1'
	fi
	echo $cmdline > /boot/cmdline.txt
	config="\
gpu_mem=32
initramfs initramfs-linux.img followkernel
max_usb_current=1
disable_splash=1
disable_overscan=1
dtparam=audio=on"
	[[ -e /boot/kernel8.img || $BB =~ ^(08|0c|0d|0e|11|12)$ ]] && config+="
dtparam=krnbt=on"
	[[ $BB =~ ^(09|0c)$ ]] && config+="
force_turbo=1
hdmi_drive=2
over_voltage=2"
	echo "$config" > /boot/config.txt
fi
# data directories
mkdir -p $dirdata/{addons,audiocd,bookmarks,lyrics,mpd,playlists,system,tmp,webradios,webradiosimg} /mnt/MPD/{NAS,SD,USB}
ln -sf /dev/shm $dirdata
# addons - new/restore
if [[ $version ]]; then # from create-ros.sh
	echo $version > $dirsystem/version
	echo $revision > $diraddons/r$version
else
	mv /tmp/addons $dirdata
fi
# camilladsp
if [[ -e /usr/bin/camilladsp ]]; then
	dircamilladsp=$dirdata/camilladsp
	mkdir -p $dircamilladsp/{coeffs,configs}
	cat << EOF > $dircamilladsp/configs/default_config.yml
---
devices:
  adjust_period: 10
  capture:
    avoid_blocking_read: false
    channels: 2
    device: hw:Loopback,0
    format: S32LE
    retry_on_error: false
    type: Alsa
  capture_samplerate: 0
  chunksize: 2048
  enable_rate_adjust: false
  enable_resampling: false
  playback:
    channels: 2
    device: hw:0,0
    format: S32LE
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
  type: Filter
EOF
	[[ ! -e $dircamilladsp/configs/camilladsp.yml ]] && cp $dircamilladsp/configs/{default_config,camilladsp}.yml
	ln -sf $dircamilladsp/configs/{camilladsp,active_config}.yml
	cat << EOF > /srv/http/settings/camillagui/config/camillagui.yml
---
camilla_host: "0.0.0.0"
camilla_port: 1234
port: 5005
config_dir: "$dircamilladsp/configs"
coeff_dir: "$dircamilladsp/coeffs"
default_config: "$dircamilladsp/configs/default_config.yml"
active_config: "$dircamilladsp/configs/active_config.yml"
update_symlink: true
on_set_active_config: "/srv/http/bash/features.sh camilladspasound"
on_get_active_config: null
supported_capture_types: null
supported_playback_types: null
EOF
fi
# display
cat << EOF > $dirsystem/display
{
  "album": true,
  "albumartist": true,
  "albumbyartist": false,
  "artist": true,
  "audiocdplclear": false,
  "backonleft": false,
  "bars": true,
  "barsalways": false,
  "buttons": true,
  "camilladsp": false,
  "composer": true,
  "conductor": true,
  "count": true,
  "cover": true,
  "covervu": false,
  "date": true,
  "fixedcover": true,
  "genre": true,
  "hidecover": false,
  "label": true,
  "latest": true,
  "multiraudio": false,
  "nas": true,
  "noswipe": false,
  "playbackswitch": true,
  "playlists": true,
  "plclear": true,
  "plsimilar": true,
  "radioelapsed": false,
  "sd": true,
  "tapaddplay": false,
  "tapreplaceplay": false,
  "time": true,
  "usb": true,
  "volume": true,
  "vumeter": false,
  "webradio": true
}
EOF
# localbrowser
if [[ -e /usr/bin/chromium ]]; then
	rm -rf /root/.config/chromium
	echo "\
rotate=NORMAL
zoom=100
screenoff=0
onwhileplay=false
cursor=false" > $dirsystem/localbrowser.conf
fi
echo mpd > $dirshm/player
# relays
cat << EOF > $dirsystem/relays.conf
pin='[ 11,13,15,16 ]'
name='[ "DAC","PreAmp","Amp","Subwoofer" ]'
onorder='[ "DAC","PreAmp","Amp","Subwoofer" ]'
offorder='[ "Subwoofer","Amp","PreAmp", "DAC" ]'
on=( 11 13 15 16 )
ond=( 2 2 2 )
off=( 16 15 13 11 )
offd=( 2 2 2 )
timer=5
EOF
# system
echo rAudio > $dirsystem/hostname
hostnamectl set-hostname rAudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
sed -i 's/".*"/"00"/' /etc/conf.d/wireless-regdom
timedatectl set-timezone UTC
echo UTC > $dirsystem/timezone
touch $dirsystem/usbautoupdate

# mpd
sed -i -e '/^auto_update\|^audio_buffer_size\| #custom$/ d
' -e '/quality/,/}/ d
' -e '/soxr/ a\
	quality        "very high"\
}
' /etc/mpd.conf

usermod -a -G root http # add user http to group root to allow /dev/gpiomem access

# webradio default
curl -L https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xvf - -C /
[[ ! -e $dirdata/mpd/counts ]] && echo '{"webradio":'$( ls -1q $dirdata/webradios | wc -l )'}' > $dirdata/mpd/counts

# services
systemctl -q disable --now bluetooth hostapd shairport-sync smb snapserver spotifyd upmpdcli

# set permissions and ownership
chown -R http:http /srv/http
chown -R mpd:audio $dirmpd $dirplaylists /mnt/MPD
chmod 755 /srv/http/* $dirbash/* /srv/http/settings/*
chmod 777 $dirdata/tmp

# symlink /mnt for coverart files
ln -sf /mnt /srv/http/

[[ $version ]] && exit

systemctl start mpd

curl -s -X POST http://127.0.0.1/pub?id=restore -d '{"restore":"reload"}' &> /dev/null
