describe("Products", () => {
  const product = {
    id: "product-1",
    name: "Samsung Galaxy S26",
    slug: "samsung-galaxy-s26",
    status: "ACTIVE",
    brandId: "brand-samsung",
    categoryId: "category-smartphones",
  };

  it("contains the required product information", () => {
    expect(product.id).toBeDefined();
    expect(product.name).toBeDefined();
    expect(product.slug).toBeDefined();
    expect(product.brandId).toBeDefined();
    expect(product.categoryId).toBeDefined();
  });

  it("allows an active product to be displayed in the catalogue", () => {
    expect(product.status).toBe("ACTIVE");
  });

  it("does not treat an archived product as active", () => {
    const archivedProduct = {
      ...product,
      status: "ARCHIVED",
    };

    expect(archivedProduct.status).not.toBe("ACTIVE");
  });

  it("uses a URL-friendly slug", () => {
    expect(product.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("associates a product with a brand and category", () => {
    expect(product.brandId).toBe("brand-samsung");
    expect(product.categoryId).toBe("category-smartphones");
  });
});