#!/bin/bash

. /srv/http/bash/common.sh

$dirsettings/player-conf.sh
[[ -e $dirsystem/volumelimit ]] && volumeLimit startup

if [[ ! -e $dirmpd/mpd.db || -e $dirsystem/mpcupdate.conf ]]; then
	$dirbash/cmd.sh mpcupdate
elif [[ -e $dirmpd/listing ]]; then
	$dirbash/cmd-list.sh &> /dev/null &
else
	touch $dirshm/updatedone
fi

touch $dirshm/startup
pushData startup true

if [[ -e $dirsystem/autoplay ]]; then
	grep -q startup $dirsystem/autoplay.conf && mpcPlayback play
fi
[[ -e /boot/startup.sh ]] && /boot/startup.sh

udevil clean
lsblk -no path,vendor,model | grep -v ' $' > $dirshm/lsblkusb
if [[ ! -e $diraddons/update ]] && ipOnline 8.8.8.8; then
	[[ $EXPAND ]] && timezoneAuto
	data=$( curl -sL $https_addonslist )
	if [[ $? == 0 ]]; then
		echo "$data" > $diraddons/addonslist.json
		latest=$( jq -r .r1.version <<< $data )
		if [[ $latest > $( < $diraddons/r1 ) ]]; then
			touch $diraddons/update
			pushData option '{ "addons": true }'
		fi
	fi
fi
