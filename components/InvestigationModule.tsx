"use client";

import { useEffect, useState } from "react";
import { Authentication, Fleet } from "@formant/data-sdk";

const THEOPOLIS_API = "https://theopolis.formant.io/api";

interface DeviceState {
  id: string;
  name: string;
}

interface TaskFlow {
  id: string;
  name: string;
}

export default function InvestigationModule() {
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [taskFlows, setTaskFlows] = useState<TaskFlow[]>([]);
  const [selectedTaskFlowId, setSelectedTaskFlowId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const email = process.env.NEXT_PUBLIC_FORMANT_EMAIL;
        const password = process.env.NEXT_PUBLIC_FORMANT_PASSWORD;

        if (email && password) {
          await Authentication.login(email, password);
          setIsStandalone(true);

          const allDevices = await Fleet.getDevices();
          const deviceList = allDevices.map((d) => ({
            id: d.id,
            name: d.name || d.id,
          }));
          setDevices(deviceList);

          if (deviceList.length > 0) {
            setDevice(deviceList[0]);
          } else {
            setError("No devices found in this organization.");
          }
        } else {
          await Authentication.waitTilAuthenticated();

          const currentDevice = await Fleet.getCurrentDevice();
          if (currentDevice) {
            setDevice({
              id: currentDevice.id,
              name: currentDevice.name || currentDevice.id,
            });
          } else {
            setError("No device found in this view context.");
          }
        }

        setToken(Authentication.token ?? null);

        // Fetch taskflows
        const taskFlowRes = await fetch(`${THEOPOLIS_API}/taskflows`, {
          headers: {
            Authorization: `Bearer ${Authentication.token}`,
          },
        });

        if (taskFlowRes.ok) {
          const data = await taskFlowRes.json();
          const items: TaskFlow[] = (data.items || []).map(
            (tf: { id: string; name: string }) => ({
              id: tf.id,
              name: tf.name,
            })
          );
          setTaskFlows(items);
          if (items.length > 0) {
            setSelectedTaskFlowId(items[0].id);
          }
        } else {
          console.error("Failed to fetch taskflows:", await taskFlowRes.text());
        }
      } catch (err) {
        console.error("Failed to initialize:", err);
        setError("Failed to authenticate or retrieve device.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleStartInvestigation = async () => {
    if (!device || !selectedTaskFlowId || !token) return;

    setTriggering(true);
    setTriggerResult(null);

    try {
      const now = new Date().toISOString();
      const input = `Device: ${device.name} (${device.id}) | Time: ${now}`;

      const res = await fetch(
        `${THEOPOLIS_API}/taskflows/${selectedTaskFlowId}/trigger`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ input }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setTriggerResult(
          `Investigation started (run: ${data.taskFlowRunId})`
        );
      } else {
        const errText = await res.text();
        setTriggerResult(`Failed: ${errText}`);
      }
    } catch (err) {
      console.error("Failed to trigger investigation:", err);
      setTriggerResult("Failed to start investigation.");
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-gray-400 animate-pulse">
          Connecting to Formant...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (!device) return null;

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-white">
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-lg font-semibold">Investigation Module</h2>

        {/* Device info */}
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 space-y-2 text-sm">
          {isStandalone && devices.length > 1 ? (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Device</label>
              <select
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                value={device.id}
                onChange={(e) => {
                  const selected = devices.find(
                    (d) => d.id === e.target.value
                  );
                  if (selected) setDevice(selected);
                }}
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <span className="text-gray-400">Device: </span>
              <span className="font-medium">{device.name}</span>
            </div>
          )}
          <div>
            <span className="text-gray-400">ID: </span>
            <span className="font-mono text-xs">{device.id}</span>
          </div>
        </div>

        {/* Taskflow picker */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Taskflow</label>
          {taskFlows.length > 0 ? (
            <select
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
              value={selectedTaskFlowId}
              onChange={(e) => setSelectedTaskFlowId(e.target.value)}
              disabled={triggering}
            >
              {taskFlows.map((tf) => (
                <option key={tf.id} value={tf.id}>
                  {tf.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-500">No taskflows available</div>
          )}
        </div>

        {/* Trigger button */}
        <button
          onClick={handleStartInvestigation}
          disabled={triggering || !selectedTaskFlowId}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded px-4 py-2.5 transition-colors"
        >
          {triggering ? "Starting..." : "Start Investigation"}
        </button>

        {/* Result */}
        {triggerResult && (
          <div
            className={`text-sm rounded p-3 ${
              triggerResult.startsWith("Failed")
                ? "bg-red-900/30 text-red-400 border border-red-800"
                : "bg-green-900/30 text-green-400 border border-green-800"
            }`}
          >
            {triggerResult}
          </div>
        )}
      </div>
    </div>
  );
}
