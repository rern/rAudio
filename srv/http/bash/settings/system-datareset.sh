#!/bin/bash

. /srv/http/bash/common.sh

# reset -------------------------------------------------------------------------------------------------------------->>>
if [[ -e $diraddons ]]; then
	reset=1
	statePlay && $dirbash/cmd.sh playerstop
	mpc -q clear
# hostapd
	sed -i -E -e 's/^(dhcp-range=).*/\1192.168.5.2,192.168.5.254,24h/
' -e 's/^(.*option:router,).*/\1192.168.5.1/
' -e 's/^(.*option:dns-server,).*/\1192.168.5.1/
' /etc/dnsmasq.conf &> /dev/null
	sed -i -E -e 's/^(ssid=).*/\1rAudio/
' -e 's/(wpa_passphrase=).*/\1raudioap/
' /etc/hostapd/hostapd.conf &> /dev/null
# localbrowser
[[ -e /usr/bin/firefox ]] && rm -rf /root/.mozilla
# mpd
	mpc -q crossfade 0
	find $dirmpdconf -maxdepth 1 -type l -exec rm {} \; # mpd.conf symlink
	echo 'audio_buffer_size  "4096"' > $dirmpdconf/conf/buffer.conf
	echo 'max_output_buffer_size  "8192"' > $dirmpdconf/conf/outputbuffer.conf
	echo 'replaygain          "album"' > $dirmpdconf/conf/rplaygain.conf
# shairport-sync
	sed -i -E 's/(name = ").*/\1rAudio"/' /etc/shairport-sync.conf &> /dev/null
# smb
	sed -i '/read only = no/ d' smbconf=/etc/samba/smb.conf &> /dev/null
# upmpdcli
	sed -i -E -e 's/^(friendlyname = ).*/\1rAudio/
' -e 's/(ownqueue = )./\10' /etc/upmpdcli.conf &> /dev/null

# system
	# cmdline.txt
	cmdline=$( sed -E 's/^(.*repair=yes) .*/\1/' /boot/cmdline.txt )
	if systemctl -q is-enabled localbrowser; then
		cmdline+=' isolcpus=3 console=tty3 quiet loglevel=0 logo.nologo vt.global_cursor_default=0'
	else
		cmdline+=' console=tty1'
	fi
	echo $cmdline > /boot/cmdline.txt
	# config.txt
	config="\
initramfs initramfs-linux.img followkernel
disable_overscan=1
disable_splash=1
dtparam=audio=on"
	[[ -e /boot/kernel7.img && -e /usr/bin/firefox ]] && config+="
hdmi_force_hotplug=1"
	grep -q rpi0 $dirshm/cpuinfo && config+="
gpu_mem=32
force_turbo=1
gpu_mem=32
hdmi_drive=2
max_usb_current=1
over_voltage=2" # rpi 0
	echo "$config" > /boot/config.txt
	# css color
	[[ -e $dirsystem/color ]] && rm $dirsystem/color && $dirbash/cmd.sh color
	# lcd
	if [[ -e $dirbash/xinitrc ]]; then
		! grep -q disable-software-rasterizer $dirbash/xinitrc && sed -i '/incognito/ i\	--disable-software-rasterizer \\' $dirbash/xinitrc
	fi
	sed -i 's/fb1/fb0/' /etc/X11/xorg.conf.d/99-fbturbo.conf &> /dev/null
	# nas
	readarray -t dirs <<< $( find $dirnas -mindepth 1 -maxdepth 1 -type d )
	for dir in "${dirs[@]}"; do
		umount -l "$dir" &> /dev/null
		rmdir "$dir" &> /dev/null
	done
	sed -i '3,$ d' /etc/fstab
	
	systemctl -q disable bluetooth hostapd camilladsp mediamtx nfs-server powerbutton shairport-sync smb snapclient spotifyd upmpdcli &> /dev/null
	mv $dirdata/{addons,camilladsp,mpdconf} /tmp &> /dev/null
	if [[ $1 == true ]]; then
		keeplibrary=1
		mv $dirdata/{mpd,playlists,webradio} /tmp
	fi
	rm -rf $dirdata $dirshareddata \
			/mnt/MPD/.mpdignore $dirnas/.mpdignore \
			/etc/modules-load.d/{loopback,raspberrypi}.conf /etc/modprobe.d/cirrus.conf /etc/X11/xorg.conf.d/99-raspi-rotate.conf
	if [[ $2 != true ]]; then
		readarray -t profiles <<< $( ls -p /etc/netctl | grep -v / )
		if [[ $profiles ]]; then
			for profile in "${profiles[@]}"; do
				[[ $( netctl is-enabled "$profile" ) == enabled ]] && netctl disable "$profile"
				rm "/etc/netctl/$profile"
			done
		fi
	fi
