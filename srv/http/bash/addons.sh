#!/bin/bash

# default variables and functions for addons install/uninstall scripts
tty -s && col=$( tput cols ) || col=80 # [[ -t 1 ]] not work
lcolor() {
	local color=6
	[[ $2 ]] && color=$2
	printf "\e[38;5;${color}m%*s\e[0m\n" $col | tr ' ' "$1"
}
tcolor() { 
	local color=6 back=0  # default
	[[ $2 ]] && color=$2
	[[ $3 ]] && back=$3
	echo -e "\e[38;5;${color}m\e[48;5;${back}m${1}\e[0m"
}
pad=( '' R G Y B M C )
for i in 1 2 3 4 5 6; do
	printf -v pad${pad[$i]} '%s' $( echo -e "\e[3${i}m\e[4${i}m.\e[0m" )
done
bar=$( tcolor ' . ' 6 6 )   # [   ]     (cyan on cyan)
info=$( tcolor ' i ' 0 3 )  # [ i ]     (black on yellow)
yn=$( tcolor ' ? ' 0 3 )  # [ i ]       (black on yellow)
warn=$( tcolor ' ! ' 7 1 )  # [ ! ]     (white on red)
diraddons=/srv/http/data/addons
addonsjson=$diraddons/addons-list.json

title() {
	local ctop=6
	local cbottom=6
	local ltop='-'
	local lbottom='-'
	local notop=0
	local nobottom=0
	
	while :; do
		case $1 in
			-c) ctop=$2
				cbottom=$2
				shift;; # 1st shift
			-ct) ctop=$2
				shift;;
			-cb) cbottom=$2
				shift;;
			-l) ltop=$2
				lbottom=$2
				shift;;
			-lt) ltop=$2
				shift;;
			-lb) lbottom=$2
				shift;;
			-nt) notop=1;;        # no 'shift' for option without value
			-nb) nobottom=1;;
			-h|-\?|--help) usage
				return 0;;
			-?*) echo "$info unknown option: $1"
				echo $( tcolor 'title -h' 3 ) for information
				echo
				return 0;;
			*) break
		esac
		# shift 1 out of argument array '$@'
		# 1.option + 1.value - shift twice
		# 1.option + 0.without value - shift once
		shift
	done
	
	echo
	[[ $notop == 0 ]] && echo $( lcolor $ltop $ctop )
	echo -e "${@}" # $@ > "${@}" - preserve spaces 
	[[ $nobottom == 0 ]] && echo $( lcolor $lbottom $cbottom )
}

wgetnc() {
	[[ -t 1 ]] && progress='--show-progress'
	wget -q --no-check-certificate $progress $@
}
getinstallzip() {
	installurl=$( jq -r .$alias.installurl $addonsjson )
	installzip=${installurl/raw\/main\/install.sh/archive\/$branch.zip}
	
	echo $bar Get files ...
	wgetnc $installzip
	echo
	echo $bar Install new files ...
	tmpdir=/tmp/install
	rm -rf $tmpdir
	mkdir -p $tmpdir
	bsdtar -tf $branch.zip | cut -d/ -f2- | grep / | grep -v '/$' | sed 's|^|/|' # list files
	bsdtar -xf $branch.zip --strip 1 -C $tmpdir
	rm $branch.zip $tmpdir/* &> /dev/null
	cp -rp $tmpdir/* /
	rm -r $tmpdir
	chown -R http:http /srv/http
	chown -R mpd:audio /srv/http/data/mpd
	chmod 755 /srv/http/* /srv/http/bash/* /srv/http/settings/* /usr/local/bin/* 2> /dev/null
	chmod 777 /srv/http/data/tmp
	
	[[ -e /srv/http/data/system/color ]] && /srv/http/bash/cmd.sh color
}
getuninstall() {
	installurl=$( jq -r .$alias.installurl $addonsjson )
	installurl=${installurl/raw\/main/raw\/$branch}
	uninstallurl=${installurl/install.sh/uninstall_$alias.sh}
	wgetnc $uninstallurl -P /usr/local/bin
	chmod 755 /usr/local/bin/uninstall_$alias.sh
}
installstart() { # $1-'u'=update
	rm $0
	
	readarray -t args <<< "$1" # lines to array: alias type branch opt1 opt2 ...

	alias=${args[0]}
	type=${args[1]}
	branch=${args[2]}
	args=( "${args[@]:3}" ) # 'opt' for script start at ${args[0]}
	
	name=$( tcolor "$( jq -r .$alias.title $addonsjson )" )
	
	if [[ -e /usr/local/bin/uninstall_$alias.sh ]]; then
	  title -l '=' "$info $title already installed."
	  if [[ ! -t 1 ]]; then
		  title -nt "Please try update instead."
		  echo 1 > $diraddons/$alias
	  fi
	  exit
	fi
	
	title -l '=' "$bar $type $name ..."
}
installfinish() {
	version=$( jq -r .$alias.version $addonsjson )
	[[ $version != null ]] && echo $version > $diraddons/$alias
	
	title -l '=' "$bar Done."
	
	$dirbash/cmd.sh mpcupdatecontinue
}
uninstallstart() {
	name=$( tcolor "$( jq -r .$alias.title $addonsjson )" )
	
	if [[ ! -e /usr/local/bin/uninstall_$alias.sh ]]; then
	  echo $info $name not found.
	  rm $diraddons/$alias &> /dev/null
	  exit 1
	fi
	
	rm $0
	[[ $type != Update ]] && title -l '=' "$bar Uninstall $name ..."
}
uninstallfinish() {
	rm $diraddons/$alias &> /dev/null
	[[ $type != Update ]] && title -l '=' "$bar Done."
}
