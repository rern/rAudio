Settings - status and value
---

### Features
- shairport-sync `systemctl -q is-active shairport-sync`
- snapclient `systemctl -q is-active snampclient`
	- `/etc/default/snapclient`
	- `/srv/http/data/system/snapclientpw`
- localbrowser `systemctl -q is-active localbrowser`
	- `/etc/localbrowser.conf`
- smb `systemctl -q is-active smb`
	- `/etc/samba/smb.conf`
- mpdscribble `systemctl -q is-active smb`
	- `/etc/mpdscribble.conf`
- login **`F`** `[[ -e /srv/http/data/system/login ]]`
	- `/srv/http/data/system/loginpw`
- autoplay **`F`** `[[ -e /srv/http/data/system/startup ]]`
- hostapd `systemctl -q is-active hostapd`
	- `/etc/hostapd/hostapd.conf`

### MPD
- outputdevice `cat /srv/http/data/system/audio-{aplayname,output}`
	- `/srv/http/bash/mpd-devices.sh`
- mixerdevice `devices[N].mixertype` or **`F`** `[[ -e /srv/http/data/system/mixerdevice-$aplayname ]]`
	- `/srv/http/bash/mpd-devices.sh`
- mixertype `devices[N].mixertype` or **`F`** `[[ -e /srv/http/data/system/mixertype-$aplayname ]]`
	- `/srv/http/bash/mpd-devices.sh`
- dop **`F`** `[[ -e /srv/http/data/system/dop-$aplayname ]]`
	- `devices[N].dop`
- crossfade `mpc crossfade | cut -d' ' -f2` and **`F`** `[[ -e /srv/http/data/system/crossfade ]]` - `datarestore`
	- `/srv/http/data/system/crossfadeset`
- normalization `grep -q 'volume_normalization.*yes' /etc/mpd.conf`
	- `/srv/http/data/system/normalizationset`
- replaygain `grep -q '^replaygain.*off' /etc/mpd.conf`
	- `/srv/http/data/system/replaygainset`
- autoupdate `grep -q '^auto_update.*yes' /etc/mpd.conf`
- ffmpeg `grep -A1 'plugin.*ffmpeg' /etc/mpd.conf | grep -q yes`
- buffer `grep -q '^audio_buffer_size' /etc/mpd.conf`
	- `/srv/http/data/system/bufferset`
- bufferoutput `grep -q '^max_output_buffer_size' /etc/mpd.conf`
	- `/srv/http/data/system/bufferoutputset`
- soxr **`F`** `[[ -e /srv/http/data/system/soxr ]]`
	- `/srv/http/data/system/soxrset`
- custom **`F`** `[[ -e /srv/http/data/system/custom ]]`
	- `/srv/http/data/system/custom-{global,output}`

### System
- bluetooth `rfkill | bluetooth`
- wlan `rfkill wlan`
- i2s audio `cat /srv/http/data/system/audio-{aplayname,output}`
- lcdchar **`F`** `[[ -e /srv/http/data/system/lcdchar ]]`
	- `/etc/lcdchar.conf`
- lcd `grep -q dtoverlay=tft35a /boot/config.txt`
- relays **`F`** `[[ -e /srv/http/data/system/relays ]]`
	- `/etc/relays.conf`
- hostname
	- `hostname`
- timezone
	- `timedatectl | awk '/zone:/ {print $3}'`
- ntp
	- `grep '^NTP' /etc/systemd/timesyncd.conf | cut -d= -f2`
- regdom
	- `cat /etc/conf.d/wireless-regdom | cut -d'"' -f2`
- soundprofile **`F`** `[[ -e /srv/http/data/system/soundprofile ]]`
	- `/etc/soundprofile.conf`
