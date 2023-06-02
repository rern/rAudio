#!/bin/bash

# bash <( curl -skL https://github.com/rern/rOS/raw/main/wirelessregdom.sh )

codes=$( curl -skL https://git.kernel.org/pub/scm/linux/kernel/git/sforshee/wireless-regdb.git/plain/db.txt \
				| grep ^country \
				| cut -d' ' -f2 \
				| tr -d : )
iso3166=$( sed -E -n '/alpha_2_code=|\s+name=/ {s/^.*code=/,/; s/\s*name=/:/; s/ .>$//; p}' /usr/share/xml/iso-codes/iso_3166.xml )
list='"00"
:"00"'
for k in ${codes[@]}; do
	list+=$'\n'$( grep -A1 $k <<< "$iso3166" )
done
echo { $list } | jq > /srv/http/settings/regdomcodes.json

echo Updated: /srv/http/settings/regdomcodes.json
