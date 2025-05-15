#!/bin/bash

# symlink: /etc/profile.d/motd.sh

hsl_rgb() {
	local b c c0 g h l m r s x x0
	h=$1
	s=$( awk 'BEGIN { printf "%.2f", '$2' / 100 }' )
	l=$( awk 'BEGIN { printf "%.2f", '$3' / 100 }' )
	
	c0=$( awk 'BEGIN { printf "%.2f", 2 * '$l' - 1 }' )
	c=$( awk 'BEGIN { printf "%.2f", ( 1 - '${c0/-}' ) * '$s'  }' )
	x0=$( awk 'BEGIN { printf "%.2f", ( '$h' / 60 ) % 2 - 1 }' )
	x0=$( awk 'BEGIN { printf "%.2f", '$c' * ( 1 - '${x0/-}' ) }' )
	m=$( awk 'BEGIN { printf "%.2f", '$l' - '$c' / 2 }' )
	
	if (( $h < 60 )); then
		r=$c; g=$x; b=0
	elif (( $h < 120 )); then
		r=$x; g=$c; b=0
	elif (( $h < 180 )); then
		r=0; g=$c; b=$x
	elif (( $h < 240 )); then
		r=0; g=$x; b=$c
	elif (( $h < 300 )); then
		r=$x; g=0; b=$c
	else
		r=$c; g=0; b=$x
	fi
	
	r=$( awk 'BEGIN { printf "%.0f", ( '$r' + '$m' ) * 255 }' )
	g=$( awk 'BEGIN { printf "%.0f", ( '$g' + '$m' ) * 255 }' )
	b=$( awk 'BEGIN { printf "%.0f", ( '$b' + '$m' ) * 255 }' )
	echo $r $g $b
}

declare -A xterm_palette
xterm_palette=(      # 0 - 15
	 [0]="0 0 0"       [1]="128 0 0"    [2]="0 128 0"    [3]="128 128 0"
	 [4]="0 0 128"     [5]="128 0 128"  [6]="0 128 128"  [7]="192 192 192"
	 [8]="128 128 128" [9]="255 0 0"   [10]="0 255 0"   [11]="255 255 0"
	[12]="0 0 255"    [13]="255 0 255" [14]="0 255 255" [15]="255 255 255"
)
for r in {0..5}; do  # 16–- 231
	for g in {0..5}; do
		for b in {0..5}; do
			idx=$(( 16 + r * 36 + g * 6 + b ))
			xterm_palette[$idx]="$(( r * 51 )) $(( g * 51 )) $(( b * 51 ))"
		done
	done
done
for i in {0..23}; do # 232 -–255
	idx=$(( 232 + i ))
	shade=$(( 8 + i * 10 ))
	xterm_palette[$idx]="$shade $shade $shade"
done

rgb_xterm() {
	local b dist g min_dist r B G R xterm
	R=$1
	G=$2
	B=$3
	xterm=0
	min_dist=1000000
	for i in "${!xterm_palette[@]}"; do
		read r g b <<< "${xterm_palette[$i]}"
		dist=$(( ( R - r ) ** 2 + ( G - g ) ** 2 + ( B - b ) ** 2 ))
		if (( dist < min_dist )); then
			min_dist=$dist
			xterm=$i
		fi
	done
	echo $xterm
}

clear
hsl=$( sed -n -E '/^\t*--h |^\t*--s |^\t*--ml35/ {s/.* |[^0-9]//g; p}' /srv/http/assets/css/colors.css )
xterm=$( rgb_xterm $( hsl_rgb $hsl ) | tee /dev/shm/xterm )
bg='\e[38;5;0m\e[48;5;'$xterm'm'
printf "$bg%*s\n" $COLUMNS
printf "$bg%-${COLUMNS}s\n" "   r A u d i o"
printf "$bg%*s\e[0m\n\n" $COLUMNS
export PATH=/srv/http/bash:/srv/http/bash/settings:$PATH
. /srv/http/bash/common.sh
