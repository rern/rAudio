#!/bin/bash

# bash <( curl -skL https://github.com/rern/rOS/raw/main/wirelessregdom.sh )

codes=$( curl -skL https://git.kernel.org/pub/scm/linux/kernel/git/sforshee/wireless-regdb.git/plain/db.txt \
				| grep ^country \
				| cut -d' ' -f2 \
				| tr -d : \
				| xargs \
				| tr ' ' '|')
iso3166=$( sed -E -n '/alpha_2_code=|\s+name=/ {s/^.*name=/:/; s/^.*code=/, /; s/ .>$//; p}' /usr/share/xml/iso-codes/iso_3166.xml )
list=$( echo '{ "00": "00"'$iso3166' }' \
			| jq \
			| grep -E "$codes" \
			| sed -E 's/\s*"(.*)": "(.*)",*/"\2": "\1",/' \
			| sort )
echo "{
${list:0:-1}
}" > /srv/http/assets/data/regdomcodes.json

echo Updated: /srv/http/assets/data/regdomcodes.json
