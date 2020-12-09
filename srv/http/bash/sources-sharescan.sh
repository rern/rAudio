#!/bin/bash

lines=$( nmblookup -S WORKGROUP \
	| grep -A1 '^Looking' \
	| sed 's/^Look.* /ip:/; s/^\s\+/ho:/; s/ \+<.*$//' \
	| sed '/^--/ d' )
readarray -t lines <<<"$lines"
for line in "${lines[@]}"; do
	key=${line:0:3}
	if [[ $key == ip: ]]; then
		ip=${line:3}
	else
		if [[ $key == ho: ]]; then
			host=${line:3}
			shares=$( echo '' | smbclient -L "$host" | grep '^\s\+.*Disk' | grep -v '\$' | awk '{print $1}' )
			if [[ -n $shares ]]; then
				readarray -t shares <<<"$shares"
				for share in "${shares[@]}"; do
					list+='\n{"host":"'${host//\"/\\\"}'","ip":"'$ip'","share":"'${share//\"/\\\"}'"}'
				done
			fi
		fi
		ip=
		host=
	fi
done

list=$( echo -e "$list"| awk NF | sort | tr '\n' ',' )
list=${list:0:-1} # remove last ,

echo "[$list]" # 'sort' already convert to array
