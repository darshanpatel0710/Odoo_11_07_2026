const { useState, useEffect } = React;
const { api } = window.AppComponents;

const Settings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // RBAC Matrix definition
    const matrix = [
        { role: 'Fleet Manager', fleet: '✓', drivers: '✓', trips: '✓', fuel: '✓', analytics: '✓' },
        { role: 'Dispatcher', fleet: 'View', drivers: 'View', trips: '✓', fuel: '–', analytics: 'View' },
        { role: 'Safety Officer', fleet: 'View', drivers: '✓', trips: 'View', fuel: '–', analytics: '–' },
        { role: 'Financial Analyst', fleet: 'View', drivers: '–', trips: 'View', fuel: '✓', analytics: '✓' },
    ];

    useEffect(() => {
        api.get('/settings').then(res => {
            setSettings(res.data);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        try {
            await api.post('/settings', settings);
            alert("Settings saved!");
        } catch (e) {
            alert("Error saving settings (Check permissions)");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">8. Settings & RBAC</h1>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: General Settings */}
                <div className="w-full lg:w-1/3 sketch-border bg-panelbg p-6">
                    <h2 className="sketch-font text-xl mb-4">General</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Depot Name</label>
                            <input value={settings.depot_name} onChange={e=>setSettings({...settings, depot_name: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Currency</label>
                            <input value={settings.currency} onChange={e=>setSettings({...settings, currency: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Distance Unit</label>
                            <select value={settings.distance_unit} onChange={e=>setSettings({...settings, distance_unit: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600">
                                <option value="km">Kilometers (km)</option>
                                <option value="mi">Miles (mi)</option>
                            </select>
                        </div>
                        <button onClick={handleSave} className="w-full py-2 bg-blue-600 text-white font-bold mt-4 sketch-border">Save changes</button>
                    </div>
                </div>

                {/* Right: RBAC Matrix */}
                <div className="w-full lg:w-2/3">
                    <h2 className="sketch-font text-xl mb-4">Role-Based Access (RBAC)</h2>
                    <table className="w-full text-left text-sm bg-panelbg sketch-border">
                        <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                            <tr>
                                <th className="py-2 px-4">Role</th>
                                <th>Fleet</th>
                                <th>Drivers</th>
                                <th>Trips</th>
                                <th>Fuel/Exp.</th>
                                <th>Analytics</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matrix.map((row, i) => (
                                <tr key={i} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-3 px-4 font-bold">{row.role}</td>
                                    <td className={row.fleet === 'View' || row.fleet === '–' ? 'text-gray-500' : 'text-green-500 font-bold'}>{row.fleet}</td>
                                    <td className={row.drivers === 'View' || row.drivers === '–' ? 'text-gray-500' : 'text-green-500 font-bold'}>{row.drivers}</td>
                                    <td className={row.trips === 'View' || row.trips === '–' ? 'text-gray-500' : 'text-green-500 font-bold'}>{row.trips}</td>
                                    <td className={row.fuel === 'View' || row.fuel === '–' ? 'text-gray-500' : 'text-green-500 font-bold'}>{row.fuel}</td>
                                    <td className={row.analytics === 'View' || row.analytics === '–' ? 'text-gray-500' : 'text-green-500 font-bold'}>{row.analytics}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

window.AppComponents.Settings = Settings;
