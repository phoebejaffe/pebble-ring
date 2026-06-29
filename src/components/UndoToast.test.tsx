import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UndoToast } from "./UndoToast";
import { renderWithProviders } from "../test/test-utils";

describe("UndoToast", () => {
  it("shows message and calls undo", async () => {
    const onUndo = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <UndoToast
        message="Item deleted"
        durationMs={10_000}
        onUndo={onUndo}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText("Item deleted")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
