import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-600/10 py-16">
      <div className="bg-white/90 border-2 border-black rounded-2xl shadow-2xl max-w-2xl w-full p-10">
        <h1 className="font-graffiti text-4xl text-black mb-6 text-center">Terms of Service</h1>
        <p className="text-black/80 mb-6 text-center">Effective Date: June 10, 2025</p>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">1. Acceptance of Terms</h2>
          <p className="text-black/80">By accessing or using TALKAH, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our services.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">2. Use of Services</h2>
          <ul className="list-disc list-inside text-black/80">
            <li>You must be at least 13 years old to use TALKAH.</li>
            <li>You agree not to misuse our services or help anyone else do so.</li>
            <li>All content and communications must comply with applicable laws.</li>
          </ul>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">3. Communication Permissions</h2>
          <div className="text-black/80">
            <p className="mb-2"><strong>You may not communicate with anyone through the TALKAH platform unless they have given you explicit permission to do so.</strong></p>
            <ul className="list-disc list-inside">
              <li>Before initiating any phone call, email, or text message through TALKAH, you must have clear, documented consent from the recipient.</li>
              <li>You are solely responsible for ensuring you have proper authorization to contact any individual.</li>
              <li>Unsolicited communications, spam, harassment, or any form of unwanted contact is strictly prohibited.</li>
              <li>TALKAH reserves the right to suspend or terminate accounts that violate this policy.</li>
              <li>You agree to indemnify TALKAH against any claims arising from unauthorized communications made through our platform.</li>
            </ul>
          </div>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">4. User Accounts</h2>
          <ul className="list-disc list-inside text-black/80">
            <li>You are responsible for maintaining the confidentiality of your account.</li>
            <li>You agree to provide accurate and complete information.</li>
          </ul>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">5. Intellectual Property</h2>
          <p className="text-black/80">All content, trademarks, and data on TALKAH are the property of TALKAH or its licensors. You may not use our content without permission.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">6. Termination</h2>
          <p className="text-black/80">We may suspend or terminate your access to TALKAH at any time for any reason, including violation of these Terms, particularly unauthorized communications.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">7. Disclaimers</h2>
          <p className="text-black/80">TALKAH is provided "as is" without warranties of any kind. We do not guarantee the accuracy or reliability of our services.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">8. Limitation of Liability</h2>
          <p className="text-black/80">TALKAH and its affiliates are not liable for any damages arising from your use of our services.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">9. Changes to Terms</h2>
          <p className="text-black/80">We may update these Terms from time to time. Continued use of TALKAH means you accept the revised Terms.</p>
        </section>
        <section>
          <h2 className="font-bold text-xl mb-2 text-black">10. Contact Us</h2>
          <p className="text-black/80">If you have any questions about these Terms, please contact us at support@talkah.com.</p>
        </section>
      </div>
    </div>
  );
} 