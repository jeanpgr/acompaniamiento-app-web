interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export default function Switch({ checked, onChange, label, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 ease-out-quart disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-success" : "bg-line-strong"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform duration-150 ease-out-quart ${
          checked ? "translate-x-5.5" : "translate-x-0.75"
        }`}
      />
    </button>
  );
}
