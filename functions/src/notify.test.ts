import { describe, expect, it } from "vitest";
import { extractNotificationRequest } from "./notify.js";

describe("extractNotificationRequest", () => {
  it("maps notify to a note emoji and capitalizes the body", () => {
    expect(extractNotificationRequest("notify remember to feed the cat")).toEqual({
      emoji: "🗒️",
      body: "Remember to feed the cat",
    });
  });

  it("maps urgent to an alarm emoji", () => {
    expect(extractNotificationRequest("urgent remember to feed the cat")).toEqual({
      emoji: "🚨",
      body: "Remember to feed the cat",
    });
  });

  it("is case-insensitive and allows punctuation after the keyword", () => {
    expect(extractNotificationRequest("Notify: take out the trash")).toEqual({
      emoji: "🗒️",
      body: "Take out the trash",
    });
    expect(extractNotificationRequest("URGENT! call the vet")).toEqual({
      emoji: "🚨",
      body: "Call the vet",
    });
  });

  it("ignores non-keywords, bare keywords, and keyword prefixes", () => {
    expect(extractNotificationRequest("feed the cat")).toBeNull();
    expect(extractNotificationRequest("notify")).toBeNull();
    expect(extractNotificationRequest("urgent")).toBeNull();
    expect(extractNotificationRequest("notification for the dentist")).toBeNull();
    expect(extractNotificationRequest("urgently check the mail")).toBeNull();
  });
});
