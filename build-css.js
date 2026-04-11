const postcss = require('postcss');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public/css/style.css');
const outputPath = path.join(__dirname, 'public/css/style.min.css');
const configPath = path.join(__dirname, 'postcss.config.js');

const css = fs.readFileSync(inputPath, 'utf8');
const config = require(configPath);

postcss(Object.entries(config.plugins).map(([plugin, options]) => {
  if (plugin === '@tailwindcss/postcss') {
    return require(plugin)(options);
  }
}))
  .process(css, { from: inputPath, to: outputPath })
  .then(result => {
    fs.writeFileSync(outputPath, result.css);
    console.log('\n✅ Tailwind CSS compiled successfully with FULL colors!');
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📊 File size: ${(result.css.length / 1024).toFixed(2)} KB`);
  })
  .catch(err => {
    console.error('❌ Error compiling Tailwind CSS:', err);
    process.exit(1);
  });
