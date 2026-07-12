const { useState, useEffect } = React;
const { api, StatusPill } = window.AppComponents;

const Maintenance = () => {
    const [logs, setLogs] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [form, setForm] = useState({ vehicle_id: '', service_type: '', cost: '', date: new Date().toISOString().split('T')[0], status: 'Active' });

    const fetchAll = () => {
        api.get('/maintenance').then(res => setLogs(res.data));
        api.get('/vehicles').then(res => setVehicles(res.data));
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleSave = async () => {
        try {
            await api.post('/maintenance', {
                ...form,
                vehicle_id: parseInt(form.vehicle_id),
                cost: parseFloat(form.cost)
            });
            setForm({ vehicle_id: '', service_type: '', cost: '', date: new Date().toISOString().split('T')[0], status: 'Active' });
            fetchAll();
        } catch (e) {
            alert("Error creating maintenance log");
        }
    };

    const handleClose = async (id) => {
        try {
            await api.post(`/maintenance/${id}/close`);
            fetchAll();
        } catch (e) {
            alert("Error closing log");
        }
    };

    const availableVehicles = vehicles.filter(v => v.status === 'Available');

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">5. Maintenance</h1>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Form */}
                <div className="w-full lg:w-1/3 sketch-border bg-panelbg p-6">
                    <h2 className="sketch-font text-xl mb-4">Log Service Record</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Vehicle</label>
                            <select value={form.vehicle_id} onChange={e=>setForm({...form, vehicle_id: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none">
                                <option value="">Select Vehicle</option>
                                {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.reg_no}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Service Type</label>
                            <input value={form.service_type} onChange={e=>setForm({...form, service_type: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Cost ($)</label>
                            <input type="number" value={form.cost} onChange={e=>setForm({...form, cost: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Date</label>
                            <input type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none" />
                        </div>
                        <button onClick={handleSave} className="w-full py-2 bg-amber-600 text-black font-bold mt-4">Save</button>
                    </div>

                    <div className="mt-8 border-t border-[#333] pt-4">
                        <div className="flex justify-between items-center text-sm font-bold sketch-font mb-2">
                            <span className="text-green-500">Available</span>
                            <span className="text-xs text-gray-400 font-mono">-(creating active record)→</span>
                            <span className="text-amber-500">In Shop</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold sketch-font">
                            <span className="text-amber-500">In Shop</span>
                            <span className="text-xs text-gray-400 font-mono">-(closing record)→</span>
                            <span className="text-green-500">Available</span>
                        </div>
                        <p className="text-amber-500 italic text-xs mt-4">Note: In Shop vehicles are removed from the dispatch pool.</p>
                    </div>
                </div>

                {/* Right: Table */}
                <div className="w-full lg:w-2/3">
                    <h2 className="sketch-font text-xl mb-4">Service Log</h2>
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                            <tr>
                                <th className="py-2">Vehicle</th>
                                <th>Service</th>
                                <th>Cost</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => {
                                const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                                return (
                                    <tr key={log.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                        <td className="py-3 font-bold font-mono">{vehicle?.reg_no}</td>
                                        <td>{log.service_type}</td>
                                        <td>${log.cost}</td>
                                        <td>{log.date}</td>
                                        <td><StatusPill status={log.status} /></td>
                                        <td>
                                            {log.status === 'Active' && (
                                                <button onClick={() => handleClose(log.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Close</button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

window.AppComponents.Maintenance = Maintenance;
