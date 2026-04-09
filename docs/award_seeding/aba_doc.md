# Stevie Awards — American Business Awards (ABA)
# Complete Category Reference for RAG Embedding
> 2026 Edition | Program 1 of 9 | Geography: USA only
> Every category code, name, and scraped description is written out below.
> ✅ = scraped directly from stevieawards.com — INSERT as-is into `stevie_categories.description`
> ⚠️ = null/label only on website — call LLM enrichment before inserting

---

# HOW TO USE THIS DOCUMENT

## Step 1 — Populate `stevie_categories.description`
- Every row marked ✅ → copy the description text verbatim into the DB
- Every row marked ⚠️ → run the LLM enrichment prompt below first, then insert

## Step 2 — Build `category_embeddings.embedding_text`
Use this template for EVERY row, regardless of ✅ or ⚠️:

```
AWARD PROGRAM: American Business Awards (ABA)
PROGRAM SCOPE: Open to all organizations operating in the USA — public, private, for-profit, non-profit, any size
ELIGIBILITY PERIOD: January 1 2024 – April 7 2026
CATEGORY GROUP: {group_name}
GROUP DESCRIPTION: {group_description}
CATEGORY CODE: {code}
CATEGORY NAME: {full_name}
SUBCATEGORY: {subcategory or N/A}
WHAT THIS RECOGNIZES: {description from this doc}
NOMINEE IS A: {individual | team | department | organization | product | campaign | event | app}
INDUSTRY / DOMAIN TAGS: {comma-separated}
SIZE / ORG TYPE CONSTRAINTS: {any restrictions}
WHAT JUDGES EVALUATE: {key signals}
ENTRY FORMAT: {what must be submitted}
KEYWORDS: {synonyms and related terms}
```

## Step 3 — Populate `contextual_prefix`
```
"{category_name}" ({category_code}) — {group_name} — American Business Awards (ABA).
Recognizes {nominee_type} achievements in the USA.
```

## LLM Enrichment Prompt (for ⚠️ rows only)
```
You are building a RAG system to recommend Stevie Award categories.
Write a WHAT THIS RECOGNIZES paragraph (120–160 words) for:

Program: American Business Awards (ABA)
Program scope: USA only, all org types and sizes
Category group: {group_name}
Group purpose: {group_description}
Category: {code}. {name}
Subcategory: {sub or N/A}
Existing description: "{raw — e.g. just an industry label}"

Cover: (1) exactly who/what qualifies, (2) concrete activities/outputs typical of
winners, (3) what differentiates this from adjacent categories,
(4) example achievement that would win.
Be specific. Do NOT start with "This category recognizes". Return ONLY the paragraph.
```

---

# ABA CATEGORY GROUPS — COMPLETE LISTING

---

## ══════════════════════════════
## GROUP 1: Achievement Categories
## Code prefix: B5x
## ══════════════════════════════

**Group description:** Recognizing singular achievements of entire organizations (for-profit or non-profit, large, medium, or small, public or private).
**Entry format:** 3 essays — organization history (200w), achievements (250w), significance (250w) + optional supporting files
**Nominee type:** organization

| Code | Name | Description |
|------|------|-------------|
| B55 | Achievement in Collaboration and Partnership | ✅ Successful nominations will describe one or more of your organization's collaborative initiatives since the beginning of 2024 that involved cross-sector, cross-functional, or external partnerships and delivered significant business, social, or operational value. Applicable achievements may include public-private partnerships, industry-academia collaboration, or strategic alliances that enhanced innovation, impact, or growth. |
| B56 | Achievement in Corporate Social Responsibility | ✅ Successful nominations will describe one or more of your organization's CSR initiatives since the beginning of 2024 that demonstrate your commitment to making a meaningful impact on the lives and wellbeing of the communities you serve and in which you operate. |
| B57 | Achievement in Customer Satisfaction | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably increased customer satisfaction over a prior period. |
| B58 | Achievement in Diversity & Inclusion | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 to make your organization more diverse and inclusive for customers, employees, partners, suppliers, and/or other stakeholders. |
| B59 | Achievement in ESG | ✅ Successful nominations will describe how the nominated organization has taken steps to lower pollution, CO2 output, and reduce waste, and to achieve a diverse and inclusive workforce. |
| B60 | Achievement in Finance | ✅ Successful nominations will describe one or more of your organization's finance-related achievements since the beginning of 2024. Applicable achievements may relate to start-up funding, investor relations, refinancing, financial management, budgeting, etc. |
| B61 | Achievement in Global Collaboration | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that demonstrated outstanding success in cross-border or international collaboration. Applicable achievements may include multinational joint ventures, global research partnerships, or international projects that drove innovation, market access, or cultural exchange. |
| B62 | Achievement in Growth | ✅ Successful nominations will describe one or more of your organization's growth-related achievements since the beginning of 2024. Applicable achievements may relate to corporate expansion, mergers and acquisitions, divestitures, etc. |
| B63 | Achievement in Health and Safety Excellence | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that enhanced health, safety, or well-being in the workplace or community. Applicable achievements may include improvements in safety protocols, employee wellness programs, mental health initiatives, or public health campaigns. |
| B64 | Achievement in Human Resources | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably improved the organization's relationship with its employees over a prior period. |
| B65 | Achievement in International Expansion | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 to grow its business or operations in nations other than the USA. |
| B66 | Achievement in Product Innovation | ✅ Successful nominations will describe one or more product-related achievements since the beginning of 2024. Applicable achievements may relate to innovation in product design or redesign, manufacturing processes or operations, branding, etc. |
| B67 | Achievement in Organization Recovery | ✅ This is the "business turnaround" category. Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably improved the organization's financial or operational performance over a prior period. |
| B68 | Achievement in Sales or Revenue Generation | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have demonstrably increased sales or other revenue over a prior period. |
| B69 | Achievement in Science or Technology | ✅ Successful nominations will describe one or more of your organization's initiatives since the beginning of 2024 that have initiated or promoted one or more advances in scientific or technological understanding or practice. |
| B70 | Achievement in Technology Innovation | ✅ Successful nominations will describe the genesis, development, and practical implementation of new, breakthrough technologies. |

---

## ══════════════════════════════
## GROUP 2: Company / Organization Categories
## Code prefix: B0x–B5x
## ══════════════════════════════

**Group description:** Recognizing the achievements of entire organizations (for-profit or non-profit, large, medium, or small, public or private).
**Entry format:** 3 essays — purpose/history (200w), achievements (250w), significance (250w) + optional files
**Nominee type:** organization
**Size breakouts for B01–B45:** Small (≤50 employees AND ≤$10M revenue) | Medium (≤250 employees AND ≤$50M revenue) | Large (>250 employees AND >$50M revenue)
> ⚠️ B01–B45 are pure industry labels — NO description on the website. Each spawns 3 size sub-entries (Small/Medium/Large). Total ~135 entries needing enrichment.

| Code | Name | Description |
|------|------|-------------|
| B01 | Company of the Year – Advertising, Marketing, & Public Relations | ⚠️ ENRICH |
| B02 | Company of the Year – Aerospace & Defense | ⚠️ ENRICH |
| B03 | Company of the Year – Agriculture & Agritech | ⚠️ ENRICH |
| B04 | Company of the Year – Apparel, Beauty & Fashion | ⚠️ ENRICH |
| B05 | Company of the Year – Automotive & Transport Equipment | ⚠️ ENRICH |
| B06 | Company of the Year – Banking | ⚠️ ENRICH |
| B07 | Company of the Year – Biotechnology | ⚠️ ENRICH |
| B08 | Company of the Year – Business & Professional Services | ⚠️ ENRICH |
| B09 | Company of the Year – Chemicals | ⚠️ ENRICH |
| B10 | Company of the Year – Computer Hardware | ⚠️ ENRICH |
| B11 | Company of the Year – Computer Software | ⚠️ ENRICH |
| B12 | Company of the Year – Computer Services | ⚠️ ENRICH |
| B13 | Company of the Year – Conglomerates | ⚠️ ENRICH |
| B14 | Company of the Year – Consumer Products (Durables) | ⚠️ ENRICH |
| B15 | Company of the Year – Consumer Products (Non-Durables) | ⚠️ ENRICH |
| B16 | Company of the Year – Consumer Services | ⚠️ ENRICH |
| B17 | Company of the Year – Cybersecurity | ⚠️ ENRICH |
| B18 | Company of the Year – Diversified Services | ⚠️ ENRICH |
| B19 | Company of the Year – E-commerce | ⚠️ ENRICH |
| B20 | Company of the Year – Education & EdTech | ⚠️ ENRICH |
| B21 | Company of the Year – Electronics | ⚠️ ENRICH |
| B22 | Company of the Year – Energy | ⚠️ ENRICH |
| B23 | Company of the Year – Environmental Services / CleanTech | ⚠️ ENRICH |
| B24 | Company of the Year – Financial Services | ⚠️ ENRICH |
| B25 | Company of the Year – Food & Beverage | ⚠️ ENRICH |
| B26 | Company of the Year – Gaming & Esports | ⚠️ ENRICH |
| B27 | Company of the Year – Health Providers | ⚠️ ENRICH |
| B28 | Company of the Year – Health Products & Services | ⚠️ ENRICH |
| B29 | Company of the Year – Hospitality & Leisure | ⚠️ ENRICH |
| B30 | Company of the Year – Insurance | ⚠️ ENRICH |
| B31 | Company of the Year – Internet/New Media | ⚠️ ENRICH |
| B32 | Company of the Year – Legal | ⚠️ ENRICH |
| B33 | Company of the Year – Logistics & Supply Chain | ⚠️ ENRICH |
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
| B45 | Company of the Year – Venture Capital & Private Equity | ⚠️ ENRICH |
| B46 | Startup of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ For companies that began operations since January 1 2023. Nominations should describe the company's achievements since the beginning of 2024. No entry fee. |
| B47 | Tech Startup of the Year (subs: a Hardware/Peripherals / b Services / c Software) | ✅ For tech companies that began operations since January 1 2023. Nominations should describe the company's achievements since the beginning of 2024. No entry fee. |
| B48 | Most Innovative Company of the Year (subs: a ≤100 emp / b ≤2500 emp / c >2500 emp) | ✅ Recognizing overall achievement in product and/or marketing, sales, manufacturing, management, etc. innovation. |
| B49 | Most Innovative Tech Company of the Year (subs: a ≤100 emp / b ≤2500 emp / c >2500 emp) | ✅ Recognizing overall achievement in product and/or marketing, sales, manufacturing, management, etc. innovation in technology. |
| B50 | Innovation of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizing singular innovations in business model, product and/or marketing, sales, manufacturing, management, etc., by an organization or individual. |
| B51 | Technical Innovation of the Year (subs: a ≤100 emp / b ≤1000 emp / c 1000+ emp) | ✅ Recognizing singular innovations in technology, new products, etc., by an organization or individual. |
| B52 | Corporate Social Responsibility Program of the Year (subs: a ≤100 emp / b ≤2500 emp / c 2500+ emp) | ✅ Recognizing organizations' contributions to society. |
| B53 | Fastest-Growing Company of the Year (subs: a ≤100 emp / b ≤2500 emp / c 2500+ emp) | ✅ Recognizing outstanding revenue growth since the beginning of 2024 over 2022. |
| B54 | Fastest-Growing Tech Company of the Year (subs: a ≤100 emp / b ≤2500 emp / c 2500+ emp) | ✅ Recognizing outstanding revenue growth in tech since the beginning of 2024 over 2022. |
| B55 | Minority-Owned Business of the Year | ✅ Recognizes achievements since January 1 2024 of businesses in the USA that are majority owned by members of an ethnic minority. |
| B56 | Veteran-Owned Business of the Year | ✅ Recognizes achievements since January 1 2024 of businesses in the USA that are owned by veterans of the US Armed Forces. |
| B57 | Student-Run Business of the Year | ✅ Recognizes achievements since January 1 2024 of businesses run by current undergraduate university students in the USA. This is for operating businesses selling products/services to actual customers, not business plans. No entry fee. |
| B58 | Energy Industry Innovation of the Year | ✅ Recognizes singular innovations in energy-related technology, production, conservation, storage or delivery, by an organization or individual in the USA, since January 1 2024. No entry fee. |

---

## ══════════════════════════════
## GROUP 3: Achievement in Management Categories
## Code prefix: A0x–A4x
## ══════════════════════════════

**Group description:** Recognizing the achievements of entire management teams, groups of managers, and individual executives.
**Entry format:** Essay 2500 chars + bullet list of 10 accomplishments + optional files
**Nominee type:** individual executive | management team | manager group
> ⚠️ A01–A35 are pure industry labels — NO description on the website. ~37 entries needing enrichment.

