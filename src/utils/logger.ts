import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const { NODE_ENV } = process.env;
const isDevMode = () => NODE_ENV !== "production";

const transports: winston.transport[] = [];

if (isDevMode()) {
  transports.push(new winston.transports.Console());
}

if (!isDevMode()) {
  transports.push(
    new DailyRotateFile({
      dirname: "logs",
      filename: "id-fix-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    })
  );
}

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports,
});
