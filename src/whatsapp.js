const axios = require("axios");

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const BASE_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}`;

// Simple text message
async function sendText(to, text) {
  try {
    await axios.post(`${BASE_URL}/messages`, {
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    }, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
  } catch (err) {
    console.error("Send text error:", err.response?.data || err.message);
  }
}

// Interactive button message (max 3 buttons)
async function sendButtons(to, bodyText, buttons) {
  try {
    const btnList = buttons.slice(0, 3).map((b, i) => ({
      type: "reply",
      reply: { id: b.id || `btn_${i}`, title: b.title.substring(0, 20) }
    }));

    await axios.post(`${BASE_URL}/messages`, {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: { buttons: btnList }
      }
    }, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
  } catch (err) {
    console.error("Send buttons error:", err.response?.data || err.message);
    // Fallback to text
    await sendText(to, bodyText);
  }
}

// List message (for menus - up to 10 items)
async function sendList(to, bodyText, buttonTitle, sections) {
  try {
    await axios.post(`${BASE_URL}/messages`, {
      messaging_product: "whatsapp",
      to: to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: {
          button: buttonTitle,
          sections: sections
        }
      }
    }, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    });
  } catch (err) {
    console.error("Send list error:", err.response?.data || err.message);
    await sendText(to, bodyText);
  }
}

module.exports = { sendText, sendButtons, sendList };
