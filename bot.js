const { sendText, sendButtons, sendList } = require("./whatsapp");
const { getSession, resetSession, getCartTotal, getCartText, generateOrderId } = require("./session");
const menu = require("./menu");

async function handleMessage(from, messageText) {
  const text = messageText.trim().toLowerCase();
  const session = getSession(from);

  // HI - restart
  if (["hi", "hello", "ہائے", "سلام", "helo", "hii"].includes(text)) {
    resetSession(from);
    await sendWelcome(from);
    return;
  }

  // Route based on state
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

// ===== WELCOME =====
async function sendWelcome(from) {
  const session = getSession(from);
  session.state = "main_menu";

  await sendButtons(from,
    "🍕 *پیزا پیلس میں خوش آمدید!* 🎉\n\nہم لذیذ کھانا آپ کے دروازے تک پہنچاتے ہیں!\n\nکیا کرنا چاہیں گے؟",
    [
      { id: "view_menu", title: "📋 مینو دیکھیں" },
      { id: "place_order", title: "🛒 آرڈر دیں" },
    ]
  );
}

// ===== MAIN MENU =====
async function handleMainMenu(from, text, session) {
  if (text === "view_menu" || text.includes("مینو")) {
    session.state = "category_selected";
    await sendList(from,
      "کون سی کیٹیگری دیکھنا چاہتے ہیں؟ 👇",
      "کیٹیگری منتخب کریں",
      [{
        title: "ہمارا مینو",
        rows: [
          { id: "cat_pizza", title: "🍕 پیزا", description: "چیز، تندوری، BBQ اور مزید" },
          { id: "cat_fastfood", title: "🍔 فاسٹ فوڈ", description: "برگر، زنگر، فرائز" },
          { id: "cat_rice", title: "🍚 رائس", description: "بریانی، پلاؤ" },
          { id: "cat_platter", title: "🍖 پلیٹر", description: "فیملی اور مینی پلیٹر" },
          { id: "cat_drinks", title: "🥤 ڈرنکس", description: "پیپسی، 7UP اور مزید" },
        ]
      }]
    );
  } else if (text === "place_order" || text.includes("آرڈر")) {
    if (session.cart.length === 0) {
      session.state = "category_selected";
      await sendText(from, "پہلے مینو سے کچھ آئٹم منتخب کریں! 😊");
      await sendList(from,
        "کون سی کیٹیگری دیکھنا چاہتے ہیں؟",
        "کیٹیگری منتخب کریں",
        [{
          title: "ہمارا مینو",
          rows: [
            { id: "cat_pizza", title: "🍕 پیزا", description: "چیز، تندوری، BBQ اور مزید" },
            { id: "cat_fastfood", title: "🍔 فاسٹ فوڈ", description: "برگر، زنگر، فرائز" },
            { id: "cat_rice", title: "🍚 رائس", description: "بریانی، پلاؤ" },
            { id: "cat_platter", title: "🍖 پلیٹر", description: "فیملی اور مینی پلیٹر" },
            { id: "cat_drinks", title: "🥤 ڈرنکس", description: "پیپسی، 7UP اور مزید" },
          ]
        }]
      );
    } else {
      await startOrdering(from, session);
    }
  } else {
    await sendWelcome(from);
  }
}

// ===== CATEGORY SELECTED =====
async function handleCategorySelected(from, text, session) {
  const catMap = {
    cat_pizza: "pizza",
    cat_fastfood: "fastfood",
    cat_rice: "rice",
    cat_platter: "platter",
    cat_drinks: "drinks"
  };

  const catKey = catMap[text];
  if (!catKey) {
    await sendText(from, "براہ کرم نیچے سے کیٹیگری منتخب کریں 👇");
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

  await sendList(from,
    `${cat.name} - آئٹم منتخب کریں:`,
    "آئٹم دیکھیں",
    [{ title: cat.name, rows }]
  );
}

// ===== ITEM SELECTED =====
async function handleItemSelected(from, text, session) {
  if (!text.startsWith("item_")) {
    await sendText(from, "براہ کرم فہرست سے آئٹم منتخب کریں 👇");
    return;
  }

  const itemId = text.replace("item_", "");
  let foundItem = null;

  for (const cat of Object.values(menu)) {
    const item = cat.items.find(i => i.id === itemId);
    if (item) { foundItem = item; break; }
  }

  if (!foundItem) {
    await sendText(from, "آئٹم نہیں ملا، دوبارہ کوشش کریں");
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

// ===== CART OPTIONS =====
async function handleCartOptions(from, text, session) {
  if (text.startsWith("qty_")) {
    const qty = parseInt(text.replace("qty_", ""));
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
  } else if (text === "clear_cart") {
    session.cart = [];
    session.state = "main_menu";
    await sendText(from, "🗑️ کارٹ صاف ہو گیا!");
    await sendWelcome(from);
  } else {
    await sendText(from, "براہ کرم مقدار منتخب کریں 👇");
  }
}

// ===== START ORDERING =====
async function startOrdering(from, session) {
  session.state = "ordering_name";
  session.orderStep = 1;
  const cartText = getCartText(session.cart);
  await sendText(from,
    `🛒 *آپ کا کارٹ:*\n${cartText}\n\n📝 *آرڈر کے لیے معلومات درکار ہے*\n\n*مرحلہ 1/3:* اپنا پورا نام لکھیں:`
  );
}

// ===== ORDER NAME =====
async function handleOrderName(from, text, session) {
  session.orderInfo.name = text;
  session.state = "ordering_address";
  await sendText(from, `شکریہ *${text}*! 😊\n\n*مرحلہ 2/3:* اپنا پتہ لکھیں (گلی، محلہ، شہر):`);
}

// ===== ORDER ADDRESS =====
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

// ===== ORDER PAYMENT =====
async function handleOrderPayment(from, text, session) {
  const paymentMap = {
    pay_cash: "Cash on Delivery",
    pay_easypaisa: "Easypaisa",
    pay_jazzcash: "JazzCash"
  };

  const payment = paymentMap[text];
  if (!payment) {
    await sendText(from, "براہ کرم ادائیگی کا طریقہ منتخب کریں 👇");
    return;
  }

  session.orderInfo.payment = payment;
  session.state = "order_confirm";

  const cartText = getCartText(session.cart);
  const total = getCartTotal(session.cart);

  await sendButtons(from,
    `📋 *آرڈر کی تفصیل:*\n\n${cartText}\n\n👤 نام: ${session.orderInfo.name}\n📍 پتہ: ${session.orderInfo.address}\n💳 ادائیگی: ${payment}\n💰 کل: Rs. ${total}\n\nکیا آرڈر کنفرم کریں؟`,
    [
      { id: "confirm_yes", title: "✅ ہاں کنفرم کریں" },
      { id: "confirm_no", title: "❌ منسوخ کریں" },
    ]
  );
}

// ===== ORDER CONFIRM =====
async function handleOrderConfirm(from, text, session) {
  if (text === "confirm_yes") {
    const orderId = generateOrderId();
    const total = getCartTotal(session.cart);

    await sendText(from,
      `✅ *آرڈر ہو گیا!* 🎉\n\n🆔 آرڈر ID: *${orderId}*\n💰 کل: *Rs. ${total}*\n💳 ادائیگی: *${session.orderInfo.payment}*\n⏳ Status: *Pending*\n\nآپ کا آرڈر جلد تیار ہو جائے گا! 🍕\n\n🙏 *شکریہ! دوبارہ آرڈر کے لیے HI لکھیں۔*`
    );

    // Log order to console (dashboard ke liye)
    console.log("NEW ORDER:", {
      orderId,
      customer: session.orderInfo.name,
      phone: from,
      address: session.orderInfo.address,
      payment: session.orderInfo.payment,
      items: session.cart,
      total
    });

    resetSession(from);

  } else if (text === "confirm_no") {
    resetSession(from);
    await sendText(from, "آرڈر منسوخ ہو گیا۔ دوبارہ شروع کرنے کے لیے HI لکھیں! 😊");
  }
}

module.exports = { handleMessage };
