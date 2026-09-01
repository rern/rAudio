#!/bin/python

# websocket server
# - receive message from local / remote (udp datagram):
#    - WS.onmessage (common.js) : channel + data
# - send to local only:
#    - WS.send  (common.js)     : [channel|client|filesh|json] + data, ping, status
#    - websocat (common.sh)     : ^^
# - send to local / remote:
#    - status -B (shell)        : ^^

import asyncio
import json
import subprocess
import websockets

CLIENTS   = set()
IP_CLIENT = dict()
DIR_BASH  = '/srv/http/bash/'
result    = subprocess.run( [ DIR_BASH +'status', '-Bp' ], capture_output=True, text=True ) # get port
UDP_PORT  = result.stdout.strip()

class UDPBridgeProtocol( asyncio.DatagramProtocol ):
    def datagram_received( self, data, addr ): # from status wsBroadcast() to all hosts (udp)
        try:
            message = data.decode( 'utf-8' )
            if CLIENTS: websockets.broadcast( CLIENTS, message ) # to connected clients only
        except Exception as e:
            print( f"UDP Bridge Error: {e}" )

async def cmd( websocket ):
    ip = websocket.remote_address[ 0 ]
    
    try:
        async for args in websocket:
            jargs = json.loads( args )
            if 'channel' in jargs:  # broadcast
                if CLIENTS: websockets.broadcast( CLIENTS, args )
            elif 'filesh' in jargs: # FILE.sh "a\nb\nc"
                filesh = DIR_BASH + jargs[ 'filesh' ][ 0 ]
                jargs[ 'filesh' ][ 0 ] = filesh
                subprocess.Popen( jargs[ 'filesh' ] ) 
            elif 'json' in jargs:   # save to NAME.json and broadcast
                jargsjson = jargs[ 'json' ]
                jargsname = jargs[ 'name' ]
                data      = '{ "channel": "'+ jargsname +'", "data": '+ json.dumps( jargsjson ) +' }'
                
                if CLIENTS: websockets.broadcast( CLIENTS, data )
                
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
            elif 'ping' in jargs:                     # ws client
                await websocket.send( 'pong' )
            elif 'status' in jargs:                   # from snapclient
                status = subprocess.run( [ DIR_BASH +'status', '-s' ], capture_output=True, text=True )
                await websocket.send( status.stdout )
                #1 snapclient request : wsSend(ip, "status");      * inside binary status
                #2 ws server receive  : status                     * this sanpserver
                #3 this server get    : status -s                  * without counts and display
                #4 reply to sender    : websocket.send( status )   * to sender ip (either local or remote)
                #5 snapclient receive : status                     * json
    except websockets.exceptions.ConnectionClosed:
        pass 
    finally:
        # Clean up client tracking sets instantly on disconnect
        CLIENTS.discard( websocket )
        if ip in IP_CLIENT and IP_CLIENT[ip] == websocket:
            IP_CLIENT.pop( ip, None )

async def main():
    loop = asyncio.get_running_loop()

    # datagram(udp) server
    await loop.create_datagram_endpoint(
        lambda: UDPBridgeProtocol(),
        local_addr=( '0.0.0.0', UDP_PORT )
    )

    # webSocket server
    async with websockets.serve( cmd, '0.0.0.0', 8080, max_size=10485760, ping_interval=None, ping_timeout=None ):
        await asyncio.Future()  # Freeze and run both background loops forever

if __name__ == "__main__":
    asyncio.run( main() )
    