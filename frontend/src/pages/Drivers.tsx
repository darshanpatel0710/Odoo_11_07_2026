import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { StatusPill } from '../components/Shared';

export const Drivers = () => {
    const { user } = useContext(AuthContext);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ name: '', license_no: '', license_category: '', license_expiry: '', contact: '', status: 'Available', safety_score: 100 });

    const fetchAll = () => {
        api.get('/drivers').then(res => setDrivers(res.data));
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const openAdd = () => {
        setEditId(null);
        setForm({ name: '', license_no: '', license_category: '', license_expiry: '', contact: '', status: 'Available', safety_score: 100 });
        setShowModal(true);
    };

    const openEdit = (d: any) => {
        setEditId(d.id);
        setForm({ name: d.name, license_no: d.license_no, license_category: d.license_category, license_expiry: d.license_expiry, contact: d.contact, status: d.status, safety_score: d.safety_score });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const data = {
                ...form,
                safety_score: typeof form.safety_score === 'string' ? parseFloat(form.safety_score) : form.safety_score
            };
            if (editId) {
                await api.put(`/drivers/${editId}`, data);
            } else {
                await api.post('/drivers', data);
            }
            setShowModal(false);
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.detail || "Error saving driver");
        }
    };

    const isExpired = (dateString: string) => new Date(dateString) < new Date();

    const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.license_no.includes(search));
    
    const expiredCount = drivers.filter(d => isExpired(d.license_expiry)).length;
    const lowScoreCount = drivers.filter(d => d.safety_score < 80).length;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold sketch-font text-white mb-2">Drivers</h1>
                    <p className="text-gray-400">Total active drivers: {drivers.filter(d => d.status === 'Active').length}</p>
                </div>
                {(user?.role === 'Fleet Manager') && (
                    <button onClick={()=>{setForm({ name: '', license_no: '', license_category: 'CDL-A', license_expiry: new Date().toISOString().split('T')[0], contact: '', status: 'Available', safety_score: 100 }); setEditId(null); setShowModal(true)}} className="bg-[#1a1a1a] sketch-border px-4 py-2 text-white hover:bg-[#333]">
                        + Add Driver
                    </button>
                )}
            </div>

            {(user?.role === 'Safety Officer' || user?.role === 'Fleet Manager') && (expiredCount > 0 || lowScoreCount > 0) && (
                <div className="mb-6 p-4 border-l-4 border-red-500 bg-red-900/20 sketch-border flex space-x-8">
                    {expiredCount > 0 && (
                        <div>
                            <span className="block text-red-400 text-sm font-bold uppercase mb-1">Compliance Alert</span>
                            <span className="text-xl sketch-font text-white">{expiredCount} driver(s) have expired licenses</span>
                        </div>
                    )}
                    {lowScoreCount > 0 && (
                        <div>
                            <span className="block text-amber-500 text-sm font-bold uppercase mb-1">Safety Warning</span>
                            <span className="text-xl sketch-font text-white">{lowScoreCount} driver(s) with safety score &lt; 80</span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex justify-between mb-6">
                <input type="text" placeholder="Search drivers..." value={search} onChange={e=>setSearch(e.target.value)} className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm w-64" />
            </div>

            <table className="w-full text-left text-sm">
                <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                    <tr>
                        <th className="py-2">Driver</th>
                        <th>Login ID</th>
                        <th>License No.</th>
                        <th>Category</th>
                        <th>Expiry</th>
                        <th>Contact</th>
                        <th>Safety</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(d => (
                        <tr key={d.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                            <td className="py-3 font-bold">{d.name}</td>
                            <td className="text-amber-500 font-mono text-xs">driver{d.id}@transitops.com</td>
                            <td>{d.license_no}</td>
                            <td>{d.license_category}</td>
                            <td className={isExpired(d.license_expiry) ? 'text-red-500 font-bold' : ''}>{d.license_expiry?.split('T')[0]}</td>
                            <td>{d.contact?.replace(/.(?=.{4})/g, 'x')}</td>
                            <td><StatusPill status={`${d.safety_score}%`} /></td>
                            <td><StatusPill status={d.status || 'Available'} /></td>
                            <td>
                                {(user?.role === 'Fleet Manager' || user?.role === 'Safety Officer') && (
                                    <button onClick={() => openEdit(d)} className="text-xs text-amber-500 hover:underline">Edit</button>
                                )}
                            </td>
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
                        <h2 className="sketch-font text-xl mb-4">{editId ? 'Edit Driver' : 'Add Driver'}</h2>
                        <div className="space-y-3">
                            <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input placeholder="License No." value={form.license_no} onChange={e=>setForm({...form, license_no: e.target.value})} className="w-full bg-darkbg sketch-border p-2 focus:border-amber-600 outline-none" />
                            <input placeholder="Category (e.g., C, CE)" value={form.license_category} onChange={e=>setForm({...form, license_category: e.target.value})} className="w-full bg-darkbg sketch-border p-2 focus:border-amber-600 outline-none" />
                            <input type="date" value={form.license_expiry.split('T')[0]} onChange={e => {
                                try {
                                    if (e.target.value) {
                                        setForm({...form, license_expiry: new Date(e.target.value).toISOString()});
                                    }
                                } catch(err) {}
                            }} className="w-full bg-darkbg sketch-border p-2 focus:border-amber-600 outline-none text-white" />
                            <input placeholder="Contact" value={form.contact} onChange={e=>setForm({...form, contact: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
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
