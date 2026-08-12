import 'server-only'

/**
 * The privacy policy and the terms, as content rather than as pages.
 *
 * Not in `messages/*.json` on purpose. next-intl ships a whole namespace to the
 * browser, so several thousand words of legal text sitting in `Landing` or
 * `Common` would be downloaded by every visitor to every page in order to be
 * read by almost none of them. Server-only, imported by two routes, rendered
 * and gone.
 *
 * Everything factual here was read out of this codebase rather than adapted
 * from a template: the fields are the columns that exist, and the processors
 * below are the services this application actually calls. A policy that lists a
 * vendor nobody uses is as wrong as one that omits a vendor who holds customer
 * data, and it is the kind of wrong that is only discovered during an incident.
 *
 * The Arabic is a translation of the English rather than a separate document,
 * and both say so: one of them has to govern, and it cannot be the one written
 * second.
 */

export type LegalSection = { heading: string; body: string[] }
export type LegalDocument = {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
  /** Says which language wins where the two disagree. */
  governingLanguage?: string
}

const UPDATED_EN = 'Last updated 12 August 2026'
const UPDATED_AR = 'آخر تحديث ١٢ أغسطس ٢٠٢٦'

const GOVERNING_AR =
  'هذه الصفحة ترجمة للنسخة الإنجليزية. عند أي اختلاف بين النصّين، تسري النسخة الإنجليزية.'

