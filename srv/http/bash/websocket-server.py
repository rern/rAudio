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
        if path != '/': # wscmd - CMD\nARG\n...
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
        elif args[ 0 ] == '{': # ws - { "K": "V", ... }
            args = json.loads( args )
            if 'json' in args:
                argjson = json.dumps( args[ 'json' ] )
                argname = args[ 'name' ]
                data = '{ "channel": "'+ argname +'", "data": '+ argjson +' }'
                websockets.broadcast( CLIENTS, data )
                with open( '/srv/http/data/system/'+ argname +'.json', 'w' ) as f:
                    json.dump( args[ 'json' ], f, indent=2 )
            else:
                os.system( dirbash + args[ 'bash' ] )
        else: # ws - ARG
            if args == 'clientadd':
                if websocket not in CLIENTS:
                    CLIENTS.add( websocket )
            elif args ==  'clientremove':
                if websocket in CLIENTS:
                    CLIENTS.remove( websocket )
            else:
                websockets.broadcast( CLIENTS, args )

async def main():
    async with websockets.serve( cmd, '0.0.0.0', 8080, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
