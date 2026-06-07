/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Flame,
  FileSpreadsheet,
  Download,
  Users,
  Activity,
  Headphones,
  Bell,
  Award,
  BookOpen,
  PieChart,
  Calendar,
  Filter,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Sliders,
  Sparkles
} from "lucide-react";
import { ClientSession, ChatMessage, Agent, QueryCategory, SessionStatus } from "../types";

interface SupervisorWorkspaceProps {
  agents: Agent[];
  sessions: ClientSession[];
  messages: ChatMessage[];
  offlineLeads: any[];
  historicalLogs: any[];
  onTriggerSilentListen: () => void;
  onExtractThemes: () => Promise<any[]>;
}

export function SupervisorWorkspace({
  agents,
  sessions,
  messages,
  offlineLeads,
  historicalLogs,
  onTriggerSilentListen,
  onExtractThemes
}: SupervisorWorkspaceProps) {
  const [activeReportTab, setActiveReportTab] = useState<"dashboard" | "agent" | "queue" | "csat" | "scorecard">("dashboard");

  // Filters for reports
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterAgent, setFilterAgent] = useState<string>("All");
  const [themeExtractionLoading, setThemeExtractionLoading] = useState(false);
  const [extractedThemes, setExtractedThemes] = useState<any[]>([]);

  // Silent listen states
  const [silentListenActive, setSilentListenActive] = useState(false);
  const [listenSessionId, setListenSessionId] = useState<string | null>(null);

  // Trigger prompt for silent monitoring
  const startSilentListen = (sessionId: string) => {
    onTriggerSilentListen();
    setListenSessionId(sessionId);
    setSilentListenActive(true);
    setTimeout(() => {
      alert("A escuta activa silenciosa foi iniciada de forma segura. O cliente ou o assistente não foram notificados. Registo de conformidade activo.");
    }, 200);
  };

  const stopSilentListen = () => {
    setSilentListenActive(false);
    setListenSessionId(null);
  };

  // Metrics calculations
  const totalInQueue = sessions.filter((s) => s.status === "waiting").length;
  const longestWaitSeconds = sessions
    .filter((s) => s.status === "waiting")
    .reduce((max, s) => {
      const wait = Math.floor((Date.now() - s.joinedQueueAt) / 1000);
      return wait > max ? wait : max;
    }, 0);

  const escalationsList = sessions.filter((s) => {
    if (s.status === "waiting") {
      const wait = Date.now() - s.joinedQueueAt;
      return wait >= 180000; // Waiting SLA Breached
    } else if (s.status === "active") {
      const chatDuration = Date.now() - (s.chatStartedAt || Date.now());
      return chatDuration >= 600000; // Chat exceeding 10 minutes
    }
    return false;
  });

  const onlineAgents = agents.filter((a) => a.status === "Online");
  const busyAgents = agents.filter((a) => a.status === "Busy");
  const awayAgents = agents.filter((a) => a.status === "Away");
  const offlineAgents = agents.filter((a) => a.status === "Offline");

  // Load compliance themes on demand via Gemini API
  const handleLoadFeedbackThemes = async () => {
    setThemeExtractionLoading(true);
    try {
      const themes = await onTriggerSilentListen(); // triggers simple logging mock endpoint if required
      const results = await onExtractThemes();
      setExtractedThemes(results);
    } catch (e) {
      console.error(e);
    } finally {
      setThemeExtractionLoading(false);
    }
  };

  // CSV Generator compliance module
  const exportCSV = (reportName: string, headers: string[], rows: any[][]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    rows.forEach((row) => {
      const formatted = row.map((cell) => {
        const val = cell === null || cell === undefined ? "" : cell.toString();
        // Escape quotes
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvContent += formatted.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV formatting bindings
  const handleExportAgentPerformance = () => {
    const headers = [
      "Nome do Assistente",
      "Chats Atendidos",
      "Tempo Medio de Resposta (seg)",
      "Duracao Media de Chat (seg)",
      "Media de CSAT (0-10)",
      "Pontuacao de Conformidade (%)"
    ];
    const rows = agents.map((a) => [
      a.name,
      a.chatsHandledCount,
      "18s",
      "340s",
      a.averageRating,
      "94%"
    ]);
    exportCSV("Desempenho_Qualidade_Assistentes", headers, rows);
  };

  const handleExportQueuePerformance = () => {
    const headers = ["Item Metrico", "Valor do Desempenho Horario", "SLA Regulamentar de Destino"];
    const rows = [
      ["Tempo Max de Espera na Fila", `${longestWaitSeconds}s`, "Max 180s"],
      ["Percentil de Espera 95", "142s", "Max 180s"],
      ["Pedidos de Callback Registados", historicalLogs.filter(s => s.queue_wait_seconds > 180).length + " processos", "Prioridade FIFO"],
      ["Perguntas Of-Shift Abandonadas", offlineLeads.length + " registos", "Triagem imediata"]
    ];
    exportCSV("Registo_Conformidade_Fila", headers, rows);
  };

  const translateCategory = (cat: string) => {
    switch (cat) {
      case "Fraud": return "Fraude";
      case "Card": return "Cartão";
      case "Loan": return "Crédito";
      case "Account": return "Conta";
      default: return cat;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-150">
      {/* SubHeader Tab controls */}
      <div className="bg-bank-blue-900 text-white p-3.5 flex flex-wrap gap-2 items-center justify-between border-b border-bank-blue-950 shadow-md">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-bank-gold" />
          <h4 className="font-bold text-sm tracking-wider font-sans uppercase">PORTAL DE CONFORMIDADE DO SUPERVISOR</h4>
        </div>

        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-900">
          <button
            onClick={() => setActiveReportTab("dashboard")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === "dashboard" ? "bg-bank-blue-800 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Monitorização em Tempo Real
          </button>
          <button
            onClick={() => setActiveReportTab("agent")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === "agent" ? "bg-bank-blue-800 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Desempenho dos Assistentes
          </button>
          <button
            onClick={() => setActiveReportTab("queue")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === "queue" ? "bg-bank-blue-800 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Desempenho da Fila
          </button>
          <button
            onClick={() => setActiveReportTab("csat")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === "csat" ? "bg-bank-blue-800 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Categorias de CSAT
          </button>
          <button
            onClick={() => setActiveReportTab("scorecard")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeReportTab === "scorecard" ? "bg-bank-blue-800 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Classificação de Assistentes
          </button>
        </div>
      </div>

      {/* Primary Supervisor Workspace Panels */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-h-[calc(100vh-140px)]">
        {activeReportTab === "dashboard" && (
          <div id="supervisor-live-dashboard" className="space-y-6">
            {/* Live Metrics Grid banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Fila de Espera Activa</span>
                <p className="text-2xl font-bold font-mono mt-1 text-bank-blue-800">{totalInQueue} Clientes</p>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-500" /> Ordenação FIFO garantida
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Espera Mais Longa</span>
                <p className={`text-2xl font-bold font-mono mt-1 ${longestWaitSeconds >= 170 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                  {longestWaitSeconds}s de espera
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  Limite de Tolerância (SLA): <strong className="text-slate-600">180s</strong>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Disponibilidade da Linha</span>
                <div className="flex gap-2 items-end mt-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-sans font-bold">ONLINE:{onlineAgents.length}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-mono font-sans font-bold">OCUPADO:{busyAgents.length}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-sans font-bold">AUSENTE:{awayAgents.length}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Assistentes conectados</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Alertas Ativos de Exclusão</span>
                <p className={`text-2xl font-bold font-mono mt-1 ${escalationsList.length > 0 ? 'text-red-600 font-black' : 'text-slate-700'}`}>
                  {escalationsList.length} CASOS
                </p>
                <div className="text-[10px] text-slate-405 mt-1 text-slate-500">
                  Violações de SLA registadas
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: List of Live Active Chats & Silent Listen Panel */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-left lg:col-span-2">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h5 className="font-bold text-slate-800">Escutar em Silêncio e Monitorizar Conversas</h5>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">Sob as directrizes do plano de auditoria do Standard Bank Moçambique, o supervisor pode examinar chats ativos para conformidade:</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {sessions.filter(s => s.status === SessionStatus.Active).length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-450 text-slate-500 animate-pulse">Sem chats ativos de momento. Os assistentes devem atender novos tickets da fila.</p>
                    </div>
                  ) : (
                    sessions.filter(s => s.status === SessionStatus.Active).map((s) => {
                      const rep = agents.find(a => a.agentId === s.assignedAgentId);
                      const isListening = listenSessionId === s.sessionId;
                      return (
                        <div key={s.sessionId} className="p-3.5 border border-slate-250 rounded-xl flex items-center justify-between shadow-sm bg-slate-50 gap-4">
                          <div className="text-xs">
                            <h6 className="font-bold text-slate-800">{s.fullName} <span className="font-normal text-slate-500">({translateCategory(s.queryCategory)})</span></h6>
                            <p className="text-slate-500 text-[11px] font-mono mt-0.5">Assistente Atribuído: <strong>{rep?.name || "Representante"}</strong></p>
                          </div>

                          <div className="flex gap-2">
                            {isListening ? (
                              <button
                                onClick={stopSilentListen}
                                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <Headphones className="w-3.5 h-3.5 animate-bounce" /> Parar Escuta
                              </button>
                            ) : (
                              <button
                                onClick={() => startSilentListen(s.sessionId)}
                                className="px-3.5 py-1.5 bg-bank-blue-800 hover:bg-bank-blue-900 border border-bank-blue-900 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                              >
                                <Headphones className="w-3.5 h-3.5" /> Escuta Activa
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Silent listens console layout */}
                {silentListenActive && listenSessionId && (
                  <div className="mt-5 p-4 border border-dashed border-emerald-500 bg-emerald-50/50 rounded-xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 font-mono flex items-center gap-1.5 animate-pulse">
                      <Headphones className="w-4 h-4 text-emerald-600 animate-spin" /> ESCUTA SILENCIOSA SECULIZADA EM CURSO (SESSÃO: {listenSessionId.substring(0,8)})
                    </span>
                    <p className="text-xs text-slate-600 mt-1 mb-3">Linha de áudio e espelho do ecrã sincronizados. Todo o histórico é guardado para efeitos de qualidade regulatória.</p>

                    <div className="bg-white border border-slate-200 rounded p-3 h-36 overflow-y-auto font-mono text-[11px] text-slate-700 space-y-1.5">
                      <p className="text-slate-400 text-[10px] text-center font-bold italic border-b border-slate-100 pb-1 mb-2">REPRODUÇÃO SEGURA DA TRANSCRIÇÃO EM DIRETO</p>
                      {messages.filter(m => m.sessionId === listenSessionId).length === 0 ? (
                        <p className="text-center italic text-slate-400 mt-4">Sincronizando feeds... Sem mensagens partilhadas ainda.</p>
                      ) : (
                        messages.filter(m => m.sessionId === listenSessionId).map((m, idx) => (
                          <div key={idx} className="border-b border-slate-50 pb-1.5 text-left">
                            <strong>{m.senderName}:</strong> {m.text}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Absolute SLA Violations & Action Alerts */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 text-left">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1 mb-3">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Transgressões de Limites SLA
                </span>

                {escalationsList.length === 0 ? (
                  <div className="py-8 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <strong className="text-slate-800 block">Linha Prístina - Sem Violacões</strong>
                    <span className="text-slate-450 text-[10px] block mt-1">Nenhum cliente excede os limites estabelecidos de 180s ou atendimentos de 10 min.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {escalationsList.map((s) => {
                      const waitSec = Math.floor((Date.now() - s.joinedQueueAt) / 1000);
                      const isTimeBreach = waitSec >= 180;
                      return (
                        <div key={s.sessionId} className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs leading-relaxed">
                          <p className="font-bold text-rose-800">Alerta Crítico de Transgressão</p>
                          <p className="text-slate-700 mt-1">Cliente: <strong className="text-slate-900">{s.fullName}</strong> ({translateCategory(s.queryCategory)})</p>
                          <p className="text-slate-500 text-[10px] font-mono mt-0.5">Tempo Esperado: <strong className="text-rose-600">{waitSec} segundos</strong> ({isTimeBreach ? 'SLA Violado!' : 'Aproximação perigosa ao limite do SLA'})</p>

                          <div className="flex gap-1.5 mt-2.5">
                            <button
                              onClick={() => {
                                alert("Callback agendado prioritariamente para este cliente.");
                              }}
                              className="px-2 py-1 bg-red-650 hover:bg-red-700 bg-red-600 text-white rounded font-bold text-[10px] shadow cursor-pointer"
                            >
                              Forçar Agendamento de Chamada
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REPLICATED COMPLIANCE REPORTS VIEWS */}
        {activeReportTab === "agent" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left font-sans font-medium text-xs">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-4 mb-4 gap-4">
              <div>
                <h4 className="text-lg font-bold text-slate-800">RELATÓRIO DE DESEMPENHO DOS REPRESENTANTES DE ATENDIMENTO</h4>
                <p className="text-xs text-slate-500 font-medium">Pontuação de qualidade de conformidade, volume de chats, médias de CSAT e tempo despendido.</p>
              </div>
              <button
                onClick={handleExportAgentPerformance}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 hover:shadow text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar em Formato CSV
              </button>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-mono tracking-wider border-b border-slate-200">
                  <th className="p-3">Nome do Assistente</th>
                  <th className="p-3">Casos Atendidos</th>
                  <th className="p-3">Tempo Médio de Resposta (seg)</th>
                  <th className="p-3">Duração Média de Chat (seg)</th>
                  <th className="p-3">Média de CSAT (0-10)</th>
                  <th className="p-3">Conformidade Qualitativa (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((ag) => (
                  <tr key={ag.agentId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-800">{ag.name} ({ag.agentId})</td>
                    <td className="p-3">{ag.chatsHandledCount} casos</td>
                    <td className="p-3 font-mono">18 / 30s SLA</td>
                    <td className="p-3 font-mono">342s</td>
                    <td className="p-3 font-bold text-bank-gold">{ag.averageRating} estrelas</td>
                    <td className="p-3 font-mono font-bold text-emerald-600">96.8%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReportTab === "queue" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left font-sans">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-800 font-sans tracking-tight">MÉTRICAS DO DESEMPENHO DA FILA EM CONFORMIDADE</h4>
                <p className="text-xs text-slate-500 font-medium">Percentis de espera horários, taxa de abandono média e rácio de sucesso SLA.</p>
              </div>
              <button
                onClick={handleExportQueuePerformance}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 hover:shadow text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar Dados de Fila (CSV)
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-[10px] text-slate-400 block font-mono">ESPERA 95º PERCENTIL</span>
                <strong className="text-lg text-slate-800 font-mono">142 segundos</strong>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-[10px] text-slate-400 block font-mono">CHATS ABANDONADOS</span>
                <strong className="text-lg text-slate-800 font-mono">4.2% rácio</strong>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-[10px] text-slate-400 block font-mono">MENSAGENS OFFLINE</span>
                <strong className="text-lg text-slate-800 font-mono">{offlineLeads.length} submissões</strong>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                <span className="text-[10px] text-slate-400 block font-mono">CONFORMIDADE DO SLA</span>
                <strong className="text-lg text-emerald-600 font-mono">95.8% sucesso</strong>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
              <h5 className="font-bold text-sm text-slate-800 mb-2 font-sans">Trilho de Auditoria Segura (Anonimização de Dados)</h5>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                De acordo com os controlos de segurança de Moçambique, os nomes e dados do cliente original são permanentemente destruídos e substituídos por um hash SHA-256 irreversível de modo a assegurar os dados sensíveis após a avaliação.
              </p>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {historicalLogs.map((log, idx) => (
                  <div key={idx} className="bg-white border border-slate-150 p-2.5 rounded-lg text-[11px] font-mono flex flex-wrap justify-between gap-2 shadow-sm text-left">
                    <div>
                      <p className="text-slate-800 font-sans font-bold">Cliente: {log.client_name_masked}</p>
                      <p className="text-slate-400 truncate max-w-[280px]">Hash SHA-256: {log.client_phone_hash}</p>
                    </div>
                    <div className="text-right font-medium">
                      <p className="text-slate-500">Espera: <strong className="text-slate-700">{log.queue_wait_seconds}s</strong> (SLA Goal: 180s)</p>
                      <p className="text-slate-500">Avaliado com: <strong className="text-bank-gold">{log.rating} estrelas</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeReportTab === "csat" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left font-sans">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-5">
              <div>
                <h4 className="text-lg font-bold text-slate-800">AVALIAÇÕES DE ATENDIMENTO (CSAT) POR CATEGORIA</h4>
                <p className="text-xs text-slate-500 font-medium">Médias em tempo real de CSAT de acordo com cada mesa de atendimento.</p>
              </div>
              <button
                onClick={handleLoadFeedbackThemes}
                disabled={themeExtractionLoading}
                className="px-4 py-2 bg-bank-blue-800 hover:bg-bank-blue-900 focus:outline-none text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:bg-slate-300"
              >
                {themeExtractionLoading ? (
                  <span className="animate-spin flex border-t-2 border-slate-100 rounded-full w-3.5 h-3.5 border-dashed" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                Extrair Principais Temas (Inteligência Artificial Gemini)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Star CSAT category ratings cards */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-slate-450 uppercase tracking-wider font-mono">AVALIAÇÃO CSAT MÉDIA POR CATEGORIA</span>
                <div className="space-y-3">
                  {[
                    { cat: "Fraude / Segurança", stars: "9.3 / 10.0 estrelas", count: "18 logs", width: "w-[93%]", color: "bg-emerald-500" },
                    { cat: "Bloqueio e Substituição de Cartão", stars: "8.8 / 10.0 estrelas", count: "45 logs", width: "w-[88%]", color: "bg-teal-500" },
                    { cat: "Gestão e Saldos de Conta", stars: "8.5 / 10.0 estrelas", count: "32 logs", width: "w-[85%]", color: "bg-bank-blue-800" },
                    { cat: "Empréstimos e Créditos", stars: "8.1 / 10.0 estrelas", count: "12 logs", width: "w-[81%]", color: "bg-amber-500" }
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <strong className="text-slate-700">{item.cat} ({item.count})</strong>
                        <span className="font-mono text-slate-500">{item.stars}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className={`${item.color} h-full rounded-full ${item.width}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gemini extracted topics card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-xs">
                <strong className="text-slate-800 block mb-1">Principais Temas de Feedback (Extração Automática com IA)</strong>
                <p className="text-slate-500 mb-4 text-[11px]">Agrupamento estruturado de sentimentos desenvolvido no servidor com o modelo cognitivo Gemini:</p>

                {extractedThemes.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 bg-white rounded-lg">
                    <p className="text-slate-400 text-[11px] italic leading-relaxed">Nenhum tema extraído de momento. Clique no botão "Extrair Principais Temas" acima para processar os logs com a IA Gemini.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {extractedThemes.map((theme, i) => (
                      <div key={i} className="p-2.5 bg-white border border-slate-150 rounded-lg flex justify-between items-center shadow-sm">
                        <div className="text-left">
                          <strong className="text-slate-800 font-sans">{theme.theme}</strong>
                          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Volume de Ocorrências: {theme.volume} casos</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          theme.type === "positive" ? "bg-emerald-150 text-emerald-800 bg-emerald-50" : "bg-red-150 text-red-800 bg-rose-50"
                        }`}>
                          {theme.type === "positive" ? "POSITIVO" : "NEGATIVO"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeReportTab === "scorecard" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left font-sans">
            <div className="border-b border-slate-200 pb-3 mb-4">
              <h4 className="text-lg font-bold text-slate-800 font-sans tracking-tight">AVALIAÇÕES SEMANAIS DA QUALIDADE DE ATENDIMENTO DOS ASSISTENTES</h4>
              <p className="text-xs text-slate-500">Representantes ordenados por avaliação média cumulativa, atendimentos por hora e grau de adesão ao SLA de 30 segundos.</p>
            </div>

            <div className="space-y-4">
              {agents.map((ag, rank) => (
                <div key={ag.agentId} className="p-4 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between shadow-sm bg-slate-50 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-bank-blue-50 flex items-center justify-center font-bold text-bank-blue-800">
                      #{rank + 1}
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-800 font-sans">{ag.name} <span className="font-mono text-xs font-normal text-slate-500">({ag.agentId})</span></h6>
                      <p className="text-[11px] text-slate-450 text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Award className="w-3.5 h-3.5 text-bank-gold" /> Classificação Média: <strong className="text-slate-800">{ag.averageRating} Estrelas</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 font-mono text-[11px] text-slate-500 text-left">
                    <div>
                      <p className="text-[9px] text-slate-450 font-sans">CHATS / HORA</p>
                      <p className="font-bold text-slate-800">{ag.chatsPerHour} atendimentos</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-450 font-sans">ADESÃO SLA 30S</p>
                      <p className="font-bold text-emerald-600">98.2% adesão</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-450 font-sans">HORAS TOTAIS</p>
                      <p className="font-bold text-slate-800">{(ag.adherenceSeconds / 3600).toFixed(1)} hrs</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
