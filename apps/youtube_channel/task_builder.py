import config
import utils
import ai
import image_gen
import progress_tracker

def build_animation_tasks(df, years, highest_is_best):
    """
    Builds frame-by-frame animation tasks with surge detection.
    
    Args:
        df: Cleaned dataframe for this indicator
        years: Sorted list of years
        highest_is_best: Whether higher values are better
        
    Returns:
        list: Animation tasks for rendering
    """
    total_frames = int(config.TARGET_SECONDS * config.FPS)
    f_per_t = total_frames / (len(years) - 1)
    
    tracker = progress_tracker.ProgressTracker(1, "Building Animation Tasks")
    tracker.start_step(f"Generating {total_frames} frames")
    
    all_tasks = []
    frame_count = 0
    surge_triggers = {}
    last_leader = None
    active_surge = None
    
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    check_interval = int(total_frames * 0.1)
    
    total_year_pairs = len(years) - 1
    
    for i in range(total_year_pairs):
        y1, y2 = years[i], years[i+1]
        
        df1 = df[df['year'] == y1].set_index('country')['value']
        df2 = df[df['year'] == y2].set_index('country')['value']
        
        all_countries = df1.index.union(df2.index)
        df1 = df1.reindex(all_countries, fill_value=0)
        df2 = df2.reindex(all_countries, fill_value=0)
        
        frames_per_quarter = int(f_per_t / 4)
        last_rank_update_step = 0
        cached_ranks = None
        
        for step in range(int(f_per_t)):
            alpha = step / f_per_t
            
            if frame_count % 10 == 0:
                tracker.update(frame_count, total_frames)
            
            if frame_count % check_interval == 0:
                current_vals = df1 + (df2 - df1) * alpha
                leader = current_vals.idxmax() if highest_is_best else current_vals.idxmin()
                
                if leader != last_leader and last_leader is not None:
                    image_gen.generate_infographic(
                        ai.ask_history(f"{y1}: {leader} lead"), 
                        f"infographic_{frame_count}.png"
                    )
                    surge_triggers[frame_count] = frame_count
                last_leader = leader
            
            if frame_count in surge_triggers:
                active_surge = (surge_triggers[frame_count], frame_count)
            
            if active_surge:
                surge_duration = int(total_frames * (config.SURGE_DURATION_PCT / 100))
                if (frame_count - active_surge[1]) >= surge_duration:
                    active_surge = None
            
            current_values = df1 + (df2 - df1) * alpha
            
            if step % frames_per_quarter == 0 or cached_ranks is None:
                cached_ranks = current_values.rank(ascending=not highest_is_best, method='first')
                last_rank_update_step = step
            
            if step > last_rank_update_step and (step - last_rank_update_step) < frames_per_quarter:
                next_check_step = last_rank_update_step + frames_per_quarter
                if next_check_step < int(f_per_t):
                    next_alpha = next_check_step / f_per_t
                    next_values = df1 + (df2 - df1) * next_alpha
                    next_ranks = next_values.rank(ascending=not highest_is_best, method='first')
                    
                    quarter_progress = (step - last_rank_update_step) / frames_per_quarter
                    current_ranks = cached_ranks + (next_ranks - cached_ranks) * utils.fast_snap(quarter_progress)
                else:
                    current_ranks = cached_ranks
            else:
                current_ranks = cached_ranks
            
            mask = current_ranks <= (config.TOP_N + 2)
            
            all_tasks.append((
                frame_count, 
                y1, 
                months[min(int(alpha * 12), 11)],
                current_values[mask].index.tolist(),
                current_values[mask].tolist(),
                current_ranks[mask].tolist(),
                active_surge
            ))
            
            frame_count += 1
    
    tracker.complete_step()
    print(f"✓ Generated {len(all_tasks)} animation tasks with {len(surge_triggers)} surge moments")
    
    return all_tasks