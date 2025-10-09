import { ChangeEvent } from "react";

type NumberInputProps = {
  value: number | "";
  onChange: (v: number | "") => void;
  step?: number | string;
  min?: number;
  max?: number;
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
};

const NumberInput = ({
  value,
  onChange,
  step,
  min,
  max,
  ariaLabel,
  className,
  placeholder,
}: NumberInputProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "" || raw === "-" || raw === "." || raw === "-.") {
      onChange("");
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      onChange("");
      return;
    }
    onChange(parsed);
  };

  return (
    <input
      type="number"
      aria-label={ariaLabel}
      value={value}
      onChange={handleChange}
      step={step as any}
      min={min}
      max={max}
      className={className}
      placeholder={placeholder}
      inputMode="decimal"
    />
  );
};

export default NumberInput;
