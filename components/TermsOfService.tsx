
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

interface TermsOfServiceProps {
    onLogin: () => void;
    onNavigateHome: () => void;
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ onLogin, onNavigateHome }) => {
    return (
        <div className="min-h-screen bg-[#F9F8F4] font-sans text-stone-900 selection:bg-nobel-gold selection:text-white">
            <Helmet>
                <title>Terms of Service | Adaptive Startup</title>
                <meta name="description" content="Terms of Service for Adaptive Startup. Understand the rules and regulations for using our operating system for founders." />
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
                <h1 className="font-serif text-4xl md:text-5xl text-stone-900 mb-4">Master Terms of Service</h1>
                <p className="text-stone-500 mb-12">Last updated: January 23, 2026</p>

                <div className="prose prose-stone prose-lg max-w-none">
                    <p>
                        Please read these Master Terms of Service ("Terms") carefully before using the TEKIMAX ecosystem. These Terms govern your access to and use of all products provided by Adaptive LLC ("we," "us," or "our") (registered in Texas), including but not limited to:
                    </p>
                    <ul>
                        <li><strong>Adaptive Startup:</strong> The Entrepreneurial Operating System and associated tools.</li>
                        <li><strong>Tekimax Adaptive Learning:</strong> The cognitive exoskeleton and neurodivergent learning platform.</li>
                        <li><strong>The Self-Adaptive Engine:</strong> The underlying AI state machine and intelligence core powering our services (collectively, the "Service").</li>
                    </ul>

                    {/* Section 1 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">1</span>
                        <span>Acceptance of Terms</span>
                    </h3>
                    <p>
                        By creating an account, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use the Service.
                    </p>

                    {/* Section 2 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">2</span>
                        <span>Nature of Services: Beta & Experimental</span>
                    </h3>
                    <p>
                        You acknowledge that parts of the Service (specifically the "Self-Adaptive Engine" and "Cognitive Exoskeleton") are experimental in nature and may be designated as "Beta" or "Research Preview." These services may not operate correctly and may be substantially modified or discontinued at any time. We are not liable for any data loss, service interruption, or performance issues associated with Beta features.
                    </p>

                    {/* Section 3 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">3</span>
                        <span>Generative AI Disclaimer</span>
                    </h3>
                    <div className="bg-stone-100 p-6 rounded-xl border border-stone-200 my-6">
                        <h4 className="text-stone-900 font-bold mt-0">Important Warning Regarding AI Outputs</h4>
                        <p className="mb-0 text-sm">
                            Our Service utilizes advanced Large Language Models (LLMs) and generative artificial intelligence. By using the Service, you acknowledge and agree to the following:
                        </p>
                        <ul className="text-sm mt-4 space-y-2">
                            <li><strong>Risk of Hallucinations:</strong> AI models are probabilistic and may generate information that is inaccurate, factually incorrect, or nonsensical ("hallucinations"). Output may sound authoritative but be completely false. <strong>You must independently verify all AI-generated content.</strong></li>
                            <li><strong>No Professional Advice:</strong> The Service is for informational and productivity purposes only. It does <strong>not</strong> constitute legal, financial, medical, or other professional advice. Do not rely on the Service for critical decisions (e.g., term sheets, medical diagnosis, investment strategy) without consulting a qualified human professional.</li>
                            <li><strong>Non-Deterministic Outcomes:</strong> The "Self-Adaptive Engine" evolves based on input. We cannot guarantee that the Service will produce the same output for the same input at different times.</li>
                            <li><strong>Bias & Safety:</strong> While we implement safety guardrails, AI models can reflect biases present in their training data. We do not endorse any opinions generated by the AI.</li>
                        </ul>
                    </div>
                    <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 my-6">
                        <h4 className="text-amber-900 font-bold mt-0">⚠️ Critical: Not Professional Advice</h4>
                        <p className="mb-0 text-sm text-amber-800">
                            AI outputs may suggest business structures, financial projections, or legal language. These are <strong>starting points for discussion with licensed professionals</strong>, not final advice. Do NOT file legal documents, make investment decisions, or submit government forms based solely on AI output. We strongly recommend consulting a Texas-licensed attorney and CPA for all material business decisions.
                        </p>
                    </div>

                    {/* Section 4 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">4</span>
                        <span>User Responsibility</span>
                    </h3>
                    <p>
                        You are solely responsible for:
                    </p>
                    <ul>
                        <li>Verifying the accuracy and suitability of any output (documents, plans, code, or advice) generated by the Service.</li>
                        <li>Ensuring that your use of the Service complies with all applicable laws and regulations.</li>
                        <li>The security of your account credentials and API keys.</li>
                    </ul>
                    <p>
                        Adaptive LLC is not responsible for any errors, omissions, or financial losses resulting from your reliance on AI-generated content.
                    </p>

                    {/* Section 5 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">5</span>
                        <span>Human-AI Audit Trail</span>
                    </h3>
                    <p>
                        We maintain cryptographic records of all AI-assisted decisions and user actions within your projects. This includes:
                    </p>
                    <ul>
                        <li>Timestamp of each action</li>
                        <li>User identity verification (Ed25519 public key)</li>
                        <li>Optional digital signature for critical actions (e.g., document signing, equity changes)</li>
                        <li>Change history with detailed diffs</li>
                    </ul>
                    <p>
                        You may access your project's complete audit log at any time via the "Activity" tab in your dashboard. This immutable record supports your compliance and due diligence requirements.
                    </p>

                    {/* Section 6 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">6</span>
                        <span>Intellectual Property</span>
                    </h3>
                    <p>
                        <strong>Our IP:</strong> The Service, including the "Self-Adaptive Engine," algorithms, software, and original content, is the exclusive property of Adaptive LLC and its licensors.
                    </p>
                    <p>
                        <strong>Your IP:</strong> You retain ownership of the specific business data and content you input into the Service. However, you grant us a license to process this data to provide the Service to you. Regarding AI-generated output, we assign to you all rights, title, and interest in the output to the extent permitted by law, provided you have complied with these Terms.
                    </p>

                    {/* Section 7 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">7</span>
                        <span>Subscription, Payments & Automatic Renewal</span>
                    </h3>
                    <p>
                        Certain features are billed on a subscription basis. You agree to pay all fees in accordance with the pricing terms in effect at the time of purchase. We use third-party processors (e.g., Stripe) for secure billing and do not store your full credit card information.
                    </p>
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 my-6">
                        <h4 className="text-blue-900 font-bold mt-0">Automatic Renewal Notice</h4>
                        <p className="text-sm text-blue-800 mb-4">
                            Your subscription will <strong>automatically renew</strong> at the end of each billing period (monthly or annually) unless you cancel. We will charge your payment method on file at the then-current rate.
                        </p>
                        <p className="text-sm text-blue-800 mb-0">
                            <strong>To cancel:</strong> Access your account settings at app.adaptivestartup.io/settings or email info@adaptivestartup.io at least 24 hours before your renewal date. No refunds are provided for partial billing periods.
                        </p>
                    </div>
                    <h4>Usage Limits</h4>
                    <p>
                        Your subscription includes a monthly allocation of AI tokens based on your tier. Usage resets on your billing date. If you exceed your allocation, you may experience temporary throttling or incur overage charges at our then-current rate. You can view your real-time usage at any time in your account settings.
                    </p>

                    {/* Section 8 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">8</span>
                        <span>Data Ownership & Export</span>
                    </h3>
                    <p>
                        You own your data. We provision dedicated storage and database resources for every organization, providing clear audit trails. You may export your business data at any time via:
                    </p>
                    <ul>
                        <li>The "Export" feature in your project settings</li>
                        <li>API access (for Pro and Enterprise tiers)</li>
                        <li>Requesting a full data export via info@adaptivestartup.io</li>
                    </ul>
                    <p>
                        Upon account termination, you will have <strong>30 days</strong> to export your data before permanent deletion.
                    </p>

                    {/* Section 9 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">9</span>
                        <span>Limitation of Liability</span>
                    </h3>
                    <p className="uppercase text-sm font-bold tracking-wide">
                        To the maximum extent permitted by law, Adaptive LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from: (a) your use or inability to use the Service; (b) any AI-generated errors or "hallucinations"; (c) unauthorized access to or use of our servers and/or any personal information stored therein. Our total aggregate liability shall not exceed the greater of $100 or the amounts paid by you to Adaptive LLC in the twelve (12) months preceding the claim.
                    </p>

                    {/* Section 10 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">10</span>
                        <span>Termination</span>
                    </h3>
                    <p><strong>By You:</strong> You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of your current billing period.</p>
                    <p><strong>By Us:</strong> We may suspend or terminate your access:</p>
                    <ul>
                        <li><strong>Immediately</strong>, for material breach of these Terms (e.g., fraud, abuse, illegal activity, or violation of our Acceptable Use Policy)</li>
                        <li><strong>With 30 days notice</strong>, for non-payment or account inactivity exceeding 12 months</li>
                        <li><strong>With 90 days notice</strong>, for discontinuation of the Service</li>
                    </ul>
                    <p>
                        Upon termination, you retain ownership of your data and may export it within 30 days as described in Section 8.
                    </p>

                    {/* Section 11 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">11</span>
                        <span>Dispute Resolution & Arbitration</span>
                    </h3>
                    <p>
                        Any dispute, controversy, or claim arising out of or relating to these Terms, or the breach, termination, or invalidity thereof, shall be resolved through binding arbitration conducted in San Antonio, Texas, under the rules of JAMS (Judicial Arbitration and Mediation Services). The arbitrator's decision shall be final and binding.
                    </p>
                    <p>
                        <strong>Class Action Waiver:</strong> You agree to resolve disputes with us on an individual basis only, and you waive any right to participate in a class action lawsuit or class-wide arbitration.
                    </p>
                    <p>
                        <strong>Exception:</strong> Either party may seek injunctive or other equitable relief in state or federal court sitting in Tarrant County, Texas, to protect intellectual property rights or prevent irreparable harm.
                    </p>

                    {/* Section 12 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">12</span>
                        <span>Governing Law</span>
                    </h3>
                    <p>
                        These Terms shall be governed by the laws of the State of Texas, without regard to its conflict of law provisions.
                    </p>


                    {/* Section 13 */}
                    <h3 className="flex items-baseline gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-bold shrink-0">13</span>
                        <span>Contact Us</span>
                    </h3>
                    <p>
                        If you have any questions about these Terms, please contact us:
                    </p>
                    <ul>
                        <li>Email: <a href="mailto:info@adaptivestartup.io" className="text-nobel-gold hover:underline">info@adaptivestartup.io</a></li>
                        <li>Location: Fort Worth, Texas</li>
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default TermsOfService;
