import { CanvasData } from './types';

export const INITIAL_CONTENT = `
<!-- COVER PAGE -->
<div class="text-center py-40 mb-24 page-break">

  <p class="text-sm uppercase tracking-widest text-gray-500 mb-6">
    Demo Business Plan
  </p>

  <h1 class="text-6xl font-serif font-bold text-nobel-dark mb-8">
    We Can Do It Consulting
  </h1>

  <p class="text-2xl font-serif text-nobel-gold mb-16">
    Strategic Operations & Management Consulting
  </p>

  <div class="mt-32 space-y-2">
    <p class="text-xl font-semibold text-nobel-dark">
      Prepared by Rebecca Champ
    </p>
    <p class="text-lg italic text-gray-500">
      Owner & Principal Consultant
    </p>
    <p class="text-lg italic text-gray-500 mt-6">
      Date Prepared: ___________________
    </p>
  </div>

</div>

<!-- EXECUTIVE SUMMARY -->
<h2>I. Executive Summary</h2>

<h3>Product Overview</h3>
<p class="italic text-gray-700">
  Describe the core services your company provides and the value those services deliver to clients.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We Can Do It Consulting provides operational and management consulting services to small- and medium-sized organizations.
    Our offerings focus on office management, workflow optimization, and business process improvement to increase efficiency
    and reduce administrative overhead.
  </em>
</div>

<h3>Target Customers</h3>
<p class="italic text-gray-700">
  Identify who you serve, including roles, company size, and primary challenges.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Our target customers include business owners, executives, and human resources leaders in organizations with 5 to 500
    employees. We specialize in supporting leadership teams experiencing growth, inefficiencies, or operational strain.
  </em>
</div>

<h3>Vision for the Future</h3>
<p class="italic text-gray-700">
  Articulate where the company is headed over the next three to five years and how it plans to grow.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Over the next 3–5 years, we plan to expand into a small team-based practice, add packaged service offerings (operations audits,
    SOP libraries, and retainer support), and build strategic partnerships with local CPA and legal firms for referral-based growth.
  </em>
</div>

<hr />

<h2>II. Company Description</h2>

<h3>Mission Statement</h3>
<p class="italic text-gray-700">
  Clearly state the company’s purpose and the value it exists to deliver.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Our mission is to help growing organizations run smoothly by building practical, sustainable operational systems that improve
    execution, accountability, and employee experience.
  </em>
</div>

<h3>Principal Members & Key Roles</h3>
<p class="italic text-gray-700">
  List ownership, leadership, and essential operational roles.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class="border-b pb-2 text-left">Name</th>
          <th class="border-b pb-2 text-left">Role</th>
          <th class="border-b pb-2 text-left">Primary Responsibilities</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="py-2 align-top">Rebecca Champ</td>
          <td class="py-2 align-top">Owner & Primary Consultant</td>
          <td class="py-2 align-top">Client delivery, operations design, training, project management</td>
        </tr>
        <tr>
          <td class="py-2 align-top">Guy Champ</td>
          <td class="py-2 align-top">Business Manager / Sales</td>
          <td class="py-2 align-top">Business development, proposals, scheduling, invoicing support</td>
        </tr>
      </tbody>
    </table>
  </em>
</div>

<h3>Legal Structure</h3>
<p class="italic text-gray-700">
  Describe the legal structure of the business and why it supports the operating model.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We operate as a single-member LLC to keep administration simple while protecting personal assets. The structure supports
    client contracting, professional liability coverage, and flexible growth as we add subcontractors.
  </em>
</div>

<hr />

<h2>III. Market Research</h2>

<h3>Industry Overview</h3>
<p class="italic text-gray-700">
  Summarize the consulting industry, including market trends and demand drivers.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Demand for operations and process improvement consulting is growing as small businesses scale, hire quickly, and adopt
    new tools. Many organizations need lightweight systems, SOPs, and training that match their size and budget.
  </em>
</div>

<h3>Customer Profile</h3>
<p class="italic text-gray-700">
  Provide a detailed description of the ideal customer, including motivations and pain points.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Our ideal customer is a founder-led organization with 10–150 employees experiencing inconsistent execution, unclear roles,
    and too many “tribal knowledge” processes. They want clarity, repeatability, and measurable improvements in throughput.
  </em>
</div>

<h3>Competitor Analysis</h3>
<p class="italic text-gray-700">
  Compare the business against key competitors in the market.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class="border-b pb-2 text-left">Competitor Type</th>
          <th class="border-b pb-2 text-left">Strengths</th>
          <th class="border-b pb-2 text-left">Gaps We Address</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="py-2 align-top">Large consulting firms</td>
          <td class="py-2 align-top">Brand, scale, specialized teams</td>
          <td class="py-2 align-top">Often too expensive and heavy-weight for SMB timelines</td>
        </tr>
        <tr>
          <td class="py-2 align-top">Independent consultants</td>
          <td class="py-2 align-top">Flexible, niche experience</td>
          <td class="py-2 align-top">Quality varies; limited documentation + training handoff</td>
        </tr>
        <tr>
          <td class="py-2 align-top">Software-only solutions</td>
          <td class="py-2 align-top">Automation and tooling</td>
          <td class="py-2 align-top">Tools without process design can increase chaos and rework</td>
        </tr>
      </tbody>
    </table>
  </em>
</div>

<h3>Competitive Advantages</h3>
<p class="italic text-gray-700">
  List the unique strengths and differentiators that set the company apart.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Our advantage is practical execution: we design workflows, document SOPs, train teams, and stay engaged until adoption sticks.
    We focus on “simple systems that teams actually use,” not theory.
  </em>
</div>

<h3>Regulatory Considerations</h3>
<p class="italic text-gray-700">
  Identify any relevant regulations, compliance requirements, or professional standards.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Depending on the client industry, we may align processes with HR recordkeeping, privacy requirements, or industry standards.
    We also use confidentiality clauses and secure document handling practices for client materials.
  </em>
</div>

<hr />

<h2>IV. Service Line</h2>

<h3>Services Offered</h3>
<p class="italic text-gray-700">
  Describe each service and the specific problem it solves.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class="border-b pb-2 text-left">Service</th>
          <th class="border-b pb-2 text-left">What It Solves</th>
          <th class="border-b pb-2 text-left">Typical Deliverables</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="py-2 align-top">Operations Audit</td>
          <td class="py-2 align-top">Bottlenecks, unclear handoffs, rework</td>
          <td class="py-2 align-top">Findings report, quick wins, roadmap</td>
        </tr>
        <tr>
          <td class="py-2 align-top">Workflow Optimization</td>
          <td class="py-2 align-top">Slow processes and inconsistent execution</td>
          <td class="py-2 align-top">New workflow map, SOPs, KPI plan</td>
        </tr>
        <tr>
          <td class="py-2 align-top">Office Management Support</td>
          <td class="py-2 align-top">Admin overload and operational strain</td>
          <td class="py-2 align-top">Templates, systems setup, training</td>
        </tr>
      </tbody>
    </table>
  </em>
</div>

<h3>Pricing Structure</h3>
<p class="italic text-gray-700">
  Explain how services are priced, including hourly, project-based, or retainer models.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We offer project-based pricing for defined deliverables and monthly retainers for ongoing operational support.
    Engagements typically include discovery, implementation, and training to ensure adoption.
  </em>
</div>

<h3>Product Lifecycle</h3>
<p class="italic text-gray-700">
  Identify the current lifecycle stage of the services offered.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Our core services are in an early growth stage, with repeatable delivery patterns and templates that allow faster onboarding
    of new clients and future subcontractors.
  </em>
</div>

<h3>Intellectual Property</h3>
<p class="italic text-gray-700">
  Note any proprietary tools, methodologies, trademarks, or frameworks.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We use proprietary checklists, SOP templates, and a structured operations playbook developed from prior client engagements.
    These tools help accelerate delivery while maintaining consistent quality.
  </em>
</div>

<h3>Research & Development</h3>
<p class="italic text-gray-700">
  Outline plans for improving and expanding service offerings.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We will continuously improve templates, develop training modules, and package select services into fixed-scope offerings
    (audits, SOP bundles, onboarding toolkits) to reduce delivery time and increase scalability.
  </em>
</div>

<hr />

<h2>V. Marketing & Sales</h2>

<h3>Growth Strategy</h3>
<p class="italic text-gray-700">
  Describe how the company will acquire and retain customers.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We grow through referral relationships (CPAs, attorneys, HR firms), local networking, speaking engagements, and targeted
    outreach to businesses experiencing rapid hiring or operational change.
  </em>
</div>

<h3>Customer Communication</h3>
<p class="italic text-gray-700">
  Explain how the business communicates with prospects and clients.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We communicate through scheduled check-ins, weekly status updates, shared project trackers, and clear documentation.
    Every engagement includes a defined cadence and decision-making process.
  </em>
</div>

<h3>Sales Process</h3>
<p class="italic text-gray-700">
  Outline the steps from lead generation through contract execution.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Lead → discovery call → scoped proposal → agreement + kickoff → delivery milestones → closeout + optional retainer.
  </em>
</div>

<hr />

<h2>VI. Operations Plan</h2>

<h3>Day-to-Day Operations</h3>
<p class="italic text-gray-700">
  Explain how the business runs daily, including tools, workflows, and service delivery.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Daily operations include client delivery work blocks, documentation updates, scheduled meetings, and pipeline management.
    We use standardized templates for proposals, SOPs, and training materials to maintain quality and speed.
  </em>
</div>

<h3>Tools & Systems</h3>
<p class="italic text-gray-700">
  List the tools used for communication, documentation, project management, and billing.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th class="border-b pb-2 text-left">Category</th>
          <th class="border-b pb-2 text-left">Tool</th>
          <th class="border-b pb-2 text-left">Purpose</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="py-2 align-top">Project Management</td>
          <td class="py-2 align-top">________________</td>
          <td class="py-2 align-top">Task tracking and milestones</td>
        </tr>
        <tr>
          <td class="py-2 align-top">Docs & SOPs</td>
          <td class="py-2 align-top">________________</td>
          <td class="py-2 align-top">Documentation and templates</td>
        </tr>
        <tr>
          <td class="py-2 align-top">Billing</td>
          <td class="py-2 align-top">________________</td>
          <td class="py-2 align-top">Invoices and payment collection</td>
        </tr>
      </tbody>
    </table>
  </em>
</div>

<h3>Milestones & Implementation Plan</h3>
<p class="italic text-gray-700">
  Outline near-term milestones and how you will execute against them.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    In the next 90 days, we will complete 2–3 client engagements, refine our SOP toolkit, formalize referral partnerships,
    and publish a simple service menu with clear packages and pricing.
  </em>
</div>

<hr />

<h2>VII. Management & Organization</h2>

<h3>Organizational Structure</h3>
<p class="italic text-gray-700">
  Describe how leadership and responsibilities are structured today, and how that may change as you grow.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    The business is founder-led with a lean structure. As demand increases, we will add subcontractors for implementation
    support while keeping strategy and quality control centralized.
  </em>
</div>

<h3>Hiring Plan</h3>
<p class="italic text-gray-700">
  Explain if and when you plan to hire employees or subcontractors.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    We plan to use subcontractors first (admin support, documentation help, and training facilitation) to stay flexible,
    then consider a part-time operations coordinator as revenue stabilizes.
  </em>
</div>

<hr />

<h2>VIII. Financial Plan</h2>

<h3>Revenue Model</h3>
<p class="italic text-gray-700">
  Describe how the business makes money and the primary revenue streams.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Revenue comes from project-based consulting engagements and monthly retainers. Retainers provide stability while projects
    fund growth and template development.
  </em>
</div>

<h3>Cost Structure</h3>
<p class="italic text-gray-700">
  List major costs to operate the business (software, insurance, marketing, contractors, etc.).
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Major costs include software subscriptions, professional insurance, marketing materials, travel, and subcontractor support
    for implementation during high-demand periods.
  </em>
</div>

<h3>Financial Projections</h3>
<p class="italic text-gray-700">
  Provide projections (12 months, 3 years, or 5 years) and key assumptions.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Year 1 focuses on consistent client acquisition and repeatable delivery. Projections assume an average of 2 projects per month
    plus 2 retainers by end of year, with gradual increases in pricing as case studies and referrals grow.
  </em>
</div>

<hr />

<h2>IX. Appendix</h2>

<h3>Supporting Documents</h3>
<p class="italic text-gray-700">
  Include resumes, sample SOPs, service menus, case studies, contracts, references, or certifications.
</p>
<div class="bg-yellow-100 border-l-4 border-yellow-400 p-4 my-4 rounded text-sm text-gray-700 italic">
  <em>
    <strong>Example:</strong>
    Attach: sample workflow maps, SOP excerpts, a one-page service menu, a sample proposal, and any relevant certifications
    or client testimonials.
  </em>
</div>
`;





