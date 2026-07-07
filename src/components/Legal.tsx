import { useEffect } from "react";

// The legal pages, rendered as a full-screen overlay above the app (App owns the hash
// routing). Two pages: a combined Imprint + Privacy (#privacy, also reached via #imprint)
// and Terms (#terms). Content is from the anyma-legal-pages handover, with the Imprint
// translated to English (statutory § 5 DDG / § 19 UStG references kept) and two factual
// corrections vs the draft — see the notes in §4 and §8 of the privacy policy (Anthropic
// is NOT used for the live standard readings; Resend added as the email sub-processor).

export type LegalPage = "privacy" | "terms";

const LABELS: Record<LegalPage, string> = {
  privacy: "Imprint & Privacy",
  terms: "Terms",
};

const UPDATED = "7 July 2026";
const CONTACT = "hello@anyma.one";

export function Legal({ page, onClose }: { page: LegalPage; onClose: () => void }) {
  // Escape closes; lock the underlying app from scrolling behind the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [onClose]);

  return (
    <div className="legal" role="dialog" aria-modal="true" aria-label={LABELS[page]}>
      <header className="legal__bar">
        <button className="legal__home" onClick={onClose} aria-label="Close and return to anyma">
          anyma
        </button>
        <nav className="legal__tabs" aria-label="Legal pages">
          {(Object.keys(LABELS) as LegalPage[]).map((p) => (
            <a
              key={p}
              href={`#${p}`}
              className={`legal__tab${p === page ? " legal__tab--active" : ""}`}
              aria-current={p === page ? "page" : undefined}
            >
              {LABELS[p]}
            </a>
          ))}
        </nav>
        <button className="legal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <main className="legal__scroll">
        <article className="legal__doc">
          {page === "privacy" ? <ImprintAndPrivacy /> : <Terms />}
        </article>
      </main>
    </div>
  );
}

