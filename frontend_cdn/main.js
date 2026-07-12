const { BrowserRouter, Routes, Route, Navigate } = window.ReactRouterDOM;
const { AuthProvider, Layout, Login, Dashboard, Vehicles, Drivers, Trips, Maintenance, FuelExpenses, Reports, Settings } = window.AppComponents;

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Layout><Dashboard /></Layout>} />
                    <Route path="/fleet" element={<Layout><Vehicles /></Layout>} />
                    <Route path="/drivers" element={<Layout><Drivers /></Layout>} />
                    <Route path="/trips" element={<Layout><Trips /></Layout>} />
                    <Route path="/maintenance" element={<Layout><Maintenance /></Layout>} />
                    <Route path="/fuel" element={<Layout><FuelExpenses /></Layout>} />
                    <Route path="/reports" element={<Layout><Reports /></Layout>} />
                    <Route path="/settings" element={<Layout><Settings /></Layout>} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
