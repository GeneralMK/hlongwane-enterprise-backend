import cron from "node-cron";
import { logger } from "./logger";




cron.schedule(
  "0 8 * * *",
  async () => {
    try {
      logger(
        "OVERDUE_RENTAL_CRON_STARTED",
        {},
      );

      const result =
      

      logger(
        "OVERDUE_RENTAL_CRON_COMPLETED",
        
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