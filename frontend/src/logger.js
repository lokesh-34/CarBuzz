// Simple logger utility
// Usage: import log from "./logger"; log("Booking created", { id })

const log = (...args) => {
  try {
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.log(`[CarBuzz][${timestamp}]`, ...args);
  } catch {
    // ignore
  }
};

export default log;


