require("dotenv").config();
const express = require("express");
const path = require("path");
const { handleMessage } = require("./bot");
const { resolveButtonId, sendText } = require("./whatsapp");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

if (!global.orders) global.orders = [];

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    if (body.typeWebhook === "incomingMessageReceived") {
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
        console.log(`MSG From: ${from} | Raw: ${messageText} | Resolved: ${resolved}`);
        await handleMessage(from, resolved);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

// Get all orders
app.get("/api/orders", (req, res) => {
  res.json(global.orders || []);
});

// Get today's stats
app.get("/api/stats", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = global.orders.filter(o => o.date === today);
  const completedToday = todayOrders.filter(o => o.status === "completed");
  const totalEarning = completedToday.reduce((sum, o) => sum + o.total, 0);

  // Category wise sales
  const categorySales = {};
  completedToday.forEach(order => {
    order.items.forEach(item => {
      const cat = getCategoryName(item.id);
      if (!categorySales[cat]) categorySales[cat] = { count: 0, revenue: 0 };
      categorySales[cat].count += item.qty;
      categorySales[cat].revenue += item.price * item.qty;
    });
  });

  res.json({
    totalOrders: todayOrders.length,
    completedOrders: completedToday.length,
    totalEarning,
    categorySales,
    pending: todayOrders.filter(o => o.status === "pending").length,
    preparation: todayOrders.filter(o => o.status === "preparation").length,
    dispatched: todayOrders.filter(o => o.status === "dispatched").length,
  });
});

function getCategoryName(itemId) {
  if (itemId.startsWith("p")) return "Pizza";
  if (itemId.startsWith("f")) return "Fast Food";
  if (itemId.startsWith("r")) return "Rice";
  if (itemId.startsWith("pl")) return "Platter";
  if (itemId.startsWith("d")) return "Drinks";
  return "Other";
}

// Update order status
app.post("/api/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const order = global.orders.find(o => o.orderId === orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = status;

  let msg = "";
  if (status === "preparation") {
    msg = `🍳 *${order.customer}*, your order *${orderId}* is being prepared!\n\nPlease wait a few minutes... 😊`;
  } else if (status === "dispatched") {
    msg = `🛵 *${order.customer}*, your order *${orderId}* is on the way!\n\nWill arrive shortly 🎉`;
  } else if (status === "completed") {
    msg = `✅ *${order.customer}*, your order *${orderId}* has been delivered!\n\n🙏 Thank you for ordering from *Usman Pizza Cafe*!\nPlease rate us ⭐⭐⭐⭐⭐\n\nType HI to order again 😊`;
  }

  if (msg && order.phone) await sendText(order.phone, msg);
  res.json({ success: true, order });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/health", (req, res) => {
  res.json({ status: "Usman Pizza Cafe Chatbot Running!", time: new Date().toLocaleString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Usman Pizza Cafe Chatbot started on port ${PORT}`);
});
