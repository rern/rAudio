#!/bin/bash

alias=r1

# 20220610
if [[ -e /usr/bin/camilladsp && ! -e /srv/http/settings/camillagui/build/colors.css ]]; then
	ln -sf /srv/http/assets/css/colors.css /srv/http/settings/camillagui/build
	ln -sf /srv/http/assets/img/icon.png /srv/http/settings/camillagui/build
fi

sed -i -e 's/\s*Flat/Flat/
' -e '/Flat^/ d
' /srv/http/data/system/equalizer.presets &> /dev/null

file=/srv/http/data/camilladsp/configs/default_config.yml
if grep -q 'format: *$' $file; then
	format=$( grep 'format: .\+$' /srv/http/data/camilladsp/configs/camilladsp.yml \
				| tail -1 \
				| awk '{print $NF}' )
	sed -i "s/format: *$/format: $format/" $file
fi

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

installfinish
