import { z } from "zod";

type FieldName<TInput> = Extract<keyof TInput, string>;

export type FieldErrors<TInput> = Partial<Record<FieldName<TInput>, string[]>>;

/** What every Server Action returns for an expected outcome (errors-and-validation.md §4). */
export type ActionResult<TInput, TData = null> =
  | { status: "idle" }
  | { status: "success"; data: TData }
  | {
      status: "error";
      fieldErrors: FieldErrors<TInput>;
      formError?: string;
      values: Partial<Record<FieldName<TInput>, string>>;
    };

export const idle = { status: "idle" } as const;

// Round-tripping these through the RSC payload would serve no purpose.
const NEVER_ECHO = new Set(["password", "confirmPassword"]);

function echo<TInput>(
  formData: FormData,
): Partial<Record<FieldName<TInput>, string>> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !NEVER_ECHO.has(key)) values[key] = value;
  }
  return values as Partial<Record<FieldName<TInput>, string>>;
}

export function validationError<TInput>(
  error: z.ZodError<TInput>,
  formData: FormData,
): ActionResult<TInput, never> {
  const { formErrors, fieldErrors } = z.flattenError(error);
  return {
    status: "error",
    fieldErrors: fieldErrors as FieldErrors<TInput>,
    formError: formErrors[0],
    values: echo<TInput>(formData),
  };
}

export function fieldError<TInput>(
  field: FieldName<TInput>,
  message: string,
  formData: FormData,
): ActionResult<TInput, never> {
  const fieldErrors: FieldErrors<TInput> = {};
  fieldErrors[field] = [message];
  return { status: "error", fieldErrors, values: echo<TInput>(formData) };
}

export function formError<TInput>(
  message: string,
  formData: FormData,
): ActionResult<TInput, never> {
  return {
    status: "error",
    fieldErrors: {},
    formError: message,
    values: echo<TInput>(formData),
  };
}
