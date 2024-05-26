#!/usr/bin/env python

import asyncio
import json
import os
import subprocess
import websockets

CLIENTS   = set()

async def cmd( websocket, path ):
    async for args in websocket: # jargs: string
        jargs = json.loads( args ) # jargs: string > list
        if 'channel' in jargs:  # broadcast
            websockets.broadcast( CLIENTS, args ) # { "channel": "CAHNNEL", "data": { ... } }
        elif 'bash' in jargs:   # FILE.sh a b c
            os.system( jargs[ 'bash' ] )          # { "bash": "FILE.sh a b c ..." }
        elif 'filesh' in jargs: # FILE.sh "a\nb\nc"
            if 'get' in jargs:
                status = subprocess.check_output( jargs[ 'filesh' ] )
                await websocket.send( status )
            else:
                subprocess.Popen( jargs[ 'filesh' ] ) # { "filesh": [ "FILE.sh", "a\nb\nc..." ] }
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

async def main():
    async with websockets.serve( cmd, '0.0.0.0', 8080, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
