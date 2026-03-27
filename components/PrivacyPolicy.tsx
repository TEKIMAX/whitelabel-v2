
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

interface PrivacyPolicyProps {
    onLogin: () => void;
    onNavigateHome: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onLogin, onNavigateHome }) => {
    return (
        <div className="min-h-screen bg-[#F9F8F4] font-sans text-stone-900 selection:bg-nobel-gold selection:text-white">
            <Helmet>
                <title>Privacy Policy | Adaptive Startup</title>
                <meta name="description" content="Privacy Policy for Adaptive Startup. Learn how we collect, use, and protect your data under Texas and federal privacy laws." />
            </Helmet>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-stone-100">
                <div className="flex items-center gap-4">
                    <button onClick={onNavigateHome} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="cursor-pointer" onClick={onNavigateHome}>
                        <Logo className="flex items-center gap-3" imageClassName="h-10 w-auto rounded-lg" textClassName="font-serif font-bold text-2xl tracking-wide text-stone-900" />
                    </div>
                </div>
                <button onClick={onLogin} className="px-4 py-2 bg-stone-900 text-white rounded-full text-sm font-bold hover:bg-nobel-gold transition-colors">
                    Sign In
                </button>
            </nav>

            <main className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
                <h1 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">Privacy Policy</h1>
                <p className="text-stone-500 mb-12">Last updated: January 23, 2026</p>

                <div className="prose prose-stone prose-lg max-w-none">
                    <p>
                        Adaptive LLC ("us", "we", or "our") operates the Adaptive Startup website and platform. This Privacy Policy informs you of our policies regarding the collection, use, and disclosure of personal data when you use our products (collectively, the "Service"), including:
                    </p>
                    <ul>
                        <li><strong>Adaptive Startup:</strong> The Entrepreneurial Operating System and associated tools.</li>
                        <li><strong>Tekimax Adaptive Learning:</strong> The cognitive exoskeleton and neurodivergent learning platform.</li>
                        <li><strong>The Self-Adaptive Engine:</strong> The underlying AI state machine and intelligence core powering our services.</li>
                    </ul>
                    <p>
                        This policy complies with the <strong>Texas Data Privacy and Security Act (TDPSA)</strong> (Texas Business & Commerce Code Chapter 541), the <strong>FTC Act Section 5</strong>, and applicable federal privacy regulations.
                    </p>

                    {/* Section 1 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">1</span>
                        <span>Categories of Personal Data We Collect</span>
                    </h3>
                    <p>We collect the following categories of personal data:</p>

                    <div className="border border-stone-200 rounded-xl overflow-hidden my-6">
                        <table className="min-w-full text-sm m-0">
                            <thead className="bg-stone-50">
                                <tr className="border-b border-stone-200">
                                    <th className="text-left py-3 px-4 font-bold text-stone-900">Category</th>
                                    <th className="text-left py-3 px-4 font-bold text-stone-900">Examples</th>
                                    <th className="text-left py-3 px-4 font-bold text-stone-900">Purpose</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                <tr>
                                    <td className="py-3 px-4 align-top"><strong>Identifiers</strong></td>
                                    <td className="py-3 px-4 align-top">Name, email address, account ID</td>
                                    <td className="py-3 px-4 align-top">Account creation, communication</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top"><strong>Commercial Information</strong></td>
                                    <td className="py-3 px-4 align-top">Subscription tier, payment history</td>
                                    <td className="py-3 px-4 align-top">Billing, service delivery</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top"><strong>Internet Activity</strong></td>
                                    <td className="py-3 px-4 align-top">IP address, browser type, pages visited</td>
                                    <td className="py-3 px-4 align-top">Analytics, security, debugging</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top"><strong>Professional Information</strong></td>
                                    <td className="py-3 px-4 align-top">Company name, role, industry</td>
                                    <td className="py-3 px-4 align-top">Personalized onboarding</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top"><strong>User-Generated Content</strong></td>
                                    <td className="py-3 px-4 align-top">Business plans, canvas data, documents</td>
                                    <td className="py-3 px-4 align-top">Core service functionality</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top"><strong>Inferences</strong></td>
                                    <td className="py-3 px-4 align-top">AI-generated insights, recommendations</td>
                                    <td className="py-3 px-4 align-top">Personalized AI assistance</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 2 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">2</span>
                        <span>Purposes for Processing</span>
                    </h3>
                    <p>We process your personal data for the following purposes:</p>
                    <ul>
                        <li><strong>Service Delivery:</strong> To provide, maintain, and improve the Adaptive Startup platform</li>
                        <li><strong>AI Processing:</strong> To generate personalized business insights, content, and recommendations</li>
                        <li><strong>Billing:</strong> To process payments and manage subscriptions via Stripe</li>
                        <li><strong>Communication:</strong> To send service updates, security alerts, and support responses</li>
                        <li><strong>Security:</strong> To detect fraud, protect against attacks, and maintain audit trails</li>
                        <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                    </ul>

                    {/* Section 3 - TDPSA Rights */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">3</span>
                        <span>Your Texas Privacy Rights (TDPSA)</span>
                    </h3>
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 my-6">
                        <h4 className="text-blue-900 font-bold mt-0">Texas Data Privacy and Security Act Rights</h4>
                        <p className="text-sm text-blue-800 mb-4">
                            If you are a Texas resident, you have the following rights under the Texas Data Privacy and Security Act (effective July 1, 2024):
                        </p>
                        <ul className="text-sm text-blue-800 space-y-2">
                            <li><strong>Right to Confirm:</strong> You may confirm whether we are processing your personal data.</li>
                            <li><strong>Right to Access:</strong> You may access the personal data we have collected about you.</li>
                            <li><strong>Right to Correct:</strong> You may correct inaccuracies in your personal data.</li>
                            <li><strong>Right to Delete:</strong> You may request deletion of your personal data.</li>
                            <li><strong>Right to Data Portability:</strong> You may obtain a copy of your data in a portable format.</li>
                            <li><strong>Right to Opt-Out:</strong> You may opt out of:
                                <ul className="ml-4 mt-1">
                                    <li>• Sale of personal data (we do <strong>NOT</strong> sell your data)</li>
                                    <li>• Targeted advertising based on personal data</li>
                                    <li>• Profiling that produces legal or significant effects</li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                    <p>
                        <strong>How to Exercise Your Rights:</strong> Submit a request to <a href="mailto:info@adaptivestartup.io" className="text-nobel-gold hover:underline">info@adaptivestartup.io</a> with subject line "TDPSA Request". We will respond within 45 days. You may also use the data export feature in your account settings.
                    </p>
                    <p>
                        <strong>Appeal Process:</strong> If we deny your request, you may appeal by emailing us within 60 days. We will respond to your appeal within 60 days. If your appeal is denied, you may file a complaint with the Texas Attorney General at <a href="https://www.texasattorneygeneral.gov/consumer-protection" className="text-nobel-gold hover:underline" target="_blank" rel="noopener noreferrer">texasattorneygeneral.gov</a>.
                    </p>

                    {/* Section 4 - Sensitive Data */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">4</span>
                        <span>Sensitive Personal Data</span>
                    </h3>
                    <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 my-6">
                        <h4 className="text-amber-900 font-bold mt-0">We Do NOT Collect Sensitive Data</h4>
                        <p className="text-sm text-amber-800 mb-0">
                            We do not knowingly collect or process sensitive personal data as defined by TDPSA, including: racial/ethnic origin, religious beliefs, health information, sexual orientation, citizenship/immigration status, genetic data, biometric data, precise geolocation, or data from children under 13.
                        </p>
                    </div>
                    <p>
                        If we ever need to process sensitive data, we will obtain your explicit consent beforehand as required by Texas law.
                    </p>

                    {/* Section 5 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">5</span>
                        <span>Data Sharing with Third Parties</span>
                    </h3>
                    <p>We share personal data with the following categories of third parties:</p>
                    <div className="border border-stone-200 rounded-xl overflow-hidden my-6">
                        <table className="min-w-full text-sm m-0">
                            <thead className="bg-stone-50">
                                <tr className="border-b border-stone-200">
                                    <th className="text-left py-3 px-4 font-bold text-stone-900">Category</th>
                                    <th className="text-left py-3 px-4 font-bold text-stone-900">Provider</th>
                                    <th className="text-left py-3 px-4 font-bold text-stone-900">Purpose</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                <tr>
                                    <td className="py-3 px-4 align-top">Cloud Infrastructure</td>
                                    <td className="py-3 px-4 align-top">Convex, Cloudflare</td>
                                    <td className="py-3 px-4 align-top">Data hosting, CDN, security</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top">Authentication</td>
                                    <td className="py-3 px-4 align-top">WorkOS</td>
                                    <td className="py-3 px-4 align-top">User login, SSO, identity</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top">Payment Processing</td>
                                    <td className="py-3 px-4 align-top">Stripe</td>
                                    <td className="py-3 px-4 align-top">Billing, subscriptions</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 align-top">AI Processing</td>
                                    <td className="py-3 px-4 align-top">Google (Gemini)</td>
                                    <td className="py-3 px-4 align-top">Content generation, insights</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-4">
                        <strong>We do NOT sell your personal data.</strong> Third parties only process data on our behalf and are contractually obligated to protect it.
                    </p>

                    {/* Section 6 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">6</span>
                        <span>Data Retention</span>
                    </h3>
                    <p>We retain your personal data for as long as your account is active or as needed to provide services. Specific retention periods:</p>
                    <ul>
                        <li><strong>Account Data:</strong> Until account deletion + 30 days for data export</li>
                        <li><strong>Billing Records:</strong> 7 years (tax/legal requirements)</li>
                        <li><strong>Audit Logs:</strong> 3 years (compliance and security)</li>
                        <li><strong>Usage Analytics:</strong> 12 months (aggregated/anonymized thereafter)</li>
                    </ul>

                    {/* Section 7 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">7</span>
                        <span>Data Security</span>
                    </h3>
                    <p>We implement reasonable security measures to protect your data:</p>
                    <ul>
                        <li><strong>Encryption:</strong> TLS 1.3 for data in transit, AES-256 for data at rest</li>
                        <li><strong>Access Control:</strong> Role-based access, multi-factor authentication</li>
                        <li><strong>Audit Trails:</strong> Cryptographically signed activity logs (Ed25519)</li>
                        <li><strong>Infrastructure:</strong> SOC 2 compliant hosting (Convex, Cloudflare)</li>
                    </ul>
                    <p>
                        While we strive to protect your data, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
                    </p>

                    {/* Section 8 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">8</span>
                        <span>International Data Transfers</span>
                    </h3>
                    <p>
                        Your data may be transferred to and processed in the United States. If you are located outside the US, you consent to this transfer by using our Service. We ensure appropriate safeguards are in place with our service providers.
                    </p>

                    {/* Section 9 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">9</span>
                        <span>Children's Privacy</span>
                    </h3>
                    <p>
                        Our Service is not directed to individuals under 18 years of age. We do not knowingly collect personal data from children under 13. If you are a parent or guardian and believe your child has provided us with personal data, please contact us immediately at <a href="mailto:info@adaptivestartup.io" className="text-nobel-gold hover:underline">info@adaptivestartup.io</a>.
                    </p>

                    {/* Section 10 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">10</span>
                        <span>Changes to This Policy</span>
                    </h3>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. For significant changes, we will send an email notification.
                    </p>

                    {/* Section 11 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">11</span>
                        <span>Contact Us</span>
                    </h3>
                    <p>For privacy-related inquiries or to exercise your data rights:</p>
                    <ul>
                        <li><strong>Email:</strong> <a href="mailto:info@adaptivestartup.io" className="text-nobel-gold hover:underline">info@adaptivestartup.io</a></li>
                        <li><strong>Subject Line:</strong> "Privacy Request" or "TDPSA Request"</li>
                        <li><strong>Location:</strong> Fort Worth, Texas</li>
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
