#!/usr/bin/env python

import asyncio
import subprocess
import websockets

CLIENTS = set()

async def cmd( websocket, path ):
    async for args in websocket:
        if path == '/cmdsh':
            subprocess.call( [ '/srv/http/bash/cmd.sh', args ] )
        elif args == 'clientadd':
            if websocket not in CLIENTS:
                CLIENTS.add( websocket )
        elif args == 'clientremove':
            if websocket in CLIENTS:
                CLIENTS.remove( websocket )
        else:
            websockets.broadcast( CLIENTS, args )

async def main():
    async with websockets.serve( cmd, '0.0.0.0', 8080, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
