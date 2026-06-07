require("dotenv").config();
const express = require("express");
const { handleMessage } = require("./bot");
const { resolveButtonId } = require("./whatsapp");

const app = express();
app.use(express.json());

// ===== GREEN API WEBHOOK =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Webhook received:", JSON.stringify(body).substring(0, 200));

    // Green API webhook format
    const typeWebhook = body.typeWebhook;
    
    if (typeWebhook === "incomingMessageReceived") {
      const senderData = body.senderData;
      const messageData = body.messageData;
      
      if (!senderData || !messageData) return res.sendStatus(200);
      
      // Extract phone number
      const chatId = senderData.chatId; // format: 923141679038@c.us
      const from = "+" + chatId.replace("@c.us", "");
      
      let messageText = "";
      
      if (messageData.typeMessage === "textMessage") {
        messageText = messageData.textMessageData?.textMessage || "";
      } else if (messageData.typeMessage === "extendedTextMessage") {
        messageText = messageData.extendedTextMessageData?.text || "";
      }
      
      if (messageText) {
        // Resolve number to button ID if user typed a number
        const resolved = resolveButtonId(from, messageText);
        console.log(`📩 From: ${from} | Raw: ${messageText} | Resolved: ${resolved}`);
        await handleMessage(from, resolved);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({
    status: "✅ Pizza Palace Chatbot Running!",
    api: "Green API",
    time: new Date().toLocaleString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍕 Pizza Palace Chatbot started on port ${PORT}`);
});