export const privacy: Record<'en' | 'ar', LegalDocument> = {
  en: {
    title: 'Privacy',
    updated: UPDATED_EN,
    intro:
      'Brandora is operated by Enigmitic, in the United Arab Emirates. This page says what the product holds about you, who else it passes through, and how to have it back or removed. Questions go to hello@enigmitic.com.',
    sections: [
      {
        heading: 'What you give us',
        body: [
          'An account needs a name, an email address, and either a password or a Google sign-in. Passwords are stored hashed and are never readable by us. If you sign in with Google we receive your name, email address and profile picture, and nothing else from your Google account.',
          'A brand run needs a business name, an industry, a country, a style and whatever brief you write. Those words are sent to the AI models listed below, because that is how the brand gets made.',
          'Everything the product then produces — names, slogans, palettes, fonts, the written brand, website copy, social copy, logo concepts, kit photography, and anything made in Content Studio — is stored against your workspace so you can come back to it.',
        ],
      },
      {
        heading: 'What we record as you use it',
        body: [
          'A session cookie, so you stay signed in. It is required; the product cannot work without it.',
          'A ledger of every credit granted and spent, and a record of every model call: which model, how many tokens, what it cost us. This is how billing is checked and how the price of the product is understood.',
          'Product analytics — which steps of a run are reached and where people stop — and error reports when something breaks. Both are used to fix the product, not to build a profile of you.',
        ],
      },
      {
        heading: 'Messages sent through a published site',
        body: [
          'When a customer publishes a website with Brandora, its contact form collects a visitor’s name, email address and message. We store that message and email it to the customer who owns the site.',
          'For those messages the customer is responsible for what they do with them, and we are only the means of delivery. If you sent a message through someone’s Brandora site and want it removed, write to us and we will pass it on and delete our copy.',
        ],
      },
      {
        heading: 'Card details',
        body: [
          'We never see them. Payments run through Polar, which is the merchant of record: they take the payment, they hold the card, and they collect any tax. What reaches us is the fact that an order succeeded and which plan or credit pack it was for.',
        ],
      },
      {
        heading: 'Who else processes it',
        body: [
          'Vercel — hosting, and the traffic analytics on our own marketing pages.',
          'Neon — the PostgreSQL database, hosted on AWS in us-east-1.',
          'Cloudflare R2 — storage for generated images, documents and brand kits.',
          'OpenRouter — the text models that write names, stories, website and social copy.',
          'fal — the image models that draw logo concepts and kit photography.',
          'Polar — payments, subscriptions and invoicing, as merchant of record.',
          'Resend — transactional email: verification codes, password resets, invitations, and contact-form delivery.',
          'Inngest — the queue that runs generations in the background.',
          'Sentry — error reports. PostHog — product analytics.',
          'Google — only if you choose to sign in with it.',
        ],
      },
      {
        heading: 'How long it is kept',
        body: [
          'Your account and its work stay until you delete them. Deleting a project removes its generated assets. Closing your account removes the account, its workspaces and their contents.',
          'Two things outlive that, and only in a reduced form: the credit ledger and payment records, which are kept because they are accounting records, and aggregate usage figures that no longer identify anyone.',
        ],
      },
      {
        heading: 'What you can ask for',
        body: [
          'A copy of what we hold, a correction, or a deletion. Write to hello@enigmitic.com from the address on the account and we will act within thirty days.',
          'We do not sell personal data, and we do not use your briefs or generated work to train our own models. The providers above process what we send them under their own terms as our processors.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          'If this policy changes in a way that matters, the date at the top changes and anyone with an account is told by email before it takes effect.',
        ],
      },
    ],
  },
  ar: {
    title: 'الخصوصية',
    updated: UPDATED_AR,
    governingLanguage: GOVERNING_AR,
    intro:
      'تُشغّل براندورا شركة Enigmitic في الإمارات العربية المتحدة. توضّح هذه الصفحة ما يحتفظ به المنتج عنك، ومن يمرّ به، وكيف تسترجعه أو تحذفه. للأسئلة: hello@enigmitic.com.',
    sections: [
      {
        heading: 'ما تعطينا إياه',
        body: [
          'يحتاج الحساب إلى اسم وبريد إلكتروني، وإما كلمة مرور أو تسجيل دخول عبر Google. تُخزَّن كلمات المرور مشفّرة ولا يمكننا قراءتها. إذا سجّلت الدخول عبر Google فنستلم اسمك وبريدك وصورة حسابك، ولا شيء غير ذلك.',
          'يحتاج توليد العلامة إلى اسم النشاط ومجاله والدولة والأسلوب والوصف الذي تكتبه. تُرسَل هذه الكلمات إلى نماذج الذكاء الاصطناعي المذكورة أدناه، لأن بها تُصنع العلامة.',
          'كل ما ينتجه المنتج بعد ذلك — الأسماء والشعارات النصية والألوان والخطوط وقصة العلامة ونصوص الموقع ونصوص السوشال والشعارات وصور الحزمة وأي محتوى في الاستوديو — يُحفَظ في مساحة عملك لترجع إليه.',
        ],
      },
      {
        heading: 'ما نسجّله أثناء الاستخدام',
        body: [
          'ملف تعريف ارتباط للجلسة ليبقى دخولك قائماً. وهو ضروري، ولا يعمل المنتج بدونه.',
          'سجلّ لكل رصيد مُنِح أو أُنفِق، وسجلّ لكل استدعاء نموذج: أي نموذج، وكم استهلك، وكم كلّفنا. بهذا تُراجَع الفوترة ويُفهَم سعر المنتج.',
          'تحليلات استخدام — أي خطوات تُبلَغ وأين يتوقف الناس — وتقارير أخطاء عند حدوث خلل. كلاهما لإصلاح المنتج، لا لبناء ملف عنك.',
        ],
      },
      {
        heading: 'الرسائل عبر موقع منشور',
        body: [
          'حين ينشر عميل موقعاً عبر براندورا، يجمع نموذج التواصل اسم الزائر وبريده ورسالته. نحفظ الرسالة ونرسلها بالبريد إلى صاحب الموقع.',
          'العميل هو المسؤول عمّا يفعله بتلك الرسائل، ونحن وسيلة التوصيل فقط. إن أرسلت رسالة عبر موقع أحدهم وأردت حذفها، راسلنا وسنبلغه ونحذف نسختنا.',
        ],
      },
      {
        heading: 'بيانات البطاقة',
        body: [
          'لا نراها أبداً. تمرّ المدفوعات عبر Polar بصفتها التاجر المسجَّل: هي من تستلم الدفع وتحتفظ ببيانات البطاقة وتحصّل الضرائب. ما يصلنا هو أن الطلب نجح وأي باقة أو حزمة رصيد كان.',
        ],
      },
      {
        heading: 'من يعالج بياناتك أيضاً',
        body: [
          'Vercel — الاستضافة وتحليلات الزيارات على صفحاتنا التعريفية.',
          'Neon — قاعدة بيانات PostgreSQL في منطقة us-east-1 على AWS.',
          'Cloudflare R2 — تخزين الصور والمستندات وحزم الهوية المولَّدة.',
          'OpenRouter — النماذج النصية التي تكتب الأسماء والقصص ونصوص الموقع والسوشال.',
          'fal — نماذج الصور التي ترسم الشعارات وصور الحزمة.',
          'Polar — المدفوعات والاشتراكات والفواتير، بصفتها التاجر المسجَّل.',
          'Resend — البريد التشغيلي: رموز التوثيق واستعادة كلمة المرور والدعوات ورسائل نموذج التواصل.',
          'Inngest — طابور المهام الذي ينفّذ التوليد في الخلفية.',
          'Sentry — تقارير الأخطاء. PostHog — تحليلات المنتج.',
          'Google — فقط إن اخترت تسجيل الدخول عبره.',
        ],
      },
      {
        heading: 'مدة الاحتفاظ',
        body: [
          'يبقى حسابك وعملك إلى أن تحذفهما. حذف مشروع يزيل ما وُلِّد فيه، وإغلاق الحساب يزيل الحساب ومساحات العمل ومحتواها.',
          'يبقى شيئان بصورة مختصرة: سجلّ الرصيد وسجلات الدفع لأنها سجلات محاسبية، وأرقام استخدام مجمّعة لا تدلّ على شخص.',
        ],
      },
      {
        heading: 'ما يمكنك طلبه',
        body: [
          'نسخة مما نحتفظ به، أو تصحيحه، أو حذفه. راسلنا على hello@enigmitic.com من بريد الحساب نفسه وسنستجيب خلال ثلاثين يوماً.',
          'لا نبيع البيانات الشخصية، ولا نستخدم أوصافك أو أعمالك المولَّدة لتدريب نماذج خاصة بنا. تعالج الجهات أعلاه ما نرسله إليها بصفتها معالِجاً لدينا ووفق شروطها.',
        ],
      },
      {
        heading: 'التغييرات',
        body: [
          'إن تغيّرت هذه السياسة بما يهمّ، يتغيّر التاريخ في الأعلى ويُبلَّغ أصحاب الحسابات بالبريد قبل السريان.',
        ],
      },
    ],
  },
}