function ImprintAndPrivacy() {
  return (
    <>
      <h1 className="legal__title">Imprint &amp; Privacy</h1>
      <p className="legal__updated">Last updated: {UPDATED}</p>

      {/* ---------- Imprint (§ 5 DDG) ---------- */}
      <h2 className="legal__h2" id="imprint">
        Imprint
      </h2>
      <p className="legal__lede">Information pursuant to § 5 DDG</p>
      <p className="legal__block">
        Wojtek Plichta
        <br />
        Tiefenbruchstraße 43a
        <br />
        44651 Herne
        <br />
        Germany
      </p>
      <p className="legal__block">
        Contact: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
      <p className="legal__p">
        <strong>VAT:</strong> As a small business within the meaning of § 19 of the German VAT Act
        (UStG), no VAT is shown.
      </p>
      <p className="legal__p">
        <strong>Responsible for content:</strong> Wojtek Plichta (address as above).
      </p>

      <hr className="legal__rule" />

      {/* ---------- Privacy Policy ---------- */}
      <h2 className="legal__h2">Privacy Policy</h2>
      <p className="legal__p">
        The controller for data processing on anyma is Wojtek Plichta, Tiefenbruchstraße 43a, 44651
        Herne, Germany. Contact: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. This policy explains
        what we process, why, and your rights. We keep data collection to a minimum and the readings
        themselves do not require an account.
      </p>

      <h3 className="legal__h3">1. Your answers and your result</h3>
      <p className="legal__p">
        When you take a reading, your answers are used to calculate your result and generate its
        written content.
      </p>
      <ul className="legal__list">
        <li>
          <strong>On your device:</strong> your quiz progress and your last result are saved in your
          browser's local storage so you can resume and revisit them. This stays on your device (see
          "Cookies and local storage").
        </li>
        <li>
          <strong>On our server:</strong> we keep an anonymous record of results (a trait pattern and
          the resulting animal, with no name, email, or other identifier) to understand and improve
          the service.
        </li>
        <li>
          <strong>Purpose and legal basis:</strong> providing the reading you requested
          (Art. 6(1)(b)); and, for the anonymous result record, our legitimate interest in improving
          the service (Art. 6(1)(f)). The anonymous record cannot be linked back to you.
        </li>
      </ul>

      <h3 className="legal__h3">2. Generating your reading</h3>
      <p className="legal__p">
        Your standard readings (Speed Run and Soul Search) are assembled from pre-written content
        based on your computed result. No third-party AI service is involved in these tiers, and your
        answers are not sent to any external AI provider to produce them.
      </p>
      <p className="legal__p">
        The Deep Dive (a deeper tier, not yet available) will generate an individual report using the
        Claude API provided by Anthropic, acting as our processor. When you use it, the free-text
        answers you choose to write, together with your computed result, are sent to Anthropic solely
        to produce your report; they are not used to identify you or to train Anthropic's models.
        Please do not enter anything in free-text fields that you would not want processed by our
        provider.
      </p>
      <ul className="legal__list">
        <li>Legal basis: providing the reading you requested (Art. 6(1)(b)).</li>
        <li>
          Anthropic is based in the United States (see "Hosting and international transfers").
        </li>
      </ul>

      <h3 className="legal__h3">3. Deep Dive waitlist (email)</h3>
      <p className="legal__p">
        If you join the Deep Dive waitlist, we store your email address to notify you when that tier
        opens.
      </p>
      <ul className="legal__list">
        <li>
          We use double opt-in: after you sign up we send one email to confirm, and after that we
          only email you about the Deep Dive.
        </li>
        <li>
          Legal basis: your consent (Art. 6(1)(a)). You can withdraw it at any time by unsubscribing
          or asking us to delete your email at <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, without
          affecting earlier processing.
        </li>
        <li>
          Your email is stored with our database provider, Supabase (in the EU), and the confirmation
          and notification emails are sent through our email provider, Resend.
        </li>
        <li>
          anyma does not set a minimum age, but for the waitlist specifically, if you are under 16
          please sign up only with the consent of a parent or guardian.
        </li>
      </ul>

      <h3 className="legal__h3">4. Analytics</h3>
      <p className="legal__p">
        We use Vercel Web Analytics, which is cookieless by design: it sets no cookies, uses no
        cross-site identifier, and does not build a profile of you across other websites. Legal basis:
        our legitimate interest in understanding aggregate usage (Art. 6(1)(f)).
      </p>

      <h3 className="legal__h3">5. Cookies and local storage</h3>
      <p className="legal__p">
        anyma does <strong>not</strong> use tracking or advertising cookies, so there is no cookie
        consent banner.
      </p>
      <ul className="legal__list">
        <li>
          <strong>Local storage (strictly necessary):</strong> we store your quiz progress and last
          result in your browser so the app can save and resume your session. This is functional and
          stays on your device; you can clear it any time through your browser settings.
        </li>
        <li>
          <strong>Cookieless analytics:</strong> as described above, no cookies are involved.
        </li>
      </ul>
      <p className="legal__p">
        If we ever add non-essential cookies or third-party tracking, we will add a consent banner and
        ask first.
      </p>

      <h3 className="legal__h3">6. Hosting and international transfers</h3>
      <p className="legal__p">
        The site is hosted by Vercel. Our database provider, Supabase, stores data in the EU, so no
        transfer outside the EEA is involved there. Two providers are located in or transfer data to
        the United States: Vercel (hosting and server logs, which may include technical data such as
        IP addresses) and Resend (which sends the waitlist confirmation and notification emails). The
        Deep Dive tier will additionally involve Anthropic (United States); this applies only once
        that tier is available.
      </p>
      <p className="legal__p">
        Where data is transferred to the United States, it is safeguarded by appropriate measures
        under Chapter V of the GDPR, in particular the EU Standard Contractual Clauses and, where the
        provider is certified, the EU-US Data Privacy Framework, as set out in each provider's Data
        Processing Agreement, which we have accepted. You can request details at{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h3 className="legal__h3">7. How long we keep data</h3>
      <ul className="legal__list">
        <li>
          <strong>Local storage</strong> stays on your device until you clear it.
        </li>
        <li>
          <strong>The anonymous result record</strong> contains no personal identifier and is kept to
          improve the service.
        </li>
        <li>
          <strong>Waitlist email</strong> is kept until you unsubscribe or ask for deletion, or until
          the Deep Dive has launched and we have contacted you, after which it is removed.
        </li>
        <li>
          <strong>Server logs</strong> are kept for the period set by our host.
        </li>
      </ul>

      <h3 className="legal__h3">8. Profiling</h3>
      <p className="legal__p">
        Your result is produced by calculating your answers against a fixed model and generating text
        automatically. This is profiling within the meaning of Art. 4(4) GDPR, used only to create the
        reading you asked for. It has no legal or similarly significant effect on you (Art. 22) and is
        not used for any decision about you outside this service.
      </p>

      <h3 className="legal__h3">9. Your rights</h3>
      <p className="legal__p">
        You have the right to access, rectification, erasure, restriction, data portability, and
        objection, and where processing rests on consent, to withdraw it at any time. To exercise any
        of these, contact <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
      <p className="legal__p">
        You may also complain to a supervisory authority. For North Rhine-Westphalia this is the
        Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW).
      </p>

      <h3 className="legal__h3">10. Changes</h3>
      <p className="legal__p">
        We may update this policy; the version published here, with the date above, is the current
        one.
      </p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h1 className="legal__title">Terms of Use</h1>
      <p className="legal__updated">Last updated: {UPDATED}</p>

      <h2 className="legal__h2">1. Who we are</h2>
      <p className="legal__p">
        anyma is operated by Wojtek Plichta, Tiefenbruchstraße 43a, 44651 Herne, Germany. Contact:{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2 className="legal__h2">2. What anyma is</h2>
      <p className="legal__p">
        anyma gives you a psychological profile and related mythological content based on the answers
        you provide, across several tiers of depth. It is a tool for self-reflection and curiosity.
      </p>

      <h2 className="legal__h2">3. What anyma is not</h2>
      <p className="legal__p">
        Your result is <strong>not</strong> professional advice. It is not medical, psychological,
        psychiatric, diagnostic, or therapeutic advice, and it is not a substitute for a qualified
        professional. Do not use it to make health, legal, financial, or other significant decisions.
        If you are struggling, please speak to a qualified professional.
      </p>

      <h2 className="legal__h2">4. Who may use it</h2>
      <p className="legal__p">
        anyma is intended for a general audience and covers no sensitive or adult content. It sets no
        minimum age. Please note that joining the waitlist involves giving an email address; if you
        are under 16, do so only with a parent's or guardian's consent.
      </p>

      <h2 className="legal__h2">5. Acceptable use</h2>
      <p className="legal__p">
        Use anyma for your own personal, non-commercial reflection. Do not attempt to disrupt, scrape,
        reverse-engineer, or misuse the service, and do not submit unlawful content in any free-text
        answers.
      </p>

      <h2 className="legal__h2">6. Content and intellectual property</h2>
      <p className="legal__p">
        The questions, profiles, mythological content, images, and design of anyma are owned by Wojtek
        Plichta or their licensors and are protected by law. Your individual result is provided for
        your personal use.
      </p>

      <h2 className="legal__h2">7. Availability</h2>
      <p className="legal__p">
        anyma is provided on an "as is" and "as available" basis. We do not guarantee it will be
        uninterrupted or error-free, and some tiers may be in development or change over time.
      </p>

      <h2 className="legal__h2">8. Liability</h2>
      <p className="legal__p">
        Nothing in these terms limits liability that cannot be limited under applicable law, including
        for intent, gross negligence, injury to life, body, or health, or under the
        Produkthaftungsgesetz. Subject to that, liability for slight negligence is limited to the
        breach of essential contractual obligations and to the foreseeable damage typical for a
        service of this kind.
      </p>

      <h2 className="legal__h2">9. Changes</h2>
      <p className="legal__p">
        We may update these terms; the version published here, with the date above, is the current
        one. Continued use after a change means you accept the updated terms.
      </p>

      <h2 className="legal__h2">10. Governing law</h2>
      <p className="legal__p">
        These terms are governed by the law of the Federal Republic of Germany. Mandatory
        consumer-protection rules of your country of residence remain unaffected.
      </p>

      <h2 className="legal__h2">11. Contact</h2>
      <p className="legal__p">
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
    </>
  );
}