| Code | Name | Description |
|------|------|-------------|
| A01 | Achievement in Management – Advertising, Marketing, & Public Relations | ⚠️ ENRICH |
| A02 | Achievement in Management – Aerospace & Defense | ⚠️ ENRICH |
| A03 | Achievement in Management – Apparel, Beauty & Fashion | ⚠️ ENRICH |
| A04 | Achievement in Management – Automotive & Transport Equipment | ⚠️ ENRICH |
| A05 | Achievement in Management – Banking | ⚠️ ENRICH |
| A06 | Achievement in Management – Business & Professional Services | ⚠️ ENRICH |
| A07 | Achievement in Management – Chemicals | ⚠️ ENRICH |
| A08 | Achievement in Management – Computer Hardware | ⚠️ ENRICH |
| A09a | Achievement in Management – Computer Software (≤100 employees) | ⚠️ ENRICH |
| A09b | Achievement in Management – Computer Software (100+ employees) | ⚠️ ENRICH |
| A10 | Achievement in Management – Computer Services | ⚠️ ENRICH |
| A11 | Achievement in Management – Conglomerates | ⚠️ ENRICH |
| A12 | Achievement in Management – Consumer Products (Durables) | ⚠️ ENRICH |
| A13 | Achievement in Management – Consumer Products (Non-Durables) | ⚠️ ENRICH |
| A14 | Achievement in Management – Consumer Services | ⚠️ ENRICH |
| A15 | Achievement in Management – Diversified Services | ⚠️ ENRICH |
| A16 | Achievement in Management – Electronics | ⚠️ ENRICH |
| A17 | Achievement in Management – Energy | ⚠️ ENRICH |
| A18 | Achievement in Management – Financial Services | ⚠️ ENRICH |
| A19 | Achievement in Management – Food & Beverage | ⚠️ ENRICH |
| A20 | Achievement in Management – Health Products & Services | ⚠️ ENRICH |
| A21 | Achievement in Management – Hospitality & Leisure | ⚠️ ENRICH |
| A22 | Achievement in Management – Insurance | ⚠️ ENRICH |
| A23 | Achievement in Management – Internet/New Media | ⚠️ ENRICH |
| A24 | Achievement in Management – Legal | ⚠️ ENRICH |
| A25 | Achievement in Management – Manufacturing | ⚠️ ENRICH |
| A26 | Achievement in Management – Materials & Construction | ⚠️ ENRICH |
| A27 | Achievement in Management – Media & Entertainment | ⚠️ ENRICH |
| A28 | Achievement in Management – Metals & Mining | ⚠️ ENRICH |
| A29 | Achievement in Management – Non-Profit or Government Organizations | ⚠️ ENRICH |
| A30 | Achievement in Management – Pharmaceuticals | ⚠️ ENRICH |
| A31 | Achievement in Management – Real Estate | ⚠️ ENRICH |
| A32 | Achievement in Management – Retail | ⚠️ ENRICH |
| A33 | Achievement in Management – Telecommunications | ⚠️ ENRICH |
| A34 | Achievement in Management – Transportation | ⚠️ ENRICH |
| A35 | Achievement in Management – Utilities | ⚠️ ENRICH |
| A36 | Best Innovation in Management Practices | ✅ Honors groundbreaking management strategies that significantly improved operations, engagement, or efficiency. |
| A37 | Emerging Leader of the Year | ✅ Highlights an executive under 40 (or new to leadership) demonstrating strong leadership potential and tangible business impact. |
| A38 | Maverick of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizing the individual executive or manager who has affected the most positive change on their company and/or industry since the beginning of 2024. |
| A39 | Tech Innovator of the Year (subs: a Hardware/Peripherals / b Services / c Software / d Other) | ✅ Recognizing the individual executive or manager who has contributed most to innovation within their organization and/or industry in the USA since the beginning of 2024. |
| A40 | Woman of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizing the achievements of women in the workplace since the beginning of 2024. |
| A41 | Lifetime Achievement Award (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizes the entire careers of professionals who have worked for at least 20 years. Nominations may describe the nominee's lifetime of achievement, not just since the beginning of 2024. |

---

## ══════════════════════════════
## GROUP 4: Achievement in Marketing Categories
## Code prefix: E0x–E6x
## ══════════════════════════════

**Group description:** Includes all marketing, advertising, packaging, distribution functions.
**Entry format:** 4 essays — launch date, genesis (250w), development (250w), results since Jan 2024 (250w) + optional files
**Nominee type:** campaign | department | team | individual

| Code | Name | Description |
|------|------|-------------|
| E01 | Achievement in Marketing – Agricultural/Industrial/Building | ✅ For all related products, materials, tools and services. |
| E02 | Achievement in Marketing – Automotive Aftermarket | ✅ Gasoline, motor oil, tires, batteries, paint, quick-lube, oil change, muffler, transmission, windshield wipers, enhancements, etc. |
| E03 | Achievement in Marketing – Automotive Vehicles | ✅ Cars, trucks, motorcycles, both brand and model advertising. |
| E04 | Achievement in Marketing – Beauty | ✅ Cosmetics, fragrances, hair products, nail products, beauty services such as salons, spas, etc. |
| E05 | Achievement in Marketing – Beverages (Alcohol) | ✅ Beer, champagne, liquor, wine, wine coolers, after-dinner drinks, etc. |
| E06 | Achievement in Marketing – Beverages (Non-Alcohol) | ✅ Diet and non-diet soda, coffee, tea, juices, milk, milk substitutes, bottled water, sparkling water, etc. |
| E07 | Achievement in Marketing – Business & Office Supplies | ✅ Business cards and professional printing, office equipment including printers, copiers, supplies, furniture, etc. |
| E08 | Achievement in Marketing – Corporate Reputation/Professional Services | ✅ Includes sponsorships, image & identity, and communications to promote corporations, not exclusively their products. Includes business/professional services such as consulting, accounting, legal, employment, etc. |
| E09 | Achievement in Marketing – Culture & The Arts | ✅ Plays, museums, music organizations, concert series, cultural festivals, theater festivals, etc. |
| E10 | Achievement in Marketing – Delivery Services | ✅ Couriers, package freight/shipping, food and drink delivery, grocery delivery, flower/gift delivery, overnight delivery, package tracking, international service, etc. |
| E11 | Achievement in Marketing – Education & Training | ✅ Includes all educational institutions and organizations, training programs, job/career sites, etc. |
| E12 | Achievement in Marketing – Electronics | ✅ TVs, radios, mobile devices, home entertainment, laptops, tablets, cameras, smart home devices, computer hardware, game consoles, drones, external or integrated VR/AR devices, sound systems, etc. Electronic devices may be targeted to consumers or business. |
| E13 | Achievement in Marketing – Energy/Nutrition Products & Services | ✅ Products and services aimed at the energy, sports, wellness lifestyle. Vitamins, energy bars, drinks, etc.; weight loss and fitness programs/camps, training camps and facilities, etc. |
| E14 | Achievement in Marketing – Entertainment & Sports | ✅ Includes all forms of entertainment including movies, TV shows, podcasts, books, music, comics, games, toys, entertainment apps, sporting events, sports teams, etc. |
| E15 | Achievement in Marketing – Fashion & Style | ✅ Brands of clothing, eyewear, footwear, hosiery, jewelry, accessories, etc. |
| E16 | Achievement in Marketing – Financial Cards | ✅ Credit, charge, debit, reward, phone and other cards. |
| E17 | Achievement in Marketing – Financial Products & Services | ✅ Communications promoting overall image and capabilities of a financial institution and specific products or services including home banking, loans, mortgage, mutual funds, traveler's checks, etc. |
| E18 | Achievement in Marketing – Food | ✅ Fresh, packaged, or frozen foods. |
| E19 | Achievement in Marketing – Gaming & E-Sports | ✅ All forms of e-sports and single and multi-player games, including virtual reality, arcade, console, mobile, online and computer games. |
| E20 | Achievement in Marketing – Government/Institutional/Recruitment | ✅ Municipal or state economic development, lotteries, utilities, civil, diplomatic or armed forces, parks, libraries, public services, etc. Includes political messages and recruitment efforts. |
| E21 | Achievement in Marketing – Health, Fitness & Wellness | ✅ Unregulated products/services focused on consumer health and/or promoting a healthy lifestyle. Includes digital health products, fitness trackers, health/fitness apps, exercise equipment, nutraceuticals, vitamins, energy bars and drinks, fitness studios, weight loss programs, training camps, etc. |
| E22 | Achievement in Marketing – Healthcare (Disease Education & Awareness) | ✅ Communications to educate and/or spread awareness about a disease or health issue, whether to healthcare professionals, patients, and/or consumers. |
| E23 | Achievement in Marketing – Healthcare (OTC) | ✅ Communications for products purchasable without a prescription that address a specific illness, disease, or health issue, whether to healthcare professionals, patients, and/or consumers. |
| E24 | Achievement in Marketing – Healthcare (Rx) | ✅ Communications for products purchasable with a prescription that address a specific illness, disease, or health issue, whether to healthcare professionals, patients, and/or consumers. |
| E25 | Achievement in Marketing – Healthcare Services | ✅ Marketing communications for hospitals, HMOs, referral services, dental and medical care services, or chronic care facilities, whether to healthcare professionals, patients, and/or consumers. |
| E26 | Achievement in Marketing – Home Furnishings & Appliances | ✅ Kitchen appliances, air conditioners, carpeting, furniture, decorator's supplies, paint, wallpaper, etc. |
| E27 | Achievement in Marketing – Household Supplies | ✅ Cleaning products, waxes, detergents, floor-care products, fabric softeners, paper products, domestic services, mowers, fertilizers, lawn care, etc. |
| E28 | Achievement in Marketing – Insurance | ✅ Communications promoting specific products or services related to insurance. All types of insurance are eligible (home, auto, financial, health, life, travel, business, etc.). |
| E29 | Achievement in Marketing – Internet/Telecom | ✅ Wireless/cellular providers, high-speed Internet access services, online services, portals, search engines and related Internet products & services (including SaaS/IaaS and Cloud-based services), bundled communications. |
| E30 | Achievement in Marketing – Leisure & Recreation | ✅ Products and services aimed at hobbies, leisure, and recreation, including dating services/apps, wedding planning platforms, personal development programs, genetics/ancestry testing, sporting and camping goods, etc. |
| E31 | Achievement in Marketing – Media & Entertainment Companies | ✅ TV networks, streaming services, websites, magazines, newspapers, consumer or trade media, radio stations, broadcasters, etc. |
| E32 | Achievement in Marketing – Non-Profit | ✅ Not-for-profit organizations of all types, including charitable, social, civic, advocacy, trade, special interest, religious, etc. |
| E33 | Achievement in Marketing – Personal Care | ✅ Soap, dental products, face & body lotions and cleansers, cotton swabs, deodorants, feminine hygiene products, razors, shaving cream, etc. |
| E34 | Achievement in Marketing – Pet Care | ✅ Animal care products and services of all types, including food, toys, veterinary and boarding services, training, and breeders. |
| E35 | Achievement in Marketing – Real Estate | ✅ Homes, real estate brokers, malls, etc. |
| E36 | Achievement in Marketing – Restaurants | ✅ Quick service, casual dining, mid-scale, white table cloth and other restaurants. |
| E37 | Achievement in Marketing – Retail | ✅ General stores and/or websites providing a range of merchandise (department stores, food retailers, discount/bulk retailers). Specialized stores and/or websites specializing in one particular line of products. |
| E38 | Achievement in Marketing – Snacks/Desserts/Confections | ✅ Ice cream, candy, chips, cookies, bakery items, nuts, fruit & vegetable snacks, popcorn, etc. |
| E39 | Achievement in Marketing – Software | ✅ Software, groupware, operating systems, SaaS/IaaS and Cloud-based services, etc. |
| E40 | Achievement in Marketing – Transportation | ✅ Air, train, bus/trolley, taxi, subway systems, bike shares, scooter shares, car rentals, leasing (not including automobile sales/leasing), ferries, etc. |
| E41 | Achievement in Marketing – Travel/Tourism/Destination | ✅ Cruises, hotels, resorts, amusement parks, travel websites and booking services, travel tours, tourism campaigns, etc. |
| E49 | Achievement in AI-Powered Marketing Strategy | ✅ Recognizing holistic marketing strategies that leveraged artificial intelligence to drive planning, personalization, and optimization across channels. |
| E50 | Achievement in the Use of Data to Drive Brand Strategy | ✅ Recognizing campaigns that effectively developed from the successful use of data and technology to identify and match the right audiences to the right message at the right moments. |
| E51 | Achievement in Branded Content | ✅ Recognizing work that used branded content — original or sponsored — to reach out to audiences to establish meaningful relationships, memorable engaging experiences, and unique connections with their brands. |
| E52 | Achievement in Brand Experiences (B2B) | ✅ Recognizing work that reaches out to business audiences to establish meaningful relationships, memorable engaging experiences, and unique connections with their brands. |
| E53 | Achievement in Brand Experiences (Consumer) | ✅ Recognizing work that reaches out to consumer audiences to establish meaningful relationships, memorable engaging experiences, and unique connections with their brands. |
| E54 | Achievement in Branded Utilities | ✅ Recognizing products and services created to address a marketing or business challenge, not to be sold, as part of a marketing program itself. |
| E55 | Achievement in Engaged Communities | ✅ Recognizing brands for creating content, experiences, platforms, news, etc. that get their communities to grow, engage, share, act or amplify messaging in a way that directly relates to a brand's goals. |
| E56 | Achievement in Influencer Marketing | ✅ Recognizing campaigns that targeted influencers who have an exponential effect on the brand's audience. Spotlights efforts to identify ultimate influencers and turn them into brand enthusiasts. |
| E57 | Achievement in Marketing Disruption | ✅ Recognizing marketing that grew their business/brand by changing the marketing model in ways that drive the industry forward. Nominations detail the marketing challenge, competitive landscape, and how they succeeded by changing the existing marketing model. |
| E58 | Achievement in New Product or Service Introductions | ✅ For achievements that introduced a new product or service to the US market. |
| E59 | Achievement in Purpose-Led Marketing Initiatives | ✅ Recognizing initiatives built around long-term commitments to social causes, advocacy, or corporate responsibility that align with core brand values. |
| E60 | Achievement in Re-Branding / Brand Renovation | ✅ For marketing achievements that recreated or repositioned an existing brand. |
| E61 | Achievement in Small-Budget Marketing (<$3 million) | ✅ Recognizing innovative and effective marketing initiatives that punched above their weight. |
| E62 | Achievement in Viral Marketing | ✅ Recognizing marketing initiatives that used word-of-mouth, video stunts, and other viral tactics as their primary means of communication. |
| E63 | Achievement in Youth Marketing | ✅ For marketing initiatives that targeted the youth market (up to age 24). |
| E64 | Achievement in Omni-Channel Marketing | ✅ Highlights marketing initiatives that seamlessly integrate multiple platforms like digital, print, and in-person. |
| E65 | Marketing or Advertising Agency of the Year | ✅ Recognizes the best marketing/advertising agencies based on overall achievement and results since January 1 2024. |
| E66 | Marketing Department of the Year | ✅ Nominate your entire marketing organization for its achievements since January 1 2024. |
| E67 | Marketing Team of the Year | ✅ Nominate some subset of your marketing organization for its achievements since January 1 2024. |
| E68 | Marketing Executive of the Year | ✅ Recognizes individual marketing executives at VP level or higher for their achievements since January 1 2024. |
| E69 | Marketer of the Year | ✅ Recognizing non-executive marketing professionals for their achievements since January 1 2024. No entry fee. |

---

## ══════════════════════════════
## GROUP 5: Corporate Communications, IR & PR Categories
## Code prefix: C0x–C5x
## ══════════════════════════════

**Group description:** Includes all corporate communications, investor relations, community affairs, public relations functions.
**Entry format (Agency/Dept/Team/Individual):** 3 essays — history (200w), achievements (250w), significance (250w)
**Entry format (Campaign/Achievement):** 4 essays — date, genesis (250w), development (250w), results since Jan 2024 (250w)
**Nominee type:** agency | department | team | individual | campaign

| Code | Name | Description |
|------|------|-------------|
| C01 | Public Relations Agency of the Year | ✅ Recognizes the best overall PR agency based on its achievements and results since January 1 2024. |
| C02 | Communications Department of the Year | ✅ For in-house communications departments, across all communications functions. |
| C03 | Communications Team of the Year | ✅ For communications teams focused on a particular project, client, or objective. Nominated teams may be in-house, within an agency, or across a client and agency. |
| C04 | Communications, IR, or PR Executive of the Year | ✅ For executive-level (VP or higher) communications, PR, and IR professionals. |
| C05 | Communications Professional of the Year | ✅ For non-executive (director-level or lower) communications, PR, and IR professionals. No entry fee. |
| C06 | PR Innovation of the Year | ✅ Recognizes singular innovations in communications practice, research, technology, or management since the beginning of 2024. |
| C07 | Achievement in AI-Driven Communications Campaign | ✅ Recognizes PR-related achievements that used AI technologies such as generative content, chatbots, or sentiment analysis. Entries should demonstrate how AI enhanced engagement or outcomes. |
| C08 | Achievement in Arts & Entertainment | ✅ PR-related achievements undertaken to promote or raise awareness of an artistic or entertainment endeavor, event, or program. |
| C09 | Achievement in Brand / Reputation Management | ✅ PR-related achievements designed to enhance, promote or improve the reputation of an organization with its publics or key elements of its publics. |
| C10 | Achievement in Climate Change | ✅ PR-related achievements addressing, issues relevant to, or awareness of, global climate change. |
| C11 | Achievement in Communications Research | ✅ Recognizing research conducted for the development of business / communication strategies. |
| C12 | Achievement in Community Engagement | ✅ Recognizing campaigns that helped to engage or activate a community in some specific way. |
| C13 | Achievement in Community Relations (subs: a Associations/Non-Profit / b Business / c Government) | ✅ PR-related achievements that aim to improve relations with communities in which the sponsoring organization has an interest, need or opportunity. |
| C14 | Achievement in Consumer PR for an Existing Product | ✅ PR-related achievements/activities around a consumer product. |
| C15 | Achievement in Consumer PR for an Existing Service | ✅ PR-related achievements/activities around a consumer service. |
| C16 | Achievement in Content Marketing (subs: a Associations/Gov/Nonprofit / b B2B / c B2C) | ✅ Campaigns that effectively demonstrate a strategic program that includes creating and distributing valuable content to attract, acquire, and engage target audiences. |
| C17 | Achievement in Corporate Communications | ✅ PR-related achievements that enhance a company's overall reputation through corporate communications. |
| C18 | Achievement in Corporate Responsibility | ✅ PR-related achievements demonstrating excellence in corporate social responsibility. |
| C19 | Achievement in Country, Region or City | ✅ PR-related achievements developed to promote a country, a region, or a city. |
| C20 | Achievement in Crisis Communications Online | ✅ For excellence in the use of social media during a crisis. |
| C21 | Achievement in Crisis Management | ✅ Recognizing excellent communications management during a crisis. |
| C22 | Achievement in Data-Driven Communications Strategy | ✅ Recognizes PR campaigns/achievements built or optimized using data, analytics, or performance insights. Focus is on strategic adjustments and measurable results. |
| C23 | Achievement in Digital Creativity | ✅ Recognizing excellence in purely digital PR campaigns showing creativity in their use of the digital world. |
| C24 | Achievement in Digital Media Relations | ✅ For PR campaigns showing creativity in the use of social media. |
| C25 | Achievement in Diversity, Equity & Inclusion | ✅ PR-related achievements devoted to promoting inclusivity and/or dismantling discrimination for racial, ethnic, religious or sexual orientation and gender differences. |
| C26 | Achievement in Employee Advocacy Program | ✅ Honors PR campaigns/achievements that empowered employees to act as external brand ambassadors. Focus may include social media, testimonials, or public engagement. |
| C27 | Achievement in Employer Branding Campaign | ✅ For PR campaigns/achievements that promoted an organization's reputation as an employer of choice. Includes messaging around company culture, recruitment, and values. |
| C28 | Achievement in Environmental | ✅ PR-related achievements focused on an environmental issue with substantial results for society. |
| C29 | Achievement in ESG | ✅ PR-related achievements that enhance an organization's reputation and demonstrate a business approach to initiatives that positively impact society, highlighting environmental and social benefits to stakeholders. |
| C30 | Achievement in Events & Observances | ✅ PR-related achievements that generate awareness of or document commemorations, observances, openings, celebrations, and other types of events. |
| C31 | Achievement in Experiential PR | ✅ Recognizes immersive campaigns designed to create memorable brand experiences. Can include physical or digital activations that drive public interest. |
| C32 | Achievement in Financial Services & Investor Relations | ✅ For use of PR for a financial product or service or in investor relations. |
| C33 | Achievement in Food & Beverage | ✅ For a PR campaign to promote a new or existing food or beverage. |
| C34 | Achievement in Gaming & Virtual Reality | ✅ For a PR campaign that launched a development in the gaming or VR industry. |
| C35 | Achievement in Global Communications | ✅ PR-related achievements that demonstrate effective global communications implemented in at least two countries. |
| C36 | Achievement in Healthcare | ✅ Campaign/programs in the healthcare sector, including business-to-business and consumer campaigns. |
| C37 | Achievement in Influencer Management | ✅ For a PR campaign that made use of identified influencers beyond traditional media. |
| C38 | Achievement in Influencer Marketing | ✅ PR-related achievements that established or furthered the reach and reputation of social media influencers. |
| C39 | Achievement in Integrated Communications | ✅ Includes creative and effective integrated campaigns along with other marketing or communications including paid, earned, shared and owned efforts. Must demonstrate meaningful PR/communications components integrated with other disciplines. |
| C40 | Achievement in Internal Communications (subs: a ≤100 emp / b 100+ emp) | ✅ PR-related achievements undertaken to inform or educate an internal audience, such as employees or members. |
| C41 | Achievement in Issues Management | ✅ PR-related achievements undertaken to deal with issues that could extraordinarily affect ongoing business strategy. |
| C42 | Achievement in Low Budget (under $10,000) | ✅ PR-related achievements that cost no more than $10,000 to plan and implement. |
| C43 | Achievement in Marketing – Business to Business | ✅ PR-related achievements designed to introduce new products or promote existing products or services to a business audience. |
| C44 | Achievement in Marketing – Consumer Products | ✅ PR-related achievements designed to introduce new products or promote existing products to a consumer audience. |
| C45 | Achievement in Marketing – Consumer Services | ✅ PR-related achievements designed to introduce new services or promote existing services to a consumer audience. |
| C46 | Achievement in Media Relations | ✅ Recognizing effective traditional media relations in a PR campaign. |
| C47 | Achievement in Multicultural | ✅ PR-related achievements specifically targeted to a cultural group. |
| C48 | Achievement in New Product or Service Launch | ✅ PR-related achievements undertaken to introduce a new product or service to the marketplace. |
| C49 | Achievement in Non-Profit / Charity | ✅ PR-related achievements that communicate the mission or activities of non-profit or charitable organizations. |
| C50 | Achievement in Public Affairs | ✅ PR-related achievements specifically designed to influence public policy and/or affect legislation, regulations, political activities or candidacies. |
| C51 | Achievement in Public Service | ✅ PR-related achievements that advance public understanding of societal issues, problems or concerns. |
| C52 | Achievement in Real-Time PR Response | ✅ For PR-related achievements that responded quickly and creatively to trending topics or breaking news. Recognizes agility and strong audience engagement. |
| C53 | Achievement in Social Media Focused | ✅ PR-related achievements designed to be implemented primarily through online social media. |
| C54 | Achievement in Sponsorship | ✅ PR-related achievements that promote or create awareness of sponsorship of an event or activity. |
| C55 | Achievement in Sport | ✅ For a PR campaign to promote a sport for itself or to a community. |
| C56 | Achievement in Technology | ✅ PR-related achievements in the technology sector, including business-to-business and consumer campaigns. |
| C57 | Achievement in Travel & Tourism | ✅ PR-related achievements designed to advance the interests of clients in the transport, travel, hotel or tourism industries. |
| C58 | Achievement in User-Generated Content (UGC) Activation | ✅ For achievements that mobilized audiences to co-create or share content supporting a brand. Highlights community-driven content and engagement. |

---

## ══════════════════════════════
## GROUP 6: Customer Service Categories
## Code prefix: J0x
## ══════════════════════════════

**Group description:** Includes all customer service functions.
**Entry format:** Essay 650 words + 150-word bullet list of 10 accomplishments + optional files
**Nominee type:** team | department | individual | program

| Code | Name | Description |
|------|------|-------------|
| J01 | Best Crisis Response in Customer Service | ✅ For teams or individuals who responded effectively to a customer service crisis, showing agility, empathy, and problem-solving skills under pressure. |
| J02 | Best Use of Technology in Customer Service | ✅ For service teams that successfully adopted technology (e.g., AI, CRM, chatbots) to enhance speed, personalization, or satisfaction. |
| J03 | Customer Retention Program of the Year | ✅ For service programs aimed at improving retention, loyalty, or reducing churn through outstanding support. |
| J04 | Customer Service Department of the Year | ✅ For organizations wishing to nominate their entire customer service organization. |
| J05 | Customer Service Executive of the Year | ✅ Recognizes individual executives who have demonstrated outstanding leadership in customer service. |
| J06 | Customer Service Innovation of the Year | ✅ Recognizes implementation of new systems, tools, or processes that transformed the customer service experience. |
| J07 | Customer Service Team of the Year | ✅ For organizations wishing to nominate a subset of their customer service organization, such as a particular call center or client relations team. |
| J08 | Digital Customer Service Team of the Year | ✅ Recognizes a digital-focused subset of a customer service organization, such as a particular call center or client relations team. |
| J09 | Multilingual Customer Support Program | ✅ Recognizes efforts in delivering consistent, high-quality service across multiple languages and cultures. |

---

## ══════════════════════════════
## GROUP 7: Technology Categories
## Code prefix: N0x
## ══════════════════════════════

**Group description:** Includes all technology, software, web development functions.
**Entry format:** Essay 650 words + 150-word bullet list + optional files
**Nominee type:** team | department | individual

| Code | Name | Description |
|------|------|-------------|
| N01 | Technology Department of the Year | ✅ For organizations wishing to nominate their entire technology organization. |
| N02 | Technology Innovation of the Year — Hardware | ✅ Honors new hardware products or devices launched since January 1 2024. |
| N03 | Technology Innovation of the Year — Software | ✅ Recognizes innovative software products or platforms introduced since January 1 2024. |
| N04 | Technology Team of the Year | ✅ For organizations wishing to nominate a subset of their tech organization, such as a network management or software development team. |
| N05 | Technology Executive of the Year | ✅ For executive-level (VP or CXO and higher) tech professionals. |
| N06 | Technical Professional of the Year | ✅ For non-executive technical professionals including software developers, web developers, technical writers, etc. |

---

## ══════════════════════════════
## GROUP 8: Human Resources Categories
## Code prefix: L0x
## ══════════════════════════════

**Group description:** Includes all human resources functions.
**Entry format:** Essay 650 words + 150-word bullet list + optional files
**Nominee type:** team | department | individual | program

| Code | Name | Description |
|------|------|-------------|
| L01 | Achievement in Employee Wellbeing Programs | ✅ Celebrates successful programs or policies focused on employee mental health, work-life balance, wellness, or emotional support. |
| L02 | Best Use of Technology in Human Resources | ✅ Honors outstanding implementation of technology — such as AI, automation, analytics, or platforms — that improved HR efficiency, decision-making, or employee experience. |
| L03 | DEI Program of the Year | ✅ Recognizes a DEI initiative that has significantly enhanced organizational diversity, improved inclusion practices, or demonstrated impact across gender, ethnicity, age, or other groups. |
| L04 | Human Resources Department of the Year | ✅ For organizations wishing to nominate their entire HR organization. |
| L05 | Human Resources Team of the Year | ✅ For organizations wishing to nominate a subset of their HR organization, such as a training or benefits-management team. |
| L06 | Human Resources Executive of the Year | ✅ Recognizes individual HR executives at VP level or higher. |
| L07 | Most Innovative Human Resources Initiative | ✅ Recognizes a creative HR strategy or initiative that led to measurable improvements in talent acquisition, retention, engagement, or performance. |
| L08 | Remote Work Culture Excellence | ✅ Honors HR practices and strategies that created an outstanding remote or hybrid work environment, fostering productivity, engagement, and well-being. |

---

## ══════════════════════════════
## GROUP 9: Entrepreneur Categories
## Code prefix: D0x–D4x
## ══════════════════════════════

**Group description:** Recognizing achievements since the beginning of 2024 of individual entrepreneurs and founding teams.
**Entry format:** Essay 2500 chars + bullet list of 10 accomplishments + optional files
**Nominee type:** individual entrepreneur | founding team
> ⚠️ D01–D35 are pure industry labels — NO description on the website. ~36 entries needing enrichment.

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
| D36 | Best Female Entrepreneur | ✅ Recognizes outstanding achievements of women entrepreneurs since the beginning of 2024. |
| D37 | Best Social Entrepreneur | ✅ Recognizes entrepreneurs whose business model creates measurable social or environmental impact alongside financial returns. |
| D38 | Best Sustainability Entrepreneur | ✅ Recognizes entrepreneurs building businesses centered on environmental sustainability, clean energy, or circular economy principles. |
| D39 | Best Young Entrepreneur – Under 35 | ✅ Recognizes outstanding entrepreneurial achievements of individuals under the age of 35 since the beginning of 2024. |
| D40 | Founding Team of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services) | ✅ Recognizes the collective achievements of an organization's founding team since the beginning of 2024. |

