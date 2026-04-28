import json
import os
import time
from datetime import datetime

from hyperSel import instance

from data import VIDEO_DIR


def get_config():
    config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "config.json"))
    print(f"Loading config from: {config_path}")
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Could not find config.json at {config_path}")
    with open(config_path, 'r') as f:
        data = json.load(f)
    print("Config loaded.")
    return data


config_data = get_config()
YT_EMAIL = config_data.get("EMAIL2")
YT_PASS = config_data.get("YT_PASS")


def open_browser():
    print(f"Initializing browser for: {YT_EMAIL}")
    browser = instance.Browser(driver_choice="selenium", headless=False, zoom_level=100)
    browser.init_browser()
    print("Browser initialized.")
    return browser


def sign_in(browser):
    print("Navigating to YouTube...")
    browser.go_to_site(site='https://www.youtube.com/')
    try:
        print("Clicking Sign In...")
        browser.click_element(by_type="xpath", value='''//*[@id="buttons"]/ytd-button-renderer''')
        time.sleep(2)

        print("Entering email...")
        browser.clear_and_enter_text(by_type='xpath', value='''//*[@id="identifierId"]''', content_to_enter=YT_EMAIL)
        browser.click_element(by_type="xpath", value='''//*[@id="identifierNext"]''')
        time.sleep(3)

        print("Entering password...")
        browser.clear_and_enter_text(by_type='xpath', value='''//*[@id="password"]''', content_to_enter=YT_PASS)
        browser.click_element(by_type="xpath", value='''//*[@id="passwordNext"]''')
        time.sleep(5)
        print("Sign-in flow complete.")
    except Exception as e:
        print(f"Sign-in error: {e}")


def get_newest_video_file(directory):
    if not os.path.isdir(directory):
        print(f"\nError: Video directory '{directory}' not found.")
        return None
    print(f"Scanning for videos in: {directory}")
    files = [
        os.path.join(directory, f)
        for f in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, f)) and
           f.lower().endswith(('.mkv', '.mp4', '.mov', '.avi', '.webm'))
    ]
    if not files:
        print("No video files found.")
        return None
    files.sort(key=os.path.getmtime, reverse=True)
    newest = files[0]
    print(f"Newest file selected: {newest}")
    return newest




def delete_file(path):
    try:
        if not path or not os.path.isfile(path):
            print(f"Skip delete: '{path}' is not a file.")
            return
        os.remove(path)
        print(f"Deleted uploaded file: {os.path.basename(path)}")
    except Exception as e:
        print(f"Delete failed for '{path}': {e}")


def upload_process(browser, video_path, title, description):
    print("Opening YouTube Studio...")
    browser.go_to_site(site='https://studio.youtube.com/')
    time.sleep(5)

    try:
        skipbrowser_shit_xpath = '''/html/body/div/div[5]/a'''
        browser.click_element(by_type="xpath", value=skipbrowser_shit_xpath)
    except Exception as e:
        input("STOP1")

    time.sleep(10)

    try:
        another_goofy_xpath = '''/html/body/ytcp-warm-welcome-dialog/ytcp-dialog/tp-yt-paper-dialog/div[2]/div/ytcp-button/ytcp-button-shape/button'''
        # //*[@id="dismiss-button"]/ytcp-button-shape/button
        browser.click_element(by_type="xpath", value=another_goofy_xpath)
    except Exception as e:
        #print("-------------")
        #print(e)
        #input("STOP2")
        pass
    time.sleep(10)


    # input("-----")

    try:
        print("Opening upload dialog...")
        browser.click_element(by_type="xpath", value='''//*[@id="main-container"]/ytcp-header/header/div/div/ytcp-button/ytcp-button-shape/button''')
        time.sleep(1)
        browser.click_element(by_type="xpath", value='''//*[@id="text-item-0"]''')
        time.sleep(2)

        print(f"Uploading video: {video_path}")
        video_input = browser.WEBDRIVER.find_element("xpath", "//input[@type='file']")
        video_input.send_keys(os.path.abspath(video_path))
        time.sleep(120)

        try:
            print("Setting title...")
            browser.clear_and_enter_text(
                by_type='xpath',
                value='''//div[@aria-label="Add a title that describes your video (type @ to mention a channel)"]''',
                content_to_enter=title
            )
            time.sleep(10)
        except Exception as e:
            print(f"Title input failed: {e}")

        try:
            print("Setting description...")
            desc_xpath = '''//div[@aria-label="Tell viewers about your video (type @ to mention a channel)"]'''
            browser.clear_and_enter_text(by_type='xpath', value=desc_xpath, content_to_enter=description)
            time.sleep(10)
        except Exception as e:
            print(f"Description input failed: {e}")

        steps = [
            '''//*[@id="audience"]/ytkc-made-for-kids-select/div[4]/tp-yt-paper-radio-group/tp-yt-paper-radio-button[2]''',
            '''//*[@id="next-button"]/ytcp-button-shape/button''',
            '''//*[@id="next-button"]/ytcp-button-shape/button''',
            '''//*[@id="next-button"]/ytcp-button-shape/button''',
            '''//*[@id="privacy-radios"]/tp-yt-paper-radio-button[3]''',
            '''//*[@id="done-button"]/ytcp-button-shape/button''',
            '''//*[@id="close-button"]/ytcp-button-shape/button'''
        ]

        for xpath in steps:
            try:
                print(f"Clicking step: {xpath}")
                browser.click_element(by_type="xpath", value=xpath)
                time.sleep(10)
            except Exception:
                pass
        print("Upload wizard completed.")

        try:

            browser.click_element(by_type="xpath", value='''/html/body/ytcp-prechecks-warning-dialog/ytcp-dialog/tp-yt-paper-dialog/div[3]/div/ytcp-button[1]/ytcp-button-shape/button''')
            time.sleep(10)
        except Exception:
                pass
            
    except Exception as e:
        print(f"Upload process failed: {e}")
        raise



    



def upload_video_file(filepath):
    print("Starting file uploader process (HyperSel)...")
    if not filepath or not os.path.isfile(filepath):
        print("No video file found to upload.")
        return False

    filename = os.path.basename(filepath)
    mod_timestamp = os.path.getmtime(filepath)
    mod_datetime = datetime.fromtimestamp(mod_timestamp)
    video_title = f"PARKING LOT {mod_datetime.strftime('%Y-%m-%d %H:%M:%S')}"
    description = f"Automated upload of parking lot footage from {mod_datetime.strftime('%Y-%m-%d at %H:%M:%S')}."
    print(f"Prepared title: {video_title}")
    print(f"Prepared description: {description}")

    browser = None
    upload_success = False
    try:
        browser = open_browser()
        sign_in(browser)
        upload_process(browser, filepath, video_title, description)
        upload_success = True
        print(f"Video upload success via HyperSel: {filename}")
        print("sleeping for a long bit")
        time.sleep(120)
    except Exception as e:
        print(f"FAILED TO UPLOAD: {e}")
        upload_success = False
    finally:
        try:
            if browser:
                browser.close_browser()
        except Exception:
            pass

    if not upload_success:
        print("Upload failed. Local file was preserved for manual inspection.")
    return upload_success


def process_and_upload_latest_file():
    print("Starting file uploader process (HyperSel)...")
    filepath = get_newest_video_file(VIDEO_DIR)
    if not filepath:
        print("No new video files found to upload in the Video directory.")
        return
    success = upload_video_file(filepath)
    if success:
        delete_file(filepath)

if __name__ == "__main__":
    process_and_upload_latest_file()
