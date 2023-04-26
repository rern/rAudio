#!/bin/bash

. /srv/http/bash/common.sh

mpc idleloop | while read changed; do
	case $changed in
		mixer ) # for upmpdcli
			if [[ $( < $dirshm/player ) == upnp ]]; then
				volumePushReset
				volumePushSet
			fi
			;;
		playlist )
			if [[ $( mpc status %consume% ) == on ]]; then
				( sleep 0.05 # consume mode: playlist+player at once - run player fisrt
					pushstream playlist $( php /srv/http/mpdplaylist.php current )
				) &> /dev/null &
			fi
			;;
		player )
			if [[ ! -e $dirshm/radio && ! -e $dirshm/prevnextseek ]]; then
				killProcess push
				$dirbash/status-push.sh & # need to run in background for snapcast ssh
			fi
			;;
		update )
			sleep 1
			! mpc | grep -q -m1 '^Updating' && $dirbash/cmd-list.sh
			;;
	esac
done
