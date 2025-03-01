import asyncio
import json
import logging
import websockets
import os
import math
import time
import uuid
import statistics
import datetime

# Configure logging
logging.basicConfig(
    format="%(asctime)s %(message)s",
    level=logging.INFO,
)

# Store connected clients and their boat data
connected_clients = {}

# Store AI boat data
ai_boats = {}

# Track player positions for dynamic AI boat placement
player_positions = []

# Debug flag - set to False to disable verbose logging
debug_boats = False

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
    
    # Add AI boats to the initial boats list
    for ai_id, ai_data in ai_boats.items():
        other_boats[ai_id] = ai_data["boat_data"]
    
    if other_boats:
        initial_message = json.dumps({
            "type": "initial_boats",
            "boats": other_boats
        })
        await websocket.send(initial_message)

async def unregister(websocket):
    """Unregister a client connection."""
    client_id = id(websocket)
    if client_id in connected_clients:
        # Log player's last position
        if connected_clients[client_id]["boat_data"]:
            pos = connected_clients[client_id]["boat_data"]["position"]
            logging.info(f"Client {client_id} disconnected. Last position: x={pos['x']}, y={pos['y']}. Remaining clients: {len(connected_clients)-1}")
        else:
            logging.info(f"Client {client_id} disconnected. No position data. Remaining clients: {len(connected_clients)-1}")
            
        del connected_clients[client_id]
        
        # Update player positions list
        update_player_position_list()
        
        # Notify other clients that this boat is gone
        disconnection_message = json.dumps({
            "type": "boat_disconnected",
            "client_id": client_id
        })
        
        await broadcast_to_others(disconnection_message, client_id)

def update_player_position_list(log_positions=False):
    """Update the list of player positions for AI boat placement."""
    global player_positions
    player_positions = []
    
    for client_id, client_data in connected_clients.items():
        if client_data["boat_data"] and "position" in client_data["boat_data"]:
            player_positions.append(client_data["boat_data"]["position"])
            
    # Log the current player positions (only if requested to avoid log spam)
    if log_positions and player_positions:
        positions_str = ", ".join([f"({p['x']}, {p['y']})" for p in player_positions])
        logging.info(f"Current player positions: {positions_str}")
    elif log_positions:
        logging.info("No player positions available")

def get_player_center_area():
    """Calculate the center area where players are located."""
    if not player_positions:
        # Default coordinates if no players
        return {"x": 60, "y": 0}  # Set default to expected player area
    
    # Calculate average position
    avg_x = statistics.mean([p["x"] for p in player_positions])
    avg_y = statistics.mean([p["y"] for p in player_positions])
    
    return {"x": avg_x, "y": avg_y}

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

def create_ai_boats():
    """Create initial AI-controlled boats."""
    # Center position for boats to start from
    center = {"x": 60, "y": 0}  # Middle of the observed player path
    
    # We'll start with 2 boats (one in each direction) and spawn more over time
    directions = [
        {"name": "Eastbound", "angle": math.pi/2, "color": "#2F4F4F", "speed": 5},
        {"name": "Westbound", "angle": 3*math.pi/2, "color": "#006400", "speed": 4.8}
    ]
    
    for direction in directions:
        create_new_boat(direction)
    
    logging.info(f"Created initial AI boats sailing east and west from center ({center['x']}, {center['y']})")

