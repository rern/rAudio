#!/bin/bash

alias=r1

. /srv/http/bash/addons.sh

installstart "$1"

getinstallzip

installfinish
