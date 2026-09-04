export default function InputError({ message, className = '', ...props }) {
    return message ? (
        <p {...props} className={'text-sm text-red-400 admin-light:text-red-600 ' + className}>
            {message}
        </p>
    ) : null;
}
