#!/bin/bash

. /srv/http/bash/common.sh

mpc idleloop | while read changed; do
	case $changed in
		mixer ) # for upmpdcli
			playerActive upnp && volumeGet push
			;;
		playlist )
			if [[ $( mpc status %consume% ) == on ]]; then
				( sleep 0.05 # consume mode: playlist+player at once - run player fisrt
					pushData playlist '{ "refresh": true }'
				) &> /dev/null &
			fi
			;;
		player )
			if [[ ! -e $dirshm/radio && ! -e $dirshm/skip && ! -e $dirshm/cdstart ]]; then
				$dirbash/status-push.sh & # need to run in background for snapcast ssh
			fi
			;;
		update )
			if [[ ! -e $dirshm/listing ]]; then
				! mpc | grep -q -m1 '^Updating' && $dirbash/cmd-list.sh
			fi
			;;
	esac
done
