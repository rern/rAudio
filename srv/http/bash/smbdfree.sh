#!/bin/sh

# for /etc/samba/smb.conf
df | grep /mnt/MPD/USB | sort | head -1 | awk '{print $2" "$4}'
