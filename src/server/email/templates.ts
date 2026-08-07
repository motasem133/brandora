/**
 * Transactional email templates.
 *
 * Deliberately not marked server-only: this is pure string rendering with no
 * secrets, and the guard would make it impossible to render a template in a
 * test without a Next.js runtime. The API key lives in send.ts, which is
 * guarded.
 *
 * Plain HTML strings rather than a component library: these are four short
 * emails, mail clients only reliably support a subset of HTML anyway, and the
 * obvious React option is deprecated. Hand-written markup also makes the RTL
 * variant a one-line change rather than a framework concern.
 */

type Locale = 'en' | 'ar'

export type EmailTemplate =
  | { kind: 'verify-email'; url: string; name: string }
  | { kind: 'verify-code'; code: string; name: string; minutes: number }
  | { kind: 'reset-password'; url: string; name: string }
  | { kind: 'org-invite'; url: string; inviter: string; organization: string }

const COPY = {
  en: {
    'verify-email': {
      subject: 'Confirm your email for Brandora',
      heading: 'Confirm your email',
      body: (name: string) =>
        `Hello ${name}, confirm this address to start generating your brand identity.`,
      button: 'Confirm email',
      footer: 'If you did not create a Brandora account, you can ignore this email.',
    },
    'verify-code': {
      subject: (code: string) => `${code} is your Brandora confirmation code`,
      heading: 'Your confirmation code',
      body: (name: string, minutes: number) =>
        `Hello ${name}, enter this code on the page you left open. It expires in ${minutes} minutes.`,
      footer: 'If you did not create a Brandora account, you can ignore this email.',
    },
    'reset-password': {
      subject: 'Reset your Brandora password',
      heading: 'Reset your password',
      body: (name: string) =>
        `Hello ${name}, use the link below to choose a new password. It expires in one hour.`,
      button: 'Choose a new password',
      footer: 'If you did not ask to reset your password, you can ignore this email — nothing has changed.',
    },
    'org-invite': {
      subject: 'You have been invited to a Brandora workspace',
      heading: 'Join the workspace',
      body: (inviter: string, organization: string) =>
        `${inviter} has invited you to join ${organization} on Brandora.`,
      button: 'Accept invitation',
      footer: 'If you were not expecting this, you can ignore this email.',
    },
    fallbackNote: 'If the button does not work, paste this link into your browser:',
  },
  ar: {
    'verify-email': {
      subject: 'أكّد بريدك الإلكتروني في براندورا',
      heading: 'أكّد بريدك الإلكتروني',
      body: (name: string) => `مرحباً ${name}، أكّد هذا العنوان لتبدأ بتوليد هوية علامتك التجارية.`,
      button: 'تأكيد البريد',
      footer: 'إذا لم تنشئ حساباً في براندورا، يمكنك تجاهل هذه الرسالة.',
    },
    'verify-code': {
      subject: (code: string) => `${code} هو رمز التأكيد الخاص بك في براندورا`,
      heading: 'رمز التأكيد',
      body: (name: string, minutes: number) =>
        `مرحباً ${name}، أدخل هذا الرمز في الصفحة التي تركتها مفتوحة. تنتهي صلاحيته خلال ${minutes} دقائق.`,
      footer: 'إذا لم تنشئ حساباً في براندورا، يمكنك تجاهل هذه الرسالة.',
    },
    'reset-password': {
      subject: 'إعادة تعيين كلمة المرور في براندورا',
      heading: 'إعادة تعيين كلمة المرور',
      body: (name: string) =>
        `مرحباً ${name}، استخدم الرابط أدناه لاختيار كلمة مرور جديدة. تنتهي صلاحيته خلال ساعة.`,
      button: 'اختيار كلمة مرور جديدة',
      footer: 'إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة — لم يتغيّر شيء.',
    },
    'org-invite': {
      subject: 'دعوة للانضمام إلى مساحة عمل في براندورا',
      heading: 'انضم إلى مساحة العمل',
      body: (inviter: string, organization: string) =>
        `دعاك ${inviter} للانضمام إلى ${organization} على براندورا.`,
      button: 'قبول الدعوة',
      footer: 'إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها.',
    },
    fallbackNote: 'إذا لم يعمل الزر، الصق هذا الرابط في متصفحك:',
  },
} as const

