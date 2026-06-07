/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import {
  QueryCategory,
  SessionStatus,
  AgentStatus,
  ClientSession,
  ChatMessage,
  Agent,
  CallCenterState
} from "./src/types";

// Setup server and variables
const app = express();
const server = http.createServer(app);
const PORT = 3000;

// Parse JSON payloads
app.use(express.json());

// Lazy-initialization of Gemini SDK client
let aiInstance: GoogleGenAI | null = null;
function getGeminiAi(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// -----------------------------------------------------------------------------
// Call Center Server-Authoritative State Setup
// -----------------------------------------------------------------------------

// Active state
const state: CallCenterState = {
  sessions: [
    {
      sessionId: "session-1",
      fullName: "João Mabunda",
      phoneNumber: "+258 84 123 4567",
      queryCategory: QueryCategory.Fraud,
      rawQuery: "O meu cartão foi cobrado em MZN 15.000 numa cidade que nunca visitei, por favor bloqueiem o cartão.",
      status: SessionStatus.Waiting,
      joinedQueueAt: Date.now() - 150000, // 2.5 minutes ago (triggers supervisor alert soon!)
      assignedAgentId: null,
      chatStartedAt: null,
      chatEndedAt: null,
      rating: null,
      feedbackText: null,
      isVip: true,
    },
    {
      sessionId: "session-2",
      fullName: "Sofia Tembe",
      phoneNumber: "+258 82 987 6543",
      queryCategory: QueryCategory.Card,
      rawQuery: "Preciso de encomendar um cartão de débito de substituição porque perdi o meu anterior.",
      status: SessionStatus.Waiting,
      joinedQueueAt: Date.now() - 35000, // 35 seconds ago
      assignedAgentId: null,
      chatStartedAt: null,
      chatEndedAt: null,
      rating: null,
      feedbackText: null,
      isVip: false,
    },
  ],
  agents: [
    {
      agentId: "emp_101",
      name: "Sara Januário",
      status: AgentStatus.Online,
      chatsHandledCount: 42,
      totalRatingPoints: 378,
      ratingsCount: 42,
      averageRating: 9.0,
      adherenceSeconds: 15600,
      chatsPerHour: 2.8,
    },
    {
      agentId: "emp_102",
      name: "Afonso Ribas",
      status: AgentStatus.Away,
      chatsHandledCount: 29,
      totalRatingPoints: 261,
      ratingsCount: 30,
      averageRating: 8.7,
      adherenceSeconds: 12100,
      chatsPerHour: 2.1,
    },
    {
      agentId: "emp_103",
      name: "Miguel Chindombe",
      status: AgentStatus.Busy,
      chatsHandledCount: 51,
      totalRatingPoints: 495,
      ratingsCount: 51,
      averageRating: 9.7,
      adherenceSeconds: 16800,
      chatsPerHour: 3.4,
    },
    {
      agentId: "emp_104",
      name: "Elena Tembe (Suporte IA)",
      status: AgentStatus.Online,
      chatsHandledCount: 124,
      totalRatingPoints: 1165,
      ratingsCount: 124,
      averageRating: 9.4,
      adherenceSeconds: 28800,
      chatsPerHour: 5.2,
    },
  ],
  messages: [],
};

// Historical ratings / audit logs for reports
const historicalLogs: Array<{
  session_id: string;
  client_name_masked: string;
  client_phone_hash: string;
  agent_id: string;
  query_category: QueryCategory;
  queue_wait_seconds: number;
  chat_duration_seconds: number;
  rating: number;
  feedback_text: string;
  timestamp: number;
}> = [
  {
    session_id: "hist-001",
    client_name_masked: "M****l A*****o",
    client_phone_hash: crypto.createHash("sha256").update("+258843334444").digest("hex"),
    agent_id: "emp_101",
    query_category: QueryCategory.Account,
    queue_wait_seconds: 45,
    chat_duration_seconds: 420,
    rating: 9,
    feedback_text: "A Sara resolveu a minha questão de facturação rapidamente e explicou o desconto de débito directo.",
    timestamp: Date.now() - 86400000,
  },
  {
    session_id: "hist-002",
    client_name_masked: "L***a P****s",
    client_phone_hash: crypto.createHash("sha256").update("+258825556666").digest("hex"),
    agent_id: "emp_103",
    query_category: QueryCategory.Fraud,
    queue_wait_seconds: 12,
    chat_duration_seconds: 680,
    rating: 10,
    feedback_text: "Equipa absolutamente estelar, bloquearam o meu cartão de débito comprometido em menos de 5 minutos.",
    timestamp: Date.now() - 172800000,
  },
  {
    session_id: "hist-003",
    client_name_masked: "D***d K***o",
    client_phone_hash: crypto.createHash("sha256").update("+258847778888").digest("hex"),
    agent_id: "emp_102",
    query_category: QueryCategory.Loan,
    queue_wait_seconds: 172,
    chat_duration_seconds: 280,
    rating: 6,
    feedback_text: "O tempo de espera foi muito próximo do limite de 3 minutos, mas o assistente Afonso foi simpático e eficiente.",
    timestamp: Date.now() - 259200000,
  },
  {
    session_id: "hist-004",
    client_name_masked: "H****a L***a",
    client_phone_hash: crypto.createHash("sha256").update("+258829990000").digest("hex"),
    agent_id: "emp_101",
    query_category: QueryCategory.Card,
    queue_wait_seconds: 185, // Breached wait SLA
    chat_duration_seconds: 190,
    rating: 3,
    feedback_text: "A espera demorou muito tempo! Quase que desisti da chamada. Terrível adesão de SLA de atendimento.",
    timestamp: Date.now() - 345600000,
  },
];

// Offline lead submissions
const offlineLeads: Array<{
  name: string;
  phone: string;
  queryCategory: string;
  message: string;
  submittedAt: number;
}> = [];

// -----------------------------------------------------------------------------
// WebSocket Server Configuration
// -----------------------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

// Active WS connections with role metadata
const wsClients = new Map<WebSocket, { role: string; viewSessionId?: string }>();

function broadcastStateUpdate() {
  const payload = JSON.stringify({
    type: "sync",
    state,
    offlineLeads,
    historicalLogs,
  });
  for (const [ws] of wsClients.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on("connection", (ws) => {
  wsClients.set(ws, { role: "guest" });

  // Send initial data sync
  ws.send(
    JSON.stringify({
      type: "sync",
      state,
      offlineLeads,
      historicalLogs,
    })
  );

  ws.on("message", (rawMsg) => {
    try {
      const data = JSON.parse(rawMsg.toString());
      if (data.type === "register") {
        wsClients.set(ws, { role: data.role, viewSessionId: data.sessionId });
      }
    } catch (e) {
      console.error("WS Message Error:", e);
    }
  });

  ws.on("close", () => {
    wsClients.delete(ws);
  });
});

// Upgrade handling
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// -----------------------------------------------------------------------------
// Client API Routes
// -----------------------------------------------------------------------------

// Submit initial chat widget request
app.post("/api/chat/submit", (req, res) => {
  const { fullName, phoneNumber, queryCategory, rawQuery, isVip } = req.body;

  if (!fullName || !phoneNumber || !queryCategory || !rawQuery) {
    return res.status(400).json({ error: "All fields are mandatory" });
  }

  const newSession: ClientSession = {
    sessionId: crypto.randomUUID(),
    fullName,
    phoneNumber,
    queryCategory,
    rawQuery,
    status: SessionStatus.Waiting,
    joinedQueueAt: Date.now(),
    assignedAgentId: null,
    chatStartedAt: null,
    chatEndedAt: null,
    rating: null,
    feedbackText: null,
    isVip: !!isVip,
  };

  state.sessions.push(newSession);

  // Trigger system message for newly joined client
  const welcomeMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: newSession.sessionId,
    senderType: "system",
    senderName: "Sistema",
    text: `Bem-vindo ao canal de Atendimento do Standard Bank Moçambique. A sua posição na fila de espera está assegurada. O tempo estimado de resposta é inferior a 180 segundos.`,
    timestamp: Date.now(),
  };
  state.messages.push(welcomeMsg);

  broadcastStateUpdate();
  res.json({ success: true, session: newSession });
});

// Post action: Request Callback (to comply with 180s timeout options)
app.post("/api/chat/callback", (req, res) => {
  const { sessionId } = req.body;
  const session = state.sessions.find((s) => s.sessionId === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  session.status = SessionStatus.Callback;
  session.callbackAssignedAt = Date.now();

  const mockSystemMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: session.sessionId,
    senderType: "system",
    senderName: "Sistema",
    text: `Pedido de contacto agendado com sucesso. Um assistente entrará em contacto para o número ${session.phoneNumber} assim que possível, mantendo a sua preferência na fila de espera.`,
    timestamp: Date.now(),
  };
  state.messages.push(mockSystemMsg);

  broadcastStateUpdate();
  res.json({ success: true, session });
});

// Post action: Leave Offline Message
app.post("/api/chat/offline-leave", (req, res) => {
  const { sessionId } = req.body;
  const session = state.sessions.find((s) => s.sessionId === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  session.status = SessionStatus.OfflineLeft;

  offlineLeads.push({
    name: session.fullName,
    phone: session.phoneNumber,
    queryCategory: session.queryCategory,
    message: session.rawQuery,
    submittedAt: Date.now(),
  });

  const mockSystemMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: session.sessionId,
    senderType: "system",
    senderName: "Sistema",
    text: `Optou por deixar uma mensagem offline. Os seus detalhes e a sua mensagem foram registados e atribuídos para tratamento prioritário pela equipa do próximo turno. Obrigado!`,
    timestamp: Date.now(),
  };
  state.messages.push(mockSystemMsg);

  broadcastStateUpdate();
  res.json({ success: true, session });
});

// Send Chat Message (Real-Time)
app.post("/api/chat/send", async (req, res) => {
  const { sessionId, senderType, senderName, text, fileAttachment } = req.body;

  const session = state.sessions.find((s) => s.sessionId === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const newMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId,
    senderType,
    senderName,
    text,
    timestamp: Date.now(),
    fileAttachment,
  };

  state.messages.push(newMsg);
  broadcastStateUpdate();

  // If Client sends message, and assigned agent is "emp_104" (AI agent role),
  // we trigger real-time AI reply using Gemini on the backup thread!
  if (senderType === "client" && session.assignedAgentId === "emp_104") {
    setTimeout(async () => {
      await generateAIReply(session, text);
    }, 1500);
  }

  res.json({ success: true, message: newMsg });
});

// Post-chat rating & feedback submission (0-10 scale)
app.post("/api/chat/rate", (req, res) => {
  const { sessionId, rating, feedbackText } = req.body;

  const session = state.sessions.find((s) => s.sessionId === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (rating === undefined || rating < 0 || rating > 10) {
    return res.status(400).json({ error: "Rating must be between 0 and 10 stars." });
  }

  session.rating = rating;
  session.feedbackText = feedbackText || "";
  session.status = SessionStatus.Completed;

  // Track rating onto agent metrics if exists
  if (session.assignedAgentId) {
    const agent = state.agents.find((a) => a.agentId === session.assignedAgentId);
    if (agent) {
      agent.chatsHandledCount += 1;
      agent.totalRatingPoints += rating;
      agent.ratingsCount += 1;
      agent.averageRating = Number((agent.totalRatingPoints / agent.ratingsCount).toFixed(1));
    }

    // Hash phone number and mask name for audit logs
    const maskedName = session.fullName
      .split(" ")
      .map((part) => (part.length > 2 ? part[0] + "*".repeat(part.length - 2) + part[part.length - 1] : part[0] + "*"))
      .join(" ");

    const clientPhoneHash = crypto.createHash("sha256").update(session.phoneNumber).digest("hex");

    historicalLogs.push({
      session_id: session.sessionId,
      client_name_masked: maskedName,
      client_phone_hash: clientPhoneHash,
      agent_id: session.assignedAgentId,
      query_category: session.queryCategory,
      queue_wait_seconds: Math.floor(((session.chatStartedAt || Date.now()) - session.joinedQueueAt) / 1000),
      chat_duration_seconds: Math.floor(((session.chatEndedAt || Date.now()) - (session.chatStartedAt || Date.now())) / 1000),
      rating,
      feedback_text: feedbackText || "",
      timestamp: Date.now(),
    });
  }

  broadcastStateUpdate();
  res.json({ success: true, session });
});

// -----------------------------------------------------------------------------
// Agent & Operations API Routes
// -----------------------------------------------------------------------------

// Toggle / update Agent Status
app.post("/api/agent/status", (req, res) => {
  const { agentId, status } = req.body;
  const agent = state.agents.find((a) => a.agentId === agentId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }

  agent.status = status;
  broadcastStateUpdate();
  res.json({ success: true, agent });
});

// Agent Assigns/Pickup chat session from queue
app.post("/api/agent/pickup", (req, res) => {
  const { sessionId, agentId } = req.body;
  const session = state.sessions.find((s) => s.sessionId === sessionId);
  const agent = state.agents.find((a) => a.agentId === agentId);

  if (!session || !agent) {
    return res.status(404).json({ error: "Session or Agent not found" });
  }

  session.status = SessionStatus.Active;
  session.assignedAgentId = agentId;
  session.chatStartedAt = Date.now();

  agent.status = AgentStatus.Busy;

  const getPortugueseCategory = (cat: string) => {
    switch(cat) {
      case "Fraud": return "Fraude";
      case "Card": return "Cartões";
      case "Loan": return "Crédito";
      case "Account": return "Conta";
      default: return "Outros";
    }
  };

  // System notification of pickup
  const pickupMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: session.sessionId,
    senderType: "system",
    senderName: "Sistema",
    text: `O assistente ${agent.name} entrou na conversa para ajudar a resolver o seu pedido sobre ${getPortugueseCategory(session.queryCategory)}.`,
    timestamp: Date.now(),
  };
  state.messages.push(pickupMsg);

  broadcastStateUpdate();
  res.json({ success: true, session });
});

// Change/Transfer Chat to another active agent
app.post("/api/agent/transfer", (req, res) => {
  const { sessionId, currentAgentId, targetAgentId } = req.body;

  const session = state.sessions.find((s) => s.sessionId === sessionId);
  const fromAgent = state.agents.find((a) => a.agentId === currentAgentId);
  const toAgent = state.agents.find((a) => a.agentId === targetAgentId);

  if (!session || !fromAgent || !toAgent) {
    return res.status(404).json({ error: "Entidades não encontradas para transferência" });
  }

  session.assignedAgentId = targetAgentId;

  // Refresh old agent to Online or other free status
  fromAgent.status = AgentStatus.Online;
  toAgent.status = AgentStatus.Busy;

  const systemTransferMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: session.sessionId,
    senderType: "system",
    senderName: "Sistema",
    text: `Esta conversa foi transferida em segurança para o assistente ${toAgent.name}. Por favor, aguarde um breve momento para sincronização de contexto.`,
    timestamp: Date.now(),
  };
  state.messages.push(systemTransferMsg);

  broadcastStateUpdate();
  res.json({ success: true, session });
});

// Terminate or end chat session
app.post("/api/agent/end", (req, res) => {
  const { sessionId } = req.body;
  const session = state.sessions.find((s) => s.sessionId === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Sessão não encontrada" });
  }

  session.status = SessionStatus.Completed;
  session.chatEndedAt = Date.now();

  // Reset agent to Online
  if (session.assignedAgentId) {
    const agent = state.agents.find((a) => a.agentId === session.assignedAgentId);
    if (agent) {
      agent.status = AgentStatus.Online;
    }
  }

  const endMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: session.sessionId,
    senderType: "system",
    senderName: "Sistema",
    text: `O assistente terminou esta sessão de chat. Por favor, classifique a sua experiência de atendimento no formulário exibido.`,
    timestamp: Date.now(),
  };
  state.messages.push(endMsg);

  broadcastStateUpdate();
  res.json({ success: true, session });
});

