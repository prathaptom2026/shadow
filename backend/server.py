"""
ONAI Battle Zone - friend-room WebSocket prototype.
Run: pip install -r requirements.txt
     python server.py
For friends on the same Wi-Fi, use ws://YOUR-LAN-IP:8765 in the game.
For internet play, deploy this server on a public host and use wss:// with TLS/reverse proxy.
"""
import asyncio, json, secrets, string, os
import websockets

ROOMS = {}
CLIENTS = {}

def make_code():
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(secrets.choice(alphabet) for _ in range(5))
        if code not in ROOMS:
            return code

async def send(ws, payload):
    await ws.send(json.dumps(payload))

async def broadcast(room, payload, exclude=None):
    peers = list(ROOMS.get(room, {}).get("players", {}).items())
    for pid, peer in peers:
        if pid != exclude:
            try:
                await send(peer["ws"], payload)
            except websockets.ConnectionClosed:
                pass

async def handler(ws):
    player_id = secrets.token_urlsafe(8)
    room_code = None
    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except (ValueError, TypeError):
                continue
            kind = msg.get("type")
            if kind == "create_room":
                if room_code:
                    continue
                room_code = make_code()
                ROOMS[room_code] = {"host": player_id, "map": msg.get("map", "erangel"), "players": {}}
                ROOMS[room_code]["players"][player_id] = {
                    "ws": ws, "id": player_id, "name": str(msg.get("player_name", "PLAYER"))[:12],
                    "x": 0, "y": 0, "z": 0, "yaw": 0, "stance": 0, "speed": 0, "outfit": 0
                }
                CLIENTS[player_id] = room_code
                await send(ws, {"type": "room_created", "room": room_code, "player_id": player_id})
            elif kind == "join_room":
                code = str(msg.get("room", "")).upper()
                room = ROOMS.get(code)
                if not room:
                    await send(ws, {"type": "error", "message": "Room not found. Check the code."})
                    continue
                if room["map"] != msg.get("map", "erangel"):
                    await send(ws, {"type": "error", "message": "Select the same map as the room host."})
                    continue
                if len(room["players"]) >= 4:
                    await send(ws, {"type": "error", "message": "Room is full (maximum 4 players)."})
                    continue
                room_code = code
                room["players"][player_id] = {
                    "ws": ws, "id": player_id, "name": str(msg.get("player_name", "PLAYER"))[:12],
                    "x": 0, "y": 0, "z": 0, "yaw": 0, "stance": 0, "speed": 0, "outfit": 0
                }
                CLIENTS[player_id] = room_code
                snapshot = [{k: v for k, v in p.items() if k != "ws"} for pid, p in room["players"].items() if pid != player_id]
                await send(ws, {"type": "room_joined", "room": room_code, "player_id": player_id})
                await send(ws, {"type": "room_snapshot", "players": snapshot})
            elif kind == "player_state" and room_code in ROOMS and player_id in ROOMS[room_code]["players"]:
                player = ROOMS[room_code]["players"][player_id]
                for key in ("x", "y", "z", "yaw", "stance", "speed", "outfit"):
                    try:
                        player[key] = float(msg.get(key, player.get(key, 0)))
                    except (TypeError, ValueError):
                        pass
                player["name"] = str(msg.get("name", player["name"]))[:12]
                payload = {"type": "player_state", "player": {k: v for k, v in player.items() if k != "ws"}}
                await broadcast(room_code, payload, exclude=player_id)
    except websockets.ConnectionClosed:
        pass
    finally:
        code = CLIENTS.pop(player_id, None)
        if code and code in ROOMS:
            room = ROOMS[code]
            room["players"].pop(player_id, None)
            await broadcast(code, {"type": "player_left", "player_id": player_id})
            if not room["players"]:
                ROOMS.pop(code, None)

async def main():
    port = int(os.environ.get("PORT", "8765"))
    print(f"ONAI multiplayer server listening on ws://0.0.0.0:{port}")
    async with websockets.serve(handler, "0.0.0.0", port, max_size=65536, ping_interval=20, ping_timeout=20):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
