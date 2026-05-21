import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CountryPhoneInput } from "../CountryPhoneInput";

describe("CountryPhoneInput", () => {
  it("typing national digits for HN emits correct E.164", () => {
    const onChange = vi.fn();
    render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "9999 9999" } });
    expect(onChange).toHaveBeenCalledWith("+50499999999");
  });

  it("typing national digits for MX emits correct E.164", () => {
    const onChange = vi.fn();
    render(
      <CountryPhoneInput
        id="test-phone"
        country="MX"
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "55 1234 5678" } });
    expect(onChange).toHaveBeenCalledWith("+525512345678");
  });

  it("splits E.164 into national part on mount", () => {
    render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value="+50499999999"
        onChange={vi.fn()}
      />
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("99999999");
  });

  it("shows the correct dial code chip for the country", () => {
    render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value=""
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("+504")).toBeInTheDocument();
  });

  it("shows updated dial code when country prop changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value="+50499999999"
        onChange={onChange}
      />
    );
    expect(screen.getByText("+504")).toBeInTheDocument();

    rerender(
      <CountryPhoneInput
        id="test-phone"
        country="MX"
        value="+50499999999"
        onChange={onChange}
      />
    );
    expect(screen.getByText("+52")).toBeInTheDocument();
  });

  it("emits new E.164 with updated dial code when country prop changes and national is filled", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value="+50499999999"
        onChange={onChange}
      />
    );
    onChange.mockClear();

    rerender(
      <CountryPhoneInput
        id="test-phone"
        country="MX"
        value="+50499999999"
        onChange={onChange}
      />
    );
    // national digits "99999999" re-assembled with MX dial code "+52"
    expect(onChange).toHaveBeenCalledWith("+5299999999");
  });

  it("aria-label present on the dial code chip", () => {
    render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value=""
        onChange={vi.fn()}
        ariaLabel="Country code"
      />
    );
    const chip = screen.getByRole("img");
    expect(chip).toHaveAttribute("aria-label", "Country code: +504");
  });

  it("renders error message when error prop is supplied", () => {
    render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value=""
        onChange={vi.fn()}
        error="Invalid phone number"
      />
    );
    expect(screen.getByText("Invalid phone number")).toBeInTheDocument();
  });

  it("only allows digits, spaces, and dashes in the national input", () => {
    const onChange = vi.fn();
    render(
      <CountryPhoneInput
        id="test-phone"
        country="HN"
        value=""
        onChange={onChange}
      />
    );
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "abc123!@#" } });
    // Only digits pass through
    expect(onChange).toHaveBeenCalledWith("+504123");
  });
});
