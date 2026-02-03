/**
 * Script to extract colors from the SVG logo's base64-encoded PNG image
 * 
 * This script:
 * 1. Reads the SVG file
 * 2. Extracts the base64 PNG data
 * 3. Decodes and analyzes the image to find dominant colors
 * 4. Outputs the colors in a format usable by React Native
 * 
 * Run with: node scripts/extract-logo-colors.js
 */

const fs = require('fs');
const path = require('path');

// Read the SVG file
const svgPath = path.join(__dirname, '../assets/Asset 1.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Extract base64 data from the SVG
const base64Match = svgContent.match(/data:image\/png;base64,([^"]+)/);
if (!base64Match) {
  console.error('Could not find base64 image data in SVG');
  process.exit(1);
}

const base64Data = base64Match[1];

// For Node.js, we can use the 'sharp' library or 'jimp' to analyze the image
// But first, let's save the decoded image and provide instructions

console.log('Found base64 image data in SVG');
console.log('Base64 length:', base64Data.length);

// Save the base64 data to a file for analysis
const outputPath = path.join(__dirname, '../assets/logo-base64.txt');
fs.writeFileSync(outputPath, base64Data);

console.log('\nBase64 data saved to:', outputPath);
console.log('\nTo extract colors, you have a few options:');
console.log('\n1. Use an online tool:');
console.log('   - Copy the base64 data and paste it into: https://base64.guru/converter/decode/image');
console.log('   - Or use: https://www.base64-image.de/');
console.log('   - Then analyze the image with a color picker tool');
console.log('\n2. Use a Node.js library (install first):');
console.log('   npm install --save-dev sharp');
console.log('   Then run this script with color extraction logic');
console.log('\n3. Manual approach:');
console.log('   - Decode the base64 to PNG');
console.log('   - Open in an image editor');
console.log('   - Use color picker to identify dominant colors');
console.log('\n4. Quick color extraction (approximate):');
console.log('   Based on typical business/finance logos, common colors are:');
console.log('   - Primary: #007AFF (iOS Blue)');
console.log('   - Secondary: #0051D5 (Darker Blue)');
console.log('   - Accent: #00C7FF (Light Blue)');
console.log('   - Gradient: linear-gradient(135deg, #007AFF 0%, #0051D5 100%)');

// Try to use sharp if available
try {
  const sharp = require('sharp');
  const buffer = Buffer.from(base64Data, 'base64');
  
  sharp(buffer)
    .resize(200, 200, { fit: 'inside' })
    .stats()
    .then(stats => {
      console.log('\n=== Image Color Analysis ===');
      
      // Get dominant colors from channels
      const dominant = stats.dominant;
      let primaryColor = '#007AFF';
      if (dominant) {
        const r = dominant.r.toString(16).padStart(2, '0');
        const g = dominant.g.toString(16).padStart(2, '0');
        const b = dominant.b.toString(16).padStart(2, '0');
        primaryColor = `#${r}${g}${b}`;
        console.log(`Primary (Dominant): ${primaryColor}`);
      }
      
      // Get average colors
      const channels = stats.channels;
      let averageColor = '#007AFF';
      if (channels && channels.length >= 3) {
        const avgR = Math.round(channels[0].mean).toString(16).padStart(2, '0');
        const avgG = Math.round(channels[1].mean).toString(16).padStart(2, '0');
        const avgB = Math.round(channels[2].mean).toString(16).padStart(2, '0');
        averageColor = `#${avgR}${avgG}${avgB}`;
        console.log(`Average: ${averageColor}`);
      }
      
      // Extract colors from different regions for gradient
      return sharp(buffer)
        .resize(200, 200, { fit: 'inside' })
        .extract({ left: 0, top: 0, width: 100, height: 200 }) // Left side
        .stats();
    })
    .then(leftStats => {
      return sharp(buffer)
        .resize(200, 200, { fit: 'inside' })
        .extract({ left: 100, top: 0, width: 100, height: 200 }) // Right side
        .stats()
        .then(rightStats => {
          const leftDominant = leftStats.dominant;
          const rightDominant = rightStats.dominant;
          
          let leftColor = '#007AFF';
          let rightColor = '#0051D5';
          
          if (leftDominant) {
            const r = leftDominant.r.toString(16).padStart(2, '0');
            const g = leftDominant.g.toString(16).padStart(2, '0');
            const b = leftDominant.b.toString(16).padStart(2, '0');
            leftColor = `#${r}${g}${b}`;
          }
          
          if (rightDominant) {
            const r = rightDominant.r.toString(16).padStart(2, '0');
            const g = rightDominant.g.toString(16).padStart(2, '0');
            const b = rightDominant.b.toString(16).padStart(2, '0');
            rightColor = `#${r}${g}${b}`;
          }
          
          console.log(`\n=== Gradient Colors ===`);
          console.log(`Left side (start): ${leftColor}`);
          console.log(`Right side (end): ${rightColor}`);
          console.log(`\n=== Copy to logoColors.ts ===`);
          console.log(`primary: '${leftColor}',`);
          console.log(`secondary: '${rightColor}',`);
          console.log(`gradient: {`);
          console.log(`  start: '${leftColor}',`);
          console.log(`  end: '${rightColor}',`);
          console.log(`},`);
          console.log(`gradientArray: ['${leftColor}', '${rightColor}'],`);
        });
    })
    .catch(err => {
      console.log('\nSharp not available or error:', err.message);
      console.log('Install sharp: npm install --save-dev sharp');
    });
} catch (e) {
  console.log('\nSharp library not installed. Install it to auto-extract colors:');
  console.log('npm install --save-dev sharp');
}

