#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

path="/mnt/MPD/$FILE"
argslast=${args[@]: -1} # CMD ALBUM ALBUMARTIST ... FILE - omit unchanged
[[ -f $path ]] && istrack=1

if [[ $FILE != *.cue ]]; then
	KEYS=( ${argslast:4:-5} ) # remove CMD and FILE
	for K in "${KEYS[@]}"; do
		k=${K,,}
		v=${!K}
		[[ $v == '*' ]] && continue
		
		[[ $v ]] && v=$( stringEscape $v )
		[[ ! $istrack ]] && all='/*.*'
		kid3-cli -c "set $k \"$v\"" "$path"$all
	done
	[[ $istrack ]] && dirupdate=$( dirname "$FILE" ) || dirupdate=$FILE
else
	if [[ $istrack ]]; then
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
		for k in COMPOSER CONDUCTOR GENRE DATE; do
			data+="
REM $k ${!k}"
		done
		data+="
$( sed -E '/^TITLE|^PERFORMER|^REM/ d; s/^(\s+PERFORMER ).*/\1'$ARTIST'/' "$path" )"
		echo "$data" > "$path"
	fi
	dirupdate=$( dirname "$FILE" )
fi

touch $dirshm/tageditor
$dirbash/cmd.sh "mpcupdate
update
$dirupdate
CMD ACTION PATHMPD"
