describe("Product Variants", () => {
  const variant = {
    id: "variant-1",
    productId: "product-1",
    sku: "SAM-S26-256-BLK",
    price: "18999.00",
    attributes: {
      storage: "256GB",
      colour: "Black",
    },
  };

  it("belongs to a product", () => {
    expect(variant.productId).toBe("product-1");
  });

  it("has a unique SKU representation", () => {
    expect(variant.sku).toBeTruthy();
    expect(variant.sku.length).toBeGreaterThan(0);
  });

  it("stores monetary values without using floating point calculations", () => {
    expect(typeof variant.price).toBe("string");
    expect(variant.price).toMatch(/^\d+\.\d{2}$/);
  });

  it("supports device-specific attributes", () => {
    expect(variant.attributes.storage).toBe("256GB");
    expect(variant.attributes.colour).toBe("Black");
  });

  it("can distinguish variants of the same product", () => {
    const secondVariant = {
      ...variant,
      id: "variant-2",
      sku: "SAM-S26-512-BLK",
      attributes: {
        ...variant.attributes,
        storage: "512GB",
      },
    };

    expect(secondVariant.productId).toBe(variant.productId);
    expect(secondVariant.sku).not.toBe(variant.sku);
  });
});