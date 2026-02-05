#!/bin/sh

# for /etc/samba/smb.conf
df "$1" | tail -1 | awk '{print $(NF-4),$(NF-2)}'
