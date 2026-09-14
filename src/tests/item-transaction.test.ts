const mockRepository = {
  findMany: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

jest.mock("../api/item-transaction/repositories", () => ({
  ItemTransactionRepository: jest.fn().mockImplementation(() => mockRepository),
}));

jest.mock("../../prisma", () => ({
  agricultureItem: {
    findUnique: jest.fn(),
  },
}));

import prisma from "../../prisma";
import { ItemTransactionService } from "../api/item-transaction/service";

describe("ItemTransactionService", () => {
  let service: ItemTransactionService;

  beforeEach(() => {
    service = new ItemTransactionService();
    jest.clearAllMocks();
  });

  it("should return all transactions", async () => {
    mockRepository.findMany.mockResolvedValue([{ id: "txn-1" }]);

    const result = await service.findMany();

    expect(mockRepository.findMany).toHaveBeenCalled();
    expect(result).toEqual([{ id: "txn-1" }]);
  });

  it("should return transactions by user", async () => {
    mockRepository.findByUser.mockResolvedValue([{ id: "txn-1", userId: "user-1" }]);

    const result = await service.findByUser("user-1");

    expect(mockRepository.findByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual([{ id: "txn-1", userId: "user-1" }]);
  });

  it("should create purchase transaction", async () => {
    (prisma.agricultureItem.findUnique as jest.Mock).mockResolvedValue({
      id: "item-1",
      isForSale: true,
      purchasePrice: 50000,
    });

    mockRepository.create.mockResolvedValue({
      id: "txn-1",
      totalAmount: 100000,
    });

    const result = await service.create("user-1", {
      itemId: "item-1",
      transactionType: "PURCHASE",
      quantity: 2,
    });

    expect(mockRepository.create).toHaveBeenCalledWith({
      user: { connect: { id: "user-1" } },
      item: { connect: { id: "item-1" } },
      transactionType: "PURCHASE",
      quantity: 2,
      rentalStartDate: undefined,
      rentalEndDate: undefined,
      totalAmount: 100000,
      notes: undefined,
      status: "PENDING",
    });

    expect(result.totalAmount).toBe(100000);
  });

  it("should create rental transaction", async () => {
    (prisma.agricultureItem.findUnique as jest.Mock).mockResolvedValue({
      id: "item-1",
      isForRent: true,
      rentalPrice: 1500,
    });

    mockRepository.create.mockResolvedValue({
      id: "txn-2",
      totalAmount: 3000,
    });

    const result = await service.create("user-1", {
      itemId: "item-1",
      transactionType: "RENTAL",
      quantity: 2,
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: "RENTAL",
        quantity: 2,
        totalAmount: 3000,
      })
    );

    expect(result.totalAmount).toBe(3000);
  });

  it("should default quantity to 1", async () => {
    (prisma.agricultureItem.findUnique as jest.Mock).mockResolvedValue({
      id: "item-1",
      isForSale: true,
      purchasePrice: 50000,
    });

    mockRepository.create.mockResolvedValue({
      id: "txn-3",
      quantity: 1,
      totalAmount: 50000,
    });

    const result = await service.create("user-1", {
      itemId: "item-1",
      transactionType: "PURCHASE",
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 1,
        totalAmount: 50000,
      })
    );

    expect(result.quantity).toBe(1);
  });

  it("should throw if item does not exist", async () => {
    (prisma.agricultureItem.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.create("user-1", {
        itemId: "invalid",
        transactionType: "PURCHASE",
      })
    ).rejects.toThrow("Agriculture item not found");
  });

  it("should throw if item is not available for purchase", async () => {
    (prisma.agricultureItem.findUnique as jest.Mock).mockResolvedValue({
      id: "item-1",
      isForSale: false,
      purchasePrice: null,
    });

    await expect(
      service.create("user-1", {
        itemId: "item-1",
        transactionType: "PURCHASE",
      })
    ).rejects.toThrow("This item is not available for purchase");
  });

  it("should throw if item is not available for rental", async () => {
    (prisma.agricultureItem.findUnique as jest.Mock).mockResolvedValue({
      id: "item-1",
      isForRent: false,
      rentalPrice: null,
    });

    await expect(
      service.create("user-1", {
        itemId: "item-1",
        transactionType: "RENTAL",
      })
    ).rejects.toThrow("This item is not available for rental");
  });

  it("should update transaction status", async () => {
    mockRepository.updateStatus.mockResolvedValue({
      id: "txn-1",
      status: "PAID",
    });

    const result = await service.updateStatus("txn-1", "PAID");

    expect(mockRepository.updateStatus).toHaveBeenCalledWith("txn-1", "PAID");
    expect(result.status).toBe("PAID");
  });
});