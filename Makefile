# Makefile — AutoStitch v1 Dev Commands
# Usage: make <target>
# Requires: make for Windows (via Git Bash, WSL, or choco install make)

.PHONY: help install run test lint typecheck clean docs

help:
	@echo AutoStitch v1 - Available commands:
	@echo   make install    - Create venv and install all dependencies
	@echo   make run        - Launch the app
	@echo   make test       - Run pytest unit tests
	@echo   make lint       - Run ruff linter
	@echo   make typecheck  - Run mypy type checker
	@echo   make clean      - Remove __pycache__, .pytest_cache, logs
	@echo   make docs       - List all agent doc files

install:
	py -3.11 -m venv .venv
	.venv/Scripts/pip install -r engines/stable_audio/requirements.txt || true
	.venv/Scripts/pip install -r engines/pocket_tts/requirements.txt || true
	.venv/Scripts/pip install -r requirements.txt

run:
	.venv/Scripts/python main.py

test:
	.venv/Scripts/pytest tests/ -v

lint:
	.venv/Scripts/ruff check app/ tests/

typecheck:
	.venv/Scripts/mypy app/core/ --strict

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -f logs/autostitch.log

docs:
	@echo Agent documentation files:
	@echo   AGENT.md         Master instructions
	@echo   ARCHITECTURE.md  System design
	@echo   CONTEXT.md       Current phase + progress
	@echo   MEMORY.md        Feature checklist
	@echo   DIFF_MEMORY.md   Per-session history
	@echo   REVIEW.md        Open issues
	@echo   STACK.md         Tech stack
	@echo   MANIFEST.md      Data model
	@echo   UI_SPEC.md       UI layout
	@echo   LANES.md         Lane interactions
	@echo   ENGINES.md       Engine wrappers
	@echo   STITCHER.md      FFmpeg pipeline
	@echo   INSTALLER.md     Batch files
	@echo   CONSTRAINTS.md   Hard rules
	@echo   README.md        Project readme
