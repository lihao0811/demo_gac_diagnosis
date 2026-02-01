import { HistoricalCase } from '../types';

// 模拟的历史案例数据库
const mockHistoricalCases: Record<string, HistoricalCase[]> = {
  // VVT执行器相关案例
  'vvt': [
    {
      id: 'case-001',
      date: '2024-01-15',
      vehicleModel: '传祺GS4 2020款',
      plateNumber: '粤B88888',
      faultDescription: 'VVT执行器卡滞，冷车启动时有异响，热车后消失',
      solution: '更换VVT执行器，清洗机油道，更换机油和机滤',
      repairTime: '2.5小时',
      cost: '¥1,200',
      technician: '张师傅'
    },
    {
      id: 'case-002',
      date: '2024-02-20',
      vehicleModel: '传祺GS8 2021款',
      plateNumber: '粤A66666',
      faultDescription: 'VVT执行器故障，发动机故障灯亮，怠速不稳',
      solution: '更换VVT执行器总成，重置故障码',
      repairTime: '3小时',
      cost: '¥1,500',
      technician: '李师傅'
    },
    {
      id: 'case-003',
      date: '2024-03-10',
      vehicleModel: '传祺GA6 2019款',
      plateNumber: '粤C12345',
      faultDescription: 'VVT系统异常，加速无力，油耗增加',
      solution: '清洗VVT执行器，更换机油，调整正时',
      repairTime: '2小时',
      cost: '¥800',
      technician: '王师傅'
    }
  ],

  // 机油压力相关案例
  'oil_pressure': [
    {
      id: 'case-004',
      date: '2024-01-25',
      vehicleModel: '传祺GS4 2019款',
      plateNumber: '粤D99999',
      faultDescription: '机油压力低，仪表盘机油灯亮',
      solution: '更换机油泵，检查机油管路，更换机油',
      repairTime: '4小时',
      cost: '¥2,000',
      technician: '赵师傅'
    },
    {
      id: 'case-005',
      date: '2024-02-15',
      vehicleModel: '传祺GS8 2020款',
      plateNumber: '粤E55555',
      faultDescription: '机油压力传感器故障，机油压力显示异常',
      solution: '更换机油压力传感器，清洗传感器接口',
      repairTime: '1小时',
      cost: '¥500',
      technician: '孙师傅'
    }
  ],

  // 正时链条相关案例
  'timing_chain': [
    {
      id: 'case-006',
      date: '2024-03-05',
      vehicleModel: '传祺GS4 2018款',
      plateNumber: '粤F77777',
      faultDescription: '正时链条松弛，发动机异响，加速无力',
      solution: '更换正时链条套件，调整正时，更换张紧器',
      repairTime: '6小时',
      cost: '¥3,500',
      technician: '周师傅'
    }
  ],

  // 点火系统相关案例
  'ignition': [
    {
      id: 'case-007',
      date: '2024-02-28',
      vehicleModel: '传祺GA6 2020款',
      plateNumber: '粤G33333',
      faultDescription: '点火线圈故障，发动机抖动，加速不畅',
      solution: '更换点火线圈，检查火花塞，清洗节气门',
      repairTime: '2小时',
      cost: '¥900',
      technician: '吴师傅'
    },
    {
      id: 'case-008',
      date: '2024-03-12',
      vehicleModel: '传祺GS8 2019款',
      plateNumber: '粤H44444',
      faultDescription: '火花塞老化，冷车启动困难，怠速抖动',
      solution: '更换全套火花塞，清洗喷油嘴',
      repairTime: '1.5小时',
      cost: '¥600',
      technician: '郑师傅'
    }
  ]
};

/**
 * 根据任务名称获取相关的历史案例
 */
export function getRelatedCases(taskName: string): HistoricalCase[] {
  const lowerTaskName = taskName.toLowerCase();

  // 根据任务名称关键词匹配相关案例
  if (lowerTaskName.includes('vvt') || lowerTaskName.includes('可变气门')) {
    return mockHistoricalCases['vvt'] || [];
  }

  if (lowerTaskName.includes('机油压力') || lowerTaskName.includes('油压')) {
    return mockHistoricalCases['oil_pressure'] || [];
  }

  if (lowerTaskName.includes('正时') || lowerTaskName.includes('链条')) {
    return mockHistoricalCases['timing_chain'] || [];
  }

  if (lowerTaskName.includes('点火') || lowerTaskName.includes('火花塞') || lowerTaskName.includes('线圈')) {
    return mockHistoricalCases['ignition'] || [];
  }

  // 默认返回空数组
  return [];
}

/**
 * 为任务列表添加相关历史案例
 */
export function enrichTasksWithCases(tasks: any[]): any[] {
  return tasks.map(task => ({
    ...task,
    relatedCases: getRelatedCases(task.name)
  }));
}
