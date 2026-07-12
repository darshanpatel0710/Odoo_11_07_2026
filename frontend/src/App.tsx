import { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { Layout } from './components/Shared';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { Drivers } from './pages/Drivers';
import { Trips } from './pages/Trips';
import { Maintenance } from './pages/Maintenance';
import { FuelExpenses } from './pages/FuelExpenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { DriverPortal } from './pages/DriverPortal';
import { Logout } from './pages/Logout';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
    const { user } = useContext(AuthContext);
    if (!user) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
    if (user.role === 'Driver') return <DriverPortal />;
    return <Layout>{children}</Layout>;
};

const AppRoutes = () => (
    <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        
        {/* Fleet & Drivers & Trips are viewable by almost everyone to some extent */}
        <Route path="/fleet" element={<ProtectedRoute allowedRoles={['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst']}><Vehicles /></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute allowedRoles={['Fleet Manager', 'Dispatcher', 'Safety Officer']}><Drivers /></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute allowedRoles={['Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst']}><Trips /></ProtectedRoute>} />
        
        <Route path="/maintenance" element={<ProtectedRoute allowedRoles={['Fleet Manager', 'Financial Analyst']}><Maintenance /></ProtectedRoute>} />
        <Route path="/fuel" element={<ProtectedRoute allowedRoles={['Fleet Manager', 'Financial Analyst']}><FuelExpenses /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={['Fleet Manager', 'Financial Analyst', 'Dispatcher']}><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute allowedRoles={['Fleet Manager']}><Settings /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" />} />
    </Routes>
);

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
