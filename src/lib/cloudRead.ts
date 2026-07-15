const defaultCloudReadTimeoutMs = 4500;

export function withCloudReadTimeout<T>(
  promise: Promise<T>,
  timeoutMs = defaultCloudReadTimeoutMs,
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
