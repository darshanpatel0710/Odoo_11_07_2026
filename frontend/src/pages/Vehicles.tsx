import React, { useState, useEffect, useContext } from 'react';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';
import { StatusPill } from '../components/Shared';

export const Vehicles = () => {
    const { sym, user } = useContext(AuthContext);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ reg_no: '', name: '', type: 'Van', max_load_capacity_kg: '', acquisition_cost: '', status: 'Available' });

    const fetchAll = () => {
        api.get('/vehicles').then(res => setVehicles(res.data));
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const openAdd = () => {
        setEditId(null);
        setForm({ reg_no: '', name: '', type: 'Van', max_load_capacity_kg: '', acquisition_cost: '', status: 'Available' });
        setShowModal(true);
    };

    const openEdit = (v: any) => {
        setEditId(v.id);
        setForm({ reg_no: v.reg_no, name: v.name, type: v.type, max_load_capacity_kg: v.max_load_capacity_kg, acquisition_cost: v.acquisition_cost, status: v.status });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const data = {
                ...form,
                max_load_capacity_kg: parseFloat(form.max_load_capacity_kg),
                acquisition_cost: parseFloat(form.acquisition_cost)
            };
            if (editId) {
                await api.put(`/vehicles/${editId}`, data);
            } else {
                await api.post('/vehicles', data);
            }
            setShowModal(false);
            fetchAll();
        } catch (e: any) {
            alert(e.response?.data?.detail || "Error saving vehicle");
        }
    };

    const filtered = vehicles.filter(v => v.reg_no.toLowerCase().includes(search.toLowerCase()) || v.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">2. Fleet Registry</h1>
            
            <div className="flex justify-between mb-6">
                <input type="text" placeholder="Search fleet..." value={search} onChange={e=>setSearch(e.target.value)} className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm w-64" />
                {user?.role === 'Fleet Manager' && (
                    <button onClick={openAdd} className="bg-amber-600 text-black px-4 py-1 sketch-font font-bold rounded">+ Add Vehicle</button>
                )}
            </div>

            <table className="w-full text-left text-sm">
                <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                    <tr>
                        <th className="py-2">Reg No.</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Capacity</th>
                        <th>Odometer</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(v => (
                        <tr key={v.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                            <td className="py-3 font-bold">{v.reg_no}</td>
                            <td>{v.name}</td>
                            <td>{v.type}</td>
                            <td>{v.max_load_capacity_kg} kg</td>
                            <td className="font-mono">{v.odometer || 0} km</td>
                            <td><StatusPill status={v.status} /></td>
                            <td>
                                {user?.role === 'Fleet Manager' && (
                                    <button onClick={() => openEdit(v)} className="text-xs text-amber-500 hover:underline">Edit</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-panelbg sketch-border p-6 w-96">
                        <h2 className="sketch-font text-xl mb-4">Add Vehicle</h2>
                        <div className="space-y-3">
                            <input placeholder="Reg No. (e.g. TRK-01)" value={form.reg_no} onChange={e=>setForm({...form, reg_no: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <input placeholder="Name/Model" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600">
                                <option>Van</option>
                                <option>Truck</option>
                                <option>Semi-Trailer</option>
                            </select>
                            <input type="number" placeholder="Max Load (kg)" value={form.max_load_capacity_kg} onChange={e=>setForm({...form, max_load_capacity_kg: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
                            <label className="block text-sm text-gray-400 mb-1">Acquisition Cost ({sym})</label>
                            <input type="number" placeholder={`Acquisition Cost (${sym})`} value={form.acquisition_cost} onChange={e=>setForm({...form, acquisition_cost: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-amber-600" />
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
