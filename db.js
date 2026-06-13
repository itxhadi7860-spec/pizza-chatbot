const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
let db = null;

async function connectDB() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db("bistro_club");
    console.log("✅ MongoDB connected!");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
}

async function getDB() {
  if (!db) await connectDB();
  return db;
}

// Save order
async function saveOrder(order) {
  try {
    const database = await getDB();
    await database.collection("orders").insertOne(order);
    console.log("✅ Order saved to DB:", order.orderId);
  } catch (err) {
    console.error("❌ Save order error:", err.message);
  }
}

// Get all orders
async function getAllOrders() {
  try {
    const database = await getDB();
    return await database.collection("orders").find({}).sort({ _id: -1 }).toArray();
  } catch (err) {
    console.error("❌ Get orders error:", err.message);
    return [];
  }
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    const database = await getDB();
    await database.collection("orders").updateOne(
      { orderId },
      { $set: { status } }
    );
    return await database.collection("orders").findOne({ orderId });
  } catch (err) {
    console.error("❌ Update status error:", err.message);
    return null;
  }
}

module.exports = { connectDB, saveOrder, getAllOrders, updateOrderStatus };
