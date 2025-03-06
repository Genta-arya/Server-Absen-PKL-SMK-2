import winston from "winston";
import path from "path";
import { DateTime } from "luxon"; // Import Luxon

const logFilePath = path.join("logs", "server.log");

let io = null;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      const formattedTime = DateTime.fromISO(timestamp).setZone("Asia/Jakarta").toFormat("EEEE, dd MMMM yyyy HH:mm:ss");
      return `${formattedTime} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: logFilePath }),
  ],
});

// Transport custom untuk mengirim log ke Socket.IO
class SocketIoTransport extends winston.Transport {
  log(info, callback) {
    if (io && ["info", "error", "warn"].includes(info.level)) {
      const formattedTime = DateTime.now().setZone("Asia/Jakarta").toFormat("EEEE, dd MMMM yyyy HH:mm:ss");

      // Jika level "warn", ubah jadi "info" saat dikirim ke Socket.io
      const logLevel = info.level === "warn" ? "query" : info.level;

      io.emit("log", { 
        timestamp: formattedTime, 
        level: logLevel, 
        message: info.message 
      });
    }
    callback();
  }
}

logger.add(new SocketIoTransport());

export const setSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

export default logger;
