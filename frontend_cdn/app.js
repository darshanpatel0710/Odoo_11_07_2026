const { useState, useEffect, useContext, createContext } = React;
const { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } = ReactRouterDOM;
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = window.Recharts;

// --- API Client ---
const api = axios.create({
    baseURL: '/api'
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// --- Auth Context ---
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/auth/me').then(res => {
                setUser(res.data);
            }).catch(() => {
                localStorage.removeItem('token');
            }).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.access_token);
        setUser(res.data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    if (loading) return <div className="p-8 sketch-font">Loading...</div>;

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// --- Shared Components ---
const StatusPill = ({ status }) => {
    const safeStatus = status.replace(" ", "");
    return <span className={`pill pill-${safeStatus}`}>{status}</span>;
};

const Card = ({ title, value, colorClass }) => (
    <div className={`sketch-border bg-panelbg p-4 flex flex-col border-l-4 ${colorClass}`}>
        <span className="text-gray-400 uppercase text-xs font-bold">{title}</span>
        <span className="text-3xl font-bold sketch-font mt-2">{value}</span>
    </div>
);

// --- Layout ---
const Sidebar = () => {
    const location = useLocation();
    const navLinks = [
        { path: '/', label: 'Dashboard' },
        { path: '/fleet', label: 'Fleet' },
        { path: '/drivers', label: 'Drivers' },
        { path: '/trips', label: 'Trips' },
        { path: '/maintenance', label: 'Maintenance' },
        { path: '/fuel', label: 'Fuel & Expenses' },
        { path: '/reports', label: 'Analytics' },
        { path: '/settings', label: 'Settings' }
    ];

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
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold sketch-font cursor-pointer" onClick={logout} title="Click to logout">
                    {user?.name.split(' ').map(n => n[0]).join('')}
                </div>
            </div>
        </div>
    );
};

const Layout = ({ children }) => {
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

// --- Pages ---
const Login = () => {
    const [email, setEmail] = useState('dispatcher@transitops.com');
    const [password, setPassword] = useState('password123');
    const { login, user } = useContext(AuthContext);
    const navigate = useNavigate();

    if (user) return <Navigate to="/" />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            alert('Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-darkbg">
            <div className="sketch-border bg-panelbg p-8 w-96">
                <h1 className="text-3xl sketch-font mb-6 text-center">TransitOps</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-darkbg sketch-border p-2 focus:border-amber-600 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-darkbg sketch-border p-2 focus:border-amber-600 outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-amber-600 text-black font-bold sketch-font py-2 rounded">Login</button>
                </form>
                <div className="mt-4 text-xs text-gray-500">
                    Test accounts: dispatcher@transitops.com, fleetmanager@transitops.com (pw: password123)
                </div>
            </div>
        </div>
    );
};

// Exporting app initialization logic to window so we can separate other files later if we want.
window.AppComponents = {
    AuthContext, AuthProvider, Layout, Login, StatusPill, Card, api
};
