#!/bin/bash

# shairport.service > this:
#    - /tmp/shairport-sync-metadata emits data

. /srv/http/bash/common.sh

dirairplay=$dirshm/airplay
elapsed=$( getContent $dirairplay/elapsed false )

# ...
# <item><type>636f7265</type><code>6173616c</code><length>18</length> # hex
# <data encoding="base64">
# U29uZ3Mgb2YgSW5ub2NlbmNl</data></item>                              # base64
#...
cat /tmp/shairport-sync-metadata | while read line; do
	[[ $line == '<data '* ]] && continue
#...............................................................................
	if [[ $line == *'type><code'* ]]; then
		case $line in
			*6173616c* ) CODE=Album;;    # asal
			*61736172* ) CODE=Artist;;   # asar
			*61736161* ) CODE=Artist;;   # asaa
			*50494354* ) CODE=coverart;; # PICT
			*63617073* ) CODE=state;;    # caps
			*6d696e6d* ) CODE=Title;;    # minm
			*70726772* ) CODE=progress   # prgr
						 start=$( date +%s );; # elapsed reference while play
	#		*61656e64* )                 # aend - airplay end
	#			echo mpd > $dirshm/player
	#			$dirbash/status-push.sh playerstop
	#			systemctl stop shairport
	#			break
		esac
		continue
#...............................................................................
	fi
	[[ ! $CODE ]] && continue # skip following lines if CODE not set
#...............................................................................
	B64=${line/<*}
	[[ ! $B64 ]] && CODE= && continue
#...............................................................................
	case $CODE in
		state )
			[[ $B64 == AQ== ]] && state=play || state=pause
			[[ $elapsed == false ]] && state=stop
			if [[ $prev_state != $state ]]; then
				echo $state > $dirairplay/state
				$dirbash/status-push.sh
				prev_state=$state
			fi
			;;
		coverart )
			base64 -d <<< $B64 > $dirairplay/coverart.jpg
			pushData cover '{ "cover": "/data/shm/airplay/coverart.jpg" }'
			;;
		progress ) # begin/current/end @44100/s (play current slips after pause - reset in a few seconds)
			frame=$( base64 -d <<< $B64 2> /dev/null )
			[[ $frame != */* ]] && CODE= && continue # skip single field
#...............................................................................
			read elapsed Time < <( awk -F'/' '{ printf "%0.f %0.f", ( $2 - $1 ) / 44100, ( $3 - $1 ) / 44100 }' <<< $frame )
			if (( $elapsed <= 0 || $elapsed >= $Time )); then
				elapsed=false
				state=stop
			else
				start=$(( start - elapsed )) # epoch for elapsed calc while play
				state=play
			fi
			for k in elapsed start state Time; do
				echo ${!k} > $dirairplay/$k
			done
			$dirbash/status-push.sh
			;;
		* )
			value=$( base64 -d <<< $B64 2> /dev/null )
			if [[ ${!CODE} != $value ]]; then
				echo $value > $dirairplay/$CODE
				pushData mpdplayer '{ "'$CODE'": "'$( quoteEscape $value )'" }'
				printf -v $CODE '%s' "$value"
			fi
			;;
	esac
	CODE=
done
