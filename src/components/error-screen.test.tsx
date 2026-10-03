import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorScreen } from "@/components/error-screen";
import { i18n } from "@/lib/i18n";

describe("ErrorScreen", () => {
  it("offers a reload button", () => {
    render(<ErrorScreen />);
    expect(
      screen.getByRole("button", { name: i18n.t("common:actions.reload") }),
    ).toBeInTheDocument();
  });
});