/** Escapes anything that reaches the markup from a name or an organization. */
function escape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function layout(params: {
  locale: Locale
  heading: string
  body: string
  button: string
  url: string
  footer: string
}) {
  const { locale } = params
  const rtl = locale === 'ar'
  const dir = rtl ? 'rtl' : 'ltr'
  const align = rtl ? 'right' : 'left'
  const font = rtl
    ? "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  /*
   * Tables and inline styles on purpose. Mail clients strip stylesheets and
   * many still lay out with tables, so this is the shape that survives them.
   */
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(params.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;font-family:${font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px;text-align:${align};">
            <tr>
              <td>
                <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#7240ff;">Brandora</p>
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">${escape(params.heading)}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">${escape(params.body)}</p>
                <a href="${params.url}" style="display:inline-block;background:#7240ff;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:500;">${escape(params.button)}</a>
                <p style="margin:24px 0 6px;font-size:12px;color:#9ca3af;">${escape(COPY[locale].fallbackNote)}</p>
                <!-- The fallback URL is 12px, so it takes the light theme's
                     readable accent (7.53:1 on white) rather than the fill
                     colour, which measures 5.44:1. Same rule as the app. -->
                <p style="margin:0 0 24px;font-size:12px;word-break:break-all;"><a href="${params.url}" style="color:#5b33cc;">${params.url}</a></p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">${escape(params.footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * The same card, with a code where the button goes.
 *
 * A code is read and retyped rather than clicked, so it is set large, spaced
 * and monospaced — proportional digits at body size are where a 6 becomes an 8.
 * There is deliberately no link anywhere in this email: the whole point of the
 * code is that the customer stays on the page they already have open, and a
 * button would invite them to leave it.
 */
function codeLayout(params: {
  locale: Locale
  heading: string
  body: string
  code: string
  footer: string
}) {
  const { locale } = params
  const rtl = locale === 'ar'
  const dir = rtl ? 'rtl' : 'ltr'
  const align = rtl ? 'right' : 'left'
  const font = rtl
    ? "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif"
    : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(params.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f8;font-family:${font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px;text-align:${align};">
            <tr>
              <td>
                <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#7240ff;">Brandora</p>
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">${escape(params.heading)}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">${escape(params.body)}</p>
                <!-- The code is always LTR: digits are read left to right in
                     Arabic too, and letting the RTL context reverse a grouped
                     string is how a code gets typed in backwards. -->
                <p dir="ltr" style="margin:0 0 24px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#111827;text-align:center;background:#f6f6f8;border-radius:14px;padding:18px 12px;">${escape(params.code)}</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">${escape(params.footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function renderEmail(template: EmailTemplate, locale: Locale = 'en') {
  const copy = COPY[locale]

  switch (template.kind) {
    case 'verify-code': {
      const c = copy['verify-code']
      return {
        // The code is in the subject as well, so it can be read from a
        // notification without opening anything.
        subject: c.subject(template.code),
        html: codeLayout({
          locale,
          heading: c.heading,
          body: c.body(template.name, template.minutes),
          code: template.code,
          footer: c.footer,
        }),
      }
    }
    case 'verify-email': {
      const c = copy['verify-email']
      return {
        subject: c.subject,
        html: layout({
          locale,
          heading: c.heading,
          body: c.body(template.name),
          button: c.button,
          url: template.url,
          footer: c.footer,
        }),
      }
    }
    case 'reset-password': {
      const c = copy['reset-password']
      return {
        subject: c.subject,
        html: layout({
          locale,
          heading: c.heading,
          body: c.body(template.name),
          button: c.button,
          url: template.url,
          footer: c.footer,
        }),
      }
    }
    case 'org-invite': {
      const c = copy['org-invite']
      return {
        subject: c.subject,
        html: layout({
          locale,
          heading: c.heading,
          body: c.body(template.inviter, template.organization),
          button: c.button,
          url: template.url,
          footer: c.footer,
        }),
      }
    }
  }
}
