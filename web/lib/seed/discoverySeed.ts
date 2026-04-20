// TDW Session 2 — Discovery seed data
// 20 curated vendor cards. Replaces with real Supabase data once vendors onboard.
// Shape matches future vendors + vendor_images join.

export type SeedVendor = {
  id: string;
  name: string;
  city: string;
  category: 'photographer' | 'mua' | 'decorator' | 'designer' | 'venue';
  categoryLabel: string;
  priceFrom: number;   // INR
  priceLabel: string;  // display string
  tagline: string;     // one Cormorant italic line
  images: string[];    // Unsplash URLs, 5-8 per vendor
  curationNote?: string; // Swati's editorial note, optional
};

// Unsplash photo IDs curated for Indian wedding aesthetic.
// Each vendor gets 5-8 images. w=1080&q=80 for retina-ready full-bleed.
const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1080&q=80&auto=format&fit=crop`;

export const SEED_VENDORS: SeedVendor[] = [
  // ─── PHOTOGRAPHERS ─────────────────────────────────────────
  {
    id: 'seed-p01',
    name: 'Arjun Kartha',
    city: 'New Delhi',
    category: 'photographer',
    categoryLabel: 'Photography',
    priceFrom: 250000,
    priceLabel: '₹2.5L onwards',
    tagline: 'Light as a love language.',
    images: [
      img('1519741497674-611481863552'),
      img('1529636798458-92182e662485'),
      img('1519225421980-715cb0215aed'),
      img('1583939003579-730e3918a45a'),
      img('1511285560929-80b456fea0bc'),
      img('1519415943484-9fa1873496d4'),
    ],
    curationNote: 'Arjun reads a room before he raises a camera.',
  },
  {
    id: 'seed-p02',
    name: 'The Wedding Salad',
    city: 'Mumbai',
    category: 'photographer',
    categoryLabel: 'Photography',
    priceFrom: 400000,
    priceLabel: '₹4L onwards',
    tagline: 'Films that feel like memory.',
    images: [
      img('1464366400600-7168b8af9bc3'),
      img('1511795409834-ef04bbd61622'),
      img('1537633552985-df8429e8048b'),
      img('1522673607200-164d1b6ce486'),
      img('1519741497674-611481863552'),
    ],
  },
  {
    id: 'seed-p03',
    name: 'Stories by Joseph Radhik',
    city: 'Bengaluru',
    category: 'photographer',
    categoryLabel: 'Photography',
    priceFrom: 600000,
    priceLabel: '₹6L onwards',
    tagline: 'Editorial. Unrepeatable.',
    images: [
      img('1583939003579-730e3918a45a'),
      img('1519225421980-715cb0215aed'),
      img('1525258946800-98cfd641d0de'),
      img('1498050108023-c5249f4df085'),
      img('1511795409834-ef04bbd61622'),
      img('1522673607200-164d1b6ce486'),
    ],
  },
  {
    id: 'seed-p04',
    name: 'House on the Clouds',
    city: 'Jaipur',
    category: 'photographer',
    categoryLabel: 'Photography',
    priceFrom: 180000,
    priceLabel: '₹1.8L onwards',
    tagline: 'Warmth, rendered in frames.',
    images: [
      img('1529636798458-92182e662485'),
      img('1464366400600-7168b8af9bc3'),
      img('1519415943484-9fa1873496d4'),
      img('1511285560929-80b456fea0bc'),
      img('1525258946800-98cfd641d0de'),
    ],
  },
  {
    id: 'seed-p05',
    name: 'Plush Affairs',
    city: 'Hyderabad',
    category: 'photographer',
    categoryLabel: 'Photography',
    priceFrom: 150000,
    priceLabel: '₹1.5L onwards',
    tagline: 'Candid, considered, kept.',
    images: [
      img('1537633552985-df8429e8048b'),
      img('1498050108023-c5249f4df085'),
      img('1464366400600-7168b8af9bc3'),
      img('1519741497674-611481863552'),
      img('1519415943484-9fa1873496d4'),
    ],
  },

  // ─── MAKEUP ARTISTS ────────────────────────────────────────
  {
    id: 'seed-m01',
    name: 'Makeup by Swati Roy',
    city: 'Mumbai',
    category: 'mua',
    categoryLabel: 'Bridal Makeup',
    priceFrom: 150000,
    priceLabel: '₹1.5L onwards',
    tagline: 'The bride, only more herself.',
    images: [
      img('1522673607200-164d1b6ce486'),
      img('1617922001439-4a2e6562f328'),
      img('1516589091380-5d8e87df6999'),
      img('1503236823255-94609f598e71'),
      img('1560472354-b33ff0c44a43'),
      img('1525258946800-98cfd641d0de'),
    ],
    curationNote: 'My own kit. You already know.',
  },
  {
    id: 'seed-m02',
    name: 'Namrata Soni',
    city: 'New Delhi',
    category: 'mua',
    categoryLabel: 'Bridal Makeup',
    priceFrom: 200000,
    priceLabel: '₹2L onwards',
    tagline: 'Skin first. Glamour follows.',
    images: [
      img('1617922001439-4a2e6562f328'),
      img('1516589091380-5d8e87df6999'),
      img('1560472354-b33ff0c44a43'),
      img('1503236823255-94609f598e71'),
      img('1522673607200-164d1b6ce486'),
    ],
  },
  {
    id: 'seed-m03',
    name: 'Savleen Kaur',
    city: 'Chandigarh',
    category: 'mua',
    categoryLabel: 'Bridal Makeup',
    priceFrom: 80000,
    priceLabel: '₹80K onwards',
    tagline: 'Punjabi bride, polished.',
    images: [
      img('1503236823255-94609f598e71'),
      img('1516589091380-5d8e87df6999'),
      img('1617922001439-4a2e6562f328'),
      img('1560472354-b33ff0c44a43'),
      img('1525258946800-98cfd641d0de'),
    ],
  },
  {
    id: 'seed-m04',
    name: 'Aashna Sachdeva',
    city: 'New Delhi',
    category: 'mua',
    categoryLabel: 'Bridal Makeup',
    priceFrom: 120000,
    priceLabel: '₹1.2L onwards',
    tagline: 'Soft, dewy, unmistakably bridal.',
    images: [
      img('1560472354-b33ff0c44a43'),
      img('1617922001439-4a2e6562f328'),
      img('1522673607200-164d1b6ce486'),
      img('1516589091380-5d8e87df6999'),
      img('1503236823255-94609f598e71'),
    ],
  },
  {
    id: 'seed-m05',
    name: 'The Glow Studio',
    city: 'Bengaluru',
    category: 'mua',
    categoryLabel: 'Bridal Makeup',
    priceFrom: 60000,
    priceLabel: '₹60K onwards',
    tagline: 'Modern brides, zero theatre.',
    images: [
      img('1516589091380-5d8e87df6999'),
      img('1503236823255-94609f598e71'),
      img('1525258946800-98cfd641d0de'),
      img('1560472354-b33ff0c44a43'),
      img('1617922001439-4a2e6562f328'),
    ],
  },

  // ─── DECORATORS ────────────────────────────────────────────
  {
    id: 'seed-d01',
    name: 'Devika Narain & Co',
    city: 'Mumbai',
    category: 'decorator',
    categoryLabel: 'Decor',
    priceFrom: 2500000,
    priceLabel: '₹25L onwards',
    tagline: 'Florals that feel found, not built.',
    images: [
      img('1519225421980-715cb0215aed'),
      img('1464366400600-7168b8af9bc3'),
      img('1464366400600-7168b8af9bc3'),
      img('1511795409834-ef04bbd61622'),
      img('1525258946800-98cfd641d0de'),
      img('1519741497674-611481863552'),
    ],
    curationNote: 'No one does restraint like Devika.',
  },
  {
    id: 'seed-d02',
    name: 'Altair Decor',
    city: 'Udaipur',
    category: 'decorator',
    categoryLabel: 'Decor',
    priceFrom: 1500000,
    priceLabel: '₹15L onwards',
    tagline: 'Palaces as they were meant to be seen.',
    images: [
      img('1464366400600-7168b8af9bc3'),
      img('1519225421980-715cb0215aed'),
      img('1519741497674-611481863552'),
      img('1529636798458-92182e662485'),
      img('1498050108023-c5249f4df085'),
    ],
  },
  {
    id: 'seed-d03',
    name: 'FS Events',
    city: 'New Delhi',
    category: 'decorator',
    categoryLabel: 'Decor',
    priceFrom: 800000,
    priceLabel: '₹8L onwards',
    tagline: 'Modern Indian, without cliché.',
    images: [
      img('1511795409834-ef04bbd61622'),
      img('1519225421980-715cb0215aed'),
      img('1529636798458-92182e662485'),
      img('1525258946800-98cfd641d0de'),
      img('1464366400600-7168b8af9bc3'),
    ],
  },
  {
    id: 'seed-d04',
    name: 'Q Events',
    city: 'Goa',
    category: 'decorator',
    categoryLabel: 'Decor',
    priceFrom: 1200000,
    priceLabel: '₹12L onwards',
    tagline: 'Coastal, candlelit, considered.',
    images: [
      img('1498050108023-c5249f4df085'),
      img('1519225421980-715cb0215aed'),
      img('1464366400600-7168b8af9bc3'),
      img('1525258946800-98cfd641d0de'),
      img('1519741497674-611481863552'),
    ],
  },
  {
    id: 'seed-d05',
    name: 'Atisuto',
    city: 'Bengaluru',
    category: 'decorator',
    categoryLabel: 'Decor',
    priceFrom: 600000,
    priceLabel: '₹6L onwards',
    tagline: 'Garden weddings, quiet and complete.',
    images: [
      img('1525258946800-98cfd641d0de'),
      img('1511795409834-ef04bbd61622'),
      img('1519225421980-715cb0215aed'),
      img('1464366400600-7168b8af9bc3'),
      img('1498050108023-c5249f4df085'),
    ],
  },

  // ─── DESIGNERS (couture) ───────────────────────────────────
  {
    id: 'seed-c01',
    name: 'Sabyasachi Mukherjee',
    city: 'Kolkata',
    category: 'designer',
    categoryLabel: 'Couture',
    priceFrom: 2500000,
    priceLabel: '₹25L onwards',
    tagline: 'Heirlooms in the making.',
    images: [
      img('1583391733956-6c78276477e2'),
      img('1594736797933-d0401ba2fe65'),
      img('1617922001439-4a2e6562f328'),
      img('1560472354-b33ff0c44a43'),
      img('1503236823255-94609f598e71'),
      img('1525258946800-98cfd641d0de'),
    ],
    curationNote: 'No one else, not even close.',
  },
  {
    id: 'seed-c02',
    name: 'Anita Dongre',
    city: 'Mumbai',
    category: 'designer',
    categoryLabel: 'Couture',
    priceFrom: 600000,
    priceLabel: '₹6L onwards',
    tagline: 'Rajputana, distilled.',
    images: [
      img('1594736797933-d0401ba2fe65'),
      img('1583391733956-6c78276477e2'),
      img('1617922001439-4a2e6562f328'),
      img('1503236823255-94609f598e71'),
      img('1560472354-b33ff0c44a43'),
    ],
  },
  {
    id: 'seed-c03',
    name: 'Tarun Tahiliani',
    city: 'New Delhi',
    category: 'designer',
    categoryLabel: 'Couture',
    priceFrom: 1500000,
    priceLabel: '₹15L onwards',
    tagline: 'Modern silhouettes, old-world soul.',
    images: [
      img('1617922001439-4a2e6562f328'),
      img('1594736797933-d0401ba2fe65'),
      img('1583391733956-6c78276477e2'),
      img('1560472354-b33ff0c44a43'),
      img('1503236823255-94609f598e71'),
    ],
  },

  // ─── VENUES ────────────────────────────────────────────────
  {
    id: 'seed-v01',
    name: 'Taj Lake Palace',
    city: 'Udaipur',
    category: 'venue',
    categoryLabel: 'Venue',
    priceFrom: 5000000,
    priceLabel: '₹50L onwards',
    tagline: 'A palace on water. Nothing to add.',
    images: [
      img('1519741497674-611481863552'),
      img('1519225421980-715cb0215aed'),
      img('1464366400600-7168b8af9bc3'),
      img('1529636798458-92182e662485'),
      img('1511795409834-ef04bbd61622'),
      img('1525258946800-98cfd641d0de'),
    ],
    curationNote: 'Book a year out. Minimum.',
  },
  {
    id: 'seed-v02',
    name: 'ITC Grand Bharat',
    city: 'Gurugram',
    category: 'venue',
    categoryLabel: 'Venue',
    priceFrom: 3000000,
    priceLabel: '₹30L onwards',
    tagline: 'Destination weddings, commute away.',
    images: [
      img('1529636798458-92182e662485'),
      img('1519741497674-611481863552'),
      img('1519225421980-715cb0215aed'),
      img('1511795409834-ef04bbd61622'),
      img('1464366400600-7168b8af9bc3'),
    ],
  },
];

// Flattened feed: each vendor's images interleaved so swipe-up moves between vendors,
// swipe-left/right moves within the same vendor's image set.
// Consumers of this module build their own feed order.

export const SEED_VENDOR_COUNT = SEED_VENDORS.length;
