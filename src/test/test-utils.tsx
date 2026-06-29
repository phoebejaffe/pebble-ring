import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { TranscriptionSettingsProvider } from "../contexts/TranscriptionSettingsContext";

function TestProviders({ children }: { children: ReactNode }) {
  return <TranscriptionSettingsProvider>{children}</TranscriptionSettingsProvider>;
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: TestProviders, ...options });
}

export const mockGetIdToken = async () => "test-token";