// Supervisor Live Listening Silently
app.post("/api/supervisor/listen", (req, res) => {
  // Silent listening is tracked on server payload. Client or agent receives no notification.
  // We can return details or broadcast stats if needed.
  res.json({ success: true, msg: "Conexão de escuta silenciosa autenticada com sucesso" });
});

// Trigger Mock Queue Traffic (Simulates live call center workload)
app.post("/api/simulator/seed-traffic", (req, res) => {
  const names = [
    "Delfina Muthemba",
    "Celso Mandlate",
    "Amara Chilengue",
    "Inácio Langa",
    "Gisela Macuácua",
  ];
  const questions = [
    "Detetei um movimento não autorizado na minha conta de MZN 7.500 no terminal POS.",
    "Qual é a taxa de juro actual (Spread) para o crédito à habitação?",
    "Preciso de repor a minha chave de acesso/PIN do aplicativo móvel Standard Bank.",
    "É possível efectuar uma transferência internacional por SWIFT para Portugal sem ir pessoalmente à agência?",
    "Consigo utilizar o meu cartão de débito internacional na África do Sul na próxima semana?",
  ];
  const categories = [
    QueryCategory.Fraud,
    QueryCategory.Loan,
    QueryCategory.Account,
    QueryCategory.Account,
    QueryCategory.Card,
  ];

  const randomIndex = Math.floor(Math.random() * names.length);
  const mockSess: ClientSession = {
    sessionId: crypto.randomUUID(),
    fullName: names[randomIndex],
    phoneNumber: `+258 ${["84", "82", "85", "87"][Math.floor(Math.random() * 4)]} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
    queryCategory: categories[randomIndex],
    rawQuery: questions[randomIndex],
    status: SessionStatus.Waiting,
    joinedQueueAt: Date.now(),
    assignedAgentId: null,
    chatStartedAt: null,
    chatEndedAt: null,
    rating: null,
    feedbackText: null,
    isVip: Math.random() > 0.5,
  };

  state.sessions.push(mockSess);

  const welcomeMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: mockSess.sessionId,
    senderType: "system",
    senderName: "Sistema",
    text: `Bem-vindo ao Atendimento Standard Bank Moçambique. O seu lugar na fila foi registado sob directivas de conformidade de SLA de atendimento.`,
    timestamp: Date.now(),
  };
  state.messages.push(welcomeMsg);

  broadcastStateUpdate();
  res.json({ success: true, session: mockSess });
});

// Fast-forward Queue wait times for simulations (by 45 seconds)
app.post("/api/simulator/fast-forward", (req, res) => {
  state.sessions.forEach((s) => {
    if (s.status === SessionStatus.Waiting) {
      s.joinedQueueAt -= 45000; // Shift back 45 seconds to force-age wait time limits
    }
  });
  broadcastStateUpdate();
  res.json({ success: true, sessions: state.sessions });
});

// Reset Call Center application mock state to default values
app.post("/api/simulator/clear", (req, res) => {
  state.sessions = [
    {
      sessionId: "session-1",
      fullName: "João Mabunda",
      phoneNumber: "+258 84 123 4567",
      queryCategory: QueryCategory.Fraud,
      rawQuery: "O meu cartão foi cobrado em MZN 15.000 numa cidade que nunca visitei, por favor bloqueiem o cartão.",
      status: SessionStatus.Waiting,
      joinedQueueAt: Date.now() - 150000,
      assignedAgentId: null,
      chatStartedAt: null,
      chatEndedAt: null,
      rating: null,
      feedbackText: null,
      isVip: true,
    },
    {
      sessionId: "session-2",
      fullName: "Sofia Tembe",
      phoneNumber: "+258 82 987 6543",
      queryCategory: QueryCategory.Card,
      rawQuery: "Preciso de encomendar um cartão de débito de substituição porque perdi o meu anterior.",
      status: SessionStatus.Waiting,
      joinedQueueAt: Date.now() - 35000,
      assignedAgentId: null,
      chatStartedAt: null,
      chatEndedAt: null,
      rating: null,
      feedbackText: null,
      isVip: false,
    },
  ];
  state.messages = [];
  state.agents.forEach((ag) => {
    if (ag.agentId === "emp_101") ag.status = AgentStatus.Online;
    if (ag.agentId === "emp_102") ag.status = AgentStatus.Away;
    if (ag.agentId === "emp_103") ag.status = AgentStatus.Busy;
    if (ag.agentId === "emp_104") ag.status = AgentStatus.Online;
  });
  offlineLeads.length = 0;
  broadcastStateUpdate();
  res.json({ success: true, state });
});

// -----------------------------------------------------------------------------
// Gemini AI Server Grounding & Intelligent Call Center Features
// -----------------------------------------------------------------------------

async function generateAIReply(session: ClientSession, customerMessage: string) {
  const ai = getGeminiAi();
  if (!ai) {
    // Local fallback reply if API key is not registered in Secrets yet
    addSystemReply(
      session,
      `[Assistente IA Offline Elena]: Conexão segura estabelecida. Estamos a processar o seu pedido relativo a "${session.queryCategory}" de imediato. Estado de segurança: Encriptado e Seguro.`
    );
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Você é a Elena Tembe, uma assistente virtual de inteligência artificial de apoio ao cliente profissional do Standard Bank Moçambique.
      O utilizador contactou-nos sobre a categoria "${session.queryCategory}". Detalhes adicionais da questão inicial: "${session.rawQuery}".
      Nome do cliente: ${session.fullName}. Telefone: ${session.phoneNumber}.
      Todas as moedas devem ser representadas em Meticais de Moçambique (MZN).
      Eles acabaram de enviar esta mensagem: "${customerMessage}".
      Forneça uma resposta curta, ultra-realista e profissional (no máximo 2-3 frases) em PORTUGUÊS para ajudar a responder, orientar ou acolher o cliente. Seja extremamente reassuring, fale como um assistente de segurança bancária e mantenha todas as regras de conformidade e privacidade de dados. Não invente credenciais nem dados sensíveis de forma alguma.`,
      config: {
        systemInstruction: "Você é a Elena Tembe, assistente virtual sénior do Standard Bank Moçambique. Responda de forma prestável, natural e altamente profissional em Português.",
      },
    });

    const replyText = response.text || "Os nossos sistemas centrais registaram a sua mensagem. Como posso ajudar ainda mais com este caso?";
    addSystemReply(session, replyText);
  } catch (err) {
    console.error("Gemini Generation Error:", err);
    addSystemReply(
      session,
      `[Assistente IA Elena]: Mensagem recebida. Estou a verificar os nossos serviços internos no Standard Bank Moçambique relativamente ao seu pedido.`
    );
  }
}

