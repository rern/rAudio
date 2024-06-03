#!/usr/bin/env python

import asyncio
import json
import subprocess
import websockets

CLIENTS   = set()
IP_CLIENT = dict()

async def cmd( websocket ):
    async for args in websocket:
        jargs = json.loads( args )
        if 'channel' in jargs:  # broadcast
            websockets.broadcast( CLIENTS, args ) # { "channel": "CAHNNEL", "data": { ... } }
        elif 'filesh' in jargs: # FILE.sh "a\nb\nc"
            subprocess.Popen( jargs[ 'filesh' ] ) # { "filesh": [ "FILE.sh", "a\nb\nc..." ] }
        elif 'json' in jargs:   # save to NAME.json and broadcast
            jargsjson = jargs[ 'json' ]           # { "json": { ... }, "name": "NAME" }
            jargsname = jargs[ 'name' ]
            data      = '{ "channel": "'+ jargsname +'", "data": '+ json.dumps( jargsjson ) +' }'
            websockets.broadcast( CLIENTS, data )
            pathfile  = '/srv/http/data/system/'+ jargsname
            with open( pathfile +'.json', 'w' ) as f:
                json.dump( jargsjson, f, indent=2 )
        elif 'client' in jargs:
            ip = websocket.remote_address[ 0 ]
            if jargs[ 'client' ] == 'add':        # { "client": "add" }
                CLIENTS.add( websocket )
                if ip in IP_CLIENT:
                    CLIENTS.discard( IP_CLIENT[ ip ] )
                IP_CLIENT[ ip ] = websocket
            else:                                 # { "client": "" }
                await websocket.send( str( IP_CLIENT ) )
            # refresh CLIENTS
            for IP in IP_CLIENT:
                if IP != ip and subprocess.call( [ 'ping', '-c', '1', '-w','1', IP ] ) != 0:
                    CLIENTS.discard( IP_CLIENT[ IP ] )
                    IP_CLIENT.pop( IP, None )
        elif 'status' in jargs:                   # { "status": "snapclient" } - from status.sh
            status = subprocess.run( [ '/srv/http/bash/status.sh', jargs[ 'status' ] ], capture_output=True, text=True )
            status = status.stdout.replace( '\n', '\\n' )
            await websocket.send( status )
        elif 'ping' in jargs:
            await websocket.send( 'pong' )

async def main():
    async with websockets.serve( cmd, '0.0.0.0', 8080, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # run forever

asyncio.run( main() )
