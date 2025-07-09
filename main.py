# -*- coding: utf-8 -*-
# @Author: 
# @Date:   2025-07-09
# @Last Modified by:   
# @Last Modified time: 2025-07-09
#!/usr/bin/env python3
"""
Alternative startup script for the Mistral AI + Retell AI Server
This avoids the reload warning by using the proper import string format
"""

import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
HOST = os.getenv("HOST", "localhost")
PORT = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    print("🚀 Starting Mistral AI + Retell AI Server")
    print(f"📡 WebSocket endpoint: ws://{HOST}:{PORT}/llm-websocket")
    print(f"🤖 Mistral Model: {os.getenv('MISTRAL_MODEL', 'mistral-large-latest')}")
    print(f"🎯 Agent ID: {os.getenv('MISTRAL_AGENT_ID', 'your-agent-id')}")
    print(f"🌐 Server: http://{HOST}:{PORT}")
    print("=" * 50)
    
    # Run with proper import string to avoid reload warning
    uvicorn.run(
        "server:app",
        host=HOST,
        port=PORT,
        log_level="info",
        reload=True,
        access_log=True
    )