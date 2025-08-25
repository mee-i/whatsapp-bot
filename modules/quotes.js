const cheerio = require('cheerio');
const axios = require('axios');

/**
 * Fetches random quotes from jagokata.com
 * @returns {Promise<Object>} Promise that resolves to quotes data or error response
 */
async function getQuotes() {
    const BASE_URL = 'https://jagokata.com/';
    const QUOTE_URL = `${BASE_URL}kata-bijak/acak.html?${Date.now()}`;
    
    try {
        const response = await axios.get(QUOTE_URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.status !== 200) {
            return createErrorResponse('Failed to fetch page');
        }
        
        const $ = cheerio.load(response.data);
        const quotes = extractQuotesFromDocument($, BASE_URL);
        
        if (quotes.length === 0) {
            return createErrorResponse('No quotes found');
        }
        
        return createSuccessResponse(quotes);
        
    } catch (error) {
        console.error('Error fetching quotes:', error.message);
        return createErrorResponse('Network error occurred');
    }
}

/**
 * Extracts quotes data from HTML document
 * @param {CheerioStatic} $ - Cheerio instance
 * @param {string} baseUrl - Base URL for constructing absolute URLs
 * @returns {Array<Object>} Array of quote objects
 */
function extractQuotesFromDocument($, baseUrl) {
    const quotes = [];
    
    $('ul#citatenrijen li').each((index, item) => {
        const quoteData = extractQuoteData($(item), baseUrl);
        if (quoteData) {
            quotes.push(quoteData);
        }
    });
    
    return quotes;
}

/**
 * Extracts quote data from a single list item
 * @param {Cheerio} $item - Cheerio wrapped list item element
 * @param {string} baseUrl - Base URL for constructing absolute URLs
 * @returns {Object|null} Quote object or null if required data is missing
 */
function extractQuoteData($item, baseUrl) {
    const quoteElement = $item.find('q.fbquote');
    const authorElement = $item.find('a.auteurfbnaam em');
    const authorLinkElement = $item.find('a.auteurfbnaam');
    
    // Skip if essential elements are missing
    if (quoteElement.length === 0 || authorElement.length === 0 || authorLinkElement.length === 0) {
        return null;
    }
    
    const quoteId = extractQuoteId($item.attr('id'));
    const quoteText = getTextContent(quoteElement);
    const authorName = getTextContent(authorElement);
    const authorLink = buildUrl(baseUrl, authorLinkElement.attr('href'));
    
    const quoteLink = extractQuoteLink($item, baseUrl);
    const authorImage = extractAuthorImage($item, baseUrl);
    const authorDescription = extractTextFromSelector($item, 'span.auteur-beschrijving');
    const authorBirthDeath = extractTextFromSelector($item, 'span.auteur-gebsterf');
    const sourceDescription = extractSourceDescription($item);
    
    return {
        id: quoteId,
        quote: quoteText,
        source: sourceDescription,
        url: quoteLink,
        author: {
            name: authorName,
            img: authorImage,
            link: authorLink,
            description: authorDescription,
            birth_death: authorBirthDeath
        }
    };
}

/**
 * Extracts quote ID from element ID
 * @param {string} elementId - Element ID
 * @returns {string} Quote ID without 'q' prefix
 */
function extractQuoteId(elementId) {
    return elementId ? elementId.replace('q', '') : '';
}

/**
 * Gets text content from cheerio element, handling null cases
 * @param {Cheerio} $element - Cheerio element
 * @returns {string} Text content or empty string
 */
function getTextContent($element) {
    return $element.text().trim() || '';
}

/**
 * Builds absolute URL from base URL and relative path
 * @param {string} baseUrl - Base URL
 * @param {string} relativePath - Relative path
 * @returns {string} Complete URL
 */
function buildUrl(baseUrl, relativePath) {
    if (!relativePath) return '';
    return relativePath.startsWith('http') ? relativePath : baseUrl + relativePath;
}

/**
 * Extracts quote link from item
 * @param {Cheerio} $item - Cheerio wrapped list item element
 * @param {string} baseUrl - Base URL
 * @returns {string} Quote link or empty string
 */
function extractQuoteLink($item, baseUrl) {
    const quoteLinkElement = $item.find('a.quotehref');
    if (quoteLinkElement.length === 0) return '';
    return buildUrl(baseUrl, quoteLinkElement.attr('href'));
}

/**
 * Extracts author image URL
 * @param {Cheerio} $item - Cheerio wrapped list item element
 * @param {string} baseUrl - Base URL
 * @returns {string} Author image URL
 */
function extractAuthorImage($item, baseUrl) {
    const imageElement = $item.find('img');
    if (imageElement.length === 0) return '';
    
    const dataSrc = imageElement.attr('data-src');
    const src = imageElement.attr('src');
    const imagePath = dataSrc || src;
    
    return buildUrl(baseUrl, imagePath);
}

/**
 * Extracts text content from element using selector
 * @param {Cheerio} $item - Parent element
 * @param {string} selector - CSS selector
 * @returns {string} Text content or empty string
 */
function extractTextFromSelector($item, selector) {
    const element = $item.find(selector);
    return getTextContent(element);
}

/**
 * Extracts and cleans source description
 * @param {Cheerio} $item - Cheerio wrapped list item element
 * @returns {string} Cleaned source description
 */
function extractSourceDescription($item) {
    const sourceElement = $item.find('div.bron-citaat');
    if (sourceElement.length === 0) return '';
    
    let description = getTextContent(sourceElement);
    description = description.replace(/\s+/g, ' '); // Replace multiple whitespace with single space
    description = description.replace(/&nbsp;/g, ' '); // Replace &nbsp; entities
    
    return description;
}

/**
 * Creates error response object
 * @param {string} message - Error message
 * @returns {Object} Error response object
 */
function createErrorResponse(message) {
    return {
        status: "404",
        author: "abdiputranar",
        message
    };
}

/**
 * Creates success response object
 * @param {Array} quotes - Array of quotes
 * @returns {Object} Success response object
 */
function createSuccessResponse(quotes) {
    return {
        status: "200",
        author: "abdiputranar",
        data: {
            quotes
        }
    };
}

module.exports = {
    quotes: async ({sock, msg}) => {
        await sock.sendPresenceUpdate('composing', msg?.key?.remoteJid);
        const result = await getQuotes();
        if (result.status === "200") {
            const randomIndex = Math.floor(Math.random() * result.data.quotes.length);
            const quote = result.data.quotes[randomIndex];
            const quoteMessage = `"${quote.quote}"\n\n- ${quote.author.name}\n${quote.source ? `\nSource: ${quote.source}` : ''}`;
            await sock.sendMessage(msg?.key?.remoteJid, { text: quoteMessage }, { quoted: msg });
        } else {
            await sock.sendMessage(msg?.key?.remoteJid, { text: `Error: ${result.message}` }, { quoted: msg });
        }
    }
}