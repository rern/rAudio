#!/bin/bash

. /srv/http/bash/common.sh

! internetConnected && echo 'No internet connection.' && exit

addonslist=$( curl -sSfL https://github.com/rern/rAudio-addons/raw/main/addons-list.json )
[[ $? != 0 ]] && echo 'Database download failed.' && exit

installed=$( ls $diraddons | grep -Ev 'addons-list|update' )
for addon in $installed; do
	verinstalled=$( < $diraddons/$addon )
	versions+=', "'$addon'" : "'$verinstalled'"'
	[[ $verinstalled > 1 && $verinstalled != $( jq -r .$addon.version <<< $addonslist ) ]] && update=1
done

sed "$ i\, \"versioninstalled\" : { ${versions:1} }" <<< $addonslist

if [[ $update ]]; then
	pushstream option '{"addons":1}'
	touch $diraddons/update
else
	rm -f $diraddons/update
fi
