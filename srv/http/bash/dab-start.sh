#!/bin/bash

. /srv/http/bash/common.sh

device=$( dabDevice )
if [[ $device == 'No supported devices '* ]]; then
	notify dabradio 'DAB Radio' 'No supported devices.'
	exit
# --------------------------------------------------------------------
fi

mkdir -p $dirshm/dabradio
systemctl start dab

killsubs() {
	kill $DABPID
	kill $FFMPID
	rm $MYPIPE $dirshm/dabradio/DAB*
}
trap killsubs SIGINT

MYPIPE=$( mktemp -u )
mkfifo $MYPIPE

pidof -q dab-rtlsdr-3 && sleep 4 # if another radio is playing, give time to stop

channel_id=${2,,}_${1,,}
file=$( find $dirdabradio -name *"|$channel_id" ) # .../rtsp:||$host:8554|$channel_id
[[ $file ]] && head -1 "$file" > $dirshm/radio

dab-rtlsdr-3 \
	-S $1 \
	-C $2 \
	-i $dirshm/dabradio \
	> $MYPIPE &
DABPID=$!

ffmpeg \
	-re \
	-stream_loop -1 \
	-ac 2 \
	-ar 48000 \
	-f s16le \
	-i $MYPIPE \
	-vn \
	-b:a 160k \
	-c:a aac \
	-metadata title="DAB Radio" \
	-f rtsp rtsp://localhost:$3/$4 \
	&> /dev/null &
FFMPID=$!
for pid in $( pgrep $FFMPID ); do
	ionice -c 0 -n 0 -p $pid &> /dev/null 
	renice -n -19 -p $pid &> /dev/null
done

wait $FFMPID
