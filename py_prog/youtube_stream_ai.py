import os
import glob
import cv2
from ultralytics import YOLO

# === CONFIGURABLE SETTINGS ===
INPUT_DIR = "example_videos"
OUTPUT_DIR = "processed"
PROCESS_ALL = True
ALERT_SECONDS = 2  # how long before alert triggers
# =============================

def ensure_output_dir():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

def get_videos():
    files = glob.glob(os.path.join(INPUT_DIR, "*.mp4"))
    if not files:
        raise FileNotFoundError(f"No video files found in '{INPUT_DIR}'")
    return sorted(files, key=os.path.getmtime)

def boxes_overlap(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    return xA < xB and yA < yB

def alert_function():
    print("🚨 ALERT: Someone is close to the car for a long time! 🚨")

def process_video(input_path):
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError(f"Failed to open video: {input_path}")

    ensure_output_dir()
    filename = os.path.basename(input_path)
    out_path = os.path.join(OUTPUT_DIR, f"processed_{os.path.splitext(filename)[0]}.avi")

    fourcc = cv2.VideoWriter_fourcc(*"XVID")
    fps = cap.get(cv2.CAP_PROP_FPS) or 20
    frame_limit = int(ALERT_SECONDS * fps)  # frames required for alert
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    out = cv2.VideoWriter(out_path, fourcc, fps, (w, h))

    # Load pretrained YOLOv8
    model = YOLO("yolov8n.pt")

    # Track how many consecutive frames a person stays blue
    overlap_counter = 0

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        results = model(frame, verbose=False)

        car_boxes = []
        person_boxes = []

        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                if cls == 2:  # car
                    car_boxes.append((x1, y1, x2, y2))
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(frame, "Car", (x1, y1 - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

                # Treat more than just "person" as human-like (lenient definition)
                elif cls in {0, 1, 3}:  # 0=person, 1=bicycle, 3=motorcycle (example)
                    person_boxes.append((x1, y1, x2, y2))

        person_is_blue = False
        for (x1, y1, x2, y2) in person_boxes:
            color = (0, 255, 0)
            label = "Person"

            for car_box in car_boxes:
                if boxes_overlap((x1, y1, x2, y2), car_box):
                    color = (255, 0, 0)  # blue
                    label = "Person-Car"
                    person_is_blue = True
                    break

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Update counter for alert logic
        if person_is_blue:
            overlap_counter += 1
        else:
            overlap_counter = 0

        if overlap_counter >= frame_limit:
            alert_function()
            overlap_counter = 0  # reset after alert

        out.write(frame)

        cv2.imshow("YOLO Detections", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            print("[AI] Stopped early by user.")
            break

    cap.release()
    out.release()
    cv2.destroyAllWindows()
    print(f"[AI] Processed {frame_count} frames -> {out_path}")

if __name__ == "__main__":
    videos = get_videos()
    if PROCESS_ALL:
        print(f"[AI] Processing ALL {len(videos)} videos in {INPUT_DIR}")
        for vid in videos:
            print(f"[AI] Processing: {vid}")
            process_video(vid)
    else:
        latest = videos[-1]
        print(f"[AI] Processing latest video: {latest}")
        process_video(latest)
