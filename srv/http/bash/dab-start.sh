#!/bin/bash

killsubs() {
	kill $DABPID
	kill $FFMPID
	rm $MYPIPE
	echo NO INFO > /srv/http/data/shm/webradio/DABlabel.txt
}
trap killsubs SIGINT

MYPIPE=$( mktemp -u )
mkfifo $MYPIPE

pidof -q dab-rtlsdr-3 && sleep 4 # if another radio is playing, give time to stop

dab-rtlsdr-3 \
	-S $1 \
	-C $2 \
	-i /srv/http/data/shm/webradio \
	> $MYPIPE &
DABPID=$!

ffmpeg \
	-ac 2 \
	-ar 48000 \
	-b:a 160k \
	-c:a aac \
	-f s16le \
	-f rtsp rtsp://localhost:$3/$4 \
	-i $MYPIPE \
	-metadata title="DAB Radio" \
	-readrate 1 \
	-stream_loop -1 \
	-vn \
	&> /dev/null &
FFMPID=$!

wait $FFMPID
