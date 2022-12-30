#!/bin/bash
clear
def='\e[0m'
bg='\e[30m\e[46m'
col=$( tput cols )
printf "$bg%*s$def\n" $col
printf "$bg%-${col}s$def\n" "   r   A u d i o"
printf "$bg%*s$def\n\n" $col
