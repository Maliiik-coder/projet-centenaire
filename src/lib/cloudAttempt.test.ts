import { describe, expect, it } from "vitest";
import { isCurrentCloudAttempt } from "@/lib/cloudAttempt";

describe("isCurrentCloudAttempt", () => {
  it("refuse une réponse tardive de A après le passage à B", () => {
    expect(isCurrentCloudAttempt(2, 1, "user-b", "user-a")).toBe(false);
    expect(isCurrentCloudAttempt(2, 2, "user-b", "user-a")).toBe(false);
    expect(isCurrentCloudAttempt(2, 2, "user-b", "user-b")).toBe(true);
  });
});
