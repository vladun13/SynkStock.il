const IS_DEMO = process.env.DEMO_MODE === 'true';

const mock = {
  async adjustInventory(inventoryItemId, locationId, delta) {
    return { success: true, newQuantity: null };
  },
  async getProducts(shopId) {
    return [];
  },
  async getLocations(shopId) {
    return [];
  },
};

const real = {
  async adjustInventory(inventoryItemId, locationId, delta) {
    throw new Error('Real Shopify client not implemented — set DEMO_MODE=true');
  },
  async getProducts(shopId) {
    throw new Error('Real Shopify client not implemented — set DEMO_MODE=true');
  },
  async getLocations(shopId) {
    throw new Error('Real Shopify client not implemented — set DEMO_MODE=true');
  },
};

module.exports = IS_DEMO ? mock : real;
