BATTLE ZONE ROYALE  (Three.js)
RUN: unzip -> double-click index.html (Chrome/Edge). Internet venda.
(Mouse lock issue na: "python -m http.server" -> http://localhost:8000)

CONTROLS
 W A S D walk | SHIFT sprint | SPACE jump | C crouch | Z prone
 Q / E   peek left / right (hold) and fire
 F       pick up gun / medkit
 Mouse   look | LMB shoot | RMB scope (M416 = 4x, Kar98K = sniper scope) | MOUSE WHEEL while scoped = change zoom
 R reload | 1/2/3 weapons | X holster | ESC pause


MULTIPLAYER FRIEND ROOM PROTOTYPE
1. Install Python 3.10+.
2. In this folder run: pip install -r requirements.txt
3. Run: python server.py
4. Open index.html in a browser on the host PC.
5. Enter ws://localhost:8765 and press CREATE ROOM.
6. Share the 5-character room code with your friend.
7. Your friend opens the same game, enters the host PC LAN IP, e.g. ws://192.168.1.20:8765, selects the same map, enters the room code and presses JOIN FRIEND.
8. Allow TCP port 8765 through the host PC firewall.
This is an early friend-room networking prototype: it synchronizes player position, facing and movement animation for up to 4 players. It is not yet authoritative combat/matchmaking and does not synchronize damage, inventory or bullets. Public internet play requires hosting the Python server on a public server with secure WebSocket (wss://).
\nMOBILE PICKUP FIX: On touch devices, the nearby-item prompt says TAP instead of F. Tap the on-screen PICK/PICK UP button to collect items. The button is disabled when no item is close. PC players can still press F.\n

PUBLIC INTERNET DEPLOYMENT (RENDER + VERCEL)
Backend:
- Push this project to GitHub.
- In Render create a Web Service from the repository. Root Directory: bgmi-game. Runtime: Python. Build: pip install -r requirements.txt. Start: python server.py.
- The server reads Render's PORT environment variable and binds to 0.0.0.0.
- After deployment, use wss://YOUR-RENDER-SERVICE.onrender.com as the in-game server address.
Frontend:
- Import the same GitHub repository into Vercel.
- Set Root Directory to bgmi-game. No build command is needed; serve the static files.
- Open the Vercel HTTPS URL, enter the Render wss:// address in the PLAY WITH FRIENDS server field, create/join a room.
Notes:
- Render free instances may sleep after inactivity and the first connection can take time to wake.
- The current prototype stores room state in memory on one process and is for small friend-room testing only. Do not scale it to multiple instances.
- This prototype currently syncs player movement, not authoritative shooting/damage/inventory.
