#!/bin/bash

/srv/http/bash/settings/camilla.py data

[[ $? == 1 ]] && echo notrunning
