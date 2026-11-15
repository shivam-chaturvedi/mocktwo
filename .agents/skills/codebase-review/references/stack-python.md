# Stack: Python

## Checks to Run
- `ruff check .` — linting and style
- `mypy .` — type checking (if type hints present)
- `bandit -r .` — security analysis
- `pip audit` or `safety check` — dependency vulnerabilities

## Python-Specific Issues to Look For

### Project Configuration
- Is there a `pyproject.toml` or `setup.cfg`? Is it consistent with actual deps?
- Is a virtual environment used? Is it in `.gitignore`?
- Are type stubs installed for typed dependencies?
- Is the Python version pinned (in pyproject.toml, Dockerfile, or .python-version)?

### Code Patterns
- Bare `except:` or `except Exception:` without re-raise — silent failure risk
- `open()` without context manager (`with`) — resource leak
- Mutable default arguments (`def foo(items=[])`) — shared state bug
- `import *` — namespace pollution
- Missing `__init__.py` in packages
- f-strings with side effects or complex expressions
- `os.system()` or `subprocess.call()` with `shell=True` — injection risk
- `pickle.loads()` on untrusted data — arbitrary code execution
- `eval()` or `exec()` — almost never justified in production

### Async Issues (if asyncio/aiohttp/FastAPI)
- Blocking calls inside async functions (e.g., `time.sleep()` instead of `asyncio.sleep()`)
- Missing `await` on coroutines
- Sync DB drivers used in async context

### Testing
- Is pytest configured? Are fixtures used?
- Are tests actually running? (`pytest --co` to list)
- Is coverage measured? What's the percentage?
- Any tests using `unittest.mock` that mock too much (testing mocks, not code)?

### Deprecated Patterns
- `%` string formatting or `.format()` where f-strings would be clearer
- `typing.Optional` where `X | None` is available (Python 3.10+)
- `os.path` where `pathlib` would be better
- Legacy `setup.py` where `pyproject.toml` would be better
