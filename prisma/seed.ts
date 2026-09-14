import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  {
    code: "CUSTOMER",
    name: "Customer",
    description: "Standard customer account",
    isSystem: true,
  },
  {
    code: "ADMIN",
    name: "Administrator",
    description: "General administrative user",
    isSystem: true,
  },
  {
    code: "SUPER_ADMIN",
    name: "Super Administrator",
    description: "Full administrative access to the platform",
    isSystem: true,
  },
  {
    code: "PRODUCT_MANAGER",
    name: "Product Manager",
    description: "Manages products, categories, brands and catalogue content",
    isSystem: true,
  },
  {
    code: "INVENTORY_MANAGER",
    name: "Inventory Manager",
    description: "Manages stock, inventory adjustments and serialized devices",
    isSystem: true,
  },
  {
    code: "ORDER_MANAGER",
    name: "Order Manager",
    description: "Manages customer orders and fulfilment",
    isSystem: true,
  },
  {
    code: "PAYMENT_MANAGER",
    name: "Payment Manager",
    description: "Manages payments, refunds and payment reconciliation",
    isSystem: true,
  },
  {
    code: "SUPPORT_AGENT",
    name: "Support Agent",
    description: "Handles customer support and account enquiries",
    isSystem: true,
  },
];

const PERMISSIONS = [
  {
    code: "products.read",
    name: "View Products",
    module: "products",
  },
  {
    code: "create:products",
    name: "Create Products",
    module: "products",
  },
  {
    code: "update:products",
    name: "Update Products",
    module: "products",
  },
  {
    code: "delete:products",
    name: "Delete Products",
    module: "products",
  },

  {
    code: "brands.read",
    name: "View Brands",
    module: "brands",
  },
  {
    code: "brands.manage",
    name: "Manage Brands",
    module: "brands",
  },

  {
    code: "categories.read",
    name: "View Categories",
    module: "categories",
  },
  {
    code: "categories.manage",
    name: "Manage Categories",
    module: "categories",
  },

  {
    code: "inventory.read",
    name: "View Inventory",
    module: "inventory",
  },
  {
    code: "inventory.adjust",
    name: "Adjust Inventory",
    module: "inventory",
  },

  {
    code: "orders.read",
    name: "View Orders",
    module: "orders",
  },
  {
    code: "orders.update",
    name: "Update Orders",
    module: "orders",
  },
  {
    code: "orders.cancel",
    name: "Cancel Orders",
    module: "orders",
  },

  {
    code: "payments.read",
    name: "View Payments",
    module: "payments",
  },
  {
    code: "payments.refund",
    name: "Refund Payments",
    module: "payments",
  },

  {
    code: "customers.read",
    name: "View Customers",
    module: "customers",
  },
  {
    code: "customers.update",
    name: "Update Customers",
    module: "customers",
  },

  {
    code: "admins.read",
    name: "View Administrators",
    module: "admins",
  },
  {
    code: "admins.create",
    name: "Create Administrators",
    module: "admins",
  },
  {
    code: "admins.update",
    name: "Update Administrators",
    module: "admins",
  },
  {
    code: "admins.assign_roles",
    name: "Assign User Roles",
    module: "admins",
  },

  {
    code: "files.upload",
    name: "Upload Files",
    module: "files",
  },
  {
    code: "files.delete",
    name: "Delete Files",
    module: "files",
  },

  {
    code: "returns.read",
    name: "View Returns",
    module: "returns",
  },
  {
    code: "returns.approve",
    name: "Approve Returns",
    module: "returns",
  },
  {
    code: "returns.reject",
    name: "Reject Returns",
    module: "returns",
  },

  {
    code: "shipments.read",
    name: "View Shipments",
    module: "shipments",
  },
  {
    code: "shipments.update",
    name: "Update Shipments",
    module: "shipments",
  },

  {
    code: "audit.read",
    name: "View Audit Logs",
    module: "audit",
  },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  CUSTOMER: [],

  ADMIN: [
    "products.read",
    "create:products",
    "update:products",
    "brands.read",
    "brands.manage",
    "categories.read",
    "categories.manage",
    "inventory.read",
    "orders.read",
    "orders.update",
    "payments.read",
    "customers.read",
    "returns.read",
    "shipments.read",
    "files.upload",
  ],

  SUPER_ADMIN: PERMISSIONS.map((permission) => permission.code),

  PRODUCT_MANAGER: [
    "products.read",
    "create:products",
    "update:products",
    "delete:products",
    "brands.read",
    "brands.manage",
    "categories.read",
    "categories.manage",
    "files.upload",
    "files.delete",
  ],

  INVENTORY_MANAGER: ["inventory.read", "inventory.adjust", "products.read"],

  ORDER_MANAGER: [
    "orders.read",
    "orders.update",
    "orders.cancel",
    "shipments.read",
    "shipments.update",
    "customers.read",
  ],

  PAYMENT_MANAGER: ["payments.read", "payments.refund", "orders.read"],

  SUPPORT_AGENT: [
    "customers.read",
    "customers.update",
    "orders.read",
    "payments.read",
    "returns.read",
    "shipments.read",
  ],
};

async function seedRoles() {
  console.log("Seeding roles...");

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: {
        code: role.code,
      },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isActive: true,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        isActive: true,
      },
    });
  }

  console.log("Roles seeded.");
}

async function seedPermissions() {
  console.log("Seeding permissions...");

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },
      update: {
        name: permission.name,
        module: permission.module,
        isActive: true,
      },
      create: {
        code: permission.code,
        name: permission.name,
        module: permission.module,
        isActive: true,
      },
    });
  }

  console.log("Permissions seeded.");
}

async function seedRolePermissions() {
  console.log("Seeding role permissions...");

  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({
      where: {
        code: roleCode,
      },
    });

    if (!role) {
      throw new Error(`Role ${roleCode} was not found`);
    }

    for (const permissionCode of permissionCodes) {
      const permission = await prisma.permission.findUnique({
        where: {
          code: permissionCode,
        },
      });

      if (!permission) {
        throw new Error(`Permission ${permissionCode} was not found`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("Role permissions seeded.");
}

async function main() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
