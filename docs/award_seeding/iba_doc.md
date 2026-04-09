# International Business Awards (IBA)
# Complete Category Reference for RAG Embedding
> 2026 Edition | Program 2 of 9
> ✅ = scraped — INSERT as-is | ⚠️ = label only — LLM enrich first

---

## PROGRAM METADATA
- **Program code:** IBA
- **Full name:** International Business Awards®
- **Geography:** Worldwide — all organizations globally eligible
- **Eligibility period:** January 1 2024 onward
- **URL:** iba.stevieawards.com
- **Ceremony:** October 28 2026, Paris, France
- **Entry format (standard):** Essay 1300 chars history + 1900 chars achievements + 1900 chars significance + optional files

## KEY DIFFERENCES FROM ABA
1. Open to all organizations **worldwide** (not USA only)
2. Company of the Year categories (B01–B45) have **NO entry fees**
3. Uses **Euro/USD dual thresholds** for size breakouts
4. Has **Individual Categories** group (X-codes) — unique to IBA
5. Has **Public Sector & Government Innovation** group — unique to IBA
6. Has **AI Innovation & Transformation** group (S-codes) — unique IBA branding
7. App categories (P55–P89) are **ALL bare labels** → ALL need LLM enrichment
8. IBA Management uses "Executive of the Year" by industry (not "Achievement in Management")
9. IBA New Products uses **J-codes** (not P-codes like ABA)

## EMBEDDING TEMPLATE
```
AWARD PROGRAM: International Business Awards (IBA)
PROGRAM SCOPE: Open to all organizations worldwide — public, private, for-profit, non-profit, any size
ELIGIBILITY PERIOD: January 1 2024 onward
CATEGORY GROUP: {group_name}
GROUP DESCRIPTION: {group_description}
CATEGORY CODE: {code}
CATEGORY NAME: {name}
SUBCATEGORY: {subcategory or N/A}
WHAT THIS RECOGNIZES: {description}
NOMINEE IS A: {individual | team | department | organization | product | campaign | event | app}
INDUSTRY / DOMAIN TAGS: {comma-separated}
SIZE / ORG TYPE CONSTRAINTS: {any restrictions}
WHAT JUDGES EVALUATE: {key signals}
ENTRY FORMAT: {what must be submitted}
KEYWORDS: {synonyms and related terms}
```

## LLM ENRICHMENT PROMPT (for ⚠️ rows)
```
Program: International Business Awards (IBA)
Program scope: Worldwide — all organizations globally
Category group: {group_name}
Group purpose: {group_description}
Category: {code}. {name}
Subcategory: {sub or N/A}
Existing description: "{raw}"

Write a WHAT THIS RECOGNIZES paragraph (120–160 words). Cover: (1) who/what qualifies worldwide,
(2) concrete activities/outputs, (3) what differentiates from adjacent categories,
(4) example winning achievement. Do NOT start with "This category recognizes".
```

---

# ALL IBA CATEGORY GROUPS

---

## GROUP 1: Achievement Categories
**Group desc:** Recognizing achievements since the beginning of 2024.
**Entry:** 1300 chars history + 1900 chars achievements + 1900 chars significance
**Nominee type:** organization

| Code | Name | Description |
|------|------|-------------|
| B60 | Achievement in Collaboration and Partnership (subs: a Best Public-Private Partnership / b Excellence in Industry-Academia Collaboration / c Global Partnership of the Year) | ✅ Recognizes cross-sector and international collaborations that delivered significant business, social, or operational value since the beginning of 2024. |
| B61 | Achievement in Corporate Social Responsibility | ✅ Successful nominations will describe one or more of your organization's CSR initiatives since the beginning of 2024 that demonstrate your commitment to making a meaningful impact on the lives and wellbeing of the communities you serve and in which you operate. |
| B62 | Achievement in Customer Satisfaction | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably increased customer satisfaction over a prior period. |
| B63 | Achievement in Data & Analytics (New 2026) | ✅ Successful nominations will describe one or more initiatives since the beginning of 2024 that have improved data quality, analytics practices, data governance, predictive modeling, or business decision-making through data. |
| B64 | Achievement in Digital Transformation Excellence (New 2026) | ✅ Successful nominations will describe how digital solutions, platforms, or processes implemented since the beginning of 2024 have materially improved organizational performance, customer engagement, or innovation capabilities. |
| B65 | Achievement in Diversity & Inclusion | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 to make your organization more diverse and inclusive for customers, employees, partners, suppliers, and/or other stakeholders. |
| B66 | Achievement in Environment, Social, and Governance | ✅ Successful nominations will describe how the nominated organization has taken steps to lower pollution, CO2 output, reduce waste, and achieve a diverse and inclusive workforce. |
| B67 | Achievement in Finance | ✅ Successful nominations will describe one or more of your organization's finance-related achievements since the beginning of 2024. Applicable achievements may relate to start-up funding, investor relations, refinancing, financial management, budgeting, etc. |
| B68 | Achievement in Global Collaboration | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrated outstanding success in cross-border or international collaboration. Applicable achievements may include partnerships, joint ventures, or global projects that have driven innovation, economic growth, or cultural exchange. |
| B69 | Achievement in Growth | ✅ Successful nominations will describe one or more of your organization's growth-related achievements since the beginning of 2024. Applicable achievements may relate to corporate expansion, mergers and acquisitions, divestitures, etc. |
| B70 | Achievement in Health and Safety Excellence | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that enhanced health, safety, or well-being in the workplace or community. Applicable achievements may include advancements in workplace safety protocols, community health campaigns, or pandemic response measures. |
| B71 | Achievement in Human Resources | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably improved the organization's relationship with its employees over a prior period. |
| B72 | Achievement in International Expansion | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 to grow its business or operations in nations other than the one in which it was founded. |
| B73 | Achievement in Operational Excellence (New 2026) | ✅ Successful nominations will describe measurable improvements in process efficiency, cost reduction, quality enhancement, or workflow optimization since the beginning of 2024. |
| B74 | Achievement in Organization Recovery | ✅ This is the "business turnaround" category. Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably improved the organization's financial or operational performance over a prior period. |
| B75 | Achievement in Product Innovation | ✅ Successful nominations will describe one or more product-related achievements since the beginning of 2024. Applicable achievements may relate to innovation in product design or redesign, manufacturing processes or operations, branding, etc. |
| B76 | Achievement in Sales or Revenue Generation | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably increased sales or other revenue over a prior period. |
| B77 | Achievement in Science or Technology | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have initiated or promoted one or more advances in scientific or technological understanding or practice. |
| B78 | Achievement in Technology Innovation | ✅ Successful nominations will describe the genesis, development, and practical implementation of new, breakthrough technologies. |

