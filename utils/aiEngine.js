
const stringSimilarity = require('string-similarity');
const QRCode = require('qrcode');

/**
 * AI Smart Matching Logic
 * Compares descriptions and titles to find potential matches
 */
const findMatches = (newItem, pool) => {
    if (!pool || pool.length === 0) return [];

    const matches = pool.map(item => {
        const titleScore = stringSimilarity.compareTwoStrings(
            newItem.title.toLowerCase(), 
            item.title.toLowerCase()
        );
        const descScore = stringSimilarity.compareTwoStrings(
            (newItem.description || newItem.visible_description || "").toLowerCase(),
            (item.description || item.visible_description || "").toLowerCase()
        );
        
        // Final score: heavier weight on description, combined with category match
        const isCategoryMatch = newItem.category === item.category ? 1.2 : 0.5;
        const totalScore = ((titleScore * 0.4) + (descScore * 0.6)) * isCategoryMatch;
        
        return { ...item, matchScore: Math.round(totalScore * 100) };
    });

    // Return top 3 matches with score > 15 (threshold)
    return matches
        .filter(m => m.matchScore > 15)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3);
};

/**
 * Generate unique QR Code for each item
 */
const generateQR = async (itemId, type) => {
    try {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const url = `${clientUrl}/item/${type}/${itemId}`;
        return await QRCode.toDataURL(url);
    } catch (err) {
        console.error("QR Sync Failure:", err);
        return null;
    }
};

/**
 * AI Description Enhancer (Simulated Logic)
 * Clarifies and structures user inputs
 */
const enhanceDescription = (rawText) => {
    if (rawText.length < 5) return rawText;
    
    // Pattern: 'color' + 'item' + 'location'
    const colors = ["black", "blue", "red", "green", "white", "silver", "gold"];
    const locKeywords = ["near", "at", "in", "outside"];
    
    let enhanced = rawText.charAt(0).toUpperCase() + rawText.slice(1);
    
    // Add professional structure if missing
    if (!enhanced.includes(".") && enhanced.length < 30) {
        enhanced += `. Reported for student recovery via Campus Hub.`;
    }
    
    return enhanced;
};

module.exports = { findMatches, generateQR, enhanceDescription };