def create_new_boat(direction):
    """Create a new AI boat with the specified direction."""
    center = {"x": 60, "y": 0}  # Middle of the observed player path
    boat_id = f"pirate_{uuid.uuid4()}"
    
    # In Three.js, rotation.y of 0 points along negative Z axis
    movement_angle = direction["angle"]
    # Convert from "mathematical angle" to "Three.js rotation.y angle"
    rotation_y = movement_angle
    
    ai_boats[boat_id] = {
        "boat_data": {
            "position": {"x": center["x"], "y": 0, "z": center["y"]},
            "rotation": {"x": 0, "y": rotation_y, "z": 0},
            "speed": direction["speed"],
            "name": f"{direction['name']} Pirate",
            "color": direction["color"],
            "sailAngle": 0
        },
        "direction": {
            "x": math.sin(movement_angle),  # x component of direction
            "z": -math.cos(movement_angle)  # z component of direction (negative z is forward in Three.js)
        },
        "speed": direction["speed"],
        "start_position": {"x": center["x"], "z": center["y"]},
        "distance": 0,
        "max_distance": 600,  # Increased distance before resetting (hundreds of units away)
        "created_at": time.time()  # Add creation timestamp to track boat age
    }
    
    return boat_id

async def spawn_boats_over_time():
    """Spawn new boats periodically, replacing old ones to maintain a constant number."""
    spawn_interval = 30  # Spawn a new boat every 30 seconds
    target_boats = 6  # Target number of boats
    
    # Direction templates for new boats
    directions = [
        {"name": "Eastbound", "angle": math.pi/2, "color": "#2F4F4F", "speed": 5},
        {"name": "Westbound", "angle": 3*math.pi/2, "color": "#006400", "speed": 4.8}
    ]
    
    direction_index = 0  # Alternate between directions
    
    # Wait a bit before starting to replace boats
    await asyncio.sleep(spawn_interval * 2)
    
    while True:
        try:
            await asyncio.sleep(spawn_interval)
            
            # Always generate a new boat and remove an old one
            if len(ai_boats) > 0:
                try:
                    # Find the oldest boat to remove
                    oldest_boat_id = None
                    oldest_time = float('inf')
                    
                    for boat_id, boat_data in list(ai_boats.items()):
                        if boat_data.get("created_at", float('inf')) < oldest_time:
                            oldest_time = boat_data.get("created_at", float('inf'))
                            oldest_boat_id = boat_id
                    
                    if oldest_boat_id:
                        # Remove the oldest boat
                        boat_name = ai_boats[oldest_boat_id]["boat_data"]["name"]
                        del ai_boats[oldest_boat_id]
                        
                        # Notify clients that this boat is gone
                        disconnection_message = json.dumps({
                            "type": "boat_disconnected",
                            "client_id": oldest_boat_id
                        })
                        await broadcast_to_all(disconnection_message)
                        
                        logging.info(f"Removed oldest boat: {boat_name} (ID: {oldest_boat_id})")
                except Exception as e:
                    logging.error(f"Error removing oldest boat: {e}")
            
            # Always generate a new boat if we haven't reached the target
            if len(ai_boats) < target_boats:
                try:
                    # Choose the next direction (alternating)
                    direction = directions[direction_index % len(directions)]
                    direction_index += 1
                    
                    # Create a new boat and log it
                    boat_id = create_new_boat(direction)
                    logging.info(f"Spawned new {direction['name']} pirate (Total: {len(ai_boats)}/{target_boats})")
                    
                    # Create initial boat data for new clients
                    boat_data = {
                        "type": "boat_update",
                        "client_id": boat_id,
                        "boat_data": ai_boats[boat_id]["boat_data"]
                    }
                    
                    # Broadcast the new boat to all clients
                    await broadcast_to_all(json.dumps(boat_data))
                except Exception as e:
                    logging.error(f"Error creating new boat: {e}")
        except Exception as e:
            logging.error(f"Critical error in spawn_boats_over_time: {str(e)}")
            # Sleep a bit before retrying to avoid tight error loops
            await asyncio.sleep(spawn_interval)

