#!/bin/bash

for pid in $( pgrep mpd ); do
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

pushstream() {
	curl -s -X POST http://127.0.0.1/pub?id=$1 -d "$2"
}

dirbash=/srv/http/bash
dirsystem=/srv/http/data/system
dirtmp=/srv/http/data/shm

mpc idleloop | while read changed; do
	case $changed in
		mixer ) # for upmpdcli
			if [[ -e $dirtmp/player-upnp ]]; then
				echo 5 > $dirtmp/vol
				( for (( i=0; i < 5; i++ )); do
					sleep 0.1
					s=$(( $( cat $dirtmp/vol ) - 1 )) # debounce volume long-press on client
					(( $s == 4 )) && i=0
					if (( $s > 0 )); then
						echo $s > $dirtmp/vol
					else
						rm -f $dirtmp/vol
						pushstream volume '{"val":'$( $dirbash/cmd.sh volumeget )'}'
					fi
				done ) &> /dev/null &
			fi
			;;
		playlist )
			if [[ $( mpc | awk '/^volume:.*consume:/ {print $NF}' ) == on || $pldiff > 0 ]]; then
				( sleep 0.05 # consume mode: playlist+player at once - run player fisrt
					pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
				) &> /dev/null &
			fi
			;;
		player )
			if [[ ! -e $dirtmp/radio && ! -e $dirtmp/nostatus ]]; then
				killall cmd-pushstatus.sh &> /dev/null
				$dirbash/cmd-pushstatus.sh
			fi
			;;
		update )
			sleep 1
			if [[ -e $dirsystem/updating ]] && ! mpc | grep -q '^Updating'; then
				if [[ -e $dirtmp/updatingusb ]]; then
					rm $dirtmp/updatingusb
					echo USB > $dirsystem/updating
					mpc update USB
				else
					$dirbash/cmd-list.sh
				fi
			fi
			;;
	esac
done
