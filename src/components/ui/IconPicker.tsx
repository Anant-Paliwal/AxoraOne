import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Folder, Book, BookOpen, Notebook, FileCode, FileJson, FilePlus,
  Home, Building, Building2, Briefcase, GraduationCap, School, Library,
  Brain, Lightbulb, Target, Trophy, Award, Star, Heart, Bookmark,
  Calendar, Clock, Timer, CalendarDays, CalendarCheck,
  CheckSquare, ListTodo, ClipboardList, ClipboardCheck, List, ListChecks,
  Code, Terminal, Database, Server, Cloud, Globe, Wifi, Monitor,
  Palette, Paintbrush, Pencil, PenTool, Highlighter, Eraser,
  Camera, Image, Video, Music, Headphones, Mic, Play, Film,
  Mail, MessageSquare, MessageCircle, Send, Bell, BellRing,
  User, Users, UserPlus, UserCheck, Contact, PersonStanding,
  Settings, Cog, Wrench, Hammer, SlidersHorizontal,
  Search, Filter, Eye, EyeOff, Scan, ZoomIn,
  Lock, Unlock, Key, Shield, ShieldCheck, Fingerprint,
  Rocket, Plane, Car, Bike, Ship, Train,
  Sun, Moon, CloudSun, Snowflake, Umbrella, Wind,
  Coffee, Pizza, Apple, Cake, IceCream,
  Gift, Package, ShoppingCart, ShoppingBag, CreditCard, Wallet,
  Map, MapPin, Navigation, Compass, Flag, Signpost,
  Phone, Smartphone, Tablet, Laptop, Tv, Watch,
  Zap, Battery, BatteryCharging, Plug, Power, Cpu,
  Smile, Frown, Meh, Laugh, ThumbsUp,
  X, Search as SearchIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon categories with Lucide icons
const iconCategories = {
  'Documents': [
    { name: 'FileText', icon: FileText },
    { name: 'Folder', icon: Folder },
    { name: 'Book', icon: Book },
    { name: 'BookOpen', icon: BookOpen },
    { name: 'Notebook', icon: Notebook },
    { name: 'FileCode', icon: FileCode },
    { name: 'FileJson', icon: FileJson },
    { name: 'FilePlus', icon: FilePlus },
  ],
  'Places': [
    { name: 'Home', icon: Home },
    { name: 'Building', icon: Building },
    { name: 'Building2', icon: Building2 },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'School', icon: School },
    { name: 'Library', icon: Library },
  ],
  'Learning': [
    { name: 'Brain', icon: Brain },
    { name: 'Lightbulb', icon: Lightbulb },
    { name: 'Target', icon: Target },
    { name: 'Trophy', icon: Trophy },
    { name: 'Award', icon: Award },
    { name: 'Star', icon: Star },
    { name: 'Heart', icon: Heart },
    { name: 'Bookmark', icon: Bookmark },
  ],
  'Time': [
    { name: 'Calendar', icon: Calendar },
    { name: 'Clock', icon: Clock },
    { name: 'Timer', icon: Timer },
    { name: 'CalendarDays', icon: CalendarDays },
    { name: 'CalendarCheck', icon: CalendarCheck },
  ],
  'Tasks': [
    { name: 'CheckSquare', icon: CheckSquare },
    { name: 'ListTodo', icon: ListTodo },
    { name: 'ClipboardList', icon: ClipboardList },
    { name: 'ClipboardCheck', icon: ClipboardCheck },
    { name: 'List', icon: List },
    { name: 'ListChecks', icon: ListChecks },
  ],
  'Tech': [
    { name: 'Code', icon: Code },
    { name: 'Terminal', icon: Terminal },
    { name: 'Database', icon: Database },
    { name: 'Server', icon: Server },
    { name: 'Cloud', icon: Cloud },
    { name: 'Globe', icon: Globe },
    { name: 'Wifi', icon: Wifi },
    { name: 'Monitor', icon: Monitor },
  ],
  'Creative': [
    { name: 'Palette', icon: Palette },
    { name: 'Paintbrush', icon: Paintbrush },
    { name: 'Pencil', icon: Pencil },
    { name: 'PenTool', icon: PenTool },
    { name: 'Highlighter', icon: Highlighter },
    { name: 'Eraser', icon: Eraser },
  ],
  'Media': [
    { name: 'Camera', icon: Camera },
    { name: 'Image', icon: Image },
    { name: 'Video', icon: Video },
    { name: 'Music', icon: Music },
    { name: 'Headphones', icon: Headphones },
    { name: 'Mic', icon: Mic },
    { name: 'Play', icon: Play },
    { name: 'Film', icon: Film },
  ],
  'Communication': [
    { name: 'Mail', icon: Mail },
    { name: 'MessageSquare', icon: MessageSquare },
    { name: 'MessageCircle', icon: MessageCircle },
    { name: 'Send', icon: Send },
    { name: 'Bell', icon: Bell },
    { name: 'BellRing', icon: BellRing },
  ],
  'People': [
    { name: 'User', icon: User },
    { name: 'Users', icon: Users },
    { name: 'UserPlus', icon: UserPlus },
    { name: 'UserCheck', icon: UserCheck },
    { name: 'Contact', icon: Contact },
    { name: 'PersonStanding', icon: PersonStanding },
  ],
  'Settings': [
    { name: 'Settings', icon: Settings },
    { name: 'Cog', icon: Cog },
    { name: 'Wrench', icon: Wrench },
    { name: 'Hammer', icon: Hammer },
    { name: 'SlidersHorizontal', icon: SlidersHorizontal },
  ],
  'View': [
    { name: 'Search', icon: Search },
    { name: 'Filter', icon: Filter },
    { name: 'Eye', icon: Eye },
    { name: 'EyeOff', icon: EyeOff },
    { name: 'Scan', icon: Scan },
    { name: 'ZoomIn', icon: ZoomIn },
  ],
  'Security': [
    { name: 'Lock', icon: Lock },
    { name: 'Unlock', icon: Unlock },
    { name: 'Key', icon: Key },
    { name: 'Shield', icon: Shield },
    { name: 'ShieldCheck', icon: ShieldCheck },
    { name: 'Fingerprint', icon: Fingerprint },
  ],
  'Transport': [
    { name: 'Rocket', icon: Rocket },
    { name: 'Plane', icon: Plane },
    { name: 'Car', icon: Car },
    { name: 'Bike', icon: Bike },
    { name: 'Ship', icon: Ship },
    { name: 'Train', icon: Train },
  ],
  'Weather': [
    { name: 'Sun', icon: Sun },
    { name: 'Moon', icon: Moon },
    { name: 'CloudSun', icon: CloudSun },
    { name: 'Snowflake', icon: Snowflake },
    { name: 'Umbrella', icon: Umbrella },
    { name: 'Wind', icon: Wind },
  ],
  'Food': [
    { name: 'Coffee', icon: Coffee },
    { name: 'Pizza', icon: Pizza },
    { name: 'Apple', icon: Apple },
    { name: 'Cake', icon: Cake },
    { name: 'IceCream', icon: IceCream },
  ],
  'Shopping': [
    { name: 'Gift', icon: Gift },
    { name: 'Package', icon: Package },
    { name: 'ShoppingCart', icon: ShoppingCart },
    { name: 'ShoppingBag', icon: ShoppingBag },
    { name: 'CreditCard', icon: CreditCard },
    { name: 'Wallet', icon: Wallet },
  ],
  'Navigation': [
    { name: 'Map', icon: Map },
    { name: 'MapPin', icon: MapPin },
    { name: 'Navigation', icon: Navigation },
    { name: 'Compass', icon: Compass },
    { name: 'Flag', icon: Flag },
    { name: 'Signpost', icon: Signpost },
  ],
  'Devices': [
    { name: 'Phone', icon: Phone },
    { name: 'Smartphone', icon: Smartphone },
    { name: 'Tablet', icon: Tablet },
    { name: 'Laptop', icon: Laptop },
    { name: 'Tv', icon: Tv },
    { name: 'Watch', icon: Watch },
  ],
  'Power': [
    { name: 'Zap', icon: Zap },
    { name: 'Battery', icon: Battery },
    { name: 'BatteryCharging', icon: BatteryCharging },
    { name: 'Plug', icon: Plug },
    { name: 'Power', icon: Power },
    { name: 'Cpu', icon: Cpu },
  ],
  'Emoji': [
    { name: 'Smile', icon: Smile },
    { name: 'Frown', icon: Frown },
    { name: 'Meh', icon: Meh },
    { name: 'Laugh', icon: Laugh },
    { name: 'ThumbsUp', icon: ThumbsUp },
  ],
};

