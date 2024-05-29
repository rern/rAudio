#!/usr/bin/env python

import asyncio
import json
from subprocess import Popen, run
import websockets

CLIENTS = set()

async def cmd( websocket, path ):
    async for args in websocket:
        jargs = json.loads( args )
        if 'channel' in jargs:  # broadcast
            websockets.broadcast( CLIENTS, args ) # { "channel": "CAHNNEL", "data": { ... } }
        elif 'filesh' in jargs: # FILE.sh "a\nb\nc"
            Popen( jargs[ 'filesh' ] ) # { "filesh": [ "FILE.sh", "a\nb\nc..." ] }
        elif 'json' in jargs:   # save to NAME.json and broadcast
            jargsjson = jargs[ 'json' ]           # { "json": { ... }, "name": "NAME" }
            jargsname = jargs[ 'name' ]
            data      = '{ "channel": "'+ jargsname +'", "data": '+ json.dumps( jargsjson ) +' }'
            websockets.broadcast( CLIENTS, data )
            pathfile  = '/srv/http/data/system/'+ jargsname
            with open( pathfile +'.json', 'w' ) as f:
                json.dump( jargsjson, f, indent=2 )
        elif 'client' in jargs:                   # { "client": "[add/remove]" }
            if jargs[ 'client' ] == 'add':
                if websocket not in CLIENTS:
                    CLIENTS.add( websocket )
            else:
                if websocket in CLIENTS:
                    CLIENTS.remove( websocket )
        elif 'status' in jargs:                   # { "status": "snapclient" } - from status.sh
            status = run( [ '/srv/http/bash/status.sh', jargs[ 'status' ] ], capture_output=True, text=True )
            status = status.stdout.replace( '\n', '\\n' )
            await websocket.send( status )

async def main():
    async with websockets.serve( cmd, '0.0.0.0', 8080, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
