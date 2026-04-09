const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'The Dream Wedding API is live 🎉' });
});

// ==================
// VENDOR ROUTES
// ==================

// Get all vendors (with optional filters)
app.get('/api/vendors', async (req, res) => {
  try {
    const { category, city, vibe } = req.query;
    let query = supabase.from('vendors').select('*').eq('subscription_active', true);
    if (category) query = query.eq('category', category);
    if (city) query = query.eq('city', city);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single vendor
app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create vendor
app.post('/api/vendors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .insert([req.body])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update vendor
app.patch('/api/vendors/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// USER ROUTES
// ==================

// Create or get user
app.post('/api/users', async (req, res) => {
  try {
    const { phone, name, email } = req.body;
    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();
    if (existing) {
      return res.json({ success: true, data: existing, isNew: false });
    }
    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert([{ phone, name, email }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data, isNew: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user
app.get('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// MOODBOARD ROUTES
// ==================

// Get user moodboard
app.get('/api/moodboard/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('moodboard_items')
      .select('*, vendors(*)')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add to moodboard
app.post('/api/moodboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('moodboard_items')
      .insert([req.body])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove from moodboard
app.delete('/api/moodboard/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('moodboard_items')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// BOOKING ROUTES
// ==================

// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([req.body])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user bookings
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, vendors(*)')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get vendor bookings
app.get('/api/bookings/vendor/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, users(*)')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update booking status
app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// MESSAGING ROUTES
// ==================

// Get conversation
app.get('/api/messages/:userId/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', req.params.userId)
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send message
app.post('/api/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([req.body])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// GUEST ROUTES
// ==================

// Get guests
app.get('/api/guests/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add guest
app.post('/api/guests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .insert([req.body])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update guest
app.patch('/api/guests/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('guests')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// VENDOR LEADS ROUTES
// ==================

// Get vendor leads
app.get('/api/leads/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_leads')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add lead
app.post('/api/leads', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_leads')
      .insert([req.body])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lead
app.patch('/api/leads/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_leads')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// INVOICE ROUTES
// ==================

// Get vendor invoices
app.get('/api/invoices/:vendorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendor_invoices')
      .select('*')
      .eq('vendor_id', req.params.vendorId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const { amount } = req.body;
    const gst_amount = amount * 0.18;
    const total_amount = amount + gst_amount;
    const { data, error } = await supabase
      .from('vendor_invoices')
      .insert([{ ...req.body, gst_amount, total_amount }])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// NOTIFICATIONS ROUTES
// ==================

// Get notifications
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark notification read
app.patch('/api/notifications/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================
// SEED VENDOR DATA
// ==================

app.post('/api/seed', async (req, res) => {
  try {
    const vendors = [
      {
        name: 'Joseph Radhik',
        category: 'photographers',
        city: 'Mumbai',
        vibe_tags: ['Candid', 'Luxury'],
        instagram_url: '@josephradhik',
        starting_price: 300000,
        max_price: 800000,
        is_verified: true,
        rating: 5.0,
        review_count: 312,
        subscription_active: true,
        about: 'One of India\'s most celebrated wedding photographers.',
        equipment: 'Leica, Nikon D6, DJI Inspire 2',
        delivery_time: '8-12 weeks',
        portfolio_images: ['https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800'],
      },
      {
        name: 'The Leela Palace',
        category: 'venues',
        city: 'Delhi NCR',
        vibe_tags: ['Luxury', 'Royal'],
        instagram_url: '@theleela',
        starting_price: 1500000,
        max_price: 5000000,
        is_verified: true,
        rating: 4.9,
        review_count: 189,
        subscription_active: true,
        about: 'One of India\'s finest luxury wedding venues.',
        equipment: 'Capacity: 50-2000 guests · Indoor & Outdoor',
        delivery_time: 'In-house catering included',
        portfolio_images: ['https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800'],
      },
      {
        name: 'Namrata Soni',
        category: 'mua',
        city: 'Mumbai',
        vibe_tags: ['Luxury', 'Cinematic'],
        instagram_url: '@namratasoni',
        starting_price: 150000,
        max_price: 500000,
        is_verified: true,
        rating: 4.9,
        review_count: 445,
        subscription_active: true,
        about: 'Celebrity makeup artist to Bollywood\'s finest.',
        equipment: 'Charlotte Tilbury, La Mer, Armani Beauty',
        delivery_time: 'Trial session included',
        portfolio_images: ['https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800'],
      },
      {
        name: 'Sabyasachi Mukherjee',
        category: 'designers',
        city: 'Kolkata',
        vibe_tags: ['Luxury', 'Traditional'],
        instagram_url: '@sabyasachiofficial',
        starting_price: 500000,
        max_price: 3000000,
        is_verified: true,
        rating: 5.0,
        review_count: 892,
        subscription_active: true,
        about: 'India\'s most celebrated bridal designer.',
        equipment: 'Lead time: 6 months · Fully customised',
        delivery_time: '6 months lead time',
        portfolio_images: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800'],
      },
      {
        name: 'DJ Chetas',
        category: 'dj',
        city: 'Mumbai',
        vibe_tags: ['Festive', 'Luxury'],
        instagram_url: '@djchetas',
        starting_price: 500000,
        max_price: 2000000,
        is_verified: true,
        rating: 4.9,
        review_count: 234,
        subscription_active: true,
        about: 'India\'s most sought after celebrity DJ.',
        equipment: 'Full sound system · LED setup included',
        delivery_time: 'Setup included',
        portfolio_images: ['https://images.unsplash.com/photo-1571266028243-d220c6a5d70b?w=800'],
      },
      {
        name: 'Wizcraft International',
        category: 'event-managers',
        city: 'Mumbai',
        vibe_tags: ['Luxury', 'Destination'],
        instagram_url: '@wizcraft',
        starting_price: 2000000,
        max_price: 50000000,
        is_verified: true,
        rating: 5.0,
        review_count: 445,
        subscription_active: true,
        about: 'India\'s premier luxury event management company.',
        equipment: 'Full service · Destination weddings specialists',
        delivery_time: 'Full planning included',
        portfolio_images: ['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800'],
      },
      {
        name: 'Anmol Jewellers',
        category: 'jewellery',
        city: 'Delhi NCR',
        vibe_tags: ['Luxury', 'Traditional'],
        instagram_url: '@anmoljewellers',
        starting_price: 200000,
        max_price: 10000000,
        is_verified: true,
        rating: 4.8,
        review_count: 189,
        subscription_active: true,
        about: 'India\'s finest bridal jewellery designers.',
        equipment: 'Custom design · Gold & diamond specialists',
        delivery_time: '3-4 months for custom pieces',
        portfolio_images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800'],
      },
    ];

    const { data, error } = await supabase
      .from('vendors')
      .insert(vendors)
      .select();

    if (error) throw error;
    res.json({ success: true, message: `${data.length} vendors seeded!`, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`The Dream Wedding API running on port ${PORT} 🎉`);
});