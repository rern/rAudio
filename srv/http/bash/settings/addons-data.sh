#!/bin/bash

. /srv/http/bash/common.sh

online=true
if [[ -e $dirshm/addonsprogress ]]; then
	rm $dirshm/addonsprogress
	data=$( < $diraddons/addonslist.json )
elif internetConnected; then
	data=$( curl -sSfL https://github.com/rern/rAudio-addons/raw/main/addonslist.json )
	[[ $? == 0 ]] && echo "$data" > $diraddons/addonslist.json || notify addons Addons 'Database download failed.' -1
else
	online=false
	data=$( < $diraddons/addonslist.json )
	notify addons Addons 'Internet is offline.' -1
fi

addons=$( sed -n '/^\s, .*{$/ {s/.*, "\(.*\)".*/\1/; p}' <<< $data )
for addon in $addons; do
	addondata=$( sed -n '/"'$addon'"/,/^\s}$/ p' <<< $data )
	if grep -q '"hide"' <<< $addondata; then
		hide=$( sed -n '/"hide"/ {s/.* : "//; s/"$//; p}' <<< $addondata )
		[[ $hide != 1 ]] && hide=$( eval $hide )
		[[ $hide ]] && hidden+=',"'$addon'"'
	fi
	verify=$( sed -n '/"verify"/ {s/.* : "//; s/"$//; p}' <<< $addondata )
	[[ $verify && $( eval $verify 2> /dev/null ) == 1 ]] && notverified+=',"'$addon'"'
	if [[ -e $diraddons/$addon ]]; then
		installed+=',"'$addon'"'
		version=$( sed -n '/"version"/ {s/.* : "//; s/"$//; p}' <<< $addondata )
		[[ $( < $diraddons/$addon ) < $version ]] && update+=',"'$addon'"'
	fi
done
[[ $hidden ]] && hidden='['${hidden:1}']' || hidden='[""]'
[[ $installed ]] && installed='['${installed:1}']' || installed='[""]'
[[ $notverified ]] && notverified='['${notverified:1}']' || notverified='[""]'
if [[ $update ]]; then
	update='['${update:1}']'
	pushstream option '{ "addons": 1 }'
	touch $diraddons/update
else
	update='[""]'
	rm -f $diraddons/update
fi
echo $( head -n -1 <<< $data )'
	, "status" : {
		  "hidden"      : '$hidden'
		, "installed"   : '$installed'
		, "notverified" : '$notverified'
		, "update"      : '$update'
		, "online"      : '$online'
	}
}'
