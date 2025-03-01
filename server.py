import asyncio
import json
import logging
import websockets
import os

# Configure logging
logging.basicConfig(
    format="%(asctime)s %(message)s",
    level=logging.INFO,
)

# Store connected clients and their boat data
connected_clients = {}

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

async def broadcast_to_others(message, sender_id):
    """Broadcast message to all clients except the sender."""
    tasks = []
    for client_id, client_data in connected_clients.items():
        if client_id != sender_id:
            websocket = client_data["websocket"]
            tasks.append(asyncio.create_task(websocket.send(message)))
    
    if tasks:
        await asyncio.gather(*tasks)

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
    
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())