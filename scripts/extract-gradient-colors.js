/**
 * Enhanced script to extract multiple gradient color stops from the logo
 * Samples multiple points across the gradient to capture all intermediate colors
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

// Try to use sharp if available
try {
  const sharp = require('sharp');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // Get image dimensions first
  sharp(buffer)
    .metadata()
    .then(metadata => {
      const width = metadata.width;
      const height = metadata.height;
      const centerY = Math.floor(height / 2);
      
      console.log(`Image dimensions: ${width}x${height}`);
      console.log(`Sampling gradient at y=${centerY} (center row)\n`);
      
      // Sample multiple points - try both horizontal and vertical
      const centerX = Math.floor(width / 2);
      const samplePoints = [0, 0.2, 0.4, 0.6, 0.8, 1.0]; // 0%, 20%, 40%, 60%, 80%, 100%
      const colors = [];
      
      console.log('Sampling horizontally (left to right):');
      const extractPromisesH = samplePoints.map((ratio) => {
        const x = Math.floor(width * ratio);
        const extractWidth = Math.min(20, width - x); // Sample a larger region
        
        return sharp(buffer)
          .extract({ left: x, top: centerY - 10, width: extractWidth, height: 20 })
          .stats()
          .then(stats => {
            const dominant = stats.dominant;
            if (dominant) {
              const r = dominant.r.toString(16).padStart(2, '0');
              const g = dominant.g.toString(16).padStart(2, '0');
              const b = dominant.b.toString(16).padStart(2, '0');
              const color = `#${r}${g}${b}`;
              const position = `${Math.round(ratio * 100)}%`;
              colors.push({ ratio, color, position, direction: 'horizontal' });
              console.log(`  ${position.padEnd(6)} (x=${x.toString().padStart(4)}): ${color}`);
            }
          });
      });
      
      console.log('\nSampling vertically (top to bottom):');
      const extractPromisesV = samplePoints.map((ratio) => {
        const y = Math.floor(height * ratio);
        const extractHeight = Math.min(20, height - y);
        
        return sharp(buffer)
          .extract({ left: centerX - 10, top: y, width: 20, height: extractHeight })
          .stats()
          .then(stats => {
            const dominant = stats.dominant;
            if (dominant) {
              const r = dominant.r.toString(16).padStart(2, '0');
              const g = dominant.g.toString(16).padStart(2, '0');
              const b = dominant.b.toString(16).padStart(2, '0');
              const color = `#${r}${g}${b}`;
              const position = `${Math.round(ratio * 100)}%`;
              console.log(`  ${position.padEnd(6)} (y=${y.toString().padStart(4)}): ${color}`);
            }
          });
      });
      
      return Promise.all([...extractPromisesH, ...extractPromisesV]).then(() => {
        console.log('\n=== Gradient Color Array (Horizontal) ===');
        const horizontalColors = colors.filter(c => c.direction === 'horizontal').sort((a, b) => a.ratio - b.ratio);
        const colorArray = horizontalColors.map(c => c.color);
        console.log(`gradientArray: [${colorArray.map(c => `'${c}'`).join(', ')}],`);
        
        console.log('\n=== For LinearGradient with locations ===');
        console.log('Colors:', colorArray);
        console.log('Locations:', horizontalColors.map(c => c.ratio));
        
        return { colors: colorArray, locations: horizontalColors.map(c => c.ratio) };
      });
    })
    .catch(err => {
      console.log('\nError processing image:', err.message);
      console.log('Install sharp: npm install --save-dev sharp');
    });
    
} catch (e) {
  console.log('\nSharp library not installed. Install it to extract gradient colors:');
  console.log('npm install --save-dev sharp');
  console.log('\nAlternatively, you can:');
  console.log('1. Decode the base64 image');
  console.log('2. Open it in an image editor');
  console.log('3. Sample colors at 0%, 20%, 40%, 60%, 80%, 100% across the gradient');
  console.log('4. Update logoColors.ts with all the color values');
}

