#!/usr/bin/env python

import asyncio
import subprocess
import websockets

async def cmd( websocket ):
    async for args in websocket:
        #arg0 = args.split( '\n' )[ 0 ]
        subprocess.call( [ '/srv/http/bash/cmd.sh', args ] )

async def main():
    async with websockets.serve( cmd, '0.0.0.0', 8080, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
