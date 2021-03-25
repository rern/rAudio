#!/bin/bash

readarray -t args <<< "$1"
file=${args[0]}
album=${args[1]}
cue=${args[2]}
path="/mnt/MPD/$file"
args=( "${args[@]:3}" )
keys=( album albumartist artist composer conductor genre date )

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=mpdupdate -d "$1"
}

if [[ $cue == false ]]; then
	if [[ $album == false ]]; then
		keys+=( title track )
		for i in {0..8}; do
			val=${args[$i]//\"/\\\"}
			[[ -z $val ]] && continue
			
			[[ $val == -1 ]] && val=
			kid3-cli -c "set ${keys[$i]} \"$val\"" "$path"
		done
		dir=$( dirname "$file" )
	else
		for i in {0..6}; do
			val=${args[$i]//\"/\\\"}
			[[ -z $val ]] && continue
			
			[[ $val == -1 ]] && val=
			kid3-cli -c "set ${keys[$i]} \"$val\"" "$path/"*.*
			[[ $i == 1 ]] && albumartist=1
		done
		dir=$file
		[[ -n $albumartist ]] && (( $( ls "$path"/*.wav 2> /dev/null | wc -l ) > 0 )) && touch /srv/http/data/system/wav
	fi
else
	if [[ $album == false ]]; then
		sed -i '/^\s\+TRACK '${args[2]}'/ {
n; s/^\(\s\+TITLE\).*/\1 "'${args[1]}'"/
n; s/^\(\s\+PERFORMER\).*/\1 "'${args[0]}'"/
}
' "$path"
	else
		lines=( 'TITLE' 'PERFORMER' 'REM COMPOSER' 'REM CONDUCTOR' 'REM DATE' 'REM GENRE' )
		for i in {0..6}; do
			val=${args[$i]}
			[[ -z $val ]] && continue
			
			sed -i "/^${lines[$i]}/ d" "$path"
			[[ $val == -1 ]] && continue
			
			case $i in
				0 ) sed -i "1 i\TITLE \"$val\"" "$path";;
				1 ) sed -i "1 i\PERFORMER \"$val\"" "$path";;
				2 ) sed -i "1 a\REM COMPOSER \"$val\"" "$path";;
				3 ) sed -i "1 a\REM CONDUCTOR \"$val\"" "$path";;
				4 ) sed -i "1 a\REM DATE \"$val\"" "$path";;
				5 ) sed -i "1 a\REM GENRE \"$val\"" "$path";;
			esac
		done
	fi
fi

pushstream 1
touch /srv/http/data/system/updating
mpc update "$dir"
