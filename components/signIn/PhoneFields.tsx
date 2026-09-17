"use client";

import { AnimatePresence, motion } from "framer-motion";
import PhoneEntryStep from "./PhoneEntryStep";
import PhoneVerifyStep from "./PhoneVerifyStep";
import type { FormState } from "./types";

interface PhoneFieldsProps {
  form: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  otpSent: boolean;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  isSendingOtp: boolean;
  isSubmitting: boolean;
  onSendOtp: () => void;
  onEditNumber: () => void;
  onVerify: () => void;
}

/**
 * Phone flow container — mounts exactly one step at a time.
 *
 *   !otpSent -> entry (number + terms + referral + Get code)
 *   otpSent  -> verify (code boxes + resend + Verify)
 */
export default function PhoneFields({
  form,
  onChange,
  otpSent,
  termsAccepted,
  onTermsChange,
  isSendingOtp,
  isSubmitting,
  onSendOtp,
  onEditNumber,
  onVerify,
}: PhoneFieldsProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!otpSent ? (
        <motion.div
          key="phone-entry"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
        >
          <PhoneEntryStep
            form={form}
            onChange={onChange}
            termsAccepted={termsAccepted}
            onTermsChange={onTermsChange}
            isSendingOtp={isSendingOtp}
            isSubmitting={isSubmitting}
            onSendOtp={onSendOtp}
          />
        </motion.div>
      ) : (
        <motion.div
          key="phone-verify"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
        >
          <PhoneVerifyStep
            form={form}
            onChange={onChange}
            isSendingOtp={isSendingOtp}
            isSubmitting={isSubmitting}
            onSendOtp={onSendOtp}
            onEditNumber={onEditNumber}
            onVerify={onVerify}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
