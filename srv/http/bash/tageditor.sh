#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

if [[ $CMD == get ]]; then
	if [[ $FILE == *.cue ]]; then
		cue=1
	elif [[ -f "/mnt/MPD/$FILE" ]]; then
		file=1
	fi
	[[ $file || $TRACK ]] && tags='track title '
	tags+='album albumartist artist composer conductor genre date'
	format=%${tags// /%^%}%
	lines=$( mpc ls -f $format "$FILE" )
	if [[ $cue ]]; then
		lines=$( grep '\^' <<< $lines )
		[[ $TRACK ]] && values=$( sed -n ${TRACK}p <<< $lines )
	else
		[[ $file ]] && f=$FILE || f=$( mpc ls "$FILE" | head -1 )
		[[ $f == *.wav ]] && ALBUMARTIST=$( kid3-cli -c 'get albumartist' "/mnt/MPD/$f" )
		[[ $file ]] && values=$lines
	fi
	if [[ ! $values ]]; then
		i=1
		for tag in $tags; do # album
			v=$( cut -d^ -f $i <<< $lines | sort -u )
			(( $( wc -l <<< $v ) > 1 )) && v=*
			values+="^$v"
			(( i++ ))
		done
		values=${values:1}
	fi
	IFS='^' read -r $tags <<< "$values"
	[[ $ALBUMARTIST ]] && albumartist=$ALBUMARTIST
	for tag in $tags; do
		arg+=( --arg $tag "${!tag}" )
		json+=", $tag: \$$tag"
	done
	jq -n "${arg[@]}" "{ ${json:1} }"
	exit
fi

path="/mnt/MPD/$FILE"
argslast=${args[@]: -1} # CMD ALBUM ALBUMARTIST ... FILE - omit unchanged
[[ -f $path ]] && istrack=1

if [[ $FILE != *.cue ]]; then
	KEYS=( ${argslast:4:-5} ) # remove CMD and FILE
	for K in "${KEYS[@]}"; do
		k=${K,,}
		v=${!K}
		[[ $v == '*' ]] && continue
		
		[[ $v ]] && v=$( quoteEscape $v )
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

$dirbash/cmd.sh "mpcupdate
update
$dirupdate
CMD ACTION PATHMPD"
