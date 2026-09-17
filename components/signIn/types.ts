/**
 * Vocabulary, constants and the empty-form value for the sign-in feature.
 *
 * Pure data only — no React, no imports. Keeping this module dependency-free
 * means the state hook, the presentational fields and any future tests all
 * agree on one definition of the form.
 *
 * How the pieces fit together (`components/signIn/`):
 *   types.ts                -> this file: AuthMode, AuthMethod, FormState
 *   useSignInForm.ts        -> state machine + better-auth calls + labels
 *   SignInForm.tsx          -> composes the card (import this from a route)
 *   EmailPasswordFields.tsx -> which inputs the email flows show
 *   PhoneFields.tsx         -> which inputs the phone flows show
 *   AuthTextField.tsx       -> one labelled input (presentation only)
 *   AuthSegmentedControl.tsx-> the email/phone and sign-in/create toggles
 *   FeedbackMessage.tsx     -> the error/success banner
 *
 * Everything is "props in, callbacks out": only useSignInForm holds state, so
 * a field component can be reordered, restyled or extracted without touching
 * the auth logic.
 *
 * Adding a field (example: an optional company name):
 *   1. add `company: string` to FormState and `company: ""` to initialForm;
 *   2. render an <AuthTextField> for it in the field component that should show
 *      it and forward `onChange("company", value)`;
 *   3. read `form.company` in the matching handler in useSignInForm.ts.
 * `updateField`'s parameter is `keyof FormState`, so no other file changes.
 */

/**
 * Length of the phone verification code, in digits.
 *
 * Mirrors the server-side `phoneNumber({ otpLength: 6 })` option in
 * lib/auth/auth.ts and the `input maxLength`/slice in PhoneFields.tsx. Change
 * it here (then bump the server option to match) — nothing else hardcodes 6.
 */
export const OTP_LENGTH = 6;

/** Which account operation the form is performing. */
export type AuthMode = "signIn" | "createAccount";

/** Which credential the user authenticates with. */
export type AuthMethod = "email" | "phone";

/**
 * The controlled form values, one property per input the UI can render.
 *
 * Every input is always present (even when hidden), so switching method or
 * mode never throws a field away — a user who types an email, flips to phone
 * and back still finds their value. Handlers ignore the fields that the chosen
 * flow does not send (see the request matrix in useSignInForm.ts).
 */
export interface FormState {
  /** Email address (`/sign-in/email`, `/sign-up/email`). */
  email: string;
  /** Display name — sent as `name` on email sign-up only. */
  name: string;
  /** Password — email flows, and phone sign-in (`/sign-in/phone-number`). */
  password: string;
  /** Phone number in E.164 form (`+98912...`); trimmed before every call. */
  phoneNumber: string;
  /** Digits of the SMS code — phone sign-up (`/phone-number/verify`) only. */
  otp: string;
}

/**
 * Empty starting value for {@link FormState}.
 *
 * Declared as a module constant (not inline in `useState`) so it is created
 * once, is safe to reuse as a reset target, and reads as "the empty form".
 */
export const initialForm: FormState = {
  email: "",
  name: "",
  password: "",
  phoneNumber: "",
  otp: "",
};
