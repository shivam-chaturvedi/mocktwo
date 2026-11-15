import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  TavusClient,
  TavusApiError,
  redactSecrets,
} = require("../electron/tavus/tavusClient.cjs");

describe("Milestone M4: TavusClient Subsystem", () => {
  test("Redacts Tavus API keys and header secrets in messages", () => {
    const raw = "Error with tvsk_abc123456789xyz on Authorization: Bearer secret_token";
    const redacted = redactSecrets(raw);
    assert.ok(!redacted.includes("tvsk_abc123456789xyz"));
    assert.ok(redacted.includes("tvsk_***REDACTED***"));
    assert.ok(redacted.includes("Bearer ***REDACTED***"));
  });

  test("Throws no_api_key error when key is omitted or empty", async () => {
    const client = new TavusClient({ apiKey: "" });
    await assert.rejects(
      async () => {
        await client.listFaces();
      },
      (err: any) => {
        assert.equal(err.code, "no_api_key");
        return true;
      }
    );
  });

  test("Handles successful createPal POST", async () => {
    const mockFetch = async (url: string, opts: any) => {
      assert.equal(opts.method, "POST");
      assert.equal(opts.headers["x-api-key"], "test-key");
      const body = JSON.parse(opts.body);
      assert.equal(body.pal_name, "Test PAL");
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ pal_id: "pal_12345", pal_name: "Test PAL" }),
      };
    };

    const client = new TavusClient({
      apiKey: "test-key",
      fetchImpl: mockFetch,
    });

    const res = await client.createPal({ pal_name: "Test PAL" });
    assert.equal(res.pal_id, "pal_12345");
  });

  test("Classifies HTTP error statuses correctly", async () => {
    const statuses = [
      { status: 401, expectedCode: "unauthorized" },
      { status: 402, expectedCode: "plan_limit" },
      { status: 403, expectedCode: "plan_limit" },
      { status: 400, expectedCode: "validation" },
      { status: 422, expectedCode: "validation" },
      { status: 429, expectedCode: "rate_limited" },
      { status: 500, expectedCode: "server" },
    ];

    for (const { status, expectedCode } of statuses) {
      const mockFetch = async () => ({
        ok: false,
        status,
        text: async () => JSON.stringify({ message: `Simulated error for ${status}` }),
      });

      const client = new TavusClient({
        apiKey: "test-key",
        fetchImpl: mockFetch,
      });

      await assert.rejects(
        async () => {
          await client.createPal({ pal_name: "Fail" });
        },
        (err: any) => {
          assert.equal(err.code, expectedCode, `Status ${status} should map to ${expectedCode}`);
          assert.equal(err.status, status);
          return true;
        }
      );
    }
  });

  test("Retries idempotent GET requests on 500 errors", async () => {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount < 3) {
        return {
          ok: false,
          status: 502,
          text: async () => JSON.stringify({ message: "Bad Gateway" }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ face_id: "f_1" }] }),
      };
    };

    const client = new TavusClient({
      apiKey: "test-key",
      fetchImpl: mockFetch,
    });

    const res = await client.listFaces();
    assert.equal(callCount, 3);
    assert.equal(res.data[0].face_id, "f_1");
  });

  test("deletePal treats 404 as success", async () => {
    const mockFetch = async (url: string, opts: any) => {
      assert.equal(opts.method, "DELETE");
      return {
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: "PAL not found" }),
      };
    };

    const client = new TavusClient({
      apiKey: "test-key",
      fetchImpl: mockFetch,
    });

    const res = await client.deletePal("pal_missing");
    assert.equal(res, null);
  });
});
