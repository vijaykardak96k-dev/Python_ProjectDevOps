import { useEffect, useState } from "react";

import API_URL from "./config";
function App() {
  const [crops, setCrops] = useState([]);
  const [dashboard, setDashboard] = useState({
    total: 0,
    readyToHarvest: 0,
    needsWater: 0,
    needsFertilizer: 0,
    growing: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [cropsResponse, dashboardResponse] = await Promise.all([
        fetch(`${API_URL}/api/crops`),
        fetch(`${API_URL}/api/dashboard`),
      ]);

      if (!cropsResponse.ok || !dashboardResponse.ok) {
        throw new Error("Failed to connect to backend");
      }

      const cropsData = await cropsResponse.json();
      const dashboardData = await dashboardResponse.json();

      setCrops(cropsData);
      setDashboard(dashboardData);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not connect to Smart Farm backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCrops = crops.filter((crop) => {
    const matchesSearch =
      crop.name.toLowerCase().includes(search.toLowerCase()) ||
      crop.field.toLowerCase().includes(search.toLowerCase());

    let matchesFilter = true;

    if (filter === "Harvest") {
      matchesFilter = crop.status === "Ready to Harvest";
    }

    if (filter === "Water") {
      matchesFilter = crop.waterStatus === "Needs Water";
    }

    if (filter === "Fertilizer") {
      matchesFilter = crop.fertilizerStatus === "Needs Fertilizer";
    }

    if (filter === "Growing") {
      matchesFilter = crop.status === "Growing";
    }

    return matchesSearch && matchesFilter;
  });

  const statusColor = (status) => {
    if (status === "Ready to Harvest") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }

    if (status === "Needs Water") {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }

    if (status === "Needs Fertilizer") {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }

    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-xl">
              🌾
            </div>

            <div>
              <h1 className="font-bold text-lg">
                Smart Farm
              </h1>

              <p className="text-xs text-slate-500">
                Farm Management System
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-72">
            <input
              type="text"
              placeholder="Search crop or field..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold">
            Farm Dashboard
          </h2>

          <p className="text-slate-400 mt-1">
            Monitor crops, water, fertilizer and harvesting.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

          <StatCard
            title="Total Crops"
            value={dashboard.total}
            icon="🌱"
          />

          <StatCard
            title="Growing"
            value={dashboard.growing}
            icon="🌿"
          />

          <StatCard
            title="Ready Harvest"
            value={dashboard.readyToHarvest}
            icon="🌾"
          />

          <StatCard
            title="Need Water"
            value={dashboard.needsWater}
            icon="💧"
          />

          <StatCard
            title="Need Fertilizer"
            value={dashboard.needsFertilizer}
            icon="🧪"
          />

        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">

          {[
            "All",
            "Growing",
            "Harvest",
            "Water",
            "Fertilizer",
          ].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === item
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}

        </div>

        {/* Crops */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            Loading farm data...
          </div>
        ) : filteredCrops.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No crops found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {filteredCrops.map((crop) => (
              <div
                key={crop._id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-700 transition"
              >

                {/* Crop title */}
                <div className="flex items-start justify-between gap-3 mb-5">

                  <div>
                    <h3 className="text-xl font-bold">
                      {crop.name}
                    </h3>

                    <p className="text-sm text-slate-500">
                      📍 {crop.field}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap ${statusColor(
                      crop.status
                    )}`}
                  >
                    {crop.status}
                  </span>

                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-5">

                  <div>
                    <p className="text-slate-500 text-xs">
                      Area
                    </p>
                    <p className="font-semibold">
                      {crop.area} acres
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500 text-xs">
                      Harvest
                    </p>
                    <p className="font-semibold">
                      {new Date(
                        crop.expectedHarvestDate
                      ).toLocaleDateString()}
                    </p>
                  </div>

                </div>

                {/* Water */}
                <div className="flex items-center justify-between border-t border-slate-800 py-3">

                  <span className="text-sm text-slate-400">
                    💧 Water
                  </span>

                  <span
                    className={`text-xs font-semibold ${
                      crop.waterStatus === "Needs Water"
                        ? "text-blue-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {crop.waterStatus}
                  </span>

                </div>

                {/* Fertilizer */}
                <div className="flex items-center justify-between border-t border-slate-800 py-3">

                  <span className="text-sm text-slate-400">
                    🧪 Fertilizer
                  </span>

                  <span
                    className={`text-xs font-semibold ${
                      crop.fertilizerStatus === "Needs Fertilizer"
                        ? "text-purple-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {crop.fertilizerStatus}
                  </span>

                </div>

                {/* Notes */}
                <div className="mt-3 rounded-xl bg-slate-950 p-3">
                  <p className="text-xs text-slate-500">
                    Notes
                  </p>

                  <p className="text-sm text-slate-300 mt-1">
                    {crop.notes || "No notes"}
                  </p>
                </div>

              </div>
            ))}

          </div>
        )}

      </main>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">
          {icon}
        </span>

        <span className="text-3xl font-bold text-white">
          {value}
        </span>
      </div>

      <p className="text-xs uppercase tracking-wider text-slate-500 mt-3">
        {title}
      </p>
    </div>
  );
}

export default App;