export const SECTIONS = [
  { id: 'executive-summary', title: 'I. Executive Summary' },
  { id: 'company-description', title: 'II. Company Description' },
  { id: 'market-research', title: 'III. Market Research' },
  { id: 'service-line', title: 'IV. Service Line' },
  { id: 'marketing-sales', title: 'V. Marketing & Sales' },
];

export const INITIAL_CANVAS_DATA: CanvasData = [
  {
    id: 'customer-segments',
    title: 'Customer Segments',
    description: 'Who are your most important customers? Who are you creating value for?',
    content: 'Example: Urban pet owners aged 25-45 who value organic products. They have disposable income and treat pets as family.'
  },
  {
    id: 'value-propositions',
    title: 'Value Propositions',
    description: 'What value do you deliver to the customer? Which one of our customer\'s problems are we helping to solve?',
    content: 'Example: 100% Organic, locally sourced ingredients. Delivered frozen to maintain freshness. Personalized meal plans for dogs.'
  },
  {
    id: 'channels',
    title: 'Channels',
    description: 'Through which channels do our customer segments want to be reached?',
    content: 'Example: Direct-to-Consumer website, social media (Instagram/TikTok), Local Farmers Markets.'
  },
  {
    id: 'customer-relationships',
    title: 'Customer Relationships',
    description: 'What type of relationship does each of our customer segments expect us to establish and maintain with them?',
    content: 'Example: Subscription based (long-term), Community building through social media, personalized support.'
  },
  {
    id: 'revenue-streams',
    title: 'Revenue Streams',
    description: 'For what value are our customers really willing to pay? How do they currently pay?',
    content: 'Example: Monthly subscription fees ($60-$120/month), one-time trial boxes.'
  },
  {
    id: 'key-resources',
    title: 'Key Resources',
    description: 'What key resources do our value propositions require?',
    content: 'Example: Commercial kitchen, Local farm partnerships, Delivery logistics software, Brand IP.'
  },
  {
    id: 'key-activities',
    title: 'Key Activities',
    description: 'What key activities do our value propositions require?',
    content: 'Example: Food preparation, Quality control, Marketing, Delivery logistics management.'
  },
  {
    id: 'key-partnerships',
    title: 'Key Partnerships',
    description: 'Who are our key partners? Who are our key suppliers?',
    content: 'Example: Local organic farms, Recyclable packaging supplier, Last-mile delivery service.'
  },
  {
    id: 'cost-structure',
    title: 'Cost Structure',
    description: 'What are the most important costs inherent in our business model?',
    content: 'Example: Ingredients (Variable), Kitchen Rent (Fixed), Labor, Marketing (Variable).'
  }
];
