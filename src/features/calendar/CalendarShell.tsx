import React from 'react';
import { CalendarPage } from './CalendarPage';

interface CalendarShellProps {
  uid: string;
  onBackToHome?: () => void;
  onNavigateToGoal?: (goalId: string) => void;
  onNavigateToBook?: (bookId: string) => void;
}

export const CalendarShell: React.FC<CalendarShellProps> = (props) => {
  return <CalendarPage {...props} />;
};
