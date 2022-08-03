#!/bin/bash

. /srv/http/bash/common.sh

#dabscan=$( dab-scanner-rtlsdr -C 5A )
dabscan=$( cat /root/dabscan )
services=$( echo "$dabscan" | grep '^Ensemble\|^audioservice' )
if ! grep -q ^audioservice <<< "$services"; then
	pushstreamNotify 'DAB Radio' 'No id_channels found.' dabradio
	rm $dirshm/updatingdab
	exit
fi

dirdabradio=$dirdata/dabradio
mv $dirdabradio/img $dirshm &> /dev/null
rm -rf $dirdabradio
mkdir -p $dirdabradio/img
mv $dirshm/img $dirdabradio &> /dev/null

host=$( hostname -f )
readarray -t services <<< "$services"
for service in "${services[@]}"; do
	if [[ ${service:0:8} == Ensemble ]]; then
		ensemble=$( echo ${service/;*} | cut -d' ' -f2- )
		mkdir "$dirdabradio/$ensemble"
		continue
	fi
	
	readarray -d ';' -t field <<< $service
	name=$( echo ${field[1]} )
	channel=$( echo ${field[2]} )
	id=$( echo ${field[3]} )
	channel_id=${channel,,}_${id,,}
	echo "\
$name
48 kHz 160 kbit/s
" > "$dirdabradio/$ensemble/rtsp:||$host|$channel_id"
	list+="\
  $channel_id:
    runOnDemand: /srv/http/bash/dab-start.sh $id $channel \$RTSP_PORT \$RTSP_PATH
    runOnDemandRestart: yes
    runOnDemandStartTimeout: 15s
    runOnDemandCloseAfter: 3s
"
done

fileyml=/etc/rtsp-simple-server.yml
linepaths=$( sed -n '/^paths:/ =' $fileyml )
sed -i "$(( linepaths + 1 )),$ d" $fileyml
echo "$list" >> $fileyml

chown -R http:http $dirdabradio
dabradio=$( find -L $dirdata/dabradio -type f ! -path '*/img/*' | wc -l )
sed -i 's/\("dabradio": \).*/\1'$dabradio',/' $dirmpd/counts
pushstream mpdupdate "$( cat $dirmpd/counts )"
rm $dirshm/updatingdab
