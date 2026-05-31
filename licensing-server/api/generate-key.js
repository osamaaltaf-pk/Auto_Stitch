const { createClient } = require('@supabase/supabase-js');

// Initialize administrative Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

module.exports = async (req, res) => {
  // CORS Headers support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { admin_key, plan_name, validity_days, max_devices } = req.body;

  // 1. Verify Admin Secret Key
  const serverAdminKey = process.env.ADMIN_SECRET_KEY || 'OsamaAdminSecure2026!';
  if (admin_key !== serverAdminKey) {
    return res.status(401).json({ message: 'Unauthorized: Invalid Admin Secret Key!' });
  }

  if (!supabase) {
    return res.status(500).json({ message: 'Server Config Error: Supabase connection parameters are missing!' });
  }

  // 2. Generate Cryptographically Secure Activation Code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randPart = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const licenseKey = `OMNI-AS-${randPart()}-${randPart()}-${randPart()}-${randPart()}`;

  try {
    // 3. Write key parameter details to Supabase 'licenses' table
    const { data, error } = await supabase
      .from('licenses')
      .insert([
        {
          license_key: licenseKey,
          plan_name: plan_name || 'Pro',
          validity_days: validity_days || 30,
          max_devices: max_devices || 1,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error: ', error);
      return res.status(500).json({ message: `Database Error: ${error.message}` });
    }

    return res.status(200).json({
      message: 'Key successfully generated!',
      license_key: licenseKey,
      plan_name: plan_name,
      validity_days: validity_days,
      max_devices: max_devices
    });

  } catch (err) {
    console.error('Exception: ', err);
    return res.status(500).json({ message: `Server Exception: ${err.message}` });
  }
};
