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
import random
import argparse  # Added for command-line arguments

# Configure logging
logging.basicConfig(
    format="%(asctime)s %(message)s",
    level=logging.INFO,
)

# Parse command-line arguments
parser = argparse.ArgumentParser(description='Sailing game WebSocket server')
parser.add_argument('-r', '--record', action='store_true', help='Enable recording of player movements')
args = parser.parse_args()

# Store connected clients and their boat data
connected_clients = {}

# Store AI boat data
ai_boats = {}

# Track player positions for dynamic AI boat placement
player_positions = []

# Store player movement recordings for bot replays
recorded_paths = []

# Directory for storing recordings
RECORDINGS_DIR = "recordings"

# Pirate flag identifier
PIRATE_FLAG = "pirate"

# Round-robin index for cycling through recordings
current_recording_index = 0

# Ensure the recordings directory exists
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# Debug flag - set to False to disable verbose logging
debug_boats = False

# Flag to enable recording of player sessions (set by command-line argument)
record_sessions = args.record

# Log recording mode status
if record_sessions:
    logging.info("Recording mode ENABLED - Player movements will be recorded")
else:
    logging.info("Recording mode DISABLED - Will use existing recordings for bots")

async def register(websocket):
    """Register a new client connection."""
    client_id = id(websocket)
    connected_clients[client_id] = {
        "websocket": websocket,
        "boat_data": None,
        "flag": None,  # Initialize flag as None
        "recording": [] if record_sessions else None,  # Initialize recording array if enabled
        "recording_start_time": time.time() if record_sessions else None  # Record start time
    }
    logging.info(f"Client {client_id} connected. Total clients: {len(connected_clients)}")
    
    # Send initial list of other boats to the new client
    other_boats = {}
    for cid, data in connected_clients.items():
        if cid != client_id and data["boat_data"]:
            boat_data = data["boat_data"].copy()
            # Add flag information if available
            if data["flag"]:
                boat_data["flag"] = data["flag"]
            other_boats[cid] = boat_data
    
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
        # Save recording if we have sufficient movement data
        if record_sessions and connected_clients[client_id]["recording"]:
            recording = connected_clients[client_id]["recording"]
            
            # Only save if we have enough data points to be useful (at least 30 movements)
            if len(recording) > 30:
                save_recording(client_id, recording)
            else:
                logging.info(f"Not saving recording for client {client_id} - insufficient data points ({len(recording)})")
        
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

def save_recording(client_id, recording):
    """Save a player's movement recording to a JSON file."""
    try:
        # Create a unique filename with timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{RECORDINGS_DIR}/recording_{timestamp}_{client_id}.json"
        
        # Create the recording data structure
        recording_data = {
            "client_id": client_id,
            "timestamp": timestamp,
            "movements": recording
        }
        
        # Save to file
        with open(filename, 'w') as f:
            json.dump(recording_data, f, indent=2)
        
        logging.info(f"Saved recording with {len(recording)} movements to {filename}")
        
        # Add to available recordings for bots to use
        global recorded_paths
        recorded_paths.append(recording_data)
        
    except Exception as e:
        logging.error(f"Error saving recording: {e}")

def load_recordings():
    """Load all available recordings from the recordings directory."""
    global recorded_paths
    try:
        # Clear existing recordings
        recorded_paths = []
        
        # Check if directory exists
        if not os.path.exists(RECORDINGS_DIR):
            logging.info(f"Recordings directory does not exist. No recordings loaded.")
            return
        
        # List all JSON files in the recordings directory
        files = [f for f in os.listdir(RECORDINGS_DIR) if f.endswith('.json')]
        
        if not files:
            logging.info("No recording files found.")
            return
        
        # Load each file
        for file in files:
            try:
                with open(os.path.join(RECORDINGS_DIR, file), 'r') as f:
                    recording_data = json.load(f)
                    recorded_paths.append(recording_data)
                    logging.info(f"Loaded recording {file} with {len(recording_data['movements'])} movements")
            except Exception as e:
                logging.error(f"Error loading recording {file}: {e}")
        
        logging.info(f"Loaded {len(recorded_paths)} recordings for bot replays")
    except Exception as e:
        logging.error(f"Error loading recordings: {e}")

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
    # First try to load any existing recordings
    load_recordings()
    
    # If we have recorded paths, use them for initial boats
    if recorded_paths:
        # Use up to 2 different recorded paths for initial boats
        for i in range(min(2, len(recorded_paths))):
            create_recorded_boat(recorded_paths[i])
        
        logging.info(f"Created initial AI boats using recorded paths")
    else:
        # If no recordings available, log a message but don't create default boats
        logging.info("No recorded paths available for AI boats. Run with -r flag to create recordings.")

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
            "sailAngle": 0,
            "flag": PIRATE_FLAG  # Add pirate flag to AI boats
        },
        "direction": {
            "x": math.sin(movement_angle),  # x component of direction
            "z": -math.cos(movement_angle)  # z component of direction (negative z is forward in Three.js)
        },
        "speed": direction["speed"],
        "start_position": {"x": center["x"], "z": center["y"]},
        "distance": 0,
        "max_distance": 600,  # Increased distance before resetting (hundreds of units away)
        "created_at": time.time(),  # Add creation timestamp to track boat age
        "type": "linear",  # Mark this as a linear path boat
    }
    
    return boat_id

