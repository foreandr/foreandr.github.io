import os
import json
try:
    import yt_dlp
except ImportError:
    print("ERROR: yt-dlp not installed!")
    print("Install it with: pip install yt-dlp")
    exit(1)

# YouTube channel URL
CHANNEL_URL = "https://www.youtube.com/@Andre_Foreman/videos"

def get_all_videos():
    """
    Fetch ALL videos from YouTube channel using yt-dlp
    This gets every single video without API limits!
    """
    print("Fetching ALL videos from YouTube channel using yt-dlp...")
    print("This may take a minute for channels with many videos...")
    
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,  # Don't download, just get metadata
        'force_generic_extractor': False,
        'ignoreerrors': True,
    }
    
    videos = []
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info from channel
            print("Extracting channel data...")
            result = ydl.extract_info(CHANNEL_URL, download=False)
            
            if result and 'entries' in result:
                # Get all video entries
                for entry in result['entries']:
                    if entry and 'id' in entry and 'title' in entry:
                        videos.append({
                            'id': entry['id'],
                            'title': entry['title']
                        })
                        
                        # Progress indicator
                        if len(videos) % 10 == 0:
                            print(f"  Found {len(videos)} videos so far...")
            
        print(f"\n✓ Successfully found {len(videos)} total videos!")
        return videos
        
    except Exception as e:
        print(f"Error fetching videos: {e}")
        print("\nMake sure yt-dlp is up to date:")
        print("  pip install --upgrade yt-dlp")
        return []

def generate_html(videos):
    """
    Generate HTML page with embedded YouTube videos and titles
    Uses Intersection Observer for lazy loading - only loads visible videos!
    """
    
    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bar Chart Races - Andre's Channel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --bg-primary: #fafafa;
      --bg-card: #ffffff;
      --text-primary: #0f172a;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border: #e2e8f0;
      --hover-bg: #f8fafc;
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      margin: 0;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* Navigation */
    .site-nav {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .nav-wrap {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
    }

    .nav-brand {
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--text-primary);
      text-decoration: none;
      letter-spacing: -0.03em;
    }

    .nav-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9375rem;
      padding: 10px 18px;
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .nav-link:hover {
      background: var(--hover-bg);
      color: var(--accent);
    }

    /* Main Content */
    #app {
      max-width: 1400px;
      margin: 0 auto;
      padding: 64px 32px 100px;
    }

    .header {
      margin-bottom: 56px;
      text-align: center;
    }

    .header h1 {
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: var(--text-primary);
      margin-bottom: 16px;
      line-height: 1.1;
    }

    .header p {
      color: var(--text-secondary);
      font-size: 1.125rem;
      line-height: 1.7;
      max-width: 600px;
      margin: 0 auto;
    }

    .video-count {
      margin-top: 12px;
      font-size: 0.9375rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Video Grid */
    .video-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 32px;
      margin-top: 48px;
    }

    .video-card {
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .video-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: var(--accent);
    }

    .video-title {
      padding: 20px 20px 16px 20px;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.4;
      min-height: 65px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .video-wrapper {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      height: 0;
      overflow: hidden;
      background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
    }

    .video-wrapper iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Loading placeholder for lazy load */
    .video-wrapper::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 50px;
      height: 50px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .video-wrapper.loaded::before {
      display: none;
    }

    @keyframes spin {
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }

    /* Footer */
    .foot {
      margin-top: 80px;
      padding-top: 40px;
      border-top: 1px solid var(--border);
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header h1 {
        font-size: 2rem;
      }

      .header p {
        font-size: 1rem;
      }

      .video-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      #app {
        padding: 48px 20px 80px;
      }

      .nav-wrap {
        padding: 0 20px;
        height: 64px;
      }

      .video-title {
        font-size: 0.9375rem;
        padding: 16px 16px 12px 16px;
        min-height: 60px;
      }
    }

    html {
      scroll-behavior: smooth;
    }

    ::selection {
      background: var(--accent);
      color: white;
    }
  </style>
</head>
<body>
  <nav class="site-nav">
    <div class="nav-wrap">
      <a href="../../index.html" class="nav-brand">← Back to Portfolio</a>
      <a href="https://www.youtube.com/@Andre_Foreman" target="_blank" class="nav-link">View on YouTube</a>
    </div>
  </nav>

  <div id="app">
    <div class="header">
      <h1>Bar Chart Races</h1>
      <p>Dynamic animated visualizations showing data trends and rankings over time.</p>
      <div class="video-count">""" + str(len(videos)) + """ videos</div>
    </div>

    <div class="video-grid">
"""

    # Add video cards with lazy loading data attributes
    for video in videos:
        # Escape HTML characters in title
        title = video['title'].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
        video_id = video['id']
        
        html_template += f"""
      <div class="video-card">
        <div class="video-title">{title}</div>
        <div class="video-wrapper" data-video-id="{video_id}">
          <!-- Iframe will be injected here by JavaScript when visible -->
        </div>
      </div>
"""

    html_template += """
    </div>

    <div class="foot">
      <p>Videos from Andre Foreman's YouTube Channel · © 2026</p>
    </div>
  </div>

  <script>
    // Intersection Observer for lazy loading YouTube iframes
    // Only loads videos when they become visible in viewport
    
    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: '200px', // Start loading 200px before video enters viewport
      threshold: 0.01
    };

    function loadVideo(wrapper) {
      const videoId = wrapper.dataset.videoId;
      
      if (!videoId || wrapper.classList.contains('loaded')) {
        return; // Already loaded or no video ID
      }

      // Create iframe element
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.title = wrapper.parentElement.querySelector('.video-title').textContent;
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;

      // Add iframe to wrapper
      wrapper.appendChild(iframe);
      wrapper.classList.add('loaded');

      console.log(`Loaded video: ${videoId}`);
    }

    // Create intersection observer
    const videoObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadVideo(entry.target);
          observer.unobserve(entry.target); // Stop observing once loaded
        }
      });
    }, observerOptions);

    // Observe all video wrappers
    document.addEventListener('DOMContentLoaded', () => {
      const videoWrappers = document.querySelectorAll('.video-wrapper');
      
      console.log(`Initializing lazy loading for ${videoWrappers.length} videos...`);
      
      videoWrappers.forEach(wrapper => {
        videoObserver.observe(wrapper);
      });
    });
  </script>
</body>
</html>
"""
    
    return html_template

def main():
    """
    Main function to fetch videos and generate HTML
    """
    print("=" * 50)
    print("YouTube Channel Video Feed Generator")
    print("=" * 50)
    
    # Get ALL videos with titles from YouTube channel
    videos = get_all_videos()
    
    if not videos:
        print("No videos found or error occurred. Exiting.")
        return
    
    # Generate HTML with embedded videos and titles
    html_content = generate_html(videos)
    
    # Output file path
    output_file = "index.html"
    
    # Delete old file if it exists
    if os.path.exists(output_file):
        os.remove(output_file)
        print(f"Deleted old {output_file}")
    
    # Write new HTML file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✓ Successfully created {output_file} with {len(videos)} videos!")
    print("=" * 50)

if __name__ == "__main__":
    main()