---

## GROUP 2: Company / Organization Categories
**Group desc:** Recognizing achievements of entire organizations including Company of the Year, CSR Program of the Year, Most Innovative Company of the Year.
**Entry:** 1500 chars history + 1900 chars achievements + 1900 chars significance
**Nominee type:** organization
**NO ENTRY FEE for B01–B45.**
**Size breakouts:** Small (≤50 emp AND ≤€10M/$11M turnover) | Medium (≤250 emp AND ≤€50M/$55M) | Large (>250 emp AND >€50M/$55M)

> ⚠️ B01–B45 are industry labels only — NO descriptions on website. Each spawns 3 size sub-entries (~135 total). All need LLM enrichment.

| Code | Name | Description |
|------|------|-------------|
| B01 | Company of the Year – Advertising, Marketing, & Public Relations | ⚠️ ENRICH |
| B02 | Company of the Year – Aerospace & Defense | ⚠️ ENRICH |
| B03 | Company of the Year – Agriculture & Agritech (New 2026) | ⚠️ ENRICH |
| B04 | Company of the Year – Apparel, Beauty & Fashion | ⚠️ ENRICH |
| B05 | Company of the Year – Automotive & Transport Equipment | ⚠️ ENRICH |
| B06 | Company of the Year – Banking | ⚠️ ENRICH |
| B07 | Company of the Year – Biotechnology (New 2026) | ⚠️ ENRICH |
| B08 | Company of the Year – Business & Professional Services | ⚠️ ENRICH |
| B09 | Company of the Year – Chemicals | ⚠️ ENRICH |
| B10 | Company of the Year – Computer Hardware | ⚠️ ENRICH |
| B11 | Company of the Year – Computer Software | ⚠️ ENRICH |
| B12 | Company of the Year – Computer Services | ⚠️ ENRICH |
| B13 | Company of the Year – Conglomerates | ⚠️ ENRICH |
| B14 | Company of the Year – Consumer Products (Durables) | ⚠️ ENRICH |
| B15 | Company of the Year – Consumer Products (Non-Durables) | ⚠️ ENRICH |
| B16 | Company of the Year – Consumer Services | ⚠️ ENRICH |
| B17 | Company of the Year – Cybersecurity (New 2026) | ⚠️ ENRICH |
| B18 | Company of the Year – Diversified Services | ⚠️ ENRICH |
| B19 | Company of the Year – E-Commerce (New 2026) | ⚠️ ENRICH |
| B20 | Company of the Year – Education & EdTech (New 2026) | ⚠️ ENRICH |
| B21 | Company of the Year – Electronics | ⚠️ ENRICH |
| B22 | Company of the Year – Energy | ⚠️ ENRICH |
| B23 | Company of the Year – Environmental Services / CleanTech (New 2026) | ⚠️ ENRICH |
| B24 | Company of the Year – Financial Services | ⚠️ ENRICH |
| B25 | Company of the Year – Food & Beverage | ⚠️ ENRICH |
| B26 | Company of the Year – Gaming & Esports (New 2026) | ⚠️ ENRICH |
| B27 | Company of the Year – Health Providers (New 2026) | ⚠️ ENRICH |
| B28 | Company of the Year – Health Products & Services | ⚠️ ENRICH |
| B29 | Company of the Year – Hospitality & Leisure | ⚠️ ENRICH |
| B30 | Company of the Year – Insurance | ⚠️ ENRICH |
| B31 | Company of the Year – Internet/New Media | ⚠️ ENRICH |
| B32 | Company of the Year – Legal | ⚠️ ENRICH |
| B33 | Company of the Year – Logistics & Supply Chain (New 2026) | ⚠️ ENRICH |
| B34 | Company of the Year – Manufacturing | ⚠️ ENRICH |
| B35 | Company of the Year – Materials & Construction | ⚠️ ENRICH |
| B36 | Company of the Year – Media & Entertainment | ⚠️ ENRICH |
| B37 | Company of the Year – Metals & Mining | ⚠️ ENRICH |
| B38 | Company of the Year – Non-Profit or Government Organizations | ⚠️ ENRICH |
| B39 | Company of the Year – Pharmaceuticals | ⚠️ ENRICH |
| B40 | Company of the Year – Real Estate | ⚠️ ENRICH |
| B41 | Company of the Year – Retail | ⚠️ ENRICH |
| B42 | Company of the Year – Telecommunications | ⚠️ ENRICH |
| B43 | Company of the Year – Transportation | ⚠️ ENRICH |
| B44 | Company of the Year – Utilities | ⚠️ ENRICH |
| B45 | Company of the Year – Venture Capital & Private Equity (New 2026) | ⚠️ ENRICH |
| B46 | Startup of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ For companies that began operations since January 1 2023 anywhere in the world. Recognizes achievements since the beginning of 2024. |
| B47 | Tech Startup of the Year (subs: a Hardware/Peripherals / b Services / c Software) | ✅ For tech companies that began operations since January 1 2023 anywhere in the world. Recognizes achievements since the beginning of 2024. |
| B48 | Most Innovative Company of the Year (subs: a ≤100 emp / b ≤2500 emp / c >2500 emp) | ✅ Recognizing overall achievement in product and/or marketing, sales, manufacturing, management, etc. innovation by a worldwide organization. |
| B49 | Most Innovative Tech Company of the Year (3 size subs) | ✅ Recognizing overall achievement in innovation in the technology sector by a worldwide organization. |
| B50 | Innovation of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizing singular innovations in business model, product, marketing, sales, manufacturing, or management by a worldwide organization or individual. |
| B51 | Technical Innovation of the Year (subs: a ≤100 emp / b ≤1000 emp / c 1000+ emp) | ✅ Recognizing singular innovations in technology, new products, etc., by a worldwide organization or individual. |
| B52 | Corporate Social Responsibility Program of the Year (3 size subs) | ✅ Recognizing worldwide organizations' outstanding contributions to society through CSR programs. |
| B53 | Fastest-Growing Company of the Year (3 size subs) | ✅ Recognizing outstanding revenue growth worldwide since the beginning of 2024. |
| B54 | Fastest-Growing Tech Company of the Year (3 size subs) | ✅ Recognizing outstanding revenue growth in the technology sector worldwide since the beginning of 2024. |

