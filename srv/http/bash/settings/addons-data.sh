#!/bin/bash

. /srv/http/bash/common.sh

! internetConnected && echo 'No internet connection.' && exit

data=$( curl -sSfL https://github.com/rern/rAudio-addons/raw/main/addons-list.json | head -n -1 ) # remove last } for append
[[ $? != 0 ]] && echo 'Database download failed.' && exit

addons=$( sed -n '/^\s, .*{$/ {s/.*, "\(.*\)".*/\1/; p}' <<< $data )
for addon in $addons; do
	addondata=$( sed -n '/"'$addon'"/,/^\s}/ p' <<< $data )
	hide=$( sed -n '/"hide"/ {s/.* : "//; s/"$//; p}' <<< $addondata )
	verify=$( sed -n '/"command"/ {s/.* : "//; s/"$//; p}' <<< $addondata )
	[[ $hide && $( eval $hide 2> /dev/null ) == 1 ]] && hide+=',"'$addon'"'
	[[ $verify && $( eval $verify 2> /dev/null ) == 1 ]] && notverified+=',"'$addon'"'
	if [[ -e $diraddons/$addon ]]; then
		installed+=',"'$addon'"'
		version=$( sed -n '/"version"/ {s/.* : "//; s/"$//; p}' <<< $addondata )
		[[ $( < $diraddons/$addon ) < $version ]] && update+=',"'$addon'"'
	fi
done
[[ $hide ]] && hide='['${hide:1}']' || hide='[""]'
[[ $installed ]] && installed='['${installed:1}']' || installed='[""]'
[[ $notverified ]] && notverified='['${notverified:1}']' || notverified='[""]'
if [[ $update ]]; then
	update='['${update:1}']'
	pushstream option '{"addons":1}'
	touch $diraddons/update
else
	update='[""]'
	rm -f $diraddons/update
fi
data+='
	, "status" : {
		  "hide"             : '$hide'
		, "installed"        : '$installed'
		, "notverified"      : '$notverified'
		, "update"           : '$update'
	}
}'
echo "$data"
