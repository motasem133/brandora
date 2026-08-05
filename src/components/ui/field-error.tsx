/**
 * The message a field was refused for.
 *
 * `role="alert"` because the text appears after a submission the user has
 * already made: without it the error is drawn on screen and announced nowhere.
 * The `id` is what lets the control point at it with `aria-describedby`, which
 * is how a screen-reader user hears the reason when they return to the field —
 * `Field` wires both automatically.
 */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null

  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-danger">
      {message}
    </p>
  )
}
