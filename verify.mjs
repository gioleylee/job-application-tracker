import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import process from "node:process";
import path from "node:path";
import { chromium } from "playwright";

const PORT = 4173;
const baseUrl = `http://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(PORT)
  }
});

let browser;

try {
  await waitForServer(baseUrl);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#themeToggleBtn").click();
  await expectAttribute(page.locator("html"), "data-theme", "dark");
  await page.reload({ waitUntil: "networkidle" });
  await expectAttribute(page.locator("html"), "data-theme", "dark");

  await page.locator("#company").fill("Anthropic");
  await page.locator("#role").fill("Product Operations");
  await page.locator("#location").fill("Remote");
  await page.locator("#status").selectOption("Applied");
  await page.locator("#priority").selectOption("High");
  await page.locator("#source").fill("Referral");
  await page.locator("#salary").fill("$120k - $150k");
  await page.locator("#interviewDate").fill("2026-05-01");
  await page.locator("#jobLink").fill("https://example.com/anthropic-product-operations");
  await page.locator("#contactName").fill("Riley Park");
  await page.locator("#contactEmail").fill("riley@example.com");
  await page.locator("#nextStep").fill("Prep hiring manager stories");
  await page.locator("#notes").fill("Browser verification run created this application.");
  await page.locator("button[type='submit']").click();

  await expectText(page.locator("#totalCount"), "1");
  await expectText(page.locator("#activeCount"), "1");
  await expectText(page.locator("#highPriorityCount"), "1");
  await expectText(page.locator(".application-card .company-name").first(), "Anthropic");
  await expectEventuallyText(page.locator("#attentionList .attention-title").first(), "Anthropic - Product Operations");

  await page.locator(".edit-btn").first().click();
  await page.locator("#status").selectOption("Interviewing");
  await page.locator("button[type='submit']").click();

  await expectText(page.locator("#interviewCount"), "1");
  await expectText(page.locator(".status-badge").first(), "Interviewing");

  await page.locator("#statusFilter").selectOption("Interviewing");
  await expectText(page.locator("#applicationList .application-card").first().locator(".company-name"), "Anthropic");
  await page.locator("#statusFilter").selectOption("All");
  await page.locator("#sortSelect").selectOption("company-asc");

  const importPath = path.join(process.cwd(), "tmp-import.json");
  await fs.writeFile(importPath, JSON.stringify([
    {
      company: "Stripe",
      role: "Program Manager",
      location: "Remote",
      status: "Screening",
      appliedDate: "2026-04-20",
      salary: "$130k - $155k",
      jobLink: "https://example.com/stripe-program-manager",
      followUpDate: "2026-04-29",
      notes: "Imported test record."
    }
  ], null, 2));

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#clearAllBtn").click();
  await expectEventuallyText(page.locator("#totalCount"), "0");
  await page.locator("#importFileInput").setInputFiles(importPath);
  await expectEventuallyText(page.locator("#totalCount"), "1");
  await expectEventuallyText(page.locator(".application-card .company-name").first(), "Stripe");
  await fs.rm(importPath, { force: true });

  console.log("Verification passed: dark mode, richer tracking fields, next-actions, save/load, clear-all, add, edit, sort, and filter flows succeeded in a live browser session.");
} finally {
  if (browser) {
    await browser.close();
  }

  server.kill();
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Wait for the server to finish booting.
    }

    await delay(250);
  }

  throw new Error(`Server did not become available at ${url}`);
}

async function expectText(locator, expected) {
  const value = (await locator.textContent())?.trim();

  if (value !== expected) {
    throw new Error(`Expected "${expected}" but received "${value}"`);
  }
}

async function expectEventuallyText(locator, expected) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const value = (await locator.textContent())?.trim();

    if (value === expected) {
      return;
    }

    await delay(100);
  }

  await expectText(locator, expected);
}

async function expectAttribute(locator, name, expected) {
  const value = await locator.getAttribute(name);

  if (value !== expected) {
    throw new Error(`Expected attribute ${name} to be "${expected}" but received "${value}"`);
  }
}
