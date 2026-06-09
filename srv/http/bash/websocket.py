#!/bin/python

# websocket server
# - receive from local + remote:
#    - WS.send (common.js)      : (channel, client, filesh, json, ping, status) + data
#    - websocat (common.sh)     : channel + data
# - send to local only:
#    - WS.onmessage (common.js) : channel + data

import asyncio
import json
import subprocess
import websockets

CLIENTS   = set()
IP_CLIENT = dict()

# 1. UDP Protocol Class to handle the C++ Broadcast Bridge on port 9000
class UDPBridgeProtocol( asyncio.DatagramProtocol ):
    def datagram_received( self, data, addr ):
        try:
            message = data.decode( 'utf-8' )
            
            # If we have clients registered, pass them directly to broadcast.
            # websockets.broadcast natively skips closed connections cleanly.
            if CLIENTS:
                websockets.broadcast( CLIENTS, message )
        except Exception as e:
            print( f"UDP Bridge Error: {e}" )

async def cmd( websocket ):
    ip = websocket.remote_address[ 0 ]
    
    try:
        async for args in websocket:
            jargs = json.loads( args )
            if 'channel' in jargs:  # broadcast
                if CLIENTS:
                    websockets.broadcast( CLIENTS, args )
            elif 'filesh' in jargs: # FILE.sh "a\nb\nc"
                filesh = '/srv/http/bash/'+ jargs[ 'filesh' ][ 0 ]
                jargs[ 'filesh' ][ 0 ] = filesh
                subprocess.Popen( jargs[ 'filesh' ] ) 
            elif 'json' in jargs:   # save to NAME.json and broadcast
                jargsjson = jargs[ 'json' ]           
                jargsname = jargs[ 'name' ]
                data      = '{ "channel": "'+ jargsname +'", "data": '+ json.dumps( jargsjson ) +' }'
                
                if CLIENTS:
                    websockets.broadcast( CLIENTS, data )
                
                pathfile  = '/srv/http/data/system/'+ jargsname
                with open( pathfile +'.json', 'w' ) as f:
                    json.dump( jargsjson, f, indent=2 )
            elif 'client' in jargs:
                if jargs[ 'client' ] == 'add':        # { "client": "add" }
                    CLIENTS.add( websocket )
                    if ip in IP_CLIENT:
                        CLIENTS.discard( IP_CLIENT[ ip ] )
                    IP_CLIENT[ ip ] = websocket
                else:                                 # { "client": "" }
                    await websocket.send( str( IP_CLIENT ) )
                
                # refresh CLIENTS
                for IP in list(IP_CLIENT.keys()): 
                    if IP == ip: continue
                    if subprocess.call( [ 'ping', '-c', '1', '-w','1', IP ] ) != 0:
                        CLIENTS.discard( IP_CLIENT[ IP ] )
                        IP_CLIENT.pop( IP, None )
            elif 'status' in jargs:                   # snapclient
                status = subprocess.run( [ '/srv/http/bash/status', '-k' ], capture_output=True, text=True )
                status = status.stdout
                await websocket.send( status )
            elif 'ping' in jargs:                     # ws client
                await websocket.send( 'pong' )
                
    except websockets.exceptions.ConnectionClosed:
        pass 
    finally:
        # Clean up client tracking sets instantly on disconnect
        CLIENTS.discard( websocket )
        if ip in IP_CLIENT and IP_CLIENT[ip] == websocket:
            IP_CLIENT.pop( ip, None )

async def main():
    loop = asyncio.get_running_loop()

    # Start the UDP server on port 9000
    await loop.create_datagram_endpoint(
        lambda: UDPBridgeProtocol(),
        local_addr=( '0.0.0.0', 9000 )
    )

    # Start the WebSocket server on port 8080
    async with websockets.serve( cmd, '0.0.0.0', 8080, max_size=10485760, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # Freeze and run both background loops forever

if __name__ == "__main__":
    asyncio.run( main() )
    