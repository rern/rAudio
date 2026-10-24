#!/bin/sh

# for /etc/samba/smb.conf - dfree command

df | awk '/mnt.MPD/ {print $2, $4; exit}'
