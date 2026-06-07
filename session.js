// In-memory session store
// Each user gets their own state
const sessions = {};

function getSession(phone) {
  if (!sessions[phone]) {
    sessions[phone] = {
      state: "welcome",
      cart: [],
      orderInfo: { name: "", address: "", payment: "" },
      orderStep: 0,
      selectedCategory: null,
    };
  }
  return sessions[phone];
}

function resetSession(phone) {
  sessions[phone] = {
    state: "welcome",
    cart: [],
    orderInfo: { name: "", address: "", payment: "" },
    orderStep: 0,
    selectedCategory: null,
  };
  return sessions[phone];
}

function getCartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartText(cart) {
  if (cart.length === 0) return "کارٹ خالی ہے";
  const items = cart.map(i => `• ${i.name} x${i.qty} = Rs. ${i.price * i.qty}`).join("\n");
  const total = getCartTotal(cart);
  return `${items}\n\n💰 کل: Rs. ${total}`;
}

function generateOrderId() {
  return "#PP-" + Math.floor(Math.random() * 9000 + 1000);
}

module.exports = { getSession, resetSession, getCartTotal, getCartText, generateOrderId };
