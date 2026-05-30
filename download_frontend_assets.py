import urllib.request
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("assets_downloader")

LIB_DIR = Path(__file__).resolve().parent / "static" / "lib"
LIB_DIR.mkdir(parents=True, exist_ok=True)

ASSETS = {
    "react.production.min.js": "https://unpkg.com/react@18.2.0/umd/react.production.min.js",
    "react-dom.production.min.js": "https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js",
    "babel.min.js": "https://unpkg.com/@babel/standalone@7.23.3/babel.min.js",
    "wavesurfer.min.js": "https://unpkg.com/wavesurfer.js@7.5.5/dist/wavesurfer.min.js",
    "tailwind.js": "https://cdn.tailwindcss.com/3.4.1",
    "Sortable.min.js": "https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js",
    "lucide.min.js": "https://unpkg.com/lucide@0.321.0/dist/umd/lucide.min.js"
}

def download_all():
    logger.info("Starting frontend assets pre-cache downloader...")
    for filename, url in ASSETS.items():
        out_path = LIB_DIR / filename
        if out_path.exists():
            logger.info(f"Asset '{filename}' already cached. Skipping.")
            continue
            
        try:
            logger.info(f"Downloading {filename} from {url}...")
            # Set a normal User-Agent headers to avoid server blocking
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                content = response.read()
            with open(out_path, "wb") as f:
                f.write(content)
            logger.info(f"Successfully cached {filename} ({len(content)} bytes)")
        except Exception as e:
            logger.error(f"Failed downloading {filename} from {url}: {e}")
            
    logger.info("Pre-cache complete! AutoStitch will now operate 100% offline.")

if __name__ == "__main__":
    download_all()
