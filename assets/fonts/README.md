# Tiempos Font Files

This directory should contain the Tiempos font files. The app is configured to use the following font files:

## Required Font Files

Place the following font files in this directory:

- `TiemposText-Regular.otf` - Regular weight
- `TiemposText-Bold.otf` - Bold weight
- `TiemposText-Italic.otf` - Italic style
- `TiemposText-BoldItalic.otf` - Bold Italic style

## Font File Naming

If your Tiempos font files have different names, you have two options:

1. **Rename the files** to match the names above, OR
2. **Update the font references** in:
   - `App.tsx` - Update the `useFonts` hook
   - `app.config.js` - Update the `fonts` array
   - `lib/constants/fonts.ts` - Update the font family names

## Common Tiempos Font Variants

Tiempos fonts may come in different variants:
- **TiemposText** - Text variant (recommended for body text)
- **TiemposHeadline** - Headline variant (for large headings)

If you have TiemposHeadline variants, you can add them and use them for headings in your typography styles.

## File Formats

The app supports both `.otf` and `.ttf` formats. Just make sure the file extensions match in the configuration files.

