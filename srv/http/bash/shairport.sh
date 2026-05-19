#!/bin/bash

# shairport.service > this:
#    - /tmp/shairport-sync-metadata emits data

. /srv/http/bash/common.sh

stateSet() {
	[[ $elapsed == false ]] && state=stop || state=$1
	echo $state > $dirairplay/state
}

dirairplay=$dirshm/airplay
elapsed=$( getContent $dirairplay/elapsed false )

# ...
# <item><type>636f7265</type><code>6173616c</code><length>18</length> # hex
# <data encoding="base64">
# U29uZ3Mgb2YgSW5ub2NlbmNl</data></item>                              # base64
#...
cat /tmp/shairport-sync-metadata | while read line; do
	[[ $line == *'>0</length>' || ( $line != '<item'* && $line != *'item>' ) ]] && continue
#...............................................................................
	if [[ $line == '<item'* ]]; then 
		case $( sed -E 's|.*code>(.*)</code.*|\1|' <<< $line ) in
			61736172 | 61736161 ) CODE=Artist;;   # asar | asaa
			6d696e6d )            CODE=Title;;    # minm
			6173616c )            CODE=Album;;    # asal
			50494354 )            CODE=coverart;; # PICT
			70726772 )            CODE=progress;; # prgr
			63617073 )            CODE=state;;    # caps
		esac
		continue
#...............................................................................
	fi
	[[ ! $CODE ]] && continue # skip not in 'case'
#...............................................................................
	B64=$( tr -d '\0' <<< ${line/<*} ) # U29uZ3Mgb2YgSW5ub2NlbmNl</data></item> > U29uZ3Mgb2YgSW5ub2NlbmNl
	if [[ ! $B64 =~ ^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$ ]]; then # not base64 string - reset
		CODE=
		continue
#...............................................................................
	fi
	case $CODE in
		state )
			case $B64 in
				AQ== )
					stateSet play
					$dirbash/status-push.sh
					;;
				Ag== )
					stateSet pause
					pushData mpdplayer '{ "state": "'$state'", "elapsed": '$elapsed' }'
					;;
			esac
			;;
		coverart )
			base64 -d <<< $B64 > $dirairplay/coverart.jpg
			pushData cover '{ "cover": "/data/shm/airplay/coverart.jpg" }'
			;;
		progress ) # start/current/end @44100/s
			read elapsed Time < <( base64 -d <<< $B64 2> /dev/null \
										| awk -F'/' '{ printf "%0.f %0.f", ( $2 - $1 ) / 44100, ( $3 - $1 ) / 44100 }' )
			(( $elapsed == 0 || $elapsed > $Time )) && elapse=false
			echo $elapsed > $dirairplay/elapsed
			echo $Time >    $dirairplay/Time
			date +%s%3N >   $dirairplay/timestamp
			$dirbash/status-push.sh
			;;
		* )
			value=$( base64 -d <<< $B64 2> /dev/null )
			echo $value > $dirairplay/$CODE
			pushData mpdplayer '{ "'$CODE'": "'$( quoteEscape $value )'" }'
			;;
	esac
	CODE=
done
