/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Sparkles,
  Flame,
  Trash,
  Database,
  RefreshCw,
  AlertTriangle,
  Play,
  Heart,
  ShieldCheck,
  Cpu
} from "lucide-react";
import { ClientSession, ChatMessage } from "../types";

interface SimulatorControlsProps {
  sessions: ClientSession[];
  messages: ChatMessage[];
  historicalLogs: any[];
  offlineLeads: any[];
  onSeedTraffic: () => void;
  onFastForwardTime: () => void;
  onClearState: () => void;
}

export function SimulatorControls({
  sessions,
  messages,
  historicalLogs,
  offlineLeads,
  onSeedTraffic,
  onFastForwardTime,
  onClearState
}: SimulatorControlsProps) {

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden text-left h-full flex flex-col">
      {/* Branding Header */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-450 text-emerald-500 animate-spin [animation-duration:10s]" />
          <div>
            <h4 className="font-bold text-xs tracking-wider uppercase font-mono">SIMULADOR INTERATIVO MULTI-PERFIL</h4>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Teste alertas de SLA e estados de atendimento instantaneamente</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Core Actions Card */}
        <div className="space-y-3">
          <span className="text-[10px] text-slate-450 uppercase font-mono tracking-wider font-bold text-slate-400 block">CONSOLA DE CONTROLO DE SIMULAÇÃO</span>
          
          <button
            id="seed-traffic-btn"
            onClick={onSeedTraffic}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-255" /> Criar Cliente de Teste na Fila
          </button>

          <button
            id="fast-forward-btn"
            onClick={onFastForwardTime}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            title="Adiciona 45 segundos ao relógio de espera dos clientes em fila"
          >
            <Flame className="w-4 h-4 text-orange-500" /> Simular Avanço de Tempo em 45s
          </button>

          <button
            onClick={onClearState}
            className="w-full bg-rose-900/35 hover:bg-rose-900/55 border border-rose-800 text-rose-200 font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash className="w-4 h-4" /> Reiniciar Estado do Sistema
          </button>
        </div>

        {/* Database Stats Inspector */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[10px] text-slate-455 uppercase font-mono tracking-widest font-bold text-slate-400 flex items-center gap-1.5 leading-none">
            <Database className="w-3.5 h-3.5 text-slate-500" /> Memória de Operações do Sistema
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-slate-900 border border-slate-800 p-2 rounded">
              <span className="text-slate-500 block">Sessões Ativas:</span>
              <strong className="text-white text-xs">{sessions.length}</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded">
              <span className="text-slate-500 block">Trans transmissões:</span>
              <strong className="text-white text-xs">{messages.length}</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded">
              <span className="text-slate-500 block">Questões Offline:</span>
              <strong className="text-white text-xs">{offlineLeads.length} leads</strong>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded">
              <span className="text-slate-500 block">Ficheiros de Auditoria:</span>
              <strong className="text-white text-xs">{historicalLogs.length} logs</strong>
            </div>
          </div>
        </div>

        {/* SECURE REAL-TIME AUDIT STREAM */}
        <div className="border border-slate-800 rounded-xl p-3 bg-slate-950 flex flex-col h-40">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> REGISTOS DE AUDITORIA DE SEGURANÇA
            </span>
            <span className="text-[8px] bg-slate-800 text-slate-400 font-mono py-0.5 px-1 rounded">
              ONLINE
            </span>
          </div>

          <div className="flex-1 bg-slate-900 border border-slate-850 rounded p-2 overflow-y-auto text-left space-y-1.5 font-mono text-[9px] text-emerald-400 leading-snug">
            <p className="text-[8px] text-slate-500">[ESTADO] A aguardar eventos criptográficos de transacção...</p>
            {sessions.map((s, idx) => (
              <p key={idx}>
                [SESSÃO-{s.sessionId.substring(0,4).toUpperCase()}] Fila de espera unida. Estado: {s.status === "waiting" ? "ESPERA" : s.status === "active" ? "ATIVO" : s.status}. VIP: {s.isVip ? "SIM" : "NÃO"}
              </p>
            ))}
            {messages.slice(-3).map((m, idx) => (
              <p key={idx}>
                [MENSAGEM] Payload seguro. Tipo: {m.senderType.toUpperCase() === "AGENT" ? "ASSISTENTE" : m.senderType.toUpperCase() === "SYSTEM" ? "SISTEMA" : "CLIENTE"}. Comp: {m.text.length} caracs
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 font-mono leading-none">
          Conformidade garantida. NÚCLEO SEGURO v4.1
        </p>
      </div>
    </div>
  );
}
