'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, startOfWeek, endOfWeek, addHours, isWithinInterval, startOfDay, endOfDay, getHours, getMinutes, differenceInMinutes, addMinutes, startOfToday } from 'date-fns';
import { Calendar as CalendarType, CalendarEvent } from '../lib/calendarService';
import Event from './Event';
import CreateEventModal from './CreateEventModal';

interface CalendarGridProps {
  view: 'day' | 'week' | 'month';
  selectedDate: Date;
  events: CalendarEvent[];
  onEventCreate: (event: Omit<CalendarEvent, 'id' | 'userId'>) => Promise<void>;
  onEventEdit: (id: string, event: Partial<CalendarEvent>) => Promise<void>;
  onEventDelete: (id: string) => Promise<void>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  calendars: CalendarType[];
}

const pixelsPerHour = 60;
const startHour = 0;
const endHour = 23;

const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

const formatHour = (hour: number) => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
};

export default function CalendarGrid({
  view,
  selectedDate,
  events,
  onEventCreate,
  onEventEdit,
  onEventDelete,
  onDateClick,
  onEventClick,
  calendars,
}: CalendarGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [initialEventTop, setInitialEventTop] = useState<number>(0);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [ghostPosition, setGhostPosition] = useState<{top: number} | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timerId);
  }, []);

  const handleInternalEventClick = (event: CalendarEvent) => {
    console.log('CalendarGrid handleInternalEventClick: Calling onEventClick prop');
    onEventClick(event);
  };

  const handleInternalDateClick = (date: Date) => {
    console.log('CalendarGrid handleInternalDateClick: Calling onDateClick prop');
    onDateClick(date);
  };

  const topOffset = 8;

  const getEventStyle = (event: CalendarEvent, dayIndex: number, totalDays: number) => {
    const startOfDayForEvent = startOfDay(event.start);
    const startMinutes = differenceInMinutes(event.start, startOfDayForEvent);
    const endMinutes = differenceInMinutes(event.end, startOfDayForEvent);
    const durationMinutes = Math.max(15, endMinutes - startMinutes);

    const top = topOffset + (startMinutes / 60) * pixelsPerHour;
    const height = (durationMinutes / 60) * pixelsPerHour;

    // Log the calculated values for debugging
    console.log(`Event: ${event.id.substring(0,5)}..., Start: ${format(event.start, 'HH:mm')}, End: ${format(event.end, 'HH:mm')}, DurationM: ${durationMinutes}, CalcHeight: ${height.toFixed(1)}px`);

    const eventWidthPercent = 90;
    const left = (100 / totalDays) * dayIndex + (100 / totalDays * (1 - eventWidthPercent / 100) / 2);
    const width = `${eventWidthPercent}%`;

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '0%',
      width: '100%',
    };
  };

  // --- Drag Handlers ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingEvent) return;
    const currentY = e.clientY;
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    
    const newTop = currentY - gridRect.top - dragOffsetY;
    const constrainedTop = Math.max(topOffset, newTop);
    
    setGhostPosition({ top: constrainedTop });

    const currentTopMinutes = ((constrainedTop - topOffset) / pixelsPerHour) * 60;
    const newStartDate = addMinutes(startOfDay(draggingEvent.start), currentTopMinutes);
    console.log(`MouseMove: Ghost Top: ${constrainedTop.toFixed(1)}, Approx Time: ${format(newStartDate, 'h:mm a')}`);

  }, [draggingEvent, dragOffsetY, initialEventTop, dragStartY, topOffset, pixelsPerHour]);

  const handleMouseUp = useCallback(async (e: MouseEvent) => {
    console.log("!!! MouseUp Fired !!! - Attempting to end drag");
    const localDraggingEvent = draggingEvent;
    const localGridRef = gridRef.current;
    const localDragOffsetY = dragOffsetY;
    const localInitialEventTop = initialEventTop;
    const localDragStartY = dragStartY;

    setDraggingEvent(null);
    setDragOffsetY(0);
    setInitialEventTop(0);
    setDragStartY(0);
    setGhostPosition(null);
    console.log("MouseUp: Drag state flags reset");

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    console.log("MouseUp: Window listeners removed");

    if (!localDraggingEvent || !localGridRef) {
      console.log("MouseUp: Aborting update (no event or ref at time of mouseup)");
      return;
    }

    const distanceMoved = Math.abs(e.clientY - localDragStartY);
    const clickThreshold = 5;
    console.log(`MouseUp: Distance moved: ${distanceMoved.toFixed(1)}px`);

    if (distanceMoved < clickThreshold) {
        console.log("MouseUp: Treated as click, not drag. onClick handler should manage modal.");
        return;
    }
    
    console.log("Drag End for:", localDraggingEvent.id);
    e.preventDefault();

    const gridRect = localGridRef.getBoundingClientRect();
    const finalY = e.clientY;
    let finalTop = finalY - gridRect.top - localDragOffsetY;
    finalTop = Math.max(topOffset, finalTop);

    const startMinutesDiff = ((finalTop - localInitialEventTop) / pixelsPerHour) * 60;
    const snappedMinutesDiff = Math.round(startMinutesDiff / 15) * 15; 

    if (snappedMinutesDiff === 0) { 
        console.log("MouseUp: No significant time change detected after drag.");
        return; 
    } 

    const newStart = addMinutes(localDraggingEvent.start, snappedMinutesDiff);
    const durationMinutes = differenceInMinutes(localDraggingEvent.end, localDraggingEvent.start);
    const newEnd = addMinutes(newStart, durationMinutes);

    console.log("Updating event times:", newStart, newEnd);
    try {
      await onEventEdit(localDraggingEvent.id, { start: newStart, end: newEnd });
      console.log("MouseUp: Event update successful after drag");
    } catch (error) {
      console.error("Error updating event after drag:", error);
    }

  }, [
    draggingEvent, 
    gridRef, 
    dragOffsetY, 
    initialEventTop, 
    dragStartY,
    pixelsPerHour, 
    topOffset, 
    handleMouseMove,
    onEventEdit
  ]);

  const handleEventMouseDown = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    if (!gridRef.current) return;
    e.preventDefault();
    console.log("Drag Start on:", event.id);

    const eventStyle = getEventStyle(event, 0, 1);
    const initialTop = parseFloat(eventStyle.top);
    const gridRect = gridRef.current.getBoundingClientRect();
    const startY = e.clientY;
    const offsetY = startY - gridRect.top - initialTop;

    setDraggingEvent(event);
    setDragOffsetY(offsetY);
    setInitialEventTop(initialTop);
    setDragStartY(startY);
    setGhostPosition({ top: initialTop });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

  }, [getEventStyle, handleMouseMove, handleMouseUp]);
  // --- End Drag Handlers ---

  // --- Component Render --- 
  console.log("--- CalendarGrid Render ---"); // Log each render
  console.log("Current ghostPosition state:", ghostPosition); // Log the state value used for styling

  const visibleEvents = events;

  if (view === 'month') {
    return (
      <div className="grid grid-cols-7 grid-rows-[auto_repeat(6,_minmax(0,_1fr))] h-full gap-px bg-gray-200 dark:bg-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-white dark:bg-gray-800 p-2 text-center font-semibold">
            {day}
          </div>
        ))}
        {eachDayOfInterval({ start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) }).map(day => {
          const dayEvents = visibleEvents.filter(event => isSameDay(event.start, day));
          return (
            <div
              key={day.toString()}
              className={`bg-white dark:bg-gray-800 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 overflow-hidden ${
                !isSameMonth(day, selectedDate) ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50' : ''
              }`}
              onClick={() => handleInternalDateClick(day)}
            >
              <div className="font-semibold mb-1 text-right">{format(day, 'd')}</div>
              <div className="space-y-1 overflow-y-auto max-h-[calc(100%_-_2em)]">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className="w-full"
                    onClick={(e) => { e.stopPropagation(); handleInternalEventClick(event); }}
                  >
                    <Event
                      event={event}
                      calendars={calendars}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (view === 'week') {
    const weekStart = startOfWeek(selectedDate);
    const weekEnd = endOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const now = currentTime;
    const minutesSinceMidnight = differenceInMinutes(now, startOfDay(now));
    const topPosition = topOffset + (minutesSinceMidnight / 60) * pixelsPerHour;
    const showCurrentTimeIndicator = isWithinInterval(now, { start: weekStart, end: endOfDay(weekEnd) });

    return (
      <div className="flex flex-1 h-full">
        <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 relative">
          <div className="absolute top-0 left-full w-px h-full bg-gray-200 dark:bg-gray-700 -ml-px z-0"></div>
          {hours.map(hour => (
            <div key={`time-${hour}`} style={{ height: `${pixelsPerHour}px` }} className="text-right pr-2 pt-1 text-xs text-gray-500 dark:text-gray-400 relative z-10">
              {formatHour(hour)}
            </div>
          ))}
        </div>

        <div className="flex-1 relative grid grid-cols-7">
          {weekDays.map((day, dayIndex) => (
            <div key={`col-${dayIndex}`} className={`relative ${dayIndex < 6 ? 'border-r border-gray-100 dark:border-gray-700/50' : ''}`} >
              <div style={{ height: `${topOffset}px` }} className="border-b border-gray-200 dark:border-gray-700 text-center p-1">
                <span className="text-xs font-semibold">{format(day, 'EEE')}</span> <span className={`text-lg ${isSameDay(day, startOfToday()) ? 'text-indigo-600 font-bold' : ''}`}>{format(day, 'd')}</span>
              </div>
              {hours.map(hour => {
                const hourStart = addHours(day, hour);
                return (
                  <div
                    key={`line-${dayIndex}-${hour}`}
                    style={{ height: `${pixelsPerHour}px` }}
                    className="border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => handleInternalDateClick(hourStart)}
                  ></div>
                );
              })}
              {visibleEvents
                .filter(event => isSameDay(event.start, day))
                .map(event => {
                  const eventStyle = getEventStyle(event, 0, 1);
                  const styleWithinColumn = {
                      ...eventStyle,
                      left: '0%',
                      width: '100%',
                      position: 'absolute' as 'absolute',
                      zIndex: 10,
                  };
                  return (
                      <div 
                          key={event.id} 
                          className="absolute z-10" 
                          style={styleWithinColumn}
                          onClick={(e) => { e.stopPropagation(); handleInternalEventClick(event); }}
                      >
                          <Event
                              event={event}
                              calendars={calendars}
                          />
                      </div>
                  );
              })}
            </div>
          ))}

          {showCurrentTimeIndicator && (
            <div className="absolute left-0 right-0 flex items-center z-10" style={{ top: `${topPosition}px` }}>
              <div className="h-2 w-2 rounded-full bg-red-500 -ml-1 mr-1"></div>
              <div className="h-[1px] w-full bg-red-500"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const dayEvents = visibleEvents.filter(event => isSameDay(event.start, selectedDate));
  const referenceDateForHourFormat = startOfDay(selectedDate);

  const now = currentTime;
  const minutesSinceMidnight = differenceInMinutes(now, startOfDay(now));
  const topPosition = topOffset + (minutesSinceMidnight / 60) * pixelsPerHour;
  const showCurrentTimeIndicator = isSameDay(now, selectedDate);

  return (
    <div className="flex flex-1 h-full">
      <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 relative">
        <div className="absolute top-0 left-full w-px h-full bg-gray-200 dark:bg-gray-700 -ml-px z-0"></div>
        {hours.map(hour => (
          <div key={`time-${hour}`} style={{ height: `${pixelsPerHour}px` }} className="text-right pr-2 pt-1 text-xs text-gray-500 dark:text-gray-400 relative z-10">
            {formatHour(hour)}
          </div>
        ))}
      </div>

      <div
        ref={gridRef}
        className="flex-1 relative"
        onClick={(e) => {
          if ((e.target as Element).closest('[data-event-block="true"]')) {
            console.log("Grid Click ignored, inside event block.");
            return;
          }
          if (!gridRef.current) return;
          const rect = gridRef.current.getBoundingClientRect();
          const clickY = e.clientY - rect.top + gridRef.current.scrollTop - topOffset;
          if (clickY < 0) return;
          const rawClickedMinute = (clickY / pixelsPerHour) * 60;
          const snappedClickedMinute = Math.floor(rawClickedMinute / 15) * 15;
          const clickedDate = addMinutes(startOfDay(selectedDate), snappedClickedMinute);
          console.log(`Grid Click: RawMin ${rawClickedMinute.toFixed(1)}, SnappedMin ${snappedClickedMinute}, Date: ${clickedDate}`);
          handleInternalDateClick(clickedDate);
        }}
      >
        <div style={{ height: `${topOffset}px` }}></div>
        {hours.map(hour => (
          <div key={`line-${hour}`} style={{ height: `${pixelsPerHour}px` }} className="border-b border-gray-100 dark:border-gray-700/50"></div>
        ))}

        {showCurrentTimeIndicator && (
          <div
            className="absolute left-0 right-0 flex items-center z-10"
            style={{ top: `${topPosition}px` }}
          >
            <div className="h-2 w-2 rounded-full bg-red-500 -ml-1"></div>
            <div className="h-[1px] w-full bg-red-500"></div>
          </div>
        )}

        {dayEvents.map(event => (
          <div
            key={event.id}
            className={`absolute left-0 right-0 z-10 ${draggingEvent?.id === event.id ? 'opacity-30' : ''}`}
            style={getEventStyle(event, 0, 1)}
            data-event-block="true"
            onClick={(e) => {
              console.log("Wrapper onClick triggered for event:", event.id);
              e.stopPropagation();
              handleInternalEventClick(event);
            }}
          >
            <Event
              event={event}
              calendars={calendars}
              onMouseDown={(e) => handleEventMouseDown(event, e)}
            />
          </div>
        ))}

        {draggingEvent && ghostPosition && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none shadow-lg"
            style={{
              ...getEventStyle(draggingEvent, 0, 1),
              top: `${ghostPosition.top}px`,
            }}
          >
            <Event
              event={draggingEvent}
              calendars={calendars}
              isDragging={true}
            />
          </div>
        )}

      </div>
    </div>
  );
} 