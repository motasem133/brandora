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
  /**
   * The brand a customer waited for, once it exists.
   *
   * Carries a goodwill code as well as the link, because this is sent after a
   * run that failed on our side — the apology and the delivery are one email
   * rather than two.
   */
  | { kind: 'brand-ready'; url: string; name: string; code: string; percent: number }
  /**
   * The one reminder a finished brand earns.
   *
   * Not to be confused with `brand-ready` above, which it sits next to and does
   * not resemble: that one is an apology for a run that failed on our side and
   * carries a goodwill code. This is sent two days after a run that worked, to
   * someone who has not been back since — no apology, nothing to make up for,
   * and nothing to type. One link to the brand they already own.
   */
  | { kind: 'brand-nudge'; url: string; brand: string }
  /**
   * A message somebody sent through a customer's own published site.
   *
   * The only email this product sends that is not about Brandora. It is a
   * customer's business enquiry passing through us, so it says almost nothing
   * of its own: who wrote, what they wrote, and how to answer. Reply-to is set
   * to the visitor, so answering is a reply rather than a copy-paste.
   */
  | {
      kind: 'site-message'
      siteName: string
      fromName: string
      fromEmail: string
      message: string
    }

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
    'brand-ready': {
      subject: 'Your brand is ready — and your credits are back',
      heading: 'Your brand is ready',
      /*
       * What went wrong is said first and plainly. These customers watched a
       * spinner and saw their balance drop, so an email that opened with good
       * news and explained nothing would read as though we had not noticed.
       */
      body: (name: string) =>
        `${name}, your brand kept you waiting, and that was our fault: the run was queued but never actually started, and your credits stayed held while it sat there. It is fixed, and your brand has now been generated in full.`,
      button: 'View your brand',
      credits: 'The credits that were held have been returned to your balance — this run cost you nothing.',
      offer: (percent: number) => `And for the trouble, here is ${percent}% off your first plan:`,
      footer: 'Thank you for your patience with us early on. Reply to this email if anything is not right.',
    },
    'brand-nudge': {
      /*
       * Not "your brand is ready" — `brand-ready` above already opens with that
       * sentence, and a customer who has had both then holds two emails whose
       * subjects are the same claim. It is also the wrong claim: this brand was
       * ready days ago and its owner watched it finish, so announcing readiness
       * reads as a duplicate of a mail they have already had rather than an
       * invitation to come back.
       */
      subject: (brand: string) => `${brand} is ready when you are`,
      heading: (brand: string) => `${brand} is ready when you are`,
      /*
       * Short, and careful about what it promises. A free brand has no website
       * and no designed kit, and this email is sent to every plan — so it names
       * the things every run produces and lets the page sell the rest.
       *
       * It also says nothing about how long the brand has been sitting there.
       * The sweep normally fires at 48 hours, but the send is not bound to that
       * — this template is reachable for any project, and was sent off-schedule
       * on 17 August. Copy that asserts elapsed time ("waiting since you
       * generated it") is then plainly false to someone who generated the brand
       * that morning, which is a worse first impression than no reminder. "Still
       * where you left it" is true at eleven hours and at thirteen days.
       */
      body: () =>
        'Your brand is still where you left it — the mark, the palette and the words are all there. See how it comes together.',
      button: 'See your brand',
      footer:
        'You are getting this because you generated a brand on Brandora. It is the only reminder we send for it.',
    },
    'site-message': {
      subject: (site: string) => `New message from your ${site} website`,
      heading: 'Someone contacted you',
      body: (name: string, email: string) => `${name} (${email}) sent this through your website:`,
      footer: 'Reply to this email to answer them directly.',
    },
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
    'brand-ready': {
      subject: 'علامتك جاهزة — وأرصدتك أُعيدت إليك',
      heading: 'علامتك جاهزة',
      body: (name: string) =>
        `${name}، تأخّرت علامتك، والخطأ خطؤنا: انتظرت عملية التوليد في الطابور دون أن تبدأ فعلياً، وبقيت أرصدتك محجوزة طوال ذلك الوقت. تم إصلاح المشكلة، وعلامتك جاهزة الآن بالكامل.`,
      button: 'اعرض علامتك',
      credits: 'أُعيدت الأرصدة المحجوزة إلى رصيدك — لم يكلّفك هذا التشغيل شيئاً.',
      offer: (percent: number) => `واعتذاراً عن الإزعاج، إليك خصم ${percent}% على أول اشتراك لك:`,
      footer: 'شكراً لصبرك معنا في بداياتنا. إن كان هناك أي خلل، ردّ على هذه الرسالة.',
    },
    'brand-nudge': {
      /* Not "علامتك جاهزة" — see the English note on the collision. */
      subject: (brand: string) => `${brand} جاهزة متى شئت`,
      heading: (brand: string) => `${brand} جاهزة متى شئت`,
      /* No claim about elapsed time here either — see the English note. */
      body: () =>
        'علامتك ما زالت كما تركتها — الشعار ولوحة الألوان والنصوص كلها هناك. اطّلع على شكلها مجتمعة.',
      button: 'اعرض علامتك',
      footer: 'وصلتك هذه الرسالة لأنك ولّدت علامة على براندورا، وهي التذكير الوحيد الذي نرسله عنها.',
    },
    'site-message': {
      subject: (site: string) => `رسالة جديدة من موقع ${site}`,
      heading: 'وصلتك رسالة',
      body: (name: string, email: string) => `أرسل ${name} (${email}) هذه الرسالة عبر موقعك:`,
      footer: 'رُدّ على هذا البريد للتواصل معه مباشرة.',
    },
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

