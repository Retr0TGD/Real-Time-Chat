/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Users,
  MessageSquare,
  ClipboardList,
  ShieldAlert,
  Send,
  Upload,
  UserCheck,
  Smartphone,
  PhoneCall,
  UserX,
  FileCheck,
  CornerDownRight,
  UserMinus,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Sparkles,
  Bookmark
} from "lucide-react";
import { ClientSession, ChatMessage, Agent, AgentStatus, QueryCategory, SessionStatus } from "../types";

interface AgentWorkspaceProps {
  agents: Agent[];
  sessions: ClientSession[];
  messages: ChatMessage[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  onUpdateStatus: (id: string, status: AgentStatus) => void;
  onPickupChat: (sessionId: string, agentId: string) => void;
  onTransferChat: (sessionId: string, currentId: string, targetId: string) => void;
  onEndChat: (sessionId: string) => void;
  onSendMsg: (sessionId: string, text: string, senderName: string) => void;
}

export function AgentWorkspace({
  agents,
  sessions,
  messages,
  selectedAgentId,
  onSelectAgent,
  onUpdateStatus,
  onPickupChat,
  onTransferChat,
  onEndChat,
  onSendMsg
}: AgentWorkspaceProps) {
  const currentAgent = agents.find((a) => a.agentId === selectedAgentId) || agents[0];

  // Active chat routing
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [internalNoteInput, setInternalNoteInput] = useState("");
  const [internalNotes, setInternalNotes] = useState<Record<string, string[]>>({});
  const [transferTargetAgent, setTransferTargetAgent] = useState<string>("");

  // Canned responses library
  const cannedResponses = [
    { title: "Boas-vindas Padrão", text: "Olá! Obrigado por contactar o Apoio ao Cliente do Standard Bank Moçambique. O meu nome é [AgentName]. Como posso ajudar a resolver a sua questão hoje?" },
    { title: "Verificação de PIN", text: "Antes de prosseguirmos para os detalhes da conta, enviámos um código seguro de verificação por SMS para o seu telemóvel registado. Por favor, confirme-me o código assim que o receber." },
    { title: "Bloqueio de Cartão", text: "Efectuei de imediato um bloqueio temporário seguro no seu cartão com terminação [Last4]. Nenhuma outra transacção poderá ser realizada. Vou iniciar o processo de substituição do cartão." },
    { title: "Estado do Crédito", text: "A sua pasta de crédito encontra-se actualmente sob análise no nosso departamento de auditoria sénior. O tempo estimado de resposta regulamentar (SLA) é de 24 horas úteis." },
    { title: "Agradecimento e Fecho", text: "Existe mais alguma questão em que o possa ajudar hoje? Obrigado por escolher o Standard Bank Moçambique. Uma breve avaliação de 0 a 10 surgirá assim que encerrar este chat." }
  ];

  // Filters
  const waitingQueue = sessions.filter((s) => s.status === SessionStatus.Waiting);
  const myActiveChats = sessions.filter((s) => s.status === SessionStatus.Active && s.assignedAgentId === selectedAgentId);
  const otherActiveChats = sessions.filter((s) => s.status === SessionStatus.Active && s.assignedAgentId !== selectedAgentId);

  const activeSessionDetails = sessions.find((s) => s.sessionId === activeChatId);
  const activeChatMessages = messages.filter((m) => m.sessionId === activeChatId);

  // Parse phone masker function to comply with secure PII masking
  const maskPhoneNumber = (rawPhone: string) => {
    const cleaned = rawPhone.replace(/\D/g, "");
    if (cleaned.length >= 9) {
      const isMoz = rawPhone.startsWith("+258") || cleaned.length === 12;
      const displayPrefix = isMoz ? "+258 " : "+ ";
      const lastFour = cleaned.substring(cleaned.length - 4);
      return `${displayPrefix}*** *** ${lastFour}`;
    }
    return "+258 *** *** " + rawPhone.slice(-4);
  };

  const handleCannedInsert = (text: string) => {
    let customized = text.replace("[AgentName]", currentAgent.name);
    if (activeSessionDetails) {
      customized = customized.replace("[Last4]", activeSessionDetails.phoneNumber.slice(-4));
    }
    setInputText((prev) => (prev ? prev + " " + customized : customized));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChatId) return;

    onSendMsg(activeChatId, inputText.trim(), currentAgent.name);
    setInputText("");
  };

  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteInput.trim() || !activeChatId) return;

    setInternalNotes((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), internalNoteInput.trim()]
    }));
    setInternalNoteInput("");
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatId || !transferTargetAgent) return;

    onTransferChat(activeChatId, selectedAgentId, transferTargetAgent);
    setActiveChatId(null);
    setTransferTargetAgent("");
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Workspace Sub-Header / Identity Switchboard */}
      <div className="bg-bank-blue-800 text-white p-4 flex flex-wrap gap-4 items-center justify-between border-b border-bank-blue-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bank-blue-900 flex items-center justify-center font-bold text-bank-gold border border-bank-blue-800 shadow-inner">
            A
          </div>
          <div>
            <h5 className="font-bold text-sm tracking-wide">TERMINAL DE ATENDIMENTO SEGURO</h5>
            <div className="flex items-center gap-2 mt-0.5">
              <label className="text-[10px] text-slate-350">Perfil do Assistente:</label>
              <select
                value={selectedAgentId}
                onChange={(e) => {
                  onSelectAgent(e.target.value);
                  setActiveChatId(null);
                }}
                className="bg-bank-blue-900 text-slate-200 border border-bank-blue-850 py-0.5 px-2 text-xs rounded font-medium focus:outline-none cursor-pointer"
              >
                {agents.map((ag) => (
                  <option key={ag.agentId} value={ag.agentId}>
                    {ag.name} ({ag.agentId})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Online / Status Radio Selectors */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 font-mono">CONSOLA DE ESTADO:</span>
          <div className="flex bg-bank-blue-900 p-1 rounded-lg border border-bank-blue-800">
            {[(AgentStatus.Online), (AgentStatus.Busy), (AgentStatus.Away), (AgentStatus.Offline)].map((status) => (
              <button
                key={status}
                onClick={() => onUpdateStatus(currentAgent.agentId, status)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                  currentAgent.status === status
                    ? status === AgentStatus.Online
                      ? "bg-emerald-600 text-white shadow"
                      : status === AgentStatus.Busy
                      ? "bg-red-600 text-white shadow"
                      : status === AgentStatus.Away
                      ? "bg-amber-600 text-white shadow"
                      : "bg-slate-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {status === AgentStatus.Online ? "Online" :
                 status === AgentStatus.Busy ? "Ocupado" :
                 status === AgentStatus.Away ? "Ausente" : "Inativo"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex max-h-[calc(100vh-140px)] overflow-hidden">
        {/* Left Hand: Inquiries Waiting Queue and Active Assigned Lists */}
        <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto w-[330px] shrink-0">
          {/* Waiting Queue - Live Target Count */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                <Users className="w-4 h-4 text-bank-blue-800 animate-pulse" /> Fila de Espera em Direto ({waitingQueue.length})
              </span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                SLA 180s
              </span>
            </div>

            {waitingQueue.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg bg-white">
                <p className="text-xs text-slate-400">Sem clientes em fila de espera de momento.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {waitingQueue.map((s) => {
                  const waitSec = Math.floor((Date.now() - s.joinedQueueAt) / 1000);
                  const isBreachNear = waitSec >= 150;

                  const translateCategory = (cat: string) => {
                    switch(cat) {
                      case "Fraud": return "Fraude";
                      case "Card": return "Cartão";
                      case "Loan": return "Crédito";
                      case "Account": return "Conta";
                      default: return "Outros";
                    }
                  };

                  return (
                    <div
                      key={s.sessionId}
                      title={s.rawQuery}
                      className={`p-3 border rounded-xl shadow-sm text-left transition ${
                        isBreachNear
                          ? "bg-rose-50 border-rose-300 hover:bg-rose-100/60"
                          : "bg-white border-slate-150 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h6 className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                          {s.fullName}
                        </h6>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isBreachNear ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {waitSec}s de espera
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <span className="text-[9px] font-bold uppercase py-0.5 px-1 bg-sky-100 text-bank-blue-800 rounded">
                          {translateCategory(s.queryCategory)}
                        </span>
                        {s.isVip && (
                          <span className="text-[9px] font-bold uppercase py-0.5 px-1 bg-amber-500 text-black rounded font-black">
                            Prioridade VIP
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1.5 italic">
                        "{s.rawQuery}"
                      </p>

                      <button
                        onClick={() => onPickupChat(s.sessionId, currentAgent.agentId)}
                        className="mt-2 text-xs w-full py-1 bg-bank-blue-800 hover:bg-bank-blue-900 hover:shadow text-white rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                      >
                        <UserCheck className="w-3 h-3" /> Atender e Iniciar Discussão
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connected Personal Chats List */}
          <div className="flex-1 p-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2">
              A MINHA ENTRADA DE ATENDIMENTO ({myActiveChats.length})
            </span>

            {myActiveChats.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                Sem conversações sob a sua custódia de momento. Atenda um cliente na fila acima.
              </div>
            ) : (
              <div className="space-y-2">
                {myActiveChats.map((s) => {
                  const isSelected = s.sessionId === activeChatId;

                  const translateCategory = (cat: string) => {
                    switch(cat) {
                      case "Fraud": return "Fraude";
                      case "Card": return "Cartão";
                      case "Loan": return "Crédito";
                      case "Account": return "Conta";
                      default: return "Outros";
                    }
                  };

                  return (
                    <button
                      key={s.sessionId}
                      onClick={() => setActiveChatId(s.sessionId)}
                      className={`w-full text-left p-3.5 rounded-xl border transition ${
                        isSelected
                          ? "bg-bank-blue-50/50 border-bank-blue-800 shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-xs text-slate-800 truncate">{s.fullName}</strong>
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {maskPhoneNumber(s.phoneNumber)}
                      </p>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-[9px] font-bold bg-slate-150 text-slate-600 px-1.5 py-0.5 rounded uppercase font-mono">
                          {translateCategory(s.queryCategory)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Ativo há: {Math.floor((Date.now() - (s.chatStartedAt || Date.now())) / 60000)}m
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Other Active Representatives */}
            {otherActiveChats.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2">
                  CASOS ATIVOS DA EQUIPA ({otherActiveChats.length})
                </span>
                <div className="space-y-2 opacity-70">
                  {otherActiveChats.map((s) => {
                    const handlingAgent = agents.find((a) => a.agentId === s.assignedAgentId);
                    return (
                      <div key={s.sessionId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div className="flex justify-between">
                          <strong className="text-slate-700">{s.fullName}</strong>
                          <span className="font-mono text-[10px] text-slate-400">Em Curso</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Assistente Responsável: <span className="font-semibold">{handlingAgent?.name || "Desconhecido"}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Area: ACTIVE CHAT CONSOLE */}
        <div className="flex-1 flex flex-col bg-slate-50">
          {activeSessionDetails ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Active Client Info Banner */}
              <div className="bg-white border-b border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bank-blue-50 border border-bank-blue-100 flex items-center justify-center font-bold text-bank-blue-800">
                    {activeSessionDetails.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      {activeSessionDetails.fullName}
                      {activeSessionDetails.isVip && (
                        <span className="bg-amber-150 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider bg-amber-500 text-black">
                          VIP
                        </span>
                      )}
                    </h5>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                      Contacto Protegido: <strong>{maskPhoneNumber(activeSessionDetails.phoneNumber)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* End active session trigger */}
                  <button
                    onClick={() => onEndChat(activeSessionDetails.sessionId)}
                    className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold px-3 py-2 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <UserX className="w-4 h-4" /> Encerrar Caso
                  </button>
                </div>
              </div>

              {/* Chat message thread container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {activeChatMessages.map((msg, index) => {
                  const isMe = msg.senderType === "agent";
                  if (msg.senderType === "system") {
                    return (
                      <div key={index} className="flex justify-center">
                        <div className="bg-slate-105 border border-dashed border-slate-200 text-slate-500 text-xs py-2 px-4 rounded-xl max-w-md bg-slate-100">
                          <strong>{msg.senderName}: </strong> {msg.text}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={index}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] text-slate-400 px-1 font-mono mb-0.5">
                          {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-xs text-left ${
                            isMe
                              ? "bg-bank-blue-900 text-white rounded-tr-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                          }`}
                        >
                          <p>{msg.text}</p>
                          {msg.fileAttachment && (
                            <div className="mt-2 p-1.5 rounded bg-slate-100/50 border border-slate-200/50 flex items-center gap-1.5 font-mono text-[9px] text-slate-600">
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{msg.fileAttachment.name} (Análise Concluída - Sem Vírus)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply submission bar */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Escreva uma resposta de conformidade profissional..."
                    className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:outline-none border border-slate-200 focus:border-bank-blue-800 transition rounded-xl px-4 text-xs h-10 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="h-10 px-4 bg-bank-blue-800 hover:bg-bank-blue-900 disabled:bg-slate-200 hover:shadow text-white rounded-xl flex items-center gap-1 font-semibold text-xs transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar Mensagem
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3 animate-[pulse_3s_infinite]" />
              <h5 className="font-bold text-slate-700">Canal de Atendimento Inativo</h5>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Atenda um cliente pendente na fila ou escolha um chat existente no seu inbox pessoal para processar as mensagens.
              </p>
            </div>
          )}
        </div>        {/* Right Hand Pane: Canned Statements, Internal CRM Notes, and Chat Transfer */}
        {activeSessionDetails && (
          <div className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-y-auto">
            {/* Canned Responses Tab Panel */}
            <div className="p-4 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5 mb-2.5">
                <Bookmark className="w-4 h-4 text-bank-blue-800" /> Modelos de Conformidade
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {cannedResponses.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => handleCannedInsert(res.text)}
                    className="w-full text-left p-2 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-lg text-[11px] transition text-slate-700 font-sans cursor-pointer"
                  >
                    <strong className="block text-slate-900 text-xs font-bold mb-0.5">{res.title}</strong>
                    <span className="line-clamp-2 italic text-slate-500 text-[10px]">{res.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Internal Representative Notes */}
            <div className="p-4 border-b border-slate-200 flex-1 flex flex-col min-h-48">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5 mb-2">
                <ClipboardList className="w-4 h-4 text-slate-500" /> CRM - Notas Internas do Caso
              </span>

              {/* Note creator */}
              <form onSubmit={handleAddInternalNote} className="flex gap-1.5 mb-3">
                <input
                  type="text"
                  value={internalNoteInput}
                  onChange={(e) => setInternalNoteInput(e.target.value)}
                  placeholder="Nota interna (ex: BI verificado)..."
                  className="flex-1 text-[11px] px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-bank-blue-800 bg-slate-5 font-medium"
                />
                <button
                  type="submit"
                  className="px-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Gravar
                </button>
              </form>

              {/* Notes renderer */}
              <div className="flex-1 bg-slate-50 border border-slate-150 rounded-xl p-3 text-left overflow-y-auto space-y-2 text-xs">
                {(internalNotes[activeSessionDetails.sessionId] || []).length === 0 ? (
                  <p className="text-slate-400 text-[10px] text-center italic mt-4">
                    Histórico de auditoria vazio. Notas internas de verificação do Bilhete de Identidade surgem aqui.
                  </p>
                ) : (
                  (internalNotes[activeSessionDetails.sessionId] || []).map((note, index) => (
                    <div key={index} className="bg-white border border-slate-200 p-2 rounded-lg text-[11px] text-slate-700 shadow-sm leading-relaxed">
                      <span className="text-[9px] font-bold text-bank-blue-800 font-mono block mb-0.5">NOTA NO CRM #{index + 1}</span>
                      {note}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Transfer Drawer Controls */}
            <div className="p-4 bg-slate-50 text-left">
              <span className="text-xs font-bold text-slate-450 uppercase tracking-wider font-mono flex items-center gap-1.5 mb-2.5 text-slate-500">
                <CornerDownRight className="w-4 h-4 text-amber-600" /> Transferência Segura
              </span>

              <form onSubmit={handleTransferSubmit} className="space-y-2">
                <select
                  value={transferTargetAgent}
                  onChange={(e) => setTransferTargetAgent(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-bank-blue-800 rounded bg-white font-medium cursor-pointer"
                  required
                >
                  <option value="">Selecionar Assistente Destinatário...</option>
                  {agents
                    .filter((a) => a.agentId !== selectedAgentId && a.status === AgentStatus.Online)
                    .map((a) => (
                      <option key={a.agentId} value={a.agentId}>
                        {a.name} ({a.status})
                      </option>
                    ))}
                </select>

                <button
                  type="submit"
                  disabled={!transferTargetAgent}
                  className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded transition shadow-sm disabled:bg-slate-300 disabled:opacity-50 cursor-pointer"
                >
                  Transferir Caso com Segurança
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
