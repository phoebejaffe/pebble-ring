import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JsonModal } from "./JsonModal";
import { renderWithProviders } from "../test/test-utils";

describe("JsonModal", () => {
  it("renders JSON and copies to clipboard", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <JsonModal
        open
        title="Item JSON"
        subtitle="Test item"
        data={{ item: { id: "item-1" } }}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Item JSON" })).toBeInTheDocument();
    expect(screen.getByText(/"id": "item-1"/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy to clipboard" }));

    expect(await navigator.clipboard.readText()).toContain('"item-1"');
  });
});
