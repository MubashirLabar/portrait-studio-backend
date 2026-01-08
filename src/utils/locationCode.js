/**
 * Generate a short code from location name
 * Examples:
 * - "Mall of Multan" -> "MOM"
 * - "Garden Town Cantt Multan" -> "GTC"
 * - "City Center" -> "CC"
 * - "Shopping Mall" -> "SM"
 */
const generateLocationCode = (locationName) => {
  if (!locationName || typeof locationName !== 'string') {
    return null;
  }

  // Remove extra spaces and split into words
  const words = locationName
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(word => word.length > 0);

  if (words.length === 0) {
    return null;
  }

  // If single word and length <= 3, use it directly
  if (words.length === 1) {
    return words[0].substring(0, 3);
  }

  // Common words to skip or abbreviate
  const skipWords = ['OF', 'THE', 'AND', 'AT', 'IN', 'ON'];
  
  // Get first letter of each significant word
  const code = words
    .filter(word => !skipWords.includes(word))
    .map(word => word[0])
    .join('')
    .substring(0, 3); // Max 3 letters

  // If after filtering we have no letters, use first letters of all words
  if (code.length === 0) {
    return words
      .map(word => word[0])
      .join('')
      .substring(0, 3);
  }

  return code;
};

module.exports = {
  generateLocationCode,
};

