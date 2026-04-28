import matplotlib
# Force the 'Agg' backend to avoid Tcl/Tk errors in multiprocessing
matplotlib.use('Agg') 

import cv2
import numpy as np
import matplotlib.pyplot as plt
import os
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from matplotlib.ticker import FuncFormatter
import config
from utils import get_deterministic_color

def overlay_image(background, overlay, alpha):
    """
    Overlays the AI-generated infographic onto the video frame with transparency.
    """
    if overlay is None or alpha <= 0: 
        return background
        
    h, w = background.shape[:2]
    # Resize overlay to take up ~40% of the height
    oh = int(h * 0.40)
    ow = int(overlay.shape[1] * (oh / overlay.shape[0]))
    overlay_resized = cv2.resize(overlay, (ow, oh), interpolation=cv2.INTER_AREA)
    
    # Extract channels and apply alpha mask
    overlay_bgr, overlay_mask = overlay_resized[:, :, :3], (overlay_resized[:, :, 3] / 255.0) * alpha
    
    # Positioning (Right side of the screen)
    y1, y2 = int(h * 0.50), int(h * 0.50) + oh
    x1, x2 = w - ow - int(w * 0.03), w - int(w * 0.03)
    
    for c in range(3): 
        background[y1:y2, x1:x2, c] = (background[y1:y2, x1:x2, c] * (1.0 - overlay_mask) + 
                                        overlay_bgr[:, :, c] * overlay_mask)
    return background

def format_axis_number(x, pos):
    """
    Formats numbers on the x-axis to be readable without scientific notation.
    Handles large numbers with K, M, B suffixes and small decimals clearly.
    """
    if abs(x) >= 1_000_000_000:
        return f'{x/1_000_000_000:.1f}B'
    elif abs(x) >= 1_000_000:
        return f'{x/1_000_000:.1f}M'
    elif abs(x) >= 1_000:
        return f'{x/1_000:.1f}K'
    elif abs(x) < 1 and x != 0:
        return f'{x:.2f}'
    else:
        return f'{x:.0f}'

def render_batch(args):
    """
    Renders a batch of frames. Designed to run inside a ProcessPoolExecutor.
    """
    (batch_id, tasks, x_min, x_max, total_frames, indicator_name, data_source, unit_label) = args
    
    # Initialize the figure inside the worker process
    fig, ax = plt.subplots(figsize=(12, 7), dpi=100)
    batch_images = []
    
    for frame_idx, y_label, m_str, countries, values, positions, active_surge in tasks:
        ax.clear()
        
        # Get consistent colors for each country
        colors = [get_deterministic_color(c) for c in countries]
        ax.barh(positions, values, color=colors, edgecolor='black', linewidth=0.5)
        
        for country, val, pos in zip(countries, values, positions):
            if pos <= config.TOP_N + 0.5:
                # Handle Flag Rendering
                flag_path = os.path.join(config.FLAGS_DIR, f"{country}.png")
                if os.path.exists(flag_path):
                    try:
                        flag_img = plt.imread(flag_path)
                        ab = AnnotationBbox(OffsetImage(flag_img, zoom=0.05), 
                                          (val + (x_max * 0.02), pos), 
                                          frameon=False, 
                                          box_alignment=(0, 0.5))
                        ax.add_artist(ab)
                    except: 
                        pass
                
                # Add Value Labels and Country Names (REMOVED hardcoded %)
                ax.text(val + (x_max * 0.09), pos, f'{val:.1f}', va='center', fontweight='bold', fontsize=10)
                ax.text(x_min - (x_max * 0.01), pos, country, va='center', ha='right', fontweight='bold', fontsize=11)
        
        # Title and Formatting
        ax.set_title(f'{indicator_name.title()}\n{m_str} {y_label}', fontsize=16, fontweight='bold', pad=25)
        
        # Branding Box using global settings (REMOVED Music credit)
        credit_box = f"Author: {config.CODE_BY}\nSource: {data_source}"
        plt.figtext(0.96, 0.75, credit_box, ha='right', va='bottom', fontsize=9, color='black', weight='bold',
                    bbox=dict(facecolor='white', alpha=0.9, edgecolor='black', linewidth=1.5, boxstyle='round,pad=0.6'))

        # Axis limits and Styling
        ax.set_xlim(x_min, x_max * 1.40)
        ax.set_ylim(config.TOP_N + 0.5, 0.5)
        ax.set_yticks([])
        ax.grid(axis='x', linestyle=':', alpha=0.4)
        
        # Format x-axis with better number formatting
        ax.xaxis.set_major_formatter(FuncFormatter(format_axis_number))
        
        # Add unit label to x-axis
        ax.set_xlabel(unit_label, fontsize=11, fontweight='bold', labelpad=10)
        
        plt.tight_layout()
        
        # Convert Matplotlib figure to OpenCV BGR format
        fig.canvas.draw()
        img_bgr = cv2.cvtColor(np.asarray(fig.canvas.buffer_rgba()), cv2.COLOR_RGBA2BGR)
        
        # Handle Surge Infographic Overlay
        if active_surge:
            tid, sf = active_surge
            # Calculate fade in/out based on config percentages
            rel = frame_idx - sf
            dur = int(total_frames * (config.SURGE_DURATION_PCT / 100))
            fade = int(total_frames * 0.02)
            
            s_alpha = 1.0 if (fade <= rel <= dur - fade) else (rel/fade if rel < fade else (dur-rel)/fade)
            
            asset = f"infographic_{tid}.png"
            if os.path.exists(asset):
                overlay_img_data = cv2.imread(asset, cv2.IMREAD_UNCHANGED)
                img_bgr = overlay_image(img_bgr, overlay_img_data, max(0, s_alpha))
            
        batch_images.append((frame_idx, img_bgr))
    
    # Clean up the figure to free memory
    plt.close(fig)
    return batch_images