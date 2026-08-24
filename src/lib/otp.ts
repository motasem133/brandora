/**
 * How long a verification code lives.
 *
 * Long enough to switch to a mail app, wait for delivery and come back; short
 * enough that a code left visible on a shared screen stops working. It sits in
 * `lib` rather than beside the auth config because three things have to agree
 * on it: the plugin that issues the code, the email that carries it, and the
 * panel that says how long it lasts — and the panel is a client component.
 */
export const OTP_MINUTES = 10
