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

  const { license_key, gmail, password, machine_id } = req.body;

  if (!license_key || !gmail || !password || !machine_id) {
    return res.status(400).json({ message: 'Missing required credentials! License Key, Gmail, Password, and Machine ID are required.' });
  }

  // 1. Check for Developer Bypass Key
  const bypassKey = 'Osama@1232£-80£viu%*ajoy/(592@!(/@0862hkhakowpnbtaownyekn69vhwilwn';
  if (license_key === bypassKey) {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 50);
    return res.status(200).json({
      status: 'success',
      message: 'Developer bypass key accepted. Lifetime license unlocked.',
      gmail: gmail,
      expiry_date: farFuture.toISOString(),
      token: 'DEV-BYPASS-VALID-TOKEN'
    });
  }

  if (!supabase) {
    return res.status(500).json({ message: 'Server Config Error: Supabase connection parameters are missing!' });
  }

  try {
    // 2. Query license details
    const { data: license, error: licenseErr } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .single();

    if (licenseErr || !license) {
      return res.status(404).json({ message: 'Invalid license key! Please check spelling or contact the owner.' });
    }

    if (license.status === 'revoked') {
      return res.status(403).json({ message: 'This license key has been suspended/revoked by the administrator.' });
    }

    const today = new Date();

    // 3. fresh activation: Gmail is empty in Supabase row
    if (!license.gmail) {
      // First-time activation: bind the Gmail, password, calculate expiration date
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + license.validity_days);

      const { error: updateErr } = await supabase
        .from('licenses')
        .update({
          gmail: gmail.toLowerCase().trim(),
          password_hash: password, // In production you can hash it; storing directly matches simple agency login
          expiry_date: expiry.toISOString(),
          status: 'active'
        })
        .eq('id', license.id);

      if (updateErr) {
        return res.status(500).json({ message: `Activation Error: ${updateErr.message}` });
      }

      // Add motherboard Machine ID
      const { error: devErr } = await supabase
        .from('active_devices')
        .insert([{ license_id: license.id, machine_id: machine_id, registered_at: today.toISOString() }]);

      if (devErr) {
        return res.status(500).json({ message: `Hardware Registry Error: ${devErr.message}` });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Activated and registered successfully!',
        gmail: gmail,
        expiry_date: expiry.toISOString(),
        token: `AUTH-TOKEN-${license.id}`
      });
    }

    // 4. existing activation: Verify Gmail and Password
    if (license.gmail !== gmail.toLowerCase().trim() || license.password_hash !== password) {
      return res.status(401).json({ message: 'Authentication Failed: Incorrect Gmail or Password associated with this license.' });
    }

    // Check expiration date
    const expiryDate = new Date(license.expiry_date);
    if (today > expiryDate) {
      // Update DB status to expired
      await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
      return res.status(403).json({ message: `Your license expired on ${expiryDate.toDateString()} and is no longer valid.` });
    }

    // 5. Query active devices registered for this license
    const { data: devices, error: devQueryErr } = await supabase
      .from('active_devices')
      .select('*')
      .eq('license_id', license.id);

    if (devQueryErr) {
      return res.status(500).json({ message: `Hardware Check Error: ${devQueryErr.message}` });
    }

    // Check if this machine UUID is already registered
    const isRegistered = devices.some(d => d.machine_id === machine_id);
    if (isRegistered) {
      return res.status(200).json({
        status: 'success',
        message: 'Re-activated hardware slot successfully.',
        gmail: gmail,
        expiry_date: license.expiry_date,
        token: `AUTH-TOKEN-${license.id}`
      });
    }

    // If new machine, check device slot limits
    const currentCount = devices.length;
    if (currentCount >= license.max_devices) {
      return res.status(403).json({
        message: `Device Slot Limit Reached (${currentCount}/${license.max_devices} slots filled). Please contact the administrator to migrate devices.`
      });
    }

    // Register the new device slot
    const { error: insertDevErr } = await supabase
      .from('active_devices')
      .insert([{ license_id: license.id, machine_id: machine_id, registered_at: today.toISOString() }]);

    if (insertDevErr) {
      return res.status(500).json({ message: `Registry Error: ${insertDevErr.message}` });
    }

    return res.status(200).json({
      status: 'success',
      message: `Activated new device successfully (${currentCount + 1}/${license.max_devices} slots active).`,
      gmail: gmail,
      expiry_date: license.expiry_date,
      token: `AUTH-TOKEN-${license.id}`
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Activation Exception: ${err.message}` });
  }
};
