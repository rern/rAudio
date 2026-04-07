#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260407
file=/etc/systemd/system/localbrowser.service
! grep -q ^User $file && sed -i '/^Type/ a\User=root' $file

dir=/etc/systemd/system/nfs-server.service.d
if [[ -e /bin/nfsdctl && ! -e $dir ]]; then
	mkdir -p $dir
	cat << EOF > $dir/override.conf
[Service]
ExecStart=
ExecStopPost=

ExecStart=/bin/rpc.nfsd
ExecStop=/bin/rpc.nfsd 0
EOF
	systemctl daemon-reload
	systemctl try-restart nfs-server
fi

# 20260401
file=/etc/conf.d/wireless-regdom
if ! grep -q '^#W' $file; then
	current=$( < $file )
	curl -sL https://raw.githubusercontent.com/rern/rAudio/main/wireless-regdom -o $file
	echo $current >> $file
fi

file=/etc/ssh/sshd_config
if grep -q '^PermitEmptyPasswords *yes' $file; then
	sed -i -E 's/.*(PermitEmptyPasswords ).*/\1no/' $file
	systemctl restart sshd
fi

# 20260212
file=/etc/conf.d/devmon
if grep -q remove $file; then
	sed -i "s|usbconnect.*usbremove|usbmount|" $file
	systemctl restart devmon@http
fi

file=/etc/udev/rules.d/usbstorage.rules
if [[ ! $file ]]; then
	cat << EOF > $file
KERNEL=="sd[a-z]" \
ACTION=="add", \
RUN+="/srv/http/bash/settings/system.sh usbadd"

KERNEL=="sd[a-z]" \
ACTION=="remove", \
RUN+="/srv/http/bash/settings/system.sh usbremove"
EOF
	sed -i -e 's/usbconnect/usbmount/
' -e '/^ACTION=="remove"/,$ d
' /etc/udev/rules.d/ntfs.rules
	udevadm control --reload-rules
	udevadm trigger
fi

file=/etc/modprobe.d/blacklist.conf
[[ ! -e $file ]] && cat << EOF > $file
blacklist bluetooth
blacklist bnep
blacklist btbcm
blacklist hci_uart
EOF

file=/boot/config.txt
if grep -q -m1 disable-bt $file; then
	sed -i '/disable-bt/ d' /boot/config.txt
	touch $dirsystem/btdisable
fi

[[ ! -e /bin/dtoverlay ]] && pacman -Sy --noconfirm raspberrypi-utils

if [[ ! -e /boot/kernel.img && $( spotifyd -V ) < 'spotifyd 0.4.2' ]]; then
	sed -i 's/ipv6.disable=1 //' /boot/cmdline.txt
	pacman -Sy --needed --noconfirm spotifyd
	file=/etc/spotifyd.conf
	! grep -q '^mixer = "hw"' $file && sed -i -E 's/^(mixer = ).*/\1"hw"/' $file
	echo ', "spotifyd": "Spotify"' >> $dirshm/reboot

fi

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js} /srv/http/{bash,settings}

getinstallzip

. $dirbash/common.sh
dirPermissions
$dirbash/cmd.sh cachebust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish

# 20260216
if [[ -e /mnt/SD ]]; then
	mv -f /mnt/{SD,USB} /mnt/MPD &> /dev/null
	echo -e 'NVME\nSATA\nSD\nUSB' >> /mnt/MPD/.mpdignore
	sed -i 's|/mnt/USB|/mnt/MPD/USB|' /etc/udevil/udevil.conf
	systemctl restart devmon@http
fi
