export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  temperature?: number;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: Message;
    finish_reason: string;
  }[];
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }[];
}

export interface FaultCode {
  code: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface VehicleInfo {
  vin: string;
  plateNumber?: string;
  brand: string;
  model: string;
  year: number;
  engineType: string;
  mileage?: number;
  lastMaintenance?: string;
  faultCodes?: FaultCode[];
}

export interface DiagnosisSession {
  id: string;
  currentStage: DiagnosisStage;
  vehicleInfo?: VehicleInfo;
  symptoms: string[];
  tasks: DiagnosisTask[];
  confirmedFaults: string[];
  repairGuide?: RepairGuide;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type DiagnosisStage =
  | 'perception'
  | 'decomposition'
  | 'execution'
  | 'confirmation'
  | 'guidance';

export interface HistoricalCase {
  id: string;
  date: string;
  vehicleModel: string;
  plateNumber: string;
  faultDescription: string;
  solution: string;
  repairTime: string;
  cost: string;
  technician: string;
}

export interface DiagnosisTask {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  order: number;
  relatedCases?: HistoricalCase[];
}

export interface RepairGuide {
  faults: string[];
  solutions: RepairSolution[];
  manual: RepairManual;
}

export interface RepairSolution {
  fault: string;
  solution: string;
  estimatedTime: string;
  estimatedCost: string;
  difficulty: 'easy' | 'medium' | 'hard';
  requiredParts: string[];
  requiredTools: string[];
}

export interface RepairManual {
  title: string;
  sections: ManualSection[];
}

export interface ManualSection {
  title: string;
  content: string;
  images?: string[];
  warnings?: string[];
  tips?: string[];
}

export interface ChatMessageRequest {
  message: string;
  sessionId?: string;
  stage?: DiagnosisStage;
}
