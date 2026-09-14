const mockRepository = {
  findMany: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock("../api/agriculture-item/repositories", () => ({
  AgricultureItemRepository: jest.fn().mockImplementation(() => mockRepository),
}));

import { AgricultureItemService } from "../api/agriculture-item/service";

describe("AgricultureItemService", () => {
  let service: AgricultureItemService;

  beforeEach(() => {
    service = new AgricultureItemService();
    jest.clearAllMocks();
  });

  it("should return all agriculture items", async () => {
    mockRepository.findMany.mockResolvedValue([{ id: "item-1", name: "Tractor" }]);

    const result = await service.findMany();

    expect(mockRepository.findMany).toHaveBeenCalled();
    expect(result).toEqual([{ id: "item-1", name: "Tractor" }]);
  });

  it("should return item by id", async () => {
    mockRepository.findById.mockResolvedValue({ id: "item-1", name: "Tractor" });

    const result = await service.findById("item-1");

    expect(mockRepository.findById).toHaveBeenCalledWith("item-1");
    expect(result?.name).toBe("Tractor");
  });

  it("should create item and convert prices", async () => {
    mockRepository.create.mockResolvedValue({ id: "item-1" });

    await service.create({
      name: "Tractor",
      category: "TRACTOR",
      purchasePrice: "50000",
      rentalPrice: "1500",
      isForSale: true,
      isForRent: true,
    });

    expect(mockRepository.create).toHaveBeenCalledWith({
      name: "Tractor",
      category: "TRACTOR",
      purchasePrice: 50000,
      rentalPrice: 1500,
      isForSale: true,
      isForRent: true,
    });
  });

  it("should update item and convert prices", async () => {
    mockRepository.update.mockResolvedValue({ id: "item-1", rentalPrice: 2000 });

    const result = await service.update("item-1", {
      rentalPrice: "2000",
    });

    expect(mockRepository.update).toHaveBeenCalledWith("item-1", {
      rentalPrice: 2000,
      purchasePrice: undefined,
    });

    expect(result.rentalPrice).toBe(2000);
  });

  it("should delete item", async () => {
    mockRepository.delete.mockResolvedValue({ id: "item-1" });

    const result = await service.delete("item-1");

    expect(mockRepository.delete).toHaveBeenCalledWith("item-1");
    expect(result).toBe(true);
  });
});