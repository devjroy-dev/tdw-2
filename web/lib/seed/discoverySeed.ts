// TDW — Discovery seed data
// Uses real vendor UUIDs from Supabase vendors table
// Saving to Muse will work with these IDs

export type SeedVendor = {
  id: string;
  name: string;
  city: string;
  category: 'photographer' | 'mua' | 'decorator' | 'designer' | 'venue' | 'event_manager';
  categoryLabel: string;
  priceFrom: number;
  priceLabel: string;
  tagline: string;
  images: string[];
  curationNote?: string;
};

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1080&q=80&auto=format&fit=crop`;

export const SEED_VENDORS: SeedVendor[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    name: 'Arjun Kartha Studio',
    city: 'New Delhi',
    category: 'photographer',
    categoryLabel: 'Photography',
    priceFrom: 250000,
    priceLabel: '\u20b92.5L onwards',
    tagline: 'Light as a love language.',
    images: [
      img('1519741497674-611481863552'),
      img('1529636798458-92182e662485'),
      img('1519225421980-715cb0215aed'),
      img('1583939003579-730e3918a45a'),
      img('1511285560929-80b456fea0bc'),
    ],
    curationNote: 'Arjun reads a room before he raises a camera.',
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    name: 'Sophia Laurent Artistry',
    city: 'Mumbai',
    category: 'mua',
    categoryLabel: 'Makeup & Hair',
    priceFrom: 180000,
    priceLabel: '\u20b91.8L onwards',
    tagline: 'South Asian skin is our language.',
    images: [
      img('1522337360788-8b13dee7a37e'),
      img('1487412947147-5cebf100ffc2'),
      img('1516975080664-ed2fc6a32937'),
      img('1560066984-138daaa8de70'),
      img('1500840216050-6ffa99d75160'),
    ],
    curationNote: 'Fifteen years of bridal artistry.',
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    name: 'House of Blooms',
    city: 'Bangalore',
    category: 'decorator',
    categoryLabel: 'Decor',
    priceFrom: 150000,
    priceLabel: '\u20b91.5L onwards',
    tagline: 'Every installation is designed once, for you.',
    images: [
      img('1478146896981-b80fe463b330'),
      img('1464366400600-7168b8af9bc3'),
      img('1510076857177-7470076d4098'),
      img('1519225421980-715cb0215aed'),
      img('1511795409834-ef04bbd61622'),
    ],
    curationNote: 'Floral architecture, never repeated.',
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    name: 'Ashford Estate',
    city: 'Pune',
    category: 'venue',
    categoryLabel: 'Venue',
    priceFrom: 300000,
    priceLabel: '\u20b93L onwards',
    tagline: 'The kind of venue photographs remember.',
    images: [
      img('1519167758481-83f550bb49b3'),
      img('1464366400600-7168b8af9bc3'),
      img('1478146896981-b80fe463b330'),
      img('1583939003579-730e3918a45a'),
      img('1522673607200-164d1b6ce486'),
    ],
    curationNote: 'A heritage property on seven acres.',
  },
  {
    id: 'a1b2c3d4-0005-4000-8000-000000000005',
    name: 'Riya Mehta Couture',
    city: 'New Delhi',
    category: 'designer',
    categoryLabel: 'Designer',
    priceFrom: 85000,
    priceLabel: '\u20b985K onwards',
    tagline: 'Hand embroidered in our Delhi atelier.',
    images: [
      img('1537633552985-df8429e8048b'),
      img('1522673607200-164d1b6ce486'),
      img('1519741497674-611481863552'),
      img('1606216794074-735e91aa2c92'),
      img('1583939003579-730e3918a45a'),
    ],
    curationNote: 'No outsourcing. No shortcuts.',
  },
  {
    id: 'a1b2c3d4-0006-4000-8000-000000000006',
    name: 'The Wedding Salad',
    city: 'Mumbai',
    category: 'event_manager',
    categoryLabel: 'Event Management',
    priceFrom: 200000,
    priceLabel: '\u20b92L onwards',
    tagline: 'Obsessive about logistics so you do not have to be.',
    images: [
      img('1511795409834-ef04bbd61622'),
      img('1519741497674-611481863552'),
      img('1464366400600-7168b8af9bc3'),
      img('1529636798458-92182e662485'),
      img('1583939003579-730e3918a45a'),
    ],
    curationNote: '300+ weddings across India.',
  },
];
