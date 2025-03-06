import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import logger from "../Logging/logger.js";

export const prisma = new PrismaClient({
  log: ["query"], // Aktifkan logging Prisma
});

prisma.$use(async (params, next) => {
    const before = DateTime.now();
    const result = await next(params);
    const after = DateTime.now();
    const duration = after.diff(before).toMillis();

    const slowQueryThreshold = 100; // Logging hanya jika query lebih dari 100ms
    const timestamp = after.setZone("Asia/Jakarta").toFormat("EEEE, dd LLL yyyy HH:mm:ss");

    if (duration > slowQueryThreshold) {
        logger.warn(
            `[DB] ${timestamp} - ${params.model}.${params.action} took ${duration} ms`
        );
    }

    return result;
});

// Event listener Prisma untuk menangkap query SQL mentah dan menyembunyikan nama database
prisma.$on("query", (e) => {
    const duration = e.duration;
    const sanitizedQuery = e.query.replace(/`[^`]+`\./g, ""); // Hapus nama database

    if (duration > 100) {
        logger.warn(`[SQL] ${sanitizedQuery} (took ${duration} ms)`);
    }
});
