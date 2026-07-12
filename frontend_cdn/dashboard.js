const { useState, useEffect } = React;
const { api, Card, StatusPill } = window.AppComponents;

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        api.get('/dashboard').then(res => {
            setData(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div>Loading...</div>;

    const { kpis, recent_trips, vehicle_status } = data;

    return (
        <div>
            <h1 className="text-2xl sketch-font font-bold mb-6">1. Dashboard</h1>
            
            <div className="flex space-x-4 mb-8">
                <select className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm"><option>Vehicle Type: All</option></select>
                <select className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm"><option>Status: All</option></select>
                <select className="bg-panelbg sketch-border px-3 py-1 outline-none text-sm"><option>Region: All</option></select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <Card title="Active Vehicles" value={kpis.active_vehicles} colorClass="border-blue-500" />
                <Card title="Available Vehicles" value={kpis.available_vehicles} colorClass="border-green-500" />
                <Card title="In Maintenance" value={kpis.in_maintenance} colorClass="border-amber-500" />
                <Card title="Active Trips" value={kpis.active_trips} colorClass="border-blue-400" />
                <Card title="Pending Trips" value={kpis.pending_trips} colorClass="border-gray-400" />
                <Card title="Drivers on Duty" value={kpis.drivers_on_duty} colorClass="border-purple-500" />
                <Card title="Utilization (%)" value={`${kpis.utilization}%`} colorClass="border-pink-500" />
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-grow">
                    <h2 className="sketch-font text-xl mb-4">Recent Trips</h2>
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-400 uppercase text-xs border-b border-[#333]">
                            <tr>
                                <th className="py-2">Trip</th>
                                <th>Vehicle</th>
                                <th>Driver</th>
                                <th>Status</th>
                                <th>ETA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent_trips.map(trip => (
                                <tr key={trip.id} className="border-b border-[#333] hover:bg-[#1f1f1f]">
                                    <td className="py-3 font-bold">{trip.trip_code}</td>
                                    <td>{trip.vehicle}</td>
                                    <td>{trip.driver}</td>
                                    <td><StatusPill status={trip.status} /></td>
                                    <td>{trip.eta}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="w-full lg:w-1/3 sketch-border bg-panelbg p-4">
                    <h2 className="sketch-font text-xl mb-4">Vehicle Status</h2>
                    <div className="space-y-4">
                        {Object.entries(vehicle_status).map(([status, count]) => {
                            const total = Object.values(vehicle_status).reduce((a, b) => a + b, 0);
                            const percent = total === 0 ? 0 : Math.round((count / total) * 100);
                            let color = 'bg-gray-500';
                            if (status === 'Available') color = 'bg-green-500';
                            if (status === 'On Trip') color = 'bg-blue-500';
                            if (status === 'In Shop') color = 'bg-amber-500';
                            if (status === 'Retired') color = 'bg-red-500';
                            
                            return (
                                <div key={status}>
                                    <div className="flex justify-between text-xs uppercase mb-1 text-gray-400">
                                        <span>{status}</span>
                                        <span>{count}</span>
                                    </div>
                                    <div className="w-full bg-darkbg h-3 rounded-full overflow-hidden">
                                        <div className={`h-full ${color}`} style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

window.AppComponents.Dashboard = Dashboard;
