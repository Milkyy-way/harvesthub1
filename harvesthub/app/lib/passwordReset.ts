import { supabase } from './supabase';

// Emails a password-reset CODE (customers and farmers share one login).
// The code comes from Supabase's "Reset Password" email template, which must
// show {{ .Token }} rather than {{ .ConfirmationURL }} — see V1.md. A code
// rather than a link: a link only works when opened on the phone that has
// the app installed (a laptop, or an email app that blocks app links, is a
// dead end), and email link-scanners can use up a one-time link before the
// user clicks it; a code can be read on any device. The user enters it on
// app/(auth)/reset-password.tsx, which verifies it with
// supabase.auth.verifyOtp({ email, token, type: 'recovery' }).
export function sendPasswordResetCode(email: string) {
  return supabase.auth.resetPasswordForEmail(email);
}
