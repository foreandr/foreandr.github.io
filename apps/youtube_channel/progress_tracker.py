import time
from datetime import timedelta

class ProgressTracker:
    """
    Tracks and displays progress for multi-step processes.
    Shows percentage complete and elapsed time for each step.
    """
    
    def __init__(self, total_steps, step_name="Processing"):
        self.total_steps = total_steps
        self.current_step = 0
        self.step_name = step_name
        self.start_time = time.time()
        self.step_start_time = time.time()
        
    def start_step(self, step_name):
        """Start tracking a new step."""
        self.step_name = step_name
        self.step_start_time = time.time()
        print(f"\n[STARTING] {step_name}...")
        
    def update(self, current, total, prefix=""):
        """
        Update progress within a step.
        
        Args:
            current: Current progress count
            total: Total count
            prefix: Optional prefix message
        """
        if total == 0:
            return
            
        percent = (current / total) * 100
        elapsed = time.time() - self.step_start_time
        
        # Estimate time remaining
        if current > 0:
            rate = elapsed / current
            remaining = rate * (total - current)
            eta_str = f" | ETA: {timedelta(seconds=int(remaining))}"
        else:
            eta_str = ""
        
        print(f"\r{prefix}{self.step_name}: {percent:.1f}% ({current}/{total}) | "
              f"Elapsed: {timedelta(seconds=int(elapsed))}{eta_str}", end="", flush=True)
    
    def complete_step(self):
        """Mark current step as complete and show timing."""
        elapsed = time.time() - self.step_start_time
        print(f"\n[COMPLETE] {self.step_name} - Took {timedelta(seconds=int(elapsed))}")
        self.current_step += 1
        
    def complete_all(self):
        """Show final summary of all steps."""
        total_elapsed = time.time() - self.start_time
        print(f"\n{'='*60}")
        print(f"[FINISHED] Total pipeline time: {timedelta(seconds=int(total_elapsed))}")
        print(f"{'='*60}\n")


def format_time(seconds):
    """Format seconds into human-readable string."""
    return str(timedelta(seconds=int(seconds)))