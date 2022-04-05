#!/bin/bash

. /srv/http/bash/common.sh

i=0
formatGet() {
	format=$( grep -r ^format: /proc/asound/card$card/pcm*p \
				| awk '{print $NF}' \
				| tr -d _ )
	if [[ ! $format ]]; then
		(( $i == 5 )) && return
		
		(( i++ ))
		sleep 1
		echo $i
		formatGet
	fi
}
volume() {
	card=$1
	control=$2
	target=$3
	if [[ $control ]]; then
		amixer -c $card -Mq sset "$control" $target%
	else
		mpc -q volume $target
	fi
}

ccv=$( $dirbash/cmd.sh volumecontrolget )
card=${ccv/^*}
control=$( echo $ccv | cut -d^ -f2 )
current=${ccv/*^}
volume $card "$control" 0 # mute
mpc -q play
formatGet
mpc -q stop
volume $card "$control" $current # restore
[[ ! $format ]] && exit

fileyml=$dirdata/camilladsp/configs/camilladsp.yml
linedevice=$( sed -n '/playback:/,/device:/=' $fileyml | tail -1 )
lineformat=$( sed -n '/playback:/,/format:/=' $fileyml | tail -1 )
sed -e "$linedevice s/\(device: \).*/\1hw:$card,0/
" -e "$lineformat s/\(format: \).*/\1$format/
" $fileyml
#systemctl restart camilladsp
