const { MongoClient } = require("mongodb");

let db = null;
let client = null;

async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      console.log("⚠️ No MONGODB_URI, using memory only");
      return null;
    }
    client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db("bistro_club");
    console.log("✅ MongoDB connected!");
    return db;
  } catch (err) {
    console.error("⚠️ MongoDB failed, using memory:", err.message);
    db = null;
    return null;
  }
}

async function getDB() {
  if (db) return db;
  return await connectDB();
}

async function saveOrder(order) {
  // Always save to memory
  if (!global.orders) global.orders = [];
  global.orders.unshift(order);

  // Try MongoDB
  try {
    const database = await getDB();
    if (database) {
      await database.collection("orders").insertOne({ ...order });
      console.log("✅ Order saved to MongoDB:", order.orderId);
    }
  } catch (err) {
    console.log("⚠️ MongoDB save failed, kept in memory");
  }
}

async function getAllOrders() {
  // Try MongoDB first
  try {
    const database = await getDB();
    if (database) {
      const orders = await database.collection("orders").find({}).sort({ createdAt: -1 }).toArray();
      // Merge with memory orders that might not be in DB
      return orders;
    }
  } catch (err) {
    console.log("⚠️ MongoDB read failed, using memory");
  }
  // Fallback to memory
  return global.orders || [];
}

async function updateOrderStatus(orderId, status) {
  // Update in memory
  if (global.orders) {
    const order = global.orders.find(o => o.orderId === orderId);
    if (order) order.status = status;
  }

  // Try MongoDB
  try {
    const database = await getDB();
    if (database) {
      await database.collection("orders").updateOne(
        { orderId },
        { $set: { status } }
      );
      return await database.collection("orders").findOne({ orderId });
    }
  } catch (err) {
    console.log("⚠️ MongoDB update failed, updated in memory");
  }

  // Return from memory
  return global.orders ? global.orders.find(o => o.orderId === orderId) : null;
}

module.exports = { connectDB, saveOrder, getAllOrders, updateOrderStatus };
