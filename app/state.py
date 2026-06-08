import asyncio
import logging

logger = logging.getLogger("autostitch.state")

# Keep track of background server subprocesses
background_subprocesses = []
running_processes = {
    "tts": None,
    "stable_audio": None
}

# Keep track of project names that have been self-healed since startup
HEALED_PROJECTS = set()

# Global state tracker for currently rendering projects
# project_name -> {"status": "idle"|"rendering"|"done"|"error", "progress": 0.0, "error": None}
active_renders = {}

# Sequential queues for TTS and SFX to prevent resource thrashing and manifest race conditions
tts_queue = asyncio.Queue()
sfx_queue = asyncio.Queue()

async def tts_queue_worker():
    logger.info("Starting sequential TTS queue worker...")
    while True:
        try:
            task_func = await tts_queue.get()
            await task_func()
        except Exception as e:
            logger.error(f"Error in TTS queue worker: {e}")
        finally:
            tts_queue.task_done()

async def sfx_queue_worker():
    logger.info("Starting sequential SFX queue worker...")
    while True:
        try:
            task_func = await sfx_queue.get()
            await task_func()
        except Exception as e:
            logger.error(f"Error in SFX queue worker: {e}")
        finally:
            sfx_queue.task_done()
