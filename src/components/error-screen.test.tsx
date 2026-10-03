import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorScreen } from "@/components/error-screen";

describe("ErrorScreen", () => {
  it("offers a reload button", () => {
    render(<ErrorScreen />);
    expect(screen.getByRole("button", { name: "Recharger" })).toBeInTheDocument();
  });
});
