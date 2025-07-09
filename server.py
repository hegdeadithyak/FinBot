# -*- coding:   
# @Author: 
# @Date:   2025-07-09
# @Last Modified by:   
# @Last Modified time: 2025-07-09
import asyncio
import json
import logging
import os
import uuid
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import websockets
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import asyncio
import json
import logging
import os
import uuid
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from mistralai import Mistral
from mistralai.models import UserMessage, SystemMessage, AssistantMessage
import websockets
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ")
    MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "ft:open-mistral-7b:decdcd4d:20250602:4b4d086d")
    MISTRAL_AGENT_ID = os.getenv("MISTRAL_AGENT_ID", "ag:decdcd4d:20250602:finbot:c365517a")
    RETELL_API_KEY = os.getenv("RETELL_API_KEY", "key_5d7bf71cc24c6fc9f5b83a45c66e")
    HOST = os.getenv("HOST", "localhost")
    PORT = int(os.getenv("PORT", 8000))
    
    # WebSocket endpoint that Retell will connect to
    WEBSOCKET_PATH = "/llm-websocket"
# Initialize FastAPI appapp = FastAPI(title="Mistral AI + Retell AI Server", version="1.0.0")
app = FastAPI(title="Mistral AI + Retell AI Server", version="1.0.0")


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Mistral client
mistral_client = Mistral(api_key=Config.MISTRAL_API_KEY)

# Store active connections
active_connections: Dict[str, WebSocket] = {}

# Pydantic models for request/response validation
class RetellMessage(BaseModel):
    response_id: str
    content: str
    content_complete: bool
    end_call: bool

class ConversationUpdate(BaseModel):
    response_id: str
    content: str
    content_complete: bool
    end_call: bool = False

# Custom LLM handler class
class MistralLLMHandler:
    def __init__(self):
        self.conversation_history: Dict[str, list] = {}
        
    async def handle_message(self, call_id: str, message: dict) -> dict:
        """Handle incoming message from Retell and generate response using Mistral AI"""
        try:
            # Initialize conversation history if not exists
            if call_id not in self.conversation_history:
                self.conversation_history[call_id] = []
            
            # Extract user message
            user_message = message.get("transcript", [])
            if user_message:
                # Add user message to conversation history
                latest_message = user_message[-1]["content"] if user_message else ""
                self.conversation_history[call_id].append(
                    UserMessage(content=latest_message)
                )
            
            # Generate response using Mistral AI
            response = await self.generate_mistral_response(call_id)
            
            # Add assistant response to conversation history
            self.conversation_history[call_id].append(
                AssistantMessage(content=response)
            )
            
            return {
                "response_id": str(uuid.uuid4()),
                "content": response,
                "content_complete": True,
                "end_call": False
            }
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            return {
                "response_id": str(uuid.uuid4()),
                "content": "I apologize, but I'm having trouble processing your request right now.",
                "content_complete": True,
                "end_call": False
            }
    
    async def generate_mistral_response(self, call_id: str) -> str:
        """Generate response using Mistral AI"""
        try:
            # Get conversation history
            messages = self.conversation_history.get(call_id, [])
            
            # Add system message if this is the first message
            if len(messages) == 1:
                system_message = SystemMessage(
                    content="You are a helpful AI assistant in a voice conversation. "
                           "Keep your responses conversational, concise, and natural for speech. "
                           "Avoid using markdown or special formatting."
                )
                messages.insert(0, system_message)
            
            # Generate response using Mistral AI
            if Config.MISTRAL_AGENT_ID and Config.MISTRAL_AGENT_ID != "your-agent-id":
                # Use Mistral Agents API if agent ID is provided
                response = mistral_client.agents.complete(
                    agent_id=Config.MISTRAL_AGENT_ID,
                    messages=messages
                )
            else:
                # Use standard chat completion
                response = mistral_client.chat.complete(
                    model=Config.MISTRAL_MODEL,
                    messages=messages,
                    max_tokens=150,  # Keep responses concise for voice
                    temperature=0.7
                )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating Mistral response: {e}")
            return "I apologize, but I'm having trouble generating a response right now."

# Initialize LLM handler
llm_handler = MistralLLMHandler()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Mistral AI + Retell AI Server is running",
        "websocket_url": f"ws://{Config.HOST}:{Config.PORT}/llm-websocket",
        "websocket_pattern": f"ws://{Config.HOST}:{Config.PORT}/call_{{call_id}}",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {"status": "healthy", "timestamp": str(asyncio.get_event_loop().time())}

