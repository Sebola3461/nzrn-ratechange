// logger.ts
export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
  SUCCESS = "SUCCESS",
}

export class Logger {
  private static readonly colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
  };

  private static format(level: LogLevel, message: string): string {
    const timestamp = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    const color = this.getLevelColor(level);

    return `${this.colors.gray}[${timestamp}]${this.colors.reset} ${color}${this.colors.bright}[${level}]${this.colors.reset} ${message}`;
  }

  private static getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.INFO:
        return this.colors.blue;
      case LogLevel.WARN:
        return this.colors.yellow;
      case LogLevel.ERROR:
        return this.colors.red;
      case LogLevel.SUCCESS:
        return this.colors.green;
      case LogLevel.DEBUG:
        return this.colors.cyan;
      default:
        return this.colors.reset;
    }
  }

  static info(msg: string) {
    console.log(this.format(LogLevel.INFO, msg));
  }
  static success(msg: string) {
    console.log(this.format(LogLevel.SUCCESS, msg));
  }
  static warn(msg: string) {
    console.warn(this.format(LogLevel.WARN, msg));
  }
  static error(msg: string, err?: any) {
    console.error(this.format(LogLevel.ERROR, msg));
    if (err) console.error(err);
  }
  static debug(msg: string) {
    // Só exibe se houver uma variável de ambiente DEBUG=true
    if (process.env["DEBUG"] === "true") {
      console.log(this.format(LogLevel.DEBUG, msg));
    }
  }
}
