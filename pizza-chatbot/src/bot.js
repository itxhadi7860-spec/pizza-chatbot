const { sendText, sendButtons, sendList } = require("./whatsapp");
const { getSession, resetSession, getCartTotal, getCartText, generateOrderId } = require("./session");
const menu = require("./menu");

const RESTAURANT = {
  name: "Bistro Club",
  emoji: "🍕",
  jazzcash: "03111679036",
  easypaisa: "03111679036",
  accountName: "Bistro Club",
  phone: "+92 311 1679036"
};

if (!global.orders) global.orders = [];

async function handleMessage(from, messageText) {
  const text = messageText.trim().toLowerCase();
  const session = getSession(from);

  if (["hi", "hello", "hey", "start"].includes(text)) {
    resetSession(from);
    await sendWelcome(from);
    return;
  }

  switch (session.state) {
    case "welcome": await sendWelcome(from); break;
    case "main_menu": await handleMainMenu(from, text, session); break;
    case "category_selected": await handleCategorySelected(from, text, session); break;
    case "item_selected": await handleItemSelected(from, text, session); break;
    case "cart_options": await handleCartOptions(from, text, session); break;
    case "ordering_name": await handleOrderName(from, messageText, session); break;
    case "ordering_address": await handleOrderAddress(from, messageText, session); break;
    case "ordering_payment": await handleOrderPayment(from, text, session); break;
    case "order_confirm": await handleOrderConfirm(from, text, session); break;
    default: await sendWelcome(from);
  }
}

async function sendWelcome(from) {
  const session = getSession(from);
  session.state = "main_menu";
  await sendButtons(from,
    `${RESTAURANT.emoji} *Welcome to ${RESTAURANT.name}!* 🎉\n\nDelicious food delivered to your door!\n\nWhat would you like to do?`,
    [
      { id: "view_menu", title: "📋 View Menu" },
      { id: "place_order", title: "🛒 Place Order" },
    ]
  );
}

async function handleMainMenu(from, text, session) {
  if (text === "view_menu" || text === "1") {
    session.state = "category_selected";
    await sendList(from, "Select a category 👇", "View Category", [{
      title: "Our Menu",
      rows: [
        { id: "cat_pizza", title: "🍕 Pizza", description: "Cheese, Tandoori, BBQ" },
        { id: "cat_fastfood", title: "🍔 Fast Food", description: "Burger, Zinger, Fries" },
        { id: "cat_rice", title: "🍚 Rice", description: "Biryani, Pulao" },
        { id: "cat_platter", title: "🍖 Platter", description: "Family & Mini Platters" },
        { id: "cat_drinks", title: "🥤 Drinks", description: "Pepsi, 7UP & more" },
      ]
    }]);
  } else if (text === "place_order" || text === "2") {
    if (session.cart.length === 0) {
      session.state = "category_selected";
      await sendText(from, "Please add items to your cart first! 😊");
      await sendList(from, "Select a category:", "View", [{
        title: "Menu",
        rows: [
          { id: "cat_pizza", title: "🍕 Pizza", description: "Cheese, Tandoori, BBQ" },
          { id: "cat_fastfood", title: "🍔 Fast Food", description: "Burger, Zinger, Fries" },
          { id: "cat_rice", title: "🍚 Rice", description: "Biryani, Pulao" },
          { id: "cat_platter", title: "🍖 Platter", description: "Family & Mini Platters" },
          { id: "cat_drinks", title: "🥤 Drinks", description: "Pepsi, 7UP" },
        ]
      }]);
    } else {
      await startOrdering(from, session);
    }
  } else {
    await sendWelcome(from);
  }
}

async function handleCategorySelected(from, text, session) {
  const catMap = {
    cat_pizza: "pizza", "1": "pizza",
    cat_fastfood: "fastfood", "2": "fastfood",
    cat_rice: "rice", "3": "rice",
    cat_platter: "platter", "4": "platter",
    cat_drinks: "drinks", "5": "drinks"
  };
  const catKey = catMap[text];
  if (!catKey) { await sendText(from, "Please enter a number 👇"); return; }
  session.selectedCategory = catKey;
  session.state = "item_selected";
  const cat = menu[catKey];
  const rows = cat.items.map(item => ({
    id: `item_${item.id}`,
    title: item.name,
    description: `Rs. ${item.price}`
  }));
  await sendList(from, `${cat.name} - Select an item:`, "View", [{ title: cat.name, rows }]);
}

async function handleItemSelected(from, text, session) {
  const itemId = text.replace("item_", "");
  let foundItem = null;
  for (const cat of Object.values(menu)) {
    const item = cat.items.find(i => i.id === itemId);
    if (item) { foundItem = item; break; }
  }
  if (!foundItem) { await sendText(from, "Please select from the list 👇"); return; }
  session.currentItem = foundItem;
  session.state = "cart_options";
  await sendButtons(from,
    `*${foundItem.name}*\nPrice: Rs. ${foundItem.price}\n\nSelect quantity:`,
    [
      { id: "qty_1", title: "1️⃣ One" },
      { id: "qty_2", title: "2️⃣ Two" },
      { id: "qty_3", title: "3️⃣ Three" },
    ]
  );
}

