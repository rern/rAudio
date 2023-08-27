#!/usr/bin/env python

import asyncio
import json
import subprocess
from websockets.server import serve

async def cmd( websocket ):
    async for data in websocket:
        data = json.loads( data )
        if data[ 'cmd' ] == 'volume':
            val = list( map( str, data[ 'values' ] ) )
            cmd = [ '/srv/http/bash/cmd.sh', 'volume' ] + val
        subprocess.call( cmd )

async def main():
    async with serve( cmd, '0.0.0.0', 8080 ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
