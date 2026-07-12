const { useState, useEffect } = React;
const { api, StatusPill } = window.AppComponents;

const Drivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', license_no: '', license_category: '', license_expiry: '', contact: '' });

    useEffect(() => {
        api.get('/drivers').then(res => setDrivers(res.data));
    }, []);

    const handleSave = async () => {
        try {
            const res = await api.post('/drivers', form);
            setDrivers([...drivers, res.data]);
            setShowModal(false);
        } catch (e) {
            alert("Error adding driver");
        }
    };

    const isExpired = (dateString) => new Date(dateString) < new Date();

    const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.license_no.includes(search));

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">3. Drivers & Safety Profiles</h1>
            
            <div className="flex justify-between mb-6">
                <input type="text" placeholder="Search drivers..." value={search} onChange={e=>setSearch(e.target.value)} className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm w-64" />
                <button onClick={() => setShowModal(true)} className="bg-amber-600 text-black px-4 py-1 sketch-font font-bold rounded">+ Add Driver</button>
            </div>

            <table className="w-full text-left text-sm">
                <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                    <tr>
                        <th className="py-2">Driver</th>
                        <th>License No.</th>
                        <th>Category</th>
                        <th>Expiry</th>
                        <th>Contact</th>
                        <th>Safety</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(d => (
                        <tr key={d.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                            <td className="py-3 font-bold">{d.name}</td>
                            <td>{d.license_no}</td>
                            <td>{d.license_category}</td>
                            <td className={isExpired(d.license_expiry) ? 'text-red-500 font-bold' : ''}>{d.license_expiry}</td>
                            <td>{d.contact.replace(/.(?=.{4})/g, 'x')}</td>
                            <td><StatusPill status={`${d.safety_score}%`} /></td>
                            <td><StatusPill status={d.status} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div className="mt-4 flex items-center space-x-2 text-xs text-gray-400">
                <span>Toggle Status (Mockup):</span>
                <button className="pill pill-Available">Available</button>
                <button className="pill pill-OnTrip">On Trip</button>
                <button className="pill pill-OffDuty">Off Duty</button>
                <button className="pill pill-Suspended">Suspended</button>
            </div>
            
            <p className="text-amber-500 italic text-xs mt-4">Note: Expired license or Suspended status blocks trip assignment.</p>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-panelbg sketch-border p-6 w-96">
                        <h2 className="sketch-font text-xl mb-4">Add Driver</h2>
                        <div className="space-y-3">
                            <input placeholder="Name" onChange={e=>setForm({...form, name: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input placeholder="License No." onChange={e=>setForm({...form, license_no: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input placeholder="Category (e.g., C, CE)" onChange={e=>setForm({...form, license_category: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input type="date" onChange={e=>setForm({...form, license_expiry: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600 text-gray-400" />
                            <input placeholder="Contact" onChange={e=>setForm({...form, contact: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
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

window.AppComponents.Drivers = Drivers;