---

## ══════════════════════════════
## GROUP 10: Event Categories
## Code prefix: G0x
## ══════════════════════════════

**Group description:** Recognizing excellence in events staged since January 1 2024. Live, virtual, and hybrid events may be nominated.
**Entry format:** Essay 525 words + supporting files and web links
**Nominee type:** event

| Code | Name | Description |
|------|------|-------------|
| G01a | Art, Entertainment & Public – Art Event | ✅ Dance, music, literature, street art, exhibitions, installations, performances, etc. |
| G01b | Art, Entertainment & Public – Celebration Event | ✅ For events created to celebrate an occasion, anniversary, milestone or anything important to an organization, community, or brand. |
| G01c | Art, Entertainment & Public – Cultural Event | ✅ All events that promote cultural exchange, heritage, or community identity. |
| G01d | Art, Entertainment & Public – Entertainment Event | ✅ All events intended to entertain or bring joy. |
| G01e | Art, Entertainment & Public – eSports Event | ✅ Gaming events, championships, tournaments, competitions or contests either played in front of an audience or live-streamed. |
| G01f | Art, Entertainment & Public – Fashion Event | ✅ Fashion shows, fairs, pop-ups, parties and other fashion events. |
| G01g | Art, Entertainment & Public – Festival | ✅ Music, film, art, food, dance or any other public or community festival that celebrates a specific theme. |
| G01h | Art, Entertainment & Public – Live Event | ✅ Events that take place in front of a live audience, including live performances and shows, fashion shows, competitions, games, comedy, theater, circus, concerts, live TV and radio broadcasts, etc. |
| G01i | Art, Entertainment & Public – Municipal Event | ✅ All public events organized for/by a specific municipality including celebrations, concerts, festivals, shows, parades, art events, etc. |
| G01j | Art, Entertainment & Public – Music Event | ✅ All events where music is the focal point including concerts, music festivals, live vocal or instrumental performances, etc. |
| G02a | Business Events – Association Meeting | ✅ Any professional association event, no matter the industry, length or frequency. |
| G02b | Business Events – Conference | ✅ Any conference, regardless of topic, location, size and target audience. |
| G02c | Business Events – Consumer Show | ✅ B2C expos, fairs, exhibits, demos and showcases of any size intended to introduce consumers to relevant products or services. |
| G02d | Business Events – Convention | ✅ Large conferences and meetings based upon a specific industry, profession or fandom. |
| G02e | Business Events – Educational Event | ✅ Any internal or external training sessions, workshops, seminars, masterclasses and educational courses. |
| G02f | Business Events – Event Series | ✅ A set of recurring or connected events designed to engage audiences over time, build community, and/or create sustained impact around a brand, theme, or purpose. |
| G02g | Business Events – Virtual / Hybrid Event | ✅ Events conducted entirely online or combining in-person and virtual elements. |
| G02h | Business Events – AI-Powered Event | ✅ Events that significantly leveraged artificial intelligence for personalization, logistics, audience engagement, or content delivery. |
| G03a | Corporate & Marketing Events – Brand Activation | ✅ Events designed to create direct, immersive engagement between a brand and its target audience. |
| G03b | Corporate & Marketing Events – Cause Event | ✅ Events which support or raise awareness about special causes. |
| G03c | Corporate & Marketing Events – CSR Experience | ✅ Any event or experience that contributes to the improvement of the social, environmental and economic development of local communities or society at large. Both in-person and hybrid formats are accepted. |
| G03d | Corporate & Marketing Events – Community Interest Event | ✅ Includes interest-related conferences or meetings (social media conferences, cooking classes, etc), professional-interest events (marketers' summits, women entrepreneurs meetings, etc.), cause events, customer, employee or partner engagement events, etc. |
| G03e | Corporate & Marketing Events – Corporate Event | ✅ Any business event intended to reward, honor, engage or educate employees, partners, shareholders or customers (conferences, seminars, incentives, cycle meetings, corporate parties, retreats, team buildings, awards, etc.). |
| G03f | Corporate & Marketing Events – Customer Engagement Event | ✅ Any type of customer-centric event created to foster relationship and brand loyalty with existing customers or engage target customers (incentives, corporate parties, consumer shows, promotional events, product launch events, celebrations, etc.). |
| G03g | Corporate & Marketing Events – Employee-Centric Event | ✅ Celebrates events focused on employee appreciation or motivation. Criteria: employee satisfaction and cultural impact. |
| G03h | Corporate & Marketing Events – Gala | ✅ Formal, high-profile events that celebrate achievements, honor individuals, or raise funds in an elegant setting. |
| G03i | Corporate & Marketing Events – Hybrid Event of the Year | ✅ The best hybrid event combining in-person and virtual elements for maximum reach and engagement. |
| G03j | Corporate & Marketing Events – Local Community Impact Event | ✅ Recognizes events significantly benefiting local communities through direct engagement or resource provision. |
| G04a | Non-Profit & Fundraising – Employee Giving & Volunteerism | ✅ Events and experiences that actively involve an organization's employees in charity initiatives, volunteerism and employee giving. Both in-person and hybrid formats accepted. |
| G04b | Non-Profit & Fundraising – Fundraising Event | ✅ Showcases the most meaningful and effective fundraising and charity events around the USA. |
| G04c | Non-Profit & Fundraising – Inclusive Event | ✅ Showcases events designed so that everyone can participate and no one is excluded regardless of age, sex, sexual orientation, ethnicity, religion, physical disabilities, etc. |
| G04d | Non-Profit & Fundraising – Sustainable Event | ✅ Recognizes the most sustainable events using green practices and innovative strategies to event planning that show environmental consciousness. |

---

## ══════════════════════════════
## GROUP 11: AI Categories (NEW for 2026)
## Code prefix: Q0x
## ══════════════════════════════

**Group description:** Recognizing achievements of individuals and organizations using AI in the workplace since January 1 2024.
**Entry format:** Essay 650 words + 150-word bullet list + optional files
**Nominee type:** individual | organization | product | initiative

| Code | Name | Description |
|------|------|-------------|
| Q01 | AI Innovator of the Year | ✅ Recognizing an individual (engineer, researcher, product leader) whose work significantly advanced AI applications or solutions. |
| Q02 | AI Leader of the Year | ✅ Honoring a CEO, executive, or senior leader driving AI strategy and impact within their organization. |
| Q03 | AI Rising Star | ✅ Honoring early-career professionals making notable contributions to AI projects or research. |
| Q04 | Women in AI Leadership | ✅ Spotlighting women executives, researchers, and entrepreneurs shaping the AI landscape. |
| Q05 | AI & Sustainability Achievement Award | ✅ Spotlighting AI-driven initiatives that reduce environmental impact or advance sustainability goals. |
| Q06 | AI Breakthrough of the Year | ✅ Honoring a single AI innovation, invention, or project that stands out as transformative. |
| Q07 | AI Company of the Year | ✅ For organizations demonstrating outstanding achievements in applying AI across operations, products, and services. |
| Q08 | AI-Driven Culture of Innovation | ✅ Honoring companies fostering a strong culture of AI adoption, training, and ethical innovation. |
| Q09 | AI-Driven Startup of the Year | ✅ Recognizing startups whose growth and innovation are fueled by AI. |
| Q10 | AI for Customer Experience | ✅ Recognizing the use of AI in customer support, personalization, or engagement. |
| Q11 | AI for Social Good | ✅ Spotlighting initiatives using AI to address societal challenges (education, accessibility, disaster relief, etc.). |
| Q12 | AI in Customer Service | ✅ Recognizes outstanding use of AI to enhance customer service operations, experience, or outcomes. |
| Q13 | AI in Education | ✅ Recognizing AI-powered tools and platforms transforming learning, teaching, or educational administration. |
| Q14 | AI in Healthcare | ✅ Honoring impactful AI applications in medical technology, patient care, or health outcomes. |
| Q15 | AI in Human Resources & Talent Management | ✅ Recognizing AI-driven solutions for hiring, learning, employee engagement, or workforce planning. |
| Q16 | AI in Marketing & Sales | ✅ Spotlight AI-powered tools for demand generation, analytics, personalization, or sales enablement. |
| Q17 | Best AI-Powered Product or Service | ✅ Honoring commercially available products/services that integrate AI to deliver exceptional results. |
| Q18 | Best Use of AI in Business Transformation | ✅ Recognizing companies that have reimagined core business processes through AI. |
| Q19 | Ethical AI Initiative of the Year | ✅ Honoring responsible and transparent approaches to AI development and deployment. |

---

## ══════════════════════════════
## GROUP 12: Creative Categories (NEW for 2026)
## Code prefix: K0x
## ══════════════════════════════

**Group description:** Recognizing achievement since the beginning of 2024 in all creative management, copywriting, art direction, editorial, audio-visual production, animation, illustration, photography functions.
**Entry format:** Essay 650 words + 150-word bullet list + optional files
**Nominee type:** agency | team | department | individual | project

| Code | Name | Description |
|------|------|-------------|
| K01 | Advertising or Design Agency of the Year | ✅ Recognize everyone who works at your advertising, marketing, or design agency, regardless of their function, location, seniority, or position. |
| K02 | Breakthrough Creative Use of Technology | ✅ Recognizes innovative applications of technology in creative projects, such as AI-driven designs, AR/VR experiences, or interactive campaigns. |
| K03 | Creative Department of the Year | ✅ Recognize everyone who works in creative functions in your organization, regardless of function, location, seniority, or position. |
| K04 | Creative Executive of the Year | ✅ Recognizes the achievements of individual creative executives. |
| K05 | Creative Individual of the Year | ✅ Recognizes the achievements of individuals not at the executive level in creative roles. |
| K06 | Creative Team of the Year | ✅ Recognize a subset of your creative organization — may be multidisciplinary, may span multiple organizations, and may be a permanent or temporary project team assembled for a specific task or assignment. |
| K07 | Excellence in Collaborative Creativity | ✅ Celebrates partnerships between multiple organizations or disciplines that result in exceptional creative impact. |
| K08 | Most Innovative Creative Project | ✅ Honors singular creative projects that demonstrate originality, innovation, and exceptional impact. |

---

## ══════════════════════════════
## GROUP 13: App & Mobile Site Categories
## Code prefix: F5x–F9x
## ══════════════════════════════

**Group description:** Recognizing excellence in mobile websites and apps developed in the USA.
**Entry format:** Essay 200 words describing the app's purpose and results + 3-minute demonstration video
**Nominee type:** product (mobile app or mobile website)

| Code | Name | Description |
|------|------|-------------|
| F55 | Arts & Culture | ✅ Apps built to promote or enhance the experience of art, an event, or a cultural institution, such as museums, parks, zoos, gardens, aquariums, theaters, arenas, and so on. |
| F56 | Business/Government | ✅ Apps built for general business- or government-related purposes that are not addressed by one of the other app categories available. |
| F57 | Education, Science & Reference | ✅ Apps developed for the distribution of educational content or reference material for subjects like science, the environment, geography, etc.; and formats including dictionaries, thesauruses, or encyclopedias. |
| F58 | Entertainment & Sports | ✅ Apps developed for entertainment and sports content, such as games, news, gossip, humor, music, fantasy leagues, and reviews. These may be offshoots of established broadcast or online news and entertainment operations, or developed specifically for the mobile device. |
| F59 | Events | ✅ Apps built to offer registration, guidance, navigation, networking, and other functions to attendees, exhibitors, and/or sponsors of professional events. |
| F60 | Experimental & Innovation | ✅ The use and/or implementation of groundbreaking technology or unconventional applications in apps and environmental situations. Entries may be theoretical, pre-production technologies pushing the boundaries and definitions of handheld mobile device experiences. |
| F61 | Family & Kids | ✅ Apps that feature interactive content, games, education, or tools specifically for children, families, and parenting. |
| F62 | Fashion & Beauty | ✅ Apps created to provide beauty- or fashion-related services to users, such as simulations, modeling, and recommendations. |
| F63 | Financial Services / Banking | ✅ Apps providing financial services and/or information. These include online stock trading, financial news, mortgage information, credit cards, or investor relations and services. |
| F64 | Food & Drink | ✅ Apps developed to offer services, advice, recommendations, and/or utilities related to food and beverage preparation, storage, or consumption. |
| F65 | Games | ✅ Apps built to provide a gaming experience to users. |
| F66 | Guides/Ratings/Reviews | ✅ Apps that offer users the ability to create or access ratings and reviews of products, services, experiences or other things. |
| F67 | Health, Wellness & Fitness | ✅ Apps that promote personal health, well-being, and fitness. These include medical and health services, physical education platforms, fitness videos, and references. |
| F68 | HR & Employee Experience | ✅ Apps that help organizations customize an experience for talent and employees, including but not limited to recruitment, talent management, benefits administration, payroll, time tracking, and more. |
| F69 | Learning & Education | ✅ Apps designed for the education industry, including but not limited to classroom management, student information, and language learning. |
| F70 | Marketing & Content Management | ✅ Apps that help organizations automate, streamline and measure their marketing efforts, including but not limited to CMS, CRM, social media management. |
| F71 | Messaging | ✅ Apps that provide messaging services to users. |
| F72 | Music | ✅ Apps providing or related to music: streaming, reviews, ratings, discovery, etc. |
| F73 | News | ✅ Apps built to provide news and information services to users. |
| F74 | Productivity | ✅ Apps that promote productivity in the workplace, from schedules and workflows to list makers and everything in between. |
| F75 | Professional Services | ✅ Apps developed by professional service firms to provide resources, account access, research, and other tools to their customers. |
| F76 | Public Service & Activism | ✅ Apps that provide or offer access to government services; and apps that encourage or permit users to engage in civic discourse or activity. |
| F77 | Real Estate | ✅ Apps that provide real estate-related information and/or services. |
| F78 | School / University | ✅ Apps built by or for schools to be used by students, parents, faculty, alumni, boosters, and/or other supporters. |
| F79 | Shopping & Retail | ✅ Apps that provide consumers online commerce, marketplaces and retail sales of any products or services. |
| F80 | Social | ✅ Social media apps that provide engagement for their users. |
| F81 | Social Good | ✅ Recognizes mobile applications focused on addressing societal issues such as healthcare, education, environmental protection, or community support, and making a measurable impact. |
| F82 | Training | ✅ Apps developed to provide training, remediation, performance support, certification, testing, or other professional training-related services. |
| F83 | Travel | ✅ Apps that provide travel and tourism services and information. These include online agents for purchasing tickets, hotel rooms, rental cars, vacation packages, and other travel services. Includes online travel guides, travel writing, and travel tools. |
| F84 | Utilities & Services | ✅ Apps that allow real-world activities to be done on the go. This includes apps and mobile sites which help organize transportation, edit photos, find jobs, locate housing, make dates; or tools which facilitate typically offline activities from a mobile device. |
| F85 | Work, Productivity & Collaboration | ✅ Apps that help manage communication, organization of information and projects more efficiently across teams, including tools that enable activity management, online appointment management, social collaboration, and web conferencing software. |
| F86 | Best User Experience | ✅ Apps that offer the best user experience through innovative design, personalized data experiences, and useful functionality. |
| F87 | Best User Interface | ✅ Apps that set an industry standard of excellence with their user interface design. |
| F88 | Best Use of AI & Machine Learning | ✅ Apps that set an industry standard for the best, most innovative use of artificial intelligence and/or machine learning. |
| F89 | Best Use of Augmented Reality | ✅ Only augmented reality will be judged here. Best, most innovative use of augmented reality. |
| F90 | Best Use of Generative AI Technology | ✅ Apps that leverage generative AI to produce unique content, innovative solutions, or personalized experiences. |
| F91 | Best Visual Design – Aesthetic | ✅ Only visual design judged. Apps or experiences where visual design aesthetic is intended to be beautiful, innovative, emotional, and appeal to the senses. |
| F92 | Best Visual Design – Function | ✅ Only visual design judged. Apps that set an industry standard of excellence by relying on visual design as a critical part of a functional user experience. |
| F93 | Excellence in Accessibility | ✅ Recognizes mobile apps or mobile sites that prioritize inclusive design, providing seamless access and usability for individuals with visual, auditory, motor, or cognitive disabilities. |
| F94 | Technical Achievement | ✅ Apps that set an industry standard by using new and innovative technology in an outstanding way that improves the overall experience. Could include the use of new Web3 or blockchain technology (NFTs, tokens, crypto-currency, etc.). |

---

## ══════════════════════════════
## GROUP 14: New Product & Product Management Categories
## Code prefix: P0x–P9x, S0x–S2x
## ══════════════════════════════

**Group description:** New products and services released in the USA since January 1 2024. Brand-new and new-version products are both eligible.
**Entry format (products):** 3 essays — features/benefits (350w), market performance (350w), evidence (250w)
**Entry format (product management):** 3 essays — history (200w), achievements (250w), significance (250w)
**Nominee type:** product | service | team | individual

### Product Management sub-group

| Code | Name | Description |
|------|------|-------------|
| P96 | Product Dev/Mgmt Department or Team of the Year | ✅ Recognizes the best overall product development or management department or team based on achievements since January 1 2024. |
| P97 | Product Dev/Mgmt Executive of the Year | ✅ Recognizes executive-level product development or management professionals. |
| P98 | Product Developer of the Year | ✅ Recognizing all non-executive product development or management professionals. No entry fee. |

### Product & Service sub-group

| Code | Name | Description |
|------|------|-------------|
| P01 | Accessibility-Focused Product | ✅ Celebrates innovative products created or enhanced to be accessible to individuals with disabilities or impairments, ensuring inclusive design and usability. |
| P02 | Business-to-Business Products | ✅ Recognizes tangible B2B products. Do not enter business technology products in this category; enter them in one of the business technology categories below. |
| P03 | Business-to-Business Services | ✅ Recognizes B2B service offerings. |
| P04 | Consumer Electronics | ✅ Recognizes all types of products under the umbrella of consumer electronics. |
| P05a | Consumer Products – Durables | ✅ Recognizes durable consumer products such as appliances, furniture, etc. |
| P05b | Consumer Products – Food & Beverage | ✅ Recognizes consumer food and beverage products. |
| P05c | Consumer Products – Household Products | ✅ Recognizes consumer household products. |
| P05d | Consumer Products – Other | ✅ Recognizes consumer products not fitting the other subcategories. |
| P06 | Consumer Services | ✅ Recognizes all service offerings for consumers. |
| P07 | Financial Services | ✅ Recognizes all types of financial products and services. |
| P08 | Hardware – Computer | ✅ Recognizes computer hardware products except those fitting in other hardware categories. |
| P09 | Hardware – Networking | ✅ Recognizes networking products and solutions. |
| P10 | Hardware – Peripheral | ✅ Recognizes computer peripheral products. |
| P11 | Hardware – Semiconductor or Other Electronic Component | ✅ Recognizes all types of semiconductor and electronic component products. |
| P12 | Hardware – Storage | ✅ Recognizes storage products and solutions, for both B2B and consumer. |
| P13 | Hardware – Other | ✅ Recognizes computer-related hardware products that don't fit into other hardware categories. |
| P14 | Health & Pharmaceuticals – Product | ✅ Recognizes tangible health and pharmaceutical products, for trade or consumer. |
| P15 | Health & Pharmaceutical – Service | ✅ Recognizes health and pharmaceutical-related services, for trade or consumer. |
| P16 | Industrial Products & Services | ✅ Recognizes all types of industrial products and services used in manufacturing, logistics, etc., except for software solutions. |
| P17 | Media & Entertainment – Product | ✅ Recognizes tangible media or entertainment products, for trade or consumer. |
| P18 | Media & Entertainment – Service | ✅ Recognizes media or entertainment services, for trade or consumer. |
| P19 | Sustainability-Focused Product | ✅ Honors consumer-facing products that reduce environmental impact through eco-design, recyclable packaging, renewable materials, or carbon-neutral manufacturing. |
| P20 | Telecommunications – Product | ✅ Recognizes tangible telecommunications-related products. |
| P21 | Telecommunications – Service | ✅ Recognizes telecommunications services, for trade or consumer. |
| P22 | Transportation | ✅ Recognizes transportation-related products and services, for trade or consumer. |
| P23 | Voice Technology | ✅ Recognizes products that utilize voice-enabled interfaces or voice-first design for consumer or enterprise use cases, such as virtual assistants, voice commerce, or accessibility solutions. |

### Technology Solution sub-group

| Code | Name | Description |
|------|------|-------------|
| P24 | API Management Solution | ✅ Recognizes the best platforms that create a centralized API architecture making the process of creating, securing, deploying and managing high-performance interfaces significantly simpler and more consistent. |
| P25a | AI/ML Solution – Financial | ✅ Recognizes AI/ML solutions enabling intelligent behavior in complex financial situations to solve problems, communicate with people, and interact with financial data. |
| P25b | AI/ML Solution – Generative (audio, graphics, text, video) | ✅ Recognizes generative AI solutions that produce audio, graphics, text, or video content. |
| P25c | AI/ML Solution – Healthcare | ✅ Recognizes AI/ML solutions that exhibit intelligent behavior in complex healthcare situations to improve patient outcomes, diagnostics, or care delivery. |
| P25d | AI/ML Solution – Other | ✅ Recognizes AI/ML solutions that enable computer-based systems to exhibit intelligent behavior in complex situations not covered by other AI subcategories. |
| P26 | Big Data & Reporting Analytics Solution | ✅ Recognizes the best solutions for reporting and analyzing actionable intelligence from massive data sets, or the best platform for enabling organizations to develop, deploy, operate and manage a big data infrastructure. |
| P27 | Blockchain Solution | ✅ Recognizes the best solutions for creating and managing shared, immutable ledgers for recording the history of transactions. |
| P28 | Business Information or Data Delivery Solution | ✅ Recognizes the best information solutions that help professionals with their daily job functions including strategy, business development, sales, marketing, research. Solutions could include business/industry news, market research, business directories, financial data, analyst reports, competitive intelligence, etc. |
| P29 | Business or Competitive Intelligence Solution | ✅ Recognizes the best solutions for reporting and analyzing data into useful business information, or the best platform for enabling enterprises to build BI into their applications. |
| P30 | Cloud Application/Service | ✅ Recognizes the best solutions that operate in the cloud. |
| P31 | Cloud ERP Solution | ✅ Recognizes the best cloud platforms for collecting, storing, managing and interpreting data from many business activities including finance, HR, product planning, purchasing, manufacturing, and service delivery. |
| P32 | Cloud Infrastructure | ✅ Recognizes the best infrastructure solutions for the deployment of cloud-based offerings. |
| P33 | Cloud Platform | ✅ Recognizes the best overall platforms for the deployment of cloud-based offerings. |
| P34 | Cloud Storage & Backup Solution | ✅ Recognizes the best cloud-based solutions for storing and/or backing up data. Includes block storage, file storage, backup, archive, disaster recovery, and encryption. |
| P35 | Collaboration/Social Networking Solution | ✅ Recognizes the best applications that aid collaboration, communication, file sharing and problem-solving for teams working together over geographic distances. |
| P36 | Compliance Solution | ✅ Recognizes the best compliance solution to address regulatory rules, ethics, sustainability and governance, connecting regulatory developments with internal policy systems, organizational risks and controls, and regulatory training. |
| P37 | Construction Management Solution | ✅ Recognizes the best software solutions that manage construction projects, resources, and teams to increase efficiency and productivity. |
| P38 | Content Management Solution | ✅ Recognizes the best tools, platforms, or services that allow users to sort through vast amounts of content and present it in a meaningful and organized way. |
| P39 | Corporate Learning/Workforce Development Solution | ✅ Recognizes the best platforms that support organizations in educating employees about specific knowledge that aids in the successful execution of their jobs. Includes applications that educate on internal processes, practices, expectations, and objectives. |
| P40 | Customer Data Platform | ✅ Recognizes the best CDP marketer-managed systems that offer a persistent, unified customer database accessible to other systems, creating a comprehensive view of each customer by capturing data from multiple systems. |
| P41 | Customer Education LMS | ✅ Recognizes the best customer education or extended enterprise Learning Management Systems that help users engage with the product and elevate customer engagement. |
| P42 | Customer Service Solution | ✅ Recognizes the best tools, platforms, or services that help businesses enhance their customer service and support. Includes help-desk services, live chat, social media tools, technology-enabled service providers, etc. |
| P43 | Cybersecurity Solution | ✅ Recognizes the best tools and services that help to protect organizations from cyber attacks. |
| P44 | Data Tools & Platforms | ✅ Recognizes platforms that best enable organizations to develop, deploy, operate and manage a big data infrastructure including deep analytics, AI and machine learning. |
| P45 | DevOps Solution | ✅ Recognizes the best solutions that aid in unifying software development (Dev) and software operation (Ops) by promoting automation and monitoring at all steps of software construction. |
| P46 | Digital Asset Management Solution | ✅ Recognizes the best solutions that store, organize, and distribute digital assets and rich media files in a central location. Assets may include photos, creative files, video, audio, presentations, documents, and data. |
| P47 | Digital Employee Experience | ✅ Recognizes the best services, solutions, products or tools that optimize digital employee experience across every touchpoint by leveraging workplace analytics, user sentiment analytics and automation. |
| P48 | Digital Process Automation Solution | ✅ Recognizes the best solutions that create process applications to automate complex workflows and digital business processes. |
| P49 | Electronic Commerce Solution | ✅ Recognizes the best software solutions designed to facilitate the purchase of products and services online. Includes credit card processing, personalization tools, shopping carts, order forms, delivery/shipping management, etc. |
| P50 | Emerging Technology | ✅ Recognizes the best emerging technology products, tools or solutions that are solving big problems, changing the status quo and opening up new opportunities. Products must be less than three years old or have a new version including disruptive technology. |
| P51 | Endpoint Security Management Solution | ✅ Recognizes the best solutions that require endpoint devices to comply with specific criteria before granting access to network resources. Includes antivirus, antispyware, personal firewall, host intrusion prevention, file/disk encryption, endpoint DLP, etc. |
| P52 | ERP Solution | ✅ Recognizes the best platforms for collecting, storing, managing and interpreting data from many business activities including finance, inventory management, HR, product planning, purchasing, manufacturing, and service delivery. |
| P53 | Event Management Solution | ✅ Recognizes the best solutions for managing the production and execution of events. Includes registration, payment processing, sponsor and attendee management, event marketing, reporting, event program, budgeting, etc. |
| P54 | Financial Management Solution | ✅ Recognizes the best software solutions that automate business accounting and money management including accounts payable/receivable, general ledger, budgeting, resource allocation, reporting, etc. |
| P55 | Financial & Market Data Solution | ✅ Recognizes the best Financial & Market Data Solutions for professionals in financial and capital markets. Solutions may provide financial/market data, real-time data services, reference data, financial news, market analysis, credit services, capital markets, commodities, foreign exchange, fixed income, and M&A information. |
| P56 | FinTech Solution | ✅ Recognizes the best solutions to make financial services more efficient through incremental or radical/disruptive innovation in applications, processes, products or business models. Includes financing, insurance, investments, payments, advisory, security, etc. |
| P57 | Governance, Risk & Compliance Solution | ✅ Recognizes the best software solutions that provide a structured and systematic approach to ensure proper governance, manage risks and ensure compliance across an organization. |
| P58 | Healthcare Technology Solution | ✅ Recognizes the best solutions for improving care quality, patient safety, efficiency, medical information and/or data exchange to healthcare professionals or consumers. |
| P59 | Human Capital or Talent Management Solution | ✅ Recognizes the best solutions that automate any aspect of HR management and talent acquisition, including HRIS, benefits administration, recruiting, payroll, and performance appraisal. |
| P60 | Identity & Access Security Solution | ✅ Recognizes the best solutions that enable the right individuals to access the right resources at the right times and for the right reasons. |
| P61 | Industry CRM Solution | ✅ Recognizes solutions that best help organizations manage, streamline and optimize every aspect of the sales cycle, from inquiries and orders to invoicing and payments. |
| P62 | Infrastructure as a Service | ✅ Recognizes the best solutions for providing infrastructure as a service, including infrastructure, provisioning, security, reporting/controls, storage, and backup in a seamless, scalable, and flexible manner. |
| P63 | Insurance Solution | ✅ Recognizes the best solutions for managing any aspect of the insurance industry, from billing and policy operations to solutions for agents, underwriters, shoppers and insureds. |
| P64 | Knowledge Center/Help Site | ✅ Recognizes the best all-in-one platforms that provide support and self-service across channels, for both customers and/or employees. Entries can be enterprise help sites, knowledge centers, customer or employee support portals. |
| P65 | Lead Generation Solution | ✅ Recognizes the best solutions that enable organizations to efficiently collect, manage, grade, distribute and respond to sales leads. |
| P66 | Legal Solution | ✅ Recognizes the best information-based solutions designed for the legal professional. |
| P67 | Manufacturing Solution | ✅ Recognizes the best solutions used in manufacturing, offering features including accounting integration, estimation, inventory management, work order flexibility, bill of materials replication, production stage management, packing slip generation, etc. |
| P68 | Marketing/Public Relations Solution | ✅ Recognizes the best solutions that enable companies to target, measure, and market products and services online, on mobile devices, and offline. Solutions can include SEO, SEM, social media, display advertising, content marketing automation, campaign management, and mobile marketing. |
| P69 | Mobile Development Solution | ✅ Recognizes the best tools or resources for designing, creating or testing mobile applications. Includes programming languages, toolkits, diagnostic programs, IDE, applet and plug-in development tools, database development programs, etc. |
| P70 | Mobile On-Demand Application | ✅ Recognizes the best mobile applications for B2B users or consumers. |
| P71 | Mobile Operations Management Solution | ✅ Recognizes the best solutions for managing the deployment and operations of products and services offered for mobile use by B2B users or consumers. |
| P72 | Network Security Solution | ✅ Recognizes the best solutions for preventing and monitoring unauthorized access, misuse, modification, or denial of a computer network. Includes firewall, intrusion prevention and detection, unified threat management, VPN, etc. |
| P73 | No-Code/Low-Code Platform | ✅ Recognizes the best No-Code/Low-Code solutions that allow users to create applications with little knowledge of traditional programming languages or development work. |
| P74 | Operations Management Solution | ✅ Recognizes the best solutions for joining financial, contractual, licensing, and inventory functions to support the technology environment. |
| P75 | Payments Solution | ✅ Recognizes the best solutions for processing and/or facilitating payments. |
| P76 | Personal Information Regulatory Compliance Solution | ✅ Recognizes the best solutions for management of regulatory compliance as technology affects controller/processor relationships, data subject access requests, risk mitigation, and ongoing logging and documentation in domestic and cross-border environments. |
| P77 | Platform as a Service | ✅ Recognizes the best PaaS platforms that increase speed of application development, reduce cost of development, automate deployment, and provide flexibility and scalability. |
| P78 | Project Management Solution | ✅ Recognizes the best business solutions that automate any aspect of managing project-based business activities. Includes estimation and planning, scheduling, cost control and budget management, resource allocation, collaboration, etc. |
| P79 | Relationship Management Solution | ✅ Recognizes the best software solutions designed to expand a company's knowledge about and relationship with its current or potential customers and/or partners. Includes CRM, PRM, SFA, marketing automation, personalization products and services. |
| P80 | Remote Working Solution | ✅ Recognizes the best technology-based solutions that aid collaboration, communication, file sharing, and the process of managing, engaging, empowering, and problem-solving for teams working together over geographic distances. |
| P81 | Service Management Solution | ✅ Recognizes the best solutions that align the delivery of technology services with the needs of the business to deliver best services to employees and clients. |
| P82 | Social Business Solution | ✅ Recognizes the best solutions for managing and monitoring social media campaigns, building and engaging customers, and collecting and analyzing data across multiple social networks. |
| P83 | Software Defined Infrastructure | ✅ Recognizes the best solutions for creating technical computing infrastructure entirely under software control with no operator or human intervention. |
| P84 | Software Development Solution | ✅ Recognizes the best tools or resources for designing, creating or testing software applications. Includes programming languages, toolkits, diagnostic programs, IDE, applet and plug-in development tools, database development programs, etc. |
| P85 | Subscription Billing Solution | ✅ Recognizes the best solutions to help companies manage all aspects of the subscription lifecycle including onboarding, subscription sales, pricing and packaging, recurring billing, auto-renewing, paywall management, invoicing, reporting, and financial management. |
| P86 | Supply Chain Management Solution | ✅ Recognizes the best solutions for coordination and collaboration with suppliers, intermediaries, third-party service providers, and customers in the movement and storage of materials and finished goods from origin to consumption. |
| P87 | Upskilling/Workforce Learning Solution | ✅ Recognizes upskilling or workforce education solutions that increase opportunities for aspiring or existing workers to grow their careers through education, mentoring, certifications and/or training. |
| P88 | Virtual Event Technology Solution | ✅ Recognizes the best solutions for managing the production and execution of virtual events. Includes registration and ticketing, payment processing, sponsor and attendee management, event marketing, reporting, event program, budgeting, etc. |
| P89 | Wellness Solution | ✅ Recognizes the best solutions that promote wellness and wellbeing by applying technology in innovative ways to help employees thrive in their work and daily lives. |
| P90 | Work Management Platform | ✅ Recognizes the best digital tools that allow users to plan, track, organize, and review both projects and non-project tasks to improve business results and team performance. |
| P91 | Other Technology Solution | ✅ Recognizes the best business technology products and solutions that don't fit into one of the many other technology solution categories listed here. |

### Education & EdTech sub-group
**Group description:** Recognizes applications, products and services from developers of educational software, digital content, online learning services, and related technologies across the K-20 sector.

> Agent: Fetch full descriptions directly from `mobile.stevieawards.com/aba/new-product-awards-categories` — all S01–S20+ categories have full descriptions on the page.

---

## ══════════════════════════════
## GROUP 15: Podcast Categories
## Code prefix: Z0x
## ══════════════════════════════

**Group description:** Recognizing best podcasts in the USA since the beginning of 2024.
**Entry format:** Essay 200 words + up to 3 episode URLs or file uploads
**Nominee type:** podcast series | single episode

### Podcast Series (Z01–Z24)

| Code | Name | Description |
|------|------|-------------|
| Z01 | Series – Advice & How-To | ✅ Podcast series dedicated to guiding listeners or answering questions, including advice, explainers, and tutorials. |
| Z02 | Series – Arts & Culture | ✅ Podcast series that examine arts and culture in narrative form, interviews, and conversation. Topics include fine art, film, fashion, television, culinary experiences, popular culture, etc. |
| Z03 | Series – Business | ✅ Podcast series that examine the business world, including technology and financial matters, in narrative form, interviews, and conversation. |
| Z04 | Series – Comedy | ✅ Podcast series dedicated to comedy or the art of laughter in narrative form, stand-up, interviews, conversation or other formats. |
| Z05 | Series – Crime & Justice | ✅ Podcast series dedicated to crime and justice, including unsolved mysteries, true crime, supreme court rulings and criminal and civil cases. |
| Z06 | Series – Education | ✅ Podcast series dedicated to educational content across any subject or learning level. |
| Z07 | Series – Family & Kids | ✅ Podcast series dedicated to family life, parenting, or content aimed at children. |
| Z08 | Series – Food & Drink | ✅ Podcast series focused on food, drink, cooking, recipes, restaurants, or culinary culture. |
| Z09 | Series – Gaming | ✅ Podcast series covering video games, board games, esports, game development, or gaming culture. |
| Z10 | Series – Health & Wellness | ✅ Podcast series focused on physical or mental health, wellness, lifestyle, or self-care. |
| Z11 | Series – History | ✅ Podcast series that examine historical events, people, or periods in narrative form. |
| Z12 | Series – Interview/Talk Show | ✅ Podcast series primarily structured around interviews or conversation with guests. |
| Z13 | Series – Lifestyle | ✅ Podcast series covering lifestyle topics including home, fashion, relationships, self-improvement, etc. |
| Z14 | Series – Music | ✅ Podcast series devoted to discussing and/or promoting music and music culture. Includes interviews, performance, reviews, etc. |
| Z15 | Series – News & Politics | ✅ Informational podcast series focused on news topics, political happenings, and recent updates and headlines. |
| Z16 | Series – Public Service & Activism | ✅ Podcasts created to discuss or facilitate political change, public participation in civics, government policies/pursuits, or social activism. |
| Z17 | Series – Science & Education | ✅ Podcast series that examine science and education in narrative form, interviews, and conversation. |
| Z18 | Series – Scripted (Fiction) | ✅ Podcast series devoted to performing scripted fictional work for entertainment. |
| Z19 | Series – Sports | ✅ Podcast series that examine sports in narrative form, interviews, and conversation. |
| Z20 | Series – Sustainability & Environment | ✅ Podcast series focused on sustainability, including climate and environmental issues, cities and housing, and food. |
| Z21 | Series – Technology | ✅ Podcast series covering technology topics, products, trends, or the tech industry. |
| Z22 | Series – Travel | ✅ Podcast series dedicated to travel, tourism, destinations, or travel culture. |
| Z23 | Series – True Crime | ✅ Podcast series specifically focused on true crime stories, investigations, and cases. |
| Z24 | Series – Video Podcast | ✅ Podcast series that are primarily distributed and consumed as video content. |

### Single Episodes (Z25–Z48)
Same genre breakout as the Series categories above (Z25 = Arts & Culture episode, Z26 = Business episode, etc.). Use the matching Series description with "single episode" substituted for "series."

---

## ══════════════════════════════
## GROUP 16: Social Media Categories
## Code prefix: V0x
## ══════════════════════════════

**Group description:** Recognizing innovation in social media content creation and moderation, management, and marketing.
**Entry format:** Essay 625 words describing innovations since January 1 2024 + optional supporting files
**Nominee type:** social media channel | individual professional

| Code | Name | Description |
|------|------|-------------|
| V01 | Most Innovative Business Blog | ✅ Recognizes the most innovative business blog based on content quality, audience growth, engagement, and creative use of the medium since January 1 2024. |
| V03 | Most Innovative Facebook Page | ✅ Recognizes the most innovative brand or business Facebook page based on content strategy, engagement, and creative use of the platform. |
| V04 | Most Innovative Twitter / X Feed | ✅ Recognizes the most innovative brand or business Twitter/X account based on content strategy, engagement, and creative use of the platform. |
| V05 | Most Innovative Instagram Feed | ✅ Recognizes the most innovative brand or business Instagram presence based on content strategy, visual creativity, and audience engagement. |
| V06 | Most Innovative YouTube Channel | ✅ Recognizes the most innovative brand or business YouTube channel based on content quality, production value, and audience growth. |
| V07 | Most Innovative TikTok Channel | ✅ Recognizes the most innovative brand or business TikTok presence based on content creativity, trend use, and audience growth. |
| V08 | Most Innovative Use of Social Media | ✅ Celebrates unique strategies using social media platforms for brand growth or engagement across one or more platforms. |
| V10 | Best Business Influencer of the Year | ✅ Recognizes the individual who has been the most effective and innovative business influencer on social media. |
| V11 | Best Business Blogger of the Year | ✅ Recognizes the individual who has produced the most innovative and effective business blog. |
| V12 | Most Innovative Content Creator of the Year | ✅ Honors content creators who have used social media platforms to generate innovative content that resonates with audiences and drives brand engagement. |
| V13 | Most Innovative Social Media Strategist of the Year | ✅ Recognizes the best social media strategist who has driven innovation through social media strategies, content creation, or platform utilization. |
| V14 | Social Media Community Builder of the Year | ✅ Recognizes individuals or professionals who have excelled at building and nurturing communities on social media platforms, whether for brands, causes, or audiences. |
| V15 | Social Media Manager of the Year | ✅ Recognizes the individual who has been the most effective and innovative social media manager in the USA. |

---

## ══════════════════════════════
## GROUP 17: Support Categories
## Code prefix: L0x (shared with HR — note: these are different)
## ══════════════════════════════

**Group description:** Recognizing achievements in all administrative support, production support, security, maintenance, research functions NOT addressed by other category groups. NOT for customer service nominations — those have their own group.
**Entry format:** Essay 650 words + 150-word bullet list + optional files
**Nominee type:** department | team

| Code | Name | Description |
|------|------|-------------|
| L01 | Support Department of the Year | ✅ For organizations wishing to recognize the recent achievements of everyone who works in support functions — regardless of function, location, seniority or position. |
| L02 | Support Team of the Year | ✅ For organizations wishing to recognize a subset of their entire support organization, such as a specific maintenance, research, security, or production support team. The team may be multidisciplinary, may stretch across multiple organizations, and may be a permanent or temporary team. |

---

## ══════════════════════════════
## GROUP 18: Sustainability Categories
## Code prefix: U0x
## ══════════════════════════════

**Group description:** Recognizing innovative achievements in resource and environmental sustainability since the beginning of 2024.
**Entry format:** Essay 625 words + optional supporting files
**Nominee type:** organization | individual | product | program | campaign

| Code | Name | Description |
|------|------|-------------|
| U01 | Building Sustainable Supply Chains | ✅ This category recognizes innovation in the building of sustainable supply chains. |
| U02 | Climate Adaptation Initiative | ✅ This category recognizes campaigns that address sustainable adaptation to new climate conditions. |
| U03 | Climate Hero of the Year | ✅ This category recognizes innovative individuals who have actively committed themselves to climate protection and combating climate change. |
| U04 | Climate Protection and Sustainability Campaign of the Year | ✅ This category honors special campaigns or programs that are dedicated to climate protection and sustainability. |
| U05 | Conserve Resources | ✅ Recognizing innovations to conserve resources in hardware and software development by making products more compact and continually improving technologies for consumables and printer drivers. |
| U06 | Most Impactful Sustainability Partnership | ✅ Celebrates partnerships between organizations, sectors, or communities that resulted in significant environmental, climate, or social sustainability outcomes. |
| U07 | Net Zero Strategy of the Year | ✅ Recognizing organizations that have developed and implemented impactful strategies to achieve net zero carbon emissions. |
| U08 | Products in the Area of Sustainability & Climate Protection | ✅ Innovative products that improve sustainability, reduce emissions or are more environmentally friendly than standard alternatives on the market. |
| U09 | Project of the Year in the Area of Nature & Biological Diversity | ✅ This category recognizes projects and campaigns that make important contributions in the area of nature and biological diversity — such as renaturation measures, promotion of biodiversity, etc. |
| U10 | Reuse and Recycle | ✅ Recognizing innovations to extend the useful life of components, reduce parts that end up in waste, and develop products that make disassembly and reuse easier. |
| U11 | Saving Energy | ✅ Recognizing initiatives to increase energy efficiency and make optimal use of savings opportunities through professional energy management in order to conserve resources and protect the environment. |
| U12 | Sustainable Business Models | ✅ Business models that aim to act sustainably, for example by reducing energy consumption and greenhouse gas emissions. |
| U13 | Sustainable Packaging Innovation of the Year | ✅ Honoring innovative approaches to sustainable packaging, including recyclable, biodegradable, or reusable designs. |
| U14 | Sustainability & Climate Protection Services | ✅ Services that improve sustainability, reduce emissions or are more environmentally friendly than market alternatives. |
| U15 | Sustainability Initiative of the Year | ✅ Honors specific sustainability initiatives or projects launched or completed since January 1 2024. |
| U16 | Sustainability Leadership Award | ✅ Recognizes organizations that have demonstrated that sustainability is a core business objective, deeply embedded in company culture. |

---

## ══════════════════════════════
## GROUP 19: Thought Leadership Categories
## Code prefix: W0x
## ══════════════════════════════

**Group description:** Recognizing organizations and individuals for their thought leadership-related achievements since January 1 2024.
**Entry format (W01):** 3 essays — history (200w), achievements (250w), significance (250w)
**Entry format (W02):** 4 essays — launch date, genesis (250w), development (250w), results (250w)
**Entry format (W03):** 3 essays — history (200w), achievements (250w), significance (250w)
**Nominee type:** organization | campaign | individual

| Code | Name | Description |
|------|------|-------------|
| W01 | Achievement in Thought Leadership | ✅ Recognizes the achievements since January 1 2024 of organizations in the USA that have taken active measures to develop their executives and employees as thought leaders and promote their thought leadership to audiences inside and outside the organization. |
| W02 | Thought Leadership Campaign of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services / e Association, Government or Non-Profit) | ✅ Recognizes the achievements since January 1 2024 of thought leadership programs and campaigns created and performed in the USA. |
| W03 | Thought Leader of the Year (subs: a Business Products / b Business Services / c Consumer Products / d Consumer Services / e Association, Government or Non-Profit — no fee for sub e) | ✅ Recognizes the achievements since January 1 2024 of individuals who have demonstrated excellence in thought leadership on behalf of themselves and/or their organizations. |

