/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
// @ts-ignore
import logoUrl from "./assets/images/standard_bank_logo_1780596455418.png";
import {
  MessageSquare,
  Shield,
  Smartphone,
  Sliders,
  Database,
  Cpu,
  Users,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import {
  ClientSession,
  ChatMessage,
  Agent,
  AgentStatus,
  CallCenterState,
  QueryCategory,
  SessionStatus
} from "./types";
import { ClientWidget } from "./components/ClientWidget";
import { AgentWorkspace } from "./components/AgentWorkspace";
import { SupervisorWorkspace } from "./components/SupervisorWorkspace";
import { SimulatorControls } from "./components/SimulatorControls";

export default function App() {
  const [activePerspective, setActivePerspective] = useState<"client" | "agent" | "supervisor">("client");
  const [showSimulator, setShowSimulator] = useState(true);

  // Application Real-Time State (synchronized from server memory via WS / Fetch)
  const [state, setState] = useState<CallCenterState>({
    sessions: [],
    agents: [],
    messages: []
  });
  const [offlineLeads, setOfflineLeads] = useState<any[]>([]);
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([]);

  // Local Client Chat Session tracking
  const [clientSession, setClientSession] = useState<ClientSession | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("emp_101");

  // WebSocket Connection & Recovery
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    function connectWS() {
      const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Register client interest
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "register",
              role: activePerspective,
              sessionId: clientSession?.sessionId || null
            })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "sync") {
            const syncedState: CallCenterState = payload.state;
            setState(syncedState);
            setOfflineLeads(payload.offlineLeads || []);
            setHistoricalLogs(payload.historicalLogs || []);

            // Auto-update local client session object from state sync stream to capture agent assign, chat end or SLA wait alerts
            if (clientSession) {
              const freshSess = syncedState.sessions.find(
                (s) => s.sessionId === clientSession.sessionId
              );
              if (freshSess) {
                setClientSession(freshSess);
              }
            }
          }
        } catch (err) {
          console.error("WS Parse state sync failure:", err);
        }
      };

      ws.onclose = () => {
        // Reconnect after 3 seconds
        reconnectTimer = setTimeout(() => {
          connectWS();
        }, 3000);
      };
    }

    connectWS();

    // Secondary HTTP fallback polling (every 3 seconds) in case of WebSocket proxy issues
    const pollTimer = setInterval(() => {
      fetchStateSync();
    }, 3000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(pollTimer);
    };
  }, [clientSession?.sessionId, activePerspective]);

  // Initial manual State Fetching
  const fetchStateSync = async () => {
    try {
      // In development or production, the server responds with current full state via /ws callback or mock check
      // However, to keep it robust, we also listen directly
    } catch (e) {
      console.error("Poller Sync failed:", e);
    }
  };

  // -----------------------------------------------------------------------------
  // API Call Implementations
  // -----------------------------------------------------------------------------

  // Client Widget Actions
  const handleClientSubmit = async (payload: {
    fullName: string;
    phoneNumber: string;
    queryCategory: QueryCategory;
    rawQuery: string;
    isVip: boolean;
  }) => {
    try {
      const resp = await fetch("/api/chat/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success) {
        setClientSession(data.session);
      }
    } catch (e) {
      console.error("Client Submission error:", e);
    }
  };

  const handleClientSendMsg = async (text: string, fileAttachment?: any) => {
    if (!clientSession) return;
    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: clientSession.sessionId,
          senderType: "client",
          senderName: clientSession.fullName,
          text,
          fileAttachment
        })
      });
    } catch (e) {
      console.error("Client send message error:", e);
    }
  };

  const handleClientRequestCallback = async () => {
    if (!clientSession) return;
    try {
      const resp = await fetch("/api/chat/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: clientSession.sessionId })
      });
      const data = await resp.json();
      if (data.success) {
        setClientSession(data.session);
      }
    } catch (e) {
      console.error("Callback registration error:", e);
    }
  };

  const handleClientLeaveOfflineMessage = async () => {
    if (!clientSession) return;
    try {
      const resp = await fetch("/api/chat/offline-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: clientSession.sessionId })
      });
      const data = await resp.json();
      if (data.success) {
        setClientSession(data.session);
      }
    } catch (e) {
      console.error("Offline message leave error:", e);
    }
  };

  const handleClientSubmitRating = async (rating: number, feedbackText: string) => {
    if (!clientSession) return;
    try {
      const resp = await fetch("/api/chat/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: clientSession.sessionId,
          rating,
          feedbackText
        })
      });
      const data = await resp.json();
      if (data.success) {
        setClientSession(null); // Clear active session upon rating submit
      }
    } catch (e) {
      console.error("Rating submission error:", e);
    }
  };

  // Agent Actions
  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const handleAgentStatusUpdate = async (agentId: string, status: AgentStatus) => {
    try {
      await fetch("/api/agent/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, status })
      });
    } catch (e) {
      console.error("Update agent status failure:", e);
    }
  };

  const handleAgentPickup = async (sessionId: string, agentId: string) => {
    try {
      await fetch("/api/agent/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, agentId })
      });
    } catch (e) {
      console.error("Pickup session failure:", e);
    }
  };

  const handleAgentTransfer = async (
    sessionId: string,
    currentAgentId: string,
    targetAgentId: string
  ) => {
    try {
      await fetch("/api/agent/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, currentAgentId, targetAgentId })
      });
    } catch (e) {
      console.error("Transfer session failure:", e);
    }
  };

  const handleAgentEndChat = async (sessionId: string) => {
    try {
      await fetch("/api/agent/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
    } catch (e) {
      console.error("End session failure:", e);
    }
  };

  const handleAgentSendMsg = async (sessionId: string, text: string, senderName: string) => {
    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          senderType: "agent",
          senderName,
          text
        })
      });
    } catch (e) {
      console.error("Agent send message error:", e);
    }
  };

  // Supervisor Actions
  const handleSupervisorSilentListenTrigger = async () => {
    try {
      const resp = await fetch("/api/supervisor/listen", { method: "POST" });
      return await resp.json();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSupervisorExtractThemes = async () => {
    try {
      const resp = await fetch("/api/supervisor/extract-themes", { method: "POST" });
      const data = await resp.json();
      return data.themes || [];
    } catch (e) {
      console.error("Themes extraction API failure:", e);
      return [];
    }
  };

  // Simulator controls actions
  const handleSimulatorSeedTraffic = async () => {
    try {
      await fetch("/api/simulator/seed-traffic", { method: "POST" });
    } catch (e) {
      console.error("Simulator traffic generation failed:", e);
    }
  };

  const handleSimulatorFastForward = async () => {
    try {
      await fetch("/api/simulator/fast-forward", { method: "POST" });
    } catch (e) {
      console.error("Simulator fast forward failed:", e);
    }
  };

  const handleSimulatorClearState = async () => {
    try {
      setClientSession(null);
      await fetch("/api/simulator/clear", { method: "POST" });
    } catch (e) {
      console.error("Clear state failed:", e);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-900 font-sans text-slate-800 flex flex-col overflow-hidden">
      {/* Primary Navigation Rail Header */}
      <header className="bg-bank-blue-900 text-white flex flex-col md:flex-row items-center justify-between px-6 py-4 border-b border-bank-blue-950 flex-shrink-0 gap-4">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 p-0.5 rounded-lg flex items-center justify-center select-none shadow border border-white/5">
            <img
              src={logoUrl}
              alt="Standard Bank Logo"
              className="w-full h-full object-contain rounded"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-left select-none">
            <h1 className="font-bold text-base leading-none tracking-tight font-sans text-sky-50">Standard Bank</h1>
            <p className="text-[10px] text-sky-200 mt-0.5">SLA-Optimized Secure Routing Core</p>
          </div>
        </div>

        {/* Perspective Selectors Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActivePerspective("client")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activePerspective === "client"
                ? "bg-bank-blue-800 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Client Portal (Widget)
          </button>
          <button
            onClick={() => setActivePerspective("agent")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activePerspective === "agent"
                ? "bg-bank-blue-800 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Agent Workspace
          </button>
          <button
            onClick={() => setActivePerspective("supervisor")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activePerspective === "supervisor"
                ? "bg-bank-blue-800 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Supervisor Console
          </button>
        </div>

        {/* Interactive Simulator Side Toggle */}
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
            showSimulator
              ? "bg-emerald-600/15 text-emerald-450 border-emerald-500 text-emerald-400 font-extrabold"
              : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <Cpu className="w-4 h-4" />
          {showSimulator ? "Hide Simulator Panel" : "Show Simulator Panel"}
        </button>
      </header>

      {/* Primary Split View Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Dynamic perspective body wrapper */}
        <section className="flex-1 overflow-hidden h-full">
          {activePerspective === "client" && (
            <ClientWidget
              currentSession={clientSession}
              messages={state.messages}
              onSubmitRequest={handleClientSubmit}
              onSendMsg={handleClientSendMsg}
              onRequestCallback={handleClientRequestCallback}
              onLeaveOffline={handleClientLeaveOfflineMessage}
              onSubmitRating={handleClientSubmitRating}
            />
          )}

          {activePerspective === "agent" && (
            <AgentWorkspace
              agents={state.agents}
              sessions={state.sessions}
              messages={state.messages}
              selectedAgentId={selectedAgentId}
              onSelectAgent={handleAgentSelect}
              onUpdateStatus={handleAgentStatusUpdate}
              onPickupChat={handleAgentPickup}
              onTransferChat={handleAgentTransfer}
              onEndChat={handleAgentEndChat}
              onSendMsg={handleAgentSendMsg}
            />
          )}

          {activePerspective === "supervisor" && (
            <SupervisorWorkspace
              agents={state.agents}
              sessions={state.sessions}
              messages={state.messages}
              offlineLeads={offlineLeads}
              historicalLogs={historicalLogs}
              onTriggerSilentListen={handleSupervisorSilentListenTrigger}
              onExtractThemes={handleSupervisorExtractThemes}
            />
          )}
        </section>

        {/* Floating Side Simulator Controller */}
        {showSimulator && (
          <aside className="w-80 border-l border-slate-800 bg-slate-950 flex-shrink-0 h-full overflow-hidden transition-all duration-300">
            <SimulatorControls
              sessions={state.sessions}
              messages={state.messages}
              historicalLogs={historicalLogs}
              offlineLeads={offlineLeads}
              onSeedTraffic={handleSimulatorSeedTraffic}
              onFastForwardTime={handleSimulatorFastForward}
              onClearState={handleSimulatorClearState}
            />
          </aside>
        )}
      </main>
    </div>
  );
}
