export default function Dropdown({
  label,
  value,
  options = [],
  onChange,
  required = false,
  disabled = false,
  placeholder
}) {
  return (
    <div className="form-group">
      <label>
        {label}
        {required && (
          <span style={{ color: "red" }}> *</span>
        )}
      </label>

      <select
        className="form-control"
        value={value ?? ""}
        required={required}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">
          {placeholder || `Select ${label}`}
        </option>

        {options.map(option => {
          const optionValue =
            typeof option === "object"
              ? option.value
              : option;

          const optionLabel =
            typeof option === "object"
              ? option.label
              : option;

          return (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}