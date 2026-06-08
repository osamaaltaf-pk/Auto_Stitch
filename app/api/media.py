import os
import mimetypes
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, Response
from app.core.config import OUTPUT_DIR, STATIC_DIR

router = APIRouter(tags=["media"])

@router.get("/output/master.mp4")
async def serve_master_video(request: Request, t: str = ""):
    """
    Dedicated master.mp4 streaming endpoint with proper video headers.
    The ?t= cache-buster is accepted but ignored server-side; the ETag handles caching.
    ConnectionResetError in logs when seeking is normal browser behaviour, not a bug.
    """
    master_path = OUTPUT_DIR / "master.mp4"
    if not master_path.exists():
        raise HTTPException(status_code=404, detail="Master video not yet rendered")
    
    stat = master_path.stat()
    etag = f'"{int(stat.st_mtime)}-{stat.st_size}"'
    
    # Return 304 if client already has this exact file
    if_none_match = request.headers.get("if-none-match", "")
    if if_none_match == etag:
        return Response(status_code=304, headers={"ETag": etag})
    
    return FileResponse(
        path=str(master_path),
        media_type="video/mp4",
        headers={
            "Accept-Ranges": "bytes",
            "ETag": etag,
            "Cache-Control": "no-cache",   # revalidate but allow range requests
        }
    )

@router.get("/api/video/serve")
async def serve_video(path: str):
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Video file not found: {path}")
    
    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    return FileResponse(
        path=path,
        media_type=mime_type,
        headers={
            "Accept-Ranges": "bytes"
        }
    )

@router.get("/")
async def serve_index():
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(
            index_path,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        )
    else:
        return HTMLResponse("<h2>AutoStitch Studio UI placeholder. Serve static files index.html to show full SPA editor.</h2>")
