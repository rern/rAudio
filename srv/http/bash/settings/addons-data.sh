#!/bin/bash

. /srv/http/bash/common.sh

evalData() {
	local cmd
	cmd=$( grep '"'$1'"' <<< $addondata | cut -d'"' -f4 )
	if [[ $1 == version ]]; then
		[[ $( < $diraddons/$addon ) < $cmd ]] && return 0
	else
		[[ $cmd && $( eval $cmd ) ]] && return 0
	fi
}

########
data=$( curl -sfL https://github.com/rern/rAudio-addons/raw/main/addonslist.json )
if [[ $? == 0 ]]; then
	online=true
	echo "$data" > $diraddons/addonslist.json
else
	online=false
	notify 'warning yl blink' Addons 'Server not reachable.'
fi
########
[[ ! $data ]] && data=$( < $diraddons/addonslist.json )
addons=$( grep ': {$' <<< $data \
			| tr -d '\t, ":{' \
			| grep -Ev 'option|push' )
for addon in $addons; do
	addondata=$( sed -n "/$addon/,/}/ p" <<< $data )
	evalData hide && hidden+=',"'$addon'"'
	evalData verify && notverified+=',"'$addon'"'
	if [[ -e $diraddons/$addon ]]; then
		installed+=',"'$addon'"'
		evalData version && update+=',"'$addon'"'
	fi
done
if [[ $update ]]; then
	pushData option '{ "addons": 1 }'
	touch $diraddons/update
else
	rm -f $diraddons/update
fi
data=$( head -n -1 <<< $data )
data+='
	, "status" : {
		  "hidden"      : [ '${hidden:1}' ]
		, "installed"   : [ '${installed:1}' ]
		, "notverified" : [ '${notverified:1}' ]
		, "update"      : [ '${update:1}' ]
		, "online"      : '$online'
	}
}'
echo "$data"
