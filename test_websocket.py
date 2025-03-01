#!/usr/bin/env python3
import asyncio
import websockets
import json
import sys

async def test_connection():
    """Test WebSocket connection to the server."""
    uri = "wss://sail-server-eb8a39ba5a31.herokuapp.com"
    
    print(f"Attempting to connect to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Successfully connected to the WebSocket server!")
            
            # Send a simple boat update
            test_message = {
                "type": "boat_update",
                "boat_data": {
                    "position": {"x": 0, "y": 0, "z": 0},
                    "rotation": {"x": 0, "y": 0, "z": 0},
                    "sailAngle": 0
                }
            }
            
            print("Sending test boat update...")
            await websocket.send(json.dumps(test_message))
            print("✓ Message sent successfully!")
            
            # Try to receive a response (could be initial_boats or other boats' updates)
            print("Waiting for response (will timeout after 5 seconds)...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"✓ Received response: {response}")
            except asyncio.TimeoutError:
                print("No response received within timeout (this could be normal if no other boats are connected)")
                
            print("Test completed successfully!")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1) 