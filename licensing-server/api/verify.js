const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { license_key, machine_id } = req.body;

  if (!license_key || !machine_id) {
    return res.status(400).json({ message: 'Missing required validation fields! License Key and Machine ID are required.' });
  }

  // 1. Check for Developer Bypass Key
  const bypassKey = 'Osama@1232£-80£viu%*ajoy/(592@!(/@0862hkhakowpnbtaownyekn69vhwilwn';
  if (license_key === bypassKey) {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 50);
    return res.status(200).json({
      status: 'success',
      message: 'Developer bypass verified.',
      expiry_date: farFuture.toISOString()
    });
  }

  if (!supabase) {
    return res.status(500).json({ message: 'Server Config Error: Supabase connection parameters are missing!' });
  }

  try {
    // 2. Query license
    const { data: license, error: licenseErr } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single();

    if (licenseErr || !license) {
      return res.status(404).json({ message: 'Invalid license key!' });
    }

    if (license.status === 'revoked') {
      return res.status(403).json({ message: 'This license key has been suspended/revoked by the administrator.' });
    }

    // 3. Check expiration date in real-time against Vercel server clock
    const today = new Date();
    const expiryDate = new Date(license.expiry_date);
    if (today > expiryDate) {
      // Mark as expired in Supabase
      await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
      return res.status(403).json({ message: 'License expired! Please purchase a new monthly activation key.' });
    }

    // 4. Verify motherboard hardware fingerprint (Machine ID) matches active slot
    const { data: devices, error: devQueryErr } = await supabase
      .from('active_devices')
      .select('*')
      .eq('license_id', license.id);

    if (devQueryErr) {
      return res.status(500).json({ message: `Hardware Check Error: ${devQueryErr.message}` });
    }

    const isRegistered = devices.some(d => d.machine_id === machine_id);
    if (!isRegistered) {
      return res.status(403).json({ message: 'Hardware Signature Mismatch! This license key is locked to another computer.' });
    }

    // 5. Success
    return res.status(200).json({
      status: 'success',
      message: 'License is valid and verified.',
      expiry_date: license.expiry_date
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Verification Exception: ${err.message}` });
  }
};
