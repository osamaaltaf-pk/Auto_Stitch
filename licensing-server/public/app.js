// --- Omni Automator Client Interactions & API Dispatcher ---

document.addEventListener('DOMContentLoaded', () => {
  const selectPlan = document.getElementById('select-plan');
  const inputDevices = document.getElementById('input-devices');
  const inputAdminKey = document.getElementById('input-admin-key');
  const inputValidity = document.getElementById('input-validity');
  const btnGenerate = document.getElementById('btn-generate');
  const keyDisplayCard = document.getElementById('key-display-card');
  const generatedKey = document.getElementById('generated-key');
  const btnCopy = document.getElementById('btn-copy');
  const adminCheck = document.getElementById('admin-check');

  // 1. Plan dropdown auto-updates max devices
  selectPlan.addEventListener('change', () => {
    const selectedOption = selectPlan.options[selectPlan.selectedIndex];
    const devices = selectedOption.getAttribute('data-devices');
    if (devices) {
      inputDevices.value = devices;
    }
  });

  // 2. Admin key input visual feedback
  inputAdminKey.addEventListener('input', () => {
    if (inputAdminKey.value.trim().length > 3) {
      adminCheck.style.display = 'inline';
    } else {
      adminCheck.style.display = 'none';
    }
  });

  // 3. API Dispatch to generate license key
  btnGenerate.addEventListener('click', async () => {
    const adminKey = inputAdminKey.value.trim();
    const planName = selectPlan.value;
    const validityDays = parseInt(inputValidity.value);
    const maxDevices = parseInt(inputDevices.value);

    if (!adminKey) {
      alert('Please enter your Admin Secret Key first!');
      inputAdminKey.focus();
      return;
    }

    if (isNaN(validityDays) || validityDays <= 0) {
      alert('Please enter a valid number of validity days!');
      inputValidity.focus();
      return;
    }

    if (isNaN(maxDevices) || maxDevices <= 0) {
      alert('Please enter a valid number of max devices!');
      inputDevices.focus();
      return;
    }

    // Toggle button loading state
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = '⚡ Generating activation code...';

    try {
      const response = await fetch('/api/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_key: adminKey,
          plan_name: planName,
          validity_days: validityDays,
          max_devices: maxDevices,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Display and animate key showcase card
        generatedKey.innerText = result.license_key;
        
        keyDisplayCard.style.opacity = '1';
        keyDisplayCard.style.transform = 'translateY(0)';
        keyDisplayCard.style.pointerEvents = 'auto';
        
        btnCopy.innerHTML = 'COPY KEY';
        btnCopy.className = 'text-xs text-accent-primary hover:text-white font-bold tracking-wide py-1 px-3 bg-accent-primary/10 hover:bg-accent-primary rounded-lg border border-accent-primary/20 transition-all duration-300';
      } else {
        alert(`Error: ${result.message || 'Failed to generate key'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to Vercel. Make sure server is deployed!');
    } finally {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = '⚡ Generate Activation Code';
    }
  });

  // 4. Copy to Clipboard Utility
  btnCopy.addEventListener('click', () => {
    const key = generatedKey.innerText;
    if (!key || key.startsWith('AS-XXXX')) return;

    navigator.clipboard.writeText(key).then(() => {
      btnCopy.innerText = 'COPIED!';
      btnCopy.className = 'text-xs text-white font-bold tracking-wide py-1 px-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg border border-emerald-500/20 transition-all duration-300';
      
      setTimeout(() => {
        btnCopy.innerText = 'COPY KEY';
        btnCopy.className = 'text-xs text-accent-primary hover:text-white font-bold tracking-wide py-1 px-3 bg-accent-primary/10 hover:bg-accent-primary rounded-lg border border-accent-primary/20 transition-all duration-300';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });
});
