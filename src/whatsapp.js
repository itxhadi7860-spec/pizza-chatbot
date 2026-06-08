const axios = require("axios");

const INSTANCE_ID = process.env.GREEN_INSTANCE_ID;
const API_TOKEN = process.env.GREEN_API_TOKEN;
const BASE_URL = `https://api.green-api.com/waInstance${INSTANCE_ID}`;

// Simple text message
async function sendText(to, text) {
  try {
    // Green API format: remove + from number
    const chatId = to.replace("+", "") + "@c.us";
    
    await axios.post(`${BASE_URL}/sendMessage/${API_TOKEN}`, {
      chatId: chatId,
      message: text
    });
    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error("Send text error:", err.response?.data || err.message);
  }
}

// Buttons — Green API mein buttons nahi hote, text se kaam chalate hain
async function sendButtons(to, bodyText, buttons) {
  const btnText = buttons.map((b, i) => `${i + 1}️⃣ ${b.title}`).join("\n");
  const fullText = `${bodyText}\n\n${btnText}`;
  
  // Store button mapping globally
  if (!global.buttonMaps) global.buttonMaps = {};
  if (!global.buttonMaps[to]) global.buttonMaps[to] = {};
  buttons.forEach((b, i) => {
    global.buttonMaps[to][(i + 1).toString()] = b.id;
    // Also map by title keywords
    global.buttonMaps[to][b.title.toLowerCase()] = b.id;
  });
  
  await sendText(to, fullText);
}

// List message — text ke roop mein
async function sendList(to, bodyText, buttonTitle, sections) {
  if (!global.buttonMaps) global.buttonMaps = {};
  if (!global.buttonMaps[to]) global.buttonMaps[to] = {};
  
  let listText = `${bodyText}\n\n`;
  let counter = 1;
  
  sections.forEach(section => {
    section.rows.forEach(row => {
      const desc = row.description ? ` — ${row.description}` : "";
      listText += `${counter}️⃣ ${row.title}${desc}\n`;
      global.buttonMaps[to][counter.toString()] = row.id;
      counter++;
    });
  });
  
  listText += `\n✏️ نمبر لکھ کر جواب دیں`;
  await sendText(to, listText);
}

// Resolve button ID from user input
function resolveButtonId(to, input) {
  if (!global.buttonMaps || !global.buttonMaps[to]) return input;
  const map = global.buttonMaps[to];
  return map[input.trim()] || map[input.trim().toLowerCase()] || input;
}

module.exports = { sendText, sendButtons, sendList, resolveButtonId };
