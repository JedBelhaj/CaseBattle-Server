class Item {
  constructor(itemId, price) {
    this.itemId = itemId;
    this.price = price;
  }
  getCasePrice() {
    return 5;
  }
}

module.exports = Item;
