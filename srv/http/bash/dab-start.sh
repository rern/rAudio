#!/bin/bash

. /srv/http/bash/common.sh

device=$( tty2std 'timeout 0.1 rtl_test -t' )
if [[ $device == 'No supported devices '* ]]; then
	notify dabradio 'DAB Radio' 'No supported devices.'
	exit
# --------------------------------------------------------------------
fi

systemctl start dab

killsubs() {
	kill $DABPID
	kill $FFMPID
	rm $MYPIPE $dirshm/webradio/DAB*
}
trap killsubs SIGINT

MYPIPE=$( mktemp -u )
mkfifo $MYPIPE

pidof -q dab-rtlsdr-3 && sleep 4 # if another radio is playing, give time to stop

dab-rtlsdr-3 \
	-S $1 \
	-C $2 \
	-i $dirshm/webradio \
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
