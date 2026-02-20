import { useMapStore } from '../store/useStore';
import { MapView } from '../components/Map/MapView';
import { FlightList } from '../components/Sidebar/FlightList';
import { FlightPlanner } from '../components/Sidebar/FlightPlanner';
import { ConflictBanner } from '../components/Alerts/ConflictBanner';
import { AuthModal } from '../components/Auth/AuthModal';
import { AdminPanel } from '../components/Sidebar/AdminPanel';

export const DashboardPage = () => {
    const { auth } = useMapStore();

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {!auth.token && <AuthModal />}

            <ConflictBanner />
            <div style={{ display: 'flex', flexDirection: 'column', width: '300px', background: '#343a40', color: 'white' }}>
                <AdminPanel />
                <FlightPlanner />
                <FlightList />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
                <MapView />
            </div>
        </div>
    );
};
