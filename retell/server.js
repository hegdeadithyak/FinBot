   
/**
 * @Author: Adithya
 * @Date:   2025-06-02
 * @Last Modified by:   Adithya
 * @Last Modified time: 2025-07-09
 */
import express from 'express';
import { Mistral } from "@mistralai/mistralai";
import dotenv from 'dotenv';
import cors from 'cors';
import nodemailer from 'nodemailer';
// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3002;
const app = express();

app.use(express.json());
app.use(cors());

const client = new Mistral({
  apiKey: "nfmpeCwgZ6GDeH30qSyhw4DfeB1PPhFZ",
});

const FINBOT_AGENT_ID = "ag:26507ac4:20250604:finbot:9cc49639";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'adithyahegdek@gmail.com',
    pass: 'iohv qkym tmss qrve' // App password
  }
});

// Function to get bank support email based on bank name
function getBankSupportEmail(bankName) {
  const bankEmails = {
    'bank of america': 'customercare@bankofamerica.com',
    'chase': 'customer.service@chase.com',
    'wells fargo': 'customerservice@wellsfargo.com',
    'citibank': 'customerservice@citibank.com',
    'us bank': 'customerservice@usbank.com',
    'pnc bank': 'customerservice@pnc.com',
    'truist': 'customerservice@truist.com',
    'td bank': 'customerservice@td.com',
    'capital one': 'customerservice@capitalone.com',
    'regions bank': 'customerservice@regions.com',
    'default': 'customerservice@' + bankName.toLowerCase().replace(/\s+/g, '') + '.com'
  };
  
  const normalizedBank = bankName.toLowerCase().trim();
  return bankEmails[normalizedBank] || bankEmails['default'];
}

// Main endpoint
app.post('/api/chat/simple', async (req, res) => {
  const { name, email, mobile, accountNo, bank, query } = req.body;
  
  // Validate required fields
  if (!name || !email || !mobile || !accountNo || !bank || !query) {
    return res.status(400).json({ 
      error: "All fields are required: name, email, mobile, accountNo, bank, query" 
    });
  }

  try {
    // First, use Mistral agent to generate email subject
    const subjectMessages = [
      {
        role: 'user',
        content: `Generate a professional email subject line for a bank customer inquiry. The customer's query is: "${query}". The subject should be concise, professional, and clearly indicate the nature of the inquiry. Only return the subject line, nothing else.`
      }
    ];

    const subjectResponse = await client.agents.complete({
      agentId: FINBOT_AGENT_ID,
      messages: subjectMessages,
    });

    const emailSubject = subjectResponse.choices?.[0]?.message?.content?.trim() || 'Customer Service Inquiry';

    // Then, use Mistral agent to generate email body
    const bodyMessages = [
      {
        role: 'user',
        content: `Generate a professional email body for a bank customer inquiry with the following details:
        
        Customer Name: ${name}
        Email: ${email}
        Mobile: ${mobile}
        Account Number: ${accountNo}
        Bank: ${bank}
        Query: ${query}
        
        The email should be:
        - Professional and courteous
        - Include all customer details clearly
        - Present the query in a clear manner
        - Request appropriate assistance
        - Include proper greeting and closing
        
        Format it as a complete email body that can be sent directly to bank customer service.`
      }
    ];

    const bodyResponse = await client.agents.complete({
      agentId: FINBOT_AGENT_ID,
      messages: bodyMessages,
    });

    const emailBody = bodyResponse.choices?.[0]?.message?.content || 'Customer inquiry details attached.';

    // Get bank support email
    const bankSupportEmail = getBankSupportEmail(bank);

    // Prepare email options
    const mailOptions = {
      from: {
        name: name,
        address: email
      },
      to: bankSupportEmail,
      subject: emailSubject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="color: #0066cc; margin: 0;">Customer Service Inquiry</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Customer Details:</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Mobile:</strong> ${mobile}</p>
            <p style="margin: 5px 0;"><strong>Account Number:</strong> ${accountNo}</p>
            <p style="margin: 5px 0;"><strong>Bank:</strong> ${bank}</p>
          </div>
          
          <div style="line-height: 1.6;">
            ${emailBody.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This email was sent through our customer service portal. Please respond directly to the customer's email address: ${email}
            </p>
          </div>
        </div>
      `
    };

    // Send email to bank
    await transporter.sendMail(mailOptions);

    // Also send confirmation email to customer
    const confirmationEmail = {
      from: {
        name: 'Customer Service Portal',
        address: 'adithyahegdek@gmail.com'
      },
      to: email,
      subject: 'Your inquiry has been submitted to ' + bank,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(to right, #0066cc, #004499); height: 5px; margin-bottom: 20px;"></div>
          
          <h2 style="color: #0066cc; margin-bottom: 20px;">Inquiry Submitted Successfully</h2>
          
          <p>Dear ${name},</p>
          
          <p>Thank you for contacting us. Your inquiry has been successfully submitted to ${bank} customer service.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Inquiry Details:</h3>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${emailSubject}</p>
            <p style="margin: 5px 0;"><strong>Account Number:</strong> ${accountNo}</p>
            <p style="margin: 5px 0;"><strong>Submitted to:</strong> ${bankSupportEmail}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>You should expect a response from ${bank} within 1-2 business days. They will contact you directly at this email address or the phone number you provided.</p>
          
          <p>If you have any additional questions or need to follow up on this inquiry, please keep this email for your records.</p>
          
          <p>Best regards,<br>Customer Service Portal</p>
          
          <div style="background: linear-gradient(to right, #0066cc, #004499); height: 5px; margin-top: 20px;"></div>
        </div>
      `
    };

    await transporter.sendMail(confirmationEmail);

    // Return response
    res.json({
      success: true,
      message: 'Email sent successfully to bank customer service',
      emailSubject: emailSubject,
      bankEmail: bankSupportEmail,
      agentId: FINBOT_AGENT_ID,
      model: "ft:open-mistral-7b:decdcd4d:20250602:4b4d086d",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email to bank customer service',
      details: error.message 
    });
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
    temperature: 0.5
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