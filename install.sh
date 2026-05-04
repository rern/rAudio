#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260505
if [[ -e /boot/kernel.img ]] && grep -q '^\[core' /etc/pacman.conf; then
	sed -i '/^\[core]/,$ d' /etc/pacman.conf
fi

if [[ $( pacman -Q mpd_oled ) < 'mpd_oled 0.02.3-1' ]]; then
	pacman -Sy --noconfirm mpd_oled
	file=/etc/default/mpd_oled
	if grep ' -X' $file; then
		sed -i 's/ -X//' $file
	else
		sed -i 's/fifo"/fifo -X"/' $file
	fi
fi

if systemctl -q is-active nfs-server; then
	rserver=1
	$dirsettings/features.sh 'nfsserver
OFF'
fi
file=/mnt/MPD/.mpdignore
if [[ -e $file ]]; then
	rm $file
	mv /mnt/MPD/{NVME,SATA,SD,USB} /mnt &> /dev/null
fi

if [[ -e /bin/camilladsp && $( pacman -Q camilladsp ) < 'camilladsp 4.1.3-1' ]]; then
	systemctl -q is-active camilladsp && active=1
	[[ $active ]] && systemctl stop camilladsp
	rm -f $dirshm/hwparams
	pacman -Sy --noconfirm camilladsp
	while read f; do
		sed -i -E -e 's/FLOAT/F/; s/S24LE3/S24_3_LE/' -e 's/([246])LE/\1_LE/' $f
	done < <( grep -rl '[246]\+LE' $dircamilladsp )
	[[ $active ]] && systemctl start camilladsp
fi

# 20260424
if [[ -e /bin/firefox ]]; then
	file=/etc/udev/rules.d/mouse.rules
	if [[ ! -e $file ]]; then
		echo 'ACTION=="add|remove", SUBSYSTEM=="input", ENV{ID_INPUT_MOUSE}=="1", RUN+="/srv/http/bash/settings/features.sh mouse"' > $file
		udevadm control --reload-rules
		udevadm trigger
	fi

	file=$dirsystem/localbrowser.conf
	grep -q ^cursor $file && sed -i '/^cursor/ d' $file
fi

rm -f /root/.bashrc

# 20260409
if [[ -e /bin/firefox ]]; then
	file=/lib/firefox/distribution/policies.json
	[[ ! -e $file ]] && cat << EOF > $file
{
	"policies": {
		"DisableAppUpdate": true,
		"DontCheckDefaultBrowser": true,
		"OverrideFirstRunPage": "",
		"SkipOnboarding": true,
		"Preferences": {
			"browser.startup.homepage_override.mstone": "ignore",
			"browser.sessionstore.resume_from_crash": false,
			"layout.css.prefers-color-scheme.content-override": 0,
			"layout.css.devPixelsPerPx": "1.00"
		}
	}
}
EOF
	find /root/.config/mozilla -name user.js -delete &> /dev/null
	file=/etc/systemd/system/localbrowser.service
	if ! grep -q ^User $file; then
		sed -i '/^Type/ a\User=root' $file
		systemctl daemon-reload
	fi
fi

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

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,js}

getinstallzip

. $dirbash/common.sh
dirPermissions
cacheBust
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color
rm -f $dirshm/system

installfinish

# 20260501
[[ $rserver ]] && $dirsettings/features.sh nfsserver
