// 车辆信息 Mock 数据服务
import { VehicleInfo } from '../types';

// 预设的车辆数据
const mockVehicles: Map<string, VehicleInfo> = new Map([
  ['LSVAG2180E2100001', {
    vin: 'LSVAG2180E2100001',
    plateNumber: '粤A12345',
    brand: '大众',
    model: '帕萨特 1.8T',
    year: 2014,
    engineType: 'EA888 1.8T',
    mileage: 85000,
    lastMaintenance: '2024-08-15',
    faultCodes: [
      { code: 'P0011', description: '进气凸轮轴位置执行器电路/开路（第1排）', severity: 'high' },
      { code: 'P0300', description: '检测到随机/多缸失火', severity: 'high' },
      { code: 'P0171', description: '系统过稀（第1排）', severity: 'medium' },
    ],
  }],
  ['LHGCR1640H8000002', {
    vin: 'LHGCR1640H8000002',
    plateNumber: '粤B67890',
    brand: '本田',
    model: '雅阁 2.4L',
    year: 2017,
    engineType: 'K24W5 2.4L',
    mileage: 62000,
    lastMaintenance: '2024-10-20',
    faultCodes: [
      { code: 'P2646', description: 'VTC执行器电路性能故障', severity: 'medium' },
      { code: 'P0420', description: '催化转换器效率低于阈值（第1排）', severity: 'low' },
    ],
  }],
]);

export function getVehicleByVIN(vin: string): VehicleInfo | null {
  return mockVehicles.get(vin.toUpperCase()) || generateMockVehicle(vin);
}

export function getVehicleByPlate(plateNumber: string): VehicleInfo | null {
  for (const vehicle of mockVehicles.values()) {
    if (vehicle.plateNumber === plateNumber.toUpperCase()) {
      return vehicle;
    }
  }
  return generateMockVehicleByPlate(plateNumber);
}

// 生成随机车辆信息
function generateMockVehicle(vin: string): VehicleInfo {
  const brands = ['大众', '本田', '丰田', '奥迪', '宝马', '奔驰'];
  const models = ['帕萨特', '雅阁', '凯美瑞', 'A4L', '3系', 'C级'];
  const engines = ['1.8T', '2.0L', '2.4L', '2.0T', '1.5T', '2.5L'];

  const randomBrand = brands[Math.floor(Math.random() * brands.length)];
  const randomModel = models[Math.floor(Math.random() * models.length)];
  const randomEngine = engines[Math.floor(Math.random() * engines.length)];

  return {
    vin: vin.toUpperCase(),
    brand: randomBrand,
    model: `${randomModel} ${randomEngine}`,
    year: 2015 + Math.floor(Math.random() * 8),
    engineType: `${randomEngine} 发动机`,
    mileage: 30000 + Math.floor(Math.random() * 70000),
    faultCodes: generateRandomFaultCodes(),
  };
}

function generateMockVehicleByPlate(plateNumber: string): VehicleInfo {
  const vin = generateVINFromPlate();
  const vehicle = generateMockVehicle(vin);
  vehicle.plateNumber = plateNumber;
  return vehicle;
}

function generateVINFromPlate(): string {
  const prefix = 'LSV';
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = prefix;
  for (let i = 0; i < 14; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

function generateRandomFaultCodes() {
  const allFaultCodes = [
    { code: 'P0011', description: '进气凸轮轴位置执行器电路/开路', severity: 'high' as const },
    { code: 'P0300', description: '检测到随机/多缸失火', severity: 'high' as const },
    { code: 'P0171', description: '系统过稀（第1排）', severity: 'medium' as const },
    { code: 'P0420', description: '催化转换器效率低于阈值', severity: 'low' as const },
    { code: 'P2646', description: 'VTC执行器电路性能故障', severity: 'medium' as const },
  ];

  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = allFaultCodes.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
