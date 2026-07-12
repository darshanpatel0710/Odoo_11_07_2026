const { useState, useEffect } = React;
const { api, StatusPill } = window.AppComponents;

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ reg_no: '', name: '', type: 'Van', max_load_capacity_kg: '', odometer: '', acquisition_cost: '' });

    useEffect(() => {
        api.get('/vehicles').then(res => setVehicles(res.data));
    }, []);

    const handleSave = async () => {
        try {
            const res = await api.post('/vehicles', {
                ...form,
                max_load_capacity_kg: parseFloat(form.max_load_capacity_kg),
                odometer: parseFloat(form.odometer),
                acquisition_cost: parseFloat(form.acquisition_cost)
            });
            setVehicles([...vehicles, res.data]);
            setShowModal(false);
        } catch (e) {
            alert("Error adding vehicle (Check permissions)");
        }
    };

    const filtered = vehicles.filter(v => v.reg_no.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">2. Fleet (Vehicle Registry)</h1>
            
            <div className="flex justify-between mb-6">
                <div className="flex space-x-4">
                    <select className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm"><option>Type: All</option></select>
                    <select className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm"><option>Status: All</option></select>
                    <input type="text" placeholder="Search reg. no..." value={search} onChange={e=>setSearch(e.target.value)} className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm" />
                </div>
                <button onClick={() => setShowModal(true)} className="bg-amber-600 text-black px-4 py-1 sketch-font font-bold rounded">+ Add Vehicle</button>
            </div>

            <table className="w-full text-left text-sm">
                <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                    <tr>
                        <th className="py-2">Reg. No.</th>
                        <th>Name/Model</th>
                        <th>Type</th>
                        <th>Capacity (kg)</th>
                        <th>Odometer (km)</th>
                        <th>Acq. Cost</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(v => (
                        <tr key={v.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                            <td className="py-3 font-bold">{v.reg_no}</td>
                            <td>{v.name}</td>
                            <td>{v.type}</td>
                            <td>{v.max_load_capacity_kg}</td>
                            <td>{v.odometer}</td>
                            <td>${v.acquisition_cost}</td>
                            <td><StatusPill status={v.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <p className="text-amber-500 italic text-xs mt-4">Note: Registration numbers must be unique. Retired/In Shop vehicles are hidden from dispatch.</p>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-panelbg sketch-border p-6 w-96">
                        <h2 className="sketch-font text-xl mb-4">Add Vehicle</h2>
                        <div className="space-y-3">
                            <input placeholder="Reg No" onChange={e=>setForm({...form, reg_no: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input placeholder="Name/Model" onChange={e=>setForm({...form, name: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <select onChange={e=>setForm({...form, type: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600">
                                <option>Van</option>
                                <option>Truck</option>
                            </select>
                            <input type="number" placeholder="Max Capacity (kg)" onChange={e=>setForm({...form, max_load_capacity_kg: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input type="number" placeholder="Odometer" onChange={e=>setForm({...form, odometer: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input type="number" placeholder="Acquisition Cost" onChange={e=>setForm({...form, acquisition_cost: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={()=>setShowModal(false)} className="px-4 py-2 sketch-border text-gray-300">Cancel</button>
                            <button onClick={handleSave} className="px-4 py-2 bg-amber-600 text-black font-bold">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.AppComponents.Vehicles = Vehicles;