/**
 * Where the mark is fetched from.
 *
 * A mail client has no origin to resolve a relative path against, so the image
 * has to carry the full URL. Read from the raw environment rather than through
 * `@/lib/env` on purpose: that module validates the whole server environment on
 * import, and this file is deliberately importable from a plain test.
 */
const MARK_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/brandora-mark.png`

/*
 * The mark's own ramp, which is the app's — violet at the light end, sinking
 * through indigo into deep blue. See globals.css, where the same three stops
 * are the source of every lit surface in the product.
 */
const VIOLET = '#7240ff'
const INDIGO = '#4b46c9'
const DEEP = '#1e4585'
/** The violet at 12% on white, and the line it makes. Both mixed flat, because
    a mail client will not evaluate color-mix. */
const TINT = '#f4f1ff'
const TINT_LINE = '#e6dfff'
/** The readable accent: 7.53:1 on white, where the fill violet is 5.44:1. */
const ACCENT = '#5b33cc'
const INK = '#111827'
const INK_SOFT = '#4b5563'
const INK_FAINT = '#8b87a3'

/**
 * The card every email is.
 *
 * Tables and inline styles on purpose. Mail clients strip stylesheets and many
 * still lay out with tables, so this is the shape that survives them — which is
 * also why the palette above is a set of flat hex values rather than the
 * product's tokens.
 *
 * `main` is whatever the email is actually for: a button, or a code. It is the
 * only thing that differs between the two, and it used to be the excuse for two
 * near-identical copies of this markup that drifted apart at the edges.
 */
function shell(params: {
  locale: Locale
  heading: string
  body: string
  main: string
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
  <body style="margin:0;padding:0;background:${TINT};font-family:${font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TINT};padding:40px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid ${TINT_LINE};text-align:${align};">
            <!-- The ramp as a rule along the top edge, running from the reading
                 edge inwards so the violet lands under the mark in both
                 directions. Clients that drop the gradient keep the solid
                 violet under it, which is the stop the mark starts from. -->
            <tr>
              <td style="height:4px;line-height:4px;font-size:0;background-color:${VIOLET};background-image:linear-gradient(${rtl ? 270 : 90}deg,${VIOLET},${INDIGO} 55%,${DEEP});border-radius:16px 16px 0 0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <!-- The lockup as inline content rather than a table: an inline
                     image and its label swap sides with the direction on their own, so
                     Arabic needs no mirrored copy of this row. -->
                <p style="margin:0 0 28px;font-size:20px;line-height:1;font-weight:700;color:${VIOLET};">
                  <img src="${MARK_URL}" width="36" height="36" alt="" style="vertical-align:middle;border:0;outline:none;text-decoration:none;" />
                  <span style="vertical-align:middle;padding-${rtl ? 'right' : 'left'}:10px;">Brandora</span>
                </p>
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${INK};">${escape(params.heading)}</h1>
                <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${INK_SOFT};">${escape(params.body)}</p>
                ${params.main}
                <hr style="border:none;border-top:1px solid ${TINT_LINE};margin:28px 0 16px;" />
                <p style="margin:0;font-size:12px;line-height:1.6;color:${INK_FAINT};">${escape(params.footer)}</p>
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
 * The card, with the action as a button.
 *
 * The button is the whole path: the pasteable copy of the URL that used to sit
 * under it is gone. It printed a signed one-time token in full across three
 * lines of an otherwise calm email, which is the part of the message that looks
 * most like a phishing attempt and the part a customer is most likely to read
 * as one — and every mail client that can render this can follow a link.
 */
function layout(params: {
  locale: Locale
  heading: string
  body: string
  button: string
  url: string
  footer: string
}) {
  return shell({
    ...params,
    main: `<a href="${params.url}" style="display:inline-block;background-color:${VIOLET};background-image:linear-gradient(135deg,${VIOLET},${INDIGO} 55%,${DEEP});color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:600;">${escape(params.button)}</a>`,
  })
}

/**
 * The card, with a code where the button goes.
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
  return shell({
    ...params,
    /* The code is always LTR: digits are read left to right in Arabic too, and
       letting the RTL context reverse a grouped string is how a code gets typed
       in backwards. It is set in the readable accent — 6.6:1 on the tint — so
       the one thing the email exists to carry is also the one thing wearing the
       brand's colour. */
    /* `text-indent` cancels the trailing letter-space, which centring counts as
       part of the string and which otherwise sits the code half a character
       right of the middle of its own box. */
    main: `<p dir="ltr" style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;text-indent:0.28em;color:${ACCENT};text-align:center;background:${TINT};border:1px solid ${TINT_LINE};border-radius:14px;padding:18px 12px;">${escape(params.code)}</p>`,
  })
}

