#!/bin/bash

# bash <( curl -skL https://github.com/rern/rOS/raw/main/wirelessregdom.sh )

codes=$( curl -skL https://git.kernel.org/pub/scm/linux/kernel/git/sforshee/wireless-regdb.git/plain/db.txt \
			| grep ^country \
			| cut -d' ' -f2 \
			| tr -d : )
iso3166=$( curl -skL https://gist.github.com/ssskip/5a94bfcd2835bf1dea52/raw/3b2e5355eb49336f0c6bc0060c05d927c2d1e004/ISO3166-1.alpha2.json )

for k in ${codes[@]}; do
	list+=$'\n'$( grep $k <<< "$iso3166" )
done

echo { '"00": "00 - Allowed worldwide"', $( echo "$list" | sort -k2 ) } | jq . > /srv/http/settings/regdomcodes.json

