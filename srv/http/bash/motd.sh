#!/bin/bash
clear
def='\e[0m'
bg='\e[30m\e[46m'
col=$( tput cols )
version=$( cat /srv/http/data/system/version )
printf "$bg%*s$def\n" $col
printf "$bg%-${col}s$def\n" "   r   A u d i o   ${version: -1}"
printf "$bg%*s$def\n\n" $col
