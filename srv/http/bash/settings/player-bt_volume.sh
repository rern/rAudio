#!/bin/bash

### included by <<< player-conf.sh
[[ ! $dirbash ]] && . /srv/http/bash/common.sh # if run directly

mac=$( dbuspath_mac mac )
if [[ -e $dirsystem/$mac ]]; then # saved from volumeMpdRestore()
	db_saved=$( < $dirsystem/$mac )
	percent=$( awk -v db_saved=$db_saved '
					BEGIN {
						s = int( 127 * 2^( db_saved / 1000 ) + 0.5 )
						if ( s > 127 ) s = 127
						if ( s < 0 )   s = 0
					}
					s >= $1 && s <= $2 {
						db = ( $2 == $1 ) ? $3 : $3 + int( ( $4 - $3 ) * ( s - $1 ) / ( $2 - $1 ) )
						min = -9600; max = 0
						if ( db <= min ) { print   0; exit }
						
						if ( db >= max ) { print 100; exit }
						
						if ( max - min <= 2400 ) {
							norm = ( db - min ) / ( max - min )
						} else {
							nmin =   10 ^ ( ( min - max ) / 6000 )
							norm = ( 10 ^ ( (  db - max ) / 6000 ) - nmin ) / ( 1 - nmin )
						}
						printf "%d\n", norm * 100 + 0.5
						exit
					}
				' <<< '0   1 -9600 -6988
					   2   3 -5988 -5403
					   4   5 -4988 -4666
					   6   8 -4399 -3984
					   9  13 -3806 -3277
					  14  21 -3163 -2580
					  22  35 -2504 -1837
					  36  59 -1788 -1081
					  60 100 -1048  -317
					 101 127  -324     0' )
elif [[ -e $dirshm/volume ]]; then
	percent=$( < $dirshm/volume )
	rm -f $dirshm/volume
elif [[ -e $dirsystem/volumelimit ]]; then
	percent=$( getVar startup $dirsystem/volumelimit.conf )
else
	percent=$( volume.value )
	(( $percent > 30 )) && percent=30
fi
systemctl stop bluez-volume
amixer -MqD bluealsa sset "$( bluetoothControl )" $percent%
pushData volume $percent refresh
systemctl start bluez-volume
