import { Message, Tool, DiagnosisTask, DiagnosisStage, RepairGuide, RepairSolution, RepairManual } from '../types';

export class PromptService {
  getSystemPrompt(stage: DiagnosisStage): string {
    // 统一的智能 prompt，不再区分阶段
    return `你是广汽集团的智能诊断助手，专门帮助维修技师诊断和修复车辆故障。

## 你的核心能力
1. **故障感知**：收集车辆信息和故障症状
2. **故障排查**：分解排查任务、指导执行、记录结果
3. **维修指导**：提供维修方案和操作手册

## 重要规则

### 1. 智能判断用户意图
用户可能从任何阶段开始对话，你需要智能判断：
- 如果用户提供了车牌号/VIN码，先查询车辆信息
- **如果用户描述了故障现象但信息不足**，用交互式问题卡片收集信息（不要让技师打字）
- **信息足够后，立即生成排查任务JSON**
- **如果用户反馈了排查任务的结果**（包含"已完成排查"、"正常"、"异常"等关键词），立即分析结果并确认故障
- 如果用户问"怎么修"，直接给维修指导

### 2. 重要：技师不喜欢打字
- **永远不要让技师打字回答问题**
- 需要收集信息时，用**交互式问题卡片**（questions JSON格式）
- 需要排查时，用**交互式任务卡片**（tasks JSON格式）
- 一切交互都通过点击按钮完成

### 3. 输出格式规范

**当用户提供车牌号或VIN码时，输出车辆信息JSON格式（不要用markdown代码块包裹）：**
{"type":"vehicle","data":{
  "vin":"LMGAC1G51M1234567",
  "plateNumber":"粤A12345",
  "brand":"广汽传祺",
  "model":"GS4 2021款 235T 自动两驱豪华版",
  "year":2021,
  "engineType":"4A15J1",
  "mileage":58320,
  "faultCodes":[
    {"code":"P0011","description":"进气凸轮轴位置执行器电路/开路（第1排）","severity":"high"},
    {"code":"P0300","description":"检测到随机/多缸失火","severity":"high"}
  ]
}}
注意：直接输出JSON，不要用反引号包裹。

**当需要收集信息时（如车型年份、机油状态等），使用交互式问题卡片：**
\`\`\`json
{"type":"questions","data":[
  {"id":"1","question":"车型年份？","options":["2018款","2021款","2023款","其他"]},
  {"id":"2","question":"机油状态？","options":["正常","缺少","脏污","不清楚"]}
]}
\`\`\`

**当需要分解排查任务时，使用以下JSON格式：**
\`\`\`json
{"type":"tasks","data":[
  {"id":"1","name":"读取故障码","desc":"用诊断仪读取发动机故障码"},
  {"id":"2","name":"检查火花塞","desc":"拆下火花塞检查电极状态"}
]}
\`\`\`

**当用户反馈任务结果后（包含"已完成排查"、"正常"、"异常"等关键词），你需要：**
1. 先用1-2句话总结反馈结果
2. 分析哪些检查异常，推断可能的故障原因
3. 输出故障确认JSON格式：
\`\`\`json
{"type":"faults","data":[
  {"name":"VVT执行器卡滞","confidence":"高","evidence":"故障码P0011 + 冷车异响 + 机油正常"},
  {"name":"凸轮轴位置传感器故障","confidence":"中","evidence":"故障码P0011可能由传感器引起"}
]}
\`\`\`

**当故障确认后，立即提供维修方案，使用以下JSON格式：**
\`\`\`json
{"type":"repair","data":{
  "fault":"VVT执行器卡滞",
  "solution":"更换VVT执行器总成",
  "steps":["断开电池负极","拆下气门室盖","拔下VVT执行器插头","拆下固定螺栓","清理安装面","安装新执行器","连接插头","装回气门室盖","连接电池","清除故障码","试车验证"],
  "parts":["VVT执行器总成 x1","气门室盖垫 x1","发动机油 适量"],
  "tools":["10mm套筒","扭力扳手","诊断仪"],
  "time":"1.5小时",
  "difficulty":"中等",
  "warning":"注意VVT执行器安装方向，扭矩8-10Nm"
}}
\`\`\`

**普通对话直接用文字回复，不需要JSON格式。**

### 4. 当前会话阶段提示
当前阶段：${stage}
- perception（故障感知）：收集信息阶段
- decomposition（任务分解）：分析故障、列出排查任务
- execution（任务执行）：指导技师执行检查
- confirmation（故障确认）：汇总结果、确认故障
- guidance（维修指导）：提供维修方案

根据对话内容灵活处理，不要死板地按阶段走。`;
  }

