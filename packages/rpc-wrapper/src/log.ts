export type LogLevel = "debug" | "info" | "warn" | "error";

export function createLogger(serviceName: string) {
  const prefix = `[${serviceName}]`;

  function write(level: LogLevel, message: string, meta?: unknown) {
    const line = `${new Date().toISOString()} ${prefix} ${level.toUpperCase()} ${message}`;
    if (meta !== undefined) {
      console[level === "debug" ? "log" : level](line, meta);
    } else {
      console[level === "debug" ? "log" : level](line);
    }
  }

  return {
    debug: (message: string, meta?: unknown) => write("debug", message, meta),
    info: (message: string, meta?: unknown) => write("info", message, meta),
    warn: (message: string, meta?: unknown) => write("warn", message, meta),
    error: (message: string, meta?: unknown) => write("error", message, meta),
  };
}

export type Logger = ReturnType<typeof createLogger>;
