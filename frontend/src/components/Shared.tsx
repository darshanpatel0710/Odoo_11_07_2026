import React, { useContext } from 'react';
import { Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const StatusPill = ({ status }: { status: string }) => {
    const safeStatus = status.replace(" ", "");
    return <span className={`pill pill-${safeStatus}`}>{status}</span>;
};

export const Card = ({ title, value, colorClass }: { title: string, value: string | number, colorClass: string }) => (
    <div className={`sketch-border bg-panelbg p-4 flex flex-col border-l-4 ${colorClass}`}>
        <span className="text-gray-400 uppercase text-xs font-bold">{title}</span>
        <span className="text-3xl font-bold sketch-font mt-2">{value}</span>
    </div>
);

const Sidebar = () => {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    
    // Base navLinks available to all
    let navLinks = [ { path: '/', label: 'Dashboard' } ];

    if (user) {
        if (user.role === 'Fleet Manager') {
            navLinks = [
                ...navLinks,
                { path: '/fleet', label: 'Fleet' },
                { path: '/drivers', label: 'Drivers' },
                { path: '/trips', label: 'Trips' },
                { path: '/maintenance', label: 'Maintenance' },
                { path: '/fuel', label: 'Fuel & Expenses' },
                { path: '/reports', label: 'Analytics' },
                { path: '/settings', label: 'Settings' }
            ];
        } else if (user.role === 'Dispatcher') {
            navLinks = [
                ...navLinks,
                { path: '/fleet', label: 'Fleet' },
                { path: '/drivers', label: 'Drivers' },
                { path: '/trips', label: 'Trips' },
                { path: '/reports', label: 'Analytics' }
            ];
        } else if (user.role === 'Safety Officer') {
            navLinks = [
                ...navLinks,
                { path: '/fleet', label: 'Fleet' },
                { path: '/drivers', label: 'Drivers' },
                { path: '/trips', label: 'Trips' }
            ];
        } else if (user.role === 'Financial Analyst') {
            navLinks = [
                ...navLinks,
                { path: '/fleet', label: 'Fleet' },
                { path: '/trips', label: 'Trips' },
                { path: '/maintenance', label: 'Maintenance' },
                { path: '/fuel', label: 'Fuel & Expenses' },
                { path: '/reports', label: 'Analytics' }
            ];
        }
    }

    return (
        <div className="w-[190px] fixed top-0 left-0 h-full bg-[#111] border-r border-[#333] flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl sketch-font font-bold text-white tracking-widest">TransitOps</h1>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {navLinks.map(link => {
                    const isActive = location.pathname === link.path;
                    return (
                        <Link key={link.path} to={link.path} className={`block px-4 py-2 sketch-font rounded ${isActive ? 'text-white sketch-border border-amber-600' : 'text-[#999] hover:text-white'}`}>
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

const Topbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    
    return (
        <div className="fixed top-0 left-[190px] right-0 h-16 bg-[#111] border-b border-[#333] flex items-center justify-between px-6 z-10">
            <div>
                <input type="text" placeholder="Search..." className="bg-[#1a1a1a] sketch-border px-4 py-1 text-sm focus:outline-none focus:border-amber-600" />
            </div>
            <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end">
                    <span className="sketch-font text-white">{user?.name}</span>
                    <span className="bg-amber-600 text-black text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">{user?.role}</span>
                </div>
                <div 
                    onClick={() => navigate('/logout')} 
                    className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold sketch-font cursor-pointer hover:bg-blue-500" 
                    title="Click to logout"
                >
                    {user?.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </div>
            </div>
        </div>
    );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
    const { user } = useContext(AuthContext);
    if (!user) return <Navigate to="/login" />;
    return (
        <div className="min-h-screen">
            <Sidebar />
            <Topbar />
            <div className="ml-[190px] mt-16 p-8">
                {children}
            </div>
        </div>
    );
};
