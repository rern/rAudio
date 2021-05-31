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
flag=$dirtmp/flag
flagpl=$dirtmp/flagpl
flagpladd=$dirtmp/flagpladd

mpc idleloop | while read changed; do
	case $changed in
		player )
			currentprev=$current
			current=$( mpc current )
			if [[ -n $current && $current != $currentprev ]]; then
				killall status.sh &> /dev/null                # mutiple firing - kill previous
				killall status-coverartonline.sh &> /dev/null # kill if still running
				$dirbash/cmd.sh pushstatus                    # status
				if [[ -e $dirsystem/librandom ]]; then
					touch $flagpl # suppress playlist broadcast
					$dirbash/cmd-librandom.sh
					sleep 1
					rm -f $flagpl
				fi
				if [[ -e $dirtmp/snapclientip ]]; then
					status=$( $dirbash/status.sh snapserverstatus | sed 's/,.*"single" : false , //' )
					readarray -t clientip < $dirtmp/snapclientip
					for ip in "${clientip[@]}"; do
						[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
					done
				fi
			fi
			;;
		playlist ) # consume mode: playlist+player at once - run player fisrt
			if [[ $( mpc current -f %file% | cut -c1-4 ) == http ]]; then
				pllength0=$( cat $dirtmp/playlistlength 2> /dev/null || echo 0 )
				pllength=$( mpc playlist | wc -l )
				pldiff=$(( $pllength - $pllength0 ))
				(( $pldiff > 0 )) && echo $pllength > $dirtmp/playlistlength || continue
			fi
			if [[ $( mpc | awk '/^volume:.*consume:/ {print $NF}' ) == on && ! -e $flagpladd ]] || (( $pldiff > 0 )); then
				( sleep 0.05
					if [[ -e $flag ]]; then
						touch $flagpl
					else
						rm -f $flagpl
						pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
					fi
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