// Get all icons as flat array
const allIcons = Object.values(iconCategories).flat();

// Icon name to component map for rendering saved icons
export const iconMap: Record<string, any> = {};
allIcons.forEach(item => {
  iconMap[item.name] = item.icon;
});


interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function IconPicker({ value, onChange, className, size = 'md', showLabel = false }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter icons based on search
  const filteredIcons = search
    ? allIcons.filter(icon => icon.name.toLowerCase().includes(search.toLowerCase()))
    : selectedCategory
    ? iconCategories[selectedCategory as keyof typeof iconCategories]
    : allIcons;

  // Get current icon component
  const CurrentIcon = value ? iconMap[value] : FileText;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-colors',
          sizeClasses[size]
        )}
      >
        <div className="w-full h-full flex items-center justify-center">
          {CurrentIcon && <CurrentIcon className={cn(iconSizes[size], 'text-foreground')} />}
        </div>
      </button>
      {showLabel && <span className="text-xs text-muted-foreground mt-1 block text-center">Icon</span>}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedCategory(null); }}
                  placeholder="Search icons..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/50 border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Categories */}
            {!search && (
              <div className="p-2 border-b border-border flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md transition-colors',
                    !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
                  )}
                >
                  All
                </button>
                {Object.keys(iconCategories).map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-md transition-colors',
                      selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* Icons Grid */}
            <div className="p-3 max-h-64 overflow-y-auto hide-scrollbar">
              <div className="grid grid-cols-8 gap-1">
                {filteredIcons.map((item) => {
                  const Icon = item.icon;
                  const isSelected = value === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => { onChange(item.name); setIsOpen(false); setSearch(''); }}
                      title={item.name}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-secondary text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
              {filteredIcons.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No icons found</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component to render an icon by name
export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || FileText;
  return <Icon className={className} />;
}