  getPerceptionTools(): Tool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'queryVehicleByVIN',
          description: '根据VIN码查询车辆信息',
          parameters: {
            type: 'object',
            properties: {
              vin: {
                type: 'string',
                description: '车辆的VIN码（17位）',
              },
            },
            required: ['vin'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'queryVehicleByPlate',
          description: '根据车牌号查询车辆信息',
          parameters: {
            type: 'object',
            properties: {
              plateNumber: {
                type: 'string',
                description: '车牌号码，如"粤A12345"',
              },
            },
            required: ['plateNumber'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'getCommonFaults',
          description: '获取该车型的常见故障列表',
          parameters: {
            type: 'object',
            properties: {
              brand: {
                type: 'string',
                description: '车辆品牌',
              },
            },
            required: ['brand'],
          },
        },
      },
    ];
  }

  getExecutionTools(): Tool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'executeTask',
          description: '执行指定的排查任务',
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: '任务ID',
              },
              method: {
                type: 'string',
                enum: ['auto', 'manual'],
                description: '执行方式：auto自动执行，manual手动执行',
              },
            },
            required: ['taskId', 'method'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'recordTaskResult',
          description: '记录任务执行结果',
          parameters: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: '任务ID',
              },
              result: {
                type: 'string',
                description: '任务执行结果描述',
              },
              status: {
                type: 'string',
                enum: ['completed', 'failed', 'partial'],
                description: '任务状态',
              },
            },
            required: ['taskId', 'result', 'status'],
          },
        },
      },
    ];
  }

  parseTasksFromResponse(response: string): DiagnosisTask[] {
    const tasks: DiagnosisTask[] = [];
    const lines = response.split('\n');
    let currentTask: Partial<DiagnosisTask> = {};

    for (const line of lines) {
      const taskMatch = line.match(/^\d+[\.、]\s*(.+)$/);
      if (taskMatch) {
        if (currentTask.name) {
          tasks.push(currentTask as DiagnosisTask);
        }
        currentTask = {
          id: `task-${tasks.length + 1}`,
          name: taskMatch[1].trim(),
          description: '',
          status: 'pending',
          order: tasks.length + 1,
        };
      } else if (currentTask.name && line.trim()) {
        currentTask.description += line.trim() + ' ';
      }
    }

    if (currentTask.name) {
      tasks.push(currentTask as DiagnosisTask);
    }

    return tasks;
  }

  parseRepairGuide(response: string): RepairGuide {
    const faults: string[] = [];
    const solutions: RepairSolution[] = [];

    const faultMatch = response.match(/确认的故障[:：]([\s\S]*?)(?=维修方案|解决方案|$)/i);
    if (faultMatch) {
      const faultLines = faultMatch[1].split('\n');
      for (const line of faultLines) {
        const match = line.match(/^\d+[\.、\-]\s*(.+)$/);
        if (match) {
          faults.push(match[1].trim());
        }
      }
    }

    const solutionMatch = response.match(/维修方案[:：]([\s\S]*?)(?=所需配件|注意事项|$)/i);
    if (solutionMatch) {
      const sections = solutionMatch[1].split(/\n\n/);
      for (const section of sections) {
        const solution = this.parseSolution(section);
        if (solution) {
          solutions.push(solution);
        }
      }
    }

    const manual: RepairManual = {
      title: '维修操作手册',
      sections: [
        {
          title: '故障诊断总结',
          content: response,
        },
      ],
    };

    return {
      faults,
      solutions,
      manual,
    };
  }

  private parseSolution(text: string): RepairSolution | null {
    const lines = text.split('\n');
    let fault = '';
    let solution = '';
    let estimatedTime = '';
    let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

    for (const line of lines) {
      if (line.includes('故障')) {
        fault = line.split(/[:：]/)[1]?.trim() || '';
      } else if (line.includes('解决方案') || line.includes('维修步骤')) {
        solution = line.split(/[:：]/)[1]?.trim() || '';
      } else if (line.includes('预计时间')) {
        estimatedTime = line.split(/[:：]/)[1]?.trim() || '';
      } else if (line.includes('难度')) {
        const diff = line.split(/[:：]/)[1]?.trim() || '';
        if (diff.includes('简单')) difficulty = 'easy';
        else if (diff.includes('困难')) difficulty = 'hard';
      }
    }

    if (!fault) return null;

    return {
      fault,
      solution,
      estimatedTime,
      estimatedCost: '待评估',
      difficulty,
      requiredParts: [],
      requiredTools: [],
    };
  }

  generateStageTransitionPrompt(currentStage: DiagnosisStage, nextStage: DiagnosisStage, context: any): string {
    const transitions: Record<string, string> = {
      'perception-decomposition': `根据收集到的信息，车辆${context.vehicleInfo?.brand || ''} ${context.vehicleInfo?.model || ''}，故障症状：${context.symptoms?.join('、') || '未明确'}。现在进入故障排查阶段，请将排查过程分解为具体的检查任务。`,
      'decomposition-execution': `故障排查任务已分解完成，共${context.tasks?.length || 0}个任务。现在开始逐一执行这些任务。`,
      'execution-confirmation': `所有排查任务已完成，请汇总结果并确认具体的故障项目。`,
      'confirmation-guidance': `故障已确认为：${context.confirmedFaults?.join('、') || '未确认'}。请提供详细的维修方案。`,
    };

    return transitions[`${currentStage}-${nextStage}`] || '';
  }
}
