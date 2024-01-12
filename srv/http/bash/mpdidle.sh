#!/bin/bash

. /srv/http/bash/common.sh

mpc idleloop | while read changed; do
	case $changed in
		mixer ) # for upmpdcli
			playerActive upnp && volumePushSet
			;;
		playlist )
			if [[ $( mpc status %consume% ) == on ]]; then
				( sleep 0.05 # consume mode: playlist+player at once - run player fisrt
					pushData playlist $( php /srv/http/mpdplaylist.php current )
				) &> /dev/null &
			fi
			;;
		player )
			if [[ ! -e $dirshm/radio && ! -e $dirshm/skip ]]; then
				$dirbash/status-push.sh & # need to run in background for snapcast ssh
			fi
			;;
		update )
			if [[ ! -e $dirshm/listing ]]; then
				seconds=$(( $( date +%s ) - $( < $dirsystem/updatetime ) ))
				echo mpd=$( date -d@$seconds -u +%H:%M:%S ) > $dirsystem/updatetime
				! mpc | grep -q -m1 '^Updating' && $dirbash/cmd-list.sh
			fi
			;;
	esac
done
