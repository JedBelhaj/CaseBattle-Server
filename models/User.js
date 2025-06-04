import { randomBytes } from "crypto";
const generateToken = () => randomBytes(16).toString("hex");

class User {
  constructor(name, isHost = false) {
    this.name = name;
    this.sessionToken = generateToken();
    this.activity = false;
    this.items = [];
    this.host = isHost;
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

export default User;
