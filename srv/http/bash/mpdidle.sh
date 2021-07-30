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
		player )
			[[ ! -e $dirtmp/radio ]] && $dirbash/cmd-pushstatus.sh
			;;
		playlist )
			if [[ $( mpc current -f %file% | cut -c1-4 ) == http ]]; then
				pllength0=$( cat $dirtmp/playlistlength 2> /dev/null || echo 0 )
				pllength=$( mpc playlist | wc -l )
				pldiff=$(( $pllength - $pllength0 ))
				(( $pldiff > 0 )) && echo $pllength > $dirtmp/playlistlength || continue
			fi
			if [[ $( mpc | awk '/^volume:.*consume:/ {print $NF}' ) == on || $pldiff > 0 ]]; then
				( sleep 0.05 # consume mode: playlist+player at once - run player fisrt
					pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
				) &> /dev/null &
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
