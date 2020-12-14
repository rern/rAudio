### Status

- on-board audio     - `grep -q dtparam=audio=on /boot/config.txt`
- on-board bluetooth - `grep -q dtparam=krnbt=on /boot/config.txt`
- [f]on-board wi-fi     - `lsmod | grep -q ^brcmfmac`
- **i2s audio**        - `cat /srv/http/data/system/audio-{aplayname,output}`
- lcdchar            - `grep -q dtparam=i2c_arm=on /boot/config.txt && ! grep -q dtoverlay=tft35a /boot/config.txt` - `/etc/lcdchar.conf`
- lcd                - `grep -q dtoverlay=tft35a /boot/config.txt`
- **relays**           - `[[ -e /srv/http/data/system/relays ]]`
- **hostname**         - `cat /srv/http/data/system/hostname`
- timezone           - `timedatectl | awk '/zone:/ {print $3}'`
- ntp                - `grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2`
- regdom             - `cat /etc/conf.d/wireless-regdom | cut -d'"' -f2`
- **soundprofile**     - `[[ -e $dirsystem/soundprofile ]]` - `/etc/soundprofile.conf`
