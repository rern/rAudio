#!/bin/bash

while read vu; do
	curl -s -X POST http://127.0.0.1/pub?id=vumeter -d '{"val":'${vu:0:-1}'}'
done
