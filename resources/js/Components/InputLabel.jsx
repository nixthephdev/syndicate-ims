export default function InputLabel({ value, className = '', children, ...props }) {
    return (
        <label {...props} className={`block font-medium text-sm text-white/70 admin-light:text-ink-900/70 ` + className}>
            {value ? value : children}
        </label>
    );
}