def create_recorded_boat(recording_data):
    """Create a new AI boat that follows a recorded player path."""
    boat_id = f"pirate_{uuid.uuid4()}"
    
    # Get first movement for initial position and rotation
    if not recording_data["movements"]:
        logging.error("Cannot create recorded boat: no movements in recording")
        return None
    
    first_movement = recording_data["movements"][0]
    
    # Choose a random color for this boat
    colors = ["#8B4513", "#006400", "#2F4F4F", "#800000", "#191970"]
    boat_color = random.choice(colors)
    
    ai_boats[boat_id] = {
        "boat_data": {
            "position": {
                "x": first_movement["position"]["x"],
                "y": first_movement["position"]["y"],
                "z": first_movement["position"]["z"]
            },
            "rotation": {
                "x": first_movement["rotation"]["x"],
                "y": first_movement["rotation"]["y"],
                "z": first_movement["rotation"]["z"]
            },
            "sailAngle": first_movement.get("sailAngle", 0),
            "name": "Recorded Pirate",
            "color": boat_color,
            "speed": 0,  # Speed is determined by the recording
            "flag": PIRATE_FLAG  # Add pirate flag to AI boats
        },
        "type": "recorded",  # Mark this as a recorded path boat
        "recording": recording_data["movements"],
        "current_index": 0,
        "last_update_time": time.time(),
        "loop": False  # Changed to False - Don't loop the recording when it ends
    }
    
    logging.info(f"Created new recorded boat {boat_id} with {len(recording_data['movements'])} movements")
    return boat_id

async def spawn_boats_over_time():
    """Spawn new boats periodically from recorded paths using round-robin selection."""
    global current_recording_index
    spawn_interval = 30  # Spawn a new boat every 30 seconds
    target_boats = 3  # Target number of boats
    
    # Wait a bit before starting to spawn boats
    await asyncio.sleep(spawn_interval * 2)
    
    while True:
        try:
            await asyncio.sleep(spawn_interval)
            
            # Only spawn if we have recordings and we're not in recording mode
            if recorded_paths and not record_sessions:
                # Use round-robin selection of recordings
                if current_recording_index >= len(recorded_paths):
                    current_recording_index = 0
                
                recording = recorded_paths[current_recording_index]
                current_recording_index += 1
                
                # Only create a new boat if we're under the target limit
                if len(ai_boats) < target_boats:
                    try:
                        boat_id = create_recorded_boat(recording)
                        logging.info(f"Spawned new recorded path pirate ({current_recording_index-1}/{len(recorded_paths)}) (Total: {len(ai_boats)}/{target_boats})")
                        
                        if boat_id:
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
                else:
                    logging.info(f"Skipped spawning boat: at maximum ({len(ai_boats)}/{target_boats})")
        except Exception as e:
            logging.error(f"Critical error in spawn_boats_over_time: {str(e)}")
            # Sleep a bit before retrying to avoid tight error loops
            await asyncio.sleep(spawn_interval)

