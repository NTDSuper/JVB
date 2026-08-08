import React from 'react';
import { BookOpen, Shirt, Music, Mic, Video } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  badgeNumber?: number;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onChange,
  badgeNumber = 1,
}) => {
  return (
    <div className="flex items-center gap-6">
      {/* Circular Badge */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-600 font-semibold text-sm">
          {badgeNumber}
        </div>
      </div>

      {/* Tab List */}
      <div className="flex-1 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`
                  relative flex items-center gap-2 pb-1 whitespace-nowrap
                  transition-all duration-200 ease-in-out
                  ${
                    isActive
                      ? 'text-purple-600 font-semibold'
                      : 'text-slate-500 hover:text-purple-400'
                  }
                `}
              >
                {/* Icon */}
                <span className={`flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-500'}`}>
                  {tab.icon}
                </span>

                {/* Label */}
                <span className="text-sm">{tab.label}</span>

                {/* Underline for active tab */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Default tabs with icons
export const defaultTabs: TabItem[] = [
  {
    id: 'education',
    label: 'Education',
    icon: <BookOpen />,
  },
  {
    id: 'fashion',
    label: 'Fashion',
    icon: <Shirt />,
  },
  {
    id: 'music',
    label: 'Music',
    icon: <Music />,
  },
  {
    id: 'podcast',
    label: 'Podcast',
    icon: <Mic />,
  },
  {
    id: 'video',
    label: 'Video',
    icon: <Video />,
  },
];

export default TabNavigation;