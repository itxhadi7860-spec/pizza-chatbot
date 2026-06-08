const express = require('express');
const path = require('path');
const { handleIncomingMessage } = require('./src/bot'); // Aapki bot logic file

const app = express();
const port = process.env.PORT || 8080;

// Middleware - Yeh lines dashboard ka data aur static files samajhne ke liye zaroori hain
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Global orders array initialize karna agar pehle se nahi hai
if (!global.orders) {
    global.orders = [];
}

// 1. WhatsApp Webhook Route (Jo Twilio ya Infobip se message leta hai)
app.post('/webhook', async (req, res) => {
    try {
        // Aapke bot handler ko request pass karna
        await handleIncomingMessage(req, res);
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 2. Dashboard API - Saare active orders get karne ke liye
app.get('/api/orders', (req, res) => {
    res.json(global.orders || []);
});

// 3. Dashboard API - Order ka status (Pending -> Preparing -> Completed) update karne ke liye
app.post('/api/update-status', (req, res) => {
    const { orderId, status } = req.body;
    
    if (!global.orders) {
        global.orders = [];
    }

    // global.orders mein se order dhoondo uski ID se
    const order = global.orders.find(o => o.orderId === orderId);
    
    if (order) {
        order.status = status; // Status ko 'preparing' ya 'completed' set karega
        console.log(`✅ [DASHBOARD] Order ${orderId} status updated to: ${status}`);
        return res.json({ success: true, message: "Status updated successfully" });
    } else {
        console.log(`❌ [DASHBOARD] Order ${orderId} list mein nahi mila!`);
        return res.status(404).json({ success: false, message: "Order not found" });
    }
});

// 4. Default Route - Jo main dashboard HTML page load karega
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Server Start
app.listen(port, () => {
    console.log(`🍕 Bistro Club Chatbot & Dashboard started on port ${port}`);
});
