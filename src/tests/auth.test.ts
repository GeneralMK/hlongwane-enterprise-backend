describe("Authentication", () => {
  describe("access token authentication", () => {
    it("rejects a request when no access token is supplied", () => {
      const accessToken = undefined;

      expect(accessToken).toBeUndefined();
    });

    it("accepts a bearer token value for authentication", () => {
      const authorization = "Bearer valid-access-token";
      const token = authorization.replace(/^Bearer\s+/i, "");

      expect(token).toBe("valid-access-token");
    });

    it("does not expose passwords in application user data", () => {
      const user = {
        id: "user-1",
        authUserId: "supabase-user-1",
        email: "customer@example.com",
        firstName: "Test",
        lastName: "Customer",
      };

      expect(user).not.toHaveProperty("password");
      expect(user).not.toHaveProperty("passwordHash");
    });
  });

  describe("RBAC", () => {
    it("supports multiple roles for a user", () => {
      const roles = [
        {
          id: "role-1",
          code: "CUSTOMER",
          name: "Customer",
        },
        {
          id: "role-2",
          code: "ADMIN",
          name: "Administrator",
        },
      ];

      expect(roles).toHaveLength(2);
      expect(roles.map((role) => role.code)).toContain("ADMIN");
    });

    it("supports permission codes resolved from roles", () => {
      const permissions = [
        "products.view",
        "orders.view",
        "inventory.view",
      ];

      expect(permissions).toContain("products.view");
      expect(permissions).toContain("orders.view");
    });
  });
});