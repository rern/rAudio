#!/bin/bash

	if [[ $ON ]]; then
		if ! grep -q tty3 /boot/cmdline.txt; then
			sed -i -E 's/tty1.*/tty3 quiet loglevel=0 logo.nologo vt.global_cursor_default=0/' /boot/cmdline.txt
			systemctl disable --now getty@tty1
		fi
		! systemctl -q is-active localbrowser && restart=1
		. /tmp/localbrowser.conf
		if [[ $ROTATE != $rotate ]]; then
			restart=1
			file_config=/boot/config.txt
			if grep -E -q 'waveshare|tft35a' $file_config; then # tft
				sed -i -E '/waveshare|tft35a/ s/(rotate=).*/\1'$ROTATE'/' $file_config
				cp -f /etc/X11/{lcd$ROTATE,xorg.conf.d/99-calibration.conf}
				appendSortUnique $dirshm/reboot ', "localbrowser": "Browser"'
				notify localbrowser Browser 'Reboot required.' 5000
				exit
# --------------------------------------------------------------------
			elif grep -q ili9881-5inch $file_config; then
				ROTATE=$(( ROTATE + 180 ))
				$(( $ROTATE >= 360 )) && ROTATE=$(( ROTATE - 360 ))
				sed -i -E "s/(rotate=).*/\1$ROTATE/" $file_cmdline
			else # hdmi
				case $ROTATE in
					0 )   rotate=NORMAL;;
					270 ) rotate=CCW && matrix='0 1 0 -1 0 1 0 0 1';;
					90 )  rotate=CW  && matrix='0 -1 1 1 0 0 0 0 1';;
					180 ) rotate=UD  && matrix='-1 0 1 0 -1 1 0 0 1';;
				esac
				rotateconf=/etc/X11/xorg.conf.d/99-raspi-rotate.conf
				if [[ $ROTATE == 0 ]]; then
					rm -f $rotateconf
				else
					sed "s/ROTATION_SETTING/$rotate/
						 s/MATRIX_SETTING/$matrix/" /etc/X11/xinit/rotateconf > $rotateconf
				fi
				splashRotate
			fi
		fi
		if [[ $ZOOM != $zoom ]]; then
			restart=1
			scale=$( awk 'BEGIN { printf "%.2f", '$ZOOM/100' }' )
			sed -i -E 's/(devPixelsPerPx": ").*(",*)/\1'$scale'\2/' /lib/firefox/distribution/policies.json
		fi
		if [[ $SCREENOFF != $screenoff ]]; then
			[[ $SCREENOFF == 0 ]] && tf=false || tf=true
			pushSubmenu screenoff $tf
		fi
		[[ $CURSOR != $cursor ]] && restart=1
		if [[ $restart ]]; then
			systemctl restart bootsplash localbrowser &> /dev/null
			systemctl enable bootsplash localbrowser
			sleep 1
		fi
	else
		localBrowserOff
	fi
	rm -f /tmp/localbrowser.conf
	pushRefresh
