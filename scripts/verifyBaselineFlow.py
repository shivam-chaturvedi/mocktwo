import os
import sys
import json
import time
from playwright.sync_api import sync_playwright

OUT_DIR = "/Users/shivam/.gemini/antigravity/brain/d9e2c7f3-2a20-4f91-b796-b36bf13af0d4/screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

RESOLUTIONS = [
    (1100, 700, "1100x700"),
    (1440, 900, "1440x900"),
    (1920, 1080, "1920x1080"),
]

CAMERA_MOCK_SCRIPT = """
(() => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1c1c1e";
  ctx.fillRect(0, 0, 640, 480);

  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }

  navigator.mediaDevices.getUserMedia = async (constraints) => {
    if (window.__MOCK_CAMERA_DENIED) {
      throw new DOMException("Permission denied by user", "NotAllowedError");
    }
    if (window.__MOCK_CAMERA_NOT_FOUND) {
      throw new DOMException("Requested camera device not found", "NotFoundError");
    }
    return canvas.captureStream(30);
  };
})();
"""

def main():
    print("=== Starting Calm Baseline Playwright Verification ===")
    all_passed = True

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for width, height, res_name in RESOLUTIONS:
            print(f"\n==========================================")
            print(f"Testing Viewport: {res_name} ({width}x{height})")
            print(f"==========================================")

            context = browser.new_context(
                viewport={"width": width, "height": height},
                permissions=["camera"]
            )
            context.add_init_script(CAMERA_MOCK_SCRIPT)
            page = context.new_page()

            console_errors = []
            network_requests = []

            page.on("console", lambda msg: console_errors.append(f"Console {msg.type}: {msg.text}") if msg.type == "error" else None)
            page.on("pageerror", lambda err: console_errors.append(f"Page error: {err}"))
            page.on("request", lambda req: network_requests.append(req.url))

            # Clear storage for fresh test run
            page.goto("http://127.0.0.1:5173", wait_until="networkidle")
            page.evaluate("() => { localStorage.clear(); }")
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(500)

            # Check 1: Greeting headline and subtitle
            greeting_text = page.locator("header h1").inner_text()
            print(f"[{res_name}] Greeting: {greeting_text}")
            assert "Learner" not in greeting_text, f"Default name 'Learner' should NOT appear in greeting, got: {greeting_text}"

            subtitle_text = page.locator("header p").inner_text()
            print(f"[{res_name}] Subtitle: {subtitle_text}")
            assert "Calibrate your camera baseline to begin rehearsal" in subtitle_text, f"Expected calibration prompt subtitle, got: {subtitle_text}"

            # Check 2: Welcome card and Baseline card buttons are enabled
            baseline_btn = page.locator('button:has-text("Set calm baseline (60s)")')
            assert baseline_btn.is_visible(), "Baseline button must be visible"
            assert baseline_btn.is_enabled(), "Baseline button must be enabled"

            welcome_baseline_btn = page.locator('button:has-text("Set your calm baseline")')
            assert welcome_baseline_btn.is_visible(), "Welcome card baseline button must be visible"
            assert welcome_baseline_btn.is_enabled(), "Welcome card baseline button must be enabled"

            # Check 3: Zero Document Scrolling
            doc_scroll = page.evaluate("() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight })")
            print(f"[{res_name}] Scroll metrics: {doc_scroll}")
            assert doc_scroll["scrollHeight"] <= doc_scroll["innerHeight"], f"Page scrolling at {res_name}: {doc_scroll}"

            # -----------------------------------------------------------------
            # TEST PERMISSION DENIED STEP
            # -----------------------------------------------------------------
            print(f"[{res_name}] Testing Permission Denied Step...")
            page.evaluate("() => { window.__MOCK_CAMERA_DENIED = true; }")
            baseline_btn.click()
            page.wait_for_timeout(300)

            # Click start camera in Step 1
            page.locator('button:has-text("Start camera")').click()
            page.wait_for_timeout(500)

            # Verify Permission Denied UI
            perm_heading = page.locator('h3:has-text("Camera access required")')
            assert perm_heading.is_visible(), "Permission Denied heading must appear"
            settings_btn = page.locator('button:has-text("Open System Settings")')
            assert settings_btn.is_visible(), "Open System Settings button must appear"
            try_again_btn = page.locator('button:has-text("Try again")')
            assert try_again_btn.is_visible(), "Try again button must appear"

            page.screenshot(path=os.path.join(OUT_DIR, f"baseline_permission_denied_{res_name}.png"))

            # Close sheet
            page.locator('button:has-text("Cancel")').first.click()
            page.wait_for_timeout(300)

            # -----------------------------------------------------------------
            # TEST NO CAMERA FOUND STEP
            # -----------------------------------------------------------------
            print(f"[{res_name}] Testing No Camera Found Step...")
            page.evaluate("() => { window.__MOCK_CAMERA_DENIED = false; window.__MOCK_CAMERA_NOT_FOUND = true; }")
            baseline_btn.click()
            page.wait_for_timeout(300)
            page.locator('button:has-text("Start camera")').click()
            page.wait_for_timeout(500)

            no_cam_heading = page.locator('h3:has-text("No camera found")')
            assert no_cam_heading.is_visible(), "No camera found heading must appear"
            retry_btn = page.locator('button:has-text("Retry")')
            assert retry_btn.is_visible(), "Retry button must appear"

            page.screenshot(path=os.path.join(OUT_DIR, f"baseline_no_camera_{res_name}.png"))

            page.locator('button:has-text("Cancel")').first.click()
            page.wait_for_timeout(300)

            # -----------------------------------------------------------------
            # TEST COMPLETE 60S FLOW & RECORDING NETWORK REQUESTS
            # -----------------------------------------------------------------
            print(f"[{res_name}] Testing Complete 60s Flow...")
            page.evaluate("() => { window.__MOCK_CAMERA_NOT_FOUND = false; }")
            initial_req_count = len(network_requests)

            # Click baseline button
            baseline_btn.click()
            page.wait_for_timeout(300)

            # Step 1: Intro
            intro_path = os.path.join(OUT_DIR, f"baseline_intro_{res_name}.png")
            page.screenshot(path=intro_path)
            privacy_note = page.locator("text=Your video stays on this device and is not saved.")
            assert privacy_note.is_visible(), "Privacy disclosure must be visible in Intro"

            # Click start camera -> Step 3: Get Ready Countdown
            page.locator('button:has-text("Start camera")').click()
            page.wait_for_timeout(600)

            cd_path = os.path.join(OUT_DIR, f"baseline_countdown_{res_name}.png")
            page.screenshot(path=cd_path)

            readiness_checks = page.locator("text=Face detected")
            assert readiness_checks.is_visible(), "Readiness check must show Face detected"

            # Wait for countdown to finish and transition to capturing
            page.wait_for_selector("text=left", timeout=5000)
            print(f"[{res_name}] Capturing step active.")

            # Test Quality Guard: simulate face lost
            print(f"[{res_name}] Simulating face lost...")
            page.evaluate("() => { window.dispatchEvent(new CustomEvent('mocktwo-face-status', { detail: { inFrame: false } })); }")
            page.wait_for_timeout(400)

            paused_path = os.path.join(OUT_DIR, f"baseline_paused_{res_name}.png")
            page.screenshot(path=paused_path)
            paused_overlay = page.locator("text=Keep your face in the frame")
            assert paused_overlay.is_visible(), "Face lost notice 'Keep your face in the frame' must appear"

            # Resume face
            page.evaluate("() => { window.dispatchEvent(new CustomEvent('mocktwo-face-status', { detail: { inFrame: true } })); }")
            page.wait_for_timeout(300)

            # Fast-forward measurement to 60s
            print(f"[{res_name}] Completing 60s calibration...")
            page.evaluate("""() => {
              window.dispatchEvent(new CustomEvent('mocktwo-complete-baseline'));
            }""")
            
            page.wait_for_selector("text=Calibration complete", timeout=6000)
            print(f"[{res_name}] Step 5: Result reached!")

            res_path = os.path.join(OUT_DIR, f"baseline_result_{res_name}.png")
            page.screenshot(path=res_path)

            # Verify honest metrics in Result screen
            pulse_metric = page.locator("text=68 bpm")
            assert pulse_metric.is_visible(), "Resting pulse must be shown"
            breathing_metric = page.locator("text=14 br/m")
            assert breathing_metric.is_visible(), "Resting breathing rate must be shown"
            hrv_metric = page.locator("text=54 ms")
            assert hrv_metric.is_visible(), "Resting HRV must be shown"
            quality_badge = page.locator("text=Signal quality:")
            assert quality_badge.is_visible(), "Quality rating badge must be shown"

            # Check network requests during baseline flow
            baseline_reqs = [r for r in network_requests[initial_req_count:] if not r.startswith("http://127.0.0.1:5173")]
            print(f"[{res_name}] External network requests during baseline: {len(baseline_reqs)}")
            assert len(baseline_reqs) == 0, f"Baseline measurement must make ZERO external network requests! Found: {baseline_reqs}"

            # Save baseline
            save_btn = page.locator('button:has-text("Save baseline")')
            save_btn.click()
            page.wait_for_timeout(600)

            # Check localStorage persistence
            stored_raw = page.evaluate("() => localStorage.getItem('mocktwo_baseline_v2')")
            assert stored_raw is not None, "Baseline must be persisted under 'mocktwo_baseline_v2'"
            stored_data = json.loads(stored_raw)
            print(f"[{res_name}] Stored baseline data: pulse={stored_data.get('restingPulse')}, hrv={stored_data.get('restingHrvRmssd')}")
            assert stored_data.get("isCalibrated") is True
            assert stored_data.get("restingPulse") == 68

            # Check Home screen updates:
            # 1. Greeting subtitle
            updated_sub = page.locator("header p").inner_text()
            print(f"[{res_name}] Updated subtitle: {updated_sub}")
            assert "Ready for your next practice" in updated_sub, f"Subtitle must update after baseline is set, got: {updated_sub}"

            # 2. Welcome card: "Set your calm baseline" button MUST BE GONE
            welcome_btn_count = page.locator('button:has-text("Set your calm baseline")').count()
            assert welcome_btn_count == 0, "Welcome card 'Set your calm baseline' button must be removed when baseline exists"

            # 3. Baseline card: shows "Baseline set" and quiet "Recalibrate"
            baseline_set_heading = page.locator("text=Baseline set")
            assert baseline_set_heading.is_visible(), "Baseline card must show 'Baseline set'"
            recalibrate_btn = page.locator('button:has-text("Recalibrate")')
            assert recalibrate_btn.is_visible(), "Quiet 'Recalibrate' button must appear"

            home_set_path = os.path.join(OUT_DIR, f"baseline_home_set_{res_name}.png")
            page.screenshot(path=home_set_path)
            print(f"[{res_name}] All baseline checks passed cleanly!")

            context.close()

        browser.close()

    print("\n==========================================")
    print("ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!")
    print("==========================================")

if __name__ == "__main__":
    main()
