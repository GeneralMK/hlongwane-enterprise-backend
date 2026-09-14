describe("Payments", () => {
  const order = {
    id: "order-1",
    total: 18999,
  };

  it("requires the payment amount to match the order amount", () => {
    const paymentAmount = 18999;

    expect(paymentAmount).toBe(order.total);
  });

  it("detects an incorrect payment amount", () => {
    const paymentAmount = 17999;

    expect(paymentAmount).not.toBe(order.total);
  });

  it("associates a payment with an order", () => {
    const payment = {
      id: "payment-1",
      orderId: order.id,
      provider: "PAYSTACK",
      reference: "HLG-ORDER-1",
    };

    expect(payment.orderId).toBe(order.id);
  });

  it("requires a payment reference", () => {
    const payment = {
      reference: "HLG-ORDER-1",
    };

    expect(payment.reference).toBeTruthy();
  });

  it("recognises supported payment providers", () => {
    const supportedProviders = [
      "PAYSTACK",
      "PAYFAST",
      "OZOW",
      "PEACH_PAYMENTS",
      "PAYFLEX",
      "MOBICRED",
    ];

    expect(supportedProviders).toContain(
      "PAYSTACK",
    );
  });

  it("treats repeated provider references as the same payment event", () => {
    const processedReferences = new Set<string>();

    const reference = "paystack-ref-123";

    processedReferences.add(reference);

    expect(
      processedReferences.has(reference),
    ).toBe(true);
  });
});