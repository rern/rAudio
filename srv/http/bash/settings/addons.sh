#!/bin/bash

. /srv/http/bash/common.sh

if [[ $1 == kill ]]; then
	script=$( getContent $dirshm/script )
	[[ $script ]] && pkill $script && exit
# --------------------------------------------------------------------
fi

file_addons=$diraddons/addonslist.json
bar='<a class="cbm">  </a>'
info='<a class="cby ck"> i </a>'
warn='<a class="cbr cw"> ! </a>'

title() {
	echo "\
<hr>
$1
<hr>"
}
getinstallzip() {
	echo
	echo "$bar Install new files ..."
	read user repo < <( jq -r .$alias.installurl $file_addons | awk -F'/' '{print $4, $5}' )
	curl -sL https://github.com/$user/$repo/archive/$branch.tar.gz \
		| bsdtar xvf - --strip-components=1 -C / 2>&1 \
		| grep '/.*/'
	find / -maxdepth 1 -type f -delete
}
installstart() { # $1-'u'=update
	read alias label branch < <( echo $1 )
	title="<a class='cc'>$( jq -r .$alias.title $file_addons )</a>"
	[[ $label != Rank || $label != Import ]] && title "$bar $label $title ..." || title "$bar $title ..."
}
installfinish() {
	version=$( jq -r .$alias.version $file_addons )
	[[ $version != null ]] && echo $version > $diraddons/$alias
	echo "
$bar Done.
<hr>
"
}
uninstallstart() {
	title="<a class='cc'>$( jq -r .$alias.title $file_addons )</a>"
	file_uninst=/usr/local/bin/uninstall_$alias.sh
	if [[ ! -e $file_uninst ]]; then
	  echo $info $title not found.
	  rm $diraddons/$alias &> /dev/null
	  exit 1
# --------------------------------------------------------------------
	fi
	[[ $label != Update ]] && title "$bar Uninstall $title ..."
	. $file_uninst
	rm $file_uninst
}
uninstallfinish() {
	rm $diraddons/$alias &> /dev/null
	[[ $label != Update ]] && title "$bar Done."
}
