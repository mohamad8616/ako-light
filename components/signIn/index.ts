/**
 * Public entry point for the sign-in feature (`components/signIn/`).
 *
 * Usage — the route only needs the default export:
 *
 *   import SignInForm from "@/components/signIn";
 *
 * …or import a piece on its own (tests, an admin login card, a Stepper):
 *
 *   import { AuthTextField, useSignInForm } from "@/components/signIn";
 *
 * Why a barrel: the route keeps one stable import path even if the files
 * inside are renamed or split further, and the named re-exports make the field
 * groups, banner, toggle and hook usable in isolation.
 *
 * Instructions:
 *   - Do NOT add `"use client"` to this file. The route is a server component
 *     and each re-exported module already carries its own directive, which is
 *     what keeps the client boundary at the card instead of the page. A
 *     directive here would drag the route's <main> (and any future server-only
 *     import) into the client bundle.
 *   - When adding a file to components/signIn/: give it a default export and
 *     add one line below; keep the barrel's default export pointing at
 *     SignInForm, because that is what the route imports.
 *   - Type-only exports (`AuthMethod`, `FormState`, `AuthSegmentedOption`) are
 *     re-exported with `export type` so they never end up in the runtime graph.
 */
export { default } from "./SignInForm";
export { default as AuthSegmentedControl } from "./AuthSegmentedControl";
export type { AuthSegmentedOption } from "./AuthSegmentedControl";
export { default as AuthTextField } from "./AuthTextField";
export { default as EmailPasswordFields } from "./EmailPasswordFields";
export { default as FeedbackMessage } from "./FeedbackMessage";
export { default as PhoneFields } from "./PhoneFields";
export { useSignInForm } from "./useSignInForm";
export { initialForm, OTP_LENGTH } from "./types";
export type { AuthMethod, AuthMode, FormState } from "./types";
