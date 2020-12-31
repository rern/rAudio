#!/bin/bash

for pid in $( pgrep mpd ); do
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

pushstream() {
	[[ -z $3 ]] && ip=127.0.0.1 || ip=$3
	curl -s -X POST http://$ip/pub?id=$1 -d "$2"
}

dirtmp=/srv/http/data/shm
flag=$dirtmp/flag
flagpl=$dirtmp/flagpl
flagpladd=$dirtmp/flagpladd
snapclientfile=$dirtmp/snapclientip

mpc idleloop | while read changed; do
	[[ $changed == playlist && $( mpc current -f %file% | cut -c1-4 ) == http ]] && continue
	
	case $changed in
		player )
			if [[ ! -e $flag ]]; then # track change only
				touch $flag
				currentprev=$current
				current=$( mpc current )
				if [[ -z $current || $current != $currentprev ]]; then
					killall status-coverartonline.sh &> /dev/null # kill if still running
					if [[ ! -e $dirtmp/player-snapclient ]]; then
						status=$( /srv/http/bash/status.sh )
						pushstream mpdplayer "$status"
						if [[ -e /srv/http/data/system/librandom ]]; then
							counts=$( mpc | awk '/\[playing\]/ {print $2}' | tr -d '#' )
							pos=${counts/\/*}
							total=${counts/*\/}
							left=$(( total - pos ))
							if (( $left < 2 )); then
								/srv/http/bash/cmd.sh randomfile
								(( $left == 0 )) && /srv/http/bash/cmd.sh randomfile
								touch $flagpl
							fi
						fi
						if [[ -e /srv/http/data/system/lcdchar ]]; then
							killall lcdchar.py &> /dev/null
							readarray -t data <<< "$( echo "$status" | jq -r '.Artist, .Title, .Album, .elapsed, .Time, .state' )"
							/srv/http/bash/lcdchar.py "${data[@]}" &> /dev/null &
						fi
					else
						sed -i '/^$/d' $snapclientfile # remove blank lines
						if [[ -s $snapclientfile ]]; then
							mapfile -t clientip < $snapclientfile
							for ip in "${clientip[@]}"; do
								status=$( /srv/http/bash/status.sh )
								pushstream mpdplayer "$status" $ip
							done
						else
							rm $snapclientfile
						fi
					fi
					[[ -e $flagpl ]] && pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
				fi
				rm -f $flag $flagpl
			fi
			;;
		playlist ) # consume mode: playlist+player at once - run player fisrt
			if [[ $( mpc | awk '/^volume:.*consume:/ {print $NF}' ) == on && ! -e $flagpladd ]]; then
				( sleep 0.05
					if [[ -e $flag ]]; then
						touch $flagpl
					else
						rm -f $flagpl
						pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
					fi
				) &
			fi
			;;
		update )
			if [[ -e /srv/http/data/system/updating ]] && ! mpc | grep -q '^Updating'; then
				/srv/http/bash/cmd-list.sh
			fi
			;;
	esac
done