function addSystemReply(session: ClientSession, text: string) {
  const aiMsg: ChatMessage = {
    messageId: crypto.randomUUID(),
    sessionId: session.sessionId,
    senderType: "agent",
    senderName: "Elena Tembe (Suporte IA)",
    text,
    timestamp: Date.now(),
  };
  state.messages.push(aiMsg);
  broadcastStateUpdate();
}

// Supervisor endpoint to leverage Gemini for extracting feedback topics from database
app.post("/api/supervisor/extract-themes", async (req, res) => {
  const feedbacks = historicalLogs.map((log) => log.feedback_text).filter(Boolean);
  if (feedbacks.length === 0) {
    return res.json({ themes: [] });
  }

  const ai = getGeminiAi();
  if (!ai) {
    // Robust mock fallback
    return res.json({
      themes: [
        { theme: "Tempo de espera próximo do limite de SLA de 3 min", type: "negative", volume: 2 },
        { theme: "Bloqueio e segurança de cartões em situações de fraude", type: "positive", volume: 1 },
        { theme: "Esclarecimentos sobre os canais digitais e balcões", type: "positive", volume: 1 },
      ],
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Avalie a seguinte lista de comentários/feedbacks de clientes recolhidos no portal de chat do nosso banco.
      Extraia os top 3-5 temas mais recorrentes em PORTUGUÊS. Para cada tema, defina se o sentimento é positivo ou negativo, e indique a contagem/volume de ocorrências detetadas.
      Feedbacks: ${JSON.stringify(feedbacks)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              theme: { type: Type.STRING, description: "Theme name translated into Portuguese" },
              type: { type: Type.STRING, description: "Either 'positive' or 'negative'" },
              volume: { type: Type.INTEGER, description: "Extracted occurrence count" },
            },
            required: ["theme", "type", "volume"],
          },
        },
      },
    });

    let themes = [];
    try {
      themes = JSON.parse(response.text?.trim() || "[]");
    } catch {
      themes = [];
    }

    res.json({ themes });
  } catch (error) {
    console.error("Theme Extraction Error:", error);
    res.json({
      themes: [
        { theme: "Tempo de espera próximo do limite de SLA de 3 min", type: "negative", volume: 2 },
        { theme: "Substituição de cartões e segurança contra fraudes", type: "positive", volume: 2 },
      ],
    });
  }
});

