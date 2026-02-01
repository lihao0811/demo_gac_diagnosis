// 简单的测试脚本来验证历史案例功能
const { enrichTasksWithCases } = require('./src/services/historicalCaseService.ts');

// 模拟任务数据
const mockTasks = [
  {
    id: '1',
    name: '检查VVT执行器',
    desc: '检查可变气门正时执行器是否卡滞'
  },
  {
    id: '2',
    name: '检查机油压力',
    desc: '使用压力表测量机油压力是否正常'
  },
  {
    id: '3',
    name: '检查火花塞',
    desc: '拆下火花塞检查电极状态'
  }
];

console.log('测试历史案例功能...\n');
console.log('原始任务列表:');
console.log(JSON.stringify(mockTasks, null, 2));

console.log('\n添加历史案例后:');
const enrichedTasks = enrichTasksWithCases(mockTasks);
console.log(JSON.stringify(enrichedTasks, null, 2));

console.log('\n按案例数量排序后:');
enrichedTasks.sort((a, b) => (b.relatedCases?.length || 0) - (a.relatedCases?.length || 0));
console.log(enrichedTasks.map(t => ({
  name: t.name,
  casesCount: t.relatedCases?.length || 0
})));
