#!/bin/bash

alias=rre6

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

installfinish
