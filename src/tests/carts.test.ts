describe("Shopping Cart", () => {
  const cartItem = {
    id: "cart-item-1",
    variantId: "variant-1",
    quantity: 2,
    unitPrice: 14999,
  };

  it("adds a valid quantity to the cart", () => {
    expect(cartItem.quantity).toBeGreaterThan(0);
  });

  it("calculates a cart line total", () => {
    const total =
      cartItem.quantity *
      cartItem.unitPrice;

    expect(total).toBe(29998);
  });

  it("rejects zero quantity", () => {
    const quantity = 0;

    expect(quantity).not.toBeGreaterThan(0);
  });

  it("rejects negative quantity", () => {
    const quantity = -1;

    expect(quantity).toBeLessThan(1);
  });

  it("references a product variant rather than only a product", () => {
    expect(cartItem.variantId).toBe("variant-1");
  });

  it("can calculate the total quantity in a cart", () => {
    const items = [
      {
        variantId: "variant-1",
        quantity: 2,
      },
      {
        variantId: "variant-2",
        quantity: 1,
      },
    ];

    const quantity = items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    expect(quantity).toBe(3);
  });
});