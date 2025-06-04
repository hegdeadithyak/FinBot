/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-06-03
 */
import express from 'express';
import { Mistral } from "@mistralai/mistralai";
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.json());
app.use(cors());

const client = new Mistral({
  apiKey: "6TcdJZMB27yANAbVT3MBpQvp5iPR97vZ",
});

const FINBOT_AGENT_ID = "ag:decdcd4d:20250602:finbot:c365517a";

app.post('/api/chat/simple', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "'messages' array is required and cannot be empty." });
  }

  try {
    const response = await client.agents.complete({
      agentId: FINBOT_AGENT_ID,
      messages,
    });

    res.json({
      response: response.choices?.[0]?.message?.content || '',
      agentId: FINBOT_AGENT_ID,
      model: "ft:open-mistral-7b:decdcd4d:20250602:4b4d086d",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent completion error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "'messages' array is required and cannot be empty." });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    const stream = await client.agents.stream({
      agentId: FINBOT_AGENT_ID,
      messages,
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
    res.end();
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    ok:'true',
    agentId: FINBOT_AGENT_ID,
    model: "ft:open-mistral-7b:decdcd4d:20250602:4b4d086d",
    timestamp: new Date().toISOString(),
    server: 'FinBot Agent API'
  });
});

// Agent info endpoint
app.get('/api/agent/info', (req, res) => {
  res.json({
    agentId: FINBOT_AGENT_ID,
    name: "FinBot",
    description: "Intelligent, multilingual banking assistant operated by Hegde Adithya Kota",
    capabilities: [
      "Banking queries",
      "Account management",
      "Financial advice",
      "RAG-enhanced responses",
      "Live web search",
      "Multilingual support"
    ],
    model: "ft:open-mistral-7b:decdcd4d:20250602:4b4d086d",
    temperature: 0.7
  });
});

// app.get('/api/auth/health')

// Default route handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    availableRoutes: [
      'POST /api/chat/simple',
      'POST /api/chat',
      'GET /health',
      'GET /api/agent/info'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🤖 FinBot Agent API server running on port ${PORT}`);
  console.log(`🆔 Using Agent ID: ${FINBOT_AGENT_ID}`);
  console.log(`📊 Base Model: ft:open-mistral-7b:decdcd4d:20250602:4b4d086d`);
  console.log(`🔗 Simple endpoint: http://localhost:${PORT}/api/chat/simple`);
  console.log(`🔗 Streaming endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`ℹ️  Agent info: http://localhost:${PORT}/api/agent/info`);
});
