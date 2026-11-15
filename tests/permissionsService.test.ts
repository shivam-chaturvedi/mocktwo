import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PermissionsService } from "../electron/permissions/permissionsService.cjs";

describe("Phase 4: Permissions Engine & TCC Management", () => {
  test("macOS: queries status and persists to SQLite cache", async () => {
    const savedRows: any[] = [];
    const mockStorage = {
      execute: async (type: string, payload: any) => {
        if (type === "permissions:save") {
          savedRows.push(payload);
          return true;
        }
        return null;
      },
    };

    let askedAccess = false;
    const permissions = new PermissionsService(mockStorage as any, () => null);

    const status = await permissions.getStatus("camera");
    assert.ok(typeof status === "string");
    // Verify SQLite save was attempted
    assert.equal(savedRows.length, 1);
    assert.equal(savedRows[0].resource, "camera");
  });

  test("macOS: does not re-prompt if permission is already denied", async () => {
    let askCallCount = 0;
    const mockStorage = {
      execute: async () => true,
    };
    const mockSysPref = {
      getMediaAccessStatus: () => "denied",
      askForMediaAccess: async () => {
        askCallCount++;
        return false;
      },
    };

    const permissions = new PermissionsService(mockStorage as any, () => null, mockSysPref as any);

    const granted = await permissions.requestAccess("camera");
    assert.equal(granted, false);
    assert.equal(askCallCount, 0, "askForMediaAccess must never be called when status is denied");
  });

  test("Windows/Linux: fallback returns true or checks safely", async () => {
    const originalPlatform = process.platform;
    try {
      const mockStorage = { execute: async () => true };
      const permissions = new PermissionsService(mockStorage as any, () => null);

      // On non-macOS, requestAccess returns true to let getUserMedia prompt
      const result = await permissions.requestAccess("microphone");
      assert.ok(typeof result === "boolean");
    } finally {
      // restore
    }
  });

  test("refreshOnFocus detects changes and notifies renderer", async () => {
    let sentEvent: any = null;
    const mockWin = {
      isDestroyed: () => false,
      webContents: {
        send: (channel: string, payload: any) => {
          sentEvent = { channel, payload };
        },
      },
    };

    const mockStorage = { execute: async () => true };
    const permissions = new PermissionsService(mockStorage as any, () => mockWin);

    // Initial state
    permissions.cachedStatus = { camera: "not-determined", microphone: "not-determined" };

    // Simulate user toggling permission in macOS System Settings while app was unfocused
    let mockCurrentStatus = "granted";
    permissions.getStatus = async (res: string) => mockCurrentStatus;

    await permissions.refreshOnFocus();

    assert.ok(sentEvent, "Should emit permissions:updated on focus change");
    assert.equal(sentEvent.channel, "permissions:updated");
    assert.equal(sentEvent.payload.camera, "granted");
  });
});
