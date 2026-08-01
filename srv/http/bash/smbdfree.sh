#!/bin/sh

# for /etc/samba/smb.conf - dfree command

df | awk '/mnt.MPD.USB/ {print $2, $4}' | tail -1
