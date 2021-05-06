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
			if [[ ! -e $flag ]]; then # track change only
				touch $flag
				currentprev=$current
				current=$( mpc current )
				if [[ -z $current || $current != $currentprev ]]; then
					killall status-coverartonline.sh &> /dev/null # kill if still running
					$dirbash/cmd.sh pushstatus                    # status
					if [[ -e $dirsystem/librandom ]]; then
						counts=$( mpc | awk '/\[playing\]/ {print $2}' | tr -d '#' )
						pos=${counts/\/*}
						total=${counts/*\/}
						left=$(( total - pos ))
						if (( $left < 2 )); then
							$dirbash/cmd.sh randomfile
							(( $left == 0 )) && $dirbash/cmd.sh randomfile
							touch $flagpl
						fi
					fi
					if [[ -e $dirtmp/snapclientip ]]; then
						status=$( $dirbash/status.sh snapserverstatus | sed 's/,.*"single" : false , //' )
						readarray -t clientip < $dirtmp/snapclientip
						for ip in "${clientip[@]}"; do
							[[ -n $ip ]] && curl -s -X POST http://$ip/pub?id=mpdplayer -d "$status"
						done
					fi
					[[ -e $flagpl ]] && pushstream playlist "$( php /srv/http/mpdplaylist.php current )"
				fi
				rm -f $flag $flagpl
			fi
			;;
		playlist ) # consume mode: playlist+player at once - run player fisrt
			if [[ $( mpc current -f %file% | cut -c1-4 ) == http ]]; then
				pllength=$( mpc playlist | wc -l )
				pldiff=$(( $pllength - $( cat $dirtmp/playlistlength ) ))
				if (( $pldiff > 0 )); then
					echo $pllength > $dirtmp/playlistlength
				else
					continue
				fi
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
