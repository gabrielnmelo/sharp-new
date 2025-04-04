import Calendar from './components/Calendar';
import ProtectedRoute from './components/ProtectedRoute';

export default function Home() {
  return (
    <ProtectedRoute>
      <Calendar />
    </ProtectedRoute>
  );
}
