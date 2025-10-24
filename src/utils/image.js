const Jimp = require("jimp");
const path = require("path");
const fs = require("fs");

async function generateSummaryImage(total, top5, timestamp) {
  const width = 800;
  const height = 600;
  const image = new Jimp(width, height, 0xffffffff);

  const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

  image.print(fontTitle, 20, 20, `Countries Summary`);
  image.print(font, 20, 70, `Total countries: ${total}`);
  image.print(font, 20, 100, `Last refreshed: ${timestamp}`);

  image.print(font, 20, 140, `Top 5 by estimated GDP:`);
  let y = 170;
  top5.forEach((c, idx) => {
    const gdp =
      c.estimated_gdp != null
        ? Number(c.estimated_gdp).toLocaleString()
        : "N/A";
    image.print(font, 20, y, `${idx + 1}. ${c.name} — ${gdp}`);
    y += 30;
  });

  // place cache at the project root `cache/` so app and tests look in the same location
  const cacheDir = path.join(__dirname, "..", "..", "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const out = path.join(cacheDir, "summary.png");
  console.log("[generateSummaryImage] writing summary image to:", out);
  await image.writeAsync(out);
  return out;
}

module.exports = { generateSummaryImage };
