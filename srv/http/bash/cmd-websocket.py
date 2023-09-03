#!/usr/bin/env python

import asyncio
import subprocess
from websockets.server import serve

async def cmd( websocket ):
    async for args in websocket:
        #arg0 = args.split( '\n' )[ 0 ]
        subprocess.call( [ '/srv/http/bash/cmd.sh', args ] )

async def main():
    async with serve( cmd, '0.0.0.0', 8080 ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