---

## GROUP 3: Achievement in Management Categories
**Group desc:** Recognizing the achievements of executive managers and management teams worldwide since the beginning of 2024.
**Entry:** Essay 650 words + bullet list of 10 accomplishments + optional files
**Nominee type:** individual executive | management team

**Executive of the Year — by industry (all ⚠️ ENRICH):**
> These are pure industry labels. Each represents "Executive of the Year" in that industry.

| Code | Name | Description |
|------|------|-------------|
| A01 | Executive of the Year – Advertising, Marketing, & Public Relations | ⚠️ ENRICH |
| A02 | Executive of the Year – Aerospace & Defense | ⚠️ ENRICH |
| A03 | Executive of the Year – Apparel, Beauty & Fashion | ⚠️ ENRICH |
| A04 | Executive of the Year – Automotive & Transport Equipment | ⚠️ ENRICH |
| A05 | Executive of the Year – Banking | ⚠️ ENRICH |
| A06 | Executive of the Year – Business or Professional Services | ⚠️ ENRICH |
| A07 | Executive of the Year – Chemicals | ⚠️ ENRICH |
| A08 | Executive of the Year – Computer Hardware | ⚠️ ENRICH |
| A09 | Executive of the Year – Computer Services | ⚠️ ENRICH |
| A10 | Executive of the Year – Computer Software | ⚠️ ENRICH |
| A11 | Executive of the Year – Conglomerates | ⚠️ ENRICH |
| A12 | Executive of the Year – Consumer Products (Durables) | ⚠️ ENRICH |
| A13 | Executive of the Year – Consumer Products (Non-Durables) | ⚠️ ENRICH |
| A14 | Executive of the Year – Consumer Services | ⚠️ ENRICH |
| A15 | Executive of the Year – Diversified Services | ⚠️ ENRICH |
| A16 | Executive of the Year – Electronics | ⚠️ ENRICH |
| A17 | Executive of the Year – Energy | ⚠️ ENRICH |
| A18 | Executive of the Year – Financial Services | ⚠️ ENRICH |
| A19 | Executive of the Year – Food & Beverage | ⚠️ ENRICH |
| A20 | Executive of the Year – Health Products & Services | ⚠️ ENRICH |
| A21 | Executive of the Year – Hospitality & Leisure | ⚠️ ENRICH |
| A22 | Executive of the Year – Insurance | ⚠️ ENRICH |
| A23 | Executive of the Year – Internet/New Media | ⚠️ ENRICH |
| A24 | Executive of the Year – Legal | ⚠️ ENRICH |
| A25 | Executive of the Year – Manufacturing | ⚠️ ENRICH |
| A26 | Executive of the Year – Materials & Construction | ⚠️ ENRICH |
| A27 | Executive of the Year – Media & Entertainment | ⚠️ ENRICH |
| A28 | Executive of the Year – Metals & Mining | ⚠️ ENRICH |
| A29 | Executive of the Year – Non-Profit or Government Organizations | ⚠️ ENRICH |
| A30 | Executive of the Year – Pharmaceuticals | ⚠️ ENRICH |
| A31 | Executive of the Year – Real Estate | ⚠️ ENRICH |
| A32 | Executive of the Year – Retail | ⚠️ ENRICH |
| A33 | Executive of the Year – Telecommunications | ⚠️ ENRICH |
| A34 | Executive of the Year – Transportation | ⚠️ ENRICH |
| A35 | Executive of the Year – Utilities | ⚠️ ENRICH |

**Special Management Awards (all ✅ with full descriptions):**

