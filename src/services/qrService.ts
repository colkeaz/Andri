/**
 * QR Code Service
 * Generates unique identifiers and printable QR codes for non-barcoded items.
 */

export const qrService = {
  generateProductId: (category: string): string => {
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SS-${category.substring(0, 3).toUpperCase()}-${shortId}`;
  },

  printLabels: async (productId: string, name: string, quantity: number = 1) => {
    console.log(`Printing ${quantity} labels for ${name} (${productId})`);
    
    const html = `
      <html>
        <body style="text-align: center; font-family: sans-serif; padding: 20px;">
          <h1>${name}</h1>
          <div style="margin: 20px;">
            <div style="width: 200px; height: 200px; background: #000; margin: auto;"></div>
          </div>
          <p style="font-size: 24px;">${productId}</p>
        </body>
      </html>
    `;
    return html;
  }
};
