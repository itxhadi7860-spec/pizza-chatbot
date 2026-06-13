const menu = {
  pizza: {
    name: "🍕 Pizza",
    category: "Pizza",
    items: [
      { id: "p1", name: "Cheese Pizza", price: 550 },
      { id: "p2", name: "Tandoori Pizza", price: 650 },
      { id: "p3", name: "BBQ Pizza", price: 700 },
      { id: "p4", name: "Chicken Pizza", price: 680 },
      { id: "p5", name: "Veggie Pizza", price: 500 },
    ]
  },
  fastfood: {
    name: "🍔 Fast Food",
    category: "Fast Food",
    items: [
      { id: "f1", name: "Burger", price: 280 },
      { id: "f2", name: "Zinger Burger", price: 350 },
      { id: "f3", name: "Fries", price: 150 },
      { id: "f4", name: "Chicken Roll", price: 220 },
    ]
  },
  rice: {
    name: "🍚 Rice",
    category: "Rice",
    items: [
      { id: "r1", name: "Chicken Biryani", price: 350 },
      { id: "r2", name: "Mutton Biryani", price: 450 },
      { id: "r3", name: "Pulao", price: 300 },
    ]
  },
  platter: {
    name: "🍖 Platter",
    category: "Platter",
    items: [
      { id: "pl1", name: "Family Platter", price: 1800 },
      { id: "pl2", name: "Mini Platter", price: 950 },
      { id: "pl3", name: "BBQ Platter", price: 1200 },
    ]
  },
  drinks: {
    name: "🥤 Drinks",
    category: "Drinks",
    items: [
      { id: "d1", name: "Pepsi", price: 80 },
      { id: "d2", name: "7UP", price: 80 },
      { id: "d3", name: "Miranda", price: 80 },
      { id: "d4", name: "Water", price: 50 },
    ]
  }
};

module.exports = menu;
