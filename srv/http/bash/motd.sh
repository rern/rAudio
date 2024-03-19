#!/bin/bash
clear
def='\e[0m'
bg='\e[30m\e[46m'
printf "$bg%*s$def\n" $COLUMNS
printf "$bg%-${COLUMNS}s$def\n" "   r A u d i o"
printf "$bg%*s$def\n\n" $COLUMNS
export PATH=/srv/http/bash:/srv/http/bash/settings:$PATH
. /srv/http/bash/common.sh
