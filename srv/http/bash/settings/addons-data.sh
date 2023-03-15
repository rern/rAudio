#!/bin/bash

. /srv/http/bash/common.sh

! internetConnected && echo 'No internet connection.' && exit

addonslist=$( curl -sSfL https://github.com/rern/rAudio-addons/raw/main/addons-list.json )
[[ $? != 0 ]] && echo 'Database download failed.' && exit

addons=$( sed -n '/^\s, .*{$/ {s/.*, "\(.*\)".*/\1/; p}' <<< $addonslist )
for addon in $addons; do
	data=$( sed -n '/"'$addon'"/,/^\s}/ p' <<< $addonslist )
	hide=$( sed -n '/"hide"/ {s/.* : "//; s/"$//; p}' <<< $data )
	verify=$( sed -n '/"command"/ {s/.* : "//; s/"$//; p}' <<< $data )
	[[ $hide && $( eval $hide 2> /dev/null ) == 1 ]] && hide+=',"'$addon'"'
	[[ $verify && $( eval $verify 2> /dev/null ) == 1 ]] && notverified+=',"'$addon'"'
	if [[ -e $diraddons/$addon ]]; then
		installed+=',"'$addon'"'
		verinstalled=$( < $diraddons/$addon )
		versions+=',"'$addon'" : "'$verinstalled'"'
		version=$( sed -n '/"version"/ {s/.* : "//; s/"$//; p}' <<< $data )
		[[ $verinstalled > 1 && $verinstalled < $version ]] && update+=',"'$addon'"'
	fi
done
if [[ $update ]]; then
	pushstream option '{"addons":1}'
	touch $diraddons/update
else
	rm -f $diraddons/update
fi
[[ $hide ]] && hide='['${hide:1}']' || hide='[""]'
[[ $installed ]] && installed='['${installed:1}']' || installed='[""]'
[[ $notverified ]] && notverified='['${notverified:1}']' || notverified='[""]'
[[ $update ]] && update='['${update:1}']' || update='[""]'
data=$( sed '$d' <<< $addonslist )
data+='
	, "status" : {
		  "versioninstalled" : {'${versions:1}'}
		, "hide"             : '$hide'
		, "installed"        : '$installed'
		, "notverified"      : '$notverified'
		, "update"           : '$update'
	}
}'

echo "$data"
