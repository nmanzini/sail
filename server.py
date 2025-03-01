import asyncio
import json
import logging
import websockets
import os
import math
import time
import uuid

# Configure logging
logging.basicConfig(
    format="%(asctime)s %(message)s",
    level=logging.INFO,
)

# Store connected clients and their boat data
connected_clients = {}

# Store fake boat data
fake_boats = {}

async def register(websocket):
    """Register a new client connection."""
    client_id = id(websocket)
    connected_clients[client_id] = {
        "websocket": websocket,
        "boat_data": None
    }
    logging.info(f"Client {client_id} connected. Total clients: {len(connected_clients)}")
    
    # Send initial list of other boats to the new client
    other_boats = {}
    for cid, data in connected_clients.items():
        if cid != client_id and data["boat_data"]:
            other_boats[cid] = data["boat_data"]
    
    # Add fake boats to the initial boats list
    for fake_id, fake_data in fake_boats.items():
        other_boats[fake_id] = fake_data["boat_data"]
            
    if other_boats:
        await websocket.send(json.dumps({
            "type": "initial_boats",
            "boats": other_boats
        }))

async def unregister(websocket):
    """Unregister a client connection."""
    client_id = id(websocket)
    if client_id in connected_clients:
        del connected_clients[client_id]
        logging.info(f"Client {client_id} disconnected. Remaining clients: {len(connected_clients)}")
        
        # Notify other clients that this boat is gone
        disconnection_message = json.dumps({
            "type": "boat_disconnected",
            "client_id": client_id
        })
        
        await broadcast_to_others(disconnection_message, client_id)

async def broadcast_to_all(message):
    """Broadcast message to all clients."""
    tasks = []
    for client_id, client_data in connected_clients.items():
        websocket = client_data["websocket"]
        tasks.append(asyncio.create_task(websocket.send(message)))
    
    if tasks:
        await asyncio.gather(*tasks)

async def broadcast_to_others(message, sender_id):
    """Broadcast message to all clients except the sender."""
    tasks = []
    for client_id, client_data in connected_clients.items():
        if client_id != sender_id:
            websocket = client_data["websocket"]
            tasks.append(asyncio.create_task(websocket.send(message)))
    
    if tasks:
        await asyncio.gather(*tasks)

def create_fake_boats():
    """Create fake boats with initial positions."""
    # Fake boat 1 - moves in a circle
    circle_boat_id = f"fake_circle_{uuid.uuid4()}"
    fake_boats[circle_boat_id] = {
        "boat_data": {
            "position": {"x": 0, "y": 0},
            "rotation": 0,
            "speed": 5,
            "name": "Circle Boat",
            "color": "#FF5733"
        },
        "pattern": "circle",
        "radius": 100,
        "angle": 0
    }
    
    # Fake boat 2 - moves in a square
    square_boat_id = f"fake_square_{uuid.uuid4()}"
    fake_boats[square_boat_id] = {
        "boat_data": {
            "position": {"x": 200, "y": 200},
            "rotation": 0,
            "speed": 3,
            "name": "Square Boat",
            "color": "#3366FF"
        },
        "pattern": "square",
        "side": 150,
        "current_side": 0,
        "progress": 0
    }
    
    logging.info(f"Created fake boats: {circle_boat_id}, {square_boat_id}")

async def update_fake_boats():
    """Update positions of fake boats periodically."""
    while True:
        for fake_id, fake_data in fake_boats.items():
            if fake_data["pattern"] == "circle":
                # Update circle boat position
                angle = fake_data["angle"]
                radius = fake_data["radius"]
                
                # Calculate new position
                x = radius * math.cos(angle)
                y = radius * math.sin(angle)
                
                # Update boat data
                fake_data["boat_data"]["position"]["x"] = x
                fake_data["boat_data"]["position"]["y"] = y
                fake_data["boat_data"]["rotation"] = (angle + math.pi/2) % (2 * math.pi)
                
                # Increment angle for next update
                fake_data["angle"] = (angle + 0.05) % (2 * math.pi)
                
            elif fake_data["pattern"] == "square":
                # Update square boat position
                side = fake_data["side"]
                current_side = fake_data["current_side"]
                progress = fake_data["progress"]
                
                # Calculate new position based on which side of the square we're on
                if current_side == 0:  # Moving right
                    fake_data["boat_data"]["position"]["x"] = progress
                    fake_data["boat_data"]["position"]["y"] = 0
                    fake_data["boat_data"]["rotation"] = 0
                elif current_side == 1:  # Moving down
                    fake_data["boat_data"]["position"]["x"] = side
                    fake_data["boat_data"]["position"]["y"] = progress
                    fake_data["boat_data"]["rotation"] = math.pi / 2
                elif current_side == 2:  # Moving left
                    fake_data["boat_data"]["position"]["x"] = side - progress
                    fake_data["boat_data"]["position"]["y"] = side
                    fake_data["boat_data"]["rotation"] = math.pi
                elif current_side == 3:  # Moving up
                    fake_data["boat_data"]["position"]["x"] = 0
                    fake_data["boat_data"]["position"]["y"] = side - progress
                    fake_data["boat_data"]["rotation"] = 3 * math.pi / 2
                
                # Increment progress for next update
                fake_data["progress"] += 2
                
                # Move to next side if we've completed the current one
                if fake_data["progress"] > side:
                    fake_data["current_side"] = (current_side + 1) % 4
                    fake_data["progress"] = 0
            
            # Broadcast updated boat position to all clients
            broadcast_data = {
                "type": "boat_update",
                "client_id": fake_id,
                "boat_data": fake_data["boat_data"]
            }
            
            await broadcast_to_all(json.dumps(broadcast_data))
        
        # Update every 100ms
        await asyncio.sleep(0.1)

async def handler(websocket):
    """Handle a connection and dispatch messages."""
    # Register new client
    await register(websocket)
    client_id = id(websocket)
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data["type"] == "boat_update":
                    # Store the client's boat data
                    connected_clients[client_id]["boat_data"] = data["boat_data"]
                    
                    # Create message to broadcast
                    broadcast_data = {
                        "type": "boat_update",
                        "client_id": client_id,
                        "boat_data": data["boat_data"]
                    }
                    
                    # Broadcast to all other clients
                    await broadcast_to_others(json.dumps(broadcast_data), client_id)
                
            except json.JSONDecodeError:
                logging.error(f"Invalid JSON from client {client_id}")
            except KeyError as e:
                logging.error(f"Missing key in message from client {client_id}: {e}")
    
    except websockets.exceptions.ConnectionClosed:
        logging.info(f"Connection closed for client {client_id}")
    
    finally:
        # Unregister on disconnection
        await unregister(websocket)

async def main():
    host = "0.0.0.0"
    # Get port from environment variable (Heroku sets this)
    port = int(os.environ.get("PORT", 8765))
    
    logging.info(f"Starting WebSocket server on {host}:{port}")
    
    # Create fake boats
    create_fake_boats()
    
    # Start fake boat update task
    fake_boat_task = asyncio.create_task(update_fake_boats())
    
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())