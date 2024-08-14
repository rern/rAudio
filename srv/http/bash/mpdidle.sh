#!/bin/bash

. /srv/http/bash/common.sh

mpc idleloop | while read changed; do
	case $changed in
		mixer ) # for upmpdcli
			playerActive upnp && volumeGet push
			;;
		playlist )
			[[ ! -e $dirshm/pushplaylist && $( mpc status %consume% ) == on ]] && $dirbash/cmd.sh playlistpush
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
