#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

# 20130208
file=$dircamilladsp/configs/camilladsp.yml
if [[ -e $file && ! grep '- Volume' $file; then
	sed -i '/names:/ a\  - Volume' $file
fi

# 20130123
if [[ -e $dircamilladsp/configs/default_config.yml ]]; then
	mv $dircamilladsp/{configs/,}default_config.yml
	rm $dircamilladsp/configs/active_config.yml
	ln -s $dircamilladsp/{configs/camilladsp,active_config}.yml
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

#-------------------------------------------------------------------------------
installstart "$1"

rm -rf /srv/http/assets/{css,fonts,js}

getinstallzip

[[ ! -e /usr/bin/camilladsp ]] && rm -rf /srv/http/settings/camillagui

chmod +x $dirsettings/system.sh
$dirsettings/system.sh dirpermissions
[[ -e $dirsystem/color ]] && $dirbash/cmd.sh color

installfinish
#-------------------------------------------------------------------------------
