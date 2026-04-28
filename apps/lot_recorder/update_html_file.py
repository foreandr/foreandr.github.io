#!/usr/bin/env python3
"""
YouTube Channel Video Fetcher
Fetches ALL videos from a YouTube channel and generates an HTML page with lazy loading
No API key required - uses yt-dlp
"""

import subprocess
import json
import sys
from pathlib import Path

def fetch_channel_videos(channel_url):
    """
    Fetch all videos from a YouTube channel using yt-dlp
    Returns list of video objects with id, title, upload_date
    """
    print(f"Fetching videos from {channel_url}...")
    print("This may take a while for channels with many videos...")
    
    try:
        # Run yt-dlp to get channel info
        cmd = [
            'yt-dlp',
            '--flat-playlist',
            '--dump-json',
            '--playlist-end', '10000',  # Fetch up to 10k videos
            channel_url
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Parse JSON output (one JSON object per line)
        videos = []
        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    video_data = json.loads(line)
                    videos.append({
                        'id': video_data.get('id', ''),
                        'title': video_data.get('title', 'Untitled'),
                        'upload_date': video_data.get('upload_date', ''),
                        'duration': video_data.get('duration', 0),
                        'view_count': video_data.get('view_count', 0),
                    })
                except json.JSONDecodeError:
                    continue
        
        print(f"✅ Found {len(videos)} videos")
        return videos
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running yt-dlp: {e}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ yt-dlp not found. Install it with: pip install yt-dlp")
        sys.exit(1)

def format_date(date_str):
    """Format YYYYMMDD to readable date"""
    if len(date_str) == 8:
        year = date_str[:4]
        month = date_str[4:6]
        day = date_str[6:8]
        return f"{year}-{month}-{day}"
    return date_str

def generate_html(videos, output_file='lot_tracker.html'):
    """
    Generate HTML file with lazy loading for thousands of videos
    Uses virtual scrolling and aggressive lazy loading
    """
    
    # Sort by upload date (most recent first)
    videos_sorted = sorted(videos, key=lambda x: x['upload_date'], reverse=True)
    
    # Prepare video data for JSON (do this first)
    video_data = []
    for video in videos_sorted:
        video_data.append({
            'id': video['id'],
            'title': video['title'].replace('"', '\\"').replace("'", "\\'"),
            'upload_date': format_date(video['upload_date']),
            'view_count': video.get('view_count', 0),
        })
    
    video_data_json = json.dumps(video_data)
    total_videos = len(videos)
    
    # Now create HTML with all braces escaped except our placeholders
    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lot Tracker</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {{
      --bg-primary: #fafafa;
      --bg-secondary: #ffffff;
      --text-primary: #0f172a;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border: #e2e8f0;
      --hover-bg: #f8fafc;
      --accent: #6366f1;
      --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      margin: 0;
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }}

    /* Navigation */
    .site-nav {{
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 1000;
      height: 64px;
    }}

    .nav-wrap {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
    }}

    .nav-wrap a {{
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--text-primary);
      text-decoration: none;
      letter-spacing: -0.01em;
      transition: color 0.2s;
    }}

    .nav-wrap a:hover {{
      color: var(--accent);
    }}

    .stats {{
      font-size: 0.875rem;
      color: var(--text-muted);
    }}

    .stats strong {{
      color: var(--accent);
      font-weight: 700;
    }}

    /* Main Container */
    .container {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }}

    /* Header */
    .page-header {{
      margin-bottom: 40px;
    }}

    .page-header h1 {{
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 12px;
    }}

    .page-header p {{
      font-size: 1.125rem;
      color: var(--text-secondary);
      line-height: 1.7;
      margin: 0;
    }}

    /* Search */
    .search-bar {{
      margin-bottom: 32px;
      display: flex;
      gap: 12px;
      align-items: center;
    }}

    .search-input {{
      flex: 1;
      max-width: 600px;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 0.9375rem;
      background: var(--bg-secondary);
      color: var(--text-primary);
      transition: all 0.2s;
    }}

    .search-input:focus {{
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }}

    /* Video Grid */
    .video-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 24px;
      margin-top: 32px;
    }}

    .video-card {{
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      animation: fadeIn 0.3s ease-in forwards;
    }}

    @keyframes fadeIn {{
      to {{ opacity: 1; }}
    }}

    .video-card:hover {{
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
      border-color: var(--accent);
    }}

    .video-info {{
      padding: 14px 18px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
    }}

    .video-title {{
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.5;
      color: var(--text-primary);
      margin-bottom: 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }}

    .video-meta {{
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      gap: 12px;
    }}

    .video-wrapper {{
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      background: #f0f0f0;
      min-height: 200px;
    }}

    .video-wrapper iframe {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }}

    .video-wrapper::before {{
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 36px;
      height: 36px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      z-index: 1;
    }}

    .video-wrapper.loaded::before {{
      display: none;
    }}

    @keyframes spin {{
      to {{ transform: translate(-50%, -50%) rotate(360deg); }}
    }}

    /* Load More */
    .load-more {{
      text-align: center;
      margin-top: 40px;
      padding: 20px;
    }}

    .load-more button {{
      background: var(--accent);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }}

    .load-more button:hover {{
      background: #4f46e5;
      transform: translateY(-2px);
    }}

    /* Hidden class */
    .hidden {{
      display: none;
    }}

    /* Responsive */
    @media (max-width: 768px) {{
      .container {{
        padding: 32px 16px 60px;
      }}

      .page-header h1 {{
        font-size: 2rem;
      }}

      .video-grid {{
        grid-template-columns: 1fr;
        gap: 20px;
      }}

      .nav-wrap {{
        padding: 0 16px;
      }}

      .stats {{
        display: none;
      }}
    }}
  </style>
