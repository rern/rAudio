#!/bin/bash

# symlink: /etc/profile.d/motd.sh

clear
printf "\e[30m\e[46m%*s\n" $COLUMNS
printf "%-${COLUMNS}s\n" "   r A u d i o"
printf "%*s\e[0m\n\n" $COLUMNS
export PATH=/srv/http/bash:/srv/http/bash/settings:$PATH
. /srv/http/bash/common.sh
