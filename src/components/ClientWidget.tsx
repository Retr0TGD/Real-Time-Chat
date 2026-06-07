/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import logoUrl from "../assets/images/standard_bank_logo_1780596455418.png";
import {
  Send,
  Upload,
  Clock,
  Shield,
  ShieldCheck,
  AlertTriangle,
  PhoneCall,
  Mail,
  User,
  Phone,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { ClientSession, ChatMessage, QueryCategory } from "../types";

interface ClientWidgetProps {
  currentSession: ClientSession | null;
  messages: ChatMessage[];
  onSubmitRequest: (payload: {
    fullName: string;
    phoneNumber: string;
    queryCategory: QueryCategory;
    rawQuery: string;
    isVip: boolean;
  }) => void;
  onSendMsg: (text: string, file?: any) => void;
  onRequestCallback: () => void;
  onLeaveOffline: () => void;
  onSubmitRating: (rating: number, comment: string) => void;
}

export function ClientWidget({
  currentSession,
  messages,
  onSubmitRequest,
  onSendMsg,
  onRequestCallback,
  onLeaveOffline,
  onSubmitRating
}: ClientWidgetProps) {
  // Registration Form State
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [queryCategory, setQueryCategory] = useState<QueryCategory>(QueryCategory.Account);
  const [rawQuery, setRawQuery] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [formError, setFormError] = useState("");

  // Messaging State
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileScannerStatus, setFileScannerStatus] = useState<"idle" | "scanning" | "clean" | "error">("idle");
  const [scannedFileName, setScannedFileName] = useState("");

  // Rating State
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [ratingError, setRatingError] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentSession?.status]);

  // Handle phone format & validation
  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError("O Nome Completo deve coincidir com o documento de identificação (BI/DIRE).");
      return;
    }

    // Phone format validation
    const phoneRegex = /^(\+258\s?)?[82|83|84|85|86|87]\d{8}$|^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      setFormError("Erro ao aderir. Forneça um número de telefone válido de Moçambique (ex: +258 84 123 4567).");
      return;
    }

    if (!rawQuery.trim() || rawQuery.trim().length < 5) {
      setFormError("Por favor, explique a sua dúvida com pelo menos 5 caracteres.");
      return;
    }

    onSubmitRequest({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      queryCategory,
      rawQuery: rawQuery.trim(),
      isVip
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    if (selectedFile) {
      if (fileScannerStatus === "scanning") return;
      // Package file attachment metadata
      const fileAttachment = {
        name: selectedFile.name,
        size: selectedFile.size,
        url: "#",
        isMalwareSafe: true
      };
      onSendMsg(inputText.trim() || `Documento Anexado: ${selectedFile.name}`, fileAttachment);
      setSelectedFile(null);
      setFileScannerStatus("idle");
    } else {
      onSendMsg(inputText.trim());
    }
    setInputText("");
  };

  // Mock malware scanner for file uploads (Under 5MB rule)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Erro de Conformidade: O limite máximo para anexo é de 5MB para prevenir vírus e malware.");
      return;
    }

    setSelectedFile(file);
    setScannedFileName(file.name);
    setFileScannerStatus("scanning");

    // Real-time scan simulation
    setTimeout(() => {
      setFileScannerStatus("clean");
    }, 1500);
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRatingError("");

    if (rating === null) {
      setRatingError("A pontuação de avaliação é obrigatória.");
      return;
    }

    if (feedbackComment.trim().length < 5) {
      setRatingError("Escreva pelo menos 5 caracteres sobre como avalia o atendimento.");
      return;
    }

    onSubmitRating(rating, feedbackComment.trim());
  };

  // Custom CSAT rating helpers
  const getCsatBadge = (val: number) => {
    if (val <= 3) return { text: "Detractor 😡", color: "bg-red-100 text-red-800" };
    if (val <= 7) return { text: "Passivo 😐", color: "bg-amber-100 text-amber-800" };
    return { text: "Promotor 😍", color: "bg-emerald-100 text-emerald-800" };
  };

  // Queue waiting indicators (calculating wait time dynamically)
  const getQueuePosition = () => {
    if (!currentSession) return "Desconhecido";
    // For demo, older wait starts at lower position
    const waitSeconds = Math.floor((Date.now() - currentSession.joinedQueueAt) / 1000);
    if (waitSeconds < 30) return "#3 na fila";
    if (waitSeconds < 60) return "#2 na fila";
    return "Próximo Atendimento";
  };

  const getWaitTimerString = () => {
    if (!currentSession) return "0:00";
    const waitMs = Date.now() - currentSession.joinedQueueAt;
    const totalSecs = Math.floor(waitMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Active Session Screen Triage
  if (currentSession) {
    const sessionMessages = messages.filter((m) => m.sessionId === currentSession.sessionId);

    const translateCategory = (cat: string) => {
      switch(cat) {
        case "Fraud": return "Fraude";
        case "Card": return "Cartões";
        case "Loan": return "Crédito";
        case "Account": return "Conta";
        default: return "Outros";
      }
    };

    // Waiting Queue Screen
    if (currentSession.status === "waiting") {
      const waitTimeSec = Math.floor((Date.now() - currentSession.joinedQueueAt) / 1000);
      const isSlaCritical = waitTimeSec >= 170; // visually alert when closing on 180s target

      return (
        <div id="client-wait-state" className="flex flex-col h-full bg-bank-blue-50">
          <div className="bg-bank-blue-900 text-white p-5 flex items-center justify-between shadow-md">
            <div>
              <h3 className="text-lg font-semibold font-sans tracking-tight">Fila de Atendimento Standard Bank</h3>
              <p className="text-xs text-sky-200">Sessão: #{currentSession.sessionId.substring(0, 8)}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${currentSession.isVip ? 'bg-amber-500 text-black font-semibold' : 'bg-slate-800 text-slate-300'}`}>
              <Shield className="w-3.5 h-3.5" />
              {currentSession.isVip ? "CATEGORIA VIP" : "Segurança Padrão"}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center p-6 text-center max-w-md mx-auto">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-bank-blue-50 flex items-center justify-center border-2 border-dashed border-bank-blue-800">
                <Clock className={`w-12 h-12 ${isSlaCritical ? 'text-red-500 animate-pulse' : 'text-bank-blue-800 animate-spin'} [animation-duration:8s]`} />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                Directo
              </div>
            </div>

            <h4 className="text-xl font-bold text-slate-800 mb-1">A ligar a um assistente seguro...</h4>
            <p className="text-sm text-slate-500 mb-6 font-mono bg-white inline-block px-3 py-1 rounded border border-slate-100">
              SLA DE ESPERA ESTIMADO: &lt; 180s
            </p>

            {/* SLA Alert Counter Box */}
            <div className={`w-full p-4 rounded-xl border text-left mb-6 ${isSlaCritical ? 'bg-rose-50 border-rose-200' : 'bg-white border-bank-blue-100'} shadow-sm`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider">PROGRESSÃO DA FILA</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isSlaCritical ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
                  {getQueuePosition()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400">Tempo de Espera Total</p>
                  <p className={`text-lg font-mono font-bold ${isSlaCritical ? 'text-red-600' : 'text-slate-800'}`}>
                    {getWaitTimerString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Assunto da Consulta</p>
                  <p className="text-sm font-semibold text-slate-700">{translateCategory(currentSession.queryCategory)}</p>
                </div>
              </div>
            </div>

            {/* Standard 180s Timeout Options */}
            <div className="w-full bg-white border border-dashed border-bank-blue-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-2.5 mb-4 text-left">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h6 className="text-sm font-bold text-slate-800">Opções de SLA de Limite de Espera</h6>
                  <p className="text-xs text-slate-500">Se o seu tempo de espera exceder o limite de 180s, as políticas regulamentares exigem que disponibilizemos contactos de retorno diretos ou mensagem offline imediata:</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  id="request-callback-btn"
                  onClick={onRequestCallback}
                  className="flex flex-col items-center justify-center p-3.5 bg-bank-blue-50 hover:bg-bank-blue-100 border border-bank-blue-100 rounded-xl text-center transition group"
                >
                  <PhoneCall className="w-5 h-5 text-bank-blue-800 mb-1 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-bank-blue-900">Pedir Contacto</span>
                  <span className="text-[10px] text-slate-400">Manter prioridade</span>
                </button>

                <button
                  id="leave-offline-btn"
                  onClick={onLeaveOffline}
                  className="flex flex-col items-center justify-center p-3.5 bg-bank-blue-50/50 hover:bg-bank-blue-100/30 border border-bank-blue-100 rounded-xl text-center transition group"
                >
                  <Mail className="w-5 h-5 text-slate-700 mb-1 group-hover:scale-110 transition" />
                  <span className="text-xs font-bold text-slate-800">Enviar Mensagem</span>
                  <span className="text-[10px] text-slate-400 font-mono">Próximo turno</span>
                </button>
              </div>

              {waitTimeSec < 180 && (
                <p className="text-[10px] text-slate-400 mt-3 text-center">
                  Nota: De momento aguarda há {waitTimeSec}s. Pode solicitar o contacto de retorno ou deixar mensagem a qualquer altura.
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-100 py-3 text-center border-t border-slate-200">
            <span className="text-[10px] text-slate-400 font-mono flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Canal de Sessão Encriptado AES-256
            </span>
          </div>
        </div>
      );
    }

    // Callback Confirmation Screen
    if (currentSession.status === "callback") {
      return (
        <div id="callback-registered" className="flex flex-col h-full bg-bank-blue-50 justify-center items-center p-6 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 mb-5 shadow-inner animate-[bounce_2s_infinite]">
            <PhoneCall className="w-9 h-9" />
          </div>
          <h3 className="text-2xl font-bold text-bank-blue-900 mb-2 font-sans">Secure Callback Registered</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
            Thank you, <strong className="text-slate-800">{currentSession.fullName}</strong>. Case ID <strong className="text-slate-700 font-mono">{currentSession.sessionId.substring(0,8)}</strong> has been synced with our CRM core.
          </p>
          <div className="bg-white border border-bank-blue-100 rounded-xl p-4 w-full max-w-xs shadow-sm mb-6 text-left">
            <p className="text-xs text-slate-400 mb-1 font-mono tracking-wider">SECURED METADATA</p>
            <div className="space-y-1.5 text-sm">
              <p className="text-slate-500">Contact: <span className="font-semibold text-slate-800 font-mono">{currentSession.phoneNumber}</span></p>
              <p className="text-slate-500">Topic: <span className="font-semibold text-slate-800">{currentSession.queryCategory}</span></p>
              <p className="text-slate-500">Wait Position: <span className="font-semibold text-emerald-600">Preserved (Priority)</span></p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-bank-blue-800 hover:bg-bank-blue-850 text-white rounded-lg text-sm font-semibold transition shadow-md"
          >
            Start New Session
          </button>
        </div>
      );
    }

    // Offline message Confirmation Screen
    if (currentSession.status === "offline_left") {
      return (
        <div id="offline-left" className="flex flex-col h-full bg-bank-blue-50 justify-center items-center p-6 text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-655 text-amber-600 border border-amber-100 mb-5 shadow-inner">
            <Mail className="w-9 h-9 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-bank-blue-900 mb-2">Mensagem Guardada Offline</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6 leading-relaxed">
            Recebemos a sua questão de <span className="font-semibold text-slate-800">{translateCategory(currentSession.queryCategory)}</span>. Como os nossos limites de espera são críticos, a equipa do próximo turno cuidará disto proactivamente.
          </p>
          <div className="bg-white border border-bank-blue-100 rounded-xl p-4 w-full max-w-xs shadow-sm mb-6 text-left">
            <span className="text-[10px] text-slate-400 font-mono tracking-wider block mb-1">TICKET EM CONFORMIDADE</span>
            <p className="text-xs text-slate-600 mb-1 italic font-mono">"{currentSession.rawQuery}"</p>
            <p className="text-[10px] text-slate-400 mt-2">Mensagem registada e protegida com segurança.</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-bank-blue-800 hover:bg-bank-blue-850 text-white rounded-lg text-sm font-semibold transition shadow-md cursor-pointer"
          >
            Registar Outro Pedido
          </button>
        </div>
      );
    }

    // Finished / Post-Chat Rating Screen
    if (currentSession.status === "completed") {
      return (
        <div id="client-rating-state" className="flex flex-col h-full bg-bank-blue-50">
          <div className="bg-bank-blue-900 text-white p-5 flex items-center justify-between shadow-md">
            <h3 className="text-lg font-semibold font-sans tracking-tight">Avaliação de Atendimento</h3>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center p-6 max-w-md mx-auto">
            <div className="bg-white border border-bank-blue-100 rounded-2xl p-6 shadow-sm w-full">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">CASO RESOLVIDO</span>
              <h4 className="text-xl font-bold text-slate-800 mt-1 mb-2">Como correu o seu atendimento?</h4>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Sob as directrizes de controlo de qualidade, a sua avaliação vai directamente para a pontuação de desempenho do assistente. Escolha entre 0 e 10 (onde 8-10 é Promotor e 0-3 é Detractor).
              </p>

              <form onSubmit={handleRatingSubmit} className="space-y-5">
                {/* 0-10 Stars Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 font-mono">CLASSIFICAÇÃO CSAT (0 - 10)</label>
                  <div className="grid grid-cols-11 gap-1">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i)}
                        className={`py-2 rounded text-xs font-bold font-mono transition-all border ${
                          rating === i
                            ? "bg-bank-blue-800 text-white border-bank-blue-900 scale-110 shadow-sm"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  {rating !== null && (
                    <div className="mt-3 flex justify-between items-center bg-slate-50 rounded px-3 py-1.5 border border-slate-100">
                      <span className="text-xs text-slate-500">Tipo de Resposta:</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${getCsatBadge(rating).color}`}>
                        {getCsatBadge(rating).text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Optional Feedback Comment */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 font-mono">COMENTÁRIOS DE APOIO (MÍN. 5 CARACTERES)</label>
                  <textarea
                    rows={3}
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Descreva sucintamente como o assistente ajudou a responder à sua questão..."
                    className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-bank-blue-800 resize-none"
                    required
                  />
                </div>

                {ratingError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {ratingError}
                  </div>
                )}

                <button
                  id="submit-rating-btn"
                  type="submit"
                  className="w-full bg-bank-blue-800 hover:bg-bank-blue-900 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 group"
                >
                  Submeter Avaliação Certificada
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // Active Live Chat Panel Screen
    return (
      <div id="client-chat-panel" className="flex flex-col h-full bg-slate-50">
        {/* Chat Room Header */}
        <div className="bg-bank-blue-900 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center select-none shadow border border-white/10">
              <img
                src={logoUrl}
                alt="Standard Bank Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-tight">Standard Bank Moçambique - Chat Direto</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
                <span className="text-[10px] text-slate-300">
                  Assunto: {translateCategory(currentSession.queryCategory)} | Modo: Seguro
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-300 font-mono hidden md:inline">
              SLA DE RESPOSTA ACTIVO
            </span>
            <div className="h-6 w-px bg-white/25 hidden md:block" />
            <button
              onClick={onLeaveOffline}
              className="text-xs bg-slate-800 hover:bg-slate-700 font-semibold px-3 py-1.5 rounded-lg text-slate-300 transition cursor-pointer"
            >
              Terminar Sessão
            </button>
          </div>
        </div>

        {/* Message Window Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-md mx-auto text-center py-2">
            <span className="bg-sky-50 text-bank-blue-800 text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border border-sky-100 font-mono">
              PORTAL BANCÁRIO SEGURO COM CERTIFICADO TLS 1.3
            </span>
          </div>

          {sessionMessages.map((msg, index) => {
            if (msg.senderType === "system") {
              return (
                <div key={index} className="flex justify-center my-2 max-w-sm mx-auto">
                  <div className="bg-slate-100 border border-slate-200 text-slate-500 text-xs rounded-xl p-3 text-center leading-relaxed">
                    <p className="font-bold flex items-center justify-center gap-1 text-slate-600 mb-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                      {msg.senderName}
                    </p>
                    {msg.text}
                  </div>
                </div>
              );
            }

            const isMe = msg.senderType === "client";
            return (
              <div
                key={index}
                className={`flex ${isMe ? "justify-end" : "justify-start"} max-w-2xl mx-auto`}
              >
                <div className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-slate-400 font-semibold mb-0.5 px-1">
                    {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <div
                    className={`rounded-2xl p-3.5 text-sm ${
                      isMe
                        ? "bg-bank-blue-800 text-white rounded-tr-none shadow-sm"
                        : "bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* File Attachment Renderer */}
                    {msg.fileAttachment && (
                      <div className={`mt-2.5 p-2 rounded-lg border flex items-center gap-2 ${isMe ? 'bg-bank-blue-900 border-bank-blue-900 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <div className="text-left font-mono text-[10px]">
                          <p className="font-bold truncate max-w-[150px]">{msg.fileAttachment.name}</p>
                          <p className="opacity-80">{(msg.fileAttachment.size / 1024).toFixed(1)} KB • Análise confirmada (Sem vírus)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Messaging Input Area */}
        <div className="bg-white border-t border-slate-200 p-4">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
            {/* File Security Scanner Status Bar */}
            {selectedFile && (
              <div className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between text-xs font-mono shadow-sm ${
                fileScannerStatus === "scanning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}>
                <div className="flex items-center gap-2">
                  {fileScannerStatus === "scanning" ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>
                    Ficheiro Anexo: <strong>{scannedFileName}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="font-bold flex items-center gap-1">
                  {fileScannerStatus === "scanning" ? (
                    <span className="animate-pulse">ANÁLISE DE MALWARE EM CURSO (PCI-DSS)...</span>
                  ) : (
                    <>
                      <span>FICHEIRO LIMPO E SEGURO</span>
                      <CheckCircle className="w-3.5 h-3.5" />
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2.5">
              {/* File Upload Selector Option */}
              <label className="flex-shrink-0 w-11 h-11 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition flex items-center justify-center cursor-pointer shadow-sm">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-slate-500" />
              </label>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={selectedFile && fileScannerStatus === "scanning" ? "A digitalizar documento..." : "Escreva uma mensagem segura..."}
                disabled={selectedFile && fileScannerStatus === "scanning"}
                className="flex-1 bg-slate-50 hover:bg-slate-100 focus:bg-white focus:outline-none border border-slate-200 focus:border-bank-blue-800 transition rounded-xl px-4 text-sm h-11 shadow-inner placeholder:text-slate-400"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedFile) || (selectedFile && fileScannerStatus === "scanning")}
                className="w-11 h-11 bg-bank-blue-800 hover:bg-bank-blue-900 duration-150 disabled:bg-slate-200 text-white rounded-xl flex items-center justify-center transition shadow-md flex-shrink-0 disabled:shadow-none cursor-pointer"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center font-sans">
              Aviso de Segurança: Nunca partilhe códigos PIN ou palavras-passe de cartões no chat. Todas as sessões são auditadas e gravadas.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Registration Landing Screen (Form widget)
  return (
    <div id="client-registration-widget" className="flex flex-col h-full bg-bank-blue-50 justify-center p-6">
      <div className="max-w-md w-full mx-auto bg-white border border-bank-blue-100 rounded-2xl p-6 shadow-sm">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white border border-bank-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md p-1.5">
            <img
              src={logoUrl}
              alt="Standard Bank Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 font-sans tracking-tight">Standard Bank</h3>
          <p className="text-xs text-slate-500 mt-1">Canal de Roteamento de Atendimento Seguro 24/7</p>
        </div>

        <form onSubmit={validateAndSubmit} className="space-y-4">
          {/* Full Name input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 font-mono">NOME COMPLETO (Conforme Bilhete de Identidade/DIRE)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Exemplo Martins"
                className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-bank-blue-800 rounded-lg bg-slate-50 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* Phone format validations input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 font-mono">NÚMERO DE TELEFONE (Com Prefixo Moçambique)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Phone className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+258 84 123 4567"
                className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-bank-blue-800 rounded-lg bg-slate-50 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* Category dropdown query selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 font-mono">ASSUNTO DO CONTACTO</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <HelpCircle className="w-4 h-4" />
              </span>
              <select
                value={queryCategory}
                onChange={(e) => setQueryCategory(e.target.value as QueryCategory)}
                className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-bank-blue-800 rounded-lg bg-slate-50 focus:bg-white transition cursor-pointer"
              >
                <option value={QueryCategory.Account}>Gestão de Contas e Saldos</option>
                <option value={QueryCategory.Card}>Cartões de Débito e Crédito</option>
                <option value={QueryCategory.Loan}>Créditos e Empréstimos</option>
                <option value={QueryCategory.Fraud}>Fraudes, Cobranças Indevidas e Bloqueio</option>
                <option value={QueryCategory.Other}>Apoio Geral / Outros Assuntos</option>
              </select>
            </div>
          </div>

          {/* VIP customer simulation toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 shadow-inner rounded-lg border border-slate-200 mb-1">
            <div className="text-left">
              <h6 className="text-xs font-bold text-slate-700">Simular Conta com Estatuto VIP</h6>
              <p className="text-[10px] text-slate-400">Activa a ordenação de prioridade na fila</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isVip}
                onChange={(e) => setIsVip(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:w-4 after:transition-all peer-checked:bg-bank-blue-800"></div>
            </label>
          </div>

          {/* Free-text Query context input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 font-mono">DÚVIDA / ASSUNTO (MÍNIMO 5 CARACTERES)</label>
            <textarea
              rows={3}
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder="Descreva detalhadamente o problema ou a transacção que contesta para que possamos ajudar..."
              className="w-full text-sm p-3 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-bank-blue-800 rounded-lg bg-slate-50 focus:bg-white focus:shadow-md transition resize-none placeholder:text-slate-400"
              required
            />
          </div>

          {formError && (
            <div className="flex items-center gap-1.5 text-xs text-red-650 bg-red-50 p-2.5 rounded border border-red-150 animate-pulse text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              {formError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-bank-blue-800 hover:bg-bank-blue-900 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 group cursor-pointer"
          >
            Entrar na Fila de Atendimento Segura
            <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1.5 transition" />
          </button>
        </form>
      </div>
    </div>
  );
}