---

## ══════════════════════════════
## GROUP 20: Video Categories
## Code prefix: H0x
## ══════════════════════════════

**Group description:** Recognizing excellence in videos first released or made public since January 1 2024.
**Entry format:** Essay 200 words describing the video's purpose and results + video URL or file attachment
**Nominee type:** product (video)

| Code | Name | Description |
|------|------|-------------|
| H01 | Video – Automotive | ✅ Videos related to the automotive industry including cars, trucks, motorcycles, and automotive services. |
| H02 | Video – Beauty, Fashion & Lifestyle | ✅ Videos focused on beauty, fashion, and lifestyle content for brands or individuals. |
| H03a | Video – Branded Entertainment (B2B) | ✅ Branded entertainment videos targeting business audiences. |
| H03b | Video – Branded Entertainment (Consumer) | ✅ Branded entertainment videos targeting consumer audiences. |
| H04 | Video – Cause Marketing | ✅ Videos created to promote a social cause as part of a marketing initiative. |
| H05 | Video – Charitable | ✅ Videos produced on behalf of charitable or non-profit organizations. |
| H06 | Video – Corporate Social Responsibility | ✅ Videos that communicate an organization's CSR commitments, initiatives, and impact. |
| H07 | Video – Corporate Overview | ✅ Videos that provide an overview or profile of an organization, its history, products, or services. |
| H08 | Video – Customer Testimonial or Review | ✅ Videos featuring authentic customer testimonials or product/service reviews. |
| H09 | Video – Diversity & Inclusion | ✅ Videos that promote diversity, equity, and inclusion within organizations or communities. |
| H10 | Video – Documentary | ✅ Documentary-style videos that tell a factual, narrative-driven story about a person, organization, or event. |
| H11 | Video – Educational Institution | ✅ Videos produced by or for educational institutions to promote their programs, achievements, or community. |
| H12 | Video – Events & Livestreams | ✅ Videos produced to document, promote, or livestream events. |
| H13 | Video – Financial Services / Banking | ✅ Videos produced by or for financial services and banking organizations. |
| H14 | Video – Fitness, Health & Wellness | ✅ Videos focused on fitness, health, and wellness topics, products, or services. |
| H15 | Video – Food & Drink | ✅ Videos related to food, beverages, cooking, or culinary culture. |
| H16 | Video – Games | ✅ Videos related to video games, gaming culture, or game launches. |
| H17 | Video – Government Relations | ✅ Videos produced for government relations, public affairs, or civic communication purposes. |
| H18 | Video – Influencer & Celebrity | ✅ Videos featuring influencers or celebrities as part of a brand or marketing campaign. |
| H19 | Video – Internal/Employee Communications | ✅ Videos produced for internal audiences such as employees, intended to inform, motivate, or train. |
| H20 | Video – Kids & Family | ✅ Videos produced for children and family audiences. |
| H21 | Video – Low Budget (up to $25,000) | ✅ Videos produced with a budget of no more than $25,000, demonstrating that impactful video content can be created cost-effectively. |
| H22 | Video – Motivational | ✅ Videos intended to inspire and motivate their audience toward a goal, action, or mindset. |
| H23 | Video – Music | ✅ Videos with music as a primary component, including music-led advertising or content. |
| H24 | Video – Music Video | ✅ Professionally produced music videos for musical artists or bands. |
| H25 | Video – News & Politics | ✅ Videos focused on news reporting, political communication, or public affairs content. |
| H26 | Video – Not-for-Profit | ✅ Videos produced by or for non-profit organizations to communicate their mission and impact. |
| H27 | Video – Orientation | ✅ Videos produced to orient new employees, students, or members to an organization or institution. |
| H28 | Video – Pharmaceutical | ✅ Videos produced by or for pharmaceutical companies for patient education, product promotion, or HCP communication. |
| H29 | Video – P.R.: Annual Reports | ✅ Videos produced as part of annual report communications. |
| H30 | Video – P.R.: Government | ✅ Videos produced for government public relations or communications. |
| H31 | Video – P.R.: Industrial | ✅ Videos produced for public relations purposes in industrial sectors. |
| H32 | Video – P.R.: Media & Entertainment | ✅ Videos produced for PR purposes in media and entertainment. |
| H33 | Video – P.R.: Non-profit Fund Raising | ✅ Videos produced to support non-profit fundraising campaigns. |
| H34 | Video – P.R.: Other | ✅ PR videos that do not fit into any of the other P.R. subcategories. |
| H35 | Video – P.R.: Technology | ✅ Videos produced for PR purposes in the technology sector. |
| H36 | Video – Public Service & Activism | ✅ Videos that promote public service, civic engagement, or social and political activism. |
| H37 | Video – Sales: Direct Response Marketing | ✅ Sales videos designed to elicit a direct response or action from viewers. |
| H38 | Video – Sales: Government | ✅ Sales videos targeting government procurement or public sector decision-makers. |
| H39 | Video – Sales: Industrial | ✅ Sales videos targeting industrial or manufacturing sector buyers. |
| H40 | Video – Sales: Media & Entertainment | ✅ Sales videos targeting media and entertainment industry buyers. |
| H41 | Video – Sales: Other | ✅ Sales videos that do not fit into any of the other sales video subcategories. |
| H42 | Video – Sales: Technology | ✅ Sales videos targeting technology sector buyers. |
| H43 | Video – Sales: Product Sales | ✅ Sales videos focused on direct product sales. |
| H44 | Video – Sales: Service Sales | ✅ Sales videos focused on selling services rather than physical products. |
| H45 | Video – Science & Technology | ✅ Videos focused on science and technology topics, discoveries, or innovations. |
| H46 | Video – Security/Safety | ✅ Videos related to security, safety, or risk management topics. |
| H47 | Video – Short-Form Series (Under 3 Minutes per Episode) | ✅ A series of short videos, each under 3 minutes in length, designed for digital distribution. |
| H48 | Video – Training | ✅ Videos produced to train employees, students, or other learners on specific skills, processes, or knowledge. |

