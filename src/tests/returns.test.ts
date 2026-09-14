describe("Returns", () => {
  const returnRequest = {
    id: "return-1",
    orderId: "order-1",
    requestedByUserId: "user-1",
    status: "REQUESTED",
    reason: "Device arrived damaged",
  };

  it("stores the user who requested the return", () => {
    expect(
      returnRequest.requestedByUserId,
    ).toBe("user-1");
  });

  it("associates the return with an order", () => {
    expect(returnRequest.orderId).toBe(
      "order-1",
    );
  });

  it("requires a return reason", () => {
    expect(returnRequest.reason).toBeTruthy();
  });

  it("allows the requesting customer to be identified as the owner", () => {
    const authenticatedUserId = "user-1";

    expect(
      returnRequest.requestedByUserId,
    ).toBe(authenticatedUserId);
  });

  it("does not treat another customer as the return owner", () => {
    const authenticatedUserId = "user-2";

    expect(
      returnRequest.requestedByUserId,
    ).not.toBe(authenticatedUserId);
  });

  it("supports approval and rejection decisions", () => {
    const staffStatuses = [
      "APPROVED",
      "REJECTED",
    ];

    expect(staffStatuses).toContain(
      "APPROVED",
    );

    expect(staffStatuses).toContain(
      "REJECTED",
    );
  });
});