class User {
  constructor(name, socketId) {
    this.name = name;
    this.socketId = socketId;
    this.activity = true;
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
  }
  getProfit() {
    return this.items.reduce((total, item) => {
      return total + (item.price - item.getCasePrice());
    }, 0);
  }
  toString() {
    return `User: ${this.name}, ID: ${this.id}, Active: ${
      this.activity
    }, Items: ${this.items.length}, Profit: ${this.getProfit()}`;
  }
}

module.exports = User;
