import asyncio
import json
import logging
import websockets
import os
import datetime
import time

# Configure logging
logging.basicConfig(
    format="%(asctime)s %(message)s",
    level=logging.INFO,
)

# Store connected clients and their boat data
connected_clients = {}

# Server statistics
server_stats = {
    "start_time": time.time(),
    "connections_total": 0,
    "messages_received": 0,
    "messages_sent": 0,
}

async def register(websocket):
    """Register a new client connection."""
    client_id = id(websocket)
    connected_clients[client_id] = {
        "websocket": websocket,
        "boat_data": None,
        "connected_at": time.time(),
        "messages_received": 0,
        "messages_sent": 0,
    }
    
    # Update server stats
    server_stats["connections_total"] += 1
    
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
        # Update stats
        server_stats["messages_sent"] += 1
        connected_clients[client_id]["messages_sent"] += 1

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
            # Update stats for each recipient
            connected_clients[client_id]["messages_sent"] += 1
            server_stats["messages_sent"] += 1
    
    if tasks:
        await asyncio.gather(*tasks)

async def handler(websocket, path):
    """Handle a connection and dispatch messages."""
    # Handle HTTP request for status dashboard
    if path == "/":
        try:
            # If it's an HTTP request, serve the dashboard
            headers = websocket.request_headers
            if headers.get("Upgrade", "").lower() != "websocket":
                return await serve_dashboard(websocket)
        except Exception as e:
            # This might fail if it's a real WebSocket connection
            logging.info(f"Exception when checking for HTTP request: {e}")
    
    # Handle WebSocket connection
    # Register new client
    await register(websocket)
    client_id = id(websocket)
    
    try:
        async for message in websocket:
            try:
                # Update stats
                server_stats["messages_received"] += 1
                connected_clients[client_id]["messages_received"] += 1
                
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

async def serve_dashboard(websocket):
    """Serve a simple HTML dashboard with server stats."""
    uptime = time.time() - server_stats["start_time"]
    uptime_str = str(datetime.timedelta(seconds=int(uptime)))
    
    # Create the HTML for the dashboard
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sail WebSocket Server Dashboard</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }}
            h1 {{
                color: #2c3e50;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
            }}
            .card {{
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                padding: 20px;
                margin-bottom: 20px;
            }}
            .stat {{
                display: flex;
                justify-content: space-between;
                border-bottom: 1px solid #eee;
                padding: 8px 0;
            }}
            .stat-label {{
                font-weight: bold;
            }}
            .stat-value {{
                color: #3498db;
            }}
            .connected-clients {{
                margin-top: 20px;
            }}
            .refresh-btn {{
                background-color: #3498db;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }}
            .refresh-btn:hover {{
                background-color: #2980b9;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 12px;
                color: #7f8c8d;
                text-align: center;
            }}
            @media (max-width: 600px) {{
                body {{
                    padding: 10px;
                }}
            }}
        </style>
    </head>
    <body>
        <h1>📡 Sail WebSocket Server Dashboard</h1>
        
        <div class="card">
            <h2>Server Status</h2>
            <div class="stat">
                <span class="stat-label">Status</span>
                <span class="stat-value">Online ✅</span>
            </div>
            <div class="stat">
                <span class="stat-label">Uptime</span>
                <span class="stat-value">{uptime_str}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Current Connections</span>
                <span class="stat-value">{len(connected_clients)}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Total Connections</span>
                <span class="stat-value">{server_stats["connections_total"]}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Messages Received</span>
                <span class="stat-value">{server_stats["messages_received"]}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Messages Sent</span>
                <span class="stat-value">{server_stats["messages_sent"]}</span>
            </div>
        </div>
        
        <div class="card connected-clients">
            <h2>Connected Clients</h2>
            {"".join([f'''
            <div class="stat">
                <span class="stat-label">Client {i+1}</span>
                <span class="stat-value">Connected for {int(time.time() - data["connected_at"])} seconds</span>
            </div>
            ''' for i, (client_id, data) in enumerate(connected_clients.items())])}
            
            {f'<p>No clients currently connected.</p>' if not connected_clients else ''}
        </div>
        
        <button class="refresh-btn" onclick="window.location.reload()">Refresh Dashboard</button>
        
        <div class="footer">
            <p>Server running on Heroku • <a href="https://github.com/nmanzini/sail" target="_blank">View Source on GitHub</a></p>
        </div>
        
        <script>
            // Auto-refresh the dashboard every 30 seconds
            setTimeout(() => window.location.reload(), 30000);
        </script>
    </body>
    </html>
    """
    
    # Respond with the HTML dashboard
    response = f"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {len(html)}\r\n\r\n{html}"
    await websocket.send(response)

async def main():
    host = "0.0.0.0"
    # Get port from environment variable (Heroku sets this)
    port = int(os.environ.get("PORT", 8765))
    
    logging.info(f"Starting WebSocket server on {host}:{port}")
    
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())