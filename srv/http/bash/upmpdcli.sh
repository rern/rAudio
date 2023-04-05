#!/bin/bash

# upmpdcli run onstart as user "upmpdcli" - needs sudo
echo upnp > $dirshm/player
/usr/bin/sudo /srv/http/bash/cmd.sh playerstart
