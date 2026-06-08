require("dotenv").config();
const express = require("express");
const path = require("path");
const { handleMessage } = require("./bot");
const { resolveButtonId, sendText } = require("./whatsapp");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

if (!global.orders) global.orders = [];

// ===== GREEN API WEBHOOK =====
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    const typeWebhook = body.typeWebhook;

    if (typeWebhook === "incomingMessageReceived") {
      const senderData = body.senderData;
      const messageData = body.messageData;
      if (!senderData || !messageData) return res.sendStatus(200);

      const chatId = senderData.chatId;
      const from = "+" + chatId.replace("@c.us", "");
      let messageText = "";

      if (messageData.typeMessage === "textMessage") {
        messageText = messageData.textMessageData?.textMessage || "";
      } else if (messageData.typeMessage === "extendedTextMessage") {
        messageText = messageData.extendedTextMessageData?.text || "";
      }

      if (messageText) {
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

// ===== DASHBOARD API =====
app.get("/api/orders", (req, res) => {
  res.json(global.orders || []);
});

app.post("/api/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const order = global.orders.find(o => o.orderId === orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });

  order.status = status;

  // Client ko message bhejo
  let msg = "";
  if (status === "preparation") {
    msg = `🍳 *Bistro Club*\n\nآپ کا آرڈر *${orderId}* تیار ہو رہا ہے!\n\nتھوڑا انتظار کریں... 😊`;
  } else if (status === "dispatched") {
    msg = `🛵 *Bistro Club*\n\nآپ کا آرڈر *${orderId}* راستے میں ہے!\n\nتھوڑی دیر میں پہنچ جائے گا 🎉`;
  } else if (status === "completed") {
    msg = `✅ *Bistro Club*\n\nآپ کا آرڈر *${orderId}* پہنچ گیا!\n\n🙏 شکریہ! ہمیں Rating دیں ⭐⭐⭐⭐⭐\n\nدوبارہ آرڈر کے لیے HI لکھیں 😊`;
  }

  if (msg && order.phone) {
    await sendText(order.phone, msg);
  }

  res.json({ success: true, order });
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/health", (req, res) => {
  res.json({ status: "✅ Bistro Club Chatbot Running!", time: new Date().toLocaleString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍕 Bistro Club Chatbot started on port ${PORT}`);
});