fi
# reset --------------------------------------------------------------------------------------------------------------<<<

# data directories
mkdir -p $dirdata/{addons,audiocd,bookmarks,camilladsp,lyrics,mpd,mpdconf,playlists,system,webradio,webradio/img} /mnt/MPD/{NAS,SD,USB}
mkdir $dircamilladsp/{coeffs,configs,configs-bt}
ln -sf /dev/shm $dirdata
ln -sf /mnt /srv/http/
chown -h http:http $dirshm /srv/http/mnt
if [[ $reset ]]; then
	mv /tmp/{addons,camilladsp,mpdconf} $dirdata &> /dev/null
	[[ $keeplibrary ]] && mv /tmp/{mpd,playlists,webradio} $dirdata
else # from create-ros.sh
	dirs=$( ls $dirdata )
	for dir in $dirs; do
		printf -v dir$dir '%s' $dirdata/$dir
	done
	curl -sL https://github.com/rern/rAudio-addons/raw/main/addonslist.json | sed -E -n '/"rAudio"/ {n;s/.*: *"(.*)"/\1/; p}' > $diraddons/r1
fi

# display
true='album albumartist artist bars buttons composer conductor count cover date fixedcover genre
	label latest nas playbackswitch playlists plclear plsimilar sd time usb volume webradio'
false='albumbyartist audiocdplclear backonleft barsalways covervu hidecover
	multiraudio noswipe progress radioelapsed tapaddplay tapreplaceplay vumeter'
for i in $true; do
	lines+='
, "'$i'": true'
done
for i in $false; do
	lines+='
, "'$i'": false'
done
jq -S <<< {${lines:2}} > $dirsystem/display.json

# camilladsp
if [[ -e /usr/bin/camilladsp ]]; then
	echo "\
filtersmax=10
filtersmin=-10
mixersmax=10
mixersmin=-10" > $dirsystem/camilla.conf
fi

# localbrowser
if [[ -e /usr/bin/firefox ]]; then
	timeout 1 firefox --headless &> /dev/null
	echo "\
rotate=0
zoom=100
screenoff=0
onwhileplay=
hdmi=
cursor=
runxinitrcd=" > $dirsystem/localbrowser.conf
fi

# mirror
sed -i '/^Server/ s|//.*mirror|//mirror|' /etc/pacman.d/mirrorlist

# snapclient
echo 'SNAPCLIENT_OPTS="--latency=800"' > /etc/default/snapclient

# system
hostnamectl set-hostname rAudio
sed -i 's/#NTP=.*/NTP=pool.ntp.org/' /etc/systemd/timesyncd.conf
sed -i 's/".*"/"00"/' /etc/conf.d/wireless-regdom
timedatectl set-timezone UTC
usermod -a -G root http # add user http to group root to allow /dev/gpiomem access

# webradio
if [[ ! $keeplibrary ]]; then
	curl -sL https://github.com/rern/rAudio-addons/raw/main/webradio/radioparadise.tar.xz | bsdtar xf - -C $dirwebradio
	echo '{
  "playlists" : 0
, "webradio"  : '$( find -L $dirwebradio -type f ! -path '*/img/*' | wc -l )'
}' > $dirmpd/counts
fi

dirPermissions

[[ $reset ]] && $dirbash/power.sh reboot
