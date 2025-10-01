// Global object to hold content for files that need to bypass the fetchPage system
const PRELOADED_HTML = {};

/**
 * Loads the content of a specific HTML file into the PRELOADED_HTML object.
 * This is used for pages that fail to load via dynamic script insertion (e.g., tools.html cards).
 * @param {string} fileName - The name of the file in the html/ directory (e.g., "lot_tracker.html").
 */
async function preloadContent(fileName) {
    const path = "html/" + fileName;
    
    try {
        console.log(`[INIT] Pre-loading content for: ${fileName}`);
        
        // This fetch works fine locally with your Flask server (app.py)
        const response = await fetch(path);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        // Store the result globally using the file name as the key
        PRELOADED_HTML[fileName] = await response.text();
        console.log(`[INIT] Content pre-loaded for: ${fileName}`);

    } catch (error) {
        console.error(`[INIT ERROR] Failed to load content for ${fileName}:`, error);
        PRELOADED_HTML[fileName] = `<div class='container boxed-container'><h1>Error</h1><p>Failed to load tool content for ${fileName}.</p></div>`;
    }
}

// --- INITIALIZATION ---
// Pre-load the Lot Tracker content immediately when utils.js runs
preloadContent("lot_tracker.html");

/**
 * Loads the content of a given page into the main content area (#app).
 * @param {string} page - The filename (e.g., "home.html", "lot_tracker.html").
 */
function fetchPage(page) {
    // Determine the correct path: content pages are inside the 'html/' folder.
    // NOTE: This function is currently bypassed for the Lot Tracker button due to an index.html conflict.
    const path = page.endsWith('.html') ? "html/" + page : page;

    fetch(path)
        .then(response => {
            if (!response.ok) {
                // Handle 404 and other non-200 responses gracefully
                console.error(`Error loading page ${page}: ${response.status} ${response.statusText}`);
                document.getElementById("app").innerHTML = 
                    `<div class="container boxed-container">
                        <h1>Error ${response.status}</h1>
                        <p>The requested page <strong>'${page}'</strong> could not be loaded.</p>
                    </div>`;
                return null;
            }
            return response.text();
        })
        .then(html => {
            if (html !== null) {
                document.getElementById("app").innerHTML = html;
            }
        })
        .catch(error => {
            console.error('Network or fetch error:', error);
            document.getElementById("app").innerHTML = 
                `<div class="container boxed-container">
                    <h1>Network Error</h1>
                    <p>A network error occurred while trying to load the page.</p>
                </div>`;
        });
}

// Dummy function that was in index.html, kept here as a utility
function greetUser(name) {
    return `Hello, ${name}!`;
}