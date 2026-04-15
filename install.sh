#!/bin/bash

alias=r1

. /srv/http/bash/settings/addons.sh

# 20260420
file=/etc/udev/rules.d/mouse.rules
if [[ -e /bin/firefox && ! -e $file ]]; then
	cat << EOF > $file
ACTION=="add", SUBSYSTEM=="input", ENV{ID_INPUT_MOUSE}=="1", RUN+="/srv/http/bash/mouse.sh"
ACTION=="remove", SUBSYSTEM=="input", ENV{ID_INPUT_MOUSE}=="1", RUN+="/srv/http/bash/mouse.sh remove"
EOF
	udevadm control --reload-rules
	udevadm trigger
fi

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
	file=/etc/systemd/system/localbrowser.service
	! grep -q ^User $file && sed -i '/^Type/ a\User=root' $file
	find /root/.config/mozilla -name user.js -delete &> /dev/null
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

installfinish

# 20260413
if [[ -L $dirnas/SD ]]; then
	rm $dirnas/{NVME,SATA,SD,USB} &> /dev/null
	. $dirsettings/features.sh
	mountBindNfs
fi

# 20260216
if [[ -e /mnt/SD ]]; then
	mv -f /mnt/{SD,USB} /mnt/MPD &> /dev/null
	echo -e 'NVME\nSATA\nSD\nUSB' >> /mnt/MPD/.mpdignore
	sed -i 's|/mnt/USB|/mnt/MPD/USB|' /etc/udevil/udevil.conf
	systemctl restart devmon@http
fi