</head>
<body>
  <nav class="site-nav">
    <div class="nav-wrap">
      <a href="../../index.html">← Back to Portfolio</a>
      <div class="stats">
        <strong>{total_videos}</strong> videos loaded
      </div>
    </div>
  </nav>

  <div class="container">
    <div class="page-header">
      <h1> Archive</h1>
      <p>Complete video archive from the YouTube channel, displayed in reverse chronological order.</p>
    </div>

    <div class="search-bar">
      <input 
        type="text" 
        id="search-input" 
        class="search-input" 
        placeholder="Search videos by title..."
      />
    </div>

    <div class="video-grid" id="video-grid">
      <!-- Videos will be inserted here by JavaScript -->
    </div>

    <div class="load-more" id="load-more-container">
      <button id="load-more-btn">Load More Videos</button>
    </div>
  </div>

  <script>
    // All video data
    const allVideos = {video_data_json};

    // Pagination settings
    const VIDEOS_PER_PAGE = 24;
    let currentPage = 0;
    let filteredVideos = [...allVideos];

    // Intersection Observer for lazy loading iframes
    const observerOptions = {{
      root: null,
      rootMargin: '400px',
      threshold: 0.01
    }};

    let videoObserver;

    function initObserver() {{
      videoObserver = new IntersectionObserver((entries, observer) => {{
        entries.forEach(entry => {{
          if (entry.isIntersecting) {{
            loadVideo(entry.target);
            observer.unobserve(entry.target);
          }}
        }});
      }}, observerOptions);
    }}

    function loadVideo(wrapper) {{
      const videoId = wrapper.dataset.videoId;
      
      if (!videoId || wrapper.classList.contains('loaded')) {{
        return;
      }}

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${{videoId}}`;
      iframe.title = wrapper.dataset.title;
      iframe.frameBorder = '0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';

      wrapper.appendChild(iframe);
      wrapper.classList.add('loaded');
    }}

    function createVideoCard(video, index) {{
      const card = document.createElement('div');
      card.className = 'video-card';
      card.style.animationDelay = `${{(index % VIDEOS_PER_PAGE) * 0.02}}s`;
      
      card.innerHTML = `
        <div class="video-info">
          <div class="video-title">${{escapeHtml(video.title)}}</div>
          <div class="video-meta">
            <span>📅 ${{video.upload_date}}</span>
            ${{video.view_count ? `<span>👁️ ${{formatViews(video.view_count)}}</span>` : ''}}
          </div>
        </div>
        <div class="video-wrapper" data-video-id="${{video.id}}" data-title="${{escapeHtml(video.title)}}">
          <!-- Iframe loaded on scroll -->
        </div>
      `;
      
      return card;
    }}

    function renderVideos(startIndex, endIndex) {{
      const grid = document.getElementById('video-grid');
      const videosToRender = filteredVideos.slice(startIndex, endIndex);
      
      videosToRender.forEach((video, index) => {{
        const card = createVideoCard(video, index);
        grid.appendChild(card);
        
        // Observe the video wrapper for lazy loading
        const wrapper = card.querySelector('.video-wrapper');
        videoObserver.observe(wrapper);
      }});

      // Update load more button visibility
      const loadMoreContainer = document.getElementById('load-more-container');
      if (endIndex >= filteredVideos.length) {{
        loadMoreContainer.classList.add('hidden');
      }} else {{
        loadMoreContainer.classList.remove('hidden');
      }}
    }}

    function loadMoreVideos() {{
      currentPage++;
      const startIndex = currentPage * VIDEOS_PER_PAGE;
      const endIndex = startIndex + VIDEOS_PER_PAGE;
      renderVideos(startIndex, endIndex);
    }}

    function searchVideos(query) {{
      const searchTerm = query.toLowerCase().trim();
      
      if (!searchTerm) {{
        filteredVideos = [...allVideos];
      }} else {{
        filteredVideos = allVideos.filter(video => 
          video.title.toLowerCase().includes(searchTerm)
        );
      }}

      // Reset and re-render
      currentPage = 0;
      const grid = document.getElementById('video-grid');
      grid.innerHTML = '';
      
      if (videoObserver) {{
        videoObserver.disconnect();
      }}
      initObserver();
      
      renderVideos(0, VIDEOS_PER_PAGE);
      
      console.log(`Search: "${{query}}" - Found ${{filteredVideos.length}} results`);
    }}

    function escapeHtml(text) {{
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }}

    function formatViews(views) {{
      if (views >= 1000000) {{
        return (views / 1000000).toFixed(1) + 'M';
      }} else if (views >= 1000) {{
        return (views / 1000).toFixed(1) + 'K';
      }}
      return views.toString();
    }}

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {{
      initObserver();
      renderVideos(0, VIDEOS_PER_PAGE);
      
      // Load more button
      document.getElementById('load-more-btn').addEventListener('click', loadMoreVideos);
      
      // Search functionality with debouncing
      let searchTimeout;
      document.getElementById('search-input').addEventListener('input', (e) => {{
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {{
          searchVideos(e.target.value);
        }}, 300);
      }});
      
      console.log(`Loaded ${{allVideos.length}} videos from AI Essay channel`);
    }});
  </script>
</body>
</html>'''
    
    # Write to file
    output_path = Path(output_file)
    output_path.write_text(html_content, encoding='utf-8')
    
    print(f"\n✅ Generated {output_file}")
    print(f"   Total videos: {len(videos)}")
    print(f"   Latest video: {videos_sorted[0]['title']}")
    print(f"   Oldest video: {videos_sorted[-1]['title']}")

def main():
    # Channel URL
    channel_url = "https://www.youtube.com/@AiEssay"
    
    print("=" * 60)
    print("YouTube Video Archive Generator")
    print("=" * 60)
    
    # Fetch videos
    videos = fetch_channel_videos(channel_url)
    
    if not videos:
        print("❌ No videos found")
        sys.exit(1)
    
    # Generate HTML
    generate_html(videos)
    
    print("\n✅ Done! Open lot_tracker.html in your browser")

if __name__ == "__main__":
    main()