@app.post("/webhook")
async def retell_webhook(request: Request):
    """Handle Retell AI webhooks"""
    try:
        data = await request.json()
        logger.info(f"Received webhook: {data}")
        
        # Process webhook data as needed
        # This could include call start/end events, etc.
        
        return JSONResponse(content={"status": "received"})
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.websocket("/llm-websocket")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for Retell AI to connect to"""
    await websocket.accept()
    
    # Generate unique call ID
    call_id = str(uuid.uuid4())
    active_connections[call_id] = websocket
    
    logger.info(f"New WebSocket connection established: {call_id}")
    
    try:
        while True:
            # Receive message from Retell
            data = await websocket.receive_text()
            message = json.loads(data)
            
            logger.info(f"Received message: {message}")
            
            # Handle different message types
            if message.get("type") == "response_required":
                # Generate response using Mistral AI
                response = await llm_handler.handle_message(call_id, message)
                
                # Send response back to Retell
                await websocket.send_text(json.dumps(response))
                logger.info(f"Sent response: {response}")
                
            elif message.get("type") == "ping":
                # Respond to ping with pong
                await websocket.send_text(json.dumps({"type": "pong"}))
                
            elif message.get("type") == "call_ended":
                # Clean up conversation history
                if call_id in llm_handler.conversation_history:
                    del llm_handler.conversation_history[call_id]
                logger.info(f"Call ended: {call_id}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {call_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Clean up
        if call_id in active_connections:
            del active_connections[call_id]
        if call_id in llm_handler.conversation_history:
            del llm_handler.conversation_history[call_id]

@app.websocket("/call_{call_id}")
async def websocket_call_endpoint(websocket: WebSocket, call_id: str):
    """WebSocket endpoint for Retell AI specific call connections"""
    await websocket.accept()
    
    active_connections[call_id] = websocket
    
    logger.info(f"New Retell call WebSocket connection established: {call_id}")
    
    try:
        while True:
            # Receive message from Retell
            data = await websocket.receive_text()
            message = json.loads(data)
            
            logger.info(f"Received message for call {call_id}: {message}")
            
            # Handle different message types
            if message.get("type") == "response_required":
                # Generate response using Mistral AI
                response = await llm_handler.handle_message(call_id, message)
                
                # Send response back to Retell
                await websocket.send_text(json.dumps(response))
                logger.info(f"Sent response for call {call_id}: {response}")
                
            elif message.get("type") == "ping":
                # Respond to ping with pong
                await websocket.send_text(json.dumps({"type": "pong"}))
                
            elif message.get("type") == "call_ended":
                # Clean up conversation history
                if call_id in llm_handler.conversation_history:
                    del llm_handler.conversation_history[call_id]
                logger.info(f"Call ended: {call_id}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for call: {call_id}")
    except Exception as e:
        logger.error(f"WebSocket error for call {call_id}: {e}")
    finally:
        # Clean up
        if call_id in active_connections:
            del active_connections[call_id]
        if call_id in llm_handler.conversation_history:
            del llm_handler.conversation_history[call_id]

@app.post("/test-mistral")
async def test_mistral_connection():
    """Test endpoint to verify Mistral AI connection"""
    try:
        # Test message
        test_messages = [
            UserMessage(content="Hello, can you hear me?")
        ]
        
        if Config.MISTRAL_AGENT_ID and Config.MISTRAL_AGENT_ID != "your-agent-id":
            response = mistral_client.agents.complete(
                agent_id=Config.MISTRAL_AGENT_ID,
                messages=test_messages
            )
        else:
            response = mistral_client.chat.complete(
                model=Config.MISTRAL_MODEL,
                messages=test_messages,
                max_tokens=50
            )
        
        return {
            "status": "success",
            "model": Config.MISTRAL_MODEL,
            "agent_id": Config.MISTRAL_AGENT_ID,
            "response": response.choices[0].message.content
        }
        
    except Exception as e:
        logger.error(f"Mistral connection test failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.get("/connections")
async def get_active_connections():
    """Get number of active WebSocket connections"""
    return {
        "active_connections": len(active_connections),
        "connection_ids": list(active_connections.keys())
    }

if __name__ == "__main__":
    # Print configuration info
    print(f"🚀 Starting Mistral AI + Retell AI Server")
    print(f"📡 WebSocket endpoints:")
    print(f"   - ws://{Config.HOST}:{Config.PORT}/llm-websocket")
    print(f"   - ws://{Config.HOST}:{Config.PORT}/call_{{call_id}}")
    print(f"🤖 Mistral Model: {Config.MISTRAL_MODEL}")
    print(f"🎯 Agent ID: {Config.MISTRAL_AGENT_ID}")
    print(f"🌐 Server: http://{Config.HOST}:{Config.PORT}")
    print("=" * 50)
    
    # Run the server
    uvicorn.run(
        "server:app",  # Use import string format for reload
        host=Config.HOST,
        port=Config.PORT,
        log_level="info",
        reload=True  # Remove in production
    )