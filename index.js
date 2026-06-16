require("dotenv").config();
const express = require("express");
const path = require("path");
const { handleMessage } = require("./bot");
const { resolveButtonId, sendText } = require("./whatsapp");
const { connectDB, getAllOrders, updateOrderStatus } = require("./db");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Connect MongoDB on startup
connectDB();

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
app.get("/api/orders", async (req, res) => {
  const orders = await getAllOrders();
  res.json(orders);
});

app.post("/api/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await updateOrderStatus(orderId, status);
  if (!order) return res.status(404).json({ error: "Order not found" });

  // Client ko message bhejo
  let msg = "";
  if (status === "preparation") {
    msg = `🍳 *Bistro Club*\n\nYour order *${orderId}* is being prepared!\n\nPlease wait... 😊`;
  } else if (status === "dispatched") {
    msg = `🛵 *Bistro Club*\n\nYour order *${orderId}* is on the way!\n\nWill arrive shortly 🎉`;
  } else if (status === "completed") {
    msg = `✅ *Bistro Club*\n\nYour order *${orderId}* has been delivered!\n\n🙏 Thank you! Please rate us ⭐⭐⭐⭐⭐\n\nType HI to order again 😊`;
  }

  if (msg && order.phone) {
    await sendText(order.phone, msg);
  }

  res.json({ success: true, order });
});

// ===== DASHBOARD =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/health", (req, res) => {
  res.json({ status: "✅ Bistro Club Running!", time: new Date().toLocaleString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍕 Bistro Club Chatbot started on port ${PORT}`);
});
