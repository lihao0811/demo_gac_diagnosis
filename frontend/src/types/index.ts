export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
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

export interface ChatResponse {
  content: string;
  sessionId: string;
  stage: DiagnosisStage;
  toolCalls?: ToolResult[];
}

export interface ToolResult {
  toolCallId: string;
  functionName: string;
  result: any;
}

export interface FaultCode {
  code: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

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

export type DiagnosisStage =
  | 'perception'
  | 'decomposition'
  | 'execution'
  | 'confirmation'
  | 'guidance';

export interface DiagnosisTask {
  id: string;
  name: string;
  desc: string;
  status?: 'normal' | 'abnormal' | 'unable' | 'pending';
  note?: string;
  relatedCases?: HistoricalCase[];
}

export interface DiagnosisSession {
  id: string;
  currentStage: DiagnosisStage;
  vehicleInfo?: VehicleInfo;
  symptoms: string[];
  tasks: DiagnosisTask[];
  confirmedFaults: string[];
  messages: Message[];
  createdAt: string;
  updatedAt: string;
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
