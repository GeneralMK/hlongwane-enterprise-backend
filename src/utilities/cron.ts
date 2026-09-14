import cron from "node-cron";
import { logger } from "./logger";
import { sendOverdueRentalReminders } from "src/api/rentals/service/overdueRentalReminder.service";



cron.schedule(
  "0 8 * * *",
  async () => {
    try {
      logger(
        "OVERDUE_RENTAL_CRON_STARTED",
        {},
      );

      const result =
        await sendOverdueRentalReminders();

      logger(
        "OVERDUE_RENTAL_CRON_COMPLETED",
        result,
      );
    } catch (error) {
      logger(
        "OVERDUE_RENTAL_CRON_FAILED",
        {
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
      );
    }
  },
  {
    timezone:
      "Africa/Johannesburg",
  },
);