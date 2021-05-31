#!/bin/bash

randomfileAdd() {
	dir=$( cat $dirmpd/album | shuf -n 1 | cut -d^ -f7 )
	mpcls=$( mpc ls "$dir" )
	file=$( echo "$mpcls" | shuf -n 1 )
	echo $mpcls | grep -q .cue$ && file="${file%.*}.cue"
	if [[ ${file: -4} == .cue ]]; then
		plL=$(( $( grep '^\s*TRACK' "/mnt/MPD/$file" | wc -l ) - 1 ))
		range=$( shuf -i 0-$plL -n 1 )
		mpc --range=$range load "$file"
	else
		mpc add "$file"
	fi
}
counts=$( mpc | awk '/\[playing\]/ {print $2}' | tr -d '#' )
pos=${counts/\/*}
total=${counts/*\/}
left=$(( total - pos ))
(( $left > 1 )) && exit

randomfileAdd
(( $left == 0 )) && randomfileAdd
(( $1 == start )) && randomfileAdd
curl -s -X POST http://127.0.0.1/pub?id=playlist -d "$( php /srv/http/mpdplaylist.php current )"
