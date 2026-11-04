import { brand } from '@repo/brand';
import { faqs } from '@repo/content';
import { LogoMark } from '@repo/ui/logo';
import Link from 'next/link';
import { RedirectIfSignedIn } from '@/components/public/redirect-if-signed-in';

const FEATURES = [
  {
    icon: '🔐',
    title: 'End-to-end encrypted',
    text: 'Codes are encrypted on your device. We store ciphertext we cannot read.',
  },
  {
    icon: '🔄',
    title: 'Sync everywhere',
    text: 'Web and Android stay in sync. Lose a phone, keep your codes.',
  },
  {
    icon: '📷',
    title: 'Easy import',
    text: 'Scan Google Authenticator export QR codes, or paste 2FAS / Aegis exports.',
  },
  {
    icon: '🗂️',
    title: 'Folders & search',
    text: 'Find the right code in a second, even with hundreds of accounts.',
  },
  {
    icon: '🛟',
    title: 'Encrypted backups',
    text: 'Backups locked with a separate password, restorable on any device.',
  },
  {
    icon: '🚪',
    title: 'No lock-in',
    text: 'Export Google-compatible QR codes or download all your data any time.',
  },
];

const CHIPS = [
  'meadow-chip-emerald',
  'meadow-chip-coral',
  'meadow-chip-lilac',
  'meadow-chip-lime',
  'meadow-chip-mint',
  'meadow-chip-rose',
];

const STEPS = [
  {
    n: 1,
    title: 'You pick a master password',
    text: 'It never leaves your device. Not even we can see or reset it.',
  },
  {
    n: 2,
    title: 'Your device makes the key',
    text: 'Argon2id turns the password into a key; a random vault key encrypts every account with XChaCha20-Poly1305.',
  },
  {
    n: 3,
    title: 'Only ciphertext is synced',
    text: 'Our servers store and sync encrypted blobs. Other devices decrypt them after you unlock.',
  },
];

export default function LandingPage() {
  return (
    <main id="main">
      <RedirectIfSignedIn />
      {/* Hero */}
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-[1.2fr_1fr] md:pt-24">
        <div>
          <p className="meadow-chip-coral mb-4 inline-block rounded-full px-3 py-1 text-xs font-semibold">
            Two-factor authentication, done gently
          </p>
          <h1 className="text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Your 2FA codes, <span className="meadow-text-gradient">in bloom</span> on every device.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{brand.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="rounded-full bg-accent px-5 py-3 font-semibold text-accent-fg hover:opacity-90"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="#how"
              className="rounded-full px-5 py-3 font-semibold ring-1 ring-line hover:bg-surface-muted"
            >
              How it works
            </Link>
          </div>
        </div>
        <div aria-hidden className="relative mx-auto">
          <div className="meadow-glow absolute -inset-16 -z-10 rounded-full blur-2xl" />
          <div className="rounded-xl bg-surface p-6 shadow-xl ring-1 ring-line">
            <div className="mb-4 flex items-center gap-3">
              <LogoMark size={40} />
              <div>
                <p className="text-sm text-muted">GitHub · you@example.com</p>
                <p className="font-mono text-3xl tracking-widest">492 107</p>
              </div>
            </div>
            <div className="space-y-2">
              {['Google · work', 'AWS · root', 'Figma · design'].map((r, i) => (
                <div
                  key={r}
                  className="flex justify-between rounded-md bg-surface-muted px-3 py-2 text-sm"
                >
                  <span className="text-muted">{r}</span>
                  <span className="font-mono">{['881 230', '019 554', '370 812'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features" className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 id="features" className="mb-8 text-2xl font-bold tracking-tight">
          Everything you need, nothing you don&apos;t
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="rounded-xl bg-surface p-5 ring-1 ring-line">
              <span
                aria-hidden
                className={`${CHIPS[i % CHIPS.length]} flex size-11 items-center justify-center rounded-2xl text-xl`}
              >
                {f.icon}
              </span>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How E2E works */}
      <section
        id="how"
        aria-labelledby="how-title"
        className="mx-auto mt-24 max-w-5xl scroll-mt-20 px-4 sm:px-6"
      >
        <h2 id="how-title" className="text-2xl font-bold tracking-tight">
          How end-to-end encryption works here
        </h2>
        <p className="mt-2 max-w-2xl text-muted">
          Think of your vault as a locked box. Your devices hold the key; our servers only ever
          carry the closed box.
        </p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl bg-surface p-5 ring-1 ring-line">
              <span
                className={`${['meadow-chip-emerald', 'meadow-chip-lilac', 'meadow-chip-coral'][s.n - 1]} flex size-8 items-center justify-center rounded-full font-bold`}
              >
                {s.n}
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="meadow-chip-lime mt-6 rounded-xl p-5 text-sm">
          <strong>The honest part:</strong> because we can&apos;t read your vault, we can&apos;t
          recover it either. Keep your master password safe and print the recovery kit.{' '}
          <Link href="/security" className="font-semibold underline">
            Read the full security model →
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="mx-auto mt-24 max-w-3xl px-4 sm:px-6">
        <h2 id="faq" className="mb-6 text-2xl font-bold tracking-tight">
          Questions
        </h2>
        <div className="divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
          {faqs
            .filter((f) => f.featured)
            .map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="mr-2 inline-block text-accent transition group-open:rotate-45">
                    +
                  </span>
                  {f.q}
                </summary>
                <p className="mt-2 text-muted">{f.a}</p>
              </details>
            ))}
        </div>
        <p className="mt-4 text-sm">
          <Link href="/help" className="text-accent underline">
            More answers in Help →
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto mt-24 max-w-5xl px-4 sm:px-6">
        <div className="meadow-band flex flex-col items-center gap-4 rounded-[36px] px-6 py-14 text-center ring-1 ring-line">
          <h2 className="text-3xl font-bold">Let your codes bloom.</h2>
          <p className="max-w-lg text-muted">
            Free while in beta. Set up in a minute; import from Google Authenticator in two.
          </p>
          <Link
            href="/sign-in"
            className="rounded-full bg-meadow-lime px-6 py-3 font-semibold text-meadow-ink ring-1 ring-meadow-ink/10 shadow-[5px_6px_0_var(--color-meadow-coral)] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            Create your vault
          </Link>
        </div>
      </section>
    </main>
  );
}
