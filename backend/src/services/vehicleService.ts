import { v4 as uuidv4 } from 'uuid';
import { VehicleInfo, DiagnosisTask, FaultCode } from '../types';

export class VehicleService {
  private mockVehicles: Map<string, VehicleInfo> = new Map([
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
    ['LFV3A28K4J3300003', {
      vin: 'LFV3A28K4J3300003',
      plateNumber: '粤C11111',
      brand: '奥迪',
      model: 'A4L 2.0T',
      year: 2018,
      engineType: 'EA888 Gen3 2.0T',
      mileage: 45000,
      lastMaintenance: '2024-11-05',
      faultCodes: [
        { code: 'P0087', description: '燃油轨/系统压力过低', severity: 'high' },
      ],
    }],
  ]);

  async getVehicleByVIN(vin: string): Promise<VehicleInfo | null> {
    const vehicle = this.mockVehicles.get(vin.toUpperCase());
    if (vehicle) {
      return vehicle;
    }

    return this.generateMockVehicle(vin);
  }

  async getVehicleByPlate(plateNumber: string): Promise<VehicleInfo | null> {
    for (const vehicle of this.mockVehicles.values()) {
      if (vehicle.plateNumber === plateNumber.toUpperCase()) {
        return vehicle;
      }
    }

    return this.generateMockVehicleByPlate(plateNumber);
  }

  private generateMockVehicle(vin: string): VehicleInfo {
    const brands = ['大众', '本田', '丰田', '奥迪', '宝马', '奔驰'];
    const models = ['帕萨特', '雅阁', '凯美瑞', 'A4L', '3系', 'C级'];
    const engines = ['1.8T', '2.0L', '2.4L', '2.0T', '1.5T', '2.5L'];

    const randomBrand = brands[Math.floor(Math.random() * brands.length)];
    const randomModel = models[Math.floor(Math.random() * models.length)];
    const randomEngine = engines[Math.floor(Math.random() * engines.length)];

    // 生成随机故障码
    const faultCodes = this.generateRandomFaultCodes();

    return {
      vin: vin.toUpperCase(),
      brand: randomBrand,
      model: `${randomModel} ${randomEngine}`,
      year: 2015 + Math.floor(Math.random() * 8),
      engineType: `${randomEngine} 发动机`,
      mileage: 30000 + Math.floor(Math.random() * 70000),
      lastMaintenance: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      faultCodes,
    };
  }

  private generateMockVehicleByPlate(plateNumber: string): VehicleInfo {
    const vin = this.generateVINFromPlate(plateNumber);
    return this.generateMockVehicle(vin);
  }

  private generateVINFromPlate(plateNumber: string): string {
    const prefix = 'LSV';
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = prefix;
    for (let i = 0; i < 14; i++) {
      vin += chars[Math.floor(Math.random() * chars.length)];
    }
    return vin;
  }

  private generateRandomFaultCodes(): FaultCode[] {
    const allFaultCodes: FaultCode[] = [
      { code: 'P0011', description: '进气凸轮轴位置执行器电路/开路（第1排）', severity: 'high' },
      { code: 'P0300', description: '检测到随机/多缸失火', severity: 'high' },
      { code: 'P0171', description: '系统过稀（第1排）', severity: 'medium' },
      { code: 'P0420', description: '催化转换器效率低于阈值（第1排）', severity: 'low' },
      { code: 'P2646', description: 'VTC执行器电路性能故障', severity: 'medium' },
      { code: 'P0087', description: '燃油轨/系统压力过低', severity: 'high' },
      { code: 'P0128', description: '冷却液温度低于节温器调节温度', severity: 'low' },
      { code: 'P0455', description: 'EVAP系统泄漏检测（大泄漏）', severity: 'medium' },
      { code: 'P0562', description: '系统电压低', severity: 'medium' },
      { code: 'P0601', description: '内部控制模块存储器校验和错误', severity: 'high' },
    ];

    // 随机选择 1-3 个故障码
    const count = Math.floor(Math.random() * 3) + 1;
    const shuffled = allFaultCodes.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  async getCommonFaults(vehicleInfo: VehicleInfo): Promise<string[]> {
    const faultDatabase: Record<string, string[]> = {
      '大众': [
        '发动机烧机油',
        '双离合变速箱顿挫',
        '正时链条异响',
        '涡轮增压器故障',
      ],
      '本田': [
        'VTC执行器异响',
        'CVT变速箱打滑',
        '节气门积碳',
        '氧传感器故障',
      ],
      '丰田': [
        '机油乳化',
        '转向机异响',
        '刹车抖动',
        '空调制冷不足',
      ],
      '奥迪': [
        '发动机烧机油',
        '水泵漏水',
        '空调压缩机故障',
        '悬挂异响',
      ],
      '宝马': [
        '气门室盖漏油',
        '冷却液缺失',
        '电子水泵故障',
        '发动机抖动',
      ],
      '奔驰': [
        '正时链轮故障',
        '凸轮轴调节器故障',
        '变速箱闯挡',
        '悬挂气包漏气',
      ],
    };

    return faultDatabase[vehicleInfo.brand] || [
      '发动机故障灯亮',
      '油耗异常',
      '异响',
      '动力下降',
    ];
  }
}
