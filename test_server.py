#!/usr/bin/env python3
import asyncio
import websockets
import json
import random
import math
import time

async def test_client():
    """
    A simple test client that simulates a boat moving in a circle
    """
    uri = "ws://localhost:8765"
    
    try:
        print(f"Connecting to server at {uri}...")
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # Initialize position
            x, z = 0, 0
            angle = 0
            sail_angle = math.pi / 4  # 45 degrees
            
            # Run for 60 seconds
            start_time = time.time()
            while time.time() - start_time < 60:
                # Update position to move in a circle
                angle += 0.01
                radius = 50
                x = radius * math.cos(angle)
                z = radius * math.sin(angle)
                
                # Create boat update message
                message = {
                    "type": "boat_update",
                    "boat_data": {
                        "position": {
                            "x": x,
                            "y": 0,
                            "z": z
                        },
                        "rotation": {
                            "x": 0,
                            "y": angle + math.pi/2,  # Face tangent to circle
                            "z": 0
                        },
                        "sailAngle": sail_angle
                    }
                }
                
                # Send update
                await websocket.send(json.dumps(message))
                
                # Receive and print any messages from server
                try:
                    # Non-blocking receive
                    received = await asyncio.wait_for(
                        websocket.recv(), 
                        timeout=0.1
                    )
                    data = json.loads(received)
                    print(f"Received: {data['type']}")
                except asyncio.TimeoutError:
                    # No message received, that's fine
                    pass
                
                # Wait a bit before next update
                await asyncio.sleep(0.1)
                
            print("Test completed")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_client()) 