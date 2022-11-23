#!/bin/bash

. /srv/http/bash/common.sh

mpc idleloop | while read changed; do
	case $changed in
		mixer ) # for upmpdcli
			if [[ $( < $dirshm/player ) == upnp ]]; then
				echo 5 > $dirshm/vol
				( for (( i=0; i < 5; i++ )); do
					sleep 0.1
					s=$(( $( < $dirshm/vol ) - 1 )) # debounce volume long-press on client
					(( $s == 4 )) && i=0
					if (( $s > 0 )); then
						echo $s > $dirshm/vol
					else
						rm -f $dirshm/vol
						$dirbash/cmd.sh volumepushstream
					fi
				done ) &> /dev/null &
			fi
			;;
		playlist )
			if mpc | grep -q -m1 'consume: on'; then
				( sleep 0.05 # consume mode: playlist+player at once - run player fisrt
					pushstream playlist $( php /srv/http/mpdplaylist.php current )
				) &> /dev/null &
			fi
			;;
		player )
			if [[ ! -e $dirshm/radio && ! -e $dirshm/prevnextseek ]]; then
				killall status-push.sh &> /dev/null
				$dirbash/status-push.sh & # need to run in background for snapcast ssh
			fi
			;;
		update )
			sleep 1
			! mpc | grep -q -m1 '^Updating' && $dirbash/cmd-list.sh
			;;
	esac
done
