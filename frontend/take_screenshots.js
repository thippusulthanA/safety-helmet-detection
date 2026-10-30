import puppeteer from "puppeteer-core";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, "../docs/screenshots");

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function run() {
  console.log("Launching Edge browser via Puppeteer Core...");
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1366,850"],
    defaultViewport: { width: 1366, height: 850 },
  });

  const page = await browser.newPage();

  const pages = [
    { name: "dashboard.png", url: "http://localhost:5173/?page=dashboard" },
    { name: "image_detection.png", url: "http://localhost:5173/?page=image" },
    { name: "video_detection.png", url: "http://localhost:5173/?page=video" },
    { name: "live_camera.png", url: "http://localhost:5173/?page=stream" },
    { name: "violation_logs.png", url: "http://localhost:5173/?page=logs" },
    { name: "about.png", url: "http://localhost:5173/?page=about" },
  ];

  for (const p of pages) {
    console.log(`Navigating to ${p.url}...`);
    try {
      await page.goto(p.url, { waitUntil: "networkidle0", timeout: 15000 });
      // Wait extra 1 second for animations/charts
      await new Promise((r) => setTimeout(r, 1500));

      const outPath = path.join(screenshotsDir, p.name);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved screenshot: ${outPath} (${fs.statSync(outPath).size} bytes)`);
    } catch (err) {
      console.error(`Error capturing ${p.name}:`, err);
    }
  }

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot runner failed:", err);
  process.exit(1);
});

