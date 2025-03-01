# Multiplayer Sailing Simulator

A 3D multiplayer sailing simulator where players can navigate boats in a shared virtual ocean.

## Features

- 3D sailing physics simulation
- Realistic wind and water effects
- First-person and orbit camera modes
- Multiplayer support via WebSocket
- Interactive sailing controls (keyboard, mouse, touch)
- Audio feedback based on sailing conditions

## Getting Started

### Prerequisites

- Python 3.7+ for the server
- Modern web browser for the client
- Internet connection for multiplayer

### Server Setup

1. Install the required Python package:

```bash
pip install -r requirements.txt
```

2. Start the WebSocket server:

```bash
python server.py
```

The server will run on port 8765 by default.

### Client Setup

The client is browser-based and requires no installation. Simply serve the files using a web server or open the index.html file directly in your browser.

For testing with multiple clients, you may need to use a local web server:

```bash
# Using Python's built-in HTTP server
python -m http.server 8000
```

Then navigate to http://localhost:8000 in your browser.

## Multiplayer Usage

1. Start the server as described above
2. Open the client in your browser
3. Click the "Connect to Multiplayer" button in the top-right corner
4. Each connected player will see other players' boats in the shared world

## Default Controls

- **W/S**: Increase/decrease sail angle
- **A/D**: Turn the rudder left/right
- **C**: Toggle camera mode (orbit/first-person)
- **Space**: Reset sail and rudder to center

## Configuration

- The WebSocket server address can be changed in `js/main.js` by modifying the `serverUrl` property.
- Server port can be modified in `server.py`

## Technical Implementation

The multiplayer system uses WebSockets to:
1. Transmit boat position, rotation, and sail angle data from each client to the server
2. Broadcast these updates to all other connected clients
3. Visualize other players' boats in each client's local world

Data is exchanged in JSON format for compatibility and ease of use.

## License

MIT 