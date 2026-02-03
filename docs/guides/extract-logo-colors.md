# Extracting Colors from SVG Logo

This guide explains how to decode the SVG logo and extract its actual colors/gradients for use in React Native components.

## Overview

The `assets/Asset 1.svg` file contains a base64-encoded PNG image. To extract the actual colors:

## Method 1: Using the Extraction Script (Recommended)

1. **Install sharp** (for image analysis):
```bash
npm install --save-dev sharp
```

2. **Run the extraction script**:
```bash
node scripts/extract-logo-colors.js
```

3. **The script will**:
   - Extract the base64 data from the SVG
   - Analyze the image to find dominant colors
   - Output color values you can use

4. **Update `lib/utils/logoColors.ts`** with the extracted colors

## Method 2: Manual Extraction

1. **Extract base64 data**:
   - Open `assets/Asset 1.svg`
   - Find the `data:image/png;base64,` string
   - Copy everything after the comma

2. **Decode the image**:
   - Use an online tool: https://base64.guru/converter/decode/image
   - Or use: https://www.base64-image.de/
   - Save the decoded PNG

3. **Analyze colors**:
   - Open the PNG in an image editor (Photoshop, GIMP, etc.)
   - Use the color picker to identify:
     - Primary color (most dominant)
     - Secondary colors
     - Gradient colors (if any)

4. **Update `lib/utils/logoColors.ts`** with your findings

## Method 3: Using React Native Image Analysis (Runtime)

For runtime color extraction, you can use libraries like:
- `react-native-image-colors` - extracts dominant colors from images
- `expo-image-manipulator` - for image processing

Example:
```typescript
import { getColors } from 'react-native-image-colors';

const colors = await getColors(require('../assets/Asset 1.svg'), {
  fallback: '#007AFF',
  cache: true,
  key: 'logo',
});

console.log(colors.dominant); // Primary color
console.log(colors.platform); // Platform-specific color object
```

## Using Logo Colors in Components

### Simple Color Usage

```typescript
import { getLogoPrimaryColor } from '../lib/utils/logoColors';

<Octicons
  name="sparkle-fill"
  size={24}
  color={getLogoPrimaryColor()}
/>
```

### Gradient Usage

If your logo uses gradients, you can use `expo-linear-gradient`:

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import { getLogoGradient } from '../lib/utils/logoColors';

<LinearGradient
  colors={getLogoGradient()}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.gradient}
>
  <Octicons name="sparkle-fill" size={24} color="#FFFFFF" />
</LinearGradient>
```

### Updating Colors

1. Extract colors using one of the methods above
2. Update `lib/utils/logoColors.ts`:
```typescript
export const logoColors = {
  primary: '#YOUR_EXTRACTED_COLOR',
  secondary: '#YOUR_SECONDARY_COLOR',
  gradient: {
    start: '#GRADIENT_START',
    end: '#GRADIENT_END',
  },
  gradientArray: ['#GRADIENT_START', '#GRADIENT_END'],
};
```

3. All components using `getLogoPrimaryColor()` will automatically use the new colors

## Current Implementation

The `AppBarLayout` component now uses `getLogoPrimaryColor()` for the sparkle icon. To update the color:

1. Run the extraction script or manually extract colors
2. Update `lib/utils/logoColors.ts`
3. The sparkle icon will automatically use the new color

## Notes

- The SVG contains a PNG image, not vector graphics, so we need to decode it
- Colors may vary slightly depending on the extraction method
- For best results, use the dominant color from the center/most visible part of the logo
- If the logo has gradients, extract both start and end colors

