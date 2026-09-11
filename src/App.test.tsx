import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { AuthProvider } from "./auth";

describe("App", () => {
  it("asks for dashboard configuration when Firebase is not configured", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(screen.getByRole("heading", { name: "Configure the dashboard" })).toBeTruthy();
  });
});
