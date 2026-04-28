import json
import os
import time
from hyperSel import instance, log

def get_config():
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "configuration.json"))
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Could not find config.json at {config_path}")
    with open(config_path, 'r') as f:
        return json.load(f)

config_data = get_config()
YT_EMAIL = config_data.get("EMAIL2")
YT_PASS = config_data.get("YT_PASS")

def open_browser():
    print(f"Initializing browser for: {YT_EMAIL}")
    browser = instance.Browser(driver_choice="selenium", headless=True, zoom_level=100)
    browser.init_browser()
    return browser

def sign_in(browser):
    print("Navigating to YouTube...")
    browser.go_to_site(site='https://www.youtube.com/')
    try:
        # Click Sign In button
        browser.click_element(by_type="xpath", value='''//*[@id="buttons"]/ytd-button-renderer''')
        time.sleep(2)
        
        # Enter Email
        browser.clear_and_enter_text(by_type='xpath', value='''//*[@id="identifierId"]''', content_to_enter=YT_EMAIL)
        browser.click_element(by_type="xpath", value='''//*[@id="identifierNext"]''')
        time.sleep(3)
        
        # Enter Password
        browser.clear_and_enter_text(by_type='xpath', value='''//*[@id="password"]''', content_to_enter=YT_PASS)
        browser.click_element(by_type="xpath", value='''//*[@id="passwordNext"]''')
        time.sleep(5)
        
        # Select specific channel if prompt appears
        channel_xpath = '''/html/body/ytd-app/ytd-popup-container/tp-yt-paper-dialog/ytd-channel-switcher-renderer/div[2]/div/ytd-account-item-section-renderer/div[2]/ytd-account-item-renderer[3]/tp-yt-paper-icon-item/tp-yt-paper-item-body'''
        browser.click_element(by_type="xpath", value=channel_xpath)
        time.sleep(2)
    except Exception as e:
        print(f"Sign-in error: {e}")

def upload_process(browser, video_path, thumbnail_path, title, description):
    """
    Automates the YouTube Studio upload wizard.
    """
    browser.go_to_site(site='https://studio.youtube.com/channel/UC_E_dzZTDmj2O_g5t43iiXw?approve_browser_access=true')
    time.sleep(5)
    
    try:
        # 1. Open Upload Dialog
        browser.click_element(by_type="xpath", value='''//*[@id="main-container"]/ytcp-header/header/div/div/ytcp-button/ytcp-button-shape/button''')
        time.sleep(1)
        browser.click_element(by_type="xpath", value='''//*[@id="text-item-0"]''')
        time.sleep(2)

        # 2. Upload Video File
        print(f"Uploading video: {video_path}")
        video_input = browser.WEBDRIVER.find_element("xpath", "//input[@type='file']")
        video_input.send_keys(os.path.abspath(video_path))
        
        print("Waiting for Details page to load...")
        time.sleep(7)

        # 3. Set Formatted Title
        try:
            # Title input is usually the first textbox
            browser.clear_and_enter_text(by_type='xpath', value='''//div[@aria-label="Add a title that describes your video (type @ to mention a channel)"]''', content_to_enter=title)
            time.sleep(1)
        except Exception as e:
            print(f"Title input failed: {e}")

        # 4. Set Description
        try:
            print("Entering description...")
            # Target the description textbox specifically
            desc_xpath = '''//div[@aria-label="Tell viewers about your video (type @ to mention a channel)"]'''
            browser.clear_and_enter_text(by_type='xpath', value=desc_xpath, content_to_enter=description)
            time.sleep(1)
        except Exception as e:
            print(f"Description input failed: {e}")

        # 5. Upload Thumbnail
        print(f"Uploading thumbnail: {thumbnail_path}")
        try:
            thumb_input = browser.WEBDRIVER.find_element("xpath", "//input[@id='file-loader']")
            thumb_input.send_keys(os.path.abspath(thumbnail_path))
            print("Thumbnail uploaded successfully.")
            time.sleep(2)
        except Exception as thumb_err:
            print(f"Could not upload thumbnail automatically: {thumb_err}")

        # 6. Navigate the YouTube Studio Wizard (Next buttons)
        steps = [
            '''//*[@id="audience"]/ytkc-made-for-kids-select/div[4]/tp-yt-paper-radio-group/tp-yt-paper-radio-button[2]''', # Not for kids
            '''//*[@id="next-button"]/ytcp-button-shape/button''', # Next (Video Elements)
            '''//*[@id="next-button"]/ytcp-button-shape/button''', # Next (Checks)
            '''//*[@id="next-button"]/ytcp-button-shape/button''', # Next (Visibility)
            '''//*[@id="privacy-radios"]/tp-yt-paper-radio-button[3]''', # Public
            '''//*[@id="done-button"]/ytcp-button-shape/button''', # Done
            '''//*[@id="close-button"]/ytcp-button-shape/button''' # Close modal
        ]

        for xpath in steps:
            try:
                browser.click_element(by_type="xpath", value=xpath)
                time.sleep(2)
            except: pass
        
    except Exception as e:
        print(f"Upload process failed: {e}")

def format_custom_title(raw_title):
    """
    Format logic: BEFORE ':' -> ALL CAPS | AFTER ':' -> Title Case
    """
    if ":" in raw_title:
        source_part, indicator_part = raw_title.split(":", 1)
        formatted = f"{source_part.strip().replace('_', ' ').upper()}: {indicator_part.strip().replace('_', ' ').title()}"
    else:
        words = raw_title.replace("_", " ").split()
        if words:
            words[0] = words[0].upper()
            if len(words) > 1:
                words[1:] = [w.title() for w in words[1:]]
            formatted = " ".join(words)
        else:
            formatted = raw_title
    return formatted[:100]

def upload_to_youtube(video_path, title, description, thumbnail_path):
    """
    Main entry point for upload2. Now accepts 4 arguments to match video_assembler.
    """
    try:
        # Apply the specific "Source: Indicator" formatting
        formatted_title = format_custom_title(title)
        
        browser = open_browser()
        sign_in(browser)
        
        # Run the upload with the description
        upload_process(browser, video_path, thumbnail_path, formatted_title, description)
        
        print(f"Video upload success via Selenium: {formatted_title}")
        browser.close_browser()
        print("CLOSED BROWSER")
        return "BrowserUpload_Success"
    except Exception as e:
        print(f"FAILED TO UPLOAD IN UPLOAD 2: {e}")
        try:
            browser.close_browser()
        except:
            pass
        return False