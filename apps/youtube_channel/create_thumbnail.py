import cv2
import os
import textwrap

def generate_custom_thumbnail(image_path, top_line, main_topic, year_range, badge_text):
    if not os.path.exists(image_path):
        return False

    frame = cv2.imread(image_path)
    h, w = frame.shape[:2]

    # White Side Panel Overlay
    overlay = frame.copy()
    panel_start_x = int(w * 0.58)
    cv2.rectangle(overlay, (panel_start_x, 0), (w, h), (255, 255, 255), -1)
    frame = cv2.addWeighted(overlay, 0.9, frame, 0.1, 0)

    # Year Badge
    cv2.putText(frame, str(badge_text), (w - 220, 110), cv2.FONT_HERSHEY_TRIPLEX, 2.2, (100, 100, 255), 6)

    # Dynamic Text
    font = cv2.FONT_HERSHEY_DUPLEX
    text_x = panel_start_x + 30
    cv2.putText(frame, top_line.upper(), (text_x, h // 2 - 130), font, 1.5, (180, 50, 0), 4)

    wrapped_lines = textwrap.wrap(main_topic, width=12)
    curr_y = h // 2 - 30
    for line in wrapped_lines:
        cv2.putText(frame, line.upper(), (text_x, curr_y), font, 2.0, (40, 40, 230), 7)
        curr_y += 85

    cv2.putText(frame, year_range, (text_x, curr_y + 50), font, 1.8, (0, 0, 0), 5)

    cv2.imwrite(image_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 98])
    return True