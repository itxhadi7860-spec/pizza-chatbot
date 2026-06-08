const { sendText, sendButtons, sendList } = require("./whatsapp");
const { getSession, resetSession, getCartTotal, getCartText, generateOrderId } = require("./session");
const menu = require("./menu");

// Restaurant Info
const RESTAURANT = {
  name: "🍕 Bistro Club",
  jazzcash: "03111679036",
  easypaisa: "03111679036",
  accountName: "Bistro Club Restaurant"
};

// Global orders store (dashboard ke liye)
if (!global.orders) global.orders = [];

async function handleMessage(from, messageText) {
  const text = messageText.trim().toLowerCase();
  const session = getSession(from);

  // HI - restart
  if (["hi", "hello", "ہائے", "سلام", "helo", "hii"].includes(text)) {
    resetSession(from);
    await sendWelcome(from);
    return;
  }

  switch (session.state) {
    case "welcome":
      await sendWelcome(from);
      break;
    case "main_menu":
      await handleMainMenu(from, text, session);
      break;
    case "category_selected":
      await handleCategorySelected(from, text, session);
      break;
    case "item_selected":
      await handleItemSelected(from, text, session);
      break;
    case "cart_options":
      await handleCartOptions(from, text, session);
      break;
    case "ordering_name":
      await handleOrderName(from, messageText, session);
      break;
    case "ordering_address":
      await handleOrderAddress(from, messageText, session);
      break;
    case "ordering_payment":
      await handleOrderPayment(from, text, session);
      break;
    case "order_confirm":
      await handleOrderConfirm(from, text, session);
      break;
    default:
      await sendWelcome(from);
  }
}

async function sendWelcome(from) {
  const session = getSession(from);
  session.state = "main_menu";
  await sendButtons(from,
    `${RESTAURANT.name} میں خوش آمدید! 🎉\n\nلذیذ کھانا آپ کے دروازے تک!\n\nکیا کرنا چاہیں گے؟`,
    [
      { id: "view_menu", title: "📋 مینو دیکھیں" },
      { id: "place_order", title: "🛒 آرڈر دیں" },
    ]
  );
}

