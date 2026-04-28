import re
from hyperSel import instance, log, parser

def go_to_past_events(browser):
    log.checkpoint()
    # Navigating to the past events section
    browser.go_to_site("https://www.ufc.com/events#events-list-past")

def clean_athlete_name(url):
    """
    Extracts a clean name from the headshot URL.
    Example: .../ADESANYA_ISRAEL_02-01.png -> Israel Adesanya
    """
    try:
        # Get the filename at the end of the path
        filename = url.split('/')[-1].split('?')[0]
        # Remove file extension and trailing date codes like _02-01
        name_part = re.sub(r'_\d{2}-\d{2}$', '', filename.replace('.png', '').replace('.jpg', ''))
        # Replace underscores with spaces and title case it
        return name_part.replace('_', ' ').title()
    except:
        return None

def main():
    log.checkpoint()

    # Initializing browser
    browser = instance.Browser(driver_choice='selenium',
        zoom_level=100,
        headless=False,
    )
    browser.init_browser()
    go_to_past_events(browser)

    # Allow a brief moment for the JS to render if needed
    soup = browser.return_current_soup()

    # UFC events are usually wrapped in 'l-listing__item' or inside card components
    # We find all event card containers
    event_cards = soup.select('.l-listing__item')

    print(f"Found {len(event_cards)} event cards.\n")

    for i, card in enumerate(event_cards):
        # 1. Extract Event URL
        # We look for the anchor tag that contains the event slug
        link_tag = card.select_one('a[href*="/event/"]')
        event_url = f"https://www.ufc.com{link_tag['href']}" if link_tag else "URL Not Found"

        # 2. Extract Event Date
        # Dates are usually in specific span classes or 'tz-change-data'
        date_tag = card.select_one('.c-card-event--result__date, .tz-change-data')
        event_date = date_tag.get_text(strip=True) if date_tag else "Date Not Found"

        # 3. Extract Headline (Fighter Names for the main event)
        headline_tag = card.select_one('.c-card-event--result__headline')
        headline = headline_tag.get_text(strip=True) if headline_tag else "No Headline"


        # Print the structured output
        print(f"--- EVENT {i} ---")
        print(f"HEADLINE: {headline}")
        print(f"DATE:     {event_date}")
        print(f"URL:      {event_url}")
        browser.go_to_site(event_url)
        soup = browser.return_current_soup()
        for i, data in enumerate(parser.main(soup)):
            print(i, data)

        

    input("Scraping complete. Press ENTER to close...")

if __name__ == "__main__":
    main()