#!/bin/bash

. /srv/http/bash/common.sh

online=true
if [[ -e $dirshm/addonsprogress ]]; then
	rm $dirshm/addonsprogress
else
	data=$( curl -sfL https://github.com/rern/rAudio-addons/raw/main/addonslist.json )
	if [[ $? == 0 ]]; then
		echo "$data" > $diraddons/addonslist.json
	else
		online=false
		data=$( < $diraddons/addonslist.json )
		notify addons Addons 'Server not reachable.' -1
	fi
fi
[[ ! $data ]] && data=$( < $diraddons/addonslist.json )
addons=( $( jq keys <<< $data | tr -d '[",]' ) )
for addon in ${addons[@]}; do
	addondata=$( jq -r ."$addon" <<< $data )
	hide=$( jq -r .hide <<< $addondata )
	if [[ $hide != null ]]; then
		[[ $hide != 1 ]] && hide=$( eval $hide )
		[[ $hide ]] && hidden+=',"'$addon'"'
	fi
	verify=$( jq -r .verify <<< $addondata )
	[[ $verify && $( eval $verify 2> /dev/null ) == 1 ]] && notverified+=',"'$addon'"'
	if [[ -e $diraddons/$addon ]]; then
		installed+=',"'$addon'"'
		version=$( jq -r .version <<< $addondata )
		[[ $( < $diraddons/$addon ) < $version ]] && update+=',"'$addon'"'
	fi
done
if [[ $update ]]; then
	pushData option '{ "addons": 1 }'
	touch $diraddons/update
else
	rm -f $diraddons/update
fi
echo $( head -n -1 <<< $data )'
	, "status" : {
		  "hidden"      : [ '${hidden:1}' ]
		, "installed"   : [ '${installed:1}' ]
		, "notverified" : [ '${notverified:1}' ]
		, "update"      : [ '${update:1}' ]
		, "online"      : '$online'
	}
}'
