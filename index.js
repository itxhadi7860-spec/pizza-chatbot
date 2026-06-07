require("dotenv").config();
const express = require("express");
const { handleMessage } = require("./bot");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "pizza123";

// ===== WEBHOOK VERIFY (Meta se verification) =====
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ===== WEBHOOK RECEIVE (Messages aate hain) =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const from = message.from; // Customer ka number
    let messageText = "";

    // Text message
    if (message.type === "text") {
      messageText = message.text.body;
    }
    // Button reply
    else if (message.type === "interactive") {
      if (message.interactive.type === "button_reply") {
        messageText = message.interactive.button_reply.id;
      } else if (message.interactive.type === "list_reply") {
        messageText = message.interactive.list_reply.id;
      }
    }

    if (messageText) {
      console.log(`📩 From: ${from} | Msg: ${messageText}`);
      await handleMessage(from, messageText);
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
    time: new Date().toLocaleString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍕 Pizza Palace Chatbot started on port ${PORT}`);
});
