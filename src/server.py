import asyncio
import json
import os
from datetime import datetime

from websockets import ConnectionClosedOK
from websockets.asyncio.server import serve
from websockets.legacy.client import WebSocketClientProtocol

# JSON-format:
# {
#       'type': 'message',
#     "message": "Hello, server!"
# }

# types: message, connect, disconnect

clients: set[WebSocketClientProtocol] = set()


async def broadcast(message: str, type: str = 'message', t: str = None):
    for client in clients:
        await client.send(json.dumps(
            {
                'message': message,
                'type': type,
                't': t or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        ))


async def handler(websocket: WebSocketClientProtocol):
    clients.add(websocket)
    try:
        async for message in websocket:
            data = json.loads(message)
            if data['type'] == 'connect':
                await broadcast('User connected', 'connect', data['t'])
            elif data['type'] == 'message':
                await broadcast(data['message'], t=data['t'])
    except ConnectionClosedOK:
        clients.remove(websocket)


async def main():
    async with serve(handler, os.getenv('HOST'), os.getenv('PORT')) as server:
        print("Server started")
        await server.serve_forever()
    print('Server closed')


if __name__ == "__main__":
    asyncio.run(main())
