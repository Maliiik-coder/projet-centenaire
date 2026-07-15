import { cloneElement, type ReactElement } from "react";
import { cx } from "@/components/ui/styles";

type FormControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true";
  id?: string;
  required?: boolean;
};

export type FormFieldProps = {
  children: ReactElement<FormControlProps>;
  className?: string;
  error?: string | null;
  help?: string;
  id: string;
  label: string;
  required?: boolean;
};

export function FormField({
  children,
  className,
  error,
  help,
  id,
  label,
  required = false,
}: FormFieldProps) {
  const descriptionId = error
    ? `${id}-error`
    : help
      ? `${id}-help`
      : undefined;
  const describedBy = [children.props["aria-describedby"], descriptionId]
    .filter(Boolean)
    .join(" ") || undefined;
  const control = cloneElement(children, {
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"],
    id,
    required: required || children.props.required,
  });

  return (
    <div className={cx("grid gap-2", className)}>
      <label
        className="text-[length:var(--pc-font-size-secondary)] leading-5 font-medium text-[var(--pc-color-text)]"
        htmlFor={id}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {control}
      {help && !error ? (
        <p
          className="text-[length:var(--pc-font-size-meta)] leading-5 text-[var(--pc-color-text-muted)]"
          id={`${id}-help`}
        >
          {help}
        </p>
      ) : null}
      {error ? (
        <p
          className="text-[length:var(--pc-font-size-meta)] leading-5 font-medium text-[var(--pc-color-danger)]"
          id={`${id}-error`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
