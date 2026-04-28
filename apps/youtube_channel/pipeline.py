import history_manager
import data_processor
import task_builder
import video_assembler
import config
import progress_tracker
import data_cleaner

def run(indicator_title, full_df, folder_name, data_source, highest_is_best):
    """
    Main pipeline orchestrator. Runs the complete video generation workflow.
    
    Args:
        indicator_title: Name of the indicator to process
        full_df: Complete dataframe with all indicators
        folder_name: Source folder name (e.g., "_IMF")
        data_source: Attribution string for the video
        highest_is_best: Whether higher values rank better
    """
    print(f"\n{'='*60}")
    print(f"PROCESSING: {indicator_title}")
    print(f"{'='*60}")
    
    # Create overall pipeline tracker
    overall_tracker = progress_tracker.ProgressTracker(7, "Overall Pipeline")
    
    # 1. Check if already uploaded
    overall_tracker.start_step("Checking upload history")
    # UPDATED: Now passing highest_is_best to handle dual-mode history checks
    if history_manager.is_already_uploaded(indicator_title, folder_name, highest_is_best):
        mode_str = "HIGHEST" if highest_is_best else "LOWEST"
        print(f"--- {indicator_title} ({mode_str}) already processed. Skipping. ---")
        return
    overall_tracker.complete_step()
    
    # 2. Prepare, Validate and Audit Data
    overall_tracker.start_step("Data preparation & Audit")
    
    # Extract raw data slice for the specific indicator
    raw_df = full_df[full_df['indicator_label'].str.strip() == indicator_title].copy()
    
    # Run the quality audit (Static check, entity count, etc.)
    df_audited, audit_msg = data_cleaner.analyze_data_quality(raw_df)
    
    if df_audited is None:
        # If data is rejected (too static or sparse), log as SKIPPED so we don't try again
        history_manager.log_upload_result(folder_name, indicator_title, "N/A", "N/A", "SKIPPED")
        return

    # Pass audited data to processor for ranking and axis calculation (NOW RETURNS unit_label)
    df, years, x_min, x_max, unit_label = data_processor.prepare_indicator_data(
        df_audited, indicator_title, highest_is_best
    )
    
    if df is None:
        # If preparation failed despite passing audit
        history_manager.log_upload_result(folder_name, indicator_title, "N/A", "N/A", "FAILED")
        return
    overall_tracker.complete_step()
    
    # 3. Build animation tasks
    overall_tracker.start_step("Building animation tasks")
    all_tasks = task_builder.build_animation_tasks(df, years, highest_is_best)
    overall_tracker.complete_step()
    
    # 4. Render video (NOW PASSES unit_label)
    overall_tracker.start_step("Rendering video")
    temp_video = video_assembler.render_video(all_tasks, x_min, x_max, indicator_title, data_source, unit_label)
    overall_tracker.complete_step()
    
    # 5. Add audio
    overall_tracker.start_step("Adding audio")
    final_video = video_assembler.add_audio(temp_video, config.TARGET_SECONDS)
    overall_tracker.complete_step()
    
    # 6. Create thumbnail
    overall_tracker.start_step("Creating thumbnail")
    thumbnail = video_assembler.create_and_set_thumbnail(
        final_video, indicator_title, (min(years), max(years))
    )
    overall_tracker.complete_step()
    
    # 7. Upload and log (if not dry run)
    if not config.DRY_RUN:
        overall_tracker.start_step("Uploading to YouTube")
        video_assembler.upload_and_log(
            final_video, thumbnail, folder_name, indicator_title, 
            highest_is_best, (min(years), max(years))
        )
        overall_tracker.complete_step()
    else:
        print("DRY RUN: Skipping upload.")