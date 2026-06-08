import re

def merge_landing_spa(landing_path, active_index_path, output_path):
    print("Reading landing page from", landing_path)
    landing_content = open(landing_path, encoding='utf-8').read()
    
    # 1. Extract styles block from autostitch-landing.html
    # We want to keep everything from <head> of landing_content, but also ensure React scripts are loaded.
    # Actually, the landing page is a complete HTML document. We can just use the landing page as the template,
    # and inject our React assets and script tags into it!
    
    # Let's define the React script tags to inject at the end of <body>:
    react_scripts = '''
  <!-- Local Offline Cached JS Libraries for React SPA -->
  <script src="/static/lib/react.production.min.js"></script>
  <script src="/static/lib/react-dom.production.min.js"></script>
  <script src="/static/lib/babel.min.js"></script>
  <script src="/static/lib/tailwind.js"></script>
  <script src="/static/lib/Sortable.min.js"></script>
  <script src="/static/lib/wavesurfer.min.js"></script>
  <script src="/static/lib/lucide.min.js"></script>
  
  <!-- Premium Custom Styling Sheet — versioned to bypass browser cache -->
  <link rel="stylesheet" href="/static/index.css?v=20260531-15">
  
  <script>
    // Configure Tailwind CSS config locally for React and Landing
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Outfit', 'sans-serif'],
            mono: ['Space Mono', 'monospace'],
          },
          colors: {
            carbon: {
              DEFAULT: 'var(--bg-color)',
              panel:   'var(--panel-bg)',
              card:    'var(--card-bg)',
              border:  'var(--border-color)',
            },
            accent: {
              primary:   '#7c6cff',
              secondary: '#ff6c9d',
              tertiary:  '#6cffcc',
            }
          }
        }
      }
    }
  </script>
  
  <!-- Load unified React logic — versioned to bypass browser cache -->
  <script type="text/babel" src="/static/app.js?v=20260531-15"></script>
</body>
'''
    
    # Replace </body> tag with the react scripts and </body>
    content = landing_content.replace('</body>', react_scripts)
    
    # 2. Locate `#dashboardPage` in landing page content:
    # <div class="dashboard-page" id="dashboardPage">
    #   <div class="db-frame">
    #     <img class="db-img" src="..." />
    #   </div>
    # </div>
    # We replace its contents with our React mount point: <div id="root" class="h-full w-full"></div>
    dashboard_pattern = r'<div class="dashboard-page" id="dashboardPage">.*?</div>\s*</div>'
    # Let's find it and replace:
    content = re.sub(
        r'<div class="dashboard-page" id="dashboardPage">.*?</div>\s*</div>', 
        '''<div class="dashboard-page h-full w-full" id="dashboardPage" style="display:none;">
    <div id="root" class="h-full w-full"></div>
  </div>''', 
        content, 
        flags=re.DOTALL
    )

    # 3. Add window.showLanding and persistence load check inside the <script> block
    persistence_script = '''
// Global Page Navigation Overrides
window.showLanding = function() {
  document.getElementById('landingPage').classList.remove('hidden');
  document.getElementById('projectsPage').classList.remove('active');
  document.getElementById('dashboardPage').classList.remove('active');
  document.getElementById('mainNav').style.display = 'flex';
  document.body.style.overflowY = 'auto';
  document.body.style.height = 'auto';
  localStorage.setItem('as_active_page', 'landing');
}

function showProjects() {
  document.getElementById('landingPage').classList.add('hidden');
  document.getElementById('projectsPage').classList.add('active');
  document.getElementById('dashboardPage').classList.remove('active');
  document.getElementById('mainNav').style.display = 'flex';
  document.body.style.overflowY = 'auto';
  document.body.style.height = 'auto';
  localStorage.setItem('as_active_page', 'projects');
}

function showDashboard() {
  document.getElementById('landingPage').classList.add('hidden');
  document.getElementById('projectsPage').classList.remove('active');
  document.getElementById('dashboardPage').classList.add('active');
  document.getElementById('mainNav').style.display = 'none'; // hide main landing nav inside dashboard!
  document.body.style.overflowY = 'hidden';
  document.body.style.height = '100vh';
  localStorage.setItem('as_active_page', 'dashboard');
}

// Restore Active Session on Mount
window.addEventListener('DOMContentLoaded', () => {
  try {
    const activePage = localStorage.getItem('as_active_page');
    if (activePage === 'dashboard') {
      showDashboard();
    } else if (activePage === 'projects') {
      showProjects();
    } else {
      window.showLanding();
    }
  } catch (e) {
    window.showLanding();
  }
});
'''
    
    # Replace the existing showLanding, showProjects, showDashboard functions:
    content = re.sub(
        r'function showLanding\(\).*?function showDashboard\(\)\s*\{.*?\}', 
        persistence_script, 
        content, 
        flags=re.DOTALL
    )
    
    # 4. Save to the output path
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Merged and unified HTML saved to", output_path)

merge_landing_spa(
    'D:/Osama_mvp/scratch/cleaned-landing.html', 
    'D:/Osama_mvp/static/index.html', 
    'D:/Osama_mvp/static/index.html'
)
