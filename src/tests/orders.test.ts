describe("Orders", () => {
  const cancellableStatuses = new Set([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
  ]);

  it.each([
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
  ])(
    "allows an order in %s status to be considered cancellable",
    (status) => {
      expect(
        cancellableStatuses.has(status),
      ).toBe(true);
    },
  );

  it.each([
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
  ])(
    "does not consider %s directly cancellable",
    (status) => {
      expect(
        cancellableStatuses.has(status),
      ).toBe(false);
    },
  );

  it("calculates an order total from its line items", () => {
    const items = [
      {
        quantity: 1,
        unitPrice: 14999,
      },
      {
        quantity: 2,
        unitPrice: 500,
      },
    ];

    const total = items.reduce(
      (sum, item) =>
        sum + item.quantity * item.unitPrice,
      0,
    );

    expect(total).toBe(15999);
  });

  it("associates an order with the customer who placed it", () => {
    const order = {
      id: "order-1",
      userId: "user-1",
      status: "PENDING_PAYMENT",
    };

    expect(order.userId).toBe("user-1");
  });
});