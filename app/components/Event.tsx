'use client';

import { format } from 'date-fns';
import { Calendar as CalendarType, CalendarEvent } from '../lib/calendarService';
import React from 'react';

interface EventProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  calendars: CalendarType[];
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
}

export default function Event({ event, calendars, onMouseDown, isDragging }: EventProps) {
  const calendar = calendars.find(c => c.id === event.calendarId);
  const color = calendar?.color || 'gray';

  const getColorClasses = () => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
      green: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
      purple: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200',
      red: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getTextColorClasses = (baseClass: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-500 dark:text-blue-400',
      green: 'text-green-500 dark:text-green-400',
      purple: 'text-purple-500 dark:text-purple-400',
      red: 'text-red-500 dark:text-red-400',
      yellow: 'text-yellow-500 dark:text-yellow-400',
      indigo: 'text-indigo-500 dark:text-indigo-400'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getLinkColorClasses = (baseClass: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-green-600 dark:text-green-400',
      purple: 'text-purple-600 dark:text-purple-400',
      red: 'text-red-600 dark:text-red-400',
      yellow: 'text-yellow-600 dark:text-yellow-400',
      indigo: 'text-indigo-600 dark:text-indigo-400'
    };
    return colorMap[color] || colorMap.blue;
  };

  const getLiveIndicatorColorClasses = (baseClass: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-400 bg-blue-500',
      green: 'bg-green-400 bg-green-500',
      purple: 'bg-purple-400 bg-purple-500',
      red: 'bg-red-400 bg-red-500',
      yellow: 'bg-yellow-400 bg-yellow-500',
      indigo: 'bg-indigo-400 bg-indigo-500'
    };
    return colorMap[color] || colorMap.blue;
  };

  const draggingStyles = isDragging 
    ? 'border-2 border-dashed ring-2 ring-offset-1 ring-gray-500 opacity-75'
    : 'border';

  return (
    <div
      className={`group relative rounded-lg text-xs leading-5 ${getColorClasses()} ${draggingStyles} overflow-hidden h-full`}
      onMouseDown={onMouseDown}
    >
      <div className="p-1 h-full flex flex-col">
        <p className="font-semibold truncate shrink-0">{event.title}</p>
        <p className="opacity-80 truncate shrink-0">
          {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
        </p>
        <div className="mt-auto shrink-0">
          {event.type === 'online' && event.meetingUrl && (
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`block truncate text-current opacity-75 hover:opacity-100 hover:underline`}
            >
              Join
            </a>
          )}
          {event.type === 'in-person' && event.location && (
            <p className={`block truncate text-current opacity-75`}>{event.location}</p>
          )}
        </div>
      </div>
      {event.isLive && (
        <span className="absolute top-1 right-1 flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full ${getLiveIndicatorColorClasses('').split(' ')[0]} opacity-75`}></span>
          <span className={`relative inline-flex h-2 w-2 rounded-full ${getLiveIndicatorColorClasses('').split(' ')[1]}`}></span>
        </span>
      )}
    </div>
  );
}