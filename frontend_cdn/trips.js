const { useState, useEffect } = React;
const { api, StatusPill } = window.AppComponents;

const Trips = () => {
    const [trips, setTrips] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);
    
    const [form, setForm] = useState({ source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight_kg: '', planned_distance_km: '' });
    const [validationError, setValidationError] = useState('');
    const [isCompleteModalOpen, setCompleteModalOpen] = useState(null);
    const [completeForm, setCompleteForm] = useState({ final_odometer: '', fuel_consumed: '' });

    const fetchAll = () => {
        api.get('/trips').then(res => setTrips(res.data));
        api.get('/vehicles').then(res => setVehicles(res.data));
        api.get('/drivers').then(res => setDrivers(res.data));
    };

    useEffect(() => {
        fetchAll();
    }, []);

    // Live validation
    useEffect(() => {
        if (form.vehicle_id && form.cargo_weight_kg) {
            const v = vehicles.find(x => x.id == form.vehicle_id);
            if (v && parseFloat(form.cargo_weight_kg) > v.max_load_capacity_kg) {
                setValidationError(`✗ Capacity exceeded by ${parseFloat(form.cargo_weight_kg) - v.max_load_capacity_kg} kg — dispatch blocked`);
            } else {
                setValidationError('');
            }
        } else {
            setValidationError('');
        }
    }, [form.vehicle_id, form.cargo_weight_kg]);

    const handleDispatch = async () => {
        try {
            await api.post('/trips', {
                ...form,
                vehicle_id: parseInt(form.vehicle_id),
                driver_id: parseInt(form.driver_id),
                cargo_weight_kg: parseFloat(form.cargo_weight_kg),
                planned_distance_km: parseFloat(form.planned_distance_km)
            });
            setForm({ source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight_kg: '', planned_distance_km: '' });
            fetchAll();
        } catch (e) {
            alert(e.response?.data?.detail || "Error creating trip");
        }
    };

    const handleComplete = async () => {
        try {
            await api.post(`/trips/${isCompleteModalOpen.id}/complete`, {
                final_odometer: parseFloat(completeForm.final_odometer),
                fuel_consumed: parseFloat(completeForm.fuel_consumed)
            });
            setCompleteModalOpen(null);
            setCompleteForm({ final_odometer: '', fuel_consumed: '' });
            fetchAll();
        } catch (e) {
            alert("Error completing trip");
        }
    };

    const handleCancel = async (id) => {
        try {
            await api.post(`/trips/${id}/cancel`);
            fetchAll();
        } catch (e) {
            alert("Error cancelling");
        }
    };

    const availableVehicles = vehicles.filter(v => v.status === 'Available');
    const availableDrivers = drivers.filter(d => d.status === 'Available' && new Date(d.license_expiry) >= new Date());

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">4. Trip Dispatcher</h1>
            
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Create Trip */}
                <div className="w-full lg:w-1/3 sketch-border bg-panelbg p-6">
                    <div className="flex items-center justify-between text-xs uppercase mb-6 text-gray-500 font-bold">
                        <span className="text-amber-500">Draft</span><span>→</span>
                        <span>Dispatched</span><span>→</span>
                        <span>Completed</span>
                    </div>

                    <div className="space-y-4">
                        <input placeholder="Source" value={form.source} onChange={e=>setForm({...form, source:e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none" />
                        <input placeholder="Destination" value={form.destination} onChange={e=>setForm({...form, destination:e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none" />
                        
                        <select value={form.vehicle_id} onChange={e=>setForm({...form, vehicle_id:e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none">
                            <option value="">Select Vehicle (Available only)</option>
                            {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.reg_no} ({v.max_load_capacity_kg}kg max)</option>)}
                        </select>
                        
                        <select value={form.driver_id} onChange={e=>setForm({...form, driver_id:e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none">
                            <option value="">Select Driver (Eligible only)</option>
                            {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        
                        <input type="number" placeholder="Cargo Weight (kg)" value={form.cargo_weight_kg} onChange={e=>setForm({...form, cargo_weight_kg:e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none" />
                        <input type="number" placeholder="Planned Distance (km)" value={form.planned_distance_km} onChange={e=>setForm({...form, planned_distance_km:e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none" />

                        {validationError && (
                            <div className="border border-red-500 bg-red-500/10 p-3 text-red-500 text-sm">
                                {validationError}
                            </div>
                        )}

                        <div className="flex space-x-2 pt-4">
                            <button onClick={()=>setForm({source:'', destination:'', vehicle_id:'', driver_id:'', cargo_weight_kg:'', planned_distance_km:''})} className="flex-1 py-2 sketch-border text-gray-300">Clear</button>
                            <button 
                                onClick={handleDispatch} 
                                disabled={!!validationError || !form.vehicle_id || !form.driver_id || !form.cargo_weight_kg} 
                                className="flex-1 py-2 bg-amber-600 text-black font-bold disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                                Dispatch
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Live Board */}
                <div className="w-full lg:w-2/3">
                    <h2 className="sketch-font text-xl mb-4">Live Board</h2>
                    <div className="space-y-3">
                        {trips.length === 0 && <div className="text-gray-500 italic">No trips yet.</div>}
                        {trips.map(trip => {
                            const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
                            const driver = drivers.find(d => d.id === trip.driver_id);
                            return (
                                <div key={trip.id} className="sketch-border bg-panelbg p-4 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-lg">{trip.trip_code}</div>
                                        <div className="text-sm text-gray-400">{trip.source} → {trip.destination}</div>
                                        <div className="mt-2"><StatusPill status={trip.status} /></div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono text-gray-300">{vehicle?.reg_no || 'Unassigned'} / {driver?.name || 'Awaiting driver'}</div>
                                        <div className="text-xs text-amber-500 mt-1">ETA: 2h 15m</div>
                                        {trip.status === 'Dispatched' && (
                                            <div className="mt-2 space-x-2">
                                                <button onClick={() => setCompleteModalOpen(trip)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Complete</button>
                                                <button onClick={() => handleCancel(trip.id)} className="text-xs border border-red-500 text-red-500 px-2 py-1 rounded">Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <p className="italic text-xs text-gray-500 mt-4">On Complete: odometer → fuel log → expenses → Vehicle & Driver Available.</p>
                </div>
            </div>

            {/* Complete Trip Modal */}
            {isCompleteModalOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-panelbg sketch-border p-6 w-96">
                        <h2 className="sketch-font text-xl mb-4">Complete Trip: {isCompleteModalOpen.trip_code}</h2>
                        <div className="space-y-3">
                            <input type="number" placeholder="Final Odometer Reading" value={completeForm.final_odometer} onChange={e=>setCompleteForm({...completeForm, final_odometer: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-blue-600" />
                            <input type="number" placeholder="Fuel Consumed (Liters)" value={completeForm.fuel_consumed} onChange={e=>setCompleteForm({...completeForm, fuel_consumed: e.target.value})} className="w-full bg-darkbg sketch-border p-2 outline-none focus:border-blue-600" />
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button onClick={()=>setCompleteModalOpen(null)} className="px-4 py-2 sketch-border text-gray-300">Cancel</button>
                            <button onClick={handleComplete} className="px-4 py-2 bg-blue-600 text-white font-bold">Complete Trip</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.AppComponents.Trips = Trips;
