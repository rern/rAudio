#!/bin/bash

. /srv/http/bash/common.sh

args2var "$1"

tagREM() {
	for T in COMPOSER CONDUCTOR DATE GENRE; do
		v=${!T}
		[[ $v ]] && tag+="
${1}REM $T \"$v\""
	done
}

if [[ $FILE != *.cue ]]; then
	[[ ! $TRACK ]] && all='/*.*'
	argslast=${args[@]: -1}
	TAGS=( ${argslast/CMD FILE } ) # CMD FILE ALBUM ARTIST ... > ALBUM ARTIST ...
	for T in "${TAGS[@]}"; do
		v=${!T}
		[[ $v ]] && v=$( quoteEscape $v )
		kid3-cli -c "set ${T,,} \"$v\"" "$FILE"$all
	done
	[[ $TRACK ]] && dirupdate=$( dirname "$FILE" ) || dirupdate=$FILE
else
	if [[ $TRACK ]]; then
		(( $TRACK < 10 )) && TRACK=0$TRACK
		data=$( sed -n -E "/^\s+TRACK $TRACK /,/^\s+INDEX/ p" "$FILE" )
		tag="\
$( head -n 1 <<< $data )
    TITLE \"$TITLE\""
		[[ $ARTIST ]] && tag+="
    PERFORMER \"$ARTIST\""
		tagREM '    '
		tag+="
$( tail -n 1 <<< $data )"
		echo "$tag" > $dirshm/tag
		line=$( sed -n -E '/^\s+TRACK '$TRACK' /=' "$FILE" )
		sed -E -e "$line e cat $dirshm/tag" -e "$line,/^\s+INDEX/ d" "$FILE"
	else
		tagREM
		[[ $ALBUM ]]       && tag+="
TITLE \"$ALBUM\""
		[[ $ALBUMARTIST ]] && tag+="
PERFORMER \"$ALBUMARTIST\""
		tag+="
$( grep ^FILE "$FILE" )"
		echo "$tag" > $dirshm/tag
		line=$(( $( sed -n -E '/^\s+TRACK 01 /=' "$FILE" ) - 1 ))
		sed -e "1 e cat $dirshm/tag" -e "1,$line d" "$FILE"
	fi
	rm $dirshm/tag
	dirupdate=$( dirname "$FILE" )
fi

mpcUpdate update "$dirupdate"
