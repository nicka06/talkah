import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-600/10 py-16">
      <div className="bg-white/90 border-2 border-black rounded-2xl shadow-2xl max-w-2xl w-full p-10">
        <h1 className="font-graffiti text-4xl text-black mb-6 text-center">Privacy Policy</h1>
        <p className="text-black/80 mb-6 text-center">Effective Date: June 10, 2024</p>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">1. Introduction</h2>
          <p className="text-black/80">TALKAH ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">2. Information We Collect</h2>
          <ul className="list-disc list-inside text-black/80">
            <li>Personal Information (e.g., name, email, phone number)</li>
            <li>Usage Data (e.g., device information, log data, cookies)</li>
            <li>Communications (e.g., messages, call data, email content)</li>
          </ul>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-black/80">
            <li>To provide and maintain our services</li>
            <li>To improve, personalize, and expand our services</li>
            <li>To communicate with you</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">4. Sharing Your Information</h2>
          <p className="text-black/80">We do not sell your personal information. We may share your information with trusted third parties who assist us in operating our services, as required by law, or to protect our rights.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">5. Data Security</h2>
          <p className="text-black/80">We implement reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">6. Your Rights</h2>
          <p className="text-black/80">You have the right to access, update, or delete your personal information. Contact us at support@talkah.com for any requests.</p>
        </section>
        <section className="mb-6">
          <h2 className="font-bold text-xl mb-2 text-black">7. Changes to This Policy</h2>
          <p className="text-black/80">We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
        </section>
        <section>
          <h2 className="font-bold text-xl mb-2 text-black">8. Contact Us</h2>
          <p className="text-black/80">If you have any questions about this Privacy Policy, please contact us at support@talkah.com.</p>
        </section>
      </div>
    </div>
  );
} 