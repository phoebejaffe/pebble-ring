import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "./SettingsPanel";
import { renderWithProviders } from "../test/test-utils";

describe("SettingsPanel", () => {
  it("renders existing word preferences", () => {
    renderWithProviders(<SettingsPanel open onClose={() => undefined} />);

    expect(screen.getByDisplayValue("Masumi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Masami, masami, MASAMI")).toBeInTheDocument();
  });

  it("adds a new word preference row", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPanel open onClose={() => undefined} />);

    await user.click(screen.getByRole("button", { name: "+ Add word" }));

    const preferInputs = screen.getAllByPlaceholderText("Masumi");
    expect(preferInputs.length).toBeGreaterThan(1);
  });

  it("updates a preferred word", () => {
    renderWithProviders(<SettingsPanel open onClose={() => undefined} />);

    const input = screen.getByDisplayValue("Masumi");
    fireEvent.change(input, { target: { value: "Phoebe" } });

    expect(screen.getByDisplayValue("Phoebe")).toBeInTheDocument();
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<SettingsPanel open onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render when closed", () => {
    renderWithProviders(<SettingsPanel open={false} onClose={() => undefined} />);

    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
  });
});
