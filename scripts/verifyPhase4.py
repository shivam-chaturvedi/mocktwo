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
            print(f"\n=======================================================")
            print(f"--- Testing Matrix at {res_name} ---")
            print(f"=======================================================")
            page = browser.new_page(viewport={"width": width, "height": height})
            page.on("console", handle_console)
            page.on("pageerror", lambda err: console_errors.append(f"Page error: {err}"))

            # 1. Home Screen
            page.goto("http://127.0.0.1:5173", wait_until="networkidle")
            page.wait_for_timeout(600)

            # Assert no document body scroll
            doc_scroll = page.evaluate("() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight })")
            print(f"[{res_name}] Home document scroll: {doc_scroll}")
            assert doc_scroll["scrollHeight"] <= doc_scroll["innerHeight"], f"Page scrolling at {res_name}: {doc_scroll}"

            # Verify "This week" card real values
            streak_text = page.locator('text="0-day streak"').first
            assert streak_text.is_visible(), "0-day streak pill should be visible"

            sessions_total_text = page.locator('text="0 sessions total"').first
            assert sessions_total_text.is_visible(), "0 sessions total should be visible"

            streak_copy = page.locator('text="Complete a session to start your streak."').first
            assert streak_copy.is_visible(), "Zero-state streak copy must be visible"

            goal_text = page.locator('text="0 of 5 sessions"').first
            assert goal_text.is_visible(), "0 of 5 sessions must be visible"

            practice_time = page.locator('text="0m"').first
            assert practice_time.is_visible(), "0m practice time must be visible"

            # Verify Titlebar branding: NO "Workspace" text
            titlebar_text = page.locator('span:text("mocktwo")').first
            assert titlebar_text.is_visible()
            workspace_label = page.locator('span:text("mocktwo Workspace")')
            assert workspace_label.count() == 0, "mocktwo Workspace label must not exist"

            # Verify Baseline 60s copy
            baseline_copy = page.locator('text="60 s calm baseline"').first
            assert baseline_copy.is_visible(), "60 s calm baseline copy must be visible"

            home_path = os.path.join(OUT_DIR, f"phase4_home_{res_name}.png")
            page.screenshot(path=home_path)
            print(f"Saved: {home_path}")

            # 2. Scenarios Screen (Library, Mine, Personas)
            page.click('button:has-text("Scenarios")')
            page.wait_for_timeout(500)

            # Library tab (Empty state)
            lib_empty = page.locator('text="No scenarios available"').first
            assert lib_empty.is_visible(), "Library empty state must be visible"
            # Assert only ONE primary CTA exists (no duplicate New Scenario button)
            new_btn_count = page.locator('button:has-text("New Scenario")').count()
            assert new_btn_count == 1, f"Expected exactly 1 New Scenario button, found {new_btn_count}"

            scenarios_lib_path = os.path.join(OUT_DIR, f"phase4_scenarios_lib_{res_name}.png")
            page.screenshot(path=scenarios_lib_path)
            print(f"Saved: {scenarios_lib_path}")

            # Mine tab
            page.click('button:has-text("Mine")')
            page.wait_for_timeout(300)
            mine_empty = page.locator('text="No scenarios of your own yet"').first
            assert mine_empty.is_visible(), "Mine empty state must be visible"
            mine_btn_count = page.locator('button:has-text("New Scenario")').count()
            assert mine_btn_count == 1, f"Expected exactly 1 New Scenario button on Mine tab, found {mine_btn_count}"

            scenarios_mine_path = os.path.join(OUT_DIR, f"phase4_scenarios_mine_{res_name}.png")
            page.screenshot(path=scenarios_mine_path)
            print(f"Saved: {scenarios_mine_path}")

            # Personas tab
            page.click('button:has-text("Personas")')
            page.wait_for_timeout(300)
            personas_empty = page.locator('text="No personas yet"').first
            assert personas_empty.is_visible(), "Personas empty state must be visible"
            persona_btn_count = page.locator('button:has-text("New Persona")').count()
            assert persona_btn_count == 1, f"Expected exactly 1 New Persona button on Personas tab, found {persona_btn_count}"

            scenarios_persona_path = os.path.join(OUT_DIR, f"phase4_scenarios_persona_{res_name}.png")
            page.screenshot(path=scenarios_persona_path)
            print(f"Saved: {scenarios_persona_path}")

            # 3. Quick Practice Dialog
            page.click('button:has-text("Quick Practice")')
            page.wait_for_timeout(400)

            modal_title = page.locator('h2:text("Quick practice")').first
            assert modal_title.is_visible(), "Quick practice modal must open"

            # Describe mode testing
            # Click goal preset "Sales pitch"
            page.click('button:has-text("Sales pitch")')
            page.wait_for_timeout(200)

            # Click a suggestion chip
            suggestion = page.locator('button:has-text("Handling a 40% discount demand")').first
            assert suggestion.is_visible()
            suggestion.click()
            page.wait_for_timeout(200)

            # Verify text is in textarea
            textarea = page.locator('textarea')
            val = textarea.input_value()
            assert "Handling a 40% discount demand" in val, f"Expected suggestion in textarea, got: {val}"

            # Verify character count updated
            char_count = page.locator('text="30/500"').first
            assert char_count.is_visible(), "Character counter must be updated"

            quick_describe_path = os.path.join(OUT_DIR, f"phase4_quick_describe_{res_name}.png")
            page.screenshot(path=quick_describe_path)
            print(f"Saved: {quick_describe_path}")

            # Switch to Scenarios Mode inside the modal dialog
            page.locator('[role="dialog"] button:has-text("Scenarios")').click()
            page.wait_for_timeout(300)

            scenarios_mode_empty = page.locator('text="No scenarios available"').first
            assert scenarios_mode_empty.is_visible(), "Scenarios mode empty state must be visible"

            quick_scenarios_path = os.path.join(OUT_DIR, f"phase4_quick_scenarios_{res_name}.png")
            page.screenshot(path=quick_scenarios_path)
            print(f"Saved: {quick_scenarios_path}")

            # Close with Esc
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            assert not modal_title.is_visible(), "Modal must close on Esc"

            page.close()

        browser.close()

    print("\n=======================================================")
    print(f"ALL PLAYWRIGHT TESTS PASSED! Total console errors: {len(console_errors)}")
    print("=======================================================")

    if console_errors:
        for err in console_errors:
            print("ERROR:", err)
        sys.exit(1)

if __name__ == "__main__":
    main()
