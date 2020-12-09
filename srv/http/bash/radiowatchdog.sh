#!/bin/bash

status0=$( mpc | grep -B1 '^[playing]' | tr -d '\n' )

while sleep 10; do
	status=$( mpc | grep -B1 '^[playing]' | tr -d '\n' )
	
	[[ -z "$status" ]] && exit # if not playing
	
	[[ "$status0" == "$status" ]] && mpc stop && mpc play
	
	status0="$status"
done