async def update_ai_boats():
    """Update positions of AI boats."""
    while True:
        try:
            current_time = time.time()
            
            for ai_id, ai_data in list(ai_boats.items()):
                try:
                    # Handle different types of boat movement
                    if ai_data["type"] == "recorded":
                        # Handle recorded path movement
                        movements = ai_data["recording"]
                        current_index = ai_data["current_index"]
                        
                        # If we've reached the end of the recording
                        if current_index >= len(movements) - 1:
                            if ai_data["loop"]:
                                # Reset to beginning if looping
                                ai_data["current_index"] = 0
                                current_index = 0
                                logging.info(f"Recorded boat {ai_id} reached end of recording, looping")
                            else:
                                # Remove the boat if not looping
                                logging.info(f"Recorded boat {ai_id} reached end of recording, removing")
                                del ai_boats[ai_id]
                                continue
                        
                        # Get current and next movement
                        current_movement = movements[current_index]
                        next_index = current_index + 1
                        
                        # If we're at the end of the recording and looping, next is the first movement
                        if next_index >= len(movements) and ai_data["loop"]:
                            next_index = 0
                        
                        # If we have a next movement to interpolate to
                        if next_index < len(movements):
                            next_movement = movements[next_index]
                            
                            # Calculate position by interpolating between current and next
                            # The original recording may have variable frame rates, so we use
                            # a fixed interpolation speed
                            
                            # Get current position
                            current_pos = ai_data["boat_data"]["position"]
                            next_pos = next_movement["position"]
                            
                            # Calculate direction vector
                            dir_x = next_pos["x"] - current_pos["x"]
                            dir_y = next_pos["y"] - current_pos["y"]
                            dir_z = next_pos["z"] - current_pos["z"]
                            
                            # Calculate distance
                            distance = math.sqrt(dir_x**2 + dir_y**2 + dir_z**2)
                            
                            # Calculate interpolation speed (units per second)
                            speed = 5  # Fixed speed for smoother movement
                            
                            # If we're close enough to the next point, advance to it
                            if distance < 0.5 or speed * 0.1 >= distance:
                                ai_data["current_index"] += 1
                                
                                # Update position, rotation, and sail angle
                                ai_data["boat_data"]["position"] = next_movement["position"]
                                ai_data["boat_data"]["rotation"] = next_movement["rotation"]
                                if "sailAngle" in next_movement:
                                    ai_data["boat_data"]["sailAngle"] = next_movement["sailAngle"]
                                if "heelAngle" in next_movement:
                                    ai_data["boat_data"]["heelAngle"] = next_movement["heelAngle"]
                            else:
                                # Normalize direction vector
                                if distance > 0:
                                    dir_x /= distance
                                    dir_y /= distance
                                    dir_z /= distance
                                
                                # Calculate new position
                                ai_data["boat_data"]["position"]["x"] += dir_x * speed * 0.1
                                ai_data["boat_data"]["position"]["y"] += dir_y * speed * 0.1
                                ai_data["boat_data"]["position"]["z"] += dir_z * speed * 0.1
                                
                                # Interpolate rotation as well
                                # For simplicity, we just use the next rotation value directly
                                ai_data["boat_data"]["rotation"] = next_movement["rotation"]
                                
                                # Interpolate sail angle if available
                                if "sailAngle" in next_movement:
                                    ai_data["boat_data"]["sailAngle"] = next_movement["sailAngle"]
                                    
                                # Interpolate heel angle if available
                                if "heelAngle" in next_movement:
                                    ai_data["boat_data"]["heelAngle"] = next_movement["heelAngle"]
                    
                    elif ai_data["type"] == "linear":
                        # Standard linear movement for non-recorded boats
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
                    
                    # Record this movement if recording is enabled
                    if record_sessions and "recording" in connected_clients[client_id]:
                        # Add timestamp relative to start time
                        timestamp = time.time() - connected_clients[client_id]["recording_start_time"]
                        
                        # Add this position to the recording with a timestamp
                        movement = {
                            "timestamp": timestamp,
                            "position": data["boat_data"]["position"],
                            "rotation": data["boat_data"]["rotation"]
                        }
                        
                        # Add sail angle if available
                        if "sailAngle" in data["boat_data"]:
                            movement["sailAngle"] = data["boat_data"]["sailAngle"]
                            
                        # Add heel angle if available
                        if "heelAngle" in data["boat_data"]:
                            movement["heelAngle"] = data["boat_data"]["heelAngle"]
                            
                        connected_clients[client_id]["recording"].append(movement)
                    
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
                
                elif data["type"] == "flag_update":
                    # Store the client's flag information
                    flag_code = data.get("flag_code", "")
                    connected_clients[client_id]["flag"] = flag_code
                    
                    # Add flag info to boat data if it exists
                    if connected_clients[client_id]["boat_data"]:
                        connected_clients[client_id]["boat_data"]["flag"] = flag_code
                        
                        # Create message to broadcast
                        broadcast_data = {
                            "type": "boat_update",
                            "client_id": client_id,
                            "boat_data": connected_clients[client_id]["boat_data"]
                        }
                        
                        # Broadcast to all other clients
                        await broadcast_to_others(json.dumps(broadcast_data), client_id)
                        
                    logging.info(f"Client {client_id} updated flag to: {flag_code}")
                
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