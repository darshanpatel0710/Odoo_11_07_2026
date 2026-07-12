const { useState, useEffect } = React;
const { api, StatusPill } = window.AppComponents;

const FuelExpenses = () => {
    const [fuelLogs, setFuelLogs] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [trips, setTrips] = useState([]);

    const fetchAll = () => {
        api.get('/fuel').then(res => setFuelLogs(res.data));
        api.get('/expenses').then(res => setExpenses(res.data));
        api.get('/vehicles').then(res => setVehicles(res.data));
        api.get('/trips').then(res => setTrips(res.data));
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const totalFuel = fuelLogs.reduce((acc, f) => acc + f.cost, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.total, 0);
    const totalOpCost = totalFuel + totalExpenses;

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">6. Fuel & Expense Management</h1>
            
            {/* Fuel Logs */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="sketch-font text-xl">Fuel Logs</h2>
                    <div className="space-x-2">
                        <button className="bg-amber-600 text-black px-4 py-1 sketch-font font-bold rounded">+ Log Fuel</button>
                    </div>
                </div>
                <table className="w-full text-left text-sm bg-panelbg sketch-border">
                    <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                        <tr>
                            <th className="py-2 px-4">Vehicle</th>
                            <th>Date</th>
                            <th>Liters</th>
                            <th>Fuel Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fuelLogs.map(log => {
                            const vehicle = vehicles.find(v => v.id === log.vehicle_id);
                            return (
                                <tr key={log.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-3 px-4 font-bold font-mono">{vehicle?.reg_no}</td>
                                    <td>{log.date}</td>
                                    <td>{log.liters} L</td>
                                    <td>${log.cost.toFixed(2)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Other Expenses */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="sketch-font text-xl">Other Expenses (Toll/Misc)</h2>
                    <button className="bg-amber-600 text-black px-4 py-1 sketch-font font-bold rounded">+ Add Expense</button>
                </div>
                <table className="w-full text-left text-sm bg-panelbg sketch-border">
                    <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                        <tr>
                            <th className="py-2 px-4">Trip</th>
                            <th>Vehicle</th>
                            <th>Toll</th>
                            <th>Other</th>
                            <th>Maint. (Linked)</th>
                            <th>Total</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map(exp => {
                            const trip = trips.find(t => t.id === exp.trip_id);
                            const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
                            return (
                                <tr key={exp.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-3 px-4 font-bold">{trip?.trip_code || '-'}</td>
                                    <td className="font-mono">{vehicle?.reg_no}</td>
                                    <td>${exp.toll}</td>
                                    <td>${exp.other}</td>
                                    <td>${exp.maintenance_linked_cost}</td>
                                    <td className="font-bold text-amber-500">${exp.total}</td>
                                    <td><StatusPill status={exp.status} /></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <hr className="border-[#333] mb-6" />
            <div className="flex justify-end text-xl">
                <span className="font-bold text-gray-300 mr-4">Total Operational Cost (auto) = Fuel + Maint. = </span>
                <span className="font-bold text-amber-500">${totalOpCost.toFixed(2)}</span>
            </div>
        </div>
    );
};

window.AppComponents.FuelExpenses = FuelExpenses;
