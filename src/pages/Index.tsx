import { useAuth } from '@/contexts/AuthContext';
import Dashboard from './Dashboard';
import Sales from './Sales';

export default function Index() {
  const { isOwner } = useAuth();
  
  // Owners see the dashboard, attendants see the sales screen
  return isOwner ? <Dashboard /> : <Sales />;
}
