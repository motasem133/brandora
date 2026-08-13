import { websiteSchema } from '../src/server/ai/schemas'

/**
 * The website contract, checked without spending a model call.
 *
 * Every rule here was written because a real generation broke it: a home page
 * that opened on a button, a café's menu page returned as four consecutive
 * services blocks. They are corrected in code rather than refused, which means
 * nothing fails loudly when the correction stops working — hence this.
 *
 * Run with `pnpm test:website`.
 */
const services = (n: number) => ({
  type: 'services' as const,
  heading: `Heading ${n}`,
  services: [
    { title: `Item ${n}a`, body: 'What it is and who it is for, at length.' },
    { title: `Item ${n}b`, body: 'What it is and who it is for, at length.' },
  ],
})
const hero = {
  type: 'hero' as const,
  title: 'A real headline',
  subtitle: 'A sentence long enough to clear the minimum comfortably, and then some.',
  cta: 'Get started',
}
const cta = {
  type: 'cta' as const,
  heading: 'Ready to start?',
  body: 'One clear next step, said in a sentence.',
  cta: 'Contact us',
}
const contact = {
  type: 'contact' as const,
  heading: 'Get in touch',
  body: 'We reply within one working day, usually sooner.',
  email: 'hello@example.com',
}

const parsed = websiteSchema.parse({
  pages: [
    { key: 'home', blocks: [cta, services(1), hero] },
    { key: 'menu', blocks: [services(1), services(2), services(3), services(4)] },
    { key: 'contact', blocks: [contact] },
  ],
})

const home = parsed.home!.map((b) => b.type)
const menu = parsed.menu!
console.log('home:', home.join(' → '))
console.log('menu:', menu.map((b) => b.type).join(' → '))
console.log('menu items:', (menu[0] as { services: unknown[] }).services.length)

if (home[0] !== 'hero') throw new Error('home must open on its hero')
if (home[home.length - 1] !== 'cta') throw new Error('a leading cta moves to the end')
if (menu.length !== 1) throw new Error('adjacent list sections merge into one')
if ((menu[0] as { services: unknown[] }).services.length !== 4) throw new Error('merged up to the ceiling')
console.log('\nthe website contract holds')
