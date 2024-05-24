#!/usr/bin/env python

import asyncio
import json
import os
import subprocess
import websockets

CLIENTS     = set()
dirbash     = '/srv/http/bash/'

async def cmd( websocket, path ):
    async for args in websocket:
        if path != '/':
            file      = path[ 1: ]
            pathfile  = dirbash
            if file != 'cmd':
                pathfile += 'settings/'
            pathfile += file +'.sh'
            subprocess.Popen( [ pathfile, args ] )
            args = args.split( '\n' )
            if args[ 0 ] == 'volume':
                type = args[ -2 ]
                if type:
                    val = type == 'mute' and args[ 1 ] or args[ 2 ]
                    data = '{ "channel": "volume", "data": { "type": "'+ type +'", "val": '+ val +' } }'
                    websockets.broadcast( CLIENTS, data )
        elif args[ 0 ] == '^': # json, power
            args  = args[ 2: ]
            if args[ 0:4 ] == 'json':
                args  = args.split( '^^' )
                args1 = args[ 1 ]
                args2 = args[ 2 ]
                data = '{ "channel": "'+ args2 +'", "data": '+ args[ 3 ] +' }'
                websockets.broadcast( CLIENTS, data )
                with open( '/srv/http/data/system/'+ args2 +'.json', 'w' ) as f:
                    json.dump( json.loads( data ), f, indent=2 )
            else:
                os.system( dirbash + args )
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
