#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

path="/mnt/MPD/$file"
argslast=${args[@]: -1} # CMD album albumartist ... file - omit unchanged
[[ -f $path ]] && istrack=1

if [[ $file != *.cue ]]; then
	keys=( ${argslast:4:-5} )
	for k in "${keys[@]}"; do
		v=${!k}
		[[ $v == '*' ]] && continue
		
		[[ $v ]] && v=$( stringEscape $v )
		[[ $istrack ]] && kid3-cli -c "set $k \"$v\"" "$path" || kid3-cli -c "set $k \"$v\"" "$path/"*.*
	done
	[[ $istrack ]] && dirupdate=$( dirname "$file" ) || dirupdate=$file
else
	if [[ $istrack ]]; then
		sed -i -E '/^\s+TRACK '$track'/ {
n; s/^(\s+TITLE).*/\1 "'$title'"/
n; s/^(\s+PERFORMER).*/\1 "'$artist'"/
}
' "$path"
	else
		[[ $album ]]       && data="\
TITLE $album"
		[[ $albumartist ]] && data+="
PERFORMER $albumartist"
		for k in composer conductor genre date; do
			data+="
REM ${k^^} ${!composer}"
		done
		data+="
$( sed -E '/^TITLE|^PERFORMER|^REM/ d; s/^(\s+PERFORMER ).*/\1'$artist'/' "$path" )"
		echo "$data" > "$path"
	fi
	dirupdate=$( dirname "$file" )
fi

touch $dirmpd/updating
mpc update "$dirupdate"
pushstream mpdupdate '{"type":"mpd"}'
notify 'library blink' 'Library Database' 'Update ...'