export const terms: Record<'en' | 'ar', LegalDocument> = {
  en: {
    title: 'Terms',
    updated: UPDATED_EN,
    intro:
      'Brandora is operated by Enigmitic, in the United Arab Emirates. Using it means accepting what follows. If something here does not work for you, write to hello@enigmitic.com before you rely on the product.',
    sections: [
      {
        heading: 'The account',
        body: [
          'One person, one account, with an email address that reaches you — verification codes, invitations and receipts all go there. You are responsible for what happens under your account and for keeping your password to yourself.',
          'New accounts receive a small grant of free credits. It is a sample, not an entitlement, and it may change for future signups without notice.',
        ],
      },
      {
        heading: 'What the product does, and does not, promise',
        body: [
          'Brandora generates brand material with AI models. The same brief will not produce the same result twice, and no two customers are guaranteed different results either.',
          'It is your responsibility to check that a name, a logo or a slogan is free to use where you intend to use it. We do not perform trademark searches and nothing the product returns is legal advice or clearance.',
        ],
      },
      {
        heading: 'Credits',
        body: [
          'Credits are the unit of work. A run reserves what it will cost before it starts, and any section that fails is refunded automatically — you are charged for what was delivered.',
          'Credits do not expire while your account is open. What a plan includes, and what each piece of work costs, is on the pricing page and in the product beside the button that spends them.',
        ],
      },
      {
        heading: 'Paying, and stopping',
        body: [
          'Polar is the merchant of record. They take payment, issue the invoice and handle tax; prices are shown in US dollars and UAE dirhams, and you are charged in the currency shown at checkout.',
          'Subscriptions renew until cancelled. Cancelling stops the next renewal and leaves you the rest of the period you have paid for.',
        ],
      },
      {
        heading: 'Refunds',
        body: [
          'Credits that have not been spent can be refunded — write to us and we will arrange it through Polar.',
          'Credits that have been spent cannot. A run that has happened has already been paid for on our side, to the model providers, and that cost cannot be recovered. Work that failed was never charged for in the first place.',
        ],
      },
      {
        heading: 'What you make is yours',
        body: [
          'You own the briefs you write and the brand material generated from them. We claim no ownership of it and we do not use it to train our own models.',
          'We keep a copy for as long as your account exists, because that is what hosting it means, and we may look at it when you ask us for support.',
        ],
      },
      {
        heading: 'Fair use',
        body: [
          'Do not use Brandora to make anything illegal, to impersonate a person or a business, or to produce material that a reasonable person would call hateful, deceptive or sexual.',
          'Do not resell access to the models behind it, script the product to extract capacity, or work around limits on your plan. We can suspend an account that does, and we will say why.',
        ],
      },
      {
        heading: 'Published sites',
        body: [
          'A site you publish through Brandora is your publication. You are responsible for its content, for the messages it receives, and for anything you promise on it.',
          'We can take down a published site that breaks these terms or the law, and we will tell you when we do.',
        ],
      },
      {
        heading: 'Availability',
        body: [
          'There is no uptime guarantee. Model providers fail, queues back up, and generations occasionally do not finish; when that happens the credits come back.',
          'To the extent the law allows, our liability is limited to what you paid us in the twelve months before the claim.',
        ],
      },
      {
        heading: 'Ending it',
        body: [
          'You can close your account whenever you like. We can close an account that breaks these terms, and will refund any unspent credits when we do unless the reason is abuse.',
          'These terms are governed by the laws of the United Arab Emirates, and the courts of the UAE have jurisdiction.',
        ],
      },
    ],
  },
  ar: {
    title: 'الشروط',
    updated: UPDATED_AR,
    governingLanguage: GOVERNING_AR,
    intro:
      'تُشغّل براندورا شركة Enigmitic في الإمارات العربية المتحدة. استخدامك للمنتج يعني قبولك بما يلي. إن كان شيء هنا لا يناسبك، راسلنا على hello@enigmitic.com قبل الاعتماد على المنتج.',
    sections: [
      {
        heading: 'الحساب',
        body: [
          'شخص واحد، حساب واحد، ببريد إلكتروني يصلك فعلاً — إليه تُرسَل رموز التوثيق والدعوات والإيصالات. أنت مسؤول عمّا يجري تحت حسابك وعن حفظ كلمة مرورك.',
          'تحصل الحسابات الجديدة على رصيد مجاني صغير. هو عيّنة لا استحقاق، وقد يتغيّر لمن يسجّل لاحقاً دون إشعار.',
        ],
      },
      {
        heading: 'ما يَعِد به المنتج وما لا يَعِد',
        body: [
          'تولّد براندورا مواد الهوية بنماذج ذكاء اصطناعي. الوصف نفسه لن ينتج النتيجة نفسها مرتين، ولا نضمن اختلاف النتائج بين عميل وآخر.',
          'مسؤوليتك أن تتحقق من أن الاسم أو الشعار أو العبارة متاح للاستخدام حيث تنوي استخدامه. لا نجري بحثاً في العلامات التجارية، ولا شيء مما ينتجه المنتج يُعدّ استشارة قانونية.',
        ],
      },
      {
        heading: 'الرصيد',
        body: [
          'الرصيد هو وحدة العمل. يحجز التوليد تكلفته قبل أن يبدأ، ويُعاد رصيد أي جزء يفشل تلقائياً — تُحاسَب على ما سُلِّم فقط.',
          'لا ينتهي الرصيد ما دام حسابك مفتوحاً. ما تشمله كل باقة وتكلفة كل عمل مذكوران في صفحة الأسعار وداخل المنتج بجانب الزر الذي ينفقه.',
        ],
      },
      {
        heading: 'الدفع والإيقاف',
        body: [
          'Polar هي التاجر المسجَّل: تستلم الدفع وتصدر الفاتورة وتتولّى الضرائب. تُعرَض الأسعار بالدولار الأمريكي والدرهم الإماراتي، وتُحاسَب بالعملة المعروضة عند الدفع.',
          'تتجدّد الاشتراكات حتى تُلغى. الإلغاء يوقف التجديد التالي ويبقي لك ما تبقّى من المدة المدفوعة.',
        ],
      },
      {
        heading: 'الاسترجاع',
        body: [
          'الرصيد غير المنفَق قابل للاسترجاع — راسلنا وسنرتّبه عبر Polar.',
          'الرصيد المنفَق غير قابل للاسترجاع. التوليد الذي جرى دُفِع ثمنه من طرفنا لمزوّدي النماذج ولا يمكن استرداده. أما ما فشل فلم يُحاسَب عليه أصلاً.',
        ],
      },
      {
        heading: 'ما تصنعه ملكك',
        body: [
          'تملك ما تكتبه من أوصاف وما يُولَّد عنها من مواد الهوية. لا ندّعي ملكيتها ولا نستخدمها لتدريب نماذج خاصة بنا.',
          'نحتفظ بنسخة ما دام حسابك قائماً، لأن هذا معنى استضافتها، وقد نطّلع عليها حين تطلب الدعم.',
        ],
      },
      {
        heading: 'الاستخدام العادل',
        body: [
          'لا تستخدم براندورا لصنع شيء غير قانوني، أو لانتحال شخص أو جهة، أو لإنتاج مادة يصفها العاقل بالكراهية أو التضليل أو الإباحية.',
          'لا تُعِد بيع الوصول إلى النماذج، ولا تُبرمج المنتج لاستنزاف طاقته، ولا تلتفّ على حدود باقتك. يمكننا تعليق حساب يفعل ذلك، وسنوضّح السبب.',
        ],
      },
      {
        heading: 'المواقع المنشورة',
        body: [
          'الموقع الذي تنشره عبر براندورا منشورك أنت. أنت مسؤول عن محتواه وعن الرسائل التي تصله وعن أي وعد تقطعه فيه.',
          'يمكننا إيقاف موقع منشور يخالف هذه الشروط أو القانون، وسنخبرك حين نفعل.',
        ],
      },
      {
        heading: 'الإتاحة',
        body: [
          'لا يوجد ضمان لنسبة التشغيل. قد تفشل النماذج وتتأخر الطوابير ولا يكتمل التوليد أحياناً؛ وحين يحدث ذلك يعود الرصيد.',
          'في حدود ما يسمح به القانون، تقتصر مسؤوليتنا على ما دفعته لنا خلال اثني عشر شهراً قبل المطالبة.',
        ],
      },
      {
        heading: 'الإنهاء',
        body: [
          'يمكنك إغلاق حسابك متى شئت. ويمكننا إغلاق حساب يخالف هذه الشروط، مع إعادة الرصيد غير المنفَق ما لم يكن السبب إساءة استخدام.',
          'تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة، وتختصّ محاكم الدولة بالنظر في أي نزاع.',
        ],
      },
    ],
  },
}
