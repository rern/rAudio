#!/bin/bash

exec unshare --mount --propagation private bash -c "
  mkdir -p /tmp/mergedlib
  mount -t overlay overlay -o lowerdir=/opt/armv6-new/lib:/usr/lib,ro /tmp/mergedlib
  mount --bind /tmp/mergedlib /usr/lib
  exec /srv/http/bash/_status $@
"
