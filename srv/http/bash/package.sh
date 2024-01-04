#!/bin/bash

urlio=https://github.com/rern/rern.github.io/raw/main
if [[ -e /boot/kernel.img ]]; then
	rpi01=1
	list=(
1  Build
2 'Update firmware' )
else
	list=(
1  Build
2 'Update repo'
3 'AUR setup'
4 'Create regdomcodes.json'
5 'Create guide.tar.xz' )
fi
file=$( dialog --colors --no-shadow --no-collapse --output-fd 1 --nocancel --menu "
Package:
" 8 0 0 "${list[@]}" )
if [[ $rpi01 && $file == 2 ]]; then
	sed -i '1 i\Server = http://mirror.archlinuxarm.org/armv7h/$repo' /etc/pacman.d/mirrorlist
	pacman -Sy --noconfirm --needed firmware-raspberrypi linux-firmware linux-firmware-whence raspberrypi-bootloader
	sed -i '/armv7h/ d' /etc/pacman.d/mirrorlist
	exit
fi

case $file in
	1 ) file=pkgbuild;;
	2 ) file=repoupdate;;
	3 ) file=aursetup;;
	4 ) bash <( curl -L $urlio/wirelessregdom.sh ); exit;;
	5 )	bsdtar cjvf guide.tar.xz -C /srv/http/assets/img/guide .; exit;;
esac
bash <( curl -L $urlio/$file.sh )
