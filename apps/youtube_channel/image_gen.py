import random
import textwrap
import colorsys
import re
from PIL import Image, ImageDraw, ImageFont

def clean_text(text):
    """Removes AI artifacts and cleans up whitespace."""
    artifacts = [r'</\|im_end\|>', r'\[\|im_end\|\]', r'User:', r'Assistant:']
    for pattern in artifacts:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    return text.replace('**', '').strip()

def add_corners(im, rad):
    """Applies a rounded corner mask."""
    circle = Image.new('L', (rad * 2, rad * 2), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, rad * 2 - 1, rad * 2 - 1), fill=255)
    alpha = Image.new('L', im.size, 255)
    w, h = im.size
    alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
    alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, h - rad))
    alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (w - rad, 0))
    alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (w - rad, h - rad))
    im.putalpha(alpha)
    return im

def get_random_theme():
    h = random.random()
    s = random.uniform(0.5, 0.9) 
    is_dark = random.random() > 0.5
    l_bg = random.uniform(0.05, 0.15) if is_dark else random.uniform(0.85, 0.95)
    l_text = 0.95 if is_dark else 0.05
    bg_rgb = tuple(int(i * 255) for i in colorsys.hls_to_rgb(h, l_bg, s))
    accent_h = (h + random.uniform(0.2, 0.5)) % 1.0
    accent_rgb = tuple(int(i * 255) for i in colorsys.hls_to_rgb(accent_h, 0.5, s))
    text_rgb = tuple(int(i * 255) for i in colorsys.hls_to_rgb(h, l_text, 0.1))
    return bg_rgb, accent_rgb, text_rgb

def get_optimized_font(draw, text, max_width, max_height, initial_size=26):
    current_size = initial_size
    margin_buffer = 50 
    while current_size > 12:
        try:
            font = ImageFont.truetype("arialbd.ttf", current_size)
        except:
            font = ImageFont.load_default()
            return font, textwrap.wrap(text, width=25)
        chars_per_line = max(15, int(max_width / (current_size * 0.55)))
        lines = textwrap.wrap(text, width=chars_per_line)
        line_height = draw.textbbox((0,0), "Ag", font=font)[3]
        total_height = (line_height + 8) * len(lines)
        if total_height < (max_height - margin_buffer):
            return font, lines
        current_size -= 2 
    return font, textwrap.wrap(text, width=35)

def generate_infographic(input_text, output_path="infographic.png"):
    width, height = 500, 500
    input_text = clean_text(input_text)
    bg_color, accent_color, text_color = get_random_theme()
    img = Image.new("RGBA", (width, height), color=bg_color + (255,))
    draw = ImageDraw.Draw(img)
    for _ in range(random.randint(4, 8)):
        overlay = Image.new('RGBA', (width, height), (0,0,0,0))
        ol_draw = ImageDraw.Draw(overlay)
        coords = [random.randint(-50, width) for _ in range(4)]
        bbox = [min(coords[0], coords[2]), min(coords[1], coords[3]), max(coords[0], coords[2]), max(coords[1], coords[3])]
        ol_draw.rectangle(bbox, fill=accent_color + (30,))
        img.paste(overlay, (0,0), overlay)
    margin_left = 70
    text_width = width - margin_left - 40
    font, wrapped_lines = get_optimized_font(draw, input_text, text_width, height)
    line_spacing, line_height = 8, draw.textbbox((0,0), "Ag", font=font)[3]
    total_text_height = (line_height + line_spacing) * len(wrapped_lines)
    y_start = (height // 2) - (total_text_height // 2)
    draw.rectangle([margin_left - 30, 0, margin_left - 20, height], fill=accent_color)
    current_y = y_start
    for line in wrapped_lines:
        draw.text((margin_left, current_y), line, fill=text_color, font=font)
        current_y += line_height + line_spacing
    img = add_corners(img, 15)
    img.save(output_path, "PNG")