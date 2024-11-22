#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

! playerActive mpd && $dirbash/cmd.sh playerstop
# hostname
$dirsettings/system.sh 'hostname
rAudio
CMD NAME'
# accesspoint
sed -i -E -e 's/(Passphrase=).*/\1raudioap/
' -e 's/(Address=|Gateway=).*/\1192.168.5.1/
' /var/lib/iwd/ap/rAudio.ap

# localbrowser
[[ -e /usr/bin/firefox ]] && rm -rf /root/.mozilla
# mpd
mpc -q clear
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
[[ -e /boot/kernel.img ]] && config+="
gpu_mem=32
force_turbo=1
gpu_mem=32
hdmi_drive=2
max_usb_current=1
over_voltage=2"

echo "$config" > /boot/config.txt
# css color
[[ -e $dirsystem/color ]] && rm $dirsystem/color && $dirbash/cmd.sh color
# lcd
sed -i 's/fb1/fb0/' /etc/X11/xorg.conf.d/99-fbturbo.conf &> /dev/null
# nas
dirs=$( find $dirnas -mindepth 1 -maxdepth 1 -type d )
if [[ $dirs ]]; then
	while read dir; do
		umount -l "$dir" &> /dev/null
		rmdir "$dir" &> /dev/null
	done <<< $dirs
fi
sed -i '3,$ d' /etc/fstab

systemctl -q disable bluetooth camilladsp mediamtx nfs-server powerbutton shairport-sync smb snapclient spotifyd upmpdcli &> /dev/null
mv $dirdata/{addons,camilladsp,mpdconf} /tmp &> /dev/null
[[ $KEEPLIBRARY ]] && mv $dirdata/{mpd,playlists,webradio} /tmp
rm -rf $dirdata $dirshareddata \
		/mnt/MPD/.mpdignore $dirnas/.mpdignore \
		/etc/modules-load.d/{loopback,raspberrypi}.conf /etc/modprobe.d/cirrus.conf /etc/X11/xorg.conf.d/99-raspi-rotate.conf
if [[ ! $KEEPNETWORK ]]; then
	profiles=$( ls -p /etc/netctl | grep -v / )
	if [[ $profiles ]]; then
		while read profile; do
			[[ $( netctl is-enabled "$profile" ) == enabled ]] && netctl disable "$profile"
			rm "/etc/netctl/$profile"
		done <<< $profiles
	fi
fi

$dirsettings/system-datadefault.sh

mv /tmp/{addons,camilladsp,mpdconf} $dirdata &> /dev/null
[[ $KEEPLIBRARY ]] && mv -f /tmp/{mpd,playlists,webradio} $dirdata

$dirbash/power.sh reboot