// -----------------------------------------------------------------------------
// Real-time SLA Background Task Tick
// -----------------------------------------------------------------------------
// Automatically checks queue waiting times and reassignments every 4 seconds.
setInterval(() => {
  const now = Date.now();
  let stateChanged = false;

  state.sessions.forEach((session) => {
    // If waiting and wait time exceeds 180 seconds, prompt fallback option automatically in messages if not already prompted
    if (session.status === SessionStatus.Waiting) {
      const waitTimeMs = now - session.joinedQueueAt;

      // Rule: Offer Keep waiting/callback/leave after 180 seconds (or for simulation, 90 seconds speeds up showcase!)
      // Let's use 180 seconds as strict requirement. To make it comfortable to test, let's keep the threshold exactly at 180s.
      // If wait time is > 180s and they haven't been notified yet:
      const checkNotifyThreshold = 180000;
      const alreadyPrompted = state.messages.some(
        (m) => m.sessionId === session.sessionId && m.text.includes("tempo limite de SLA")
      );

      if (waitTimeMs >= checkNotifyThreshold && !alreadyPrompted) {
        state.messages.push({
          messageId: crypto.randomUUID(),
          sessionId: session.sessionId,
          senderType: "system",
          senderName: "Alerta de SLA",
          text: `AVISO: O nosso tempo limite de SLA padrão de 180s na fila de espera foi atingido. Para sua segurança e comodidade, disponibilizamos as seguintes opções: (1) Continuar na fila activa, (2) Solicitar contacto telefónico seguro para o número ${session.phoneNumber}, ou (3) Deixar uma mensagem offline em segurança para tratamento na próxima rotação de equipa.`,
          timestamp: Date.now(),
        });
        stateChanged = true;
      }
    }
  });

  if (stateChanged) {
    broadcastStateUpdate();
  }
}, 4000);

// -----------------------------------------------------------------------------
// Vite + App Build Configuration
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Vertex Bank Chat Core Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
