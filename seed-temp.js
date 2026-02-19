const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjust path to find .env in api root

const User = require('../src/models/user.model');
const Vehicle = require('../src/models/vehicle.model');
const Store = require('../src/models/store.model');
const Fleet = require('../src/models/fleet.model');

async function seedData() {
  try {
    console.log('正在连接数据库...');
    console.log('URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wanlian-tms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');

    // 1. 创建测试车队
    console.log('正在创建测试车队...');
    let fleet = await Fleet.findOne({ name: '万联测试车队' });
    if (!fleet) {
      fleet = await Fleet.create({
        name: '万联测试车队',
        scale: 50,
        contact: {
          name: '张车队',
          phone: '13800138000'
        },
        address: {
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          detail: '朝阳北路101号',
          location: {
            type: 'Point',
            coordinates: [116.4074, 39.9042]
          }
        },
        status: 'normal'
      });
      console.log('测试车队创建成功:', fleet._id);
    } else {
      console.log('测试车队已存在:', fleet._id);
    }

    // 2. 创建测试门店
    console.log('正在创建测试门店...');
    const storesData = [
      {
        name: '万联汽修朝阳店',
        contact: { name: '王店长', phone: '13900139001' },
        address: {
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          detail: '朝阳路1号',
          location: { coordinates: [116.46, 39.92] }
        },
        status: 'normal'
      },
      {
        name: '万联汽修海淀店',
        contact: { name: '李店长', phone: '13900139002' },
        address: {
          province: '北京市',
          city: '北京市',
          district: '海淀区',
          detail: '中关村大街1号',
          location: { coordinates: [116.32, 39.98] }
        },
        status: 'normal'
      },
      {
        name: '万联汽修通州店',
        contact: { name: '赵店长', phone: '13900139003' },
        address: {
          province: '北京市',
          city: '北京市',
          district: '通州区',
          detail: '通州北苑1号',
          location: { coordinates: [116.65, 39.90] }
        },
        status: 'normal'
      }
    ];

    for (const data of storesData) {
      const exists = await Store.findOne({ name: data.name });
      if (!exists) {
        await Store.create(data);
        console.log('门店 ' + data.name + ' 创建成功');
      } else {
        console.log('门店 ' + data.name + ' 已存在');
      }
    }

    // 3. 创建测试司机
    console.log('正在创建测试司机...');
    let testDriver = await User.findOne({ openid: 'test_driver_wanlian' });
    if (!testDriver) {
      testDriver = await User.create({
        openid: 'test_driver_wanlian',
        nickname: '测试司机-张三',
        phone: '13800138888',
        name: '张三',
        role: {
          type: 'DRIVER',
          status: 'normal'
        }
      });
      console.log('测试司机创建成功:', testDriver.nickname);
    } else {
      console.log('测试司机已存在:', testDriver.nickname);
    }

    // 4. 创建测试车辆 (关联到车队和司机)
    console.log('正在创建测试车辆...');
    const vehiclesData = [
      {
        plateNumber: '京A88888',
        brand: '解放',
        model: 'J7',
        fleetId: fleet._id,
        currentDriverId: testDriver ? testDriver._id : null,
        status: 'normal'
      },
      {
        plateNumber: '京B66666',
        brand: '东风',
        model: '天龙旗舰',
        fleetId: fleet._id,
        currentDriverId: testDriver ? testDriver._id : null,
        status: 'normal'
      },
      {
        plateNumber: '京C12345',
        brand: '重汽',
        model: '豪沃T7H',
        fleetId: fleet._id,
        currentDriverId: testDriver ? testDriver._id : null,
        status: 'normal'
      }
    ];

    for (const data of vehiclesData) {
      const exists = await Vehicle.findOne({ plateNumber: data.plateNumber });
      if (!exists) {
        const vehicle = await Vehicle.create(data);
        console.log('车辆 ' + data.plateNumber + ' 创建成功，已分配给司机');
      } else {
        // 如果车辆已存在但没有分配司机，则更新
        if (!exists.currentDriverId) {
          exists.currentDriverId = testDriver ? testDriver._id : null;
          await exists.save();
          console.log('车辆 ' + data.plateNumber + ' 已存在，已更新司机分配');
        } else {
          console.log('车辆 ' + data.plateNumber + ' 已存在');
        }
      }
    }

    console.log('所有测试数据生成完毕！');
    process.exit(0);

  } catch (error) {
    console.error('数据生成失败:', error);
    process.exit(1);
  }
}

seedData();