---

## ══════════════════════════════
## GROUP 21: Web Achievement Categories
## Code prefix: T0x
## ══════════════════════════════

**Group description:** Recognizing achievement in websites and blogs. These categories recognize web-related achievements since the beginning of 2024 — technical improvements, creative enhancements, redesigns, increased visibility, user engagement, etc.
**Entry format:** Essay 2000 chars describing web achievements since Jan 2024 + supporting URLs/files
**Nominee type:** product (website or blog)

### Industry Categories (T10–T43)
> ⚠️ T10–T43 are ALL industry labels with no individual descriptions. ENRICH each.
> Context for enrichment: nominee = "website or blog belonging to an organization in this industry", judges evaluate web-specific achievements (redesign, UX, content, SEO, engagement growth, technical innovation) not general company performance.

| Code | Industry | Status |
|------|----------|--------|
| T10 | Web Achievement – Accounting | ⚠️ ENRICH |
| T11 | Web Achievement – Advertising, Marketing, & Public Relations | ⚠️ ENRICH |
| T12 | Web Achievement – Aerospace & Defense | ⚠️ ENRICH |
| T13 | Web Achievement – Automotive & Transport Equipment | ⚠️ ENRICH |
| T14 | Web Achievement – Banking | ⚠️ ENRICH |
| T15 | Web Achievement – Business Services | ⚠️ ENRICH |
| T16 | Web Achievement – Chemicals | ⚠️ ENRICH |
| T17 | Web Achievement – Computer Hardware | ⚠️ ENRICH |
| T18 | Web Achievement – Computer Software | ⚠️ ENRICH |
| T19 | Web Achievement – Computer Services | ⚠️ ENRICH |
| T20 | Web Achievement – Conglomerates | ⚠️ ENRICH |
| T21 | Web Achievement – Consumer Products (Durables) | ⚠️ ENRICH |
| T22 | Web Achievement – Consumer Products (Non-Durables) | ⚠️ ENRICH |
| T23 | Web Achievement – Diversified Services | ⚠️ ENRICH |
| T24 | Web Achievement – Electronics | ⚠️ ENRICH |
| T25 | Web Achievement – Energy | ⚠️ ENRICH |
| T26 | Web Achievement – Financial Services | ⚠️ ENRICH |
| T27 | Web Achievement – Food & Beverage | ⚠️ ENRICH |
| T28 | Web Achievement – Health Products & Services | ⚠️ ENRICH |
| T29 | Web Achievement – Hospitality & Leisure | ⚠️ ENRICH |
| T30 | Web Achievement – Insurance | ⚠️ ENRICH |
| T31 | Web Achievement – Legal | ⚠️ ENRICH |
| T32 | Web Achievement – Manufacturing | ⚠️ ENRICH |
| T33 | Web Achievement – Materials & Construction | ⚠️ ENRICH |
| T34 | Web Achievement – Media & Entertainment | ⚠️ ENRICH |
| T35 | Web Achievement – Metals & Mining | ⚠️ ENRICH |
| T36 | Web Achievement – Non-Profit Organizations | ⚠️ ENRICH |
| T37 | Web Achievement – Pharmaceuticals | ⚠️ ENRICH |
| T38 | Web Achievement – Real Estate | ⚠️ ENRICH |
| T39 | Web Achievement – Retail | ⚠️ ENRICH |
| T40 | Web Achievement – Telecommunications | ⚠️ ENRICH |
| T41 | Web Achievement – Transportation | ⚠️ ENRICH |
| T42 | Web Achievement – Travel / Lifestyle | ⚠️ ENRICH |
| T43 | Web Achievement – Utilities | ⚠️ ENRICH |

