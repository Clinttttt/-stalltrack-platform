# StallTrack transactional email and link audit — 2026-10-22

## Scope and production status

Production Zoho SMTP for `founder@stalltrack.site` is configured via root-protected `/etc/stalltrack/smtp.env` and loaded by the Docker API Compose service. The operator confirmed that email is being received; an SMTP test submission and API readiness HTTP 200 were observed. **SMTP acceptance does not independently prove delivery to all recipients, inbox placement, or completion of every multi-step workflow.** Do not include SMTP secrets or one-time tokens in logs, docs, messages or tests.

## Email entry points and destinations

| Email purpose | Sender/code | Link destination | Route/handling | Current assurance |
| --- | --- | --- | --- | --- |
| Platform Operator email confirmation | `EmailVerificationSender` | `https://admin.stalltrack.site/verify-email/{token}` | New Angular route + explicit confirmation to `POST /api/adminauth/verify-email` | **Locally fixed**; Angular tests passing; production Angular release not deployed |
| Head / municipal Admin email confirmation | `EmailVerificationSender` | `https://console.stalltrack.site/verify-email/{token}?lgu=...` | Blazor `VerifyEmail.razor` + same API; changed to explicit click (safer for scanners) | Locally fixed; build required; no real recipient verification replay |
| Platform Operator password reset | `RequestPasswordResetCommandHandler` | `https://admin.stalltrack.site/reset-password/{token}` | Existing Angular route, `reset-context` GET and `reset-password` POST | Code/route inspected; no live reset performed |
| Municipal Admin / Head password reset | same handler | `https://console.stalltrack.site/reset-password/{token}?lgu=...` | Existing Blazor `ResetPassword.razor` | Code/route inspected; no live reset performed |
| LGU assessment approval | `ApproveAssessmentRequestCommandHandler` | `https://www.stalltrack.site/onboarding/{token}` | Angular Landing `onboarding/:token` | Code/route inspected; no production approval triggered |
| Newly activated LGU Head | `ActivateMunicipalityCommandHandler` | `https://console.stalltrack.site/activate/{token}` | Existing Blazor `AdminActivate.razor` | Code/route inspected; no production activation triggered |
| Administrator invitations / resend | `InvitationMail` and `ResendAdminInvitationCommandHandler` | `https://console.stalltrack.site/activate/{token}` | Existing Blazor `AdminActivate.razor` | Code/route inspected; no invitation dispatched |
| Password-change notification | `ResetPasswordByTokenCommandHandler` | informational email, not a one-time link | Shared SMTP | Code inspected; no live reset performed |

## Verified and pending

- Platform Admin tests: **151/151 passed**, including new email confirmation screen and API request tests. Opening the email's Angular route does not POST; only clicking its button does.
- The signed-in Platform Admin screenshot confirmed email was delivered, but the missing `verify-email/:token` route caused the browser to fall back to the dashboard. That route, service method, and sign-in-style UI are now present locally.
- The LGU Blazor `VerifyEmail.razor` formerly confirmed during `OnAfterRenderAsync`; now requires an explicit click before consuming the token. This prevents link-preview/security scanners from consuming verification tokens. Confirm the client build compiles before release.
- Existing LGU email delivery sends are best-effort: approval and Head activation proceed even if SMTP submission fails. Correct SMTP configuration reduces those failures, but a production end-to-end confirmation should examine the actual recipient's mailbox.
- Real deliveries for LGU assessment approval, activation, and each password reset remain **not end-to-end verified**. Do not report them as tested or alter real LGU onboarding records merely to produce a test.

## Release boundary

These fixes are deliberately **local only** in the Platform Angular and EEMO Blazor source repositories, preserving all other uncommitted changes. No push, merge, production deploy, production database modification, account-status override, or resend is part of this audit.

When ready, review the pending work, release the Platform Admin Angular app through its own Vercel deployment procedure, and separately publish the Blazor Client through the source master CI/CD. The running production admin site will continue to redirect unmatched verification URLs until the Angular fix is deployed. Do not expose actual verification tokens in public bug reports.