| Code | Name | Description |
|------|------|-------------|
| A36 | Best Innovation in Management Practices (New 2026) | ✅ Honors groundbreaking management strategies that significantly improved operations, engagement, or efficiency worldwide. |
| A37 | Chairman of the Year | ✅ Recognizing the achievements of board chairmen worldwide since the beginning of 2024. |
| A38 | Emerging Leader of the Year | ✅ Highlights an executive under 40 (or new to leadership) who has demonstrated strong leadership potential and tangible business impact. |
| A39 | Excellence in Crisis Leadership | ✅ Recognizes leaders or teams that successfully navigated their organizations through crises or significant disruptions. |
| A40 | Excellence in Diversity Management | ✅ Recognizes leaders or teams worldwide who have championed diversity and built inclusive organizational cultures since the beginning of 2024. |
| A41 | Innovator of the Year | ✅ Recognizing the individual who has contributed most to innovation within their organization and/or industry worldwide since the beginning of 2024. |
| A42 | Lifetime Achievement Award (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizes the entire careers of professionals worldwide who have worked at least 20 years. |
| A43 | Management Team of the Year | ✅ Recognizing the achievements since the beginning of 2024 of an entire management team at a worldwide organization. |
| A44 | Maverick of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizing the individual who has affected the most positive change on their organization and/or industry worldwide since the beginning of 2024. |
| A45 | Woman of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizing the achievements of women in the workplace worldwide since the beginning of 2024. |

---

## GROUP 4: Achievement in Marketing Categories
**Group desc:** Recognizing achievements since the beginning of 2024 in all marketing, advertising, packaging, distribution functions worldwide.
**Entry:** 4 essays — launch date, genesis (250w), development (250w), results (250w) + optional files
**Nominee type:** campaign | team | department | individual

Same category codes and descriptions as ABA Marketing (E01–E69) but worldwide scope. All ✅ — use ABA descriptions substituting "worldwide" for "USA."

**IBA-specific Marketing Professional categories:**

| Code | Name | Description |
|------|------|-------------|
| G01 | Marketing Department of the Year | ✅ Recognizes the achievements of everyone who works in marketing functions in a worldwide organization, regardless of function, location, seniority, or position. |
| G02 | Marketing Team of the Year | ✅ Recognizes a subset of a worldwide marketing organization. May be multidisciplinary, may span multiple organizations, and may be permanent or temporary. |
| G03 | Marketing Executive of the Year | ✅ Recognizes individual marketing executives at VP level or above for their worldwide achievements since the beginning of 2024. |
| G04 | Marketer of the Year | ✅ Recognizing non-executive marketing professionals for their worldwide achievements since the beginning of 2024. |

---

## GROUP 5: Achievement in PR Categories
**Group desc:** All corporate communications, investor relations, and public relations functions worldwide.
**Nominee type:** agency | team | department | individual | campaign

Same C01–C58 codes and descriptions as ABA PR categories but worldwide scope. All ✅ — use ABA descriptions substituting worldwide scope.

---

## GROUP 6: AI Innovation & Transformation Categories (NEW for 2026)
**Group desc:** Recognizing innovation in the application of AI by individuals and organizations worldwide. Nominations describe how AI technologies have been applied innovatively since 1 January 2024.
**Entry:** Essay 4000 chars + supporting materials
**Nominee type:** individual | organization | initiative

| Code | Name | Description |
|------|------|-------------|
| S01 | AI Innovator of the Year | ✅ Recognizing an individual (engineer, researcher, product leader) whose work significantly advanced AI applications or solutions on the global stage. |
| S02 | AI Leader of the Year | ✅ Honoring a CEO, executive, or senior leader driving AI strategy and impact within their worldwide organization. |
| S03 | AI Rising Star | ✅ Honoring early-career professionals making notable contributions to AI projects or research globally. |
| S04 | Women in AI Leadership | ✅ Spotlighting women executives, researchers, and entrepreneurs shaping the AI landscape worldwide. |
| S05 | AI Company of the Year | ✅ For worldwide organizations demonstrating outstanding achievements in applying AI across operations, products, and services. |
| S06 | AI-Driven Culture of Innovation | ✅ Honoring worldwide companies fostering a strong culture of AI adoption, training, and ethical innovation. |
| S07 | AI-Driven Startup of the Year | ✅ Recognizing worldwide startups whose growth and innovation are fueled by AI. |
| S08 | Best Use of AI in Business Transformation | ✅ Recognizes worldwide organizations that have achieved outstanding business transformation through the strategic application of AI. |
| S09 | AI Breakthrough of the Year | ✅ Honoring a single AI innovation, invention, or project that stands out as globally transformative. |
| S10 | AI Implementation of the Year | ✅ Recognizes worldwide organizations that have successfully integrated AI into operations, products, or services with measurable impact. |
| S11 | AI & Sustainability Achievement Award | ✅ Spotlights AI-driven initiatives worldwide that reduce environmental impact or advance sustainability goals. |
| S12 | Ethical AI Initiative of the Year | ✅ Honors responsible and transparent approaches to AI development and deployment by worldwide organizations. |
| S13 | AI for Customer Experience | ✅ Recognizes the use of AI in customer support, personalization, or engagement by worldwide organizations. |
| S14 | AI in Healthcare Achievement | ✅ Honors impactful AI applications in medical technology, patient care, or health outcomes globally. |
| S15 | AI in Human Resources & Talent Management | ✅ Recognizes AI-driven solutions for hiring, learning, employee engagement, or workforce planning used by worldwide organizations. |
| S16 | AI in Marketing & Sales | ✅ Spotlights AI-powered tools for demand generation, analytics, personalization, or sales enablement used by worldwide organizations. |
| S17 | AI for Social Good | ✅ Spotlights initiatives using AI to address societal challenges — education, accessibility, disaster relief, and community impact — globally. |
| S18 | AI-Generated or AI-Enhanced Video | ✅ Recognizes outstanding video content that has been created or significantly enhanced using artificial intelligence tools and techniques. |
| S19 | Best AI-Powered Product or Service | ✅ Recognizes the best product or service whose core functionality is powered by AI, evaluated on innovation, adoption, and measurable customer impact. |

---

## GROUP 7: App Categories
**Group desc:** Recognizing excellence in mobile websites and apps worldwide.
**Entry:** Essay 200 words + 3-minute demonstration video
**Nominee type:** product (mobile app or mobile website)

> ⚠️ **ALL P55–P89 are BARE LABELS with zero description on the IBA website.**
> Use ABA App descriptions (F55–F84) as reference but adjust scope to "worldwide."

| Code | Name | Status | Reference |
|------|------|--------|-----------|
| P55 | Arts & Culture | ⚠️ ENRICH | ABA F55: Apps built to promote or enhance the experience of art, an event, or a cultural institution, such as museums, parks, zoos, gardens, aquariums, theaters, arenas, and so on. |
| P56 | Business/Government | ⚠️ ENRICH | ABA F56: Apps built for general business- or government-related purposes not addressed by other categories. |
| P57 | Education & Reference | ⚠️ ENRICH | ABA F57: Apps for educational content or reference material including science, environment, geography, dictionaries, encyclopedias. |
| P58 | Entertainment | ⚠️ ENRICH | ABA F58: Apps for entertainment and sports content — games, news, gossip, humor, music, fantasy leagues, reviews. |
| P59 | Events | ⚠️ ENRICH | ABA F59: Apps offering registration, guidance, navigation, networking to attendees, exhibitors, or sponsors of events. |
| P60 | Experimental & Innovation | ⚠️ ENRICH | ABA F60: Groundbreaking technology or unconventional applications; may include pre-production technologies. |
| P61 | Family & Kids | ⚠️ ENRICH | ABA F61: Apps featuring interactive content, games, education, or tools specifically for children, families, and parenting. |
| P62 | Fashion & Beauty | ⚠️ ENRICH | ABA F62: Apps providing beauty- or fashion-related services such as simulations, modeling, and recommendations. |
| P63 | Financial Services / Banking | ⚠️ ENRICH | ABA F63: Apps providing financial services and/or information — stock trading, financial news, mortgage information, credit cards. |
| P64 | Fitness & Recreation | ⚠️ ENRICH | Apps focused on personal fitness, sports, outdoor recreation, and physical activity tracking. |
| P65 | Food & Drink | ⚠️ ENRICH | ABA F64: Apps offering services, advice, recommendations, and/or utilities for food and beverage preparation, storage, or consumption. |
| P66 | Games | ⚠️ ENRICH | ABA F65: Apps built to provide a gaming experience to users. |
| P67 | Guides/Ratings/Reviews | ⚠️ ENRICH | ABA F66: Apps offering users the ability to create or access ratings and reviews of products, services, or experiences. |
| P68 | Health & Wellness | ⚠️ ENRICH | ABA F67: Apps promoting personal health, well-being, and fitness including medical services, physical education platforms, fitness videos. |
| P69 | HR & Employee Experience | ⚠️ ENRICH | ABA F68: Apps helping organizations customize experience for talent and employees — recruitment, talent management, benefits, payroll. |
| P70 | Integrated Mobile Experience | ⚠️ ENRICH | Apps delivering a seamlessly integrated experience across multiple mobile touchpoints or channels. |
| P71 | Learning & Education | ⚠️ ENRICH | ABA F69: Apps designed for the education industry — classroom management, student information, language learning. |
| P72 | Lifestyle | ⚠️ ENRICH | Apps focused on lifestyle topics — home, relationships, self-improvement, personal interests, daily habits. |
| P73 | Magazine / Editorial | ⚠️ ENRICH | Apps delivering magazine-style or editorial content to users in a digital format. |
| P74 | Marketing | ⚠️ ENRICH | ABA F70: Apps helping organizations automate, streamline and measure marketing efforts — CMS, CRM, social media management. |
| P75 | Messaging | ⚠️ ENRICH | ABA F71: Apps providing messaging services to users. |
| P76 | Music | ⚠️ ENRICH | ABA F72: Apps providing or related to music: streaming, reviews, ratings, discovery, etc. |
| P77 | News | ⚠️ ENRICH | ABA F73: Apps built to provide news and information services to users. |
| P78 | Productivity | ⚠️ ENRICH | ABA F74: Apps promoting productivity — schedules, workflows, list makers and everything in between. |
| P79 | Professional Services | ⚠️ ENRICH | ABA F75: Apps by professional service firms providing resources, account access, research, and other tools to customers. |
| P80 | Public Service & Activism | ⚠️ ENRICH | ABA F76: Apps providing access to government services; apps encouraging civic discourse or activity. |
| P81 | Real Estate | ⚠️ ENRICH | ABA F77: Apps providing real estate-related information and/or services. |
| P82 | School / University | ⚠️ ENRICH | ABA F78: Apps built by or for schools to be used by students, parents, faculty, alumni, boosters, and supporters. |
| P83 | Shopping | ⚠️ ENRICH | ABA F79: Apps providing consumers online commerce, marketplaces and retail sales. |
| P84 | Social | ⚠️ ENRICH | ABA F80: Social media apps providing engagement for their users. |
| P85 | Sports | ⚠️ ENRICH | Apps focused on sports — scores, statistics, team management, sports news, fan engagement, fantasy sports. |
| P86 | Training | ⚠️ ENRICH | ABA F82: Apps for training, remediation, performance support, certification, testing, or professional training-related services. |
| P87 | Travel | ⚠️ ENRICH | ABA F83: Apps providing travel and tourism services — ticket purchasing, hotel rooms, rental cars, vacation packages, travel guides. |
| P88 | Utilities & Services | ⚠️ ENRICH | ABA F84: Apps allowing real-world activities on the go — transportation, photo editing, job finding, housing, dating. |
| P89 | Best Mobile App for Social Good | ✅ Recognizes mobile applications worldwide focused on addressing societal issues such as healthcare, education, or community support, and making a measurable impact. |

---

## GROUP 8: Creative Categories
**Group desc:** Recognizing achievement in all creative management, copywriting, art direction, editorial, AV production, animation, illustration, photography functions worldwide.
**Entry:** Essay 4900 chars + bullet list of 10 accomplishments
**Nominee type:** agency | team | department | individual | project

Same K01–K08 codes and descriptions as ABA Creative categories but worldwide scope. All ✅.

| Code | Name | Description |
|------|------|-------------|
| K01 | Advertising or Design Agency of the Year | ✅ Recognizes the best worldwide advertising, marketing, or design agency based on overall achievement and results since January 1 2024. |
| K02 | Breakthrough Creative Use of Technology | ✅ Recognizes innovative applications of technology in creative projects — AI-driven designs, AR/VR experiences, or interactive campaigns — by worldwide organizations. |
| K03 | Creative Department of the Year | ✅ Recognizes everyone who works in creative functions in a worldwide organization. |
| K04 | Creative Executive of the Year | ✅ Recognizes the achievements of individual creative executives at worldwide organizations. |
| K05 | Creative Individual of the Year | ✅ Recognizes the achievements of non-executive individuals in creative roles at worldwide organizations. |
| K06 | Creative Team of the Year | ✅ Recognizes a subset of a worldwide creative organization — may be multidisciplinary, cross-organizational, permanent or temporary. |
| K07 | Excellence in Collaborative Creativity | ✅ Celebrates partnerships between multiple organizations or disciplines that result in exceptional creative impact worldwide. |
| K08 | Most Innovative Creative Project | ✅ Honors singular creative projects worldwide that demonstrate originality, innovation, and exceptional impact. |

---

## GROUP 9: Customer Service Categories
**Group desc:** All customer service functions worldwide.
**Entry:** Essay 4900 chars + 750 chars bullet list + optional files
**Nominee type:** team | department | individual | program

Same J01–J09 codes and descriptions as ABA Customer Service but worldwide scope. All ✅.

| Code | Name | Description |
|------|------|-------------|
| J01 | Best Crisis Response in Customer Service | ✅ For worldwide teams or individuals who responded effectively to a customer service crisis, showing agility, empathy, and problem-solving skills under pressure. |
| J02 | Best Use of Technology in Customer Service | ✅ For worldwide service teams that successfully adopted technology (AI, CRM, chatbots) to enhance speed, personalization, or satisfaction. |
| J03 | Customer Retention Program of the Year | ✅ For worldwide service programs aimed at improving retention, loyalty, or reducing churn through outstanding support. |
| J04 | Customer Service Department of the Year | ✅ For worldwide organizations wishing to nominate their entire customer service organization. |
| J05 | Customer Service Executive of the Year | ✅ Recognizes individual executives worldwide who have demonstrated outstanding leadership in customer service. |
| J06 | Customer Service Innovation of the Year | ✅ Recognizes implementation of new systems, tools, or processes that transformed the customer service experience at worldwide organizations. |
| J07 | Customer Service Team of the Year | ✅ For worldwide organizations wishing to nominate a subset of their customer service organization. |
| J08 | Digital Customer Service Team of the Year | ✅ Recognizes a digital-focused subset of a worldwide customer service organization. |
| J09 | Multilingual Customer Support Program | ✅ Recognizes worldwide efforts in delivering consistent, high-quality service across multiple languages and cultures. |

---

## GROUP 10: Entrepreneur Categories
**Group desc:** Recognizing achievements of individual entrepreneurs and founding teams worldwide since the beginning of 2024.
**Entry:** Essay 4900 chars + bullet list of 10 accomplishments
**Nominee type:** individual entrepreneur | founding team

> ⚠️ D01–D35 are industry labels — NO descriptions. All need LLM enrichment.

| Code | Name | Description |
|------|------|-------------|
| D01 | Best Entrepreneur – Advertising, Marketing, & Public Relations | ⚠️ ENRICH |
| D02 | Best Entrepreneur – Aerospace & Defense | ⚠️ ENRICH |
| D03 | Best Entrepreneur – Apparel, Beauty & Fashion | ⚠️ ENRICH |
| D04 | Best Entrepreneur – Automotive & Transport Equipment | ⚠️ ENRICH |
| D05 | Best Entrepreneur – Banking | ⚠️ ENRICH |
| D06 | Best Entrepreneur – Business & Professional Services | ⚠️ ENRICH |
| D07 | Best Entrepreneur – Chemicals | ⚠️ ENRICH |
| D08 | Best Entrepreneur – Computer Hardware | ⚠️ ENRICH |
| D09a | Best Entrepreneur – Computer Software (≤100 employees) | ⚠️ ENRICH |
| D09b | Best Entrepreneur – Computer Software (100+ employees) | ⚠️ ENRICH |
| D10 | Best Entrepreneur – Computer Services | ⚠️ ENRICH |
| D11 | Best Entrepreneur – Conglomerates | ⚠️ ENRICH |
| D12 | Best Entrepreneur – Consumer Products (Durables) | ⚠️ ENRICH |
| D13 | Best Entrepreneur – Consumer Products (Non-Durables) | ⚠️ ENRICH |
| D14 | Best Entrepreneur – Consumer Services | ⚠️ ENRICH |
| D15 | Best Entrepreneur – Diversified Services | ⚠️ ENRICH |
| D16 | Best Entrepreneur – Electronics | ⚠️ ENRICH |
| D17 | Best Entrepreneur – Energy | ⚠️ ENRICH |
| D18 | Best Entrepreneur – Financial Services | ⚠️ ENRICH |
| D19 | Best Entrepreneur – Food & Beverage | ⚠️ ENRICH |
| D20 | Best Entrepreneur – Health Products & Services | ⚠️ ENRICH |
| D21 | Best Entrepreneur – Hospitality & Leisure | ⚠️ ENRICH |
| D22 | Best Entrepreneur – Insurance | ⚠️ ENRICH |
| D23 | Best Entrepreneur – Internet/New Media | ⚠️ ENRICH |
| D24 | Best Entrepreneur – Legal | ⚠️ ENRICH |
| D25 | Best Entrepreneur – Manufacturing | ⚠️ ENRICH |
| D26 | Best Entrepreneur – Materials & Construction | ⚠️ ENRICH |
| D27 | Best Entrepreneur – Media & Entertainment | ⚠️ ENRICH |
| D28 | Best Entrepreneur – Metals & Mining | ⚠️ ENRICH |
| D29 | Best Entrepreneur – Non-Profit Organizations | ⚠️ ENRICH |
| D30 | Best Entrepreneur – Pharmaceuticals | ⚠️ ENRICH |
| D31 | Best Entrepreneur – Real Estate | ⚠️ ENRICH |
| D32 | Best Entrepreneur – Retail | ⚠️ ENRICH |
| D33 | Best Entrepreneur – Telecommunications | ⚠️ ENRICH |
| D34 | Best Entrepreneur – Transportation | ⚠️ ENRICH |
| D35 | Best Entrepreneur – Utilities | ⚠️ ENRICH |
| D36 | Best Female Entrepreneur | ✅ Recognizes outstanding achievements of women entrepreneurs worldwide since the beginning of 2024. |
| D37 | Best Social Entrepreneur | ✅ Recognizes worldwide entrepreneurs whose business model creates measurable social or environmental impact alongside financial returns. |
| D38 | Best Sustainability Entrepreneur | ✅ Recognizes worldwide entrepreneurs building businesses centered on environmental sustainability, clean energy, or circular economy principles. |
| D39 | Best Young Entrepreneur – Under 35 | ✅ Recognizes outstanding entrepreneurial achievements of individuals under the age of 35 worldwide since the beginning of 2024. |
| D40 | Founding Team of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizes the collective achievements of a worldwide organization's founding team since the beginning of 2024. |

---

## GROUP 11: Event Categories
Same G-code structure and descriptions as ABA Event categories but worldwide scope. All ✅.
Entry: Essay 2000 chars + supporting files. Nominee type: event.
Use ABA Event descriptions substituting "worldwide" for "USA."

---

## GROUP 12: Human Resources Categories
Same L01–L08 codes and descriptions as ABA HR categories but worldwide scope. All ✅.

---

## GROUP 13: Individual Categories (UNIQUE TO IBA)
**Group desc:** Recognizing individuals worldwide who have demonstrated exceptional achievement and forward-thinking qualities within their organization or industry since the beginning of 2024.
**Entry:** Essay 4900 chars + 1150 chars bullet list of 10 accomplishments
**Nominee type:** individual professional

| Code | Name | Description |
|------|------|-------------|
| X01 | AI & Data Leader of the Year (New 2026) | ✅ Recognizes individuals who have led impactful AI- and data-driven initiatives that improved decision-making, efficiency, customer experience, innovation, or overall organizational performance. |
| X02 | Business Development Leader of the Year (New 2026) | ✅ Recognizes professionals who have demonstrated exceptional success in expanding market presence, forging strategic partnerships, or driving revenue growth. |
| X03 | Creative Person of the Year | ✅ Recognizes standout creative professionals in fields such as advertising, design, photography, illustration, filmmaking, and other creative disciplines worldwide. |
| X04 | Crisis Leader of the Year | ✅ Recognizes individuals who guided their organization through significant challenges with resilience, adaptability, and effective leadership since the beginning of 2024. |
| X05 | Customer Service Professional of the Year | ✅ Recognizes outstanding performance, leadership, and innovation in delivering exceptional customer service and improving customer experience. |
| X06 | Cybersecurity Leader of the Year (New 2026) | ✅ Recognizes individuals who have strengthened cybersecurity posture, reduced risk, and protected organizational assets through innovative security strategies. |
| X07 | Digital Transformation Leader of the Year | ✅ Recognizes leaders who have championed successful digital transformation efforts that enhanced operational efficiency, customer experience, or organizational innovation since the beginning of 2024. |
| X08 | Ethical Leadership of the Year | ✅ Recognizes individuals who exemplify integrity, transparency, and responsible decision-making while promoting ethical culture and trust since the beginning of 2024. |
| X09 | Finance Professional of the Year | ✅ Recognizes excellence in financial strategy, planning, analysis, or leadership that improved organizational performance or accountability. |
| X10 | Human Resources Professional of the Year | ✅ Recognizes HR leaders who have advanced talent development, employee engagement, workforce planning, or people-centric initiatives. |
| X11 | Mentor of the Year | ✅ Recognizes individuals who have made significant impact through mentorship, coaching, and support that fosters personal or professional growth in others. |
| X12 | DEI Leader of the Year (New 2026) | ✅ Recognizes leaders who have achieved meaningful progress or implemented innovative initiatives that advance diversity, equity, and inclusion inside or outside their organization. |
| X13 | Rising Star of the Year | ✅ Recognizes early-career professionals (less than five years of experience) who have demonstrated exceptional potential, innovation, and leadership since the beginning of 2024. |
| X14 | Sales Leader of the Year (New 2026) | ✅ Recognizes exceptional achievement in driving sales performance, leading high-performing sales teams, or delivering revenue-focused innovation. |
| X15 | Social Impact Leader of the Year | ✅ Recognizes individuals who delivered measurable positive impact through social responsibility, community engagement, or stakeholder-focused initiatives since the beginning of 2024. |
| X16 | Sustainability Advocate of the Year | ✅ Recognizes individuals who have driven meaningful sustainability initiatives that support environmental stewardship, responsible business practices, or social equity. |

---

## GROUP 14: New Product & Product Management Categories
**Group desc:** Recognizing achievements in new products and services worldwide since the beginning of 2024.
**Entry:** Essay with features/benefits + market performance + evidence
**Nominee type:** product | service | team | individual

| Code | Name | Description |
|------|------|-------------|
| J01 | Best Accessibility-Focused Product or Service (New 2026) | ✅ Celebrates innovative products that are accessible to individuals with disabilities or impairments, ensuring inclusive design and usability. |
| J02 | Best AI-Enabled Product | ✅ Recognizes the development of cutting-edge products worldwide that utilize AI. |
| J03 | Best Product for Social Impact | ✅ Honors worldwide products addressing critical societal needs, such as healthcare or education solutions. |
| J04 | Business-to-Business Products | ✅ Recognizes tangible B2B products from worldwide organizations. |
| J05 | Business-to-Business Services | ✅ Recognizes B2B service offerings from worldwide organizations. |
| J06 | Computer Hardware | ✅ Recognizes computer hardware products from worldwide organizations. |
| J07 | Consumer Electronics | ✅ Recognizes all types of consumer electronics products from worldwide organizations. |
| J08 | Consumer Products (subs: a Durables / b Food & Beverage / c Household / d Other) | ✅ Recognizes all types of consumer products except those fitting in other categories. |
| J09 | Consumer Services | ✅ Recognizes service offerings for consumers from worldwide organizations. |
| J10 | Excellence in User-Centered Product Design | ✅ Celebrates products worldwide that prioritize user needs through design, functionality, and accessibility. |
| J11 | Health & Pharmaceuticals – Product | ✅ Recognizes tangible health and pharmaceutical products from worldwide organizations. |
| J12 | Health & Pharmaceuticals – Service | ✅ Recognizes health and pharmaceutical-related services from worldwide organizations. |
| J13 | Industrial Products & Services | ✅ Recognizes industrial products and services from worldwide organizations, except software solutions. |
| J14 | Media & Entertainment – Product | ✅ Recognizes tangible media or entertainment products from worldwide organizations. |
| J15 | Media & Entertainment – Service | ✅ Recognizes media or entertainment services from worldwide organizations. |
| J16 | Most Innovative Green Product | ✅ Recognizes the most innovative products designed with sustainability in mind — reducing environmental impact, carbon footprint, or resource consumption. |
| J17 | Telecommunications – Product or Service | ✅ Recognizes telecommunications-related products or services from worldwide organizations. |
| J18 | Transportation | ✅ Including e-mobility products and services from worldwide organizations. |
| J20–J91 | Technology Solution categories | ✅ Same descriptions as ABA P24–P91 but worldwide scope. Covers API Management, AI/ML, Big Data, Blockchain, Cloud, Cybersecurity, ERP, FinTech, Healthcare Tech, etc. |
| J100 | Product Development/Management Department or Team of the Year | ✅ Recognizes the best worldwide product development or management department or team. |
| J101 | Product Development/Management Professional of the Year | ✅ Recognizes non-executive product development or management professionals worldwide. No entry fee. |
| J103 | Product Development/Management Executive of the Year | ✅ Recognizes the achievements of product development and management executives at the VP level or above worldwide. |

---

## GROUP 15: Podcast Categories
Same Z01–Z48 codes and descriptions as ABA Podcast categories but worldwide scope. All ✅.

---

## GROUP 16: Public Sector & Government Innovation Categories (NEW for 2026, UNIQUE TO IBA)
**Group desc:** Recognizing innovation by government ministries, public agencies, and municipalities worldwide.
**Entry:** Essay 4900 chars + supporting materials
**Nominee type:** government agency | municipality | public institution

| Code | Name | Description |
|------|------|-------------|
| U01 | Cultural or Economic Exchange Initiative of the Year | ✅ Recognizes cross-border cultural or economic initiatives led by public sector entities since January 1 2024, focusing on mutual understanding, trade, investment, tourism, or creative industries between nations or regions. |
| U02 | Cross-Sector Public Innovation Partnership of the Year | ✅ Recognizes collaborative initiatives led by public sector bodies working with private sector, non-profit, or academic partners that deliver measurable public benefit since January 1 2024. |
| U03 | Public Administration & Governance Innovation of the Year | ✅ Honors reforms in public administration that improved transparency, efficiency, accountability, or responsiveness since January 1 2024, including new regulatory approaches and process redesign. |
| U04 | Public Sector Talent & Workforce Transformation Initiative | ✅ Recognizes programs launched or expanded since January 1 2024 that modernize talent attraction, development, engagement, and retention in public institutions, including leadership models and upskilling initiatives. |

---

## GROUP 17: Publication Categories
Same F01–F11 codes and descriptions as ABA Publication categories but worldwide scope. All ✅.

---

## GROUP 18: Social Media Categories
Same V01–V15 codes and descriptions as ABA Social Media categories but worldwide scope. All ✅.

---

## GROUP 19: Support Categories
Same L01–L02 codes and descriptions as ABA Support categories but worldwide scope. All ✅.

---

## GROUP 20: Sustainability Categories
Same U01–U16 codes and descriptions as ABA Sustainability categories but worldwide scope. All ✅.

---

## GROUP 21: Technology Categories
Same N01–N06 codes and descriptions as ABA Technology categories but worldwide scope. All ✅.

---

## GROUP 22: Thought Leadership Categories
Same W01–W03 codes and descriptions as ABA Thought Leadership categories but worldwide scope. All ✅.

---

## GROUP 23: Video Categories
Same H01–H48 codes and descriptions as ABA Video categories but worldwide scope. All ✅.

---

## GROUP 24: Web Achievement Categories
**Industry categories (T10–T43):** ⚠️ All industry labels → ENRICH with worldwide scope.
**Specialty categories (T44–T60):** ✅ Same descriptions as ABA Web Specialty categories. Use ABA T44–T60 descriptions substituting "worldwide" for "USA."

---

## IBA ENRICH SUMMARY

| Group | Entries needing LLM enrichment |
|-------|-------------------------------|
| Company of the Year B01–B45 | ~135 (45 × 3 sizes) |
| Executive of the Year A01–A35 | 35 |
| Entrepreneur D01–D35 | 36 |
| App P55–P88 | 34 |
| Web Achievement Industry T10–T43 | 34 |
| **Total** | **~274** |
