#!/bin/bash

# symlink: /etc/profile.d/motd.sh

clear
bg='\e[30m\e[46m'
printf "$bg%*s\n" $COLUMNS
printf "$bg%-${COLUMNS}s\n" "   r A u d i o"
printf "$bg%*s\e[0m\n\n" $COLUMNS
export PATH=/srv/http/bash:/srv/http/bash/settings:$PATH
. /srv/http/bash/common.sh
