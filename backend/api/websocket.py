from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict
from core.security import decode_token

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    # Verify token
    payload = decode_token(token)
    
    if not payload:
        await websocket.close(code=1008)
        return
    
    user_id = payload.get("user_id")
    
    await manager.connect(user_id, websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming messages if needed
            await manager.send_personal_message({"echo": data}, user_id)
    
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# Helper function to send notifications
async def send_notification(user_id: int, notification_type: str, message: str, data: dict = None):
    notification_data = {
        "type": notification_type,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_personal_message(notification_data, user_id)