async function handleMainMenu(from, text, session) {
  if (text === "view_menu" || text.includes("مینو") || text === "1") {
    session.state = "category_selected";
    await sendList(from,
      "کون سی کیٹیگری دیکھنا چاہتے ہیں؟ 👇",
      "کیٹیگری منتخب کریں",
      [{
        title: "ہمارا مینو",
        rows: [
          { id: "cat_pizza", title: "🍕 پیزا", description: "چیز، تندوری، BBQ" },
          { id: "cat_fastfood", title: "🍔 فاسٹ فوڈ", description: "برگر، زنگر، فرائز" },
          { id: "cat_rice", title: "🍚 رائس", description: "بریانی، پلاؤ" },
          { id: "cat_platter", title: "🍖 پلیٹر", description: "فیملی اور مینی پلیٹر" },
          { id: "cat_drinks", title: "🥤 ڈرنکس", description: "پیپسی، 7UP اور مزید" },
        ]
      }]
    );
  } else if (text === "place_order" || text === "2") {
    if (session.cart.length === 0) {
      session.state = "category_selected";
      await sendText(from, "پہلے مینو سے کچھ آئٹم منتخب کریں! 😊");
      await sendList(from, "کیٹیگری منتخب کریں:", "دیکھیں", [{
        title: "مینو",
        rows: [
          { id: "cat_pizza", title: "🍕 پیزا", description: "چیز، تندوری، BBQ" },
          { id: "cat_fastfood", title: "🍔 فاسٹ فوڈ", description: "برگر، زنگر، فرائز" },
          { id: "cat_rice", title: "🍚 رائس", description: "بریانی، پلاؤ" },
          { id: "cat_platter", title: "🍖 پلیٹر", description: "فیملی اور مینی پلیٹر" },
          { id: "cat_drinks", title: "🥤 ڈرنکس", description: "پیپسی، 7UP" },
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
  if (!catKey) {
    await sendText(from, "براہ کرم نمبر لکھیں 👇");
    return;
  }
  session.selectedCategory = catKey;
  session.state = "item_selected";
  const cat = menu[catKey];
  const rows = cat.items.map(item => ({
    id: `item_${item.id}`,
    title: item.name,
    description: `Rs. ${item.price}`
  }));
  await sendList(from, `${cat.name} - آئٹم منتخب کریں:`, "دیکھیں", [{ title: cat.name, rows }]);
}

async function handleItemSelected(from, text, session) {
  let itemId = text.replace("item_", "");
  let foundItem = null;
  for (const cat of Object.values(menu)) {
    const item = cat.items.find(i => i.id === itemId);
    if (item) { foundItem = item; break; }
  }
  if (!foundItem) {
    await sendText(from, "براہ کرم فہرست سے نمبر لکھیں 👇");
    return;
  }
  session.currentItem = foundItem;
  session.state = "cart_options";
  await sendButtons(from,
    `*${foundItem.name}*\nقیمت: Rs. ${foundItem.price}\n\nکتنی مقدار چاہیے؟`,
    [
      { id: "qty_1", title: "1️⃣ ایک" },
      { id: "qty_2", title: "2️⃣ دو" },
      { id: "qty_3", title: "3️⃣ تین" },
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
      `✅ *${item.name} x${qty}* کارٹ میں شامل!\n\n🛒 *آپ کا کارٹ:*\n${cartText}`,
      [
        { id: "view_menu", title: "➕ مزید آئٹم" },
        { id: "place_order", title: "🛒 آرڈر دیں" },
      ]
    );
  } else if (text === "clear_cart" || text === "3") {
    session.cart = [];
    session.state = "main_menu";
    await sendText(from, "🗑️ کارٹ صاف ہو گیا!");
    await sendWelcome(from);
  }
}

async function startOrdering(from, session) {
  session.state = "ordering_name";
  const cartText = getCartText(session.cart);
  await sendText(from,
    `🛒 *آپ کا کارٹ:*\n${cartText}\n\n📝 *آرڈر کے لیے معلومات*\n\n*مرحلہ 1/3:* اپنا پورا نام لکھیں:`
  );
}

async function handleOrderName(from, text, session) {
  session.orderInfo.name = text;
  session.state = "ordering_address";
  await sendText(from, `شکریہ *${text}*! 😊\n\n*مرحلہ 2/3:* اپنا پتہ لکھیں (گلی، محلہ، شہر):`);
}

async function handleOrderAddress(from, text, session) {
  session.orderInfo.address = text;
  session.state = "ordering_payment";
  await sendButtons(from,
    "*مرحلہ 3/3:* ادائیگی کا طریقہ منتخب کریں:",
    [
      { id: "pay_cash", title: "💵 کیش آن ڈیلیوری" },
      { id: "pay_easypaisa", title: "📱 ایزی پیسہ" },
      { id: "pay_jazzcash", title: "📱 جاز کیش" },
    ]
  );
}

async function handleOrderPayment(from, text, session) {
  const paymentMap = {
    pay_cash: "Cash on Delivery",
    pay_easypaisa: "Easypaisa",
    pay_jazzcash: "JazzCash",
    "1": "Cash on Delivery",
    "2": "Easypaisa",
    "3": "JazzCash"
  };
  const payment = paymentMap[text];
  if (!payment) {
    await sendText(from, "براہ کرم ادائیگی کا طریقہ منتخب کریں 👇");
    return;
  }
  session.orderInfo.payment = payment;
  session.state = "order_confirm";

  // Payment details dikhao
  let paymentDetails = "";
  if (payment === "Easypaisa") {
    paymentDetails = `\n\n📱 *Easypaisa تفصیل:*\nاکاؤنٹ نمبر: *${RESTAURANT.easypaisa}*\nنام: *${RESTAURANT.accountName}*`;
  } else if (payment === "JazzCash") {
    paymentDetails = `\n\n📱 *JazzCash تفصیل:*\nاکاؤنٹ نمبر: *${RESTAURANT.jazzcash}*\nنام: *${RESTAURANT.accountName}*`;
  }

  const cartText = getCartText(session.cart);
  const total = getCartTotal(session.cart);

  await sendButtons(from,
    `📋 *آرڈر کی تفصیل:*\n\n${cartText}\n\n👤 نام: ${session.orderInfo.name}\n📍 پتہ: ${session.orderInfo.address}\n💳 ادائیگی: ${payment}${paymentDetails}\n💰 کل: Rs. ${total}\n\nکیا آرڈر کنفرم کریں؟`,
    [
      { id: "confirm_yes", title: "✅ کنفرم کریں" },
      { id: "confirm_no", title: "❌ منسوخ کریں" },
    ]
  );
}

async function handleOrderConfirm(from, text, session) {
  if (text === "confirm_yes" || text === "1") {
    const orderId = generateOrderId();
    const total = getCartTotal(session.cart);
    const now = new Date();
    const timeStr = now.toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

    // Save order globally for dashboard
    const order = {
      orderId,
      customer: session.orderInfo.name,
      phone: from,
      address: session.orderInfo.address,
      payment: session.orderInfo.payment,
      items: [...session.cart],
      total,
      status: "pending",
      time: timeStr
    };
    global.orders.push(order);

    // Receipt banana
    const itemsList = session.cart.map(i => `${i.name} x${i.qty} = Rs. ${i.price * i.qty}`).join("\n");
    
    let paymentInfo = "";
    if (session.orderInfo.payment === "Easypaisa") {
      paymentInfo = `📱 Easypaisa: ${RESTAURANT.easypaisa}`;
    } else if (session.orderInfo.payment === "JazzCash") {
      paymentInfo = `📱 JazzCash: ${RESTAURANT.jazzcash}`;
    } else {
      paymentInfo = `💵 کیش آن ڈیلیوری`;
    }

    // Client ko receipt
    await sendText(from,
`🧾 ═══════════════════
   ${RESTAURANT.name}
   آرڈر کی رسید
═══════════════════

🆔 آرڈر ID: *${orderId}*
📅 وقت: ${timeStr}

👤 نام: ${session.orderInfo.name}
📍 پتہ: ${session.orderInfo.address}

📦 آئٹم:
${itemsList}

─────────────────
💰 کل رقم: *Rs. ${total}*
${paymentInfo}
⏳ Status: *Pending*
─────────────────

آپ کا آرڈر جلد تیار ہو جائے گا! 🍕

🙏 شکریہ! دوبارہ آرڈر کے لیے HI لکھیں۔
═══════════════════`
    );

    console.log("🆕 NEW ORDER:", JSON.stringify(order));
    resetSession(from);

  } else if (text === "confirm_no" || text === "2") {
    resetSession(from);
    await sendText(from, "آرڈر منسوخ ہو گیا۔ دوبارہ شروع کرنے کے لیے HI لکھیں! 😊");
  }
}

module.exports = { handleMessage };