### Specialty Categories (T44–T60)

| Code | Name | Description |
|------|------|-------------|
| T44 | Achievement in Accessibility | ✅ This category recognizes sites for their use of features and technologies to ensure that they are perceivable, operable, understandable, and robust. |
| T45 | Achievement in Data Visualization | ✅ Only data visualization aspects of a site will be judged. Websites that demonstrate best-in-class use of data visualization by representing complex datasets in innovative, visually appealing, and easily comprehensible ways. |
| T46 | Achievement in Email Newsletters | ✅ Recognizes outstanding email newsletter programs delivered since January 1 2024, judged on design, content quality, engagement rates, and innovation. |
| T47 | Achievement in Navigation/Structure | ✅ Sites that offer the best possible user experience through superior navigation and site structure. Only information architecture will be judged. |
| T48 | Achievement in Online Training | ✅ Recognizes websites or web-based platforms that deliver outstanding online training content, experiences, or results. |
| T49 | Achievement in Personal Blog or Website | ✅ Recognizes outstanding personal blogs or websites run by individuals, judged on content, design, engagement, and impact. |
| T50 | Achievement in User Experience | ✅ Recognizes websites that deliver an outstanding overall user experience through design, functionality, and usability. |
| T51 | Achievement in User Interface Design | ✅ Recognizes websites with outstanding user interface design. |
| T52 | Achievement in the Use of AI | ✅ Recognizes innovative uses of AI and generative media tools on websites and blogs. |
| T53 | Achievement in Web Writing/Content | ✅ Recognizes outstanding writing and editorial content published on a website or blog since January 1 2024. |
| T54 | Achievement in Web Design | ✅ Recognizes outstanding overall web design combining aesthetics, usability, and innovation. |
| T55 | Achievement in the Use of Photography | ✅ Recognizes websites that make exceptional use of photography as a core element of their design or content. |
| T56 | Achievement in the Use of Video or Moving Image | ✅ Recognizes websites that make exceptional use of video or animated/moving image content. |
| T57 | Technical Achievement of the Year | ✅ For any site that sets an industry standard by using new, innovative web technology in an outstanding way that improves the overall experience. |
| T58 | Achievement in Mobile User Experience | ✅ Recognizes websites or web applications that deliver an outstanding user experience on mobile devices. |
| T59 | Achievement in Mobile User Interface | ✅ Recognizes websites or web applications with outstanding user interface design specifically for mobile devices. |
| T60 | Achievement in Responsive Design for Mobile | ✅ Recognizes websites that demonstrate excellence in responsive design, ensuring optimal display and usability across all mobile screen sizes. |

