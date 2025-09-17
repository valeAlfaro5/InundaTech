'use strict';
const { Contract } = require('fabric-contract-api');
class RegistryContract extends Contract {
  async initLedger(ctx) { console.info('Ledger inicializado'); }
  async registerUser(ctx, userId, name, email, role) {
    const exists = await this.userExists(ctx, userId);
    if (exists) throw new Error(`Usuario ${userId} ya existe`);
    const user = { userId, name, email, role, type: 'user', createdAt: new Date().toISOString() };
    await ctx.stub.putState(`USER_${userId}`, Buffer.from(JSON.stringify(user)));
    return JSON.stringify(user);
  }
  async userExists(ctx, userId) { const data = await ctx.stub.getState(`USER_${userId}`); return (!!data && data.length > 0); }
  async addMeasurement(ctx, measurementId, userId, metric, value, unit, timestamp) {
    const userBytes = await ctx.stub.getState(`USER_${userId}`); if (!userBytes || userBytes.length === 0) throw new Error(`Usuario ${userId} no encontrado`);
    const measurement = { measurementId, userId, metric, value: parseFloat(value), unit, timestamp: timestamp || new Date().toISOString(), type: 'measurement', createdAt: new Date().toISOString() };
    await ctx.stub.putState(`MEAS_${measurementId}`, Buffer.from(JSON.stringify(measurement)));
    return JSON.stringify(measurement);
  }
  async addAlert(ctx, alertId, userId, level, message, timestamp) {
    const userBytes = await ctx.stub.getState(`USER_${userId}`); if (!userBytes || userBytes.length === 0) throw new Error(`Usuario ${userId} no encontrado`);
    const alert = { alertId, userId, level, message, timestamp: timestamp || new Date().toISOString(), type: 'alert', createdAt: new Date().toISOString() };
    await ctx.stub.putState(`ALERT_${alertId}`, Buffer.from(JSON.stringify(alert)));
    return JSON.stringify(alert);
  }
  async queryMeasurementsByUser(ctx, userId) {
    const iterator = await ctx.stub.getStateByRange('MEAS_', 'MEAS_zzzz'); const results = [];
    for await (const res of iterator) { if (res.value && res.value.length > 0) { const obj = JSON.parse(res.value.toString('utf8')); if (obj.userId === userId) results.push(obj); } }
    return JSON.stringify(results);
  }
  async queryAlertsByUser(ctx, userId) {
    const iterator = await ctx.stub.getStateByRange('ALERT_', 'ALERT_zzzz'); const results = [];
    for await (const res of iterator) { if (res.value && res.value.length > 0) { const obj = JSON.parse(res.value.toString('utf8')); if (obj.userId === userId) results.push(obj); } }
    return JSON.stringify(results);
  }
  async queryAll(ctx) { const iterator = await ctx.stub.getStateByRange('', ''); const all = []; for await (const res of iterator) { if (res.value && res.value.length > 0) all.push(JSON.parse(res.value.toString('utf8'))); } return JSON.stringify(all); }
}
module.exports = RegistryContract;
