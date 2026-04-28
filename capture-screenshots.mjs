import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const PORT = 4173;
const baseUrl = `http://127.0.0.1:${PORT}`;
const screenshotsDir = path.join(process.cwd(), "screenshots");
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
  await fs.mkdir(screenshotsDir, { recursive: true });
  await waitForServer(baseUrl);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.removeItem("job-application-tracker-v1");
    localStorage.removeItem("job-application-theme");
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("#seedDemoBtn").click();
  await delay(400);
  await page.screenshot({
    path: path.join(screenshotsDir, "dashboard-light.png"),
    fullPage: true
  });

  await page.locator("#themeToggleBtn").click();
  await delay(250);
  await page.screenshot({
    path: path.join(screenshotsDir, "dashboard-dark.png"),
    fullPage: true
  });

  console.log("Screenshots captured in ./screenshots");
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
      // Wait for the server to be ready.
    }

    await delay(250);
  }

  throw new Error(`Server did not become available at ${url}`);
}
