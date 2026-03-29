import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";

import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

const socket = io("http://localhost:5000");

function App() {
  const [nodes, setNodes] = useState([]);
  const [latencyData, setLatencyData] = useState([]);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    socket.on("update", (data) => {
      setNodes((prev) => [data, ...prev.slice(0, 24)]);
      setLatencyData((prev) => [...prev.slice(-19), data.latency]);
      setLabels((prev) => [...prev.slice(-19), data.node]);
    });

    return () => socket.disconnect();
  }, []);

  // 📊 LATENCY GRAPH
  const lineData = {
    labels: labels,
    datasets: [
      {
        label: "Latency (ms)",
        data: latencyData,
        borderColor: "#00ffcc",
        backgroundColor: "#00ffcc33",
      },
    ],
  };

  // 📊 THREAT DISTRIBUTION
  const threatCounts = {
    SAFE: 0,
    "SLEEPER MALWARE": 0,
    "ACTIVE ATTACK": 0,
    "SHADOW CONTROLLER": 0,
  };

  nodes.forEach((n) => {
    if (threatCounts[n.threat] !== undefined) {
      threatCounts[n.threat]++;
    }
  });

  const doughnutData = {
    labels: Object.keys(threatCounts),
    datasets: [
      {
        data: Object.values(threatCounts),
        backgroundColor: ["#00ffcc", "yellow", "orange", "red"],
      },
    ],
  };

  return (
    <div className="app">
      <h1>🛡️ AEGIS SENTINEL</h1>

      <div className="banner">
        LIVE THREAT MONITORING SYSTEM — AEGIS ACTIVE
      </div>

      {/* 📊 GRAPHS */}
      <div className="charts">
        <div className="chart-box">
          <h3>📡 Latency Monitor</h3>
          <Line data={lineData} />
        </div>

        <div className="chart-box">
          <h3>🚨 Threat Distribution</h3>
          <Doughnut data={doughnutData} />
        </div>
      </div>

      {/* 🖥️ NODE DISPLAY */}
      <div className="grid">
        {nodes.map((node, index) => (
          <div
            key={index}
            className={`card ${
              node.threat === "SHADOW CONTROLLER"
                ? "danger"
                : node.threat === "SLEEPER MALWARE"
                ? "warning"
                : node.threat === "ACTIVE ATTACK"
                ? "attack"
                : "safe"
            }`}
          >
            <h2>{node.node}</h2>
            <p>Status: {node.status}</p>
            <p>Latency: {node.latency} ms</p>
            <p>Schema: {node.schema}</p>
            <p>Serial: {node.serial}</p>
            <p className="threat">{node.threat}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
