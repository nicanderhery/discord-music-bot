const log = (...messages: unknown[]): void => {
    const date = getCurrentDateTime();
    console.log(`[LOG] [${date}] => `, ...messages);
};

const error = (...messages: unknown[]): void => {
    const date = getCurrentDateTime();
    console.error(`[ERROR] [${date}] => `, ...messages);
};

const warn = (...messages: unknown[]): void => {
    const date = getCurrentDateTime();
    console.warn(`[WARN] [${date}] => `, ...messages);
};

const debug = (...messages: unknown[]): void => {
    const date = getCurrentDateTime();
    console.debug(`[DEBUG] [${date}] => `, ...messages);
};

/**
 * Custom logger with different log levels
 */
export const logger = {
    log,
    error,
    warn,
    debug,
};

/**
 * Get the current date and time as a string in the format DD-MM-YYYY HH:MM:SS
 * @returns {string} The current date and time as a string in the format DD-MM-YYYY HH:MM:SS
 */
const getCurrentDateTime = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Pad with leading zeros if necessary
    const pad = (n: number) => (n < 10 ? `0${n}` : n);

    // Format the date and time as a string
    const dateStr = `${pad(day)}-${pad(month)}-${year}`;
    const timeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    return dateStr + ' ' + timeStr;
};
