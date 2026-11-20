#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

path="/mnt/MPD/$FILE"
[[ -f $path ]] && IS_TRACK=1
if [[ $FILE != *.cue ]]; then
	argslast=${args[@]: -1}
	TAGS=( ${argslast/CMD FILE } ) # CMD FILE ALBUM ARTIST ... > ALBUM ARTIST ...
	for T in "${TAGS[@]}"; do
		v=${!T}
		[[ $v == '*' ]] && continue
		
		[[ $v ]] && v=$( quoteEscape $v )
		[[ ! $IS_TRACK ]] && all='/*.*'
		kid3-cli -c "set ${T,,} \"$v\"" "$path"$all
	done
	[[ $IS_TRACK ]] && dirupdate=$( dirname "$FILE" ) || dirupdate=$FILE
else
	if [[ $IS_TRACK ]]; then
		sed -i -E '/^\s+TRACK '$TRACK'/ {
n; s/^(\s+TITLE).*/\1 "'$TITLE'"/
n; s/^(\s+PERFORMER).*/\1 "'$ARTIST'"/
}
' "$path"
	else
		[[ $ALBUM ]]       && data="\
TITLE $ALBUM"
		[[ $ALBUMARTIST ]] && data+="
PERFORMER $ALBUMARTIST"
		for T in COMPOSER CONDUCTOR GENRE DATE; do
			data+="
REM $T ${!T}"
		done
		data+="
$( sed -E '/^TITLE|^PERFORMER|^REM/ d; s/^(\s+PERFORMER ).*/\1'$ARTIST'/' "$path" )"
		echo "$data" > "$path"
	fi
	dirupdate=$( dirname "$FILE" )
fi

mpcUpdate update "$dirupdate"
