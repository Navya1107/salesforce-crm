
export default function Input({
  label,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder = ""
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        className="form-control"
        type={type}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
