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
  if (cart.length === 0) return "Cart is empty";
  const items = cart.map(i => `• ${i.name} x${i.qty} = Rs. ${i.price * i.qty}`).join("\n");
  const total = getCartTotal(cart);
  return `${items}\n\n💰 Total: Rs. ${total}`;
}

function generateOrderId() {
  return "#BC-" + Math.floor(Math.random() * 9000 + 1000);
}

module.exports = { getSession, resetSession, getCartTotal, getCartText, generateOrderId };
