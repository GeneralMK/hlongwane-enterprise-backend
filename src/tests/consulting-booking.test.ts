const mockRepository = {
  findMany: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateStatus: jest.fn(),
};

jest.mock("../api/consultation-booking/repositories", () => ({
  ConsultationBookingRepository: jest.fn().mockImplementation(() => mockRepository),
}));

import { ConsultationBookingService } from "../api/consultation-booking/service";

describe("ConsultationBookingService", () => {
  let service: ConsultationBookingService;

  beforeEach(() => {
    service = new ConsultationBookingService();
    jest.clearAllMocks();
  });

  it("should return all bookings", async () => {
    mockRepository.findMany.mockResolvedValue([{ id: "booking-1" }]);

    const result = await service.findMany();

    expect(mockRepository.findMany).toHaveBeenCalled();
    expect(result).toEqual([{ id: "booking-1" }]);
  });

  it("should return bookings by user", async () => {
    mockRepository.findByUser.mockResolvedValue([
      { id: "booking-1", userId: "user-1" },
    ]);

    const result = await service.findByUser("user-1");

    expect(mockRepository.findByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual([{ id: "booking-1", userId: "user-1" }]);
  });

  it("should create virtual booking without generating jitsi link before payment", async () => {
    mockRepository.create.mockResolvedValue({
      id: "booking-1",
      consultationType: "VIRTUAL",
    });

    const result = await service.create("user-1", {
      consultationType: "VIRTUAL",
      preferredTime: "MORNING",
      topic: "Soil analysis",
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { connect: { id: "user-1" } },
        consultationType: "VIRTUAL",
        preferredTime: "MORNING",
        jitsiRoomName: null,
        jitsiMeetingUrl: null,
        status: "PENDING",
      })
    );

    expect(result.id).toBe("booking-1");
  });

  it("should create telephone booking when phone number is provided", async () => {
    mockRepository.create.mockResolvedValue({ id: "booking-2" });

    await service.create("user-1", {
      consultationType: "TELEPHONE",
      preferredTime: "EVENING",
      phoneNumber: "0831234567",
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        consultationType: "TELEPHONE",
        phoneNumber: "0831234567",
        jitsiRoomName: null,
        jitsiMeetingUrl: null,
      })
    );
  });

  it("should throw if telephone booking has no phone number", () => {
    expect(() =>
      service.create("user-1", {
        consultationType: "TELEPHONE",
        preferredTime: "EVENING",
      })
    ).toThrow("Phone number is required for telephone consultation");
  });

  it("should create on-site booking when address is provided", async () => {
    mockRepository.create.mockResolvedValue({ id: "booking-3" });

    await service.create("user-1", {
      consultationType: "ON_SITE_VISIT",
      preferredTime: "MORNING",
      addressLine1: "Farm Road",
      city: "Johannesburg",
      province: "Gauteng",
      postalCode: "2191",
      country: "South Africa",
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        consultationType: "ON_SITE_VISIT",
        addressLine1: "Farm Road",
        city: "Johannesburg",
        province: "Gauteng",
        postalCode: "2191",
        country: "South Africa",
        jitsiRoomName: null,
        jitsiMeetingUrl: null,
      })
    );
  });

  it("should throw if on-site address is missing", () => {
    expect(() =>
      service.create("user-1", {
        consultationType: "ON_SITE_VISIT",
        preferredTime: "MORNING",
      })
    ).toThrow("Address is required for on-site consultation");
  });

  it("should update booking status", async () => {
    mockRepository.updateStatus.mockResolvedValue({
      id: "booking-1",
      status: "PAID",
    });

    const result = await service.updateStatus("booking-1", "PAID");

    expect(mockRepository.updateStatus).toHaveBeenCalledWith(
      "booking-1",
      "PAID"
    );
    expect(result.status).toBe("PAID");
  });
});