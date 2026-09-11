import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("describes the webhook receiver", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Webhook receiver" })).toBeTruthy();
    expect(screen.getByText(/private Firebase Function/)).toBeTruthy();
  });
});
