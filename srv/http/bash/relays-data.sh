#!/bin/bash

if [[ -e /etc/relays.conf ]]; then
	cat /etc/relays.conf | sed '1 a\"page":"relays",'
	exit
fi

echo '
{
	  "page" : "relays"
	, "name" : {
		  "11" : "DAC"
		, "13" : "PreAmp"
		, "15" : "Amp"
		, "16" : "Subwoofer"
	}
	, "on"   : {
		  "on1"  : 11
		, "ond1" : 2
		, "on2"  : 13
		, "ond2" : 2
		, "on3"  : 15
		, "ond3" : 2
		, "on4"  : 16
	}
	, "off"  : {
		  "off1"  : 16
		, "offd1" : 2
		, "off2"  : 15
		, "offd2" : 2
		, "off3"  : 13
		, "offd3" : 2
		, "off4"  : 11
	}
	, "timer" : 5
}'
