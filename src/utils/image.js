const Jimp = require("jimp");

/**
 * Generates a simple PNG summary image containing total, top5 list, and timestamp.
 * @param {string} outPath - path to write the PNG file
 * @param {{total:number, top5: Array<{name:string,estimated_gdp:number}>, last_refreshed_at:string}} opts
 */
module.exports = async function generateSummaryImage(outPath, opts) {
  const width = 800;
  const height = 600;
  const bgColor = 0xffffffff;

  const image = new Jimp(width, height, bgColor);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const small = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

  image.print(font, 24, 24, `Total countries: ${opts.total}`);
  image.print(small, 24, 72, `Last refreshed: ${opts.last_refreshed_at}`);

  image.print(font, 24, 120, `Top 5 by estimated GDP:`);
  let y = 170;
  for (const t of opts.top5.slice(0, 5)) {
    const gdp =
      t.estimated_gdp == null ? "N/A" : Number(t.estimated_gdp).toFixed(2);
    image.print(small, 24, y, `${t.name} — ${gdp}`);
    y += 28;
  }

  await image.writeAsync(outPath);
};
// (duplicate implementation removed) keep the top `generateSummaryImage(outPath, opts)` export
