import os
import sys
import time
from playwright.sync_api import sync_playwright

OUT_DIR = "/Users/shivam/.gemini/antigravity/brain/d9e2c7f3-2a20-4f91-b796-b36bf13af0d4/screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

RESOLUTIONS = [
    (1100, 700, "1100x700"),
    (1440, 900, "1440x900"),
    (1920, 1080, "1920x1080"),
]

console_errors = []

def handle_console(msg):
    if msg.type == "error":
        console_errors.append(f"Console error: {msg.text}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()

        for width, height, res_name in RESOLUTIONS:
            print(f"\n--- Testing Fresh Empty States at {res_name} ---")
            page = browser.new_page(viewport={"width": width, "height": height})
            page.on("console", handle_console)
            page.on("pageerror", lambda err: console_errors.append(f"Page error: {err}"))

            # 1. Home screen (Fresh 0 sessions state)
            page.goto("http://127.0.0.1:5173", wait_until="networkidle")
            page.wait_for_timeout(600)

            # Check that page itself does NOT scroll (only inner panes)
            doc_scroll = page.evaluate("() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight })")
            print(f"[{res_name}] Home document scroll: {doc_scroll}")
            assert doc_scroll["scrollHeight"] <= doc_scroll["innerHeight"], f"Page scrolling at {res_name}: {doc_scroll}"

            home_path = os.path.join(OUT_DIR, f"fresh_home_{res_name}.png")
            page.screenshot(path=home_path)
            print(f"Saved: {home_path}")

            # 2. Scenarios screen
            page.click('button:has-text("Scenarios")')
            page.wait_for_timeout(500)
            scenarios_path = os.path.join(OUT_DIR, f"fresh_scenarios_{res_name}.png")
            page.screenshot(path=scenarios_path)
            print(f"Saved: {scenarios_path}")

            # 3. Recordings screen
            page.click('button:has-text("Recordings")')
            page.wait_for_timeout(500)
            recordings_path = os.path.join(OUT_DIR, f"fresh_recordings_{res_name}.png")
            page.screenshot(path=recordings_path)
            print(f"Saved: {recordings_path}")

            # 4. Progress screen
            page.click('button:has-text("Progress")')
            page.wait_for_timeout(500)
            progress_path = os.path.join(OUT_DIR, f"fresh_progress_{res_name}.png")
            page.screenshot(path=progress_path)
            print(f"Saved: {progress_path}")

            page.close()

        browser.close()

    print("\n==========================================")
    print(f"ALL PLAYWRIGHT TESTS PASSED! Total console errors: {len(console_errors)}")
    print("==========================================")

    if console_errors:
        for err in console_errors:
            print("ERROR:", err)
        sys.exit(1)

if __name__ == "__main__":
    main()
