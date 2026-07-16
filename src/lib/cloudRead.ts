export const DEFAULT_CLOUD_READ_TIMEOUT_MS = 12_000;
export const CLOUD_RECOVERY_DELAY_MS = 3_000;

export function withCloudReadTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DEFAULT_CLOUD_READ_TIMEOUT_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      reject(new Error("Cloud read timeout"));
    }, timeoutMs);

    promise.then(
      (value) => {
        globalThis.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        globalThis.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
