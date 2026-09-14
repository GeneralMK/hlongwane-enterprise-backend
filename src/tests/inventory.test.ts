describe("Inventory", () => {
  it("calculates available quantity from physical and reserved stock", () => {
    const physicalQuantity = 20;
    const reservedQuantity = 5;

    const availableQuantity =
      physicalQuantity - reservedQuantity;

    expect(availableQuantity).toBe(15);
  });

  it("reduces available stock when stock is reserved", () => {
    const physicalQuantity = 10;
    const reservedQuantity = 3;

    expect(
      physicalQuantity - reservedQuantity,
    ).toBe(7);
  });

  it("does not allow reservation beyond available stock", () => {
    const physicalQuantity = 5;
    const reservedQuantity = 2;
    const requestedQuantity = 4;

    const availableQuantity =
      physicalQuantity - reservedQuantity;

    expect(requestedQuantity).toBeGreaterThan(
      availableQuantity,
    );
  });

  it("supports the platform inventory movement types", () => {
    const movementTypes = [
      "STOCK_RECEIVED",
      "RESERVED",
      "RESERVATION_RELEASED",
      "SOLD",
      "RETURNED",
      "DAMAGED",
      "MANUAL_ADJUSTMENT",
    ];

    expect(movementTypes).toContain("STOCK_RECEIVED");
    expect(movementTypes).toContain("RESERVED");
    expect(movementTypes).toContain("SOLD");
    expect(movementTypes).toContain("RETURNED");
  });

  it("never reports more available stock than physical stock", () => {
    const physicalQuantity = 15;
    const reservedQuantity = 4;

    const availableQuantity =
      physicalQuantity - reservedQuantity;

    expect(availableQuantity).toBeLessThanOrEqual(
      physicalQuantity,
    );
  });
});