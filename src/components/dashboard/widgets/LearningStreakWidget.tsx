import { Flame, Trophy } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export function LearningStreakWidget({ settings }: { settings?: Record<string, any> }) {
  const { currentWorkspace } = useWorkspace();
  
  // Mock streak data - in production, fetch from API
  const streak = 7;
  const longestStreak = 14;
  const todayComplete = true;

  // Generate last 7 days
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date().getDay();
  const weekActivity = Array(7).fill(false).map((_, i) => {
    // Mock: mark some days as active
    return i <= today && Math.random() > 0.3;
  });

  return (
    <div className="p-4 h-full bg-gradient-to-br from-orange-500/5 to-amber-500/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="text-2xl font-bold text-foreground">{streak}</span>
          <span className="text-xs text-muted-foreground">day streak</span>
        </div>
        {todayComplete && (
          <div className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
            <Trophy className="w-3 h-3" />
            Done today!
          </div>
        )}
      </div>

      <div className="flex justify-between gap-1 mb-3">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{day}</span>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
              weekActivity[i] 
                ? 'bg-orange-500 text-white' 
                : 'bg-secondary text-muted-foreground'
            }`}>
              {weekActivity[i] && <Flame className="w-3 h-3" />}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Longest streak: <span className="font-medium text-foreground">{longestStreak} days</span>
      </div>
    </div>
  );
}