/**
 * The card, carrying somebody else's words.
 *
 * No button and no code: there is nothing to click and nothing to type, only
 * something to read and reply to. The message is set in a quoted block so it
 * reads as the visitor's writing rather than as ours — this is the one email
 * where most of the content was not written by this product.
 *
 * `white-space: pre-wrap`, because a person typing into a textarea uses line
 * breaks and an email that collapses them turns their paragraphs into one.
 */
function quoteLayout(params: {
  locale: Locale
  heading: string
  body: string
  quote: string
  footer: string
}) {
  return shell({
    ...params,
    main: `<p dir="auto" style="margin:0;white-space:pre-wrap;font-size:15px;line-height:1.65;color:${INK};text-align:start;background:${TINT};border:1px solid ${TINT_LINE};border-radius:14px;padding:18px 20px;">${escape(params.quote)}</p>`,
  })
}

/**
 * The card, carrying a link and a code.
 *
 * The two other action layouts each hold one or the other, and deliberately: an
 * email with two things to do is an email where neither gets done. This one is
 * the exception the situation earns — the link is the delivery and the code is
 * the apology, and splitting them into two emails to a customer we have already
 * let down would be worse than the crowding.
 *
 * The order says which is which. The button is the point; the code sits under a
 * rule, quieter, so it reads as something extra rather than as the reason we
 * wrote.
 */
function offerLayout(params: {
  locale: Locale
  heading: string
  body: string
  button: string
  url: string
  credits: string
  offer: string
  code: string
  footer: string
}) {
  const rtl = params.locale === 'ar'

  return shell({
    ...params,
    main: `<a href="${params.url}" style="display:inline-block;background-color:${VIOLET};background-image:linear-gradient(135deg,${VIOLET},${INDIGO} 55%,${DEEP});color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:600;">${escape(params.button)}</a>
              <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#4c5570;">${escape(params.credits)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid ${TINT_LINE};">
                <tr>
                  <td style="padding-top:20px;">
                    <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#4c5570;">${escape(params.offer)}</p>
                    <!-- The code is always LTR, for the reason the verification
                         code is: a grouped string reversed by an RTL context is
                         a code typed in backwards. -->
                    <p dir="ltr" style="margin:0;text-align:${rtl ? 'right' : 'left'};">
                      <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:0.16em;text-indent:0.16em;color:${ACCENT};background:${TINT};border:1px solid ${TINT_LINE};border-radius:10px;padding:10px 18px;">${escape(params.code)}</span>
                    </p>
                  </td>
                </tr>
              </table>`,
  })
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

    case 'brand-nudge': {
      const c = copy['brand-nudge']
      return {
        /* The brand's own name in the subject, because that is the only word in
           this email the reader is waiting to see — and the only thing that
           tells it apart from every other product email in an inbox. */
        subject: c.subject(template.brand),
        html: layout({
          locale,
          heading: c.heading(template.brand),
          body: c.body(),
          button: c.button,
          url: template.url,
          footer: c.footer,
        }),
      }
    }

    case 'site-message': {
      const c = copy['site-message']
      return {
        subject: c.subject(template.siteName),
        html: quoteLayout({
          locale,
          heading: c.heading,
          body: c.body(template.fromName, template.fromEmail),
          quote: template.message,
          footer: c.footer,
        }),
      }
    }

    case 'brand-ready': {
      const c = copy['brand-ready']
      return {
        subject: c.subject,
        html: offerLayout({
          locale,
          heading: c.heading,
          body: c.body(template.name),
          button: c.button,
          url: template.url,
          credits: c.credits,
          offer: c.offer(template.percent),
          code: template.code,
          footer: c.footer,
        }),
      }
    }
  }
}