---

## ══════════════════════════════
## GROUP 22: Publication Categories
## Code prefix: F0x
## ══════════════════════════════

**Group description:** Recognizing excellence in annual reports, marketing and sales kits, newsletters, house organs (corporate magazines), and other publications issued since January 1 2024.
**Entry format:** Essay 200 words describing the publication's purpose and results + electronic version link or file upload
**Nominee type:** product (publication)

| Code | Name | Description |
|------|------|-------------|
| F01 | Best Annual Report (subs: a Publicly-Held Corps / b Privately-Owned Companies / c Government Agencies / d Non-Profit Organizations / e Associations) | ✅ Recognizes the best annual report in each organizational category. |
| F02 | Best Marketing or Sales Brochure or Kit | ✅ Recognizes the best marketing or sales brochure or kit issued since January 1 2024. |
| F03 | Best House Organ – internal publication (subs: a General Audience / b Employees / c Business Customers / d Public Enterprise/Gov/Association Customers) | ✅ Recognizes the best internal corporate publication (house organ/corporate magazine) issued since January 1 2024. |
| F04 | Best Newsletter (subs: a General Audience / b Employees / c Business Customers / d Public Enterprise/Gov/Association Customers) | ✅ Recognizes the best newsletter in each audience category issued since January 1 2024. |
| F05 | Other Publication (subs: a Company / b Government / c Association or Non-Profit / d Public Relations) | ✅ Recognizes outstanding publications that don't fit into other publication categories. |
| F06 | Best E-Book | ✅ All e-books published by persons or organizations in the USA since January 1 2024, dealing with a subject related to business — finance, careers, professional education, training, business journalism, corporate history, personal growth, etc. |
| F07 | Best Business Book | ✅ All books published by persons or organizations in the USA since January 1 2024, dealing with a subject related to business — finance, careers, professional education, training, business journalism, corporate history, personal growth, etc. Up to 250 words may be submitted. |
| F08 | Best Integrated Report (Annual + Sustainability) | ✅ Honors publications that combine traditional annual financial reporting with sustainability/ESG disclosures in a unified format. Judging will consider transparency, structure, and the effectiveness of presenting both financial and non-financial performance in one report. |
| F09 | Best Interactive Digital Publication | ✅ Recognizes excellence in interactive publications designed primarily for digital use — such as multimedia-rich e-brochures, microsites, or mobile-optimized publications. Entries will be evaluated on design, innovation, interactivity, user experience, and clarity of communication. |
| F10 | Best Sustainability Report | ✅ Recognizes annual or standalone sustainability/ESG reports that highlight an organization's environmental, social, and governance initiatives. Entries may include print or digital reports published since January 1 2024. |
| F11 | Best White Paper or Research Report | ✅ Recognizes outstanding white papers or research reports published since January 1 2024 that provide valuable insight, analysis, or thought leadership on a business topic. |

---

# SUMMARY: ABA ENRICH COUNT

| Group | Total entries | Needs LLM Enrichment |
|-------|--------------|---------------------|
| Company of the Year (B01–B45) | ~135 (45 × 3 sizes) | ✅ All 135 |
| Achievement in Management (A01–A35) | ~37 (incl. A09 split) | ✅ All 37 |
| Entrepreneur (D01–D35) | ~36 (incl. D09 split) | ✅ All 36 |
| Web Achievement Industry (T10–T43) | 34 | ✅ All 34 |
| All other groups | ~500+ | ✅ 0 — use scraped descriptions |
| **TOTAL** | **~740+** | **~242 needing enrichment** |