async def update_ai_boats():
    """Update positions of AI boats sailing in straight lines."""
    while True:
        try:
            for ai_id, ai_data in list(ai_boats.items()):
                try:
                    # Get current position and direction
                    current_x = ai_data["boat_data"]["position"]["x"]
                    current_z = ai_data["boat_data"]["position"]["z"]
                    direction_x = ai_data["direction"]["x"]
                    direction_z = ai_data["direction"]["z"]
                    speed = ai_data["speed"]
                    
                    # Calculate new position (straight line movement)
                    new_x = current_x + direction_x * speed * 0.1  # Scale speed by time factor
                    new_z = current_z + direction_z * speed * 0.1
                    
                    # Update distance traveled
                    ai_data["distance"] += speed * 0.1
                    
                    # Check if boat has reached max distance
                    if ai_data["distance"] >= ai_data["max_distance"]:
                        # Reset to start position
                        new_x = ai_data["start_position"]["x"]
                        new_z = ai_data["start_position"]["z"]
                        ai_data["distance"] = 0
                        logging.info(f"Pirate {ai_id} ({ai_data['boat_data']['name']}) reached maximum distance and reset to start position")
                    
                    # Update boat data
                    ai_data["boat_data"]["position"]["x"] = new_x
                    ai_data["boat_data"]["position"]["z"] = new_z
                    
                    # Broadcast updated boat position to all clients
                    broadcast_data = {
                        "type": "boat_update",
                        "client_id": ai_id,
                        "boat_data": ai_data["boat_data"]
                    }
                    
                    await broadcast_to_all(json.dumps(broadcast_data))
                except KeyError as e:
                    logging.error(f"KeyError in update_ai_boats for boat {ai_id}: {e}")
                except Exception as e:
                    logging.error(f"Error processing boat {ai_id}: {e}")
            
            # Update every 100ms
            await asyncio.sleep(0.1)
        except Exception as e:
            logging.error(f"Critical error in update_ai_boats main loop: {str(e)}")
            # Sleep a bit longer before retrying to avoid tight error loops
            await asyncio.sleep(1.0)

async def heartbeat():
    """Send regular heartbeat logs to keep the server active and monitor its health."""
    while True:
        try:
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            logging.info(f"Heartbeat - Server active - {now} - AI boats: {len(ai_boats)} - Clients: {len(connected_clients)}")
            await asyncio.sleep(300)  # 5-minute heartbeat
        except Exception as e:
            logging.error(f"Error in heartbeat: {str(e)}")
            await asyncio.sleep(300)  # Wait before retrying

async def handler(websocket):
    """Handle a connection and dispatch messages."""
    # Register new client
    await register(websocket)
    client_id = id(websocket)
    update_count = 0
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                update_count += 1
                
                if data["type"] == "boat_update":
                    # Store the client's boat data
                    connected_clients[client_id]["boat_data"] = data["boat_data"]
                    
                    # Log boat position occasionally (not every update to avoid log spam)
                    if debug_boats and update_count % 100 == 0 and "position" in data["boat_data"]:
                        pos = data["boat_data"]["position"]
                        logging.info(f"Client {client_id} boat position: ({pos['x']}, {pos['y']})")
                    
                    # Update the player positions list
                    update_player_position_list()
                    
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
    
    # Create initial AI boats
    create_ai_boats()
    
    # Function to monitor and restart tasks if they fail
    async def monitor_task(task_func, task_name):
        while True:
            try:
                task = asyncio.create_task(task_func())
                await task
            except asyncio.CancelledError:
                logging.info(f"{task_name} task was cancelled")
                break
            except Exception as e:
                logging.error(f"{task_name} task failed with error: {str(e)}")
                logging.info(f"Restarting {task_name} task in 5 seconds...")
                await asyncio.sleep(5)
    
    # Start AI boat update and spawning tasks with monitoring
    ai_boat_monitor = asyncio.create_task(monitor_task(update_ai_boats, "AI boat update"))
    spawn_monitor = asyncio.create_task(monitor_task(spawn_boats_over_time, "Boat spawning"))
    
    # Start heartbeat task
    heartbeat_monitor = asyncio.create_task(monitor_task(heartbeat, "Heartbeat"))
    
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())