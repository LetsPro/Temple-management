import { Link } from 'react-router-dom'
import { FileText, ShieldCheck } from 'lucide-react'

type LegalPageType = 'terms' | 'privacy' | 'disclaimer' | 'payment-terms'
type LegalSection = { title: string; paragraphs?: string[]; items?: string[] }
type LegalDocument = { title: string; eyebrow: string; summary: string; sections: LegalSection[] }

const LAST_UPDATED = '14 July 2026'

const documents: Record<LegalPageType, LegalDocument> = {
  terms: {
    title: 'Terms and Conditions',
    eyebrow: 'Website and service terms',
    summary: 'These Terms govern access to the Shri Tripura Sundari Lalithambe Trust website, devotee accounts, seva bookings, donations, memberships, event registrations and related digital services.',
    sections: [
      { title: '1. Acceptance of these Terms', paragraphs: ['By accessing this website, creating an account, submitting a form or making a payment, you confirm that you have read and accepted these Terms. If you do not agree, please discontinue use of the website and contact the Trust for offline assistance.'] },
      { title: '2. About our services', paragraphs: ['The website provides information about the Trust, temple activities, poojas, sevas, events, donations, memberships and community initiatives. Availability, timings, priests, venues and programme details may change because of religious requirements, public holidays, weather, maintenance, capacity or circumstances beyond the Trust’s control.'] },
      { title: '3. Accounts and guest access', items: ['You must provide accurate and current information when registering or checking out as a guest.', 'You are responsible for protecting your password and for activity performed through your account.', 'Notify the Trust promptly if you suspect unauthorised access.', 'The Trust may suspend accounts used for fraud, abuse, unlawful activity or disruption of temple services.'] },
      { title: '4. Seva bookings and event registrations', paragraphs: ['A booking is confirmed only after the website displays or sends a confirmation and any required payment is successfully verified. A requested date or time is not guaranteed until confirmation. Devotees must follow temple dress, conduct, safety and entry requirements.'], items: ['Arrive within the communicated reporting time.', 'Provide correct participant details and special requests.', 'Do not resell, transfer or misuse booking confirmations without written permission.', 'The Trust may reschedule a service where ritual, operational or safety needs require it.'] },
      { title: '5. Donations and memberships', paragraphs: ['Donations are voluntary offerings applied to the selected purpose or, where operationally necessary, to closely related charitable or religious activities of the Trust. Membership benefits are subject to the selected plan, eligibility, availability and applicable Trust rules. Membership does not create ownership, employment, agency or voting rights unless separately granted in writing.'] },
      { title: '6. Acceptable use', items: ['Do not submit false, misleading, defamatory, obscene or unlawful material.', 'Do not attempt to access another person’s account, payment record or personal information.', 'Do not interfere with website security, availability or performance.', 'Do not copy, scrape, reverse engineer or commercially exploit the website without permission.'] },
      { title: '7. Intellectual property', paragraphs: ['The Trust name, logo, photographs, text, graphics, recordings and website design are owned by or licensed to the Trust. They may be viewed for personal and devotional use but may not be reproduced, altered, sold or used commercially without prior written consent.'] },
      { title: '8. Website availability and external services', paragraphs: ['We work to keep the website accurate and available, but uninterrupted or error-free access is not guaranteed. The website may rely on hosting, authentication, payment and communication providers. Their separate terms and service availability may also apply.'] },
      { title: '9. Limitation of responsibility', paragraphs: ['To the extent permitted by applicable law, the Trust is not responsible for indirect, incidental or consequential loss arising from website downtime, third-party failures, unauthorised access caused by a user, reliance on general website information or events beyond reasonable control. Nothing in these Terms excludes a right or remedy that cannot lawfully be excluded.'] },
      { title: '10. Changes, governing law and disputes', paragraphs: ['The Trust may revise these Terms when services, technology or legal requirements change. Updated Terms apply from the date displayed on this page. These Terms are governed by the laws of India. Parties should first attempt good-faith resolution through the Trust; subject to applicable law, courts in Bengaluru, Karnataka will have jurisdiction.'] },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'How we handle personal information',
    summary: 'This Privacy Policy explains how Shri Tripura Sundari Lalithambe Trust collects, uses, shares, retains and protects personal data when you use our website and services.',
    sections: [
      { title: '1. Information we collect', items: ['Identity and contact details such as name, email, mobile number, postal address and city.', 'Devotional or service details voluntarily supplied for a seva, including participant name, gotram, rashi, nakshatra, date of birth or special prayer notes.', 'Account, membership, booking, donation, event and receipt information.', 'Technical information such as device type, browser, IP address, pages viewed, timestamps and basic security logs.', 'Messages, enquiries, feedback and records of communication with the Trust.'] },
      { title: '2. Why we use information', items: ['To create and manage devotee accounts and profiles.', 'To process bookings, donations, memberships, event registrations and payment confirmations.', 'To provide receipts, reminders, service updates and support.', 'To administer temple activities, maintain records and prevent misuse or fraud.', 'To improve website accessibility, reliability, content and user experience.', 'To meet legal, accounting, audit, safety and regulatory obligations.'] },
      { title: '3. Consent and lawful processing', paragraphs: ['We process information for the purpose communicated when it is collected, to provide a service you request, to meet legal obligations, with your consent where required, and for legitimate administrative and security needs. Optional devotional details should be provided only when you want them used for the requested ritual or service.'] },
      { title: '4. Payments', paragraphs: ['Online payments are processed through an authorised third-party payment service. The Trust does not intentionally store complete card numbers, CVV, UPI PINs, banking passwords or OTPs. Payment providers and banks process payment credentials under their own privacy and security terms. Never share an OTP, PIN or password with the Trust or anyone claiming to represent it.'] },
      { title: '5. When information may be shared', items: ['With priests, authorised staff or volunteers who need the information to deliver the requested service.', 'With technology, hosting, authentication, payment, messaging and support providers acting for the service.', 'With professional advisers, auditors or authorities where required by law, safety or legitimate investigation.', 'During an organisational restructuring, subject to appropriate confidentiality and lawful safeguards.'], paragraphs: ['We do not sell personal information for advertising.'] },
      { title: '6. Cookies and similar technology', paragraphs: ['The website may use essential cookies or local storage to maintain sign-in sessions, security, preferences and reliable navigation. Limited analytics may be used to understand aggregate website usage. Browser settings can restrict cookies, although essential functions may then stop working correctly.'] },
      { title: '7. Retention', paragraphs: ['We retain information only for as long as reasonably required for the service, receipts, accounting, dispute handling, safety, legal compliance and legitimate Trust records. Retention periods vary by record type. Information that is no longer required is deleted, anonymised or securely archived where practicable.'] },
      { title: '8. Security', paragraphs: ['We use reasonable administrative, technical and organisational safeguards, including access controls and secure service providers. No online system is completely risk-free. Users should use strong passwords, keep devices updated and report suspected misuse promptly.'] },
      { title: '9. Your choices and rights', items: ['Request access to or correction of personal information associated with you.', 'Ask for deletion where retention is not required by law or legitimate Trust needs.', 'Withdraw optional consent or unsubscribe from non-essential communications.', 'Raise a question or grievance about how personal information is handled.'], paragraphs: ['We may need to verify your identity before acting on a request. Certain records may be retained where legally or operationally required.'] },
      { title: '10. Children and family information', paragraphs: ['A parent or lawful guardian should submit information and make bookings for a child. Do not provide personal details about another family member unless you have authority or consent to do so.'] },
      { title: '11. Updates and contact', paragraphs: ['We may update this Policy to reflect changes in services, law or security practices. Material changes will be displayed on this page. Privacy requests may be sent to info@stsltrust.org with the subject “Privacy Request”.'] },
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    eyebrow: 'Important information',
    summary: 'This website supports access to devotional and community services. Its content is general information and should be understood in the spiritual and cultural context in which it is provided.',
    sections: [
      { title: '1. Religious and spiritual information', paragraphs: ['Descriptions of deities, rituals, festivals, astrology, yoga and spiritual practices reflect devotional traditions and the Trust’s activities. Beliefs and outcomes are personal. The Trust does not guarantee spiritual, material, financial or personal results from any prayer, seva, ritual, consultation or membership.'] },
      { title: '2. Health, yoga and naturopathy content', paragraphs: ['Website content about yoga, breathing, food, Ayurveda, naturopathy, herbs or wellbeing is educational and traditional in nature. It is not medical diagnosis, treatment or a substitute for advice from a qualified healthcare professional. Consult an appropriate medical practitioner before changing medication, diet, exercise or treatment, especially if you are pregnant, elderly or have a medical condition.'] },
      { title: '3. Astrology, Vasthu and consultations', paragraphs: ['Astrology, Astro-Yoga, gemology, Tantra and Vasthu consultations are based on traditional systems and interpretation. They should not replace professional legal, medical, psychological, investment, tax or financial advice. Decisions remain the responsibility of the person making them.'] },
      { title: '4. Accuracy and changes', paragraphs: ['We aim to provide accurate information, but temple timings, event programmes, prices, availability, benefits, images and descriptions may change without prior notice. Contact the Trust before travelling or relying on time-sensitive information.'] },
      { title: '5. Photographs and media', paragraphs: ['Images may be illustrative or may depict past events. Appearance on the website does not guarantee that a particular priest, teacher, facility, decoration or arrangement will be available for a future service. Event photography may occur in public temple areas; concerns may be raised with Trust staff.'] },
      { title: '6. Third-party links and services', paragraphs: ['Links or integrations supplied by payment, map, social-media, hosting or other providers are offered for convenience. The Trust does not control their content, availability, security or privacy practices and does not endorse every statement appearing on an external site.'] },
      { title: '7. Technical and force-majeure events', paragraphs: ['The Trust is not responsible for delay or failure caused by network interruptions, payment-system outages, natural events, government restrictions, public-health measures, security incidents, strikes, temple emergencies or other circumstances beyond reasonable control.'] },
      { title: '8. Limitation and user responsibility', paragraphs: ['Use of this website and participation in activities are subject to personal judgement, temple rules and applicable law. To the extent permitted by law, the Trust is not liable for indirect or consequential loss resulting from reliance on general content or use of third-party services. Mandatory legal rights remain unaffected.'] },
    ],
  },
  'payment-terms': {
    title: 'Payment Terms',
    eyebrow: 'Donations, bookings and memberships',
    summary: 'These Payment Terms apply to online donations, seva bookings, event fees, memberships and other amounts paid through this website.',
    sections: [
      { title: '1. Currency and accepted methods', paragraphs: ['Unless stated otherwise, amounts are displayed and charged in Indian Rupees (INR). Available methods may include UPI, cards, net banking, wallets or other methods presented by the payment provider at checkout. Availability depends on the provider, issuing bank and device.'] },
      { title: '2. Payment processing', paragraphs: ['Payments are processed by a third-party payment gateway and participating banks or payment networks. By continuing, you authorise the applicable provider to process the amount and related transaction information. The Trust does not ask for or store your UPI PIN, banking password, OTP, CVV or complete card credentials.'] },
      { title: '3. Confirmation', paragraphs: ['A payment is complete only after successful verification. A bank debit, pending message or payment screenshot alone does not confirm a donation, booking or membership. Keep the transaction reference and wait for the website or Trust confirmation. Contact support if your account is debited but no confirmation is received.'] },
      { title: '4. Failed, interrupted and duplicate payments', items: ['Do not immediately repeat a payment when its status is pending; first check the bank statement and confirmation message.', 'Failed or reversed payments may be restored automatically by the bank or payment provider.', 'If duplicate successful payments are identified, contact the Trust with both transaction references.', 'Processing and reversal times are controlled partly by banks and payment providers and may vary.'] },
      { title: '5. Donations', paragraphs: ['Donations are voluntary and are generally treated as final once successfully processed and acknowledged, except in cases such as an evident duplicate transaction, proven technical error or other circumstance accepted by the Trust or required by law. Donation-purpose requests will be respected where reasonably possible, but funds may be applied to a closely related charitable or religious need when necessary.'] },
      { title: '6. Seva bookings and event fees', paragraphs: ['Cancellation or rescheduling depends on the service, notice given, ritual preparation, capacity and expenses already incurred. Some offerings may be non-refundable after materials have been purchased, a priest has been assigned or the service has begun. Where the Trust cancels and cannot provide a reasonable alternative, it may offer rescheduling, credit or refund as appropriate.'] },
      { title: '7. Membership payments', paragraphs: ['Membership starts only after payment verification and activation. Fees cover the stated membership period and benefits. Unless expressly offered, plans do not renew automatically. Used, partly used or expired membership periods are normally not refundable, except where required by law or approved by the Trust for exceptional circumstances.'] },
      { title: '8. Refund requests', paragraphs: ['Submit a request to info@stsltrust.org with the payer name, mobile number, transaction reference, amount, date and reason. The Trust may request supporting information and will communicate its decision after review. An approved refund will ordinarily be returned to the original payment method. Bank and gateway processing time is outside the Trust’s direct control.'] },
      { title: '9. Charges, taxes and receipts', paragraphs: ['The amount shown at final checkout is the amount requested by the Trust. Your bank or payment provider may impose separate charges under its own terms. Receipts are generated from the details supplied by the payer. Any tax treatment or deduction eligibility depends on applicable law and the nature of the payment; users should obtain independent tax advice where needed.'] },
      { title: '10. Chargebacks, fraud and misuse', paragraphs: ['Contact the Trust before raising a chargeback so the transaction can be investigated. The Trust may provide booking, attendance, consent, communication and payment records to the bank or provider when responding to a dispute. Fraudulent, abusive or unauthorised payment activity may be reported and related services may be suspended.'] },
      { title: '11. Payment safety', items: ['Use only the checkout opened from the official Trust website.', 'Never disclose an OTP, UPI PIN, card PIN or banking password.', 'Verify the amount and purpose before approving payment.', 'Report suspicious links, calls or payment requests to the Trust promptly.'] },
      { title: '12. Contact and changes', paragraphs: ['Payment questions may be sent to info@stsltrust.org or raised through the Contact page. These Payment Terms may be updated when payment methods, Trust policies or legal requirements change. The version displayed when a transaction is initiated will apply to that transaction, subject to applicable law.'] },
    ],
  },
}

export default function LegalPage({ type }: { type: LegalPageType }) {
  const document = documents[type]

  return (
    <div className="legal-page">
      <header className="legal-hero">
        <div className="page-container">
          <span>{document.eyebrow}</span>
          <h1>{document.title}</h1>
          <p>{document.summary}</p>
          <small>Last updated: {LAST_UPDATED}</small>
        </div>
      </header>
      <div className="page-container legal-layout">
        <aside className="legal-aside">
          <FileText />
          <strong>{document.title}</strong>
          <p>Please read this page carefully. Contact the Trust if you need clarification.</p>
          <nav aria-label="Legal pages">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/disclaimer">Disclaimer</Link>
            <Link to="/payment-terms">Payment Terms</Link>
          </nav>
        </aside>
        <article className="legal-document">
          <div className="legal-notice"><ShieldCheck /><p>These policies are intended to explain our website practices clearly and should be read together.</p></div>
          {document.sections.map(section => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              {section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
          <section className="legal-contact">
            <h2>Contact the Trust</h2>
            <p>Shri Tripura Sundari Lalithambe Trust<br />Padmanabhanagar, Bengaluru – 560 070, Karnataka, India<br /><a href="mailto:info@stsltrust.org">info@stsltrust.org</a> · <a href="tel:+918012345678">+91 80 1234 5678</a></p>
          </section>
        </article>
      </div>
    </div>
  )
}
