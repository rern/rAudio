#!/bin/bash

if [[ -e /srv/http/data/system/relayspin ]]; then
	. /srv/http/data/system/relayspin
	data='
  "page"  : "relays"
, "name"  : '$name'
, "on"    : ['$( echo ${on[@]} | tr ' ' , )']
, "ond"   : ['$( echo ${ond[@]} | tr ' ' , )']
, "off"   : ['$( echo ${off[@]} | tr ' ' , )']
, "offd"  : ['$( echo ${offd[@]} | tr ' ' , )']
, "timer" : '$timer
else
	data='
  "page" : "relays"
, "name" : {
	  "11" : "DAC"
	, "13" : "PreAmp"
	, "15" : "Amp"
	, "16" : "Subwoofer"
}
, "on"   : [ 11, 13, 15, 16 ]
, "off"  : [ 16, 15, 13, 11 ]
, "ond"  : [ 2, 2, 2 ]
, "offd" : [ 2, 2, 2 ]
, "timer" : 5'
fi

echo "{$data}"
