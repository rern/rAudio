#!/usr/bin/env python

import asyncio
import json
import os
import subprocess
import websockets

CLIENTS   = set()

async def cmd( websocket, path ):
    async for args in websocket: # param: string
#        with open( '/dev/shm/args', 'w' ) as f: f.write( args )
        param = json.loads( args ) # param: string > list
        if 'channel' in param:
            websockets.broadcast( CLIENTS, args )
        elif 'bash' in param:   # { "bash": "FILE.sh a b c ..." }
            os.system( param[ 'bash' ] )
        elif 'filesh' in param: # { "filesh": [ "FILE.sh", "a\nb\nc..." ] }
            subprocess.Popen( param[ 'filesh' ] )
        elif 'json' in param:
            argjson  = json.dumps( param[ 'json' ] ) # json: list > string
            argname  = param[ 'name' ]
            data     = '{ "channel": "'+ argname +'", "data": '+ argjson +' }'
            websockets.broadcast( CLIENTS, data )
            pathfile = '/srv/http/data/system/'+ argname
            with open( pathfile +'.json', 'w' ) as f:
                json.dump( param[ 'json' ], f, indent=2 )
        elif 'status' in param: # full / snapclient
            status = subprocess.getoutput( [ '/srv/http/bash/status.sh '+ param[ 'status' ] ] ).replace( '\n', '' )
            await websocket.send( status )
        elif 'client' in param:
            if param[ 'client' ] == 'add':
                if websocket not in CLIENTS:
                    CLIENTS.add( websocket )
            else:
                if websocket in CLIENTS:
                    CLIENTS.remove( websocket )

async def main():
    async with websockets.serve( cmd, '0.0.0.0', 8080, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