async function handleCartOptions(from, text, session) {
  if (text.startsWith("qty_") || ["1","2","3"].includes(text)) {
    const qty = text.startsWith("qty_") ? parseInt(text.replace("qty_", "")) : parseInt(text);
    const item = session.currentItem;
    const existing = session.cart.find(i => i.id === item.id);
    if (existing) existing.qty += qty;
    else session.cart.push({ ...item, qty });
    const cartText = getCartText(session.cart);
    session.state = "main_menu";
    await sendButtons(from,
      `✅ *${item.name} x${qty}* added to cart!\n\n🛒 *Your Cart:*\n${cartText}`,
      [
        { id: "view_menu", title: "➕ Add More" },
        { id: "place_order", title: "🛒 Place Order" },
      ]
    );
  } else if (text === "clear_cart" || text === "3") {
    session.cart = [];
    session.state = "main_menu";
    await sendText(from, "🗑️ Cart cleared!");
    await sendWelcome(from);
  }
}

async function startOrdering(from, session) {
  session.state = "ordering_name";
  const cartText = getCartText(session.cart);
  await sendText(from, `🛒 *Your Cart:*\n${cartText}\n\n📝 *Order Details Required*\n\n*Step 1/3:* Please enter your full name:`);
}

async function handleOrderName(from, text, session) {
  session.orderInfo.name = text;
  session.state = "ordering_address";
  await sendText(from, `Thank you *${text}*! 😊\n\n*Step 2/3:* Please enter your delivery address:`);
}

async function handleOrderAddress(from, text, session) {
  session.orderInfo.address = text;
  session.state = "ordering_payment";
  await sendButtons(from,
    "*Step 3/3:* Select payment method:",
    [
      { id: "pay_cash", title: "💵 Cash on Delivery" },
      { id: "pay_easypaisa", title: "📱 Easypaisa" },
      { id: "pay_jazzcash", title: "📱 JazzCash" },
    ]
  );
}

async function handleOrderPayment(from, text, session) {
  const paymentMap = {
    pay_cash: "Cash on Delivery", "1": "Cash on Delivery",
    pay_easypaisa: "Easypaisa", "2": "Easypaisa",
    pay_jazzcash: "JazzCash", "3": "JazzCash"
  };
  const payment = paymentMap[text];
  if (!payment) { await sendText(from, "Please select a payment method 👇"); return; }
  session.orderInfo.payment = payment;
  session.state = "order_confirm";

  let paymentDetails = "";
  if (payment === "Easypaisa") paymentDetails = `\n\n📱 *Easypaisa:*\nAccount: *${RESTAURANT.easypaisa}*\nName: *${RESTAURANT.accountName}*`;
  else if (payment === "JazzCash") paymentDetails = `\n\n📱 *JazzCash:*\nAccount: *${RESTAURANT.jazzcash}*\nName: *${RESTAURANT.accountName}*`;

  const cartText = getCartText(session.cart);
  const total = getCartTotal(session.cart);

  await sendButtons(from,
    `📋 *Order Summary:*\n\n${cartText}\n\n👤 Name: ${session.orderInfo.name}\n📍 Address: ${session.orderInfo.address}\n💳 Payment: ${payment}${paymentDetails}\n💰 Total: Rs. ${total}\n\nConfirm your order?`,
    [
      { id: "confirm_yes", title: "✅ Confirm Order" },
      { id: "confirm_no", title: "❌ Cancel" },
    ]
  );
}

async function handleOrderConfirm(from, text, session) {
  if (text === "confirm_yes" || text === "1") {
    const orderId = generateOrderId();
    const total = getCartTotal(session.cart);
    const now = new Date();
    const timeStr = now.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
    const today = now.toISOString().split("T")[0];

    const order = {
      orderId,
      customer: session.orderInfo.name,
      phone: from,
      address: session.orderInfo.address,
      payment: session.orderInfo.payment,
      items: [...session.cart],
      total,
      status: "pending",
      time: timeStr,
      date: today
    };
    global.orders.push(order);

    const itemsList = session.cart.map(i => `${i.name} x${i.qty} = Rs. ${i.price * i.qty}`).join("\n");
    let paymentInfo = session.orderInfo.payment === "Easypaisa" ? `📱 Easypaisa: ${RESTAURANT.easypaisa}` :
                      session.orderInfo.payment === "JazzCash" ? `📱 JazzCash: ${RESTAURANT.jazzcash}` : `💵 Cash on Delivery`;

    await sendText(from,
`🧾 ══════════════════
   ${RESTAURANT.emoji} ${RESTAURANT.name}
   ORDER RECEIPT
══════════════════

🆔 Order ID: *${orderId}*
📅 Time: ${timeStr}

👤 Name: ${session.orderInfo.name}
📞 Phone: ${from}
📍 Address: ${session.orderInfo.address}

📦 Items:
${itemsList}

──────────────────
💰 Total: *Rs. ${total}*
${paymentInfo}
⏳ Status: *Pending*
──────────────────

Your order will be ready soon! 🍕

🙏 Thank you! Type HI to order again.
══════════════════`
    );

    console.log("🆕 NEW ORDER:", JSON.stringify(order));
    resetSession(from);

  } else if (text === "confirm_no" || text === "2") {
    resetSession(from);
    await sendText(from, "Order cancelled. Type HI to start again! 😊");
  }
}

module.exports = { handleMessage };
